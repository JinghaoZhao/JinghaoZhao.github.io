/**
 * Mystery Stock Market (神秘交易所 / 미스터리 거래소) — Pure Deterministic Game Rules
 * Day 2 Main Match (EP 3–4) · The Devil's Plan Season 3: Dead Again
 *
 * Pure ES module: zero DOM dependencies, deterministic via ctx.rng.
 */

export const STARTING_CASH = 100000;
export const STARTING_PIECES = 3;
export const START_PRICE = 10000;
export const FLOOR_PRICE = 100;
export const PRIZE_TARGET_KRW = 10000000;
export const PIECE_CASH_VALUE = 10000;

export const STOCKS = [
  {
    id: 'banger',
    ticker: 'BGR',
    color: '#38bdf8',
    name: { zh: '防御钢铁', en: 'Banger Steel', ko: '방어제철' },
    sector: { zh: '重工 · 钢铁', en: 'Heavy Steel' },
  },
  {
    id: 'mucho',
    ticker: 'MUC',
    color: '#f59e0b',
    name: { zh: '无条件建设', en: 'Mucho Construction', ko: '무조건설' },
    sector: { zh: '基建 · 地产', en: 'Construction' },
  },
  {
    id: 'analog',
    ticker: 'ANL',
    color: '#a78bfa',
    name: { zh: '后者电子', en: 'Analog Electronics', ko: '후자전자' },
    sector: { zh: '电子 · 消费', en: 'Electronics' },
  },
  {
    id: 'coyo',
    ticker: 'COY',
    color: '#22c55e',
    name: { zh: '郊狼科技', en: 'CoyoTech', ko: '코요테크' },
    sector: { zh: '前沿 · 科技', en: 'Frontier Tech' },
  },
  {
    id: 'open',
    ticker: 'OPN',
    color: '#ec4899',
    name: { zh: '敞开保安', en: 'Open Security', ko: '열림보안' },
    sector: { zh: '信息 · 安防', en: 'Cyber Security' },
  },
  {
    id: 'alt',
    ticker: 'ALT',
    color: '#eab308',
    name: { zh: '娱乐切换', en: 'Alt Enter', ko: '알트엔터' },
    sector: { zh: '媒体 · 娱乐', en: 'Entertainment' },
  },
  {
    id: 'notsogood',
    ticker: 'NSG',
    color: '#ef4444',
    name: { zh: '味素金融', en: 'NotSoGood Capital', ko: '맛소금융' },
    sector: { zh: '资本 · 金融', en: 'Capital Finance' },
  },
];

export const STOCK_IDS = STOCKS.map((s) => s.id);
export const STOCK_MAP = Object.fromEntries(STOCKS.map((s) => [s.id, s]));

/**
 * 24-round Mystery Exchange Logo silhouette price path for Alt Enter (indices 0..24).
 * Traces the twin-peak geometric "M" Exchange Crown logo!
 */
export const ALT_LOGO_PATH_24 = [
  10000, // R0 start
  8000,  // R1 base dip
  6200,  // R2 left foot
  11500, // R3 left pillar climb
  17400, // R4 steep ascent
  23200, // R5 left crown peak
  18800, // R6 inner left descent
  14200, // R7
  10400, // R8 inner valley
  13800, // R9 center diamond rise
  17200, // R10 center diamond apex
  13400, // R11
  9800,  // R12 center right valley
  14000, // R13 right pillar climb
  18600, // R14
  24400, // R15 right crown peak
  20600, // R16 right outer slope
  15200, // R17
  9600,  // R18 right foot dip
  7200,  // R19 trough
  12400, // R20 emblem flourish rise
  17800, // R21
  22600, // R22 final crest
  18400, // R23
  14600, // R24 close
];

export const ALT_LOGO_PATH_12 = [
  10000, // R0
  6400,  // R1 left foot
  15800, // R2 left ascent
  23200, // R3 left peak
  13600, // R4 inner slope
  10200, // R5 valley
  17200, // R6 center diamond apex
  10000, // R7 valley
  18400, // R8 right ascent
  24400, // R9 right peak
  11800, // R10 right foot
  21400, // R11 flourish
  15600, // R12 close
];

function roundTo10(val) {
  return Math.max(FLOOR_PRICE, Math.round(val / 10) * 10);
}

function stockName(id, lang) {
  const s = STOCK_MAP[id];
  if (!s) return id;
  return lang === 'en' ? s.name.en : s.name.zh;
}

/**
 * Compute global reveal tier (0..4) for the current round.
 * 24-round schedule (show exact): R1=0, R5=1, R10=2, R15=3, R20=4 (100% unlocked).
 * 12-round fast schedule:         R1=0, R3=1, R6=2, R8=3, R10=4.
 */
export function getUnlockSchedule(totalRounds) {
  return totalRounds <= 12 ? [1, 3, 6, 8, 10] : [1, 5, 10, 15, 20];
}

