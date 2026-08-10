import { getApiTimeoutMs } from '../api-timeout';
import type { ClientConfig } from '../configuration.interface';

export default (): ClientConfig => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required in production');
  }

  return {
    app: {
      environment: 'production',
    },
    api: {
      baseUrl: apiBaseUrl,
      timeoutMs: getApiTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS),
    },
    realtime: {
      ablyKey: import.meta.env.ABLY_KEY?.trim() || null,
    },
  };
};
