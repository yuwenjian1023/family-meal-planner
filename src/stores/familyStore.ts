import { create } from 'zustand'
import { Family, FamilyMember } from '../types'
import * as api from '../lib/api'

interface FamilyState {
  families: Family[]
  currentFamilyId: string | null
  currentFamily: Family | null
  loading: boolean

  setCurrentFamilyId: (id: string | null) => void
  loadFamilies: () => Promise<void>
  createFamily: (name: string) => Promise<Family | null>
  joinFamily: (code: string) => Promise<boolean>
  leaveFamily: (familyId: string) => Promise<boolean>
  fetchMembers: (familyId: string) => Promise<FamilyMember[]>
}

const CACHE_KEY = 'family-meal-planner-active-family'

function loadCachedFamilyId(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY) || null
  } catch { return null }
}

function saveCachedFamilyId(id: string | null) {
  try {
    if (id) localStorage.setItem(CACHE_KEY, id)
    else localStorage.removeItem(CACHE_KEY)
  } catch {}
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  families: [],
  currentFamilyId: loadCachedFamilyId(),
  currentFamily: null,
  loading: false,

  setCurrentFamilyId: (id) => {
    saveCachedFamilyId(id)
    const family = id ? get().families.find(f => f.id === id) || null : null
    set({ currentFamilyId: id, currentFamily: family })
  },

  loadFamilies: async () => {
    set({ loading: true })
    const families = await api.fetchUserFamilies()
    const cachedId = loadCachedFamilyId()
    const currentFamily = cachedId
      ? families.find(f => f.id === cachedId) || families[0] || null
      : families[0] || null

    set({
      families,
      currentFamilyId: currentFamily?.id || null,
      currentFamily,
      loading: false,
    })
    if (currentFamily?.id) saveCachedFamilyId(currentFamily.id)
  },

  createFamily: async (name) => {
    const family = await api.createFamily(name)
    if (family) {
      const families = [...get().families, family]
      set({ families, currentFamilyId: family.id, currentFamily: family })
      saveCachedFamilyId(family.id)
    }
    return family
  },

  joinFamily: async (code) => {
    const familyId = await api.joinFamilyByCode(code)
    if (familyId) {
      await get().loadFamilies()
      return true
    }
    return false
  },

  leaveFamily: async (familyId) => {
    const ok = await api.leaveFamily(familyId)
    if (ok) {
      const families = get().families.filter(f => f.id !== familyId)
      const isCurrent = get().currentFamilyId === familyId
      const nextId = isCurrent ? (families[0]?.id || null) : get().currentFamilyId
      const nextFamily = nextId ? families.find(f => f.id === nextId) || null : null
      set({
        families,
        currentFamilyId: nextId,
        currentFamily: nextFamily,
      })
      saveCachedFamilyId(nextId)
    }
    return ok
  },

  fetchMembers: (familyId) => api.fetchFamilyMembers(familyId),
}))
