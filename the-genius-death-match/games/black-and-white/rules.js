/**
 * Black and White (黑与白 · 흑과 백) — Pure Deterministic State Machine & 3-Tier AI
 * Official The Genius S2E9 / S2E11 / S4E1 Death Match Rules.
 *
 * Zero DOM access. All randomness via ctx.rng().
 * STRICT HIDDEN INFO: Exact tile numbers played and remaining are NEVER leaked
 * to opponents or spectators during an active match — only Black/White color & winner!
 */

const ALL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const BLACK_TILES = [0, 2, 4, 6, 8]; // Even = Black (5 tiles)
const WHITE_TILES = [1, 3, 5, 7];    // Odd = White (4 tiles)
const TOTAL_ROUNDS = 9;
const WIN_TARGET = 5;

export function getTileColor(num) {
  return num % 2 === 0 ? 'black' : 'white';
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || null;
}

function countColors(hand) {
  let black = 0;
  let white = 0;
  for (const n of hand) {
    if (n % 2 === 0) black += 1;
    else white += 1;
  }
  return { black, white, total: hand.length };
}

function isMatchOverByScore(scores, seatOrder, roundsCompleted) {
  const [a, b] = seatOrder;
  const sa = scores[a] || 0;
  const sb = scores[b] || 0;
  const remaining = TOTAL_ROUNDS - roundsCompleted;
  if (sa >= WIN_TARGET || sb >= WIN_TARGET) return true;
  if (Math.abs(sa - sb) > remaining) return true;
  if (roundsCompleted >= TOTAL_ROUNDS) return true;
  return false;
}

function makePhaseLabel(phase) {
  if (phase === 'first_pick') return { zh: '先手出牌', en: 'First Tile' };
  if (phase === 'second_pick') return { zh: '后手应战', en: 'Second Tile' };
  if (phase === 'round_result') return { zh: '暗牌裁决', en: 'Blind Verdict' };
  return { zh: '终局结算', en: 'Final Verdict' };
}

/**
 * Generate all permutations of an array (length <= 5, so max 120 perms).
 */
function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) {
      out.push([arr[i], ...p]);
    }
  }
  return out;
}

const ALL_BLACK_PERMS = permutations(BLACK_TILES); // 120
const ALL_WHITE_PERMS = permutations(WHITE_TILES); // 24

/**
 * Exact Bayesian posterior over opponent's remaining tiles of a given color,
 * conditioning on all prior rounds' exact (botNum, oppColor, outcome) observations.
 * Used by Genius & Grand Final AI.
 */
