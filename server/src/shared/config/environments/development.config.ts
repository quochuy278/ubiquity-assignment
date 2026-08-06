import Joi from 'joi';

const developmentEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
}).unknown(true);

export default () => {
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
  };
};
