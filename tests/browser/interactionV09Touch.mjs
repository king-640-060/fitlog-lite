// Chromium native CDP touch and WebKit synthetic touch-event branch; neither is an iPhone test.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,read,seed,openDiet,close,frame} from './interactionV09Harness.mjs'
import {clickProgressNavigation,waitForMainNavigation,waitForProgressNavigation} from './navigationSettlement.mjs'
await fs.mkdir(root,{recursive:true});const results=[]
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),page=await context.newPage(),samples=[]
 let cdp
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('#today-food-details').waitFor();await seed(page);const before=await read(page)
  if(engine==='chromium')cdp=await context.newCDPSession(page)
  const swipe=async(nav,stage,cancel=false,parents=[])=>{
   const bounds=await page.locator(nav).boundingBox(),x=bounds.x+bounds.width-30,y=bounds.y+bounds.height/2,initial=await Promise.all(parents.map(s=>page.locator(s).boundingBox()))
   const dispatch=async(type,dx)=>{
    if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:({start:'touchStart',move:'touchMove',end:'touchEnd',cancel:'touchCancel'})[type],touchPoints:['end','cancel'].includes(type)?[]:[{x:x-dx,y}]})
    else await page.evaluate(({nav,type,x,y})=>{let target=window.qaTouchTarget;if(type==='start')target=window.qaTouchTarget=document.elementFromPoint(x,y);const event=new Event('touch'+type,{bubbles:true,cancelable:true}),touch={identifier:7,clientX:x,clientY:y,target};Object.defineProperties(event,{touches:{value:['end','cancel'].includes(type)?[]:[touch]},changedTouches:{value:[touch]}});target.dispatchEvent(event)}, {nav,type,x:x-dx,y})
   }
   await dispatch('start',0)
   for(const distance of [25,60,100,150,175]){
    await dispatch('move',distance);await page.waitForTimeout(85)
    const measured=await page.locator(stage).evaluate(e=>({width:e.clientWidth,children:[...e.children].map(n=>({x:n.getBoundingClientRect().x,width:n.getBoundingClientRect().width,neighbor:n.classList.contains('local-deck-neighbor')}))}));assert.equal(measured.children.length,2);assert(Math.abs(Math.abs(measured.children[0].x-measured.children[1].x)-measured.width)<=1)
    for(let i=0;i<parents.length;i++){const actual=await page.locator(parents[i]).boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(actual[k]-initial[i][k])<=1)}
    assert.equal(await page.locator('.bottom-nav [aria-current=page]').getAttribute('data-tab'),nav==='.meal-fixed-tabs'?'today':'progress');samples.push({nav,distance,cancel,measured})
   }
   await page.screenshot({path:path.join(root,engine+'-'+samples.length+'-mid.png')});await dispatch(cancel?'cancel':'end',175);await page.waitForTimeout(300);await frame(page);assert.equal(await page.locator(stage+' > .local-deck-neighbor').count(),0)
  }
  await openDiet(page);await swipe('.meal-fixed-tabs','.diet-meal-stage',true);assert.equal(await page.locator('.meal-fixed-tabs .active').getAttribute('data-diet-meal-tab'),'breakfast');await swipe('.meal-fixed-tabs','.diet-meal-stage');assert.equal(await page.locator('.meal-fixed-tabs .active').getAttribute('data-diet-meal-tab'),'lunch');await close(page);await frame(page)
  await page.locator('[data-tab=progress]').click();await waitForMainNavigation(page,'progress');await clickProgressNavigation(page,'[data-progress-view=calendar]');await swipe('.progress-deck-root > .page-tabs','.progress-deck-stage');await waitForProgressNavigation(page,{view:'reports'});await swipe('.report-daily-shell > .report-mode','.report-period-stage',false,['.progress-deck-root > .page-tabs','.report-deck-shell > .report-kinds']);await waitForProgressNavigation(page,{mode:'month'});assert.deepEqual(await read(page),before)
  results.push({engine,status:'PASS',input:cdp?'native Chromium CDP touch':'WebKit synthetic touch-event branch',samples,all22Exact:true,physicalIPhone:'Pending'});console.log('PASS '+engine+' touch')
 }catch(error){results.push({engine,status:'FAIL',error:String(error)});await page.screenshot({path:path.join(root,engine+'-failure.png')});throw error}
 finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,results},null,2));await cdp?.detach();await context.close();await browser.close()}
}
