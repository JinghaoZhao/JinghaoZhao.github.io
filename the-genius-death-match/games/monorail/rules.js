/**
 * Monorail (모노레일 / 单轨铁路) — Pure Deterministic Rules + Exact Closed-Loop Backtracking Solver
 * Official TV Show Rules: S3E10, S4E6 (Venice Connection)
 * Zero DOM access. Fully JSON-serializable state.
 */

export const INITIAL_SUPPLY = 16;

export const DIRS = {
  N: { dx: 0, dy: -1, opp: 'S' },
  E: { dx: 1, dy: 0, opp: 'W' },
  S: { dx: 0, dy: 1, opp: 'N' },
  W: { dx: -1, dy: 0, opp: 'E' },
};

export const SHAPE_PORTS = {
  H: ['W', 'E'],
  V: ['N', 'S'],
  NE: ['N', 'E'],
  NW: ['N', 'W'],
  SE: ['S', 'E'],
  SW: ['S', 'W'],
};

export const ALL_SHAPES = ['H', 'V', 'NE', 'SE', 'SW', 'NW'];

export function keyOf(x, y) {
  return `${x},${y}`;
}

export function parseKey(k) {
  const [xs, ys] = k.split(',');
  return { x: Number(xs), y: Number(ys) };
}

export function shapeFromTwoDirs(d1, d2) {
  for (const s of ALL_SHAPES) {
    const p = SHAPE_PORTS[s];
    if ((p[0] === d1 && p[1] === d2) || (p[0] === d2 && p[1] === d1)) return s;
  }
  return null;
}

export function rotateShapeCW(shape) {
  const map = { H: 'V', V: 'H', NE: 'SE', SE: 'SW', SW: 'NW', NW: 'NE' };
  return map[shape] || 'H';
}

export function flipShapeKind(shape) {
  if (shape === 'H') return 'NE';
  if (shape === 'V') return 'SE';
  if (shape === 'NE' || shape === 'SW') return 'H';
  return 'V';
}

/**
 * Checks whether ALL tiles on the board form ONE single continuous closed loop
 * with zero stray tiles and zero mismatched/dangling ends.
 */
export function checkClosedLoop(tiles) {
  const keys = Object.keys(tiles);
  const total = keys.length;
  if (total < 6 || total % 2 !== 0) {
    return { isLoop: false, path: null };
  }

  // Verify every tile's 2 ports match an adjacent tile's opposite port
  for (const k of keys) {
    const tile = tiles[k];
    const ports = SHAPE_PORTS[tile.shape];
    if (!ports) return { isLoop: false, path: null };
    const { x, y } = parseKey(k);
    for (const d of ports) {
      const nbKey = keyOf(x + DIRS[d].dx, y + DIRS[d].dy);
      const nb = tiles[nbKey];
      if (!nb) return { isLoop: false, path: null };
      const nbPorts = SHAPE_PORTS[nb.shape];
      if (!nbPorts.includes(DIRS[d].opp)) return { isLoop: false, path: null };
    }
  }

  // Walk from Station (0,0) exiting East -> must visit every tile exactly once and return to (0,0)
  const startKey = '0,0';
  if (!tiles[startKey]) return { isLoop: false, path: null };

  const visited = new Set();
  const path = [];
  let curX = 0;
  let curY = 0;
  let exitDir = 'E';
  let enterDir = 'W';

  for (let step = 0; step < total; step++) {
    const k = keyOf(curX, curY);
    if (visited.has(k)) return { isLoop: false, path: null };
    visited.add(k);
    path.push({ x: curX, y: curY, key: k, enterDir, exitDir, shape: tiles[k].shape });

    const nx = curX + DIRS[exitDir].dx;
    const ny = curY + DIRS[exitDir].dy;
    const nextKey = keyOf(nx, ny);
    const nextTile = tiles[nextKey];
    if (!nextTile) return { isLoop: false, path: null };

    const nextEnter = DIRS[exitDir].opp;
    const ports = SHAPE_PORTS[nextTile.shape];
    if (!ports.includes(nextEnter)) return { isLoop: false, path: null };

    if (step === total - 1) {
      if (nextKey === startKey && nextEnter === 'W') {
        return { isLoop: true, path };
      }
      return { isLoop: false, path: null };
    }

    const nextExit = ports[0] === nextEnter ? ports[1] : ports[0];
    curX = nx;
    curY = ny;
    enterDir = nextEnter;
    exitDir = nextExit;
  }

  return { isLoop: false, path: null };
}

