import { create } from 'zustand'
import { ShoppingListItem } from '../types'
import * as api from '../lib/api'

interface ShoppingListState {
  items: ShoppingListItem[]
  currentUserId: string | null
  currentFamilyId: string | null

  setCurrentScope: (userId: string | null, familyId: string | null) => Promise<void>
  setItems: (items: ShoppingListItem[]) => void
  addItem: (item: Omit<ShoppingListItem, 'id' | 'createdAt'>) => void
  addItems: (items: Omit<ShoppingListItem, 'id' | 'createdAt'>[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<ShoppingListItem>) => void
  toggleChecked: (id: string) => void
  clearChecked: () => void

  getUnchecked: () => ShoppingListItem[]
  getChecked: () => ShoppingListItem[]
}

const STORAGE_KEY = 'family-meal-planner-shopping-list'

function loadCache(): ShoppingListItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data)) return data
    }
  } catch {}
  return null
}

function saveCache(items: ShoppingListItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  items: loadCache() || [],
  currentUserId: null,
  currentFamilyId: null,

  setCurrentScope: async (userId, familyId) => {
    const oldUserId = get().currentUserId
    const oldFamilyId = get().currentFamilyId
    const scopeChanged = userId !== oldUserId || familyId !== oldFamilyId

    set({ currentUserId: userId, currentFamilyId: familyId })

    if (scopeChanged && userId) {
      try {
        const cloudItems = await api.fetchShoppingList(familyId, userId)
        if (cloudItems.length > 0) {
          set({ items: cloudItems })
          saveCache(cloudItems)
        } else if (familyId !== oldFamilyId) {
          set({ items: [] })
          saveCache([])
        }
      } catch {}
    } else if (!userId) {
      set({ items: loadCache() || [] })
    }
  },

  setItems: (items) => {
    set({ items })
    saveCache(items)
  },

  addItem: (item) => {
    const newItem: ShoppingListItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const newItems = [...get().items, newItem]
    set({ items: newItems })
    saveCache(newItems)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      api.addShoppingItem(uid, fid, item).catch(() => {})
    }
  },

  addItems: (items) => {
    const { currentUserId: uid, currentFamilyId: fid } = get()
    const newItems = [...get().items]

    items.forEach(item => {
      const newItem: ShoppingListItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      newItems.push(newItem)

      if (uid) {
        api.addShoppingItem(uid, fid, item).catch(() => {})
      }
    })

    set({ items: newItems })
    saveCache(newItems)
  },

  removeItem: (id) => {
    const newItems = get().items.filter(i => i.id !== id)
    set({ items: newItems })
    saveCache(newItems)

    if (get().currentUserId) {
      api.removeShoppingItem(id).catch(() => {})
    }
  },

  updateItem: (id, updates) => {
    const newItems = get().items.map(i =>
      i.id === id ? { ...i, ...updates } : i
    )
    set({ items: newItems })
    saveCache(newItems)

    if (get().currentUserId) {
      api.updateShoppingItem(id, updates).catch(() => {})
    }
  },

  toggleChecked: (id) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    const newChecked = !item.checked
    const newItems = get().items.map(i =>
      i.id === id ? { ...i, checked: newChecked } : i
    )
    set({ items: newItems })
    saveCache(newItems)

    if (get().currentUserId) {
      api.updateShoppingItem(id, { checked: newChecked } as Partial<ShoppingListItem>).catch(() => {})
    }
  },

  clearChecked: () => {
    const newItems = get().items.filter(i => !i.checked)
    set({ items: newItems })
    saveCache(newItems)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      api.clearCheckedItems(fid, uid).catch(() => {})
    }
  },

  getUnchecked: () => get().items.filter(i => !i.checked),
  getChecked: () => get().items.filter(i => i.checked),
}))
