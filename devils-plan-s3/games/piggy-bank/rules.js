/**
 * Prison Match 3: Piggy Bank (存钱罐 / 돼지 저금통)
 * Pure deterministic state machine, strict hidden-coin projection, and memory-tracking bluffing AI.
 *
 * Exact Show Rules (Day 3 PM3, Ep 7-8):
 * - 3-4 players, N+1 numbered piggy banks (#1..#5 in 4p, #1..#4 in 3p), each starting with 1 Black + 1 White coin.
 * - Each player has Bottom Slot + Top Slot. Seat 0 begins holding 2 banks (Bottom #1, Top #N+1).
 * - Turn cycle:
 *   1. Deposit & Pass: Action player drops 1-5 coins (hidden mix) into Bottom Bank, announces Black/White mix
 *      (truthful or optional bluff claim), passes it to any other player's Top Slot, and shifts own Top -> Bottom.
 *   2. 20s Answer: Receiver announces cumulative Black/White count (strictly alternating Black -> White -> Black...).
 *   3. 10s Doubt Window: Any other player can slam DOUBT!
 *      - Wrong answer: Challenger +1, Receiver -1.
 *      - Correct answer: Challenger -1 (false doubt!).
 *      - Opened bank smashes/X-rays open to verify all coins, then resets to 1 Black + 1 White!
 *      - No Doubt: Bank stays sealed, coins keep accumulating!
 * - First to reach 5 points wins!
 */

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function flipColor(c) {
  return c === 'black' ? 'white' : 'black';
}

function getEligibleDoubters(state) {
  return state.players
    .filter((p) => p.seatId !== state.receiverSeatId)
    .map((p) => p.seatId);
}