/**
 * Validate a batch of placements for either a normal turn (1..3 collinear contiguous tiles,
 * >=1 orthogonally adjacent to existing board) or Proof Mode (unlimited remaining tiles closing loop).
 */
export function validatePlacements(tiles, remainingTiles, placements, isProofMode = false) {
  if (!Array.isArray(placements) || placements.length === 0) {
    return { ok: false, reason: 'Must place at least 1 tile' };
  }
  if (placements.length > remainingTiles) {
    return { ok: false, reason: 'Not enough tiles left in supply' };
  }
  if (!isProofMode && placements.length > 3) {
    return { ok: false, reason: 'Maximum 3 tiles per turn' };
  }

  const seen = new Set();
  let touchesExisting = false;

  for (const pl of placements) {
    if (!pl || !Number.isInteger(pl.x) || !Number.isInteger(pl.y)) {
      return { ok: false, reason: 'Invalid tile coordinates' };
    }
    if (!SHAPE_PORTS[pl.shape]) {
      return { ok: false, reason: 'Invalid track shape' };
    }
    const k = keyOf(pl.x, pl.y);
    if (tiles[k]) return { ok: false, reason: 'Cell is already occupied' };
    if (seen.has(k)) return { ok: false, reason: 'Duplicate placement coordinate' };
    seen.add(k);

    for (const d of Object.values(DIRS)) {
      if (tiles[keyOf(pl.x + d.dx, pl.y + d.dy)]) {
        touchesExisting = true;
      }
    }
  }

  if (!isProofMode) {
    if (!touchesExisting) {
      return { ok: false, reason: 'At least one tile must be adjacent to the existing board' };
    }
    if (placements.length >= 2) {
      const allSameX = placements.every((p) => p.x === placements[0].x);
      const allSameY = placements.every((p) => p.y === placements[0].y);
      if (!allSameX && !allSameY) {
        return { ok: false, reason: 'Multiple tiles in one turn must be in a straight line' };
      }
      const coords = placements.map((p) => (allSameX ? p.y : p.x)).sort((a, b) => a - b);
      for (let i = 1; i < coords.length; i++) {
        if (coords[i] !== coords[i - 1] + 1) {
          return { ok: false, reason: 'Tiles placed in one turn must be contiguous (no gaps)' };
        }
      }
    }
  }

  return { ok: true };
}

/**
 * Computes all currently legal empty grid cells where the next staged tile may be placed.
 */
export function getLegalNextCells(tiles, remainingTiles, staged, isProofMode = false) {
  const result = new Set();
  if (staged.length >= remainingTiles) return result;
  if (!isProofMode && staged.length >= 3) return result;

  const occupied = new Set(Object.keys(tiles));
  for (const s of staged) occupied.add(keyOf(s.x, s.y));

  if (isProofMode) {
    // Allow placing adjacent to any occupied cell (existing or staged)
    for (const k of occupied) {
      const { x, y } = parseKey(k);
      for (const d of Object.values(DIRS)) {
        const nk = keyOf(x + d.dx, y + d.dy);
        if (!occupied.has(nk)) result.add(nk);
      }
    }
    return result;
  }

  if (staged.length === 0) {
    // Any empty cell adjacent to an existing tile (or within 2 steps of existing tile if planning a line —
    // wait: simpler & cleaner UX is allowing any cell adjacent to existing tiles first, OR extending line)
    for (const k of Object.keys(tiles)) {
      const { x, y } = parseKey(k);
      for (const d of Object.values(DIRS)) {
        const nk = keyOf(x + d.dx, y + d.dy);
        if (!occupied.has(nk)) result.add(nk);
      }
    }
    return result;
  }

  if (staged.length === 1) {
    const s = staged[0];
    for (const d of Object.values(DIRS)) {
      const nk = keyOf(s.x + d.dx, s.y + d.dy);
      if (!occupied.has(nk)) result.add(nk);
    }
    return result;
  }

  // staged.length === 2: must extend along the exact same line at either end
  const sameX = staged[0].x === staged[1].x;
  if (sameX) {
    const x = staged[0].x;
    const ys = staged.map((p) => p.y).sort((a, b) => a - b);
    const k1 = keyOf(x, ys[0] - 1);
    const k2 = keyOf(x, ys[ys.length - 1] + 1);
    if (!occupied.has(k1)) result.add(k1);
    if (!occupied.has(k2)) result.add(k2);
  } else {
    const y = staged[0].y;
    const xs = staged.map((p) => p.x).sort((a, b) => a - b);
    const k1 = keyOf(xs[0] - 1, y);
    const k2 = keyOf(xs[xs.length - 1] + 1, y);
    if (!occupied.has(k1)) result.add(k1);
    if (!occupied.has(k2)) result.add(k2);
  }
  return result;
}

