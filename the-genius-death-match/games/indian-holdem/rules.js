/**
 * Indian Hold'em (印第安德州扑克 / 인디언 홀덤) — Pure Deterministic Rules & 3-Tier AI
 * Season 2 (S2E7, S2E10, S2E12 Finals) · The Genius: Death Match Arena
 *
 * 40-card shoe (1..10 × 4), 2 shared Community Cards, 1 hidden forehead card per player.
 * Canonical Genius 3-Card Hand Ranking:
 *   Triple > Straight (9-10-1 highest, 10-1-2 lowest!) > Pair > High Card.
 * Folding with a Straight or Triple incurs an immediate -10 chip penalty!
 */

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

function createShoe(rng) {
  const cards = [];
  for (let n = 1; n <= 10; n++) {
    cards.push(n, n, n, n);
  }
  return shuffle(cards, rng);
}

function otherSeat(seatIds, seatId) {
  return seatIds[0] === seatId ? seatIds[1] : seatIds[0];
}

/**
 * Evaluate a 3-card Indian Hold'em hand (forehead card + 2 community cards).
 * Canonical Straight ordering (highest → lowest):
 *   9-10-1 (10) > 8-9-10 (9) > 7-8-9 (8) > 6-7-8 (7) > 5-6-7 (6)
 *   > 4-5-6 (5) > 3-4-5 (4) > 2-3-4 (3) > 1-2-3 (2) > 10-1-2 (1)
 */
export function evaluateHoldemHand(card, comm0, comm1) {
  const nums = [card, comm0, comm1].sort((a, b) => a - b);
  const [a, b, c] = nums;

  // 1. Three of a Kind (Triple)
  if (a === b && b === c) {
    return {
      tier: 4,
      tierCode: 'TRIPLE',
      rankTuple: [4, a, 0, 0],
      label: { zh: `三条 ${a}-${a}-${a}`, en: `Triple ${a}s` },
      tierName: { zh: '三条', en: 'TRIPLE' },
    };
  }

  // 2. Straight (including wrap-around 9-10-1 and 10-1-2)
  if (a === 1 && b === 9 && c === 10) {
    return {
      tier: 3,
      tierCode: 'STRAIGHT',
      rankTuple: [3, 10, 0, 0],
      label: { zh: '顶级顺子 9-10-1', en: 'Top Straight 9-10-1' },
      tierName: { zh: '顺子', en: 'STRAIGHT' },
    };
  }
  if (a === 1 && b === 2 && c === 10) {
    return {
      tier: 3,
      tierCode: 'STRAIGHT',
      rankTuple: [3, 1, 0, 0],
      label: { zh: '顺子 10-1-2', en: 'Straight 10-1-2' },
      tierName: { zh: '顺子', en: 'STRAIGHT' },
    };
  }
  if (b === a + 1 && c === b + 1) {
    return {
      tier: 3,
      tierCode: 'STRAIGHT',
      rankTuple: [3, a + 1, 0, 0],
      label: { zh: `顺子 ${a}-${b}-${c}`, en: `Straight ${a}-${b}-${c}` },
      tierName: { zh: '顺子', en: 'STRAIGHT' },
    };
  }

  // 3. Pair
  if (a === b || b === c) {
    const pairVal = a === b ? a : b;
    const kicker = a === b ? c : a;
    return {
      tier: 2,
      tierCode: 'PAIR',
      rankTuple: [2, pairVal, kicker, 0],
      label: { zh: `对子 ${pairVal} (踢脚 ${kicker})`, en: `Pair of ${pairVal}s (K:${kicker})` },
      tierName: { zh: '对子', en: 'PAIR' },
    };
  }

  // 4. High Card
  return {
    tier: 1,
    tierCode: 'HIGH',
    rankTuple: [1, c, b, a],
    label: { zh: `高牌 ${c}`, en: `High Card ${c}` },
    tierName: { zh: '散牌', en: 'HIGH CARD' },
  };
}

export function compareHands(evalA, evalB) {
  for (let i = 0; i < 4; i++) {
    if (evalA.rankTuple[i] > evalB.rankTuple[i]) return 1;
    if (evalA.rankTuple[i] < evalB.rankTuple[i]) return -1;
  }
  return 0;
}

/**
 * Purely public helper: given the 2 community cards, list which card values (1..10)
 * form a Triple, Straight, or Pair. Never looks at any hidden card!
 */
