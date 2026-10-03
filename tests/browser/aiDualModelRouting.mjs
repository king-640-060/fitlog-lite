// All settings, credentials, pictures and requests are synthetic in isolated contexts.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5174/', prod = base.includes('github.io')
const sizes = prod ? [[390,844],[430,932]] : [[320,812],[375,812],[390,844],[430,932]]
const browser = await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
const label = {format:'fitlog-food-label',version:1,productName:'合成包装',brand:null,netQuantity:{value:null,unit:null,evidence:null},basis:{kind:'per_100g',amount:100,unit:'g',evidence:'每100g'},nutrients:{energy:{value:100,unit:'kcal',evidence:'能量100kcal'},protein:{value:null,unit:null,evidence:null},carbs:{value:null,unit:null,evidence:null},fat:{value:null,unit:null,evidence:null}},warnings:[]}
for(const [width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'})
  const page=await context.newPage(), requests=[],errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
  let modelsFail=false, imageFailure=false, holdKind='',release
  await context.addInitScript(()=>{
    const profile={id:'dual-test',name:'智谱 · glm-4.5',preset:'zhipu',protocol:'openai-chat-completions',baseUrl:'https://mock-dual.invalid/v1',model:'glm-4.5',toolCapability:'supported',visionCapability:'unsupported',createdAt:'',updatedAt:''}
    if(!localStorage.getItem('fitlog-ai-profiles-v1')){localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([profile]));localStorage.setItem('fitlog-ai-active-profile-v1',profile.id);localStorage.setItem('fitlog-ai-key-v1:'+profile.id,'synthetic-dual-key');localStorage.setItem('fitlog-ai-privacy-ack-v1','1');localStorage.setItem('fitlog-ai-vision-privacy-ack-v1','true')}
  })
  await page.route('https://mock-dual.invalid/**',async route=>{
    const req=route.request()
    if(req.url().endsWith('/models')){requests.push({kind:'models'});await route.fulfill(modelsFail?{status:500,body:'private provider error'}:{json:{data:['glm-4.5','image-model','image-two','chat-two'].map(id=>({id}))}});return}
    const body=req.postDataJSON(),image=body.messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url')),scan=image&&body.messages.length===2,tool=body.tools?.some(t=>t.function.name==='fitlog_capability_probe'),connection=body.messages[0]?.content==='Reply with OK.'
    const kind=scan?'scan':image?'vision':tool?'tools':connection?'connection':'chat'
    requests.push({kind,model:body.model,auth:req.headers().authorization});assert.ok(!JSON.stringify(body).includes('synthetic-dual-key'))
    if(kind===holdKind){holdKind='';await new Promise(resolve=>{release=resolve})}
    if(imageFailure&&image){await route.fulfill({status:400,body:imageFailure==='parameters'?'invalid request parameters':'this model does not support images'}).catch(()=>{});return}
    const message=tool?{content:null,tool_calls:[{id:'probe',type:'function',function:{name:'fitlog_capability_probe',arguments:'{}'}}]}:{content:scan?JSON.stringify(label):image?'731':connection?'OK':'继续使用聊天模型'}
    await route.fulfill({json:{choices:[{message}]}}).catch(()=>{})
  })
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
  const file={name:'synthetic-label.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,400,300);x.fillStyle='black';x.font='24px sans-serif';x.fillText('每100g 能量100kcal',20,100);return c.toDataURL('image/png').split(',')[1]}),'base64')}
  const close=async()=>{await page.locator('dialog [data-close]').click();await page.waitForFunction(()=>!document.querySelector('dialog'))}
  const settings=async()=>{await page.locator('#open-management').click();await page.locator('#more-ai-settings').click()}
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fitlog-ai-profiles-v1'))[0])
  const modify=change=>page.evaluate(change=>{const rows=JSON.parse(localStorage.getItem('fitlog-ai-profiles-v1'));Object.assign(rows[0],change);localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify(rows))},change)
  const layout=async name=>{await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.modal-body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.equal(await page.locator('[name=apiKey]').inputValue(),'');await page.screenshot({path:`/tmp/dual-${prod?'prod':'local'}-${width}-${name}.png`})}
  await settings();assert.ok((await page.locator('.ai-capabilities').innerText()).includes('对话 · 已验证'));assert.ok((await page.locator('.ai-capabilities').innerText()).includes('图片识别 · 未支持'));assert.equal(requests.length,0)
  await page.locator('[data-edit]').click();assert.equal(await page.locator('[name=imageRouting][value=same]').isChecked(),true);assert.equal(await page.locator('#ai-vision-field').isVisible(),false);await close()
  await settings();await page.locator('#ai-choose-vision').click();assert.equal(await page.locator('#ai-vision-field').isVisible(),true);assert.equal(requests.length,0)
  assert.equal(await page.locator('.ai-model-choice').evaluateAll(labels=>labels.every(label=>{const a=label.getBoundingClientRect(),b=label.querySelector('input').getBoundingClientRect();return a.height>=44&&Math.abs(a.top+a.height/2-b.top-b.height/2)<2})),true)
  await page.locator('#ai-list-models').click();await page.waitForFunction(()=>document.querySelector('#ai-model-note')?.textContent.startsWith('已读取'))
  assert.equal(requests.filter(r=>r.kind==='models').length,1)
  assert.deepEqual(await page.locator('#ai-model-select option').evaluateAll(es=>es.map(e=>e.value)),['glm-4.5','image-model','image-two','chat-two'])
  assert.deepEqual(await page.locator('#ai-vision-model-select option').evaluateAll(es=>es.filter(e=>e.value).map(e=>e.value)),['glm-4.5','image-model','image-two','chat-two'])
  await page.locator('#ai-vision-model-select').selectOption('image-model');await layout('independent');await page.locator('.ai-advanced summary').click();await page.locator('#ai-save-only').click()
  assert.equal((await saved()).model,'glm-4.5');assert.equal((await saved()).visionModel,'image-model');assert.equal((await saved()).toolCapability,'supported');assert.equal((await saved()).visionCapability,'unknown')
  assert.ok((await page.locator('.ai-current-service').innerText()).includes('图片 · image-model'))
  await page.locator('[data-edit]').click();assert.equal(await page.locator('#ai-model-select').inputValue(),'glm-4.5');assert.equal(await page.locator('#ai-vision-model-select').inputValue(),'image-model')
  await page.locator('form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。')
  assert.deepEqual(requests.filter(r=>['connection','tools','vision'].includes(r.kind)).map(r=>[r.kind,r.model]),[['connection','glm-4.5'],['tools','glm-4.5'],['vision','image-model']])
  assert.deepEqual(await page.locator('.ai-test-results span').evaluateAll(es=>es.map(e=>e.dataset.state)),['supported','supported','supported'])
  // A chat-only edit preserves verified image routing, even before retesting.
  await page.locator('#ai-manual-model').click();await page.locator('[name=model]').fill('chat-two');await page.locator('.ai-advanced summary').click();await page.locator('#ai-save-only').click();assert.equal((await saved()).visionCapability,'supported');assert.equal((await saved()).toolCapability,'unknown')
  await page.locator('[data-edit]').click();modelsFail=true;await page.locator('#ai-list-models').click();await page.waitForFunction(()=>document.querySelector('#ai-model-note')?.textContent.startsWith('没有读取到'));assert.equal(await page.locator('[name=model]').isVisible(),true);assert.equal(await page.locator('[name=visionModel]').isVisible(),true)
  await page.locator('[name=model]').fill('glm-4.5');await page.locator('[name=visionModel]').fill('image-two');imageFailure=true;await page.locator('form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。');assert.deepEqual(await page.locator('.ai-test-results span').evaluateAll(es=>es.map(e=>e.dataset.state)),['supported','supported','unsupported']);assert.equal((await saved()).toolCapability,'supported');await layout('partial');imageFailure=false;modelsFail=false;await close()
  await page.locator('#open-ai-assistant').click();release=undefined;holdKind='chat';await page.locator('#ai-message-input').fill('普通聊天');await page.locator('#ai-send').click();for(let n=0;n<100&&!release;n++)await page.waitForTimeout(10);assert.ok(release);await modify({visionModel:'image-model',visionCapability:'unknown'});release();await page.getByText('继续使用聊天模型',{exact:true}).waitFor();assert.equal(requests.at(-1).model,'glm-4.5');await close();await modify({visionModel:'image-two',visionCapability:'unknown'})
  const vision=async()=>{await page.locator('[data-tab=food]').click();await page.locator('#food-library').click();await page.locator('#food-vision-import').click();await page.locator('#vision-album-file').setInputFiles(file);await page.waitForSelector('.vision-images img')}
  await modify({visionCapability:'unknown'});await vision();await page.locator('#vision-analyze').click();await page.waitForSelector('#vision-review-form');assert.equal(requests.at(-1).model,'image-two');await close()
  // Captured image results reject a changed image model, but allow a chat-only edit.
  for(const [change,accepted] of [[{visionModel:'image-model',visionCapability:'unknown'},false],[{model:'chat-two'},true]]){
    await vision();release=undefined;holdKind='scan';await page.locator('#vision-analyze').click();for(let n=0;n<100&&!release;n++)await page.waitForTimeout(10);assert.ok(release);await modify(change);release()
    if(accepted)await page.waitForSelector('#vision-review-form');else{await page.getByText('AI 配置已变化，请重新识别。',{exact:true}).waitFor();assert.equal(await page.locator('#vision-review-form').count(),0)}await close()
  }
  // Legacy profiles still route the probe and the package scan through the chat model.
  await page.evaluate(()=>{const rows=JSON.parse(localStorage.getItem('fitlog-ai-profiles-v1'));delete rows[0].visionModel;rows[0].visionCapability='unknown';localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify(rows))})
  await vision();await page.locator('#vision-test').click();await page.waitForFunction(()=>document.querySelector('.vision-status')?.textContent.includes('图片能力已验证'));assert.equal(requests.at(-1).model,'chat-two');await page.locator('#vision-analyze').click();await page.waitForSelector('#vision-review-form');assert.equal(requests.at(-1).model,'chat-two');await close()
  await modify({visionCapability:'unknown'});await settings();await page.locator('[data-edit]').click();imageFailure='parameters';await page.locator('form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。');assert.equal((await saved()).toolCapability,'supported');assert.equal((await saved()).visionCapability,'unknown');assert.equal(await page.locator('#ai-vision-advice').isVisible(),true);assert.ok((await page.locator('[data-result=vision]').innerText()).includes('请求参数无效'));await page.locator('#ai-choose-vision').click();assert.equal(await page.locator('#ai-vision-field').isVisible(),true);await close();imageFailure=false
  // Reproduce the physical report: an old auto-name survives real editor saves.
  const saveRoutes=async(model,visionModel)=>{
    await settings();await page.locator('[data-edit]').click();await page.locator('#ai-manual-model').click();await page.locator('[name=model]').fill(model)
    await page.locator(`[name=imageRouting][value=${visionModel?'separate':'same'}]`).check()
    if(visionModel){await page.locator('#ai-manual-vision-model').click();await page.locator('[name=visionModel]').fill(visionModel)}
    await page.locator('.ai-advanced summary').click();await page.locator('#ai-save-only').click()
    assert.equal((await saved()).name,'智谱 · glm-4.5');assert.equal((await saved()).model,model);assert.equal((await saved()).visionModel,visionModel)
    assert.ok((await page.locator('.ai-current-service').innerText()).includes('聊天 / 数据 · '+model));await close()
  }
  for(const [scenario,model,visionModel] of [['A','glm-5.3-flash','glm-5.3-flash'],['B','glm-4.5','glm-5.3-flash'],['C','glm-5.3-flash',undefined]]){
    await saveRoutes(model,visionModel)
    // A restart reads latest active-profile storage; no probe or request is needed for its label.
    await page.reload({waitUntil:'networkidle'})
    await page.locator('#open-ai-assistant').click();assert.equal(await page.locator('.ai-current-profile').innerText(),'智谱 · '+model);await close()
    await vision();const expected='智谱 · '+model+(visionModel?' · 图片：'+visionModel:'')
    assert.equal(await page.locator('.vision-provider strong').innerText(),expected)
    await page.screenshot({path:`/tmp/dual-${prod?'prod':'local'}-${width}-effective-${scenario}.png`})
    if(await page.locator('#vision-test').count()){await page.locator('#vision-test').click();await page.waitForFunction(()=>document.querySelector('.vision-status')?.textContent.includes('图片能力已验证'));assert.equal(requests.at(-1).model,visionModel||model);assert.equal(await page.locator('.vision-provider strong').innerText(),expected)}
    await page.locator('#vision-analyze').click();await page.waitForSelector('#vision-review-form');assert.equal(requests.at(-1).model,visionModel||model);await close()
  }
  // A real Vision-only editor save preserves the ordinary assistant's existing chat context.
  await page.locator('#open-ai-assistant').click();await page.locator('#ai-message-input').fill('保留上下文');await page.locator('#ai-send').click();await page.getByText('继续使用聊天模型',{exact:true}).waitFor();await close()
  await saveRoutes('glm-5.3-flash','image-two')
  await page.locator('#open-ai-assistant').click();await page.getByText('保留上下文',{exact:true}).waitFor();await page.getByText('继续使用聊天模型',{exact:true}).waitFor();assert.equal(await page.locator('.ai-current-profile').innerText(),'智谱 · glm-5.3-flash');await close()
  console.log(JSON.stringify({width,effectiveLabelsABC:true,editorSaveReopenRestart:true,probeCannotOverrideLabel:true,visionOnlyEditorContext:true}))
  assert.ok(requests.filter(r=>r.kind!=='models').every(r=>r.auth==='Bearer synthetic-dual-key'));assert.deepEqual(errors,[])
  console.log(JSON.stringify({mode:prod?'production':'local',width,height,sharedList:true,legacy:true,dualRouting:true,partialSuccess:true,staleImage:true,chatOnlyChange:true,errors}))
  await context.close()
}
await browser.close()
