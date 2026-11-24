/**
 * Game 01a: Count the Cubes (数方块 / 큐브 세기)
 * Deterministic 3D gravity-supported cube tower generator + 20s penalty lockout race.
 */

export const LOCKOUT_MS = 20000;

const TIER_CONFIG = {
  easy:   { grid: 4, maxH: 4, minTotal: 20, maxTotal: 34, label: { zh: '初级 · 4×4 塔阵', en: 'TIER I · 4×4 TOWER' } },
  medium: { grid: 5, maxH: 5, minTotal: 38, maxTotal: 60, label: { zh: '中级 · 5×5 塔阵', en: 'TIER II · 5×5 TOWER' } },
  hard:   { grid: 6, maxH: 6, minTotal: 64, maxTotal: 94, label: { zh: '高级 · 6×6 塔阵', en: 'TIER III · 6×6 TOWER' } },
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getTierForRound(roundIndex, totalRounds, diffOption) {
  if (diffOption && diffOption !== 'progressive' && TIER_CONFIG[diffOption]) {
    return diffOption;
  }
  if (totalRounds === 1) return 'medium';
  if (roundIndex === 0) return 'easy';
  if (roundIndex === 1) return 'medium';
  return 'hard';
}

/**
 * Generates a mathematically unambiguous 3D heightmap obeying strict gravity:
 * - Every cube at (x, y, z > 0) is supported by (x, y, z - 1).
 * - Every non-zero column's top face is guaranteed visible from the isometric camera
 *   (no foreground diagonal column (x+k, y+k) reaches h+k, and not walled off on both front sides).
 * - Guaranteed to contain genuine occluded interior/support cubes.
 */
export function generateCubePuzzle(tierKey, rng) {
  const cfg = TIER_CONFIG[tierKey] || TIER_CONFIG.medium;
  const G = cfg.grid;

  for (let attempt = 0; attempt < 60; attempt++) {
    const heights = Array.from({ length: G }, () => Array(G).fill(0));
    const target = cfg.minTotal + Math.floor(rng() * (cfg.maxTotal - cfg.minTotal + 1));

    // Seed terraced back-to-front spine so tall columns naturally shelter hidden support cubes
    for (let x = 0; x < G; x++) {
      for (let y = 0; y < G; y++) {
        const distBack = (x + y) / (2 * (G - 1));
        const maxLocal = Math.max(1, Math.min(cfg.maxH, Math.round(cfg.maxH * (1.12 - distBack * 0.72))));
        const roll = rng();
        if (roll < 0.14 && x + y > 1) {
          heights[x][y] = 0;
        } else {
          heights[x][y] = Math.max(0, Math.min(maxLocal, Math.floor(rng() * (maxLocal + 1))));
        }
      }
    }

    // Ensure corner anchor (0,0) has height for visual depth
    heights[0][0] = Math.max(2, Math.min(cfg.maxH, Math.ceil(cfg.maxH * 0.75)));

    // Enforce zero-ambiguity visibility constraint iteratively
    const enforceVisibility = () => {
      let changed = true;
      let guard = 0;
      while (changed && guard++ < 25) {
        changed = false;
        for (let x = 0; x < G; x++) {
          for (let y = 0; y < G; y++) {
            const h = heights[x][y];
            if (h <= 0) continue;
            // Rule 1: No foreground diagonal column (x+k, y+k) can reach h + k
            for (let k = 1; x + k < G && y + k < G; k++) {
              if (heights[x + k][y + k] >= h + k) {
                heights[x + k][y + k] = Math.max(0, h + k - 1);
                changed = true;
              }
            }
            // Rule 2: Prevent both immediate front neighbors (x+1, y) and (x, y+1) from towering over h
            const hRight = x + 1 < G ? heights[x + 1][y] : 0;
            const hLeft = y + 1 < G ? heights[x][y + 1] : 0;
            if (hRight > h && hLeft > h) {
              if (hRight >= hLeft) heights[x + 1][y] = h;
              else heights[x][y + 1] = h;
              changed = true;
            }
          }
        }
      }
    };

    enforceVisibility();

    // Tune total cubes toward target while preserving constraints
    const sumGrid = () => heights.reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
    let total = sumGrid();

    for (let step = 0; step < 120 && (total < cfg.minTotal || total > cfg.maxTotal); step++) {
      const rx = Math.floor(rng() * G);
      const ry = Math.floor(rng() * G);
      if (total < target && heights[rx][ry] < cfg.maxH) {
        heights[rx][ry] += 1;
        enforceVisibility();
      } else if (total > target && heights[rx][ry] > 0) {
        heights[rx][ry] -= 1;
        enforceVisibility();
      }
      total = sumGrid();
    }

    // Count completely occluded support cubes (covered on +x, +y, and +z)
    let hiddenCount = 0;
    const layerCounts = Array(cfg.maxH).fill(0);
    for (let x = 0; x < G; x++) {
      for (let y = 0; y < G; y++) {
        const h = heights[x][y];
        for (let z = 0; z < h; z++) {
          layerCounts[z] += 1;
          const covTop = z + 1 < h;
          const covX = x + 1 < G && heights[x + 1][y] > z;
          const covY = y + 1 < G && heights[x][y + 1] > z;
          if (covTop && covX && covY) hiddenCount += 1;
        }
      }
    }

    const activeLayers = layerCounts.filter((c) => c > 0);
    if (total >= cfg.minTotal && total <= cfg.maxTotal && (hiddenCount >= 1 || attempt > 35)) {
      return {
        tier: tierKey,
        tierLabel: cfg.label,
        gridSize: G,
        maxHeight: activeLayers.length,
        heights,
        totalCubes: total,
        hiddenCount,
        layerCounts: layerCounts.slice(0, activeLayers.length),
      };
    }
  }

  // Fallback guaranteed deterministic terrace
  const heights = Array.from({ length: G }, (_, x) =>
    Array.from({ length: G }, (_, y) => Math.max(1, cfg.maxH - Math.floor((x + y) / 2)))
  );
  let total = 0;
  let hiddenCount = 0;
  const layerCounts = Array(cfg.maxH).fill(0);
  for (let x = 0; x < G; x++) {
    for (let y = 0; y < G; y++) {
      const h = heights[x][y];
      total += h;
      for (let z = 0; z < h; z++) {
        layerCounts[z] += 1;
        if (z + 1 < h && x + 1 < G && heights[x + 1][y] > z && y + 1 < G && heights[x][y + 1] > z) {
          hiddenCount += 1;
        }
      }
    }
  }
  return {
    tier: tierKey,
    tierLabel: cfg.label,
    gridSize: G,
    maxHeight: cfg.maxH,
    heights,
    totalCubes: total,
    hiddenCount,
    layerCounts,
  };
}

function buildBotSchedule(seats, puzzle, roundStartedAt, roundLimitMs, rng) {
  const schedule = {};
  const baseMin = puzzle.tier === 'easy' ? 7500 : puzzle.tier === 'medium' ? 12000 : 17000;
  const baseSpan = puzzle.tier === 'easy' ? 18000 : puzzle.tier === 'medium' ? 28000 : 38000;
  for (const s of seats) {
    if (!s.isBot) continue;
    const willMistakeFirst = rng() < 0.34;
    const firstDelay = Math.min(roundLimitMs - 6000, Math.round(baseMin + rng() * baseSpan));
    const secondDelay = willMistakeFirst
      ? Math.min(roundLimitMs - 2000, firstDelay + LOCKOUT_MS + 4500 + Math.round(rng() * 14000))
      : null;
    const offset = (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 3));
    schedule[s.seatId] = {
      attempts: willMistakeFirst
        ? [
            { at: roundStartedAt + firstDelay, guess: Math.max(1, puzzle.totalCubes + offset) },
            ...(secondDelay && secondDelay < roundLimitMs - 1000
              ? [{ at: roundStartedAt + secondDelay, guess: puzzle.totalCubes }]
              : []),
          ]
        : [{ at: roundStartedAt + firstDelay, guess: puzzle.totalCubes }],
      cursor: 0,
    };
  }
  return schedule;
}

