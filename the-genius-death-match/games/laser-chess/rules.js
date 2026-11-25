/**
 * Laser Chess (레이저 장기 / 激光象棋) — Exact Optical Raycaster, Rules & Beam-Aware AI
 * Supports:
 *  - Official S2E5 Broadcast 8x8 Arena (10 pieces/side including Beam Splitter!)
 *  - Grand Mirror 8x10 Arena (Classic Khet: Sphinx, Pharaoh, Scarab swap-mirrors, Pyramids, Anubis)
 * Zero DOM access. Fully JSON-serializable state.
 */

// Directions: 0 = N (-1,0), 1 = E (0,1), 2 = S (1,0), 3 = W (0,-1)
export const DR = [-1, 0, 1, 0];
export const DC = [0, 1, 0, -1];
export const OPP = [2, 3, 0, 1];

// Reflection maps for 45-degree double-sided mirrors:
// slash 0 = '\' (NW to SE): N<->W, S<->E
// slash 1 = '/' (SW to NE): N<->E, S<->W
const REFLECT_BACKSLASH = [3, 2, 1, 0];
const REFLECT_SLASH     = [1, 0, 3, 2];

export const PIECE_INFO = {
  laser:    { zh: '激光炮 (Sphinx)',  en: 'Laser Cannon (Sphinx)',  descZh: '固定于角落，可在两个朝内方向间旋转 90°，不可摧毁', descEn: 'Fixed corner emitter; rotates 90° between 2 inward axes; indestructible' },
  king:     { zh: '王 (Pharaoh)',     en: 'King (Pharaoh)',         descZh: '无镜面保护，任何方向被激光击中即败北',               descEn: 'Unshielded monarch; vaporized if struck from any side' },
  splitter: { zh: '分光镜 (Splitter)', en: 'Beam Splitter',         descZh: '45° 半透镜：光束同时直穿并 90° 反射一分为二，不可摧毁', descEn: '45° half-silvered prism: transmits straight AND reflects 90° simultaneously; indestructible' },
  scarab:   { zh: '圣甲虫 (Scarab)',  en: 'Scarab Mirror',          descZh: '双面 45° 镜不可摧毁，可移动、旋转或与相邻三棱镜/盾镜互换位置', descEn: 'Double-sided 45° mirror; indestructible; may swap with adjacent Pyramid/Anubis' },
  triangle: { zh: '三棱镜 (Pyramid)', en: 'Triangle Mirror',        descZh: '单面 45° 镜反射激光 90°，击中背面两直角边即摧毁',      descEn: 'Single-sided 45° mirror reflecting 90°; destroyed if hit on either back face' },
  square:   { zh: '四棱盾 (Anubis)',  en: 'Square Shield',          descZh: '单面正镜阻挡/反射激光，击中其余三侧即摧毁',           descEn: 'Front armored mirror blocks laser safely; destroyed if hit on other 3 sides' },
};

function createS2Classic8x8() {
  const rows = 8;
  const cols = 8;
  const b = Array.from({ length: rows }, () => Array(cols).fill(null));
  let seq = 0;
  const put = (r, c, type, owner, dir) => {
    seq += 1;
    b[r][c] = { id: `p${owner}-${type}-${seq}`, type, owner, dir };
  };

  // Owner 1 (Cyan, Top-Left laser at 0,0) — 10 pieces
  put(0, 0, 'laser',    1, 2); // Fires S (valid: 1=E, 2=S)
  put(0, 4, 'square',   1, 2); // Shield faces S
  put(0, 5, 'king',     1, 2);
  put(0, 6, 'square',   1, 2); // Shield faces S
  put(0, 7, 'triangle', 1, 2); // Mirror faces S & W
  put(2, 3, 'triangle', 1, 1); // Mirror faces E & S
  put(3, 0, 'triangle', 1, 0); // Mirror faces N & E (catches col-0 laser heading S -> shoots E!)
  put(3, 4, 'splitter', 1, 0); // '\' splitter
  put(3, 6, 'triangle', 1, 2); // Mirror faces S & W
  put(4, 2, 'triangle', 1, 0); // Mirror faces N & E

  // Owner 0 (Crimson, Bottom-Right laser at 7,7) — exact 180° rotational mirror (10 pieces)
  put(7, 7, 'laser',    0, 0); // Fires N (valid: 0=N, 3=W)
  put(7, 3, 'square',   0, 0); // Shield faces N
  put(7, 2, 'king',     0, 0);
  put(7, 1, 'square',   0, 0); // Shield faces N
  put(7, 0, 'triangle', 0, 0); // Mirror faces N & E
  put(5, 4, 'triangle', 0, 3); // Mirror faces W & N
  put(4, 7, 'triangle', 0, 2); // Mirror faces S & W (catches col-7 laser heading N -> shoots W!)
  put(4, 3, 'splitter', 0, 0); // '\' splitter
  put(4, 1, 'triangle', 0, 0); // Mirror faces N & E
  put(3, 5, 'triangle', 0, 2); // Mirror faces S & W

  return { rows, cols, board: b };
}

