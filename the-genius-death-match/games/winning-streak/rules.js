/**
 * Winning Streak (연승게임 / 连胜游戏) — Pure Deterministic Rule Engine
 * Zero DOM access · Seeded RNG · S1E1 / S1E2 / S1E5 Gauntlet + Lobby Intel
 */

export const HANDS = ['rock', 'paper', 'scissors'];

const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

const COUNTER_OF = {
  rock: 'paper',
  paper: 'scissors',
  scissors: 'rock',
};

const GUEST_PROFILES = [
  { name: { zh: '洪榛浩', en: 'Hong Jin-ho' }, avatar: '♠', archetype: 'patterned' },
  { name: { zh: '李相敏', en: 'Lee Sang-min' }, avatar: '♛', archetype: 'mercenary' },
  { name: { zh: '金京兰', en: 'Kim Kyung-ran' }, avatar: '♦', archetype: 'loyal' },
  { name: { zh: '金九拉', en: 'Kim Gu-ra' }, avatar: '⚡', archetype: 'contrarian' },
  { name: { zh: '朴恩智', en: 'Park Eun-ji' }, avatar: '✦', archetype: 'loyal' },
  { name: { zh: '车敏洙', en: 'Cha Min-soo' }, avatar: '◈', archetype: 'patterned' },
  { name: { zh: '金圣圭', en: 'Kim Sung-kyu' }, avatar: '★', archetype: 'mercenary' },
  { name: { zh: '金风', en: 'Kim Poong' }, avatar: '▲', archetype: 'contrarian' },
  { name: { zh: '崔昌烨', en: 'Choi Chang-yeop' }, avatar: '♣', archetype: 'loyal' },
];

const HAND_ZH = { rock: '石头', paper: '布', scissors: '剪刀' };
const HAND_EN = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

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

export function resolveRps(playerHand, guestHand) {
  if (playerHand === guestHand) return 'draw';
  return BEATS[playerHand] === guestHand ? 'win' : 'loss';
}

function pickBiasedHand(tendency, biasProb, rng) {
  if (rng() < biasProb) return tendency;
  const others = HANDS.filter((h) => h !== tendency);
  return others[Math.floor(rng() * others.length)];
}

function generateGauntlet(seatOrder, rng) {
  const chosen = shuffle(GUEST_PROFILES, rng);
  return chosen.map((g, idx) => {
    const tendency = HANDS[Math.floor(rng() * 3)];
    const bluffHand = HANDS.filter((h) => h !== tendency)[Math.floor(rng() * 2)];
    let publicHint;
    let biasProb = 0.55;

    if (g.archetype === 'patterned') {
      biasProb = 0.68;
      publicHint = {
        zh: `偏向出「${HAND_ZH[tendency]}」`,
        en: `Favors ${HAND_EN[tendency]}`,
      };
    } else if (g.archetype === 'contrarian') {
      biasProb = 0.62;
      // Contrarian publicly claims they favor bluffHand (usually a bluff!)
      publicHint = {
        zh: `宣称爱出「${HAND_ZH[bluffHand]}」（反骨）`,
        en: `Claims ${HAND_EN[bluffHand]} (Bluffer)`,
      };
    } else if (g.archetype === 'mercenary') {
      biasProb = 0.52;
      publicHint = {
        zh: `重金游说可获确切手势`,
        en: `Reveals exact hand to top lobbyist`,
      };
    } else {
      biasProb = 0.5;
      publicHint = {
        zh: `游说即诚实透露底牌`,
        en: `Honest exact tell when lobbied`,
      };
    }

    const throws = {};
    for (const sid of seatOrder) {
      throws[sid] = pickBiasedHand(tendency, biasProb, rng);
    }

    return {
      index: idx,
      name: g.name,
      avatar: g.avatar,
      archetype: g.archetype,
      tendency,
      publicHint,
      throws, // secret until round reveal!
    };
  });
}

