import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiOperation,
  type ApiOperationOptions,
  ApiParam,
  type ApiParamOptions,
  ApiQuery,
  type ApiQueryOptions,
  ApiResponse,
  type ApiResponseNoStatusOptions,
  type ApiResponseOptions,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './dto/error-response.dto';
import { ValidationErrorResponseDto } from './dto/validation-error-response.dto';

export type ApiEndpointBodyOptions = ApiBodyOptions & {
  type: Type<unknown>;
};

export type ApiEndpointResponseOptions = ApiResponseOptions & {
  status: HttpStatus;
  type: Type<unknown>;
  description: string;
};

export interface ApiEndpointOptions {
  operation: ApiOperationOptions & { summary: string };
  body?: ApiEndpointBodyOptions;
  params?: readonly ApiParamOptions[];
  queries?: readonly ApiQueryOptions[];
  response: ApiEndpointResponseOptions;
  responses?: readonly ApiEndpointResponseOptions[];
  notFound?: ApiResponseNoStatusOptions;
}

const DEFAULT_ERROR_RESPONSES: readonly ApiEndpointResponseOptions[] = [
  {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'An unexpected internal error occurred',
    type: ErrorResponseDto,
  },
  {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'The service is temporarily unavailable',
    type: ErrorResponseDto,
  },
];

export function ApiEndpoint(options: ApiEndpointOptions): MethodDecorator {
  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    ApiOperation(options.operation),
    ApiResponse(options.response),
    ...DEFAULT_ERROR_RESPONSES.map((response) => ApiResponse(response)),
  ];

  if (options.body) {
    decorators.push(ApiBody(options.body));
  }

  if (options.body || options.params?.length || options.queries?.length) {
    decorators.push(
      ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'The request failed validation',
        type: ValidationErrorResponseDto,
      }),
    );
  }

  for (const param of options.params ?? []) {
    decorators.push(ApiParam(param));
  }

  for (const query of options.queries ?? []) {
    decorators.push(ApiQuery(query));
  }

  for (const response of options.responses ?? []) {
    decorators.push(ApiResponse(response));
  }

  if (options.notFound) {
    decorators.push(
      ApiResponse({
        ...options.notFound,
        status: HttpStatus.NOT_FOUND,
        type: ErrorResponseDto,
      }),
    );
  }

  return applyDecorators(...decorators);
}
