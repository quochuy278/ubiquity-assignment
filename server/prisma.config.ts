import { config as loadEnvironment } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const environmentFiles = isTestEnvironment ? ['.env.test.local'] : ['.env.local', '.env'];

for (const path of environmentFiles) {
  loadEnvironment({ path, quiet: true });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env(isTestEnvironment ? 'E2E_DIRECT_URL' : 'DIRECT_URL'),
  },
});