export function computeBoardOuts(comm0, comm1) {
  const triples = [];
  const straights = [];
  const pairs = [];
  for (let n = 1; n <= 10; n++) {
    const ev = evaluateHoldemHand(n, comm0, comm1);
    if (ev.tier === 4) triples.push(n);
    else if (ev.tier === 3) straights.push(n);
    else if (ev.tier === 2) pairs.push(n);
  }
  return { triples, straights, pairs };
}

export function computeBettingBounds(state, seatId) {
  const opp = otherSeat(state.seatIds, seatId);
  const myChips = state.chips[seatId];
  const oppChips = state.chips[opp];
  const myBet = state.streetBet[seatId];
  const oppBet = state.streetBet[opp];
  const toCall = Math.max(0, oppBet - myBet);
  const canCheck = toCall === 0;
  const maxAdd = Math.min(myChips, toCall + oppChips);
  const maxRaiseBy = Math.max(0, maxAdd - toCall);
  return { myChips, oppChips, myBet, oppBet, toCall, canCheck, maxAdd, maxRaiseBy };
}

function getRemainingShoePool(revealedHistory, community, oppCard) {
  const counts = Array(11).fill(4);
  counts[0] = 0;
  for (const c of revealedHistory || []) {
    if (c >= 1 && c <= 10 && counts[c] > 0) counts[c] -= 1;
  }
  for (const c of community || []) {
    if (c >= 1 && c <= 10 && counts[c] > 0) counts[c] -= 1;
  }
  if (oppCard >= 1 && oppCard <= 10 && counts[oppCard] > 0) {
    counts[oppCard] -= 1;
  }
  const pool = [];
  for (let n = 1; n <= 10; n++) {
    for (let k = 0; k < counts[n]; k++) pool.push(n);
  }
  if (pool.length === 0) {
    for (let n = 1; n <= 10; n++) pool.push(n);
  }
  return pool;
}

function dealNextHand(state, rng, events = []) {
  const [p0, p1] = state.seatIds;
  let reshuffled = false;
  if (state.deck.length < 4) {
    state.deck = createShoe(rng);
    state.revealedHistory = [];
    state.shoeNumber += 1;
    reshuffled = true;
    events.push({ type: 'DECK_RESHUFFLE', shoeNumber: state.shoeNumber });
  }

  const ante0 = Math.min(1, state.chips[p0]);
  const ante1 = Math.min(1, state.chips[p1]);
  state.chips[p0] -= ante0;
  state.chips[p1] -= ante1;

  state.round += 1;
  state.pot = state.carryoverPot + ante0 + ante1;
  state.carryoverPot = 0;
  state.streetBet = { [p0]: 0, [p1]: 0 };
  state.actedThisStreet = { [p0]: false, [p1]: false };
  state.raiseCount = 0;

  const comm0 = state.deck.pop();
  const comm1 = state.deck.pop();
  const c0 = state.deck.pop();
  const c1 = state.deck.pop();

  state.community = [comm0, comm1];
  state.hands = { [p0]: c0, [p1]: c1 };
  state.phase = 'betting';
  state.phaseLabel = { zh: '德州下注', en: 'Hold\'em Betting' };
  state.currentTurnSeatId = state.nextFirstActorSeatId;
  state.lastResolution = null;
  state.reshuffledThisHand = reshuffled;
  state.actionLog = [];

  events.push({ type: 'DEAL', round: state.round, pot: state.pot, community: [comm0, comm1], reshuffled });
  return state;
}

function buildResult(state) {
  const [p0, p1] = state.seatIds;
  const c0 = state.chips[p0];
  const c1 = state.chips[p1];
  let winnerSeatIds = [];
  if (c0 > c1) winnerSeatIds = [p0];
  else if (c1 > c0) winnerSeatIds = [p1];

  const rankings = state.seatIds
    .map((sid) => ({
      seatId: sid,
      label: state.seatsById[sid]?.name || sid,
      score: state.chips[sid],
    }))
    .sort((a, b) => b.score - a.score);

  const wName = winnerSeatIds[0] ? state.seatsById[winnerSeatIds[0]]?.name || winnerSeatIds[0] : '';
  return {
    winnerSeatIds,
    rankings,
    summary: winnerSeatIds.length
      ? {
          zh: `${wName} 掌控公共牌局势，赢得印第安德州扑克死亡对决！`,
          en: `${wName} mastered the board and won Indian Hold'em!`,
        }
      : {
          zh: '双方筹码持平，平局收场。',
          en: 'Match ended in a draw.',
        },
  };
}

