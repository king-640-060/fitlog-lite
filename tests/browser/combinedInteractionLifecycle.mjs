// Execute the actual production coordinator in a bounded DOM harness with controlled read/commit promises.
// This is separate from real-App data/gesture tests; it does not claim real IndexedDB latency injection.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {build} from 'vite'
const pw=await import(process.env.FITLOG_PLAYWRIGHT_MODULE),root=path.resolve(process.env.FITLOG_QA_ARTIFACT_ROOT);await fs.mkdir(root,{recursive:true})
const bundled=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:path.resolve('src/ui/horizontalNavigation.ts'),name:'FitLogNavigation',formats:['iife']}}}),code=(Array.isArray(bundled)?bundled[0]:bundled).output.find(x=>x.type==='chunk').code
await fs.writeFile(path.join(root,'actual-coordinator.iife.js'),code);const receipts=[]
for(const engine of ['chromium','webkit']){const b=await pw[engine].launch({headless:true});try{const p=await b.newPage({viewport:{width:390,height:844}});await p.setContent('<style>nav{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;bottom:0;width:358px}button{height:48px}.stage{position:relative;width:358px;height:700px;overflow:hidden}.page-preview{position:absolute;inset:0}.nav-capsule{position:absolute}</style><div class="stage"><div class="current">current</div></div><nav>'+['today','plan','food','workout','progress'].map(t=>`<button data-tab="${t}">${t}</button>`).join('')+'</nav>');await p.addScriptTag({content:code});await p.evaluate(()=>{
 window.events=[];for(const type of ['resize','pagehide','fitlog-sheet-open'])window.addEventListener(type,()=>events.push(type));window.commits=[];window.reads=[];window.disposals=0;window.errors=[];window.active='today';window.pendingCommit=null
 window.controller=FitLogNavigation.createPageNavigation({tabs:['today','plan','food','workout','progress'],stage:document.querySelector('.stage'),current:document.querySelector('.current'),nav:document.querySelector('nav'),active:()=>active,
 prepare:(tab,signal)=>new Promise(resolve=>{const element=document.createElement('div');element.className='page-preview';element.textContent=tab;signal.addEventListener('abort',()=>events.push('abort '+tab));const read={tab,signal,resolve:()=>resolve({element,dispose:()=>{element.remove();disposals++}})};reads.push(read)}),commit:async tab=>{commits.push(tab);active=tab;if(window.holdCommit)await new Promise(r=>pendingCommit=r)},fail:e=>errors.push(String(e))})
 })
 await p.waitForTimeout(100) // Drain the new viewport's initial resize before testing owned interruptions.
 // A slow old read resolves after a newer target; only the new target may become active.
 await p.evaluate(()=>{controller.go('progress');controller.go('plan');reads[1].resolve();reads[0].resolve()});await p.waitForTimeout(600);console.log(engine,'slow',await p.evaluate(()=>({active,commits,events,reads:reads.map(r=>({tab:r.tab,aborted:r.signal.aborted}))})));assert.deepEqual(await p.evaluate(()=>({active,commits,aborted:reads[0].signal.aborted,previews:document.querySelectorAll('.page-preview').length,errors})),{active:'plan',commits:['plan'],aborted:true,previews:0,errors:[]})
 console.log(engine,'slow done')
 // Explicit navigation remains available after a closed-keyboard native select; gesture arbitration still protects editing.
 await p.evaluate(()=>{const s=document.createElement('select');s.innerHTML='<option>native selection</option>';document.body.append(s);s.focus();controller.go('workout');reads.at(-1).resolve()});await p.waitForFunction(()=>active==='workout');await p.evaluate(()=>{document.querySelector('select').remove();controller.go('plan');reads.at(-1).resolve()});await p.waitForFunction(()=>active==='plan');
 // Repeated current route retains DOM and never commits/replays.
 await p.evaluate(()=>{window.retained=document.querySelector('.current');controller.go('plan')});assert(await p.evaluate(()=>retained===document.querySelector('.current')));assert.equal(await p.evaluate(()=>commits.length),3)
 console.log(engine,'repeat done')
 // Last click during an in-flight commit is queued; old completion cannot overwrite it.
 await p.evaluate(()=>{holdCommit=true;controller.go('food');reads.at(-1).resolve()});await p.waitForFunction(()=>pendingCommit!==null);await p.evaluate(()=>{document.querySelector('[data-tab=progress]').click();document.querySelector('[data-tab=today]').click();holdCommit=false;pendingCommit();pendingCommit=null});await p.waitForFunction(()=>reads.at(-1).tab==='today');await p.evaluate(()=>reads.at(-1).resolve());await p.waitForFunction(()=>active==='today');assert.equal(await p.evaluate(()=>active),'today');assert.deepEqual(await p.evaluate(()=>commits),['plan','workout','plan','food','today'])
 console.log(engine,'commit queue done')
 // Cancel pending preparation on resize, pagehide and modal opening; late results dispose.
 for(const type of ['pagehide','fitlog-sheet-open']){await p.evaluate(()=>{void controller.go('workout')});await p.evaluate(type=>{(type==='fitlog-sheet-open'?document:window).dispatchEvent(new Event(type));reads.at(-1).resolve()},type);await p.waitForTimeout(40);assert.equal(await p.evaluate(()=>active),'today');assert(await p.evaluate(()=>reads.at(-1).signal.aborted));assert.equal(await p.locator('.page-preview').count(),0)}
 // Resize re-prepares the last explicit target instead of swallowing its click.
 await p.evaluate(()=>{controller.go('workout');window.beforeResizeRead=reads.at(-1);document.querySelector('.stage').style.width='338px';dispatchEvent(new Event('resize'));beforeResizeRead.resolve();reads.at(-1).resolve()});await p.waitForFunction(()=>active==='workout');assert(await p.evaluate(()=>beforeResizeRead.signal.aborted));await p.evaluate(()=>{controller.go('today');reads.at(-1).resolve()});await p.waitForFunction(()=>active==='today')
 // Disposal while asynchronous work is pending releases it once, with no orphan presentation.
 await p.evaluate(()=>{controller.go('progress');controller.destroy();reads.at(-1).resolve()});await p.waitForTimeout(60);assert.equal(await p.locator('.page-preview,.nav-capsule').count(),0);assert.equal(await p.locator('.current').evaluate(e=>e.inert||!!e.style.transform),false);assert.deepEqual(await p.evaluate(()=>errors),[])
 const result={engine,type:'actual-coordinator-controlled-promise-harness',slowPreparation:true,lastClickDuringCommit:true,repeatNoCommit:true,resizePagehideModalAbort:true,destroyPendingRead:true,...await p.evaluate(()=>({commits,reads:reads.length,disposals,errors})),status:'PASS'};receipts.push(result);console.log(JSON.stringify(result));await p.close()}finally{await b.close()}}
await fs.writeFile(path.join(root,'receipt.json'),JSON.stringify({receipts},null,2))
