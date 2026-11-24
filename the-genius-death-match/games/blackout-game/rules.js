/**
 * Blackout Game (암전 게임 / 暗战游戏) — Pure Deterministic Rules & 3-Tier AI
 * Season: S2E6 Death Match (Official 4v4 Squad, 4 Rounds per Half, 3 Red Buttons)
 *
 * - Two Halves (roles swap after Half 1):
 *   • Half 1: Seat 0 Attacks (4 Operatives), Seat 1 Defends (3 Red charges + unlimited Green).
 *   • Half 2: Seat 1 Attacks (4 Operatives), Seat 0 Defends (3 Red charges + unlimited Green).
 * - Each Round (simultaneous secret decisions in pitch darkness):
 *   • Attacker secretly picks ANY subset (0..4) of ALIVE Operatives to cross the Crimson Laser Line.
 *   • Defender presses RED BUTTON (if charges > 0: "Someone crossed!") or GREEN BUTTON ("Nobody crossed!").
 * - Lights On Resolution:
 *   • GREEN + Crossers >= 1: Every crossing operative increments streak c -> c+1 and scores +c pts!
 *   • GREEN + 0 Crossers: Safe hold (0 pts, no eliminations).
 *   • RED (-1 charge) + Crossers >= 1: BUSTED! All crossing operatives permanently ELIMINATED!
 *   • RED (-1 charge) + 0 Crossers: FALSE ALARM! Attacker picks 1 Alive Operative for a FREE crossing (+(c+1) pts)!
 * - Higher total score after both halves wins! Tie-breaker: surviving operatives, then sudden-death 1-round shootout.
 */

export const OPERATIVE_ROSTER = [
  { id: 0, code: 'OP-01', zh: '暗影', en: 'Shadow', glyph: '◈' },
  { id: 1, code: 'OP-02', zh: '毒蛇', en: 'Viper', glyph: '❖' },
  { id: 2, code: 'OP-03', zh: '密码', en: 'Cipher', glyph: '⬡' },
  { id: 3, code: 'OP-04', zh: '幻影', en: 'Phantom', glyph: '✦' },
];

export const ROUNDS_PER_HALF = 4;
export const RED_CHARGES_PER_HALF = 3;
export const LIGHTS_ON_MS = 3200;

