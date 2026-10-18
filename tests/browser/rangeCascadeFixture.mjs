// Adapt invented legacy UI data to the newly approved expanded-delete happy path.
// Frozen inputs remain byte-for-byte unchanged. Dirty/missing/active cases are tested separately.
export function rangeCascadeQaFixture(input){
 const fixture=structuredClone(input),d=fixture.data
 const legacy=d.nutritionStrategyVariants.find(v=>v.id==='ux-a-v1')
 d.nutritionStrategyVariants.push({...legacy,id:'removed-historical-variant',name:'历史日方案',sortOrder:2})
 const foreign=d.nutritionCycles.find(c=>c.id==='ux-b-cycle');foreign.startDate='2026-07-01';foreign.endDate='2026-07-31'
 for(const day of d.nutritionCycleDays)if(day.cycleId===foreign.id)day.date=day.date.replace('2026-10-','2026-07-')
 const active=d.sleepSessions.find(s=>s.id==='sleep-active');if(active)active.startTime='2026-07-15T15:48:00Z'
 return fixture
}
export function expectedRangeDeleted(before){
 const inside=date=>date>='2025-06-01'&&date<='2025-06-03'||date>='2026-06-01'&&date<='2026-06-30'||date>='2026-08-01'&&date<='2026-10-17'||date>='2030-01-01'&&date<='2030-01-03'
 const ids={nutritionStrategyTemplates:['ux-a'],nutritionStrategyVariants:['ux-a-v1','ux-a-v2','removed-historical-variant'],nutritionStrategyPhases:['ux-a-old-phase','ux-a-active'],nutritionCycles:['ux-a-old-cycle','ux-a-future-cycle'],nutritionCycleDays:['ux-a-old-cycle-day-1','ux-a-old-cycle-day-2','ux-a-future-cycle-day-1','ux-a-future-cycle-day-2']}
 ids.nutritionTargets=before.nutritionTargets.filter(t=>t.strategySelection?.templateId==='ux-a'||t.cycleSelection?.templateId==='ux-a'||inside(t.date)).map(t=>t.id)
 for(const name of ['foodLogs','weights','waterLogs','sleepSessions','workouts','cardioSessions','pelvicFloorSessions','dietEvents','habitCheckIns'])ids[name]=before[name].filter(r=>inside(name==='sleepSessions'?(r.sleepNightDate??(r.id==='sleep-completed'?'2026-10-08':'2026-07-15')):r.date)).map(r=>r.id)
 return ids
}
