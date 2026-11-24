/**
 * Betting! Rock, Paper, Scissors (下注猜拳 · 베팅! 가위바위보)
 * Pure Deterministic State Machine & 3-Tier Game-Theoretic AI
 * Official The Genius S4E3 (11-Round + 3x Draw Bet + 2-Round VP Overtime) Rules.
 *
 * Zero DOM access. All randomness via ctx.rng().
 */

export const SIGNS = ['rock', 'paper', 'scissors'];
export const BASE_ROUNDS = 11;

export function getRewardForRound(roundNum) {
  if (roundNum <= 3) return 1;
  if (roundNum <= 6) return 2;
  if (roundNum <= 9) return 3;
  if (roundNum <= 11) return 4;
  return 3; // Overtime VP rounds
}

/**
 * Returns 'win' | 'lose' | 'draw' from Duelist's perspective.
 */
export function resolveRpsOutcome(duelistSign, oppSign) {
  if (duelistSign === oppSign) return 'draw';
  if (
    (duelistSign === 'rock' && oppSign === 'scissors') ||
    (duelistSign === 'paper' && oppSign === 'rock') ||
    (duelistSign === 'scissors' && oppSign === 'paper')
  ) {
    return 'win';
  }
  return 'lose';
}

export function signToWinAgainst(oppSign) {
  if (oppSign === 'rock') return 'paper';
  if (oppSign === 'paper') return 'scissors';
  return 'rock';
}

export function signToLoseAgainst(oppSign) {
  if (oppSign === 'rock') return 'scissors';
  if (oppSign === 'paper') return 'rock';
  return 'paper';
}

const GUEST_ARCHETYPES = [
  {
    id: 'iron-fist',
    name: { zh: '铁拳嘉宾·崔', en: 'Guest Choi (Iron Fist)' },
    badge: { zh: '偏好石头 55%', en: 'Favors Rock 55%' },
    probs: { rock: 0.55, paper: 0.22, scissors: 0.23 },
    honesty: 0.78,
  },
  {
    id: 'velvet-palm',
    name: { zh: '柔掌嘉宾·朴', en: 'Guest Park (Velvet Palm)' },
    badge: { zh: '偏好布 55%', en: 'Favors Paper 55%' },
    probs: { rock: 0.22, paper: 0.55, scissors: 0.23 },
    honesty: 0.78,
  },
  {
    id: 'blade-edge',
    name: { zh: '利刃嘉宾·李', en: 'Guest Lee (Blade Edge)' },
    badge: { zh: '偏好剪刀 55%', en: 'Favors Scissors 55%' },
    probs: { rock: 0.23, paper: 0.22, scissors: 0.55 },
    honesty: 0.75,
  },
  {
    id: 'poker-face',
    name: { zh: '扑克脸·金', en: 'Guest Kim (Poker Face)' },
    badge: { zh: '三手均衡 33%', en: 'Balanced 33/33/33' },
    probs: { rock: 0.34, paper: 0.33, scissors: 0.33 },
    honesty: 0.62,
  },
  {
    id: 'rock-paper-duo',
    name: { zh: '稳健派·张', en: 'Guest Jang (No Scissors)' },
    badge: { zh: '很少出剪刀', en: 'Rarely Scissors' },
    probs: { rock: 0.44, paper: 0.44, scissors: 0.12 },
    honesty: 0.8,
  },
  {
    id: 'sharp-tactician',
    name: { zh: '谋略家·吴', en: 'Guest Oh (Edge Tactician)' },
    badge: { zh: '偏好剪刀/布', en: 'Favors Scissors/Paper' },
    probs: { rock: 0.14, paper: 0.43, scissors: 0.43 },
    honesty: 0.72,
  },
  {
    id: 'gambler',
    name: { zh: '豪赌客·河', en: 'Guest Ha (Wild Gambler)' },
    badge: { zh: '石头/剪刀双核', en: 'Rock/Scissors Split' },
    probs: { rock: 0.44, paper: 0.12, scissors: 0.44 },
    honesty: 0.68,
  },
  {
    id: 'veteran',
    name: { zh: '元老嘉宾·洪', en: 'Guest Hong (Veteran)' },
    badge: { zh: '极度克制', en: 'Disciplined Mix' },
    probs: { rock: 0.36, paper: 0.36, scissors: 0.28 },
    honesty: 0.82,
  },
];

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || null;
}

