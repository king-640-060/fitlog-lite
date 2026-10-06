// Synthetic legacy production profile only. Never point this at real user storage.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const phase=process.argv[2],path=process.env.FITLOG_RETIRE_SNAPSHOT||'/tmp/fitlog-retire-preservation-snapshot.json'
const keys=['fitlog-video-search-config-v1','fitlog-video-search-config-v2','fitlog-video-search-key-v1','fitlog-video-search-bilibili-key-v2','fitlog-video-search-privacy-ack-v1','fitlog-video-search-privacy-ack-v2']
const context=await chromium.launchPersistentContext(process.env.FITLOG_RETIRE_PROFILE||'/tmp/fitlog-vision-release-profile',{headless:true,executablePath:process.env.FITLOG_CHROME,viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'})
try{
 const page=await context.newPage();for(const other of context.pages())if(other!==page)await other.close()
 await page.goto('https://king-640-060.github.io/fitlog-lite/',{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
 if(phase==='before')await page.evaluate(keys=>{
  keys.forEach(k=>localStorage.setItem(k,k.includes('config')?JSON.stringify({version:k.endsWith('v2')?2:1,enabled:true,providerPolicy:'all',youtubeEnabled:true,bilibiliEnabled:true}):k.includes('ack')?'1':'synthetic-retired-key'))
  localStorage.setItem('fitlog-voice-config-v1',JSON.stringify({version:1,mode:'zhipu-key'}));localStorage.setItem('fitlog-voice-key-v1','synthetic-preserved-voice-key')
 },keys)
 const capture=()=>page.evaluate(async keys=>{
  const d=await new Promise((resolve,reject)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  const rows={};for(const store of [...d.objectStoreNames].sort())rows[store]=await new Promise((resolve,reject)=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>resolve(q.result.sort((a,b)=>a.id.localeCompare(b.id)));q.onerror=()=>reject(q.error)})
  const kept={};for(const k of Object.keys(localStorage).sort())if(k.startsWith('fitlog-ai-')||k.startsWith('fitlog-voice-')||k==='fitlog-github-sync-token-v1')kept[k]=localStorage.getItem(k)
  const result={version:d.version,stores:[...d.objectStoreNames],rows,kept,retired:keys.filter(k=>localStorage.getItem(k)!==null)};d.close();return result
 },keys)
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
 const data=await capture();assert.equal(data.version,100);assert.equal(data.stores.length,18)
 const receipt={version:data.version,stores:data.stores,businessHash:hash(data.rows),configHash:hash(data.kept),businessRows:Object.values(data.rows).reduce((n,r)=>n+r.length,0),keptKeys:Object.keys(data.kept)}
 if(phase==='before'){assert.deepEqual(data.retired,keys);fs.writeFileSync(path,JSON.stringify(receipt,null,2))}
 else{
  assert.deepEqual(data.retired,[]);assert.deepEqual(receipt,JSON.parse(fs.readFileSync(path)))
  const build=fs.readFileSync('dist/index.html','utf8').match(/name="fitlog-build" content="([a-f0-9]{40})"/)[1]
  assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),build)
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#open-management');assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),build)
  const cold=await capture();assert.deepEqual(cold.retired,[]);assert.equal(hash(cold.rows),receipt.businessHash);assert.equal(hash(cold.kept),receipt.configHash)
 }
 console.log(JSON.stringify({phase,...receipt,videoKeysRemoved:phase==='after',samePersistentProfile:true,noBusinessWrites:true,noRestoreOrClear:true,offlineColdBoot:phase==='after'}))
}finally{await context.close()}
