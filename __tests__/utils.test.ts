import {
  isDefined,
  isString,
  isNumber,
  truncate,
  normalizeWhitespace,
  camelToKebab,
  cn,
} from "@/lib/utils";

describe("isDefined", () => {
  it("null は false を返す", () => {
    expect(isDefined(null)).toBe(false);
  });
  it("undefined は false を返す", () => {
    expect(isDefined(undefined)).toBe(false);
  });
  it("値がある場合は true を返す", () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(false)).toBe(true);
  });
});

describe("isString", () => {
  it("文字列に対して true を返す", () => {
    expect(isString("hello")).toBe(true);
  });
  it("数値に対して false を返す", () => {
    expect(isString(42)).toBe(false);
  });
});

describe("isNumber", () => {
  it("数値に対して true を返す", () => {
    expect(isNumber(42)).toBe(true);
  });
  it("NaN に対して false を返す", () => {
    expect(isNumber(NaN)).toBe(false);
  });
  it("文字列に対して false を返す", () => {
    expect(isNumber("42")).toBe(false);
  });
});

describe("truncate", () => {
  it("最大文字数以内の文字列はそのまま返す", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("最大文字数を超える場合は省略記号を付加する", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });
  it("カスタム省略記号を使用できる", () => {
    expect(truncate("hello world", 8, "…")).toBe("hello w…");
  });
});

describe("normalizeWhitespace", () => {
  it("前後の空白を除去する", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });
  it("複数の連続空白を単一スペースに正規化する", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });
});

describe("camelToKebab", () => {
  it("キャメルケースをケバブケースに変換する", () => {
    expect(camelToKebab("myVariableName")).toBe("my-variable-name");
  });
  it("小文字のみの文字列はそのまま返す", () => {
    expect(camelToKebab("hello")).toBe("hello");
  });
});

describe("cn", () => {
  it("クラス名を結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
  it("falsy 値を除外する", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });
  it("空の場合は空文字を返す", () => {
    expect(cn()).toBe("");
  });
});
