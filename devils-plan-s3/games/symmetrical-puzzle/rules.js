/**
 * Exile Match 5: Symmetrical Puzzle (对称拼图 / 대칭 퍼즐)
 * 3 independent crystalline polyomino zones (Blue, Red, Green) on 8x8 temple grids.
 * Deterministic seeded generator partitions guaranteed-symmetrical connected hole-free
 * temple figures into irregular polyominoes. Automatic exact grid reflection math
 * validates Vertical, Horizontal, 4-Way, and Diagonal symmetry in real time!
 */

const GRID = 8;

export const ZONES = [
  { id: 0, color: 'blue', zh: '蓝晶圣台', en: 'Sapphire Altar', hex: '#3b82f6' },
  { id: 1, color: 'red', zh: '红晶圣台', en: 'Ruby Altar', hex: '#ef4444' },
  { id: 2, color: 'green', zh: '绿晶圣台', en: 'Emerald Altar', hex: '#10b981' },
];

// Curated pool of guaranteed 4-connected, hole-free symmetrical temple silhouettes (area 14-18)
const SYMMETRICAL_TEMPLATES = [
  // 1. Temple Chalice (Vertical, 16 cells)
  [
    '11111',
    '01110',
    '00100',
    '01110',
    '11111',
  ],
  // 2. Winged Diamond (4-Way, 17 cells)
  [
    '00100',
    '01110',
    '11111',
    '11111',
    '01110',
    '00100',
  ],
  // 3. Horned Temple Mask (Vertical, 16 cells)
  [
    '10001',
    '11111',
    '11111',
    '01110',
    '00100',
  ],
  // 4. Stepped Pyramid (Vertical, 16 cells)
  [
    '001100',
    '011110',
    '111111',
    '011110',
  ],
  // 5. Twin Obelisk Crown (Vertical, 15 cells)
  [
    '10101',
    '11111',
    '01110',
    '01110',
    '00100',
  ],
  // 6. Sacred Cross Altar (4-Way, 16 cells)
  [
    '0110',
    '1111',
    '1111',
    '1111',
    '0110',
  ],
  // 7. Scarab Crest (Horizontal, 16 cells)
  [
    '011100',
    '111110',
    '111111',
    '111110',
    '011100',
  ],
  // 8. Temple Shield (Vertical, 15 cells)
  [
    '11111',
    '11111',
    '01110',
    '00100',
    '00100',
  ],
  // 9. Lotus Pedestal (Vertical, 17 cells)
  [
    '01010',
    '11111',
    '11111',
    '01110',
    '01110',
  ],
];

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
 * Normalize an array of [r, c] cells so minR=0, minC=0 and sorted deterministically.
 */
export function normalizeCells(cells) {
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/**
 * Transform a piece's baseCells by optional horizontal flip + clockwise rotation (0..3).
 */
export function transformCells(baseCells, rot = 0, flipped = false) {
  let pts = baseCells.map(([r, c]) => [r, flipped ? -c : c]);
  const rSteps = ((rot % 4) + 4) % 4;
  for (let i = 0; i < rSteps; i++) {
    pts = pts.map(([r, c]) => [c, -r]);
  }
  return normalizeCells(pts);
}

function templateToCells(tpl) {
  const cells = [];
  for (let r = 0; r < tpl.length; r++) {
    for (let c = 0; c < tpl[r].length; c++) {
      if (tpl[r][c] === '1') cells.push([r, c]);
    }
  }
  return cells;
}

function is4Connected(cells) {
  if (cells.length <= 1) return true;
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const vis = new Set([`${cells[0][0]},${cells[0][1]}`]);
  const q = [cells[0]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of dirs) {
      const k = `${r + dr},${c + dc}`;
      if (set.has(k) && !vis.has(k)) {
        vis.add(k);
        q.push([r + dr, c + dc]);
      }
    }
  }
  return vis.size === cells.length;
}

/**
 * Partition a connected template cell list into 3 or 4 connected polyomino pieces (size >= 3).
 */
