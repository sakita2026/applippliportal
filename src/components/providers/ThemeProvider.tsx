'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ダークモードは廃止。常にライト固定（forcedTheme=light）でシステム連動・切替を無効化。
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
