import { withHealthRangeGuard } from './pendingHealthOperations'
import { db, type FitLogDatabase } from '../db/database'
import type { SleepSession, Workout } from '../db/types'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { resolveSleepBusinessDate } from '../utils/sleepBusinessDate'
import { planNutritionStrategyCascade, nutritionCascadeFingerprint, type Snapshot } from './nutritionStrategyCascadeService'
import { validateCycleCollection } from './nutritionCycleService'

export const healthRangeStores = ['foodLogs','weights','waterLogs','sleepSessions','workouts','cardioSessions','pelvicFloorSessions','dietEvents','habitCheckIns'] as const
const ownedStores = {templates:'nutritionStrategyTemplates',variants:'nutritionStrategyVariants',phases:'nutritionStrategyPhases',targets:'nutritionTargets',cycles:'nutritionCycles',days:'nutritionCycleDays'} as const
export interface DateInterval { start:string; end:string }
interface Row {id:string;date?:string;[key:string]:unknown}
type AllRows = Record<string, Row[]>
export function validRangeDate(value:string):boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value)&&getLocalDateString(new Date(`${value}T12:00:00`))===value }
export function mergeDateIntervals(input:DateInterval[]):DateInterval[] {
  const out:DateInterval[]=[]
  for(const r of [...input].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end))){
    if(!validRangeDate(r.start)||!validRangeDate(r.end)||r.start>r.end)throw new Error('阶段或周期日期无效；未删除任何记录，请先核对日期')
    const last=out.at(-1)
    if(last&&r.start<=shiftLocalDate(last.end,1)){if(r.end>last.end)last.end=r.end}else out.push({start:r.start,end:r.end})
  }
  return out
}
const inside=(date:string,ranges:DateInterval[])=>ranges.some(r=>date>=r.start&&date<=r.end)
async function snapshot(database:FitLogDatabase):Promise<AllRows>{return Object.fromEntries(await Promise.all(database.tables.map(async t=>[t.name,await t.orderBy('id').toArray()]))) as AllRows}
function six(data:AllRows):Snapshot {return Object.fromEntries(Object.entries(ownedStores).map(([key,name])=>[key,data[name]])) as unknown as Snapshot}
function nutritionReferenceConflicts(data:Snapshot):string[]{
 const errors:string[]=[],templates=new Set(data.templates.map(t=>t.id)),variants=new Map(data.variants.map(v=>[v.id,v])),phases=new Map(data.phases.map(p=>[p.id,p])),cycles=new Map(data.cycles.map(c=>[c.id,c]))
 for(const row of [...data.variants,...data.phases,...data.cycles])if(!templates.has(row.templateId))errors.push(`对象 ${row.id} 的模板 ${row.templateId} 缺失`)
 for(const t of data.targets){const s=t.strategySelection,c=t.cycleSelection
  if(s&&c||t.sourceTemplateId!==undefined&&(s||c))errors.push(`每日目标 ${t.date}（${t.id}）来源混合`)
  if(s&&(!templates.has(s.templateId)||phases.get(s.phaseId)?.templateId!==s.templateId||variants.has(s.variantId)&&variants.get(s.variantId)!.templateId!==s.templateId))errors.push(`每日目标 ${t.date}（${t.id}）阶段或日方案归属不一致`)
  if(c&&(!templates.has(c.templateId)||cycles.get(c.cycleId)?.templateId!==c.templateId||variants.has(c.variantId)&&variants.get(c.variantId)!.templateId!==c.templateId))errors.push(`每日目标 ${t.date}（${t.id}）周期或日方案归属不一致`)
 }
 return errors
}
const intervalDays=(r:DateInterval)=>(Date.parse(r.end+'T00:00:00Z')-Date.parse(r.start+'T00:00:00Z'))/86400000+1
function plan(id:string,data:AllRows,today:string){
  const original=planNutritionStrategyCascade(id,six(data)),base=original.preview,conflicts=[...base.conflicts,...nutritionReferenceConflicts(six(data))]
  const sources=[...original.selected.phases.map(p=>({id:p.id,kind:'阶段',name:p.templateName,start:p.startDate,end:p.endDate??today,open:!p.endDate})),...original.selected.cycles.map(c=>({id:c.id,kind:c.archivedAt?'已归档周期':'营养周期',name:c.name,start:c.startDate,end:c.endDate,open:false}))]
  const ranges=mergeDateIntervals(sources),selected:Record<string,string[]>={}
  const variantIds=new Set(six(data).variants.map(v=>v.id)),cycleIds=new Set(six(data).cycles.map(c=>c.id))
  for(const t of original.selected.targets){const s=t.strategySelection,c=t.cycleSelection;if(s&&!variantIds.has(s.variantId)||c&&(!variantIds.has(c.variantId)||!cycleIds.has(c.cycleId)))conflicts.push(`每日目标 ${t.date}（${t.id}）引用的日方案或周期已缺失；历史快照仍可读取，请先核对来源，不自动重建历史定义`)}
  for(const day of original.selected.days)if(day.nutrition&&!variantIds.has(day.nutrition.variantId))conflicts.push(`周期日期 ${day.date}（${day.id}）引用的日方案已缺失，请先核对来源`)

  for(const [key,name] of Object.entries(ownedStores)) selected[name]=original.selected[key as keyof Snapshot].map(r=>r.id)
  const related=new Set(selected.nutritionTargets),extraTargets=data.nutritionTargets!.filter(t=>typeof t.date==='string'&&inside(t.date,ranges)&&!related.has(t.id))
  selected.nutritionTargets!.push(...extraTargets.map(t=>t.id))
  const foreign=[...six(data).phases.map(p=>({...p,endDate:p.endDate??today})),...six(data).cycles].filter(r=>r.templateId!==id)
  for(const other of foreign){
    if(!validRangeDate(other.startDate)||!validRangeDate(other.endDate)||other.startDate>other.endDate){conflicts.push(`其他模板 ${other.templateId} 对象 ${other.id} 日期无效，无法安全确定交叠`);continue}
    const overlaps=ranges.flatMap(r=>{const start=r.start>other.startDate?r.start:other.startDate,end=r.end<other.endDate?r.end:other.endDate;return start<=end?[{start,end}]:[]})
    for(const r of overlaps)conflicts.push(`日期冲突 ${r.start} — ${r.end}：其他模板 ${other.templateId}，对象 ${other.id}（1 条来源），请先核对阶段及周期`)
  }
  for(const name of healthRangeStores){
    selected[name]=[]
    for(const row of data[name]!){
      let date:string
      try{date=name==='sleepSessions'?resolveSleepBusinessDate(row as unknown as SleepSession):String(row.date??'');if(!validRangeDate(date))throw new Error('无效日期')}
      catch{conflicts.push(`${name} 记录 ${row.id} 日期无效，无法安全确定范围`);continue}
      if(!inside(date,ranges))continue
      selected[name]!.push(row.id)
      if(name==='sleepSessions'&&!(row as unknown as SleepSession).endTime)conflicts.push(`进行中睡眠 ${row.id}，所属夜晚 ${date}：请在睡眠卡结束或取消本次记录，再重新预览；未删除任何记录`)
      if(name==='workouts'&&!(row as unknown as Workout).finishedAt)conflicts.push(`未完成力量训练 ${row.id}，日期 ${date}：请先完成或取消训练，再重新预览；未删除任何记录`)
    }
  }
  const counts=Object.fromEntries(Object.entries(selected).map(([name,ids])=>[name,ids.length])),total=Object.values(counts).reduce((a,b)=>a+b,0)
  const dayCount=ranges.reduce((n,r)=>n+intervalDays(r),0),elapsedDayCount=ranges.filter(r=>r.start<=today).reduce((n,r)=>n+intervalDays({start:r.start,end:r.end<today?r.end:today}),0)
  return {id,name:base.name,today,sources,ranges,dayCount,elapsedDayCount,futureDayCount:dayCount-elapsedDayCount,counts,total,relatedTargets:base.counts.targets,extraTargets:extraTargets.length,conflicts:[...new Set(conflicts)],selected,fingerprint:nutritionCascadeFingerprint({today,data})}
}
export type NutritionRangeCascadePreview = ReturnType<typeof plan>
/** All 22 tables are read consistently; seven preserved stores are postcondition invariants. */
export async function previewNutritionRangeCascade(id:string,database:FitLogDatabase=db,today=getLocalDateString()):Promise<NutritionRangeCascadePreview>{
  return database.transaction('r',database.tables,async()=>plan(id,await snapshot(database),today))
}
export async function deleteNutritionRangeCascade(id:string,expectedFingerprint:string,database:FitLogDatabase=db,today?:string,signal?:AbortSignal):Promise<void>{
  const cancelled=()=>{if(signal?.aborted)throw new Error('删除已取消；未删除任何记录')}
  let abortTransaction:(()=>void)|undefined
  try{
  cancelled()
  const preflight=await previewNutritionRangeCascade(id,database,today??getLocalDateString())
  cancelled()
  await withHealthRangeGuard(preflight.ranges,()=>database.transaction('rw',database.tables,async transaction=>{
    cancelled();abortTransaction=()=>{try{transaction.abort()}catch{/* Already completed. */}};signal?.addEventListener('abort',abortTransaction,{once:true})
    const before=await snapshot(database),p=plan(id,before,today??getLocalDateString())
    if(p.fingerprint!==expectedFingerprint)throw new Error('数据或本地日期已变化；未删除任何记录，请重新预览并确认')
    if(p.conflicts.length)throw new Error(`${p.conflicts.join('；')}。未删除任何记录`)
    // Exact IDs only: never clear a table or touch shared definitions / Tasks.
    for(const [name,ids] of Object.entries(p.selected)){cancelled();await database.table(name).bulkDelete(ids)}
    cancelled()
    const after=await snapshot(database),expected=Object.fromEntries(Object.entries(before).map(([name,rows])=>{const ids=new Set(p.selected[name]??[]);return[name,rows.filter(r=>!ids.has(r.id))]})) as AllRows
    if(nutritionCascadeFingerprint(after)!==nutritionCascadeFingerprint(expected))throw new Error('删除后全表集合校验失败；事务已回滚，未删除任何记录')
    validateCycleCollection(six(after).cycles,six(after).days)
    if(nutritionReferenceConflicts(six(after)).length)throw new Error('删除后营养来源引用校验失败；事务已回滚，未删除任何记录')
    // A surviving row may never retain a typed reference to the removed owner.
    for(const target of six(after).targets)if(target.strategySelection?.templateId===id||target.cycleSelection?.templateId===id)throw new Error('目标引用校验失败；事务已回滚')
    cancelled()
  }),signal)
  }catch(error){if(signal?.aborted)throw new Error('删除已取消；事务已回滚，未删除任何记录');throw error}
  finally{if(abortTransaction)signal?.removeEventListener('abort',abortTransaction)}
}
