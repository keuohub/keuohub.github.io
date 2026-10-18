/**
 * 生成对外上架链接清单：一套测试一条链接，链接里只带这一个测试。
 * 上线后把域名传进来重新生成即可：BASE_URL=https://你的域名 npm run links > docs/LINKS.md
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const TESTS_DIR = fileURLToPath(new URL('../tests/', import.meta.url));
const LABEL = { xhs: '小红书', douyin: '抖音', kuaishou: '快手', video: '视频号' };

const index = JSON.parse(await readFile(join(TESTS_DIR, 'index.json'), 'utf8'));
const tests = await Promise.all(
  index.files.map(async (file) => JSON.parse(await readFile(join(TESTS_DIR, file), 'utf8'))),
);

const lines = [
  '# 对外上架链接清单',
  '',
  '一套测试一条链接，链接里只带这一个测试，不会串到别的问卷。',
  '发到哪个平台就用对应平台的版本，页面配色和分享文案会自动切成那个平台的风格。',
  '',
  `当前域名：${BASE}`,
  '',
  '上线换域名后，在项目目录跑一次下面这行重新生成：',
  '',
  '```bash',
  'BASE_URL=https://你的域名 npm run links > docs/LINKS.md',
  '```',
  '',
];

for (const test of tests) {
  lines.push(`## ${test.title}`, '', `${test.questions.length} 题 · 约 ${test.estimatedMinutes} 分钟`, '');
  for (const platform of test.platforms) {
    lines.push(`- ${LABEL[platform]}：${BASE}/test.html?t=${test.id}&p=${platform}`);
  }
  lines.push('');
}

lines.push(
  '## 备注',
  '',
  '- 链接里的 `t` 是测试编号，`p` 是平台版本，两个都不要改，改错会打不开或串版本',
  '- 用户答完的结果页分享按钮，自动带上的就是这个专属链接',
  '- 想单独调某一套测试的题目或文案，只改 `tests/<编号>.json`，其它测试不受影响',
  '',
);

process.stdout.write(lines.join('\n'));
