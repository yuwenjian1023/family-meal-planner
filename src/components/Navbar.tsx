import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Calendar, CalendarDays, Refrigerator, Home, ChefHat, Settings, LogIn, Users, ChevronDown, Plus, Copy, Check, ShoppingCart, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFamilyStore } from '../stores/familyStore'
import { useAdmin } from '../hooks/useAdmin'

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const { families, currentFamily, currentFamilyId, setCurrentFamilyId } = useFamilyStore()
  const [showFamilyMenu, setShowFamilyMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/recipes', icon: BookOpen, label: '菜谱' },
    { path: '/meal-plan', icon: Calendar, label: '饮食计划' },
    { path: '/weekly', icon: CalendarDays, label: '周视图' },
    { path: '/pantry', icon: Refrigerator, label: '食材库存' },
    { path: '/shopping-list', icon: ShoppingCart, label: '购物清单' },
  ]

  // 管理员专属导航
  const adminNavItems = [
    { path: '/recipe-admin', icon: Lock, label: '管理后台' },
  ]

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFamilyMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const copyInviteCode = () => {
    if (currentFamily?.inviteCode) {
      navigator.clipboard.writeText(currentFamily.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <ChefHat size={24} className="text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent hidden sm:inline">
              家庭饮食规划
            </span>
          </Link>

          <div className="flex gap-1 sm:gap-2 items-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium hidden sm:inline">{item.label}</span>
              </Link>
            ))}

            {/* 管理员导航 */}
            {isAdmin && (
              <>
                {/* 分隔线 */}
                <div className="w-px h-6 bg-neutral-200 mx-1 hidden sm:block" />

                {adminNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                        : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* 分隔线 */}
            <div className="w-px h-6 bg-neutral-200 mx-1 hidden sm:block" />

            {/* 家庭切换器 */}
            {user && families.length > 0 && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowFamilyMenu(!showFamilyMenu)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                    showFamilyMenu
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
                >
                  <Users size={18} />
                  <span className="hidden sm:inline max-w-[80px] truncate">
                    {currentFamily?.name || '家庭'}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${showFamilyMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFamilyMenu && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50">
                    <div className="px-3 py-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      切换家庭
                    </div>
                    {families.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setCurrentFamilyId(f.id)
                          setShowFamilyMenu(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          f.id === currentFamilyId
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Users size={16} className={f.id === currentFamilyId ? 'text-primary-500' : 'text-neutral-400'} />
                        <span className="flex-1 text-left">{f.name}</span>
                        <span className="text-xs text-neutral-400">{f.memberCount}人</span>
                        {f.id === currentFamilyId && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full" />
                        )}
                      </button>
                    ))}

                    {/* 邀请码 */}
                    {currentFamily && (
                      <div className="border-t border-neutral-100 mt-1 pt-2 px-3 pb-1">
                        <div className="text-xs text-neutral-400 mb-1">邀请码</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-neutral-100 px-2 py-1 rounded text-sm font-mono text-neutral-700 tracking-wider">
                            {currentFamily.inviteCode}
                          </code>
                          <button
                            onClick={copyInviteCode}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-primary-500"
                            title="复制邀请码"
                          >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          将邀请码发送给家人即可加入
                        </p>
                      </div>
                    )}

                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <Link
                        to="/family"
                        onClick={() => setShowFamilyMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Plus size={16} />
                        管理家庭
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 用户状态 */}
            {user ? (
              <Link
                to="/settings"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive('/settings')
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                <Settings size={18} />
                <span className="text-sm font-medium hidden sm:inline">设置</span>
              </Link>
            ) : (
              <Link
                to="/auth"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive('/auth')
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'text-primary-500 hover:bg-primary-50'
                }`}
              >
                <LogIn size={18} />
                <span className="text-sm font-medium hidden sm:inline">登录</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
