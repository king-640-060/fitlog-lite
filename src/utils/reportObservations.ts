import type {CoachReportAnalysis} from './coachReportAnalysis'
import type {ReportResult} from './reporting'
import {formatNumber} from './nutrition'
/** Deterministic observations: facts, limits, then a concrete next action; never a diagnosis. */
export function reportObservations(report:ReportResult,a:CoachReportAnalysis):Array<{evidence:string;limit:string;next:string}>{
 const days=a.elapsedDays
 if(!days)return[{evidence:'日期范围尚未开始。',limit:'未来计划不计入实际均值或覆盖。',next:'到期后记录实际饮食、训练与恢复，再查看分析。'}]
 const n=a.nutrition.calories,observations=[{evidence:`已到 ${days} 天，饮食 ${a.foodDays} 天；热量完整 ${n.completeDays} 天，同日有效目标配对 ${n.matchedDays} 天。`,limit:n.partialDays?`${n.partialDays} 天营养快照不完整；不能据此确定能量缺口。`:'已记录摄入与保存目标的差异不能确定个人能量平衡。',next:n.completeDays<days?'先补齐实际份量与营养快照，再比较保存目标。':'结合训练安排观察同日实际摄入与目标差异，避免仅按单日调整。'}]
 const comparable=a.groups.filter(g=>g.current&&g.baseline),down=comparable.filter(g=>g.status==='declined')
 observations.push({evidence:`完成力量 ${a.training.sessions} 次，${a.training.recordedSets} 个有效记录组；同条件可比动作 ${comparable.length} 项${down.length?`，其中 ${down.length} 项本次下降`:''}。`,limit:'记录组未区分热身与有效工作组；外部负重×次数不是肌肉增长或能耗。',next:down.length?'核对动作条件、训练间隔与恢复记录；持续不适时寻求专业评估。':comparable.length?'继续记录同动作、同重量或次数，观察多次表现。':'保留动作身份与重量、次数，建立可比较训练基准。'})
 const r=report.recovery
 observations.push({evidence:`已完成睡眠 ${r.recordedDays}/${days} 夜；饮水 ${r.waterRecordedDays}/${days} 天${r.waterAverage===undefined?'':`，有记录日均 ${formatNumber(r.waterAverage)} ml`}。`,limit:'未记录不等于零；饮水日志与设备参考值不能诊断脱水，睡眠需求因人而异。',next:r.recordedDays<3?'先连续记录实际睡眠起止和饮水；当前不足以判断长期恢复变化。':'结合训练、出汗及个人需要安排饮水，继续观察睡眠时长与起止规律。'})
 return observations.slice(0,3)
}
export function representativeReportWeights(a:CoachReportAnalysis){const byDay=new Map<string,typeof a.weights[number]>();for(const w of a.weights){const old=byDay.get(w.date);if(!old||Date.parse(w.updatedAt)>Date.parse(old.updatedAt)||Date.parse(w.updatedAt)===Date.parse(old.updatedAt)&&w.id>old.id)byDay.set(w.date,w);}return [...byDay.values()]}
export function rollingRecordedWeightMeans(a:CoachReportAnalysis){const weights=representativeReportWeights(a);return weights.map(w=>{const end=Date.parse(w.date+'T12:00:00'),rows=weights.filter(p=>{const d=Date.parse(p.date+'T12:00:00');return d<=end&&end-d<7*86400000});return {date:w.date,mean:rows.length>=3?rows.reduce((n,p)=>n+p.weightKg,0)/rows.length:undefined,recordedDays:rows.length}})}

/** Circular mean absolute deviation of longest completed segments; >=3 nights is a display rule. */
export function sleepTimingVariation(report:ReportResult):{start?:number;end?:number;nightCount:number}{
 const main=report.recovery.daily.filter(d=>d.sessions.length).map(d=>[...d.sessions].sort((a,b)=>b.durationMinutes!-a.durationMinutes!||a.id.localeCompare(b.id))[0]!)
 const spread=(field:'startTime'|'endTime')=>{const clocks=main.map(s=>{const t=new Date(s[field]!);return t.getHours()*60+t.getMinutes()}),angles=clocks.map(v=>v/1440*2*Math.PI),x=angles.reduce((n,v)=>n+Math.cos(v),0),y=angles.reduce((n,v)=>n+Math.sin(v),0);if(main.length<3||Math.hypot(x,y)<1e-8)return undefined;const center=((Math.atan2(y,x)/2/Math.PI+1)%1)*1440;return clocks.reduce((n,v)=>n+Math.min(Math.abs(v-center),1440-Math.abs(v-center)),0)/main.length}
 return{start:spread('startTime'),end:spread('endTime'),nightCount:main.length}
}
