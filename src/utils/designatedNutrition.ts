import type {Food,FoodLog,NutritionGoal} from '../db/types'
import {calculateNutrition,type NutritionTotals} from './nutrition'
import {completeNutrition,completionKeys,getNutritionCompletionSummary,completionTolerance,type NutritionCompletionResult} from './nutritionCompletion'
/** Actual intake allows fractional portions and a wider finite cap, never unlimited bypass. */
export const manualPortionBounds={minGrams:.000001,maxFoodGrams:1000,maxTotalGrams:2000} as const
export const designatedMinimumGrams=20
export function validateDesignatedPortions(items:readonly {food:Food;grams:number}[]):void {
  if(!items.length||items.length>4||new Set(items.map(item=>item.food.id)).size!==items.length)throw Error('请选择 1–4 种真实食物')
  if(items.some(item=>!Number.isFinite(item.grams)||item.grams<manualPortionBounds.minGrams||item.grams>manualPortionBounds.maxFoodGrams)||items.reduce((sum,item)=>sum+item.grams,0)>manualPortionBounds.maxTotalGrams)throw Error('实际克数须大于0，每种最多1000g，合计最多2000g')
}
export function recommendDesignatedNutrition(target:NutritionGoal,logs:readonly FoodLog[],foods:readonly Food[]):{result:NutritionCompletionResult;reason?:string} {
  if(!foods.length||foods.length>4||new Set(foods.map(f=>f.id)).size!==foods.length)throw Error('请选择 1–4 种真实食物')
  const summary=getNutritionCompletionSummary(target,logs),empty={...summary,excludedFoodCount:0,plans:[]} as NutritionCompletionResult
  if(!completionKeys.some(k=>target[k]!==undefined))return{result:empty,reason:'这个日期没有设置营养目标，无法计算剩余份量。仍可手动记录实际摄入。'}
  if(summary.nothingToComplete)return{result:empty,reason:summary.uncertainKeys.length?'目标差额未知，无法可靠推荐。仍可手动记录实际摄入。':'可计算的目标均已达到或超过，无需继续补齐。仍可手动记录实际摄入。'}
  const missing=foods.flatMap(f=>completionKeys.filter(k=>target[k]!==undefined&&f[k]===undefined).map(k=>`${f.name}缺少${({calories:'热量',protein:'蛋白质',carbs:'碳水',fat:'脂肪'})[k]}`))
  if(missing.length)return{result:empty,reason:`无法可靠推荐：${missing.join('、')}数据。可调整选择、到食物库补充资料，或手动记录实际摄入。`}
  const result=completeNutrition(target,logs,foods,new Set(),new Set(foods.map(f=>f.id)),designatedMinimumGrams)
  if(!result.plans.length)return{result,reason:'在每种20–400g、合计800g的建议边界内，所选食物无法形成改善目标差额的完整组合。不会省略已选食物；请调整选择或手动记录实际摄入。'}
  result.plans=result.plans.slice(0,1)
  result.plans[0]!.items.sort((a,b)=>foods.findIndex(f=>f.id===a.food.id)-foods.findIndex(f=>f.id===b.food.id))
  return{result}
}
/** Pure preview of user-entered portions. No candidate search, optimizer, inferred food or grams. */
export function previewDesignatedNutrition(target:NutritionGoal,logs:readonly FoodLog[],items:readonly {food:Food;grams:number}[]):NutritionCompletionResult {
  const summary=getNutritionCompletionSummary(target,logs)
  validateDesignatedPortions(items)
  const portions=items.map(item=>{
    if(!Number.isFinite(item.grams)||item.grams<.000001)throw Error('请填写有效的实际克数')
    const added=calculateNutrition(item.food,item.grams)
    if(completionKeys.some(key=>added[key]!==undefined&&(!Number.isFinite(added[key])||added[key]!<0)))throw Error('克数或食物营养数据不合法')
    return {food:{...item.food},grams:item.grams,added}
  })
  const added:NutritionTotals={calories:0},projected:NutritionTotals={calories:0},difference:NutritionGoal={}
  for(const key of completionKeys){
    const value=portions.every(item=>item.added[key]!==undefined)?portions.reduce((n,item)=>n+item.added[key]!,0):undefined
    if(value!==undefined&&!Number.isFinite(value))throw Error('克数过大，请检查实际克数')
    const total=value===undefined||summary.actual[key]===undefined?undefined:summary.actual[key]!+value
    if(total!==undefined&&!Number.isFinite(total))throw Error('克数过大，请检查实际克数')
    if(key==='calories'){added.calories=value!;projected.calories=total!}else{added[key]=value;projected[key]=total}
    if(total!==undefined&&target[key]!==undefined)difference[key]=total-target[key]!
  }
  return {...summary,excludedFoodCount:0,plans:[{items:portions,added,projected,difference,closeEnough:summary.activeKeys.length>0&&summary.activeKeys.every(key=>difference[key]!==undefined&&Math.abs(difference[key]!)<=completionTolerance(key,target[key]!))}]}
}
