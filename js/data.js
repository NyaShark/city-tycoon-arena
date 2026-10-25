export const COLORS = {
  harbor: { name: "港湾", color: "#b8653a", ink: "#fffaf0" },
  garden: { name: "青庭", color: "#3f855a", ink: "#f7fff8" },
  culture: { name: "文教", color: "#3977a8", ink: "#f6fbff" },
  market: { name: "集市", color: "#d3a128", ink: "#201b0f" },
  tech: { name: "科创", color: "#526b9d", ink: "#f7f9ff" },
  aurora: { name: "极光", color: "#bc587c", ink: "#fff7fa" },
  neon: { name: "霓虹", color: "#8559a8", ink: "#fbf7ff" },
  crown: { name: "皇冠", color: "#c7453d", ink: "#fff8f4" },
  transit: { name: "交通", color: "#4b514f", ink: "#ffffff" },
  utility: { name: "公用", color: "#6f756f", ink: "#ffffff" }
};

export const PLAYER_COLORS = [
  { name: "朱砂", color: "#d94c36", pale: "#f8ddd6" },
  { name: "湖绿", color: "#168079", pale: "#d7efeb" },
  { name: "金盏", color: "#d89a20", pale: "#faecc9" },
  { name: "靛青", color: "#4b65a0", pale: "#dfe6f5" }
];

export const MARKET_STATES = {
  recession: {
    name: "调整期",
    short: "调整",
    rent: 0.82,
    stock: 0.92,
    color: "#a94f3e",
    note: "租金走低，资产价格承压"
  },
  stable: {
    name: "平稳期",
    short: "平稳",
    rent: 1,
    stock: 1,
    color: "#527064",
    note: "市场供需保持均衡"
  },
  boom: {
    name: "扩张期",
    short: "扩张",
    rent: 1.28,
    stock: 1.11,
    color: "#b17b16",
    note: "租金与股价同步上扬"
  }
};

export const GROUPS = {
  harbor: { name: "港湾街区", color: COLORS.harbor.color, ink: COLORS.harbor.ink },
  garden: { name: "青庭街区", color: COLORS.garden.color, ink: COLORS.garden.ink },
  culture: { name: "文教街区", color: COLORS.culture.color, ink: COLORS.culture.ink },
  market: { name: "中央市集", color: COLORS.market.color, ink: COLORS.market.ink },
  tech: { name: "科创走廊", color: COLORS.tech.color, ink: COLORS.tech.ink },
  aurora: { name: "极光天际", color: COLORS.aurora.color, ink: COLORS.aurora.ink },
  neon: { name: "霓虹娱乐", color: COLORS.neon.color, ink: COLORS.neon.ink },
  crown: { name: "皇冠金融", color: COLORS.crown.color, ink: COLORS.crown.ink }
};

export const STOCKS = {
  harbor: {
    symbol: "HBR",
    name: "港湾物流",
    basePrice: 148,
    volatility: 0.055,
    dividend: 0.022,
    color: "#b8653a"
  },
  green: {
    symbol: "GRN",
    name: "青庭能源",
    basePrice: 96,
    volatility: 0.095,
    dividend: 0.009,
    color: "#3f855a"
  },
  media: {
    symbol: "NEO",
    name: "新域传媒",
    basePrice: 214,
    volatility: 0.072,
    dividend: 0.014,
    color: "#8559a8"
  }
};

export const TILES = [
  { id: 0, type: "go", name: "启程", corner: true, icon: "flag" },
  property(1, "望潮码头", "harbor", 620, 70, 360),
  { id: 2, type: "event", name: "城市事件", icon: "spark" },
  property(3, "海风街区", "harbor", 720, 90, 400),
  { id: 4, type: "tax", name: "营改税", amount: 0.08, icon: "receipt" },
  station(5, "北站", 1300, 180),
  property(6, "灯塔公寓", "harbor", 820, 110, 460),
  property(7, "青藤里", "garden", 900, 120, 500),
  utility(8, "电力公司", 1000),
  property(9, "花园大道", "garden", 1000, 140, 540),
  { id: 10, type: "jail", name: "城市看守所", corner: true, icon: "lock" },
  property(11, "植物园东", "garden", 1100, 160, 600),
  property(12, "剧院街", "culture", 1200, 190, 650),
  property(13, "美术馆路", "culture", 1300, 210, 700),
  property(14, "旧书市场", "culture", 1400, 240, 750),
  station(15, "中央站", 1500, 220),
  property(16, "中央市集", "market", 1500, 280, 800),
  { id: 17, type: "event", name: "市场事件", icon: "spark" },
  property(18, "霓虹商街", "market", 1600, 310, 850),
  property(19, "河畔广场", "market", 1700, 340, 900),
  { id: 20, type: "park", name: "市民公园", corner: true, icon: "trees" },
  property(21, "创客港", "tech", 1800, 380, 950),
  property(22, "数据中心", "tech", 1900, 410, 1000),
  utility(23, "水务集团", 1100),
  property(24, "量子园区", "tech", 2000, 450, 1050),
  station(25, "南港站", 1700, 260),
  property(26, "极光大厦", "aurora", 2100, 500, 1100),
  property(27, "云端酒店", "aurora", 2250, 540, 1180),
  utility(28, "通信网络", 1200),
  { id: 29, type: "gotojail", name: "违规稽查", icon: "police" },
  { id: 30, type: "hall", name: "市政厅", corner: true, icon: "building" },
  property(31, "星轨中心", "aurora", 2400, 590, 1250),
  property(32, "电玩城", "neon", 2500, 640, 1300),
  property(33, "夜行剧场", "neon", 2650, 700, 1380),
  property(34, "光年广场", "neon", 2800, 760, 1450),
  station(35, "机场快线", 1900, 300),
  property(36, "皇冠写字楼", "crown", 2950, 850, 1520),
  property(37, "金融塔", "crown", 3100, 920, 1600),
  { id: 38, type: "wealthTax", name: "资产核税", amount: 150, icon: "receipt" },
  property(39, "城市之巅", "crown", 3300, 1000, 1700)
];

