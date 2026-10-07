import { managerToolbarHtml, managerListHtml, managerRowHtml, managerEmptyHtml, managerSectionHtml } from './managerPrimitives'
import type { ManagedSurfaceContext } from './managementWorkspace'
import { animateMotion, stabilizeSheetSubview } from './motion'
import type { NutritionGoal, NutritionTarget, NutritionStrategyPhase, NutritionStrategyVariant } from '../db/types'
import { db } from '../db/database'
import { activateNutritionStrategy, applyNutritionStrategyVariant, archiveNutritionStrategy, duplicateNutritionStrategy, getNutritionPhaseSummary, getNutritionStrategy, getNutritionStrategyForDate, saveNutritionStrategy, type NutritionStrategyDefinition, type StrategyDraft } from '../services/nutritionStrategyService'
import { getLocalDateString, shiftLocalDate } from '../utils/date'
import { formatNumber } from '../utils/nutrition'
import { formatEnergyInputValue } from '../utils/energy'
import { setSheetVariant } from './sheetController'
import { bindNumericPresentation } from './numericPresentation'
import { mountDatePicker, datePickerLabel } from './datePicker'

interface StrategyUi {
  surface?: ManagedSurfaceContext

  openModal(title: string, body: string, wide?: boolean): HTMLDialogElement
  esc(value: unknown): string
  goalFields(goal?: NutritionGoal): string
  goalFromForm(data: FormData): NutritionGoal | undefined
  manual(date: string, target?: NutritionTarget): void
  changed(): Promise<void>
  toast(message: string): void
  confirm(title: string, message: string, action?: string): Promise<boolean>
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
  const context = await getNutritionStrategyForDate(date)
  if (!context || context.template.archivedAt) { ui.manual(date,target); return }
  const selection = target?.strategySelection
  const dateLabel = date === getLocalDateString() ? '今天' : datePickerLabel(date)
  if(ui.surface&&!ui.surface.alive)return
  const dialog = ui.openModal('选择当日目标', `<div class="nutrition-strategy"><p class="strategy-note">${dateLabel} · 选择一个日方案，再应用当天目标。</p>${target ? `<section class="strategy-saved" aria-label="当天已保存目标"><span>当天已保存 · ${selection ? ui.esc(selection.variantName) : target.sourceTemplateId ? '来自饮食模板' : '自定义目标'}</span>${selection ? `<small>${ui.esc(selection.templateName)}</small>` : ''}${amountHtml(target)}</section>` : ''}<section><p class="strategy-section-label">${date === getLocalDateString() ? '当前模板' : '这个日期的模板'}</p><h3 class="strategy-title">${ui.esc(context.template.name)}</h3><div class="strategy-choices">${context.variants.map(v=>`<button type="button" class="secondary strategy-choice" data-strategy-choice="${ui.esc(v.id)}" aria-pressed="${selection?.variantId === v.id && selection.templateId === context.template.id}">${variantContent(ui,v)}<span class="strategy-choice-mark">${selection?.variantId === v.id && selection.templateId === context.template.id ? '✓ 当天来源' : '选择'}</span></button>`).join('')}</div></section><div class="strategy-links"><button type="button" class="sheet-link" id="strategy-custom">自定义目标</button><button type="button" class="sheet-link" id="strategy-manage">管理营养模板</button></div></div>`,true)
  const footer=document.createElement('footer');footer.className='sheet-footer nutrition-strategy-footer'
  footer.innerHTML=`${errorHtml()}<p class="strategy-preview" role="status">选择后确认，仅更新 ${dateLabel} 的目标。</p><button type="button" class="primary full-btn" id="strategy-apply" disabled>应用选中方案</button>`
  dialog.append(footer)
  let selected: NutritionStrategyVariant | undefined, busy = false
  const apply = dialog.querySelector<HTMLButtonElement>('#strategy-apply')!
  dialog.querySelectorAll<HTMLButtonElement>('[data-strategy-choice]').forEach(button=>button.addEventListener('click',()=>{
    if (busy) return
    selected=context.variants.find(v=>v.id===button.dataset.strategyChoice)
    dialog.querySelectorAll<HTMLButtonElement>('[data-strategy-choice]').forEach(b=>{const yes=b===button;b.setAttribute('aria-pressed',String(yes));b.querySelector('.strategy-choice-mark')!.textContent=yes?'✓ 已选':'选择'})
    const node = dialog.querySelector('.strategy-preview')!
    node.textContent = `${selected!.name} · 确认后${target ? '替换' : '设置'} ${dateLabel} 的目标，其他日期保持不变。`
    apply.disabled=false
  }))
  apply.addEventListener('click',async()=>{
    if (!selected || busy) return
    busy=true;apply.disabled=true
    try{await applyNutritionStrategyVariant(date,selected.id,db,{context,variant:selected,existing:target});dialog.close();ui.toast('已应用当日营养目标');await ui.changed()}
    catch(error){busy=false;apply.disabled=false;reportError(dialog,error)}
  })
  dialog.querySelector('#strategy-custom')!.addEventListener('click',()=>{if(busy)return;dialog.close();ui.manual(date,target)})
  dialog.querySelector('#strategy-manage')!.addEventListener('click',()=>{if(busy)return;void showNutritionStrategyManager(ui,()=>void showNutritionStrategyPicker(ui,date,target))})
}

