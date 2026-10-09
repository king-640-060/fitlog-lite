import { icon } from './icons'
export type CompletionStatus='saving'|'saved'|'error'
export interface TrainingCompletion {render():void;save():Promise<void>;readonly status:CompletionStatus}
/** Captures one factual result. Retries reuse it; no automatic exit or second modal. */
export function createTrainingCompletion<T>(options:{kind:'strength'|'kegel';title:string;manual?:boolean;result:T;save:(result:T)=>Promise<T>;summary:(result:T)=>Array<[string,string]>;esc:(v:unknown)=>string;returned:()=>void;view?:(result:T)=>void;afterSaved?:(result:T)=>Promise<string|undefined>}):TrainingCompletion {
  let status:CompletionStatus='saving',busy=false,result=options.result,notice:string|undefined,error=''
  const render=()=>{
    const host=document.querySelector<HTMLElement>('#view');if(!host)return
    document.body.classList.add('immersive')
    host.innerHTML=`<section class="training-completion" data-training-completion="${options.kind}" data-completion-status="${status}"><div class="completion-mark" aria-hidden="true">${icon(status==='error'?'activity':'check',24)}</div><p class="completion-kind">${options.esc(options.title)}</p><h2>${options.manual?'本次训练已结束':'本次训练已完成'}</h2><p class="completion-status" role="status">${status==='saving'?'正在保存记录…':status==='error'?'记录尚未成功保存':options.manual?'已保存当前进度':'记录已保存'}</p><dl class="completion-summary">${options.summary(result).map(([label,value])=>`<div><dt>${options.esc(label)}</dt><dd>${options.esc(value)}</dd></div>`).join('')}</dl>${notice?`<p class="completion-notice">${options.esc(notice)}</p>`:''}${status==='error'?`<p class="completion-error" role="alert">${options.esc(error)}</p>`:''}<div class="completion-actions">${status==='saved'?`<button type="button" class="primary full-btn" data-completion-return>返回训练</button>${options.view?'<button type="button" class="secondary full-btn" data-completion-view>查看本次记录</button>':''}`:`<button type="button" class="primary full-btn" data-completion-retry ${status==='saving'?'disabled aria-busy="true"':''}>${status==='saving'?'正在保存':'重试保存'}</button>`}</div></section>`
    host.querySelector('[data-completion-return]')?.addEventListener('click',options.returned)
    host.querySelector('[data-completion-view]')?.addEventListener('click',()=>options.view?.(result))
    host.querySelector('[data-completion-retry]')?.addEventListener('click',()=>void save())
  }
  const save=async()=>{if(busy||status==='saved')return;busy=true;status='saving';render();try{result=await options.save(result);status='saved';try{notice=await options.afterSaved?.(result)}catch{notice='记录已保存，阶段信息可返回训练后查看。'}}catch{status='error';error='保存未完成，请重试。本次实际训练结果已保留。'}finally{busy=false;render()}}
  return {render,save,get status(){return status}}
}
