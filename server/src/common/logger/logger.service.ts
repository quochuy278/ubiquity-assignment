import { inspect } from 'node:util';
import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { RequestContextService } from '../request-context/request-context.service';
import { LOGGER_DEFAULT_CONTEXT, type LoggerLevel } from './logger.constants';

export type LoggerMetadata = Record<string, unknown>;

interface ParsedLogArguments {
  context: string;
  metadata: LoggerMetadata;
  stack?: string;
}

@Injectable()
export class ApplicationLoggerService implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly requestContext: RequestContextService,
  ) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  success(message: unknown, ...optionalParams: unknown[]): void {
    this.write('success', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams, true);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams, true);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(
    level: LoggerLevel,
    message: unknown,
    optionalParams: readonly unknown[],
    isError = false,
  ): void {
    const parsedArguments = this.parseArguments(message, optionalParams, isError);
    const requestId = this.requestContext.getRequestId();

    this.logger.log({
      level,
      message: this.formatMessage(message),
      context: parsedArguments.context,
      metadata: {
        ...parsedArguments.metadata,
        ...(requestId ? { requestId } : {}),
      },
      ...(parsedArguments.stack ? { stack: parsedArguments.stack } : {}),
    });
  }

  private parseArguments(
    message: unknown,
    optionalParams: readonly unknown[],
    isError: boolean,
  ): ParsedLogArguments {
    const strings = optionalParams.filter((value): value is string => typeof value === 'string');
    const context = strings.at(-1) ?? LOGGER_DEFAULT_CONTEXT;
    const metadata: LoggerMetadata = {};

    for (const value of optionalParams) {
      if (this.isMetadata(value)) {
        Object.assign(metadata, value);
      }
    }

    if (!isError) {
      return { context, metadata };
    }

    const messageStack = message instanceof Error ? message.stack : undefined;
    const optionalError = optionalParams.find((value): value is Error => value instanceof Error);
    const trace =
      strings.length > 1 ? strings[0] : strings.find((value) => this.looksLikeStack(value));
    const stack = messageStack ?? optionalError?.stack ?? trace;

    return {
      context,
      metadata,
      ...(stack ? { stack } : {}),
    };
  }

  private formatMessage(message: unknown): string {
    if (message instanceof Error) {
      return message.message;
    }

    if (typeof message === 'string') {
      return message;
    }

    return inspect(message, {
      breakLength: Number.POSITIVE_INFINITY,
      colors: false,
      compact: true,
      depth: 5,
    });
  }

  private isMetadata(value: unknown): value is LoggerMetadata {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof Error)
    );
  }

  private looksLikeStack(value: string): boolean {
    return value.includes('\n') || /^\w*Error(?::|$)/u.test(value);
  }
}
