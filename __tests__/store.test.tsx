import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider, useStore, PRIORITY_LABELS, STATUS_LABELS, COLOR_MAP, SHARE_STATUS_LABELS } from '@/lib/store';
import type { Todo, CalendarEvent } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'テストTodo',
  priority: 'medium',
  status: 'todo',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'テストイベント',
  date: '2026-06-15',
  shareStatus: 'private',
  color: 'indigo',
  ...overrides,
});

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const createFetchMock = (todosData: Todo[], eventsData: CalendarEvent[]) =>
  jest.fn().mockImplementation((url: string, options?: RequestInit) => {
    const method = options?.method ?? 'GET';

    // Initial GET requests
    if (method === 'GET') {
      if (url === '/api/todos') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(todosData),
        });
      }
      if (url === '/api/events') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(eventsData),
        });
      }
    }

    // POST /api/todos
    if (method === 'POST' && url === '/api/todos') {
      const body = JSON.parse(options?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...makeTodo(), ...body, id: 'new-todo' }),
      });
    }

    // PUT /api/todos/:id
    if (method === 'PUT' && url.startsWith('/api/todos/')) {
      const body = JSON.parse(options?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      });
    }

    // DELETE /api/todos/:id
    if (method === 'DELETE' && url.startsWith('/api/todos/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }

    // POST /api/events
    if (method === 'POST' && url === '/api/events') {
      const body = JSON.parse(options?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...makeEvent(), ...body, id: 'new-evt' }),
      });
    }

    // PUT /api/events/:id
    if (method === 'PUT' && url.startsWith('/api/events/')) {
      const body = JSON.parse(options?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      });
    }

    // DELETE /api/events/:id
    if (method === 'DELETE' && url.startsWith('/api/events/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }

    return Promise.reject(new Error(`Unhandled request: ${method} ${url}`));
  });

// ---------------------------------------------------------------------------
// Test consumer component
// ---------------------------------------------------------------------------

