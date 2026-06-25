import type { MetadataRoute } from "next";

// すべてのクローラーに対して全ページのクロールを禁止（検索エンジン非掲載）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
