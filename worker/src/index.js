/**
 * 激活码核销服务。只做一件事：验码、核销、放行。
 *
 * 接口：
 *   POST /verify        { code, test }  → 校验并核销
 *   GET  /admin/stats?secret=xxx        → 看有多少码、用了多少
 *
 * 不管支付、不管订单、不管用户身份，只认码不认人。
 * 存储用 D1（SQLite）：免费额度每天 10 万次写入，一次导入一万个码也不会超。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (url.pathname === '/verify' && request.method === 'POST') {
      return verify(request, env);
    }
    if (url.pathname === '/admin/stats' && request.method === 'GET') {
      return stats(request, env);
    }
    return json({ ok: false, reason: '不存在的接口' }, 404);
  },
};

async function verify(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, reason: '请求格式不对' }, 400);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  const test = String(payload.test || '').trim();
  if (!code) return json({ ok: false, reason: '请输入激活码' });

  const row = await env.DB.prepare('SELECT code, test, used, expire_at FROM codes WHERE code = ?')
    .bind(code)
    .first();

  if (!row) return json({ ok: false, reason: '这个激活码无效' });
  if (row.used) return json({ ok: false, reason: '这个激活码已经用过了' });
  if (row.test && test && row.test !== test) {
    return json({ ok: false, reason: '这个码不是给这套测试用的' });
  }
  if (row.expire_at && Date.now() > row.expire_at) {
    return json({ ok: false, reason: '这个激活码已经过期了' });
  }

  // 带 used = 0 条件更新：两个人同时提交同一个码，只有一个能拿到 changes = 1
  const result = await env.DB.prepare(
    'UPDATE codes SET used = 1, used_at = ?, device = ? WHERE code = ? AND used = 0',
  )
    .bind(Date.now(), request.headers.get('CF-Connecting-IP') || '', code)
    .run();

  if (!result.meta?.changes) {
    return json({ ok: false, reason: '这个激活码已经用过了' });
  }

  return json({ ok: true });
}

async function stats(request, env) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    return json({ ok: false, reason: '没权限' }, 403);
  }

  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM codes').first();
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM codes WHERE used = 1').first();
  const totalCount = total?.n ?? 0;
  const usedCount = used?.n ?? 0;

  return json({ ok: true, total: totalCount, used: usedCount, remaining: totalCount - usedCount });
}
