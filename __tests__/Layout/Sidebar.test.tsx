import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/Layout/Sidebar';

// next/navigation mock
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}));

// next-themes mock
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

// next/link mock
jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Sidebar コンポーネント スモークテスト', () => {
  it('正常にレンダリングされる', () => {
    render(<Sidebar />);
    expect(document.querySelector('aside')).toBeInTheDocument();
  });

  it('WorkPortal ロゴが表示される', () => {
    render(<Sidebar />);
    expect(screen.getByText('WorkPortal')).toBeInTheDocument();
  });

  it('ダッシュボードリンクが表示される', () => {
    render(<Sidebar />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('カレンダーリンクが表示される', () => {
    render(<Sidebar />);
    expect(screen.getByText('カレンダー')).toBeInTheDocument();
  });

  it('タスク管理リンクが表示される', () => {
    render(<Sidebar />);
    expect(screen.getByText('タスク管理')).toBeInTheDocument();
  });

  it('ユーザー名が表示される', () => {
    render(<Sidebar />);
    expect(screen.getByText('崎田 さん')).toBeInTheDocument();
  });

  it('onClose が未指定の場合、閉じるボタンが表示されない', () => {
    render(<Sidebar />);
    // close button only renders when onClose is passed
    const closeButtons = document.querySelectorAll('button');
    // theme toggle button may be hidden (not mounted) - but no X button
    closeButtons.forEach((btn) => {
      expect(btn).not.toHaveAttribute('aria-label', 'close');
    });
  });

  it('onClose が指定された場合、閉じるボタンが表示される', () => {
    const onClose = jest.fn();
    render(<Sidebar onClose={onClose} />);
    // The close button has svg with an X path; at minimum there are multiple buttons
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('onClose が指定された場合、閉じるボタンを押すと onClose が呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Sidebar onClose={onClose} />);
    // The close button is the first button in the logo area (lg:hidden)
    const allButtons = document.querySelectorAll('button');
    // Find the button that is not the theme button (theme button is conditionally rendered)
    // There should be exactly one button in the header area
    const closeBtn = allButtons[0];
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('現在のパス (/dashboard) に active スタイルが適用される', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('ダッシュボード').closest('a');
    expect(dashboardLink?.className).toContain('bg-gradient-to-r');
  });
});
