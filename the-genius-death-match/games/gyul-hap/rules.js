/**
 * Gyul! Hap! (결! 합! / 结!合!) — Pure Deterministic Rule Engine
 * Zero DOM access · Seeded RNG · Official S2E3 & S4E8 Rules
 */

export const SHAPES = ['circle', 'triangle', 'square'];
export const COLORS = ['red', 'yellow', 'blue'];
export const BGS = ['black', 'gray', 'white'];

const FULL_DECK = [];
for (const shape of SHAPES) {
  for (const color of COLORS) {
    for (const bg of BGS) {
      FULL_DECK.push({ id: `${shape}-${color}-${bg}`, shape, color, bg });
    }
  }
}

function shuffleWithRng(items, rng) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function attrValid(a, b, c) {
  return (a === b && b === c) || (a !== b && b !== c && a !== c);
}

export function isValidHapCards(c1, c2, c3) {
  if (!c1 || !c2 || !c3) return false;
  return (
    attrValid(c1.shape, c2.shape, c3.shape) &&
    attrValid(c1.color, c2.color, c3.color) &&
    attrValid(c1.bg, c2.bg, c3.bg)
  );
}

export function normalizeTriple(tiles) {
  if (!Array.isArray(tiles) || tiles.length !== 3) return null;
  const nums = tiles.map((n) => Number(n));
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 9)) return null;
  if (new Set(nums).size !== 3) return null;
  return nums.sort((a, b) => a - b);
}

export function tripleKey(triple) {
  return triple.join('-');
}

export function findAllHaps(board) {
  const haps = [];
  for (let i = 0; i < 9; i++) {
    for (let j = i + 1; j < 9; j++) {
      for (let k = j + 1; k < 9; k++) {
        if (isValidHapCards(board[i], board[j], board[k])) {
          haps.push([i + 1, j + 1, k + 1]);
        }
      }
    }
  }
  return haps;
}

