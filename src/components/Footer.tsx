import Link from "next/link";
import { BaseComponentProps } from "@/types";
import { cn } from "@/lib/utils";

/**
 * 共通フッターコンポーネント
 * サイト全体で使用されるフッターナビゲーションとコピーライト表示
 */
export default function Footer({ className }: BaseComponentProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "w-full border-t border-gray-200 bg-white",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* サイト名 */}
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-gray-900 hover:text-blue-600 transition-colors"
          >
            applippliportal
          </Link>

          {/* ナビゲーションリンク */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              ホーム
            </Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">
              About
            </Link>
          </nav>
        </div>

        {/* コピーライト */}
        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {currentYear} applippliportal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
