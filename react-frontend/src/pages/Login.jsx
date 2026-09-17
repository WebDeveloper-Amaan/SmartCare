import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate(
      user.role === 'admin' ? '/admin' :
      user.role === 'babysitter' ? '/babysitter-dashboard' : '/parent-dashboard',
      { replace: true }
    )
  }, [user])

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    return e
  }

  const handleChange = field => e => {
    setForm({ ...form, [field]: e.target.value })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) return setErrors(e2)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`)
      if (data.user.role === 'admin') navigate('/admin')
      else if (data.user.role === 'babysitter') navigate('/babysitter-dashboard')
      else navigate('/parent-dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = field =>
    `w-full pl-11 pr-4 py-3 rounded-xl border-2 outline-none transition ${
      errors[field] ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#6EC1E4]'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6EC1E4]/10 to-[#F9CADA]/20 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
              <i className="fas fa-baby text-white text-xl"></i>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your SmartCare account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="you@example.com"
                className={inputClass('email')}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><i className="fas fa-exclamation-circle"></i>{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="••••••••"
                className={`${inputClass('password')} pr-11`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><i className="fas fa-exclamation-circle"></i>{errors.password}</p>}
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-[#6EC1E4] hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#6EC1E4] font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
