/**
 * The Devil's Plan Season 3: Dead Again — Day 4 Main Match 4
 * 拍卖宾果 (Auction Bingo / 경매 빙고) — Pure Deterministic Rules Engine
 *
 * Authentic Rules (Ep 9–10):
 *  - 7 Rounds, 4–8 contestants + optional Special Guest "Orbit" (轨道) AI seat
 *  - Identical 3×3 luminous bingo board across all players (3× ○, 3× △, 3× ☆)
 *  - 7 Name Tickets + 10 non-splittable all-pay coins [1,1,1, 2,2,2, 3,3, 5, 10] (total 30)
 *  - 1 Devil's Piece (optional 1 Piece = 1 Coin bid boost, non-refundable)
 *  - Phase 1: Shape Selection (secretly drop 1 Name Ticket into ○ / △ / ☆ -> revealed publicly)
 *    Prize Quantity for each shape = exact count N of players who chose that shape!
 *  - Phase 2: Sealed-Bid All-Pay Auction (must bid >= 1 if solvent; bankrupt -> forfeit penalty)
 *    Highest bidder wins N tiles; k-way tie -> each gets floor(N / k), remainder destroyed!
 *  - Blind Mode (Show Hardcore): Winners & bids stay sealed until Round 7 Grand Reveal!
 *    Transparent Variant: Each player privately learns only their own round win/loss.
 *  - Grand Reveal: Unseal all 7 rounds, place earned tiles onto 3×3 board to maximize Bingos.
 */

export const SHAPES = ['O', 'T', 'S'];

export const TOTAL_ROUNDS = 7;

export const INITIAL_COIN_VALUES = [1, 1, 1, 2, 2, 2, 3, 3, 5, 10];

export const BINGO_LINES = [
  [0, 1, 2], // Row 0
  [3, 4, 5], // Row 1
  [6, 7, 8], // Row 2
  [0, 3, 6], // Col 0
  [1, 4, 7], // Col 1
  [2, 5, 8], // Col 2
  [0, 4, 8], // Main Diag
  [2, 4, 6], // Anti Diag
];

export const ORBIT_SEAT_ID = 'guest-orbit';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeCoins() {
  return INITIAL_COIN_VALUES.map((value, idx) => ({
    id: `c${idx}`,
    value,
    spent: false,
    spentRound: null,
  }));
}

/**
 * Generate a balanced 3×3 layout with exactly 3 of each shape (○, △, ☆).
 * Uses a deterministic permutation of the classic Latin-diamond pattern so
 * every row & column has {O, T, S}, one diagonal is a pure 3-of-a-kind line,
 * and all players share the exact same board.
 */
function generateBoardLayout(rng) {
  const perm = [...SHAPES];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const [a, b, c] = perm;
  // Classic Latin-diamond: anti-diagonal [2,4,6] is pure [c, c, c]
  return [
    a, b, c,
    b, c, a,
    c, a, b,
  ];
}

export function evaluateBoard(boardLayout, filledCells) {
  const filledSet = new Set(filledCells);
  const completedLines = [];
  for (let li = 0; li < BINGO_LINES.length; li++) {
    const line = BINGO_LINES[li];
    if (line.every((idx) => filledSet.has(idx))) {
      completedLines.push(li);
    }
  }
  const bingoCount = completedLines.length;
  const filledCount = filledSet.size;
  const score = bingoCount * 3 + filledCount;
  return { bingoCount, filledCount, score, completedLines };
}

/**
 * Find the mathematically optimal cell placement on the 3×3 board given earned tile counts.
 * Exhaustively searches combinations per shape (at most C(3,1)^3 = 27 states — instant!).
 */
