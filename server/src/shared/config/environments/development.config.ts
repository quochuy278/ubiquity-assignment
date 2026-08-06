import Joi from 'joi';
import type { ApplicationConfig } from '../configuration.interface';

const developmentEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
}).unknown(true);

export default (): ApplicationConfig => {
  const { error, value } = developmentEnvironmentSchema.validate(process.env, {
    abortEarly: true,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid development environment: ${error.message}`);
  }

  return {
    app: {
      environment: process.env.NODE_ENV ?? 'development',
      port: value.PORT as number,
    },
    database: {
      url: value.DATABASE_URL as string,
      directUrl: value.DIRECT_URL as string,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      maxConnections: 5,
    },
  };
};
