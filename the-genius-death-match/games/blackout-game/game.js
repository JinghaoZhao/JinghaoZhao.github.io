/**
 * Blackout Game (暗战游戏) — Persistent Studio Floor-Plan, Veil Crossfade & Operative Glides
 * Zero innerHTML nukes across full match lifecycle; Motion.animateNumber / nudgeError / pulseConfirm.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, OPERATIVE_ROSTER } from './rules.js';

let draftSelectionKey = '';
let draftOperativeIds = new Set();
let lastEvtSig = null;
let latestCtx = null;
let refs = null;
let prevScores = {};

function mountSkeleton(container) {
  const teamBoxHtml = (i) => `
    <div class="bg-team-box" id="bg-team-${i}">
      <div>
        <div id="bg-tname-${i}" style="font-weight:800;font-size:14.5px;"></div>
        <div style="margin-top:4px;">
          <span class="tg-badge" id="bg-trole-${i}"></span>
        </div>
      </div>
      <div class="bg-team-score-wrap" id="bg-tdelta-${i}">
        <div class="bg-team-score" id="bg-tscore-${i}">0</div>
      </div>
    </div>
  `;

  const chambersHtml = OPERATIVE_ROSTER.map(
    (op) => `
      <div class="bg-chamber is-safe-zone" data-op-id="${op.id}">
        <span class="bg-zone-label" id="bg-ztop-${op.id}"></span>
        <div style="height:26px;"></div>
        <div class="bg-operative-token">
          <div class="bg-op-glyph">${op.glyph}</div>
          <div class="bg-op-name" id="bg-opname-${op.id}"></div>
          <div class="bg-op-streak" id="bg-opstreak-${op.id}"></div>
          <div class="bg-streak-dots" id="bg-opdots-${op.id}">
            ${[0, 1, 2, 3].map(() => `<span class="bg-streak-dot"></span>`).join('')}
          </div>
        </div>
      </div>
    `
  ).join('');

  container.innerHTML = `
    <div class="bg-arena">
      <div class="bg-header">
        ${teamBoxHtml(0)}
        <div class="bg-half-badge">
          <span class="tg-badge tg-badge-gold" id="bg-half-pill"></span>
          <span id="bg-round-lbl" style="font-family:var(--tg-font-mono);font-size:13px;font-weight:800;color:var(--tg-ink);"></span>
        </div>
        ${teamBoxHtml(1)}
      </div>

      <div class="bg-studio-floor is-blackout" id="bg-studio-floor">
        <div class="bg-dark-veil" aria-hidden="true"></div>
        <div class="bg-busted-veil" aria-hidden="true"></div>
        <div class="bg-floor-content">
          <div class="bg-floor-topbar">
            <span class="bg-power-pill is-dark" id="bg-power-pill"></span>
            <div class="bg-charges">
              <span id="bg-charges-lbl"></span>
              <span id="bg-charges-cells" style="display:inline-flex;gap:5px;">
                ${[0, 1, 2].map(() => `<span class="bg-charge-cell is-live"></span>`).join('')}
              </span>
            </div>
          </div>

          <div class="bg-chambers-grid" id="bg-chambers-grid">${chambersHtml}</div>
        </div>
      </div>

      <div class="bg-console">
        <div id="bg-console-body"></div>
        <div class="bg-history-strip" id="bg-history-strip" hidden></div>
      </div>
    </div>
  `;

  // Event delegation on persistent 4 chambers
  container.querySelector('#bg-chambers-grid').addEventListener('click', (e) => {
    const ch = e.target.closest('[data-op-id]');
    if (!ch || !ch.classList.contains('is-clickable') || !latestCtx?.state) return;
    const { state, activeSeatId, isSpectator, lang, dispatch } = latestCtx;
    const opId = Number(ch.dataset.opId);
    const isAttackerMe = !isSpectator && activeSeatId === state.attackerSeatId;

    if (state.phase === 'FALSE_ALARM_PICK' && isAttackerMe) {
      SFX.play('garnetClink');
      dispatch({ type: 'PICK_FALSE_ALARM_BONUS', payload: { operativeId: opId } });
      return;
    }

    if (state.phase === 'DARK_PLAN' && isAttackerMe && !state.attackerLocked) {
      SFX.play('click');
      if (draftOperativeIds.has(opId)) draftOperativeIds.delete(opId);
      else draftOperativeIds.add(opId);
      syncDraftVisuals(state, lang);
    }
  });

  // Event delegation on console controls
  container.querySelector('#bg-console-body').addEventListener('click', (e) => {
    if (!latestCtx) return;
    if (e.target.closest('#bg-send-zero')) {
      SFX.play('bid');
      draftOperativeIds.clear();
      latestCtx.dispatch({ type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } });
      return;
    }
    if (e.target.closest('#bg-lock-attack')) {
      SFX.play('bid');
      latestCtx.dispatch({
        type: 'SUBMIT_ATTACK',
        payload: { operativeIds: [...draftOperativeIds] },
      });
      return;
    }
    const redBtn = e.target.closest('#bg-btn-red');
    if (redBtn && !redBtn.disabled) {
      SFX.play('bid');
      latestCtx.dispatch({ type: 'SUBMIT_DEFEND', payload: { button: 'RED' } });
      return;
    }
    const greenBtn = e.target.closest('#bg-btn-green');
    if (greenBtn && !greenBtn.disabled) {
      SFX.play('bid');
      latestCtx.dispatch({ type: 'SUBMIT_DEFEND', payload: { button: 'GREEN' } });
      return;
    }
    if (e.target.closest('#bg-continue-btn')) {
      SFX.play('click');
      latestCtx.dispatch({ type: 'CONTINUE_LIGHTS' });
    }
  });

  container.dataset.mounted = 'bg';
  refs = {
    teams: [0, 1].map((i) => ({
      box: container.querySelector(`#bg-team-${i}`),
      name: container.querySelector(`#bg-tname-${i}`),
      role: container.querySelector(`#bg-trole-${i}`),
      deltaWrap: container.querySelector(`#bg-tdelta-${i}`),
      score: container.querySelector(`#bg-tscore-${i}`),
    })),
    halfPill: container.querySelector('#bg-half-pill'),
    roundLbl: container.querySelector('#bg-round-lbl'),
    studioFloor: container.querySelector('#bg-studio-floor'),
    powerPill: container.querySelector('#bg-power-pill'),
    chargesLbl: container.querySelector('#bg-charges-lbl'),
    chargeCells: Array.from(container.querySelectorAll('#bg-charges-cells .bg-charge-cell')),
    chambers: OPERATIVE_ROSTER.map((op) => {
      const el = container.querySelector(`.bg-chamber[data-op-id="${op.id}"]`);
      return {
        id: op.id,
        el,
        zTop: container.querySelector(`#bg-ztop-${op.id}`),
        opName: container.querySelector(`#bg-opname-${op.id}`),
        opStreak: container.querySelector(`#bg-opstreak-${op.id}`),
        dots: Array.from(container.querySelectorAll(`#bg-opdots-${op.id} .bg-streak-dot`)),
      };
    }),
    consoleBody: container.querySelector('#bg-console-body'),
    historyStrip: container.querySelector('#bg-history-strip'),
    lastConsoleKey: '',
    lastHistLen: -1,
  };
  prevScores = {};
}

function syncDraftVisuals(state, lang) {
  if (!refs) return;
  const selectedList = [...draftOperativeIds].sort((a, b) => a - b);
  refs.chambers.forEach((ch) => {
    const op = state.squad[ch.id];
    const crossed = op.alive && draftOperativeIds.has(ch.id);
    ch.el.classList.toggle('is-crossing', crossed);
    ch.el.classList.toggle('is-safe-zone', !crossed);
    ch.zTop.textContent = crossed
      ? lang === 'zh'
        ? '⚡ 已越过红线'
        : '⚡ CROSSED LINE'
      : lang === 'zh'
      ? '暗区目标带'
      : 'TARGET ZONE';
    ch.zTop.style.color = crossed ? '#67e8f9' : 'rgba(162, 168, 188, 0.75)';
  });

  const lockBtn = refs.consoleBody.querySelector('#bg-lock-attack');
  if (lockBtn) {
    lockBtn.textContent = `⚡ ${
      lang === 'zh'
        ? `锁定潜行方案 (${selectedList.length}人)`
        : `Lock Crossing (${selectedList.length})`
    }`;
  }
  const desc = refs.consoleBody.querySelector('#bg-draft-desc');
  if (desc) {
    const potentialPts = selectedList.reduce((acc, id) => acc + (state.squad[id].crossings + 1), 0);
    desc.textContent =
      selectedList.length === 0
        ? lang === 'zh'
          ? '当前选择：0 人越线（若对手按红钮，你将获 1 次免费越线！）'
          : 'Selected: 0 crossers (Baits a False Alarm freebie if Defender hits RED!)'
        : lang === 'zh'
        ? `已选 ${selectedList.length} 名特工越线 · 若对手按绿钮将获得 +${potentialPts} 分`
        : `Selected ${selectedList.length} crosser(s) · Potential +${potentialPts} pts on GREEN`;
  }
}

mountGame({
  config: {
    id: 'blackout-game',
    title: { zh: '暗战游戏', en: 'Blackout Game', ko: '암전 게임' },
    seasons: ['S2E6'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 死亡对决目标（S2E6 官方 4v4 赛制）
双方轮流担任**进攻方**（率领 4 名特工潜行越线）与**防守方**（掌握 3 次红色警报钮与无限绿色安全钮），上下半场各 **4 回合**，总分高者胜！

### 暗黑部署与计分规则
- **进攻方（潜行越线）**：在熄灯状态下，秘密决定派出 **0 至 4 名**存活特工越过红色激光警戒线。
  - 同一名特工第 1 / 2 / 3 / 4 次成功越线，分别获得 **+1 / +2 / +3 / +4 分**（递增三角积分，单人最高 10 分！）。
- **防守方（红/绿钮判定）**：在黑暗中按下 **红色警报钮**（仅限 3 次！）或 **绿色安全钮**（不限次数）。

### 开灯结算（4 种结果）
- **绿钮 + 有人越线**：完美潜行！所有越线特工全部得分并提升连击等级！
- **绿钮 + 无人越线**：按兵不动，本回合 0 分。
- **红钮（消耗 1 次）+ 有人越线**：🚨 **当场抓捕！** 本回合所有越线特工**永久淘汰**（本半场不得再登场，0 分）！
- **红钮（消耗 1 次）+ 无人越线**：⚠️ **空警报惩罚！** 进攻方立即指定 **1 名存活特工**获得一次免费安全越线得分！`,
      en: `### Objective (Official S2E6 4v4 Format)
Take turns commanding a **4-Operative Squad** in pitch darkness across **Two Halves (4 Rounds each)**. Higher total score wins!

### Blackout Phase (Simultaneous Secret Choice)
- **Attacker**: Secretly choose ANY subset (**0 to 4**) of your ALIVE Operatives to cross the Crimson Laser Line.
  - Escalating triangular scoring per Operative: 1st cross = **+1**, 2nd = **+2**, 3rd = **+3**, 4th = **+4** (max 10 pts each!).
- **Defender**: Press the **RED ALARM BUTTON** (only **3 charges** per half!) or the **GREEN SAFE BUTTON** (unlimited).

### Lights-On Resolution
- **GREEN + Crossers ≥ 1**: SAFE CROSSING! Every crossing Operative levels up and scores **+(c+1)** points!
- **GREEN + 0 Crossers**: Silent Standoff (0 pts).
- **RED (-1 charge) + Crossers ≥ 1**: 🚨 **BUSTED!** Every crossing Operative is permanently **ELIMINATED** for the half (0 pts)!
- **RED (-1 charge) + 0 Crossers**: ⚠️ **FALSE ALARM PENALTY!** The Attacker immediately chooses **1 Alive Operative** for a **FREE safe crossing**!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    latestCtx = ctx;
    const { state, activeSeatId, isSpectator, lang, lastEvent, log } = ctx;
    if (!state) return;

    if (container.dataset.mounted !== 'bg' || !refs || !container.contains(refs.studioFloor)) {
      mountSkeleton(container);
    }

    // Reset local draft selection on round / half / viewer / phase changes
    const curDraftKey = `${state.half}-${state.halfRound}-${activeSeatId}-${state.phase}`;
    if (curDraftKey !== draftSelectionKey) {
      draftSelectionKey = curDraftKey;
      draftOperativeIds = new Set();
    }

    // Audio, Log & Motion cues
    const sig = `${state.half}-${state.halfRound}-${state.phase}-${state.history.length}-${lastEvent?.type || ''}`;
    if (sig !== lastEvtSig && lastEvent) {
      lastEvtSig = sig;
      if (lastEvent.type === 'LIGHTS_BUSTED') {
        SFX.play('laserZap');
        SFX.play('eliminate');
        Motion.nudgeError(refs.studioFloor, { intensity: 'impact' });
        log(
          lang === 'zh'
            ? `🚨 开灯抓捕！${lastEvent.crossers.length} 名越线特工全部淘汰。`
            : `🚨 LIGHTS ON — BUSTED! ${lastEvent.crossers.length} operative(s) eliminated.`,
          'alert'
        );
      } else if (lastEvent.type === 'LIGHTS_SAFE_CROSS') {
        SFX.play('reveal');
        SFX.play(lastEvent.pointsGained >= 4 ? 'combo' : 'garnetClink');
        Motion.pulseConfirm(refs.studioFloor, { tone: 'emerald' });
        log(
          lang === 'zh'
            ? `⚡ 开灯！绿钮放行，进攻方越线斩获 +${lastEvent.pointsGained} 分。`
            : `⚡ LIGHTS ON — SAFE CROSSING! Attacker scores +${lastEvent.pointsGained} pts.`,
          'system'
        );
      } else if (
        lastEvent.type === 'FALSE_ALARM_TRIGGERED' ||
        lastEvent.type === 'LIGHTS_FALSE_ALARM'
      ) {
        SFX.play('clash');
        Motion.nudgeError(refs.studioFloor, { intensity: 'subtle' });
        log(
          lang === 'zh'
            ? '⚠️ 空按红钮！防守方浪费 1 次红钮并罚送进攻方免费越线。'
            : '⚠️ FALSE ALARM! Defender wasted a Red charge & gifted a FREE crossing.',
          'alert'
        );
      } else if (lastEvent.type === 'FALSE_ALARM_AWARDED') {
        SFX.play('garnetClink');
        Motion.pulseConfirm(refs.studioFloor, { tone: 'gold' });
      } else if (lastEvent.type === 'LIGHTS_STANDOFF') {
        SFX.play('reveal');
        log(
          lang === 'zh'
            ? '💡 开灯！绿钮对零越线，双方按兵不动。'
            : '💡 LIGHTS ON — Silent standoff (0 pts).',
          'system'
        );
      } else if (lastEvent.type === 'HALF_SWAPPED') {
        SFX.play('clash');
        Motion.pulseConfirm(refs.halfPill, { tone: 'gold' });
        log(
          lang === 'zh' ? '🔄 攻守互换！下半场暗战开始。' : `🔄 ROLES SWAPPED! Half ${lastEvent.half} begins.`,
          'alert'
        );
      }
    }

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];
    const pair = [p0, p1];
    const attacker = state.players[state.attackerSeatId];
    const defender = state.players[state.defenderSeatId];

    const isAttackerMe = !isSpectator && activeSeatId === state.attackerSeatId;
    const isDefenderMe = !isSpectator && activeSeatId === state.defenderSeatId;
    const isBlackout = state.phase === 'DARK_PLAN';
    const isLightsOn =
      state.phase === 'LIGHTS_ON' || state.phase === 'FALSE_ALARM_PICK' || state.phase === 'ENDED';
    const res = state.lastResolution;
    const isBusted = isLightsOn && res?.outcome === 'BUSTED';

    // 1. Header Scoreboxes with Motion.animateNumber + floating delta pills
    pair.forEach((p, idx) => {
      const t = refs.teams[idx];
      const isAtk = p.seatId === state.attackerSeatId;
      t.box.classList.toggle('is-attacker', isAtk);
      t.box.classList.toggle('is-defender', !isAtk);
      t.name.textContent = `${p.avatar || '♦'} ${p.name}`;
      t.name.style.color = p.color === 'cyan' ? 'var(--tg-cyan-ink)' : 'var(--tg-garnet-ink)';
      t.role.className = `tg-badge ${isAtk ? 'tg-badge-cyan' : 'tg-badge-garnet'}`;
      t.role.textContent = isAtk
        ? lang === 'zh'
          ? '⚔ 进攻方（潜行）'
          : '⚔ ATTACKER'
        : lang === 'zh'
        ? '🛡 防守方（警报）'
        : '🛡 DEFENDER';

      const prevSc = prevScores[p.seatId];
      if (prevSc !== undefined && prevSc !== p.score) {
        Motion.animateNumber(t.score, prevSc, p.score, {
          duration: 320,
          deltaEl: t.deltaWrap,
        });
      } else {
        t.score.textContent = String(p.score);
      }
      prevScores[p.seatId] = p.score;
    });

    refs.halfPill.textContent = state.isOvertime
      ? lang === 'zh'
        ? `骤死加时 H${state.half}`
        : `OVERTIME H${state.half}`
      : lang === 'zh'
      ? `第 ${state.half} / 2 半场`
      : `HALF ${state.half} / 2`;
    refs.roundLbl.textContent =
      lang === 'zh'
        ? `本半场第 ${state.halfRound} / ${state.maxRoundsThisHalf} 轮`
        : `ROUND ${state.halfRound} / ${state.maxRoundsThisHalf}`;

    // 2. Studio Floor Lighting State (GPU opacity veil crossfade!)
    refs.studioFloor.classList.toggle('is-blackout', isBlackout);
    refs.studioFloor.classList.toggle('is-lights-on', isLightsOn && !isBusted);
    refs.studioFloor.classList.toggle('is-busted', isBusted);

    refs.powerPill.className = `bg-power-pill ${isBlackout ? 'is-dark' : 'is-lit'}`;
    refs.powerPill.textContent = isBlackout
      ? lang === 'zh'
        ? '● POWER OFF · 演播室熄灯暗战'
        : '● POWER OFF · BLACKOUT ACTIVE'
      : lang === 'zh'
      ? '☀ LIGHTS ON · 全场开灯揭晓'
      : '☀ LIGHTS ON · FLOODLIGHT REVEAL';

    refs.chargesLbl.textContent =
      lang === 'zh'
        ? `红钮电量 (${state.redCharges}/${state.maxRedCharges})`
        : `RED CHARGES (${state.redCharges}/${state.maxRedCharges})`;
    refs.chargeCells.forEach((cell, i) => {
      cell.hidden = i >= state.maxRedCharges;
      cell.classList.toggle('is-live', i < state.redCharges);
    });

    // 3. Patch Persistent 4 Chambers & Smoothly Glide Operative Tokens Across Laser Line
    const shownCrossers = new Set();
    if (isBlackout && isAttackerMe) {
      if (state.myLockedCrossers) {
        state.myLockedCrossers.forEach((id) => shownCrossers.add(id));
      } else {
        draftOperativeIds.forEach((id) => shownCrossers.add(id));
      }
    } else if (isLightsOn && res?.crossers) {
      res.crossers.forEach((id) => shownCrossers.add(id));
    }

    const canToggleChamber = isBlackout && isAttackerMe && !state.attackerLocked;
    const canPickFalseAlarm = state.phase === 'FALSE_ALARM_PICK' && isAttackerMe;

    refs.chambers.forEach((ch) => {
      const op = state.squad[ch.id];
      const crossed = shownCrossers.has(op.id);
      const bustedHit = isBusted && Boolean(res?.eliminatedIds?.includes(op.id));
      const bonusHit = isLightsOn && res?.bonusOperativeId === op.id;
      const clickable = (canToggleChamber && op.alive) || (canPickFalseAlarm && op.alive);

      ch.el.classList.toggle('is-clickable', clickable);
      ch.el.classList.toggle('is-crossing', crossed);
      ch.el.classList.toggle('is-safe-zone', !crossed);
      ch.el.classList.toggle('is-eliminated', !op.alive && !bustedHit);
      ch.el.classList.toggle('is-busted-hit', bustedHit);
      ch.el.classList.toggle('is-bonus-glow', bonusHit);

      if (clickable) {
        ch.el.setAttribute('role', 'button');
        ch.el.setAttribute('tabindex', '0');
      } else {
        ch.el.removeAttribute('role');
        ch.el.removeAttribute('tabindex');
      }

      ch.zTop.textContent = bustedHit
        ? lang === 'zh'
          ? '🚨 越线被捕!'
          : '🚨 BUSTED!'
        : bonusHit
        ? lang === 'zh'
          ? `★ 免费得分 +${res.pointsGained}`
          : `★ FREE +${res.pointsGained}`
        : crossed
        ? lang === 'zh'
          ? '⚡ 已越过红线'
          : '⚡ CROSSED LINE'
        : lang === 'zh'
        ? '暗区目标带'
        : 'TARGET ZONE';

      ch.zTop.style.color = bustedHit
        ? 'var(--tg-garnet-ink)'
        : crossed || bonusHit
        ? isBlackout
          ? '#67e8f9'
          : 'var(--tg-cyan-ink)'
        : isBlackout
        ? 'rgba(162, 168, 188, 0.72)'
        : 'var(--tg-ink-faint)';

      ch.opName.textContent = `${op.code} · ${lang === 'zh' ? op.zh : op.en}`;
      ch.opStreak.textContent = !op.alive
        ? lang === 'zh'
          ? '✕ 已淘汰'
          : '✕ ELIMINATED'
        : lang === 'zh'
        ? `下次越线 +${op.crossings + 1}分`
        : `NEXT +${op.crossings + 1} PTS`;

      ch.dots.forEach((dot, dIdx) => {
        dot.classList.toggle('is-lit', dIdx < op.crossings);
      });
    });

    // 4. Console Body (rebuild only when phase/role/lock/lang/charges change)
    const consoleKey = [
      state.phase,
      state.half,
      state.halfRound,
      state.attackerLocked,
      state.defenderLocked,
      state.redCharges,
      state.myLockedButton,
      state.myLockedCrossers?.length ?? -1,
      activeSeatId,
      isSpectator,
      lang,
      res?.outcome,
      res?.pointsGained,
      res?.bonusOperativeId,
      attacker.name,
      defender.name,
    ].join('|');

    if (consoleKey !== refs.lastConsoleKey) {
      refs.lastConsoleKey = consoleKey;
      let html = '';
      if (state.phase === 'DARK_PLAN') {
        if (isAttackerMe) {
          if (state.attackerLocked) {
            const count = state.myLockedCrossers?.length || 0;
            html = `
              <div class="bg-attacker-bar">
                <div>
                  <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '潜行指令已锁定' : 'PLAN LOCKED'}</span>
                  <div style="margin-top:6px;font-weight:700;">
                    ${
                      lang === 'zh'
                        ? `已秘密派出 ${count} 名特工越线，等待防守方 ${UI.escapeHtml(defender.name)} 判定...`
                        : `Locked ${count} operative(s) to cross. Waiting for ${UI.escapeHtml(defender.name)}...`
                    }
                  </div>
                </div>
              </div>
            `;
          } else {
            const selectedList = [...draftOperativeIds].sort((a, b) => a - b);
            const potentialPts = selectedList.reduce(
              (acc, id) => acc + (state.squad[id].crossings + 1),
              0
            );
            html = `
              <div class="bg-attacker-bar">
                <div>
                  <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '你是进攻方 · 点击上方特工切换越线' : 'YOU ARE ATTACKER · CLICK CHAMBERS TO CROSS'}</span>
                  <div id="bg-draft-desc" style="margin-top:6px;font-size:14px;color:var(--tg-ink-muted);">
                    ${
                      selectedList.length === 0
                        ? lang === 'zh'
                          ? '当前选择：0 人越线（若对手按红钮，你将获 1 次免费越线！）'
                          : 'Selected: 0 crossers (Baits a False Alarm freebie if Defender hits RED!)'
                        : lang === 'zh'
                        ? `已选 ${selectedList.length} 名特工越线 · 若对手按绿钮将获得 +${potentialPts} 分`
                        : `Selected ${selectedList.length} crosser(s) · Potential +${potentialPts} pts on GREEN`
                    }
                  </div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="button" class="tg-btn tg-btn-ghost" id="bg-send-zero">
                    ${lang === 'zh' ? '全员按兵不动 (0人)' : 'Hold All (0)'}
                  </button>
                  <button type="button" class="tg-btn tg-btn-cyan" id="bg-lock-attack">
                    ⚡ ${lang === 'zh' ? `锁定潜行方案 (${selectedList.length}人)` : `Lock Crossing (${selectedList.length})`}
                  </button>
                </div>
              </div>
            `;
          }
        } else if (isDefenderMe) {
          if (state.defenderLocked) {
            html = `
              <div style="text-align:center;padding:8px;">
                <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '按钮已锁定' : 'BUTTON LOCKED'}</span>
                <div style="margin-top:8px;font-weight:700;">
                  ${
                    lang === 'zh'
                      ? `你已按下 ${state.myLockedButton === 'RED' ? '🔴 红色警报钮' : '🟢 绿色安全钮'}，等待进攻方 ${UI.escapeHtml(attacker.name)} 确认...`
                      : `Locked ${state.myLockedButton === 'RED' ? '🔴 RED ALARM' : '🟢 GREEN SAFE'}. Waiting for ${UI.escapeHtml(attacker.name)}...`
                  }
                </div>
              </div>
            `;
          } else {
            html = `
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '你是防守方 · 黑暗中做出判定' : 'YOU ARE DEFENDER · CALL THE BLACKOUT'}</span>
                <span style="font-size:12px;color:var(--tg-ink-muted);">
                  ${
                    state.attackerLocked
                      ? lang === 'zh'
                        ? '⚡ 进攻方已完成潜行部署'
                        : '⚡ Attacker has locked their move'
                      : lang === 'zh'
                      ? '暗室潜行中...'
                      : 'Movement in the dark...'
                  }
                </span>
              </div>
              <div class="bg-button-duo">
                <button type="button" class="bg-big-btn bg-big-btn-red" id="bg-btn-red" ${state.redCharges <= 0 ? 'disabled' : ''}>
                  <span class="bg-big-btn-title">🚨 ${lang === 'zh' ? '红钮 · 抓捕越线' : 'RED · ALARM'}</span>
                  <span class="bg-big-btn-sub">
                    ${
                      state.redCharges > 0
                        ? lang === 'zh'
                          ? `剩余 ${state.redCharges}/${state.maxRedCharges} 次 · 抓到全淘汰 / 抓空罚送 1 人得分`
                          : `${state.redCharges}/${state.maxRedCharges} left · Busts crossers / False Alarm if 0`
                        : lang === 'zh'
                        ? '红钮已耗尽，仅可按绿钮'
                        : 'NO RED CHARGES LEFT'
                    }
                  </span>
                </button>
                <button type="button" class="bg-big-btn bg-big-btn-green" id="bg-btn-green">
                  <span class="bg-big-btn-title">✓ ${lang === 'zh' ? '绿钮 · 按兵不动' : 'GREEN · HOLD'}</span>
                  <span class="bg-big-btn-sub">
                    ${lang === 'zh' ? '无限次数 · 保留红钮至关键局，但若对方越线将得分' : 'Unlimited · Saves Red charges, allows crossers to score'}
                  </span>
                </button>
              </div>
            `;
          }
        } else {
          html = `
            <div style="text-align:center;color:var(--tg-ink-muted);">
              ${lang === 'zh' ? '暗室部署中，等待双方锁定决定...' : 'Blackout in progress — waiting for both captains to lock...'}
            </div>
          `;
        }
      } else if (state.phase === 'FALSE_ALARM_PICK') {
        html = `
          <div class="bg-outcome-banner is-false">
            <div>
              <strong>⚠️ ${lang === 'zh' ? '开灯！防守方空按红钮（0 人越线）' : 'LIGHTS ON! DEFENDER FALSE ALARM (0 Crossers)'}</strong>
              <div style="font-size:13px;margin-top:4px;">
                ${
                  isAttackerMe
                    ? lang === 'zh'
                      ? '请点击上方任意 1 名存活特工，立即获得免费安全越线得分。'
                      : 'Click any ALIVE Operative above to award a FREE safe crossing.'
                    : lang === 'zh'
                    ? `等待进攻方 ${UI.escapeHtml(attacker.name)} 选择免费得分特工...`
                    : `Waiting for ${UI.escapeHtml(attacker.name)} to pick a bonus operative...`
                }
              </div>
            </div>
          </div>
        `;
      } else if (state.phase === 'LIGHTS_ON' && res) {
        const bannerCls =
          res.outcome === 'BUSTED'
            ? 'is-busted'
            : res.outcome === 'FALSE_ALARM'
            ? 'is-false'
            : 'is-safe';
        let msg = '';
        if (res.outcome === 'BUSTED') {
          msg =
            lang === 'zh'
              ? `🚨 开灯抓捕！防守方按下红钮，抓获并永久淘汰 ${res.eliminatedIds.length} 名越线特工。`
              : `🚨 LIGHTS ON — BUSTED! Defender pressed RED and eliminated ${res.eliminatedIds.length} operative(s).`;
        } else if (res.outcome === 'SAFE_CROSS') {
          msg =
            lang === 'zh'
              ? `⚡ 开灯！防守方按下绿钮，${res.crossers.length} 名特工安全越线，斩获 +${res.pointsGained} 分。`
              : `⚡ LIGHTS ON — SAFE! Defender pressed GREEN; ${res.crossers.length} operative(s) scored +${res.pointsGained} pts.`;
        } else if (res.outcome === 'FALSE_ALARM') {
          const op = state.squad[res.bonusOperativeId];
          msg =
            lang === 'zh'
              ? `⚠️ 空按红钮！${op?.zh || ''} 获赠免费越线，进攻方 +${res.pointsGained} 分。`
              : `⚠️ FALSE ALARM! ${op?.en || ''} awarded FREE crossing for +${res.pointsGained} pts.`;
        } else {
          msg =
            lang === 'zh'
              ? '💡 开灯！防守方按绿钮，进攻方 0 人越线，双方 0 分平收。'
              : '💡 LIGHTS ON — Silent Standoff (GREEN vs 0 crossers, 0 pts).';
        }
        html = `
          <div class="bg-outcome-banner ${bannerCls}">
            <strong>${msg}</strong>
            ${
              !isSpectator
                ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="bg-continue-btn">${lang === 'zh' ? '进入下一回合 →' : 'Next Round →'}</button>`
                : ''
            }
          </div>
        `;
      } else {
        html = `
          <div style="text-align:center;font-weight:700;color:var(--tg-gold-bright);">
            ${lang === 'zh' ? '暗战游戏已结束，查看最终裁决。' : 'Blackout Game concluded.'}
          </div>
        `;
      }
      refs.consoleBody.innerHTML = html;
    }

    // 5. History Strip
    const hist = state.history || [];
    refs.historyStrip.hidden = hist.length === 0;
    if (hist.length !== refs.lastHistLen) {
      refs.lastHistLen = hist.length;
      refs.historyStrip.innerHTML = hist
        .map((h) => {
          const icon =
            h.outcome === 'BUSTED'
              ? '🚨'
              : h.outcome === 'SAFE_CROSS'
              ? '⚡'
              : h.outcome === 'FALSE_ALARM'
              ? '⚠️'
              : '·';
          const clr =
            h.outcome === 'BUSTED'
              ? 'var(--tg-garnet-ink)'
              : h.outcome === 'SAFE_CROSS'
              ? 'var(--tg-emerald-ink)'
              : h.outcome === 'FALSE_ALARM'
              ? 'var(--tg-gold-bright)'
              : 'var(--tg-ink-faint)';
          return `<span class="bg-hist-chip" style="color:${clr};">H${h.half}R${h.halfRound} ${icon} ${h.button} ${h.pointsGained ? `+${h.pointsGained}` : h.outcome === 'BUSTED' ? `-${h.crossers.length}OP` : '0'}</span>`;
        })
        .join('');
    }
  },
});