function finalizeMatchIfBust(state, events) {
  const [p0, p1] = state.seatIds;
  if (state.chips[p0] <= 0 || state.chips[p1] <= 0) {
    state.phase = 'ended';
    state.phaseLabel = { zh: '终局裁决', en: 'Match Over' };
    state.currentTurnSeatId = null;
    state.result = buildResult(state);
    events.push({ type: 'MATCH_END', winnerSeatIds: state.result.winnerSeatIds });
    return true;
  }
  return false;
}

function computeFoldPenalty(handEval, options) {
  if (handEval.tier >= 3) return 10; // Straight or Triple
  if (options?.pairPenalty && handEval.tier === 2) return 5; // Optional S2 Finals Pair penalty
  return 0;
}

function resolveShowdown(state, actingSeatId, events) {
  const [p0, p1] = state.seatIds;
  const card0 = state.hands[p0];
  const card1 = state.hands[p1];
  const [comm0, comm1] = state.community;

  const eval0 = evaluateHoldemHand(card0, comm0, comm1);
  const eval1 = evaluateHoldemHand(card1, comm0, comm1);
  const cmp = compareHands(eval0, eval1);

  state.revealedHistory.push(comm0, comm1, card0, card1);

  let winnerSeatId = null;
  let isTie = false;
  let splitOnAllInTie = false;
  const wonPot = state.pot;

  if (cmp > 0) {
    winnerSeatId = p0;
    state.chips[p0] += state.pot;
    state.pot = 0;
    state.nextFirstActorSeatId = p0;
  } else if (cmp < 0) {
    winnerSeatId = p1;
    state.chips[p1] += state.pot;
    state.pot = 0;
    state.nextFirstActorSeatId = p1;
  } else {
    isTie = true;
    if (state.chips[p0] <= 0 || state.chips[p1] <= 0) {
      const half = Math.floor(state.pot / 2);
      const rem = state.pot - half * 2;
      state.chips[p0] += half + (state.nextFirstActorSeatId === p0 ? rem : 0);
      state.chips[p1] += half + (state.nextFirstActorSeatId === p1 ? rem : 0);
      state.pot = 0;
      state.carryoverPot = 0;
      splitOnAllInTie = true;
    } else {
      state.carryoverPot = state.pot;
    }
    state.nextFirstActorSeatId = otherSeat(state.seatIds, state.nextFirstActorSeatId);
  }

  state.lastResolution = {
    kind: 'showdown',
    winnerSeatId,
    isTie,
    splitOnAllInTie,
    potAmount: wonPot,
    cards: { [p0]: card0, [p1]: card1 },
    evals: { [p0]: eval0, [p1]: eval1 },
    penaltyAmount: 0,
    penaltySeatId: null,
  };

  events.push({
    type: 'SHOWDOWN',
    winnerSeatId,
    isTie,
    potAmount: wonPot,
  });

  if (!finalizeMatchIfBust(state, events)) {
    state.phase = 'showdown';
    state.phaseLabel = isTie
      ? { zh: '平局滚存', en: 'Tie Carryover' }
      : { zh: '摊牌比牌', en: 'Showdown' };
    state.currentTurnSeatId = actingSeatId;
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
    const startingChips = Number(ctx.options?.startingChips) === 20 ? 20 : 30;
    const firstIdx = rng() < 0.5 ? 0 : 1;

    const state = {
      seatIds,
      seatsById,
      options: {
        startingChips,
        pairPenalty: Boolean(ctx.options?.pairPenalty),
        fastTimers: Boolean(ctx.options?.fastTimers),
      },
      chips: { [seatIds[0]]: startingChips, [seatIds[1]]: startingChips },
      deck: createShoe(rng),
      shoeNumber: 1,
      revealedHistory: [],
      round: 0,
      pot: 0,
      carryoverPot: 0,
      streetBet: { [seatIds[0]]: 0, [seatIds[1]]: 0 },
      actedThisStreet: { [seatIds[0]]: false, [seatIds[1]]: false },
      raiseCount: 0,
      community: [null, null],
      hands: { [seatIds[0]]: null, [seatIds[1]]: null },
      phase: 'betting',
      phaseLabel: { zh: '德州下注', en: 'Hold\'em Betting' },
      currentTurnSeatId: seatIds[firstIdx],
      nextFirstActorSeatId: seatIds[firstIdx],
      lastResolution: null,
      reshuffledThisHand: false,
      actionLog: [],
      result: null,
    };

    dealNextHand(state, rng, []);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!fullState.seatIds.includes(seatId)) {
      return { ok: false, reason: 'Unknown seat' };
    }
    const type = action?.type;

    if (fullState.phase === 'showdown') {
      if (type === 'NEXT_HAND') return { ok: true };
      return { ok: false, reason: 'Click Next Hand to continue' };
    }
    if (fullState.phase !== 'betting') {
      return { ok: false, reason: 'Invalid phase' };
    }
    if (fullState.currentTurnSeatId !== seatId) {
      return { ok: false, reason: 'Not your turn' };
    }

    const bounds = computeBettingBounds(fullState, seatId);

    if (type === 'CHECK') {
      return bounds.canCheck ? { ok: true } : { ok: false, reason: 'Cannot check when facing a bet' };
    }
    if (type === 'CALL') {
      return bounds.toCall > 0 ? { ok: true } : { ok: false, reason: 'Nothing to call' };
    }
    if (type === 'FOLD') {
      return { ok: true };
    }
    if (type === 'RAISE') {
      const raiseBy = Math.floor(Number(action?.payload?.raiseBy));
      if (!Number.isFinite(raiseBy) || raiseBy < 1) {
        return { ok: false, reason: 'Raise must be at least 1 chip' };
      }
      if (bounds.maxRaiseBy < 1 || raiseBy > bounds.maxRaiseBy) {
        return { ok: false, reason: `Raise must be between 1 and ${bounds.maxRaiseBy}` };
      }
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const events = [];
    const opp = otherSeat(state.seatIds, seatId);
    const type = action.type;

    if (type === 'NEXT_HAND') {
      dealNextHand(state, ctx.rng, events);
      return { state, events };
    }

    const bounds = computeBettingBounds(state, seatId);

    if (type === 'CHECK') {
      state.actedThisStreet[seatId] = true;
      state.actionLog.push({ seatId, type: 'CHECK', amount: 0 });
      events.push({ type: 'CHECK', seatId });
      if (state.actedThisStreet[opp]) {
        resolveShowdown(state, seatId, events);
      } else {
        state.currentTurnSeatId = opp;
      }
      return { state, events };
    }

    if (type === 'CALL') {
      const callAmt = Math.min(bounds.toCall, state.chips[seatId]);
      state.chips[seatId] -= callAmt;
      state.streetBet[seatId] += callAmt;
      state.pot += callAmt;
      state.actedThisStreet[seatId] = true;
      state.actionLog.push({ seatId, type: 'CALL', amount: callAmt });
      events.push({ type: 'CALL', seatId, amount: callAmt });
      resolveShowdown(state, seatId, events);
      return { state, events };
    }

    if (type === 'RAISE') {
      const raiseBy = Math.floor(Number(action.payload.raiseBy));
      const addTotal = bounds.toCall + raiseBy;
      const isOpeningBet = bounds.toCall === 0;
      const isAllIn = raiseBy === bounds.maxRaiseBy;

      state.chips[seatId] -= addTotal;
      state.streetBet[seatId] += addTotal;
      state.pot += addTotal;
      state.actedThisStreet[seatId] = true;
      state.actedThisStreet[opp] = false;
      state.raiseCount += 1;
      state.currentTurnSeatId = opp;

      const logType = isAllIn ? 'ALL_IN' : isOpeningBet ? 'BET' : 'RAISE';
      state.actionLog.push({ seatId, type: logType, amount: addTotal, raiseBy });
      events.push({ type: logType, seatId, amount: addTotal, raiseBy });
      return { state, events };
    }

    if (type === 'FOLD') {
      const myCard = state.hands[seatId];
      const oppCard = state.hands[opp];
      const [comm0, comm1] = state.community;
      const myEval = evaluateHoldemHand(myCard, comm0, comm1);
      const oppEval = evaluateHoldemHand(oppCard, comm0, comm1);

      const wonPot = state.pot;
      state.chips[opp] += state.pot;
      state.pot = 0;

      const rawPen = computeFoldPenalty(myEval, state.options);
      const penaltyAmount = Math.min(rawPen, state.chips[seatId]);
      if (penaltyAmount > 0) {
        state.chips[seatId] -= penaltyAmount;
        state.chips[opp] += penaltyAmount;
      }

      state.revealedHistory.push(comm0, comm1, myCard, oppCard);
      state.actionLog.push({ seatId, type: 'FOLD', amount: 0, penaltyAmount });
      state.nextFirstActorSeatId = opp;

      state.lastResolution = {
        kind: 'fold',
        foldedSeatId: seatId,
        winnerSeatId: opp,
        isTie: false,
        potAmount: wonPot,
        cards: { [seatId]: myCard, [opp]: oppCard },
        evals: { [seatId]: myEval, [opp]: oppEval },
        penaltyAmount,
        penaltySeatId: penaltyAmount > 0 ? seatId : null,
      };

      events.push({
        type: penaltyAmount > 0 ? 'FOLD_PENALTY' : 'FOLD',
        seatId,
        winnerSeatId: opp,
        penaltyAmount,
        potAmount: wonPot,
      });

      if (!finalizeMatchIfBust(state, events)) {
        state.phase = 'showdown';
        state.phaseLabel =
          penaltyAmount > 0
            ? { zh: '强牌弃牌重罚！', en: 'Fold Penalty!' }
            : { zh: '弃牌结算', en: 'Fold Settlement' };
        state.currentTurnSeatId = seatId;
      }
      return { state, events };
    }

    return { state, events };
  },

  projectState(fullState, viewerSeatId) {
    const isRevealed = fullState.phase === 'showdown' || fullState.phase === 'ended';
    const projectedHands = {};
    for (const sid of fullState.seatIds) {
      if (isRevealed) {
        projectedHands[sid] = fullState.hands[sid];
      } else if (viewerSeatId && sid !== viewerSeatId) {
        projectedHands[sid] = fullState.hands[sid];
      } else {
        projectedHands[sid] = null;
      }
    }

    return {
      seatIds: fullState.seatIds,
      seatsById: fullState.seatsById,
      options: fullState.options,
      chips: fullState.chips,
      deckRemaining: fullState.deck.length,
      shoeNumber: fullState.shoeNumber,
      revealedHistory: fullState.revealedHistory,
      round: fullState.round,
      pot: fullState.pot,
      carryoverPot: fullState.carryoverPot,
      streetBet: fullState.streetBet,
      actedThisStreet: fullState.actedThisStreet,
      raiseCount: fullState.raiseCount,
      community: fullState.community,
      hands: projectedHands,
      phase: fullState.phase,
      phaseLabel: fullState.phaseLabel,
      currentTurnSeatId: fullState.currentTurnSeatId,
      nextFirstActorSeatId: fullState.nextFirstActorSeatId,
      lastResolution: fullState.lastResolution,
      reshuffledThisHand: fullState.reshuffledThisHand,
      actionLog: fullState.actionLog,
      result: fullState.result,
    };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase !== 'betting') return null;
    const durationMs = fullState.options?.fastTimers ? 25000 : 50000;
    return {
      phaseKey: `ih-r${fullState.round}-t${fullState.actionLog.length}-${fullState.currentTurnSeatId}`,
      durationMs,
    };
  },

  onPhaseTimeout(fullState, ctx) {
    if (fullState.phase !== 'betting' || !fullState.currentTurnSeatId) return null;
    const sid = fullState.currentTurnSeatId;
    const bounds = computeBettingBounds(fullState, sid);
    if (bounds.canCheck) return this.applyAction(fullState, sid, { type: 'CHECK' }, ctx);
    return this.applyAction(fullState, sid, { type: 'FOLD' }, ctx);
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'betting' || fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opp = otherSeat(fullState.seatIds, botSeatId);
    const oppCard = fullState.hands[opp];
    const [comm0, comm1] = fullState.community;
    const oppEval = evaluateHoldemHand(oppCard, comm0, comm1);
    const bounds = computeBettingBounds(fullState, botSeatId);

    // Exact shoe-conditional equity WITHOUT ever peeking at own forehead card!
    const pool = getRemainingShoePool(fullState.revealedHistory, fullState.community, oppCard);
    let wins = 0;
    let ties = 0;
    let totalPenalty = 0;

    for (const c of pool) {
      const myEv = evaluateHoldemHand(c, comm0, comm1);
      const cmp = compareHands(myEv, oppEval);
      if (cmp > 0) wins += 1;
      else if (cmp === 0) ties += 1;
      const pen = Math.min(bounds.myChips, computeFoldPenalty(myEv, fullState.options));
      totalPenalty += pen;
    }

    const n = pool.length;
    const pWin = wins / n;
    const pTie = ties / n;
    const expectedFoldPen = totalPenalty / n;

    if (diff === 'easy') {
      if (bounds.canCheck) {
        if (oppEval.tier === 1 && oppCard <= 5 && bounds.maxRaiseBy >= 1 && rng() < 0.72) {
          return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 3) } };
        }
        return { type: 'CHECK' };
      }
      if (oppEval.tier >= 3) return rng() < 0.85 ? { type: 'FOLD' } : { type: 'CALL' };
      if (oppEval.tier === 2 && bounds.toCall > 4) return rng() < 0.6 ? { type: 'FOLD' } : { type: 'CALL' };
      return { type: 'CALL' };
    }

    // Genius & Grand Final: exact EV + board texture exploitation
    const pot = fullState.pot;
    const evFold = -expectedFoldPen;
    const isPairedBoard = comm0 === comm1;
    const boardGap = Math.min(Math.abs(comm0 - comm1), 10 - Math.abs(comm0 - comm1));
    const isConnectedBoard = boardGap === 1 || boardGap === 2;

    let oppAggroDiscount = 0;
    if (bounds.toCall > 0) {
      const ratio = bounds.toCall / Math.max(1, pot - bounds.toCall);
      oppAggroDiscount = diff === 'grand_final'
        ? Math.min(0.2, ratio * 0.09 + fullState.raiseCount * 0.045)
        : Math.min(0.13, ratio * 0.06);
    }
    const adjWin = Math.max(0.01, Math.min(0.99, pWin - oppAggroDiscount));
    const adjEvCall = adjWin * (pot + bounds.toCall) + pTie * (pot * 0.5) - bounds.toCall;

    if (bounds.canCheck) {
      // High equity: value bet
      if (pWin >= 0.62 && bounds.maxRaiseBy >= 1) {
        const mult = pWin >= 0.8 ? 0.65 + rng() * 0.45 : 0.35 + rng() * 0.3;
        const sz = Math.min(bounds.maxRaiseBy, Math.max(1, Math.round(Math.max(pot, 5) * mult)));
        return { type: 'RAISE', payload: { raiseBy: sz } };
      }
      // Grand Final board-texture bluff: opponent whiffed on a scary paired/connected board
      if (
        diff === 'grand_final' &&
        (isConnectedBoard || isPairedBoard) &&
        oppEval.tier <= 2 &&
        bounds.maxRaiseBy >= 2 &&
        rng() < 0.28
      ) {
        const bluffSz = Math.min(bounds.maxRaiseBy, Math.max(2, Math.round(pot * 0.85)));
        return { type: 'RAISE', payload: { raiseBy: bluffSz } };
      }
      // Moderate probe
      if (pWin >= 0.48 && bounds.maxRaiseBy >= 1 && rng() < 0.3) {
        return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 2) } };
      }
      return { type: 'CHECK' };
    }

    // Facing a bet/raise
    if (adjWin >= 0.72 && bounds.maxRaiseBy >= 1 && fullState.raiseCount < 3) {
      const shove = adjWin >= 0.86 && rng() < (diff === 'grand_final' ? 0.55 : 0.32);
      const sz = shove
        ? bounds.maxRaiseBy
        : Math.min(bounds.maxRaiseBy, Math.max(2, Math.round((pot + bounds.toCall) * 0.55)));
      if (rng() < 0.75) return { type: 'RAISE', payload: { raiseBy: sz } };
      return { type: 'CALL' };
    }

    if (adjEvCall >= evFold) return { type: 'CALL' };
    if (diff === 'grand_final' && adjEvCall >= evFold - 1.1 && rng() < 0.22) return { type: 'CALL' };
    return { type: 'FOLD' };
  },

  getResult(state) {
    if (!state || state.phase !== 'ended') return null;
    return state.result || buildResult(state);
  },
};
