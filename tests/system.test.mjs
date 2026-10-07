import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicConfig = JSON.stringify({ apiKey: 'TEST_PUBLIC_KEY', authDomain: 'demo.example', projectId: 'demo-gvcn-login', appId: 'TEST_APP_ID' });
test('production build contains public configuration but no server code or secret values', () => {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8',
    env: { ...process.env, FIREBASE_CONFIG_JSON: publicConfig, SIMPLE_LOGIN_ENABLED: 'true',
      SIMPLE_AUTH_SECRET: 'TEST_PRIVATE_SENTINEL_DO_NOT_PUBLISH',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"private_key":"TEST_PRIVATE_KEY_DO_NOT_PUBLISH"}' } });
  assert.equal(result.status, 0, result.stderr);
  const files = readdirSync(path.join(root, 'dist'));
  assert.deepEqual(files.sort(), ['access-manager.js', 'class-dashboard.css', 'class-dashboard.js', 'deputy-dashboard.css', 'deputy-permissions.js', 'firebase-secure.js', 'index.html', 'metadata.json', 'runtime-config.js', 'to-pho.html', 'to-pho.js']);
  const contents = files.map(name => readFileSync(path.join(root, 'dist', name), 'utf8')).join('\n');
  assert(!contents.includes('TEST_PRIVATE_SENTINEL_DO_NOT_PUBLISH'));
  assert(!contents.includes('TEST_PRIVATE_KEY_DO_NOT_PUBLISH'));
  const runtime = readFileSync(path.join(root, 'dist/runtime-config.js'), 'utf8');
  assert(runtime.includes('TEST_PUBLIC_KEY'));
  assert(runtime.includes('"simpleLogin": true'));
});

test('local server serves the app but blocks private source files and fails closed without credentials', async () => {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), FIREBASE_CONFIG_JSON: publicConfig,
      SIMPLE_LOGIN_ENABLED: 'true', SIMPLE_AUTH_SECRET: '', FIREBASE_SERVICE_ACCOUNT_JSON: '' } });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Local server startup timed out')), 5000);
      child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
      child.once('error', e => { clearTimeout(timeout); reject(e); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
    });
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(base)).status, 200);
    for (const file of ['/server/access-service.mjs', '/.env', '/package.json', '/firestore.rules']) {
      assert.equal((await fetch(base + file)).status, 404);
    }
    assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
    const runtime = await (await fetch(base + '/runtime-config.js')).text();
    assert(runtime.includes('"simpleLogin": true'));
    const response = await fetch(base + '/.netlify/functions/simple-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ kind: 'phhs', credential: '12345' }),
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert(!(await response.text()).includes('private_key'));
  } finally { child.kill(); }
});

test('installed Firebase Admin modules import successfully', async () => {
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp({ projectId: 'demo-gvcn-import-check' }, 'test-import-only');
  try { assert(getAuth(app)); assert(getFirestore(app)); }
  finally { await deleteApp(app); }
});
