// Reusable geometry/state gate. Fresh synthetic contexts, mock provider, no real credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const { chromium } = await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const base = process.env.FITLOG_QA_URL || 'http://127.0.0.1:5175/fitlog-lite/', prod = base.includes('github.io')
const browser = await chromium.launch({ headless: true, executablePath: process.env.FITLOG_CHROME })
const sizes = process.env.FITLOG_QA_WIDTH ? [[Number(process.env.FITLOG_QA_WIDTH),812]] : prod ? [[390,844],[430,932]] : [[320,812],[375,812],[390,844],[430,932]]
const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/legacyV7Data.json', import.meta.url)))
const long = '用于移动端质量审计的超长中文食物任务动作名称需要自然换行并保持操作可用'
const label = { format:'fitlog-food-label',version:1,productName:long,brand:'BrandWithoutSpaces'.repeat(5),netQuantity:{value:120,unit:'g',evidence:'120g'},basis:{kind:'per_100g',amount:100,unit:'g',evidence:'100g'},nutrients:{energy:{value:1584,unit:'kJ',evidence:'1584kJ'},protein:{value:9.2,unit:'g',evidence:'9.2g'},carbs:{value:60,unit:'g',evidence:'60g'},fat:{value:null,unit:null,evidence:null}},warnings:['这一项数字没有识别清楚，请和包装上的营养成分表逐项核对。'.repeat(3)] }
const receipts = []
try { for (const [width,height] of sizes) {
 const context = await browser.newContext({ viewport:{width,height},hasTouch:true,isMobile:true,serviceWorkers:'block',timezoneId:'Asia/Shanghai' })
 try {
  const page = await context.newPage(), errors = [], requests = [], states = []
  page.on('pageerror',e=>errors.push(e.message))
  let invalid = false
  await context.addInitScript(()=>{
   const p={id:'quality',preset:'custom',protocol:'openai-chat-completions',name:'Synthetic UI QA',baseUrl:'https://mock-quality.invalid/v1',model:'long_model_without_spaces_'.repeat(7),visionModel:'image_model_without_spaces_'.repeat(7),toolCapability:'unknown',visionCapability:'supported',createdAt:'',updatedAt:''}
   localStorage.setItem('fitlog-ai-profiles-v1',JSON.stringify([p]));localStorage.setItem('fitlog-ai-active-profile-v1',p.id);localStorage.setItem('fitlog-ai-key-v1:'+p.id,'synthetic-quality-key')
  })
  await page.route('https://mock-quality.invalid/**',async route=>{
   if(route.request().method()==='GET'){await route.fulfill({json:{data:[{id:'model_without_spaces_'.repeat(8)}]}});return}
   const body=route.request().postDataJSON();requests.push(body)
   await new Promise(r=>setTimeout(r,250))
   await route.fulfill({json:{choices:[{message:{content:invalid?'invalid extraction':JSON.stringify(label)}}]}}).catch(()=>{})
  })
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#open-management')
  await page.addStyleTag({content:':root { --safe-area-top:47px; --safe-area-bottom:34px; }'})
  const date = await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
  const put = async data => page.evaluate(async data=>{
   const d=await new Promise(resolve=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>resolve(q.result)})
   await new Promise((resolve,reject)=>{const t=d.transaction(Object.keys(data),'readwrite');for(const [store,rows] of Object.entries(data)){const s=t.objectStore(store);s.clear();for(const row of rows)s.put(row)}t.oncomplete=resolve;t.onerror=()=>reject(t.error)});d.close()
  },data)
  const populated=structuredClone(fixture)
  for(const rows of Object.values(populated))for(const row of rows){if(row.date)row.date=date;if(row.name)row.name=long;if(row.title)row.title=long+long;if(row.foodName)row.foodName=long;if(row.brand)row.brand='LongEnglishBrandWithoutSpaces'.repeat(4);if(row.exercises)for(const e of row.exercises)e.exerciseName=long}
  populated.foods[0].calories=1584/4.184;populated.foods[0].protein=9.23456789;populated.foods[0].referenceGrams=100.00004
  populated.tasks.push({...populated.tasks[0],id:'inbox',date:undefined,title:long,completedAt:undefined},{...populated.tasks[0],id:'future',date:'2099-12-31',title:long,completedAt:undefined},{...populated.tasks[0],id:'completed',completedAt:'2026-10-02T01:00:00Z'})
  populated.habits.push({...populated.habits[0],id:'habit-second',name:long,sortOrder:2})
  populated.foodLogs=Array.from({length:16},(_,i)=>({...populated.foodLogs[0],id:'long-log-'+i,meal:'dinner'}))
  populated.workouts=Array.from({length:6},(_,i)=>({...populated.workouts[0],id:'long-workout-'+i}))
  const audit = async name => {
   await page.waitForTimeout(230)
   const result=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect();return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden' && !e.closest('[hidden]')}
    const dialog=[...document.querySelectorAll('dialog[open]')].at(-1), root=dialog||document.querySelector('.app-frame'), failures=[]
    if(document.documentElement.scrollWidth>innerWidth+1)failures.push('document overflow')
    // Inspect children too: overflow-hidden on modal-body is not accepted as a fix.
    const boundary=dialog?.getBoundingClientRect()||{left:0,right:innerWidth}
    for(const e of root.querySelectorAll('*')){
     if(!visible(e)||e.closest('.food-date-rail')||e.tagName==='CANVAS'||e.closest('.bottom-nav')&&!dialog)continue
     const r=e.getBoundingClientRect(), css=getComputedStyle(e)
     if(r.left<boundary.left-1||r.right>boundary.right+1)failures.push('child bounds '+e.tagName+'.'+e.className)
     if(e.matches('button,a,summary,[role=button]') && (r.height<43.5||r.width<43.5))failures.push('target '+(e.id||e.textContent.slice(0,20))+':'+r.width+'x'+r.height)
     if(e.matches('button')&&!e.textContent.trim()&&!e.getAttribute('aria-label'))failures.push('missing accessible name '+e.id)
     if(e.matches('button') && e.scrollWidth>e.clientWidth+1)failures.push('button clipped '+(e.id||e.textContent.slice(0,20)))
     if(e.matches('#ai-send,#ai-stop') && css.whiteSpace!=='nowrap')failures.push('short action can split')
     if(e.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),textarea,select')&&parseFloat(css.fontSize)<16)failures.push('font '+e.name)
     if(e.matches('input[type=checkbox],input[type=radio]')&&!e.closest('.habit-weekday-option')){
      const label=e.closest('label'),lr=label?.getBoundingClientRect();if(r.width<19||r.width>23||r.height<19||r.height>23||parseFloat(css.paddingLeft)>0||!lr||lr.height<44)failures.push('native control '+e.id)
     }
     if(e.matches('[name=calories],[name=energyValue],.vision-energy,.vision-preview strong') && /\d+\.\d{4,}|\d+e-\d+/i.test(e.value||e.textContent))failures.push('numeric noise')
    }
    if(dialog){const title=dialog.querySelector('.modal-head h2')?.getBoundingClientRect(),close=dialog.querySelector('[data-close]')?.getBoundingClientRect();if(title&&close&&title.right>close.left-5)failures.push('header overlap');const body=dialog.querySelector('.modal-body');if(body&&body.scrollWidth>body.clientWidth+1)failures.push('body overflow')}
    return [...new Set(failures)]
   })
   if(result.length){await page.screenshot({path:`/tmp/ui-quality-failure-${width}-${name}.png`});assert.deepEqual(result,[],name)}
   states.push(name)
   await page.screenshot({path:`/tmp/ui-quality-${prod?'prod':'local'}-${width}-${name}.png`})
  }
  const nav=async tab=>{await page.locator(`[data-tab=${tab}]`).click();await page.waitForTimeout(80);await page.evaluate(()=>scrollTo(0,0))}
  const close=async()=>{if(await page.locator('dialog[open]').count())await page.locator('dialog[open] [data-close]').click();await page.waitForTimeout(40)}
  const click=async selector=>{await page.locator(selector).first().click();await page.waitForTimeout(90)}
  const management=async(id)=>{await close();await click('#open-management');if(id)await click('#'+id)}
  // Main empty states and shared empty libraries, then realistic long populated fixture.
  await put(Object.fromEntries(Object.keys(fixture).map(k=>[k,[]])))
  for(const tab of ['today','plan','food','workout','progress']){await nav(tab);await audit(tab+'-empty')}
  for(const id of ['more-food-library','more-exercise-library','more-workout-templates','more-diet-templates','more-habits']){await management(id);await audit(id+'-empty');await close()}
  await put(populated)
  for(const tab of ['today','plan','food','workout','progress']){await nav(tab);await audit(tab+'-populated');await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await audit(tab+'-bottom');const b=await page.locator('#view > :last-child').boundingBox(),n=await page.locator('.bottom-nav').boundingBox();assert.ok(b.y+b.height<=n.y+1,tab+' bottom reserve');await page.evaluate(()=>scrollTo(0,0))}
  await nav('plan');for(const v of ['upcoming','inbox','today']){await click(`[data-plan-view=${v}]`);await audit('plan-'+v)}
  await click('#plan-completed summary');await audit('plan-completed')
  await click('[data-task-edit]');await audit('task-editor');await click('#task-date-picker-open');await audit('task-date-picker');await close()
  await click('#plan-tag-filter');await audit('tag-filter');await click('#plan-manage-tags');await audit('tag-manager');await click('#task-tag-new');await audit('tag-editor');await close()
  await nav('food');await click('[data-edit-nutrition-target]');await audit('nutrition-target');await close()
  await click('#food-completion-open');await audit('nutrition-completion');await close()
  await click('#food-library');await audit('food-library-populated');await page.locator('#library-search').fill('no-matching-xyz');await page.waitForSelector('#clear-food-search');await audit('food-library-search-none');await click('#clear-food-search');await click('[data-edit-food]');await audit('food-editor-existing')
  await page.locator('[name=energyUnit]').selectOption('kJ');await page.locator('[name=energyUnit]').selectOption('kcal');await audit('food-energy-switch');await click('#food-form [type=submit]');await page.waitForSelector('#new-food');const stored=await page.evaluate(async()=>{const d=await new Promise(r=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result)});const row=await new Promise(r=>{const q=d.transaction('foods').objectStore('foods').get('food-old');q.onsuccess=()=>r(q.result)});d.close();return row});assert.equal(stored.calories,populated.foods[0].calories);assert.equal(stored.protein,populated.foods[0].protein);assert.equal(stored.referenceGrams,populated.foods[0].referenceGrams);await audit('food-untouched-precision');await close()
  await put({foods:[populated.foods[0],...Array.from({length:25},(_,i)=>({...populated.foods[0],id:'picker-stress-'+i,name:long+' '+i}))]})
  await click('[data-add-meal=dinner]');await audit('food-picker');assert.ok(await page.locator('.picker-list').evaluate(e=>getComputedStyle(e).overflowY==='visible'),'picker must share Sheet scroll owner');await page.locator('.modal-body').evaluate(e=>e.scrollTop=e.scrollHeight);await audit('food-picker-bottom');assert.ok(await page.locator('#create-food-from-picker').evaluate(e=>{const r=e.getBoundingClientRect(),b=e.closest('.modal-body').getBoundingClientRect();return r.bottom<=b.bottom+1&&r.top>=b.top}));await close();await click('[data-add-meal=dinner]');await audit('food-picker-reopen');assert.equal(await page.locator('.modal-body').evaluate(e=>e.scrollTop),0);await click('[data-food]');await audit('food-log-add');await page.locator('#grams').fill('999999.1');await audit('food-log-large-number');await close()
  await click('[data-toggle-meal=dinner]');await click('[data-edit-log]');await audit('food-log-edit');await close()
  for(const [id,next,name] of [['more-exercise-library','#new-exercise','exercise'],['more-workout-templates','#new-workout-template','workout-template'],['more-diet-templates','#new-diet-template','diet-template'],['more-habits','#habit-new','habit']]){
   await management(id);await audit(name+'-manager');if(name==='habit'){await click('#habit-reorder');await audit('habit-reorder');await click('#habit-reorder')}
   await click(next);await audit(name+'-editor');await close()
  }
  await management('more-workout-templates');await click('[data-edit-workout-template]');await audit('workout-template-existing');await close()
  await management('more-diet-templates');await click('[data-edit-diet-template]');await audit('diet-template-existing');await close()
  await nav('food');await click('#use-diet-template');await audit('diet-template-picker');await close()
  await nav('workout');await click('#start-workout');await audit('strength-start');await close()
  await click('#history-workout');await audit('strength-history');await click('[data-workout]');await audit('strength-detail');await click('#exit-workout')
  await click('#start-workout');await click('[data-start-workout-template]');await audit('strength-active');await click('#add-exercise');await audit('strength-exercise-picker');await close();await click('#finish-workout');await audit('strength-finish-confirm');await page.locator('[data-confirm]').click();await page.waitForTimeout(100);await click('#close-history')
  await click('#add-cardio');await audit('cardio-stair');await click('[data-cardio-type=treadmill]');await audit('cardio-treadmill');await close()
  await click('#cardio-history');await audit('cardio-history');await close()
  await click('#start-pelvic-floor');await audit('kegel-setup');await click('[data-pelvic-routine]');await audit('kegel-timer');await click('#pelvic-pause');await audit('kegel-paused');await click('#pelvic-finish');await page.locator('[data-confirm]').click();await page.waitForTimeout(100)
  await click('#pelvic-floor-history');await audit('kegel-history');await close()
  await nav('progress');await click('#record-weight');await audit('weight-editor');await close()
  await click('[data-progress-view=calendar]');await audit('calendar');await click('[aria-selected=true]');await audit('calendar-day');await close()
  await click('[data-progress-view=reports]');await audit('report-week');await click('[data-report-mode=month]');await audit('report-month')
  await management();await audit('management');await management('more-about');await audit('about');await close()
  await management('more-backup');await audit('backup-restore')
  await page.locator('#backup-file').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'FitLog Lite',schemaVersion:7,exportedAt:'2026-09-28T10:00:00Z',data:fixture}))});await page.waitForSelector('#confirm-restore');await audit('restore-preview');await click('#confirm-restore');await audit('restore-danger-confirm');await page.locator('.confirm-dialog [data-cancel]').click();await close()
  await management('more-github-sync');await audit('github-sync');await close()
  await page.evaluate(()=>{localStorage.setItem('fitlog-github-sync-config-v1',JSON.stringify({owner:'long-owner-'.repeat(10),repo:'long-repository-'.repeat(10),defaultBranch:'main',remotePath:'fitlog/latest.enc.json'}));localStorage.setItem('fitlog-github-sync-state-v1',JSON.stringify({deviceId:'quality',lastRemoteSha:'old-sha',lastSyncedDataHash:'old-hash',lastSyncedAt:'2026-10-02T08:00:00Z'}));localStorage.setItem('fitlog-github-sync-token-v1','synthetic-not-real')})
  await management('more-github-sync');await audit('github-sync-long-repository');await close()
  await management('more-ai-settings');await audit('ai-overview');await click('#ai-privacy-details');await audit('ai-privacy');await click('#ai-settings-back');await click('#ai-manage-profiles');await audit('ai-profiles');await click('#ai-settings-back');await click('#ai-permissions-open');await audit('ai-checkboxes');await click('#ai-settings-back');await click('[data-edit]');await audit('ai-settings-editor');await page.locator('[name=imageRouting][value=separate]').check();await audit('ai-routing-radio');await page.locator('#ai-list-models').click();await page.waitForTimeout(350);await audit('ai-long-model-select');await close()
  await click('#open-ai-assistant');await audit('ai-assistant');await close()
  await nav('food');await click('#food-library');await click('#food-import-open');await audit('import-chooser');await page.locator('#import-file').setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{name:long,brand:populated.foods[0].brand,referenceGrams:100,calories:123}]))});await page.waitForSelector('#confirm-import');await audit('import-radio-preview');await close()
  // Large synthetic source, fast/high payload comparison, parser failure is one request only.
  const file={name:'synthetic-large.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=4032;c.height=3024;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height)
   let seed=17;for(let y=0;y<3024;y+=8)for(let z=0;z<4032;z+=8){seed=(seed*1664525+1013904223)>>>0;x.fillStyle=`rgb(${seed%180+40},${seed>>>8&255},${seed>>>16&255})`;x.fillRect(z,y,8,8)}
   x.fillStyle='white';x.fillRect(120,120,2400,1800);x.fillStyle='black';x.font='60px sans-serif';['Nutrition 100g','Energy 1584kJ','Protein 9.2g','Carbs 60g'].forEach((t,i)=>x.fillText(t,180,280+i*160));return c.toDataURL('image/png').split(',')[1]
  }),'base64')}
  const vision=async()=>{await click('#food-library');await click('#food-vision-import')}
  await vision();await audit('vision-choose');await page.locator('#vision-album-file').setInputFiles(file);await page.waitForSelector('.vision-images img');await page.locator('#vision-album-file-front').setInputFiles(file);await page.waitForFunction(()=>document.querySelectorAll('.vision-images img').length===2)
  await audit('vision-choose-images');await page.locator('#vision-consent').check();await click('#vision-analyze');await page.waitForSelector('#vision-review-form');await audit('vision-review')
  const fast=requests.at(-1),fastTiming=await page.locator('.food-vision').getAttribute('data-vision-timing');assert.equal(fast.messages[1].content[1].image_url.detail,'auto');assert.equal(fast.messages[1].content[2].image_url.detail,'low')
  await page.locator('[name=energyUnit]').selectOption('kcal');assert.equal(await page.locator('[name=energyValue]').inputValue(),'379');await page.locator('[name=energyUnit]').selectOption('kJ');assert.equal(await page.locator('[name=energyValue]').inputValue(),'1584');await audit('vision-energy-rounded')
  const body=page.locator('dialog .modal-body');await body.evaluate(e=>e.scrollTop=600);const before=await body.evaluate(e=>e.scrollTop);assert.ok(before>100)
  // Native click would first scroll the thumbnail into view; capture viewer restore using DOM activation.
  await page.locator('[data-view-image]').first().evaluate(e=>e.click());assert.equal(await body.evaluate(e=>e.scrollTop),0);await click('.vision-image-view button');assert.equal(await body.evaluate(e=>e.scrollTop),before);await audit('vision-viewer-return')
  await page.locator('#vision-back-images').evaluate(e=>e.click());await page.waitForTimeout(40);assert.equal(await body.evaluate(e=>e.scrollTop),0);await audit('vision-back-choose')
  if(await page.locator('#vision-replace-ack').count())await page.locator('#vision-replace-ack').check();invalid=true;const requestCount=requests.length;await click('#vision-analyze');await page.waitForTimeout(350);assert.equal(requests.length,requestCount+1);await audit('vision-parser-error');invalid=false
  await click('#vision-high-retry');await audit('vision-high-ready');if(await page.locator('#vision-replace-ack').count())await page.locator('#vision-replace-ack').check();await click('#vision-analyze');await page.waitForSelector('#vision-review-form');await audit('vision-high-review')
  const high=requests.at(-1);for(const p of high.messages[1].content.slice(1))assert.equal(p.image_url.detail,'high')
  const imageMetrics=async body=>page.evaluate(async body=>Promise.all(body.messages[1].content.filter(p=>p.type==='image_url').map(async p=>{const image=new Image();image.src=p.image_url.url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,bytes:atob(p.image_url.url.split(',')[1]).length,detail:p.image_url.detail}})),body)
  const fastImages=await imageMetrics(fast),highImages=await imageMetrics(high)
  for(const [i,part] of fast.messages[1].content.slice(1).entries())await fs.writeFile(`/tmp/ui-quality-${prod?'prod':'local'}-${width}-fast-${i}.jpg`,Buffer.from(part.image_url.url.split(',')[1],'base64'))
  assert.equal(fastImages[0].width,1400);assert.equal(fastImages[1].width,1000);assert.equal(highImages[0].width,1800);assert.ok(JSON.stringify(fast).length<JSON.stringify(high).length*.8,'fast actual payload reduction')
  await page.locator('#vision-reviewed').check();await click('#vision-save-log');await audit('vision-quantity');await page.locator('[name=meal]').selectOption('lunch');await page.locator('[name=grams]').fill('120');await click('#vision-intake-form [type=submit]');await audit('vision-preview');await click('#vision-edit');await audit('vision-preview-edit');assert.equal(await body.evaluate(e=>e.scrollTop),0);await close()
  // Explicit duplicate handling and deterministic saved-only completion in isolated test DB.
  await vision();await click('#vision-manual');await page.locator('[name=name]').fill(populated.foods[0].name);await page.locator('[name=brand]').fill(populated.foods[0].brand);await page.locator('[name=referenceGrams]').fill('100');await page.locator('[name=energyValue]').fill('123');await page.locator('#vision-reviewed').check();await click('#vision-review-form [type=submit]');await audit('vision-duplicate');await click('#vision-save-new');await audit('vision-save-preview');await click('#vision-confirm');await page.waitForSelector('#vision-finish');await audit('vision-done');await close()
  // Text scale stress; landscape smoke separately refreshes the shared stable viewport baseline.
  for(const scale of [120,140]){await page.addStyleTag({content:`html { font-size:${scale}%; }`});for(const tab of ['today','plan','food','workout','progress']){await nav(tab);await audit('font'+scale+'-'+tab)}await nav('food');await click('#food-library');await click('#new-food');await audit('font'+scale+'-food-editor');await close();await click('#open-ai-assistant');await audit('font'+scale+'-assistant');await close()}
  await page.addStyleTag({content:'html { font-size:100%; }'})
  if(!prod)for(const [w,h] of [[812,375],[844,390]]){await page.setViewportSize({width:w,height:h});await page.evaluate(()=>dispatchEvent(new Event('orientationchange')));for(const tab of ['today','food','workout']){await nav(tab);await audit('landscape'+w+'-'+tab)}await click('#open-ai-assistant');await audit('landscape'+w+'-assistant');await close();await nav('food');await vision();await click('#vision-manual');await audit('landscape'+w+'-vision-review');await close()}
  assert.deepEqual(errors,[])
  const receipt={mode:prod?'production':'local',width,height,states:states.length,stateNames:states,source:{width:4032,height:3024,bytes:file.buffer.length},fastImages,highImages,fastTiming:JSON.parse(fastTiming),payloadReduction:1-JSON.stringify(fast).length/JSON.stringify(high).length,errors}
  receipts.push(receipt);console.log(JSON.stringify(receipt))
 } finally { await context.close() }
}} finally { await browser.close();await fs.writeFile(`/tmp/ui-quality-${prod?'prod':'local'}-receipt.json`,JSON.stringify(receipts,null,2)) }
