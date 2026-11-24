/**
 * Sun, Moon, Star (해, 달, 별 / 日月星) — Pure Deterministic Rule Engine
 * Zero DOM access · Seeded RNG · Official S2E2 / S2E4 Forced-2x Betting Rules
 */

export const SYMBOLS = ['sun', 'moon', 'star'];

const TRUST_RATES = {
  reliable: 0.85,
  neutral: 0.65,
  trickster: 0.35,
};

const CUP_HOSTS = [
  { zh: '卢洪哲', en: 'Noh Hong-chul', trust: 'trickster' },
  { zh: '金栽经', en: 'Kim Jae-kyung', trust: 'reliable' },
  { zh: '殷志源', en: 'Eun Ji-won', trust: 'neutral' },
  { zh: '李恩杰', en: 'Lee Eun-gyeol', trust: 'trickster' },
  { zh: '洪榛浩', en: 'Hong Jin-ho', trust: 'reliable' },
  { zh: '李相敏', en: 'Lee Sang-min', trust: 'neutral' },
  { zh: '林遥焕', en: 'Lim Yo-hwan', trust: 'reliable' },
  { zh: '赵由英', en: 'Jo Yoo-young', trust: 'neutral' },
  { zh: '李斗熙', en: 'Lee Doo-hee', trust: 'reliable' },
  { zh: '刘正贤', en: 'Yoo Jung-hyun', trust: 'trickster' },
];

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function pickOtherSymbol(sym, rng) {
  const others = SYMBOLS.filter((s) => s !== sym);
  return others[Math.floor(rng() * others.length)];
}

function makeWhisper(actualSymbol, trust, rng) {
  const rate = TRUST_RATES[trust] ?? 0.65;
  const truthful = rng() < rate;
  const kind = rng() < 0.52 ? 'eliminate' : 'claim';

  if (kind === 'eliminate') {
    // Truthful: names a wrong symbol as "NOT X"; Bluff: names the actual symbol as "NOT X"
    const target = truthful ? pickOtherSymbol(actualSymbol, rng) : actualSymbol;
    return { kind: 'eliminate', symbol: target, trust };
  }
  // Claim: Truthful names actualSymbol; Bluff names a wrong symbol
  const target = truthful ? actualSymbol : pickOtherSymbol(actualSymbol, rng);
  return { kind: 'claim', symbol: target, trust };
}

function generateCup(cupNumber, seatOrder, rng) {
  const host = CUP_HOSTS[(cupNumber - 1) % CUP_HOSTS.length];
  const secretSymbol = SYMBOLS[Math.floor(rng() * 3)];
  const whispers = {};
  for (const sid of seatOrder) {
    whispers[sid] = makeWhisper(secretSymbol, host.trust, rng);
  }
  return {
    cupNumber,
    hostName: { zh: host.zh, en: host.en },
    trust: host.trust,
    secretSymbol,
    whispers,
  };
}

export function getFirstBetBounds(firstChips, secondChips) {
  const minBet = 1;
  const maxBet = Math.max(1, Math.min(firstChips, Math.floor(secondChips / 2)));
  return { minBet, maxBet };
}

export function getSecondBetBounds(secondChips, firstBetAmount) {
  const minBet = Math.min(secondChips, Math.max(1, 2 * firstBetAmount));
  const maxBet = secondChips;
  return { minBet, maxBet };
}