function createGrand8x10() {
  const rows = 8;
  const cols = 10;
  const b = Array.from({ length: rows }, () => Array(cols).fill(null));
  let seq = 0;
  const put = (r, c, type, owner, dir) => {
    seq += 1;
    b[r][c] = { id: `p${owner}-${type}-${seq}`, type, owner, dir };
  };

  // Classic Khet 8x10 Symmetric Formation (13 pieces per side)
  // Owner 1 (Cyan, Top-Left laser at 0,0)
  put(0, 0, 'laser',    1, 2); // Fires S
  put(0, 4, 'square',   1, 2);
  put(0, 5, 'king',     1, 2);
  put(0, 6, 'square',   1, 2);
  put(0, 7, 'triangle', 1, 1); // E & S
  put(1, 2, 'triangle', 1, 2); // S & W
  put(3, 0, 'triangle', 1, 0); // N & E
  put(3, 4, 'scarab',   1, 0); // '\'
  put(3, 5, 'scarab',   1, 1); // '/'
  put(3, 7, 'triangle', 1, 1); // E & S
  put(4, 0, 'triangle', 1, 1); // E & S
  put(4, 7, 'triangle', 1, 0); // N & E
  put(5, 6, 'triangle', 1, 1); // E & S

  // Owner 0 (Crimson, Bottom-Right laser at 7,9) — exact 180° rotational mirror
  put(7, 9, 'laser',    0, 0); // Fires N
  put(7, 5, 'square',   0, 0);
  put(7, 4, 'king',     0, 0);
  put(7, 3, 'square',   0, 0);
  put(7, 2, 'triangle', 0, 3); // W & N
  put(6, 7, 'triangle', 0, 0); // N & E
  put(4, 9, 'triangle', 0, 2); // S & W
  put(4, 5, 'scarab',   0, 0); // '\'
  put(4, 4, 'scarab',   0, 1); // '/'
  put(4, 2, 'triangle', 0, 3); // W & N
  put(3, 9, 'triangle', 0, 3); // W & N
  put(3, 2, 'triangle', 0, 2); // S & W
  put(2, 3, 'triangle', 0, 3); // W & N

  return { rows, cols, board: b };
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { id: p.id, type: p.type, owner: p.owner, dir: p.dir } : null)));
}

export function validLaserDirs(owner) {
  // Owner 0 sits at bottom-right (rows-1, cols-1) -> fires N (0) or W (3)
  // Owner 1 sits at top-left (0, 0) -> fires E (1) or S (2)
  return owner === 0 ? [0, 3] : [1, 2];
}

export function findLaserPos(board, owner) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      if (p && p.type === 'laser' && p.owner === owner) return { r, c, dir: p.dir };
    }
  }
  return null;
}

/**
 * Resolve optical interaction when a beam traveling in `inDir` enters `piece`.
 * Returns { outDirs: number[], effect: 'reflect' | 'split' | 'shield' | 'destroy' }
 */
