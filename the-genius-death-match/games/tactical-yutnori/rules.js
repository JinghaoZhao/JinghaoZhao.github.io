/**
 * Tactical Yutnori (전략 윷놀이 / 战略掷柶) — Pure Deterministic Rules & Nash Mixed-Strategy AI
 * Official TV Show Rules: S1E3, S1E4, S1E10, S4E2
 * Zero DOM access. Fully JSON-serializable state.
 */

// 29 Visual Stations on the Korean Yutnori Board (SVG 500x500 coordinate system)
// Node 20 sits visually at Start/Home (430,430) representing a Mal that completed its lap (1 more forward step exits to 99=FINISH).
export const BOARD_NODES = {
  // Outer right edge (bottom-right going UP)
  1:  { x: 430, y: 358, kind: 'outer' },
  2:  { x: 430, y: 286, kind: 'outer' },
  3:  { x: 430, y: 214, kind: 'outer' },
  4:  { x: 430, y: 142, kind: 'outer' },
  5:  { x: 430, y: 70,  kind: 'corner', shortcut: true, label: 'TR' },
  // Outer top edge (going LEFT)
  6:  { x: 358, y: 70,  kind: 'outer' },
  7:  { x: 286, y: 70,  kind: 'outer' },
  8:  { x: 214, y: 70,  kind: 'outer' },
  9:  { x: 142, y: 70,  kind: 'outer' },
  10: { x: 70,  y: 70,  kind: 'corner', shortcut: true, label: 'TL' },
  // Outer left edge (going DOWN)
  11: { x: 70,  y: 142, kind: 'outer' },
  12: { x: 70,  y: 214, kind: 'outer' },
  13: { x: 70,  y: 286, kind: 'outer' },
  14: { x: 70,  y: 358, kind: 'outer' },
  15: { x: 70,  y: 430, kind: 'corner', label: 'BL' },
  // Outer bottom edge (going RIGHT to Start/Home)
  16: { x: 142, y: 430, kind: 'outer' },
  17: { x: 214, y: 430, kind: 'outer' },
  18: { x: 286, y: 430, kind: 'outer' },
  19: { x: 358, y: 430, kind: 'outer' },
  20: { x: 430, y: 430, kind: 'home', label: 'GOAL' },
  // Interior Diagonal A (5 -> 21 -> 22 -> 23 -> 24 -> 25 -> 15)
  21: { x: 370, y: 130, kind: 'diag' },
  22: { x: 310, y: 190, kind: 'diag' },
  23: { x: 250, y: 250, kind: 'center', shortcut: true, label: '★' },
  24: { x: 190, y: 310, kind: 'diag' },
  25: { x: 130, y: 370, kind: 'diag' },
  // Interior Diagonal B (10 -> 26 -> 27 -> 23 -> 28 -> 29 -> 20)
  26: { x: 130, y: 130, kind: 'diag' },
  27: { x: 190, y: 190, kind: 'diag' },
  28: { x: 310, y: 310, kind: 'diag' },
  29: { x: 370, y: 370, kind: 'diag' },
};

export const THROW_TABLE = {
  0: { code: 'MO',      steps: 5,  bonus: true,  zh: '马 (Mo)',     en: 'Mo (+5)',      ko: '모' },
  1: { code: 'BACK_DO', steps: -1, bonus: false, zh: '倒退猪 (-1)', en: 'Back-Do (-1)', ko: '빽도' },
  2: { code: 'GAE',     steps: 2,  bonus: false, zh: '狗 (Gae)',    en: 'Gae (+2)',     ko: '개' },
  3: { code: 'GEOL',    steps: 3,  bonus: false, zh: '羊 (Geol)',   en: 'Geol (+3)',    ko: '걸' },
  4: { code: 'YUT',     steps: 4,  bonus: true,  zh: '牛 (Yut)',    en: 'Yut (+4)',     ko: '윷' },
};

export const FINISH_POS = 99;

// Estimated remaining steps to finish for AI heuristics
const DIST_TO_FINISH = {
  [-1]: 21,
  1: 20, 2: 19, 3: 18, 4: 17, 5: 12,
  6: 15, 7: 14, 8: 13, 9: 12, 10: 7,
  11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
  16: 5, 17: 4, 18: 3, 19: 2, 20: 1,
  21: 11, 22: 10, 23: 4, 24: 8, 25: 7,
  26: 6, 27: 5, 28: 3, 29: 2,
  99: 0,
};