export function getGlobalClueTier(round, totalRounds) {
  const sched = getUnlockSchedule(totalRounds);
  let tier = 0;
  for (let i = 1; i < sched.length; i++) {
    if (round >= sched[i]) tier = i;
  }
  return tier;
}

/**
 * Build formula parameters (classic show exact or seeded randomized replay).
 */
function buildFormulaParams(formulaMode, totalRounds, rng) {
  const basePath = totalRounds <= 12 ? ALT_LOGO_PATH_12 : ALT_LOGO_PATH_24;
  if (formulaMode !== 'shuffle') {
    return {
      mode: 'classic',
      bangerStep: 200,
      muchoLink: 'banger',
      muchoPct: 10,
      analogMin: 10,
      analogMax: 30,
      analogUp: 1500,
      analogDown: 1000,
      coyoCompare: 'analog',
      coyoUp: 1400,
      coyoDown: 700,
      openSecretTarget: 'analog',
      openUpPct: 13,
      openDown: 1000,
      altPath: basePath.slice(),
      altInverted: false,
      nsgDownThreshold: 4,
      nsgPct: 10,
    };
  }

  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const bangerStep = pick([150, 200, 250]);
  const muchoLink = pick(['banger', 'coyo', 'analog']);
  const muchoPct = pick([8, 10, 12]);
  const analogMin = pick([8, 10, 12]);
  const analogMax = analogMin + pick([16, 20, 24]);
  const coyoCompare = pick(['analog', 'banger', 'mucho']);
  const openSecretTarget = pick(['analog', 'banger', 'coyo', 'mucho']);
  const openUpPct = pick([12, 13, 15]);
  const altInverted = rng() < 0.4;
  const altPath = basePath.map((v, i) => {
    if (i === 0) return START_PRICE;
    if (!altInverted) return v;
    return Math.max(2400, Math.round((30000 - v) / 100) * 100);
  });
  const nsgDownThreshold = pick([3, 4]);

  return {
    mode: 'shuffle',
    bangerStep,
    muchoLink,
    muchoPct,
    analogMin,
    analogMax,
    analogUp: 1500,
    analogDown: 1000,
    coyoCompare,
    coyoUp: 1400,
    coyoDown: 700,
    openSecretTarget,
    openUpPct,
    openDown: 1000,
    altPath,
    altInverted,
    nsgDownThreshold,
    nsgPct: 10,
  };
}

/**
 * Generate redacted clue tokens for a stock at a specific reveal tier (0..4).
 * Strictly strips unrevealed words so clients NEVER receive locked formula text.
 */