export function computeOptimalPlacement(boardLayout, earnedTiles) {
  const byShape = { O: [], T: [], S: [] };
  boardLayout.forEach((sh, idx) => byShape[sh].push(idx));

  function combos(arr, k) {
    if (k <= 0) return [[]];
    if (k >= arr.length) return [[...arr]];
    const out = [];
    const rec = (start, acc) => {
      if (acc.length === k) {
        out.push([...acc]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        acc.push(arr[i]);
        rec(i + 1, acc);
        acc.pop();
      }
    };
    rec(0, []);
    return out;
  }

  const cO = combos(byShape.O, Math.min(3, earnedTiles.O || 0));
  const cT = combos(byShape.T, Math.min(3, earnedTiles.T || 0));
  const cS = combos(byShape.S, Math.min(3, earnedTiles.S || 0));

  let bestCells = [];
  let bestKey = -1;

  for (const o of cO) {
    for (const t of cT) {
      for (const s of cS) {
        const cells = [...o, ...t, ...s].sort((x, y) => x - y);
        const ev = evaluateBoard(boardLayout, cells);
        // Prefer more bingo lines, then center cell (4) control, then corner control
        const centerBonus = cells.includes(4) ? 1 : 0;
        const key = ev.bingoCount * 1000 + ev.filledCount * 20 + centerBonus;
        if (key > bestKey) {
          bestKey = key;
          bestCells = cells;
        }
      }
    }
  }
  return bestCells;
}

function getUnspentCoins(player) {
  return player.coins.filter((c) => !c.spent);
}

export function getRemainingCoinValue(player) {
  return player.coins.reduce((sum, c) => sum + (c.spent ? 0 : c.value), 0);
}

/**
 * Subset-sum helper for AI: pick unspent coin IDs (+ optional piece) closest to targetBid,
 * while guaranteeing at least `reserveCoins` unspent coins remain for future rounds.
 */
function pickCoinsForTarget(player, targetBid, roundsRemainingAfterThis, allowPiece = true) {
  const unspent = getUnspentCoins(player);
  const totalAssets = getRemainingCoinValue(player) + (player.pieces || 0);
  if (totalAssets <= 0) {
    return { coinIds: [], usePieces: 0, total: 0 };
  }

  // How many coins we can spend this round while keeping enough 1-coin bids for future rounds
  // (pieces can also act as 1-coin bids if needed)
  const maxSpendCount = Math.max(
    1,
    unspent.length + (player.pieces || 0) - roundsRemainingAfterThis
  );

  // If no coins left, spend 1 piece
  if (unspent.length === 0) {
    return { coinIds: [], usePieces: Math.min(1, player.pieces || 0), total: Math.min(1, player.pieces || 0) };
  }

  // If we must bid strictly 1 (or minimum), pick single smallest coin
  if (targetBid <= 1) {
    const smallest = [...unspent].sort((a, b) => a.value - b.value)[0];
    return { coinIds: [smallest.id], usePieces: 0, total: smallest.value };
  }

  const n = unspent.length;
  let best = null;
  let bestErr = Infinity;

  // Iterate all 2^n subsets (n <= 10 => max 1024 iterations, super fast!)
  const maxMask = 1 << n;
  const maxPieceTry = allowPiece && (player.pieces || 0) > 0 ? 1 : 0;

  for (let p = 0; p <= maxPieceTry; p++) {
    for (let mask = 0; mask < maxMask; mask++) {
      let sum = p;
      let count = p;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          sum += unspent[i].value;
          count += 1;
        }
      }
      if (sum < 1) continue;
      if (count > maxSpendCount) continue;

      // Prefer exact or slightly above target, using fewer coins so we preserve flexibility
      const diff = Math.abs(sum - targetBid);
      const overshootPenalty = sum > targetBid ? 0.15 : 0.35;
      const coinCountPenalty = count * 0.08;
      const piecePenalty = p * 0.25;
      const score = diff + overshootPenalty * Math.abs(sum - targetBid) + coinCountPenalty + piecePenalty;

      if (score < bestErr) {
        bestErr = score;
        const coinIds = [];
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) coinIds.push(unspent[i].id);
        }
        best = { coinIds, usePieces: p, total: sum };
      }
    }
  }

  if (!best) {
    const smallest = [...unspent].sort((a, b) => a.value - b.value)[0];
    return { coinIds: [smallest.id], usePieces: 0, total: smallest.value };
  }
  return best;
}

/**
 * Strategic AI choice for Shape Selection (used for both Bot seats and Special Guest Orbit).
 */
function chooseAIShape(state, seatId, rng) {
  const player = state.players[seatId];
  const isOrbit = seatId === ORBIT_SEAT_ID;
  const blind = Boolean(state.options.blindMode);

  // Estimate current owned tiles (in blind mode, AI estimates based on its own past bids)
  const est = { O: 0, T: 0, S: 0 };
  if (!blind) {
    est.O = player.earnedTiles.O;
    est.T = player.earnedTiles.T;
    est.S = player.earnedTiles.S;
  } else {
    // Estimate expected tiles from own history (never peeks at true blind wins!)
    for (const h of state.roundHistory) {
      const myChoice = h.entrantsByShape.O.includes(seatId)
        ? 'O'
        : h.entrantsByShape.T.includes(seatId)
        ? 'T'
        : h.entrantsByShape.S.includes(seatId)
        ? 'S'
        : null;
      if (!myChoice) continue;
      const myBid = h.bidsBySeat[seatId]?.total || 0;
      const poolN = h.pools[myChoice] || 1;
      if (poolN === 1 && myBid >= 1) {
        est[myChoice] += 1;
      } else if (myBid >= 5) {
        est[myChoice] += poolN * 0.58;
      } else if (myBid >= 3) {
        est[myChoice] += poolN * 0.32;
      } else if (myBid >= 2) {
        est[myChoice] += poolN * 0.14;
      }
    }
  }

  // Identify pure diagonal shape (highest strategic value on Latin-diamond board!)
  const pureDiagShape = state.boardLayout[4]; // center cell appears in anti-diag [2,4,6]

  // Score each shape
  const weights = SHAPES.map((sh) => {
    const need = Math.max(0.15, 3 - est[sh]);
    let w = need * 2.2;
    if (sh === pureDiagShape && est[sh] < 2.6) w += 1.1;
    // Slight preference to diversify if we already chased a shape recently
    if (isOrbit) {
      // Special Guest Orbit loves creating strategic tension & disrupting pure shapes
      w += 0.8 + rng() * 2.4;
    } else {
      w += rng() * 1.4;
    }
    return { sh, w };
  });

  const totalW = weights.reduce((s, x) => s + x.w, 0);
  let r = rng() * totalW;
  for (const item of weights) {
    r -= item.w;
    if (r <= 0) return item.sh;
  }
  return weights[0].sh;
}

/**
 * Strategic AI choice for Sealed Bid (used for both Bot seats and Special Guest Orbit).
 */
