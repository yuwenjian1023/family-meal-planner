import { useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { usePantryStore } from '../stores/pantryStore'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { useFavoritesStore } from '../stores/favoritesStore'
import { useFamilyStore } from '../stores/familyStore'
import { useShoppingListStore } from '../stores/shoppingListStore'
import { useCustomRecipeStore } from '../stores/customRecipeStore'

/**
 * DataLoader: 登录时加载家庭 + 同步数据
 * - 登录：加载家庭列表 → 设置数据作用域
 * - 登出：重置各 store
 * - 切换家庭：重新加载该家庭的数据
 */
export function DataLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const prevUserIdRef = useRef<string | null>(null)

  const setPantryScope = usePantryStore(state => state.setCurrentScope)
  const setMealPlanScope = useMealPlanStore(state => state.setCurrentScope)
  const setFavoritesScope = useFavoritesStore(state => state.setCurrentScope)
  const setShoppingListScope = useShoppingListStore(state => state.setCurrentScope)
  const setCustomRecipeScope = useCustomRecipeStore(state => state.setCurrentScope)

  const loadFamilies = useFamilyStore(state => state.loadFamilies)
  const currentFamilyId = useFamilyStore(state => state.currentFamilyId)

  // 登录/登出时加载家庭
  useEffect(() => {
    const currentUserId = user?.id || null
    const prevUserId = prevUserIdRef.current

    if (currentUserId && currentUserId !== prevUserId) {
      loadFamilies()
    } else if (!currentUserId && prevUserId) {
      setPantryScope(null, null)
      setMealPlanScope(null, null)
      setFavoritesScope(null, null)
      setShoppingListScope(null, null)
      setCustomRecipeScope(null, null)
    }

    prevUserIdRef.current = currentUserId
  }, [user?.id])

  // 家庭变化时切换数据作用域
  useEffect(() => {
    if (user?.id) {
      setPantryScope(user.id, currentFamilyId)
      setMealPlanScope(user.id, currentFamilyId)
      setFavoritesScope(user.id, currentFamilyId)
      setShoppingListScope(user.id, currentFamilyId)
      setCustomRecipeScope(user.id, currentFamilyId)
    }
  }, [currentFamilyId, user?.id])

  return <>{children}</>
}