function partitionIntoPieces(templateCells, rng) {
  const total = templateCells.length;
  const numPieces = total >= 16 ? 4 : 3;
  const keyOf = (r, c) => `${r},${c}`;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let attempt = 0; attempt < 60; attempt++) {
    const remaining = new Map(templateCells.map(([r, c]) => [keyOf(r, c), [r, c]]));
    const groups = [];
    let failed = false;

    for (let p = 0; p < numPieces - 1; p++) {
      const leftPieces = numPieces - p;
      const minTarget = 3;
      const maxTarget = Math.min(6, remaining.size - (leftPieces - 1) * 3);
      if (maxTarget < minTarget) {
        failed = true;
        break;
      }
      const targetSize = randInt(rng, minTarget, maxTarget);

      // Start from a random remaining cell on the boundary (fewest remaining neighbors)
      const remArr = [...remaining.values()];
      const scored = remArr.map((cell) => {
        let deg = 0;
        for (const [dr, dc] of dirs) {
          if (remaining.has(keyOf(cell[0] + dr, cell[1] + dc))) deg++;
        }
        return { cell, deg, tie: rng() };
      });
      scored.sort((a, b) => a.deg - b.deg || a.tie - b.tie);
      const start = scored[0].cell;

      const piece = [start];
      const pieceKeys = new Set([keyOf(start[0], start[1])]);
      remaining.delete(keyOf(start[0], start[1]));

      while (piece.length < targetSize) {
        // Find neighbors in remaining
        const frontier = [];
        for (const [r, c] of piece) {
          for (const [dr, dc] of dirs) {
            const k = keyOf(r + dr, c + dc);
            if (remaining.has(k) && !pieceKeys.has(k)) {
              frontier.push(remaining.get(k));
            }
          }
        }
        if (!frontier.length) {
          failed = true;
          break;
        }
        const pick = frontier[randInt(rng, 0, frontier.length - 1)];
        const pk = keyOf(pick[0], pick[1]);
        piece.push(pick);
        pieceKeys.add(pk);
        remaining.delete(pk);
      }

      if (failed || !is4Connected([...remaining.values()])) {
        failed = true;
        break;
      }
      groups.push(piece);
    }

    if (failed) continue;
    const lastGroup = [...remaining.values()];
    if (lastGroup.length < 3 || lastGroup.length > 6 || !is4Connected(lastGroup)) continue;
    groups.push(lastGroup);

    // Center template in 8x8 grid for solution reference
    let maxR = 0, maxC = 0;
    for (const [r, c] of templateCells) {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    const offR = Math.floor((GRID - (maxR + 1)) / 2);
    const offC = Math.floor((GRID - (maxC + 1)) / 2);

    return groups.map((g, idx) => {
      let minR = Infinity, minC = Infinity;
      for (const [r, c] of g) {
        if (r < minR) minR = r;
        if (c < minC) minC = c;
      }
      const norm = normalizeCells(g);
      // Scramble initial tray orientation so player actually rotates/places them
      const scrambleRot = randInt(rng, 0, 3);
      return {
        id: idx,
        label: String(idx + 1),
        baseCells: transformCells(norm, scrambleRot, false),
        _solAnchorR: minR + offR,
        _solAnchorC: minC + offC,
        _solRot: (4 - scrambleRot) % 4,
        _solFlipped: false,
      };
    });
  }

  // Deterministic safe fallback (horizontal strips of >=3 cells)
  const sorted = templateCells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const chunkSize = Math.ceil(sorted.length / 3);
  const chunks = [
    sorted.slice(0, chunkSize),
    sorted.slice(chunkSize, chunkSize * 2),
    sorted.slice(chunkSize * 2),
  ].filter((ch) => ch.length > 0);
  return chunks.map((g, idx) => {
    let minR = Infinity, minC = Infinity;
    for (const [r, c] of g) {
      if (r < minR) minR = r;
      if (c < minC) minC = c;
    }
    return {
      id: idx,
      label: String(idx + 1),
      baseCells: normalizeCells(g),
      _solAnchorR: minR + 1,
      _solAnchorC: minC + 1,
      _solRot: 0,
      _solFlipped: false,
    };
  });
}

