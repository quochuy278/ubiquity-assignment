import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subtasksApi } from '@/api/groups';
import type { SubTaskResponseDto } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { TodoSubtasks } from '@/features/groups/components/todo-subtasks';
import { toast } from '@/shared/components/ui/toast';

const todoId = 'todo-1';
const otherTodoId = 'todo-2';

const activeSubtask: SubTaskResponseDto = {
  id: 'subtask-1',
  todoId,
  title: 'Write acceptance criteria',
  completed: false,
  rank: '1000',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const completedSubtask: SubTaskResponseDto = {
  ...activeSubtask,
  completed: true,
  updatedAt: '2026-08-10T11:00:00.000Z',
};

const secondSubtask: SubTaskResponseDto = {
  ...activeSubtask,
  id: 'subtask-2',
  title: 'Review edge cases',
  rank: '2000',
};

const thirdSubtask: SubTaskResponseDto = {
  ...activeSubtask,
  id: 'subtask-3',
  title: 'Update documentation',
  rank: '3000',
};

const createdSubtask: SubTaskResponseDto = {
  ...activeSubtask,
  id: 'subtask-4',
  title: 'Confirm release notes',
  rank: '4000',
};

function renderSubtasks(todoIds = [todoId]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      {todoIds.map((currentTodoId) => (
        <TodoSubtasks key={currentTodoId} todoId={currentTodoId} />
      ))}
    </QueryClientProvider>,
  );

  return queryClient;
}

async function openCreateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Add subtask' }));
  await user.type(screen.getByLabelText('Title'), createdSubtask.title);
}

