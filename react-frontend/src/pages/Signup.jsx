import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'parent', location: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [step, setStep] = useState('form')
  const [otp, setOtp] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate(user.role === 'babysitter' ? '/babysitter-dashboard' : '/parent-dashboard', { replace: true })
  }, [user])

  const passwordStrength = pwd => {
    if (!pwd) return null
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/4' }
    if (score === 2) return { label: 'Fair', color: 'bg-yellow-400', width: 'w-2/4' }
    if (score === 3) return { label: 'Good', color: 'bg-blue-400', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-green-400', width: 'w-full' }
  }

  const validate = () => {
    const e = {}

    // Name
    if (!form.name.trim()) e.name = 'Full name is required'
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    else if (form.name.trim().length > 50) e.name = 'Name cannot exceed 50 characters'
    else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) e.name = 'Name can only contain letters and spaces'

    // Email
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'

    // Phone — exactly 10 digits (Indian mobile)
    const digits = form.phone.replace(/\D/g, '')
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (digits.length !== 10) e.phone = 'Enter a valid 10-digit mobile number'
    else if (!/^[6-9]/.test(digits)) e.phone = 'Indian mobile numbers start with 6, 7, 8 or 9'

    // Location
    if (!form.location.trim()) e.location = 'City is required'
    else if (form.location.trim().length < 2) e.location = 'Enter a valid city name'

    // Password
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain at least one uppercase letter'
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must contain at least one number'

    return e
  }

  const handleChange = field => e => {
    let val = e.target.value
    // Phone: only allow digits, max 10
    if (field === 'phone') val = val.replace(/\D/g, '').slice(0, 10)
    // Name: no numbers
    if (field === 'name') val = val.replace(/[^a-zA-Z\s]/g, '')
    setForm({ ...form, [field]: val })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  const strength = passwordStrength(form.password)

  const inputClass = field =>
    `w-full pl-11 pr-4 py-3 rounded-xl border-2 outline-none transition ${
      errors[field] ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#6EC1E4]'
    }`

  const handleSignup = async e => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) return setErrors(e2)
    setLoading(true)
    try {
      // Format phone with +91 prefix before sending
      const payload = { ...form, phone: `+91${form.phone}` }
      const { data } = await api.post('/auth/signup', payload)
      if (data.needsVerification) {
        setRegisteredEmail(data.email)
        setStep('verify')
        toast.success('Account created! Check your email for the OTP.')
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async e => {
    e.preventDefault()
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-email', { email: registeredEmail, otp })
      login(data.token, data.user)
      toast.success(`Welcome to SmartCare, ${data.user.name.split(' ')[0]}! 🎉`)
      if (data.user.role === 'babysitter') navigate('/babysitter-dashboard')
      else navigate('/parent-dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Priya Sharma', icon: 'fa-user' },
    { label: 'Email Address', field: 'email', type: 'email', placeholder: 'you@example.com', icon: 'fa-envelope' },
    { label: 'Phone Number', field: 'phone', type: 'tel', placeholder: '98765 43210', icon: 'fa-phone', hint: '10-digit Indian mobile number' },
    { label: 'Location (City)', field: 'location', type: 'text', placeholder: 'Mumbai, Delhi...', icon: 'fa-map-marker-alt' },
    { label: 'Password', field: 'password', type: 'password', placeholder: '••••••••', icon: 'fa-lock' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6EC1E4]/10 to-[#F9CADA]/20 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
              <i className="fas fa-baby text-white text-xl"></i>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'form' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'form' ? "Join SmartCare today — it's free!" : `OTP sent to ${registeredEmail}`}
          </p>
        </div>

        {/* Signup Form */}
        {step === 'form' && (
          <>
            {/* Role Toggle */}
            <div className="flex rounded-xl border-2 border-gray-200 mb-6 overflow-hidden">
              <button type="button" onClick={() => setForm({ ...form, role: 'parent' })}
                className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${form.role === 'parent' ? 'bg-[#6EC1E4] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <i className="fas fa-user-friends"></i> Parent
              </button>
              <button type="button" onClick={() => setForm({ ...form, role: 'babysitter' })}
                className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${form.role === 'babysitter' ? 'bg-[#6EC1E4] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <i className="fas fa-heart"></i> Babysitter
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" noValidate>
              {fields.map(({ label, field, type, placeholder, icon, hint }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

                  {/* Phone prefix */}
                  {field === 'phone' ? (
                    <div className="relative flex">
                      <span className="flex items-center gap-1 px-3 bg-gray-50 border-2 border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium whitespace-nowrap">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={handleChange('phone')}
                        placeholder={placeholder}
                        maxLength={10}
                        className={`flex-1 px-4 py-3 rounded-r-xl border-2 outline-none transition ${
                          errors.phone ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-[#6EC1E4]'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <i className={`fas ${icon} absolute left-4 top-1/2 -translate-y-1/2 text-gray-400`}></i>
                      <input
                        type={field === 'password' && showPass ? 'text' : type}
                        value={form[field]}
                        onChange={handleChange(field)}
                        placeholder={placeholder}
                        className={`${inputClass(field)} ${field === 'password' ? 'pr-11' : ''}`}
                      />
                      {field === 'password' && (
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {errors[field]
                    ? <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><i className="fas fa-exclamation-circle"></i>{errors[field]}</p>
                    : hint && <p className="text-gray-400 text-xs mt-1">{hint}</p>
                  }

                  {/* Password strength */}
                  {field === 'password' && strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}></div>
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        strength.label === 'Weak' ? 'text-red-400' :
                        strength.label === 'Fair' ? 'text-yellow-500' :
                        strength.label === 'Good' ? 'text-blue-400' : 'text-green-500'
                      }`}>{strength.label} password</p>
                    </div>
                  )}
                </div>
              ))}

              <button type="submit" disabled={loading}
                className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating account...</> : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#6EC1E4] font-semibold hover:underline">Sign in</Link>
            </p>
          </>
        )}

        {/* OTP Verification Step */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
              <i className="fas fa-envelope text-[#6EC1E4] mt-0.5"></i>
              <p className="text-sm text-gray-600">We sent a 6-digit OTP to <strong>{registeredEmail}</strong>. Check your inbox (and spam folder).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">6-Digit OTP</label>
              <input
                type="text" required maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _ _ _"
                className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none transition"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">OTP expires in 10 minutes</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : 'Verify & Continue'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setOtp('') }}
              className="w-full text-sm text-gray-500 hover:text-[#6EC1E4] transition">
              ← Back to signup
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
