import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button コンポーネント", () => {
  // --- レンダリング ---
  it("children が表示される", () => {
    render(<Button>クリック</Button>);
    expect(screen.getByText("クリック")).toBeInTheDocument();
  });

  it("デフォルトで button 要素としてレンダリングされる", () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  // --- variant ---
  it("variant=primary のクラスが適用される", () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-blue-600");
  });

  it("variant=secondary のクラスが適用される", () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-gray-100");
  });

  it("variant=outline のクラスが適用される", () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("variant=ghost のクラスが適用される", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-gray-700");
  });

  // --- size ---
  it("size=sm のクラスが適用される", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");
  });

  it("size=md のクラスが適用される（デフォルト）", () => {
    render(<Button>Medium</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("size=lg のクラスが適用される", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  // --- isLoading ---
  it("isLoading=true のとき disabled になる", () => {
    render(<Button isLoading>送信中</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("isLoading=true のとき spinner SVG が表示される", () => {
    render(<Button isLoading>送信中</Button>);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("isLoading=false のとき spinner が表示されない", () => {
    render(<Button isLoading={false}>送信</Button>);
    const svg = document.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  // --- disabled ---
  it("disabled=true のとき非活性になる", () => {
    render(<Button disabled>無効</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  // --- クリックイベント ---
  it("クリック時に onClick が呼ばれる", async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>クリック</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled のとき onClick が呼ばれない", async () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        無効
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  // --- className ---
  it("追加 className が適用される", () => {
    render(<Button className="extra-class">ボタン</Button>);
    expect(screen.getByRole("button")).toHaveClass("extra-class");
  });
});
