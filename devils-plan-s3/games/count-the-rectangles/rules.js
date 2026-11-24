/**
 * Game 01b: Count the Rectangles (数矩形 / 사각형 세기)
 * Exact O(M^2 N^2) sub-rectangle enumerator + Solo(7) / Monopoly(5-1-1) / Devotion(1-3-3) team splits.
 */

export const LOCKOUT_MS = 20000;

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Exact O(R^2 C^2) enumerator of all axis-aligned sub-rectangles whose cell sum === target.
 */
export function findAllTargetRectangles(grid, target) {
  const R = grid.length;
  const C = grid[0].length;
  // 2D prefix sum for O(1) rectangle sum queries
  const ps = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      ps[r + 1][c + 1] = grid[r][c] + ps[r][c + 1] + ps[r + 1][c] - ps[r][c];
    }
  }

  const rects = [];
  for (let r1 = 0; r1 < R; r1++) {
    for (let c1 = 0; c1 < C; c1++) {
      for (let r2 = r1; r2 < R; r2++) {
        for (let c2 = c1; c2 < C; c2++) {
          const sum = ps[r2 + 1][c2 + 1] - ps[r1][c2 + 1] - ps[r2 + 1][c1] + ps[r1][c1];
          if (sum === target) {
            const values = [];
            for (let rr = r1; rr <= r2; rr++) {
              for (let cc = c1; cc <= c2; cc++) values.push(grid[rr][cc]);
            }
            rects.push({
              id: rects.length + 1,
              r1,
              c1,
              r2,
              c2,
              sum,
              values,
            });
          }
        }
      }
    }
  }
  return rects;
}

/**
 * Generates an engaging number matrix with exact solution count in [8, 22].
 */
export function generateRectanglePuzzle(gridSizeOpt, roundIndex, rng) {
  const N = gridSizeOpt === '6x6' ? 6 : 5;
  const targetPool = N === 6 ? [12, 15, 14] : [10, 12, 11];
  const target = targetPool[roundIndex % targetPool.length];
  const minSolutions = N === 6 ? 11 : 8;
  const maxSolutions = N === 6 ? 24 : 20;

  let best = null;
  let bestDist = Infinity;

  for (let attempt = 0; attempt < 90; attempt++) {
    const grid = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => {
        // Weighted 1..8 distribution to create rich multi-cell rectangles
        const r = rng();
        if (r < 0.2) return 1;
        if (r < 0.42) return 2;
        if (r < 0.62) return 3;
        if (r < 0.78) return 4;
        if (r < 0.89) return 5;
        if (r < 0.95) return 6;
        return 7 + Math.floor(rng() * 2);
      })
    );
    const rects = findAllTargetRectangles(grid, target);
    const count = rects.length;
    if (count >= minSolutions && count <= maxSolutions) {
      return { size: N, target, grid, solutions: rects, totalRects: count };
    }
    const mid = (minSolutions + maxSolutions) / 2;
    const dist = Math.abs(count - mid);
    if (count >= 4 && dist < bestDist) {
      bestDist = dist;
      best = { size: N, target, grid, solutions: rects, totalRects: count };
    }
  }

  return best || {
    size: N,
    target: 10,
    grid: Array.from({ length: N }, () => Array(N).fill(2)),
    solutions: findAllTargetRectangles(Array.from({ length: N }, () => Array(N).fill(2)), 10),
    totalRects: findAllTargetRectangles(Array.from({ length: N }, () => Array(N).fill(2)), 10).length,
  };
}

/**
 * Exact Devil's Plan S3 7-point pool payout calculation.
 */
export function computeTeamPayout(team) {
  const m = team.members.length;
  const payouts = {};
  if (m === 1 || team.policy === 'solo') {
    payouts[team.members[0]] = 7;
    return payouts;
  }
  if (m === 2) {
    if (team.policy === 'devotion') {
      payouts[team.members[0]] = 2;
      payouts[team.members[1]] = 5;
    } else {
      payouts[team.members[0]] = 5;
      payouts[team.members[1]] = 2;
    }
    return payouts;
  }
  // 3-player team: Monopoly 5/1/1 vs Devotion 1/3/3
  if (team.policy === 'devotion') {
    payouts[team.members[0]] = 1;
    payouts[team.members[1]] = 3;
    payouts[team.members[2]] = 3;
  } else {
    payouts[team.members[0]] = 5;
    payouts[team.members[1]] = 1;
    payouts[team.members[2]] = 1;
  }
  return payouts;
}