function buildPrivateIntel(gauntlet, seatOrder, lobbyAlloc, rng) {
  const [s0, s1] = seatOrder;
  const intel = { [s0]: {}, [s1]: {} };

  for (let i = 0; i < gauntlet.length; i++) {
    const g = gauntlet[i];
    const t0 = lobbyAlloc[s0][i] || 0;
    const t1 = lobbyAlloc[s1][i] || 0;

    for (const sid of seatOrder) {
      const myT = sid === s0 ? t0 : t1;
      const oppT = sid === s0 ? t1 : t0;
      if (myT <= 0) continue;

      const actual = g.throws[sid];
      const otherHands = HANDS.filter((h) => h !== actual);
      const elim = otherHands[Math.floor(rng() * otherHands.length)];

      // Exact reveal if strictly out-lobbied rival (or 2 tokens on contrarian)
      if (myT > oppT) {
        if (g.archetype === 'contrarian' && myT === 1) {
          intel[sid][i] = {
            kind: 'eliminate',
            notHand: elim,
            contested: oppT > 0,
          };
        } else {
          intel[sid][i] = {
            kind: 'exact',
            hand: actual,
            contested: oppT > 0,
          };
        }
      } else if (myT === oppT) {
        // Equal lobby clash -> partial elimination tell!
        intel[sid][i] = {
          kind: 'eliminate',
          notHand: elim,
          contested: true,
        };
      } else {
        // Outbid by rival -> mercenary refuses, others give noisy hint
        intel[sid][i] = {
          kind: 'outbid',
          contested: true,
        };
      }
    }
  }
  return intel;
}

