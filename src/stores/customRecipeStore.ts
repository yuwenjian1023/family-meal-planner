import { create } from 'zustand'
import { CustomRecipe, CustomRecipeInput } from '../types'
import * as api from '../lib/api'

interface CustomRecipeState {
  recipes: CustomRecipe[]
  currentUserId: string | null
  currentFamilyId: string | null

  setCurrentScope: (userId: string | null, familyId: string | null) => Promise<void>
  setRecipes: (recipes: CustomRecipe[]) => void
  addRecipe: (input: CustomRecipeInput) => void
  updateRecipe: (id: string, input: Partial<CustomRecipeInput>) => void
  removeRecipe: (id: string) => void

  getById: (id: string) => CustomRecipe | undefined
}

const STORAGE_KEY = 'family-meal-planner-custom-recipes'

function loadCache(): CustomRecipe[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data)) return data
    }
  } catch {}
  return null
}

function saveCache(recipes: CustomRecipe[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)) } catch {}
}

export const useCustomRecipeStore = create<CustomRecipeState>((set, get) => ({
  recipes: loadCache() || [],
  currentUserId: null,
  currentFamilyId: null,

  setCurrentScope: async (userId, familyId) => {
    const oldUserId = get().currentUserId
    const oldFamilyId = get().currentFamilyId
    const scopeChanged = userId !== oldUserId || familyId !== oldFamilyId

    set({ currentUserId: userId, currentFamilyId: familyId })

    if (scopeChanged && userId) {
      try {
        const cloudRecipes = await api.fetchCustomRecipes(familyId, userId)
        if (cloudRecipes.length > 0) {
          set({ recipes: cloudRecipes })
          saveCache(cloudRecipes)
        } else if (familyId !== oldFamilyId) {
          set({ recipes: [] })
          saveCache([])
        }
      } catch {}
    } else if (!userId) {
      const cached = loadCache() || []
      set({ recipes: cached })
    }
  },

  setRecipes: (recipes) => {
    set({ recipes })
    saveCache(recipes)
  },

  addRecipe: (input) => {
    const newRecipe: CustomRecipe = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const newRecipes = [...get().recipes, newRecipe]
    set({ recipes: newRecipes })
    saveCache(newRecipes)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      api.addCustomRecipe(uid, fid, input).catch(() => {})
    }
  },

  updateRecipe: (id, input) => {
    const newRecipes = get().recipes.map(r =>
      r.id === id ? { ...r, ...input } : r
    )
    set({ recipes: newRecipes })
    saveCache(newRecipes)

    if (get().currentUserId) {
      api.updateCustomRecipe(id, input).catch(() => {})
    }
  },

  removeRecipe: (id) => {
    const newRecipes = get().recipes.filter(r => r.id !== id)
    set({ recipes: newRecipes })
    saveCache(newRecipes)

    if (get().currentUserId) {
      api.removeCustomRecipe(id).catch(() => {})
    }
  },

  getById: (id) => get().recipes.find(r => r.id === id),
}))
