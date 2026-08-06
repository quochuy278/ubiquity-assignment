import { Configuration } from '@/api/generated';
import { configuration } from '@/config/configuration';

export const apiConfiguration = new Configuration({
  basePath: configuration.api.baseUrl,
});
