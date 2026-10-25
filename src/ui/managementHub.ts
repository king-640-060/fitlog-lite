import { icon } from './icons'
import { managerSearchHtml } from './managerPrimitives'
import type { ManagedSurfaceContext } from './managementWorkspace'

type GroupId = 'food' | 'training' | 'data' | 'app'
const groups: { id: GroupId; title: string; detail: string; mark: string }[] = [
  { id: 'food', title: '饮食资料', detail: '3 项资料管理', mark: '食' },
  { id: 'training', title: '训练资料', detail: '动作库与训练模板', mark: '训' },
  { id: 'data', title: '数据与安全', detail: '导入、备份、手动同步', mark: '安' },
  { id: 'app', title: '设置与工具', detail: '外观、AI、版本信息', mark: '设' },
]
const entries: { id: string; group?: GroupId; title: string; detail: string; keywords?: string }[] = [
  { id: 'more-food-library', group: 'food', title: '食物库', detail: '维护食物与营养资料' },
  { id: 'more-diet-templates', group: 'food', title: '饮食模板', detail: '保存常用饮食组合' },
  { id: 'more-nutrition-strategies', group: 'food', title: '营养模板', detail: '管理营养目标与阶段' },
  { id: 'more-exercise-library', group: 'training', title: '动作库', detail: '维护力量训练动作' },
  { id: 'more-workout-templates', group: 'training', title: '训练模板', detail: '管理常用动作组合' },
  { id: 'more-habits', title: '习惯', detail: '查看或调整打卡计划', keywords: '个人计划' },
  { id: 'more-import', group: 'data', title: '导入数据', detail: '仅导入食物文件，不是完整恢复' },
  { id: 'more-backup', group: 'data', title: '备份与恢复', detail: '本地完整备份、恢复及风险说明' },
  { id: 'more-github-sync', group: 'data', title: 'GitHub 同步', detail: '端到端加密的手动同步' },
  { id: 'more-appearance', group: 'app', title: '外观', detail: '跟随系统、浅色或深色' },
  { id: 'more-ai-settings', group: 'app', title: 'AI 设置', detail: '模型、语音和隐私设置' },
  { id: 'more-diagnostics', group: 'app', title: '版本诊断', detail: 'App 与 Service Worker 更新状态' },
  { id: 'more-about', group: 'app', title: '关于 FitLog Lite', detail: '应用信息、使用说明' },
]

/** Only routes and ephemeral search. Destinations still mount their real production renderers. */
export function mountManagementHub(
  surface: ManagedSurfaceContext,
  esc: (value: unknown) => string,
  details: { sync: () => string; ai: () => string },
  openEntry: (id: string) => void,
): void {
  const row = (entry: typeof entries[number], id = entry.id) => `<button type="button" class="management-entry" id="${id}" data-management-entry="${entry.id}"><span class="management-entry-copy"><strong>${esc(entry.title)}</strong><small>${esc(entry.detail)}</small></span><span class="management-entry-chevron" aria-hidden="true">${icon('chevron', 18)}</span></button>`
  const bind = (view: HTMLElement) => {
    view.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('.management-entry')
      if (button && view.contains(button)) openEntry(button.dataset.managementEntry!)
    })
    const refresh = () => {
      for (const [id, detail] of [['more-github-sync', details.sync], ['more-ai-settings', details.ai]] as const) {
        const small = view.querySelector<HTMLElement>(`#${id} small`)
        if (small) small.textContent = detail()
      }
    }
    surface.onResume(refresh)
    refresh()
  }
  surface.open('管理中心', `<div id="management-hub" class="management-view"><div class="management-hero"><strong>管理中心</strong></div><div class="management-search">${managerSearchHtml('management-search', '搜索管理入口', '查找设置或资料')}<button type="button" class="icon-btn quiet" data-management-clear aria-label="清空管理搜索" hidden>${icon('x', 18)}</button></div><div data-management-groups><p class="management-eyebrow">按用途查找</p><div class="management-categories">${groups.map(group => `<button type="button" class="management-category" data-management-group="${group.id}"><span class="management-category-icon" aria-hidden="true">${group.mark}</span><span class="management-category-copy"><strong>${esc(group.title)}</strong><small>${esc(group.detail)}</small></span><span class="management-entry-chevron" aria-hidden="true">${icon('chevron', 18)}</span></button>`).join('')}</div><section class="management-personal"><h3 class="management-eyebrow">个人计划</h3><div class="management-rows">${row(entries.find(entry => entry.id === 'more-habits')!, 'management-personal-habits')}</div></section></div><section data-management-results hidden><h3 class="management-eyebrow">查找结果</h3><div class="management-rows" data-management-result-rows></div><p class="sr-only" role="status" data-management-result-count></p></section><section class="settings-section management-footnote"><p class="settings-section-note management-note" role="note">更换设备或清除浏览器数据前，请先备份。</p></section></div>`)
  const view = surface.host.querySelector<HTMLElement>('#management-hub')!
  bind(view)
  const search = view.querySelector<HTMLInputElement>('#management-search')!
  const clear = view.querySelector<HTMLButtonElement>('[data-management-clear]')!
  const filter = () => {
    const query = search.value.trim().toLocaleLowerCase()
    view.querySelector<HTMLElement>('[data-management-groups]')!.hidden = Boolean(query)
    view.querySelector<HTMLElement>('[data-management-results]')!.hidden = !query
    clear.hidden = !search.value
    const matches = entries.filter(entry => `${entry.title} ${entry.detail} ${entry.keywords ?? ''} ${groups.find(group => group.id === entry.group)?.title ?? ''}`.toLocaleLowerCase().includes(query))
    // The search field remains mounted; no scroll or focus compensation.
    view.querySelector('[data-management-result-rows]')!.innerHTML = query ? matches.map(entry => row(entry)).join('') || '<p class="management-no-results">没有找到匹配的入口。</p>' : ''
    view.querySelector('[data-management-result-count]')!.textContent = query ? `找到 ${matches.length} 个入口` : ''
    // Status summaries never replace the static searchable labels.
    for (const [id, detail] of [['more-github-sync', details.sync], ['more-ai-settings', details.ai]] as const) {
      const small = view.querySelector<HTMLElement>(`[data-management-results] #${id} small`)
      if (small) small.textContent = detail()
    }
  }
  search.addEventListener('input', filter)
  clear.addEventListener('click', () => { search.value = ''; filter(); search.focus({ preventScroll: true }) })
  view.querySelectorAll<HTMLButtonElement>('[data-management-group]').forEach(button => button.addEventListener('click', () => {
    const group = groups.find(group => group.id === button.dataset.managementGroup)!
    surface.open(group.title, `<div class="management-view" data-management-category-page="${group.id}"><p class="management-subtitle">${esc(group.title)} · ${esc(group.detail)}</p><div class="management-rows">${entries.filter(entry => entry.group === group.id).map(entry => row(entry)).join('')}</div>${group.id === 'data' ? '<p class="management-note" role="note">数据保存在当前设备。更换设备或清除浏览器数据前，请先备份。</p>' : ''}</div>`)
    bind(surface.host.querySelector<HTMLElement>('[data-management-category-page]')!)
  }))
}
