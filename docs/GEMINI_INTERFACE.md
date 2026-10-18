# 引擎接口清单（写 CSS 之前必看）

## 一、选择器（最容易写错的地方）

**没有 `data-platform` 这个属性。** 实际生效的写法是：

```css
body[data-test='love-style'][data-theme='xhs'] { ... }
```

- `data-theme` 取值：`xhs` / `douyin` / `kuaishou` / `video`
- `data-test` 取值：`love-style` / `quality-kernel` / `hok-hero` / `delta-operator` / `valorant-agent`
- 两个属性都挂在 `<body>` 上

写成 `[data-platform='xhs']` 或 `[data-theme='xhs']`（漏掉 data-test）都不会报错，但也不会生效。

## 二、主题文件怎么加载

打开 `test.html?t=love-style` 时，引擎会动态插入 `<link href="./themes/love-style.css">`，并且等它加载完再渲染页面。`tools/poster-preview.html` 同样是这个机制。

这带来两个结果：

- 主题文件是**最后加载的**，同权重下一定赢过 `src/styles.css`
- 你可以在主题文件里覆盖引擎里的任何样式，不限于变量。建议照样带上 `body[data-test][data-theme]` 前缀，权重稳

## 三、DOM 结构与类名

**封面页**

```
.shell
  .start
    .start-kicker      题量 · 时长
    .start-title       大标题
    .start-sub         副标题
    .start-intro       引导语
    .start-actions
      .btn.btn-primary 开始测试
```

**答题页**

```
.shell
  .quiz-top
    .back              返回上一题按钮
    .progress > i      进度条（宽度按百分比）
    .counter           1 / 10
  .stage
    .slide             题目容器，切页时加 .in-right / .out-left
      .q-hint          测试名，只有第一题显示
      .q-text          题干
      .option          选项按钮，四个，内部是 <b>A</b><span>文案</span>
```

**结果页**

```
.shell
  .result
    .result-tag        核心大标签（第一视觉焦点）
    .result-quote      点睛金句
    .result-body
      .result-anchor   数据锚点胶囊
      .result-desc     解读文字
      .result-meme     玩家梗，只有抖音/快手且内容有才出现
      .result-extra    副标签，只有分数接近时才出现
      .save-link       保存结果图
    .result-actions
      .btn.btn-primary 分享给朋友
      .btn             重新测试
```

**其它**

- `.shell` 整页容器，最大宽度 460px 居中
- `.toast` 底部提示条，`.loading` 加载态，`.muted` 次要文字
- `.card` / `.chips` / `.chip` 属于内部预览台，不用管
- 任何元素都可以挂 `::before` / `::after`

## 四、页面变量（全部可改，也可以不用）

| 变量 | 默认作用 |
| --- | --- |
| `--bg` | 页面底色，**必须是纯色**，分享图要读它 |
| `--bg-glow` | 页面顶部光晕 |
| `--card` | 卡片底色 |
| `--card-line` | 卡片描边 |
| `--ink` / `--ink-soft` | 主文字 / 次要文字 |
| `--accent` / `--accent-ink` | 强调色 / 它上面的文字 |
| `--shadow` | 卡片投影 |
| `--font-title` / `--font-body` | 标题字体 / 正文字体 |
| `--title-weight` | 标题字重 |
| `--tag-size` | 结果页大标签字号 |
| `--radius` | 圆角基准 |
| `--pad` | 页面左右内边距 |
| `--bg-image` / `--bg-image-scrim` | 背景图 / 遮罩浓度 |

## 五、Canvas 分享图读取的变量

分享图是 canvas 画的，**只读下面这些**，别的 CSS 它一概看不见：

| 变量 | 用在哪 |
| --- | --- |
| `--bg` | 整张图底色；有背景图时，也用来生成默认遮罩色 |
| `--card` | 解读文字卡的底色 |
| `--ink` | 标签、金句、解读文字 |
| `--ink-soft` | 眉标小字、数据锚点、副标签、撕票虚线的基色 |
| `--accent` | 金句荧光笔底色、底部按钮填充 |
| `--accent-ink` | 底部按钮上的文字，**必须配置**，深色主题下写白色会糊 |
| `--radius` | 文字卡圆角（代码里 +8 后使用） |
| `--font-title` / `--title-weight` | 大标签和金句的字体与字重 |
| `--bg-image` | 整张图的背景图，按 cover 铺满居中 |
| `--bg-image-scrim` | 背景图上的遮罩。写数字（0-1）会拿 `--bg` 当遮罩色；写 `rgba(...)` 则直接用这个颜色 |
| `--poster-kicker` | 顶部眉标文案，**要带引号**（`'亲密关系词典 · 词条释义'`）。网页端可以用 `content: var(--poster-kicker)` 直接复用同一句话 |
| `--poster-serial` | 眉标右侧那段文字，**原样渲染**，别再写「NO.」前缀。不写时才用 `NO. 日期` 兜底 |
| `--poster-marker-alpha` | 金句荧光笔浓度，0-1。不写时自动判断：深色底 0.35、浅色底 0.22 |
| `--poster-watermark` | 超大低透明度水印字母（`'VCT'`），压在背景上、卡片下面。不写就没有 |

**它没读的**：`--tag-size`（分享图标签字号按平台写死，小红书 72px、抖快 84px）、`--bg-glow`、`--shadow`、`--card-line`（眉标分隔线用的是 `--ink-soft` 的低透明度版本）。

**分享图现在的结构**，从上到下：

1. 眉标行：左边 `--poster-kicker`，右边 `NO. 日期`，下方一条细分隔线
2. 核心大标签
3. 金句，底下压一层强调色荧光笔
4. 文字卡：数据锚点 + 解读 + 副标签（有才出现）
5. 卡片内靠下一条虚线撕票线，两端各开一个半圆缺口
6. 底部按钮，`--accent` 填充、`--accent-ink` 文字

**尺寸**：小红书 900×1200，其余平台 900×1600，四周内边距固定 72px，高度按内容自动算，不会溢出。

## 六、背景图怎么来

已经有一套 Node 生成脚本，零依赖，直接输出 PNG：`npm run assets`。

配方写在 `scripts/make-backgrounds.mjs` 的 `JOBS` 数组里，每张图配四样东西：底色调、光斑（颜色 / 位置 / 半径 / 强度）、颗粒强度、暗角强度。改完重跑一次就重新生成，输出到 `assets/themes/<测试编号>/<平台>.png`，体积通常在 200-500KB。

你也可以用 AI 绘图工具出图，**直接用同名文件覆盖即可**，不用改任何代码。要注意的是这张图会同时铺在网页背景和分享图上，所以别把主体放在正中间——会被文字压住。

## 六、我这边能为你实现的 Canvas 能力

只要你说清楚要什么，下面这些我都能加：

- 金句下面画一条手绘感下划线，或一块半透明荧光笔底色（不规则边缘可以用多段贝塞尔模拟）
- 按题材换卡片形态：小票撕边、拍立得白框、档案卡编号、狗牌、卷轴角花
- 角落加编号、坐标、条形码、印章之类的装饰元素
- 四种结果用四种底色或四种底纹
- 底部引导区改文案包装，或加二维码位
- 分享图跟随 `--font-title` 用你指定的字体

需要新文案（比如那个 `[ CLASSIFIED // TACTICAL PROFILE ]` 编号前缀）也可以直接给我，我加进题库或渲染层。
