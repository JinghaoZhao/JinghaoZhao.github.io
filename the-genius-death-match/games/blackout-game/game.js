/**
 * Blackout Game (暗战游戏) — Illuminated Studio Floor-Plan & Red/Green Broadcast Console
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

// Client-local draft selection for the Attacker before locking
let draftSelectionKey = '';
let draftOperativeIds = new Set();
let lastEvtSig = null;

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
    const { state, activeSeatId, isSpectator, lang, lastEvent, dispatch, log } = ctx;
    if (!state) return;

    // Reset local draft selection whenever round/half/viewer changes
    const curDraftKey = `${state.half}-${state.halfRound}-${activeSeatId}-${state.phase}`;
    if (curDraftKey !== draftSelectionKey) {
      draftSelectionKey = curDraftKey;
      draftOperativeIds = new Set();
    }

    // Audio & Broadcast Log feedback
    const sig = `${state.half}-${state.halfRound}-${state.phase}-${state.history.length}-${lastEvent?.type || ''}`;
    if (sig !== lastEvtSig && lastEvent) {
      lastEvtSig = sig;
      if (lastEvent.type === 'LIGHTS_BUSTED') {
        SFX.play('laserZap');
        SFX.play('eliminate');
        log(
          lang === 'zh'
            ? `🚨 开灯抓捕！${lastEvent.crossers.length} 名越线特工全部淘汰！`
            : `🚨 LIGHTS ON — BUSTED! ${lastEvent.crossers.length} crossing operative(s) eliminated!`,
          'alert'
        );
      } else if (lastEvent.type === 'LIGHTS_SAFE_CROSS') {
        SFX.play('reveal');
        SFX.play(lastEvent.pointsGained >= 4 ? 'combo' : 'garnetClink');
        log(
          lang === 'zh'
            ? `⚡ 开灯！绿钮放行，进攻方完美越线斩获 +${lastEvent.pointsGained} 分！`
            : `⚡ LIGHTS ON — SAFE CROSSING! Attacker scores +${lastEvent.pointsGained} pts!`,
          'system'
        );
      } else if (lastEvent.type === 'FALSE_ALARM_TRIGGERED' || lastEvent.type === 'LIGHTS_FALSE_ALARM') {
        SFX.play('clash');
        log(
          lang === 'zh'
            ? `⚠️ 空按红钮！防守方浪费 1 次红钮并罚送进攻方免费越线！`
            : `⚠️ FALSE ALARM! Defender wasted a Red charge & gifted a FREE crossing!`,
          'alert'
        );
      } else if (lastEvent.type === 'FALSE_ALARM_AWARDED') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'LIGHTS_STANDOFF') {
        SFX.play('reveal');
        log(
          lang === 'zh' ? `💡 开灯！绿钮对零越线，双方按兵不动。` : `💡 LIGHTS ON — Silent standoff (0 pts).`,
          'system'
        );
      } else if (lastEvent.type === 'HALF_SWAPPED') {
        SFX.play('clash');
        log(
          lang === 'zh' ? `🔄 攻守互换！下半场暗战开始。` : `🔄 ROLES SWAPPED! Half ${lastEvent.half} begins.`,
          'alert'
        );
      }
    }

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];
    const attacker = state.players[state.attackerSeatId];
    const defender = state.players[state.defenderSeatId];

    const isAttackerMe = !isSpectator && activeSeatId === state.attackerSeatId;
    const isDefenderMe = !isSpectator && activeSeatId === state.defenderSeatId;
    const isBlackout = state.phase === 'DARK_PLAN';
    const isLightsOn = state.phase === 'LIGHTS_ON' || state.phase === 'FALSE_ALARM_PICK' || state.phase === 'ENDED';
    const res = state.lastResolution;
    const isBusted = isLightsOn && res?.outcome === 'BUSTED';

    // Determine which operatives appear across the laser line right now
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

    // 4-Chamber Studio Grid HTML
    const chambersHtml = state.squad
      .map((op) => {
        const crossed = shownCrossers.has(op.id);
        const bustedHit = isBusted && res?.eliminatedIds?.includes(op.id);
        const bonusHit = isLightsOn && res?.bonusOperativeId === op.id;
        const clickable = (canToggleChamber && op.alive) || (canPickFalseAlarm && op.alive);

        const cls = ['bg-chamber'];
        if (clickable) cls.push('is-clickable');
        if (crossed) cls.push('is-crossing');
        else cls.push('is-safe-zone');
        if (!op.alive && !bustedHit) cls.push('is-eliminated');
        if (bustedHit) cls.push('is-busted-hit');
        if (bonusHit) cls.push('is-bonus-glow');

        const nextPts = op.crossings + 1;
        const dotsHtml = [0, 1, 2, 3]
          .map((i) => `<span class="bg-streak-dot ${i < op.crossings ? 'is-lit' : ''}"></span>`)
          .join('');

        const tokenMarkup = `
          <div class="bg-operative-token">
            <div class="bg-op-glyph">${op.glyph}</div>
            <div class="bg-op-name">${op.code} · ${lang === 'zh' ? op.zh : op.en}</div>
            <div class="bg-op-streak">
              ${
                !op.alive
                  ? lang === 'zh'
                    ? '✕ 已淘汰'
                    : '✕ ELIMINATED'
                  : lang === 'zh'
                  ? `下次越线 +${nextPts}分`
                  : `NEXT +${nextPts} PTS`
              }
            </div>
            <div class="bg-streak-dots">${dotsHtml}</div>
          </div>
        `;

        const topZoneText = bustedHit
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

        const bottomZoneText =
          !crossed && op.alive
            ? lang === 'zh'
              ? '安全待命区'
              : 'HOLD ZONE'
            : op.alive
            ? ''
            : lang === 'zh'
            ? '离线'
            : 'OUT';

        return `
          <div class="${cls.join(' ')}" ${clickable ? `data-op-id="${op.id}" role="button" tabindex="0"` : ''}>
            <span class="bg-zone-label" style="color:${bustedHit ? '#ff8ba0' : crossed || bonusHit ? '#67e8f9' : 'var(--tg-ink-faint)'};">${topZoneText}</span>
            <div style="height:26px;"></div>
            ${tokenMarkup}
          </div>
        `;
      })
      .join('');

    // Red charge capacitors
    const chargesHtml = Array.from({ length: state.maxRedCharges }, (_, i) => {
      return `<span class="bg-charge-cell ${i < state.redCharges ? 'is-live' : ''}"></span>`;
    }).join('');

    // Bottom Action Console HTML
    let consoleHtml = '';
    if (state.phase === 'DARK_PLAN') {
      if (isAttackerMe) {
        if (state.attackerLocked) {
          const count = state.myLockedCrossers?.length || 0;
          consoleHtml = `
            <div class="bg-attacker-bar">
              <div>
                <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '潜行指令已锁定' : 'PLAN LOCKED'}</span>
                <div style="margin-top:6px;font-weight:700;">
                  ${
                    lang === 'zh'
                      ? `你已秘密派出 ${count} 名特工越线，等待防守方 ${UI.escapeHtml(defender.name)} 按钮判定...`
                      : `Locked ${count} operative(s) to cross. Waiting for ${UI.escapeHtml(defender.name)}...`
                  }
                </div>
              </div>
            </div>
          `;
        } else {
          const selectedList = [...draftOperativeIds].sort((a, b) => a - b);
          const potentialPts = selectedList.reduce((acc, id) => acc + (state.squad[id].crossings + 1), 0);
          consoleHtml = `
            <div class="bg-attacker-bar">
              <div>
                <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '你是进攻方 · 点击上方特工切换越线' : 'YOU ARE ATTACKER · CLICK CHAMBERS TO CROSS'}</span>
                <div style="margin-top:6px;font-size:14px;color:var(--tg-ink-muted);">
                  ${
                    selectedList.length === 0
                      ? lang === 'zh'
                        ? '当前选择：0 人越线（若对手按红钮，你将获 1 次免费越线！）'
                        : 'Selected: 0 crossers (Baits a False Alarm freebie if Defender hits RED!)'
                      : lang === 'zh'
                      ? `已选 ${selectedList.length} 名特工越线 · 若对手按绿钮将狂揽 +${potentialPts} 分`
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
          consoleHtml = `
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
          consoleHtml = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '你是防守方 · 黑暗中做出判定' : 'YOU ARE DEFENDER · CALL THE BLACKOUT'}</span>
              <span style="font-size:12px;color:var(--tg-ink-muted);">
                ${
                  state.attackerLocked
                    ? lang === 'zh'
                      ? '⚡ 进攻方已完成潜行部署！'
                      : '⚡ Attacker has locked their move!'
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
                      ? '红钮已耗尽！只能按绿钮'
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
        consoleHtml = `
          <div style="text-align:center;color:var(--tg-ink-muted);">
            ${lang === 'zh' ? '暗室部署中，等待双方锁定决定...' : 'Blackout in progress — waiting for both captains to lock...'}
          </div>
        `;
      }
    } else if (state.phase === 'FALSE_ALARM_PICK') {
      consoleHtml = `
        <div class="bg-outcome-banner is-false">
          <div>
            <strong>⚠️ ${lang === 'zh' ? '开灯！防守方空按红钮（0 人越线）！' : 'LIGHTS ON! DEFENDER FALSE ALARM (0 Crossers)!'}</strong>
            <div style="font-size:13px;margin-top:4px;">
              ${
                isAttackerMe
                  ? lang === 'zh'
                    ? '请点击上方任意 1 名存活特工，立即获得免费安全越线得分！'
                    : 'Click any ALIVE Operative above to award a FREE safe crossing!'
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
            ? `🚨 开灯抓捕！防守方按下红钮，抓获并永久淘汰 ${res.eliminatedIds.length} 名越线特工！`
            : `🚨 LIGHTS ON — BUSTED! Defender pressed RED and eliminated ${res.eliminatedIds.length} operative(s)!`;
      } else if (res.outcome === 'SAFE_CROSS') {
        msg =
          lang === 'zh'
            ? `⚡ 开灯！防守方按下绿钮，${res.crossers.length} 名特工安全越线，斩获 +${res.pointsGained} 分！`
            : `⚡ LIGHTS ON — SAFE! Defender pressed GREEN; ${res.crossers.length} operative(s) scored +${res.pointsGained} pts!`;
      } else if (res.outcome === 'FALSE_ALARM') {
        const op = state.squad[res.bonusOperativeId];
        msg =
          lang === 'zh'
            ? `⚠️ 空按红钮！${op?.zh || ''} 获赠免费越线，进攻方 +${res.pointsGained} 分！`
            : `⚠️ FALSE ALARM! ${op?.en || ''} awarded FREE crossing for +${res.pointsGained} pts!`;
      } else {
        msg =
          lang === 'zh'
            ? `💡 开灯！防守方按绿钮，进攻方 0 人越线，双方 0 分平收。`
            : `💡 LIGHTS ON — Silent Standoff (GREEN vs 0 crossers, 0 pts).`;
      }
      consoleHtml = `
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
      consoleHtml = `
        <div style="text-align:center;font-weight:700;color:var(--tg-gold-bright);">
          ${lang === 'zh' ? '暗战游戏已结束！查看最终裁决。' : 'Blackout Game concluded!'}
        </div>
      `;
    }

    const renderTeamBox = (p) => {
      const isAtk = p.seatId === state.attackerSeatId;
      return `
        <div class="bg-team-box ${isAtk ? 'is-attacker' : 'is-defender'}">
          <div>
            <div style="font-weight:800;font-size:14.5px;color:${p.color === 'cyan' ? '#67e8f9' : '#ff8ba0'};">
              ${UI.escapeHtml(p.avatar || '♦')} ${UI.escapeHtml(p.name)}
            </div>
            <div style="margin-top:4px;">
              <span class="tg-badge ${isAtk ? 'tg-badge-cyan' : 'tg-badge-garnet'}">
                ${
                  isAtk
                    ? lang === 'zh'
                      ? '⚔ 进攻方（潜行越线）'
                      : '⚔ ATTACKER'
                    : lang === 'zh'
                    ? '🛡 防守方（红绿警报）'
                    : '🛡 DEFENDER'
                }
              </span>
            </div>
          </div>
          <div class="bg-team-score">${p.score}</div>
        </div>
      `;
    };

    const histHtml = (state.history || [])
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
            ? '#ff8ba0'
            : h.outcome === 'SAFE_CROSS'
            ? '#86efac'
            : h.outcome === 'FALSE_ALARM'
            ? 'var(--tg-gold-bright)'
            : 'var(--tg-ink-faint)';
        return `<span class="bg-hist-chip" style="color:${clr};">H${h.half}R${h.halfRound} ${icon} ${h.button} ${h.pointsGained ? `+${h.pointsGained}` : h.outcome === 'BUSTED' ? `-${h.crossers.length}OP` : '0'}</span>`;
      })
      .join('');

    container.innerHTML = `
      <div class="bg-arena">
        <div class="bg-header">
          ${renderTeamBox(p0)}
          <div class="bg-half-badge">
            <span class="tg-badge tg-badge-gold">
              ${
                state.isOvertime
                  ? lang === 'zh'
                    ? `骤死加时 H${state.half}`
                    : `OVERTIME H${state.half}`
                  : lang === 'zh'
                  ? `第 ${state.half} / 2 半场`
                  : `HALF ${state.half} / 2`
              }
            </span>
            <span style="font-family:var(--tg-font-mono);font-size:13px;font-weight:800;color:var(--tg-ink);">
              ${lang === 'zh' ? `本半场第 ${state.halfRound} / ${state.maxRoundsThisHalf} 轮` : `ROUND ${state.halfRound} / ${state.maxRoundsThisHalf}`}
            </span>
          </div>
          ${renderTeamBox(p1)}
        </div>

        <div class="bg-studio-floor ${isBlackout ? 'is-blackout' : isBusted ? 'is-busted' : 'is-lights-on'}">
          <div class="bg-floor-topbar">
            <span class="bg-power-pill ${isBlackout ? 'is-dark' : 'is-lit'}">
              ${
                isBlackout
                  ? lang === 'zh'
                    ? '● POWER OFF · 演播室熄灯暗战'
                    : '● POWER OFF · BLACKOUT ACTIVE'
                  : lang === 'zh'
                  ? '☀ LIGHTS ON · 全场开灯揭晓'
                  : '☀ LIGHTS ON · FLOODLIGHT REVEAL'
              }
            </span>
            <div class="bg-charges">
              <span>${lang === 'zh' ? `红钮电量 (${state.redCharges}/${state.maxRedCharges})` : `RED CHARGES (${state.redCharges}/${state.maxRedCharges})`}</span>
              ${chargesHtml}
            </div>
          </div>

          <div class="bg-chambers-grid">${chambersHtml}</div>
        </div>

        <div class="bg-console">
          ${consoleHtml}
          ${histHtml ? `<div class="bg-history-strip">${histHtml}</div>` : ''}
        </div>
      </div>
    `;

    // Bind chamber clicks (Attacker toggle OR False Alarm bonus pick)
    container.querySelectorAll('[data-op-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const opId = Number(el.dataset.opId);
        if (canPickFalseAlarm) {
          SFX.play('garnetClink');
          dispatch({ type: 'PICK_FALSE_ALARM_BONUS', payload: { operativeId: opId } });
          return;
        }
        if (canToggleChamber) {
          SFX.play('click');
          if (draftOperativeIds.has(opId)) draftOperativeIds.delete(opId);
          else draftOperativeIds.add(opId);
          // Re-render smoothly via lightweight local DOM refresh by re-invoking render?
          // Better: update state visually immediately by calling the same render logic cleanly:
          ctx.state && renderSelf();
        }
      });
    });

    const renderSelf = () => {
      // Re-run current render with updated local draftOperativeIds
      const selectedList = [...draftOperativeIds].sort((a, b) => a - b);
      container.querySelectorAll('[data-op-id]').forEach((el) => {
        const id = Number(el.dataset.opId);
        const crossed = draftOperativeIds.has(id);
        el.classList.toggle('is-crossing', crossed);
        el.classList.toggle('is-safe-zone', !crossed);
        const lbl = el.querySelector('.bg-zone-label');
        if (lbl) {
          lbl.textContent = crossed
            ? lang === 'zh'
              ? '⚡ 已越过红线'
              : '⚡ CROSSED LINE'
            : lang === 'zh'
            ? '暗区目标带'
            : 'TARGET ZONE';
          lbl.style.color = crossed ? '#67e8f9' : 'var(--tg-ink-faint)';
        }
      });
      const lockBtn = container.querySelector('#bg-lock-attack');
      if (lockBtn) {
        lockBtn.textContent = `⚡ ${
          lang === 'zh'
            ? `锁定潜行方案 (${selectedList.length}人)`
            : `Lock Crossing (${selectedList.length})`
        }`;
      }
      const desc = container.querySelector('.bg-attacker-bar > div > div');
      if (desc) {
        const potentialPts = selectedList.reduce((acc, id) => acc + (state.squad[id].crossings + 1), 0);
        desc.textContent =
          selectedList.length === 0
            ? lang === 'zh'
              ? '当前选择：0 人越线（若对手按红钮，你将获 1 次免费越线！）'
              : 'Selected: 0 crossers (Baits a False Alarm freebie if Defender hits RED!)'
            : lang === 'zh'
            ? `已选 ${selectedList.length} 名特工越线 · 若对手按绿钮将狂揽 +${potentialPts} 分`
            : `Selected ${selectedList.length} crosser(s) · Potential +${potentialPts} pts on GREEN`;
      }
    };

    container.querySelector('#bg-send-zero')?.addEventListener('click', () => {
      SFX.play('bid');
      draftOperativeIds.clear();
      dispatch({ type: 'SUBMIT_ATTACK', payload: { operativeIds: [] } });
    });

    container.querySelector('#bg-lock-attack')?.addEventListener('click', () => {
      SFX.play('bid');
      dispatch({ type: 'SUBMIT_ATTACK', payload: { operativeIds: [...draftOperativeIds] } });
    });

    container.querySelector('#bg-btn-red')?.addEventListener('click', () => {
      SFX.play('bid');
      dispatch({ type: 'SUBMIT_DEFEND', payload: { button: 'RED' } });
    });

    container.querySelector('#bg-btn-green')?.addEventListener('click', () => {
      SFX.play('bid');
      dispatch({ type: 'SUBMIT_DEFEND', payload: { button: 'GREEN' } });
    });

    container.querySelector('#bg-continue-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'CONTINUE_LIGHTS' });
    });
  },
});
