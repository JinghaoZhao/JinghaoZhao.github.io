/**
 * Exile Match 4: Loop Fence Puzzle / Slitherlink (围栏环路 / 울타리 치기)
 * Guaranteed-solvable Slitherlink generator (5x5 / 6x6 / 7x7) built from a true
 * simply-connected single closed loop, with real-time clue satisfaction,
 * branch/loop topology validation, AI rival racers, and survival ranking.
 */

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMatrix(rows, cols, val = 0) {
  return Array.from({ length: rows }, () => Array(cols).fill(val));
}

/**
 * Check that `inside` (N x N booleans) is 4-connected, has zero interior holes
 * (all false cells connect to outer boundary), and has zero 2x2 diagonal pinches.
 */
function isValidSimplyConnectedRegion(inside, N) {
  // 1. Check 2x2 diagonal pinch patterns on (N+2)x(N+2) padded grid
  const get = (r, c) => (r >= 0 && r < N && c >= 0 && c < N ? (inside[r][c] ? 1 : 0) : 0);
  for (let r = -1; r < N; r++) {
    for (let c = -1; c < N; c++) {
      const a = get(r, c);
      const b = get(r, c + 1);
      const d = get(r + 1, c);
      const e = get(r + 1, c + 1);
      if ((a === 1 && e === 1 && b === 0 && d === 0) || (a === 0 && e === 0 && b === 1 && d === 1)) {
        return false;
      }
    }
  }

  // 2. Check inside 4-connectivity
  let totalIn = 0;
  let startIn = null;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (inside[r][c]) {
        totalIn++;
        if (!startIn) startIn = [r, c];
      }
    }
  }
  if (totalIn === 0) return false;

  const visIn = makeMatrix(N, N, false);
  const qIn = [startIn];
  visIn[startIn[0]][startIn[1]] = true;
  let seenIn = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (qIn.length) {
    const [r, c] = qIn.shift();
    seenIn++;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && inside[nr][nc] && !visIn[nr][nc]) {
        visIn[nr][nc] = true;
        qIn.push([nr, nc]);
      }
    }
  }
  if (seenIn !== totalIn) return false;

  // 3. Check outside connectivity (no enclosed holes) via BFS on padded (N+2)x(N+2)
  const P = N + 2;
  const visOut = makeMatrix(P, P, false);
  const qOut = [[0, 0]];
  visOut[0][0] = true;
  let seenOut = 0;
  while (qOut.length) {
    const [pr, pc] = qOut.shift();
    seenOut++;
    for (const [dr, dc] of dirs) {
      const nr = pr + dr, nc = pc + dc;
      if (nr >= 0 && nr < P && nc >= 0 && nc < P && !visOut[nr][nc] && get(nr - 1, nc - 1) === 0) {
        visOut[nr][nc] = true;
        qOut.push([nr, nc]);
      }
    }
  }
  const totalOut = P * P - totalIn;
  return seenOut === totalOut;
}

/**
 * Evaluate a Slitherlink board state (h: (N+1)xN, v: Nx(N+1)) against clues (NxN, null or 0..3).
 */
