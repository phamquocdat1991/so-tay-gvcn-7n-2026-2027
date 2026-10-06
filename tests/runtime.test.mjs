import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { patchJwksSource } from '../scripts/patch-firebase-runtime.mjs';

const require = createRequire(import.meta.url);
const adminRequire = createRequire(require.resolve('firebase-admin/app'));
const target = path.join(path.dirname(adminRequire.resolve('jwks-rsa/package.json')), 'src/utils.js');
const root = fileURLToPath(new URL('../', import.meta.url));
const patched = readFileSync(target, 'utf8');

test('compatibility patch is idempotent and changes only the jose loading mechanism', () => {
  assert(patched.includes("  const jose = await import('jose');\n"));
  const original = "const jose = require('jose');\n" + patched.replace("  const jose = await import('jose');\n", '');
  assert.equal(patchJwksSource(original, '4.1.0'), patched);
  assert.equal(patchJwksSource(patched, '4.1.0'), patched);
});

test('compatibility patch refuses an unreviewed dependency version', () => {
  assert.throws(() => patchJwksSource(patched, '4.2.0'), /Unreviewed/);
});

test('compatibility patch refuses unexpected dependency content', () => {
  assert.throws(() => patchJwksSource(patched + '\n// altered', '4.1.0'), /Unexpected/);
});

test('Passport compatibility patch is idempotent and preserves callback decoding logic', () => {
  const file = 'src/integrations/passport.js';
  const source = readFileSync(path.join(path.dirname(adminRequire.resolve('jwks-rsa/package.json')), file), 'utf8');
  const original = "const jose = require('jose');\n" + source
    .replace('return async function secretProvider', 'return function secretProvider')
    .replace("      const jose = await import('jose');\n", '');
  assert.equal(patchJwksSource(original, '4.1.0', file), source);
  assert.equal(patchJwksSource(source, '4.1.0', file), source);
  assert.throws(() => patchJwksSource(source + '\n', '4.1.0', file), /Unexpected/);
});

test('Firebase imports, JWKS validation and custom-token signing work with require(ESM) disabled', () => {
  const result = spawnSync(process.execPath,
    ['--no-experimental-require-module', 'scripts/check-firebase-runtime.mjs'],
    { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_OPTIONS: '' } });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /passed without require\(ESM\)/);
});
