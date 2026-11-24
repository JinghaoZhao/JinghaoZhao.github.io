/**
 * Same Picture Hunt (같은 그림 찾기 / 寻找相同图片) — Pure Deterministic Rules & 3-Tier AI
 * Seasons: S1E11, S2E8, S4E7 (also S1E12 Finals)
 *
 * - Shared 4x4 board labeled A–P hiding 16 distinct high-contrast iconic emblems.
 * - Dual 20-slot personal conveyor belts (Slots 1..20; Slot 20 = Finish Line).
 * - Standard S4E7 fair start: both runners start at Slot 10 (10 steps to Finish 20, 10 misses to fall off at 0).
 *   Optional S1/S2 Handicap mode: Seat 0 starts at 10, Seat 1 starts at 8.
 * - On your turn, inspect the NEXT picture card immediately ahead (Slot pos + 1) on your belt,
 *   then flip 1 tile (A–P) on the shared 4x4 wall (publicly visible for 2.1s):
 *   • MATCH: Advance +1 slot (+combo streak) and KEEP YOUR TURN! Reach Slot 20 = INSTANT WIN!
 *   • MISS: Conveyor belt shifts backward (-1 slot) and turn ends! Fall to Slot 0 = INSTANT LOSS!
 */

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
export const BELT_LENGTH = 20;
export const REVEAL_DURATION_MS = 2000;

export const EMBLEMS = [
  { id: 'crown', zh: '王冠', en: 'Crown', color: '#f59e0b' },
  { id: 'garnet', zh: '石榴石', en: 'Garnet', color: '#ff2e54' },
  { id: 'hourglass', zh: '沙漏', en: 'Hourglass', color: '#e4b95b' },
  { id: 'scales', zh: '天平', en: 'Scales', color: '#38bdf8' },
  { id: 'raven', zh: '渡鸦', en: 'Raven', color: '#a78bfa' },
  { id: 'diamond', zh: '钻石', en: 'Diamond', color: '#22d3ee' },
  { id: 'key', zh: '金钥', en: 'Key', color: '#fbbf24' },
  { id: 'lotus', zh: '莲花', en: 'Lotus', color: '#f472b6' },
  { id: 'sun', zh: '烈日', en: 'Sun', color: '#fb923c' },
  { id: 'moon', zh: '弯月', en: 'Moon', color: '#93c5fd' },
  { id: 'compass', zh: '罗盘', en: 'Compass', color: '#34d399' },
  { id: 'shield', zh: '盾牌', en: 'Shield', color: '#60a5fa' },
  { id: 'flame', zh: '圣火', en: 'Flame', color: '#f97316' },
  { id: 'eye', zh: '全视眼', en: 'Eye', color: '#c084fc' },
  { id: 'bolt', zh: '雷电', en: 'Bolt', color: '#facc15' },
  { id: 'anchor', zh: '铁锚', en: 'Anchor', color: '#2dd4bf' },
];

function shuffle(arr, rng) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates a 20-slot conveyor belt from a shuffled 48-card (3x16) pool,
 * ensuring no two consecutive slots have the same emblem for crisp gameplay.
 */
function generateBelt(rng) {
  const pool = [];
  for (let rep = 0; rep < 3; rep++) {
    for (const emb of EMBLEMS) pool.push(emb.id);
  }
  const deck = shuffle(pool, rng);
  const belt = [];
  for (let i = 0; i < BELT_LENGTH; i++) {
    let pickIdx = 0;
    if (belt.length > 0) {
      const prev = belt[belt.length - 1];
      const alt = deck.findIndex((id) => id !== prev);
      if (alt >= 0) pickIdx = alt;
    }
    belt.push(deck.splice(pickIdx, 1)[0]);
  }
  return belt; // indices 0..19 correspond to Slots 1..20
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || seatId;
}

function getCurrentTargetIcon(player) {
  // Player stands at `pos` (1..19); next picture to match is Slot `pos + 1` (0-indexed: `pos`)
  const targetIdx = Math.min(BELT_LENGTH - 1, Math.max(0, player.pos));
  return player.belt[targetIdx];
}

