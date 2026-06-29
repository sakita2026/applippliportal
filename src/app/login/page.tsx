'use client'

import { useEffect, useState } from 'react'

const ORGPORTAL_URL = process.env.NEXT_PUBLIC_ORGPORTAL_URL || 'http://localhost:3100'

// エラーコード → 表示メッセージ
const ERROR_MESSAGES: Record<string, string> = {
  no_access: 'このアプリ（WorkPortal）の利用権限がありません。システム管理者にお問い合わせください。',
  no_token: '認証情報が取得できませんでした。もう一度ログインしてください。',
  invalid_token: '認証に失敗しました。もう一度ログインしてください。',
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const goToSso = () => {
    const ret = encodeURIComponent(`${window.location.origin}/api/auth/callback`)
    window.location.href = `${ORGPORTAL_URL}/authorize?app=workportal&return=${ret}`
  }

  const logout = () => {
    // 利用権が無いユーザーは再ログインしても無意味なので、組織ポータルへは誘導せずログアウト。
    window.location.href = '/api/auth/logout'
  }

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error')
    if (err) {
      // 権限エラー等はループ防止のため自動転送せずメッセージ表示
      setErrorCode(err)
      setError(ERROR_MESSAGES[err] ?? '認証でエラーが発生しました。')
      return
    }
    // 通常はそのまま組織ポータル（SSO）へ転送
    setRedirecting(true)
    goToSso()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1e1b4b 30%, #312e81 60%, #4338ca 85%, #6d28d9 100%)' }}>
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 24px', background: 'rgba(255,255,255,0.97)',
        borderRadius: '24px', padding: '40px', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px',
          borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', marginBottom: '18px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width: '32px', height: '32px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#1e1b4b', margin: '0 0 6px', lineHeight: 1.4 }}>
          決めたことを100％実行できる決定管理
        </h1>

        {error ? (
          <>
            <div role="alert" style={{ marginTop: '20px', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '10px', color: '#dc2626', fontSize: '13px', lineHeight: 1.6 }}>
              {error}
            </div>
            {errorCode === 'no_access' ? (
              // 利用権が無い人は組織ポータルへは誘導しない（管理者以外に組織ポータルを出さない）。ログアウトのみ。
              <button onClick={logout} style={{ marginTop: '18px', width: '100%', padding: '13px', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: '#475569', color: '#fff',
                boxShadow: '0 4px 16px rgba(71,85,105,0.35)' }}>
                ログアウト
              </button>
            ) : (
              <button onClick={goToSso} style={{ marginTop: '18px', width: '100%', padding: '13px', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                組織ポータルでログインし直す
              </button>
            )}
          </>
        ) : (
          <p style={{ marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
            {redirecting ? '組織ポータルのログイン画面へ移動しています…' : '読み込み中…'}
          </p>
        )}
      </div>
    </div>
  )
}
