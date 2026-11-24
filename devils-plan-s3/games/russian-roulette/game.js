import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

// Bespoke Web Audio cues for tactile revolver mechanics (respects SFX.isMuted())
let localAudioCtx = null;
function getAudio() {
  if (SFX.isMuted() || typeof window === 'undefined') return null;
  if (!localAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) localAudioCtx = new AC();
  }
  if (localAudioCtx?.state === 'suspended') localAudioCtx.resume().catch(() => {});
  return localAudioCtx;
}

function playRatchet(steps = 1) {
  const ac = getAudio();
  if (!ac) return;
  const ticks = steps * 4;
  for (let i = 0; i < ticks; i++) {
    const t = ac.currentTime + i * 0.062;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1450 + (i % 2) * 320, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.025);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.028);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.032);
  }
}

function playDryClick() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2100, now);
  osc.frequency.exponentialRampToValueAtTime(620, now + 0.026);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.042);
}

function playGunshot() {
  const ac = getAudio();
  if (!ac) return;
  const now = ac.currentTime;
  // White noise blast
  const len = Math.floor(ac.sampleRate * 0.48);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(2800, now);
  filt.frequency.exponentialRampToValueAtTime(180, now + 0.45);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.45, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
  src.connect(filt).connect(ng).connect(ac.destination);
  src.start(now);

  // Sub-bass shockwave
  const sub = ac.createOscillator();
  const sg = ac.createGain();
  sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(125, now);
  sub.frequency.exponentialRampToValueAtTime(28, now + 0.42);
  sg.gain.setValueAtTime(0.32, now);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  sub.connect(sg).connect(ac.destination);
  sub.start(now);
  sub.stop(now + 0.46);
}

