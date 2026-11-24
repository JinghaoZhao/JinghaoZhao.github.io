/**
 * Gem Black Market (宝石黑市 / 보석 암시장) — Pure Deterministic Game Rules
 * Day 3 Main Match (EP 6–7) · The Devil's Plan Season 3: Dead Again
 *
 * Pure ES module: zero DOM dependencies, deterministic via ctx.rng.
 */

export const TOTAL_ROUNDS = 3;
export const STARTING_PIECES = 2;
export const BOMB_BAIT_BONUS = 3;

export const GEM_META = {
  diamond: {
    id: 'diamond',
    name: { zh: '钻石', en: 'Diamond', ko: '다이아몬드' },
    color: '#38bdf8',
    accent: '#bae6fd',
  },
  gold: {
    id: 'gold',
    name: { zh: '黄金', en: 'Gold', ko: '골드' },
    color: '#f59e0b',
    accent: '#fde68a',
  },
  silver: {
    id: 'silver',
    name: { zh: '白银', en: 'Silver', ko: '실버' },
    color: '#cbd5e1',
    accent: '#f8fafc',
  },
  bronze: {
    id: 'bronze',
    name: { zh: '青铜', en: 'Bronze', ko: '브론즈' },
    color: '#ea580c',
    accent: '#fdba74',
  },
  bomb: {
    id: 'bomb',
    name: { zh: '炸弹', en: 'Bomb', ko: '폭탄' },
    color: '#ef4444',
    accent: '#fca5a5',
  },
};

/**
 * Exact 13-card show deck for 9 players, gracefully trimmed for 4–8 players
 * so total cards always equals N + 4 (N players + 3 Buyers + 1 Trash)
 * while keeping both Bombs (-6, -4) and >= 2 copies of every gem tier in play.
 */
export function buildDeck(playerCount) {
  const mk = (id, type, value) => ({ id, type, value });
  const base9 = [
    mk('d5', 'diamond', 5),
    mk('d6', 'diamond', 6),
    mk('g4', 'gold', 4),
    mk('g5', 'gold', 5),
    mk('s2', 'silver', 2),
    mk('s3', 'silver', 3),
    mk('s4', 'silver', 4),
    mk('b1a', 'bronze', 1),
    mk('b1b', 'bronze', 1),
    mk('b2a', 'bronze', 2),
    mk('b2b', 'bronze', 2),
    mk('x6', 'bomb', -6),
    mk('x4', 'bomb', -4),
  ];

  if (playerCount >= 9) return base9;
  if (playerCount === 8) return base9.filter((c) => c.id !== 'b1b');
  if (playerCount === 7) return base9.filter((c) => !['b1b', 'b2b'].includes(c.id));
  if (playerCount === 6) return base9.filter((c) => !['b1b', 'b2b', 's2'].includes(c.id));
  if (playerCount === 5) return base9.filter((c) => !['b1a', 'b1b', 'b2a', 'b2b'].includes(c.id));
  // 4 players => 8 cards: Diamond(5,6), Gold(4,5), Silver(3,4), Bomb(-6,-4)
  return base9.filter((c) => !['b1a', 'b1b', 'b2a', 'b2b', 's2'].includes(c.id));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function slotKeyOf(target) {
  if (!target) return null;
  if (target.kind === 'buyer') return `buyer-${target.index}`;
  if (target.kind === 'trash') return 'trash';
  return null;
}

function getOrderedSeats(seatOrder, firstPlayerIdx) {
  const n = seatOrder.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(seatOrder[(firstPlayerIdx + i) % n]);
  }
  return out;
}

/**
 * Deal a fresh round (called at match start and when advancing to R2 / R3).
 */
function dealRound(state, rng) {
  const s = cloneState(state);
  const deck = shuffle(buildDeck(s.seatOrder.length), rng);
  const order = getOrderedSeats(s.seatOrder, s.firstPlayerIdx);

  s.hands = {};
  s.lastSeenCard = {};
  s.cardDirty = {};
  s.privateSlotMemory = {};

  order.forEach((sid, idx) => {
    const card = deck[idx];
    s.hands[sid] = card;
    s.lastSeenCard[sid] = card;
    s.cardDirty[sid] = false;
    s.privateSlotMemory[sid] = {};
  });

  const rem = deck.slice(order.length);
  s.buyers = [rem[0], rem[1], rem[2]];
  s.trash = rem[3];

  s.phase = 'deal_peek';
  s.passIndex = 0; // 0 = forward, 1 = reverse
  s.turnQueue = order.slice();
  s.turnCursor = 0;
  s.currentTurnSeatId = null;
  s.pendingSeatIds = s.seatOrder.slice();
  s.swapLog = [];
  s.roundTrapEvents = [];
  s.lastSwap = null;
  s.roundSummary = null;
  return s;
}

