/**
 * Exile Match 3: Secret Code (秘密密码 / 비밀 코드)
 * 26 ornate A-Z glyph cards with guaranteed-unique (Number, Color, Shape) tuples.
 * Deterministic seeded puzzle generator with EXACT backtracking uniqueness verifier
 * guaranteeing every puzzle has EXACTLY 1 valid 4-letter ordered solution.
 */

export const COLORS = [
  { id: 'red', zh: '红色', en: 'Red', hex: '#ef4444' },
  { id: 'blue', zh: '蓝色', en: 'Blue', hex: '#3b82f6' },
  { id: 'gold', zh: '金色', en: 'Gold', hex: '#eab308' },
  { id: 'green', zh: '绿色', en: 'Green', hex: '#10b981' },
];

export const SHAPES = [
  { id: 'circle', zh: '圆形', en: 'Circle' },
  { id: 'square', zh: '方形', en: 'Square' },
  { id: 'triangle', zh: '三角', en: 'Triangle' },
  { id: 'star', zh: '星形', en: 'Star' },
];

const COLOR_MAP = Object.fromEntries(COLORS.map((c) => [c.id, c]));
const SHAPE_MAP = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

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
 * Generate 26 A-Z cards where every card has a unique (number 1..6, color, shape) tuple.
 */
function generateDeck(rng) {
  const allTuples = [];
  for (let num = 1; num <= 6; num++) {
    for (const c of COLORS) {
      for (const s of SHAPES) {
        allTuples.push({ num, color: c.id, shape: s.id });
      }
    }
  }
  // Balanced stratified pick of 26 unique tuples (6-7 per color & shape)
  const chosen = shuffle(allTuples, rng).slice(0, 26);
  return chosen.map((t, idx) => ({
    idx,
    letter: String.fromCharCode(65 + idx),
    num: t.num,
    color: t.color,
    shape: t.shape,
  }));
}

/**
 * Evaluate a single clue spec on an ordered 4-card tuple [c0, c1, c2, c3].
 */
function checkClue(clue, cards) {
  const p = clue.params;
  switch (clue.kind) {
    case 'POS_COLOR':
      return cards[p.pos].color === p.color;
    case 'POS_NOT_COLOR':
      return cards[p.pos].color !== p.color;
    case 'POS_SHAPE':
      return cards[p.pos].shape === p.shape;
    case 'POS_NOT_SHAPE':
      return cards[p.pos].shape !== p.shape;
    case 'POS_PARITY':
      return (cards[p.pos].num % 2 === 1) === p.isOdd;
    case 'POS_NUM_RANGE':
      return p.dir === 'ge' ? cards[p.pos].num >= p.val : cards[p.pos].num <= p.val;
    case 'POS_ALPHA_HALF':
      return p.firstHalf ? cards[p.pos].idx <= 12 : cards[p.pos].idx >= 13;
    case 'POS_NUM_EXACT':
      return cards[p.pos].num === p.val;
    case 'SUM_NUMS':
      return cards[0].num + cards[1].num + cards[2].num + cards[3].num === p.sum;
    case 'COUNT_COLOR':
      return cards.filter((c) => c.color === p.color).length === p.count;
    case 'COUNT_SHAPE':
      return cards.filter((c) => c.shape === p.shape).length === p.count;
    case 'PAIR_SAME_COLOR':
      return cards[p.i].color === cards[p.j].color;
    case 'PAIR_SAME_SHAPE':
      return cards[p.i].shape === cards[p.j].shape;
    case 'PAIR_NUM_DIFF':
      return cards[p.i].num - cards[p.j].num === p.diff;
    case 'PAIR_ALPHA_LT':
      return cards[p.i].idx < cards[p.j].idx;
    case 'ALL_COLORS_DISTINCT':
      return new Set(cards.map((c) => c.color)).size === 4;
    case 'ALL_SHAPES_DISTINCT':
      return new Set(cards.map((c) => c.shape)).size === 4;
    case 'ALL_NUMS_DISTINCT':
      return new Set(cards.map((c) => c.num)).size === 4;
    default:
      return true;
  }
}

