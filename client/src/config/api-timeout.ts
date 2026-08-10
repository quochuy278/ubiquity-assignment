export const DEFAULT_API_TIMEOUT_MS = 10_000;

export function getApiTimeoutMs(value: string | undefined) {
  if (!value?.trim()) {
    return DEFAULT_API_TIMEOUT_MS;
  }

  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('VITE_API_TIMEOUT_MS must be a positive integer');
  }

  return timeoutMs;
}
