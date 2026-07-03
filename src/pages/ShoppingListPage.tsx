import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { ShoppingCart, Plus, Trash2, Check, RotateCcw, Sparkles, Calendar, Edit2, Loader } from 'lucide-react'
import { useShoppingListStore } from '../stores/shoppingListStore'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { usePantryStore } from '../stores/pantryStore'
import { fetchAllRecipes } from '../lib/api'
import type { ShoppingListItem, Recipe } from '../types'

// 食材名称到分类的简易映射
const INGREDIENT_CATEGORY_MAP: Record<string, string> = {
  '鸡蛋': '蛋类', '鸭蛋': '蛋类', '鹌鹑蛋': '蛋类',
  '西红柿': '蔬菜', '土豆': '蔬菜', '白菜': '蔬菜', '青菜': '蔬菜', '菠菜': '蔬菜',
  '胡萝卜': '蔬菜', '白萝卜': '蔬菜', '黄瓜': '蔬菜', '茄子': '蔬菜', '青椒': '蔬菜',
  '辣椒': '蔬菜', '洋葱': '蔬菜', '大蒜': '蔬菜', '姜': '蔬菜', '葱': '蔬菜',
  '芹菜': '蔬菜', '豆芽': '蔬菜', '西兰花': '蔬菜', '花菜': '蔬菜', '冬瓜': '蔬菜',
  '南瓜': '蔬菜', '丝瓜': '蔬菜', '苦瓜': '蔬菜', '莲藕': '蔬菜', '山药': '蔬菜',
  '猪肉': '肉类', '牛肉': '肉类', '羊肉': '肉类', '鸡肉': '肉类', '鸭肉': '肉类',
  '排骨': '肉类', '五花肉': '肉类', '猪蹄': '肉类', '猪肝': '肉类', '火腿': '肉类',
  '虾': '海鲜', '鱼': '海鲜', '螃蟹': '海鲜', '鱿鱼': '海鲜', '带鱼': '海鲜',
  '豆腐': '豆制品', '豆皮': '豆制品', '腐竹': '豆制品', '豆干': '豆制品',
  '酱油': '调料', '盐': '调料', '糖': '调料', '醋': '调料', '料酒': '调料',
  '蚝油': '调料', '豆瓣酱': '调料', '辣椒酱': '调料', '花椒': '调料', '胡椒': '调料',
  '味精': '调料', '鸡精': '调料', '食用油': '调料', '香油': '调料', '淀粉': '调料',
  '大米': '主食', '面粉': '主食', '面条': '主食', '馒头': '主食',
  '苹果': '水果', '香蕉': '水果', '橙子': '水果', '梨': '水果',
  '牛奶': '奶制品', '酸奶': '奶制品', '奶酪': '奶制品', '黄油': '奶制品',
}

function guessCategory(name: string): string {
  for (const [keyword, category] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (name.includes(keyword)) return category
  }
  return '其他'
}

