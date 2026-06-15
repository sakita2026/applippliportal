import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { StoreProvider } from "@/lib/store";
import { ConditionalAppLayout } from "@/components/Layout/ConditionalAppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkPortal — 社員作業管理ポータル",
  description: "タスク管理・カレンダー・ダッシュボードで業務を効率化する社員向け作業管理ポータル",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full">
        <ThemeProvider>
          <StoreProvider>
            <ConditionalAppLayout>{children}</ConditionalAppLayout>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
