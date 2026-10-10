import { icon } from './icons'
import { animateMotion } from './motion'
export interface ActionToastOptions { tone?:'normal'|'error'; action?:{label:string;run:()=>Promise<void>}; duration?:number; className?:string }
let current:{element:HTMLElement;dispose:()=>void}|undefined
/** Shared one-at-a-time feedback. A manual popover joins the top layer without stealing focus. */
export function showActionToast(message:string,options:ActionToastOptions={}):void {
  current?.dispose();document.querySelector('.toast')?.remove()
  const element=document.createElement('div');element.className=`toast action-toast ${options.tone==='error'?'toast-error':''} ${options.className??''}`.trim();element.setAttribute('role','status');element.setAttribute('popover','manual')
  element.innerHTML=icon(options.tone==='error'?'x':'check',18)
  const copy=document.createElement('span');copy.textContent=message;element.append(copy)
  const events=new AbortController()
  const place=()=>{
    if(!element.isConnected)return
    // Join the active modal's subtree so Undo remains interactive, not modal-inert.
    const dialog=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
    const owner=dialog??document.body
    if(element.parentElement!==owner)owner.append(element)
    if(typeof element.showPopover==='function'&&!element.matches(':popover-open'))element.showPopover()
    const style=getComputedStyle(document.documentElement),keyboard=document.body.classList.contains('keyboard-open')
    const top=(keyboard?parseFloat(style.getPropertyValue('--sheet-offset-top'))||0:parseFloat(style.getPropertyValue('--safe-area-top'))||0)+8
    const nav=document.querySelector<HTMLElement>('.bottom-nav')?.getBoundingClientRect()
    const bottom=keyboard?top-8+(parseFloat(style.getPropertyValue('--sheet-viewport-height'))||innerHeight)-8:Math.min(innerHeight-8,nav?.height?nav.top-8:innerHeight-8)
    const bounds=element.getBoundingClientRect(),blocked:Array<[number,number]>=[]
    const controls=(dialog??document).querySelectorAll<HTMLElement>(dialog?'button,input,textarea':'.water-card,button,input,textarea')
    for(const control of controls){if(control.closest('.action-toast'))continue;const r=control.getBoundingClientRect();if(r.width&&r.height&&r.right>bounds.left&&r.left<bounds.right&&r.bottom>top&&r.top<bottom)blocked.push([Math.max(top,r.top-32),Math.min(bottom,r.bottom+32)])}
    blocked.sort((a,b)=>a[0]-b[0]);let cursor=top;const gaps:Array<[number,number]>=[]
    for(const [a,b]of blocked){if(a>cursor)gaps.push([cursor,a]);cursor=Math.max(cursor,b)}if(cursor<bottom)gaps.push([cursor,bottom])
    const gap=gaps.filter(([a,b])=>b-a>=bounds.height).at(-1)
    element.style.top=`${gap?gap[1]-bounds.height:top}px`;element.style.bottom='auto'
  }
  document.addEventListener('fitlog-viewport-change',place,{signal:events.signal})
  const surfaceChanged=()=>{
    const parent=element.closest<HTMLDialogElement>('dialog')
    if(parent&&!parent.open)document.body.append(element)
    queueMicrotask(place)
  }
  document.addEventListener('focusin',surfaceChanged,{signal:events.signal})
  document.addEventListener('close',surfaceChanged,{capture:true,signal:events.signal})
  document.addEventListener('animationend',event=>{if((event.target as Element).matches('dialog'))place()},{capture:true,signal:events.signal})
  document.addEventListener('scroll',place,{capture:true,passive:true,signal:events.signal})
  let timer:ReturnType<typeof setTimeout>|undefined,busy=false,disposed=false
  const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(timer);events.abort();element.remove();if(current?.element===element)current=undefined}
  if(options.action){const button=document.createElement('button');button.type='button';button.className='text-btn';button.textContent=options.action.label;element.append(button);button.addEventListener('click',async()=>{
    if(busy||disposed)return;busy=true;button.disabled=true;clearTimeout(timer)
    try{await options.action!.run();dispose()}catch(error){if(disposed)return;copy.textContent=error instanceof Error?error.message:'撤销未完成，请重试';element.classList.add('toast-error');button.disabled=false;busy=false;place()}
  })}
  document.body.append(element);current={element,dispose}
  if(typeof element.showPopover==='function')element.showPopover()
  place()
  timer=setTimeout(()=>{if(disposed)return;const a=animateMotion(element,'toast-exit');if(a)void a.finished.then(dispose,dispose);else dispose()},options.duration??1900)
}
