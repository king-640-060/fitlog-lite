import type {Food,FoodLog,NutritionGoal} from '../db/types'
import {calculateNutrition,type NutritionTotals} from './nutrition'
import {completionKeys,getNutritionCompletionSummary,completionTolerance,type NutritionCompletionResult} from './nutritionCompletion'
/** Pure preview of user-entered portions. No candidate search, optimizer, inferred food or grams. */
export function previewDesignatedNutrition(target:NutritionGoal,logs:readonly FoodLog[],items:readonly {food:Food;grams:number}[]):NutritionCompletionResult {
  const summary=getNutritionCompletionSummary(target,logs)
  if(!items.length||items.length>4||new Set(items.map(item=>item.food.id)).size!==items.length)throw Error('请选择 1–4 种真实食物')
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