function interactWithPiece(piece, inDir) {
  if (piece.type === 'laser') {
    return { outDirs: [], effect: 'shield' };
  }
  if (piece.type === 'king') {
    return { outDirs: [], effect: 'destroy' };
  }
  if (piece.type === 'square') {
    // Shield face points in `piece.dir`. Beam traveling OPP[piece.dir] hits the armored mirror front!
    if (inDir === OPP[piece.dir]) {
      return { outDirs: [], effect: 'shield' };
    }
    return { outDirs: [], effect: 'destroy' };
  }
  if (piece.type === 'scarab') {
    const map = piece.dir % 2 === 0 ? REFLECT_BACKSLASH : REFLECT_SLASH;
    return { outDirs: [map[inDir]], effect: 'reflect' };
  }
  if (piece.type === 'splitter') {
    const map = piece.dir % 2 === 0 ? REFLECT_BACKSLASH : REFLECT_SLASH;
    return { outDirs: [inDir, map[inDir]], effect: 'split' };
  }
  if (piece.type === 'triangle') {
    // dir 0: mirror faces N & E (slash '\': S->E, W->N)
    // dir 1: mirror faces E & S (slash '/': W->S, N->E)
    // dir 2: mirror faces S & W (slash '\': N->W, E->S)
    // dir 3: mirror faces W & N (slash '/': E->N, S->W)
    const d = piece.dir;
    if (d === 0) {
      if (inDir === 2) return { outDirs: [1], effect: 'reflect' };
      if (inDir === 3) return { outDirs: [0], effect: 'reflect' };
    } else if (d === 1) {
      if (inDir === 3) return { outDirs: [2], effect: 'reflect' };
      if (inDir === 0) return { outDirs: [1], effect: 'reflect' };
    } else if (d === 2) {
      if (inDir === 0) return { outDirs: [3], effect: 'reflect' };
      if (inDir === 1) return { outDirs: [2], effect: 'reflect' };
    } else if (d === 3) {
      if (inDir === 1) return { outDirs: [0], effect: 'reflect' };
      if (inDir === 2) return { outDirs: [3], effect: 'reflect' };
    }
    return { outDirs: [], effect: 'destroy' };
  }
  return { outDirs: [], effect: 'shield' };
}

/**
 * Full recursive raycaster supporting mirror bounces AND Splitter beam forks!
 * Returns { owner, segments, sparks, destroyed }
 */
export function traceLaser(board, rows, cols, firingOwner) {
  const origin = findLaserPos(board, firingOwner);
  if (!origin) return { owner: firingOwner, segments: [], sparks: [], destroyed: [] };

  const segments = [];
  const sparks = [];
  const destroyedMap = new Map();
  const visitedRays = new Set();

  // Queue items: { r, c, dir, isSplit } where (r,c) is the tile FROM which ray exits in `dir`
  const queue = [{ r: origin.r, c: origin.c, dir: origin.dir, isSplit: false }];
  let safety = 0;

  while (queue.length > 0 && safety < 96) {
    safety += 1;
    const ray = queue.shift();
    const rayKey = `${ray.r},${ray.c},${ray.dir}`;
    if (visitedRays.has(rayKey)) continue;
    visitedRays.add(rayKey);

    let r = ray.r;
    let c = ray.c;
    const dir = ray.dir;

    while (true) {
      const nr = r + DR[dir];
      const nc = c + DC[dir];

      // Off-board exit
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        segments.push({
          r1: ray.r,
          c1: ray.c,
          r2: r + DR[dir] * 0.55,
          c2: c + DC[dir] * 0.55,
          dir,
          isSplit: ray.isSplit,
          exited: true,
        });
        break;
      }

      const hit = board[nr][nc];
      if (!hit) {
        r = nr;
        c = nc;
        continue;
      }

      // Hit a piece at (nr, nc)!
      segments.push({
        r1: ray.r,
        c1: ray.c,
        r2: nr,
        c2: nc,
        dir,
        isSplit: ray.isSplit,
        exited: false,
      });

      const res = interactWithPiece(hit, dir);
      sparks.push({ r: nr, c: nc, kind: res.effect });

      if (res.effect === 'destroy') {
        const dk = `${nr},${nc}`;
        if (!destroyedMap.has(dk)) {
          destroyedMap.set(dk, { r: nr, c: nc, piece: { ...hit } });
        }
      } else if (res.outDirs.length > 0) {
        res.outDirs.forEach((od, idx) => {
          queue.push({
            r: nr,
            c: nc,
            dir: od,
            isSplit: ray.isSplit || (res.effect === 'split' && idx > 0),
          });
        });
      }
      break;
    }
  }

  return {
    owner: firingOwner,
    segments,
    sparks,
    destroyed: [...destroyedMap.values()],
  };
}

