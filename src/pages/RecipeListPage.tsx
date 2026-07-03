import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Recipe } from '../types'
import { SlidersHorizontal, Grid, List, Search, Heart, Plus, ChefHat, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import { getRecipeEmoji, getRecipeGradient, cleanRecipeName } from '../utils/recipeVisuals'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useCustomRecipeStore } from '../stores/customRecipeStore'
import { fetchAllRecipes, fetchAllCategories } from '../lib/api'
import type { RecipeCategory } from '../lib/api'

interface CategoryNode {
  id: string
  name: string
  children: CategoryNode[]
}

export default function RecipeListPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') || 'all'

  const [selectedCategory, setSelectedCategory] = useState<string>('热门专题')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchText, setSearchText] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dbRecipes, setDbRecipes] = useState<Recipe[]>([])

  // 数据库分类树
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [expandedSubcats, setExpandedSubcats] = useState(false)

  const { isFavorite } = useFavoritesStore()
  const favoritesCount = useFavoritesStore(state => state.ids.length)
  const customRecipes = useCustomRecipeStore(state => state.recipes)

  // 从数据库加载食谱
  useEffect(() => {
    async function loadRecipes() {
      setIsLoading(true)
      const recipes = await fetchAllRecipes()
      setDbRecipes(recipes)
      setIsLoading(false)
    }
    loadRecipes()
  }, [])

  // 从数据库加载分类
  useEffect(() => {
    let mounted = true
    fetchAllCategories().then((cats: RecipeCategory[]) => {
      if (!mounted) return
      const parents = cats.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
      // 热门专题排最前，其余按 sort_order
      const sorted = [...parents].sort((a, b) => {
        if (a.name === '热门专题') return -1
        if (b.name === '热门专题') return 1
        return a.sort_order - b.sort_order
      })
      const tree: CategoryNode[] = sorted.map(p => ({
        id: p.id,
        name: p.name,
        children: cats
          .filter(c => c.parent_id === p.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(c => ({ id: c.id, name: c.name, children: [] })),
      }))
      setCategoryTree(tree)
      setLoadingCategories(false)
    })
    return () => { mounted = false }
  }, [])

  // 将 CustomRecipe 转换为 Recipe 格式
  const customAsRecipes: Recipe[] = useMemo(() =>
    customRecipes.map(cr => ({
      id: cr.id,
      name: cr.name,
      category: cr.category,
      type: cr.type,
      flavor: cr.flavor,
      ingredients: cr.ingredients,
      steps: cr.steps,
      prepTime: cr.prepTime,
      cookTime: cr.cookTime,
      difficulty: cr.difficulty,
      servings: cr.servings,
      imageUrl: cr.imageUrl,
    })),
  [customRecipes])

  // 根据 tab 选择数据源
  const allRecipes = activeTab === 'custom' ? customAsRecipes : [...dbRecipes, ...customAsRecipes]

  // 当前选中一级分类下的二级分类
  const currentChildren = useMemo(() => {
    const parent = categoryTree.find(p => p.name === selectedCategory)
    return parent?.children || []
  }, [categoryTree, selectedCategory])

  const filteredRecipes = allRecipes.filter(recipe => {
    const isCustomRecipe = customRecipes.some(cr => cr.id === recipe.id)

    // 一级分类筛选
    if (isCustomRecipe) {
      const cr = customRecipes.find(c => c.id === recipe.id)!
      // 自定义菜谱：category 匹配一级分类 或 subcategoryId 属于当前一级分类
      if (cr.category !== selectedCategory) {
        if (!cr.subcategoryId || !currentChildren.some(cc => cc.id === cr.subcategoryId)) return false
      }
    } else {
      // 数据库食谱：category 字段匹配一级分类名称
      if (recipe.category !== selectedCategory) return false
    }

    // 二级分类筛选
    if (selectedSubcategoryId) {
      const selectedSub = currentChildren.find(cc => cc.id === selectedSubcategoryId)
      const subName = selectedSub?.name

      if (isCustomRecipe) {
        const cr = customRecipes.find(c => c.id === recipe.id)!
        if (cr.subcategoryId !== selectedSubcategoryId) return false
      } else {
        // 数据库食谱：recipe.type 存储的就是二级分类名称（如"家常菜"）
        if (!subName || recipe.type !== subName) return false
      }
    }

    if (searchText && !recipe.name.includes(searchText) && !recipe.category.includes(searchText)) return false
    if (showFavoritesOnly && !isFavorite(recipe.id)) return false
    return true
  })

  // 判断是否为自定义菜谱（id 不在预设列表中）
  const isCustom = (id: string) => customRecipes.some(cr => cr.id === id)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader size={40} className="text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-500">正在加载食谱...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2 mb-0">
          <ChefHat size={28} className="text-primary-500" />
          菜谱大全
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">
            共 {filteredRecipes.length} 道菜
          </span>
          <button
            onClick={() => navigate('/custom-recipe')}
            className="btn-primary text-sm flex items-center gap-1.5 py-1.5 px-3"
          >
            <Plus size={16} />创建
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn-ghost p-2"
          >
            {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/recipes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          全部菜谱
        </button>
        <button
          onClick={() => navigate('/recipes?tab=custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'custom' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          我的菜谱 {customRecipes.length > 0 && `(${customRecipes.length})`}
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2 text-neutral-700 font-medium">
          <SlidersHorizontal size={18} className="text-primary-500" />
          <span>筛选条件</span>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索菜谱名称或菜系..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* 收藏筛选 */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            showFavoritesOnly
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
          }`}
        >
          <Heart size={16} className={showFavoritesOnly ? 'fill-red-500' : ''} />
          {showFavoritesOnly ? `已收藏 (${favoritesCount})` : '仅看收藏'}
        </button>

        {/* 分类筛选：一级分类标签行 + 当前分类的二级子标签 */}
        {loadingCategories ? (
          <div className="text-sm text-neutral-400">分类加载中...</div>
        ) : (
          <div className="space-y-4">
            {/* 一级分类：紧凑标签行 */}
            <div className="flex flex-wrap gap-2">
              {categoryTree.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategoryId(''); setExpandedSubcats(false) }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.name
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* 二级子分类：带分隔线和展开/收起 */}
            {currentChildren.length > 0 && (
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {(expandedSubcats ? currentChildren : currentChildren.slice(0, 10)).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubcategoryId(selectedSubcategoryId === sub.id ? '' : sub.id)}
                      className={selectedSubcategoryId === sub.id ? 'tag-active' : 'tag'}
                    >
                      {sub.name}
                    </button>
                  ))}
                  {currentChildren.length > 10 && (
                    <button
                      onClick={() => setExpandedSubcats(!expandedSubcats)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-primary-500 bg-primary-50 hover:bg-primary-100 transition-colors"
                    >
                      {expandedSubcats ? (
                        <><ChevronUp size={14} />收起</>
                      ) : (
                        <><ChevronDown size={14} />展开全部 ({currentChildren.length})</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 菜谱列表 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe, index) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={index} isCustom={isCustom(recipe.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe, index) => (
            <RecipeListItem key={recipe.id} recipe={recipe} index={index} isCustom={isCustom(recipe.id)} />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {filteredRecipes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="text-lg font-medium text-neutral-600 mb-2">没有找到符合条件的菜谱</p>
          <p className="text-sm text-neutral-400 mb-4">
            {activeTab === 'custom' ? '还没有自定义菜谱，点击下方按钮创建一个' : '试试调整筛选条件'}
          </p>
          {activeTab === 'custom' && (
            <button
              onClick={() => navigate('/custom-recipe')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />创建菜谱
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// 网格视图卡片
function RecipeCard({ recipe, index, isCustom }: { recipe: Recipe; index: number; isCustom?: boolean }) {
  const displayName = cleanRecipeName(recipe.name)
  const emoji = getRecipeEmoji(recipe)
  const gradient = getRecipeGradient(recipe)
  const hasImage = !!recipe.imageUrl

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="card-interactive group block relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {isCustom && (
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full font-medium">
          我的
        </span>
      )}
      <div className={`aspect-video bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl mb-4 overflow-hidden flex items-center justify-center relative group-hover:scale-105 transform transition-transform duration-300 shadow-sm`}>
        {hasImage ? (
          <img
            src={recipe.imageUrl}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // 图片加载失败时隐藏 img，显示 emoji 兜底
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : null}
        {/* 无图片或图片加载失败时显示 emoji */}
        <span className={`text-7xl ${hasImage ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
          {emoji}
        </span>
      </div>
      <h3 className="font-semibold text-neutral-800 mb-2 group-hover:text-primary-600 transition-colors line-clamp-1" title={displayName}>
        {displayName}
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="tag">{recipe.category}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <span className="flex items-center gap-1">
          ⏱️ {recipe.prepTime + recipe.cookTime}分钟
        </span>
        <span className="flex items-center gap-1">
          👥 {recipe.servings}人份
        </span>
        <span className="flex items-center gap-1">
          📊 {recipe.difficulty}
        </span>
      </div>
    </Link>
  )
}

// 列表视图
function RecipeListItem({ recipe, index, isCustom }: { recipe: Recipe; index: number; isCustom?: boolean }) {
  const displayName = cleanRecipeName(recipe.name)
  const emoji = getRecipeEmoji(recipe)
  const gradient = getRecipeGradient(recipe)
  const hasImage = !!recipe.imageUrl

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="card-interactive group flex items-center gap-6 p-4 relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {isCustom && (
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full font-medium">
          我的
        </span>
      )}
      <div className={`w-24 h-24 bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm relative`}>
        {hasImage ? (
          <img
            src={recipe.imageUrl}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : null}
        <span className={`text-5xl ${hasImage ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
          {emoji}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-neutral-800 mb-2 group-hover:text-primary-600 transition-colors line-clamp-1" title={displayName}>
          {displayName}
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="tag">{recipe.category}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span>⏱️ {recipe.prepTime + recipe.cookTime}分钟</span>
          <span>👥 {recipe.servings}人份</span>
          <span>📊 {recipe.difficulty}</span>
        </div>
      </div>
    </Link>
  )
}
