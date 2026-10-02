// Isolated synthetic profiles, mock providers and records only. Physical Safari remains a separate gate.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5174/', prod = base.includes('github.io')
const browser = await chromium.launch({ headless: true, executablePath: process.env.FITLOG_CHROME })
const sizes = prod ? [[390,844],[430,932]] : [[320,812],[375,812],[390,844],[430,932]]
for (const [width,height] of sizes) {
  const context = await browser.newContext({ viewport:{width,height}, hasTouch:true, isMobile:true, timezoneId:'Asia/Shanghai', serviceWorkers:'block' })
  // Install one fake viewport before app startup; it has the same lifetime as a real VisualViewport.
  await context.addInitScript(() => { window.qaViewportListeners={};window.qaViewport = Object.assign(new EventTarget(), {height:innerHeight,width:innerWidth,offsetTop:0}); const add=qaViewport.addEventListener.bind(qaViewport);qaViewport.addEventListener=(type,listener,options)=>{qaViewportListeners[type]=(qaViewportListeners[type]||0)+1;return add(type,listener,options)};Object.defineProperty(window,'visualViewport',{ configurable:true, value:window.qaViewport }) })
  const page = await context.newPage(), errors=[], requests=[]
  page.setDefaultTimeout(8000)
  page.on('pageerror',e=>errors.push(e.message))
  let mode='success', models=['exact-model','vision-model'], hold=false, release
  await page.route('https://mock-stable.invalid/**',async route=>{
    const request=route.request(); requests.push({url:request.url(),body:request.postDataJSON()})
    if(hold){hold=false;await new Promise(resolve=>{release=resolve})}
    if(request.url().endsWith('/models')) { if(mode==='models-fail'){await route.fulfill({status:500,body:'secret raw diagnostics'});return};await route.fulfill({json:{data:models.map(id=>({id}))}});return }
    const body=request.postDataJSON(), image=Array.isArray(body.messages[0].content), tools=!!body.tools
    if(mode==='partial'&&image){await route.fulfill({status:400,body:'image inputs not supported'});return}
    if(mode==='error'){await route.fulfill({status:400,body:'synthetic-stable-key <script> secret payload'});return}
    await route.fulfill({json:{choices:[{message:tools?{content:null,tool_calls:[{id:'probe',type:'function',function:{name:'fitlog_capability_probe',arguments:'{}'}}]}:{content:image?'731':'OK'}}]}}).catch(()=>{})
  })
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management');await page.evaluate(()=>{qaViewport.height=innerHeight;qaViewport.width=innerWidth;qaViewport.dispatchEvent(new Event('resize'))})
  const nav=async tab=>{await page.locator(`[data-tab=${tab}]`).tap();await page.waitForTimeout(30)}
  const close=async()=>{await page.locator('.sheet [data-close]').tap();await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(await page.evaluate(()=>document.body.classList.contains('sheet-open')),false);assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none')}
  const checkSheet=async name=>{
    const titles={'more-habits':'习惯管理','more-food-library':'食物库','more-exercise-library':'动作库','more-workout-templates':'训练模板','more-diet-templates':'饮食模板','more-backup':'备份与恢复','more-github-sync':'GitHub 同步','workout-start':'开始训练'}
    if(titles[name]) await page.waitForFunction(title=>document.querySelector('.modal-head h2')?.textContent===title,titles[name])
    await page.waitForSelector('.sheet[open]');assert.equal(await page.locator('.sheet').count(),1)
    assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('sheet-focus-anchor')),true,`${name} first focus`)
    assert.equal(await page.locator('[data-close]').evaluate(e=>getComputedStyle(e).outlineStyle),'none')
    await page.waitForTimeout(220)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow`)
    assert.equal(await page.locator('.modal-body').evaluate(e=>e.scrollWidth<=e.clientWidth),true)
    const smallInputs=await page.locator('.sheet input:not([type=hidden]):not([type=checkbox]):not([type=radio]),.sheet textarea,.sheet select').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<16).length);assert.equal(smallInputs,0)
    assert.equal(await page.locator('[data-close]').evaluate(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44),true)
    const bg=await page.evaluate(()=>{const a=getComputedStyle(document.querySelector('dialog'),'::backdrop');return a.backdropFilter});assert.ok(!bg||bg==='none')
    await page.screenshot({path:`/tmp/interaction-${prod?'prod':'local'}-${width}-${name}.png`})
  }
  // Keyboard modality and restore, plus pointer focus on inputs and summaries.
  await page.locator('#open-ai-assistant').tap();await checkSheet('assistant-empty');await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth),'2px');await close()
  await page.locator('#open-ai-assistant').focus();await page.keyboard.press('Enter');await checkSheet('assistant-keyboard');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(await page.evaluate(()=>document.activeElement?.id),'open-ai-assistant')
  await page.locator('#open-management').tap();await page.locator('#more-ai-settings').tap();await checkSheet('settings-new')
  assert.equal(await page.locator('[data-base-url]').isVisible(),false);assert.equal(await page.locator('[name=baseUrl]').inputValue(),'https://open.bigmodel.cn/api/paas/v4')
  assert.equal(requests.length,0);assert.equal(await page.locator('[data-scope]').count(),0)
  await page.locator('[name=preset]').selectOption('custom');assert.equal(await page.locator('[data-base-url]').isVisible(),true)
  await page.locator('[name=baseUrl]').fill('https://mock-stable.invalid/v1');await page.locator('[name=apiKey]').fill('synthetic-stable-key');await page.locator('#ai-manual-model').click();await page.locator('[name=model]').fill('saved-outside-list');await page.locator('#ai-privacy-ack').check()
  await page.locator('#ai-list-models').tap();await page.waitForFunction(()=>!document.querySelector('#ai-model-select').hidden)
  assert.deepEqual(await page.locator('#ai-model-select option').evaluateAll(es=>es.map(e=>e.value)),['saved-outside-list','exact-model','vision-model'])
  assert.equal(await page.locator('[name=model]').inputValue(),'saved-outside-list');assert.ok((await page.locator('#ai-model-note').innerText()).includes('当前模型未出现在'))
  await page.locator('#ai-model-select').selectOption('exact-model');await page.locator('form button[type=submit]').tap();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。')
  assert.deepEqual(await page.locator('.ai-test-results span').evaluateAll(es=>es.map(e=>e.dataset.state)),['supported','supported','supported'])
  assert.equal(await page.locator('[name=apiKey]').inputValue(),'')
  const probes=requests.slice(-3).map(r=>r.body);assert.equal(probes[0].tools,undefined);assert.ok(probes[1].tools);assert.ok(Array.isArray(probes[2].messages[0].content));assert.ok(!JSON.stringify(probes).includes('synthetic-stable-key'))
  await page.locator('#ai-settings-back').tap();assert.equal(await page.locator('[data-scope]').count(),0);assert.equal(await page.locator('.ai-profiles').count(),0);assert.ok((await page.locator('.ai-capabilities').innerText()).includes('图片识别 · 已验证'))
  const count=requests.length;await close();await page.locator('#open-management').tap();await page.locator('#more-ai-settings').tap();assert.equal(requests.length,count)
  await page.waitForTimeout(220);assert.ok(await page.locator('#ai-permissions-open span').evaluate(e=>e.getBoundingClientRect().width>180));assert.ok(await page.locator('#ai-permissions-open').evaluate(e=>e.querySelector('small').getBoundingClientRect().top>=e.querySelector('strong').getBoundingClientRect().bottom));await page.screenshot({path:`/tmp/interaction-${prod?'prod':'local'}-${width}-settings-overview.png`});await page.locator('#ai-permissions-open').tap();assert.equal(await page.locator('[data-scope]').count(),6);assert.equal(await page.locator('input[role=switch]').count(),7)
  await page.locator('[data-scope=weight]').uncheck();await page.locator('#ai-settings-back').tap();assert.ok((await page.locator('#ai-permissions-open').innerText()).includes('5 项'))
  await page.locator('[data-edit]').tap();assert.equal(await page.locator('[name=apiKey]').inputValue(),'');mode='models-fail';await page.locator('#ai-list-models').tap();await page.waitForFunction(()=>document.querySelector('#ai-model-note')?.textContent==='没有读取到模型列表，可以手动填写模型 ID。');assert.equal(await page.locator('[name=model]').isVisible(),true)
  mode='partial';await page.locator('form button[type=submit]').tap();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。');assert.deepEqual(await page.locator('.ai-test-results span').evaluateAll(es=>es.map(e=>e.dataset.state)),['supported','supported','unsupported'])
  mode='error';await page.locator('form button[type=submit]').tap();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='配置已保存。各项能力可以独立使用。');assert.equal((await page.locator('.ai-test-results').innerText()).includes('请求参数无效'),true);assert.equal((await page.locator('#ai-settings').innerText()).includes('secret payload'),false)
  mode='success';hold=true;await page.locator('#ai-list-models').tap();await page.waitForFunction(()=>document.querySelector('.ai-status')?.textContent==='正在读取模型列表…');await page.locator('[name=model]').fill('changed-during-request');release();await page.waitForTimeout(100);assert.equal(await page.locator('[name=model]').inputValue(),'changed-during-request');assert.equal(await page.locator('#ai-model-select').isVisible(),false)
  await close()
  // Explicit ordinary-chat notice and compact safe error. Underlying service enforcement is tested elsewhere.
  await page.evaluate(()=>{const rows=JSON.parse(localStorage.getItem('fitlog-ai-profiles-v1'));rows[0].toolCapability='unknown';localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify(rows))});await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>{qaViewport.height=innerHeight;qaViewport.width=innerWidth;qaViewport.dispatchEvent(new Event('resize'))})
  await page.locator('#open-ai-assistant').tap();await checkSheet('assistant-notice');assert.equal(await page.locator('.ai-capability-notice').isVisible(),true)
  const slot=await page.locator('.ai-send-slot').boundingBox();mode='error';await page.locator('#ai-message-input').fill('普通聊天');await page.locator('#ai-send').tap();await page.waitForSelector('.ai-error');assert.ok((await page.locator('.ai-error').innerText()).includes('请求参数无效'));assert.equal(await page.locator('.ai-conversation .ai-notice').count(),0);assert.equal((await page.locator('.ai-conversation').innerText()).includes('secret payload'),false)
  assert.equal((await page.locator('.ai-send-slot').boundingBox()).width,slot.width)
  await page.locator('#ai-message-input').tap();assert.equal(await page.locator('#ai-message-input').evaluate(e=>getComputedStyle(e).boxShadow),'none');await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.documentElement.dataset.inputModality),'pointer');await page.evaluate(()=>{qaViewport.height=innerHeight-300;qaViewport.offsetTop=20;qaViewport.dispatchEvent(new Event('resize'))});await page.waitForTimeout(80)
  assert.ok(await page.locator('.ai-composer').evaluate(e=>e.getBoundingClientRect().bottom<=visualViewport.height+visualViewport.offsetTop));assert.equal(await page.evaluate(()=>document.body.classList.contains('keyboard-open')),true)
  await page.evaluate(()=>{qaViewport.height=innerHeight;qaViewport.offsetTop=0;qaViewport.dispatchEvent(new Event('resize'))});await close()
  // All major sheets use title focus, clean close, one primary, same viewport and native focus trap.
  await nav('today');await page.locator('#today-record-weight').tap();await checkSheet('weight');await page.locator('[name=weight]').fill('71.4');await page.locator('#weight-sheet-form [type=submit]').tap();await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(await page.locator('#view').evaluate(e=>getComputedStyle(e).animationName),'none')
  for(const destination of ['more-habits','more-food-library','more-exercise-library','more-workout-templates','more-diet-templates','more-backup','more-github-sync']){
    await page.locator('#open-management').tap();await page.locator(`#${destination}`).tap();await checkSheet(destination);if(destination==='more-habits'){await page.locator('#habit-new').tap();await page.waitForSelector('#habit-form');await page.locator('[name=name]').fill('稳定习惯');const target=page.locator('.habit-target-row select');await target.selectOption('3');assert.equal(await page.locator('.habit-target-row').evaluate(e=>getComputedStyle(e).outlineStyle),'none');await page.keyboard.press('Tab');await target.focus();assert.equal(await page.locator('.habit-target-row').evaluate(e=>getComputedStyle(e).outlineWidth),'2px');await page.locator('#habit-form [type=submit]').tap();await page.waitForSelector('.habit-manager')}await close()
  }
  await nav('plan');await page.locator('#plan-add-task').tap();await checkSheet('task');await page.locator('[name=title]').fill('稳定任务');await page.locator('#task-date-picker-open').tap();await page.keyboard.press('Escape');await page.waitForSelector('#task-form',{state:'visible'});assert.equal(await page.locator('#task-form').isVisible(),true);assert.equal(await page.locator('dialog').count(),1);assert.equal(await page.locator('[name=title]').inputValue(),'稳定任务');await page.locator('#task-form [type=submit]').tap();await page.waitForFunction(()=>!document.querySelector('dialog'))
  await page.locator('[data-task-edit]').first().tap();await page.locator('#task-delete').tap();await page.waitForSelector('.confirm-dialog');assert.equal(await page.locator('dialog').count(),2);assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2');await page.locator('[data-cancel]').tap();assert.equal(await page.locator('#task-form').isVisible(),true);assert.equal(await page.locator('dialog').count(),1);await close()
  await nav('food');await page.locator('#food-date-picker-open').tap();await checkSheet('date-picker');await close();await page.locator('#food-library').tap();await page.locator('#new-food').tap();await checkSheet('food-editor');await close();await page.locator('#food-library').tap();await page.locator('#food-vision-import').tap();await checkSheet('vision');await close()
  await nav('workout');await page.locator('#add-cardio').tap();await checkSheet('cardio');await close();await page.locator('#start-pelvic-floor').tap();await checkSheet('pelvic-setup');await close();await page.locator('#start-workout').tap();await checkSheet('workout-start');await close()
  await nav('progress');await page.locator('[data-progress-view=calendar]').tap();await page.locator('.calendar-day').nth(15).tap();await checkSheet('calendar-detail');await close();await page.locator('[data-progress-view=reports]').tap();await page.waitForSelector('.report-page');assert.equal(await page.locator('.report-page').count(),1)
  await nav('food');const initialScroll=await page.evaluate(()=>{window.scrollTo(0,80);return scrollY})
  for(let i=0;i<12;i++){await page.evaluate(()=>document.querySelector('#open-ai-assistant').click());await page.waitForSelector('.ai-composer');await close()}
  assert.equal(await page.evaluate(()=>scrollY),initialScroll);assert.deepEqual(await page.evaluate(()=>qaViewportListeners),{resize:1,scroll:1})
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#open-ai-assistant').tap();assert.equal(await page.locator('dialog').evaluate(e=>getComputedStyle(e).animationName),'none');await close()
  for(const tab of ['today','plan','food','workout','progress']){await nav(tab);assert.equal(await page.locator('#view').evaluate(e=>getComputedStyle(e).animationName),'none');await page.screenshot({path:`/tmp/interaction-${prod?'prod':'local'}-${width}-page-${tab}.png`})}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mode:prod?'production':'local',width,height,modality:true,sheetLifecycle:true,keyboardGeometry:true,settingsHierarchy:true,models:true,saveTest:true,partial:true,safe400:true,majorSheets:true,errors}))
  await context.close()
}
await browser.close()
