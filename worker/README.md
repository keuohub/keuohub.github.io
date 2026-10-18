# 激活码核销服务（Cloudflare Worker + D1）

有了它，卡密才是真正的一码一用、用过即废，还能查每个码什么时候被用掉。

没有它也能卖，但「一码一用」只记在用户自己那台设备上，他换台手机同一个码还能再用一次，丢群里别人也能用。

## 部署（一次性，五到十分钟）

### 1. 注册 Cloudflare

https://dash.cloudflare.com/sign-up 免费注册，不用绑卡。

### 2. 登录并建库

```bash
cd worker
npx wrangler login
npx wrangler d1 create quiz-codes
```

第二条命令会输出一段配置，把它整段贴进 `wrangler.toml`（去掉行首的 `#`）。

### 3. 设管理口令

`wrangler.toml` 里的 `[vars]` 取消注释，`ADMIN_SECRET` 改成只有你知道的长口令。这个口令只用来查统计。

### 4. 部署

```bash
npx wrangler deploy
```

会给你一个地址，形如 `https://quiz-codes.你的账号.workers.dev`。

### 5. 生成并导入卡密

回到项目根目录：

```bash
npm run codes -- 1000
```

它会往桌面的 `测试卡密` 文件夹写三个文件：明文的发货表、D1 导入用的 SQL，还有项目里用的哈希码库。

然后导入（`--remote` 才是写进线上库）：

```bash
cd worker
npx wrangler d1 execute quiz-codes --remote --file="/Users/你的用户名/Desktop/测试卡密/codes.sql"
```

### 6. 把地址填回项目

打开 `src/config.js`：

```js
endpoint: 'https://quiz-codes.你的账号.workers.dev',
```

刷新页面，付费墙就从「本地码库」切到「真核销」。控制台不会再出现本地模式的警告。

## 查统计

```
https://你的worker地址/admin/stats?secret=你设的口令
```

返回总数、已用、剩余。

## 注意事项

- 免费额度：D1 每天 10 万次写入、500 万次读取，一次导一万个码也不会超，卖一单消耗 1 次写加 1 次读
- 现在允许所有域名调用（CORS 是 `*`）。别人知道地址也没用，因为不知道码。想收紧就把 `src/index.js` 里的 `Access-Control-Allow-Origin` 换成你的正式域名
- 补货就再生成一批、再执行一次导入 SQL，`INSERT OR IGNORE` 不会覆盖已经用过的码
