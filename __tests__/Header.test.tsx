import { render, screen } from "@testing-library/react";
import Header from "@/components/Header";

// next/link をモック（テスト環境では Router context が不要な形で動作させる）
jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("Header コンポーネント", () => {
  it("正常にレンダリングされる", () => {
    render(<Header />);
    const header = document.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("サイト名 'applippliportal' が表示される", () => {
    render(<Header />);
    expect(screen.getByText("applippliportal")).toBeInTheDocument();
  });

  it("サイト名がホーム（/）へのリンクである", () => {
    render(<Header />);
    const logoLink = screen.getByText("applippliportal").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("ナビゲーションに 'ホーム' リンクが存在する", () => {
    render(<Header />);
    expect(screen.getByText("ホーム")).toBeInTheDocument();
  });

  it("'ホーム' リンクが / を指している", () => {
    render(<Header />);
    const homeLink = screen.getByText("ホーム").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("ナビゲーションに 'About' リンクが存在する", () => {
    render(<Header />);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("'About' リンクが /about を指している", () => {
    render(<Header />);
    const aboutLink = screen.getByText("About").closest("a");
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  it("nav 要素が存在する", () => {
    render(<Header />);
    const nav = document.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });

  it("header が sticky クラスを持つ", () => {
    render(<Header />);
    const header = document.querySelector("header");
    expect(header?.className).toContain("sticky");
  });
});
