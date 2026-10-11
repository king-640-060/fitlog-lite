import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import legacy from './fixtures/legacyV11Data.json'
import { restoreBackup, exportBackup } from '../src/services/backupService'
import { previewDayDeletion, deleteDayRecords, dayDeletionSources, clearDayRecords } from '../src/services/dayRecordsService'
import { readDailyRecords } from '../src/services/dailyRecordsSummary'
import { resolveSleepBusinessDate } from '../src/utils/sleepBusinessDate'
const dbs:FitLogDatabase[]=[]
async function make(){const d=new FitLogDatabase('day-delete-'+crypto.randomUUID());dbs.push(d);await restoreBackup({app:'FitLog Lite',schemaVersion:11,exportedAt:new Date().toISOString(),data:legacy},d);return d}
afterEach(async()=>{vi.restoreAllMocks();for(const d of dbs.splice(0)){d.close();await Dexie.delete(d.name)}})
describe('ten-category controlled deletion',()=>{
 for(const [category,store]of Object.entries(dayDeletionSources))it(`precisely deletes ${category}, preserving all other stores and other business dates`,async()=>{
  const d=await make(),all=await d.table(store).toArray(),record=all.find(r=>category==='sleep'?!!r.endTime:!!r.date)
  expect(record).toBeTruthy();const date=category==='sleep'?resolveSleepBusinessDate(record):record.date
  const before=await exportBackup(d),preview=await previewDayDeletion(date,[category as keyof typeof dayDeletionSources],false,d);expect(preview.counts[category as keyof typeof dayDeletionSources]).toBeGreaterThan(0);await deleteDayRecords(preview,d);const after=await exportBackup(d)
  for(const key of Object.keys(before.data))if(key!==store)expect(after.data[key as keyof typeof after.data]).toEqual(before.data[key as keyof typeof before.data]);else expect(after.data[key as keyof typeof after.data]).toEqual((before.data[key as keyof typeof before.data] as any[]).filter(r=>category==='sleep'?!(r.endTime&&resolveSleepBusinessDate(r)===date):r.date!==date))
 })
 it('all ten preview and target opt-in are separate, old seven-domain API still preserves recovery/habits/tasks',async()=>{const d=await make(),date=legacy.nutritionTargets[0]!.date,before=await exportBackup(d);const preview=await previewDayDeletion(date,Object.keys(dayDeletionSources) as Array<keyof typeof dayDeletionSources>,false,d);expect(preview.includeNutritionTarget).toBe(false);await deleteDayRecords(preview,d);expect(await d.nutritionTargets.toArray()).toEqual(before.data.nutritionTargets);const targets=await previewDayDeletion(date,[],true,d);expect(targets.counts.nutritionTarget).toBe(1);await deleteDayRecords(targets,d);expect(await d.nutritionTargets.where('date').equals(date).count()).toBe(0);await restoreBackup(before,d);await clearDayRecords(date,d);for(const key of ['sleepSessions','waterLogs','habitCheckIns','tasks','habits','taskTags'] as const)expect(await d.table(key).toArray()).toEqual(before.data[key])})
 it('stale preview rejects edits and additions atomically',async()=>{const d=await make(),date=legacy.tasks.find(t=>t.date)!.date!,p=await previewDayDeletion(date,['plan'],false,d);await d.tasks.update(legacy.tasks.find(t=>t.date===date)!.id,{title:'changed in another tab'});const before=await exportBackup(d);await expect(deleteDayRecords(p,d)).rejects.toThrow('已变化');expect((await exportBackup(d)).data).toEqual(before.data)})
 it('mid-transaction failure rolls back all categories and optional saved goal',async()=>{const d=await make(),date=legacy.nutritionTargets[0]!.date,before=await exportBackup(d),p=await previewDayDeletion(date,Object.keys(dayDeletionSources) as Array<keyof typeof dayDeletionSources>,true,d);vi.spyOn(d.tasks,'bulkDelete').mockRejectedValueOnce(new Error('disk failure'));await expect(deleteDayRecords(p,d)).rejects.toThrow('disk failure');expect((await exportBackup(d)).data).toEqual(before.data)})
 it('Task date counts planned unfinished tasks; sleep uses night resolver and excludes active',async()=>{const d=await make(),task=legacy.tasks.find(t=>t.date)!,s=await readDailyRecords(task.date!,d);expect(s.summary.planCount).toBe(legacy.tasks.filter(t=>t.date===task.date).length);const completed=legacy.sleepSessions.find(s=>s.endTime)!;const night=resolveSleepBusinessDate(completed as any),p=await previewDayDeletion(night,['sleep'],false,d);await deleteDayRecords(p,d);expect(await d.sleepSessions.where('activeKey').equals('active').count()).toBe(1);expect(await d.tasks.get(task.id)).toEqual(task)})
 it('rejects invalid dates and categories before accessing unrelated data',async()=>{const d=await make(),before=await exportBackup(d);await expect(previewDayDeletion('2026-02-30',['food'],false,d)).rejects.toThrow();await expect(previewDayDeletion('2026-10-11',['foods' as any],false,d)).rejects.toThrow();expect((await exportBackup(d)).data).toEqual(before.data)})
})
