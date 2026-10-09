import { formatSleepDuration } from '../utils/recovery'
import { sleepNightLabel } from '../utils/sleepBusinessDate'
export interface RecoveryChartPoint {date:string;value?:number}
export function recoveryLineGeometry(points:RecoveryChartPoint[],kind:'sleep'|'water') {
  const labels=points.map(p=>p.value===undefined?undefined:kind==='sleep'?`${(p.value/60).toFixed(1)}h`:String(p.value))
  const spacing=44,gutter=30,width=Math.max(1,points.length-1)*spacing+gutter*2,height=190
  const max=Math.max(0,...points.map(p=>p.value??0)),step=kind==='sleep'?60:100,ceiling=Math.max(step,Math.ceil(max/step)*step)
  const mapped=points.map((p,i)=>({...p,label:labels[i],x:gutter+i*spacing,y:150-(p.value??0)/ceiling*100}))
  const segments:Array<typeof mapped>=[];let segment:typeof mapped=[]
  for(const p of mapped){if(p.value===undefined){if(segment.length)segments.push(segment);segment=[]}else segment.push(p)}if(segment.length)segments.push(segment)
  return {width,height,ceiling,spacing,points:mapped,segments}
}
function dateLabel(date:string,kind:'sleep'|'water'):string {return kind==='sleep'?sleepNightLabel(date):`${Number(date.slice(0,4))}年${Number(date.slice(5,7))}月${Number(date.slice(8))}日`}
function valueLabel(value:number,kind:'sleep'|'water'):string {return kind==='sleep'?formatSleepDuration(value):`${value} ml`}
export function recoveryLineChartHtml(points:RecoveryChartPoint[],kind:'sleep'|'water',selectedDate?:string):string {
  const g=recoveryLineGeometry(points,kind),title=kind==='sleep'?'睡眠':'饮水',unit=kind==='sleep'?'小时':'ml'
  const actual=g.points.filter(p=>p.value!==undefined),selected=actual.find(p=>p.date===selectedDate)??actual.at(-1)
  if(!selected)return `<p class="recovery-note recovery-chart-empty" data-chart-kind="${kind}">此范围暂无${title}记录</p>`
  return `<section class="recovery-interactive-chart" data-recovery-chart="${kind}"><div class="chart-selection" role="status" aria-live="polite"><strong data-chart-value>${valueLabel(selected.value!,kind)}</strong><span data-chart-date>${dateLabel(selected.date,kind)}</span></div><div class="recovery-chart-scroll${points.length>=30?' recovery-chart-long':''}" role="region" aria-label="${title}趋势，单位${unit}，左右滚动查看日期"><svg class="recovery-line-chart" data-chart-kind="${kind}" viewBox="0 0 ${g.width} ${g.height}" style="min-width:${g.width/16}rem" role="group" aria-label="${title}实际记录，方向键选择数据点"><line class="recovery-line-axis" x1="0" y1="150" x2="${g.width}" y2="150"/>${g.segments.map(s=>`<polyline class="recovery-line-path" points="${s.map(p=>`${p.x},${p.y}`).join(' ')}"/>`).join('')}${g.points.map((p,i)=>`<g data-point-date="${p.date}"${p.value===undefined?'':` data-point-value="${p.value}" data-point-x="${p.x}" role="button" tabindex="${selected.date===p.date?0:-1}" aria-pressed="${selected.date===p.date}" aria-label="${dateLabel(p.date,kind)}，${valueLabel(p.value,kind)}" class="${selected.date===p.date?'is-selected':''}"`}>${p.value===undefined?'':`<title>${dateLabel(p.date,kind)}，${valueLabel(p.value,kind)}</title><circle class="recovery-line-hit" cx="${p.x}" cy="${p.y}" r="22"/><circle class="recovery-line-marker" cx="${p.x}" cy="${p.y}" r="3.5"/>`}${points.length<=7||i%Math.ceil(points.length/9)===0||i===points.length-1?`<text class="recovery-point-date" x="${p.x}" y="176" text-anchor="middle">${Number(p.date.slice(5,7))}/${Number(p.date.slice(8))}</text>`:''}</g>`).join('')}</svg></div></section>`
}
export function mountRecoveryCharts(host:HTMLElement,onSelection:(kind:'sleep'|'water',date:string)=>void):()=>void {
  const events=new AbortController()
  host.querySelectorAll<HTMLElement>('[data-recovery-chart]').forEach(chart=>{
    const kind=chart.dataset.recoveryChart as 'sleep'|'water',points=[...chart.querySelectorAll<SVGElement>('[data-point-value]')]
    const select=(point:SVGElement,focus=false)=>{
      for(const p of points){const active=p===point;p.classList.toggle('is-selected',active);p.setAttribute('aria-pressed',String(active));p.setAttribute('tabindex',active?'0':'-1')}
      chart.querySelector('[data-chart-value]')!.textContent=valueLabel(Number(point.dataset.pointValue),kind)
      chart.querySelector('[data-chart-date]')!.textContent=dateLabel(point.dataset.pointDate!,kind)
      onSelection(kind,point.dataset.pointDate!)
      if(focus){point.focus({preventScroll:true});const scroll=chart.querySelector<HTMLElement>('.recovery-chart-scroll')!,r=point.getBoundingClientRect(),b=scroll.getBoundingClientRect();if(r.left<b.left||r.right>b.right)scroll.scrollLeft+=r.left-b.left-scroll.clientWidth/2}
    }
    const scroll=chart.querySelector<HTMLElement>('.recovery-chart-scroll')!;scroll.scrollLeft=Math.max(0,scroll.scrollWidth-scroll.clientWidth)
    let down:{x:number;y:number}|undefined,dragged=false
    chart.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};dragged=false},{signal:events.signal})
    chart.addEventListener('pointerup',e=>{dragged=!!down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8;down=undefined},{signal:events.signal})
    chart.addEventListener('click',e=>{const p=(e.target as Element).closest<SVGElement>('[data-point-value]');if(p&&!dragged)select(p);dragged=false},{signal:events.signal})
    chart.addEventListener('keydown',e=>{const current=(e.target as Element).closest<SVGElement>('[data-point-value]');if(!current)return;const index=points.indexOf(current),next=e.key==='Home'?0:e.key==='End'?points.length-1:e.key==='ArrowRight'?Math.min(points.length-1,index+1):e.key==='ArrowLeft'?Math.max(0,index-1):undefined;if(next!==undefined){e.preventDefault();select(points[next]!,true)}else if(e.key===' '||e.key==='Enter'){e.preventDefault();select(current)}},{signal:events.signal})
  })
  return()=>events.abort()
}
