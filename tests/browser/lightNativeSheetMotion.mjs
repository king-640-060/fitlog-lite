import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {waitForMainNavigation} from './navigationSettlement.mjs'
import {openManagementEntry} from './managementEntry.mjs'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),url=process.env.FITLOG_QA_URL,root=path.resolve(process.env.FITLOG_QA_ARTIFACT_ROOT),results=[]
assert(url);await fs.mkdir(root,{recursive:true})
for(const engine of ['chromium','webkit']){
 const b=await pw[engine].launch({headless:true})
 try{for(const motion of ['no-preference','reduce']){const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:motion,timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();const scenes=[]
 const nav=async tab=>{await p.locator(`[data-tab=${tab}]`).click();await waitForMainNavigation(p,tab)}
 const monitor=async()=>p.evaluate(()=>{window.qaLightFrames=[];const watch=new MutationObserver(()=>{const d=document.querySelector('dialog.sheet[open]');if(!d)return;watch.disconnect();const at=performance.now();const tick=()=>{if(!d.isConnected)return;const css=getComputedStyle(d),m=new DOMMatrix(css.transform==='none'?undefined:css.transform);qaLightFrames.push({t:performance.now()-at,y:m.m42,opacity:css.opacity,animation:css.animationName,duration:css.animationDuration});if(performance.now()-at<340)requestAnimationFrame(tick)};tick()});watch.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']})})
 const closeAndAudit=async(kind,fillSecret=false)=>{
  const d=p.locator('dialog.sheet[open]');await d.waitFor();await p.waitForTimeout(360);const frames=await p.evaluate(()=>qaLightFrames);assert(frames.length>=1)
  if(motion==='reduce')assert(frames.every(f=>f.y===0&&f.animation==='none'))
  else{assert(frames.length>=5);assert(frames[0].y>=15&&frames[0].y<=29);assert(Math.abs(frames.at(-1).y)<.1);assert(frames.some(f=>f.y>1&&f.y<25));assert.equal(frames.at(-1).duration,'0.24s')}
  await p.screenshot({path:path.join(root,`${engine}-${motion}-${kind}.png`)})
  if(fillSecret)await d.locator('[name=apiKey]').fill('SYNTHETIC_EXIT_PRIVACY_ONLY')
  await d.evaluate(e=>{window.qaLightClose=0;e.addEventListener('close',()=>qaLightClose++)});await d.locator('[data-close]').click()
  const immediate=await p.evaluate(()=>{const layer=document.querySelector('.sheet-exit-visual');return{close:qaLightClose,dialogs:document.querySelectorAll('dialog[open]').length,locked:document.body.classList.contains('sheet-open'),exit:!!layer,inert:layer?.inert,aria:layer?.getAttribute('aria-hidden'),fields:layer?.querySelectorAll('input,textarea,select,img,canvas,video,audio,[id],button,a').length??0,text:layer?.textContent??'',secretInDom:document.body.textContent.includes('SYNTHETIC_EXIT_PRIVACY_ONLY')}})
  assert.equal(immediate.close,1);assert.equal(immediate.dialogs,0);assert.equal(immediate.locked,false);assert.equal(immediate.fields,0);assert.equal(immediate.text,'');assert.equal(immediate.secretInDom,false)
  if(motion==='reduce')assert.equal(immediate.exit,false);else{assert.equal(immediate.exit,true);assert.equal(immediate.inert,true);assert.equal(immediate.aria,'true')}
  await p.waitForTimeout(390);assert.equal(await p.locator('.sheet-exit-visual,.training-sheet-exit').count(),0);assert.equal(await p.evaluate(()=>qaLightClose),1);scenes.push({kind,frames,immediate,status:'PASS'})
 }
 await monitor();await p.locator('[data-today-water-record]').click();await closeAndAudit('water')
 await monitor();await p.locator('#today-record-weight').click();await closeAndAudit('weight')
 await monitor();await p.locator('#open-management').click();await p.locator('[data-management-group=food]').click();await p.waitForTimeout(360);const frame=await p.locator('dialog.sheet').evaluate(d=>{window.qaManagedFrame=d;window.qaManagedHead=d.querySelector('.modal-head');return d.getBoundingClientRect().toJSON()});await p.locator('#more-food-library').click();await p.locator('#new-food:visible,.manager-empty-action:visible').click();await p.locator('[name=name]').fill('未保存的合成表单');await p.locator('[data-workspace-back]').click();assert(await p.locator('dialog.sheet').evaluate(d=>d===qaManagedFrame&&d.querySelector('.modal-head')===qaManagedHead));const after=await p.locator('dialog.sheet').boundingBox();assert(Math.abs(after.y-frame.y)<1&&Math.abs(after.height-frame.height)<1);await closeAndAudit('management-deep')
 await monitor();await p.locator('#open-management').click();await openManagementEntry(p,'#more-ai-settings','click');await p.locator('[name=apiKey]').waitFor();await closeAndAudit('sensitive-ai',true)
 // Native Escape has no pre-close frame and intentionally closes immediately, with no content clone.
 await nav('today');await p.locator('[data-today-water-record]').click();await p.keyboard.press('Escape');await p.waitForTimeout(40);assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.locator('.sheet-exit-visual').count(),0)
 if(motion!=='reduce'){
  const css=await p.addStyleTag({content:'.sheet-exit-visual,.sheet-exit-visual > .sheet {animation:none !important}'});await p.locator('#open-management').click();await p.waitForTimeout(260);await p.locator('dialog [data-close]').click();assert.equal(await p.locator('.sheet-exit-visual').count(),1);await p.waitForTimeout(400);assert.equal(await p.locator('.sheet-exit-visual').count(),0);await css.evaluate(e=>e.remove())
 }
 assert.deepEqual(errors,[]);results.push({engine,motion,scenes,managementFrameStable:true,escapeImmediate:true,fallbackRemoval:motion==='reduce'?'not needed':'PASS',errors,status:'PASS',physicalIPhone:'Pending'});await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log('PASS '+engine+'/'+motion);await c.close()
 }}finally{await b.close()}
}
