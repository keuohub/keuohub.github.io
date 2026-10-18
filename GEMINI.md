# Gemini 从这里开始

项目路径就是当前这个文件夹。

开工前读两份文档：

- [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md)：项目现在做到哪了、还差什么、别踩的坑
- [docs/GEMINI_BRIEF.md](./docs/GEMINI_BRIEF.md)：这门生意是什么、用户怎么用、你的空间有多大

## 你的地盘

`themes/*.css`、`assets/**`，以及付费弹窗和结果页的视觉。字体、配色、间距、圆角、装饰、动效、局部布局，全部你定，没有审美红线。

主题文件优先级最高，任何 CSS 样式都能在里面覆盖，不用改引擎文件。

引擎逻辑（`src/` 里的 js）、题库数据（`tests/`）、核销服务（`worker/`）归另一方管。你要动这些先提出来。

## 不要停下来问确认

改视觉的事（配色、字体、间距、圆角、装饰、动效、背景图、弹窗样式）**直接动手，做完自己验，不用等回复**。只有在要动引擎逻辑、题库数据、核销服务这三块之前，才需要先提出来说一声。

遇到模棱两可的地方，选你判断更好看的那条路走，别停在原地等指示。

## 改完必须跑

```bash
npm test         引擎和核销的回归测试，改坏了会报出来
npm run review   主题自检：变量名写错、漏平台、图片路径不存在都会报出来
npm run shots    批量截图，存到 shots/，自己看一遍成品
```

`npm run review` 不通过就改到通过，不用问谁。`shots/` 出来的图就是用户实际看到的样子，**自己看一遍再收工**。

预览入口：

- 单套测试：`http://localhost:5173/test.html?t=<测试编号>&p=<平台>`
- 分享图批量预览：`http://localhost:5173/tools/poster-preview.html?t=<测试编号>&p=<平台>`

测试编号：`love-style`、`quality-kernel`、`hok-hero`、`delta-operator`、`valorant-agent`
平台参数：`xhs`、`douyin`、`kuaishou`、`video`

## 改完必须跑的三个命令

```bash
npm run review    # 主题自检：变量名写错、漏平台、图片路径不存在都会报出来
npm run shots     # 把每套测试的封面页、结果页、分享图拍成手机尺寸 PNG，存在 shots/
npm run assets    # 只在你改了背景图配色参数后才需要跑
```

`npm run review` 不通过就自己改到通过为止，不用问任何人。`npm run shots` 出来的图就是用户实际会看到的样子，**自己看一遍再收工**——尤其是结果页在手机上能不能一屏放下。

想快速看某个结果的结果页，不用答题，地址后面加 `&peek=<结果key>`：

```
http://localhost:5173/test.html?t=love-style&p=xhs&peek=passionate
```

本地服务用 `npm start` 起。
