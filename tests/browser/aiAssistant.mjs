// Isolated synthetic data + intercepted mock providers. Never uses real credentials.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5173/'
const prod = base.includes('github.io')
const browser = await chromium.launch({ headless: true, executablePath: process.env.FITLOG_CHROME })
const sizes = prod ? [[390,844],[430,932]] : [[320,812],[375,812],[390,844],[430,932]]
const response = (content, tool_calls = []) => ({ choices: [{ message: { content, ...(tool_calls.length ? { tool_calls } : {}) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } })
const call = (name, args, id = `c-${Math.random()}`) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })
for (const [width,height] of sizes) {
  const context = await browser.newContext({ viewport: { width,height }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Shanghai', serviceWorkers: 'block' })
  const page = await context.newPage(), errors = [], consoleLines = [], requests = []
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => consoleLines.push(message.text()))
  let replies = [], httpStatus = 200, networkFail = false, hold = false, release
  await page.route('https://mock-fitlog-*.invalid/**', async route => {
    const request = route.request(), url = request.url()
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204 }); return }
    if (url.endsWith('/models')) { await route.fulfill({ status: 404, body: 'raw secret provider body' }); return }
    const body = request.postDataJSON(); requests.push({ url, body, auth: request.headers().authorization })
    assert.equal(JSON.stringify(body).includes('synthetic-private-key'), false)
    assert.equal(JSON.stringify(body).includes('synthetic-github-token'), false)
    if (networkFail) { await route.abort('failed'); return }
    if (hold) { hold = false; await new Promise(resolve => { release = resolve }) }
    if (httpStatus !== 200) { await route.fulfill({ status: httpStatus, body: 'raw secret provider body' }).catch(() => {}); return }
    const probe = body.tools?.some(tool => tool.function.name === 'fitlog_capability_probe')
    const result = probe ? response(null, [call('fitlog_capability_probe', {}, 'probe')]) : body.messages[0]?.content === 'Reply with OK.' ? response('OK') : replies.shift() ?? response('普通聊天回复')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) }).catch(() => {})
  })
  await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#open-ai-assistant')
  const nav = async tab => { await page.locator(`[data-tab=${tab}]`).click(); await page.waitForTimeout(100) }
  const close = async () => { await page.locator('dialog [data-close]').click() }
  const layout = async name => {
    await page.waitForTimeout(280)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name)
    const overflows = await page.locator('.ai-assistant, .ai-conversation, .modal-body, .topbar').evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className))
    assert.deepEqual(overflows, [], `${name}: ${overflows}`)
    assert.equal(await page.locator('input[type=date]').count(), 0)
    if (await page.locator('.ai-assistant-sheet').count()) {
      const composer = await page.locator('.ai-composer').boundingBox(), footer = await page.locator('.ai-footer-note').boundingBox()
      assert.ok(composer.y + composer.height <= height && footer.y + footer.height <= height, 'composer/footer reachable inside viewport')
    }
    await page.screenshot({ path: `/tmp/fitlog-ai-${prod?'prod':'local'}-${width}-${name}.png` })
  }
  for (const tab of ['today','plan','food','workout','progress']) {
    await nav(tab); assert.equal(await page.locator('.bottom-nav button').count(),5)
    if (tab === 'food') { assert.equal(await page.locator('#use-diet-template').isVisible(),true); assert.equal(await page.locator('#food-library').isVisible(),true) }
    await page.locator('#open-ai-assistant').tap(); assert.equal(await page.locator('#ai-message-input').evaluate(e => getComputedStyle(e).fontSize),'16px')
    assert.equal(await page.locator('.ai-welcome').innerText().then(text => text.includes('连接你自己的 AI 服务')), true)
    await layout(`empty-${tab}`); await close()
  }
  await nav('food'); await page.locator('#open-management').click(); await page.locator('#more-ai-settings').click(); await page.locator('.ai-advanced summary').click()
  await page.locator('[name=name]').fill('服务 A'); await page.locator('[name=preset]').selectOption('zhipu')
  assert.equal(await page.locator('[name=baseUrl]').inputValue(),'https://open.bigmodel.cn/api/paas/v4')
  await page.locator('[name=preset]').selectOption('custom'); await page.locator('[name=baseUrl]').fill('https://mock-fitlog-a.invalid/v1/')
  await page.locator('[name=apiKey]').fill('synthetic-private-key-A'); await page.locator('#ai-manual-model').click();await page.locator('[name=model]').fill('model-A')
  assert.equal(await page.locator('[name=apiKey]').evaluate(e => getComputedStyle(e).fontSize),'16px')
  await page.locator('#ai-privacy-ack').check(); await page.locator('#ai-test-connection').click(); await page.getByText('连接成功',{exact:true}).waitFor()
  await page.locator('#ai-test-tools').click(); await page.getByText('已验证工具调用，保存后可读取数据和提出建议',{exact:true}).waitFor()
  await page.locator('#ai-list-models').click(); await page.waitForFunction(() => document.querySelector('.ai-status')?.textContent.includes('手动填写'))
  await layout('settings'); await page.locator('#ai-save-only').click()
  await page.locator('[data-edit]').click(); assert.equal(await page.locator('[name=apiKey]').inputValue(),''); assert.equal(await page.locator('[name=apiKey]').getAttribute('placeholder'),'已保存；留空则保持不变')
  await page.locator('#ai-settings-back').click(); await close()
  await page.evaluate(async () => {
    localStorage.setItem('fitlog-github-sync-token-v1','synthetic-github-token')
    const db = await new Promise((resolve,reject) => { const request=indexedDB.open('fitlog-lite-db');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error) })
    const now='2026-09-29T00:00:00.000Z', food={id:'mock-rice',name:'米饭',referenceGrams:100,calories:200,protein:10,carbs:30,fat:2,createdAt:now,updatedAt:now}
    const tx=db.transaction(['foods','foodLogs','nutritionTargets','tasks','habits','weights','workouts','cardioSessions'],'readwrite')
    tx.objectStore('foods').put(food)
    tx.objectStore('foodLogs').put({id:'historical',date:'2026-09-29',meal:'lunch',foodId:food.id,foodName:'米饭旧名称',grams:100,referenceGrams:100,caloriesPerReference:317,totalCalories:317,carbsPerReference:10,totalCarbs:10,fatPerReference:1,totalFat:1,createdAt:now,updatedAt:now})
    tx.objectStore('nutritionTargets').put({id:'target',date:'2026-09-29',calories:550,protein:80,createdAt:now,updatedAt:now})
    tx.objectStore('tasks').put({id:'task-one',title:'测试任务',tagIds:[],createdAt:now,updatedAt:now})
    tx.objectStore('habits').put({id:'habit-one',name:'读书',active:true,sortOrder:0,createdAt:now,updatedAt:now})
    tx.objectStore('weights').put({id:'weight-one',date:'2026-09-29',weightKg:72,createdAt:now,updatedAt:now})
    tx.objectStore('workouts').put({id:'workout-one',date:'2026-09-29',startedAt:now,finishedAt:now,createdAt:now,updatedAt:now,exercises:[{id:'e',exerciseName:'卧推旧名称',sets:[{id:'s',weightKg:50,reps:8}]}]})
    tx.objectStore('cardioSessions').put({id:'cardio-one',date:'2026-09-29',activityType:'treadmill',durationMinutes:30,inclinePercent:0,createdAt:now,updatedAt:now})
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()
  })
  const records = async store => page.evaluate(async store => {
    const db=await new Promise(resolve=>{const r=indexedDB.open('fitlog-lite-db');r.onsuccess=()=>resolve(r.result)})
    const tx=db.transaction(store,'readonly'), result=await new Promise(resolve=>{const r=tx.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result)});db.close();return result
  },store)
  const open = async () => { await page.locator('#open-ai-assistant').click(); await page.waitForSelector('.ai-composer') }
  const send = async (text, sequence = [response('普通聊天回复')]) => { replies = [...sequence]; await page.locator('#ai-message-input').fill(text); await page.locator('#ai-send').click(); await page.waitForFunction(() => document.querySelector('#ai-stop')?.hidden === true) }
  await open(); assert.equal(await page.locator('.ai-suggestions button').count(),6)
  await page.locator('#ai-message-input').fill('第一行\n第二行\n' + '长内容\n'.repeat(20))
  assert.ok((await page.locator('#ai-message-input').boundingBox()).height <= 120)
  await page.locator('#ai-message-input').fill('中文输入')
  const imeRequests = requests.length
  await page.locator('#ai-message-input').evaluate(input => { input.dispatchEvent(new CompositionEvent('compositionstart')); input.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter',ctrlKey:true,isComposing:true,bubbles:true })); input.dispatchEvent(new CompositionEvent('compositionend')) })
  assert.equal(requests.length,imeRequests)
  await close()
  await page.evaluate(() => { window.aiOriginalViewportDescriptor = Object.getOwnPropertyDescriptor(window,'visualViewport'); const viewport=Object.assign(new EventTarget(), { height:innerHeight,width:innerWidth,offsetTop:0 }); Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport}) })
  await open(); await page.locator('#ai-message-input').focus(); await page.evaluate(() => { visualViewport.height=innerHeight-300;visualViewport.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize')) })
  await page.waitForTimeout(150)
  assert.ok(await page.locator('.ai-composer').evaluate(element=>element.getBoundingClientRect().bottom<=visualViewport.height+1))
  await page.screenshot({path:`/tmp/fitlog-ai-${prod?'prod':'local'}-${width}-keyboard-geometry.png`})
  await close(); await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',window.aiOriginalViewportDescriptor);window.dispatchEvent(new Event('resize'))}); await open()
  await send('看9月29日饮食', [response('',[call('get_nutrition_day',{date:'2026-09-29'},'nutrition')]),response('历史热量317 kcal，蛋白质未知。')])
  const nutritionRequest=requests.at(-1), nutritionResult=JSON.parse(nutritionRequest.body.messages.find(message=>message.role==='tool').content)
  assert.equal(nutritionResult.actual.calories,317); assert.ok(nutritionResult.unknownMacros.includes('protein')); assert.equal(nutritionResult.meals.find(meal=>meal.meal==='lunch').items[0].foodName,'米饭旧名称')
  await send('记录晚餐米饭150克', [response('',[call('search_foods',{query:'米饭'},'search')]),response('',[call('propose_food_logs',{date:'2026-09-29',meal:'dinner',items:[{foodId:'mock-rice',grams:150}]},'food')]),response('建议待确认。')])
  assert.equal((await records('foodLogs')).length,1)
  const foodCard=page.locator('.ai-proposal').last(); assert.ok((await foodCard.innerText()).includes('300 kcal')); await layout('food-proposal')
  await foodCard.getByText('确认写入',{exact:true}).click(); await foodCard.getByText('已完成',{exact:true}).waitFor()
  assert.equal((await records('foodLogs')).length,2); assert.equal((await records('foodLogs')).find(row=>row.id!=='historical').meal,'dinner')
  await send('创建明天任务', [response('',[call('propose_tasks',{tasks:[{title:'明天读书',date:'2026-10-03',tagNames:['学习']}]},'task')]),response('任务待确认。')])
  const taskCard=page.locator('.ai-proposal').last(); assert.ok((await taskCard.innerText()).includes('将创建标签 #学习'))
  await taskCard.getByText('取消',{exact:true}).click(); assert.equal((await records('tasks')).length,1); assert.equal((await records('taskTags')).length,0)
  assert.ok((await taskCard.innerText()).includes('已取消'))
  await send('修改体重', [response('',[call('propose_weight',{date:'2026-09-29',weightKg:71.5},'weight')]),response('体重待确认。')])
  const weightCard=page.locator('.ai-proposal').last(); assert.ok((await weightCard.innerText()).includes('72 kg → 71.5 kg'))
  await weightCard.getByText('确认写入',{exact:true}).click(); await weightCard.getByText('已完成',{exact:true}).waitFor(); assert.equal((await records('weights'))[0].weightKg,71.5)
  await send('解释本月报告', [response('',[call('get_report',{mode:'monthly',anchor:'2026-09-29'},'report')]),response('本月报告基于已保存记录。')])
  assert.equal(JSON.parse(requests.at(-1).body.messages.find(message=>message.role==='tool').content).summary.strengthSets,1)
  await send('补齐9月29日营养', [response('',[call('get_nutrition_completion',{date:'2026-09-29',allowedFoodIds:['mock-rice']},'completion')]),response('方案来自本地计算。')])
  const completion=JSON.parse(requests.at(-1).body.messages.find(message=>message.role==='tool').content); assert.equal(completion.date,'2026-09-29')
  await send('显示普通文字',[response('<img src=x onerror="window.aiInjected=true">\n下一行')]); assert.equal(await page.locator('.ai-conversation img').count(),0); assert.equal(await page.evaluate(()=>window.aiInjected),undefined)
  assert.ok((await page.locator('.ai-session-usage').innerText()).includes('tokens'))
  await close(); await open(); assert.ok((await page.locator('.ai-conversation').innerText()).includes('历史热量317'))
  await page.locator('#ai-clear-chat').click(); assert.equal(await page.locator('.ai-message').count(),0); assert.equal((await records('foodLogs')).length,2)
  for (const status of [401,429,500]) { httpStatus=status; await send(`HTTP ${status}`); assert.equal((await page.locator('.ai-conversation').innerText()).includes('raw secret'),false) }
  httpStatus=200; networkFail=true; await send('网络错误'); assert.ok((await page.locator('.ai-conversation').innerText()).includes('CORS')); networkFail=false
  await page.locator('#ai-clear-chat').click(); const sentCount=requests.length
  await send('synthetic-private-key-A'); await send('synthetic-github-token'); assert.equal(requests.length,sentCount)
  await page.locator('#ai-clear-chat').click(); hold=true; await page.locator('#ai-message-input').fill('停止请求'); await page.locator('#ai-send').click()
  await page.waitForFunction(()=>document.querySelector('#ai-stop')?.hidden===false)
  while (!release) await page.waitForTimeout(20)
  await page.locator('#ai-stop').click(); release(); release=undefined
  await page.waitForFunction(()=>document.querySelector('#ai-stop')?.hidden===true); assert.ok((await page.locator('.ai-conversation').innerText()).includes('停止'))
  await page.locator('#ai-assistant-settings').click(); await page.locator('#ai-manage-profiles').click(); await page.locator('#ai-add-profile').click(); await page.locator('.ai-advanced summary').click(); await page.locator('[name=preset]').selectOption('custom')
  await page.locator('[name=name]').fill('服务 B'); await page.locator('[name=baseUrl]').fill('https://mock-fitlog-b.invalid/v1'); await page.locator('[name=apiKey]').fill('synthetic-private-key-B'); await page.locator('#ai-manual-model').click();await page.locator('[name=model]').fill('model-B'); await page.locator('#ai-save-only').click()
  await page.locator('#ai-manage-profiles').click(); await page.locator('[data-activate]').last().click(); await close(); await open(); await send('B配置普通聊天')
  assert.equal(requests.at(-1).url,'https://mock-fitlog-b.invalid/v1/chat/completions'); assert.equal(requests.at(-1).body.model,'model-B'); assert.equal(requests.at(-1).auth,'Bearer synthetic-private-key-B'); assert.equal(requests.at(-1).body.tools,undefined)
  assert.ok((await page.locator('.ai-capability-notice').innerText()).includes('当前只能普通聊天'))
  await layout('chat-only')
  await page.locator('#ai-assistant-settings').click(); await page.locator('#ai-manage-profiles').click(); await page.locator('[data-activate]').first().click(); await page.locator('#ai-settings-back').click(); await page.locator('#ai-permissions-open').click(); await page.locator('[data-scope=weight]').uncheck(); await close(); await open()
  await send('越权读取体重', [response('',[call('get_weight_trend',{start:'2026-09-29',end:'2026-10-02'},'denied')]),response('未授权体重数据。')])
  assert.equal(requests.at(-1).body.tools.some(tool=>tool.function.name==='get_weight_trend'),false)
  assert.equal(JSON.parse(requests.at(-1).body.messages.find(message=>message.role==='tool').content).error,'permission_denied')
  await close(); await page.reload({waitUntil:'networkidle'}); await open(); assert.equal(await page.locator('.ai-message').count(),0); await close()
  await context.setOffline(true); await nav('plan'); await page.locator('#plan-add-task:visible, #plan-empty-add:visible').click(); await page.locator('[name=title]').fill('离线任务仍可保存'); await page.locator('#task-form button[type=submit]').click(); await page.waitForFunction(()=>!document.querySelector('#task-form')); assert.equal((await records('tasks')).length,2)
  await context.setOffline(false)
  assert.deepEqual(errors,[]); assert.equal(consoleLines.some(line=>line.includes('synthetic-private-key')||line.includes('synthetic-github-token')),false)
  console.log(`${prod?'Production':'Local'} AI mock UI ${width}×${height}: PASS; 5 tabs, settings, snapshots, proposals, errors, Stop, profile switch, reload, offline core`)
  await context.close()
}
await browser.close()
