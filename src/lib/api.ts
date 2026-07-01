import { getSupabaseClient } from './supabase'
import { PantryItem, MealPlan, Family, FamilyMember, ShoppingListItem, CustomRecipeInput, CustomRecipe, Ingredient } from '../types'

// ============================================
// 食材库存 API
// ============================================
export async function fetchPantryItems(familyId: string | null, userId: string): Promise<PantryItem[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from('pantry_items').select('*')
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId).is('family_id', null)
  }
  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) { console.error('获取食材失败:', error); return [] }
  return data.map(mapPantryFromRow)
}

export async function addPantryItem(
  userId: string, familyId: string | null, item: PantryItem
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('pantry_items').insert({
    user_id: userId,
    family_id: familyId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiry_date: item.expiryDate || null,
  })
  if (error) { console.error('添加食材失败:', error); return false }
  return true
}

export async function updatePantryItemDb(itemId: string, updates: Partial<PantryItem>): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.quantity !== undefined) row.quantity = updates.quantity
  if (updates.unit !== undefined) row.unit = updates.unit
  if (updates.category !== undefined) row.category = updates.category
  if (updates.expiryDate !== undefined) row.expiry_date = updates.expiryDate || null

  const { error } = await supabase.from('pantry_items').update(row).eq('id', itemId)
  if (error) { console.error('更新食材失败:', error); return false }
  return true
}

export async function removePantryItem(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('pantry_items').delete().eq('id', itemId)
  if (error) { console.error('删除食材失败:', error); return false }
  return true
}

// ============================================
// 饮食计划 API
// ============================================
export async function fetchMealPlans(familyId: string | null, userId: string): Promise<MealPlan[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from('meal_plans').select('*')
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId).is('family_id', null)
  }
  query = query.order('date', { ascending: false })

  const { data, error } = await query
  if (error) { console.error('获取计划失败:', error); return [] }
  return data.map(mapMealFromRow)
}

export async function addMealPlan(
  userId: string, familyId: string | null, plan: MealPlan
): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const upsertData: Record<string, unknown> = {
    user_id: userId,
    family_id: familyId,
    date: plan.date,
    meal_type: plan.mealType,
    recipe_id: plan.recipeId,
    recipe_data: plan.recipe,
  }

  let { data, error } = await supabase
    .from('meal_plans')
    .upsert(upsertData, { onConflict: familyId ? 'family_id,date,meal_type' : 'user_id,date,meal_type' })
    .select()

  if (error) { console.error('添加计划失败:', error); return null }
  return data?.[0]?.id || null
}

export async function removeMealPlan(planId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('meal_plans').delete().eq('id', planId)
  if (error) { console.error('删除计划失败:', error); return false }
  return true
}

// ============================================
// 收藏 API
// ============================================
export async function fetchFavorites(familyId: string | null, userId: string): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from('favorites').select('recipe_id')
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId).is('family_id', null)
  }

  const { data, error } = await query
  if (error) { console.error('获取收藏失败:', error); return [] }
  return data.map(r => r.recipe_id)
}

export async function addFavorite(
  userId: string, familyId: string | null, recipeId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('favorites').upsert({
    user_id: userId,
    family_id: familyId,
    recipe_id: recipeId,
  })
  if (error) { console.error('添加收藏失败:', error); return false }
  return true
}

export async function removeFavorite(
  userId: string, familyId: string | null, recipeId: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  let query = supabase.from('favorites').delete().eq('recipe_id', recipeId)
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { error } = await query
  if (error) { console.error('取消收藏失败:', error); return false }
  return true
}

// ============================================
// 家庭 API
// ============================================
export async function fetchUserFamilies(): Promise<Family[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase.rpc('get_user_families')
  if (error) { console.error('获取家庭列表失败:', error); return [] }

  return (data || []).map((f: Record<string, unknown>) => ({
    id: f.family_id as string,
    name: f.family_name as string,
    inviteCode: f.invite_code as string,
    role: (f.role as string) || 'member',
    memberCount: Number(f.member_count),
    createdAt: f.created_at as string,
  }))
}

export async function createFamily(name: string): Promise<Family | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.rpc('create_family_with_owner', { family_name: name })
  if (error) { console.error('创建家庭失败:', error); return null }

  const f = data as Record<string, unknown>
  return {
    id: f.id as string,
    name: f.name as string,
    inviteCode: f.invite_code as string,
    role: 'owner',
    memberCount: 1,
    createdAt: f.created_at as string,
  }
}

export async function joinFamilyByCode(code: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.rpc('join_family_by_code', { invite_code_input: code })
  if (error) { console.error('加入家庭失败:', error); return null }
  return data as string
}

export async function fetchFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('family_members')
    .select('id, family_id, user_id, role, joined_at')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true })

  if (error) { console.error('获取成员失败:', error); return [] }

  return (data || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    familyId: m.family_id as string,
    userId: m.user_id as string,
    role: (m.role as FamilyMember['role']) || 'member',
    joinedAt: m.joined_at as string,
  }))
}

export async function leaveFamily(familyId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

  if (error) { console.error('退出家庭失败:', error); return false }
  return true
}