function buildRedactedClue(stockId, params, tier) {
  const mk = (segmentsZh, segmentsEn) => ({
    tier,
    unlocked: tier >= 4,
    zh: segmentsZh.map((seg) => ({ text: seg.t <= tier ? seg.s : null, len: seg.len || seg.s.length })),
    en: segmentsEn.map((seg) => ({ text: seg.t <= tier ? seg.s : null, len: seg.len || seg.s.length })),
  });

  switch (stockId) {
    case 'banger':
      return mk(
        [
          { t: 0, s: '本回合全市场' },
          { t: 1, s: '总持股量' },
          { t: 2, s: '每增加 1 股，股价' },
          { t: 3, s: ` -${params.bangerStep}₩` },
          { t: 2, s: '；每减少 1 股，' },
          { t: 4, s: ` +${params.bangerStep}₩（最低100₩）` },
        ],
        [
          { t: 0, s: 'Market ' },
          { t: 1, s: 'total holdings ' },
          { t: 2, s: '+1 share → ' },
          { t: 3, s: `-${params.bangerStep}₩` },
          { t: 2, s: '; -1 share → ' },
          { t: 4, s: `+${params.bangerStep}₩ (floor 100₩)` },
        ]
      );

    case 'mucho':
      return mk(
        [
          { t: 0, s: '若本回合' },
          { t: 2, s: `【${stockName(params.muchoLink, 'zh')}】` },
          { t: 1, s: '股价上涨，则' },
          { t: 3, s: ` +${params.muchoPct}%` },
          { t: 1, s: '；否则' },
          { t: 4, s: ` -${params.muchoPct}%` },
        ],
        [
          { t: 0, s: 'If ' },
          { t: 2, s: `[${stockName(params.muchoLink, 'en')}] ` },
          { t: 1, s: 'rises this round: ' },
          { t: 3, s: `+${params.muchoPct}%` },
          { t: 1, s: '; else ' },
          { t: 4, s: `-${params.muchoPct}%` },
        ]
      );

    case 'analog':
      return mk(
        [
          { t: 0, s: '若本回合全市场' },
          { t: 1, s: '总持股量位于' },
          { t: 3, s: ` ${params.analogMin}~${params.analogMax} 股` },
          { t: 2, s: '区间内，则' },
          { t: 4, s: ` +${params.analogUp}₩，否则 -${params.analogDown}₩` },
        ],
        [
          { t: 0, s: 'If total market ' },
          { t: 1, s: 'holdings are in ' },
          { t: 3, s: `${params.analogMin}–${params.analogMax} shares` },
          { t: 2, s: ': ' },
          { t: 4, s: `+${params.analogUp}₩, else -${params.analogDown}₩` },
        ]
      );

    case 'coyo':
      return mk(
        [
          { t: 0, s: '若本回合本股' },
          { t: 1, s: '总买入股数 > ' },
          { t: 2, s: `【${stockName(params.coyoCompare, 'zh')}】` },
          { t: 3, s: '总买入股数，则' },
          { t: 4, s: ` +${params.coyoUp}₩，否则 -${params.coyoDown}₩` },
        ],
        [
          { t: 0, s: 'If buy volume ' },
          { t: 1, s: 'strictly exceeds ' },
          { t: 2, s: `[${stockName(params.coyoCompare, 'en')}] ` },
          { t: 3, s: 'buy volume: ' },
          { t: 4, s: `+${params.coyoUp}₩, else -${params.coyoDown}₩` },
        ]
      );

    case 'open':
      return mk(
        [
          { t: 0, s: '若本回合有人对' },
          { t: 2, s: `【${stockName(params.openSecretTarget, 'zh')}】` },
          { t: 1, s: '使用 Secret 隐匿，' },
          { t: 3, s: `复利 +${params.openUpPct}%` },
          { t: 4, s: `；否则 -${params.openDown}₩` },
        ],
        [
          { t: 0, s: 'If anyone uses ' },
          { t: 1, s: 'SECRET on ' },
          { t: 2, s: `[${stockName(params.openSecretTarget, 'en')}]` },
          { t: 3, s: `: compound +${params.openUpPct}%` },
          { t: 4, s: `; else -${params.openDown}₩` },
        ]
      );

    case 'alt':
      return mk(
        [
          { t: 0, s: '完全不受' },
          { t: 1, s: '玩家买卖影响；' },
          { t: 2, s: '股价走势严格描摹' },
          { t: 3, s: params.altInverted ? '交易所倒置 Logo 轮廓' : '「神秘交易所」Logo 轮廓' },
          { t: 4, s: '（固定预设折线！）' },
        ],
        [
          { t: 0, s: 'Unaffected by ' },
          { t: 1, s: 'any player trades; ' },
          { t: 2, s: 'price curve strictly traces ' },
          { t: 3, s: params.altInverted ? 'inverted Exchange Logo' : 'Mystery Exchange Logo' },
          { t: 4, s: ' (fixed preset path!)' },
        ]
      );

    case 'notsogood':
    default:
      return mk(
        [
          { t: 0, s: '若本回合其余 6 股中' },
          { t: 1, s: '有 ≥ ' },
          { t: 2, s: `${params.nsgDownThreshold} 只下跌，` },
          { t: 3, s: `则 -${params.nsgPct}%` },
          { t: 4, s: `；否则 +${params.nsgPct}%` },
        ],
        [
          { t: 0, s: 'If ≥ ' },
          { t: 2, s: `${params.nsgDownThreshold} of other 6 stocks ` },
          { t: 1, s: 'decline this round: ' },
          { t: 3, s: `-${params.nsgPct}%` },
          { t: 4, s: `; else +${params.nsgPct}%` },
        ]
      );
  }
}

