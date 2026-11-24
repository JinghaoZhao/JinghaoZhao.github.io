/**
 * Indian Poker (印第安扑克 / 인디언 포커) — Pure Deterministic Rules & 3-Tier AI
 * Seasons 1 & 4 · The Genius: Death Match Arena
 *
 * Zero DOM access. All randomness via ctx.rng(). Strictly enforces hidden-info
 * projection so players NEVER see their own forehead card in network state.
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

function createDeck(rng) {
  const cards = [];
  for (let n = 1; n <= 10; n++) {
    cards.push(n, n);
  }
  return shuffle(cards, rng);
}

function otherSeat(seatIds, seatId) {
  return seatIds[0] === seatId ? seatIds[1] : seatIds[0];
}

function generateJudgeAdvice(hands, seatIds, rng) {
  const advice = {};
  const names = [
    { id: 'J1', zh: '观战嘉宾 A', en: 'Judge A' },
    { id: 'J2', zh: '观战嘉宾 B', en: 'Judge B' },
    { id: 'J3', zh: '观战嘉宾 C', en: 'Judge C' },
  ];
  for (const sid of seatIds) {
    const opp = otherSeat(seatIds, sid);
    const myCard = hands[sid];
    const oppCard = hands[opp];
    const actuallyStrong = myCard > oppCard || (myCard === oppCard && myCard >= 6);
    advice[sid] = names.map((n) => {
      const honest = rng() < 0.68;
      const callGo = honest ? actuallyStrong : !actuallyStrong;
      return {
        id: n.id,
        name: { zh: n.zh, en: n.en },
        signal: callGo ? 'GO' : 'FOLD',
      };
    });
  }
  return advice;
}

function dealNextHand(state, rng, events = []) {
  const [p0, p1] = state.seatIds;
  let reshuffled = false;
  if (state.deck.length < 2) {
    state.deck = createDeck(rng);
    state.revealedHistory = [];
    state.shoeNumber += 1;
    reshuffled = true;
    events.push({ type: 'DECK_RESHUFFLE', shoeNumber: state.shoeNumber });
  }

  // Post 1-chip ante from each player
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

  const c0 = state.deck.pop();
  const c1 = state.deck.pop();
  state.hands = { [p0]: c0, [p1]: c1 };
  state.phase = 'betting';
  state.phaseLabel = { zh: '下注博弈', en: 'Betting' };
  state.currentTurnSeatId = state.nextFirstActorSeatId;
  state.lastResolution = null;
  state.reshuffledThisHand = reshuffled;
  state.actionLog = [];

  if (state.options.judgeMode) {
    state.judgeAdvice = generateJudgeAdvice(state.hands, state.seatIds, rng);
  } else {
    state.judgeAdvice = null;
  }

  events.push({ type: 'DEAL', round: state.round, pot: state.pot, reshuffled });
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
          zh: `${wName} 赢光对手全部筹码，赢得印第安扑克死亡对决！`,
          en: `${wName} claimed all chips and survived Indian Poker!`,
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

function resolveShowdown(state, actingSeatId, events) {
  const [p0, p1] = state.seatIds;
  const card0 = state.hands[p0];
  const card1 = state.hands[p1];

  state.revealedHistory.push(card0, card1);

  let winnerSeatId = null;
  let isTie = false;
  let splitOnAllInTie = false;
  const wonPot = state.pot;

  if (card0 > card1) {
    winnerSeatId = p0;
    state.chips[p0] += state.pot;
    state.pot = 0;
    state.nextFirstActorSeatId = p0;
  } else if (card1 > card0) {
    winnerSeatId = p1;
    state.chips[p1] += state.pot;
    state.pot = 0;
    state.nextFirstActorSeatId = p1;
  } else {
    isTie = true;
    // Prevent deadlock if either player went all-in and hit 0 chips on a tie
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
    penaltyAmount: 0,
    penaltySeatId: null,
  };

  events.push({
    type: 'SHOWDOWN',
    winnerSeatId,
    isTie,
    potAmount: wonPot,
    cards: { [p0]: card0, [p1]: card1 },
  });

  if (!finalizeMatchIfBust(state, events)) {
    state.phase = 'showdown';
    state.phaseLabel = isTie
      ? { zh: '平局滚存', en: 'Tie Carryover' }
      : { zh: '亮牌摊牌', en: 'Showdown' };
    // Keep currentTurnSeatId on the last actor so hotseat doesn't curtain before seeing result
    state.currentTurnSeatId = actingSeatId;
  }
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

/**
 * Compute remaining unseen card distribution in the 20-card shoe using ONLY
 * publicly revealed history + opponent's visible card (never peeks at own card).
 */
