import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { stringify } from 'yaml';

const OPENAPI_OUTPUT_PATH = resolve(process.cwd(), 'generated', 'openapi.yml');

const swaggerConfig = new DocumentBuilder()
  .setTitle('Ubiquity API')
  .setDescription('Ubiquity Assignment API documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

export function generateOpenApiDocument(app: INestApplication): OpenAPIObject {
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const tags = new Map(document.tags?.map((tag) => [tag.name, tag]) ?? []);

  for (const pathItem of Object.values(document.paths)) {
    if (!pathItem) continue;

    for (const operation of Object.values(pathItem)) {
      if (typeof operation !== 'object' || operation === null || !('tags' in operation)) continue;

      const operationTags = operation.tags;
      if (!Array.isArray(operationTags)) continue;

      for (const tagName of operationTags) {
        if (typeof tagName === 'string' && !tags.has(tagName)) {
          tags.set(tagName, { name: tagName });
        }
      }
    }
  }

  document.tags = [...tags.values()].sort((left, right) => left.name.localeCompare(right.name));

  mkdirSync(dirname(OPENAPI_OUTPUT_PATH), { recursive: true });
  writeFileSync(OPENAPI_OUTPUT_PATH, stringify(document), 'utf8');

  return document;
}

export function setupOpenApi(app: INestApplication): void {
  const document = generateOpenApiDocument(app);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    customSiteTitle: 'Ubiquity API Docs',
  });
}
