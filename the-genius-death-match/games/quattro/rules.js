/**
 * Quattro (四色牌 / 콰트로) — Pure Deterministic S4E9 Rules & 3-Tier AI
 * Seasons 2 & 4 (S2E1, S2E12, S4E9 Official 26-Card + 6 Virtual Players)
 *
 * Deck: Red, Blue, Yellow, Green 1..6 (24 cards) + 2 Black Zero (0) cards = 26 cards.
 * Deterministic VP trade priority:
 *   1. Always give a Black 0 if VP holds one!
 *   2. Else give highest-value card that helps form a legal Quattro with player's face-up cards.
 *   3. Else give VP's highest-value card overall.
 *   4. Equal value tie-break: Red > Blue > Yellow > Green.
 */

export const COLOR_PRIORITY = { R: 4, B: 3, Y: 2, G: 1, K: 0 };
export const COLORS = ['R', 'B', 'Y', 'G'];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function createDeck(rng) {
  const deck = [];
  for (const color of COLORS) {
    for (let value = 1; value <= 6; value++) {
      deck.push({ id: `${color}${value}`, color, value, revealed: false });
    }
  }
  deck.push({ id: 'K0-1', color: 'K', value: 0, revealed: false });
  deck.push({ id: 'K0-2', color: 'K', value: 0, revealed: false });
  return shuffle(deck, rng);
}

function otherSeat(seatIds, seatId) {
  return seatIds[0] === seatId ? seatIds[1] : seatIds[0];
}

function cardSortDesc(a, b) {
  if (b.value !== a.value) return b.value - a.value;
  return (COLOR_PRIORITY[b.color] || 0) - (COLOR_PRIORITY[a.color] || 0);
}

/**
 * Exact S4E9 Virtual Player deterministic card selection algorithm.
 */
export function selectVpTradeCard(vpCards, playerRevealedCards) {
  // Rule 1: Always give a Black 0 if held
  const zeroIdx = vpCards.findIndex((c) => c.value === 0);
  if (zeroIdx !== -1) return zeroIdx;

  // Rule 2: Highest card that has distinct color & distinct number from player's face-up cards
  const revColors = new Set(playerRevealedCards.map((c) => c.color));
  const revValues = new Set(playerRevealedCards.map((c) => c.value));

  const helping = [];
  for (let i = 0; i < vpCards.length; i++) {
    const c = vpCards[i];
    if (!revColors.has(c.color) && !revValues.has(c.value)) {
      helping.push({ idx: i, card: c });
    }
  }

  if (helping.length > 0) {
    helping.sort((a, b) => cardSortDesc(a.card, b.card));
    return helping[0].idx;
  }

  // Rule 3 & 4: Highest card overall, tie-broken by R > B > Y > G
  const all = vpCards.map((card, idx) => ({ idx, card }));
  all.sort((a, b) => cardSortDesc(a.card, b.card));
  return all[0].idx;
}

/**
 * Evaluate a 4-card hand for Quattro legality, conflicts, and sum.
 */
export function evaluateQuattroHand(cards, zeroInstantLoss = false) {
  const validCards = (cards || []).filter((c) => c && !c.hidden);
  const colorCounts = {};
  const valueCounts = {};
  let sum = 0;
  let zeroCount = 0;

  for (const c of validCards) {
    colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
    valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
    sum += c.value;
    if (c.value === 0) zeroCount += 1;
  }

  const colorConflicts = Object.keys(colorCounts).filter((k) => colorCounts[k] > 1);
  const valueConflicts = Object.keys(valueCounts)
    .map(Number)
    .filter((v) => valueCounts[v] > 1);

  const distinctColors = colorConflicts.length === 0;
  const distinctValues = valueConflicts.length === 0;
  const hasZero = zeroCount > 0;
  const isZeroBust = Boolean(zeroInstantLoss && hasZero);
  const isQuattro = validCards.length === 4 && distinctColors && distinctValues && !isZeroBust;
  const sortedValues = validCards.map((c) => c.value).sort((a, b) => b - a);

  return {
    isQuattro,
    isZeroBust,
    hasZero,
    sum,
    sortedValues,
    colorConflicts,
    valueConflicts,
    distinctColors,
    distinctValues,
  };
}

