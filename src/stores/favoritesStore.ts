import { create } from 'zustand'
import * as api from '../lib/api'

interface FavoritesState {
  ids: string[]
  currentUserId: string | null
  currentFamilyId: string | null

  setCurrentScope: (userId: string | null, familyId: string | null) => Promise<void>
  isFavorite: (recipeId: string) => boolean
  toggleFavorite: (recipeId: string) => void
  setFavoriteIds: (ids: string[]) => void
}

const STORAGE_KEY = 'family-meal-planner-favorites'

function loadCache(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  return null
}

function saveCache(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: loadCache() || [],
  currentUserId: null,
  currentFamilyId: null,

  setCurrentScope: async (userId, familyId) => {
    const oldUserId = get().currentUserId
    const oldFamilyId = get().currentFamilyId
    const scopeChanged = userId !== oldUserId || familyId !== oldFamilyId

    set({ currentUserId: userId, currentFamilyId: familyId })

    if (scopeChanged && userId) {
      try {
        const cloudIds = await api.fetchFavorites(familyId, userId)
        if (cloudIds.length > 0 || familyId !== oldFamilyId) {
          set({ ids: cloudIds })
          saveCache(cloudIds)
        }
      } catch {}
    } else if (!userId) {
      set({ ids: loadCache() || [] })
    }
  },

  isFavorite: (recipeId) => get().ids.includes(recipeId),

  toggleFavorite: (recipeId) => {
    const isFav = get().ids.includes(recipeId)
    const newIds = isFav
      ? get().ids.filter(id => id !== recipeId)
      : [...get().ids, recipeId]

    set({ ids: newIds })
    saveCache(newIds)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      if (isFav) {
        api.removeFavorite(uid, fid, recipeId).catch(() => {})
      } else {
        api.addFavorite(uid, fid, recipeId).catch(() => {})
      }
    }
  },

  setFavoriteIds: (ids) => {
    set({ ids })
    saveCache(ids)
  },
}))
