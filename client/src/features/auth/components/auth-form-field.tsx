import { Input } from '@/shared/components/ui/input';

export function AuthFormField({
  id,
  label,
  ...inputProps
}: React.ComponentProps<'input'> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <Input id={id} name={id} required {...inputProps} />
    </div>
  );
}
