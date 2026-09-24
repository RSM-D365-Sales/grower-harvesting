import { useState } from 'react'
import { LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import BluestemMark, { BluestemWordmark } from '../components/BluestemMark'
import rsmLogo from '../assets/rsmus-logo.png'

// Demo personas from the Bluestem pack's employees.csv (seeded by migration 008).
const QUICK_LOGINS = [
  { email: 'ingrid.larsen@bluestemfresh.com', name: 'Ingrid Larsen', title: 'Manager · Head Grower' },
  { email: 'ben.carter@bluestemfresh.com', name: 'Ben Carter', title: 'Operator · Production Planner' },
]

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    await login(email.trim())
    setSubmitting(false)
  }

  const quickLogin = async (email) => {
    setSubmitting(true)
    await login(email)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <BluestemMark className="w-12 h-12" />
            <BluestemWordmark className="text-[34px]" />
          </div>
          <h1 className="text-xl font-heading font-semibold text-midnight-900">Grower Harvesting</h1>
          <p className="text-sm text-gray-500 mt-1">Lettuce show you what D365 can do.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@bluestemfresh.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={submitting}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
          </form>

          {/* Quick Login */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LOGINS.map((p) => (
                <button
                  key={p.email}
                  onClick={() => quickLogin(p.email)}
                  disabled={submitting}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:border-primary-200 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-brand-grey">
          Powered by <img src={rsmLogo} alt="RSM" className="h-5 w-auto" />
        </p>
      </div>
    </div>
  )
}
