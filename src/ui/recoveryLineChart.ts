import { bindTrendPointer, nearestTrendPoint, sparseLabelIndexes } from './trendInteraction'
import { trendEmptyHtml, trendDateLabel } from './trendModule'
import { formatSleepDuration } from '../utils/recovery'
export interface RecoveryChartPoint {date:string;value?:number}
export function recoveryLineGeometry(points:RecoveryChartPoint[],kind:'sleep'|'water') {
  const labels=points.map(p=>p.value===undefined?undefined:kind==='sleep'?`${(p.value/60).toFixed(1)}h`:String(p.value))
  const valid=points.map((p,i)=>p.value===undefined?-1:i).filter(i=>i>=0),sparse=valid.length>0&&valid.length<=3,first=sparse?valid[0]!:0,last=sparse?valid.at(-1)!:points.length-1
  const spacing=44,gutter=36,width=sparse?280:Math.max(1,points.length-1)*spacing+gutter*2,height=sparse?160:190,axis=height-40
  const max=Math.max(0,...points.map(p=>p.value??0)),step=kind==='sleep'?60:100,ceiling=Math.max(step,Math.ceil(max/step)*step)
  const mapped=points.map((p,i)=>({...p,label:labels[i],x:sparse?(first===last?width/2:gutter+valid.indexOf(i)/Math.max(1,valid.length-1)*(width-gutter*2)):gutter+i*spacing,y:axis-(p.value??0)/ceiling*(height-76)}))
  const segments:Array<typeof mapped>=[];let segment:typeof mapped=[]
  for(const p of mapped){if(p.value===undefined){if(segment.length)segments.push(segment);segment=[]}else segment.push(p)}if(segment.length)segments.push(segment)
  return {width,height,ceiling,spacing,axis,sparse,first,last,points:mapped,segments}
}
function dateLabel(date:string,kind:'sleep'|'water'):string {return trendDateLabel(date,kind==='sleep')}
function valueLabel(value:number,kind:'sleep'|'water'):string {return kind==='sleep'?formatSleepDuration(value):`${value} ml`}
function valueHtml(value:number,kind:'sleep'|'water'):string {const n=Math.round(value);return kind==='water'?`${value} <span class="trend-unit">ml</span>`:`${Math.floor(n/60)}<span class="trend-unit">小时</span>${n%60}<span class="trend-unit">分钟</span>`}
export function recoveryLineChartHtml(points:RecoveryChartPoint[],kind:'sleep'|'water',selectedDate?:string):string {
  const g=recoveryLineGeometry(points,kind),title=kind==='sleep'?'睡眠':'饮水',unit=kind==='sleep'?'小时':'ml'
  const actual=g.points.filter(p=>p.value!==undefined),selected=actual.find(p=>p.date===selectedDate)??actual.at(-1)
  if(!selected)return trendEmptyHtml(title)
  const labelIndexes=sparseLabelIndexes(actual,actual.map(p=>valueLabel(p.value!,kind)),g.width),labels=new Set(labelIndexes.map(i=>actual[i]!.date)),dateLabels=new Set(sparseLabelIndexes(actual,actual.map(p=>`${Number(p.date.slice(5,7))}/${Number(p.date.slice(8))}`),g.width).map(i=>actual[i]!.date))
  return `<section class="recovery-interactive-chart" data-recovery-chart="${kind}"><div class="chart-selection" role="status" aria-live="polite"><strong data-chart-value>${valueHtml(selected.value!,kind)}</strong><span data-chart-date>${dateLabel(selected.date,kind)}</span></div><div class="recovery-chart-scroll trend-chart-shell ${g.sparse?'is-sparse':''}${points.length>=30?' recovery-chart-long':''}" role="region" aria-label="${title}趋势，单位${unit}，左右滚动查看日期"><svg class="recovery-line-chart" data-chart-kind="${kind}" viewBox="0 0 ${g.width} ${g.height}" style="min-width:${g.width/16}rem" role="group" aria-label="${title}实际记录，方向键选择数据点"><line class="recovery-line-axis" x1="0" y1="${g.axis}" x2="${g.width}" y2="${g.axis}"/><line class="recovery-selection-line" data-selection-line x1="${selected.x}" x2="${selected.x}" y1="24" y2="${g.axis}"/>${g.segments.map(s=>`<polyline class="recovery-line-path" points="${s.map(p=>`${p.x},${p.y}`).join(' ')}"/>`).join('')}${g.points.map((p,i)=>`<g data-point-date="${p.date}"${p.value===undefined?'':` data-point-value="${p.value}" data-point-x="${p.x}" data-point-y="${p.y}" role="button" tabindex="${selected.date===p.date?0:-1}" aria-pressed="${selected.date===p.date}" aria-label="${dateLabel(p.date,kind)}，${valueLabel(p.value,kind)}" class="${selected.date===p.date?'is-selected':''}"`}>${p.value===undefined?'':`<title>${dateLabel(p.date,kind)}，${valueLabel(p.value,kind)}</title><circle class="recovery-line-hit" cx="${p.x}" cy="${p.y}" r="22"/><circle class="recovery-line-marker" cx="${p.x}" cy="${p.y}" r="3.5"/>`}${labels.has(p.date)?`<text class="recovery-point-label" x="${p.x}" y="${Math.max(20,p.y-16)}" text-anchor="middle">${valueLabel(p.value!,kind)}</text>`:''}${p.x>=16&&p.x<=g.width-16&&(g.sparse?dateLabels.has(p.date):(points.length<=7||i%Math.ceil(points.length/9)===0||i===g.last||i===g.first))?`<text class="recovery-point-date" x="${p.x}" y="${g.height-12}" text-anchor="middle">${Number(p.date.slice(5,7))}/${Number(p.date.slice(8))}</text>`:''}</g>`).join('')}</svg></div></section>`
}
export function mountRecoveryCharts(host:HTMLElement,onSelection:(kind:'sleep'|'water',date:string)=>void):()=>void {
  const events=new AbortController()
  host.querySelectorAll<HTMLElement>('[data-recovery-chart]').forEach(chart=>{
    const kind=chart.dataset.recoveryChart as 'sleep'|'water',points=[...chart.querySelectorAll<SVGElement>('[data-point-value]')]
    const select=(point:SVGElement,focus=false)=>{
      for(const p of points){const active=p===point;p.classList.toggle('is-selected',active);p.setAttribute('aria-pressed',String(active));p.setAttribute('tabindex',active?'0':'-1')}
      chart.querySelector('[data-chart-value]')!.innerHTML=valueHtml(Number(point.dataset.pointValue),kind)
      chart.querySelector('[data-chart-date]')!.textContent=dateLabel(point.dataset.pointDate!,kind)
      const line=chart.querySelector('[data-selection-line]')!;line.setAttribute('x1',point.dataset.pointX!);line.setAttribute('x2',point.dataset.pointX!)
      onSelection(kind,point.dataset.pointDate!)
      if(focus){point.focus({preventScroll:true});const scroll=chart.querySelector<HTMLElement>('.recovery-chart-scroll')!,r=point.getBoundingClientRect(),b=scroll.getBoundingClientRect();if(r.left<b.left||r.right>b.right)scroll.scrollLeft+=r.left-b.left-scroll.clientWidth/2}
    }
    const scroll=chart.querySelector<HTMLElement>('.recovery-chart-scroll')!;scroll.scrollLeft=Math.max(0,scroll.scrollWidth-scroll.clientWidth)
    const svg=chart.querySelector<SVGSVGElement>('svg')!,stop=bindTrendPointer(svg,scroll,(x,y)=>{const matrix=svg.getScreenCTM();if(!matrix)return;const screen=(px:number,py:number)=>new DOMPoint(px,py).matrixTransform(matrix),rendered=points.map(p=>screen(Number(p.dataset.pointX),Number(p.dataset.pointY))),axis=Number(svg.querySelector('.recovery-line-axis')!.getAttribute('y1'));const index=nearestTrendPoint(rendered,x,y,{top:screen(0,24).y,bottom:screen(0,axis).y});if(index!==undefined)select(points[index]!)})
    events.signal.addEventListener('abort',stop,{once:true})
    chart.addEventListener('click',e=>{if(e.detail!==0)return;const point=(e.target as Element).closest<SVGElement>('[data-point-value]');if(point)select(point)},{signal:events.signal})
    chart.addEventListener('keydown',e=>{const current=(e.target as Element).closest<SVGElement>('[data-point-value]');if(!current)return;const index=points.indexOf(current),next=e.key==='Home'?0:e.key==='End'?points.length-1:e.key==='ArrowRight'?Math.min(points.length-1,index+1):e.key==='ArrowLeft'?Math.max(0,index-1):undefined;if(next!==undefined){e.preventDefault();select(points[next]!,true)}else if(e.key===' '||e.key==='Enter'){e.preventDefault();select(current)}},{signal:events.signal})
  })
  return()=>events.abort()
}
