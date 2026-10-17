// Reuse the dedicated pre-existing synthetic QA profile. Never reset or reseed it.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),phase=process.argv[2]
const root=path.resolve(process.env.FITLOG_UX_ARTIFACT_ROOT),profile=path.resolve('../../.qa-profiles/training-recovery-2026-10-09'),url='https://king-640-060.github.io/fitlog-lite/'
await fs.mkdir(root,{recursive:true})
const expected=phase==='baseline'?'d8b08b74e17e91139239f1d6d939ddd9b1d7030c':JSON.parse(await fs.readFile('dist/build-info.json')).build
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const c=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.FITLOG_CHROME,viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'})
try{
 let p=await c.newPage();for(const page of c.pages())if(page!==p)await page.close()
 await p.goto(url,{waitUntil:'networkidle'});await p.locator('#open-management').waitFor()
 const capture=async()=>{
  const {version,rows,config}=await p.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}),rows={};for(const store of [...d.objectStoreNames].sort())rows[store]=await new Promise((r,j)=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)));q.onerror=()=>j(q.error)});const config=Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('fitlog-')).sort().map(k=>[k,localStorage.getItem(k)])),version=d.version;d.close();return{version,rows,config}})
  return{version,stores:Object.keys(rows),allStoreHash:hash(rows),configHash:hash(config),configKeys:Object.keys(config),tables:Object.fromEntries(Object.entries(rows).map(([name,values])=>[name,{count:values.length,idsHash:hash(values.map(v=>v.id)),contentHash:hash(values)}]))}
 }
 const initial=await capture(),initialBuild=await p.locator('meta[name=fitlog-build]').getAttribute('content')
 assert.equal(initial.version,130);assert.equal(initial.stores.length,22)
 assert.equal(initial.allStoreHash,'049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a');assert.equal(initial.configHash,'609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34')
 const before=phase==='baseline'?initial:JSON.parse(await fs.readFile(path.join(root,'preservation-baseline.json'))).data
 assert.deepEqual(initial,before)
 await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();if(r.installing)await new Promise(resolve=>{const w=r.installing;if(['installed','redundant'].includes(w.state)){resolve();return}w.addEventListener('statechange',()=>{if(['installed','redundant'].includes(w.state))resolve()})});if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'})})
 await p.waitForTimeout(1500);await p.close();p=await c.newPage();await p.goto(url,{waitUntil:'networkidle'});await p.locator('#open-management').waitFor();assert.equal(await p.locator('meta[name=fitlog-build]').getAttribute('content'),expected);assert.deepEqual(await capture(),before)
 await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.close();await c.setOffline(true);p=await c.newPage();await p.goto(url,{waitUntil:'networkidle'});await p.locator('#open-management').waitFor();assert.equal(await p.locator('meta[name=fitlog-build]').getAttribute('content'),expected);assert.deepEqual(await capture(),before)
 const worker=await p.evaluate(()=>new Promise(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=e=>resolve(e.data);setTimeout(()=>resolve(null),5000);navigator.serviceWorker.controller.postMessage({type:'FITLOG_SW_DIAGNOSTICS'},[ch.port2])}));assert.equal(worker?.build,expected)
 const receipt={phase,syntheticProfile:true,noResetOrReseed:true,initialBuild,build:expected,workerBuild:worker.build,offlineColdBoot:true,data:before,status:'PASS',physicalIPhone:'Pending'}
 await fs.writeFile(path.join(root,`preservation-${phase}.json`),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt))
}finally{await c.close()}
