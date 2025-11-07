/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Script that synchronizes the top changelog version with the root package.json version.
// TODO: Extend to append conventional commit entries automatically.

import fs from 'fs';
import path from 'path';

const changelogPath = path.resolve('CHANGELOG.md');
const packageJsonPath = path.resolve('package.json');

const changelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const today = new Date().toISOString().split('T')[0];
const versionHeading = `## [${pkg.version}] - ${today}`;

if (!changelog.includes('## [')) {
  const scaffold = `# Changelog\n\n${versionHeading}\n`; // fallback if file empty
  fs.writeFileSync(changelogPath, scaffold);
  process.exit(0);
}

const updated = changelog.replace(/## \[[^\]]+\] - \d{4}-\d{2}-\d{2}/, versionHeading);
fs.writeFileSync(changelogPath, updated);
