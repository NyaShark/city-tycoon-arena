import {
  AI_PROFILES,
  AUCTION_START_RATE,
  EVENT_CARDS,
  GROUP_TILES,
  GROUP_TILES as PROPERTY_GROUPS,
  GROUPS,
  MARKET_STATES,
  PLAYER_COLORS,
  SETTINGS_PRESETS,
  STOCKS,
  TILES
} from "./data.js";

export const BAIL_COST = 240;
export const MAX_BUILDING_LEVEL = 4;
export const STOCK_COMMISSION = 0.005;

const LEVEL_RENT_MULTIPLIERS = [1, 2.6, 6, 12, 20];

export class RuleError extends Error {
  constructor(message) {
    super(message);
    this.name = "RuleError";
  }
}

export class GameEngine {
  constructor(state, rng = Math.random) {
    this.state = state;
    this.rng = rng;
  }

  static create(config = {}) {
    const preset = SETTINGS_PRESETS[config.preset] || SETTINGS_PRESETS.standard;
    const playersConfig =
      config.players && config.players.length
        ? config.players
        : [
            { name: "玩家", isAI: false },
            { name: "阿衡", isAI: true, profile: "growth" },
            { name: "林澈", isAI: true, profile: "steady" },
            { name: "沈弦", isAI: true, profile: "bold" }
          ];

    const players = playersConfig.slice(0, 4).map((player, index) => {
      const color = PLAYER_COLORS[index];
      return {
        id: `p${index + 1}`,
        name: String(player.name || `玩家 ${index + 1}`).trim().slice(0, 12) || `玩家 ${index + 1}`,
        isAI: Boolean(player.isAI),
        profile: AI_PROFILES[player.profile] ? player.profile : "growth",
        color: color.color,
        pale: color.pale,
        colorIndex: index,
        cash: preset.startingCash,
        position: 0,
        inJail: false,
        jailTurns: 0,
        doublesCount: 0,
        stocks: { harbor: 0, green: 0, media: 0 },
        bankrupt: false
      };
    });

    const stocks = Object.fromEntries(
      Object.entries(STOCKS).map(([key, stock]) => [
        key,
        { price: stock.basePrice, previous: stock.basePrice }
      ])
    );

    return new GameEngine({
      version: 1,
      phase: "playing",
      preset: config.preset || "standard",
      startingCash: preset.startingCash,
      salary: preset.salary,
      players,
      currentPlayerIndex: 0,
      round: 1,
      turnNumber: 1,
      tiles: TILES.map((tile) => ({
        ...tile,
        owner: null,
        level: 0,
        mortgage: false
      })),
      stocks,
      market: "stable",
      marketTurns: 0,
      parkPot: 0,
      dice: [1, 1],
      hasRolled: false,
      extraTurn: false,
      pendingPurchase: null,
      pendingAuction: null,
      lastCard: null,
      winner: null,
      logs: []
    });
  }

