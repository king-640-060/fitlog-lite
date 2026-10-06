// Synthetic stream/recorder/codec, STT/chat/TTS only. Does not prove physical iOS or real providers.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5183/fitlog-lite/',prod=base.includes('github.io'),receipts=[]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try{for(const width of [320,375,390,430])for(const scale of [100,120,140]){
 const context=await browser.newContext({viewport:{width,height:width===430?932:844},isMobile:true,hasTouch:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai'})
 try{
 await context.addInitScript(()=>{
  const p={id:'voice-primary-test',name:'合成',preset:'zhipu',protocol:'openai-chat-completions',baseUrl:'https://open.bigmodel.cn/api/paas/v4',model:'glm-5.3-flash',toolCapability:'supported',visionCapability:'supported',createdAt:'',updatedAt:''}
  localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([p]));localStorage.setItem('fitlog-ai-active-profile-v1',p.id);localStorage.setItem('fitlog-ai-key-v1:'+p.id,'synthetic-primary-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1')
  window.__voice={tracks:[],recorders:[],permissions:0,contexts:[],spoken:[],cancels:0,denied:false}
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.__voice.permissions++;if(window.__voice.denied)throw new DOMException('private','NotAllowedError');const track={readyState:'live',stop(){this.readyState='ended'}};window.__voice.tracks.push(track);return{getTracks:()=>[track]}}},configurable:true})
  class Recorder{static isTypeSupported(t){return t==='audio/mp4'}constructor(_stream,options){this.mimeType=options?.mimeType||'audio/mp4';this.state='inactive';window.__voice.recorders.push(this)}start(){this.state='recording'}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['synthetic-memory-audio'],{type:this.mimeType})});this.onstop?.()})}}
  window.MediaRecorder=Recorder
  window.AudioContext=class{constructor(){this.state='running';window.__voice.contexts.push(this)}async decodeAudioData(){return{numberOfChannels:1,sampleRate:16000,getChannelData:()=>new Float32Array(1600)}}async close(){this.state='closed'}}
  Object.defineProperty(window,'speechSynthesis',{value:{speak(u){window.__voice.spoken.push(u)},cancel(){window.__voice.cancels++}},configurable:true})
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}}
  window.SpeechRecognition=class{constructor(){throw new Error('Primary Voice must not construct SpeechRecognition')}}
 })
 const page=await context.newPage(),errors=[],calls={stt:0,chat:0};let transcript='今天蛋白质还差多少',sttFail=false,hold=false,release
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message))
 await page.route('https://open.bigmodel.cn/**',async route=>{
  const request=route.request();if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}})
  assert.equal(request.headers().authorization,'Bearer synthetic-primary-key')
  if(request.url().endsWith('/audio/transcriptions')){
   calls.stt++;assert.equal(await page.evaluate(()=>window.__voice.tracks.filter(t=>t.readyState!=='ended').length),0,'tracks ended before STT');assert.match(request.headers()['content-type'],/multipart\/form-data/);assert.ok(request.postDataBuffer().includes(Buffer.from('glm-asr-2512')));assert.ok(!request.postDataBuffer().includes(Buffer.from('synthetic-primary-key')))
   if(hold)await new Promise(r=>release=r)
   await route.fulfill(sttFail?{status:500,body:'private raw error'}:{json:{text:transcript}}).catch(()=>{});return
  }
  const body=request.postDataJSON();assert.ok(!JSON.stringify(body).includes('synthetic-primary-key'))
  calls.chat++;assert.equal(body.model,'glm-5.3-flash');await route.fulfill({json:{choices:[{message:{content:'合成普通回答。'}}]}})
 })
 const idle=()=>page.waitForFunction(()=>document.querySelector('#ai-send')&&!document.querySelector('#ai-send').hidden)
 const ended=async()=>{assert.equal(await page.evaluate(()=>window.__voice.tracks.filter(t=>t.readyState!=='ended').length),0);assert.equal(await page.locator('#ai-mic').getAttribute('aria-pressed'),'false')}
 const open=async()=>{await page.locator('#open-ai-assistant').click();await page.waitForSelector('#ai-mic')}
 const close=()=>page.locator('dialog[open] [data-close]').click()
 const start=async()=>{await page.locator('#ai-mic').click();await page.waitForFunction(()=>document.querySelector('#ai-mic')?.getAttribute('aria-pressed')==='true');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'ai-message-input')}
 const stop=async()=>{await page.locator('#ai-mic').click();await ended()}
 const snapshot=()=>page.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)}),data={};for(const name of d.objectStoreNames)data[name]=await new Promise(r=>{const q=d.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result)});d.close();return data})
 const audit=async state=>{await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.ai-composer').evaluate(e=>e.scrollWidth<=e.clientWidth),true);const box=await page.locator('#ai-mic').boundingBox();assert.ok(box.width>=44&&box.height>=44);await page.screenshot({path:`/tmp/voice-mode-${prod?'prod':'local'}-${width}-${scale}-${state}.png`})}
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-ai-assistant');await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale/100+'px',scale);await open();const before=await snapshot();await audit('idle')
 assert.equal(await page.getByText('我知道了',{exact:true}).count(),0)
 await page.locator('#ai-message-input').fill('保留的输入草稿');const permissions=await page.evaluate(()=>window.__voice.permissions);await start();assert.equal(await page.evaluate(()=>window.__voice.permissions),permissions+1);await audit('recording')
 hold=true;await stop();await page.getByText('正在转写…',{exact:true}).waitFor();await audit('transcribing');while(!release)await page.waitForTimeout(10);release();hold=false;await idle();await page.getByText('正在朗读',{exact:true}).waitFor();assert.deepEqual(calls,{stt:1,chat:1});assert.equal(await page.locator('#ai-message-input').inputValue(),'保留的输入草稿');assert.equal(await page.locator('.ai-user').innerText(),'今天蛋白质还差多少');await audit('speaking')
 assert.equal(await page.evaluate(()=>window.__voice.contexts.every(c=>c.state==='closed')),true);await page.locator('#ai-tts-stop').click();assert.equal(await page.locator('.ai-tts-row').isVisible(),false)
 const cancelBefore=await page.evaluate(()=>window.__voice.cancels);await start();assert.ok(await page.evaluate(()=>window.__voice.cancels)>cancelBefore);assert.equal(await page.locator('.ai-tts-row').isVisible(),false);await page.locator('#ai-clear-chat').click();await ended();
 const spoken=await page.evaluate(()=>window.__voice.spoken.length);await page.locator('#ai-clear-chat').click();await page.locator('#ai-message-input').fill('普通文字');await page.locator('#ai-send').click();await idle();assert.equal(await page.evaluate(()=>window.__voice.spoken.length),spoken)
 // Permission, recorder and transcription errors keep hardware released and never auto restart.
 await page.locator('#ai-clear-chat').click();await page.evaluate(()=>window.__voice.denied=true);await page.locator('#ai-mic').click();await page.getByText('未获得麦克风权限，请在系统设置中允许后重试。',{exact:true}).waitFor();await ended();await page.evaluate(()=>window.__voice.denied=false)
 await start();await page.evaluate(()=>window.__voice.recorders.at(-1).onerror());await ended();await audit('error')
 sttFail=true;await start();await stop();await page.getByText('这段语音没有转写成功，可以重试或直接输入。',{exact:true}).waitFor();await ended();sttFail=false
 for(const action of ['clear','pagehide','hidden','settings','close']){await start();const n=calls.stt;if(action==='clear')await page.locator('#ai-clear-chat').click();else if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));else if(action==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true})});else if(action==='settings'){await page.locator('#ai-assistant-settings').click();await openAfterSettings()}else{await close();await open()}await ended();assert.equal(calls.stt,n)}
 async function openAfterSettings(){await page.locator('#ai-voice-settings').click();await page.getByText('语音会在你主动开启麦克风时录制，并用于转写。停止后立即释放麦克风。原始录音不会保存到 FitLog 数据库、Backup 或 Sync。',{exact:true}).waitFor();await close();await open()}
 // Abort while STT pending, no late final/TTS or resumed microphone.
 hold=true;release=undefined;await start();await stop();while(!release)await page.waitForTimeout(10);const chatBefore=calls.chat;await page.locator('#ai-clear-chat').click();await ended();release();hold=false;await page.waitForTimeout(80);assert.equal(calls.chat,chatBefore);assert.equal(await page.locator('.ai-user').count(),0)
 assert.deepEqual(await snapshot(),before,'voice/text never persist audio or business facts');assert.ok(!(await page.locator('body').innerText()).includes('synthetic-primary-key'));assert.deepEqual(errors,[])
 receipts.push({width,scale,calls,tracksEnded:true,systemPermission:true,noVoiceAck:true,ttsVoiceOnly:true,cleanup:['stop','close','clear','settings','pagehide','hidden','error','abort'],businessUnchanged:true,realProvider:'Pending',physicalMicRelease:'Pending'});console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}await fs.writeFile(`/tmp/voice-mode-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))}finally{await browser.close()}