export function evaluateSlitherlink(N, clues, h, v) {
  const cellCounts = makeMatrix(N, N, 0);
  const cellStatus = makeMatrix(N, N, 'neutral'); // 'neutral' | 'ok' | 'over'
  let totalClues = 0;
  let satisfiedClues = 0;
  let overflowClues = 0;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cnt =
        (h[r][c] === 1 ? 1 : 0) +
        (h[r + 1][c] === 1 ? 1 : 0) +
        (v[r][c] === 1 ? 1 : 0) +
        (v[r][c + 1] === 1 ? 1 : 0);
      cellCounts[r][c] = cnt;
      const clue = clues[r][c];
      if (clue !== null && clue !== undefined) {
        totalClues++;
        if (cnt === clue) {
          satisfiedClues++;
          cellStatus[r][c] = 'ok';
        } else if (cnt > clue) {
          overflowClues++;
          cellStatus[r][c] = 'over';
        }
      }
    }
  }

  // Vertex degrees & connected component count of drawn fence edges
  const vertexDeg = makeMatrix(N + 1, N + 1, 0);
  const adj = Array.from({ length: (N + 1) * (N + 1) }, () => []);
  let fenceCount = 0;
  const vid = (r, c) => r * (N + 1) + c;

  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) {
      if (h[r][c] === 1) {
        fenceCount++;
        const a = vid(r, c), b = vid(r, c + 1);
        vertexDeg[r][c]++;
        vertexDeg[r][c + 1]++;
        adj[a].push(b);
        adj[b].push(a);
      }
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= N; c++) {
      if (v[r][c] === 1) {
        fenceCount++;
        const a = vid(r, c), b = vid(r + 1, c);
        vertexDeg[r][c]++;
        vertexDeg[r + 1][c]++;
        adj[a].push(b);
        adj[b].push(a);
      }
    }
  }

  let branchErrors = 0;
  let openEndpoints = 0;
  let activeVertices = 0;
  let firstActive = -1;
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= N; c++) {
      const d = vertexDeg[r][c];
      if (d > 0) {
        activeVertices++;
        if (firstActive === -1) firstActive = vid(r, c);
      }
      if (d > 2) branchErrors++;
      if (d === 1) openEndpoints++;
    }
  }

  let isSingleClosedLoop = false;
  if (fenceCount >= 4 && branchErrors === 0 && openEndpoints === 0 && firstActive !== -1) {
    // BFS all active vertices from firstActive
    const vis = new Uint8Array((N + 1) * (N + 1));
    const q = [firstActive];
    vis[firstActive] = 1;
    let reached = 0;
    while (q.length) {
      const u = q.shift();
      reached++;
      for (const w of adj[u]) {
        if (!vis[w]) {
          vis[w] = 1;
          q.push(w);
        }
      }
    }
    isSingleClosedLoop = reached === activeVertices;
  }

  const allCluesOk = totalClues > 0 && satisfiedClues === totalClues && overflowClues === 0;
  const isSolved = allCluesOk && isSingleClosedLoop;

  const progress = isSolved
    ? 100
    : Math.min(95, Math.round((satisfiedClues / Math.max(1, totalClues)) * 85 + (fenceCount > 0 ? 10 : 0)));

  return {
    cellCounts,
    cellStatus,
    vertexDeg,
    fenceCount,
    totalClues,
    satisfiedClues,
    overflowClues,
    branchErrors,
    openEndpoints,
    isSingleClosedLoop,
    allCluesOk,
    isSolved,
    progress,
  };
}

/**
 * Generate a verified 100% solvable Slitherlink puzzle of size N x N from rng.
 */