  static fromJSON(raw) {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.players) || !Array.isArray(parsed.tiles)) {
      throw new RuleError("存档版本无法识别");
    }
    return new GameEngine(parsed);
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.state));
  }

  get currentPlayer() {
    return this.state.players[this.state.currentPlayerIndex];
  }

  get activePlayers() {
    return this.state.players.filter((player) => !player.bankrupt);
  }

  get tileList() {
    return this.state.tiles;
  }

  get marketMeta() {
    return MARKET_STATES[this.state.market];
  }

  get isGameOver() {
    return this.state.phase === "gameover" || Boolean(this.state.winner);
  }

  playerById(playerId) {
    return this.state.players.find((player) => player.id === playerId) || null;
  }

  tileById(tileId) {
    return this.state.tiles.find((tile) => tile.id === Number(tileId)) || null;
  }

  isOwnable(tile) {
    return Boolean(tile && ["property", "station", "utility"].includes(tile.type));
  }

  canRoll(playerId = this.currentPlayer.id) {
    return (
      !this.isGameOver &&
      playerId === this.currentPlayer.id &&
      !this.state.hasRolled &&
      !this.state.pendingPurchase &&
      !this.state.pendingAuction &&
      !this.currentPlayer.bankrupt
    );
  }

  canEndTurn() {
    return (
      !this.isGameOver &&
      !this.state.pendingPurchase &&
      !this.state.pendingAuction &&
      this.state.hasRolled
    );
  }

  pushLog(text, tone = "neutral", icon = "dot") {
    this.state.logs.unshift({
      id: `${Date.now()}-${this.state.logs.length}-${Math.floor(this.rng() * 10000)}`,
      round: this.state.round,
      text,
      tone,
      icon
    });
    this.state.logs = this.state.logs.slice(0, 100);
  }

  randomInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  randomChoice(items) {
    return items[Math.floor(this.rng() * items.length)];
  }

  rollPair() {
    return [this.randomInt(1, 6), this.randomInt(1, 6)];
  }

  rollDice() {
    if (!this.canRoll()) {
      throw new RuleError("现在不能掷骰");
    }
    if (this.currentPlayer.inJail) {
      throw new RuleError("需要先处理看守所");
    }

    const player = this.currentPlayer;
    const dice = this.rollPair();
    const sum = dice[0] + dice[1];
    const isDouble = dice[0] === dice[1];
    this.state.dice = dice;
    this.state.hasRolled = true;
    this.state.lastCard = null;

    if (isDouble) {
      player.doublesCount += 1;
      if (player.doublesCount >= 3) {
        this.state.extraTurn = false;
        this.sendToJail(player, "连续三次掷出同点");
        return { dice, sum, isDouble, triple: true, path: [], playerId: player.id };
      }
    }

    this.state.extraTurn = isDouble;
    const movement = this.movePlayer(player, sum);
    const landing = this.resolveLanding(player, sum);
    return {
      dice,
      sum,
      isDouble,
      triple: false,
      path: movement.path,
      passedGo: movement.passedGo,
      playerId: player.id,
      landing
    };
  }

  attemptJailRoll() {
    if (!this.canRoll() || !this.currentPlayer.inJail) {
      throw new RuleError("现在不能尝试离开看守所");
    }
    const player = this.currentPlayer;
    const dice = this.rollPair();
    const isDouble = dice[0] === dice[1];
    this.state.dice = dice;
    this.state.hasRolled = true;
    this.state.lastCard = null;

    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      player.doublesCount = 0;
      this.state.extraTurn = false;
      this.pushLog(`${player.name} 掷出双 ${dice[0]}，解除拘押`, "good", "unlock");
      const movement = this.movePlayer(player, dice[0] + dice[1]);
      return {
        dice,
        sum: dice[0] + dice[1],
        isDouble: true,
        released: true,
        path: movement.path,
        landing: this.resolveLanding(player, dice[0] + dice[1])
      };
    }

    player.jailTurns += 1;
    this.state.extraTurn = false;
    if (player.jailTurns >= 3) {
      player.inJail = false;
      player.jailTurns = 0;
      this.charge(player, BAIL_COST, null, "强制保释");
      this.pushLog(`${player.name} 第三次未掷出双点，强制支付保释金`, "cost", "lock");
    } else {
      this.pushLog(`${player.name} 未能掷出双点，留在看守所`, "warn", "lock");
    }
    return { dice, sum: dice[0] + dice[1], isDouble: false, released: false, path: [] };
  }

  payBail() {
    const player = this.currentPlayer;
    if (!player.inJail || this.state.hasRolled) {
      throw new RuleError("当前无需保释");
    }
    this.charge(player, BAIL_COST, null, "保释金");
    player.inJail = false;
    player.jailTurns = 0;
    player.doublesCount = 0;
    this.pushLog(`${player.name} 支付 ${BAIL_COST} 元保释金`, "cost", "unlock");
    return true;
  }

  movePlayer(player, steps) {
    const path = [];
    let passedGo = false;
    for (let step = 0; step < steps; step += 1) {
      player.position = (player.position + 1) % 40;
      path.push(player.position);
      if (player.position === 0) {
        passedGo = true;
      }
    }
    if (passedGo) {
      player.cash += this.state.salary;
      const dividends = this.collectDividends(player);
      this.pushLog(
        `${player.name} 经过启程，领取 ${this.state.salary} 元${dividends ? `，股息 ${dividends} 元` : ""}`,
        "income",
        "coins"
      );
    }
    return { path, passedGo };
  }

  resolveLanding(player, diceSum) {
    const tile = this.tileById(player.position);
    if (!tile) return null;

    if (this.isOwnable(tile)) {
      if (!tile.owner) {
        this.state.pendingPurchase = {
          tileId: tile.id,
          playerId: player.id,
          price: tile.price
        };
        return { kind: "purchase", tileId: tile.id };
      }
      if (tile.owner === player.id) {
        this.pushLog(`${player.name} 回到 ${tile.name}`, "neutral", "home");
        return { kind: "own", tileId: tile.id };
      }
      if (tile.mortgage) {
        this.pushLog(`${tile.name} 处于抵押状态，本次不收取租金`, "neutral", "receipt");
        return { kind: "mortgaged", tileId: tile.id };
      }
      const owner = this.playerById(tile.owner);
      const rent = this.getRent(tile, diceSum);
      this.pushLog(
        `${player.name} 进入 ${owner.name} 的 ${tile.name}，支付租金 ${rent} 元`,
        "cost",
        "arrow-right"
      );
      this.charge(player, rent, owner.id, `${tile.name} 租金`);
      return { kind: "rent", tileId: tile.id, rent, ownerId: owner.id };
    }

    if (tile.type === "event") {
      const card = this.drawEvent();
      return { kind: "event", tileId: tile.id, card };
    }
    if (tile.type === "tax") {
      const tax = Math.max(200, Math.min(1200, Math.round(player.cash * tile.amount)));
      this.state.parkPot += tax;
      this.charge(player, tax, null, "营改税");
      this.pushLog(`${player.name} 缴纳营改税 ${tax} 元，纳入城市基金池`, "cost", "receipt");
      return { kind: "tax", tileId: tile.id, amount: tax };
    }
    if (tile.type === "wealthTax") {
      const owned = this.ownedTiles(player.id).length;
      const tax = Math.min(1800, tile.amount + owned * 60);
      this.state.parkPot += tax;
      this.charge(player, tax, null, "资产核税");
      this.pushLog(`${player.name} 缴纳资产核税 ${tax} 元`, "cost", "receipt");
      return { kind: "tax", tileId: tile.id, amount: tax };
    }
    if (tile.type === "park") {
      const amount = this.state.parkPot;
      this.state.parkPot = 0;
      player.cash += amount;
      this.pushLog(`${player.name} 在市民公园领取基金池 ${amount} 元`, "income", "trees");
      return { kind: "park", tileId: tile.id, amount };
    }
    if (tile.type === "hall") {
      const grant = 480;
      player.cash += grant;
      const previous = this.state.market;
      this.shiftMarket(1);
      this.pushLog(
        `${player.name} 获得市政补贴 ${grant} 元，市场转向${MARKET_STATES[this.state.market].name}`,
        "income",
        "building"
      );
      return { kind: "hall", tileId: tile.id, amount: grant, previousMarket: previous };
    }
    if (tile.type === "gotojail") {
      this.sendToJail(player, "违规稽查");
      return { kind: "jail", tileId: tile.id };
    }
    if (tile.type === "jail") {
      this.pushLog(`${player.name} 只是路过看守所`, "neutral", "lock");
      return { kind: "visit", tileId: tile.id };
    }
    if (tile.type === "go") {
      this.pushLog(`${player.name} 停在启程广场`, "neutral", "flag");
      return { kind: "go", tileId: tile.id };
    }
    return { kind: "none", tileId: tile.id };
  }

  sendToJail(player, reason) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    player.doublesCount = 0;
    this.state.extraTurn = false;
    this.pushLog(`${player.name} 因${reason}进入看守所`, "warn", "lock");
  }

  buyPendingProperty() {
    const pending = this.state.pendingPurchase;
    if (!pending) throw new RuleError("当前没有可购买的地产");
    const player = this.playerById(pending.playerId);
    const tile = this.tileById(pending.tileId);
    if (!player || !tile || tile.owner) throw new RuleError("该地产已不可购买");
    if (player.cash < tile.price) throw new RuleError("现金不足，无法购买");

    player.cash -= tile.price;
    tile.owner = player.id;
    tile.level = 0;
    tile.mortgage = false;
    this.state.pendingPurchase = null;
    this.pushLog(`${player.name} 以 ${tile.price} 元购入 ${tile.name}`, "buy", "key");
    return tile;
  }

  declinePendingProperty() {
    const pending = this.state.pendingPurchase;
    if (!pending) throw new RuleError("当前没有待处理地产");
    const tile = this.tileById(pending.tileId);
    this.state.pendingPurchase = null;
    this.pushLog(`${this.playerById(pending.playerId).name} 放弃购买 ${tile.name}，进入公开拍卖`, "neutral", "gavel");
    return this.startAuction(tile.id);
  }

  startAuction(tileId) {
    const tile = this.tileById(tileId);
    if (!tile || !this.isOwnable(tile) || tile.owner) {
      throw new RuleError("该地产不能拍卖");
    }
    const minimum = Math.floor(tile.price * AUCTION_START_RATE);
    const eligible = this.activePlayers.filter((player) => player.cash >= minimum).map((player) => player.id);
    this.state.pendingAuction = {
      tileId: tile.id,
      active: eligible,
      index: 0,
      highBidder: null,
      currentBid: 0,
      minimum,
      increment: Math.max(25, Math.round((tile.price * 0.05) / 25) * 25),
      bids: []
    };
    if (!eligible.length) {
      this.finishAuction();
    }
    return this.state.pendingAuction;
  }

  get auctionMinimumBid() {
    const auction = this.state.pendingAuction;
    if (!auction) return 0;
    return auction.currentBid
      ? auction.currentBid + auction.increment
      : auction.minimum;
  }

  get auctionCurrentBidder() {
    const auction = this.state.pendingAuction;
    if (!auction || !auction.active.length) return null;
    return this.playerById(auction.active[auction.index] || auction.active[0]);
  }

  auctionBid() {
    const auction = this.state.pendingAuction;
    const bidder = this.auctionCurrentBidder;
    if (!auction || !bidder) throw new RuleError("当前没有拍卖出价方");
    const amount = this.auctionMinimumBid;
    if (bidder.cash < amount) throw new RuleError("现金不足，无法出价");

    auction.highBidder = bidder.id;
    auction.currentBid = amount;
    auction.bids.unshift({ playerId: bidder.id, amount });
    this.pushLog(`${bidder.name} 为 ${this.tileById(auction.tileId).name} 出价 ${amount} 元`, "neutral", "gavel");

    const nextMinimum = auction.currentBid + auction.increment;
    auction.active = auction.active.filter(
      (playerId) => playerId === bidder.id || this.playerById(playerId).cash >= nextMinimum
    );
    if (auction.active.length === 1 || auction.active.every((playerId) => playerId === bidder.id)) {
      return this.finishAuction();
    }
    this.advanceAuctionIndex(true);
    return auction;
  }

  auctionPass() {
    const auction = this.state.pendingAuction;
    const bidder = this.auctionCurrentBidder;
    if (!auction || !bidder) throw new RuleError("当前没有拍卖放弃方");
    auction.active = auction.active.filter((playerId) => playerId !== bidder.id);
    const tile = this.tileById(auction.tileId);
    this.pushLog(`${bidder.name} 退出 ${tile.name} 的拍卖`, "neutral", "x");
    if (!auction.active.length) return this.finishAuction();
    if (auction.active.length === 1 && auction.highBidder === auction.active[0]) {
      return this.finishAuction();
    }
    auction.index = auction.index % auction.active.length;
    return auction;
  }

  advanceAuctionIndex(skipHighBidder = false) {
    const auction = this.state.pendingAuction;
    if (!auction || !auction.active.length) return;
    for (let attempts = 0; attempts < auction.active.length + 1; attempts += 1) {
      auction.index = (auction.index + 1) % auction.active.length;
      if (!skipHighBidder || auction.active[auction.index] !== auction.highBidder) break;
    }
  }

  finishAuction() {
    const auction = this.state.pendingAuction;
    if (!auction) return null;
    const tile = this.tileById(auction.tileId);
    const winner = auction.highBidder ? this.playerById(auction.highBidder) : null;
    let result;
    if (winner && winner.cash >= auction.currentBid) {
      winner.cash -= auction.currentBid;
      tile.owner = winner.id;
      tile.level = 0;
      tile.mortgage = false;
      this.pushLog(`${winner.name} 以 ${auction.currentBid} 元拍得 ${tile.name}`, "buy", "gavel");
      result = { sold: true, playerId: winner.id, amount: auction.currentBid, tileId: tile.id };
    } else {
      this.pushLog(`${tile.name} 流拍，无人接手`, "warn", "gavel");
      result = { sold: false, tileId: tile.id };
    }
    this.state.pendingAuction = null;
    return result;
  }

  groupTileIds(tile) {
    if (tile.type === "property") return [...(GROUP_TILES[tile.group] || [])];
    if (tile.type === "station") return this.state.tiles.filter((item) => item.type === "station").map((item) => item.id);
    if (tile.type === "utility") return this.state.tiles.filter((item) => item.type === "utility").map((item) => item.id);
    return [];
  }

  ownsFullGroup(tile, playerId) {
    const ids = this.groupTileIds(tile);
    return ids.length > 0 && ids.every((id) => this.tileById(id).owner === playerId);
  }

  ownedTiles(playerId) {
    return this.state.tiles.filter((tile) => tile.owner === playerId);
  }

  getRent(tile, diceSum = 7) {
    if (!tile.owner || tile.mortgage) return 0;
    const marketRent = this.marketMeta.rent;
    const fullGroup = this.ownsFullGroup(tile, tile.owner);

    if (tile.type === "property") {
      let rent = tile.baseRent * LEVEL_RENT_MULTIPLIERS[tile.level || 0];
      if (tile.level === 0 && fullGroup) rent *= 2;
      return Math.round(rent * marketRent);
    }
    if (tile.type === "station") {
      const count = this.state.tiles.filter(
        (item) => item.type === "station" && item.owner === tile.owner
      ).length;
      let rent = tile.baseRent * Math.pow(2, Math.max(0, count - 1));
      if (count === 4) rent *= 2;
      return Math.round(rent * marketRent);
    }
    if (tile.type === "utility") {
      const count = this.state.tiles.filter(
        (item) => item.type === "utility" && item.owner === tile.owner
      ).length;
      const multiplier = [8, 20, 36][Math.min(3, Math.max(1, count)) - 1] || 8;
      return Math.round(diceSum * multiplier * marketRent);
    }
    return 0;
  }

  getUpgradeStatus(tileId, playerId = this.currentPlayer.id) {
    const tile = this.tileById(tileId);
    const player = this.playerById(playerId);
    if (!tile || !player) return { allowed: false, reason: "地产不存在" };
    if (tile.type !== "property") return { allowed: false, reason: "该地产不能升级" };
    if (tile.owner !== player.id) return { allowed: false, reason: "尚未持有该地产" };
    if (tile.mortgage) return { allowed: false, reason: "请先赎回抵押" };
    if (tile.level >= MAX_BUILDING_LEVEL) return { allowed: false, reason: "已经达到最高等级" };
    if (!this.ownsFullGroup(tile, player.id)) {
      return { allowed: false, reason: "需要集齐同组地产" };
    }
    const groupLevels = this.groupTileIds(tile).map((id) => this.tileById(id).level || 0);
    const lowest = Math.min(...groupLevels);
    if (tile.level > lowest) return { allowed: false, reason: "同组地产需要均衡升级" };
    if (player.cash < tile.upgradeCost) return { allowed: false, reason: "现金不足" };
    return { allowed: true, reason: "" };
  }

  upgradeProperty(tileId, playerId = this.currentPlayer.id) {
    const tile = this.tileById(tileId);
    const status = this.getUpgradeStatus(tileId, playerId);
    if (!status.allowed) throw new RuleError(status.reason);
    const player = this.playerById(playerId);
    player.cash -= tile.upgradeCost;
    tile.level += 1;
    this.pushLog(
      `${player.name} 将 ${tile.name} 升级至 ${tile.level} 级`,
      "build",
      "building"
    );
    return tile;
  }

  sellBuilding(tileId, playerId = this.currentPlayer.id) {
    const tile = this.tileById(tileId);
    const player = this.playerById(playerId);
    if (!tile || tile.owner !== playerId || tile.level <= 0) {
      throw new RuleError("没有可拆除的建筑");
    }
    const groupLevels = this.groupTileIds(tile).map((id) => this.tileById(id).level || 0);
    if (tile.level < Math.max(...groupLevels)) {
      throw new RuleError("需要先拆除更高的建筑");
    }
    tile.level -= 1;
    const recovered = Math.floor(tile.upgradeCost * 0.5);
    player.cash += recovered;
    this.pushLog(`${player.name} 拆除 ${tile.name} 一级建筑，回收 ${recovered} 元`, "income", "hammer");
    return recovered;
  }

  mortgageProperty(tileId, playerId = this.currentPlayer.id) {
    const tile = this.tileById(tileId);
    const player = this.playerById(playerId);
    if (!tile || tile.owner !== playerId) throw new RuleError("尚未持有该地产");
    if (tile.mortgage) throw new RuleError("该地产已经抵押");
    if (tile.level > 0) throw new RuleError("请先拆除全部建筑");
    const amount = Math.floor(tile.price * 0.5);
    tile.mortgage = true;
    player.cash += amount;
    this.pushLog(`${player.name} 抵押 ${tile.name}，获得 ${amount} 元`, "income", "banknote");
    return amount;
  }

  redeemProperty(tileId, playerId = this.currentPlayer.id) {
    const tile = this.tileById(tileId);
    const player = this.playerById(playerId);
    if (!tile || tile.owner !== playerId || !tile.mortgage) {
      throw new RuleError("该地产无需赎回");
    }
    const cost = Math.ceil(tile.price * 0.55);
    if (player.cash < cost) throw new RuleError("现金不足，无法赎回");
    player.cash -= cost;
    tile.mortgage = false;
    this.pushLog(`${player.name} 以 ${cost} 元赎回 ${tile.name}`, "cost", "key");
    return cost;
  }

  charge(player, rawAmount, creditorId = null, reason = "支出") {
    const amount = Math.max(0, Math.round(rawAmount));
    if (!player || player.bankrupt || amount === 0) return { paid: 0, bankrupt: false };
    if (player.cash < amount) this.raiseFunds(player, amount);
    if (player.cash < amount) {
      const paid = Math.max(0, player.cash);
      if (paid > 0) player.cash -= paid;
      if (creditorId) {
        const creditor = this.playerById(creditorId);
        if (creditor && !creditor.bankrupt) creditor.cash += paid;
      }
      this.bankruptPlayer(player, creditorId, reason);
      return { paid, bankrupt: true };
    }
    player.cash -= amount;
    if (creditorId) {
      const creditor = this.playerById(creditorId);
      if (creditor && !creditor.bankrupt) creditor.cash += amount;
    }
    return { paid: amount, bankrupt: false };
  }

  raiseFunds(player, targetCash) {
    let guard = 100;
    while (player.cash < targetCash && guard > 0) {
      guard -= 1;
      let acted = false;

      for (const [symbol, count] of Object.entries(player.stocks)) {
        if (count > 0) {
          player.stocks[symbol] -= 1;
          const gross = this.state.stocks[symbol].price;
          const fee = Math.max(0.5, gross * STOCK_COMMISSION);
          player.cash += Math.max(0, gross - fee);
          this.pushLog(`${player.name} 自动卖出 1 股 ${STOCKS[symbol].name} 补充现金`, "income", "chart");
          acted = true;
          break;
        }
      }
      if (acted) continue;

      const building = this.ownedTiles(player.id)
        .filter((tile) => tile.level > 0)
        .sort((a, b) => b.level - a.level)[0];
      if (building) {
        building.level -= 1;
        const recovered = Math.floor(building.upgradeCost * 0.5);
        player.cash += recovered;
        this.pushLog(`${player.name} 自动拆除 ${building.name} 一级建筑，回收 ${recovered} 元`, "income", "hammer");
        continue;
      }

      const mortgageable = this.ownedTiles(player.id)
        .filter((tile) => !tile.mortgage && tile.level === 0)
        .sort((a, b) => b.price - a.price)[0];
      if (mortgageable) {
        const amount = Math.floor(mortgageable.price * 0.5);
        mortgageable.mortgage = true;
        player.cash += amount;
        this.pushLog(`${player.name} 自动抵押 ${mortgageable.name}，获得 ${amount} 元`, "income", "banknote");
        continue;
      }
      break;
    }
  }

  bankruptPlayer(player, creditorId = null, reason = "资不抵债") {
    const creditor = creditorId ? this.playerById(creditorId) : null;
    const assets = this.ownedTiles(player.id);
    if (creditor && !creditor.bankrupt) {
      creditor.cash += Math.max(0, player.cash);
      for (const [symbol, count] of Object.entries(player.stocks)) {
        creditor.stocks[symbol] += count;
      }
      for (const tile of assets) tile.owner = creditor.id;
      this.pushLog(`${player.name} 因${reason}破产，资产由 ${creditor.name} 接管`, "critical", "skull");
    } else {
      for (const tile of assets) {
        tile.owner = null;
        tile.level = 0;
        tile.mortgage = false;
      }
      this.pushLog(`${player.name} 因${reason}破产，地产收归城市`, "critical", "skull");
    }
    player.cash = 0;
    player.stocks = { harbor: 0, green: 0, media: 0 };
    player.bankrupt = true;
    player.inJail = false;
    this.checkGameOver();
  }

  checkGameOver() {
    const solvent = this.activePlayers;
    if (solvent.length <= 1) {
      this.state.phase = "gameover";
      this.state.winner = solvent[0]?.id || null;
      if (solvent[0]) this.pushLog(`${solvent[0].name} 成为最后一位城市巨头`, "critical", "crown");
    }
  }

  collectDividends(player) {
    let total = 0;
    for (const [symbol, count] of Object.entries(player.stocks)) {
      if (!count) continue;
      const value = count * this.state.stocks[symbol].price;
      total += value * STOCKS[symbol].dividend;
    }
    const rounded = Math.round(total);
    player.cash += rounded;
    return rounded;
  }

  drawEvent() {
    const card = this.randomChoice(EVENT_CARDS);
    this.state.lastCard = { ...card, playerId: this.currentPlayer.id };
    this.applyEvent(card, this.currentPlayer);
    this.pushLog(`${this.currentPlayer.name} 抽到「${card.title}」`, "event", card.icon);
    return card;
  }

  applyEvent(card, player) {
    if (card.effect === "cash") {
      player.cash += card.amount;
      return;
    }
    if (card.effect === "property-fee") {
      const count = this.ownedTiles(player.id).length;
      const amount = Math.min(card.cap, count * card.amount);
      if (amount > 0) {
        this.state.parkPot += amount;
        this.charge(player, amount, null, card.title);
      }
      return;
    }
    if (card.effect === "cash-tax") {
      const amount = Math.max(card.min, Math.min(card.max, Math.round(player.cash * card.rate)));
      this.state.parkPot += amount;
      this.charge(player, amount, null, card.title);
      return;
    }
    if (card.effect === "property-income") {
      const count = this.ownedTiles(player.id).length;
      player.cash += Math.min(card.cap, count * card.amount);
      return;
    }
    if (card.effect === "stock-dividend") {
      player.cash += Math.round(this.stockValue(player.id) * card.rate);
      return;
    }
    if (card.effect === "market") {
      this.state.market = card.market;
      this.state.marketTurns = 0;
      return;
    }
    if (card.effect === "stock-grant") {
      player.stocks[card.stock] += card.shares;
      return;
    }
    if (card.effect === "collect-from-others") {
      for (const other of this.activePlayers) {
        if (other.id === player.id) continue;
        const before = other.cash;
        this.charge(other, card.amount, player.id, card.title);
        if (before >= card.amount) continue;
      }
    }
  }

  shiftMarket(direction = 1) {
    const order = ["recession", "stable", "boom"];
    const index = order.indexOf(this.state.market);
    this.state.market = order[Math.max(0, Math.min(order.length - 1, index + direction))];
    this.state.marketTurns = 0;
  }

  advanceRound() {
    this.state.round += 1;
    this.state.marketTurns += 1;
    if (this.state.marketTurns >= 3) {
      const roll = this.rng();
      const next = roll < 0.33 ? "boom" : roll < 0.64 ? "recession" : "stable";
      if (next !== this.state.market) {
        this.state.market = next;
        this.pushLog(`市场进入${MARKET_STATES[next].name}`, "event", "trending");
      }
      this.state.marketTurns = 0;
    }
    this.updateStocks();
  }

  updateStocks() {
    const marketFactor = this.marketMeta.stock;
    let largestMove = 0;
    let largestName = "";
    for (const [symbol, stock] of Object.entries(this.state.stocks)) {
      const meta = STOCKS[symbol];
      const change = (this.rng() * 2 - 1) * meta.volatility;
      const next = Math.max(meta.basePrice * 0.35, stock.price * marketFactor * (1 + change));
      stock.previous = stock.price;
      stock.price = Math.round(next * 100) / 100;
      const move = Math.abs(stock.price - stock.previous);
      if (move > largestMove) {
        largestMove = move;
        largestName = meta.name;
      }
    }
    if (largestName) {
      this.pushLog(`${largestName} 领涨市场，股价出现新波动`, "neutral", "chart");
    }
  }

  stockValue(playerId) {
    const player = this.playerById(playerId);
    if (!player) return 0;
    return Object.entries(player.stocks).reduce(
      (sum, [symbol, count]) => sum + count * this.state.stocks[symbol].price,
      0
    );
  }

  buyStock(symbol, quantity, playerId = this.currentPlayer.id) {
    const player = this.playerById(playerId);
    const count = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!player || !STOCKS[symbol] || count < 1) throw new RuleError("股票数量无效");
    if (this.state.pendingPurchase || this.state.pendingAuction) {
      throw new RuleError("请先处理当前地产事务");
    }
    const gross = this.state.stocks[symbol].price * count;
    const fee = Math.max(1, Math.round(gross * STOCK_COMMISSION * 100) / 100);
    const total = gross + fee;
    if (player.cash < total) throw new RuleError("现金不足，无法买入");
    player.cash -= total;
    player.stocks[symbol] += count;
    this.pushLog(
      `${player.name} 买入 ${count} 股 ${STOCKS[symbol].name}，含手续费 ${total.toFixed(2)} 元`,
      "buy",
      "chart"
    );
    return total;
  }

  sellStock(symbol, quantity, playerId = this.currentPlayer.id) {
    const player = this.playerById(playerId);
    const count = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!player || !STOCKS[symbol] || count < 1) throw new RuleError("股票数量无效");
    if ((player.stocks[symbol] || 0) < count) throw new RuleError("持股数量不足");
    const gross = this.state.stocks[symbol].price * count;
    const fee = Math.max(1, Math.round(gross * STOCK_COMMISSION * 100) / 100);
    const proceeds = Math.max(0, gross - fee);
    player.cash += proceeds;
    player.stocks[symbol] -= count;
    this.pushLog(
      `${player.name} 卖出 ${count} 股 ${STOCKS[symbol].name}，到账 ${proceeds.toFixed(2)} 元`,
      "income",
      "chart"
    );
    return proceeds;
  }

  netWorth(playerId) {
    const player = this.playerById(playerId);
    if (!player) return 0;
    const propertyValue = this.ownedTiles(player.id).reduce((sum, tile) => {
      const base = tile.price * (tile.mortgage ? 0.5 : 1);
      const buildings = tile.level * (tile.upgradeCost || 0) * 0.72;
      return sum + base + buildings;
    }, 0);
    return Math.round(player.cash + this.stockValue(player.id) + propertyValue);
  }

  endTurn() {
    if (!this.canEndTurn()) throw new RuleError("请先完成当前操作");
    const player = this.currentPlayer;
    if (this.state.extraTurn && !player.bankrupt) {
      player.doublesCount = 0;
      this.state.extraTurn = false;
      this.state.hasRolled = false;
      this.state.turnNumber += 1;
      this.pushLog(`${player.name} 掷出双点，获得额外行动`, "good", "refresh");
      return { samePlayer: true, playerId: player.id };
    }

    player.doublesCount = 0;
    let nextIndex = this.state.currentPlayerIndex;
    for (let offset = 1; offset <= this.state.players.length; offset += 1) {
      const candidate = (this.state.currentPlayerIndex + offset) % this.state.players.length;
      if (!this.state.players[candidate].bankrupt) {
        nextIndex = candidate;
        break;
      }
    }
    const wrapped = nextIndex <= this.state.currentPlayerIndex;
    this.state.currentPlayerIndex = nextIndex;
    this.state.turnNumber += 1;
    this.state.hasRolled = false;
    this.state.extraTurn = false;
    this.state.dice = [1, 1];
    this.state.lastCard = null;
    if (wrapped) this.advanceRound();
    this.checkGameOver();
    return { samePlayer: false, playerId: this.currentPlayer.id };
  }

  shouldAiBuy(tile, player = this.currentPlayer) {
    if (!tile || !this.isOwnable(tile) || player.cash < tile.price) return false;
    const profile = AI_PROFILES[player.profile] || AI_PROFILES.growth;
    const groupIds = this.groupTileIds(tile);
    const ownedInGroup = groupIds.filter((id) => this.tileById(id).owner === player.id).length;
    const premium = ownedInGroup * 0.12;
    const reserve = profile.reserve * (1 - Math.min(0.32, premium));
    return player.cash - tile.price >= reserve;
  }

  aiUpgradeCandidate(player = this.currentPlayer) {
    const candidates = this.ownedTiles(player.id)
      .filter((tile) => tile.type === "property")
      .filter((tile) => this.getUpgradeStatus(tile.id, player.id).allowed)
      .filter((tile) => player.cash - tile.upgradeCost >= (AI_PROFILES[player.profile]?.reserve || 700) * 0.55)
      .sort((a, b) => {
        const aRent = this.getRent({ ...a, level: a.level + 1 }, 7);
        const bRent = this.getRent({ ...b, level: b.level + 1 }, 7);
        return bRent / b.upgradeCost - aRent / a.upgradeCost;
      });
    return candidates[0] || null;
  }

  aiAuctionChoice() {
    const auction = this.state.pendingAuction;
    const bidder = this.auctionCurrentBidder;
    if (!auction || !bidder) return { action: "pass" };
    const tile = this.tileById(auction.tileId);
    const profile = AI_PROFILES[bidder.profile] || AI_PROFILES.growth;
    const ownedInGroup = this.groupTileIds(tile).filter((id) => {
      const item = this.tileById(id);
      return item.owner === bidder.id;
    }).length;
    const synergy = ownedInGroup * 0.07;
    const limit = Math.min(
      bidder.cash - Math.max(100, profile.reserve * 0.25),
      tile.price * (profile.bidFactor + synergy)
    );
    if (this.auctionMinimumBid <= limit) return { action: "bid" };
    return { action: "pass" };
  }

  aiStockCandidate(player = this.currentPlayer) {
    const profile = AI_PROFILES[player.profile] || AI_PROFILES.growth;
    if (player.cash < profile.stockReserve) return null;
    const symbol = Object.entries(STOCKS)
      .sort(([a], [b]) => {
        const aScore = this.state.stocks[a].price / STOCKS[a].basePrice - STOCKS[a].dividend * 8;
        const bScore = this.state.stocks[b].price / STOCKS[b].basePrice - STOCKS[b].dividend * 8;
        return aScore - bScore;
      })[0]?.[0];
    if (!symbol) return null;
    const budget = Math.min(player.cash - profile.stockReserve * 0.7, player.cash * 0.16);
    const quantity = Math.min(6, Math.floor(budget / this.state.stocks[symbol].price));
    return quantity > 0 ? { symbol, quantity } : null;
  }
}

export function createEngineFromConfig(config) {
  return GameEngine.create(config);
}

export function groupMeta(group) {
  return GROUPS[group] || { name: group, color: "#68736e", ink: "#ffffff" };
}

export function propertyGroupIds(group) {
  return [...(PROPERTY_GROUPS[group] || [])];
}
