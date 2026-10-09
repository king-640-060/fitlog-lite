import { icon } from './icons'
export type TrendRange = 7 | 30 | 90
export interface TrendState { range:TrendRange; selected?:string; scroll:number; initialized?:boolean }
export const createTrendState = ():TrendState => ({range:30,scroll:0})
export const trendStates = {weight:createTrendState(),sleep:createTrendState(),water:createTrendState()}
export function trendModuleHtml(kind:'weight'|'sleep'|'water',chart:string,state:TrendState,actions:string):string {
  const title={weight:'体重',sleep:'睡眠',water:'饮水'}[kind]
  return `<section class="trend-module ${kind==='weight'?'weight-trend':'recovery-trend'}" data-trend-module="${kind}"><header class="module-header"><div class="module-title"><span class="module-icon">${icon(kind==='weight'?'scale':kind==='sleep'?'moon':'water',20)}</span><h2>${title}</h2></div><button type="button" class="text-btn module-history" ${kind==='weight'?'id="weight-history-open"':`data-${kind}-history`}>历史记录 ${icon('chevron',16)}</button></header>${chart}<div class="segmented trend-ranges" aria-label="${title}图表范围">${([7,30,90] as const).map(n=>`<button type="button" ${kind==='weight'?`data-range="${n}"`:`data-recovery-days="${n}" data-range-kind="${kind}"`} aria-pressed="${state.range===n}" class="${state.range===n?'active':''}">${n}天</button>`).join('')}</div><div class="trend-actions">${actions}</div></section>`
}
/** Empty ranges have no invented zero and reserve no chart canvas. */
export function trendEmptyHtml(title:string):string {return `<p class="trend-empty recovery-chart-empty">此范围暂无${title}记录</p>`}

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
