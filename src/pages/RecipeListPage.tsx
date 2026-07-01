import { useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { allRecipes as recipes } from '../data/recipes'
import { Recipe } from '../types'
import { SlidersHorizontal, Grid, List, Search, Heart, Plus, ChefHat } from 'lucide-react'
import { getRecipeEmoji, getRecipeGradient } from '../utils/recipeVisuals'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useCustomRecipeStore } from '../stores/customRecipeStore'

export default function RecipeListPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') || 'all'

  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [selectedType, setSelectedType] = useState<string>('全部')
  const [selectedFlavor, setSelectedFlavor] = useState<string>('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchText, setSearchText] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const { isFavorite } = useFavoritesStore()
  const favoritesCount = useFavoritesStore(state => state.ids.length)
  const customRecipes = useCustomRecipeStore(state => state.recipes)

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
  const allRecipes = activeTab === 'custom' ? customAsRecipes : [...recipes, ...customAsRecipes]

  const categories = ['全部', ...new Set(allRecipes.map(r => r.category))]
  const types = ['全部', ...new Set(allRecipes.map(r => r.type))]
  const flavors = ['全部', ...new Set(allRecipes.map(r => r.flavor))]

  const filteredRecipes = allRecipes.filter(recipe => {
    if (selectedCategory !== '全部' && recipe.category !== selectedCategory) return false
    if (selectedType !== '全部' && recipe.type !== selectedType) return false
    if (selectedFlavor !== '全部' && recipe.flavor !== selectedFlavor) return false
    if (searchText && !recipe.name.includes(searchText) && !recipe.category.includes(searchText)) return false
    if (showFavoritesOnly && !isFavorite(recipe.id)) return false
    return true
  })

  // 判断是否为自定义菜谱（id 不在预设列表中）
  const isCustom = (id: string) => customRecipes.some(cr => cr.id === id)

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

        <div>
          <h3 className="text-sm font-medium text-neutral-600 mb-3">菜系</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'tag-active' : 'tag'}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-600 mb-3">种类</h3>
          <div className="flex flex-wrap gap-2">
            {types.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={selectedType === type ? 'tag-active' : 'tag'}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-600 mb-3">口味</h3>
          <div className="flex flex-wrap gap-2">
            {flavors.map(flavor => (
              <button
                key={flavor}
                onClick={() => setSelectedFlavor(flavor)}
                className={selectedFlavor === flavor ? 'tag-active' : 'tag'}
              >
                {flavor}
              </button>
            ))}
          </div>
        </div>
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
  const emoji = getRecipeEmoji(recipe)
  const gradient = getRecipeGradient(recipe)

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
      <div className={`aspect-video bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl mb-4 flex items-center justify-center text-7xl group-hover:scale-105 transform transition-transform duration-300 shadow-sm`}>
        {emoji}
      </div>
      <h3 className="font-semibold text-neutral-800 mb-2 group-hover:text-primary-600 transition-colors">
        {recipe.name}
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="tag">{recipe.category}</span>
        <span className="tag">{recipe.type}</span>
        <span className="tag">{recipe.flavor}</span>
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
  const emoji = getRecipeEmoji(recipe)
  const gradient = getRecipeGradient(recipe)

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
      <div className={`w-24 h-24 bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl flex items-center justify-center text-5xl flex-shrink-0 shadow-sm`}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-neutral-800 mb-2 group-hover:text-primary-600 transition-colors">
          {recipe.name}
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="tag">{recipe.category}</span>
          <span className="tag">{recipe.type}</span>
          <span className="tag">{recipe.flavor}</span>
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
