/**
 * Memory Maze (기억의 미로 / 记忆迷宫) — Pure Deterministic Rules & 3-Tier AI
 * Seasons: S3E8, S3E9
 *
 * 7x7 obsidian grid (49 squares, 84 internal edges) with exactly 32 INVISIBLE walls.
 * Both players have equal shortest-path distance from their Start corner to their
 * opposite Goal corner:
 *   - Seat 0: Start (6, 0) -> Goal (0, 6)
 *   - Seat 1: Start (6, 6) -> Goal (0, 0)
 * Each turn: move up to 3 orthogonal steps (or activate 1 of 2 Double Chances for 6 steps).
 * Hitting an invisible wall flashes that crimson barrier for 1.6s, resets the runner to Start,
 * and ends the turn immediately.
 */

export const GRID_SIZE = 7;
export const WALL_COUNT = 32;
export const NORMAL_STEPS = 3;
export const DOUBLE_STEPS = 6;
export const INITIAL_DOUBLE_CHANCES = 2;
export const COLLISION_FLASH_MS = 1600;

export const DIRS = {
  UP: { dr: -1, dc: 0 },
  DOWN: { dr: 1, dc: 0 },
  LEFT: { dr: 0, dc: -1 },
  RIGHT: { dr: 0, dc: 1 },
};

/** Canonical undirected edge key between two orthogonal neighbor cells */
export function makeEdgeKey(r1, c1, r2, c2) {
  if (r1 < r2 || (r1 === r2 && c1 < c2)) {
    return `${r1},${c1}|${r2},${c2}`;
  }
  return `${r2},${c2}|${r1},${c1}`;
}

export function parseEdgeKey(key) {
  const [a, b] = key.split('|');
  const [r1, c1] = a.split(',').map(Number);
  const [r2, c2] = b.split(',').map(Number);
  return { r1, c1, r2, c2 };
}

function getAllInternalEdges() {
  const edges = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c + 1 < GRID_SIZE) edges.push(makeEdgeKey(r, c, r, c + 1));
      if (r + 1 < GRID_SIZE) edges.push(makeEdgeKey(r, c, r + 1, c));
    }
  }
  return edges; // 42 + 42 = 84 edges
}

function mirrorEdgeKey(key) {
  const { r1, c1, r2, c2 } = parseEdgeKey(key);
  return makeEdgeKey(r1, GRID_SIZE - 1 - c1, r2, GRID_SIZE - 1 - c2);
}

function bfsDistance(start, goal, wallSet) {
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const queue = [{ r: start.r, c: start.c, d: 0 }];
  visited[start.r * GRID_SIZE + start.c] = 1;
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    if (cur.r === goal.r && cur.c === goal.c) return cur.d;
    for (const { dr, dc } of Object.values(DIRS)) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const idx = nr * GRID_SIZE + nc;
      if (visited[idx]) continue;
      if (wallSet.has(makeEdgeKey(cur.r, cur.c, nr, nc))) continue;
      visited[idx] = 1;
      queue.push({ r: nr, c: nc, d: cur.d + 1 });
    }
  }
  return -1;
}

function isFullyConnected(wallSet) {
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const queue = [{ r: 0, c: 0 }];
  visited[0] = 1;
  let count = 1;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const { dr, dc } of Object.values(DIRS)) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const idx = nr * GRID_SIZE + nc;
      if (visited[idx]) continue;
      if (wallSet.has(makeEdgeKey(cur.r, cur.c, nr, nc))) continue;
      visited[idx] = 1;
      count++;
      queue.push({ r: nr, c: nc });
    }
  }
  return count === GRID_SIZE * GRID_SIZE;
}

