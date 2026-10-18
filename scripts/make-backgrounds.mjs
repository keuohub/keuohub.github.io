/**
 * 生成主题背景图。零依赖，直接写 PNG。
 *
 * 原则：只做物理肌理，不做彩色弥散光斑。
 * 彩色模糊光团是最典型的 AI 模板相，一律不用。这里的层全是硬的、有秩序的：
 * 纸张纤维、胶片颗粒、信纸横线、坐标网格、扫描线、菱形暗纹、十字准星、45° 斜切色块。
 *
 * 用法：npm run assets
 * 输出：assets/themes/<测试编号>/<平台>.png
 * 改配方就改下面 PREPARATIONS，改完重跑。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const hex = (value) => {
  const n = parseInt(String(value).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

const hash = (x, y, seed) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

const mix = (channel, target, alpha) => channel * (1 - alpha) + target * alpha;

function buildPainter(spec, W, H) {
  const base = hex(spec.base);
  const layers = (spec.layers || []).map((layer) => ({
    ...layer,
    rgb: layer.color ? hex(layer.color) : null,
  }));
  const cx = W / 2;
  const cy = H / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  return (x, y) => {
    let r = base[0];
    let g = base[1];
    let b = base[2];

    for (const layer of layers) {
      const a = layer.alpha ?? 0.05;
      switch (layer.type) {
        // 细密颗粒，块越小越像胶片/纸张
        case 'noise': {
          // 块至少 4px：更小的块会让 PNG 几乎无法压缩，体积翻几倍，肉眼却看不出差别
          const block = Math.max(4, layer.size || 4);
          const n = (hash(Math.floor(x / block), Math.floor(y / block), layer.seed || 3) - 0.5) * 2;
          const v = n * (layer.amount ?? 4);
          r += v;
          g += v;
          b += v;
          break;
        }
        // 纸张纤维：纵向主导的平滑起伏
        case 'fiber': {
          const n =
            Math.sin(x * 0.11 + Math.sin(y * 0.006) * 2.2) * 0.6 +
            Math.sin(y * 0.07 + Math.sin(x * 0.004) * 1.6) * 0.4;
          const v = n * (layer.amount ?? 3);
          r += v;
          g += v;
          b += v * 0.9;
          break;
        }
        // 信纸横线
        case 'lines': {
          const d = (y + (layer.offset || 0)) % layer.spacing;
          if (d < (layer.width || 1)) {
            r = mix(r, layer.rgb[0], a);
            g = mix(g, layer.rgb[1], a);
            b = mix(b, layer.rgb[2], a);
          }
          break;
        }
        // 坐标网格
        case 'grid': {
          const w = layer.width || 1;
          if (x % layer.spacing < w || y % layer.spacing < w) {
            r = mix(r, layer.rgb[0], a);
            g = mix(g, layer.rgb[1], a);
            b = mix(b, layer.rgb[2], a);
          }
          break;
        }
        // 水平扫描线
        case 'scanlines': {
          const d = y % layer.spacing;
          const k = 1 - a * (d < (layer.width || 1) ? 1 : 0);
          r *= k;
          g *= k;
          b *= k;
          break;
        }
        // 45° 菱形暗纹
        case 'diamonds': {
          const w = layer.width || 1;
          const spacing = layer.spacing;
          const p = (x + y) % spacing;
          const q = (((x - y) % spacing) + spacing) % spacing;
          if (p < w || q < w) {
            r = mix(r, layer.rgb[0], a);
            g = mix(g, layer.rgb[1], a);
            b = mix(b, layer.rgb[2], a);
          }
          break;
        }
        // 战术十字准星阵列
        case 'crosshair': {
          const spacing = layer.spacing;
          const armX = Math.floor(x / spacing) * spacing + spacing / 2;
          const armY = Math.floor(y / spacing) * spacing + spacing / 2;
          const dx = Math.abs(x - armX);
          const dy = Math.abs(y - armY);
          const len = layer.length || 7;
          const w = layer.width || 1;
          if ((dx < w && dy < len) || (dy < w && dx < len)) {
            r = mix(r, layer.rgb[0], a);
            g = mix(g, layer.rgb[1], a);
            b = mix(b, layer.rgb[2], a);
          }
          break;
        }
        // 45° 硬边斜切色块
        case 'bands': {
          const t = (x + y) * 0.7071;
          const pos = ((t % layer.gap) + layer.gap) % layer.gap;
          if (pos < layer.width) {
            r = mix(r, layer.rgb[0], a);
            g = mix(g, layer.rgb[1], a);
            b = mix(b, layer.rgb[2], a);
          }
          break;
        }
        // 金色星尘：稀疏亮点
        case 'dust': {
          const n = hash(Math.floor(x / 3), Math.floor(y / 3), layer.seed || 9);
          if (n > 1 - (layer.density ?? 0.0008)) {
            r = mix(r, layer.rgb[0], layer.alpha ?? 0.5);
            g = mix(g, layer.rgb[1], layer.alpha ?? 0.5);
            b = mix(b, layer.rgb[2], layer.alpha ?? 0.5);
          }
          break;
        }
        // 暗角
        case 'vignette': {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) / maxDist;
          const k = 1 - d * d * a * 3;
          r *= k;
          g *= k;
          b *= k;
          break;
        }
        default:
          break;
      }
    }

    return [clamp(r), clamp(g), clamp(b)];
  };
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/**
 * 逐行挑最优 PNG filter。噪点图不做过滤的话体积会翻好几倍。
 * 0=None 1=Sub 2=Up 4=Paeth，按有符号字节绝对值和取最小值。
 */