function chooseAIBid(state, seatId, rng) {
  const player = state.players[seatId];
  const isOrbit = seatId === ORBIT_SEAT_ID;
  const shape = state.currentRound.shapeChoices[seatId];
  const poolCount = state.currentRound.pools[shape] || 1;
  const roundsAfter = TOTAL_ROUNDS - state.round;
  const remVal = getRemainingCoinValue(player) + (player.pieces || 0);

  if (remVal <= 0) {
    return { coinIds: [], usePieces: 0 };
  }

  // Solo in pool! Always bid 1 (smallest coin) to guarantee the free tile cleanly
  if (poolCount === 1) {
    const pick = pickCoinsForTarget(player, 1, roundsAfter, false);
    return { coinIds: pick.coinIds, usePieces: pick.usePieces };
  }

  // Estimate need for this shape
  const blind = Boolean(state.options.blindMode);
  let estOwned = blind ? 0 : player.earnedTiles[shape];
  if (blind) {
    for (const h of state.roundHistory) {
      if (h.entrantsByShape[shape]?.includes(seatId)) {
        const b = h.bidsBySeat[seatId]?.total || 0;
        const n = h.pools[shape] || 1;
        if (n === 1 && b >= 1) estOwned += 1;
        else if (b >= 6) estOwned += n * 0.65;
        else if (b >= 3) estOwned += n * 0.3;
      }
    }
  }
  const need = Math.max(0, 3 - estOwned);
  const effectiveTiles = Math.min(poolCount, Math.max(0.6, need));
  const avgBudgetPerRound = remVal / Math.max(1, roundsAfter + 1);

  // Decide whether to contest aggressively or sandbag with a 1-coin bid
  let targetBid = 1;
  const contestRoll = rng();
  const isFinalRound = state.round === TOTAL_ROUNDS;

  if (isFinalRound) {
    // Round 7: spend remaining budget aggressively if we still need tiles!
    if (need >= 0.8 || isOrbit) {
      targetBid = Math.min(remVal, Math.max(2, Math.round(remVal * (0.65 + rng() * 0.35))));
    } else {
      targetBid = Math.max(1, Math.round(remVal * 0.35));
    }
  } else if (poolCount >= 4 && (need >= 1.5 || isOrbit)) {
    // Mega-pool! Huge incentive to drop a 5, 6, 8, or 10+1 bomb
    if (contestRoll < 0.72) {
      targetBid = Math.round(avgBudgetPerRound * (1.55 + rng() * 0.95));
      if (poolCount >= 5 && remVal >= 12 && rng() < 0.45) {
        targetBid = Math.max(targetBid, 10 + (rng() < 0.5 ? 1 : 0));
      }
    } else {
      // Tactical sandbag: let rivals burn their 10-coin!
      targetBid = 1;
    }
  } else if (poolCount === 3 && need >= 1.0) {
    if (contestRoll < 0.62) {
      targetBid = Math.round(avgBudgetPerRound * (1.1 + rng() * 0.75) + (effectiveTiles >= 2.2 ? 1.5 : 0));
    } else {
      targetBid = 1;
    }
  } else if (poolCount === 2 && need >= 0.8) {
    if (contestRoll < 0.58) {
      targetBid = Math.round(avgBudgetPerRound * (0.75 + rng() * 0.65));
    } else {
      targetBid = 1;
    }
  } else {
    // Low need: mostly sandbag with 1, occasionally snipe to block opponents
    targetBid = contestRoll < 0.25 ? Math.max(2, Math.round(avgBudgetPerRound * 0.7)) : 1;
  }

  // Orbit adds crisp unpredictability (frequently bids odd anti-tie numbers like 4, 6, 7, 11)
  if (isOrbit && targetBid >= 3 && rng() < 0.5) {
    targetBid += rng() < 0.5 ? 1 : -1;
  }

  targetBid = Math.max(1, Math.min(remVal, targetBid));
  const usePieceOk = (state.round >= 4 && poolCount >= 3) || isFinalRound;
  const pick = pickCoinsForTarget(player, targetBid, roundsAfter, usePieceOk);
  return { coinIds: pick.coinIds, usePieces: pick.usePieces };
}

function realSeatIds(state) {
  return state.seatOrder.filter((id) => id !== ORBIT_SEAT_ID);
}

function advanceToBidding(state, rng) {
  // Ensure Special Guest Orbit submits shape if active
  if (state.hasOrbit && !state.currentRound.shapeChoices[ORBIT_SEAT_ID]) {
    state.currentRound.shapeChoices[ORBIT_SEAT_ID] = chooseAIShape(state, ORBIT_SEAT_ID, rng);
    state.players[ORBIT_SEAT_ID].ticketsLeft = Math.max(0, state.players[ORBIT_SEAT_ID].ticketsLeft - 1);
  }

  const pools = { O: 0, T: 0, S: 0 };
  const entrantsByShape = { O: [], T: [], S: [] };
  for (const sid of state.seatOrder) {
    const sh = state.currentRound.shapeChoices[sid];
    if (sh && pools[sh] !== undefined) {
      pools[sh] += 1;
      entrantsByShape[sh].push(sid);
    }
  }

  state.currentRound.pools = pools;
  state.currentRound.entrantsByShape = entrantsByShape;
  state.currentRound.bids = {};
  state.phase = 'BIDDING';
  state.pendingSeatIds = realSeatIds(state);

  // Orbit locks its sealed bid immediately once public pools are known
  if (state.hasOrbit) {
    const orbitBid = chooseAIBid(state, ORBIT_SEAT_ID, rng);
    const orbitP = state.players[ORBIT_SEAT_ID];
    const total =
      orbitBid.coinIds.reduce((s, cid) => {
        const c = orbitP.coins.find((x) => x.id === cid && !x.spent);
        return s + (c ? c.value : 0);
      }, 0) + orbitBid.usePieces;
    state.currentRound.bids[ORBIT_SEAT_ID] = {
      coinIds: orbitBid.coinIds,
      usePieces: orbitBid.usePieces,
      total,
      forfeit: total < 1,
    };
  }
}

