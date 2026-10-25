// Approved v0.5.1. Fresh synthetic contexts only; never a personal browser profile.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {waitForMainNavigation} from './navigationSettlement.mjs'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),url=process.env.FITLOG_QA_URL,root=path.resolve(process.env.FITLOG_QA_ARTIFACT_ROOT)
assert(url);await fs.mkdir(root,{recursive:true})
const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/legacyV13Data.json',import.meta.url))),results=[]
const diagnostic=!!process.env.FITLOG_LIGHT_DIAGNOSTIC
const smoke=!!process.env.FITLOG_LIGHT_SMOKE,baseline=!!process.env.FITLOG_LIGHT_BASELINE
const contexts=smoke?[[Number(process.env.FITLOG_LIGHT_WIDTH||390),844,Number(process.env.FITLOG_LIGHT_FONT||100),'no-preference']]:[...[320,375,390,430].flatMap(w=>[100,140,200].flatMap(f=>['no-preference','reduce'].map(m=>[w,w===430?932:844,f,m]))),[390,568,200,'no-preference'],[844,390,140,'reduce']]
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
for(const engine of process.env.FITLOG_LIGHT_ENGINE?[process.env.FITLOG_LIGHT_ENGINE]:['chromium','webkit']){
 const b=await pw[engine].launch({headless:true})
 try{for(const[width,height,font,motion]of contexts){
  const c=await b.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:motion,timezoneId:'Asia/Shanghai',serviceWorkers:'block'}),p=await c.newPage(),errors=[]
  p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000)
  await c.addInitScript(font=>{document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize=16*font/100+'px',{once:true})},font)
  const name=`${engine}-${width}x${height}-${font}-${motion}`,dir=path.join(root,name);await fs.mkdir(dir,{recursive:true})
  const read=()=>p.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}),rows={};for(const n of [...d.objectStoreNames].sort())rows[n]=await new Promise(r=>{const q=d.transaction(n).objectStore(n).getAll();q.onsuccess=()=>r(q.result.sort((a,b)=>a.id.localeCompare(b.id)))});d.close();return{rows,config:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))}})
  const nav=async tab=>{await p.locator(`.bottom-nav [data-tab=${tab}]`).click();await waitForMainNavigation(p,tab);await p.waitForTimeout(320);await p.evaluate(()=>scrollTo(0,0))}
  await p.goto(url,{waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor()
  const dates=await p.evaluate(()=>{const d=new Date(),local=v=>`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;return{today:local(d),previous:local(new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12))}})
  const checks=[],diagnostics=[]
  const geometryCheck=(actual,label)=>{if(diagnostic){if(actual.length)diagnostics.push({label,issues:actual})}else assert.deepEqual(actual,[],label)}
  for(const state of ['empty','one','multiple','long','limited']){
   const data=structuredClone(fixture),long='这是需要完整显示并在自己的列内自然换行的中文名称备注 '+ 'UnbrokenLongName'.repeat(6)
   for(const[key,rows]of Object.entries(data)){
    if(state==='empty'){data[key]=[];continue}
    data[key]=rows.filter(row=>key!=='sleepSessions'||row.endTime).map(row=>{if(row.date)row.date=dates.today;if(row.recordDate)row.recordDate=dates.today;if(key==='sleepSessions'){row.startTime=dates.previous+'T15:00:00Z';row.endTime=dates.today+'T00:30:00Z';row.durationMinutes=570;row.sleepNightDate=dates.previous;row.sleepStartLocalDate=dates.previous;row.sleepNightSource='manual'}if(state==='long'){for(const f of ['name','title','note','foodName','brand'])if(row[f]!==undefined)row[f]=long;if(row.exercises)for(const e of row.exercises)e.exerciseName=long}return row})
   }
   if(state!=='empty'){
    data.nutritionTargets=data.nutritionTargets.slice(0,1);data.habitCheckIns=data.habitCheckIns.slice(0,1);data.tasks=data.tasks.slice(0,1)
    if(state==='multiple'||state==='long')for(const key of ['foodLogs','workouts','cardioSessions','waterLogs','tasks'])data[key]=Array.from({length:3},(_,i)=>({...structuredClone(data[key][0]),id:'light-'+key+'-'+i}))
    data.workouts=data.workouts.filter(w=>w.finishedAt)
    data.weights=[{...data.weights[0],id:'light-weight-before',date:dates.previous,weightKg:72.4},{...data.weights[0],id:'light-weight-today',date:dates.today,weightKg:71.2}]
    if(state==='limited'){data.nutritionTargets=[];data.foodLogs=data.foodLogs.map(x=>{delete x.totalProtein;delete x.totalCarbs;delete x.totalFat;return x})}
   }
   await p.evaluate(async data=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('fitlog-lite-db');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});await new Promise((r,j)=>{const t=d.transaction([...d.objectStoreNames],'readwrite');for(const n of [...d.objectStoreNames]){const s=t.objectStore(n);s.clear();for(const row of data[n]??[])s.put(row)}t.oncomplete=r;t.onabort=()=>j(t.error)});d.close()},data)
   await p.reload({waitUntil:'networkidle'});await p.locator('#today-food-details').waitFor();const initial=await read()
   for(const tab of ['today','plan','food','workout','progress']){
    await nav(tab)
    const measure=()=>p.evaluate(()=>{
     const root=document.querySelector('#view'),issues=[],semantic=[],clipped=[],summaryPreviews=[],orphans=[],targets=[],visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[inert],.sr-only,.trend-slot-sizer')},bound={left:0,right:innerWidth}
     if(document.documentElement.scrollWidth>innerWidth+1)issues.push('document overflow')
     for(const e of root.querySelectorAll('*')){
      if(!visible(e)||e.closest('.food-date-rail,.trend-chart-shell')||['svg','path','circle','line','polyline','title','CANVAS'].includes(e.tagName))continue
      const r=e.getBoundingClientRect(),s=getComputedStyle(e)
      if(r.left<bound.left-1||r.right>bound.right+1)issues.push('bounds '+e.tagName+'.'+e.className)
      if(e.matches('button,a,summary,[role=button]')){targets.push({id:e.id||e.textContent.trim().slice(0,35),width:r.width,height:r.height});if(r.width<43.5||r.height<43.5)issues.push('target '+(e.id||e.textContent));if(e.scrollWidth>e.clientWidth+1)issues.push('clipped action '+(e.id||e.textContent))}
      if(e.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')&&parseFloat(s.fontSize)<16)issues.push('small input '+e.name)
      if(e.children.length===0&&e.textContent.trim()&&e.scrollWidth>e.clientWidth+1&&!['visible','auto','scroll'].includes(s.overflowX)&&s.webkitLineClamp==='none')(e.matches('.meal-preview-name,.diet-event-note')?summaryPreviews:clipped).push({text:e.textContent.slice(0,120),class:e.className,width:e.clientWidth,scroll:e.scrollWidth,reason:e.matches('.meal-preview-name')?'原有折叠餐次摘要，展开后逐条完整显示':'原有三行特殊饮食预览，编辑/日期详情保留完整原文'})
     }
     for(const el of root.querySelectorAll('.today-activity-status,.today-activity-meta,.training-summary-tile strong,.chart-selection > strong,.budget-number,.macro-value,.meal-kcal,.water-brief-total,.coach-stat > strong,.coach-comp-tile > strong,.coach-nutrient-actual')){
      if(!visible(el))continue
      const nodes=[],walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walk.nextNode()){const n=walk.currentNode;if(visible(n.parentElement))nodes.push(n)}
      const text=nodes.map(n=>n.textContent).join('');for(const m of text.matchAll(/[-−+]?\d[\d,.]*\s*(?:kcal|kg|ml|g|小时|分钟|分|秒|组|次|个动作)/g)){
       let at=0,start,end;for(const n of nodes){const next=at+n.textContent.length;if(!start&&m.index<next)start=[n,m.index-at];if(m.index+m[0].length<=next){end=[n,m.index+m[0].length-at];break}at=next}if(!start||!end)continue
       const range=document.createRange();range.setStart(...start);range.setEnd(...end);const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0),tops=[...new Set(rects.map(r=>Math.round(r.y)))];semantic.push({text:m[0],tops,rects:rects.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}))});if(rects.length>1&&Math.max(...rects.map(r=>r.top))>=Math.min(...rects.map(r=>r.bottom))-1)issues.push('split numeric/unit '+m[0])
      }
     }
     for(const el of root.querySelectorAll('h2,h3,button,.today-activity-status')){
      if(!visible(el))continue
      const text=el.textContent.trim();if(text.length<2||text.length>32||!/[\p{Script=Han}]/u.test(text.at(-1)))continue
      const lines=new Map(),walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
      while(walk.nextNode()){const n=walk.currentNode;if(!visible(n.parentElement))continue;for(let i=0;i<n.textContent.length;i++){if(!n.textContent[i].trim())continue;const q=document.createRange();q.setStart(n,i);q.setEnd(n,i+1);const r=q.getBoundingClientRect();if(!r.width||!r.height)continue;const k=Math.round(r.y);lines.set(k,(lines.get(k)||'')+n.textContent[i])}}
      if(lines.size>1){const last=[...lines].sort((a,b)=>a[0]-b[0]).at(-1);if(/^[\p{Script=Han}]$/u.test(last[1])){orphans.push({text,lines:[...lines]});issues.push('single Chinese orphan '+text)}}
     }
     const h=document.querySelector('h1'),surface=root.querySelector('.today-card,.training-card,.trend-module,.food-nutrition-hero'),primary=root.querySelector('.primary'),style=e=>e?{background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,radius:getComputedStyle(e).borderRadius,shadow:getComputedStyle(e).boxShadow}:null
     return{issues:[...new Set(issues)],clipped,summaryPreviews,orphans,targets,semantic,copy:root.innerText,styles:{header:style(h),surface:style(surface),primary:style(primary),accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()},rootWidth:root.getBoundingClientRect().width}
    });const audit=await measure()
    await p.screenshot({path:path.join(dir,state+'-'+tab+'.png'),fullPage:true});await fs.writeFile(path.join(dir,state+'-'+tab+'.json'),JSON.stringify(audit,null,2));geometryCheck(audit.issues,name+'/'+state+'/'+tab);geometryCheck(audit.clipped,name+'/'+state+'/'+tab+' clipped facts')
    if(!baseline){assert(!audit.copy.includes('今天也继续保持'));if(tab==='workout'&&state!=='empty'){assert.equal(await p.locator('.training-card:has(#start-workout) .training-card-note').count(),0);assert.equal(await p.locator('.training-card:has(#add-cardio) .training-card-note').count(),0)}}
    if(tab==='progress'&&((width===390&&font===100)||(width===320&&font===200))){for(const subview of ['calendar','reports']){await p.locator(`[data-progress-view=${subview}]`).click();await p.waitForTimeout(380);const sub=await measure();await p.screenshot({path:path.join(dir,state+'-progress-'+subview+'.png'),fullPage:true});await fs.writeFile(path.join(dir,state+'-progress-'+subview+'.json'),JSON.stringify(sub,null,2));geometryCheck(sub.issues,name+'/'+state+'/'+subview);geometryCheck(sub.clipped,name+'/'+state+'/'+subview+' clipped facts');checks.push({state,tab:'progress-'+subview,status:'PASS'})}}
    if(tab==='food'&&state!=='empty'){for(const toggle of await p.locator('[data-toggle-meal]').all()){await toggle.click();const records=p.locator('#'+await toggle.getAttribute('aria-controls'));await records.waitFor();assert((await records.innerText()).includes(data.foodLogs[0].foodName));assert(await records.evaluate(e=>[...e.querySelectorAll('.log-name,strong')].every(n=>n.scrollWidth<=n.clientWidth+1||getComputedStyle(n).overflowX==='visible')));await toggle.click()}}
    checks.push({state,tab,status:'PASS',semantic:audit.semantic,styles:audit.styles,summaryPreviews:audit.summaryPreviews})
   }
   assert.deepEqual(await read(),initial,'Readonly five-tab navigation must preserve all22/config: '+state)
  }
  assert.deepEqual(errors,[]);results.push({name,engine,width,height,font,motion,states:5,tabsPerState:5,readonly22Exact:true,checks,errors,diagnostics,status:diagnostics.length?'FAIL':'PASS',physicalIPhone:'Pending'});await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log((diagnostics.length?'FAIL ':'PASS ')+name);if(diagnostics.length)process.exitCode=1;await c.close()
 }}finally{await b.close()}
}