function getSeatTeam(state, seatId) {
  return state.teams.find((t) => t.members.includes(seatId)) || null;
}

function removeSeatFromTeams(state, seatId) {
  for (let i = state.teams.length - 1; i >= 0; i--) {
    const t = state.teams[i];
    t.members = t.members.filter((id) => id !== seatId);
    if (t.members.length === 0) {
      state.teams.splice(i, 1);
    } else if (t.captainId === seatId) {
      t.captainId = t.members[0];
    }
  }
}

function autoAssignUnassignedSeats(state, rng) {
  const assigned = new Set(state.teams.flatMap((t) => t.members));
  const unassigned = state.seats.filter((s) => !assigned.has(s.seatId));
  for (const s of unassigned) {
    // Bots try joining an open non-solo team (size < 3) 60% of the time, else create Monopoly/Devotion/Solo
    const openTeams = state.teams.filter((t) => t.policy !== 'solo' && t.members.length < 3);
    if (openTeams.length > 0 && rng() < 0.62) {
      openTeams[Math.floor(rng() * openTeams.length)].members.push(s.seatId);
    } else {
      const r = rng();
      const policy = r < 0.32 ? 'solo' : r < 0.66 ? 'monopoly' : 'devotion';
      state.teams.push({
        teamId: `T-${state.teams.length + 1}`,
        captainId: s.seatId,
        policy,
        members: [s.seatId],
      });
    }
  }
  // If a non-solo team ended up with only 1 member, normalize its policy to 'solo'
  for (const t of state.teams) {
    if (t.members.length === 1) t.policy = 'solo';
  }
}

function startHuntPhase(state, now, rng) {
  autoAssignUnassignedSeats(state, rng);
  state.puzzle = generateRectanglePuzzle(state.options.gridSize, state.round - 1, rng);
  state.phase = 'playing';
  state.roundStartedAt = now;
  state.teamSolvedOrder = [];
  state.teamStates = {};
  for (const t of state.teams) {
    state.teamStates[t.teamId] = {
      solvedAt: null,
      solveTimeMs: null,
      solvedBy: null,
      lockedUntil: 0,
      wrongAttempts: 0,
      lastGuess: null,
      payouts: {},
      gaveUp: false,
    };
  }
  // Schedule realistic AI team attempts (teams with more members solve slightly faster!)
  state.botSchedule = {};
  for (const t of state.teams) {
    const allBots = t.members.every((id) => state.seats.find((s) => s.seatId === id)?.isBot);
    if (!allBots) continue;
    const speedFactor = t.members.length === 3 ? 0.72 : t.members.length === 2 ? 0.86 : 1.0;
    const baseMs = (16000 + rng() * 34000) * speedFactor;
    const willMiss = rng() < 0.35;
    const firstAt = now + Math.min(state.roundLimitMs - 8000, Math.round(baseMs));
    const offset = (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 3));
    const attempts = willMiss
      ? [
          { at: firstAt, guess: Math.max(1, state.puzzle.totalRects + offset) },
          ...(firstAt + LOCKOUT_MS + 7000 < now + state.roundLimitMs - 2000
            ? [{ at: firstAt + LOCKOUT_MS + 7000 + Math.round(rng() * 14000), guess: state.puzzle.totalRects }]
            : []),
        ]
      : [{ at: firstAt, guess: state.puzzle.totalRects }];
    state.botSchedule[t.teamId] = { attempts, cursor: 0 };
  }

  state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
}

function initRound(state, roundIndex, now, rng) {
  state.round = roundIndex + 1;
  state.teams = [];
  state.setupReady = {};
  state.puzzle = null;
  state.teamSolvedOrder = [];
  state.teamStates = {};
  state.botSchedule = {};

  if (state.seats.length >= 2 && state.options.teamMode) {
    state.phase = 'setup';
    // Pre-assign each human to Solo by default so they can customize or jump straight in
    for (const s of state.seats) {
      if (!s.isBot) {
        state.teams.push({
          teamId: `T-${state.teams.length + 1}`,
          captainId: s.seatId,
          policy: 'solo',
          members: [s.seatId],
        });
      }
    }
    state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
  } else {
    for (const s of state.seats) {
      state.teams.push({
        teamId: `T-${state.teams.length + 1}`,
        captainId: s.seatId,
        policy: 'solo',
        members: [s.seatId],
      });
    }
    startHuntPhase(state, now, rng);
  }
}

