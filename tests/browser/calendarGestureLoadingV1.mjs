// Hold real native IDB completion while preparing Calendar; cancel and reenter without stale mounts.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,seed,read,frame} from './interactionV09Harness.mjs'
import {waitForMainNavigation,waitForProgressNavigation,clickProgressNavigation} from './navigationSettlement.mjs'
await fs.mkdir(root,{recursive:true});const results=[]
for(const engine of ['chromium','webkit']){
 const b=await pw[engine].launch(),c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),p=await c.newPage(),errors=[]
 p.on('pageerror',e=>errors.push(e.message))
 try{
  await p.clock.setFixedTime(new Date('2026-09-28T12:00:00+08:00'));await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();await seed(p);const before=await read(p)
  await p.locator('[data-tab=progress]').click();await waitForMainNavigation(p,'progress')
  await p.evaluate(()=>{
   window.qaHeld=[];window.qaCalendarDelay=true
   const success=Object.getOwnPropertyDescriptor(IDBRequest.prototype,'onsuccess')
   for(const proto of [IDBObjectStore.prototype,IDBIndex.prototype])for(const method of ['getAll','getAllRecords']){const original=proto[method];if(!original)continue;proto[method]=function(...args){const q=original.apply(this,args);if(window.qaCalendarDelay)q.qaHold=true;return q}}
   Object.defineProperty(IDBRequest.prototype,'onsuccess',{configurable:true,get:success.get,set(handler){success.set.call(this,handler&&function(e){const run=()=>handler.call(this,e);if(this.qaHold)qaHeld.push(run);else run()})}})
  })
  await p.locator('[data-progress-view=calendar]').click();await p.waitForFunction(()=>qaHeld.length>0)
  const held=await p.locator('.progress-deck-stage').evaluate(e=>[...e.children].map(p=>({class:p.className,hidden:getComputedStyle(p).visibility==='hidden',rejects:p.hasAttribute('data-no-page-swipe'),children:p.children.length})))
  assert(held.some(p=>p.hidden&&p.rejects),'calendar boundary exists before asynchronous content')
  await p.screenshot({path:path.join(root,engine+'-calendar-held.png')})
  await p.evaluate(()=>{window.qaCalendarDelay=false});await p.locator('[data-progress-view=reports]').click()
  // The real report may share the held query. Request its route first, release native callbacks,
  // then wait for settlement; waiting before release would deadlock the test's own barrier.
  await p.evaluate(()=>qaHeld.splice(0).forEach(run=>run()));await waitForProgressNavigation(p,{view:'reports'});await frame(p);await p.waitForTimeout(100)
  assert.equal(await p.locator('.progress-deck-root > .page-tabs .active').getAttribute('data-progress-view'),'reports');assert.equal(await p.locator('.progress-deck-stage > .local-deck-neighbor').count(),0)
  await clickProgressNavigation(p,'[data-progress-view=calendar]');const final=await p.locator('.progress-deck-stage > .deck-scroll:not(.local-deck-neighbor)').evaluate(e=>({rejects:e.hasAttribute('data-no-page-swipe'),dates:e.querySelectorAll('.calendar-day').length,transform:getComputedStyle(e).transform,scroll:e.scrollTop,head:e.querySelector('.calendar-overview-head').getBoundingClientRect().height}))
  assert(final.rejects&&final.dates===42&&final.transform==='none');await p.screenshot({path:path.join(root,engine+'-calendar-reentered.png')});assert.deepEqual(await read(p),before);assert.deepEqual(errors,[])
  results.push({engine,status:'PASS',held,final,staleReadCanceled:true,all22Exact:true});console.log('PASS '+engine+' calendar loading')
 }catch(error){results.push({engine,status:'FAIL',error:String(error),errors});await p.screenshot({path:path.join(root,engine+'-failure.png')});throw error}
 finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,results},null,2));await c.close();await b.close()}
}
