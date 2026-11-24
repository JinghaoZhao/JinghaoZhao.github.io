/**
 * Prison Match 4: Wall Go II (墙壁围棋Ⅱ / 벽바둑 Ⅱ)
 * Pure deterministic state machine, exact Square vs Circle movement, Wall Break power,
 * flood-fill territory scoring + largest single room tiebreaker, and strong tactical AI.
 *
 * Exact Show Rules (Day 4 PM4, Ep 10):
 * - 7x7 grid (outer border permanently walled).
 * - Square piece: 1 or 2 orthogonal straight steps ONLY (no turns, no 0-move, no jumping).
 * - Circle piece: 1 orthogonal step OR 2 steps with a mandatory 90° L-turn (no 2-step straight, no 0-move!).
 * - Mandatory 1 wall placement on an open edge around the moved piece.
 * - 90s turn timer (auto random legal wall on timeout).
 * - R1 3-Player mode: 1 Square + 1 Circle each (snake draft), 1-time Wall Break power per player!
 * - R2 2-Player Final mode: 2 Square + 2 Circle each (Circles pre-placed symmetrically at (1,1),(5,5) vs (1,5),(5,1);
 *   Squares snake-drafted), 0 Wall Breaks!
 * - Endgame: immediately when NO connected room contains pieces from >=2 different players.
 * - Scoring: sum of sizes of exclusive rooms containing your pieces (counted once per room).
 * - Tiebreaker: largest single exclusive room size!
 */

export const BOARD_SIZE = 7;

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function makeEmptyWalls() {
  return {
    hWalls: Array.from({ length: BOARD_SIZE - 1 }, () => Array(BOARD_SIZE).fill(null)),
    vWalls: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE - 1).fill(null)),
  };
}

export function edgeBetween(r1, c1, r2, c2) {
  if (r1 === r2 && Math.abs(c1 - c2) === 1) {
    return { orientation: 'v', r: r1, c: Math.min(c1, c2) };
  }
  if (c1 === c2 && Math.abs(r1 - r2) === 1) {
    return { orientation: 'h', r: Math.min(r1, r2), c: c1 };
  }
  return null;
}

export function getWall(state, edge) {
  if (!edge) return 'BORDER';
  if (edge.orientation === 'h') {
    if (edge.r < 0 || edge.r >= BOARD_SIZE - 1 || edge.c < 0 || edge.c >= BOARD_SIZE) return 'BORDER';
    return state.hWalls[edge.r][edge.c];
  }
  if (edge.r < 0 || edge.r >= BOARD_SIZE || edge.c < 0 || edge.c >= BOARD_SIZE - 1) return 'BORDER';
  return state.vWalls[edge.r][edge.c];
}

function setWall(state, edge, val) {
  if (edge.orientation === 'h') state.hWalls[edge.r][edge.c] = val;
  else state.vWalls[edge.r][edge.c] = val;
}

function buildOccupancy(pieces) {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (const p of pieces) {
    grid[p.r][p.c] = p;
  }
  return grid;
}

/**
 * Return all open internal edges adjacent to cell (r, c).
 */
export function getLegalWallsAround(state, r, c) {
  const edges = [];
  for (const { dr, dc } of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const e = edgeBetween(r, c, nr, nc);
    if (getWall(state, e) === null) {
      edges.push(e);
    }
  }
  return edges;
}

/**
 * Compute all legal moves for a given piece.
 * Returns array of { toR, toC, breakEdge: { orientation, r, c } | null }.
 * Strictly enforces:
 * - NO 0-move allowed
 * - Square: 1 or 2 straight orthogonal steps
 * - Circle: 1 orthogonal step OR 2 steps with mandatory 90° L-turn
 * - Optional Wall Break (breaks at most 1 internal wall along the path)
 */
