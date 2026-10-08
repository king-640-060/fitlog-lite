import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { legacyV7Database } from './fixtures/legacyV7Database'
import legacy from './fixtures/legacyV7Data.json'
import { activateNutritionStrategy, applyNutritionStrategyVariant, archiveNutritionStrategy, duplicateNutritionStrategy, getNutritionPhaseSummary, getNutritionStrategy, getNutritionStrategyForDate, nutritionPhaseDays, saveNutritionStrategy } from '../src/services/nutritionStrategyService'
import { saveNutritionTarget } from '../src/services/nutritionTargetService'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { upsertWeight } from '../src/services/weightService'

const databases: FitLogDatabase[] = []
const make = () => { const d = new FitLogDatabase(`strategy-test-${crypto.randomUUID()}`); databases.push(d); return d }
const draft = (count = 4) => ({ name: '减脂碳循环 V1', variants: Array.from({ length: count }, (_, i) => ({ name: ['高碳日','中碳日','低碳日','休息日'][i] ?? `方案 ${i+1}`, calories: 2400 - i*150, protein: 180, carbs: 320 - i*50, fat: 55 + i*10 })) })
afterEach(async () => { vi.restoreAllMocks(); for (const d of databases.splice(0)) { d.close(); await Dexie.delete(d.name) } })

async function active(d: FitLogDatabase) { const value = await saveNutritionStrategy(draft(), d); await activateNutritionStrategy(value.template.id, '2026-09-01', d); return value }

describe('nutrition strategy definitions and snapshots', () => {
  it('creates four independent ordered variants and persists reorder on reopen', async () => {
    const d = make(), value = await saveNutritionStrategy(draft(), d)
    expect(value.variants.map(v => v.sortOrder)).toEqual([0,1,2,3])
    const reordered = [...value.variants].reverse()
    await saveNutritionStrategy({ id: value.template.id, name: '调整', variants: reordered }, d)
    d.close(); await d.open()
    expect((await getNutritionStrategy(value.template.id,d))!.variants.map(v => v.id)).toEqual(reordered.map(v => v.id))
  })
  it('copies deeply with fresh template/variant IDs; saving does not activate', async () => {
    const d = make(), original = await saveNutritionStrategy(draft(), d), copy = duplicateNutritionStrategy(original)
    copy.variants[0]!.calories = 1234
    const saved = await saveNutritionStrategy(copy,d)
    expect(saved.template.id).not.toBe(original.template.id)
    expect(saved.variants.every(v => original.variants.every(old => old.id!==v.id))).toBe(true)
    expect((await getNutritionStrategy(original.template.id,d))!.variants[0]!.calories).toBe(2400)
    expect(await d.nutritionStrategyPhases.count()).toBe(0)
  })
  it('applies real date snapshots with persisted names, independent of later edits/removal', async () => {
    const d = make(), value = await active(d), v = value.variants[0]!
    const target = await applyNutritionStrategyVariant('2026-09-03',v.id,d)
    expect(target).toMatchObject({ calories:2400, protein:180, strategySelection:{templateId:value.template.id,variantId:v.id,templateName:'减脂碳循环 V1',variantName:'高碳日'} })
    await saveNutritionStrategy({ id:value.template.id,name:'改名',variants:value.variants.map(x=>({...x,calories:1,name:'改名方案'})) },d)
    expect(await d.nutritionTargets.get(target.id)).toEqual(target)
    await saveNutritionStrategy({id:value.template.id,name:'移除高碳',variants:value.variants.slice(1)},d)
    expect(await d.nutritionTargets.get(target.id)).toEqual(target)
    expect(validateBackup(await exportBackup(d)).data.nutritionTargets[0]).toEqual(target)
  })
  it('manual target clears provenance and does not modify definition or phase', async () => {
    const d=make(), value=await active(d);await applyNutritionStrategyVariant('2026-09-03',value.variants[0]!.id,d)
    const phases=await d.nutritionStrategyPhases.toArray(), definitions=await getNutritionStrategy(value.template.id,d)
    const target=await saveNutritionTarget('2026-09-03',{calories:2400,protein:180},d)
    expect(target.strategySelection).toBeUndefined();expect(target.sourceTemplateId).toBeUndefined()
    expect(await d.nutritionStrategyPhases.toArray()).toEqual(phases);expect(await getNutritionStrategy(value.template.id,d)).toEqual(definitions)
  })
  it('manual target remains usable without any strategy', async()=>{const d=make();await saveNutritionTarget('2026-09-03',{calories:0},d);expect(await d.nutritionTargets.count()).toBe(1);expect(await d.nutritionStrategyTemplates.count()).toBe(0)})
  it('rejects missing/invalid/duplicate goals or foreign IDs without partially saving', async()=>{
    const d=make(), value=await saveNutritionStrategy(draft(),d)
    for(const input of [{name:'x',variants:[]},{name:'x',variants:[{name:'x'}]},{name:'x',variants:[{name:'x',calories:-1}]},{name:'x',variants:[{...value.variants[0]!,id:value.variants[0]!.id}]}]) await expect(saveNutritionStrategy(input,d)).rejects.toThrow()
    expect(await d.nutritionStrategyTemplates.count()).toBe(1)
    await expect(saveNutritionStrategy({name:'重复',variants:[{id:'same',name:'a',calories:1},{id:'same',name:'b',calories:2}]},d)).rejects.toThrow('重复')
  })
  it('preserves exact canonical values and unknown macros through a variant snapshot',async()=>{const d=make(),value=await saveNutritionStrategy({name:'精度',variants:[{name:'日方案',calories:1234.567,protein:0}]},d);await activateNutritionStrategy(value.template.id,'2026-09-01',d);const target=await applyNutritionStrategyVariant('2026-09-02',value.variants[0]!.id,d);expect(target.calories).toBe(1234.567);expect(target.protein).toBe(0);expect(target.carbs).toBeUndefined()})
  it('checks stale preview before committing and allows explicit unchanged preview',async()=>{const d=make(),value=await active(d),context=(await getNutritionStrategyForDate('2026-09-03',d))!,variant=context.variants[0]!;const preview={context,variant,existing:undefined};await saveNutritionTarget('2026-09-03',{calories:500},d);await expect(applyNutritionStrategyVariant('2026-09-03',variant.id,d,preview)).rejects.toThrow('已变化');expect((await d.nutritionTargets.toArray())[0]!.calories).toBe(500);const fresh={context:(await getNutritionStrategyForDate('2026-09-03',d))!,variant,existing:(await d.nutritionTargets.toArray())[0]};await applyNutritionStrategyVariant('2026-09-03',value.variants[0]!.id,d,fresh);expect((await d.nutritionTargets.toArray())[0]!.calories).toBe(2400)})
})