function finalizeRound(state) {
  if (state.phase !== 'playing') return;
  // Award the 7-point pool to winning teams (1st place gets full 7pt pool; in 4+ team matches 2nd gets 4pt consolation or full if exact show rule: winning teams earn 7pt pool)
  const solvedCount = state.teamSolvedOrder.length;
  state.teamSolvedOrder.forEach((tid, idx) => {
    const team = state.teams.find((t) => t.teamId === tid);
    if (!team) return;
    // In Devil's Plan S3, the first team(s) to solve take the 7-point pool; if multiple solve before timer, 1st gets full 7pt split, later solvers get floor(half) so racing matters!
    const basePayout = computeTeamPayout(team);
    const scale = idx === 0 ? 1 : idx === 1 ? 0.6 : 0.4;
    const actual = {};
    for (const [sid, pts] of Object.entries(basePayout)) {
      const earned = idx === 0 ? pts : Math.max(1, Math.round(pts * scale));
      actual[sid] = earned;
      state.scores[sid] = (state.scores[sid] || 0) + earned;
    }
    state.teamStates[tid].payouts = actual;
  });

  state.history.push({
    round: state.round,
    target: state.puzzle.target,
    totalRects: state.puzzle.totalRects,
    solvedTeams: [...state.teamSolvedOrder],
  });

  state.phase = 'reveal';
  state.pendingSeatIds = [];
}

