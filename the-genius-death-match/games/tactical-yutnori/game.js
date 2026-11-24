/**
 * Tactical Yutnori (전략 윷놀이 / 战略掷柶) — Broadcast Interactive Renderer
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import {
  GameRules,
  BOARD_NODES,
  THROW_TABLE,
  FINISH_POS,
  getLegalMoveOptions,
} from './rules.js';

let selectedThrowIdx = 0;
let selectedSource = null; // { sourceKind: 'board', fromPos } | { sourceKind: 'entry', entryRole }
let lastEventSig = null;

function renderYutBoardSvg(state, myOwner, isMoveTurn, legalOptions, lang) {
  const outerCoords = [20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');
  const diagA = [5, 21, 22, 23, 24, 25, 15]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');
  const diagB = [10, 26, 27, 23, 28, 29, 20]
    .map((id) => `${BOARD_NODES[id].x},${BOARD_NODES[id].y}`)
    .join(' ');

  // Group Mals currently on board by node id
  const stacksByPos = new Map(); // pos -> { owner, mals: [] }
  for (let o = 0; o < 2; o++) {
    for (const m of state.mals[o]) {
      if (m.pos >= 1 && m.pos <= 29) {
        if (!stacksByPos.has(m.pos)) stacksByPos.set(m.pos, { owner: o, mals: [] });
        stacksByPos.get(m.pos).mals.push(m);
      }
    }
  }

  // Filter matching destination options if a source is selected
  const activeDests = new Map(); // toPos -> option
  if (isMoveTurn && selectedSource) {
    for (const opt of legalOptions) {
      const match =
        selectedSource.sourceKind === 'entry'
          ? opt.sourceKind === 'entry' && opt.entryRole === selectedSource.entryRole
          : opt.sourceKind === 'board' && opt.fromPos === selectedSource.fromPos;
      if (match) activeDests.set(opt.toPos, opt);
    }
  }

  // Clickable friendly on-board sources
  const movablePositions = new Set(
    isMoveTurn ? legalOptions.filter((o) => o.sourceKind === 'board').map((o) => o.fromPos) : []
  );

  // Nodes SVG
  let nodesSvg = '';
  for (const [idStr, node] of Object.entries(BOARD_NODES)) {
    const id = Number(idStr);
    const isCornerOrCenter = node.kind === 'corner' || node.kind === 'center' || node.kind === 'home';
    const r = node.kind === 'center' || node.kind === 'home' ? 22 : isCornerOrCenter ? 19 : 14;
    const isDest = activeDests.has(id);
    const destStack = stacksByPos.get(id);
    const isCaptureDest = isDest && destStack && destStack.owner !== state.turnOwner;

    const fill =
      node.kind === 'home'
        ? 'url(#ty-grad-home)'
        : node.kind === 'center'
        ? 'url(#ty-grad-center)'
        : node.shortcut
        ? 'rgba(34, 211, 238, 0.16)'
        : 'rgba(18, 22, 36, 0.96)';

    const stroke =
      node.kind === 'home'
        ? '#ff4d6d'
        : node.shortcut
        ? '#22d3ee'
        : 'rgba(228, 185, 91, 0.55)';

    const clickAttr = isDest
      ? `data-dest-pos="${id}" class="ty-node-ring ty-node-interactive"`
      : movablePositions.has(id)
      ? `data-src-pos="${id}" class="ty-node-ring ty-node-interactive"`
      : `class="ty-node-ring"`;

    nodesSvg += `<g ${clickAttr}>`;
    if (isDest) {
      nodesSvg += `<circle cx="${node.x}" cy="${node.y}" r="${r + 9}" class="ty-dest-pulse ${isCaptureDest ? 'is-capture' : ''}" />`;
    }
    nodesSvg += `<circle class="ty-node-circle" cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${isCornerOrCenter ? 2.4 : 1.6}" />`;
    if (node.kind === 'home') {
      nodesSvg += `<text x="${node.x}" y="${node.y + 4}" text-anchor="middle" fill="#ffd6de" font-size="9.5" font-weight="800" font-family="var(--tg-font-mono)">${lang === 'zh' ? '起点' : 'GOAL'}</text>`;
    } else if (node.kind === 'center') {
      nodesSvg += `<text x="${node.x}" y="${node.y + 5}" text-anchor="middle" fill="#fff0c2" font-size="14" font-weight="800">★</text>`;
    } else if (id === 1) {
      nodesSvg += `<text x="${node.x + 25}" y="${node.y + 4}" text-anchor="start" fill="rgba(255,150,170,0.75)" font-size="9" font-weight="700" font-family="var(--tg-font-mono)">1</text>`;
    }
    nodesSvg += `</g>`;
  }

  // Finish exit button if activeDest contains FINISH_POS (99)
  let finishSvg = '';
  if (activeDests.has(FINISH_POS)) {
    finishSvg = `
      <g data-dest-pos="${FINISH_POS}" class="ty-node-interactive" style="cursor:pointer;">
        <rect x="366" y="458" width="124" height="32" rx="16" fill="url(#ty-grad-gold)" stroke="#fff6d9" stroke-width="2" filter="url(#ty-glow)" />
        <text x="428" y="478" text-anchor="middle" fill="#120c04" font-size="12" font-weight="900" font-family="var(--tg-font-ui)">${lang === 'zh' ? '★ 冲线得分！' : '★ SCORE GOAL!'}</text>
      </g>
    `;
  }

  // Render Mal Stacks on top of nodes
  let malsSvg = '';
  for (const [pos, group] of stacksByPos.entries()) {
    const node = BOARD_NODES[pos];
    const hasCand = group.mals.some((m) => m.role === 'candidate');
    const count = group.mals.length;
    const isSel = selectedSource?.sourceKind === 'board' && selectedSource.fromPos === pos;
    const isMovable = movablePositions.has(pos);
    const isDest = activeDests.has(pos);

    const fill = group.owner === 0 ? 'url(#ty-mal-p0)' : 'url(#ty-mal-p1)';
    const rim = hasCand ? '#fff0c2' : '#cbd5e1';

    const attrs = isDest
      ? `data-dest-pos="${pos}" style="cursor:pointer;"`
      : isMovable
      ? `data-src-pos="${pos}" style="cursor:pointer;"`
      : '';

    malsSvg += `<g ${attrs}>`;
    if (isSel) {
      malsSvg += `<circle cx="${node.x}" cy="${node.y}" r="23" fill="none" stroke="#fff0c2" stroke-width="3" stroke-dasharray="5 3" />`;
    }
    // Stacked subtle offset disc
    if (count > 1) {
      malsSvg += `<circle cx="${node.x + 3}" cy="${node.y - 4}" r="15" fill="${fill}" stroke="${rim}" stroke-width="1.6" opacity="0.72" />`;
    }
    malsSvg += `<circle cx="${node.x}" cy="${node.y}" r="16" fill="${fill}" stroke="${rim}" stroke-width="${hasCand ? 2.8 : 1.8}" filter="url(#ty-shadow)" />`;
    malsSvg += `<text x="${node.x}" y="${node.y + 4.5}" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="900" font-family="var(--tg-font-ui)">${hasCand ? '♛' : '●'}</text>`;

    // Stack count badge (×2, ×3, ×4)
    if (count > 1) {
      malsSvg += `
        <rect x="${node.x + 8}" y="${node.y - 21}" width="24" height="16" rx="8" fill="#090b12" stroke="#e4b95b" stroke-width="1.4" />
        <text x="${node.x + 20}" y="${node.y - 10}" text-anchor="middle" fill="#fff0c2" font-size="10" font-weight="800" font-family="var(--tg-font-mono)">×${count}</text>
      `;
    }
    malsSvg += `</g>`;
  }

  return `
    <svg class="ty-board-svg" viewBox="0 0 500 500" role="img" aria-label="Tactical Yutnori 29-node board">
      <defs>
        <radialGradient id="ty-grad-home" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#6b1024" />
          <stop offset="100%" stop-color="#25060e" />
        </radialGradient>
        <radialGradient id="ty-grad-center" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#4e3914" />
          <stop offset="100%" stop-color="#191308" />
        </radialGradient>
        <linearGradient id="ty-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff0c2" />
          <stop offset="100%" stop-color="#d49b35" />
        </linearGradient>
        <radialGradient id="ty-mal-p0" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#ff5a7a" />
          <stop offset="55%" stop-color="#c61131" />
          <stop offset="100%" stop-color="#6b0618" />
        </radialGradient>
        <radialGradient id="ty-mal-p1" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#67e8f9" />
          <stop offset="55%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#083344" />
        </radialGradient>
        <filter id="ty-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.7" />
        </filter>
        <filter id="ty-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Direction arrow subtle guide near start -->
      <path d="M 462 396 L 462 325" stroke="rgba(228,185,91,0.45)" stroke-width="2" marker-end="url(#ty-arrow)" />
      <defs>
        <marker id="ty-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 0 1 L 7 4 L 0 7 Z" fill="rgba(228,185,91,0.65)" />
        </marker>
      </defs>

      <!-- Track Ley-lines -->
      <polyline class="ty-track-outer" points="${outerCoords}" />
      <polyline class="ty-track-diag" points="${diagA}" />
      <polyline class="ty-track-diag" points="${diagB}" />

      <!-- Board Stations -->
      ${nodesSvg}

      <!-- Pieces / Stacks -->
      ${malsSvg}

      <!-- Exit Goal Trigger -->
      ${finishSvg}
    </svg>
  `;
}

function renderSticksDisplay(state, lang) {
  const rev = state.lastReveal;
  if (!rev) {
    return `
      <div class="ty-sticks-stage">
        <span style="color:var(--tg-ink-muted);font-size:13px;">${
          lang === 'zh' ? '等待双方同时秘密选择 2 根柶木…' : 'Awaiting simultaneous 2-stick lock from both teams…'
        }</span>
      </div>
    `;
  }

  const sticks = [];
  for (let i = 0; i < 2; i++) {
    sticks.push({ flat: i < rev.activeFlats, tag: lang === 'zh' ? '攻' : 'ATK' });
  }
  for (let i = 0; i < 2; i++) {
    sticks.push({ flat: i < rev.defFlats, tag: lang === 'zh' ? '守' : 'DEF' });
  }

  const sticksHtml = sticks
    .map(
      (st) => `
      <div class="ty-stick-wrap">
        <div class="ty-stick ${st.flat ? 'is-flat' : 'is-round'}">
          ${st.flat ? '<span class="ty-stick-x">✕</span><span class="ty-stick-x">✕</span><span class="ty-stick-x">✕</span>' : ''}
        </div>
        <span class="ty-stick-owner">${st.tag}·${st.flat ? (lang === 'zh' ? '平' : 'F') : (lang === 'zh' ? '弧' : 'R')}</span>
      </div>
    `
    )
    .join('');

  return `
    <div class="ty-sticks-stage">${sticksHtml}</div>
    <div class="ty-reveal-summary">
      <span class="ty-reveal-result">${UI.escapeHtml(lang === 'zh' ? rev.spec.zh : rev.spec.en)}</span>
      <span class="tg-badge ${rev.wasted ? 'tg-badge-garnet' : rev.bonusTriggered ? 'tg-badge-gold' : 'tg-badge-cyan'}">
        ${
          rev.wasted
            ? lang === 'zh'
              ? '场上无棋 · 倒退猪作废'
              : 'NO MAL ON BOARD · WASTED'
            : rev.bonusTriggered
            ? lang === 'zh'
              ? '连掷奖励 +1！'
              : 'BONUS THROW +1!'
            : `${rev.totalFlats} ${lang === 'zh' ? '平' : 'Flat'} / ${4 - rev.totalFlats} ${lang === 'zh' ? '弧' : 'Round'}`
        }
      </span>
    </div>
  `;
}

mountGame({
  config: {
    id: 'tactical-yutnori',
    title: { zh: '战略掷柶', en: 'Tactical Yutnori', ko: '전략 윷놀이' },
    seasons: ['S1', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    rulesSummary: {
      zh: `### 战略掷柶（S1E3 · S1E4 · S1E10 · S4E2）
零运气的心理博弈版韩国掷柶！双方各率领**主将（♛ 金边 ×2）**与**搭档（● 银边 ×2）**。

### 同时秘密择柶（4根合成步数）
- 每轮掷柶时，攻守双方**同时秘密选择 0 / 1 / 2 根平面柶木**，相加总数决定结果：
  - **1 平（倒退猪）**：后退 1 格（全盘所有“猪”均为倒退猪！从 1 号格退回起点即算绕完一圈，下一次前进直接冲线！）
  - **2 平（狗）**：前进 2 格
  - **3 平（羊）**：前进 3 格
  - **4 平（牛）**：前进 4 格 + **连掷奖励**
  - **0 平（马）**：前进 5 格 + **连掷奖励**

### 叠棋、吃子与胜负
- 落在己方棋子上可**叠棋 (×2/×3)** 并肩移动；落在敌方棋子上可将其**击回起点**并获 1 次奖励掷柶（以牛/马吃子时不额外叠加）。
- **率先将己方 2 枚主将棋子（♛）送过终点线者立即获胜！**（搭档棋子仅作掩护/叠棋/抓捕之用，不计入胜利条件。）`,
      en: `### Tactical Yutnori (S1E3 · S1E4 · S1E10 · S4E2)
Zero-luck psychological Korean Yutnori! Each side commands **2 Candidate Mals (♛ Gold)** and **2 Partner Support Mals (● Silver)**.

### Simultaneous 4-Stick Throw
- Before every move, BOTH teams secretly choose **0, 1, or 2 Flat sticks**. Total Flats (0–4) determine the throw:
  - **1 Flat → Back-Do (-1)**: Move 1 step backward! (Stepping back from Node 1 onto Goal completes a full lap!)
  - **2 Flats → Gae (+2)** | **3 Flats → Geol (+3)**
  - **4 Flats → Yut (+4 + Bonus Throw)** | **0 Flats → Mo (+5 + Bonus Throw)**

### Stacking, Captures & Victory
- Landing on your own Mal stacks them (**×2, ×3**) to move together; landing on an enemy stack sends all of them off-board and grants 1 Bonus Throw (does not stack with Yut/Mo bonus).
- **First side to finish BOTH Candidate Mals (♛) wins immediately!**`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: function renderYutGame(container, ctx) {
    const { state, activeSeatId, lang, lastEvent, dispatch, setTelemetry } = ctx;
    if (!state) return;

    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'YUT_MO_BONUS' || lastEvent.type === 'CAPTURE_BONUS_TURN') {
        SFX.play('combo');
      } else if (lastEvent.type === 'CAPTURE') {
        SFX.play('clash');
      } else if (lastEvent.type === 'MAL_SCORED' || lastEvent.type === 'MAL_FINISH_WIN') {
        SFX.play('garnetClink');
      } else if (lastEvent.type === 'STICKS_REVEALED') {
        SFX.play('cardFlip');
      } else if (lastEvent.type === 'BACK_DO_WASTED') {
        SFX.play('error');
      } else if (lastEvent.type === 'MAL_MOVE') {
        SFX.play('tilePlace');
      }
      selectedSource = null;
      selectedThrowIdx = 0;
    }

    if (selectedThrowIdx >= state.pendingThrows.length) {
      selectedThrowIdx = 0;
    }

    setTelemetry({
      round: state.round,
      phase: state.phaseLabel,
    });

    const mySeat = state.seats.find((s) => s.seatId === activeSeatId);
    const myOwner = mySeat ? mySeat.owner : -1;
    const isStickPhase = state.phase === 'STICK_SELECT';
    const isMovePhase = state.phase === 'MOVE';
    const canPickSticks = isStickPhase && !ctx.isSpectator && myOwner !== -1 && state.stickChoices[myOwner] === null;
    const isMyMoveTurn = isMovePhase && !ctx.isSpectator && myOwner === state.turnOwner;

    const legalOptions = isMyMoveTurn ? getLegalMoveOptions(state, myOwner, selectedThrowIdx) : [];

    // Validate selectedSource against current legalOptions
    if (selectedSource) {
      const stillValid = legalOptions.some((o) =>
        selectedSource.sourceKind === 'entry'
          ? o.sourceKind === 'entry' && o.entryRole === selectedSource.entryRole
          : o.sourceKind === 'board' && o.fromPos === selectedSource.fromPos
      );
      if (!stillValid) selectedSource = null;
    }

    const p0Done = state.mals[0].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length;
    const p1Done = state.mals[1].filter((m) => m.role === 'candidate' && m.pos === FINISH_POS).length;

    let flashHtml = '';
    if (state.lastMoveInfo?.capturedCount > 0 && state.phase !== 'ended') {
      flashHtml = `<div class="ty-flash-banner">⚡ ${
        lang === 'zh'
          ? `${UI.escapeHtml(state.seats[state.lastMoveInfo.owner].name)} 击飞敌方 ${state.lastMoveInfo.capturedCount} 枚棋子！${state.lastMoveInfo.earnedCaptureBonus ? '获得额外奖励回合！' : ''}`
          : `${UI.escapeHtml(state.seats[state.lastMoveInfo.owner].name)} CAPTURED ${state.lastMoveInfo.capturedCount} enemy Mal(s)!${state.lastMoveInfo.earnedCaptureBonus ? ' BONUS THROW GRANTED!' : ''}`
      }</div>`;
    } else if (state.lastReveal?.bonusTriggered && state.phase === 'STICK_SELECT') {
      flashHtml = `<div class="ty-flash-banner">🔥 ${
        lang === 'zh'
          ? `${UI.escapeHtml(state.seats[state.turnOwner].name)} 掷出 ${state.lastReveal.spec.zh}！触发连掷奖励！`
          : `${UI.escapeHtml(state.seats[state.turnOwner].name)} rolled ${state.lastReveal.spec.en}! BONUS THROW!`
      }</div>`;
    }

    const activeName = state.seats[state.turnOwner]?.name || '';
    const myStickChoice = myOwner !== -1 ? state.stickChoices[myOwner] : null;
    const oppStickChoice = myOwner !== -1 ? state.stickChoices[1 - myOwner] : null;

    let actionCardHtml = '';
    if (isStickPhase) {
      const roleTag =
        myOwner === state.turnOwner
          ? lang === 'zh'
            ? '你是本轮进攻方（移动方）'
            : 'YOU ARE ACTIVE (MOVER)'
          : myOwner !== -1
          ? lang === 'zh'
            ? '你是本轮防守方（干扰对手步数）'
            : 'YOU ARE DEFENDING (DISRUPT THROW)'
          : lang === 'zh'
          ? '观战模式'
          : 'SPECTATING';

      const choices = [
        { flats: 0, sticks: [0, 0], zh: '0 平 · 2 弧', en: '0 Flat (R+R)', subZh: '可凑 马/猪/狗', subEn: 'Mo / Back / Gae' },
        { flats: 1, sticks: [1, 0], zh: '1 平 · 1 弧', en: '1 Flat (F+R)', subZh: '防牛防马 · 稳健', subEn: 'Blocks Yut & Mo' },
        { flats: 2, sticks: [1, 1], zh: '2 平 · 0 弧', en: '2 Flat (F+F)', subZh: '可凑 狗/羊/牛', subEn: 'Gae / Geol / Yut' },
      ];

      actionCardHtml = `
        <div class="ty-card">
          <h4 class="ty-card-title">
            <span>${lang === 'zh' ? '秘密择柶（2 根）' : 'Secret Stick Pick (2 Sticks)'}</span>
            <span class="tg-badge ${myOwner === state.turnOwner ? 'tg-badge-gold' : 'tg-badge-cyan'}">${roleTag}</span>
          </h4>
          <p style="margin:0 0 11px;font-size:12.5px;color:var(--tg-ink-muted);">
            ${
              canPickSticks
                ? lang === 'zh'
                  ? `本轮由 <strong>${UI.escapeHtml(activeName)}</strong> 走棋。选择你的 2 根柶木与对手合成最终步数：`
                  : `<strong>${UI.escapeHtml(activeName)}</strong> will move. Lock your 2 sticks secretly:`
                : myStickChoice !== null
                ? lang === 'zh'
                  ? '已锁定你的柶木，等待对手锁定…'
                  : 'Your sticks are locked. Waiting for opponent…'
                : lang === 'zh'
                ? '等待双方秘密锁定柶木…'
                : 'Waiting for both players to lock sticks…'
            }
          </p>
          <div class="ty-stick-picker">
            ${choices
              .map(
                (ch) => `
              <button type="button" class="ty-pick-card ${myStickChoice === ch.flats ? 'is-chosen' : ''}" data-flats="${ch.flats}" ${canPickSticks ? '' : 'disabled'}>
                <div class="ty-mini-sticks">
                  <span class="ty-mini-stick ${ch.sticks[0] ? 'is-flat' : 'is-round'}"></span>
                  <span class="ty-mini-stick ${ch.sticks[1] ? 'is-flat' : 'is-round'}"></span>
                </div>
                <span class="ty-pick-label">${lang === 'zh' ? ch.zh : ch.en}</span>
                <span class="ty-pick-sub">${lang === 'zh' ? ch.subZh : ch.subEn}</span>
              </button>
            `
              )
              .join('')}
          </div>
          ${
            oppStickChoice === 'LOCKED'
              ? `<p style="margin:10px 0 0;font-size:11.5px;color:var(--tg-cyan);font-family:var(--tg-font-mono);">✓ ${lang === 'zh' ? '对手已锁定柶木！' : 'Opponent has locked their sticks!'}</p>`
              : ''
          }
        </div>
      `;
    } else if (isMovePhase) {
      const throwsHtml = state.pendingThrows
        .map((th, idx) => {
          const activeCls = idx === selectedThrowIdx ? 'is-active' : '';
          const backCls = th.steps < 0 ? 'is-backdo' : '';
          return `<button type="button" class="ty-throw-chip ${activeCls} ${backCls}" data-throw-idx="${idx}" ${isMyMoveTurn ? '' : 'disabled'}>${UI.escapeHtml(lang === 'zh' ? th.zh : th.en)}</button>`;
        })
        .join('');

      const canEnterCand = isMyMoveTurn && legalOptions.some((o) => o.sourceKind === 'entry' && o.entryRole === 'candidate');
      const canEnterPart = isMyMoveTurn && legalOptions.some((o) => o.sourceKind === 'entry' && o.entryRole === 'partner');
      const selEntryCand = selectedSource?.sourceKind === 'entry' && selectedSource.entryRole === 'candidate';
      const selEntryPart = selectedSource?.sourceKind === 'entry' && selectedSource.entryRole === 'partner';

      actionCardHtml = `
        <div class="ty-card">
          <h4 class="ty-card-title">
            <span>${lang === 'zh' ? '待执行步数' : 'Available Throws'}</span>
            <span class="tg-badge tg-badge-gold">${UI.escapeHtml(activeName)}</span>
          </h4>
          <div class="ty-throws-row">${throwsHtml}</div>
          ${
            isMyMoveTurn
              ? `
                <p style="margin:0 0 10px;font-size:12.5px;color:var(--tg-ink-muted);">
                  ${
                    selectedSource
                      ? lang === 'zh'
                        ? '请点击棋盘上青色/绯红脉冲高亮的目标格完成移动！'
                        : 'Tap the glowing destination node on the board to move!'
                      : lang === 'zh'
                      ? '选择下方新入场棋子，或点击棋盘上已有己方棋子：'
                      : 'Enter a waiting Mal below, or click one of your Mals on the board:'
                  }
                </p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${
                    canEnterCand
                      ? `<button type="button" class="tg-btn tg-btn-sm ${selEntryCand ? 'tg-btn-gold' : 'tg-btn-cyan'}" data-entry-role="candidate">♛ ${lang === 'zh' ? '派出主将棋入场' : 'Enter Candidate Mal'}</button>`
                      : ''
                  }
                  ${
                    canEnterPart
                      ? `<button type="button" class="tg-btn tg-btn-sm ${selEntryPart ? 'tg-btn-gold' : ''}" data-entry-role="partner">● ${lang === 'zh' ? '派出搭档棋入场' : 'Enter Partner Mal'}</button>`
                      : ''
                  }
                </div>
              `
              : `<p style="margin:0;font-size:12.5px;color:var(--tg-ink-muted);">${lang === 'zh' ? `等待 ${UI.escapeHtml(activeName)} 走棋…` : `Waiting for ${UI.escapeHtml(activeName)} to move…`}</p>`
          }
        </div>
      `;
    }

    const renderTeamDock = (o) => {
      const seat = state.seats[o];
      const mals = state.mals[o];
      const pills = mals
        .map((m) => {
          const status =
            m.pos === FINISH_POS
              ? lang === 'zh'
                ? '已冲线'
                : 'GOAL'
              : m.pos === -1
              ? lang === 'zh'
                ? '待命'
                : 'READY'
              : `#${m.pos}`;
          return `<span class="ty-mal-pill ${m.role === 'candidate' ? 'is-cand' : ''} ${m.pos === FINISH_POS ? 'is-done' : ''}">${m.role === 'candidate' ? '♛' : '●'} ${status}</span>`;
        })
        .join('');

      return `
        <div class="ty-dock-box">
          <div class="ty-dock-box-head">
            <span>${UI.escapeHtml(seat.name)}</span>
            <span>${o === 0 ? (lang === 'zh' ? '绯红' : 'RED') : (lang === 'zh' ? '电光青' : 'CYAN')}</span>
          </div>
          <div class="ty-mal-pills">${pills}</div>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="ty-arena">
        <div class="ty-banner">
          <div class="ty-team-scores">
            <div class="ty-team-pill is-p0 ${state.turnOwner === 0 ? 'is-active' : ''}">
              <span class="ty-swatch"></span>
              <span>${UI.escapeHtml(state.seats[0].name)}</span>
              <span class="ty-goal-badge">♛ ${p0Done}/2</span>
            </div>
            <div class="ty-team-pill is-p1 ${state.turnOwner === 1 ? 'is-active' : ''}">
              <span class="ty-swatch"></span>
              <span>${UI.escapeHtml(state.seats[1].name)}</span>
              <span class="ty-goal-badge">♛ ${p1Done}/2</span>
            </div>
          </div>
          <span class="tg-badge tg-badge-gold">${lang === 'zh' ? `第 ${state.round} 轮 · ${state.phaseLabel.zh}` : `TURN ${state.round} · ${state.phaseLabel.en}`}</span>
        </div>

        ${flashHtml}

        <div class="ty-board-shell">
          ${renderYutBoardSvg(state, myOwner, isMyMoveTurn, legalOptions, lang)}
        </div>

        <div class="ty-console">
          <div class="ty-card">
            <h4 class="ty-card-title">
              <span>${lang === 'zh' ? '柶木合投结果' : '4-Stick Reveal'}</span>
              <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-muted);">${lang === 'zh' ? '总平面数决定步数' : 'Total Flats = Throw'}</span>
            </h4>
            ${renderSticksDisplay(state, lang)}
            <div class="ty-matrix-hint" style="margin-top:10px;">
              <div class="ty-matrix-cell"><strong>0 平</strong>${lang === 'zh' ? '马 +5★' : 'Mo +5★'}</div>
              <div class="ty-matrix-cell"><strong>1 平</strong>${lang === 'zh' ? '倒猪 -1' : 'Back -1'}</div>
              <div class="ty-matrix-cell"><strong>2 平</strong>${lang === 'zh' ? '狗 +2' : 'Gae +2'}</div>
              <div class="ty-matrix-cell"><strong>3 平</strong>${lang === 'zh' ? '羊 +3' : 'Geol +3'}</div>
              <div class="ty-matrix-cell"><strong>4 平</strong>${lang === 'zh' ? '牛 +4★' : 'Yut +4★'}</div>
            </div>
          </div>

          ${actionCardHtml}

          <div class="ty-card">
            <h4 class="ty-card-title">${lang === 'zh' ? '双方棋子状态（仅 ♛ 主将计胜）' : 'Mal Roster (Only ♛ Candidates Score)'}</h4>
            <div class="ty-roster-docks">
              ${renderTeamDock(0)}
              ${renderTeamDock(1)}
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind stick selection cards
    container.querySelectorAll('.ty-pick-card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!canPickSticks) return;
        const flats = Number(btn.dataset.flats);
        SFX.play('click');
        const res = await dispatch({ type: 'SELECT_STICKS', payload: { flats } });
        if (!res.ok) {
          SFX.play('error');
          UI.toast(res.reason || 'Cannot select sticks', 'error');
        }
      });
    });

    // Bind throw selector chips
    container.querySelectorAll('.ty-throw-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyMoveTurn) return;
        SFX.play('click');
        selectedThrowIdx = Number(btn.dataset.throwIdx);
        selectedSource = null;
        renderYutGame(container, ctx);
      });
    });

    // Bind entry buttons
    container.querySelectorAll('[data-entry-role]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyMoveTurn) return;
        SFX.play('click');
        const entryRole = btn.dataset.entryRole;
        if (selectedSource?.sourceKind === 'entry' && selectedSource.entryRole === entryRole) {
          selectedSource = null;
        } else {
          selectedSource = { sourceKind: 'entry', entryRole };
        }
        renderYutGame(container, ctx);
      });
    });

    // Bind board source selection
    container.querySelectorAll('[data-src-pos]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!isMyMoveTurn) return;
        SFX.play('click');
        const fromPos = Number(el.dataset.srcPos);
        if (selectedSource?.sourceKind === 'board' && selectedSource.fromPos === fromPos) {
          selectedSource = null;
        } else {
          selectedSource = { sourceKind: 'board', fromPos };
        }
        renderYutGame(container, ctx);
      });
    });

    // Bind destination execution
    container.querySelectorAll('[data-dest-pos]').forEach((el) => {
      el.addEventListener('click', async () => {
        if (!isMyMoveTurn || !selectedSource) return;
        const payload =
          selectedSource.sourceKind === 'entry'
            ? { throwIdx: selectedThrowIdx, sourceKind: 'entry', entryRole: selectedSource.entryRole }
            : { throwIdx: selectedThrowIdx, sourceKind: 'board', fromPos: selectedSource.fromPos };
        selectedSource = null;
        const res = await dispatch({ type: 'MOVE_MAL', payload });
        if (!res.ok) {
          SFX.play('error');
          UI.toast(res.reason || 'Illegal move', 'error');
        }
      });
    });
  },
});
