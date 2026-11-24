/**
 * Exile Match 2: Spot the Difference (找不同 / 달라진 그림 찾기)
 * Pure deterministic state machine, 3 Ancient Exile Temple Murals,
 * seeded 5-alteration selector, server-authoritative coordinate hit detection,
 * 5s wrong-tap lockout, AI rival racers, and survival ranking.
 */

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MURALS = {
  hieroglyph: {
    id: 'hieroglyph',
    name: { zh: '神殿象形圣壁', en: 'Sacred Hieroglyph Wall' },
    spots: [
      { id: 'sunGem', x: 400, y: 78, r: 40, desc: { zh: '翼日圆盘核心宝石变色', en: 'Winged Sun core jewel changed color' } },
      { id: 'leftStar', x: 165, y: 62, r: 40, desc: { zh: '左上星象增加了一颗星辰', en: 'Extra star appeared in NW constellation' } },
      { id: 'rightMoon', x: 635, y: 62, r: 40, desc: { zh: '右上弯月方向翻转', en: 'NE crescent moon flipped direction' } },
      { id: 'leftPillarBands', x: 96, y: 225, r: 42, desc: { zh: '左石柱缺少一条鎏金刻纹', en: 'Left pillar missing a gold band' } },
      { id: 'rightPillarRune', x: 704, y: 225, r: 42, desc: { zh: '右石柱符文由菱形变为沙漏', en: 'Right pillar rune changed shape' } },
      { id: 'cartouche1', x: 232, y: 215, r: 44, desc: { zh: '第1象形铭牌符文替换', en: '1st cartouche hieroglyph altered' } },
      { id: 'cartouche2', x: 344, y: 215, r: 44, desc: { zh: '第2铭牌荷鲁斯之眼瞳孔异变', en: '2nd cartouche Eye pupil shifted & glowed crimson' } },
      { id: 'cartouche3', x: 456, y: 215, r: 44, desc: { zh: '第3铭牌冠冕星点数目改变', en: '3rd cartouche crown dot count changed' } },
      { id: 'cartouche4', x: 568, y: 215, r: 44, desc: { zh: '第4铭牌金字塔顶石镂空', en: '4th cartouche pyramid capstone hollowed' } },
      { id: 'leftBrazier', x: 178, y: 365, r: 44, desc: { zh: '左侧青铜火盆分裂为双焰', en: 'Left brazier split into twin flames' } },
      { id: 'chalice', x: 400, y: 378, r: 46, desc: { zh: '祭坛圣瓶右侧耳柄缺失', en: 'Center altar amphora lost right handle' } },
      { id: 'rightBrazier', x: 622, y: 365, r: 44, desc: { zh: '右侧火盆火焰转为翠绿幽火', en: 'Right brazier flame turned emerald' } },
      { id: 'baseFrieze', x: 400, y: 464, r: 44, desc: { zh: '基座中央浮雕三角倒置', en: 'Center base frieze triangle inverted' } },
    ],
  },
  scales: {
    id: 'scales',
    name: { zh: '魔鬼天平圣殿', en: 'Devil\'s Scales Sanctum' },
    spots: [
      { id: 'eclipseRing', x: 400, y: 68, r: 40, desc: { zh: '圣殿日蚀光环转为猩红', en: 'Eclipse corona shifted to crimson' } },
      { id: 'leftLantern', x: 175, y: 92, r: 40, desc: { zh: '左侧悬吊火灯熄灭', en: 'Left hanging lantern extinguished' } },
      { id: 'rightLantern', x: 625, y: 102, r: 40, desc: { zh: '右侧悬灯铁链变长下沉', en: 'Right hanging lantern lowered' } },
      { id: 'scaleCrown', x: 400, y: 150, r: 38, desc: { zh: '天平顶饰由菱形变为弯月', en: 'Scale fulcrum finial changed to crescent' } },
      { id: 'leftPanPieces', x: 274, y: 266, r: 46, desc: { zh: '左托盘多出 1 枚恶魔碎片', en: 'Extra Devil\'s Piece appeared on left pan' } },
      { id: 'rightPanWeights', x: 526, y: 266, r: 46, desc: { zh: '右托盘曜石砝码刻字改变', en: 'Right obsidian weight numeral altered' } },
      { id: 'leftObelisk', x: 96, y: 210, r: 42, desc: { zh: '左方尖碑金顶裂纹黯淡', en: 'Left obelisk capstone darkened' } },
      { id: 'rightObelisk', x: 704, y: 270, r: 42, desc: { zh: '右方尖碑铭刻变为圆形', en: 'Right obelisk glyph changed to circle' } },
      { id: 'candelabra', x: 196, y: 394, r: 44, desc: { zh: '左烛台中央烛火消失', en: 'Center candle on left candelabra went out' } },
      { id: 'pedestalGem', x: 400, y: 356, r: 42, desc: { zh: '天平基柱镶嵌宝石变蓝圆', en: 'Scale pedestal gem changed to blue orb' } },
      { id: 'decreeTablet', x: 604, y: 394, r: 44, desc: { zh: '右侧律法石碑多出猩红封印', en: 'Crimson seal added to decree tablet' } },
      { id: 'mosaicCenter', x: 400, y: 462, r: 44, desc: { zh: '地面中心菱砖变为双框空心', en: 'Center floor mosaic tile hollowed' } },
    ],
  },
  astrolabe: {
    id: 'astrolabe',
    name: { zh: '星象浑仪密室', en: 'Astronomical Astrolabe Chamber' },
    spots: [
      { id: 'topCompass', x: 118, y: 88, r: 42, desc: { zh: '左上星盘罗盘变为八芒星', en: 'NW compass star gained 4 extra points' } },
      { id: 'topRightCompass', x: 682, y: 88, r: 42, desc: { zh: '右上月相由满月变为弦月', en: 'NE moon phase changed to crescent' } },
      { id: 'topArcGem', x: 400, y: 74, r: 38, desc: { zh: '浑仪北极蓝宝石转为金珀', en: 'North meridian sapphire turned amber' } },
      { id: 'outerWestGlyph', x: 224, y: 250, r: 40, desc: { zh: '西侧外环古符文替换', en: 'West outer ring glyph altered' } },
      { id: 'outerEastGlyph', x: 576, y: 250, r: 40, desc: { zh: '东侧外环古符文替换', en: 'East outer ring glyph altered' } },
      { id: 'orbitPlanetNW', x: 306, y: 158, r: 40, desc: { zh: '西北轨道行星失去星环', en: 'NW ringed planet lost its ring' } },
      { id: 'orbitPlanetSE', x: 494, y: 342, r: 40, desc: { zh: '东南轨道红星变为翠绿', en: 'SE crimson planet turned emerald' } },
      { id: 'pointerHand', x: 454, y: 220, r: 46, desc: { zh: '浑仪铜指针偏转角度', en: 'Brass astrolabe pointer rotated' } },
      { id: 'centerCore', x: 400, y: 250, r: 36, desc: { zh: '核心太阳芒线减半', en: 'Central sun hub lost half its rays' } },
      { id: 'leftSconce', x: 100, y: 306, r: 44, desc: { zh: '左侧壁灯转为幽蓝冥火', en: 'Left wall sconce burned spectral blue' } },
      { id: 'rightSconce', x: 700, y: 306, r: 44, desc: { zh: '右侧壁灯底座多出一道铜箍', en: 'Right wall sconce gained extra bronze band' } },
      { id: 'baseDial', x: 400, y: 444, r: 44, desc: { zh: '底座日晷罗马数字改变', en: 'Pedestal sundial Roman numeral changed' } },
    ],
  },
};

