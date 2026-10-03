// Existing synthetic persistent production profile; never reseed/clear business data.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const phase=process.argv[2];assert.ok(['before','after'].includes(phase))
const snapshot='/tmp/fitlog-voice-release-snapshot.json', fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/legacyV7Data.json',import.meta.url),'utf8'))
const context=await chromium.launchPersistentContext('/tmp/fitlog-vision-release-profile',{headless:true,executablePath:process.env.FITLOG_CHROME,viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'})
try{
 await context.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined})
 const page=await context.newPage();await page.goto('https://king-640-060.github.io/fitlog-lite/',{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
 if(phase==='before')await page.evaluate(()=>{
  if(!localStorage.getItem('fitlog-ai-profiles-v1')){const profile={id:'voice-preservation',name:'合成保留验证',protocol:'openai-chat-completions',baseUrl:'https://mock-preservation.invalid/v1',model:'synthetic-chat',visionModel:'synthetic-image',toolCapability:'unsupported',visionCapability:'unsupported',createdAt:'',updatedAt:''};localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([profile]));localStorage.setItem('fitlog-ai-active-profile-v1',profile.id);localStorage.setItem('fitlog-ai-key-v1:'+profile.id,'synthetic-preservation-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1')}
  localStorage.setItem('fitlog-ai-voice-privacy-ack-v1','1')
 })
 if(phase==='after'){
  await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration())?.update()})
  await page.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration())?.installing)
  const expected=fs.readFileSync('dist/index.html','utf8').match(/assets\/([^"/]+\.js)/)[1]
  const build=fs.readFileSync('dist/index.html','utf8').match(/name="fitlog-build" content="([a-f0-9]{40})"/)[1]
  if(await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting) || !(await page.locator('script[type=module][src]').getAttribute('src')).endsWith(expected)){
   // Saved synthetic profile: end every legacy scope client so a prompt worker can activate naturally.
   for(const other of context.pages())if(other!==page)await other.close()
   await page.goto('https://king-640-060.github.io/',{waitUntil:'domcontentloaded'})
   await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration('/fitlog-lite/');return r?.active?.state==='activated'&&!r.waiting&&!r.installing})
   await page.goto('https://king-640-060.github.io/fitlog-lite/',{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
  }
  assert.ok((await page.locator('script[type=module][src]').getAttribute('src')).endsWith(expected),'new bundle under original persistent Service Worker')
  assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),build)
  await page.evaluate(()=>location.hash='quick=ai');await page.waitForSelector('#ai-mic');assert.equal(new URL(page.url()).hash,'');assert.ok(!(await page.locator('.ai-current-profile').innerText()).includes('尚未连接'));await page.locator('dialog [data-close]').click()
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#open-management');assert.equal(await page.locator('dialog').count(),0)
 }
 const values=await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  if(![70,80].includes(db.version)||db.objectStoreNames.length!==(db.version===70?14:17))throw Error('database identity changed')
  const records={};for(const store of db.objectStoreNames)records[store]=await new Promise((resolve,reject)=>{const q=db.transaction(store,'readonly').objectStore(store).getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  for(const store of ['nutritionStrategyTemplates','nutritionStrategyVariants','nutritionStrategyPhases']) { if(records[store]?.length)throw Error('Legacy upgrade unexpectedly created strategy records');delete records[store] }
  const version=db.version;db.close();const ai={};for(const key of Object.keys(localStorage).filter(k=>k.startsWith('fitlog-ai-')).sort())ai[key]=localStorage.getItem(key)
  return {records,ai,version}
 })
 if(phase==='after')assert.equal(values.version,80,'Production migrated to Dexie V8')
 const canonical=records=>JSON.stringify(Object.fromEntries(Object.entries(records).sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>[key,rows.sort((a,b)=>a.id.localeCompare(b.id))])))
 assert.equal(canonical(values.records),canonical(fixture),'all 14 frozen stores/15 rows remain identical')
 const hash=text=>createHash('sha256').update(text).digest('hex'),result={businessHash:hash(canonical(values.records)),aiConfigHash:hash(JSON.stringify(values.ai)),aiKeys:Object.keys(values.ai)}
 if(phase==='before')fs.writeFileSync(snapshot,JSON.stringify(result));else assert.deepEqual(result,JSON.parse(fs.readFileSync(snapshot,'utf8')))
 console.log(JSON.stringify({phase,stableDb:'fitlog-lite-db',dexie:values.version/10,stores:values.version===80?17:14,legacyStoresPreserved:14,newStrategyStoresEmpty:true,records:15,businessPreserved:true,aiConfigAndKeyPreserved:phase==='after',voiceAckPreserved:phase==='after',samePersistentProfile:true,noBusinessReseeding:true,offlineColdBoot:phase==='after'}))
}finally{await context.close()}
