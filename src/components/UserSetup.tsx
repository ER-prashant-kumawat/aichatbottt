import { useState } from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import AnimatedLogo from './AnimatedLogo'

interface UserSetupProps {
  onUserSet: (userId: string) => void
}

export default function UserSetup({ onUserSet }: UserSetupProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const convex = useConvex()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const user = await convex.mutation(api.users.login, {
        email,
        password,
      })
      localStorage.setItem('userId', user._id)
      onUserSet(user._id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('INVALID_CREDENTIALS')) {
        setError('Invalid email or password')
      } else {
        setError(msg || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !name || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const user = await convex.mutation(api.users.signup, {
        email,
        name,
        password,
      })
      localStorage.setItem('userId', user._id)
      onUserSet(user._id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('ALREADY_REGISTERED')) {
        setError('This email is already registered. Please login instead.')
      } else {
        setError(msg || 'Signup failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      margin: 0,
      padding: '20px',
      backgroundColor: '#212121',
      boxSizing: 'border-box',
    }}>
      <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <AnimatedLogo size={80} />
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: '#ececec',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            margin: 0,
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}>
            {mode === 'login' ? 'Sign in to continue to AI Chat' : 'Sign up to get started'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            backgroundColor: error.includes('already registered') ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${error.includes('already registered') ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '8px',
            color: error.includes('already registered') ? '#f97316' : '#ef4444',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block', marginBottom: '6px', fontWeight: 500,
            color: 'rgba(255,255,255,0.7)', fontSize: '14px',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            required
            autoComplete="email"
            style={{
              width: '100%', padding: '12px 14px',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
              fontSize: '15px', boxSizing: 'border-box',
              backgroundColor: '#2f2f2f', color: '#ececec',
              outline: 'none', transition: 'border-color 0.2s',
              fontFamily: 'Inter, -apple-system, sans-serif',
              opacity: loading ? 0.5 : 1,
            } as React.CSSProperties}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          />
        </div>

        {/* Name (signup only) */}
        {mode === 'signup' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', marginBottom: '6px', fontWeight: 500,
              color: 'rgba(255,255,255,0.7)', fontSize: '14px',
              fontFamily: 'Inter, -apple-system, sans-serif',
            }}>
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              required
              autoComplete="name"
              style={{
                width: '100%', padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                fontSize: '15px', boxSizing: 'border-box',
                backgroundColor: '#2f2f2f', color: '#ececec',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'Inter, -apple-system, sans-serif',
                opacity: loading ? 0.5 : 1,
              } as React.CSSProperties}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            />
          </div>
        )}

        {/* Password */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block', marginBottom: '6px', fontWeight: 500,
            color: 'rgba(255,255,255,0.7)', fontSize: '14px',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter password'}
              disabled={loading}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{
                width: '100%', padding: '12px 42px 12px 14px',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                fontSize: '15px', boxSizing: 'border-box',
                backgroundColor: '#2f2f2f', color: '#ececec',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'Inter, -apple-system, sans-serif',
                opacity: loading ? 0.5 : 1,
              } as React.CSSProperties}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px',
                color: 'rgba(255,255,255,0.4)', display: 'flex',
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password (signup only) */}
        {mode === 'signup' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', marginBottom: '6px', fontWeight: 500,
              color: 'rgba(255,255,255,0.7)', fontSize: '14px',
              fontFamily: 'Inter, -apple-system, sans-serif',
            }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={loading}
              required
              autoComplete="new-password"
              style={{
                width: '100%', padding: '12px 14px',
                border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box',
                backgroundColor: '#2f2f2f', color: '#ececec',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: 'Inter, -apple-system, sans-serif',
                opacity: loading ? 0.5 : 1,
              } as React.CSSProperties}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== password
                  ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'
              }}
            />
            {confirmPassword && confirmPassword !== password && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                Passwords do not match
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !email || !password || (mode === 'signup' && (!name || !confirmPassword || password !== confirmPassword))}
          style={{
            width: '100%', padding: '12px',
            backgroundColor: loading ? 'rgba(255,255,255,0.05)' : '#19c37d',
            color: loading ? 'rgba(255,255,255,0.3)' : 'white',
            border: 'none', borderRadius: '8px', fontSize: '15px',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'Inter, -apple-system, sans-serif',
            opacity: (!email || !password || (mode === 'signup' && (!name || password !== confirmPassword))) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#1ad68a'
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#19c37d'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: 'rgba(255,255,255,0.6)',
                animation: 'spin 0.8s linear infinite',
              }} />
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>

        {/* Switch Mode */}
        <div style={{
          textAlign: 'center', marginTop: '20px',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={switchMode}
              style={{
                background: 'none', border: 'none', color: '#19c37d',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                marginLeft: '6px', fontFamily: 'inherit',
                textDecoration: 'underline', textUnderlineOffset: '2px',
              }}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '6px', marginTop: '20px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
            Secured with encrypted password
          </span>
        </div>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
