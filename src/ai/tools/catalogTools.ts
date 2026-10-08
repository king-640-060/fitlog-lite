import type { Food, Exercise, WorkoutTemplateExercise, WorkoutTemplateSet, DietTemplateItem, NutritionStrategyVariant } from '../../db/types'
import { saveFood, validateFoodInput, type FoodInput } from '../../services/foodService'
import { saveExercise, validateWorkoutSet } from '../../services/workoutService'
import { saveWorkoutTemplate, normalizeWorkoutTemplate, saveDietTemplate, normalizeDietTemplate, dietTemplateItemFromFood } from '../../services/templateService'
import { getNutritionStrategy, saveNutritionStrategy } from '../../services/nutritionStrategyService'
import { normalizeNutritionGoal } from '../../services/nutritionTargetService'
import { requiredText } from '../../utils/validation'
import { AiError } from '../security'
import { defineTool, objectSchema, stringSchema, numberSchema, arraySchema, enumSchema } from './types'
import type { AiTool, AiToolEnvironment, AiSchema } from './types'
import type { AiScope } from '../types'

const id = stringSchema(200), name = stringSchema(80), note = {...stringSchema(2000),minLength:0}
const goals = { calories: numberSchema(0,100000), protein: numberSchema(0,10000), carbs: numberSchema(0,10000), fat: numberSchema(0,10000) }
const foodFields = { name, brand: {...stringSchema(200),minLength:0}, referenceGrams: numberSchema(.000001,100000), servingGrams: numberSchema(.000001,100000), ...goals }
const identity = { action: enumSchema('create','update'), id, name }
const patchList = (item: AiSchema, max = 40) => arraySchema(item,max,0)
const orderFields = { removeIds: patchList(id), order: patchList(id) }
const setFields = { id, reps: {type:'integer', minimum:1, maximum:10000} as AiSchema, weightKg: numberSchema(0,10000), rpe: numberSchema(1,10), note }
const sets = patchList(objectSchema(setFields,[]))
const exerciseFields = { id, exerciseRef:id, note, sets, removeSetIds:patchList(id), setOrder:patchList(id) }
const keyFood = objectSchema({ key:id, ...foodFields }, ['key','name','referenceGrams','calories'])
const keyExercise = objectSchema({ key:id,name,notes:note }, ['key','name'])
const labels = {food:'食物',exercise:'动作',workout:'训练模板',diet:'饮食模板',strategy:'营养模板'} as const
const tablesByKind = {food:['foods'],exercise:['exercises'],workout:['exercises','workoutTemplates'],diet:['foods','dietTemplates'],strategy:['nutritionStrategyTemplates','nutritionStrategyVariants']} as const
const scopeByKind:Record<Kind,AiScope> = {food:'food',exercise:'training',workout:'training',diet:'food',strategy:'nutritionTargets'}
type Kind = keyof typeof labels
type Identity = {action:'create'|'update';id?:string;name?:string}
type SetPatch = Partial<WorkoutTemplateSet>
type ExercisePatch = {id?:string;exerciseRef?:string;note?:string;sets?:SetPatch[];removeSetIds?:string[];setOrder?:string[]}
type ListChanges<T> = {removeIds?:string[];order?:string[]} & T

