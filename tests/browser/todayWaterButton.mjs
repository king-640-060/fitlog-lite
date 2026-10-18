// Real rendered styles and existing water actions, fresh synthetic contexts only.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE)
const url=process.env.FITLOG_QA_URL,root=process.env.FITLOG_QA_ARTIFACT_ROOT
assert(url&&root,'Explicit test URL and artifact directory required')
const before=process.env.FITLOG_WATER_BUTTON_PHASE==='before',receipts=[]
const styleKeys=['backgroundColor','color','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','minHeight','fontSize','fontWeight','borderTopWidth','opacity']
const baselinePath=process.env.FITLOG_WATER_BUTTON_BASELINE
if(!before)assert(baselinePath,'After verification requires a measured baseline receipt')
const baseline=before?[]:JSON.parse(await fs.readFile(baselinePath,'utf8')).receipts
await fs.mkdir(root,{recursive:true})
for(const engine of ['chromium','webkit']){
 const b=await pw[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.FITLOG_CHROME}:{})})
 try{for(const width of (before?[390]:[320,390,430,844]))for(const font of (before?[100]:[100,200]))for(const theme of ['light','dark']){
  const c=await b.newContext({viewport:{width,height:width===844?390:844},hasTouch:true,isMobile:true,colorScheme:theme,reducedMotion:'reduce',timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),p=await c.newPage(),errors=[],prefix=`${engine}-${width}-${font}-${theme}`
  p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.waterTouchInputs=[];document.addEventListener('pointerup',e=>{if(e.target instanceof Element&&e.target.closest('[data-water-toggle],[data-water-add],.water-undo'))waterTouchInputs.push({type:e.pointerType,target:e.target.closest('button')?.textContent})},true)})
  try{
   await p.goto(url,{waitUntil:'networkidle'});await p.locator('[data-water-toggle]').waitFor()
   await p.evaluate(font=>{document.documentElement.style.fontSize=16*font/100+'px';document.documentElement.style.setProperty('--safe-area-bottom','34px');window.waterRevealCalls=[];const original=Element.prototype.scrollBy;Element.prototype.scrollBy=function(...args){window.waterRevealCalls.push({owner:this.tagName,args});return original.apply(this,args)};const scroll=window.scrollBy.bind(window);window.scrollBy=(...args)=>{window.waterRevealCalls.push({owner:'window',args});return scroll(...args)}},font)
   const read=()=>p.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}),data={};for(const n of [...d.objectStoreNames].sort())data[n]=await new Promise(r=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)))});d.close();return data})
   const initial=await read();assert.equal(Object.keys(initial).length,22)
   const selectors={water:'[data-water-toggle]',weight:'#today-record-weight',sleep:'[data-sleep-action]',training:'#today-workout'}
   const styles=async()=>{const out={};for(const[k,s]of Object.entries(selectors))out[k]=await p.locator(s).evaluate((e,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(e)[k]])),styleKeys);return out}
   const peerEquality=s=>{for(const k of ['weight','sleep','training'])assert.deepEqual(s.water,s[k],prefix+' same visual properties '+k)}
   const settle=()=>p.waitForTimeout(180)
   const geometry=()=>p.locator('.water-card').evaluate(card=>{
    const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}},toggle=card.querySelector('[data-water-toggle]'),brief=card.querySelector('.water-brief'),stats=card.querySelector('.water-brief-stats'),icon=toggle.querySelector('.icon'),text=[...toggle.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()),range=new Range();range.selectNodeContents(text)
    let owner;for(let e=card.parentElement;e&&e!==document.body;e=e.parentElement)if(/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight){owner=e;break}
    const scroll=owner?owner.scrollTop:scrollY,maxScroll=owner?owner.scrollHeight-owner.clientHeight:document.documentElement.scrollHeight-innerHeight
    const labels=[...card.querySelectorAll('.water-brief-stats span')].filter(e=>getComputedStyle(e).visibility!=='hidden')
    return{toggle:box(toggle),brief:box(brief),stats:box(stats),icon:box(icon),text:range.getBoundingClientRect().toJSON(),arrow:new DOMMatrix(getComputedStyle(icon).transform).b,expanded:toggle.getAttribute('aria-expanded'),hidden:card.querySelector('#today-water-actions').hidden,actions:box(card.querySelector('#today-water-actions')),navTop:document.querySelector('.bottom-nav').getBoundingClientRect().top,scroll,maxScroll,anchor:brief.getBoundingClientRect().top+scroll,rootOverflow:document.documentElement.scrollWidth>innerWidth+1,clipped:labels.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className)}
   })
   const layout=g=>{assert(g.toggle.height>=44);assert(g.toggle.width>=44);assert(Math.abs(g.toggle.right-g.brief.right)<=.5,'right aligned');assert(g.stats.right<=g.toggle.x-7.5,'separate right column');assert(g.text.right<=g.icon.x+1,'text/icon do not overlap');assert(g.icon.right<=g.toggle.right+1);assert(!g.rootOverflow);assert.deepEqual(g.clipped,[])}
   const shot=async name=>{await p.locator('.water-card').screenshot({path:path.join(root,prefix+'-'+name+'.png'),animations:'disabled'})}
   assert.equal(await p.locator('[data-water-toggle]').getAttribute('aria-expanded'),'false');assert(await p.locator('#today-water-actions').isHidden())
   await p.locator('.water-card').scrollIntoViewIfNeeded();await settle()
   const closedStyles=await styles(),closedGeometry=await geometry();layout(closedGeometry);assert(Math.abs(closedGeometry.arrow-1)<.001);await shot('closed')
   if(before)assert.notEqual(closedStyles.water.backgroundColor,closedStyles.weight.backgroundColor,'baseline must reproduce visual mismatch')
   else{peerEquality(closedStyles);assert(!(await p.locator('[data-water-toggle]').getAttribute('class')).split(/\s+/).includes('text-btn'))}
   const states={}
   if(width===390&&font===100){
    for(const[name,selector]of Object.entries(selectors)){
     const el=p.locator(selector);await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await settle();states[name]={pressed:await el.evaluate((e,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(e)[k]])),styleKeys)};await p.mouse.move(0,0);await p.mouse.up()
     await el.evaluate(e=>e.disabled=true);states[name].disabled=await el.evaluate((e,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(e)[k]])),styleKeys);await el.evaluate(e=>e.disabled=false)
     await p.keyboard.press('Tab');await el.focus();states[name].keyboard=await el.evaluate(e=>({outlineStyle:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,outlineColor:getComputedStyle(e).outlineColor}));assert.equal(states[name].keyboard.outlineWidth,'2px')
    }
    if(!before)for(const name of ['weight','sleep','training'])for(const state of ['pressed','disabled','keyboard'])assert.deepEqual(states.water[state],states[name][state],prefix+' shared '+state+' '+name)
    await p.mouse.click(0,0)
   }
   await p.locator('[data-water-toggle]').scrollIntoViewIfNeeded();await settle();const preOpen=await geometry()
   await p.locator('[data-water-toggle]').tap();await settle();const openGeometry=await geometry(),openStyles=await styles();layout(openGeometry);assert.equal(openGeometry.expanded,'true');assert.equal(openGeometry.hidden,false);assert(Math.abs(openGeometry.arrow+1)<.001);assert(openGeometry.actions.bottom<=openGeometry.navTop-7,'actions revealed above nav');assert(Math.abs(openGeometry.anchor-preOpen.anchor)<=1,'no water-header reflow jump');assert.deepEqual(openStyles.water,closedStyles.water);await shot('expanded')
   await p.locator('[data-water-add="500"]').tap();await p.waitForFunction(()=>document.querySelector('[data-water-total]')?.textContent==='500');await settle();const recorded=await geometry();assert.equal(recorded.expanded,'true');assert(recorded.actions.bottom<=recorded.navTop-7);assert(Math.abs(recorded.anchor-openGeometry.anchor)<=1,'record preserves header');const callsBeforeUndo=await p.evaluate(()=>waterRevealCalls.length);await p.locator('.water-undo button').tap();await p.waitForFunction(()=>document.querySelector('[data-water-total]')?.textContent==='0');await settle();const undone=await geometry();assert.equal(undone.expanded,'true');assert.equal(await p.evaluate(()=>waterRevealCalls.length),callsBeforeUndo,'Undo adds no programmatic scroll');assert(Math.abs(undone.anchor-recorded.anchor)<=1);assert.deepEqual(await read(),initial,'500/Undo exact all22 restoration')
   await p.locator('[data-water-toggle]').scrollIntoViewIfNeeded();await settle();const preClose=await geometry(),callsBeforeClose=await p.evaluate(()=>waterRevealCalls.length);await p.locator('[data-water-toggle]').tap();await settle();const final=await geometry();assert.equal(final.expanded,'false');assert(final.hidden);layout(final);assert(Math.abs(final.arrow-1)<.001);assert.equal(await p.evaluate(()=>waterRevealCalls.length),callsBeforeClose,'collapse never requests a scroll');assert(Math.abs(final.scroll-Math.min(preClose.scroll,final.maxScroll))<=1,'only natural end-of-page scroll clamp');assert.deepEqual(await styles(),closedStyles);assert.deepEqual(await read(),initial)
   const previous=baseline.find(x=>x.engine===engine&&x.width===width&&x.font===font&&x.theme===theme);if(!before&&width===390&&font===100){assert(previous,'measured baseline case required');assert(Math.abs((undone.scroll-recorded.scroll)-previous.undoNativeScrollDelta)<=1,'no new Undo native-focus scroll versus baseline')}
   const comparison={};if(width===390&&font===100){for(const[name,selector]of Object.entries(selectors)){await p.locator(selector).screenshot({path:path.join(root,prefix+'-peer-'+name+'.png')});comparison[name]=selector}}
   assert.deepEqual(errors,[])
   const receipt={engine,width,font,theme,url,build:await p.locator('meta[name=fitlog-build]').getAttribute('content'),phase:before?'before':'after',expectedBaselineMismatch:before,closedStyles,openStyles,interactionStates:states,closedGeometry,openGeometry,recorded,undone,undoNativeScrollDelta:undone.scroll-recorded.scroll,finalGeometry:final,revealCalls:await p.evaluate(()=>waterRevealCalls),comparativeScreenshots:comparison,all22RestoredAfterUndo:true,touchInputs:await p.evaluate(()=>waterTouchInputs),errors,status:'PASS',physicalIPhone:'Pending'}
   receipts.push(receipt);await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({phase:before?'before':'after',receipts},null,2));console.log(JSON.stringify({engine,width,font,theme,status:'PASS'}))
  }catch(e){await p.screenshot({path:path.join(root,prefix+'-FAIL.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(root,prefix+'-FAIL.txt'),String(e.stack??e));throw e}finally{await c.close()}
 }}finally{await b.close()}
}
