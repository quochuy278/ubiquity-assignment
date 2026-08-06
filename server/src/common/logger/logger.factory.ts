import type { WinstonModuleOptions } from 'nest-winston';
import { transports } from 'winston';
import { createDevelopmentFormatter } from './formatters/development.formatter';
import { createProductionFormatter } from './formatters/production.formatter';
import { LOGGER_LEVELS } from './logger.constants';

export function createLoggerOptions(environment: string): WinstonModuleOptions {
  const isProduction = environment === 'production';

  return {
    levels: LOGGER_LEVELS,
    level: isProduction ? 'info' : 'verbose',
    format: isProduction ? createProductionFormatter() : createDevelopmentFormatter(),
    transports: [new transports.Console()],
  };
}