export function computeNetWorth(player, prices) {
  let stockVal = 0;
  for (const sid of STOCK_IDS) {
    stockVal += (player.holdings[sid] || 0) * (prices[sid] || START_PRICE);
  }
  return player.cash + stockVal;
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function emptyHoldings() {
  return Object.fromEntries(STOCK_IDS.map((id) => [id, 0]));
}

/**
 * Evaluate all 7 stocks in strict dependency order and advance round.
 */
function settleRound(state) {
  const s = cloneState(state);
  const p = s.formulaParams;
  const prevPrices = { ...s.prices };
  const prevTotalHoldings = {};
  for (const sid of STOCK_IDS) {
    prevTotalHoldings[sid] = Object.values(s.players).reduce(
      (sum, pl) => sum + (pl.holdings[sid] || 0),
      0
    );
  }

  // Apply all pending orders simultaneously
  const buyVol = Object.fromEntries(STOCK_IDS.map((id) => [id, 0]));
  const sellVol = Object.fromEntries(STOCK_IDS.map((id) => [id, 0]));
  const secretStocksUsed = {};
  const publicTrades = [];

  for (const seatId of s.seatOrder) {
    const pl = s.players[seatId];
    const order = s.pendingOrders[seatId] || { deltas: {}, secretStockId: null };
    const deltas = order.deltas || {};
    const secretStockId = STOCK_MAP[order.secretStockId] ? order.secretStockId : null;

    if (secretStockId) {
      secretStocksUsed[secretStockId] = true;
    }

    // Re-verify affordability defensively
    let netCost = 0;
    let valid = true;
    for (const sid of STOCK_IDS) {
      const d = Math.trunc(Number(deltas[sid]) || 0);
      if ((pl.holdings[sid] || 0) + d < 0) valid = false;
      netCost += d * prevPrices[sid];
    }
    if (!valid || netCost > pl.cash) continue;

    pl.cash -= netCost;
    for (const sid of STOCK_IDS) {
      const d = Math.trunc(Number(deltas[sid]) || 0);
      if (d === 0) continue;
      pl.holdings[sid] = (pl.holdings[sid] || 0) + d;
      if (d > 0) buyVol[sid] += d;
      if (d < 0) sellVol[sid] += Math.abs(d);

      if (secretStockId !== sid) {
        publicTrades.push({
          seatId,
          stockId: sid,
          delta: d,
        });
      }
    }

    if (secretStockId) {
      publicTrades.push({
        seatId: null,
        stockId: secretStockId,
        delta: null,
        secret: true,
      });
    }
  }

  const newTotalHoldings = {};
  for (const sid of STOCK_IDS) {
    newTotalHoldings[sid] = Object.values(s.players).reduce(
      (sum, pl) => sum + (pl.holdings[sid] || 0),
      0
    );
  }

  const nextPrices = {};

  // 1. Banger Steel (inverse total holdings delta)
  const bangerDelta = newTotalHoldings.banger - prevTotalHoldings.banger;
  nextPrices.banger = Math.max(FLOOR_PRICE, prevPrices.banger - bangerDelta * p.bangerStep);

  // 3. Analog Electronics (holdings band 10..30) — compute before mucho in case shuffle links mucho->analog
  const analogH = newTotalHoldings.analog;
  if (analogH >= p.analogMin && analogH <= p.analogMax) {
    nextPrices.analog = prevPrices.analog + p.analogUp;
  } else {
    nextPrices.analog = Math.max(FLOOR_PRICE, prevPrices.analog - p.analogDown);
  }

  // 4. CoyoTech (buy volume comparison)
  if (buyVol.coyo > buyVol[p.coyoCompare]) {
    nextPrices.coyo = prevPrices.coyo + p.coyoUp;
  } else {
    nextPrices.coyo = Math.max(FLOOR_PRICE, prevPrices.coyo - p.coyoDown);
  }

  // 2. Mucho Construction (follows linked stock — classic: Banger Steel)
  const linkId = p.muchoLink;
  const linkRose = nextPrices[linkId] > prevPrices[linkId];
  nextPrices.mucho = linkRose
    ? roundTo10(prevPrices.mucho * (1 + p.muchoPct / 100))
    : roundTo10(prevPrices.mucho * (1 - p.muchoPct / 100));

  // 5. Open Security (triggered by SECRET used on target stock — classic: Analog Electronics)
  if (secretStocksUsed[p.openSecretTarget]) {
    nextPrices.open = roundTo10(prevPrices.open * (1 + p.openUpPct / 100));
  } else {
    nextPrices.open = Math.max(FLOOR_PRICE, prevPrices.open - p.openDown);
  }

  // 6. Alt Enter (preset Mystery Exchange Logo silhouette!)
  const nextRoundIdx = Math.min(s.round, p.altPath.length - 1);
  nextPrices.alt = p.altPath[nextRoundIdx] ?? prevPrices.alt;

  // 7. NotSoGood Capital (market breadth: >= threshold of other 6 stocks down => -10%, else +10%)
  let otherDownCount = 0;
  for (const sid of STOCK_IDS) {
    if (sid === 'notsogood') continue;
    if (nextPrices[sid] < prevPrices[sid]) otherDownCount += 1;
  }
  if (otherDownCount >= p.nsgDownThreshold) {
    nextPrices.notsogood = roundTo10(prevPrices.notsogood * (1 - p.nsgPct / 100));
  } else {
    nextPrices.notsogood = roundTo10(prevPrices.notsogood * (1 + p.nsgPct / 100));
  }

  // Record history & deltas
  const priceChanges = {};
  let topGainer = null;
  let topLoser = null;
  for (const sid of STOCK_IDS) {
    const diff = nextPrices[sid] - prevPrices[sid];
    const pct = prevPrices[sid] > 0 ? (diff / prevPrices[sid]) * 100 : 0;
    priceChanges[sid] = {
      prev: prevPrices[sid],
      next: nextPrices[sid],
      diff,
      pct: Math.round(pct * 10) / 10,
      maskedHoldings: Boolean(secretStocksUsed[sid]),
      totalHoldings: secretStocksUsed[sid] ? null : newTotalHoldings[sid],
    };
    if (!topGainer || pct > topGainer.pct) topGainer = { stockId: sid, pct, diff };
    if (!topLoser || pct < topLoser.pct) topLoser = { stockId: sid, pct, diff };
  }

  s.prices = nextPrices;
  s.priceHistory.push({ ...nextPrices });
  s.lastTotalHoldingsPublic = Object.fromEntries(
    STOCK_IDS.map((sid) => [sid, secretStocksUsed[sid] ? null : newTotalHoldings[sid]])
  );
  s.lastSecretStocks = Object.keys(secretStocksUsed);

  const prevTier = getGlobalClueTier(s.round, s.totalRounds);
  s.roundHistory.push({
    round: s.round,
    priceChanges,
    publicTrades: publicTrades.slice(0, 32),
    secretUsedCount: Object.keys(secretStocksUsed).length,
    topGainer,
    topLoser,
  });

  // Check if 10M KRW Prize Token milestone reached
  for (const seatId of s.seatOrder) {
    const nw = computeNetWorth(s.players[seatId], s.prices);
    if (nw >= PRIZE_TARGET_KRW) {
      s.prizeTokenUnlocked = true;
      if (!s.prizeTokenAchievers.includes(seatId)) {
        s.prizeTokenAchievers.push(seatId);
      }
    }
  }

  // Advance round or move to closing_bell finale
  s.pendingOrders = {};
  if (s.round >= s.totalRounds) {
    s.phase = 'closing_bell';
    s.pendingSeatIds = [];
    s.justUnlockedTier = false;
  } else {
    s.round += 1;
    const nextTier = getGlobalClueTier(s.round, s.totalRounds);
    s.justUnlockedTier = nextTier > prevTier;
    s.pendingSeatIds = s.seatOrder.slice();
  }

  return {
    state: s,
    events: [
      {
        type: 'ROUND_SETTLED',
        round: s.phase === 'closing_bell' ? s.totalRounds : s.round - 1,
        topGainer,
        topLoser,
        unlockedTier: s.justUnlockedTier,
        prizeUnlocked: s.prizeTokenUnlocked,
      },
    ],
  };
}

/**
 * Smart analytical AI trader decision logic.
 */
function decideBotAction(fullState, botSeatId, ctx) {
  if (fullState.phase !== 'trading') return null;
  if (!fullState.pendingSeatIds.includes(botSeatId)) return null;

  const rng = ctx?.rng || Math.random;
  const pl = fullState.players[botSeatId];
  const p = fullState.formulaParams;
  const globalTier = getGlobalClueTier(fullState.round, fullState.totalRounds);

  // Occasionally spend 1 Piece for Intel or Cash
  if (pl.pieces > 0 && !pl.botPieceActedRound) {
    // Buy intel on Open Security or Alt Enter mid-early if locked
    if (fullState.round >= 3 && fullState.round <= 14 && rng() < 0.16) {
      const candidates = ['open', 'alt', 'banger', 'analog', 'mucho'].filter(
        (sid) => Math.max(globalTier, pl.intelBonus[sid] || 0) < 4
      );
      if (candidates.length > 0) {
        const pickStock = candidates[Math.floor(rng() * candidates.length)];
        return { type: 'BUY_INTEL', payload: { stockId: pickStock } };
      }
    }
    // Buy cash early if cash is low
    if (pl.cash < 15000 && fullState.round <= fullState.totalRounds - 4 && rng() < 0.22) {
      return { type: 'BUY_CASH', payload: {} };
    }
  }

  const deltas = emptyHoldings();
  let secretStockId = null;
  let simCash = pl.cash;
  const prices = fullState.prices;
  const persona = pl.persona || 'quant';
  const round = fullState.round;
  const roundsLeft = fullState.totalRounds - round + 1;

  // Helper to check how much this bot knows about a stock
  const knowTier = (sid) => Math.max(globalTier, pl.intelBonus[sid] || 0);

  // Estimate expected return per stock based on what this bot actually knows
  const scores = {};
  for (const sid of STOCK_IDS) {
    const tier = knowTier(sid);
    let score = (rng() - 0.45) * 0.6; // mild exploration

    // Price momentum from last round
    const hist = fullState.priceHistory;
    const prev = hist.length >= 2 ? hist[hist.length - 2][sid] : prices[sid];
    const lastPct = prev > 0 ? (prices[sid] - prev) / prev : 0;

    if (persona === 'momentum') score += lastPct * 2.2;
    if (persona === 'value') score -= lastPct * 1.4;

    if (sid === 'open' && tier >= 2) {
      // Bot knows Open Security compounds when Secret is placed on target!
      score += 3.2;
      if (roundsLeft >= 3) score += 1.4;
    }

    if (sid === 'alt' && tier >= 3) {
      // Bot sees logo pattern / next direction!
      const nextAlt = p.altPath[Math.min(round, p.altPath.length - 1)] ?? prices.alt;
      const altPct = (nextAlt - prices.alt) / Math.max(100, prices.alt);
      score += altPct * 14;
    }

    if (sid === 'banger' && tier >= 2) {
      // If Banger is at floor 100..600, huge rebound potential!
      if (prices.banger <= 1200) score += 2.6;
      else if (prices.banger >= 14000) score -= 1.2;
    }

    if (sid === 'analog' && tier >= 3) {
      const knownH = fullState.lastTotalHoldingsPublic?.analog;
      if (knownH != null) {
        if (knownH >= p.analogMin - 4 && knownH <= p.analogMax - 2) score += 1.7;
        else if (knownH > p.analogMax + 5) score -= 1.6;
      }
    }

    if (sid === 'coyo' && tier >= 2) {
      score += 0.6;
    }

    if (sid === 'mucho' && tier >= 2) {
      if (p.muchoLink === 'banger' && prices.banger <= 1000) score += 1.2;
    }

    if (sid === 'notsogood' && tier >= 2) {
      score += 0.5;
    }

    scores[sid] = score;
  }

  // Decide Secret placement
  if (knowTier('open') >= 2 && (pl.holdings.open > 0 || scores.open > 2.2)) {
    secretStockId = p.openSecretTarget;
  } else if (rng() < 0.25) {
    // Occasional bluff/probing Secret
    secretStockId = STOCK_IDS[Math.floor(rng() * STOCK_IDS.length)];
  }

  // Step 1: Sell weak holdings or profit-taking on peaks
  for (const sid of STOCK_IDS) {
    const owned = pl.holdings[sid] || 0;
    if (owned <= 0) continue;

    // Special Banger dump exploit: if bot holds lots of Banger bought cheap, dump half to spike price!
    if (sid === 'banger' && knowTier('banger') >= 2 && owned >= 12 && prices.banger <= 2500) {
      const sellQty = Math.floor(owned * 0.5);
      deltas.banger = -sellQty;
      simCash += sellQty * prices.banger;
      continue;
    }

    // Alt Enter peak exit
    if (sid === 'alt' && knowTier('alt') >= 3 && scores.alt < -0.5) {
      deltas.alt = -owned;
      simCash += owned * prices.alt;
      continue;
    }

    if (scores[sid] < -0.35) {
      const frac = scores[sid] < -1.2 ? 1.0 : 0.55;
      const sellQty = Math.max(1, Math.floor(owned * frac));
      deltas[sid] = -sellQty;
      simCash += sellQty * prices[sid];
    }
  }

  // Step 2: Rank top 2-3 stocks to buy
  const ranked = STOCK_IDS.slice().sort((a, b) => scores[b] - scores[a]);
  const topPicks = ranked.filter((sid) => scores[sid] > 0.25 && deltas[sid] >= 0).slice(0, 3);

  for (let i = 0; i < topPicks.length; i++) {
    const sid = topPicks[i];
    const price = prices[sid];
    if (price <= 0 || simCash < price) continue;
    const budgetFrac = i === 0 ? 0.55 : i === 1 ? 0.45 : 0.35;
    let budget = Math.floor(simCash * budgetFrac);
    // Avoid buying absurd 500+ shares of floor-priced Banger in a single click unless manipulator
    let qty = Math.floor(budget / price);
    if (sid === 'banger' && price <= 400) {
      qty = Math.min(qty, persona === 'manipulator' ? 45 : 20);
    }
    qty = Math.min(qty, Math.floor(simCash / price));
    if (qty > 0) {
      deltas[sid] = (deltas[sid] || 0) + qty;
      simCash -= qty * price;
    }
  }

  return {
    type: 'SUBMIT_ORDER',
    payload: { deltas, secretStockId },
  };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const opts = ctx?.options || {};
    const totalRounds = Number(opts.totalRounds) === 12 ? 12 : 24;
    const formulaMode = opts.formulaMode === 'shuffle' ? 'shuffle' : 'classic';
    const turnTimerSec = opts.turnTimer === '0' ? 0 : Number(opts.turnTimer) || 90;

    const personas = ['quant', 'momentum', 'value', 'manipulator'];
    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    seats.forEach((s, idx) => {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
        persona: personas[idx % personas.length],
        cash: STARTING_CASH,
        pieces: STARTING_PIECES,
        holdings: emptyHoldings(),
        intelBonus: Object.fromEntries(STOCK_IDS.map((id) => [id, 0])),
        pieceActionsCount: 0,
      };
    });

    const initialPrices = Object.fromEntries(STOCK_IDS.map((id) => [id, START_PRICE]));
    const formulaParams = buildFormulaParams(formulaMode, totalRounds, rng);

    return {
      phase: 'trading', // 'trading' | 'closing_bell' | 'ended'
      round: 1,
      totalRounds,
      formulaMode,
      turnTimerSec,
      seatOrder,
      players,
      prices: initialPrices,
      priceHistory: [{ ...initialPrices }],
      lastTotalHoldingsPublic: Object.fromEntries(STOCK_IDS.map((id) => [id, 0])),
      lastSecretStocks: [],
      pendingOrders: {},
      pendingSeatIds: seatOrder.slice(),
      roundHistory: [],
      formulaParams,
      justUnlockedTier: false,
      prizeTokenUnlocked: false,
      prizeTokenAchievers: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) {
      return { ok: false, reason: 'Invalid action' };
    }

    if (action.type === 'CONCLUDE_MATCH') {
      if (fullState.phase !== 'closing_bell') {
        return { ok: false, reason: 'Match is not at closing bell' };
      }
      return { ok: true };
    }

    if (fullState.phase !== 'trading') {
      return { ok: false, reason: 'Trading floor is closed' };
    }

    const pl = fullState.players[seatId];
    if (!pl) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'BUY_CASH') {
      if (pl.pieces < 1) return { ok: false, reason: 'Not enough Devil Pieces' };
      return { ok: true };
    }

    if (action.type === 'BUY_INTEL') {
      if (pl.pieces < 1) return { ok: false, reason: 'Not enough Devil Pieces' };
      const stockId = action.payload?.stockId;
      if (!STOCK_MAP[stockId]) return { ok: false, reason: 'Invalid stock' };
      const globalTier = getGlobalClueTier(fullState.round, fullState.totalRounds);
      const effTier = Math.max(globalTier, pl.intelBonus[stockId] || 0);
      if (effTier >= 4) return { ok: false, reason: 'Formula already 100% declassified' };
      return { ok: true };
    }

    if (action.type === 'SUBMIT_ORDER') {
      if (!fullState.pendingSeatIds.includes(seatId)) {
        return { ok: false, reason: 'Order already locked for this round' };
      }
      const deltas = action.payload?.deltas || {};
      const secretStockId = action.payload?.secretStockId || null;
      if (secretStockId !== null && !STOCK_MAP[secretStockId]) {
        return { ok: false, reason: 'Invalid Secret target stock' };
      }

      let netCost = 0;
      for (const sid of STOCK_IDS) {
        const raw = deltas[sid] ?? 0;
        if (!Number.isFinite(Number(raw)) || Math.trunc(Number(raw)) !== Number(raw)) {
          return { ok: false, reason: 'Share quantity must be an integer' };
        }
        const d = Math.trunc(Number(raw));
        if ((pl.holdings[sid] || 0) + d < 0) {
          return { ok: false, reason: `Cannot short-sell ${STOCK_MAP[sid].ticker}` };
        }
        netCost += d * fullState.prices[sid];
      }
      if (netCost > pl.cash) {
        return { ok: false, reason: 'Insufficient KRW cash for this order' };
      }
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action) {
    if (action.type === 'CONCLUDE_MATCH') {
      const next = cloneState(fullState);
      next.phase = 'ended';
      return { state: next, events: [{ type: 'MATCH_CONCLUDED' }] };
    }

    if (action.type === 'BUY_CASH') {
      const next = cloneState(fullState);
      const pl = next.players[seatId];
      pl.pieces -= 1;
      pl.cash += PIECE_CASH_VALUE;
      pl.pieceActionsCount += 1;
      return {
        state: next,
        events: [{ type: 'PIECE_CASH', seatId, amount: PIECE_CASH_VALUE }],
      };
    }

    if (action.type === 'BUY_INTEL') {
      const next = cloneState(fullState);
      const pl = next.players[seatId];
      const stockId = action.payload.stockId;
      const globalTier = getGlobalClueTier(next.round, next.totalRounds);
      const curTier = Math.max(globalTier, pl.intelBonus[stockId] || 0);
      pl.pieces -= 1;
      pl.intelBonus[stockId] = Math.min(4, curTier + 1);
      pl.pieceActionsCount += 1;
      return {
        state: next,
        events: [{ type: 'PIECE_INTEL', seatId, stockId }],
      };
    }

    if (action.type === 'SUBMIT_ORDER') {
      const next = cloneState(fullState);
      const cleanDeltas = emptyHoldings();
      const rawDeltas = action.payload?.deltas || {};
      for (const sid of STOCK_IDS) {
        cleanDeltas[sid] = Math.trunc(Number(rawDeltas[sid]) || 0);
      }
      next.pendingOrders[seatId] = {
        deltas: cleanDeltas,
        secretStockId: action.payload?.secretStockId || null,
      };
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);

      // If all players have locked their orders, settle the round immediately!
      if (next.pendingSeatIds.length === 0) {
        return settleRound(next);
      }

      return {
        state: next,
        events: [{ type: 'ORDER_LOCKED', seatId }],
      };
    }

    return { state: fullState };
  },

  onPhaseTimeout(fullState) {
    if (fullState.phase === 'trading') {
      // Auto-hold for any player who hasn't submitted before closing bell
      const next = cloneState(fullState);
      for (const sid of next.pendingSeatIds) {
        next.pendingOrders[sid] = { deltas: emptyHoldings(), secretStockId: null };
      }
      next.pendingSeatIds = [];
      return settleRound(next);
    }
    if (fullState.phase === 'closing_bell') {
      const next = cloneState(fullState);
      next.phase = 'ended';
      return { state: next, events: [{ type: 'MATCH_CONCLUDED' }] };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'trading' && fullState.turnTimerSec > 0) {
      return {
        phaseKey: `trading-r${fullState.round}`,
        durationMs: fullState.turnTimerSec * 1000,
      };
    }
    return null;
  },

  /**
   * STRICT SECRET PROJECTION:
   * - Strips other players' private cash, holdings, pending orders, and personal Piece-bought intel.
   * - Never leaks unrevealed formula parameters or locked clue segments!
   */
  projectState(fullState, viewerSeatId) {
    const isFinished = fullState.phase === 'closing_bell' || fullState.phase === 'ended';
    const globalTier = isFinished
      ? 4
      : getGlobalClueTier(fullState.round, fullState.totalRounds);
    const viewer = viewerSeatId ? fullState.players[viewerSeatId] : null;

    // Build clues strictly up to viewer's effective tier per stock
    const clues = {};
    for (const sid of STOCK_IDS) {
      const personalTier = viewer ? viewer.intelBonus[sid] || 0 : 0;
      const effectiveTier = isFinished ? 4 : Math.max(globalTier, personalTier);
      clues[sid] = buildRedactedClue(sid, fullState.formulaParams, effectiveTier);
    }

    // Build sanitized player table
    const playersSummary = fullState.seatOrder.map((sid) => {
      const pl = fullState.players[sid];
      const isMe = sid === viewerSeatId;
      const submitted = !fullState.pendingSeatIds.includes(sid);
      const nw = computeNetWorth(pl, fullState.prices);
      return {
        seatId: sid,
        name: pl.name,
        avatar: pl.avatar,
        isBot: pl.isBot,
        pieces: pl.pieces,
        submitted,
        // Exact portfolio only visible to self during match, or to all at closing_bell/ended
        cash: isMe || isFinished ? pl.cash : null,
        holdings: isMe || isFinished ? { ...pl.holdings } : null,
        netWorth: isMe || isFinished ? nw : null,
        achievedPrizeTarget: nw >= PRIZE_TARGET_KRW,
      };
    });

    // If Alt Enter is fully declassified for viewer (tier >= 3) or finished, expose logo silhouette overlay flag
    const altTier = clues.alt.tier;

    return {
      phase: fullState.phase,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      formulaMode: fullState.formulaMode,
      unlockSchedule: getUnlockSchedule(fullState.totalRounds),
      globalTier,
      justUnlockedTier: fullState.justUnlockedTier,
      prices: { ...fullState.prices },
      priceHistory: fullState.priceHistory.map((h) => ({ ...h })),
      lastTotalHoldingsPublic: { ...fullState.lastTotalHoldingsPublic },
      lastSecretStocks: [...fullState.lastSecretStocks],
      pendingSeatIds: [...fullState.pendingSeatIds],
      roundHistory: fullState.roundHistory.slice(-10),
      clues,
      altLogoRevealed: altTier >= 3 || isFinished,
      altLogoInverted: altTier >= 3 || isFinished ? Boolean(fullState.formulaParams.altInverted) : false,
      prizeTokenUnlocked: fullState.prizeTokenUnlocked,
      prizeTokenAchievers: [...fullState.prizeTokenAchievers],
      players: playersSummary,
      me: viewer
        ? {
            seatId: viewer.seatId,
            cash: viewer.cash,
            pieces: viewer.pieces,
            holdings: { ...viewer.holdings },
            netWorth: computeNetWorth(viewer, fullState.prices),
            submitted: !fullState.pendingSeatIds.includes(viewer.seatId),
            lockedOrder: fullState.pendingOrders[viewer.seatId] || null,
          }
        : null,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    return decideBotAction(fullState, botSeatId, ctx);
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;
    const ranked = fullState.seatOrder
      .map((sid) => {
        const pl = fullState.players[sid];
        const nw = computeNetWorth(pl, fullState.prices);
        return { seatId: sid, name: pl.name, netWorth: nw, pieces: pl.pieces };
      })
      .sort((a, b) => b.netWorth - a.netWorth || b.pieces - a.pieces);

    const topWorth = ranked[0]?.netWorth ?? 0;
    const winnerSeatIds = ranked.filter((r) => r.netWorth === topWorth).map((r) => r.seatId);
    const fmt = (n) => `₩${Math.round(n).toLocaleString('en-US')}`;

    const prizeNoteZh = fullState.prizeTokenUnlocked
      ? ' 🏆 达成 1,000 万韩元大关，成功赢取 1 枚奖金徽章（+1亿韩元）！'
      : ' 未触发 1,000 万韩元奖金徽章线。';
    const prizeNoteEn = fullState.prizeTokenUnlocked
      ? ' 🏆 ₩10,000,000 milestone breached — Prize Token (+₩100M) UNLOCKED!'
      : ' ₩10,000,000 Prize Token milestone was not reached.';

    return {
      winnerSeatIds,
      rankings: ranked.map((r, idx) => ({
        seatId: r.seatId,
        score: r.netWorth,
        label:
          idx === 0
            ? `${fmt(r.netWorth)} · ★`
            : idx === ranked.length - 1
            ? `${fmt(r.netWorth)} · ✕`
            : fmt(r.netWorth),
      })),
      summary: {
        zh: `${fullState.totalRounds} 轮交易收盘！冠军净资产 ${fmt(topWorth)}，夺得「联盟徽章」。${prizeNoteZh}`,
        en: `Closing bell after ${fullState.totalRounds} rounds! Winner finishes at ${fmt(topWorth)} and claims the Alliance Token.${prizeNoteEn}`,
      },
    };
  },
};
