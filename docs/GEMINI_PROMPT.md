# 直接发给 Gemini 的提示词

复制下面整段发给它即可。它自己会去读项目里的完整背景文档。

---

你现在是这个项目的视觉设计负责人。项目在 `/Users/qiao/Documents/ChatGPT/创造`，本地预览服务已经跑在 `http://localhost:5173`。

先说清楚我们在做什么。这是一门卖测试链接的生意：一套测试一条 H5 链接，买链接的人把它投到小红书、抖音、快手、视频号上，刷到的人点开答题，看完结果截图发出去。所以**结果页那张截图就是产品本身**——用户不会因为动效炫而转发，只会因为"这句话就是我"而转发。你做的是用户愿意主动传播的那张图。

已经做好的不用你管：答题流程、五套测试的题目和文案、分享图渲染、主题接口。网页和分享图共用同一套 CSS 变量，你改一次配色、换一张底图，两个地方同时变。

**你要做的：**

一、精修五套测试的主题文件：`themes/love-style.css`、`themes/quality-kernel.css`、`themes/hok-hero.css`、`themes/delta-operator.css`、`themes/valorant-agent.css`。每个文件里已经按平台分好段落，我铺的那版基线只当占位符看，可以整体推翻重做。

二、出背景图，放 `assets/themes/<测试编号>/<平台>.png`，然后在主题文件里用 `--bg-image` 和 `--bg-image-scrim` 挂上（路径必须以 `/` 开头）。

**你的自由度：没有审美红线。** 主题文件优先级最高，不只能改 CSS 变量，任何样式都能在里面覆盖（`.result-tag`、`.btn`、`.option` 这些都可以），不需要动引擎文件。字体、配色、间距、圆角、装饰元素、动效节奏、局部布局，全部你定。想加装饰就用伪元素和背景层，不用改 HTML。

只有两件事是技术事实、不是限制：

1. 分享图是 canvas 画的，CSS 影响不到。你有排版想法（手绘下划线、票根撕边、二维码位、四种结果四种底纹）直接说，我来实现。
2. 页面底色 `--bg` 必须是纯色，因为分享图要读它。想要丰富的底就用背景图，那张图分享图也认。

**预览方式：**

```
http://localhost:5173/test.html?t=<测试编号>&p=<平台>
```

测试编号：`love-style`、`quality-kernel`、`hok-hero`、`delta-operator`、`valorant-agent`
平台参数：`xhs`、`douyin`、`kuaishou`、`video`

一次看完一套测试的四张分享图（不用答题）：

```
http://localhost:5173/tools/poster-preview.html?t=hok-hero&p=xhs
```

**开工前先读这两份**，里面是完整背景和操作细节：根目录的 `GEMINI.md`，以及 `docs/GEMINI_BRIEF.md`。

改完刷新页面就生效，不用通知任何人，也不用等确认。`src/`、`tests/`、`scripts/` 是引擎和数据，碰之前说一声。