function createSquad() {
  return OPERATIVE_ROSTER.map((op) => ({
    ...op,
    alive: true,
    crossings: 0,
    totalPoints: 0,
  }));
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function getOtherSeatId(state, seatId) {
  return state.seatOrder.find((id) => id !== seatId) || seatId;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const diff = ctx.difficulty || 'genius';
    const opts = ctx.options || {};

    const s0 = seats[0];
    const s1 = seats[1];
    const firstAttackerIdx = rng() < 0.5 ? 0 : 1;
    const seatOrder = [s0.seatId, s1.seatId];
    const attackerSeatId = seatOrder[firstAttackerIdx];
    const defenderSeatId = seatOrder[1 - firstAttackerIdx];

    const players = {
      [s0.seatId]: {
        seatId: s0.seatId,
        name: s0.name,
        avatar: s0.avatar,
        isBot: Boolean(s0.isBot),
        difficulty: s0.difficulty || diff,
        color: 'cyan',
        score: 0,
        survivorsOnAttack: 0,
        bustsScored: 0,
        falseAlarms: 0,
      },
      [s1.seatId]: {
        seatId: s1.seatId,
        name: s1.name,
        avatar: s1.avatar,
        isBot: Boolean(s1.isBot),
        difficulty: s1.difficulty || diff,
        color: 'garnet',
        score: 0,
        survivorsOnAttack: 0,
        bustsScored: 0,
        falseAlarms: 0,
      },
    };

    return {
      phase: 'DARK_PLAN', // 'DARK_PLAN' | 'FALSE_ALARM_PICK' | 'LIGHTS_ON' | 'ENDED'
      half: 1, // 1, 2 (and 3, 4... for sudden-death overtime if tied)
      isOvertime: false,
      halfRound: 1,
      maxRoundsThisHalf: ROUNDS_PER_HALF,
      round: 1, // Overall round counter 1..8+
      phaseLabel: { zh: '第1半场 · 暗黑潜行部署', en: 'Half 1 · Blackout Deployment' },
      difficulty: diff,
      options: opts,
      seatOrder,
      players,
      attackerSeatId,
      defenderSeatId,
      currentTurnSeatId: null,
      pendingSeatIds: [attackerSeatId, defenderSeatId],
      squad: createSquad(),
      redCharges: RED_CHARGES_PER_HALF,
      maxRedCharges: RED_CHARGES_PER_HALF,
      // Host-only secret submissions during DARK_PLAN (STRICTLY sanitized in projectState!)
      pendingAttackerCrossers: null, // number[] (0..4 operative IDs)
      pendingDefenderButton: null, // 'RED' | 'GREEN'
      lastResolution: null, // Revealed during LIGHTS_ON & FALSE_ALARM_PICK
      history: [],
      winnerSeatId: null,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ENDED') {
      return { ok: false, reason: 'Match already ended' };
    }
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };

    if (action.type === 'CONTINUE_LIGHTS') {
      if (fullState.phase !== 'LIGHTS_ON') {
        return { ok: false, reason: 'Not in Lights On reveal phase' };
      }
      return { ok: true };
    }

    if (action.type === 'SUBMIT_ATTACK') {
      if (fullState.phase !== 'DARK_PLAN') {
        return { ok: false, reason: 'Not in blackout planning phase' };
      }
      if (seatId !== fullState.attackerSeatId) {
        return { ok: false, reason: 'Only the Attacker selects crossers' };
      }
      if (fullState.pendingAttackerCrossers !== null) {
        return { ok: false, reason: 'Crossing plan already locked' };
      }
      const raw = action.payload?.operativeIds;
      if (!Array.isArray(raw)) {
        return { ok: false, reason: 'operativeIds must be an array' };
      }
      const unique = [...new Set(raw.map(Number))];
      for (const id of unique) {
        const op = fullState.squad[id];
        if (!op || !op.alive) {
          return { ok: false, reason: 'Cannot send an eliminated operative' };
        }
      }
      return { ok: true };
    }

    if (action.type === 'SUBMIT_DEFEND') {
      if (fullState.phase !== 'DARK_PLAN') {
        return { ok: false, reason: 'Not in blackout planning phase' };
      }
      if (seatId !== fullState.defenderSeatId) {
        return { ok: false, reason: 'Only the Defender presses Red/Green' };
      }
      if (fullState.pendingDefenderButton !== null) {
        return { ok: false, reason: 'Button already locked' };
      }
      const btn = action.payload?.button;
      if (btn !== 'RED' && btn !== 'GREEN') {
        return { ok: false, reason: 'Button must be RED or GREEN' };
      }
      if (btn === 'RED' && fullState.redCharges <= 0) {
        return { ok: false, reason: 'No Red Button charges remaining!' };
      }
      return { ok: true };
    }

    if (action.type === 'PICK_FALSE_ALARM_BONUS') {
      if (fullState.phase !== 'FALSE_ALARM_PICK') {
        return { ok: false, reason: 'Not in False Alarm selection phase' };
      }
      if (seatId !== fullState.attackerSeatId) {
        return { ok: false, reason: 'Only the Attacker chooses the bonus operative' };
      }
      const id = Number(action.payload?.operativeId);
      const op = fullState.squad[id];
      if (!op || !op.alive) {
        return { ok: false, reason: 'Must pick an Alive Operative' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, _ctx) {
    const next = cloneState(fullState);
    const events = [];

    if (action.type === 'CONTINUE_LIGHTS') {
      return this._advanceAfterLightsOn(next);
    }

    if (action.type === 'SUBMIT_ATTACK') {
      const unique = [...new Set(action.payload.operativeIds.map(Number))].sort((a, b) => a - b);
      next.pendingAttackerCrossers = unique;
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'ATTACKER_LOCKED', seatId });
    } else if (action.type === 'SUBMIT_DEFEND') {
      next.pendingDefenderButton = action.payload.button;
      next.pendingSeatIds = next.pendingSeatIds.filter((id) => id !== seatId);
      events.push({ type: 'DEFENDER_LOCKED', seatId });
    } else if (action.type === 'PICK_FALSE_ALARM_BONUS') {
      const id = Number(action.payload.operativeId);
      const op = next.squad[id];
      op.crossings += 1;
      const pts = op.crossings;
      op.totalPoints += pts;
      next.players[next.attackerSeatId].score += pts;

      next.lastResolution = {
        ...next.lastResolution,
        bonusOperativeId: id,
        pointsGained: pts,
        resolved: true,
      };
      next.history.push({
        half: next.half,
        halfRound: next.halfRound,
        attackerSeatId: next.attackerSeatId,
        defenderSeatId: next.defenderSeatId,
        button: 'RED',
        crossers: [],
        outcome: 'FALSE_ALARM',
        bonusOperativeId: id,
        pointsGained: pts,
      });
      next.phase = 'LIGHTS_ON';
      next.currentTurnSeatId = null;
      next.pendingSeatIds = [];
      next.phaseLabel = {
        zh: `空警报惩罚！${op.zh} 免费得分 +${pts}`,
        en: `FALSE ALARM! ${op.en} Free Cross +${pts} pts`,
      };
      events.push({ type: 'FALSE_ALARM_AWARDED', seatId, operativeId: id, pointsGained: pts });
      return { state: next, events };
    }

    // If BOTH players locked during DARK_PLAN -> LIGHTS ON!
    if (
      next.phase === 'DARK_PLAN' &&
      next.pendingAttackerCrossers !== null &&
      next.pendingDefenderButton !== null
    ) {
      const crossers = next.pendingAttackerCrossers;
      const button = next.pendingDefenderButton;
      const attacker = next.players[next.attackerSeatId];
      const defender = next.players[next.defenderSeatId];

      next.pendingAttackerCrossers = null;
      next.pendingDefenderButton = null;
      next.pendingSeatIds = [];

      if (button === 'RED') {
        next.redCharges = Math.max(0, next.redCharges - 1);

        if (crossers.length > 0) {
          // BUSTED! Eliminate all crossing operatives!
          for (const id of crossers) {
            next.squad[id].alive = false;
          }
          defender.bustsScored += crossers.length;
          next.lastResolution = {
            half: next.half,
            halfRound: next.halfRound,
            button: 'RED',
            crossers,
            outcome: 'BUSTED',
            eliminatedIds: crossers,
            pointsGained: 0,
            resolved: true,
          };
          next.history.push({
            half: next.half,
            halfRound: next.halfRound,
            attackerSeatId: next.attackerSeatId,
            defenderSeatId: next.defenderSeatId,
            button: 'RED',
            crossers,
            outcome: 'BUSTED',
            pointsGained: 0,
          });
          next.phase = 'LIGHTS_ON';
          next.phaseLabel = {
            zh: `🚨 抓捕成功！${crossers.length} 名特工淘汰`,
            en: `🚨 BUSTED! ${crossers.length} Operative${crossers.length > 1 ? 's' : ''} Eliminated`,
          };
          events.push({ type: 'LIGHTS_BUSTED', crossers, defenderSeatId: next.defenderSeatId });
          return { state: next, events };
        }

        // RED + 0 Crossers => FALSE ALARM PENALTY!
        defender.falseAlarms += 1;
        const aliveOps = next.squad.filter((op) => op.alive);
        if (aliveOps.length === 1) {
          // Only 1 alive operative — auto-award free crossing cleanly
          const soloOp = aliveOps[0];
          soloOp.crossings += 1;
          const pts = soloOp.crossings;
          soloOp.totalPoints += pts;
          attacker.score += pts;
          next.lastResolution = {
            half: next.half,
            halfRound: next.halfRound,
            button: 'RED',
            crossers: [],
            outcome: 'FALSE_ALARM',
            bonusOperativeId: soloOp.id,
            pointsGained: pts,
            resolved: true,
          };
          next.history.push({
            half: next.half,
            halfRound: next.halfRound,
            attackerSeatId: next.attackerSeatId,
            defenderSeatId: next.defenderSeatId,
            button: 'RED',
            crossers: [],
            outcome: 'FALSE_ALARM',
            bonusOperativeId: soloOp.id,
            pointsGained: pts,
          });
          next.phase = 'LIGHTS_ON';
          next.phaseLabel = {
            zh: `⚠️ 空按红钮！${soloOp.zh} 自动免费越线 +${pts}分`,
            en: `⚠️ FALSE ALARM! ${soloOp.en} Auto Free Cross +${pts} pts`,
          };
          events.push({ type: 'LIGHTS_FALSE_ALARM', autoOperativeId: soloOp.id, pointsGained: pts });
          return { state: next, events };
        }

        // Attacker chooses which Alive Operative gets the FREE crossing!
        next.phase = 'FALSE_ALARM_PICK';
        next.currentTurnSeatId = next.attackerSeatId;
        next.lastResolution = {
          half: next.half,
          halfRound: next.halfRound,
          button: 'RED',
          crossers: [],
          outcome: 'FALSE_ALARM',
          bonusOperativeId: null,
          pointsGained: 0,
          resolved: false,
        };
        next.phaseLabel = {
          zh: '⚠️ 空按红钮！进攻方任选 1 名存活特工免费得分',
          en: '⚠️ FALSE ALARM! Attacker picks 1 Alive Operative for FREE crossing',
        };
        events.push({ type: 'FALSE_ALARM_TRIGGERED', attackerSeatId: next.attackerSeatId });
        return { state: next, events };
      }

      // GREEN BUTTON
      if (crossers.length > 0) {
        let totalGained = 0;
        const gains = {};
        for (const id of crossers) {
          const op = next.squad[id];
          op.crossings += 1;
          const pts = op.crossings;
          op.totalPoints += pts;
          totalGained += pts;
          gains[id] = pts;
        }
        attacker.score += totalGained;
        next.lastResolution = {
          half: next.half,
          halfRound: next.halfRound,
          button: 'GREEN',
          crossers,
          outcome: 'SAFE_CROSS',
          gains,
          pointsGained: totalGained,
          resolved: true,
        };
        next.history.push({
          half: next.half,
          halfRound: next.halfRound,
          attackerSeatId: next.attackerSeatId,
          defenderSeatId: next.defenderSeatId,
          button: 'GREEN',
          crossers,
          outcome: 'SAFE_CROSS',
          pointsGained: totalGained,
        });
        next.phase = 'LIGHTS_ON';
        next.phaseLabel = {
          zh: `⚡ 完美越线！进攻方斩获 +${totalGained} 分`,
          en: `⚡ SAFE CROSSING! Attacker scores +${totalGained} pts`,
        };
        events.push({ type: 'LIGHTS_SAFE_CROSS', crossers, pointsGained: totalGained });
        return { state: next, events };
      }

      // GREEN + 0 Crossers => Standoff
      next.lastResolution = {
        half: next.half,
        halfRound: next.halfRound,
        button: 'GREEN',
        crossers: [],
        outcome: 'STANDOFF',
        pointsGained: 0,
        resolved: true,
      };
      next.history.push({
        half: next.half,
        halfRound: next.halfRound,
        attackerSeatId: next.attackerSeatId,
        defenderSeatId: next.defenderSeatId,
        button: 'GREEN',
        crossers: [],
        outcome: 'STANDOFF',
        pointsGained: 0,
      });
      next.phase = 'LIGHTS_ON';
      next.phaseLabel = {
        zh: '全员按兵不动 · 本回合 0 分',
        en: 'SILENT STANDOFF · 0 Points',
      };
      events.push({ type: 'LIGHTS_STANDOFF' });
      return { state: next, events };
    }

    return { state: next, events };
  },

  _advanceAfterLightsOn(next) {
    const aliveCount = next.squad.filter((op) => op.alive).length;
    const halfFinished = aliveCount === 0 || next.halfRound >= next.maxRoundsThisHalf;

    if (!halfFinished) {
      next.halfRound += 1;
      next.round += 1;
      next.phase = 'DARK_PLAN';
      next.currentTurnSeatId = null;
      next.pendingSeatIds = [next.attackerSeatId, next.defenderSeatId];
      next.lastResolution = null;
      next.phaseLabel = {
        zh: `第${next.half}半场 · 第${next.halfRound}轮 暗黑部署`,
        en: `Half ${next.half} · R${next.halfRound} Blackout`,
      };
      return { state: next, events: [{ type: 'NEXT_BLACKOUT_ROUND', round: next.round }] };
    }

    // Half finished! Record surviving operatives on attack for tie-breaker #1
    if (next.half <= 2) {
      next.players[next.attackerSeatId].survivorsOnAttack = aliveCount;
    }

    // Check if match ends after even half (Half 2, or Overtime Half 4, 6...)
    if (next.half % 2 === 0) {
      const [id0, id1] = next.seatOrder;
      const p0 = next.players[id0];
      const p1 = next.players[id1];

      if (p0.score !== p1.score) {
        next.phase = 'ENDED';
        next.winnerSeatId = p0.score > p1.score ? id0 : id1;
        next.phaseLabel = { zh: '暗战终局！', en: 'Blackout Concluded!' };
        return { state: next, events: [{ type: 'MATCH_END', winnerSeatId: next.winnerSeatId }] };
      }

      // Tie-breaker 1 (only after regulation Half 2): more surviving operatives on attack
      if (next.half === 2 && p0.survivorsOnAttack !== p1.survivorsOnAttack) {
        next.phase = 'ENDED';
        next.winnerSeatId = p0.survivorsOnAttack > p1.survivorsOnAttack ? id0 : id1;
        next.phaseLabel = { zh: '同分决胜！存活人数胜出', en: 'Tie-Breaker! More Survivors Win' };
        return { state: next, events: [{ type: 'MATCH_END', winnerSeatId: next.winnerSeatId }] };
      }

      // Tie-breaker 2: Launch Sudden-Death 1-Round Shootout (1 Red charge each!)
      next.half += 1;
      next.isOvertime = true;
      next.maxRoundsThisHalf = 1;
      next.maxRedCharges = 1;
      next.redCharges = 1;
    } else {
      // Transition from odd half (Half 1 or OT Half 3) to even half (Half 2 or OT Half 4)
      next.half += 1;
      next.maxRoundsThisHalf = next.isOvertime ? 1 : ROUNDS_PER_HALF;
      next.maxRedCharges = next.isOvertime ? 1 : RED_CHARGES_PER_HALF;
      next.redCharges = next.maxRedCharges;
    }

    // Swap Attacker & Defender roles!
    const oldAttacker = next.attackerSeatId;
    next.attackerSeatId = next.defenderSeatId;
    next.defenderSeatId = oldAttacker;
    next.squad = createSquad();
    next.halfRound = 1;
    next.round += 1;
    next.phase = 'DARK_PLAN';
    next.currentTurnSeatId = null;
    next.pendingSeatIds = [next.attackerSeatId, next.defenderSeatId];
    next.lastResolution = null;
    next.phaseLabel = next.isOvertime
      ? { zh: '加时骤死战 · 攻守互换', en: 'Sudden-Death Overtime · Roles Swapped' }
      : { zh: '下半场 · 攻守互换！', en: 'Half 2 · Roles Swapped!' };

    return {
      state: next,
      events: [{ type: 'HALF_SWAPPED', half: next.half, attackerSeatId: next.attackerSeatId }],
    };
  },

  getPhaseTimer(fullState) {
    if (!fullState) return null;
    if (fullState.phase === 'LIGHTS_ON') {
      return {
        phaseKey: `lights-${fullState.half}-${fullState.halfRound}-${fullState.history.length}`,
        durationMs: LIGHTS_ON_MS,
      };
    }
    return null;
  },

  onPhaseTimeout(fullState) {
    if (!fullState || fullState.phase !== 'LIGHTS_ON') return null;
    const next = cloneState(fullState);
    return this._advanceAfterLightsOn(next);
  },

  projectState(fullState, viewerSeatId) {
    if (!fullState) return null;
    const isAttackerViewer = viewerSeatId === fullState.attackerSeatId;
    const isDefenderViewer = viewerSeatId === fullState.defenderSeatId;

    // STRICTLY protect hidden choices during DARK_PLAN!
    const myLockedCrossers =
      fullState.phase === 'DARK_PLAN' && isAttackerViewer
        ? fullState.pendingAttackerCrossers
        : null;
    const myLockedButton =
      fullState.phase === 'DARK_PLAN' && isDefenderViewer
        ? fullState.pendingDefenderButton
        : null;

    return {
      phase: fullState.phase,
      half: fullState.half,
      isOvertime: fullState.isOvertime,
      halfRound: fullState.halfRound,
      maxRoundsThisHalf: fullState.maxRoundsThisHalf,
      round: fullState.round,
      phaseLabel: fullState.phaseLabel,
      seatOrder: fullState.seatOrder,
      players: fullState.players,
      attackerSeatId: fullState.attackerSeatId,
      defenderSeatId: fullState.defenderSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      pendingSeatIds: fullState.pendingSeatIds,
      squad: fullState.squad,
      redCharges: fullState.redCharges,
      maxRedCharges: fullState.maxRedCharges,
      attackerLocked: fullState.pendingAttackerCrossers !== null,
      defenderLocked: fullState.pendingDefenderButton !== null,
      myLockedCrossers,
      myLockedButton,
      lastResolution: fullState.lastResolution,
      history: fullState.history,
      winnerSeatId: fullState.winnerSeatId,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (!fullState || fullState.phase === 'ENDED') return null;
    const rng = ctx.rng;
    const bot = fullState.players[botSeatId];
    const diff = ctx.difficulty || bot.difficulty || 'genius';

    // 1. False Alarm bonus pick (always pick alive operative with highest current crossings!)
    if (fullState.phase === 'FALSE_ALARM_PICK' && fullState.attackerSeatId === botSeatId) {
      const alive = fullState.squad.filter((op) => op.alive);
      if (alive.length === 0) return null;
      alive.sort((a, b) => b.crossings - a.crossings);
      const chosen = diff === 'easy' ? alive[Math.floor(rng() * alive.length)] : alive[0];
      return { type: 'PICK_FALSE_ALARM_BONUS', payload: { operativeId: chosen.id } };
    }

    if (fullState.phase !== 'DARK_PLAN') return null;

    const roundsLeft = fullState.maxRoundsThisHalf - fullState.halfRound + 1;
    const redLeft = fullState.redCharges;
    const alive = fullState.squad.filter((op) => op.alive);

    // 2. Bot as ATTACKER
    if (botSeatId === fullState.attackerSeatId && fullState.pendingAttackerCrossers === null) {
      // Guaranteed sweep if Defender has 0 Red charges left!
      if (redLeft === 0) {
        return { type: 'SUBMIT_ATTACK', payload: { operativeIds: alive.map((op) => op.id) } };
      }

      if (diff === 'easy') {
        if (rng() < 0.25) return { type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } };
        const count = Math.min(alive.length, 1 + Math.floor(rng() * 2));
        return {
          type: 'SUBMIT_ATTACK',
          payload: { operativeIds: alive.slice(0, count).map((op) => op.id) },
        };
      }

      // Compute exact marginal points of each alive operative
      const sorted = alive.slice().sort((a, b) => b.crossings - a.crossings);
      const maxSingleGain = sorted[0] ? sorted[0].crossings + 1 : 0;
      const fullSquadGain = sorted.reduce((acc, op) => acc + (op.crossings + 1), 0);

      if (roundsLeft === 1) {
        // Exact Nash equilibrium on final round with Red >= 1:
        // Send 0 (wins maxSingleGain vs RED) vs Send ALL (wins fullSquadGain vs GREEN)
        const pSendAll =
          diff === 'grand_final'
            ? maxSingleGain / Math.max(1, fullSquadGain + maxSingleGain)
            : 0.42;
        if (rng() < pSendAll) {
          return { type: 'SUBMIT_ATTACK', payload: { operativeIds: sorted.map((op) => op.id) } };
        }
        return { type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } };
      }

      // Earlier rounds: exploit 3-Red / 4-Round pigeonhole math!
      if (diff === 'grand_final') {
        // When redLeft >= roundsLeft, baiting with 0 has huge EV (drains Red + scores free maxSingleGain)
        const baitProb = redLeft >= roundsLeft ? 0.52 : 0.36;
        const r = rng();
        if (r < baitProb) {
          return { type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } };
        }
        if (r < baitProb + 0.34) {
          // Send 1–2 operatives (protecting top-streak operative or probing with low-streak sacrifice)
          const sacrifice = sorted[sorted.length - 1];
          const second = sorted.length > 2 && rng() < 0.5 ? sorted[sorted.length - 2] : null;
          const picks = second ? [sacrifice.id, second.id] : [sacrifice.id];
          return { type: 'SUBMIT_ATTACK', payload: { operativeIds: picks } };
        }
        // Bold squad surge (2–3 operatives) when Defender expects a bait!
        const surgeCount = Math.min(sorted.length, roundsLeft === 2 ? sorted.length : 2 + (rng() < 0.45 ? 1 : 0));
        return {
          type: 'SUBMIT_ATTACK',
          payload: { operativeIds: sorted.slice(0, surgeCount).map((op) => op.id) },
        };
      }

      // Genius AI
      const r = rng();
      if (r < 0.42) {
        return { type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } };
      }
      if (r < 0.78) {
        const count = Math.min(sorted.length, 1 + (rng() < 0.5 ? 1 : 0));
        return {
          type: 'SUBMIT_ATTACK',
          payload: { operativeIds: sorted.slice(0, count).map((op) => op.id) },
        };
      }
      return { type: 'SUBMIT_ATTACK', payload: { operativeIds: sorted.map((op) => op.id) } };
    }

    // 3. Bot as DEFENDER
    if (botSeatId === fullState.defenderSeatId && fullState.pendingDefenderButton === null) {
      if (redLeft <= 0) {
        return { type: 'SUBMIT_DEFEND', payload: { button: 'GREEN' } };
      }

      if (diff === 'easy') {
        return { type: 'SUBMIT_DEFEND', payload: { button: rng() < 0.8 ? 'RED' : 'GREEN' } };
      }

      const sorted = alive.slice().sort((a, b) => b.crossings - a.crossings);
      const maxSingleGain = sorted[0] ? sorted[0].crossings + 1 : 1;
      const fullSquadGain = sorted.reduce((acc, op) => acc + (op.crossings + 1), 0);

      if (roundsLeft === 1) {
        // Exact Nash mix: p(RED) = fullSquadGain / (fullSquadGain + maxSingleGain)
        const pRed =
          diff === 'grand_final'
            ? fullSquadGain / Math.max(1, fullSquadGain + maxSingleGain)
            : 0.72;
        return { type: 'SUBMIT_DEFEND', payload: { button: rng() < pRed ? 'RED' : 'GREEN' } };
      }

      // Preserve at least 1 Red charge for the final round by mixing Green early!
      const redSurplus = redLeft - (roundsLeft - 1); // >0 if plenty of Red charges
      let pRed = 0.62;
      if (diff === 'grand_final') {
        if (redSurplus >= 1) pRed = 0.74;
        else if (redSurplus === 0) pRed = 0.58;
        else pRed = 0.42;
      } else {
        pRed = redSurplus >= 1 ? 0.72 : 0.55;
      }
      return { type: 'SUBMIT_DEFEND', payload: { button: rng() < pRed ? 'RED' : 'GREEN' } };
    }

    return null;
  },

  getResult(state) {
    if (!state || state.phase !== 'ENDED' || !state.winnerSeatId) return null;
    const winner = state.players[state.winnerSeatId];
    const loserId = state.seatOrder.find((id) => id !== state.winnerSeatId);
    const loser = state.players[loserId];
    const tieBySurvivors = winner.score === loser.score;

    return {
      winnerSeatIds: [state.winnerSeatId],
      rankings: [
        {
          seatId: winner.seatId,
          label: `${winner.name} (${winner.score} pts · ${winner.survivorsOnAttack} alive)`,
          score: winner.score,
        },
        {
          seatId: loser.seatId,
          label: `${loser.name} (${loser.score} pts · ${loser.survivorsOnAttack} alive)`,
          score: loser.score,
        },
      ],
      summary: {
        zh: tieBySurvivors
          ? `双方战成 ${winner.score} : ${loser.score} 平！${winner.name} 凭借更多存活特工（${winner.survivorsOnAttack} vs ${loser.survivorsOnAttack}）惊险胜出！`
          : `${winner.name} 以 ${winner.score} : ${loser.score} 掌控暗黑演播室，赢得暗战游戏！`,
        en: tieBySurvivors
          ? `Tied ${winner.score}–${loser.score}! ${winner.name} wins on surviving operatives (${winner.survivorsOnAttack} vs ${loser.survivorsOnAttack})!`
          : `${winner.name} out-bluffed the darkness ${winner.score}–${loser.score} to win Blackout Game!`,
      },
    };
  },
};
