// Targeted SVG/macros gate. Fresh synthetic data, no real records or keys.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5175/fitlog-lite/',prod=base.includes('github.io')
const widths=prod?[390,430]:[320,375,390,430]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME})
const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/legacyV7Data.json',import.meta.url)))
const scenarios=[['unset',1259,undefined],['0',0,2000],['1',20,2000],['65',1259,1937],['99',1980,2000],['100',2000,2000],['above',2259,2000],['above-capped',4500,2000],['partial',1259,1937],['zero-goal',0,0],['above-zero',20,0]]
const receipts=[]
try{for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:932},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'})
 try{
  const page=await context.newPage(),errors=[],states=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
  const date=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  const put=async data=>page.evaluate(async data=>{const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)});await new Promise((resolve,reject)=>{const t=d.transaction(['foodLogs','nutritionTargets'],'readwrite');for(const [name,rows] of Object.entries(data)){const s=t.objectStore(name);s.clear();for(const r of rows)s.put(r)}t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()},data)
  for(const scale of [1,1.2,1.4])for(const [name,actual,goal] of scenarios){
   const ratio=goal?actual/goal:0
   const targets=goal===undefined?{}:goal===0?{protein:0,carbs:0,fat:0}:name==='partial'?{protein:150,carbs:undefined,fat:60}:{protein:150,carbs:300,fat:60}
   const macros=goal===0&&actual>0?{totalProtein:2,totalCarbs:5,totalFat:1}:name==='unset'?{totalProtein:64.5,totalCarbs:128.4,totalFat:30}:{totalProtein:150*ratio,totalCarbs:300*ratio,totalFat:60*ratio}
   await put({foodLogs:[{...fixture.foodLogs[0],date,totalCalories:actual,...macros}],nutritionTargets:goal===undefined?[]:[{...fixture.nutritionTargets[0],date,calories:goal,...targets}]})
   await page.evaluate(scale=>document.documentElement.style.fontSize=`${16*scale}px`,scale)
   let todaySvg,todayTiles,todayStyles
   for(const surface of ['today','food']){
    await page.locator(`[data-tab=${surface}]`).click()
    const root=surface==='today'?'.nutrition-today-card':'.food-nutrition-hero'
    await page.waitForFunction(({root,actual})=>Number(document.querySelector(root+' .calorie-gauge')?.dataset.actual)===actual,{root,actual})
    const checks=await page.locator(root).evaluate(root=>{
     const gauge=root.querySelector('.calorie-budget'),track=gauge.querySelector('.budget-track'),main=track.querySelector('i'),outer=gauge.querySelector('.budget-over-track'),bad=[]
     for(const e of root.querySelectorAll('*')){if(!e.getClientRects().length||e instanceof SVGElement||e.classList.contains('sr-only'))continue;const r=e.getBoundingClientRect(),c=getComputedStyle(e);if(r.left<-.5||r.right>innerWidth+.5)bad.push('bounds '+e.className);if(e.scrollWidth>e.clientWidth+1)bad.push('clipped '+e.className);if(c.animationName!=='none')bad.push('animation '+e.className)}
     const styles=[...root.querySelectorAll('.nutrition-metric')].map(e=>{const c=getComputedStyle(e);return{radius:c.borderRadius,padding:c.padding,color:c.color,background:c.backgroundColor,label:getComputedStyle(e.querySelector('.macro-label')).fontSize,value:getComputedStyle(e.querySelector('.macro-value')).fontSize}})
     return{bad,bar:gauge.querySelector('.budget-bar-row').outerHTML,main:parseFloat(main.style.width),outer:outer?parseFloat(outer.querySelector('i').style.width):0,excessWidth:outer?outer.getBoundingClientRect().width/gauge.querySelector('.budget-bar-row').getBoundingClientRect().width:0,width:track.getBoundingClientRect().width,budgetWidth:gauge.getBoundingClientRect().width,height:track.getBoundingClientRect().height,actual:gauge.querySelector('.budget-number strong').textContent,aria:gauge.getAttribute('aria-label'),meta:gauge.querySelector('.budget-meta').textContent,styles,tiles:[...root.querySelectorAll('.nutrition-metric')].map(e=>e.outerHTML),svg:root.querySelectorAll('.calorie-budget svg,.nutrition-metric svg').length,overflow:document.documentElement.scrollWidth>innerWidth+1}
    })
    if(checks.bad.length)await page.screenshot({path:`/tmp/nutrition-gauge-failure-${width}-${scale}-${surface}-${name}.png`})
    assert.deepEqual(checks.bad,[],`${width}/${scale}/${surface}/${name}`);assert.equal(checks.overflow,false);assert.equal(checks.svg,0);assert.equal(checks.tiles.length,3)
    assert.equal(await page.locator(root+' .nutrition-metric[role=group][aria-label]').count(),3)
    assert.equal(checks.actual,String(Math.round(actual)));assert.ok(checks.aria.includes(`${Math.round(actual)} kcal`));assert.equal(checks.height,10);assert.ok(checks.width>=checks.budgetWidth*.8)
    const fraction=goal===undefined?0:goal<=0?(actual>0?1:0):Math.min(actual/goal,1)
    assert.ok(Math.abs(checks.main-fraction*100)<.001,'bounded budget progress')
    if(goal===undefined){assert.ok(checks.aria.includes('尚未设置目标'));assert.ok(!checks.meta.includes('%'))}
    const excess=goal===undefined||actual<=goal?0:goal>0?Math.min((actual-goal)/goal,1):1
    assert.ok(Math.abs(checks.outer-excess*100)<.001)
    if(actual>goal){assert.ok(checks.aria.includes('高于目标'));assert.ok(Math.abs(checks.excessWidth-.13)<.005,'separate restrained excess track')}
    if(surface==='today'){todaySvg=checks.bar;todayTiles=checks.tiles;todayStyles=checks.styles}
    else{assert.equal(checks.bar,todaySvg);assert.deepEqual(checks.tiles,todayTiles);assert.deepEqual(checks.styles,todayStyles)}
    await page.locator(root).screenshot({path:`/tmp/nutrition-gauge-${prod?'prod':'local'}-${width}-${scale}-${surface}-${name}.png`})
    states.push({scale,surface,name})
   }
  }
  // A normal view rerender must not start an SVG/count animation.
  await page.locator('[data-tab=today]').click();assert.equal(await page.locator('.calorie-gauge').evaluate(e=>e.getAnimations({subtree:true}).length),0)
  assert.deepEqual(errors,[]);receipts.push({width,states:states.length,fonts:[100,120,140],horizontalBudget:true,mainHeight:10,excessTrackRatio:.13,macroDonuts:0,sharedSvgAndTiles:true,noOverflowOrClipping:true,noReplay:true,errors})
  console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}
await fs.writeFile(`/tmp/nutrition-gauge-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))
}finally{await browser.close()}
