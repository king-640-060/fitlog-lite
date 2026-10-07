import { icon } from './icons'

// Slots are escaped by their existing domain renderers; these helpers only own HTML grammar.
export function managerToolbarHtml(main: string, createId: string, entity: string, empty = false, extra = ''): string {
  return `<div class="manager-toolbar"><div class="manager-toolbar-main">${main}</div><div class="manager-toolbar-actions">${extra}<button type="button" class="text-btn manager-create" id="${createId}" aria-label="新建${entity}" ${empty ? 'hidden' : ''}>+ 新建</button></div></div>`
}
export function managerSearchHtml(id: string, label: string, placeholder: string, value = ''): string {
  return `<label class="search-field"><span class="sr-only">${label}</span>${icon('search', 20)}<input id="${id}" type="search" value="${value}" placeholder="${placeholder}"></label>`
}
export function managerListHtml(rows: string): string { return `<div class="manager-list">${rows}</div>` }
export function managerRowHtml(title: string, meta: string, attributes = '', trailing = icon('chevron', 18), passive = false): string {
  const tag = passive ? 'span' : 'button'
  return `<div class="manager-row${passive ? ' is-reordering' : ''}"><${tag} ${passive ? '' : 'type="button"'} class="manager-row-main" ${attributes}><span class="manager-row-copy"><strong class="manager-row-title">${title}</strong><small class="manager-row-meta">${meta}</small></span><span class="manager-row-trailing">${trailing}</span></${tag}></div>`
}
export function managerEmptyHtml(entity: string, copy: string, id: string): string {
  return `<div class="manager-empty"><h3 class="manager-empty-title">还没有${entity}</h3><p class="manager-empty-copy">${copy}</p><button type="button" class="primary manager-empty-action" id="${id}" aria-label="新建${entity}">新建${entity}</button></div>`
}
export function managerNoResultsHtml(entity: string, action = ''): string {
  return `<div class="manager-no-results"><h3>没有匹配的${entity}</h3><p>换个关键词试试。</p>${action}</div>`
}
export function managerUtilitiesHtml(actions: string): string { return `<div class="manager-utilities">${actions}</div>` }
export function managerSectionHtml(title: string, content: string): string {
  return `<section class="manager-section"><h3 class="manager-section-title">${title}</h3>${content}</section>`
}
