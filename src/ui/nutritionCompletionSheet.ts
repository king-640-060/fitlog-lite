import type { NutritionCompletionResult } from '../utils/nutritionCompletion'
import { completeNutrition, completionKeys, isFutureBusinessDate } from '../utils/nutritionCompletion'
import { readNutritionCompletionSource, nutritionCompletionSourceSignature, applyNutritionCompletionPlan } from '../services/nutritionCompletionService'
import { completionDateLabel, completionGapText, completionLabels } from './nutritionCompletion'
import { remainingNutritionGoalsHtml } from './remainingNutritionGoals'
import { formatEnergyInputValue } from '../utils/energy'
import { formatNumber } from '../utils/nutrition'
import { getLocalDateString } from '../utils/date'
import { isMealType, mealTypes, mealNames } from '../utils/foodMeals'
import { setSheetVariant } from './sheetController'
export type CompletionMode = 'smart' | 'designated'
interface CompletionUi { openModal(title:string,html:string):HTMLDialogElement; esc(value:unknown):string; saved(count:number):void }
/** Local, bounded real optimizer. Candidate selection is memory-only and preview never writes. */
export async function openNutritionCompletionSheet(date:string, ui:CompletionUi, initialMode:CompletionMode='smart'):Promise<void> {
  const dialog=ui.openModal(completionDateLabel(date,getLocalDateString()),'<p role="status">正在读取记录…</p>'),body=dialog.querySelector<HTMLElement>('.modal-body')!
  let alive=true,mode=initialMode,selected=new Set<string>(),query='',applying=false,calculating=false,result:NutritionCompletionResult|undefined,source:Awaited<ReturnType<typeof readNutritionCompletionSource>>,signature=''
  dialog.addEventListener('close',()=>{alive=false},{once:true})
  try { source=await readNutritionCompletionSource(date) } catch(error) { if(alive)body.textContent=error instanceof Error?error.message:'暂时无法读取，请关闭后重试';return }
  if(!dialog.open)return
  setSheetVariant(dialog,'large')
  const amount=(key:typeof completionKeys[number],n:number|undefined)=>n===undefined?'数据不完整':`${(key==='calories'?formatEnergyInputValue:formatNumber)(n)} ${key==='calories'?'kcal':'g'}`
  const drawSelection=()=>{
    if(mode!=='designated')return
    body.querySelector('[data-selected-foods]')!.innerHTML=[...selected].map(id=>`<button type="button" class="secondary" data-remove-selected="${ui.esc(id)}">${ui.esc(source.foods.find(f=>f.id===id)?.name??'食物已删除')} ×</button>`).join('')||'<span class="completion-note">请选择 1–4 种真实食物，只使用勾选项。</span>'
    const calculate=body.querySelector<HTMLButtonElement>('#completion-calculate')!;calculate.disabled=calculating||applying||(mode==='designated'&&!selected.size)
  }
  const drawPicker=()=>{
    const host=body.querySelector<HTMLElement>('[data-designated-list]');if(!host)return
    const needle=query.trim().toLocaleLowerCase()
    const visible=source.foods.filter(f=>`${f.name} ${f.brand??''}`.toLocaleLowerCase().includes(needle))
    host.innerHTML=visible.map(f=>`<label class="designated-food"><span><strong>${ui.esc(f.name)}</strong><small>${ui.esc(f.brand??'')} · ${formatEnergyInputValue(f.calories)} kcal / ${formatNumber(f.referenceGrams)} g</small></span><input type="checkbox" data-designated-food="${ui.esc(f.id)}" ${selected.has(f.id)?'checked':''}></label>`).join('')||'<p class="completion-note">没有匹配的食物</p>'
    drawSelection()
  }
  const draw=()=>{
    if(!alive)return
    const summary=result??completeNutrition(source.target??{},source.logs,[])
    body.innerHTML=`<div class="nutrition-completion"><p class="completion-note">${date} · 预览不会记账；实际吃下后再确认。</p>${remainingNutritionGoalsHtml(summary)}<div class="completion-mode" role="group" aria-label="补齐方式"><button type="button" class="secondary" data-completion-mode="smart" aria-pressed="${mode==='smart'}">智能推荐</button><button type="button" class="secondary" data-completion-mode="designated" aria-pressed="${mode==='designated'}">指定食物</button></div>${mode==='designated'?`<div data-selected-foods class="designated-selected"></div><label class="search-field"><span class="sr-only">搜索指定食物</span><input id="completion-search" type="search" placeholder="搜索食物或品牌" value="${ui.esc(query)}"></label><div data-designated-list></div>`:'<p class="completion-note">根据真实食物库评估组合，可切换到指定食物限定候选。</p>'}<button type="button" class="primary" id="completion-calculate">${result?'重新计算建议':'计算建议组合'}</button><p class="completion-note" role="status" data-completion-status></p>${isFutureBusinessDate(date)?'<p class="completion-future completion-note">未来日期仅可预览，不能记录为实际摄入。</p>':''}<div data-completion-results>${result?resultsHtml(result):''}</div></div>`
    drawPicker()
  }
  const resultsHtml=(r:NutritionCompletionResult)=>{
    const uncertain=r.uncertainKeys.length?`<p class="completion-note">部分记录缺少${r.uncertainKeys.map(k=>completionLabels[k]).join('、')}数据，对应目标未参与补齐计算。</p>`:''
    const empty=!source.target?'请先设置这个日期的营养目标。':r.nothingToComplete?'可确定的目标暂无需要补齐的部分。':'所选候选暂不能改善剩余目标，请调整食物或直接记录实际摄入。'
    return uncertain+(r.plans.length?r.plans.map((plan,i)=>`<article class="completion-plan"><div class="completion-plan-heading"><h3>方案 ${i+1}</h3><span>${mode==='designated'?'仅用指定食物':'来自真实食物库'}</span></div><ul class="completion-plan-items">${plan.items.map(item=>`<li data-plan-food="${ui.esc(item.food.id)}"><div><strong>${ui.esc(item.food.name)}</strong></div><b>${formatNumber(item.grams)} g</b></li>`).join('')}</ul><div class="completion-plan-summary"><h4>预计补充</h4><p>${completionKeys.map(k=>`${completionLabels[k]} ${amount(k,plan.added[k])}`).join(' · ')}</p><h4>补充后预计及目标差额</h4><dl>${completionKeys.map(k=>`<div><dt>${completionLabels[k]}</dt><dd>${amount(k,plan.projected[k])}<small>${source.target?.[k]===undefined?'未设置目标':plan.projected[k]===undefined?'数据不完整':completionGapText({...r,gap:{...r.gap,[k]:source.target[k]!-plan.projected[k]!}},k)}</small></dd></div>`).join('')}</dl></div><p class="completion-note">${plan.closeEnough?'可确定项目在现有算法容差内接近目标。':'部分目标仍有差距，无法同时满足全部目标；请查看各项剩余缺口。'}</p>${isFutureBusinessDate(date)?'':`<button type="button" class="secondary completion-adopt" data-completion-adopt="${i}" aria-label="采用方案 ${i+1}" aria-expanded="false">检查并确认实际摄入</button><div class="completion-meal-picker" id="completion-meals-${i}" hidden></div>`}</article>`).join(''):`<p class="completion-note">${empty}</p>`)+(r.excludedFoodCount?`<p class="completion-note">${r.excludedFoodCount} 项候选因营养数据不完整未参与计算。</p>`:'')
  }
  draw()
  const calculate=async()=>{
    if(calculating||applying||!alive)return
    calculating=true;body.querySelector<HTMLButtonElement>('#completion-calculate')!.disabled=true
    try{
      source=await readNutritionCompletionSource(date);if(!alive)return
      signature=nutritionCompletionSourceSignature(source)
      result=completeNutrition(source.target??{},source.logs,source.foods,new Set(),mode==='designated'?selected:undefined)
      if(mode==='designated'&&result.plans.some(p=>p.items.some(item=>!selected.has(item.food.id))))throw Error('方案包含未指定食物')
      draw()
    }catch(error){if(alive)body.querySelector('[data-completion-status]')!.textContent=error instanceof Error?error.message:'无法计算，请重试'}
    finally{calculating=false;body.querySelector<HTMLButtonElement>('#completion-calculate')?.removeAttribute('disabled');drawPicker()}
  }
  body.addEventListener('input',event=>{if((event.target as HTMLElement).id==='completion-search'){query=(event.target as HTMLInputElement).value;drawPicker()}})
  body.addEventListener('change',event=>{
    const input=event.target as HTMLInputElement,id=input.dataset.designatedFood;if(!id||applying||calculating)return
    if(input.checked&&selected.size>=4){input.checked=false;body.querySelector('[data-completion-status]')!.textContent='一次最多指定 4 种食物';return}
    if(input.checked)selected.add(id);else selected.delete(id)
    result=undefined;body.querySelector('[data-completion-results]')!.innerHTML='';drawSelection()
  })
  body.addEventListener('click',async event=>{
    const el=(event.target as Element).closest<HTMLButtonElement>('button');if(!el||applying||calculating)return
    if(el.dataset.completionMode){mode=el.dataset.completionMode as CompletionMode;result=undefined;draw();return}
    if(el.dataset.removeSelected){selected.delete(el.dataset.removeSelected);result=undefined;draw();return}
    if(el.id==='completion-calculate'){await calculate();return}
    if(el.dataset.completionAdopt!==undefined&&result){
      const index=Number(el.dataset.completionAdopt),picker=body.querySelector<HTMLElement>(`#completion-meals-${index}`)!
      body.querySelectorAll<HTMLElement>('.completion-meal-picker').forEach(p=>p.hidden=true)
      body.querySelectorAll('[data-completion-adopt]').forEach(b=>b.setAttribute('aria-expanded','false'))
      picker.hidden=false;el.setAttribute('aria-expanded','true')
      picker.innerHTML=`<p>${date} · 仅在实际吃下后，选择餐次确认记账：</p><div>${[...mealTypes,''].map(meal=>`<button type="button" data-completion-meal="${meal}" data-plan-index="${index}">${isMealType(meal)?mealNames[meal]:'未分类'}</button>`).join('')}</div>`;return
    }
    if(el.dataset.completionMeal!==undefined&&result){
      applying=true;body.querySelectorAll<HTMLInputElement|HTMLButtonElement>('button,input').forEach(b=>b.disabled=true)
      try{
        const items=result.plans[Number(el.dataset.planIndex)]!.items,meal=el.dataset.completionMeal
        const logs=await applyNutritionCompletionPlan(date,isMealType(meal)?meal:undefined,items,undefined,{signature,allowedFoodIds:mode==='designated'?[...selected]:undefined})
        if(alive)dialog.close();ui.saved(logs.length)
      }catch(error){if(alive){body.querySelector('[data-completion-status]')!.textContent=error instanceof Error?error.message:'保存失败，请重试';body.querySelectorAll<HTMLInputElement|HTMLButtonElement>('button,input').forEach(b=>b.disabled=false)}}
      finally{applying=false;drawPicker()}
    }
  })
  if(initialMode==='smart')await calculate()
}
