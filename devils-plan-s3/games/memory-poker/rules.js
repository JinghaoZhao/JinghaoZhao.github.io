/**
 * Game 01c: Memory Poker (记忆扑克 / 기억 포커)
 * Standard 52-card deck with traditional 4 suits (♠ ♥ ♣ ♦) + 20s memory flash + blind 2-card selection.
 * Supports Devil's Plan S3 default 7-tier ranking (suits identify unique cards; flushes off)
 * AND optional full 9-tier Texas Hold'em ranking (with Flush & Straight Flush) via `includeFlushes`.
 */

export const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUITS = ['S', 'H', 'C', 'D'];

export const SUIT_META = {
  S: { symbol: '♠', color: 'black', name: { zh: '黑桃', en: 'Spades' } },
  H: { symbol: '♥', color: 'red',   name: { zh: '红桃', en: 'Hearts' } },
  C: { symbol: '♣', color: 'black', name: { zh: '梅花', en: 'Clubs' } },
  D: { symbol: '♦', color: 'red',   name: { zh: '方块', en: 'Diamonds' } },
};

export const HAND_NAMES = {
  8: { zh: '同花顺', en: 'Straight Flush' },
  7: { zh: '四条', en: 'Four of a Kind' },
  6: { zh: '葫芦', en: 'Full House' },
  5: { zh: '同花', en: 'Flush' },
  4: { zh: '顺子', en: 'Straight' },
  3: { zh: '三条', en: 'Three of a Kind' },
  2: { zh: '两对', en: 'Two Pair' },
  1: { zh: '一对', en: 'One Pair' },
  0: { zh: '高牌', en: 'High Card' },
};

const COORDS = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4',
];

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function normalizeCard(c) {
  if (typeof c === 'number') return { rank: c, suit: 'S' };
  return { rank: Number(c.rank), suit: c.suit };
}

/**
 * Exact 5-card Poker evaluator.
 * - `cards5`: array of 5 `{ rank: 2..14, suit: 'S'|'H'|'C'|'D' }` objects (or rank numbers).
 * - `includeFlushes = false` (S3 default): 7 tiers (Quads=7, Full House=6, Straight=4, Trips=3, Two Pair=2, One Pair=1, High Card=0).
 * - `includeFlushes = true` (Full 9-tier): adds Straight Flush=8 (Royal Flush when high=14) & Flush=5.
 */
export function evaluateHand(cards5, includeFlushes = false) {
  const norm = cards5.map(normalizeCard);
  const sorted = norm.map((c) => c.rank).sort((a, b) => b - a);
  const counts = new Map();
  for (const r of sorted) counts.set(r, (counts.get(r) || 0) + 1);

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const isFlush = includeFlushes && norm.every((c) => c.suit === norm[0].suit);

  // Check Straight (all 5 unique ranks)
  let straightHigh = 0;
  if (groups.length === 5) {
    if (sorted[0] - sorted[4] === 4) {
      straightHigh = sorted[0];
    } else if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && sorted[3] === 3 && sorted[4] === 2) {
      straightHigh = 5; // Wheel A-2-3-4-5
    }
  }

  let category = 0;
  let tiebreak = sorted;

  if (isFlush && straightHigh > 0) {
    category = 8; // Straight Flush / Royal Flush
    tiebreak = [straightHigh];
  } else if (groups[0][1] === 4) {
    category = 7; // Four of a Kind
    tiebreak = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = 6; // Full House
    tiebreak = [groups[0][0], groups[1][0]];
  } else if (isFlush) {
    category = 5; // Flush
    tiebreak = sorted;
  } else if (straightHigh > 0) {
    category = 4; // Straight
    tiebreak = [straightHigh];
  } else if (groups[0][1] === 3) {
    category = 3; // Three of a Kind
    tiebreak = [groups[0][0], groups[1][0], groups[2][0]];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    category = 2; // Two Pair
    tiebreak = [groups[0][0], groups[1][0], groups[2][0]];
  } else if (groups[0][1] === 2) {
    category = 1; // One Pair
    tiebreak = [groups[0][0], groups[1][0], groups[2][0], groups[3][0]];
  } else {
    category = 0; // High Card
    tiebreak = sorted;
  }

  const name =
    category === 8 && straightHigh === 14
      ? { zh: '皇家同花顺', en: 'Royal Flush' }
      : HAND_NAMES[category];

  return { category, tiebreak, name };
}

export function compareEvaluations(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function findBestPossiblePick(gridCards, communityCards, includeFlushes) {
  let bestPair = [0, 1];
  let bestEval = null;
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const ev = evaluateHand([...communityCards, gridCards[i], gridCards[j]], includeFlushes);
      if (!bestEval || compareEvaluations(ev, bestEval) > 0) {
        bestEval = ev;
        bestPair = [i, j];
      }
    }
  }
  return { pair: bestPair, eval: bestEval };
}

