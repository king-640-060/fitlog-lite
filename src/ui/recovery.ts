import { showActionToast } from './actionToast'
import { recoveryLineChartHtml, mountRecoveryCharts } from './recoveryLineChart'
import { readRecoveryRecords } from '../services/dailyRecordsSummary'
import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { SleepSession, WaterLog } from '../db/types'
import { startSleep, finishSleep, editSleep, deleteSleep, addWater, editWater, deleteWater } from '../services/recoveryService'
import { formatSleepDuration, localClock, recoverySummary, recoveryDayFacts } from '../utils/recovery'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { readWaterReference, saveWaterReference, observeWaterReference } from '../services/waterReferenceConfig'
import { icon } from './icons'
import { openHistorySheet, historyRowHtml, historyEmptyHtml, updateHistoryList, historySubview as recoverySubview, historyDatePicker } from './recordHistory'
import { sleepTimelineHtml } from './sleepTimeline'
import { resolveSleepBusinessDate, sleepAttributionDates, sleepNightLabel, getSleepBusinessDate } from '../utils/sleepBusinessDate'

export interface RecoveryUi {
  esc(value: unknown): string
  openModal(title:string,html:string,large?:boolean):HTMLDialogElement
  confirm(title:string,copy:string):Promise<boolean>
  fail(error:unknown):void
}
export function recoverySlotHtml():string { return '<section class="recovery-section" aria-label="恢复"><div data-recovery-root></div></section>' }
export function mountRecovery(root:HTMLElement,ui:RecoveryUi,trends=false):()=>void {
  let chartDispose:(()=>void)|undefined,latestCompleted:SleepSession|undefined
  const selections:Partial<Record<'sleep'|'water',string>>={}
  let lastSnapshot=''
  const snapshot=()=>JSON.stringify([days,getLocalDateString(),readWaterReference(),sleep,water,latestCompleted])
  let days:7|30|90=7,disposed=false,renderedDate='',sleep:SleepSession[]=[],water:WaterLog[]=[],pending=false
  const redraw=()=>{
    if(disposed||!root.isConnected)return
    const today=getLocalDateString(),active=sleep.find(s=>!s.endTime),facts=recoveryDayFacts(sleep,water,today),finished=latestCompleted?[latestCompleted]:[],minutes=latestCompleted?.durationMinutes??0
    renderedDate=today;lastSnapshot=snapshot()
    const activeMinutes=active?Math.max(0,(Date.now()-Date.parse(active.startTime))/60000):0
    const total=facts.waterMl??0,reference=readWaterReference()
    const scrolls=[...root.querySelectorAll<HTMLElement>('[data-recovery-chart]')].map(e=>[e.dataset.recoveryChart,e.querySelector<HTMLElement>('.recovery-chart-scroll')!.scrollLeft] as const)
    const focused=document.activeElement instanceof Element&&root.contains(document.activeElement)?document.activeElement:undefined
    const point=focused?.closest<SVGElement>('[data-point-value]'),focusedKind=point?.closest<HTMLElement>('[data-recovery-chart]')?.dataset.recoveryChart,focusedDate=point?.dataset.pointDate,focusedRange=focused?.getAttribute('data-recovery-days')
    chartDispose?.()
    root.innerHTML=trends?trendHtml(sleep,water,today,days,selections):`<section class="today-card today-activity-card recovery-card sleep-card"><div class="card-heading today-activity-head"><div><span class="card-icon recovery-icon">${icon('moon',20)}</span><h2>睡眠</h2></div><button type="button" class="text-btn" data-sleep-history>历史记录 ${icon('chevron',16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status" data-sleep-state>${active?'睡眠记录中':finished.length?'最近完成睡眠':'今晚还未记录'}</strong>${active?`<span class="today-activity-meta recovery-number">${localClock(active.startTime)} 开始</span><span data-sleep-elapsed class="today-activity-meta recovery-number">已记录 ${formatSleepDuration(activeMinutes)}</span>${activeMinutes>1440?'<p class="recovery-warning">睡眠记录已持续超过24小时，请确认是否仍在记录。</p>':''}`:finished.length?`<span class="today-activity-meta">${sleepNightLabel(resolveSleepBusinessDate(finished[0]!))}</span><span class="today-activity-meta recovery-number">${formatSleepDuration(minutes)}</span>${finished.map(s=>`<span class="today-activity-meta recovery-number">${localClock(s.startTime)} → ${localClock(s.endTime!)}</span>`).join('')}`:'<span class="today-activity-meta">睡前开始，睡醒后结束。</span>'}</div><button type="button" class="primary today-activity-action" data-sleep-action ${pending?'disabled':''}>${active?'我醒了':'开始睡眠'}</button></div>${active&&latestCompleted?`<p class="recovery-note">最近完成 · ${sleepNightLabel(resolveSleepBusinessDate(latestCompleted))} · ${formatSleepDuration(latestCompleted.durationMinutes!)}</p>`:''}${active?'<div class="recovery-secondary"><button type="button" class="text-btn" data-sleep-edit>修正开始时间</button><button type="button" class="text-btn danger" data-sleep-cancel>取消本次记录</button></div>':''}</section><section class="today-card today-activity-card recovery-card water-card"><div class="card-heading today-activity-head"><div><span class="card-icon recovery-icon">${icon('water',20)}</span><h2>饮水</h2></div><button type="button" class="text-btn" data-water-history>历史记录 ${icon('chevron',16)}</button></div><div class="today-activity-body"><div class="today-activity-copy"><strong class="today-activity-status water-total"><span>今日累计</span><span class="recovery-number"><span data-water-total>${total}</span> ml</span></strong>${reference===null?'':`<span class="today-activity-meta" data-water-reference>每日参考值 ${reference} ml</span>`}</div><button type="button" class="text-btn" data-water-reference-edit>修改参考值</button></div><div class="water-actions"><button type="button" class="secondary today-activity-action" data-water-add="250">+250 ml</button><button type="button" class="secondary today-activity-action" data-water-add="500">+500 ml</button><button type="button" class="secondary today-activity-action" data-water-custom>自定义记录</button></div></section>`
    chartDispose=mountRecoveryCharts(root,(kind,date)=>{selections[kind]=date})
    if(focusedKind&&focusedDate)root.querySelector<SVGElement>(`[data-recovery-chart="${focusedKind}"] [data-point-date="${focusedDate}"][data-point-value]`)?.focus({preventScroll:true})
    else if(focusedRange)root.querySelector<HTMLElement>(`[data-recovery-days="${focusedRange}"]`)?.focus({preventScroll:true})
    for(const [kind,left] of scrolls){const region=root.querySelector<HTMLElement>(`[data-recovery-chart="${kind}"] .recovery-chart-scroll`);if(region)region.scrollLeft=left}
    const action=root.querySelector<HTMLButtonElement>('[data-sleep-action]')
    action?.addEventListener('click',async()=>{
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
    root.querySelectorAll<HTMLButtonElement>('[data-recovery-days]').forEach(b=>b.addEventListener('click',()=>{days=Number(b.dataset.recoveryDays) as 7|30|90;delete selections.sleep;delete selections.water;subscribe()}))
  }
  const stopReference=observeWaterReference(redraw)
  let subscription:{unsubscribe():void}|undefined
  const subscribe=()=>{subscription?.unsubscribe();const today=getLocalDateString(),range=days;subscription=liveQuery(()=>readRecoveryRecords(trends?shiftLocalDate(today,1-range):today,today)).subscribe({next:value=>{if(disposed||range!==days)return;sleep=value.sleep;water=value.water;latestCompleted=value.latestCompleted;if(lastSnapshot!==snapshot())redraw()},error:ui.fail})}
  subscribe()
  // Wall-clock display only. Sleep is never advanced by database writes or a timer engine.
  const tick=window.setInterval(()=>{
    if(disposed||!root.isConnected)return
    if(renderedDate!==getLocalDateString()){subscribe();return}
    const active=sleep.find(s=>!s.endTime),label=root.querySelector('[data-sleep-elapsed]')
    if(active&&label){const m=Math.max(0,(Date.now()-Date.parse(active.startTime))/60000);if(m>1440&&!root.querySelector('.recovery-warning'))redraw();else label.textContent=`已记录 ${formatSleepDuration(m)}`}
  },30000)
  const visible=()=>{if(document.visibilityState==='visible')subscribe()};document.addEventListener('visibilitychange',visible)
  return()=>{disposed=true;chartDispose?.();stopReference();subscription?.unsubscribe();clearInterval(tick);document.removeEventListener('visibilitychange',visible)}
}
function trendHtml(sleep:SleepSession[],water:WaterLog[],today:string,days:7|30|90,selections:Partial<Record<'sleep'|'water',string>>):string {
  const summary=recoverySummary(sleep,water,today,days)
  return `<section class="chart-card recovery-trend"><div class="section-head"><h3>恢复趋势</h3><div class="segmented recovery-ranges" aria-label="恢复趋势范围">${([7,30,90] as const).map(n=>`<button type="button" data-recovery-days="${n}" aria-pressed="${days===n}" class="${days===n?'active':''}">${n}天</button>`).join('')}</div></div><div class="section-head"><h4>睡眠</h4><button type="button" class="text-btn" data-sleep-history>历史记录 ${icon('chevron',16)}</button></div>${recoveryLineChartHtml(summary.daily.map(d=>({date:d.date,value:d.minutes})),'sleep',selections.sleep)}<div class="section-head"><h4>饮水</h4><button type="button" class="text-btn" data-water-history>历史记录 ${icon('chevron',16)}</button></div>${recoveryLineChartHtml(summary.daily.map(d=>({date:d.date,value:d.waterMl})),'water',selections.water)}</section>`
}

function showWaterReference(ui:RecoveryUi):void {
  const value=readWaterReference(),dialog=ui.openModal('修改饮水参考值',`<form class="form" data-water-reference-form><label>每日参考值（ml）<input name="reference" type="number" inputmode="numeric" min="1" max="100000" step="1" required value="${value??''}" placeholder="例如：2000"></label><p class="recovery-note">仅影响此设备上的参考值展示，不改变饮水记录，也不进入备份或同步。</p><p role="alert" data-recovery-error hidden></p><button type="submit" class="primary">保存参考值</button><button type="button" class="secondary" data-water-reference-unset>不设置参考值</button><button type="button" class="text-btn" data-water-reference-cancel>取消</button></form>`)
  bindSave(dialog,'[data-water-reference-form]',ui,async form=>{saveWaterReference(Number(new FormData(form).get('reference')))},()=>dialog.close())
  dialog.querySelector('[data-water-reference-unset]')!.addEventListener('click',()=>{try{saveWaterReference(null);dialog.close()}catch(e){ui.fail(e)}})
  dialog.querySelector('[data-water-reference-cancel]')!.addEventListener('click',()=>dialog.close())
}
function showSleepHistory(ui:RecoveryUi):void {
  const dialog=openHistorySheet(ui,'睡眠记录','<p class="recovery-note" data-sleep-legacy-note hidden>旧记录按当前本地时区推断所属夜晚；原始历史时区未保存。真实起止时间保持不变。</p><div data-sleep-history-list></div>'),list=dialog.querySelector<HTMLElement>('[data-sleep-history-list]')!,legacyNote=dialog.querySelector<HTMLElement>('[data-sleep-legacy-note]')!
  let current:SleepSession[]=[],timelineDate:string|undefined
  const timeline=()=>timelineDate?(sleepTimelineHtml(current,timelineDate,ui.esc)||historyEmptyHtml('这晚已没有睡眠记录。')):''
  const sub=liveQuery(()=>db.sleepSessions.orderBy('startTime').reverse().toArray()).subscribe({next:rows=>{
    if(!dialog.open)return;current=rows;legacyNote.hidden=!rows.some(s=>!s.sleepNightDate)
    updateHistoryList(list,rows.map(s=>historyRowHtml(s.id,s.endTime?sleepNightLabel(resolveSleepBusinessDate(s)):'睡眠记录中',`${s.endTime?formatSleepDuration(s.durationMinutes!)+' · ':''}${new Date(s.startTime).toLocaleDateString('zh-CN')} ${localClock(s.startTime)} → ${s.endTime?new Date(s.endTime).toLocaleDateString('zh-CN')+' '+localClock(s.endTime):'尚未结束'}`,`data-edit-sleep="${ui.esc(s.id)}"`,ui.esc,(s.endTime?`<button type="button" class="text-btn" data-view-sleep="${ui.esc(s.id)}">查看</button>`:'' ) )).join('')||historyEmptyHtml('还没有睡眠记录。'))
    const timelineHost=dialog.querySelector<HTMLElement>('[data-history-timeline]');if(timelineHost)timelineHost.innerHTML=timeline()
  },error:ui.fail})
  list.addEventListener('click',async event=>{const b=(event.target as Element).closest<HTMLElement>('button');if(!b)return;const id=b.dataset.historyEdit??b.dataset.historyDelete??b.dataset.viewSleep,record=current.find(s=>s.id===id);if(!record)return
    if(b.hasAttribute('data-history-edit'))showSleepEditor(record,ui,dialog)
    if(b.hasAttribute('data-view-sleep')){const date=resolveSleepBusinessDate(record);timelineDate=date;recoverySubview(dialog,sleepNightLabel(date),`<div data-history-timeline>${timeline()}</div>`,()=>{timelineDate=undefined})}
    if(b.hasAttribute('data-history-delete')&&await ui.confirm('删除睡眠记录？','仅删除这一条记录，真实时间和其它记录保留。'))try{await deleteSleep(record.id)}catch(e){ui.fail(e)}
  })
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
}
function showSleepEditor(record:SleepSession,ui:RecoveryUi,parent?:HTMLDialogElement):void {
  let startDate=getLocalDateString(new Date(record.startTime)),endDate=record.endTime?getLocalDateString(new Date(record.endTime)):undefined
  let nightSource=record.sleepNightDateSource??'auto',nightDate=resolveSleepBusinessDate(record)
  const {dialog,done}=formSurface(parent,ui,'修正睡眠时间',`<form class="form" data-sleep-form><label>开始日期<button type="button" class="secondary fitlog-date-trigger" data-sleep-start-date>${startDate}</button></label><label>开始时间<input type="time" name="start" required value="${localClock(record.startTime)}"></label>${record.endTime?`<label>结束日期<button type="button" class="secondary fitlog-date-trigger" data-sleep-end-date>${endDate}</button></label><label>结束时间<input type="time" name="end" required value="${localClock(record.endTime)}"></label>`:''}<label>所属夜晚<select name="night" data-sleep-night><option value="auto" ${nightSource==='auto'?'selected':''}>自动归属 · ${sleepNightLabel(nightDate)}</option>${sleepAttributionDates(record.sleepStartLocalDate??startDate).map(date=>`<option value="${date}" ${nightSource==='manual'&&nightDate===date?'selected':''}>${sleepNightLabel(date)}</option>`).join('')}</select></label><p class="recovery-note">凌晨0:00–5:59默认归前一晚；可改为开始当天或前一晚。所属夜晚不改变真实起止时间。修改时间按当前本地时区。</p><p role="alert" data-recovery-error hidden></p><button class="primary full-btn" type="submit">保存睡眠记录</button></form>`)
  const syncNightChoices=()=>{const select=dialog.querySelector<HTMLSelectElement>('[data-sleep-night]')!,choice=select.value,start=new Date(`${startDate}T${dialog.querySelector<HTMLInputElement>('[name=start]')!.value}:00`);if(!Number.isFinite(start.getTime()))return;const unchanged=start.getTime()===Date.parse(record.startTime),captured=unchanged?(record.sleepStartLocalDate??startDate):startDate,automatic=unchanged&&record.sleepNightDateSource==='auto'?record.sleepNightDate!:getSleepBusinessDate(start.toISOString()),dates=sleepAttributionDates(captured);select.innerHTML=`<option value="auto">自动归属 · ${sleepNightLabel(automatic)}</option>${dates.map(date=>`<option value="${date}">${sleepNightLabel(date)}</option>`).join('')}`;select.value=dates.includes(choice)?choice:'auto'}
  dialog.querySelector('[name=start]')!.addEventListener('input',syncNightChoices)
  dialog.querySelector('[data-sleep-start-date]')!.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'睡眠开始日期',startDate,d=>{startDate=d;dialog.querySelector('[data-sleep-start-date]')!.textContent=d;syncNightChoices()}))
  dialog.querySelector('[data-sleep-end-date]')?.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'睡眠结束日期',endDate!,d=>{endDate=d;dialog.querySelector('[data-sleep-end-date]')!.textContent=d}))
  bindSave(dialog,'[data-sleep-form]',ui,async form=>{const f=new FormData(form),start=startDate===getLocalDateString(new Date(record.startTime))&&f.get('start')===localClock(record.startTime)?record.startTime:new Date(`${startDate}T${f.get('start')}:00`).toISOString(),end=endDate?(record.endTime&&endDate===getLocalDateString(new Date(record.endTime))&&f.get('end')===localClock(record.endTime)?record.endTime:new Date(`${endDate}T${f.get('end')}:00`).toISOString()):undefined;const choice=String(f.get('night'));await editSleep(record.id,start,end,db,new Date(),choice==='auto'?{source:'auto'}:{source:'manual',date:choice})},done)
}
function showWaterEditor(record:WaterLog|undefined,ui:RecoveryUi,parent?:HTMLDialogElement):void {
  const {dialog,done}=formSurface(parent,ui,record?'修改饮水':'记录饮水',`<form class="form" data-water-form><label>饮水量（ml）<input name="amount" type="number" inputmode="numeric" min="1" max="100000" step="1" required value="${record?.amountMl??''}" placeholder="例如：350"></label><p role="alert" data-recovery-error hidden></p><button class="primary full-btn" type="submit">保存饮水记录</button></form>`)
  bindSave(dialog,'[data-water-form]',ui,async form=>{const amount=Number(new FormData(form).get('amount'));if(record)await editWater(record.id,amount);else waterUndo(await addWater(amount))},done)
}
function bindSave(dialog:HTMLDialogElement,selector:string,_ui:RecoveryUi,save:(form:HTMLFormElement)=>Promise<void>,done:()=>void):void {
  const form=dialog.querySelector<HTMLFormElement>(selector)!;let busy=false
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const b=form.querySelector<HTMLButtonElement>('[type=submit]')!;b.disabled=true;b.setAttribute('aria-busy','true');try{await save(form);done()}catch(error){const message=form.querySelector<HTMLElement>('[data-recovery-error]')!;message.hidden=false;message.textContent=error instanceof Error?error.message:'保存失败，请重试'}finally{busy=false;b.disabled=false;b.removeAttribute('aria-busy')}})
}
function showWaterHistory(ui:RecoveryUi):void {
  let date=getLocalDateString(),current:WaterLog[]=[],sub:{unsubscribe():void}|undefined
  const dialog=openHistorySheet(ui,'饮水记录','<div class="record-history-heading"><button type="button" class="text-btn" data-water-date></button><span data-water-history-total></span></div><div data-water-history-list></div>')
  const list=dialog.querySelector<HTMLElement>('[data-water-history-list]')!,dateButton=dialog.querySelector<HTMLElement>('[data-water-date]')!,totalLabel=dialog.querySelector<HTMLElement>('[data-water-history-total]')!
  const draw=()=>{if(!dialog.open)return;dateButton.textContent=new Date(date+'T12:00:00').toLocaleDateString('zh-CN');totalLabel.textContent=current.length?`当日共 ${current.reduce((n,w)=>n+w.amountMl,0)} ml`:'当天未记录饮水';updateHistoryList(list,current.map(w=>historyRowHtml(w.id,`${w.amountMl} ml`,localClock(w.timestamp),`data-edit-water="${ui.esc(w.id)}"`,ui.esc)).join('')||historyEmptyHtml('当天还没有饮水记录。'))}
  const subscribe=()=>{sub?.unsubscribe();const selected=date;sub=liveQuery(()=>db.waterLogs.where('date').equals(selected).reverse().sortBy('timestamp')).subscribe({next:rows=>{if(selected!==date)return;current=rows;draw()},error:ui.fail})}
  list.addEventListener('click',async event=>{const b=(event.target as Element).closest<HTMLElement>('button');if(!b)return;const record=current.find(w=>w.id===(b.dataset.historyEdit??b.dataset.historyDelete));if(!record)return;if(b.hasAttribute('data-history-edit'))showWaterEditor(record,ui,dialog);if(b.hasAttribute('data-history-delete')&&await ui.confirm('删除饮水记录？','仅删除这一条饮水记录。'))try{await deleteWater(record.id)}catch(e){ui.fail(e)}})
  dateButton.addEventListener('click',()=>recoveryDatePicker(dialog,ui,'选择饮水日期',date,d=>{date=d;subscribe()}));subscribe();dialog.addEventListener('close',()=>sub?.unsubscribe(),{once:true})
}
function waterUndo(record:WaterLog):void {
  showActionToast(`已记录 ${record.amountMl} ml`,{className:'water-undo',duration:6000,action:{label:'撤销',run:async()=>{try{await deleteWater(record.id)}catch{throw new Error('撤销未完成，请重试')}}}})
}

function formSurface(parent:HTMLDialogElement|undefined,ui:RecoveryUi,title:string,html:string):{dialog:HTMLDialogElement;done:()=>void} {
  if(!parent){const dialog=ui.openModal(title,html);return{dialog,done:()=>dialog.close()}}
  return{dialog:parent,done:recoverySubview(parent,title,html)}
}
function recoveryDatePicker(dialog:HTMLDialogElement,_ui:RecoveryUi,title:string,date:string,commit:(date:string)=>void):void {historyDatePicker(dialog,title,date,commit)}