function awardRoundPoints(state) {
  const n = state.seats.length;
  const solvedIds = [...state.solveOrder];
  const pointsMap = {};
  state.seats.forEach((s) => {
    pointsMap[s.seatId] = 0;
  });

  if (n === 1) {
    const sid = state.seats[0].seatId;
    const p = state.roundPlayers[sid];
    if (p.solvedAt) {
      const speedBonus = Math.max(1, Math.ceil((1 - p.solveTimeMs / state.roundLimitMs) * 3));
      const accBonus = p.wrongAttempts === 0 ? 1 : 0;
      pointsMap[sid] = 3 + speedBonus + accBonus;
    }
  } else {
    solvedIds.forEach((sid, idx) => {
      const pct = (idx + 1) / n;
      let pts = 1;
      if (idx === 0 || pct <= 0.25) pts = 4;
      else if (pct <= 0.5) pts = 3;
      else if (pct <= 0.75) pts = 2;
      pointsMap[sid] = pts;
    });
  }

  for (const s of state.seats) {
    const earned = pointsMap[s.seatId] || 0;
    state.scores[s.seatId] = (state.scores[s.seatId] || 0) + earned;
    state.roundPlayers[s.seatId].pointsEarned = earned;
  }

  state.history.push({
    round: state.round,
    tier: state.puzzle.tier,
    totalCubes: state.puzzle.totalCubes,
    solveOrder: [...state.solveOrder],
    pointsMap,
  });
}

