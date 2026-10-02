// Synthetic profiles, speech events, provider responses and records only. No microphone or real provider calls.
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5174/',prod=base.includes('github.io')
const sizes=prod?[[390,844],[430,932]]:[[320,812],[375,812],[390,844],[430,932]]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try{
for(const [width,height] of sizes){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai'})
 await context.addInitScript(({prefix})=>{
  Object.defineProperty(navigator,'userActivation',{value:{isActive:false},configurable:true})
  if(!localStorage.getItem('voice-fixture-ready')){
   const p={id:'voice-test',name:'合成语音测试',protocol:'openai-chat-completions',baseUrl:'https://mock-voice.invalid/v1',model:'chat-model',visionModel:'image-model',toolCapability:'supported',visionCapability:'unsupported',createdAt:'',updatedAt:''}
   localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([p]));localStorage.setItem('fitlog-ai-active-profile-v1',p.id);localStorage.setItem('fitlog-ai-key-v1:'+p.id,'synthetic-voice-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1');localStorage.setItem('fitlog-ai-voice-privacy-ack-v1','1');localStorage.setItem('voice-fixture-ready','1')
  }
  window.__speech={instances:[],denied:false}
  class MockSpeechRecognition{
   constructor(){window.__speech.instances.push(this);this.aborts=0;this.stops=0}
   start(){if(window.__speech.denied){const e=new Error('private');e.name='NotAllowedError';throw e}this.onstart?.()}
   stop(){this.stops++}abort(){this.aborts++}
   result(rows){this.onresult?.({resultIndex:0,results:rows.map(([transcript,isFinal])=>({isFinal,length:1,0:{transcript}}))})}
   end(){this.onend?.()}error(error){this.onerror?.({error})}
  }
  window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;window[prefix?'webkitSpeechRecognition':'SpeechRecognition']=MockSpeechRecognition
 },{prefix:width===375||prod})
 const page=await context.newPage(),requests=[],errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 let hold=false,release
 await page.route('https://mock-voice.invalid/**',async route=>{
  const body=route.request().postDataJSON();requests.push(body);assert.equal(body.model,'chat-model');assert.ok(!JSON.stringify(body).includes('synthetic-voice-key'))
  if(hold){hold=false;await new Promise(resolve=>{release=resolve})}
  const last=body.messages.at(-1)
  const message=last.role==='user'&&last.content.includes('记录今天72kg')?{content:null,tool_calls:[{id:'voice-weight',type:'function',function:{name:'propose_weight',arguments:JSON.stringify({date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),weightKg:72})}}]}:{content:'合成回答'}
  await route.fulfill({json:{choices:[{message}]}}).catch(()=>{})
 })
 const idle=()=>page.waitForFunction(()=>document.querySelector('#ai-send')&&!document.querySelector('#ai-send').hidden)
 const emit=async(method,arg)=>page.evaluate(({method,arg})=>{const r=window.__speech.instances.at(-1);r[method](arg)},{method,arg})
 const clear=async()=>{await idle();await page.locator('#ai-clear-chat').click()}
 const sendVoice=async text=>{await page.locator('#ai-mic').click();await emit('result',[[text,true]]);await emit('end');await idle()}
 const weights=()=>page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});const rows=await new Promise(r=>{const q=db.transaction('weights','readonly').objectStore('weights').getAll();q.onsuccess=()=>r(q.result)});db.close();return rows})
 await page.goto(base+'?ordinary=1#quick=ai',{waitUntil:'networkidle'});await page.waitForSelector('#ai-mic');assert.equal(new URL(page.url()).hash,'');assert.equal(new URL(page.url()).search,'?ordinary=1');assert.equal(await page.locator('dialog').count(),1)
 await page.evaluate(()=>location.hash='quick=ai&prompt=synthetic-voice-key&send=1');await page.waitForFunction(()=>document.querySelector('.ai-error')?.textContent.includes('凭据'));assert.equal(requests.length,0);await page.locator('dialog [data-close]').click();await page.locator('#open-ai-assistant').click();await page.waitForFunction(()=>document.querySelector('.ai-error')?.textContent.includes('凭据'));assert.equal(requests.length,0);await clear()
 await page.goto(base+'?cold=voice#quick=ai&voice=1',{waitUntil:'networkidle'});await page.getByText('准备好后开始说话',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__speech.instances.length),0)
 await page.locator('#ai-voice-start').click();assert.equal(await page.locator('#ai-mic').getAttribute('aria-pressed'),'true');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'ai-message-input')
 assert.deepEqual(await page.evaluate(()=>{const r=window.__speech.instances.at(-1);return[r.lang,r.continuous,r.interimResults,r.maxAlternatives]}),['zh-CN',false,true,1])
 await emit('result',[['今天',false]]);assert.equal(requests.length,0);await emit('result',[['今天',true],['蛋白质还差多少',true]]);assert.equal(requests.length,0)
 await page.evaluate(()=>{const r=window.__speech.instances.at(-1),end=r.onend;end();end()});await idle();assert.equal(requests.length,1);assert.equal(requests.at(-1).messages.at(-1).content,'今天蛋白质还差多少')
 await clear();await page.locator('#ai-message-input').fill('今天');await page.locator('#ai-message-input').focus();let n=requests.length;await page.locator('#ai-mic').click();assert.notEqual(await page.evaluate(()=>document.activeElement.id),'ai-message-input');await emit('result',[['蛋白质还差多少',true]]);await page.locator('#ai-mic').click();assert.equal(await page.evaluate(()=>window.__speech.instances.at(-1).stops),1);assert.equal(requests.length,n);await emit('end');await idle();assert.equal(requests.length,n+1);assert.equal(requests.at(-1).messages.at(-1).content,'今天\n蛋白质还差多少')
 // Safe fixed error copy, no retry/no send.
 for(const [code,copy] of [['no-speech','没有听清，可以再说一次。'],['not-allowed','没有麦克风权限，请在系统设置中允许后重试。'],['network','语音识别暂时不可用，请稍后重试或使用键盘输入。']]){
  n=requests.length;await page.locator('#ai-mic').click();await emit('error',code);await page.getByText(copy,{exact:true}).waitFor();assert.equal(requests.length,n)
 }
 // Manual Send aborts speech and submits only the current typed composer.
 await page.locator('#ai-message-input').fill('手动文本');await page.locator('#ai-mic').click();await emit('result',[['不会发送的语音',true]]);n=requests.length;await page.locator('#ai-send').click();await idle();assert.equal(requests.length,n+1);assert.equal(requests.at(-1).messages.at(-1).content,'手动文本');assert.equal(await page.evaluate(()=>window.__speech.instances.at(-1).aborts),1)
 // Background/pagehide invalidate even already-final callbacks.
 for(const event of ['visibilitychange','pagehide']){
  n=requests.length;await page.locator('#ai-mic').click();await emit('result',[['后台不得发送',true]])
  await page.evaluate(event=>{window.__stale=window.__speech.instances.at(-1).onend;if(event==='visibilitychange'){Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event(event));Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true})}else window.dispatchEvent(new Event(event));window.__stale()},event)
  assert.equal(requests.length,n);assert.equal(await page.evaluate(()=>window.__speech.instances.at(-1).aborts),1)
 }
 // Busy quick intent preserves text; it never silently sends after the previous turn.
 await clear();hold=true;release=undefined;await page.locator('#ai-message-input').fill('等待请求');await page.locator('#ai-send').click();await page.waitForFunction(()=>!document.querySelector('#ai-stop').hidden);assert.equal(await page.locator('#ai-mic').isDisabled(),true)
 await page.evaluate(()=>location.hash='quick=ai&prompt=稍后处理&send=1');await page.getByText('上一条请求还在处理中。',{exact:true}).waitFor();assert.equal(await page.locator('#ai-message-input').inputValue(),'稍后处理');assert.equal(await page.locator('dialog').count(),1)
 for(let i=0;i<100&&!release;i++)await page.waitForTimeout(10);assert.ok(release);n=requests.length;release();await idle();assert.equal(requests.length,n);assert.equal(await page.locator('#ai-message-input').inputValue(),'稍后处理');await clear()
 // Prompt path uses the engine, cleans the hash immediately, blocks credentials.
 await page.evaluate(()=>location.hash='quick=ai&prompt='+encodeURIComponent('你好')+'&send=1');await page.waitForFunction(()=>document.querySelector('.ai-user')?.textContent==='你好');await idle();assert.equal(new URL(page.url()).hash,'');n=requests.length
 await page.evaluate(()=>location.hash='quick=ai&prompt=synthetic-voice-key&send=1');await page.waitForFunction(()=>document.querySelector('.ai-error')?.textContent.includes('凭据'));assert.equal(requests.length,n);assert.ok(!(await page.locator('.ai-conversation').innerText()).includes('synthetic-voice-key'))
 await clear();await page.evaluate(()=>{location.hash='quick=ai&prompt=第一条';location.hash='quick=ai&prompt=第二条'});await page.waitForFunction(()=>document.querySelector('#ai-message-input').value==='第一条\n第二条');assert.equal(await page.locator('dialog').count(),1);assert.equal(new URL(page.url()).hash,'');await clear();const before=await weights();await sendVoice('记录今天72kg');await page.waitForSelector('.ai-proposal[data-status=pending]');assert.deepEqual(await weights(),before);assert.equal(await page.getByText('确认写入',{exact:true}).count(),1);await clear()
 // First voice acknowledgement is separate, compact, device-local.
 await page.evaluate(()=>localStorage.removeItem('fitlog-ai-voice-privacy-ack-v1'));n=await page.evaluate(()=>window.__speech.instances.length);await page.locator('#ai-mic').click();await page.getByText('我知道了',{exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('fitlog-ai-voice-privacy-ack-v1')),'1');assert.equal(await page.evaluate(()=>window.__speech.instances.length),n+1);await emit('error','no-speech')
 // Quiet policy fallback for a quick start with purported activation.
 await page.evaluate(()=>{Object.defineProperty(navigator,'userActivation',{value:{isActive:true},configurable:true});window.__speech.denied=true;location.hash='quick=ai&voice=1'});await page.getByText('准备好后开始说话',{exact:true}).waitFor();await page.evaluate(()=>{window.__speech.denied=false;Object.defineProperty(navigator,'userActivation',{value:{isActive:false},configurable:true})})
 // 44px targets, IME guard, pointer focus, viewport and preserved camera.
 await page.locator('#ai-message-input').dispatchEvent('compositionstart');assert.equal(await page.locator('#ai-mic').isDisabled(),true);await page.locator('#ai-message-input').dispatchEvent('compositionend');assert.equal(await page.locator('#ai-mic').isDisabled(),false)
 await page.locator('#ai-mic').click();await page.waitForTimeout(220)
 assert.equal(await page.locator('#ai-mic').evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&getComputedStyle(e).outlineStyle==='none'}),true)
 assert.equal(await page.locator('.ai-composer').evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#ai-message-input').evaluate(e=>getComputedStyle(e).fontSize),'16px');assert.ok(await page.locator('#ai-message-input').evaluate(e=>e.getBoundingClientRect().width)>=90)
 await page.screenshot({path:`/tmp/voice-${prod?'prod':'local'}-${width}.png`})
 n=requests.length;await emit('result',[['关闭不能发送',true]]);await page.evaluate(()=>window.__stale=window.__speech.instances.at(-1).onend);await page.locator('dialog [data-close]').click();await page.evaluate(()=>window.__stale());assert.equal(requests.length,n);assert.equal(await page.evaluate(()=>window.__speech.instances.at(-1).aborts),1)
 await page.locator('#open-ai-assistant').click();await page.locator('#ai-food-camera').click();await page.waitForSelector('#vision-camera-file',{state:'attached'});await page.locator('dialog [data-close]').click()
 // Warm quick launch flushes pending strength edits while retaining the editor.
 await page.locator('[data-tab=workout]').click();await page.locator('#start-workout').click();await page.locator('#blank-workout').click();await page.locator('#add-exercise').click();await page.locator('[data-exercise]').first().click();await page.locator('[data-add-set]').click()
 await page.evaluate(()=>{const weight=document.querySelector('[data-field=weightKg]'),reps=document.querySelector('[data-field=reps]');weight.value='45';weight.dispatchEvent(new Event('input',{bubbles:true}));reps.value='8';reps.dispatchEvent(new Event('input',{bubbles:true}));location.hash='quick=ai'})
 await page.waitForSelector('#ai-mic');assert.equal(await page.locator('#workout-note').count(),1)
 assert.equal(await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});const rows=await new Promise(r=>{const q=db.transaction('workouts','readonly').objectStore('workouts').getAll();q.onsuccess=()=>r(q.result)});db.close();const set=rows[0].exercises[0].sets[0];return set.weightKg===45&&set.reps===8}),true)
 await page.locator('dialog [data-close]').click();await page.locator('#exit-workout').click()
 // Missing profile and AI privacy gates keep drafts; acknowledgement sends only once.
 await page.evaluate(()=>localStorage.removeItem('fitlog-ai-privacy-ack-v1'));n=requests.length;await page.evaluate(()=>location.hash='quick=ai&prompt=等待隐私确认&send=1');await page.waitForSelector('#ai-message-input');assert.equal(await page.locator('#ai-message-input').inputValue(),'等待隐私确认');assert.equal(requests.length,n);await page.getByText('我知道了',{exact:true}).click();await idle();assert.equal(requests.length,n+1)
 await page.locator('dialog [data-close]').click();await page.evaluate(()=>localStorage.removeItem('fitlog-ai-active-profile-v1'));await page.goto(base+'?cold=no-profile#quick=ai&prompt=没有配置也保留&send=1',{waitUntil:'networkidle'});await page.getByText('配置 AI',{exact:true}).waitFor();assert.equal(await page.locator('#ai-message-input').inputValue(),'没有配置也保留');n=requests.length;await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('dialog').count(),0);assert.equal(requests.length,n)
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mode:prod?'production':'local',width,height,cold:true,warm:true,cleanup:true,finalEndOnce:true,manualStop:true,abort:true,background:true,busy:true,privacy:true,proposalSafety:true,secretGuard:true,layout:true,prefixed:width===375||prod,errors}))
 await context.close()
}
// Unsupported browser: explicit voice request keeps ordinary text usable.
const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await c.newPage()
await c.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;const profile={id:'unsupported',name:'合成',protocol:'openai-chat-completions',baseUrl:'https://mock-unsupported.invalid/v1',model:'chat',toolCapability:'unsupported',visionCapability:'unsupported',createdAt:'',updatedAt:''};localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([profile]));localStorage.setItem('fitlog-ai-active-profile-v1',profile.id);localStorage.setItem('fitlog-ai-key-v1:'+profile.id,'synthetic-unsupported-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1')})
await p.route('https://mock-unsupported.invalid/**',route=>route.fulfill({json:{choices:[{message:{content:'文本可用'}}]}}))
await p.goto(base+'#quick=ai&voice=1',{waitUntil:'networkidle'});await p.getByText('当前浏览器不支持网页语音识别，可以使用系统键盘听写。',{exact:true}).waitFor();await p.locator('#ai-message-input').fill('普通文字');await p.locator('#ai-send').click();await p.getByText('文本可用',{exact:true}).waitFor();await c.close();console.log(JSON.stringify({unsupportedTextFallback:true,realSpeech:'Pending',physicalIPhone:'Pending',externalLauncher:'Pending; no verified same-storage path'}))
}finally{await browser.close()}
