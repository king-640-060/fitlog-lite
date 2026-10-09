import { icon } from './icons'
import { animateMotion } from './motion'
import { mountDatePicker } from './datePicker'
export interface HistoryUi {openModal(title:string,html:string,large?:boolean):HTMLDialogElement;esc(value:unknown):string}
export function openHistorySheet(ui:HistoryUi,title:string,html:string):HTMLDialogElement {const dialog=ui.openModal(title,html);dialog.classList.add('record-history-sheet');return dialog}
export function historyRowHtml(id:string,title:string,meta:string,attributes:string,esc:(v:unknown)=>string,viewHtml=''):string {
  return `<article aria-label="${esc(title)}" class="record-history-row recovery-history-row" data-history-id="${esc(id)}"><div class="record-history-main"><strong>${esc(title)}</strong><span class="record-history-meta">${esc(meta)}</span></div><div class="record-history-actions">${viewHtml}<button type="button" class="text-btn" data-history-edit="${esc(id)}" ${attributes}>编辑</button><button type="button" class="text-btn danger" data-history-delete="${esc(id)}">删除</button></div></article>`
}
export function historyEmptyHtml(copy:string):string {return `<p class="record-history-empty recovery-note">${copy}</p>`}
export function updateHistoryList(host:HTMLElement,html:string):void {
  if(host.innerHTML===html)return
  const body=host.closest<HTMLElement>('.modal-body'),scroll=body?.scrollTop,focused=document.activeElement instanceof HTMLElement&&host.contains(document.activeElement)?document.activeElement:undefined
  const id=focused?.closest<HTMLElement>('[data-history-id]')?.dataset.historyId,action=focused?.hasAttribute('data-history-delete')?'data-history-delete':'data-history-edit'
  const template=document.createElement('div');template.innerHTML=html
  const old=new Map([...host.children].map(e=>[e.getAttribute('data-history-id'),e]))
  const nodes=[...template.children].map(e=>{const retained=old.get(e.getAttribute('data-history-id'));return retained?.outerHTML===e.outerHTML?retained:e});host.replaceChildren(...nodes)
  if(body&&scroll!==undefined)body.scrollTop=scroll
  if(focused&&id){const next=host.querySelector<HTMLElement>(`[${action}="${CSS.escape(id)}"]`)??host.querySelector<HTMLElement>('button')??body?.parentElement?.querySelector<HTMLElement>('.modal-head h2');next?.focus({preventScroll:true})}
}
const subviews=new WeakMap<HTMLDialogElement,{back:HTMLButtonElement;stack:Array<(()=>void)&{cleanup?:()=>void}>}>()
export function historySubview(dialog:HTMLDialogElement,title:string,html:string,onLeave?:()=>void):()=>void {
  const body=dialog.querySelector<HTMLElement>('.modal-body')!,heading=dialog.querySelector<HTMLElement>('.modal-head h2')!,oldTitle=heading.textContent!,scroll=body.scrollTop,nodes=[...body.childNodes],variant=dialog.dataset.sheetVariant,focused=document.activeElement instanceof HTMLElement?document.activeElement:undefined
  let state=subviews.get(dialog)
  if(!state){const back=document.createElement('button');back.type='button';back.className='icon-btn quiet';back.innerHTML=icon('chevron',18).replace('<svg','<svg style="transform:rotate(180deg)"');back.dataset.recoveryBack='';back.dataset.historyBack='';state={back,stack:[]};subviews.set(dialog,state);back.addEventListener('click',()=>state!.stack.at(-1)?.());dialog.addEventListener('cancel',e=>{if(state!.stack.length){e.preventDefault();state!.stack.at(-1)!()}});dialog.addEventListener('close',()=>{state!.stack.forEach(route=>route.cleanup?.());state!.stack.length=0;subviews.delete(dialog)},{once:true})}
  const previousLabel=state.back.getAttribute('aria-label');state.back.setAttribute('aria-label',`返回${oldTitle}`);heading.before(state.back)
  const restore=Object.assign(()=>{if(!dialog.open||state!.stack.at(-1)!==restore)return;state!.stack.pop();onLeave?.();body.replaceChildren(...nodes);heading.textContent=oldTitle;dialog.dataset.sheetVariant=variant;dialog.style.height='';body.scrollTop=scroll;if(state!.stack.length)state!.back.setAttribute('aria-label',previousLabel!);else state!.back.remove();animateMotion(body,'back');if(focused?.isConnected)focused.focus({preventScroll:true});else heading.focus({preventScroll:true})},{cleanup:onLeave})
  state.stack.push(restore);body.innerHTML=html;body.scrollTop=0;heading.textContent=title;dialog.style.height='';dialog.dataset.sheetVariant=html.includes('<form')?'form':'content';animateMotion(body,'subview');heading.focus({preventScroll:true});return restore
}
export function historyDatePicker(dialog:HTMLDialogElement,title:string,date:string,commit:(date:string)=>void):void {
  let picker:ReturnType<typeof mountDatePicker>|undefined
  const restore=historySubview(dialog,title,'<div data-recovery-date-picker></div>',()=>picker?.destroy())
  picker=mountDatePicker(dialog.querySelector<HTMLElement>('[data-recovery-date-picker]')!,{value:date,onConfirm:value=>{restore();commit(value!)},onCancel:restore})
}