/**
 * Smart auto-orientation helper for UI when user clicks an empty cell (x, y).
 */
export function suggestAutoShape(tiles, staged, x, y, preferredKind = null) {
  const combined = { ...tiles };
  for (const s of staged) combined[keyOf(s.x, s.y)] = { shape: s.shape };

  const incomingDirs = [];
  for (const [dName, d] of Object.entries(DIRS)) {
    const nb = combined[keyOf(x + d.dx, y + d.dy)];
    if (nb && SHAPE_PORTS[nb.shape].includes(d.opp)) {
      incomingDirs.push(dName);
    }
  }

  if (incomingDirs.length === 2) {
    const exact = shapeFromTwoDirs(incomingDirs[0], incomingDirs[1]);
    if (exact) return exact;
  }

  if (incomingDirs.length === 1) {
    const inc = incomingDirs[0];
    const opp = DIRS[inc].opp;
    const straight = shapeFromTwoDirs(inc, opp);
    if (preferredKind === 'straight' && straight) return straight;
    // Prefer straight if straight port doesn't crash into a closed neighbor
    const straightNb = combined[keyOf(x + DIRS[opp].dx, y + DIRS[opp].dy)];
    const straightSafe = !straightNb || SHAPE_PORTS[straightNb.shape].includes(inc);
    if (preferredKind !== 'curve' && straight && straightSafe) return straight;
    // Pick a safe curve
    for (const s of ALL_SHAPES) {
      const p = SHAPE_PORTS[s];
      if (!p.includes(inc) || s === straight) continue;
      const other = p[0] === inc ? p[1] : p[0];
      const nb = combined[keyOf(x + DIRS[other].dx, y + DIRS[other].dy)];
      if (!nb || SHAPE_PORTS[nb.shape].includes(DIRS[other].opp)) return s;
    }
    return straight || 'H';
  }

  return preferredKind === 'curve' ? 'NE' : 'H';
}

// =========================================================================
// Exact Closed-Loop Feasibility & Proof Backtracking Solver
// =========================================================================

/**
 * Analyzes partial board state for structural feasibility, open ends, and premature sub-loops.
 * Returns { valid: boolean, openEnds: Array<{x,y,dir,tx,ty,needDir}>, reqByCell: Map<string, string[]>, prematureCycle: boolean }
 */
function analyzePartialBoard(tiles) {
  const keys = Object.keys(tiles);
  const openEnds = [];
  const reqByCell = new Map();

  for (const k of keys) {
    const tile = tiles[k];
    const ports = SHAPE_PORTS[tile.shape];
    const { x, y } = parseKey(k);
    for (const dir of ports) {
      const tx = x + DIRS[dir].dx;
      const ty = y + DIRS[dir].dy;
      const tk = keyOf(tx, ty);
      const nb = tiles[tk];
      if (nb) {
        if (!SHAPE_PORTS[nb.shape].includes(DIRS[dir].opp)) {
          return { valid: false, openEnds: [], reqByCell, prematureCycle: false };
        }
      } else {
        const needDir = DIRS[dir].opp;
        openEnds.push({ x, y, dir, tx, ty, tk, needDir });
        if (!reqByCell.has(tk)) reqByCell.set(tk, []);
        const arr = reqByCell.get(tk);
        arr.push(needDir);
        if (arr.length > 2) {
          // 3 or 4 tracks pointing into the exact same empty square -> impossible!
          return { valid: false, openEnds: [], reqByCell, prematureCycle: false };
        }
      }
    }
  }

  // Detect any closed cycle that doesn't include ALL placed tiles
  const visited = new Set();
  for (const startKey of keys) {
    if (visited.has(startKey)) continue;
    // BFS/walk component
    const stack = [startKey];
    let compSize = 0;
    let compOpen = 0;
    visited.add(startKey);
    while (stack.length > 0) {
      const ck = stack.pop();
      compSize += 1;
      const { x, y } = parseKey(ck);
      for (const dir of SHAPE_PORTS[tiles[ck].shape]) {
        const tk = keyOf(x + DIRS[dir].dx, y + DIRS[dir].dy);
        if (tiles[tk]) {
          if (!visited.has(tk)) {
            visited.add(tk);
            stack.push(tk);
          }
        } else {
          compOpen += 1;
        }
      }
    }
    if (compOpen === 0 && compSize < keys.length) {
      return { valid: false, openEnds: [], reqByCell, prematureCycle: true };
    }
  }

  return { valid: true, openEnds, reqByCell, prematureCycle: false };
}

