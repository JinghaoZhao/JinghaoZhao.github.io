/**
 * The Devil's Plan Season 3: Dead Again — Day 1 Prison Match 1
 * 沉重13 (Heavy 13 / 무거운 13) — Pure Deterministic Rules Engine
 *
 * Authentic Rules (Ep 2–3):
 *  - 3–8 players, 14 Rounds (2 cycles of 7 rounds).
 *  - 3 Shared Stone Pedestals: Red (Crimson Ruby), Green (Emerald Jade), Blue (Cobalt Sapphire).
 *  - Each cycle (R1–7 & R8–14), every player starts with:
 *      • 7 Rock Cards: 0, 1, 2, 3, 4, 5, 6
 *      • 7 Color Chips: Red ×2, Green ×2, Blue ×2, Rainbow ×1
 *      • 1 Strategic Pass (optional toggle, default ON — 1 per 7-round cycle)
 *  - Simultaneous hidden submission of 1 Rock Card + 1 Color Chip -> Simultaneous Reveal!
 *  - Placement Order:
 *      1. Rainbow Chips FIRST (highest Rock descending, tie-break clockwise from First Player).
 *         Rainbow player freely picks ANY of Red / Green / Blue pedestal!
 *      2. Regular Color Chips NEXT (highest Rock descending, tie-break clockwise from First Player).
 *      3. Strategic Pass: Delay your placement to the very end of the current round's queue.
 *  - Bust Threshold = 13:
 *      • Adding a rock that pushes a pedestal's cumulative weight to >= 13 triggers BUST!
 *      • Triggering player receives Penalty = total number of rock cards stacked on that pedestal
 *        (INCLUDING the triggering rock AND any 0-weight poison rocks!).
 *      • Busted pedestal immediately shatters & resets to weight 0 (0 rocks).
 *  - Next Round's First Player = the LAST player who busted this round (unchanged if no bust).
 *  - After Round 14, LOWEST total penalty wins! (Tie-breakers: fewer busts -> smaller max single bust).
 */

export const COLORS = ['red', 'green', 'blue'];
export const CHIP_TYPES = ['red', 'green', 'blue', 'rainbow'];
export const ROCK_VALUES = [0, 1, 2, 3, 4, 5, 6];
export const BUST_LIMIT = 13;
export const TOTAL_ROUNDS = 14;
export const CYCLE_LENGTH = 7;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeCycleHand(allowPass) {
  return {
    rocksLeft: [...ROCK_VALUES],
    chipsLeft: { red: 2, green: 2, blue: 2, rainbow: 1 },
    usedRocks: [],
    usedChips: [],
    passLeft: allowPass ? 1 : 0,
  };
}

function clockwiseDistance(seatIdx, firstPlayerIndex, total) {
  return (seatIdx - firstPlayerIndex + total) % total;
}

function sortQueueEntries(entries, firstPlayerIndex, total) {
  return [...entries].sort((a, b) => {
    const aRain = a.chip === 'rainbow' ? 0 : 1;
    const bRain = b.chip === 'rainbow' ? 0 : 1;
    if (aRain !== bRain) return aRain - bRain;
    if (b.rock !== a.rock) return b.rock - a.rock;
    return clockwiseDistance(a.seatIdx, firstPlayerIndex, total) -
      clockwiseDistance(b.seatIdx, firstPlayerIndex, total);
  });
}

