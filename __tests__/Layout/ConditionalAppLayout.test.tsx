import { render, screen } from '@testing-library/react';
import { ConditionalAppLayout } from '@/components/Layout/ConditionalAppLayout';

// next/navigation mock — default to non-login path
const mockUsePathname = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
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

// useStore mock
jest.mock('@/lib/store', () => ({
  useStore: () => ({
    state: { todos: [], events: [], loading: false, error: null },
  }),
}));

describe('ConditionalAppLayout コンポーネント スモークテスト', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('/login 以外のパスでは AppLayout でラップされてレンダリングされる', () => {
    render(
      <ConditionalAppLayout>
        <div data-testid="child">コンテンツ</div>
      </ConditionalAppLayout>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    // AppLayout renders WorkPortal in both desktop sidebar and mobile header
    expect(screen.getAllByText('WorkPortal').length).toBeGreaterThanOrEqual(1);
  });

  it('/login パスでは AppLayout なしで children だけがレンダリングされる', () => {
    mockUsePathname.mockReturnValue('/login');
    render(
      <ConditionalAppLayout>
        <div data-testid="login-content">ログインページ</div>
      </ConditionalAppLayout>
    );
    expect(screen.getByTestId('login-content')).toBeInTheDocument();
    // Sidebar should NOT be rendered on login page
    expect(screen.queryByText('WorkPortal')).not.toBeInTheDocument();
  });

  it('children が正常に表示される', () => {
    render(
      <ConditionalAppLayout>
        <p>テスト段落</p>
      </ConditionalAppLayout>
    );
    expect(screen.getByText('テスト段落')).toBeInTheDocument();
  });

  it('/login 以外の任意のパスで AppLayout が適用される', () => {
    mockUsePathname.mockReturnValue('/todos');
    render(
      <ConditionalAppLayout>
        <div data-testid="todos">タスク</div>
      </ConditionalAppLayout>
    );
    expect(screen.getByTestId('todos')).toBeInTheDocument();
    expect(screen.getAllByText('WorkPortal').length).toBeGreaterThanOrEqual(1);
  });
});