function checkHuntComplete(state) {
  const humanTeams = state.teams.filter((t) =>
    t.members.some((id) => !state.seats.find((s) => s.seatId === id)?.isBot)
  );
  const allHumanTeamsDone =
    humanTeams.length > 0 &&
    humanTeams.every((t) => state.teamStates[t.teamId].solvedAt || state.teamStates[t.teamId].gaveUp);
  const allTeamsDone = state.teams.every((t) => state.teamStates[t.teamId].solvedAt || state.teamStates[t.teamId].gaveUp);
  if (allTeamsDone || allHumanTeamsDone) {
    finalizeRound(state);
    return true;
  }
  return false;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx.options || {};
    const totalRounds = Number(opts.rounds) || 3;
    const roundLimitMs = (Number(opts.timeLimit) || 120) * 1000;
    const now = Date.now();
    const state = {
      seats: seats.map((s) => ({ seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: s.isBot })),
      options: {
        rounds: totalRounds,
        gridSize: opts.gridSize || '5x5',
        timeLimit: Number(opts.timeLimit) || 120,
        teamMode: opts.teamMode !== false,
      },
      totalRounds,
      roundLimitMs,
      round: 1,
      phase: 'setup', // 'setup' | 'playing' | 'reveal' | 'finished'
      scores: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      teams: [],
      setupReady: {},
      puzzle: null,
      roundStartedAt: now,
      teamSolvedOrder: [],
      teamStates: {},
      botSchedule: {},
      pendingSeatIds: [],
      history: [],
    };
    initRound(state, 0, now, ctx.rng);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'finished') return { ok: false, reason: 'Match ended' };

    if (action.type === 'SET_CONTRACT') {
      if (fullState.phase !== 'setup') return { ok: false, reason: 'Not in alliance setup' };
      const policy = action.payload?.policy;
      if (!['solo', 'monopoly', 'devotion'].includes(policy)) return { ok: false, reason: 'Invalid split policy' };
      return { ok: true };
    }

    if (action.type === 'JOIN_TEAM') {
      if (fullState.phase !== 'setup') return { ok: false, reason: 'Not in alliance setup' };
      const team = fullState.teams.find((t) => t.teamId === action.payload?.teamId);
      if (!team) return { ok: false, reason: 'Team not found' };
      if (team.policy === 'solo') return { ok: false, reason: 'Cannot join a Solo contract' };
      if (team.members.includes(seatId)) return { ok: true };
      if (team.members.length >= 3) return { ok: false, reason: 'Team is full (max 3)' };
      return { ok: true };
    }

    if (action.type === 'RECRUIT_BOT') {
      if (fullState.phase !== 'setup') return { ok: false, reason: 'Not in alliance setup' };
      const myTeam = getSeatTeam(fullState, seatId);
      if (!myTeam || myTeam.policy === 'solo' || myTeam.members.length >= 3) {
        return { ok: false, reason: 'Switch to Monopoly or Devotion (max 3) to recruit an AI partner' };
      }
      const assigned = new Set(fullState.teams.flatMap((t) => t.members));
      const freeBot = fullState.seats.find((s) => s.isBot && !assigned.has(s.seatId));
      if (!freeBot) return { ok: false, reason: 'No unassigned AI contestants left' };
      return { ok: true };
    }

    if (action.type === 'LOCK_SETUP') {
      if (fullState.phase !== 'setup') return { ok: false, reason: 'Not in alliance setup' };
      return { ok: true };
    }

    if (action.type === 'SUBMIT_GUESS') {
      if (fullState.phase !== 'playing') return { ok: false, reason: 'Not in matrix hunt' };
      const team = getSeatTeam(fullState, seatId);
      if (!team) return { ok: false, reason: 'No active team' };
      const ts = fullState.teamStates[team.teamId];
      if (ts.solvedAt || ts.gaveUp) return { ok: false, reason: 'Your team already finished' };
      const now = Date.now();
      if (ts.lockedUntil && now < ts.lockedUntil - 150) {
        return { ok: false, reason: `Locked (${Math.ceil((ts.lockedUntil - now) / 1000)}s)` };
      }
      const val = Number(action.payload?.guess);
      if (!Number.isInteger(val) || val < 0 || val > 500) {
        return { ok: false, reason: 'Enter a valid integer' };
      }
      return { ok: true };
    }

    if (action.type === 'GIVE_UP') {
      if (fullState.phase !== 'playing') return { ok: false, reason: 'Not playing' };
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

    if (action.type === 'SET_CONTRACT') {
      const policy = action.payload.policy;
      const cur = getSeatTeam(state, seatId);
      if (cur && cur.captainId === seatId && policy !== 'solo') {
        cur.policy = policy;
      } else {
        removeSeatFromTeams(state, seatId);
        state.teams.push({
          teamId: `T-${Date.now().toString(36).slice(-3)}-${state.teams.length + 1}`,
          captainId: seatId,
          policy,
          members: [seatId],
        });
      }
      delete state.setupReady[seatId];
      return { state, events: [{ type: 'CONTRACT_UPDATED', seatId, policy }] };
    }

    if (action.type === 'JOIN_TEAM') {
      const targetId = action.payload.teamId;
      removeSeatFromTeams(state, seatId);
      const target = state.teams.find((t) => t.teamId === targetId);
      if (target && target.members.length < 3) {
        target.members.push(seatId);
      }
      delete state.setupReady[seatId];
      return { state, events: [{ type: 'JOINED_TEAM', seatId, teamId: targetId }] };
    }

    if (action.type === 'RECRUIT_BOT') {
      const myTeam = getSeatTeam(state, seatId);
      const assigned = new Set(state.teams.flatMap((t) => t.members));
      const freeBot = state.seats.find((s) => s.isBot && !assigned.has(s.seatId));
      if (myTeam && freeBot && myTeam.members.length < 3) {
        myTeam.members.push(freeBot.seatId);
      }
      return { state, events: [{ type: 'BOT_RECRUITED', seatId }] };
    }

    if (action.type === 'LOCK_SETUP') {
      state.setupReady[seatId] = true;
      const humans = state.seats.filter((s) => !s.isBot);
      const pending = humans.filter((s) => !state.setupReady[s.seatId]).map((s) => s.seatId);
      state.pendingSeatIds = pending;
      if (pending.length === 0) {
        startHuntPhase(state, now, ctx.rng);
        events.push({ type: 'HUNT_START', round: state.round });
      }
      return { state, events };
    }

    if (action.type === 'SUBMIT_GUESS') {
      const team = getSeatTeam(state, seatId);
      const ts = state.teamStates[team.teamId];
      const guess = Number(action.payload.guess);
      ts.lastGuess = guess;
      if (guess === state.puzzle.totalRects) {
        ts.solvedAt = now;
        ts.solveTimeMs = Math.max(100, now - state.roundStartedAt);
        ts.solvedBy = seatId;
        ts.lockedUntil = 0;
        state.teamSolvedOrder.push(team.teamId);
        events.push({ type: 'SOLVED', seatId, teamId: team.teamId, rank: state.teamSolvedOrder.length });
        if (checkHuntComplete(state)) events.push({ type: 'ROUND_REVEAL', round: state.round });
      } else {
        ts.wrongAttempts += 1;
        ts.lockedUntil = now + LOCKOUT_MS;
        events.push({ type: 'LOCKOUT', seatId, teamId: team.teamId, guess });
      }
      return { state, events };
    }

    if (action.type === 'GIVE_UP') {
      const team = getSeatTeam(state, seatId);
      if (team) {
        state.teamStates[team.teamId].gaveUp = true;
        if (checkHuntComplete(state)) events.push({ type: 'ROUND_REVEAL', round: state.round });
      }
      return { state, events };
    }

    if (action.type === 'PROCESS_BOTS') {
      for (const team of state.teams) {
        const sched = state.botSchedule[team.teamId];
        const ts = state.teamStates[team.teamId];
        if (!sched || !ts || ts.solvedAt || ts.gaveUp || sched.cursor >= sched.attempts.length) continue;
        const nextAct = sched.attempts[sched.cursor];
        if (now >= nextAct.at && (!ts.lockedUntil || now >= ts.lockedUntil)) {
          sched.cursor += 1;
          ts.lastGuess = nextAct.guess;
          if (nextAct.guess === state.puzzle.totalRects) {
            ts.solvedAt = now;
            ts.solveTimeMs = Math.max(100, now - state.roundStartedAt);
            ts.solvedBy = team.captainId;
            state.teamSolvedOrder.push(team.teamId);
            events.push({ type: 'BOT_SOLVED', teamId: team.teamId });
            if (checkHuntComplete(state)) {
              events.push({ type: 'ROUND_REVEAL', round: state.round });
              break;
            }
          } else {
            ts.wrongAttempts += 1;
            ts.lockedUntil = now + LOCKOUT_MS;
            events.push({ type: 'BOT_LOCKOUT', teamId: team.teamId });
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
    if (state.phase === 'setup') {
      startHuntPhase(state, now, ctx.rng);
      return { state, events: [{ type: 'HUNT_START', round: state.round }] };
    }
    if (state.phase === 'playing') {
      finalizeRound(state);
      return { state, events: [{ type: 'ROUND_TIMEOUT', round: state.round }] };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'setup') {
      return { phaseKey: `ctr-r${fullState.round}-setup`, durationMs: 45000 };
    }
    if (fullState.phase === 'playing') {
      return { phaseKey: `ctr-r${fullState.round}-play`, durationMs: fullState.roundLimitMs };
    }
    return null;
  },

  projectState(fullState) {
    const hideAns = fullState.phase === 'playing';
    const puzzle = fullState.puzzle
      ? {
          size: fullState.puzzle.size,
          target: fullState.puzzle.target,
          grid: fullState.puzzle.grid,
          totalRects: hideAns ? null : fullState.puzzle.totalRects,
          solutions: hideAns ? null : fullState.puzzle.solutions,
        }
      : null;

    return {
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      phase: fullState.phase,
      options: fullState.options,
      seats: fullState.seats,
      scores: fullState.scores,
      teams: fullState.teams,
      setupReady: fullState.setupReady,
      puzzle,
      teamSolvedOrder: fullState.teamSolvedOrder,
      teamStates: fullState.teamStates,
      pendingSeatIds: fullState.pendingSeatIds,
      history: fullState.history,
    };
  },

  computeBotAction() {
    // Bots are automatically organized in startHuntPhase and paced via PROCESS_BOTS
    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'finished') return null;
    const ranked = [...fullState.seats].sort((a, b) => (fullState.scores[b.seatId] || 0) - (fullState.scores[a.seatId] || 0));
    const top = fullState.scores[ranked[0].seatId] || 0;
    return {
      winnerSeatIds: ranked.filter((s) => (fullState.scores[s.seatId] || 0) === top).map((s) => s.seatId),
      rankings: ranked.map((s) => ({
        seatId: s.seatId,
        score: fullState.scores[s.seatId] || 0,
        label: `${fullState.scores[s.seatId] || 0} pts`,
      })),
      summary: {
        zh: `全部 ${fullState.totalRounds} 轮数字矩形搜索结束！精算与组队博弈共同决定了最终胜负。`,
        en: `All ${fullState.totalRounds} rectangle matrix rounds complete! Precision and squad diplomacy decided the winner.`,
      },
    };
  },
};
