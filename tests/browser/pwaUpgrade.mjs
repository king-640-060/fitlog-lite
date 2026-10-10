// Real generated SW/assets, same origin deployment switch, synthetic frozen data only.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const old=path.resolve(process.env.FITLOG_PWA_OLD_DIST||'/tmp/fitlog-pwa-old/33798a7'), next=path.resolve('dist')
const prompt=process.env.FITLOG_PWA_PROMPT_DIST
const marker=dir=>fs.readFileSync(path.join(dir,'index.html'),'utf8').match(/name="fitlog-build" content="([a-f0-9]{40})"/)?.[1]
const expected=marker(next);assert.ok(expected)
assert.ok(fs.readFileSync(path.join(old,'index.html'),'utf8').includes('index-DGXlZzHp.js'),'real 33798a7 assets are the old baseline')
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/legacyV7Data.json',import.meta.url)))
let serving=old
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost')
 if(url.pathname==='/observer.html'){response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});response.end('<title>Upgrade observer outside App scope</title>');return}
 const rel=decodeURIComponent(url.pathname).replace(/^\/fitlog-lite\//,'')||'index.html'
 const file=path.resolve(serving,rel)
 if(!file.startsWith(serving+path.sep)||!fs.existsSync(file)){response.writeHead(404);response.end();return}
 response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});response.end(fs.readFileSync(file))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/fitlog-lite/'
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
const receipts=[]
const workerBuild=async page=>page.evaluate(async()=>{
 const w=(await navigator.serviceWorker.getRegistration('/fitlog-lite/'))?.active;if(!w)return null
 return new Promise(resolve=>{const c=new MessageChannel(),t=setTimeout(()=>resolve(null),800);c.port1.onmessage=e=>{clearTimeout(t);c.port1.close();resolve(e.data.build)};w.postMessage({type:'FITLOG_SW_DIAGNOSTICS'},[c.port2])})
})
const read=async page=>page.evaluate(async()=>{
 const d=await new Promise((resolve,reject)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
 const records={};for(const name of d.objectStoreNames)records[name]=await new Promise(resolve=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>resolve(q.result)})
 const result={version:d.version,records,ai:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('fitlog-ai-')).sort().map(k=>[k,localStorage.getItem(k)]))};d.close();return result
})
const canonical=value=>JSON.stringify({...value,records:Object.fromEntries(Object.entries(value.records).sort(([a],[b])=>a.localeCompare(b)).map(([k,rows])=>[k,rows.sort((a,b)=>a.id.localeCompare(b.id))]))})
const hash=value=>createHash('sha256').update(canonical(value)).digest('hex')
const verifyMigration=(before,after)=>{
 assert.equal(after.version,110);assert.equal(Object.keys(after.records).length,20)
 for(const name of ['nutritionStrategyTemplates','nutritionStrategyVariants','nutritionStrategyPhases','dietEvents','sleepSessions','waterLogs'])assert.deepEqual(after.records[name],[],'additive migration must not synthesize goals/strategies')
 const preserved={version:before.version,records:Object.fromEntries(Object.keys(before.records).map(k=>[k,after.records[k]])),ai:after.ai}
 assert.equal(hash(preserved),hash(before),'all original records and AI credentials preserved across V7 to V11')
}
const seed=async page=>page.evaluate(async fixture=>{
 const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)})
 await new Promise((resolve,reject)=>{const t=d.transaction([...d.objectStoreNames],'readwrite');for(const name of d.objectStoreNames){if(!(name in fixture)&&!['nutritionStrategyTemplates','nutritionStrategyVariants','nutritionStrategyPhases','dietEvents','sleepSessions','waterLogs'].includes(name))throw Error('Unexpected unfixtured store: '+name);const s=t.objectStore(name);s.clear();for(const row of fixture[name]??[])s.put(row)}t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()
 const profile={id:'pwa-synthetic',preset:'zhipu',name:'智谱 · glm-4.5',protocol:'openai-chat-completions',baseUrl:'https://mock-pwa.invalid/v1',model:'glm-5.3-flash',visionModel:'glm-5.3-flash',toolCapability:'supported',visionCapability:'supported',createdAt:'',updatedAt:''}
 localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([profile]));localStorage.setItem('fitlog-ai-active-profile-v1',profile.id);localStorage.setItem('fitlog-ai-key-v1:'+profile.id,'synthetic-pwa-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1')
},fixture)
const open=async page=>{await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');await page.waitForFunction(()=>!!navigator.serviceWorker.controller)}
const close=page=>page.locator('dialog[open] [data-close]').click()
const diagnostics=async page=>{await page.locator('#open-management').click();await page.locator('#more-diagnostics').click();await page.waitForSelector('[data-diagnostic="App build"]')}
try{
 for(const mode of ['legacy',...(prompt?['prompt']:[])]){
  serving=mode==='legacy'?old:path.resolve(prompt)
  if(mode==='prompt')assert.notEqual(marker(serving),expected,'test uses distinct build-time Git identities')
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai'})
  try{
   let page=await context.newPage(),navigations=0;page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++})
   let replies=[]
   await page.route('https://mock-pwa.invalid/**',async route=>{await route.fulfill({json:{choices:[{message:replies.shift()??{content:'Synthetic reply'}}]}})})
   await open(page);await seed(page);await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#open-management')
   const before=await read(page);assert.equal(before.version,mode==='legacy'?70:110);assert.equal(Object.keys(before.records).length,mode==='legacy'?14:20);assert.equal(Object.values(before.records).flat().length,15)
   // Keep an actual unsaved selected image in memory during the deployment.
   await page.locator('[data-tab=food]').click();await page.locator('#food-library').click();await page.locator('#food-vision-import').click()
   const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=32;return c.toDataURL('image/png').split(',')[1]}),'base64')
   await page.locator('#vision-album-file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});await page.waitForSelector('.vision-images img')
   const image=await page.locator('.vision-images img').getAttribute('src'),beforeNav=navigations
   serving=next
   await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()})
   await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting)
   await page.waitForTimeout(800)
   assert.equal(navigations,beforeNav,'no automatic reload during image editing');assert.equal(await page.locator('.vision-images img').getAttribute('src'),image)
   if(mode==='legacy'){
    // An old client cannot acquire the new prompt retroactively: close all old scope clients.
    const observer=await context.newPage();await observer.goto(origin+'/observer.html');await page.close()
    // The out-of-scope observer may not start an idle worker for MessageChannel diagnostics.
    // Wait for native activation, then prove the executing build on a real controlled App client below.
    await observer.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration('/fitlog-lite/');return r?.active?.state==='activated'&&!r.waiting&&!r.installing})
    page=await context.newPage();await open(page);await observer.close()
   }else{
    await close(page)
    await page.locator('#open-ai-assistant').click();await page.locator('#ai-message-input').fill('unsent synthetic draft');await close(page)
    await diagnostics(page);await page.locator('#pwa-apply').waitFor({state:'visible'});await page.locator('#pwa-apply').click();await page.waitForFunction(()=>document.querySelector('#pwa-status').textContent.includes('草稿'))
    assert.equal(await page.locator('.confirm-dialog').count(),0);assert.equal(navigations,beforeNav)
    await close(page);await page.locator('#open-ai-assistant').click();assert.equal(await page.locator('#ai-message-input').inputValue(),'unsent synthetic draft');await page.locator('#ai-message-input').fill('');await close(page)
    await page.locator('#open-ai-assistant').click()
    replies=[{content:'',tool_calls:[{id:'synthetic-plan',type:'function',function:{name:'propose_tasks',arguments:JSON.stringify({tasks:[{title:'Synthetic pending task',date:'2026-10-03',tagNames:[]}]})}}]},{content:'Synthetic pending proposal'}]
    await page.locator('#ai-message-input').fill('Synthetic pending plan');await page.locator('#ai-send').click();await page.waitForSelector('.ai-proposal');await page.waitForFunction(()=>document.querySelector('#ai-stop').hidden)
    await close(page);await diagnostics(page);await page.locator('#pwa-apply').click();await page.waitForFunction(()=>document.querySelector('#pwa-status').textContent.includes('提案'))
    assert.equal(await page.locator('.confirm-dialog').count(),0);assert.equal(hash(await read(page)),hash(before))
    await close(page);await page.locator('#open-ai-assistant').click();await page.locator('.ai-proposal').getByText('取消',{exact:true}).click();await close(page)
    const other=await context.newPage();await open(other)
    await diagnostics(page);await page.locator('#pwa-apply').click();await page.locator('[data-confirm]').click();await page.waitForFunction(()=>document.querySelector('#pwa-status').textContent.includes('其他 FitLog'))
    assert.equal(navigations,beforeNav);await other.close()
    // Cancellation must leave the old running client untouched.
    await page.locator('#pwa-apply').click();await page.locator('[data-cancel]').click();assert.equal(navigations,beforeNav)
    await page.screenshot({path:'/tmp/fitlog-pwa-waiting.png'})
    await page.locator('#pwa-apply').click();await page.locator('[data-confirm]').click();await page.waitForFunction(expected=>document.querySelector('meta[name=fitlog-build]')?.content===expected,expected)
    await page.waitForSelector('#open-management');assert.equal(navigations,beforeNav+1,'one explicit reload')
    await page.waitForTimeout(1200);assert.equal(navigations,beforeNav+1,'no reload loop')
   }
   assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),expected)
   assert.equal(await workerBuild(page),expected)
   await diagnostics(page)
   assert.equal(await page.locator('[data-diagnostic="App build"]').innerText(),expected)
   assert.ok((await page.locator('[data-diagnostic="SW controller build / state"]').innerText()).includes(expected))
   assert.equal(await page.locator('[data-diagnostic="SW scope"]').innerText(),base)
   assert.ok(!(await page.locator('.pwa-diagnostics').innerText()).includes('synthetic-pwa-key'))
   await page.waitForTimeout(250);await page.screenshot({path:`/tmp/fitlog-pwa-${mode}-diagnostics.png`});await close(page)
   verifyMigration(before,await read(page))
   await page.locator('[data-tab=food]').click();await page.locator('#food-library').click()
   const gap=await page.locator('#library-search').evaluate(e=>e.getBoundingClientRect().left+parseFloat(getComputedStyle(e).paddingLeft)-e.parentElement.querySelector('.icon').getBoundingClientRect().right)
   assert.ok(gap>=8);await page.locator('#food-vision-import').click();assert.ok((await page.locator('.vision-provider').innerText()).includes('智谱 · glm-5.3-flash · 图片：glm-5.3-flash'));await close(page)
   // Cold page creation offline; original origin data and SW retained.
   await page.close();await context.setOffline(true);page=await context.newPage();await open(page)
   assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),expected);verifyMigration(before,await read(page));assert.equal(await workerBuild(page),expected)
   await diagnostics(page);assert.equal(await page.locator('[data-diagnostic=Registration]').innerText(),'已注册');assert.ok((await page.locator('[data-diagnostic=Active]').innerText()).includes(expected));await close(page)
   const current=await read(page)
   receipts.push({mode,baselineDbVersion:before.version,baselineStores:Object.keys(before.records).length,build:expected,waiting:true,selectedImagePreserved:true,aiDraftBlocked:mode==='prompt',pendingProposalBlocked:mode==='prompt',otherClientBlocked:mode==='prompt',cancelPreserved:mode==='prompt',singleConfirmedReload:mode==='prompt',dbVersion:current.version,stores:Object.keys(current.records).length,legacyStoresPreserved:14,newStrategyStoresEmpty:true,newDietEventStoreEmpty:true,newRecoveryStoresEmpty:true,rows:15,businessAndAiHash:hash(before),offlineColdBoot:true,physicalSafari:'Pending',physicalInstalledPwa:'Pending'})
  }finally{await context.close()}
 }
 console.log(JSON.stringify(receipts,null,2))
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
