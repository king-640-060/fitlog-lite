// Regression: promoting an already mounted page must preserve its native date-rail scroll.
// Fresh synthetic contexts only. No business writes, date resets or production hooks.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {waitForMainNavigation} from './navigationSettlement.mjs'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),root=path.resolve(process.env.FITLOG_QA_ARTIFACT_ROOT)
await fs.mkdir(root,{recursive:true})
const results=[],day='2026-10-09',past='2026-10-08'
for(const runtime of ['chromium-headless-shell','chromium-full','webkit']){
 const engine=runtime.startsWith('chromium')?'chromium':'webkit',browser=await pw[engine].launch({headless:true,...(runtime==='chromium-full'?{executablePath:pw.chromium.executablePath()}:{})})
 try{for(const font of [140,200]){
  const context=await browser.newContext({viewport:{width:320,height:932},timezoneId:'Asia/Shanghai',isMobile:engine==='chromium',hasTouch:engine==='chromium',reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),key=runtime+'-'+font,errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  try{
   await page.clock.setFixedTime(new Date('2026-10-09T07:24:00+08:00'))
   await page.goto(process.env.FITLOG_QA_URL,{waitUntil:'networkidle'});await page.locator('#today-food-details').waitFor()
   await page.addStyleTag({content:`html{font-size:${font}%}`})
   const snapshot=()=>page.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}),rows={};try{for(const name of [...d.objectStoreNames].sort())rows[name]=await new Promise((r,j)=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});return rows}finally{d.close()}})
   const before=await snapshot(),measurements=[]
   const nav=async tab=>{await page.locator(`.bottom-nav [data-tab=${tab}]`).click();await waitForMainNavigation(page,tab);await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})}
   const inspect=async expected=>{
    const m=await page.evaluate(()=>{const rail=document.querySelector('.food-date-rail'),selected=rail.querySelector('[aria-current=date]'),a=rail.getBoundingClientRect(),b=selected.getBoundingClientRect();return{date:document.querySelector('#view').dataset.foodContentDate,selected:selected.dataset.foodDate,body:document.querySelector('#view > .food-content > .food-content-body').dataset.foodDate,left:rail.scrollLeft,centerDelta:b.x+b.width/2-a.x-a.width/2}})
    assert.equal(m.date,expected,key+' active content date');assert.equal(m.selected,expected,key+' selected date');assert.equal(m.body,expected,key+' actual nutrition date');assert(Math.abs(m.centerDelta)<2,key+' native rail stays centered');measurements.push(m)
   }
   for(const expected of [day,past]){
    await nav('food')
    if(expected===past){await page.locator(`.food-date-item[data-food-date="${past}"]`).click();await page.waitForFunction(date=>document.querySelector('#view')?.dataset.foodContentDate===date,past)}
    await inspect(expected)
    for(let i=0;i<8;i++){await nav('today');await nav('food');await inspect(expected)}
   }
   assert.deepEqual(await snapshot(),before,key+' all22 stores remain unchanged');assert.deepEqual(errors,[])
   await page.screenshot({path:path.join(root,key+'.png'),fullPage:true})
   results.push({runtime,version:browser.version(),font,width:320,build:await page.locator('meta[name=fitlog-build]').getAttribute('content'),measurements,datesPreserved:true,all22Hash:createHash('sha256').update(JSON.stringify(before)).digest('hex'),status:'PASS',physicalIPhone:'Pending'})
   await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({results},null,2));console.log('PASS '+key)
  }catch(error){await page.screenshot({path:path.join(root,key+'-FAIL.png'),fullPage:true}).catch(()=>{});throw error}finally{await context.close()}
 }}finally{await browser.close()}
}
