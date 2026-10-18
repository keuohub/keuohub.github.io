# 题库数据结构规范 v1

引擎与内容分离：**新增一个测试 = 新增一个 JSON 文件 + 在 `tests/index.json` 登记**，不改任何代码。

## 文件位置

- 题库：`tests/<test-id>.json`
- 登记表：`tests/index.json` 的 `files` 数组追加文件名

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 唯一标识，kebab-case，与文件名一致 |
| title | string | 是 | 测试名，用于首页卡片和结果页 |
| subtitle | string | 是 | 一句话卖点，10-20 字 |
| intro | string | 是 | 开始页引导语，1-2 句 |
| platforms | string[] | 是 | 取值为 `xhs` / `douyin` / `kuaishou` / `video`，第一个为该测试的主推平台 |
| estimatedMinutes | number | 是 | 预计完成分钟数 |
| tags | string[] | 是 | 首页筛选标签，2-4 个 |
| dimensions | object | 是 | 维度表，key 为英文标识 |
| scoring | object | 是 | 计分规则 |
| questions | array | 是 | 题目列表 |
| results | object | 是 | 结果文案库，key 必须与 dimensions 完全一致 |

## dimensions

```json
"dimensions": {
  "moon": { "label": "月白", "index": 0 },
  "wild": { "label": "旷野", "index": 1 }
}
```

- `label`：维度中文名，仅用于调试和副标签提示
- `index`：从 0 开始，同分兜底时的优先级顺序

## scoring

```json
"scoring": {
  "optionMap": { "A": "moon", "B": "wild", "C": "sun", "D": "deep" },
  "tieBreaker": { "question": 1, "fallbackOrder": ["moon", "wild", "sun", "deep"] }
}
```

- `optionMap`：A/B/C/D 各自对应的维度。同分时进入 tieBreaker
- `tieBreaker.question`：同分时看第几题（1 开始）。用户在该题选了哪个选项，该选项对应的维度胜出
- `tieBreaker.fallbackOrder`：该题所选项的维度也不在并列集合中时，按此顺序取
- 每个选项仍要写 `scores`（见下），支持未来单题跨维度加分的玩法

## questions

```json
{
  "text": "周末独处的下午，你更倾向于怎么度过？",
  "options": [
    { "key": "A", "text": "点上香薰，放部收藏很久的老电影，慢慢享受", "scores": { "moon": 1 } },
    { "key": "B", "text": "收拾房间、给绿植浇水，慢悠悠做一顿饭", "scores": { "wild": 1 } },
    { "key": "C", "text": "戴耳机放空，什么也不做，就盯着窗外发呆", "scores": { "sun": 1 } },
    { "key": "D", "text": "和朋友线上闲聊，刷各种感兴趣的内容", "scores": { "deep": 1 } }
  ]
}
```

规则：

- 每套题固定 4 个选项，key 依次为 A/B/C/D
- 题干必须问**行为**，不问性格（"你会怎么做" 而不是 "你是不是一个xx的人"）
- 选项之间不许出现明显更优选项，四个选项都要让人愿意点
- 呈现给用户的页面不得出现维度名，`scores` 只给引擎看

## results

```json
"moon": {
  "tag": "月白清辉型",
  "quote": "温柔有边界，疏离不冷漠",
  "anchor": "全国仅 7.2% 的人拥有该质感",
  "desc": "你是慢热的长期主义者……偶尔会因为太顾及他人感受，悄悄委屈了自己。",
  "share": {
    "xhs": "测出来是月白清辉型！快来测测你的精神内核是什么质感",
    "douyin": "我的精神内核居然是月白清辉型！你们测出来是什么？",
    "kuaishou": "我的精神内核居然是月白清辉型！你们测出来是什么？",
    "video": "很准的人格质感测试，我是月白清辉型，快来测测你的～"
  }
}
```

- `tag`：核心标签，8 字以内，一眼记住
- `quote`：点睛金句，一句，用户愿意复制粘贴
- `anchor`：数据锚点，制造稀缺感或共鸣感
- `desc`：解读，必须含「优点 + 一个小缺点」，60-110 字
- `meme`：可选。游戏类的玩家梗，一句话，仅在抖音 / 快手主题下展示
- `share`：四个平台的分享话术，用户原文里的 emoji 原样保留
- 结果一律正向或趣味自嘲，不出现贬低性结论

## 交付自查

写完跑 `npm run check`，脚本会校验：字段完整性、维度与结果一一对应、选项数量、同分兜底可用性、每套结果是否有小缺点相关字段。
