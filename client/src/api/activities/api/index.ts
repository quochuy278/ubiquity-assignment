import { generatedApiConfiguration, httpClient } from '@/api/api-client';
import { ActivitiesApi } from '@/api/generated';

export const activitiesApi = new ActivitiesApi(generatedApiConfiguration, undefined, httpClient);
