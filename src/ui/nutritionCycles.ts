import { db } from '../db/database'
import type { NutritionCycle, NutritionCycleDay, NutritionGoal } from '../db/types'
import type { StrategyUi } from './nutritionStrategies'
import { cycleDates, cycleWeeks, copyCycleWeek, saveNutritionCycle, archiveNutritionCycle, goalValues, MAX_CYCLE_DAYS, applyScheduledNutritionTarget, scheduledNutritionDay } from '../services/nutritionCycleService'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { historyDatePicker } from './recordHistory'
import { mountDatePicker } from './datePicker'
import { formatNumber } from '../utils/nutrition'
import { managerRowHtml, managerListHtml, managerEmptyHtml, managerToolbarHtml } from './managerPrimitives'
const goalText=(n:NutritionGoal)=>[['calories','热量','kcal'],['protein','蛋白质','g'],['carbs','碳水','g'],['fat','脂肪','g']].map(([key,label,unit])=>`${label} ${n[key as keyof NutritionGoal]===undefined?'未设':`${formatNumber(n[key as keyof NutritionGoal]!)} ${unit}`}`).join(' · ')
const choiceText=(day?:NutritionCycleDay)=>`${day?.nutrition?.variantName??'未指定目标'} / ${day?.dietTemplate?.name??'无饮食模板'}`
const error=(root:ParentNode,e:unknown)=>{const n=root.querySelector<HTMLElement>('[data-cycle-error]');if(n){n.hidden=false;n.textContent=e instanceof Error?e.message:'操作未完成，请重试'}}
export async function showNutritionCycles(ui:StrategyUi,back?:()=>void):Promise<void>{
  const cycles=await db.nutritionCycles.orderBy('updatedAt').reverse().toArray()
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('营养周期',`<div class="manager-surface nutrition-cycle-manager">${back?'<button type="button" class="text-btn" data-cycle-back>返回营养模板</button>':''}${managerToolbarHtml(`${cycles.filter(c=>!c.archivedAt).length} 个周期`,'cycle-new','营养周期',!cycles.length)}<p class="manager-section-note">按日期安排目标和饮食模板。保存排程不代表实际摄入，也不自动替换每日目标。</p>${cycles.length?managerListHtml(cycles.map(c=>managerRowHtml(ui.esc(c.name),`${c.startDate} — ${c.endDate} · ${ui.esc(c.templateName)}${c.archivedAt?' · 已归档':''}`,`data-cycle-edit="${ui.esc(c.id)}"`)).join('')):managerEmptyHtml('营养周期','自由安排每天的日方案和饮食模板。','cycle-empty-new')}</div>`)
  dialog.querySelector('[data-cycle-back]')?.addEventListener('click',()=>back?.())
  const create=()=>void showNutritionCycleEditor(ui,undefined,()=>void showNutritionCycles(ui,back))
  dialog.querySelector('#cycle-new')?.addEventListener('click',create);dialog.querySelector('#cycle-empty-new')?.addEventListener('click',create)
  dialog.querySelectorAll<HTMLButtonElement>('[data-cycle-edit]').forEach(b=>b.addEventListener('click',()=>{const c=cycles.find(c=>c.id===b.dataset.cycleEdit);if(c)void showNutritionCycleEditor(ui,c,()=>void showNutritionCycles(ui,back))}))
}
export async function showNutritionCycleEditor(ui:StrategyUi,existing?:NutritionCycle,back?:()=>void):Promise<void>{
  const [templates,variants,dietTemplates,storedDays,allCycles,targets]=await Promise.all([db.nutritionStrategyTemplates.toArray(),db.nutritionStrategyVariants.toArray(),db.dietTemplates.toArray(),existing?db.nutritionCycleDays.where('cycleId').equals(existing.id).toArray():Promise.resolve([]),db.nutritionCycles.toArray(),db.nutritionTargets.toArray()])
  if(ui.surface&&!ui.surface.alive)return
  const available=templates.filter(t=>!t.archivedAt),id=existing?.id??crypto.randomUUID(),today=getLocalDateString()
  let start=existing?.startDate??today,end=existing?.endDate??shiftLocalDate(today,27),templateId=existing?.templateId??available[0]?.id??'',days=structuredClone(storedDays),selected=new Set<string>(),variantId='',dietId='',busy=false,previewed=false
  const dialog=ui.openModal('营养周期排程',`<div class="nutrition-cycle" data-cycle-editor><p class="cycle-subtitle">按天自由安排训练日、休息日及饮食模板。</p><section class="cycle-card"><h3>周期信息</h3><label>周期名称<input name="cycleName" maxlength="80" value="${ui.esc(existing?.name??'')}" placeholder="例如：减脂第 1 阶段"></label><div class="cycle-date-fields"><label>开始日期<button type="button" class="secondary fitlog-date-trigger" data-cycle-start></button></label><label>结束日期<button type="button" class="secondary fitlog-date-trigger" data-cycle-end></button></label></div><label>营养模板<select name="cycleStrategy">${templates.filter(t=>!t.archivedAt||t.id===templateId).map(t=>`<option value="${ui.esc(t.id)}" ${t.id===templateId?'selected':''}>${ui.esc(t.name)}${t.archivedAt?'（已归档）':''}</option>`).join('')||'<option value="">暂无可用模板</option>'}</select></label><p class="cycle-stat" data-cycle-stat></p><p class="cycle-boundary">最多 ${MAX_CYCLE_DAYS} 天。排程不会写入 FoodLog 或每日目标；实际摄入与目标应用需要再次确认。</p></section><section><h3 class="cycle-section-title">① 选择要安排的日期</h3><p class="cycle-subtitle">点选单日、多日或跨周日期；不同周可以完全不同。</p><div data-cycle-weeks></div></section><section class="cycle-card"><h3>② 应用到选中的日期 <small data-cycle-selected-count></small></h3><p class="cycle-subtitle">先选择日期，再指定方案。两个字段可以独立更新。</p><div class="cycle-variants" data-cycle-variants></div><label>饮食模板（独立指定，可留空）<select name="cycleDiet"><option value="">无饮食模板</option>${dietTemplates.map(t=>`<option value="${ui.esc(t.id)}">${ui.esc(t.name)}</option>`).join('')}</select></label><div class="cycle-masks"><label><input type="checkbox" data-cycle-mask="nutrition" checked>更新营养方案</label><label><input type="checkbox" data-cycle-mask="diet" checked>更新饮食模板</label></div><div class="cycle-assign-actions"><button type="button" class="primary" data-cycle-assign>应用到已选日期</button><button type="button" class="text-btn" data-cycle-clear-selection>取消选择</button></div></section><section class="cycle-card"><div class="cycle-preview-heading"><h3>③ 预览本周期安排</h3><button type="button" class="secondary" data-cycle-preview>预览安排</button></div><p class="cycle-subtitle" data-cycle-preview-state>保存前检查范围、未指定日期和已有目标。</p><div data-cycle-preview-list></div><button type="button" class="primary full-btn" data-cycle-save disabled>确认保存排程</button></section><p role="alert" data-cycle-error hidden></p>${existing&&!existing.archivedAt?'<button type="button" class="text-btn danger" data-cycle-archive>归档周期</button>':''}${back?'<button type="button" class="text-btn" data-cycle-editor-back>返回营养周期</button>':''}</div>`,true)
  const root=dialog.querySelector<HTMLElement>('[data-cycle-editor]')!,weekHost=root.querySelector<HTMLElement>('[data-cycle-weeks]')!,formName=root.querySelector<HTMLInputElement>('[name=cycleName]')!,strategy=root.querySelector<HTMLSelectElement>('[name=cycleStrategy]')!,save=root.querySelector<HTMLButtonElement>('[data-cycle-save]')!
  const alive=()=>root.isConnected&&dialog.open
  const invalidate=()=>{previewed=false;save.disabled=true;root.querySelector('[data-cycle-preview-list]')!.innerHTML='';root.querySelector('[data-cycle-error]')?.setAttribute('hidden','')}
  const getWeeks=()=>cycleWeeks(start,end)
  const markSelection=()=>{root.querySelector('[data-cycle-selected-count]')!.textContent=`已选 ${selected.size} 天`;root.querySelector<HTMLButtonElement>('[data-cycle-assign]')!.disabled=busy||!selected.size||existing?.archivedAt!==undefined;root.querySelectorAll<HTMLButtonElement>('[data-cycle-date]').forEach(b=>b.setAttribute('aria-pressed',String(selected.has(b.dataset.cycleDate!))))}
  const drawWeeks=()=>{
    const open=new Set([...weekHost.querySelectorAll<HTMLDetailsElement>('details[open]')].map(e=>e.dataset.cycleWeek))
    const first=!weekHost.children.length,weeks=getWeeks(),dates=cycleDates(start,end)
    weekHost.innerHTML=weeks.map((week,index)=>`<details class="cycle-week" data-cycle-week="${index}" ${open.has(String(index))||first&&index===0?'open':''}><summary><strong>第 ${index+1} 周 · ${week.find(Boolean)} — ${week.filter(Boolean).at(-1)}</strong><span>${week.filter(date=>date&&days.some(d=>d.date===date)).length} / ${week.filter(Boolean).length} 天已安排</span></summary><div class="cycle-week-scroll"><div class="cycle-week-grid">${week.map((date,weekday)=>date?`<button type="button" class="cycle-date" data-cycle-date="${date}" aria-pressed="${selected.has(date)}" aria-label="${date} ${ui.esc(choiceText(days.find(d=>d.date===date)))}"><small>${['一','二','三','四','五','六','日'][weekday]}</small><strong>${Number(date.slice(-2))}</strong><span>${ui.esc(days.find(d=>d.date===date)?.nutrition?.variantName??'未指定')}</span>${days.find(d=>d.date===date)?.dietTemplate?'<span class="cycle-diet-mark">有模板</span>':''}</button>`:'<span class="cycle-date-outside" aria-hidden="true"></span>').join('')}</div></div><div class="cycle-week-actions"><button type="button" class="text-btn" data-cycle-select-week="${index}">本周全选</button><button type="button" class="text-btn" data-cycle-workdays="${index}">工作日</button><button type="button" class="text-btn" data-cycle-weekends="${index}">周末</button>${index<weeks.length-1?`<button type="button" class="text-btn" data-cycle-copy-week="${index}">复制到后续周</button>`:''}</div></details>`).join('')
    root.querySelector('[data-cycle-stat]')!.textContent=`${dates.length} 天 · 已安排 ${days.length} 天 · 饮食模板 ${days.filter(d=>d.dietTemplate).length} 天`
    weekHost.querySelectorAll<HTMLButtonElement>('[data-cycle-date]').forEach(b=>b.addEventListener('click',()=>{const date=b.dataset.cycleDate!;if(selected.has(date))selected.delete(date);else selected.add(date);markSelection()}))
    for(const kind of ['week','workdays','weekends'])weekHost.querySelectorAll<HTMLButtonElement>(`[data-cycle-${kind==='week'?'select-week':kind}]`).forEach(b=>b.addEventListener('click',()=>{const index=Number(b.getAttribute(`data-cycle-${kind==='week'?'select-week':kind}`));weeks[index]!.forEach((date,weekday)=>{if(date&&(kind==='week'||kind==='workdays'&&weekday<5||kind==='weekends'&&weekday>=5))selected.add(date)});markSelection()}))
    weekHost.querySelectorAll<HTMLButtonElement>('[data-cycle-copy-week]').forEach(b=>b.addEventListener('click',async()=>{
      if(busy)return;busy=true
      try{const next=copyCycleWeek(start,end,days,Number(b.dataset.cycleCopyWeek)),changed=dates.filter(date=>choiceText(days.find(d=>d.date===date))!==choiceText(next.find(d=>d.date===date)))
        if(changed.length&&await ui.confirm('复制到后续周？',changed.map(date=>`${date}：${choiceText(days.find(d=>d.date===date))} → ${choiceText(next.find(d=>d.date===date))}`).join('\n')+'\n仅修改排程，不改已保存目标和饮食。','确认复制')){if(!alive())return;days=next;invalidate();drawWeeks()}
      }catch(e){error(root,e)}finally{busy=false;markSelection()}
    }))
    weekHost.querySelectorAll<HTMLElement>('.cycle-week-scroll').forEach(scroll=>{const first=scroll.querySelector<HTMLElement>('[data-cycle-date]');if(first)scroll.scrollLeft=Math.min(Math.max(0,first.getBoundingClientRect().left-scroll.getBoundingClientRect().left),scroll.scrollWidth-scroll.clientWidth)})
    markSelection()
  }
  const drawVariants=()=>{
    const choices=variants.filter(v=>v.templateId===templateId).sort((a,b)=>a.sortOrder-b.sortOrder)
    root.querySelector('[data-cycle-variants]')!.innerHTML=`${choices.map(v=>`<button type="button" class="secondary cycle-variant" data-cycle-variant="${ui.esc(v.id)}" aria-pressed="${variantId===v.id}"><strong>${ui.esc(v.name)}</strong><small>${ui.esc(goalText(v))}</small></button>`).join('')}<button type="button" class="secondary cycle-variant" data-cycle-variant="" aria-pressed="${variantId===''}">不指定目标</button>`
    root.querySelectorAll<HTMLButtonElement>('[data-cycle-variant]').forEach(b=>b.addEventListener('click',()=>{variantId=b.dataset.cycleVariant!;root.querySelectorAll<HTMLButtonElement>('[data-cycle-variant]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}))
  }
  const drawDates=()=>{root.querySelector('[data-cycle-start]')!.textContent=start;root.querySelector('[data-cycle-end]')!.textContent=end}
  const changeDate=async(which:'start'|'end',value:string)=>{
    const nextStart=which==='start'?value:start,nextEnd=which==='end'?value:end
    try{const valid=cycleDates(nextStart,nextEnd),outside=days.filter(d=>!valid.includes(d.date));if(outside.length&&!await ui.confirm('缩短周期范围？',`${outside.length} 天排程将从本周期移除；已保存目标和饮食记录不变。`,'确认范围'))return;if(!alive())return;start=nextStart;end=nextEnd;days=days.filter(d=>valid.includes(d.date));selected=new Set([...selected].filter(d=>valid.includes(d)));invalidate();drawDates();drawWeeks()}catch(e){error(root,e)}
  }
  const pickDate=(which:'start'|'end')=>{
    if(busy)return
    const title=which==='start'?'开始日期':'结束日期',date=which==='start'?start:end
    if(!ui.surface){historyDatePicker(dialog,title,date,value=>void changeDate(which,value));return}
    ui.surface.subview(title,root);root.innerHTML='<div data-cycle-date-picker></div>'
    const picker=mountDatePicker(root.querySelector<HTMLElement>('[data-cycle-date-picker]')!,{value:date,onConfirm:value=>{ui.surface!.back();void changeDate(which,value!)},onCancel:()=>ui.surface!.back()})
    ui.surface.onDispose(()=>picker.destroy())
  }
  root.querySelector('[data-cycle-start]')!.addEventListener('click',()=>pickDate('start'))
  root.querySelector('[data-cycle-end]')!.addEventListener('click',()=>pickDate('end'))
  formName.addEventListener('input',invalidate)
  strategy.addEventListener('change',async()=>{const next=strategy.value;if(next===templateId)return;if(days.some(d=>d.nutrition)&&!await ui.confirm('更换周期营养模板？','本周期已有营养安排将取消；饮食安排、已保存目标和历史记录不变。','确认更换')){strategy.value=templateId;return}if(!alive())return;templateId=next;variantId='';days=days.map(d=>({...d,nutrition:undefined})).filter(d=>d.dietTemplate);invalidate();drawVariants();drawWeeks()})
  root.querySelector<HTMLSelectElement>('[name=cycleDiet]')!.addEventListener('change',e=>dietId=(e.currentTarget as HTMLSelectElement).value)
  root.querySelector('[data-cycle-clear-selection]')!.addEventListener('click',()=>{selected.clear();markSelection()})
  root.querySelector('[data-cycle-assign]')!.addEventListener('click',async()=>{
    if(busy||!selected.size)return;busy=true
    try{
      const nutritionMask=root.querySelector<HTMLInputElement>('[data-cycle-mask=nutrition]')!.checked,dietMask=root.querySelector<HTMLInputElement>('[data-cycle-mask=diet]')!.checked
      if(!nutritionMask&&!dietMask)throw new Error('请至少选择一个需要更新的字段')
      const variant=variants.find(v=>v.id===variantId),template=templates.find(t=>t.id===templateId),diet=dietTemplates.find(t=>t.id===dietId),now=new Date().toISOString()
      const next=days.filter(d=>!selected.has(d.date)),diff:string[]=[]
      for(const date of [...selected].sort()){const old=days.find(d=>d.date===date),day:NutritionCycleDay={...(old??{id:crypto.randomUUID(),cycleId:id,date,createdAt:now,updatedAt:now})};if(nutritionMask)day.nutrition=variant&&template?{variantId:variant.id,variantName:variant.name,templateId:template.id,templateName:template.name,...goalValues(variant)}:undefined;if(dietMask)day.dietTemplate=diet?{id:diet.id,name:diet.name}:undefined;if(day.nutrition||day.dietTemplate)next.push(day);if(old&&choiceText(old)!==choiceText(day))diff.push(`${date}：${choiceText(old)} → ${choiceText(day)}`)}
      if(diff.length&&!await ui.confirm('覆盖所选日期的排程？',diff.join('\n')+'\n已保存营养目标和饮食记录不变。','确认覆盖'))return
      if(!alive())return;days=next.sort((a,b)=>a.date.localeCompare(b.date));invalidate();drawWeeks()
    }catch(e){error(root,e)}finally{busy=false;markSelection()}
  })
  root.querySelector('[data-cycle-preview]')!.addEventListener('click',()=>{
    try{const dates=cycleDates(start,end),overlaps=allCycles.filter(c=>c.id!==id&&!c.archivedAt&&c.startDate<=end&&c.endDate>=start),missing=dates.filter(date=>!days.some(d=>d.date===date));root.querySelector('[data-cycle-preview-state]')!.textContent=`${dates.length} 天 · ${missing.length} 天未安排 · ${targets.filter(t=>dates.includes(t.date)).length} 天已有保存目标${overlaps.length?` · 冲突周期：${overlaps.map(c=>c.name).join('、')}`:''}`
      root.querySelector('[data-cycle-preview-list]')!.innerHTML=dates.map(date=>{const day=days.find(d=>d.date===date),target=targets.find(t=>t.date===date);return `<article class="cycle-preview-row"><div><strong>${date}</strong><span>${ui.esc(choiceText(day))}</span>${day?.nutrition?`<small>${ui.esc(goalText(day.nutrition))}</small>`:''}${target?`<small>已有目标：${ui.esc(goalText(target))}（保存排程不覆盖）</small>`:''}${day?.dietTemplate&&!dietTemplates.some(t=>t.id===day.dietTemplate!.id)?'<small>饮食模板已删除，不能实际应用</small>':''}</div><button type="button" class="text-btn" data-cycle-modify="${date}">修改</button></article>`}).join('')
      root.querySelectorAll<HTMLButtonElement>('[data-cycle-modify]').forEach(b=>b.addEventListener('click',()=>{selected=new Set([b.dataset.cycleModify!]);const index=getWeeks().findIndex(w=>w.includes(b.dataset.cycleModify!));weekHost.querySelector<HTMLDetailsElement>(`[data-cycle-week="${index}"]`)!.open=true;markSelection();root.querySelector<HTMLElement>('[data-cycle-assign]')!.focus({preventScroll:true})}))
      previewed=true;save.disabled=!!overlaps.length||!templateId||!!existing?.archivedAt; if(existing?.archivedAt)root.querySelectorAll<HTMLButtonElement>('[data-cycle-modify]').forEach(b=>b.disabled=true)
    }catch(e){error(root,e)}
  })
  save.addEventListener('click',async()=>{
    if(busy||!previewed)return;busy=true;save.disabled=true
    try{const template=templates.find(t=>t.id===templateId);if(!template)throw new Error('请先创建营养模板');await saveNutritionCycle({cycle:{id,name:formName.value.trim(),startDate:start,endDate:end,templateId,templateName:template.name},days},db,existing?.revision??null);if(!alive())return;ui.toast('周期排程已保存；实际摄入和每日目标保持不变');await ui.changed();if(back)back();else dialog.close()}
    catch(e){error(root,e);save.disabled=false}finally{busy=false}
  })
  root.querySelector('[data-cycle-archive]')?.addEventListener('click',async()=>{if(busy||!existing)return;busy=true;try{if(await ui.confirm('归档周期？','不再提供该周期的日期安排；已保存目标、饮食记录和历史快照保留。','归档周期')){await archiveNutritionCycle(existing.id,existing.revision);await ui.changed();back?.()}}catch(e){error(root,e)}finally{busy=false}})
  root.querySelector('[data-cycle-editor-back]')?.addEventListener('click',async()=>{if(busy)return;if((JSON.stringify(days)!==JSON.stringify(storedDays)||formName.value!==(existing?.name??'')||start!==(existing?.startDate??today)||end!==(existing?.endDate??shiftLocalDate(today,27)))&&!await ui.confirm('离开周期编辑？','尚未保存的排程会放弃。','放弃修改'))return;back?.()})
  drawDates();drawVariants();drawWeeks()
  if(existing?.archivedAt){root.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLSelectElement>('button,input,select').forEach(e=>{if(!e.hasAttribute('data-cycle-editor-back')&&!e.hasAttribute('data-cycle-preview'))e.disabled=true});root.querySelector('[data-cycle-preview-state]')!.textContent='已归档，仅供查看；历史事实保留。'}
}
export async function showScheduledTargetPreview(ui:StrategyUi,date:string):Promise<void>{
  const [plan,target]=await Promise.all([scheduledNutritionDay(date),db.nutritionTargets.where('date').equals(date).first()]);if(!plan?.day.nutrition)return
  const dialog=ui.openModal('应用排程营养目标',`<div class="nutrition-cycle"><p>${ui.esc(date)} · ${ui.esc(plan.cycle.name)} / ${ui.esc(plan.day.nutrition.variantName)}</p><p>${ui.esc(goalText(plan.day.nutrition))}</p>${target?`<p>已保存目标：${ui.esc(goalText(target))}</p><button type="button" class="secondary full-btn" data-cycle-keep-target>保留已保存目标</button>`:''}<p class="cycle-subtitle">仅确认后写入当天 NutritionTarget，不写入饮食记录。</p><p role="alert" data-cycle-error hidden></p><button type="button" class="primary full-btn" data-cycle-apply-target>${target?'覆盖当天目标':'应用当天目标'}</button></div>`)
  dialog.querySelector('[data-cycle-keep-target]')?.addEventListener('click',()=>dialog.close())
  let busy=false
  dialog.querySelector<HTMLButtonElement>('[data-cycle-apply-target]')!.addEventListener('click',async e=>{if(busy)return;busy=true;const b=e.currentTarget as HTMLButtonElement;b.disabled=true;try{await applyScheduledNutritionTarget(date,plan.day,true,JSON.stringify(target??null),db,plan.cycle.revision);dialog.close();await ui.changed();ui.toast('已应用当天排程目标')}catch(e){error(dialog,e);b.disabled=false}finally{busy=false}})
}
