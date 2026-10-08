import { showActionToast } from './actionToast'
import { recoveryLineChartHtml } from './recoveryLineChart'
import { readRecoveryRecords } from '../services/dailyRecordsSummary'
import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { SleepSession, WaterLog } from '../db/types'
import { startSleep, finishSleep, editSleep, deleteSleep, addWater, editWater, deleteWater } from '../services/recoveryService'
import { formatSleepDuration, localClock, recoverySummary, recoveryDayFacts } from '../utils/recovery'
import { getLocalDateString, formatShortDate, shiftLocalDate } from '../utils/date'
import { readWaterReference, saveWaterReference, observeWaterReference } from '../services/waterReferenceConfig'
import { icon } from './icons'
import { animateMotion, stabilizeSheetSubview } from './motion'
import { mountDatePicker } from './datePicker'
export interface RecoveryUi {
  esc(value: unknown): string
  openModal(title:string,html:string,large?:boolean):HTMLDialogElement
  confirm(title:string,copy:string):Promise<boolean>
  fail(error:unknown):void
}
export function recoverySlotHtml():string { return '<section class="recovery-section" aria-label="恢复"><div data-recovery-root></div></section>' }
export function mountRecovery(root:HTMLElement,ui:RecoveryUi,trends=false):()=>void {
  let lastSnapshot=''
  const snapshot=()=>JSON.stringify([days,getLocalDateString(),readWaterReference(),sleep,water])
  let days:7|30|90=7,disposed=false,renderedDate='',sleep:SleepSession[]=[],water:WaterLog[]=[],pending=false
  const redraw=()=>{
    if(disposed||!root.isConnected)return
    const today=getLocalDateString(),active=sleep.find(s=>!s.endTime),facts=recoveryDayFacts(sleep,water,today),finished=facts.sessions,minutes=facts.minutes??0
    renderedDate=today;lastSnapshot=snapshot()
    const activeMinutes=active?Math.max(0,(Date.now()-Date.parse(active.startTime))/60000):0
    const total=facts.waterMl??0,reference=readWaterReference()
    root.innerHTML=`<section class="today-card today-activity-card recovery-card sleep-card"><div class="card-heading today-activity-head"><div><span class="card-icon recovery-icon">${icon('moon',20)}</span><h2>睡眠</h2></div><button type="button" class="text-btn" data-sleep-history>历史记录 ${icon('chevron',16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status" data-sleep-state>${active?'睡眠记录中':finished.length?'今日睡眠':'今晚还未记录'}</strong>${active?`<span class="today-activity-meta recovery-number">${localClock(active.startTime)} 开始</span><span data-sleep-elapsed class="today-activity-meta recovery-number">已记录 ${formatSleepDuration(activeMinutes)}</span>${activeMinutes>1440?'<p class="recovery-warning">睡眠记录已持续超过24小时，请确认是否仍在记录。</p>':''}`:finished.length?`<span class="today-activity-meta recovery-number">${formatSleepDuration(minutes)}</span>${finished.map(s=>`<span class="today-activity-meta recovery-number">${localClock(s.startTime)} → ${localClock(s.endTime!)}</span>`).join('')}`:'<span class="today-activity-meta">睡前开始，睡醒后结束。</span>'}</div><button type="button" class="primary today-activity-action" data-sleep-action ${pending?'disabled':''}>${active?'我醒了':'开始睡眠'}</button></div>${active?'<div class="recovery-secondary"><button type="button" class="text-btn" data-sleep-edit>修正开始时间</button><button type="button" class="text-btn danger" data-sleep-cancel>取消本次记录</button></div>':''}</section><section class="today-card today-activity-card recovery-card water-card"><div class="card-heading today-activity-head"><div><span class="card-icon recovery-icon">${icon('water',20)}</span><h2>饮水</h2></div><button type="button" class="text-btn" data-water-history>历史记录 ${icon('chevron',16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status water-total"><span>今日累计</span><span class="recovery-number"><span data-water-total>${total}</span> ml</span></strong>${reference===null?'':`<span class="today-activity-meta" data-water-reference>每日参考值 ${reference} ml</span>`}</div><button type="button" class="text-btn" data-water-reference-edit>修改参考值</button></div><div class="water-actions"><button type="button" class="secondary today-activity-action" data-water-add="250">+250 ml</button><button type="button" class="secondary today-activity-action" data-water-add="500">+500 ml</button><button type="button" class="secondary today-activity-action" data-water-custom>自定义记录</button></div></section>${trends?trendHtml(sleep,water,today,days):''}`
    const action=root.querySelector<HTMLButtonElement>('[data-sleep-action]')!
    action.addEventListener('click',async()=>{
      if(pending)return;pending=true;action.disabled=true;action.setAttribute('aria-busy','true')
      try{if(active)await finishSleep(active.id);else await startSleep()}catch(e){ui.fail(e)}finally{pending=false;if(!disposed)redraw()}
    })
    root.querySelector('[data-sleep-cancel]')?.addEventListener('click',async()=>{if(active&&await ui.confirm('取消本次睡眠记录？','本次正在记录的睡眠将删除，已有睡眠历史保留。'))try{await deleteSleep(active.id)}catch(e){ui.fail(e)}})
    root.querySelector('[data-sleep-edit]')?.addEventListener('click',()=>active&&showSleepEditor(active,ui))
    root.querySelector('[data-sleep-history]')?.addEventListener('click',()=>showSleepHistory(ui))
    root.querySelector('[data-water-history]')?.addEventListener('click',()=>showWaterHistory(ui))
    root.querySelector('[data-water-reference-edit]')?.addEventListener('click',()=>showWaterReference(ui))
    root.querySelector('[data-water-custom]')?.addEventListener('click',()=>showWaterEditor(undefined,ui))
    root.querySelectorAll<HTMLButtonElement>('[data-water-add]').forEach(b=>b.addEventListener('click',async()=>{try{const log=await addWater(Number(b.dataset.waterAdd));waterUndo(log)}catch(e){ui.fail(e)}}))
    root.querySelectorAll<HTMLButtonElement>('[data-recovery-days]').forEach(b=>b.addEventListener('click',()=>{days=Number(b.dataset.recoveryDays) as 7|30|90;subscribe()}))
  }
  const stopReference=observeWaterReference(redraw)
  let subscription:{unsubscribe():void}|undefined
  const subscribe=()=>{subscription?.unsubscribe();const today=getLocalDateString(),range=days;subscription=liveQuery(()=>readRecoveryRecords(trends?shiftLocalDate(today,1-range):today,today)).subscribe({next:value=>{if(disposed||range!==days)return;sleep=value.sleep;water=value.water;if(lastSnapshot!==snapshot())redraw()},error:ui.fail})}
  subscribe()
  // Wall-clock display only. Sleep is never advanced by database writes or a timer engine.
  const tick=window.setInterval(()=>{
    if(disposed||!root.isConnected)return
    if(renderedDate!==getLocalDateString()){subscribe();return}
    const active=sleep.find(s=>!s.endTime),label=root.querySelector('[data-sleep-elapsed]')
    if(active&&label){const m=Math.max(0,(Date.now()-Date.parse(active.startTime))/60000);if(m>1440&&!root.querySelector('.recovery-warning'))redraw();else label.textContent=`已记录 ${formatSleepDuration(m)}`}
  },30000)
  const visible=()=>{if(document.visibilityState==='visible')subscribe()};document.addEventListener('visibilitychange',visible)
  return()=>{disposed=true;stopReference();subscription?.unsubscribe();clearInterval(tick);document.removeEventListener('visibilitychange',visible)}
}
function trendHtml(sleep:SleepSession[],water:WaterLog[],today:string,days:7|30|90):string {
  const summary=recoverySummary(sleep,water,today,days)
  return `<section class="chart-card recovery-trend"><div class="section-head"><h3>恢复趋势</h3><div class="segmented recovery-ranges" aria-label="恢复趋势范围">${([7,30,90] as const).map(n=>`<button type="button" data-recovery-days="${n}" aria-pressed="${days===n}" class="${days===n?'active':''}">${n}天</button>`).join('')}</div></div><h4>睡眠 <small>小时</small></h4>${recoveryLineChartHtml(summary.daily.map(d=>({date:d.date,value:d.minutes})),'sleep')}<h4>饮水 <small>ml</small></h4>${recoveryLineChartHtml(summary.daily.map(d=>({date:d.date,value:d.waterMl})),'water')}<details class="recovery-daily"><summary>展开每日记录</summary>${summary.daily.map(d=>`<p><span>${formatShortDate(d.date)}</span><span>${d.minutes===undefined?'睡眠未记录':formatSleepDuration(d.minutes)}</span><span>${d.waterMl===undefined?'饮水未记录':`${d.waterMl} ml`}</span></p>`).join('')}</details></section>`
}