export function getLegalMovesForPiece(board, rows, cols, r, c) {
  const piece = board[r]?.[c];
  if (!piece || piece.type === 'laser') return [];

  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const target = board[nr][nc];
      if (!target) {
        moves.push({ r: nr, c: nc, kind: 'move' });
      } else if (piece.type === 'scarab' && (target.type === 'triangle' || target.type === 'square')) {
        // Scarab may swap places with an adjacent Pyramid/Triangle or Anubis/Square!
        moves.push({ r: nr, c: nc, kind: 'swap' });
      }
    }
  }
  return moves;
}

export function canRotatePiece(piece) {
  if (!piece) return false;
  if (piece.type === 'king') return false;
  return true;
}

export function getRotatedDir(piece, delta) {
  // delta: +1 (CW) or -1 (CCW)
  if (piece.type === 'laser') {
    const valid = validLaserDirs(piece.owner);
    return piece.dir === valid[0] ? valid[1] : valid[0];
  }
  if (piece.type === 'splitter' || piece.type === 'scarab') {
    return (piece.dir + 1) % 2;
  }
  return (piece.dir + (delta > 0 ? 1 : 3)) % 4;
}

// =========================================================================
// Beam-Aware Alpha-Beta AI
// =========================================================================

const MAT_VAL = { king: 10000, splitter: 520, scarab: 480, triangle: 310, square: 220, laser: 0 };

function applyRawAction(board, rows, cols, owner, act) {
  const nb = cloneBoard(board);
  if (act.type === 'MOVE') {
    const p = nb[act.r][act.c];
    const target = nb[act.nr][act.nc];
    if (target) {
      // Scarab swap
      nb[act.nr][act.nc] = p;
      nb[act.r][act.c] = target;
    } else {
      nb[act.nr][act.nc] = p;
      nb[act.r][act.c] = null;
    }
  } else if (act.type === 'ROTATE') {
    const p = nb[act.r][act.c];
    p.dir = getRotatedDir(p, act.delta);
  }

  const beam = traceLaser(nb, rows, cols, owner);
  let enemyKingHit = false;
  let ownKingHit = false;

  for (const d of beam.destroyed) {
    if (d.piece.type === 'king') {
      if (d.piece.owner === owner) ownKingHit = true;
      else enemyKingHit = true;
    }
    nb[d.r][d.c] = null;
  }

  let winnerOwner = null;
  if (enemyKingHit) winnerOwner = owner; // Shooter wins if enemy King hit (even on double-hit)
  else if (ownKingHit) winnerOwner = 1 - owner;

  return { board: nb, beam, winnerOwner };
}

function generateAllActions(board, rows, cols, owner) {
  const actions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p || p.owner !== owner) continue;

      // Rotations
      if (canRotatePiece(p)) {
        if (p.type === 'laser' || p.type === 'splitter' || p.type === 'scarab') {
          actions.push({ type: 'ROTATE', r, c, delta: 1 });
        } else {
          actions.push({ type: 'ROTATE', r, c, delta: 1 });
          actions.push({ type: 'ROTATE', r, c, delta: -1 });
        }
      }

      // Moves / Swaps
      const moves = getLegalMovesForPiece(board, rows, cols, r, c);
      for (const m of moves) {
        actions.push({ type: 'MOVE', r, c, nr: m.r, nc: m.c });
      }
    }
  }
  return actions;
}

