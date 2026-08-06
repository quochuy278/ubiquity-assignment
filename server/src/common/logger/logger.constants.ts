import chalk from 'chalk';

export const LOGGER_LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  success: 3,
  info: 4,
  debug: 5,
  verbose: 6,
} as const;

export type LoggerLevel = keyof typeof LOGGER_LEVELS;

type Colorize = (value: string) => string;

const developmentChalk = new chalk.Instance({ level: 3 });

export const LOGGER_LEVEL_COLORS: Readonly<Record<LoggerLevel, Colorize>> = {
  fatal: developmentChalk.bgRed.white.bold,
  error: developmentChalk.red.bold,
  warn: developmentChalk.yellow.bold,
  success: developmentChalk.green.bold,
  info: developmentChalk.blue.bold,
  debug: developmentChalk.magenta.bold,
  verbose: developmentChalk.cyan.bold,
};

export const LOGGER_LEVEL_LABELS: Readonly<Record<LoggerLevel, string>> = {
  fatal: 'FATAL',
  error: 'ERROR',
  warn: 'WARN',
  success: 'SUCCESS',
  info: 'INFO',
  debug: 'DEBUG',
  verbose: 'VERBOSE',
};

export const LOGGER_DEFAULT_CONTEXT = 'Application';
export const LOGGER_LEVEL_COLUMN_WIDTH = 7;
export const LOGGER_CONTEXT_COLUMN_WIDTH = 18;

export const LOGGER_DEVELOPMENT_COLORS = {
  context: developmentChalk.yellow,
  metadata: developmentChalk.gray,
  stack: developmentChalk.red,
  timestamp: developmentChalk.gray,
} as const;
