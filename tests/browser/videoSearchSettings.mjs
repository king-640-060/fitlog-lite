// Focused settings regression: isolated profiles/credentials, mocked provider requests only.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5182/'
const prod = base.includes('github.io'), receipts = []
const browser = await chromium.launch({ headless: true, executablePath: process.env.FITLOG_CHROME })
try {
  for (const width of prod ? [390, 430] : [320, 375, 390, 430]) for (const scale of [100, 120, 140]) {
    const context = await browser.newContext({ viewport: { width, height: width === 430 ? 932 : 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', timezoneId: 'Asia/Shanghai' })
    try {
      await context.addInitScript(() => {
        const profile = { id: 'video-settings-test', name: '智谱 · glm-4.5', preset: 'zhipu', protocol: 'openai-chat-completions', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3-fast', visionModel: 'glm-4.5v', toolCapability: 'supported', visionCapability: 'supported', createdAt: '', updatedAt: '' }
        localStorage.setItem('fitlog-ai-profiles-v1', JSON.stringify([profile])); localStorage.setItem('fitlog-ai-active-profile-v1', profile.id)
        localStorage.setItem('fitlog-ai-key-v1:' + profile.id, 'synthetic-ai-key'); localStorage.setItem('fitlog-ai-privacy-ack-v1', '1')
        localStorage.setItem('fitlog-video-search-config-v2', JSON.stringify({ version: 2, enabled: { bilibili: true, youtube: false }, policy: 'auto', bilibiliStatus: 'unconfigured', youtubeStatus: 'unconfigured', bilibiliCredentialSource: 'reuse-profile' }))
      })
      const page = await context.newPage(), errors = [], states = [], calls = { bilibili: 0, youtube: 0 }, auth = [], toggleMetrics = []
      let emptyBilibili = false, youtubeFail = false, holdBilibili = false, releaseBilibili
      page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message))
      await page.route('https://open.bigmodel.cn/**', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
        calls.bilibili++; auth.push(route.request().headers().authorization)
        assert.equal(route.request().postDataJSON().model, 'web-search-pro')
        if (holdBilibili) await new Promise(resolve => { releaseBilibili = resolve })
        try { await route.fulfill({ json: emptyBilibili ? {choices:[{message:{content:'没有视频'}}]} : {choices:[{message:{content:'[面拉教学](https://m.bilibili.com/video/BV1xx411c7mD/)',tool_calls:[{search_result:[{title:'面拉教学',link:'https://www.bilibili.com/video/BV1xx411c7mD'}]}]}}]} }) } catch {}
      })
      await page.route('https://www.googleapis.com/youtube/v3/search?**', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
        calls.youtube++; assert.equal(route.request().headers()['x-goog-api-key'], 'synthetic-youtube-key')
        await route.fulfill(youtubeFail ? { status: 403, body: 'untrusted provider secret details' } : { json: { items: [] } })
      })
      await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForSelector('#open-management')
      await page.evaluate(scale => { document.documentElement.style.fontSize = 16 * scale / 100 + 'px' }, scale)
      await page.addStyleTag({ content: ':root{--safe-area-top:47px;--safe-area-bottom:34px}' })
      const open = async () => { await page.locator('#open-management').click(); await page.locator('#more-ai-settings').click(); await page.locator('#ai-video-search').click() }
      const save = () => page.locator('#video-save-only').click()
      const test = async () => { await page.locator('.video-settings-form [type=submit]').click(); await page.waitForFunction(() => !document.querySelector('.video-settings-form [type=submit]')?.disabled) }
      const config = () => page.evaluate(() => JSON.parse(localStorage.getItem('fitlog-video-search-config-v2')))
      let editorScroll = 0
      const edit = async provider => {
        editorScroll = await page.locator('.modal-body').evaluate(e => e.scrollTop)
        await page.locator(`[data-provider-config=${provider}]`).click()
        assert.equal(await page.locator('dialog[open]').count(), 1)
        assert.equal(await page.locator('[data-video-home]').isVisible(), false)
      }
      const saveEditor = async provider => {
        await page.locator(`[data-provider-save=${provider}]`).click()
        assert.equal(await page.locator('[data-video-home]').isVisible(), true)
        assert.ok(Math.abs(await page.locator('.modal-body').evaluate(e => e.scrollTop) - editorScroll) <= 1, 'parent scroll restored')
      }
      const audit = async name => {
        await page.waitForTimeout(100)
        const failures = await page.evaluate(() => {
          const root = document.querySelector('dialog[open]'), outer = root.getBoundingClientRect(), failures = []
          if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('root overflow')
          for (const row of root.querySelectorAll('.video-source-row')) {
            const copy = row.querySelector('.video-source-copy').getBoundingClientRect(), toggle = row.querySelector('.video-switch').getBoundingClientRect()
            if (toggle.left < copy.right || Math.abs((toggle.top + toggle.height / 2) - (copy.top + copy.height / 2)) > 1) failures.push('switch alignment')
          }
          for (const e of root.querySelectorAll('*')) {
            const r = e.getBoundingClientRect(), css = getComputedStyle(e)
            if (!r.width || !r.height || e.closest('[hidden]') || e instanceof SVGElement || css.opacity === '0' || e.classList.contains('sr-only')) continue
            if (r.left < outer.left - 1 || r.right > outer.right + 1) failures.push('bounds ' + e.className)
            if (e.matches('button,a,label') && r.height < 43.5) failures.push('target ' + (e.id || e.className))
            if (e.matches('button') && e.scrollWidth > e.clientWidth + 1) failures.push('clipped ' + (e.id || e.className))
            if (e.matches('input:not([type=checkbox]),select') && parseFloat(css.fontSize) < 16) failures.push('font ' + e.name)
          }
          return [...new Set(failures)]
        })
        assert.deepEqual(failures, [], `${width}/${scale}/${name}`)
        const text = await page.locator('dialog[open]').innerText()
        assert.ok(!text.includes('synthetic-') && !text.includes('untrusted provider'))
        await page.locator('dialog[open] .modal-body').evaluate(element => { element.scrollTop = 0 })
        await page.screenshot({ path: `/tmp/video-settings-${prod ? 'prod' : 'local'}-${width}-${scale}-${name}.png` })
        await page.locator('dialog[open] .modal-body').evaluate(element => { element.scrollTop = element.scrollHeight })
        await page.screenshot({ path: `/tmp/video-settings-${prod ? 'prod' : 'local'}-${width}-${scale}-${name}-bottom.png` }); states.push(name)
      }
      await open()
      assert.equal(await page.locator('[data-provider-config=bilibili] .video-provider-model').innerText(), '智谱 · glm-5.3-fast')
      assert.ok(!(await page.locator('dialog[open]').innerText()).includes('glm-4.5'))
      assert.equal(await page.locator('[name=videoKey]').isVisible(), false)
      assert.equal(await page.locator('[name=bilibiliKey]').isVisible(), false)
      assert.equal(await page.locator('[data-policy-picker]').isVisible(), false)
      assert.equal(await page.locator('[data-policy-section]').isVisible(), true)
      assert.equal(await page.locator('[data-provider-status=youtube] strong').innerText(), '未启用')
      await audit('reuse-unacknowledged')
      await page.locator('dialog[open]').evaluate(e => Promise.all(e.getAnimations().map(a => a.finished)))
      // Real native input events, retained DOM, and an actually scrolled shared body.
      const metrics = await page.evaluate(async () => {
        const dialog = document.querySelector('dialog[open]'), body = dialog.querySelector('.modal-body'), form = dialog.querySelector('form'), home = form.querySelector('[data-video-home]')
        const extra = document.createElement('div'); extra.style.height = '300px'; extra.textContent = '合成滚动检查'; body.append(extra)
        body.scrollTop = 60
        const top = dialog.getBoundingClientRect().top, scroll = body.scrollTop, height = home.getBoundingClientRect().height, rows = [...form.querySelectorAll('[data-provider-config]')], samples = []
        for (let round = 0; round < 4; round++) for (const name of ['enableBilibili', 'enableYoutube']) {
          form.querySelector(`[name=${name}]`).click()
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          samples.push({ name, topDelta: Math.abs(dialog.getBoundingClientRect().top - top), scrollDelta: Math.abs(body.scrollTop - scroll), homeHeightDelta: Math.abs(home.getBoundingClientRect().height - height) })
        }
        const retained = document.querySelector('dialog[open]') === dialog && dialog.querySelector('form') === form && rows.every(row => row.isConnected)
        extra.remove(); body.scrollTop = 0
        return { samples, retained, initialScroll: scroll }
      })
      assert.ok(metrics.retained); assert.ok(metrics.initialScroll > 0)
      for (const sample of metrics.samples) { assert.ok(sample.topDelta <= 4, JSON.stringify(sample)); assert.ok(sample.scrollDelta <= 1, JSON.stringify(sample)); assert.ok(sample.homeHeightDelta <= 1, JSON.stringify(sample)) }
      toggleMetrics.push(...metrics.samples)
      await test(); assert.equal(calls.bilibili, 0); assert.match(await page.locator('.video-config-status').innerText(), /隐私/)
      await page.locator('[name=videoConsent]').check(); await save()
      assert.equal(await page.locator('[name=videoConsent]').count(), 0)
      assert.match(await page.locator('.video-privacy').innerText(), /已确认视频搜索隐私说明/)
      assert.equal((await config()).policy, 'bilibili'); await audit('reuse-acknowledged')
      await edit('bilibili'); assert.equal(await page.locator('[data-provider-section=bilibili]').isVisible(), true)
      assert.equal(await page.locator('.modal-body').evaluate(e => e.scrollTop), 0)
      assert.equal(await page.locator('.video-settings-model').innerText(), '智谱 · glm-5.3-fast'); await audit('bilibili-editor')
      await page.locator('[data-bil-source=separate]').click()
      assert.equal(await page.locator('[name=bilibiliKey]').isVisible(), true)
      assert.equal(await page.locator('[data-reuse-panel]').isVisible(), false); await audit('standalone-expanded')
      await page.locator('[name=bilibiliKey]').fill('x'.repeat(4097)); const beforeInvalid=calls.bilibili; await page.locator('[data-provider-test=bilibili]').click(); assert.match(await page.locator('[data-provider-section=bilibili] .video-editor-status').innerText(),/格式/); assert.equal(calls.bilibili,beforeInvalid); await page.locator('[name=bilibiliKey]').fill('synthetic-domestic-key'); await saveEditor('bilibili')
      assert.equal((await config()).bilibiliCredentialSource, 'separate'); assert.equal(await page.locator('[name=bilibiliKey]').inputValue(), '')
      await test(); assert.equal(auth.at(-1), 'Bearer synthetic-domestic-key'); assert.equal(calls.youtube, 0)
      await edit('bilibili'); await page.locator('[data-bil-source=reuse-profile]').click(); await saveEditor('bilibili')
      assert.equal((await config()).bilibiliCredentialSource, 'reuse-profile')
      assert.equal(await page.evaluate(() => localStorage.getItem('fitlog-video-search-bilibili-key-v2')), 'synthetic-domestic-key')
      await test(); assert.equal(auth.at(-1), 'Bearer synthetic-ai-key'); assert.equal(calls.youtube, 0)
      assert.equal(await page.locator('[data-provider-status=bilibili] strong').innerText(), '已连接'); await audit('bilibili-connected')
      await edit('bilibili'); const beforeTest=calls.bilibili; await page.locator('[data-provider-test=bilibili]').click(); await page.waitForFunction(()=>!document.querySelector('[data-provider-test=bilibili]').disabled); assert.equal(calls.bilibili,beforeTest+1); assert.match(await page.locator('[data-provider-section=bilibili] .video-editor-status').innerText(),/连接成功.*候选链接.*有效 B站视频 1/); assert.equal(await page.locator('[data-provider-section=bilibili] .video-editor-status').getAttribute('data-state'),'success'); await audit('diagnostics'); await page.locator('[data-provider-section=bilibili] [data-provider-back]').click();
      emptyBilibili=true; const beforeEmpty=calls.bilibili; await test(); assert.equal(calls.bilibili,beforeEmpty+3); assert.match(await page.locator('.video-config-status').innerText(),/搜索服务已连接，但没有解析到可用 B站视频/); await audit('empty-diagnostics'); emptyBilibili=false; await test()
      await page.locator('[name=enableYoutube]').check(); assert.equal(await page.locator('[data-policy-picker]').isVisible(), true)
      assert.equal(await page.locator('[name=videoKey]').isVisible(), false)
      await edit('youtube'); await audit('youtube-editor')
      await page.locator('[name=videoKey]').fill('bad'); await page.locator('[data-provider-save=youtube]').click()
      assert.equal(await page.locator('[data-video-home]').isVisible(), false)
      assert.match(await page.locator('[data-provider-section=youtube] .video-editor-status').innerText(), /格式/)
      await page.locator('[name=videoKey]').fill('synthetic-youtube-key'); await saveEditor('youtube'); assert.equal((await config()).policy, 'auto')
      assert.equal(await page.locator('[data-provider-section=youtube] .video-editor-status').textContent(), '')
      await page.locator('[name=policy]').selectOption('all'); await save(); assert.equal((await config()).policy, 'all'); await audit('both-enabled')
      youtubeFail = true; await test()
      assert.equal(await page.locator('[data-provider-status=bilibili] strong').innerText(), '已连接')
      assert.equal(await page.locator('[data-provider-status=youtube] strong').innerText(), '测试失败')
      assert.equal(await page.locator('.video-config-status').innerText(), '部分来源可用'); await audit('partial-success')
      await page.locator('[name=enableBilibili]').uncheck(); await save(); assert.equal((await config()).policy, 'youtube')
      assert.equal(await page.locator('[name=bilibiliKey]').isVisible(), false); assert.equal(await page.locator('[data-policy-picker]').isVisible(), false)
      youtubeFail = false; const beforeB = calls.bilibili; await test(); assert.equal(calls.bilibili, beforeB); await audit('youtube-only')
      await page.locator('[name=enableYoutube]').uncheck(); await save()
      assert.deepEqual((await config()).enabled, { bilibili: false, youtube: false }); assert.equal((await config()).policy, 'auto')
      const beforeOff = { ...calls }; await test(); assert.deepEqual(calls, beforeOff)
      assert.match(await page.locator('.video-config-status').innerText(), /未启用视频来源/); await audit('both-off')
      await edit('youtube'); await page.keyboard.press('Escape')
      assert.equal(await page.locator('dialog[open]').count(), 1)
      assert.equal(await page.locator('[data-video-home]').isVisible(), true)
      await edit('youtube'); await saveEditor('youtube')
      assert.deepEqual((await config()).enabled, { bilibili: false, youtube: false }, 'credential editing never enables a source')
      await page.locator('[name=enableBilibili]').check(); await save()
      await page.locator('#video-settings-back').click(); await page.locator('[data-edit]').click()
      await page.locator('#ai-manual-model').click(); await page.locator('[name=model]').fill('glm-5.4'); await page.locator('.ai-advanced summary').click(); await page.locator('[name=name]').fill('我的AI')
      await page.locator('#ai-save-only').click(); await page.locator('#ai-video-search').click()
      assert.equal(await page.locator('[data-provider-config=bilibili] .video-provider-model').innerText(), '智谱 · glm-5.4'); await audit('updated-active-model')
      // Closing or returning during a pending test must not persist a stale failure/success.
      holdBilibili = true; releaseBilibili = undefined
      const beforeStatus = (await config()).bilibiliStatus
      await page.locator('.video-settings-form [type=submit]').click()
      while (!releaseBilibili) await page.waitForTimeout(20)
      await page.locator('dialog[open] [data-close]').click(); releaseBilibili(); holdBilibili = false
      await page.waitForTimeout(150); assert.equal((await config()).bilibiliStatus, beforeStatus)
      await open(); await page.locator('#video-settings-back').click(); await page.locator('[data-edit]').click()
      await page.locator('[name=preset]').selectOption('custom'); await page.locator('[name=baseUrl]').fill('https://mock-custom.invalid/v1')
      await page.locator('.ai-advanced summary').click(); await page.locator('#ai-save-only').click()
      await page.locator('#ai-video-search').click()
      assert.equal(await page.locator('[data-reuse-panel]').count(), 0)
      assert.equal(await page.locator('[name=bilibiliKey]').isVisible(), false)
      await edit('bilibili')
      assert.equal(await page.locator('[name=bilibiliKey]').isVisible(), true)
      assert.match(await page.locator('dialog[open]').innerText(), /当前 AI 配置无法直接复用/); await audit('incompatible-profile')
      assert.deepEqual(errors, [])
      receipts.push({ width, scale, states: states.length, calls, toggleMetrics, maxTopDelta: Math.max(...toggleMetrics.map(s => s.topDelta)), maxScrollDelta: Math.max(...toggleMetrics.map(s => s.scrollDelta)), retainedDialogAndForm: metrics.retained, staleNameIgnored: true, modelReopenUpdated: true, visionExcluded: true, standaloneKeyRetained: true, partialSuccessRetained: true, bothOffNoNetwork: true, abortedResultNotPersisted: true, physicalIPhone: 'Pending', realProvider: 'Not performed' })
      console.log(JSON.stringify(receipts.at(-1)))
    } finally { await context.close() }
  }
  await fs.writeFile(`/tmp/video-settings-${prod ? 'prod' : 'local'}-receipt.json`, JSON.stringify(receipts, null, 2))
} finally { await browser.close() }
