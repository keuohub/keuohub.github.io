const BASE = './tests/';

export const PLATFORMS = [
  { key: 'xhs', label: '小红书' },
  { key: 'douyin', label: '抖音' },
  { key: 'kuaishou', label: '快手' },
  { key: 'video', label: '视频号' },
];

export const platformLabel = (key) =>
  PLATFORMS.find((p) => p.key === key)?.label || key;

export function themeOf(platform) {
  return platform === 'xhs' || platform === 'video' ? platform : 'douyin';
}

export async function loadAll() {
  const index = await fetchJson(BASE + 'index.json');
  const loaded = await Promise.allSettled(index.files.map((file) => fetchJson(BASE + file)));
  return loaded
    .map((item, i) => {
      if (item.status === 'fulfilled') return item.value;
      console.warn(`题库 ${index.files[i]} 加载失败：${item.reason?.message || item.reason}`);
      return null;
    })
    .filter(Boolean);
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`加载失败：${url}`);
  return res.json();
}

export function pickOption(option) {
  return Object.keys(option.scores || {})[0];
}

/**
 * 维度加权求和后取最高分。同分走题目兜底，接近时给出副标签。
 */
export function scoreQuiz(test, answers) {
  const scores = {};
  for (const key of Object.keys(test.dimensions)) scores[key] = 0;

  test.questions.forEach((question, i) => {
    const option = question.options.find((o) => o.key === answers[i]);
    if (!option) return;
    for (const [dim, value] of Object.entries(option.scores || {})) {
      scores[dim] = (scores[dim] || 0) + value;
    }
  });

  const ranked = Object.keys(scores).sort(
    (a, b) => scores[b] - scores[a] || test.dimensions[a].index - test.dimensions[b].index,
  );

  const top = scores[ranked[0]];
  const tied = ranked.filter((key) => scores[key] === top);
  const tieBreaker = test.scoring?.tieBreaker || {};
  let winner = ranked[0];
  let secondary = null;

  if (tied.length > 1) {
    const tbIndex = (tieBreaker.question || 1) - 1;
    const tbOption = test.questions[tbIndex]?.options.find((o) => o.key === answers[tbIndex]);
    const tbDim = tbOption ? pickOption(tbOption) : null;
    const fallback = (tieBreaker.fallbackOrder || ranked).find((key) => tied.includes(key));
    winner = tied.includes(tbDim) ? tbDim : fallback || tied[0];
  } else if (top - scores[ranked[1]] <= 1) {
    secondary = ranked[1];
  }

  return { winner, secondary, scores };
}
