import { showGoalTemplatePicker } from './nutritionGoalPicker'
import { showNutritionCascadeDeletion } from './nutritionStrategyCascade'
import { previewNutritionStrategyCascade, nutritionCascadeLabels } from '../services/nutritionStrategyCascadeService'
import { showNutritionCycles } from './nutritionCycles'
import { observeManagerCatalog } from './observeManagerCatalog'
import { managerToolbarHtml, managerListHtml, managerRowHtml, managerEmptyHtml, managerSectionHtml } from './managerPrimitives'
import type { ManagedSurfaceContext } from './managementWorkspace'
import { animateMotion, stabilizeSheetSubview } from './motion'
import type { NutritionGoal, NutritionTarget, NutritionStrategyPhase, NutritionStrategyVariant } from '../db/types'
import { db } from '../db/database'
import { activateNutritionStrategy, nutritionPhaseFingerprint, archiveNutritionStrategy, previewNutritionStrategyDeletion, endNutritionStrategyPhase, duplicateNutritionStrategy, getNutritionPhaseSummary, getNutritionStrategy, saveNutritionStrategy, type NutritionStrategyDefinition, type StrategyDraft } from '../services/nutritionStrategyService'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { formatNumber } from '../utils/nutrition'
import { formatEnergyInputValue } from '../utils/energy'
import { setSheetVariant } from './sheetController'
import { bindNumericPresentation } from './numericPresentation'
import { mountDatePicker, datePickerLabel } from './datePicker'

export interface StrategyUi {
  surface?: ManagedSurfaceContext

  openModal(title: string, body: string, wide?: boolean): HTMLDialogElement
  esc(value: unknown): string
  goalFields(goal?: NutritionGoal): string
  goalFromForm(data: FormData): NutritionGoal | undefined
  manual(date: string, target?: NutritionTarget): void
  changed(): Promise<void>
  toast(message: string): void
  confirm(title: string, message: string, action?: string, danger?: boolean): Promise<boolean>
}
const isOpen = (dialog: HTMLDialogElement) => dialog.isConnected && dialog.open
function errorHtml(): string { return '<p class="strategy-error" role="alert" hidden></p>' }
function reportError(dialog: HTMLDialogElement, error: unknown): void {
  const node = dialog.querySelector<HTMLElement>('.strategy-error')
  if (node) { node.hidden = false; node.textContent = error instanceof Error ? error.message : '暂时无法完成，请重试' }
}
function amountHtml(goal: NutritionGoal): string {
  const calories = goal.calories === undefined ? '未设热量目标' : `${formatEnergyInputValue(goal.calories)} kcal`
  return `<span class="strategy-energy">${calories}</span><span class="strategy-macros">${(['protein','carbs','fat'] as const).map((key,i)=>`<span>${['蛋白质','碳水','脂肪'][i]} ${goal[key] === undefined ? '未设' : `${formatNumber(goal[key])}g`}</span>`).join('')}</span>`
}
function variantContent(ui: StrategyUi, variant: Partial<NutritionStrategyVariant>): string {
  return `<span class="strategy-variant-name">${ui.esc(variant.name)}</span>${amountHtml(variant)}`
}
async function phaseHtml(ui: StrategyUi, phase: NutritionStrategyPhase, definitionName: string): Promise<string> {
  const summary = await getNutritionPhaseSummary(phase)
  const weight = !summary.count ? '暂无阶段内体重记录' : summary.count === 1 ? `${formatNumber(summary.first!.weightKg)} kg · 仅 1 条记录，暂无法计算变化` : `${formatNumber(summary.first!.weightKg)} kg → ${formatNumber(summary.last!.weightKg)} kg`
  const change = summary.change === undefined ? '' : `<span>变化 ${summary.change > 0 ? '+' : ''}${formatNumber(summary.change)} kg · ${summary.count} 条实际记录</span>`
  return `<section class="strategy-phase" data-phase-id="${ui.esc(phase.id)}"><h3>${phase.endDate ? '历史阶段' : '当前阶段'}</h3>${phase.templateName !== definitionName ? `<p>启用时名称 · ${ui.esc(phase.templateName)}</p>` : ''}<p>${phase.startDate} ${phase.endDate ? `至 ${phase.endDate}` : '至今'} · 已使用 ${summary.days} 天</p><div class="strategy-weight"><strong>${weight}</strong>${change}</div></section>`
}

