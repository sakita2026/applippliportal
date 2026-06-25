'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 「実行タスク」は /todos に統合済み。アクセスされたらリダイレクト。
export default function DecisionTasksRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/todos');
  }, [router]);
  return null;
}
