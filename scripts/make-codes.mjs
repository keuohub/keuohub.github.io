/**
 * 批量生成卡密。
 *
 * 用法：
 *   npm run codes            生成 20 个
 *   npm run codes -- 200     生成 200 个
 *   npm run codes -- 200 love-style   只给恋爱测试用
 *
 * 输出两个文件：
 *   codes-明文.csv   你自己留着发货用，卖一个发一个，绝对不要公开
 *   codes.json       放进项目根目录，里面只有哈希，别人下载也还原不出卡密
 *
 * 注意：本地模式防不住「同一个码在别人手机上再用一次」。
 * 要做到用过即废，必须换成 Worker 核销（见 docs/PAYMENT.md）。
 */
import { createHash, randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// 明文卡密绝不放在项目目录里，否则部署时会被一起传上公网
const VAULT = join(homedir(), 'Desktop', '测试卡密');
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679'; // 去掉 0O1I5S8B 这些容易念错看错的
const GROUP = 4;
const GROUPS = 3;

const count = Number(process.argv[2]) || 20;
const scope = process.argv[3] || '';

const pick = (length) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const codes = [];
for (let i = 0; i < count; i++) {
  codes.push(Array.from({ length: GROUPS }, () => pick(GROUP)).join('-'));
}

const hash = (code) => createHash('sha256').update(code).digest('hex');

writeFileSync(join(ROOT, 'codes.json'), `${JSON.stringify({ codes: codes.map((code) => ({ hash: hash(code), test: scope })) }, null, 2)}\n`);

const rows = ['卡密,适用测试', ...codes.map((code) => `${code},${scope || '全部'}`)];
mkdirSync(VAULT, { recursive: true });
writeFileSync(join(VAULT, 'codes-明文.csv'), `\uFEFF${rows.join('\n')}\n`);

// 给 Cloudflare D1 用的导入脚本：wrangler d1 execute --file=
const sql = [
  'CREATE TABLE IF NOT EXISTS codes (',
  '  code TEXT PRIMARY KEY,',
  "  test TEXT NOT NULL DEFAULT '',",
  '  used INTEGER NOT NULL DEFAULT 0,',
  '  used_at INTEGER,',
  '  device TEXT,',
  '  expire_at INTEGER',
  ');',
  '',
  'INSERT OR IGNORE INTO codes (code, test) VALUES',
  `${codes.map((code) => `  ('${code}', '${scope}')`).join(',\n')};`,
  '',
].join('\n');
writeFileSync(join(VAULT, 'codes.sql'), sql);

console.log(`生成 ${count} 个卡密${scope ? `（仅 ${scope} 可用）` : ''}`);
console.log('  codes.json      放项目里，只有哈希，可以公开部署');
console.log(`  ${VAULT}/`);
console.log('    codes-明文.csv   发货用，卖一个划一个，别公开');
console.log('    codes.sql        导入 Cloudflare D1 用（上了 Worker 才需要）');
console.log(`\n前三个：${codes.slice(0, 3).join('  ')}`);
