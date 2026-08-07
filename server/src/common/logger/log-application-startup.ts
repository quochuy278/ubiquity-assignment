import type { ApplicationLoggerService } from './logger.service';

const BOOTSTRAP_LOG_CONTEXT = 'Bootstrap';
const LOCAL_BIND_HOSTS = new Set(['[::1]', '[::]', '127.0.0.1', '0.0.0.0']);

interface ApplicationStartupDetails {
  environment: string;
  swaggerUrl: string;
  url: string;
}

type StartupLogger = Pick<ApplicationLoggerService, 'log' | 'success'>;

export function createStartupDisplayUrl(applicationUrl: string): string {
  const url = new URL(applicationUrl);

  if (LOCAL_BIND_HOSTS.has(url.hostname)) {
    url.hostname = 'localhost';
  }

  return url.origin;
}

export function logApplicationStartup(
  logger: StartupLogger,
  details: ApplicationStartupDetails,
): void {
  logger.success('Application started successfully', BOOTSTRAP_LOG_CONTEXT, details);

  if (details.environment === 'production') {
    return;
  }

  logger.log(`Listening on: ${details.url}`, BOOTSTRAP_LOG_CONTEXT);
  logger.log(`Swagger: ${details.swaggerUrl}`, BOOTSTRAP_LOG_CONTEXT);
}
