#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const functionsDir = path.join(projectRoot, 'backend', 'functions');
const firebaseConfigPath = path.join(projectRoot, 'backend', 'firebase.json');

const envValue = (process.env.ENABLE_FIREBASE_EMULATOR || '').toLowerCase();
const forceEnable = envValue === '1' || envValue === 'true';
const forceDisable = envValue === '0' || envValue === 'false';

function exitWithMessage(message, code = 0) {
  console.log(`[backend] ${message}`);
  process.exit(code);
}

if (forceDisable) {
  exitWithMessage('Firebase emulator start skipped because ENABLE_FIREBASE_EMULATOR=0.', 0);
}

if (!existsSync(path.join(functionsDir, 'node_modules'))) {
  exitWithMessage('Install dependencies in backend/functions before starting the emulator.', forceEnable ? 1 : 0);
}

const child = spawn('npx', ['firebase', 'emulators:start', '--project', 'demo-convergent', '--config', firebaseConfigPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