// Local UI selection state across renders
const uiState = {
  selectedAction: null, // 'PUBLIC_PEEK' | 'PRIVATE_PEEK' | 'MANIPULATE_CONTRIBUTE' | null
  selectedPair: 0,
  manipulateAmount: 2,
  lastEventKey: '',
  lastShotCount: 0,
  flashMode: null, // 'bang' | 'click' | null
  flashTimer: null,
};

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function buildRevolverSvg(state, mySeatId, lang, interactivePairMode, isSwapMode) {
  const C = state.numChambers;
  const cx = 220;
  const cy = 220;
  const stepDeg = 360 / C;
  const visualAngle = state.visualRotationSteps * stepDeg;

  const firedSet = new Map();
  for (const sh of state.firedShots) firedSet.set(sh.pos, sh);

  const activeBarrelPos =
    state.phase === 'firing'
      ? (state.firingStartPos + state.firingStep) % C
      : state.firedShots.length
      ? state.firedShots[state.firedShots.length - 1].pos
      : null;

  // Clickable adjacent pair arcs (in static seat frame so Chamber #1..#C stay at fixed seat angles)
  let pairArcsSvg = '';
  if (interactivePairMode) {
    for (let p = 0; p < C; p++) {
      const a1 = p * stepDeg + 8;
      const a2 = (p + 1) * stepDeg - 8;
      const isSel = uiState.selectedPair === p;
      const cls = `rr-pair-arc ${isSel ? (isSwapMode ? 'is-swap' : 'is-selected') : ''}`;
      pairArcsSvg += `
        <path
          d="${describeArc(cx, cy, 134, a1, a2)}"
          class="${cls}"
          data-select-pair="${p}"
        >
          <title>#${p + 1} & #${((p + 1) % C) + 1}</title>
        </path>
      `;
    }
  }

  // Scan X-ray beams for last public/private/swap highlight
  let xraySvg = '';
  if (state.scanHighlight && state.phase === 'action') {
    const color =
      state.scanHighlight.type === 'private'
        ? '#38bdf8'
        : state.scanHighlight.type === 'swap'
        ? '#f59e0b'
        : '#d4af6a';
    for (const pos of state.scanHighlight.positions) {
      const pt = polar(cx, cy, 94, pos * stepDeg);
      xraySvg += `
        <line x1="${cx}" y1="${cy}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}"
          stroke="${color}" stroke-width="2.5" stroke-dasharray="5 4" class="rr-xray-beam" />
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="33"
          fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6 4" class="rr-xray-beam" />
      `;
    }
  }

  // Rotating brushed-steel cylinder body (flutes + mechanical notches rotate smoothly!)
  let flutesSvg = '';
  for (let i = 0; i < C; i++) {
    const midDeg = (i + 0.5) * stepDeg;
    const p1 = polar(cx, cy, 146, midDeg);
    const p2 = polar(cx, cy, 52, midDeg);
    flutesSvg += `
      <line x1="${p2.x.toFixed(1)}" y1="${p2.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}"
        stroke="rgba(0,0,0,0.52)" stroke-width="6" stroke-linecap="round" />
      <circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="10" fill="#090b10" stroke="rgba(212,175,106,0.22)" stroke-width="1.2" />
    `;
  }

  // Chambers rendered at their current seat positions (0..C-1)
  let chambersSvg = '';
  for (let pos = 0; pos < C; pos++) {
    const ch = state.chambers[pos];
    const deg = pos * stepDeg;
    const pt = polar(cx, cy, 94, deg);
    const intel = ch.intel;
    const fired = firedSet.get(pos);
    const isHighlightedPair =
      interactivePairMode &&
      (pos === uiState.selectedPair || pos === (uiState.selectedPair + 1) % C);
    const isBarrelHere = activeBarrelPos === pos && (state.phase === 'firing' || state.phase === 'firing_done');

    let fill = 'url(#rrChamberDark)';
    let stroke = 'rgba(212,175,106,0.45)';
    let extraClass = '';
    let innerSvg = `<text x="${pt.x.toFixed(1)}" y="${(pt.y + 5).toFixed(1)}" text-anchor="middle" fill="#64748b" font-family="var(--dp-font-mono)" font-size="16" font-weight="700">?</text>`;

    if (intel) {
      if (intel.isLive) {
        fill = intel.stale ? 'url(#rrBulletStale)' : 'url(#rrBulletLive)';
        stroke = intel.stale ? '#f59e0b' : '#ff4d5e';
        extraClass = intel.stale ? '' : 'rr-chamber-live-glow';
        innerSvg = `
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="15" fill="url(#rrBrassPrimer)" stroke="#7c2d12" stroke-width="1.5" />
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="6" fill="#dc2626" />
          ${intel.stale ? `<text x="${pt.x.toFixed(1)}" y="${(pt.y + 4).toFixed(1)}" text-anchor="middle" fill="#fef08a" font-size="12" font-weight="800">?</text>` : ''}
        `;
      } else {
        fill = intel.stale ? 'rgba(30,41,59,0.85)' : 'rgba(14,25,38,0.94)';
        stroke = intel.stale ? '#f59e0b' : '#38bdf8';
        extraClass = intel.stale ? '' : 'rr-chamber-safe-glow';
        innerSvg = `
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="11" fill="none" stroke="${intel.stale ? '#f59e0b' : '#38bdf8'}" stroke-width="2" stroke-dasharray="${intel.stale ? '3 3' : 'none'}" />
          <text x="${pt.x.toFixed(1)}" y="${(pt.y + 4).toFixed(1)}" text-anchor="middle" fill="${intel.stale ? '#fde68a' : '#bae6fd'}" font-family="var(--dp-font-mono)" font-size="10" font-weight="700">${intel.stale ? '0?' : 'OK'}</text>
        `;
      }
    }

    if (isHighlightedPair) {
      stroke = isSwapMode ? '#f59e0b' : '#38bdf8';
    }
    if (isBarrelHere) {
      stroke = fired?.isLive ? '#ff3b4f' : '#f2d591';
    }

    const badgeColor =
      intel?.source === 'private'
        ? '#38bdf8'
        : intel?.source === 'public'
        ? '#d4af6a'
        : intel?.source === 'fired'
        ? fired?.isLive
          ? '#ef4444'
          : '#22c55e'
        : null;

    chambersSvg += `
      <g class="rr-chamber-node" data-chamber-pos="${pos}" style="${interactivePairMode ? 'cursor:pointer;' : ''}">
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="29" fill="#05060a" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
        <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="25" fill="${fill}" stroke="${stroke}" stroke-width="${isHighlightedPair || isBarrelHere ? 3.2 : 2}" class="rr-chamber-ring ${extraClass}" />
        ${innerSvg}
        <text x="${pt.x.toFixed(1)}" y="${(pt.y - 31).toFixed(1)}" text-anchor="middle" fill="#cbd5e1" font-family="var(--dp-font-mono)" font-size="10.5" font-weight="700">#${pos + 1}</text>
        ${
          badgeColor
            ? `<circle cx="${(pt.x + 19).toFixed(1)}" cy="${(pt.y - 19).toFixed(1)}" r="5.5" fill="${badgeColor}" stroke="#090b10" stroke-width="1.5" />`
            : ''
        }
      </g>
    `;
  }

  // Player seat badges arranged around outer perimeter of the table
  let seatsSvg = '';
  for (let pos = 0; pos < C; pos++) {
    const ch = state.chambers[pos];
    const owner = state.players.find((p) => p.seatId === ch.ownerSeatId);
    if (!owner) continue;
    const deg = pos * stepDeg;
    const pt = polar(cx, cy, 182, deg);
    const isTurn =
      (state.phase === 'action' && state.currentTurnSeatId === owner.seatId) ||
      (state.phase === 'manipulate_swap' && state.manipulatorSeatId === owner.seatId);
    const isMe = owner.seatId === mySeatId;
    const shortName = owner.name.length > 7 ? `${owner.name.slice(0, 6)}…` : owner.name;

    let pillFill = 'rgba(13, 16, 25, 0.94)';
    let pillStroke = 'rgba(212, 175, 106, 0.28)';
    if (owner.eliminated) {
      pillFill = 'rgba(127, 29, 29, 0.9)';
      pillStroke = '#ef4444';
    } else if (isTurn) {
      pillFill = 'rgba(42, 33, 14, 0.95)';
      pillStroke = '#f2d591';
    } else if (isMe) {
      pillStroke = '#38bdf8';
    }

    const creditTag =
      owner.credits !== null
        ? `${owner.credits} CR`
        : owner.isZero
        ? '0 CR'
        : '?? CR';

    seatsSvg += `
      <g class="rr-seat-node">
        <rect x="${(pt.x - 46).toFixed(1)}" y="${(pt.y - 19).toFixed(1)}" width="92" height="38" rx="10"
          fill="${pillFill}" stroke="${pillStroke}" stroke-width="${isTurn ? 2.2 : 1.3}" />
        <text x="${pt.x.toFixed(1)}" y="${(pt.y - 3).toFixed(1)}" text-anchor="middle"
          fill="${owner.eliminated ? '#fecaca' : isTurn ? '#f2d591' : '#f4f1ea'}"
          font-size="11" font-weight="700">${UI.escapeHtml(shortName)}</text>
        <text x="${pt.x.toFixed(1)}" y="${(pt.y + 12).toFixed(1)}" text-anchor="middle"
          fill="${owner.eliminated ? '#fca5a5' : owner.isZero ? '#ff6b7a' : isMe ? '#7dd3fc' : '#94a3b8'}"
          font-family="var(--dp-font-mono)" font-size="10" font-weight="600">${owner.eliminated ? '💀 OUT' : creditTag}</text>
      </g>
    `;
  }

  // Barrel pointer during firing phase
  let pointerSvg = '';
  if (activeBarrelPos !== null && (state.phase === 'firing' || state.phase === 'firing_done')) {
    const pDeg = activeBarrelPos * stepDeg;
    const tip = polar(cx, cy, 144, pDeg);
    const base = polar(cx, cy, 42, pDeg);
    pointerSvg = `
      <line x1="${base.x.toFixed(1)}" y1="${base.y.toFixed(1)}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}"
        stroke="#ff4d5e" stroke-width="4" stroke-linecap="round" filter="drop-shadow(0 0 10px #ef4444)" />
    `;
  }

  // Center spindle hub
  const centerLabel =
    state.phase === 'firing'
      ? lang === 'zh'
        ? '连发处决'
        : 'FIRING'
      : state.phase === 'manipulate_swap'
      ? lang === 'zh'
        ? '暗箱互换'
        : 'SWAP'
      : `${state.numBullets}/${C}`;

  return `
    <svg class="rr-revolver-svg" viewBox="0 0 440 440" role="img" aria-label="Revolver Cylinder">
      <defs>
        <radialGradient id="rrSteelDrum" cx="42%" cy="35%" r="68%">
          <stop offset="0%" stop-color="#3c4559" />
          <stop offset="45%" stop-color="#1e2432" />
          <stop offset="85%" stop-color="#111520" />
          <stop offset="100%" stop-color="#090b10" />
        </radialGradient>
        <radialGradient id="rrBrassHub" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#f5dc99" />
          <stop offset="55%" stop-color="#b98f43" />
          <stop offset="100%" stop-color="#5d441b" />
        </radialGradient>
        <radialGradient id="rrChamberDark" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#1c2233" />
          <stop offset="100%" stop-color="#06080d" />
        </radialGradient>
        <radialGradient id="rrBulletLive" cx="40%" cy="35%" r="68%">
          <stop offset="0%" stop-color="#991b1b" />
          <stop offset="70%" stop-color="#450a0a" />
          <stop offset="100%" stop-color="#1a0505" />
        </radialGradient>
        <radialGradient id="rrBulletStale" cx="40%" cy="35%" r="68%">
          <stop offset="0%" stop-color="#78350f" />
          <stop offset="100%" stop-color="#1c1108" />
        </radialGradient>
        <radialGradient id="rrBrassPrimer" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="65%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#451a03" />
        </radialGradient>
      </defs>

      <!-- Outer Table Engraved Ring -->
      <circle cx="${cx}" cy="${cy}" r="154" fill="none" stroke="rgba(212,175,106,0.16)" stroke-width="1.5" stroke-dasharray="4 6" />

      <!-- Rotating Brushed-Steel Cylinder Body -->
      <g class="rr-cylinder-group" style="transform: rotate(${visualAngle}deg);">
        <circle cx="${cx}" cy="${cy}" r="144" fill="url(#rrSteelDrum)" stroke="rgba(212,175,106,0.42)" stroke-width="2.5" />
        <circle cx="${cx}" cy="${cy}" r="136" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        ${flutesSvg}
      </g>

      ${pairArcsSvg}
      ${xraySvg}
      ${pointerSvg}
      ${chambersSvg}

      <!-- Center Brass Ratchet Spindle -->
      <circle cx="${cx}" cy="${cy}" r="36" fill="#090b10" stroke="rgba(212,175,106,0.5)" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="28" fill="url(#rrBrassHub)" stroke="#3d2c10" stroke-width="1.5" />
      <circle cx="${cx}" cy="${cy}" r="22" fill="#0d1018" />
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#f2d591" font-family="var(--dp-font-mono)" font-size="11.5" font-weight="800">${centerLabel}</text>

      ${seatsSvg}
    </svg>
  `;
}

