import { db } from '../db/database'
import type { NutritionGoal, NutritionTarget } from '../db/types'
import { applyNutritionStrategyVariant, getNutritionStrategy, getNutritionStrategyForDate, type NutritionStrategyContext, type NutritionStrategyDefinition } from '../services/nutritionStrategyService'
import { getLocalDateString } from '../utils/date'
import { formatEnergyInputValue } from '../utils/energy'
import { formatNumber } from '../utils/nutrition'
import { createManagementWorkspace } from './managementWorkspace'
import { bindNumericPresentation } from './numericPresentation'
import { datePickerLabel } from './datePicker'
import { showNutritionStrategyActivation, showNutritionStrategyEditor, showNutritionStrategyManager, type StrategyUi } from './nutritionStrategies'

interface GoalDraft { selectedTemplateId: string | null }
const title = '设置当日营养目标'
function values(goal: NutritionGoal): string {
  return `<dl class="goal-value-grid">${(['calories','protein','carbs','fat'] as const).map((key,i)=>`<div><dt>${['热量','蛋白质','碳水','脂肪'][i]}</dt><dd>${goal[key] === undefined ? '未设' : `${key === 'calories' ? formatEnergyInputValue(goal[key]) : formatNumber(goal[key])} ${i ? 'g' : 'kcal'}`}</dd></div>`).join('')}</dl>`
}
function source(ui: StrategyUi, target: NutritionTarget): string {
  const s=target.strategySelection,c=target.cycleSelection
  return ui.esc(s ? `${s.templateName} · ${s.variantName}` : c ? `营养周期「${c.cycleName}」 · ${c.templateName} · ${c.variantName}` : target.sourceTemplateId ? '饮食模板' : '手动目标')
}
function error(dialog: HTMLDialogElement, value: unknown): void {
  const node=dialog.querySelector<HTMLElement>('[data-goal-error]')
  if(node){node.hidden=false;node.textContent=value instanceof Error?value.message:'暂时无法完成，请重试'}
}
const errorHtml='<p data-goal-error class="strategy-error" role="alert" hidden></p>'

