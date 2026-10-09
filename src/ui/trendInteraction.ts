export interface HitPoint { x:number; y:number }
/** Screen CSS pixels, bounded real-date tolerance; blank plot exterior never selects. */
export function nearestTrendPoint(points:HitPoint[],x:number,y:number,plot:{top:number;bottom:number}):number|undefined {
  if(!points.length||y<plot.top-12||y>plot.bottom+12)return undefined
  let index=0
  points.forEach((p,i)=>{if(Math.abs(p.x-x)<Math.abs(points[index]!.x-x))index=i})
  return Math.abs(points[index]!.x-x)<=44?index:undefined
}
/** Native scroll is authoritative. A small natural finger drift is still a tap. */
export function bindTrendPointer(surface:Element,scroll:HTMLElement,hit:(x:number,y:number)=>void):()=>void {
  const events=new AbortController();let down:{x:number;y:number;left:number;top:number;id:number}|undefined
  surface.addEventListener('pointerdown',event=>{const e=event as PointerEvent;if(e.isPrimary!==false)down={x:e.clientX,y:e.clientY,left:scroll.scrollLeft,top:window.scrollY,id:e.pointerId}},{signal:events.signal})
  surface.addEventListener('pointercancel',()=>{down=undefined},{signal:events.signal})
  surface.addEventListener('pointerup',event=>{const e=event as PointerEvent,start=down;down=undefined;if(start&&start.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<=12&&Math.abs(scroll.scrollLeft-start.left)<=10&&Math.abs(window.scrollY-start.top)<=10)hit(e.clientX,e.clientY)},{signal:events.signal})
  return()=>events.abort()
}
/** Reserve full labels only for1–3 real points; never collide or clip chart edges. */
export function sparseLabelIndexes(points:HitPoint[],labels:string[],width:number,fontSize=13):number[] {
  if(points.length>3)return []
  const accepted:number[]=[];let right=-Infinity
  points.forEach((p,i)=>{const half=labels[i]!.length*fontSize*.34;if(p.x-half>=0&&p.x+half<=width&&p.x-half>right+8){accepted.push(i);right=p.x+half}})
  return accepted
}
