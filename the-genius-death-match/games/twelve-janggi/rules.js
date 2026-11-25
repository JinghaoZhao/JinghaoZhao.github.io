/**
 * Twelve Janggi (십이장기 / 十二将棋) — Pure Deterministic Rules & Alpha-Beta AI
 * Canonical TV Show Rules: S3E7, S3E12, S4E11 (Best-of-3 micro-chess on 3x4 board)
 * Zero DOM access. Fully JSON-serializable state.
 */

export const ROWS = 4;
export const COLS = 3;

// Direction vectors for owner 0 (bottom -> moving UP, forward is dr = -1).
// For owner 1 (top -> moving DOWN, forward is dr = +1), negate dr.
export const PIECE_DIRS = {
  K: [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ],
  G: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  M: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  P: [[-1, 0]],
  H: [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
              [1, 0],
  ],
};

export const PIECE_META = {
  K: { hanja: '王', ko: '왕', zh: '王', en: 'King', descZh: '八方移动 1 格', descEn: 'Moves 1 square in all 8 directions' },
  G: { hanja: '將', ko: '장', zh: '将', en: 'General', descZh: '前后左右 1 格', descEn: 'Moves 1 square orthogonally' },
  M: { hanja: '相', ko: '상', zh: '相', en: 'Minister', descZh: '斜向四角 1 格', descEn: 'Moves 1 square diagonally' },
  P: { hanja: '子', ko: '자', zh: '子', en: 'Man', descZh: '仅向前 1 格，入敌阵升变为侯', descEn: 'Moves 1 square forward; promotes to Hu in enemy territory' },
  H: { hanja: '侯', ko: '후', zh: '侯', en: 'Feudal Lord', descZh: '除后斜两格外六向移动', descEn: 'Moves 1 square in 6 directions (all except back diagonals)' },
};

export function enemyTerritoryRow(owner) {
  return owner === 0 ? 0 : 3;
}

export function homeTerritoryRow(owner) {
  return owner === 0 ? 3 : 0;
}

export function getPieceDirs(type, owner) {
  const base = PIECE_DIRS[type] || [];
  if (owner === 0) return base;
  return base.map(([dr, dc]) => [-dr, dc]);
}

function createStartingBoard() {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  // Owner 1 (top, facing down): Back-Left (0,2)=M, Back-Center (0,1)=K, Back-Right (0,0)=G, Front-Center (1,1)=P
  board[0][0] = { id: 'p1-G', type: 'G', owner: 1 };
  board[0][1] = { id: 'p1-K', type: 'K', owner: 1 };
  board[0][2] = { id: 'p1-M', type: 'M', owner: 1 };
  board[1][1] = { id: 'p1-P', type: 'P', owner: 1 };
  // Owner 0 (bottom, facing up): Back-Left (3,0)=M, Back-Center (3,1)=K, Back-Right (3,2)=G, Front-Center (2,1)=P
  board[2][1] = { id: 'p0-P', type: 'P', owner: 0 };
  board[3][0] = { id: 'p0-M', type: 'M', owner: 0 };
  board[3][1] = { id: 'p0-K', type: 'K', owner: 0 };
  board[3][2] = { id: 'p0-G', type: 'G', owner: 0 };
  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { id: cell.id, type: cell.type, owner: cell.owner } : null)));
}

function cloneHands(hands) {
  return [hands[0].slice(), hands[1].slice()];
}

function boardSignature(board, hands, turnOwner) {
  let s = `${turnOwner}|`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      s += p ? `${p.owner}${p.type}` : '..';
    }
  }
  const h0 = hands[0].slice().sort().join('');
  const h1 = hands[1].slice().sort().join('');
  return `${s}|${h0}|${h1}`;
}

export function findKing(board, owner) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.owner === owner && p.type === 'K') return { r, c };
    }
  }
  return null;
}

export function isKingInEnemyTerritory(board, owner) {
  const pos = findKing(board, owner);
  return Boolean(pos && pos.r === enemyTerritoryRow(owner));
}

export function getLegalMovesForPiece(board, r, c) {
  const piece = board[r]?.[c];
  if (!piece) return [];
  const moves = [];
  for (const [dr, dc] of getPieceDirs(piece.type, piece.owner)) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    const target = board[nr][nc];
    if (target && target.owner === piece.owner) continue;
    moves.push({ r: nr, c: nc, capture: Boolean(target) });
  }
  return moves;
}

