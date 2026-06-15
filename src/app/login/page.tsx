'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'idle' | 'loading' | 'success' | 'opening'

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

    await new Promise((resolve) => setTimeout(resolve, 800))

    if (username === 'admin' && password === 'admin') {
      document.cookie = 'workportal_auth=1; path=/; max-age=86400; SameSite=Lax'
      setPhase('success')

      await new Promise((resolve) => setTimeout(resolve, 500))

      setPhase('opening')

      await new Promise((resolve) => setTimeout(resolve, 1100))

      router.push('/dashboard')
    } else {
      setError('ユーザー名またはパスワードが違います')
      setPhase('idle')
    }
  }

  const isOpening = phase === 'opening'

  const curtainTransition = 'transform 950ms cubic-bezier(0.86, 0, 0.07, 1) 80ms'

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* 背景ベース */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(160deg, #050510 0%, #0f0a2a 50%, #0a1628 100%)',
          zIndex: 0,
        }}
      />

      {/* 上カーテンパネル */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          zIndex: 30,
          background: 'linear-gradient(160deg, #050510 0%, #0f0a2a 50%, #0a1628 100%)',
          transform: isOpening ? 'translateY(-100%)' : 'translateY(0)',
          transition: curtainTransition,
          overflow: 'hidden',
        }}
      >
        {/* 上パネル オーブ */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            left: '-10%',
            width: '60%',
            height: '200%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: '40%',
            height: '180%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 下カーテンパネル */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          zIndex: 30,
          background: 'linear-gradient(160deg, #050510 0%, #0f0a2a 50%, #0a1628 100%)',
          transform: isOpening ? 'translateY(100%)' : 'translateY(0)',
          transition: curtainTransition,
          overflow: 'hidden',
        }}
      >
        {/* 下パネル オーブ */}
        <div
          style={{
            position: 'absolute',
            bottom: '-40%',
            right: '-10%',
            width: '60%',
            height: '200%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '-5%',
            width: '40%',
            height: '180%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ログインカード */}
      <div
        style={{
          position: 'relative',
          zIndex: 40,
          width: '100%',
          maxWidth: '420px',
          padding: '0 16px',
          opacity: isOpening ? 0 : mounted ? 1 : 0,
          transform: isOpening
            ? 'scale(0.92)'
            : mounted
              ? 'translateY(0)'
              : 'translateY(20px)',
          transition: isOpening
            ? 'opacity 300ms ease, transform 300ms ease'
            : 'all 600ms ease 200ms',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 12, 40, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            borderRadius: '20px',
            padding: '40px 36px 32px',
          }}
        >
          {/* ロゴ部分 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                marginBottom: '16px',
              }}
            >
              {/* HeroiconsのBuildingOffice2アイコン */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="white"
                style={{ width: '38px', height: '38px' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: '0 0 4px',
              }}
            >
              WorkPortal
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(148,163,184,0.8)',
                margin: 0,
              }}
            >
              社員作業管理ポータル
            </p>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit}>
            {/* ユーザー名フィールド */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(148,163,184,0.9)',
                  marginBottom: '6px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                ユーザー名
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {/* UserCircleIcon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="rgba(99,102,241,0.7)"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                    e.currentTarget.style.outline = 'none'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'
                  }}
                  placeholder="admin"
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 40px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 200ms ease',
                  }}
                />
              </div>
            </div>

            {/* パスワードフィールド */}
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(148,163,184,0.9)',
                  marginBottom: '6px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {/* KeyIcon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="rgba(99,102,241,0.7)"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                    e.currentTarget.style.outline = 'none'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '11px 44px 11px 40px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 200ms ease',
                  }}
                />
                {/* パスワード表示/非表示トグル */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'rgba(148,163,184,0.6)',
                  }}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    /* EyeSlashIcon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      style={{ width: '18px', height: '18px' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    /* EyeIcon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      style={{ width: '18px', height: '18px' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  style={{ width: '16px', height: '16px', flexShrink: 0 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* ログインボタン */}
            {!isOpening && (
              <button
                type="submit"
                disabled={phase === 'loading' || phase === 'success'}
                style={{
                  width: '100%',
                  padding: '13px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
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
                      ? '0 4px 20px rgba(16,185,129,0.4)'
                      : '0 4px 20px rgba(99,102,241,0.4)',
                  transition: 'all 300ms ease',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => {
                  if (phase === 'idle') {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(99,102,241,0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (phase === 'idle') {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.4)'
                  }
                }}
              >
                {phase === 'loading' && (
                  <>
                    {/* スピナー */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      style={{
                        width: '18px',
                        height: '18px',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    >
                      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                        style={{ opacity: 0.25 }}
                      />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="white"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    認証中...
                  </>
                )}
                {phase === 'success' && (
                  <>
                    {/* チェックマーク */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="white"
                      style={{ width: '18px', height: '18px' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    ログイン成功
                  </>
                )}
                {phase === 'idle' && 'ログイン'}
              </button>
            )}
          </form>

          {/* カード下部 */}
          <p
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'rgba(100,116,139,0.7)',
              margin: '24px 0 0',
            }}
          >
            © 2026 WorkPortal — Applippli
          </p>
        </div>
      </div>
    </div>
  )
}