function encodePNG(width, height, painter) {
  const bpp = 3;
  const stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) {
      const [r, g, b] = painter(x, y);
      row[x * 3] = r;
      row[x * 3 + 1] = g;
      row[x * 3 + 2] = b;
    }

    let bestType = 0;
    let bestScore = Infinity;
    let bestBuffer = row;

    for (const type of [0, 1, 2, 4]) {
      const candidate = Buffer.alloc(stride);
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let value;
        if (type === 0) value = row[i];
        else if (type === 1) value = row[i] - a;
        else if (type === 2) value = row[i] - b;
        else value = row[i] - paeth(a, b, c);
        candidate[i] = value & 0xff;
        score += Math.abs(value > 127 ? value - 256 : value);
      }
      if (score < bestScore) {
        bestScore = score;
        bestType = type;
        bestBuffer = candidate;
      }
    }

    const rowStart = y * (stride + 1);
    raw[rowStart] = bestType;
    bestBuffer.copy(raw, rowStart + 1);
    prev = row;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const WIDE = [900, 1200];
const TALL = [900, 1600];

/** 纸本印刷系：纤维 + 细颗粒，需要更实的质感时加信纸横线 */
const paper = (base, { line = 0, seed = 5 } = {}) => ({
  base,
  layers: [
    { type: 'fiber', amount: 3.2 },
    { type: 'noise', amount: 3.4, size: 2, seed },
    ...(line
      ? [{ type: 'lines', spacing: line, width: 1, color: '#000000', alpha: 0.028 }]
      : []),
    { type: 'vignette', alpha: 0.05 },
  ],
});

/** 战术终端：坐标网格 + 扫描线，冷硬 */
const terminal = (base, { grid = 0, cross = 0, scan = 0, accent = '#00E676' }) => ({
  base,
  layers: [
    ...(grid
      ? [{ type: 'grid', spacing: grid, width: 1, color: accent, alpha: 0.05 }]
      : []),
    ...(cross
      ? [{ type: 'crosshair', spacing: cross, length: 7, width: 1, color: accent, alpha: 0.13 }]
      : []),
    ...(scan
      ? [{ type: 'scanlines', spacing: 4, width: 2, alpha: 0.06 }]
      : []),
    { type: 'noise', amount: 5, size: 2, seed: 17 },
    { type: 'vignette', alpha: 0.16 },
  ],
});

