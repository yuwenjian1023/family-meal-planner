import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChefHat, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp, user, isConfigured } = useAuth()
  const navigate = useNavigate()

  // 已登录则跳转到首页
  if (user) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }

    if (isSignUp && password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    if (isSignUp && password.length < 6) {
      setError('密码长度至少 6 位')
      return
    }

    setLoading(true)

    if (isSignUp) {
      const { error: signUpError } = await signUp(email, password)
      if (signUpError) {
        setError(signUpError.message === 'User already registered' 
          ? '该邮箱已注册，请直接登录' 
          : signUpError.message)
      } else {
        setSuccess('注册成功！请检查邮箱确认链接，或直接登录。')
        setIsSignUp(false)
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError(signInError.message === 'Invalid login credentials'
          ? '邮箱或密码错误'
          : signInError.message)
      }
    }

    setLoading(false)
  }

  if (!isConfigured) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card max-w-md w-full text-center space-y-4">
          <ChefHat size={48} className="mx-auto text-primary-500" />
          <h2 className="text-xl font-bold text-neutral-800">云同步未配置</h2>
          <p className="text-neutral-600">
            请先在项目根目录创建 <code className="bg-neutral-100 px-2 py-1 rounded">.env</code> 文件，
            填入 Supabase 项目 URL 和 Anon Key。
          </p>
          <p className="text-sm text-neutral-400">
            参考 <code className="bg-neutral-100 px-2 py-1 rounded">.env.example</code>
          </p>
          <Link to="/" className="btn-primary inline-block">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">
            {isSignUp ? '创建账号' : '欢迎回来'}
          </h1>
          <p className="text-neutral-500">
            {isSignUp ? '注册账号以同步家庭饮食数据' : '登录以同步你的饮食数据'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
              <CheckCircle size={18} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">邮箱</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">密码</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder={isSignUp ? '至少 6 位密码' : '输入密码'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {/* 确认密码（仅注册） */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">确认密码</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : null}
            {isSignUp ? '注册' : '登录'}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <div className="text-center mt-6 text-sm text-neutral-500">
          {isSignUp ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setSuccess('')
            }}
            className="ml-1 text-primary-600 hover:text-primary-700 font-medium"
          >
            {isSignUp ? '去登录' : '去注册'}
          </button>
        </div>
      </div>
    </div>
  )
}