function posteriorFromWhisper(whisper) {
  const p = { sun: 1 / 3, moon: 1 / 3, star: 1 / 3 };
  if (!whisper) return p;
  const r = TRUST_RATES[whisper.trust] ?? 0.65;

  if (whisper.kind === 'claim') {
    // P(claim X | true = X) = r; P(claim X | true = Y != X) = (1 - r) / 2
    for (const s of SYMBOLS) {
      p[s] = s === whisper.symbol ? r : (1 - r) / 2;
    }
  } else {
    // Eliminate X: P(not X | true = X) = 1 - r; P(not X | true = Y != X) = r / 2
    for (const s of SYMBOLS) {
      p[s] = s === whisper.symbol ? 1 - r : r / 2;
    }
  }
  const sum = p.sun + p.moon + p.star;
  for (const s of SYMBOLS) p[s] /= sum;
  return p;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const totalRounds = 10;
    const starterIdx = ctx.rng() < 0.5 ? 0 : 1;

    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        chips: 4,
        correctHits: 0,
      };
    }

    const cups = [];
    for (let r = 1; r <= totalRounds; r++) {
      cups.push(generateCup(r, seatOrder, ctx.rng));
    }

    const firstSeatId = seatOrder[starterIdx];
    const secondSeatId = seatOrder[1 - starterIdx];

    return {
      phase: 'bet_first', // 'bet_first' | 'bet_second' | 'reveal' | 'ended'
      round: 1,
      totalRounds,
      isOvertime: false,
      phaseLabel: { zh: '先手下注阶段', en: 'First Bettor Wager' },
      seatOrder,
      starterIdx,
      firstSeatId,
      secondSeatId,
      currentTurnSeatId: firstSeatId,
      players,
      cups,
      currentBets: {}, // { [firstSeatId]: { symbol, amount }, [secondSeatId]: { symbol, amount } }
      history: [],
      lastReveal: null,
      winnerSeatIds: [],
      winReason: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match has ended' };
    }
    const { type, payload } = action || {};

    if (fullState.phase === 'reveal') {
      if (type !== 'NEXT_CUP') return { ok: false, reason: 'Advance to next cup' };
      return { ok: true };
    }

    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn to wager' };
    }

    if (type !== 'PLACE_BET') {
      return { ok: false, reason: 'Place a symbol and chip wager' };
    }

    const symbol = payload?.symbol;
    const amount = Number(payload?.amount);
    if (!SYMBOLS.includes(symbol)) {
      return { ok: false, reason: 'Select Sun, Moon, or Star' };
    }
    if (!Number.isInteger(amount) || amount < 1) {
      return { ok: false, reason: 'Wager must be a positive integer' };
    }

    const firstChips = fullState.players[fullState.firstSeatId].chips;
    const secondChips = fullState.players[fullState.secondSeatId].chips;

    if (fullState.phase === 'bet_first') {
      const { minBet, maxBet } = getFirstBetBounds(firstChips, secondChips);
      if (amount < minBet || amount > maxBet) {
        return { ok: false, reason: `First wager must be between ${minBet} and ${maxBet}` };
      }
      return { ok: true };
    }

    if (fullState.phase === 'bet_second') {
      const firstAmt = fullState.currentBets[fullState.firstSeatId]?.amount || 1;
      const { minBet, maxBet } = getSecondBetBounds(secondChips, firstAmt);
      if (amount < minBet || amount > maxBet) {
        return { ok: false, reason: `Forced 2× wager must be between ${minBet} and ${maxBet}` };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Invalid phase' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const { type, payload } = action;
    const events = [];

    if (next.phase === 'bet_first' && type === 'PLACE_BET') {
      next.currentBets[seatId] = { symbol: payload.symbol, amount: Number(payload.amount) };
      next.phase = 'bet_second';
      next.currentTurnSeatId = next.secondSeatId;
      next.phaseLabel = { zh: '后手强制 2× 下注', en: 'Second Bettor Forced 2×' };
      events.push({ type: 'FIRST_BET', seatId, symbol: payload.symbol, amount: Number(payload.amount) });
      return { state: next, events };
    }

    if (next.phase === 'bet_second' && type === 'PLACE_BET') {
      next.currentBets[seatId] = { symbol: payload.symbol, amount: Number(payload.amount) };
      const cup = next.cups[next.round - 1];
      const secret = cup.secretSymbol;

      const preChips = {};
      const deltas = {};
      const hits = {};

      for (const sid of next.seatOrder) {
        const p = next.players[sid];
        preChips[sid] = p.chips;
        const bet = next.currentBets[sid];
        const hit = bet.symbol === secret;
        hits[sid] = hit;
        // Correct: receive 3x wager total (net +2x). Wrong: lose wager (net -1x).
        const delta = hit ? bet.amount * 2 : -bet.amount;
        deltas[sid] = delta;
        p.chips = Math.max(0, p.chips + delta);
        if (hit) p.correctHits += 1;
      }

      // Edge case: simultaneous double bust -> restore both to 1 chip (unless final round with higher prior stack)
      const [s0, s1] = next.seatOrder;
      let doubleBustReset = false;
      if (next.players[s0].chips === 0 && next.players[s1].chips === 0) {
        if (next.round >= next.totalRounds && preChips[s0] !== preChips[s1]) {
          // Higher prior stack wins at end of final round
        } else {
          next.players[s0].chips = 1;
          next.players[s1].chips = 1;
          doubleBustReset = true;
        }
      }

      const record = {
        round: next.round,
        secretSymbol: secret,
        hostName: cup.hostName,
        trust: cup.trust,
        firstSeatId: next.firstSeatId,
        secondSeatId: next.secondSeatId,
        bets: { ...next.currentBets },
        hits,
        deltas,
        preChips,
        postChips: { [s0]: next.players[s0].chips, [s1]: next.players[s1].chips },
        doubleBustReset,
      };
      next.history.push(record);
      next.lastReveal = record;
      next.phase = 'reveal';
      next.currentTurnSeatId = null;
      next.phaseLabel = { zh: '圣杯揭晓', en: 'Chalice Reveal' };
      events.push({ type: 'CUP_REVEALED', round: next.round, secretSymbol: secret, hits, deltas });
      return { state: next, events };
    }

    if (next.phase === 'reveal' && type === 'NEXT_CUP') {
      const [s0, s1] = next.seatOrder;
      const c0 = next.players[s0].chips;
      const c1 = next.players[s1].chips;

      // Check bust elimination
      if (c0 === 0 || c1 === 0) {
        next.phase = 'ended';
        next.phaseLabel = { zh: '破产淘汰', en: 'Elimination Verdict' };
        if (c0 > c1) next.winnerSeatIds = [s0];
        else if (c1 > c0) next.winnerSeatIds = [s1];
        else {
          const pre = next.lastReveal?.preChips || {};
          next.winnerSeatIds = (pre[s0] || 0) >= (pre[s1] || 0) ? [s0] : [s1];
        }
        next.winReason = 'bust';
        events.push({ type: 'MATCH_END', winnerSeatIds: next.winnerSeatIds });
        return { state: next, events };
      }

      // Check end of 10 rounds (or overtime)
      if (next.round >= next.totalRounds && c0 !== c1) {
        next.phase = 'ended';
        next.phaseLabel = { zh: '十轮终局', en: 'Final Verdict' };
        next.winnerSeatIds = c0 > c1 ? [s0] : [s1];
        next.winReason = next.isOvertime ? 'overtime' : 'chips';
        events.push({ type: 'MATCH_END', winnerSeatIds: next.winnerSeatIds });
        return { state: next, events };
      }

      // Advance to next cup (or generate sudden-death overtime cup)
      next.round += 1;
      next.isOvertime = next.round > next.totalRounds;
      if (next.cups.length < next.round) {
        next.cups.push(generateCup(next.round, next.seatOrder, ctx.rng));
      }
      next.starterIdx = 1 - next.starterIdx;
      next.firstSeatId = next.seatOrder[next.starterIdx];
      next.secondSeatId = next.seatOrder[1 - next.starterIdx];
      next.currentTurnSeatId = next.firstSeatId;
      next.currentBets = {};
      next.phase = 'bet_first';
      next.phaseLabel = next.isOvertime
        ? { zh: '加时先手下注', en: 'OT First Wager' }
        : { zh: '先手下注阶段', en: 'First Bettor Wager' };
      events.push({ type: 'NEXT_CUP', round: next.round });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState, viewerSeatId) {
    if (!fullState) return null;
    const isEnded = fullState.phase === 'ended';
    const isReveal = fullState.phase === 'reveal';
    const curIdx = fullState.round - 1;
    const curCup = fullState.cups[curIdx];

    const safeCups = fullState.cups.map((c, idx) => {
      const done = idx < fullState.history.length;
      return {
        cupNumber: c.cupNumber,
        hostName: c.hostName,
        trust: c.trust,
        secretSymbol: done || isEnded ? c.secretSymbol : null,
      };
    });

    // Strictly expose ONLY viewerSeatId's private whisper for the current cup!
    const myWhisper =
      viewerSeatId && curCup && !isEnded ? curCup.whispers[viewerSeatId] || null : null;

    return {
      phase: fullState.phase,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      isOvertime: fullState.isOvertime,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      firstSeatId: fullState.firstSeatId,
      secondSeatId: fullState.secondSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      players: fullState.players,
      cups: safeCups,
      currentCupMeta: curCup
        ? {
            cupNumber: curCup.cupNumber,
            hostName: curCup.hostName,
            trust: curCup.trust,
            secretSymbol: isReveal || isEnded ? curCup.secretSymbol : null,
          }
        : null,
      myWhisper,
      currentBets: fullState.currentBets, // First bettor's bet is PUBLIC to second bettor by rule!
      history: fullState.history,
      lastReveal: fullState.lastReveal,
      winnerSeatIds: fullState.winnerSeatIds,
      winReason: fullState.winReason,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'ended' || fullState.phase === 'reveal') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const diff = ctx.difficulty || 'genius';
    const rng = ctx.rng;
    const cup = fullState.cups[fullState.round - 1];
    const myWhisper = cup.whispers[botSeatId];
    const probs = posteriorFromWhisper(myWhisper);
    const otherId = fullState.seatOrder.find((id) => id !== botSeatId);
    const myChips = fullState.players[botSeatId].chips;
    const oppChips = fullState.players[otherId].chips;

    const sortedSyms = SYMBOLS.slice().sort((a, b) => probs[b] - probs[a]);
    let bestSym = sortedSyms[0];
    let bestProb = probs[bestSym];

    if (fullState.phase === 'bet_first') {
      const { minBet, maxBet } = getFirstBetBounds(myChips, oppChips);

      if (diff === 'easy') {
        const sym = rng() < 0.72 ? bestSym : SYMBOLS[Math.floor(rng() * 3)];
        const amt = minBet + Math.floor(rng() * Math.min(2, maxBet - minBet + 1));
        return { type: 'PLACE_BET', payload: { symbol: sym, amount: Math.min(maxBet, amt) } };
      }

      // Genius & Grand Final exploit Forced-2x Traps!
      let chosenSym = bestSym;
      let wager = minBet;

      // Leading in chips? Bet maxBet = floor(opp/2) to force rival all-in on uncertain cup!
      if (myChips > oppChips && maxBet >= 2 && (bestProb >= 0.42 || diff === 'grand_final')) {
        wager = maxBet;
        // Grand Final occasionally baits on the 2nd-best symbol if whisper is weak
        if (diff === 'grand_final' && bestProb < 0.45 && rng() < 0.25) {
          chosenSym = sortedSyms[1];
        }
      } else if (bestProb >= 0.62) {
        wager = maxBet;
      } else if (bestProb >= 0.46) {
        wager = Math.min(maxBet, Math.max(minBet, Math.ceil(maxBet * 0.6)));
      } else {
        wager = minBet;
      }

      return { type: 'PLACE_BET', payload: { symbol: chosenSym, amount: wager } };
    }

    if (fullState.phase === 'bet_second') {
      const firstBet = fullState.currentBets[fullState.firstSeatId];
      const { minBet, maxBet } = getSecondBetBounds(myChips, firstBet.amount);

      // Fuse opponent's bet signal for Genius / Grand Final
      if (diff !== 'easy') {
        const oppMax = getFirstBetBounds(oppChips, myChips).maxBet;
        const oppConf = firstBet.amount >= oppMax && oppMax > 1 ? 1.38 : 1.15;
        probs[firstBet.symbol] *= oppConf;
        const sum = probs.sun + probs.moon + probs.star;
        for (const s of SYMBOLS) probs[s] /= sum;
        const reSorted = SYMBOLS.slice().sort((a, b) => probs[b] - probs[a]);
        bestSym = reSorted[0];
        bestProb = probs[bestSym];
      }

      let wager = minBet;
      if (diff === 'easy') {
        const sym = rng() < 0.7 ? bestSym : SYMBOLS[Math.floor(rng() * 3)];
        return { type: 'PLACE_BET', payload: { symbol: sym, amount: minBet } };
      }

      // Expected value of a 3x return (net +2x on win, -1x on loss) is positive whenever P > 1/3!
      const trailingLate = fullState.round >= 8 && myChips < oppChips;
      if (bestProb >= 0.68 || trailingLate) {
        // Go big (up to 75% or all-in when trailing late!)
        wager = trailingLate
          ? maxBet
          : Math.max(minBet, Math.min(maxBet, Math.ceil(myChips * 0.65)));
      } else if (bestProb >= 0.5) {
        wager = Math.max(minBet, Math.min(maxBet, Math.ceil(myChips * 0.45)));
      } else {
        // Minimize forced exposure to survive!
        wager = minBet;
      }

      // Grand Final: if heavily ahead on final round, mirror opponent's symbol when safe to lock lead!
      if (diff === 'grand_final' && fullState.round === fullState.totalRounds && myChips > oppChips + firstBet.amount * 2) {
        return { type: 'PLACE_BET', payload: { symbol: firstBet.symbol, amount: minBet } };
      }

      return { type: 'PLACE_BET', payload: { symbol: bestSym, amount: wager } };
    }

    return null;
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;
    const [s0, s1] = fullState.seatOrder;
    const p0 = fullState.players[s0];
    const p1 = fullState.players[s1];
    const winnerSeatIds = fullState.winnerSeatIds || [];
    const rankings = [p0, p1]
      .slice()
      .sort((a, b) => {
        if (winnerSeatIds.includes(a.seatId) && !winnerSeatIds.includes(b.seatId)) return -1;
        if (winnerSeatIds.includes(b.seatId) && !winnerSeatIds.includes(a.seatId)) return 1;
        return b.chips - a.chips;
      })
      .map((p) => ({
        seatId: p.seatId,
        score: p.chips,
        label: `${p.chips} chips (${p.correctHits} hits)`,
      }));

    const winName = winnerSeatIds.length ? fullState.players[winnerSeatIds[0]]?.name : '';
    return {
      winnerSeatIds,
      rankings,
      summary:
        fullState.winReason === 'bust'
          ? {
              zh: `${winName} 凭强制双倍下注施压令对手筹码归零，赢得《日月星》死亡对决！`,
              en: `${winName} forced a total bust to win Sun, Moon, Star!`,
            }
          : {
              zh: `历经 ${fullState.round} 轮圣杯博弈，${winName} 以 ${rankings[0].score} : ${rankings[1].score} 枚筹码笑傲群雄！`,
              en: `After ${fullState.round} celestial cups, ${winName} triumphs ${rankings[0].score} – ${rankings[1].score} chips!`,
            },
    };
  },
};
