// Explicit intermediate-frame evidence; fresh invented records, no saved draft writes.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,read,seed,openDiet,frame,close} from './interactionV09Harness.mjs'
await fs.mkdir(root,{recursive:true});const results=[]
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),page=await context.newPage();let cdp
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('#today-food-details').waitFor();await seed(page);const before=await read(page);await openDiet(page)
  const list=page.locator('.diet-sort-list'),row=page.locator('[data-diet-template-item]').first(),handle=row.locator('[data-sort-handle]'),original=await list.locator('[data-diet-template-item]').evaluateAll(es=>es.map(e=>e.dataset.dietTemplateItem));await handle.scrollIntoViewIfNeeded();await frame(page)
  const bounds=await row.boundingBox(),h=await handle.boundingBox(),x=h.x+22,y=h.y+20,samples=[]
  if(engine==='chromium')cdp=await context.newCDPSession(page)
  const input=async(type,pointerY=y)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{start:'touchStart',move:'touchMove',end:'touchEnd'}[type],touchPoints:type==='end'?[]:[{x,y:pointerY}]});else if(type==='start'){await page.mouse.move(x,pointerY);await page.mouse.down()}else if(type==='move')await page.mouse.move(x,pointerY,{steps:5});else await page.mouse.up()}
  const capture=async(name,pointerY)=>{await page.waitForTimeout(70);const actual=await row.boundingBox(),placeholder=await list.evaluate(e=>{const children=[...e.children].filter(n=>!n.classList.contains('is-sorting')),p=children.find(n=>n.classList.contains('sort-placeholder'));return{index:children.indexOf(p),height:p?.getBoundingClientRect().height}});assert(Math.abs(actual.y-bounds.y-(pointerY-y))<=3);assert(placeholder.height>0);await page.screenshot({path:path.join(root,engine+'-'+name+'.png')});samples.push({name,clientY:pointerY,startTop:bounds.y,actualTop:actual.y,placeholder})}
  await input('start');await capture('start',y);await input('move',y+30);await capture('30px',y+30);await input('move',810)
  for(let i=0;i<40;i++){const index=await list.evaluate(e=>[...e.children].filter(n=>!n.classList.contains('is-sorting')).findIndex(n=>n.classList.contains('sort-placeholder')));if(index>=2)break;await page.waitForTimeout(50)}
  await capture('cross-two',810);assert(samples.at(-1).placeholder.index>=2,'must cross at least the second and third rows');await input('end');await frame(page);const sorted=await list.locator('[data-diet-template-item]').evaluateAll(es=>es.map(e=>e.dataset.dietTemplateItem));assert.notDeepEqual(sorted,original);assert.equal(await page.locator('.sort-placeholder').count(),0);await page.screenshot({path:path.join(root,engine+'-released.png')});assert.deepEqual(await read(page),before)
  await close(page);results.push({engine,status:'PASS',input:cdp?'native Chromium CDP touch':'WebKit pointer',samples,original,sorted,all22Exact:true,physicalIPhone:'Pending'});console.log('PASS '+engine+' sort frames')
 }catch(error){results.push({engine,status:'FAIL',error:String(error)});await page.screenshot({path:path.join(root,engine+'-failure.png')});throw error}
 finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,results},null,2));await cdp?.detach();await context.close();await browser.close()}
}