function generateZoneSet(rng) {
  const pickedTemplates = shuffle(SYMMETRICAL_TEMPLATES, rng).slice(0, 3);
  return ZONES.map((z, idx) => {
    // Optionally rotate template 90 deg for extra variety
    const rawCells = templateToCells(pickedTemplates[idx]);
    const rot = randInt(rng, 0, 1);
    const cells = transformCells(rawCells, rot, false);
    const pieces = partitionIntoPieces(cells, rng);
    return {
      zoneId: idx,
      color: z.color,
      pieces,
    };
  });
}

/**
 * Evaluate a single zone's placed pieces on its 8x8 grid using exact reflection math.
 * placements: { [pieceId]: { anchorR, anchorC, rot, flipped } }
 */
export function evaluateZone(zoneDef, placements) {
  const occupied = new Map(); // "r,c" -> pieceId
  let placedCount = 0;
  let overlap = false;
  let outOfBounds = false;

  for (const pc of zoneDef.pieces) {
    const pl = placements?.[pc.id];
    if (!pl) continue;
    placedCount++;
    const cells = transformCells(pc.baseCells, pl.rot, pl.flipped);
    for (const [dr, dc] of cells) {
      const r = pl.anchorR + dr;
      const c = pl.anchorC + dc;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) {
        outOfBounds = true;
      } else {
        const k = `${r},${c}`;
        if (occupied.has(k)) overlap = true;
        occupied.set(k, pc.id);
      }
    }
  }

  const allPlaced = placedCount === zoneDef.pieces.length && !overlap && !outOfBounds;
  const cells = [...occupied.keys()].map((k) => k.split(',').map(Number));

  let connected = false;
  let holeFree = false;
  let verticalSym = false;
  let horizontalSym = false;
  let diagMainSym = false;
  let diagAntiSym = false;
  let bbox = null;

  if (allPlaced && cells.length > 0) {
    connected = is4Connected(cells);
    let minR = GRID, maxR = -1, minC = GRID, maxC = -1;
    for (const [r, c] of cells) {
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
    bbox = { minR, maxR, minC, maxC };

    // Hole-free check: BFS from outer border of padded bbox
    const H = maxR - minR + 3;
    const W = maxC - minC + 3;
    const vis = Array.from({ length: H }, () => Array(W).fill(false));
    const q = [[0, 0]];
    vis[0][0] = true;
    let emptyReached = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const [pr, pc] = q.shift();
      emptyReached++;
      for (const [dr, dc] of dirs) {
        const nr = pr + dr, nc = pc + dc;
        if (nr >= 0 && nr < H && nc >= 0 && nc < W && !vis[nr][nc]) {
          const gr = minR + nr - 1;
          const gc = minC + nc - 1;
          if (!occupied.has(`${gr},${gc}`)) {
            vis[nr][nc] = true;
            q.push([nr, nc]);
          }
        }
      }
    }
    holeFree = emptyReached === H * W - cells.length;

    // Exact reflection checks
    verticalSym = cells.every(([r, c]) => occupied.has(`${r},${minC + maxC - c}`));
    horizontalSym = cells.every(([r, c]) => occupied.has(`${minR + maxR - r},${c}`));
    if (maxR - minR === maxC - minC) {
      diagMainSym = cells.every(([r, c]) => occupied.has(`${minR + (c - minC)},${minC + (r - minR)}`));
      diagAntiSym = cells.every(([r, c]) => occupied.has(`${minR + (maxC - c)},${minC + (maxR - r)}`));
    }
  }

  const axes = [];
  if (verticalSym) axes.push('vertical');
  if (horizontalSym) axes.push('horizontal');
  if (!verticalSym && !horizontalSym && diagMainSym) axes.push('diag-main');
  if (!verticalSym && !horizontalSym && diagAntiSym) axes.push('diag-anti');

  const isValidSymmetry = allPlaced && connected && holeFree && axes.length > 0;
  const symmetryLabel = !isValidSymmetry
    ? null
    : verticalSym && horizontalSym
    ? { zh: '四向完全对称', en: '4-WAY SYMMETRY' }
    : verticalSym
    ? { zh: '垂直轴对称', en: 'VERTICAL SYMMETRY' }
    : horizontalSym
    ? { zh: '水平轴对称', en: 'HORIZONTAL SYMMETRY' }
    : { zh: '对角轴对称', en: 'DIAGONAL SYMMETRY' };

  return {
    occupied,
    placedCount,
    totalPieces: zoneDef.pieces.length,
    allPlaced,
    connected,
    holeFree,
    axes,
    bbox,
    isValidSymmetry,
    symmetryLabel,
  };
}

