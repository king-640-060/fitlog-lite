import { adjacentSwipe, bindHorizontalSwipe, shouldCommitSwipe, swipeControl } from './horizontalNavigation'
export interface DeckPage { element: HTMLElement; activate?(): void; dispose(): void }
/** One current + one bounded readonly neighbor. Nested decks arbitrate by closest owner. */
export function createLocalDeck(options: {
  root: HTMLElement; nav: HTMLElement; stage: HTMLElement; keys: readonly string[]; active: string
  prepare(key: string, signal: AbortSignal): Promise<DeckPage>
  selected(key: string): void; fail(error: unknown): void; initial: DeckPage
  buttonAttribute: string; scroll?: boolean; modal?: boolean; positions?: Map<string,number>
}) {
  const {root,nav,stage,keys} = options, events = new AbortController(), signal = events.signal
  root.dataset.localDeck='';stage.classList.add('local-deck-stage')
  let current=options.initial,index=keys.indexOf(options.active),neighbor:DeckPage|undefined,target=index,revision=0,frame=0,settling=false,disposed=false,read:AbortController|undefined,dx=0,ended=false,requested:string|undefined,resolveTween:(()=>void)|undefined
  const positions=options.positions??new Map<string,number>(),reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const buttons=[...nav.querySelectorAll<HTMLButtonElement>(`[${options.buttonAttribute}]`)]
  const indicator=document.createElement('span');indicator.className='local-deck-indicator';indicator.setAttribute('aria-hidden','true');nav.classList.add('local-deck-nav');nav.prepend(indicator)
  const placeIndicator=(fraction=index)=>{const low=Math.floor(fraction),high=Math.ceil(fraction),a=buttons[low],b=buttons[high];if(!a||!b)return;const f=fraction-low;Object.assign(indicator.style,{left:`${a.offsetLeft+(b.offsetLeft-a.offsetLeft)*f}px`,top:`${a.offsetTop+(b.offsetTop-a.offsetTop)*f}px`,width:`${a.offsetWidth+(b.offsetWidth-a.offsetWidth)*f}px`,height:`${a.offsetHeight+(b.offsetHeight-a.offsetHeight)*f}px`})}
  const select=()=>{buttons.forEach(b=>{const yes=b.getAttribute(options.buttonAttribute)===keys[index];b.classList.toggle('active',yes);b.setAttribute(b.hasAttribute('aria-selected')?'aria-selected':'aria-pressed',String(yes))});placeIndicator()}
  const clean=()=>{cancelAnimationFrame(frame);frame=0;resolveTween?.();resolveTween=undefined;read?.abort();read=undefined;neighbor?.dispose();neighbor?.element.remove();neighbor=undefined;current.element.style.removeProperty('transform');current.element.inert=false;stage.removeAttribute('data-dragging');settling=false}
  const cancel=()=>{revision++;clean();select()}
  const draw=(d:number)=>{if(!neighbor)return;const w=stage.clientWidth;if(!w)return;d=Math.max(-w,Math.min(w,d));stage.dataset.dragging='';current.element.style.transform=`translate3d(${d}px,0,0)`;neighbor.element.style.transform=`translate3d(${d+(target>index?1:-1)*w}px,0,0)`;current.element.inert=true;placeIndicator(index+(target-index)*Math.abs(d)/w)}
  const prepare=async(next:number,token:number)=>{
    read?.abort();neighbor?.dispose();neighbor?.element.remove();neighbor=undefined
    const request=new AbortController();read=request;target=next
    let page:DeckPage
    try { page=await options.prepare(keys[next]!,request.signal) } catch(error) { if(request.signal.aborted||token!==revision||disposed)return false;throw error }
    if(disposed||request.signal.aborted||token!==revision){page.dispose();page.element.remove();return false}
    neighbor=page;page.element.style.removeProperty('visibility');page.element.classList.add('local-deck-page','local-deck-neighbor');page.element.inert=true;page.element.setAttribute('aria-hidden','true')
    if(page.element.parentElement!==stage)stage.append(page.element)
    page.element.scrollTop=positions.get(keys[next]!)??0;return true
  }
  const finish=async(d:number,commit:boolean,token:number)=>{
    if(!neighbor||token!==revision)return
    settling=true;const start=performance.now(),duration=reduced.matches?0:commit?245:205,end=commit?(target>index?-1:1)*stage.clientWidth:0
    await new Promise<void>(resolve=>{resolveTween=resolve;const tick=(t:number)=>{if(token!==revision||disposed){resolve();return}const f=duration?Math.min(1,(t-start)/duration):1;draw(d+(end-d)*(1-(1-f)**3));if(f===1){resolveTween=undefined;resolve()}else frame=requestAnimationFrame(tick)};tick(start)})
    if(token!==revision||disposed)return
    if(commit){positions.set(keys[index]!,current.element.scrollTop);const next=neighbor!;neighbor=undefined;current.dispose();current.element.remove();current=next;index=target;current.element.classList.remove('local-deck-neighbor');current.element.style.removeProperty('transform');current.element.inert=false;current.element.removeAttribute('aria-hidden');options.selected(keys[index]!);current.activate?.()}
    clean();select();nav.style.setProperty('--deck-progress',String(index))
  }
  const blocked=()=>disposed||document.body.classList.contains('keyboard-open')||(!options.modal&&!!document.querySelector('dialog[open]'))||!!document.activeElement?.matches('input,textarea,select,[contenteditable=true]')
  const go=async(key:string)=>{if(blocked())return;requested=key;cancel();const next=keys.indexOf(key);if(next<0||next===index)return;const token=revision;try{if(await prepare(next,token))await finish(0,true,token)}catch(e){if(token===revision){clean();options.fail(e)}}finally{if(requested===key)requested=undefined}}
  const swipe=bindHorizontalSwipe(root,{
    blocked,allowText:true,
    allowed:el=>!settling&&el.closest('[data-local-deck]')===root&&!el.closest('[data-sort-handle],.trend-chart-shell,.calendar-grid,.chart-scroll,[data-no-page-swipe]')&&(!el.closest(swipeControl)||nav.contains(el)),
    start:()=>{cancel();dx=0;ended=false;target=index},
    move:d=>{dx=d;const next=adjacentSwipe(index,d,keys.length);if(next===index){cancel();target=index;return}if(next!==target){const token=++revision;void prepare(next,token).then(ready=>{if(ready&&!ended)draw(dx)}).catch(options.fail)}else draw(d)},
    end:(d,v,canceled)=>{ended=true;if(!neighbor){cancel();return}void finish(d,!canceled&&shouldCommitSwipe(d,v,stage.clientWidth),revision).catch(options.fail)},
  })
  nav.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>(`[${options.buttonAttribute}]`);if(button&&nav.contains(button))void go(button.getAttribute(options.buttonAttribute)!)},{signal})
  nav.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?keys.length-1:Math.max(0,Math.min(keys.length-1,index+(event.key==='ArrowRight'?1:-1)));void go(keys[next]!)},{signal})
  window.addEventListener('resize',cancel,{signal});window.addEventListener('pagehide',cancel,{signal});reduced.addEventListener('change',cancel,{signal})
  document.addEventListener('fitlog-sheet-open',()=>{if(!options.modal)cancel()},{signal})
  current.element.classList.add('local-deck-page');current.element.classList.remove('local-deck-neighbor');current.element.style.removeProperty('visibility');current.element.scrollTop=positions.get(keys[index]!)??0;select()
  const resize=new ResizeObserver(()=>placeIndicator());resize.observe(nav)
  return {go,cancel,destroy:()=>{if(disposed)return;positions.set(keys[index]!,current.element.scrollTop);disposed=true;swipe.destroy();cancel();events.abort();resize.disconnect();indicator.remove();current.dispose();root.removeAttribute('data-local-deck')}}
}
