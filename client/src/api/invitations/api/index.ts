import { generatedApiConfiguration, httpClient } from '@/api/api-client';
import { InvitationsApi } from '@/api/generated';

export const invitationsApi = new InvitationsApi(generatedApiConfiguration, undefined, httpClient);