export function getLegalMovesForPiece(state, piece, allowWallBreak = false) {
  const occ = buildOccupancy(state.pieces);
  const normalMap = new Map();
  const breakMap = new Map();

  const recordMove = (toR, toC, breakEdge) => {
    const key = `${toR},${toC}`;
    if (!breakEdge) {
      normalMap.set(key, { toR, toC, breakEdge: null });
    } else if (allowWallBreak && !normalMap.has(key) && !breakMap.has(key)) {
      breakMap.set(key, { toR, toC, breakEdge });
    }
  };

  if (piece.shape === 'square') {
    for (const { dr, dc } of DIRS) {
      // 1-step straight
      const r1 = piece.r + dr;
      const c1 = piece.c + dc;
      if (!inBounds(r1, c1) || occ[r1][c1]) continue;

      const e1 = edgeBetween(piece.r, piece.c, r1, c1);
      const w1 = getWall(state, e1) !== null;

      if (!w1) {
        recordMove(r1, c1, null);
      } else if (allowWallBreak) {
        recordMove(r1, c1, e1);
      }

      // 2-step straight (same direction ONLY!)
      const r2 = piece.r + 2 * dr;
      const c2 = piece.c + 2 * dc;
      if (!inBounds(r2, c2) || occ[r2][c2]) continue;

      const e2 = edgeBetween(r1, c1, r2, c2);
      const w2 = getWall(state, e2) !== null;

      if (!w1 && !w2) {
        recordMove(r2, c2, null);
      } else if (allowWallBreak && (w1 ? 1 : 0) + (w2 ? 1 : 0) === 1) {
        recordMove(r2, c2, w1 ? e1 : e2);
      }
    }
  } else {
    // Circle piece: 1 orthogonal step OR 2 steps with mandatory 90° L-turn (NEVER 2 straight!)
    for (const { dr: dr1, dc: dc1 } of DIRS) {
      const r1 = piece.r + dr1;
      const c1 = piece.c + dc1;
      if (!inBounds(r1, c1) || occ[r1][c1]) continue;

      const e1 = edgeBetween(piece.r, piece.c, r1, c1);
      const w1 = getWall(state, e1) !== null;

      if (!w1) {
        recordMove(r1, c1, null);
      } else if (allowWallBreak) {
        recordMove(r1, c1, e1);
      }

      // 90° perpendicular turns ONLY!
      const perpDirs = dr1 !== 0 ? [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }] : [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }];
      for (const { dr: dr2, dc: dc2 } of perpDirs) {
        const r2 = r1 + dr2;
        const c2 = c1 + dc2;
        if (!inBounds(r2, c2) || occ[r2][c2]) continue;

        const e2 = edgeBetween(r1, c1, r2, c2);
        const w2 = getWall(state, e2) !== null;

        if (!w1 && !w2) {
          recordMove(r2, c2, null);
        } else if (allowWallBreak && (w1 ? 1 : 0) + (w2 ? 1 : 0) === 1) {
          recordMove(r2, c2, w1 ? e1 : e2);
        }
      }
    }
  }

  // Merge: normal moves take precedence over wall-break moves to the same destination
  const result = [...normalMap.values()];
  for (const [k, mv] of breakMap.entries()) {
    if (!normalMap.has(k)) result.push(mv);
  }
  return result;
}

/**
 * Flood-fill territory analysis across the 7x7 board.
 */
export function analyzeTerritories(state) {
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
  const occ = buildOccupancy(state.pieces);
  const rooms = [];
  const cellToRoomId = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(-1));

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (visited[r][c]) continue;
      const roomId = rooms.length;
      const queue = [[r, c]];
      visited[r][c] = true;
      const cells = [];
      const ownerSet = new Set();

      while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        cells.push([cr, cc]);
        cellToRoomId[cr][cc] = roomId;
        if (occ[cr][cc]) ownerSet.add(occ[cr][cc].seatId);

        for (const { dr, dc } of DIRS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (!inBounds(nr, nc) || visited[nr][nc]) continue;
          const e = edgeBetween(cr, cc, nr, nc);
          if (getWall(state, e) !== null) continue;
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }

      const owners = [...ownerSet];
      rooms.push({
        id: roomId,
        cells,
        size: cells.length,
        owners,
        sealedOwner: owners.length === 1 ? owners[0] : null,
        isContested: owners.length >= 2,
      });
    }
  }

  const scores = {};
  const largestRoom = {};
  for (const p of state.players) {
    scores[p.seatId] = 0;
    largestRoom[p.seatId] = 0;
  }

  let anyContested = false;
  for (const room of rooms) {
    if (room.isContested) anyContested = true;
    if (room.sealedOwner) {
      scores[room.sealedOwner] = (scores[room.sealedOwner] || 0) + room.size;
      if (room.size > (largestRoom[room.sealedOwner] || 0)) {
        largestRoom[room.sealedOwner] = room.size;
      }
    }
  }

  return {
    rooms,
    cellToRoomId,
    scores,
    largestRoom,
    isAllSeparated: !anyContested,
  };
}

