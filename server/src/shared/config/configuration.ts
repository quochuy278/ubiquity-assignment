import type { ApplicationConfig } from './configuration.interface';
import developmentConfiguration from './environments/development.config';
import productionConfiguration from './environments/production.config';
import testConfiguration from './environments/test.config';

export default (): ApplicationConfig => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionConfiguration();
    case 'test':
      return testConfiguration();
    default:
      return developmentConfiguration();
  }
};
