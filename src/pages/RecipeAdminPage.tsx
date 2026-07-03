import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X,
  ChefHat, FolderPlus, ImagePlus, Loader
} from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'
import {
  fetchAllRecipes, deleteRecipe, saveRecipe,
  fetchAllCategories, createCategory, updateCategory, deleteCategory,
  uploadRecipeImage, seedDefaultCategories,
  RecipeInput, RecipeCategory, Recipe
} from '../lib/api'
import { Ingredient } from '../types'

export default function RecipeAdminPage() {
  const { isAdmin, isLoading } = useAdmin()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [activeTab, setActiveTab] = useState<'recipes' | 'categories'>('recipes')
  const [isSaving, setIsSaving] = useState(false)

  // 编辑状态
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showCategoryEditor, setShowCategoryEditor] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RecipeCategory | null>(null)

  // 分类选择状态
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)
  const [showCategorySelect, setShowCategorySelect] = useState(false)
  const [showTypeSelect, setShowTypeSelect] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState<RecipeInput>({
    name: '',
    category: '',
    type: '',
    flavor: '',
    ingredients: [],
    steps: [],
    prep_time: 10,
    cook_time: 30,
    difficulty: '中等',
    servings: 2,
    image_url: null,
    category_id: null,
    subcategory_id: null,
    is_published: true,
    steps_data: [],
  })

  // 步骤（支持图片）
  const [steps, setSteps] = useState<{ step_number: number; description: string; image_url: string | null; imageFile?: File }[]>([])

  // 配料
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [newIngredient, setNewIngredient] = useState({ name: '', amount: 0, unit: '克' })

  // 分类表单
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parent_id: null as string | null,
    description: '',
    sort_order: 0,
    is_active: true,
  })

  // 加载数据
  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  // 点击外部关闭分类下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-category-dropdown]')) {
        setShowCategorySelect(false)
        setShowTypeSelect(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadData() {
    const [recipesData, categoriesData] = await Promise.all([
      fetchAllRecipes(),
      fetchAllCategories(),
    ])
    setRecipes(recipesData)

    // 如果分类表为空但食谱有数据，自动从食谱中初始化分类
    if (categoriesData.length === 0 && recipesData.length > 0) {
      const result = await seedDefaultCategories()
      if (result.parentCount > 0) {
        // 重新加载分类
        const newCategories = await fetchAllCategories()
        setCategories(newCategories)
        console.log(`已自动初始化分类: ${result.parentCount} 个一级分类, ${result.childCount} 个二级分类`)
        return
      }
    }

    setCategories(categoriesData)
  }

  // 构建分类树（优先使用数据库分类，若为空则从食谱数据中提取）
  const effectiveCategories = useMemo<RecipeCategory[]>(() => {
    if (categories.length > 0) return categories

    // 从食谱数据中提取分类层级
    const catTypeMap = new Map<string, Set<string>>()
    recipes.forEach(r => {
      if (r.category) {
        if (!catTypeMap.has(r.category)) catTypeMap.set(r.category, new Set())
        if (r.type) catTypeMap.get(r.category)!.add(r.type)
      }
    })

    const derived: RecipeCategory[] = []
    let sortOrder = 0
    catTypeMap.forEach((types, catName) => {
      const parentId = `_cat_${catName}`
      derived.push({
        id: parentId,
        name: catName,
        slug: catName,
        parent_id: null,
        description: null,
        icon: null,
        sort_order: sortOrder++,
        is_active: true,
        created_at: '',
        updated_at: '',
      })
      types.forEach(typeName => {
        derived.push({
          id: `_sub_${catName}_${typeName}`,
          name: typeName,
          slug: typeName,
          parent_id: parentId,
          description: null,
          icon: null,
          sort_order: sortOrder++,
          is_active: true,
          created_at: '',
          updated_at: '',
        })
      })
    })
    return derived
  }, [categories, recipes])

  const parentCategories = effectiveCategories.filter(c => !c.parent_id)
  const getChildCategories = (parentId: string) =>
    effectiveCategories.filter(c => c.parent_id === parentId)

  // 权限检查
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader size={40} className="text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-500">正在加载...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">权限不足</h2>
        <p className="text-neutral-500 mb-6">只有管理员可以访问此页面</p>
        <Link to="/" className="btn-primary">
          返回首页
        </Link>
      </div>
    )
  }

  // 新建食谱
  const handleNewRecipe = () => {
    setEditingRecipe(null)
    setFormData({
      name: '',
      category: '',
      type: '',
      flavor: '',
      ingredients: [],
      steps: [],
      prep_time: 10,
      cook_time: 30,
      difficulty: '中等',
      servings: 2,
      image_url: null,
      category_id: null,
      subcategory_id: null,
      is_published: true,
      steps_data: [],
    })
    setIngredients([])
    setSteps([{ step_number: 1, description: '', image_url: null }])
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
    setShowEditor(true)
  }

  // 编辑食谱
  const handleEditRecipe = async (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormData({
      name: recipe.name,
      category: recipe.category,
      type: recipe.type,
      flavor: recipe.flavor,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      image_url: recipe.imageUrl || null,
      category_id: null,
      subcategory_id: null,
      is_published: true,
      steps_data: [],
    })
    setIngredients(recipe.ingredients)
    setSteps(
      recipe.steps.map((s: string, i: number) => ({
        step_number: i + 1,
        description: s,
        image_url: null,
      }))
    )

    // 根据现有 category/type 匹配分类树
    const matchedParent = effectiveCategories.find(c => !c.parent_id && c.name === recipe.category)
    if (matchedParent) {
      setSelectedCategoryId(matchedParent.id)
      const matchedChild = effectiveCategories.find(c => c.parent_id === matchedParent.id && c.name === recipe.type)
      setSelectedSubcategoryId(matchedChild?.id || null)
    } else {
      setSelectedCategoryId(null)
      setSelectedSubcategoryId(null)
    }

    setShowEditor(true)
  }

  // 删除食谱
  const handleDeleteRecipe = async (id: string) => {
    if (confirm('确定要删除这个食谱吗？')) {
      const success = await deleteRecipe(id)
      if (success) {
        loadData()
      }
    }
  }

  // 保存食谱
  const handleSaveRecipe = async () => {
    if (!formData.name.trim()) {
      alert('请输入食谱名称')
      return
    }
    if (ingredients.length === 0) {
      alert('请至少添加一种配料')
      return
    }
    if (steps.filter(s => s.description.trim()).length === 0) {
      alert('请至少添加一个步骤')
      return
    }

    setIsSaving(true)

    try {
      // 先上传步骤中的图片
      const stepsWithImages = await Promise.all(
        steps.map(async (step) => {
          if (step.imageFile) {
            const tempId = editingRecipe?.id || 'temp-' + Date.now()
            const imageUrl = await uploadRecipeImage(step.imageFile, tempId)
            return { ...step, image_url: imageUrl, imageFile: undefined }
          }
          return step
        })
      )

      // 保存食谱
      const recipeId = await saveRecipe(
        {
          ...formData,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId,
          ingredients,
          steps: stepsWithImages.map(s => s.description).filter(Boolean),
          steps_data: stepsWithImages.filter(s => s.description.trim()),
        },
        editingRecipe?.id
      )

      if (recipeId) {
        alert('保存成功！')
        setShowEditor(false)
        loadData()
      } else {
        alert('保存失败，请重试')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // 上传封面图片
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    try {
      const tempId = editingRecipe?.id || 'temp-' + Date.now()
      const imageUrl = await uploadRecipeImage(file, tempId)
      if (imageUrl) {
        setFormData({ ...formData, image_url: imageUrl })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // 添加步骤
  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, description: '', image_url: null }])
  }

  // 删除步骤
  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps.map((s, i) => ({ ...s, step_number: i + 1 })))
  }

  // 上移步骤
  const moveStepUp = (index: number) => {
    if (index === 0) return
    const newSteps = [...steps]
    ;[newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]
    setSteps(newSteps.map((s, i) => ({ ...s, step_number: i + 1 })))
  }

  // 下移步骤
  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return
    const newSteps = [...steps]
    ;[newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
    setSteps(newSteps.map((s, i) => ({ ...s, step_number: i + 1 })))
  }

  // 添加配料
  const addIngredient = () => {
    if (newIngredient.name.trim()) {
      setIngredients([...ingredients, { ...newIngredient }])
      setNewIngredient({ name: '', amount: 0, unit: '克' })
    }
  }

  // 删除配料
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  // 新建分类
  const handleNewCategory = () => {
    setEditingCategory(null)
    setCategoryForm({
      name: '',
      slug: '',
      parent_id: null,
      description: '',
      sort_order: 0,
      is_active: true,
    })
    setShowCategoryEditor(true)
  }

  // 编辑分类
  const handleEditCategory = (category: RecipeCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      description: category.description || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setShowCategoryEditor(true)
  }

  // 保存分类
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      alert('请填写分类名称和别名')
      return
    }

    const success = editingCategory
      ? await updateCategory(editingCategory.id, categoryForm)
      : await createCategory(categoryForm)

    if (success) {
      alert('保存成功！')
      setShowCategoryEditor(false)
      loadData()
    } else {
      alert('保存失败，请重试')
    }
  }

  // 删除分类
  const handleDeleteCategory = async (id: string) => {
    if (confirm('确定要删除这个分类吗？子分类也会被删除。')) {
      const success = await deleteCategory(id)
      if (success) {
        loadData()
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2 mb-0">
          <ChefHat size={28} className="text-primary-500" />
          食谱管理后台
        </h1>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'recipes'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          食谱管理 ({recipes.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          分类管理 ({categories.length})
        </button>
      </div>

      {/* 食谱管理 */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-neutral-500">共 {recipes.length} 道菜谱</p>
            <button
              onClick={handleNewRecipe}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              新建食谱
            </button>
          </div>

          {/* 食谱列表 */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">食谱名称</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">分类</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">难度</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">用时</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            className="w-12 h-12 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-2xl">
                            🍽️
                          </div>
                        )}
                        <span className="font-medium text-neutral-800">{recipe.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="tag">{recipe.category}</span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{recipe.difficulty}</td>
                    <td className="py-3 px-4 text-neutral-600">
                      {recipe.prepTime + recipe.cookTime}分钟
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditRecipe(recipe)}
                          className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {recipes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      暂无食谱，点击右上角"新建食谱"开始创建
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分类管理 */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-neutral-500">共 {categories.length} 个分类</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (confirm('将从现有食谱数据中提取分类并存入数据库，确定？')) {
                    const result = await seedDefaultCategories()
                    if (result.parentCount > 0) {
                      alert(`初始化完成！创建了 ${result.parentCount} 个一级分类, ${result.childCount} 个二级分类`)
                      loadData()
                    } else {
                      alert('没有找到食谱数据，请先导入食谱。')
                    }
                  }
                }}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                从食谱初始化
              </button>
              <button
                onClick={handleNewCategory}
                className="btn-primary flex items-center gap-2"
              >
                <FolderPlus size={16} />
                新建分类
              </button>
            </div>
          </div>

          {/* 分类列表 */}
          <div className="space-y-3">
            {parentCategories.map((cat) => (
              <div key={cat.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon || '📁'}</span>
                    <div>
                      <div className="font-medium text-neutral-800">{cat.name}</div>
                      <div className="text-sm text-neutral-500">
                        {cat.slug} · {cat.description}
                      </div>
                    </div>
                    {!cat.is_active && (
                      <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-xs rounded-full">
                        已禁用
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* 子分类 */}
                {getChildCategories(cat.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 pl-12 space-y-2">
                    {getChildCategories(cat.id).map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{child.icon || '📂'}</span>
                          <div>
                            <div className="font-medium text-neutral-700">{child.name}</div>
                            <div className="text-xs text-neutral-500">{child.slug}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCategory(child)}
                            className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(child.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 食谱编辑弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-800">
                {editingRecipe ? '编辑食谱' : '新建食谱'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="font-medium text-neutral-800">基本信息</h3>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    食谱名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="例如：鱼香肉丝"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative" data-category-dropdown>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      菜系（一级分类）
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowCategorySelect(!showCategorySelect); setShowTypeSelect(false) }}
                      className="input-field text-left flex items-center justify-between"
                    >
                      <span className={selectedCategoryId ? 'text-neutral-800' : 'text-neutral-400'}>
                        {selectedCategoryId
                          ? parentCategories.find(c => c.id === selectedCategoryId)?.name || formData.category
                          : '点击选择一级分类'}
                      </span>
                      <ChevronDown size={16} className={`text-neutral-400 transition-transform ${showCategorySelect ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategorySelect && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {parentCategories.filter(c => c.is_active).map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(cat.id)
                              setSelectedSubcategoryId(null)
                              setFormData({ ...formData, category: cat.name, type: '', category_id: cat.id, subcategory_id: null })
                              setShowCategorySelect(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                              selectedCategoryId === cat.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700'
                            }`}
                          >
                            <span>{cat.icon || '📁'}</span>
                            <span>{cat.name}</span>
                            {selectedCategoryId === cat.id && (
                              <span className="ml-auto text-primary-500">✓</span>
                            )}
                          </button>
                        ))}
                        {parentCategories.filter(c => c.is_active).length === 0 && (
                          <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                            暂无分类，请先在"分类管理"中创建
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative" data-category-dropdown>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      类型（二级分类）
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowTypeSelect(!showTypeSelect); setShowCategorySelect(false) }}
                      disabled={!selectedCategoryId}
                      className={`input-field text-left flex items-center justify-between ${
                        !selectedCategoryId ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className={selectedSubcategoryId ? 'text-neutral-800' : 'text-neutral-400'}>
                        {selectedSubcategoryId
                          ? effectiveCategories.find(c => c.id === selectedSubcategoryId)?.name || formData.type
                          : selectedCategoryId
                            ? '点击选择二级分类'
                            : '请先选择一级分类'}
                      </span>
                      <ChevronDown size={16} className={`text-neutral-400 transition-transform ${showTypeSelect ? 'rotate-180' : ''}`} />
                    </button>
                    {showTypeSelect && selectedCategoryId && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getChildCategories(selectedCategoryId).filter(c => c.is_active).map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedSubcategoryId(cat.id)
                              setFormData({ ...formData, type: cat.name, subcategory_id: cat.id })
                              setShowTypeSelect(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                              selectedSubcategoryId === cat.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-700'
                            }`}
                          >
                            <span>{cat.icon || '📂'}</span>
                            <span>{cat.name}</span>
                            {selectedSubcategoryId === cat.id && (
                              <span className="ml-auto text-primary-500">✓</span>
                            )}
                          </button>
                        ))}
                        {getChildCategories(selectedCategoryId).filter(c => c.is_active).length === 0 && (
                          <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                            该分类下暂无二级分类
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      口味
                    </label>
                    <input
                      type="text"
                      value={formData.flavor}
                      onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                      className="input-field"
                      placeholder="例如：咸鲜"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      难度
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="input-field"
                    >
                      <option value="简单">简单</option>
                      <option value="中等">中等</option>
                      <option value="困难">困难</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      准备时间（分钟）
                    </label>
                    <input
                      type="number"
                      value={formData.prep_time}
                      onChange={(e) => setFormData({ ...formData, prep_time: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      烹饪时间（分钟）
                    </label>
                    <input
                      type="number"
                      value={formData.cook_time}
                      onChange={(e) => setFormData({ ...formData, cook_time: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      份量（人份）
                    </label>
                    <input
                      type="number"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* 封面图片 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    封面图片
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.image_url ? (
                      <div className="relative">
                        <img
                          src={formData.image_url}
                          alt="封面"
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <button
                          onClick={() => setFormData({ ...formData, image_url: null })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                        <ImagePlus size={24} className="text-neutral-400" />
                        <span className="text-xs text-neutral-500 mt-1">上传图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverImageUpload}
                        />
                      </label>
                    )}
                    <p className="text-xs text-neutral-500">
                      建议尺寸：800x600px，支持 JPG、PNG 格式
                    </p>
                  </div>
                </div>
              </div>

              {/* 配料 */}
              <div className="space-y-4">
                <h3 className="font-medium text-neutral-800">配料</h3>

                <div className="space-y-2">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex items-center gap-2 bg-neutral-50 p-2 rounded-lg">
                      <span className="flex-1 text-neutral-800">{ing.name}</span>
                      <span className="text-neutral-600">{ing.amount}</span>
                      <span className="text-neutral-500">{ing.unit}</span>
                      <button
                        onClick={() => removeIngredient(index)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      配料名称
                    </label>
                    <input
                      type="text"
                      value={newIngredient.name}
                      onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                      className="input-field"
                      placeholder="例如：五花肉"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      用量
                    </label>
                    <input
                      type="number"
                      value={newIngredient.amount}
                      onChange={(e) => setNewIngredient({ ...newIngredient, amount: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      单位
                    </label>
                    <input
                      type="text"
                      value={newIngredient.unit}
                      onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                      className="input-field"
                      placeholder="克"
                    />
                  </div>
                  <button
                    onClick={addIngredient}
                    className="btn-secondary px-4"
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* 步骤（支持图片） */}
              <div className="space-y-4">
                <h3 className="font-medium text-neutral-800">烹饪步骤</h3>

                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={index} className="bg-neutral-50 rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                            {step.step_number}
                          </span>
                          {steps.length > 1 && (
                            <div className="flex flex-col gap-1 mt-2">
                              <button
                                onClick={() => moveStepUp(index)}
                                disabled={index === 0}
                                className="p-1 hover:bg-neutral-200 rounded disabled:opacity-30"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                onClick={() => moveStepDown(index)}
                                disabled={index === steps.length - 1}
                                className="p-1 hover:bg-neutral-200 rounded disabled:opacity-30"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <textarea
                            value={step.description}
                            onChange={(e) => {
                              const newSteps = [...steps]
                              newSteps[index].description = e.target.value
                              setSteps(newSteps)
                            }}
                            className="input-field min-h-[80px]"
                            placeholder="描述这一步的做法..."
                          />

                          {/* 步骤图片 */}
                          <div className="flex items-center gap-4">
                            {step.image_url ? (
                              <div className="relative">
                                <img
                                  src={step.image_url}
                                  alt={`步骤${step.step_number}`}
                                  className="w-20 h-20 rounded-lg object-cover"
                                />
                                <button
                                  onClick={() => {
                                    const newSteps = [...steps]
                                    newSteps[index].image_url = null
                                    setSteps(newSteps)
                                  }}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ) : (
                              <label className="w-20 h-20 border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                                <ImagePlus size={18} className="text-neutral-400" />
                                <span className="text-[10px] text-neutral-500 mt-1">添加图片</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const newSteps = [...steps]
                                      newSteps[index].imageFile = file
                                      newSteps[index].image_url = URL.createObjectURL(file)
                                      setSteps(newSteps)
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => removeStep(index)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addStep}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  添加步骤
                </button>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="btn-secondary px-6"
              >
                取消
              </button>
              <button
                onClick={handleSaveRecipe}
                disabled={isSaving}
                className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分类编辑弹窗 */}
      {showCategoryEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-800">
                {editingCategory ? '编辑分类' : '新建分类'}
              </h2>
              <button
                onClick={() => setShowCategoryEditor(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  分类名称 *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input-field"
                  placeholder="例如：川菜"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  别名（URL） *
                </label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase() })}
                  className="input-field"
                  placeholder="例如：sichuan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  父分类（可选）
                </label>
                <select
                  value={categoryForm.parent_id || ''}
                  onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value || null })}
                  className="input-field"
                >
                  <option value="">无（作为一级分类）</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  描述
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="简单描述这个分类..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">
                    排序
                  </label>
                  <input
                    type="number"
                    value={categoryForm.sort_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">启用此分类</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryEditor(false)}
                className="btn-secondary px-6"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                className="btn-primary px-6"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