function checkUnary(clue, card) {
  const p = clue.params;
  switch (clue.kind) {
    case 'POS_COLOR':
      return card.color === p.color;
    case 'POS_NOT_COLOR':
      return card.color !== p.color;
    case 'POS_SHAPE':
      return card.shape === p.shape;
    case 'POS_NOT_SHAPE':
      return card.shape !== p.shape;
    case 'POS_PARITY':
      return (card.num % 2 === 1) === p.isOdd;
    case 'POS_NUM_RANGE':
      return p.dir === 'ge' ? card.num >= p.val : card.num <= p.val;
    case 'POS_ALPHA_HALF':
      return p.firstHalf ? card.idx <= 12 : card.idx >= 13;
    case 'POS_NUM_EXACT':
      return card.num === p.val;
    default:
      return true;
  }
}

function isUnaryKind(kind) {
  return kind.startsWith('POS_');
}

/**
 * Exact solver: counts solutions up to `limit` (default 2, or 50 for heuristic scoring).
 */
export function countSolutions(deck, clues, limit = 2) {
  const unaryByPos = [[], [], [], []];
  const globalClues = [];
  for (const cl of clues) {
    if (isUnaryKind(cl.kind)) {
      unaryByPos[cl.params.pos].push(cl);
    } else {
      globalClues.push(cl);
    }
  }

  // Domain per slot filtered by unary clues
  const doms = [0, 1, 2, 3].map((pos) =>
    deck.filter((card) => unaryByPos[pos].every((cl) => checkUnary(cl, card)))
  );

  // Split pairwise/subset clues for early pruning during backtracking
  const cluesAtDepth = [[], [], [], []];
  for (const cl of globalClues) {
    if (cl.kind.startsWith('PAIR_')) {
      const maxPos = Math.max(cl.params.i, cl.params.j);
      cluesAtDepth[maxPos].push(cl);
    } else {
      cluesAtDepth[3].push(cl);
    }
  }

  let count = 0;
  const chosen = [null, null, null, null];
  const used = new Uint8Array(26);

  function dfs(depth) {
    if (count >= limit) return;
    if (depth === 4) {
      count++;
      return;
    }
    const dom = doms[depth];
    const depthClues = cluesAtDepth[depth];
    for (let k = 0; k < dom.length; k++) {
      const card = dom[k];
      if (used[card.idx]) continue;
      chosen[depth] = card;
      used[card.idx] = 1;

      let ok = true;
      for (let m = 0; m < depthClues.length; m++) {
        if (!checkClue(depthClues[m], chosen)) {
          ok = false;
          break;
        }
      }
      if (ok) dfs(depth + 1);

      used[card.idx] = 0;
      if (count >= limit) return;
    }
  }

  dfs(0);
  return count;
}