function property(id, name, group, price, baseRent, upgradeCost) {
  return {
    id,
    type: "property",
    name,
    group,
    price,
    baseRent,
    upgradeCost,
    icon: "building"
  };
}

function station(id, name, price, baseRent) {
  return {
    id,
    type: "station",
    name,
    group: "transit",
    price,
    baseRent,
    icon: "train"
  };
}

function utility(id, name, price) {
  return {
    id,
    type: "utility",
    name,
    group: "utility",
    price,
    baseRent: 8,
    icon: "bolt"
  };
}

export const EVENT_CARDS = [
  {
    id: "civic-grant",
    title: "城市更新补助",
    kicker: "政策红利",
    text: "你的项目入选城市更新计划，获得 480 元补助。",
    icon: "landmark",
    effect: "cash",
    amount: 480
  },
  {
    id: "maintenance",
    title: "管网集中检修",
    kicker: "临时支出",
    text: "名下每处地产需要支付 60 元检修费，最高 480 元。",
    icon: "wrench",
    effect: "property-fee",
    amount: 60,
    cap: 480
  },
  {
    id: "dividend",
    title: "资本市场派息",
    kicker: "投资回报",
    text: "按当前股票市值获得 3% 的特别股息。",
    icon: "chart",
    effect: "stock-dividend",
    rate: 0.03
  },
  {
    id: "boom",
    title: "投资信心回升",
    kicker: "市场信号",
    text: "城市建设预期升温，市场立即进入扩张期。",
    icon: "trending",
    effect: "market",
    market: "boom"
  },
  {
    id: "recession",
    title: "融资窗口收紧",
    kicker: "市场信号",
    text: "资金成本上升，市场立即进入调整期。",
    icon: "trending-down",
    effect: "market",
    market: "recession"
  },
  {
    id: "audit",
    title: "税务抽查",
    kicker: "现金流冲击",
    text: "按当前现金的 10% 补缴税款，最低 100 元、最高 600 元。",
    icon: "search",
    effect: "cash-tax",
    rate: 0.1,
    min: 100,
    max: 600
  },
  {
    id: "tourist",
    title: "城市旅游季",
    kicker: "经营收入",
    text: "名下每处地产带来 80 元旅游收入，最高 720 元。",
    icon: "users",
    effect: "property-income",
    amount: 80,
    cap: 720
  },
  {
    id: "market-fee",
    title: "临时摊位收入",
    kicker: "意外之财",
    text: "抽到一张城市消费券，立即获得 260 元。",
    icon: "ticket",
    effect: "cash",
    amount: 260
  },
  {
    id: "stock-grant",
    title: "原始股配售",
    kicker: "投资机会",
    text: "随机获得 2 股青庭能源，无需支付费用。",
    icon: "gift",
    effect: "stock-grant",
    stock: "green",
    shares: 2
  },
  {
    id: "rent-bonus",
    title: "商圈联合促销",
    kicker: "租金加成",
    text: "其他每位玩家向你支付 120 元联合促销费。",
    icon: "handshake",
    effect: "collect-from-others",
    amount: 120
  }
];

export const AI_PROFILES = {
  steady: {
    name: "稳健",
    reserve: 1100,
    bidFactor: 0.66,
    stockReserve: 1600,
    aggression: 0.18
  },
  growth: {
    name: "进取",
    reserve: 650,
    bidFactor: 0.78,
    stockReserve: 1000,
    aggression: 0.38
  },
  bold: {
    name: "冒险",
    reserve: 300,
    bidFactor: 0.9,
    stockReserve: 550,
    aggression: 0.58
  }
};

export const SETTINGS_PRESETS = {
  short: { name: "短局", startingCash: 5000, salary: 1500 },
  standard: { name: "标准", startingCash: 7200, salary: 2000 },
  long: { name: "长局", startingCash: 10000, salary: 2400 }
};

export const GROUP_TILES = Object.values(GROUPS).reduce((result, group, index) => {
  const key = Object.keys(GROUPS)[index];
  result[key] = TILES.filter((tile) => tile.type === "property" && tile.group === key).map(
    (tile) => tile.id
  );
  return result;
}, {});

export const AUCTION_START_RATE = 0.5;
