import { useParams, Link, useNavigate } from 'react-router-dom'
import { allRecipes as recipes } from '../data/recipes'
import { Recipe } from '../types'
import { Clock, Users, BarChart, ArrowLeft, ChefHat, ShoppingCart, Heart, Edit2, Trash2 } from 'lucide-react'
import { getRecipeEmoji, getRecipeGradient } from '../utils/recipeVisuals'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useCustomRecipeStore } from '../stores/customRecipeStore'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 先从预设查找，再从自定义查找
  const presetRecipe = recipes.find(r => r.id === id)
  const customRecipe = useCustomRecipeStore(state => state.getById(id || ''))
  const removeCustomRecipe = useCustomRecipeStore(state => state.removeRecipe)

  let recipe: Recipe | undefined
  let isCustom = false

  if (presetRecipe) {
    recipe = presetRecipe
  } else if (customRecipe) {
    isCustom = true
    recipe = {
      id: customRecipe.id,
      name: customRecipe.name,
      category: customRecipe.category,
      type: customRecipe.type,
      flavor: customRecipe.flavor,
      ingredients: customRecipe.ingredients,
      steps: customRecipe.steps,
      prepTime: customRecipe.prepTime,
      cookTime: customRecipe.cookTime,
      difficulty: customRecipe.difficulty,
      servings: customRecipe.servings,
      imageUrl: customRecipe.imageUrl,
    }
  }

  // Stores
  const addPlan = useMealPlanStore(state => state.addPlan)
  const { isFavorite, toggleFavorite } = useFavoritesStore()

  if (!recipe) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">😕</div>
        <p className="text-lg font-medium text-neutral-600 mb-2">菜谱未找到</p>
        <Link to="/recipes" className="btn-primary mt-4">
          返回菜谱列表
        </Link>
      </div>
    )
  }

  const emoji = getRecipeEmoji(recipe)
  const gradient = getRecipeGradient(recipe)
  const fav = isFavorite(recipe.id)

  const handleAddToMealPlan = () => {
    const today = new Date().toISOString().split('T')[0]
    addPlan({
      id: '',
      familyId: '',
      date: today,
      mealType: '午餐',
      recipeId: recipe.id,
      recipe,
      createdBy: '',
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 返回按钮 */}
      <button 
        onClick={() => window.history.back()} 
        className="btn-ghost flex items-center gap-2 hover:translate-x-[-4px] transform transition-transform"
      >
        <ArrowLeft size={18} />
        <span>返回列表</span>
      </button>

      {/* 主卡片 */}
      <div className="card overflow-hidden">
        {/* 菜谱封面图 - 使用智能 emoji 和渐变色 */}
        <div className={`aspect-video bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl mb-6 flex items-center justify-center text-[8rem] shadow-lg relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/5"></div>
          <span className="relative z-10 drop-shadow-lg">{emoji}</span>
          {/* 装饰元素 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-black/5 rounded-full blur-2xl"></div>
        </div>

        {/* 菜谱标题和信息 */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800 mb-3 flex items-center gap-3">
              {recipe.name}
              {isCustom && (
                <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 text-sm rounded-full font-medium">
                  我的菜谱
                </span>
              )}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="tag">{recipe.category}</span>
              <span className="tag">{recipe.type}</span>
              <span className="tag">{recipe.flavor}</span>
            </div>
          </div>

          {/* 自定义菜谱操作按钮 */}
          {isCustom && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/custom-recipe?edit=${recipe.id}`)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Edit2 size={14} />编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个菜谱吗？')) {
                    removeCustomRecipe(recipe.id)
                    navigate('/recipes?tab=custom')
                  }
                }}
                className="btn-secondary text-sm flex items-center gap-1.5 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={14} />删除
              </button>
            </div>
          )}

          {/* 信息卡片 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: Clock,
                label: '总时间',
                value: `${recipe.prepTime + recipe.cookTime}分钟`,
                color: 'from-primary-500 to-primary-600',
              },
              {
                icon: Users,
                label: '份量',
                value: `${recipe.servings}人份`,
                color: 'from-secondary-500 to-secondary-600',
              },
              {
                icon: BarChart,
                label: '难度',
                value: recipe.difficulty,
                color: 'from-primary-500 to-secondary-500',
              },
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-neutral-50 to-white rounded-xl p-4 text-center border border-neutral-200 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                  <item.icon size={20} className="text-white" />
                </div>
                <div className="text-sm text-neutral-500 mb-1">{item.label}</div>
                <div className="font-semibold text-neutral-800">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 食材和步骤 */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* 食材列表 */}
            <div>
              <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary-500" />
                食材清单
              </h2>
              <div className="space-y-2">
                {recipe.ingredients.map((ing, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg hover:shadow-sm transition-shadow"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-sm">🥘</span>
                      </div>
                      <span className="font-medium text-neutral-700">{ing.name}</span>
                    </div>
                    <span className="text-sm text-neutral-500 font-medium">
                      {ing.amount}{ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 烹饪步骤 */}
            <div>
              <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <ChefHat size={20} className="text-primary-500" />
                烹饪步骤
              </h2>
              <div className="space-y-3">
                {recipe.steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex gap-4 p-3 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all duration-200"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-lg flex items-center justify-center font-semibold text-sm shadow-sm">
                        {idx + 1}
                      </div>
                    </div>
                    <p className="text-neutral-700 pt-1 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button 
              onClick={handleAddToMealPlan}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>添加到今日饮食计划</span>
            </button>
            <button 
              onClick={() => toggleFavorite(recipe.id)}
              className={`btn-secondary flex items-center justify-center gap-2 ${fav ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' : ''}`}
            >
              <Heart size={16} className={fav ? 'fill-red-500' : ''} />
              <span>{fav ? '已收藏' : '收藏'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
