// Narrow compatibility patch for firebase-admin 14.3.0 -> jwks-rsa 4.1.0.
// Upstream issue: https://github.com/firebase/firebase-admin-node/issues/3181
// Keep jose 6 and all key/signature validation unchanged. Only replace its
// synchronous require with a standard dynamic import in the existing async API.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const patches = {
  'src/utils.js': {
    originalHash: 'c535773fd798202296e846e7c057f96f631148686194ff2990f0729fa4c1b7af',
    patchedHash: 'f1ffe481947f3de681f1b37418208dab0968bbbd20eb12a544b5276642f6c9e2',
    edit: source => source.replace("const jose = require('jose');\n", '')
      .replace('async function retrieveSigningKeys(jwks) {\n',
        "async function retrieveSigningKeys(jwks) {\n  const jose = await import('jose');\n"),
  },
  'src/integrations/passport.js': {
    originalHash: '03557fac70296dda6d19872b1702d2b8f1d4c50d22d3fbcf1fb65f9afa7ddcbb',
    patchedHash: '6f071bedf7fb3477670bf2c9bf98944010a0bcd88b269899a064835f8ef8920e',
    edit: source => source.replace("const jose = require('jose');\n", '')
      .replace('return function secretProvider(req, rawJwtToken, cb)',
        'return async function secretProvider(req, rawJwtToken, cb)')
      .replace('    try {\n      decoded =', "    try {\n      const jose = await import('jose');\n      decoded ="),
  },
};
const digest = source => createHash('sha256').update(source).digest('hex');

export function patchJwksSource(source, version, file = 'src/utils.js') {
  if (version !== '4.1.0') throw new Error('Unreviewed jwks-rsa version: stop and review the compatibility patch.');
  if (!Object.hasOwn(patches, file)) throw new Error('Unreviewed jwks-rsa file.');
  const { originalHash, patchedHash, edit } = patches[file];
  const hash = digest(source);
  if (hash === patchedHash) return source;
  if (hash !== originalHash) throw new Error('Unexpected jwks-rsa source: refusing to overwrite it.');
  const patched = edit(source);
  if (digest(patched) !== patchedHash) throw new Error('Firebase compatibility patch verification failed.');
  return patched;
}

export function applyFirebaseRuntimePatch() {
  // Resolve the copy used by Firebase even if npm changes dependency nesting.
  const adminRequire = createRequire(require.resolve('firebase-admin/app'));
  const manifestPath = adminRequire.resolve('jwks-rsa/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.name !== 'jwks-rsa') throw new Error('Unexpected Firebase dependency.');
  // Validate all targets before writing anything. Never patch an unknown release.
  const changes = Object.keys(patches).map(file => {
    const target = path.join(path.dirname(manifestPath), file);
    const source = readFileSync(target, 'utf8');
    return { target, source, patched: patchJwksSource(source, manifest.version, file) };
  });
  for (const { target, source, patched } of changes) {
    if (patched !== source) writeFileSync(target, patched);
  }
  console.log('Firebase runtime compatibility: verified (jwks-rsa 4.1.0).');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  applyFirebaseRuntimePatch();
}
