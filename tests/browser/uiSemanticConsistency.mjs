// Semantic/state regression gate. Only fresh synthetic browser contexts are mutated.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5175/fitlog-lite/'
const prod = base.includes('github.io'), baseline = process.argv.includes('--management-baseline')
const sizes = prod ? [[390,844],[430,932]] : [[320,812],[375,812],[390,844],[430,932]]
const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/legacyV7Data.json', import.meta.url)))
const browser = await chromium.launch({ headless:true, executablePath:process.env.FITLOG_CHROME })
const receipts = []
try { for (const [width,height] of sizes) {
 const context = await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai'})
 try {
  const page = await context.newPage(), errors = [], states = [], scrollChecks = [], ringStyles = [], workoutGeometry = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base,{waitUntil:'networkidle'}); await page.waitForSelector('#open-management')
  await page.addStyleTag({content:':root { --safe-area-top:47px; --safe-area-bottom:34px; }'})
  const date = await page.evaluate(() => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  const put = async data => page.evaluate(async data => {
   const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)})
   await new Promise((resolve,reject)=>{const t=d.transaction(Object.keys(data),'readwrite');for(const [name,rows] of Object.entries(data)){const s=t.objectStore(name);s.clear();for(const row of rows)s.put(row)}t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()
  },data)
  const nav = async tab => {await page.locator(`[data-tab=${tab}]`).click();await page.waitForTimeout(100);await page.evaluate(()=>scrollTo(0,0))}
  const close = async () => {await page.locator('dialog [data-close]').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'))}
  const capture = async name => {
   await page.waitForTimeout(220)
   const failures = await page.evaluate(() => {
    const d=document.querySelector('dialog[open]'),root=d||document.querySelector('#view'),b=d?.getBoundingClientRect()||{left:0,right:innerWidth},errors=[]
    if(document.documentElement.scrollWidth>innerWidth+1)errors.push('document overflow')
    for(const e of root.querySelectorAll('*')){
     const r=e.getBoundingClientRect();if(!r.width||!r.height||e.closest('[hidden]')||e.closest('.food-date-rail')||e.tagName==='CANVAS')continue
     if(r.left<b.left-1||r.right>b.right+1)errors.push('bounds '+e.className)
     if(e.matches('button')&&(r.height<43.5||r.width<43.5||e.scrollWidth>e.clientWidth+1))errors.push('button '+e.id)
    }
    return errors
   })
   assert.deepEqual(failures,[],name)
   await page.screenshot({path:`/tmp/semantic-${baseline?'baseline':prod?'prod':'local'}-${width}-${name}.png`,fullPage:!(await page.locator('dialog[open]').count())});states.push(name)
  }
  const management = async name => {
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
   for(let i=0;i<2;i++){
    await page.locator('#open-management').click();await page.waitForTimeout(230)
    const v=await page.locator('.modal-body').evaluate(body=>{const r=body.getBoundingClientRect(),f=body.querySelector('#more-food-library').getBoundingClientRect();return {scrollTop:body.scrollTop,firstVisible:f.top>=r.top&&f.bottom<=r.bottom}})
    assert.equal(v.scrollTop,0);assert.ok(v.firstVisible);scrollChecks.push(v)
    if(!baseline){assert.ok(await page.locator('.settings-section-note').evaluate(e=>e.tagName==='P'&&e.getAttribute('role')==='note'&&!e.closest('.settings-group')&&e.closest('.settings-section')&&!e.querySelector('svg,strong,button,.setting-icon')&&!e.hasAttribute('tabindex')));assert.equal(await page.locator('.management-local-note').count(),0)}
    await capture(name+'-'+i)
    // At430×932 the compact hub can fit entirely. Add synthetic height only when needed
    // so close/reopen still starts from an actually scrolled previous body.
    await page.locator('.modal-body').evaluate(e=>{if(e.scrollHeight<=e.clientHeight){const extra=document.createElement('div');extra.style.height='400px';extra.textContent='合成滚动检查';e.append(extra)}e.scrollTop=e.scrollHeight});assert.ok(await page.locator('.modal-body').evaluate(e=>e.scrollTop>0));await close()
   }
  }
  if(baseline){await management('management-fresh');receipts.push({width,height,baseline:true,scrollChecks,states});continue}
  const empty = {tasks:[],taskTags:[],foodLogs:[],nutritionTargets:[],workouts:[],cardioSessions:[],pelvicFloorSessions:[]}
  await put(empty)
  const createState = async isEmpty => {
   await page.waitForFunction(isEmpty=>document.querySelector('#plan-add-task')?.hidden===isEmpty,isEmpty)
   assert.equal(await page.locator('#plan-add-task').evaluate(e=>e.hidden),isEmpty)
   assert.equal(await page.locator('#plan-add-task').isVisible(),!isEmpty)
   assert.equal(await page.locator('#plan-empty-add').count(),isEmpty?1:0)
   assert.equal(await page.locator('#plan-add-task:visible, #plan-empty-add:visible').count(),1)
   if(isEmpty){await page.locator('#plan-add-task').evaluate(e=>e.focus());assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'plan-add-task')}
  }
  await nav('plan');await createState(true);await capture('plan-empty')
  await page.locator('#plan-empty-add').click();assert.equal(await page.locator('[name=date]').inputValue(),date);await close()
  for(const view of ['upcoming','inbox']){await page.locator(`[data-plan-view=${view}]`).click();await createState(true);await page.locator('#plan-empty-add').click();assert.equal(await page.locator('[name=date]').inputValue(),'');await close();await capture('plan-'+view+'-empty')}
  const task={...fixture.tasks[0],title:'今晚整理明天的计划',date,tagIds:[]}
  const future=await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  await put({tasks:[task,{...task,id:'future',date:future},{...task,id:'inbox',date:undefined}],taskTags:fixture.taskTags})
  for(const view of ['today','upcoming','inbox']){await page.locator(`[data-plan-view=${view}]`).click();await createState(false);await capture('plan-'+view+'-populated')}
  await page.locator('[data-plan-view=today]').click();await page.locator('#plan-tag-filter').click();await page.locator('[data-filter-tag="tag-old"]').click();await createState(true);await capture('plan-filtered-empty');await page.locator('#plan-tag-filter-clear').click();await createState(false)
  await put({tasks:[{...task,completedAt:'2026-10-03T00:00:00Z'}]});await nav('today');await nav('plan');await createState(false);await capture('plan-completed-only')
  const geometry = async selector => page.locator(selector).evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect(),c=e.closest('.training-card,.today-card'),b=c.getBoundingClientRect(),s=getComputedStyle(c),a=getComputedStyle(e);return {height:r.height,width:r.width,innerWidth:b.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),rightGap:b.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth)-r.right,minHeight:a.minHeight,radius:a.borderRadius,padding:a.padding,whiteSpace:a.whiteSpace,primary:e.classList.contains('primary'),secondary:e.classList.contains('secondary')}}))
  const actionGeometry = async selector => {const result=await geometry(selector);assert.ok(result.length);for(const g of result){assert.ok(g.height>=44);assert.ok(g.width<g.innerWidth);assert.ok(Math.abs(g.rightGap)<1.5);assert.equal(g.whiteSpace,'nowrap')}return result}
  const todayWorkout = async open => {await nav('today');await actionGeometry('#today-workout');assert.equal(await page.locator('#today-workout').innerText(),open?'继续力量训练':'查看训练');assert.equal(await page.locator('#today-workout').evaluate(e=>e.classList.contains('primary')),open);assert.equal(await page.locator('#today-workout').evaluate(e=>e.classList.contains('secondary')),!open)}
  const gauge = async (actual,goal,state,status) => {
   await put({foodLogs:actual?[{...fixture.foodLogs[0],date,totalCalories:actual}]:[],nutritionTargets:goal===undefined?[]:[{...fixture.nutritionTargets[0],date,calories:goal}]})
   await nav('today')
   assert.equal(await page.locator('.today-calorie-gauge .calorie-gauge-center strong').innerText(),String(Math.round(actual)))
   assert.ok(await page.locator('.today-calorie-gauge .goal-ring').evaluate((e,state)=>e.classList.contains(state),state))
   assert.ok((await page.locator('.today-calorie-layout .calorie-gauge-caption').innerText()).includes(status))
   assert.equal(await page.locator('.today-macros > div').count(),3)
   assert.ok((await page.locator('.today-calorie-gauge').getAttribute('aria-label')).includes(`今日摄入 ${Math.round(actual)} kcal`))
   assert.equal(await page.locator('.today-calorie-gauge svg').getAttribute('aria-hidden'),'true')
   if(goal===undefined)assert.ok(!(await page.locator('.today-calorie-layout').innerText()).includes('0%'))
   else assert.ok((await page.locator('.today-calorie-layout').innerText()).includes(`目标 ${goal} kcal`))
   if(state==='above'||state==='reached')assert.equal(Number(await page.locator('.today-calorie-gauge .ring-main').getAttribute('stroke-dashoffset')),0)
   if(state==='above')assert.ok(Number(await page.locator('.today-calorie-gauge .ring-outer').getAttribute('stroke-dashoffset'))<55*280*Math.PI/180)
   await capture('today-'+state)
   const ringStyle = async selector => page.locator(selector).evaluate(e=>{const s=getComputedStyle(e),root=getComputedStyle(document.documentElement);return {stroke:s.stroke,opacity:Number(s.opacity),dash:s.strokeDasharray,strokeWidth:s.strokeWidth,border:root.getPropertyValue('--border').trim(),neutral:root.getPropertyValue('--text-tertiary').trim(),accent:root.getPropertyValue('--accent-mid').trim()}})
   const todayTrack=await ringStyle('.today-calorie-gauge .ring-track')
   const active=await ringStyle('.today-calorie-gauge .ring-main')
   // SVG CSS colors normalize to rgb; compare against a probe using the actual theme token.
   const tokenColor = async token => page.evaluate(token=>{const e=document.createElement('span');e.style.color=`var(${token})`;document.body.append(e);const value=getComputedStyle(e).color;e.remove();return value},token)
   assert.equal(active.stroke,await tokenColor('--accent-mid'))
   if(state==='unset'){assert.ok(todayTrack.opacity>.55);assert.equal(todayTrack.stroke,await tokenColor('--text-tertiary'));assert.notEqual(todayTrack.stroke,await tokenColor('--border'));assert.equal(todayTrack.dash,'3px, 7px');assert.equal(todayTrack.strokeWidth,'6px')}
   else {assert.equal(todayTrack.stroke,await tokenColor('--border'));assert.equal(todayTrack.opacity,.55)}
   const todaySvg=await page.locator('.today-calorie-gauge svg').innerHTML()
   await nav('food');assert.equal(await page.locator('.food-nutrition-hero .calorie-gauge svg').innerHTML(),todaySvg);assert.equal(await page.locator('.food-nutrition-hero .calorie-gauge-center strong').innerText(),String(Math.round(actual)));await capture('food-'+state)
   const foodTrack=await ringStyle('.food-nutrition-hero .calorie-gauge .ring-track')
   if(state==='unset'){assert.equal(foodTrack.opacity,.65);assert.equal(foodTrack.stroke,await tokenColor('--text-tertiary'));assert.equal(foodTrack.dash,'3px, 7px');assert.equal(foodTrack.strokeWidth,todayTrack.strokeWidth);assert.notEqual(foodTrack.opacity,todayTrack.opacity)}
   else assert.deepEqual(foodTrack,todayTrack)
   ringStyles.push({state,today:todayTrack,food:foodTrack,active})
  }
  await gauge(0,undefined,'unset','尚未设置目标');await todayWorkout(false);await capture('today-no-open')
  await gauge(840,1800,'below','47%');await gauge(1800,1800,'reached','已达目标');await gauge(2100,1800,'above','高于目标 300 kcal');await gauge(0,0,'zero','目标为 0')
  const workoutCheck = async name => {await nav('workout');const g=await geometry('.training-card-action');assert.equal(g.length,3);for(const a of g){assert.ok(Math.abs(a.width-a.innerWidth)<=2);assert.ok(a.height>=48);assert.equal(a.minHeight,'48px');assert.equal(a.whiteSpace,'nowrap')};for(const key of ['width','height'])assert.ok(Math.max(...g.map(a=>a[key]))-Math.min(...g.map(a=>a[key]))<=2);assert.equal(new Set(g.map(a=>a.radius)).size,1);assert.equal(new Set(g.map(a=>a.padding)).size,1);assert.ok(g.every(a=>a.primary&&!a.secondary));const styles=await page.locator(".training-card-action").evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,border:s.borderColor,fontSize:s.fontSize,fontWeight:s.fontWeight}}));for(const s of styles)assert.deepEqual(s,styles[0]);const link=page.locator('.training-card-link');if(await link.count())assert.ok(await link.evaluate(e=>e.getBoundingClientRect().top>=e.previousElementSibling.getBoundingClientRect().bottom));workoutGeometry.push({name,actions:g});await capture(name)}
  await workoutCheck('workout-empty')
  const finished={...fixture.workouts[0],date},cardio={...fixture.cardioSessions[0],date},pelvic={...fixture.pelvicFloorSessions[0],date}
  await put({workouts:[finished],cardioSessions:[cardio],pelvicFloorSessions:[pelvic]});await workoutCheck('workout-one-completed');assert.equal(await page.locator('[data-cardio-id]').count(),1);assert.ok((await page.locator('#view').innerText()).includes('今日已完成 1 次'));await todayWorkout(false)
  await put({cardioSessions:[cardio,{...cardio,id:'second',createdAt:'2026-10-03T01:00:00Z'}]});await workoutCheck('workout-multiple');assert.ok((await page.locator('#view').innerText()).includes('今日 2 次'))
  await put({workouts:[{...finished,id:'open',finishedAt:undefined}]});await workoutCheck('workout-open');assert.equal(await page.locator('#start-workout').innerText(),'继续训练');await todayWorkout(true);await capture('today-open-workout')
  await management('management-fresh')
  for(const scale of [120,140]){
   await page.addStyleTag({content:`html { font-size:${scale}%; }`})
   await todayWorkout(true);await capture(`font${scale}-today`);await workoutCheck(`font${scale}-workout`);await nav('plan');await createState(false);await capture(`font${scale}-plan-populated`)
   await put({tasks:[]});await nav('today');await nav('plan');await createState(true);await capture(`font${scale}-plan-empty`);await management(`font${scale}-management`)
   await put({tasks:[task]})
   await put({workouts:[]});await workoutCheck(`font${scale}-workout-start`);assert.equal(await page.locator('#start-workout').innerText(),'开始力量训练');await put({workouts:[{...finished,id:'open',finishedAt:undefined}]})
  }
  assert.deepEqual(errors,[])
  receipts.push({width,height,states,scrollChecks,ringStyles,workoutGeometry,fonts:[100,120,140],plan:['today','upcoming','inbox','filtered-empty','completed-only'],gauge:['unset','below','reached','above','zero'],workout:['empty','one','multiple','completed','open'],errors})
 } finally {await context.close()}
}
 // Exercise the shared primary interaction rules on a fine-pointer surface as well.
 // This is an isolated context; disabled states are synthetic and never activate flows.
 if(!baseline){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})
  try{
   const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});await page.locator('[data-tab=workout]').click();await page.waitForSelector('.training-card-action')
   assert.ok(await page.evaluate(()=>matchMedia('(hover: hover) and (pointer: fine)').matches))
   const states=[]
   const style=async button=>button.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,color:s.color,border:s.borderColor,opacity:s.opacity,cursor:s.cursor,outline:s.outline,fontSize:s.fontSize,fontWeight:s.fontWeight,height:e.getBoundingClientRect().height,radius:s.borderRadius,padding:s.padding}})
   const token=async name=>page.evaluate(name=>{const e=document.createElement('span');e.style.color=`var(${name})`;document.body.append(e);const color=getComputedStyle(e).color;e.remove();return color},name)
   for(const state of ['default','hover','active','focus-visible','disabled']){
    const values=[]
    for(const id of ['start-workout','add-cardio','start-pelvic-floor']){
     const button=page.locator('#'+id)
     await button.evaluate(e=>{const r=e.getBoundingClientRect();scrollTo(0,scrollY+r.top-(innerHeight-r.height)/2)})
     if(state==='hover')await button.hover()
     if(state==='active'){await button.hover();await page.mouse.down()}
     if(state==='focus-visible'){await page.keyboard.press('Tab');await button.focus();assert.ok(await button.evaluate(e=>e.matches(':focus-visible')))}
     if(state==='disabled')await button.evaluate(e=>e.disabled=true)
     await page.waitForTimeout(220);const value=await style(button);values.push(value)
     assert.equal(value.background,await token(state==='hover'?'--accent-hover':state==='active'?'--accent-pressed':'--accent'))
     assert.equal(value.color,await token('--accent-ink'));assert.equal(value.height,48);assert.equal(value.radius,'14px');assert.equal(value.padding,'0px 16px')
     if(state==='focus-visible')assert.ok(value.outline.startsWith('rgb(')&&value.outline.includes('solid 2px'))
     if(state==='disabled'){assert.equal(value.opacity,'0.48');assert.equal(value.cursor,'not-allowed');await button.evaluate(e=>e.disabled=false)}
     await page.mouse.move(0,0);if(state==='active')await page.mouse.up();await button.evaluate(e=>e.blur());await page.waitForTimeout(220)
    }
    for(const value of values)assert.deepEqual(value,values[0]);states.push({state,values})
   }
   await fs.writeFile(`/tmp/workout-primary-${prod?'prod':'local'}-states.json`,JSON.stringify(states,null,2))
  }finally{await context.close()}
 }
} finally {await browser.close()}
await fs.writeFile(`/tmp/semantic-${baseline?'baseline':prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))
console.log(JSON.stringify({suite:'uiSemanticConsistency',mode:baseline?'baseline':prod?'prod':'local',receipts}))