export function getLegalDrops(board, hands, owner, pieceType) {
  if (!hands[owner].includes(pieceType)) return [];
  const forbiddenRow = enemyTerritoryRow(owner);
  const squares = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === forbiddenRow) continue;
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) squares.push({ r, c });
    }
  }
  return squares;
}

function generateAllMoves(board, hands, owner) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.owner !== owner) continue;
      for (const [dr, dc] of getPieceDirs(p.type, owner)) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const t = board[nr][nc];
        if (t && t.owner === owner) continue;
        moves.push({
          kind: 'move',
          fromR: r,
          fromC: c,
          toR: nr,
          toC: nc,
          pieceType: p.type,
          capturedType: t ? t.type : null,
          promotes: p.type === 'P' && nr === enemyTerritoryRow(owner),
        });
      }
    }
  }
  const seenTypes = new Set();
  const forbiddenRow = enemyTerritoryRow(owner);
  for (const pt of hands[owner]) {
    if (seenTypes.has(pt)) continue;
    seenTypes.add(pt);
    for (let r = 0; r < ROWS; r++) {
      if (r === forbiddenRow) continue;
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c]) {
          moves.push({ kind: 'drop', pieceType: pt, toR: r, toC: c, capturedType: null, promotes: false });
        }
      }
    }
  }
  return moves;
}

/**
 * Apply a move on raw board/hands and determine immediate single-game outcome.
 * Returns { board, hands, winnerOwner: null | 0 | 1, winReason: null | 'capture' | 'try', promoted, capturedType }.
 */
function simulateMove(board, hands, owner, move, handIds = null) {
  const nb = cloneBoard(board);
  const nh = cloneHands(hands);
  const nhIds = handIds ? [handIds[0].slice(), handIds[1].slice()] : null;
  const opp = 1 - owner;
  let capturedType = null;
  let capturedId = null;
  let movedId = null;
  let promoted = false;

  if (move.kind === 'move') {
    const piece = nb[move.fromR][move.fromC];
    const target = nb[move.toR][move.toC];
    movedId = piece.id || null;
    nb[move.fromR][move.fromC] = null;
    if (target) {
      capturedType = target.type;
      capturedId = target.id || null;
      if (target.type !== 'K') {
        // Promoted Hu reverts to Man (P) when captured
        nh[owner].push(target.type === 'H' ? 'P' : target.type);
        if (nhIds) nhIds[owner].push(target.id || `cap-${owner}-${nh[owner].length}`);
      }
    }
    let nextType = piece.type;
    if (piece.type === 'P' && move.toR === enemyTerritoryRow(owner)) {
      nextType = 'H';
      promoted = true;
    }
    nb[move.toR][move.toC] = { id: movedId, type: nextType, owner };
  } else {
    const idx = nh[owner].indexOf(move.pieceType);
    if (idx !== -1) {
      nh[owner].splice(idx, 1);
      if (nhIds) {
        movedId = nhIds[owner].splice(idx, 1)[0] || `drop-${owner}-${move.pieceType}`;
      }
    }
    nb[move.toR][move.toC] = { id: movedId, type: move.pieceType, owner };
  }

  // 1. Capture opponent King -> immediate win for mover
  if (capturedType === 'K') {
    return { board: nb, hands: nh, handIds: nhIds, movedId, capturedId, winnerOwner: owner, winReason: 'capture', promoted, capturedType };
  }

  // 2. Try Rule check: if opponent's King was in mover's home territory and survived mover's turn -> opponent wins!
  if (isKingInEnemyTerritory(nb, opp)) {
    return { board: nb, hands: nh, handIds: nhIds, movedId, capturedId, winnerOwner: opp, winReason: 'try', promoted, capturedType };
  }

  return { board: nb, hands: nh, handIds: nhIds, movedId, capturedId, winnerOwner: null, winReason: null, promoted, capturedType };
}

// =========================================================================
// Minimax / Negamax Alpha-Beta AI Engine
// =========================================================================

