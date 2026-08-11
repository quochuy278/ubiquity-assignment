import { LoaderCircleIcon, PlusIcon } from 'lucide-react';
import { type KeyboardEvent, type SyntheticEvent, useEffect, useId, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { useCreateTodo } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export function QuickAddTodo({ todoListId }: { todoListId: string }) {
  const {
    error: createTodoError,
    isError: hasCreateTodoError,
    isPending: isCreatingTodo,
    mutateAsync: createTodo,
  } = useCreateTodo(todoListId);
  const [title, setTitle] = useState<string>('');
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitLockRef = useRef<boolean>(false);
  const shouldRestoreFocusRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isCreatingTodo && shouldRestoreFocusRef.current) {
      inputRef.current?.focus();
      shouldRestoreFocusRef.current = false;
    }
  }, [isCreatingTodo]);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || submitLockRef.current || isCreatingTodo) return;

    submitLockRef.current = true;
    shouldRestoreFocusRef.current = true;

    try {
      await createTodo({ title: trimmedTitle });
      setTitle('');
    } catch {
      return;
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && event.nativeEvent.isComposing) {
      event.preventDefault();
    }
  };

  return (
    <div className="space-y-2">
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          Quick add todo
        </label>
        <Input
          ref={inputRef}
          id={inputId}
          value={title}
          placeholder="Add a todo..."
          autoComplete="off"
          disabled={isCreatingTodo}
          aria-describedby={hasCreateTodoError ? errorId : undefined}
          aria-invalid={hasCreateTodoError}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="submit"
          disabled={isCreatingTodo || title.trim().length === 0}
          aria-busy={isCreatingTodo}
        >
          {isCreatingTodo ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
          ) : (
            <PlusIcon aria-hidden="true" />
          )}
          {isCreatingTodo ? 'Adding...' : 'Add'}
        </Button>
      </form>
      {hasCreateTodoError && (
        <Alert id={errorId} variant="destructive">
          <AlertDescription>{getApiErrorMessage(createTodoError)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
