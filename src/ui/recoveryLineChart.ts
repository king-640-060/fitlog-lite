export interface RecoveryChartPoint {date:string;value?:number}
export function recoveryLineGeometry(points:RecoveryChartPoint[],kind:'sleep'|'water') {
  const labels=points.map(p=>p.value===undefined?undefined:kind==='sleep'?`${(p.value/60).toFixed(1)}h`:String(p.value))
  // Numeric labels own a complete slot; font enlargement scales the internal SVG, never removes labels.
  const spacing=Math.max(36,...labels.map(s=>(s?.length??0)*7.5+8)),gutter=spacing/2+10,width=Math.max(1,points.length-1)*spacing+gutter*2,height=190
  const max=Math.max(0,...points.map(p=>p.value??0)),step=kind==='sleep'?60:100,ceiling=Math.max(step,Math.ceil(max/step)*step)
  const mapped=points.map((p,i)=>({...p,label:labels[i],x:gutter+i*spacing,y:150-(p.value??0)/ceiling*100}))
  const segments:Array<typeof mapped>=[];let segment:typeof mapped=[]
  for(const p of mapped){if(p.value===undefined){if(segment.length)segments.push(segment);segment=[]}else segment.push(p)}if(segment.length)segments.push(segment)
  return {width,height,ceiling,spacing,points:mapped,segments}
}
export function recoveryLineChartHtml(points:RecoveryChartPoint[],kind:'sleep'|'water'):string {
  const g=recoveryLineGeometry(points,kind),title=kind==='sleep'?'睡眠':'饮水',unit=kind==='sleep'?'小时':'ml'
  if(!points.some(p=>p.value!==undefined))return `<p class="recovery-note recovery-chart-empty" data-chart-kind="${kind}">此范围暂无${title}记录</p>`
  return `<div class="recovery-chart-scroll${points.length>=30?' recovery-chart-long':''}" tabindex="0" role="region" aria-label="每日${title}折线图，单位${unit}，可横向滚动"><svg class="recovery-line-chart" data-chart-kind="${kind}" viewBox="0 0 ${g.width} ${g.height}" style="min-width:${g.width/16}rem" role="img" aria-label="${title}每日真实点值；缺失日期断线，完整日期见每日记录"><line class="recovery-line-axis" x1="0" y1="150" x2="${g.width}" y2="150"/>${g.segments.map(s=>`<polyline class="recovery-line-path" points="${s.map(p=>`${p.x},${p.y}`).join(' ')}"/>`).join('')}${g.points.map(p=>`<g data-point-date="${p.date}"${p.value===undefined?'':' data-point-value="'+p.value+'"'}>${p.value===undefined?'':`<circle class="recovery-line-marker" cx="${p.x}" cy="${p.y}" r="3.5"/><text class="recovery-point-value" x="${p.x}" y="${p.y-12}" text-anchor="middle">${p.label}</text>`}<text class="recovery-point-date" x="${p.x}" y="176" text-anchor="middle">${Number(p.date.slice(5,7))}/${Number(p.date.slice(8))}</text></g>`).join('')}</svg></div>`
}
