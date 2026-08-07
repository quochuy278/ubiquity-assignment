import type { INestApplication } from '@nestjs/common';
import { Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiProperty, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ApiEndpoint } from '../../../../src/shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../../src/shared/openapi/dto/error-response.dto';

enum ExampleStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

class ExampleRequestDto {
  @ApiProperty()
  name: string;
}

class ExampleResponseDto {
  @ApiProperty()
  id: string;
}

@Controller('examples')
class ExampleController {
  @Post(':exampleId')
  @ApiEndpoint({
    operation: { summary: 'Update an example' },
    body: { type: ExampleRequestDto, required: true },
    params: [{ name: 'exampleId', type: String, required: true }],
    queries: [
      {
        name: 'status',
        enum: ExampleStatus,
        enumName: 'ExampleStatus',
        required: false,
      },
    ],
    response: {
      status: HttpStatus.OK,
      description: 'The example was updated successfully',
      type: ExampleResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'Authentication is required',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The example does not exist' },
  })
  update(): ExampleResponseDto {
    return { id: 'example-1' };
  }

  @Get()
  @ApiEndpoint({
    operation: { summary: 'List examples' },
    response: {
      status: HttpStatus.OK,
      description: 'The examples were retrieved successfully',
      type: ExampleResponseDto,
      isArray: true,
    },
  })
  list(): ExampleResponseDto[] {
    return [];
  }
}

describe('Shared API endpoint documentation decorator', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExampleController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(app, {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents operation, body, parameter, query, DTO responses, and common errors', () => {
    const operation = document.paths['/examples/{exampleId}']?.post;

    expect(operation).toMatchObject({
      summary: 'Update an example',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ExampleRequestDto' },
          },
        },
      },
      responses: {
        200: expect.objectContaining({
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExampleResponseDto' },
            },
          },
        }),
        401: expect.any(Object),
        404: expect.any(Object),
        500: expect.any(Object),
        503: expect.any(Object),
      },
    });
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'path', name: 'exampleId' }),
        expect.objectContaining({ in: 'query', name: 'status' }),
      ]),
    );
    expect(document.components?.schemas).toHaveProperty('ErrorCode');
    expect(document.components?.schemas).toHaveProperty('ExampleStatus');
  });

  it('documents collection responses with isArray instead of an array-wrapped DTO type', () => {
    expect(document.paths['/examples']?.get?.responses[200]).toMatchObject({
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/ExampleResponseDto' },
          },
        },
      },
    });
  });
});