export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function dealRoundDeck(rng, includeFlushes) {
  const deck = createStandardDeck();
  const shuffle = () => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  };
  shuffle();
  let community = deck.slice(0, 3);
  let grid = deck.slice(3, 19);
  const opt = findBestPossiblePick(grid, community, includeFlushes);
  if (opt.eval.category < 3) {
    // Re-roll once to encourage juicy Trips/Straight/Flush/Full House/Quads lines
    shuffle();
    community = deck.slice(0, 3);
    grid = deck.slice(3, 19);
  }
  return { community, grid };
}

function initRound(state, roundIndex, now, rng) {
  const includeFlushes = Boolean(state.options.includeFlushes);
  const { community, grid } = dealRoundDeck(rng, includeFlushes);
  const optimal = findBestPossiblePick(grid, community, includeFlushes);

  state.round = roundIndex + 1;
  state.phase = 'memorize'; // 'memorize' -> 'select' -> 'showdown' -> 'finished'
  state.phaseStartedAt = now;
  state.community = community;
  state.grid = grid;
  state.optimal = optimal;
  state.readyMemorize = {};
  state.picks = {}; // seatId -> [idx1, idx2]
  state.roundResults = null;
  state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);

  // Realistic bot memory maps (each bot remembers ~64–92% of the 16 suited cards)
  state.botMemory = {};
  for (const s of state.seats) {
    if (!s.isBot) continue;
    const accuracy = 0.64 + rng() * 0.28;
    const mem = {};
    for (let idx = 0; idx < 16; idx++) {
      if (rng() < accuracy) mem[idx] = { ...grid[idx] };
    }
    state.botMemory[s.seatId] = mem;
  }
}

function enterSelectPhase(state, now) {
  state.phase = 'select';
  state.phaseStartedAt = now;
  state.picks = {};
  state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
}