export async function showNutritionStrategyPicker(ui: StrategyUi, date: string, target?: NutritionTarget): Promise<void> {
  void target // The picker always rereads the selected date from the real database.
  await showGoalTemplatePicker(ui,date)
}

export async function showNutritionStrategyManager(ui: StrategyUi, back?: ()=>void): Promise<void> {
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('营养模板',`<div class="manager-surface" id="strategy-manager"><p role="status" class="strategy-note">正在读取营养模板…</p></div>`)
  const managerRoot=dialog.querySelector<HTMLElement>('#strategy-manager')!
  try{
    const [templates,phases]=await Promise.all([db.nutritionStrategyTemplates.orderBy('updatedAt').reverse().toArray(),db.nutritionStrategyPhases.orderBy('startDate').reverse().toArray()])
    const active=phases.find(p=>!p.endDate),current=templates.find(t=>t.id===active?.templateId)
    const previews=await Promise.all(templates.map(t=>previewNutritionStrategyDeletion(t.id)))
    const row=(t:typeof templates[number])=>{
      const p=previews.find(p=>p.id===t.id)!,activeTemplate=t.id===current?.id&&active
      const status=activeTemplate?`当前使用 · ${ui.esc(active.startDate)} 起`:t.archivedAt?'已归档':p.canDelete?'无历史引用':'有历史或周期引用'
      const main=managerRowHtml(ui.esc(t.name),`${p.variants} 个日方案 · ${status}`,`data-strategy-detail="${ui.esc(t.id)}"`)
      const actions=`<div class="strategy-manager-row-actions"><button type="button" class="secondary danger" data-delete-strategy="${ui.esc(t.id)}">删除模板</button><button type="button" class="secondary" data-strategy-reference="${ui.esc(t.id)}">${p.canDelete||activeTemplate?'查看详情':'查看引用'}</button></div>`
      return main.replace(/<\/div>$/,actions+'</div>')
    }
    const currentHtml=current&&active?managerSectionHtml('当前使用',managerListHtml(row(current))):''
    if(!isOpen(dialog)||!managerRoot.isConnected)return
    if (!ui.surface) setSheetVariant(dialog,templates.length>2?'large':'content')
    const available=templates.filter(t=>t.id!==current?.id&&!t.archivedAt),archived=templates.filter(t=>t.archivedAt)
    dialog.querySelector('#strategy-manager')!.innerHTML=`${back?'<button type="button" class="sheet-link" id="strategy-manager-back">返回当日目标</button>':''}${managerToolbarHtml(`${templates.length} 个模板`,'strategy-create','营养模板',!templates.length)}<p class="manager-section-note">一个模板包含多个日目标方案，每天选择一个。切换模板不改写已保存目标。</p>${templates.length?`${currentHtml}${available.length?managerSectionHtml(current?'其他模板':'可用模板',managerListHtml(available.map(row).join(''))):''}${archived.length?`<details class="strategy-archive manager-section"><summary>已归档 · ${archived.length}</summary>${managerListHtml(archived.map(row).join(''))}</details>`:''}`:managerEmptyHtml('营养模板','把训练日、休息日等目标放在同一模板中，每天选一个。','strategy-empty-create')}<button type="button" class="secondary full-btn" id="strategy-cycles">营养周期排程</button>${errorHtml()}`

    dialog.querySelectorAll<HTMLButtonElement>('[data-delete-strategy]').forEach(b=>b.addEventListener('click',()=>void showNutritionCascadeDeletion(ui,b.dataset.deleteStrategy!,()=>void showNutritionStrategyManager(ui,back),()=>void showNutritionStrategyManager(ui,back),b)))
    dialog.querySelectorAll<HTMLButtonElement>('[data-strategy-reference]').forEach(b=>b.addEventListener('click',()=>{void showNutritionStrategyDetail(ui,b.dataset.strategyReference!,back).catch(e=>reportError(dialog,e))}))
    dialog.querySelector('#strategy-cycles')!.addEventListener('click',()=>void showNutritionCycles(ui,()=>void showNutritionStrategyManager(ui,back)))
    observeManagerCatalog(ui.surface,managerRoot,['nutritionStrategyTemplates','nutritionStrategyVariants','nutritionStrategyPhases','nutritionTargets','nutritionCycles','nutritionCycleDays'],()=>showNutritionStrategyManager(ui,back))
    ui.surface?.restoreScroll()
    dialog.querySelector('#strategy-empty-create')?.addEventListener('click',()=>showNutritionStrategyEditor(ui,undefined,back))
    dialog.querySelector('#strategy-create')!.addEventListener('click',()=>showNutritionStrategyEditor(ui,undefined,back))
    dialog.querySelector('#strategy-manager-back')?.addEventListener('click',back!)
    dialog.querySelectorAll<HTMLButtonElement>('[data-strategy-detail]').forEach(b=>b.addEventListener('click',async()=>{const definition=await getNutritionStrategy(b.dataset.strategyDetail!);if(definition&&b.isConnected)showNutritionStrategyEditor(ui,{id:definition.template.id,name:definition.template.name,variants:definition.variants},back)}))
    dialog.querySelectorAll<HTMLButtonElement>('[data-strategy-copy]').forEach(b=>b.addEventListener('click',async()=>{try{const definition=await getNutritionStrategy(b.dataset.strategyCopy!);if(definition)showNutritionStrategyEditor(ui,duplicateNutritionStrategy(definition),back,true)}catch(e){reportError(dialog,e)}}))
  }catch(e){if(isOpen(dialog)&&managerRoot.isConnected){dialog.querySelector('#strategy-manager')!.innerHTML=`${errorHtml()}<button class="secondary" id="strategy-retry">重试</button>`;reportError(dialog,e);dialog.querySelector('#strategy-retry')!.addEventListener('click',()=>void showNutritionStrategyManager(ui,back))}}
}

