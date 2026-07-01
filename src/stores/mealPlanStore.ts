import { create } from 'zustand'
import { MealPlan } from '../types'
import * as api from '../lib/api'

interface MealPlanState {
  plans: MealPlan[]
  currentUserId: string | null
  currentFamilyId: string | null

  setCurrentScope: (userId: string | null, familyId: string | null) => Promise<void>
  setPlans: (plans: MealPlan[]) => void
  addPlan: (plan: MealPlan) => void
  removePlan: (id: string) => void

  getPlansForDate: (date: string) => MealPlan[]
  getPlansForMeal: (date: string, mealType: string) => MealPlan | undefined
}

const STORAGE_KEY = 'family-meal-planner-meal-plans'

function loadCache(): MealPlan[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  return null
}

function saveCache(plans: MealPlan[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)) } catch {}
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  plans: loadCache() || [],
  currentUserId: null,
  currentFamilyId: null,

  setCurrentScope: async (userId, familyId) => {
    const oldUserId = get().currentUserId
    const oldFamilyId = get().currentFamilyId
    const scopeChanged = userId !== oldUserId || familyId !== oldFamilyId

    set({ currentUserId: userId, currentFamilyId: familyId })

    if (scopeChanged && userId) {
      try {
        const cloudPlans = await api.fetchMealPlans(familyId, userId)
        if (cloudPlans.length > 0) {
          set({ plans: cloudPlans })
          saveCache(cloudPlans)
        } else if (familyId !== oldFamilyId) {
          set({ plans: [] })
          saveCache([])
        }
      } catch {}
    } else if (!userId) {
      set({ plans: loadCache() || [] })
    }
  },

  setPlans: (plans) => {
    set({ plans })
    saveCache(plans)
  },

  addPlan: (plan) => {
    const existing = get().plans.find(
      p => p.date === plan.date && p.mealType === plan.mealType
    )
    let newPlans: MealPlan[]
    if (existing) {
      newPlans = get().plans.map(p =>
        p.date === plan.date && p.mealType === plan.mealType ? plan : p
      )
    } else {
      newPlans = [...get().plans, plan]
    }
    set({ plans: newPlans })
    saveCache(newPlans)

    const { currentUserId: uid, currentFamilyId: fid } = get()
    if (uid) {
      api.addMealPlan(uid, fid, plan).catch(() => {})
    }
  },

  removePlan: (id) => {
    const newPlans = get().plans.filter(p => p.id !== id)
    set({ plans: newPlans })
    saveCache(newPlans)

    if (get().currentUserId) {
      api.removeMealPlan(id).catch(() => {})
    }
  },

  getPlansForDate: (date) => get().plans.filter(p => p.date === date),
  getPlansForMeal: (date, mealType) =>
    get().plans.find(p => p.date === date && p.mealType === mealType),
}))