function resolveAuctionRound(state, rng) {
  // 1. Ensure Orbit has a bid
  if (state.hasOrbit && !state.currentRound.bids[ORBIT_SEAT_ID]) {
    const ob = chooseAIBid(state, ORBIT_SEAT_ID, rng);
    const op = state.players[ORBIT_SEAT_ID];
    const tot =
      ob.coinIds.reduce((s, cid) => {
        const c = op.coins.find((x) => x.id === cid && !x.spent);
        return s + (c ? c.value : 0);
      }, 0) + ob.usePieces;
    state.currentRound.bids[ORBIT_SEAT_ID] = {
      coinIds: ob.coinIds,
      usePieces: ob.usePieces,
      total: tot,
      forfeit: tot < 1,
    };
  }

  // 2. Deduct all-pay coins & pieces for every participant
  const bidsBySeat = {};
  for (const sid of state.seatOrder) {
    const p = state.players[sid];
    const bid = state.currentRound.bids[sid] || { coinIds: [], usePieces: 0, total: 0, forfeit: true };
    const coinValues = [];
    for (const cid of bid.coinIds) {
      const coin = p.coins.find((c) => c.id === cid && !c.spent);
      if (coin) {
        coin.spent = true;
        coin.spentRound = state.round;
        coinValues.push(coin.value);
      }
    }
    const spentPieces = Math.min(p.pieces || 0, Math.max(0, bid.usePieces || 0));
    p.pieces = Math.max(0, (p.pieces || 0) - spentPieces);
    const total = coinValues.reduce((a, b) => a + b, 0) + spentPieces;
    const forfeit = total < 1;
    if (forfeit) {
      p.bankruptPenalty = true;
    }
    bidsBySeat[sid] = {
      shape: state.currentRound.shapeChoices[sid],
      coinValues,
      usePieces: spentPieces,
      total,
      forfeit,
    };
  }

  // 3. Resolve each shape pool independently
  const shapeResults = {};
  for (const sh of SHAPES) {
    const entrants = state.currentRound.entrantsByShape[sh] || [];
    const poolQty = entrants.length;
    const validBidders = entrants.filter((sid) => (bidsBySeat[sid]?.total || 0) >= 1);

    if (poolQty === 0 || validBidders.length === 0) {
      shapeResults[sh] = {
        shape: sh,
        poolQty,
        entrants: [...entrants],
        maxBid: 0,
        winnerSeatIds: [],
        awardEach: 0,
        wasted: poolQty,
      };
      continue;
    }

    let maxBid = 0;
    for (const sid of validBidders) {
      if (bidsBySeat[sid].total > maxBid) maxBid = bidsBySeat[sid].total;
    }
    const winners = validBidders.filter((sid) => bidsBySeat[sid].total === maxBid);
    const awardEach = Math.floor(poolQty / winners.length);
    const wasted = poolQty - awardEach * winners.length;

    for (const wsid of winners) {
      state.players[wsid].earnedTiles[sh] += awardEach;
    }

    shapeResults[sh] = {
      shape: sh,
      poolQty,
      entrants: [...entrants],
      maxBid,
      winnerSeatIds: winners,
      awardEach,
      wasted,
    };
  }

  const record = {
    round: state.round,
    pools: { ...state.currentRound.pools },
    entrantsByShape: clone(state.currentRound.entrantsByShape),
    bidsBySeat,
    shapeResults,
  };
  state.roundHistory.push(record);
  state.phase = 'ROUND_SUMMARY';
  state.pendingSeatIds = [];
  state.currentTurnSeatId = null;
}

function enterNextRoundOrReveal(state) {
  if (state.round >= TOTAL_ROUNDS) {
    // Enter GRAND_REVEAL: Unseal all 7 rounds & let players place earned tiles onto 3×3 board
    state.phase = 'GRAND_REVEAL';
    state.pendingSeatIds = [];

    for (const sid of state.seatOrder) {
      const p = state.players[sid];
      const optimal = computeOptimalPlacement(state.boardLayout, p.earnedTiles);
      p.placedCells = optimal;
      const ev = evaluateBoard(state.boardLayout, optimal);
      p.bingoCount = ev.bingoCount;
      p.filledCount = ev.filledCount;
      p.score = ev.score;
      p.completedLines = ev.completedLines;

      if (p.isBot || p.isGuest) {
        p.boardLocked = true;
      } else {
        p.boardLocked = false;
        state.pendingSeatIds.push(sid);
      }
    }

    // If somehow no human players remain, finalize immediately
    if (state.pendingSeatIds.length === 0) {
      finalizeMatch(state);
    }
    return;
  }

  // Advance to next round
  state.round += 1;
  state.phase = 'SHAPE_SELECT';
  state.currentRound = {
    shapeChoices: {},
    pools: { O: 0, T: 0, S: 0 },
    entrantsByShape: { O: [], T: [], S: [] },
    bids: {},
  };
  state.pendingSeatIds = realSeatIds(state);
  state.currentTurnSeatId = null;
}