function showWaterReference(ui:RecoveryUi):void {
  const value=readWaterReference(),dialog=ui.openModal('修改饮水参考值',`<form class="form" data-water-reference-form><label>每日参考值（ml）<input name="reference" type="number" inputmode="numeric" min="1" max="100000" step="1" required value="${value??''}" placeholder="例如：2000"></label><p class="recovery-note">仅影响此设备上的参考值展示，不改变饮水记录，也不进入备份或同步。</p><p role="alert" data-recovery-error hidden></p><button type="submit" class="primary">保存参考值</button><button type="button" class="secondary" data-water-reference-unset>不设置参考值</button><button type="button" class="text-btn" data-water-reference-cancel>取消</button></form>`)
  bindSave(dialog,'[data-water-reference-form]',ui,async form=>{saveWaterReference(Number(new FormData(form).get('reference')))},()=>dialog.close())
  dialog.querySelector('[data-water-reference-unset]')!.addEventListener('click',()=>{try{saveWaterReference(null);dialog.close()}catch(e){ui.fail(e)}})
  dialog.querySelector('[data-water-reference-cancel]')!.addEventListener('click',()=>dialog.close())
}
function showSleepHistory(ui:RecoveryUi):void {
  const dialog=ui.openModal('睡眠记录','<div data-sleep-history-list><p>正在读取…</p></div>',true)
  const list=dialog.querySelector<HTMLElement>('[data-sleep-history-list]')!
  const sub=liveQuery(()=>db.sleepSessions.orderBy('startTime').reverse().toArray()).subscribe({next:rows=>{
    if(!dialog.isConnected)return
    list.innerHTML=rows.map(s=>`<article class="recovery-history-row"><button type="button" data-edit-sleep="${ui.esc(s.id)}"><strong class="recovery-history-tokens">${s.endTime?`<span>${ui.esc(s.recordDate)}</span><span>${formatSleepDuration(s.durationMinutes!)}</span>`:'睡眠记录中'}</strong><span class="recovery-history-tokens"><span>${ui.esc(new Date(s.startTime).toLocaleDateString('zh-CN'))}</span><span>${localClock(s.startTime)}</span><span>→</span>${s.endTime?`<span>${ui.esc(new Date(s.endTime).toLocaleDateString('zh-CN'))}</span><span>${localClock(s.endTime)}</span>`:'<span>未结束</span>'}</span></button><button type="button" class="text-btn danger" data-delete-sleep="${ui.esc(s.id)}">删除</button></article>`).join('')||'<p class="recovery-note">还没有睡眠记录。</p>'
    list.querySelectorAll<HTMLButtonElement>('[data-edit-sleep]').forEach(b=>b.addEventListener('click',()=>showSleepEditor(rows.find(s=>s.id===b.dataset.editSleep)!,ui,dialog)))
    list.querySelectorAll<HTMLButtonElement>('[data-delete-sleep]').forEach(b=>b.addEventListener('click',async()=>{if(await ui.confirm('删除睡眠记录？','此操作无法撤销。'))try{await deleteSleep(b.dataset.deleteSleep!)}catch(e){ui.fail(e)}}))
  },error:ui.fail})
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
}
function showSleepEditor(record:SleepSession,ui:RecoveryUi,parent?:HTMLDialogElement):void {
  let startDate=getLocalDateString(new Date(record.startTime)),endDate=record.endTime?getLocalDateString(new Date(record.endTime)):undefined
  const {dialog,done}=formSurface(parent,ui,'修正睡眠时间',`<form class="form" data-sleep-form><label>开始日期<button type="button" class="secondary fitlog-date-trigger" data-sleep-start-date>${startDate}</button></label><label>开始时间<input type="time" name="start" required value="${localClock(record.startTime)}"></label>${record.endTime?`<label>结束日期<button type="button" class="secondary fitlog-date-trigger" data-sleep-end-date>${endDate}</button></label><label>结束时间<input type="time" name="end" required value="${localClock(record.endTime)}"></label>`:''}<p class="recovery-note">时间按当前本地时区修正；跨天请同时检查日期。保存后重新计算时长。</p><p role="alert" data-recovery-error hidden></p><button class="primary full-btn" type="submit">保存睡眠记录</button></form>`)
  dialog.querySelector('[data-sleep-start-date]')!.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'睡眠开始日期',startDate,d=>{startDate=d;dialog.querySelector('[data-sleep-start-date]')!.textContent=d}))
  dialog.querySelector('[data-sleep-end-date]')?.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'睡眠结束日期',endDate!,d=>{endDate=d;dialog.querySelector('[data-sleep-end-date]')!.textContent=d}))
  bindSave(dialog,'[data-sleep-form]',ui,async form=>{const f=new FormData(form),start=new Date(`${startDate}T${f.get('start')}:00`),end=endDate?new Date(`${endDate}T${f.get('end')}:00`):undefined;await editSleep(record.id,start.toISOString(),end?.toISOString())},done)
}
function showWaterEditor(record:WaterLog|undefined,ui:RecoveryUi,parent?:HTMLDialogElement):void {
  const {dialog,done}=formSurface(parent,ui,record?'修改饮水':'记录饮水',`<form class="form" data-water-form><label>饮水量（ml）<input name="amount" type="number" inputmode="numeric" min="1" max="100000" step="1" required value="${record?.amountMl??''}" placeholder="例如：350"></label><p role="alert" data-recovery-error hidden></p><button class="primary full-btn" type="submit">保存饮水记录</button></form>`)
  bindSave(dialog,'[data-water-form]',ui,async form=>{const amount=Number(new FormData(form).get('amount'));if(record)await editWater(record.id,amount);else waterUndo(await addWater(amount))},done)
}
function bindSave(dialog:HTMLDialogElement,selector:string,ui:RecoveryUi,save:(form:HTMLFormElement)=>Promise<void>,done:()=>void):void {
  const form=dialog.querySelector<HTMLFormElement>(selector)!;let busy=false
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const b=form.querySelector<HTMLButtonElement>('[type=submit]')!;b.disabled=true;b.setAttribute('aria-busy','true');try{await save(form);done()}catch(error){const message=form.querySelector<HTMLElement>('[data-recovery-error]')!;message.hidden=false;message.textContent=error instanceof Error?error.message:'保存失败，请重试';ui.fail(error)}finally{busy=false;b.disabled=false;b.removeAttribute('aria-busy')}})
}
function showWaterHistory(ui:RecoveryUi):void {
  let date=getLocalDateString(),current:WaterLog[]=[]
  const dialog=ui.openModal('饮水记录','<button type="button" class="secondary fitlog-date-trigger" data-water-date></button><div data-water-history-list></div>',true)
  const list=dialog.querySelector<HTMLElement>('[data-water-history-list]')!,dateButton=dialog.querySelector<HTMLElement>('[data-water-date]')!
  const draw=()=>{
    if(!dialog.isConnected)return
    dateButton.textContent=date
    const rows=current.filter(w=>w.date===date).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)),total=rows.reduce((n,w)=>n+w.amountMl,0)
    list.innerHTML=`<p class="recovery-number">共 ${total} ml</p>${rows.map(w=>`<article class="recovery-history-row"><button type="button" data-edit-water="${ui.esc(w.id)}"><strong class="recovery-number">${w.amountMl} ml</strong><span class="recovery-number">${localClock(w.timestamp)}</span></button><button type="button" class="text-btn danger" data-delete-water="${ui.esc(w.id)}">删除</button></article>`).join('')||'<p class="recovery-note">当天还没有饮水记录。</p>'}`
    list.querySelectorAll<HTMLButtonElement>('[data-edit-water]').forEach(b=>b.addEventListener('click',()=>showWaterEditor(rows.find(w=>w.id===b.dataset.editWater)!,ui,dialog)))
    list.querySelectorAll<HTMLButtonElement>('[data-delete-water]').forEach(b=>b.addEventListener('click',async()=>{if(await ui.confirm('删除饮水记录？','仅删除这一条饮水记录。'))try{await deleteWater(b.dataset.deleteWater!)}catch(e){ui.fail(e)}}))
  }
  const sub=liveQuery(()=>db.waterLogs.toArray()).subscribe({next:rows=>{current=rows;draw()},error:ui.fail})
  dialog.querySelector('[data-water-date]')!.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'选择饮水日期',date,d=>{date=d;draw()}))
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
}
function waterUndo(record:WaterLog):void {
  showActionToast(`已记录 ${record.amountMl} ml`,{className:'water-undo',duration:6000,action:{label:'撤销',run:async()=>{try{await deleteWater(record.id)}catch{throw new Error('撤销未完成，请重试')}}}})
}

