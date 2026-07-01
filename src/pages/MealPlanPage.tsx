import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { allRecipes as recipes } from '../data/recipes'
import { format, addDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { checkMissingIngredients } from '../utils/recipeUtils'
import { getRecipeEmoji } from '../utils/recipeVisuals'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { usePantryStore } from '../stores/pantryStore'
import { Calendar, Plus, Trash2, AlertTriangle, CheckCircle, ChefHat, ShoppingCart, CalendarDays } from 'lucide-react'
import type { Recipe } from '../types'

export default function MealPlanPage() {
  const navigate = useNavigate()
  // Zustand stores
  const plans = useMealPlanStore(state => state.plans)
  const addPlan = useMealPlanStore(state => state.addPlan)
  const removePlan = useMealPlanStore(state => state.removePlan)
  const getPlansForMeal = useMealPlanStore(state => state.getPlansForMeal)
  const pantryItemNames = usePantryStore(state => state.getItemNames())

  // 本地 UI 状态
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showRecipePicker, setShowRecipePicker] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<'早餐' | '午餐' | '晚餐'>('早餐')
  const [searchQuery, setSearchQuery] = useState('')

  const mealTypes: ('早餐' | '午餐' | '晚餐')[] = ['早餐', '午餐', '晚餐']
  const mealIcons = ['🌅', '☀️', '🌙']

  const handleAddMeal = (recipe: Recipe) => {
    addPlan({
      id: '',
      familyId: '',
      date: selectedDate,
      mealType: selectedMealType,
      recipeId: recipe.id,
      recipe,
      createdBy: '',
      createdAt: new Date().toISOString(),
    })
    setShowRecipePicker(false)
    setSearchQuery('')
  }

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.includes(searchQuery) ||
    r.type.includes(searchQuery)
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="section-title flex items-center gap-2 mb-6">
        <Calendar size={28} className="text-primary-500" />
        饮食计划
      </h1>

      {/* 快捷操作 */}
      {plans.length > 0 && (
        <div className="flex justify-end gap-2 mb-2">
          <button
            onClick={() => navigate('/weekly')}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <CalendarDays size={16} />
            周视图
          </button>
          <button
            onClick={() => navigate('/shopping-list')}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ShoppingCart size={16} />
            查看购物清单
          </button>
        </div>
      )}

      {/* 日期选择 */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), -1), 'yyyy-MM-dd'))}
            className="btn-secondary flex items-center gap-2"
          >
            ← 前一天
          </button>
          <div className="text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field w-auto text-center font-medium"
            />
            <p className="text-sm text-neutral-500 mt-1">
              {format(new Date(selectedDate), 'yyyy年M月d日 EEEE', { locale: zhCN })}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
            className="btn-secondary flex items-center gap-2"
          >
            后一天 →
          </button>
        </div>
      </div>

      {/* 三餐安排 */}
      <div className="space-y-4">
        {mealTypes.map((mealType, idx) => {
          const plan = getPlansForMeal(selectedDate, mealType)
          const recipe = plan ? recipes.find(r => r.id === plan.recipeId) : null
          const missingIngredients = recipe ? checkMissingIngredients(recipe, pantryItemNames) : []

          return (
            <div key={mealType} className="card animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-2xl shadow-md">
                    {mealIcons[idx]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800">{mealType}</h3>
                    <p className="text-sm text-neutral-500">
                      {plan ? '已安排菜品' : '暂未安排'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedMealType(mealType)
                    setShowRecipePicker(true)
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">{plan ? '更换菜品' : '添加菜品'}</span>
                </button>
              </div>

              {plan && recipe ? (
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <Link
                      to={`/recipes/${recipe.id}`}
                      className="flex-1 flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm">
                        {getRecipeEmoji(recipe)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-800 mb-1 hover:text-primary-600 transition-colors">
                          {recipe.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="tag">{recipe.category}</span>
                          <span className="tag">{recipe.type}</span>
                        </div>
                        <p className="text-sm text-neutral-500">
                          ⏱️ {recipe.prepTime + recipe.cookTime}分钟 · 👥 {recipe.servings}人份
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => removePlan(plan.id)}
                      className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* 缺货提醒 */}
                  {missingIngredients.length > 0 && (
                    <div className="mt-4 flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <AlertTriangle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800 mb-1">缺少食材</p>
                        <p className="text-sm text-orange-600">
                          {missingIngredients.join('、')}
                        </p>
                      </div>
                    </div>
                  )}

                  {missingIngredients.length === 0 && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-green-800">食材充足，可以制作！</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <ChefHat size={48} className="mx-auto mb-3 text-neutral-300" />
                  <p>点击"添加菜品"安排{mealType}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 菜谱选择器弹窗 */}
      {showRecipePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => { setShowRecipePicker(false); setSearchQuery('') }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neutral-800">
                  选择菜品 - {selectedMealType}
                </h2>
                <button
                  onClick={() => {
                    setShowRecipePicker(false)
                    setSearchQuery('')
                  }}
                  className="btn-ghost"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="搜索菜谱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => handleAddMeal(recipe)}
                    className="card-interactive text-left p-4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transform transition-transform">
                        {getRecipeEmoji(recipe)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-neutral-800 truncate group-hover:text-primary-600 transition-colors">
                          {recipe.name}
                        </h4>
                        <p className="text-sm text-neutral-500">
                          {recipe.category} · {recipe.prepTime + recipe.cookTime}分钟
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {filteredRecipes.length === 0 && (
                <div className="text-center py-8 text-neutral-400">
                  没有找到相关菜谱
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
