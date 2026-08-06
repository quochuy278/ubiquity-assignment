import Joi from 'joi';

const productionEnvironmentSchema = Joi.object({
  PORT: Joi.number().port().required(),
}).unknown(true);

export default () => {
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
  };
};
