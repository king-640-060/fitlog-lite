import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { WeightLog } from '../db/types'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { showWeightHistory } from './weightHistory'
import { mountWeightChart, weightChartHtml } from './weightChart'
import { trendModuleHtml, observeTrendRefresh, type TrendState } from './trendModule'
import type { RecoveryUi } from './recovery'
export function mountWeightTrend(root:HTMLElement,ui:RecoveryUi,options:{state:TrendState;record:(date:string,value?:number)=>void}):()=>void {
 let weights:WeightLog[]=[],disposed=false,chartDispose:(()=>void)|undefined,subscription:{unsubscribe():void}|undefined;const state=options.state
 const draw=()=>{
  if(disposed||!root.isConnected)return
  const scroll=root.querySelector<HTMLElement>('.weight-chart-scroll');if(scroll&&state.initialized)state.scroll=scroll.scrollLeft
  const focus=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?document.activeElement:undefined,key=focus?.id,range=focus?.dataset.range
  chartDispose?.();const today=getLocalDateString(),actual=weights.filter(w=>Number.isFinite(w.weightKg)&&w.weightKg>0&&w.date>=shiftLocalDate(today,1-state.range)&&w.date<=today),todayWeight=weights.filter(w=>w.date===today).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]
  const selected=actual.find(w=>w.id===state.selected)??actual.at(-1);state.selected=selected?.id
  root.innerHTML=trendModuleHtml('weight',weightChartHtml(actual,state.selected,'weight-chart',{start:shiftLocalDate(today,1-state.range),end:today}),state,`<button type="button" class="primary" id="record-weight">${todayWeight?'修改今日体重':'记录体重'}</button>`)
  root.querySelector('#weight-history-open')!.addEventListener('click',()=>showWeightHistory(ui))
  root.querySelector('#record-weight')!.addEventListener('click',()=>options.record(getLocalDateString(),todayWeight?.weightKg))
  root.querySelectorAll<HTMLButtonElement>('[data-range]').forEach(b=>b.addEventListener('click',()=>{state.range=Number(b.dataset.range) as TrendState['range'];delete state.selected;state.scroll=0;state.initialized=false;subscribe()}))
  chartDispose=mountWeightChart(root,actual,state.selected,id=>{state.selected=id},{start:shiftLocalDate(today,1-state.range),end:today})
  const nextScroll=root.querySelector<HTMLElement>('.weight-chart-scroll');if(nextScroll){nextScroll.scrollLeft=state.initialized?state.scroll:nextScroll.scrollLeft;state.scroll=nextScroll.scrollLeft;state.initialized=true;nextScroll.addEventListener('scroll',()=>{state.scroll=nextScroll.scrollLeft},{passive:true})}
  if(key)root.querySelector<HTMLElement>(`#${CSS.escape(key)}`)?.focus({preventScroll:true});else if(range)root.querySelector<HTMLElement>(`[data-range="${range}"]`)?.focus({preventScroll:true})
 }
 const subscribe=()=>{subscription?.unsubscribe();const today=getLocalDateString(),range=state.range;subscription=liveQuery(()=>db.weights.where('date').between(shiftLocalDate(today,1-range),today,true,true).sortBy('date')).subscribe({next:rows=>{if(disposed||state.range!==range)return;weights=rows;draw()},error:ui.fail})};subscribe()
 const stopRefresh=observeTrendRefresh('weight',subscribe)
 return()=>{disposed=true;subscription?.unsubscribe();chartDispose?.();stopRefresh()}
}
