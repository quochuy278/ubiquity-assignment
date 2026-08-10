import { generatedApiConfiguration, httpClient } from '@/api/api-client';
import { AuthApi } from '@/api/generated';

export const authApi = new AuthApi(generatedApiConfiguration, undefined, httpClient);
