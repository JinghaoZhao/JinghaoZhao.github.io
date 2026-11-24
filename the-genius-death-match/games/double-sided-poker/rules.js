/**
 * Double-Sided Poker (双面扑克 / 양면포커) — Pure Deterministic Rules & 3-Tier AI
 * Seasons 3 & 4 (S3E4, S3E5, S4E10 Grand Final) · The Genius: Death Match Arena
 *
 * Official S4E10 200-card Odd/Even paired deck (40 chips) + S3 90-card deck option (30 chips).
 * Supports Front, Back, and 2x DOUBLE-BET with +10 bonus chip steal on win or opponent fold!
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

function createDeck(deckMode, rng) {
  const cards = [];
  if (deckMode === 's3') {
    // S3: 90 distinct ordered (front, back) pairs with front !== back
    for (let f = 1; f <= 10; f++) {
      for (let b = 1; b <= 10; b++) {
        if (f !== b) cards.push({ front: f, back: b });
      }
    }
  } else {
    // S4 Official: 200 cards = 4 sets of 50 opposite-parity pairs (odd <-> even)
    const odds = [1, 3, 5, 7, 9];
    const evens = [2, 4, 6, 8, 10];
    for (let copy = 0; copy < 4; copy++) {
      for (const o of odds) {
        for (const e of evens) {
          cards.push({ front: o, back: e });
          cards.push({ front: e, back: o });
        }
      }
    }
  }
  return shuffle(cards, rng);
}

function otherSeat(seatIds, seatId) {
  return seatIds[0] === seatId ? seatIds[1] : seatIds[0];
}

export function possibleOppBacks(oppFront, deckMode) {
  if (deckMode === 's3') {
    const res = [];
    for (let n = 1; n <= 10; n++) {
      if (n !== oppFront) res.push(n);
    }
    return res;
  }
  // S4 opposite parity
  return oppFront % 2 === 1 ? [2, 4, 6, 8, 10] : [1, 3, 5, 7, 9];
}

/**
 * Compute exact legal betting bounds for single-side action AND Double-Bet upgrade.
 */
export function computeBettingBounds(state, seatId) {
  const opp = otherSeat(state.seatIds, seatId);
  const myChips = state.chips[seatId];
  const oppChips = state.chips[opp];
  const mySide = state.lockedSide[seatId];
  const oppSide = state.lockedSide[opp];
  const myUnit = state.unitBet[seatId];
  const oppUnit = state.unitBet[opp];
  const myCommitted = state.totalCommitted[seatId];

  const myMult = mySide === 'both' ? 2 : 1;
  const oppMult = oppSide === 'both' ? 2 : 1;

  // Cost to match oppUnit on my current side multiplier
  const targetCallUnit = Math.max(myUnit, oppUnit);
  const toCall = Math.max(0, targetCallUnit * myMult - myCommitted);

  // Can check only if neither player has wagered above ante AND opponent hasn't double-bet
  const canCheck = oppUnit === 0 && myUnit === 0 && oppSide !== 'both';
  const mustRespondToDouble = oppSide === 'both';

  // Max additional unitBet above targetCallUnit (capped by BOTH players' ability to afford it!)
  const myRemAfterCall = Math.max(0, myChips - toCall);
  const myMaxExtraUnits = Math.floor(myRemAfterCall / myMult);
  const oppMaxExtraUnits = Math.floor(oppChips / oppMult);
  const maxRaiseBy = Math.max(0, Math.min(myMaxExtraUnits, oppMaxExtraUnits));

  // Double-Bet eligibility: neither player is 'both' yet
  const canDoubleBetBase = mySide !== 'both' && oppSide !== 'both';
  const minDoubleUnit = Math.max(1, oppUnit);
  const minDoubleCost = Math.max(0, 2 * minDoubleUnit - myCommitted);
  const oppNeededForMinDouble = Math.max(0, minDoubleUnit - oppUnit);

  let canDoubleBet = false;
  let maxDoubleRaiseBy = 0; // extra units above minDoubleUnit
  if (canDoubleBetBase && myChips >= minDoubleCost && oppChips >= oppNeededForMinDouble) {
    canDoubleBet = true;
    const myRemForDouble = myChips - minDoubleCost;
    const oppRemForDouble = oppChips - oppNeededForMinDouble;
    maxDoubleRaiseBy = Math.max(0, Math.min(Math.floor(myRemForDouble / 2), oppRemForDouble));
  }

  return {
    myChips,
    oppChips,
    mySide,
    oppSide,
    myUnit,
    oppUnit,
    myMult,
    oppMult,
    toCall,
    canCheck,
    mustRespondToDouble,
    maxRaiseBy,
    canDoubleBet,
    minDoubleUnit,
    minDoubleCost,
    maxDoubleRaiseBy,
  };
}

