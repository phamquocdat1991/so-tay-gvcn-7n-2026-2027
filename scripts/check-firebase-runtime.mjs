// Offline runtime probe: no real credentials, no network, no database writes.
// Run in a fresh process with --no-experimental-require-module.
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';

assert.equal(process.features.require_module, false, 'Run with --no-experimental-require-module');
const { initializeApp, cert, deleteApp } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore } = await import('firebase-admin/firestore');
const require = createRequire(import.meta.url);
const adminRequire = createRequire(require.resolve('firebase-admin/app'));
const { JwksClient, passportJwtSecret } = adminRequire('jwks-rsa');
const jwt = adminRequire('jsonwebtoken');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'offline-test', alg: 'RS256', use: 'sig' };
const client = new JwksClient({ cache: false, rateLimit: false,
  jwksUri: 'https://offline.invalid/never-requested',
  fetcher: async () => ({ keys: [jwk] }) });
const signingKey = await client.getSigningKey('offline-test');
assert.equal(signingKey.getPublicKey().trim(), publicPem.trim());
const token = jwt.sign({ sub: 'offline-test-user' }, privateKey, { algorithm: 'RS256', keyid: 'offline-test' });
assert.equal(jwt.verify(token, signingKey.getPublicKey(), { algorithms: ['RS256'] }).sub, 'offline-test-user');
const parts = token.split('.');
parts[1] = Buffer.from(JSON.stringify({ sub: 'tampered-user' })).toString('base64url');
assert.throws(() => jwt.verify(parts.join('.'), signingKey.getPublicKey(), { algorithms: ['RS256'] }));
await assert.rejects(client.getSigningKey('unknown-key'));
const invalidClient = new JwksClient({ cache: false, fetcher: async () => ({ keys: [
  { ...jwk, use: 'enc' }, { ...jwk, kty: 'oct' }, { ...jwk, alg: 'HS256' },
] }) });
await assert.rejects(invalidClient.getSigningKeys());
// The package loads its Passport adapter even when Firebase does not use it.
// Preserve its callback API and supported-algorithm checks after lazy loading.
const provider = passportJwtSecret({ cache: false,
  jwksUri: 'https://offline.invalid/never-requested', fetcher: async () => ({ keys: [jwk] }) });
const getPassportKey = raw => new Promise((resolve, reject) => {
  provider({}, raw, (err, key) => err ? reject(err) : resolve(key));
});
assert.equal((await getPassportKey(token)).trim(), publicPem.trim());
assert.equal(await getPassportKey('not-a-jwt'), null);
assert.equal(await getPassportKey(jwt.sign({ sub: 'wrong-algorithm' }, 'fake-test-secret', { algorithm: 'HS256' })), null);

const app = initializeApp({ projectId: 'demo-gvcn-runtime', credential: cert({
  projectId: 'demo-gvcn-runtime', clientEmail: 'test@demo-gvcn-runtime.iam.gserviceaccount.com',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
}) }, 'offline-runtime-check');
try {
  assert(getFirestore(app));
  const customToken = await getAuth(app).createCustomToken('offline-test-user', { accessVersion: 7 });
  const decoded = jwt.verify(customToken, publicPem, { algorithms: ['RS256'] });
  assert.equal(decoded.uid, 'offline-test-user');
  assert.equal(decoded.claims.accessVersion, 7);
} finally { await deleteApp(app); }
console.log('Firebase runtime smoke test: passed without require(ESM).');