const BOARD_VAL = { K: 10000, H: 620, G: 500, M: 420, P: 210 };
const HAND_VAL = { G: 550, M: 465, P: 265 };

function evaluatePosition(board, hands, perspectiveOwner) {
  const opp = 1 - perspectiveOwner;
  let score = 0;

  let myKingPos = null;
  let oppKingPos = null;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.owner === perspectiveOwner ? 1 : -1;
      const base = BOARD_VAL[p.type] || 0;
      // Advancement bonus (progress toward enemy territory)
      const adv = p.owner === 0 ? 3 - r : r;
      let positional = 0;
      if (p.type === 'K') {
        positional = adv * 65 + (c === 1 ? 18 : 0);
        if (p.owner === perspectiveOwner) myKingPos = { r, c };
        else oppKingPos = { r, c };
      } else if (p.type === 'P') {
        positional = adv * 38;
      } else if (p.type === 'H') {
        positional = adv * 25 + (c === 1 ? 22 : 0);
      } else {
        positional = adv * 18 + (c === 1 ? 15 : 0);
      }
      score += sign * (base + positional);
    }
  }

  for (const pt of hands[perspectiveOwner]) score += HAND_VAL[pt] || 200;
  for (const pt of hands[opp]) score -= HAND_VAL[pt] || 200;

  // Big threat bonus if King is already in enemy territory (opponent must capture or lose!)
  if (myKingPos && myKingPos.r === enemyTerritoryRow(perspectiveOwner)) {
    score += 420;
  }
  if (oppKingPos && oppKingPos.r === enemyTerritoryRow(opp)) {
    score -= 420;
  }

  return score;
}

function orderMoves(moves, owner) {
  const enemyRow = enemyTerritoryRow(owner);
  return moves.sort((a, b) => {
    const scoreOf = (m) => {
      if (m.capturedType === 'K') return 100000;
      let s = 0;
      if (m.capturedType) s += (BOARD_VAL[m.capturedType] || 200) * 4;
      if (m.promotes) s += 800;
      if (m.pieceType === 'K' && m.toR === enemyRow) s += 900;
      if (m.kind === 'drop') s += 120;
      return s;
    };
    return scoreOf(b) - scoreOf(a);
  });
}

function negamax(board, hands, owner, depth, alpha, beta, ply, tt) {
  const sig = boardSignature(board, hands, owner);
  const cached = tt.get(sig);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 0) return cached.value;
    if (cached.flag === 1 && cached.value >= beta) return cached.value;
    if (cached.flag === 2 && cached.value <= alpha) return cached.value;
  }

  const moves = orderMoves(generateAllMoves(board, hands, owner), owner);
  if (moves.length === 0) {
    return -80000 + ply;
  }

  if (depth <= 0) {
    return evaluatePosition(board, hands, owner);
  }

  const origAlpha = alpha;
  let best = -Infinity;

  for (const m of moves) {
    const sim = simulateMove(board, hands, owner, m);
    let val;
    if (sim.winnerOwner === owner) {
      val = 90000 - ply;
    } else if (sim.winnerOwner === 1 - owner) {
      val = -90000 + ply;
    } else {
      val = -negamax(sim.board, sim.hands, 1 - owner, depth - 1, -beta, -alpha, ply + 1, tt);
    }

    if (val > best) best = val;
    if (val > alpha) alpha = val;
    if (alpha >= beta) break;
  }

  if (tt.size < 45000) {
    let flag = 0;
    if (best <= origAlpha) flag = 2;
    else if (best >= beta) flag = 1;
    tt.set(sig, { depth, value: best, flag });
  }

  return best;
}