function getRemainingShoePool(revealedHistory, oppCard) {
  const counts = Array(11).fill(2);
  counts[0] = 0;
  for (const c of revealedHistory || []) {
    if (c >= 1 && c <= 10 && counts[c] > 0) counts[c] -= 1;
  }
  if (oppCard >= 1 && oppCard <= 10 && counts[oppCard] > 0) {
    counts[oppCard] -= 1;
  }
  const pool = [];
  for (let n = 1; n <= 10; n++) {
    for (let k = 0; k < counts[n]; k++) pool.push(n);
  }
  // Fallback safety if pool ever empty
  if (pool.length === 0) {
    for (let n = 1; n <= 10; n++) pool.push(n);
  }
  return pool;
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
        judgeMode: Boolean(ctx.options?.judgeMode),
        fastTimers: Boolean(ctx.options?.fastTimers),
      },
      chips: { [seatIds[0]]: startingChips, [seatIds[1]]: startingChips },
      deck: createDeck(rng),
      shoeNumber: 1,
      revealedHistory: [],
      round: 0,
      pot: 0,
      carryoverPot: 0,
      streetBet: { [seatIds[0]]: 0, [seatIds[1]]: 0 },
      actedThisStreet: { [seatIds[0]]: false, [seatIds[1]]: false },
      raiseCount: 0,
      hands: { [seatIds[0]]: null, [seatIds[1]]: null },
      phase: 'betting',
      phaseLabel: { zh: '下注博弈', en: 'Betting' },
      currentTurnSeatId: seatIds[firstIdx],
      nextFirstActorSeatId: seatIds[firstIdx],
      lastResolution: null,
      reshuffledThisHand: false,
      judgeAdvice: null,
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
      if (!bounds.canCheck) return { ok: false, reason: 'Cannot check when facing a bet' };
      return { ok: true };
    }
    if (type === 'CALL') {
      if (bounds.toCall <= 0) return { ok: false, reason: 'Nothing to call' };
      return { ok: true };
    }
    if (type === 'FOLD') {
      return { ok: true };
    }
    if (type === 'RAISE') {
      const raiseBy = Math.floor(Number(action?.payload?.raiseBy));
      if (!Number.isFinite(raiseBy) || raiseBy < 1) {
        return { ok: false, reason: 'Raise must be at least 1 chip' };
      }
      if (bounds.maxRaiseBy < 1) {
        return { ok: false, reason: 'No chips left to raise' };
      }
      if (raiseBy > bounds.maxRaiseBy) {
        return { ok: false, reason: `Max raise is ${bounds.maxRaiseBy} chips` };
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
      const isAllIn = raiseBy === bounds.maxRaiseBy && (state.chips[seatId] === addTotal || state.chips[opp] === raiseBy);

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
      const wonPot = state.pot;
      state.chips[opp] += state.pot;
      state.pot = 0;

      // 10-card Fold Penalty!
      let penaltyAmount = 0;
      if (myCard === 10) {
        penaltyAmount = Math.min(10, state.chips[seatId]);
        state.chips[seatId] -= penaltyAmount;
        state.chips[opp] += penaltyAmount;
      }

      state.revealedHistory.push(myCard, oppCard);
      state.actionLog.push({ seatId, type: 'FOLD', amount: 0, penaltyAmount });
      state.nextFirstActorSeatId = opp;

      state.lastResolution = {
        kind: 'fold',
        foldedSeatId: seatId,
        winnerSeatId: opp,
        isTie: false,
        potAmount: wonPot,
        cards: { [seatId]: myCard, [opp]: oppCard },
        penaltyAmount,
        penaltySeatId: penaltyAmount > 0 ? seatId : null,
      };

      events.push({
        type: penaltyAmount > 0 ? 'FOLD_PENALTY_10' : 'FOLD',
        seatId,
        winnerSeatId: opp,
        penaltyAmount,
        potAmount: wonPot,
      });

      if (!finalizeMatchIfBust(state, events)) {
        state.phase = 'showdown';
        state.phaseLabel =
          penaltyAmount > 0
            ? { zh: '10牌弃牌重罚！', en: '10-Card Penalty!' }
            : { zh: '弃牌结算', en: 'Fold Resolution' };
        state.currentTurnSeatId = seatId;
      }
      return { state, events };
    }

    return { state, events };
  },

  projectState(fullState, viewerSeatId) {
    const isRevealed = fullState.phase === 'showdown' || fullState.phase === 'ended';
    const [p0, p1] = fullState.seatIds;
    const projectedHands = {};

    for (const sid of [p0, p1]) {
      if (isRevealed) {
        projectedHands[sid] = fullState.hands[sid];
      } else if (viewerSeatId && sid !== viewerSeatId) {
        // In Indian Poker, you SEE your opponent's forehead card!
        projectedHands[sid] = fullState.hands[sid];
      } else {
        // Hide your OWN forehead card (and hide both for spectators during betting)
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
      hands: projectedHands,
      phase: fullState.phase,
      phaseLabel: fullState.phaseLabel,
      currentTurnSeatId: fullState.currentTurnSeatId,
      nextFirstActorSeatId: fullState.nextFirstActorSeatId,
      lastResolution: fullState.lastResolution,
      reshuffledThisHand: fullState.reshuffledThisHand,
      judgeAdvice:
        fullState.judgeAdvice && viewerSeatId ? fullState.judgeAdvice[viewerSeatId] || null : null,
      actionLog: fullState.actionLog,
      result: fullState.result,
    };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase !== 'betting') return null;
    const durationMs = fullState.options?.fastTimers ? 20000 : 45000;
    return {
      phaseKey: `r${fullState.round}-t${fullState.actionLog.length}-${fullState.currentTurnSeatId}`,
      durationMs,
    };
  },

  onPhaseTimeout(fullState, ctx) {
    if (fullState.phase !== 'betting' || !fullState.currentTurnSeatId) return null;
    const sid = fullState.currentTurnSeatId;
    const bounds = computeBettingBounds(fullState, sid);
    if (bounds.canCheck) {
      return this.applyAction(fullState, sid, { type: 'CHECK' }, ctx);
    }
    return this.applyAction(fullState, sid, { type: 'FOLD' }, ctx);
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'betting') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opp = otherSeat(fullState.seatIds, botSeatId);
    const oppCard = fullState.hands[opp]; // Legal public info in Indian Poker!
    const bounds = computeBettingBounds(fullState, botSeatId);

    // Compute exact remaining shoe probabilities (NEVER peeks at own forehead card!)
    const pool = getRemainingShoePool(fullState.revealedHistory, oppCard);
    let wins = 0;
    let ties = 0;
    let tens = 0;
    for (const c of pool) {
      if (c > oppCard) wins += 1;
      else if (c === oppCard) ties += 1;
      if (c === 10) tens += 1;
    }
    const n = pool.length;
    const pWin = wins / n;
    const pTie = ties / n;
    const pTen = tens / n;

    // Incorporate Judge Mode hint slightly if enabled
    let judgeBoost = 0;
    if (fullState.judgeAdvice && fullState.judgeAdvice[botSeatId]) {
      const gos = fullState.judgeAdvice[botSeatId].filter((j) => j.signal === 'GO').length;
      judgeBoost = (gos - 1.5) * 0.08;
    }

    const effWin = Math.max(0, Math.min(1, pWin + judgeBoost));

    // Easy AI: straightforward reactive play
    if (diff === 'easy') {
      if (bounds.canCheck) {
        if (oppCard <= 4 && bounds.maxRaiseBy >= 1 && rng() < 0.78) {
          const sz = Math.min(bounds.maxRaiseBy, Math.max(1, Math.ceil((5 - oppCard) * 1.4)));
          return { type: 'RAISE', payload: { raiseBy: sz } };
        }
        if (oppCard === 5 && bounds.maxRaiseBy >= 1 && rng() < 0.35) {
          return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 2) } };
        }
        return { type: 'CHECK' };
      }
      // Facing bet
      if (oppCard >= 8) {
        if (rng() < 0.85) return { type: 'FOLD' };
        return { type: 'CALL' };
      }
      if (oppCard <= 3 && bounds.maxRaiseBy >= 1 && fullState.raiseCount < 2 && rng() < 0.5) {
        return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 3) } };
      }
      if (oppCard <= 5 || bounds.toCall <= 2) return { type: 'CALL' };
      return rng() < 0.4 ? { type: 'CALL' } : { type: 'FOLD' };
    }

    // Genius & Grand Final AI: Exact shoe EV + 10-card fold penalty awareness + polarized bluffs
    const pot = fullState.pot;
    const expectedFoldPenalty = Math.min(10, bounds.myChips) * pTen;
    const evFold = -expectedFoldPenalty;
    const evCall = effWin * (pot + bounds.toCall) + pTie * (pot * 0.5) - bounds.toCall;

    // Infer opponent strength from their bet sizing (Grand Final adjusts for opponent aggression)
    let oppStrengthPenalty = 0;
    if (bounds.toCall > 0) {
      const betRatio = bounds.toCall / Math.max(1, pot - bounds.toCall);
      oppStrengthPenalty = diff === 'grand_final'
        ? Math.min(0.18, betRatio * 0.09 + fullState.raiseCount * 0.04)
        : Math.min(0.12, betRatio * 0.06);
    }
    const adjWin = Math.max(0.02, Math.min(0.98, effWin - oppStrengthPenalty));
    const adjEvCall = adjWin * (pot + bounds.toCall) + pTie * (pot * 0.5) - bounds.toCall;

    if (bounds.canCheck) {
      // Strong advantage: value bet
      if (effWin >= 0.62 && bounds.maxRaiseBy >= 1) {
        // Grand Final occasionally slow-plays / traps small when opp holds 1-3 to induce bluffs
        if (diff === 'grand_final' && oppCard <= 3 && rng() < 0.22) {
          return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 1) } };
        }
        const frac = effWin >= 0.82 ? 0.45 + rng() * 0.35 : 0.22 + rng() * 0.25;
        const target = Math.max(1, Math.round(Math.max(pot, 6) * frac));
        const sz = Math.min(bounds.maxRaiseBy, target);
        return { type: 'RAISE', payload: { raiseBy: sz } };
      }
      // Polarized bluff when opp holds medium-high card (6-8) and 10s are live!
      const bluffChance =
        diff === 'grand_final'
          ? oppCard >= 6 && oppCard <= 8
            ? 0.28
            : oppCard === 9 && tens > 0
            ? 0.18
            : 0.08
          : oppCard >= 6 && oppCard <= 8
          ? 0.18
          : 0.05;

      if (bounds.maxRaiseBy >= 2 && rng() < bluffChance) {
        const bluffSize = Math.min(
          bounds.maxRaiseBy,
          Math.max(2, Math.round(pot * (0.7 + rng() * 0.8)))
        );
        return { type: 'RAISE', payload: { raiseBy: bluffSize } };
      }
      // Small probe vs 5-6
      if (oppCard <= 6 && bounds.maxRaiseBy >= 1 && rng() < 0.35) {
        return { type: 'RAISE', payload: { raiseBy: Math.min(bounds.maxRaiseBy, 2) } };
      }
      return { type: 'CHECK' };
    }

    // Facing a bet or raise
    // 1. Huge advantage: value re-raise or all-in!
    if (adjWin >= 0.72 && bounds.maxRaiseBy >= 1 && fullState.raiseCount < 3) {
      const goAllIn = adjWin >= 0.86 && rng() < (diff === 'grand_final' ? 0.55 : 0.35);
      const sz = goAllIn
        ? bounds.maxRaiseBy
        : Math.min(bounds.maxRaiseBy, Math.max(2, Math.round((pot + bounds.toCall) * 0.55)));
      if (rng() < 0.75) return { type: 'RAISE', payload: { raiseBy: sz } };
      return { type: 'CALL' };
    }

    // 2. Bluff re-raise (Grand Final only, rare high-pressure shove when opp has 7-8)
    if (
      diff === 'grand_final' &&
      oppCard >= 6 &&
      oppCard <= 8 &&
      fullState.raiseCount === 1 &&
      bounds.maxRaiseBy >= 4 &&
      rng() < 0.12
    ) {
      return {
        type: 'RAISE',
        payload: { raiseBy: Math.min(bounds.maxRaiseBy, Math.max(4, Math.round(pot * 0.9))) },
      };
    }

    // 3. Call vs Fold using exact 10-penalty-adjusted EV!
    if (adjEvCall >= evFold) {
      return { type: 'CALL' };
    }

    // Hero call occasionally if pot odds are close or opponent may be bluffing with 10 live
    if (diff === 'grand_final' && adjEvCall >= evFold - 1.2 && rng() < 0.24) {
      return { type: 'CALL' };
    }

    return { type: 'FOLD' };
  },

  getResult(state) {
    if (!state || state.phase !== 'ended') return null;
    return state.result || buildResult(state);
  },
};
