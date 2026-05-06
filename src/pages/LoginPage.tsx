import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Layers, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('مرحباً بك!')
      window.location.href = '/'
    } catch {
      toast.error('بريد إلكتروني أو كلمة مرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4 shadow-sm">
            <Layers className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">ATHAR</h1>
          <p className="text-text-muted text-sm mt-1">لوحة تحكم المحتوى</p>
        </div>

        <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@example.com" autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-40 shadow-sm">
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-4">
            هذه الصفحة للإدارة فقط ·{' '}
            <a href="/" className="text-accent hover:underline">العودة للموقع</a>
          </p>
        </div>
      </div>
    </div>
  )
}
