import { db, type FitLogDatabase } from '../db/database'
import type { NutritionCycle, NutritionCycleDay, NutritionGoal, DietTemplate, FoodLog, MealType } from '../db/types'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { strategyBusinessDate } from './nutritionStrategyService'
import { applyDietTemplate, resolveDietTemplateFoods } from './templateService'
import { createNutritionTarget, normalizeNutritionGoal } from './nutritionTargetService'
export const MAX_CYCLE_DAYS = 366
export function cycleDates(start:string,end:string):string[] {
  strategyBusinessDate(start);strategyBusinessDate(end)
  if(end<start)throw new Error('结束日期不能早于开始日期')
  const dates:string[]=[]
  for(let date=start;date<=end;date=shiftLocalDate(date,1)){if(dates.length>=MAX_CYCLE_DAYS)throw new Error(`周期最多 ${MAX_CYCLE_DAYS} 天`);dates.push(date)}
  return dates
}
export function cycleWeeks(start:string,end:string):Array<Array<string|undefined>> {
  const dates=cycleDates(start,end),offset=(new Date(start+'T12:00:00').getDay()+6)%7
  const cells:Array<string|undefined>=[...Array<undefined>(offset),...dates]
  while(cells.length%7)cells.push(undefined)
  return Array.from({length:cells.length/7},(_,i)=>cells.slice(i*7,i*7+7))
}
function nonempty(v:unknown,label:string):asserts v is string {if(typeof v!=='string'||!v.trim()||v.length>200)throw new Error(`${label}不合法`)}
function instant(v:unknown):void {if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw new Error('周期时间戳不合法')}
export function validateNutritionCycle(value:unknown):asserts value is NutritionCycle {
  const c=value as NutritionCycle;if(!c||typeof c!=='object')throw new Error('周期不合法')
  for(const key of ['id','name','templateId','templateName'] as const)nonempty(c[key],key)
  if(c.name.length>80)throw new Error('周期名称最多80字')
  cycleDates(c.startDate,c.endDate);instant(c.createdAt);instant(c.updatedAt);if(c.archivedAt!==undefined)instant(c.archivedAt)
  if(!Number.isSafeInteger(c.revision)||c.revision<1)throw new Error('周期版本不合法')
}
export function validateNutritionCycleDay(value:unknown):asserts value is NutritionCycleDay {
  const d=value as NutritionCycleDay;if(!d||typeof d!=='object')throw new Error('日期排程不合法')
  for(const key of ['id','cycleId'] as const)nonempty(d[key],key)
  strategyBusinessDate(d.date);instant(d.createdAt);instant(d.updatedAt)
  if(d.nutrition!==undefined){for(const key of ['calories','protein','carbs','fat'] as const)if(d.nutrition[key]!==undefined&&(typeof d.nutrition[key]!=='number'||!Number.isFinite(d.nutrition[key])||d.nutrition[key]!<0))throw new Error('排程营养值不合法');for(const key of ['variantId','variantName','templateId','templateName'] as const)nonempty(d.nutrition[key],key);if(!normalizeNutritionGoal(d.nutrition))throw new Error('排程目标不能为空')}
  if(d.dietTemplate!==undefined){nonempty(d.dietTemplate.id,'饮食模板');nonempty(d.dietTemplate.name,'饮食模板名称')}
  if(!d.nutrition&&!d.dietTemplate)throw new Error('空日期不应持久保存')
}
export function validateCycleCollection(cycles:NutritionCycle[],days:NutritionCycleDay[]):void {
  cycles.forEach(validateNutritionCycle);days.forEach(validateNutritionCycleDay)
  if(new Set(cycles.map(c=>c.id)).size!==cycles.length||new Set(days.map(d=>d.id)).size!==days.length)throw new Error('周期ID重复')
  const seen=new Set<string>()
  for(const d of days){const c=cycles.find(c=>c.id===d.cycleId);if(!c||d.date<c.startDate||d.date>c.endDate)throw new Error('排程日期超出所属周期');if(d.nutrition&&d.nutrition.templateId!==c.templateId)throw new Error('排程方案不属于周期模板');const key=d.cycleId+'\0'+d.date;if(seen.has(key))throw new Error('周期日期重复');seen.add(key)}
  const active=cycles.filter(c=>!c.archivedAt).sort((a,b)=>a.startDate.localeCompare(b.startDate))
  for(let i=1;i<active.length;i++)if(active[i]!.startDate<=active[i-1]!.endDate)throw new Error(`周期日期冲突：${active[i-1]!.name} / ${active[i]!.name}；请调整范围或先归档原周期`)
}
export interface CycleDraft { cycle: Omit<NutritionCycle,'revision'|'createdAt'|'updatedAt'> & Partial<Pick<NutritionCycle,'revision'|'createdAt'|'updatedAt'>>; days:NutritionCycleDay[] }
export async function saveNutritionCycle(draft:CycleDraft,database:FitLogDatabase=db,expectedRevision:number|null=null):Promise<NutritionCycle> {
  const value=structuredClone(draft),now=new Date().toISOString()
  return database.transaction('rw',database.nutritionCycles,database.nutritionCycleDays,database.nutritionStrategyTemplates,database.nutritionStrategyVariants,database.dietTemplates,async()=>{
    const previous=await database.nutritionCycles.get(value.cycle.id)
    if(previous?.archivedAt)throw new Error('已归档周期不能修改，请创建新周期')
    if((previous?.revision??null)!==expectedRevision)throw new Error('周期已在其他窗口修改，请重新打开后确认')
    const template=await database.nutritionStrategyTemplates.get(value.cycle.templateId)
    if(!template||template.archivedAt)throw new Error('营养模板不存在或已归档，请选择可用模板')
    const cycle:NutritionCycle={...value.cycle,templateName:template.name,createdAt:previous?.createdAt??now,updatedAt:now,revision:(previous?.revision??0)+1}
    const days=value.days.map(day=>({...day,cycleId:cycle.id,updatedAt:now}))
    // Existing immutable snapshots remain valid if a variant/template was later removed.
    const oldDays=await database.nutritionCycleDays.where('cycleId').equals(cycle.id).toArray()
    for(const day of days){const old=oldDays.find(d=>d.date===day.date);if(day.nutrition&&JSON.stringify(day.nutrition)!==JSON.stringify(old?.nutrition)){const variant=await database.nutritionStrategyVariants.get(day.nutrition.variantId);if(!variant||variant.templateId!==cycle.templateId)throw new Error('所选日方案已移除，请重新选择');const current={variantId:variant.id,variantName:variant.name,templateId:template.id,templateName:template.name,...goalValues(variant)};if(JSON.stringify(Object.entries(current).sort())!==JSON.stringify(Object.entries(day.nutrition).filter(([,v])=>v!==undefined).sort()))throw new Error('日方案已修改，请重新打开周期选择最新值')}
      if(day.dietTemplate&&JSON.stringify(day.dietTemplate)!==JSON.stringify(old?.dietTemplate)&&!await database.dietTemplates.get(day.dietTemplate.id))throw new Error('饮食模板已删除，请重新选择')}
    const cycles=(await database.nutritionCycles.toArray()).filter(c=>c.id!==cycle.id),allDays=(await database.nutritionCycleDays.toArray()).filter(d=>d.cycleId!==cycle.id)
    validateCycleCollection([...cycles,cycle],[...allDays,...days])
    await database.nutritionCycles.put(cycle);await database.nutritionCycleDays.where('cycleId').equals(cycle.id).delete();await database.nutritionCycleDays.bulkAdd(days)
    return cycle
  })
}
export function goalValues(goal:NutritionGoal):NutritionGoal {return Object.fromEntries((['calories','protein','carbs','fat'] as const).filter(k=>goal[k]!==undefined).map(k=>[k,goal[k]]))}
export async function archiveNutritionCycle(id:string,expectedRevision:number,database:FitLogDatabase=db):Promise<void>{
  await database.transaction('rw',database.nutritionCycles,async()=>{const c=await database.nutritionCycles.get(id);if(!c||c.revision!==expectedRevision)throw new Error('周期已变化，请重新确认');await database.nutritionCycles.put({...c,archivedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision:c.revision+1})})
}
export async function scheduledNutritionDay(date:string,database:FitLogDatabase=db):Promise<{cycle:NutritionCycle;day:NutritionCycleDay}|undefined>{
  strategyBusinessDate(date)
  return database.transaction('r',database.nutritionCycles,database.nutritionCycleDays,async()=>{const days=await database.nutritionCycleDays.where('date').equals(date).toArray();const cycles=await database.nutritionCycles.bulkGet(days.map(d=>d.cycleId));const values=days.map((day,i)=>({day,cycle:cycles[i]})).filter((v):v is {cycle:NutritionCycle;day:NutritionCycleDay}=>!!v.cycle&&!v.cycle.archivedAt);if(values.length>1)throw new Error('该日存在周期冲突，请先调整排程');return values[0]})
}
/** Explicit snapshot application only; existing targets are kept unless user chooses replacement. */
export async function applyScheduledNutritionTarget(date:string,expectedDay:NutritionCycleDay,replace:boolean,expectedTarget:string,database:FitLogDatabase=db,expectedRevision?:number):Promise<void>{
  await database.transaction('rw',database.nutritionCycles,database.nutritionCycleDays,database.nutritionTargets,async()=>{
    const plan=await scheduledNutritionDay(date,database),existing=await database.nutritionTargets.where('date').equals(date).first()
    if(!plan?.day.nutrition||(expectedRevision!==undefined&&plan.cycle.revision!==expectedRevision)||JSON.stringify(plan.day)!==JSON.stringify(expectedDay))throw new Error('排程已变化，请重新预览')
    if(JSON.stringify(existing??null)!==expectedTarget)throw new Error('当天目标已变化，请重新预览')
    if(existing&&!replace)return
    const n=plan.day.nutrition,target=createNutritionTarget(date,n,existing)
    target.cycleSelection={cycleId:plan.cycle.id,cycleName:plan.cycle.name,templateId:n.templateId,templateName:n.templateName,variantId:n.variantId,variantName:n.variantName}
    await database.nutritionTargets.put(target)
  })
}
/** Copy by calendar weekday into bounded later weeks; callers preview changed cells before confirming. */
export function copyCycleWeek(start:string,end:string,days:NutritionCycleDay[],sourceWeek:number):NutritionCycleDay[]{
  const weeks=cycleWeeks(start,end),source=weeks[sourceWeek];if(!source)throw new Error('请选择有效周')
  const result=structuredClone(days),now=new Date().toISOString()
  for(let week=sourceWeek+1;week<weeks.length;week++)for(let weekday=0;weekday<7;weekday++){
    const date=weeks[week]![weekday],from=source[weekday];if(!date||!from)continue
    const original=days.find(d=>d.date===from),index=result.findIndex(d=>d.date===date)
    if(index>=0)result.splice(index,1)
    if(original)result.push({...structuredClone(original),id:crypto.randomUUID(),date,createdAt:now,updatedAt:now})
  }
  return result.sort((a,b)=>a.date.localeCompare(b.date))
}
export function cycleIsPast(date:string):boolean{return date<getLocalDateString()}

