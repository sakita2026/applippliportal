/**
 * プロジェクト共通ユーティリティ関数
 */

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

/** 値が null または undefined でないことを確認する型ガード */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** 値が文字列であることを確認する型ガード */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** 値が数値であることを確認する型ガード */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

// ---------------------------------------------------------------------------
// 文字列ヘルパー
// ---------------------------------------------------------------------------

/**
 * 文字列を指定した最大文字数で切り詰め、末尾に省略記号を付加する
 * @param str 対象文字列
 * @param maxLength 最大文字数（デフォルト: 100）
 * @param suffix 省略記号（デフォルト: "..."）
 * @returns 切り詰めた文字列
 */
export function truncate(
  str: string,
  maxLength: number = 100,
  suffix: string = "..."
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 文字列の先頭と末尾の空白を除去し、複数の連続空白を単一スペースに正規化する
 * @param str 対象文字列
 * @returns 正規化した文字列
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, " ");
}

/**
 * キャメルケースをケバブケースに変換する
 * @param str キャメルケース文字列（例: "myVariableName"）
 * @returns ケバブケース文字列（例: "my-variable-name"）
 */
export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// クラス名ユーティリティ
// ---------------------------------------------------------------------------

/**
 * 条件付きでクラス名を結合する
 * @param classes クラス名または falsy 値の配列
 * @returns スペース区切りのクラス名文字列
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}
