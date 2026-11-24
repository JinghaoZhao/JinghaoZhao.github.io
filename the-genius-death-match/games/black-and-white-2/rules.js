/**
 * Black and White II (黑与白II · 흑과 백 II) — Pure State Machine & 3-Tier AI
 * Official The Genius S3E1 / S3E3 Death Match Rules.
 *
 * 99-point blind auction over 9 rounds:
 *  - Bid 0..9  -> BLACK plaque (single digit)
 *  - Bid 10..99 -> WHITE plaque (double digit)
 *  - 5-Lamp Energy Gauge updates LIVE the instant a player locks their bid:
 *    80-99 = 5, 60-79 = 4, 40-59 = 3, 20-39 = 2, 1-19 = 1, 0 = 0.
 *
 * Zero DOM access. All randomness via ctx.rng().
 */

export const INITIAL_POINTS = 99;
export const TOTAL_ROUNDS = 9;
export const WIN_TARGET = 5;

export function getLampCount(remaining) {
  const r = Math.max(0, Math.floor(Number(remaining) || 0));
  if (r === 0) return 0;
  return Math.min(5, Math.floor(r / 20) + 1);
}

export function getLampBracket(lamps) {
  switch (lamps) {
    case 5: return [80, 99];
    case 4: return [60, 79];
    case 3: return [40, 59];
    case 2: return [20, 39];
    case 1: return [1, 19];
    default: return [0, 0];
  }
}

export function getBidColor(bid) {
  return Number(bid) <= 9 ? 'black' : 'white';
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || null;
}

function isMatchOver(scores, seatOrder, roundsDone) {
  const [a, b] = seatOrder;
  const sa = scores[a] || 0;
  const sb = scores[b] || 0;
  const remRounds = TOTAL_ROUNDS - roundsDone;
  if (sa >= WIN_TARGET || sb >= WIN_TARGET) return true;
  if (Math.abs(sa - sb) > remRounds) return true;
  if (roundsDone >= TOTAL_ROUNDS) return true;
  return false;
}

function makePhaseLabel(phase) {
  if (phase === 'first_bid') return { zh: '先手盲注', en: 'First Bid' };
  if (phase === 'second_bid') return { zh: '后手应注', en: 'Second Bid' };
  if (phase === 'round_result') return { zh: '暗注裁决', en: 'Blind Verdict' };
  return { zh: '终局结算', en: 'Final Verdict' };
}

/**
 * Interval arithmetic tracker for opponent's remaining points & current first-bid bounds,
 * using ONLY public information (lamp brackets, bid colors, and bot's own bids + outcomes).
 */
