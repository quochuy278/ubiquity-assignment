import type { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

export function formatValidationErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const currentError = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];

    return [...currentError, ...formatValidationErrors(error.children ?? [], field)];
  });
}
