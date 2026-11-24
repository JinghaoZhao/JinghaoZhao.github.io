/**
 * Same Number Hunt (같은 숫자 찾기 / 寻找相同数字) — Pure Deterministic Rules & 3-Tier AI
 * Seasons: S4E4 (also S3E12 Finals)
 *
 * - 4x4 hidden flip wall (A–P): integers 1..12 + 4 operators.
 *   • S4E4 Official (default): +, ×, ÷, √ (√x + √y for +2 bonus points!)
 *   • S3E12 Classic (toggle): +, −, ×, ÷ (all +1 point)
 * - Opening 5-second full-board flash, then all 16 tiles close.
 * - Target natural number drops -> Buzzer Race -> 5s answer window to pick [Num] [Op] [Num].
 * - Valid exact match = +1 pt (+2 for √x+√y); first to 10 points wins!
 * - Wrong answer flips all 3 tiles publicly for 2.5s and rebounds UNTIMED to opponent.
 * - Timeout flips 0 tiles and rebounds UNTIMED to opponent.
 * - Between rounds (S4E4 rule): 1 tile (cycling A → P) flips open for 3s to refresh memory!
 */

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
export const INITIAL_FLASH_MS = 6500; // Includes ~1.5s Death Match VS intro splash -> full 5s clear look
export const ANSWER_LIMIT_MS = 5000;
export const RELAXED_ANSWER_MS = 8000;
export const EVAL_REVEAL_MS = 2600;
export const HINT_REVEAL_MS = 3000;
export const PERFECT_SQUARES = new Set([1, 4, 9]);

function shuffle(arr, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || seatId;
}

function createDeck(classicMode, rng) {
  const tiles = [];
  for (let n = 1; n <= 12; n++) {
    tiles.push({ kind: 'num', value: n, display: String(n) });
  }
  const ops = classicMode
    ? [
        { kind: 'op', value: '+', display: '+' },
        { kind: 'op', value: '-', display: '−' },
        { kind: 'op', value: '*', display: '×' },
        { kind: 'op', value: '/', display: '÷' },
      ]
    : [
        { kind: 'op', value: '+', display: '+' },
        { kind: 'op', value: '*', display: '×' },
        { kind: 'op', value: '/', display: '÷' },
        { kind: 'op', value: 'sqrt', display: '√x+√y' },
      ];
  return shuffle([...tiles, ...ops], rng);
}

/**
 * Evaluates 3 chosen tiles in strict order: [NumA] [Op] [NumB].
 * Returns { validSyntax, result, points, formulaText }
 */
export function evaluateEquation(tileA, tileOp, tileB, target) {
  if (!tileA || !tileOp || !tileB) {
    return { validSyntax: false, matched: false, result: null, points: 0, formulaText: '?' };
  }
  if (tileA.kind !== 'num' || tileOp.kind !== 'op' || tileB.kind !== 'num') {
    const expr = `${tileA.display} ${tileOp.display} ${tileB.display}`;
    return { validSyntax: false, matched: false, result: null, points: 0, formulaText: expr };
  }

  const a = tileA.value;
  const b = tileB.value;
  let result = null;
  let points = 1;
  let formulaText = `${a} ${tileOp.display} ${b}`;

  if (tileOp.value === '+') {
    result = a + b;
  } else if (tileOp.value === '-') {
    result = a - b;
  } else if (tileOp.value === '*') {
    result = a * b;
  } else if (tileOp.value === '/') {
    if (b !== 0 && a % b === 0) result = a / b;
  } else if (tileOp.value === 'sqrt') {
    formulaText = `√${a} + √${b}`;
    if (PERFECT_SQUARES.has(a) && PERFECT_SQUARES.has(b)) {
      result = Math.round(Math.sqrt(a)) + Math.round(Math.sqrt(b));
      points = 2;
    }
  }

  const matched = result !== null && result === target;
  return {
    validSyntax: true,
    matched,
    result,
    points: matched ? points : 0,
    formulaText: result !== null ? `${formulaText} = ${result}` : `${formulaText} = ✗`,
  };
}