/**
 * Exact bounded backtracking solver to prove whether a single closed loop using ALL existing tiles
 * can be completed with at most `remainingTiles` additional tiles.
 * Returns { status: 'SOLVED', solution } | { status: 'IMPOSSIBLE' } | { status: 'UNKNOWN' }
 */
export function findClosingLoop(tiles, remainingTiles, maxNodes = 12000) {
  if (checkClosedLoop(tiles).isLoop) {
    return { status: 'SOLVED', solution: [] };
  }
  const initAnalysis = analyzePartialBoard(tiles);
  if (!initAnalysis.valid) {
    return { status: 'IMPOSSIBLE', solution: null };
  }
  if (remainingTiles === 0) {
    return { status: 'IMPOSSIBLE', solution: null };
  }

  const work = {};
  for (const [k, v] of Object.entries(tiles)) {
    work[k] = { shape: v.shape };
  }
  const added = [];
  let nodes = 0;
  let hitBudget = false;

  function dfs(rem) {
    nodes += 1;
    if (nodes > maxNodes) {
      hitBudget = true;
      return false;
    }

    const analysis = analyzePartialBoard(work);
    if (!analysis.valid) return false;

    const openCount = analysis.openEnds.length;
    if (openCount === 0) {
      return checkClosedLoop(work).isLoop;
    }
    if (rem <= 0) return false;

    // Lower bound: every unique required empty cell must receive a tile
    if (analysis.reqByCell.size > rem) return false;

    // If exactly 2 open ends remain, check Manhattan distance lower bound + parity
    if (openCount === 2) {
      const a = analysis.openEnds[0];
      const b = analysis.openEnds[1];
      if (a.tk !== b.tk) {
        const dist = Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) + 1;
        if (dist > rem) return false;
      }
      // Parity check: if remaining is 1, only possible if a.tk === b.tk
      if (rem === 1 && a.tk !== b.tk) return false;
    }

    // Choose the MOST constrained required empty cell first (MRV heuristic!):
    // Cells with 2 incoming tracks have ONLY 1 forced shape!
    let targetCellKey = null;
    let targetReqs = null;
    for (const [ck, reqs] of analysis.reqByCell.entries()) {
      if (reqs.length === 2) {
        targetCellKey = ck;
        targetReqs = reqs;
        break;
      }
    }
    if (!targetCellKey) {
      // Pick the open end whose cell is closest to another open end (tightens loop fastest)
      let bestDist = Infinity;
      for (const oe of analysis.openEnds) {
        for (const other of analysis.openEnds) {
          if (oe === other) continue;
          const d = Math.abs(oe.tx - other.tx) + Math.abs(oe.ty - other.ty);
          if (d < bestDist) {
            bestDist = d;
            targetCellKey = oe.tk;
            targetReqs = analysis.reqByCell.get(oe.tk);
          }
        }
      }
    }

    const { x, y } = parseKey(targetCellKey);
    let candidateShapes = [];

    if (targetReqs.length === 2) {
      const forced = shapeFromTwoDirs(targetReqs[0], targetReqs[1]);
      if (!forced) return false;
      candidateShapes = [forced];
    } else {
      const reqDir = targetReqs[0];
      // Find nearest OTHER open end to guide move ordering toward closure
      let goalX = 0;
      let goalY = 0;
      let minD = Infinity;
      for (const oe of analysis.openEnds) {
        if (oe.tk === targetCellKey) continue;
        const d = Math.abs(oe.tx - x) + Math.abs(oe.ty - y);
        if (d < minD) {
          minD = d;
          goalX = oe.tx;
          goalY = oe.ty;
        }
      }
      const scored = [];
      for (const sh of ALL_SHAPES) {
        const ports = SHAPE_PORTS[sh];
        if (!ports.includes(reqDir)) continue;
        const outDir = ports[0] === reqDir ? ports[1] : ports[0];
        const nx = x + DIRS[outDir].dx;
        const ny = y + DIRS[outDir].dy;
        const nk = keyOf(nx, ny);
        if (work[nk] && !SHAPE_PORTS[work[nk].shape].includes(DIRS[outDir].opp)) continue;
        const connectsExisting = Boolean(work[nk]);
        const dToGoal = Math.abs(nx - goalX) + Math.abs(ny - goalY);
        scored.push({ sh, priority: (connectsExisting ? -100 : 0) + dToGoal });
      }
      scored.sort((a, b) => a.priority - b.priority);
      candidateShapes = scored.map((s) => s.sh);
    }

    for (const sh of candidateShapes) {
      work[targetCellKey] = { shape: sh };
      added.push({ x, y, shape: sh });
      if (dfs(rem - 1)) return true;
      added.pop();
      delete work[targetCellKey];
      if (hitBudget) return false;
    }

    return false;
  }

  const ok = dfs(remainingTiles);
  if (ok) return { status: 'SOLVED', solution: added.slice() };
  if (hitBudget) return { status: 'UNKNOWN', solution: null };
  return { status: 'IMPOSSIBLE', solution: null };
}

