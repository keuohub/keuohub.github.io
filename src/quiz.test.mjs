import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scoreQuiz } from './quiz.js';

const quiz = JSON.parse(
  await readFile(new URL('../tests/quality-kernel.json', import.meta.url), 'utf8'),
);

const answers = (keys) => keys.reduce((acc, key, i) => ({ ...acc, [i]: key }), {});

test('全部选 A 命中月白', () => {
  const { winner, secondary } = scoreQuiz(quiz, answers(Array(10).fill('A')));
  assert.equal(winner, 'moon');
  assert.equal(secondary, null);
});

test('并列时按第一题选项判定', () => {
  const pickA = ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B'];
  const pickB = ['B', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'A'];
  assert.equal(scoreQuiz(quiz, answers(pickA)).winner, 'moon');
  assert.equal(scoreQuiz(quiz, answers(pickB)).winner, 'wild');
});

test('第一名只领先一分时给出副标签', () => {
  const keys = ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'C'];
  const { winner, secondary } = scoreQuiz(quiz, answers(keys));
  assert.equal(winner, 'moon');
  assert.equal(secondary, 'wild');
});

test('答案缺失时仍能算出结果', () => {
  const { winner } = scoreQuiz(quiz, answers(['A', 'A']));
  assert.equal(winner, 'moon');
});
