/**
 * Prison Match 2: Russian Roulette (俄罗斯轮盘 / 러시안 룰렛)
 * Pure deterministic state machine, secret projection, and calculating AI.
 *
 * Exact Show Rules (Day 2 PM2, Ep 4-5):
 * - 6 chambers (default 6p), 2 live bullets, 16 hidden Credits per player.
 *   (Scales cleanly for 3-5p: 5p=5ch/2b/3z, 4p=4ch/1b/2z, 3p=6ch/1b/2z.)
 * - 5 actions:
 *   1. Public Peek (1 Credit): reveal 2 adjacent chambers publicly.
 *   2. Private Peek (2 Credits): reveal 2 adjacent chambers privately.
 *   3. Rotate +1 (3 Credits): rotate cylinder clockwise 1 slot.
 *   4. Rotate +2 (4 Credits): rotate cylinder clockwise 2 slots.
 *   5. Secret Crowd-Funded Manipulate (1-3 Credits): secretly contribute to 6-Credit pool;
 *      whoever pushes total >= 6 immediately swaps any 2 adjacent chambers secretly (overflow cleared).
 * - Triggers clockwise sequential firing as soon as triggerZeroCount (3 in 5-6p, 2 in 3-4p) players hit 0 Credits!
 */

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getSetupSpec(playerCount) {
  if (playerCount >= 6) return { numChambers: 6, numBullets: 2, triggerZeroCount: 3 };
  if (playerCount === 5) return { numChambers: 5, numBullets: 2, triggerZeroCount: 3 };
  if (playerCount === 4) return { numChambers: 4, numBullets: 1, triggerZeroCount: 2 };
  return { numChambers: 6, numBullets: 1, triggerZeroCount: 2 };
}

function seatIndexForSlot(slot, numPlayers) {
  return slot % numPlayers;
}

function ownedSlotsForSeat(seatIndex, numChambers, numPlayers) {
  const slots = [];
  for (let s = 0; s < numChambers; s++) {
    if (s % numPlayers === seatIndex) slots.push(s);
  }
  return slots;
}

function countZeroCredits(players) {
  return players.filter((p) => p.credits <= 0).length;
}

function findNextActiveTurnIndex(players, fromIndex) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (players[idx].credits > 0) return idx;
  }
  return -1;
}

function markKnowledgeStaleExcept(state, exemptSeatId) {
  for (const k of Object.keys(state.publicIntel)) {
    state.publicIntel[k].stale = true;
  }
  for (const [sid, map] of Object.entries(state.privateIntel)) {
    if (sid === exemptSeatId) continue;
    for (const k of Object.keys(map)) {
      map[k].stale = true;
    }
  }
}

function startFiringPhase(state, events) {
  state.phase = 'firing';
  state.manipulatorSeatId = null;
  state.currentTurnSeatId = null;
  state.firingStartPos = 0;
  state.firingStep = 0;
  state.firedShots = [];
  state.history.push({
    type: 'FIRING_TRIGGERED',
    zh: `⚡ ${state.triggerZeroCount} 名玩家点数归零！行动结束，开始顺时针连发处决！`,
    en: `⚡ ${state.triggerZeroCount} players hit 0 Credits! Action phase ends — clockwise firing begins!`,
    tone: 'alert',
  });
  events.push({ type: 'FIRING_TRIGGERED' });
}

function advanceTurnOrFire(state, events) {
  const zeros = countZeroCredits(state.players);
  if (zeros >= state.triggerZeroCount) {
    startFiringPhase(state, events);
    return;
  }

  // Advance clockwise, logging auto-passes for 0-credit players
  const n = state.players.length;
  let nextIdx = -1;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    if (state.players[idx].credits > 0) {
      nextIdx = idx;
      break;
    } else {
      state.history.push({
        type: 'AUTO_PASS',
        seatId: state.players[idx].seatId,
        zh: `${state.players[idx].name} 点数为 0，自动 Pass。`,
        en: `${state.players[idx].name} has 0 Credits — auto Pass.`,
        tone: 'normal',
      });
    }
  }

  if (nextIdx === -1) {
    startFiringPhase(state, events);
    return;
  }

  state.currentTurnIndex = nextIdx;
  state.currentTurnSeatId = state.players[nextIdx].seatId;
  state.turnNumber += 1;
}