export async function showNutritionStrategyManager(ui: StrategyUi, back?: ()=>void): Promise<void> {
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('营养模板',`<div class="manager-surface" id="strategy-manager"><p role="status" class="strategy-note">正在读取营养模板…</p></div>`)
  const managerRoot=dialog.querySelector<HTMLElement>('#strategy-manager')!
  try{
    const [templates,phases]=await Promise.all([db.nutritionStrategyTemplates.orderBy('updatedAt').reverse().toArray(),db.nutritionStrategyPhases.orderBy('startDate').reverse().toArray()])
    const active=phases.find(p=>!p.endDate),current=templates.find(t=>t.id===active?.templateId)
    const counts=new Map((await db.nutritionStrategyVariants.toArray()).reduce<Array<[string,number]>>((a,v)=>{const pair=a.find(p=>p[0]===v.templateId);if(pair)pair[1]++;else a.push([v.templateId,1]);return a},[]))
    const row=(t:typeof templates[number])=>managerRowHtml(ui.esc(t.name), `${counts.get(t.id)??0} 个日方案${t.id===current?.id&&active?` · 当前使用 · ${ui.esc(active.startDate)} 起`:t.archivedAt?' · 已归档':phases.some(p=>p.templateId===t.id)?' · 曾使用':' · 尚未启用'}`, `data-strategy-detail="${ui.esc(t.id)}"`)
    const currentHtml=current&&active?managerSectionHtml('当前使用',managerListHtml(row(current))):''
    if(!isOpen(dialog)||!managerRoot.isConnected)return
    if (!ui.surface) setSheetVariant(dialog,templates.length>2?'large':'content')
    const available=templates.filter(t=>t.id!==current?.id&&!t.archivedAt),archived=templates.filter(t=>t.archivedAt)
    dialog.querySelector('#strategy-manager')!.innerHTML=`${back?'<button type="button" class="sheet-link" id="strategy-manager-back">返回当日目标</button>':''}${managerToolbarHtml(`${templates.length} 个模板`,'strategy-create','营养模板',!templates.length)}<p class="manager-section-note">一个模板包含多个日目标方案，每天选择一个。切换模板不改写已保存目标。</p>${templates.length?`${currentHtml}${available.length?managerSectionHtml(current?'其他模板':'可用模板',managerListHtml(available.map(row).join(''))):''}${archived.length?`<details class="strategy-archive manager-section"><summary>已归档 · ${archived.length}</summary>${managerListHtml(archived.map(row).join(''))}</details>`:''}`:managerEmptyHtml('营养模板','把训练日、休息日等目标放在同一模板中，每天选一个。','strategy-empty-create')}${errorHtml()}`

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
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('营养模板详情',`<div class="nutrition-strategy"><button type="button" class="sheet-link" id="strategy-detail-back">返回模板管理</button><h3 class="strategy-title">${ui.esc(value.template.name)}</h3><p class="strategy-note">${active?'当前使用':value.template.archivedAt?'已归档，历史目标和阶段仍保留':'尚未启用或已结束使用'} · ${value.variants.length} 个日方案</p>${summaries.join('')}<section><h3>日方案</h3><div class="strategy-list">${value.variants.map(v=>`<article class="strategy-variant-card">${variantContent(ui,v)}</article>`).join('')}</div></section>${errorHtml()}${!value.template.archivedAt&&!active?'<button type="button" class="primary full-btn" id="strategy-activate-open">启用此模板</button>':''}<button type="button" class="${active?'primary':'secondary'} full-btn" id="strategy-detail-copy">复制为新模板</button>${value.template.archivedAt?'':'<button type="button" class="secondary full-btn" id="strategy-edit">编辑模板</button>'}${!active&&!value.template.archivedAt?'<button type="button" class="danger-button full-btn" id="strategy-archive">归档模板</button>':''}<p class="strategy-note">编辑只影响以后再次选择的方案；已保存的每日目标和来源名称保持不变。调整策略时可复制成新版本。</p></div>`,true)
  dialog.querySelector('#strategy-detail-back')!.addEventListener('click',()=>void showNutritionStrategyManager(ui,back))
  dialog.querySelector('#strategy-detail-copy')!.addEventListener('click',()=>showNutritionStrategyEditor(ui,duplicateNutritionStrategy(value),back,true))
  dialog.querySelector('#strategy-edit')?.addEventListener('click',()=>showNutritionStrategyEditor(ui,{id:value.template.id,name:value.template.name,variants:structuredClone(value.variants)},back))
  dialog.querySelector('#strategy-activate-open')?.addEventListener('click',()=>void showNutritionStrategyActivation(ui,value,back))
  dialog.querySelector('#strategy-archive')?.addEventListener('click',async()=>{if(!await ui.confirm('归档营养模板？','不再提供启用；历史阶段、每日目标和来源快照完整保留。','归档模板'))return;try{await archiveNutritionStrategy(id);ui.toast('模板已归档');await showNutritionStrategyManager(ui,back)}catch(e){reportError(dialog,e)}})
}

export function showNutritionStrategyEditor(ui: StrategyUi, source?: StrategyDraft, back?:()=>void, copy=false): void {
  const draft: StrategyDraft=source?structuredClone(source):{name:'',variants:[]}
  const initialDraft = JSON.stringify(draft)
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal(copy?'复制为新模板':source?'编辑营养模板':'新建营养模板',`<div class="nutrition-strategy"><div id="strategy-editor-root"><button type="button" class="sheet-link" id="strategy-editor-back">返回模板管理</button><form id="strategy-template-form" class="form manager-editor"><label>模板名称<input name="name" maxlength="80" value="${ui.esc(draft.name)}" placeholder="例如：减脂策略 V1" required></label><section><div class="strategy-editor-heading"><h3>日方案</h3><span id="strategy-variant-count"></span></div><p class="strategy-note">可以自定义名称；每天从这些方案中选一个。</p><div class="strategy-list" id="strategy-editor-variants"></div></section><button type="button" class="secondary full-btn" id="strategy-add-variant">添加日方案</button>${errorHtml()}<button type="submit" class="primary full-btn" id="strategy-save">保存营养模板</button><p class="strategy-note">保存后不会自动启用，也不会改变已保存的每日目标。</p></form></div><div id="strategy-variant-subview" hidden></div></div>`,true)
  const root=dialog.querySelector<HTMLElement>('#strategy-editor-root')!,sub=dialog.querySelector<HTMLElement>('#strategy-variant-subview')!,form=dialog.querySelector<HTMLFormElement>('#strategy-template-form')!
  let returnFromVariant: (()=>void)|undefined,busy=false
  const syncName=()=>{draft.name=(form.elements.namedItem('name') as HTMLInputElement).value}
  const draw=()=>{
    dialog.querySelector('#strategy-variant-count')!.textContent=`${draft.variants.length} / 32`
    dialog.querySelector('#strategy-editor-variants')!.innerHTML=draft.variants.map((v,i)=>`<article class="strategy-variant-card" data-strategy-variant="${ui.esc(v.id)}">${variantContent(ui,v)}<div class="strategy-variant-actions"><button type="button" class="secondary" data-variant-edit="${i}">编辑</button><button type="button" class="icon-btn quiet" data-variant-move="${i}" data-direction="-1" aria-label="上移 ${ui.esc(v.name)}" ${i===0?'disabled':''}>↑</button><button type="button" class="icon-btn quiet" data-variant-move="${i}" data-direction="1" aria-label="下移 ${ui.esc(v.name)}" ${i===draft.variants.length-1?'disabled':''}>↓</button><button type="button" class="icon-btn quiet danger" data-variant-remove="${i}" aria-label="移除 ${ui.esc(v.name)}">×</button></div></article>`).join('')||'<p class="strategy-note">先添加一个日方案，不需要一次填完所有目标。</p>'
    dialog.querySelector<HTMLButtonElement>('#strategy-add-variant')!.disabled=draft.variants.length>=32
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-edit]').forEach(b=>b.addEventListener('click',()=>edit(Number(b.dataset.variantEdit))))
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-move]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.variantMove),next=i+Number(b.dataset.direction);if(next<0||next>=draft.variants.length)return;const [v]=draft.variants.splice(i,1);draft.variants.splice(next,0,v!);draw()}))
    dialog.querySelectorAll<HTMLButtonElement>('[data-variant-remove]').forEach(b=>b.addEventListener('click',async()=>{if(!await ui.confirm('移除日方案？','保存模板后不再提供这个方案。已应用的每日目标和名称快照保持不变。','移除方案'))return;draft.variants.splice(Number(b.dataset.variantRemove),1);draw()}))
  }
  const edit=(index?:number)=>{
    syncName();const value=index===undefined?undefined:draft.variants[index]
    const parentScroll=dialog.querySelector('.modal-body')!.scrollTop
    stabilizeSheetSubview(dialog);root.hidden=true;sub.hidden=false
    sub.innerHTML=`<button type="button" class="sheet-link" id="strategy-variant-back">返回模板编辑</button><form id="strategy-variant-form" class="form"><label>方案名称<input name="variantName" maxlength="80" value="${ui.esc(value?.name??'')}" placeholder="例如：训练日" required></label>${ui.goalFields(value)}${errorHtml()}<button type="submit" class="primary full-btn">保存日方案</button></form>`
    const heading=dialog.querySelector('h2')!;heading.textContent=value?'编辑日方案':'添加日方案';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=0
    animateMotion(sub,'subview');bindNumericPresentation(sub)
    ui.surface?.setBackTarget(() => returnFromVariant?.(), source ? '编辑营养模板' : '新建营养模板')
    returnFromVariant=()=>{ui.surface?.setBackTarget(() => (dialog.querySelector('#strategy-editor-back') as HTMLButtonElement)?.click());sub.hidden=true;sub.innerHTML='';root.hidden=false;heading.textContent=copy?'复制为新模板':source?'编辑营养模板':'新建营养模板';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=parentScroll;animateMotion(root,'back');returnFromVariant=undefined}
    sub.querySelector('#strategy-variant-back')!.addEventListener('click',()=>returnFromVariant?.())
    sub.querySelector<HTMLFormElement>('#strategy-variant-form')!.addEventListener('submit',event=>{
      event.preventDefault();try{const data=new FormData(event.currentTarget as HTMLFormElement),goal=ui.goalFromForm(data);if(!goal)throw new Error('请至少填写一项营养目标');const next={id:value?.id??crypto.randomUUID(),name:String(data.get('variantName')??'').trim(),...goal};if(!next.name)throw new Error('请填写方案名称');if(index===undefined)draft.variants.push(next);else draft.variants[index]=next;returnFromVariant?.();draw()}catch(e){const node=sub.querySelector<HTMLElement>('.strategy-error')!;node.hidden=false;node.textContent=e instanceof Error?e.message:'请检查填写内容'}
    })
  }
  const events = new AbortController(); ui.surface?.onDispose(() => events.abort())
  dialog.addEventListener('cancel',event=>{if(returnFromVariant){event.preventDefault();returnFromVariant()}}, { signal: events.signal })
  ui.surface?.setBackTarget(() => (dialog.querySelector('#strategy-editor-back') as HTMLButtonElement)?.click(), undefined)
  dialog.querySelector('#strategy-editor-back')!.addEventListener('click',async()=>{if(busy)return;syncName();if(JSON.stringify(draft)!==initialDraft&&!await ui.confirm('离开模板编辑？','未保存的修改会放弃。','放弃修改'))return;if(ui.surface)ui.surface.back();else void showNutritionStrategyManager(ui,back)})
  dialog.querySelector('#strategy-add-variant')!.addEventListener('click',()=>edit())
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;syncName();busy=true;const button=dialog.querySelector<HTMLButtonElement>('#strategy-save')!;button.disabled=true;try{const saved=await saveNutritionStrategy(draft);ui.toast('营养模板已保存');ui.surface?.back();await showNutritionStrategyDetail(ui,saved.template.id,back)}catch(e){busy=false;button.disabled=false;reportError(dialog,e)}})
  if(source?.id){
    const detail=document.createElement('button');detail.type='button';detail.className='text-btn';detail.id='strategy-show-detail';detail.textContent='查看阶段与详情'
    form.append(detail);detail.addEventListener('click',()=>void showNutritionStrategyDetail(ui,source.id!,back))
  }
  draw()
}