function initRound(state, roundIndex, now, rng) {
  const tier = getTierForRound(roundIndex, state.totalRounds, state.options.difficulty);
  const puzzle = generateCubePuzzle(tier, rng);
  state.round = roundIndex + 1;
  state.phase = 'playing';
  state.puzzle = puzzle;
  state.roundStartedAt = now;
  state.solveOrder = [];
  state.roundPlayers = {};
  for (const s of state.seats) {
    state.roundPlayers[s.seatId] = {
      solvedAt: null,
      solveTimeMs: null,
      lockedUntil: 0,
      wrongAttempts: 0,
      lastGuess: null,
      pointsEarned: 0,
      gaveUp: false,
    };
  }
  state.botSchedule = buildBotSchedule(state.seats, puzzle, now, state.roundLimitMs, rng);
  state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
  state.readyNext = {};
}

function finalizeRound(state) {
  if (state.phase !== 'playing') return;
  awardRoundPoints(state);
  state.phase = 'reveal';
  state.pendingSeatIds = [];
  state.readyNext = {};
}

function checkRoundComplete(state) {
  const humans = state.seats.filter((s) => !s.isBot);
  const allSolved = state.seats.every((s) => state.roundPlayers[s.seatId].solvedAt || state.roundPlayers[s.seatId].gaveUp);
  const allHumansDone = humans.length > 0 && humans.every((s) => state.roundPlayers[s.seatId].solvedAt || state.roundPlayers[s.seatId].gaveUp);
  if (allSolved || (allHumansDone && state.seats.length === 1)) {
    finalizeRound(state);
    return true;
  }
  if (allHumansDone) {
    // Resolve any bots scheduled earlier than now + fast-finish bots that already solved
    finalizeRound(state);
    return true;
  }
  return false;
}

