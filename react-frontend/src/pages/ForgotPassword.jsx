import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', DONE: 'done' }

export default function ForgotPassword() {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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

  const handleSendOTP = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      toast.success(data.message)
      setStep(STEPS.OTP)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = e => {
    e.preventDefault()
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    setStep(STEPS.PASSWORD)
  }

  const handleResetPassword = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword })
      setStep(STEPS.DONE)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const strength = passwordStrength(newPassword)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6EC1E4]/10 to-[#F9CADA]/20 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
              <i className="fas fa-baby text-white text-xl"></i>
            </div>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === STEPS.DONE || [STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].indexOf(step) > i
                    ? 'gradient-bg text-white'
                    : step === s
                    ? 'border-2 border-[#6EC1E4] text-[#6EC1E4]'
                    : 'bg-gray-100 text-gray-400'
                }`}>{i + 1}</div>
                {i < 2 && <div className={`w-8 h-0.5 ${[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].indexOf(step) > i || step === STEPS.DONE ? 'bg-[#6EC1E4]' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {step === STEPS.EMAIL && 'Forgot Password'}
            {step === STEPS.OTP && 'Enter OTP'}
            {step === STEPS.PASSWORD && 'New Password'}
            {step === STEPS.DONE && 'All Done!'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === STEPS.EMAIL && "We'll send a 6-digit OTP to your email"}
            {step === STEPS.OTP && `OTP sent to ${email}`}
            {step === STEPS.PASSWORD && 'Choose a strong new password'}
            {step === STEPS.DONE && 'Your password has been reset'}
          </p>
        </div>

        {/* Step 1 — Email */}
        {step === STEPS.EMAIL && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none transition"
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Sending OTP...</> : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2 — OTP */}
        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
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
            <button type="submit"
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg">
              Verify OTP
            </button>
            <button type="button" onClick={() => { setStep(STEPS.EMAIL); setOtp('') }}
              className="w-full text-sm text-gray-500 hover:text-[#6EC1E4] transition">
              ← Resend OTP
            </button>
          </form>
        )}

        {/* Step 3 — New Password */}
        {step === STEPS.PASSWORD && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border-2 border-gray-200 focus:border-[#6EC1E4] outline-none transition"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {strength && (
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
              <ul className="mt-3 space-y-1">
                {[
                  [/.{8,}/, 'At least 8 characters'],
                  [/[A-Z]/, 'One uppercase letter'],
                  [/[0-9]/, 'One number'],
                ].map(([regex, label]) => (
                  <li key={label} className={`text-xs flex items-center gap-2 ${regex.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}>
                    <i className={`fas ${regex.test(newPassword) ? 'fa-check-circle' : 'fa-circle'} text-xs`}></i>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <button type="submit" disabled={loading}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Resetting...</> : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Step 4 — Done */}
        {step === STEPS.DONE && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-check-circle text-green-500 text-4xl"></i>
            </div>
            <p className="text-gray-600">Your password has been reset successfully. You can now log in with your new password.</p>
            <button onClick={() => navigate('/login')}
              className="w-full gradient-bg text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-lg">
              Go to Login
            </button>
          </div>
        )}

        {step !== STEPS.DONE && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-[#6EC1E4] font-semibold hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}
