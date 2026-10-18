import { previewNutritionRangeCascade, deleteNutritionRangeCascade } from '../services/nutritionRangeCascadeService'
import { activeRangeConflicts } from '../services/pendingHealthOperations'
const aliases:Record<string,string>={nutritionStrategyTemplates:'templates',nutritionStrategyVariants:'variants',nutritionStrategyPhases:'phases',nutritionTargets:'targets',nutritionCycles:'cycles',nutritionCycleDays:'days'}
const labels:Record<string,string>={nutritionStrategyTemplates:'营养模板',nutritionStrategyVariants:'模板日方案',nutritionStrategyPhases:'模板使用阶段',nutritionTargets:'每日营养目标（含区间内所有来源）',nutritionCycles:'营养周期',nutritionCycleDays:'周期日期排程',foodLogs:'实际饮食',weights:'体重',waterLogs:'饮水',sleepSessions:'睡眠（所属夜晚）',workouts:'力量训练',cardioSessions:'有氧训练',pelvicFloorSessions:'凯格尔训练',dietEvents:'特殊饮食',habitCheckIns:'习惯打卡'}
import type { StrategyUi } from './nutritionStrategies'

export async function showNutritionCascadeDeletion(ui: StrategyUi, id: string, onCancel: () => void, onDeleted: () => void, origin?: Element): Promise<void> {
  try {
    const preview = await previewNutritionRangeCascade(id)
    preview.conflicts.push(...await activeRangeConflicts(preview.ranges))
    if (ui.surface && !ui.surface.alive || origin && !origin.isConnected) return
    const counts = Object.keys(labels).map(key =>
      `<div data-cascade-category="${aliases[key]??key}" data-cascade-store="${key}"><dt>${labels[key]}</dt><dd>${preview.counts[key]} 条</dd></div>`).join('')
    const dialog = ui.openModal('删除营养模板及关联数据', `<div class="nutrition-strategy" data-cascade-root>
      <p class="strategy-note">${ui.esc(preview.name)} · 将永久删除 ${preview.total} 条对象</p>
      <h3>日期范围来源</h3><ul class="strategy-range-sources">${preview.sources.map(r=>`<li>${ui.esc(r.kind)} · ${ui.esc(r.name)} · ${r.start} — ${r.end}${r.open?'（进行中阶段截至本地今天）':''}${r.start>preview.today?' · 未来排定范围':r.end<preview.today?' · 历史范围':r.end>preview.today?' · 含已到及未来日期':' · 截至今天'}</li>`).join('')}</ul><h3>生效日期并集</h3><p class="strategy-note" data-cascade-ranges>${preview.ranges.length?preview.ranges.map(r=>`${r.start} — ${r.end}`).join('；'):'没有使用阶段或周期：仅删除六类归属对象，不删除独立健康事实'}</p><p class="strategy-note">合计 ${preview.dayCount} 个自然日；已到 ${preview.elapsedDayCount} 天，未来明确排定 ${preview.futureDayCount} 天。未来范围只表示会影响已有记录，不表示未来事实已发生。</p><p class="strategy-note">来源关联目标 ${preview.relatedTargets} 条；额外区间目标 ${preview.extraTargets} 条（包括手动及饮食模板目标）。</p><dl class="strategy-cascade-counts">${counts}</dl>
      <p class="strategy-cascade-warning"><strong>永久删除且不能撤销。</strong>原六类归属对象、日期并集内九类健康记录及所有每日目标会一并删除。这些记录按日期删除，可能并非直接由模板产生；未来排定范围内已有记录也会删除，相关周期报告不再可选择。</p>
      <p class="strategy-note">始终保留：全部计划/任务（含子任务、日期、完成状态）和标签、食物库、动作库、训练模板、独立饮食模板、习惯定义、其他营养模板及日期并集外健康记录。旧离线备份和远端副本不会自动删除，显式恢复旧备份可能恢复这些记录。</p>
      ${preview.conflicts.length ? `<p class="strategy-error" data-cascade-conflict role="alert">${ui.esc(preview.conflicts.join('；'))}。未删除任何记录，请核对来源后重新预览。</p>` : ''}
      <label class="strategy-cascade-ack"><input type="checkbox" data-cascade-ack><span>我确认永久删除所列模板关联对象、日期并集内健康记录及每日目标，并理解当前设备无法撤销。</span></label>
      <p class="strategy-error" role="alert" hidden></p>
      <div class="strategy-cascade-actions"><button type="button" class="secondary" data-cascade-cancel>取消</button><button type="button" class="danger-button" data-cascade-confirm disabled>永久删除</button></div>
      <button type="button" class="text-btn" data-cascade-refresh>重新读取删除预览</button>
    </div>`)
    const root = dialog.querySelector<HTMLElement>('[data-cascade-root]')!
    const cancellation=new AbortController()
    const lifecycle=new MutationObserver(()=>{if(!root.isConnected||!dialog.open)stop()})
    const stop=()=>{cancellation.abort();lifecycle.disconnect();dialog.removeEventListener('close',stop)}
    dialog.addEventListener('close',stop,{once:true});lifecycle.observe(dialog,{subtree:true,childList:true,attributes:true,attributeFilter:['open']})
    const ack = root.querySelector<HTMLInputElement>('[data-cascade-ack]')!, confirm = root.querySelector<HTMLButtonElement>('[data-cascade-confirm]')!
    let busy = false
    ack.addEventListener('change', () => { confirm.disabled = busy || !ack.checked || !!preview.conflicts.length })
    root.querySelector('[data-cascade-cancel]')!.addEventListener('click', () => { stop();onCancel() })
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
      busy = true; confirm.disabled = true; ack.disabled = true;refresh.disabled=true
      try {
        const accepted = await ui.confirm('永久删除模板及范围内健康记录？', `「${preview.name}」共 ${preview.total} 条对象。删除后不可恢复；所列日期内实际饮食、体重、饮水、睡眠、训练、习惯打卡及所有每日目标也会删除；任务和区间外记录保留。`, '永久删除', true)
        if (!accepted || !dialog.isConnected || !dialog.open || !root.isConnected) return
        await deleteNutritionRangeCascade(preview.id, preview.fingerprint,undefined,undefined,cancellation.signal)
        ui.toast('营养模板及批准范围内记录已永久删除')
        await ui.changed()
        if (dialog.open && root.isConnected) onDeleted()
      } catch (error) {
        if (root.isConnected) {
          const message = root.querySelector<HTMLElement>('.strategy-error:not([data-cascade-conflict])')!
          message.hidden = false; message.textContent = error instanceof Error ? error.message : '删除未完成，未删除任何记录'
        }
      } finally { busy = false; ack.disabled = false; refresh.disabled=false;confirm.disabled = !ack.checked || !!preview.conflicts.length }
    })
  } catch (error) { ui.toast(error instanceof Error ? error.message : '无法读取删除预览；未删除任何记录') }
}
