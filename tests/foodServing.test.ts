import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { validateFoodInput, saveFood, logFood } from '../src/services/foodService'
import { foodQuantityGrams } from '../src/utils/foodQuantity'
import { buildImportPreview, parseFoodCsv, parseFoodJson } from '../src/services/importService'
import { exportBackup, restoreBackup } from '../src/services/backupService'
import { FoodVisionWrite } from '../src/services/foodVisionImportService'
import { legacyV8Database } from './fixtures/legacyV8Database'
import { legacyV9Database, LEGACY_V9_SCHEMA } from './fixtures/legacyV9Database'
import v8 from './fixtures/legacyV8Data.json'
import v9 from './fixtures/legacyV9Data.json'
import { encryptSyncText, decryptSyncText } from '../src/services/syncCryptoService'
import { syncDataHash } from '../src/utils/syncDataHash'
const databases: FitLogDatabase[]=[]
const make=()=>{const d=new FitLogDatabase(`serving-${crypto.randomUUID()}`);databases.push(d);return d}
const input={name:'酸奶',referenceGrams:100,servingGrams:150,calories:120,protein:10,carbs:8,fat:4}
afterEach(async()=>{vi.restoreAllMocks();for(const d of databases.splice(0)){d.close();await Dexie.delete(d.name)}})
describe('optional serving input and factual grams snapshots',()=>{
 it.each([undefined,'',null])('blank %s remains optional and never changes referenceGrams',value=>{expect(validateFoodInput({...input,servingGrams:value as never})).toMatchObject({referenceGrams:100,servingGrams:undefined});expect(foodQuantityGrams(225,'grams',{})).toBe(225);expect(()=>foodQuantityGrams(1,'servings',{})).toThrow('每份克数')})
 it.each([0,-1,NaN,Infinity,'bad'])('rejects invalid servingGrams %s',value=>expect(()=>validateFoodInput({...input,servingGrams:value as never})).toThrow('每份克数'))
 it.each([[.5,75],[1,150],[1.5,225],[2.25,337.5],[.123456,18.5184]])('converts %s servings to exact %s grams', (count,grams)=>expect(foodQuantityGrams(count,'servings',input)).toBeCloseTo(grams,12))
 it.each([0,-1,NaN,Infinity,''])('rejects invalid quantity %s',value=>expect(()=>foodQuantityGrams(value,'servings',input)).toThrow())
 it('grams and servings share the same nutrition snapshot; editing/removing a serving never rewrites history',async()=>{
  const d=make(),food=await saveFood(input,undefined,d),a=await logFood(food,225,'2026-10-03','lunch',d),b=await logFood(food,foodQuantityGrams(1.5,'servings',food),'2026-10-03','lunch',d)
  for(const key of ['grams','referenceGrams','totalCalories','totalProtein','totalCarbs','totalFat'] as const)expect(a[key]).toBe(b[key])
  expect(a.totalCalories).toBe(270);expect(a).not.toHaveProperty('servingGrams');expect(a).not.toHaveProperty('servingCount')
  await saveFood({...food,servingGrams:170,calories:999},food.id,d);expect(await d.foodLogs.get(a.id)).toEqual(a);expect(await d.foodLogs.get(b.id)).toEqual(b)
  await saveFood({...food,servingGrams:undefined},food.id,d);expect(await d.foodLogs.get(a.id)).toEqual(a)
 })
 it('supports optional JSON and CSV columns while preserving old imports and rejecting invalid rows',()=>{
  const json=buildImportPreview(parseFoodJson(JSON.stringify([input,{...input,name:'old',servingGrams:undefined}])),[])
  expect(json.errors).toEqual([]);expect(json.valid.map(f=>f.servingGrams)).toEqual([150,undefined])
  const csv=parseFoodCsv('name,reference_g,calories,servingGrams\nNew,100,120,150\nOld,100,120,\nBad,100,120,0')
  const result=buildImportPreview(csv.rows,[]);expect(result.valid.map(f=>f.servingGrams)).toEqual([150,undefined]);expect(result.errors).toHaveLength(1)
  expect(buildImportPreview(parseFoodCsv('name,reference_g,calories\nLegacy,100,120').rows,[]).valid[0]?.servingGrams).toBeUndefined()
 })
 it('Vision new Food does not infer servings; updating nutrition preserves manually entered serving mass',async()=>{
  const d=make(),plain={...input,servingGrams:undefined},first=await new FoodVisionWrite(plain,undefined,d).confirm();expect(first.food.servingGrams).toBeUndefined()
  const manual=await saveFood({...first.food,servingGrams:150},first.food.id,d)
  const updated=await new FoodVisionWrite({...plain,calories:130},undefined,d,undefined,{mode:'update',existing:manual}).confirm();expect(updated.food.servingGrams).toBe(150);expect(updated.food.referenceGrams).toBe(100)
 })
})
describe('one V8 → V9 migration and Backup V9 preservation',()=>{
 it('opens actual production V8, preserves all 17 stores, then retains new Food fields on reopen and Backup round-trip',async()=>{
  const d=make(),previous=legacyV8Database(d.name);await previous.open();await previous.transaction('rw',previous.tables,async()=>{for(const [store,rows] of Object.entries(v8))await previous.table(store).bulkAdd(rows)});previous.close()
  await d.open();expect(d.verno).toBe(10);expect(d.tables).toHaveLength(18);for(const [store,rows] of Object.entries(v8))for(const row of rows)expect(await d.table(store).get(row.id)).toEqual(row)
  expect((await d.foods.get('food-old'))?.servingGrams).toBeUndefined();expect(d.foods.schema.indexes.map(i=>i.name)).not.toContain('servingGrams');expect(d.foodLogs.schema.indexes.map(i=>i.name)).not.toContain('[date+meal]')
  await saveFood({...input,servingGrams:150.123456},'new-food',d);const backup=await exportBackup(d);expect(backup.schemaVersion).toBe(10);d.close();await d.open();expect((await exportBackup(d)).data).toEqual(backup.data)
  const target=make();await restoreBackup(JSON.parse(JSON.stringify(backup)),target);expect((await exportBackup(target)).data).toEqual(backup.data)
  await restoreBackup({app:'FitLog Lite',schemaVersion:8,exportedAt:backup.exportedAt,data:v8},target);expect((await target.foods.get('food-old'))?.servingGrams).toBeUndefined();expect((await exportBackup(target)).data.nutritionTargets).toEqual(v8.nutritionTargets)
 })
 it('new frozen V9 records survive reopen, first-populate does not reseed, and encrypted sync preserves serving/provenance',async()=>{
  const d=make(),frozen=legacyV9Database(d.name);await frozen.open();await frozen.transaction('rw',frozen.tables,async()=>{for(const [store,rows] of Object.entries(v9))await frozen.table(store).bulkAdd(rows)});frozen.close();await d.open()
  expect(d.tables.map(t=>t.name).sort()).toEqual([...Object.keys(LEGACY_V9_SCHEMA), 'dietEvents'].sort());expect(await d.dietEvents.count()).toBe(0);for(const [store,rows] of Object.entries(v9))for(const row of rows)expect(await d.table(store).get(row.id)).toEqual(row)
  expect(await d.exercises.count()).toBe(v9.exercises.length);const backup=await exportBackup(d),encrypted=await encryptSyncText(JSON.stringify(backup),'synthetic-password-only-123'),restored=JSON.parse(await decryptSyncText(encrypted,'synthetic-password-only-123'))
  const target=make();await restoreBackup(restored,target);expect((await exportBackup(target)).data).toEqual(backup.data);expect(encrypted.formatVersion).toBe(1);expect(JSON.stringify(encrypted)).not.toContain('PRIVATE_TEST_FOOD')
  const changed=structuredClone(backup);changed.data.foods[0]!.servingGrams=170;expect(await syncDataHash(changed.data)).not.toBe(await syncDataHash(backup.data))
 })
 it('invalid serving validates before replacement; injected storage failure rolls back all stores',async()=>{
  const d=make();await restoreBackup({app:'FitLog Lite',schemaVersion:9,exportedAt:'2026-10-03T00:00:00Z',data:v9},d);const good=await exportBackup(d)
  for(const invalid of [0,-1,NaN,Infinity]){const bad=structuredClone(good);bad.data.foods[0]!.servingGrams=invalid;await expect(restoreBackup(bad,d)).rejects.toThrow('servingGrams');expect((await exportBackup(d)).data).toEqual(good.data)}
  const incoming=structuredClone(good);incoming.data.foods[0]!.servingGrams=170;vi.spyOn(d.nutritionStrategyPhases,'bulkAdd').mockRejectedValueOnce(new Error('injected'));await expect(restoreBackup(incoming,d)).rejects.toThrow('injected');expect((await exportBackup(d)).data).toEqual(good.data)
 })
})
