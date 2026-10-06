import fs from 'node:fs';
import http from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'node:stream';
import { makeHandler } from './server/access-http.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const functionHandlers = { '/.netlify/functions/simple-login': makeHandler('login'), '/.netlify/functions/access-admin': makeHandler('admin'), '/.netlify/functions/deputy': makeHandler('deputy') };
const publicFiles = new Set(['/index.html', '/metadata.json', '/firebase-secure.js', '/runtime-config.js', '/access-manager.js', '/deputy-permissions.js', '/to-pho.html', '/to-pho.js', '/deputy-dashboard.css', '/class-dashboard.js', '/class-dashboard.css']);
const server = http.createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }

  if (functionHandlers[pathname]) {
    try {
      const localRequest = new Request(`http://${request.headers.host || `localhost:${PORT}`}${pathname}`, {
        method: request.method, headers: request.headers,
        ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: Readable.toWeb(request), duplex: 'half' }),
      });
      const result = await functionHandlers[pathname](localRequest, { ip: request.socket.remoteAddress?.replace(/^::ffff:/, '') });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch { response.writeHead(500); response.end('Local function error'); }
    return;
  }

  if (pathname === '/runtime-config.js' && process.env.FIREBASE_CONFIG_JSON) {
    try {
      const firebase = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
      const runtime = { appId: process.env.GVCN_APP_ID || 'so-tay-gvcn-7n', classId: process.env.GVCN_CLASS_ID || '7n', simpleLogin: process.env.SIMPLE_LOGIN_ENABLED === 'true', firebase };
      response.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(`window.__GVCN_RUNTIME_CONFIG__ = ${JSON.stringify(runtime, null, 2)};\n`);
      return;
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`FIREBASE_CONFIG_JSON không hợp lệ: ${error.message}`);
      return;
    }
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  if (!publicFiles.has(requestedPath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found'); return;
  }
  const candidatePath = path.resolve(__dirname, `.${requestedPath}`);
  const safePath = candidatePath.startsWith(`${__dirname}${path.sep}`) ? candidatePath : null;
  const filePath = safePath && fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : path.join(__dirname, 'index.html');

  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
