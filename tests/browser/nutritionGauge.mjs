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
     const gauge=root.querySelector('.calorie-gauge'),svg=gauge.querySelector('svg'),main=svg.querySelector('.ring-main'),track=svg.querySelector('.ring-track'),outer=svg.querySelector('.ring-outer'),r=svg.getBoundingClientRect(),center={x:r.left+r.width/2,y:r.top+r.height/2},inner=43*r.width/120
     const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}
     const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0
     const failures=[]
     for(const e of root.querySelectorAll('*')){
      if(!visible(e))continue
      const b=e.getBoundingClientRect(),c=getComputedStyle(e)
      if(b.left<0||b.right>innerWidth+1)failures.push('bounds '+e.className)
      if(e.scrollWidth>e.clientWidth+1 && !(e instanceof SVGElement))failures.push('clipped '+e.className)
      if(c.animationName!=='none'||c.transitionProperty==='stroke-dashoffset')failures.push('animation '+e.className)
     }
     for(const e of gauge.querySelectorAll('.calorie-gauge-center strong,.calorie-gauge-center small')){
      const b=e.getBoundingClientRect()
      for(const x of [b.left,b.right])for(const y of [b.top,b.bottom])if(Math.hypot(x-center.x,y-center.y)>inner+1)failures.push('text touches arc '+e.tagName+':'+Math.hypot(x-center.x,y-center.y)+'>'+inner)
     }
     const css=e=>{const c=getComputedStyle(e);return {stroke:c.stroke,strokeWidth:c.strokeWidth,linecap:c.strokeLinecap,opacity:c.opacity,animation:c.animationName,transition:c.transitionDuration}}
     const tileStyle=e=>{const c=getComputedStyle(e);return {radius:c.borderRadius,padding:c.padding,color:c.color,background:c.backgroundColor,label:getComputedStyle(e.querySelector('.macro-label')).fontSize,value:getComputedStyle(e.querySelector('.macro-value')).fontSize}}
     return {failures,svg:svg.innerHTML,span:svg.dataset.arcSpan,circles:svg.querySelectorAll('circle').length,paths:svg.querySelectorAll('path').length,mainLength:main.getTotalLength(),mainOffset:Number(main.getAttribute('stroke-dashoffset')),mainOpacity:main.getAttribute('stroke-opacity'),main:css(main),track:css(track),outer:css(outer),outerLength:outer.getTotalLength(),outerOffset:Number(outer.getAttribute('stroke-dashoffset')),tiles:[...root.querySelectorAll('.nutrition-metric')].map(e=>({html:e.outerHTML,style:tileStyle(e),aria:e.getAttribute('aria-label'),state:e.className})),macroDonuts:root.querySelectorAll('.nutrition-metric svg').length,centerText:gauge.querySelector('strong').textContent,aria:gauge.getAttribute('aria-label'),documentOverflow:document.documentElement.scrollWidth>innerWidth+1}
    })
    if(checks.failures.length)await page.screenshot({path:`/tmp/nutrition-gauge-failure-${width}-${scale}-${surface}-${name}.png`})
    assert.deepEqual(checks.failures,[],`${width}/${scale}/${surface}/${name}`);assert.equal(checks.documentOverflow,false)
    assert.equal(checks.span,'280');assert.equal(checks.circles,0);assert.equal(checks.paths,4);assert.equal(checks.macroDonuts,0);assert.equal(checks.tiles.length,3)
    assert.equal(await page.locator(root+' .nutrition-metric[role=group][aria-label]').count(),3)
    assert.equal(checks.centerText,String(Math.round(actual)));assert.ok(checks.aria.includes(`${Math.round(actual)} kcal`));assert.equal(checks.main.strokeWidth,'6px');assert.equal(checks.main.linecap,'round');assert.equal(checks.outer.strokeWidth,'3px')
    const fraction=goal===undefined?0:goal<=0?(actual>0?1:0):Math.min(actual/goal,1)
    assert.ok(Math.abs(checks.mainOffset-checks.mainLength*(1-fraction))<.05,'progress maps only to available arc')
    assert.equal(checks.mainOpacity,fraction>0?'1':'0')
    if(goal===undefined){assert.ok(checks.aria.includes('尚未设置目标'));assert.ok(!checks.aria.includes('0%'));assert.equal(checks.track.opacity,surface==='today'?'0.85':'0.65')}
    const excess=goal===undefined||actual<=goal?0:goal>0?Math.min((actual-goal)/goal,1):1
    assert.ok(Math.abs(checks.outerOffset-checks.outerLength*(1-excess))<.05)
    if(actual>goal){assert.ok(checks.aria.includes('高于目标'));assert.equal(checks.outer.opacity,'1')}
    const styles=checks.tiles.map(t=>t.style)
    if(surface==='today'){todaySvg=checks.svg;todayTiles=checks.tiles.map(t=>t.html);todayStyles=styles}
    else{assert.equal(checks.svg,todaySvg);assert.deepEqual(checks.tiles.map(t=>t.html),todayTiles);assert.deepEqual(styles,todayStyles)}
    await page.locator(root).screenshot({path:`/tmp/nutrition-gauge-${prod?'prod':'local'}-${width}-${scale}-${surface}-${name}.png`})
    states.push({scale,surface,name})
   }
  }
  // A normal view rerender must not start an SVG/count animation.
  await page.locator('[data-tab=today]').click();assert.equal(await page.locator('.calorie-gauge').evaluate(e=>e.getAnimations({subtree:true}).length),0)
  assert.deepEqual(errors,[]);receipts.push({width,states:states.length,fonts:[100,120,140],arcSpan:280,mainStroke:6,outerStroke:3,macroDonuts:0,sharedSvgAndTiles:true,noOverflowOrTextArcOverlap:true,noReplay:true,errors})
  console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}
await fs.writeFile(`/tmp/nutrition-gauge-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))
}finally{await browser.close()}
