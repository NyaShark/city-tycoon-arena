import {
  AI_PROFILES,
  GROUPS,
  MARKET_STATES,
  PLAYER_COLORS,
  SETTINGS_PRESETS,
  STOCKS
} from "./data.js";
import {
  BAIL_COST,
  GameEngine,
  MAX_BUILDING_LEVEL,
  RuleError,
  groupMeta
} from "./engine.js";
import { icon } from "./icons.js";

const SAVE_KEY = "city-tycoon-arena-save-v1";
const SOUND_KEY = "city-tycoon-arena-sound";
const PLAYER_ROLES = {
  human: "真人",
  steady: "电脑 · 稳健",
  growth: "电脑 · 进取",
  bold: "电脑 · 冒险"
};

const PIP_LAYOUT = {
  1: [[50, 50]],
  2: [[29, 29], [71, 71]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[29, 29], [71, 29], [29, 71], [71, 71]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[29, 24], [71, 24], [29, 50], [71, 50], [29, 76], [71, 76]]
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class GameUI {
  constructor() {
    this.engine = null;
    this.busy = false;
    this.aiRunning = false;
    this.isPreview = true;
    this.activeTab = "manage";
    this.focusTileId = null;
    this.visualPosition = null;
    this.modalContext = null;
    this.setupConfig = this.defaultSetupConfig();
    this.savedRaw = null;
    this.setupPreviousPreview = true;
    this.winnerShownFor = null;
    this.soundEnabled = localStorage.getItem(SOUND_KEY) !== "off";
    this.audioContext = null;

    this.elements = {
      brandMark: document.getElementById("brand-mark"),
      soundButton: document.getElementById("sound-button"),
      newGameButton: document.getElementById("new-game-button"),
      roundValue: document.getElementById("round-value"),
      marketValue: document.getElementById("market-value"),
      potValue: document.getElementById("pot-value"),
      turnBadge: document.getElementById("turn-badge"),
      playerList: document.getElementById("player-list"),
      rankingList: document.getElementById("ranking-list"),
      board: document.getElementById("board"),
      boardStatus: document.getElementById("board-status"),
      saveState: document.getElementById("save-state"),
      activeToken: document.getElementById("active-token"),
      activeKind: document.getElementById("active-kind"),
      activeName: document.getElementById("active-name"),
      activeCash: document.getElementById("active-cash"),
      dieOne: document.getElementById("die-one"),
      dieTwo: document.getElementById("die-two"),
      primaryActions: document.getElementById("primary-actions"),
      turnMessage: document.getElementById("turn-message"),
      propertyFocus: document.getElementById("property-focus"),
      eventLog: document.getElementById("event-log"),
      logCount: document.getElementById("log-count"),
      assetList: document.getElementById("asset-list"),
      assetCount: document.getElementById("asset-count"),
      stockSummary: document.getElementById("stock-summary"),
      stockList: document.getElementById("stock-list"),
      marketNote: document.getElementById("market-note"),
      modalRoot: document.getElementById("modal-root"),
      toastRoot: document.getElementById("toast-root")
    };
  }

  init() {
    this.elements.brandMark.innerHTML = icon("building-2");
    this.updateSoundButton();
    this.elements.soundButton.addEventListener("click", () => this.toggleSound());
    this.elements.newGameButton.addEventListener("click", () => this.requestNewGame());
    this.bindEvents();
    this.restoreSavedPreview();
    this.render();
    this.openSetup();
  }

  defaultSetupConfig() {
    return {
      count: 4,
      preset: "standard",
      players: [
        { name: "城市新贵", role: "human" },
        { name: "阿衡", role: "growth" },
        { name: "林澈", role: "steady" },
        { name: "沈弦", role: "bold" }
      ]
    };
  }

  restoreSavedPreview() {
    this.savedRaw = localStorage.getItem(SAVE_KEY);
    if (this.savedRaw) {
      try {
        this.engine = GameEngine.fromJSON(this.savedRaw);
        this.isPreview = true;
        return;
      } catch {
        this.savedRaw = null;
        localStorage.removeItem(SAVE_KEY);
      }
    }
    this.engine = GameEngine.create();
    this.isPreview = true;
  }

  bindEvents() {
    document.addEventListener("click", (event) => this.handleDocumentClick(event));
    document.addEventListener("input", (event) => this.handleModalInput(event));
    document.addEventListener("change", (event) => this.handleModalInput(event));
    document.addEventListener("keydown", (event) => {
      if (
        event.key.toLowerCase() === "r" &&
        !this.busy &&
        !this.isPreview &&
        !this.modalContext &&
        !this.engine?.currentPlayer.isAI &&
        this.engine?.canRoll()
      ) {
        this.handleAction("roll");
      }
    });
  }

  handleDocumentClick(event) {
    const tab = event.target.closest(".tab-button");
    if (tab) {
      this.activeTab = tab.dataset.tab;
      this.renderTabs();
      return;
    }

    if (event.target === this.elements.modalRoot && this.modalContext === "confirm") {
      this.closeModal();
      return;
    }

    const tileNode = event.target.closest("[data-tile]");
    if (tileNode && tileNode.classList.contains("tile")) {
      const tileId = Number(tileNode.dataset.tile);
      const tile = this.engine?.tileById(tileId);
      if (tile && ["property", "station", "utility"].includes(tile.type)) {
        this.focusTileId = tileId;
        this.activeTab = "manage";
        this.render();
      }
      return;
    }

    const actionNode = event.target.closest("[data-action]");
    if (actionNode) {
      event.preventDefault();
      this.handleAction(actionNode.dataset.action, actionNode);
    }
  }

  handleModalInput(event) {
    if (this.modalContext !== "setup") return;
    const target = event.target;
    if (target.matches("[data-setup-name]")) {
      const index = Number(target.dataset.setupName);
      this.setupConfig.players[index].name = target.value;
    }
    if (target.matches("[data-setup-role]")) {
      const index = Number(target.dataset.setupRole);
      this.setupConfig.players[index].role = target.value;
    }
  }

  async handleAction(action, node) {
    try {
      if (action === "new-game") {
        this.requestNewGame();
        return;
      }
      if (action === "confirm-new") {
        this.closeModal();
        this.openSetup();
        return;
      }
      if (action === "cancel-new") {
        this.closeModal();
        return;
      }
      if (action === "close-setup") {
        this.closeSetup();
        return;
      }
      if (action === "start-game") {
        this.startGameFromSetup();
        return;
      }
      if (action === "resume-game") {
        this.resumeSavedGame();
        return;
      }
      if (action === "setup-count") {
        this.setupConfig.count = Number(node.dataset.count);
        this.renderSetup();
        return;
      }
      if (action === "setup-preset") {
        this.setupConfig.preset = node.dataset.preset;
        this.renderSetup();
        return;
      }
      if (action === "close-event") {
        this.closeModal();
        return;
      }
      if (action === "winner-new") {
        this.closeModal();
        this.openSetup();
        return;
      }
      if (!this.engine || this.isPreview || this.busy) return;

      if (action === "roll") {
        await this.humanRoll();
      } else if (action === "jail-roll") {
        await this.humanJailRoll();
      } else if (action === "bail") {
        this.engine.payBail();
        this.playSound("coin");
        this.saveAndRender();
      } else if (action === "buy") {
        this.engine.buyPendingProperty();
        this.playSound("buy");
        this.focusTileId = this.engine.currentPlayer.position;
        this.saveAndRender();
      } else if (action === "pass") {
        await this.humanPassProperty();
      } else if (action === "end-turn") {
        await this.humanEndTurn();
      } else if (action === "upgrade") {
        this.engine.upgradeProperty(Number(node.dataset.tileId));
        this.playSound("build");
        this.focusTileId = Number(node.dataset.tileId);
        this.saveAndRender();
      } else if (action === "sell-building") {
        this.engine.sellBuilding(Number(node.dataset.tileId));
        this.playSound("coin");
        this.saveAndRender();
      } else if (action === "mortgage") {
        this.engine.mortgageProperty(Number(node.dataset.tileId));
        this.playSound("coin");
        this.saveAndRender();
      } else if (action === "redeem") {
        this.engine.redeemProperty(Number(node.dataset.tileId));
        this.playSound("coin");
        this.saveAndRender();
      } else if (action === "buy-stock") {
        this.engine.buyStock(node.dataset.symbol, 1);
        this.playSound("buy");
        this.saveAndRender();
      } else if (action === "sell-stock") {
        this.engine.sellStock(node.dataset.symbol, 1);
        this.playSound("coin");
        this.saveAndRender();
      } else if (action === "auction-bid") {
        await this.humanAuctionAction("bid");
      } else if (action === "auction-pass") {
        await this.humanAuctionAction("pass");
      }

      this.maybeShowWinner();
    } catch (error) {
      if (error instanceof RuleError) {
        this.toast(error.message, "cost");
      } else {
        console.error(error);
        this.toast("操作未完成，请重试", "cost");
      }
    }
  }

  requestNewGame() {
    if (!this.engine || this.isPreview) {
      this.openSetup();
      return;
    }
    this.modalContext = "confirm";
    this.elements.modalRoot.innerHTML = `
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="dialog-head">
          <div>
            <span class="eyebrow">NEW CITY</span>
            <h2 id="confirm-title">重开一局？</h2>
          </div>
          <button class="icon-button dialog-close" type="button" data-action="cancel-new" aria-label="关闭">${icon("x")}</button>
        </div>
        <div class="dialog-body">
          <p class="confirm-copy">当前对局将被新对局替换，已有本地存档也会更新。</p>
        </div>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" data-action="cancel-new">保留对局</button>
          <button class="primary-button" type="button" data-action="confirm-new">${icon("refresh")} 重开一局</button>
        </div>
      </section>
    `;
  }

  openSetup() {
    this.setupPreviousPreview = this.isPreview;
    if (this.engine?.phase === "playing" && !this.isPreview) {
      this.setupConfig = {
        count: this.engine.state.players.length,
        preset: this.engine.state.preset || "standard",
        players: this.engine.state.players.map((player) => ({
          name: player.name,
          role: player.isAI ? player.profile : "human"
        }))
      };
    }
    this.renderSetup();
  }

  renderSetup() {
    this.modalContext = "setup";
    const canClose = Boolean(this.engine);
    const players = Array.from({ length: this.setupConfig.count }, (_, index) => {
      const player = this.setupConfig.players[index] || {
        name: `玩家 ${index + 1}`,
        role: index === 0 ? "human" : "growth"
      };
      const color = PLAYER_COLORS[index];
      const roleOptions = Object.entries(PLAYER_ROLES)
        .map(
          ([value, label]) =>
            `<option value="${value}" ${player.role === value ? "selected" : ""}>${label}</option>`
        )
        .join("");
      return `
        <label class="player-config">
          <span class="config-color" style="--player-color:${color.color}"></span>
          <input class="text-input" data-setup-name="${index}" maxlength="12" value="${escapeAttr(player.name)}" aria-label="玩家 ${index + 1} 名称" />
          <select class="select-input" data-setup-role="${index}" aria-label="玩家 ${index + 1} 类型">${roleOptions}</select>
        </label>
      `;
    }).join("");

    this.elements.modalRoot.innerHTML = `
      <section class="setup-screen" role="dialog" aria-modal="true" aria-labelledby="game-title">
        <div class="setup-visual">
          ${this.setupArtwork()}
          <div class="setup-visual-copy">
            <span class="eyebrow">CITY TYCOON</span>
            <h1 id="game-title">都市大亨<span>环城争霸</span></h1>
            <p>地产 · 拍卖 · 股市 · 市场周期</p>
          </div>
        </div>
        <div class="setup-form">
          <div class="setup-form-head">
            <div>
              <span class="eyebrow">NEW SESSION</span>
              <h2>组建你的城市</h2>
            </div>
            ${canClose ? `<button class="icon-button setup-close" type="button" data-action="close-setup" aria-label="关闭">${icon("x")}</button>` : ""}
          </div>
          <div class="setting-group">
            <div class="setting-label"><span>玩家席位</span><span>${this.setupConfig.count} 人</span></div>
            <div class="segmented" style="--segments:3">
              ${[2, 3, 4].map((count) => `<button type="button" class="${count === this.setupConfig.count ? "active" : ""}" data-action="setup-count" data-count="${count}">${count} 人</button>`).join("")}
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-label"><span>对局规模</span><span>起始资金</span></div>
            <div class="segmented" style="--segments:3">
              ${Object.entries(SETTINGS_PRESETS).map(([key, preset]) => `<button type="button" class="${key === this.setupConfig.preset ? "active" : ""}" data-action="setup-preset" data-preset="${key}">${preset.name}<br><small>${formatMoney(preset.startingCash)}</small></button>`).join("")}
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-label"><span>席位配置</span><span>真人 / 电脑</span></div>
            <div class="player-configs">${players}</div>
          </div>
          <div class="setup-footer">
            <button class="primary-button dark" type="button" data-action="start-game">${icon("play")} 开始城市争霸</button>
            ${this.savedRaw ? `<button class="secondary-button resume-button" type="button" data-action="resume-game">${icon("rotate-ccw")} 继续上局</button>` : ""}
          </div>
        </div>
      </section>
    `;
  }

  closeSetup() {
    if (!this.engine) return;
    this.isPreview = false;
    this.closeModal();
    this.render();
  }

  resumeSavedGame() {
    if (!this.savedRaw) return;
    try {
      this.engine = GameEngine.fromJSON(this.savedRaw);
      this.isPreview = false;
      this.winnerShownFor = null;
      this.focusTileId = this.engine.currentPlayer.position;
      this.closeModal();
      this.render();
      this.maybeShowWinner();
      if (this.engine.currentPlayer.isAI) setTimeout(() => this.runAiTurn(), 500);
    } catch {
      localStorage.removeItem(SAVE_KEY);
      this.savedRaw = null;
      this.toast("存档无法读取", "cost");
      this.renderSetup();
    }
  }

  startGameFromSetup() {
    const activePlayers = this.setupConfig.players.slice(0, this.setupConfig.count);
    if (!activePlayers.some((player) => player.role === "human")) {
      this.toast("至少需要一位真人玩家");
      return;
    }
    const players = activePlayers.map((player, index) => ({
      name: String(player.name || `玩家 ${index + 1}`).trim().slice(0, 12) || `玩家 ${index + 1}`,
      isAI: player.role !== "human",
      profile: player.role === "human" ? "growth" : player.role
    }));
    this.engine = GameEngine.create({
      preset: this.setupConfig.preset,
      players
    });
    this.isPreview = false;
    this.busy = false;
    this.aiRunning = false;
    this.winnerShownFor = null;
    this.focusTileId = null;
    this.activeTab = "manage";
    this.engine.pushLog(
      `${this.engine.state.players.length} 位玩家进入城市，初始资金 ${formatMoney(this.engine.state.startingCash)}`,
      "event",
      "building"
    );
    this.closeModal();
    this.saveState();
    this.render();
    this.playSound("start");
    if (this.engine.currentPlayer.isAI) setTimeout(() => this.runAiTurn(), 600);
  }

  closeModal() {
    this.modalContext = null;
    this.elements.modalRoot.innerHTML = "";
  }

  saveState() {
    if (!this.engine || this.isPreview) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.engine.toJSON()));
      this.savedRaw = localStorage.getItem(SAVE_KEY);
      const time = new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date());
      this.elements.saveState.textContent = `已保存 ${time}`;
      this.elements.saveState.classList.add("saving");
      setTimeout(() => this.elements.saveState.classList.remove("saving"), 500);
    } catch {
      this.elements.saveState.textContent = "本地存档不可用";
    }
  }

  saveAndRender() {
    this.saveState();
    this.render();
  }

  render() {
    if (!this.engine) return;
    this.renderMeta();
    this.renderPlayers();
    this.renderActivePlayer();
    this.renderDice(this.engine.state.dice);
    this.renderPrimaryActions();
    this.renderBoard();
    this.renderTabs();
    this.renderFocus();
    this.renderLogs();
    this.renderAssets();
    this.renderStocks();
  }

  renderMeta() {
    const state = this.engine.state;
    const market = this.engine.marketMeta;
    this.elements.roundValue.textContent = String(state.round).padStart(2, "0");
    this.elements.marketValue.textContent = market.short;
    this.elements.marketValue.style.color = market.color;
    this.elements.potValue.textContent = formatMoney(state.parkPot);
    const current = this.engine.currentPlayer;
    this.elements.turnBadge.textContent = this.engine.isGameOver ? "对局结束" : `${current.name} 行动`;
    this.elements.turnBadge.classList.toggle("active", !current.isAI && !this.engine.isGameOver);
    this.elements.boardStatus.textContent = this.engine.isGameOver
      ? "城市版图已经定局"
      : `${MARKET_STATES[state.market].name} · ${state.turnNumber} 次行动`;
  }

  renderPlayers() {
    const state = this.engine.state;
    this.elements.playerList.innerHTML = state.players
      .map((player, index) => {
        const active = index === state.currentPlayerIndex && !this.engine.isGameOver;
        const ownedCount = this.engine.ownedTiles(player.id).length;
        const shares = totalShares(player);
        return `
          <article class="player-card ${active ? "active" : ""} ${player.bankrupt ? "bankrupt" : ""}" style="--player-color:${player.color};--player-pale:${player.pale}">
            <div class="player-card-head">
              <span class="player-token" style="--player-color:${player.color}">${index + 1}</span>
              <span class="player-card-name">${escapeHtml(player.name)}</span>
              <span class="player-tag">${player.isAI ? AI_PROFILES[player.profile].name : "真人"}</span>
            </div>
            <div class="player-card-money">
              <strong>${formatMoney(player.cash)}</strong>
              <span>现金</span>
            </div>
            <div class="player-card-meta">
              <span>${ownedCount} 处地产</span>
              <span>${shares} 股</span>
              <span>${player.inJail ? "拘押中" : player.bankrupt ? "出局" : "经营中"}</span>
            </div>
          </article>
        `;
      })
      .join("");

    const ranked = [...state.players].sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return this.engine.netWorth(b.id) - this.engine.netWorth(a.id);
    });
    this.elements.rankingList.innerHTML = ranked
      .map(
        (player, index) => `
          <div class="ranking-row">
            <span class="ranking-index">${index + 1}</span>
            <span class="ranking-name">${escapeHtml(player.name)}</span>
            <span class="ranking-value">${player.bankrupt ? "—" : formatMoney(this.engine.netWorth(player.id))}</span>
          </div>
        `
      )
      .join("");
  }

  renderActivePlayer() {
    const player = this.engine.currentPlayer;
    const index = this.engine.state.currentPlayerIndex;
    this.elements.activeToken.textContent = player.isAI ? AI_PROFILES[player.profile].name.slice(0, 1) : "你";
    this.elements.activeToken.style.setProperty("--player-color", player.color);
    this.elements.activeKind.textContent = player.isAI ? `AI · ${AI_PROFILES[player.profile].name}` : "HUMAN PLAYER";
    this.elements.activeName.textContent = player.name;
    this.elements.activeCash.textContent = formatMoney(player.cash);
    this.elements.activeToken.setAttribute("aria-label", `玩家 ${index + 1}`);
  }

  renderDice(values) {
    this.elements.dieOne.innerHTML = this.pips(values?.[0] || 1);
    this.elements.dieTwo.innerHTML = this.pips(values?.[1] || 1);
  }

  pips(value) {
    return (PIP_LAYOUT[value] || PIP_LAYOUT[1])
      .map(
        ([left, top]) =>
          `<span class="pip" style="left:${left}%;top:${top}%"></span>`
      )
      .join("");
  }

  renderPrimaryActions() {
    const current = this.engine.currentPlayer;
    let content = "";

    if (this.engine.isGameOver) {
      content = `<button class="primary-button dark" type="button" data-action="new-game">${icon("refresh")} 开启下一局</button>`;
    } else if (this.busy) {
      content = `<button class="primary-button dark" type="button" disabled>${icon("dice")} 城市结算中</button>`;
    } else if (current.isAI) {
      content = `<button class="primary-button dark" type="button" disabled>${icon("briefcase")} AI 正在规划</button>`;
    } else if (this.engine.state.pendingAuction) {
      content = `<button class="primary-button dark" type="button" disabled>${icon("gavel")} 公开拍卖中</button>`;
    } else if (this.engine.state.pendingPurchase) {
      const tile = this.engine.tileById(this.engine.state.pendingPurchase.tileId);
      content = `
        <div class="action-row">
          <button class="primary-button teal" type="button" data-action="buy" ${current.cash < tile.price ? "disabled" : ""}>${icon("key")} 买入 ${formatMoney(tile.price)}</button>
          <button class="secondary-button" type="button" data-action="pass">${icon("gavel")} 拍卖</button>
        </div>
      `;
    } else if (!this.engine.state.hasRolled) {
      if (current.inJail) {
        content = `
          <button class="primary-button" type="button" data-action="jail-roll">${icon("dice")} 尝试双点</button>
          <button class="secondary-button" type="button" data-action="bail">${icon("unlock")} 保释 ${formatMoney(BAIL_COST)}</button>
        `;
      } else {
        content = `<button class="primary-button" type="button" data-action="roll">${icon("dice")} 掷骰前进</button>`;
      }
    } else {
      content = `<button class="primary-button dark" type="button" data-action="end-turn">${icon("arrow-right")} ${this.engine.state.extraTurn ? "额外行动" : "结束回合"}</button>`;
    }
    this.elements.primaryActions.innerHTML = content;

    const tile = this.engine.tileById(current.position);
    let message = "城市项目等待你的决策。";
    if (this.engine.state.pendingPurchase) {
      const pendingTile = this.engine.tileById(this.engine.state.pendingPurchase.tileId);
      message = `${current.name} 抵达 ${pendingTile.name}，报价 ${formatMoney(pendingTile.price)}。`;
    } else if (current.inJail && !this.engine.state.hasRolled) {
      message = `${current.name} 被拘押，可支付保释金或尝试掷出双点。`;
    } else if (this.engine.state.extraTurn) {
      message = `${current.name} 掷出双点，本次行动结束后可以继续掷骰。`;
    } else if (this.engine.state.hasRolled) {
      message = tile ? `${current.name} 停在 ${tile.name}，可整理资产后结束回合。` : "本回合已经完成。";
    } else if (current.isAI) {
      message = `${current.name} 正在评估现金、租金与组合价值。`;
    }
    this.elements.turnMessage.textContent = message;
  }

  renderBoard() {
    const board = this.elements.board;
    const tiles = this.engine.tileList
      .map((tile) => this.tileMarkup(tile))
      .join("");
    board.innerHTML = `${this.centerMarkup()}${tiles}`;
  }

  tileMarkup(tile) {
    const [row, column] = gridPlacement(tile.id);
    const edge = edgeFor(tile.id);
    const group = groupMeta(tile.group);
    const owner = tile.owner ? this.engine.playerById(tile.owner) : null;
    const tokens = this.engine.state.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => {
        if (this.visualPosition && this.visualPosition.playerId === player.id) {
          return this.visualPosition.position === tile.id;
        }
        return player.position === tile.id && !player.bankrupt;
      })
      .map(
        ({ player, index }) =>
          `<span class="player-token" style="--player-color:${player.color}" title="${escapeAttr(player.name)}">${index + 1}</span>`
      )
      .join("");
    const buildings =
      tile.level > 0
        ? `<span class="tile-buildings">${Array.from({ length: tile.level }, () => '<i class="building-dot"></i>').join("")}</span>`
        : "";
    const classes = [
      "tile",
      tile.corner ? "corner" : "",
      tile.type === "event" ? "special-event" : "",
      ["tax", "wealthTax"].includes(tile.type) ? "special-tax" : "",
      owner ? "owned" : ""
    ]
      .filter(Boolean)
      .join(" ");
    const price =
      tile.price != null
        ? `<span class="tile-price">${formatCompactMoney(tile.price)}</span>`
        : "";
    const label = tile.owner
      ? `${tile.name}，持有人 ${this.engine.playerById(tile.owner).name}`
      : tile.price
        ? `${tile.name}，售价 ${tile.price} 元`
        : tile.name;

    return `
      <div
        class="${classes}"
        style="grid-row:${row};grid-column:${column};--group-color:${group.color};--owner-color:${owner?.color || "transparent"};--owner-pale:${owner?.pale || "transparent"}"
        data-tile="${tile.id}"
        data-edge="${edge}"
        aria-label="${escapeAttr(label)}"
        title="${escapeAttr(label)}"
      >
        ${tile.group ? '<span class="tile-band"></span>' : ""}
        <span class="tile-icon">${icon(tile.icon || "dot")}</span>
        <span class="tile-name">${escapeHtml(tile.name)}</span>
        ${price}
        ${tile.mortgage ? '<span class="mortgage-mark">押</span>' : ""}
        ${buildings}
        ${tokens ? `<span class="token-stack">${tokens}</span>` : ""}
      </div>
    `;
  }

  centerMarkup() {
    const state = this.engine.state;
    const market = this.engine.marketMeta;
    const marketIndex = ["recession", "stable", "boom"].indexOf(state.market);
    const propertyCount = state.tiles.filter((tile) => tile.owner).length;
    const leader = [...state.players]
      .filter((player) => !player.bankrupt)
      .sort((a, b) => this.engine.netWorth(b.id) - this.engine.netWorth(a.id))[0];
    return `
      <div class="board-center" aria-label="环城棋盘中央">
        ${this.centerArtwork()}
        <div class="center-content">
          <span class="center-kicker">CITY DEVELOPMENT INDEX</span>
          <h2 class="center-title">都市大亨<span>环城争霸</span></h2>
          <div class="center-subtitle">地产 · 资本 · 城市控制权</div>
          <div class="market-dial" style="--market-color:${market.color}">
            <div class="market-dial-head">
              <span>MARKET / RENT INDEX</span>
              <strong>${market.name}</strong>
            </div>
            <div class="market-track">
              ${["调整期", "平稳期", "扩张期"].map((name, index) => `<span class="market-step ${index === marketIndex ? "active" : ""}"></span>`).join("")}
            </div>
          </div>
          <div class="center-stats">
            <div class="center-stat"><small>已成交地产</small><b>${propertyCount} / ${state.tiles.filter((tile) => tile.price).length}</b></div>
            <div class="center-stat"><small>城市基金</small><b>${formatCompactMoney(state.parkPot)}</b></div>
            <div class="center-stat"><small>资产领先</small><b>${escapeHtml(leader?.name || "—")}</b></div>
          </div>
        </div>
      </div>
    `;
  }

  centerArtwork() {
    return `
      <svg class="center-art" viewBox="0 0 700 700" aria-hidden="true">
        <rect width="700" height="700" fill="#e9e2d5"/>
        <g opacity=".65">
          <path d="M0 108h700M0 204h700M0 506h700M0 602h700M104 0v700M202 0v700M502 0v700M602 0v700" stroke="#cfc7b8" stroke-width="2"/>
          <path d="M0 156h700M0 553h700M154 0v700M553 0v700" stroke="#d8d0c2" stroke-width="12"/>
        </g>
        <g stroke="#bdb4a4" stroke-width="1.5">
          <path d="M158 156h44v48h-44zM306 156h44v48h-44zM454 156h44v48h-44zM158 302h44v48h-44zM454 302h44v48h-44zM158 448h44v48h-44zM306 448h44v48h-44zM454 448h44v48h-44z" fill="#d6cebf"/>
          <path d="M220 156h68v48h-68zM390 156h48v48h-48zM158 220h44v64h-44zM306 220h44v64h-44zM454 220h44v64h-44zM220 302h68v48h-68zM390 302h48v48h-48zM158 366h44v64h-44zM306 366h44v64h-44zM454 366h44v64h-44zM220 448h68v48h-68zM390 448h48v48h-48z" fill="#ded7ca"/>
        </g>
        <g opacity=".9">
          <path d="M540 42h42v42h-42zM590 42h42v42h-42zM42 540h42v42H42zM590 540h42v42h-42z" fill="#cf7b61"/>
          <path d="M42 590h42v42H42zM590 590h42v42h-42z" fill="#4f8b7e"/>
          <path d="M540 590h42v42h-42z" fill="#d3a128"/>
        </g>
        <path d="M552 98 528 174h48l-24-76Z" fill="#b8653a"/>
        <path d="M92 112h64v70H92z" fill="#3977a8"/>
        <path d="M114 88h20v24h-20z" fill="#3977a8"/>
        <path d="M540 410h78v84h-78z" fill="#8559a8"/>
        <path d="M84 410h70v84H84z" fill="#c7453d"/>
      </svg>
    `;
  }

  renderTabs() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === this.activeTab);
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === `tab-${this.activeTab}`);
    });
  }

  renderFocus() {
    const pending = this.engine.state.pendingPurchase;
    const candidateId = pending?.tileId ?? this.focusTileId ?? this.engine.currentPlayer.position;
    const tile = this.engine.tileById(candidateId);
    if (!tile || !this.engine.isOwnable(tile)) {
      this.elements.propertyFocus.innerHTML = `<div class="focus-empty">城市地产档案将在这里显示。</div>`;
      return;
    }

    const group = groupMeta(tile.group);
    const owner = tile.owner ? this.engine.playerById(tile.owner) : null;
    const rent = tile.owner ? this.engine.getRent(tile, 7) : Math.round(tile.baseRent * this.engine.marketMeta.rent);
    const levelText = tile.type === "property" ? `${tile.level} / ${MAX_BUILDING_LEVEL}` : "—";
    const status = tile.mortgage ? "抵押中" : owner ? owner.name : "待售";
    const fullGroup = tile.owner ? this.engine.ownsFullGroup(tile, tile.owner) : false;
    let actionMarkup = "";
    if (pending?.tileId === tile.id) {
      actionMarkup = `
        <div class="action-row" style="margin-top:9px">
          <button class="primary-button teal" type="button" data-action="buy" ${this.engine.currentPlayer.cash < tile.price ? "disabled" : ""}>${icon("key")} 买入</button>
          <button class="secondary-button" type="button" data-action="pass">${icon("gavel")} 拍卖</button>
        </div>
      `;
    }
    this.elements.propertyFocus.innerHTML = `
      <article class="focus-card" style="--group-color:${group.color}">
        <div class="focus-card-head">
          <div>
            <span class="eyebrow">${escapeHtml(group.name)}</span>
            <h3>${escapeHtml(tile.name)}</h3>
          </div>
          <strong class="focus-price">${tile.price ? formatMoney(tile.price) : "—"}</strong>
        </div>
        <div class="focus-stats">
          <div class="focus-stat"><small>当前租金</small><b>${formatMoney(rent)}</b></div>
          <div class="focus-stat"><small>建筑等级</small><b>${levelText}</b></div>
          <div class="focus-stat"><small>持有状态</small><b>${escapeHtml(status)}</b></div>
        </div>
        <p>${fullGroup ? "该街区已经形成完整组合，基础租金翻倍。" : `${escapeHtml(group.name)}组合会提高租金与控制力。`}</p>
        ${actionMarkup}
      </article>
    `;
  }

  renderLogs() {
    const logs = this.engine.state.logs;
    this.elements.logCount.textContent = logs.length;
    this.elements.eventLog.innerHTML = logs
      .slice(0, 24)
      .map(
        (log) => `
          <li class="log-item">
            <span class="log-icon">${icon(log.icon)}</span>
            <span class="log-copy" data-tone="${log.tone}">
              ${escapeHtml(log.text)}
              <small class="log-meta">第 ${log.round} 回合</small>
            </span>
          </li>
        `
      )
      .join("");
  }

  renderAssets() {
    const player = this.engine.currentPlayer;
    const assets = this.engine.ownedTiles(player.id).sort((a, b) => a.id - b.id);
    const canManage =
      !player.isAI && !this.busy && !this.engine.state.pendingAuction && !this.engine.state.pendingPurchase;
    this.elements.assetCount.textContent = assets.length;
    if (!assets.length) {
      this.elements.assetList.className = "asset-list empty-state";
      this.elements.assetList.innerHTML = `<p>${escapeHtml(player.name)} 尚未持有地产。</p>`;
    } else {
      this.elements.assetList.className = "asset-list";
      this.elements.assetList.innerHTML = assets
        .map((tile) => {
          const group = groupMeta(tile.group);
          const upgrade = this.engine.getUpgradeStatus(tile.id, player.id);
          const isProperty = tile.type === "property";
          const actions = [
            isProperty
              ? `<button class="mini-button" type="button" data-action="upgrade" data-tile-id="${tile.id}" ${!canManage || !upgrade.allowed ? "disabled" : ""} title="${escapeAttr(upgrade.reason || "升级建筑")}">${icon("building")}升级 ${formatCompactMoney(tile.upgradeCost)}</button>`
              : "",
            tile.level > 0
              ? `<button class="mini-button" type="button" data-action="sell-building" data-tile-id="${tile.id}" ${!canManage ? "disabled" : ""}>${icon("hammer")}拆除</button>`
              : "",
            tile.mortgage
              ? `<button class="mini-button" type="button" data-action="redeem" data-tile-id="${tile.id}" ${!canManage ? "disabled" : ""}>${icon("key")}赎回 ${formatCompactMoney(Math.ceil(tile.price * 0.55))}</button>`
              : `<button class="mini-button" type="button" data-action="mortgage" data-tile-id="${tile.id}" ${!canManage || tile.level > 0 ? "disabled" : ""}>${icon("banknote")}抵押 ${formatCompactMoney(Math.floor(tile.price * 0.5))}</button>`
          ]
            .filter(Boolean)
            .join("");
          return `
            <article class="asset-item" style="--group-color:${group.color}">
              <div class="asset-main">
                <div class="asset-title">
                  <strong>${escapeHtml(tile.name)}</strong>
                  <span>${formatMoney(this.engine.getRent(tile, 7))}</span>
                </div>
                <div class="asset-meta">
                  <span>${escapeHtml(group.name)}</span>
                  <span>${tile.mortgage ? "抵押" : tile.level ? `${tile.level} 级` : "空地"}</span>
                  <span>${tile.type === "station" ? "交通" : tile.type === "utility" ? "公用" : "地产"}</span>
                </div>
              </div>
              <div class="asset-actions">${actions}</div>
            </article>
          `;
        })
        .join("");
    }

    const shares = Object.entries(player.stocks).filter(([, count]) => count > 0);
    this.elements.stockSummary.innerHTML = `
      <h3>投资组合</h3>
      ${
        shares.length
          ? shares
              .map(
                ([symbol, count]) =>
                  `<div class="portfolio-row"><span>${STOCKS[symbol].name}</span><strong>${count} 股 · ${formatMoney(count * this.engine.state.stocks[symbol].price)}</strong></div>`
              )
              .join("")
          : `<div class="portfolio-row"><span>暂无持仓</span><strong>${formatMoney(0)}</strong></div>`
      }
      <div class="portfolio-row"><span>股票总市值</span><strong>${formatMoney(this.engine.stockValue(player.id))}</strong></div>
    `;
  }

  renderStocks() {
    const player = this.engine.currentPlayer;
    const canTrade =
      !player.isAI && !this.busy && !this.engine.state.pendingAuction && !this.engine.state.pendingPurchase;
    this.elements.stockList.innerHTML = Object.entries(STOCKS)
      .map(([symbol, meta]) => {
        const stock = this.engine.state.stocks[symbol];
        const change = stock.price - stock.previous;
        const percent = stock.previous ? (change / stock.previous) * 100 : 0;
        const held = player.stocks[symbol];
        return `
          <article class="stock-item" style="--stock-color:${meta.color}">
            <div class="stock-head">
              <div>
                <span class="stock-symbol">${meta.symbol}</span>
                <span class="stock-name">${meta.name}</span>
              </div>
              <div class="stock-price">
                <strong>${stock.price.toFixed(2)}</strong>
                <span class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${percent.toFixed(2)}%</span>
              </div>
            </div>
            <div class="stock-holdings">
              <span>持有 ${held} 股</span>
              <span>股息率 ${(meta.dividend * 100).toFixed(1)}%</span>
            </div>
            <div class="stock-actions">
              <button class="secondary-button" type="button" data-action="buy-stock" data-symbol="${symbol}" ${!canTrade || player.cash < stock.price ? "disabled" : ""}>${icon("arrow-up")} 买 1</button>
              <button class="secondary-button" type="button" data-action="sell-stock" data-symbol="${symbol}" ${!canTrade || held < 1 ? "disabled" : ""}>${icon("arrow-down")} 卖 1</button>
            </div>
          </article>
        `;
      })
      .join("");
    this.elements.marketNote.textContent = `${this.engine.marketMeta.note}。股价每回合波动，经过启程时按持仓发放股息。`;
  }

  async humanRoll() {
    if (this.busy || !this.engine.canRoll()) return;
    this.busy = true;
    this.render();
    try {
      const result = this.engine.rollDice();
      await this.animateRollResult(result);
      this.focusTileId = result.path.at(-1) ?? this.engine.currentPlayer.position;
      this.saveState();
      this.busy = false;
      this.render();
      await this.presentLanding(result);
      this.maybeShowWinner();
    } finally {
      this.busy = false;
      this.render();
    }
  }

  async humanJailRoll() {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      const result = this.engine.attemptJailRoll();
      await this.animateRollResult(result);
      this.focusTileId = this.engine.currentPlayer.position;
      this.saveState();
      this.busy = false;
      this.render();
      if (result.released) this.toast("掷出双点，解除拘押");
      await this.presentLanding(result);
      this.maybeShowWinner();
    } finally {
      this.busy = false;
      this.render();
    }
  }

  async animateRollResult(result) {
    this.playSound("roll");
    const diceNodes = [this.elements.dieOne, this.elements.dieTwo];
    diceNodes.forEach((node) => node.classList.add("rolling"));
    for (let turn = 0; turn < 7; turn += 1) {
      this.elements.dieOne.innerHTML = this.pips(randomDie());
      this.elements.dieTwo.innerHTML = this.pips(randomDie());
      await wait(58);
    }
    diceNodes.forEach((node) => node.classList.remove("rolling"));
    this.renderDice(result.dice);
    await wait(170);

    if (result.path?.length) {
      for (const position of result.path) {
        this.visualPosition = { playerId: result.playerId, position };
        this.renderBoard();
        this.playSound("step");
        await wait(105);
      }
      this.visualPosition = null;
      this.renderBoard();
      const tileNode = this.elements.board.querySelector(
        `.tile[data-tile="${this.engine.currentPlayer.position}"]`
      );
      if (tileNode) {
        tileNode.classList.add("just-landed");
        setTimeout(() => tileNode.classList.remove("just-landed"), 800);
      }
    } else {
      this.renderBoard();
    }
  }

  async presentLanding(result) {
    if (!result) return;
    if (result.triple) {
      this.toast("连续三次同点，直接进入看守所", "cost");
      return;
    }
    if (result.landing?.kind === "event" && result.landing.card) {
      this.showEventModal(result.landing.card);
      return;
    }
    if (result.landing?.kind === "purchase") {
      this.activeTab = "manage";
      this.focusTileId = result.landing.tileId;
      this.render();
      return;
    }
    if (result.landing?.kind === "jail") {
      this.toast("违规稽查：立即进入看守所", "cost");
    } else if (result.landing?.kind === "park" && result.landing.amount > 0) {
      this.toast(`领取城市基金 ${formatMoney(result.landing.amount)}`, "good");
    } else if (result.landing?.kind === "hall") {
      this.toast("市政补贴到账，市场周期向前推进", "good");
    }
  }

  async humanEndTurn() {
    if (this.busy) return;
    this.engine.endTurn();
    this.saveState();
    this.focusTileId = null;
    this.render();
    this.playSound("end");
    if (this.engine.currentPlayer.isAI) setTimeout(() => this.runAiTurn(), 450);
  }

  async humanPassProperty() {
    if (this.busy) return;
    this.busy = true;
    this.engine.declinePendingProperty();
    this.saveAndRender();
    const outcome = await this.runAuctionUntilHuman();
    this.busy = false;
    this.render();
    if (outcome === "human") {
      this.openAuctionModal();
    } else if (this.engine.currentPlayer.isAI) {
      setTimeout(() => this.runAiTurn(), 350);
    }
  }

  async runAuctionUntilHuman() {
    let guard = 30;
    while (this.engine.state.pendingAuction && guard > 0) {
      guard -= 1;
      const bidder = this.engine.auctionCurrentBidder;
      if (!bidder) break;
      if (!bidder.isAI) return "human";
      await wait(560);
      const choice = this.engine.aiAuctionChoice();
      if (choice.action === "bid") {
        this.engine.auctionBid();
      } else {
        this.engine.auctionPass();
      }
      this.saveState();
      this.render();
      await wait(180);
    }
    return this.engine.state.pendingAuction ? "human" : "resolved";
  }

  async humanAuctionAction(action) {
    if (!this.engine.state.pendingAuction || this.busy) return;
    this.busy = true;
    this.playSound(action === "bid" ? "coin" : "end");
    if (action === "bid") {
      this.engine.auctionBid();
    } else {
      this.engine.auctionPass();
    }
    this.saveState();
    this.elements.modalRoot.innerHTML = "";
    this.modalContext = null;
    const outcome = await this.runAuctionUntilHuman();
    this.busy = false;
    this.render();
    if (outcome === "human") {
      this.openAuctionModal();
    } else {
      this.closeModal();
      this.render();
      if (this.engine.currentPlayer.isAI) setTimeout(() => this.runAiTurn(), 400);
    }
  }

  openAuctionModal() {
    const auction = this.engine.state.pendingAuction;
    const bidder = this.engine.auctionCurrentBidder;
    if (!auction || !bidder) return;
    this.modalContext = "auction";
    const tile = this.engine.tileById(auction.tileId);
    const minimum = this.engine.auctionMinimumBid;
    const activeRows = this.engine.activePlayers
      .map((player) => {
        const active = auction.active.includes(player.id);
        const isCurrent = bidder.id === player.id;
        const bid = auction.bids.find((entry) => entry.playerId === player.id);
        return `
          <div class="auction-bidder ${isCurrent ? "current" : ""} ${!active ? "out" : ""}">
            <span class="player-token" style="--player-color:${player.color}">${player.colorIndex + 1}</span>
            <span>${escapeHtml(player.name)}${player.id === auction.highBidder ? " · 领先" : ""}</span>
            <strong>${!active ? "退出" : bid ? formatMoney(bid.amount) : "等待"}</strong>
          </div>
        `;
      })
      .join("");
    const history = auction.bids.length
      ? `<ol class="auction-history">${auction.bids
          .map(
            (bid) =>
              `<li>${escapeHtml(this.engine.playerById(bid.playerId)?.name || "玩家")} · ${formatMoney(bid.amount)}</li>`
          )
          .join("")}</ol>`
      : "";
    this.elements.modalRoot.innerHTML = `
      <section class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="auction-title">
        <div class="dialog-head">
          <div>
            <span class="eyebrow">PUBLIC AUCTION</span>
            <h2 id="auction-title">${escapeHtml(tile.name)}</h2>
          </div>
          <span class="player-token large-token" style="--player-color:${bidder.color}">${bidder.colorIndex + 1}</span>
        </div>
        <div class="dialog-body">
          <div class="auction-summary">
            <div class="auction-stat"><small>当前报价</small><strong>${auction.currentBid ? formatMoney(auction.currentBid) : "—"}</strong></div>
            <div class="auction-stat"><small>最低加价</small><strong>${formatMoney(minimum)}</strong></div>
            <div class="auction-stat"><small>地产估值</small><strong>${formatMoney(tile.price)}</strong></div>
          </div>
          <div class="auction-bidders">${activeRows}</div>
          ${history}
        </div>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" data-action="auction-pass">退出竞拍</button>
          <button class="primary-button teal" type="button" data-action="auction-bid" ${bidder.cash < minimum ? "disabled" : ""}>
            ${icon("gavel")} 出价 ${formatMoney(minimum)}
          </button>
        </div>
      </section>
    `;
  }

  showEventModal(card) {
    this.modalContext = "event";
    this.elements.modalRoot.innerHTML = `
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="event-title">
        <div class="dialog-head">
          <div>
            <span class="eyebrow">CITY EVENT</span>
            <h2 id="event-title">城市事件</h2>
          </div>
          <button class="icon-button dialog-close" type="button" data-action="close-event" aria-label="关闭">${icon("x")}</button>
        </div>
        <div class="dialog-body">
          <article class="event-card">
            <span class="event-icon" style="--event-color:${this.engine.marketMeta.color}">${icon(card.icon)}</span>
            <span class="eyebrow">${escapeHtml(card.kicker)}</span>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </article>
        </div>
        <div class="dialog-actions">
          <button class="primary-button dark" type="button" data-action="close-event">${icon("check")} 收下事件</button>
        </div>
      </section>
    `;
    this.playSound("event");
  }

  async runAiTurn() {
    if (
      this.aiRunning ||
      this.busy ||
      this.isPreview ||
      this.engine.isGameOver ||
      !this.engine.currentPlayer.isAI ||
      this.engine.state.pendingAuction ||
      this.engine.state.pendingPurchase
    ) {
      return;
    }
    this.aiRunning = true;
    this.busy = true;
    this.render();
    try {
      let turns = 0;
      while (
        this.engine.currentPlayer.isAI &&
        !this.engine.isGameOver &&
        turns < 8
      ) {
        turns += 1;
        const player = this.engine.currentPlayer;
        this.focusTileId = player.position;
        this.activeTab = "manage";
        this.render();
        await wait(620);

        if (player.inJail && !this.engine.state.hasRolled) {
          const profile = AI_PROFILES[player.profile] || AI_PROFILES.growth;
          if (player.jailTurns >= 1 && player.cash > Math.max(700, profile.reserve * 0.7)) {
            this.engine.payBail();
            this.toast(`${player.name} 支付保释金`, "cost");
            this.saveState();
            this.render();
            await wait(350);
          } else {
            const jailResult = this.engine.attemptJailRoll();
            await this.animateRollResult(jailResult);
            this.saveState();
            this.render();
            if (jailResult.released) this.toast(`${player.name} 掷出双点，解除拘押`);
            if (this.engine.state.pendingPurchase) {
              const paused = await this.handleAiPurchaseDecision();
              if (paused) return;
            }
            if (this.engine.isGameOver) break;
          }
        }

        if (!this.engine.state.hasRolled && !player.inJail && !this.engine.isGameOver) {
          const result = this.engine.rollDice();
          await this.animateRollResult(result);
          this.focusTileId = this.engine.currentPlayer.position;
          this.saveState();
          this.render();
          if (result.triple) {
            this.toast(`${player.name} 连续三次同点，进入看守所`, "cost");
          } else if (result.landing?.card) {
            this.toast(`${player.name}：${result.landing.card.title}`);
          }
          if (this.engine.state.pendingPurchase) {
            const paused = await this.handleAiPurchaseDecision();
            if (paused) return;
          }
        }

        if (this.engine.isGameOver) break;
        if (this.engine.state.pendingAuction) {
          const outcome = await this.runAuctionUntilHuman();
          if (outcome === "human") {
            this.busy = false;
            this.render();
            this.openAuctionModal();
            return;
          }
        }
        if (this.engine.state.pendingPurchase) continue;

        await this.runAiManagement();
        if (this.engine.isGameOver) break;
        this.saveState();
        this.render();
        await wait(420);

        if (this.engine.canEndTurn()) {
          this.engine.endTurn();
          this.saveState();
          this.focusTileId = this.engine.currentPlayer.position;
          this.render();
          await wait(380);
        } else {
          break;
        }
      }
    } catch (error) {
      console.error(error);
      if (error instanceof RuleError) this.toast(error.message, "cost");
    } finally {
      this.aiRunning = false;
      this.busy = false;
      this.render();
      this.maybeShowWinner();
      if (
        this.engine.currentPlayer.isAI &&
        !this.engine.isGameOver &&
        !this.engine.state.pendingAuction &&
        !this.engine.state.pendingPurchase
      ) {
        setTimeout(() => this.runAiTurn(), 450);
      }
    }
  }

  async handleAiPurchaseDecision() {
    const pending = this.engine.state.pendingPurchase;
    if (!pending) return false;
    const player = this.engine.playerById(pending.playerId);
    const tile = this.engine.tileById(pending.tileId);
    this.render();
    await wait(520);
    if (this.engine.shouldAiBuy(tile, player)) {
      this.engine.buyPendingProperty();
      this.playSound("buy");
      this.toast(`${player.name} 买入 ${tile.name}`, "good");
      this.saveState();
      this.render();
      await wait(320);
      return false;
    }
    this.engine.declinePendingProperty();
    this.saveState();
    this.render();
    const outcome = await this.runAuctionUntilHuman();
    if (outcome === "human") {
      this.busy = false;
      this.render();
      this.openAuctionModal();
      return true;
    }
    return false;
  }

  async runAiManagement() {
    const player = this.engine.currentPlayer;
    if (player.isAI === false || this.engine.state.pendingAuction || this.engine.state.pendingPurchase) {
      return;
    }
    const profile = AI_PROFILES[player.profile] || AI_PROFILES.growth;
    await wait(260);

    if (player.cash > profile.stockReserve * 1.35) {
      const mortgage = this.engine
        .ownedTiles(player.id)
        .filter((tile) => tile.mortgage)
        .sort((a, b) => a.price - b.price)[0];
      if (mortgage && player.cash > Math.ceil(mortgage.price * 0.55) + profile.reserve) {
        this.engine.redeemProperty(mortgage.id, player.id);
        this.saveState();
        this.render();
        await wait(220);
      }
    }

    if (this.engine.marketMeta.stock <= 1.11) {
      const candidate = this.engine.aiStockCandidate(player);
      if (candidate) {
        this.engine.buyStock(candidate.symbol, candidate.quantity, player.id);
        this.playSound("buy");
        this.saveState();
        this.render();
        await wait(260);
      }
    }

    for (let count = 0; count < 2; count += 1) {
      const candidate = this.engine.aiUpgradeCandidate(player);
      if (!candidate) break;
      this.engine.upgradeProperty(candidate.id, player.id);
      this.playSound("build");
      this.saveState();
      this.render();
      await wait(280);
    }
  }

  maybeShowWinner() {
    if (!this.engine?.isGameOver || this.winnerShownFor === this.engine) return;
    this.winnerShownFor = this.engine;
    const winner = this.engine.state.winner ? this.engine.playerById(this.engine.state.winner) : null;
    const sorted = [...this.engine.state.players]
      .filter((player) => !player.bankrupt)
      .sort((a, b) => this.engine.netWorth(b.id) - this.engine.netWorth(a.id));
    const champion = winner || sorted[0];
    this.modalContext = "winner";
    this.elements.modalRoot.innerHTML = `
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="winner-title">
        <div class="winner-banner">
          <div class="winner-crown">${icon("crown")}</div>
          <span class="eyebrow">CITY CHAMPION</span>
          <h2 id="winner-title">${champion ? escapeHtml(champion.name) : "城市停摆"}</h2>
          <p>${champion ? `${formatMoney(this.engine.netWorth(champion.id))} 净资产 · 第 ${this.engine.state.round} 回合` : "所有玩家都已退出城市版图"}</p>
        </div>
        <div class="dialog-actions">
          <button class="secondary-button" type="button" data-action="winner-new">${icon("rotate-ccw")} 调整阵容</button>
          <button class="primary-button" type="button" data-action="winner-new">${icon("refresh")} 再来一局</button>
        </div>
      </section>
    `;
    this.playSound("win");
    this.celebrate();
  }

  celebrate() {
    const colors = ["#d94c36", "#168079", "#d89a20", "#4b65a0", "#bc587c"];
    for (let index = 0; index < 34; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.45}s`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      document.body.append(piece);
      setTimeout(() => piece.remove(), 2300);
    }
  }

  toast(message, tone = "good") {
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.textContent = message;
    this.elements.toastRoot.append(node);
    setTimeout(() => node.remove(), 2800);
  }

  setupArtwork() {
    return `
      <svg viewBox="0 0 330 560" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="330" height="560" fill="#26312c"/>
        <path d="M0 84h330M0 196h330M0 360h330M0 472h330M60 0v560M156 0v560M264 0v560" stroke="#3a4741" stroke-width="2"/>
        <path d="M0 128h330M0 416h330M104 0v560M216 0v560" stroke="#303c37" stroke-width="13"/>
        <g fill="#d08a51">
          <path d="M32 292h54v66H32zM92 250h44v108H92zM34 222h28v70H34z"/>
          <path d="M246 262h50v96h-50zM206 306h40v52h-40z"/>
        </g>
        <g fill="#4f8b7e">
          <path d="M144 322h58v36h-58zM212 370h72v46h-72zM24 376h66v40H24z"/>
        </g>
        <g fill="#c9a444">
          <path d="M156 276h28v46h-28zM198 252h36v24h-36zM88 386h38v30H88z"/>
        </g>
        <g stroke="#d5cbb8" stroke-width="3" opacity=".4">
          <path d="M25 514h280M25 534h280"/>
          <path d="M44 490v44M72 490v44M102 490v44M132 490v44M162 490v44M192 490v44M222 490v44M252 490v44M282 490v44"/>
        </g>
        <circle cx="270" cy="92" r="32" fill="#e0bd70"/>
        <circle cx="282" cy="82" r="32" fill="#26312c"/>
        <path d="M0 70h330" stroke="#1d2722" stroke-width="2"/>
      </svg>
    `;
  }

  updateSoundButton() {
    this.elements.soundButton.innerHTML = icon(this.soundEnabled ? "volume" : "volume-x");
    this.elements.soundButton.setAttribute("aria-label", this.soundEnabled ? "关闭音效" : "开启音效");
    this.elements.soundButton.title = this.soundEnabled ? "关闭音效" : "开启音效";
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem(SOUND_KEY, this.soundEnabled ? "on" : "off");
    this.updateSoundButton();
    if (this.soundEnabled) this.playSound("click");
  }

  playSound(kind) {
    if (!this.soundEnabled) return;
    try {
      this.audioContext ||= new AudioContext();
      if (this.audioContext.state === "suspended") this.audioContext.resume();
      const patterns = {
        click: [280, 0.03, 0.02],
        step: [190, 0.035, 0.018],
        roll: [150, 0.08, 0.035],
        coin: [520, 0.07, 0.03],
        buy: [390, 0.09, 0.04],
        build: [240, 0.11, 0.035],
        end: [220, 0.06, 0.02],
        event: [330, 0.14, 0.035],
        start: [440, 0.14, 0.04],
        win: [660, 0.22, 0.05]
      };
      const [frequency, duration, volume] = patterns[kind] || patterns.click;
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = kind === "roll" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(90, frequency * 1.35),
        this.audioContext.currentTime + duration
      );
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {
      this.soundEnabled = false;
      this.updateSoundButton();
    }
  }
}

function gridPlacement(id) {
  if (id === 0) return [11, 11];
  if (id <= 9) return [11, 11 - id];
  if (id === 10) return [11, 1];
  if (id <= 19) return [21 - id, 1];
  if (id === 20) return [1, 1];
  if (id <= 29) return [1, id - 19];
  if (id === 30) return [1, 11];
  return [id - 29, 11];
}

function edgeFor(id) {
  if (id === 0 || id === 10 || id === 20 || id === 30) return "corner";
  if (id < 10) return "bottom";
  if (id < 20) return "left";
  if (id < 30) return "top";
  return "right";
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function formatMoney(value) {
  const number = Number(value) || 0;
  return `¥${Math.round(number).toLocaleString("zh-CN")}`;
}

function formatCompactMoney(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 10000) return `¥${(number / 10000).toFixed(1)}万`;
  return `¥${Math.round(number).toLocaleString("zh-CN")}`;
}

function totalShares(player) {
  return Object.values(player.stocks).reduce((sum, count) => sum + count, 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