export async function showNutritionStrategyDetail(ui: StrategyUi, id: string, back?:()=>void): Promise<void> {
  const value=await getNutritionStrategy(id)
  if(!value)return
  const phases=(await db.nutritionStrategyPhases.where('templateId').equals(id).toArray()).sort((a,b)=>b.startDate.localeCompare(a.startDate)),active=phases.some(p=>!p.endDate)
  const summaries=await Promise.all(phases.map(p=>phaseHtml(ui,p,value.template.name)))
  const deletion=await previewNutritionStrategyCascade(id)
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('营养模板详情',`<div class="nutrition-strategy"><button type="button" class="sheet-link" id="strategy-detail-back">返回模板管理</button><h3 class="strategy-title">${ui.esc(value.template.name)}</h3><p class="strategy-note">${active?'当前使用':value.template.archivedAt?'已归档，历史目标和阶段仍保留':'尚未启用或已结束使用'} · ${value.variants.length} 个日方案</p><section class="strategy-delete-entry"><button type="button" class="secondary danger full-btn" id="strategy-delete">删除模板及关联数据</button><p class="strategy-note">永久删除本模板及六类归属对象，并按全部使用阶段与周期的日期并集删除健康记录及所有每日目标。任务、共享资料及区间外事实保留；下一步会列出准确日期和逐类计数。</p><details class="strategy-impact"><summary>查看关联来源 · ${deletion.total} 项对象</summary><ul>${deletion.details.map(row=>`<li><strong>${ui.esc(nutritionCascadeLabels[row.category])} · ${ui.esc(row.label)}</strong>${row.date?`<span>${ui.esc(row.date)}</span>`:''}<small>${ui.esc(row.id)}</small></li>`).join('')}</ul></details></section>${summaries.join('')}<section><h3>日方案</h3><div class="strategy-list">${value.variants.map(v=>`<article class="strategy-variant-card">${variantContent(ui,v)}</article>`).join('')}</div></section>${errorHtml()}${!value.template.archivedAt&&!active?'<button type="button" class="primary full-btn" id="strategy-activate-open">启用此模板</button>':''}<button type="button" class="${active?'primary':'secondary'} full-btn" id="strategy-detail-copy">复制为新模板</button>${value.template.archivedAt?'':'<button type="button" class="secondary full-btn" id="strategy-edit">编辑模板</button>'}${!active&&!value.template.archivedAt?'<button type="button" class="secondary full-btn" id="strategy-archive">归档模板</button>':''}${active?'<button type="button" class="secondary full-btn" id="strategy-end-phase">结束当前阶段</button>':''}<p class="strategy-note">编辑只影响以后再次选择的方案；已保存的每日目标和来源名称保持不变。调整策略时可复制成新版本。</p></div>`,true)
  dialog.querySelector<HTMLButtonElement>('#strategy-delete')?.addEventListener('click',e=>void showNutritionCascadeDeletion(ui,id,()=>void showNutritionStrategyDetail(ui,id,back),()=>void showNutritionStrategyManager(ui,back),e.currentTarget as Element))
  dialog.querySelector('#strategy-end-phase')?.addEventListener('click',async()=>{const phase=phases.find(p=>!p.endDate);if(!phase||!await ui.confirm('结束当前阶段？','只停止今后的使用，阶段历史、已保存目标和实际健康记录保留。','结束阶段',false))return;try{await endNutritionStrategyPhase(phase.id,JSON.stringify(phase));ui.toast('当前阶段已结束，历史保留');await ui.changed();if(isOpen(dialog))await showNutritionStrategyDetail(ui,id,back)}catch(e){reportError(dialog,e)}})
  dialog.querySelector('#strategy-detail-back')!.addEventListener('click',()=>void showNutritionStrategyManager(ui,back))
  dialog.querySelector('#strategy-detail-copy')!.addEventListener('click',()=>showNutritionStrategyEditor(ui,duplicateNutritionStrategy(value),back,true))
  dialog.querySelector('#strategy-edit')?.addEventListener('click',()=>showNutritionStrategyEditor(ui,{id:value.template.id,name:value.template.name,variants:structuredClone(value.variants)},back))
  dialog.querySelector('#strategy-activate-open')?.addEventListener('click',()=>void showNutritionStrategyActivation(ui,value,back))
  dialog.querySelector('#strategy-archive')?.addEventListener('click',async()=>{if(!await ui.confirm('归档营养模板？','不再提供启用；历史阶段、每日目标和来源快照完整保留。','归档模板',false))return;try{await archiveNutritionStrategy(id);ui.toast('模板已归档');await showNutritionStrategyManager(ui,back)}catch(e){reportError(dialog,e)}})
}