function evaluateBoard(board, rows, cols, perspectiveOwner) {
  let score = 0;
  let myKing = null;
  let oppKing = null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.owner === perspectiveOwner ? 1 : -1;
      score += sign * (MAT_VAL[p.type] || 0);
      if (p.type === 'king') {
        if (p.owner === perspectiveOwner) myKing = { r, c };
        else oppKing = { r, c };
      }
      // Mild central mirror control bonus
      if (p.type === 'triangle' || p.type === 'splitter' || p.type === 'scarab') {
        const centerDist = Math.abs(r - (rows - 1) / 2) + Math.abs(c - (cols - 1) / 2);
        score += sign * Math.max(0, 18 - centerDist * 3);
      }
    }
  }

  // Beam-lane pressure near enemy King!
  if (oppKing) {
    const myBeam = traceLaser(board, rows, cols, perspectiveOwner);
    let minD = 99;
    for (const seg of myBeam.segments) {
      const d1 = Math.abs(seg.r2 - oppKing.r) + Math.abs(seg.c2 - oppKing.c);
      if (d1 < minD) minD = d1;
    }
    score += Math.max(0, 5 - minD) * 14;
  }

  if (myKing) {
    // Shielding around own King
    let guards = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nb = board[myKing.r + dr]?.[myKing.c + dc];
        if (nb && nb.owner === perspectiveOwner && (nb.type === 'square' || nb.type === 'triangle')) {
          guards += 1;
        }
      }
    }
    score += guards * 22;
  }

  return score;
}

function chooseLaserBotAction(fullState, owner, difficulty, rng) {
  const { board, rows, cols } = fullState;
  const opp = 1 - owner;
  const actions = generateAllActions(board, rows, cols, owner);
  if (actions.length === 0) return null;

  const scored1 = [];
  for (const act of actions) {
    const sim = applyRawAction(board, rows, cols, owner, act);
    if (sim.winnerOwner === owner) {
      return act.type === 'MOVE'
        ? { type: 'MOVE', payload: { fromR: act.r, fromC: act.c, toR: act.nr, toC: act.nc } }
        : { type: 'ROTATE', payload: { r: act.r, c: act.c, delta: act.delta } };
    }
    if (sim.winnerOwner === opp) continue; // Never suicide own King!

    let val = evaluateBoard(sim.board, rows, cols, owner);
    // Immediate capture bonus
    for (const d of sim.beam.destroyed) {
      val += d.piece.owner === opp ? (MAT_VAL[d.piece.type] || 200) * 0.45 : -(MAT_VAL[d.piece.type] || 200) * 0.5;
    }
    scored1.push({ act, sim, val });
  }

  if (scored1.length === 0) {
    const a = actions[0];
    return a.type === 'MOVE'
      ? { type: 'MOVE', payload: { fromR: a.r, fromC: a.c, toR: a.nr, toC: a.nc } }
      : { type: 'ROTATE', payload: { r: a.r, c: a.c, delta: a.delta } };
  }

  if (difficulty === 'easy') {
    scored1.sort((a, b) => b.val - a.val);
    const pool = scored1.slice(0, Math.min(5, scored1.length));
    const pick = pool[Math.floor(rng() * pool.length)].act;
    return pick.type === 'MOVE'
      ? { type: 'MOVE', payload: { fromR: pick.r, fromC: pick.c, toR: pick.nr, toC: pick.nc } }
      : { type: 'ROTATE', payload: { r: pick.r, c: pick.c, delta: pick.delta } };
  }

  // 2-Ply Beam-Aware Minimax over top candidate moves (fast & lethal!)
  scored1.sort((a, b) => b.val - a.val);
  const topWidth = difficulty === 'grand_final' ? 28 : 16;
  const candidates = scored1.slice(0, topWidth);

  let bestScore = -Infinity;
  let bestList = [];

  for (const cand of candidates) {
    const oppActs = generateAllActions(cand.sim.board, rows, cols, opp);
    let worstForMe = Infinity;

    for (const oa of oppActs) {
      const sim2 = applyRawAction(cand.sim.board, rows, cols, opp, oa);
      let v2;
      if (sim2.winnerOwner === opp) {
        v2 = -90000;
      } else if (sim2.winnerOwner === owner) {
        v2 = 85000;
      } else {
        v2 = evaluateBoard(sim2.board, rows, cols, owner);
      }
      if (v2 < worstForMe) worstForMe = v2;
      if (worstForMe <= bestScore - 40) break; // Alpha-beta cutoff!
    }

    const jitter = difficulty === 'genius' ? (rng() - 0.5) * 18 : (rng() - 0.5) * 4;
    // Penalize repeating already-visited positions so AI presses for attacks instead of shuffling
    const nextSig = boardHash(cand.sim.board, opp);
    const repCount = fullState.positionCounts?.[nextSig] || 0;
    const repPenalty = repCount >= 2 ? 220 : repCount === 1 ? 65 : 0;
    const finalVal = worstForMe - repPenalty + jitter;

    if (finalVal > bestScore + 1e-6) {
      bestScore = finalVal;
      bestList = [cand.act];
    } else if (Math.abs(finalVal - bestScore) <= 1e-6) {
      bestList.push(cand.act);
    }
  }

  const chosen = bestList[Math.floor(rng() * bestList.length)] || candidates[0].act;
  return chosen.type === 'MOVE'
    ? { type: 'MOVE', payload: { fromR: chosen.r, fromC: chosen.c, toR: chosen.nr, toC: chosen.nc } }
    : { type: 'ROTATE', payload: { r: chosen.r, c: chosen.c, delta: chosen.delta } };
}

