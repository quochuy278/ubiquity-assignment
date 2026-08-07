import { randomUUID } from 'node:crypto';

export interface UniqueUserInput {
  email: string;
  password: string;
  displayName: string;
}

export function createUniqueUserInput(label: string): UniqueUserInput {
  const uniqueId = randomUUID();

  return {
    email: `${label}.${uniqueId}@example.test`,
    password: `e2e-${uniqueId}`,
    displayName: `${label} ${uniqueId}`,
  };
}

export function createUniqueName(label: string): string {
  return `${label} ${randomUUID()}`;
}