const MURAL_KEYS = Object.keys(MURALS);
const TARGET_DIFFS = 5;

function pickFiveDiffs(muralId, rng) {
  const spots = MURALS[muralId].spots;
  const shuffled = shuffle(spots, rng);
  const chosen = [];
  for (const sp of shuffled) {
    // Ensure well-separated centers (>= 80px apart) so taps are never ambiguous
    const tooClose = chosen.some((c) => Math.hypot(c.x - sp.x, c.y - sp.y) < 82);
    if (!tooClose) chosen.push(sp);
    if (chosen.length === TARGET_DIFFS) break;
  }
  while (chosen.length < TARGET_DIFFS) {
    const next = shuffled.find((sp) => !chosen.includes(sp));
    if (!next) break;
    chosen.push(next);
  }
  return chosen;
}

function finalizeRemainingIfNeeded(state, now) {
  const seats = state.seatOrder;
  const total = seats.length;
  const finishedCount = state.finishOrder.length;
  const humanSeats = seats.filter((sid) => !state.players[sid].isBot);
  const unfinishedHumans = humanSeats.filter((sid) => !state.players[sid].finished);

  const shouldEnd =
    (total === 1 && finishedCount >= 1) ||
    (total >= 2 && finishedCount >= total - 1) ||
    (total >= 2 && humanSeats.length > 0 && unfinishedHumans.length === 0);

  if (!shouldEnd) return;

  state.phase = 'ended';
  state.endedAtMs = now;

  const remaining = seats
    .filter((sid) => !state.players[sid].finished)
    .sort((a, b) => state.players[b].foundIds.length - state.players[a].foundIds.length);

  for (const sid of remaining) {
    const p = state.players[sid];
    if (total === 1) {
      p.status = 'failed';
    } else if (state.finishOrder.length < total - 1) {
      p.status = 'survived';
      p.finishTimeMs = Math.max(1000, (now - state.huntStartedAtMs) + (TARGET_DIFFS - p.foundIds.length) * 8500);
      state.finishOrder.push(sid);
    } else {
      p.status = 'eliminated';
      state.eliminatedSeatId = sid;
    }
  }

  const survivorLimit = total === 1 ? 1 : total - 1;
  state.finishOrder.forEach((sid, idx) => {
    const p = state.players[sid];
    p.rank = idx + 1;
    p.status = idx < survivorLimit ? 'survived' : 'eliminated';
  });
  state.pendingSeatIds = [];
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const rng = ctx.rng;
    const opts = ctx.options || {};
    const fastMode = Boolean(opts.fastMode);
    const sideBySide = Boolean(opts.sideBySide);
    const muralChoice = opts.mural && MURALS[opts.mural] ? opts.mural : MURAL_KEYS[randInt(rng, 0, MURAL_KEYS.length - 1)];
    const chosenDiffs = pickFiveDiffs(muralChoice, rng);
    const diffIds = chosenDiffs.map((d) => d.id);

    // Build flat variant state maps for original (all 0) and altered (chosen 5 = 1, rest = 0)
    // Sending only the rendered map for the active phase prevents trivial client inspection.
    const allSpots = MURALS[muralChoice].spots;
    const originalVariants = {};
    const alteredVariants = {};
    for (const sp of allSpots) {
      originalVariants[sp.id] = 0;
      alteredVariants[sp.id] = diffIds.includes(sp.id) ? 1 : 0;
    }

    const now = Date.now();
    const memorizeDurationMs = sideBySide ? 0 : fastMode ? 15000 : 25000;
    const huntDurationMs = fastMode ? 120000 : 180000;

    const players = {};
    const seatOrder = seats.map((s) => s.seatId);

    for (const s of seats) {
      const targetTicks = fastMode ? randInt(rng, 22, 42) : randInt(rng, 36, 68);
      players[s.seatId] = {
        seatId: s.seatId,
        name: s.name,
        avatar: s.avatar,
        isBot: Boolean(s.isBot),
        foundIds: [], // ids found by this seat
        foundMarkers: [], // [{ id, x, y, num, desc }]
        wrongTaps: 0,
        lockoutUntilMs: 0,
        finished: false,
        finishTimeMs: null,
        status: 'racing',
        rank: null,
        _botTicks: 0,
        _botTargetTicks: targetTicks,
      };
    }

    return {
      phase: sideBySide ? 'hunt' : 'memorize', // 'memorize' | 'hunt' | 'ended'
      muralId: muralChoice,
      sideBySide,
      fastMode,
      memorizeDurationMs,
      huntDurationMs,
      startedAtMs: now,
      huntStartedAtMs: sideBySide ? now : null,
      endedAtMs: null,
      originalVariants,
      alteredVariants,
      _diffs: chosenDiffs, // stripped in projectState until ended!
      seatOrder,
      pendingSeatIds: seatOrder.slice(),
      finishOrder: [],
      eliminatedSeatId: null,
      players,
    };
  },

  validateAction(fullState, seatId, action) {
    if (!fullState || fullState.phase === 'ended') {
      return { ok: false, reason: 'Match ended' };
    }
    const p = fullState.players[seatId];
    if (!p) return { ok: false, reason: 'Invalid seat' };

    if (action.type === 'SKIP_MEMORIZE') {
      if (fullState.phase !== 'memorize') return { ok: false, reason: 'Not in memorize phase' };
      return { ok: true };
    }

    if (fullState.phase !== 'hunt') {
      return { ok: false, reason: 'Wait for alteration hunt phase' };
    }
    if (p.finished) return { ok: false, reason: 'Already completed' };

    if (action.type === 'BOT_STEP') {
      return p.isBot ? { ok: true } : { ok: false, reason: 'Bot only' };
    }
    if (action.type === 'GIVE_UP') {
      return { ok: true };
    }
    if (action.type === 'TAP_SPOT') {
      if (Date.now() < (p.lockoutUntilMs || 0)) {
        return { ok: false, reason: 'Frozen by penalty' };
      }
      const { x, y } = action.payload || {};
      if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 800 || y < 0 || y > 500) {
        return { ok: false, reason: 'Out of bounds' };
      }
      return { ok: true };
    }
    return { ok: false, reason: 'Unknown action' };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const p = state.players[seatId];
    const now = ctx?.now || Date.now();
    const events = [];

    if (action.type === 'SKIP_MEMORIZE') {
      state.phase = 'hunt';
      state.huntStartedAtMs = now;
      events.push({ type: 'HUNT_START', ts: now });
      return { state, events };
    }

    if (action.type === 'BOT_STEP') {
      p._botTicks += 1;
      const ratio = Math.min(1, p._botTicks / Math.max(1, p._botTargetTicks));
      const targetFound = Math.min(TARGET_DIFFS, Math.floor(ratio * TARGET_DIFFS));
      while (p.foundIds.length < targetFound) {
        const d = state._diffs[p.foundIds.length];
        p.foundIds.push(d.id);
        p.foundMarkers.push({ id: d.id, x: d.x, y: d.y, num: p.foundIds.length, desc: d.desc });
      }
      if (p.foundIds.length >= TARGET_DIFFS) {
        p.finished = true;
        p.finishTimeMs = Math.max(1000, now - (state.huntStartedAtMs || state.startedAtMs));
        p.status = 'survived';
        state.finishOrder.push(seatId);
        state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
        events.push({ type: 'PLAYER_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs });
        finalizeRemainingIfNeeded(state, now);
      }
      return { state, events };
    }

    if (action.type === 'GIVE_UP') {
      p.finished = true;
      p.status = state.seatOrder.length === 1 ? 'failed' : 'eliminated';
      state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
      if (state.seatOrder.length === 1) {
        state.phase = 'ended';
        state.endedAtMs = now;
      } else {
        finalizeRemainingIfNeeded(state, now);
      }
      events.push({ type: 'GIVE_UP', seatId });
      return { state, events };
    }

    if (action.type === 'TAP_SPOT') {
      const { x, y } = action.payload;
      // Check if tap hits an already-found difference -> ignore without penalty!
      const alreadyHit = state._diffs.find(
        (d) => p.foundIds.includes(d.id) && Math.hypot(x - d.x, y - d.y) <= d.r + 8
      );
      if (alreadyHit) {
        return { state, events };
      }

      // Check if tap hits an unfound difference
      const hit = state._diffs.find(
        (d) => !p.foundIds.includes(d.id) && Math.hypot(x - d.x, y - d.y) <= d.r + 10
      );

      if (hit) {
        p.foundIds.push(hit.id);
        const num = p.foundIds.length;
        p.foundMarkers.push({ id: hit.id, x: hit.x, y: hit.y, num, desc: hit.desc });
        events.push({ type: 'SPOT_HIT', seatId, x: hit.x, y: hit.y, num, desc: hit.desc, ts: now });

        if (p.foundIds.length >= TARGET_DIFFS) {
          p.finished = true;
          p.finishTimeMs = Math.max(1000, now - (state.huntStartedAtMs || state.startedAtMs));
          p.status = 'survived';
          state.finishOrder.push(seatId);
          state.pendingSeatIds = state.pendingSeatIds.filter((id) => id !== seatId);
          events.push({ type: 'PLAYER_SOLVED', seatId, name: p.name, finishTimeMs: p.finishTimeMs, ts: now });
          finalizeRemainingIfNeeded(state, now);
        }
      } else {
        p.wrongTaps += 1;
        p.lockoutUntilMs = now + 5000;
        events.push({ type: 'SPOT_MISS', seatId, x, y, lockoutMs: 5000, ts: now });
      }
    }

    return { state, events };
  },

  getPhaseTimer(fullState) {
    if (!fullState || fullState.phase === 'ended') return null;
    if (fullState.phase === 'memorize') {
      return { phaseKey: 'sd-memorize', durationMs: fullState.memorizeDurationMs };
    }
    if (fullState.phase === 'hunt') {
      return { phaseKey: 'sd-hunt', durationMs: fullState.huntDurationMs };
    }
    return null;
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const now = ctx?.now || Date.now();

    if (state.phase === 'memorize') {
      state.phase = 'hunt';
      state.huntStartedAtMs = now;
      return { state, events: [{ type: 'HUNT_START', ts: now }] };
    }

    if (state.phase === 'hunt') {
      state.phase = 'ended';
      state.endedAtMs = now;
      const total = state.seatOrder.length;
      const remaining = state.seatOrder
        .filter((sid) => !state.players[sid].finished)
        .sort((a, b) => state.players[b].foundIds.length - state.players[a].foundIds.length);
      for (const sid of remaining) {
        const p = state.players[sid];
        if (total === 1) p.status = 'failed';
        else if (state.finishOrder.length < total - 1) {
          p.status = 'survived';
          state.finishOrder.push(sid);
        } else {
          p.status = 'eliminated';
          state.eliminatedSeatId = sid;
        }
      }
      state.finishOrder.forEach((sid, i) => {
        state.players[sid].rank = i + 1;
      });
      state.pendingSeatIds = [];
      return { state, events: [{ type: 'TIME_UP', ts: now }] };
    }
    return null;
  },

  computeBotAction(fullState, botSeatId) {
    if (!fullState || fullState.phase !== 'hunt') return null;
    const p = fullState.players[botSeatId];
    if (!p || !p.isBot || p.finished) return null;
    return { type: 'BOT_STEP', payload: {} };
  },

  projectState(fullState, viewerSeatId) {
    const ended = fullState.phase === 'ended';
    const myPlayer = viewerSeatId && fullState.players[viewerSeatId] ? fullState.players[viewerSeatId] : null;
    const canRevealBoth = ended || (myPlayer && myPlayer.finished) || fullState.sideBySide;

    const racers = fullState.seatOrder.map((sid) => {
      const p = fullState.players[sid];
      return {
        seatId: p.seatId,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        foundCount: p.foundIds.length,
        progress: Math.round((p.foundIds.length / TARGET_DIFFS) * 100),
        finished: p.finished,
        finishTimeMs: p.finishTimeMs,
        status: p.status,
        rank: p.rank,
      };
    });

    return {
      phase: fullState.phase,
      muralId: fullState.muralId,
      muralName: MURALS[fullState.muralId].name,
      sideBySide: fullState.sideBySide,
      memorizeDurationMs: fullState.memorizeDurationMs,
      startedAtMs: fullState.startedAtMs,
      huntStartedAtMs: fullState.huntStartedAtMs,
      // Only expose the variant map(s) legitimately visible right now
      originalVariants: fullState.phase === 'memorize' || canRevealBoth ? fullState.originalVariants : null,
      alteredVariants: fullState.phase === 'hunt' || ended ? fullState.alteredVariants : null,
      revealedDiffs: ended || (myPlayer && myPlayer.finished) ? fullState._diffs : null,
      racers,
      finishOrder: fullState.finishOrder,
      eliminatedSeatId: fullState.eliminatedSeatId,
      myState: myPlayer
        ? {
            foundMarkers: myPlayer.foundMarkers,
            foundCount: myPlayer.foundIds.length,
            wrongTaps: myPlayer.wrongTaps,
            lockoutUntilMs: myPlayer.lockoutUntilMs,
            finished: myPlayer.finished,
            finishTimeMs: myPlayer.finishTimeMs,
            status: myPlayer.status,
          }
        : null,
    };
  },

  getResult(fullState) {
    if (!fullState || fullState.phase !== 'ended') return null;
    const total = fullState.seatOrder.length;
    const ordered = fullState.seatOrder.slice().sort((a, b) => {
      const pa = fullState.players[a];
      const pb = fullState.players[b];
      if (pa.finished && pb.finished) return (pa.finishTimeMs || 0) - (pb.finishTimeMs || 0);
      if (pa.finished !== pb.finished) return pa.finished ? -1 : 1;
      return pb.foundIds.length - pa.foundIds.length;
    });

    const rankings = ordered.map((sid, idx) => {
      const p = fullState.players[sid];
      const isElim = total >= 2 && idx === total - 1 && p.status !== 'survived';
      const label = p.finished && p.finishTimeMs != null
        ? `5/5 · ${(p.finishTimeMs / 1000).toFixed(1)}s`
        : `${p.foundIds.length}/5 · ${total === 1 ? 'FAILED' : isElim ? 'ELIMINATED' : 'SURVIVED'}`;
      return { seatId: sid, score: p.foundIds.length, label };
    });

    const winnerSeatIds = total === 1
      ? (fullState.players[ordered[0]].finished ? [ordered[0]] : [])
      : ordered.slice(0, Math.max(1, total - 1)).filter((sid) => fullState.players[sid].status === 'survived');

    const elimName = fullState.eliminatedSeatId ? fullState.players[fullState.eliminatedSeatId]?.name : null;
    return {
      winnerSeatIds,
      rankings,
      summary: total === 1
        ? {
            zh: winnerSeatIds.length ? '5 处壁画异变全部识破！你通过了流放地视觉考验。' : '未能找出全部 5 处壁画差异，点击“查看终局棋盘”对照原图！',
            en: winnerSeatIds.length ? 'All 5 temple alterations spotted! You conquered Exile Match 2.' : 'Could not spot all 5 alterations. Inspect the board for side-by-side reveal.',
          }
        : {
            zh: elimName ? `找不同竞速结束：前 ${total - 1} 名存活，${elimName} 永久淘汰。` : '找不同竞速结束！',
            en: elimName ? `Spot the Difference concludes: Top ${total - 1} survive; ${elimName} is permanently eliminated.` : 'Spot the Difference complete!',
          },
    };
  },
};
