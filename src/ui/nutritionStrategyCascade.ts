import { previewNutritionStrategyCascade, deleteNutritionStrategyCascade, nutritionCascadeLabels, type NutritionCascadeCategory } from '../services/nutritionStrategyCascadeService'
import type { StrategyUi } from './nutritionStrategies'

export async function showNutritionCascadeDeletion(ui: StrategyUi, id: string, onCancel: () => void, onDeleted: () => void, origin?: Element): Promise<void> {
  try {
    const preview = await previewNutritionStrategyCascade(id)
    if (ui.surface && !ui.surface.alive || origin && !origin.isConnected) return
    const counts = (Object.keys(nutritionCascadeLabels) as NutritionCascadeCategory[]).map(key =>
      `<div data-cascade-category="${key}"><dt>${nutritionCascadeLabels[key]}</dt><dd>${preview.counts[key]} 条</dd></div>`).join('')
    const dialog = ui.openModal('删除营养模板及关联数据', `<div class="nutrition-strategy" data-cascade-root>
      <p class="strategy-note">${ui.esc(preview.name)} · 将永久删除 ${preview.total} 条对象</p>
      <dl class="strategy-cascade-counts">${counts}</dl>
      <p class="strategy-cascade-warning"><strong>永久删除且不能撤销。</strong>当前使用阶段、历史关联目标、周期及排程会一并删除；相关周期报告不再可选择。</p>
      <p class="strategy-note">不会删除：实际饮食（FoodLog）、食物库、体重、饮水、睡眠、训练、习惯、任务、独立饮食模板，以及不属于该模板的手动营养目标。</p>
      ${preview.conflicts.length ? `<p class="strategy-error" data-cascade-conflict role="alert">${ui.esc(preview.conflicts.join('；'))}。未删除任何记录，请核对来源后重新预览。</p>` : ''}
      <label class="strategy-cascade-ack"><input type="checkbox" data-cascade-ack><span>我确认删除上面六类关联数据，并理解不可恢复。</span></label>
      <p class="strategy-error" role="alert" hidden></p>
      <div class="strategy-cascade-actions"><button type="button" class="secondary" data-cascade-cancel>取消</button><button type="button" class="danger-button" data-cascade-confirm disabled>永久删除</button></div>
      <button type="button" class="text-btn" data-cascade-refresh>重新读取删除预览</button>
    </div>`)
    const root = dialog.querySelector<HTMLElement>('[data-cascade-root]')!
    const ack = root.querySelector<HTMLInputElement>('[data-cascade-ack]')!, confirm = root.querySelector<HTMLButtonElement>('[data-cascade-confirm]')!
    let busy = false
    ack.addEventListener('change', () => { confirm.disabled = busy || !ack.checked || !!preview.conflicts.length })
    root.querySelector('[data-cascade-cancel]')!.addEventListener('click', () => { if (!busy) onCancel() })
    const refresh = root.querySelector<HTMLButtonElement>('[data-cascade-refresh]')!
    refresh.addEventListener('click', async () => {
      if (busy) return
      busy = true; ack.checked = false; ack.disabled = true; confirm.disabled = true; refresh.disabled = true
      refresh.setAttribute('aria-busy', 'true')
      try { await showNutritionCascadeDeletion(ui, id, onCancel, onDeleted, root) }
      finally { busy = false; ack.disabled = false; refresh.disabled = false; refresh.removeAttribute('aria-busy') }
    })
    confirm.addEventListener('click', async () => {
      if (busy || !ack.checked || preview.conflicts.length) return
      busy = true; confirm.disabled = true; ack.disabled = true
      try {
        const accepted = await ui.confirm('永久删除模板及六类关联数据？', `「${preview.name}」共 ${preview.total} 条对象。删除后不可恢复；相关周期报告将消失，其他真实健康记录保留。`, '永久删除', true)
        if (!accepted || !dialog.isConnected || !dialog.open || !root.isConnected) return
        await deleteNutritionStrategyCascade(preview.id, preview.fingerprint)
        ui.toast('营养模板及六类关联数据已永久删除')
        await ui.changed()
        if (dialog.open && root.isConnected) onDeleted()
      } catch (error) {
        if (root.isConnected) {
          const message = root.querySelector<HTMLElement>('.strategy-error:not([data-cascade-conflict])')!
          message.hidden = false; message.textContent = error instanceof Error ? error.message : '删除未完成，未删除任何记录'
        }
      } finally { busy = false; ack.disabled = false; confirm.disabled = !ack.checked || !!preview.conflicts.length }
    })
  } catch (error) { ui.toast(error instanceof Error ? error.message : '无法读取删除预览；未删除任何记录') }
}
