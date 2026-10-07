// Isolated synthetic profiles only; real Habit UI, shared viewport with a mocked keyboard.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5183/fitlog-lite/',prod=base.includes('github.io'),receipts=[]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try{for(const [width,height] of [[320,812],[375,812],[390,844],[430,932]])for(const scale of [100,120,140])for(const reduced of [false,true]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai',reducedMotion:reduced?'reduce':'no-preference'})
 try{
 await context.addInitScript(()=>{window.qaViewport=Object.assign(new EventTarget(),{height:innerHeight,width:innerWidth,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:qaViewport})})
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
 // Substitute a 34px platform inset only in this synthetic context, using the existing declarations.
 await page.addStyleTag({content:`html{font-size:${scale}%}.habit-sheet{padding-bottom:34px}.habit-sheet .modal-body{padding-bottom:calc(18px + 34px)}`})
 const body=page.locator('.habit-sheet .modal-body'),form=page.locator('#habit-form'),save=form.locator('button[type=submit]')
 const settle=async()=>{await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await Promise.all(document.querySelector('.habit-sheet').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))})}
 const frame=()=>page.locator('.habit-sheet').evaluate(e=>{const r=e.getBoundingClientRect();return{top:r.top,height:r.height}})
 const stable=(a,b)=>{assert.ok(Math.abs(a.top-b.top)<1&&Math.abs(a.height-b.height)<1,JSON.stringify({a,b}))}
 let maxOverlap=0
 const measure=async(settled=true)=>{
  const m=await form.evaluate(f=>{
   const a=f.querySelector('.habit-editor-actions'),button=a.querySelector('button'),r=button.getBoundingClientRect(),s=f.closest('.modal-body'),b=s.getBoundingClientRect();let overlap=0
   for(const e of f.querySelectorAll('input,textarea,fieldset,.habit-target-row,.habit-status-section')){const q=e.getBoundingClientRect();if(!e.getClientRects().length||q.bottom<=b.top||q.top>=b.bottom)continue;const x=Math.min(r.right,q.right)-Math.max(r.left,q.left),y=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);if(x>0&&y>0)overlap=Math.max(overlap,y)}
   const cs=getComputedStyle(a),bs=getComputedStyle(button),content=f.parentElement
   return{position:cs.position,overlap,height:r.height,radius:bs.borderRadius,flowY:r.top-b.top+s.scrollTop,screenY:r.top,scroll:s.scrollTop,bodyBottom:b.bottom,saveBottom:r.bottom,bodyTop:b.top,bodyHeight:s.clientHeight,overflow:s.scrollWidth>s.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,residual:content.style.transform||content.style.opacity||content.style.pointerEvents,computedTransform:getComputedStyle(content).transform,computedOpacity:getComputedStyle(content).opacity}
  })
  maxOverlap=Math.max(maxOverlap,m.overlap);assert.equal(m.position,'static');assert.equal(m.overlap,0);assert.ok(m.height>=52);assert.equal(m.radius,'15px');assert.equal(m.overflow,false);assert.equal(m.residual,'');if(settled){assert.equal(m.computedTransform,'none');assert.equal(m.computedOpacity,'1')}return m
 }
 const screenshot=async state=>{if(!reduced&&((width===390&&scale===100)||(width===320&&scale===140)))await page.screenshot({path:`/tmp/habit-editor-${prod?'prod':'local'}-${width}-${scale}-${state}.png`})}
 const scrollCheck=async(prefix,capture=false,usable=true)=>{
  await settle();assert.equal(await body.evaluate(e=>e.scrollTop),0);const initial=await measure();if(usable)assert.ok(initial.bodyHeight>height*.65,'usable shared large viewport')
  if(capture)await screenshot(prefix+'-top');const samples=[]
  for(const ratio of [0,.25,.5,.75,1]){
   await body.evaluate((e,ratio)=>{e.scrollTop=(e.scrollHeight-e.clientHeight)*ratio},ratio);await page.evaluate(()=>new Promise(requestAnimationFrame));const m=await measure();samples.push(m);assert.ok(Math.abs(m.flowY-initial.flowY)<1,'Save retains document flow position');assert.ok(Math.abs((m.screenY-initial.screenY)+m.scroll)<1,'Save moves with the scroll owner')
   if(capture&&ratio===.5)await screenshot(prefix+'-middle')
  }
  if(capture)await screenshot(prefix+'-bottom')
  await save.evaluate(e=>{const s=e.closest('.modal-body');s.scrollTop+=e.getBoundingClientRect().bottom-s.getBoundingClientRect().bottom+12})
  const m=await measure();assert.ok(m.screenY>=m.bodyTop&&m.saveBottom<=m.bodyBottom,'Save fully reachable above bottom inset');await save.isVisible().then(v=>assert.ok(v))
  await body.evaluate(e=>e.scrollTop=0)
  return samples
 }
 const close=async()=>{await page.locator('.habit-sheet [data-close]').click();assert.equal(await page.locator('dialog').count(),0);assert.equal(await page.evaluate(()=>document.body.classList.contains('sheet-open')),false);assert.notEqual(await page.evaluate(()=>document.body.style.position),'fixed')}
 // B: Today empty-state invokes showHabitManager(true).
 await page.locator('#today-habit-create').click();await form.waitFor();await scrollCheck('direct');const directDom=await form.innerHTML();const directFrame=await frame();assert.equal(await form.locator('.habit-status-section').count(),0);await close()
 // A: the actual topbar Management -> Habit Manager -> New entry.
 await page.locator('#open-management').click();await page.locator('#more-habits').click();await page.locator('#habit-new').waitFor();await settle();const managerFrame=await frame()
 await page.locator('#habit-new').click();await form.waitFor();await settle();stable(managerFrame,await frame());stable(directFrame,await frame());assert.equal(await form.innerHTML(),directDom)
 const samples=await scrollCheck('new',true)
 // Name focus and software keyboard open/close, using the shared viewport contract only.
 const beforeKeyboard=await frame();await form.locator('[name=name]').focus()
 await page.evaluate(()=>{qaViewport.height=innerHeight-300;qaViewport.offsetTop=20;qaViewport.dispatchEvent(new Event('resize'))})
 await page.waitForFunction(()=>document.body.classList.contains('keyboard-open'));await form.locator('[name=name]').fill('布局回归习惯');await measure();await body.evaluate(e=>e.scrollTop=0);const keyboardSamples=await scrollCheck('keyboard',false,false);assert.ok(keyboardSamples.at(-1).scroll>0,'keyboard scroll measurement is nontrivial')
 await page.locator('.habit-sheet h2').focus();await page.evaluate(()=>{qaViewport.height=innerHeight;qaViewport.offsetTop=0;qaViewport.dispatchEvent(new Event('resize'))})
 await page.waitForFunction(()=>!document.body.classList.contains('keyboard-open'));stable(beforeKeyboard,await frame());await measure()
 // Create through Save, then open the same persisted Habit for C (no service shortcuts).
 await save.click();await page.locator('[data-habit-edit]').waitFor();await settle();assert.equal(await body.evaluate(e=>e.scrollTop),0)
 const id=await page.locator('[data-habit-edit]').first().getAttribute('data-habit-edit')
 await page.locator(`[data-habit-edit="${id}"]`).click();await form.waitFor();await scrollCheck('edit',true)
 assert.equal(await form.locator('.habit-status-section').count(),1);assert.equal(await form.locator('#habit-active-toggle').innerText(),'停用习惯');assert.equal(await form.locator('#habit-delete').innerText(),'删除习惯')
 assert.ok(await form.evaluate(f=>f.querySelector('.habit-editor-actions').compareDocumentPosition(f.querySelector('.habit-status-section'))&Node.DOCUMENT_POSITION_FOLLOWING))
 await page.locator('#habit-delete').evaluate(e=>{const s=e.closest('.modal-body');s.scrollTop=s.scrollHeight});await measure();await body.evaluate(e=>e.scrollTop=0);await measure();await page.locator('#habit-form-back').click();await page.locator('#habit-new').waitFor();await settle()
 // Real populated manager to exercise a nonzero saved parent scroll.
 await page.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});await new Promise((r,j)=>{const t=d.transaction('habits','readwrite');for(let i=0;i<20;i++)t.objectStore('habits').put({id:'layout-extra-'+i,name:'管理列表滚动验证 '+i,active:true,sortOrder:100+i,createdAt:'2026-10-07T00:00:00Z',updatedAt:'2026-10-07T00:00:00Z'});t.oncomplete=r;t.onerror=()=>j(t.error)});d.close()})
 await close();await page.locator('#open-management').click();await page.locator('#more-habits').click();await page.locator('[data-habit-edit=layout-extra-19]').waitFor();await settle()
 const parentFrame=await frame();const parentScroll=await body.evaluate(e=>{e.scrollTop=180;return e.scrollTop});assert.ok(parentScroll>0)
 for(let i=0;i<20;i++){
  // Dispatch the real toolbar action without Playwright auto-scrolling it to the top first.
  await page.locator('#habit-new').evaluate(e=>e.click());await form.waitFor();stable(parentFrame,await frame());assert.equal(await body.evaluate(e=>e.scrollTop),0);await measure(false);assert.equal(await page.locator('#habit-form').count(),1)
  await body.evaluate(e=>e.scrollTop=e.scrollHeight);await measure(false);await page.locator('#habit-form-back').evaluate(e=>e.click());await page.locator('#habit-new').waitFor();stable(parentFrame,await frame());assert.ok(Math.abs(await body.evaluate(e=>e.scrollTop)-parentScroll)<1,'parent scroll restored')
 }
 await page.locator('#habit-new').evaluate(e=>e.click());await form.waitFor();await settle();await measure();await form.locator('[name=name]').fill('保存后恢复管理滚动');await save.click();await page.locator('#habit-new').waitFor();await settle();assert.ok(Math.abs(await body.evaluate(e=>e.scrollTop)-parentScroll)<1);await close()
 assert.deepEqual(errors,[]);const receipt={width,height,scale,reduced,managerNew:true,directCreate:true,editExisting:true,keyboardMock:true,safeAreaMock:34,managerScrollRestored:parentScroll,rapidCycles:20,maxOverlapPx:maxOverlap,flowScrollSamples:samples.map(({scroll,screenY,flowY})=>({scroll,screenY,flowY})),keyboardFlowSamples:keyboardSamples.map(({scroll,screenY,flowY})=>({scroll,screenY,flowY})),noMotionOrLockLeak:true,physicalIPhone:'Pending'};receipts.push(receipt);console.log(JSON.stringify(receipt))
 }finally{await context.close()}
}await fs.writeFile(`/tmp/habit-editor-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))}finally{await browser.close()}
