/**
 * Exile Match 1: Piece Puzzle (碎片拼图 / 피스 퍼즐)
 * Pure deterministic state machine, guaranteed-solvable interlocking piece generator,
 * seam validation, AI rival racers, and survival ranking.
 *
 * Edge encoding:
 *   0 = flat outer edge
 *   +1..+5 = protruding tongue (tab) of profile 1..5
 *   -1..-5 = recessed groove (socket) of profile 1..5
 *   Two touching edges interlock iff (edgeA + edgeB === 0) and (edgeA !== 0 for interior edges).
 */

const COLS = 4;
const ROWS = 2;
const NUM_SLOTS = COLS * ROWS; // 8 slots: 0..7
const GROOVE_TYPES = [1, 2, 3, 4, 5];
const GLYPHS = ['☥', '𓂀', '◈', '⟐', '✦', '⬡', '❖', '⬟'];

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

/**
 * Rotate a 4-edge tuple [top, right, bottom, left] clockwise by rot (0..3).
 */
export function rotateEdges(edges, rot) {
  const r = ((rot % 4) + 4) % 4;
  if (r === 0) return edges.slice();
  if (r === 1) return [edges[3], edges[0], edges[1], edges[2]];
  if (r === 2) return [edges[2], edges[3], edges[0], edges[1]];
  return [edges[1], edges[2], edges[3], edges[0]];
}

function canonicalSignature(edges) {
  let best = '';
  for (let r = 0; r < 4; r++) {
    const s = rotateEdges(edges, r).join(',');
    if (!best || s < best) best = s;
  }
  return best;
}

function randomGroove(rng) {
  const type = GROOVE_TYPES[randInt(rng, 0, GROOVE_TYPES.length - 1)];
  return rng() < 0.5 ? type : -type;
}

/**
 * Generate a guaranteed-solvable 4x2 interlocking puzzle deterministically from rng.
 */
function generatePuzzle(rng, carvedFrame) {
  for (let attempt = 0; attempt < 40; attempt++) {
    // Interior horizontal seams: 2 rows x 3 seams between col c and c+1
    const hSeams = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS - 1 }, () => randomGroove(rng))
    );
    // Interior vertical seams: 1 seam row x 4 cols between row 0 and row 1
    const vSeams = Array.from({ length: COLS }, () => randomGroove(rng));

    // Outer frame edges (what the frame expects on the border; piece must be exact negative!)
    // frameTop[c] is the frame edge pointing down into (0, c) -> piece top edge = -frameTop[c]
    const frame = {
      top: Array.from({ length: COLS }, () => (carvedFrame ? randomGroove(rng) : 0)),
      bottom: Array.from({ length: COLS }, () => (carvedFrame ? randomGroove(rng) : 0)),
      left: Array.from({ length: ROWS }, () => (carvedFrame ? randomGroove(rng) : 0)),
      right: Array.from({ length: ROWS }, () => (carvedFrame ? randomGroove(rng) : 0)),
    };

    const solvedPieces = [];
    const sigs = new Set();
    let hasDuplicate = false;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const top = r === 0 ? -frame.top[c] : -vSeams[c];
        const bottom = r === ROWS - 1 ? -frame.bottom[c] : vSeams[c];
        const left = c === 0 ? -frame.left[r] : -hSeams[r][c - 1];
        const right = c === COLS - 1 ? -frame.right[r] : hSeams[r][c];
        const edges = [top, right, bottom, left];
        const sig = canonicalSignature(edges);
        if (sigs.has(sig)) {
          hasDuplicate = true;
        }
        sigs.add(sig);
        solvedPieces.push({
          solutionSlot: r * COLS + c,
          solvedEdges: edges,
        });
      }
    }

    if (hasDuplicate && attempt < 30) continue;

    // Shuffle pieces and assign random initial orientation (not necessarily solved rotation)
    const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7], rng);
    const pieces = order.map((solIdx, pieceIdx) => {
      const sp = solvedPieces[solIdx];
      const initRot = randInt(rng, 0, 3);
      return {
        id: pieceIdx,
        code: String.fromCharCode(65 + pieceIdx), // A..H
        glyph: GLYPHS[pieceIdx],
        // baseEdges are what piece looks like at rot=0 in player tray
        baseEdges: rotateEdges(sp.solvedEdges, initRot),
        _solutionSlot: sp.solutionSlot,
        _solutionRot: (4 - initRot) % 4,
      };
    });

    return {
      cols: COLS,
      rows: ROWS,
      carvedFrame: Boolean(carvedFrame),
      frame,
      pieces,
    };
  }
  throw new Error('Failed to generate piece puzzle');
}