export function generateSlitherlinkPuzzle(N, rng) {
  let best = null;
  const targetCells = Math.max(4, Math.round(N * N * 0.46));

  for (let trial = 0; trial < 18; trial++) {
    const inside = makeMatrix(N, N, false);
    const sr = randInt(rng, 0, N - 1);
    const sc = randInt(rng, 0, N - 1);
    inside[sr][sc] = true;
    let count = 1;

    // Grow a winding, irregular simply-connected polyomino
    for (let iter = 0; iter < N * N * 6 && count < targetCells; iter++) {
      // Collect candidate border cells
      const cands = [];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (inside[r][c]) continue;
          let adjIn = 0;
          if (r > 0 && inside[r - 1][c]) adjIn++;
          if (r < N - 1 && inside[r + 1][c]) adjIn++;
          if (c > 0 && inside[r][c - 1]) adjIn++;
          if (c < N - 1 && inside[r][c + 1]) adjIn++;
          if (adjIn >= 1) {
            // Favor cells with adjIn===1 for winding snaky loops!
            cands.push({ r, c, weight: adjIn === 1 ? 3 : 1 });
          }
        }
      }
      if (!cands.length) break;
      // Pick weighted random candidate
      const shuffled = shuffle(cands, rng).sort((a, b) => (rng() < 0.65 ? b.weight - a.weight : 0));
      let added = false;
      for (const cand of shuffled) {
        inside[cand.r][cand.c] = true;
        if (isValidSimplyConnectedRegion(inside, N)) {
          count++;
          added = true;
          break;
        }
        inside[cand.r][cand.c] = false;
      }
      if (!added) break;
    }

    // Extract boundary loop
    const solH = makeMatrix(N + 1, N, 0);
    const solV = makeMatrix(N, N + 1, 0);
    const get = (r, c) => (r >= 0 && r < N && c >= 0 && c < N ? inside[r][c] : false);
    let perimeter = 0;
    for (let r = 0; r <= N; r++) {
      for (let c = 0; c < N; c++) {
        if (get(r - 1, c) !== get(r, c)) {
          solH[r][c] = 1;
          perimeter++;
        }
      }
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c <= N; c++) {
        if (get(r, c - 1) !== get(r, c)) {
          solV[r][c] = 1;
          perimeter++;
        }
      }
    }

    // Compute full clue grid
    const fullClues = makeMatrix(N, N, 0);
    let countThrees = 0;
    let countZeros = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const val = solH[r][c] + solH[r + 1][c] + solV[r][c] + solV[r][c + 1];
        fullClues[r][c] = val;
        if (val === 3) countThrees++;
        if (val === 0) countZeros++;
      }
    }

    const check = evaluateSlitherlink(N, fullClues, solH, solV);
    if (!check.isSolved) continue;

    // Score aesthetic loop richness (long winding perimeter + good mix of 3s and 0s)
    const score = perimeter * 3 + countThrees * 6 + Math.min(countZeros, 4) * 3;
    if (!best || score > best.score) {
      best = { score, solH, solV, fullClues, perimeter };
    }
  }

  // Thin clues cleanly while preserving crisp logical solvability
  const clues = clone(best.fullClues);
  const keepRatio = N === 5 ? 0.64 : N === 6 ? 0.62 : 0.60;
  const targetKeep = Math.ceil(N * N * keepRatio);

  // Prioritize hiding '1' and '2' interior cells while retaining key '3' and '0' anchors
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = clues[r][c];
      const priority = v === 3 || v === 0 ? 0.25 : 1.0;
      cells.push({ r, c, key: rng() * priority });
    }
  }
  cells.sort((a, b) => b.key - a.key);

  let kept = N * N;
  for (const cell of cells) {
    if (kept <= targetKeep) break;
    // Never create a 2x2 completely blank void (keeps puzzle tight & well-constrained)
    clues[cell.r][cell.c] = null;
    let hasBlank2x2 = false;
    for (let r = Math.max(0, cell.r - 1); r <= Math.min(N - 2, cell.r); r++) {
      for (let c = Math.max(0, cell.c - 1); c <= Math.min(N - 2, cell.c); c++) {
        if (
          clues[r][c] === null &&
          clues[r][c + 1] === null &&
          clues[r + 1][c] === null &&
          clues[r + 1][c + 1] === null
        ) {
          hasBlank2x2 = true;
        }
      }
    }
    if (hasBlank2x2) {
      clues[cell.r][cell.c] = best.fullClues[cell.r][cell.c];
    } else {
      kept--;
    }
  }

  return {
    size: N,
    clues,
    _solH: best.solH,
    _solV: best.solV,
    perimeter: best.perimeter,
  };
}