// Recovery history/editor/date use one existing Sheet. X exits, Back/Escape pop a subview.
const subviews=new WeakMap<HTMLDialogElement,{back:HTMLButtonElement;stack:Array<(()=>void)&{cleanup?:()=>void}>}>()
function formSurface(parent:HTMLDialogElement|undefined,ui:RecoveryUi,title:string,html:string):{dialog:HTMLDialogElement;done:()=>void} {
  if(!parent){const dialog=ui.openModal(title,html);return{dialog,done:()=>dialog.close()}}
  return{dialog:parent,done:recoverySubview(parent,title,html)}
}
function recoverySubview(dialog:HTMLDialogElement,title:string,html:string,onLeave?:()=>void):()=>void {
  const body=dialog.querySelector<HTMLElement>('.modal-body')!,heading=dialog.querySelector<HTMLElement>('.modal-head h2')!,oldTitle=heading.textContent!,scroll=body.scrollTop,nodes=[...body.childNodes]
  let state=subviews.get(dialog)
  if(!state){const back=document.createElement('button');back.type='button';back.className='icon-btn quiet';back.innerHTML=icon('chevron',18).replace('<svg','<svg style="transform:rotate(180deg)"');back.dataset.recoveryBack='';state={back,stack:[]};subviews.set(dialog,state);back.addEventListener('click',()=>state!.stack.at(-1)?.());dialog.addEventListener('cancel',e=>{if(state!.stack.length){e.preventDefault();state!.stack.at(-1)!()} });dialog.addEventListener('close',()=>{state!.stack.forEach(route=>route.cleanup?.());state!.stack.length=0;subviews.delete(dialog)},{once:true})}
  const previousLabel=state.back.getAttribute('aria-label')
  state.back.setAttribute('aria-label',`返回${oldTitle}`);heading.before(state.back)
  const restore=Object.assign(()=>{if(!dialog.isConnected||state!.stack.at(-1)!==restore)return;state!.stack.pop();onLeave?.();body.replaceChildren(...nodes);heading.textContent=oldTitle;body.scrollTop=scroll;if(state!.stack.length)state!.back.setAttribute('aria-label',previousLabel!);else state!.back.remove();stabilizeSheetSubview(dialog);animateMotion(body,'back')},{cleanup:onLeave})
  state.stack.push(restore);body.innerHTML=html;body.scrollTop=0;heading.textContent=title;stabilizeSheetSubview(dialog);animateMotion(body,'subview');return restore
}
function recoveryDatePicker(dialog:HTMLDialogElement,ui:RecoveryUi,title:string,date:string,commit:(date:string)=>void):void {
  let picker:ReturnType<typeof mountDatePicker>|undefined
  const restore=recoverySubview(dialog,title,'<div data-recovery-date-picker></div>',()=>picker?.destroy())
  picker=mountDatePicker(dialog.querySelector<HTMLElement>('[data-recovery-date-picker]')!,{value:date,onConfirm:value=>{restore();commit(value!)},onCancel:restore})
  void ui
}
