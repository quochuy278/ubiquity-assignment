import { LoaderCircleIcon } from 'lucide-react';
import {
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { FieldGroup } from '@/shared/components/ui/field';

interface FormDialogProps {
  children: ReactNode;
  description: string;
  error?: unknown;
  isPending: boolean;
  onReset: () => void;
  onSubmit: (data: FormData, close: () => void) => Promise<unknown>;
  pendingLabel: string;
  submitLabel: string;
  title: string;
  trigger: ReactElement;
  triggerLabel: string;
}

export function FormDialog({
  children,
  description,
  error,
  isPending,
  onReset,
  onSubmit,
  pendingLabel,
  submitLabel,
  title,
  trigger,
  triggerLabel,
}: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLocallyPending, setIsLocallyPending] = useState(false);
  const formId = useId();
  const submitLockRef = useRef(false);
  const isSubmitting = isPending || isLocallyPending;

  const close = () => {
    setOpen(false);
    onReset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (submitLockRef.current || isPending)) return;
    setOpen(nextOpen);
    if (!nextOpen) onReset();
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setIsLocallyPending(true);

    try {
      await onSubmit(new FormData(event.currentTarget), close);
    } catch {
      return;
    } finally {
      submitLockRef.current = false;
      setIsLocallyPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit}>
          <FieldGroup>
            {children}
            {error !== undefined && (
              <Alert variant="destructive">
                <AlertDescription className="first-letter:uppercase">
                  {getApiErrorMessage(error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
            Cancel
          </DialogClose>
          <Button type="submit" form={formId} disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? pendingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
