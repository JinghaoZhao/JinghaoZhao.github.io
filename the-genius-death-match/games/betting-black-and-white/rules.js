/**
 * Betting! Black and White (下注黑与白 · 베팅! 흑과 백) — Pure State Machine & 3-Tier AI
 * Official The Genius S3E11 / S4E12 Death Match Rules.
 *
 * 10 tiles (0–9: Even=Black, Odd=White) + 30 chips pre-allocated across 10 slots behind a privacy partition.
 * Partition drops: all 10 slot colors & chip stacks are public while numerals stay secret!
 * Each round:
 *  - Equal chips -> Immediate Showdown (both numerals flip publicly).
 *  - Unequal chips -> Lower bettor must FOLD (neither numeral revealed) OR CALL by borrowing
 *    chips from Reserve Bank and/or future slots (#k+1..#10, each keeping >= 1 chip)!
 *
 * Zero DOM access. All randomness via ctx.rng().
 */

export const ALL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const TOTAL_SLOTS = 10;
export const TOTAL_CHIPS = 30;

export function getTileColor(num) {
  return Number(num) % 2 === 0 ? 'black' : 'white';
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || null;
}

function shuffleWithRng(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getBorrowCapacity(player, currentSlotIdx) {
  let futureSurplus = 0;
  for (let i = currentSlotIdx + 1; i < TOTAL_SLOTS; i++) {
    const slot = player.slots[i];
    if (slot) futureSurplus += Math.max(0, slot.chips - 1);
  }
  return {
    reserve: player.reserve,
    futureSurplus,
    total: player.reserve + futureSurplus,
  };
}

/**
 * Compute a smart default borrow plan to cover `deficit` chips:
 * Pulls from reserve first, then from future slots (prioritizing lowest-tile or largest-stack slots).
 */
export function buildAutoBorrowPlan(player, currentSlotIdx, deficit, smartOrder = false) {
  let rem = deficit;
  const fromReserve = Math.min(player.reserve, rem);
  rem -= fromReserve;
  const fromSlots = {};

  if (rem > 0) {
    const futureIndices = [];
    for (let i = currentSlotIdx + 1; i < TOTAL_SLOTS; i++) {
      if (player.slots[i].chips > 1) futureIndices.push(i);
    }
    if (smartOrder) {
      // AI optimization: borrow first from future slots holding weaker tiles (preserve high-tile value stacks)
      futureIndices.sort((a, b) => {
        const ta = player.slots[a].tile ?? 5;
        const tb = player.slots[b].tile ?? 5;
        if (ta !== tb) return ta - tb;
        return player.slots[b].chips - player.slots[a].chips;
      });
    } else {
      // Default human helper: borrow from largest future stacks first
      futureIndices.sort((a, b) => player.slots[b].chips - player.slots[a].chips);
    }

    for (const idx of futureIndices) {
      if (rem <= 0) break;
      const avail = Math.max(0, player.slots[idx].chips - 1);
      const take = Math.min(avail, rem);
      if (take > 0) {
        fromSlots[idx] = take;
        rem -= take;
      }
    }
  }

  return { ok: rem === 0, fromReserve, fromSlots };
}

function makePhaseLabel(phase) {
  if (phase === 'setup') return { zh: '屏风布阵', en: 'Secret Setup' };
  if (phase === 'equal_showdown') return { zh: '同注亮牌', en: 'Equal Showdown' };
  if (phase === 'clash_decision') return { zh: '跟注 / 弃牌', en: 'Call or Fold' };
  if (phase === 'round_result') return { zh: '本轮结算', en: 'Round Verdict' };
  return { zh: '终局裁决', en: 'Final Verdict' };
}

function validateSetupPayload(payload) {
  if (!payload || !Array.isArray(payload.tiles) || !Array.isArray(payload.chips)) {
    return { ok: false, reason: 'Missing tiles or chips array' };
  }
  if (payload.tiles.length !== TOTAL_SLOTS || payload.chips.length !== TOTAL_SLOTS) {
    return { ok: false, reason: 'Must provide exactly 10 tiles and 10 chip allocations' };
  }
  const seen = new Set();
  for (const t of payload.tiles) {
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0 || n > 9 || seen.has(n)) {
      return { ok: false, reason: 'Tiles must be a permutation of 0–9' };
    }
    seen.add(n);
  }
  let chipSum = 0;
  for (const c of payload.chips) {
    const v = Number(c);
    if (!Number.isInteger(v) || v < 1) {
      return { ok: false, reason: 'Every slot must have at least 1 chip' };
    }
    chipSum += v;
  }
  if (chipSum !== TOTAL_CHIPS) {
    return { ok: false, reason: `Total chips must equal exactly ${TOTAL_CHIPS} (got ${chipSum})` };
  }
  return { ok: true };
}

