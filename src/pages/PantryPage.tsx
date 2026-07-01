import { useState } from 'react'
import { Plus, Trash2, AlertTriangle, CheckCircle, Clock, Package, Pencil } from 'lucide-react'
import { usePantryStore } from '../stores/pantryStore'
import { PantryItem } from '../types'

const categories = ['蔬菜', '肉类', '海鲜', '豆制品', '蛋类', '调料', '主食', '水果', '奶制品']

const emptyForm = {
  name: '',
  quantity: 0,
  unit: '个',
  category: '蔬菜',
  expiryDate: ''
}

export default function PantryPage() {
  const { items, addItem, removeItem, updateItem } = usePantryStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setShowForm(true)
  }

  const openEditForm = (item: PantryItem) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate || ''
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = () => {
    if (!formData.name || formData.quantity <= 0) return

    if (editingId) {
      updateItem(editingId, {
        name: formData.name,
        quantity: formData.quantity,
        unit: formData.unit,
        category: formData.category,
        expiryDate: formData.expiryDate || undefined
      })
    } else {
      addItem({
        id: Date.now().toString(),
        name: formData.name,
        quantity: formData.quantity,
        unit: formData.unit,
        category: formData.category,
        expiryDate: formData.expiryDate || undefined
      })
    }
    closeForm()
  }

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    const diff = date.getTime() - today.getTime()
    return diff < 3 * 24 * 60 * 60 * 1000
  }

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dateStr) < today
  }

  const expiredCount = items.filter(item => isExpired(item.expiryDate)).length
  const expiringSoonCount = items.filter(item => isExpiringSoon(item.expiryDate) && !isExpired(item.expiryDate)).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="section-title flex items-center gap-2 mb-0">
          <Package size={28} className="text-primary-500" />
          食材库存
        </h1>
        <button
          onClick={openAddForm}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">添加食材</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: '总食材数',
            value: items.length,
            icon: Package,
            color: 'from-primary-500 to-primary-600',
          },
          {
            label: '即将过期',
            value: expiringSoonCount,
            icon: Clock,
            color: 'from-orange-500 to-orange-600',
          },
          {
            label: '已过期',
            value: expiredCount,
            icon: AlertTriangle,
            color: 'from-red-500 to-red-600',
          },
        ].map((stat, index) => (
          <div key={index} className="card hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
                <stat.icon size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-800">{stat.value}</div>
                <div className="text-sm text-neutral-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 食材列表 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <Package size={20} className="text-primary-500" />
          食材清单
        </h2>
        <div className="space-y-3">
          {items.map((item, index) => {
            const expired = isExpired(item.expiryDate)
            const expiringSoon = isExpiringSoon(item.expiryDate) && !expired

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-md animate-slide-up ${
                  expired
                    ? 'bg-red-50 border-red-200'
                    : expiringSoon
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-neutral-200'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    expired ? 'bg-red-100' : expiringSoon ? 'bg-orange-100' : 'bg-primary-100'
                  }`}>
                    <span className="text-xl">
                      {item.category === '蛋类' ? '🥚' :
                       item.category === '肉类' ? '🥩' :
                       item.category === '海鲜' ? '🦐' :
                       item.category === '豆制品' ? '🫓' :
                       item.category === '主食' ? '🍚' :
                       item.category === '水果' ? '🍎' :
                       item.category === '奶制品' ? '🥛' :
                       item.category === '调料' ? '🧂' :
                       '🥬'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-neutral-800">{item.name}</h3>
                      <span className="tag text-xs">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-neutral-600">
                        数量: <span className="font-medium">{item.quantity}{item.unit}</span>
                      </span>
                      {item.expiryDate && (
                        <span className={`flex items-center gap-1 ${
                          expired ? 'text-red-500 font-medium' : expiringSoon ? 'text-orange-500 font-medium' : 'text-neutral-500'
                        }`}>
                          {expired ? (
                            <>
                              <AlertTriangle size={14} />
                              已过期: {item.expiryDate}
                            </>
                          ) : expiringSoon ? (
                            <>
                              <Clock size={14} />
                              即将过期: {item.expiryDate}
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              过期: {item.expiryDate}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(item)}
                    className="btn-ghost text-primary-500 hover:bg-primary-50 p-2"
                    title="编辑"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="empty-state py-12">
              <div className="empty-state-icon">📦</div>
              <p className="text-lg font-medium text-neutral-600 mb-2">暂无食材</p>
              <p className="text-sm text-neutral-400">点击"添加食材"开始记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑食材表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeForm}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-800">
                  {editingId ? '编辑食材' : '添加食材'}
                </h3>
                <button onClick={closeForm} className="btn-ghost">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">食材名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="例如：西红柿"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">数量</label>
                  <input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">单位</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input-field"
                    placeholder="个/克/斤"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">过期日期（可选）</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  {editingId ? '保存' : '添加'}
                </button>
                <button onClick={closeForm} className="btn-secondary flex-1">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