function dealRoundBoard(rng) {
  const board = shuffleWithRng(FULL_DECK, rng).slice(0, 9);
  const allHaps = findAllHaps(board);
  return { board, allHaps };
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || seatId;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function getUnfoundHaps(state) {
  const foundKeys = new Set(state.foundHaps.map((h) => tripleKey(h.tiles)));
  return state.allHaps.filter((t) => !foundKeys.has(tripleKey(t)));
}

function finishRound(next, reason, winnerSeatId = null) {
  const unfound = getUnfoundHaps(next);
  next.missedHaps = unfound;
  next.roundEndReason = reason;
  next.roundHistory.push({
    round: next.round,
    reason,
    gyulBy: winnerSeatId,
    foundCount: next.foundHaps.length,
    totalHaps: next.allHaps.length,
    scores: { ...next.scores },
  });
  next.phase = 'round_end';
  next.phaseLabel = { zh: '回合结算', en: 'Round Recap' };
  next.phaseStep += 1;
}

function startNextRoundOrEnd(next, rng) {
  const [s0, s1] = next.seatOrder;
  const tied = next.scores[s0] === next.scores[s1];

  if (next.round >= next.totalRounds && !tied) {
    next.phase = 'ended';
    next.currentTurnSeatId = null;
    next.phaseLabel = { zh: '对决终局', en: 'Match Complete' };
    next.phaseStep += 1;
    return;
  }

  next.round += 1;
  next.isOvertime = next.round > next.totalRounds;
  const { board, allHaps } = dealRoundBoard(rng);
  next.board = board;
  next.allHaps = allHaps;
  next.foundHaps = [];
  next.missedHaps = [];
  next.staleTurns = 0;
  next.roundEndReason = null;
  next.roundStarterIdx = (next.roundStarterIdx + 1) % next.seatOrder.length;
  next.currentTurnSeatId = next.seatOrder[next.roundStarterIdx];
  next.phase = 'turn';
  next.phaseLabel = next.isOvertime
    ? { zh: '加时决胜回合', en: 'Sudden-Death Round' }
    : { zh: '搜索合与结', en: 'Scan for Hap / Gyul' };
  next.phaseStep += 1;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const totalRounds = Number(ctx?.options?.totalRounds) || 10;
    const turnSeconds = Number(ctx?.options?.turnSeconds) || 10;
    const starterIdx = ctx.rng() < 0.5 ? 0 : 1;
    const { board, allHaps } = dealRoundBoard(ctx.rng);

    const scores = {};
    const names = {};
    for (const s of seats.slice(0, 2)) {
      scores[s.seatId] = 0;
      names[s.seatId] = s.name;
    }

    return {
      phase: 'turn', // 'turn' | 'gyul_bonus' | 'round_end' | 'ended'
      round: 1,
      totalRounds,
      isOvertime: false,
      turnSeconds,
      phaseStep: 1,
      phaseLabel: { zh: '搜索合与结', en: 'Scan for Hap / Gyul' },
      seatOrder,
      names,
      scores,
      roundStarterIdx: starterIdx,
      currentTurnSeatId: seatOrder[starterIdx],
      board,
      allHaps,
      foundHaps: [], // Array<{ tiles: [a,b,c], bySeatId: string }>
      missedHaps: [],
      staleTurns: 0, // 5 consecutive turns without scoring ends round
      roundEndReason: null,
      roundHistory: [],
      lastFeedback: null, // { id, kind, seatId, tiles?, delta }
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match has ended' };
    }
    const { type, payload } = action || {};

    if (fullState.phase === 'round_end') {
      if (type === 'NEXT_ROUND') return { ok: true };
      return { ok: false, reason: 'Round is finished; advance to next round' };
    }

    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn' };
    }

    if (fullState.phase === 'gyul_bonus') {
      if (type === 'CALL_GYUL' || type === 'SKIP_BONUS') return { ok: true };
      return { ok: false, reason: 'Choose GYUL! (+3) or end bonus window' };
    }

    if (fullState.phase === 'turn') {
      if (type === 'CALL_HAP') {
        const triple = normalizeTriple(payload?.tiles);
        if (!triple) return { ok: false, reason: 'Select 3 distinct tiles (#1–#9)' };
        return { ok: true };
      }
      if (type === 'CALL_GYUL' || type === 'PASS') return { ok: true };
    }

    return { ok: false, reason: 'Unsupported action in current phase' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const { type, payload } = action;
    const events = [];

    if (next.phase === 'round_end' && type === 'NEXT_ROUND') {
      startNextRoundOrEnd(next, ctx.rng);
      events.push({ type: 'ROUND_START', round: next.round });
      return { state: next, events };
    }

    if (next.phase === 'gyul_bonus' && type === 'SKIP_BONUS') {
      next.currentTurnSeatId = getOtherSeatId(next, seatId);
      next.phase = 'turn';
      next.phaseLabel = { zh: '搜索合与结', en: 'Scan for Hap / Gyul' };
      next.phaseStep += 1;
      events.push({ type: 'BONUS_SKIPPED', seatId });
      return { state: next, events };
    }

    if (type === 'CALL_HAP') {
      const triple = normalizeTriple(payload.tiles);
      const key = tripleKey(triple);
      const alreadyFound = next.foundHaps.some((h) => tripleKey(h.tiles) === key);
      const valid = !alreadyFound && isValidHapCards(
        next.board[triple[0] - 1],
        next.board[triple[1] - 1],
        next.board[triple[2] - 1]
      );

      if (valid) {
        next.scores[seatId] += 1;
        next.foundHaps.push({ tiles: triple, bySeatId: seatId });
        next.staleTurns = 0;
        next.phase = 'gyul_bonus';
        next.phaseLabel = { zh: '合! 成功 · 5秒追喊结!', en: 'HAP! 5s GYUL Bonus Window' };
        next.phaseStep += 1;
        next.lastFeedback = {
          id: next.phaseStep,
          kind: 'hap_ok',
          seatId,
          tiles: triple,
          delta: 1,
        };
        events.push({ type: 'HAP_OK', seatId, tiles: triple, delta: 1 });
        return { state: next, events };
      }

      // Invalid or duplicate Hap: -1 pt, turn passes
      next.scores[seatId] -= 1;
      next.staleTurns += 1;
      next.lastFeedback = {
        id: next.phaseStep + 1,
        kind: alreadyFound ? 'hap_dup' : 'hap_fail',
        seatId,
        tiles: triple,
        delta: -1,
      };
      events.push({
        type: alreadyFound ? 'HAP_DUP' : 'HAP_FAIL',
        seatId,
        tiles: triple,
        delta: -1,
      });

      if (next.staleTurns >= 5) {
        finishRound(next, 'five_stale', null);
      } else {
        next.currentTurnSeatId = getOtherSeatId(next, seatId);
        next.phase = 'turn';
        next.phaseLabel = { zh: '搜索合与结', en: 'Scan for Hap / Gyul' };
        next.phaseStep += 1;
      }
      return { state: next, events };
    }

    if (type === 'CALL_GYUL') {
      const remaining = getUnfoundHaps(next);
      if (remaining.length === 0) {
        next.scores[seatId] += 3;
        next.lastFeedback = {
          id: next.phaseStep + 1,
          kind: 'gyul_ok',
          seatId,
          delta: 3,
        };
        events.push({ type: 'GYUL_OK', seatId, delta: 3 });
        finishRound(next, 'gyul', seatId);
        return { state: next, events };
      }

      // Wrong Gyul: -1 pt, turn passes
      next.scores[seatId] -= 1;
      next.staleTurns += 1;
      next.lastFeedback = {
        id: next.phaseStep + 1,
        kind: 'gyul_fail',
        seatId,
        delta: -1,
      };
      events.push({ type: 'GYUL_FAIL', seatId, delta: -1 });

      if (next.staleTurns >= 5) {
        finishRound(next, 'five_stale', null);
      } else {
        next.currentTurnSeatId = getOtherSeatId(next, seatId);
        next.phase = 'turn';
        next.phaseLabel = { zh: '搜索合与结', en: 'Scan for Hap / Gyul' };
        next.phaseStep += 1;
      }
      return { state: next, events };
    }

    if (type === 'PASS') {
      next.staleTurns += 1;
      next.lastFeedback = {
        id: next.phaseStep + 1,
        kind: 'pass',
        seatId,
        delta: 0,
      };
      events.push({ type: 'PASS', seatId });

      if (next.staleTurns >= 5) {
        finishRound(next, 'five_stale', null);
      } else {
        next.currentTurnSeatId = getOtherSeatId(next, seatId);
        next.phase = 'turn';
        next.phaseLabel = { zh: '搜索合与结', en: 'Scan for Hap / Gyul' };
        next.phaseStep += 1;
      }
      return { state: next, events };
    }

    return { state: next, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'ended') return null;
    if (fullState.phase === 'turn') {
      return {
        phaseKey: `r${fullState.round}-s${fullState.phaseStep}-turn`,
        durationMs: (fullState.turnSeconds || 10) * 1000,
      };
    }
    if (fullState.phase === 'gyul_bonus') {
      return {
        phaseKey: `r${fullState.round}-s${fullState.phaseStep}-bonus`,
        durationMs: 5000,
      };
    }
    if (fullState.phase === 'round_end') {
      return {
        phaseKey: `r${fullState.round}-s${fullState.phaseStep}-recap`,
        durationMs: 4500,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState || fullState.phase === 'ended') return null;
    if (fullState.phase === 'turn') {
      return GameRules.applyAction(fullState, fullState.currentTurnSeatId, { type: 'PASS' }, ctx);
    }
    if (fullState.phase === 'gyul_bonus') {
      return GameRules.applyAction(fullState, fullState.currentTurnSeatId, { type: 'SKIP_BONUS' }, ctx);
    }
    if (fullState.phase === 'round_end') {
      return GameRules.applyAction(fullState, fullState.seatOrder[0], { type: 'NEXT_ROUND' }, ctx);
    }
    return null;
  },

  projectState(fullState, _viewerSeatId) {
    if (!fullState) return null;
    const revealSolutions = fullState.phase === 'round_end' || fullState.phase === 'ended';
    return {
      phase: fullState.phase,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      isOvertime: fullState.isOvertime,
      turnSeconds: fullState.turnSeconds,
      phaseStep: fullState.phaseStep,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      names: fullState.names,
      scores: fullState.scores,
      currentTurnSeatId: fullState.currentTurnSeatId,
      board: fullState.board,
      foundHaps: fullState.foundHaps,
      missedHaps: revealSolutions ? fullState.missedHaps : [],
      totalHapsInRound: revealSolutions ? fullState.allHaps.length : null,
      staleTurns: fullState.staleTurns,
      roundEndReason: fullState.roundEndReason,
      roundHistory: fullState.roundHistory,
      lastFeedback: fullState.lastFeedback,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'ended' || fullState.phase === 'round_end') {
      return null;
    }
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const diff = ctx.difficulty || 'genius';
    const rng = ctx.rng;
    const unfound = getUnfoundHaps(fullState);
    const otherId = getOtherSeatId(fullState, botSeatId);
    const scoreDiff = fullState.scores[botSeatId] - fullState.scores[otherId];

    // Post-Hap 5-second Gyul bonus window
    if (fullState.phase === 'gyul_bonus') {
      if (unfound.length === 0) {
        const callProb = diff === 'grand_final' ? 0.98 : diff === 'genius' ? 0.9 : 0.65;
        return rng() < callProb ? { type: 'CALL_GYUL' } : { type: 'SKIP_BONUS' };
      }
      // Small blunder chance on easy if only 1 unfound left
      if (diff === 'easy' && unfound.length === 1 && rng() < 0.14) {
        return { type: 'CALL_GYUL' };
      }
      return { type: 'SKIP_BONUS' };
    }

    // Standard turn
    if (unfound.length === 0) {
      const gyulProb = diff === 'grand_final' ? 0.99 : diff === 'genius' ? 0.92 : 0.72;
      if (rng() < gyulProb) return { type: 'CALL_GYUL' };
      return { type: 'PASS' };
    }

    if (diff === 'grand_final') {
      // Master parity! Taking a Hap when 1 remains gives Hap(+1) + Bonus Gyul(+3) = +4!
      if (unfound.length === 1) {
        return { type: 'CALL_HAP', payload: { tiles: unfound[0] } };
      }
      // If exactly 2 Haps remain, taking 1 hands opponent a +4 finish!
      // Strategically pass unless opponent can't punish or we're desperate on final stale turn.
      if (unfound.length === 2) {
        if (fullState.staleTurns >= 4) {
          // Passing now ends the round with 0 Gyul scored — great if leading!
          if (scoreDiff > 0) return { type: 'PASS' };
          return { type: 'CALL_HAP', payload: { tiles: unfound[0] } };
        }
        if (rng() < 0.78) return { type: 'PASS' };
      }
      const pick = unfound[Math.floor(rng() * unfound.length)];
      return { type: 'CALL_HAP', payload: { tiles: pick } };
    }

    if (diff === 'genius') {
      // Genius AI: strong pattern scanner with occasional human parity/pass reads
      if (unfound.length === 2 && fullState.staleTurns < 4 && rng() < 0.42) {
        return { type: 'PASS' };
      }
      if (rng() < 0.9) {
        const pick = unfound[Math.floor(rng() * unfound.length)];
        return { type: 'CALL_HAP', payload: { tiles: pick } };
      }
      return { type: 'PASS' };
    }

    // Easy AI: spots ~62% of Haps, sometimes mis-calls Gyul when 1 obscure Hap remains
    if (unfound.length === 1 && rng() < 0.16) {
      return { type: 'CALL_GYUL' };
    }
    if (rng() < 0.62) {
      const pick = unfound[Math.floor(rng() * unfound.length)];
      return { type: 'CALL_HAP', payload: { tiles: pick } };
    }
    return { type: 'PASS' };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;
    const [s0, s1] = fullState.seatOrder;
    const sc0 = fullState.scores[s0] ?? 0;
    const sc1 = fullState.scores[s1] ?? 0;
    const winnerSeatIds = sc0 > sc1 ? [s0] : sc1 > sc0 ? [s1] : [];
    const rankings = [s0, s1]
      .map((sid) => ({
        seatId: sid,
        score: fullState.scores[sid] ?? 0,
        label: `${fullState.scores[sid] ?? 0} pts`,
      }))
      .sort((a, b) => b.score - a.score);

    const winName = winnerSeatIds.length ? fullState.names?.[winnerSeatIds[0]] || winnerSeatIds[0] : '';
    return {
      winnerSeatIds,
      rankings,
      summary: winnerSeatIds.length
        ? {
            zh: `历经 ${fullState.round} 回合几何速算对决，${winName} 以 ${rankings[0].score} : ${rankings[1].score} 锁定《结!合!》胜局！`,
            en: `After ${fullState.round} rounds of high-speed pattern combat, ${winName} triumphs ${rankings[0].score} – ${rankings[1].score}!`,
          }
        : {
            zh: '双方战成平手！',
            en: 'Match ended in a draw!',
          },
    };
  },
};