export interface StrategyEditorFlow { back(): void; saved(): Promise<void>; backLabel: string }
export function showNutritionStrategyEditor(ui: StrategyUi, source?: StrategyDraft, back?:()=>void, copy=false, flow?:StrategyEditorFlow): void {
  const draft: StrategyDraft=source?structuredClone(source):{name:'',variants:[]}
  const initialDraft = JSON.stringify(draft)
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal(copy?'复制为新模板':source?'编辑营养模板':'新建营养模板',`<div class="nutrition-strategy"><div id="strategy-editor-root"><button type="button" class="sheet-link" id="strategy-editor-back">返回模板管理</button><form id="strategy-template-form" class="form manager-editor"><label>模板名称<input name="name" maxlength="80" value="${ui.esc(draft.name)}" placeholder="例如：减脂策略 V1" required></label><section><div class="strategy-editor-heading"><h3>日方案</h3><span id="strategy-variant-count"></span></div><p class="strategy-note">可以自定义名称；每天从这些方案中选一个。</p><div class="strategy-list" id="strategy-editor-variants"></div></section><button type="button" class="secondary full-btn" id="strategy-add-variant">添加日方案</button>${errorHtml()}<button type="submit" class="primary full-btn" id="strategy-save">保存营养模板</button><p class="strategy-note">保存后不会自动启用，也不会改变已保存的每日目标。</p></form></div><div id="strategy-variant-subview" hidden></div></div>`,true)
  const root=dialog.querySelector<HTMLElement>('#strategy-editor-root')!,sub=dialog.querySelector<HTMLElement>('#strategy-variant-subview')!,form=dialog.querySelector<HTMLFormElement>('#strategy-template-form')!
  // This editor always owns a large frame; never freeze a keyboard-constrained pixel height.
  setSheetVariant(dialog,'large');dialog.style.removeProperty('height')
  const footer=document.createElement('footer');footer.className='sheet-footer nutrition-strategy-footer'
  const save=dialog.querySelector<HTMLButtonElement>('#strategy-save')!;save.setAttribute('form','strategy-template-form');footer.append(save);dialog.append(footer)
  const body=dialog.querySelector<HTMLElement>('.modal-body')!
  const placeFooter=()=>{
    if(!isOpen(dialog)||!root.isConnected)return
    const current=sub.hidden?root:sub
    const fields=[...current.querySelectorAll<HTMLInputElement>('input')].filter(e=>e.getClientRects().length)
    const required=Math.max(44,...fields.map(e=>e.getBoundingClientRect().height+24),...fields.map(e=>(e.closest('label')?.getBoundingClientRect().height??0)+12))
    const handle=dialog.querySelector<HTMLElement>('.sheet-handle')!,handleStyle=getComputedStyle(handle),style=getComputedStyle(dialog)
    const available=dialog.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-dialog.querySelector('.modal-head')!.getBoundingClientRect().height-handle.getBoundingClientRect().height-parseFloat(handleStyle.marginTop)-parseFloat(handleStyle.marginBottom)-footer.getBoundingClientRect().height
    const scroll=available<required
    const parent=scroll?body:dialog,active=document.activeElement
    const keepFocus=active instanceof HTMLElement&&footer.contains(active)
    footer.toggleAttribute('data-scroll-footer',scroll)
    if(footer.parentElement!==parent){
      parent.append(footer)
      if(keepFocus&&active.isConnected)active.focus({preventScroll:true})
      // The shared coordinator has already applied the viewport. Correct only the local
      // body after reparenting the footer; no window scroll or private viewport state.
      if(active instanceof HTMLInputElement&&body.contains(active)){
        const field=active.getBoundingClientRect(),bounds=body.getBoundingClientRect(),gap=Math.min(12,Math.max(0,(bounds.height-field.height)/2))
        if(field.top<bounds.top+gap)body.scrollTop+=field.top-bounds.top-gap
        else if(field.bottom>bounds.bottom-gap)body.scrollTop+=field.bottom-bounds.bottom+gap
      }
    }
  }
  const attachFooter=()=>{if(isOpen(dialog)){dialog.append(footer);placeFooter()}}
  ui.surface?.onSuspend(()=>footer.remove());ui.surface?.onResume(attachFooter)
  let returnFromVariant: ((saved?:boolean)=>Promise<void>)|undefined,busy=false,variantDirty=()=>false
  const events = new AbortController()
  document.addEventListener('fitlog-viewport-change',placeFooter,{signal:events.signal})
  const cleanup=()=>{events.abort();footer.remove();dialog.style.removeProperty('height')}
  ui.surface?.onDispose(cleanup);if(!ui.surface)dialog.addEventListener('close',cleanup,{once:true})
  const syncName=()=>{draft.name=(form.elements.namedItem('name') as HTMLInputElement).value}
  const draw=()=>{
    dialog.querySelector('#strategy-variant-count')!.textContent=`${draft.variants.length} / 32`
    dialog.querySelector('#strategy-editor-variants')!.innerHTML=draft.variants.map((v,i)=>`<article class="strategy-variant-card" data-strategy-variant="${ui.esc(v.id)}">${variantContent(ui,v)}<div class="strategy-variant-actions"><button type="button" class="secondary" data-variant-edit="${i}">编辑</button><button type="button" class="icon-btn quiet" data-variant-move="${i}" data-direction="-1" aria-label="上移 ${ui.esc(v.name)}" ${i===0?'disabled':''}>↑</button><button type="button" class="icon-btn quiet" data-variant-move="${i}" data-direction="1" aria-label="下移 ${ui.esc(v.name)}" ${i===draft.variants.length-1?'disabled':''}>↓</button><button type="button" class="icon-btn quiet danger" data-variant-remove="${i}" aria-label="移除 ${ui.esc(v.name)}">×</button></div></article>`).join('')||'<p class="strategy-note">先添加一个日方案，不需要一次填完所有目标。</p>'
    dialog.querySelector<HTMLButtonElement>('#strategy-add-variant')!.disabled=draft.variants.length>=32
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-edit]').forEach(b=>b.addEventListener('click',()=>edit(Number(b.dataset.variantEdit))))
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-move]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.variantMove),next=i+Number(b.dataset.direction);if(next<0||next>=draft.variants.length)return;const [v]=draft.variants.splice(i,1);draft.variants.splice(next,0,v!);draw()}))
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-remove]').forEach(b=>b.addEventListener('click',async()=>{if(!await ui.confirm('移除日方案？','保存模板后不再提供这个方案。已应用的每日目标和名称快照保持不变。','移除方案'))return;draft.variants.splice(Number(b.dataset.variantRemove),1);draw()}))
    placeFooter()
  }
  const edit=(index?:number)=>{
    syncName();const value=index===undefined?undefined:draft.variants[index]
    const parentScroll=dialog.querySelector('.modal-body')!.scrollTop
    dialog.style.removeProperty('height');setSheetVariant(dialog,'large');root.hidden=true;sub.hidden=false
    sub.innerHTML=`<button type="button" class="sheet-link" id="strategy-variant-back">返回模板编辑</button><form id="strategy-variant-form" class="form"><label>方案名称<input name="variantName" maxlength="80" value="${ui.esc(value?.name??'')}" placeholder="例如：训练日" required></label>${ui.goalFields(value)}${errorHtml()}<button type="submit" class="primary full-btn">保存日方案</button></form>`
    const heading=dialog.querySelector('h2')!;heading.textContent=value?'编辑日方案':'添加日方案';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=0
    animateMotion(sub,'subview');bindNumericPresentation(sub)
    ui.surface?.setBackTarget(() => void returnFromVariant?.(), copy?'复制为新模板':source?'编辑营养模板':'新建营养模板')
    heading.textContent=value?'编辑日方案':'添加日方案';heading.focus({preventScroll:true})
    const variantForm=sub.querySelector<HTMLFormElement>('#strategy-variant-form')!
    const initialVariant=JSON.stringify([...new FormData(variantForm)])
    variantDirty=()=>JSON.stringify([...new FormData(variantForm)])!==initialVariant
    const variantSave=variantForm.querySelector<HTMLButtonElement>('[type=submit]')!;variantSave.setAttribute('form','strategy-variant-form');footer.append(variantSave);save.hidden=true
    placeFooter()
    let returning=false
    returnFromVariant=async(saved=false)=>{
      if(returning)return;returning=true
      if(!saved&&variantDirty()&&!await ui.confirm('放弃未保存的日方案？','返回后未保存的日方案修改会放弃。','放弃修改',false)){returning=false;return}
      if(!isOpen(dialog))return
      ui.surface?.setBackTarget(() => (dialog.querySelector('#strategy-editor-back') as HTMLButtonElement)?.click(),flow?.backLabel)
      heading.focus({preventScroll:true});variantSave.remove();save.hidden=false;sub.hidden=true;sub.innerHTML='';root.hidden=false
      dialog.style.removeProperty('height');setSheetVariant(dialog,'large')
      heading.textContent=copy?'复制为新模板':source?'编辑营养模板':'新建营养模板'
      dialog.querySelector('.modal-body')!.scrollTop=parentScroll;animateMotion(root,'back');returnFromVariant=undefined;variantDirty=()=>false
      placeFooter()
    }
    sub.querySelector('#strategy-variant-back')!.addEventListener('click',()=>returnFromVariant?.())
    let variantSaving=false
    sub.querySelector<HTMLFormElement>('#strategy-variant-form')!.addEventListener('submit',event=>{
      event.preventDefault();if(variantSaving)return;variantSaving=true;try{const data=new FormData(event.currentTarget as HTMLFormElement),goal=ui.goalFromForm(data);if(!goal)throw new Error('请至少填写一项营养目标');const next={id:value?.id??crypto.randomUUID(),name:String(data.get('variantName')??'').trim(),...goal};if(!next.name)throw new Error('请填写方案名称');if(index===undefined)draft.variants.push(next);else draft.variants[index]=next;void returnFromVariant?.(true).then(draw)}catch(e){variantSaving=false;const node=sub.querySelector<HTMLElement>('.strategy-error')!;node.hidden=false;node.textContent=e instanceof Error?e.message:'请检查填写内容'}
    })
  }
  const hasDraft=()=>{syncName();return JSON.stringify(draft)!==initialDraft||variantDirty()}
  let confirming=false
  const mayLeave=async()=>{
    if(busy||confirming)return false
    confirming=true
    const yes=!hasDraft()||await ui.confirm('离开模板编辑？','未保存的模板和日方案修改会放弃。','放弃修改',false)
    confirming=false;return yes&&isOpen(dialog)
  }
  dialog.addEventListener('cancel',event=>{if(!root.isConnected)return;event.preventDefault();event.stopImmediatePropagation();if(returnFromVariant)void returnFromVariant();else (dialog.querySelector('#strategy-editor-back') as HTMLButtonElement).click()}, { capture:true,signal: events.signal })
  dialog.addEventListener('click',event=>{const target=event.target as Element;if(target===dialog||target.closest('[data-close]')){event.preventDefault();event.stopImmediatePropagation();void mayLeave().then(yes=>{if(yes)dialog.close()})}}, {capture:true,signal:events.signal})
  ui.surface?.setBackTarget(() => (dialog.querySelector('#strategy-editor-back') as HTMLButtonElement)?.click(), flow?.backLabel)
  dialog.querySelector('#strategy-editor-back')!.textContent=`返回${flow?.backLabel??'模板管理'}`
  dialog.querySelector('#strategy-editor-back')!.addEventListener('click',async()=>{if(!await mayLeave())return;if(flow)flow.back();else if(ui.surface)ui.surface.back();else void showNutritionStrategyManager(ui,back)})
  dialog.querySelector('#strategy-add-variant')!.addEventListener('click',()=>edit())
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;syncName();busy=true;const button=dialog.querySelector<HTMLButtonElement>('#strategy-save')!;button.disabled=true;try{const saved=await saveNutritionStrategy(draft);ui.toast('营养模板已保存');if(flow)await flow.saved();else{ui.surface?.back();await showNutritionStrategyDetail(ui,saved.template.id,back)}}catch(e){busy=false;button.disabled=false;reportError(dialog,e)}})
  if(source?.id){
    const detail=document.createElement('button');detail.type='button';detail.className='text-btn';detail.id='strategy-show-detail';detail.textContent='查看阶段与详情'
    form.append(detail);detail.addEventListener('click',()=>void showNutritionStrategyDetail(ui,source.id!,back))
  }
  draw()
}

