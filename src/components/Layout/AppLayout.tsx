'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { useStore } from '@/lib/store';

// 全ページ右上に置く「早わかりルールブック」への小さなリンク（ヘルプマーク）。
function HelpLink({ variant }: { variant: 'desktop' | 'mobile' }) {
  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (variant === 'desktop') {
    return (
      <Link href="/guide" title="早わかりルールブック" aria-label="早わかりルールブック"
        className="hidden lg:flex fixed top-3 right-5 z-40 items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
        {icon}
        <span className="text-xs font-semibold">ルール</span>
      </Link>
    );
  }
  return (
    <Link href="/guide" title="早わかりルールブック" aria-label="早わかりルールブック"
      className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
      {icon}
    </Link>
  );
}

function LoadingOverlay() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">データを読み込み中...</p>
      </div>
    </div>
  );
}

function ErrorBanner() {
  return (
    <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="flex-1">サーバー／データベースに接続できません（一時的な可能性があります）。表示中のデータや直前の入力が反映されていない場合があります。少し待ってから再読み込みしてください。</span>
      <button onClick={() => window.location.reload()} className="flex-shrink-0 px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600">再読み込み</button>
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { state } = useStore();

  if (state.loading) return <LoadingOverlay />;

  return (
    <>
      {state.error && <ErrorBanner />}
      {children}
    </>
  );
}

function LogoutButton() {
  const handleLogout = () => {
    // 署名付き workportal_auth は httpOnly のためJSで消せない。サーバのログアウト(両Cookie破棄+SLO)へ委譲。
    document.cookie = 'workportal_user=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/api/auth/logout';
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors"
      title="ログアウト"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:inline">ログアウト</span>
    </button>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* 全ページ右上のヘルプ（早わかりルールブック）— デスクトップ用の固定ピル */}
      <HelpLink variant="desktop" />

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-xs bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent truncate max-w-[180px]">
              決めたことを100％実行できる決定管理
            </span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <HelpLink variant="mobile" />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AppContent>{children}</AppContent>
        </main>
      </div>
    </div>
  );
}
