import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { previewNutritionStrategyCascade, deleteNutritionStrategyCascade } from '../src/services/nutritionStrategyCascadeService'
import { previewNutritionStrategyDeletion, deleteUnusedNutritionStrategy, getNutritionStrategyForDate, endNutritionStrategyPhase, archiveNutritionStrategy } from '../src/services/nutritionStrategyService'
import { restoreBackup, exportBackup, validateBackup } from '../src/services/backupService'
import { encryptSyncText, decryptSyncText } from '../src/services/syncCryptoService'
import { saveNutritionTarget } from '../src/services/nutritionTargetService'
import { loadNutritionCycleReport } from '../src/services/nutritionCycleReportService'
import { loadReport } from '../src/services/reportService'
import fixture from './fixtures/uxNutritionCascadeBackupV14.json'

const databases: FitLogDatabase[] = [], stamp = '2026-10-16T00:00:00.000Z'
const make = (name = 'ux-cascade-' + crypto.randomUUID()) => { const d = new FitLogDatabase(name); databases.push(d); return d }
const seed = async () => { const d = make(); await restoreBackup(fixture, d); return d }
const data = async (d: FitLogDatabase) => (await exportBackup(d)).data
const hashes = (rows: Awaited<ReturnType<typeof data>>) => Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, createHash('sha256').update(JSON.stringify(v)).digest('hex')]))
const six = new Set(['nutritionStrategyTemplates','nutritionStrategyVariants','nutritionStrategyPhases','nutritionTargets','nutritionCycles','nutritionCycleDays'])
afterEach(async () => { vi.restoreAllMocks(); const names = new Set(databases.map(d => d.name)); for (const d of databases.splice(0)) d.close(); for (const name of names) await Dexie.delete(name) })

