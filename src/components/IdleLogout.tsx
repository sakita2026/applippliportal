'use client';

import { useEffect } from 'react';

// アイドルタイムアウト（無操作）= 300分。サーバー側のセッション失効と揃える。
// タブを開いたまま放置（バックグラウンドのポーリングはあっても人の操作が無い）状態が
// 300分続いたら、確実にログアウト（/api/auth/logout でCookie破棄＋orgportalシングルログアウト）。
const IDLE_MS = 300 * 60 * 1000;

export function IdleLogout() {
  useEffect(() => {
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    // 人の操作イベントのみを「活動」とみなす（30秒ごとの自動ポーリング等は含めない）
    const events: (keyof WindowEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = window.setInterval(() => {
      if (Date.now() - last >= IDLE_MS) {
        window.location.href = '/api/auth/logout';
      }
    }, 60 * 1000); // 1分ごとに無操作時間を判定
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(id);
    };
  }, []);
  return null;
}
