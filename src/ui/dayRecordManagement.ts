import { calendarCategories, calendarCategoryLabels, calendarCategoryIcons } from './calendarPage'
import { formatNumber } from '../utils/nutrition'
import { icon } from './icons'
import { previewDayDeletion, deleteDayRecords, type DayDeletionPreview } from '../services/dayRecordsService'
import type { DailyRecords } from '../services/dailyRecordsSummary'
export function calendarOperationsHtml(): string {
  return `<div class="calendar-operations"><details class="calendar-quick-record"><summary><span class="calendar-operation-copy"><strong>＋ 快捷记录</strong><small>展开后选择需要记录的类别</small></span>${icon('chevron',18)}</summary><div class="calendar-day-actions">${calendarCategories.map(key=>`<button type="button" data-calendar-quick="${key}" ${key==='food'?'id="calendar-day-food"':key==='strength'?'id="calendar-day-workout"':key==='weight'?'id="calendar-day-weight"':''}>${icon(calendarCategoryIcons[key],17)}<span>${calendarCategoryLabels[key]}</span></button>`).join('')}</div></details><details class="calendar-manage-records"><summary><span class="calendar-operation-copy"><strong>管理 / 删除当天记录</strong><small>独立选择十类，先预览再确认</small></span>${icon('chevron',18)}</summary><div data-day-delete-host></div></details></div>`
}
export function bindDayRecordManagement(dialog: HTMLDialogElement, date: string, read:()=>DailyRecords, confirm:(title:string,body:string,action:string)=>Promise<boolean>, toast:(s:string)=>void):()=>void {
  const host=dialog.querySelector<HTMLElement>('[data-day-delete-host]')!
  let busy=false, selected=new Set<typeof calendarCategories[number]>(), includeTarget=false, preview:DayDeletionPreview|undefined, message=''
  const counts=(records:DailyRecords)=>Object.fromEntries(calendarCategories.map(key=>[key,key==='food'?records.source.foodLogs.length:key==='strength'?records.source.workouts.length:key==='cardio'?records.source.cardioSessions.length:key==='pelvic'?records.source.pelvicFloorSessions.length:key==='weight'?records.source.weights.length:key==='dietEvent'?records.source.dietEvents.length:key==='habit'?records.source.habitCheckIns.length:key==='sleep'?records.source.sleepSessions.length:key==='water'?records.source.waterLogs.length:records.source.tasks?.length??0]))
  const draw=()=>{
    if(busy)return
    const n=counts(read());preview=undefined
    const target=read().source.nutritionTargets[0],targetInfo=target?(['calories','protein','carbs','fat'] as const).map((key,i)=>`${['热量','蛋白质','碳水','脂肪'][i]} ${target[key]===undefined?'未设置':formatNumber(target[key]!)+(key==='calories'?' kcal':' g')}`).join(' · '):'当天没有已保存目标'
    host.innerHTML=`<p class="report-note">${date} · 只删除所选日期的记录，无法撤销。食物库、模板、习惯定义和标签保留。</p><button type="button" class="text-btn" data-day-select-all>选择全部已有记录</button><div class="day-delete-grid">${calendarCategories.map(key=>`<label><input type="checkbox" data-day-delete-category="${key}" ${selected.has(key)?'checked':''} ${!n[key]?'disabled':''}><span>${calendarCategoryLabels[key]} · ${n[key]} 条</span></label>`).join('')}</div><label class="day-delete-target"><input type="checkbox" data-day-delete-target ${includeTarget?'checked':''} ${!read().source.nutritionTargets.length?'disabled':''}><span>同时删除当天已保存营养目标（可选）</span></label><p class="report-note" data-day-target-info>${targetInfo}</p><p role="alert" data-day-delete-error ${message?'':'hidden'}></p><div data-day-delete-preview></div><button type="button" class="secondary full-btn" data-day-delete-review>预览删除范围</button>`
    if(message)host.querySelector('[data-day-delete-error]')!.textContent=message
    host.querySelector('[data-day-select-all]')!.addEventListener('click',()=>{selected=new Set(calendarCategories.filter(key=>n[key]>0));draw()})
    host.querySelectorAll<HTMLInputElement>('[data-day-delete-category]').forEach(input=>input.addEventListener('change',()=>{const key=input.dataset.dayDeleteCategory as typeof calendarCategories[number];if(input.checked)selected.add(key);else selected.delete(key);preview=undefined;host.querySelector('[data-day-delete-preview]')!.innerHTML=''}))
    host.querySelector<HTMLInputElement>('[data-day-delete-target]')!.addEventListener('change',e=>{includeTarget=(e.currentTarget as HTMLInputElement).checked;preview=undefined;host.querySelector('[data-day-delete-preview]')!.innerHTML=''})
    host.querySelector('[data-day-delete-review]')!.addEventListener('click',async()=>{
      if(busy)return;busy=true
      try{
        preview=await previewDayDeletion(date,[...selected],includeTarget)
        if(!dialog.open||!host.isConnected)return
        if(!Object.values(preview.counts).some(n=>n!>0))throw new Error('请选择当天已有的记录')
        const summary=Object.entries(preview.counts).map(([key,n])=>`${key==='nutritionTarget'?'营养目标':calendarCategoryLabels[key as typeof calendarCategories[number]]} ${n} 条${key==='plan'&&preview!.subtaskCount?`（同时删除 ${preview!.subtaskCount} 个子任务）`:''}`).join('；')
        host.querySelector('[data-day-delete-preview]')!.innerHTML=`<p>${summary}${includeTarget?`。已保存目标：${targetInfo}`:''}</p><button type="button" class="danger-button full-btn" data-day-delete-confirm>删除所选记录</button>`
        host.querySelector('[data-day-delete-confirm]')!.addEventListener('click',async()=>{
          if(busy||!preview)return;busy=true;const reviewed=preview
          try{if(await confirm(`删除 ${date} 的所选记录？`,`${summary}${includeTarget?`。已保存目标：${targetInfo}`:''}。仅此日期，无法撤销。`,'确认删除')){await deleteDayRecords(reviewed);toast('所选当天记录已删除');selected.clear();includeTarget=false}}
          catch(e){error(e)}finally{busy=false;draw()}
        })
      }catch(e){error(e)}finally{busy=false}
    })
  }
  const error=(e:unknown)=>{message=e instanceof Error?e.message:'操作失败，请重试';const node=host.querySelector<HTMLElement>('[data-day-delete-error]');if(node){node.hidden=false;node.textContent=e instanceof Error?e.message:'操作失败，请重试'}}
  draw();return draw
}
