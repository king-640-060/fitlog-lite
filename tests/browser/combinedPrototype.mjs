// Runs immutable approved HTML in disposable contexts; never edits prototype bytes.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const dir=path.resolve(process.env.FITLOG_QA_ARTIFACT_ROOT||'../../artifacts/combined-2026-10-11','prototype-comparison')
await fs.mkdir(dir,{recursive:true})
const refs=['FitLog_Special_Diet_Interactive_Prototype_v0.1','FitLog_Template_Exercise_EmptyState_Prototype_v0.1','FitLog_Calendar_10_Categories_Interactive_Prototype_v0.1','FitLog_Nutrition_Cycle_Schedule_Interactive_Prototype_v0.1']
const hashes=['bb166e5f7c1aedfc5940015a1b7626cf13b0280f25d5dda164ebed9e19b46c26','31f9d9b0780db4b7ee75c91b9802305932560f0bd5f50de0706c83a82428aa9b','1ad3131b6dca4f863005c90b47491fc5d67b5773e8cc21bead23f59911134387','0d42580f17d9d5a5d6e66c1947a30ca0ebc26424e682d7242fab5f45b5e6d5ed']
const base=process.env.FITLOG_COMBINED_PROTOTYPE_URL||'http://127.0.0.1:5193/prototypes/'
const cases=[[390,100,'light'],[390,100,'dark'],[320,200,'dark'],[430,140,'light']]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME}),receipt=[]
try{for(const[width,scale,theme]of cases){
 const context=await browser.newContext({viewport:{width,height:844},colorScheme:theme,timezoneId:'Asia/Shanghai',isMobile:true,hasTouch:true})
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 const prefix=`${width}-${scale}-${theme}`
 const capture=async(name,selector)=>{
  if(scale!==100)await page.evaluate(scale=>{const all=[document.documentElement,...document.querySelectorAll('body,body *')];const original=window.__comparisonOriginalFonts??=new WeakMap();for(const e of all){if(!original.has(e))original.set(e,e.style.fontSize);e.style.fontSize=original.get(e)}const sizes=all.map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of sizes)e.style.fontSize=size*scale/100+'px'},scale)
  const l=page.locator(selector);await l.screenshot({path:path.join(dir,`${prefix}-prototype-${name}.png`)})
  const geometry=await l.evaluate(root=>{const m=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return{width:b.width,height:b.height,padding:s.padding,gap:s.gap,font:s.font,color:s.color,background:s.backgroundColor,border:s.border,radius:s.borderRadius,columns:s.gridTemplateColumns}};return{box:m(root),children:[...root.children].map(m),html:root.outerHTML}})
  receipt.push({width,scale,theme,name,geometry})
 }
 const load=async i=>{
  assert.equal(createHash('sha256').update(await fs.readFile(`design/reference/2026-10-11-combined/prototypes/${refs[i]}.html`)).digest('hex'),hashes[i])
  await page.goto(base+refs[i]+'.html')
  if(i===0&&theme==='dark')await page.locator('#themeMode').click()
  if(i===1&&theme==='light')await page.evaluate(()=>document.querySelector('#device').classList.add('light'))
  if(i>=2&&theme==='light')await page.locator('#theme').click()
  // Fixed-pixel demo fonts get equivalent temporary magnification for comparison.
  // Files remain byte-identical; normal-font cases retain original CSS.

 }
 await load(0);await page.locator('#specialEntry').scrollIntoViewIfNeeded();assert.match(await page.locator('#specialStatus').innerText(),/添加标记/);await capture('special-entry-empty','#specialEntry');await page.locator('#specialEntry').click();await capture('special-form','.sheet');await page.locator('#closeSheet').click();await page.locator('#seedMode').click();await page.locator('#specialEntry').click();await capture('special-list','.sheet');await page.locator('#closeSheet').click();await capture('special-entry','#specialEntry')
 await load(1);await capture('picker-empty','#results');await page.evaluate(()=>document.querySelector('[data-data=sample]').click());await page.locator('#search').fill('绝对不存在');await capture('picker-no-hit','#results');await page.locator('#search').fill('');assert.ok(await page.locator('[data-item]').count()>0)
 await load(2);await capture('calendar','.calendar');await page.locator('[data-date="2026-10-11"]').click();assert.equal(await page.locator('.fact').count(),10);await capture('day-detail','.sheet');await page.locator('#quick-acc > summary').click();assert.equal(await page.locator('[data-add]').count(),10);await capture('quick-record','.sheet');await page.locator('#quick-acc > summary').click();await page.locator('#manage-acc > summary').click();assert.equal(await page.locator('[data-remove]').count(),10);await capture('delete-options','.sheet');await page.locator('#select-all').click();await page.locator('#delete-selected').click();await capture('delete-confirm','.sheet');await page.locator('#cancel-delete').click()
 await load(3);await capture('cycle','.app');await capture('cycle-information','.card:first-of-type');await capture('cycle-week','.week-card.open');await page.locator('[data-day="2026-10-12"]').click();await page.locator('[data-day="2026-10-13"]').click();await page.locator('#apply').click();if(await page.locator('.cover.show').count())await page.locator('#dialog-yes').click();await capture('cycle-assignment','.card:has(#apply)');assert.ok(await page.locator('.schedule-row').count()>=2);await capture('cycle-preview','#schedule-list');await page.locator('[data-repeat="0"]').click();await page.waitForSelector('.cover.show');await capture('cycle-copy-confirm','.dialog');await page.locator('#dialog-no').click()
 assert.deepEqual(errors,[]);await context.close();console.log(JSON.stringify({width,scale,theme,status:'PASS'}))
}}finally{await browser.close()}
await fs.writeFile(path.join(dir,'prototype-receipt.json'),JSON.stringify(receipt,null,2))
