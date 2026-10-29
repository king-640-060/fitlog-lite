// Regression for the approved v0.9 Progress layout repair. Fresh synthetic contexts only.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {pw,url,root,seed,read,frame} from './interactionV09Harness.mjs'
import {waitForMainNavigation,clickProgressNavigation} from './navigationSettlement.mjs'
await fs.mkdir(root,{recursive:true})
const results=[],negative=process.env.FITLOG_LAYOUT_NEGATIVE==='1',mode=process.env.FITLOG_LAYOUT_MODE??'frames'
const check=(condition,message,failures)=>{if(!condition){failures.push(message);if(!negative)assert.fail(message)}}
const metrics=p=>p.locator('.progress-deck-root').evaluate(root=>{
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}
 const css=e=>{const s=getComputedStyle(e);return Object.fromEntries(['gridRow','gridColumn','position','transform','top','textAlign','justifyContent','fontSize','marginTop','marginBottom','paddingTop','overflowY'].map(k=>[k,s[k]]))}
 const active=[...root.querySelectorAll(':scope > .local-deck-stage > .local-deck-page')].map(page=>{
  const first=page.querySelector('[data-weight-module] > :first-child,.calendar-overview-head,:scope > .report-kinds')
  return {neighbor:page.classList.contains('local-deck-neighbor'),rect:rect(page),scrollTop:page.scrollTop,first:rect(first),gap:first?rect(first).y-rect(root.querySelector('.page-tabs')).bottom:null,
   calendar:page.querySelector('.calendar-overview-head')?{head:rect(page.querySelector('.calendar-overview-head')),grid:rect(page.querySelector('[id$="calendar-host"]')),controls:[...page.querySelector('.calendar-overview-head').children].map(e=>({text:e.textContent,id:e.id,rect:rect(e),css:css(e)}))}:null,
   dates:[...page.querySelectorAll('.report-period .fitlog-date-trigger')].map(e=>({id:e.id,rect:rect(e),css:css(e)}))}
 })
 const navs=[...root.querySelectorAll('.page-tabs,.report-kinds,.report-mode')].map(e=>({class:e.className,rect:rect(e)}))
 const ranges=[...root.querySelectorAll('.report-custom-range:not([hidden]) > button')].map(e=>({rect:rect(e),scroll:e.scrollWidth,client:e.clientWidth}))
 const period=root.querySelector('.report-daily-shell > .report-mode'),stage=root.querySelector('.report-period-stage'),leaf=stage?.querySelector(':scope > .local-deck-page:not(.local-deck-neighbor)'),date=leaf?.querySelector('.report-period:not([hidden]),.report-custom-range:not([hidden])')
 return {active,navs,ranges,dateGap:date&&period?rect(date).y-rect(period).bottom:null,leaf:rect(leaf),stage:rect(stage),documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,windowY:scrollY}
})
const cases=mode==='matrix'?[320,375,390,430].flatMap(w=>[100,140,200].flatMap(f=>['classic-light','classic-dark','light-native'].flatMap(t=>['no-preference','reduce'].map(m=>[w,844,f,t,m])))).concat([[844,390,200,'classic-dark','reduce'],[844,390,200,'light-native','no-preference']]):[[393,852,100,'classic-light','no-preference']]
for(const engine of process.env.FITLOG_LAYOUT_ENGINE?[process.env.FITLOG_LAYOUT_ENGINE]:['chromium','webkit']){
 const b=await pw[engine].launch()
 try{for(const [width,height,font,look,motion]of cases){
  const key=`${engine}-${width}-${height}-${font}-${look}-${motion}`,c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai',reducedMotion:motion,serviceWorkers:'block'}),p=await c.newPage(),failures=[],samples=[],errors=[]
  p.on('pageerror',e=>errors.push(e.message))
  try{
   await c.addInitScript(look=>{localStorage.setItem('fitlog-visual-theme-v1',look==='light-native'?'light-native':'classic');localStorage.setItem('fitlog-appearance-v1',look==='classic-dark'?'dark':'light')},look)
   await p.clock.setFixedTime(new Date('2026-09-28T12:00:00+08:00'));await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();await seed(p);await p.addStyleTag({content:`html{font-size:${font}%}`});const before=await read(p)
   await p.locator('[data-tab=progress]').click();await waitForMainNavigation(p,'progress')
   const capture=async(name,screenshot=false)=>{await frame(p);const m=await metrics(p);samples.push({name,...m});if(screenshot)await p.screenshot({path:path.join(root,key+'-'+name+'.png')});return m}
   const gap=m=>{for(const page of m.active)if(page.first&&page.scrollTop===0)check(Math.abs(page.gap-14)<=1,`first gap ${page.gap}`,failures)}
   gap(await capture('trend',true))
   if(mode==='frames'){
    const bounds=await p.locator('.progress-deck-root > .page-tabs').boundingBox(),x=bounds.x+bounds.width-20,y=bounds.y+bounds.height/2,cdp=engine==='chromium'?await c.newCDPSession(p):null
    const touch=async(type,dx)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{start:'touchStart',move:'touchMove',end:'touchEnd'}[type],touchPoints:type==='end'?[]:[{x:x-dx,y}]});else await p.evaluate(({type,x,y})=>{if(type==='start')window.qaLayoutTouch=document.elementFromPoint(x,y);const target=window.qaLayoutTouch,t={identifier:11,clientX:x,clientY:y,target},e=new Event('touch'+type,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:type==='end'?[]:[t]},changedTouches:{value:[t]}});target.dispatchEvent(e)},{type,x:x-dx,y})}
    await touch('start',0)
    for(const f of [0,.25,.5,.75,1]){await touch('move',Math.max(12,(bounds.width-1)*f));await p.waitForTimeout(100);const m=await metrics(p);samples.push({name:'calendar-frame-'+f,...m});await p.screenshot({path:path.join(root,key+'-calendar-frame-'+f+'.png')});const cal=m.active.find(a=>a.calendar);if(f>0)check(!!cal,'prepared calendar exists',failures);if(cal){gap(m);const [prev,month,today,next]=cal.calendar.controls;check(next.css.gridRow==='1'&&next.css.gridColumn==='3','next arrow prepared grid',failures);check(today.css.position==='absolute','today prepared absolute',failures);check(Math.max(...[prev,month,today,next].map(e=>e.rect.y+e.rect.height/2))-Math.min(...[prev,month,today,next].map(e=>e.rect.y+e.rect.height/2))<=1,'month header one row',failures)}}
    await touch('end',0);await p.waitForTimeout(300);await frame(p);await cdp?.detach();const cal=await capture('calendar-active',true);gap(cal)
    const reference=cal.active[0].calendar
    for(let i=0;i<20;i++){await clickProgressNavigation(p,'[data-progress-view=trend]');gap(await capture('return-trend-'+i));await clickProgressNavigation(p,'[data-progress-view=calendar]');const m=await capture('return-calendar-'+i);gap(m);check(Math.abs(m.active[0].calendar.grid.y-reference.grid.y)<=1,'calendar grid stable '+i,failures)}
   }
   await clickProgressNavigation(p,'[data-progress-view=reports]');gap(await capture('reports',true))
   const parents=(await metrics(p)).navs.slice(0,2)
   for(const period of ['week','month','custom','day']){
    // Collect RAFs from the real click through adoption, including prefixed prepared IDs.
    await p.evaluate(()=>{window.qaLayoutFrames=[];window.qaLayoutCollect=true;const tick=()=>{const root=document.querySelector('.progress-deck-root'),els=[...root.querySelectorAll('.fitlog-date-trigger')];window.qaLayoutFrames.push(els.map(e=>({id:e.id,align:getComputedStyle(e).textAlign,justify:getComputedStyle(e).justifyContent,x:e.getBoundingClientRect().x})));if(window.qaLayoutCollect)requestAnimationFrame(tick)};requestAnimationFrame(tick)})
    await clickProgressNavigation(p,`.report-mode [data-report-mode=${period}]`)
    const frames=await p.evaluate(()=>{window.qaLayoutCollect=false;return window.qaLayoutFrames});samples.push({name:'date-transition-'+period,frames})
    for(const values of frames)for(const e of values)check(e.align==='center'&&e.justify==='center','date centered during adoption '+e.id,failures)
    const m=await capture('period-'+period,true);gap(m);check(Math.abs(m.dateGap-12)<=1,`period gap ${m.dateGap}`,failures)
    for(let i=0;i<2;i++)for(const f of ['x','y','width','height'])check(Math.abs(parents[i].rect[f]-m.navs[i].rect[f])<=1,'parent nav stable '+f,failures)
    check(m.documentWidth<=width+1,'no horizontal overflow',failures);check(m.leaf.height>=43.5,'usable leaf >=44px',failures)
    for(const r of m.ranges)check(r.rect.height>=44&&r.rect.x>=-1&&r.rect.right<=width+1&&r.scroll<=r.client+1,'custom date target bounds',failures)
    if(m.ranges.length===2)check(Math.abs(m.ranges[0].rect.width-m.ranges[1].rect.width)<=1,'equal date columns',failures)
   }
   await clickProgressNavigation(p,'[data-progress-view=trend]');gap(await capture('reports-to-trend'))
   const scroller=p.locator('.progress-deck-stage > .deck-scroll:not(.local-deck-neighbor)');await scroller.evaluate(e=>{e.scrollTop=120});const scroll=await scroller.evaluate(e=>e.scrollTop);check(scroll>0,'trend real scroll',failures)
   await clickProgressNavigation(p,'[data-progress-view=calendar]');check((await metrics(p)).active[0].scrollTop===0,'calendar independent scroll',failures);await clickProgressNavigation(p,'[data-progress-view=trend]');check(Math.abs(await scroller.evaluate(e=>e.scrollTop)-scroll)<=1,'trend restores own scroll',failures)
   const beforeRefresh=await metrics(p);await p.evaluate(()=>document.dispatchEvent(new CustomEvent('fitlog-trend-recorded',{detail:'weight'})));await p.waitForTimeout(100);await frame(p);check(Math.abs((await metrics(p)).active[0].scrollTop-beforeRefresh.active[0].scrollTop)<=1,'async refresh retains scroll',failures)
   assert.deepEqual(await read(p),before,'all22 records exactly preserved');assert.deepEqual(errors,[])
   results.push({key,status:failures.length?'FAIL':'PASS',failures,samples,input:engine==='chromium'?'native CDP touch':'synthetic WebKit touch branch',all22Exact:true});console.log((failures.length?'FAIL ':'PASS ')+key+' '+failures.length)
  }catch(e){results.push({key,status:'FAIL',error:String(e),failures,samples});await p.screenshot({path:path.join(root,key+'-failure.png')});throw e}
  finally{await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({url,mode,negative,results},null,2));await c.close()}
 }}finally{await b.close()}
}
if(negative)assert(results.some(r=>r.status==='FAIL'),'old baseline must expose regression')
