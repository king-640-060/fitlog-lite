import type { CoachReport } from '../services/coachReportService'
import { reportObservations } from '../utils/reportObservations'
export function reportObservationsHtml(data:CoachReport,esc:(v:unknown)=>string):string{return `<section class="report-section coach-section" data-report-observations><h2>本期教练建议</h2><ol class="coach-observations">${reportObservations(data.report,data.analysis).map(o=>`<li><p>${esc(o.next)}</p><details class="coach-observation-evidence"><summary>事实与判断边界</summary><p>事实 · ${esc(o.evidence)}</p><p>${esc(o.limit)}</p></details></li>`).join('')}</ol></section>`}
