import { previewDesignatedNutrition, recommendDesignatedNutrition } from '../utils/designatedNutrition'
import type { NutritionCompletionResult } from '../utils/nutritionCompletion'
import { getNutritionCompletionSummary, completionKeys, isFutureBusinessDate } from '../utils/nutritionCompletion'
import { readNutritionCompletionSource, nutritionCompletionSourceSignature, applyNutritionCompletionPlan } from '../services/nutritionCompletionService'
import { completionGapText, completionLabels } from './nutritionCompletion'
import { remainingNutritionGoalsHtml } from './remainingNutritionGoals'
import { formatEnergyInputValue } from '../utils/energy'
import { formatNumber } from '../utils/nutrition'
import { isMealType, mealTypes, mealNames } from '../utils/foodMeals'
import { setSheetVariant } from './sheetController'
export type CompletionMode = 'designated'
interface CompletionUi { openModal(title:string,html:string):HTMLDialogElement; esc(value:unknown):string; saved(count:number):void }
/** Two retained UI steps; checkboxes never rebuild their list or change its scroll owner. */
export async function openNutritionCompletionSheet(date:string, ui:CompletionUi, _initialMode:CompletionMode='designated'):Promise<void> {
  const dialog=ui.openModal('指定食物','<p role="status">正在读取记录…</p>'),body=dialog.querySelector<HTMLElement>('.modal-body')!
  let alive=true,query='',applying=false,calculating=false,manual=false,lastFood='',listScroll=0,bodyScroll=0
  const selected=new Set<string>(),grams=new Map<string,string>(),events=new AbortController()
  let result:NutritionCompletionResult|undefined,source:Awaited<ReturnType<typeof readNutritionCompletionSource>>,signature=''
  dialog.addEventListener('close',()=>{alive=false;events.abort()},{once:true})
  try { source=await readNutritionCompletionSource(date) } catch(error) { if(alive)body.textContent=error instanceof Error?error.message:'暂时无法读取，请关闭后重试';return }
  if(!alive||!dialog.open)return
  setSheetVariant(dialog,'large')
  const amount=(key:typeof completionKeys[number],n:number|undefined)=>n===undefined?'数据不完整':`${(key==='calories'?formatEnergyInputValue:formatNumber)(n)} ${key==='calories'?'kcal':'g'}`
  body.innerHTML=`<div class="nutrition-completion designated-flow" data-designated-root><section data-designated-picker><p class="completion-note">${ui.esc(date)} · 先选择食物，系统推荐份量；预览不会记账。</p>${remainingNutritionGoalsHtml(getNutritionCompletionSummary(source.target??{},source.logs))}<div class="designated-summary"><strong data-selected-count>已选 0 / 4</strong><div class="designated-chips" data-selected-foods></div></div><label class="search-field"><span class="sr-only">搜索指定食物</span><input id="completion-search" type="search" placeholder="搜索食物或品牌"></label><div data-designated-list role="group" aria-label="选择1至4种食物"></div><p class="completion-note" role="status" data-completion-status></p><button type="button" class="primary full-btn" id="completion-calculate" disabled>计算建议份量</button><button type="button" class="sheet-link full-btn" data-designated-manual disabled>改为记录实际摄入</button></section><section data-designated-preview hidden><button type="button" class="sheet-link" data-designated-back>返回选择食物</button><p class="completion-note" data-portion-mode></p><div data-portion-inputs></div><button type="button" class="sheet-link" data-designated-recalculate>恢复系统建议</button><div data-completion-results></div><p class="completion-note" role="alert" data-preview-error></p>${isFutureBusinessDate(date)?'<p class="completion-future completion-note">未来日期仅可预览，不能记录为实际摄入。</p>':'<button type="button" class="primary completion-adopt full-btn" data-completion-adopt="0" aria-expanded="false" disabled>确认已实际吃下</button><div class="completion-meal-picker" hidden></div>'}</section></div>`
  const picker=body.querySelector<HTMLElement>('[data-designated-picker]')!,preview=body.querySelector<HTMLElement>('[data-designated-preview]')!,list=body.querySelector<HTMLElement>('[data-designated-list]')!
  const footer=document.createElement('footer');footer.className='sheet-footer designated-footer'
  const pickerActions=document.createElement('div'),previewActions=document.createElement('div')
  pickerActions.append(body.querySelector('#completion-calculate')!,body.querySelector('[data-designated-manual]')!)
  previewActions.append(body.querySelector('[data-designated-back]')!)
  const adoptButton=body.querySelector('[data-completion-adopt]');if(adoptButton)previewActions.append(adoptButton)
  previewActions.hidden=true;footer.append(pickerActions,previewActions);dialog.append(footer)
  // Follow the existing template editor footer pattern, using only shared viewport events.
  const placeFooter=()=>{
    if(!alive||!dialog.open)return
    const handle=dialog.querySelector<HTMLElement>('.sheet-handle')!,style=getComputedStyle(dialog),hs=getComputedStyle(handle)
    const fields=[...(preview.hidden?picker:preview).querySelectorAll<HTMLInputElement>('input')]
    const required=Math.max(160,...fields.map(e=>(e.closest('label')?.getBoundingClientRect().height??0)+12))
    const available=dialog.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-dialog.querySelector('.modal-head')!.getBoundingClientRect().height-handle.getBoundingClientRect().height-parseFloat(hs.marginTop)-parseFloat(hs.marginBottom)-footer.getBoundingClientRect().height
    const scroll=available<required,parent=scroll?body:dialog,active=document.activeElement
    footer.toggleAttribute('data-scroll-footer',scroll)
    if(footer.parentElement!==parent){
      parent.append(footer)
      if(active instanceof HTMLElement&&footer.contains(active))active.focus({preventScroll:true})
      if(active instanceof HTMLInputElement&&body.contains(active)){
        const field=active.getBoundingClientRect(),bounds=body.getBoundingClientRect(),gap=Math.min(12,Math.max(0,(bounds.height-field.height)/2))
        if(field.top<bounds.top+gap)body.scrollTop+=field.top-bounds.top-gap
        else if(field.bottom>bounds.bottom-gap)body.scrollTop+=field.bottom-bounds.bottom+gap
      }
    }
  }
  document.addEventListener('fitlog-viewport-change',placeFooter,{signal:events.signal})


  const status=(message:string)=>{body.querySelector('[data-completion-status]')!.textContent=message}
  const failure=(value:unknown)=>{body.querySelector(preview.hidden?'[data-completion-status]':'[data-preview-error]')!.textContent=value instanceof Error?value.message:String(value)}
  const selectedFoods=()=>[...selected].map(id=>{const food=source.foods.find(f=>f.id===id);if(!food)throw Error('食物已删除，请返回重新选择');return food})
  const syncSelection=()=>{
    body.querySelector('[data-selected-count]')!.textContent=`已选 ${selected.size} / 4`
    body.querySelector('[data-selected-foods]')!.innerHTML=[...selected].map(id=>`<button type="button" class="text-btn" data-remove-selected="${ui.esc(id)}" aria-label="移除 ${ui.esc(source.foods.find(f=>f.id===id)?.name)}">${ui.esc(source.foods.find(f=>f.id===id)?.name??'食物已删除')} ×</button>`).join('')
    list.querySelectorAll<HTMLInputElement>('[data-designated-food]').forEach(input=>{input.checked=selected.has(input.dataset.designatedFood!)})
    dialog.querySelectorAll<HTMLButtonElement>('#completion-calculate,[data-designated-manual]').forEach(b=>b.disabled=!selected.size||calculating||applying)
  }
  const renderList=()=>{
    const needle=query.trim().toLocaleLowerCase()
    list.innerHTML=source.foods.filter(f=>`${f.name} ${f.brand??''}`.toLocaleLowerCase().includes(needle)).map(f=>`<label class="designated-food"><span><strong>${ui.esc(f.name)}</strong><small>${ui.esc(f.brand??'')} · ${formatEnergyInputValue(f.calories)} kcal / ${formatNumber(f.referenceGrams)} g</small></span><input type="checkbox" data-designated-food="${ui.esc(f.id)}" ${selected.has(f.id)?'checked':''}></label>`).join('')||'<p class="completion-note">没有匹配的食物</p>'
  }
  const updatePreview=()=>{
    body.querySelector('[data-preview-error]')!.textContent=''
    const adopt=dialog.querySelector<HTMLButtonElement>('[data-completion-adopt]')
    const meals=body.querySelector<HTMLElement>('.completion-meal-picker');if(meals)meals.hidden=true
    if(adopt){adopt.disabled=true;adopt.setAttribute('aria-expanded','false')}
    body.querySelector('[data-portion-mode]')!.textContent=manual?'手动实际摄入 · 每种大于0且最多1000g，合计最多2000g。':'系统建议 · 每种20–400g，合计最多800g，5g步长；可按实际摄入微调。'
    try {
      result=previewDesignatedNutrition(source.target??{},source.logs,selectedFoods().map(food=>({food,grams:Number(grams.get(food.id))})))
      const plan=result.plans[0]!
      body.querySelector('[data-completion-results]')!.innerHTML=`<article class="completion-plan"><div class="completion-plan-heading"><h3>${manual?'实际摄入预览':'建议份量预览'}</h3><span>仅用所选食物</span></div><ul class="completion-plan-items">${plan.items.map(item=>`<li data-plan-food="${ui.esc(item.food.id)}"><strong>${ui.esc(item.food.name)}</strong><b>${formatNumber(item.grams)} g</b></li>`).join('')}</ul><div class="completion-plan-summary"><h4>本次摄入</h4><p>${completionKeys.map(k=>`${completionLabels[k]} ${amount(k,plan.added[k])}`).join(' · ')}</p><h4>记账后实际及目标差额</h4><dl>${completionKeys.map(k=>`<div><dt>${completionLabels[k]}</dt><dd>${amount(k,plan.projected[k])}<small>${source.target?.[k]===undefined?'未设置目标':plan.projected[k]===undefined?'数据不完整':completionGapText({...result!,gap:{...result!.gap,[k]:source.target[k]!-plan.projected[k]!}},k)}</small></dd></div>`).join('')}</dl></div><p class="completion-note">这是目标间的折中，不保证四项同时达标；仍差或将超以实际差额为准。实际吃下后才确认记账。${result.uncertainKeys.length?' 部分历史记录成分未知，对应实际合计和目标差额保持未知。':''}</p></article>`
      if(adopt)adopt.disabled=applying||calculating
    }catch(error){result=undefined;body.querySelector('[data-completion-results]')!.innerHTML='';failure(error)}
  }
  const showPreview=()=>{
    if(!picker.hidden){listScroll=list.scrollTop;bodyScroll=body.scrollTop}
    picker.hidden=true;preview.hidden=false;pickerActions.hidden=true;previewActions.hidden=false
    body.querySelector('[data-portion-inputs]')!.innerHTML=selectedFoods().map(food=>`<article class="designated-portion"><strong>${ui.esc(food.name)}</strong><p class="completion-note">${ui.esc(food.brand??'')} · 每 ${formatNumber(food.referenceGrams)} g：${completionKeys.map(k=>`${completionLabels[k]} ${amount(k,food[k])}`).join(' · ')}</p><label>建议／实际克数（g）<span class="designated-amount"><button type="button" class="secondary" data-portion-change="${ui.esc(food.id)}" data-direction="-1" aria-label="减少 ${ui.esc(food.name)} 5克">−</button><input type="number" inputmode="decimal" min="0.000001" max="1000" step="any" data-designated-grams="${ui.esc(food.id)}" value="${ui.esc(grams.get(food.id)??'')}"><span>g</span><button type="button" class="secondary" data-portion-change="${ui.esc(food.id)}" data-direction="1" aria-label="增加 ${ui.esc(food.name)} 5克">＋</button></span></label></article>`).join('')
    updatePreview();placeFooter();body.scrollTop=0;dialog.querySelector<HTMLElement>('.modal-head h2')?.focus({preventScroll:true})
  }
  const back=()=>{
    preview.hidden=true;picker.hidden=false;previewActions.hidden=true;pickerActions.hidden=false;result=undefined
    syncSelection();placeFooter();body.scrollTop=bodyScroll;list.scrollTop=listScroll
    const input=[...list.querySelectorAll<HTMLInputElement>('[data-designated-food]')].find(n=>n.dataset.designatedFood===lastFood)
    input?.focus({preventScroll:true})
  }
  const calculate=async(asManual=false)=>{
    if(applying||calculating||!selected.size)return
    calculating=true;syncSelection()
    try{
      source=await readNutritionCompletionSource(date);if(!alive)return
      signature=nutritionCompletionSourceSignature(source)
      const foods=selectedFoods()
      if(asManual){manual=true;showPreview();return}
      const recommendation=recommendDesignatedNutrition(source.target??{},source.logs,foods)
      if(recommendation.reason){failure(recommendation.reason);return}
      recommendation.result.plans[0]!.items.forEach(item=>grams.set(item.food.id,String(item.grams)))
      manual=false;status('');showPreview()
    }catch(error){if(alive)failure(error)}
    finally{calculating=false;if(alive){syncSelection();if(result)dialog.querySelector<HTMLButtonElement>('[data-completion-adopt]')?.removeAttribute('disabled')}}
  }
  renderList();syncSelection();placeFooter()
  dialog.addEventListener('cancel',event=>{if(!preview.hidden){event.preventDefault();if(!applying&&!calculating)back()}},{signal:events.signal})
  body.addEventListener('input',event=>{
    if(applying||calculating)return
    const input=event.target as HTMLInputElement
    if(input.id==='completion-search'){query=input.value;renderList();list.scrollTop=0}
    if(input.dataset.designatedGrams){grams.set(input.dataset.designatedGrams,input.value);manual=true;updatePreview()}
  })
  body.addEventListener('change',event=>{
    const input=event.target as HTMLInputElement,id=input.dataset.designatedFood;if(!id)return
    if(applying||calculating){input.checked=selected.has(id);return}
    if(input.checked&&selected.size>=4){input.checked=false;status('一次最多指定4种食物');return}
    if(input.checked)selected.add(id);else selected.delete(id)
    lastFood=id;result=undefined;status('');syncSelection()
  })
  dialog.addEventListener('click',async event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||applying||calculating)return
    if(button.dataset.removeSelected){selected.delete(button.dataset.removeSelected);result=undefined;syncSelection();return}
    if(button.id==='completion-calculate'||button.hasAttribute('data-designated-recalculate')){await calculate();return}
    if(button.hasAttribute('data-designated-manual')){await calculate(true);return}
    if(button.hasAttribute('data-designated-back')){back();return}
    if(button.dataset.portionChange){
      const id=button.dataset.portionChange,input=[...body.querySelectorAll<HTMLInputElement>('[data-designated-grams]')].find(n=>n.dataset.designatedGrams===id)!
      input.value=String(Number(input.value)+Number(button.dataset.direction)*5);grams.set(id,input.value);manual=true;updatePreview();return
    }
    if(button.dataset.completionAdopt!==undefined&&result){
      const meals=body.querySelector<HTMLElement>('.completion-meal-picker')!;meals.hidden=false;button.setAttribute('aria-expanded','true')
      meals.innerHTML=`<p>${ui.esc(date)} · 已确认实际吃下，选择餐次后记账：</p><div>${[...mealTypes,''].map(meal=>`<button type="button" data-completion-meal="${meal}">${isMealType(meal)?mealNames[meal]:'未分类'}</button>`).join('')}</div>`;return
    }
    if(button.dataset.completionMeal!==undefined&&result){
      applying=true;dialog.querySelectorAll<HTMLInputElement|HTMLButtonElement>('button,input').forEach(b=>b.disabled=true)
      try{
        const meal=button.dataset.completionMeal
        const logs=await applyNutritionCompletionPlan(date,isMealType(meal)?meal:undefined,result.plans[0]!.items,undefined,{signature,allowedFoodIds:[...selected],manualPortions:manual,requireAllFoods:true,sourceDate:date})
        if(alive)dialog.close();ui.saved(logs.length)
      }catch(error){if(alive){failure(error);dialog.querySelectorAll<HTMLInputElement|HTMLButtonElement>('button,input').forEach(b=>b.disabled=false)}}
      finally{applying=false;if(alive)syncSelection()}
    }
  })
}