// =========================================================================
// Smart 3-Tier Monorail AI
// =========================================================================

function generateCandidateBatchMoves(tiles, remainingTiles) {
  const analysis = analyzePartialBoard(tiles);
  const candidates = [];

  // 1-tile moves at every required empty cell (extending open ends cleanly!)
  for (const [ck, reqs] of analysis.reqByCell.entries()) {
    const { x, y } = parseKey(ck);
    for (const sh of ALL_SHAPES) {
      const ports = SHAPE_PORTS[sh];
      if (!reqs.every((r) => ports.includes(r))) continue;
      // Avoid crashing into existing closed tile side
      let crash = false;
      for (const dir of ports) {
        const nb = tiles[keyOf(x + DIRS[dir].dx, y + DIRS[dir].dy)];
        if (nb && !SHAPE_PORTS[nb.shape].includes(DIRS[dir].opp)) crash = true;
      }
      if (!crash) {
        candidates.push([{ x, y, shape: sh }]);
      }
    }
  }

  // 2-tile and 3-tile collinear extensions from open ends
  if (remainingTiles >= 2) {
    for (const oe of analysis.openEnds) {
      // Straight run of 2 tiles in direction oe.dir, ending straight or turning
      const x1 = oe.tx;
      const y1 = oe.ty;
      const x2 = x1 + DIRS[oe.dir].dx;
      const y2 = y1 + DIRS[oe.dir].dy;
      const k1 = keyOf(x1, y1);
      const k2 = keyOf(x2, y2);
      const straightShape = shapeFromTwoDirs(oe.needDir, oe.dir);
      if (!tiles[k1] && !tiles[k2] && straightShape) {
        for (const sh2 of ALL_SHAPES) {
          if (!SHAPE_PORTS[sh2].includes(oe.needDir)) continue;
          const batch2 = [
            { x: x1, y: y1, shape: straightShape },
            { x: x2, y: y2, shape: sh2 },
          ];
          candidates.push(batch2);

          if (remainingTiles >= 3 && sh2 === straightShape) {
            const x3 = x2 + DIRS[oe.dir].dx;
            const y3 = y2 + DIRS[oe.dir].dy;
            const k3 = keyOf(x3, y3);
            if (!tiles[k3]) {
              for (const sh3 of ALL_SHAPES) {
                if (!SHAPE_PORTS[sh3].includes(oe.needDir)) continue;
                candidates.push([
                  { x: x1, y: y1, shape: straightShape },
                  { x: x2, y: y2, shape: straightShape },
                  { x: x3, y: y3, shape: sh3 },
                ]);
              }
            }
          }
        }
      }
    }
  }

  return candidates;
}

function canCloseInOneTurn(tiles, remainingTiles) {
  const sol = findClosingLoop(tiles, Math.min(3, remainingTiles), 2500);
  if (sol.status !== 'SOLVED' || sol.solution.length === 0 || sol.solution.length > 3) return null;
  const check = validatePlacements(tiles, remainingTiles, sol.solution, false);
  return check.ok ? sol.solution : null;
}