function chooseAiMove(fullState, owner, difficulty, rng) {
  const moves = orderMoves(generateAllMoves(fullState.board, fullState.hands, owner), owner);
  if (moves.length === 0) return null;

  // Immediate win check (capture King)
  for (const m of moves) {
    const sim = simulateMove(fullState.board, fullState.hands, owner, m);
    if (sim.winnerOwner === owner) return m;
  }

  const depth = difficulty === 'grand_final' ? 6 : difficulty === 'easy' ? 2 : 4;
  const noise = difficulty === 'easy' ? 170 : difficulty === 'genius' ? 18 : 0;
  const tt = new Map();

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const m of moves) {
    const sim = simulateMove(fullState.board, fullState.hands, owner, m);
    let val;
    if (sim.winnerOwner === owner) {
      val = 90000;
    } else if (sim.winnerOwner === 1 - owner) {
      val = -90000;
    } else {
      val = -negamax(sim.board, sim.hands, 1 - owner, depth - 1, -100000, 100000, 1, tt);
    }

    // Penalize threefold repetition if ahead
    const nextSig = boardSignature(sim.board, sim.hands, 1 - owner);
    if ((fullState.positionCounts[nextSig] || 0) >= 2 && val > 50) {
      val -= 350;
    }

    if (noise > 0) {
      val += (rng() - 0.5) * noise * 2;
    }

    if (val > bestScore + 1e-6) {
      bestScore = val;
      bestMoves = [m];
    } else if (Math.abs(val - bestScore) <= 1e-6) {
      bestMoves.push(m);
    }
  }

  return bestMoves[Math.floor(rng() * bestMoves.length)] || moves[0];
}

// =========================================================================
// Public SDK Rules Implementation
// =========================================================================

function startFreshGameFields(seats, firstMoverIdx, gameNumber) {
  const board = createStartingBoard();
  const hands = [[], []];
  const handIds = [[], []];
  const sig = boardSignature(board, hands, firstMoverIdx);
  return {
    board,
    hands,
    handIds,
    gameNumber,
    ply: 0,
    firstMoverIdx,
    currentTurnOwner: firstMoverIdx,
    currentTurnSeatId: seats[firstMoverIdx].seatId,
    positionCounts: { [sig]: 1 },
    tryWarningOwner: null, // 0 or 1 if that owner's King is inside enemy territory and 1 turn from Try Win
    lastMove: null,
    moveLog: [],
  };
}