/**
 * Begin Pass 1 (Forward Swap) after all players confirmed initial card peek.
 */
function startForwardPass(state) {
  const s = cloneState(state);
  const forward = getOrderedSeats(s.seatOrder, s.firstPlayerIdx);
  s.phase = 'swap_forward';
  s.passIndex = 0;
  s.turnQueue = forward;
  s.turnCursor = 0;
  s.currentTurnSeatId = forward[0];
  s.pendingSeatIds = [];
  // Active actor now sees their exact current card
  s.lastSeenCard[s.currentTurnSeatId] = s.hands[s.currentTurnSeatId];
  s.cardDirty[s.currentTurnSeatId] = false;
  return s;
}

/**
 * Settle end-of-round scoring, Diamond Piece bonus, Bomb Bait +3 bonus, and next First Player.
 */
function resolveRound(state) {
  const s = cloneState(state);
  const buyerCounts = { diamond: 0, gold: 0, silver: 0, bronze: 0, bomb: 0 };
  for (const card of s.buyers) {
    if (card && buyerCounts[card.type] !== undefined) {
      buyerCounts[card.type] += 1;
    }
  }

  const baitCountBySeat = {};
  for (const ev of s.roundTrapEvents) {
    baitCountBySeat[ev.baitedBy] = (baitCountBySeat[ev.baitedBy] || 0) + 1;
  }

  const breakdown = {};
  let bomb6Holder = null;
  let bomb4Holder = null;

  for (const sid of s.seatOrder) {
    const card = s.hands[sid];
    const pl = s.players[sid];
    let cardScore = 0;
    let matchCount = 0;
    let pieceGained = 0;

    if (card.type === 'bomb') {
      cardScore = card.value; // -6 or -4
      if (card.value === -6) bomb6Holder = sid;
      if (card.value === -4) bomb4Holder = sid;
    } else {
      matchCount = buyerCounts[card.type] || 0;
      cardScore = card.value * matchCount;
      if (card.type === 'diamond' && matchCount >= 1) {
        pieceGained = 1;
        pl.pieces += 1;
      }
    }

    const baitCount = baitCountBySeat[sid] || 0;
    const baitPoints = baitCount * BOMB_BAIT_BONUS;
    const roundTotal = cardScore + baitPoints;
    pl.score += roundTotal;
    pl.roundScores.push(roundTotal);

    breakdown[sid] = {
      seatId: sid,
      card,
      matchCount,
      cardScore,
      baitCount,
      baitPoints,
      pieceGained,
      roundTotal,
      cumulativeScore: pl.score,
    };
  }

  // Next first player rule: -6 Bomb holder -> -4 Bomb holder -> unchanged
  let nextFirstIdx = s.firstPlayerIdx;
  if (bomb6Holder) {
    nextFirstIdx = s.seatOrder.indexOf(bomb6Holder);
  } else if (bomb4Holder) {
    nextFirstIdx = s.seatOrder.indexOf(bomb4Holder);
  }

  s.nextFirstPlayerIdx = nextFirstIdx;
  s.roundSummary = {
    round: s.round,
    buyers: s.buyers.slice(),
    trash: s.trash,
    buyerCounts,
    breakdown,
    traps: s.roundTrapEvents.slice(),
    nextFirstSeatId: s.seatOrder[nextFirstIdx],
  };
  s.roundHistory.push(s.roundSummary);

  s.phase = 'round_reveal';
  s.currentTurnSeatId = null;
  // Require humans (and bots auto-ready) to advance
  s.pendingSeatIds = s.seatOrder.slice();
  return s;
}

/**
 * Compute final Manito multiplication scores (Own Score * Manito Score).
 */
function buildFinaleData(state) {
  const entries = state.seatOrder.map((sid) => {
    const pl = state.players[sid];
    const manitoId = state.manitoOf[sid];
    const manitoPl = state.players[manitoId];
    const ownScore = pl.score;
    const manitoScore = manitoPl.score;
    const finalScore = ownScore * manitoScore;
    return {
      seatId: sid,
      name: pl.name,
      avatar: pl.avatar,
      ownScore,
      manitoSeatId: manitoId,
      manitoName: manitoPl.name,
      manitoScore,
      finalScore,
      pieces: pl.pieces,
      isNegNegReversal: ownScore < 0 && manitoScore < 0,
      isBetrayalCrash: (ownScore > 0 && manitoScore < 0) || (ownScore < 0 && manitoScore > 0),
    };
  });

  entries.sort((a, b) => b.finalScore - a.finalScore || b.ownScore - a.ownScore || b.pieces - a.pieces);
  return entries;
}