function placeRockOnStand(state, entry, standColor, events) {
  const stand = state.stands[standColor];
  const player = state.players[entry.seatId];

  const rockObj = {
    value: entry.rock,
    seatId: entry.seatId,
    seatName: player.name,
    round: state.round,
    isRainbow: entry.chip === 'rainbow',
    wasPassed: Boolean(entry.hasPassed),
  };

  stand.rocks.push(rockObj);
  stand.weight += entry.rock;

  if (stand.weight >= BUST_LIMIT) {
    const penalty = stand.rocks.length;
    const bustedWeight = stand.weight;
    const shatteredRocks = clone(stand.rocks);

    player.penalty += penalty;
    player.bustCount += 1;
    player.maxSingleBust = Math.max(player.maxSingleBust, penalty);
    state.lastBustSeatIndex = entry.seatIdx;

    const bustInfo = {
      round: state.round,
      color: standColor,
      weight: bustedWeight,
      penalty,
      victimSeatId: entry.seatId,
      victimName: player.name,
      triggerRock: entry.rock,
      isRainbow: entry.chip === 'rainbow',
      rocks: shatteredRocks,
    };

    state.roundBusts.push(bustInfo);
    state.lastBust = bustInfo;
    state.roundLog.push({
      type: 'BUST',
      seatId: entry.seatId,
      seatName: player.name,
      rock: entry.rock,
      chip: entry.chip,
      color: standColor,
      weightAfter: bustedWeight,
      penalty,
      rockCount: penalty,
    });

    // Shatter & reset pedestal to 0
    stand.weight = 0;
    stand.rocks = [];

    events.push({
      type: 'STAND_BUST',
      round: state.round,
      color: standColor,
      seatId: entry.seatId,
      seatName: player.name,
      rock: entry.rock,
      weight: bustedWeight,
      penalty,
    });
  } else {
    state.roundLog.push({
      type: 'PLACE',
      seatId: entry.seatId,
      seatName: player.name,
      rock: entry.rock,
      chip: entry.chip,
      color: standColor,
      weightAfter: stand.weight,
      rockCount: stand.rocks.length,
    });

    events.push({
      type: 'ROCK_PLACED',
      round: state.round,
      color: standColor,
      seatId: entry.seatId,
      rock: entry.rock,
      weightAfter: stand.weight,
      rockCount: stand.rocks.length,
    });
  }
}

function advanceQueue(state, events) {
  while (state.queue.length > 0) {
    const entry = state.queue[0];
    const player = state.players[entry.seatId];
    const canPass =
      Boolean(state.options.allowPass) &&
      player.passLeft > 0 &&
      !entry.hasPassed &&
      state.queue.length > 1;

    // 1. Rainbow chip ALWAYS requires choosing which pedestal (or optional Pass)
    if (entry.chip === 'rainbow') {
      state.phase = 'PLACE_DECISION';
      state.currentTurnSeatId = entry.seatId;
      state.pendingSeatIds = [entry.seatId];
      state.decision = {
        type: 'RAINBOW',
        seatId: entry.seatId,
        rock: entry.rock,
        chip: 'rainbow',
        canPass,
      };
      return;
    }

    // 2. Regular color chip with Strategic Pass available:
    //    - Human players ALWAYS get full tactical choice to Place Now or Pass!
    //    - Bots only pause to evaluate Pass when placing now would BUST (keeps rounds brisk!).
    const stand = state.stands[entry.chip];
    const wouldBust = stand.weight + entry.rock >= BUST_LIMIT;

    if (canPass && (!player.isBot || wouldBust)) {
      state.phase = 'PLACE_DECISION';
      state.currentTurnSeatId = entry.seatId;
      state.pendingSeatIds = [entry.seatId];
      state.decision = {
        type: 'PASS_OR_PLACE',
        seatId: entry.seatId,
        rock: entry.rock,
        chip: entry.chip,
        targetColor: entry.chip,
        wouldBust,
        projectedWeight: stand.weight + entry.rock,
        projectedPenalty: stand.rocks.length + 1,
        canPass: true,
      };
      return;
    }

    // 3. Otherwise place immediately
    state.queue.shift();
    placeRockOnStand(state, entry, entry.chip, events);
  }

  // Queue finished! Finalize round
  if (state.lastBustSeatIndex !== null) {
    state.firstPlayerIndex = state.lastBustSeatIndex;
  }

  state.history.push({
    round: state.round,
    cycle: state.cycle,
    busts: clone(state.roundBusts),
    log: clone(state.roundLog),
    firstPlayerAfter: state.seatOrder[state.firstPlayerIndex],
  });

  state.decision = null;
  state.currentTurnSeatId = null;
  state.pendingSeatIds = [];

  if (state.round >= TOTAL_ROUNDS) {
    state.phase = 'FINISHED';
    events.push({ type: 'MATCH_FINISHED', round: state.round });
  } else {
    state.phase = 'ROUND_END';
    events.push({
      type: 'ROUND_COMPLETE',
      round: state.round,
      bustCount: state.roundBusts.length,
    });
  }
}

