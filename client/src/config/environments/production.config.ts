import { getProductionAblyKey } from '../ably-key';
import { getApiTimeoutMs } from '../api-timeout';
import type { ClientConfig } from '../configuration.interface';

export default (): ClientConfig => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const ablyKey = getProductionAblyKey(import.meta.env.ABLY_KEY);

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
      ablyKey,
    },
  };
};