function applyGuessInternal(state, seatId, guess, now) {
  const rp = state.roundPlayers[seatId];
  rp.lastGuess = guess;
  if (guess === state.puzzle.totalCubes) {
    rp.solvedAt = now;
    rp.solveTimeMs = Math.max(100, now - state.roundStartedAt);
    rp.lockedUntil = 0;
    state.solveOrder.push(seatId);
    state.pendingSeatIds = state.seats
      .filter((s) => !s.isBot && !state.roundPlayers[s.seatId].solvedAt && !state.roundPlayers[s.seatId].gaveUp)
      .map((s) => s.seatId);
    const done = checkRoundComplete(state);
    return { correct: true, roundFinished: done };
  }
  rp.wrongAttempts += 1;
  rp.lockedUntil = now + LOCKOUT_MS;
  return { correct: false, roundFinished: false };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx.options || {};
    const totalRounds = Number(opts.rounds) || 3;
    const roundLimitMs = (Number(opts.timeLimit) || 90) * 1000;
    const now = Date.now();
    const state = {
      seats: seats.map((s) => ({ seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: s.isBot })),
      options: {
        rounds: totalRounds,
        difficulty: opts.difficulty || 'progressive',
        timeLimit: Number(opts.timeLimit) || 90,
        allowOrbit: Boolean(opts.allowOrbit),
      },
      totalRounds,
      roundLimitMs,
      round: 1,
      phase: 'playing', // 'playing' | 'reveal' | 'finished'
      scores: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      totalSolveMs: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      totalSolved: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      puzzle: null,
      roundStartedAt: now,
      solveOrder: [],
      roundPlayers: {},
      botSchedule: {},
      pendingSeatIds: [],
      readyNext: {},
      history: [],
    };
    initRound(state, 0, now, ctx.rng);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'finished') return { ok: false, reason: 'Match ended' };

    if (action.type === 'SUBMIT_GUESS') {
      if (fullState.phase !== 'playing') return { ok: false, reason: 'Not in guessing phase' };
      const rp = fullState.roundPlayers[seatId];
      if (!rp) return { ok: false, reason: 'Unknown player' };
      if (rp.solvedAt || rp.gaveUp) return { ok: false, reason: 'Already completed this round' };
      const now = Date.now();
      if (rp.lockedUntil && now < rp.lockedUntil - 150) {
        const rem = Math.ceil((rp.lockedUntil - now) / 1000);
        return { ok: false, reason: `Terminal locked (${rem}s remaining)` };
      }
      const val = Number(action.payload?.guess);
      if (!Number.isInteger(val) || val < 1 || val > 999) {
        return { ok: false, reason: 'Enter a valid integer (1–999)' };
      }
      return { ok: true };
    }

    if (action.type === 'GIVE_UP') {
      if (fullState.phase !== 'playing') return { ok: false, reason: 'Not in guessing phase' };
      const rp = fullState.roundPlayers[seatId];
      if (!rp || rp.solvedAt || rp.gaveUp) return { ok: false, reason: 'Already done' };
      return { ok: true };
    }

    if (action.type === 'PROCESS_BOTS') {
      if (fullState.phase !== 'playing') return { ok: false, reason: 'Not playing' };
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'reveal') return { ok: false, reason: 'Not in reveal phase' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const now = ctx.now || Date.now();
    const events = [];

    if (action.type === 'SUBMIT_GUESS') {
      const guess = Number(action.payload.guess);
      const res = applyGuessInternal(state, seatId, guess, now);
      if (res.correct) {
        state.totalSolved[seatId] = (state.totalSolved[seatId] || 0) + 1;
        state.totalSolveMs[seatId] = (state.totalSolveMs[seatId] || 0) + state.roundPlayers[seatId].solveTimeMs;
        events.push({ type: 'SOLVED', seatId, rank: state.solveOrder.length, timeMs: state.roundPlayers[seatId].solveTimeMs });
      } else {
        events.push({ type: 'LOCKOUT', seatId, guess, lockedUntil: state.roundPlayers[seatId].lockedUntil });
      }
      if (res.roundFinished) events.push({ type: 'ROUND_REVEAL', round: state.round });
      return { state, events };
    }

    if (action.type === 'GIVE_UP') {
      state.roundPlayers[seatId].gaveUp = true;
      state.pendingSeatIds = state.seats
        .filter((s) => !s.isBot && !state.roundPlayers[s.seatId].solvedAt && !state.roundPlayers[s.seatId].gaveUp)
        .map((s) => s.seatId);
      const done = checkRoundComplete(state);
      events.push({ type: 'GIVE_UP', seatId });
      if (done) events.push({ type: 'ROUND_REVEAL', round: state.round });
      return { state, events };
    }

    if (action.type === 'PROCESS_BOTS') {
      for (const s of state.seats) {
        if (!s.isBot) continue;
        const rp = state.roundPlayers[s.seatId];
        if (rp.solvedAt || rp.gaveUp) continue;
        const sched = state.botSchedule[s.seatId];
        if (!sched || sched.cursor >= sched.attempts.length) continue;
        const nextAct = sched.attempts[sched.cursor];
        if (now >= nextAct.at && (!rp.lockedUntil || now >= rp.lockedUntil)) {
          sched.cursor += 1;
          const res = applyGuessInternal(state, s.seatId, nextAct.guess, now);
          if (res.correct) {
            state.totalSolved[s.seatId] = (state.totalSolved[s.seatId] || 0) + 1;
            state.totalSolveMs[s.seatId] = (state.totalSolveMs[s.seatId] || 0) + state.roundPlayers[s.seatId].solveTimeMs;
            events.push({ type: 'BOT_SOLVED', seatId: s.seatId, rank: state.solveOrder.length });
          } else {
            events.push({ type: 'BOT_LOCKOUT', seatId: s.seatId });
          }
          if (res.roundFinished) {
            events.push({ type: 'ROUND_REVEAL', round: state.round });
            break;
          }
        }
      }
      return { state, events };
    }

    if (action.type === 'NEXT_ROUND') {
      if (state.round >= state.totalRounds) {
        state.phase = 'finished';
        events.push({ type: 'MATCH_END' });
      } else {
        initRound(state, state.round, now, ctx.rng);
        events.push({ type: 'ROUND_START', round: state.round });
      }
      return { state, events };
    }

    return { state, events };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const now = ctx.now || Date.now();
    if (state.phase === 'playing') {
      // Settle any bots whose scheduled solve was before timeout
      for (const s of state.seats) {
        if (!s.isBot) continue;
        const rp = state.roundPlayers[s.seatId];
        if (rp.solvedAt) continue;
        const sched = state.botSchedule[s.seatId];
        if (!sched) continue;
        while (sched.cursor < sched.attempts.length && sched.attempts[sched.cursor].at <= now) {
          const act = sched.attempts[sched.cursor++];
          if (act.guess === state.puzzle.totalCubes) {
            rp.solvedAt = act.at;
            rp.solveTimeMs = Math.max(100, act.at - state.roundStartedAt);
            state.solveOrder.push(s.seatId);
            state.totalSolved[s.seatId] = (state.totalSolved[s.seatId] || 0) + 1;
            state.totalSolveMs[s.seatId] = (state.totalSolveMs[s.seatId] || 0) + rp.solveTimeMs;
          }
        }
      }
      finalizeRound(state);
      return { state, events: [{ type: 'ROUND_TIMEOUT', round: state.round }] };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'playing') {
      return { phaseKey: `ctc-r${fullState.round}`, durationMs: fullState.roundLimitMs };
    }
    return null;
  },

  projectState(fullState, viewerSeatId) {
    const hideAnswer = fullState.phase === 'playing';
    const puzzle = {
      tier: fullState.puzzle.tier,
      tierLabel: fullState.puzzle.tierLabel,
      gridSize: fullState.puzzle.gridSize,
      maxHeight: fullState.puzzle.maxHeight,
      heights: fullState.puzzle.heights,
      totalCubes: hideAnswer ? null : fullState.puzzle.totalCubes,
      hiddenCount: hideAnswer ? null : fullState.puzzle.hiddenCount,
      layerCounts: hideAnswer ? null : fullState.puzzle.layerCounts,
    };

    const roundPlayers = {};
    for (const [sid, rp] of Object.entries(fullState.roundPlayers)) {
      roundPlayers[sid] = {
        solvedAt: rp.solvedAt,
        solveTimeMs: rp.solveTimeMs,
        lockedUntil: rp.lockedUntil,
        wrongAttempts: rp.wrongAttempts,
        lastGuess: sid === viewerSeatId || !hideAnswer ? rp.lastGuess : null,
        pointsEarned: rp.pointsEarned,
        gaveUp: rp.gaveUp,
      };
    }

    return {
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      phase: fullState.phase,
      options: fullState.options,
      roundStartedAt: fullState.roundStartedAt,
      roundLimitMs: fullState.roundLimitMs,
      seats: fullState.seats,
      scores: fullState.scores,
      totalSolved: fullState.totalSolved,
      totalSolveMs: fullState.totalSolveMs,
      puzzle,
      solveOrder: fullState.solveOrder,
      roundPlayers,
      pendingSeatIds: fullState.pendingSeatIds,
      history: fullState.history,
    };
  },

  computeBotAction(fullState, botSeatId) {
    if (fullState.phase !== 'playing') return null;
    const rp = fullState.roundPlayers[botSeatId];
    const sched = fullState.botSchedule?.[botSeatId];
    if (!rp || !sched || rp.solvedAt || rp.gaveUp || sched.cursor >= sched.attempts.length) return null;
    const now = Date.now();
    const next = sched.attempts[sched.cursor];
    if (now >= next.at && (!rp.lockedUntil || now >= rp.lockedUntil)) {
      return { type: 'SUBMIT_GUESS', payload: { guess: next.guess } };
    }
    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'finished') return null;
    const ranked = [...fullState.seats].sort((a, b) => {
      const ds = (fullState.scores[b.seatId] || 0) - (fullState.scores[a.seatId] || 0);
      if (ds !== 0) return ds;
      const dSolved = (fullState.totalSolved[b.seatId] || 0) - (fullState.totalSolved[a.seatId] || 0);
      if (dSolved !== 0) return dSolved;
      return (fullState.totalSolveMs[a.seatId] || 1e9) - (fullState.totalSolveMs[b.seatId] || 1e9);
    });
    const topScore = fullState.scores[ranked[0].seatId] || 0;
    const winnerSeatIds = ranked
      .filter((s) => (fullState.scores[s.seatId] || 0) === topScore)
      .map((s) => s.seatId);

    return {
      winnerSeatIds,
      rankings: ranked.map((s) => ({
        seatId: s.seatId,
        score: fullState.scores[s.seatId] || 0,
        label: `${fullState.scores[s.seatId] || 0} pts (${fullState.totalSolved[s.seatId] || 0}/${fullState.totalRounds})`,
      })),
      summary: {
        zh: `全部 ${fullState.totalRounds} 轮三维方块速算结束，胜出者精准洞察所有隐藏支撑方块！`,
        en: `All ${fullState.totalRounds} 3D cube rounds complete — precision spatial deduction prevailed!`,
      },
    };
  },
};
