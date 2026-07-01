import { Link } from 'react-router-dom'
import { Calendar, Refrigerator, BookOpen, Sparkles, ArrowRight, Clock } from 'lucide-react'
import { allRecipes as recipes } from '../data/recipes'
import { recommendRecipes, checkMissingIngredients } from '../utils/recipeUtils'
import { getRecipeEmoji, getRecipeGradient } from '../utils/recipeVisuals'
import { usePantryStore } from '../stores/pantryStore'
import { useMealPlanStore } from '../stores/mealPlanStore'

export default function HomePage() {
  // 从 Zustand store 获取真实库存
  const pantryItemNames = usePantryStore(state => state.getItemNames())
  
  // 今日日期
  const today = new Date().toISOString().split('T')[0]
  const todayPlans = useMealPlanStore(state => state.getPlansForDate(today))

  // 获取智能推荐（基于真实库存）
  const recommendedRecipes = recommendRecipes(recipes, pantryItemNames).slice(0, 6)

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
              const emoji = getRecipeEmoji(recipe)
              const gradient = getRecipeGradient(recipe)

              return (
                <Link 
                  key={recipe.id} 
                  to={`/recipes/${recipe.id}`}
                  className="card-interactive group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* 菜品图标区域 */}
                  <div className={`aspect-video bg-gradient-to-br ${gradient.from} ${gradient.to} rounded-xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transform transition-transform duration-300 shadow-sm`}>
                    {emoji}
                  </div>
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-800 mb-1 group-hover:text-primary-600 transition-colors">
                        {recipe.name}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {recipe.category} · {recipe.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-neutral-400">
                      <Clock size={14} />
                      {recipe.prepTime + recipe.cookTime}分钟
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="tag">{recipe.flavor}</span>
                    <span className="tag">{recipe.difficulty}</span>
                  </div>
                  
                  {missing.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                      <span>⚠️</span>
                      <span>缺少：{missing.slice(0, 3).join('、')}{missing.length > 3 && '...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                      <span>✅</span>
                      <span>食材充足，可以制作</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 功能入口 */}
      <section>
        <h2 className="section-title mb-6">快速开始</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              to: '/recipes',
              icon: BookOpen,
              title: '浏览菜谱',
              description: `${recipes.length} 道家常菜`,
              gradient: 'from-primary-500 to-primary-600',
            },
            {
              to: '/meal-plan',
              icon: Calendar,
              title: '饮食计划',
              description: '安排每日三餐',
              gradient: 'from-secondary-500 to-secondary-600',
            },
            {
              to: '/pantry',
              icon: Refrigerator,
              title: '食材库存',
              description: '管理家里食材',
              gradient: 'from-primary-500 to-secondary-500',
            },
            {
              to: '/recipes',
              icon: Sparkles,
              title: '智能推荐',
              description: '根据库存推荐',
              gradient: 'from-secondary-500 to-primary-500',
            },
          ].map((item, index) => (
            <Link 
              key={item.to} 
              to={item.to}
              className="card-interactive group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow group-hover:scale-110 transform duration-300`}>
                  <item.icon size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-neutral-500">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 今日饮食计划预览 */}
      <section className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title flex items-center gap-2 mb-0">
            <Calendar size={24} className="text-primary-500" />
            今日饮食计划
          </h2>
          <Link to="/meal-plan" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            管理计划
            <ArrowRight size={16} />
          </Link>
        </div>
        {todayPlans.length > 0 ? (
          <div className="space-y-3">
            {['早餐', '午餐', '晚餐'].map((meal, index) => {
              const plan = todayPlans.find(p => p.mealType === meal)
              const recipe = plan ? recipes.find(r => r.id === plan.recipeId) : null
              
              return (
                <div
                  key={meal}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl hover:shadow-md transition-all duration-200"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-2xl">
                        {meal === '早餐' ? '🌅' : meal === '午餐' ? '☀️' : '🌙'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-800">{meal}</span>
                      {recipe ? (
                        <Link to={`/recipes/${recipe.id}`} className="block text-sm text-primary-500 hover:text-primary-600">
                          {getRecipeEmoji(recipe)} {recipe.name}
                        </Link>
                      ) : (
                        <p className="text-sm text-neutral-500">点击安排菜品</p>
                      )}
                    </div>
                  </div>
                  {recipe ? (
                    <span className="tag">{recipe.category}</span>
                  ) : (
                    <Link to="/meal-plan" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                      未安排 →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {['早餐', '午餐', '晚餐'].map((meal, index) => (
              <div
                key={meal}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl hover:shadow-md transition-all duration-200"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-2xl">
                      {meal === '早餐' ? '🌅' : meal === '午餐' ? '☀️' : '🌙'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-800">{meal}</span>
                    <p className="text-sm text-neutral-500">点击安排菜品</p>
                  </div>
                </div>
                <Link to="/meal-plan" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                  未安排 →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