function enterSlotPhase(next, slotIdx) {
  const [a, b] = next.seatOrder;
  const sa = next.players[a].slots[slotIdx];
  const sb = next.players[b].slots[slotIdx];
  next.round = slotIdx + 1;
  next.currentSlotIdx = slotIdx;

  if (sa.chips === sb.chips) {
    next.phase = 'equal_showdown';
    next.phaseLabel = makePhaseLabel('equal_showdown');
    next.currentTurnSeatId = a;
    next.pendingSeatIds = [];
    next.currentClash = {
      slotIdx,
      higherSeatId: null,
      lowerSeatId: null,
      higherChips: sa.chips,
      lowerChips: sb.chips,
      deficit: 0,
      canCall: false,
      resolution: null,
    };
  } else {
    const higherSeatId = sa.chips > sb.chips ? a : b;
    const lowerSeatId = higherSeatId === a ? b : a;
    const higherChips = Math.max(sa.chips, sb.chips);
    const lowerChips = Math.min(sa.chips, sb.chips);
    const deficit = higherChips - lowerChips;
    const cap = getBorrowCapacity(next.players[lowerSeatId], slotIdx);

    next.phase = 'clash_decision';
    next.phaseLabel = makePhaseLabel('clash_decision');
    next.currentTurnSeatId = lowerSeatId;
    next.pendingSeatIds = [];
    next.currentClash = {
      slotIdx,
      higherSeatId,
      lowerSeatId,
      higherChips,
      lowerChips,
      deficit,
      canCall: cap.total >= deficit,
      resolution: null,
    };
  }
}

function resolveShowdown(next, slotIdx, potPerSide, decisionType, callerSeatId = null, borrowed = null) {
  const [a, b] = next.seatOrder;
  const pa = next.players[a];
  const pb = next.players[b];
  const sa = pa.slots[slotIdx];
  const sb = pb.slots[slotIdx];

  sa.revealed = true;
  sb.revealed = true;
  sa.status = 'resolved';
  sb.status = 'resolved';

  const totalPot = potPerSide * 2;
  let winnerSeatId = null;
  let isDraw = false;

  if (sa.tile > sb.tile) {
    winnerSeatId = a;
    pa.reserve += totalPot;
    pa.showdownWins += 1;
  } else if (sb.tile > sa.tile) {
    winnerSeatId = b;
    pb.reserve += totalPot;
    pb.showdownWins += 1;
  } else {
    isDraw = true;
    pa.reserve += potPerSide;
    pb.reserve += potPerSide;
  }

  sa.outcome = isDraw ? 'draw' : winnerSeatId === a ? 'win' : 'loss';
  sb.outcome = isDraw ? 'draw' : winnerSeatId === b ? 'win' : 'loss';

  const rec = {
    round: slotIdx + 1,
    slotIdx,
    type: decisionType, // 'equal' | 'call'
    callerSeatId,
    borrowed,
    pot: totalPot,
    winnerSeatId,
    isDraw,
    revealed: true,
    plays: {
      [a]: { tile: sa.tile, color: sa.color, finalChips: potPerSide },
      [b]: { tile: sb.tile, color: sb.color, finalChips: potPerSide },
    },
  };
  next.history.push(rec);
  next.currentClash.resolution = rec;

  if (slotIdx >= TOTAL_SLOTS - 1) {
    next.phase = 'finished';
    next.phaseLabel = makePhaseLabel('finished');
    next.currentTurnSeatId = null;
  } else {
    next.phase = 'round_result';
    next.phaseLabel = makePhaseLabel('round_result');
    next.currentTurnSeatId = callerSeatId || a;
  }

  return rec;
}

