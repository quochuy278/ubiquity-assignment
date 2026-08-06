import type { ApplicationConfig } from './configuration.interface';
import developmentConfiguration from './environments/development.config';
import productionConfiguration from './environments/production.config';

export default (): ApplicationConfig => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionConfiguration();
    default:
      return developmentConfiguration();
  }
};
