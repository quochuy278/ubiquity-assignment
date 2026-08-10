import { LoaderCircleIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';

interface SafeButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  onAction: () => Promise<unknown>;
  pending?: boolean;
  pendingContent?: ReactNode;
  pendingText?: ReactNode;
}

export function SafeButton({
  children,
  disabled,
  onAction,
  pending = false,
  pendingContent,
  pendingText = 'Please wait...',
  type = 'button',
  ...props
}: SafeButtonProps) {
  const actionLockRef = useRef(false);
  const [isLocallyPending, setIsLocallyPending] = useState(false);
  const isPending = pending || isLocallyPending;

  const handleClick = async () => {
    if (actionLockRef.current) return;

    actionLockRef.current = true;
    setIsLocallyPending(true);

    try {
      await onAction();
    } finally {
      actionLockRef.current = false;
      setIsLocallyPending(false);
    }
  };

  return (
    <Button
      type={type}
      disabled={disabled || isPending}
      aria-busy={isPending}
      onClick={handleClick}
      {...props}
    >
      {isPending
        ? (pendingContent ?? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              {pendingText}
            </>
          ))
        : children}
    </Button>
  );
}
