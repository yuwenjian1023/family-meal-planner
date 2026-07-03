import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Refrigerator, BookOpen, Sparkles, ArrowRight, Clock, Loader } from 'lucide-react'
import { recommendRecipes, checkMissingIngredients } from '../utils/recipeUtils'
import { getRecipeEmoji, getRecipeGradient, cleanRecipeName } from '../utils/recipeVisuals'
import { usePantryStore } from '../stores/pantryStore'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { Recipe } from '../types'
import { fetchAllRecipes } from '../lib/api'

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 从 Zustand store 获取真实库存
  const pantryItemNames = usePantryStore(state => state.getItemNames())

  // 今日日期
  const today = new Date().toISOString().split('T')[0]
  const todayPlans = useMealPlanStore(state => state.getPlansForDate(today))

  // 从数据库加载菜谱
  useEffect(() => {
    async function loadRecipes() {
      setIsLoading(true)
      const data = await fetchAllRecipes()
      setRecipes(data)
      setIsLoading(false)
    }
    loadRecipes()
  }, [])

  // 获取智能推荐（基于真实库存）
  const recommendedRecipes = recommendRecipes(recipes, pantryItemNames).slice(0, 6)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader size={40} className="text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-500">正在加载...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 欢迎区域 - 使用渐变背景 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            👋 今天吃什么？
          </h1>
          <p className="text-lg text-white/90 mb-6 max-w-2xl">
            智能规划家庭饮食，让每一餐都更健康、更温馨
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/recipes" className="btn-secondary bg-white/20 hover:bg-white/30 text-white border-white/30">
              浏览菜谱
              <ArrowRight size={16} className="ml-1" />
            </Link>
            <Link to="/meal-plan" className="btn-ghost text-white hover:bg-white/20">
              查看今日计划
            </Link>
          </div>
        </div>
        {/* 装饰元素 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* 快捷入口 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/meal-plan" className="card-interactive flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">饮食计划</h3>
            <p className="text-sm text-neutral-500">规划每周饮食</p>
          </div>
        </Link>

        <Link to="/pantry" className="card-interactive flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Refrigerator size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">食材库存</h3>
            <p className="text-sm text-neutral-500">管理家中食材</p>
          </div>
        </Link>

        <Link to="/shopping-list" className="card-interactive flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">购物清单</h3>
            <p className="text-sm text-neutral-500">自动生成采购单</p>
          </div>
        </Link>
      </section>

      {/* 智能推荐区域 */}
      {recommendedRecipes.length > 0 && (
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles size={24} className="text-primary-500" />
              为你推荐
            </h2>
            <Link to="/recipes" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              查看全部
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-neutral-600 mb-6">
            基于你家现有的食材，推荐以下菜品：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedRecipes.map((recipe, index) => {
              const missing = checkMissingIngredients(recipe, pantryItemNames)
              const displayName = cleanRecipeName(recipe.name)
              const emoji = getRecipeEmoji(recipe)
              const gradient = getRecipeGradient(recipe)
              const hasImage = !!recipe.imageUrl

              return (
                <Link
                  key={recipe.id}
                  to={`/recipes/${recipe.id}`}
                  className="card-interactive group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* 菜品图标区域 - 有图显示图片 */}
                  <div className={`aspect-video bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transform transition-transform duration-300 shadow-sm overflow-hidden relative`}>
                    {hasImage && (
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
                    )}
                    <span className={`${hasImage ? 'opacity-0' : ''}`}>{emoji}</span>
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors line-clamp-1" title={displayName}>
                      {displayName}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-500 rounded-full">
                      {recipe.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {recipe.prepTime + recipe.cookTime}分钟
                    </span>
                    <span className="flex items-center gap-1">
                      👥 {recipe.servings}人份
                    </span>
                  </div>

                  {missing.length > 0 ? (
                    <p className="text-xs text-orange-500 mt-3">
                      ⚠️ 缺少 {missing.length} 种食材
                    </p>
                  ) : (
                    <p className="text-xs text-green-500 mt-3">
                      ✅ 食材齐全，可以开做！
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 今日饮食计划预览 */}
      {todayPlans.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title flex items-center gap-2">
              <Calendar size={24} className="text-primary-500" />
              今日饮食
            </h2>
            <Link to="/meal-plan" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              查看详情
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['早餐', '午餐', '晚餐'].map(mealType => {
              const plan = todayPlans.find(p => p.mealType === mealType)
              const recipe = recipes.find(r => r.id === plan?.recipeId)
              const emoji = recipe ? getRecipeEmoji(recipe) : '🍽️'
              const displayName = recipe ? cleanRecipeName(recipe.name) : ''

              return (
                <div
                  key={mealType}
                  className={`card ${recipe ? '' : 'border-dashed border-neutral-300'} flex items-center gap-4`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center text-2xl">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-neutral-500 mb-1">{mealType}</div>
                    {recipe ? (
                      <div className="font-medium text-neutral-800" title={displayName}>{displayName}</div>
                    ) : (
                      <Link to="/meal-plan" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        + 添加菜品
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