function startNextRound(state, events) {
  state.round += 1;
  const newCycle = state.round > CYCLE_LENGTH ? 2 : 1;
  const refreshedHands = newCycle !== state.cycle;
  state.cycle = newCycle;

  if (refreshedHands) {
    for (const sid of state.seatOrder) {
      const p = state.players[sid];
      const fresh = makeCycleHand(state.options.allowPass);
      p.rocksLeft = fresh.rocksLeft;
      p.chipsLeft = fresh.chipsLeft;
      p.usedRocks = fresh.usedRocks;
      p.usedChips = fresh.usedChips;
      p.passLeft = fresh.passLeft;
    }
    events.push({ type: 'CYCLE_REFRESH', cycle: 2, round: state.round });
  }

  state.phase = 'SUBMIT';
  state.submissions = {};
  state.revealedSubmissions = null;
  state.queue = [];
  state.roundLog = [];
  state.roundBusts = [];
  state.lastBust = null;
  state.lastBustSeatIndex = null;
  state.decision = null;
  state.currentTurnSeatId = null;
  state.pendingSeatIds = [...state.seatOrder];

  events.push({ type: 'ROUND_START', round: state.round, cycle: state.cycle });
}

function revealAndStartQueue(state, events) {
  const entries = [];
  const revealed = {};

  state.seatOrder.forEach((sid, seatIdx) => {
    const sub = state.submissions[sid];
    const p = state.players[sid];

    // Remove card & chip from player hand
    const rIdx = p.rocksLeft.indexOf(sub.rock);
    if (rIdx >= 0) p.rocksLeft.splice(rIdx, 1);
    p.chipsLeft[sub.chip] = Math.max(0, (p.chipsLeft[sub.chip] || 0) - 1);
    p.usedRocks.push(sub.rock);
    p.usedChips.push(sub.chip);

    revealed[sid] = { rock: sub.rock, chip: sub.chip };
    entries.push({
      seatId: sid,
      seatIdx,
      rock: sub.rock,
      chip: sub.chip,
      hasPassed: false,
    });
  });

  state.revealedSubmissions = revealed;
  state.queue = sortQueueEntries(entries, state.firstPlayerIndex, state.seatOrder.length);
  state.roundLog = [];
  state.roundBusts = [];
  state.lastBust = null;
  state.lastBustSeatIndex = null;

  events.push({ type: 'CARDS_REVEALED', round: state.round });
  advanceQueue(state, events);
}

/**
 * Cunning AI strategy for choosing (rock, chip) during SUBMIT phase.
 */
