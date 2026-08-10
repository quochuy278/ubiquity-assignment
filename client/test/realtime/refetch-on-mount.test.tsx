import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { todosApi } from '@/api/groups';
import { useTodosQuery } from '@/api/groups/queries';

describe('realtime query convergence', () => {
  afterEach(() => vi.restoreAllMocks());

  it('refetches Todos when re-entering a TodoList even while its cache is fresh', async () => {
    const findTodos = vi
      .spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValue({ data: [] } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const firstVisit = renderHook(() => useTodosQuery('list-1'), { wrapper });
    await waitFor(() => expect(firstVisit.result.current.isSuccess).toBe(true));
    firstVisit.unmount();

    const secondVisit = renderHook(() => useTodosQuery('list-1'), { wrapper });
    await waitFor(() => expect(findTodos).toHaveBeenCalledTimes(2));
    secondVisit.unmount();
  });
});
