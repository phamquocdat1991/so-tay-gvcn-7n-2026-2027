import { isIP } from 'node:net';
import { AccessError } from './access-model.mjs';
import { createAccessService } from './access-service.mjs';

let service;
export async function getService() {
  if (service) return service;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const secret = process.env.SIMPLE_AUTH_SECRET;
  if (!raw || !secret || secret.length < 32) throw new AccessError(503, 'Đăng nhập đơn giản chưa được cấu hình. Vui lòng liên hệ GVCN.');
  let credentials;
  try { credentials = JSON.parse(raw); } catch { throw new AccessError(503, 'Cấu hình máy chủ chưa hợp lệ.'); }
  const publicConfig = process.env.FIREBASE_CONFIG_JSON ? JSON.parse(process.env.FIREBASE_CONFIG_JSON) : null;
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key ||
      (publicConfig?.projectId && publicConfig.projectId !== credentials.project_id)) throw new AccessError(503, 'Cấu hình dự án Firebase ở máy chủ chưa khớp.');
  const appId = process.env.GVCN_APP_ID || 'so-tay-gvcn-7n';
  const classId = process.env.GVCN_CLASS_ID || '7n';
  if (![appId, classId].every(s => /^[a-zA-Z0-9_-]{1,100}$/.test(s))) throw new AccessError(503, 'Cấu hình lớp chưa hợp lệ.');
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = getApps().find(a => a.name === 'simple-access') || initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, 'simple-access');
  service = createAccessService({ db: getFirestore(app), auth: getAuth(app), secret, appId, classId });
  return service;
}
function json(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra,
  } });
}
export function makeHandler(mode, serviceFactory = getService, isEnabled = () => process.env.SIMPLE_LOGIN_ENABLED === 'true') {
  return async (request, context = {}) => {
    try {
      if (request.method !== 'POST') return json({ error: 'Chỉ hỗ trợ POST.' }, 405, { Allow: 'POST' });
      if (mode === 'login' && !isEnabled()) throw new AccessError(503, 'Đăng nhập đơn giản chưa được bật.');
      // Same-origin browser requests only. No reflected CORS or client-selected project IDs.
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) throw new AccessError(403, 'Nguồn yêu cầu không hợp lệ.');
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AccessError(415, 'Yêu cầu phải là JSON.');
      if (Number(request.headers.get('content-length') || 0) > 4096) throw new AccessError(413, 'Yêu cầu quá dài.');
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (!reader) throw new AccessError(400, 'Thiếu nội dung yêu cầu.');
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); throw new AccessError(413, 'Yêu cầu quá dài.'); }
        chunks.push(Buffer.from(value));
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AccessError(400, 'JSON không hợp lệ.'); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccessError(400, 'Yêu cầu không hợp lệ.');
      const access = await serviceFactory();
      if (mode === 'login') {
        // context.ip is supplied by Netlify, never trust a request's X-Forwarded-For.
        if (!isIP(context.ip || '')) throw new AccessError(503, 'Không xác định được kết nối.');
        return json(await access.login(input, context.ip));
      }
      const bearer = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '')?.[1];
      if (mode === 'deputy') return json(await access.deputy(bearer, input));
      const actorUid = await access.requireAdmin(bearer);
      if (input.action === 'list') return json(await access.list(actorUid));
      if (input.action === 'sync') return json(await access.sync(actorUid));
      return json(await access.mutate(actorUid, input));
    } catch (error) {
      if (error instanceof AccessError) return json({ error: error.message, ...(error.code ? {code:error.code} : {}) }, error.status,
        error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
      // Do not log credentials, Authorization headers, tokens, or request bodies.
      console.error('Simple access request failed', { code: typeof error?.code === 'string' ? error.code : 'internal' });
      return json({ error: 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau.' }, 503);
    }
  };
}
