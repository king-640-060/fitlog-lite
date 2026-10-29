// Actual app, invented data only. Synthetic composition is not a physical IME test.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,read,frame,seed,openDiet,close} from './interactionV09Harness.mjs'
import {waitForMainNavigation,clickProgressNavigation} from './navigationSettlement.mjs'
import {expandReportChapters} from './reportDisclosure.mjs'
await fs.mkdir(root,{recursive:true})
const results=[]
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch(),context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),page=await context.newPage()
 try{
  await page.clock.setFixedTime(new Date('2026-09-28T04:00:00Z'));await page.goto(url,{waitUntil:'networkidle'});await page.locator('#today-food-details').waitFor();await seed(page);const before=await read(page)
  await openDiet(page);const row=page.locator('[data-diet-template-item]').first(),handle=row.locator('[data-sort-handle]'),original=await page.locator('[data-diet-template-item]').evaluateAll(es=>es.map(e=>e.dataset.dietTemplateItem))
  for(const event of ['pointercancel','blur']){
   await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();await page.mouse.move(box.x+22,box.y+20);await page.mouse.down();await page.mouse.move(box.x+22,box.y+100,{steps:5});await page.locator('.sort-placeholder').waitFor()
   if(event==='blur')await page.evaluate(()=>dispatchEvent(new Event('blur')));else await handle.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true})
   await page.mouse.up();assert.equal(await page.locator('.sort-placeholder').count(),0);assert.deepEqual(await page.locator('[data-diet-template-item]').evaluateAll(es=>es.map(e=>e.dataset.dietTemplateItem)),original);assert.deepEqual(await read(page),before)
  }
  await page.locator('[data-diet-template-item] input').first().fill('123.25')
  await page.evaluate(()=>{window.qaPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='dietTemplates')throw new DOMException('Synthetic failure','QuotaExceededError');return window.qaPut.apply(this,args)}})
  await page.locator('#diet-template-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('Synthetic failure'));assert.equal(await page.locator('[data-diet-template-item] input').first().inputValue(),'123.25');assert.deepEqual(await read(page),before)
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.qaPut;delete window.qaPut});await close(page);await frame(page)
  await page.locator('[data-tab=workout]').click();await waitForMainNavigation(page,'workout');await page.locator('#history-workout').click();await page.locator(`[data-workout="${before.workouts[0].id}"]`).click();await page.locator('[data-rename-exercise]').first().click()
  const input=page.locator('[data-exercise-name-form] input');await input.fill('');await page.locator('[data-exercise-name-form] [type=submit]').click();assert.equal(await input.evaluate(e=>e.validity.valueMissing),true);assert.deepEqual(await read(page),before)
  await input.dispatchEvent('compositionstart',{data:''});await input.fill('合成中文动作');await input.dispatchEvent('compositionupdate',{data:'合成中文动作'});assert.deepEqual(await read(page),before);await input.dispatchEvent('compositionend',{data:'合成中文动作'});await page.locator('[data-exercise-name-form] [type=submit]').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'))
  const changed=(await read(page)).workouts[0];assert.equal(changed.exercises[0].exerciseName,'合成中文动作');assert.deepEqual(changed.exercises[0].sets,before.workouts[0].exercises[0].sets);assert.equal(changed.name,before.workouts[0].name);await page.locator('#exit-workout').click();await page.waitForFunction(()=>!document.body.classList.contains('immersive'))
  await page.setViewportSize({width:844,height:390});await page.locator('[data-tab=progress]').click();await waitForMainNavigation(page,'progress');await clickProgressNavigation(page,'[data-progress-view=reports]');await clickProgressNavigation(page,'[data-report-mode=day]');const navBefore=await page.locator('.progress-deck-root > .page-tabs').boundingBox();await expandReportChapters(page);await page.locator('#report-previous').click();await page.locator('#report-return').waitFor();await page.locator('#report-return').click();await page.waitForFunction(()=>!document.querySelector('#report-return'))
  await clickProgressNavigation(page,'[data-report-mode=week]');await page.locator('[data-report-chapter]').first().waitFor({state:'attached'});await expandReportChapters(page);await page.locator('[data-report-chapter]').last().locator(':scope > summary').scrollIntoViewIfNeeded();await page.locator('#report-previous').scrollIntoViewIfNeeded();const navAfter=await page.locator('.progress-deck-root > .page-tabs').boundingBox();const outer=await page.evaluate(()=>scrollY);assert(Math.abs(navBefore.y-navAfter.y-outer)<=1,'only native outer scrolling may move navigation');const leaf=await page.locator('.report-period-stage > .deck-scroll').boundingBox();assert(leaf.height>=44,'landscape report must have a usable scroll viewport')
  const stages=await page.locator('.local-deck-stage').evaluateAll(es=>es.map(e=>({scrollTop:e.scrollTop,scrollLeft:e.scrollLeft,overflow:getComputedStyle(e).overflow})));assert(stages.every(s=>s.scrollTop===0&&s.scrollLeft===0&&s.overflow==='clip'));await page.screenshot({path:path.join(root,engine+'-landscape-report.png')})
  const after=await read(page);for(const table of Object.keys(before))if(table!=='workouts')assert.deepEqual(after[table],before[table]);results.push({engine,status:'PASS',cancelAndBlurZeroWrites:true,failedDietSavePreservesDraft:true,blankNameRejected:true,syntheticCompositionSaved:true,setsAndOther21StoresExact:true,reportPreviousReturnClickable:true,navBefore,navAfter,stages,physicalIME:'Pending'})
  console.log('PASS '+engine+' edges')
 }catch(error){results.push({engine,status:'FAIL',error:String(error)});await page.screenshot({path:path.join(root,engine+'-failure.png')});throw error}
 finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,results},null,2));await context.close();await browser.close()}
}
