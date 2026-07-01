import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { allRecipes } from '../data/recipes'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, isToday, isSameDay
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { checkMissingIngredients } from '../utils/recipeUtils'
import { getRecipeEmoji } from '../utils/recipeVisuals'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { usePantryStore } from '../stores/pantryStore'
import { useCustomRecipeStore } from '../stores/customRecipeStore'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2,
  AlertTriangle, CheckCircle, ChefHat, ShoppingCart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MealPlan, Recipe, CustomRecipe } from '../types'

const MEAL_TYPES: ('早餐' | '午餐' | '晚餐')[] = ['早餐', '午餐', '晚餐']
const MEAL_ICONS = ['🌅', '☀️', '🌙']
const MEAL_LABELS = ['早', '午', '晚']

export default function WeeklyCalendarPage() {
  const navigate = useNavigate()

  // -- Week navigation state --
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  // -- Recipe picker state --
  const [showPicker, setShowPicker] = useState(false)
  const [pickerDate, setPickerDate] = useState('')
  const [pickerMealType, setPickerMealType] = useState<'早餐' | '午餐' | '晚餐'>('早餐')
  const [searchQuery, setSearchQuery] = useState('')

  // -- Stores --
  const plans = useMealPlanStore(s => s.plans)
  const addPlan = useMealPlanStore(s => s.addPlan)
  const removePlan = useMealPlanStore(s => s.removePlan)
  const getPlansForDate = useMealPlanStore(s => s.getPlansForDate)
  const getPlansForMeal = useMealPlanStore(s => s.getPlansForMeal)
  const pantryItemNames = usePantryStore(s => s.getItemNames())
  const customRecipes = useCustomRecipeStore(s => s.recipes)

  // -- Compute week days (Mon → Sun) --
  const weekDays = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end }).slice(0, 7)
  }, [weekStart])

  const weekLabel = useMemo(() => {
    const start = weekDays[0]
    const end = weekDays[6]
    if (!start || !end) return ''
    return `${format(start, 'M月d日')} - ${format(end, 'M月d日')}`
  }, [weekDays])

  // -- Helpers --
  function findRecipe(plan: MealPlan): (Recipe | CustomRecipe) | undefined {
    return allRecipes.find(r => r.id === plan.recipeId) ||
      customRecipes.find(r => r.id === plan.recipeId)
  }

  function getMissing(recipe: Recipe | CustomRecipe | undefined): string[] {
    if (!recipe) return []
    return checkMissingIngredients(
      { ...recipe, imageUrl: recipe.imageUrl } as Recipe,
      pantryItemNames
    )
  }

  function isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // -- Navigation --
  const goPrev = () => setWeekStart(subWeeks(weekStart, 1))
  const goNext = () => setWeekStart(addWeeks(weekStart, 1))
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  // -- Picker --
  function openPicker(dateStr: string, mealType: '早餐' | '午餐' | '晚餐') {
    setPickerDate(dateStr)
    setPickerMealType(mealType)
    setSearchQuery('')
    setShowPicker(true)
  }

  function handleSelectRecipe(recipe: Recipe) {
    addPlan({
      id: '',
      familyId: '',
      date: pickerDate,
      mealType: pickerMealType,
      recipeId: recipe.id,
      recipe,
      createdBy: '',
      createdAt: new Date().toISOString(),
    })
    setShowPicker(false)
  }

  // -- Recipe filter --
  const filteredRecipes = searchQuery
    ? allRecipes.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.includes(searchQuery) ||
      r.type.includes(searchQuery)
    )
    : allRecipes

  // -- Empty state --
  const hasAnyPlan = plans.length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="section-title flex items-center gap-2">
          <Calendar size={28} className="text-primary-500" />
          周视图日历
        </h1>
        <div className="flex items-center gap-2">
          {hasAnyPlan && (
            <button
              onClick={() => navigate('/shopping-list')}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <ShoppingCart size={16} />
              购物清单
            </button>
          )}
        </div>
      </div>

      {/* ===== Week Navigation ===== */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button onClick={goPrev} className="btn-secondary flex items-center gap-1.5">
            <ChevronLeft size={18} /> 上一周
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-neutral-800">{weekLabel}</h2>
            <button
              onClick={goToday}
              className={`text-sm mt-1 px-3 py-0.5 rounded-full transition-colors ${
                isThisWeek
                  ? 'text-primary-300 cursor-default'
                  : 'text-primary-500 hover:bg-primary-50'
              }`}
              disabled={isThisWeek}
            >
              今天
            </button>
          </div>

          <button onClick={goNext} className="btn-secondary flex items-center gap-1.5">
            下一周 <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ===== Week Grid ===== */}
      {hasAnyPlan ? (
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[840px] sm:min-w-0">
            {/* Day headers */}
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const today = isToday(day)
              const weekend = isWeekend(day)

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl overflow-hidden border-2 transition-colors ${
                    today
                      ? 'border-primary-400 bg-primary-50/50'
                      : weekend
                        ? 'border-neutral-100 bg-neutral-50/60'
                        : 'border-neutral-100 bg-white'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-2 py-2.5 text-center border-b ${
                    today ? 'bg-primary-50 border-primary-200' : 'bg-neutral-50 border-neutral-100'
                  }`}>
                    <div className={`text-xs font-medium ${
                      weekend ? 'text-orange-500' : 'text-neutral-500'
                    }`}>
                      {format(day, 'EEEE', { locale: zhCN })}
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${
                      today
                        ? 'text-primary-600'
                        : weekend
                          ? 'text-orange-600'
                          : 'text-neutral-800'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Meal slots */}
                  <div className="p-1 space-y-1">
                    {MEAL_TYPES.map((mealType, mi) => {
                      const plan = getPlansForMeal(dateStr, mealType)
                      const recipe = plan ? findRecipe(plan) : undefined
                      const missing = getMissing(recipe)
                      const allClear = recipe && missing.length === 0

                      return (
                        <div key={mealType} className="relative">
                          {plan && recipe ? (
                            <div className={`rounded-lg p-2 text-center group relative transition-colors ${
                              allClear
                                ? 'bg-green-50 hover:bg-green-100'
                                : 'bg-orange-50 hover:bg-orange-100'
                            }`}>
                              {/* Remove button */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removePlan(plan.id)
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-all z-10"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>

                              {/* Recipe info */}
                              <Link
                                to={`/recipes/${recipe.id}`}
                                className="block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                  <span className="text-xs text-neutral-400">{MEAL_ICONS[mi]}</span>
                                  <span className="text-lg leading-none">
                                    {getRecipeEmoji(recipe as Recipe)}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-neutral-700 line-clamp-2 leading-tight">
                                  {recipe.name}
                                </p>
                              </Link>

                              {/* Status dot */}
                              <div className="flex justify-center mt-1 gap-0.5">
                                {allClear ? (
                                  <span className="flex items-center gap-0.5 text-xs text-green-600">
                                    <CheckCircle size={10} /> 足
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-xs text-orange-500">
                                    <AlertTriangle size={10} /> 缺 {missing.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openPicker(dateStr, mealType)}
                              className="w-full rounded-lg p-2 text-center border border-dashed border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                            >
                              <span className="text-xs text-neutral-300 group-hover:text-primary-400">
                                {MEAL_ICONS[mi]}
                              </span>
                              <Plus size={14} className="mx-auto text-neutral-300 group-hover:text-primary-400" />
                              <span className="text-[10px] text-neutral-300 group-hover:text-primary-400">
                                {MEAL_LABELS[mi]}餐
                              </span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="card text-center py-16">
          <ChefHat size={64} className="mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-semibold text-neutral-500 mb-2">
            本周还没有安排任何餐食
          </h3>
          <p className="text-neutral-400 mb-6">
            点击日历中的「+」按钮添加菜品，开始规划你的一周饮食吧！
          </p>
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            return (
              <div key={dateStr} className="hidden">_day</div>
            )
          })}
          <button
            onClick={() => {
              const today = format(new Date(), 'yyyy-MM-dd')
              openPicker(today, '晚餐')
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            添加今天晚餐
          </button>
        </div>
      )}

      {/* ===== Recipe Picker Modal ===== */}
      {showPicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neutral-800">
                  选择菜品 - {pickerMealType}（{pickerDate}）
                </h2>
                <button
                  onClick={() => setShowPicker(false)}
                  className="btn-ghost text-lg"
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
                    onClick={() => handleSelectRecipe(recipe)}
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

      {/* ===== Week Summary ===== */}
      {hasAnyPlan && (
        <div className="card">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">本周摘要</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayPlans = getPlansForDate(dateStr)
              const today = isToday(day)

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl p-4 text-center ${
                    today
                      ? 'bg-primary-50 border-2 border-primary-300'
                      : 'bg-neutral-50'
                  }`}
                >
                  <p className={`text-xs font-medium mb-2 ${
                    isWeekend(day) ? 'text-orange-500' : 'text-neutral-500'
                  }`}>
                    {format(day, 'M/d EEE', { locale: zhCN })}
                  </p>
                  {dayPlans.length > 0 ? (
                    <div className="space-y-1">
                      {MEAL_TYPES.map((mt, mi) => {
                        const plan = getPlansForMeal(dateStr, mt)
                        const recipe = plan ? findRecipe(plan) : undefined
                        const missing = getMissing(recipe)

                        return (
                          <div key={mt} className="flex items-center justify-center gap-1.5">
                            <span className="text-xs">{MEAL_ICONS[mi]}</span>
                            {recipe ? (
                              <>
                                <span className="text-sm">{getRecipeEmoji(recipe as Recipe)}</span>
                                <span className="text-xs text-neutral-600 truncate max-w-[80px]">
                                  {recipe.name}
                                </span>
                                {missing.length > 0 && (
                                  <span className="text-[10px] text-orange-500">缺{missing.length}</span>
                                )}
                                {missing.length === 0 && (
                                  <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-neutral-300">-</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">未安排</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