function advanceGameOrEndMatch(next, winnerOwner, reason) {
  const winnerSeatId = next.seats[winnerOwner].seatId;
  next.scores[winnerOwner] += 1;
  next.gameHistory.push({
    gameNumber: next.gameNumber,
    winnerOwner,
    winnerSeatId,
    reason,
    ply: next.ply,
  });
  next.lastGameBanner = {
    gameNumber: next.gameNumber,
    winnerOwner,
    winnerSeatId,
    reason,
    scores: next.scores.slice(),
    ts: Date.now(),
  };

  if (next.scores[winnerOwner] >= next.winsToMatch) {
    next.phase = 'ended';
    next.matchWinnerOwner = winnerOwner;
    next.matchWinnerSeatId = winnerSeatId;
    next.currentTurnSeatId = null;
    next.phaseLabel = { zh: '对决终结', en: 'Match Concluded' };
    return;
  }

  // Immediately set up next game in Best-of-3 with alternating first mover
  const nextFirst = 1 - next.firstMoverIdx;
  const fresh = startFreshGameFields(next.seats, nextFirst, next.gameNumber + 1);
  Object.assign(next, fresh);
  next.round = next.gameNumber;
  next.phaseLabel = {
    zh: `第 ${next.gameNumber} 局`,
    en: `Game ${next.gameNumber}`,
  };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const firstMoverIdx = ctx.rng() < 0.5 ? 0 : 1;
    const bestOf = ctx.options?.matchFormat === 'bo1' ? 1 : 3;
    const winsToMatch = bestOf === 1 ? 1 : 2;
    const turnClockSec = ctx.options?.turnClock === 'off' ? 0 : 30;

    const cleanSeats = seats.slice(0, 2).map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar,
      isBot: Boolean(s.isBot),
      owner: idx,
    }));

    const fresh = startFreshGameFields(cleanSeats, firstMoverIdx, 1);

    return {
      seats: cleanSeats,
      bestOf,
      winsToMatch,
      turnClockSec,
      scores: [0, 0],
      replays: 0,
      round: 1,
      phase: 'playing',
      phaseLabel: { zh: '第 1 局', en: 'Game 1' },
      matchWinnerOwner: null,
      matchWinnerSeatId: null,
      gameHistory: [],
      lastGameBanner: null,
      ...fresh,
    };
  },

  validateAction(fullState, seatId, action) {
    if (fullState.phase !== 'playing') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn' };
    }
    const owner = fullState.currentTurnOwner;
    const p = action?.payload || {};

    if (action.type === 'MOVE') {
      const { fromR, fromC, toR, toC } = p;
      if (
        !Number.isInteger(fromR) || !Number.isInteger(fromC) ||
        !Number.isInteger(toR) || !Number.isInteger(toC)
      ) {
        return { ok: false, reason: 'Invalid coordinates' };
      }
      if (fromR < 0 || fromR >= ROWS || fromC < 0 || fromC >= COLS) {
        return { ok: false, reason: 'Origin out of bounds' };
      }
      const piece = fullState.board[fromR][fromC];
      if (!piece || piece.owner !== owner) {
        return { ok: false, reason: 'No movable piece at origin' };
      }
      const legals = getLegalMovesForPiece(fullState.board, fromR, fromC);
      if (!legals.some((m) => m.r === toR && m.c === toC)) {
        return { ok: false, reason: 'Illegal destination square' };
      }
      return { ok: true };
    }

    if (action.type === 'DROP') {
      const { pieceType, toR, toC } = p;
      if (!['G', 'M', 'P'].includes(pieceType)) {
        return { ok: false, reason: 'Invalid drop piece' };
      }
      if (!fullState.hands[owner].includes(pieceType)) {
        return { ok: false, reason: 'Piece not in prisoner tray' };
      }
      if (!Number.isInteger(toR) || !Number.isInteger(toC) || toR < 0 || toR >= ROWS || toC < 0 || toC >= COLS) {
        return { ok: false, reason: 'Drop coordinates out of bounds' };
      }
      if (toR === enemyTerritoryRow(owner)) {
        return { ok: false, reason: 'Cannot drop inside enemy territory' };
      }
      if (fullState.board[toR][toC]) {
        return { ok: false, reason: 'Square is occupied' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action type' };
  },

  applyAction(fullState, seatId, action) {
    const next = structuredClone(fullState);
    const owner = next.currentTurnOwner;
    const opp = 1 - owner;
    const p = action.payload || {};

    const moveObj =
      action.type === 'MOVE'
        ? { kind: 'move', fromR: p.fromR, fromC: p.fromC, toR: p.toR, toC: p.toC }
        : { kind: 'drop', pieceType: p.pieceType, toR: p.toR, toC: p.toC };

    const movedPieceType =
      action.type === 'MOVE'
        ? next.board[p.fromR][p.fromC].type
        : p.pieceType;

    const sim = simulateMove(next.board, next.hands, owner, moveObj, next.handIds || [[], []]);
    next.board = sim.board;
    next.hands = sim.hands;
    if (sim.handIds) next.handIds = sim.handIds;
    next.ply += 1;

    const colNames = ['A', 'B', 'C'];
    const rowNames = ['1', '2', '3', '4'];
    const notation =
      action.type === 'MOVE'
        ? `${PIECE_META[movedPieceType].hanja} ${colNames[p.fromC]}${rowNames[p.fromR]}→${colNames[p.toC]}${rowNames[p.toR]}${sim.promoted ? '★侯' : ''}`
        : `${PIECE_META[movedPieceType].hanja}↓${colNames[p.toC]}${rowNames[p.toR]}`;

    next.lastMove = {
      kind: moveObj.kind,
      owner,
      pieceType: movedPieceType,
      fromR: moveObj.fromR ?? null,
      fromC: moveObj.fromC ?? null,
      toR: moveObj.toR,
      toC: moveObj.toC,
      capturedType: sim.capturedType,
      promoted: sim.promoted,
      notation,
    };
    next.moveLog.push({ ply: next.ply, owner, notation, capturedType: sim.capturedType, promoted: sim.promoted });
    if (next.moveLog.length > 24) next.moveLog.shift();

    const events = [];

    if (sim.winnerOwner !== null) {
      events.push({
        type: sim.winReason === 'try' ? 'TRY_WIN' : 'KING_CAPTURE',
        winnerOwner: sim.winnerOwner,
        winnerSeatId: next.seats[sim.winnerOwner].seatId,
        gameNumber: next.gameNumber,
      });
      advanceGameOrEndMatch(next, sim.winnerOwner, sim.winReason);
      return { state: next, events };
    }

    // Check threefold repetition
    const sig = boardSignature(next.board, next.hands, opp);
    next.positionCounts[sig] = (next.positionCounts[sig] || 0) + 1;
    if (next.positionCounts[sig] >= 3) {
      next.replays += 1;
      next.lastGameBanner = {
        gameNumber: next.gameNumber,
        winnerOwner: null,
        winnerSeatId: null,
        reason: 'repetition',
        scores: next.scores.slice(),
        ts: Date.now(),
      };
      const fresh = startFreshGameFields(next.seats, 1 - next.firstMoverIdx, next.gameNumber);
      Object.assign(next, fresh);
      events.push({ type: 'REPETITION_DRAW', gameNumber: next.gameNumber });
      return { state: next, events };
    }

    // Switch turn
    next.currentTurnOwner = opp;
    next.currentTurnSeatId = next.seats[opp].seatId;
    next.tryWarningOwner = isKingInEnemyTerritory(next.board, owner) ? owner : null;

    events.push({
      type: sim.promoted ? 'PROMOTE' : sim.capturedType ? 'CAPTURE' : action.type === 'DROP' ? 'DROP' : 'MOVE',
      owner,
      tryWarning: next.tryWarningOwner !== null,
    });

    return { state: next, events };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase !== 'playing' || !fullState.turnClockSec) return null;
    return {
      phaseKey: `g${fullState.gameNumber}-r${fullState.replays}-p${fullState.ply}`,
      durationMs: fullState.turnClockSec * 1000,
    };
  },

  onPhaseTimeout(fullState) {
    if (fullState.phase !== 'playing') return null;
    const next = structuredClone(fullState);
    const winnerOwner = 1 - next.currentTurnOwner;
    advanceGameOrEndMatch(next, winnerOwner, 'timeout');
    return {
      state: next,
      events: [{ type: 'TIMEOUT_LOSS', winnerOwner, gameNumber: fullState.gameNumber }],
    };
  },

  projectState(fullState) {
    // 100% perfect-information game
    return fullState;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'playing') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;
    const owner = fullState.currentTurnOwner;
    const chosen = chooseAiMove(fullState, owner, ctx.difficulty || 'genius', ctx.rng);
    if (!chosen) return null;
    if (chosen.kind === 'move') {
      return {
        type: 'MOVE',
        payload: { fromR: chosen.fromR, fromC: chosen.fromC, toR: chosen.toR, toC: chosen.toC },
      };
    }
    return {
      type: 'DROP',
      payload: { pieceType: chosen.pieceType, toR: chosen.toR, toC: chosen.toC },
    };
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended' || fullState.matchWinnerSeatId == null) return null;
    const w = fullState.matchWinnerOwner;
    const l = 1 - w;
    const lastHist = fullState.gameHistory[fullState.gameHistory.length - 1];
    const reasonZh =
      lastHist?.reason === 'try'
        ? '王闯入敌阵挺过一回合（闯阵胜）'
        : lastHist?.reason === 'timeout'
        ? '对手回合超时判负'
        : '精准击杀敌方王棋';
    const reasonEn =
      lastHist?.reason === 'try'
        ? 'King infiltrated enemy territory and survived 1 full turn (Try Rule)'
        : lastHist?.reason === 'timeout'
        ? 'Opponent ran out of turn clock'
        : 'Captured the opponent King';

    return {
      winnerSeatIds: [fullState.matchWinnerSeatId],
      rankings: [
        {
          seatId: fullState.seats[w].seatId,
          label: `${fullState.scores[w]} - ${fullState.scores[l]}`,
          score: fullState.scores[w],
        },
        {
          seatId: fullState.seats[l].seatId,
          label: `${fullState.scores[l]} - ${fullState.scores[w]}`,
          score: fullState.scores[l],
        },
      ],
      summary: {
        zh: `${fullState.seats[w].name} 以 ${fullState.scores[w]}:${fullState.scores[l]} 赢得十二将棋死亡对决（${reasonZh}）！`,
        en: `${fullState.seats[w].name} wins Twelve Janggi ${fullState.scores[w]}–${fullState.scores[l]} (${reasonEn})!`,
      },
    };
  },
};
