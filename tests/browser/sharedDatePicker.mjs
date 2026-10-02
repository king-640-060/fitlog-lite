// Run with FITLOG_PLAYWRIGHT_MODULE pointing to an external Playwright installation.
// All records are synthetic and created only in isolated browser contexts.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5173/'
const prod = base.includes('github.io')
const browser = await chromium.launch({ headless: true, executablePath: process.env.FITLOG_CHROME })
const dimensions = prod ? [[390, 844], [430, 932]] : [[320, 812], [375, 812], [390, 844], [430, 932]]
for (const [width, height] of dimensions) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, timezoneId: 'Asia/Shanghai' })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForSelector('#open-management')
  const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const nav = async tab => { await page.locator(`[data-tab=${tab}]`).click() }
  const picker = page.locator('.date-picker')
  const month = async wanted => {
    for (let i = 0; i < 48; i++) {
      const label = await picker.locator('.date-picker-month-head strong').innerText()
      if (label === wanted) return
      const [y,m] = label.match(/\d+/g).map(Number), [wy,wm] = wanted.match(/\d+/g).map(Number)
      await picker.locator(`[data-month="${y*12+m < wy*12+wm ? 1 : -1}"]`).click()
    }
    throw Error('month navigation failed')
  }
  const layout = async name => {
    await page.waitForTimeout(280)
    assert.equal(await page.locator('input[type=date]').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.equal(await page.locator('.modal-body').evaluate(e => e.scrollWidth <= e.clientWidth), true)
    const sizes = await picker.locator('.date-picker-day').evaluateAll(es => es.map(e => ({ w:e.getBoundingClientRect().width, h:e.getBoundingClientRect().height })))
    assert.equal(sizes.length, 42); assert.ok(sizes.every(s => s.w>=44 && s.h>=44), JSON.stringify(sizes[0]))
    assert.equal(await picker.locator('[tabindex="0"]').count(),1)
    const style = await picker.locator('.date-picker-day').first().evaluate(e => ({ border:getComputedStyle(e).borderWidth, outline:getComputedStyle(e).outlineWidth }))
    assert.equal(style.border,'1px')
    await page.screenshot({ path: `/tmp/shared-date-${prod?'prod':'local'}-${width}-${name}.png` })
  }
  const foodDate = () => page.locator('.food-content-body').getAttribute('data-food-date')
  await nav('food'); await page.waitForSelector('#food-date-picker-open')
  await page.locator('#food-date-picker-open').tap(); await layout('food')
  const captured = await foodDate()
  await month('2026年12月'); await picker.locator('[data-month="1"]').click(); assert.equal(await picker.locator('strong').innerText(),'2027年1月')
  await picker.locator('[data-month="-1"]').click(); assert.equal(await picker.locator('strong').innerText(),'2026年12月')
  await picker.locator('[data-date="2027-01-01"]').tap(); assert.equal(await picker.locator('strong').innerText(),'2027年1月')
  assert.equal(await foodDate(),captured)
  await picker.locator('[data-cancel]').click(); assert.equal(await foodDate(),captured)
  await page.locator('#food-date-picker-open').click(); await month('2026年12月'); await picker.locator('[data-date="2026-12-31"]').click()
  await picker.locator('[tabindex="0"]').press('ArrowRight'); assert.equal(await picker.locator('[tabindex="0"]').getAttribute('data-date'),'2027-01-01')
  assert.equal(await picker.locator('[aria-selected="true"]').getAttribute('data-date'),'2026-12-31')
  await picker.locator('[tabindex="0"]').press('Enter'); await picker.locator('[data-done]').click()
  await page.waitForFunction(() => document.querySelector('.food-content-body')?.dataset.foodDate === '2027-01-01')
  assert.equal(await page.locator('.food-date-item[aria-current="date"]').getAttribute('data-food-date'),'2027-01-01')
  await page.locator('#food-return-today').click(); await page.waitForFunction(day => document.querySelector('.food-content-body')?.dataset.foodDate===day,day)
  await nav('plan'); await page.locator('#plan-add-task').click(); await page.waitForSelector('#task-form')
  // Hold a real IndexedDB write lock to reproduce slow asynchronous tag creation.
  await page.evaluate(async () => {
    const database = await new Promise(resolve => { const request=indexedDB.open('fitlog-lite-db');request.onsuccess=()=>resolve(request.result) })
    const transaction=database.transaction('taskTags','readwrite'), store=transaction.objectStore('taskTags')
    window.taskTagLockHeld=true
    const keepAlive=()=>{const request=store.count();request.onsuccess=()=>{if(window.taskTagLockHeld)keepAlive()}}
    keepAlive();transaction.oncomplete=()=>database.close()
  })
  await page.locator('[name=title]').fill('未保存的标题 #旅行'); await page.locator('#task-create-tag').click()
  await page.locator('[name=note]').fill('未保存的备注')
  await page.evaluate(()=>{window.taskTagLockHeld=false})
  await page.waitForFunction(()=>document.querySelector('#task-selected-tags')?.textContent.includes('#旅行'))
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('name')),'note', 'async tag completion must not steal note focus')
  assert.equal(await page.locator('[name=title]').inputValue(),'未保存的标题')
  await page.locator('[name=startTime]').fill('09:30'); await page.locator('[name=endTime]').fill('10:30')
  const formIdentity = await page.locator('#task-form').evaluate(e => { e.dataset.identity='same-form';return e.dataset.identity })
  await page.locator('#task-date-picker-open').click(); assert.equal(await page.locator('dialog').count(),1); await layout('task')
  await month('2027年1月'); await picker.locator('[data-date="2027-01-02"]').click(); await picker.locator('[data-cancel]').click()
  assert.equal(await page.locator('[name=date]').inputValue(),day)
  await page.locator('#task-date-picker-open').click(); await month('2026年12月'); await picker.locator('[data-month="1"]').click(); await picker.locator('[data-date="2027-01-02"]').click(); await picker.locator('[data-done]').click()
  assert.equal(await page.locator('#task-form').getAttribute('data-identity'),formIdentity)
  assert.equal(await page.locator('[name=title]').inputValue(),'未保存的标题')
  assert.equal(await page.locator('[name=note]').inputValue(),'未保存的备注')
  assert.equal(await page.locator('[name=startTime]').inputValue(),'09:30'); assert.equal(await page.locator('[name=endTime]').inputValue(),'10:30')
  assert.ok((await page.locator('#task-selected-tags').innerText()).includes('#旅行'))
  await page.locator('#task-form [type=submit]').click(); await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  const records = async store => page.evaluate(async store => { const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)}); const rows=await new Promise(r=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>r(q.result)});d.close();return rows },store)
  const saved = (await records('tasks'))[0]; assert.equal(saved.date,'2027-01-02');assert.equal(saved.startTime,'09:30');assert.equal(saved.note,'未保存的备注');assert.equal(saved.tagIds.length,1)
  await page.locator('#plan-add-task').click();await page.locator('[name=title]').fill('收件箱测试')
  await page.locator('[data-task-date=tomorrow]').click();const tomorrow=await page.locator('[name=date]').inputValue();assert.ok(tomorrow>day)
  await page.locator('[data-task-date=today]').click();assert.equal(await page.locator('[name=date]').inputValue(),day)
  await page.locator('[data-task-date=none]').click();assert.equal(await page.locator('[name=date]').inputValue(),'');assert.equal(await page.locator('#task-date-picker-open').innerText(),'选择日期')
  await page.locator('#task-form [type=submit]').click(); await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  assert.equal((await records('tasks')).find(r=>r.title==='收件箱测试').date,undefined)
  await page.locator('[data-plan-view=inbox]').click();await page.waitForFunction(()=>document.querySelector('#view')?.textContent.includes('收件箱测试'));assert.ok((await page.locator('#view').innerText()).includes('收件箱测试'))
  await nav('workout');await page.locator('#workout-date-picker-open').click();await layout('workout')
  await month('2026年12月');await picker.locator('[data-month="1"]').click(); await picker.locator('[data-date="2027-01-03"]').click();await picker.locator('[data-done]').click()
  await page.waitForFunction(() => document.querySelector('#workout-date-picker-open')?.textContent.includes('1月3日'))
  await page.locator('#start-workout').click();await page.locator('#blank-workout').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'))
  assert.equal((await records('workouts')).at(-1).date,'2027-01-03')
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});await nav('food');await page.locator('#food-date-picker-open').click()
  assert.equal(await picker.locator('.date-picker-day span').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({mode:prod?'production':'local',width,height,foodDraftCancelCommit:true,taskPreserved:true,inbox:true,workoutBusinessDate:true,crossYear:true,keyboard:true,reducedMotion:true,errors}))
  await context.close()
}
await browser.close()
