import Link from "next/link";

/**
 * 共通ヘッダーコンポーネント
 * サイト全体で使用されるナビゲーションバー
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ロゴ / サイト名 */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-gray-900 hover:text-blue-600 transition-colors"
        >
          applippliportal
        </Link>

        {/* ナビゲーションリンク */}
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link
            href="/"
            className="hover:text-blue-600 transition-colors"
          >
            ホーム
          </Link>
          <Link
            href="/about"
            className="hover:text-blue-600 transition-colors"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