// =========================================================================
// Public SDK Rules Implementation
// =========================================================================

function boardHash(board, turnOwner) {
  let s = `${turnOwner}:`;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const p = board[r][c];
      s += p ? `${p.owner}${p.type[0]}${p.dir}` : '.';
    }
  }
  return s;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const arenaMode = ctx.options?.arenaPreset === 'grand_8x10' ? 'grand_8x10' : 's2_broadcast';
    const setup = arenaMode === 'grand_8x10' ? createGrand8x10() : createS2Classic8x8();

    const cleanSeats = seats.slice(0, 2).map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar,
      isBot: Boolean(s.isBot),
      owner: idx,
    }));

    const first = 0; // Crimson moves first
    const sig = boardHash(setup.board, first);

    return {
      seats: cleanSeats,
      arenaMode,
      rows: setup.rows,
      cols: setup.cols,
      board: setup.board,
      phase: 'playing',
      round: 1,
      ply: 0,
      turnsSinceCapture: 0,
      turnOwner: first,
      currentTurnSeatId: cleanSeats[first].seatId,
      phaseLabel: { zh: '光学布阵', en: 'Optical Move' },
      lastAction: null,
      lastBeam: null, // { owner, segments, sparks, destroyed, seq }
      beamSeq: 0,
      capturedBy: [[], []],
      positionCounts: { [sig]: 1 },
      winnerOwner: null, // 0 | 1 | null (null on draw)
      winnerSeatId: null,
      isDraw: false,
      winReason: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (fullState.phase !== 'playing') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn' };
    }
    const owner = fullState.turnOwner;
    const p = action?.payload || {};

    if (action.type === 'MOVE') {
      const { fromR, fromC, toR, toC } = p;
      if (!Number.isInteger(fromR) || !Number.isInteger(fromC) || !Number.isInteger(toR) || !Number.isInteger(toC)) {
        return { ok: false, reason: 'Invalid coordinates' };
      }
      const piece = fullState.board[fromR]?.[fromC];
      if (!piece || piece.owner !== owner) {
        return { ok: false, reason: 'No movable own piece at origin' };
      }
      const legals = getLegalMovesForPiece(fullState.board, fullState.rows, fullState.cols, fromR, fromC);
      if (!legals.some((m) => m.r === toR && m.c === toC)) {
        return { ok: false, reason: 'Illegal destination' };
      }
      return { ok: true };
    }

    if (action.type === 'ROTATE') {
      const { r, c, delta } = p;
      if (!Number.isInteger(r) || !Number.isInteger(c) || (delta !== 1 && delta !== -1)) {
        return { ok: false, reason: 'Invalid rotation parameters' };
      }
      const piece = fullState.board[r]?.[c];
      if (!piece || piece.owner !== owner || !canRotatePiece(piece)) {
        return { ok: false, reason: 'Piece cannot rotate' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action) {
    const next = structuredClone(fullState);
    const owner = next.turnOwner;
    const opp = 1 - owner;
    const p = action.payload || {};

    const rawAct =
      action.type === 'MOVE'
        ? { type: 'MOVE', r: p.fromR, c: p.fromC, nr: p.toR, nc: p.toC }
        : { type: 'ROTATE', r: p.r, c: p.c, delta: p.delta };

    const movedPiece = next.board[rawAct.r][rawAct.c];
    const sim = applyRawAction(next.board, next.rows, next.cols, owner, rawAct);

    next.board = sim.board;
    next.ply += 1;
    next.beamSeq += 1;
    next.lastAction = {
      type: action.type,
      owner,
      pieceType: movedPiece.type,
      fromR: rawAct.r,
      fromC: rawAct.c,
      toR: action.type === 'MOVE' ? rawAct.nr : rawAct.r,
      toC: action.type === 'MOVE' ? rawAct.nc : rawAct.c,
      delta: rawAct.delta || 0,
    };
    next.lastBeam = {
      ...sim.beam,
      seq: next.beamSeq,
    };

    if (sim.beam.destroyed.length > 0) {
      next.turnsSinceCapture = 0;
      for (const d of sim.beam.destroyed) {
        next.capturedBy[owner].push({ type: d.piece.type, owner: d.piece.owner });
      }
    } else {
      next.turnsSinceCapture += 1;
    }

    const events = [];

    if (sim.winnerOwner !== null) {
      next.phase = 'ended';
      next.winnerOwner = sim.winnerOwner;
      next.winnerSeatId = next.seats[sim.winnerOwner].seatId;
      next.currentTurnSeatId = null;
      next.winReason = sim.winnerOwner === owner ? 'king_vaporized' : 'self_destruct';
      next.phaseLabel = { zh: '王棋汽化！', en: 'King Vaporized!' };
      events.push({
        type: 'KING_VAPORIZED',
        winnerOwner: sim.winnerOwner,
        selfDestruct: sim.winnerOwner !== owner,
        destroyedCount: sim.beam.destroyed.length,
      });
      return { state: next, events };
    }

    // Check draw conditions (threefold repetition or 50 quiet turns)
    const sig = boardHash(next.board, opp);
    next.positionCounts[sig] = (next.positionCounts[sig] || 0) + 1;
    if (next.positionCounts[sig] >= 3 || next.turnsSinceCapture >= 50) {
      next.phase = 'ended';
      next.isDraw = true;
      next.winnerOwner = null;
      next.winnerSeatId = null;
      next.currentTurnSeatId = null;
      next.winReason = next.turnsSinceCapture >= 50 ? '50_move_draw' : 'repetition_draw';
      next.phaseLabel = { zh: '和棋', en: 'Draw' };
      events.push({ type: 'DRAW' });
      return { state: next, events };
    }

    next.turnOwner = opp;
    next.currentTurnSeatId = next.seats[opp].seatId;
    if (opp === 0) next.round += 1;

    events.push({
      type: sim.beam.destroyed.length > 0 ? 'LASER_DESTROY' : 'LASER_FIRE',
      owner,
      destroyedCount: sim.beam.destroyed.length,
      bounces: sim.beam.sparks.length,
    });

    return { state: next, events };
  },

  projectState(fullState) {
    return fullState;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'playing') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;
    return chooseLaserBotAction(fullState, fullState.turnOwner, ctx.difficulty || 'genius', ctx.rng);
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;
    if (fullState.isDraw) {
      return {
        winnerSeatIds: [],
        rankings: fullState.seats.map((s) => ({ seatId: s.seatId, label: 'DRAW', score: 0 })),
        summary: {
          zh: '双方僵持触发重复局面 / 50 回合无毁伤和棋！',
          en: 'Match ended in a tactical draw (repetition or 50-move quiet rule).',
        },
      };
    }

    const w = fullState.winnerOwner;
    const l = 1 - w;
    const selfHit = fullState.winReason === 'self_destruct';

    return {
      winnerSeatIds: [fullState.winnerSeatId],
      rankings: [
        { seatId: fullState.seats[w].seatId, label: `${fullState.capturedBy[w].length} hits`, score: 1 },
        { seatId: fullState.seats[l].seatId, label: `${fullState.capturedBy[l].length} hits`, score: 0 },
      ],
      summary: {
        zh: selfHit
          ? `${fullState.seats[l].name} 激光误击己方王棋！${fullState.seats[w].name} 赢得激光象棋死亡对决！`
          : `${fullState.seats[w].name} 精妙布局折射激光，瞬间汽化敌方王棋赢得对决！`,
        en: selfHit
          ? `${fullState.seats[l].name}'s own laser vaporized their King! ${fullState.seats[w].name} wins Laser Chess!`
          : `${fullState.seats[w].name} routed a lethal laser reflection straight into the enemy King!`,
      },
    };
  },
};
