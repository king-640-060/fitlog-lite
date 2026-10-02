// Synthetic streams/keys/records only; delayed native ReadableStream responses, no provider quota.
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5174/',prod=base.includes('github.io')
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
try { for(const [width,height] of (prod?[[390,844],[430,932]]:[[320,812],[375,812],[390,844],[430,932]])){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'})
 await context.addInitScript(()=>{
  const p={id:'stream-test',name:'合成流式',protocol:'openai-chat-completions',baseUrl:'https://mock-stream.invalid/v1',model:'chat-model',visionModel:'image-model',toolCapability:'supported',createdAt:'',updatedAt:''}
  localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([p]));localStorage.setItem('fitlog-ai-active-profile-v1',p.id);localStorage.setItem('fitlog-ai-key-v1:'+p.id,'synthetic-stream-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1');localStorage.setItem('fitlog-ai-voice-privacy-ack-v1','1')
  class Speech {start(){this.onstart?.();window.__speech=this}abort(){}stop(){}}
  window.SpeechRecognition=Speech;window.webkitSpeechRecognition=undefined
  window.__requests=[];window.__mode='normal';window.__streams=[]
  const native=window.fetch.bind(window),enc=new TextEncoder()
  window.fetch=async(url,options)=>{
   if(!String(url).startsWith('https://mock-stream.invalid/'))return native(url,options)
   const body=JSON.parse(options.body);window.__requests.push(body)
   let c,cancelled=false;const timers=[];const stream=new ReadableStream({start(controller){c=controller},cancel(){cancelled=true;timers.forEach(clearTimeout)}})
   const push=delta=>{if(delta.content)s.text=true;if(!cancelled)c.enqueue(enc.encode('data: '+JSON.stringify({choices:[{delta}]})+'\n\n'))}
   const s={push,c,text:false,fail:()=>{cancelled=true;timers.forEach(clearTimeout);c.error(new TypeError('private diagnostic'))},done:()=>{if(!cancelled)c.enqueue(enc.encode('data: [DONE]\n\n'))},get cancelled(){return cancelled}}
   window.__streams.push(s)
   const mode=window.__mode
   if(mode==='tool'&&body.messages.at(-1).role==='user')timers.push(setTimeout(()=>push({tool_calls:[{index:0,id:'context',type:'function',function:{name:'get_current_context',arguments:'{'}}]}),150))
   else if(mode==='secret'){timers.push(setTimeout(()=>push({content:'安全 synthetic-stream-'}),150));timers.push(setTimeout(()=>push({content:'key 不应显示'}),300))}
   else if(mode==='scroll')for(let n=0;n<18;n++)timers.push(setTimeout(()=>push({content:`第${n+1}段：`+'连续内容，用于验证滚动位置。'.repeat(24)+'\n'}),(n+1)*120))
   else {timers.push(setTimeout(()=>push({content:'首段中文'}),150));timers.push(setTimeout(()=>push({content:'，继续显示。'}),300))}
   return new Response(stream,{headers:{'Content-Type':'text/event-stream'}})
  }
 })
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'#quick=ai',{waitUntil:'networkidle'});await page.waitForSelector('#ai-send');await page.evaluate(()=>{window.__viewChanges=0;new MutationObserver(rows=>window.__viewChanges+=rows.length).observe(document.querySelector('#view'),{subtree:true,childList:true,characterData:true})})
 const send=async(text,mode='normal')=>{await page.evaluate(m=>window.__mode=m,mode);await page.locator('#ai-message-input').fill(text);await page.locator('#ai-send').click()}
 const idle=()=>page.waitForFunction(()=>!document.querySelector('#ai-send').hidden)
 const finish=async()=>{await page.waitForFunction(()=>__streams.at(-1).text);await page.evaluate(()=>window.__streams.at(-1).done())}
 const clear=async()=>{await idle();await page.locator('#ai-clear-chat').click();await page.waitForFunction(()=>!document.querySelector('.ai-assistant .ai-user'))}
 await send('首段测试');await page.getByText('正在思考…',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.ai-assistant .ai-assistant p')?.textContent==='首段中文')
 assert.equal(await page.locator('#ai-stop').isVisible(),true);assert.equal(await page.locator('#ai-mic').isDisabled(),true);assert.equal(await page.locator('#ai-food-camera').isDisabled(),true)
 await page.screenshot({path:`/tmp/stream-${prod?'prod':'local'}-${width}-partial.png`})
 const bubble=await page.locator('.ai-conversation .ai-assistant').elementHandle();await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent==='首段中文，继续显示。')
 assert.equal(await bubble.evaluate(e=>e===document.querySelector('.ai-conversation .ai-assistant')),true)
 assert.equal(await page.locator('.ai-conversation').getAttribute('aria-live'),'off');assert.equal(await page.locator('.ai-conversation .ai-assistant').getAttribute('aria-live'),'off')
 assert.equal(await page.evaluate(()=>__requests.at(-1).stream),true);assert.equal(await page.evaluate(()=>__requests.at(-1).model),'chat-model');assert.equal(await page.evaluate(()=>__requests.at(-1).stream_options),undefined)
 await finish();await idle();assert.equal(await page.locator('.ai-conversation .ai-assistant').count(),1)
 await clear();await send('滚动测试','scroll');await page.waitForFunction(()=>document.querySelector('.ai-conversation').scrollHeight>document.querySelector('.ai-conversation').clientHeight+500)
 assert.ok(await page.locator('.ai-conversation').evaluate(e=>e.scrollHeight-e.scrollTop-e.clientHeight<75))
 await page.locator('.ai-conversation').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(550);assert.equal(await page.locator('.ai-conversation').evaluate(e=>e.scrollTop),0)
 await page.waitForTimeout(1800);await finish();await idle();assert.equal(await page.locator('.ai-conversation').evaluate(e=>e.scrollTop),0)
 await clear();await send('中途停止');await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent.includes('首段'))
 await page.locator('#ai-stop').click();await idle();assert.equal(await page.evaluate(()=>__streams.at(-1).cancelled),true);assert.ok((await page.locator('.ai-error').innerText()).includes('已停止'));assert.equal(await page.locator('.ai-conversation .ai-assistant').count(),1)
 await send('停止后的新问题');await page.waitForFunction(()=>__requests.at(-1).messages.at(-1).content==='停止后的新问题');assert.equal(await page.evaluate(()=>JSON.stringify(__requests.at(-1).messages).includes('首段中文')),false);await finish();await idle()
 await clear();await send('工具完整前不得执行','tool');await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__requests.at(-1).messages.some(m=>m.role==='tool')),false);assert.equal(await page.locator('.ai-proposal').count(),0)
 await page.locator('#ai-stop').click();await idle();assert.equal(await page.evaluate(()=>__streams.at(-1).cancelled),true)
 await clear();let n=await page.evaluate(()=>__requests.length);await send('查询上下文','tool');await page.waitForTimeout(250)
 await page.evaluate(()=>{__streams.at(-1).push({tool_calls:[{index:0,id:'context',type:'function',function:{arguments:'}'}}]});__streams.at(-1).done()})
 await page.waitForFunction(n=>__requests.length===n+2,n);assert.equal(await page.evaluate(()=>__requests.at(-1).messages.at(-1).tool_call_id),'context');assert.equal(await page.evaluate(()=>__requests.at(-1).stream),true)
 await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent.includes('首段'));await finish();await idle();assert.equal(await page.locator('.ai-conversation .ai-assistant').count(),1);assert.equal((await page.locator('.ai-conversation').innerText()).includes('"arguments"'),false)
 await clear();await send('网络断开');await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent.includes('首段'))
 await page.evaluate(()=>__streams.at(-1).fail());await idle();assert.equal(await page.locator('.ai-conversation .ai-assistant').count(),1);assert.equal((await page.locator('.ai-error').innerText()).includes('private diagnostic'),false)
 await send('网络后继续');await page.waitForFunction(()=>__requests.at(-1).messages.at(-1).content==='网络后继续');assert.equal(await page.evaluate(()=>JSON.stringify(__requests.at(-1).messages).includes('首段中文')),false);await finish();await idle()
 await clear();await send('凭据输出测试','secret');await idle();assert.equal((await page.locator('.ai-conversation').innerText()).includes('synthetic-stream-'),false);assert.ok((await page.locator('.ai-error').innerText()).includes('凭据'))
 await clear();await page.evaluate(()=>{__mode='normal';location.hash='quick=ai&prompt='+encodeURIComponent('快捷请求')+'&send=1'});await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent.includes('首段'));assert.equal(new URL(page.url()).hash,'');assert.equal(await page.evaluate(()=>__requests.at(-1).stream),true);await finish();await idle()
 await clear();await page.locator('#ai-mic').click();assert.notEqual(await page.evaluate(()=>document.activeElement.id),'ai-message-input')
 await page.evaluate(()=>{__speech.onresult?.({resultIndex:0,results:[{isFinal:true,length:1,0:{transcript:'语音流式请求'}}]});__speech.onend?.()});await page.waitForFunction(()=>document.querySelector('.ai-conversation .ai-assistant p')?.textContent.includes('首段'));assert.equal(await page.evaluate(()=>__requests.at(-1).stream),true);assert.equal(await page.evaluate(()=>__requests.at(-1).messages.at(-1).content),'语音流式请求');await finish();await idle()
 assert.equal(await page.evaluate(()=>__viewChanges),0,'streaming never rerenders the business page');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[])
 console.log(JSON.stringify({mode:prod?'production':'local',width,height,incrementalBeforeDone:true,delaysMs:[120,150,300],oneBubble:true,stop:true,toolLoop:true,partialHistoryExcluded:true,rollingSecrets:true,nearBottom:true,upwardReading:true,voiceStream:true,quickStream:true,accessibility:true,errors}))
 await context.close()
}}finally{await browser.close()}
