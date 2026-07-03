import { getSupabaseClient } from './supabase'
import { PantryItem, MealPlan, Family, FamilyMember, ShoppingListItem, CustomRecipeInput, CustomRecipe, Ingredient, Recipe } from '../types'

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
    subcategory_id: input.subcategoryId || null,
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
  if (input.subcategoryId !== undefined) row.subcategory_id = input.subcategoryId || null

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
    subcategoryId: row.subcategory_id as string | undefined,
    createdAt: row.created_at as string,
  }
}

// ============================================
// 公共食谱 API
// ============================================
export async function fetchAllRecipes(): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('获取食谱列表失败:', error)
    return []
  }

  return (data || []).map(mapRecipeFromRow)
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('获取食谱详情失败:', error)
    return null
  }

  return mapRecipeFromRow(data)
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })

  if (error) {
    console.error('搜索食谱失败:', error)
    return []
  }

  return (data || []).map(mapRecipeFromRow)
}

export async function fetchRecipesByCategory(category: string): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true })

  if (error) {
    console.error('按菜系获取食谱失败:', error)
    return []
  }

  return (data || []).map(mapRecipeFromRow)
}

export async function fetchRecipeCategories(): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('category')

  if (error) {
    console.error('获取菜系列表失败:', error)
    return []
  }

  const categories = new Set((data || []).map(r => r.category))
  return Array.from(categories).sort()
}

function mapRecipeFromRow(row: Record<string, unknown>): Recipe {
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
    imageUrl: (row.image_url as string) || undefined,
  }
}

export type { Recipe }

// ============================================
// 食谱管理后台 API
// ============================================

// 分类类型
export interface RecipeCategory {
  id: string
  name: string
  slug: string
  parent_id: string | null
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 步骤类型（支持图片）
export interface RecipeStep {
  id: string
  recipe_id: string
  step_number: number
  description: string
  image_url: string | null
  created_at: string
  updated_at: string
}

// 食谱完整数据
export interface RecipeWithDetails extends Recipe {
  category_id: string | null
  subcategory_id: string | null
  is_published: boolean
  created_by_email: string | null
  steps_data: RecipeStep[]
}

// 创建/更新食谱输入
export interface RecipeInput {
  name: string
  category: string
  type: string
  flavor: string
  ingredients: Ingredient[]
  steps: string[]
  prep_time: number
  cook_time: number
  difficulty: '简单' | '中等' | '困难'
  servings: number
  image_url: string | null
  category_id: string | null
  subcategory_id: string | null
  is_published: boolean
  steps_data?: { step_number: number; description: string; image_url: string | null }[]
}

// 获取所有分类（含层级）
export async function fetchAllCategories(): Promise<RecipeCategory[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipe_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('获取分类失败:', error)
    return []
  }

  return data || []
}

// 获取一级分类
export async function fetchParentCategories(): Promise<RecipeCategory[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipe_categories')
    .select('*')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('获取一级分类失败:', error)
    return []
  }

  return data || []
}

// 获取子分类
export async function fetchChildCategories(parentId: string): Promise<RecipeCategory[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipe_categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('获取子分类失败:', error)
    return []
  }

  return data || []
}

// 创建分类
export async function createCategory(category: Partial<RecipeCategory>): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('recipe_categories')
    .insert(category)
    .select('id')
    .single()

  if (error) {
    console.error('创建分类失败:', error)
    return null
  }

  return data.id
}

// 更新分类
export async function updateCategory(id: string, updates: Partial<RecipeCategory>): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('recipe_categories')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('更新分类失败:', error)
    return false
  }

  return true
}

// 删除分类
export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('recipe_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除分类失败:', error)
    return false
  }

  return true
}

