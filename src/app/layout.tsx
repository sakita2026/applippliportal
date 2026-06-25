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
  title: "決めたことを100％実行できる決定管理",
  description: "決定事項・タスク・進捗・評価を一元管理",
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