// ============================================
// 购物清单 API
// ============================================
export async function fetchShoppingList(familyId: string | null, userId: string): Promise<ShoppingListItem[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from('shopping_lists').select('*')
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId).is('family_id', null)
  }
  query = query.order('created_at', { ascending: true })

  const { data, error } = await query
  if (error) { console.error('获取购物清单失败:', error); return [] }
  return (data || []).map(mapShoppingFromRow)
}

export async function addShoppingItem(
  userId: string, familyId: string | null, item: Omit<ShoppingListItem, 'id' | 'createdAt'>
): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.from('shopping_lists').insert({
    user_id: userId,
    family_id: familyId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    checked: item.checked,
  }).select()

  if (error) { console.error('添加购物项失败:', error); return null }
  return data?.[0]?.id || null
}

export async function updateShoppingItem(itemId: string, updates: Partial<ShoppingListItem>): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = updates.name
  if (updates.quantity !== undefined) row.quantity = updates.quantity
  if (updates.unit !== undefined) row.unit = updates.unit
  if (updates.category !== undefined) row.category = updates.category
  if (updates.checked !== undefined) row.checked = updates.checked

  const { error } = await supabase.from('shopping_lists').update(row).eq('id', itemId)
  if (error) { console.error('更新购物项失败:', error); return false }
  return true
}

export async function removeShoppingItem(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('shopping_lists').delete().eq('id', itemId)
  if (error) { console.error('删除购物项失败:', error); return false }
  return true
}

export async function clearCheckedItems(familyId: string | null, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  let query = supabase.from('shopping_lists').delete().eq('checked', true)
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { error } = await query
  if (error) { console.error('清除已购项失败:', error); return false }
  return true
}

// ============================================
// 自定义菜谱 API
// ============================================
export async function fetchCustomRecipes(familyId: string | null, userId: string): Promise<CustomRecipe[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from('custom_recipes').select('*')
  if (familyId) {
    query = query.eq('family_id', familyId)
  } else {
    query = query.eq('user_id', userId).is('family_id', null)
  }
  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) { console.error('获取自定义菜谱失败:', error); return [] }
  return (data || []).map(mapCustomRecipeFromRow)
}

export async function addCustomRecipe(
  userId: string, familyId: string | null, input: CustomRecipeInput
): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.from('custom_recipes').insert({
    user_id: userId,
    family_id: familyId,
    name: input.name,
    category: input.category,
    type: input.type,
    flavor: input.flavor,
    ingredients: input.ingredients,
    steps: input.steps,
    prep_time: input.prepTime,
    cook_time: input.cookTime,
    difficulty: input.difficulty,
    servings: input.servings,
    image_url: input.imageUrl || null,
  }).select()

  if (error) { console.error('添加自定义菜谱失败:', error); return null }
  return data?.[0]?.id || null
}

export async function updateCustomRecipe(
  recipeId: string, input: Partial<CustomRecipeInput>
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.category !== undefined) row.category = input.category
  if (input.type !== undefined) row.type = input.type
  if (input.flavor !== undefined) row.flavor = input.flavor
  if (input.ingredients !== undefined) row.ingredients = input.ingredients
  if (input.steps !== undefined) row.steps = input.steps
  if (input.prepTime !== undefined) row.prep_time = input.prepTime
  if (input.cookTime !== undefined) row.cook_time = input.cookTime
  if (input.difficulty !== undefined) row.difficulty = input.difficulty
  if (input.servings !== undefined) row.servings = input.servings
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl

  const { error } = await supabase.from('custom_recipes').update(row).eq('id', recipeId)
  if (error) { console.error('更新自定义菜谱失败:', error); return false }
  return true
}

export async function removeCustomRecipe(recipeId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase.from('custom_recipes').delete().eq('id', recipeId)
  if (error) { console.error('删除自定义菜谱失败:', error); return false }
  return true
}

// ============================================
// 数据行映射
// ============================================
function mapPantryFromRow(row: Record<string, unknown>): PantryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    category: row.category as string,
    expiryDate: row.expiry_date ? (row.expiry_date as string) : undefined,
  }
}

function mapMealFromRow(row: Record<string, unknown>): MealPlan {
  return {
    id: row.id as string,
    familyId: (row.family_id as string) || '',
    date: row.date as string,
    mealType: row.meal_type as '早餐' | '午餐' | '晚餐',
    recipeId: row.recipe_id as string,
    recipe: row.recipe_data as unknown as MealPlan['recipe'],
    createdBy: (row.user_id as string) || '',
    createdAt: (row.created_at as string) || '',
  }
}

function mapShoppingFromRow(row: Record<string, unknown>): ShoppingListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    category: row.category as string,
    checked: Boolean(row.checked),
    createdAt: (row.created_at as string) || '',
  }
}

function mapCustomRecipeFromRow(row: Record<string, unknown>): CustomRecipe {
  const ingredients = (row.ingredients as unknown[]) || []
  const steps = (row.steps as unknown[]) || []
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    type: row.type as string,
    flavor: row.flavor as string,
    ingredients: ingredients as Ingredient[],
    steps: (steps as string[]).map(s => String(s)),
    prepTime: Number(row.prep_time),
    cookTime: Number(row.cook_time),
    difficulty: (row.difficulty as '简单' | '中等' | '困难') || '简单',
    servings: Number(row.servings),
    imageUrl: row.image_url as string | undefined,
    createdAt: row.created_at as string,
  }
}
