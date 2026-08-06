import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedDirectory = resolve(projectRoot, 'src/api/generated');

rmSync(generatedDirectory, { recursive: true, force: true });

const generatorCli = resolve(
  projectRoot,
  'node_modules/@openapitools/openapi-generator-cli/main.js',
);
const result = spawnSync(
  process.execPath,
  [generatorCli, 'generate', '--config', 'openapi-generator.config.json'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

if (result.status === 0) {
  for (const artifact of [
    '.gitignore',
    '.npmignore',
    '.openapi-generator-ignore',
    '.openapi-generator',
    'git_push.sh',
  ]) {
    rmSync(resolve(generatedDirectory, artifact), { recursive: true, force: true });
  }
}

process.exitCode = result.status ?? 1;