function recordFlipForBots(state, tileIdx, iconId, rng) {
  for (const seatId of state.seatOrder) {
    const p = state.players[seatId];
    if (!p.isBot) continue;
    const mem = state.botMemory[seatId];
    if (!mem) continue;
    const diff = p.difficulty || state.difficulty || 'genius';

    if (diff === 'easy') {
      // Easy bot remembers only the last 4–5 revealed tiles
      mem.order = mem.order.filter((idx) => idx !== tileIdx);
      mem.order.push(tileIdx);
      mem.known[tileIdx] = iconId;
      while (mem.order.length > 5) {
        const dropped = mem.order.shift();
        delete mem.known[dropped];
      }
    } else if (diff === 'genius') {
      if (rng() <= 0.88) {
        mem.known[tileIdx] = iconId;
      }
    } else {
      // grand_final: near-perfect 98% memory
      if (rng() <= 0.98) {
        mem.known[tileIdx] = iconId;
      }
    }
  }
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opts = ctx.options || {};
    const handicap = Boolean(opts.handicapMode);

    const boardIcons = shuffle(
      EMBLEMS.map((e) => e.id),
      rng
    );

    const s0 = seats[0];
    const s1 = seats[1];
    const seatOrder = [s0.seatId, s1.seatId];
    const firstIdx = rng() < 0.5 ? 0 : 1;

    const players = {
      [s0.seatId]: {
        seatId: s0.seatId,
        name: s0.name,
        avatar: s0.avatar,
        isBot: Boolean(s0.isBot),
        difficulty: s0.difficulty || diff,
        color: 'cyan',
        pos: 10, // Standing on Slot 10 (1..20)
        startPos: 10,
        belt: generateBelt(rng),
        streak: 0,
        bestStreak: 0,
        matches: 0,
        misses: 0,
      },
      [s1.seatId]: {
        seatId: s1.seatId,
        name: s1.name,
        avatar: s1.avatar,
        isBot: Boolean(s1.isBot),
        difficulty: s1.difficulty || diff,
        color: 'garnet',
        pos: handicap ? 8 : 10,
        startPos: handicap ? 8 : 10,
        belt: generateBelt(rng),
        streak: 0,
        bestStreak: 0,
        matches: 0,
        misses: 0,
      },
    };

    const botMemory = {};
    for (const s of seats) {
      botMemory[s.seatId] = { known: {}, order: [] };
    }

    return {
      phase: 'PICK_TILE', // 'PICK_TILE' | 'TILE_REVEAL' | 'ENDED'
      round: 1,
      flipCount: 0,
      phaseLabel: { zh: '翻板配对', en: 'Select a Tile (A–P)' },
      difficulty: diff,
      options: opts,
      seatOrder,
      players,
      currentTurnSeatId: seatOrder[firstIdx],
      boardIcons, // Host-only 16 shuffled emblem IDs (STRICTLY hidden in projectState!)
      activeReveal: null, // { tileIdx, letter, iconId, targetIconId, matched, seatId, streakAfter }
      seenIndices: [], // Track how many distinct tiles have ever been flipped (count stat only)
      botMemory, // Host-only AI memory
      winnerSeatId: null,
      winReason: null, // 'finish' | 'abyss'
      history: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ENDED') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };

    if (action.type === 'CONTINUE_REVEAL') {
      if (fullState.phase !== 'TILE_REVEAL') {
        return { ok: false, reason: 'Not in reveal phase' };
      }
      return { ok: true };
    }

    if (action.type === 'FLIP_TILE') {
      if (fullState.phase !== 'PICK_TILE') {
        return { ok: false, reason: 'Wait for current tile to close' };
      }
      if (fullState.currentTurnSeatId !== seatId) {
        return { ok: false, reason: 'Not your turn' };
      }
      const idx = Number(action.payload?.tileIdx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= 16) {
        return { ok: false, reason: 'Invalid tile index' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const rng = ctx.rng;
    const events = [];

    if (action.type === 'CONTINUE_REVEAL') {
      return this._resolveReveal(next);
    }

    if (action.type === 'FLIP_TILE') {
      const tileIdx = Number(action.payload.tileIdx);
      const player = next.players[seatId];
      const iconId = next.boardIcons[tileIdx];
      const targetIconId = getCurrentTargetIcon(player);
      const matched = iconId === targetIconId;

      next.flipCount += 1;
      if (!next.seenIndices.includes(tileIdx)) {
        next.seenIndices.push(tileIdx);
      }

      // Both players observe this flip publicly
      recordFlipForBots(next, tileIdx, iconId, rng);

      next.phase = 'TILE_REVEAL';
      next.activeReveal = {
        tileIdx,
        letter: LETTERS[tileIdx],
        iconId,
        targetIconId,
        matched,
        seatId,
        streakAfter: matched ? player.streak + 1 : 0,
      };
      next.phaseLabel = matched
        ? { zh: '配对成功！连击前进', en: 'MATCH! Combo Advance' }
        : { zh: '配对失败！传送带倒退', en: 'MISS! Belt Slides Back' };

      events.push({
        type: matched ? 'TILE_MATCH' : 'TILE_MISS',
        seatId,
        tileIdx,
        letter: LETTERS[tileIdx],
        iconId,
        streak: matched ? player.streak + 1 : 0,
      });
      return { state: next, events };
    }

    return { state: next, events };
  },

  _resolveReveal(next) {
    const rev = next.activeReveal;
    if (!rev) {
      next.phase = 'PICK_TILE';
      return { state: next, events: [] };
    }

    const player = next.players[rev.seatId];
    const events = [];

    if (rev.matched) {
      player.pos += 1;
      player.matches += 1;
      player.streak += 1;
      if (player.streak > player.bestStreak) player.bestStreak = player.streak;

      next.history.push({
        flip: next.flipCount,
        seatId: rev.seatId,
        letter: rev.letter,
        matched: true,
        pos: player.pos,
        streak: player.streak,
      });
      if (next.history.length > 24) next.history.shift();

      if (player.pos >= BELT_LENGTH) {
        next.phase = 'ENDED';
        next.winnerSeatId = rev.seatId;
        next.winReason = 'finish';
        next.phaseLabel = { zh: '冲过终点！', en: 'Finish Line Reached!' };
        events.push({ type: 'FINISH_WIN', seatId: rev.seatId });
        return { state: next, events };
      }

      // Combo continues — same player keeps turn!
      next.activeReveal = null;
      next.phase = 'PICK_TILE';
      next.phaseLabel = {
        zh: `${player.streak} 连击！继续翻板`,
        en: `${player.streak}x COMBO! Go Again`,
      };
      events.push({ type: 'COMBO_CONTINUE', seatId: rev.seatId, streak: player.streak });
      return { state: next, events };
    }

    // MISS: conveyor belt shifts backward by 1 slot!
    player.pos -= 1;
    player.misses += 1;
    player.streak = 0;

    next.history.push({
      flip: next.flipCount,
      seatId: rev.seatId,
      letter: rev.letter,
      matched: false,
      pos: player.pos,
      streak: 0,
    });
    if (next.history.length > 24) next.history.shift();

    if (player.pos <= 0) {
      const winnerId = getOtherSeatId(next, rev.seatId);
      next.phase = 'ENDED';
      next.winnerSeatId = winnerId;
      next.winReason = 'abyss';
      next.phaseLabel = { zh: '跌落传送带！淘汰', en: 'Fell Off Belt! Eliminated' };
      events.push({ type: 'ABYSS_LOSS', loserSeatId: rev.seatId, winnerSeatId: winnerId });
      return { state: next, events };
    }

    // Pass turn to opponent
    next.activeReveal = null;
    next.phase = 'PICK_TILE';
    next.currentTurnSeatId = getOtherSeatId(next, rev.seatId);
    next.round += 1;
    next.phaseLabel = { zh: '翻板配对', en: 'Select a Tile (A–P)' };
    events.push({ type: 'TURN_SWITCH', nextSeatId: next.currentTurnSeatId });
    return { state: next, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState) return null;
    if (fullState.phase === 'TILE_REVEAL') {
      return {
        phaseKey: `reveal-${fullState.flipCount}`,
        durationMs: REVEAL_DURATION_MS,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState) {
    if (!fullState || fullState.phase !== 'TILE_REVEAL') return null;
    const next = cloneState(fullState);
    return this._resolveReveal(next);
  },

  projectState(fullState, _viewerSeatId) {
    if (!fullState) return null;
    const isEnded = fullState.phase === 'ENDED';
    const revIdx = fullState.activeReveal?.tileIdx ?? -1;

    // STRICTLY sanitize unrevealed tiles on the 4x4 board
    const tiles = LETTERS.map((letter, idx) => {
      const open = isEnded || idx === revIdx;
      return {
        idx,
        letter,
        revealed: open,
        iconId: open ? fullState.boardIcons[idx] : null,
      };
    });

    const projectedPlayers = {};
    for (const sid of fullState.seatOrder) {
      const p = fullState.players[sid];
      projectedPlayers[sid] = {
        ...p,
        targetIconId: getCurrentTargetIcon(p),
      };
    }

    return {
      phase: fullState.phase,
      round: fullState.round,
      flipCount: fullState.flipCount,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      players: projectedPlayers,
      currentTurnSeatId: fullState.currentTurnSeatId,
      tiles,
      activeReveal: fullState.activeReveal,
      discoveredCount: fullState.seenIndices.length,
      winnerSeatId: fullState.winnerSeatId,
      winReason: fullState.winReason,
      history: fullState.history,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase !== 'PICK_TILE') return null;
    if (fullState.currentTurnSeatId !== botSeatId) return null;

    const rng = ctx.rng;
    const bot = fullState.players[botSeatId];
    const diff = ctx.difficulty || bot.difficulty || 'genius';
    const targetIcon = getCurrentTargetIcon(bot);
    const mem = fullState.botMemory[botSeatId] || { known: {} };

    // Check if bot remembers exact tile for targetIcon
    for (const [idxStr, icon] of Object.entries(mem.known)) {
      if (icon === targetIcon) {
        // Easy AI occasionally mis-remembers even among known tiles
        if (diff === 'easy' && rng() < 0.16) break;
        return { type: 'FLIP_TILE', payload: { tileIdx: Number(idxStr) } };
      }
    }

    // Target is unknown -> pick from tiles NOT known to hold another icon
    const unknownTiles = [];
    for (let i = 0; i < 16; i++) {
      if (!mem.known[i]) unknownTiles.push(i);
    }

    if (unknownTiles.length > 0) {
      // Genius & Grand Final strictly probe unknown tiles to map the board faster
      if (diff === 'grand_final' || diff === 'genius') {
        const pick = unknownTiles[Math.floor(rng() * unknownTiles.length)];
        return { type: 'FLIP_TILE', payload: { tileIdx: pick } };
      }
      // Easy mostly picks unknown but sometimes re-clicks known tiles
      if (rng() < 0.72) {
        const pick = unknownTiles[Math.floor(rng() * unknownTiles.length)];
        return { type: 'FLIP_TILE', payload: { tileIdx: pick } };
      }
    }

    // Fallback random tile
    return { type: 'FLIP_TILE', payload: { tileIdx: Math.floor(rng() * 16) } };
  },

  getResult(state) {
    if (!state || state.phase !== 'ENDED' || !state.winnerSeatId) return null;
    const winner = state.players[state.winnerSeatId];
    const loserId = state.seatOrder.find((id) => id !== state.winnerSeatId);
    const loser = state.players[loserId];

    const zhReason =
      state.winReason === 'abyss'
        ? `${loser.name} 跌落传送带深渊！${winner.name} 赢得寻找相同图片死亡对决！`
        : `${winner.name} 凭借最高 ${winner.bestStreak} 连击率先冲过第 20 格终点线！`;
    const enReason =
      state.winReason === 'abyss'
        ? `${loser.name} fell off the conveyor belt abyss! ${winner.name} survives the Death Match!`
        : `${winner.name} surged to Finish Slot 20 with a ${winner.bestStreak}x max combo streak!`;

    return {
      winnerSeatIds: [state.winnerSeatId],
      rankings: [
        {
          seatId: winner.seatId,
          label: `${winner.name} (Slot ${winner.pos}/20 · Max ${winner.bestStreak}x)`,
          score: winner.pos,
        },
        {
          seatId: loser.seatId,
          label: `${loser.name} (Slot ${loser.pos}/20 · Max ${loser.bestStreak}x)`,
          score: loser.pos,
        },
      ],
      summary: { zh: zhReason, en: enReason },
    };
  },
};
