import developmentConfiguration from './environments/development.config';
import productionConfiguration from './environments/production.config';

export default () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionConfiguration();
    default:
      return developmentConfiguration();
  }
};
