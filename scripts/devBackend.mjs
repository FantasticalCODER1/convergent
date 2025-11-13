#!/usr/bin/env node
import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const functionsDir = path.join(projectRoot, 'backend', 'functions');

const envValue = (process.env.ENABLE_FIREBASE_EMULATOR || '').toLowerCase();
const forceEnable = envValue === '1' || envValue === 'true';
const forceDisable = envValue === '0' || envValue === 'false';

function commandExists(cmd) {
  try {
    const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function exitWithMessage(message, code = 0) {
  console.log(`[backend] ${message}`);
  process.exit(code);
}

let shouldRun = forceEnable;
if (!forceEnable) {
  if (forceDisable) {
    shouldRun = false;
  } else {
    shouldRun = commandExists('firebase');
  }
}

if (!shouldRun) {
  exitWithMessage(
    'Firebase emulator not started. Install the Firebase CLI and rerun, or set ENABLE_FIREBASE_EMULATOR=1 once ready.',
    0
  );
}

if (!existsSync(path.join(functionsDir, 'node_modules'))) {
  exitWithMessage('Install dependencies in backend/functions before starting the emulator.', forceEnable ? 1 : 0);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCmd, ['run', 'serve', '--prefix', functionsDir], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
