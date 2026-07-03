import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'

const ADMIN_EMAIL = '740225978@qq.com'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      setIsAdmin(user?.email === ADMIN_EMAIL)
      setIsLoading(false)
    }

    checkAdmin()

    // 监听登录状态变化
    const supabase = getSupabaseClient()
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAdmin(session?.user?.email === ADMIN_EMAIL)
        setIsLoading(false)
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  return { isAdmin, isLoading, adminEmail: ADMIN_EMAIL }
}
