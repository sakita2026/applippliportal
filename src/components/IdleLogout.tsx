'use client';

import { useEffect } from 'react';

// アイドルタイムアウト（無操作）= 120分。サーバー側のセッション失効と揃える。
// タブを開いたまま放置（バックグラウンドのポーリングはあっても人の操作が無い）状態が
// 120分続いたら、確実にログアウト（/api/auth/logout でCookie破棄＋orgportalシングルログアウト）。
const IDLE_MS = 120 * 60 * 1000;      // 無操作120分でログアウト
const HEARTBEAT_MS = 4 * 60 * 1000;   // 操作中は最大4分ごとにセッションを延長（API応答では延長されないため）

export function IdleLogout() {
  useEffect(() => {
    let last = Date.now();       // 最後に人の操作があった時刻
    let lastBeat = Date.now();   // 最後にセッション延長(heartbeat)した時刻
    const onActivity = () => {
      const now = Date.now();
      last = now;
      // 操作中はサーバーセッションをスライド延長（人の操作が無ければ叩かない＝放置で失効する）
      if (now - lastBeat >= HEARTBEAT_MS) {
        lastBeat = now;
        fetch('/api/auth/heartbeat', { method: 'POST', cache: 'no-store' }).catch(() => {});
      }
    };
    // 人の操作イベントのみを「活動」とみなす（30秒ごとの自動ポーリング等は含めない）
    const events: (keyof WindowEventMap)[] = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const id = window.setInterval(() => {
      if (Date.now() - last >= IDLE_MS) {
        window.location.href = '/api/auth/logout';
      }
    }, 60 * 1000); // 1分ごとに無操作時間を判定
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(id);
    };
  }, []);
  return null;
}