function startNextDepositTurn(state, nextPasserSeatId) {
  // Check victory first
  const winner = state.players.find((p) => p.score >= state.targetScore);
  if (winner) {
    state.phase = 'ended';
    state.currentTurnSeatId = null;
    state.pendingSeatIds = [];
    return true;
  }

  state.phase = 'deposit';
  state.targetColor = flipColor(state.targetColor);
  state.passerSeatId = nextPasserSeatId;
  state.receiverSeatId = null;
  state.currentTurnSeatId = nextPasserSeatId;
  state.pendingSeatIds = [nextPasserSeatId];
  state.announcedCount = null;
  state.doubtPassedSeatIds = [];
  state.revealData = null;
  state.turnNumber += 1;
  return false;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx?.options || {};
    const numPlayers = seats.length;
    const numBanks = numPlayers + 1;
    const targetScore = Number(opts.targetScore) || 5;
    const allowBluffClaim = opts.allowBluffClaim !== false;

    const banks = {};
    for (let id = 1; id <= numBanks; id++) {
      banks[id] = {
        id,
        black: 1,
        white: 1,
        totalDrops: 0,
        resetCount: 0,
      };
    }

    const players = seats.map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar || '◆',
      isBot: Boolean(s.isBot),
      seatIndex: idx,
      score: 0,
      bottomBankId: idx + 1,
      topBankId: idx === 0 ? numBanks : null,
      correctDoubts: 0,
      falseDoubts: 0,
    }));

    // Internal bot memory (never projected!)
    const botMemory = {};
    for (const p of players) {
      if (!p.isBot) continue;
      botMemory[p.seatId] = {};
      for (let id = 1; id <= numBanks; id++) {
        botMemory[p.seatId][id] = { black: 1, white: 1, uncertainty: 0 };
      }
    }

    return {
      phase: 'deposit', // 'deposit' | 'answer' | 'doubt' | 'reveal' | 'ended'
      turnNumber: 1,
      numBanks,
      targetScore,
      allowBluffClaim,
      fastMode: Boolean(opts.fastMode),
      targetColor: 'black', // alternates 'black' <-> 'white'
      passerSeatId: players[0].seatId,
      receiverSeatId: null,
      currentTurnSeatId: players[0].seatId,
      pendingSeatIds: [players[0].seatId],
      banks,
      players,
      lastDrop: null, // { passerSeatId, receiverSeatId, bankId, totalDropped, claimedBlack, claimedWhite, actualBlack, actualWhite, turn }
      announcedCount: null,
      doubtPassedSeatIds: [],
      revealData: null,
      revealSeq: 0,
      botMemory,
      history: [
        {
          type: 'START',
          zh: `${numBanks} 只存钱罐已就位（每只初始 1黑 + 1白）。率先达到 ${targetScore} 分者获胜！`,
          en: `${numBanks} piggy banks ready (1 Black + 1 White each). First to ${targetScore} points wins!`,
          tone: 'normal',
        },
      ],
    };
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'ended') return { ok: false, reason: 'Match ended' };

    const { type, payload = {} } = action;

    if (fullState.phase === 'deposit') {
      if (type !== 'DEPOSIT_AND_PASS') return { ok: false, reason: 'Must deposit coins and pass bank' };
      if (seatId !== fullState.passerSeatId) return { ok: false, reason: 'Not your turn to pass' };

      const ab = Number(payload.actualBlack);
      const aw = Number(payload.actualWhite);
      if (!Number.isInteger(ab) || !Number.isInteger(aw) || ab < 0 || aw < 0 || ab + aw < 1 || ab + aw > 5) {
        return { ok: false, reason: 'Drop between 1 and 5 coins total' };
      }

      const targetSeatId = payload.targetSeatId;
      if (!targetSeatId || targetSeatId === seatId) {
        return { ok: false, reason: 'Must pass to another player' };
      }
      if (!fullState.players.some((p) => p.seatId === targetSeatId)) {
        return { ok: false, reason: 'Target player not found' };
      }

      if (fullState.allowBluffClaim && payload.claimedBlack !== undefined && payload.claimedWhite !== undefined) {
        const cb = Number(payload.claimedBlack);
        const cw = Number(payload.claimedWhite);
        if (!Number.isInteger(cb) || !Number.isInteger(cw) || cb < 0 || cw < 0 || cb + cw < 1 || cb + cw > 5) {
          return { ok: false, reason: 'Declared mix must total 1–5 coins' };
        }
      }
      return { ok: true };
    }

    if (fullState.phase === 'answer') {
      if (type !== 'ANNOUNCE_COUNT') return { ok: false, reason: 'Must announce cumulative coin count' };
      if (seatId !== fullState.receiverSeatId) return { ok: false, reason: 'Waiting for receiver to answer' };
      const count = Number(payload.count);
      if (!Number.isInteger(count) || count < 0 || count > 60) {
        return { ok: false, reason: 'Enter a valid coin count (0–60)' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'doubt') {
      if (type === 'DOUBT') {
        const challengerId = payload.challengerSeatId || seatId;
        if (challengerId === fullState.receiverSeatId) {
          return { ok: false, reason: 'Receiver cannot doubt themselves' };
        }
        if (!fullState.players.some((p) => p.seatId === challengerId)) {
          return { ok: false, reason: 'Invalid challenger' };
        }
        return { ok: true };
      }
      if (type === 'PASS_DOUBT') {
        if (seatId === fullState.receiverSeatId) {
          return { ok: false, reason: 'Receiver waits for doubt window' };
        }
        return { ok: true };
      }
      return { ok: false, reason: 'Only DOUBT or PASS_DOUBT allowed now' };
    }

    if (fullState.phase === 'reveal') {
      if (type === 'CONTINUE_REVEAL') return { ok: true };
      return { ok: false, reason: 'Verification reveal in progress' };
    }

    return { ok: false, reason: 'Invalid phase action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = cloneState(fullState);
    const rng = ctx?.rng || Math.random;
    const events = [];
    const { type, payload = {} } = action;

    if (type === 'DEPOSIT_AND_PASS') {
      const passer = state.players.find((p) => p.seatId === seatId);
      const receiver = state.players.find((p) => p.seatId === payload.targetSeatId);
      const bankId = passer.bottomBankId;
      const bank = state.banks[bankId];

      const ab = Number(payload.actualBlack);
      const aw = Number(payload.actualWhite);
      const cb = state.allowBluffClaim && payload.claimedBlack !== undefined ? Number(payload.claimedBlack) : ab;
      const cw = state.allowBluffClaim && payload.claimedWhite !== undefined ? Number(payload.claimedWhite) : aw;

      // Update actual bank contents (hidden inside!)
      bank.black += ab;
      bank.white += aw;
      bank.totalDrops += 1;

      // Slot rotation: passer moves Top -> Bottom; passed Bottom bank goes to receiver's Top
      passer.bottomBankId = passer.topBankId;
      passer.topBankId = null;
      receiver.topBankId = bankId;

      // Update bot memories
      for (const p of state.players) {
        if (!p.isBot || !state.botMemory[p.seatId]) continue;
        const mem = state.botMemory[p.seatId][bankId];
        if (p.seatId === seatId) {
          mem.black += ab;
          mem.white += aw;
        } else {
          mem.black += cb;
          mem.white += cw;
          // Realistic subtle memory drift after many un-reset drops
          if (bank.totalDrops >= 3 && rng() < 0.22) {
            const drift = rng() < 0.5 ? 1 : -1;
            if (rng() < 0.5) mem.black = Math.max(1, mem.black + drift);
            else mem.white = Math.max(1, mem.white + drift);
          }
          mem.uncertainty = Math.min(3, (mem.uncertainty || 0) + (ab !== cb || aw !== cw ? 0.65 : 0.2));
        }
      }

      state.lastDrop = {
        passerSeatId: seatId,
        passerName: passer.name,
        receiverSeatId: receiver.seatId,
        receiverName: receiver.name,
        bankId,
        totalDropped: ab + aw,
        claimedBlack: cb,
        claimedWhite: cw,
        actualBlack: ab,
        actualWhite: aw,
        turn: state.turnNumber,
      };

      state.phase = 'answer';
      state.receiverSeatId = receiver.seatId;
      state.currentTurnSeatId = receiver.seatId;
      state.pendingSeatIds = [receiver.seatId];

      const colorZh = state.targetColor === 'black' ? '黑币' : '白币';
      const colorEn = state.targetColor === 'black' ? 'BLACK' : 'WHITE';
      state.history.push({
        type: 'PASS',
        zh: `${passer.name} 向 #${bankId} 投入 ${ab + aw} 枚币（宣称 ${cb}黑 ${cw}白），传给 ${receiver.name}！请答【${colorZh}】总数`,
        en: `${passer.name} dropped ${ab + aw} coin(s) into #${bankId} (claimed ${cb}B ${cw}W) → passed to ${receiver.name}! Answer ${colorEn} total.`,
        tone: 'normal',
      });
      events.push({ type: 'DEPOSIT_AND_PASS', bankId, totalDropped: ab + aw });
      return { state, events };
    }

    if (type === 'ANNOUNCE_COUNT') {
      const receiver = state.players.find((p) => p.seatId === seatId);
      const count = Number(payload.count);
      const bankId = receiver.topBankId;
      state.announcedCount = count;
      state.phase = 'doubt';
      state.doubtPassedSeatIds = [];
      const elig = getEligibleDoubters(state);
      state.pendingSeatIds = elig;
      state.currentTurnSeatId = elig[0] || null;

      const colorZh = state.targetColor === 'black' ? '黑币' : '白币';
      const colorEn = state.targetColor === 'black' ? 'BLACK' : 'WHITE';
      state.history.push({
        type: 'ANNOUNCE',
        zh: `📢 ${receiver.name} 宣告：#${bankId} 内共有 【${count} 枚${colorZh}】！10 秒质疑窗口开启！`,
        en: `📢 ${receiver.name} announces: Bank #${bankId} has 【${count} ${colorEn}】! 10s DOUBT window open!`,
        tone: 'normal',
      });
      events.push({ type: 'ANNOUNCE_COUNT', seatId, count });
      return { state, events };
    }

    if (type === 'DOUBT') {
      const challengerId = payload.challengerSeatId || seatId;
      const challenger = state.players.find((p) => p.seatId === challengerId);
      const receiver = state.players.find((p) => p.seatId === state.receiverSeatId);
      const bankId = receiver.topBankId;
      const bank = state.banks[bankId];

      const actualTargetCount = state.targetColor === 'black' ? bank.black : bank.white;
      const wasCorrect = state.announcedCount === actualTargetCount;

      const scoreDeltas = {};
      if (wasCorrect) {
        challenger.score -= 1;
        challenger.falseDoubts += 1;
        scoreDeltas[challenger.seatId] = -1;
        scoreDeltas[receiver.seatId] = 0;
      } else {
        challenger.score += 1;
        challenger.correctDoubts += 1;
        receiver.score -= 1;
        scoreDeltas[challenger.seatId] = +1;
        scoreDeltas[receiver.seatId] = -1;
      }

      state.revealSeq += 1;
      state.phase = 'reveal';
      state.currentTurnSeatId = null;
      state.pendingSeatIds = [];
      state.revealData = {
        bankId,
        targetColor: state.targetColor,
        announcedCount: state.announcedCount,
        actualBlack: bank.black,
        actualWhite: bank.white,
        actualTargetCount,
        challengerSeatId: challenger.seatId,
        challengerName: challenger.name,
        receiverSeatId: receiver.seatId,
        receiverName: receiver.name,
        wasCorrect,
        timedOut: false,
        scoreDeltas,
      };

      const colorZh = state.targetColor === 'black' ? '黑币' : '白币';
      const colorEn = state.targetColor === 'black' ? 'BLACK' : 'WHITE';
      state.history.push({
        type: 'DOUBT_RESULT',
        zh: wasCorrect
          ? `🚨 ${challenger.name} 质疑失败！#${bankId} 真实${colorZh}确为 ${actualTargetCount} 枚（${bank.black}黑/${bank.white}白）。${challenger.name} -1 分！`
          : `💥 ${challenger.name} 质疑成功！#${bankId} 真实${colorZh}为 ${actualTargetCount} 枚（报 ${state.announcedCount}）。${challenger.name} +1 分，${receiver.name} -1 分！`,
        en: wasCorrect
          ? `🚨 ${challenger.name}'s DOUBT FAILED! Bank #${bankId} really had ${actualTargetCount} ${colorEn} (${bank.black}B/${bank.white}W). ${challenger.name} -1 pt!`
          : `💥 ${challenger.name}'s DOUBT SUCCEEDED! Bank #${bankId} actually had ${actualTargetCount} ${colorEn} (said ${state.announcedCount}). ${challenger.name} +1, ${receiver.name} -1!`,
        tone: wasCorrect ? 'good' : 'alert',
      });
      events.push({ type: 'DOUBT_TRIGGERED', wasCorrect, bankId });
      return { state, events };
    }

    if (type === 'PASS_DOUBT') {
      if (!state.doubtPassedSeatIds.includes(seatId)) {
        state.doubtPassedSeatIds.push(seatId);
      }
      const remaining = getEligibleDoubters(state).filter((id) => !state.doubtPassedSeatIds.includes(id));
      state.pendingSeatIds = remaining;
      state.currentTurnSeatId = remaining[0] || null;

      if (remaining.length === 0) {
        const receiver = state.players.find((p) => p.seatId === state.receiverSeatId);
        state.history.push({
          type: 'ACCEPTED',
          zh: `✓ 无人质疑！#${receiver.topBankId} 保持密封，由 ${receiver.name} 继续投币传递。`,
          en: `✓ No Doubt! Bank #${receiver.topBankId} stays sealed — ${receiver.name} passes next.`,
          tone: 'good',
        });
        startNextDepositTurn(state, state.receiverSeatId);
        events.push({ type: 'DOUBT_PASSED_ALL' });
      }
      return { state, events };
    }

    if (type === 'CONTINUE_REVEAL') {
      const bankId = state.revealData?.bankId;
      if (bankId && state.banks[bankId]) {
        // Reset smashed bank back to 1 Black + 1 White!
        state.banks[bankId].black = 1;
        state.banks[bankId].white = 1;
        state.banks[bankId].totalDrops = 0;
        state.banks[bankId].resetCount += 1;

        for (const p of state.players) {
          if (p.isBot && state.botMemory[p.seatId]) {
            state.botMemory[p.seatId][bankId] = { black: 1, white: 1, uncertainty: 0 };
          }
        }
      }
      const nextPasser = state.revealData?.receiverSeatId || state.players[0].seatId;
      const ended = startNextDepositTurn(state, nextPasser);
      events.push({ type: ended ? 'MATCH_END' : 'BANK_RESET', bankId });
      return { state, events };
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (fullState.phase === 'deposit') {
      return {
        phaseKey: `deposit-${fullState.turnNumber}`,
        durationMs: fullState.fastMode ? 25000 : 40000,
      };
    }
    if (fullState.phase === 'answer') {
      return {
        phaseKey: `answer-${fullState.turnNumber}`,
        durationMs: 20000, // Exact 20s show rule!
      };
    }
    if (fullState.phase === 'doubt') {
      return {
        phaseKey: `doubt-${fullState.turnNumber}`,
        durationMs: 10000, // Exact 10s show rule!
      };
    }
    if (fullState.phase === 'reveal') {
      return {
        phaseKey: `reveal-${fullState.revealSeq}`,
        durationMs: 5200,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    if (fullState.phase === 'deposit') {
      const act = this.computeBotAction(fullState, fullState.passerSeatId, ctx);
      if (act) return this.applyAction(fullState, fullState.passerSeatId, act, ctx);
    }

    if (fullState.phase === 'answer') {
      // 20s timeout = automatic wrong answer (-1 pt) and bank smashes open + resets!
      const state = cloneState(fullState);
      const receiver = state.players.find((p) => p.seatId === state.receiverSeatId);
      const bankId = receiver.topBankId;
      const bank = state.banks[bankId];
      const actualTargetCount = state.targetColor === 'black' ? bank.black : bank.white;

      receiver.score -= 1;
      state.revealSeq += 1;
      state.phase = 'reveal';
      state.currentTurnSeatId = null;
      state.pendingSeatIds = [];
      state.revealData = {
        bankId,
        targetColor: state.targetColor,
        announcedCount: null,
        actualBlack: bank.black,
        actualWhite: bank.white,
        actualTargetCount,
        challengerSeatId: null,
        challengerName: null,
        receiverSeatId: receiver.seatId,
        receiverName: receiver.name,
        wasCorrect: false,
        timedOut: true,
        scoreDeltas: { [receiver.seatId]: -1 },
      };
      state.history.push({
        type: 'ANSWER_TIMEOUT',
        zh: `⏱ ${receiver.name} 20 秒作答超时！直接 -1 分，#${bankId} 开罐核验并重置！`,
        en: `⏱ ${receiver.name} timed out (20s)! -1 pt — Bank #${bankId} opens & resets!`,
        tone: 'alert',
      });
      return { state, events: [{ type: 'ANSWER_TIMEOUT', bankId }] };
    }

    if (fullState.phase === 'doubt') {
      // 10s Doubt window closed with no challenger -> accepted!
      const state = cloneState(fullState);
      const receiver = state.players.find((p) => p.seatId === state.receiverSeatId);
      state.history.push({
        type: 'ACCEPTED',
        zh: `✓ 10 秒质疑窗口结束，无人按铃！#${receiver.topBankId} 保持密封。`,
        en: `✓ 10s Doubt window expired with no buzzer! Bank #${receiver.topBankId} stays sealed.`,
        tone: 'good',
      });
      startNextDepositTurn(state, state.receiverSeatId);
      return { state, events: [{ type: 'DOUBT_PASSED_ALL' }] };
    }

    if (fullState.phase === 'reveal') {
      return this.applyAction(fullState, null, { type: 'CONTINUE_REVEAL' }, ctx);
    }

    return null;
  },

  projectState(fullState, viewerSeatId) {
    const isEnded = fullState.phase === 'ended';

    // CRITICAL: Strip actual coin counts inside every piggy bank!
    const banks = {};
    for (const [id, b] of Object.entries(fullState.banks)) {
      banks[id] = {
        id: b.id,
        totalDrops: b.totalDrops,
        resetCount: b.resetCount,
        // Only reveal inside contents if match has ended
        black: isEnded ? b.black : null,
        white: isEnded ? b.white : null,
      };
    }

    // Sanitize lastDrop so actual hidden mix is ONLY visible to the passer (or during reveal/ended)
    let lastDrop = null;
    if (fullState.lastDrop) {
      const ld = fullState.lastDrop;
      const canSeeActual = isEnded || fullState.phase === 'reveal' || ld.passerSeatId === viewerSeatId;
      lastDrop = {
        passerSeatId: ld.passerSeatId,
        passerName: ld.passerName,
        receiverSeatId: ld.receiverSeatId,
        receiverName: ld.receiverName,
        bankId: ld.bankId,
        totalDropped: ld.totalDropped,
        claimedBlack: ld.claimedBlack,
        claimedWhite: ld.claimedWhite,
        actualBlack: canSeeActual ? ld.actualBlack : null,
        actualWhite: canSeeActual ? ld.actualWhite : null,
        turn: ld.turn,
      };
    }

    return {
      phase: fullState.phase,
      turnNumber: fullState.turnNumber,
      numBanks: fullState.numBanks,
      targetScore: fullState.targetScore,
      allowBluffClaim: fullState.allowBluffClaim,
      targetColor: fullState.targetColor,
      passerSeatId: fullState.passerSeatId,
      receiverSeatId: fullState.receiverSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      pendingSeatIds: fullState.pendingSeatIds,
      banks,
      players: fullState.players,
      lastDrop,
      announcedCount: fullState.announcedCount,
      doubtPassedSeatIds: fullState.doubtPassedSeatIds,
      revealData: fullState.revealData,
      revealSeq: fullState.revealSeq,
      history: fullState.history.slice(-16),
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    const rng = ctx?.rng || Math.random;

    if (fullState.phase === 'deposit' && fullState.passerSeatId === botSeatId) {
      const others = fullState.players.filter((p) => p.seatId !== botSeatId);
      // Mix targeting between the leader and rotating players so games stay dynamic
      others.sort((a, b) => b.score - a.score);
      const target = rng() < 0.35 ? others[0] : others[Math.floor(rng() * others.length)];

      const total = 1 + Math.floor(rng() * 5); // 1..5 coins
      const actualBlack = Math.floor(rng() * (total + 1));
      const actualWhite = total - actualBlack;

      let claimedBlack = actualBlack;
      let claimedWhite = actualWhite;

      // Occasional strategic bluff if allowed (~18% chance to set up a trap on the upcoming color)
      if (fullState.allowBluffClaim && total >= 2 && rng() < 0.18) {
        if (actualBlack > 0 && rng() < 0.5) {
          claimedBlack = actualBlack - 1;
          claimedWhite = actualWhite + 1;
        } else if (actualWhite > 0) {
          claimedBlack = actualBlack + 1;
          claimedWhite = actualWhite - 1;
        }
      }

      return {
        type: 'DEPOSIT_AND_PASS',
        payload: {
          actualBlack,
          actualWhite,
          claimedBlack,
          claimedWhite,
          targetSeatId: target.seatId,
        },
      };
    }

    if (fullState.phase === 'answer' && fullState.receiverSeatId === botSeatId) {
      const bot = fullState.players.find((p) => p.seatId === botSeatId);
      const bankId = bot.topBankId;
      const mem = fullState.botMemory?.[botSeatId]?.[bankId] || { black: 2, white: 2 };
      const est = fullState.targetColor === 'black' ? mem.black : mem.white;
      // Realistic human-like memory slip rate scaling with accumulated drops
      const drops = fullState.banks[bankId]?.totalDrops || 1;
      let guess = est;
      const slipChance = drops >= 4 ? 0.34 : drops >= 2 ? 0.16 : 0.04;
      if (rng() < slipChance) {
        guess = Math.max(1, est + (rng() < 0.5 ? 1 : -1));
      }
      return {
        type: 'ANNOUNCE_COUNT',
        payload: { count: Math.max(1, Math.round(guess)) },
      };
    }

    if (fullState.phase === 'doubt') {
      if (botSeatId === fullState.receiverSeatId) return null;
      if (fullState.doubtPassedSeatIds.includes(botSeatId)) return null;

      const receiver = fullState.players.find((p) => p.seatId === fullState.receiverSeatId);
      const bankId = receiver.topBankId;
      const mem = fullState.botMemory?.[botSeatId]?.[bankId];
      if (mem) {
        const expected = fullState.targetColor === 'black' ? mem.black : mem.white;
        const diff = Math.abs(fullState.announcedCount - expected);
        const iWasPasser = fullState.lastDrop?.passerSeatId === botSeatId;

        // Sharp doubt discipline: slam DOUBT if we are confident of a mismatch
        if (diff >= 1 && (iWasPasser || mem.uncertainty < 0.65 || diff >= 2)) {
          if (rng() < (iWasPasser ? 0.92 : 0.78)) {
            return { type: 'DOUBT' };
          }
        }
      }
      return { type: 'PASS_DOUBT' };
    }

    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended') return null;

    const sorted = fullState.players
      .slice()
      .sort((a, b) => b.score - a.score || b.correctDoubts - a.correctDoubts);

    const topScore = sorted[0].score;
    const winnerSeatIds = sorted.filter((p) => p.score === topScore).map((p) => p.seatId);
    const lowestScore = sorted[sorted.length - 1].score;
    const eliminated = sorted.filter((p) => p.score === lowestScore).map((p) => p.name);

    return {
      winnerSeatIds,
      rankings: sorted.map((p) => ({
        seatId: p.seatId,
        score: p.score,
        label: `${p.score >= 0 ? '+' : ''}${p.score} PTS`,
      })),
      summary: {
        zh: `${sorted[0].name} 率先达到 ${fullState.targetScore} 分夺得监狱赛胜利！最低分 ${eliminated.join(' / ')} (${lowestScore} 分) 陷入淘汰危机。`,
        en: `${sorted[0].name} reached ${fullState.targetScore} points to win! Lowest score: ${eliminated.join(' / ')} (${lowestScore} pts).`,
      },
    };
  },
};