function computeAISubmission(state, seatId, rng) {
  const p = state.players[seatId];
  const rocks = [...p.rocksLeft];
  const availChips = CHIP_TYPES.filter((c) => (p.chipsLeft[c] || 0) > 0);
  if (!rocks.length || !availChips.length) return null;

  const roundInCycle = ((state.round - 1) % CYCLE_LENGTH) + 1;
  const seatIdx = state.seatOrder.indexOf(seatId);
  const clockPos = clockwiseDistance(seatIdx, state.firstPlayerIndex, state.seatOrder.length);
  const nPlayers = state.seatOrder.length;

  let bestPair = null;
  let bestScore = -Infinity;

  for (const rock of rocks) {
    for (const chip of availChips) {
      let score = 0;

      if (chip === 'rainbow') {
        // Rainbow goes FIRST and picks ANY stand — super strong in mid/late cycle when stands are heavy!
        const safeCount = COLORS.filter((c) => state.stands[c].weight + rock < BUST_LIMIT).length;
        const maxDanger = Math.max(...COLORS.map((c) => state.stands[c].weight));
        if (safeCount === 0) {
          score -= 14;
        } else {
          // Prefer saving rainbow for when danger >= 7 or round >= 4
          if (roundInCycle <= 2 && maxDanger < 7) score -= 5.5;
          else score += 3.2 + (maxDanger >= 9 ? 3.5 : 0);
          // Pairing Rainbow with 5 or 6 dumps a heavy card safely FIRST!
          if (rock >= 5 && safeCount >= 1) score += 3.4;
          // Pairing Rainbow with 0 lets us poison the heaviest 11–12 pedestal first!
          if (rock === 0 && maxDanger >= 10) score += 4.2;
        }
      } else {
        const stand = state.stands[chip];
        const w = stand.weight;
        const count = stand.rocks.length;
        const projected = w + rock;

        if (rock === 0) {
          // 0-rock never busts! Brilliant poison trap on heavy pedestals (9–12)
          if (w >= 10) score += 7.5 + count * 0.8;
          else if (w >= 7) score += 3.5;
          else score -= 3.5; // Don't waste 0 on empty stand early!
        } else if (projected >= BUST_LIMIT) {
          // Direct bust right now — terrible unless pedestal has only 0-1 rocks or we're forced
          score -= 14 + count * 3.5;
          // If we go LATER (small rock), someone else might bust it before us!
          if (rock <= 2 && w >= 11) score += 5.5;
        } else {
          // Safe against current weight — estimate risk of others pushing it before we place!
          // Higher rocks place EARLIER (safer from being bumped), lower rocks place LATER!
          const priorityBonus = (rock / 6) * 3.2 - (clockPos / Math.max(1, nPlayers)) * 0.8;
          const headroom = BUST_LIMIT - 1 - projected; // 0..11

          // Ideal: dump heavy rocks (5, 6) onto empty/low pedestals early!
          if (rock >= 5 && w <= 6) {
            score += 6.2 + priorityBonus;
          } else if (rock >= 3 && projected <= 11) {
            score += 3.6 + priorityBonus - (headroom <= 1 ? 1.0 : 0);
          } else {
            // Medium/low rock: risky if stand is already 8–10 and others also play this color
            score += 2.0 + priorityBonus - (w >= 8 && rock <= 3 ? 2.8 : 0);
          }

          // Bonus for leaving stand right at 11 or 12 (setting a deadly trap for players behind us!)
          if (projected === 11 || projected === 12) {
            score += rock >= 4 ? 3.0 : 1.0;
          }

          // Penalty for hoarding heavy rocks into final rounds of a cycle
          if (roundInCycle >= 5 && rock >= 5) {
            score += 2.2;
          }
        }
      }

      // Small controlled noise for natural human-like unpredictability
      score += (rng() - 0.5) * 2.2;

      if (score > bestScore) {
        bestScore = score;
        bestPair = { rock, chip };
      }
    }
  }

  return bestPair || { rock: rocks[0], chip: availChips[0] };
}

function computeAIRainbowChoice(state, seatId, rng) {
  const dec = state.decision;
  const rock = dec.rock;

  // Evaluate each pedestal
  const options = COLORS.map((color) => {
    const stand = state.stands[color];
    const proj = stand.weight + rock;
    const busts = proj >= BUST_LIMIT;
    let score = 0;

    if (busts) {
      // Minimize penalty if forced to bust
      score = -100 - stand.rocks.length * 10;
    } else if (rock === 0) {
      // Poison the heaviest pedestal (sets up biggest penalty bomb!)
      score = 20 + stand.weight * 3 + stand.rocks.length * 2;
    } else {
      // Safe placement: love pushing a pedestal to 11 or 12 if others behind us have that color!
      const behindSameColor = state.queue.slice(1).filter((e) => e.chip === color).length;
      if (proj === 12) score = 26 + behindSameColor * 6;
      else if (proj === 11) score = 22 + behindSameColor * 4;
      else if (proj === 10) score = 16 + behindSameColor * 2;
      else score = 10 + proj * 0.6;
    }
    score += rng() * 0.8;
    return { color, busts, score };
  }).sort((a, b) => b.score - a.score);

  // If ALL 3 pedestals bust and we can Pass, Pass!
  if (options[0].busts && dec.canPass) {
    return { type: 'USE_PASS' };
  }
  return { type: 'CHOOSE_STAND', payload: { color: options[0].color } };
}

