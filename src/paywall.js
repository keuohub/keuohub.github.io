import { PAYWALL, priceFor } from './config.js';

const SESSION_KEY = (testId) => `session:v1:${testId}`;
const UNLOCK_KEY = (testId) => `unlock:v1:${testId}`;

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

/** 一次测试会话。用户点「重新测试」会换一个新会话，等于要重新付费 */
export function ensureSession(testId) {
  const saved = read(SESSION_KEY(testId));
  if (saved && saved.id) return saved.id;
  const id = `${testId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  write(SESSION_KEY, { id, at: Date.now() });
  return id;
}

export function newSession(testId) {
  localStorage.removeItem(SESSION_KEY(testId));
  localStorage.removeItem(UNLOCK_KEY(testId));
  return ensureSession(testId);
}

export function isUnlocked(testId, session) {
  if (!PAYWALL.enabled) return true;
  const unlock = read(UNLOCK_KEY(testId));
  if (!unlock || unlock.session !== session) return false;
  if (Date.now() - unlock.at > PAYWALL.unlockHours * 3600 * 1000) return false;
  return true;
}

function markUnlocked(testId, session, code) {
  write(UNLOCK_KEY(testId), { session, code, at: Date.now() });
}

/** 这一题要不要拦。默认只在结果页拦，也可以配成做一半就拦 */
export function lockedAt(index) {
  if (!PAYWALL.enabled) return false;
  return typeof PAYWALL.gate === 'number' && index >= PAYWALL.gate;
}

/** 锁定态下把标签遮一半：「月白清辉型」→「月白●●●」 */
export function maskTag(tag) {
  return `${[...String(tag)].slice(0, 2).join('')}●●●`;
}

/**
 * 锁定态正文打码。注意是在 DOM 里就换成 ●，不是用 CSS 模糊——
 * 模糊只是视觉遮住，右键查看源码、复制粘贴都能拿到原文。
 */
export function maskText(text, keep = 0) {
  const chars = [...String(text)];
  if (chars.length <= keep) return '●'.repeat(chars.length);
  return chars.slice(0, keep).join('') + '●'.repeat(Math.min(16, chars.length - keep));
}

export async function verifyCode(rawCode, testId) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, reason: '请先输入激活码' };

  if (PAYWALL.endpoint) {
    try {
      const res = await fetch(`${PAYWALL.endpoint.replace(/\/$/, '')}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, test: testId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return { ok: false, reason: data.reason || '核销失败，稍后再试' };
      return { ok: true, code };
    } catch {
      return { ok: false, reason: '网络不通，检查一下网络再试' };
    }
  }

  // 本地码库：只用于开发调试，前端文件谁都能下载，防不住人
  try {
    const res = await fetch(PAYWALL.codesFile, { cache: 'no-store' });
    const data = await res.json();
    const digest = await sha256(code);
    const found = (data.codes || []).find(
      (item) => item.hash === digest && (!item.test || item.test === testId),
    );
    if (!found) return { ok: false, reason: '这个激活码无效' };
    console.warn('当前是本地码库模式，仅供调试。上线前请把 config.js 的 endpoint 换成 Worker 地址。');
    return { ok: true, code };
  } catch {
    return { ok: false, reason: '激活码服务连不上' };
  }
}

/** 码库文件里只存哈希，别人下载了也拿不到卡密原文 */
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function unlock(testId, session, code) {
  markUnlocked(testId, session, code);
}

export function paywallPrice(platform) {
  return priceFor(platform);
}

export { PAYWALL };
