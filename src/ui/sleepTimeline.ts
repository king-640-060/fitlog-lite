import { shiftLocalDate } from '../utils/date'
import type { SleepSession } from '../db/types'
import { formatSleepDuration, localClock } from '../utils/recovery'
import { resolveSleepBusinessDate, sleepNightLabel } from '../utils/sleepBusinessDate'
export function sleepTimelineGeometry(sessions:SleepSession[],date:string) {
  const completed=sessions.filter(s=>s.endTime&&resolveSleepBusinessDate(s)===date).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime))
  const defaultStart=new Date(date+'T18:00:00').getTime(),defaultEnd=new Date(shiftLocalDate(date,1)+'T12:00:00').getTime()
  const start=Math.min(defaultStart,...completed.map(s=>Date.parse(s.startTime))),end=Math.max(defaultEnd,...completed.map(s=>Date.parse(s.endTime!)))
  return {start,end,segments:completed.map(s=>({id:s.id,left:(Date.parse(s.startTime)-start)/(end-start)*100,width:(Date.parse(s.endTime!)-Date.parse(s.startTime))/(end-start)*100})),minutes:completed.reduce((n,s)=>n+s.durationMinutes!,0)}
}
export function sleepTimelineHtml(sessions:SleepSession[],date:string,esc:(v:unknown)=>string):string {
  const g=sleepTimelineGeometry(sessions,date);if(!g.segments.length)return ''
  const instant=(value:string)=>`${new Date(value).toLocaleDateString('zh-CN')} ${localClock(value)}`
  return `<section class="sleep-timeline" aria-label="${sleepNightLabel(date)}真实睡眠区间"><strong>${sleepNightLabel(date)} · ${formatSleepDuration(g.minutes)}</strong><div class="sleep-timeline-track" role="img" aria-label="${sessions.filter(s=>s.endTime&&resolveSleepBusinessDate(s)===date).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime)).map(s=>`${instant(s.startTime)}至${instant(s.endTime!)}`).join('；')}">${g.segments.map(p=>`<span data-sleep-interval="${esc(p.id)}" style="left:${p.left}%;width:${p.width}%"></span>`).join('')}</div><div class="sleep-timeline-axis"><span>${instant(new Date(g.start).toISOString())}</span><span>${instant(new Date(g.end).toISOString())}</span></div><ul class="sleep-timeline-intervals">${sessions.filter(s=>s.endTime&&resolveSleepBusinessDate(s)===date).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime)).map(s=>`<li>${instant(s.startTime)} → ${instant(s.endTime!)} · ${formatSleepDuration(s.durationMinutes!)}</li>`).join('')}</ul></section>`
}