/** Navigation owns only UI drafts. Definitions, phases and daily snapshots stay in existing services. */
export async function showGoalTemplatePicker(input: StrategyUi, date: string, draft: GoalDraft = { selectedTemplateId: null }): Promise<void> {
  let ui=input
  if(!ui.surface){
    const surface=createManagementWorkspace(ui.esc)
    surface.replace(title,'')
    ui={...ui,surface,openModal:(heading,body,wide)=>{const d=surface.open(heading,body,wide);bindNumericPresentation(d);return d}}
  }
  const surface=ui.surface!
  if(!surface.alive)return
  const dialog=ui.openModal(title,`<div class="nutrition-strategy" data-goal-picker><p class="strategy-note" role="status">正在读取营养模板…</p>${errorHtml}</div>`,true)
  const root=dialog.querySelector<HTMLElement>('[data-goal-picker]')!
  const fresh=()=>showGoalTemplatePicker(ui,date,draft)
  let loading=false
  try{
    const snapshot=await db.transaction('r',[db.nutritionStrategyTemplates,db.nutritionStrategyVariants,db.nutritionStrategyPhases,db.nutritionTargets],async()=>({templates:await db.nutritionStrategyTemplates.orderBy('updatedAt').reverse().toArray(),variants:await db.nutritionStrategyVariants.toArray(),context:await getNutritionStrategyForDate(date),target:await db.nutritionTargets.where('date').equals(date).first()}))
    if(!root.isConnected||!surface.alive)return
    const {templates,variants,context,target}=snapshot
    const available=templates.filter(t=>!t.archivedAt),archived=templates.filter(t=>t.archivedAt)
    if(!available.some(t=>t.id===draft.selectedTemplateId&&variants.some(v=>v.templateId===t.id)))draft.selectedTemplateId=null
    const row=(t:typeof templates[number])=>{
      const count=variants.filter(v=>v.templateId===t.id).length,current=!t.archivedAt&&context?.template.id===t.id
      const pressed=draft.selectedTemplateId===t.id
      return `<button type="button" class="secondary goal-template-row" data-goal-template="${ui.esc(t.id)}" aria-pressed="${pressed}" ${t.archivedAt||!count?'disabled':''}><span><strong>${ui.esc(t.name)}</strong><small>${count} 个日方案 · ${t.archivedAt?'已归档，不可应用':!count?'缺少日方案，请到管理中编辑':current?`${ui.esc(context!.phase.startDate)} 起已有使用阶段`:'这个日期尚未启用'}</small>${current?'<small class="goal-phase-note" data-goal-active>已有使用阶段，不代表本次选中</small>':''}</span><span class="goal-choice-state"><span class="goal-choice-circle" aria-hidden="true"></span><span class="goal-choice-text" aria-hidden="true">已选中</span></span></button>`
    }
    root.innerHTML=`<p class="strategy-note goal-date">${date===getLocalDateString()?'今天 · ':''}${ui.esc(datePickerLabel(date))}</p>${target?`<section class="strategy-saved" aria-label="当天已保存目标"><span>当天已保存 · ${source(ui,target)}</span>${values(target)}</section>`:`<p class="strategy-note" data-goal-unset>${date===getLocalDateString()?'今天':'该日期'}尚未设置营养目标</p>`}<section><h3 class="strategy-title">选择已有营养模板</h3><p class="strategy-note">点击选择，再次点击取消。本次选择不改变使用阶段或已保存目标。</p><div class="strategy-choices">${available.length?available.map(row).join(''):'<p class="strategy-note">还没有可用的营养模板，可先创建一个。</p>'}</div></section>${archived.length?`<details class="strategy-archive"><summary>已归档 · ${archived.length}</summary><div class="strategy-choices">${archived.map(row).join('')}</div></details>`:''}<button type="button" class="secondary full-btn" id="goal-template-create">＋ 新建营养模板</button><div class="strategy-links"><button type="button" class="sheet-link" id="strategy-custom">手动设置当日目标</button><button type="button" class="sheet-link" id="strategy-manage">管理营养模板</button></div><p class="strategy-note">模板保存、启用和应用目标是三个独立操作。其他日期目标、周期排程和实际健康记录保持不变。</p>${errorHtml}`
    root.querySelector('#strategy-custom')!.addEventListener('click',()=>{if(!loading){dialog.close();ui.manual(date,target)}})
    root.querySelector('#strategy-manage')!.addEventListener('click',()=>{if(!loading)void showNutritionStrategyManager(ui,()=>void fresh())})
    root.querySelector('#goal-template-create')!.addEventListener('click',()=>{if(!loading)showNutritionStrategyEditor(ui,undefined,undefined,false,{back:()=>void fresh(),saved:async()=>{await fresh()},backLabel:title})})
    const footer=document.createElement('div')
    footer.className='sheet-footer nutrition-goal-footer'
    footer.innerHTML='<p class="sr-only" role="status" data-goal-selection-status></p><button type="button" class="primary full-btn" id="goal-template-continue">继续选择日方案</button>'
    dialog.append(footer)
    surface.onSuspend(()=>footer.remove());surface.onDispose(()=>footer.remove())
    const next=footer.querySelector<HTMLButtonElement>('#goal-template-continue')!
    const sync=()=>{
      root.querySelectorAll<HTMLButtonElement>('[data-goal-template]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.goalTemplate===draft.selectedTemplateId)))
      next.disabled=!draft.selectedTemplateId||loading
      footer.querySelector('[data-goal-selection-status]')!.textContent=draft.selectedTemplateId?'已选中营养模板，可继续选择日方案':'尚未选择营养模板'
    }
    root.querySelectorAll<HTMLButtonElement>('[data-goal-template]:not(:disabled)').forEach(button=>button.addEventListener('click',()=>{
      if(loading)return
      draft.selectedTemplateId=draft.selectedTemplateId===button.dataset.goalTemplate?null:button.dataset.goalTemplate!
      sync()
    }))
    sync()
    next.addEventListener('click',async()=>{
      if(loading||!draft.selectedTemplateId)return
      loading=true;sync()
      try{
        const value=await getNutritionStrategy(draft.selectedTemplateId)
        if(!root.isConnected||!surface.alive)return
        if(!value||value.template.archivedAt||!value.variants.length)throw new Error('模板已变化，请重新打开选择器')
        const selectedContext=await getNutritionStrategyForDate(date)
        if(!root.isConnected||!surface.alive)return
        if(selectedContext?.template.id===value.template.id)await showVariants(ui,date,selectedContext,draft)
        else await showNutritionStrategyActivation(ui,value,undefined,{date:date>getLocalDateString()?getLocalDateString():date,back:()=>void fresh(),activated:async()=>{
          const active=await getNutritionStrategyForDate(date)
          if(active?.template.id!==value.template.id)throw new Error('所选日期不在新阶段内，请返回重新选择')
          await showVariants(ui,date,active,draft)
        }})
      }catch(e){if(root.isConnected)error(dialog,e)}finally{loading=false;if(root.isConnected)sync()}
    })
    surface.restoreScroll()
    // Register after the async read: workspace restore iterates the current resume Set.
    // Synchronously replacing/re-registering within that iteration would re-enter indefinitely.
    surface.onResume(()=>{if(root.isConnected)void fresh()})
  }catch(e){if(root.isConnected){root.innerHTML=`${errorHtml}<button type="button" class="secondary" data-goal-retry>重新读取</button>`;error(dialog,e);root.querySelector('[data-goal-retry]')!.addEventListener('click',()=>void fresh())}}
}

async function showVariants(ui: StrategyUi,date: string,context: NutritionStrategyContext,draft: GoalDraft): Promise<void> {
  const existing=await db.nutritionTargets.where('date').equals(date).first()
  if(!ui.surface?.alive)return
  const selection=existing?.strategySelection
  const dialog=ui.openModal('选择日方案',`<div class="nutrition-strategy" data-goal-variants><p class="strategy-note">${ui.esc(datePickerLabel(date))} · ${ui.esc(context.template.name)}</p>${existing?`<section class="strategy-saved" aria-label="当天已保存目标"><span>当天已保存 · ${source(ui,existing)}</span>${values(existing)}</section>`:''}<div class="strategy-choices">${context.variants.map(v=>`<button type="button" class="secondary strategy-choice" data-strategy-choice="${ui.esc(v.id)}" aria-pressed="${selection?.templateId===v.templateId&&selection.variantId===v.id}"><span class="strategy-variant-name">${ui.esc(v.name)}</span>${values(v)}<span class="strategy-choice-mark">预览并确认当天目标</span></button>`).join('')}</div><div class="strategy-links"><button type="button" class="sheet-link" id="strategy-custom">手动设置当日目标</button></div>${errorHtml}</div>`,true)
  const root=dialog.querySelector('[data-goal-variants]')!
  ui.surface.setBackTarget(()=>void showGoalTemplatePicker(ui,date,draft),title)
  root.querySelector('#strategy-custom')!.addEventListener('click',()=>{dialog.close();ui.manual(date,existing)})
  root.querySelectorAll<HTMLButtonElement>('[data-strategy-choice]').forEach(button=>button.addEventListener('click',()=>{
    const variant=context.variants.find(v=>v.id===button.dataset.strategyChoice)!
    showPreview(ui,date,context,variant,draft,existing)
  }))
}

function showPreview(ui: StrategyUi,date: string,context: NutritionStrategyContext,variant: NutritionStrategyDefinition['variants'][number],draft: GoalDraft,existing?: NutritionTarget): void {
  const dialog=ui.openModal('确认应用营养目标',`<div class="nutrition-strategy" data-goal-preview><p class="strategy-note">${ui.esc(datePickerLabel(date))}</p><h3 class="strategy-title">${ui.esc(context.template.name)} · ${ui.esc(variant.name)}</h3>${existing?`<section class="strategy-saved"><span>已保存 · ${source(ui,existing)}</span>${values(existing)}</section>`:''}<section class="strategy-saved"><span>将应用</span>${values(variant)}</section><p class="strategy-note">确认后仅${existing?'替换':'设置'} ${ui.esc(date)} 的目标快照。其他日期、周期排程及实际健康记录不变。</p>${errorHtml}<button type="button" class="primary full-btn" id="strategy-apply">${existing?'确认替换当天目标':'应用到当天'}</button><button type="button" class="sheet-link" data-goal-reselect>重新选择模板</button></div>`,true)
  let busy=false
  const button=dialog.querySelector<HTMLButtonElement>('#strategy-apply')!
  dialog.querySelector('[data-goal-reselect]')!.addEventListener('click',()=>{if(!busy)void showGoalTemplatePicker(ui,date,draft)})
  button.addEventListener('click',async()=>{
    if(busy)return
    busy=true;button.disabled=true
    try{await applyNutritionStrategyVariant(date,variant.id,db,{context,variant,existing});dialog.close();ui.toast('已应用当日营养目标');await ui.changed()}
    catch(e){busy=false;button.disabled=false;error(dialog,e)}
  })
}