function finalizeRemainingIfNeeded(state, now) {
  const seats = state.seatOrder;
  const total = seats.length;
  const finishedCount = state.finishOrder.length;
  const humanSeats = seats.filter((sid) => !state.players[sid].isBot);
  const unfinishedHumans = humanSeats.filter((sid) => !state.players[sid].finished);

  const shouldEnd =
    (total === 1 && finishedCount >= 1) ||
    (total >= 2 && finishedCount >= total - 1) ||
    (total >= 2 && humanSeats.length > 0 && unfinishedHumans.length === 0);

  if (!shouldEnd) return;

  state.phase = 'ended';
  state.endedAtMs = now;

  const remaining = seats
    .filter((sid) => !state.players[sid].finished)
    .sort((a, b) => state.players[b].progress - state.players[a].progress);

  for (const sid of remaining) {
    const p = state.players[sid];
    if (total === 1) {
      p.status = 'failed';
    } else if (state.finishOrder.length < total - 1) {
      p.status = 'survived';
      p.finishTimeMs = Math.max(1000, (now - state.startedAtMs) + Math.round((100 - p.progress) * 500));
      state.finishOrder.push(sid);
    } else {
      p.status = 'eliminated';
      state.eliminatedSeatId = sid;
    }
  }

  const survivorLimit = total === 1 ? 1 : total - 1;
  state.finishOrder.forEach((sid, idx) => {
    const p = state.players[sid];
    p.rank = idx + 1;
    p.status = idx < survivorLimit ? 'survived' : 'eliminated';
  });
  state.pendingSeatIds = [];
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const opts = ctx.options || {};
    const N = [5, 6, 7].includes(Number(opts.gridSize)) ? Number(opts.gridSize) : 6;
    const fastMode = Boolean(opts.fastMode);
    const puzzle = generateSlitherlinkPuzzle(N, rng);
    const now = Date.now();
    const matchDurationMs = fastMode ? 210000 : N === 7 ? 420000 : 300000;

    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    for (const s of seats) {
      const baseTicks = N === 5 ? 36 : N === 6 ? 54 : 76;
      const targetTicks = fastMode
        ? randInt(rng, Math.round(baseTicks * 0.6), Math.round(baseTicks * 0.95))
        : randInt(rng, baseTicks, Math.round(baseTicks * 1.6));

      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar,
        isBot: Boolean(s.isBot),
        h: makeMatrix(N + 1, N, 0),
        v: makeMatrix(N, N + 1, 0),
        history: [], // undo stack (last 40 moves)
        progress: 0,
        finished: false,
        finishTimeMs: null,
        status: 'racing',
        rank: null,
        _botTicks: 0,
        _botTargetTicks: targetTicks,
      };
    }

    return {
      phase: 'playing',
      startedAtMs: now,
      endedAtMs: null,
      matchDurationMs,
      gridSize: N,
      clues: puzzle.clues,
      _solH: puzzle._solH,
      _solV: puzzle._solV,
      seatOrder,
      pendingSeatIds: seatOrder.slice(),
      finishOrder: [],
      eliminatedSeatId: null,
      players,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase !== 'playing') {
      return { ok: false, reason: 'Match ended' };
    }
    const p = fullState.players[seatId];
    if (!p) return { ok: false, reason: 'Invalid seat' };
    if (p.finished) return { ok: false, reason: 'Already solved' };

    if (action.type === 'BOT_STEP') {
      return p.isBot ? { ok: true } : { ok: false, reason: 'Bot only' };
    }
    if (action.type === 'SET_EDGE') {
      const { orient, r, c, value } = action.payload || {};
      const N = fullState.gridSize;
      if (orient === 'h') {
        if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > N || c < 0 || c >= N) {
          return { ok: false, reason: 'Out of bounds' };
        }
      } else if (orient === 'v') {
        if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= N || c < 0 || c > N) {
          return { ok: false, reason: 'Out of bounds' };
        }
      } else {
        return { ok: false, reason: 'Bad orientation' };
      }
      if (![0, 1, -1].includes(value)) return { ok: false, reason: 'Bad value' };
      return { ok: true };
    }
    if (action.type === 'UNDO' || action.type === 'CLEAR_BOARD' || action.type === 'GIVE_UP') {
      return { ok: true };
    }
    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const p = state.players[seatId];
    const N = state.gridSize;
    const now = ctx?.now || Date.now();
    const events = [];

    if (action.type === 'BOT_STEP') {
      p._botTicks += 1;
      const ratio = Math.min(1, p._botTicks / Math.max(1, p._botTargetTicks));
      if (ratio >= 1) {
        p.h = clone(state._solH);
        p.v = clone(state._solV);
        p.progress = 100;
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'LOOP_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
        finalizeRemainingIfNeeded(state, now);
      } else {
        p.progress = Math.min(95, Math.floor(ratio * 95));
      }
      return { state, events };
    }

    if (action.type === 'GIVE_UP') {
      p.finished = true;
      p.status = state.seatOrder.length === 1 ? 'failed' : 'eliminated';
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      if (state.seatOrder.length === 1) {
        state.phase = 'ended';
        state.endedAtMs = now;
      } else {
        finalizeRemainingIfNeeded(state, now);
      }
      events.push({ type: 'GIVE_UP', seatId, ts: now });
      return { state, events };
    }

    if (action.type === 'SET_EDGE') {
      const { orient, r, c, value } = action.payload;
      const prev = orient === 'h' ? p.h[r][c] : p.v[r][c];
      if (prev !== value) {
        p.history.push({ orient, r, c, prev });
        if (p.history.length > 50) p.history.shift();
        if (orient === 'h') p.h[r][c] = value;
        else p.v[r][c] = value;
      }
    } else if (action.type === 'UNDO') {
      const last = p.history.pop();
      if (last) {
        if (last.orient === 'h') p.h[last.r][last.c] = last.prev;
        else p.v[last.r][last.c] = last.prev;
      }
    } else if (action.type === 'CLEAR_BOARD') {
      p.h = makeMatrix(N + 1, N, 0);
      p.v = makeMatrix(N, N + 1, 0);
      p.history = [];
    }

    const ev = evaluateSlitherlink(N, state.clues, p.h, p.v);
    p.progress = ev.progress;

    if (ev.isSolved) {
      p.finished = true;
      p.progress = 100;
      p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
      p.status = 'survived';
      state.finishOrder.push(seatId);
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'LOOP_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
      finalizeRemainingIfNeeded(state, now);
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase !== 'playing') return null;
    return { phaseKey: 'slitherlink-race', durationMs: fullState.matchDurationMs };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    if (state.phase !== 'playing') return null;
    const now = ctx?.now || Date.now();
    state.phase = 'ended';
    state.endedAtMs = now;
    const total = state.seatOrder.length;
    const remaining = state.seatOrder
      .filter((sid) => !state.players[sid].finished)
      .sort((a, b) => state.players[b].progress - state.players[a].progress);
    for (const sid of remaining) {
      const p = state.players[sid];
      if (total === 1) p.status = 'failed';
      else if (state.finishOrder.length < total - 1) {
        p.status = 'survived';
        state.finishOrder.push(sid);
      } else {
        p.status = 'eliminated';
        state.eliminatedSeatId = sid;
      }
    }
    state.finishOrder.forEach((sid, i) => {
      state.players[sid].rank = i + 1;
    });
    state.pendingSeatIds = [];
    return { state, events: [{ type: 'TIME_UP', ts: now }] };
  },

  computeBotAction(fullState, botSeatId) {
    if (!fullState || fullState.phase !== 'playing') return null;
    const p = fullState.players[botSeatId];
    if (!p || !p.isBot || p.finished) return null;
    return { type: 'BOT_STEP', payload: {} };
  },

  projectState(fullState, viewerSeatId) {
    const ended = fullState.phase === 'ended';
    const myPlayer = viewerSeatId && fullState.players[viewerSeatId] ? fullState.players[viewerSeatId] : null;

    const racers = fullState.seatOrder.map((sid) => {
      const p = fullState.players[sid];
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        progress: p.progress,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        status: p.status,
        rank: p.rank,
      };
    });

    return {
      phase: fullState.phase,
      gridSize: fullState.gridSize,
      clues: fullState.clues,
      solution: ended ? { h: fullState._solH, v: fullState._solV } : null,
      racers,
      finishOrder: fullState.finishOrder,
      eliminatedSeatId: fullState.eliminatedSeatId,
      myBoard: myPlayer
        ? {
            h: myPlayer.h,
            v: myPlayer.v,
            canUndo: myPlayer.history.length > 0,
            finished: myPlayer.finished,
            finishTimeMs: myPlayer.finishTimeMs,
            status: myPlayer.status,
          }
        : null,
    };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;
    const total = fullState.seatOrder.length;
    const ordered = fullState.seatOrder.slice().sort((a, b) => {
      const pa = fullState.players[a];
      const pb = fullState.players[b];
      if (pa.finished && pb.finished) return (pa.finishTimeMs || 0) - (pb.finishTimeMs || 0);
      if (pa.finished !== pb.finished) return pa.finished ? -1 : 1;
      return pb.progress - pa.progress;
    });

    const rankings = ordered.map((sid, idx) => {
      const p = fullState.players[sid];
      const isElim = total >= 2 && idx === total - 1 && p.status !== 'survived';
      const label = p.finished && p.finishTimeMs != null
        ? `LOOP CLOSED · ${(p.finishTimeMs / 1000).toFixed(1)}s`
        : `${p.progress}% · ${total === 1 ? 'FAILED' : isElim ? 'ELIMINATED' : 'SURVIVED'}`;
      return { seatId: sid, score: p.progress, label };
    });

    const winnerSeatIds = total === 1
      ? (fullState.players[ordered[0]].finished ? [ordered[0]] : [])
      : ordered.slice(0, Math.max(1, total - 1)).filter((sid) => fullState.players[sid].status === 'survived');

    const elimName = fullState.eliminatedSeatId ? fullState.players[fullState.eliminatedSeatId]?.name : null;

    return {
      winnerSeatIds,
      rankings,
      summary: total === 1
        ? {
            zh: winnerSeatIds.length ? '金色闭合围栏贯通！你完美解开了数回环路谜题。' : '未能连成唯一闭合环路，可点击“查看终局棋盘”对照参考解法。',
            en: winnerSeatIds.length ? 'Golden single loop closed! You conquered Exile Match 4.' : 'Loop incomplete. Inspect the board to view the verified solution.',
          }
        : {
            zh: elimName ? `围栏环路竞速落幕：前 ${total - 1} 名存活，${elimName} 永久淘汰。` : '围栏环路竞速结束！',
            en: elimName ? `Loop Fence race concludes: Top ${total - 1} survive; ${elimName} is permanently eliminated.` : 'Loop Fence race complete!',
          },
    };
  },
};
