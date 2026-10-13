import { liveQuery } from 'dexie'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { readHistoryPage, historyRecordDate, type HistoryKind, type HistoryRecord } from '../services/recordHistoryService'
import { historyDatePicker, updateHistoryList, historyEmptyHtml } from './recordHistory'
export function pagedHistoryControls(kind: HistoryKind): string {
  return `<div class="record-history-filters"><label>范围<select data-history-range><option value="7">7 天</option><option value="30" selected>30 天</option><option value="90">90 天</option></select></label><button type="button" class="text-btn" data-history-date ${kind==='water'?'data-water-date':''}>按日期定位</button><button type="button" class="text-btn" data-history-recent>最近记录</button></div><p class="recovery-note" data-history-scope></p>${kind==='water'?'<p class="recovery-note" data-water-history-total></p>':''}<div data-${kind}-history-list></div><button type="button" class="secondary full-btn" data-history-more>继续加载</button><p role="alert" data-history-error hidden></p>`
}
export function mountPagedHistory(dialog: HTMLDialogElement, kind: HistoryKind, esc: (value:unknown)=>string, renderRow: (row:HistoryRecord)=>string, changed:(rows:HistoryRecord[])=>void, fail:(error:unknown)=>void):()=>void {
  const host=dialog.querySelector<HTMLElement>(`[data-${kind}-history-list]`)!,range=dialog.querySelector<HTMLSelectElement>('[data-history-range]')!,date=dialog.querySelector<HTMLButtonElement>('[data-history-date]')!,scope=dialog.querySelector<HTMLElement>('[data-history-scope]')!,more=dialog.querySelector<HTMLButtonElement>('[data-history-more]')!,waterTotal=dialog.querySelector<HTMLElement>('[data-water-history-total]')
  let end=getLocalDateString(),days=30,limit=25,subscription:{unsubscribe():void}|undefined,hasMore=false,start='',alive=true
  const events=new AbortController()
  const expanded=new Set<string>();let initialized=false
  let previousDates=new Map<string,string>(),previousGroups=new Set<string>()
  host.addEventListener('toggle',event=>{const group=event.target as HTMLDetailsElement;if(!group.matches('details[data-history-date]'))return;if(group.open)expanded.add(group.dataset.historyDate!);else expanded.delete(group.dataset.historyDate!)},{capture:true,signal:events.signal})
  const subscribe=()=>{subscription?.unsubscribe();const selected=[end,days,limit].join('|');subscription=liveQuery(()=>readHistoryPage(kind,end,days,limit)).subscribe({next:page=>{
    if(!alive||selected!==[end,days,limit].join('|'))return
    hasMore=page.more;start=page.start;changed(page.rows)
    const groups=new Map<string,HistoryRecord[]>();for(const row of page.rows){const key=historyRecordDate(kind,row);groups.set(key,[...(groups.get(key)??[]),row])}
    const oldExpanded=new Set([...expanded].filter(key=>previousGroups.has(key)))
    for(const row of page.rows){const old=previousDates.get(row.id),next=historyRecordDate(kind,row);if(old&&old!==next&&oldExpanded.has(old))expanded.add(next)}
    for(const key of expanded)if(!groups.has(key))expanded.delete(key)
    if(!initialized||!previousGroups.size||(oldExpanded.size&&!expanded.size)){const latest=groups.keys().next().value;if(latest)expanded.add(latest);initialized=true}
    previousDates=new Map(page.rows.map(row=>[row.id,historyRecordDate(kind,row)]));previousGroups=new Set(groups.keys())
    const opened=new Set([...host.querySelectorAll<HTMLDetailsElement>('details[open]')].map(e=>e.dataset.historyDate!));for(const key of opened)expanded.add(key)
    updateHistoryList(host,[...groups].map(([key,rows])=>`<details class="history-date-group" data-history-id="${esc(key)}" data-history-date="${esc(key)}" ${expanded.has(key)?'open':''}><summary><strong>${esc(key)}</strong><span>${rows.length} 条已加载</span></summary><div>${rows.map(renderRow).join('')}</div></details>`).join('')||historyEmptyHtml('这个日期范围暂无记录，可查看更早记录。'))
    scope.textContent=`${page.start} — ${page.end} · 已加载 ${page.rows.length} 条${page.more?'，还有更多':''}；折叠和分页不会删除记录。`
    if(kind==='water'&&waterTotal)waterTotal.textContent=`已加载记录共 ${page.rows.reduce((sum,row)=>sum+('amountMl' in row?row.amountMl:0),0)} ml${page.more?'（非范围全部）':''}`
    date.textContent=`按日期定位 · ${end}`;more.textContent=page.more?'继续加载（下 25 条）':`查看更早 ${days} 天`;more.disabled=false
  },error:error=>{more.disabled=false;fail(error)}})}
  range.addEventListener('change',()=>{days=Number(range.value);limit=25;initialized=false;expanded.clear();subscribe()})
  more.addEventListener('click',()=>{more.disabled=true;if(hasMore)limit+=25;else{end=shiftLocalDate(start,-1);limit=25;initialized=false;expanded.clear()}subscribe()})
  date.addEventListener('click',()=>historyDatePicker(dialog,'定位历史日期',end,value=>{end=value;limit=25;initialized=false;expanded.clear();subscribe()}))
  dialog.querySelector('[data-history-recent]')!.addEventListener('click',()=>{end=getLocalDateString();limit=25;initialized=false;expanded.clear();subscribe()})
  subscribe();const dispose=()=>{alive=false;events.abort();subscription?.unsubscribe()};dialog.addEventListener('close',dispose,{once:true});return dispose
}