function computeBotDecision(fullState, botSeatId, difficulty, rng) {
  // Proof Mode: Opponent challenged us with "IMPOSSIBLE!"
  if (fullState.phase === 'PROOF_CHALLENGE') {
    if (fullState.proofSeatId !== botSeatId) return null;
    const budget = difficulty === 'easy' ? 1200 : difficulty === 'genius' ? 12000 : 28000;
    const res = findClosingLoop(fullState.tiles, fullState.remainingTiles, budget);
    if (res.status === 'SOLVED' && res.solution.length > 0) {
      return { type: 'SUBMIT_PROOF', payload: { placements: res.solution } };
    }
    return { type: 'CONCEDE_PROOF' };
  }

  if (fullState.phase !== 'PLAY' || fullState.currentTurnSeatId !== botSeatId) return null;

  const placedTracks = INITIAL_SUPPLY - fullState.remainingTiles;

  // 1. Check if board is ALREADY impossible -> Declare IMPOSSIBLE!
  if (placedTracks >= 1) {
    const checkBudget = difficulty === 'easy' ? 400 : difficulty === 'genius' ? 7000 : 16000;
    const solv = findClosingLoop(fullState.tiles, fullState.remainingTiles, checkBudget);
    if (solv.status === 'IMPOSSIBLE') {
      return { type: 'DECLARE_IMPOSSIBLE' };
    }
  }

  // 2. Check if AI can immediately complete the closed loop in 1–3 legal collinear tiles!
  const instantWin = canCloseInOneTurn(fullState.tiles, fullState.remainingTiles);
  if (instantWin) {
    return { type: 'PLACE_TILES', payload: { placements: instantWin } };
  }

  // 3. Evaluate legal candidate moves
  const candidates = generateCandidateBatchMoves(fullState.tiles, fullState.remainingTiles);
  const validMoves = [];

  for (const batch of candidates) {
    if (!validatePlacements(fullState.tiles, fullState.remainingTiles, batch, false).ok) continue;
    const testTiles = { ...fullState.tiles };
    for (const pl of batch) testTiles[keyOf(pl.x, pl.y)] = { shape: pl.shape };
    const nextRem = fullState.remainingTiles - batch.length;

    // Immediate loop win
    if (checkClosedLoop(testTiles).isLoop) {
      return { type: 'PLACE_TILES', payload: { placements: batch } };
    }

    const analysis = analyzePartialBoard(testTiles);
    if (!analysis.valid) continue; // Never self-sabotage into obvious crash

    let score = 0;
    if (difficulty !== 'easy') {
      // Ensure we don't hand opponent an instant 1-turn win!
      const oppWin = canCloseInOneTurn(testTiles, nextRem);
      if (oppWin) {
        score -= 5000;
      } else {
        // Verify board remains solvable so opponent can't immediately call IMPOSSIBLE!
        const check = findClosingLoop(testTiles, nextRem, difficulty === 'grand_final' ? 2000 : 800);
        if (check.status === 'IMPOSSIBLE') {
          score -= 4000;
        } else if (check.status === 'SOLVED') {
          const minNeeded = check.solution.length;
          // Nim/Venice Connection parity gold: leaving 4 tiles to close is a huge tactical position!
          if (minNeeded === 4) score += 260;
          else if (minNeeded >= 5 && minNeeded <= 7) score += 120;
          else score += 40;
        }
      }
    }

    // Prefer clean geometry near center
    const maxCoord = Math.max(...batch.map((p) => Math.abs(p.x) + Math.abs(p.y)));
    score -= maxCoord * 6;
    score += (rng() - 0.5) * (difficulty === 'easy' ? 80 : 16);

    validMoves.push({ batch, score });
    if (validMoves.length >= 28 && difficulty !== 'grand_final') break;
  }

  if (validMoves.length > 0) {
    validMoves.sort((a, b) => b.score - a.score);
    return { type: 'PLACE_TILES', payload: { placements: validMoves[0].batch } };
  }

  // Fallback: if no clean move exists and we can declare impossible, do so; else place 1 legal tile
  if (placedTracks >= 1) {
    return { type: 'DECLARE_IMPOSSIBLE' };
  }
  const legalCells = [...getLegalNextCells(fullState.tiles, fullState.remainingTiles, [], false)];
  if (legalCells.length > 0) {
    const { x, y } = parseKey(legalCells[0]);
    return {
      type: 'PLACE_TILES',
      payload: { placements: [{ x, y, shape: suggestAutoShape(fullState.tiles, [], x, y) }] },
    };
  }
  return null;
}

// =========================================================================
// Public SDK Rules Implementation
// =========================================================================

