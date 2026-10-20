import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { exportBackup } from '../src/services/backupService'
import { activateNutritionStrategy, applyNutritionStrategyVariant, getNutritionStrategy, getNutritionStrategyForDate, nutritionPhaseFingerprint, saveNutritionStrategy } from '../src/services/nutritionStrategyService'

const opened:FitLogDatabase[]=[]
const make=(name=`goal-v02-${crypto.randomUUID()}`)=>{const d=new FitLogDatabase(name);opened.push(d);return d}
afterEach(async()=>{vi.restoreAllMocks();const names=[...new Set(opened.map(d=>d.name))];for(const d of opened.splice(0))d.close();for(const n of names)await Dexie.delete(n)})
async function setup(){
  const d=make(),a=await saveNutritionStrategy({name:'A',variants:[{name:'训练',calories:1234.567,protein:0}]},d)
  const phase=await activateNutritionStrategy(a.template.id,'2026-09-01',d)
  const b=await saveNutritionStrategy({name:'B',variants:[{name:'休息',carbs:123.4}]},d)
  const expected={activePhaseId:phase.id,templateUpdatedAt:b.template.updatedAt,phaseFingerprint:nutritionPhaseFingerprint(await d.nutritionStrategyPhases.toArray()),definitionFingerprint:JSON.stringify(b)}
  return{d,a,b,phase,expected}
}
it('rejects a changed phase with the same ID inside the activation transaction',async()=>{
  const {d,b,phase,expected}=await setup();await d.nutritionStrategyPhases.update(phase.id,{startDate:'2026-08-31'})
  const before=await exportBackup(d)
  await expect(activateNutritionStrategy(b.template.id,'2026-09-03',d,expected)).rejects.toThrow('已变化')
  expect((await exportBackup(d)).data).toEqual(before.data)
})
it('rejects variant changes even if template updatedAt was not advanced',async()=>{
  const {d,b,expected}=await setup();await d.nutritionStrategyVariants.update(b.variants[0]!.id,{carbs:999})
  const before=await exportBackup(d)
  await expect(activateNutritionStrategy(b.template.id,'2026-09-03',d,expected)).rejects.toThrow('已变化')
  expect((await exportBackup(d)).data).toEqual(before.data)
})
it('rejects ambiguous date phases and application without mutating any store',async()=>{
  const {d,a,b}=await setup();await d.nutritionStrategyPhases.add({id:'conflicting-phase',templateId:b.template.id,templateName:'B',startDate:'2026-09-02',endDate:'2026-09-05',createdAt:new Date().toISOString()})
  const before=Object.fromEntries(await Promise.all(d.tables.map(async t=>[t.name,await t.toArray()])))
  await expect(getNutritionStrategyForDate('2026-09-03',d)).rejects.toThrow('重叠')
  await expect(applyNutritionStrategyVariant('2026-09-03',a.variants[0]!.id,d)).rejects.toThrow('重叠')
  expect(Object.fromEntries(await Promise.all(d.tables.map(async t=>[t.name,await t.toArray()])))).toEqual(before)
})
it('keeps same-day switch conflicts safe rather than replacing historical phase semantics',async()=>{
  const {d,b,expected}=await setup(),before=await exportBackup(d)
  await expect(activateNutritionStrategy(b.template.id,'2026-09-01',d,expected)).rejects.toThrow('开始日期')
  expect((await exportBackup(d)).data).toEqual(before.data)
})
it('rolls back the previous phase closure when the new phase fails to persist',async()=>{
  const {d,b,expected}=await setup(),before=await exportBackup(d)
  vi.spyOn(d.nutritionStrategyPhases,'add').mockRejectedValueOnce(new Error('injected write failure'))
  await expect(activateNutritionStrategy(b.template.id,'2026-09-03',d,expected)).rejects.toThrow('injected')
  expect((await exportBackup(d)).data).toEqual(before.data)
})
it('two connections cannot both confirm the same phase preview',async()=>{
  const {d,a,b,expected}=await setup(),other=make(d.name);await other.open()
  const outcomes=await Promise.allSettled([activateNutritionStrategy(b.template.id,'2026-09-03',d,expected),activateNutritionStrategy(b.template.id,'2026-09-03',other,expected)])
  expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const phases=await d.nutritionStrategyPhases.toArray();expect(phases.filter(p=>!p.endDate)).toHaveLength(1)
  expect(phases.find(p=>p.templateId===a.template.id)!.endDate).toBe('2026-09-02')
})
it('an exact application preview is single-use and preserves unknown values and all other dates',async()=>{
  const {d,a}=await setup(),context=(await getNutritionStrategyForDate('2026-09-03',d))!,variant=context.variants[0]!
  await applyNutritionStrategyVariant('2026-09-02',variant.id,d)
  const before=await exportBackup(d),preview={context,variant,existing:undefined}
  const saved=await applyNutritionStrategyVariant('2026-09-03',variant.id,d,preview)
  expect(saved.calories).toBe(1234.567);expect(saved.protein).toBe(0);expect(saved.carbs).toBeUndefined()
  const after=await exportBackup(d)
  await expect(applyNutritionStrategyVariant('2026-09-03',variant.id,d,preview)).rejects.toThrow('已变化')
  expect((await exportBackup(d)).data).toEqual(after.data)
  expect(after.data.nutritionTargets.filter(t=>t.date!=='2026-09-03')).toEqual(before.data.nutritionTargets)
  expect(await getNutritionStrategy(a.template.id,d)).toEqual(a)
})