export function compareQuattroHands(evalA, evalB) {
  // S2 Classic Zero Instant Loss check
  if (evalA.isZeroBust !== evalB.isZeroBust) {
    return evalA.isZeroBust ? -1 : 1;
  }
  // 1. Legal Quattro beats non-Quattro
  if (evalA.isQuattro !== evalB.isQuattro) {
    return evalA.isQuattro ? 1 : -1;
  }
  // 2. Higher total sum wins
  if (evalA.sum !== evalB.sum) {
    return evalA.sum > evalB.sum ? 1 : -1;
  }
  // 3. Tie-breaker: highest single card descending
  for (let i = 0; i < 4; i++) {
    const va = evalA.sortedValues[i] ?? -1;
    const vb = evalB.sortedValues[i] ?? -1;
    if (va !== vb) return va > vb ? 1 : -1;
  }
  return 0;
}

function usedVpCount(state, seatId) {
  return state.vps.filter((vp) => vp.tradedBy.includes(seatId)).length;
}

function buildResult(state) {
  const [p0, p1] = state.seatIds;
  const zeroLoss = Boolean(state.options?.zeroInstantLoss);
  const ev0 = evaluateQuattroHand(state.hands[p0], zeroLoss);
  const ev1 = evaluateQuattroHand(state.hands[p1], zeroLoss);
  const cmp = compareQuattroHands(ev0, ev1);

  let winnerSeatIds = [];
  if (cmp > 0) winnerSeatIds = [p0];
  else if (cmp < 0) winnerSeatIds = [p1];

  const rankings = [
    {
      seatId: p0,
      label: `${state.seatsById[p0]?.name || p0} (${ev0.isQuattro ? 'QUATTRO' : 'NO QUATTRO'} · ${ev0.sum})`,
      score: (ev0.isQuattro ? 100 : 0) + ev0.sum - (ev0.isZeroBust ? 200 : 0),
    },
    {
      seatId: p1,
      label: `${state.seatsById[p1]?.name || p1} (${ev1.isQuattro ? 'QUATTRO' : 'NO QUATTRO'} · ${ev1.sum})`,
      score: (ev1.isQuattro ? 100 : 0) + ev1.sum - (ev1.isZeroBust ? 200 : 0),
    },
  ].sort((a, b) => b.score - a.score);

  const n0 = state.seatsById[p0]?.name || p0;
  const n1 = state.seatsById[p1]?.name || p1;
  const wName = winnerSeatIds[0] ? state.seatsById[winnerSeatIds[0]]?.name : '';
  const wEval = winnerSeatIds[0] === p0 ? ev0 : ev1;

  return {
    winnerSeatIds,
    rankings,
    evals: { [p0]: ev0, [p1]: ev1 },
    summary: winnerSeatIds.length
      ? {
          zh: `${wName} 以 ${wEval.isQuattro ? '完美 Quattro' : '更高点数'}（总和 ${wEval.sum}）击败对手赢得死亡对决！`,
          en: `${wName} won Quattro with ${wEval.isQuattro ? 'a legal Quattro' : 'higher sum'} (Total ${wEval.sum})!`,
        }
      : {
          zh: `${n0} 与 ${n1} 牌型与点数完全相同，战成平局！`,
          en: `${n0} and ${n1} tied with identical hands!`,
        },
  };
}

function dealVpsAndStartReveal(state, rng, events) {
  const pool = shuffle(state.remainingPool, rng);
  state.remainingPool = [];
  state.vps = [];
  for (let i = 0; i < 6; i++) {
    state.vps.push({
      index: i,
      id: `VP${i + 1}`,
      name: { zh: `虚拟玩家 ${i + 1}`, en: `Virtual Player ${i + 1}` },
      cards: pool.slice(i * 3, i * 3 + 3),
      tradedBy: [],
      publicDeposits: [],
    });
  }
  state.phase = 'reveal';
  state.revealStage = 1;
  state.round = 1;
  state.phaseLabel = { zh: '亮出第 1 张牌', en: 'Reveal Card #1' };
  state.currentTurnSeatId = state.firstPlayerSeatId;
  events.push({ type: 'START_REVEAL', stage: 1 });
}