function resolveShowdown(state) {
  const includeFlushes = Boolean(state.options.includeFlushes);
  for (const s of state.seats) {
    if (!state.picks[s.seatId]) {
      state.picks[s.seatId] = [0, 1];
    }
  }

  const entries = state.seats.map((s) => {
    const pair = state.picks[s.seatId];
    const pickedCards = [state.grid[pair[0]], state.grid[pair[1]]];
    const cards5 = [...state.community, ...pickedCards];
    const ev = evaluateHand(cards5, includeFlushes);
    return {
      seatId: s.seatId,
      pair,
      pickedCards,
      eval: ev,
      rank: 1,
      pointsEarned: 0,
    };
  });

  entries.sort((a, b) => compareEvaluations(b.eval, a.eval));

  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && compareEvaluations(entries[i].eval, entries[i - 1].eval) === 0) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = i + 1;
    }
  }

  const n = entries.length;
  for (const e of entries) {
    const pct = e.rank / n;
    let pts = 1;
    if (e.rank === 1 || pct <= 0.25) pts = 5;
    else if (pct <= 0.55) pts = 3;
    e.pointsEarned = pts;
    state.scores[e.seatId] = (state.scores[e.seatId] || 0) + pts;
  }

  state.roundResults = entries;
  state.phase = 'showdown';
  state.pendingSeatIds = [];
  state.history.push({
    round: state.round,
    community: [...state.community],
    topHand: entries[0].eval.name,
    winners: entries.filter((e) => e.rank === 1).map((e) => e.seatId),
  });
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx.options || {};
    const totalRounds = Number(opts.rounds) || 3;
    const memoryMs = (Number(opts.memorySec) || 20) * 1000;
    const includeFlushes = Boolean(opts.includeFlushes);
    const now = Date.now();
    const state = {
      seats: seats.map((s) => ({ seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: s.isBot })),
      options: {
        rounds: totalRounds,
        memorySec: Number(opts.memorySec) || 20,
        includeFlushes,
      },
      totalRounds,
      memoryMs,
      selectMs: 40000,
      round: 1,
      phase: 'memorize',
      phaseStartedAt: now,
      scores: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      community: [],
      grid: [],
      optimal: null,
      readyMemorize: {},
      picks: {},
      botMemory: {},
      roundResults: null,
      pendingSeatIds: [],
      history: [],
    };
    initRound(state, 0, now, ctx.rng);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'finished') return { ok: false, reason: 'Match ended' };

    if (action.type === 'READY_MEMORIZE') {
      if (fullState.phase !== 'memorize') return { ok: false, reason: 'Not in memory phase' };
      return { ok: true };
    }

    if (action.type === 'SUBMIT_PICK') {
      if (fullState.phase !== 'select') return { ok: false, reason: 'Not in card selection phase' };
      if (fullState.picks[seatId]) return { ok: false, reason: 'Already locked your 2 cards' };
      const pair = action.payload?.pair;
      if (!Array.isArray(pair) || pair.length !== 2) return { ok: false, reason: 'Pick exactly 2 cards' };
      const [a, b] = pair.map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a > 15 || b < 0 || b > 15 || a === b) {
        return { ok: false, reason: 'Choose 2 distinct positions (1–16)' };
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'showdown') return { ok: false, reason: 'Not in showdown phase' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const now = ctx.now || Date.now();
    const events = [];

    if (action.type === 'READY_MEMORIZE') {
      state.readyMemorize[seatId] = true;
      const humans = state.seats.filter((s) => !s.isBot);
      if (humans.every((s) => state.readyMemorize[s.seatId])) {
        enterSelectPhase(state, now);
        events.push({ type: 'FLIP_CARDS', round: state.round });
      }
      return { state, events };
    }

    if (action.type === 'SUBMIT_PICK') {
      const pair = action.payload.pair.map(Number).sort((a, b) => a - b);
      state.picks[seatId] = pair;
      state.pendingSeatIds = state.seats
        .filter((s) => !s.isBot && !state.picks[s.seatId])
        .map((s) => s.seatId);
      events.push({ type: 'PICK_LOCKED', seatId });

      if (state.seats.every((s) => Boolean(state.picks[s.seatId]))) {
        resolveShowdown(state);
        events.push({ type: 'SHOWDOWN', round: state.round });
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
    if (state.phase === 'memorize') {
      enterSelectPhase(state, now);
      return { state, events: [{ type: 'FLIP_CARDS', round: state.round }] };
    }
    if (state.phase === 'select') {
      for (const s of state.seats) {
        if (!state.picks[s.seatId]) {
          const a = Math.floor(ctx.rng() * 16);
          const b = (a + 1 + Math.floor(ctx.rng() * 15)) % 16;
          state.picks[s.seatId] = [Math.min(a, b), Math.max(a, b)];
        }
      }
      resolveShowdown(state);
      return { state, events: [{ type: 'SHOWDOWN', round: state.round }] };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'memorize') {
      return { phaseKey: `mp-r${fullState.round}-mem`, durationMs: fullState.memoryMs };
    }
    if (fullState.phase === 'select') {
      return { phaseKey: `mp-r${fullState.round}-sel`, durationMs: fullState.selectMs };
    }
    return null;
  },

  projectState(fullState, viewerSeatId) {
    const showGridFaces = fullState.phase === 'memorize' || fullState.phase === 'showdown' || fullState.phase === 'finished';
    const showCommunity = fullState.phase !== 'memorize';
    const showAllPicks = fullState.phase === 'showdown' || fullState.phase === 'finished';

    const picksView = {};
    for (const s of fullState.seats) {
      if (showAllPicks || s.seatId === viewerSeatId) {
        picksView[s.seatId] = fullState.picks[s.seatId] || null;
      } else {
        picksView[s.seatId] = fullState.picks[s.seatId] ? 'LOCKED' : null;
      }
    }

    return {
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      phase: fullState.phase,
      options: fullState.options,
      phaseStartedAt: fullState.phaseStartedAt,
      memoryMs: fullState.memoryMs,
      selectMs: fullState.selectMs,
      seats: fullState.seats,
      scores: fullState.scores,
      coords: COORDS,
      community: showCommunity ? fullState.community : [null, null, null],
      grid: showGridFaces ? fullState.grid : Array(16).fill(null),
      readyMemorize: fullState.readyMemorize,
      picks: picksView,
      optimal: showAllPicks ? fullState.optimal : null,
      roundResults: showAllPicks ? fullState.roundResults : null,
      pendingSeatIds: fullState.pendingSeatIds,
      history: fullState.history,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'select') return null;
    if (fullState.picks[botSeatId]) return null;

    const includeFlushes = Boolean(fullState.options?.includeFlushes);
    const mem = fullState.botMemory?.[botSeatId] || {};
    const knownIndices = Object.keys(mem).map(Number);

    let bestPair = null;
    let bestEval = null;

    for (let i = 0; i < knownIndices.length; i++) {
      for (let j = i + 1; j < knownIndices.length; j++) {
        const a = knownIndices[i];
        const b = knownIndices[j];
        const ev = evaluateHand([...fullState.community, mem[a], mem[b]], includeFlushes);
        if (!bestEval || compareEvaluations(ev, bestEval) > 0) {
          bestEval = ev;
          bestPair = [Math.min(a, b), Math.max(a, b)];
        }
      }
    }

    if (!bestPair || (ctx.rng() < 0.1 && knownIndices.length < 16)) {
      const a = Math.floor(ctx.rng() * 16);
      const b = (a + 1 + Math.floor(ctx.rng() * 15)) % 16;
      bestPair = [Math.min(a, b), Math.max(a, b)];
    }

    return { type: 'SUBMIT_PICK', payload: { pair: bestPair } };
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
        zh: `全部 ${fullState.totalRounds} 轮记忆扑克决胜完成！过目不忘的精准选牌赢得了全场最高牌型积分。`,
        en: `All ${fullState.totalRounds} rounds of Memory Poker concluded! Photographic recall and hand reading prevailed.`,
      },
    };
  },
};
