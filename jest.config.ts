import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // next.config.ts および .env ファイルを読み込むためのプロジェクトルートを指定
  dir: "./",
});

const config: Config = {
  // テスト環境を jsdom（ブラウザ相当）に設定
  testEnvironment: "jsdom",

  // セットアップファイル: @testing-library/jest-dom のマッチャーを自動インポート
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // テストファイルのパターン
  testMatch: [
    "<rootDir>/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{ts,tsx}",
  ],

  // モジュールエイリアス (@/* -> src/*)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // カバレッジ対象ディレクトリ
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
    "!src/app/page.tsx",
  ],
};

// next/jest が提供するトランスフォームを適用した設定をエクスポート
export default createJestConfig(config);
