import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { FitLogDatabase, PRODUCTION_DATABASE_NAME, STARTER_EXERCISE_NAMES } from '../src/db/database'
import { legacyV7Database, LEGACY_V7_SCHEMA } from './fixtures/legacyV7Database'
import records from './fixtures/legacyV7Data.json'
const names: string[] = []
const name = () => { const n = `preservation-${crypto.randomUUID()}`; names.push(n); return n }
afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n) })
async function fill(database: Dexie) { await database.transaction('rw', database.tables, async () => { for (const [store, rows] of Object.entries(records)) { await database.table(store).clear(); await database.table(store).bulkAdd(rows) } }) }
async function verify(database: Dexie) { for (const [store, rows] of Object.entries(records)) { expect(await database.table(store).count()).toBe(rows.length); for (const row of rows) expect(await database.table(store).get(row.id)).toEqual(row) } }
describe('Production data preservation release guard', () => {
  it('locks stable production identity and frozen V7 store coverage', () => { expect(PRODUCTION_DATABASE_NAME).toBe('fitlog-lite-db'); expect(Object.keys(LEGACY_V7_SCHEMA)).toHaveLength(14); expect(Object.keys(records).sort()).toEqual(Object.keys(LEGACY_V7_SCHEMA).sort()) })
  it('opens frozen V7 production data unchanged in the current application', async () => {
    const n = name(), legacy = legacyV7Database(n); await legacy.open(); await fill(legacy); legacy.close()
    const current = new FitLogDatabase(n); try { await current.open(); await verify(current) } finally { current.close() }
  })
  it('ordinary current database reopen preserves all records, nested arrays, optional fields and relationships', async () => {
    const n = name(), first = new FitLogDatabase(n); await first.open(); await fill(first); first.close()
    const reopened = new FitLogDatabase(n); try { await reopened.open(); await verify(reopened) } finally { reopened.close() }
  })
  it('populate runs once and never reseeds or overwrites user exercises on reopen', async () => {
    const n = name(), first = new FitLogDatabase(n); await first.open()
    expect((await first.exercises.toArray()).map(e => e.name).sort()).toEqual([...STARTER_EXERCISE_NAMES].sort())
    const original = (await first.exercises.toArray())[0]!; await first.exercises.put({ ...original, name: 'User renamed exercise', notes: 'keep' }); await first.exercises.delete((await first.exercises.toArray())[1]!.id)
    const before = await first.exercises.toArray(); first.close()
    const reopened = new FitLogDatabase(n); try { await reopened.open(); expect(await reopened.exercises.toArray()).toEqual(before) } finally { reopened.close() }
  })
})
