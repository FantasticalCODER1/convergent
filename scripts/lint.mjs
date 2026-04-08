import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[lint] ${message}`);
    process.exit(1);
  }
}

run('npm', ['run', 'lint', '--prefix', 'frontend']);
run('npm', ['run', 'lint', '--prefix', 'backend']);

assert(existsSync('backend/storage.rules'), 'Missing backend/storage.rules');
assert(existsSync('docs/production-audit.md'), 'Missing docs/production-audit.md');

const truthDocs = ['README.md', 'docs/architecture.md', 'docs/database-schema.md', 'docs/deployment.md'];
for (const file of truthDocs) {
  const text = readFileSync(file, 'utf8');
  assert(!text.includes('roles.json'), `${file} still references roles.json`);
}

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
assert(workflow.includes('npm run lint'), 'CI does not run npm run lint');
assert(workflow.includes('npm run test'), 'CI does not run npm run test');
assert(workflow.includes('npm run check'), 'CI does not run npm run check');
