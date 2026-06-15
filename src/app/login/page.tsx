'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'idle' | 'loading' | 'success' | 'opening'

const CURTAIN = 'transform 1000ms cubic-bezier(0.86, 0, 0.07, 1) 50ms'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      {/* ===== LEFT PANEL — decorative image area ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '55%',
          transform: isOpening ? 'translateX(-110%)' : 'translateX(0)',
          transition: CURTAIN,
          zIndex: 20,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 65%, #6d28d9 100%)',
        }}
        className="hidden lg:block"
      >
        {/* Grid pattern overlay */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Large decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-15%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '-5%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />

        {/* Floating small circles */}
        {[
          { top: '18%', left: '12%', size: 8, opacity: 0.4 },
          { top: '28%', left: '78%', size: 5, opacity: 0.3 },
          { top: '62%', left: '22%', size: 6, opacity: 0.35 },
          { top: '72%', left: '68%', size: 9, opacity: 0.25 },
          { top: '85%', left: '45%', size: 5, opacity: 0.3 },
          { top: '10%', left: '55%', size: 7, opacity: 0.2 },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: c.top,
              left: c.left,
              width: c.size,
              height: c.size,
              borderRadius: '50%',
              background: 'white',
              opacity: c.opacity,
            }}
          />
        ))}

        {/* Diagonal arc line */}
        <svg
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            opacity: 0.12,
          }}
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 0 200 Q 100 0 200 100"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M 0 160 Q 80 20 200 60"
            stroke="white"
            strokeWidth="1"
            fill="none"
          />
        </svg>

        {/* Brand content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 56px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 700ms ease 300ms, transform 700ms ease 300ms',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="white"
                style={{ width: '28px', height: '28px' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.02em',
              }}
            >
              WorkPortal
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: '40px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            業務効率化を、
            <br />
            もっとスマートに。
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(199,210,254,0.8)',
              margin: '0 0 56px',
              lineHeight: 1.6,
            }}
          >
            チームの作業を一元管理し、
            <br />
            生産性を最大化するポータル。
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                label: 'タスク管理',
                desc: '優先度・担当者・期日を一覧管理',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                label: 'カレンダー',
                desc: 'チームの予定を可視化・共有',
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                ),
                label: 'チームコラボ',
                desc: 'リアルタイムで進捗を共有',
              },
            ].map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(199,210,254,0.9)',
                    flexShrink: 0,
                  }}
                >
                  {feat.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'white' }}>
                    {feat.label}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'rgba(199,210,254,0.65)' }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — login form ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          transform: isOpening ? 'translateX(120%)' : 'translateX(0)',
          transition: CURTAIN,
          zIndex: 20,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        className="w-full lg:w-[45%]"
      >
        {/* Subtle background decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Form container */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '400px',
            padding: '0 32px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease 200ms, transform 600ms ease 200ms',
          }}
        >
          {/* Logo (mobile only — hidden on desktop where left panel shows it) */}
          <div
            style={{ textAlign: 'center', marginBottom: '40px' }}
            className="lg:block"
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                marginBottom: '16px',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="white"
                style={{ width: '30px', height: '30px' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#1e1b4b',
                letterSpacing: '-0.025em',
                margin: '0 0 6px',
              }}
            >
              おかえりなさい
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              WorkPortalにサインイン
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                ユーザー名
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 40px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 200ms, box-shadow 200ms',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
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
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 40px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 200ms, box-shadow 200ms',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '17px', height: '17px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '15px', height: '15px', flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={phase === 'loading' || phase === 'success' || isOpening}
              onMouseEnter={(e) => {
                if (phase === 'idle') {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 10px 32px rgba(99,102,241,0.45)'
                }
              }}
              onMouseLeave={(e) => {
                if (phase === 'idle') {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.3)'
                }
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '13px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background:
                  phase === 'success'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                boxShadow:
                  phase === 'success'
                    ? '0 4px 16px rgba(16,185,129,0.35)'
                    : '0 4px 16px rgba(99,102,241,0.3)',
                transition: 'transform 200ms ease, box-shadow 200ms ease, background 300ms ease',
              }}
            >
              {phase === 'loading' && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    style={{ width: '17px', height: '17px', animation: 'login-spin 0.8s linear infinite' }}
                  >
                    <style>{`@keyframes login-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path style={{ opacity: 0.75 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  認証中...
                </>
              )}
              {phase === 'success' && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" style={{ width: '17px', height: '17px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  ログイン成功
                </>
              )}
              {(phase === 'idle' || phase === 'opening') && 'ログイン'}
            </button>
          </form>

          {/* Footer */}
          <p
            style={{
              marginTop: '32px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            © 2026 WorkPortal — Applippli
          </p>
        </div>
      </div>
    </div>
  )
}
