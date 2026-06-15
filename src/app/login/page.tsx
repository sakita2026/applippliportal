'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'idle' | 'loading' | 'success' | 'opening'

const EASE = 'cubic-bezier(0.86, 0, 0.07, 1)'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase !== 'idle') return
    setError('')
    setPhase('loading')
    await new Promise((r) => setTimeout(r, 800))
    if (username === 'admin' && password === 'admin') {
      document.cookie = 'workportal_auth=1; path=/; max-age=86400; SameSite=Lax'
      setPhase('success')
      await new Promise((r) => setTimeout(r, 500))
      setPhase('opening')
      await new Promise((r) => setTimeout(r, 1100))
      router.push('/dashboard')
    } else {
      setError('ユーザー名またはパスワードが違います')
      setPhase('idle')
    }
  }

  const isOpening = phase === 'opening'

  return (
    /* Root: ダッシュボードの背景色 — 両レイヤーが退場したあと見える */
    <div style={{ position: 'fixed', inset: 0, background: '#f8fafc' }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          Layer 1 — 背景（フルスクリーン）
          ログイン後: 左へスライドアウト
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 30%, #312e81 60%, #4338ca 85%, #6d28d9 100%)',
          transform: isOpening ? 'translateX(-100%)' : 'translateX(0)',
          transition: `transform 1000ms ${EASE} 30ms`,
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Large glow circles */}
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '70vw', height: '70vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-25%', right: '-15%',
          width: '60vw', height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '35%', right: '20%',
          width: '30vw', height: '30vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 65%)',
        }} />

        {/* Ring decorations */}
        <div style={{
          position: 'absolute', top: '-80px', right: '15%',
          width: '400px', height: '400px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.07)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '10%',
          width: '500px', height: '500px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />

        {/* Floating dots */}
        {[
          { top: '15%', left: '8%',  size: 6,  op: 0.5 },
          { top: '25%', left: '72%', size: 4,  op: 0.35 },
          { top: '55%', left: '18%', size: 8,  op: 0.3 },
          { top: '70%', left: '62%', size: 5,  op: 0.4 },
          { top: '82%', left: '40%', size: 4,  op: 0.3 },
          { top: '10%', left: '50%', size: 7,  op: 0.25 },
          { top: '42%', left: '85%', size: 5,  op: 0.3 },
        ].map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: d.top, left: d.left,
            width: d.size, height: d.size,
            borderRadius: '50%', background: 'white', opacity: d.op,
          }} />
        ))}

        {/* Arc lines */}
        <svg style={{ position: 'absolute', top: '10%', right: '8%', opacity: 0.1 }}
          width="180" height="180" viewBox="0 0 180 180" fill="none">
          <path d="M 0 180 Q 90 0 180 90" stroke="white" strokeWidth="1.5" />
          <path d="M 0 130 Q 65 10 180 40" stroke="white" strokeWidth="1" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '12%', left: '5%', opacity: 0.08 }}
          width="160" height="160" viewBox="0 0 160 160" fill="none">
          <path d="M 160 0 Q 70 80 0 160" stroke="white" strokeWidth="1.5" />
        </svg>

        {/* Brand watermark — left side */}
        <div style={{
          position: 'absolute', left: '5%', bottom: '8%',
          display: 'flex', alignItems: 'center', gap: '10px',
          opacity: 0.25,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="white" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
            />
          </svg>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em' }}>
            WorkPortal
          </span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          Layer 2 — ログインカード
          ログイン後: 右へスライドアウト
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isOpening ? 'translateX(100%)' : 'translateX(0)',
          transition: `transform 1000ms ${EASE}`,
          pointerEvents: isOpening ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            margin: '0 24px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
            transition: 'opacity 600ms ease 200ms, transform 600ms ease 200ms',
          }}
        >
          {/* Card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '24px',
              padding: '44px 40px 36px',
              boxShadow:
                '0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.15)',
            }}
          >
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                  marginBottom: '18px',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth={1.5} stroke="white" style={{ width: '32px', height: '32px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                  />
                </svg>
              </div>
              <h1 style={{
                fontSize: '26px', fontWeight: 800, color: '#1e1b4b',
                letterSpacing: '-0.025em', margin: '0 0 6px',
              }}>
                おかえりなさい
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                WorkPortal にサインイン
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Username */}
              <div>
                <label htmlFor="username" style={{
                  display: 'block', fontSize: '11px', fontWeight: 700,
                  color: '#475569', marginBottom: '6px',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                  ユーザー名
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    color: '#a5b4fc', display: 'flex',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    style={{
                      width: '100%', padding: '11px 12px 11px 38px',
                      background: '#f8fafc', border: '1.5px solid #e2e8f0',
                      borderRadius: '10px', fontSize: '14px', color: '#1e293b',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 200ms, box-shadow 200ms',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{
                  display: 'block', fontSize: '11px', fontWeight: 700,
                  color: '#475569', marginBottom: '6px',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                  パスワード
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    color: '#a5b4fc', display: 'flex',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    style={{
                      width: '100%', padding: '11px 40px 11px 38px',
                      background: '#f8fafc', border: '1.5px solid #e2e8f0',
                      borderRadius: '10px', fontSize: '14px', color: '#1e293b',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 200ms, box-shadow 200ms',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    style={{
                      position: 'absolute', right: '11px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '2px',
                      color: '#94a3b8', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" style={{
                  padding: '10px 13px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '8px', color: '#dc2626', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '7px',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor"
                    style={{ width: '15px', height: '15px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={phase !== 'idle'}
                onMouseEnter={(e) => {
                  if (phase === 'idle') {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (phase === 'idle') {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'
                  }
                }}
                style={{
                  marginTop: '6px',
                  width: '100%', padding: '13px',
                  border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 700,
                  cursor: phase === 'idle' ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: phase === 'success'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  boxShadow: phase === 'success'
                    ? '0 4px 16px rgba(16,185,129,0.4)'
                    : '0 4px 16px rgba(99,102,241,0.35)',
                  transition: 'transform 200ms, box-shadow 200ms, background 300ms',
                }}
              >
                {phase === 'loading' && (
                  <>
                    <svg fill="none" viewBox="0 0 24 24"
                      style={{ width: '17px', height: '17px', animation: 'lspin .8s linear infinite' }}>
                      <style>{`@keyframes lspin{to{transform:rotate(360deg)}}`}</style>
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" style={{ opacity: 0.25 }} />
                      <path fill="white" style={{ opacity: 0.75 }}
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    認証中...
                  </>
                )}
                {phase === 'success' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={2.5} stroke="white" style={{ width: '17px', height: '17px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    ログイン成功
                  </>
                )}
                {(phase === 'idle' || phase === 'opening') && 'ログイン'}
              </button>
            </form>

            <p style={{
              marginTop: '28px', textAlign: 'center',
              fontSize: '11px', color: '#cbd5e1',
            }}>
              © 2026 WorkPortal — Applippli
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