export function computeDestination(pos, prevNode, steps) {
  if (pos === FINISH_POS) return null;

  // Back-Do (-1)
  if (steps === -1) {
    if (pos === -1) return null; // Cannot enter from off-board on Back-Do
    if (pos === 1) {
      // Iconic Tactical Yutnori Back-Do shortcut: step back from Node 1 onto Home (20), ready to exit next forward move!
      return { pos: 20, prevNode: 19 };
    }
    if (pos === 21) return { pos: 5, prevNode: 4 };
    if (pos === 22) return { pos: 21, prevNode: 5 };
    if (pos === 23) {
      return prevNode === 27 ? { pos: 27, prevNode: 26 } : { pos: 22, prevNode: 21 };
    }
    if (pos === 24) return { pos: 23, prevNode: 22 };
    if (pos === 25) return { pos: 24, prevNode: 23 };
    if (pos === 26) return { pos: 10, prevNode: 9 };
    if (pos === 27) return { pos: 26, prevNode: 10 };
    if (pos === 28) return { pos: 23, prevNode: 27 };
    if (pos === 29) return { pos: 28, prevNode: 23 };
    if (pos === 20) {
      return prevNode === 29 ? { pos: 29, prevNode: 28 } : { pos: 19, prevNode: 18 };
    }
    if (pos === 15) {
      return prevNode === 25 ? { pos: 25, prevNode: 24 } : { pos: 14, prevNode: 13 };
    }
    return { pos: pos - 1, prevNode: pos - 2 > 0 ? pos - 2 : 0 };
  }

  // Forward movement (+2, +3, +4, +5)
  if (pos === -1) {
    return { pos: steps, prevNode: steps - 1 };
  }
  if (pos === 20) {
    return { pos: FINISH_POS, prevNode: 20 };
  }

  let cur = pos;
  let prev = prevNode;
  let diagTrack = null; // 'A' (5->21->22->23->24->25->15) or 'B' (10->26->27->23->28->29->20)

  if (cur === 21 || cur === 22 || cur === 24 || cur === 25) diagTrack = 'A';
  else if (cur === 26 || cur === 27 || cur === 28 || cur === 29) diagTrack = 'B';

  for (let i = 0; i < steps; i++) {
    let nextNode;
    if (i === 0 && cur === 5) {
      nextNode = 21;
      diagTrack = 'A';
    } else if (i === 0 && cur === 10) {
      nextNode = 26;
      diagTrack = 'B';
    } else if (i === 0 && cur === 23) {
      nextNode = 28;
      diagTrack = 'B';
    } else if (cur === 20) {
      return { pos: FINISH_POS, prevNode: 20 };
    } else if (cur === 21) {
      nextNode = 22;
    } else if (cur === 22) {
      nextNode = 23;
    } else if (cur === 23) {
      nextNode = diagTrack === 'A' ? 24 : 28;
    } else if (cur === 24) {
      nextNode = 25;
    } else if (cur === 25) {
      nextNode = 15;
      diagTrack = null;
    } else if (cur === 26) {
      nextNode = 27;
    } else if (cur === 27) {
      nextNode = 23;
    } else if (cur === 28) {
      nextNode = 29;
    } else if (cur === 29) {
      nextNode = 20;
    } else {
      nextNode = cur + 1;
    }
    prev = cur;
    cur = nextNode;
  }

  return { pos: cur, prevNode: prev };
}

function createInitialMals(owner) {
  return [
    { id: `m${owner}-c1`, owner, role: 'candidate', label: 'C1', pos: -1, prevNode: null },
    { id: `m${owner}-c2`, owner, role: 'candidate', label: 'C2', pos: -1, prevNode: null },
    { id: `m${owner}-p1`, owner, role: 'partner',   label: 'P1', pos: -1, prevNode: null },
    { id: `m${owner}-p2`, owner, role: 'partner',   label: 'P2', pos: -1, prevNode: null },
  ];
}

