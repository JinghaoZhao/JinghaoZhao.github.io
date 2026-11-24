/**
 * Game 01d: Lay the Grass (铺草坪 / 잔디 깔기)
 * Exact 114-cell park board + 7 polyomino tiles {3,4,6,7,9,11,13}
 * Low-score-first draft order · Smallest-to-largest placement order · 90° rotation ONLY (NO flip!)
 */

export const BOARD_ROWS = 10;
export const BOARD_COLS = 12;

export const PARK_MAPS = {
  classic: {
    name: { zh: '经典雕塑公园 (114格)', en: 'Classic Sculpture Park (114 Cells)' },
    obstacles: [[2, 3], [2, 8], [4, 5], [5, 6], [7, 3], [7, 8]], // 120 - 6 = 114
  },
  courtyard: {
    name: { zh: '双泉庭院公园 (114格)', en: 'Twin-Fountain Courtyard (114 Cells)' },
    obstacles: [[1, 1], [1, 10], [4, 5], [4, 6], [8, 1], [8, 10]], // 120 - 6 = 114
  },
};

// All 7 Devil's Plan S3 polyominoes: exact area === tileId, strictly 4-connected
export const TILES = {
  3:  { id: 3,  cells: [[0,0],[1,0],[1,1]] },
  4:  { id: 4,  cells: [[0,0],[0,1],[0,2],[1,1]] },
  6:  { id: 6,  cells: [[0,0],[0,1],[0,2],[1,1],[1,2],[2,1]] },
  7:  { id: 7,  cells: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,1],[2,2]] },
  9:  { id: 9,  cells: [[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[2,0],[2,2],[3,2]] },
  11: { id: 11, cells: [[0,0],[0,1],[0,2],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[3,1],[3,3]] },
  13: { id: 13, cells: [[0,1],[0,2],[0,3],[1,0],[1,1],[1,3],[1,4],[2,0],[2,2],[2,3],[3,0],[3,1],[3,2]] },
};

export const TILE_IDS = [3, 4, 6, 7, 9, 11, 13];

export const PLAYER_TURF_COLORS = [
  '#10b981', '#34d399', '#059669', '#22c55e', '#14b8a6', '#84cc16',
  '#06b6d4', '#16a34a', '#2dd4bf', '#4ade80', '#0d9488', '#65a30d',
  '#38bdf8', '#a3e635', '#047857', '#15803d',
];

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Rotate polyomino clockwise by `rot` * 90° (NO mirror flip ever!).
 */
export function rotateTileCells(tileId, rot = 0) {
  const base = TILES[tileId]?.cells;
  if (!base) return [];
  let pts = base.map(([r, c]) => [r, c]);
  const turns = ((rot % 4) + 4) % 4;
  for (let t = 0; t < turns; t++) {
    pts = pts.map(([r, c]) => [c, -r]);
  }
  const minR = Math.min(...pts.map(([r]) => r));
  const minC = Math.min(...pts.map(([, c]) => c));
  return pts.map(([r, c]) => [r - minR, c - minC]);
}