function fail(message:string):never { throw new AiError('catalog_validation',message) }
const normalized = (s:string) => s.normalize('NFKC').trim().toLocaleLowerCase()
function uniqueName(rows:{id:string;name:string}[], value:string, ownId?:string):void {
  // Legacy duplicate names are valid when an explicit ID disambiguates an unchanged name.
  if(ownId&&rows.some(r=>r.id===ownId&&normalized(r.name)===normalized(value)))return
  if(rows.some(r=>r.id!==ownId&&normalized(r.name)===normalized(value)))fail('存在同名项目，请查询并确认要编辑的对象，不能重复创建')
}
function target<T extends {id:string;name:string}>(rows:T[], args:Identity):T|undefined {
  if(args.action==='update') {if(!args.id)fail('编辑需要查询到的真实 ID');const row=rows.find(r=>r.id===args.id);if(!row)fail('项目已不存在，请重新查询');return row}
  if(args.id)fail('新建不能指定现有 ID')
  return undefined
}
/** Supplied nested IDs patch in place; explicit remove/order are the only destructive operations. */
function mergeList<T extends {id:string}, P extends {id?:string}>(old:T[], patches:P[]|undefined, remove:string[]|undefined, order:string[]|undefined, build:(patch:P,previous:T|undefined)=>T):T[] {
  const seen=new Set<string>(), result=old.map(r=>structuredClone(r))
  for(const patch of patches??[]) {
    if(patch.id&&seen.has(patch.id))fail('重复的嵌套项目 ID')
    if(patch.id)seen.add(patch.id)
    const index=patch.id?result.findIndex(r=>r.id===patch.id):-1
    if(patch.id&&index<0)fail('嵌套项目已不存在，请重新查询')
    const item=build(patch,index<0?undefined:result[index])
    if(index<0)result.push(item);else result[index]=item
  }
  for(const key of remove??[])if(!result.some(r=>r.id===key))fail('要移除的项目已不存在')
  const retained=result.filter(r=>!remove?.includes(r.id))
  if(order){if(order.length!==retained.length||new Set(order).size!==order.length||order.some(key=>!retained.some(r=>r.id===key)))fail('顺序必须包含全部保留项目的 ID');return order.map(key=>retained.find(r=>r.id===key)!)}
  return retained
}
function newReferences<T extends {id:string;name:string}>(rows:T[], additions:{key:string;name:string}[], build:(input:typeof additions[number])=>T) {
  const refs=new Map(rows.map(row=>[row.id,row])), created:T[]=[]
  for(const addition of additions){if(refs.has(addition.key))fail('新项目 key 重复');uniqueName([...rows,...created],addition.name);const item=build(addition);refs.set(addition.key,item);created.push(item)}
  return {refs,created}
}
export interface CatalogPreview {catalog:true;kind:Kind;action:'create'|'update';name:string;writeCount:number;summary:string[];details:string[]}
function valueLines(value:unknown):string[] {
  const row=value as Record<string,unknown>, out:string[]=[]
  const fields:Record<string,string>={name:'名称',brand:'品牌',notes:'备注',description:'说明',referenceGrams:'基准重量 g',servingGrams:'每份克数 g',calories:'热量 kcal',protein:'蛋白质 g',carbs:'碳水 g',fat:'脂肪 g'}
  for(const[key,label]of Object.entries(fields))if(key in row)out.push(`${label}：${row[key]??'未设置'}`)
  for(const e of (row.exercises??[]) as WorkoutTemplateExercise[]){out.push(`动作：${e.exerciseName}${e.note?` · ${e.note}`:''}`);e.sets.forEach((s,i)=>out.push(`第${i+1}组 · ${s.reps}次 · 重量 ${s.weightKg===undefined?'未设置':`${s.weightKg} kg`} · RPE ${s.rpe??'未设置'}${s.note?` · ${s.note}`:''}`))}
  for(const f of (row.items??[]) as DietTemplateItem[])out.push(`食物：${f.foodName} · ${f.grams} g · 每${f.fallback.referenceGrams}g ${f.fallback.calories} kcal · 蛋白质 ${f.fallback.protein??'未知'} / 碳水 ${f.fallback.carbs??'未知'} / 脂肪 ${f.fallback.fat??'未知'}`)
  for(const v of (row.variants??[]) as NutritionStrategyVariant[])out.push(`日方案：${v.name} · 热量 ${v.calories??'未设置'} kcal · 蛋白质 ${v.protein??'未设置'} / 碳水 ${v.carbs??'未设置'} / 脂肪 ${v.fat??'未设置'} g`)
  return out
}
async function propose(kind:Kind,args:Identity,env:AiToolEnvironment,build:(rows:Record<string,unknown[]>)=>Promise<{before?:unknown;after:{name:string};created?:Array<Food|Exercise>;apply:()=>Promise<unknown>;writeCount?:number}>) {
  const tables=[...tablesByKind[kind]]
  return env.database.transaction('r',tables.map(t=>env.database.table(t)),async()=>{
    const readSource=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,await env.database.table(table).orderBy('id').toArray()])))
    const source=await readSource(), plan=await build(source), count=plan.writeCount??1+(plan.created?.length??0)
    const preview:CatalogPreview={catalog:true,kind,action:args.action,name:plan.after.name,writeCount:count,summary:[`${args.action==='create'?'新建':'编辑'}${labels[kind]} · ${plan.after.name}`,`涉及写入 ${count} 项`,...(plan.created??[]).map(r=>`同时新建${kind==='workout'?'动作':'食物'}：${r.name}`)],details:[...(plan.before?['修改前',...valueLines(plan.before)]:[]),'修改后',...valueLines(plan.after),...(plan.created??[]).flatMap(item=>[`同时新建${kind==='workout'?'动作':'食物'}：${item.name}`,...valueLines(item)])]}
    const proposal=env.proposals.create({title:`${args.action==='create'?'新建':'编辑'}${labels[kind]}`,domain:scopeByKind[kind],scopes:[scopeByKind[kind]],tables,source,readSource,preview,apply:async()=>({count,result:await plan.apply()})})
    return {proposalId:proposal.id,status:'pending',preview,message:'尚未写入，请用户在卡片确认一次。'}
  })
}
export const catalogTools:AiTool[]=[
  defineTool<{kind:Kind;query:string;limit?:number;id?:string}>('search_catalog','查询资料库/模板真实 ID 和嵌套定义，最多10项；编辑前使用','READ',[],objectSchema({kind:enumSchema('food','exercise','workout','diet','strategy'),query:{...stringSchema(200),minLength:0},limit:{type:'integer',minimum:1,maximum:10},id},['kind','query']),async(args,env)=>{
    if(!env.permissions().read[scopeByKind[args.kind]])throw new AiError('permission_denied','没有该资料库的读取权限')
    const table=tablesByKind[args.kind].at(-1)!, actual=args.kind==='strategy'?'nutritionStrategyTemplates':table
    const rows=await env.database.table(actual).filter(r=>!r.archivedAt&&(!args.id||r.id===args.id)&&normalized(r.name).includes(normalized(args.query))).limit((args.limit??10)+1).toArray()
    const truncated=rows.length>(args.limit??10), selected=rows.slice(0,args.limit??10)
    return {items:args.kind==='strategy'?await Promise.all(selected.map(r=>getNutritionStrategy(r.id,env.database))):selected,truncated}
  }),
  defineTool<Identity & Partial<FoodInput>>('propose_food','食物库新建/部分编辑；营养值必须用户提供，缺少名称/基准重量/kcal先追问','PROPOSAL',['food'],objectSchema({...identity,...foodFields},['action']),async(args,env)=>propose('food',args,env,async rows=>{
    const foods=rows.foods as Food[],old=target(foods,args),{action:_,id:__,...fields}=args
    const after=validateFoodInput({...old,...fields});uniqueName(foods,after.name,old?.id)
    return {before:old,after,apply:()=>saveFood(after,old?.id,env.database)}
  })),
  defineTool<Identity & {notes?:string}>('propose_exercise','动作库新建/部分编辑；同名不可重复创建','PROPOSAL',['training'],objectSchema({...identity,notes:note},['action']),async(args,env)=>propose('exercise',args,env,async rows=>{
    const exercises=rows.exercises as Exercise[],old=target(exercises,args),after={name:requiredText(args.name??old?.name,'动作名称'),notes:args.notes??old?.notes};uniqueName(exercises,after.name,old?.id)
    return {before:old,after,apply:()=>saveExercise(after.name,after.notes,old?.id,env.database)}
  })),
  defineTool<ListChanges<Identity & {description?:string;exercises?:ExercisePatch[];newExercises?:{key:string;name:string;notes?:string}[]}>>('propose_workout_template','新建/部分编辑训练模板；exercises和sets按嵌套id合并，未提及内容保留。newExercises仅用于用户明确同时新建，exerciseRef引用现有ID或本次key','PROPOSAL',['training'],objectSchema({...identity,description:note,exercises:patchList(objectSchema(exerciseFields,[])),newExercises:patchList(keyExercise,10),...orderFields},['action']),async(args,env)=>propose('workout',args,env,async rows=>{
    const old=target(rows.workoutTemplates as {id:string;name:string;exercises:WorkoutTemplateExercise[]}[],args)
    const stamp=new Date().toISOString(),{refs,created}=newReferences(rows.exercises as Exercise[],args.newExercises??[],input=>({id:crypto.randomUUID(),name:requiredText(input.name,'动作名称'),notes:(input as {notes?:string}).notes,createdAt:stamp,updatedAt:stamp}))
    const exercises=mergeList(old?.exercises??[],args.exercises,args.removeIds,args.order,(p,prev)=>{
      const actual=p.exerciseRef?refs.get(p.exerciseRef):undefined;if(p.exerciseRef&&!actual)fail('动作 ID 不存在，请查询或明确同时新建');if(!prev&&!actual)fail('新动作项目需要真实 exerciseRef')
      return {id:prev?.id??crypto.randomUUID(),exerciseId:actual?.id??prev?.exerciseId,exerciseName:actual?.name??prev!.exerciseName,note:p.note??prev?.note,sets:mergeList(prev?.sets??[],p.sets,p.removeSetIds,p.setOrder,(patch,previous)=>validateWorkoutSet({...previous,...patch}))}
    })
    if(!exercises.length)fail('训练模板至少需要一个动作')
    const after=normalizeWorkoutTemplate({...old,name:args.name??old?.name,description:args.description??(old as {description?:string}|undefined)?.description,exercises});uniqueName(rows.workoutTemplates as {id:string;name:string}[],after.name,old?.id)
    return {before:old,after,created,apply:async()=>{for(const e of created)await saveExercise(e.name,e.notes,e.id,env.database);return saveWorkoutTemplate(after,env.database)}}
  })),
  defineTool<ListChanges<Identity & {description?:string;items?:{id?:string;foodRef?:string;grams?:number}[];newFoods?:({key:string}&FoodInput)[]}>>('propose_diet_template','新建/部分编辑饮食模板；items按嵌套id合并，fallback由App从真实Food生成。newFoods仅用户明确同时新建，foodRef引用现有ID或本次key','PROPOSAL',['food'],objectSchema({...identity,description:note,items:patchList(objectSchema({id,foodRef:id,grams:numberSchema(.000001,100000)},[])),newFoods:patchList(keyFood,10),...orderFields},['action']),async(args,env)=>propose('diet',args,env,async rows=>{
    const old=target(rows.dietTemplates as {id:string;name:string;items:DietTemplateItem[]}[],args),stamp=new Date().toISOString()
    const {refs,created}=newReferences(rows.foods as Food[],args.newFoods??[],input=>({...validateFoodInput(input),id:crypto.randomUUID(),createdAt:stamp,updatedAt:stamp}))
    const items=mergeList(old?.items??[],args.items,args.removeIds,args.order,(p,prev)=>{
      if(!p.foodRef){if(!prev)fail('新食物项目需要真实 foodRef');return {...prev,grams:p.grams??prev.grams}}
      const food=refs.get(p.foodRef);if(!food)fail('Food ID 不存在，请查询或明确同时新建')
      return {...dietTemplateItemFromFood(food,p.grams??prev?.grams??NaN),id:prev?.id??crypto.randomUUID()}
    })
    if(!items.length)fail('饮食模板至少需要一种食物')
    const after=normalizeDietTemplate({...old,name:args.name??old?.name,description:args.description??(old as {description?:string}|undefined)?.description,items});uniqueName(rows.dietTemplates as {id:string;name:string}[],after.name,old?.id)
    return {before:old,after,created,apply:async()=>{for(const f of created)await saveFood(f,f.id,env.database);return saveDietTemplate(after,env.database)}}
  })),
  defineTool<ListChanges<Identity & {variants?:Array<Partial<NutritionStrategyVariant>>}>>('propose_nutrition_strategy','新建/部分编辑营养模板定义，variants按嵌套id合并，未提供营养项保持未设置；绝不激活或修改阶段/当日目标','PROPOSAL',['nutritionTargets'],objectSchema({...identity,variants:patchList(objectSchema({id,name,...goals},[]),32),...orderFields},['action']),async(args,env)=>propose('strategy',args,env,async rows=>{
    const old=target(rows.nutritionStrategyTemplates as {id:string;name:string;archivedAt?:string}[],args);if(old?.archivedAt)fail('已归档模板请复制为新模板')
    const previous=(rows.nutritionStrategyVariants as NutritionStrategyVariant[]).filter(v=>v.templateId===old?.id).sort((a,b)=>a.sortOrder-b.sortOrder)
    const variants=mergeList(previous,args.variants,args.removeIds,args.order,(p,prev)=>{const merged={...prev,...p},goal=normalizeNutritionGoal(merged);if(!goal)fail('每个日方案请至少提供一项营养目标');return {...merged,...goal,id:prev?.id??crypto.randomUUID(),name:requiredText(merged.name,'方案名称')} as NutritionStrategyVariant})
    if(!variants.length||variants.length>32)fail('需要1–32个日方案')
    const after={id:old?.id,name:requiredText(args.name??old?.name,'模板名称'),variants};uniqueName(rows.nutritionStrategyTemplates as {id:string;name:string}[],after.name,old?.id)
    return {before:old?{...old,variants:previous}:undefined,after,writeCount:1+variants.length,apply:()=>saveNutritionStrategy(after,env.database)}
  })),
].map(tool => ({ ...tool, schema: { ...tool.schema, description: tool.label }, label: ({search_catalog:'查询资料库与模板',propose_food:'生成食物资料建议',propose_exercise:'生成动作资料建议',propose_workout_template:'生成训练模板建议',propose_diet_template:'生成饮食模板建议',propose_nutrition_strategy:'生成营养模板建议'} as Record<string,string>)[tool.name]! }))