describe('subtasks', () => {
  afterEach(() => {
    toast.close();
    vi.restoreAllMocks();
  });

  it('shows the add action without a large empty state and fetches once per Todo', async () => {
    const findSubtasks = vi
      .spyOn(subtasksApi, 'subTaskControllerFindForTodoV1')
      .mockResolvedValue({ data: [] } as never);

    renderSubtasks([todoId, otherTodoId]);

    expect(await screen.findAllByRole('button', { name: 'Add subtask' })).toHaveLength(2);
    await waitFor(() => expect(findSubtasks).toHaveBeenCalledTimes(2));
    expect(findSubtasks).toHaveBeenCalledWith({ todoId });
    expect(findSubtasks).toHaveBeenCalledWith({ todoId: otherTodoId });
    expect(screen.queryByText(/no subtasks/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0 of 0 completed')).not.toBeInTheDocument();
  });

  it('creates a subtask, renders it, and updates and invalidates only its Todo cache', async () => {
    const user = userEvent.setup();
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1')
      .mockResolvedValueOnce({ data: [activeSubtask] } as never)
      .mockResolvedValue({ data: [activeSubtask, createdSubtask] } as never);
    const createSubtask = vi
      .spyOn(subtasksApi, 'subTaskControllerCreateV1')
      .mockResolvedValue({ data: createdSubtask } as never);
    const queryClient = renderSubtasks();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await openCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Add subtask' }));

    expect(createSubtask).toHaveBeenCalledWith({
      todoId,
      createSubTaskDto: { title: createdSubtask.title },
    });
    expect(await screen.findByText(createdSubtask.title)).toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.subtasks.forTodo(todoId))).toEqual([
      activeSubtask,
      createdSubtask,
    ]);
    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.subtasks.forTodo(todoId),
      exact: true,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add subtask' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('keeps the form open and presents an API error when creation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1').mockResolvedValue({
      data: [],
    } as never);
    const createSubtask = vi
      .spyOn(subtasksApi, 'subTaskControllerCreateV1')
      .mockRejectedValue(new Error('Create failed'));
    renderSubtasks();

    await openCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Add subtask' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createSubtask).toHaveBeenCalledOnce();
  });

  it('shows create pending state and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { data: SubTaskResponseDto }) => void = () => undefined;
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdSubtask] } as never);
    const createSubtask = vi.spyOn(subtasksApi, 'subTaskControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve as typeof resolveCreate;
        }) as never,
    );
    renderSubtasks();

    await openCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Add subtask' }));

    const pendingButton = await screen.findByRole('button', { name: 'Adding subtask...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createSubtask).toHaveBeenCalledOnce();

    resolveCreate({ data: createdSubtask });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('completes a subtask, removes its action, and derives progress from the query result', async () => {
    const user = userEvent.setup();
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1')
      .mockResolvedValueOnce({ data: [activeSubtask, secondSubtask, thirdSubtask] } as never)
      .mockResolvedValue({ data: [completedSubtask, secondSubtask, thirdSubtask] } as never);
    const updateCompletion = vi
      .spyOn(subtasksApi, 'subTaskControllerUpdateCompletionV1')
      .mockResolvedValue({ data: completedSubtask } as never);
    const addToast = vi.spyOn(toast, 'add');
    renderSubtasks();

    expect(await screen.findByText('0 of 3 completed')).toBeInTheDocument();
    const activeRow = screen.getByText(activeSubtask.title).closest<HTMLElement>('li');
    if (!activeRow) throw new Error('Subtask row not found');
    await user.click(within(activeRow).getByRole('button', { name: 'Complete' }));

    expect(updateCompletion).toHaveBeenCalledWith({
      subtaskId: activeSubtask.id,
      updateSubTaskCompletionDto: { completed: true },
    });
    expect(await screen.findByText('1 of 3 completed')).toBeInTheDocument();
    expect(within(activeRow).getByText('Completed')).toBeInTheDocument();
    expect(within(activeRow).queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(within(activeRow).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
    expect(addToast).toHaveBeenCalledWith({ title: 'Subtask completed', type: 'success' });
  });

  it('preserves confirmed completion state and shows an error when update fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1').mockResolvedValue({
      data: [activeSubtask],
    } as never);
    vi.spyOn(subtasksApi, 'subTaskControllerUpdateCompletionV1').mockRejectedValue(
      new Error('Update failed'),
    );
    const queryClient = renderSubtasks();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const addToast = vi.spyOn(toast, 'add');

    const row = (await screen.findByText(activeSubtask.title)).closest<HTMLElement>('li');
    if (!row) throw new Error('Subtask row not found');
    await user.click(within(row).getByRole('button', { name: 'Complete' }));

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith({
        title: 'Something went wrong. Please try again.',
        type: 'error',
        priority: 'high',
      }),
    );
    expect(within(row).getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.subtasks.forTodo(todoId))).toEqual([activeSubtask]);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('disables only the subtask being updated and invalidates only that Todo query', async () => {
    const user = userEvent.setup();
    let resolveUpdate: (value: { data: SubTaskResponseDto }) => void = () => undefined;
    vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1')
      .mockResolvedValueOnce({ data: [activeSubtask, secondSubtask] } as never)
      .mockResolvedValue({ data: [completedSubtask, secondSubtask] } as never);
    const updateCompletion = vi
      .spyOn(subtasksApi, 'subTaskControllerUpdateCompletionV1')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve as typeof resolveUpdate;
          }) as never,
      );
    const queryClient = renderSubtasks();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const firstRow = (await screen.findByText(activeSubtask.title)).closest<HTMLElement>('li');
    const secondRow = screen.getByText(secondSubtask.title).closest<HTMLElement>('li');
    if (!firstRow || !secondRow) throw new Error('Subtask row not found');
    await user.click(within(firstRow).getByRole('button', { name: 'Complete' }));

    const pendingButton = within(firstRow).getByRole('button', { name: 'Completing...' });
    expect(pendingButton).toBeDisabled();
    expect(within(secondRow).getByRole('button', { name: 'Complete' })).toBeEnabled();
    await user.click(pendingButton);
    expect(updateCompletion).toHaveBeenCalledOnce();

    resolveUpdate({ data: completedSubtask });
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledOnce());
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.subtasks.forTodo(todoId),
      exact: true,
    });
    expect(within(firstRow).getByText('Completed')).toBeInTheDocument();
    expect(within(firstRow).queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(within(firstRow).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
  });
});
