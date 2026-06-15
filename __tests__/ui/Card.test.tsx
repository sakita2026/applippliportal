import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";

describe("Card コンポーネント", () => {
  it("children が表示される", () => {
    render(<Card>カード内容</Card>);
    expect(screen.getByText("カード内容")).toBeInTheDocument();
  });

  it("デフォルトで shadow-sm クラスが付く", () => {
    const { container } = render(<Card>内容</Card>);
    expect(container.firstChild).toHaveClass("shadow-sm");
  });

  it("shadow=false のとき shadow-sm クラスが付かない", () => {
    const { container } = render(<Card shadow={false}>内容</Card>);
    expect(container.firstChild).not.toHaveClass("shadow-sm");
  });

  it("hoverable=true のとき hover クラスが付く", () => {
    const { container } = render(<Card hoverable>内容</Card>);
    expect(container.firstChild).toHaveClass("hover:shadow-md");
  });

  it("hoverable=false のとき hover クラスが付かない（デフォルト）", () => {
    const { container } = render(<Card>内容</Card>);
    expect(container.firstChild).not.toHaveClass("hover:shadow-md");
  });

  it("追加 className が適用される", () => {
    const { container } = render(<Card className="extra-class">内容</Card>);
    expect(container.firstChild).toHaveClass("extra-class");
  });

  it("border と rounded クラスが付く", () => {
    const { container } = render(<Card>内容</Card>);
    expect(container.firstChild).toHaveClass("rounded-xl");
    expect(container.firstChild).toHaveClass("border");
  });
});

describe("CardHeader コンポーネント", () => {
  it("children が表示される", () => {
    render(<CardHeader>ヘッダー</CardHeader>);
    expect(screen.getByText("ヘッダー")).toBeInTheDocument();
  });

  it("border-b クラスが付く", () => {
    const { container } = render(<CardHeader>ヘッダー</CardHeader>);
    expect(container.firstChild).toHaveClass("border-b");
  });

  it("追加 className が適用される", () => {
    const { container } = render(
      <CardHeader className="custom">ヘッダー</CardHeader>
    );
    expect(container.firstChild).toHaveClass("custom");
  });
});

describe("CardBody コンポーネント", () => {
  it("children が表示される", () => {
    render(<CardBody>本文</CardBody>);
    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("px-6 py-4 クラスが付く", () => {
    const { container } = render(<CardBody>本文</CardBody>);
    expect(container.firstChild).toHaveClass("px-6");
    expect(container.firstChild).toHaveClass("py-4");
  });

  it("追加 className が適用される", () => {
    const { container } = render(<CardBody className="custom">本文</CardBody>);
    expect(container.firstChild).toHaveClass("custom");
  });
});

describe("CardFooter コンポーネント", () => {
  it("children が表示される", () => {
    render(<CardFooter>フッター</CardFooter>);
    expect(screen.getByText("フッター")).toBeInTheDocument();
  });

  it("border-t クラスが付く", () => {
    const { container } = render(<CardFooter>フッター</CardFooter>);
    expect(container.firstChild).toHaveClass("border-t");
  });

  it("bg-gray-50 クラスが付く", () => {
    const { container } = render(<CardFooter>フッター</CardFooter>);
    expect(container.firstChild).toHaveClass("bg-gray-50");
  });

  it("追加 className が適用される", () => {
    const { container } = render(
      <CardFooter className="custom">フッター</CardFooter>
    );
    expect(container.firstChild).toHaveClass("custom");
  });
});

describe("Card 複合利用", () => {
  it("CardHeader + CardBody + CardFooter を組み合わせてレンダリングできる", () => {
    render(
      <Card>
        <CardHeader>タイトル</CardHeader>
        <CardBody>本文テキスト</CardBody>
        <CardFooter>フッターボタン</CardFooter>
      </Card>
    );
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("本文テキスト")).toBeInTheDocument();
    expect(screen.getByText("フッターボタン")).toBeInTheDocument();
  });
});