function evaluateAllZones(zones, playerZones) {
  const results = zones.map((z, i) => evaluateZone(z, playerZones[i]));
  const completedCount = results.filter((r) => r.isValidSymmetry).length;
  const totalPieces = results.reduce((s, r) => s + r.totalPieces, 0);
  const placedPieces = results.reduce((s, r) => s + r.placedCount, 0);
  const isSolved = completedCount === 3;
  const progress = isSolved
    ? 100
    : Math.min(95, Math.round(completedCount * 30 + (placedPieces / Math.max(1, totalPieces)) * 18));
  return { results, completedCount, isSolved, progress };
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
    if (total === 1) p.status = 'failed';
    else if (state.finishOrder.length < total - 1) {
      p.status = 'survived';
      p.finishTimeMs = Math.max(1000, (now - state.startedAtMs) + Math.round((100 - p.progress) * 550));
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
    const allowFlip = opts.allowFlip !== false;
    const fastMode = Boolean(opts.fastMode);
    const zones = generateZoneSet(rng);
    const now = Date.now();
    const matchDurationMs = fastMode ? 240000 : 360000;

    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    for (const s of seats) {
      const targetTicks = fastMode ? randInt(rng, 36, 62) : randInt(rng, 58, 102);
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar,
        isBot: Boolean(s.isBot),
        placements: [{}, {}, {}], // per zone: { [pieceId]: { anchorR, anchorC, rot, flipped } }
        completedZones: 0,
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
      allowFlip,
      zones,
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
    if (action.type === 'GIVE_UP') return { ok: true };

    const { type, payload = {} } = action;
    if (type === 'PLACE_PIECE') {
      const { zoneId, pieceId, anchorR, anchorC, rot, flipped } = payload;
      if (![0, 1, 2].includes(zoneId)) return { ok: false, reason: 'Invalid zone' };
      const zDef = fullState.zones[zoneId];
      const pc = zDef.pieces.find((x) => x.id === pieceId);
      if (!pc) return { ok: false, reason: 'Invalid piece' };
      if (!fullState.allowFlip && flipped) return { ok: false, reason: 'Flipping disabled' };

      const cells = transformCells(pc.baseCells, rot || 0, Boolean(flipped));
      // Check bounds and non-overlap against other placed pieces in same zone
      const otherOccupied = new Set();
      for (const other of zDef.pieces) {
        if (other.id === pieceId) continue;
        const opl = p.placements[zoneId][other.id];
        if (!opl) continue;
        for (const [dr, dc] of transformCells(other.baseCells, opl.rot, opl.flipped)) {
          otherOccupied.add(`${opl.anchorR + dr},${opl.anchorC + dc}`);
        }
      }
      for (const [dr, dc] of cells) {
        const r = anchorR + dr;
        const c = anchorC + dc;
        if (r < 0 || r >= GRID || c < 0 || c >= GRID) return { ok: false, reason: 'Out of bounds' };
        if (otherOccupied.has(`${r},${c}`)) return { ok: false, reason: 'Overlaps another piece' };
      }
      return { ok: true };
    }
    if (type === 'REMOVE_PIECE') {
      const { zoneId, pieceId } = payload;
      if (![0, 1, 2].includes(zoneId)) return { ok: false, reason: 'Invalid zone' };
      if (!p.placements[zoneId][pieceId]) return { ok: false, reason: 'Not placed' };
      return { ok: true };
    }
    if (type === 'CLEAR_ZONE') {
      if (![0, 1, 2].includes(payload.zoneId)) return { ok: false, reason: 'Invalid zone' };
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
        p.completedZones = 3;
        p.progress = 100;
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'ALL_SYMMETRICAL', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
        finalizeRemainingIfNeeded(state, now);
      } else {
        p.completedZones = Math.min(2, Math.floor(ratio * 3));
        p.progress = Math.min(95, Math.floor(ratio * 95));
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
      events.push({ type: 'GIVE_UP', seatId, ts: now });
      return { state, events };
    }

    const prevCompleted = p.completedZones;

    if (type === 'PLACE_PIECE') {
      const { zoneId, pieceId, anchorR, anchorC, rot, flipped } = payload;
      p.placements[zoneId][pieceId] = {
        anchorR,
        anchorC,
        rot: ((rot || 0) % 4 + 4) % 4,
        flipped: Boolean(flipped),
      };
    } else if (type === 'REMOVE_PIECE') {
      delete p.placements[payload.zoneId][payload.pieceId];
    } else if (type === 'CLEAR_ZONE') {
      p.placements[payload.zoneId] = {};
    }

    const ev = evaluateAllZones(state.zones, p.placements);
    p.completedZones = ev.completedCount;
    p.progress = ev.progress;

    if (ev.completedCount > prevCompleted) {
      events.push({ type: 'ZONE_SYMMETRICAL', seatId, completedZones: ev.completedCount, ts: now });
    }

    if (ev.isSolved) {
      p.finished = true;
      p.progress = 100;
      p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
      p.status = 'survived';
      state.finishOrder.push(seatId);
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'ALL_SYMMETRICAL', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
      finalizeRemainingIfNeeded(state, now);
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase !== 'playing') return null;
    return { phaseKey: 'symmetrical-puzzle-race', durationMs: fullState.matchDurationMs };
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

    const sanitizedZones = fullState.zones.map((z) => ({
      zoneId: z.zoneId,
      color: z.color,
      pieces: z.pieces.map((pc) => {
        const base = { id: pc.id, label: pc.label, baseCells: pc.baseCells };
        if (ended) {
          base.solution = {
            anchorR: pc._solAnchorR,
            anchorC: pc._solAnchorC,
            rot: pc._solRot,
            flipped: pc._solFlipped,
          };
        }
        return base;
      }),
    }));

    const racers = fullState.seatOrder.map((sid) => {
      const p = fullState.players[sid];
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        completedZones: p.completedZones,
        progress: p.progress,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        status: p.status,
        rank: p.rank,
      };
    });

    return {
      phase: fullState.phase,
      allowFlip: fullState.allowFlip,
      zones: sanitizedZones,
      racers,
      finishOrder: fullState.finishOrder,
      eliminatedSeatId: fullState.eliminatedSeatId,
      myBoard: myPlayer
        ? {
            placements: myPlayer.placements,
            completedZones: myPlayer.completedZones,
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
        ? `3/3 · ${(p.finishTimeMs / 1000).toFixed(1)}s`
        : `${p.completedZones}/3 · ${total === 1 ? 'FAILED' : isElim ? 'ELIMINATED' : 'SURVIVED'}`;
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
            zh: winnerSeatIds.length ? '蓝/红/绿三座对称圣阵全部点亮！你通关了流放地终极拼图。' : '未能拼齐全部 3 个对称图形，点击“查看终局棋盘”可查看参考解法。',
            en: winnerSeatIds.length ? 'All 3 crystalline altars symmetrical! You conquered Exile Match 5.' : 'Symmetrical altars incomplete. Inspect board to reveal reference solution.',
          }
        : {
            zh: elimName ? `对称拼图落幕：前 ${total - 1} 名存活，${elimName} 垫底永久淘汰。` : '对称拼图竞速结束！',
            en: elimName ? `Symmetrical Puzzle concludes: Top ${total - 1} survive; ${elimName} is permanently eliminated.` : 'Symmetrical Puzzle complete!',
          },
    };
  },
};
