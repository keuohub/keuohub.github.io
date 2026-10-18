/**
 * 主题自检：改完 themes/*.css 跑一次，看有没有写错变量名、漏平台、图片路径不存在这类问题。
 * 用法：npm run review
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const THEMES = join(ROOT, 'themes');
const PLATFORMS = ['xhs', 'douyin', 'kuaishou', 'video'];

/** 引擎已知的变量。写别的名字不算错，但很可能是拼错了 */
const KNOWN = new Set([
  '--bg', '--bg-glow', '--card', '--card-line', '--ink', '--ink-soft',
  '--accent', '--accent-ink', '--shadow', '--font-title', '--font-body',
  '--title-weight', '--tag-size', '--radius', '--pad',
  '--bg-image', '--bg-image-scrim',
  '--poster-kicker', '--poster-serial', '--poster-marker-alpha',
]);

const problems = [];
const notes = [];
const fail = (file, message) => problems.push(`${file}：${message}`);
const note = (file, message) => notes.push(`${file}：${message}`);

const index = JSON.parse(await readFile(join(ROOT, 'tests', 'index.json'), 'utf8'));
const tests = await Promise.all(
  index.files.map(async (file) => JSON.parse(await readFile(join(ROOT, 'tests', file), 'utf8'))),
);
const themeFiles = await readdir(THEMES);

for (const test of tests) {
  const file = `${test.id}.css`;
  if (!themeFiles.includes(file)) {
    fail(file, '缺少主题文件，会完全用默认皮肤');
    continue;
  }

  const css = await readFile(join(THEMES, file), 'utf8');

  if ((css.match(/{/g) || []).length !== (css.match(/}/g) || []).length) {
    fail(file, '花括号数量不匹配，CSS 有语法错误');
  }
  const comments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (comments.includes('data-platform')) {
    fail(file, '出现了 data-platform 属性，正确写法是 data-theme');
  }

  for (const platform of test.platforms) {
    if (!new RegExp(`data-theme=['"]${platform}['"]`).test(css)) {
      fail(file, `没有写 ${platform} 平台段落`);
    }
  }

  for (const match of css.matchAll(/(^|[^-\w])(--[a-z0-9-]+)\s*:/gi)) {
    const name = match[2];
    if (!KNOWN.has(name) && !name.startsWith('--poster-')) note(file, `自定义变量 ${name}（确认不是拼写错误）`);
  }

  for (const match of css.matchAll(/url\((['"]?)(.+?)\1\)/g)) {
    const target = match[2];
    if (/^data:|^https?:/.test(target)) continue;
    if (!target.startsWith('/')) {
      fail(file, `图片路径 ${target} 必须以 / 开头`);
      continue;
    }
    if (!existsSync(join(ROOT, target.slice(1)))) {
      fail(file, `图片不存在：${target}`);
    }
  }

  if (!/--accent-ink\s*:/.test(css)) {
    note(file, '没有配 --accent-ink，深色主题下按钮文字可能看不清');
  }
}

for (const file of themeFiles.filter((f) => f.endsWith('.css') && !f.startsWith('_'))) {
  if (!tests.some((t) => `${t.id}.css` === file)) note(file, '没有对应的测试编号，不会被加载');
}

if (notes.length) {
  console.log('提示：');
  notes.forEach((n) => console.log(` - ${n}`));
  console.log('');
}

if (problems.length) {
  console.error(`自检未通过，共 ${problems.length} 处：`);
  problems.forEach((p) => console.error(` - ${p}`));
  process.exit(1);
}
console.log('主题自检通过。');
