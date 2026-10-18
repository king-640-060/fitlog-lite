import type {DateInterval} from './nutritionRangeCascadeService'
const gate='fitlog-health-range-delete-v1',prefix='fitlog-active-pelvic-v1:'
/** Runtime-only Web Locks; no database/schema/config fields are introduced. */
export async function acquirePelvicRangeLease(date:string):Promise<()=>void>{
 if(!navigator.locks)return()=>{}
 let release!:()=>void,ready!:()=>void,failed!:(error:unknown)=>void
 const held=new Promise<void>(resolve=>{release=resolve}),started=new Promise<void>((resolve,reject)=>{ready=resolve;failed=reject})
 void navigator.locks.request(gate,{mode:'shared'},async()=>{
   void navigator.locks.request(prefix+date,{mode:'shared'},async()=>{ready();await held}).catch(failed)
   await started
 }).catch(failed)
 await started;return release
}
export async function activeRangeConflicts(ranges:DateInterval[]):Promise<string[]>{
 if(!ranges.length)return []
 if(typeof navigator==='undefined'||!navigator.locks){if(typeof document!=='undefined')return ['当前浏览器无法协调跨窗口进行中训练，请在支持 Web Locks 的浏览器中重新预览；未删除任何记录'];return []}
 const held=(await navigator.locks.query()).held??[]
 const counts=new Map<string,number>()
 for(const lock of held){if(!lock.name?.startsWith(prefix))continue;const date=lock.name.slice(prefix.length);if(ranges.some(r=>date>=r.start&&date<=r.end))counts.set(date,(counts.get(date)??0)+1)}
 return [...counts].map(([date,count])=>`进行中凯格尔训练 ${date}（${count} 个运行窗口）：请在原窗口完成或手动结束训练，并返回后重新预览；未删除任何记录`)
}
export async function withHealthRangeGuard<T>(ranges:DateInterval[],run:()=>Promise<T>,signal?:AbortSignal):Promise<T>{
 if(signal?.aborted)throw new Error('删除已取消；未删除任何记录')
 if(!ranges.length)return run()
 const perform=async()=>{if(signal?.aborted)throw new Error('删除已取消；未删除任何记录');const conflicts=await activeRangeConflicts(ranges);if(conflicts.length)throw new Error(conflicts.join('；'));if(signal?.aborted)throw new Error('删除已取消；未删除任何记录');return run()}
 if(typeof navigator==='undefined'||!navigator.locks)return perform()
 return navigator.locks.request(gate,{mode:'exclusive',...(signal?{signal}:{})},perform)
}