export interface StrategyActivationFlow { date: string; back():void; activated():Promise<void> }
export async function showNutritionStrategyActivation(ui: StrategyUi, value: NutritionStrategyDefinition, back?:()=>void, flow?:StrategyActivationFlow): Promise<void> {
  const phases=await db.nutritionStrategyPhases.orderBy('startDate').reverse().toArray(),active=phases.find(p=>!p.endDate)
  let date=flow?.date??getLocalDateString(),busy=false,dateController:ReturnType<typeof mountDatePicker>|undefined
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('启用营养模板',`<div class="nutrition-strategy"><div id="strategy-activation-root"><button type="button" class="sheet-link" id="strategy-activation-back">返回模板详情</button><h3 class="strategy-title">${ui.esc(value.template.name)}</h3><p class="strategy-note">从选定日期开始，每天手动选择一个日方案。</p><p class="strategy-note">开始日期</p><button type="button" class="secondary fitlog-date-trigger full-btn" id="strategy-start-date"></button><p class="strategy-activation-preview" role="status"></p><p class="strategy-note">已有每日目标保持不变，启用本身不会生成或替换当天目标。</p>${errorHtml()}<button type="button" class="primary full-btn" id="strategy-activate-confirm">确认启用</button></div><div id="strategy-date-subview" hidden></div></div>`)
  const root=dialog.querySelector<HTMLElement>('#strategy-activation-root')!,host=dialog.querySelector<HTMLElement>('#strategy-date-subview')!,heading=dialog.querySelector('h2')!
  const draw=()=>{dialog.querySelector('#strategy-start-date')!.textContent=datePickerLabel(date);dialog.querySelector('#strategy-start-date')!.setAttribute('aria-label',`开始日期 ${datePickerLabel(date)}`);dialog.querySelector('.strategy-activation-preview')!.textContent=`从 ${date} 开始使用「${value.template.name}」。${active?`上一模板「${active.templateName}」阶段将结束于 ${shiftLocalDate(date,-1)}。`:'这是第一个营养模板阶段。'}`}
  let parentScroll=0
  const closeDate=()=>{ui.surface?.setBackTarget();dateController?.destroy();dateController=undefined;host.hidden=true;host.innerHTML='';root.hidden=false;heading.textContent='启用营养模板';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=parentScroll;animateMotion(root,'back')}
  const events = new AbortController(); ui.surface?.onDispose(() => { events.abort(); dateController?.destroy() })
  dialog.addEventListener('cancel',event=>{if(dateController){event.preventDefault();closeDate()}}, { signal: events.signal });if(!ui.surface)dialog.addEventListener('close',()=>dateController?.destroy())
  dialog.querySelector('#strategy-start-date')!.addEventListener('click',()=>{if(busy)return;parentScroll=dialog.querySelector('.modal-body')!.scrollTop;stabilizeSheetSubview(dialog);root.hidden=true;host.hidden=false;animateMotion(host,'subview');heading.textContent='选择开始日期';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=0;ui.surface?.setBackTarget(closeDate, '启用营养模板');dateController=mountDatePicker(host,{value:date,onConfirm:next=>{date=next!;closeDate();draw()},onCancel:closeDate})})
  ui.surface?.setBackTarget(flow?()=>{if(!busy)flow.back()}:undefined,flow?'设置当日营养目标':undefined)
  dialog.querySelector('#strategy-activation-back')!.textContent=flow?'返回当日目标':'返回模板详情'
  dialog.querySelector('#strategy-activation-back')!.addEventListener('click',()=>{if(!busy){if(flow)flow.back();else void showNutritionStrategyDetail(ui,value.template.id,back)}})
  dialog.querySelector('#strategy-activate-confirm')!.addEventListener('click',async()=>{if(busy)return;busy=true;const button=dialog.querySelector<HTMLButtonElement>('#strategy-activate-confirm')!;button.disabled=true;try{await activateNutritionStrategy(value.template.id,date,db,{activePhaseId:active?.id??null,templateUpdatedAt:value.template.updatedAt,phaseFingerprint:nutritionPhaseFingerprint(phases),definitionFingerprint:JSON.stringify(value)});ui.toast('已启用营养模板');if(flow)await flow.activated();else await showNutritionStrategyDetail(ui,value.template.id,back)}catch(e){busy=false;button.disabled=false;reportError(dialog,e)}})
  draw()
}
