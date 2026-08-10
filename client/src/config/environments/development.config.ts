import { getApiTimeoutMs } from '../api-timeout';
import type { ClientConfig } from '../configuration.interface';

export default (): ClientConfig => ({
  app: {
    environment: 'development',
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000',
    timeoutMs: getApiTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS),
  },
});
