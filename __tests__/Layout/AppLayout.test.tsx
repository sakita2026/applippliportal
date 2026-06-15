import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppLayout } from '@/components/Layout/AppLayout';

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

// useStore mock — provide non-loading state so children render
const mockUseStore = jest.fn(() => ({
  state: { todos: [], events: [], loading: false, error: null },
}));

jest.mock('@/lib/store', () => ({
  useStore: () => mockUseStore(),
}));

describe('AppLayout コンポーネント スモークテスト', () => {
  it('正常にレンダリングされる', () => {
    render(
      <AppLayout>
        <div data-testid="content">コンテンツ</div>
      </AppLayout>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('children が表示される', () => {
    render(
      <AppLayout>
        <p>テスト子要素</p>
      </AppLayout>
    );
    expect(screen.getByText('テスト子要素')).toBeInTheDocument();
  });

  it('loading 状態のとき LoadingOverlay が表示される', () => {
    mockUseStore.mockReturnValueOnce({
      state: { todos: [], events: [], loading: true, error: null },
    });
    render(
      <AppLayout>
        <div>子要素</div>
      </AppLayout>
    );
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('error 状態のとき ErrorBanner が表示される', () => {
    mockUseStore.mockReturnValueOnce({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: { todos: [], events: [], loading: false, error: 'DB接続失敗' as any },
    });
    render(
      <AppLayout>
        <div>子要素</div>
      </AppLayout>
    );
    expect(screen.getByText(/DB接続エラー/)).toBeInTheDocument();
    expect(screen.getByText(/DB接続失敗/)).toBeInTheDocument();
  });

  it('モバイルメニューボタンが存在する', () => {
    render(
      <AppLayout>
        <div>コンテンツ</div>
      </AppLayout>
    );
    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
    const menuBtn = header?.querySelector('button');
    expect(menuBtn).toBeInTheDocument();
  });

  it('モバイルメニューボタン押下でサイドバーオーバーレイが開く', async () => {
    const user = userEvent.setup();
    render(
      <AppLayout>
        <div>コンテンツ</div>
      </AppLayout>
    );
    const header = document.querySelector('header');
    const menuBtn = header?.querySelector('button') as HTMLButtonElement;
    // Before click: overlay should not exist
    expect(document.querySelector('.fixed.inset-0.z-50')).not.toBeInTheDocument();
    await user.click(menuBtn);
    // After click: overlay should exist
    expect(document.querySelector('.fixed.inset-0.z-50')).toBeInTheDocument();
  });

  it('オーバーレイの背景をクリックするとサイドバーが閉じる', async () => {
    const user = userEvent.setup();
    render(
      <AppLayout>
        <div>コンテンツ</div>
      </AppLayout>
    );
    const header = document.querySelector('header');
    const menuBtn = header?.querySelector('button') as HTMLButtonElement;
    await user.click(menuBtn);
    // Click the backdrop
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50') as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);
    expect(document.querySelector('.fixed.inset-0.z-50')).not.toBeInTheDocument();
  });
});
