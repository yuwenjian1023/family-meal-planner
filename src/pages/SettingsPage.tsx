import { Link } from 'react-router-dom'
import { Settings, LogOut, Cloud, CloudOff, User, ArrowLeft, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFamilyStore } from '../stores/familyStore'

export default function SettingsPage() {
  const { user, signOut, isConfigured } = useAuth()
  const { families, currentFamily } = useFamilyStore()

  const handleSignOut = async () => {
    if (confirm('确定要退出登录吗？')) {
      await signOut()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <button
        onClick={() => window.history.back()}
        className="btn-ghost flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        <span>返回</span>
      </button>

      <h1 className="section-title flex items-center gap-2">
        <Settings size={28} className="text-primary-500" />
        设置
      </h1>

      {/* 账号信息 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-primary-500" />
          账号信息
        </h2>

        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                {(user.email?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-neutral-800">{user.email}</p>
                <p className="text-sm text-neutral-500">
                  ID: {user.id.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
              <Cloud size={18} className="text-green-500" />
              <p className="text-sm text-green-700">
                {isConfigured
                  ? '已登录，所有数据自动同步到云端'
                  : 'Supabase 未配置，数据仅保存在本地'}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl justify-center">
              <CloudOff size={18} className="text-neutral-400" />
              <p className="text-sm text-neutral-500">
                {isConfigured ? '未登录，登录后数据自动同步' : '未配置云端同步'}
              </p>
            </div>
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2">
              <User size={18} />
              登录 / 注册
            </Link>
          </div>
        )}
      </div>

      {/* 家庭信息 */}
      {user && (
        <div className="card">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary-500" />
            我的家庭
          </h2>
          {families.length > 0 ? (
            <div className="space-y-3">
              {families.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                  <div>
                    <p className="font-medium text-neutral-800">{f.name}</p>
                    <p className="text-sm text-neutral-500">
                      {f.memberCount} 位成员 · {f.role === 'owner' ? '创建者' : '成员'}
                      {f.name === currentFamily?.name && ' · 当前'}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                to="/family"
                className="btn-secondary flex items-center gap-2 justify-center w-full"
              >
                <Users size={18} />
                管理家庭
              </Link>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-neutral-500">还没有加入任何家庭</p>
              <Link to="/family" className="btn-secondary inline-flex items-center gap-2">
                <Users size={18} />
                创建 / 加入家庭
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 关于 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <Settings size={20} className="text-primary-500" />
          关于
        </h2>
        <div className="space-y-3 text-sm text-neutral-600">
          <p>
            <span className="font-medium text-neutral-800">家庭饮食规划</span> v1.0.0
          </p>
          <p>智能规划家庭每日饮食，管理食材库存，云端同步，全家人共享。</p>
          {isConfigured && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
              <Cloud size={18} className="text-blue-500" />
              <p className="text-blue-700">登录后所有操作自动同步，无需手动操作</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