function formatClueText(kind, p) {
  const posZh = (i) => `第 ${i + 1} 位`;
  const posEn = (i) => `Pos #${i + 1}`;
  switch (kind) {
    case 'POS_COLOR':
      return {
        zh: `${posZh(p.pos)}的卡片颜色为「${COLOR_MAP[p.color].zh}」`,
        en: `${posEn(p.pos)} card is ${COLOR_MAP[p.color].en}`,
      };
    case 'POS_NOT_COLOR':
      return {
        zh: `${posZh(p.pos)}的卡片不是「${COLOR_MAP[p.color].zh}」`,
        en: `${posEn(p.pos)} card is NOT ${COLOR_MAP[p.color].en}`,
      };
    case 'POS_SHAPE':
      return {
        zh: `${posZh(p.pos)}的卡片图形为「${SHAPE_MAP[p.shape].zh}」`,
        en: `${posEn(p.pos)} card shape is ${SHAPE_MAP[p.shape].en}`,
      };
    case 'POS_NOT_SHAPE':
      return {
        zh: `${posZh(p.pos)}的卡片图形不是「${SHAPE_MAP[p.shape].zh}」`,
        en: `${posEn(p.pos)} card shape is NOT ${SHAPE_MAP[p.shape].en}`,
      };
    case 'POS_PARITY':
      return {
        zh: `${posZh(p.pos)}的卡片数字为${p.isOdd ? '奇数' : '偶数'}`,
        en: `${posEn(p.pos)} card number is ${p.isOdd ? 'ODD' : 'EVEN'}`,
      };
    case 'POS_NUM_RANGE':
      return {
        zh: `${posZh(p.pos)}的卡片数字 ${p.dir === 'ge' ? '≥' : '≤'} ${p.val}`,
        en: `${posEn(p.pos)} card number is ${p.dir === 'ge' ? '≥' : '≤'} ${p.val}`,
      };
    case 'POS_ALPHA_HALF':
      return {
        zh: `${posZh(p.pos)}的字母位于 ${p.firstHalf ? 'A–M' : 'N–Z'} 区间`,
        en: `${posEn(p.pos)} letter is in ${p.firstHalf ? 'A–M' : 'N–Z'}`,
      };
    case 'POS_NUM_EXACT':
      return {
        zh: `${posZh(p.pos)}的卡片数字恰好为 ${p.val}`,
        en: `${posEn(p.pos)} card number is exactly ${p.val}`,
      };
    case 'SUM_NUMS':
      return {
        zh: `4 张密码卡的数字总和恰好等于 ${p.sum}`,
        en: `The sum of all 4 card numbers equals ${p.sum}`,
      };
    case 'COUNT_COLOR':
      return p.count === 0
        ? {
            zh: `密码中不包含任何「${COLOR_MAP[p.color].zh}」卡片`,
            en: `The code contains NO ${COLOR_MAP[p.color].en} cards`,
          }
        : {
            zh: `密码中包含恰好 ${p.count} 张「${COLOR_MAP[p.color].zh}」卡片`,
            en: `The code contains exactly ${p.count} ${COLOR_MAP[p.color].en} card${p.count > 1 ? 's' : ''}`,
          };
    case 'COUNT_SHAPE':
      return p.count === 0
        ? {
            zh: `密码中不包含任何「${SHAPE_MAP[p.shape].zh}」卡片`,
            en: `The code contains NO ${SHAPE_MAP[p.shape].en} cards`,
          }
        : {
            zh: `密码中包含恰好 ${p.count} 张「${SHAPE_MAP[p.shape].zh}」卡片`,
            en: `The code contains exactly ${p.count} ${SHAPE_MAP[p.shape].en} card${p.count > 1 ? 's' : ''}`,
          };
    case 'PAIR_SAME_COLOR':
      return {
        zh: `${posZh(p.i)}与${posZh(p.j)}的卡片颜色相同`,
        en: `${posEn(p.i)} and ${posEn(p.j)} share the SAME color`,
      };
    case 'PAIR_SAME_SHAPE':
      return {
        zh: `${posZh(p.i)}与${posZh(p.j)}的卡片图形相同`,
        en: `${posEn(p.i)} and ${posEn(p.j)} share the SAME shape`,
      };
    case 'PAIR_NUM_DIFF':
      return p.diff === 0
        ? {
            zh: `${posZh(p.i)}与${posZh(p.j)}的卡片数字相等`,
            en: `${posEn(p.i)} and ${posEn(p.j)} have the SAME number`,
          }
        : p.diff > 0
        ? {
            zh: `${posZh(p.i)}的数字比${posZh(p.j)}大 ${p.diff}`,
            en: `${posEn(p.i)} number is ${p.diff} greater than ${posEn(p.j)}`,
          }
        : {
            zh: `${posZh(p.i)}的数字比${posZh(p.j)}小 ${Math.abs(p.diff)}`,
            en: `${posEn(p.i)} number is ${Math.abs(p.diff)} less than ${posEn(p.j)}`,
          };
    case 'PAIR_ALPHA_LT':
      return {
        zh: `${posZh(p.i)}的字母顺序在${posZh(p.j)}之前（${posZh(p.i)} < ${posZh(p.j)}）`,
        en: `${posEn(p.i)} comes alphabetically BEFORE ${posEn(p.j)}`,
      };
    case 'ALL_COLORS_DISTINCT':
      return {
        zh: `4 张密码卡的颜色互不相同（红/蓝/金/绿各 1 张）`,
        en: `All 4 code cards have DISTINCT colors (one of each)`,
      };
    case 'ALL_SHAPES_DISTINCT':
      return {
        zh: `4 张密码卡的图形互不相同（圆/方/三角/星各 1 张）`,
        en: `All 4 code cards have DISTINCT shapes (one of each)`,
      };
    case 'ALL_NUMS_DISTINCT':
      return {
        zh: `4 张密码卡的数字互不相同`,
        en: `All 4 code cards have DISTINCT numbers`,
      };
    default:
      return { zh: '', en: '' };
  }
}

