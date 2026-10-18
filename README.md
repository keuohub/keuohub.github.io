# 爆款测试 H5

多平台性格 / 游戏角色测试。纯前端，无依赖，答题进度存本地。

## 跑起来

```bash
npm start
```

浏览器打开 `http://localhost:5173`，选平台 → 选测试 → 答题 → 结果页可保存结果图或直接分享。

注意：首页 `index.html` 只是内部预览台，不要对外发。对外上架用单条链接：

```
http://localhost:5173/test.html?t=hok-hero&p=xhs
```

一条链接只装一套测试，完整清单见 `docs/LINKS.md`。

手机上看效果：电脑和手机连同一个 Wi-Fi，用 `http://<电脑 IP>:5173` 访问。

## 目录

```
index.html          首页（按平台筛选测试）
test.html           答题页 + 结果页
src/quiz.js         题库加载、计分、主题映射
src/config.js       付费开关、价格、收款配置（改收费策略只改这里）
src/paywall.js      付费墙状态与卡密校验
src/home.js         首页逻辑
src/test.js         答题流程、结果页、分享
src/card.js         结果分享图（canvas 生成）
src/styles.css      三套平台主题令牌（换肤入口）
themes/*.css        每套测试的专属主题（按平台分段，改这里就换肤）
assets/themes/      主题背景图（Gemini 出图放这里）
tools/poster-preview.html  一次看完某套测试的四种结果分享图
tests/*.json        题库，一个测试一个文件
tests/index.json    题库登记表
docs/TEST_SPEC.md   题库数据结构规范
docs/GEMINI_BRIEF.md  给 Gemini 的项目简报（背景、任务、发挥空间、路径）
docs/PAYMENT.md      收款方案、卡密怎么生成怎么发
docs/CONTENT_NOTES.md 题库选项归属与选题稿的差异记录
docs/LINKS.md       对外上架链接清单
scripts/validate.mjs  题库结构校验
scripts/report-distribution.mjs  结果分布体检
scripts/links.mjs   生成对外上架链接清单
```

## 已就位的 5 套测试

| 测试 | 题量 | 适配平台 |
| --- | --- | --- |
| 测测你的精神内核是什么质感 | 10 | 全平台 |
| 三角洲行动：测测你是哪种显眼包干员 | 5 | 抖音、快手 |
| 测测你的性格对应王者荣耀哪位英雄 | 8 | 全平台 |
| 测测你是无畏契约里的哪位特工人格 | 8 | 小红书、抖音、快手 |
| 测测你的恋爱隐藏属性 | 10 | 全平台 |

## 加一套新测试

1. 按 `docs/TEST_SPEC.md` 写 `tests/<id>.json`
2. 把文件名加进 `tests/index.json` 的 `files`
3. `npm run check` 过一遍，`npm test` 跑计分回归，`npm run dist` 看结果分布

不用改任何代码。

## 命令

| 命令 | 作用 |
| --- | --- |
| npm start | 本地预览 |
| npm run check | 题库结构校验 |
| npm test | 计分逻辑回归测试 |
| npm run dist | 穷举所有答题组合，检查四种结果是否都能测到 |
| npm run links | 生成对外上架链接清单（换域名后重跑一次） |
| npm run codes | 批量生成卡密（明文发你自己，哈希进项目） |

## 部署

纯前端，没有后端，任何静态托管都能直接放。上线后把域名填进去重新生成链接清单：

```bash
BASE_URL=https://你的域名 npm run links > docs/LINKS.md
```
