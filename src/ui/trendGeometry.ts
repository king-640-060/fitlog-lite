/** Calendar ordinals are only spacing coordinates; business-date generation stays local. */
export function calendarOrdinal(date:string):number {const [y,m,d]=date.split('-').map(Number);return Date.UTC(y!,m!-1,d!)/86400000}
export const trendPlotHeight=162
export const trendPlotTop=20
export const trendPlotBottom=120
export function trendScale(values:number[],kind:'weight'|'sleep'|'water') {
 values=values.filter(Number.isFinite);if(!values.length)values=[kind==='weight'?1:0]
 if(kind==='weight'){const min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.2,1);return {low:Math.max(0,min-pad),high:max+pad}}
 const step=kind==='sleep'?60:100;return{low:0,high:Math.max(step,Math.ceil(Math.max(...values)/step)*step)}
}
export function trendYLabels(low:number,high:number,format:(n:number)=>string):string {
 return `<div class="trend-y-axis" aria-hidden="true">${[high,(high+low)/2,low].map((n,i)=>`<span style="top:${[trendPlotTop,70,trendPlotBottom][i]!/trendPlotHeight*100}%">${format(n)}</span>`).join('')}</div>`
}
/** Hide partially visible date glyphs at native scroll edges; the full selected date stays in HTML. */
export function bindVisibleTrendDates(svg:SVGSVGElement,scroll:HTMLElement,signal:AbortSignal):void {
 const update=()=>{const boundary=scroll.getBoundingClientRect();for(const text of svg.querySelectorAll<SVGTextElement>('.recovery-point-date')){const r=text.getBoundingClientRect();text.style.visibility=r.left>=boundary.left+4&&r.right<=boundary.right-4?'visible':'hidden'}}
 scroll.addEventListener('scroll',update,{passive:true,signal});const resize=new ResizeObserver(update);resize.observe(scroll);signal.addEventListener('abort',()=>resize.disconnect(),{once:true});update()
}

/** Every natural day has a readable date slot, including days without measurements. */
export function trendCalendarAxis(start:string,end:string):string {
 const count=Math.max(0,calendarOrdinal(end)-calendarOrdinal(start)+1)
 return `<div class="trend-calendar-axis" data-trend-axis style="grid-template-columns:repeat(${count},minmax(0,1fr))">${Array.from({length:count},(_,i)=>{const d=new Date((calendarOrdinal(start)+i)*86400000),date=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;return `<span data-axis-date="${date}" title="${date}"><small>${count!==7&&(i===0||d.getUTCDate()===1)?`${d.getUTCMonth()+1}月`:'&nbsp;'}</small><span>${d.getUTCDate()}</span></span>`}).join('')}</div>`
}
