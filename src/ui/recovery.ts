import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { SleepSession, WaterLog } from '../db/types'
import { startSleep, finishSleep, editSleep, deleteSleep, addWater, editWater, deleteWater } from '../services/recoveryService'
import { formatSleepDuration, localClock, recoverySummary, SLEEP_REFERENCE_MINUTES, WATER_REFERENCE_ML } from '../utils/recovery'
import { getLocalDateString, formatShortDate } from '../utils/date'
import { icon } from './icons'
import { animateMotion, stabilizeSheetSubview } from './motion'
import { mountDatePicker } from './datePicker'
export interface RecoveryUi {
  esc(value: unknown): string
  openModal(title:string,html:string,large?:boolean):HTMLDialogElement
  confirm(title:string,copy:string):Promise<boolean>
  fail(error:unknown):void
}
export function recoverySlotHtml():string { return '<section class="recovery-section" aria-label="恢复与习惯"><h2>恢复与习惯</h2><div data-recovery-root></div></section>' }
export function mountRecovery(root:HTMLElement,ui:RecoveryUi,trends=false):()=>void {
  let days:7|30=7,disposed=false,renderedDate='',sleep:SleepSession[]=[],water:WaterLog[]=[],pending=false
  const redraw=()=>{
    if(disposed||!root.isConnected)return
    const today=getLocalDateString(),active=sleep.find(s=>!s.endTime),finished=sleep.filter(s=>s.recordDate===today&&s.endTime),minutes=finished.reduce((n,s)=>n+s.durationMinutes!,0)
    renderedDate=today
    const activeMinutes=active?Math.max(0,(Date.now()-Date.parse(active.startTime))/60000):0
    const total=water.filter(w=>w.date===today).reduce((n,w)=>n+w.amountMl,0),percent=Math.round(total/WATER_REFERENCE_ML*100)
    const undo=root.querySelector('.water-undo')
    root.innerHTML=`<section class="today-card recovery-card sleep-card"><div class="card-heading"><h3>睡眠</h3><button type="button" class="text-btn" data-sleep-history>历史记录</button></div><div class="recovery-copy"><strong data-sleep-state>${active?'睡眠记录中':finished.length?'今日睡眠':'今晚还未记录'}</strong>${active?`<span class="recovery-number">${localClock(active.startTime)} 开始</span><span data-sleep-elapsed class="recovery-number">已记录 ${formatSleepDuration(activeMinutes)}</span>${activeMinutes>1440?'<p class="recovery-warning">睡眠记录已持续超过24小时，请确认是否仍在记录。</p>':''}`:finished.length?`<span class="recovery-number">${formatSleepDuration(minutes)}</span>${finished.map(s=>`<span class="recovery-number">${localClock(s.startTime)} → ${localClock(s.endTime!)}</span>`).join('')}`:'<span>睡前开始，睡醒后结束。</span>'}</div><button type="button" class="primary full-btn" data-sleep-action ${pending?'disabled':''}>${active?'我醒了':'开始睡眠'}</button>${active?'<div class="recovery-secondary"><button type="button" class="text-btn" data-sleep-edit>修正开始时间</button><button type="button" class="text-btn danger" data-sleep-cancel>取消本次记录</button></div>':''}</section><section class="today-card recovery-card water-card"><div class="card-heading"><h3>饮水</h3><button type="button" class="text-btn" data-water-history>历史记录</button></div><p class="recovery-number water-total"><strong>${total}</strong> / ${WATER_REFERENCE_ML} ml</p><span class="recovery-number">${percent}% · 参考值</span><div class="water-actions"><button type="button" class="secondary" data-water-add="250">+250 ml</button><button type="button" class="secondary" data-water-add="500">+500 ml</button><button type="button" class="secondary" data-water-custom>自定义</button></div></section>${trends?trendHtml(sleep,water,today,days):''}`
    if(undo)root.querySelector('.water-card')!.append(undo)
    const action=root.querySelector<HTMLButtonElement>('[data-sleep-action]')!
    action.addEventListener('click',async()=>{
      if(pending)return;pending=true;action.disabled=true;action.setAttribute('aria-busy','true')
      try{if(active)await finishSleep(active.id);else await startSleep()}catch(e){ui.fail(e)}finally{pending=false;if(!disposed)redraw()}
    })
    root.querySelector('[data-sleep-cancel]')?.addEventListener('click',async()=>{if(active&&await ui.confirm('取消本次睡眠记录？','本次正在记录的睡眠将删除，已有睡眠历史保留。'))try{await deleteSleep(active.id)}catch(e){ui.fail(e)}})
    root.querySelector('[data-sleep-edit]')?.addEventListener('click',()=>active&&showSleepEditor(active,ui))
    root.querySelector('[data-sleep-history]')?.addEventListener('click',()=>showSleepHistory(ui))
    root.querySelector('[data-water-history]')?.addEventListener('click',()=>showWaterHistory(ui))
    root.querySelector('[data-water-custom]')?.addEventListener('click',()=>showWaterEditor(undefined,ui))
    root.querySelectorAll<HTMLButtonElement>('[data-water-add]').forEach(b=>b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{const log=await addWater(Number(b.dataset.waterAdd));waterUndo(log,ui)}catch(e){ui.fail(e)}finally{if(b.isConnected)b.disabled=false}}))
    root.querySelectorAll<HTMLButtonElement>('[data-recovery-days]').forEach(b=>b.addEventListener('click',()=>{days=Number(b.dataset.recoveryDays) as 7|30;redraw()}))
  }
  const subscription=liveQuery(()=>Promise.all([db.sleepSessions.orderBy('startTime').reverse().toArray(),db.waterLogs.toArray()])).subscribe({next:([s,w])=>{sleep=s;water=w;redraw()},error:ui.fail})
  // Wall-clock display only. Sleep is never advanced by database writes or a timer engine.
  const tick=window.setInterval(()=>{
    if(disposed||!root.isConnected)return
    if(renderedDate!==getLocalDateString()){redraw();return}
    const active=sleep.find(s=>!s.endTime),label=root.querySelector('[data-sleep-elapsed]')
    if(active&&label){const m=Math.max(0,(Date.now()-Date.parse(active.startTime))/60000);if(m>1440&&!root.querySelector('.recovery-warning'))redraw();else label.textContent=`已记录 ${formatSleepDuration(m)}`}
  },30000)
  const visible=()=>{if(document.visibilityState==='visible')redraw()};document.addEventListener('visibilitychange',visible)
  return()=>{disposed=true;subscription.unsubscribe();clearInterval(tick);document.removeEventListener('visibilitychange',visible)}
}
function trendHtml(sleep:SleepSession[],water:WaterLog[],today:string,days:7|30):string {
  const summary=recoverySummary(sleep,water,today,days),max=Math.max(SLEEP_REFERENCE_MINUTES,...summary.daily.map(d=>d.minutes??0))
  return `<section class="chart-card recovery-trend"><div class="section-head"><h3>恢复趋势</h3><div class="segmented" aria-label="恢复趋势范围"><button type="button" data-recovery-days="7" class="${days===7?'active':''}">7天</button><button type="button" data-recovery-days="30" class="${days===30?'active':''}">30天</button></div></div><h4>睡眠</h4><dl class="recovery-statistics"><div><dt>平均睡眠</dt><dd>${summary.averageMinutes===undefined?'暂无记录':formatSleepDuration(summary.averageMinutes)}</dd></div><div><dt>平均入睡</dt><dd>${summary.averageStart??'暂无记录'}</dd></div><div><dt>平均起床</dt><dd>${summary.averageEnd??'暂无记录'}</dd></div><div><dt>达标天数 · 8小时参考</dt><dd>${summary.achievedDays} / ${days} 天</dd></div></dl><p class="recovery-note">近${days}天已记录 ${summary.recordedDays} 天。平均时长仅计算有记录的日期；入睡/起床均值取每天最长一段，按当前时区展示。</p><div class="sleep-bars" role="img" aria-label="每日睡眠柱状图，纵轴小时；完整数据见下方每日记录">${summary.daily.map(d=>`<span class="sleep-bar-column"><i style="height:${(d.minutes??0)/max*100}%"></i><small>${Number(d.date.slice(8))}</small></span>`).join('')}</div><p class="recovery-note">小时 · 图表上限 ${(max/60).toFixed(1)}</p><h4>饮水</h4><p class="recovery-note">每天独立累计 · 参考 ${WATER_REFERENCE_ML} ml</p><div class="sleep-bars water-bars" role="img" aria-label="每日饮水柱状图，纵轴毫升；完整数据见下方每日记录">${summary.daily.map(d=>`<span class="sleep-bar-column"><i style="height:${(d.waterMl??0)/Math.max(WATER_REFERENCE_ML,...summary.daily.map(x=>x.waterMl??0))*100}%"></i><small>${Number(d.date.slice(8))}</small></span>`).join('')}</div><p class="recovery-note">ml · 图表上限 ${Math.max(WATER_REFERENCE_ML,...summary.daily.map(d=>d.waterMl??0))}</p><details class="recovery-daily"><summary>每日睡眠与饮水</summary>${summary.daily.map(d=>`<p><span>${formatShortDate(d.date)}</span><span>${d.minutes===undefined?'睡眠未记录':formatSleepDuration(d.minutes)}</span><span>${d.waterMl===undefined?'饮水未记录':`${d.waterMl} ml`}</span></p>`).join('')}</details></section>`
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
  bindSave(dialog,'[data-water-form]',ui,async form=>{const amount=Number(new FormData(form).get('amount'));if(record)await editWater(record.id,amount);else waterUndo(await addWater(amount),ui)},done)
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
function waterUndo(record:WaterLog,ui:RecoveryUi):void {
  document.querySelector('.toast')?.remove()
  const el=document.createElement('div');el.className='toast water-undo';el.setAttribute('role','status');el.innerHTML=`${icon('check',18)}<span>已记录${record.amountMl}ml</span><button type="button" class="text-btn">撤销</button>`;(document.querySelector('[data-recovery-root] .water-card')??document.body).append(el)
  const timer=setTimeout(()=>{const a=animateMotion(el,'toast-exit');if(a)void a.finished.finally(()=>el.remove());else el.remove()},6000)
  el.querySelector('button')!.addEventListener('click',async()=>{clearTimeout(timer);el.querySelector('button')!.disabled=true;try{await deleteWater(record.id);el.remove()}catch(e){ui.fail(e)}})
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
