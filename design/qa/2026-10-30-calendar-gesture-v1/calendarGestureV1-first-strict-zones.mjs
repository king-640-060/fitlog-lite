// Real production DOM. Chromium native CDP touch; WebKit synthetic touch branch.
// No real phone, personal profile or provider. Keep failed attempts as separate artifacts.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {pw,url,root,seed,read,frame} from './interactionV09Harness.mjs'
import {waitForMainNavigation,clickProgressNavigation} from './navigationSettlement.mjs'
await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'test-source.json'),JSON.stringify({sha256:createHash('sha256').update(await fs.readFile(new URL(import.meta.url))).digest('hex')},null,2))
const negative=process.env.FITLOG_CALENDAR_NEGATIVE==='1',matrix=process.env.FITLOG_CALENDAR_MATRIX==='1',results=[]
const engines=process.env.FITLOG_CALENDAR_ENGINE?[process.env.FITLOG_CALENDAR_ENGINE]:['chromium','webkit']
const widths=process.env.FITLOG_CALENDAR_WIDTH?[Number(process.env.FITLOG_CALENDAR_WIDTH)]:[320,375,390,430]
const cases=matrix?widths.flatMap(w=>[100,140,200].flatMap(f=>['classic-light','classic-dark','light-native'].flatMap(t=>['no-preference','reduce'].map(m=>[w,844,f,t,m])))).concat(widths.includes(430)?[[844,390,200,'classic-dark','reduce'],[844,390,200,'light-native','no-preference']]:[]):[[390,844,100,'classic-light','no-preference']]
const nav='.progress-deck-root > .page-tabs',owner='.progress-deck-stage > .deck-scroll:not(.local-deck-neighbor)',hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const metrics=p=>p.locator('.progress-deck-root').evaluate(root=>{
 const stage=root.querySelector('.progress-deck-stage'),page=stage.querySelector(':scope > .local-deck-page:not(.local-deck-neighbor)'),nav=root.querySelector('.page-tabs'),rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}}
 return{stage:{...rect(stage),transform:getComputedStyle(stage).transform},page:{...rect(page),transform:getComputedStyle(page).transform,scroll:page.scrollTop,scrollLeft:page.scrollLeft,contentX:Object.fromEntries(['.calendar-overview-head','.calendar-grid','.calendar-legend'].map(s=>[s,page.querySelector(s)?.getBoundingClientRect().x??null])),scrollHeight:page.scrollHeight,clientHeight:page.clientHeight},nav:rect(nav),selected:nav.querySelector('.active')?.dataset.progressView,main:document.querySelector('.bottom-nav .active')?.dataset.tab,neighbors:stage.querySelectorAll(':scope > .local-deck-neighbor').length,dialogs:document.querySelectorAll('dialog[open]').length,documentWidth:document.documentElement.scrollWidth,windowY:scrollY}
})
for(const engine of engines){
 const b=await pw[engine].launch()
 try{for(const[width,height,font,theme,motion]of cases.filter(c=>process.env.FITLOG_CALENDAR_LANDSCAPE_ONLY==='1'?c[1]===390:true)){
  const key=`${engine}-${width}-${height}-${font}-${theme}-${motion}`,c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai',serviceWorkers:'block',reducedMotion:motion}),p=await c.newPage(),samples=[],failures=[],errors=[]
  let cdp
  const check=(ok,message)=>{if(!ok){failures.push(message);if(!negative)assert.fail(message)}}
  p.on('pageerror',e=>errors.push(e.message))
  try{
   await c.addInitScript(theme=>{localStorage.setItem('fitlog-visual-theme-v1',theme==='light-native'?'light-native':'classic');localStorage.setItem('fitlog-appearance-v1',theme==='classic-dark'?'dark':'light')},theme)
   await p.clock.setFixedTime(new Date('2026-09-28T12:00:00+08:00'));await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();await seed(p);await p.addStyleTag({content:`html{font-size:${font}%}`})
   // Instrument mutations only after isolated fixture setup. Reading/navigation must issue none.
   await p.evaluate(()=>{window.qaCalendarWrites=[];for(const name of ['add','put','delete','clear']){const original=IDBObjectStore.prototype[name];IDBObjectStore.prototype[name]=function(...args){qaCalendarWrites.push({store:this.name,method:name});return original.apply(this,args)}}})
   const before=await read(p),config=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))
   await p.locator('[data-tab=progress]').click();await waitForMainNavigation(p,'progress');await clickProgressNavigation(p,'[data-progress-view=calendar]')
   if(engine==='chromium')cdp=await c.newCDPSession(p)
   const dispatch=async(type,x,y)=>{
    if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{start:'touchStart',move:'touchMove',end:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['end','cancel'].includes(type)?[]:[{x,y}]})
    else await p.evaluate(({type,x,y})=>{if(type==='start')window.qaCalendarTarget=document.elementFromPoint(x,y);const target=window.qaCalendarTarget,t={identifier:23,clientX:x,clientY:y,target},e=new Event('touch'+type,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:['end','cancel'].includes(type)?[]:[t]},changedTouches:{value:[t]}});target.dispatchEvent(e);if(type==='move')window.qaCalendarPrevented=e.defaultPrevented},{type,x,y})
   }
   const origins=[['date-number','.calendar-day-number'],['date-marker','.calendar-day-details'],['date-blank','.calendar-day'],['month-title','.calendar-month'],['month-left-blank','.calendar-overview-head'],['month-right-blank','.calendar-overview-head'],['weekday','.calendar-weekdays'],['legend','.calendar-legend'],['below-grid',owner]]
   const point=async(label,selector)=>{
    const el=p.locator(selector).first();await el.scrollIntoViewIfNeeded();await frame(p)
    return el.evaluate((e,label)=>{const r=e.getBoundingClientRect(),o=e.closest('.deck-scroll'),or=o.getBoundingClientRect(),min=Math.max(or.top+.25,document.querySelector('.progress-deck-root > .page-tabs').getBoundingClientRect().bottom+.25),max=Math.min(or.bottom-3,document.querySelector('.bottom-nav').getBoundingClientRect().top-3);let x=r.x+r.width/2,y=Math.max(min,Math.min(max,r.y+Math.min(r.height/2,20)));if(label==='month-left-blank'){x=r.x+48;y=r.y+.5}else if(label==='month-right-blank'){x=r.right-48;y=r.y+.5}else if(label==='date-blank'){x=r.x+r.width-3;y=r.y+r.height-4}else if(label==='below-grid'){o.scrollTop=o.scrollHeight;const bottom=document.querySelector('.bottom-nav').getBoundingClientRect().top;window.scrollBy(0,Math.max(0,o.getBoundingClientRect().bottom-bottom+8));const visible=o.getBoundingClientRect();y=visible.bottom-5;x=visible.x+visible.width/2}if(label!=='below-grid')y=Math.max(min,Math.min(max,y));o.scrollLeft=0;const target=document.elementFromPoint(x,y);return{x,y,actual:target?.outerHTML.slice(0,500),zone:label==='date-blank'?target?.closest('.calendar-grid')===e.closest('.calendar-grid'):label==='below-grid'?target===o:label==='month-left-blank'||label==='month-right-blank'?target===e:!!target&&e.contains(target),inside:!!target&&o.contains(target),owner:target?.closest('.deck-scroll')===o}},label)
   }
   for(const[label,selector]of origins.filter(o=>process.env.FITLOG_CALENDAR_ZONES_ONLY==='1'?['month-left-blank','month-right-blank','below-grid'].includes(o[0]):true)){for(const[gesture,dx,dy,cancel]of [['left',-100,0,false],['right',100,0,false],['diagonal',-85,-60,false],['vertical',0,-90,false],['vertical-down',0,90,false],['diagonal-down',85,60,false],['cancel',-90,0,true]]){
    await clickProgressNavigation(p,'[data-progress-view=calendar]');await p.locator(owner).evaluate(e=>{e.scrollTop=0;e.scrollLeft=0});await p.evaluate(()=>window.scrollTo(0,0));const start=await point(label,selector)
    check(start.inside&&start.zone,label+' actual DOM hit belongs to calendar '+JSON.stringify(start));const initial=await metrics(p),frames=[]
    // Keep both directions on-screen without altering the real target ownership.
    const distance=dx>0?Math.min(dx,width-start.x-4):Math.max(dx,4-start.x)
    await dispatch('start',start.x,start.y)
    for(const f of [0,.25,.5,.75,1]){await dispatch('move',start.x+distance*f,Math.min(height-3,Math.max(3,start.y+dy*f)));await p.waitForTimeout(20);const m=await metrics(p);frames.push({fraction:f,...m});for(const key of Object.keys(initial.page.contentX)){check(Math.abs(m.page.contentX[key]-initial.page.contentX[key])<=1,`${label}/${gesture} internal ${key} dx`)}check(Math.abs(m.page.scrollLeft-initial.page.scrollLeft)<=1,`${label}/${gesture} native horizontal scroll`);check(Math.abs(m.page.x-initial.page.x)<=1,`${label}/${gesture} page dx ${m.page.x-initial.page.x}`);check(m.stage.transform===initial.stage.transform,`${label}/${gesture} stage transform`);check(m.selected==='calendar'&&m.main==='progress',`${label}/${gesture} selection`);check(m.neighbors===0,`${label}/${gesture} no preview`)}
    if(!matrix&&gesture==='left')await p.screenshot({path:path.join(root,key+'-'+label+'-mid.png')})
    if(cancel)await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await dispatch(cancel?'cancel':'end',start.x+distance,Math.min(height-3,Math.max(3,start.y+dy)));await p.waitForTimeout(negative?270:40);const end=await metrics(p);check(end.selected==='calendar'&&end.neighbors===0&&end.dialogs===0,`${label}/${gesture} no commit/ghost/date click`)
    samples.push({label,gesture,start,input:engine==='chromium'?'native CDP touch':'synthetic WebKit touch',initial,frames,end})
    if(negative&&failures.length)break
   }if(negative&&failures.length)break}
   if(!negative){
    await p.locator(owner).evaluate(e=>{e.scrollTop=0;e.scrollLeft=0});await p.evaluate(()=>window.scrollTo(0,0));await frame(p)
    const geometry=await p.locator(owner).evaluate(e=>({gap:e.querySelector('.calendar-overview-head').getBoundingClientRect().top-document.querySelector('.progress-deck-root > .page-tabs').getBoundingClientRect().bottom,head:e.querySelector('.calendar-overview-head').getBoundingClientRect().height,columns:getComputedStyle(e.querySelector('.calendar-grid')).gridTemplateColumns,scrollOwners:[e,...e.querySelectorAll('*')].filter(n=>['auto','scroll'].includes(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+1).map(n=>n.className),targetMin:Math.min(...[...e.querySelectorAll('.calendar-day')].map(n=>n.getBoundingClientRect().height))}))
    check(Math.abs(geometry.gap-14)<=1,'14px first gap');check(geometry.scrollOwners.length===1,'single calendar vertical scroll owner');check(geometry.targetMin>=44,'44px targets');check((await metrics(p)).documentWidth<=width+1,'no page horizontal overflow')
    samples.push({geometry});await p.screenshot({path:path.join(root,key+'-calendar.png')})
    // Vertical native touch in Chromium; WebKit's synthetic event cannot drive native scrolling.
    await p.locator(owner).evaluate(e=>{e.scrollTop=0});const r=await p.locator(owner).boundingBox(),x=r.x+r.width/2,y=Math.min(height-160,r.y+r.height-50)
    await dispatch('start',x,y);for(const dy of [20,40,80,120,160])await dispatch('move',x,y-dy);await dispatch('end',x,y-160);await p.waitForTimeout(100)
    const nativeScroll=await metrics(p);if(cdp)check(nativeScroll.page.scroll>0,'actual native vertical touch scroll');else{check(await p.evaluate(()=>qaCalendarPrevented)===false,'WebKit vertical touch not prevented');await p.locator(owner).evaluate(e=>{e.scrollTop=120});check((await metrics(p)).page.scroll>0,'WebKit native scroll owner accepts scroll')}
    if(cdp){await p.waitForTimeout(500);const beforeDown=(await metrics(p)).page.scroll;await dispatch('start',x,Math.max(r.y+20,y-160));for(const dy of [20,40,80,120])await dispatch('move',x,Math.max(r.y+20,y-160)+dy);await dispatch('end',x,y-40);await p.waitForTimeout(200);const afterDown=await metrics(p);check(afterDown.page.scroll<beforeDown,'actual native downward scroll returns');samples.push({beforeDown,afterDown})}samples.push({nativeScroll,webkitNativeTouchScroll:'Pending physical iPhone; synthetic event does not scroll'})
    await p.locator(owner).evaluate(e=>{e.scrollTop=0;e.scrollLeft=0});await p.evaluate(()=>window.scrollTo(0,0))
    // Real held navigation frames, commit, bounce and cancel. Both directions.
    for(const[dx,cancel]of [[-175,true],[-38,false],[-175,false],[175,false]]){
     const initial=await metrics(p),r=await p.locator(nav).boundingBox(),x=dx<0?r.x+r.width-30:r.x+35,y=r.y+r.height/2,frames=[]
     await dispatch('start',x,y)
     for(const f of [.2,.5,.8,1]){await dispatch('move',x+dx*f,y);await p.waitForTimeout(80);const m=await metrics(p);if(Math.abs(dx*f)>12){check(m.neighbors===1,'top navigation owns actual adjacent preview '+JSON.stringify({dx,f,m}));check(Math.abs(m.page.x-initial.page.x-dx*f)<=1,'top content tracks actual touch distance')}frames.push({fraction:f,...m})}
     if(!matrix)await p.screenshot({path:path.join(root,key+'-nav-'+dx+'-'+cancel+'.png')});await p.waitForTimeout(150);await dispatch(cancel?'cancel':'end',x+dx,y);await p.waitForTimeout(280);await frame(p);const end=await metrics(p)
     check(end.selected===(cancel||Math.abs(dx)<80?initial.selected:dx<0?'reports':'calendar'),'top commit/bounce/cancel');check(end.neighbors===0&&end.page.transform==='none','top cleanup');samples.push({navigation:true,dx,cancel,frames,end})
    }
    if(!matrix){
     const ownScroll={};for(const view of ['trend','reports','calendar']){await clickProgressNavigation(p,`[data-progress-view=${view}]`);const sc=view==='reports'?'.report-period-stage > .deck-scroll:not(.local-deck-neighbor)':owner;await p.locator(sc).evaluate(e=>{e.scrollTop=100});ownScroll[view]=await p.locator(sc).evaluate(e=>e.scrollTop)}
     const resources=async()=>{const v=await p.evaluate(()=>({neighbors:document.querySelectorAll('.local-deck-neighbor').length,dialogs:document.querySelectorAll('dialog[open]').length,transforms:[...document.querySelectorAll('.local-deck-page')].filter(e=>e.style.transform).length}));if(cdp){v.listeners={};for(const expression of ['window','document']){const{result}=await cdp.send('Runtime.evaluate',{expression});const{listeners}=await cdp.send('DOMDebugger.getEventListeners',{objectId:result.objectId});v.listeners[expression]=listeners.length}}return v}
     const baseline=await resources();for(let cycle=0;cycle<20;cycle++){for(const view of ['trend','calendar','reports','calendar']){await clickProgressNavigation(p,`[data-progress-view=${view}]`);const sc=view==='reports'?'.report-period-stage > .deck-scroll:not(.local-deck-neighbor)':owner;check(Math.abs(await p.locator(sc).evaluate(e=>e.scrollTop)-ownScroll[view])<=1,'own scroll '+view)}assert.deepEqual(await resources(),baseline,'listener/ghost cleanup cycle '+cycle)}
     samples.push({cycles:20,baseline,final:await resources(),ownScroll})
     await p.locator(owner).evaluate(e=>{e.scrollTop=0});for(const key of ['ArrowRight','Home','End','ArrowLeft']){await p.locator(nav+' .active').focus();await p.keyboard.press(key);await p.waitForTimeout(300);await frame(p)}check((await metrics(p)).selected==='calendar','Arrow/Home/End');
     const original=await p.locator('.calendar-month').innerText();await p.locator('#calendar-prev').click();await p.waitForFunction(t=>document.querySelector('.calendar-month')?.innerText!==t,original);await p.locator('#calendar-next').click();await p.waitForFunction(t=>document.querySelector('.calendar-month')?.innerText===t,original);await p.locator('#calendar-today').click();await p.locator('.calendar-day.today').waitFor();
     for(const date of ['2026-09-21','2026-09-28']){await p.locator(`.calendar-day[data-date="${date}"]`).click();await p.locator('dialog[open].calendar-detail-sheet').waitFor();assert.equal(await p.locator('dialog[open] [data-record-date]').getAttribute('data-record-date'),date);await p.locator('dialog[open] [data-record-category=food] > summary').click();const details=await p.locator('dialog[open]').innerText();check(date==='2026-09-28'?details.includes(before.foodLogs[0].foodName):!details.includes(before.foodLogs[0].foodName),'date details use actual record state');samples.push({date,details});await p.locator('dialog[open] [data-close]').first().click();await frame(p)}
     // Production deliberately keeps a fixed42-date grid, including logically4/5/6-week months.
     // Do not copy the prototype's variable row count or its month-summary demonstration.
     for(const date of ['2021-02-15','2026-02-15','2024-02-29','2026-08-15','2026-12-31','2027-01-01']){
      await p.clock.setFixedTime(new Date(date+'T12:00:00+08:00'));await p.locator('#calendar-today').click();await p.locator(`.calendar-day.today[data-date="${date}"]`).waitFor();await frame(p)
      const month=await p.locator(owner).evaluate(e=>({label:e.querySelector('.calendar-month').textContent,cells:e.querySelectorAll('.calendar-day').length,columns:getComputedStyle(e.querySelector('.calendar-grid')).gridTemplateColumns,scroll:e.scrollTop,width:e.scrollWidth,client:e.clientWidth,head:e.querySelector('.calendar-overview-head').getBoundingClientRect().height}))
      samples.push({monthDate:date,...month});check(month.cells===42&&month.columns.split(' ').length===7&&(await metrics(p)).documentWidth<=width+1,'short/long/leap/year-boundary month retains real42-date seven-column grid');await p.screenshot({path:path.join(root,key+'-month-'+date+'.png')})
     }
    }
   }
   const after=await read(p),afterConfig=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))),writes=await p.evaluate(()=>qaCalendarWrites)
   assert.deepEqual(after,before,'22 stores exact');assert.deepEqual(afterConfig,config,'all configuration exact');assert.deepEqual(writes,[],'all read-only calendar/navigation operations zero writes');assert.deepEqual(errors,[])
   results.push({key,status:failures.length?'FAIL':'PASS',failures,samples,all22Hash:hash(after),configurationHash:hash(afterConfig),configurationKeys:Object.keys(config),writes,errors,physicalIPhone:'Pending'});console.log((failures.length?'FAIL ':'PASS ')+key)
  }catch(error){results.push({key,status:'FAIL',error:String(error),failures,samples,errors});await p.screenshot({path:path.join(root,key+'-failure.png')});throw error}
  finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,negative,matrix,boundaryZonesOnly:process.env.FITLOG_CALENDAR_ZONES_ONLY==='1',results},null,2));await cdp?.detach();await c.close()}
 }}finally{await b.close()}
}
if(negative)assert(results.some(r=>r.status==='FAIL'),'must reproduce actual START regression')
