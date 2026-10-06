import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { applyFirebaseRuntimePatch } from './patch-firebase-runtime.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const indexPath = path.join(projectDir, 'index.html');
const outputDir = path.join(projectDir, 'dist');
const firebaseScriptPath = path.join(projectDir, 'firebase-secure.js');
const checkOnly = process.argv.includes('--check');
const html = fs.readFileSync(indexPath, 'utf8');

const failures = [];

if (!html.trimStart().startsWith('<!DOCTYPE html>')) failures.push('Thiếu DOCTYPE HTML.');
if (!html.includes('</body>') || !html.includes('</html>')) failures.push('Thiếu thẻ đóng body/html.');
if (html.includes('\0')) failures.push('index.html chứa byte NUL bất thường.');

const openScripts = [...html.matchAll(/<script(?:\s[^>]*)?>/gi)];
const closeScriptCount = (html.match(/<\/script>/gi) || []).length;

if (openScripts.length !== closeScriptCount) {
  failures.push(`Số thẻ script mở/đóng không khớp (${openScripts.length}/${closeScriptCount}).`);
}

for (const [index, match] of openScripts.entries()) {
  const tag = match[0];
  if (/\bsrc\s*=/.test(tag)) continue;

  const codeStart = match.index + tag.length;
  const codeEnd = html.indexOf('</script>', codeStart);
  if (codeEnd === -1) continue;

  try {
    new vm.Script(html.slice(codeStart, codeEnd), { filename: `inline-script-${index + 1}.js` });
  } catch (error) {
    failures.push(error.stack || error.message);
  }
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

for (const name of ['firebase-secure.js', 'access-manager.js', 'server/access-model.mjs', 'server/access-service.mjs', 'server/access-http.mjs', 'netlify/functions/simple-login.mjs', 'netlify/functions/access-admin.mjs', 'scripts/patch-firebase-runtime.mjs', 'scripts/check-firebase-runtime.mjs']) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(projectDir, name)], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    console.error(syntax.stderr || syntax.stdout || `${name} không hợp lệ.`);
    process.exit(1);
  }
}

console.log('Kiểm tra cấu trúc HTML và cú pháp JavaScript: đạt.');
for (const name of ['class-dashboard.js', 'deputy-permissions.js', 'to-pho.js', 'server/deputy-service.mjs', 'server/academic-score.mjs', 'netlify/functions/deputy.mjs']) {
  const result = spawnSync(process.execPath, ['--check', path.join(projectDir, name)], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}

if (!checkOnly) {
  // Also patch here: cached installs or --ignore-scripts must not skip the fix.
  applyFirebaseRuntimePatch();
  const runtimeCheck = spawnSync(process.execPath,
    ['--no-experimental-require-module', path.join(scriptDir, 'check-firebase-runtime.mjs')],
    { cwd: projectDir, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, NODE_OPTIONS: '' } });
  if (runtimeCheck.status !== 0) {
    console.error(runtimeCheck.stderr || 'Firebase runtime compatibility check failed.');
    process.exit(1);
  }
  console.log(runtimeCheck.stdout.trim());
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(outputDir, 'index.html'));
  fs.copyFileSync(path.join(projectDir, 'metadata.json'), path.join(outputDir, 'metadata.json'));
  fs.copyFileSync(firebaseScriptPath, path.join(outputDir, 'firebase-secure.js'));
  fs.copyFileSync(path.join(projectDir, 'access-manager.js'), path.join(outputDir, 'access-manager.js'));
  for (const name of ['deputy-permissions.js', 'to-pho.html', 'to-pho.js', 'deputy-dashboard.css', 'class-dashboard.js', 'class-dashboard.css']) fs.copyFileSync(path.join(projectDir, name), path.join(outputDir, name));

  let runtimeConfig = {
    appId: process.env.GVCN_APP_ID || 'so-tay-gvcn-7n',
    classId: process.env.GVCN_CLASS_ID || '7n',
    simpleLogin: process.env.SIMPLE_LOGIN_ENABLED === 'true',
    firebase: null,
  };

  if (process.env.FIREBASE_CONFIG_JSON) {
    try {
      const firebase = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
      const missingKeys = requiredKeys.filter(key => !firebase[key]);
      if (missingKeys.length) throw new Error(`Thiếu trường: ${missingKeys.join(', ')}`);
      runtimeConfig = { ...runtimeConfig, firebase };
    } catch (error) {
      console.error(`FIREBASE_CONFIG_JSON không hợp lệ: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.warn('Chưa có FIREBASE_CONFIG_JSON: bản build sẽ hiển thị hướng dẫn cấu hình bảo mật.');
  }

  const runtimeSource = `window.__GVCN_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`;
  fs.writeFileSync(path.join(outputDir, 'runtime-config.js'), runtimeSource);
  console.log('Build Netlify hoàn tất tại dist/.');
}
