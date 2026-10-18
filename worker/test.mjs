import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/index.js';

/** 把 D1 的 prepare/bind/first/run 换成内存实现，逻辑跟真实 SQL 对齐 */
function makeEnv(rows = []) {
  const store = new Map(rows.map((row) => [row.code, { used: 0, test: '', ...row }]));

  const prepare = (sql) => {
    const statement = {
      args: [],
      bind(...args) {
        statement.args = args;
        return statement;
      },
      async first() {
        if (/SELECT code, test, used, expire_at FROM codes WHERE code/.test(sql)) {
          return store.get(String(statement.args[0]).toUpperCase()) || null;
        }
        if (/WHERE used = 1/.test(sql)) {
          return { n: [...store.values()].filter((row) => row.used).length };
        }
        if (/COUNT\(\*\)/.test(sql)) return { n: store.size };
        return null;
      },
      async run() {
        if (/UPDATE codes SET used = 1/.test(sql)) {
          const [usedAt, device, code] = statement.args;
          const row = store.get(String(code).toUpperCase());
          if (row && !row.used) {
            row.used = 1;
            row.used_at = usedAt;
            row.device = device;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  };

  return { store, ADMIN_SECRET: 'test-secret', DB: { prepare } };
}

const post = (env, body) =>
  worker
    .fetch(new Request('https://worker.test/verify', { method: 'POST', body: JSON.stringify(body) }), env)
    .then((res) => res.json());

test('不存在的码被拒', async () => {
  const data = await post(makeEnv(), { code: 'NOPE-NOPE-NOPE' });
  assert.equal(data.ok, false);
  assert.match(data.reason, /无效/);
});

test('有效码核销成功后立刻失效', async () => {
  const env = makeEnv([{ code: 'GOOD-TEST-CODE' }]);

  const first = await post(env, { code: 'good-test-code' });
  assert.equal(first.ok, true);

  const second = await post(env, { code: 'GOOD-TEST-CODE' });
  assert.equal(second.ok, false);
  assert.match(second.reason, /用过/);
});

test('同一个码被并发提交只放行一次', async () => {
  const env = makeEnv([{ code: 'RACE-RACE-RACE' }]);
  const results = await Promise.all([
    post(env, { code: 'RACE-RACE-RACE' }),
    post(env, { code: 'RACE-RACE-RACE' }),
    post(env, { code: 'RACE-RACE-RACE' }),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1);
});

test('绑定测试的码不能拿去测别的', async () => {
  const env = makeEnv([{ code: 'ONLY-LOVE-XXX', test: 'love-style' }]);

  const wrong = await post(env, { code: 'ONLY-LOVE-XXX', test: 'hok-hero' });
  assert.equal(wrong.ok, false);

  const right = await post(env, { code: 'ONLY-LOVE-XXX', test: 'love-style' });
  assert.equal(right.ok, true);
});

test('过期的码被拒', async () => {
  const env = makeEnv([{ code: 'OLD-CODE-XXXX', expire_at: Date.now() - 1000 }]);
  const data = await post(env, { code: 'OLD-CODE-XXXX' });
  assert.equal(data.ok, false);
  assert.match(data.reason, /过期/);
});

test('统计要口令，且数字对得上', async () => {
  const env = makeEnv([
    { code: 'A-AAA-AAAA', used: 1 },
    { code: 'B-BBB-BBBB' },
  ]);

  const denied = await worker
    .fetch(new Request('https://worker.test/admin/stats'), env)
    .then((res) => res.json());
  assert.equal(denied.ok, false);

  const data = await worker
    .fetch(new Request('https://worker.test/admin/stats?secret=test-secret'), env)
    .then((res) => res.json());
  assert.deepEqual(
    { total: data.total, used: data.used, remaining: data.remaining },
    { total: 2, used: 1, remaining: 1 },
  );
});
