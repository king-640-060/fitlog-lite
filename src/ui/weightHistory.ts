import { pagedHistoryControls, mountPagedHistory } from './pagedHistory'
import { weightChartHtml, mountWeightChart } from './weightChart'
import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { WeightLog } from '../db/types'
import { editWeight, deleteWeight } from '../services/weightService'
import { formatNumber } from '../utils/nutrition'
import { openHistorySheet, historyRowHtml, historySubview } from './recordHistory'
import type { RecoveryUi } from './recovery'
export function showWeightHistory(ui:RecoveryUi):void {
  const dialog=openHistorySheet(ui,'体重记录',`<button type="button" class="text-btn" data-weight-all>查看全部趋势</button>${pagedHistoryControls('weight')}`),list=dialog.querySelector<HTMLElement>('[data-weight-history-list]')!
  let current:WeightLog[]=[],allRows:WeightLog[]=[],allHost:HTMLElement|undefined,allDispose:(()=>void)|undefined,selected:string|undefined
  const drawAll=()=>{if(!allHost)return;const left=allHost.querySelector<HTMLElement>('.weight-chart-scroll')?.scrollLeft;allDispose?.();const actual=allRows.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id));allHost.innerHTML=weightChartHtml(actual,selected,"weight-all-chart");allDispose=mountWeightChart(allHost,actual,selected,id=>{selected=id});const region=allHost.querySelector<HTMLElement>('.weight-chart-scroll');if(region)region.scrollLeft=left??region.scrollLeft}
  dialog.querySelector('[data-weight-all]')!.addEventListener('click',()=>{historySubview(dialog,'全部体重趋势','<div data-weight-all-chart></div>',()=>{allDispose?.();allSub?.unsubscribe();allHost=undefined});allHost=dialog.querySelector<HTMLElement>('[data-weight-all-chart]')!;allSub=liveQuery(()=>db.weights.orderBy('date').reverse().toArray()).subscribe({next:rows=>{allRows=rows;drawAll()},error:ui.fail})})
  const stop=mountPagedHistory(dialog,'weight',ui.esc,row=>{const w=row as WeightLog;return historyRowHtml(w.id,`${formatNumber(w.weightKg)} kg`,`${w.date} · ${new Date(w.updatedAt).toLocaleTimeString('zh-CN')}`,`data-edit-weight="${ui.esc(w.id)}"`,ui.esc)},rows=>{current=rows as WeightLog[]},ui.fail)
  let allSub:{unsubscribe():void}|undefined

  list.addEventListener('click',async event=>{const button=(event.target as Element).closest<HTMLElement>('button');if(!button)return;const record=current.find(w=>w.id===(button.dataset.historyEdit??button.dataset.historyDelete));if(!record)return
    if(button.hasAttribute('data-history-edit')){
      const back=historySubview(dialog,'编辑体重',`<form class="form weight-sheet-form" data-weight-history-form><p>${ui.esc(record.date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" required value="${record.weightKg}"><b>kg</b></label><p role="alert" data-history-error hidden></p><button type="submit" class="primary">保存</button></form>`),form=dialog.querySelector<HTMLFormElement>('[data-weight-history-form]')!;let busy=false
      form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;submit.disabled=true;submit.setAttribute('aria-busy','true');try{await editWeight(record.id,new FormData(form).get('weight'),db,JSON.stringify(record));back()}catch(error){const message=form.querySelector<HTMLElement>('[data-history-error]')!;message.hidden=false;message.textContent=error instanceof Error?error.message:'保存失败，请重试'}finally{busy=false;submit.disabled=false;submit.removeAttribute('aria-busy')}})
    }
    if(button.hasAttribute('data-history-delete')&&await ui.confirm('删除体重记录？',`将删除 ${record.date} 的 ${formatNumber(record.weightKg)} kg 记录。仅影响这个记录 ID，无法撤销。`))try{await deleteWeight(record.id,db,JSON.stringify(record))}catch(error){ui.fail(error)}
  })
  dialog.addEventListener('close',()=>{stop();allSub?.unsubscribe();allDispose?.()},{once:true})
}
