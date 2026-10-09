// Dedicated synthetic production profile from the previous release, reused without reseeding; never the user's browser.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import path from 'node:path'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const phase=process.argv[2],dir=path.resolve('../../artifacts/coach-report-v3-1-2026-10-09'),profile=path.resolve('../../.qa-profiles/training-recovery-2026-10-09'),url='https://king-640-060.github.io/fitlog-lite/'
await fs.mkdir(dir,{recursive:true})
const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FITLOG_CHROME,viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'})
try{
 let page=await context.newPage();for(const p of context.pages())if(p!==page)await p.close()
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')

 const capture=()=>page.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});const rows={};for(const name of [...d.objectStoreNames].sort())rows[name]=await new Promise(r=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)))});const config=Object.fromEntries(Object.keys(localStorage).filter(k=>/^fitlog-(ai|voice|water-reference)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)]));const result={version:d.version,stores:[...d.objectStoreNames],rows,config};d.close();return result})
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
 const receipt=async()=>{const d=await capture();assert.equal(d.version,110);assert.equal(d.stores.length,20);return{version:d.version,stores:d.stores,allStoreHash:hash(d.rows),configHash:hash(d.config),configKeys:Object.keys(d.config),counts:Object.fromEntries(Object.entries(d.rows).map(([n,r])=>[n,r.length]))}}
 let result=await receipt()
 if(phase==='baseline'){assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),'0cc5b81949d80e3954664dd7f82eec3849bd7879');await fs.writeFile(path.join(dir,'preservation-baseline.json'),JSON.stringify(result,null,2))}
 else{
  const before=JSON.parse(await fs.readFile(path.join(dir,'preservation-baseline.json')));assert.deepEqual(result,before)
  const expected=JSON.parse(await fs.readFile('dist/build-info.json')).build
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();if(r.installing)await new Promise(resolve=>{const w=r.installing;if(['installed','redundant'].includes(w.state)){resolve();return}w.addEventListener('statechange',()=>{if(['installed','redundant'].includes(w.state))resolve()})});if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'})})
  await page.waitForTimeout(1500);await page.close();page=await context.newPage();await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),expected);assert.deepEqual(await receipt(),before)
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.close();await context.setOffline(true);page=await context.newPage();await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');assert.equal(await page.locator('meta[name=fitlog-build]').getAttribute('content'),expected);assert.deepEqual(await receipt(),before)
  const worker=await page.evaluate(()=>new Promise(resolve=>{const c=new MessageChannel();const timer=setTimeout(()=>resolve(null),3000);c.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data)};navigator.serviceWorker.controller.postMessage({type:'FITLOG_SW_DIAGNOSTICS'},[c.port2])}));assert.equal(worker?.build,expected);result={...result,build:expected,workerBuild:worker.build,offlineColdBoot:true}
 }
 await fs.writeFile(path.join(dir,`preservation-${phase}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify({phase,syntheticProfile:true,sameProfileThroughoutThisRelease:true,...result}))
}finally{await context.close()}
