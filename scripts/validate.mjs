import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const TESTS_DIR = fileURLToPath(new URL('../tests/', import.meta.url));
const PLATFORMS = ['xhs', 'douyin', 'kuaishou', 'video'];
const KEYS = ['A', 'B', 'C', 'D'];

const problems = [];
const fail = (file, message) => problems.push(`${file}：${message}`);
const read = async (name) => JSON.parse(await readFile(join(TESTS_DIR, name), 'utf8'));

function checkTest(file, test) {
  for (const field of ['id', 'title', 'subtitle', 'intro', 'platforms', 'estimatedMinutes', 'tags']) {
    if (!test[field]) fail(file, `缺少字段 ${field}`);
  }
  if (test.id && `${test.id}.json` !== file) fail(file, `id (${test.id}) 与文件名不一致`);

  const dims = Object.keys(test.dimensions || {});
  if (!dims.length) fail(file, '缺少 dimensions');

  for (const platform of test.platforms || []) {
    if (!PLATFORMS.includes(platform)) fail(file, `未知平台 ${platform}`);
  }

  const map = test.scoring?.optionMap || {};
  for (const key of KEYS) {
    if (!map[key]) fail(file, `optionMap 缺少 ${key}`);
  }

  const tie = test.scoring?.tieBreaker;
  if (!tie) {
    fail(file, '缺少 tieBreaker');
  } else {
    const total = (test.questions || []).length;
    if (!(tie.question >= 1 && tie.question <= total)) fail(file, 'tieBreaker.question 超出题目范围');
    for (const dim of dims) {
      if (!(tie.fallbackOrder || []).includes(dim)) fail(file, `fallbackOrder 漏了维度 ${dim}`);
    }
  }

  const questions = test.questions || [];
  questions.forEach((q, i) => {
    const at = `第 ${i + 1} 题`;
    if (!q.text) fail(file, `${at} 缺少题干`);
    const options = q.options || [];
    if (options.length !== 4) fail(file, `${at} 选项数为 ${options.length}，应为 4`);
    options.forEach((o, j) => {
      if (o.key !== KEYS[j]) fail(file, `${at} 第 ${j + 1} 个选项 key 应为 ${KEYS[j]}`);
      if (!o.text) fail(file, `${at} 选项 ${o.key} 缺少文本`);
      const scored = Object.keys(o.scores || {});
      if (!scored.length) fail(file, `${at} 选项 ${o.key} 没有 scores`);
      for (const dim of scored) {
        if (!dims.includes(dim)) fail(file, `${at} 选项 ${o.key} 的维度 ${dim} 未定义`);
      }
    });
  });

  const asked = new Set(questions.map((q) => q.text));
  if (asked.size !== questions.length) fail(file, '存在重复题干');

  const resultKeys = Object.keys(test.results || {});
  for (const dim of dims) {
    if (!resultKeys.includes(dim)) fail(file, `结果缺少维度 ${dim}`);
  }
  for (const key of resultKeys) {
    if (!dims.includes(key)) fail(file, `结果 ${key} 没有对应维度`);
    const r = test.results[key];
    for (const field of ['tag', 'quote', 'anchor', 'desc', 'share']) {
      if (!r[field]) fail(file, `结果 ${key} 缺少 ${field}`);
    }
    // 分享话术必须指向自己，且不能串到别人的标签上（复制粘贴最容易在这里出错）
    const stem = (value) => String(value).split('・')[0].slice(0, 2);
    const others = resultKeys
      .filter((other) => other !== key)
      .map((other) => stem(test.results[other].tag))
      .filter(Boolean);
    for (const platform of PLATFORMS) {
      if (!r.share?.[platform]) fail(file, `结果 ${key} 缺少 ${platform} 分享话术`);
      const text = r.share?.[platform] || '';
      if (r.tag && !text.includes(stem(r.tag))) {
        fail(file, `结果 ${key} 的 ${platform} 分享话术没有提到自己的标签`);
      }
      for (const other of others) {
        if (other && text.includes(other)) fail(file, `结果 ${key} 的 ${platform} 分享话术提到了「${other}」`);
      }
    }
    if (r.tag && r.tag.length > 12) fail(file, `结果 ${key} 的 tag 偏长（${r.tag.length} 字）`);
    if (r.desc && (r.desc.length < 40 || r.desc.length > 160)) {
      fail(file, `结果 ${key} 的 desc 长度 ${r.desc.length} 字，建议 40-160`);
    }
  }
}

const index = await read('index.json');
const files = await readdir(TESTS_DIR);

for (const file of index.files) {
  if (!files.includes(file)) {
    fail('index.json', `登记的文件 ${file} 不存在`);
    continue;
  }
  try {
    checkTest(file, await read(file));
  } catch (error) {
    fail(file, `解析失败：${error.message}`);
  }
}

for (const file of files.filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  if (!index.files.includes(file)) fail('index.json', `${file} 未登记`);
}

if (problems.length) {
  console.error(`校验未通过，共 ${problems.length} 处：`);
  problems.forEach((p) => console.error(` - ${p}`));
  process.exit(1);
}
console.log(`校验通过，共 ${index.files.length} 套题库。`);
