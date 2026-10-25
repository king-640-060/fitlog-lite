import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { icon } from './icons'
export type TrendRange = 7 | 30 | 90
export interface TrendState { range:TrendRange; selected?:string; scroll:number; initialized?:boolean }
export const createTrendState = ():TrendState => ({range:30,scroll:0})
export const trendStates = {weight:createTrendState(),sleep:createTrendState(),water:createTrendState()}
export function trendModuleHtml(kind:'weight'|'sleep'|'water',chart:string,state:TrendState,actions:string):string {
  const title={weight:'体重',sleep:'睡眠',water:'饮水'}[kind]
  const coverage=chart.match(/<div class="trend-visual-head">[\s\S]*?<\/div>/)?.[0]??'',help=chart.match(/<p class="trend-plot-help">[\s\S]*?<\/p>/)?.[0]??''
  chart=chart.replace(coverage,'').replace(help,'')
  const factualHelp=help.replace('点选查看完整日期与读数；','').replace('；长区间可左右滚动。','。').replace('</p>','<span class="sr-only">点选或用方向键查看完整日期与读数；长区间可左右滚动。</span></p>')
  const today=getLocalDateString(),start=shiftLocalDate(today,1-state.range)
  const rangeLabel=`${start.slice(0,7)} — ${today.slice(0,7)}`
  return `<section class="trend-module ${kind==='weight'?'weight-trend':'recovery-trend'}" data-trend-module="${kind}" data-trend-days="${state.range}"><header class="module-header"><div class="module-title"><span class="module-icon">${icon(kind==='weight'?'scale':kind==='sleep'?'moon':'water',20)}</span><h2>${title}</h2></div><button type="button" class="text-btn module-history" ${kind==='weight'?'id="weight-history-open"':`data-${kind}-history`}>历史记录 ${icon('chevron',16)}</button></header>${chart}<div class="segmented trend-ranges" aria-label="${title}图表范围">${([7,30,90] as const).map(n=>`<button type="button" ${kind==='weight'?`data-range="${n}"`:`data-recovery-days="${n}" data-range-kind="${kind}"`} aria-pressed="${state.range===n}" class="${state.range===n?'active':''}">${n}天</button>`).join('')}</div><div class="trend-coverage"><span>${rangeLabel}</span>${coverage}</div>${factualHelp}<div class="trend-actions">${actions}</div></section>`
}
/** Legacy empty copy helper; approved v0.3 callers retain their complete plotting frame. */
export function trendEmptyHtml(title:string):string {return `<p data-empty="true">此范围暂无${title}记录</p>`}

export function trainingModuleHtml(title:string,kind:'dumbbell'|'activity'|'leaf',historyId:string,body:string):string {
 return `<div class="training-card"><header class="module-header"><div class="module-title"><span class="module-icon">${icon(kind,20)}</span><h2>${title}</h2></div><button type="button" class="text-btn module-history" id="${historyId}">历史记录 ${icon('chevron',16)}</button></header>${body}</div>`
}

export function trendDateLabel(date:string,night=false):string { return `${Number(date.slice(0,4))}年${Number(date.slice(5,7))}月${Number(date.slice(8))}日${night?'晚':''}` }

/** A saved fact selects its own date after the transaction, then refreshes only its module. */
export function selectRecordedTrend(kind:keyof typeof trendStates, selected:string):void {
  trendStates[kind].selected=selected
  document.dispatchEvent(new CustomEvent('fitlog-trend-recorded',{detail:kind}))
}
export function observeTrendRefresh(kind:keyof typeof trendStates, refresh:()=>void):()=>void {
  const saved=(event:Event)=>{if((event as CustomEvent).detail===kind)refresh()}
  const visible=()=>{if(document.visibilityState==='visible')refresh()}
  let timer:number
  const midnight=()=>{const next=new Date();next.setHours(24,0,0,0);timer=window.setTimeout(()=>{refresh();midnight()},next.getTime()-Date.now()+20)}
  midnight();document.addEventListener('fitlog-trend-recorded',saved);document.addEventListener('visibilitychange',visible)
  return()=>{clearTimeout(timer);document.removeEventListener('fitlog-trend-recorded',saved);document.removeEventListener('visibilitychange',visible)}
}

/** Hidden intrinsic sizers reserve real 90-day readouts, avoiding range-dependent wrapping. */
export function trendSelectionHtml(value:string,date:string,values:string[],dates:string[],weight=false):string {
 const longest=(xs:string[])=>xs.reduce((a,b)=>b.replace(/<[^>]*>/g,'').length>a.replace(/<[^>]*>/g,'').length?b:a,'')
 return `<div class="chart-selection" role="status" aria-live="polite"><strong ${weight?'data-weight-chart-value':'data-chart-value'}>${value}</strong><span ${date.startsWith('此范围暂无')?'data-empty="true"':''} ${weight?'data-weight-chart-date':'data-chart-date'}>${date}</span><div class="trend-slot-sizer trend-value-sizer" aria-hidden="true">${longest([...values,'未记录'])}</div><div class="trend-slot-sizer trend-date-sizer" aria-hidden="true">${longest([...dates,'此范围暂无已完成记录'])}</div></div>`
}
