// Compare actual production asset bytes with the local verified Pages build.
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const html=fs.readFileSync('dist/index.html','utf8'), expected={}
for(const match of html.matchAll(/(?:src|href)="[^"]*(assets\/[^"/]+\.(?:js|css))"/g)){const bytes=fs.readFileSync(`dist/${match[1]}`);expected[match[1].split('/').at(-1)]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}}
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'})
try{
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(process.env.FITLOG_QA_URL||'https://king-640-060.github.io/fitlog-lite/',{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
 const assets=await page.evaluate(async()=>Promise.all([...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(async e=>{const url=e.src||e.href,b=await(await fetch(url,{cache:'no-store'})).arrayBuffer();return {file:new URL(url).pathname.split('/').at(-1),bytes:b.byteLength,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('')}})))
 assert.equal(assets.length,Object.keys(expected).length)
 for(const asset of assets){assert.ok(expected[asset.file]);assert.deepEqual({bytes:asset.bytes,sha256:asset.sha256},expected[asset.file])}
 for(const tab of ['today','plan','food','workout','progress']){await page.locator(`[data-tab=${tab}]`).click();assert.equal(await page.locator('#open-ai-assistant').count(),1);assert.equal(await page.locator('#open-management').count(),1)}
 await page.locator('#open-management').click();await page.locator('#more-ai-settings').click();await page.waitForSelector('.ai-profile-form');await page.locator('dialog [data-close]').click()
 await page.locator('#open-management').click();await page.locator('#more-github-sync').click();await page.waitForSelector('.github-sync');await page.locator('dialog [data-close]').click()
 assert.deepEqual(errors,[]);console.log(JSON.stringify({assets,mainViews:5,aiSettings:true,githubSyncEntry:true,errors}))
}finally{await context.close();await browser.close()}