/** Compute all solvable natural targets on the board, ordered in an exciting broadcast mix */
function generateTargetPool(board, rng) {
  const solvable = new Set();
  const nums = [];
  const ops = [];
  board.forEach((t, idx) => {
    if (t.kind === 'num') nums.push({ ...t, idx });
    else ops.push({ ...t, idx });
  });

  for (const a of nums) {
    for (const b of nums) {
      if (a.idx === b.idx) continue;
      for (const op of ops) {
        const ev = evaluateEquation(a, op, b, -1);
        if (ev.result !== null && Number.isInteger(ev.result) && ev.result >= 1) {
          solvable.add(ev.result);
        }
      }
    }
  }

  const all = [...solvable];
  // Prioritize interesting targets (include 3, 4, 5 early/mid for √x+√y drama, plus rich sums/products)
  const lowMid = shuffle(all.filter((n) => n >= 2 && n <= 36), rng);
  const high = shuffle(all.filter((n) => n > 36), rng);
  const ones = all.filter((n) => n === 1);

  const mixed = [];
  let i = 0;
  let j = 0;
  while (i < lowMid.length || j < high.length) {
    if (i < lowMid.length) mixed.push(lowMid[i++]);
    if (i < lowMid.length) mixed.push(lowMid[i++]);
    if (j < high.length) mixed.push(high[j++]);
  }
  return [...mixed, ...ones];
}

function findSolutionsInMemory(knownMap, target) {
  const nums = [];
  const ops = [];
  for (const [idxStr, tile] of Object.entries(knownMap)) {
    const idx = Number(idxStr);
    if (tile.kind === 'num') nums.push({ ...tile, idx });
    else ops.push({ ...tile, idx });
  }
  const solutions = [];
  for (const a of nums) {
    for (const b of nums) {
      if (a.idx === b.idx) continue;
      for (const op of ops) {
        const ev = evaluateEquation(a, op, b, target);
        if (ev.matched) {
          solutions.push({ picks: [a.idx, op.idx, b.idx], points: ev.points });
        }
      }
    }
  }
  // Sort highest points first (+2 sqrt bonus prioritized!)
  solutions.sort((x, y) => y.points - x.points);
  return solutions;
}

function computeBotBuzzWindowMs(state, rng) {
  const botId = state.seatOrder.find((id) => state.players[id].isBot);
  if (!botId) return null; // PvP: untimed buzzer race
  const bot = state.players[botId];
  const diff = bot.difficulty || state.difficulty || 'genius';
  const mem = state.botMemory[botId] || {};
  const sols = findSolutionsInMemory(mem, state.target);

  if (sols.length > 0) {
    if (diff === 'grand_final') return Math.round(1800 + rng() * 1100); // 1.8s - 2.9s
    if (diff === 'genius') return Math.round(2900 + rng() * 1700); // 2.9s - 4.6s
    return Math.round(4800 + rng() * 2400); // 4.8s - 7.2s
  }
  // Bot doesn't know a complete solution yet — takes longer before guessing
  if (diff === 'grand_final') return Math.round(3800 + rng() * 1800);
  if (diff === 'genius') return Math.round(5200 + rng() * 2200);
  return Math.round(6800 + rng() * 2600);
}

