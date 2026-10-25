import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "../js/engine.js";

function createGame(playerCount = 2) {
  return GameEngine.create({
    preset: "standard",
    players: Array.from({ length: playerCount }, (_, index) => ({
      name: `玩家${index + 1}`,
      isAI: false
    }))
  });
}

test("creates a complete 40-tile game", () => {
  const engine = createGame(3);
  assert.equal(engine.state.players.length, 3);
  assert.equal(engine.state.tiles.length, 40);
  assert.equal(engine.state.market, "stable");
  assert.equal(engine.state.players[0].cash, 7200);
  assert.equal(engine.state.tiles.filter((tile) => tile.type === "property").length, 24);
  assert.equal(engine.state.tiles.filter((tile) => tile.type === "station").length, 4);
  assert.equal(engine.state.tiles.filter((tile) => tile.type === "utility").length, 3);
});

test("full color group doubles base rent and upgrades scale rent", () => {
  const engine = createGame();
  for (const id of [1, 3, 6]) engine.tileById(id).owner = "p1";
  const tile = engine.tileById(6);
  assert.equal(engine.getRent(tile, 7), 220);
  tile.level = 1;
  assert.equal(engine.getRent(tile, 7), 286);
  engine.state.market = "boom";
  assert.equal(engine.getRent(tile, 7), Math.round(286 * 1.28));
});

test("buildings require a complete group and balanced upgrade levels", () => {
  const engine = createGame();
  engine.currentPlayer.cash = 10000;
  for (const id of [7, 9, 11]) engine.tileById(id).owner = "p1";

  engine.upgradeProperty(7, "p1");
  engine.upgradeProperty(9, "p1");
  const blocked = engine.getUpgradeStatus(7, "p1");
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /均衡/);
  assert.equal(engine.getUpgradeStatus(11, "p1").allowed, true);
});

test("mortgage and redemption update cash and rent eligibility", () => {
  const engine = createGame();
  const tile = engine.tileById(1);
  tile.owner = "p1";
  const before = engine.currentPlayer.cash;
  engine.mortgageProperty(1, "p1");
  assert.equal(tile.mortgage, true);
  assert.equal(engine.currentPlayer.cash, before + Math.floor(tile.price * 0.5));
  assert.equal(engine.getRent(tile, 7), 0);
  engine.redeemProperty(1, "p1");
  assert.equal(tile.mortgage, false);
  assert.equal(engine.currentPlayer.cash, before + Math.floor(tile.price * 0.5) - Math.ceil(tile.price * 0.55));
});

test("stock purchases and sales apply commission", () => {
  const engine = createGame();
  const before = engine.currentPlayer.cash;
  const price = engine.state.stocks.harbor.price;
  const buyCost = engine.buyStock("harbor", 2, "p1");
  const expectedBuy = price * 2 + Math.max(1, Math.round(price * 2 * 0.005 * 100) / 100);
  assert.equal(buyCost, expectedBuy);
  assert.equal(engine.currentPlayer.stocks.harbor, 2);
  assert.equal(engine.currentPlayer.cash, before - expectedBuy);

  const proceeds = engine.sellStock("harbor", 1, "p1");
  const expectedSale = price - Math.max(1, Math.round(price * 0.005 * 100) / 100);
  assert.equal(proceeds, expectedSale);
  assert.equal(engine.currentPlayer.stocks.harbor, 1);
});

test("auction completes when only the leading bidder remains", () => {
  const engine = createGame();
  const before = engine.currentPlayer.cash;
  engine.startAuction(1);
  assert.ok(engine.state.pendingAuction);
  engine.auctionBid();
  engine.auctionPass();
  assert.equal(engine.state.pendingAuction, null);
  assert.equal(engine.tileById(1).owner, "p1");
  assert.ok(engine.currentPlayer.cash < before);
});

test("insufficient funds triggers bankruptcy and transfers control", () => {
  const engine = createGame();
  const payer = engine.playerById("p1");
  const creditor = engine.playerById("p2");
  payer.cash = 0;
  engine.charge(payer, 900, creditor.id, "测试债务");
  assert.equal(payer.bankrupt, true);
  assert.equal(engine.state.phase, "gameover");
  assert.equal(engine.state.winner, creditor.id);
});

test("saved games restore complete economic state", () => {
  const engine = createGame();
  engine.tileById(1).owner = "p1";
  engine.currentPlayer.cash = 4123;
  engine.state.market = "recession";
  const restored = GameEngine.fromJSON(engine.toJSON());
  assert.equal(restored.playerById("p1").cash, 4123);
  assert.equal(restored.tileById(1).owner, "p1");
  assert.equal(restored.state.market, "recession");
  assert.equal(restored.netWorth("p1"), engine.netWorth("p1"));
});

test("deterministic AI simulation completes without invalid state", () => {
  const engine = GameEngine.create({
    preset: "short",
    players: Array.from({ length: 4 }, (_, index) => ({
      name: `AI${index + 1}`,
      isAI: true,
      profile: ["steady", "growth", "bold", "growth"][index]
    }))
  });

  const random = seededRandom(9173);
  engine.rng = random;
  let actions = 0;
  while (!engine.isGameOver && actions < 700) {
    actions += 1;
    const player = engine.currentPlayer;
    if (player.inJail && !engine.state.hasRolled) {
      if (player.cash > 850 && player.jailTurns >= 1) {
        engine.payBail();
      } else {
        engine.attemptJailRoll();
      }
    }
    if (!engine.isGameOver && !engine.state.hasRolled && !player.inJail) {
      engine.rollDice();
    }
    if (engine.state.pendingPurchase) {
      const pendingTile = engine.tileById(engine.state.pendingPurchase.tileId);
      if (engine.shouldAiBuy(pendingTile, player)) {
        engine.buyPendingProperty();
      } else {
        engine.declinePendingProperty();
        let auctionGuard = 0;
        while (engine.state.pendingAuction && auctionGuard < 30) {
          auctionGuard += 1;
          const choice = engine.aiAuctionChoice();
          if (!engine.auctionCurrentBidder) break;
          if (choice.action === "bid") engine.auctionBid();
          else engine.auctionPass();
        }
      }
    }
    if (engine.isGameOver) break;
    const stock = engine.aiStockCandidate(player);
    if (stock) engine.buyStock(stock.symbol, stock.quantity, player.id);
    const upgrade = engine.aiUpgradeCandidate(player);
    if (upgrade) engine.upgradeProperty(upgrade.id, player.id);
    if (engine.canEndTurn()) {
      engine.endTurn();
    } else if (engine.state.hasRolled && !engine.state.pendingAuction) {
      engine.endTurn();
    } else if (!engine.state.hasRolled && !player.inJail) {
      engine.rollDice();
    } else {
      throw new Error("simulation stalled");
    }

    for (const current of engine.state.players) {
      assert.ok(current.cash >= -0.001, `${current.name} has negative cash`);
      assert.equal(Number.isNaN(current.cash), false);
      assert.ok(current.position >= 0 && current.position < 40);
      assert.ok(
        engine.netWorth(current.id) >= 0,
        `${current.name} has negative net worth ${engine.netWorth(current.id)} with cash ${current.cash}`
      );
    }
    for (const tile of engine.state.tiles) {
      assert.ok(tile.level >= 0 && tile.level <= 4);
      if (tile.owner) assert.ok(engine.playerById(tile.owner));
    }
  }

  assert.ok(actions > 5, "simulation should make meaningful progress");
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
