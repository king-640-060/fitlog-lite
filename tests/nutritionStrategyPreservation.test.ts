import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { legacyV8Database, LEGACY_V8_SCHEMA } from './fixtures/legacyV8Database'
import records from './fixtures/legacyV8Data.json'
import { exportBackup, restoreBackup } from '../src/services/backupService'

describe('frozen V8 nutrition strategy data preservation',()=>{
  it('preserves every V8 snapshot and relationship on application reopen and Backup round-trip',async()=>{
    const name=`frozen-v8-${crypto.randomUUID()}`, legacy=legacyV8Database(name), current=new FitLogDatabase(name)
    try{
      expect(Object.keys(LEGACY_V8_SCHEMA)).toHaveLength(17);expect(Object.keys(records).sort()).toEqual(Object.keys(LEGACY_V8_SCHEMA).sort())
      await legacy.open();await legacy.transaction('rw',legacy.tables,async()=>{for(const [store,rows] of Object.entries(records))await legacy.table(store).bulkAdd(rows)});legacy.close()
      await current.open();for(const [store,rows] of Object.entries(records))for(const row of rows)expect(await current.table(store).get(row.id)).toEqual(row)
      const backup=await exportBackup(current);await restoreBackup(backup,current);expect((await exportBackup(current)).data).toEqual(backup.data)
      current.close();await current.open();expect((await exportBackup(current)).data).toEqual(backup.data)
    }finally{legacy.close();current.close();await Dexie.delete(name)}
  })
})
