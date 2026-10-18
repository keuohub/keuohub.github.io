import { PLATFORMS, loadAll, platformLabel, themeOf } from './quiz.js';

const params = new URLSearchParams(location.search);
let active = params.get('p') || 'xhs';
let tests = [];

const listEl = document.getElementById('list');
const chipsEl = document.getElementById('platforms');

document.body.dataset.theme = themeOf(active);

chipsEl.innerHTML = PLATFORMS.map(
  (p) =>
    `<button class="chip" type="button" data-key="${p.key}" aria-pressed="${p.key === active}">${p.label}</button>`,
).join('');

chipsEl.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  active = chip.dataset.key;
  document.body.dataset.theme = themeOf(active);
  chipsEl.querySelectorAll('.chip').forEach((el) => {
    el.setAttribute('aria-pressed', String(el.dataset.key === active));
  });
  render();
});

function render() {
  const visible = tests.filter((t) => t.platforms.includes(active));
  listEl.innerHTML = visible
    .map(
      (t) => `<a class="card" href="./test.html?t=${t.id}&p=${active}">
        <h2 class="title">${t.title}</h2>
        <p class="muted">${t.subtitle}</p>
        <div class="card-meta">
          <span>${t.questions.length} 题</span>
          <span>约 ${t.estimatedMinutes} 分钟</span>
          ${t.platforms.map((p) => `<span>${platformLabel(p)}</span>`).join('')}
        </div>
      </a>`,
    )
    .join('');

  if (!visible.length) {
    listEl.innerHTML = '<p class="muted">这个平台还没有适配的测试。</p>';
  }
}

loadAll()
  .then((data) => {
    tests = data;
    render();
  })
  .catch(() => {
    listEl.innerHTML = '<p class="muted">题库加载失败，请用 npm start 启动本地服务后访问。</p>';
  });