function advanceAfterTradeOrPass(state, actingSeatId, events) {
  const opp = otherSeat(state.seatIds, actingSeatId);
  const myUsed = usedVpCount(state, actingSeatId);
  const oppUsed = usedVpCount(state, opp);

  // Check if trading phase should end
  const bothDoneAllTrades = myUsed >= 6 && oppUsed >= 6;
  const bothPassed = state.consecutivePasses >= 2;
  const iPassedAndOppDone = state.consecutivePasses >= 1 && oppUsed >= 6 && (state.revealStage < 3 || myUsed >= 6);

  if (bothDoneAllTrades || bothPassed || iPassedAndOppDone) {
    state.revealStage += 1;
    state.round = state.revealStage;
    state.consecutivePasses = 0;
    state.phase = 'reveal';
    state.phaseLabel =
      state.revealStage === 4
        ? { zh: '最终第 4 张亮牌', en: 'Final Card Reveal' }
        : { zh: `亮出第 ${state.revealStage} 张牌`, en: `Reveal Card #${state.revealStage}` };
    // Alternate who reveals first each stage
    state.currentTurnSeatId =
      state.revealStage % 2 === 1
        ? state.firstPlayerSeatId
        : otherSeat(state.seatIds, state.firstPlayerSeatId);
    events.push({ type: 'START_REVEAL', stage: state.revealStage });
    return;
  }

  // If opponent already used all 6 VPs, keep turn on actingSeatId so they can finish remaining trades or pass
  if (oppUsed >= 6) {
    state.currentTurnSeatId = actingSeatId;
  } else {
    state.currentTurnSeatId = opp;
  }
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const seatIds = [seats[0].seatId, seats[1].seatId];
    const seatsById = {};
    for (const s of seats.slice(0, 2)) {
      seatsById[s.seatId] = { seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: Boolean(s.isBot) };
    }
    const deck = createDeck(rng);
    const firstIdx = rng() < 0.5 ? 0 : 1;
    const firstSeatId = seatIds[firstIdx];

    return {
      seatIds,
      seatsById,
      options: {
        zeroInstantLoss: Boolean(ctx.options?.zeroInstantLoss),
        fastTimers: Boolean(ctx.options?.fastTimers),
      },
      hands: {
        [seatIds[0]]: deck.slice(0, 4),
        [seatIds[1]]: deck.slice(4, 8),
      },
      remainingPool: deck.slice(8),
      mulligansLeft: { [seatIds[0]]: 2, [seatIds[1]]: 2 },
      mulliganDone: { [seatIds[0]]: false, [seatIds[1]]: false },
      vps: [],
      phase: 'mulligan', // 'mulligan' | 'reveal' | 'trade' | 'ended'
      revealStage: 0, // 1..4
      round: 0,
      phaseLabel: { zh: '起手调度 Mulligan', en: 'Opening Mulligan' },
      firstPlayerSeatId: firstSeatId,
      currentTurnSeatId: firstSeatId,
      consecutivePasses: 0,
      tradeLog: [],
      result: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!fullState.seatIds.includes(seatId)) {
      return { ok: false, reason: 'Unknown seat' };
    }
    if (fullState.currentTurnSeatId !== seatId) {
      return { ok: false, reason: 'Not your turn' };
    }
    const type = action?.type;

    if (fullState.phase === 'mulligan') {
      if (type === 'KEEP') return { ok: true };
      if (type === 'MULLIGAN') {
        if ((fullState.mulligansLeft[seatId] || 0) <= 0) {
          return { ok: false, reason: 'No mulligans remaining' };
        }
        return { ok: true };
      }
      return { ok: false, reason: 'Must Keep or Mulligan' };
    }

    if (fullState.phase === 'reveal') {
      if (type !== 'REVEAL_CARD') return { ok: false, reason: 'Must reveal 1 hidden card' };
      const idx = Number(action?.payload?.cardIndex);
      const hand = fullState.hands[seatId];
      if (!Number.isInteger(idx) || idx < 0 || idx >= hand.length) {
        return { ok: false, reason: 'Invalid card index' };
      }
      if (hand[idx].revealed) {
        return { ok: false, reason: 'Card is already face-up' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'trade') {
      if (type === 'PASS') {
        const used = usedVpCount(fullState, seatId);
        if (fullState.revealStage === 3 && used < 6) {
          return {
            ok: false,
            reason: `Must complete all 6 Virtual Player trades before final reveal (${used}/6 done)`,
          };
        }
        return { ok: true };
      }
      if (type === 'TRADE') {
        const cardIndex = Number(action?.payload?.cardIndex);
        const vpIndex = Number(action?.payload?.vpIndex);
        const hand = fullState.hands[seatId];
        if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= hand.length) {
          return { ok: false, reason: 'Invalid card index' };
        }
        if (hand[cardIndex].revealed) {
          return { ok: false, reason: 'Face-up cards cannot be traded' };
        }
        if (!Number.isInteger(vpIndex) || vpIndex < 0 || vpIndex >= fullState.vps.length) {
          return { ok: false, reason: 'Invalid Virtual Player' };
        }
        if (fullState.vps[vpIndex].tradedBy.includes(seatId)) {
          return { ok: false, reason: 'Already traded with this Virtual Player' };
        }
        return { ok: true };
      }
      return { ok: false, reason: 'Must Trade or Pass' };
    }

    return { ok: false, reason: 'Invalid phase' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const events = [];
    const opp = otherSeat(state.seatIds, seatId);
    const type = action.type;

    if (state.phase === 'mulligan') {
      if (type === 'MULLIGAN') {
        const returned = state.hands[seatId].map((c) => ({ ...c, revealed: false }));
        const pool = shuffle([...state.remainingPool, ...returned], ctx.rng);
        state.hands[seatId] = pool.slice(0, 4);
        state.remainingPool = pool.slice(4);
        state.mulligansLeft[seatId] -= 1;
        events.push({ type: 'MULLIGAN', seatId, remaining: state.mulligansLeft[seatId] });

        // If out of mulligans, auto-lock hand
        if (state.mulligansLeft[seatId] <= 0) {
          state.mulliganDone[seatId] = true;
          if (state.mulliganDone[opp]) {
            dealVpsAndStartReveal(state, ctx.rng, events);
          } else {
            state.currentTurnSeatId = opp;
          }
        }
        return { state, events };
      }

      if (type === 'KEEP') {
        state.mulliganDone[seatId] = true;
        events.push({ type: 'KEEP_HAND', seatId });
        if (state.mulliganDone[opp]) {
          dealVpsAndStartReveal(state, ctx.rng, events);
        } else {
          state.currentTurnSeatId = opp;
        }
        return { state, events };
      }
    }

    if (state.phase === 'reveal' && type === 'REVEAL_CARD') {
      const idx = Number(action.payload.cardIndex);
      state.hands[seatId][idx].revealed = true;
      const revealedCard = state.hands[seatId][idx];
      events.push({
        type: 'REVEAL_CARD',
        seatId,
        card: { color: revealedCard.color, value: revealedCard.value },
        stage: state.revealStage,
      });

      const myRevCount = state.hands[seatId].filter((c) => c.revealed).length;
      const oppRevCount = state.hands[opp].filter((c) => c.revealed).length;

      if (myRevCount >= state.revealStage && oppRevCount >= state.revealStage) {
        if (state.revealStage >= 4) {
          // Final reveal done -> Match Over!
          state.phase = 'ended';
          state.phaseLabel = { zh: '终局摊牌', en: 'Final Verdict' };
          state.currentTurnSeatId = null;
          state.result = buildResult(state);
          events.push({ type: 'MATCH_END', winnerSeatIds: state.result.winnerSeatIds });
        } else {
          // Start trading phase for this reveal stage
          state.phase = 'trade';
          state.consecutivePasses = 0;
          state.phaseLabel = {
            zh: `第 ${state.revealStage} 轮交易`,
            en: `Trade Round ${state.revealStage}`,
          };
          const starter =
            state.revealStage % 2 === 1
              ? state.firstPlayerSeatId
              : otherSeat(state.seatIds, state.firstPlayerSeatId);
          // If starter already finished all 6 trades, start with the other player
          if (usedVpCount(state, starter) >= 6 && usedVpCount(state, otherSeat(state.seatIds, starter)) < 6) {
            state.currentTurnSeatId = otherSeat(state.seatIds, starter);
          } else if (usedVpCount(state, seatId) >= 6 && usedVpCount(state, opp) >= 6) {
            // Both already completed all 6 trades -> skip straight to next reveal
            state.revealStage += 1;
            state.round = state.revealStage;
            state.phase = 'reveal';
            state.phaseLabel =
              state.revealStage === 4
                ? { zh: '最终第 4 张亮牌', en: 'Final Card Reveal' }
                : { zh: `亮出第 ${state.revealStage} 张牌`, en: `Reveal Card #${state.revealStage}` };
            state.currentTurnSeatId =
              state.revealStage % 2 === 1
                ? state.firstPlayerSeatId
                : otherSeat(state.seatIds, state.firstPlayerSeatId);
          } else {
            state.currentTurnSeatId = starter;
          }
          events.push({ type: 'START_TRADE', stage: state.revealStage });
        }
      } else {
        state.currentTurnSeatId = opp;
      }
      return { state, events };
    }

    if (state.phase === 'trade') {
      if (type === 'TRADE') {
        const cardIndex = Number(action.payload.cardIndex);
        const vpIndex = Number(action.payload.vpIndex);
        const vp = state.vps[vpIndex];
        const outgoing = { ...state.hands[seatId][cardIndex], revealed: false };
        const myRevealed = state.hands[seatId].filter((c) => c.revealed);

        const giveIdx = selectVpTradeCard(vp.cards, myRevealed);
        const received = { ...vp.cards[giveIdx], revealed: false };

        vp.cards.splice(giveIdx, 1);
        vp.cards.push(outgoing);
        vp.tradedBy.push(seatId);
        vp.publicDeposits.push({
          seatId,
          stage: state.revealStage,
          card: { color: outgoing.color, value: outgoing.value },
        });

        state.hands[seatId][cardIndex] = received;
        state.consecutivePasses = 0;
        state.tradeLog.push({
          seatId,
          vpIndex,
          stage: state.revealStage,
          deposited: { color: outgoing.color, value: outgoing.value },
        });

        // Public event ONLY (never includes private `received` card!)
        events.push({
          type: 'TRADE',
          seatId,
          vpIndex,
          deposited: { color: outgoing.color, value: outgoing.value },
        });

        advanceAfterTradeOrPass(state, seatId, events);
        return { state, events };
      }

      if (type === 'PASS') {
        state.consecutivePasses += 1;
        events.push({ type: 'PASS_TRADE', seatId, stage: state.revealStage });
        advanceAfterTradeOrPass(state, seatId, events);
        return { state, events };
      }
    }

    return { state, events };
  },

  projectState(fullState, viewerSeatId) {
    const isEnded = fullState.phase === 'ended';
    const projectedHands = {};

    for (const sid of fullState.seatIds) {
      const isMine = viewerSeatId && sid === viewerSeatId;
      projectedHands[sid] = (fullState.hands[sid] || []).map((c) => {
        if (isEnded || isMine || c.revealed) {
          return { id: c.id, color: c.color, value: c.value, revealed: Boolean(c.revealed) };
        }
        return { hidden: true, revealed: false };
      });
    }

    const projectedVps = (fullState.vps || []).map((vp) => ({
      index: vp.index,
      id: vp.id,
      name: vp.name,
      cardCount: vp.cards.length,
      tradedBy: vp.tradedBy,
      publicDeposits: vp.publicDeposits,
      // Reveal remaining VP cards only after match concludes for post-game review
      cards: isEnded ? vp.cards : null,
    }));

    return {
      seatIds: fullState.seatIds,
      seatsById: fullState.seatsById,
      options: fullState.options,
      hands: projectedHands,
      mulligansLeft: fullState.mulligansLeft,
      mulliganDone: fullState.mulliganDone,
      vps: projectedVps,
      phase: fullState.phase,
      revealStage: fullState.revealStage,
      round: fullState.round,
      phaseLabel: fullState.phaseLabel,
      firstPlayerSeatId: fullState.firstPlayerSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      consecutivePasses: fullState.consecutivePasses,
      tradeLog: fullState.tradeLog,
      result: fullState.result,
    };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'ended') return null;
    const base = fullState.options?.fastTimers ? 25000 : 50000;
    return {
      phaseKey: `q-${fullState.phase}-s${fullState.revealStage}-t${fullState.tradeLog.length}-p${fullState.consecutivePasses}-${fullState.currentTurnSeatId}`,
      durationMs: base,
    };
  },

  onPhaseTimeout(fullState, ctx) {
    const sid = fullState.currentTurnSeatId;
    if (!sid || fullState.phase === 'ended') return null;
    if (fullState.phase === 'mulligan') {
      return this.applyAction(fullState, sid, { type: 'KEEP' }, ctx);
    }
    if (fullState.phase === 'reveal') {
      const idx = fullState.hands[sid].findIndex((c) => !c.revealed);
      if (idx !== -1) return this.applyAction(fullState, sid, { type: 'REVEAL_CARD', payload: { cardIndex: idx } }, ctx);
    }
    if (fullState.phase === 'trade') {
      const used = usedVpCount(fullState, sid);
      if (fullState.revealStage < 3 || used >= 6) {
        return this.applyAction(fullState, sid, { type: 'PASS' }, ctx);
      }
      const cardIndex = fullState.hands[sid].findIndex((c) => !c.revealed);
      const vpIndex = fullState.vps.findIndex((vp) => !vp.tradedBy.includes(sid));
      if (cardIndex !== -1 && vpIndex !== -1) {
        return this.applyAction(fullState, sid, { type: 'TRADE', payload: { cardIndex, vpIndex } }, ctx);
      }
    }
    return null;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase === 'ended' || fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const hand = fullState.hands[botSeatId];
    const zeroLoss = Boolean(fullState.options?.zeroInstantLoss);
    const ev = evaluateQuattroHand(hand, zeroLoss);

    // 1. MULLIGAN PHASE
    if (fullState.phase === 'mulligan') {
      const left = fullState.mulligansLeft[botSeatId] || 0;
      if (left <= 0) return { type: 'KEEP' };

      if (diff === 'easy') {
        if (ev.hasZero && rng() < 0.7) return { type: 'MULLIGAN' };
        if (ev.sum <= 10 && rng() < 0.5) return { type: 'MULLIGAN' };
        return { type: 'KEEP' };
      }

      // Genius & Grand Final: evaluate hand quality
      const quality =
        ev.sum +
        (ev.isQuattro ? 5 : 0) -
        (ev.hasZero ? (zeroLoss ? 10 : 4.5) : 0) -
        ev.colorConflicts.length * 1.8 -
        ev.valueConflicts.length * 1.6;
      const threshold = diff === 'grand_final' ? 15.5 : 14.0;
      if (quality < threshold) return { type: 'MULLIGAN' };
      return { type: 'KEEP' };
    }

    // 2. REVEAL PHASE
    if (fullState.phase === 'reveal') {
      const hiddenIndices = hand
        .map((c, idx) => ({ c, idx }))
        .filter((x) => !x.c.revealed);
      if (hiddenIndices.length === 1) {
        return { type: 'REVEAL_CARD', payload: { cardIndex: hiddenIndices[0].idx } };
      }

      const revCards = hand.filter((c) => c.revealed);
      const revColors = new Set(revCards.map((c) => c.color));
      const revValues = new Set(revCards.map((c) => c.value));

      // Score each hidden card for how good it is to permanently lock face-up
      hiddenIndices.sort((a, b) => {
        const score = (c) => {
          if (c.value === 0) return -100; // Never reveal a 0 early so we can dump it!
          const conflictsColor = revColors.has(c.color);
          const conflictsVal = revValues.has(c.value);
          let s = c.value * 3;
          if (conflictsColor) s -= 25;
          if (conflictsVal) s -= 25;
          // Slightly prefer keeping lower cards hidden as trade fodder
          return s;
        };
        return score(b.c) - score(a.c);
      });

      if (diff === 'easy' && rng() < 0.25) {
        const pick = hiddenIndices[Math.floor(rng() * hiddenIndices.length)];
        return { type: 'REVEAL_CARD', payload: { cardIndex: pick.idx } };
      }
      return { type: 'REVEAL_CARD', payload: { cardIndex: hiddenIndices[0].idx } };
    }

    // 3. TRADE PHASE (NEVER peeks at VP hidden cards — uses ONLY publicDeposits!)
    if (fullState.phase === 'trade') {
      const opp = otherSeat(fullState.seatIds, botSeatId);
      const availVps = fullState.vps.filter((vp) => !vp.tradedBy.includes(botSeatId));
      const hiddenIndices = hand
        .map((c, idx) => ({ c, idx }))
        .filter((x) => !x.c.revealed);

      if (availVps.length === 0 || hiddenIndices.length === 0) {
        return { type: 'PASS' };
      }

      const revCards = hand.filter((c) => c.revealed);
      const revColors = new Set(revCards.map((c) => c.color));
      const revValues = new Set(revCards.map((c) => c.value));

      // Pick worst hidden card to trade away (always dump 0 or conflicting/lowest card!)
      const cardBadness = (c) => {
        if (c.value === 0) return 1000;
        let bad = 20 - c.value * 3;
        if (revColors.has(c.color)) bad += 35;
        if (revValues.has(c.value)) bad += 35;
        // Also check duplicates among hidden cards
        const sameColorInHand = hand.filter((h) => h.color === c.color).length;
        const sameValInHand = hand.filter((h) => h.value === c.value).length;
        if (sameColorInHand > 1) bad += 14;
        if (sameValInHand > 1) bad += 14;
        return bad;
      };

      hiddenIndices.sort((a, b) => cardBadness(b.c) - cardBadness(a.c));
      const worst = hiddenIndices[0];
      const worstBad = cardBadness(worst.c);

      if (diff === 'easy') {
        // Easy trades in sequential order; passes if hand already looks decent before stage 3
        if (fullState.revealStage < 3 && ev.isQuattro && ev.sum >= 14 && rng() < 0.7) {
          return { type: 'PASS' };
        }
        return { type: 'TRADE', payload: { cardIndex: worst.idx, vpIndex: availVps[0].index } };
      }

      // Score each available VP based ONLY on publicDeposits & whether opponent visited it!
      const scoreVp = (vp) => {
        let s = 0;
        const lastDep = vp.publicDeposits[vp.publicDeposits.length - 1];
        if (lastDep) {
          const dc = lastDep.card;
          if (dc.value === 0) {
            // Opponent dumped a 0 here! AVOID until forced (or unless we have no choice)!
            s -= 120;
          } else {
            const helpsMe = !revColors.has(dc.color) && !revValues.has(dc.value);
            if (helpsMe) s += dc.value * 8;
            else s += dc.value * 2;
          }
        } else {
          // Unvisited VP: neutral baseline
          s += 10;
        }

        // Grand Final Trap: if WE are dumping a Black 0, put it in a VP the opponent HASN'T visited yet!
        if (worst.c.value === 0 && !vp.tradedBy.includes(opp)) {
          s += diff === 'grand_final' ? 85 : 40;
        }

        // Slight jitter for unpredictability
        s += rng() * 2;
        return s;
      };

      const rankedVps = availVps.map((vp) => ({ vp, score: scoreVp(vp) })).sort((a, b) => b.score - a.score);
      const bestVp = rankedVps[0];

      // Decide whether to PASS before Stage 3 to reveal more cards first (so VP Rule #2 targets our needed color/num!)
      if (fullState.revealStage < 3) {
        // If we are holding a 0, dump it ASAP (especially into an opponent-unvisited VP!)
        if (worst.c.value === 0 && bestVp.score > -50) {
          return { type: 'TRADE', payload: { cardIndex: worst.idx, vpIndex: bestVp.vp.index } };
        }
        // If opponent just deposited a great card we need, snipe it immediately!
        if (bestVp.score >= 34) {
          return { type: 'TRADE', payload: { cardIndex: worst.idx, vpIndex: bestVp.vp.index } };
        }
        // If our hidden cards are already very strong & conflict-free, wait for next reveal to narrow VP priority!
        if (worstBad <= 6 && availVps.length <= 4) {
          return { type: 'PASS' };
        }
        // Avoid walking into a known 0-deposit VP until Stage 3 if possible
        if (bestVp.score < -50) {
          return { type: 'PASS' };
        }
        // In Stage 1, usually make 1–2 trades then reveal Card #2 to sharpen VP Rule #2
        const tradedThisStage = fullState.tradeLog.filter(
          (t) => t.seatId === botSeatId && t.stage === fullState.revealStage
        ).length;
        if (fullState.revealStage === 1 && tradedThisStage >= 2 && worstBad < 30) {
          return { type: 'PASS' };
        }
        if (fullState.revealStage === 2 && tradedThisStage >= 2 && worstBad < 24) {
          return { type: 'PASS' };
        }
      }

      return { type: 'TRADE', payload: { cardIndex: worst.idx, vpIndex: bestVp.vp.index } };
    }

    return null;
  },

  getResult(state) {
    if (!state || state.phase !== 'ended') return null;
    return state.result || buildResult(state);
  },
};
