import type { ClientConfig } from './configuration.interface';
import developmentConfiguration from './environments/development.config';
import productionConfiguration from './environments/production.config';

function createConfiguration(): ClientConfig {
  return import.meta.env.PROD ? productionConfiguration() : developmentConfiguration();
}

export const configuration = createConfiguration();