function dealNextHand(state, rng, events = []) {
  const [p0, p1] = state.seatIds;
  let reshuffled = false;
  if (state.deck.length < 2) {
    state.deck = createDeck(state.options.deckMode, rng);
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
  state.lockedSide = { [p0]: null, [p1]: null };
  state.unitBet = { [p0]: 0, [p1]: 0 };
  state.totalCommitted = { [p0]: 0, [p1]: 0 };
  state.actedThisStreet = { [p0]: false, [p1]: false };
  state.raiseCount = 0;

  state.hands = {
    [p0]: state.deck.pop(),
    [p1]: state.deck.pop(),
  };

  state.phase = 'betting';
  state.phaseLabel = { zh: '双面下注', en: 'Dual-Face Betting' };
  state.currentTurnSeatId = state.nextFirstActorSeatId;
  state.lastResolution = null;
  state.reshuffledThisHand = reshuffled;
  state.actionLog = [];

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
          zh: `${wName} 掌控正反双面心理博弈，赢得双面扑克死亡对决！`,
          en: `${wName} conquered both faces and won Double-Sided Poker!`,
        }
      : {
          zh: '双方筹码持平，平局收场。',
          en: 'Match ended in a draw.',
        },
  };
}

function finalizeIfBust(state, events) {
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
  const s0 = state.lockedSide[p0] || 'front';
  const s1 = state.lockedSide[p1] || 'front';
  const h0 = state.hands[p0];
  const h1 = state.hands[p1];
  const wonPot = state.pot;

  let winnerSeatId = null;
  let isTie = false;
  let splitOnAllInTie = false;
  let doubleBetBonus = 0;
  let doubleBettorId = null;
  let doubleBetSuccess = false;

  if (s0 === 'both' || s1 === 'both') {
    doubleBettorId = s0 === 'both' ? p0 : p1;
    const oppId = otherSeat(state.seatIds, doubleBettorId);
    const dCard = state.hands[doubleBettorId];
    const oppSide = state.lockedSide[oppId] || 'front';
    const oppVal = state.hands[oppId][oppSide];

    if (dCard.front > oppVal && dCard.back > oppVal) {
      // Double-Bet JACKPOT! Both sides strictly beat opponent!
      doubleBetSuccess = true;
      winnerSeatId = doubleBettorId;
      state.chips[doubleBettorId] += state.pot;
      state.pot = 0;
      doubleBetBonus = Math.min(10, state.chips[oppId]);
      state.chips[oppId] -= doubleBetBonus;
      state.chips[doubleBettorId] += doubleBetBonus;
      state.nextFirstActorSeatId = doubleBettorId;
    } else {
      // Double-Bet FAILED! Opponent wins entire pot (no extra penalty)
      doubleBetSuccess = false;
      winnerSeatId = oppId;
      state.chips[oppId] += state.pot;
      state.pot = 0;
      state.nextFirstActorSeatId = oppId;
    }
  } else {
    // Standard single-side comparison
    const v0 = h0[s0];
    const v1 = h1[s1];
    if (v0 > v1) {
      winnerSeatId = p0;
      state.chips[p0] += state.pot;
      state.pot = 0;
      state.nextFirstActorSeatId = p0;
    } else if (v1 > v0) {
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
  }

  // Only expose backs that were actually played in showdown!
  const revealedSides = {
    [p0]: s0 === 'both' ? { front: h0.front, back: h0.back } : s0 === 'back' ? { front: h0.front, back: h0.back } : { front: h0.front, back: null },
    [p1]: s1 === 'both' ? { front: h1.front, back: h1.back } : s1 === 'back' ? { front: h1.front, back: h1.back } : { front: h1.front, back: null },
  };

  state.lastResolution = {
    kind: 'showdown',
    winnerSeatId,
    isTie,
    splitOnAllInTie,
    potAmount: wonPot,
    sides: { [p0]: s0, [p1]: s1 },
    revealedSides,
    doubleBettorId,
    doubleBetSuccess,
    doubleBetBonus,
  };

  events.push({
    type: doubleBetSuccess ? 'DOUBLE_BET_JACKPOT' : 'SHOWDOWN',
    winnerSeatId,
    isTie,
    potAmount: wonPot,
    doubleBetBonus,
  });

  if (!finalizeIfBust(state, events)) {
    state.phase = 'showdown';
    state.phaseLabel = doubleBetSuccess
      ? { zh: '双面大满贯 +10！', en: 'DOUBLE-BET +10!' }
      : isTie
      ? { zh: '平局滚存', en: 'Tie Carryover' }
      : { zh: '摊牌结算', en: 'Showdown' };
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
    const deckMode = ctx.options?.deckMode === 's3' ? 's3' : 's4';
    const startingChips = deckMode === 's3' ? 30 : 40;
    const firstIdx = rng() < 0.5 ? 0 : 1;

    const state = {
      seatIds,
      seatsById,
      options: {
        deckMode,
        startingChips,
        fastTimers: Boolean(ctx.options?.fastTimers),
      },
      chips: { [seatIds[0]]: startingChips, [seatIds[1]]: startingChips },
      deck: createDeck(deckMode, rng),
      shoeNumber: 1,
      round: 0,
      pot: 0,
      carryoverPot: 0,
      lockedSide: { [seatIds[0]]: null, [seatIds[1]]: null },
      unitBet: { [seatIds[0]]: 0, [seatIds[1]]: 0 },
      totalCommitted: { [seatIds[0]]: 0, [seatIds[1]]: 0 },
      actedThisStreet: { [seatIds[0]]: false, [seatIds[1]]: false },
      raiseCount: 0,
      hands: { [seatIds[0]]: null, [seatIds[1]]: null },
      phase: 'betting',
      phaseLabel: { zh: '双面下注', en: 'Dual-Face Betting' },
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
    const chosenSide = action?.payload?.side;

    const validateSingleSide = () => {
      if (bounds.mySide === 'both') return { ok: true };
      if (bounds.mySide === 'front' || bounds.mySide === 'back') {
        if (chosenSide && chosenSide !== bounds.mySide) {
          return { ok: false, reason: 'Side already locked for this hand' };
        }
        return { ok: true };
      }
      if (chosenSide !== 'front' && chosenSide !== 'back') {
        return { ok: false, reason: 'Must select Front or Back side' };
      }
      return { ok: true };
    };

    if (type === 'FOLD') {
      return { ok: true };
    }
    if (type === 'CHECK') {
      if (!bounds.canCheck) return { ok: false, reason: 'Cannot check now' };
      return validateSingleSide();
    }
    if (type === 'CALL') {
      if (bounds.canCheck) return { ok: false, reason: 'Nothing to call; use Check' };
      if (bounds.toCall > bounds.myChips) return { ok: false, reason: 'Not enough chips to call' };
      return validateSingleSide();
    }
    if (type === 'RAISE') {
      const sideCheck = validateSingleSide();
      if (!sideCheck.ok) return sideCheck;
      const raiseBy = Math.floor(Number(action?.payload?.raiseBy));
      if (!Number.isFinite(raiseBy) || raiseBy < 1 || raiseBy > bounds.maxRaiseBy) {
        return { ok: false, reason: `Raise must be between 1 and ${bounds.maxRaiseBy}` };
      }
      return { ok: true };
    }
    if (type === 'DOUBLE_BET') {
      if (!bounds.canDoubleBet) {
        return { ok: false, reason: 'Double-Bet not available' };
      }
      const extraUnits = Math.floor(Number(action?.payload?.extraUnits ?? 0));
      if (!Number.isFinite(extraUnits) || extraUnits < 0 || extraUnits > bounds.maxDoubleRaiseBy) {
        return { ok: false, reason: `Double-Bet extra raise must be 0..${bounds.maxDoubleRaiseBy}` };
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
    const lockSideIfNeeded = () => {
      if (!state.lockedSide[seatId]) {
        state.lockedSide[seatId] = action?.payload?.side === 'back' ? 'back' : 'front';
      }
    };

    if (type === 'CHECK') {
      lockSideIfNeeded();
      state.actedThisStreet[seatId] = true;
      state.actionLog.push({ seatId, type: 'CHECK', side: state.lockedSide[seatId], amount: 0 });
      events.push({ type: 'CHECK', seatId, side: state.lockedSide[seatId] });
      if (state.actedThisStreet[opp]) {
        resolveShowdown(state, seatId, events);
      } else {
        state.currentTurnSeatId = opp;
      }
      return { state, events };
    }

    if (type === 'CALL') {
      lockSideIfNeeded();
      const mult = state.lockedSide[seatId] === 'both' ? 2 : 1;
      const targetUnit = Math.max(state.unitBet[seatId], state.unitBet[opp]);
      const cost = Math.max(0, targetUnit * mult - state.totalCommitted[seatId]);

      state.chips[seatId] -= cost;
      state.unitBet[seatId] = targetUnit;
      state.totalCommitted[seatId] += cost;
      state.pot += cost;
      state.actedThisStreet[seatId] = true;

      state.actionLog.push({ seatId, type: 'CALL', side: state.lockedSide[seatId], amount: cost });
      events.push({ type: 'CALL', seatId, side: state.lockedSide[seatId], amount: cost });
      resolveShowdown(state, seatId, events);
      return { state, events };
    }

    if (type === 'RAISE') {
      lockSideIfNeeded();
      const raiseBy = Math.floor(Number(action.payload.raiseBy));
      const mult = state.lockedSide[seatId] === 'both' ? 2 : 1;
      const targetUnit = Math.max(state.unitBet[seatId], state.unitBet[opp]) + raiseBy;
      const cost = Math.max(0, targetUnit * mult - state.totalCommitted[seatId]);
      const isOpening = state.unitBet[opp] === 0 && state.unitBet[seatId] === 0 && state.lockedSide[opp] !== 'both';

      state.chips[seatId] -= cost;
      state.unitBet[seatId] = targetUnit;
      state.totalCommitted[seatId] += cost;
      state.pot += cost;
      state.actedThisStreet[seatId] = true;
      state.actedThisStreet[opp] = false;
      state.raiseCount += 1;
      state.currentTurnSeatId = opp;

      const logType = isOpening ? 'BET' : 'RAISE';
      state.actionLog.push({ seatId, type: logType, side: state.lockedSide[seatId], amount: cost, unitBet: targetUnit });
      events.push({ type: logType, seatId, side: state.lockedSide[seatId], amount: cost });
      return { state, events };
    }

    if (type === 'DOUBLE_BET') {
      const extraUnits = Math.floor(Number(action?.payload?.extraUnits ?? 0));
      const targetUnit = bounds.minDoubleUnit + extraUnits;
      const cost = Math.max(0, 2 * targetUnit - state.totalCommitted[seatId]);

      state.lockedSide[seatId] = 'both';
      state.chips[seatId] -= cost;
      state.unitBet[seatId] = targetUnit;
      state.totalCommitted[seatId] += cost;
      state.pot += cost;
      state.actedThisStreet[seatId] = true;
      state.actedThisStreet[opp] = false;
      state.raiseCount += 1;
      state.currentTurnSeatId = opp;

      state.actionLog.push({ seatId, type: 'DOUBLE_BET', side: 'both', amount: cost, unitBet: targetUnit });
      events.push({ type: 'DOUBLE_BET', seatId, amount: cost, unitBet: targetUnit });
      return { state, events };
    }

    if (type === 'FOLD') {
      const wonPot = state.pot;
      state.chips[opp] += state.pot;
      state.pot = 0;

      // If opponent declared DOUBLE-BET, folding pays them +10 bonus chips!
      let doubleBetBonus = 0;
      const oppDoubleBet = state.lockedSide[opp] === 'both';
      if (oppDoubleBet) {
        doubleBetBonus = Math.min(10, state.chips[seatId]);
        state.chips[seatId] -= doubleBetBonus;
        state.chips[opp] += doubleBetBonus;
      }

      state.actionLog.push({ seatId, type: 'FOLD', amount: 0, doubleBetBonus });
      state.nextFirstActorSeatId = opp;

      state.lastResolution = {
        kind: 'fold',
        foldedSeatId: seatId,
        winnerSeatId: opp,
        isTie: false,
        potAmount: wonPot,
        sides: { ...state.lockedSide },
        revealedSides: {
          [seatId]: { front: state.hands[seatId].front, back: null },
          [opp]: { front: state.hands[opp].front, back: null },
        },
        doubleBettorId: oppDoubleBet ? opp : null,
        doubleBetSuccess: oppDoubleBet,
        doubleBetBonus,
      };

      events.push({
        type: doubleBetBonus > 0 ? 'DOUBLE_BET_FOLD_BONUS' : 'FOLD',
        seatId,
        winnerSeatId: opp,
        potAmount: wonPot,
        doubleBetBonus,
      });

      if (!finalizeIfBust(state, events)) {
        state.phase = 'showdown';
        state.phaseLabel =
          doubleBetBonus > 0
            ? { zh: '双面威慑 +10 筹码！', en: 'Double-Bet Bonus +10!' }
            : { zh: '弃牌结算', en: 'Fold Settlement' };
        state.currentTurnSeatId = seatId;
      }
      return { state, events };
    }

    return { state, events };
  },

  projectState(fullState, viewerSeatId) {
    const isShowdown = fullState.phase === 'showdown' || fullState.phase === 'ended';
    const projectedHands = {};

    for (const sid of fullState.seatIds) {
      const card = fullState.hands[sid];
      if (!card) {
        projectedHands[sid] = null;
        continue;
      }
      const isMine = viewerSeatId && sid === viewerSeatId;
      const playedBackAtShowdown =
        isShowdown &&
        fullState.lastResolution?.kind === 'showdown' &&
        (fullState.lockedSide[sid] === 'back' || fullState.lockedSide[sid] === 'both');

      projectedHands[sid] = {
        front: card.front,
        back: isMine || playedBackAtShowdown ? card.back : null,
      };
    }

    return {
      seatIds: fullState.seatIds,
      seatsById: fullState.seatsById,
      options: fullState.options,
      chips: fullState.chips,
      deckRemaining: fullState.deck.length,
      shoeNumber: fullState.shoeNumber,
      round: fullState.round,
      pot: fullState.pot,
      carryoverPot: fullState.carryoverPot,
      lockedSide: fullState.lockedSide,
      unitBet: fullState.unitBet,
      totalCommitted: fullState.totalCommitted,
      actedThisStreet: fullState.actedThisStreet,
      raiseCount: fullState.raiseCount,
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
      phaseKey: `dsp-r${fullState.round}-t${fullState.actionLog.length}-${fullState.currentTurnSeatId}`,
      durationMs,
    };
  },

  onPhaseTimeout(fullState, ctx) {
    if (fullState.phase !== 'betting' || !fullState.currentTurnSeatId) return null;
    const sid = fullState.currentTurnSeatId;
    const bounds = computeBettingBounds(fullState, sid);
    const defaultSide = bounds.mySide && bounds.mySide !== 'both' ? bounds.mySide : 'front';
    if (bounds.canCheck) {
      return this.applyAction(fullState, sid, { type: 'CHECK', payload: { side: defaultSide } }, ctx);
    }
    return this.applyAction(fullState, sid, { type: 'FOLD' }, ctx);
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase !== 'betting' || fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opp = otherSeat(fullState.seatIds, botSeatId);
    const myCard = fullState.hands[botSeatId];
    const oppFront = fullState.hands[opp].front; // Legal public info; NEVER peeks at opp.back!
    const bounds = computeBettingBounds(fullState, botSeatId);
    const deckMode = fullState.options.deckMode;
    const oppBacks = possibleOppBacks(oppFront, deckMode);

    // Estimate opponent's distribution based on their locked side & bet aggression
    let oppValues = [];
    if (bounds.oppSide === 'front') {
      oppValues = [oppFront];
    } else if (bounds.oppSide === 'back') {
      // Weight higher backs slightly more when opponent raised aggressively
      for (const b of oppBacks) {
        const w = bounds.oppUnit >= 4 ? (b >= 7 ? 3 : b >= 5 ? 2 : 1) : b >= 6 ? 2 : 1;
        for (let k = 0; k < w; k++) oppValues.push(b);
      }
    } else if (bounds.oppSide === 'both') {
      // Opponent Double-Bet: their back is likely strong, though they might bluff!
      for (const b of oppBacks) {
        const w = b >= 7 ? 3 : b >= 5 ? 2 : 1;
        for (let k = 0; k < w; k++) oppValues.push(Math.min(oppFront, b));
      }
    } else {
      // Opponent hasn't locked yet: assume they play max(oppFront, oppBack)
      for (const b of oppBacks) {
        oppValues.push(Math.max(oppFront, b));
      }
    }

    const evalWinProb = (val) => {
      if (bounds.oppSide === 'both') {
        // Against opponent's Double-Bet, I win if oppFront <= val OR oppBack <= val!
        let wins = 0;
        for (const b of oppBacks) {
          if (!(oppFront > val && b > val)) wins += 1;
        }
        return { pWin: wins / oppBacks.length, pTie: 0 };
      }
      let w = 0;
      let t = 0;
      for (const ov of oppValues) {
        if (val > ov) w += 1;
        else if (val === ov) t += 1;
      }
      return { pWin: w / oppValues.length, pTie: t / oppValues.length };
    };

    const evalDoubleWinProb = () => {
      const minMine = Math.min(myCard.front, myCard.back);
      let w = 0;
      for (const ov of oppValues) {
        if (minMine > ov) w += 1;
      }
      return w / oppValues.length;
    };

    // Choose side if not yet locked
    let chosenSide = bounds.mySide;
    if (!chosenSide) {
      if (diff === 'easy') {
        chosenSide = myCard.front >= myCard.back ? 'front' : 'back';
      } else {
        // Genius/Grand Final: pick higher value, except if front already beats oppFront cleanly
        // or slight concealment preference for back when close
        if (bounds.oppSide === 'front') {
          if (myCard.front > oppFront && myCard.back > oppFront) {
            chosenSide = myCard.front >= myCard.back ? 'front' : 'back';
          } else if (myCard.front > oppFront) {
            chosenSide = 'front';
          } else if (myCard.back > oppFront) {
            chosenSide = 'back';
          } else {
            chosenSide = 'back'; // Bluff potential on hidden back!
          }
        } else {
          chosenSide = myCard.back >= myCard.front ? 'back' : 'front';
        }
      }
    }

    const activeVal = chosenSide === 'both' ? Math.min(myCard.front, myCard.back) : myCard[chosenSide];
    const { pWin, pTie } = evalWinProb(activeVal);
    const pDouble = evalDoubleWinProb();

    // Easy AI
    if (diff === 'easy') {
      if (bounds.canDoubleBet && Math.min(myCard.front, myCard.back) >= 8 && rng() < 0.5) {
        return { type: 'DOUBLE_BET', payload: { extraUnits: Math.min(bounds.maxDoubleRaiseBy, 1) } };
      }
      if (bounds.canCheck) {
        if (activeVal >= 7 && bounds.maxRaiseBy >= 1 && rng() < 0.7) {
          return { type: 'RAISE', payload: { side: chosenSide, raiseBy: Math.min(bounds.maxRaiseBy, 3) } };
        }
        return { type: 'CHECK', payload: { side: chosenSide } };
      }
      if (pWin >= 0.42 || bounds.toCall <= 2) return { type: 'CALL', payload: { side: chosenSide } };
      return { type: 'FOLD' };
    }

    // Genius & Grand Final AI
    const pot = fullState.pot;

    // 1. Consider DOUBLE-BET (Value OR Semi-Bluff to harvest +10 fold equity!)
    if (bounds.canDoubleBet) {
      const strongDouble = pDouble >= 0.72;
      const semiBluffDouble =
        diff === 'grand_final' &&
        Math.min(myCard.front, myCard.back) >= 6 &&
        oppFront <= 5 &&
        bounds.oppSide !== 'back' &&
        rng() < 0.25;

      if ((strongDouble && rng() < (diff === 'grand_final' ? 0.78 : 0.58)) || semiBluffDouble) {
        const extra =
          strongDouble && bounds.maxDoubleRaiseBy >= 1
            ? Math.min(bounds.maxDoubleRaiseBy, Math.max(0, Math.round(bounds.maxDoubleRaiseBy * 0.25)))
            : 0;
        return { type: 'DOUBLE_BET', payload: { extraUnits: extra } };
      }
    }

    // 2. If can Check (opening or checking back)
    if (bounds.canCheck) {
      if (pWin >= 0.65 && bounds.maxRaiseBy >= 1) {
        const sz = Math.min(bounds.maxRaiseBy, Math.max(1, Math.round(Math.max(pot, 6) * (0.35 + rng() * 0.35))));
        return { type: 'RAISE', payload: { side: chosenSide, raiseBy: sz } };
      }
      // Grand Final Back-Bluff when holding a weak card but showing/hiding parity threat
      if (diff === 'grand_final' && chosenSide === 'back' && pWin < 0.35 && bounds.maxRaiseBy >= 2 && rng() < 0.22) {
        return { type: 'RAISE', payload: { side: 'back', raiseBy: Math.min(bounds.maxRaiseBy, 3) } };
      }
      if (pWin >= 0.48 && bounds.maxRaiseBy >= 1 && rng() < 0.32) {
        return { type: 'RAISE', payload: { side: chosenSide, raiseBy: Math.min(bounds.maxRaiseBy, 2) } };
      }
      return { type: 'CHECK', payload: { side: chosenSide } };
    }

    // 3. Facing a bet / raise / Double-Bet
    const foldTax = bounds.mustRespondToDouble ? Math.min(10, bounds.myChips) : 0;
    const evFold = -foldTax;
    const winGain = pot + bounds.toCall + (bounds.mySide === 'both' ? Math.min(10, bounds.oppChips) : 0);
    const loseExtra = bounds.mustRespondToDouble ? Math.min(10, Math.max(0, bounds.myChips - bounds.toCall)) : 0;
    const evCall = pWin * winGain + pTie * (pot * 0.5) - (1 - pWin - pTie) * loseExtra - bounds.toCall;

    // Value re-raise when clearly ahead
    if (pWin >= 0.78 && bounds.maxRaiseBy >= 1 && fullState.raiseCount < 3 && rng() < 0.65) {
      const sz = Math.min(bounds.maxRaiseBy, Math.max(1, Math.round((pot + bounds.toCall) * 0.45)));
      return { type: 'RAISE', payload: { side: chosenSide, raiseBy: sz } };
    }

    // Notice how foldTax (+10 penalty on folding to Double-Bet!) makes calling rationally wider!
    if (evCall >= evFold) {
      return { type: 'CALL', payload: { side: chosenSide } };
    }
    if (diff === 'grand_final' && evCall >= evFold - 1.5 && rng() < 0.2) {
      return { type: 'CALL', payload: { side: chosenSide } };
    }
    return { type: 'FOLD' };
  },

  getResult(state) {
    if (!state || state.phase !== 'ended') return null;
    return state.result || buildResult(state);
  },
};