function shuffleArray(arr, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates an asymmetric (preferred) or symmetric fallback 7x7 maze with exactly 32 walls
 * where all 49 squares are reachable and BOTH players have the EXACT same shortest-path distance.
 */
function generateFairMaze(rng) {
  const allEdges = getAllInternalEdges();
  const p1Start = { r: 6, c: 0 };
  const p1Goal = { r: 0, c: 6 };
  const p2Start = { r: 6, c: 6 };
  const p2Goal = { r: 0, c: 0 };

  let bestAsym = null;
  let bestAsymScore = -Infinity;

  // Try asymmetric fair mazes first (equal shortest path, >= 14 steps preferred)
  for (let attempt = 0; attempt < 260; attempt++) {
    const shuffled = shuffleArray(allEdges, rng);
    const walls = new Set();
    for (let i = 0; i < shuffled.length && walls.size < WALL_COUNT; i++) {
      const edge = shuffled[i];
      walls.add(edge);
      if (!isFullyConnected(walls)) {
        walls.delete(edge);
      }
    }
    if (walls.size !== WALL_COUNT) continue;
    const d1 = bfsDistance(p1Start, p1Goal, walls);
    const d2 = bfsDistance(p2Start, p2Goal, walls);
    if (d1 < 12 || d2 < 12) continue;
    if (d1 === d2) {
      // Ideal distance is 15-18 steps
      const quality = 20 - Math.abs(d1 - 16);
      if (quality > bestAsymScore) {
        bestAsymScore = quality;
        bestAsym = { walls: [...walls].sort(), shortestPath: d1 };
      }
      if (d1 >= 14 && d1 <= 20) {
        return { walls: [...walls].sort(), shortestPath: d1 };
      }
    }
  }
  if (bestAsym) return bestAsym;

  // Fallback: mirror-symmetric 32-wall maze (guarantees d1 === d2 mathematically)
  const pairGroups = [];
  const seen = new Set();
  for (const e of allEdges) {
    if (seen.has(e)) continue;
    const m = mirrorEdgeKey(e);
    seen.add(e);
    seen.add(m);
    if (e === m) pairGroups.push([e]);
    else pairGroups.push([e, m]);
  }
  for (let attempt = 0; attempt < 80; attempt++) {
    const shuffledGroups = shuffleArray(pairGroups, rng);
    const walls = new Set();
    for (const grp of shuffledGroups) {
      if (walls.size + grp.length > WALL_COUNT) continue;
      grp.forEach((e) => walls.add(e));
      if (!isFullyConnected(walls)) {
        grp.forEach((e) => walls.delete(e));
      }
      if (walls.size === WALL_COUNT) break;
    }
    if (walls.size === WALL_COUNT) {
      const d = bfsDistance(p1Start, p1Goal, walls);
      if (d >= 12) return { walls: [...walls].sort(), shortestPath: d };
    }
  }

  // Ultra-safe deterministic fallback (32 walls, connected, equal path)
  const walls = new Set();
  for (const grp of pairGroups) {
    if (walls.size + grp.length > WALL_COUNT) continue;
    grp.forEach((e) => walls.add(e));
    if (!isFullyConnected(walls)) grp.forEach((e) => walls.delete(e));
  }
  return { walls: [...walls].sort(), shortestPath: bfsDistance(p1Start, p1Goal, walls) };
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || seatId;
}

function recordBotKnowledge(state, kind, edgeKey, rng) {
  for (const seatId of state.seatOrder) {
    const p = state.players[seatId];
    if (!p.isBot) continue;
    const mem = state.botMemory[seatId];
    if (!mem) continue;
    const diff = p.difficulty || state.difficulty || 'genius';
    const recallProb =
      kind === 'wall'
        ? diff === 'grand_final'
          ? 0.99
          : diff === 'genius'
          ? 0.88
          : 0.55
        : diff === 'grand_final'
        ? 0.99
        : diff === 'genius'
        ? 0.85
        : 0.5;
    if (rng() <= recallProb) {
      const bucket = kind === 'wall' ? mem.knownWalls : mem.knownSafe;
      if (!bucket.includes(edgeKey)) bucket.push(edgeKey);
    }
  }
}

/**
 * Shortest path planner for AI using its personal memory (knownWalls & knownSafe).
 * Returns array of directions ['UP', 'RIGHT', ...] from current pos to goal.
 */
function planBotPath(pos, goal, knownWallsSet, knownSafeSet, preferSafeWeight, rng) {
  const dist = new Float64Array(GRID_SIZE * GRID_SIZE).fill(Infinity);
  const prev = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);

  const startIdx = pos.r * GRID_SIZE + pos.c;
  const goalIdx = goal.r * GRID_SIZE + goal.c;
  dist[startIdx] = 0;

  const dirEntries = Object.entries(DIRS);

  for (let iter = 0; iter < GRID_SIZE * GRID_SIZE; iter++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      if (!visited[i] && dist[i] < bestD) {
        bestD = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === goalIdx) break;
    visited[u] = 1;

    const ur = Math.floor(u / GRID_SIZE);
    const uc = u % GRID_SIZE;

    for (const [dirName, { dr, dc }] of dirEntries) {
      const nr = ur + dr;
      const nc = uc + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const edgeKey = makeEdgeKey(ur, uc, nr, nc);
      if (knownWallsSet.has(edgeKey)) continue;

      const v = nr * GRID_SIZE + nc;
      const baseCost = knownSafeSet.has(edgeKey) ? 1.0 : preferSafeWeight;
      const jitter = rng() * 0.08;
      const alt = dist[u] + baseCost + jitter;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = { from: u, dir: dirName, edgeKey };
      }
    }
  }

  if (!prev[goalIdx]) return [];
  const path = [];
  let cur = goalIdx;
  while (cur !== startIdx && prev[cur]) {
    path.push(prev[cur]);
    cur = prev[cur].from;
  }
  path.reverse();
  return path;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const { walls, shortestPath } = generateFairMaze(rng);

    const s0 = seats[0];
    const s1 = seats[1];
    const firstIdx = rng() < 0.5 ? 0 : 1;
    const seatOrder = [s0.seatId, s1.seatId];

    const players = {
      [s0.seatId]: {
        seatId: s0.seatId,
        name: s0.name,
        avatar: s0.avatar,
        isBot: Boolean(s0.isBot),
        difficulty: s0.difficulty || diff,
        color: 'cyan',
        start: { r: 6, c: 0 },
        goal: { r: 0, c: 6 },
        pos: { r: 6, c: 0 },
        doubleChances: INITIAL_DOUBLE_CHANCES,
        collisions: 0,
        totalSteps: 0,
        furthestProgress: 0,
      },
      [s1.seatId]: {
        seatId: s1.seatId,
        name: s1.name,
        avatar: s1.avatar,
        isBot: Boolean(s1.isBot),
        difficulty: s1.difficulty || diff,
        color: 'garnet',
        start: { r: 6, c: 6 },
        goal: { r: 0, c: 0 },
        pos: { r: 6, c: 6 },
        doubleChances: INITIAL_DOUBLE_CHANCES,
        collisions: 0,
        totalSteps: 0,
        furthestProgress: 0,
      },
    };

    const botMemory = {};
    for (const s of seats) {
      botMemory[s.seatId] = { knownWalls: [], knownSafe: [] };
    }

    return {
      phase: 'MOVING', // 'MOVING' | 'COLLISION_FLASH' | 'ENDED'
      round: 1,
      turnNumber: 1,
      phaseLabel: { zh: '迷宫探索', en: 'Maze Navigation' },
      difficulty: diff,
      options: ctx.options || {},
      seatOrder,
      players,
      currentTurnSeatId: seatOrder[firstIdx],
      stepsBudget: NORMAL_STEPS,
      stepsTakenThisTurn: 0,
      usedDoubleThisTurn: false,
      turnTrail: [players[seatOrder[firstIdx]].pos],
      lastMove: null,
      collisionFlash: null, // { edgeKey, seatId, from, to, turnNumber }
      discoveredWallCount: 0,
      discoveredWallKeys: [], // Host-only tracking for stats
      walls, // Host-only canonical 32 walls (NEVER sent to clients while active!)
      shortestPath,
      botMemory, // Host-only AI memory (NEVER sent to clients!)
      winnerSeatId: null,
      history: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ENDED') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!action || !action.type) {
      return { ok: false, reason: 'Invalid action' };
    }

    if (action.type === 'DISMISS_FLASH') {
      if (fullState.phase !== 'COLLISION_FLASH') {
        return { ok: false, reason: 'No active collision alarm' };
      }
      return { ok: true };
    }

    if (fullState.phase !== 'MOVING') {
      return { ok: false, reason: 'Alarm active — wait for reset' };
    }
    if (fullState.currentTurnSeatId !== seatId) {
      return { ok: false, reason: 'Not your turn' };
    }

    const player = fullState.players[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'ACTIVATE_DOUBLE') {
      if (fullState.stepsTakenThisTurn > 0) {
        return { ok: false, reason: 'Double Chance must be activated before moving' };
      }
      if (fullState.usedDoubleThisTurn) {
        return { ok: false, reason: 'Already active this turn' };
      }
      if (player.doubleChances <= 0) {
        return { ok: false, reason: 'No Double Chances remaining' };
      }
      return { ok: true };
    }

    if (action.type === 'END_TURN') {
      if (fullState.stepsTakenThisTurn < 1) {
        return { ok: false, reason: 'Must move at least 1 step before ending turn' };
      }
      return { ok: true };
    }

    if (action.type === 'STEP') {
      const dir = action.payload?.dir;
      let delta = DIRS[dir];
      if (!delta && typeof action.payload?.r === 'number' && typeof action.payload?.c === 'number') {
        const dr = action.payload.r - player.pos.r;
        const dc = action.payload.c - player.pos.c;
        if (Math.abs(dr) + Math.abs(dc) === 1) {
          delta = { dr, dc };
        }
      }
      if (!delta) return { ok: false, reason: 'Must move 1 orthogonal square' };
      const nr = player.pos.r + delta.dr;
      const nc = player.pos.c + delta.dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) {
        return { ok: false, reason: 'Out of maze bounds' };
      }
      if (fullState.stepsTakenThisTurn >= fullState.stepsBudget) {
        return { ok: false, reason: 'No steps left this turn' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action type' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const rng = ctx.rng;
    const events = [];

    if (action.type === 'DISMISS_FLASH') {
      return this._finishCollisionFlash(next);
    }

    const player = next.players[seatId];

    if (action.type === 'ACTIVATE_DOUBLE') {
      player.doubleChances -= 1;
      next.usedDoubleThisTurn = true;
      next.stepsBudget = DOUBLE_STEPS;
      next.phaseLabel = { zh: '双倍冲刺 (6步)', en: 'Double Chance (6 Steps)' };
      events.push({ type: 'DOUBLE_CHANCE', seatId, remaining: player.doubleChances });
      return { state: next, events };
    }

    if (action.type === 'END_TURN') {
      this._advanceTurn(next);
      events.push({ type: 'TURN_END', seatId, nextSeatId: next.currentTurnSeatId });
      return { state: next, events };
    }

    if (action.type === 'STEP') {
      let dr = 0;
      let dc = 0;
      if (action.payload?.dir && DIRS[action.payload.dir]) {
        dr = DIRS[action.payload.dir].dr;
        dc = DIRS[action.payload.dir].dc;
      } else {
        dr = action.payload.r - player.pos.r;
        dc = action.payload.c - player.pos.c;
      }

      const from = { r: player.pos.r, c: player.pos.c };
      const to = { r: from.r + dr, c: from.c + dc };
      const edgeKey = makeEdgeKey(from.r, from.c, to.r, to.c);
      const hitWall = next.walls.includes(edgeKey);

      if (hitWall) {
        player.collisions += 1;
        player.pos = { r: player.start.r, c: player.start.c };
        if (!next.discoveredWallKeys.includes(edgeKey)) {
          next.discoveredWallKeys.push(edgeKey);
          next.discoveredWallCount = next.discoveredWallKeys.length;
        }
        recordBotKnowledge(next, 'wall', edgeKey, rng);

        next.phase = 'COLLISION_FLASH';
        next.phaseLabel = { zh: '警报！撞上隐形墙', en: 'SIREN! Invisible Wall Hit' };
        next.collisionFlash = {
          edgeKey,
          seatId,
          from,
          to,
          turnNumber: next.turnNumber,
        };
        next.lastMove = { type: 'COLLISION', seatId, from, to, edgeKey };
        next.history.push({
          turn: next.turnNumber,
          seatId,
          kind: 'wall',
          from,
          to,
        });
        if (next.history.length > 30) next.history.shift();
        events.push({ type: 'WALL_HIT', seatId, edgeKey, from, to });
        return { state: next, events };
      }

      // Safe step!
      player.pos = to;
      player.totalSteps += 1;
      next.stepsTakenThisTurn += 1;
      next.turnTrail.push(to);

      const manhattanFromStart =
        Math.abs(to.r - player.start.r) + Math.abs(to.c - player.start.c);
      if (manhattanFromStart > player.furthestProgress) {
        player.furthestProgress = manhattanFromStart;
      }

      recordBotKnowledge(next, 'safe', edgeKey, rng);
      next.lastMove = { type: 'STEP', seatId, from, to, edgeKey };

      // Check victory
      if (to.r === player.goal.r && to.c === player.goal.c) {
        next.phase = 'ENDED';
        next.winnerSeatId = seatId;
        next.phaseLabel = { zh: '迷宫突破！', en: 'Maze Escaped!' };
        next.history.push({ turn: next.turnNumber, seatId, kind: 'win', to });
        events.push({ type: 'GOAL_REACHED', seatId });
        return { state: next, events };
      }

      // Check if step budget spent
      if (next.stepsTakenThisTurn >= next.stepsBudget) {
        next.history.push({
          turn: next.turnNumber,
          seatId,
          kind: 'move',
          steps: next.stepsTakenThisTurn,
          to,
        });
        if (next.history.length > 30) next.history.shift();
        this._advanceTurn(next);
        events.push({ type: 'STEP_COMPLETE', seatId, to, turnEnded: true });
      } else {
        events.push({ type: 'STEP', seatId, to, stepsLeft: next.stepsBudget - next.stepsTakenThisTurn });
      }
      return { state: next, events };
    }

    return { state: next, events };
  },

  _finishCollisionFlash(next) {
    next.collisionFlash = null;
    next.phase = 'MOVING';
    this._advanceTurn(next);
    return {
      state: next,
      events: [{ type: 'FLASH_CLEARED', nextSeatId: next.currentTurnSeatId }],
    };
  },

  _advanceTurn(next) {
    const nextSeat = getOtherSeatId(next, next.currentTurnSeatId);
    next.currentTurnSeatId = nextSeat;
    next.turnNumber += 1;
    next.round = Math.ceil(next.turnNumber / 2);
    next.stepsBudget = NORMAL_STEPS;
    next.stepsTakenThisTurn = 0;
    next.usedDoubleThisTurn = false;
    next.turnTrail = [{ ...next.players[nextSeat].pos }];
    next.phaseLabel = { zh: '迷宫探索', en: 'Maze Navigation' };
  },

  getPhaseTimer(fullState) {
    if (!fullState) return null;
    if (fullState.phase === 'COLLISION_FLASH') {
      return {
        phaseKey: `collision-${fullState.turnNumber}-${fullState.collisionFlash?.edgeKey || 'w'}`,
        durationMs: COLLISION_FLASH_MS,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState) {
    if (!fullState || fullState.phase !== 'COLLISION_FLASH') return null;
    const next = cloneState(fullState);
    return this._finishCollisionFlash(next);
  },

  projectState(fullState, _viewerSeatId) {
    if (!fullState) return null;
    const isEnded = fullState.phase === 'ENDED';
    return {
      phase: fullState.phase,
      round: fullState.round,
      turnNumber: fullState.turnNumber,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      players: fullState.players,
      currentTurnSeatId: fullState.currentTurnSeatId,
      stepsBudget: fullState.stepsBudget,
      stepsTakenThisTurn: fullState.stepsTakenThisTurn,
      usedDoubleThisTurn: fullState.usedDoubleThisTurn,
      turnTrail: fullState.turnTrail,
      lastMove: fullState.lastMove,
      collisionFlash: fullState.collisionFlash,
      discoveredWallCount: fullState.discoveredWallCount,
      shortestPath: fullState.shortestPath,
      winnerSeatId: fullState.winnerSeatId,
      history: fullState.history,
      // CRITICAL: Invisible walls are NEVER leaked until the match concludes!
      revealedAllWalls: isEnded ? fullState.walls : null,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase !== 'MOVING') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const bot = fullState.players[botSeatId];
    const diff = ctx.difficulty || bot.difficulty || 'genius';
    const mem = fullState.botMemory[botSeatId] || { knownWalls: [], knownSafe: [] };
    const knownWallsSet = new Set(mem.knownWalls);
    const knownSafeSet = new Set(mem.knownSafe);

    // Grand Final strongly prefers known-safe corridors; Easy treats unknown almost equally
    const unknownWeight = diff === 'grand_final' ? 1.55 : diff === 'genius' ? 1.25 : 1.05;
    const path = planBotPath(bot.pos, bot.goal, knownWallsSet, knownSafeSet, unknownWeight, rng);

    // Consider activating Double Chance at start of turn
    if (
      fullState.stepsTakenThisTurn === 0 &&
      !fullState.usedDoubleThisTurn &&
      bot.doubleChances > 0 &&
      path.length > 0
    ) {
      // Count how many consecutive upcoming steps along planned path are confirmed safe
      let confirmedAhead = 0;
      for (let i = 0; i < Math.min(6, path.length); i++) {
        if (knownSafeSet.has(path[i].edgeKey)) confirmedAhead++;
        else break;
      }

      if (diff === 'grand_final') {
        // Sprint into Goal if <= 6 steps away and at least 4 known safe, or >= 5 confirmed safe highway!
        if ((path.length <= 6 && path.length > 3 && confirmedAhead >= path.length - 1) || confirmedAhead >= 5) {
          return { type: 'ACTIVATE_DOUBLE' };
        }
      } else if (diff === 'genius') {
        if ((path.length <= 6 && path.length > 3 && confirmedAhead >= 3) || confirmedAhead >= 4) {
          return { type: 'ACTIVATE_DOUBLE' };
        }
      } else {
        // Easy uses Double Chance occasionally when close or halfway
        if (path.length <= 6 && path.length > 3 && rng() < 0.45) {
          return { type: 'ACTIVATE_DOUBLE' };
        }
      }
    }

    // If bot has a planned next step, check whether it makes sense to step or stop early
    if (path.length > 0) {
      const nextStep = path[0];
      // Easy AI occasionally blunders into an alternative orthogonal move
      if (diff === 'easy' && rng() < 0.14) {
        const validDirs = Object.entries(DIRS).filter(([, { dr, dc }]) => {
          const nr = bot.pos.r + dr;
          const nc = bot.pos.c + dc;
          if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
          return !knownWallsSet.has(makeEdgeKey(bot.pos.r, bot.pos.c, nr, nc));
        });
        if (validDirs.length > 0) {
          const pick = validDirs[Math.floor(rng() * validDirs.length)][0];
          return { type: 'STEP', payload: { dir: pick } };
        }
      }
      return { type: 'STEP', payload: { dir: nextStep.dir } };
    }

    // Fallback: any legal orthogonal move not known to be a wall
    for (const [dir, { dr, dc }] of Object.entries(DIRS)) {
      const nr = bot.pos.r + dr;
      const nc = bot.pos.c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        return { type: 'STEP', payload: { dir } };
      }
    }
    return null;
  },

  getResult(state) {
    if (!state || state.phase !== 'ENDED' || !state.winnerSeatId) return null;
    const winner = state.players[state.winnerSeatId];
    const loserId = state.seatOrder.find((id) => id !== state.winnerSeatId);
    const loser = state.players[loserId];

    return {
      winnerSeatIds: [state.winnerSeatId],
      rankings: [
        {
          seatId: winner.seatId,
          label: `${winner.name} (${winner.totalSteps} steps / ${winner.collisions} hits)`,
          score: winner.totalSteps,
        },
        {
          seatId: loser.seatId,
          label: `${loser.name} (${loser.totalSteps} steps / ${loser.collisions} hits)`,
          score: loser.totalSteps,
        },
      ],
      summary: {
        zh: `${winner.name} 率先破解 32 堵隐形墙迷阵，历经 ${state.turnNumber} 回合直抵对角终点！`,
        en: `${winner.name} conquered the 32 invisible walls in ${state.turnNumber} turns to reach the opposing Goal!`,
      },
    };
  },
};