export function getLegalMoveOptions(state, owner, throwIdx) {
  const th = state.pendingThrows[throwIdx];
  if (!th) return [];
  const mals = state.mals[owner];
  const options = [];

  // 1. On-board stacks (deduplicated by pos)
  const seenPos = new Set();
  for (const m of mals) {
    if (m.pos >= 1 && m.pos <= 29 && !seenPos.has(m.pos)) {
      seenPos.add(m.pos);
      const dest = computeDestination(m.pos, m.prevNode, th.steps);
      if (dest) {
        const stackCount = mals.filter((x) => x.pos === m.pos).length;
        const hasCandidate = mals.some((x) => x.pos === m.pos && x.role === 'candidate');
        options.push({
          sourceKind: 'board',
          fromPos: m.pos,
          toPos: dest.pos,
          prevNode: dest.prevNode,
          stackCount,
          hasCandidate,
        });
      }
    }
  }

  // 2. Off-board entry (only for forward throws)
  if (th.steps > 0) {
    const offCand = mals.find((m) => m.pos === -1 && m.role === 'candidate');
    const offPart = mals.find((m) => m.pos === -1 && m.role === 'partner');
    const dest = computeDestination(-1, null, th.steps);
    if (dest) {
      if (offCand) {
        options.push({
          sourceKind: 'entry',
          entryRole: 'candidate',
          malId: offCand.id,
          fromPos: -1,
          toPos: dest.pos,
          prevNode: dest.prevNode,
          stackCount: 1,
          hasCandidate: true,
        });
      }
      if (offPart) {
        options.push({
          sourceKind: 'entry',
          entryRole: 'partner',
          malId: offPart.id,
          fromPos: -1,
          toPos: dest.pos,
          prevNode: dest.prevNode,
          stackCount: 1,
          hasCandidate: false,
        });
      }
    }
  }

  return options;
}

function hasAnyLegalThrowMove(state, owner) {
  for (let i = 0; i < state.pendingThrows.length; i++) {
    if (getLegalMoveOptions(state, owner, i).length > 0) return true;
  }
  return false;
}

function checkWinnerOwner(mals) {
  for (let o = 0; o < 2; o++) {
    const candsFinished = mals[o].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length;
    if (candsFinished >= 2) return o;
  }
  return null;
}

// =========================================================================
// AI: Exact 3x3 Matrix Evaluation + Mixed Nash Equilibrium Solver
// =========================================================================

function cloneMals(mals) {
  return [mals[0].map((m) => ({ ...m })), mals[1].map((m) => ({ ...m }))];
}

function scoreBoardForOwner(mals, owner) {
  const opp = 1 - owner;
  const evalSide = (side) => {
    let s = 0;
    const posCounts = {};
    for (const m of mals[side]) {
      const w = m.role === 'candidate' ? 1.0 : 0.42;
      if (m.pos === FINISH_POS) {
        s += m.role === 'candidate' ? 320 : 22;
      } else if (m.pos === -1) {
        s += 0;
      } else {
        const progress = 21 - (DIST_TO_FINISH[m.pos] ?? 10);
        s += progress * 10 * w;
        if (m.pos === 20) s += 95 * w;
        if (m.pos === 23) s += 38 * w;
        if (m.pos === 5 || m.pos === 10) s += 24 * w;
        if (m.pos === 1 && m.role === 'candidate') s += 48; // Threatens Back-Do instant lap!
        posCounts[m.pos] = (posCounts[m.pos] || 0) + 1;
      }
    }
    // Stacking bonus (mild, weighed against capture risk)
    for (const cnt of Object.values(posCounts)) {
      if (cnt >= 2) s += (cnt - 1) * 18;
    }
    return s;
  };
  return evalSide(owner) - evalSide(opp);
}

