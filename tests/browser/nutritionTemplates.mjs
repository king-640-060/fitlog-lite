// Full UI workflow and layout matrix; isolated synthetic data and mocked viewport only.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const {chromium}=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base=process.env.FITLOG_QA_URL||'http://127.0.0.1:5175/fitlog-lite/',prod=base.includes('github.io')
const sizes=prod?[[390,844],[430,932]]:[[320,812],[375,812],[390,844],[430,932]]
const browser=await chromium.launch({headless:true,executablePath:process.env.FITLOG_CHROME}),receipts=[]
const now='2026-09-28T08:00:00.000Z'
try{for(const [width,height] of sizes){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block'})
 await context.addInitScript(()=>{window.strategyViewport=Object.assign(new EventTarget(),{height:innerHeight,width:innerWidth,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:strategyViewport})})
 try{
  const page=await context.newPage(),states=[],errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
  await page.addStyleTag({content:':root{--safe-area-top:47px;--safe-area-bottom:34px} '})
  const dates=await page.evaluate(()=>{const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const shift=n=>{const d=new Date();d.setDate(d.getDate()+n);return local(d)};return {today:shift(0),start:shift(-7),old:shift(-14),oldEnd:shift(-8),weightFirst:shift(-6),weightLast:shift(-1)}})
  const read=async store=>page.evaluate(async store=>{const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)});const rows=await new Promise(resolve=>{const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>resolve(q.result)});d.close();return rows},store)
  const put=async data=>page.evaluate(async data=>{const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)});await new Promise((resolve,reject)=>{const t=d.transaction(Object.keys(data),'readwrite');for(const [store,rows] of Object.entries(data)){const s=t.objectStore(store);s.clear();for(const r of rows)s.put(r)}t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()},data)
  const seed=async(count=4,weightCount=0,long=false,active=true)=>{
   const template={id:'nutrition-v1',name:long?'减脂营养策略第一阶段这是用于验证很长中文名称仍然完整显示的自定义模板':'减脂碳循环 V1',createdAt:now,updatedAt:now}
   const variants=Array.from({length:count},(_,i)=>({id:'variant-'+i,templateId:template.id,name:long?'日方案名称很长仍然需要完整展示不能挤压营养数值和按钮'+i:['高碳日','中碳日','低碳日','休息日'][i]??'自定义方案 '+i,calories:2400-i*100,protein:180,carbs:320-i*20,fat:55+i*5,sortOrder:i,createdAt:now,updatedAt:now}))
   const weights=Array.from({length:weightCount},(_,i)=>({id:'strategy-weight-'+i,date:i===0?dates.weightFirst:dates.weightLast,weightKg:i===0?80.2:78.9,createdAt:now,updatedAt:now}))
   await put({nutritionStrategyTemplates:count?[template]:[],nutritionStrategyVariants:variants,nutritionStrategyPhases:count&&active?[{id:'phase-v1',templateId:template.id,templateName:template.name,startDate:dates.start,createdAt:now}]:[],nutritionTargets:[],weights})
  }
  const close=async()=>{if(await page.locator('.sheet[open]').count())await page.locator('.sheet[open] [data-close]').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'))}
  const click=async selector=>{await page.locator(selector).first().click();await page.waitForTimeout(30)}
  const manager=async()=>{await close();await click('#open-management');await click('#more-nutrition-strategies');await page.waitForSelector('#strategy-create:visible,#strategy-empty-create')}
  const food=async()=>{await close();await click('[data-tab=today]');await click('[data-tab=food]');await page.waitForSelector('[data-edit-nutrition-target]')}
  const openDetail=async selector=>{await click(selector);await page.waitForSelector('#strategy-template-form');await click('#strategy-show-detail');await page.waitForSelector('#strategy-detail-back:visible,[data-workspace-back]:visible')}
  const picker=async()=>{await food();await click('[data-edit-nutrition-target]');await page.waitForSelector('#strategy-apply')}
  const audit=async(name,scale)=>{
   await page.waitForTimeout(220)
   const failures=await page.evaluate(()=>{
    const root=[...document.querySelectorAll('dialog[open]')].at(-1),r=root.getBoundingClientRect(),errors=[]
    if(document.documentElement.scrollWidth>innerWidth+1)errors.push('document overflow')
    for(const e of root.querySelectorAll('*')){
     const b=e.getBoundingClientRect(),c=getComputedStyle(e);if(!b.width||!b.height||e.closest('[hidden]')||c.visibility==='hidden')continue
     if(b.left<r.left-1||b.right>r.right+1)errors.push('bounds '+e.className)
     if(!(e instanceof SVGElement)&&!e.matches('input,textarea')&&e.scrollWidth>e.clientWidth+1&&(['hidden','clip'].includes(c.overflowX)||e.matches('button')))errors.push('clip '+e.className)
     if(e.matches('button,summary')&&(b.height<43.5||b.width<43.5))errors.push('target '+e.id)
     if(e.matches('input:not([type=hidden]),textarea')&&parseFloat(c.fontSize)<16)errors.push('font '+e.name)
     if(e.matches('.full-btn,.strategy-variant-actions button,.sheet-link')&&c.whiteSpace!=='nowrap')errors.push('action may orphan '+e.id)
    }
    const body=root.querySelector('.modal-body'),head=root.querySelector('.modal-head'),br=body.getBoundingClientRect(),hr=head.getBoundingClientRect()
    if(br.top<hr.bottom-1)errors.push('header/body overlap')
    if(body.scrollWidth>body.clientWidth+1)errors.push('body overflow')
    return [...new Set(errors)]
   })
   await page.screenshot({path:`/tmp/nutrition-templates-${prod?'prod':'local'}-${width}-${scale}-${name}.png`})
   assert.deepEqual(failures,[],`${width}/${scale}/${name}`);states.push({name,scale})
  }
  for(const scale of [1,1.2,1.4]){
   await page.evaluate(scale=>document.documentElement.style.fontSize=`${16*scale}px`,scale)
   await seed(0);await manager();await audit('no-template',scale);assert.equal(await page.locator('#strategy-create:visible,#strategy-empty-create').count(),1)
   await click('#strategy-create:visible,#strategy-empty-create');await audit('create-template',scale);await page.locator('#strategy-template-form [name=name]').fill('UI创建 · 自定义日方案')
   await click('#strategy-add-variant');await page.locator('[name=variantName]').fill('训练日');await page.locator('[name=goalCalories]').fill('2200');await page.locator('[name=goalProtein]').fill('160')
   await audit('edit-variant',scale)
   const field=page.locator('[name=goalFat]');await field.focus();await page.evaluate(()=>{strategyViewport.height=innerHeight-300;strategyViewport.offsetTop=20;strategyViewport.dispatchEvent(new Event('resize'))});await page.waitForTimeout(60)
   assert.ok(await page.evaluate(()=>document.body.classList.contains('keyboard-open')));assert.ok(await field.evaluate(e=>{const r=e.getBoundingClientRect();return r.bottom<=visualViewport.height+visualViewport.offsetTop+1}));await audit('edit-variant-keyboard',scale)
   await page.locator('.sheet-focus-anchor').focus();await page.evaluate(()=>{strategyViewport.height=innerHeight;strategyViewport.offsetTop=0;strategyViewport.dispatchEvent(new Event('resize'))});await page.waitForTimeout(60)
   await click('#strategy-variant-form [type=submit]');assert.equal(await page.locator('#strategy-template-form [name=name]').inputValue(),'UI创建 · 自定义日方案');await click('#strategy-save');await page.waitForSelector('#strategy-activate-open');await audit('one-template-one-variant',scale);assert.equal((await read('nutritionStrategyPhases')).length,0)
   await click('#strategy-activate-open');await audit('activate-first-confirmation',scale);await click('#strategy-start-date');await audit('shared-start-date-picker',scale);if(!await page.locator('[data-date="'+dates.start+'"]').count())await click('[data-month="-1"]');await click('[data-date="'+dates.start+'"]');await click('[data-done]');assert.ok((await page.locator('.strategy-activation-preview').innerText()).includes(dates.start));await click('#strategy-activate-confirm');await page.waitForSelector('#strategy-edit');assert.equal((await read('nutritionStrategyPhases')).length,1)
   await seed(4);await manager();await audit('phase-weight-none',scale);await openDetail('[data-strategy-detail]');await audit('one-template-four-variants',scale)
   await picker();await audit('active-daily-picker',scale);await click('[data-strategy-choice="variant-0"]');await audit('daily-preview-high',scale);await click('#strategy-apply');await picker();assert.equal(await page.locator('[data-strategy-choice="variant-0"]').getAttribute('aria-pressed'),'true');assert.equal((await read('nutritionTargets'))[0].strategySelection.variantName,'高碳日');await audit('selected-high-carb',scale)
   await click('[data-strategy-choice="variant-2"]');await click('#strategy-apply');await picker();assert.equal(await page.locator('[data-strategy-choice="variant-2"]').getAttribute('aria-pressed'),'true');await audit('selected-low-carb',scale)
   await click('#strategy-custom');await audit('manual-target-form',scale);await page.locator('[name=goalCalories]').fill('2400');await click('#nutrition-target-form [type=submit]');assert.equal((await read('nutritionTargets'))[0].strategySelection,undefined);await picker();assert.equal(await page.locator('[data-strategy-choice][aria-pressed=true]').count(),0);await audit('manual-target-no-guessed-selection',scale)
   await manager();await openDetail('[data-strategy-detail]');await click('#strategy-detail-copy');await audit('copy-template',scale);await page.locator('#strategy-template-form [name=name]').fill('减脂碳循环 V2');await click('[data-variant-move="0"][data-direction="1"]');await click('#strategy-save');await page.waitForSelector('#strategy-activate-open');const templates=await read('nutritionStrategyTemplates'),v2=templates.find(t=>t.name==='减脂碳循环 V2'),original=templates.find(t=>t.id==='nutrition-v1');assert.ok(v2.id!==original.id);const copied=(await read('nutritionStrategyVariants')).filter(v=>v.templateId===v2.id);assert.ok(copied.every(v=>!v.id.startsWith('variant-')));assert.equal(copied.find(v=>v.sortOrder===0).name,'中碳日')
   await click('#strategy-activate-open');await audit('activate-v2-confirmation',scale);assert.ok((await page.locator('.strategy-activation-preview').innerText()).includes(dates.today));const targetBefore=await read('nutritionTargets');await click('#strategy-activate-confirm');await page.waitForSelector('#strategy-edit');const phases=await read('nutritionStrategyPhases');assert.equal(phases.filter(p=>!p.endDate).length,1);assert.ok(phases.find(p=>p.templateId==='nutrition-v1').endDate);assert.deepEqual(await read('nutritionTargets'),targetBefore)
   await manager();await openDetail('[data-strategy-detail="nutrition-v1"]');await audit('inactive-template',scale);await click('#strategy-edit');await audit('edit-template',scale)
   await seed(8,2,true);await manager();await openDetail('[data-strategy-detail]');await audit('many-variants-long-names',scale);await click('#strategy-edit');await page.locator('.modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);await audit('many-variants-bottom-cta',scale);assert.ok(await page.locator('#strategy-save').evaluate(e=>{const r=e.getBoundingClientRect(),b=e.closest('.modal-body').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom}));await page.locator('.modal-body').evaluate(e=>e.scrollTop=0)
   await close();await seed(4,1);await manager();await audit('phase-weight-one',scale);assert.ok((await page.locator('.strategy-weight').innerText()).includes('仅 1 条'))
   await close();await seed(4,2);await manager();await audit('phase-weight-many',scale);assert.ok((await page.locator('.strategy-weight').innerText()).includes('-1.3 kg'))
   await close();await seed(4)
   const historical={id:'historical-target',date:dates.weightFirst,calories:1950,protein:170,carbs:150,fat:70,strategySelection:{templateId:'nutrition-v1',variantId:'variant-0',phaseId:'phase-v1',templateName:'启用时旧模板名称',variantName:'应用时旧方案名称'},createdAt:now,updatedAt:now}
   await put({nutritionTargets:[historical]});await food();await click('#food-date-picker-open');if(!await page.locator('[data-date="'+dates.weightFirst+'"]').count())await click('[data-month="-1"]');await click('[data-date="'+dates.weightFirst+'"]');await click('[data-done]');await page.waitForFunction(date=>document.querySelector('.food-content-body')?.dataset.foodDate===date,dates.weightFirst)
   assert.ok((await page.locator('.strategy-food-source').innerText()).includes('应用时旧方案名称'));await click('[data-edit-nutrition-target]');await page.waitForSelector('#strategy-apply');await audit('historical-snapshot',scale);assert.ok((await page.locator('.strategy-saved').innerText()).includes('1950 kcal'));assert.ok((await page.locator('.strategy-saved').innerText()).includes('启用时旧模板名称'));assert.equal(await page.locator('[data-strategy-choice="variant-0"]').getAttribute('aria-pressed'),'true');assert.ok((await page.locator('[data-strategy-choice="variant-0"]').innerText()).includes('2400 kcal'));assert.deepEqual(await read('nutritionTargets'),[historical]);await close();await click('#food-return-today')
   await put({nutritionStrategyPhases:[{id:'phase-v1',templateId:'nutrition-v1',templateName:'启用时旧模板名称',startDate:dates.start,endDate:dates.weightLast,createdAt:now}]});await manager();await openDetail('[data-strategy-detail]');assert.ok((await page.locator('.strategy-phase').innerText()).includes('启用时名称'));await click('#strategy-archive');await click('[data-confirm]');await page.waitForSelector('#strategy-create:visible,#strategy-empty-create');await click('.strategy-archive summary');await audit('archived-template-history-retained',scale);assert.deepEqual(await read('nutritionTargets'),[historical]);assert.ok((await read('nutritionStrategyTemplates'))[0].archivedAt);assert.equal((await read('nutritionStrategyPhases')).length,1);assert.equal((await read('nutritionStrategyVariants')).length,4)
   await close()
  }
  assert.deepEqual(errors,[]);receipts.push({width,height,states:states.length,fontScales:[100,120,140],createCopyActivateSelectManual:true,persistedProvenance:true,noGuessedSelection:true,snapshotsPreserved:true,historicalUiAndArchive:true,reorderFreshIds:true,weightNoneOneMany:true,keyboardMock:true,noOverflowClipOrOrphans:true,safeAreaMock:true,errors});console.log(JSON.stringify(receipts.at(-1)))
 }finally{await context.close()}
}
await fs.writeFile(`/tmp/nutrition-templates-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2))
}finally{await browser.close()}
