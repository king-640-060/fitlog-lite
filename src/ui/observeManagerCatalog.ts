import { liveQuery } from 'dexie'
import { db } from '../db/database'
import type { ManagedSurfaceContext } from './managementWorkspace'
/** Refresh only a clean manager route, preserving the workspace frame/query/scroll.
 * Suspended editors retain their DOM/draft; their manager refreshes on return. */
export function observeManagerCatalog(surface:ManagedSurfaceContext|undefined, anchor:Element, tables:string[], refresh:(stillVisible:()=>boolean)=>Promise<void>):void {
  if(!surface)return
  let previous:string|undefined,dirty=false,disposed=false,refreshing=false
  const run=()=>{
    if(disposed||refreshing||!dirty||!anchor.isConnected)return
    dirty=false;refreshing=true
    void refresh(()=>!disposed&&anchor.isConnected).catch(()=>{dirty=true}).finally(()=>{refreshing=false})
  }
  const subscription=liveQuery(async()=>JSON.stringify(await Promise.all(tables.map(t=>db.table(t).orderBy('id').toArray())))).subscribe(value=>{
    if(previous!==undefined&&value!==previous){dirty=true;run()}
    previous=value
  })
  surface.onResume(run)
  surface.onDispose(()=>{disposed=true;subscription.unsubscribe()})
}