function StoreConsumer({ action }: { action?: string }) {
  const { state, addTodo, updateTodo, deleteTodo, addEvent, updateEvent, deleteEvent } = useStore();

  return (
    <div>
      <div data-testid="loading">{String(state.loading)}</div>
      <div data-testid="error">{state.error ?? 'null'}</div>
      <div data-testid="todos-count">{state.todos.length}</div>
      <div data-testid="events-count">{state.events.length}</div>
      {state.todos.map((t) => (
        <div key={t.id} data-testid={`todo-${t.id}`}>
          {t.title}
        </div>
      ))}
      {state.events.map((e) => (
        <div key={e.id} data-testid={`event-${e.id}`}>
          {e.title}
        </div>
      ))}
      {action === 'add-todo' && (
        <button
          onClick={() => addTodo({ title: '新しいTodo', priority: 'high', status: 'todo' })}
        >
          TodoAddBtn
        </button>
      )}
      {action === 'update-todo' && state.todos.length > 0 && (
        <button
          onClick={() => updateTodo({ ...state.todos[0], title: '更新済みTodo' })}
        >
          TodoUpdateBtn
        </button>
      )}
      {action === 'delete-todo' && state.todos.length > 0 && (
        <button onClick={() => deleteTodo(state.todos[0].id)}>
          TodoDeleteBtn
        </button>
      )}
      {action === 'add-event' && (
        <button
          onClick={() =>
            addEvent({ title: '新しいイベント', date: '2026-06-20', shareStatus: 'shared', color: 'sky' })
          }
        >
          EventAddBtn
        </button>
      )}
      {action === 'update-event' && state.events.length > 0 && (
        <button
          onClick={() => updateEvent({ ...state.events[0], title: '更新済みイベント' })}
        >
          EventUpdateBtn
        </button>
      )}
      {action === 'delete-event' && state.events.length > 0 && (
        <button onClick={() => deleteEvent(state.events[0].id)}>
          EventDeleteBtn
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoreProvider / useStore', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初期値と初期データ取得', () => {
    it('初期 loading が true で、データ取得後に false になる', async () => {
      global.fetch = createFetchMock([], []);
      render(
        <StoreProvider>
          <StoreConsumer />
        </StoreProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });

    it('初期 error が null である', async () => {
      global.fetch = createFetchMock([], []);
      render(
        <StoreProvider>
          <StoreConsumer />
        </StoreProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('null');
      });
    });

    it('取得した todos が state に反映される', async () => {
      const todo = makeTodo({ id: 'todo-x', title: 'フェッチedTodo' });
      global.fetch = createFetchMock([todo], []);
      render(
        <StoreProvider>
          <StoreConsumer />
        </StoreProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('todos-count').textContent).toBe('1');
        expect(screen.getByTestId('todo-todo-x').textContent).toBe('フェッチedTodo');
      });
    });

    it('取得した events が state に反映される', async () => {
      const event = makeEvent({ id: 'evt-x', title: 'フェッチedEvent' });
      global.fetch = createFetchMock([], [event]);
      render(
        <StoreProvider>
          <StoreConsumer />
        </StoreProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('events-count').textContent).toBe('1');
        expect(screen.getByTestId('event-evt-x').textContent).toBe('フェッチedEvent');
      });
    });

    it('fetch 失敗時に error がセットされる', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      render(
        <StoreProvider>
          <StoreConsumer />
        </StoreProvider>
      );
      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Network error');
      });
    });
  });

  describe('useStore — StoreProvider 外での使用', () => {
    it('StoreProvider 外で useStore を呼ぶとエラーをスローする', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<StoreConsumer />)).toThrow(
        'useStore must be used inside StoreProvider'
      );
      spy.mockRestore();
    });
  });

  describe('addTodo', () => {
    it('addTodo を呼ぶと todos に追加される', async () => {
      const user = userEvent.setup();
      global.fetch = createFetchMock([], []);
      render(
        <StoreProvider>
          <StoreConsumer action="add-todo" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

      await user.click(screen.getByText('TodoAddBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('todos-count').textContent).toBe('1');
      });
    });
  });

  describe('updateTodo', () => {
    it('updateTodo を呼ぶと該当 todo のタイトルが更新される', async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ id: 'todo-u', title: '元のタイトル' });
      global.fetch = createFetchMock([todo], []);
      render(
        <StoreProvider>
          <StoreConsumer action="update-todo" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('todo-todo-u')).toBeInTheDocument());

      await user.click(screen.getByText('TodoUpdateBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-u').textContent).toBe('更新済みTodo');
      });
    });
  });

  describe('deleteTodo', () => {
    it('deleteTodo を呼ぶと該当 todo が削除される', async () => {
      const user = userEvent.setup();
      const todo = makeTodo({ id: 'todo-d', title: '削除対象Todo' });
      global.fetch = createFetchMock([todo], []);
      render(
        <StoreProvider>
          <StoreConsumer action="delete-todo" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('todo-todo-d')).toBeInTheDocument());

      await user.click(screen.getByText('TodoDeleteBtn'));

      await waitFor(() => {
        expect(screen.queryByTestId('todo-todo-d')).not.toBeInTheDocument();
        expect(screen.getByTestId('todos-count').textContent).toBe('0');
      });
    });
  });

  describe('addEvent', () => {
    it('addEvent を呼ぶと events に追加される', async () => {
      const user = userEvent.setup();
      global.fetch = createFetchMock([], []);
      render(
        <StoreProvider>
          <StoreConsumer action="add-event" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

      await user.click(screen.getByText('EventAddBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('events-count').textContent).toBe('1');
      });
    });
  });

  describe('updateEvent', () => {
    it('updateEvent を呼ぶと該当 event のタイトルが更新される', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ id: 'evt-u', title: '元のイベント' });
      global.fetch = createFetchMock([], [event]);
      render(
        <StoreProvider>
          <StoreConsumer action="update-event" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('event-evt-u')).toBeInTheDocument());

      await user.click(screen.getByText('EventUpdateBtn'));

      await waitFor(() => {
        expect(screen.getByTestId('event-evt-u').textContent).toBe('更新済みイベント');
      });
    });
  });

  describe('deleteEvent', () => {
    it('deleteEvent を呼ぶと該当 event が削除される', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ id: 'evt-d', title: '削除対象イベント' });
      global.fetch = createFetchMock([], [event]);
      render(
        <StoreProvider>
          <StoreConsumer action="delete-event" />
        </StoreProvider>
      );
      await waitFor(() => expect(screen.getByTestId('event-evt-d')).toBeInTheDocument());

      await user.click(screen.getByText('EventDeleteBtn'));

      await waitFor(() => {
        expect(screen.queryByTestId('event-evt-d')).not.toBeInTheDocument();
        expect(screen.getByTestId('events-count').textContent).toBe('0');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

describe('ラベルヘルパー定数', () => {
  it('PRIORITY_LABELS が正しいラベルを持つ', () => {
    expect(PRIORITY_LABELS.high).toBe('高');
    expect(PRIORITY_LABELS.medium).toBe('中');
    expect(PRIORITY_LABELS.low).toBe('低');
  });

  it('STATUS_LABELS が正しいラベルを持つ', () => {
    expect(STATUS_LABELS.todo).toBe('未着手');
    expect(STATUS_LABELS.in_progress).toBe('進行中');
    expect(STATUS_LABELS.done).toBe('完了');
  });

  it('COLOR_MAP が indigo を含む', () => {
    expect(COLOR_MAP.indigo).toBe('bg-indigo-500');
  });

  it('SHARE_STATUS_LABELS が正しいラベルを持つ', () => {
    expect(SHARE_STATUS_LABELS.shared).toBe('共有');
    expect(SHARE_STATUS_LABELS.private).toBe('プライベート');
  });
});