function playerHasAnyLegalMove(state, seatId) {
  const player = state.players.find((p) => p.seatId === seatId);
  const canBreak = (player?.wallBreaksLeft || 0) > 0;
  const myPieces = state.pieces.filter((pc) => pc.seatId === seatId);
  for (const pc of myPieces) {
    if (getLegalMovesForPiece(state, pc, canBreak).length > 0) return true;
  }
  return false;
}

function advancePlayTurn(state, events) {
  // Check flood-fill separation endgame first!
  const analysis = analyzeTerritories(state);
  if (analysis.isAllSeparated) {
    state.phase = 'ended';
    state.subphase = 'done';
    state.currentTurnSeatId = null;
    state.movedPieceId = null;
    state.history.push({
      type: 'END',
      zh: '🏁 所有阵营棋子已完全隔离！立即结算封闭领地总面积！',
      en: '🏁 All player pieces are completely separated! Scoring sealed territories!',
      tone: 'normal',
    });
    events.push({ type: 'MATCH_END' });
    return;
  }

  // Find next player with at least one legal move
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    const candidate = state.players[idx];
    if (playerHasAnyLegalMove(state, candidate.seatId)) {
      state.currentTurnIndex = idx;
      state.currentTurnSeatId = candidate.seatId;
      state.subphase = 'move';
      state.movedPieceId = null;
      state.turnNumber += 1;
      return;
    } else {
      state.history.push({
        type: 'SKIP',
        zh: `⚠️ ${candidate.name} 所有棋子均无合法移动步，自动跳过回合！`,
        en: `⚠️ ${candidate.name} has no legal moves — turn skipped!`,
        tone: 'normal',
      });
    }
  }

  // Nobody can move -> immediate endgame
  state.phase = 'ended';
  state.subphase = 'done';
  state.currentTurnSeatId = null;
  state.movedPieceId = null;
  events.push({ type: 'MATCH_END' });
}

// =========================================================================
// Strong Tactical AI Evaluation (Voronoi Territory + Mobility + Terminal)
// =========================================================================