function computeAIPassDecision(state, seatId) {
  const dec = state.decision;
  const stand = state.stands[dec.targetColor];
  const wouldBust = stand.weight + dec.rock >= BUST_LIMIT;
  if (!wouldBust) {
    return { type: 'CONFIRM_PLACE' };
  }
  // If passing could let someone behind us bust this pedestal first, PASS!
  const behind = state.queue.slice(1);
  const behindSame = behind.some((e) => e.chip === dec.targetColor && e.rock > 0);
  const penaltyNow = stand.rocks.length + 1;
  if (dec.canPass && (behindSame || penaltyNow >= 3)) {
    return { type: 'USE_PASS' };
  }
  return { type: 'CONFIRM_PLACE' };
}

function sortRankings(state) {
  return state.seatOrder
    .map((sid) => state.players[sid])
    .sort((a, b) => {
      if (a.penalty !== b.penalty) return a.penalty - b.penalty;
      if (a.bustCount !== b.bustCount) return a.bustCount - b.bustCount;
      if (a.maxSingleBust !== b.maxSingleBust) return a.maxSingleBust - b.maxSingleBust;
      return state.seatOrder.indexOf(a.seatId) - state.seatOrder.indexOf(b.seatId);
    });
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const options = {
      allowPass: ctx.options?.allowPass !== false,
      fastTimers: Boolean(ctx.options?.fastTimers),
    };

    const seatOrder = seats.map((s) => s.seatId);
    const firstPlayerIndex = Math.floor(rng() * seatOrder.length);
    const players = {};

    for (const s of seats) {
      const hand = makeCycleHand(options.allowPass);
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
        penalty: 0,
        bustCount: 0,
        maxSingleBust: 0,
        ...hand,
      };
    }

    return {
      options,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      cycle: 1,
      phase: 'SUBMIT', // 'SUBMIT' | 'PLACE_DECISION' | 'ROUND_END' | 'FINISHED'
      seatOrder,
      firstPlayerIndex,
      stands: {
        red: { color: 'red', weight: 0, rocks: [] },
        green: { color: 'green', weight: 0, rocks: [] },
        blue: { color: 'blue', weight: 0, rocks: [] },
      },
      players,
      submissions: {},
      revealedSubmissions: null,
      queue: [],
      decision: null,
      roundLog: [],
      roundBusts: [],
      lastBust: null,
      lastBustSeatIndex: null,
      history: [],
      pendingSeatIds: [...seatOrder],
      currentTurnSeatId: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) return { ok: false, reason: 'Invalid action' };
    const player = fullState.players[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'SUBMIT_PLAY') {
      if (fullState.phase !== 'SUBMIT') return { ok: false, reason: 'Not in submission phase' };
      if (fullState.submissions[seatId]) return { ok: false, reason: 'Already submitted this round' };
      const rock = Number(action.payload?.rock);
      const chip = action.payload?.chip;
      if (!player.rocksLeft.includes(rock)) return { ok: false, reason: 'Rock card not available in hand' };
      if (!CHIP_TYPES.includes(chip) || (player.chipsLeft[chip] || 0) <= 0) {
        return { ok: false, reason: 'Color chip not available in hand' };
      }
      return { ok: true };
    }

    if (action.type === 'CHOOSE_STAND') {
      if (fullState.phase !== 'PLACE_DECISION' || fullState.decision?.type !== 'RAINBOW') {
        return { ok: false, reason: 'No Rainbow pedestal choice active' };
      }
      if (fullState.decision.seatId !== seatId) return { ok: false, reason: 'Not your decision turn' };
      const color = action.payload?.color;
      if (!COLORS.includes(color)) return { ok: false, reason: 'Invalid pedestal color' };
      return { ok: true };
    }

    if (action.type === 'CONFIRM_PLACE') {
      if (fullState.phase !== 'PLACE_DECISION' || fullState.decision?.type !== 'PASS_OR_PLACE') {
        return { ok: false, reason: 'No placement confirmation active' };
      }
      if (fullState.decision.seatId !== seatId) return { ok: false, reason: 'Not your decision turn' };
      return { ok: true };
    }

    if (action.type === 'USE_PASS') {
      if (fullState.phase !== 'PLACE_DECISION') return { ok: false, reason: 'Not in placement phase' };
      if (fullState.decision?.seatId !== seatId) return { ok: false, reason: 'Not your decision turn' };
      if (!fullState.decision?.canPass) return { ok: false, reason: 'Strategic Pass is not available now' };
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'ROUND_END') return { ok: false, reason: 'Not at round end' };
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const events = [];

    if (action.type === 'SUBMIT_PLAY') {
      const rock = Number(action.payload.rock);
      const chip = action.payload.chip;
      state.submissions[seatId] = { rock, chip };
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'PLAY_LOCKED', seatId, round: state.round });

      if (state.pendingSeatIds.length === 0) {
        revealAndStartQueue(state, events);
      }
      return { state, events };
    }

    if (action.type === 'CHOOSE_STAND') {
      const entry = state.queue.shift();
      const color = action.payload.color;
      state.decision = null;
      placeRockOnStand(state, entry, color, events);
      advanceQueue(state, events);
      return { state, events };
    }

    if (action.type === 'CONFIRM_PLACE') {
      const entry = state.queue.shift();
      state.decision = null;
      placeRockOnStand(state, entry, entry.chip, events);
      advanceQueue(state, events);
      return { state, events };
    }

    if (action.type === 'USE_PASS') {
      const entry = state.queue.shift();
      const p = state.players[seatId];
      p.passLeft = Math.max(0, p.passLeft - 1);
      entry.hasPassed = true;
      state.queue.push(entry);
      state.decision = null;

      state.roundLog.push({
        type: 'PASS',
        seatId,
        seatName: p.name,
        rock: entry.rock,
        chip: entry.chip,
      });
      events.push({ type: 'PLAYER_PASSED', seatId, seatName: p.name, rock: entry.rock, chip: entry.chip });

      advanceQueue(state, events);
      return { state, events };
    }

    if (action.type === 'NEXT_ROUND') {
      startNextRound(state, events);
      return { state, events };
    }

    return { state, events };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const rng = ctx.rng;
    const events = [];

    if (state.phase === 'SUBMIT') {
      for (const sid of [...state.pendingSeatIds]) {
        const pick = computeAISubmission(state, sid, rng);
        if (pick) state.submissions[sid] = pick;
      }
      state.pendingSeatIds = [];
      revealAndStartQueue(state, events);
      return { state, events };
    }

    if (state.phase === 'PLACE_DECISION' && state.decision) {
      const dec = state.decision;
      if (dec.type === 'RAINBOW') {
        const aiAct = computeAIRainbowChoice(state, dec.seatId, rng);
        if (aiAct.type === 'USE_PASS') {
          const entry = state.queue.shift();
          state.players[dec.seatId].passLeft = Math.max(0, state.players[dec.seatId].passLeft - 1);
          entry.hasPassed = true;
          state.queue.push(entry);
          state.decision = null;
          advanceQueue(state, events);
        } else {
          const entry = state.queue.shift();
          state.decision = null;
          placeRockOnStand(state, entry, aiAct.payload.color, events);
          advanceQueue(state, events);
        }
      } else {
        const entry = state.queue.shift();
        state.decision = null;
        placeRockOnStand(state, entry, entry.chip, events);
        advanceQueue(state, events);
      }
      return { state, events };
    }

    if (state.phase === 'ROUND_END') {
      startNextRound(state, events);
      return { state, events };
    }

    return null;
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'FINISHED') return null;
    const fast = Boolean(fullState.options?.fastTimers);

    if (fullState.phase === 'SUBMIT') {
      return { phaseKey: `r${fullState.round}-submit`, durationMs: fast ? 25000 : 45000 };
    }
    if (fullState.phase === 'PLACE_DECISION' && fullState.decision) {
      return {
        phaseKey: `r${fullState.round}-dec-${fullState.decision.seatId}-${fullState.queue.length}`,
        durationMs: fast ? 15000 : 25000,
      };
    }
    if (fullState.phase === 'ROUND_END') {
      return { phaseKey: `r${fullState.round}-end`, durationMs: fast ? 7000 : 11000 };
    }
    return null;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || !fullState.players[botSeatId]) return null;

    if (fullState.phase === 'SUBMIT' && fullState.pendingSeatIds.includes(botSeatId)) {
      const pick = computeAISubmission(fullState, botSeatId, ctx.rng);
      if (pick) return { type: 'SUBMIT_PLAY', payload: pick };
    }

    if (fullState.phase === 'PLACE_DECISION' && fullState.decision?.seatId === botSeatId) {
      if (fullState.decision.type === 'RAINBOW') {
        return computeAIRainbowChoice(fullState, botSeatId, ctx.rng);
      }
      if (fullState.decision.type === 'PASS_OR_PLACE') {
        return computeAIPassDecision(fullState, botSeatId);
      }
    }
    return null;
  },

  /**
   * STRICT SECRET PROJECTION:
   * - During SUBMIT: strips every other player's chosen (rock, chip) AND unplayed private hand!
   * - Publicly exposes: pedestals, penalty scores, bust counts, previously revealed usedRocks/usedChips,
   *   and who has locked in their submission (`submittedSeatIds`).
   */
  projectState(fullState, viewerSeatId) {
    const projectedPlayers = {};
    for (const sid of fullState.seatOrder) {
      const p = fullState.players[sid];
      const isViewer = sid === viewerSeatId;
      projectedPlayers[sid] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        penalty: p.penalty,
        bustCount: p.bustCount,
        maxSingleBust: p.maxSingleBust,
        passLeft: p.passLeft,
        cardsRemainingCount: p.rocksLeft.length,
        usedRocks: [...p.usedRocks],
        usedChips: [...p.usedChips],
        // Private hand strictly only for viewerSeatId!
        rocksLeft: isViewer ? [...p.rocksLeft] : null,
        chipsLeft: isViewer ? { ...p.chipsLeft } : null,
      };
    }

    return {
      options: { ...fullState.options },
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      cycle: fullState.cycle,
      phase: fullState.phase,
      seatOrder: [...fullState.seatOrder],
      firstPlayerIndex: fullState.firstPlayerIndex,
      firstPlayerSeatId: fullState.seatOrder[fullState.firstPlayerIndex],
      stands: clone(fullState.stands),
      players: projectedPlayers,
      submittedSeatIds: Object.keys(fullState.submissions || {}),
      mySubmission: viewerSeatId && fullState.submissions?.[viewerSeatId]
        ? clone(fullState.submissions[viewerSeatId])
        : null,
      revealedSubmissions: fullState.phase === 'SUBMIT' ? null : clone(fullState.revealedSubmissions),
      queue: fullState.phase === 'SUBMIT' ? [] : clone(fullState.queue),
      decision: fullState.decision ? clone(fullState.decision) : null,
      roundLog: clone(fullState.roundLog),
      roundBusts: clone(fullState.roundBusts),
      lastBust: fullState.lastBust ? clone(fullState.lastBust) : null,
      history: clone(fullState.history.slice(-4)),
      pendingSeatIds: [...fullState.pendingSeatIds],
      currentTurnSeatId: fullState.currentTurnSeatId,
    };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'FINISHED') return null;
    const sorted = sortRankings(fullState);
    if (!sorted.length) return null;

    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const winners = sorted
      .filter(
        (p) =>
          p.penalty === top.penalty &&
          p.bustCount === top.bustCount &&
          p.maxSingleBust === top.maxSingleBust
      )
      .map((p) => p.seatId);

    return {
      winnerSeatIds: winners,
      rankings: sorted.map((p, idx) => ({
        seatId: p.seatId,
        score: -p.penalty,
        label:
          idx === sorted.length - 1
            ? `💀 ${p.penalty} PEN · ${p.bustCount} Bust`
            : `${p.penalty} PEN · ${p.bustCount} Bust`,
      })),
      summary: {
        zh: `14 轮地狱天平试炼结束！${top.name} 仅吃 ${top.penalty} 分罚分排名第一存活；${bottom.name} 累计 ${bottom.penalty} 分垫底面临淘汰！`,
        en: `All 14 rounds of Heavy 13 concluded! ${top.name} survives at #1 with only ${top.penalty} penalty; ${bottom.name} finishes last with ${bottom.penalty} penalty!`,
      },
    };
  },
};
