import Joi from 'joi';
import type { ApplicationConfig } from '../configuration.interface';

const productionEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().required(),
  AUTH_ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
}).unknown(true);

export default (): ApplicationConfig => {
  const { error, value } = productionEnvironmentSchema.validate(process.env, {
    abortEarly: true,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Invalid production environment: ${error.message}`);
  }

  return {
    app: {
      environment: 'production',
      port: value.PORT as number,
    },
    auth: {
      accessTokenSecret: value.AUTH_ACCESS_TOKEN_SECRET as string,
    },
    database: {
      url: value.DATABASE_URL as string,
      directUrl: value.DIRECT_URL as string,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 20_000,
      maxConnections: 10,
    },
  };
};