describe('manual phase boundaries and actual weight summaries',()=>{
  it('V2 closes V1 on the previous local calendar day and never rewrites existing targets',async()=>{const d=make(),v1=await active(d),target=await applyNutritionStrategyVariant('2026-09-20',v1.variants[0]!.id,d);const v2=await saveNutritionStrategy({...duplicateNutritionStrategy(v1),name:'V2'},d);await activateNutritionStrategy(v2.template.id,'2026-09-15',d);const phases=await d.nutritionStrategyPhases.orderBy('startDate').toArray();expect(phases[0]!.endDate).toBe('2026-09-14');expect(phases[1]!.endDate).toBeUndefined();expect(await d.nutritionTargets.get(target.id)).toEqual(target);expect((await getNutritionStrategyForDate('2026-09-03',d))!.template.id).toBe(v1.template.id);expect((await getNutritionStrategyForDate('2026-09-15',d))!.template.id).toBe(v2.template.id)})
  it('cannot overlap, reactivate current, schedule future or activate archived templates',async()=>{const d=make(),v1=await active(d),v2=await saveNutritionStrategy(draft(1),d);await expect(activateNutritionStrategy(v1.template.id,'2026-09-02',d)).rejects.toThrow('使用中');await expect(activateNutritionStrategy(v2.template.id,'2026-09-01',d)).rejects.toThrow('开始日期');await expect(activateNutritionStrategy(v2.template.id,'2999-01-01',d)).rejects.toThrow('晚于今天');await expect(activateNutritionStrategy(v2.template.id,'2026-02-30',d)).rejects.toThrow('有效日期');await archiveNutritionStrategy(v2.template.id,d);await expect(activateNutritionStrategy(v2.template.id,'2026-09-02',d)).rejects.toThrow('归档')})
  it('atomic concurrent activation keeps one active phase and stale confirmation refuses',async()=>{const d=make(),v1=await active(d),v2=await saveNutritionStrategy(draft(1),d),v3=await saveNutritionStrategy(draft(1),d);const old=(await d.nutritionStrategyPhases.toArray())[0]!;const results=await Promise.allSettled([activateNutritionStrategy(v2.template.id,'2026-09-02',d),activateNutritionStrategy(v3.template.id,'2026-09-02',d)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await d.nutritionStrategyPhases.toArray()).filter(p=>!p.endDate)).toHaveLength(1);await expect(activateNutritionStrategy(v1.template.id,'2026-09-03',d,{activePhaseId:old.id,templateUpdatedAt:v1.template.updatedAt})).rejects.toThrow('已变化')})
  it('archive retains history, prevents current archival, and copy from archive works',async()=>{const d=make(),v1=await active(d),target=await applyNutritionStrategyVariant('2026-09-03',v1.variants[0]!.id,d);await expect(archiveNutritionStrategy(v1.template.id,d)).rejects.toThrow('先切换');const v2=await saveNutritionStrategy(draft(1),d);await activateNutritionStrategy(v2.template.id,'2026-09-04',d);await archiveNutritionStrategy(v1.template.id,d);expect(await d.nutritionTargets.get(target.id)).toEqual(target);expect(await d.nutritionStrategyPhases.count()).toBe(2);const copy=await saveNutritionStrategy(duplicateNutritionStrategy((await getNutritionStrategy(v1.template.id,d))!),d);expect(copy.template.archivedAt).toBeUndefined()})
  it.each([['2026-09-01',undefined,'2026-09-23',23],['2026-09-01','2026-09-10','2026-09-23',10],['2026-09-01',undefined,'2026-08-31',0],['2026-03-07','2026-03-10','2026-03-11',4],['2026-12-31',undefined,'2027-01-01',2]])('calendar days %s–%s until %s', (startDate,endDate,today,days)=>{expect(nutritionPhaseDays({id:'p',templateId:'t',templateName:'t',startDate,endDate,createdAt:''},today)).toBe(days)})
  it('weight summary uses zero/one/many actual in-range records and no extrapolation',async()=>{const d=make(),v=await active(d),phase=(await d.nutritionStrategyPhases.toArray())[0]!;expect(await getNutritionPhaseSummary(phase,d,'2026-09-10')).toMatchObject({count:0,change:undefined,days:10});await upsertWeight('2026-08-31',99,d);await upsertWeight('2026-09-11',1,d);await upsertWeight('2026-09-03',80.2,d);expect(await getNutritionPhaseSummary(phase,d,'2026-09-10')).toMatchObject({count:1,change:undefined});await upsertWeight('2026-09-09',78.9,d);const summary=await getNutritionPhaseSummary(phase,d,'2026-09-10');expect(summary.count).toBe(2);expect(summary.first!.weightKg).toBe(80.2);expect(summary.last!.weightKg).toBe(78.9);expect(summary.change).toBeCloseTo(-1.3);await saveNutritionStrategy({...duplicateNutritionStrategy(v),name:'V2'},d);expect(await d.weights.count()).toBe(4)})
})