export function canPlaceTile(board, tileId, anchorR, anchorC, rot) {
  const cells = rotateTileCells(tileId, rot);
  if (!cells.length) return false;
  for (const [dr, dc] of cells) {
    const r = anchorR + dr;
    const c = anchorC + dc;
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

export function findAllValidPlacements(board, tileId) {
  const valid = [];
  const seenSig = new Set();
  for (let rot = 0; rot < 4; rot++) {
    const cells = rotateTileCells(tileId, rot);
    const maxDr = Math.max(...cells.map(([r]) => r));
    const maxDc = Math.max(...cells.map(([, c]) => c));
    const shapeSig = cells.map(([r, c]) => `${r},${c}`).sort().join('|');
    if (seenSig.has(shapeSig)) continue;
    seenSig.add(shapeSig);

    for (let r = 0; r <= BOARD_ROWS - 1 - maxDr; r++) {
      for (let c = 0; c <= BOARD_COLS - 1 - maxDc; c++) {
        let ok = true;
        for (const [dr, dc] of cells) {
          if (board[r + dr][c + dc] !== null) {
            ok = false;
            break;
          }
        }
        if (ok) valid.push({ r, c, rot });
      }
    }
  }
  return valid;
}

function createParkBoard(mapKey) {
  const map = PARK_MAPS[mapKey] || PARK_MAPS.classic;
  const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  for (const [r, c] of map.obstacles) {
    board[r][c] = 'OBSTACLE';
  }
  return board;
}

function initRound(state, roundIndex) {
  state.round = roundIndex + 1;
  state.phase = 'draft'; // 'draft' -> 'place' -> 'round_end' -> 'finished'
  state.board = createParkBoard(state.options.boardMap);
  state.chosenTiles = {}; // seatId -> tileId
  state.placementStatus = {}; // seatId -> 'pending' | 'placed' | 'blocked'
  state.placements = []; // { seatId, tileId, r, c, rot, cells }

  // Draft Order: LOWEST total score first; ties broken by highest Priority Rank (1 is best)
  state.draftOrder = [...state.seats]
    .sort((a, b) => {
      const ds = (state.scores[a.seatId] || 0) - (state.scores[b.seatId] || 0);
      if (ds !== 0) return ds;
      return state.priorityRank[a.seatId] - state.priorityRank[b.seatId];
    })
    .map((s) => s.seatId);

  state.draftCursor = 0;
  state.placeOrder = [];
  state.placeCursor = 0;
  state.currentTurnSeatId = state.draftOrder[0];
}

function enterPlacePhase(state) {
  state.phase = 'place';
  // Placement Order: SMALLEST tile number first (3 -> 4 -> 6 -> 7 -> 9 -> 11 -> 13); ties by highest Priority Rank
  state.placeOrder = [...state.seats]
    .sort((a, b) => {
      const dt = state.chosenTiles[a.seatId] - state.chosenTiles[b.seatId];
      if (dt !== 0) return dt;
      return state.priorityRank[a.seatId] - state.priorityRank[b.seatId];
    })
    .map((s) => s.seatId);

  for (const sid of state.placeOrder) state.placementStatus[sid] = 'pending';
  state.placeCursor = 0;
  state.currentTurnSeatId = state.placeOrder[0];
}

function advancePlacementTurn(state) {
  state.placeCursor += 1;
  if (state.placeCursor >= state.placeOrder.length) {
    state.currentTurnSeatId = null;
    if (state.round >= state.totalRounds) {
      state.phase = 'finished';
    } else {
      state.phase = 'round_end';
    }
  } else {
    state.currentTurnSeatId = state.placeOrder[state.placeCursor];
  }
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx.options || {};
    const totalRounds = Number(opts.rounds) || 2;

    // Assign random Priority Ranks 1..N
    const shuffled = [...seats];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(ctx.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const priorityRank = {};
    shuffled.forEach((s, idx) => {
      priorityRank[s.seatId] = idx + 1;
    });

    const colorMap = {};
    seats.forEach((s, idx) => {
      colorMap[s.seatId] = PLAYER_TURF_COLORS[idx % PLAYER_TURF_COLORS.length];
    });

    const state = {
      seats: seats.map((s) => ({ seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: s.isBot })),
      options: {
        rounds: totalRounds,
        boardMap: opts.boardMap || 'classic',
      },
      totalRounds,
      round: 1,
      phase: 'draft',
      priorityRank,
      colorMap,
      scores: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      board: createParkBoard(opts.boardMap || 'classic'),
      draftOrder: [],
      draftCursor: 0,
      chosenTiles: {},
      placeOrder: [],
      placeCursor: 0,
      placementStatus: {},
      placements: [],
      currentTurnSeatId: null,
    };

    initRound(state, 0);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'finished') return { ok: false, reason: 'Match ended' };

    if (action.type === 'DRAFT_TILE') {
      if (fullState.phase !== 'draft') return { ok: false, reason: 'Not in draft phase' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn to draft' };
      const tileId = Number(action.payload?.tileId);
      if (!TILES[tileId]) return { ok: false, reason: 'Invalid tile size' };
      return { ok: true };
    }

    if (action.type === 'PLACE_TILE') {
      if (fullState.phase !== 'place') return { ok: false, reason: 'Not in placement phase' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn to place' };
      const tileId = fullState.chosenTiles[seatId];
      const { r, c, rot } = action.payload || {};
      if (!canPlaceTile(fullState.board, tileId, Number(r), Number(c), Number(rot) || 0)) {
        return { ok: false, reason: 'Tile overlaps obstacle/turf or goes out of bounds' };
      }
      return { ok: true };
    }

    if (action.type === 'FORFEIT_PLACE') {
      if (fullState.phase !== 'place') return { ok: false, reason: 'Not in placement phase' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn' };
      const tileId = fullState.chosenTiles[seatId];
      const valid = findAllValidPlacements(fullState.board, tileId);
      if (valid.length > 0) {
        return { ok: false, reason: 'Valid placements still exist on the park board!' };
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'round_end') return { ok: false, reason: 'Not between rounds' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action) {
    const state = clone(fullState);
    const events = [];

    if (action.type === 'DRAFT_TILE') {
      const tileId = Number(action.payload.tileId);
      state.chosenTiles[seatId] = tileId;
      events.push({ type: 'TILE_DRAFTED', seatId, tileId });
      state.draftCursor += 1;
      if (state.draftCursor >= state.draftOrder.length) {
        enterPlacePhase(state);
        events.push({ type: 'PLACE_PHASE_START', round: state.round });
      } else {
        state.currentTurnSeatId = state.draftOrder[state.draftCursor];
      }
      return { state, events };
    }

    if (action.type === 'PLACE_TILE') {
      const tileId = state.chosenTiles[seatId];
      const anchorR = Number(action.payload.r);
      const anchorC = Number(action.payload.c);
      const rot = ((Number(action.payload.rot) || 0) % 4 + 4) % 4;
      const cells = rotateTileCells(tileId, rot).map(([dr, dc]) => [anchorR + dr, anchorC + dc]);
      for (const [r, c] of cells) {
        state.board[r][c] = seatId;
      }
      state.placements.push({ seatId, tileId, r: anchorR, c: anchorC, rot, cells });
      state.placementStatus[seatId] = 'placed';
      state.scores[seatId] = (state.scores[seatId] || 0) + tileId;
      events.push({ type: 'TILE_PLACED', seatId, tileId });
      advancePlacementTurn(state);
      return { state, events };
    }

    if (action.type === 'FORFEIT_PLACE') {
      state.placementStatus[seatId] = 'blocked';
      events.push({ type: 'TILE_BLOCKED', seatId, tileId: state.chosenTiles[seatId] });
      advancePlacementTurn(state);
      return { state, events };
    }

    if (action.type === 'NEXT_ROUND') {
      initRound(state, state.round);
      events.push({ type: 'ROUND_START', round: state.round });
      return { state, events };
    }

    return { state, events };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const sid = state.currentTurnSeatId;
    if (!sid) return null;

    if (state.phase === 'draft') {
      const fallbackTile = 6;
      return GameRules.applyAction(state, sid, { type: 'DRAFT_TILE', payload: { tileId: fallbackTile } }, ctx);
    }
    if (state.phase === 'place') {
      const tileId = state.chosenTiles[sid];
      const valid = findAllValidPlacements(state.board, tileId);
      if (valid.length > 0) {
        const pick = valid[Math.floor(ctx.rng() * valid.length)];
        return GameRules.applyAction(state, sid, { type: 'PLACE_TILE', payload: pick }, ctx);
      }
      return GameRules.applyAction(state, sid, { type: 'FORFEIT_PLACE' }, ctx);
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'draft') {
      return { phaseKey: `ltg-r${fullState.round}-d${fullState.draftCursor}`, durationMs: 30000 };
    }
    if (fullState.phase === 'place') {
      return { phaseKey: `ltg-r${fullState.round}-p${fullState.placeCursor}`, durationMs: 45000 };
    }
    return null;
  },

  projectState(fullState) {
    // Public information game — all drafted tiles & board state are visible to everyone
    const currentTileId =
      fullState.phase === 'place' && fullState.currentTurnSeatId
        ? fullState.chosenTiles[fullState.currentTurnSeatId]
        : null;
    const currentCanPlace =
      currentTileId != null ? findAllValidPlacements(fullState.board, currentTileId).length > 0 : true;

    return {
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      phase: fullState.phase,
      options: fullState.options,
      seats: fullState.seats,
      priorityRank: fullState.priorityRank,
      colorMap: fullState.colorMap,
      scores: fullState.scores,
      board: fullState.board,
      draftOrder: fullState.draftOrder,
      draftCursor: fullState.draftCursor,
      chosenTiles: fullState.chosenTiles,
      placeOrder: fullState.placeOrder,
      placeCursor: fullState.placeCursor,
      placementStatus: fullState.placementStatus,
      currentTurnSeatId: fullState.currentTurnSeatId,
      currentCanPlace,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    if (fullState.phase === 'draft') {
      const n = fullState.seats.length;
      const alreadyClaimed = Object.values(fullState.chosenTiles).reduce((a, b) => a + b, 0);
      const remainingPickers = fullState.draftOrder.length - fullState.draftCursor - 1;
      const estTotalIf = (sz) => alreadyClaimed + sz + remainingPickers * 7.5;
      const prioRatio = fullState.priorityRank[botSeatId] / n; // lower = better priority

      // Smart strategic draft: balance high points vs risk of getting blocked on 114-cell board
      const weights = TILE_IDS.map((sz) => {
        const pressure = estTotalIf(sz) / 114;
        let score = sz;
        if (sz >= 11 && pressure > 0.88) score -= (pressure - 0.85) * 26;
        if (sz >= 9 && pressure > 0.96) score -= (pressure - 0.92) * 18;
        if (sz <= 6 && pressure > 0.92) score += 3.5; // agile spoiler tile!
        score += (1 - prioRatio) * (sz >= 9 ? 2.2 : 0.5);
        score += (ctx.rng() - 0.5) * 4.5;
        return { sz, score };
      });
      weights.sort((a, b) => b.score - a.score);
      return { type: 'DRAFT_TILE', payload: { tileId: weights[0].sz } };
    }

    if (fullState.phase === 'place') {
      const tileId = fullState.chosenTiles[botSeatId];
      const valid = findAllValidPlacements(fullState.board, tileId);
      if (valid.length === 0) return { type: 'FORFEIT_PLACE' };

      // Check if big tiles (11/13) remain after this bot: if so, place centrally to fragment open space!
      const bigRemaining = fullState.placeOrder
        .slice(fullState.placeCursor + 1)
        .some((sid) => fullState.chosenTiles[sid] >= 11);

      let best = valid[0];
      let bestScore = -Infinity;
      const sampleStep = valid.length > 70 ? Math.ceil(valid.length / 70) : 1;

      for (let i = 0; i < valid.length; i += sampleStep) {
        const cand = valid[i];
        const cells = rotateTileCells(tileId, cand.rot);
        let s = 0;
        for (const [dr, dc] of cells) {
          const r = cand.r + dr;
          const c = cand.c + dc;
          const distCenter = Math.hypot(r - 4.5, c - 5.5);
          if (bigRemaining && tileId <= 7) {
            // Sabotage big tiles by staking central intersections
            s += (6 - distCenter) * 1.4;
          } else {
            // Pack cleanly near borders/neighbors
            let adj = 0;
            for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
              if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS || fullState.board[nr][nc] !== null) {
                adj += 1;
              }
            }
            s += adj * 1.2;
          }
        }
        s += ctx.rng() * 1.6;
        if (s > bestScore) {
          bestScore = s;
          best = cand;
        }
      }
      return { type: 'PLACE_TILE', payload: best };
    }

    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'finished') return null;
    const ranked = [...fullState.seats].sort((a, b) => {
      const ds = (fullState.scores[b.seatId] || 0) - (fullState.scores[a.seatId] || 0);
      if (ds !== 0) return ds;
      return fullState.priorityRank[a.seatId] - fullState.priorityRank[b.seatId];
    });
    const top = fullState.scores[ranked[0].seatId] || 0;
    return {
      winnerSeatIds: ranked.filter((s) => (fullState.scores[s.seatId] || 0) === top).map((s) => s.seatId),
      rankings: ranked.map((s) => ({
        seatId: s.seatId,
        score: fullState.scores[s.seatId] || 0,
        label: `${fullState.scores[s.seatId] || 0} pts (P#${fullState.priorityRank[s.seatId]})`,
      })),
      summary: {
        zh: `114 格公园草坪铺设收官！风险选砖与空间切割博弈决出最终胜者。`,
        en: `The 114-cell park turf battle has concluded! Risk-taking draft picks and spatial blocking decided the victor.`,
      },
    };
  },
};