function resolveNextShot(state, events) {
  const C = state.numChambers;
  if (state.firingStep >= C) {
    state.phase = 'ended';
    events.push({ type: 'MATCH_END' });
    return;
  }

  const pos = (state.firingStartPos + state.firingStep) % C;
  const chamber = state.chambers[pos];
  const targetIdx = seatIndexForSlot(pos, state.players.length);
  const target = state.players[targetIdx];
  const isLive = Boolean(chamber.hasBullet);

  if (isLive) {
    target.eliminated = true;
  }

  const shot = {
    step: state.firingStep,
    pos,
    chamberId: chamber.id,
    seatId: target.seatId,
    playerName: target.name,
    isLive,
  };
  state.firedShots.push(shot);
  state.firingStep += 1;

  state.history.push({
    type: isLive ? 'SHOT_LIVE' : 'SHOT_BLANK',
    seatId: target.seatId,
    zh: isLive
      ? `💥 弹仓 #${pos + 1} 实弹击发！${target.name} 中弹淘汰！`
      : `💨 弹仓 #${pos + 1} 空包弹咔哒空击 — ${target.name} 惊险存活！`,
    en: isLive
      ? `💥 Chamber #${pos + 1} LIVE ROUND! ${target.name} is ELIMINATED!`
      : `💨 Chamber #${pos + 1} dry click (Blank) — ${target.name} survives!`,
    tone: isLive ? 'alert' : 'intel',
  });
  events.push({ type: isLive ? 'SHOT_LIVE' : 'SHOT_BLANK', shot });

  if (state.firingStep >= C) {
    state.phase = 'firing_done';
  }
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx?.rng || Math.random;
    const opts = ctx?.options || {};
    const { numChambers, numBullets, triggerZeroCount } = getSetupSpec(seats.length);
    const startingCredits = 16;

    // Place live bullets randomly across chambers
    const indices = Array.from({ length: numChambers }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const bulletSet = new Set(indices.slice(0, numBullets));

    const chambers = Array.from({ length: numChambers }, (_, i) => ({
      id: i,
      hasBullet: bulletSet.has(i),
    }));

    const players = seats.map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar || '◆',
      isBot: Boolean(s.isBot),
      seatIndex: idx,
      credits: startingCredits,
      eliminated: false,
      totalSpentManipulate: 0,
    }));

    const privateIntel = {};
    for (const p of players) {
      privateIntel[p.seatId] = {};
    }

    return {
      phase: 'action', // 'action' | 'manipulate_swap' | 'firing' | 'firing_done' | 'ended'
      numChambers,
      numBullets,
      triggerZeroCount,
      startingCredits,
      fastMode: Boolean(opts.fastMode),
      turnNumber: 1,
      currentTurnIndex: 0,
      currentTurnSeatId: players[0].seatId,
      manipulatorSeatId: null,
      visualRotationSteps: 0,
      chambers,
      players,
      publicIntel: {}, // { [chamberId]: { isLive, stale, turn } }
      privateIntel, // { [seatId]: { [chamberId]: { isLive, stale, turn } } }
      manipulatePool: 0,
      manipulateDepositsSinceTrigger: 0,
      manipulateTriggerCount: 0,
      manipulateLedger: [], // { seatId, playerName, amount, turn } — hidden until ended
      swapHistory: [], // { seatId, playerName, posA, posB, turn } — hidden until ended
      firingStartPos: 0,
      firingStep: 0,
      firedShots: [],
      lastActionSummary: null,
      lastScanHighlight: null, // { type: 'public'|'private'|'swap', viewerOnlySeatId: string|null, positions: [a,b], turn }
      history: [
        {
          type: 'START',
          zh: `左轮装填完毕：${numChambers} 弹仓、${numBullets} 枚实弹。每人 16 秘密点数，满 ${triggerZeroCount} 人归零即刻开枪！`,
          en: `Cylinder loaded: ${numChambers} chambers, ${numBullets} live bullet(s). 16 secret Credits each — firing triggers when ${triggerZeroCount} players hit 0!`,
          tone: 'intel',
        },
      ],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };

    if (fullState.phase === 'firing' || fullState.phase === 'firing_done') {
      if (action.type === 'ADVANCE_FIRE') return { ok: true };
      return { ok: false, reason: 'Firing sequence in progress' };
    }

    if (fullState.phase === 'ended') {
      return { ok: false, reason: 'Match already ended' };
    }

    if (fullState.phase === 'manipulate_swap') {
      if (seatId !== fullState.manipulatorSeatId) {
        return { ok: false, reason: 'Waiting for manipulator to swap chambers' };
      }
      if (action.type !== 'MANIPULATE_SWAP') {
        return { ok: false, reason: 'Must select an adjacent pair to swap' };
      }
      const pairIndex = Number(action.payload?.pairIndex);
      if (!Number.isInteger(pairIndex) || pairIndex < 0 || pairIndex >= fullState.numChambers) {
        return { ok: false, reason: 'Invalid chamber pair' };
      }
      return { ok: true };
    }

    // phase === 'action'
    if (seatId !== fullState.currentTurnSeatId) {
      return { ok: false, reason: 'Not your turn' };
    }

    const player = fullState.players.find((p) => p.seatId === seatId);
    if (!player || player.credits <= 0) {
      return { ok: false, reason: 'No Credits remaining' };
    }

    const C = fullState.numChambers;
    const { type, payload = {} } = action;

    if (type === 'PUBLIC_PEEK') {
      if (player.credits < 1) return { ok: false, reason: 'Need 1 Credit' };
      const pairIndex = Number(payload.pairIndex);
      if (!Number.isInteger(pairIndex) || pairIndex < 0 || pairIndex >= C) {
        return { ok: false, reason: 'Select 2 adjacent chambers' };
      }
      return { ok: true };
    }

    if (type === 'PRIVATE_PEEK') {
      if (player.credits < 2) return { ok: false, reason: 'Need 2 Credits' };
      const pairIndex = Number(payload.pairIndex);
      if (!Number.isInteger(pairIndex) || pairIndex < 0 || pairIndex >= C) {
        return { ok: false, reason: 'Select 2 adjacent chambers' };
      }
      return { ok: true };
    }

    if (type === 'ROTATE_1') {
      if (player.credits < 3) return { ok: false, reason: 'Need 3 Credits' };
      return { ok: true };
    }

    if (type === 'ROTATE_2') {
      if (player.credits < 4) return { ok: false, reason: 'Need 4 Credits' };
      return { ok: true };
    }

    if (type === 'MANIPULATE_CONTRIBUTE') {
      const amount = Number(payload.amount);
      if (![1, 2, 3].includes(amount)) {
        return { ok: false, reason: 'Manipulate contribution must be 1, 2, or 3 Credits' };
      }
      if (player.credits < amount) {
        return { ok: false, reason: 'Insufficient Credits' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action type' };
  },

  applyAction(fullState, seatId, action) {
    const state = cloneState(fullState);
    const events = [];

    if (action.type === 'ADVANCE_FIRE') {
      if (state.phase === 'firing') {
        resolveNextShot(state, events);
      } else if (state.phase === 'firing_done') {
        state.phase = 'ended';
        events.push({ type: 'MATCH_END' });
      }
      return { state, events };
    }

    const player = state.players.find((p) => p.seatId === seatId);
    const C = state.numChambers;

    if (action.type === 'MANIPULATE_SWAP') {
      const posA = Number(action.payload.pairIndex);
      const posB = (posA + 1) % C;
      const chA = state.chambers[posA];
      const chB = state.chambers[posB];

      // Swap bullets physically between the two adjacent chambers
      const tmp = chA.hasBullet;
      chA.hasBullet = chB.hasBullet;
      chB.hasBullet = tmp;

      // Mark other players' & public intel stale
      markKnowledgeStaleExcept(state, seatId);

      // Update manipulator's own private intel cleanly (merge any known public+private before swap)
      const myMap = state.privateIntel[seatId] || {};
      const knownA = myMap[chA.id] || state.publicIntel[chA.id] || null;
      const knownB = myMap[chB.id] || state.publicIntel[chB.id] || null;
      const nextMap = { ...myMap };
      if (knownB) {
        nextMap[chA.id] = { isLive: knownB.isLive, stale: Boolean(knownB.stale), turn: state.turnNumber };
      } else {
        delete nextMap[chA.id];
      }
      if (knownA) {
        nextMap[chB.id] = { isLive: knownA.isLive, stale: Boolean(knownA.stale), turn: state.turnNumber };
      } else {
        delete nextMap[chB.id];
      }
      state.privateIntel[seatId] = nextMap;

      state.swapHistory.push({
        seatId,
        playerName: player.name,
        posA,
        posB,
        turn: state.turnNumber,
      });

      state.lastScanHighlight = {
        type: 'swap',
        viewerOnlySeatId: seatId,
        positions: [posA, posB],
        turn: state.turnNumber,
      };
      state.lastActionSummary = {
        zh: `⚡ ${player.name} 完成了秘密暗箱交换！（交换位置保密，旧查验情报可能已失效）`,
        en: `⚡ ${player.name} secretly swapped 2 adjacent chambers! (Positions hidden; prior intel marked unverified)`,
      };
      state.history.push({
        type: 'MANIPULATE_SWAPPED',
        seatId,
        zh: state.lastActionSummary.zh,
        en: state.lastActionSummary.en,
        tone: 'manipulate',
      });
      events.push({ type: 'MANIPULATE_SWAP', seatId });

      state.phase = 'action';
      state.manipulatorSeatId = null;
      advanceTurnOrFire(state, events);
      return { state, events };
    }

    // Standard turn actions
    const { type, payload = {} } = action;

    if (type === 'PUBLIC_PEEK') {
      player.credits -= 1;
      const posA = Number(payload.pairIndex);
      const posB = (posA + 1) % C;
      const chA = state.chambers[posA];
      const chB = state.chambers[posB];

      state.publicIntel[chA.id] = { isLive: chA.hasBullet, stale: false, turn: state.turnNumber };
      state.publicIntel[chB.id] = { isLive: chB.hasBullet, stale: false, turn: state.turnNumber };
      // Also refresh everyone's private intel if they had stale records on these exact chambers
      for (const sid of Object.keys(state.privateIntel)) {
        state.privateIntel[sid][chA.id] = { isLive: chA.hasBullet, stale: false, turn: state.turnNumber };
        state.privateIntel[sid][chB.id] = { isLive: chB.hasBullet, stale: false, turn: state.turnNumber };
      }

      const tagA = chA.hasBullet ? '🔴 实弹' : '⚪ 空弹';
      const tagB = chB.hasBullet ? '🔴 实弹' : '⚪ 空弹';
      const tagAEn = chA.hasBullet ? '🔴 LIVE' : '⚪ BLANK';
      const tagBEn = chB.hasBullet ? '🔴 LIVE' : '⚪ BLANK';

      state.lastScanHighlight = {
        type: 'public',
        viewerOnlySeatId: null,
        positions: [posA, posB],
        turn: state.turnNumber,
      };
      state.lastActionSummary = {
        zh: `${player.name} 公开调查 弹仓 #${posA + 1}(${tagA}) & #${posB + 1}(${tagB})`,
        en: `${player.name} Publicly Peeked #${posA + 1} (${tagAEn}) & #${posB + 1} (${tagBEn})`,
      };
      state.history.push({
        type: 'PUBLIC_PEEK',
        seatId,
        zh: state.lastActionSummary.zh,
        en: state.lastActionSummary.en,
        tone: 'intel',
      });
      events.push({ type: 'PUBLIC_PEEK', seatId, posA, posB });
    } else if (type === 'PRIVATE_PEEK') {
      player.credits -= 2;
      const posA = Number(payload.pairIndex);
      const posB = (posA + 1) % C;
      const chA = state.chambers[posA];
      const chB = state.chambers[posB];

      state.privateIntel[seatId][chA.id] = { isLive: chA.hasBullet, stale: false, turn: state.turnNumber };
      state.privateIntel[seatId][chB.id] = { isLive: chB.hasBullet, stale: false, turn: state.turnNumber };

      state.lastScanHighlight = {
        type: 'private',
        viewerOnlySeatId: seatId,
        positions: [posA, posB],
        turn: state.turnNumber,
      };
      state.lastActionSummary = {
        zh: `${player.name} 消耗 2 点进行了【私密调查】（目标与结果仅本人可见）`,
        en: `${player.name} spent 2 Credits on a Private Peek (targets & result hidden)`,
      };
      state.history.push({
        type: 'PRIVATE_PEEK',
        seatId,
        zh: state.lastActionSummary.zh,
        en: state.lastActionSummary.en,
        tone: 'normal',
      });
      events.push({ type: 'PRIVATE_PEEK', seatId });
    } else if (type === 'ROTATE_1' || type === 'ROTATE_2') {
      const steps = type === 'ROTATE_2' ? 2 : 1;
      const cost = steps === 2 ? 4 : 3;
      player.credits -= cost;

      const nextChambers = new Array(C);
      for (let slot = 0; slot < C; slot++) {
        nextChambers[(slot + steps) % C] = state.chambers[slot];
      }
      state.chambers = nextChambers;
      state.visualRotationSteps += steps;
      state.lastScanHighlight = null;

      state.lastActionSummary = {
        zh: `⚙️ ${player.name} 将左轮弹仓顺时针旋转了 +${steps} 格！`,
        en: `⚙️ ${player.name} rotated the cylinder +${steps} slot${steps > 1 ? 's' : ''} clockwise!`,
      };
      state.history.push({
        type,
        seatId,
        zh: state.lastActionSummary.zh,
        en: state.lastActionSummary.en,
        tone: 'intel',
      });
      events.push({ type, seatId, steps });
    } else if (type === 'MANIPULATE_CONTRIBUTE') {
      const amount = Number(payload.amount);
      player.credits -= amount;
      player.totalSpentManipulate += amount;
      state.manipulatePool += amount;
      state.manipulateDepositsSinceTrigger += 1;
      state.manipulateLedger.push({
        seatId,
        playerName: player.name,
        amount,
        turn: state.turnNumber,
      });
      state.lastScanHighlight = null;

      if (state.manipulatePool >= 6) {
        state.manipulatePool = 0;
        state.manipulateDepositsSinceTrigger = 0;
        state.manipulateTriggerCount += 1;
        state.phase = 'manipulate_swap';
        state.manipulatorSeatId = seatId;
        state.currentTurnSeatId = seatId;

        state.lastActionSummary = {
          zh: `🔥 暗箱操控池满 6 点触发！${player.name} 获得秘密互换相邻弹仓权限！`,
          en: `🔥 Manipulate Pool reached 6 Credits! ${player.name} seizes the secret swap key!`,
        };
        state.history.push({
          type: 'MANIPULATE_TRIGGERED',
          seatId,
          zh: state.lastActionSummary.zh,
          en: state.lastActionSummary.en,
          tone: 'manipulate',
        });
        events.push({ type: 'MANIPULATE_TRIGGERED', seatId });
        return { state, events };
      } else {
        state.lastActionSummary = {
          zh: `🕶️ ${player.name} 向暗箱操控池秘密投入了点数（金额保密）`,
          en: `🕶️ ${player.name} secretly funded the Manipulate Pool (amount hidden)`,
        };
        state.history.push({
          type: 'MANIPULATE_CONTRIBUTE',
          seatId,
          zh: state.lastActionSummary.zh,
          en: state.lastActionSummary.en,
          tone: 'manipulate',
        });
        events.push({ type: 'MANIPULATE_CONTRIBUTE', seatId });
      }
    }

    if (player.credits === 0) {
      state.history.push({
        type: 'HIT_ZERO',
        seatId,
        zh: `⚠️ ${player.name} 点数已归零！（当前归零人数：${countZeroCredits(state.players)}/${state.triggerZeroCount}）`,
        en: `⚠️ ${player.name} hit 0 Credits! (${countZeroCredits(state.players)}/${state.triggerZeroCount} zero)`,
        tone: 'alert',
      });
    }

    advanceTurnOrFire(state, events);
    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'firing') {
      return { phaseKey: `firing-${fullState.firingStep}`, durationMs: 1650 };
    }
    if (fullState.phase === 'firing_done') {
      return { phaseKey: 'firing-done', durationMs: 1800 };
    }
    if (fullState.phase === 'manipulate_swap') {
      return {
        phaseKey: `swap-${fullState.turnNumber}-${fullState.manipulateTriggerCount}`,
        durationMs: fullState.fastMode ? 20000 : 35000,
      };
    }
    if (fullState.phase === 'action') {
      return {
        phaseKey: `turn-${fullState.turnNumber}-${fullState.currentTurnSeatId}`,
        durationMs: fullState.fastMode ? 25000 : 45000,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (fullState.phase === 'firing' || fullState.phase === 'firing_done') {
      return this.applyAction(fullState, null, { type: 'ADVANCE_FIRE' }, ctx);
    }
    if (fullState.phase === 'manipulate_swap') {
      const pairIndex = Math.floor((ctx?.rng || Math.random)() * fullState.numChambers);
      return this.applyAction(fullState, fullState.manipulatorSeatId, {
        type: 'MANIPULATE_SWAP',
        payload: { pairIndex },
      });
    }
    if (fullState.phase === 'action') {
      const seatId = fullState.currentTurnSeatId;
      const fallback = this.computeBotAction(fullState, seatId, ctx) || {
        type: 'PUBLIC_PEEK',
        payload: { pairIndex: 0 },
      };
      return this.applyAction(fullState, seatId, fallback, ctx);
    }
    return null;
  },

  projectState(fullState, viewerSeatId) {
    const isEnded = fullState.phase === 'ended';
    const isFiringOrEnded = fullState.phase === 'firing' || fullState.phase === 'firing_done' || isEnded;
    const firedByPos = {};
    for (const sh of fullState.firedShots) {
      firedByPos[sh.pos] = sh;
    }

    const viewerPrivate = (viewerSeatId && fullState.privateIntel[viewerSeatId]) || {};

    const chambers = fullState.chambers.map((ch, pos) => {
      const firedShot = firedByPos[pos] || null;
      const pub = fullState.publicIntel[ch.id] || null;
      const priv = viewerPrivate[ch.id] || null;

      // Choose best intel visible to this viewer
      let intel = null;
      if (isEnded) {
        intel = { isLive: ch.hasBullet, source: 'declassified', stale: false };
      } else if (firedShot) {
        intel = { isLive: firedShot.isLive, source: 'fired', stale: false };
      } else if (priv && (!pub || priv.turn >= pub.turn || (!priv.stale && pub.stale))) {
        intel = { isLive: priv.isLive, source: 'private', stale: Boolean(priv.stale) };
      } else if (pub) {
        intel = { isLive: pub.isLive, source: 'public', stale: Boolean(pub.stale) };
      }

      return {
        id: ch.id,
        pos,
        ownerSeatId: fullState.players[seatIndexForSlot(pos, fullState.players.length)].seatId,
        fired: Boolean(firedShot),
        firedIsLive: firedShot ? firedShot.isLive : null,
        intel,
      };
    });

    const players = fullState.players.map((p) => {
      const revealCredits = isEnded || p.seatId === viewerSeatId;
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        seatIndex: p.seatIndex,
        credits: revealCredits ? p.credits : null,
        isZero: p.credits <= 0,
        eliminated: p.eliminated,
        totalSpentManipulate: isEnded ? p.totalSpentManipulate : null,
      };
    });

    // Only expose scan highlight if public or belongs to viewerSeatId
    let scanHighlight = null;
    if (fullState.lastScanHighlight) {
      const h = fullState.lastScanHighlight;
      if (!h.viewerOnlySeatId || h.viewerOnlySeatId === viewerSeatId || isEnded) {
        scanHighlight = { type: h.type, positions: h.positions, turn: h.turn };
      }
    }

    return {
      phase: fullState.phase,
      numChambers: fullState.numChambers,
      numBullets: fullState.numBullets,
      triggerZeroCount: fullState.triggerZeroCount,
      zeroCreditCount: countZeroCredits(fullState.players),
      startingCredits: fullState.startingCredits,
      turnNumber: fullState.turnNumber,
      currentTurnSeatId: fullState.currentTurnSeatId,
      manipulatorSeatId: fullState.manipulatorSeatId,
      visualRotationSteps: fullState.visualRotationSteps,
      chambers,
      players,
      manipulateDepositsSinceTrigger: fullState.manipulateDepositsSinceTrigger,
      manipulateTriggerCount: fullState.manipulateTriggerCount,
      manipulatePool: isEnded ? fullState.manipulatePool : null,
      manipulateLedger: isEnded ? fullState.manipulateLedger : null,
      swapHistory: isEnded ? fullState.swapHistory : null,
      firingStartPos: fullState.firingStartPos,
      firingStep: fullState.firingStep,
      firedShots: fullState.firedShots,
      lastActionSummary: fullState.lastActionSummary,
      scanHighlight,
      history: fullState.history.slice(-18),
      isFiringOrEnded,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    const rng = ctx?.rng || Math.random;
    const C = fullState.numChambers;
    const N = fullState.players.length;

    if (fullState.phase === 'manipulate_swap') {
      if (fullState.manipulatorSeatId !== botSeatId) return null;
      const bot = fullState.players.find((p) => p.seatId === botSeatId);
      const mySlots = ownedSlotsForSeat(bot.seatIndex, C, N);
      const myIntel = fullState.privateIntel[botSeatId] || {};

      const knownAt = (slot) => {
        const ch = fullState.chambers[slot];
        const priv = myIntel[ch.id];
        const pub = fullState.publicIntel[ch.id];
        if (priv && !priv.stale) return priv.isLive;
        if (pub && !pub.stale) return pub.isLive;
        return null;
      };

      // Priority 1: If a known LIVE bullet is facing me, swap it with an adjacent non-mine slot (ideally known blank)
      for (const mySlot of mySlots) {
        if (knownAt(mySlot) === true) {
          const leftPair = (mySlot - 1 + C) % C;
          const rightPair = mySlot;
          const leftNeighbor = (mySlot - 1 + C) % C;
          const rightNeighbor = (mySlot + 1) % C;
          if (knownAt(rightNeighbor) === false && !mySlots.includes(rightNeighbor)) {
            return { type: 'MANIPULATE_SWAP', payload: { pairIndex: rightPair } };
          }
          if (knownAt(leftNeighbor) === false && !mySlots.includes(leftNeighbor)) {
            return { type: 'MANIPULATE_SWAP', payload: { pairIndex: leftPair } };
          }
          return { type: 'MANIPULATE_SWAP', payload: { pairIndex: rng() < 0.5 ? rightPair : leftPair } };
        }
      }

      // Priority 2: Confuse opponents by swapping two adjacent slots that do NOT put a known live bullet on me
      const safePairs = [];
      for (let p = 0; p < C; p++) {
        const q = (p + 1) % C;
        const pMine = mySlots.includes(p);
        const qMine = mySlots.includes(q);
        if (pMine && knownAt(q) === true) continue;
        if (qMine && knownAt(p) === true) continue;
        if ((pMine && knownAt(p) === false && knownAt(q) !== false) || (qMine && knownAt(q) === false && knownAt(p) !== false)) {
          continue;
        }
        safePairs.push(p);
      }
      const chosen = safePairs.length
        ? safePairs[Math.floor(rng() * safePairs.length)]
        : Math.floor(rng() * C);
      return { type: 'MANIPULATE_SWAP', payload: { pairIndex: chosen } };
    }

    if (fullState.phase !== 'action' || fullState.currentTurnSeatId !== botSeatId) {
      return null;
    }

    const bot = fullState.players.find((p) => p.seatId === botSeatId);
    if (!bot || bot.credits <= 0) return null;

    const mySlots = ownedSlotsForSeat(bot.seatIndex, C, N);
    const myIntel = fullState.privateIntel[botSeatId] || {};
    const zerosNow = countZeroCredits(fullState.players);
    const oneAwayFromFiring = zerosNow === fullState.triggerZeroCount - 1;

    const knownAt = (slot) => {
      const ch = fullState.chambers[slot];
      const priv = myIntel[ch.id];
      const pub = fullState.publicIntel[ch.id];
      if (priv && !priv.stale) return priv.isLive;
      if (pub && !pub.stale) return pub.isLive;
      return null;
    };

    const myFacingLive = mySlots.some((s) => knownAt(s) === true);
    const myFacingAllBlank = mySlots.every((s) => knownAt(s) === false);
    const myUnknownSlot = mySlots.find((s) => knownAt(s) === null);

    // Helper: evaluate if rotating +steps leaves me safe
    const evalRotate = (steps) => {
      let score = 0;
      for (const mySlot of mySlots) {
        const incomingSlot = (mySlot - steps + C) % C;
        const val = knownAt(incomingSlot);
        if (val === false) score += 5;
        else if (val === true) score -= 20;
        else score += 1;
      }
      return score;
    };

    // 1. CLUTCH KILL-TRIGGER: If 1 player away from firing & I'm 100% safe & I can hit 0 credits cleanly without rotating danger onto myself!
    if (oneAwayFromFiring && myFacingAllBlank) {
      if (bot.credits <= 3) {
        return { type: 'MANIPULATE_CONTRIBUTE', payload: { amount: bot.credits } };
      }
      if (bot.credits === 2) {
        return { type: 'PRIVATE_PEEK', payload: { pairIndex: mySlots[0] } };
      }
      if (bot.credits === 1) {
        return { type: 'PUBLIC_PEEK', payload: { pairIndex: mySlots[0] } };
      }
    }

    // 2. DANGER ESCAPE: If a known live bullet is aimed directly at me!
    if (myFacingLive) {
      const s1 = bot.credits >= 3 ? evalRotate(1) : -999;
      const s2 = bot.credits >= 4 ? evalRotate(2) : -999;
      if (s2 >= s1 && s2 > -5 && bot.credits >= 4) {
        return { type: 'ROTATE_2' };
      }
      if (s1 > -5 && bot.credits >= 3) {
        return { type: 'ROTATE_1' };
      }
      // If can't afford rotate, try pushing manipulate pool to trigger a swap!
      if (bot.credits >= 1) {
        const amt = Math.min(3, bot.credits);
        return { type: 'MANIPULATE_CONTRIBUTE', payload: { amount: amt } };
      }
    }

    // 3. INFORMATION GATHERING: If my own chamber is unknown, peek it!
    if (myUnknownSlot !== undefined) {
      const pairOptions = [myUnknownSlot, (myUnknownSlot - 1 + C) % C];
      // Prefer pair that inspects TWO unknown slots
      let bestPair = pairOptions[0];
      for (const p of pairOptions) {
        const q = (p + 1) % C;
        if (knownAt(p) === null && knownAt(q) === null) bestPair = p;
      }
      if (bot.credits >= 2 && (rng() < 0.72 || bot.credits >= 6)) {
        return { type: 'PRIVATE_PEEK', payload: { pairIndex: bestPair } };
      }
      return { type: 'PUBLIC_PEEK', payload: { pairIndex: bestPair } };
    }

    // 4. SAFE POSITION MANAGEMENT: I know I'm facing a blank!
    // Don't rotate away from safety; either peek other chambers to track bullets or subtly fund Manipulate
    const unknownAny = Array.from({ length: C }, (_, i) => i).filter((i) => knownAt(i) === null);
    if (unknownAny.length > 0 && rng() < 0.55) {
      const targetSlot = unknownAny[Math.floor(rng() * unknownAny.length)];
      if (bot.credits >= 2 && rng() < 0.55) {
        return { type: 'PRIVATE_PEEK', payload: { pairIndex: targetSlot } };
      }
      return { type: 'PUBLIC_PEEK', payload: { pairIndex: targetSlot } };
    }

    // Subtle manipulate funding (1-2 credits to conserve or trigger pool)
    if (fullState.manipulateDepositsSinceTrigger >= 2 && bot.credits >= 2 && rng() < 0.5) {
      return { type: 'MANIPULATE_CONTRIBUTE', payload: { amount: Math.min(3, bot.credits) } };
    }

    if (bot.credits >= 1) {
      // Cheap public peek to burn 1 credit safely while preserving safe slot
      if (rng() < 0.65) {
        const p = Math.floor(rng() * C);
        return { type: 'PUBLIC_PEEK', payload: { pairIndex: p } };
      }
      const amt = Math.min(bot.credits, rng() < 0.5 ? 1 : 2);
      return { type: 'MANIPULATE_CONTRIBUTE', payload: { amount: amt } };
    }

    return { type: 'PUBLIC_PEEK', payload: { pairIndex: 0 } };
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;

    const survivors = fullState.players.filter((p) => !p.eliminated);
    const eliminated = fullState.players.filter((p) => p.eliminated);

    const rankings = [
      ...survivors
        .sort((a, b) => b.credits - a.credits)
        .map((p) => ({
          seatId: p.seatId,
          score: p.credits,
          label: `SURVIVED · ${p.credits} CR`,
        })),
      ...eliminated
        .sort((a, b) => b.credits - a.credits)
        .map((p) => ({
          seatId: p.seatId,
          score: -1,
          label: `ELIMINATED 💀 · ${p.credits} CR`,
        })),
    ];

    const elimNames = eliminated.map((p) => p.name).join(' & ');
    return {
      winnerSeatIds: survivors.map((p) => p.seatId),
      rankings,
      summary: {
        zh: `连发处决结束！${elimNames || '无人'} 中弹淘汰，${survivors.length} 名囚徒成功生还！`,
        en: `Firing sequence complete! ${elimNames || 'Nobody'} eliminated — ${survivors.length} prisoner(s) survived!`,
      },
    };
  },
};
