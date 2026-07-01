import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, ArrowRight, Copy, Check, UserPlus, LogOut, Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFamilyStore } from '../stores/familyStore'
import { FamilyMember } from '../types'

export default function FamilyPage() {
  const { user } = useAuth()
  const {
    families, currentFamilyId,
    createFamily, joinFamily, leaveFamily,
    setCurrentFamilyId, fetchMembers, loadFamilies,
  } = useFamilyStore()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [showMembersId, setShowMembersId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!familyName.trim()) return
    setLoading(true)
    setError('')
    const result = await createFamily(familyName.trim())
    setLoading(false)
    if (result) {
      setFamilyName('')
      setShowCreate(false)
      setSuccess('家庭创建成功！')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('创建家庭失败，请稍后重试')
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    const ok = await joinFamily(inviteCode.trim().toUpperCase())
    setLoading(false)
    if (ok) {
      setInviteCode('')
      setShowJoin(false)
      setSuccess('加入家庭成功！')
      await loadFamilies()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('加入失败，请检查邀请码是否正确')
    }
  }

  const handleLeave = async (familyId: string) => {
    if (!confirm('确定要退出这个家庭吗？')) return
    setLeavingId(familyId)
    const ok = await leaveFamily(familyId)
    setLeavingId(null)
    if (ok) {
      setSuccess('已退出家庭')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('退出家庭失败')
    }
  }

  const toggleMembers = async (familyId: string) => {
    if (showMembersId === familyId) {
      setShowMembersId(null)
      return
    }
    const list = await fetchMembers(familyId)
    setMembers(list)
    setShowMembersId(familyId)
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!user) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-state-icon">
          <Users size={48} className="text-neutral-300" />
        </div>
        <p className="text-lg font-medium text-neutral-600 mb-2">请先登录</p>
        <p className="text-neutral-400 mb-4">登录后才能创建或加入家庭</p>
        <Link to="/auth" className="btn-primary">
          去登录
        </Link>
      </div>
    )
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
        <Users size={28} className="text-primary-500" />
        家庭管理
      </h1>

      {/* 消息提示 */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowCreate(true); setShowJoin(false); setError('') }}
          className="btn-primary flex items-center gap-2 flex-1 justify-center"
        >
          <Plus size={18} />
          创建家庭
        </button>
        <button
          onClick={() => { setShowJoin(true); setShowCreate(false); setError('') }}
          className="btn-secondary flex items-center gap-2 flex-1 justify-center"
        >
          <UserPlus size={18} />
          加入家庭
        </button>
      </div>

      {/* 创建家庭表单 */}
      {showCreate && (
        <div className="card">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">创建新家庭</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={'输入家庭名称，如"张家"'}
              className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all text-neutral-800"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={loading || !familyName.trim()}
                className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-ghost"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加入家庭表单 */}
      {showJoin && (
        <div className="card">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">加入家庭</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="输入6位邀请码"
              className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all text-neutral-800 font-mono tracking-widest text-center text-lg"
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleJoin}
                disabled={loading || inviteCode.length < 6}
                className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50"
              >
                {loading ? '加入中...' : '加入'}
              </button>
              <button
                onClick={() => setShowJoin(false)}
                className="btn-ghost"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 我的家庭列表 */}
      {families.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            我的家庭 ({families.length})
          </h2>
          <div className="space-y-3">
            {families.map((family) => (
              <div
                key={family.id}
                className={`border rounded-xl p-4 transition-all ${
                  family.id === currentFamilyId
                    ? 'border-primary-300 bg-primary-50/50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      family.id === currentFamilyId
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-800">{family.name}</h3>
                        {family.id === currentFamilyId && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">当前</span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {family.memberCount} 位成员 · {family.role === 'owner' ? '创建者' : '成员'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {family.id !== currentFamilyId && (
                      <button
                        onClick={() => setCurrentFamilyId(family.id)}
                        className="btn-ghost text-xs text-primary-600"
                      >
                        切换到此家庭
                      </button>
                    )}
                  </div>
                </div>

                {/* 邀请码 */}
                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg p-2 border border-neutral-100">
                  <span className="text-xs text-neutral-400 flex-shrink-0">邀请码:</span>
                  <code className="flex-1 text-sm font-mono text-neutral-700 tracking-wider font-bold">
                    {family.inviteCode}
                  </code>
                  <button
                    onClick={() => copyCode(family.inviteCode, family.id)}
                    className="p-1 rounded hover:bg-neutral-100 transition-colors"
                    title="复制"
                  >
                    {copiedId === family.id
                      ? <Check size={16} className="text-green-500" />
                      : <Copy size={16} className="text-neutral-400" />
                    }
                  </button>
                </div>

                {/* 成员列表 */}
                <button
                  onClick={() => toggleMembers(family.id)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  {showMembersId === family.id ? '收起成员' : '查看成员'}
                  <ArrowRight size={14} className={`transition-transform ${showMembersId === family.id ? 'rotate-90' : ''}`} />
                </button>

                {showMembersId === family.id && (
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-neutral-100">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm text-neutral-600 py-1">
                        <Shield size={14} className={m.role === 'owner' ? 'text-amber-500' : 'text-neutral-400'} />
                        <span>{m.userId.slice(0, 8)}...</span>
                        <span className="text-xs text-neutral-400">({m.role === 'owner' ? '创建者' : '成员'})</span>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="text-sm text-neutral-400 py-1">加载中...</p>
                    )}
                  </div>
                )}

                {/* 退出按钮 */}
                <button
                  onClick={() => handleLeave(family.id)}
                  disabled={leavingId === family.id}
                  className="mt-2 text-xs text-red-400 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <LogOut size={12} />
                  {leavingId === family.id ? '退出中...' : '退出此家庭'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {families.length === 0 && !showCreate && !showJoin && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-neutral-300" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">还没有家庭</h3>
          <p className="text-neutral-500 mb-6">
            创建一个家庭，邀请家人加入，一起规划每日饮食
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary"
            >
              创建家庭
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="btn-secondary"
            >
              加入家庭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