function simulateBestSingleThrow(mals, owner, throwSpec) {
  const fakeState = { mals, pendingThrows: [{ steps: throwSpec.steps, fromYutMo: throwSpec.bonus }] };
  const opts = getLegalMoveOptions(fakeState, owner, 0);
  if (opts.length === 0) {
    // Wasted Back-Do!
    return { score: scoreBoardForOwner(mals, owner) - 45, opt: null };
  }

  let bestScore = -Infinity;
  let bestOpt = opts[0];
  const opp = 1 - owner;

  for (const opt of opts) {
    const nm = cloneMals(mals);
    let movedIds = [];
    if (opt.sourceKind === 'entry') {
      const m = nm[owner].find((x) => x.id === opt.malId);
      m.pos = opt.toPos;
      m.prevNode = opt.prevNode;
      movedIds.push(m.id);
    } else {
      for (const m of nm[owner]) {
        if (m.pos === opt.fromPos) {
          m.pos = opt.toPos;
          m.prevNode = opt.prevNode;
          movedIds.push(m.id);
        }
      }
    }

    let capturedCount = 0;
    let capturedCand = 0;
    if (opt.toPos !== FINISH_POS) {
      for (const em of nm[opp]) {
        if (em.pos === opt.toPos) {
          capturedCount += 1;
          if (em.role === 'candidate') capturedCand += 1;
          em.pos = -1;
          em.prevNode = null;
        }
      }
    }

    if (checkWinnerOwner(nm) === owner) {
      return { score: 5000, opt };
    }

    let val = scoreBoardForOwner(nm, owner);
    if (capturedCount > 0) {
      val += capturedCount * 55 + capturedCand * 65;
      if (!throwSpec.bonus) val += 55; // Extra turn from capture!
    }
    if (throwSpec.bonus) val += 65; // Yut/Mo bonus throw value

    // Slight danger penalty if landing 2-3 steps ahead of an enemy Mal
    if (opt.toPos !== FINISH_POS && opt.toPos >= 1 && opt.toPos <= 29) {
      const stackSize = nm[owner].filter((x) => x.pos === opt.toPos).length;
      for (const em of nm[opp]) {
        if (em.pos >= 1 && em.pos <= 29) {
          for (const st of [2, 3]) {
            const ed = computeDestination(em.pos, em.prevNode, st);
            if (ed && ed.pos === opt.toPos) {
              val -= stackSize * 26;
            }
          }
        }
      }
    }

    if (val > bestScore) {
      bestScore = val;
      bestOpt = opt;
    }
  }

  return { score: bestScore, opt: bestOpt };
}

/**
 * Fictitious-play mixed Nash solver for a 3x3 zero-sum game matrix M[row][col]
 * where Row player maximizes and Column player minimizes.
 */
function solve3x3Nash(M) {
  const rowCounts = [1, 1, 1];
  const colCounts = [1, 1, 1];
  const iters = 75;

  for (let t = 0; t < iters; t++) {
    // Row best response against empirical Col frequencies
    let bestR = 0;
    let bestRVal = -Infinity;
    for (let r = 0; r < 3; r++) {
      const ev = M[r][0] * colCounts[0] + M[r][1] * colCounts[1] + M[r][2] * colCounts[2];
      if (ev > bestRVal) {
        bestRVal = ev;
        bestR = r;
      }
    }
    // Col best response against empirical Row frequencies
    let bestC = 0;
    let bestCVal = Infinity;
    for (let c = 0; c < 3; c++) {
      const ev = M[0][c] * rowCounts[0] + M[1][c] * rowCounts[1] + M[2][c] * rowCounts[2];
      if (ev < bestCVal) {
        bestCVal = ev;
        bestC = c;
      }
    }
    rowCounts[bestR] += 1;
    colCounts[bestC] += 1;
  }

  const rSum = rowCounts[0] + rowCounts[1] + rowCounts[2];
  const cSum = colCounts[0] + colCounts[1] + colCounts[2];
  return {
    rowProbs: rowCounts.map((x) => x / rSum),
    colProbs: colCounts.map((x) => x / cSum),
  };
}

function sampleWeighted(probs, rng) {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) return i;
  }
  return probs.length - 1;
}

function chooseBotSticks(fullState, botOwner, difficulty, rng) {
  if (difficulty === 'easy') {
    const r = rng();
    return r < 0.25 ? 0 : r < 0.72 ? 1 : 2;
  }

  const active = fullState.turnOwner;
  // Build 3x3 matrix from Active team's perspective
  const cache = {};
  for (let f = 0; f <= 4; f++) {
    cache[f] = simulateBestSingleThrow(fullState.mals, active, THROW_TABLE[f]).score;
  }
  const M = [
    [cache[0], cache[1], cache[2]],
    [cache[1], cache[2], cache[3]],
    [cache[2], cache[3], cache[4]],
  ];

  const { rowProbs, colProbs } = solve3x3Nash(M);
  const probs = botOwner === active ? rowProbs : colProbs;

  if (difficulty === 'genius') {
    // Slightly softened Nash mix
    const mixed = probs.map((p) => p * 0.85 + 0.05);
    const sum = mixed[0] + mixed[1] + mixed[2];
    return sampleWeighted(mixed.map((p) => p / sum), rng);
  }
  // grand_final: pure Nash equilibrium strategy
  return sampleWeighted(probs, rng);
}