/**
 * Evaluate a player's current board placement (8 slots: null or { pieceId, rot }).
 */
export function evaluateBoard(puzzle, slots) {
  const pieceMap = new Map(puzzle.pieces.map((p) => [p.id, p]));
  const effEdges = slots.map((entry) => {
    if (!entry) return null;
    const p = pieceMap.get(entry.pieceId);
    return p ? rotateEdges(p.baseEdges, entry.rot) : null;
  });

  let placedCount = 0;
  let matchedSeams = 0;
  let totalSeams = 0;
  let mismatchedSeams = 0;

  // Interior horizontal seams (between (r,c) right and (r,c+1) left)
  const hStatus = []; // { r, c, status: 'empty' | 'ok' | 'bad' }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      totalSeams++;
      const a = effEdges[r * COLS + c];
      const b = effEdges[r * COLS + c + 1];
      if (!a || !b) {
        hStatus.push({ r, c, status: 'empty' });
      } else if (a[1] + b[3] === 0 && a[1] !== 0) {
        matchedSeams++;
        hStatus.push({ r, c, status: 'ok' });
      } else {
        mismatchedSeams++;
        hStatus.push({ r, c, status: 'bad' });
      }
    }
  }

  // Interior vertical seams (between (0,c) bottom and (1,c) top)
  const vStatus = [];
  for (let c = 0; c < COLS; c++) {
    totalSeams++;
    const a = effEdges[c];
    const b = effEdges[COLS + c];
    if (!a || !b) {
      vStatus.push({ r: 0, c, status: 'empty' });
    } else if (a[2] + b[0] === 0 && a[2] !== 0) {
      matchedSeams++;
      vStatus.push({ r: 0, c, status: 'ok' });
    } else {
      mismatchedSeams++;
      vStatus.push({ r: 0, c, status: 'bad' });
    }
  }

  // Outer frame edges
  let frameOk = 0;
  let frameTotal = 12; // 4 top + 4 bottom + 2 left + 2 right
  let frameBad = 0;
  const slotErrors = Array(NUM_SLOTS).fill(false);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const e = effEdges[idx];
      if (!e) continue;
      placedCount++;
      if (r === 0) {
        if (e[0] + puzzle.frame.top[c] === 0) frameOk++;
        else {
          frameBad++;
          slotErrors[idx] = true;
        }
      }
      if (r === ROWS - 1) {
        if (e[2] + puzzle.frame.bottom[c] === 0) frameOk++;
        else {
          frameBad++;
          slotErrors[idx] = true;
        }
      }
      if (c === 0) {
        if (e[3] + puzzle.frame.left[r] === 0) frameOk++;
        else {
          frameBad++;
          slotErrors[idx] = true;
        }
      }
      if (c === COLS - 1) {
        if (e[1] + puzzle.frame.right[r] === 0) frameOk++;
        else {
          frameBad++;
          slotErrors[idx] = true;
        }
      }
    }
  }

  for (const h of hStatus) {
    if (h.status === 'bad') {
      slotErrors[h.r * COLS + h.c] = true;
      slotErrors[h.r * COLS + h.c + 1] = true;
    }
  }
  for (const v of vStatus) {
    if (v.status === 'bad') {
      slotErrors[v.c] = true;
      slotErrors[COLS + v.c] = true;
    }
  }

  const isSolved =
    placedCount === NUM_SLOTS &&
    matchedSeams === totalSeams &&
    mismatchedSeams === 0 &&
    frameBad === 0 &&
    frameOk === frameTotal;

  const progress = isSolved
    ? 100
    : Math.min(96, Math.round((placedCount / NUM_SLOTS) * 45 + (matchedSeams / totalSeams) * 40 + (frameOk / frameTotal) * 15));

  return {
    placedCount,
    matchedSeams,
    totalSeams,
    mismatchedSeams,
    frameOk,
    frameTotal,
    frameBad,
    hStatus,
    vStatus,
    slotErrors,
    isSolved,
    progress,
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

  // Order remaining unfinished players by progress descending (bots get projected finish order)
  const remaining = seats
    .filter((sid) => !state.players[sid].finished)
    .sort((a, b) => state.players[b].progress - state.players[a].progress);

  for (const sid of remaining) {
    const p = state.players[sid];
    if (total === 1) {
      p.status = 'failed';
    } else if (state.finishOrder.length < total - 1) {
      // Survived (only happens when human finished early and multiple bots remain)
      p.status = 'survived';
      p.finishTimeMs = Math.max(1000, (now - state.startedAtMs) + Math.round((100 - p.progress) * 450));
      state.finishOrder.push(sid);
    } else {
      p.status = 'eliminated';
      state.eliminatedSeatId = sid;
    }
  }

  // Mark survivors
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
    const carvedFrame = opts.difficulty === 'master';
    const fastMode = Boolean(opts.fastMode);
    const puzzle = generatePuzzle(rng, carvedFrame);
    const now = Date.now();
    const matchDurationMs = fastMode ? 180000 : 300000;

    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    for (const s of seats) {
      const botSteps = fastMode
        ? randInt(rng, 26, 46)
        : carvedFrame
        ? randInt(rng, 52, 92)
        : randInt(rng, 38, 72);

      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar,
        isBot: Boolean(s.isBot),
        slots: Array(NUM_SLOTS).fill(null), // [{ pieceId, rot } | null]
        trayRotations: Array(NUM_SLOTS).fill(0),
        progress: 0,
        matchedSeams: 0,
        placedCount: 0,
        wrongChecks: 0,
        lockoutUntilMs: 0,
        finished: false,
        finishTimeMs: null,
        status: 'racing', // 'racing' | 'survived' | 'eliminated' | 'failed'
        rank: null,
        _botTicks: 0,
        _botTargetTicks: botSteps,
      };
    }

    return {
      phase: 'playing',
      startedAtMs: now,
      endedAtMs: null,
      matchDurationMs,
      carvedFrame,
      fastMode,
      puzzle,
      seatOrder,
      pendingSeatIds: seatOrder.slice(),
      finishOrder: [],
      eliminatedSeatId: null,
      players,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase !== 'playing') {
      return { ok: false, reason: 'Match is not active' };
    }
    const p = fullState.players[seatId];
    if (!p) return { ok: false, reason: 'Invalid player' };
    if (p.finished) return { ok: false, reason: 'Already solved' };

    if (action.type === 'BOT_STEP') {
      return p.isBot ? { ok: true } : { ok: false, reason: 'Bot only' };
    }

    if (action.type === 'GIVE_UP') {
      return { ok: true };
    }

    if (Date.now() < (p.lockoutUntilMs || 0)) {
      return { ok: false, reason: 'Lockout penalty active' };
    }

    const { type, payload = {} } = action;
    if (type === 'PLACE_PIECE') {
      const { pieceId, slotIndex, rot } = payload;
      if (!Number.isInteger(pieceId) || pieceId < 0 || pieceId >= NUM_SLOTS) {
        return { ok: false, reason: 'Invalid piece' };
      }
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= NUM_SLOTS) {
        return { ok: false, reason: 'Invalid slot' };
      }
      if (rot != null && (!Number.isInteger(rot) || rot < 0 || rot > 3)) {
        return { ok: false, reason: 'Invalid rotation' };
      }
      return { ok: true };
    }
    if (type === 'REMOVE_PIECE') {
      const { slotIndex } = payload;
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= NUM_SLOTS) {
        return { ok: false, reason: 'Invalid slot' };
      }
      return { ok: true };
    }
    if (type === 'ROTATE_SLOT') {
      const { slotIndex } = payload;
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= NUM_SLOTS || !p.slots[slotIndex]) {
        return { ok: false, reason: 'Empty slot' };
      }
      return { ok: true };
    }
    if (type === 'ROTATE_TRAY') {
      const { pieceId } = payload;
      if (!Number.isInteger(pieceId) || pieceId < 0 || pieceId >= NUM_SLOTS) {
        return { ok: false, reason: 'Invalid piece' };
      }
      return { ok: true };
    }
    if (type === 'SWAP_SLOTS') {
      const { fromSlot, toSlot } = payload;
      if (
        !Number.isInteger(fromSlot) ||
        !Number.isInteger(toSlot) ||
        fromSlot < 0 ||
        fromSlot >= NUM_SLOTS ||
        toSlot < 0 ||
        toSlot >= NUM_SLOTS
      ) {
        return { ok: false, reason: 'Invalid slots' };
      }
      return { ok: true };
    }
    if (type === 'CLEAR_BOARD' || type === 'VERIFY_LOCK') {
      return { ok: true };
    }
    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const p = state.players[seatId];
    const now = ctx?.now || Date.now();
    const events = [];
    const { type, payload = {} } = action;

    if (type === 'BOT_STEP') {
      p._botTicks += 1;
      const ratio = Math.min(1, p._botTicks / Math.max(1, p._botTargetTicks));
      if (ratio >= 1) {
        // Bot completes the puzzle!
        p.slots = Array(NUM_SLOTS).fill(null);
        for (const pc of state.puzzle.pieces) {
          p.slots[pc._solutionSlot] = { pieceId: pc.id, rot: pc._solutionRot };
        }
        p.placedCount = NUM_SLOTS;
        p.matchedSeams = 10;
        p.progress = 100;
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'PLAYER_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs });
        finalizeRemainingIfNeeded(state, now);
      } else {
        p.progress = Math.min(96, Math.floor(ratio * 96));
        p.placedCount = Math.min(NUM_SLOTS, Math.floor(ratio * NUM_SLOTS));
        p.matchedSeams = Math.min(10, Math.floor(ratio * 10));
      }
      return { state, events };
    }

    if (type === 'GIVE_UP') {
      p.finished = true;
      p.status = state.seatOrder.length === 1 ? 'failed' : 'eliminated';
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      if (state.seatOrder.length === 1) {
        state.phase = 'ended';
        state.endedAtMs = now;
      } else {
        finalizeRemainingIfNeeded(state, now);
      }
      events.push({ type: 'GIVE_UP', seatId, name: p.name });
      return { state, events };
    }

    if (type === 'ROTATE_TRAY') {
      const { pieceId } = payload;
      p.trayRotations[pieceId] = (p.trayRotations[pieceId] + 1) % 4;
      return { state, events };
    }

    if (type === 'PLACE_PIECE') {
      const { pieceId, slotIndex } = payload;
      const rot = payload.rot != null ? payload.rot : p.trayRotations[pieceId] || 0;
      // If piece was already on another slot, move/swap it cleanly
      const prevIdx = p.slots.findIndex((s) => s && s.pieceId === pieceId);
      const displaced = p.slots[slotIndex];
      if (prevIdx !== -1 && prevIdx !== slotIndex) {
        p.slots[prevIdx] = displaced || null;
      }
      p.slots[slotIndex] = { pieceId, rot };
    } else if (type === 'REMOVE_PIECE') {
      const entry = p.slots[payload.slotIndex];
      if (entry) {
        p.trayRotations[entry.pieceId] = entry.rot;
        p.slots[payload.slotIndex] = null;
      }
    } else if (type === 'ROTATE_SLOT') {
      const entry = p.slots[payload.slotIndex];
      if (entry) {
        entry.rot = (entry.rot + 1) % 4;
      }
    } else if (type === 'SWAP_SLOTS') {
      const { fromSlot, toSlot } = payload;
      const tmp = p.slots[fromSlot];
      p.slots[fromSlot] = p.slots[toSlot];
      p.slots[toSlot] = tmp;
    } else if (type === 'CLEAR_BOARD') {
      for (let i = 0; i < NUM_SLOTS; i++) {
        if (p.slots[i]) {
          p.trayRotations[p.slots[i].pieceId] = p.slots[i].rot;
          p.slots[i] = null;
        }
      }
    }

    const ev = evaluateBoard(state.puzzle, p.slots);
    p.placedCount = ev.placedCount;
    p.matchedSeams = ev.matchedSeams;
    p.progress = ev.progress;

    if (type === 'VERIFY_LOCK' || ev.isSolved) {
      if (ev.isSolved) {
        p.finished = true;
        p.progress = 100;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'PLAYER_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs });
        finalizeRemainingIfNeeded(state, now);
      } else if (type === 'VERIFY_LOCK') {
        p.wrongChecks += 1;
        p.lockoutUntilMs = now + 5000;
        events.push({ type: 'LOCK_REJECTED', seatId, lockoutMs: 5000 });
      }
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase !== 'playing') return null;
    return {
      phaseKey: 'piece-puzzle-race',
      durationMs: fullState.matchDurationMs || 300000,
    };
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
      if (total === 1) {
        p.status = 'failed';
      } else if (state.finishOrder.length < total - 1) {
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
    return { state, events: [{ type: 'TIME_UP' }] };
  },

  computeBotAction(fullState, botSeatId) {
    if (!fullState || fullState.phase !== 'playing') return null;
    const p = fullState.players[botSeatId];
    if (!p || !p.isBot || p.finished) return null;
    return { type: 'BOT_STEP', payload: {} };
  },

  projectState(fullState, viewerSeatId) {
    const ended = fullState.phase === 'ended';
    const sanitizedPieces = fullState.puzzle.pieces.map((pc) => {
      const base = {
        id: pc.id,
        code: pc.code,
        glyph: pc.glyph,
        baseEdges: pc.baseEdges,
      };
      if (ended) {
        base.solutionSlot = pc._solutionSlot;
        base.solutionRot = pc._solutionRot;
      }
      return base;
    });

    const racers = fullState.seatOrder.map((sid) => {
      const p = fullState.players[sid];
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        progress: p.progress,
        placedCount: p.placedCount,
        matchedSeams: p.matchedSeams,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        status: p.status,
        rank: p.rank,
      };
    });

    const myPlayer = viewerSeatId && fullState.players[viewerSeatId] ? fullState.players[viewerSeatId] : null;

    return {
      phase: fullState.phase,
      startedAtMs: fullState.startedAtMs,
      endedAtMs: fullState.endedAtMs,
      carvedFrame: fullState.carvedFrame,
      puzzle: {
        cols: fullState.puzzle.cols,
        rows: fullState.puzzle.rows,
        carvedFrame: fullState.puzzle.carvedFrame,
        frame: fullState.puzzle.frame,
        pieces: sanitizedPieces,
      },
      racers,
      finishOrder: fullState.finishOrder,
      eliminatedSeatId: fullState.eliminatedSeatId,
      myBoard: myPlayer
        ? {
            slots: myPlayer.slots,
            trayRotations: myPlayer.trayRotations,
            wrongChecks: myPlayer.wrongChecks,
            lockoutUntilMs: myPlayer.lockoutUntilMs,
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

    const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;
    const rankings = ordered.map((sid, idx) => {
      const p = fullState.players[sid];
      const isElim = total >= 2 && idx === total - 1 && p.status !== 'survived';
      const label = p.finished && p.finishTimeMs != null
        ? `${fmt(p.finishTimeMs)} · ${isElim ? 'ELIMINATED' : 'SURVIVED'}`
        : `${p.progress}% · ${total === 1 ? 'FAILED' : 'ELIMINATED'}`;
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
            zh: winnerSeatIds.length ? '8 枚魔鬼碎片完美咬合！你通过了流放地首关考验。' : '未能完成碎片咬合阵，流放考验失败。',
            en: winnerSeatIds.length ? 'All 8 Devil\'s Pieces interlocked! You conquered Exile Match 1.' : 'Failed to interlock all 8 pieces before time expired.',
          }
        : {
            zh: elimName ? `流放地首战落幕：前 ${total - 1} 名存活，${elimName} 垫底永久淘汰。` : '流放地碎片拼图竞速结束！',
            en: elimName ? `Exile Match 1 concludes: Top ${total - 1} survive; ${elimName} is permanently eliminated.` : 'Piece Puzzle race complete!',
          },
    };
  },
};