function computeOppTilePosterior(fullState, botSeatId, targetColor) {
  const oppSeatId = getOtherSeatId(fullState, botSeatId);
  const pool = targetColor === 'black' ? BLACK_TILES : WHITE_TILES;
  const perms = targetColor === 'black' ? ALL_BLACK_PERMS : ALL_WHITE_PERMS;

  // Extract constraints on opponent's played tiles of targetColor
  const constraints = [];
  for (const h of fullState.history) {
    const oppPlay = h.plays[oppSeatId];
    const botPlay = h.plays[botSeatId];
    if (!oppPlay || !botPlay) continue;
    if (oppPlay.color !== targetColor) continue;
    let rel = 'eq'; // opp vs bot
    if (h.winnerSeatId === oppSeatId) rel = 'gt';
    else if (h.winnerSeatId === botSeatId) rel = 'lt';
    constraints.push({ botNum: botPlay.num, rel });
  }

  const k = constraints.length;
  const freq = {};
  for (const v of pool) freq[v] = 0;
  let validCount = 0;

  for (const perm of perms) {
    let ok = true;
    for (let i = 0; i < k; i++) {
      const oppVal = perm[i];
      const { botNum, rel } = constraints[i];
      if (rel === 'gt' && !(oppVal > botNum)) { ok = false; break; }
      if (rel === 'lt' && !(oppVal < botNum)) { ok = false; break; }
      if (rel === 'eq' && !(oppVal === botNum)) { ok = false; break; }
    }
    if (!ok) continue;
    validCount += 1;
    // All tiles perm[k..] are still in opponent's remaining hand for this color
    for (let j = k; j < perm.length; j++) {
      freq[perm[j]] += 1;
    }
  }

  const dist = {};
  const remCount = pool.length - k;
  if (validCount === 0 || remCount <= 0) {
    for (const v of pool) dist[v] = 0;
    return dist;
  }
  const denom = validCount * remCount;
  for (const v of pool) {
    dist[v] = freq[v] / denom;
  }
  return dist;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const firstSeatId = rng() < 0.5 ? seatOrder[0] : seatOrder[1];
    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '♦',
        isBot: Boolean(s.isBot),
        hand: ALL_TILES.slice(),
        score: 0,
      };
    }

    return {
      seatOrder,
      players,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      winTarget: WIN_TARGET,
      phase: 'first_pick', // 'first_pick' | 'second_pick' | 'round_result' | 'finished'
      phaseLabel: makePhaseLabel('first_pick'),
      firstSeatId,
      currentTurnSeatId: firstSeatId,
      currentRound: {
        firstSeatId,
        secondSeatId: seatOrder.find((id) => id !== firstSeatId),
        firstPlay: null,  // { seatId, num, color }
        secondPlay: null, // { seatId, num, color }
        winnerSeatId: null,
        isDraw: false,
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
      return { ok: false, reason: 'Match already ended' };
    }

    if (action.type === 'PLAY_TILE') {
      if (fullState.phase !== 'first_pick' && fullState.phase !== 'second_pick') {
        return { ok: false, reason: 'Not in tile selection phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Not your turn' };
      }
      const num = Number(action.payload?.tile);
      const player = fullState.players[seatId];
      if (!player || !Number.isInteger(num) || !player.hand.includes(num)) {
        return { ok: false, reason: 'Tile not available in your hand' };
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'round_result') {
        return { ok: false, reason: 'Not awaiting next round' };
      }
      if (!fullState.players[seatId]) {
        return { ok: false, reason: 'Invalid player' };
      }
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action) {
    const next = cloneState(fullState);

    if (action.type === 'PLAY_TILE') {
      const num = Number(action.payload.tile);
      const color = getTileColor(num);
      const player = next.players[seatId];
      player.hand = player.hand.filter((t) => t !== num);

      if (next.phase === 'first_pick') {
        next.currentRound.firstPlay = { seatId, num, color };
        const secondSeatId = next.currentRound.secondSeatId;
        next.phase = 'second_pick';
        next.phaseLabel = makePhaseLabel('second_pick');
        next.currentTurnSeatId = secondSeatId;
        return {
          state: next,
          events: [
            {
              type: 'FIRST_TILE_PLACED',
              round: next.round,
              seatId,
              color, // PUBLIC ONLY: never include num!
              ts: Date.now(),
            },
          ],
        };
      }

      if (next.phase === 'second_pick') {
        next.currentRound.secondPlay = { seatId, num, color };
        const pFirst = next.currentRound.firstPlay;
        const pSecond = next.currentRound.secondPlay;

        let winnerSeatId = null;
        let isDraw = false;
        if (pFirst.num > pSecond.num) {
          winnerSeatId = pFirst.seatId;
          next.players[winnerSeatId].score += 1;
        } else if (pSecond.num > pFirst.num) {
          winnerSeatId = pSecond.seatId;
          next.players[winnerSeatId].score += 1;
        } else {
          isDraw = true;
        }

        next.currentRound.winnerSeatId = winnerSeatId;
        next.currentRound.isDraw = isDraw;

        const plays = {};
        plays[pFirst.seatId] = { num: pFirst.num, color: pFirst.color, order: 1 };
        plays[pSecond.seatId] = { num: pSecond.num, color: pSecond.color, order: 2 };

        next.history.push({
          round: next.round,
          firstSeatId: pFirst.seatId,
          secondSeatId: pSecond.seatId,
          plays,
          winnerSeatId,
          isDraw,
        });

        const scores = {};
        for (const id of next.seatOrder) scores[id] = next.players[id].score;

        const matchEnded = isMatchOverByScore(scores, next.seatOrder, next.history.length);
        if (matchEnded) {
          next.phase = 'finished';
          next.phaseLabel = makePhaseLabel('finished');
          next.currentTurnSeatId = null;
        } else {
          next.phase = 'round_result';
          next.phaseLabel = makePhaseLabel('round_result');
          // Keep currentTurnSeatId on the player who just acted so hotseat doesn't curtain-hide the verdict
          next.currentTurnSeatId = seatId;
        }

        return {
          state: next,
          events: [
            {
              type: 'ROUND_RESOLVED',
              round: next.round,
              firstSeatId: pFirst.seatId,
              firstColor: pFirst.color,
              secondSeatId: pSecond.seatId,
              secondColor: pSecond.color,
              winnerSeatId,
              isDraw,
              matchEnded,
              ts: Date.now(),
            },
          ],
        };
      }
    }

    if (action.type === 'NEXT_ROUND') {
      const last = next.history[next.history.length - 1];
      const nextFirstSeatId = last && last.winnerSeatId ? last.winnerSeatId : next.firstSeatId;
      const nextSecondSeatId = getOtherSeatId(next, nextFirstSeatId);
      next.round += 1;
      next.firstSeatId = nextFirstSeatId;
      next.phase = 'first_pick';
      next.phaseLabel = makePhaseLabel('first_pick');
      next.currentTurnSeatId = nextFirstSeatId;
      next.currentRound = {
        firstSeatId: nextFirstSeatId,
        secondSeatId: nextSecondSeatId,
        firstPlay: null,
        secondPlay: null,
        winnerSeatId: null,
        isDraw: false,
      };
      return {
        state: next,
        events: [
          {
            type: 'ROUND_STARTED',
            round: next.round,
            firstSeatId: nextFirstSeatId,
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
    if (fullState.phase === 'first_pick' || fullState.phase === 'second_pick') {
      return {
        phaseKey: `bw-r${fullState.round}-${fullState.phase}-${fullState.currentTurnSeatId}`,
        durationMs: 30000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    if (fullState.phase === 'first_pick' || fullState.phase === 'second_pick') {
      const seatId = fullState.currentTurnSeatId;
      const player = fullState.players[seatId];
      if (!player || player.hand.length === 0) return null;
      const rng = ctx?.rng || Math.random;
      const tile = player.hand[Math.floor(rng() * player.hand.length)];
      return this.applyAction(fullState, seatId, { type: 'PLAY_TILE', payload: { tile } }, ctx);
    }
    return null;
  },

  /**
   * STRICT STATE PROJECTION:
   * - Viewer sees ONLY their own remaining tile numbers & their own past played numbers.
   * - Opponent's remaining numbers & played numbers are NEVER sent during active play.
   * - Opponent's remaining Black/White tile counts and played Black/White colors are public.
   * - Once phase === 'finished', full match ledger is revealed for post-game inspection.
   */
  projectState(fullState, viewerSeatId) {
    const isFinished = fullState.phase === 'finished';
    const players = {};
    for (const id of fullState.seatOrder) {
      const p = fullState.players[id];
      const counts = countColors(p.hand);
      const canSeeHand = isFinished || id === viewerSeatId;
      players[id] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        score: p.score,
        remainingCounts: counts,
        hand: canSeeHand ? p.hand.slice() : null,
      };
    }

    const projectPlay = (play) => {
      if (!play) return null;
      return {
        seatId: play.seatId,
        color: play.color,
        num: isFinished || play.seatId === viewerSeatId ? play.num : null,
      };
    };

    const history = fullState.history.map((h) => {
      const plays = {};
      for (const id of fullState.seatOrder) {
        const pl = h.plays[id];
        if (!pl) continue;
        plays[id] = {
          color: pl.color,
          order: pl.order,
          num: isFinished || id === viewerSeatId ? pl.num : null,
        };
      }
      return {
        round: h.round,
        firstSeatId: h.firstSeatId,
        secondSeatId: h.secondSeatId,
        plays,
        winnerSeatId: h.winnerSeatId,
        isDraw: h.isDraw,
      };
    });

    return {
      seatOrder: fullState.seatOrder.slice(),
      players,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      winTarget: fullState.winTarget,
      phase: fullState.phase,
      phaseLabel: fullState.phaseLabel,
      firstSeatId: fullState.firstSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      currentRound: {
        firstSeatId: fullState.currentRound.firstSeatId,
        secondSeatId: fullState.currentRound.secondSeatId,
        firstPlay: projectPlay(fullState.currentRound.firstPlay),
        secondPlay: projectPlay(fullState.currentRound.secondPlay),
        winnerSeatId: fullState.currentRound.winnerSeatId,
        isDraw: fullState.currentRound.isDraw,
      },
      history,
      options: { ...fullState.options },
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    // Never auto-skip round_result so human players can read the blind verdict
    if (fullState.phase === 'round_result') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const bot = fullState.players[botSeatId];
    const oppSeatId = getOtherSeatId(fullState, botSeatId);
    const opp = fullState.players[oppSeatId];
    if (!bot || bot.hand.length === 0) return null;

    const diff = ctx?.difficulty || 'genius';
    const rng = ctx?.rng || Math.random;
    const hand = bot.hand.slice().sort((a, b) => a - b);

    if (hand.length === 1) {
      return { type: 'PLAY_TILE', payload: { tile: hand[0] } };
    }

    // ---- EASY TIER ----
    if (diff === 'easy') {
      if (fullState.phase === 'second_pick') {
        const oppColor = fullState.currentRound.firstPlay.color;
        if (rng() < 0.28) {
          return { type: 'PLAY_TILE', payload: { tile: hand[0] } };
        }
        const midIdx = Math.min(hand.length - 1, Math.floor(hand.length * (oppColor === 'white' ? 0.6 : 0.55)));
        const pick = hand[Math.max(0, Math.min(hand.length - 1, midIdx + (rng() < 0.5 ? 0 : -1)))];
        return { type: 'PLAY_TILE', payload: { tile: pick } };
      }
      // First pick: tends to lead mid-high
      const idx = Math.min(hand.length - 1, Math.floor((0.35 + rng() * 0.5) * hand.length));
      return { type: 'PLAY_TILE', payload: { tile: hand[idx] } };
    }

    // ---- GENIUS & GRAND FINAL TIERS ----
    // Compute exact Bayesian posterior over opponent's remaining Black and White tiles
    const postBlack = computeOppTilePosterior(fullState, botSeatId, 'black');
    const postWhite = computeOppTilePosterior(fullState, botSeatId, 'white');
    const oppCounts = countColors(opp.hand);
    const roundsLeft = TOTAL_ROUNDS - fullState.history.length;
    const scoreDiff = bot.score - opp.score;
    const mustWin = (opp.score >= WIN_TARGET - 1) || (roundsLeft <= 2 && scoreDiff <= 0);

    if (fullState.phase === 'second_pick') {
      // Opponent already played a tile of known color!
      const oppColor = fullState.currentRound.firstPlay.color;
      const dist = oppColor === 'black' ? postBlack : postWhite;

      // Also weight slightly for opponent's likely first-player tendency:
      // Players often lead medium-high (4,5,6,7) or bluff-dump (0,1,2)
      const adjusted = {};
      let sumW = 0;
      for (const [valStr, p] of Object.entries(dist)) {
        const v = Number(valStr);
        let priorLead = 1.0;
        if (diff === 'grand_final') {
          if (v === 0 || v === 1) priorLead = 1.12;
          else if (v >= 5 && v <= 7) priorLead = 1.18;
          else if (v === 8) priorLead = 0.88;
        }
        const w = p * priorLead;
        adjusted[v] = w;
        sumW += w;
      }
      if (sumW > 0) {
        for (const k of Object.keys(adjusted)) adjusted[k] /= sumW;
      }

      // Evaluate each candidate tile in bot's hand
      let bestScore = -Infinity;
      const scored = [];
      for (const tile of hand) {
        let pWin = 0;
        let pLose = 0;
        for (const [valStr, p] of Object.entries(adjusted)) {
          const v = Number(valStr);
          if (tile > v) pWin += p;
          else if (tile < v) pLose += p;
        }
        // Expected round gain minus opportunity cost of spending `tile`
        // Losing costs tempo? Actually winning gives First Player (slight disadvantage in B&W!),
        // losing keeps Second Player advantage!
        const tileCostWeight = mustWin ? 0.045 : (diff === 'grand_final' ? 0.088 : 0.075);
        const tempoBonus = diff === 'grand_final' ? -0.05 * pWin + 0.05 * pLose : 0;
        // Extra bonus for winning cheaply (beating opp with minimal waste)
        const expectedValue = (pWin - pLose) + tempoBonus - tileCostWeight * tile;
        scored.push({ tile, ev: expectedValue, pWin });
        if (expectedValue > bestScore) bestScore = expectedValue;
      }

      // Softmax / near-best tie randomization so AI isn't 100% deterministic
      const temp = diff === 'grand_final' ? 0.05 : 0.12;
      const weights = scored.map((s) => Math.exp((s.ev - bestScore) / temp));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let r = rng() * totalW;
      for (let i = 0; i < scored.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          return { type: 'PLAY_TILE', payload: { tile: scored[i].tile } };
        }
      }
      return { type: 'PLAY_TILE', payload: { tile: scored[0].tile } };
    }

    // ---- FIRST PICK (GENIUS / GRAND FINAL) ----
    // Remember in Black & White, going FIRST is a slight disadvantage because opponent sees your color!
    // Great players mix sacrificial low tiles (0, 1, 2) to steal Second-Player advantage,
    // with deceptive medium/high tiles (5, 6, 7, 8) of the same color to punish greedy snipes!
    const expectedOppMean = (() => {
      let mean = 0;
      const totalRem = Math.max(1, oppCounts.total);
      const pB = oppCounts.black / totalRem;
      const pW = oppCounts.white / totalRem;
      for (const [v, p] of Object.entries(postBlack)) mean += pB * p * Number(v);
      for (const [v, p] of Object.entries(postWhite)) mean += pW * p * Number(v);
      return mean;
    })();

    const scored = hand.map((tile) => {
      let score = 0;
      const sameColorCount = hand.filter((t) => getTileColor(t) === getTileColor(tile)).length;
      // Ambiguity bonus: leading a color where you still hold multiple tiles conceals your number!
      const ambiguityBonus = sameColorCount >= 2 ? 0.22 : -0.15;

      if (mustWin) {
        // Must secure points now
        score = tile * 0.25 + ambiguityBonus;
      } else if (diff === 'grand_final') {
        // Polarized strategy: either sacrifice lowest (0/1/2) to gain 2nd-player reactivity,
        // or throw a strong 6/7/8 to punish opponent's mid-tile counters
        if (tile <= 1) score = 0.68 + ambiguityBonus;
        else if (tile === 2 || tile === 3) score = 0.52 + ambiguityBonus;
        else if (tile >= 6 && tile <= 7) score = 0.64 + ambiguityBonus;
        else if (tile === 8) score = (roundsLeft <= 4 ? 0.72 : 0.42) + ambiguityBonus;
        else score = 0.48 + ambiguityBonus + (tile > expectedOppMean ? 0.1 : -0.05);
      } else {
        // Genius balanced mixed strategy
        if (tile <= 2) score = 0.55 + ambiguityBonus;
        else if (tile >= 5 && tile <= 7) score = 0.6 + ambiguityBonus;
        else score = 0.46 + ambiguityBonus;
      }
      return { tile, score };
    });

    const maxS = Math.max(...scored.map((s) => s.score));
    const temp = diff === 'grand_final' ? 0.16 : 0.24;
    const weights = scored.map((s) => Math.exp((s.score - maxS) / temp));
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = rng() * totalW;
    for (let i = 0; i < scored.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        return { type: 'PLAY_TILE', payload: { tile: scored[i].tile } };
      }
    }
    return { type: 'PLAY_TILE', payload: { tile: scored[0].tile } };
  },

  getResult(state) {
    if (!state || state.phase !== 'finished') return null;
    const [a, b] = state.seatOrder;
    const pa = state.players[a];
    const pb = state.players[b];
    const sa = pa?.score ?? 0;
    const sb = pb?.score ?? 0;

    let winnerSeatIds = [];
    if (sa > sb) winnerSeatIds = [a];
    else if (sb > sa) winnerSeatIds = [b];

    const rankings = [pa, pb]
      .sort((x, y) => y.score - x.score)
      .map((p) => ({
        seatId: p.seatId,
        score: p.score,
        label: `${p.score} / ${WIN_TARGET} pts`,
      }));

    let summary;
    if (winnerSeatIds.length === 0) {
      summary = {
        zh: `9 回合激战平局（${sa} : ${sb}），势均力敌！点击「再战一局」决出胜负。`,
        en: `Deadlocked draw (${sa} : ${sb}) after 9 blind rounds! Rematch to settle the Death Match.`,
      };
    } else {
      const winPlayer = state.players[winnerSeatIds[0]];
      const loseScore = Math.min(sa, sb);
      const winScore = Math.max(sa, sb);
      summary = {
        zh: `${winPlayer.name} 以 ${winScore} : ${loseScore} 掌控黑白心理节奏，赢得《黑与白》死亡对决！`,
        en: `${winPlayer.name} outread the blind tempo ${winScore} : ${loseScore} to survive Black and White!`,
      };
    }

    return {
      winnerSeatIds,
      rankings,
      summary,
    };
  },
};
