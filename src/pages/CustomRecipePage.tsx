import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, ChefHat, Clock, Users } from 'lucide-react'
import { useCustomRecipeStore } from '../stores/customRecipeStore'
import { fetchAllCategories } from '../lib/api'
import type { RecipeCategory } from '../lib/api'
import type { Ingredient, CustomRecipeInput } from '../types'

const FLAVORS = ['清淡', '麻辣', '酸甜', '咸香', '酸辣', '鲜香', '酱香', '孜然', '五香', '蒜香', '咖喱', '甜味']
const DIFFICULTIES = ['简单', '中等', '困难']

interface CategoryNode {
  id: string
  name: string
  children: CategoryNode[]
}

export default function CustomRecipePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const { addRecipe, updateRecipe, getById } = useCustomRecipeStore()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')        // 一级分类名称
  const [subcategory, setSubcategory] = useState('')   // 二级分类名称
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined)
  const [flavor, setFlavor] = useState('清淡')
  const [difficulty, setDifficulty] = useState<'简单' | '中等' | '困难'>('简单')
  const [prepTime, setPrepTime] = useState(15)
  const [cookTime, setCookTime] = useState(20)
  const [servings, setServings] = useState(2)
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: 0, unit: '克' }])
  const [steps, setSteps] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)

  // 分类树
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const isEditing = Boolean(editId)

  // 加载分类数据
  useEffect(() => {
    let mounted = true
    fetchAllCategories().then((cats: RecipeCategory[]) => {
      if (!mounted) return
      // 构建树
      const parents = cats.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
      const tree: CategoryNode[] = parents.map(p => ({
        id: p.id,
        name: p.name,
        children: cats
          .filter(c => c.parent_id === p.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(c => ({ id: c.id, name: c.name, children: [] })),
      }))
      setCategoryTree(tree)
      setLoadingCategories(false)
      // 默认选第一个一级分类
      if (tree.length > 0 && !category) {
        setCategory(tree[0].name)
      }
    })
    return () => { mounted = false }
  }, [])

  // 编辑时回填
  useEffect(() => {
    if (editId) {
      const recipe = getById(editId)
      if (recipe) {
        setName(recipe.name)
        setCategory(recipe.category)
        setSubcategory(recipe.type)
        setSubcategoryId(recipe.subcategoryId)
        setFlavor(recipe.flavor)
        setDifficulty(recipe.difficulty)
        setPrepTime(recipe.prepTime)
        setCookTime(recipe.cookTime)
        setServings(recipe.servings)
        setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', amount: 0, unit: '克' }])
        setSteps(recipe.steps.length > 0 ? recipe.steps : [''])
      }
    }
  }, [editId])

  // 当前一级分类下的二级分类列表
  const currentChildren = useMemo(() => {
    const parent = categoryTree.find(p => p.name === category)
    return parent?.children || []
  }, [categoryTree, category])

  // 切换一级分类时，自动选第一个二级分类
  useEffect(() => {
    if (currentChildren.length > 0 && !currentChildren.some(c => c.name === subcategory)) {
      setSubcategory(currentChildren[0].name)
      setSubcategoryId(currentChildren[0].id)
    }
  }, [currentChildren, subcategory])

  const handleSubcategoryChange = (childName: string) => {
    setSubcategory(childName)
    const child = currentChildren.find(c => c.name === childName)
    setSubcategoryId(child?.id)
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0, unit: '克' }])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    )
    setIngredients(updated)
  }

  const addStep = () => setSteps([...steps, ''])
  const removeStep = (index: number) => {
    if (steps.length <= 1) return
    setSteps(steps.filter((_, i) => i !== index))
  }
  const updateStep = (index: number, value: string) => {
    setSteps(steps.map((s, i) => (i === index ? value : s)))
  }

  const handleSave = () => {
    if (!name.trim()) return
    const validIngredients = ingredients.filter(i => i.name.trim())
    const validSteps = steps.filter(s => s.trim())

    if (validIngredients.length === 0 || validSteps.length === 0) return

    setSaving(true)

    const input: CustomRecipeInput = {
      name: name.trim(),
      category,       // 一级分类
      type: subcategory, // 二级分类
      flavor,
      difficulty,
      prepTime,
      cookTime,
      servings,
      ingredients: validIngredients,
      steps: validSteps,
      subcategoryId,
    }

    if (isEditing && editId) {
      updateRecipe(editId, input)
    } else {
      addRecipe(input)
    }

    setTimeout(() => {
      setSaving(false)
      navigate('/recipes?tab=custom')
    }, 300)
  }

  const totalTime = prepTime + cookTime

  return (
    <div className="animate-fade-in pb-8">
      {/* 顶部 */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-neutral-100 transition-colors">
          <ArrowLeft size={20} className="text-neutral-600" />
        </button>
        <h1 className="section-title flex items-center gap-2">
          <ChefHat size={28} className="text-primary-500" />
          {isEditing ? '编辑菜谱' : '创建菜谱'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 基本信息卡片 */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-neutral-800">基本信息</h2>

          {/* 菜名 */}
          <div>
            <label className="block mb-1 text-sm font-medium text-neutral-600">菜谱名称 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：西红柿炒鸡蛋"
              className="input-field text-lg"
              autoFocus
            />
          </div>

          {/* 分类行 - 级联选择器 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">一级分类</label>
              {loadingCategories ? (
                <div className="input-field text-neutral-400">加载中...</div>
              ) : (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="input-field"
                >
                  {categoryTree.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">二级分类</label>
              <select
                value={subcategory}
                onChange={e => handleSubcategoryChange(e.target.value)}
                className="input-field"
                disabled={currentChildren.length === 0}
              >
                {currentChildren.length === 0 && <option value="">暂无</option>}
                {currentChildren.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 口味行 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">口味</label>
              <select value={flavor} onChange={e => setFlavor(e.target.value)} className="input-field">
                {FLAVORS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">难度</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as '简单' | '中等' | '困难')} className="input-field">
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">份量</label>
              <input type="number" value={servings} onChange={e => setServings(Number(e.target.value) || 1)} min={1} className="input-field" />
            </div>
          </div>

          {/* 时间行 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">准备时间 (分)</label>
              <input type="number" value={prepTime} onChange={e => setPrepTime(Number(e.target.value) || 0)} min={0} className="input-field" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-neutral-600">烹饪时间 (分)</label>
              <input type="number" value={cookTime} onChange={e => setCookTime(Number(e.target.value) || 0)} min={0} className="input-field" />
            </div>
          </div>

          {/* 统计预览 */}
          <div className="flex gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1"><Clock size={14} />{totalTime} 分钟</span>
            <span className="flex items-center gap-1"><Users size={14} />{servings} 人份</span>
          </div>
        </div>

        {/* 食材清单 */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">食材清单</h2>
            <button onClick={addIngredient} className="btn-secondary text-sm flex items-center gap-1 py-1 px-3">
              <Plus size={14} />添加
            </button>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ing.name}
                  onChange={e => updateIngredient(i, 'name', e.target.value)}
                  placeholder="食材名"
                  className="input-field flex-[2]"
                />
                <input
                  type="number"
                  value={ing.amount || ''}
                  onChange={e => updateIngredient(i, 'amount', Number(e.target.value) || 0)}
                  placeholder="量"
                  min={0}
                  step={0.5}
                  className="input-field flex-1"
                />
                <select
                  value={ing.unit}
                  onChange={e => updateIngredient(i, 'unit', e.target.value)}
                  className="input-field w-20"
                >
                  {['克', '千克', '斤', '个', '勺', '把', '根', '块', '片', '毫升', '升', '杯'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeIngredient(i)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 烹饪步骤 */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">烹饪步骤</h2>
            <button onClick={addStep} className="btn-secondary text-sm flex items-center gap-1 py-1 px-3">
              <Plus size={14} />添加步骤
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                  {i + 1}
                </span>
                <div className="flex-1 flex gap-2">
                  <textarea
                    value={step}
                    onChange={e => updateStep(i, e.target.value)}
                    placeholder={`第 ${i + 1} 步的操作说明...`}
                    className="input-field flex-1 min-h-[60px]"
                    rows={2}
                  />
                  <button
                    onClick={() => removeStep(i)}
                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors self-start mt-1"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? '保存中...' : isEditing ? '保存修改' : '创建菜谱'}
        </button>
      </div>
    </div>
  )
}