function finalizeMatch(state) {
  for (const sid of state.seatOrder) {
    const p = state.players[sid];
    const ev = evaluateBoard(state.boardLayout, p.placedCells);
    p.bingoCount = ev.bingoCount;
    p.filledCount = ev.filledCount;
    p.score = ev.score;
    p.completedLines = ev.completedLines;
    p.boardLocked = true;
  }
  state.phase = 'FINISHED';
  state.pendingSeatIds = [];
  state.currentTurnSeatId = null;
}

function sortContestants(state) {
  const contestants = state.seatOrder
    .map((id) => state.players[id])
    .filter((p) => !p.isGuest);

  return contestants.sort((a, b) => {
    // Bankrupt forfeit penalty goes strictly to the bottom
    if (a.bankruptPenalty !== b.bankruptPenalty) {
      return a.bankruptPenalty ? 1 : -1;
    }
    // Primary: More Bingo lines
    if (b.bingoCount !== a.bingoCount) return b.bingoCount - a.bingoCount;
    // Secondary: More filled cells
    if (b.filledCount !== a.filledCount) return b.filledCount - a.filledCount;
    // Tertiary: Higher remaining coin value
    const remA = getRemainingCoinValue(a);
    const remB = getRemainingCoinValue(b);
    if (remB !== remA) return remB - remA;
    // Quaternary: More remaining Devil's Pieces
    if ((b.pieces || 0) !== (a.pieces || 0)) return (b.pieces || 0) - (a.pieces || 0);
    return state.seatOrder.indexOf(a.seatId) - state.seatOrder.indexOf(b.seatId);
  });
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const options = {
      blindMode: ctx.options?.blindMode !== false,
      includeOrbit: ctx.options?.includeOrbit !== false,
      fastTimers: Boolean(ctx.options?.fastTimers),
    };

    const boardLayout = generateBoardLayout(rng);
    const players = {};
    const seatOrder = [];

    for (const s of seats) {
      seatOrder.push(s.seatId);
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
        isGuest: false,
        ticketsLeft: TOTAL_ROUNDS,
        coins: makeCoins(),
        pieces: 1,
        earnedTiles: { O: 0, T: 0, S: 0 },
        placedCells: [],
        completedLines: [],
        bingoCount: 0,
        filledCount: 0,
        score: 0,
        boardLocked: false,
        bankruptPenalty: false,
      };
    }

    const hasOrbit = Boolean(options.includeOrbit);
    if (hasOrbit) {
      seatOrder.push(ORBIT_SEAT_ID);
      players[ORBIT_SEAT_ID] = {
        seatId: ORBIT_SEAT_ID,
        name: '轨道 Orbit ★',
        avatar: '☄',
        isBot: true,
        isGuest: true,
        ticketsLeft: TOTAL_ROUNDS,
        coins: makeCoins(),
        pieces: 1,
        earnedTiles: { O: 0, T: 0, S: 0 },
        placedCells: [],
        completedLines: [],
        bingoCount: 0,
        filledCount: 0,
        score: 0,
        boardLocked: false,
        bankruptPenalty: false,
      };
    }

    return {
      options,
      boardLayout,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      phase: 'SHAPE_SELECT', // 'SHAPE_SELECT' | 'BIDDING' | 'ROUND_SUMMARY' | 'GRAND_REVEAL' | 'FINISHED'
      hasOrbit,
      seatOrder,
      players,
      currentRound: {
        shapeChoices: {},
        pools: { O: 0, T: 0, S: 0 },
        entrantsByShape: { O: [], T: [], S: [] },
        bids: {},
      },
      roundHistory: [],
      pendingSeatIds: seats.map((s) => s.seatId),
      currentTurnSeatId: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) return { ok: false, reason: 'Invalid action' };
    const player = fullState.players[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'SELECT_SHAPE') {
      if (fullState.phase !== 'SHAPE_SELECT') return { ok: false, reason: 'Not in shape selection phase' };
      if (fullState.currentRound.shapeChoices[seatId]) return { ok: false, reason: 'Shape already locked' };
      const sh = action.payload?.shape;
      if (!SHAPES.includes(sh)) return { ok: false, reason: 'Invalid shape' };
      return { ok: true };
    }

    if (action.type === 'SUBMIT_BID') {
      if (fullState.phase !== 'BIDDING') return { ok: false, reason: 'Not in bidding phase' };
      if (fullState.currentRound.bids[seatId]) return { ok: false, reason: 'Bid already sealed' };
      const coinIds = Array.isArray(action.payload?.coinIds) ? [...new Set(action.payload.coinIds)] : [];
      const usePieces = Math.max(0, Math.floor(Number(action.payload?.usePieces) || 0));

      if (usePieces > (player.pieces || 0)) {
        return { ok: false, reason: 'Not enough Devil Pieces' };
      }

      let sum = usePieces;
      for (const cid of coinIds) {
        const coin = player.coins.find((c) => c.id === cid);
        if (!coin || coin.spent) {
          return { ok: false, reason: 'Selected coin is unavailable or already spent' };
        }
        sum += coin.value;
      }

      const maxPossible = getRemainingCoinValue(player) + (player.pieces || 0);
      if (maxPossible > 0 && sum < 1) {
        return { ok: false, reason: 'Minimum bid is 1 Coin (or 1 Piece)' };
      }
      return { ok: true };
    }

    if (action.type === 'ADVANCE_ROUND') {
      if (fullState.phase !== 'ROUND_SUMMARY') return { ok: false, reason: 'Not in round summary' };
      return { ok: true };
    }

    if (action.type === 'TOGGLE_CELL') {
      if (fullState.phase !== 'GRAND_REVEAL') return { ok: false, reason: 'Not in board placement phase' };
      if (player.boardLocked) return { ok: false, reason: 'Board already locked' };
      const cellIdx = Number(action.payload?.cellIdx);
      if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx > 8) {
        return { ok: false, reason: 'Invalid board cell' };
      }
      const shape = fullState.boardLayout[cellIdx];
      const allowed = Math.min(3, player.earnedTiles[shape] || 0);
      if (allowed === 0) return { ok: false, reason: 'No tiles earned for this shape' };
      if (allowed === 3) return { ok: false, reason: 'All 3 cells of this shape are filled' };
      return { ok: true };
    }

    if (action.type === 'AUTO_OPTIMIZE_BOARD') {
      if (fullState.phase !== 'GRAND_REVEAL') return { ok: false, reason: 'Not in board placement phase' };
      if (player.boardLocked) return { ok: false, reason: 'Board already locked' };
      return { ok: true };
    }

    if (action.type === 'LOCK_BOARD') {
      if (fullState.phase !== 'GRAND_REVEAL') return { ok: false, reason: 'Not in board placement phase' };
      if (player.boardLocked) return { ok: false, reason: 'Already locked' };
      // Ensure player placed the exact allowed number of tiles per shape
      for (const sh of SHAPES) {
        const expected = Math.min(3, player.earnedTiles[sh] || 0);
        const placedForShape = player.placedCells.filter((idx) => fullState.boardLayout[idx] === sh).length;
        if (placedForShape !== expected) {
          return { ok: false, reason: `Must place all ${expected} earned tiles of ${sh}` };
        }
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action type' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const rng = ctx.rng;
    const events = [];
    const player = state.players[seatId];

    if (action.type === 'SELECT_SHAPE') {
      const sh = action.payload.shape;
      state.currentRound.shapeChoices[seatId] = sh;
      player.ticketsLeft = Math.max(0, player.ticketsLeft - 1);
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'SHAPE_LOCKED', seatId, round: state.round });

      if (state.pendingSeatIds.length === 0) {
        advanceToBidding(state, rng);
        events.push({
          type: 'POOLS_REVEALED',
          round: state.round,
          pools: { ...state.currentRound.pools },
        });
      }
      return { state, events };
    }

    if (action.type === 'SUBMIT_BID') {
      const coinIds = Array.isArray(action.payload?.coinIds) ? [...new Set(action.payload.coinIds)] : [];
      const usePieces = Math.max(0, Math.floor(Number(action.payload?.usePieces) || 0));
      let total = usePieces;
      for (const cid of coinIds) {
        const coin = player.coins.find((c) => c.id === cid && !c.spent);
        if (coin) total += coin.value;
      }

      state.currentRound.bids[seatId] = {
        coinIds,
        usePieces,
        total,
        forfeit: total < 1,
      };
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'BID_SEALED', seatId, round: state.round });

      if (state.pendingSeatIds.length === 0) {
        resolveAuctionRound(state, rng);
        events.push({
          type: 'GAVEL_DROP',
          round: state.round,
          blindMode: state.options.blindMode,
        });
      }
      return { state, events };
    }

    if (action.type === 'ADVANCE_ROUND') {
      const prevRound = state.round;
      enterNextRoundOrReveal(state);
      events.push({
        type: state.phase === 'GRAND_REVEAL' ? 'GRAND_REVEAL_OPEN' : 'ROUND_START',
        round: state.round,
        prevRound,
      });
      return { state, events };
    }

    if (action.type === 'TOGGLE_CELL') {
      const cellIdx = Number(action.payload.cellIdx);
      const shape = state.boardLayout[cellIdx];
      const allowed = Math.min(3, player.earnedTiles[shape] || 0);
      const idxPos = player.placedCells.indexOf(cellIdx);

      if (idxPos >= 0) {
        player.placedCells.splice(idxPos, 1);
      } else {
        const currentShapeCells = player.placedCells.filter((i) => state.boardLayout[i] === shape);
        if (currentShapeCells.length >= allowed) {
          // Swap out the oldest placed cell of this shape for smooth 1-click editing!
          const removeCell = currentShapeCells[0];
          player.placedCells = player.placedCells.filter((i) => i !== removeCell);
        }
        player.placedCells.push(cellIdx);
        player.placedCells.sort((a, b) => a - b);
      }
      const ev = evaluateBoard(state.boardLayout, player.placedCells);
      player.bingoCount = ev.bingoCount;
      player.filledCount = ev.filledCount;
      player.score = ev.score;
      player.completedLines = ev.completedLines;
      events.push({ type: 'CELL_UPDATED', seatId, cellIdx });
      return { state, events };
    }

    if (action.type === 'AUTO_OPTIMIZE_BOARD') {
      player.placedCells = computeOptimalPlacement(state.boardLayout, player.earnedTiles);
      const ev = evaluateBoard(state.boardLayout, player.placedCells);
      player.bingoCount = ev.bingoCount;
      player.filledCount = ev.filledCount;
      player.score = ev.score;
      player.completedLines = ev.completedLines;
      events.push({ type: 'BOARD_OPTIMIZED', seatId });
      return { state, events };
    }

    if (action.type === 'LOCK_BOARD') {
      player.boardLocked = true;
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'BOARD_LOCKED', seatId });
      if (state.pendingSeatIds.length === 0) {
        finalizeMatch(state);
        events.push({ type: 'MATCH_FINISHED' });
      }
      return { state, events };
    }

    return { state, events };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const rng = ctx.rng;
    const events = [];

    if (state.phase === 'SHAPE_SELECT') {
      for (const sid of [...state.pendingSeatIds]) {
        const sh = chooseAIShape(state, sid, rng);
        state.currentRound.shapeChoices[sid] = sh;
        state.players[sid].ticketsLeft = Math.max(0, state.players[sid].ticketsLeft - 1);
      }
      state.pendingSeatIds = [];
      advanceToBidding(state, rng);
      events.push({ type: 'POOLS_REVEALED', round: state.round, timedOut: true });
      return { state, events };
    }

    if (state.phase === 'BIDDING') {
      for (const sid of [...state.pendingSeatIds]) {
        const p = state.players[sid];
        const unspent = getUnspentCoins(p).sort((a, b) => a.value - b.value);
        if (unspent.length > 0) {
          state.currentRound.bids[sid] = {
            coinIds: [unspent[0].id],
            usePieces: 0,
            total: unspent[0].value,
            forfeit: false,
          };
        } else if ((p.pieces || 0) > 0) {
          state.currentRound.bids[sid] = {
            coinIds: [],
            usePieces: 1,
            total: 1,
            forfeit: false,
          };
        } else {
          state.currentRound.bids[sid] = {
            coinIds: [],
            usePieces: 0,
            total: 0,
            forfeit: true,
          };
        }
      }
      state.pendingSeatIds = [];
      resolveAuctionRound(state, rng);
      events.push({ type: 'GAVEL_DROP', round: state.round, timedOut: true });
      return { state, events };
    }

    if (state.phase === 'ROUND_SUMMARY') {
      enterNextRoundOrReveal(state);
      events.push({ type: state.phase === 'GRAND_REVEAL' ? 'GRAND_REVEAL_OPEN' : 'ROUND_START', round: state.round });
      return { state, events };
    }

    if (state.phase === 'GRAND_REVEAL') {
      for (const sid of state.pendingSeatIds) {
        const p = state.players[sid];
        p.placedCells = computeOptimalPlacement(state.boardLayout, p.earnedTiles);
        p.boardLocked = true;
      }
      finalizeMatch(state);
      events.push({ type: 'MATCH_FINISHED', timedOut: true });
      return { state, events };
    }

    return null;
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'FINISHED') return null;
    const fast = Boolean(fullState.options?.fastTimers);

    if (fullState.phase === 'SHAPE_SELECT') {
      return { phaseKey: `r${fullState.round}-shape`, durationMs: fast ? 25000 : 45000 };
    }
    if (fullState.phase === 'BIDDING') {
      return { phaseKey: `r${fullState.round}-bid`, durationMs: fast ? 30000 : 50000 };
    }
    if (fullState.phase === 'ROUND_SUMMARY') {
      return { phaseKey: `r${fullState.round}-summary`, durationMs: fast ? 7000 : 12000 };
    }
    if (fullState.phase === 'GRAND_REVEAL') {
      return { phaseKey: 'grand-reveal', durationMs: fast ? 35000 : 60000 };
    }
    return null;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || !fullState.players[botSeatId]) return null;
    if (fullState.phase === 'SHAPE_SELECT' && fullState.pendingSeatIds.includes(botSeatId)) {
      return {
        type: 'SELECT_SHAPE',
        payload: { shape: chooseAIShape(fullState, botSeatId, ctx.rng) },
      };
    }
    if (fullState.phase === 'BIDDING' && fullState.pendingSeatIds.includes(botSeatId)) {
      const pick = chooseAIBid(fullState, botSeatId, ctx.rng);
      return {
        type: 'SUBMIT_BID',
        payload: { coinIds: pick.coinIds, usePieces: pick.usePieces },
      };
    }
    return null;
  },

  /**
   * STRICT SECRET PROJECTION:
   * - Never leaks other players' shape selections during SHAPE_SELECT
   * - Never leaks other players' bids during BIDDING
   * - In Blind Mode: Never leaks ANY round's winners, bids, or earnedTiles until GRAND_REVEAL
   * - In Transparent Mode: Reveals ONLY viewerSeatId's own win/loss outcome and earnedTiles
   */
  projectState(fullState, viewerSeatId) {
    const revealedAll = fullState.phase === 'GRAND_REVEAL' || fullState.phase === 'FINISHED';
    const blind = Boolean(fullState.options.blindMode);

    const projectedPlayers = {};
    for (const sid of fullState.seatOrder) {
      const p = fullState.players[sid];
      const isViewer = sid === viewerSeatId;
      const unspentCoins = getUnspentCoins(p);

      projectedPlayers[sid] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        isGuest: p.isGuest,
        ticketsLeft: p.ticketsLeft,
        coinsLeftCount: unspentCoins.length,
        coinsSpentCount: p.coins.length - unspentCoins.length,
        pieces: isViewer || revealedAll ? p.pieces : null,
        hasPiece: (p.pieces || 0) > 0,
        bankruptPenalty: p.bankruptPenalty,
        boardLocked: p.boardLocked,
        // Exact coin wallet: private to owner until Grand Reveal
        coins: isViewer || revealedAll ? clone(p.coins) : null,
        remainingCoinValue: isViewer || revealedAll ? getRemainingCoinValue(p) : null,
        // Earned tiles: completely hidden in Blind Mode until Grand Reveal; private in Transparent Mode
        earnedTiles: revealedAll || (!blind && isViewer) ? { ...p.earnedTiles } : null,
        // Final 3×3 placement: visible to owner during Grand Reveal, public when Finished/locked
        placedCells:
          fullState.phase === 'FINISHED' || (fullState.phase === 'GRAND_REVEAL' && (isViewer || p.boardLocked))
            ? [...p.placedCells]
            : null,
        completedLines:
          fullState.phase === 'FINISHED' || (fullState.phase === 'GRAND_REVEAL' && (isViewer || p.boardLocked))
            ? [...p.completedLines]
            : [],
        bingoCount:
          fullState.phase === 'FINISHED' || (fullState.phase === 'GRAND_REVEAL' && (isViewer || p.boardLocked))
            ? p.bingoCount
            : null,
        filledCount:
          fullState.phase === 'FINISHED' || (fullState.phase === 'GRAND_REVEAL' && (isViewer || p.boardLocked))
            ? p.filledCount
            : null,
        score:
          fullState.phase === 'FINISHED' || (fullState.phase === 'GRAND_REVEAL' && (isViewer || p.boardLocked))
            ? p.score
            : null,
      };
    }

    // Current round sanitized view
    const cr = fullState.currentRound;
    const shapeSubmittedSeatIds = Object.keys(cr.shapeChoices);
    const bidSubmittedSeatIds = Object.keys(cr.bids);

    const projectedCurrentRound = {
      shapeSubmittedSeatIds,
      bidSubmittedSeatIds,
      myShapeChoice: viewerSeatId ? cr.shapeChoices[viewerSeatId] || null : null,
      myBid: viewerSeatId && cr.bids[viewerSeatId] ? clone(cr.bids[viewerSeatId]) : null,
      // Pools & entrants become public once SHAPE_SELECT ends
      pools: fullState.phase === 'SHAPE_SELECT' ? null : { ...cr.pools },
      entrantsByShape: fullState.phase === 'SHAPE_SELECT' ? null : clone(cr.entrantsByShape),
    };

    // Round history sanitized view
    const projectedHistory = fullState.roundHistory.map((h) => {
      if (revealedAll) {
        return clone(h);
      }

      const myBidRec = viewerSeatId ? h.bidsBySeat[viewerSeatId] || null : null;
      const base = {
        round: h.round,
        pools: { ...h.pools },
        entrantsByShape: clone(h.entrantsByShape),
        myBid: myBidRec ? clone(myBidRec) : null,
        sealed: blind,
      };

      if (!blind && viewerSeatId && myBidRec) {
        const sr = h.shapeResults[myBidRec.shape];
        const won = Boolean(sr && sr.winnerSeatIds.includes(viewerSeatId) && sr.awardEach > 0);
        base.myOutcome = {
          shape: myBidRec.shape,
          won,
          awarded: won ? sr.awardEach : 0,
          tiedCount: won ? sr.winnerSeatIds.length : 0,
          poolQty: sr ? sr.poolQty : 0,
        };
      }
      return base;
    });

    return {
      options: { ...fullState.options },
      boardLayout: [...fullState.boardLayout],
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      phase: fullState.phase,
      hasOrbit: fullState.hasOrbit,
      seatOrder: [...fullState.seatOrder],
      players: projectedPlayers,
      currentRound: projectedCurrentRound,
      roundHistory: projectedHistory,
      pendingSeatIds: [...fullState.pendingSeatIds],
      currentTurnSeatId: fullState.currentTurnSeatId,
    };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'FINISHED') return null;
    const sorted = sortContestants(fullState);
    if (!sorted.length) return null;

    const top = sorted[0];
    const winners = sorted
      .filter(
        (p) =>
          p.bankruptPenalty === top.bankruptPenalty &&
          p.bingoCount === top.bingoCount &&
          p.filledCount === top.filledCount &&
          getRemainingCoinValue(p) === getRemainingCoinValue(top)
      )
      .map((p) => p.seatId);

    const orbit = fullState.hasOrbit ? fullState.players[ORBIT_SEAT_ID] : null;
    const orbitNoteZh = orbit
      ? `（特邀嘉宾「轨道」完成 ${orbit.bingoCount} 宾果 · ${orbit.filledCount} 格，不占正式名次）`
      : '';
    const orbitNoteEn = orbit
      ? ` (Special Guest Orbit scored ${orbit.bingoCount} Bingo · ${orbit.filledCount} tiles, unranked)`
      : '';

    return {
      winnerSeatIds: winners,
      rankings: sorted.map((p) => ({
        seatId: p.seatId,
        score: p.score,
        label: p.bankruptPenalty
          ? `FORFEIT · ${p.bingoCount} Bingo`
          : `${p.bingoCount} Bingo · ${p.filledCount}/9 · 💰${getRemainingCoinValue(p)}`,
      })),
      summary: {
        zh: `7 轮密室盲拍全部启封！${top.name} 以 ${top.bingoCount} 条宾果线（${top.filledCount}/9 格，余币 ${getRemainingCoinValue(top)}）夺得主赛第一名${orbitNoteZh}`,
        en: `All 7 sealed auctions unsealed! ${top.name} wins Main Match 4 with ${top.bingoCount} Bingo lines (${top.filledCount}/9 tiles, ${getRemainingCoinValue(top)} coins left)${orbitNoteEn}`,
      },
    };
  },
};