describe('V7 → V8 preservation and complete Backup V8',()=>{
  it('explicit migration adds three empty stores without backfilling or changing any frozen V7 record; new data survives reopen',async()=>{const d=make(),previous=legacyV7Database(d.name);await previous.open();await previous.transaction('rw',previous.tables,async()=>{for(const [store,rows] of Object.entries(legacy)){await previous.table(store).bulkAdd(rows)}});previous.close();await d.open();expect(d.verno).toBe(11);expect(d.tables).toHaveLength(20);for(const [store,rows] of Object.entries(legacy))expect(await d.table(store).toArray()).toEqual([...rows].sort((a,b)=>a.id.localeCompare(b.id)));for(const table of [d.nutritionStrategyTemplates,d.nutritionStrategyVariants,d.nutritionStrategyPhases])expect(await table.count()).toBe(0);const v=await active(d);await applyNutritionStrategyVariant('2026-09-29',v.variants[0]!.id,d);const before=await exportBackup(d);d.close();await d.open();expect((await exportBackup(d)).data).toEqual(before.data)})
  it('V8 definition, order, phases, deleted-variant provenance round-trip',async()=>{const d=make(),v=await active(d);await applyNutritionStrategyVariant('2026-09-03',v.variants[0]!.id,d);await saveNutritionStrategy({id:v.template.id,name:v.template.name,variants:v.variants.slice(1).reverse()},d);const backup=await exportBackup(d),other=make();expect(backup.schemaVersion).toBe(11);await restoreBackup(backup,other);expect((await exportBackup(other)).data).toEqual(backup.data)})
  it.each([1,2,3,4,5,6,7])('Restore V%s remains supported and initializes strategy stores empty',async(version)=>{const data=structuredClone(legacy) as Record<string,unknown[]>;const keys=['foods','foodLogs','exercises','workouts','weights',...(version>=2?['workoutTemplates','dietTemplates']:[]),...(version>=3?['nutritionTargets','pelvicFloorSessions']:[]),...(version>=4?['cardioSessions']:[]),...(version>=6?['habits','habitCheckIns']:[]),...(version>=7?['tasks','taskTags']:[])];if(version===4)data.cardioSessions=data.cardioSessions!.map(r=>{const v={...r as Record<string,unknown>};delete v.activityType;delete v.inclinePercent;return v});const backup={app:'FitLog Lite',schemaVersion:version,exportedAt:'2026-09-28T08:00:00.000Z',data:Object.fromEntries(keys.map(k=>[k,data[k]]))};const d=make();await active(d);await restoreBackup(backup,d);expect(await d.nutritionStrategyTemplates.count()).toBe(0);expect(await d.nutritionStrategyVariants.count()).toBe(0);expect(await d.nutritionStrategyPhases.count()).toBe(0);expect(await d.foodLogs.toArray()).toEqual(legacy.foodLogs)})
  it('validates every new field/reference/order/overlap/provenance before touching local data',async()=>{const d=make(),v=await active(d);await applyNutritionStrategyVariant('2026-09-03',v.variants[0]!.id,d);const good=await exportBackup(d);const mutate=[(b:typeof good)=>{b.data.nutritionStrategyTemplates=[]},(b:typeof good)=>{b.data.nutritionStrategyVariants[0]!.calories=-1},(b:typeof good)=>{b.data.nutritionStrategyVariants[1]!.sortOrder=b.data.nutritionStrategyVariants[0]!.sortOrder},(b:typeof good)=>{b.data.nutritionStrategyPhases[0]!.endDate='2026-08-31'},(b:typeof good)=>{b.data.nutritionStrategyPhases.push({...b.data.nutritionStrategyPhases[0]!,id:'second',startDate:'2026-09-02'})},(b:typeof good)=>{b.data.nutritionTargets[0]!.strategySelection!.phaseId='missing'}];for(const fn of mutate){const bad=structuredClone(good);fn(bad);await expect(restoreBackup(bad,d)).rejects.toThrow();expect((await exportBackup(d)).data).toEqual(good.data)}})
  it('activation and definition-edit storage failures roll back prior state',async()=>{const d=make(),v1=await active(d),v2=await saveNutritionStrategy(draft(1),d),before=await exportBackup(d);vi.spyOn(d.nutritionStrategyPhases,'add').mockRejectedValueOnce(new Error('phase failed'));await expect(activateNutritionStrategy(v2.template.id,'2026-09-02',d)).rejects.toThrow('phase failed');expect((await exportBackup(d)).data).toEqual(before.data);vi.spyOn(d.nutritionStrategyVariants,'bulkAdd').mockRejectedValueOnce(new Error('variants failed'));await expect(saveNutritionStrategy({id:v1.template.id,name:'changed',variants:v1.variants},d)).rejects.toThrow('variants failed');expect((await exportBackup(d)).data).toEqual(before.data)})
  it('new stores participate in the same rollback transaction',async()=>{const d=make(),v=await active(d),good=await exportBackup(d);const incoming=structuredClone(good);incoming.data.nutritionStrategyTemplates[0]!.name='Incoming';vi.spyOn(d.nutritionStrategyPhases,'bulkAdd').mockRejectedValueOnce(new Error('injected storage failure'));await expect(restoreBackup(incoming,d)).rejects.toThrow('injected');expect((await exportBackup(d)).data).toEqual(good.data);expect(await d.nutritionStrategyTemplates.get(v.template.id)).toEqual(good.data.nutritionStrategyTemplates[0])})
})