/** Stable real-source identity; fallback timestamps/UUIDs are display-only. */
export function dietTemplateSourceFingerprint(resolved: Awaited<ReturnType<typeof resolveDietTemplateFoods>>): string {
  return JSON.stringify(resolved.map(({item,food,missing})=>({item,missing,food:missing?item.fallback:food})))
}

/** Explicit actual-intake confirmation, rechecked atomically after any target-conflict choice. */
export async function applyScheduledDietTemplate(
  date:string, expectedPlan:{cycle:NutritionCycle;day:NutritionCycleDay}, template:DietTemplate,
  expectedTarget:string, options:{replaceNutritionTarget?:boolean;preserveNutritionTarget?:boolean;meal?:MealType}={},
  database:FitLogDatabase=db, expectedFoods?:string,
):Promise<FoodLog[]> {
  strategyBusinessDate(date)
  if(date>getLocalDateString())throw new Error('未来日期只能预览，不能确认实际摄入')
  return database.transaction('rw',[database.nutritionCycles,database.nutritionCycleDays,database.foods,database.dietTemplates,database.foodLogs,database.nutritionTargets],async()=>{
    const plan=await scheduledNutritionDay(date,database),current=await database.dietTemplates.get(template.id),target=await database.nutritionTargets.where('date').equals(date).first()
    if(!plan?.day.dietTemplate||JSON.stringify(plan)!==JSON.stringify(expectedPlan)||JSON.stringify(current)!==JSON.stringify(template))throw new Error('排程或饮食模板已变化，请重新预览')
    if(JSON.stringify(target??null)!==expectedTarget)throw new Error('当天目标已变化，请重新预览')
    if(expectedFoods!==undefined&&dietTemplateSourceFingerprint(await resolveDietTemplateFoods(current!,database))!==expectedFoods)throw new Error('食物资料已变化，请重新预览')
    return applyDietTemplate(current!,date,database,options)
  })
}
