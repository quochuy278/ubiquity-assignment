import Joi from 'joi';
import type { ApplicationConfig } from '../configuration.interface';

const developmentEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  AUTH_ACCESS_TOKEN_SECRET: Joi.string()
    .min(32)
    .default('development-only-access-secret-change-me'),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  ABLY_KEY: Joi.string().required(),
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
    auth: {
      accessTokenSecret: value.AUTH_ACCESS_TOKEN_SECRET as string,
    },
    database: {
      url: value.DATABASE_URL as string,
      directUrl: value.DIRECT_URL as string,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      maxConnections: 5,
    },
    realtime: {
      ablyKey: value.ABLY_KEY as string,
    },
  };
};
