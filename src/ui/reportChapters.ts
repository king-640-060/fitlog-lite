import { icon } from './icons'
const titles={nutrition:'营养执行',training:'训练表现',recovery:'体重与恢复',habits:'习惯记录'}
export function reportChapterHtml(key:keyof typeof titles,body:string):string{return `<details class="report-section report-chapter" data-report-chapter="${key}"><summary><h2>${titles[key]}</h2>${icon('chevron',16)}</summary><div class="report-chapter-body">${body}</div></details>`}
/** Keep user-opened chapters through same-window fact, exercise and metric refreshes. */
export function replaceReportHtml(host:HTMLElement,html:string):void {
 const state=new Map([...host.querySelectorAll<HTMLDetailsElement>('[data-report-chapter]')].map(d=>[d.dataset.reportChapter,d.open]))
 host.innerHTML=html
 for(const d of host.querySelectorAll<HTMLDetailsElement>('[data-report-chapter]'))if(state.has(d.dataset.reportChapter))d.open=state.get(d.dataset.reportChapter)!
}
