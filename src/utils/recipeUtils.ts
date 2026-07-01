import { Recipe } from '../types'

// 智能推荐算法：根据食材库存推荐菜品
export function recommendRecipes(recipes: Recipe[], pantryItems: string[]): Recipe[] {
  // 计算每个菜谱的匹配度
  const scoredRecipes = recipes.map(recipe => {
    const matchedIngredients = recipe.ingredients.filter(ingredient =>
      pantryItems.some(pantryItem =>
        pantryItem.includes(ingredient.name) || ingredient.name.includes(pantryItem)
      )
    )
    
    const matchScore = matchedIngredients.length / recipe.ingredients.length
    const missingIngredients = recipe.ingredients.filter(ingredient =>
      !pantryItems.some(pantryItem =>
        pantryItem.includes(ingredient.name) || ingredient.name.includes(pantryItem)
      )
    )
    
    return {
      recipe,
      matchScore,
      matchedIngredients: matchedIngredients.length,
      missingIngredients: missingIngredients.map(ing => ing.name)
    }
  })
  
  // 按匹配度排序，返回前10个推荐
  return scoredRecipes
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)
    .map(item => item.recipe)
}

// 检查菜谱缺少的食材
export function checkMissingIngredients(recipe: Recipe, pantryItemNames: string[]): string[] {
  return recipe.ingredients
    .filter(ingredient => 
      !pantryItemNames.some(pantryName => 
        pantryName.includes(ingredient.name) || ingredient.name.includes(pantryName)
      )
    )
    .map(ingredient => ingredient.name)
}

// 根据筛选条件过滤菜谱
export function filterRecipes(
  recipes: Recipe[], 
  category: string, 
  type: string, 
  flavor: string
): Recipe[] {
  return recipes.filter(recipe => {
    if (category !== '全部' && recipe.category !== category) return false
    if (type !== '全部' && recipe.type !== type) return false
    if (flavor !== '全部' && recipe.flavor !== flavor) return false
    return true
  })
}