mountGame({
  config: {
    id: 'russian-roulette',
    title: { zh: '俄罗斯轮盘', en: 'Russian Roulette', ko: '러시안 룰렛' },
    category: 'PRISON MATCH',
    episode: 'EP 4–5 · DAY 2 PM2',
    minPlayers: 3,
    maxPlayers: 6,
    defaultPlayers: 6,
    hasHiddenInfo: true,
    optionsSchema: [
      { key: 'fastMode', label: { zh: '快节奏计时 (25秒)', en: 'Fast Turn Timer (25s)' }, type: 'boolean', default: false },
    ],
    rulesSummary: {
      zh: `### 游戏目标
在 **6 弹仓、2 枚实弹** 的左轮生死桌中存活下来！每位玩家初始持有 **16 枚秘密点数（Credits）**，他人无法看到你的剩余点数。

### 5 种行动（轮流顺时针执行）
- **公开调查（1 点）**：任选相邻 2 个弹仓，向**全场公开**实弹/空包弹情况。
- **私密调查（2 点）**：任选相邻 2 个弹仓，**仅自己可见**结果与位置。
- **旋转 +1 格（3 点）**：将左轮弹仓顺时针旋转 1 格。
- **旋转 +2 格（4 点）**：将左轮弹仓顺时针旋转 2 格。
- **暗箱操控（秘密投入 1–3 点）**：向公共操控池秘密投点（单次最多 3 点）。**当池内累计 ≥ 6 点的瞬间**，凑满者立刻秘密互换任意相邻 2 个弹仓（溢出点数清零，全员仅知触发了交换）。

### 触发连发处决
- 当场上恰好有 **3 名玩家点数归零**（3–4 人局为 2 人归零）时，行动立刻终止！
- 枪口从 1 号位起顺时针逐格扣动扳机：正对**实弹**者立即淘汰，其余玩家全部生还！`,
      en: `### Objective
Survive the **6-chamber, 2-live-bullet** Prison Match revolver! Every player begins with **16 hidden Credits** — no one else can see your remaining balance.

### 5 Show Actions (Clockwise Turns)
- **Public Peek (1 Credit)**: Reveal any 2 adjacent chambers publicly to all players.
- **Private Peek (2 Credits)**: Privately scan any 2 adjacent chambers — only you see the result.
- **Rotate +1 (3 Credits)**: Rotate the revolver cylinder clockwise by 1 slot.
- **Rotate +2 (4 Credits)**: Rotate the cylinder clockwise by 2 slots.
- **Secret Manipulate (1–3 Credits)**: Secretly fund the shared Manipulate Pool. The moment the pool reaches **≥ 6 Credits**, the player who pushed it over immediately **secretly swaps any 2 adjacent chambers** (overflow cleared).

### Clockwise Firing Sequence
- As soon as **3 players reach 0 Credits** (2 players in 3–4p matches), actions immediately halt!
- Triggers are pulled clockwise around the table: players facing live bullets are eliminated; all others survive!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: function renderGame(container, ctx) {
    const { state, mySeatId, lang, lastEvent, dispatch, sfx, ui } = ctx;
    const isZh = lang === 'zh';

    // Trigger bespoke SFX once per event
    const eventKey = `${state.turnNumber}-${state.phase}-${state.firingStep}-${state.visualRotationSteps}-${state.manipulateTriggerCount}-${state.firedShots.length}`;
    if (eventKey !== uiState.lastEventKey) {
      uiState.lastEventKey = eventKey;
      if (lastEvent?.type === 'ROTATE_1') playRatchet(1);
      else if (lastEvent?.type === 'ROTATE_2') playRatchet(2);
      else if (lastEvent?.type === 'PUBLIC_PEEK' || lastEvent?.type === 'PRIVATE_PEEK') sfx.play('cardFlip');
      else if (lastEvent?.type === 'MANIPULATE_CONTRIBUTE') sfx.play('bid');
      else if (lastEvent?.type === 'MANIPULATE_TRIGGERED') sfx.play('reveal');
      else if (lastEvent?.type === 'MANIPULATE_SWAP') sfx.play('tilePlace');
      else if (lastEvent?.type === 'FIRING_TRIGGERED') sfx.play('eliminate');

      if (state.firedShots.length > uiState.lastShotCount) {
        const latestShot = state.firedShots[state.firedShots.length - 1];
        uiState.lastShotCount = state.firedShots.length;
        clearTimeout(uiState.flashTimer);
        if (latestShot.isLive) {
          playGunshot();
          uiState.flashMode = 'bang';
        } else {
          playDryClick();
          uiState.flashMode = 'click';
        }
        uiState.flashTimer = setTimeout(() => {
          uiState.flashMode = null;
        }, 700);
      } else if (state.firedShots.length === 0) {
        uiState.lastShotCount = 0;
      }
    }

    const me = state.players.find((p) => p.seatId === mySeatId) || null;
    const currentActor = state.players.find(
      (p) => p.seatId === (state.phase === 'manipulate_swap' ? state.manipulatorSeatId : state.currentTurnSeatId)
    );
    const isMyTurn = state.phase === 'action' && mySeatId && state.currentTurnSeatId === mySeatId;
    const isMySwap = state.phase === 'manipulate_swap' && mySeatId && state.manipulatorSeatId === mySeatId;

    // Reset invalid action selections
    if (!isMyTurn) uiState.selectedAction = null;
    if (me && uiState.selectedAction === 'PRIVATE_PEEK' && me.credits < 2) uiState.selectedAction = null;
    if (me && uiState.manipulateAmount > me.credits) uiState.manipulateAmount = Math.max(1, Math.min(3, me.credits));

    const interactivePairMode =
      isMySwap || (isMyTurn && (uiState.selectedAction === 'PUBLIC_PEEK' || uiState.selectedAction === 'PRIVATE_PEEK'));

    const latestShot = state.firedShots.length ? state.firedShots[state.firedShots.length - 1] : null;
    const dangerClose = state.zeroCreditCount >= state.triggerZeroCount - 1 || state.phase === 'firing';

    // Phase Banner Headline
    let phaseHeadline = '';
    if (state.phase === 'firing' || state.phase === 'firing_done') {
      phaseHeadline = isZh
        ? `🔫 连发处决中 — 第 ${Math.min(state.firingStep + 1, state.numChambers)} / ${state.numChambers} 枪`
        : `🔫 FIRING SEQUENCE — Shot ${Math.min(state.firingStep + 1, state.numChambers)} / ${state.numChambers}`;
    } else if (state.phase === 'ended') {
      phaseHeadline = isZh ? '🏁 处决结束 · 全部机密已解封' : '🏁 Firing Complete · All Secrets Declassified';
    } else if (state.phase === 'manipulate_swap') {
      phaseHeadline = isMySwap
        ? isZh
          ? '⚡ 你触发了暗箱操控！请秘密选择相邻 2 弹仓互换'
          : '⚡ MANIPULATE KEY YOURS! Secretly choose 2 adjacent chambers to swap'
        : isZh
        ? `⚡ ${currentActor?.name || ''} 触发了 6 点暗箱操控，正在秘密互换弹仓...`
        : `⚡ ${currentActor?.name || ''} triggered Manipulate and is secretly swapping...`;
    } else {
      phaseHeadline = isMyTurn
        ? isZh
          ? '🎯 轮到你行动 — 选择查验、旋转或暗箱投点'
          : '🎯 YOUR TURN — Inspect, Rotate, or Fund Manipulate'
        : isZh
        ? `⏳ 等待 ${currentActor?.name || ''} 行动...`
        : `⏳ Waiting for ${currentActor?.name || ''}...`;
    }

    const pairChipsHtml = Array.from({ length: state.numChambers }, (_, p) => {
      const q = (p + 1) % state.numChambers;
      const sel = uiState.selectedPair === p;
      return `
        <button type="button" class="rr-chip ${isMySwap ? 'is-swap' : ''} ${sel ? 'is-selected' : ''}" data-select-pair="${p}">
          #${p + 1} ↔ #${q + 1}
        </button>
      `;
    }).join('');

    const myCredits = me?.credits ?? null;
    const creditPipsHtml =
      myCredits !== null
        ? Array.from({ length: state.startingCredits }, (_, i) => `<span class="rr-pip ${i < myCredits ? 'is-filled' : ''}"></span>`).join('')
        : '';

    container.innerHTML = `
      <div class="rr-arena ${uiState.flashMode === 'bang' ? 'is-firing-hit' : ''}">
        <div class="rr-banner ${dangerClose ? 'is-danger' : ''}">
          <div class="rr-banner-phase">${UI.escapeHtml(phaseHeadline)}</div>
          <div class="rr-metrics">
            <span class="rr-pill">${isZh ? '回合' : 'TURN'} <strong>#${state.turnNumber}</strong></span>
            <span class="rr-pill is-crimson">${isZh ? '归零触发' : 'ZERO TRIGGER'} <strong>${state.zeroCreditCount}/${state.triggerZeroCount}</strong></span>
            <span class="rr-pill is-amber">${isZh ? '暗箱注资次数' : 'POOL DEPOSITS'} <strong>${state.manipulateDepositsSinceTrigger}</strong></span>
            <span class="rr-pill">${isZh ? '实弹' : 'BULLETS'} <strong>${state.numBullets}/${state.numChambers}</strong></span>
          </div>
        </div>

        <!-- Centerpiece Noir Revolver Table -->
        <section class="rr-table-card ${state.phase === 'firing' || state.phase === 'firing_done' ? 'is-firing-mode' : ''}">
          <div class="rr-muzzle-flash ${uiState.flashMode === 'bang' ? 'is-bang' : uiState.flashMode === 'click' ? 'is-click' : ''}"></div>

          <div class="rr-svg-wrap">
            ${buildRevolverSvg(state, mySeatId, lang, interactivePairMode, isMySwap)}
          </div>

          ${
            latestShot && (state.phase === 'firing' || state.phase === 'firing_done')
              ? `
                <div class="rr-shot-callout ${latestShot.isLive ? 'is-live' : 'is-blank'}">
                  ${
                    latestShot.isLive
                      ? isZh
                        ? `💥 BANG! #${latestShot.pos + 1} ${UI.escapeHtml(latestShot.playerName)} 中弹！`
                        : `💥 BANG! #${latestShot.pos + 1} ${UI.escapeHtml(latestShot.playerName)} HIT!`
                      : isZh
                      ? `CLICK — #${latestShot.pos + 1} ${UI.escapeHtml(latestShot.playerName)} 安全`
                      : `CLICK — #${latestShot.pos + 1} ${UI.escapeHtml(latestShot.playerName)} SAFE`
                  }
                </div>
              `
              : ''
          }

          <div class="rr-table-caption">
            ${
              interactivePairMode
                ? isZh
                  ? '💡 可直接点击左轮外圈弧线或右侧按钮选择相邻弹仓对'
                  : '💡 Click an arc on the cylinder rim or a pair chip on the right'
                : state.lastActionSummary
                ? UI.escapeHtml(isZh ? state.lastActionSummary.zh : state.lastActionSummary.en)
                : isZh
                ? '蓝点=私密情报 · 金点=公开情报 · 橙色虚线=暗箱后待复核'
                : 'Blue dot = Private Intel · Gold dot = Public Intel · Amber dashed = Unverified after swap'
            }
          </div>

          ${
            state.phase === 'firing'
              ? `
                <div style="margin-top:12px;">
                  <button type="button" class="dp-btn dp-btn-crimson dp-btn-sm" id="rr-pull-now">
                    ${isZh ? '立即扣动下一枪 →' : 'Pull Next Trigger Now →'}
                  </button>
                </div>
              `
              : ''
          }
        </section>

        <!-- Right Control & Telemetry Column -->
        <aside class="rr-controls-col">
          ${
            me
              ? `
                <div class="rr-card">
                  <div class="rr-card-title">
                    <span>${isZh ? '我的机密点数库' : 'MY SECRET CREDITS'}</span>
                    <span style="color:var(--dp-cyan);font-size:10.5px;">${isZh ? '仅自己可见' : 'PRIVATE ONLY'}</span>
                  </div>
                  <div class="rr-credit-vault">
                    <div>
                      <div class="rr-credit-num ${myCredits === 0 ? 'is-zero' : ''}">${myCredits}</div>
                      <div style="font-size:11px;color:var(--dp-ink-muted);margin-top:3px;">
                        ${isZh ? `初始 ${state.startingCredits} 点 · 归零自动 Pass` : `of ${state.startingCredits} · Auto-Pass at 0`}
                      </div>
                    </div>
                    <div style="text-align:right;font-size:12px;color:var(--dp-ink-muted);">
                      <div>${isZh ? '我的座位' : 'MY SEAT'}</div>
                      <strong style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">#${me.seatIndex + 1} ${UI.escapeHtml(me.name)}</strong>
                    </div>
                  </div>
                  <div class="rr-credit-pips">${creditPipsHtml}</div>
                </div>
              `
              : ''
          }

          <!-- Action Panel -->
          <div class="rr-card">
            <div class="rr-card-title">
              <span>${isMySwap ? (isZh ? '⚡ 暗箱秘密互换' : '⚡ SECRET MANIPULATE SWAP') : isZh ? '战术行动面板' : 'TACTICAL ACTIONS'}</span>
              ${isMyTurn ? `<span class="dp-badge">${isZh ? '你的回合' : 'YOUR TURN'}</span>` : ''}
            </div>

            ${
              isMySwap
                ? `
                  <p style="font-size:12.5px;color:#fde68a;margin:0 0 8px;">
                    ${isZh ? '选择任意相邻的 2 个弹仓并秘密互换其内部弹药（他人不知位置）：' : 'Choose any 2 adjacent chambers to secretly swap their contents:'}
                  </p>
                  <div class="rr-pair-chips">${pairChipsHtml}</div>
                  <button type="button" class="dp-btn dp-btn-primary" id="rr-confirm-swap" style="width:100%;">
                    ${isZh ? `确认秘密互换 #${uiState.selectedPair + 1} ↔ #${((uiState.selectedPair + 1) % state.numChambers) + 1}` : `Confirm Secret Swap #${uiState.selectedPair + 1} ↔ #${((uiState.selectedPair + 1) % state.numChambers) + 1}`}
                  </button>
                `
                : state.phase === 'action'
                ? `
                  <div class="rr-action-list">
                    <button type="button" class="rr-action-btn ${uiState.selectedAction === 'PUBLIC_PEEK' ? 'is-active' : ''}" data-pick-action="PUBLIC_PEEK" ${!isMyTurn || myCredits < 1 ? 'disabled' : ''}>
                      <div class="rr-action-info">
                        <strong>👁 ${isZh ? '公开调查 (Public Peek)' : 'Public Peek'}</strong>
                        <span>${isZh ? '公开查验相邻 2 格实弹/空弹' : 'Reveal 2 adjacent chambers to everyone'}</span>
                      </div>
                      <span class="rr-cost-tag">1 CR</span>
                    </button>

                    <button type="button" class="rr-action-btn ${uiState.selectedAction === 'PRIVATE_PEEK' ? 'is-active' : ''}" data-pick-action="PRIVATE_PEEK" ${!isMyTurn || myCredits < 2 ? 'disabled' : ''}>
                      <div class="rr-action-info">
                        <strong>🕶 ${isZh ? '私密调查 (Private Peek)' : 'Private Peek'}</strong>
                        <span>${isZh ? '激光透视相邻 2 格（仅你可见）' : 'X-ray 2 adjacent chambers (you only)'}</span>
                      </div>
                      <span class="rr-cost-tag">2 CR</span>
                    </button>

                    <button type="button" class="rr-action-btn" data-direct-action="ROTATE_1" ${!isMyTurn || myCredits < 3 ? 'disabled' : ''}>
                      <div class="rr-action-info">
                        <strong>↻ ${isZh ? '旋转 +1 格 (Rotate +1)' : 'Rotate +1 Slot'}</strong>
                        <span>${isZh ? '弹仓顺时针旋转 1 格' : 'Rotate cylinder clockwise 1 slot'}</span>
                      </div>
                      <span class="rr-cost-tag">3 CR</span>
                    </button>

                    <button type="button" class="rr-action-btn" data-direct-action="ROTATE_2" ${!isMyTurn || myCredits < 4 ? 'disabled' : ''}>
                      <div class="rr-action-info">
                        <strong>⟳ ${isZh ? '旋转 +2 格 (Rotate +2)' : 'Rotate +2 Slots'}</strong>
                        <span>${isZh ? '弹仓顺时针旋转 2 格' : 'Rotate cylinder clockwise 2 slots'}</span>
                      </div>
                      <span class="rr-cost-tag">4 CR</span>
                    </button>

                    <button type="button" class="rr-action-btn is-manipulate ${uiState.selectedAction === 'MANIPULATE_CONTRIBUTE' ? 'is-active' : ''}" data-pick-action="MANIPULATE_CONTRIBUTE" ${!isMyTurn || myCredits < 1 ? 'disabled' : ''}>
                      <div class="rr-action-info">
                        <strong>⚡ ${isZh ? '暗箱操控 (Manipulate)' : 'Secret Manipulate'}</strong>
                        <span>${isZh ? '秘密投 1–3 点，池满 6 点立刻暗换' : 'Secretly fund 1–3 CR; ≥6 triggers swap'}</span>
                      </div>
                      <span class="rr-cost-tag">1–3 CR</span>
                    </button>
                  </div>

                  ${
                    isMyTurn && (uiState.selectedAction === 'PUBLIC_PEEK' || uiState.selectedAction === 'PRIVATE_PEEK')
                      ? `
                        <div class="rr-subpanel">
                          <div style="font-size:12px;color:var(--dp-cyan);font-weight:600;">
                            ${
                              uiState.selectedAction === 'PRIVATE_PEEK'
                                ? isZh
                                  ? '选择要私密透视的相邻 2 个弹仓：'
                                  : 'Choose 2 adjacent chambers to privately X-ray:'
                                : isZh
                                ? '选择要公开查验的相邻 2 个弹仓：'
                                : 'Choose 2 adjacent chambers to reveal publicly:'
                            }
                          </div>
                          <div class="rr-pair-chips">${pairChipsHtml}</div>
                          <button type="button" class="dp-btn dp-btn-primary" id="rr-confirm-peek" style="width:100%;">
                            ${isZh ? `确认查验 #${uiState.selectedPair + 1} & #${((uiState.selectedPair + 1) % state.numChambers) + 1}` : `Confirm Peek #${uiState.selectedPair + 1} & #${((uiState.selectedPair + 1) % state.numChambers) + 1}`}
                          </button>
                        </div>
                      `
                      : ''
                  }

                  ${
                    isMyTurn && uiState.selectedAction === 'MANIPULATE_CONTRIBUTE'
                      ? `
                        <div class="rr-subpanel">
                          <div style="font-size:12px;color:#fde68a;font-weight:600;margin-bottom:8px;">
                            ${isZh ? '秘密投入暗箱能量池（满 6 点触发，溢出作废）：' : 'Secretly contribute to Manipulate Pool (triggers at ≥6):'}
                          </div>
                          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
                            ${[1, 2, 3]
                              .map(
                                (amt) => `
                                <button type="button" class="rr-chip is-swap ${uiState.manipulateAmount === amt ? 'is-selected' : ''}" data-manip-amt="${amt}" ${myCredits < amt ? 'disabled' : ''}>
                                  ${amt} CR
                                </button>
                              `
                              )
                              .join('')}
                          </div>
                          <button type="button" class="dp-btn dp-btn-primary" id="rr-confirm-manip" style="width:100%;">
                            ${isZh ? `秘密投入 ${uiState.manipulateAmount} 点` : `Secretly Fund ${uiState.manipulateAmount} CR`}
                          </button>
                        </div>
                      `
                      : ''
                  }
                `
                : `
                  <div style="font-size:13px;color:var(--dp-ink-muted);padding:6px 0;">
                    ${
                      state.phase === 'ended'
                        ? isZh
                          ? '本局已结算。可查看下方解封的暗箱注资与互换档案。'
                          : 'Match concluded. Inspect the declassified ledger below.'
                        : isZh
                        ? '正在逐格扣动扳机，所有行动已锁定...'
                        : 'Trigger pulls underway — all actions locked...'
                    }
                  </div>
                `
            }
          </div>

          <!-- Seat Status & Recent Broadcast Feed -->
          <div class="rr-card">
            <div class="rr-card-title">
              <span>${isZh ? '囚徒席位状态' : 'PRISONER SEATS'}</span>
            </div>
            <div class="rr-players-grid">
              ${state.players
                .map((p) => {
                  const turn =
                    (state.phase === 'action' && state.currentTurnSeatId === p.seatId) ||
                    (state.phase === 'manipulate_swap' && state.manipulatorSeatId === p.seatId);
                  const cls = p.eliminated
                    ? 'is-eliminated'
                    : state.phase === 'ended'
                    ? 'is-survived'
                    : turn
                    ? 'is-turn'
                    : '';
                  const crText =
                    p.credits !== null
                      ? `${p.credits} CR`
                      : p.isZero
                      ? '0 CR'
                      : '•• CR';
                  return `
                    <div class="rr-player-pill ${cls}">
                      <span style="display:flex;align-items:center;gap:6px;overflow:hidden;">
                        <span class="rr-seat-idx">${p.seatIndex + 1}</span>
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(p.name)}</span>
                      </span>
                      <span style="font-family:var(--dp-font-mono);font-size:11.5px;color:${p.eliminated ? '#fca5a5' : p.isZero ? '#ff6b7a' : 'var(--dp-brass-bright)'};">
                        ${p.eliminated ? '💀' : crText}
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>

            ${
              state.phase === 'ended' && state.manipulateLedger
                ? `
                  <div class="rr-ledger">
                    <strong style="color:var(--dp-brass-bright);display:block;margin-bottom:5px;">
                      ${isZh ? '📂 解封档案：暗箱操控记录' : '📂 DECLASSIFIED: MANIPULATE LEDGER'}
                    </strong>
                    ${
                      state.manipulateLedger.length
                        ? state.manipulateLedger
                            .map((e) => `<div>T${e.turn} · ${UI.escapeHtml(e.playerName)}: <strong>+${e.amount} CR</strong></div>`)
                            .join('')
                        : `<div>${isZh ? '本局无人向暗箱池注资。' : 'No Manipulate deposits occurred.'}</div>`
                    }
                    ${
                      state.swapHistory?.length
                        ? `<div style="margin-top:6px;color:#fde68a;">${state.swapHistory
                            .map((s) => `⚡ T${s.turn} ${UI.escapeHtml(s.playerName)}: #${s.posA + 1} ↔ #${s.posB + 1}`)
                            .join(' | ')}</div>`
                        : ''
                    }
                  </div>
                `
                : ''
            }

            <div class="rr-card-title" style="margin-top:14px;">
              <span>${isZh ? '弹仓实况记录' : 'CHAMBER LOG'}</span>
            </div>
            <div class="rr-history">
              ${state.history
                .slice()
                .reverse()
                .map(
                  (h) => `
                  <div class="rr-history-row ${h.tone === 'alert' ? 'is-alert' : h.tone === 'intel' ? 'is-intel' : h.tone === 'manipulate' ? 'is-manipulate' : ''}">
                    ${UI.escapeHtml(isZh ? h.zh : h.en)}
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    // Bind pair selection (SVG arcs, SVG chambers, and chips)
    container.querySelectorAll('[data-select-pair]').forEach((el) => {
      el.addEventListener('click', () => {
        sfx.play('click');
        uiState.selectedPair = Number(el.dataset.selectPair);
        renderGame(container, ctx);
      });
    });

    if (interactivePairMode) {
      container.querySelectorAll('[data-chamber-pos]').forEach((el) => {
        el.addEventListener('click', () => {
          sfx.play('click');
          uiState.selectedPair = Number(el.dataset.chamberPos);
          renderGame(container, ctx);
        });
      });
    }

    // Action toggles
    container.querySelectorAll('[data-pick-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        const act = btn.dataset.pickAction;
        uiState.selectedAction = uiState.selectedAction === act ? null : act;
        renderGame(container, ctx);
      });
    });

    // Direct rotate actions
    container.querySelectorAll('[data-direct-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const res = await dispatch({ type: btn.dataset.directAction });
        if (!res.ok) ui.toast(res.reason, 'error');
      });
    });

    // Confirm Peek
    container.querySelector('#rr-confirm-peek')?.addEventListener('click', async () => {
      const type = uiState.selectedAction;
      uiState.selectedAction = null;
      const res = await dispatch({ type, payload: { pairIndex: uiState.selectedPair } });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Manipulate amount & confirm
    container.querySelectorAll('[data-manip-amt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        uiState.manipulateAmount = Number(btn.dataset.manipAmt);
        renderGame(container, ctx);
      });
    });

    container.querySelector('#rr-confirm-manip')?.addEventListener('click', async () => {
      uiState.selectedAction = null;
      const res = await dispatch({
        type: 'MANIPULATE_CONTRIBUTE',
        payload: { amount: uiState.manipulateAmount },
      });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Confirm Secret Swap
    container.querySelector('#rr-confirm-swap')?.addEventListener('click', async () => {
      const res = await dispatch({
        type: 'MANIPULATE_SWAP',
        payload: { pairIndex: uiState.selectedPair },
      });
      if (!res.ok) ui.toast(res.reason, 'error');
    });

    // Pull next trigger immediately
    container.querySelector('#rr-pull-now')?.addEventListener('click', () => {
      dispatch({ type: 'ADVANCE_FIRE' });
    });
  },
});