function inferOpponentBounds(fullState, botSeatId) {
  const oppSeatId = getOtherSeatId(fullState, botSeatId);
  let minRem = INITIAL_POINTS;
  let maxRem = INITIAL_POINTS;

  for (const h of fullState.history) {
    const oppPlay = h.plays[oppSeatId];
    const botPlay = h.plays[botSeatId];
    if (!oppPlay || !botPlay) continue;

    let bidMin = oppPlay.color === 'black' ? 0 : 10;
    let bidMax = oppPlay.color === 'black' ? 9 : maxRem;

    if (h.winnerSeatId === oppSeatId) {
      bidMin = Math.max(bidMin, botPlay.bid + 1);
    } else if (h.winnerSeatId === botSeatId) {
      bidMax = Math.min(bidMax, botPlay.bid - 1);
    } else if (h.isDraw) {
      bidMin = botPlay.bid;
      bidMax = botPlay.bid;
    }

    const [lMin, lMax] = getLampBracket(oppPlay.lampsAfter);
    const nextMin = Math.max(lMin, minRem - bidMax);
    const nextMax = Math.min(lMax, maxRem - bidMin);
    minRem = Math.max(0, Math.min(nextMin, lMax));
    maxRem = Math.max(minRem, Math.min(INITIAL_POINTS, nextMax));
  }

  let currentBidMin = null;
  let currentBidMax = null;
  if (fullState.phase === 'second_bid' && fullState.currentRound.firstPlay?.seatId === oppSeatId) {
    const fp = fullState.currentRound.firstPlay;
    const [afterMin, afterMax] = getLampBracket(fp.lampsAfter);
    const colorMin = fp.color === 'black' ? 0 : 10;
    const colorMax = fp.color === 'black' ? 9 : maxRem;
    // bid = prevRem - afterRem
    currentBidMin = Math.max(colorMin, minRem - afterMax);
    currentBidMax = Math.min(colorMax, maxRem - afterMin);
    if (currentBidMin > currentBidMax) {
      currentBidMin = colorMin;
      currentBidMax = Math.max(colorMin, Math.min(colorMax, maxRem));
    }
    minRem = Math.max(afterMin, minRem - currentBidMax);
    maxRem = Math.min(afterMax, maxRem - currentBidMin);
    if (minRem > maxRem) {
      minRem = afterMin;
      maxRem = afterMax;
    }
  }

  return {
    oppMinRem: minRem,
    oppMaxRem: maxRem,
    currentBidMin,
    currentBidMax,
  };
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
        remaining: INITIAL_POINTS,
        lamps: getLampCount(INITIAL_POINTS),
        lastLampDrop: 0,
        score: 0,
      };
    }

    return {
      seatOrder,
      players,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      winTarget: WIN_TARGET,
      phase: 'first_bid', // 'first_bid' | 'second_bid' | 'round_result' | 'finished'
      phaseLabel: makePhaseLabel('first_bid'),
      firstSeatId,
      currentTurnSeatId: firstSeatId,
      currentRound: {
        firstSeatId,
        secondSeatId: seatOrder.find((id) => id !== firstSeatId),
        firstPlay: null,  // { seatId, bid, color, lampsBefore, lampsAfter, lampDrop }
        secondPlay: null, // { seatId, bid, color, lampsBefore, lampsAfter, lampDrop }
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
      return { ok: false, reason: 'Match already finished' };
    }

    if (action.type === 'SUBMIT_BID') {
      if (fullState.phase !== 'first_bid' && fullState.phase !== 'second_bid') {
        return { ok: false, reason: 'Not in bidding phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Not your turn to bid' };
      }
      const player = fullState.players[seatId];
      const bid = Number(action.payload?.bid);
      if (!player || !Number.isInteger(bid) || bid < 0 || bid > player.remaining) {
        return { ok: false, reason: `Bid must be an integer between 0 and ${player?.remaining ?? 0}` };
      }
      return { ok: true };
    }

    if (action.type === 'NEXT_ROUND') {
      if (fullState.phase !== 'round_result') {
        return { ok: false, reason: 'Not waiting for next round' };
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

    if (action.type === 'SUBMIT_BID') {
      const bid = Number(action.payload.bid);
      const player = next.players[seatId];
      const lampsBefore = player.lamps;
      player.remaining -= bid;
      const lampsAfter = getLampCount(player.remaining);
      const lampDrop = Math.max(0, lampsBefore - lampsAfter);
      player.lamps = lampsAfter;
      player.lastLampDrop = lampDrop;
      const color = getBidColor(bid);

      const playRecord = {
        seatId,
        bid,
        color,
        lampsBefore,
        lampsAfter,
        lampDrop,
      };

      if (next.phase === 'first_bid') {
        next.currentRound.firstPlay = playRecord;
        next.phase = 'second_bid';
        next.phaseLabel = makePhaseLabel('second_bid');
        next.currentTurnSeatId = next.currentRound.secondSeatId;
        return {
          state: next,
          events: [
            {
              type: 'FIRST_BID_LOCKED',
              round: next.round,
              seatId,
              color, // PUBLIC ONLY: never include bid or remaining!
              lampsBefore,
              lampsAfter,
              lampDrop,
              ts: Date.now(),
            },
          ],
        };
      }

      if (next.phase === 'second_bid') {
        next.currentRound.secondPlay = playRecord;
        const pFirst = next.currentRound.firstPlay;
        const pSecond = next.currentRound.secondPlay;

        let winnerSeatId = null;
        let isDraw = false;
        if (pFirst.bid > pSecond.bid) {
          winnerSeatId = pFirst.seatId;
          next.players[winnerSeatId].score += 1;
        } else if (pSecond.bid > pFirst.bid) {
          winnerSeatId = pSecond.seatId;
          next.players[winnerSeatId].score += 1;
        } else {
          isDraw = true;
        }

        next.currentRound.winnerSeatId = winnerSeatId;
        next.currentRound.isDraw = isDraw;

        const plays = {};
        plays[pFirst.seatId] = { ...pFirst, order: 1 };
        plays[pSecond.seatId] = { ...pSecond, order: 2 };

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
        const matchEnded = isMatchOver(scores, next.seatOrder, next.history.length);

        if (matchEnded) {
          next.phase = 'finished';
          next.phaseLabel = makePhaseLabel('finished');
          next.currentTurnSeatId = null;
        } else {
          next.phase = 'round_result';
          next.phaseLabel = makePhaseLabel('round_result');
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
              firstLampDrop: pFirst.lampDrop,
              secondSeatId: pSecond.seatId,
              secondColor: pSecond.color,
              secondLampDrop: pSecond.lampDrop,
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
      const nextFirst = last && last.winnerSeatId ? last.winnerSeatId : next.firstSeatId;
      const nextSecond = getOtherSeatId(next, nextFirst);
      next.round += 1;
      next.firstSeatId = nextFirst;
      next.phase = 'first_bid';
      next.phaseLabel = makePhaseLabel('first_bid');
      next.currentTurnSeatId = nextFirst;
      for (const id of next.seatOrder) {
        next.players[id].lastLampDrop = 0;
      }
      next.currentRound = {
        firstSeatId: nextFirst,
        secondSeatId: nextSecond,
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
            firstSeatId: nextFirst,
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
    if (fullState.phase === 'first_bid' || fullState.phase === 'second_bid') {
      return {
        phaseKey: `bw2-r${fullState.round}-${fullState.phase}-${fullState.currentTurnSeatId}`,
        durationMs: 35000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (!fullState || fullState.phase === 'finished') return null;
    if (fullState.phase === 'first_bid' || fullState.phase === 'second_bid') {
      const seatId = fullState.currentTurnSeatId;
      const p = fullState.players[seatId];
      if (!p) return null;
      const remRounds = Math.max(1, TOTAL_ROUNDS - fullState.history.length);
      const fallbackBid = Math.min(p.remaining, Math.floor(p.remaining / remRounds));
      return this.applyAction(fullState, seatId, { type: 'SUBMIT_BID', payload: { bid: fallbackBid } }, ctx);
    }
    return null;
  },

  /**
   * STRICT STATE PROJECTION:
   * - Viewer sees their own exact remaining points & their own exact bids.
   * - Opponent's remaining points & exact bids are NULL during play;
   *   ONLY lamps, lampDrop, and Black/White color indicators are visible!
   */
  projectState(fullState, viewerSeatId) {
    const isFinished = fullState.phase === 'finished';
    const players = {};
    for (const id of fullState.seatOrder) {
      const p = fullState.players[id];
      const canSee = isFinished || id === viewerSeatId;
      players[id] = {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        remaining: canSee ? p.remaining : null,
        lamps: p.lamps,
        lampBracket: getLampBracket(p.lamps),
        lastLampDrop: p.lastLampDrop,
        score: p.score,
      };
    }

    const projectPlay = (pl) => {
      if (!pl) return null;
      return {
        seatId: pl.seatId,
        color: pl.color,
        lampsBefore: pl.lampsBefore,
        lampsAfter: pl.lampsAfter,
        lampDrop: pl.lampDrop,
        order: pl.order,
        bid: isFinished || pl.seatId === viewerSeatId ? pl.bid : null,
      };
    };

    const history = fullState.history.map((h) => {
      const plays = {};
      for (const id of fullState.seatOrder) {
        if (h.plays[id]) plays[id] = projectPlay(h.plays[id]);
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
    if (!fullState || fullState.phase === 'finished' || fullState.phase === 'round_result') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const bot = fullState.players[botSeatId];
    const oppSeatId = getOtherSeatId(fullState, botSeatId);
    const opp = fullState.players[oppSeatId];
    const diff = ctx?.difficulty || 'genius';
    const rng = ctx?.rng || Math.random;

    const rem = bot.remaining;
    if (rem === 0) {
      return { type: 'SUBMIT_BID', payload: { bid: 0 } };
    }

    const roundsLeft = TOTAL_ROUNDS - fullState.history.length;
    const winsNeeded = Math.max(1, WIN_TARGET - bot.score);
    const oppWinsNeeded = Math.max(1, WIN_TARGET - opp.score);
    const clamp = (v) => Math.max(0, Math.min(rem, Math.round(v)));

    // Final decisive round: go all-in!
    if (roundsLeft === 1) {
      return { type: 'SUBMIT_BID', payload: { bid: rem } };
    }

    // ---- EASY TIER ----
    if (diff === 'easy') {
      if (rng() < 0.24 && oppWinsNeeded > 1) {
        return { type: 'SUBMIT_BID', payload: { bid: 0 } };
      }
      const avg = rem / Math.max(1, roundsLeft);
      const jitter = (rng() - 0.4) * 8;
      return { type: 'SUBMIT_BID', payload: { bid: clamp(avg + jitter) } };
    }

    // ---- GENIUS & GRAND FINAL TIERS ----
    const bounds = inferOpponentBounds(fullState, botSeatId);
    const estOppRem = (bounds.oppMinRem + bounds.oppMaxRem) / 2;
    const targetPerWin = rem / winsNeeded;

    if (fullState.phase === 'second_bid') {
      const fp = fullState.currentRound.firstPlay;
      const bMin = bounds.currentBidMin ?? (fp.color === 'black' ? 0 : 10);
      const bMax = bounds.currentBidMax ?? (fp.color === 'black' ? 9 : Math.max(10, bounds.oppMaxRem));
      const estBid = bMin + (bMax - bMin) * (fp.color === 'black' ? 0.45 : 0.55);

      // Must win if opponent is at match point
      const mustDefend = oppWinsNeeded === 1;

      // Case 1: Opponent dropped 2+ lamps -> massive spend! Dump 0 unless forced to defend!
      if (fp.lampDrop >= 2 && !mustDefend) {
        // Occasionally contest if our remaining budget dwarfs theirs
        if (rem > estOppRem + 28 && bMax + 1 <= rem * 0.45) {
          return { type: 'SUBMIT_BID', payload: { bid: clamp(bMax + 1) } };
        }
        return { type: 'SUBMIT_BID', payload: { bid: 0 } };
      }

      // Case 2: Opponent played BLACK (0-9) -> juicy snipe opportunity!
      if (fp.color === 'black') {
        if (bMax === 0) {
          return { type: 'SUBMIT_BID', payload: { bid: clamp(1) } };
        }
        // Guaranteed win at bMax + 1 (usually 10, or less if lamp drop constrained it)
        const snipe = diff === 'grand_final'
          ? (bMax <= 9 && rem >= bMax + 1 ? bMax + 1 : clamp(estBid + 2))
          : clamp(Math.min(11, bMax + 1 + Math.floor(rng() * 2)));
        // If we want to hide our snipe as BLACK when bMax <= 6
        if (diff === 'grand_final' && bMax <= 6 && rem >= bMax + 1) {
          return { type: 'SUBMIT_BID', payload: { bid: clamp(bMax + 1) } };
        }
        return { type: 'SUBMIT_BID', payload: { bid: clamp(snipe) } };
      }

      // Case 3: Opponent played WHITE (10+) with 0 or 1 lamp drop
      // Estimate cost to reliably beat opponent
      const beatBid = Math.min(bMax + 1, Math.round(estBid + (diff === 'grand_final' ? 3 : 4)));

      if (mustDefend) {
        const desperate = Math.min(rem, Math.max(beatBid, Math.round(bMax + 1)));
        return { type: 'SUBMIT_BID', payload: { bid: clamp(desperate) } };
      }

      // If beating opponent is affordable relative to our per-win budget, beat it!
      if (beatBid <= targetPerWin * 1.18 && beatBid <= rem) {
        return { type: 'SUBMIT_BID', payload: { bid: clamp(beatBid) } };
      }

      // Otherwise, dump 0 to conserve points and keep Second-Player advantage next round!
      return { type: 'SUBMIT_BID', payload: { bid: 0 } };
    }

    // ---- FIRST BID (GENIUS / GRAND FINAL) ----
    // Remember: Going first reveals your color + lamp drop!
    // S3E3 Choi Yeon-seung tactic:
    //  1) Sometimes throw 0 (BLACK, 0 lamp drop) to concede cheaply & take 2nd-player reactivity.
    //  2) Sometimes bid right down to a lamp floor (e.g., rem -> 80, 60, 40, 20) so 0 lamps extinguish!
    //  3) When opponent has 0 remaining points (0 lamps), bid just 1!
    if (opp.lamps === 0) {
      return { type: 'SUBMIT_BID', payload: { bid: clamp(1) } };
    }

    if (winsNeeded === 1 && rem > bounds.oppMaxRem) {
      // Guaranteed match-clinching bid!
      return { type: 'SUBMIT_BID', payload: { bid: clamp(bounds.oppMaxRem + 1) } };
    }

    const canAffordDump = roundsLeft > winsNeeded && oppWinsNeeded > 1;
    if (canAffordDump && rng() < (diff === 'grand_final' ? 0.36 : 0.26)) {
      // Tactical 0 or deceptive low black bluff (0 or 1-3)
      const bluff = rng() < 0.72 ? 0 : Math.floor(1 + rng() * 3);
      return { type: 'SUBMIT_BID', payload: { bid: clamp(bluff) } };
    }

    // Disguised threshold bid (Grand Final specialty):
    // Find max bid that keeps current lamp count unchanged!
    const currentFloor = (bot.lamps - 1) * 20; // e.g., 5 lamps -> floor 80
    const zeroDropMaxBid = rem - currentFloor; // e.g., 99 - 80 = 19!
    if (
      diff === 'grand_final' &&
      zeroDropMaxBid >= 12 &&
      zeroDropMaxBid <= targetPerWin * 1.35 &&
      rng() < 0.58
    ) {
      // Bid e.g. 17..19 without dropping a single lamp! Looks like a weak 10-bid to opponent!
      const sneaky = Math.max(11, zeroDropMaxBid - Math.floor(rng() * 3));
      return { type: 'SUBMIT_BID', payload: { bid: clamp(sneaky) } };
    }

    // Standard value-paced bid around targetPerWin
    const base = Math.max(10, Math.min(rem, targetPerWin * (0.85 + rng() * 0.35)));
    return { type: 'SUBMIT_BID', payload: { bid: clamp(base) } };
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
        label: `${p.score} / ${WIN_TARGET} pts` + (p.remaining != null ? ` (${p.remaining} left)` : ''),
      }));

    const summary =
      winnerSeatIds.length === 0
        ? {
            zh: `9 回合 99 点盲注平局（${sa} : ${sb}）！点击「再战一局」再决高下。`,
            en: `Deadlock (${sa} : ${sb}) after 9 blind auction rounds! Play a rematch to settle it.`,
          }
        : {
            zh: `${state.players[winnerSeatIds[0]].name} 以 ${Math.max(sa, sb)} : ${Math.min(sa, sb)} 精准算透能量灯差值，赢得《黑与白II》！`,
            en: `${state.players[winnerSeatIds[0]].name} mastered the 99-point lamp telemetry (${Math.max(sa, sb)} : ${Math.min(sa, sb)}) to survive Black and White II!`,
          };

    return { winnerSeatIds, rankings, summary };
  },
};