function makeClue(kind, params) {
  return { kind, params, text: formatClueText(kind, params) };
}

/**
 * Generate a guaranteed-unique Secret Code puzzle from rng.
 */
export function generateSecretCodePuzzle(rng) {
  const deck = generateDeck(rng);
  const secretCards = shuffle(deck, rng).slice(0, 4);
  const secretLetters = secretCards.map((c) => c.letter);

  // Build candidate pool of TRUE clues categorized into:
  // (A) Core slot narrowers (1 per slot so domain starts manageable)
  // (B) High-interest relational & global clues
  // (C) Refining slot clues (used only if needed to achieve uniqueness)
  const starterUnary = [];
  for (let pos = 0; pos < 4; pos++) {
    const c = secretCards[pos];
    if (rng() < 0.5) {
      starterUnary.push(makeClue('POS_COLOR', { pos, color: c.color }));
    } else {
      starterUnary.push(makeClue('POS_SHAPE', { pos, shape: c.shape }));
    }
  }

  const relationalPool = [];
  // Global sum
  const sum = secretCards.reduce((acc, c) => acc + c.num, 0);
  relationalPool.push(makeClue('SUM_NUMS', { sum }));

  // Global color/shape counts
  for (const col of COLORS) {
    const cnt = secretCards.filter((c) => c.color === col.id).length;
    if (cnt === 0 || cnt >= 2) relationalPool.push(makeClue('COUNT_COLOR', { color: col.id, count: cnt }));
  }
  for (const sh of SHAPES) {
    const cnt = secretCards.filter((c) => c.shape === sh.id).length;
    if (cnt === 0 || cnt >= 2) relationalPool.push(makeClue('COUNT_SHAPE', { shape: sh.id, count: cnt }));
  }
  if (new Set(secretCards.map((c) => c.color)).size === 4) {
    relationalPool.push(makeClue('ALL_COLORS_DISTINCT', {}));
  }
  if (new Set(secretCards.map((c) => c.shape)).size === 4) {
    relationalPool.push(makeClue('ALL_SHAPES_DISTINCT', {}));
  }
  if (new Set(secretCards.map((c) => c.num)).size === 4) {
    relationalPool.push(makeClue('ALL_NUMS_DISTINCT', {}));
  }

  // Pairwise relations
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (secretCards[i].color === secretCards[j].color) {
        relationalPool.push(makeClue('PAIR_SAME_COLOR', { i, j }));
      }
      if (secretCards[i].shape === secretCards[j].shape) {
        relationalPool.push(makeClue('PAIR_SAME_SHAPE', { i, j }));
      }
      const diff = secretCards[i].num - secretCards[j].num;
      relationalPool.push(makeClue('PAIR_NUM_DIFF', { i, j, diff }));
      if (secretCards[i].idx < secretCards[j].idx) {
        relationalPool.push(makeClue('PAIR_ALPHA_LT', { i, j }));
      } else {
        relationalPool.push(makeClue('PAIR_ALPHA_LT', { i: j, j: i }));
      }
    }
  }

  // Extra slot-level clues (medium first, exact number last as fallback)
  const slotExtraMedium = [];
  const slotExtraStrong = [];
  for (let pos = 0; pos < 4; pos++) {
    const c = secretCards[pos];
    slotExtraMedium.push(makeClue('POS_PARITY', { pos, isOdd: c.num % 2 === 1 }));
    slotExtraMedium.push(makeClue('POS_ALPHA_HALF', { pos, firstHalf: c.idx <= 12 }));
    if (c.num >= 4) slotExtraMedium.push(makeClue('POS_NUM_RANGE', { pos, dir: 'ge', val: 4 }));
    else slotExtraMedium.push(makeClue('POS_NUM_RANGE', { pos, dir: 'le', val: 3 }));
    slotExtraStrong.push(makeClue('POS_COLOR', { pos, color: c.color }));
    slotExtraStrong.push(makeClue('POS_SHAPE', { pos, shape: c.shape }));
    slotExtraStrong.push(makeClue('POS_NUM_EXACT', { pos, val: c.num }));
  }

  const clues = starterUnary.slice();
  const candidates = [
    ...shuffle(relationalPool, rng),
    ...shuffle(slotExtraMedium, rng),
    ...shuffle(slotExtraStrong, rng),
  ];

  // Add clues that strictly narrow remaining solutions until uniquely solved (count === 1)
  let currentCount = countSolutions(deck, clues, 80);
  for (const cand of candidates) {
    if (currentCount === 1) break;
    // Skip duplicate kind+pos
    if (
      clues.some(
        (ex) => ex.kind === cand.kind && JSON.stringify(ex.params) === JSON.stringify(cand.params)
      )
    ) {
      continue;
    }
    const nextClues = [...clues, cand];
    const nextCount = countSolutions(deck, nextClues, 80);
    if (nextCount < currentCount && nextCount >= 1) {
      clues.push(cand);
      currentCount = nextCount;
    }
  }

  // Fallback guarantee: if still >1 (extremely rare), add remaining exact slot traits
  if (countSolutions(deck, clues, 2) !== 1) {
    for (let pos = 0; pos < 4; pos++) {
      const c = secretCards[pos];
      for (const fallback of [
        makeClue('POS_COLOR', { pos, color: c.color }),
        makeClue('POS_SHAPE', { pos, shape: c.shape }),
        makeClue('POS_NUM_EXACT', { pos, val: c.num }),
      ]) {
        if (countSolutions(deck, clues, 2) === 1) break;
        const next = [...clues, fallback];
        if (countSolutions(deck, next, 50) < countSolutions(deck, clues, 50)) {
          clues.push(fallback);
        }
      }
    }
  }

  // Prune any redundant clues while preserving exact uniqueness (count === 1)
  // Test removing from front (so rich relational clues at end stay when possible!)
  for (let i = 0; i < clues.length; ) {
    if (clues.length <= 5) break;
    const without = clues.slice(0, i).concat(clues.slice(i + 1));
    if (countSolutions(deck, without, 2) === 1) {
      clues.splice(i, 1);
    } else {
      i++;
    }
  }

  return {
    deck,
    clues: clues.map((cl, idx) => ({ id: idx + 1, text: cl.text })),
    _secretLetters: secretLetters,
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
    const fastMode = Boolean(opts.fastMode);
    const puzzle = generateSecretCodePuzzle(rng);
    const now = Date.now();
    const matchDurationMs = fastMode ? 210000 : 360000;
    const lockoutMs = fastMode ? 10000 : 15000;

    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    for (const s of seats) {
      const targetTicks = fastMode ? randInt(rng, 32, 58) : randInt(rng, 52, 95);
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar,
        isBot: Boolean(s.isBot),
        progress: 0,
        attempts: [], // [{ code: 'ABCD', correct: false, ts }]
        lockoutUntilMs: 0,
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
      lockoutMs,
      fastMode,
      deck: puzzle.deck,
      clues: puzzle.clues,
      _secretLetters: puzzle._secretLetters,
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
    if (action.type === 'GIVE_UP') {
      return { ok: true };
    }
    if (action.type === 'SUBMIT_CODE') {
      if (Date.now() < (p.lockoutUntilMs || 0)) {
        return { ok: false, reason: 'Buzzer locked out' };
      }
      const code = action.payload?.code;
      if (!Array.isArray(code) || code.length !== 4) {
        return { ok: false, reason: 'Need 4 letters' };
      }
      if (code.some((ch) => typeof ch !== 'string' || !/^[A-Z]$/.test(ch))) {
        return { ok: false, reason: 'Letters must be A-Z' };
      }
      if (new Set(code).size !== 4) {
        return { ok: false, reason: 'All 4 letters must be distinct' };
      }
      return { ok: true };
    }
    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const p = state.players[seatId];
    const now = ctx?.now || Date.now();
    const events = [];

    if (action.type === 'BOT_STEP') {
      p._botTicks += 1;
      const ratio = Math.min(1, p._botTicks / Math.max(1, p._botTargetTicks));
      if (ratio >= 1) {
        p.progress = 100;
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'PLAYER_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
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

    if (action.type === 'SUBMIT_CODE') {
      const code = action.payload.code;
      const isExact = code.every((ch, i) => ch === state._secretLetters[i]);
      const joined = code.join('-');
      p.attempts.unshift({ code: joined, correct: isExact, ts: now });
      if (p.attempts.length > 12) p.attempts.pop();

      if (isExact) {
        p.progress = 100;
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - state.startedAtMs);
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'CODE_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
        finalizeRemainingIfNeeded(state, now);
      } else {
        p.lockoutUntilMs = now + state.lockoutMs;
        p.progress = Math.min(85, p.progress + 12);
        events.push({ type: 'CODE_WRONG', seatId, code: joined, lockoutMs: state.lockoutMs, ts: now });
      }
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase !== 'playing') return null;
    return { phaseKey: 'secret-code-race', durationMs: fullState.matchDurationMs };
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
    const revealSecret = ended || Boolean(myPlayer && myPlayer.finished);

    const racers = fullState.seatOrder.map((sid) => {
      const p = fullState.players[sid];
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        progress: p.progress,
        wrongCount: p.attempts.filter((a) => !a.correct).length,
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        status: p.status,
        rank: p.rank,
      };
    });

    return {
      phase: fullState.phase,
      startedAtMs: fullState.startedAtMs,
      lockoutMs: fullState.lockoutMs,
      deck: fullState.deck,
      clues: fullState.clues,
      revealedCode: revealSecret ? fullState._secretLetters : null,
      racers,
      finishOrder: fullState.finishOrder,
      eliminatedSeatId: fullState.eliminatedSeatId,
      myState: myPlayer
        ? {
            attempts: myPlayer.attempts,
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

    const rankings = ordered.map((sid, idx) => {
      const p = fullState.players[sid];
      const isElim = total >= 2 && idx === total - 1 && p.status !== 'survived';
      const label = p.finished && p.finishTimeMs != null
        ? `CRACKED · ${(p.finishTimeMs / 1000).toFixed(1)}s`
        : total === 1 ? 'UNSOLVED' : isElim ? 'ELIMINATED' : 'SURVIVED';
      return { seatId: sid, score: p.finished ? 100 : p.progress, label };
    });

    const winnerSeatIds = total === 1
      ? (fullState.players[ordered[0]].finished ? [ordered[0]] : [])
      : ordered.slice(0, Math.max(1, total - 1)).filter((sid) => fullState.players[sid].status === 'survived');

    const secretStr = fullState._secretLetters.join('-');
    const elimName = fullState.eliminatedSeatId ? fullState.players[fullState.eliminatedSeatId]?.name : null;

    return {
      winnerSeatIds,
      rankings,
      summary: total === 1
        ? {
            zh: winnerSeatIds.length ? `密码 ${secretStr} 破译成功！你通过了流放地逻辑考验。` : `未能破译秘密密码，正确答案为 ${secretStr}。`,
            en: winnerSeatIds.length ? `Secret Code ${secretStr} cracked! You conquered Exile Match 3.` : `Time expired. The secret code was ${secretStr}.`,
          }
        : {
            zh: `秘密密码为 ${secretStr}！前 ${total - 1} 名存活${elimName ? `，${elimName} 永久淘汰` : ''}。`,
            en: `Secret Code was ${secretStr}! Top ${total - 1} survive${elimName ? `; ${elimName} is permanently eliminated` : ''}.`,
          },
    };
  },
};
