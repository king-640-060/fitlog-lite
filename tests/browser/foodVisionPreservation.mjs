// Synthetic persistent profile only: compare all frozen V7 records across a deployment.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const phase = process.argv[2]
assert.ok(['before', 'after'].includes(phase))
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/legacyV7Data.json', import.meta.url), 'utf8'))
const profile = '/tmp/fitlog-vision-release-profile'
const context = await chromium.launchPersistentContext(profile, { headless: true, executablePath: process.env.FITLOG_CHROME, viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' })
try {
  const page = await context.newPage()
  await page.goto('https://king-640-060.github.io/fitlog-lite/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#open-management')
  if (phase === 'after') {
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration?.update() })
    const expectedScript = process.env.FITLOG_STABILIZATION_QA === '1' ? fs.readFileSync('dist/index.html', 'utf8').match(/assets\/([^"/]+\.js)/)[1] : undefined
    for (let attempt = 0; attempt < 10; attempt++) {
      const actualScript = await page.locator('script[type=module][src]').getAttribute('src')
      if (!expectedScript || actualScript?.endsWith(expectedScript)) break
      await page.waitForTimeout(1500); await page.reload({ waitUntil: 'networkidle' })
    }
    if (expectedScript) assert.ok((await page.locator('script[type=module][src]').getAttribute('src')).endsWith(expectedScript), 'the exact new application must run under the old Service Worker profile')
    await page.locator('[data-tab=food]').click(); await page.locator('#food-library').click()
    await page.waitForSelector('dialog .library-list')
    assert.equal(await page.locator('#food-vision-import').count(), 1)
    if (expectedScript) assert.equal(await page.locator('dialog').getAttribute('data-sheet-variant'), 'large')
    await page.locator('#food-vision-import').click(); await page.waitForSelector('#vision-camera-file', { state: 'attached' })
    assert.equal(await page.locator('#vision-album-file').getAttribute('capture'), null)
    await page.locator('dialog [data-close]').click()
  }
  const records = await page.evaluate(async ({ fixture, phase }) => {
    const database = await new Promise((resolve, reject) => { const q = indexedDB.open('fitlog-lite-db'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error) })
    if (database.version !== 90 || database.objectStoreNames.length !== 17) throw Error('V9 identity/stores changed')
    const stores = Object.keys(fixture)
    if (phase === 'before') {
      // Explicit test fixture setup, only in the dedicated synthetic browser profile above.
      await new Promise((resolve, reject) => {
        const tx = database.transaction(stores, 'readwrite'); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error)
        for (const store of stores) { tx.objectStore(store).clear(); for (const row of fixture[store]) tx.objectStore(store).put(row) }
      })
    }
    const result = {}
    for (const store of stores) result[store] = await new Promise((resolve, reject) => { const q = database.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error) })
    database.close(); return result
  }, { fixture, phase })
  const canonical = data => JSON.stringify(Object.fromEntries(Object.entries(data).map(([store, rows]) => [store, rows.sort((a, b) => a.id.localeCompare(b.id))])))
  assert.equal(canonical(records), canonical(fixture))
  console.log(JSON.stringify({ phase, stableDb: 'fitlog-lite-db', dexie: 8, stores: 17, legacyStoresPreserved: 14, records: Object.values(records).reduce((n, rows) => n + rows.length, 0), exactPreservation: true }))
} finally { await context.close() }