function evaluateBoardForSeat(state, seatId) {
  const analysis = analyzeTerritories(state);

  // Terminal check: exact winning/losing verdict
  if (analysis.isAllSeparated) {
    const myScore = analysis.scores[seatId] || 0;
    const myLargest = analysis.largestRoom[seatId] || 0;
    let bestOppScore = -1;
    let bestOppLargest = -1;
    for (const p of state.players) {
      if (p.seatId === seatId) continue;
      const sc = analysis.scores[p.seatId] || 0;
      const lg = analysis.largestRoom[p.seatId] || 0;
      if (sc > bestOppScore || (sc === bestOppScore && lg > bestOppLargest)) {
        bestOppScore = sc;
        bestOppLargest = lg;
      }
    }
    const diff = myScore - bestOppScore;
    if (diff > 0) return 5000 + diff * 100 + myLargest * 5;
    if (diff < 0) return -5000 + diff * 100;
    return (myLargest - bestOppLargest) * 400;
  }

  // Multi-source BFS Voronoi distance map for all players
  const distBySeat = {};
  for (const p of state.players) {
    const dist = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(99));
    const q = [];
    for (const pc of state.pieces) {
      if (pc.seatId === p.seatId) {
        dist[pc.r][pc.c] = 0;
        q.push([pc.r, pc.c]);
      }
    }
    let head = 0;
    while (head < q.length) {
      const [r, c] = q[head++];
      const d = dist[r][c] + 1;
      for (const { dr, dc } of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc) || dist[nr][nc] <= d) continue;
        const e = edgeBetween(r, c, nr, nc);
        if (getWall(state, e) !== null) continue;
        dist[nr][nc] = d;
        q.push([nr, nc]);
      }
    }
    distBySeat[p.seatId] = dist;
  }

  let score = 0;

  // 1. Sealed exclusive rooms (already locked in!)
  for (const room of analysis.rooms) {
    if (!room.sealedOwner) continue;
    if (room.sealedOwner === seatId) {
      score += room.size * 5.2 + (room.size >= 8 ? 6 : 0);
    } else {
      score -= room.size * 5.0;
    }
  }

  // 2. Voronoi control over contested regions
  const myDist = distBySeat[seatId];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const room = analysis.rooms[analysis.cellToRoomId[r][c]];
      if (!room.isContested) continue;
      const md = myDist[r][c];
      let bestOpp = 99;
      for (const p of state.players) {
        if (p.seatId === seatId) continue;
        if (distBySeat[p.seatId][r][c] < bestOpp) bestOpp = distBySeat[p.seatId][r][c];
      }
      if (md < bestOpp) score += 2.4;
      else if (bestOpp < md) score -= 2.3;
    }
  }

  // 3. Mobility & anti-trap safety
  for (const pc of state.pieces) {
    const moves = getLegalMovesForPiece(state, pc, false).length;
    if (pc.seatId === seatId) {
      score += Math.min(moves, 6) * 0.65;
      if (moves === 0) score -= 6;
    } else {
      score -= Math.min(moves, 6) * 0.5;
      if (moves === 0) score += 7;
    }
  }

  // 4. Value conserving Wall Break if still available
  const me = state.players.find((p) => p.seatId === seatId);
  if (me?.wallBreaksLeft > 0) score += 7.5;

  return score;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx?.options || {};
    const numPlayers = seats.length;
    const isThreePlayer = numPlayers === 3;
    const startingWallBreaks = isThreePlayer ? 1 : opts.bonusWallBreak ? 1 : 0;

    const palette = [
      { color: '#f2d591', bg: 'rgba(242, 213, 145, 0.22)', name: 'Gold' },
      { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.22)', name: 'Cyan' },
      { color: '#ff5868', bg: 'rgba(255, 88, 104, 0.22)', name: 'Crimson' },
    ];

    const players = seats.map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar || '◆',
      isBot: Boolean(s.isBot),
      seatIndex: idx,
      color: palette[idx % palette.length].color,
      territoryBg: palette[idx % palette.length].bg,
      wallBreaksLeft: startingWallBreaks,
    }));

    const pieces = [];
    const setupQueue = [];

    if (isThreePlayer) {
      // R1 3-Player Mode: Snake draft 1 Square + 1 Circle each
      const order = [
        { idx: 0, shape: 'square' },
        { idx: 1, shape: 'square' },
        { idx: 2, shape: 'square' },
        { idx: 2, shape: 'circle' },
        { idx: 1, shape: 'circle' },
        { idx: 0, shape: 'circle' },
      ];
      for (const item of order) {
        setupQueue.push({ seatId: players[item.idx].seatId, shape: item.shape });
      }
    } else {
      // R2 2-Player Final Mode: Pre-placed symmetric Circle pieces + Snake draft 2 Squares each
      pieces.push(
        { id: 'p0-c1', seatId: players[0].seatId, shape: 'circle', r: 1, c: 1 },
        { id: 'p0-c2', seatId: players[0].seatId, shape: 'circle', r: 5, c: 5 },
        { id: 'p1-c1', seatId: players[1].seatId, shape: 'circle', r: 1, c: 5 },
        { id: 'p1-c2', seatId: players[1].seatId, shape: 'circle', r: 5, c: 1 }
      );
      const order = [0, 1, 1, 0];
      for (const idx of order) {
        setupQueue.push({ seatId: players[idx].seatId, shape: 'square' });
      }
    }

    const { hWalls, vWalls } = makeEmptyWalls();

    return {
      phase: 'setup', // 'setup' | 'play' | 'ended'
      subphase: 'setup_place', // 'setup_place' | 'move' | 'place_wall' | 'done'
      modeLabel: isThreePlayer ? 'R1_3P' : 'R2_2P',
      turnDurationMs: Number(opts.turnSeconds) === 45 ? 45000 : 90000,
      turnNumber: 1,
      currentTurnIndex: 0,
      currentTurnSeatId: setupQueue[0].seatId,
      setupQueue,
      setupIndex: 0,
      players,
      pieces,
      hWalls,
      vWalls,
      movedPieceId: null,
      lastWallPlaced: null,
      lastWallBroken: null,
      lastMoveTrace: null, // { fromR, fromC, toR, toC, pieceId }
      history: [
        {
          type: 'START',
          zh: isThreePlayer
            ? 'R1 三人混战开始！请按蛇形顺位摆放 1 方棋 + 1 圆棋。每人拥有 1 次【破墙】特权！'
            : 'R2 双人死亡战开始！双方圆棋已对称就位，请按蛇形顺位摆放 2 枚方棋（无破墙技能）。',
          en: isThreePlayer
            ? 'R1 3-Player Mode! Snake-draft 1 Square + 1 Circle each. Every player has 1 Wall Break!'
            : 'R2 2-Player Final! Symmetric Circles placed — snake-draft your 2 Squares (No Wall Break).',
          tone: 'normal',
        },
      ],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'ended') return { ok: false, reason: 'Match ended' };
    if (seatId !== fullState.currentTurnSeatId) return { ok: false, reason: 'Not your turn' };

    const { type, payload = {} } = action;

    if (fullState.phase === 'setup') {
      if (type !== 'PLACE_SETUP_PIECE') return { ok: false, reason: 'Must place setup piece' };
      const r = Number(payload.r);
      const c = Number(payload.c);
      if (!inBounds(r, c)) return { ok: false, reason: 'Out of bounds' };
      if (fullState.pieces.some((pc) => pc.r === r && pc.c === c)) {
        return { ok: false, reason: 'Cell is already occupied' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'play' && fullState.subphase === 'move') {
      if (type !== 'MOVE_PIECE') return { ok: false, reason: 'Must move one of your pieces first' };
      const piece = fullState.pieces.find((pc) => pc.id === payload.pieceId && pc.seatId === seatId);
      if (!piece) return { ok: false, reason: 'Invalid piece selected' };

      const toR = Number(payload.toR);
      const toC = Number(payload.toC);
      const wantBreak = Boolean(payload.useWallBreak);
      const player = fullState.players.find((p) => p.seatId === seatId);
      if (wantBreak && player.wallBreaksLeft <= 0) {
        return { ok: false, reason: 'No Wall Break charges remaining' };
      }

      const legalMoves = getLegalMovesForPiece(fullState, piece, wantBreak);
      const matched = legalMoves.find((m) => m.toR === toR && m.toC === toC);
      if (!matched) {
        return { ok: false, reason: 'Illegal destination (no 0-move; check Square vs Circle path)' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'play' && fullState.subphase === 'place_wall') {
      if (type !== 'PLACE_WALL') return { ok: false, reason: 'Must place 1 wall around your moved piece' };
      const piece = fullState.pieces.find((pc) => pc.id === fullState.movedPieceId);
      if (!piece) return { ok: false, reason: 'Moved piece missing' };

      const edge = payload.edge;
      if (!edge || (edge.orientation !== 'h' && edge.orientation !== 'v')) {
        return { ok: false, reason: 'Invalid wall edge' };
      }
      const legalEdges = getLegalWallsAround(fullState, piece.r, piece.c);
      const okEdge = legalEdges.some(
        (e) => e.orientation === edge.orientation && e.r === edge.r && e.c === edge.c
      );
      if (!okEdge) {
        return { ok: false, reason: 'Wall must be on an open edge adjacent to your moved piece' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Action not allowed in current phase' };
  },

  applyAction(fullState, seatId, action) {
    const state = cloneState(fullState);
    const events = [];
    const { type, payload = {} } = action;
    const player = state.players.find((p) => p.seatId === seatId);

    if (type === 'PLACE_SETUP_PIECE') {
      const slot = state.setupQueue[state.setupIndex];
      const r = Number(payload.r);
      const c = Number(payload.c);
      const pieceId = `p${player.seatIndex}-${slot.shape[0]}-${state.pieces.length + 1}`;
      state.pieces.push({
        id: pieceId,
        seatId,
        shape: slot.shape,
        r,
        c,
      });

      const colLabel = String.fromCharCode(65 + c);
      const shapeZh = slot.shape === 'square' ? '方棋 ■' : '圆棋 ●';
      const shapeEn = slot.shape === 'square' ? 'Square ■' : 'Circle ●';
      state.history.push({
        type: 'SETUP',
        zh: `${player.name} 在 ${colLabel}${r + 1} 摆放了${shapeZh}。`,
        en: `${player.name} placed ${shapeEn} at ${colLabel}${r + 1}.`,
        tone: 'normal',
      });

      state.setupIndex += 1;
      if (state.setupIndex >= state.setupQueue.length) {
        state.phase = 'play';
        state.subphase = 'move';
        state.currentTurnIndex = 0;
        state.currentTurnSeatId = state.players[0].seatId;
        state.history.push({
          type: 'PLAY_START',
          zh: '⚔️ 布子完成！正式进入移动与筑墙阶段（严禁原地不动）。',
          en: '⚔️ Setup complete! Move & build walls — 0-step moves are forbidden!',
          tone: 'normal',
        });
      } else {
        const nextSlot = state.setupQueue[state.setupIndex];
        state.currentTurnSeatId = nextSlot.seatId;
        state.currentTurnIndex = state.players.findIndex((p) => p.seatId === nextSlot.seatId);
      }

      events.push({ type: 'PLACE_SETUP_PIECE', pieceId, r, c });
      return { state, events };
    }

    if (type === 'MOVE_PIECE') {
      const piece = state.pieces.find((pc) => pc.id === payload.pieceId);
      const wantBreak = Boolean(payload.useWallBreak) && player.wallBreaksLeft > 0;
      const legalMoves = getLegalMovesForPiece(state, piece, wantBreak);
      const move = legalMoves.find((m) => m.toR === Number(payload.toR) && m.toC === Number(payload.toC));

      const fromR = piece.r;
      const fromC = piece.c;
      piece.r = move.toR;
      piece.c = move.toC;
      state.movedPieceId = piece.id;
      state.subphase = 'place_wall';
      state.lastMoveTrace = { fromR, fromC, toR: move.toR, toC: move.toC, pieceId: piece.id };
      state.lastWallBroken = null;

      if (move.breakEdge) {
        setWall(state, move.breakEdge, null);
        player.wallBreaksLeft -= 1;
        state.lastWallBroken = { ...move.breakEdge, turn: state.turnNumber };
        const destStr = `${String.fromCharCode(65 + move.toC)}${move.toR + 1}`;
        state.history.push({
          type: 'WALL_BREAK',
          zh: `💥 ${player.name} 发动【破墙】击碎障碍并移至 ${destStr}！（剩余破墙: ${player.wallBreaksLeft}）`,
          en: `💥 ${player.name} used WALL BREAK and stormed to ${destStr}! (${player.wallBreaksLeft} left)`,
          tone: 'break',
        });
        events.push({ type: 'WALL_BREAK', edge: move.breakEdge });
      } else {
        events.push({ type: 'MOVE_PIECE', pieceId: piece.id, toR: move.toR, toC: move.toC });
      }

      return { state, events };
    }

    if (type === 'PLACE_WALL') {
      const edge = payload.edge;
      setWall(state, edge, seatId);
      state.lastWallPlaced = { ...edge, seatId, turn: state.turnNumber };
      const piece = state.pieces.find((pc) => pc.id === state.movedPieceId);
      const posStr = piece ? `${String.fromCharCode(65 + piece.c)}${piece.r + 1}` : '';

      state.history.push({
        type: 'PLACE_WALL',
        zh: `${player.name} 移至 ${posStr} 并立起一面围墙。`,
        en: `${player.name} moved to ${posStr} and locked a wall.`,
        tone: 'normal',
      });
      events.push({ type: 'PLACE_WALL', edge, seatId });

      advancePlayTurn(state, events);
      return { state, events };
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'setup') {
      return { phaseKey: `setup-${fullState.setupIndex}`, durationMs: 45000 };
    }
    if (fullState.phase === 'play') {
      // Single 90-second turn timer across move + wall placement!
      return {
        phaseKey: `turn-${fullState.turnNumber}-${fullState.currentTurnSeatId}`,
        durationMs: fullState.turnDurationMs || 90000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    const rng = ctx?.rng || Math.random;
    const seatId = fullState.currentTurnSeatId;
    if (!seatId) return null;

    if (fullState.phase === 'setup') {
      const act = this.computeBotAction(fullState, seatId, ctx);
      if (act) return this.applyAction(fullState, seatId, act, ctx);
    }

    if (fullState.phase === 'play' && fullState.subphase === 'place_wall') {
      // Exact show rule: place a random legal wall around the moved piece
      const piece = fullState.pieces.find((pc) => pc.id === fullState.movedPieceId);
      if (piece) {
        const edges = getLegalWallsAround(fullState, piece.r, piece.c);
        if (edges.length > 0) {
          const pick = edges[Math.floor(rng() * edges.length)];
          return this.applyAction(fullState, seatId, { type: 'PLACE_WALL', payload: { edge: pick } }, ctx);
        }
      }
    }

    if (fullState.phase === 'play' && fullState.subphase === 'move') {
      const moveAct = this.computeBotAction(fullState, seatId, ctx);
      if (moveAct) {
        const res1 = this.applyAction(fullState, seatId, moveAct, ctx);
        if (res1?.state && res1.state.subphase === 'place_wall') {
          const piece = res1.state.pieces.find((pc) => pc.id === res1.state.movedPieceId);
          const edges = piece ? getLegalWallsAround(res1.state, piece.r, piece.c) : [];
          if (edges.length > 0) {
            const pick = edges[Math.floor(rng() * edges.length)];
            return this.applyAction(res1.state, seatId, { type: 'PLACE_WALL', payload: { edge: pick } }, ctx);
          }
        }
        return res1;
      }
    }

    return null;
  },

  projectState(fullState) {
    // Wall Go II is pure open-information strategy — attach live flood-fill territory snapshot for UI shading!
    const analysis = analyzeTerritories(fullState);
    return {
      ...fullState,
      territories: {
        rooms: analysis.rooms,
        scores: analysis.scores,
        largestRoom: analysis.largestRoom,
        isAllSeparated: analysis.isAllSeparated,
      },
      history: fullState.history.slice(-18),
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    const rng = ctx?.rng || Math.random;
    if (fullState.phase === 'ended' || fullState.currentTurnSeatId !== botSeatId) return null;

    if (fullState.phase === 'setup') {
      // Tactical setup: prefer inner ring (2..4, 2..4) with distance >= 2 from existing pieces
      const occ = buildOccupancy(fullState.pieces);
      let best = null;
      let bestScore = -Infinity;
      for (let r = 1; r <= 5; r++) {
        for (let c = 1; c <= 5; c++) {
          if (occ[r][c]) continue;
          const centerDist = Math.abs(r - 3) + Math.abs(c - 3);
          let minPieceDist = 99;
          let minOwnDist = 99;
          for (const pc of fullState.pieces) {
            const d = Math.abs(pc.r - r) + Math.abs(pc.c - c);
            if (d < minPieceDist) minPieceDist = d;
            if (pc.seatId === botSeatId && d < minOwnDist) minOwnDist = d;
          }
          let sc = (5 - centerDist) * 3.0 + Math.min(minPieceDist, 4) * 2.2 + rng() * 1.4;
          if (minOwnDist < 3) sc -= 4.5; // spread own pieces out
          if (sc > bestScore) {
            bestScore = sc;
            best = { r, c };
          }
        }
      }
      if (!best) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (!occ[r][c]) {
              best = { r, c };
              break;
            }
          }
          if (best) break;
        }
      }
      return best ? { type: 'PLACE_SETUP_PIECE', payload: best } : null;
    }

    if (fullState.phase === 'play' && fullState.subphase === 'place_wall') {
      const piece = fullState.pieces.find((pc) => pc.id === fullState.movedPieceId);
      if (!piece) return null;
      const edges = getLegalWallsAround(fullState, piece.r, piece.c);
      if (!edges.length) return null;

      let bestEdge = edges[0];
      let bestVal = -Infinity;
      for (const edge of edges) {
        const sim = cloneState(fullState);
        setWall(sim, edge, botSeatId);
        const val = evaluateBoardForSeat(sim, botSeatId) + rng() * 0.35;
        if (val > bestVal) {
          bestVal = val;
          bestEdge = edge;
        }
      }
      return { type: 'PLACE_WALL', payload: { edge: bestEdge } };
    }

    if (fullState.phase === 'play' && fullState.subphase === 'move') {
      const bot = fullState.players.find((p) => p.seatId === botSeatId);
      const canBreak = (bot?.wallBreaksLeft || 0) > 0;
      const myPieces = fullState.pieces.filter((pc) => pc.seatId === botSeatId);

      // Jointly evaluate (piece, destination, best subsequent wall)!
      let bestMove = null;
      let bestScore = -Infinity;

      for (const piece of myPieces) {
        const moves = getLegalMovesForPiece(fullState, piece, canBreak);
        for (const mv of moves) {
          const simAfterMove = cloneState(fullState);
          const simPiece = simAfterMove.pieces.find((p) => p.id === piece.id);
          simPiece.r = mv.toR;
          simPiece.c = mv.toC;
          if (mv.breakEdge) {
            setWall(simAfterMove, mv.breakEdge, null);
            const simBot = simAfterMove.players.find((p) => p.seatId === botSeatId);
            simBot.wallBreaksLeft -= 1;
          }

          const edges = getLegalWallsAround(simAfterMove, mv.toR, mv.toC);
          let bestWallScore = -Infinity;
          for (const edge of edges) {
            setWall(simAfterMove, edge, botSeatId);
            const val = evaluateBoardForSeat(simAfterMove, botSeatId);
            setWall(simAfterMove, edge, null);
            if (val > bestWallScore) bestWallScore = val;
          }

          // Extra caution before spending precious 1-time Wall Break
          const breakPenalty = mv.breakEdge ? 4.5 : 0;
          const totalVal = bestWallScore - breakPenalty + rng() * 0.4;
          if (totalVal > bestScore) {
            bestScore = totalVal;
            bestMove = {
              pieceId: piece.id,
              toR: mv.toR,
              toC: mv.toC,
              useWallBreak: Boolean(mv.breakEdge),
            };
          }
        }
      }

      return bestMove ? { type: 'MOVE_PIECE', payload: bestMove } : null;
    }

    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;

    const analysis = analyzeTerritories(fullState);
    const ranked = fullState.players
      .map((p) => ({
        seatId: p.seatId,
        name: p.name,
        score: analysis.scores[p.seatId] || 0,
        largestRoom: analysis.largestRoom[p.seatId] || 0,
      }))
      .sort((a, b) => b.score - a.score || b.largestRoom - a.largestRoom);

    const best = ranked[0];
    const winners = ranked.filter((r) => r.score === best.score && r.largestRoom === best.largestRoom);

    return {
      winnerSeatIds: winners.map((w) => w.seatId),
      rankings: ranked.map((r) => ({
        seatId: r.seatId,
        score: r.score,
        label: `${r.score} CELLS (Max Room ${r.largestRoom})`,
      })),
      summary: {
        zh: `领地全部隔离结算！${winners.map((w) => w.name).join(' & ')} 以 ${best.score} 格领地（最大单间 ${best.largestRoom} 格）获胜！`,
        en: `Territories sealed! ${winners.map((w) => w.name).join(' & ')} wins with ${best.score} cells (Largest Room: ${best.largestRoom})!`,
      },
    };
  },
};
