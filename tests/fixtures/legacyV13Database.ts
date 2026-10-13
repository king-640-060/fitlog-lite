// Frozen V13 synthetic schema. Never change after release.
import Dexie from 'dexie'
import { LEGACY_V12_SCHEMA } from './legacyV12Database'
export const LEGACY_V13_SCHEMA = {...LEGACY_V12_SCHEMA,weights:'id, date, createdAt',sleepSessions:'id, &activeKey, recordDate, startTime, sleepNightDate'}
export function legacyV13Database(name:string):Dexie {const d=new Dexie(name);d.version(13).stores(LEGACY_V13_SCHEMA);return d}