async function showNutritionStrategyActivation(ui: StrategyUi, value: NutritionStrategyDefinition, back?:()=>void): Promise<void> {
  const phases=await db.nutritionStrategyPhases.orderBy('startDate').reverse().toArray(),active=phases.find(p=>!p.endDate)
  let date=getLocalDateString(),busy=false,dateController:ReturnType<typeof mountDatePicker>|undefined
  if(ui.surface&&!ui.surface.alive)return
  const dialog=ui.openModal('启用营养模板',`<div class="nutrition-strategy"><div id="strategy-activation-root"><button type="button" class="sheet-link" id="strategy-activation-back">返回模板详情</button><h3 class="strategy-title">${ui.esc(value.template.name)}</h3><p class="strategy-note">从选定日期开始，每天手动选择一个日方案。</p><p class="strategy-note">开始日期</p><button type="button" class="secondary fitlog-date-trigger full-btn" id="strategy-start-date"></button><p class="strategy-activation-preview" role="status"></p><p class="strategy-note">已有每日目标保持不变，启用本身不会生成或替换当天目标。</p>${errorHtml()}<button type="button" class="primary full-btn" id="strategy-activate-confirm">确认启用</button></div><div id="strategy-date-subview" hidden></div></div>`)
  const root=dialog.querySelector<HTMLElement>('#strategy-activation-root')!,host=dialog.querySelector<HTMLElement>('#strategy-date-subview')!,heading=dialog.querySelector('h2')!
  const draw=()=>{dialog.querySelector('#strategy-start-date')!.textContent=datePickerLabel(date);dialog.querySelector('#strategy-start-date')!.setAttribute('aria-label',`开始日期 ${datePickerLabel(date)}`);dialog.querySelector('.strategy-activation-preview')!.textContent=`从 ${date} 开始使用「${value.template.name}」。${active?`上一模板「${active.templateName}」阶段将结束于 ${shiftLocalDate(date,-1)}。`:'这是第一个营养模板阶段。'}`}
  let parentScroll=0
  const closeDate=()=>{ui.surface?.setBackTarget();dateController?.destroy();dateController=undefined;host.hidden=true;host.innerHTML='';root.hidden=false;heading.textContent='启用营养模板';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=parentScroll;animateMotion(root,'back')}
  const events = new AbortController(); ui.surface?.onDispose(() => { events.abort(); dateController?.destroy() })
  dialog.addEventListener('cancel',event=>{if(dateController){event.preventDefault();closeDate()}}, { signal: events.signal });if(!ui.surface)dialog.addEventListener('close',()=>dateController?.destroy())
  dialog.querySelector('#strategy-start-date')!.addEventListener('click',()=>{if(busy)return;parentScroll=dialog.querySelector('.modal-body')!.scrollTop;stabilizeSheetSubview(dialog);root.hidden=true;host.hidden=false;animateMotion(host,'subview');heading.textContent='选择开始日期';heading.focus({preventScroll:true});dialog.querySelector('.modal-body')!.scrollTop=0;ui.surface?.setBackTarget(closeDate, '启用营养模板');dateController=mountDatePicker(host,{value:date,onConfirm:next=>{date=next!;closeDate();draw()},onCancel:closeDate})})
  dialog.querySelector('#strategy-activation-back')!.addEventListener('click',()=>{if(!busy)void showNutritionStrategyDetail(ui,value.template.id,back)})
  dialog.querySelector('#strategy-activate-confirm')!.addEventListener('click',async()=>{if(busy)return;busy=true;const button=dialog.querySelector<HTMLButtonElement>('#strategy-activate-confirm')!;button.disabled=true;try{await activateNutritionStrategy(value.template.id,date,db,{activePhaseId:active?.id??null,templateUpdatedAt:value.template.updatedAt});ui.toast('已启用营养模板');await showNutritionStrategyDetail(ui,value.template.id,back)}catch(e){busy=false;button.disabled=false;reportError(dialog,e)}})
  draw()
}