function checkGauntletEndOrOvertime(next, rng) {
  const [s0, s1] = next.seatOrder;
  const p0 = next.players[s0];
  const p1 = next.players[s1];

  if (!next.isOvertime && next.round < 9) {
    next.round += 1;
    next.phase = 'duel';
    next.pendingSeatIds = next.seatOrder.slice();
    next.currentLocks = {};
    next.phaseLabel = { zh: `第 ${next.round}/9 位嘉宾`, en: `Guest ${next.round} of 9` };
    return;
  }

  // After 9 guests (or after an overtime round), check winner
  if (!next.isOvertime) {
    if (p0.maxStreak !== p1.maxStreak) {
      next.phase = 'ended';
      next.pendingSeatIds = [];
      next.winnerSeatIds = p0.maxStreak > p1.maxStreak ? [s0] : [s1];
      next.winReason = 'max_streak';
      next.phaseLabel = { zh: '对决终局', en: 'Match Complete' };
      return;
    }
    if (p0.wins !== p1.wins) {
      next.phase = 'ended';
      next.pendingSeatIds = [];
      next.winnerSeatIds = p0.wins > p1.wins ? [s0] : [s1];
      next.winReason = 'total_wins';
      next.phaseLabel = { zh: '对决终局', en: 'Match Complete' };
      return;
    }
    if (p0.losses !== p1.losses) {
      next.phase = 'ended';
      next.pendingSeatIds = [];
      next.winnerSeatIds = p0.losses < p1.losses ? [s0] : [s1];
      next.winReason = 'fewest_losses';
      next.phaseLabel = { zh: '对决终局', en: 'Match Complete' };
      return;
    }
  } else {
    // In overtime: check last round win discrepancy
    const last = next.history[next.history.length - 1];
    const r0 = last.outcomes[s0];
    const r1 = last.outcomes[s1];
    if (r0 === 'win' && r1 !== 'win') {
      next.phase = 'ended';
      next.pendingSeatIds = [];
      next.winnerSeatIds = [s0];
      next.winReason = 'overtime';
      next.phaseLabel = { zh: '加时决胜', en: 'Overtime Victory' };
      return;
    }
    if (r1 === 'win' && r0 !== 'win') {
      next.phase = 'ended';
      next.pendingSeatIds = [];
      next.winnerSeatIds = [s1];
      next.winReason = 'overtime';
      next.phaseLabel = { zh: '加时决胜', en: 'Overtime Victory' };
      return;
    }
  }

  // Launch Sudden-Death Overtime Dealer Guest
  next.isOvertime = true;
  next.round += 1;
  const otHand = HANDS[Math.floor(rng() * 3)];
  next.gauntlet.push({
    index: next.gauntlet.length,
    name: { zh: `加时荷官 #${next.round - 9}`, en: `Dealer OT #${next.round - 9}` },
    avatar: '❖',
    archetype: 'loyal',
    tendency: otHand,
    publicHint: { zh: '加时决胜：率先赢下一局者晋级', en: 'Sudden Death: Out-win rival to survive' },
    throws: { [s0]: otHand, [s1]: otHand },
  });
  next.phase = 'duel';
  next.pendingSeatIds = next.seatOrder.slice();
  next.currentLocks = {};
  next.phaseLabel = { zh: '加时决胜轮', en: 'Sudden-Death OT' };
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const seatOrder = seats.slice(0, 2).map((s) => s.seatId);
    const gauntlet = generateGauntlet(seatOrder, ctx.rng);
    const players = {};
    for (const s of seats.slice(0, 2)) {
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        currentStreak: 0,
        maxStreak: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
    }

    return {
      phase: 'lobby', // 'lobby' | 'duel' | 'reveal' | 'ended'
      round: 0, // 0 during lobby, 1..9 during gauntlet, 10+ overtime
      isOvertime: false,
      lobbyBudget: 3,
      phaseLabel: { zh: '赛前游说阶段', en: 'Pre-Match Lobbying' },
      seatOrder,
      pendingSeatIds: seatOrder.slice(),
      players,
      gauntlet,
      lobbyAlloc: {}, // seatId -> number[9]
      privateIntel: {}, // seatId -> { [guestIdx]: intelObj }
      currentLocks: {}, // seatId -> 'rock'|'paper'|'scissors'
      history: [], // per-round resolved clashes
      winnerSeatIds: [],
      winReason: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match has ended' };
    }
    const { type, payload } = action || {};

    if (fullState.phase === 'lobby') {
      if (type !== 'SUBMIT_LOBBY') return { ok: false, reason: 'Submit your 3 Lobby tokens first' };
      if (!fullState.pendingSeatIds.includes(seatId)) {
        return { ok: false, reason: 'You already locked your Lobby allocation' };
      }
      const alloc = payload?.allocation;
      if (!Array.isArray(alloc) || alloc.length !== 9) {
        return { ok: false, reason: 'Allocation must cover all 9 guests' };
      }
      let sum = 0;
      for (const n of alloc) {
        if (!Number.isInteger(n) || n < 0 || n > 3) {
          return { ok: false, reason: 'Invalid token count' };
        }
        sum += n;
      }
      if (sum !== fullState.lobbyBudget) {
        return { ok: false, reason: `Spend all ${fullState.lobbyBudget} Lobby tokens` };
      }
      return { ok: true };
    }

    if (fullState.phase === 'duel') {
      if (type !== 'LOCK_THROW') return { ok: false, reason: 'Lock Rock, Paper, or Scissors' };
      if (!fullState.pendingSeatIds.includes(seatId)) {
        return { ok: false, reason: 'Already locked your throw for this guest' };
      }
      if (!HANDS.includes(payload?.hand)) {
        return { ok: false, reason: 'Choose rock, paper, or scissors' };
      }
      return { ok: true };
    }

    if (fullState.phase === 'reveal') {
      if (type !== 'NEXT_GUEST') return { ok: false, reason: 'Advance to next guest' };
      return { ok: true };
    }

    return { ok: false, reason: 'Invalid action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const next = cloneState(fullState);
    const { type, payload } = action;
    const events = [];

    if (next.phase === 'lobby' && type === 'SUBMIT_LOBBY') {
      next.lobbyAlloc[seatId] = payload.allocation.slice();
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'LOBBY_LOCKED', seatId });

      if (next.pendingSeatIds.length === 0) {
        next.privateIntel = buildPrivateIntel(next.gauntlet, next.seatOrder, next.lobbyAlloc, ctx.rng);
        next.phase = 'duel';
        next.round = 1;
        next.pendingSeatIds = next.seatOrder.slice();
        next.currentLocks = {};
        next.phaseLabel = { zh: '第 1/9 位嘉宾', en: 'Guest 1 of 9' };
        events.push({ type: 'GAUNTLET_START', round: 1 });
      }
      return { state: next, events };
    }

    if (next.phase === 'duel' && type === 'LOCK_THROW') {
      next.currentLocks[seatId] = payload.hand;
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'THROW_LOCKED', seatId });

      if (next.pendingSeatIds.length === 0) {
        const gIdx = next.round - 1;
        const guest = next.gauntlet[gIdx];
        const outcomes = {};
        const guestThrows = {};
        const playerThrows = {};

        for (const sid of next.seatOrder) {
          const pHand = next.currentLocks[sid];
          const gHand = guest.throws[sid];
          const outcome = resolveRps(pHand, gHand);
          outcomes[sid] = outcome;
          guestThrows[sid] = gHand;
          playerThrows[sid] = pHand;

          const p = next.players[sid];
          if (outcome === 'win') {
            p.wins += 1;
            p.currentStreak += 1;
            if (p.currentStreak > p.maxStreak) p.maxStreak = p.currentStreak;
          } else {
            p.currentStreak = 0;
            if (outcome === 'draw') p.draws += 1;
            else p.losses += 1;
          }
        }

        next.history.push({
          round: next.round,
          guestIdx: gIdx,
          playerThrows,
          guestThrows,
          outcomes,
        });
        next.phase = 'reveal';
        next.phaseLabel = { zh: '交锋揭晓', en: 'Clash Reveal' };
        events.push({ type: 'ROUND_REVEALED', round: next.round, outcomes });
      }
      return { state: next, events };
    }

    if (next.phase === 'reveal' && type === 'NEXT_GUEST') {
      checkGauntletEndOrOvertime(next, ctx.rng);
      events.push({ type: next.phase === 'ended' ? 'MATCH_END' : 'NEXT_ROUND', round: next.round });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState, viewerSeatId) {
    if (!fullState) return null;
    const isEnded = fullState.phase === 'ended';
    const isReveal = fullState.phase === 'reveal';

    // Strictly scrub unrevealed guest throws and rival's private lobby/intel/locked hand!
    const safeGauntlet = fullState.gauntlet.map((g, idx) => {
      const revealed = isEnded || idx < fullState.history.length;
      return {
        index: g.index,
        name: g.name,
        avatar: g.avatar,
        archetype: g.archetype,
        publicHint: g.publicHint,
        throws: revealed ? g.throws : null,
      };
    });

    const myLobby = viewerSeatId ? fullState.lobbyAlloc[viewerSeatId] || null : null;
    const myIntel = viewerSeatId ? fullState.privateIntel[viewerSeatId] || {} : {};
    const myLockedHand =
      viewerSeatId && fullState.phase === 'duel' ? fullState.currentLocks[viewerSeatId] || null : null;

    return {
      phase: fullState.phase,
      round: fullState.round,
      isOvertime: fullState.isOvertime,
      lobbyBudget: fullState.lobbyBudget,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      pendingSeatIds: fullState.pendingSeatIds,
      players: fullState.players,
      gauntlet: safeGauntlet,
      myLobby,
      allLobbies: isEnded ? fullState.lobbyAlloc : null,
      myIntel,
      myLockedHand,
      lastClash: isReveal || isEnded ? fullState.history[fullState.history.length - 1] || null : null,
      history: fullState.history,
      winnerSeatIds: fullState.winnerSeatIds,
      winReason: fullState.winReason,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'ended' || fullState.phase === 'reveal') return null;
    if (!fullState.pendingSeatIds.includes(botSeatId)) return null;

    const diff = ctx.difficulty || 'genius';
    const rng = ctx.rng;

    if (fullState.phase === 'lobby') {
      const alloc = new Array(9).fill(0);
      if (diff === 'easy') {
        for (let k = 0; k < fullState.lobbyBudget; k++) {
          alloc[Math.floor(rng() * 9)] += 1;
        }
      } else if (diff === 'genius') {
        // Cluster 3 tokens on 3 consecutive middle guests (#2..#6) to maximize contiguous streak!
        const start = 2 + Math.floor(rng() * 3); // 2, 3, or 4
        alloc[start] = 1;
        alloc[start + 1] = 1;
        alloc[start + 2] = 1;
      } else {
        // Grand Final: finds the highest-reliability 3-guest consecutive window (loyal/mercenary/patterned)
        let bestStart = 2;
        let bestScore = -1;
        for (let s = 1; s <= 5; s++) {
          let sc = 0;
          for (let j = s; j < s + 3; j++) {
            const arch = fullState.gauntlet[j].archetype;
            sc += arch === 'loyal' ? 3 : arch === 'mercenary' ? 2.8 : arch === 'patterned' ? 2.4 : 1.2;
          }
          if (sc > bestScore) {
            bestScore = sc;
            bestStart = s;
          }
        }
        alloc[bestStart] = 1;
        alloc[bestStart + 1] = 1;
        alloc[bestStart + 2] = 1;
      }
      return { type: 'SUBMIT_LOBBY', payload: { allocation: alloc } };
    }

    if (fullState.phase === 'duel') {
      const gIdx = fullState.round - 1;
      const guest = fullState.gauntlet[gIdx];
      const intel = fullState.privateIntel[botSeatId]?.[gIdx];

      // Use private exact reveal first!
      if (intel?.kind === 'exact') {
        if (diff === 'easy' && rng() < 0.25) {
          return { type: 'LOCK_THROW', payload: { hand: HANDS[Math.floor(rng() * 3)] } };
        }
        return { type: 'LOCK_THROW', payload: { hand: COUNTER_OF[intel.hand] } };
      }

      // Use partial elimination tell (2 remaining hands -> pick the one that beats or ties better)
      if (intel?.kind === 'eliminate') {
        const possible = HANDS.filter((h) => h !== intel.notHand);
        // If possible = {A, B}, one beats the other! Playing the one that beats the other guarantees Win or Draw (never loses),
        // EXCEPT in Winning Streak draws break streak too! Still, biasing toward tendency among possible is optimal.
        if (diff !== 'easy' && possible.includes(guest.tendency)) {
          return { type: 'LOCK_THROW', payload: { hand: COUNTER_OF[guest.tendency] } };
        }
        const guess = possible[Math.floor(rng() * possible.length)];
        return { type: 'LOCK_THROW', payload: { hand: COUNTER_OF[guess] } };
      }

      // Otherwise use archetype tendency read
      if (diff === 'grand_final' && (guest.archetype === 'patterned' || guest.archetype === 'contrarian')) {
        return { type: 'LOCK_THROW', payload: { hand: COUNTER_OF[guest.tendency] } };
      }
      if (diff === 'genius' && guest.archetype === 'patterned' && rng() < 0.8) {
        return { type: 'LOCK_THROW', payload: { hand: COUNTER_OF[guest.tendency] } };
      }
      return { type: 'LOCK_THROW', payload: { hand: HANDS[Math.floor(rng() * 3)] } };
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
        return b.maxStreak - a.maxStreak || b.wins - a.wins || a.losses - b.losses;
      })
      .map((p) => ({
        seatId: p.seatId,
        score: p.maxStreak,
        label: `Max ${p.maxStreak} · ${p.wins}W-${p.draws}D-${p.losses}L`,
      }));

    const winName = winnerSeatIds.length ? fullState.players[winnerSeatIds[0]]?.name : '';
    const reasonZh =
      fullState.winReason === 'max_streak'
        ? '凭借更长最高连胜纪录获胜'
        : fullState.winReason === 'total_wins'
        ? '最高连胜战平，凭总胜场数力克对手'
        : fullState.winReason === 'fewest_losses'
        ? '连胜与胜场皆平，凭更少败场晋级'
        : '在加时突然死亡局中一击绝杀';
    const reasonEn =
      fullState.winReason === 'max_streak'
        ? 'wins with the longer unbeaten winning streak'
        : fullState.winReason === 'total_wins'
        ? 'wins the streak tiebreaker on total wins'
        : fullState.winReason === 'fewest_losses'
        ? 'wins the tiebreaker with fewer losses'
        : 'clinches victory in Sudden-Death Overtime';

    return {
      winnerSeatIds,
      rankings,
      summary: {
        zh: `${winName} ${reasonZh}！（最高连胜 ${p0.maxStreak} vs ${p1.maxStreak}）`,
        en: `${winName} ${reasonEn}! (Best Streak ${p0.maxStreak} vs ${p1.maxStreak})`,
      },
    };
  },
};
