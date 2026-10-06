// Isolated synthetic DB only; permanent deletion is tested through the real UI.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5183/fitlog-lite/',prod=base.includes('github.io'),receipts=[]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try{for(const width of [320,375,390,430])for(const scale of [100,120,140]){
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai'})
 try{const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale/100+'px',scale)
 const date=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
 const data=await page.evaluate(async date=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});const now=new Date().toISOString(),habits=[0,1,100].map((n,i)=>({id:'delete-'+n,name:'删除测试'+n,active:true,sortOrder:i,createdAt:now,updatedAt:now}));habits.push({id:'keep',name:'保留的习惯',active:true,sortOrder:4,createdAt:now,updatedAt:now});const checks=[];for(const n of [1,100])for(let i=0;i<n;i++){const dt=new Date(date+'T12:00:00');dt.setDate(dt.getDate()-i);const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;checks.push({id:'record-'+n+'-'+i,habitId:'delete-'+n,date:key,completedAt:now,createdAt:now,updatedAt:now})}checks.push({id:'keep-record',habitId:'keep',date,completedAt:now,createdAt:now,updatedAt:now});await new Promise((r,j)=>{const t=d.transaction(['habits','habitCheckIns'],'readwrite');for(const x of habits)t.objectStore('habits').put(x);for(const x of checks)t.objectStore('habitCheckIns').put(x);t.oncomplete=r;t.onerror=()=>j(t.error)});d.close();return{habits,checks}},date)
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#today-habits-manage')
 const read=()=>page.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)}),data={};for(const name of ['habits','habitCheckIns'])data[name]=await new Promise(r=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result)});d.close();return data})
 await page.locator('#today-habits-manage').click()
 for(const n of [0,1,100]){
  await page.locator(`[data-habit-edit="delete-${n}"]`).click();await page.waitForSelector('#habit-delete');assert.equal(await page.locator('#habit-delete').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');await page.locator('#habit-delete').click();await page.getByRole('heading',{name:n?'删除习惯及全部记录？':'删除习惯？',exact:true}).waitFor()
  const confirm=page.locator('.confirm-dialog [data-confirm]');if(n)assert.ok((await page.locator('dialog[open]').last().innerText()).includes(`将永久删除这个习惯和 ${n} 条打卡记录。`))
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const box=await confirm.boundingBox();assert.ok(box.height>=44&&box.width>=44);assert.equal(await confirm.evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await confirm.innerText(),n?`删除习惯及 ${n} 条记录`:'删除习惯')
  await page.screenshot({path:`/tmp/habit-deletion-${prod?'prod':'local'}-${width}-${scale}-${n}.png`});const before=await read();await page.getByRole('button',{name:'取消',exact:true}).last().click();assert.deepEqual(await read(),before)
  await page.locator('#habit-delete').click();await page.locator('.confirm-dialog [data-confirm]').click();await page.waitForSelector('[data-habit-edit=keep]');assert.equal(await page.locator(`[data-habit-edit="delete-${n}"]`).count(),0);const after=await read();assert.ok(!after.habits.some(h=>h.id==='delete-'+n));assert.ok(!after.habitCheckIns.some(c=>c.habitId==='delete-'+n));assert.deepEqual(after.habitCheckIns.find(c=>c.id==='keep-record'),data.checks.at(-1))
 }
 await page.locator('dialog[open] [data-close]').click();assert.ok(!(await page.locator('#view').innerText()).includes('删除测试'));assert.ok((await page.locator('#view').innerText()).includes('保留的习惯'))
 await page.locator('[data-tab=progress]').click();await page.locator('[data-progress-view=calendar]').click();await page.locator(`[data-date="${date}"]`).click();assert.ok(!(await page.locator('dialog[open]').innerText()).includes('删除测试'));await page.locator('dialog[open] [data-close]').click();await page.locator('[data-progress-view=reports]').click();assert.ok(!(await page.locator('#view').innerText()).includes('删除测试'))
 assert.deepEqual(errors,[]);receipts.push({width,scale,counts:[0,1,100],cancelPreserves:true,quietDanger:true,allHistoryDeleted:true,unrelatedPreserved:true,todayManagerCalendarReports:true});console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}await fs.writeFile(`/tmp/habit-deletion-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))}finally{await browser.close()}
