// Native asynchronous Weight completion: no fake renderer or personal data.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,seed,read,frame} from './interactionV09Harness.mjs'
import {waitForMainNavigation,clickProgressNavigation} from './navigationSettlement.mjs'
await fs.mkdir(root,{recursive:true});const results=[]
for(const engine of ['chromium','webkit']){
 const b=await pw[engine].launch(),c=await b.newContext({viewport:{width:393,height:852},timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),p=await c.newPage()
 try{
  await p.clock.setFixedTime(new Date('2026-09-28T12:00:00+08:00'));await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();await seed(p);const before=await read(p)
  // Install before the first Progress entry, avoiding a warm liveQuery cache.
  await p.evaluate(()=>{
   window.qaHeld=[];window.qaDelay=true
   const success=Object.getOwnPropertyDescriptor(IDBRequest.prototype,'onsuccess')
   for(const proto of [IDBObjectStore.prototype,IDBIndex.prototype])for(const method of ['getAll','getAllRecords']){const original=proto[method];if(!original)continue;proto[method]=function(...args){const q=original.apply(this,args);if(window.qaDelay&&(this.objectStore?.name??this.name)==='weights')q.qaDelay=true;return q}}
   Object.defineProperty(IDBRequest.prototype,'onsuccess',{configurable:true,get:success.get,set(handler){success.set.call(this,handler&&function(event){const run=()=>handler.call(this,event);if(this.qaDelay)window.qaHeld.push(run);else run()})}})
   window.qaLoadingFrames=[];window.qaCollect=true
   const tick=()=>{const root=document.querySelector('.progress-deck-root'),nav=root?.querySelector('.page-tabs'),pages=[...(root?.querySelectorAll('.progress-deck-stage > .local-deck-page')??[])];for(const page of pages){const anchor=page.querySelector('[data-weight-module]');if(!anchor)continue;const first=page.querySelector('[data-trend-module]');window.qaLoadingFrames.push({time:performance.now(),layoutReady:page.parentElement.classList.contains('local-deck-stage'),hidden:getComputedStyle(page).visibility==='hidden',neighbor:page.classList.contains('local-deck-neighbor'),empty:!anchor.children.length,anchorGap:anchor.getBoundingClientRect().top-nav.getBoundingClientRect().bottom,firstGap:first?first.getBoundingClientRect().top-nav.getBoundingClientRect().bottom:null,scrollTop:page.scrollTop})}if(window.qaCollect)requestAnimationFrame(tick)};requestAnimationFrame(tick)
  })
  await p.locator('[data-tab=progress]').click();await p.waitForFunction(()=>qaHeld.length>0);await p.waitForTimeout(500)
  await p.screenshot({path:path.join(root,engine+'-held.png')})
  await p.evaluate(()=>{window.qaDelay=false;window.qaHeld.splice(0).forEach(run=>run())});await waitForMainNavigation(p,'progress');await p.locator('[data-weight-module] > [data-trend-module=weight]').waitFor();await frame(p);await p.waitForTimeout(80)
  const frames=await p.evaluate(()=>{window.qaCollect=false;return window.qaLoadingFrames});await p.screenshot({path:path.join(root,engine+'-loaded.png')})
  const visible=frames.filter(f=>!f.hidden);assert(visible.some(f=>!f.empty),'actual async completion observed');assert(frames.some(f=>f.empty&&f.hidden),'real hidden placeholder observed');for(const f of frames.filter(f=>f.layoutReady))assert(Math.abs(f.anchorGap-14)<=1,'placeholder anchor owns14px '+JSON.stringify(f));for(const f of visible)if(f.firstGap!==null)assert(Math.abs(f.firstGap-14)<=1,'first visible module14px '+JSON.stringify(f))
  assert.deepEqual(await read(p),before);results.push({engine,status:'PASS',nativeWeightReadHeld:true,frames,all22Exact:true});console.log('PASS '+engine+' async loading')
 }catch(e){results.push({engine,status:'FAIL',error:String(e),frames:await p.evaluate(()=>window.qaLoadingFrames??[])});throw e}
 finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,results},null,2));await c.close();await b.close()}
}
