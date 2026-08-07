import Joi from 'joi';
import type { ApplicationConfig } from '../configuration.interface';

const testEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().default(3001),
  E2E_AUTH_ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  E2E_DATABASE_URL: Joi.string().required(),
  E2E_DIRECT_URL: Joi.string().required(),
}).unknown(true);

export default (): ApplicationConfig => {
  const { error, value } = testEnvironmentSchema.validate(process.env, {
    abortEarly: true,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid test environment: ${error.message}`);
  }

  return {
    app: {
      environment: 'test',
      port: value.PORT as number,
    },
    auth: {
      accessTokenSecret: value.E2E_AUTH_ACCESS_TOKEN_SECRET as string,
    },
    database: {
      url: value.E2E_DATABASE_URL as string,
      directUrl: value.E2E_DIRECT_URL as string,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      maxConnections: 5,
    },
  };
};
