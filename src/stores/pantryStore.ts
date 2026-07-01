import { create } from 'zustand'
import { PantryItem } from '../types'
import * as api from '../lib/api'

interface PantryState {
  items: PantryItem[]
  currentUserId: string | null
  currentFamilyId: string | null

  setCurrentScope: (userId: string | null, familyId: string | null) => Promise<void>
  setItems: (items: PantryItem[]) => void
  addItem: (item: PantryItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<PantryItem>) => void

  getItemsByCategory: (category: string) => PantryItem[]
  getItemNames: () => string[]
  getExpiringSoon: (days?: number) => PantryItem[]
  getExpired: () => PantryItem[]
}

const STORAGE_KEY = 'family-meal-planner-pantry'

function loadCache(): PantryItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  return null
}

function getDefaults(): PantryItem[] {
  return [
    { id: '1', name: '鸡蛋', quantity: 12, unit: '个', category: '蛋类', expiryDate: daysFromNow(14) },
    { id: '2', name: '西红柿', quantity: 4, unit: '个', category: '蔬菜', expiryDate: daysFromNow(5) },
    { id: '3', name: '猪肉', quantity: 500, unit: '克', category: '肉类', expiryDate: daysFromNow(3) },
    { id: '4', name: '豆腐', quantity: 2, unit: '块', category: '豆制品', expiryDate: daysFromNow(2) },
    { id: '5', name: '土豆', quantity: 6, unit: '个', category: '蔬菜', expiryDate: daysFromNow(20) },
    { id: '6', name: '大米', quantity: 5, unit: '千克', category: '主食', expiryDate: daysFromNow(90) },
  ]
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
}

function saveCache(items: PantryItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

export const usePantryStore = create<PantryState>((set, get) => ({
  items: loadCache() || getDefaults(),
  currentUserId: null,
  currentFamilyId: null,

  setCurrentScope: async (userId, familyId) => {
    const oldUserId = get().currentUserId
    const oldFamilyId = get().currentFamilyId
    const scopeChanged = userId !== oldUserId || familyId !== oldFamilyId

    set({ currentUserId: userId, currentFamilyId: familyId })

    if (scopeChanged && userId) {
      try {
        const cloudItems = await api.fetchPantryItems(familyId, userId)
        if (cloudItems.length > 0) {
          set({ items: cloudItems })
          saveCache(cloudItems)
        } else if (familyId !== oldFamilyId) {
          set({ items: [] })
          saveCache([])
        }
      } catch {
        // 离线：继续用缓存
      }
    } else if (!userId) {
      set({ items: loadCache() || getDefaults() })
    }
  },

  setItems: (items) => {
    set({ items })
    saveCache(items)
  },

  addItem: (item) => {
    const newItems = [...get().items, item]
    set({ items: newItems })
    saveCache(newItems)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      api.addPantryItem(uid, fid, item).catch(() => {})
    }
  },

  removeItem: (id) => {
    const newItems = get().items.filter(i => i.id !== id)
    set({ items: newItems })
    saveCache(newItems)

    if (get().currentUserId) {
      api.removePantryItem(id).catch(() => {})
    }
  },

  updateItem: (id, updates) => {
    const newItems = get().items.map(i =>
      i.id === id ? { ...i, ...updates } : i
    )
    set({ items: newItems })
    saveCache(newItems)

    if (get().currentUserId) {
      api.updatePantryItemDb(id, updates).catch(() => {})
    }
  },

  getItemsByCategory: (category) => get().items.filter(i => i.category === category),
  getItemNames: () => get().items.map(i => i.name),

  getExpiringSoon: (days = 3) => {
    const today = new Date()
    const threshold = new Date(today.getTime() + days * 86400000)
    return get().items.filter(i => {
      if (!i.expiryDate) return false
      const expiry = new Date(i.expiryDate)
      return expiry >= today && expiry <= threshold
    })
  },

  getExpired: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return get().items.filter(i => {
      if (!i.expiryDate) return false
      return new Date(i.expiryDate) < today
    })
  },
}))
