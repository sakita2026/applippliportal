import { render, screen } from "@testing-library/react";
import Footer from "@/components/Footer";

// next/link をモック
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

describe("Footer コンポーネント", () => {
  it("正常にレンダリングされる", () => {
    render(<Footer />);
    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });

  it("コピーライトテキストが表示される", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${currentYear} applippliportal`))
    ).toBeInTheDocument();
  });

  it("ロゴリンク 'applippliportal' が表示される", () => {
    render(<Footer />);
    // ロゴリンクとナビリンクの両方に同じテキストが出るため getAllByText を使う
    const links = screen.getAllByText("applippliportal");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("ロゴリンクがホーム（/）を指している", () => {
    render(<Footer />);
    // footer > div > div > a (ロゴ) が最初の <a>
    const logoLink = document.querySelector("footer a");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("nav 要素が存在する", () => {
    render(<Footer />);
    const nav = document.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });

  it("ナビゲーションに 'ホーム' リンクが存在する", () => {
    render(<Footer />);
    expect(screen.getByText("ホーム")).toBeInTheDocument();
  });

  it("'ホーム' リンクが / を指している", () => {
    render(<Footer />);
    const homeLink = screen.getByText("ホーム").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("ナビゲーションに 'About' リンクが存在する", () => {
    render(<Footer />);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("'About' リンクが /about を指している", () => {
    render(<Footer />);
    const aboutLink = screen.getByText("About").closest("a");
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  it("className プロパティを受け取れる", () => {
    render(<Footer className="custom-class" />);
    const footer = document.querySelector("footer");
    expect(footer?.className).toContain("custom-class");
  });
});