// 从食谱数据中提取分类并初始化到 recipe_categories 表
export async function seedDefaultCategories(): Promise<{ parentCount: number; childCount: number }> {
  const supabase = getSupabaseClient()
  if (!supabase) return { parentCount: 0, childCount: 0 }

  // 1. 获取所有食谱
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('category, type')

  if (recipeError) {
    console.error('获取食谱失败:', recipeError)
    return { parentCount: 0, childCount: 0 }
  }

  if (!recipes || recipes.length === 0) {
    console.log('没有食谱数据，无法初始化分类')
    return { parentCount: 0, childCount: 0 }
  }

  // 2. 提取分类层级
  const catTypeMap = new Map<string, Set<string>>()
  recipes.forEach((r: { category: string; type: string }) => {
    if (r.category) {
      if (!catTypeMap.has(r.category)) catTypeMap.set(r.category, new Set())
      if (r.type) catTypeMap.get(r.category)!.add(r.type)
    }
  })

  let parentCount = 0
  let childCount = 0

  // 3. 插入父分类和子分类
  for (const [catName, types] of catTypeMap) {
    const slug = catName

    // 检查父分类是否已存在
    const { data: existingParent } = await supabase
      .from('recipe_categories')
      .select('id')
      .eq('slug', slug)
      .is('parent_id', null)
      .maybeSingle()

    let parentId: string

    if (existingParent) {
      parentId = existingParent.id
    } else {
      const { data: newParent, error: parentError } = await supabase
        .from('recipe_categories')
        .insert({
          name: catName,
          slug: slug,
          parent_id: null,
          description: `${catName}菜系`,
          sort_order: parentCount + 1,
          is_active: true,
        })
        .select('id')
        .single()

      if (parentError) {
        console.error(`创建父分类 "${catName}" 失败:`, parentError)
        continue
      }
      parentId = newParent.id
      parentCount++
    }

    // 插入子分类
    let subSort = 0
    for (const typeName of types) {
      const subSlug = `${slug}-${typeName}`

      const { data: existingChild } = await supabase
        .from('recipe_categories')
        .select('id')
        .eq('slug', subSlug)
        .eq('parent_id', parentId)
        .maybeSingle()

      if (existingChild) continue

      const { error: childError } = await supabase
        .from('recipe_categories')
        .insert({
          name: typeName,
          slug: subSlug,
          parent_id: parentId,
          description: `${catName} - ${typeName}`,
          sort_order: subSort++,
          is_active: true,
        })

      if (childError) {
        console.error(`创建子分类 "${typeName}" 失败:`, childError)
        continue
      }
      childCount++
    }
  }

  return { parentCount, childCount }
}

// 获取食谱步骤
export async function fetchRecipeSteps(recipeId: string): Promise<RecipeStep[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipe_steps')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('step_number', { ascending: true })

  if (error) {
    console.error('获取步骤失败:', error)
    return []
  }

  return data || []
}

// 创建/更新食谱（含步骤）
export async function saveRecipe(recipe: RecipeInput, recipeId?: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const recipeData = {
      name: recipe.name,
      category: recipe.category,
      type: recipe.type,
      flavor: recipe.flavor,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      image_url: recipe.image_url,
      category_id: recipe.category_id,
      subcategory_id: recipe.subcategory_id,
      is_published: recipe.is_published,
      is_verified: true,
    }

    let id: string

    if (recipeId) {
      // 更新
      const { error } = await supabase
        .from('recipes')
        .update(recipeData)
        .eq('id', recipeId)

      if (error) throw error
      id = recipeId
    } else {
      // 创建
      const { data, error } = await supabase
        .from('recipes')
        .insert(recipeData)
        .select('id')
        .single()

      if (error) throw error
      id = data.id
    }

    // 保存步骤（如果有）
    if (recipe.steps_data && recipe.steps_data.length > 0) {
      // 先删除旧步骤
      await supabase.from('recipe_steps').delete().eq('recipe_id', id)

      // 插入新步骤
      const stepsToInsert = recipe.steps_data.map((step, index) => ({
        recipe_id: id,
        step_number: step.step_number || index + 1,
        description: step.description,
        image_url: step.image_url,
      }))

      const { error: stepError } = await supabase
        .from('recipe_steps')
        .insert(stepsToInsert)

      if (stepError) throw stepError
    }

    return id
  } catch (error) {
    console.error('保存食谱失败:', error)
    return null
  }
}

// 删除食谱
export async function deleteRecipe(id: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除食谱失败:', error)
    return false
  }

  return true
}

// 上传图片到 Storage
export async function uploadRecipeImage(file: File, recipeId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${recipeId}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, file)

    if (error) throw error

    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('上传图片失败:', error)
    return null
  }
}

// 删除图片
export async function deleteRecipeImage(imageUrl: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  try {
    // 从URL中提取路径
    const urlParts = imageUrl.split('/recipe-images/')
    if (urlParts.length < 2) return false

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('recipe-images')
      .remove([filePath])

    if (error) throw error
    return true
  } catch (error) {
    console.error('删除图片失败:', error)
    return false
  }
}