export default function ShoppingListPage() {
  const navigate = useNavigate()
  const { items, addItem, addItems, removeItem, updateItem, toggleChecked, clearChecked } = useShoppingListStore()
  const plans = useMealPlanStore(state => state.plans)
  const pantryItemNames = usePantryStore(state => state.getItemNames())

  const [showAddModal, setShowAddModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [generateDays, setGenerateDays] = useState(7)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // 新增/编辑表单
  const [formName, setFormName] = useState('')
  const [formQty, setFormQty] = useState(1)
  const [formUnit, setFormUnit] = useState('个')
  const [formCategory, setFormCategory] = useState('其他')

  const categories = ['蔬菜', '肉类', '海鲜', '豆制品', '蛋类', '调料', '主食', '水果', '奶制品', '其他']

  const uncheckedItems = useMemo(() => items.filter(i => !i.checked), [items])
  const checkedItems = useMemo(() => items.filter(i => i.checked), [items])

  // 按分类分组未勾选项
  const grouped = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {}
    uncheckedItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    })
    return groups
  }, [uncheckedItems])

  // 生成购物清单
  const handleGenerate = () => {
    const today = new Date()
    const dateRange: string[] = []
    for (let i = 0; i < generateDays; i++) {
      dateRange.push(format(addDays(today, i), 'yyyy-MM-dd'))
    }

    // 收集计划中的所有菜谱
    const plannedRecipes = new Set<string>()
    plans
      .filter(p => dateRange.includes(p.date))
      .forEach(p => {
        plannedRecipes.add(p.recipeId)
      })

    if (plannedRecipes.size === 0) {
      alert('所选日期范围内没有饮食计划，请先在饮食计划中添加菜品')
      setShowGenerateModal(false)
      return
    }

    // 汇总缺少的食材
    const missingMap = new Map<string, { quantity: number; unit: string }>()
    plannedRecipes.forEach(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) return

      recipe.ingredients.forEach(ing => {
        const isMissing = !pantryItemNames.some(
          name => name.includes(ing.name) || ing.name.includes(name)
        )
        if (isMissing) {
          const key = ing.name
          const existing = missingMap.get(key)
          if (existing) {
            existing.quantity += ing.amount
          } else {
            missingMap.set(key, { quantity: ing.amount, unit: ing.unit })
          }
        }
      })
    })

    if (missingMap.size === 0) {
      alert('没有缺少的食材，库存充足！')
      setShowGenerateModal(false)
      return
    }

    const newItems: Omit<ShoppingListItem, 'id' | 'createdAt'>[] = []
    missingMap.forEach((v, name) => {
      newItems.push({
        name,
        quantity: Math.round(v.quantity * 10) / 10,
        unit: v.unit,
        category: guessCategory(name),
        checked: false,
      })
    })

    addItems(newItems)
    setShowGenerateModal(false)
  }

  // 打开编辑
  const openEdit = (item: ShoppingListItem) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormQty(item.quantity)
    setFormUnit(item.unit)
    setFormCategory(item.category)
    setShowAddModal(true)
  }

  // 保存（新增或编辑）
  const handleSave = () => {
    if (!formName.trim()) return
    if (editingId) {
      updateItem(editingId, {
        name: formName.trim(),
        quantity: formQty,
        unit: formUnit,
        category: formCategory,
      })
    } else {
      addItem({
        name: formName.trim(),
        quantity: formQty,
        unit: formUnit,
        category: formCategory,
        checked: false,
      })
    }
    resetForm()
  }

  const resetForm = () => {
    setShowAddModal(false)
    setEditingId(null)
    setFormName('')
    setFormQty(1)
    setFormUnit('个')
    setFormCategory('其他')
  }

  const totalUnchecked = uncheckedItems.length
  const totalChecked = checkedItems.length
  const totalCategories = Object.keys(grouped).length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader size={40} className="text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-500">正在加载...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title flex items-center gap-2">
          <ShoppingCart size={28} className="text-primary-500" />
          购物清单
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles size={18} />
            自动生成
          </button>
          <button
            onClick={() => {
              setEditingId(null)
              resetForm()
              setShowAddModal(true)
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={18} />
            手动添加
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-500">{totalUnchecked}</p>
            <p className="text-sm text-neutral-500">待采购</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-500">{totalChecked}</p>
            <p className="text-sm text-neutral-500">已购买</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-secondary-500">{totalCategories}</p>
            <p className="text-sm text-neutral-500">分类</p>
          </div>
        </div>
      )}

      {/* 按分类展示未勾选项 */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="card">
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
                {category} ({categoryItems.length})
              </h3>
              <div className="space-y-1">
                {categoryItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
                  >
                    <button
                      onClick={() => toggleChecked(item.id)}
                      className="w-5 h-5 rounded border-2 border-neutral-300 hover:border-primary-400 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      {/* 空心圆，勾选后变色 */}
                    </button>
                    <span className="flex-1 text-sm text-neutral-700">{item.name}</span>
                    <span className="text-xs text-neutral-400">
                      {item.quantity}{item.unit}
                    </span>
                    <button
                      onClick={() => openEdit(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-primary-500"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 清除已购 */}
          {checkedItems.length > 0 && (
            <button
              onClick={clearChecked}
              className="w-full py-3 text-sm text-neutral-500 hover:text-red-500 flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 hover:border-red-200 transition-colors"
            >
              <Trash2 size={16} />
              清除已勾选 ({checkedItems.length} 项)
            </button>
          )}
        </div>
      ) : items.length > 0 ? (
        // 全部已购
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={36} className="text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-700 mb-2">全部搞定！</h2>
          <p className="text-neutral-500 mb-6">所有食材都已采购完毕</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={clearChecked}
              className="btn-secondary flex items-center gap-2"
            >
              <Trash2 size={16} />
              清除记录
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles size={16} />
              重新生成
            </button>
          </div>
        </div>
      ) : (
        // 空状态
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={36} className="text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-700 mb-2">购物清单为空</h2>
          <p className="text-neutral-500 mb-6">
            可以手动添加采购项，或根据饮食计划自动生成
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles size={18} />
              自动生成
            </button>
            <button
              onClick={() => {
                setEditingId(null)
                resetForm()
                setShowAddModal(true)
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus size={18} />
              手动添加
            </button>
          </div>
        </div>
      )}

      {/* 已购项目折叠区 */}
      {checkedItems.length > 0 && uncheckedItems.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-medium text-neutral-500 hover:text-neutral-700 select-none">
            已购买 ({checkedItems.length} 项)
          </summary>
          <div className="mt-3 space-y-1">
            {checkedItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg opacity-60"
              >
                <button
                  onClick={() => toggleChecked(item.id)}
                  className="w-5 h-5 rounded border-2 border-green-400 bg-green-100 flex items-center justify-center flex-shrink-0"
                >
                  <Check size={12} className="text-green-600" />
                </button>
                <span className="flex-1 text-sm text-neutral-500 line-through">{item.name}</span>
                <span className="text-xs text-neutral-400">
                  {item.quantity}{item.unit}
                </span>
                <button
                  onClick={() => toggleChecked(item.id)}
                  className="p-1 text-neutral-400 hover:text-primary-500"
                  title="恢复"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 生成弹窗 */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 mb-4 flex items-center gap-2">
                <Sparkles size={22} className="text-primary-500" />
                自动生成购物清单
              </h2>
              <p className="text-neutral-500 mb-6 text-sm">
                根据未来饮食计划，自动检测缺少的食材并生成采购清单
              </p>

              <label className="block mb-2 text-sm font-medium text-neutral-700">计划范围</label>
              <div className="flex gap-2 mb-6">
                {[3, 7, 14].map(days => (
                  <button
                    key={days}
                    onClick={() => setGenerateDays(days)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      generateDays === days
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    未来 {days} 天
                  </button>
                ))}
              </div>

              {plans.length === 0 && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                  <p className="text-sm text-orange-700">
                    暂无饮食计划，请先在饮食计划页面安排菜品
                  </p>
                  <button
                    onClick={() => { setShowGenerateModal(false); navigate('/meal-plan') }}
                    className="mt-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    前往饮食计划 →
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Calendar size={16} />
                  生成清单
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={resetForm}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-neutral-800 mb-4">
                {editingId ? '编辑采购项' : '手动添加'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-neutral-600">名称</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="例如：生抽"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium text-neutral-600">数量</label>
                    <input
                      type="number"
                      value={formQty}
                      onChange={e => setFormQty(Number(e.target.value) || 0)}
                      min={0}
                      step={0.5}
                      className="input-field"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block mb-1 text-sm font-medium text-neutral-600">单位</label>
                    <select
                      value={formUnit}
                      onChange={e => setFormUnit(e.target.value)}
                      className="input-field"
                    >
                      {['个', '克', '千克', '斤', '把', '根', '瓶', '袋', '盒', '包', '块', '勺', '毫升', '升'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-neutral-600">分类</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          formCategory === cat
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={resetForm} className="btn-secondary flex-1">取消</button>
                <button onClick={handleSave} className="btn-primary flex-1">
                  {editingId ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
