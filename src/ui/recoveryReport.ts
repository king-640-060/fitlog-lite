import type { ReportResult } from '../utils/reporting'
import { formatSleepDuration } from '../utils/recovery'
import { formatNumber } from '../utils/nutrition'
/** Fits the existing Reports section grammar; all averages disclose recorded-day coverage. */
export function recoveryReportHtml(report:ReportResult):string {
  const r=report.recovery,value=(v:number|undefined,unit:string)=>v===undefined?'未记录':`${formatNumber(v)} ${unit}`
  return `<section class="report-section coach-section recovery-report"><h2>睡眠与饮水</h2><dl class="recovery-statistics"><div><dt>平均睡眠时长</dt><dd>${r.averageMinutes===undefined?'未记录':formatSleepDuration(r.averageMinutes)}</dd></div><div><dt>平均入睡时间</dt><dd>${r.averageStart??'未记录'}</dd></div><div><dt>平均起床时间</dt><dd>${r.averageEnd??'未记录'}</dd></div><div><dt>有睡眠记录天数</dt><dd>${r.recordedDays} 天</dd></div><div><dt>饮水 · 有记录日平均</dt><dd>${value(r.waterAverage,'ml')}</dd></div><div><dt>有饮水记录天数</dt><dd>${r.waterRecordedDays} 天</dd></div><div><dt>本期真实累计饮水量</dt><dd>${value(r.waterTotal,'ml')}</dd></div></dl><p class="report-note">仅统计有记录的日期，未记录不作为零；入睡与起床均值取每天最长一段，按当前时区展示。</p></section>`
}
