/**
 * 穷举每套题的所有答题组合，检查四种结果是否都能被测到，以及分布是否均衡。
 * 内容侧改了题目或选项归属后跑一次，避免出现「某个人格测不出来」。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { scoreQuiz } from '../src/quiz.js';

const TESTS_DIR = fileURLToPath(new URL('../tests/', import.meta.url));
const KEYS = ['A', 'B', 'C', 'D'];
const index = JSON.parse(await readFile(join(TESTS_DIR, 'index.json'), 'utf8'));
let bad = 0;

for (const file of index.files) {
  const test = JSON.parse(await readFile(join(TESTS_DIR, file), 'utf8'));
  const dims = Object.keys(test.dimensions);
  const counts = Object.fromEntries(dims.map((dim) => [dim, 0]));
  const total = KEYS.length ** test.questions.length;

  for (let n = 0; n < total; n += 1) {
    const answers = {};
    for (let i = 0, rest = n; i < test.questions.length; i += 1) {
      answers[i] = KEYS[rest % KEYS.length];
      rest = Math.floor(rest / KEYS.length);
    }
    counts[scoreQuiz(test, answers).winner] += 1;
  }

  const lines = dims.map((dim) => {
    const rate = ((counts[dim] / total) * 100).toFixed(1);
    if (counts[dim] === 0) bad += 1;
    return `${test.results[dim].tag} ${rate}%`;
  });

  console.log(`${test.title}（${test.questions.length} 题，${total} 种组合）`);
  lines.forEach((line) => console.log(`  ${line}`));
}

if (bad) {
  console.error(`有 ${bad} 种结果测不出来，需要调整选项归属。`);
  process.exit(1);
}
console.log('四种结果全部可测到。');