const PREPARATIONS = [
  // 恋爱隐藏属性：字典纸 / 备忘录黑底 / 小票纸 / 宣纸
  { test: 'love-style', platform: 'xhs', size: WIDE, spec: paper('#F4F1EA', { line: 30, seed: 3 }) },
  {
    test: 'love-style',
    platform: 'douyin',
    size: TALL,
    spec: {
      base: '#0A0A0A',
      layers: [
        { type: 'noise', amount: 6, size: 2, seed: 11 },
        { type: 'scanlines', spacing: 6, width: 1, alpha: 0.05 },
        { type: 'vignette', alpha: 0.22 },
      ],
    },
  },
  { test: 'love-style', platform: 'kuaishou', size: TALL, spec: paper('#EFECE6', { line: 26, seed: 7 }) },
  { test: 'love-style', platform: 'video', size: TALL, spec: paper('#EDE7DC', { line: 40, seed: 13 }) },

  // 精神内核：牛皮纸档案 / 底片网格 / 检验单 / 借阅卡
  { test: 'quality-kernel', platform: 'xhs', size: WIDE, spec: paper('#EAE6DF', { seed: 19 }) },
  {
    test: 'quality-kernel',
    platform: 'douyin',
    size: TALL,
    spec: {
      base: '#0B0E14',
      layers: [
        { type: 'grid', spacing: 48, width: 1, color: '#3B82F6', alpha: 0.06 },
        { type: 'noise', amount: 5, size: 2, seed: 23 },
        { type: 'vignette', alpha: 0.18 },
      ],
    },
  },
  {
    test: 'quality-kernel',
    platform: 'kuaishou',
    size: TALL,
    spec: {
      base: '#E8ECEF',
      layers: [
        { type: 'grid', spacing: 54, width: 1, color: '#000000', alpha: 0.035 },
        { type: 'fiber', amount: 2.4 },
        { type: 'noise', amount: 3, size: 2, seed: 29 },
      ],
    },
  },
  { test: 'quality-kernel', platform: 'video', size: TALL, spec: paper('#E6E2D8', { seed: 31 }) },

  // 王者荣耀：宣纸菱形暗纹 / 黑金菱纹 + 星尘 / 暗红菱纹 / 水墨宣纸
  {
    test: 'hok-hero',
    platform: 'xhs',
    size: WIDE,
    spec: {
      base: '#F2ECE1',
      layers: [
        { type: 'diamonds', spacing: 44, width: 1, color: '#B8862D', alpha: 0.10 },
        { type: 'fiber', amount: 2.6 },
        { type: 'noise', amount: 3, size: 2, seed: 37 },
        { type: 'vignette', alpha: 0.06 },
      ],
    },
  },
  {
    test: 'hok-hero',
    platform: 'douyin',
    size: TALL,
    spec: {
      base: '#0B0F19',
      layers: [
        { type: 'diamonds', spacing: 52, width: 1, color: '#E5B869', alpha: 0.09 },
        { type: 'dust', density: 0.0006, color: '#E5B869', alpha: 0.55, seed: 41 },
        { type: 'noise', amount: 4, size: 2, seed: 43 },
        { type: 'vignette', alpha: 0.26 },
      ],
    },
  },
  {
    test: 'hok-hero',
    platform: 'kuaishou',
    size: TALL,
    spec: {
      base: '#140D0B',
      layers: [
        { type: 'diamonds', spacing: 46, width: 1, color: '#FF8C38', alpha: 0.10 },
        { type: 'noise', amount: 5, size: 2, seed: 47 },
        { type: 'vignette', alpha: 0.24 },
      ],
    },
  },
  {
    test: 'hok-hero',
    platform: 'video',
    size: TALL,
    spec: {
      base: '#EAE4D7',
      layers: [
        { type: 'diamonds', spacing: 48, width: 1, color: '#594E42', alpha: 0.07 },
        { type: 'fiber', amount: 3 },
        { type: 'noise', amount: 3, size: 2, seed: 53 },
      ],
    },
  },

  // 三角洲：牛皮档案袋 / 战术终端十字阵列 / 琥珀终端 / 胶片
  {
    test: 'delta-operator',
    platform: 'xhs',
    size: WIDE,
    spec: {
      base: '#E2DFD7',
      layers: [
        { type: 'grid', spacing: 40, width: 1, color: '#2B2A27', alpha: 0.045 },
        { type: 'fiber', amount: 2.6 },
        { type: 'noise', amount: 3.4, size: 2, seed: 59 },
      ],
    },
  },
  {
    test: 'delta-operator',
    platform: 'douyin',
    size: TALL,
    spec: terminal('#090D0B', { cross: 60, scan: 4, accent: '#00E676' }),
  },
  {
    test: 'delta-operator',
    platform: 'kuaishou',
    size: TALL,
    spec: terminal('#11100E', { cross: 64, scan: 4, accent: '#FFB300' }),
  },
  {
    test: 'delta-operator',
    platform: 'video',
    size: TALL,
    spec: {
      base: '#161A18',
      layers: [
        { type: 'grid', spacing: 36, width: 1, color: '#D4A359', alpha: 0.05 },
        { type: 'noise', amount: 5, size: 2, seed: 61 },
        { type: 'vignette', alpha: 0.2 },
      ],
    },
  },

  // 无畏契约：45° 硬边斜切色块，官方三色
  {
    test: 'valorant-agent',
    platform: 'xhs',
    size: WIDE,
    spec: {
      base: '#ECE8E1',
      layers: [
        { type: 'bands', gap: 620, width: 150, color: '#FF4655', alpha: 0.10 },
        { type: 'bands', gap: 940, width: 60, color: '#0F1923', alpha: 0.05 },
        { type: 'noise', amount: 3, size: 2, seed: 67 },
      ],
    },
  },
  {
    test: 'valorant-agent',
    platform: 'douyin',
    size: TALL,
    spec: {
      base: '#0F1923',
      layers: [
        { type: 'bands', gap: 640, width: 170, color: '#FF4655', alpha: 0.16 },
        { type: 'bands', gap: 1020, width: 70, color: '#ECE8E1', alpha: 0.05 },
        { type: 'noise', amount: 4, size: 2, seed: 71 },
        { type: 'vignette', alpha: 0.18 },
      ],
    },
  },
  {
    test: 'valorant-agent',
    platform: 'kuaishou',
    size: TALL,
    spec: {
      base: '#E5E0D8',
      layers: [
        { type: 'bands', gap: 560, width: 190, color: '#FF4655', alpha: 0.14 },
        { type: 'bands', gap: 880, width: 64, color: '#0F1923', alpha: 0.06 },
        { type: 'noise', amount: 3.4, size: 2, seed: 73 },
      ],
    },
  },
  {
    test: 'valorant-agent',
    platform: 'video',
    size: TALL,
    spec: {
      base: '#E8E5DF',
      layers: [
        { type: 'bands', gap: 700, width: 120, color: '#D93846', alpha: 0.08 },
        { type: 'bands', gap: 1100, width: 50, color: '#0F1923', alpha: 0.04 },
        { type: 'noise', amount: 3, size: 2, seed: 79 },
      ],
    },
  },
];

for (const job of PREPARATIONS) {
  const [width, height] = job.size;
  const file = join(ROOT, 'assets', 'themes', job.test, `${job.platform}.png`);
  mkdirSync(dirname(file), { recursive: true });
  const painter = buildPainter(job.spec, width, height);
  writeFileSync(file, encodePNG(width, height, painter));
  const kb = (statSync(file).size / 1024).toFixed(0);
  console.log(`${job.test}/${job.platform}.png  ${width}×${height}  ${kb} KB`);
}