function shuffleWithRng(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickWeightedSign(probs, rng) {
  const r = rng();
  if (r < probs.rock) return 'rock';
  if (r < probs.rock + probs.paper) return 'paper';
  return 'scissors';
}

function buildGuestWhisper(trueSign, honesty, rng) {
  // Whisper eliminates 1 sign ("Not X") with probability `honesty`, else noisy elimination
  const wrongSigns = SIGNS.filter((s) => s !== trueSign);
  const truthful = rng() < honesty;
  const eliminated = truthful
    ? wrongSigns[Math.floor(rng() * wrongSigns.length)]
    : trueSign;
  return {
    type: 'not_sign',
    eliminatedSign: eliminated,
    reliability: Math.round(honesty * 100),
  };
}

function buildSchedule(seatOrder, rng) {
  const vpRounds = new Set([3, 7, 10]); // Official S4E3 3 Public Virtual Players
  const vpSigns = shuffleWithRng(SIGNS, rng);
  const guests = shuffleWithRng(GUEST_ARCHETYPES, rng);
  let vpIdx = 0;
  let gIdx = 0;

  const schedule = [];
  for (let r = 1; r <= BASE_ROUNDS; r++) {
    const reward = getRewardForRound(r);
    if (vpRounds.has(r)) {
      const sign = vpSigns[vpIdx++];
      schedule.push({
        round: r,
        isVirtual: true,
        isOvertime: false,
        reward,
        name: { zh: `虚拟玩家 VP-${vpIdx}`, en: `Virtual Player VP-${vpIdx}` },
        badge: { zh: '手势全公开 · 心理博弈', en: 'PUBLIC SIGN · MIND GAME' },
        probs: {
          rock: sign === 'rock' ? 1 : 0,
          paper: sign === 'paper' ? 1 : 0,
          scissors: sign === 'scissors' ? 1 : 0,
        },
        sign,
        whispers: {},
      });
    } else {
      const g = guests[gIdx % guests.length];
      gIdx += 1;
      const sign = pickWeightedSign(g.probs, rng);
      const whispers = {};
      for (const sid of seatOrder) {
        whispers[sid] = buildGuestWhisper(sign, g.honesty, rng);
      }
      schedule.push({
        round: r,
        isVirtual: false,
        isOvertime: false,
        reward,
        name: g.name,
        badge: g.badge,
        probs: { ...g.probs },
        honesty: g.honesty,
        sign,
        whispers,
      });
    }
  }
  return schedule;
}

function appendOvertimePair(schedule, rng) {
  const startRound = schedule.length + 1;
  const pairSigns = shuffleWithRng(SIGNS, rng).slice(0, 2);
  pairSigns.forEach((sign, i) => {
    const r = startRound + i;
    schedule.push({
      round: r,
      isVirtual: true,
      isOvertime: true,
      reward: 3,
      name: { zh: `加赛虚拟玩家 OT-${r - BASE_ROUNDS}`, en: `Overtime VP-${r - BASE_ROUNDS}` },
      badge: { zh: '加时公开牌 · 决胜局', en: 'OVERTIME PUBLIC VP' },
      probs: {
        rock: sign === 'rock' ? 1 : 0,
        paper: sign === 'paper' ? 1 : 0,
        scissors: sign === 'scissors' ? 1 : 0,
      },
      sign,
      whispers: {},
    });
  });
}

function makePhaseLabel(phase) {
  if (phase === 'role_select') return { zh: '先手选职', en: 'Choose Role' };
  if (phase === 'duel_pick') return { zh: '猜拳锁定', en: 'Duelist Throw' };
  if (phase === 'bet_pick') return { zh: '筹码下注', en: 'Bettor Wager' };
  if (phase === 'round_result') return { zh: '猜拳开牌', en: 'RPS Clash' };
  return { zh: '终局结算', en: 'Final Verdict' };
}

/**
 * Compute posterior sign probabilities for an AI Guest given archetype prior + optional private whisper.
 */
export function computeGuestPosterior(entry, whisper) {
  if (!entry) return { rock: 1 / 3, paper: 1 / 3, scissors: 1 / 3 };
  if (entry.isVirtual) return { ...entry.probs };
  const prior = entry.probs || { rock: 1 / 3, paper: 1 / 3, scissors: 1 / 3 };
  if (!whisper || !whisper.eliminatedSign) return { ...prior };

  const h = (whisper.reliability || 75) / 100;
  const post = {};
  let sum = 0;
  for (const s of SIGNS) {
    // Likelihood of whisper eliminating `whisper.eliminatedSign` given true sign `s`:
    // If s === eliminatedSign -> must have lied (1 - h)
    // If s !== eliminatedSign -> truthful with prob h, picking 1 of 2 wrong signs (h / 2)
    const lik = s === whisper.eliminatedSign ? (1 - h) : (h / 2);
    post[s] = prior[s] * lik;
    sum += post[s];
  }
  if (sum <= 0) return { ...prior };
  for (const s of SIGNS) post[s] /= sum;
  return post;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const firstChoiceSeatId = rng() < 0.5 ? seatOrder[0] : seatOrder[1];

    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '♦',
        isBot: Boolean(s.isBot),
        chips: 1, // Official S3/S4: start with just 1 chip!
        duelWins: 0,
        betWins: 0,
      };
    }

    const schedule = buildSchedule(seatOrder, rng);

    return {
      seatOrder,
      players,
      round: 1,
      totalRounds: BASE_ROUNDS,
      schedule,
      phase: 'role_select', // 'role_select' | 'duel_pick' | 'bet_pick' | 'round_result' | 'finished'
      phaseLabel: makePhaseLabel('role_select'),
      firstChoiceSeatId,
      currentTurnSeatId: firstChoiceSeatId,
      currentRound: {
        round: 1,
        firstChoiceSeatId,
        duelistSeatId: null,
        bettorSeatId: null,
        duelistSign: null,
        betPrediction: null, // 'win' | 'lose' | 'draw' | null
        betWager: 0,
        outcome: null,       // 'win' | 'lose' | 'draw' (duelist vs guest/vp)
        duelistDelta: 0,
        bettorDelta: 0,
      },
      history: [],
      options: {
        timedMode: Boolean(ctx?.options?.timedMode),
      },
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) {
      return { ok: false, reason: 'Invalid action' };
    }
    if (fullState.phase === 'finished') {
      return { ok: false, reason: 'Match already finished' };
    }
    const player = fullState.players[seatId];
    if (!player) return { ok: false, reason: 'Unknown seat' };

    if (action.type === 'CHOOSE_ROLE') {
      if (fullState.phase !== 'role_select') {
        return { ok: false, reason: 'Not in role selection phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Not your turn to choose role' };
      }
      const role = action.payload?.role;
      if (role !== 'duel' && role !== 'bet') {
        return { ok: false, reason: 'Role must be duel or bet' };
      }
      return { ok: true };
    }

    if (action.type === 'PLAY_RPS') {
      if (fullState.phase !== 'duel_pick') {
        return { ok: false, reason: 'Not in RPS duel selection phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Only the Duelist can lock an RPS sign' };
      }
      const sign = action.payload?.sign;
      if (!SIGNS.includes(sign)) {
        return { ok: false, reason: 'Invalid RPS sign' };
      }
      return { ok: true };
    }

    if (action.type === 'PLACE_BET') {
      if (fullState.phase !== 'bet_pick') {
        return { ok: false, reason: 'Not in betting phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Only the Bettor can place a wager' };
      }
      const wager = Number(action.payload?.wager ?? 0);
      const pred = action.payload?.prediction;
      if (player.chips === 0) {
        if (wager !== 0) return { ok: false, reason: 'You have 0 chips to wager' };
        return { ok: true };
      }
      if (!Number.isInteger(wager) || wager < 1 || wager > player.chips) {
        return { ok: false, reason: `Wager must be between 1 and ${player.chips}` };
      }
      if (!['win', 'lose', 'draw'].includes(pred)) {
        return { ok: false, reason: 'Prediction must be win, lose, or draw' };
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'round_result') {
        return { ok: false, reason: 'Not awaiting next round' };
      }
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const rng = ctx?.rng || Math.random;

    if (action.type === 'CHOOSE_ROLE') {
      const role = action.payload.role;
      const other = getOtherSeatId(next, seatId);
      const duelistSeatId = role === 'duel' ? seatId : other;
      const bettorSeatId = role === 'duel' ? other : seatId;

      next.currentRound.duelistSeatId = duelistSeatId;
      next.currentRound.bettorSeatId = bettorSeatId;
      next.phase = 'duel_pick';
      next.phaseLabel = makePhaseLabel('duel_pick');
      next.currentTurnSeatId = duelistSeatId;

      return {
        state: next,
        events: [
          {
            type: 'ROLE_CHOSEN',
            round: next.round,
            chooserSeatId: seatId,
            role,
            duelistSeatId,
            bettorSeatId,
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'PLAY_RPS') {
      const sign = action.payload.sign;
      next.currentRound.duelistSign = sign;
      next.phase = 'bet_pick';
      next.phaseLabel = makePhaseLabel('bet_pick');
      next.currentTurnSeatId = next.currentRound.bettorSeatId;

      return {
        state: next,
        events: [
          {
            type: 'DUEL_LOCKED',
            round: next.round,
            duelistSeatId: seatId,
            // NEVER include sign here!
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'PLACE_BET') {
      const cr = next.currentRound;
      const bettor = next.players[cr.bettorSeatId];
      const duelist = next.players[cr.duelistSeatId];
      const entry = next.schedule[next.round - 1];

      const wager = bettor.chips === 0 ? 0 : Number(action.payload.wager);
      const prediction = bettor.chips === 0 ? null : action.payload.prediction;
      cr.betWager = wager;
      cr.betPrediction = prediction;

      // Resolve RPS clash!
      const outcome = resolveRpsOutcome(cr.duelistSign, entry.sign);
      cr.outcome = outcome;

      let duelistDelta = 0;
      if (outcome === 'win') {
        duelistDelta = entry.reward;
        duelist.chips += duelistDelta;
        duelist.duelWins += 1;
      }

      let bettorDelta = 0;
      let betStatus = 'none'; // 'won' | 'lost' | 'refund' | 'none'
      if (wager > 0 && prediction) {
        if (prediction === 'draw') {
          if (outcome === 'draw') {
            bettorDelta = wager * 2; // 3x return = net +2x
            betStatus = 'won';
            bettor.betWins += 1;
          } else {
            bettorDelta = -wager;
            betStatus = 'lost';
          }
        } else {
          // Bet on WIN or LOSE: 2x return (net +1x), DRAW refunds wager!
          if (outcome === prediction) {
            bettorDelta = wager;
            betStatus = 'won';
            bettor.betWins += 1;
          } else if (outcome === 'draw') {
            bettorDelta = 0;
            betStatus = 'refund';
          } else {
            bettorDelta = -wager;
            betStatus = 'lost';
          }
        }
        bettor.chips = Math.max(0, bettor.chips + bettorDelta);
      }

      cr.duelistDelta = duelistDelta;
      cr.bettorDelta = bettorDelta;
      cr.betStatus = betStatus;

      next.history.push({
        round: next.round,
        isVirtual: entry.isVirtual,
        isOvertime: entry.isOvertime,
        reward: entry.reward,
        opponentName: entry.name,
        opponentSign: entry.sign,
        duelistSeatId: cr.duelistSeatId,
        bettorSeatId: cr.bettorSeatId,
        duelistSign: cr.duelistSign,
        betPrediction: prediction,
        betWager: wager,
        outcome,
        betStatus,
        duelistDelta,
        bettorDelta,
      });

      // Check if match ends after this round (end of R11 or end of a 2-round overtime pair)
      const atScheduledEnd = next.round >= next.schedule.length;
      const [a, b] = next.seatOrder;
      const chipsTied = next.players[a].chips === next.players[b].chips;

      if (atScheduledEnd && !chipsTied) {
        next.phase = 'finished';
        next.phaseLabel = makePhaseLabel('finished');
        next.currentTurnSeatId = null;
      } else {
        // If tied at the end of R11 (or overtime pair), we'll append 2 VP overtime rounds on NEXT_ROUND
        next.phase = 'round_result';
        next.phaseLabel = makePhaseLabel('round_result');
        next.currentTurnSeatId = seatId;
      }

      return {
        state: next,
        events: [
          {
            type: 'CLASH_RESOLVED',
            round: next.round,
            duelistSeatId: cr.duelistSeatId,
            bettorSeatId: cr.bettorSeatId,
            duelistSign: cr.duelistSign,
            opponentSign: entry.sign,
            outcome,
            betPrediction: prediction,
            betWager: wager,
            betStatus,
            duelistDelta,
            bettorDelta,
            ts: Date.now(),
          },
        ],
      };
    }

    if (action.type === 'NEXT_ROUND') {
      if (next.round >= next.schedule.length) {
        // Still tied at end of schedule -> S4 Official 2-round Public VP Overtime!
        appendOvertimePair(next.schedule, rng);
        next.totalRounds = next.schedule.length;
      }

      next.round += 1;
      const nextFirst = getOtherSeatId(next, next.firstChoiceSeatId);
      next.firstChoiceSeatId = nextFirst;
      next.phase = 'role_select';
      next.phaseLabel = makePhaseLabel('role_select');
      next.currentTurnSeatId = nextFirst;
      next.currentRound = {
        round: next.round,
        firstChoiceSeatId: nextFirst,
        duelistSeatId: null,
        bettorSeatId: null,
        duelistSign: null,
        betPrediction: null,
        betWager: 0,
        outcome: null,
        duelistDelta: 0,
        bettorDelta: 0,
      };

      return {
        state: next,
        events: [
          {
            type: 'ROUND_STARTED',
            round: next.round,
            firstChoiceSeatId: nextFirst,
            isOvertime: Boolean(next.schedule[next.round - 1]?.isOvertime),
            ts: Date.now(),
          },
        ],
      };
    }

    return { state: next };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'finished') return null;
    if (!fullState.options?.timedMode) return null;
    if (['role_select', 'duel_pick', 'bet_pick'].includes(fullState.phase)) {
      return {
        phaseKey: `brps-r${fullState.round}-${fullState.phase}-${fullState.currentTurnSeatId}`,
        durationMs: 30000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    const rng = ctx?.rng || Math.random;
    const seatId = fullState.currentTurnSeatId;
    if (fullState.phase === 'role_select') {
      return this.applyAction(fullState, seatId, { type: 'CHOOSE_ROLE', payload: { role: 'duel' } }, ctx);
    }
    if (fullState.phase === 'duel_pick') {
      const sign = SIGNS[Math.floor(rng() * 3)];
      return this.applyAction(fullState, seatId, { type: 'PLAY_RPS', payload: { sign } }, ctx);
    }
    if (fullState.phase === 'bet_pick') {
      const p = fullState.players[seatId];
      const wager = p.chips > 0 ? 1 : 0;
      return this.applyAction(
        fullState,
        seatId,
        { type: 'PLACE_BET', payload: { prediction: 'win', wager } },
        ctx
      );
    }
    return null;
  },

  /**
   * STRICT STATE PROJECTION:
   * - Public Virtual Players reveal their exact `sign` upfront (as on the TV broadcast wall).
   * - Hidden AI Guests keep `sign: null` until their round reaches 'round_result' or is completed!
   * - Private guest whispers are shown ONLY to `viewerSeatId` (null for spectators).
   * - Duelist's locked `duelistSign` stays NULL to the Bettor & Spectators until 'round_result'!
   */
  projectState(fullState, viewerSeatId) {
    const isFinished = fullState.phase === 'finished';
    const cr = fullState.currentRound;
    const isRevealedCurrent = fullState.phase === 'round_result' || isFinished;

    const schedule = fullState.schedule.map((entry) => {
      const isCompleted = entry.round < fullState.round || (entry.round === fullState.round && isRevealedCurrent);
      const showSign = entry.isVirtual || isCompleted || isFinished;
      const myWhisper = viewerSeatId && !entry.isVirtual ? (entry.whispers?.[viewerSeatId] || null) : null;
      return {
        round: entry.round,
        isVirtual: entry.isVirtual,
        isOvertime: entry.isOvertime,
        reward: entry.reward,
        name: entry.name,
        badge: entry.badge,
        probs: entry.probs,
        sign: showSign ? entry.sign : null,
        myWhisper: entry.round === fullState.round ? myWhisper : null,
      };
    });

    const canSeeDuelSign =
      isRevealedCurrent || (viewerSeatId && viewerSeatId === cr.duelistSeatId);

    return {
      seatOrder: fullState.seatOrder.slice(),
      players: cloneState(fullState.players),
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      schedule,
      phase: fullState.phase,
      phaseLabel: fullState.phaseLabel,
      firstChoiceSeatId: fullState.firstChoiceSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      currentRound: {
        ...cr,
        duelistLocked: Boolean(cr.duelistSign),
        duelistSign: canSeeDuelSign ? cr.duelistSign : null,
      },
      history: cloneState(fullState.history),
      options: { ...fullState.options },
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'finished' || fullState.phase === 'round_result') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const diff = ctx?.difficulty || 'genius';
    const rng = ctx?.rng || Math.random;
    const bot = fullState.players[botSeatId];
    const oppSeatId = getOtherSeatId(fullState, botSeatId);
    const opp = fullState.players[oppSeatId];
    const entry = fullState.schedule[fullState.round - 1];
    const roundsLeft = fullState.schedule.length - fullState.round + 1;
    const myWhisper = !entry.isVirtual ? entry.whispers?.[botSeatId] : null;
    const post = computeGuestPosterior(entry, myWhisper);

    // ---- 1. ROLE SELECTION ----
    if (fullState.phase === 'role_select') {
      if (diff === 'easy') {
        if (entry.isVirtual) return { type: 'CHOOSE_ROLE', payload: { role: 'duel' } };
        return { type: 'CHOOSE_ROLE', payload: { role: bot.chips >= 3 && rng() < 0.45 ? 'bet' : 'duel' } };
      }

      // If bot has 0 chips, MUST Duel to earn bank chips!
      if (bot.chips === 0) {
        return { type: 'CHOOSE_ROLE', payload: { role: 'duel' } };
      }

      // If opponent has 0 chips, Duel guarantees free chips without giving rival a bet!
      if (opp.chips === 0 && entry.isVirtual) {
        return { type: 'CHOOSE_ROLE', payload: { role: 'duel' } };
      }

      // Late game trailing badly: BET gives exponential 2x/3x comeback potential!
      const deficit = opp.chips - bot.chips;
      if (deficit > entry.reward && bot.chips >= 2 && roundsLeft <= 4) {
        return { type: 'CHOOSE_ROLE', payload: { role: 'bet' } };
      }

      // On Public Virtual Player rounds:
      // Duel gives guaranteed option of +reward OR ambushing rival's big bet!
      // Bet lets us multiply our stack if our stack is big (> reward) and opponent needs chips!
      if (entry.isVirtual) {
        if (bot.chips >= entry.reward * 2 && opp.chips <= 2) {
          return { type: 'CHOOSE_ROLE', payload: { role: 'bet' } };
        }
        return { type: 'CHOOSE_ROLE', payload: { role: diff === 'grand_final' && rng() < 0.25 && bot.chips >= 3 ? 'bet' : 'duel' } };
      }

      // Guest round: estimate max win probability with best RPS sign
      let bestWinP = 0;
      for (const s of SIGNS) {
        const oppLosingSign = signToLoseAgainst(s); // wait: sign that s beats is signToLoseAgainst? Let's use resolveRpsOutcome!
        let pW = 0;
        for (const o of SIGNS) {
          if (resolveRpsOutcome(s, o) === 'win') pW += post[o];
        }
        if (pW > bestWinP) bestWinP = pW;
      }

      const evDuel = bestWinP * entry.reward;
      const evBet = bot.chips * 0.22; // Approximate EV of betting with edge
      if (evBet > evDuel + 0.3 && bot.chips >= 3) {
        return { type: 'CHOOSE_ROLE', payload: { role: 'bet' } };
      }
      return { type: 'CHOOSE_ROLE', payload: { role: 'duel' } };
    }

    // ---- 2. DUELIST THROW ----
    if (fullState.phase === 'duel_pick') {
      if (entry.isVirtual) {
        const winSign = signToWinAgainst(entry.sign);
        const drawSign = entry.sign;
        const loseSign = signToLoseAgainst(entry.sign);

        if (diff === 'easy' || opp.chips === 0) {
          return { type: 'PLAY_RPS', payload: { sign: winSign } };
        }

        // ICONIC GENIUS MIND GAME ON PUBLIC VIRTUAL PLAYER ROUNDS!
        // Rival Bettor knows we know the VP's sign!
        // If rival has a huge stack (opp.chips >= entry.reward), they will often bet big on WIN!
        // Throwing LOSE destroys a WIN bet completely; throwing DRAW refunds WIN/LOSE (but loses to 3x DRAW bet!).
        const oppThreat = opp.chips >= Math.max(2, entry.reward);
        const leading = bot.chips > opp.chips;

        if (diff === 'grand_final') {
          if (leading && opp.chips >= 3) {
            // Mixed Nash strategy heavily punishing WIN bets while keeping rival honest!
            const r = rng();
            if (r < 0.44) return { type: 'PLAY_RPS', payload: { sign: loseSign } };
            if (r < 0.82) return { type: 'PLAY_RPS', payload: { sign: winSign } };
            return { type: 'PLAY_RPS', payload: { sign: drawSign } };
          }
          if (oppThreat) {
            const r = rng();
            if (r < 0.62) return { type: 'PLAY_RPS', payload: { sign: winSign } };
            if (r < 0.88) return { type: 'PLAY_RPS', payload: { sign: loseSign } };
            return { type: 'PLAY_RPS', payload: { sign: drawSign } };
          }
          return { type: 'PLAY_RPS', payload: { sign: winSign } };
        }

        // Genius tier
        if (oppThreat && rng() < (leading ? 0.38 : 0.24)) {
          return { type: 'PLAY_RPS', payload: { sign: rng() < 0.7 ? loseSign : drawSign } };
        }
        return { type: 'PLAY_RPS', payload: { sign: winSign } };
      }

      // Hidden AI Guest round: choose sign maximizing win prob (or slight tie avoidance)
      if (diff === 'easy') {
        return { type: 'PLAY_RPS', payload: { sign: SIGNS[Math.floor(rng() * 3)] } };
      }

      let bestSign = 'rock';
      let bestScore = -1;
      for (const s of SIGNS) {
        let pW = 0;
        let pD = 0;
        for (const o of SIGNS) {
          const out = resolveRpsOutcome(s, o);
          if (out === 'win') pW += post[o];
          else if (out === 'draw') pD += post[o];
        }
        const sc = pW + pD * 0.12;
        if (sc > bestScore) {
          bestScore = sc;
          bestSign = s;
        }
      }
      return { type: 'PLAY_RPS', payload: { sign: bestSign } };
    }

    // ---- 3. BETTOR WAGER ----
    if (fullState.phase === 'bet_pick') {
      if (bot.chips === 0) {
        return { type: 'PLACE_BET', payload: { prediction: 'win', wager: 0 } };
      }

      const clampWager = (w) => Math.max(1, Math.min(bot.chips, Math.round(w)));

      if (diff === 'easy') {
        const pred = entry.isVirtual ? 'win' : (['win', 'lose', 'draw'][Math.floor(rng() * 3)]);
        return { type: 'PLACE_BET', payload: { prediction: pred, wager: clampWager(Math.ceil(bot.chips * 0.5)) } };
      }

      // Compute expected outcome distribution of the Duelist
      let pWin = 0.34;
      let pLose = 0.33;
      let pDraw = 0.33;

      if (entry.isVirtual) {
        // Estimate human/opponent Duelist's tendency on a Public VP round:
        // If Duelist has few chips or trails, they overwhelmingly take the guaranteed WIN!
        // If Duelist leads and we have a big stack, they might bluff-throw LOSE or DRAW!
        if (opp.chips <= bot.chips) {
          pWin = 0.68;
          pLose = 0.20;
          pDraw = 0.12;
        } else {
          pWin = 0.52;
          pLose = 0.30;
          pDraw = 0.18;
        }
      } else {
        // On a Guest round, Duelist likely picks the best sign against the Guest archetype!
        let bestGuestWin = 0;
        let bestGuestSign = 'rock';
        for (const s of SIGNS) {
          let w = 0;
          for (const o of SIGNS) if (resolveRpsOutcome(s, o) === 'win') w += entry.probs[o];
          if (w > bestGuestWin) { bestGuestWin = w; bestGuestSign = s; }
        }
        // Evaluate outcome under bot's own posterior (incorporating bot's private whisper!)
        pWin = 0; pLose = 0; pDraw = 0;
        for (const o of SIGNS) {
          const out = resolveRpsOutcome(bestGuestSign, o);
          if (out === 'win') pWin += post[o];
          else if (out === 'lose') pLose += post[o];
          else pDraw += post[o];
        }
      }

      // Compute EV per 1 chip wagered for each bet type:
      //  WIN:  +1*pWin - 1*pLose + 0*pDraw = pWin - pLose
      //  LOSE: +1*pLose - 1*pWin + 0*pDraw = pLose - pWin
      //  DRAW: +2*pDraw - 1*(1 - pDraw)    = 3*pDraw - 1
      const evs = [
        { pred: 'win', ev: pWin - pLose },
        { pred: 'lose', ev: pLose - pWin },
        { pred: 'draw', ev: 3 * pDraw - 1 },
      ];
      evs.sort((x, y) => y.ev - x.ev);

      let chosen = evs[0];
      // Grand Final mixes occasional bold LOSE / DRAW counter-bets on VP rounds so it can't be exploited!
      if (diff === 'grand_final' && entry.isVirtual && rng() < 0.24) {
        chosen = rng() < 0.65 ? evs.find((e) => e.pred === 'lose') : evs.find((e) => e.pred === 'draw');
      }

      // Bet sizing: Kelly-inspired + endgame comeback pressure
      const trailingBy = opp.chips - bot.chips;
      let wager = 1;
      if (roundsLeft <= 2 && trailingBy > 0) {
        // Must catch up before R11 ends!
        const needed = chosen.pred === 'draw' ? Math.ceil(trailingBy / 2) : trailingBy + 1;
        wager = clampWager(Math.max(1, Math.min(bot.chips, needed)));
      } else if (chosen.ev > 0.25) {
        const frac = Math.min(0.65, 0.25 + chosen.ev * 0.7);
        wager = clampWager(bot.chips * frac);
      } else if (chosen.ev > 0.05) {
        wager = clampWager(Math.max(1, Math.floor(bot.chips * 0.3)));
      } else {
        // Low-edge spot: bet minimum 1 chip to preserve bankroll!
        wager = 1;
      }

      return { type: 'PLACE_BET', payload: { prediction: chosen.pred, wager } };
    }

    return null;
  },

  getResult(state) {
    if (!state || state.phase !== 'finished') return null;
    const [a, b] = state.seatOrder;
    const pa = state.players[a];
    const pb = state.players[b];

    let winnerSeatIds = [];
    if (pa.chips > pb.chips) winnerSeatIds = [a];
    else if (pb.chips > pa.chips) winnerSeatIds = [b];

    const rankings = [pa, pb]
      .sort((x, y) => y.chips - x.chips)
      .map((p) => ({
        seatId: p.seatId,
        score: p.chips,
        label: `${p.chips} chips`,
      }));

    const summary =
      winnerSeatIds.length === 0
        ? {
            zh: `双方筹码战平（${pa.chips} : ${pb.chips}）！`,
            en: `Deadlocked at ${pa.chips} : ${pb.chips} chips!`,
          }
        : {
            zh: `${state.players[winnerSeatIds[0]].name} 以 ${Math.max(pa.chips, pb.chips)} : ${Math.min(pa.chips, pb.chips)} 枚筹码称霸《下注猜拳》演播室！`,
            en: `${state.players[winnerSeatIds[0]].name} dominated Betting! RPS with ${Math.max(pa.chips, pb.chips)} : ${Math.min(pa.chips, pb.chips)} chips!`,
          };

    return { winnerSeatIds, rankings, summary };
  },
};
