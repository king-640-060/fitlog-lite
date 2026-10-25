// Approved management v0.6.1; all browser contexts here are new synthetic installations.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const url=process.env.FITLOG_QA_URL||'http://127.0.0.1:5410/fitlog-lite/'
const root=process.env.FITLOG_QA_ARTIFACT_ROOT||'/tmp/fitlog-management-v061'
await fs.mkdir(root,{recursive:true})
const smoke=process.env.FITLOG_MANAGEMENT_SMOKE==='1',receipts=[]
const sizes=smoke?[[390,844,100,'light'],[320,568,200,'dark']]:[[320,812],[375,812],[390,844],[430,932]].flatMap(([w,h])=>[100,140,200].flatMap(f=>['light','dark'].map(t=>[w,h,f,t]))).concat([[390,568,100,'light'],[844,390,140,'dark']])
const selectedCases=process.env.FITLOG_MANAGEMENT_CASES
const cases=selectedCases?sizes.filter(([width,,font])=>selectedCases.split(',').includes(`${width}:${font}`)):sizes
if(!cases.length)throw Error('Empty management case selection')
const groups={food:['饮食资料',['food-library','diet-templates','nutrition-strategies']],training:['训练资料',['exercise-library','workout-templates']],data:['数据与安全',['import','backup','github-sync']],app:['设置与工具',['appearance','ai-settings','diagnostics','about']]}
const labels={'food-library':'食物库','diet-templates':'饮食模板','nutrition-strategies':'营养模板','exercise-library':'动作库','workout-templates':'训练模板',habits:'习惯',import:'导入数据',backup:'备份与恢复','github-sync':'GitHub 同步',appearance:'外观','ai-settings':'AI 设置',diagnostics:'版本诊断',about:'关于 FitLog Lite'}
const creates={'food-library':'食物','exercise-library':'动作','workout-templates':'训练模板','diet-templates':'饮食模板','nutrition-strategies':'营养模板',habits:'习惯'}
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
for(const engine of (process.env.FITLOG_MANAGEMENT_ENGINE?[process.env.FITLOG_MANAGEMENT_ENGINE]:['chromium','webkit'])){
 const browser=await pw[engine].launch({headless:true,...(engine==='chromium'&&process.env.FITLOG_CHROME?{executablePath:process.env.FITLOG_CHROME}:{})})
 try{for(const[width,height,font,theme]of cases){
  const name=`${engine}-${width}x${height}-${font}-${theme}`,dir=path.join(root,name);await fs.mkdir(dir,{recursive:true})
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:theme,timezoneId:'Asia/Shanghai',serviceWorkers:'block'})
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000)
  try{
   if(process.env.FITLOG_MANAGEMENT_VISUAL_THEME)await c.addInitScript(theme=>localStorage.setItem('fitlog-visual-theme-v1',theme),process.env.FITLOG_MANAGEMENT_VISUAL_THEME);await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();await p.addStyleTag({content:`html{font-size:${font}%}`})
   const read=()=>p.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}),rows={};for(const n of [...d.objectStoreNames].sort())rows[n]=await new Promise(r=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)))});const version=d.version;d.close();return{version,rows,config:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('fitlog-')).sort().map(k=>[k,localStorage.getItem(k)]))}})
   const before=await read();assert.equal(before.version,130);assert.equal(Object.keys(before.rows).length,22)
   const settle=()=>p.evaluate(async()=>{await new Promise(requestAnimationFrame);await Promise.all(document.querySelector('dialog[open]').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))})
   const title=async text=>{await p.waitForFunction(t=>document.querySelector('dialog[open] .modal-head h2')?.textContent===t,text);await p.waitForFunction(()=>document.querySelector('dialog[open]')?.dataset.managementLoading==='false');await settle()}
   const open=async()=>{await p.locator('#open-management').click();await title('管理中心')}
   const back=async text=>{await p.locator('[data-workspace-back]').click();if(await p.locator('.confirm-dialog[open]').count())await p.locator('.confirm-dialog [data-confirm]').click();await title(text)}
   const close=async()=>{await p.locator('.modal-head [data-close]').click();assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.evaluate(()=>document.body.style.position==='fixed'),false)}
   await p.evaluate(()=>{window.managementMain=document.querySelector('main');window.managementMainScroll=scrollY})
   await open();await p.evaluate(()=>{window.managementDialog=document.querySelector('dialog[open]');window.managementBody=managementDialog.querySelector('.modal-body');window.managementHead=managementDialog.querySelector('.modal-head');window.managementRoot=document.querySelector('#management-hub')})
   const geometry=[]
   const audit=async state=>{const m=await p.evaluate(()=>{const d=document.querySelector('dialog[open]'),body=d.querySelector('.modal-body'),r=d.getBoundingClientRect(),h=d.querySelector('.modal-head'),t=h.querySelector('h2').getBoundingClientRect(),x=h.querySelector('[data-close]').getBoundingClientRect();const visible=[...body.querySelectorAll('*')].filter(e=>e.getClientRects().length);return{same:d===managementDialog&&body===managementBody&&h===managementHead,count:document.querySelectorAll('.sheet[open]').length,top:r.top,height:r.height,bodyOverflow:body.scrollWidth-body.clientWidth,rootOverflow:document.documentElement.scrollWidth-innerWidth,overflow:visible.filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&(q.left<-.6||q.right>innerWidth+.6)}).map(e=>e.className),titleOverlap:t.right>x.left+.5,smallActions:visible.filter(e=>e.tagName==='BUTTON'&&!e.disabled).filter(e=>{const q=e.getBoundingClientRect();return q.width<43.5||q.height<43.5}).map(e=>e.id),fonts:visible.filter(e=>['INPUT','TEXTAREA','SELECT'].includes(e.tagName)&&!['checkbox','radio','hidden'].includes(e.type)).map(e=>parseFloat(getComputedStyle(e).fontSize)),duplicateIds:[...d.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i)}});assert.equal(m.same,true);assert.equal(m.count,1);assert.ok(m.bodyOverflow<=1);assert.ok(m.rootOverflow<=1);assert.deepEqual(m.overflow,[],state);assert.equal(m.titleOverlap,false);assert.deepEqual(m.smallActions,[],state);assert.ok(m.fonts.every(f=>f>=16));assert.deepEqual(m.duplicateIds,[]);if(geometry.length){assert.ok(Math.abs(m.height-geometry[0].height)<2);assert.ok(Math.abs(m.top-geometry[0].top)<2)}geometry.push({state,...m});return m}
   await audit('hub');assert.equal(await p.locator('[data-management-group]').count(),4);assert.equal(await p.locator('#management-personal-habits').count(),1);assert.equal(await p.locator('[data-workspace-back]').isVisible(),false);assert.equal(await p.locator('.modal-body').evaluate(e=>e.scrollTop),0)
   await p.screenshot({path:path.join(dir,'hub.png')})
   const rootStyles=await p.locator('[data-management-group=food]').evaluate(e=>{const s=getComputedStyle(e),i=getComputedStyle(e.querySelector('.management-category-icon')),t=getComputedStyle(e.querySelector('strong'));return{minHeight:s.minHeight,padding:s.padding,gap:s.gap,titleFont:t.fontSize,iconWidth:i.width,iconRadius:i.borderRadius,background:s.backgroundColor,color:s.color}})
   const allRoutes=[]
   for(const[id,[group,items]]of Object.entries(groups)){
    await p.locator(`[data-management-group=${id}]`).click();await title(group);await audit(id);assert.equal(await p.locator('.management-entry').count(),items.length);await p.screenshot({path:path.join(dir,id+'.png')})
    if((width===390&&font===100)||(width===320&&font===200)){for(const item of items){await p.locator('#more-'+item).click();await title(labels[item]);await audit(item);allRoutes.push(item);if(creates[item]){await p.getByRole('button',{name:'新建'+creates[item],exact:true}).click();await title('新建'+creates[item]);await audit(item+'-new');await p.screenshot({path:path.join(dir,item+'-editor.png')});await back(labels[item])}await back(group);assert.equal(await p.locator('[data-workspace-back]').getAttribute('aria-label'),'返回管理中心')}}
    await back('管理中心');assert.equal(await p.evaluate(()=>document.querySelector('#management-hub')===managementRoot),true)
   }
   await p.locator('#management-personal-habits').click();await title('习惯');await audit('habits');if((width===390&&font===100)||(width===320&&font===200)){await p.locator('dialog[open]').getByRole('button',{name:'新建习惯',exact:true}).click();await title('新建习惯');await audit('habits-new');await p.screenshot({path:path.join(dir,'habits-editor.png')});await back('习惯')}await back('管理中心');allRoutes.push('habits')
   const search=p.locator('#management-search');await search.fill('资料');assert.equal(await p.locator('[data-management-results] .management-entry').count(),5);await audit('search-multiple');await search.fill('语音');assert.equal(await p.locator('#more-ai-settings').count(),1);await p.locator('#more-ai-settings').click();await title('AI 设置');await back('管理中心');assert.equal(await search.inputValue(),'语音');await p.locator('[data-management-clear]').click();assert.equal(await search.inputValue(),'');assert.equal(await p.locator('[data-management-groups]').isVisible(),true)
   await search.fill('no-result-不存在');assert.match(await p.locator('[data-management-result-rows]').innerText(),/没有找到/);assert.equal(await p.locator('[data-management-result-rows] button').count(),0);await p.screenshot({path:path.join(dir,'no-results.png')});await p.locator('[data-management-clear]').click()
   // Keyboard navigation is actual browser focus; this does not claim physical VoiceOver.
   await search.focus();await p.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('data-management-group')),'food');await p.keyboard.press('Enter');await title('饮食资料');await back('管理中心')
   if((width===390&&font===100)||(width===320&&font===200)){for(let i=0;i<20;i++){await p.locator('[data-management-group=training]').click();await title('训练资料');await p.locator('#more-exercise-library').click();await title('动作库');await p.getByRole('button',{name:'新建动作',exact:true}).click();await title('新建动作');await back('动作库');await back('训练资料');await back('管理中心')}await audit('stress-20')}
   await close();assert.equal(await p.evaluate(()=>document.querySelector('main')===managementMain&&scrollY===managementMainScroll),true);await open();assert.equal(await search.inputValue(),'');assert.equal(await p.locator('.modal-body').evaluate(e=>e.scrollTop),0);await close()
   const after=await read();assert.deepEqual(after,before);assert.deepEqual(errors,[])
   const receipt={name,engine,width,height,font,theme,geometry,rootStyles,allRoutes,stores:22,dataBefore:hash(before.rows),dataAfter:hash(after.rows),configBefore:hash(before.config),configAfter:hash(after.config),search:true,keyboard:true,keyboardTraversal:engine==='webkit'?'Safari Option+Tab':'Tab',parentNodes:true,newOpenTop:true,stress:((width===390&&font===100)||(width===320&&font===200))?20:0,status:'PASS',physicalIPhone:'Pending'};receipts.push(receipt);await fs.writeFile(path.join(root,'results.json'),JSON.stringify(receipts,null,2));console.log('PASS '+name)
  }catch(error){await p.screenshot({path:path.join(dir,'FAIL.png')}).catch(()=>{});await fs.writeFile(path.join(dir,'FAIL.txt'),String(error.stack));throw error}finally{await c.close()}
 }}finally{await browser.close()}
}
console.log('PASS management v0.6.1 contexts '+receipts.length)
