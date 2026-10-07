// Fresh synthetic profiles only; actual native Web Animations and persisted state.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5183/fitlog-lite/',prod=base.includes('github.io'),receipts=[]
const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/legacyV10Data.json',import.meta.url)))
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try{for(const width of [320,375,390,430])for(const scale of [100,120,140])for(const reduced of [false,true]){
 const context=await browser.newContext({viewport:{width,height:width===430?932:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'})
 try{
 await context.addInitScript(()=>{
  const p={id:'motion',name:'Synthetic',preset:'zhipu',protocol:'openai-chat-completions',baseUrl:'https://open.bigmodel.cn/api/paas/v4',model:'synthetic-chat',toolCapability:'supported',visionCapability:'supported',createdAt:'',updatedAt:''}
  localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([p]));localStorage.setItem('fitlog-ai-active-profile-v1',p.id);localStorage.setItem('fitlog-ai-key-v1:'+p.id,'synthetic-motion-ai');localStorage.setItem('fitlog-ai-privacy-ack-v1','1');localStorage.setItem('fitlog-voice-config-v1',JSON.stringify({version:1,mode:'zhipu-key'}));localStorage.setItem('fitlog-voice-key-v1','synthetic-motion-voice')
  for(const k of ['config-v1','config-v2','key-v1','bilibili-key-v2','privacy-ack-v1','privacy-ack-v2'])localStorage.setItem('fitlog-video-search-'+k,'synthetic-legacy')
  window.__transitions=[];document.addEventListener('transitionrun',e=>__transitions.push({property:e.propertyName,pseudo:e.pseudoElement,nav:!!e.target.closest('.bottom-nav'),plan:e.target.dataset.planView,progress:e.target.dataset.progressView}));
  window.__motions=[];const native=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.__motions.push({id:this.id,classes:this.className,frames});return native.call(this,frames,options)}
  window.__tracks=[];Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{const track={readyState:'live',stop(){this.readyState='ended'}};__tracks.push(track);return{getTracks:()=>[track]}}},configurable:true})
  class Recorder{static isTypeSupported(){return true}constructor(){this.mimeType='audio/mp4';this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['synthetic'],{type:'audio/mp4'})});this.onstop?.()})}}
  window.MediaRecorder=Recorder;window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined
  const fetchNative=fetch.bind(window),enc=new TextEncoder();window.__chunks=[];window.__requests=[]
  window.fetch=async(url,options)=>{
   if(!String(url).startsWith('https://open.bigmodel.cn/'))return fetchNative(url,options)
   const body=JSON.parse(options.body);__requests.push(body)
   const stream=new ReadableStream({start(c){window.__push=text=>c.enqueue(enc.encode('data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\n\n'));window.__finish=()=>{c.enqueue(enc.encode('data: [DONE]\n\n'));c.close()}},cancel(){}})
   return new Response(stream,{headers:{'Content-Type':'text/event-stream'}})
  }
 })
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');await page.addStyleTag({content:`html {font-size:${scale}%}`})
 assert.equal(await page.evaluate(()=>__motions.length),0,'initial render stays static')
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('fitlog-video-search-')).length),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('fitlog-ai-key-v1:motion')),'synthetic-motion-ai');assert.equal(await page.evaluate(()=>localStorage.getItem('fitlog-voice-key-v1')),'synthetic-motion-voice')
 const date=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
 const data=structuredClone(fixture);for(const rows of Object.values(data))for(const row of rows){if(row.date)row.date=date}
 data.nutritionTargets=data.nutritionTargets.slice(0,1)
 data.tasks=[{...data.tasks[0],id:'motion-task',title:'微交互验证任务',date,completedAt:undefined}];data.habits=[{...data.habits[0],id:'motion-habit',name:'验证习惯',active:true}];data.habitCheckIns=[]
 await page.evaluate(async data=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});await new Promise((r,j)=>{const t=d.transaction(Object.keys(data),'readwrite');for(const [s,rows]of Object.entries(data)){const st=t.objectStore(s);st.clear();rows.forEach(row=>st.put(row))}t.oncomplete=r;t.onerror=()=>j(t.error)});d.close()},data)
 const nav=async tab=>{await page.locator(`[data-tab=${tab}]`).click();await page.waitForTimeout(200);assert.ok(!/训练视频搜索|B站|YouTube/.test(await page.locator('body').innerText()),'retired names absent from production DOM')}
 const close=async()=>{await page.locator('dialog[open] [data-close]').last().click();await page.waitForTimeout(40);assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>document.body.classList.contains('sheet-open')),false)}
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width}/${scale}/reduce=${reduced}`)
 const capture=async name=>{await overflow();if(!reduced&&((width===390&&scale===100)||(width===320&&scale===140)||(width===430&&scale===100)))await page.screenshot({path:`/tmp/motion-${prod?'prod':'local'}-${width}-${scale}-${name}.png`})}
 const read=async store=>page.evaluate(async store=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});const rows=await new Promise(r=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>r(q.result)});d.close();return rows},store)
 await nav('today');await capture('today-before');
 await page.locator('[data-tab=food]').click();await page.waitForTimeout(35);await capture('nav-mid');await page.waitForTimeout(220);await nav('today');
const navNode=await page.locator('.bottom-nav').elementHandle()
 await page.evaluate(async()=>{for(let i=0;i<20;i++){document.querySelector(`[data-tab=${['food','plan','workout','progress','today'][i%5]}]`).click();await new Promise(r=>setTimeout(r,18))}});await page.waitForTimeout(300)
 assert.equal(await navNode.evaluate(e=>e===document.querySelector('.bottom-nav')),true)
 assert.equal(await page.locator('.bottom-nav .active').getAttribute('data-tab'),'today');assert.equal(await page.locator('.today-dashboard #today-habits').count(),1)
 assert.equal(await page.locator('#view').evaluate(e=>getComputedStyle(e).transform),'none');assert.equal(await page.locator('#view').evaluate(e=>getComputedStyle(e).opacity),'1');await overflow()
 const count=await page.evaluate(()=>__motions.filter(m=>m.id==='view').length);await nav('today');assert.equal(await page.evaluate(()=>__motions.filter(m=>m.id==='view').length),count,'domain refresh never enters')
 const habit=page.locator('[data-habit-toggle=motion-habit]');await habit.click();await page.waitForFunction(()=>document.querySelector('[data-habit-toggle=motion-habit]').getAttribute('aria-pressed')==='true');await capture('habit-selected');assert.equal((await read('habitCheckIns')).length,1);await habit.click();await page.waitForFunction(()=>document.querySelector('[data-habit-toggle=motion-habit]').getAttribute('aria-pressed')==='false');assert.equal((await read('habitCheckIns')).length,0)
 await nav('plan');await capture('plan');const tabs=await page.locator('.plan-tabs').elementHandle()
 await page.evaluate(async()=>{for(let i=0;i<20;i++){document.querySelector(`[data-plan-view=${['upcoming','inbox','today'][i%3]}]`).click();await new Promise(r=>setTimeout(r,10))}document.querySelector('[data-plan-view=today]').click()});await page.waitForTimeout(220)
 if(!reduced)assert.ok(await page.evaluate(()=>__transitions.some(t=>t.plan&&t.pseudo==='::after'&&t.property==='opacity')),'actual reversible underline transition');
 assert.equal(await tabs.evaluate(e=>e===document.querySelector('.plan-tabs')),true);assert.equal(await page.locator('.plan-tabs [aria-selected=true]').getAttribute('data-plan-view'),'today');assert.equal(await page.locator('.plan-tabs .active').evaluate(e=>getComputedStyle(e,'::after').opacity),'1');assert.equal(await page.locator('.plan-tabs [aria-selected=false]').first().evaluate(e=>getComputedStyle(e,'::after').opacity),'0')
 await page.locator('[data-task-complete=motion-task]').click();await page.waitForSelector('#plan-completed');if(!await page.locator('#plan-completed').evaluate(e=>e.open))await page.locator('#plan-completed summary').click();await page.waitForSelector('[data-task-complete=motion-task][aria-pressed=true]');assert.ok((await read('tasks'))[0].completedAt);await capture('task-completed');await page.locator('[data-task-complete=motion-task]').click();await page.waitForSelector('[data-task-complete=motion-task][aria-pressed=false]');assert.equal((await read('tasks'))[0].completedAt,undefined)
 await page.locator('[data-task-edit=motion-task]').click();await page.waitForTimeout(230);await page.locator('#task-form [name=title]').fill('保留草稿');await page.locator('#task-form [name=title]').blur();const frame=await page.locator('dialog').boundingBox();const taskScroll=await page.locator('.modal-body').evaluate(e=>{e.scrollTop=50;return e.scrollTop})
 await page.locator('#task-date-picker-open').click();await page.waitForTimeout(180);const sub=await page.locator('dialog').boundingBox();assert.ok(Math.abs(sub.y-frame.y)<1&&Math.abs(sub.height-frame.height)<1);await capture('task-date-subview');await page.keyboard.press('Escape');await page.waitForTimeout(180);assert.equal(await page.locator('#task-form [name=title]').inputValue(),'保留草稿');assert.equal(await page.locator('.modal-body').evaluate(e=>e.scrollTop),taskScroll);await close()
 for(let i=0;i<20;i++){await page.locator('#open-management').click();await page.waitForSelector('dialog[open]');await close()}
 await page.locator('#open-management').click();await page.locator('#more-ai-settings').click();await page.waitForSelector('#ai-voice-settings');await page.waitForTimeout(220)
 assert.ok(!/训练视频搜索|B站|YouTube|视频 Key/.test(await page.locator('body').innerText()));const aiFrame=await page.locator('dialog').boundingBox();const parentScroll=await page.locator('.modal-body').evaluate(e=>{e.scrollTop=100;return e.scrollTop});await capture('ai-settings')
 await page.locator('#ai-voice-settings').click();await page.waitForTimeout(180);const voiceFrame=await page.locator('dialog').boundingBox();assert.ok(Math.abs(aiFrame.y-voiceFrame.y)<1&&Math.abs(aiFrame.height-voiceFrame.height)<1);await capture('voice-settings');if(reduced)assert.equal(await page.locator('dialog').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#voice-settings-back:visible,[data-workspace-back]:visible').click();await page.waitForTimeout(180);assert.equal(await page.locator('.modal-body').evaluate(e=>e.scrollTop),parentScroll);await close()
 await page.locator('#open-ai-assistant').click();await page.waitForSelector('#ai-mic');await capture('ai-before');await page.locator('#ai-message-input').fill('帮我找深蹲视频');await page.locator('#ai-send').click();await page.waitForFunction(()=>!!window.__push);await page.evaluate(()=>__push('当前没有实时视频搜索。'));await page.waitForSelector('.ai-conversation .ai-assistant');await page.waitForTimeout(30);await capture('ai-mid')
 const entrances=await page.evaluate(()=>__motions.filter(m=>m.classes==='ai-message ai-assistant').length);assert.equal(entrances,reduced?0:1)
 for(let i=0;i<6;i++)await page.evaluate(()=>__push('可说明动作要点。'));await page.evaluate(()=>__finish());await page.waitForFunction(()=>!document.querySelector('#ai-send').hidden);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>__motions.filter(m=>m.classes==='ai-message ai-assistant').length),entrances);assert.ok(!JSON.stringify(await page.evaluate(()=>__requests)).includes('search_training_videos'));await capture('ai-final');await close()
 await page.locator('#open-ai-assistant').click();await page.waitForSelector('#ai-mic');assert.equal(await page.evaluate(()=>__motions.filter(m=>m.classes==='ai-message ai-assistant').length),entrances,'history does not replay')
 await page.locator('#ai-mic').click();await page.waitForFunction(()=>document.querySelector('#ai-mic').getAttribute('aria-pressed')==='true');assert.equal(await page.locator('.ai-voice-status').evaluate(e=>getComputedStyle(e,'::before').animationName),reduced?'none':'recording-dot');await capture('voice-recording');await close();assert.equal(await page.evaluate(()=>__tracks.filter(t=>t.readyState==='live').length),0)
 if(!reduced)assert.ok(await page.evaluate(()=>__transitions.some(t=>t.nav&&t.property==='background-color')),'actual navigation surface transition');
 await nav('progress');await page.locator('[data-progress-view=calendar]').click();await page.waitForSelector('.calendar-day.today');await page.locator('.calendar-day.today').click();await page.waitForSelector('dialog');assert.equal(await page.locator('.calendar-day.today.selected').count(),1);await capture('calendar-day');await close();await capture('calendar')
 const progressTabs=await page.locator('.page-tabs').elementHandle();await page.locator('[data-progress-view=reports]').click();await page.waitForSelector('.report-page');await page.waitForTimeout(180);assert.equal(await progressTabs.evaluate(e=>e===document.querySelector('.page-tabs')),true);await page.locator('[data-progress-view=calendar]').click();await page.waitForSelector('.calendar-day.today');
 await nav('food');await capture('food');await nav('workout');await capture('workout')
 if(reduced){assert.equal(await page.evaluate(()=>__motions.length),0);assert.equal(await page.locator('[data-tab=workout]').evaluate(e=>getComputedStyle(e).transitionDuration),'0s')}
 assert.deepEqual(errors,[]);await overflow();receipts.push({width,scale,reduced,videoRemoved:true,aiVoicePreserved:true,rapidNav:20,rapidPlan:20,sheetCycles:20,taskHabit:true,subviewStable:true,streamEntrance:entrances,recordingOnly:true});console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}await fs.writeFile(`/tmp/motion-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))}finally{await browser.close()}
