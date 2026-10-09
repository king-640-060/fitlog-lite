import { liveQuery } from 'dexie'
import { Chart } from 'chart.js'
import { db } from '../db/database'
import type { WeightLog } from '../db/types'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { formatNumber } from '../utils/nutrition'
import { icon } from './icons'
import { showWeightHistory } from './weightHistory'
import type { RecoveryUi } from './recovery'
export function mountWeightTrend(root:HTMLElement,ui:RecoveryUi,options:{date:string;range:'30'|'90'|'all';rangeChanged:(range:'30'|'90'|'all')=>void;record:(date:string,value?:number)=>void}):()=>void {
  let weights:WeightLog[]=[],range=options.range,selectedId:string|undefined,chart:Chart<'line',number[],string>|undefined,disposed=false
  const draw=()=>{
    if(disposed||!root.isConnected)return
    const scroll=root.querySelector<HTMLElement>('.weight-chart-scroll')?.scrollLeft??0,focused=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?document.activeElement:undefined,focusId=focused?.id
    const today=getLocalDateString(),selectedWeight=weights.find(w=>w.date===options.date),latest=weights[0],hero=options.date===today?selectedWeight??latest:selectedWeight
    const month=weights.filter(w=>w.date>=shiftLocalDate(today,-29)),delta=month.length>1&&latest?latest.weightKg-month.at(-1)!.weightKg:undefined
    const actual=weights.filter(w=>range==='all'||w.date>=shiftLocalDate(today,1-Number(range))).slice().reverse()
    let selected=actual.find(w=>w.id===selectedId)??actual.at(-1);selectedId=selected?.id
    chart?.destroy();chart=undefined
    root.innerHTML=`<section class="weight-hero"><div class="section-head"><p>${hero?options.date===today?(selectedWeight?'今日体重':'最新体重'):`${ui.esc(options.date)} 体重`:'体重记录'}</p><button type="button" class="text-btn" id="weight-history-open">历史记录 ${icon('chevron',16)}</button></div>${hero?`<div class="hero-number"><strong>${formatNumber(hero.weightKg)}</strong><span>kg</span></div>${options.date===today?`<span class="weight-change">${delta===undefined?'记录更多数据后显示30天变化':`${delta>0?'+':''}${formatNumber(delta)} kg · 30天`}</span>`:''}`:'<div class="empty-inline">这一天还没有体重记录</div>'}<button class="primary record-weight" id="record-weight">${icon(selectedWeight?'edit':'plus',18)} ${selectedWeight?'修改体重':'记录体重'}</button></section><section class="chart-card weight-trend"><div class="section-head"><div><h2>体重趋势</h2><span>${range==='all'?'全部记录':`最近 ${range} 天`}</span></div></div>${selected?`<div class="chart-selection" role="status" aria-live="polite"><strong data-weight-chart-value>${formatNumber(selected.weightKg)} kg</strong><span data-weight-chart-date>${selected.date}</span></div><div class="weight-chart-scroll" role="region" aria-label="体重趋势，左右滚动查看日期"><div class="weight-chart-canvas" style="min-width:${Math.max(280,actual.length*44+48)/16}rem"><canvas id="weight-chart" tabindex="0" role="img" aria-label="体重实际记录，方向键选择日期"></canvas></div></div>`:'<p class="recovery-note">此范围暂无体重记录</p>'}<div class="segmented" aria-label="体重图表范围">${(['30','90','all'] as const).map(n=>`<button type="button" data-range="${n}" class="${range===n?'active':''}" aria-pressed="${range===n}">${n==='all'?'全部':n+'天'}</button>`).join('')}</div></section>`
    root.querySelector('#weight-history-open')!.addEventListener('click',()=>showWeightHistory(ui))
    root.querySelector('#record-weight')!.addEventListener('click',()=>options.record(options.date,selectedWeight?.weightKg))
    root.querySelectorAll<HTMLButtonElement>('[data-range]').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.range as typeof range;selectedId=undefined;options.rangeChanged(range);draw()}))
    if(selected){
      const canvas=root.querySelector<HTMLCanvasElement>('#weight-chart')!,styles=getComputedStyle(document.documentElement),color=styles.getPropertyValue('--weight').trim()||styles.getPropertyValue('--accent-strong').trim(),muted=styles.getPropertyValue('--text-secondary').trim()
      const select=(index:number,ensureVisible=false)=>{selected=actual[index]!;selectedId=selected.id;root.querySelector('[data-weight-chart-value]')!.textContent=`${formatNumber(selected.weightKg)} kg`;root.querySelector('[data-weight-chart-date]')!.textContent=selected.date;canvas.setAttribute('aria-label',`${selected.date}，${formatNumber(selected.weightKg)} kg，方向键切换`);chart!.data.datasets[0]!.pointRadius=actual.map(w=>w.id===selectedId?5:3);chart!.update('none');if(ensureVisible){const x=chart!.getDatasetMeta(0).data[index]!.x,region=root.querySelector<HTMLElement>('.weight-chart-scroll')!;region.scrollLeft=x-region.clientWidth/2}}
      chart=new Chart(canvas,{type:'line',data:{labels:actual.map(w=>w.date),datasets:[{data:actual.map(w=>w.weightKg),borderColor:color,pointBackgroundColor:color,pointRadius:actual.map(w=>w.id===selectedId?5:3),pointHitRadius:22,borderWidth:2,fill:false,tension:.2}]},options:{responsive:true,maintainAspectRatio:false,animation:false,onClick:(_e,items)=>{if(items[0])select(items[0].index)},interaction:{intersect:true,mode:'nearest'},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},ticks:{color:muted,maxTicksLimit:7}},y:{grid:{color:styles.getPropertyValue('--divider').trim()},ticks:{color:muted,maxTicksLimit:5}}}}})
      canvas.addEventListener('keydown',e=>{const i=actual.findIndex(w=>w.id===selectedId),next=e.key==='ArrowLeft'?Math.max(0,i-1):e.key==='ArrowRight'?Math.min(actual.length-1,i+1):e.key==='Home'?0:e.key==='End'?actual.length-1:undefined;if(next!==undefined){e.preventDefault();select(next,true)}})
      select(actual.findIndex(w=>w.id===selectedId));root.querySelector<HTMLElement>('.weight-chart-scroll')!.scrollLeft=scroll||Math.max(0,canvas.clientWidth-root.clientWidth)
    }
    if(focusId)root.querySelector<HTMLElement>(`#${CSS.escape(focusId)}`)?.focus({preventScroll:true})
  }
  const sub=liveQuery(()=>db.weights.orderBy('date').reverse().toArray()).subscribe({next:rows=>{weights=rows;draw()},error:ui.fail})
  return()=>{disposed=true;sub.unsubscribe();chart?.destroy()}
}
