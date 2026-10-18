/**
 * 批量截图：把每套测试的封面页、结果页、分享图拍成手机尺寸的 PNG，用来肉眼验收视觉。
 *
 * 用法：
 *   npm run shots                      全部测试 × 全部平台
 *   npm run shots -- love-style        只拍一套
 *   npm run shots -- love-style xhs    只拍一套的一个平台
 *
 * 输出：shots/<测试编号>/<平台>-<封面|结果|分享图>.png（2 倍像素密度）
 * 依赖：本机装了 Google Chrome / Edge / Chromium，且 npm start 正在运行
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = join(ROOT, 'shots');
const PROFILE = '/tmp/quiz-shot-profile';
const PORT = 9333;
const PHONE = { width: 390, height: 844 };

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error('没找到 Chrome / Edge / Chromium，装一个再跑。');
  process.exit(1);
}

try {
  await fetch(`${BASE}/tests/index.json`);
} catch {
  console.error(`连不上 ${BASE}，先跑 npm start。`);
  process.exit(1);
}

class Cdp {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('连不上调试端口'));
    });
    const client = new Cdp(ws);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = client.pending.get(message.id);
      if (!pending) return;
      client.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
    return client;
  }

  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const profile = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let cdp;
try {
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        targets = list.find((t) => t.type === 'page') || null;
      }
    } catch {
      /* 端口还没起来，继续等 */
    }
  }
  if (!targets) throw new Error('Chrome 调试端口没起来');

  cdp = await Cdp.connect(targets.webSocketDebuggerUrl);
  await cdp.send('Page.enable');

  const [onlyTest, onlyPlatform] = process.argv.slice(2);
  const index = JSON.parse(await readFile(join(ROOT, 'tests', 'index.json'), 'utf8'));
  const tests = await Promise.all(
    index.files.map(async (file) => JSON.parse(await readFile(join(ROOT, 'tests', file), 'utf8'))),
  );

  async function shot(url, file, height) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: PHONE.width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send('Page.navigate', { url });
    await sleep(2200);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(file, Buffer.from(data, 'base64'));
  }

  await rm(OUT, { recursive: true, force: true });

  let count = 0;
  for (const test of tests) {
    if (onlyTest && test.id !== onlyTest) continue;
    const dir = join(OUT, test.id);
    await mkdir(dir, { recursive: true });
    const sample = Object.keys(test.results)[0];

    for (const platform of test.platforms) {
      if (onlyPlatform && platform !== onlyPlatform) continue;
      await shot(`${BASE}/test.html?t=${test.id}&p=${platform}`, join(dir, `${platform}-封面.png`), PHONE.height);
      await shot(
        `${BASE}/test.html?t=${test.id}&p=${platform}&peek=${sample}`,
        join(dir, `${platform}-结果.png`),
        PHONE.height,
      );
      await shot(
        `${BASE}/tools/poster-preview.html?t=${test.id}&p=${platform}`,
        join(dir, `${platform}-分享图.png`),
        1000,
      );
      count += 3;
      console.log(`${test.id} / ${platform}  ok`);
    }
  }

  console.log(`\n共 ${count} 张，存在 shots/。`);
} finally {
  profile.kill();
}
