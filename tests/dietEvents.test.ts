import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { saveDietEvent, deleteDietEvent, validateDietEvent, dietEventTitle } from '../src/services/dietEventService'
import { exportBackup, restoreBackup } from '../src/services/backupService'
import { loadMonthSummaries, getCalendarVisibleMarkers, getCalendarDayAccessibleLabel, hasDayRecords } from '../src/ui/calendarPage'
import { legacyV9Database, LEGACY_V9_SCHEMA } from './fixtures/legacyV9Database'
import { legacyV10Database, LEGACY_V10_SCHEMA } from './fixtures/legacyV10Database'
import v9 from './fixtures/legacyV9Data.json'
import v10 from './fixtures/legacyV10Data.json'
import { aiEnvironment } from './helpers/ai'
import { encryptSyncText, decryptSyncText } from '../src/services/syncCryptoService'
import { syncDataHash } from '../src/utils/syncDataHash'
const databases: FitLogDatabase[] = []
const make = () => { const d = new FitLogDatabase(`diet-${crypto.randomUUID()}`); databases.push(d); return d }
afterEach(async () => { for (const d of databases.splice(0)) { d.close(); await Dexie.delete(d.name) } })
const date = '2026-09-28'
describe('independent contextual DietEvent', () => {
  it('mark-only, decimal manual, edit, several meals/dates and delete affect only this domain', async () => {
    const d = make(); await restoreBackup({ app: 'FitLog Lite', schemaVersion: 9, exportedAt: '2026-10-03T00:00:00Z', data: v9 }, d)
    const before = (await exportBackup(d)).data
    const dinner = await saveDietEvent({ date, scope: 'dinner' }, 'dinner', d)
    expect(dinner.note).toBeUndefined(); expect(dinner.estimatedCalories).toBeUndefined()
    await saveDietEvent({ date, scope: 'lunch', estimatedCalories: 1800.125, estimateSource: 'manual' }, 'lunch', d)
    await saveDietEvent({ date: '2026-09-29', scope: 'day', note: '旅行' }, 'tomorrow', d)
    await saveDietEvent({ date, scope: 'dinner', note: '聚餐', estimatedCalories: 1600.25, estimateSource: 'manual' }, dinner.id, d)
    expect(await d.dietEvents.count()).toBe(3); expect((await d.dietEvents.get(dinner.id))?.createdAt).toBe(dinner.createdAt)
    await deleteDietEvent(dinner.id, d); expect(await d.dietEvents.count()).toBe(2); expect(await d.dietEvents.get('tomorrow')).toBeTruthy()
    const after = (await exportBackup(d)).data; for (const key of Object.keys(v9)) expect(after[key as keyof typeof after]).toEqual(before[key as keyof typeof before])
    const summary = (await loadMonthSummaries(2026, 8, d)).get(date)!
    expect(summary.calories).toBe(100); expect(summary.foodLogCount).toBe(1); expect(summary.dietEvents).toHaveLength(1)
    expect(getCalendarVisibleMarkers(summary)).toEqual({ visible: ['food','strength','cardio','dietEvent'], hiddenCount: 2 })
    expect(getCalendarDayAccessibleLabel(date, summary)).toContain('放纵餐'); expect(getCalendarDayAccessibleLabel('2026-09-29', (await loadMonthSummaries(2026,8,d)).get('2026-09-29'))).toContain('放纵日')
  })
  it('event-only day has records but has no food intake/food marker; day title distinct', async () => {
    const d=make(); await saveDietEvent({date,scope:'day'},'only',d);const summary=(await loadMonthSummaries(2026,8,d)).get(date)!
    expect(hasDayRecords(summary)).toBe(true);expect(summary.calories).toBeUndefined();expect(summary.foodLogCount).toBe(0);expect(getCalendarVisibleMarkers(summary).visible).toEqual(['dietEvent']);expect(dietEventTitle({scope:'day'})).toBe('放纵日')
  })
  it.each([-1,NaN,Infinity,'123'])('rejects invalid estimate %s before write',async value=>{const d=make();await expect(saveDietEvent({date,scope:'dinner',estimatedCalories:value as number,estimateSource:'manual'},'bad',d)).rejects.toThrow();expect(await d.dietEvents.count()).toBe(0)})
  it('strict source/range/day/date/note/extra-field validation',async()=>{
    const d=make(),good=await saveDietEvent({date,scope:'dinner',estimatedCalories:1600,estimatedCaloriesLow:1200,estimatedCaloriesHigh:2000,estimateSource:'photo'},'photo',d)
    for(const override of [{scope:'day'},{estimatedCaloriesLow:2100},{estimateSource:'unknown'},{date:'2026-02-30'},{note:'x'.repeat(1001)},{image:'data:image/jpeg;base64,xxx'},{estimateSource:'manual'}])expect(()=>validateDietEvent({...good,...override})).toThrow()
  })
  it('nutrition day/range READ includes separate bounded context without adding calories and enforces permissions',async()=>{
    const e=aiEnvironment();databases.push(e.database);await restoreBackup({app:'FitLog Lite',schemaVersion:9,exportedAt:'2026-10-03T00:00:00Z',data:v9},e.database)
    for(let i=0;i<12;i++)await saveDietEvent({date,scope:'dinner',note:'x'.repeat(1000),estimatedCalories:1800,estimateSource:'manual'},`event-${i}`,e.database)
    const day=await e.execute('get_nutrition_day',{date});expect(day.actual.calories).toBe(100);expect(day.dietEvents.contextualOnly).toBe(true);expect(day.dietEvents.events).toHaveLength(10);expect(day.dietEvents.truncated).toBe(true);expect(day.dietEvents.events[0].note).toHaveLength(240)
    const range=await e.execute('get_nutrition_range',{start:date,end:date});expect(range.days[0].actual.calories).toBe(100);expect(range.days[0].dietEvents.events).toHaveLength(10)
    e.permissions.read.food=false;expect((await e.execute('get_nutrition_day',{date})).error).toBe('permission_denied')
  })
})
describe('explicit V9 → V10 preservation and Backup V10',()=>{
  it('all 17 frozen rows/indexes preserved, one empty new store; reopening never reseeds or infers',async()=>{
    const d=make(),old=legacyV9Database(d.name);await old.open();await old.transaction('rw',old.tables,async()=>{for(const [store,rows] of Object.entries(v9))await old.table(store).bulkAdd(rows)});const indexes=old.tables.map(t=>({name:t.name,indexes:t.schema.indexes.map(i=>i.src)}));old.close();await d.open()
    expect(d.verno).toBe(10);expect(d.tables).toHaveLength(18);expect(await d.dietEvents.count()).toBe(0)
    expect(d.tables.filter(t=>t.name!=='dietEvents').map(t=>({name:t.name,indexes:t.schema.indexes.map(i=>i.src)}))).toEqual(indexes)
    for(const [store,rows] of Object.entries(v9))for(const row of rows)expect(await d.table(store).get(row.id)).toEqual(row)
    expect(await d.exercises.count()).toBe(v9.exercises.length);const before=await exportBackup(d);d.close();await d.open();expect((await exportBackup(d)).data).toEqual(before.data);expect(Object.keys(LEGACY_V9_SCHEMA)).toHaveLength(17)
  })
  it('new frozen V10 manual/photo/day notes survive reopen, Backup and encrypted envelope V1/hash',async()=>{
    expect(Object.keys(LEGACY_V10_SCHEMA)).toHaveLength(18);const d=make(),old=legacyV10Database(d.name);await old.open();await old.transaction('rw',old.tables,async()=>{for(const [store,rows] of Object.entries(v10))await old.table(store).bulkAdd(rows)});old.close();await d.open();const backup=await exportBackup(d);expect(backup.schemaVersion).toBe(10)
    const encrypted=await encryptSyncText(JSON.stringify(backup),'synthetic-password-123456');expect(encrypted.formatVersion).toBe(1)
    const other=make();await restoreBackup(JSON.parse(await decryptSyncText(encrypted,'synthetic-password-123456')),other);expect((await exportBackup(other)).data).toEqual(backup.data)
    const hash=await syncDataHash(backup.data);await deleteDietEvent('diet-manual-v10',other);expect(await syncDataHash((await exportBackup(other)).data)).not.toBe(hash)
    d.close();await d.open();expect((await exportBackup(d)).data).toEqual(backup.data)
    expect(JSON.stringify(backup)).not.toMatch(/data:image|video-search-key|privacy-ack/)
  })
  it.each([1,2,3,4,5,6,7,8,9,10])('Restore V%s still accepted; old missing events become empty',async version=>{
    const d=make(),backup=await exportBackup(d),data:Record<string,unknown>=structuredClone(backup.data);if(version<10)delete data.dietEvents
    await restoreBackup({...backup,schemaVersion:version,data},d);expect(await d.dietEvents.count()).toBe(0)
  })
  it('malformed event rejects before replacement; injected failure rolls back every store',async()=>{
    const d=make();await restoreBackup({app:'FitLog Lite',schemaVersion:10,exportedAt:'2026-10-03T00:00:00Z',data:v10},d);const good=await exportBackup(d),bad=structuredClone(good);bad.data.dietEvents[0]!.scope='no' as never
    await expect(restoreBackup(bad,d)).rejects.toThrow();expect((await exportBackup(d)).data).toEqual(good.data)
    const incoming=structuredClone(good);incoming.data.dietEvents[0]!.note='changed';incoming.data.foods[0]!.name='changed'
    vi.spyOn(d.nutritionStrategyPhases,'bulkAdd').mockRejectedValueOnce(new Error('injected storage'));await expect(restoreBackup(incoming,d)).rejects.toThrow('injected storage');expect((await exportBackup(d)).data).toEqual(good.data)
  })
})