/**
 * Deceptive psychological AI for Gem Black Market.
 */
function decideBotAction(fullState, botSeatId, ctx) {
  const rng = ctx?.rng || Math.random;

  if (fullState.phase === 'deal_peek' && fullState.pendingSeatIds.includes(botSeatId)) {
    return { type: 'CONFIRM_PEEK', payload: {} };
  }

  if (fullState.phase === 'round_reveal' && fullState.pendingSeatIds.includes(botSeatId)) {
    return { type: 'ADVANCE_ROUND', payload: {} };
  }

  if (
    (fullState.phase === 'swap_forward' || fullState.phase === 'swap_reverse') &&
    fullState.currentTurnSeatId === botSeatId
  ) {
    const pl = fullState.players[botSeatId];
    const myCard = fullState.hands[botSeatId];
    const myManitoId = fullState.manitoOf[botSeatId];
    const manitoPl = fullState.players[myManitoId];
    const mem = fullState.privateSlotMemory[botSeatId] || {};

    // Determine whether this bot should pursue a NEGATIVE x NEGATIVE reversal pact!
    const wantNegative =
      (fullState.round >= 2 && manitoPl.score < 0 && pl.score <= 4) ||
      (fullState.round === 3 && manitoPl.score <= -2 && pl.score <= 2);

    // Optionally use once-per-match Piece Peek in Round 2 or 3 on an unknown Buyer slot
    if (!pl.usedPiecePeek && pl.pieces >= 1 && fullState.round >= 2 && rng() < 0.35) {
      const unknownBuyers = [0, 1, 2].filter((idx) => !mem[`buyer-${idx}`]);
      if (unknownBuyers.length > 0) {
        const idx = unknownBuyers[Math.floor(rng() * unknownBuyers.length)];
        return { type: 'PEEK_SLOT', payload: { kind: 'buyer', index: idx } };
      }
    }

    const otherSeats = fullState.seatOrder.filter((sid) => sid !== botSeatId);
    const nonManitoSeats = otherSeats.filter((sid) => sid !== myManitoId);

    // Mandatory rule: if holding a Bomb, MUST swap with another player!
    if (myCard.type === 'bomb') {
      // If executing Negative x Negative pact in Pass 2 and Manito is still positive, maybe pass bomb to Manito!
      if (wantNegative && fullState.phase === 'swap_reverse' && manitoPl.score >= 0 && rng() < 0.65) {
        return { type: 'SWAP', payload: { kind: 'player', seatId: myManitoId } };
      }
      // Otherwise dump Bomb onto a rival (prefer highest-scoring non-Manito threat!)
      const sortedRivals = nonManitoSeats
        .slice()
        .sort((a, b) => fullState.players[b].score - fullState.players[a].score);
      const targetId =
        sortedRivals.length > 0 && rng() < 0.72
          ? sortedRivals[0]
          : nonManitoSeats[Math.floor(rng() * nonManitoSeats.length)] || otherSeats[0];
      return { type: 'SWAP', payload: { kind: 'player', seatId: targetId } };
    }

    // Holding a Gem!
    // If pursuing Negative x Negative reversal, try to steal from players who acted like they dumped/baited or grab unknown
    if (wantNegative) {
      // Look for someone who swapped with a player recently (might hold a bomb!)
      const suspects = nonManitoSeats.filter((sid) =>
        fullState.swapLog.some((lg) => lg.actorSeatId === sid || lg.targetSeatId === sid)
      );
      const pool = suspects.length > 0 ? suspects : nonManitoSeats;
      const pick = pool[Math.floor(rng() * pool.length)] || otherSeats[0];
      return { type: 'SWAP', payload: { kind: 'player', seatId: pick } };
    }

    // Normal Positive Score Hunt: evaluate known Buyer slots
    const knownBuyerTypes = {};
    for (let i = 0; i < 3; i++) {
      const c = mem[`buyer-${i}`];
      if (c && c.type !== 'bomb') {
        knownBuyerTypes[c.type] = (knownBuyerTypes[c.type] || 0) + 1;
      }
    }

    // If holding a strong Gem (value >= 4) and we know a matching Gem is in a Buyer slot,
    // swap a DIFFERENT Buyer or Trash? Wait — we MUST swap our hand card!
    // So in Pass 1 (forward), placing a high Gem into a Buyer slot or swapping with Trash can set up Pass 2;
    // in Pass 2 (reverse), we want to END UP holding a Gem that matches what's in Buyers!
    if (fullState.phase === 'swap_reverse') {
      // Check if any known Buyer slot or Trash holds a strong Gem whose type matches ANOTHER known Buyer slot
      const buyerCandidates = [];
      for (let i = 0; i < 3; i++) {
        const c = mem[`buyer-${i}`];
        if (!c || c.type === 'bomb') continue;
        // If we take buyer i and put myCard into buyer i:
        const otherMatches = [0, 1, 2].filter(
          (j) => j !== i && mem[`buyer-${j}`]?.type === c.type
        ).length;
        const selfMatch = myCard.type === c.type ? 1 : 0;
        const est = c.value * (otherMatches + selfMatch);
        if (est >= 5) buyerCandidates.push({ index: i, est });
      }
      if (buyerCandidates.length > 0) {
        buyerCandidates.sort((a, b) => b.est - a.est);
        return { type: 'SWAP', payload: { kind: 'buyer', index: buyerCandidates[0].index } };
      }

      // Check Trash if known and valuable
      const trashKnown = mem.trash;
      if (trashKnown && trashKnown.type !== 'bomb' && trashKnown.value >= 4) {
        return { type: 'SWAP', payload: { kind: 'trash' } };
      }

      // If our current card is low (Bronze 1-2), swap with a random Buyer or Trash or Rival
      if (myCard.value <= 2) {
        const roll = rng();
        if (roll < 0.45) {
          return { type: 'SWAP', payload: { kind: 'buyer', index: Math.floor(rng() * 3) } };
        }
        if (roll < 0.65) {
          return { type: 'SWAP', payload: { kind: 'trash' } };
        }
        const rival = nonManitoSeats[Math.floor(rng() * nonManitoSeats.length)] || otherSeats[0];
        return { type: 'SWAP', payload: { kind: 'player', seatId: rival } };
      }

      // If our current card is high (Diamond/Gold 4-6), swapping with a Buyer puts our Gem into Buyers
      // (good for our Manito if Manito has same gem, or risky for us) — try Trash or an unknown Buyer!
      const roll = rng();
      if (roll < 0.4) {
        return { type: 'SWAP', payload: { kind: 'buyer', index: Math.floor(rng() * 3) } };
      }
      if (roll < 0.65) {
        return { type: 'SWAP', payload: { kind: 'trash' } };
      }
      // Or gift high Gem directly to our own Manito! (Brilliant Devil's Plan teamwork!)
      if (manitoPl.score >= 0 && rng() < 0.6) {
        return { type: 'SWAP', payload: { kind: 'player', seatId: myManitoId } };
      }
      const rival = nonManitoSeats[Math.floor(rng() * nonManitoSeats.length)] || otherSeats[0];
      return { type: 'SWAP', payload: { kind: 'player', seatId: rival } };
    }

    // Pass 1 (swap_forward): seed high gems into Buyers or probe players/trash
    if (myCard.value >= 4 && rng() < 0.45) {
      return { type: 'SWAP', payload: { kind: 'buyer', index: Math.floor(rng() * 3) } };
    }
    const r = rng();
    if (r < 0.42) {
      const targetId = otherSeats[Math.floor(rng() * otherSeats.length)];
      return { type: 'SWAP', payload: { kind: 'player', seatId: targetId } };
    }
    if (r < 0.8) {
      return { type: 'SWAP', payload: { kind: 'buyer', index: Math.floor(rng() * 3) } };
    }
    return { type: 'SWAP', payload: { kind: 'trash' } };
  }

  return null;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const opts = ctx?.options || {};
    const turnTimerSec = opts.turnTimer === '0' ? 0 : Number(opts.turnTimer) || 45;

    const seatOrder = seats.map((s) => s.seatId);
    const players = {};
    seats.forEach((s) => {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar || '◆',
        isBot: Boolean(s.isBot),
        score: 0,
        pieces: STARTING_PIECES,
        usedPiecePeek: false,
        roundScores: [],
      };
    });

    // Build single closed circular Manito loop (P0 -> P1 -> ... -> Pn-1 -> P0)
    const manitoCycle = shuffle(seatOrder, rng);
    const manitoOf = {};
    for (let i = 0; i < manitoCycle.length; i++) {
      manitoOf[manitoCycle[i]] = manitoCycle[(i + 1) % manitoCycle.length];
    }

    const firstPlayerIdx = Math.floor(rng() * seatOrder.length);

    const baseState = {
      phase: 'deal_peek', // 'deal_peek' | 'swap_forward' | 'swap_reverse' | 'round_reveal' | 'finale' | 'ended'
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      turnTimerSec,
      seatOrder,
      players,
      manitoCycle,
      manitoOf,
      firstPlayerIdx,
      nextFirstPlayerIdx: firstPlayerIdx,
      hands: {},
      buyers: [],
      trash: null,
      lastSeenCard: {},
      cardDirty: {},
      privateSlotMemory: {},
      passIndex: 0,
      turnQueue: [],
      turnCursor: 0,
      currentTurnSeatId: null,
      pendingSeatIds: [],
      swapLog: [],
      roundTrapEvents: [],
      lastSwap: null,
      roundSummary: null,
      roundHistory: [],
      finaleEntries: null,
    };

    return dealRound(baseState, rng);
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || !action || !action.type) {
      return { ok: false, reason: 'Invalid action' };
    }

    if (action.type === 'CONFIRM_PEEK') {
      if (fullState.phase !== 'deal_peek') return { ok: false, reason: 'Not in deal peek phase' };
      if (!fullState.pendingSeatIds.includes(seatId)) return { ok: false, reason: 'Already confirmed' };
      return { ok: true };
    }

    if (action.type === 'PEEK_SLOT') {
      if (fullState.phase !== 'swap_forward' && fullState.phase !== 'swap_reverse') {
        return { ok: false, reason: 'Peek only allowed during swap phases' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Only the active player may use Piece Peek' };
      }
      const pl = fullState.players[seatId];
      if (!pl || pl.usedPiecePeek) return { ok: false, reason: 'Piece Peek already used this match' };
      if (pl.pieces < 1) return { ok: false, reason: 'Not enough Devil Pieces' };
      const kind = action.payload?.kind;
      const index = Number(action.payload?.index);
      if (kind === 'buyer') {
        if (![0, 1, 2].includes(index)) return { ok: false, reason: 'Invalid Buyer slot' };
      } else if (kind !== 'trash') {
        return { ok: false, reason: 'Can only peek Buyer or Trash slots' };
      }
      return { ok: true };
    }

    if (action.type === 'SWAP') {
      if (fullState.phase !== 'swap_forward' && fullState.phase !== 'swap_reverse') {
        return { ok: false, reason: 'Not in swap phase' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Not your turn' };
      }
      const actorCard = fullState.hands[seatId];
      const kind = action.payload?.kind;
      if (actorCard?.type === 'bomb' && kind !== 'player') {
        return {
          ok: false,
          reason: 'BOMB RULE: You MUST swap a Bomb with another player (never Buyer or Trash)!',
        };
      }
      if (kind === 'player') {
        const targetId = action.payload?.seatId;
        if (!fullState.players[targetId] || targetId === seatId) {
          return { ok: false, reason: 'Choose another player to swap with' };
        }
        return { ok: true };
      }
      if (kind === 'buyer') {
        const idx = Number(action.payload?.index);
        if (![0, 1, 2].includes(idx)) return { ok: false, reason: 'Invalid Buyer slot' };
        return { ok: true };
      }
      if (kind === 'trash') {
        return { ok: true };
      }
      return { ok: false, reason: 'Invalid swap target' };
    }

    if (action.type === 'ADVANCE_ROUND') {
      if (fullState.phase !== 'round_reveal') return { ok: false, reason: 'Not in round reveal phase' };
      if (!fullState.pendingSeatIds.includes(seatId)) return { ok: false, reason: 'Already ready' };
      return { ok: true };
    }

    if (action.type === 'CONCLUDE_MATCH') {
      if (fullState.phase !== 'finale') return { ok: false, reason: 'Not in finale phase' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const rng = ctx?.rng || Math.random;

    if (action.type === 'CONFIRM_PEEK') {
      const next = cloneState(fullState);
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      if (next.pendingSeatIds.length === 0) {
        return {
          state: startForwardPass(next),
          events: [{ type: 'SWAP_PHASE_START', pass: 0, round: next.round }],
        };
      }
      return { state: next, events: [{ type: 'PEEK_CONFIRMED', seatId }] };
    }

    if (action.type === 'PEEK_SLOT') {
      const next = cloneState(fullState);
      const pl = next.players[seatId];
      pl.pieces -= 1;
      pl.usedPiecePeek = true;
      const key = slotKeyOf(action.payload);
      const card =
        action.payload.kind === 'buyer'
          ? next.buyers[Number(action.payload.index)]
          : next.trash;
      if (!next.privateSlotMemory[seatId]) next.privateSlotMemory[seatId] = {};
      next.privateSlotMemory[seatId][key] = card;
      return {
        state: next,
        events: [{ type: 'SLOT_PEEKED', seatId, slotKey: key }],
      };
    }

    if (action.type === 'SWAP') {
      const next = cloneState(fullState);
      const actorCard = next.hands[seatId];
      const kind = action.payload.kind;
      let targetLabel = '';
      let targetSeatId = null;
      let targetSlotKey = null;

      if (kind === 'player') {
        targetSeatId = action.payload.seatId;
        const targetCard = next.hands[targetSeatId];

        // Check Bomb Bait Bonus: if target was holding a bomb and actor came to take it!
        if (targetCard.type === 'bomb') {
          next.roundTrapEvents.push({
            baitedBy: targetSeatId,
            thief: seatId,
            bombValue: targetCard.value,
            pass: next.passIndex,
          });
        }

        // Perform 1-for-1 blind swap
        next.hands[seatId] = targetCard;
        next.hands[targetSeatId] = actorCard;

        // Actor immediately sees the new card they just acquired; target does NOT see their new card until their turn!
        next.lastSeenCard[seatId] = targetCard;
        next.cardDirty[seatId] = false;
        next.cardDirty[targetSeatId] = true;
        targetLabel = targetSeatId;
      } else if (kind === 'buyer') {
        const idx = Number(action.payload.index);
        targetSlotKey = `buyer-${idx}`;
        const slotCard = next.buyers[idx];
        next.buyers[idx] = actorCard;
        next.hands[seatId] = slotCard;

        // Invalidate everyone else's memory of this slot; actor remembers what they placed into it
        for (const sid of next.seatOrder) {
          if (next.privateSlotMemory[sid]) delete next.privateSlotMemory[sid][targetSlotKey];
        }
        next.privateSlotMemory[seatId][targetSlotKey] = actorCard;
        next.lastSeenCard[seatId] = slotCard;
        next.cardDirty[seatId] = false;
        targetLabel = targetSlotKey;
      } else if (kind === 'trash') {
        targetSlotKey = 'trash';
        const trashCard = next.trash;
        next.trash = actorCard;
        next.hands[seatId] = trashCard;

        for (const sid of next.seatOrder) {
          if (next.privateSlotMemory[sid]) delete next.privateSlotMemory[sid].trash;
        }
        next.privateSlotMemory[seatId].trash = actorCard;
        next.lastSeenCard[seatId] = trashCard;
        next.cardDirty[seatId] = false;
        targetLabel = 'trash';
      }

      const logEntry = {
        seq: next.swapLog.length + 1,
        pass: next.passIndex,
        actorSeatId: seatId,
        targetKind: kind,
        targetSeatId,
        targetSlotKey,
        targetLabel,
      };
      next.swapLog.push(logEntry);
      next.lastSwap = logEntry;

      // Advance turn cursor
      next.turnCursor += 1;
      if (next.turnCursor < next.turnQueue.length) {
        next.currentTurnSeatId = next.turnQueue[next.turnCursor];
        next.lastSeenCard[next.currentTurnSeatId] = next.hands[next.currentTurnSeatId];
        next.cardDirty[next.currentTurnSeatId] = false;
        return { state: next, events: [{ type: 'CARD_SWAPPED', ...logEntry }] };
      }

      // Finished Pass 1 -> start Pass 2 (exact reverse order!)
      if (next.passIndex === 0) {
        next.passIndex = 1;
        next.phase = 'swap_reverse';
        next.turnQueue = next.turnQueue.slice().reverse();
        next.turnCursor = 0;
        next.currentTurnSeatId = next.turnQueue[0];
        next.lastSeenCard[next.currentTurnSeatId] = next.hands[next.currentTurnSeatId];
        next.cardDirty[next.currentTurnSeatId] = false;
        return {
          state: next,
          events: [
            { type: 'CARD_SWAPPED', ...logEntry },
            { type: 'SWAP_PHASE_START', pass: 1, round: next.round },
          ],
        };
      }

      // Finished Pass 2 -> resolve Round Showdown!
      const resolved = resolveRound(next);
      return {
        state: resolved,
        events: [{ type: 'ROUND_RESOLVED', round: next.round }],
      };
    }

    if (action.type === 'ADVANCE_ROUND') {
      const next = cloneState(fullState);
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      if (next.pendingSeatIds.length === 0) {
        if (next.round >= next.totalRounds) {
          next.phase = 'finale';
          next.finaleEntries = buildFinaleData(next);
          return { state: next, events: [{ type: 'FINALE_REVEAL' }] };
        }
        next.round += 1;
        next.firstPlayerIdx = next.nextFirstPlayerIdx;
        return {
          state: dealRound(next, rng),
          events: [{ type: 'ROUND_DEALT', round: next.round }],
        };
      }
      return { state: next, events: [{ type: 'ADVANCE_READY', seatId }] };
    }

    if (action.type === 'CONCLUDE_MATCH') {
      const next = cloneState(fullState);
      next.phase = 'ended';
      return { state: next, events: [{ type: 'MATCH_CONCLUDED' }] };
    }

    return { state: fullState };
  },

  onPhaseTimeout(fullState, ctx) {
    const rng = ctx?.rng || Math.random;
    if (fullState.phase === 'deal_peek') {
      return {
        state: startForwardPass(fullState),
        events: [{ type: 'SWAP_PHASE_START', pass: 0, round: fullState.round }],
      };
    }
    if (fullState.phase === 'swap_forward' || fullState.phase === 'swap_reverse') {
      const actor = fullState.currentTurnSeatId;
      const autoAction = decideBotAction(fullState, actor, { rng });
      if (autoAction) {
        return GameRules.applyAction(fullState, actor, autoAction, ctx);
      }
    }
    if (fullState.phase === 'round_reveal') {
      const next = cloneState(fullState);
      next.pendingSeatIds = [];
      if (next.round >= next.totalRounds) {
        next.phase = 'finale';
        next.finaleEntries = buildFinaleData(next);
        return { state: next, events: [{ type: 'FINALE_REVEAL' }] };
      }
      next.round += 1;
      next.firstPlayerIdx = next.nextFirstPlayerIdx;
      return {
        state: dealRound(next, rng),
        events: [{ type: 'ROUND_DEALT', round: next.round }],
      };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    if (fullState.turnTimerSec <= 0) return null;
    if (fullState.phase === 'deal_peek') {
      return { phaseKey: `peek-r${fullState.round}`, durationMs: 30000 };
    }
    if (fullState.phase === 'swap_forward' || fullState.phase === 'swap_reverse') {
      return {
        phaseKey: `swap-r${fullState.round}-p${fullState.passIndex}-t${fullState.turnCursor}`,
        durationMs: fullState.turnTimerSec * 1000,
      };
    }
    if (fullState.phase === 'round_reveal') {
      return { phaseKey: `reveal-r${fullState.round}`, durationMs: 40000 };
    }
    return null;
  },

  /**
   * STRICT SECRET PROJECTION:
   * - Never reveals other players' secret Manito assignments until finale/ended.
   * - Never reveals other players' face-down hands during deal_peek or swap phases.
   * - Enforces show rule: if someone swapped with you, your hand is masked as UNKNOWN until your turn!
   * - Only exposes Buyer/Trash cards the viewer personally peeked or placed (and weren't subsequently swapped).
   */
  projectState(fullState, viewerSeatId) {
    const isReveal = fullState.phase === 'round_reveal';
    const isFinale = fullState.phase === 'finale' || fullState.phase === 'ended';
    const cardsOpen = isReveal || isFinale;

    const myManitoSeatId = viewerSeatId ? fullState.manitoOf[viewerSeatId] || null : null;
    const myMem = viewerSeatId ? fullState.privateSlotMemory[viewerSeatId] || {} : {};

    // Determine viewer's visible hand card
    let myCard = null;
    let myCardKnown = false;
    let myCardDirty = false;
    if (viewerSeatId && fullState.hands[viewerSeatId]) {
      if (cardsOpen || fullState.phase === 'deal_peek' || fullState.currentTurnSeatId === viewerSeatId) {
        myCard = fullState.hands[viewerSeatId];
        myCardKnown = true;
      } else if (!fullState.cardDirty[viewerSeatId]) {
        myCard = fullState.lastSeenCard[viewerSeatId] || null;
        myCardKnown = Boolean(myCard);
      } else {
        myCard = null;
        myCardKnown = false;
        myCardDirty = true;
      }
    }

    const buyersView = [0, 1, 2].map((idx) => {
      const key = `buyer-${idx}`;
      if (cardsOpen) return { index: idx, revealed: true, card: fullState.buyers[idx], source: 'public' };
      if (myMem[key]) return { index: idx, revealed: true, card: myMem[key], source: 'private' };
      return { index: idx, revealed: false, card: null, source: null };
    });

    const trashView = cardsOpen
      ? { revealed: true, card: fullState.trash, source: 'public' }
      : myMem.trash
      ? { revealed: true, card: myMem.trash, source: 'private' }
      : { revealed: false, card: null, source: null };

    const playersView = fullState.seatOrder.map((sid) => {
      const pl = fullState.players[sid];
      const isMe = sid === viewerSeatId;
      return {
        seatId: sid,
        name: pl.name,
        avatar: pl.avatar,
        isBot: pl.isBot,
        score: pl.score,
        pieces: pl.pieces,
        usedPiecePeek: pl.usedPiecePeek,
        roundScores: pl.roundScores.slice(),
        isFirstPlayer: fullState.seatOrder[fullState.firstPlayerIdx] === sid,
        isMyManito: sid === myManitoSeatId,
        isCurrentTurn: fullState.currentTurnSeatId === sid,
        isPending: fullState.pendingSeatIds.includes(sid),
        // Face-up card ONLY in round_reveal/finale, or viewer's own known card
        card: cardsOpen ? fullState.hands[sid] : isMe && myCardKnown ? myCard : null,
        cardDirty: isMe ? myCardDirty : Boolean(fullState.cardDirty[sid]),
      };
    });

    return {
      phase: fullState.phase,
      round: fullState.round,
      totalRounds: fullState.totalRounds,
      passIndex: fullState.passIndex,
      firstPlayerSeatId: fullState.seatOrder[fullState.firstPlayerIdx],
      turnQueue: fullState.turnQueue.slice(),
      turnCursor: fullState.turnCursor,
      currentTurnSeatId: fullState.currentTurnSeatId,
      pendingSeatIds: fullState.pendingSeatIds.slice(),
      players: playersView,
      buyers: buyersView,
      trash: trashView,
      mySeatId: viewerSeatId,
      myManitoSeatId,
      myCard,
      myCardKnown,
      myCardDirty,
      mustSwapWithPlayer: Boolean(
        viewerSeatId &&
          fullState.currentTurnSeatId === viewerSeatId &&
          myCard?.type === 'bomb'
      ),
      swapLog: fullState.swapLog.slice(-14),
      lastSwap: fullState.lastSwap,
      roundSummary: isReveal ? fullState.roundSummary : null,
      roundHistory: fullState.roundHistory.slice(),
      // Secret circular Manito graph strictly withheld until finale / ended!
      manitoCycle: isFinale ? fullState.manitoCycle.slice() : null,
      manitoOf: isFinale ? { ...fullState.manitoOf } : null,
      finaleEntries: isFinale ? fullState.finaleEntries : null,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    return decideBotAction(fullState, botSeatId, ctx);
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;
    const entries = fullState.finaleEntries || buildFinaleData(fullState);
    const topScore = entries[0]?.finalScore ?? 0;
    const winnerSeatIds = entries.filter((e) => e.finalScore === topScore).map((e) => e.seatId);
    const hasNegReversal = entries.some((e) => e.isNegNegReversal && e.finalScore > 0);

    return {
      winnerSeatIds,
      rankings: entries.map((e, idx) => ({
        seatId: e.seatId,
        score: e.finalScore,
        label: `${e.ownScore} × ${e.manitoScore} = ${e.finalScore >= 0 ? '+' : ''}${e.finalScore}${
          idx === 0 ? ' ★' : idx === entries.length - 1 ? ' ✕' : ''
        }`,
      })),
      summary: {
        zh: `秘密伙伴 (Manito) 闭环乘法结算完成！${
          hasNegReversal ? '⚡ 场上惊现「负负得正」神级大翻盘！' : ''
        } 冠军最终得分 ${topScore >= 0 ? '+' : ''}${topScore}，赢取联盟徽章！`,
        en: `Secret Manito circular multiplication settled!${
          hasNegReversal ? ' ⚡ NEGATIVE × NEGATIVE reversal shook the vault!' : ''
        } Winner claims the Alliance Token at ${topScore >= 0 ? '+' : ''}${topScore} pts!`,
      },
    };
  },
};