/**
 * Generate a 10-slot setup for AI bots tailored by difficulty.
 */
function buildBotSetup(difficulty, rng) {
  // Choose a tactical formation
  const tiles = shuffleWithRng(ALL_TILES, rng);
  const chips = new Array(TOTAL_SLOTS).fill(1);
  let extra = TOTAL_CHIPS - TOTAL_SLOTS; // 20 extra chips to distribute

  if (difficulty === 'easy') {
    // Straightforward: heavy chips on 7, 8, 9; light on 0, 1, 2
    const weights = tiles.map((t) => (t >= 7 ? 5 : t >= 4 ? 2 : 0.3) + rng());
    const sumW = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < TOTAL_SLOTS && extra > 0; i++) {
      const add = Math.min(extra, Math.round((weights[i] / sumW) * 20));
      chips[i] += add;
      extra -= add;
    }
    while (extra > 0) {
      const idx = Math.floor(rng() * TOTAL_SLOTS);
      chips[idx] += 1;
      extra -= 1;
    }
    return { tiles, chips };
  }

  // Genius & Grand Final: Polarized + Bluff-Trap + Ambush Schedule!
  // 1) Pick 1-2 low tiles (0, 1, or 2) as BLUFF STACKS (4-6 chips) to steal folds!
  // 2) Keep 1 high tile (8 or 9) as an UNDER-BET AMBUSH TRAP (1-2 chips) to call & crush opponent's big bet!
  // 3) Put strong value stacks (4-6 chips) on remaining high tiles (6, 7, 8/9).
  const trapHighTile = rng() < 0.55 ? 9 : 8;
  const bluffLowTile = rng() < 0.5 ? 0 : 1;
  const secondBluff = difficulty === 'grand_final' && rng() < 0.55 ? 2 : -1;

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const t = tiles[i];
    let target = 1;
    if (t === trapHighTile) {
      target = rng() < 0.65 ? 1 : 2; // Ambush trap!
    } else if (t === bluffLowTile) {
      target = 4 + Math.floor(rng() * 3); // 4-6 chip bluff!
    } else if (t === secondBluff) {
      target = 3 + Math.floor(rng() * 2); // 3-4 chip secondary bluff
    } else if (t >= 7) {
      target = 4 + Math.floor(rng() * 3); // 4-6 value
    } else if (t >= 4) {
      target = 2 + Math.floor(rng() * 2); // 2-3 mid
    } else {
      target = 1 + (rng() < 0.25 ? 1 : 0);
    }
    const add = Math.max(0, Math.min(extra, target - 1));
    chips[i] += add;
    extra -= add;
  }

  // Distribute any remaining extra chips to strong/mid slots
  let guard = 0;
  while (extra > 0 && guard < 100) {
    guard += 1;
    const idx = Math.floor(rng() * TOTAL_SLOTS);
    if (tiles[idx] === trapHighTile && chips[idx] >= 2) continue;
    chips[idx] += 1;
    extra -= 1;
  }
  while (extra > 0) {
    chips[0] += 1;
    extra -= 1;
  }

  return { tiles, chips };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '♦',
        isBot: Boolean(s.isBot),
        setupLocked: false,
        slots: null, // Array of 10 { tile, color, chips, initialChips, revealed, status, outcome }
        reserve: 0,
        showdownWins: 0,
      };
    }

    return {
      seatOrder,
      players,
      round: 0,
      totalRounds: TOTAL_SLOTS,
      currentSlotIdx: -1,
      phase: 'setup', // 'setup' | 'equal_showdown' | 'clash_decision' | 'round_result' | 'finished'
      phaseLabel: makePhaseLabel('setup'),
      currentTurnSeatId: null,
      pendingSeatIds: seatOrder.slice(),
      currentClash: null,
      history: [],
      options: {
        timedMode: Boolean(ctx?.options?.timedMode),
      },
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) {
      return { ok: false, reason: 'Invalid action' };
    }
    if (fullState.phase === 'finished') {
      return { ok: false, reason: 'Match already finished' };
    }
    const player = fullState.players[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'LOCK_SETUP') {
      if (fullState.phase !== 'setup') {
        return { ok: false, reason: 'Not in setup phase' };
      }
      if (player.setupLocked) {
        return { ok: false, reason: 'Formation already locked' };
      }
      return validateSetupPayload(action.payload);
    }

    if (action.type === 'REVEAL_SHOWDOWN') {
      if (fullState.phase !== 'equal_showdown') {
        return { ok: false, reason: 'Not awaiting equal-chip showdown' };
      }
      return { ok: true };
    }

    if (action.type === 'FOLD') {
      if (fullState.phase !== 'clash_decision') {
        return { ok: false, reason: 'Not in call/fold decision phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Only the lower bettor may fold' };
      }
      return { ok: true };
    }

    if (action.type === 'CALL') {
      if (fullState.phase !== 'clash_decision') {
        return { ok: false, reason: 'Not in call/fold decision phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Only the lower bettor may call' };
      }
      const clash = fullState.currentClash;
      const cap = getBorrowCapacity(player, clash.slotIdx);
      if (cap.total < clash.deficit) {
        return { ok: false, reason: 'Not enough reserve or borrowable chips to call' };
      }
      if (action.payload && (action.payload.fromReserve != null || action.payload.fromSlots)) {
        const fromReserve = Number(action.payload.fromReserve || 0);
        if (!Number.isInteger(fromReserve) || fromReserve < 0 || fromReserve > player.reserve) {
          return { ok: false, reason: 'Invalid reserve borrow amount' };
        }
        const fromSlots = action.payload.fromSlots || {};
        let sumSlots = 0;
        for (const [idxStr, amtRaw] of Object.entries(fromSlots)) {
          const idx = Number(idxStr);
          const amt = Number(amtRaw);
          if (!Number.isInteger(idx) || idx <= clash.slotIdx || idx >= TOTAL_SLOTS) {
            return { ok: false, reason: 'Can only borrow from future slots' };
          }
          if (!Number.isInteger(amt) || amt < 0) {
            return { ok: false, reason: 'Invalid borrow amount' };
          }
          if (player.slots[idx].chips - amt < 1) {
            return { ok: false, reason: `Future slot #${idx + 1} must retain at least 1 chip` };
          }
          sumSlots += amt;
        }
        if (fromReserve + sumSlots !== clash.deficit) {
          return { ok: false, reason: `Borrowed chips must equal deficit (${clash.deficit})` };
        }
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'round_result') {
        return { ok: false, reason: 'Not awaiting next round' };
      }
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action) {
    const next = cloneState(fullState);

    if (action.type === 'LOCK_SETUP') {
      const p = next.players[seatId];
      p.setupLocked = true;
      p.slots = action.payload.tiles.map((t, idx) => {
        const tile = Number(t);
        const chips = Number(action.payload.chips[idx]);
        return {
          slotIdx: idx,
          tile,
          color: getTileColor(tile),
          chips,
          initialChips: chips,
          revealed: false,
          status: 'pending',
          outcome: null,
        };
      });
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);

      const bothLocked = next.seatOrder.every((id) => next.players[id].setupLocked);
      if (bothLocked) {
        enterSlotPhase(next, 0);
        return {
          state: next,
          events: [
            {
              type: 'PARTITION_DROPPED',
              round: 1,
              ts: Date.now(),
            },
          ],
        };
      }

      return {
        state: next,
        events: [
          {
            type: 'SETUP_LOCKED',
            seatId,
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'REVEAL_SHOWDOWN') {
      const idx = next.currentSlotIdx;
      const potPerSide = next.currentClash.higherChips;
      const rec = resolveShowdown(next, idx, potPerSide, 'equal', null, null);
      return {
        state: next,
        events: [
          {
            type: 'SHOWDOWN_RESOLVED',
            round: rec.round,
            pot: rec.pot,
            winnerSeatId: rec.winnerSeatId,
            isDraw: rec.isDraw,
            plays: rec.plays, // Public because showdown revealed both numerals!
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'FOLD') {
      const clash = next.currentClash;
      const idx = clash.slotIdx;
      const winnerId = clash.higherSeatId;
      const loserId = clash.lowerSeatId;
      const winner = next.players[winnerId];
      const loser = next.players[loserId];

      const pot = clash.higherChips + clash.lowerChips;
      winner.reserve += pot;

      winner.slots[idx].status = 'resolved';
      winner.slots[idx].outcome = 'win';
      winner.slots[idx].revealed = false; // NEVER revealed on fold!
      loser.slots[idx].status = 'resolved';
      loser.slots[idx].outcome = 'fold';
      loser.slots[idx].revealed = false;

      const rec = {
        round: idx + 1,
        slotIdx: idx,
        type: 'fold',
        folderSeatId: loserId,
        pot,
        winnerSeatId: winnerId,
        isDraw: false,
        revealed: false,
        plays: {
          [winnerId]: { tile: winner.slots[idx].tile, color: winner.slots[idx].color, finalChips: clash.higherChips },
          [loserId]: { tile: loser.slots[idx].tile, color: loser.slots[idx].color, finalChips: clash.lowerChips },
        },
      };
      next.history.push(rec);
      next.currentClash.resolution = rec;

      if (idx >= TOTAL_SLOTS - 1) {
        next.phase = 'finished';
        next.phaseLabel = makePhaseLabel('finished');
        next.currentTurnSeatId = null;
      } else {
        next.phase = 'round_result';
        next.phaseLabel = makePhaseLabel('round_result');
        next.currentTurnSeatId = seatId;
      }

      return {
        state: next,
        events: [
          {
            type: 'ROUND_FOLDED',
            round: rec.round,
            folderSeatId: loserId,
            winnerSeatId: winnerId,
            pot,
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'CALL') {
      const clash = next.currentClash;
      const idx = clash.slotIdx;
      const caller = next.players[seatId];

      let plan;
      if (action.payload && (action.payload.fromReserve != null || action.payload.fromSlots)) {
        plan = {
          fromReserve: Number(action.payload.fromReserve || 0),
          fromSlots: action.payload.fromSlots || {},
        };
      } else {
        plan = buildAutoBorrowPlan(caller, idx, clash.deficit, false);
      }

      // Execute chip borrow
      caller.reserve -= plan.fromReserve;
      for (const [sIdxStr, amtRaw] of Object.entries(plan.fromSlots || {})) {
        const sIdx = Number(sIdxStr);
        const amt = Number(amtRaw);
        if (amt > 0) {
          caller.slots[sIdx].chips -= amt;
        }
      }
      caller.slots[idx].chips = clash.higherChips;

      const rec = resolveShowdown(next, idx, clash.higherChips, 'call', seatId, plan);
      return {
        state: next,
        events: [
          {
            type: 'CALL_SHOWDOWN',
            round: rec.round,
            callerSeatId: seatId,
            pot: rec.pot,
            winnerSeatId: rec.winnerSeatId,
            isDraw: rec.isDraw,
            plays: rec.plays, // Public because showdown revealed both numerals!
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'NEXT_ROUND') {
      enterSlotPhase(next, next.currentSlotIdx + 1);
      return {
        state: next,
        events: [
          {
            type: 'NEXT_SLOT',
            round: next.round,
            ts: Date.now(),
          },
        ],
      };
    }

    return { state: next };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'finished') return null;
    if (!fullState.options?.timedMode) return null;
    if (fullState.phase === 'setup') {
      return { phaseKey: 'bbw-setup', durationMs: 90000 };
    }
    if (fullState.phase === 'clash_decision') {
      return {
        phaseKey: `bbw-r${fullState.round}-decision-${fullState.currentTurnSeatId}`,
        durationMs: 35000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    const rng = ctx?.rng || Math.random;
    if (fullState.phase === 'setup') {
      let cur = fullState;
      for (const sid of fullState.pendingSeatIds) {
        const auto = buildBotSetup('easy', rng);
        const res = this.applyAction(cur, sid, { type: 'LOCK_SETUP', payload: auto }, ctx);
        if (res?.state) cur = res.state;
      }
      return { state: cur, events: [{ type: 'SETUP_TIMEOUT', ts: Date.now() }] };
    }
    if (fullState.phase === 'clash_decision') {
      return this.applyAction(fullState, fullState.currentTurnSeatId, { type: 'FOLD' }, ctx);
    }
    return null;
  },

  /**
   * STRICT STATE PROJECTION:
   * - During 'setup', opponent's slots are NULL (hidden behind partition).
   * - After partition drops, opponent's slot COLORS and CHIP STACKS are public,
   *   but opponent's NUMERALS remain NULL unless that slot went to Showdown (revealed === true)
   *   or the match is finished!
   */
  projectState(fullState, viewerSeatId) {
    const isFinished = fullState.phase === 'finished';
    const isSetup = fullState.phase === 'setup';
    const players = {};

    for (const id of fullState.seatOrder) {
      const p = fullState.players[id];
      const isViewer = id === viewerSeatId;

      let projSlots = null;
      if (p.slots) {
        if (isSetup && !isViewer) {
          projSlots = null; // Behind privacy screen!
        } else {
          projSlots = p.slots.map((sl) => ({
            slotIdx: sl.slotIdx,
            color: sl.color,
            chips: sl.chips,
            initialChips: sl.initialChips,
            revealed: sl.revealed,
            status: sl.status,
            outcome: sl.outcome,
            tile: isFinished || isViewer || sl.revealed ? sl.tile : null,
          }));
        }
      }

      players[id] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        setupLocked: p.setupLocked,
        reserve: p.reserve,
        showdownWins: p.showdownWins,
        slots: projSlots,
      };
    }

    const projectRec = (rec) => {
      if (!rec) return null;
      const plays = {};
      for (const id of fullState.seatOrder) {
        const pl = rec.plays[id];
        if (!pl) continue;
        plays[id] = {
          color: pl.color,
          finalChips: pl.finalChips,
          tile: isFinished || rec.revealed || id === viewerSeatId ? pl.tile : null,
        };
      }
      return {
        ...rec,
        plays,
      };
    };

    const history = fullState.history.map(projectRec);
    const currentClash = fullState.currentClash
      ? {
          ...fullState.currentClash,
          resolution: projectRec(fullState.currentClash.resolution),
        }
      : null;

    return {
      seatOrder: fullState.seatOrder.slice(),
      players,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      currentSlotIdx: fullState.currentSlotIdx,
      phase: fullState.phase,
      phaseLabel: fullState.phaseLabel,
      currentTurnSeatId: fullState.currentTurnSeatId,
      pendingSeatIds: fullState.pendingSeatIds.slice(),
      currentClash,
      history,
      options: { ...fullState.options },
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    const diff = ctx?.difficulty || 'genius';
    const rng = ctx?.rng || Math.random;

    // 1. Setup Phase: bot locks its 10-slot formation
    if (fullState.phase === 'setup') {
      if (fullState.pendingSeatIds.includes(botSeatId)) {
        const setup = buildBotSetup(diff, rng);
        return { type: 'LOCK_SETUP', payload: setup };
      }
      return null;
    }

    // Never skip human's round_result or equal_showdown reveal button
    if (fullState.phase !== 'clash_decision') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const bot = fullState.players[botSeatId];
    const oppSeatId = getOtherSeatId(fullState, botSeatId);
    const opp = fullState.players[oppSeatId];
    const clash = fullState.currentClash;
    const idx = clash.slotIdx;

    if (!clash.canCall) {
      return { type: 'FOLD' };
    }

    const myTile = bot.slots[idx].tile;
    const oppSlot = opp.slots[idx];

    // ---- EASY TIER ----
    if (diff === 'easy') {
      if (myTile >= 6 || (myTile >= 4 && clash.deficit <= 2)) {
        const plan = buildAutoBorrowPlan(bot, idx, clash.deficit, false);
        return { type: 'CALL', payload: { fromReserve: plan.fromReserve, fromSlots: plan.fromSlots } };
      }
      return { type: 'FOLD' };
    }

    // ---- GENIUS & GRAND FINAL TIERS ----
    // Infer opponent's possible hidden numerals of oppSlot.color (excluding already-revealed opponent tiles!)
    const revealedOppTiles = new Set();
    for (const s of opp.slots) {
      if (s.revealed) revealedOppTiles.add(s.tile);
    }
    const candidates = ALL_TILES.filter(
      (n) => getTileColor(n) === oppSlot.color && !revealedOppTiles.has(n)
    );

    // Weight candidate likelihood using opponent's chip allocation relative to their other unrevealed same-color slots
    const sameColorUnrevealedChips = opp.slots
      .filter((s) => !s.revealed && s.color === oppSlot.color)
      .map((s) => s.initialChips);
    const maxSameColorChips = Math.max(1, ...sameColorUnrevealedChips);
    const relStrength = oppSlot.initialChips / maxSameColorChips; // 0..1

    let pWin = 0;
    let pTie = 0;
    let sumW = 0;
    for (const cand of candidates) {
      // Higher chip stack correlates with higher tile, BUT allow ~25% bluff probability!
      const normVal = cand / 9;
      const valueMatch = 1 - Math.abs(normVal - relStrength);
      const bluffPrior = cand <= 2 && oppSlot.initialChips >= 4 ? (diff === 'grand_final' ? 0.42 : 0.25) : 0;
      const w = 0.25 + valueMatch * 0.75 + bluffPrior;
      sumW += w;
      if (myTile > cand) pWin += w;
      else if (myTile === cand) pTie += w;
    }
    if (sumW > 0) {
      pWin /= sumW;
      pTie /= sumW;
    }

    // Pot odds math!
    // Folding yields 0 net from this slot (lose lowerChips already sunk).
    // Calling costs `deficit` extra chips to contest a pot of `2 * higherChips` (win -> +2*higherChips, tie -> +higherChips, lose -> 0).
    // Expected net gain of Calling vs Folding = (pWin * 2 * higherChips + pTie * higherChips) - deficit
    const evCall = pWin * 2 * clash.higherChips + pTie * clash.higherChips - clash.deficit;

    // Opportunity cost of borrowing from future slots (Grand Final protects future high-tile traps)
    const borrowPlan = buildAutoBorrowPlan(bot, idx, clash.deficit, true);
    const borrowedFromFuture = clash.deficit - borrowPlan.fromReserve;
    const futureDrainPenalty = diff === 'grand_final' ? borrowedFromFuture * 0.18 : borrowedFromFuture * 0.1;

    // Late-game desperation check: if trailing badly near Slot 8-10, call wider
    const isLateDesperate = idx >= 7 && bot.reserve < opp.reserve - 4;
    const threshold = isLateDesperate ? -1.5 : futureDrainPenalty;

    if (evCall > threshold && borrowPlan.ok) {
      return {
        type: 'CALL',
        payload: { fromReserve: borrowPlan.fromReserve, fromSlots: borrowPlan.fromSlots },
      };
    }

    return { type: 'FOLD' };
  },

  getResult(state) {
    if (!state || state.phase !== 'finished') return null;
    const [a, b] = state.seatOrder;
    const pa = state.players[a];
    const pb = state.players[b];

    let winnerSeatIds = [];
    if (pa.reserve > pb.reserve) winnerSeatIds = [a];
    else if (pb.reserve > pa.reserve) winnerSeatIds = [b];
    else if (pa.showdownWins > pb.showdownWins) winnerSeatIds = [a];
    else if (pb.showdownWins > pa.showdownWins) winnerSeatIds = [b];

    const rankings = [pa, pb]
      .sort((x, y) => (y.reserve - x.reserve) || (y.showdownWins - x.showdownWins))
      .map((p) => ({
        seatId: p.seatId,
        score: p.reserve,
        label: `${p.reserve} chips (${p.showdownWins} SD wins)`,
      }));

    const summary =
      winnerSeatIds.length === 0
        ? {
            zh: `10 轮终极博弈完全打平（${pa.reserve} : ${pb.reserve} 筹码，摊牌胜场相同）！`,
            en: `Exact dead-heat draw (${pa.reserve} : ${pb.reserve} chips, equal showdowns)!`,
          }
        : {
            zh: `${state.players[winnerSeatIds[0]].name} 以 ${Math.max(pa.reserve, pb.reserve)} : ${Math.min(pa.reserve, pb.reserve)} 枚筹码赢得《下注黑与白》死亡对决！`,
            en: `${state.players[winnerSeatIds[0]].name} conquered Betting! Black and White with ${Math.max(pa.reserve, pb.reserve)} : ${Math.min(pa.reserve, pb.reserve)} chips!`,
          };

    return { winnerSeatIds, rankings, summary };
  },
};
