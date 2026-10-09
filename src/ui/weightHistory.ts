import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { WeightLog } from '../db/types'
import { editWeight, deleteWeight } from '../services/weightService'
import { formatNumber } from '../utils/nutrition'
import { openHistorySheet, historyRowHtml, historyEmptyHtml, updateHistoryList, historySubview } from './recordHistory'
import type { RecoveryUi } from './recovery'
export function showWeightHistory(ui:RecoveryUi):void {
  const dialog=openHistorySheet(ui,'体重记录','<div data-weight-history-list></div>'),list=dialog.querySelector<HTMLElement>('[data-weight-history-list]')!
  let current:WeightLog[]=[]
  const sub=liveQuery(()=>db.weights.orderBy('date').reverse().toArray()).subscribe({next:rows=>{if(!dialog.open)return;current=rows;updateHistoryList(list,rows.map(w=>historyRowHtml(w.id,`${formatNumber(w.weightKg)} kg`,new Date(w.date+'T12:00:00').toLocaleDateString('zh-CN'),`data-edit-weight="${ui.esc(w.id)}"`,ui.esc)).join('')||historyEmptyHtml('还没有体重记录。'))},error:ui.fail})
  list.addEventListener('click',async event=>{const button=(event.target as Element).closest<HTMLElement>('button');if(!button)return;const record=current.find(w=>w.id===(button.dataset.historyEdit??button.dataset.historyDelete));if(!record)return
    if(button.hasAttribute('data-history-edit')){
      const back=historySubview(dialog,'编辑体重',`<form class="form weight-sheet-form" data-weight-history-form><p>${ui.esc(record.date)}</p><label class="weight-input"><span class="sr-only">体重（千克）</span><input name="weight" type="number" inputmode="decimal" min="0.1" step="0.1" required value="${record.weightKg}"><b>kg</b></label><p role="alert" data-history-error hidden></p><button type="submit" class="primary">保存</button></form>`),form=dialog.querySelector<HTMLFormElement>('[data-weight-history-form]')!;let busy=false
      form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;submit.disabled=true;submit.setAttribute('aria-busy','true');try{await editWeight(record.id,new FormData(form).get('weight'));back()}catch(error){const message=form.querySelector<HTMLElement>('[data-history-error]')!;message.hidden=false;message.textContent=error instanceof Error?error.message:'保存失败，请重试'}finally{busy=false;submit.disabled=false;submit.removeAttribute('aria-busy')}})
    }
    if(button.hasAttribute('data-history-delete')&&await ui.confirm('删除体重记录？','仅删除这一条记录，删除后无法撤销。'))try{await deleteWeight(record.id)}catch(error){ui.fail(error)}
  })
  dialog.addEventListener('close',()=>sub.unsubscribe(),{once:true})
}