function recordTileSightForBots(state, indices, rng) {
  for (const seatId of state.seatOrder) {
    const p = state.players[seatId];
    if (!p.isBot) continue;
    const diff = p.difficulty || state.difficulty || 'genius';
    const prob = diff === 'grand_final' ? 1.0 : diff === 'genius' ? 0.94 : 0.72;
    const mem = state.botMemory[seatId];
    for (const idx of indices) {
      if (rng() <= prob) {
        mem[idx] = state.board[idx];
      }
    }
  }
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opts = ctx.options || {};
    const classicMode = Boolean(opts.classicMode);
    const winScore = Number(opts.winScore) === 7 ? 7 : 10;
    const answerMs = opts.relaxedTimer ? RELAXED_ANSWER_MS : ANSWER_LIMIT_MS;

    const board = createDeck(classicMode, rng);
    const targetPool = generateTargetPool(board, rng);

    const s0 = seats[0];
    const s1 = seats[1];
    const seatOrder = [s0.seatId, s1.seatId];

    const players = {
      [s0.seatId]: {
        seatId: s0.seatId,
        name: s0.name,
        avatar: s0.avatar,
        isBot: Boolean(s0.isBot),
        difficulty: s0.difficulty || diff,
        color: 'cyan',
        score: 0,
        solved: 0,
        sqrtBonuses: 0,
      },
      [s1.seatId]: {
        seatId: s1.seatId,
        name: s1.name,
        avatar: s1.avatar,
        isBot: Boolean(s1.isBot),
        difficulty: s1.difficulty || diff,
        color: 'garnet',
        score: 0,
        solved: 0,
        sqrtBonuses: 0,
      },
    };

    // Initial 5-second flash retention for AI bots
    const botMemory = {};
    for (const s of seats) {
      botMemory[s.seatId] = {};
      if (s.isBot) {
        const d = s.difficulty || diff;
        const keepCount = d === 'grand_final' ? 14 : d === 'genius' ? 11 : 6;
        const idxPool = shuffle(
          Array.from({ length: 16 }, (_, i) => i),
          rng
        );
        for (let k = 0; k < keepCount; k++) {
          botMemory[s.seatId][idxPool[k]] = board[idxPool[k]];
        }
      }
    }

    return {
      phase: 'INITIAL_FLASH', // 'INITIAL_FLASH' | 'BUZZ_OPEN' | 'ANSWERING' | 'EVAL_REVEAL' | 'HINT_REVEAL' | 'ENDED'
      round: 1,
      stepSeq: 1,
      phaseLabel: { zh: '全盘记忆 (5秒)', en: 'Memorize Board (5s)' },
      difficulty: diff,
      classicMode,
      winScore,
      answerMs,
      options: opts,
      seatOrder,
      players,
      board, // Host-only 16 tiles (STRICTLY hidden in projectState when closed!)
      targetPool, // Host-only upcoming targets
      target: null,
      currentTurnSeatId: null, // Set to activeBuzzerSeatId during ANSWERING
      activeBuzzerSeatId: null,
      isRebound: false,
      reboundAttempts: 0,
      selectedPicks: [], // 0..3 tile indices
      evalResult: null, // { seatId, picks, matched, validSyntax, result, points, formulaText, timedOut }
      hintTileIdx: null,
      hintCursor: 0,
      botBuzzWindowMs: null,
      botPlannedPicks: null, // Host-only bot's planned 3 picks for current answer
      botMemory, // Host-only AI memory
      winnerSeatId: null,
      history: [],
    };
  },

  _startNextTarget(next, rng) {
    if (next.targetPool.length === 0) {
      next.targetPool = generateTargetPool(next.board, rng);
    }
    next.target = next.targetPool.shift();
    next.phase = 'BUZZ_OPEN';
    next.activeBuzzerSeatId = null;
    next.currentTurnSeatId = null;
    next.isRebound = false;
    next.reboundAttempts = 0;
    next.selectedPicks = [];
    next.evalResult = null;
    next.hintTileIdx = null;
    next.botPlannedPicks = null;
    next.stepSeq += 1;
    next.botBuzzWindowMs = computeBotBuzzWindowMs(next, rng);
    next.phaseLabel = {
      zh: `目标 ${next.target} · 抢答开始!`,
      en: `Target ${next.target} · BUZZ IN!`,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ENDED') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };

    if (action.type === 'SKIP_FLASH') {
      if (fullState.phase !== 'INITIAL_FLASH' && fullState.phase !== 'HINT_REVEAL' && fullState.phase !== 'EVAL_REVEAL') {
        return { ok: false, reason: 'Cannot skip in this phase' };
      }
      return { ok: true };
    }

    if (action.type === 'BUZZ') {
      if (fullState.phase !== 'BUZZ_OPEN') {
        return { ok: false, reason: 'Buzzer is locked' };
      }
      const targetBuzzer = action.payload?.buzzerSeatId || seatId;
      if (!fullState.players[targetBuzzer]) return { ok: false, reason: 'Unknown seat' };
      return { ok: true };
    }

    if (action.type === 'PICK_TILE') {
      if (fullState.phase !== 'ANSWERING') {
        return { ok: false, reason: 'Not in answering phase' };
      }
      if (fullState.activeBuzzerSeatId !== seatId) {
        return { ok: false, reason: 'Opponent holds the buzzer' };
      }
      const idx = Number(action.payload?.tileIdx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= 16) {
        return { ok: false, reason: 'Invalid tile' };
      }
      if (fullState.selectedPicks.includes(idx)) {
        return { ok: false, reason: 'Must select 3 distinct tiles' };
      }
      if (fullState.selectedPicks.length >= 3) {
        return { ok: false, reason: 'Already picked 3 tiles' };
      }
      return { ok: true };
    }

    if (action.type === 'CLEAR_PICKS') {
      if (fullState.phase !== 'ANSWERING' || fullState.activeBuzzerSeatId !== seatId) {
        return { ok: false, reason: 'Cannot clear now' };
      }
      return { ok: true };
    }

    if (action.type === 'PASS_REBOUND') {
      if (fullState.phase !== 'ANSWERING' || !fullState.isRebound || fullState.activeBuzzerSeatId !== seatId) {
        return { ok: false, reason: 'Can only pass during rebound' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const rng = ctx.rng;
    const events = [];

    if (action.type === 'SKIP_FLASH') {
      return this.onPhaseTimeout(next, ctx) || { state: next, events };
    }

    if (action.type === 'BUZZ') {
      const buzzerId = action.payload?.buzzerSeatId && next.players[action.payload.buzzerSeatId]
        ? action.payload.buzzerSeatId
        : seatId;
      next.phase = 'ANSWERING';
      next.activeBuzzerSeatId = buzzerId;
      next.currentTurnSeatId = buzzerId;
      next.isRebound = false;
      next.selectedPicks = [];
      next.botPlannedPicks = null;
      next.stepSeq += 1;
      next.phaseLabel = {
        zh: `${next.players[buzzerId].name} 抢答成功！5秒作答`,
        en: `${next.players[buzzerId].name} buzzed! Pick 3 tiles`,
      };
      events.push({ type: 'BUZZED', seatId: buzzerId, target: next.target });
      return { state: next, events };
    }

    if (action.type === 'CLEAR_PICKS') {
      next.selectedPicks = [];
      events.push({ type: 'PICKS_CLEARED', seatId });
      return { state: next, events };
    }

    if (action.type === 'PASS_REBOUND') {
      next.reboundAttempts += 1;
      if (next.reboundAttempts >= 2) {
        // Both players couldn't solve -> move to next target with 1-tile hint!
        this._enterHintOrNext(next, rng);
        events.push({ type: 'TARGET_SKIPPED', target: fullState.target });
      } else {
        const opp = getOtherSeatId(next, seatId);
        next.activeBuzzerSeatId = opp;
        next.currentTurnSeatId = opp;
        next.selectedPicks = [];
        next.botPlannedPicks = null;
        next.stepSeq += 1;
        next.phaseLabel = {
          zh: `机会移交 ${next.players[opp].name}（不限时）`,
          en: `Rebound to ${next.players[opp].name} (Untimed)`,
        };
        events.push({ type: 'REBOUND_PASS', seatId, nextSeatId: opp });
      }
      return { state: next, events };
    }

    if (action.type === 'PICK_TILE') {
      const idx = Number(action.payload.tileIdx);
      next.selectedPicks.push(idx);
      events.push({ type: 'TILE_SELECTED', seatId, tileIdx: idx, count: next.selectedPicks.length });

      if (next.selectedPicks.length === 3) {
        const [i0, i1, i2] = next.selectedPicks;
        const ev = evaluateEquation(next.board[i0], next.board[i1], next.board[i2], next.target);
        // All 3 tiles flip open publicly so bots learn them too!
        recordTileSightForBots(next, [i0, i1, i2], rng);

        next.phase = 'EVAL_REVEAL';
        next.stepSeq += 1;
        next.evalResult = {
          seatId,
          picks: [i0, i1, i2],
          letters: [LETTERS[i0], LETTERS[i1], LETTERS[i2]],
          ...ev,
          timedOut: false,
        };

        if (ev.matched) {
          const p = next.players[seatId];
          p.score += ev.points;
          p.solved += 1;
          if (ev.points === 2) p.sqrtBonuses += 1;
          next.phaseLabel = {
            zh: `等式成立！+${ev.points} 分`,
            en: `EXACT MATCH! +${ev.points} PT${ev.points > 1 ? 'S' : ''}`,
          };
          next.history.push({
            round: next.round,
            seatId,
            target: next.target,
            formula: ev.formulaText,
            points: ev.points,
          });
          if (next.history.length > 20) next.history.shift();
          events.push({
            type: 'EQUATION_SOLVED',
            seatId,
            points: ev.points,
            formula: ev.formulaText,
            target: next.target,
          });
        } else {
          next.phaseLabel = {
            zh: '等式不成立！机会移交对手',
            en: 'INVALID! Rebound to Opponent',
          };
          events.push({
            type: 'EQUATION_WRONG',
            seatId,
            formula: ev.formulaText,
            target: next.target,
          });
        }
      }
      return { state: next, events };
    }

    return { state: next, events };
  },

  _enterHintOrNext(next, rng) {
    next.round += 1;
    next.evalResult = null;
    next.selectedPicks = [];
    next.activeBuzzerSeatId = null;
    next.currentTurnSeatId = null;

    if (!next.classicMode) {
      // S4E4 progressive 1-tile 3-second memory refresh (cycling A -> P)
      const hintIdx = next.hintCursor % 16;
      next.hintCursor += 1;
      next.hintTileIdx = hintIdx;
      next.phase = 'HINT_REVEAL';
      next.stepSeq += 1;
      recordTileSightForBots(next, [hintIdx], rng);
      next.phaseLabel = {
        zh: `记忆补给：公开 [${LETTERS[hintIdx]}] 3秒`,
        en: `Memory Refresh: [${LETTERS[hintIdx]}] (3s)`,
      };
    } else {
      this._startNextTarget(next, rng);
    }
  },

  getPhaseTimer(fullState) {
    if (!fullState) return null;
    if (fullState.phase === 'INITIAL_FLASH') {
      return { phaseKey: 'initial-flash', durationMs: INITIAL_FLASH_MS };
    }
    if (fullState.phase === 'BUZZ_OPEN' && fullState.botBuzzWindowMs) {
      return {
        phaseKey: `buzz-${fullState.round}-${fullState.stepSeq}`,
        durationMs: fullState.botBuzzWindowMs,
      };
    }
    if (fullState.phase === 'ANSWERING' && !fullState.isRebound) {
      return {
        phaseKey: `answer-${fullState.round}-${fullState.stepSeq}`,
        durationMs: fullState.answerMs,
      };
    }
    if (fullState.phase === 'EVAL_REVEAL') {
      return {
        phaseKey: `eval-${fullState.round}-${fullState.stepSeq}`,
        durationMs: EVAL_REVEAL_MS,
      };
    }
    if (fullState.phase === 'HINT_REVEAL') {
      return {
        phaseKey: `hint-${fullState.round}-${fullState.stepSeq}`,
        durationMs: HINT_REVEAL_MS,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState) return null;
    const next = cloneState(fullState);
    const rng = ctx.rng;

    if (next.phase === 'INITIAL_FLASH') {
      this._startNextTarget(next, rng);
      return { state: next, events: [{ type: 'FLASH_ENDED', target: next.target }] };
    }

    if (next.phase === 'BUZZ_OPEN') {
      const bots = next.seatOrder.filter((id) => next.players[id].isBot);
      if (bots.length > 0) {
        const botId = bots.length === 1 ? bots[0] : bots[Math.floor(rng() * bots.length)];
        return this.applyAction(next, botId, { type: 'BUZZ' }, ctx);
      }
      return null;
    }

    if (next.phase === 'ANSWERING' && !next.isRebound) {
      // 5-second buzzer timeout -> 0 tiles flip, untimed rebound to opponent!
      const timedOutSeat = next.activeBuzzerSeatId;
      const opp = getOtherSeatId(next, timedOutSeat);
      next.activeBuzzerSeatId = opp;
      next.currentTurnSeatId = opp;
      next.isRebound = true;
      next.reboundAttempts = 0;
      next.selectedPicks = [];
      next.botPlannedPicks = null;
      next.stepSeq += 1;
      next.phaseLabel = {
        zh: `作答超时！不限时机会转交 ${next.players[opp].name}`,
        en: `TIME UP! Untimed Rebound to ${next.players[opp].name}`,
      };
      return {
        state: next,
        events: [{ type: 'ANSWER_TIMEOUT', seatId: timedOutSeat, nextSeatId: opp }],
      };
    }

    if (next.phase === 'EVAL_REVEAL') {
      const ev = next.evalResult;
      if (ev?.matched) {
        const scorer = next.players[ev.seatId];
        if (scorer.score >= next.winScore) {
          next.phase = 'ENDED';
          next.winnerSeatId = ev.seatId;
          next.phaseLabel = { zh: '数字对决封王！', en: 'Victory!' };
          return { state: next, events: [{ type: 'MATCH_WIN', seatId: ev.seatId }] };
        }
        this._enterHintOrNext(next, rng);
        return { state: next, events: [{ type: 'NEXT_ROUND', round: next.round }] };
      }

      // Wrong answer -> rebound to opponent (if already bounced twice, refresh target)
      const prevSeat = ev?.seatId || next.activeBuzzerSeatId;
      next.reboundAttempts += 1;
      if (next.reboundAttempts >= 3) {
        this._enterHintOrNext(next, rng);
        return { state: next, events: [{ type: 'TARGET_SKIPPED', target: next.target }] };
      }
      const opp = getOtherSeatId(next, prevSeat);
      next.phase = 'ANSWERING';
      next.activeBuzzerSeatId = opp;
      next.currentTurnSeatId = opp;
      next.isRebound = true;
      next.selectedPicks = [];
      next.evalResult = null;
      next.botPlannedPicks = null;
      next.stepSeq += 1;
      next.phaseLabel = {
        zh: `反击机会！${next.players[opp].name} 不限作答时间`,
        en: `REBOUND! ${next.players[opp].name} (Untimed)`,
      };
      return { state: next, events: [{ type: 'REBOUND_START', seatId: opp }] };
    }

    if (next.phase === 'HINT_REVEAL') {
      this._startNextTarget(next, rng);
      return { state: next, events: [{ type: 'TARGET_READY', target: next.target }] };
    }

    return null;
  },

  projectState(fullState, _viewerSeatId) {
    if (!fullState) return null;
    const isEnded = fullState.phase === 'ENDED';
    const evalPicks =
      fullState.phase === 'EVAL_REVEAL' && fullState.evalResult
        ? new Set(fullState.evalResult.picks)
        : new Set();

    // STRICTLY sanitize unrevealed tiles!
    const tiles = LETTERS.map((letter, idx) => {
      const open =
        isEnded ||
        fullState.phase === 'INITIAL_FLASH' ||
        (fullState.phase === 'HINT_REVEAL' && fullState.hintTileIdx === idx) ||
        evalPicks.has(idx);
      const t = fullState.board[idx];
      return {
        idx,
        letter,
        revealed: open,
        kind: open ? t.kind : null,
        value: open ? t.value : null,
        display: open ? t.display : null,
      };
    });

    return {
      phase: fullState.phase,
      round: fullState.round,
      stepSeq: fullState.stepSeq,
      phaseLabel: fullState.phaseLabel,
      classicMode: fullState.classicMode,
      winScore: fullState.winScore,
      seatOrder: fullState.seatOrder,
      players: fullState.players,
      tiles,
      target: fullState.target,
      currentTurnSeatId: fullState.currentTurnSeatId,
      activeBuzzerSeatId: fullState.activeBuzzerSeatId,
      isRebound: fullState.isRebound,
      selectedPicks: fullState.selectedPicks,
      evalResult: fullState.evalResult,
      hintTileIdx: fullState.hintTileIdx,
      winnerSeatId: fullState.winnerSeatId,
      history: fullState.history,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase !== 'ANSWERING') return null;
    if (fullState.activeBuzzerSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const bot = fullState.players[botSeatId];
    const diff = ctx.difficulty || bot.difficulty || 'genius';
    const mem = fullState.botMemory[botSeatId] || {};
    const alreadyPicked = fullState.selectedPicks || [];

    // Plan a 3-tile sequence from bot memory
    const sols = findSolutionsInMemory(mem, fullState.target);
    let targetPlan = null;

    if (sols.length > 0) {
      // Easy bot occasionally slips on one letter
      if (diff === 'easy' && rng() < 0.18) {
        targetPlan = null;
      } else {
        targetPlan = sols[0].picks;
      }
    }

    if (!targetPlan) {
      // Build best partial guess: [known num or unknown] -> [known op or unknown] -> [known num or unknown]
      const knownNums = [];
      const knownOps = [];
      const unknown = [];
      for (let i = 0; i < 16; i++) {
        if (!mem[i]) unknown.push(i);
        else if (mem[i].kind === 'num') knownNums.push(i);
        else knownOps.push(i);
      }

      // Try partial match where 2 of 3 are known!
      let partial = null;
      if (unknown.length > 0) {
        for (const aIdx of knownNums) {
          for (const opIdx of knownOps) {
            const a = mem[aIdx].value;
            const op = mem[opIdx].value;
            // Check if some missing number b could satisfy a op b === target
            let neededB = null;
            if (op === '+') neededB = fullState.target - a;
            else if (op === '-') neededB = a - fullState.target;
            else if (op === '*' && fullState.target % a === 0) neededB = fullState.target / a;
            else if (op === '/' && a % fullState.target === 0) neededB = a / fullState.target;
            else if (op === 'sqrt' && PERFECT_SQUARES.has(a)) {
              const rem = fullState.target - Math.round(Math.sqrt(a));
              if (rem >= 1 && rem <= 3) neededB = rem * rem;
            }
            if (neededB !== null && neededB >= 1 && neededB <= 12 && neededB !== a) {
              // Ensure neededB isn't already known elsewhere
              const knownElsewhere = knownNums.some((k) => mem[k].value === neededB);
              if (!knownElsewhere) {
                partial = [aIdx, opIdx, unknown[Math.floor(rng() * unknown.length)]];
                break;
              }
            }
          }
          if (partial) break;
        }
      }

      if (partial) {
        targetPlan = partial;
      } else {
        // Pure exploration pick: 3 distinct tiles respecting Num-Op-Num where known
        const pool = shuffle(
          Array.from({ length: 16 }, (_, i) => i),
          rng
        );
        const p0 = knownNums[0] ?? unknown[0] ?? pool[0];
        const p1 =
          knownOps.find((x) => x !== p0) ??
          unknown.find((x) => x !== p0) ??
          pool.find((x) => x !== p0);
        const p2 =
          unknown.find((x) => x !== p0 && x !== p1) ??
          knownNums.find((x) => x !== p0 && x !== p1) ??
          pool.find((x) => x !== p0 && x !== p1);
        targetPlan = [p0, p1, p2];
      }
    }

    // Pick the next step in targetPlan consistent with alreadyPicked
    const stepIdx = alreadyPicked.length;
    let pick = targetPlan[stepIdx];
    if (pick == null || alreadyPicked.includes(pick)) {
      for (let i = 0; i < 16; i++) {
        if (!alreadyPicked.includes(i)) {
          pick = i;
          break;
        }
      }
    }
    return { type: 'PICK_TILE', payload: { tileIdx: pick } };
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
          label: `${winner.name} (${winner.score} pts${winner.sqrtBonuses ? ` · ${winner.sqrtBonuses}×√` : ''})`,
          score: winner.score,
        },
        {
          seatId: loser.seatId,
          label: `${loser.name} (${loser.score} pts${loser.sqrtBonuses ? ` · ${loser.sqrtBonuses}×√` : ''})`,
          score: loser.score,
        },
      ],
      summary: {
        zh: `${winner.name} 以 ${winner.score} : ${loser.score} 率先突破 ${state.winScore} 分，统治数字密室！`,
        en: `${winner.name} dominated the Math Vault ${winner.score}–${loser.score} (first to ${state.winScore})!`,
      },
    };
  },
};