describe('explicit six-category nutrition cascade, never date-based health deletion', () => {
  it('read-only preview counts current, historical, future and removed-variant snapshots; cancellation writes nothing', async () => {
    const d = await seed(), before = await data(d), p = await previewNutritionStrategyCascade('ux-a', d)
    expect(p.counts).toEqual({templates:1,variants:2,phases:2,targets:4,cycles:2,days:4})
    expect(p.total).toBe(15); expect(p.conflicts).toEqual([])
    expect(p.details.filter(r => r.category === 'days').map(r => r.date)).toContain('2030-01-02')
    expect(await data(d)).toEqual(before)
  })
  it('deletes the exact six owned sets; every one of the other sixteen tables and all unrelated six-table rows survive', async () => {
    const d = await seed(), before = await data(d), beforeHashes = hashes(before), p = await previewNutritionStrategyCascade('ux-a', d)
    await deleteNutritionStrategyCascade(p.id, p.fingerprint, d)
    const after = await data(d), afterHashes = hashes(after)
    expect(d.verno).toBe(13); expect(d.tables).toHaveLength(22)
    for (const key of Object.keys(before) as Array<keyof typeof before>) {
      if (!six.has(key)) { expect(after[key]).toEqual(before[key]); expect(afterHashes[key]).toBe(beforeHashes[key]) }
      else { const removed = new Set(p.details.filter(r => ({templates:'nutritionStrategyTemplates',variants:'nutritionStrategyVariants',phases:'nutritionStrategyPhases',targets:'nutritionTargets',cycles:'nutritionCycles',days:'nutritionCycleDays'}[r.category]) === key).map(r => r.id)); expect(after[key]).toEqual(before[key].filter(row => !removed.has(row.id))) }
    }
    expect(after.nutritionTargets.map(t => t.id)).toEqual(['ux-b-target','ux-diet-target','ux-manual-target'])
    expect(await getNutritionStrategyForDate('2026-10-17', d)).toBeUndefined()
    d.close(); await d.open(); expect(await data(d)).toEqual(after)
  })
  it('does not remove manual goals on formerly related dates or infer ownership from equal values', async () => {
    const d = await seed(), previous = await d.nutritionTargets.get('ux-a-target')
    await saveNutritionTarget(previous!.date, {calories:2100,protein:140}, d)
    const manual = await d.nutritionTargets.get(previous!.id), p = await previewNutritionStrategyCascade('ux-a', d)
    expect(manual!.strategySelection).toBeUndefined(); expect(p.counts.targets).toBe(3)
    await deleteNutritionStrategyCascade(p.id, p.fingerprint, d); expect(await d.nutritionTargets.get(previous!.id)).toEqual(manual)
  })
  it('a second same-date target cannot be inserted under the unchanged unique date schema', async () => {
    const d = await seed(), before = await data(d)
    await expect(d.nutritionTargets.add({id:'same-day-manual',date:'2026-06-15',calories:2100,createdAt:stamp,updatedAt:stamp})).rejects.toThrow()
    expect(await data(d)).toEqual(before)
  })
  it('has deterministic fingerprints independent of object key insertion order', async () => {
    const d = await seed(), p = await previewNutritionStrategyCascade('ux-a', d), t = await d.nutritionStrategyTemplates.get('ux-b')
    await d.nutritionStrategyTemplates.put(Object.fromEntries(Object.entries(t!).reverse()) as typeof t & {})
    expect((await previewNutritionStrategyCascade('ux-a', d)).fingerprint).toBe(p.fingerprint)
    await deleteNutritionStrategyCascade(p.id, p.fingerprint, d)
  })
  it('original unused-only API keeps its history guard, while the new explicit cascade can delete a used template', async () => {
    const d = await seed(), old = await previewNutritionStrategyDeletion('ux-a', d), before = await data(d)
    await expect(deleteUnusedNutritionStrategy('ux-a', old.fingerprint, d)).rejects.toThrow('引用')
    expect(await data(d)).toEqual(before)
    const p = await previewNutritionStrategyCascade('ux-a', d); await deleteNutritionStrategyCascade(p.id, p.fingerprint, d)
    const unused = await d.nutritionStrategyTemplates.add({id:'unused',name:'未用',createdAt:stamp,updatedAt:stamp}); await d.nutritionStrategyVariants.add({id:'unused-v',templateId:unused,name:'日',calories:1,sortOrder:0,createdAt:stamp,updatedAt:stamp})
    const clean = await previewNutritionStrategyDeletion(unused, d); await deleteUnusedNutritionStrategy(unused, clean.fingerprint, d); expect(await d.nutritionStrategyTemplates.get(unused)).toBeUndefined()
  })
  it.each(['mixed-types','foreign-variant','foreign-phase','foreign-template','foreign-cycle','diet-origin','missing-phase','cycle-id-only'])('conflicting target provenance %s rejects the entire operation without changing any store', async kind => {
    const d = await seed(), t = (await d.nutritionTargets.get('ux-a-target'))!, cycle = (await d.nutritionTargets.get('ux-a-old-cycle-target'))!
    if (kind === 'mixed-types') await d.nutritionTargets.update(t.id,{cycleSelection:cycle.cycleSelection})
    if (kind === 'foreign-variant') await d.nutritionTargets.update(t.id,{strategySelection:{...t.strategySelection!,variantId:'ux-b-v1'}})
    if (kind === 'foreign-phase') await d.nutritionTargets.update(t.id,{strategySelection:{...t.strategySelection!,phaseId:'ux-b-phase'}})
    if (kind === 'foreign-template') await d.nutritionTargets.update(t.id,{strategySelection:{...t.strategySelection!,templateId:'ux-b'}})
    if (kind === 'foreign-cycle') await d.nutritionTargets.update(cycle.id,{cycleSelection:{...cycle.cycleSelection!,cycleId:'ux-b-cycle'}})
    if (kind === 'diet-origin') await d.nutritionTargets.update(t.id,{sourceTemplateId:fixture.data.dietTemplates[0]!.id})
    if (kind === 'missing-phase') await d.nutritionTargets.update(t.id,{strategySelection:{...t.strategySelection!,phaseId:'missing'}})
    if (kind === 'cycle-id-only') await d.nutritionTargets.update(cycle.id,{cycleSelection:{...cycle.cycleSelection!,templateId:'ux-b',variantId:'ux-b-v1'}})
    const before = await data(d), p = await previewNutritionStrategyCascade('ux-a', d); expect(p.conflicts.length).toBeGreaterThan(0)
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('未删除任何记录'); expect(await data(d)).toEqual(before)
  })
  it.each(['foreign-cycle-allocation','foreign-variant-on-owned-day','orphan','empty-day','out-of-range','active-overlap'])('noncanonical cycle data %s cannot expand the deletion or leave residual orphans', async kind => {
    const d = await seed(), a = (await d.nutritionCycleDays.get('ux-a-old-cycle-day-1'))!, b = (await d.nutritionCycleDays.get('ux-b-cycle-day-1'))!
    if (kind === 'foreign-cycle-allocation') await d.nutritionCycleDays.update(b.id,{nutrition:a.nutrition})
    if (kind === 'foreign-variant-on-owned-day') await d.nutritionCycleDays.update(a.id,{nutrition:{...a.nutrition!,variantId:'ux-b-v1'}})
    if (kind === 'orphan') await d.nutritionCycleDays.update(a.id,{cycleId:'missing-cycle'})
    if (kind === 'empty-day') await d.nutritionCycleDays.put({...a,nutrition:undefined,dietTemplate:undefined})
    if (kind === 'out-of-range') await d.nutritionCycleDays.update(a.id,{date:'2020-01-01'})
    if (kind === 'active-overlap') { const c=(await d.nutritionCycles.get('ux-a-old-cycle'))!; await d.nutritionCycles.put({...c,archivedAt:undefined,startDate:'2026-10-01',endDate:'2026-10-31'}) }
    const before = await data(d), p = await previewNutritionStrategyCascade('ux-a', d); expect(p.conflicts.length).toBeGreaterThan(0)
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('未删除任何记录'); expect(await data(d)).toEqual(before)
  })
  it.each(['template','variant','phase','target','cycle','day'])('a second connection adds/changes %s after preview; stale confirmation rejects all writes', async kind => {
    const d=await seed(), other=make(d.name), p=await previewNutritionStrategyCascade('ux-a',d)
    if(kind==='template')await other.nutritionStrategyTemplates.update('ux-a',{name:'另一窗口'})
    if(kind==='variant')await other.nutritionStrategyVariants.add({id:'new-variant',templateId:'ux-a',name:'新日',calories:1,sortOrder:2,createdAt:stamp,updatedAt:stamp})
    if(kind==='phase')await other.nutritionStrategyPhases.add({id:'new-phase',templateId:'ux-a',templateName:'历史',startDate:'2024-01-01',endDate:'2024-01-31',createdAt:stamp})
    if(kind==='target')await other.nutritionTargets.add({id:'new-target',date:'2024-01-01',calories:1,strategySelection:{templateId:'ux-a',templateName:'历史',phaseId:'new-phase',variantId:'ux-a-v1',variantName:'日'},createdAt:stamp,updatedAt:stamp})
    if(kind==='cycle'){const c=(await other.nutritionCycles.get('ux-a-future-cycle'))!;await other.nutritionCycles.add({...c,id:'new-cycle',startDate:'2031-01-01',endDate:'2031-01-02'})}
    if(kind==='day'){const day=(await other.nutritionCycleDays.get('ux-a-future-cycle-day-1'))!;await other.nutritionCycleDays.add({...day,id:'new-day',date:'2030-01-03'})}
    const before=await data(d);await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('已变化');expect(await data(d)).toEqual(before)
  })
  it('manual overwrite after preview is preserved by a stale rejection then a fresh smaller deletion set',async()=>{
    const d=await seed(),p=await previewNutritionStrategyCascade('ux-a',d);await saveNutritionTarget('2026-06-15',{calories:1234},d);const manual=await d.nutritionTargets.get('ux-a-target')
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('已变化');const fresh=await previewNutritionStrategyCascade('ux-a',d);await deleteNutritionStrategyCascade(fresh.id,fresh.fingerprint,d);expect(await d.nutritionTargets.get('ux-a-target')).toEqual(manual)
  })
  it.each(['targets','days','cycles','phases','variants','template'])('failure at %s deletion rolls back all22 tables, including reopen',async kind=>{
    const d=await seed(),before=await data(d),p=await previewNutritionStrategyCascade('ux-a',d)
    if(kind==='template')vi.spyOn(d.nutritionStrategyTemplates,'delete').mockRejectedValueOnce(new Error('injected'))
    else { const table={targets:d.nutritionTargets,days:d.nutritionCycleDays,cycles:d.nutritionCycles,phases:d.nutritionStrategyPhases,variants:d.nutritionStrategyVariants}[kind]!;vi.spyOn(table,'bulkDelete').mockRejectedValueOnce(new Error('injected')) }
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('injected');expect(await data(d)).toEqual(before);d.close();await d.open();expect(await data(d)).toEqual(before)
  })
  it('postcondition catches an unrelated variant mutation and rolls back the whole write set',async()=>{
    const d=await seed(),before=await data(d),p=await previewNutritionStrategyCascade('ux-a',d),original=d.nutritionStrategyVariants.bulkDelete.bind(d.nutritionStrategyVariants)
    vi.spyOn(d.nutritionStrategyVariants,'bulkDelete').mockImplementationOnce(async ids=>{await original(ids);await d.nutritionStrategyVariants.update('ux-b-v1',{name:'unexpected mutation'})})
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('校验失败');expect(await data(d)).toEqual(before)
  })
  it('rapid duplicate confirmations commit once; the second cannot delete another template',async()=>{
    const d=await seed(),p=await previewNutritionStrategyCascade('ux-a',d),results=await Promise.allSettled([deleteNutritionStrategyCascade(p.id,p.fingerprint,d),deleteNutritionStrategyCascade(p.id,p.fingerprint,d)])
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await d.nutritionStrategyTemplates.get('ux-b')).toBeDefined()
  })
  it('post-delete Backup14/Restore/encryptedSync1 roundtrip retains all independent facts and no deleted references',async()=>{
    const d=await seed(),p=await previewNutritionStrategyCascade('ux-a',d);await deleteNutritionStrategyCascade(p.id,p.fingerprint,d);const backup=await exportBackup(d);expect(backup.schemaVersion).toBe(14);expect(validateBackup(backup).data).toEqual(backup.data)
    const envelope=await encryptSyncText(JSON.stringify(backup),'synthetic-ux-only-password');expect(envelope.formatVersion).toBe(1);const target=make();await restoreBackup(JSON.parse(await decryptSyncText(envelope,'synthetic-ux-only-password')),target);expect(await data(target)).toEqual(backup.data);target.close();await target.open();expect(await data(target)).toEqual(backup.data)
    vi.spyOn(target.nutritionStrategyPhases,'bulkAdd').mockRejectedValueOnce(new Error('restore failure'));await expect(restoreBackup(fixture,target)).rejects.toThrow('restore failure');expect(await data(target)).toEqual(backup.data)
  })
  it('removed cycle reports are no longer selectable; ordinary actual-history reports remain intact',async()=>{
    const d=await seed(),before=await loadReport('day','2026-09-28','2026-10-17',d),p=await previewNutritionStrategyCascade('ux-a',d);await deleteNutritionStrategyCascade(p.id,p.fingerprint,d)
    const report=await loadNutritionCycleReport('ux-a-old-cycle','2026-10-17',d);expect(report.cycles.filter(c=>c.kind==='cycle').map(c=>c.id)).toEqual(['ux-b-cycle']);expect(report.cycles.filter(c=>c.kind==='phase').map(c=>c.id)).toEqual(['phase:ux-b-phase']);expect(report.selected!.id).toBe('ux-b-cycle');expect(await loadReport('day','2026-09-28','2026-10-17',d)).toEqual(before)
  })
  it('explicit end phase preserves definitions, targets, other phases and every health fact; stale phase refuses',async()=>{
    const d=await seed(),phase=(await d.nutritionStrategyPhases.get('ux-a-active'))!,before=await data(d);await endNutritionStrategyPhase(phase.id,JSON.stringify(phase),d);const after=await data(d)
    for(const key of Object.keys(before)as Array<keyof typeof before>)if(key!=='nutritionStrategyPhases')expect(after[key]).toEqual(before[key]);expect((await d.nutritionStrategyPhases.get(phase.id))!.endDate).toBeDefined();await expect(endNutritionStrategyPhase(phase.id,JSON.stringify(phase),d)).rejects.toThrow('已变化');expect(await data(d)).toEqual(after)
  })
  it('a previously used archived template still previews and permanently deletes its exact fifteen objects',async()=>{
    const d=await seed(),phase=(await d.nutritionStrategyPhases.get('ux-a-active'))!
    await endNutritionStrategyPhase(phase.id,JSON.stringify(phase),d);await archiveNutritionStrategy('ux-a',d)
    const before=await data(d),p=await previewNutritionStrategyCascade('ux-a',d);expect(p.total).toBe(15);expect(p.conflicts).toEqual([])
    await deleteNutritionStrategyCascade(p.id,p.fingerprint,d);const after=await data(d)
    for(const key of Object.keys(before)as Array<keyof typeof before>)if(!six.has(key))expect(after[key]).toEqual(before[key])
    expect(await d.nutritionStrategyTemplates.get('ux-a')).toBeUndefined();expect(await d.nutritionStrategyTemplates.get('ux-b')).toBeDefined()
  })
  it('even an unrelated target change in the six-table snapshot requires fresh confirmation and remains preserved',async()=>{
    const d=await seed(),p=await previewNutritionStrategyCascade('ux-a',d),other=make(d.name)
    await other.nutritionTargets.update('ux-manual-target',{calories:999});const before=await data(d)
    await expect(deleteNutritionStrategyCascade(p.id,p.fingerprint,d)).rejects.toThrow('已变化');expect(await data(d)).toEqual(before)
    const fresh=await previewNutritionStrategyCascade('ux-a',d);await deleteNutritionStrategyCascade(fresh.id,fresh.fingerprint,d);expect((await d.nutritionTargets.get('ux-manual-target'))!.calories).toBe(999)
  })
})
