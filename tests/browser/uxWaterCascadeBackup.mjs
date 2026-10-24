import { openManagementEntry } from './managementEntry.mjs'
import { rangeCascadeQaFixture } from './rangeCascadeFixture.mjs'
// Actual Backup UI after a confirmed synthetic cascade, on both new and prior Backup14 clients.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),engine=process.env.FITLOG_UX_ENGINE||'chromium'
const b=await pw[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.FITLOG_CHROME}:{})}),root=path.resolve(process.env.FITLOG_UX_ARTIFACT_ROOT||'/tmp/ux-backup-'+engine)
await fs.mkdir(root,{recursive:true});const input=rangeCascadeQaFixture(JSON.parse(await fs.readFile('tests/fixtures/uxNutritionCascadeBackupV14.json'))),results=[]
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),sort=data=>Object.fromEntries(Object.entries(data).sort(([a],[b])=>a.localeCompare(b)).map(([n,rows])=>[n,[...rows].sort((a,b)=>a.id.localeCompare(b.id))]))
let exported
try{for(const stage of ['delete-and-export','prior-client-restore','new-client-restore']){
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Asia/Shanghai'}),p=await c.newPage();await p.clock.setFixedTime(new Date('2026-10-17T04:00:00Z'))
 try{
  const url=stage==='prior-client-restore'?(process.env.FITLOG_UX_BASELINE_URL||'http://127.0.0.1:5320/fitlog-lite/'):(process.env.FITLOG_QA_URL||'http://127.0.0.1:5297/fitlog-lite/')
  await p.goto(url,{waitUntil:'networkidle'});await p.locator('#open-management').waitFor()
  const read=()=>p.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)}),rows={};for(const n of [...d.objectStoreNames].sort())rows[n]=await new Promise(r=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)))});const version=d.version;d.close();return{rows,version}})
  const open=async()=>{if(await p.locator('dialog.sheet[open]').count())await p.locator('dialog.sheet[open] [data-close]').click();await p.locator('#open-management').click();await openManagementEntry(p,'#more-backup','click')}
  const file=async value=>p.locator('#backup-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))})
  const restore=async value=>{await open();await file(value);await p.locator('#confirm-restore').click();await p.locator('.confirm-dialog [data-confirm]').click();await p.waitForFunction(()=>!document.querySelector('dialog[open]'))}
  await restore(stage==='delete-and-export'?input:exported)
  if(stage==='delete-and-export'){
   await p.locator('#open-management').click();await openManagementEntry(p,'#more-nutrition-strategies','click');await p.locator('[data-delete-strategy=ux-a]').click();await p.locator('[data-cascade-ack]').check();await p.locator('[data-cascade-confirm]').click();await p.locator('.confirm-dialog [data-confirm]').click();await p.locator('#strategy-manager').waitFor();assert.equal((await read()).rows.nutritionStrategyTemplates.some(t=>t.id==='ux-a'),false)
   await open();const pending=p.waitForEvent('download');await p.locator('#export-backup').click();exported=JSON.parse(await fs.readFile(await(await pending).path()));assert.equal(exported.schemaVersion,14);assert.deepEqual(sort(exported.data),(await read()).rows);assert.equal(JSON.stringify(exported).includes('synthetic-not-a-real-key'),false);await fs.writeFile(path.join(root,engine+'-actual-post-cascade-export14.json'),JSON.stringify(exported,null,2))
  }else{
   const before=await read();assert.equal(before.version,130);assert.equal(Object.keys(before.rows).length,22);assert.deepEqual(before.rows,sort(exported.data));await p.reload({waitUntil:'networkidle'});assert.deepEqual(await read(),before)
   await open();const bad=structuredClone(exported);bad.data.nutritionTargets[0].strategySelection={templateId:'deleted-ux-a',templateName:'失效',phaseId:'deleted-phase',variantId:'deleted-variant',variantName:'失效'};await file(bad);await p.waitForFunction(()=>document.body.innerText.includes('来源'));assert.equal(await p.locator('#confirm-restore').count(),0);assert.deepEqual(await read(),before);await p.screenshot({path:path.join(root,engine+'-'+stage+'-invalid-rejected.png')})
  }
  const value=await read();results.push({stage,url,build:await p.locator('meta[name=fitlog-build]').getAttribute('content'),version:value.version,stores:Object.keys(value.rows).length,postDeleteContentHash:hash(value.rows),status:'PASS'});console.log(JSON.stringify(results.at(-1)))
 }finally{await c.close()}
}await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({engine,status:'PASS',results},null,2))}finally{await b.close()}