function seatOwner(state, seatId) {
  const s = state.seats.find((x) => x.seatId === seatId);
  return s ? s.owner : -1;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const cleanSeats = seats.slice(0, 2).map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar,
      isBot: Boolean(s.isBot),
      owner: idx,
    }));
    const first = ctx.rng() < 0.5 ? 0 : 1;

    return {
      seats: cleanSeats,
      phase: 'PLAY', // 'PLAY' | 'PROOF_CHALLENGE' | 'ended'
      round: 1,
      turnOwner: first,
      currentTurnSeatId: cleanSeats[first].seatId,
      phaseLabel: { zh: '铺设轨道', en: 'Lay Track Tiles' },
      remainingTiles: INITIAL_SUPPLY,
      tiles: {
        '0,0': { type: 'station', shape: 'H', placedBy: -1, turnPlaced: 0 },
        '1,0': { type: 'station', shape: 'H', placedBy: -1, turnPlaced: 0 },
      },
      lastBatchKeys: [],
      completedLoopPath: null, // Array<{x,y,enterDir,exitDir,shape}>
      challengerOwner: null,
      proofSeatId: null,
      winnerOwner: null,
      winnerSeatId: null,
      winReason: null, // 'loop_closed' | 'supply_exhausted' | 'impossible_proven_true' | 'impossible_disproven'
      history: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (fullState.phase === 'ended') {
      return { ok: false, reason: 'Match already ended' };
    }
    const owner = seatOwner(fullState, seatId);
    if (owner === -1) return { ok: false, reason: 'Unknown seat' };

    if (fullState.phase === 'PLAY') {
      if (seatId !== fullState.currentTurnSeatId) {
        return { ok: false, reason: 'Not your turn' };
      }
      if (action.type === 'PLACE_TILES') {
        return validatePlacements(fullState.tiles, fullState.remainingTiles, action.payload?.placements, false);
      }
      if (action.type === 'DECLARE_IMPOSSIBLE') {
        if (fullState.remainingTiles >= INITIAL_SUPPLY) {
          return { ok: false, reason: 'Cannot declare Impossible before any track tile is placed' };
        }
        return { ok: true };
      }
      return { ok: false, reason: 'Invalid action for PLAY phase' };
    }

    if (fullState.phase === 'PROOF_CHALLENGE') {
      if (seatId !== fullState.proofSeatId) {
        return { ok: false, reason: 'Waiting for challenged opponent to prove loop' };
      }
      if (action.type === 'CONCEDE_PROOF') {
        return { ok: true };
      }
      if (action.type === 'SUBMIT_PROOF') {
        const placements = action.payload?.placements || [];
        const baseCheck = validatePlacements(fullState.tiles, fullState.remainingTiles, placements, true);
        if (!baseCheck.ok) return baseCheck;
        const merged = { ...fullState.tiles };
        for (const pl of placements) {
          merged[keyOf(pl.x, pl.y)] = { type: 'track', shape: pl.shape, placedBy: owner, turnPlaced: fullState.round };
        }
        if (!checkClosedLoop(merged).isLoop) {
          return { ok: false, reason: 'Proof tiles must complete ONE single valid closed loop!' };
        }
        return { ok: true };
      }
      return { ok: false, reason: 'Invalid action for Proof Mode' };
    }

    return { ok: false, reason: 'Invalid phase' };
  },

  applyAction(fullState, seatId, action) {
    const next = structuredClone(fullState);
    const owner = seatOwner(next, seatId);
    const opp = 1 - owner;
    const events = [];

    if (action.type === 'PLACE_TILES') {
      const placements = action.payload.placements;
      const batchKeys = [];
      for (const pl of placements) {
        const k = keyOf(pl.x, pl.y);
        next.tiles[k] = {
          type: 'track',
          shape: pl.shape,
          placedBy: owner,
          turnPlaced: next.round,
        };
        batchKeys.push(k);
      }
      next.remainingTiles -= placements.length;
      next.lastBatchKeys = batchKeys;
      next.history.push({ round: next.round, owner, action: 'place', count: placements.length });

      const loopCheck = checkClosedLoop(next.tiles);
      if (loopCheck.isLoop) {
        next.completedLoopPath = loopCheck.path;
        next.phase = 'ended';
        next.winnerOwner = owner;
        next.winnerSeatId = next.seats[owner].seatId;
        next.winReason = 'loop_closed';
        next.currentTurnSeatId = null;
        next.phaseLabel = { zh: '环路贯通！', en: 'Loop Completed!' };
        events.push({ type: 'LOOP_CLOSED', owner });
        return { state: next, events };
      }

      if (next.remainingTiles === 0) {
        // All 16 tiles placed without closing a valid single loop -> mover loses!
        next.phase = 'ended';
        next.winnerOwner = opp;
        next.winnerSeatId = next.seats[opp].seatId;
        next.winReason = 'supply_exhausted';
        next.currentTurnSeatId = null;
        next.phaseLabel = { zh: '轨砖耗尽未闭合', en: 'Supply Exhausted' };
        events.push({ type: 'SUPPLY_EXHAUSTED', winnerOwner: opp });
        return { state: next, events };
      }

      next.round += 1;
      next.turnOwner = opp;
      next.currentTurnSeatId = next.seats[opp].seatId;
      events.push({ type: 'TILES_PLACED', owner, count: placements.length });
      return { state: next, events };
    }

    if (action.type === 'DECLARE_IMPOSSIBLE') {
      next.phase = 'PROOF_CHALLENGE';
      next.challengerOwner = owner;
      next.proofSeatId = next.seats[opp].seatId;
      next.turnOwner = opp;
      next.currentTurnSeatId = next.seats[opp].seatId;
      next.phaseLabel = { zh: '“不可能!” 终极证明', en: 'IMPOSSIBLE! Proof Mode' };
      next.history.push({ round: next.round, owner, action: 'impossible' });
      events.push({ type: 'IMPOSSIBLE_DECLARED', challengerOwner: owner });
      return { state: next, events };
    }

    if (action.type === 'SUBMIT_PROOF') {
      const placements = action.payload.placements;
      const batchKeys = [];
      for (const pl of placements) {
        const k = keyOf(pl.x, pl.y);
        next.tiles[k] = {
          type: 'track',
          shape: pl.shape,
          placedBy: owner,
          turnPlaced: next.round,
        };
        batchKeys.push(k);
      }
      next.remainingTiles -= placements.length;
      next.lastBatchKeys = batchKeys;
      const loopCheck = checkClosedLoop(next.tiles);
      next.completedLoopPath = loopCheck.path;
      next.phase = 'ended';
      next.winnerOwner = owner;
      next.winnerSeatId = next.seats[owner].seatId;
      next.winReason = 'impossible_disproven';
      next.currentTurnSeatId = null;
      next.phaseLabel = { zh: '反证成功！环路贯通', en: 'Loop Proven!' };
      events.push({ type: 'PROOF_SUCCEEDED', winnerOwner: owner });
      return { state: next, events };
    }

    if (action.type === 'CONCEDE_PROOF') {
      const winner = next.challengerOwner;
      next.phase = 'ended';
      next.winnerOwner = winner;
      next.winnerSeatId = next.seats[winner].seatId;
      next.winReason = 'impossible_proven_true';
      next.currentTurnSeatId = null;
      next.phaseLabel = { zh: '宣告“不可能”成立！', en: 'IMPOSSIBLE Confirmed!' };
      events.push({ type: 'IMPOSSIBLE_WON', winnerOwner: winner });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState) {
    return fullState;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    return computeBotDecision(fullState, botSeatId, ctx.difficulty || 'genius', ctx.rng);
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended' || fullState.winnerSeatId == null) return null;
    const w = fullState.winnerOwner;
    const l = 1 - w;
    const used = INITIAL_SUPPLY - fullState.remainingTiles;

    const reasonMap = {
      loop_closed: {
        zh: `${fullState.seats[w].name} 落下绝杀轨砖，将全部轨道连成单一闭合环路！`,
        en: `${fullState.seats[w].name} placed the final track tile to complete a single closed monorail loop!`,
      },
      supply_exhausted: {
        zh: `16 块轨砖全部用尽仍未闭合，${fullState.seats[w].name} 赢得对决！`,
        en: `All 16 tiles were exhausted without closing a loop — ${fullState.seats[w].name} wins!`,
      },
      impossible_proven_true: {
        zh: `${fullState.seats[w].name} 精准宣告「不可能!」，对手无法拼出闭合环路，神级预判获胜！`,
        en: `${fullState.seats[w].name} called "IMPOSSIBLE!" and the opponent failed to prove a valid loop!`,
      },
      impossible_disproven: {
        zh: `面对「不可能!」挑战，${fullState.seats[w].name} 强势拼出完整闭合环路，反杀获胜！`,
        en: `Challenged with "IMPOSSIBLE!", ${fullState.seats[w].name} proved a valid closed loop to win!`,
      },
    };

    const summary = reasonMap[fullState.winReason] || reasonMap.loop_closed;

    return {
      winnerSeatIds: [fullState.winnerSeatId],
      rankings: [
        { seatId: fullState.seats[w].seatId, label: `${used}/16 tiles`, score: 1 },
        { seatId: fullState.seats[l].seatId, label: '—', score: 0 },
      ],
      summary,
    };
  },
};