function chooseBotMove(fullState, botOwner, difficulty, rng) {
  let best = null;
  let bestScore = -Infinity;

  for (let ti = 0; ti < fullState.pendingThrows.length; ti++) {
    const th = fullState.pendingThrows[ti];
    const opts = getLegalMoveOptions(fullState, botOwner, ti);
    for (const opt of opts) {
      const sim = simulateBestSingleThrow(fullState.mals, botOwner, {
        steps: th.steps,
        bonus: th.fromYutMo,
      });
      // Evaluate this exact option directly
      const nm = cloneMals(fullState.mals);
      const opp = 1 - botOwner;
      if (opt.sourceKind === 'entry') {
        const m = nm[botOwner].find((x) => x.id === opt.malId);
        m.pos = opt.toPos;
        m.prevNode = opt.prevNode;
      } else {
        for (const m of nm[botOwner]) {
          if (m.pos === opt.fromPos) {
            m.pos = opt.toPos;
            m.prevNode = opt.prevNode;
          }
        }
      }
      let captured = 0;
      let capturedCand = 0;
      if (opt.toPos !== FINISH_POS) {
        for (const em of nm[opp]) {
          if (em.pos === opt.toPos) {
            captured += 1;
            if (em.role === 'candidate') capturedCand += 1;
            em.pos = -1;
            em.prevNode = null;
          }
        }
      }
      let score;
      if (checkWinnerOwner(nm) === botOwner) {
        score = 10000;
      } else {
        score = scoreBoardForOwner(nm, botOwner);
        if (captured > 0) {
          score += captured * 65 + capturedCand * 80 + (th.fromYutMo ? 0 : 65);
        }
        // Prefer saving Back-Do if we have a Candidate at 1
        if (opt.toPos === 20 && opt.fromPos === 1 && opt.hasCandidate) {
          score += 240;
        }
        if (difficulty === 'easy') {
          score += (rng() - 0.5) * 90;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = { throwIdx: ti, opt };
      }
      void sim;
    }
  }

  if (!best) return null;
  return {
    type: 'MOVE_MAL',
    payload:
      best.opt.sourceKind === 'entry'
        ? { throwIdx: best.throwIdx, sourceKind: 'entry', entryRole: best.opt.entryRole }
        : { throwIdx: best.throwIdx, sourceKind: 'board', fromPos: best.opt.fromPos },
  };
}

// =========================================================================
// Public SDK Rules Implementation
// =========================================================================

function seatOwner(state, seatId) {
  const s = state.seats.find((x) => x.seatId === seatId);
  return s ? s.owner : -1;
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const cleanSeats = seats.slice(0, 2).map((s, idx) => ({
      seatId: s.seatId,
      name: s.name,
      avatar: s.avatar,
      isBot: Boolean(s.isBot),
      owner: idx,
    }));
    const firstTurn = ctx.rng() < 0.5 ? 0 : 1;

    return {
      seats: cleanSeats,
      phase: 'STICK_SELECT', // 'STICK_SELECT' | 'MOVE' | 'ended'
      round: 1,
      turnOwner: firstTurn,
      currentTurnSeatId: cleanSeats[firstTurn].seatId,
      pendingSeatIds: [cleanSeats[0].seatId, cleanSeats[1].seatId],
      phaseLabel: { zh: '秘密择柶', en: 'Secret Stick Pick' },
      mals: [createInitialMals(0), createInitialMals(1)],
      stickChoices: [null, null], // 0 | 1 | 2 Flats secretly locked by each team
      pendingThrows: [], // Array<{ id, code, steps, fromYutMo, zh, en }>
      chainCount: 0,
      captureBonusQueued: 0,
      throwSeq: 0,
      lastReveal: null, // { activeOwner, activeFlats, defFlats, totalFlats, spec, wasted, seq }
      lastMoveInfo: null, // { owner, fromPos, toPos, capturedCount, finishedCount, stackedCount, seq }
      winnerOwner: null,
      winnerSeatId: null,
      history: [],
    };
  },

  validateAction(fullState, seatId, action) {
    if (fullState.phase === 'ended') {
      return { ok: false, reason: 'Match already ended' };
    }
    const owner = seatOwner(fullState, seatId);
    if (owner === -1) return { ok: false, reason: 'Unknown seat' };
    const p = action?.payload || {};

    if (action.type === 'SELECT_STICKS') {
      if (fullState.phase !== 'STICK_SELECT') {
        return { ok: false, reason: 'Not in stick selection phase' };
      }
      if (fullState.stickChoices[owner] !== null) {
        return { ok: false, reason: 'Sticks already locked for this throw' };
      }
      if (![0, 1, 2].includes(p.flats)) {
        return { ok: false, reason: 'Must choose 0, 1, or 2 Flat sticks' };
      }
      return { ok: true };
    }

    if (action.type === 'MOVE_MAL') {
      if (fullState.phase !== 'MOVE') {
        return { ok: false, reason: 'Not in movement phase' };
      }
      if (owner !== fullState.turnOwner) {
        return { ok: false, reason: 'Not your turn to move' };
      }
      const ti = p.throwIdx;
      if (!Number.isInteger(ti) || ti < 0 || ti >= fullState.pendingThrows.length) {
        return { ok: false, reason: 'Invalid throw card' };
      }
      const opts = getLegalMoveOptions(fullState, owner, ti);
      const match = opts.find((o) =>
        p.sourceKind === 'entry'
          ? o.sourceKind === 'entry' && o.entryRole === p.entryRole
          : o.sourceKind === 'board' && o.fromPos === p.fromPos
      );
      if (!match) {
        return { ok: false, reason: 'Illegal Mal move for this throw' };
      }
      return { ok: true };
    }

    return { ok: false, reason: 'Unknown action type' };
  },

  applyAction(fullState, seatId, action) {
    const next = structuredClone(fullState);
    const owner = seatOwner(next, seatId);
    const p = action.payload || {};
    const events = [];

    if (action.type === 'SELECT_STICKS') {
      next.stickChoices[owner] = p.flats;
      next.pendingSeatIds = next.seats
        .filter((s) => next.stickChoices[s.owner] === null)
        .map((s) => s.seatId);

      // Wait if other player has not locked yet
      if (next.stickChoices[0] === null || next.stickChoices[1] === null) {
        events.push({ type: 'STICK_LOCKED', owner });
        return { state: next, events };
      }

      // Both teams locked -> Reveal!
      const active = next.turnOwner;
      const def = 1 - active;
      const activeFlats = next.stickChoices[active];
      const defFlats = next.stickChoices[def];
      const totalFlats = activeFlats + defFlats;
      const spec = THROW_TABLE[totalFlats];
      next.throwSeq += 1;

      next.pendingThrows.push({
        id: next.throwSeq,
        code: spec.code,
        steps: spec.steps,
        fromYutMo: spec.bonus,
        zh: spec.zh,
        en: spec.en,
      });

      next.stickChoices = [null, null];

      // Bonus throw on Yut (4) or Mo (5) (cap chain at 3 to keep turns crisp)
      if (spec.bonus && next.chainCount < 3) {
        next.chainCount += 1;
        next.phase = 'STICK_SELECT';
        next.pendingSeatIds = [next.seats[0].seatId, next.seats[1].seatId];
        next.phaseLabel = { zh: '连掷奖励 · 秘密择柶', en: 'Bonus Throw · Pick Sticks' };
        next.lastReveal = {
          activeOwner: active,
          activeFlats,
          defFlats,
          totalFlats,
          spec,
          wasted: false,
          bonusTriggered: true,
          seq: next.throwSeq,
        };
        next.history.push({
          seq: next.throwSeq,
          owner: active,
          kind: 'throw',
          code: spec.code,
          steps: spec.steps,
          activeFlats,
          defFlats,
          bonus: true,
        });
        if (next.history.length > 20) next.history.shift();
        events.push({ type: 'YUT_MO_BONUS', totalFlats, code: spec.code });
        return { state: next, events };
      }

      // Check if any pending throw is actually playable
      if (!hasAnyLegalThrowMove(next, active)) {
        // E.g. Back-Do thrown with 0 Mals on board -> wasted turn!
        next.pendingThrows = [];
        next.lastReveal = {
          activeOwner: active,
          activeFlats,
          defFlats,
          totalFlats,
          spec,
          wasted: true,
          bonusTriggered: false,
          seq: next.throwSeq,
        };
        next.history.push({
          seq: next.throwSeq,
          owner: active,
          kind: 'wasted',
          code: spec.code,
          steps: spec.steps,
          activeFlats,
          defFlats,
        });
        if (next.history.length > 20) next.history.shift();

        // Advance turn to opponent
        next.turnOwner = def;
        next.currentTurnSeatId = next.seats[def].seatId;
        next.chainCount = 0;
        next.captureBonusQueued = 0;
        next.round += 1;
        next.phase = 'STICK_SELECT';
        next.pendingSeatIds = [next.seats[0].seatId, next.seats[1].seatId];
        next.phaseLabel = { zh: '秘密择柶', en: 'Secret Stick Pick' };
        events.push({ type: 'BACK_DO_WASTED', owner: active });
        return { state: next, events };
      }

      // Proceed to MOVE phase
      next.phase = 'MOVE';
      next.pendingSeatIds = [];
      next.currentTurnSeatId = next.seats[active].seatId;
      next.phaseLabel = { zh: '棋子行进', en: 'Move Mal' };
      next.lastReveal = {
        activeOwner: active,
        activeFlats,
        defFlats,
        totalFlats,
        spec,
        wasted: false,
        bonusTriggered: false,
        seq: next.throwSeq,
      };
      next.history.push({
        seq: next.throwSeq,
        owner: active,
        kind: 'throw',
        code: spec.code,
        steps: spec.steps,
        activeFlats,
        defFlats,
        bonus: false,
      });
      if (next.history.length > 20) next.history.shift();
      events.push({ type: 'STICKS_REVEALED', totalFlats, code: spec.code });
      return { state: next, events };
    }

    if (action.type === 'MOVE_MAL') {
      const ti = p.throwIdx;
      const th = next.pendingThrows[ti];
      const opts = getLegalMoveOptions(next, owner, ti);
      const chosen = opts.find((o) =>
        p.sourceKind === 'entry'
          ? o.sourceKind === 'entry' && o.entryRole === p.entryRole
          : o.sourceKind === 'board' && o.fromPos === p.fromPos
      );

      // Consume this throw card
      next.pendingThrows.splice(ti, 1);

      const opp = 1 - owner;
      let movedCount = 0;
      if (chosen.sourceKind === 'entry') {
        const m = next.mals[owner].find((x) => x.id === chosen.malId);
        m.pos = chosen.toPos;
        m.prevNode = chosen.prevNode;
        movedCount = 1;
      } else {
        for (const m of next.mals[owner]) {
          if (m.pos === chosen.fromPos) {
            m.pos = chosen.toPos;
            m.prevNode = chosen.prevNode;
            movedCount += 1;
          }
        }
      }

      // Check capture (cannot capture on FINISH_POS)
      let capturedCount = 0;
      if (chosen.toPos !== FINISH_POS) {
        for (const em of next.mals[opp]) {
          if (em.pos === chosen.toPos) {
            em.pos = -1;
            em.prevNode = null;
            capturedCount += 1;
          }
        }
      }

      // S4 Official Rule: Capturing grants 1 bonus throw ONLY if NOT achieved via a Yut/Mo throw
      const earnedCaptureBonus = capturedCount > 0 && !th.fromYutMo;
      if (earnedCaptureBonus) {
        next.captureBonusQueued += 1;
      }

      const stackedCount =
        chosen.toPos !== FINISH_POS
          ? next.mals[owner].filter((x) => x.pos === chosen.toPos).length
          : 0;

      next.throwSeq += 1;
      next.lastMoveInfo = {
        owner,
        fromPos: chosen.fromPos,
        toPos: chosen.toPos,
        movedCount,
        capturedCount,
        stackedCount,
        earnedCaptureBonus,
        seq: next.throwSeq,
      };

      // Check immediate win (both Candidate Mals finished!)
      const winOwner = checkWinnerOwner(next.mals);
      if (winOwner !== null) {
        next.phase = 'ended';
        next.winnerOwner = winOwner;
        next.winnerSeatId = next.seats[winOwner].seatId;
        next.currentTurnSeatId = null;
        next.pendingSeatIds = [];
        next.pendingThrows = [];
        next.phaseLabel = { zh: '主将冲线', en: 'Victory!' };
        events.push({ type: 'MAL_FINISH_WIN', owner: winOwner });
        return { state: next, events };
      }

      // Prune any remaining throws that now have 0 legal moves (e.g. Back-Do left when board emptied)
      next.pendingThrows = next.pendingThrows.filter((_, idx) => getLegalMoveOptions(next, owner, idx).length > 0);

      if (next.pendingThrows.length > 0) {
        events.push({
          type: capturedCount > 0 ? 'CAPTURE' : chosen.toPos === FINISH_POS ? 'MAL_SCORED' : 'MAL_MOVE',
          owner,
          capturedCount,
          earnedCaptureBonus,
        });
        return { state: next, events };
      }

      // All throws applied -> check capture bonus turn!
      if (next.captureBonusQueued > 0) {
        next.captureBonusQueued -= 1;
        next.chainCount = 0;
        next.phase = 'STICK_SELECT';
        next.stickChoices = [null, null];
        next.pendingSeatIds = [next.seats[0].seatId, next.seats[1].seatId];
        next.currentTurnSeatId = next.seats[owner].seatId;
        next.phaseLabel = { zh: '捕获奖励 · 再掷一轮', en: 'Capture Bonus Throw' };
        events.push({ type: 'CAPTURE_BONUS_TURN', owner, capturedCount });
        return { state: next, events };
      }

      // Pass turn to opponent
      next.turnOwner = opp;
      next.currentTurnSeatId = next.seats[opp].seatId;
      next.chainCount = 0;
      next.round += 1;
      next.phase = 'STICK_SELECT';
      next.stickChoices = [null, null];
      next.pendingSeatIds = [next.seats[0].seatId, next.seats[1].seatId];
      next.phaseLabel = { zh: '秘密择柶', en: 'Secret Stick Pick' };
      events.push({
        type: capturedCount > 0 ? 'CAPTURE' : chosen.toPos === FINISH_POS ? 'MAL_SCORED' : 'MAL_MOVE',
        owner,
        capturedCount,
      });
      return { state: next, events };
    }

    return { state: next, events };
  },

  projectState(fullState, viewerSeatId) {
    const view = structuredClone(fullState);
    const viewerOwner = viewerSeatId ? seatOwner(view, viewerSeatId) : -1;
    // Hide opponent's secret stick choice during STICK_SELECT
    if (view.phase === 'STICK_SELECT') {
      view.stickChoices = view.stickChoices.map((choice, idx) => {
        if (idx === viewerOwner) return choice;
        return choice === null ? null : 'LOCKED';
      });
    }
    return view;
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase === 'ended') return null;
    const botOwner = seatOwner(fullState, botSeatId);
    if (botOwner === -1) return null;
    const diff = ctx.difficulty || 'genius';

    if (fullState.phase === 'STICK_SELECT') {
      if (fullState.stickChoices[botOwner] !== null) return null;
      const flats = chooseBotSticks(fullState, botOwner, diff, ctx.rng);
      return { type: 'SELECT_STICKS', payload: { flats } };
    }

    if (fullState.phase === 'MOVE' && fullState.turnOwner === botOwner) {
      return chooseBotMove(fullState, botOwner, diff, ctx.rng);
    }

    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'ended' || fullState.winnerSeatId == null) return null;
    const w = fullState.winnerOwner;
    const l = 1 - w;
    const wDone = fullState.mals[w].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length;
    const lDone = fullState.mals[l].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length;

    return {
      winnerSeatIds: [fullState.winnerSeatId],
      rankings: [
        { seatId: fullState.seats[w].seatId, label: `${wDone}/2`, score: wDone },
        { seatId: fullState.seats[l].seatId, label: `${lDone}/2`, score: lDone },
      ],
      summary: {
        zh: `${fullState.seats[w].name} 率先将 2 枚主将棋子送达终点，赢得战略掷柶死亡对决！`,
        en: `${fullState.seats[w].name} raced both Candidate Mals past the Goal to win Tactical Yutnori!`,
      },
    };
  },
};
