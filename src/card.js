/**
 * 结果分享图。所有颜色、字体、背景都从 CSS 变量读，主题文件改完这里自动跟着变。
 * 可读变量清单见 docs/GEMINI_INTERFACE.md。
 */

const SIZES = {
  xhs: [900, 1200],
  video: [900, 1600],
  douyin: [900, 1600],
  kuaishou: [900, 1600],
};

const FALLBACK_KICKERS = {
  'love-style': 'ROMANCE ARCHIVE // 恋爱隐秘档案',
  'quality-kernel': 'PSYCHOLOGY KERNEL // 精神内核标本',
  'hok-hero': 'HONOR OF KINGS // 命定本命英雄',
  'delta-operator': 'CLASSIFIED // TACTICAL OPERATOR',
  'valorant-agent': 'VALORANT PROTOCOL // 特工档案',
};

function tokens(test) {
  const css = getComputedStyle(document.body);
  const value = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const unquote = (raw) => String(raw).trim().replace(/^['"]|['"]$/g, '');
  const bg = value('--bg', '#f7f4f0');
  return {
    bg,
    card: value('--card', '#ffffff'),
    ink: value('--ink', '#2b2724'),
    soft: value('--ink-soft', '#7c726a'),
    accent: value('--accent', '#8c7a6b'),
    accentInk: value('--accent-ink', '#ffffff'),
    line: value('--card-line', 'rgba(42, 38, 34, 0.10)'),
    radius: parseInt(value('--radius', '20px'), 10) || 20,
    fontTitle: value('--font-title', '"PingFang SC", system-ui, sans-serif'),
    titleWeight: value('--title-weight', '600'),
    bgImage: value('--bg-image', 'none'),
    scrim: value('--bg-image-scrim', ''),
    kicker: unquote(value('--poster-kicker', '')) || FALLBACK_KICKERS[test?.id] || '',
    serial: unquote(value('--poster-serial', '')),
    watermark: unquote(value('--poster-watermark', '')),
    markerAlpha: parseFloat(value('--poster-marker-alpha', '')) || 0,
    dark: luminance(bg) < 0.5,
  };
}

function luminance(color) {
  const hex = String(color).replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return 1;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function rgba(color, alpha) {
  const hex = String(color).replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return color;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function isRgba(value) {
  return /^rgba?\(/i.test(String(value).trim());
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function backgroundSource(cssValue) {
  const match = /url\((['"]?)(.+?)\1\)/.exec(String(cssValue));
  return match ? match[2] : null;
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of String(text)) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function serialOf(value) {
  if (value) return value;
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

export async function buildCard(test, result, platform, secondary) {
  const t = tokens(test);
  const bold = platform === 'douyin' || platform === 'kuaishou';
  const [W, minH] = SIZES[platform] || SIZES.xhs;
  const pad = 72;
  const inner = W - pad * 2;
  const tagSize = bold ? 84 : 72;
  const quoteSize = 34;
  const bodySize = 33;
  const bodyLine = 54;
  const kickerTop = 104;
  const tagTop = 216;
  const font = (size, weight = 400) => `${weight} ${size}px ${t.fontTitle}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = font(tagSize, t.titleWeight);
  const tagLines = wrap(ctx, result.tag, inner);
  ctx.font = font(quoteSize, t.titleWeight);
  const quoteLines = wrap(ctx, result.quote, inner);
  ctx.font = font(26);
  const anchorLines = wrap(ctx, result.anchor, inner - 80);
  ctx.font = font(bodySize);
  const descLines = wrap(ctx, result.desc, inner - 80);

  const quoteTop = tagTop + tagLines.length * tagSize * 1.26 + 30;
  const bodyTop = quoteTop + quoteLines.length * (quoteSize * 1.55) + 50;
  const stubGap = 62;
  const contentHeight =
    76 + anchorLines.length * 40 + 26 + descLines.length * bodyLine + (secondary ? 48 : 0) + stubGap + 26;
  const H = Math.max(minH, bodyTop + contentHeight + 260);
  // 图高有下限（平台比例），内容不满时让卡片吃掉剩余空间，避免下方空一大块
  const bodyHeight = Math.max(contentHeight, H - bodyTop - 260);

  canvas.width = W;
  canvas.height = H;

  const source = backgroundSource(t.bgImage);
  const bgImage = source ? await loadImage(source) : null;
  if (bgImage) {
    const scale = Math.max(W / bgImage.width, H / bgImage.height);
    const dw = bgImage.width * scale;
    const dh = bgImage.height * scale;
    ctx.drawImage(bgImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = isRgba(t.scrim) ? t.scrim : rgba(t.bg, parseFloat(t.scrim) || 0.86);
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);
  }

  // 可选水印：超大低透明度字母，街头海报那种压字效果
  if (t.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = t.ink;
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.round(W * 0.4)}px ${t.fontTitle}`;
    ctx.fillText(t.watermark, W / 2, H * 0.66);
    ctx.restore();
  }

  if (t.kicker) {
    ctx.save();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = t.soft;
    ctx.globalAlpha = 0.85;
    ctx.font = font(22);
    ctx.textAlign = 'left';
    ctx.fillText(t.kicker, pad, kickerTop);
    ctx.textAlign = 'right';
    ctx.fillText(t.serial || `NO. ${serialOf('')}`, W - pad, kickerTop);
    ctx.restore();
    ctx.strokeStyle = isRgba(t.line) ? t.line : t.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, kickerTop + 26);
    ctx.lineTo(W - pad, kickerTop + 26);
    ctx.stroke();
  }

  ctx.fillStyle = t.ink;
  ctx.font = font(tagSize, t.titleWeight);
  let y = tagTop;
  for (const line of tagLines) {
    ctx.fillText(line, pad, y);
    y += tagSize * 1.26;
  }

  // 金句：先用强调色铺一层荧光笔底色，再压字，做出被划重点的感觉
  const markerAlpha = t.markerAlpha || (t.dark ? 0.35 : 0.22);
  ctx.font = font(quoteSize, t.titleWeight);
  let quoteY = quoteTop;
  for (const line of quoteLines) {
    const width = ctx.measureText(line).width;
    ctx.fillStyle = rgba(t.accent, markerAlpha);
    roundRect(ctx, pad - 4, quoteY - quoteSize * 0.78, width + 16, quoteSize * 1.02, 6);
    ctx.fill();
    quoteY += quoteSize * 1.55;
  }
  ctx.fillStyle = t.ink;
  quoteY = quoteTop;
  for (const line of quoteLines) {
    ctx.fillText(line, pad, quoteY);
    quoteY += quoteSize * 1.55;
  }

  ctx.fillStyle = t.card;
  roundRect(ctx, pad, bodyTop, inner, bodyHeight, t.radius + 8);
  ctx.fill();
  // 一层实线描边，让它像一张裁切利落的实体卡纸，而不是漂浮的弹窗
  ctx.strokeStyle = isRgba(t.line) ? t.line : rgba(t.ink, 0.18);
  ctx.lineWidth = 3;
  roundRect(ctx, pad, bodyTop, inner, bodyHeight, t.radius + 8);
  ctx.stroke();

  ctx.fillStyle = t.soft;
  ctx.font = font(26);
  let bodyY = bodyTop + 76;
  for (const line of anchorLines) {
    ctx.fillText(line, pad + 40, bodyY);
    bodyY += 40;
  }

  ctx.fillStyle = t.ink;
  ctx.font = font(bodySize);
  bodyY += 32;
  for (const line of descLines) {
    ctx.fillText(line, pad + 40, bodyY);
    bodyY += bodyLine;
  }

  if (secondary) {
    ctx.fillStyle = t.soft;
    ctx.font = font(24);
    ctx.fillText(`副标签：${secondary.tag}`, pad + 40, bodyY + 6);
    bodyY += 48;
  }

  // 撕票线：卡片内画一条虚线，两端开半圆缺口，做成小票撕边
  const stubY = Math.min(bodyY + 30, bodyTop + bodyHeight - 34);
  ctx.save();
  roundRect(ctx, pad, bodyTop, inner, bodyHeight, t.radius + 8);
  ctx.clip();
  ctx.fillStyle = t.bg;
  ctx.beginPath();
  ctx.arc(pad, stubY, 16, 0, Math.PI * 2);
  ctx.arc(W - pad, stubY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = rgba(t.soft, 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad + 24, stubY);
  ctx.lineTo(W - pad - 24, stubY);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = t.accent;
  roundRect(ctx, pad, H - 140, inner, 76, 38);
  ctx.fill();
  ctx.fillStyle = t.accentInk;
  ctx.font = font(30, 600);
  ctx.textAlign = 'center';
  ctx.fillText('长按图片保存，测测你是哪一种', W / 2, H - 90);
  ctx.textAlign = 'left';

  return canvas;
}

export async function saveCard(test, result, platform, secondary) {
  const canvas = await buildCard(test, result, platform, secondary);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${result.tag}-结果图.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}
