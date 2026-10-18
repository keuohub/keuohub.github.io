/**
 * 付费墙配置。改这一个文件就能调整整个收费策略。
 */

export const PAYWALL = {
  // 总开关：false 就是全免费，测试链接回到纯传播模式
  enabled: true,

  // 付费闸门开在哪：'result' = 题目随便做，看结果才收费（推荐，沉没成本最高）
  // 想改成「做一半就收钱」，把这里换成数字，比如 3 表示第 4 题开始拦
  gate: 'result',

  // 云核销接口。留空 = 本地码库模式（只用来开发调试，防不住清缓存）；
  // 填上 Cloudflare Worker 地址 = 真核销，一码一用、用过即废
  endpoint: '',

  // 本地模式的码库文件，只在 endpoint 为空时用到
  codesFile: './codes.json',

  // 解锁后多久失效（小时）。到期后同一台设备也要重新付费
  unlockHours: 24,

  // 弹窗文案
  copy: {
    title: '你的结果已经算出来了',
    subtitle: '解锁完整报告，看清你到底是哪一种',
    payButton: '我已付款，查看结果',
    paidDone: '解锁成功',
    inputLabel: '输入激活码',
    placeholder: '粘贴你收到的激活码',
    social: '已有 12.8 万人解锁，92% 的人说很准',
    limit: '限时特惠，马上恢复原价',
    codeToggle: '有激活码？点这里',
  },

  // 收款方式
  pay: {
    // 付款页面地址。填上之后，用户点「解锁」就直接跳过去付款，不再弹中间弹窗。
    // 填发卡平台商品页、面包多商品页、或者你自己的收款页都行。
    // 留空则用站内扫码面板兜底。
    checkoutUrl: '',

    // 付款成功后让它跳回哪个参数。多数发卡平台叫 return / redirect / callback，
    // 具体用哪个看平台后台，填错了用户付完款就回不来，需要手动点返回。
    returnParam: 'return',

    // 你的收款码图片，放到这个路径就会被自动读取。微信和支付宝两张可以改成一个轮播，先用一张
    qr: '/assets/pay/收款码.png',
    qrHint: '把你的微信或支付宝收款码存成这张图',
    tip: '扫码付完款，点下面的按钮就能看到结果',
    contact: '',
    // 信任制自助解锁：用户点「我已付款」就直接放行。
    // 好处是零门槛，坏处是防不住不付钱也想点的人。
    // 想要真防住，把这里关掉，改用发卡平台自动发码或接 Worker 核销。
    selfUnlock: false,
    // 是否还保留激活码入口（接了发卡平台或人工发码时才需要）
    codeEntry: true,
  },
};

/** 按平台定价：小红书客单价高，抖快是冲动价 */
export const PRICES = {
  xhs: '9.9',
  video: '6.9',
  douyin: '1.9',
  kuaishou: '1.9',
};

export const priceFor = (platform) => PRICES[platform] || PRICES.douyin;
