import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { isSortableOperation, useSortable } from '@dnd-kit/react/sortable';
import { CircleCheckIcon, GripVerticalIcon } from 'lucide-react';
import { useRef } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { type TodoResponseDto, TodoStatus } from '@/api/generated';
import { TodoCompletionControl } from '@/features/groups/components/todo-completion-control';
import { TodoSubtasks } from '@/features/groups/components/todo-subtasks';
import { useReorderTodo } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { toast } from '@/shared/components/ui/toast';

function moveTodo(todos: TodoResponseDto[], fromIndex: number, toIndex: number) {
  const reordered = [...todos];
  const [movedTodo] = reordered.splice(fromIndex, 1);
  if (!movedTodo) return todos;
  reordered.splice(toIndex, 0, movedTodo);
  return reordered;
}

function SortableTodoCard({
  todo,
  todoListId,
  index,
  reorderPending,
}: {
  todo: TodoResponseDto;
  todoListId: string;
  index: number;
  reorderPending: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: todo.id,
    index,
    group: todoListId,
    disabled: reorderPending,
  });
  const isCompleted = todo.status === TodoStatus.NUMBER_20;

  return (
    <Card ref={ref} size="sm" className={isDragging ? 'opacity-70' : undefined}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Button
              ref={handleRef}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-ml-1 cursor-grab touch-none active:cursor-grabbing"
              aria-label={`Reorder ${todo.title}`}
              title={`Reorder ${todo.title}`}
              disabled={reorderPending}
            >
              <GripVerticalIcon aria-hidden="true" />
            </Button>
            {isCompleted && (
              <CircleCheckIcon
                className="mt-0.5 size-5 shrink-0 text-green-600"
                aria-hidden="true"
              />
            )}
            {isCompleted && <span className="sr-only">Completed</span>}
            <div className="min-w-0 flex-1">
              <p
                title={todo.title}
                className={
                  isCompleted
                    ? 'font-medium text-muted-foreground line-through [overflow-wrap:anywhere]'
                    : 'font-medium [overflow-wrap:anywhere]'
                }
              >
                {todo.title}
              </p>
              {todo.description && (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground text-sm [overflow-wrap:anywhere]">
                  {todo.description}
                </p>
              )}
            </div>
          </div>
          <TodoCompletionControl todo={todo} todoListId={todoListId} />
        </div>
        <TodoSubtasks todoId={todo.id} />
      </CardContent>
    </Card>
  );
}

export function SortableTodoList({
  todos,
  todoListId,
}: {
  todos: TodoResponseDto[];
  todoListId: string;
}) {
  const { isPending: isReorderingTodo, mutateAsync: reorderTodo } = useReorderTodo(todoListId);
  const reorderLockRef = useRef<boolean>(false);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (
      event.canceled ||
      reorderLockRef.current ||
      isReorderingTodo ||
      !isSortableOperation(event.operation)
    ) {
      return;
    }

    const source = event.operation.source;
    if (!source) return;
    const fromIndex = source.initialIndex;
    const toIndex = source.index;
    if (fromIndex === toIndex) return;

    const orderedTodos = moveTodo(todos, fromIndex, toIndex);
    const movedTodo = orderedTodos[toIndex];
    if (!movedTodo) return;

    reorderLockRef.current = true;
    try {
      await reorderTodo({
        todoId: movedTodo.id,
        reorderTodoDto: { beforeTodoId: orderedTodos[toIndex + 1]?.id ?? null },
        orderedTodoIds: orderedTodos.map((todo) => todo.id),
      });
    } catch (error) {
      toast.add({ title: getApiErrorMessage(error), type: 'error', priority: 'high' });
    } finally {
      reorderLockRef.current = false;
    }
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="space-y-2">
        {todos.map((todo, index) => (
          <SortableTodoCard
            key={todo.id}
            todo={todo}
            todoListId={todoListId}
            index={index}
            reorderPending={isReorderingTodo}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
