import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = join(ROOT, 'shots', 'covers');
const PROFILE = '/tmp/quiz-shot-profile-film';
const PORT = 9335;

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));

if (!chrome) {
  console.error('No Chrome found');
  process.exit(1);
}

class Cdp {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('WebSocket connection error'));
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
  for (let i = 0; i < 40 && !targets; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        targets = list.find((t) => t.type === 'page') || null;
      }
    } catch {}
  }
  if (!targets) throw new Error('Chrome debug port failed');

  cdp = await Cdp.connect(targets.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 2400,
    deviceScaleFactor: 2,
    mobile: false,
  });

  await cdp.send('Page.navigate', { url: `${BASE}/tools/film-covers.html` });
  await sleep(2500);

  await mkdir(OUT, { recursive: true });

  const posters = ['poster1', 'poster2', 'poster3'];
  const names = ['poster-love-female.png', 'poster-love-couple.png', 'poster-kernel-male.png'];

  for (let i = 0; i < posters.length; i++) {
    const id = posters[i];
    const fileName = names[i];

    // 获取元素坐标
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: `#${id}`,
    });
    const { model } = await cdp.send('DOM.getBoxModel', { nodeId });
    // [x1, y1, x2, y2, x3, y3, x4, y4]
    const x = model.border[0];
    const y = model.border[1];
    const width = model.border[2] - model.border[0];
    const height = model.border[7] - model.border[1];

    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x,
        y,
        width,
        height,
        scale: 1,
      },
    });

    await writeFile(join(OUT, fileName), Buffer.from(data, 'base64'));
    console.log(`Saved ${fileName} (${width}x${height})`);
  }
} finally {
  profile.kill();
}
