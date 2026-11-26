import { mountGame, SFX, UI, Motion, Theme } from '../../shared/sdk.js';
import {
  GameRules,
  GRASS_ROWS,
  GRASS_COLS,
  GRASS_TILE_IDS,
  RANK_LABELS,
  SUIT_META,
  rotateGrassCells,
  canPlaceGrass,
} from './rules.js';

const EO_POKER_COORDS = [
  'A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4',
];

const EO_BACK_SVG = `
  <svg class="eo-pc-back-svg" viewBox="0 0 120 144" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <rect x="6" y="6" width="108" height="132" rx="8" stroke="rgba(212,175,106,0.45)" stroke-width="1.2"/>
    <path d="M60 16L104 72L60 128L16 72Z" stroke="rgba(212,175,106,0.28)" stroke-width="1.1"/>
    <path d="M60 30L92 72L60 114L28 72Z" stroke="rgba(212,175,106,0.18)" stroke-width="0.9"/>
    <circle cx="18" cy="18" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="102" cy="18" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="18" cy="126" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="102" cy="126" r="2" fill="rgba(242,213,145,0.55)"/>
  </svg>
`;

function eoSuitSvg(suit, cls = '', glossyId = null) {
  const paths = {
    S: 'M12 1.8C9.2 6.5 3.6 10.3 3.6 14.6c0 2.7 2 4.5 4.4 4.5 1.5 0 2.7-.8 3.3-1.8-.1 1.8-.7 3.3-2.2 4.5h5.8c-1.5-1.2-2.1-2.7-2.2-4.5.6 1 1.8 1.8 3.3 1.8 2.4 0 4.4-1.8 4.4-4.5 0-4.3-5.6-8.1-8.4-12.8z',
    H: 'M12 21.6C11.4 21.1 3 15 3 8.6 3 5.2 5.6 2.7 8.6 2.7c1.7 0 2.9.9 3.4 2.2.5-1.3 1.7-2.2 3.4-2.2 3 0 5.6 2.5 5.6 5.9 0 6.4-8.4 12.5-9 13z',
    D: 'M12 1.6L21 12 12 22.4 3 12 12 1.6z',
    C: 'M12 2.4a3.9 3.9 0 0 0-3.3 5.9 4 4 0 1 0-1.2 7.8c1.6 0 2.9-.8 3.7-2.1-.1 2.1-.8 4-2.4 5.4h6.4c-1.6-1.4-2.3-3.3-2.4-5.4.8 1.3 2.1 2.1 3.7 2.1a4 4 0 1 0-1.2-7.8 3.9 3.9 0 0 0-3.3-5.9z',
  };
  const d = paths[suit] || paths.S;
  if (!glossyId) {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  const isRed = suit === 'H' || suit === 'D';
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="${glossyId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${isRed ? '#f42c44' : '#2c3344'}"/><stop offset="100%" stop-color="${isRed ? '#b31227' : '#090b10'}"/></linearGradient></defs>
    <path d="${d}" fill="url(#${glossyId})"/>
  </svg>`;
}

function renderEoPlayingCardInner(card, coordLabel = '', stableKey = 'c') {
  const r = RANK_LABELS[card.rank] || String(card.rank);
  return `
    <span class="eo-pc-jumbo">
      <span class="eo-pc-rank">${r}</span>
      ${eoSuitSvg(card.suit, 'eo-pc-pip', null)}
    </span>
    ${eoSuitSvg(card.suit, 'eo-pc-center', `eo-sg-${stableKey}`)}
    ${coordLabel ? `<span class="eo-pc-coord">${coordLabel}</span>` : ''}
  `;
}

function renderEoCardBackInner(label) {
  return `${EO_BACK_SVG}<span class="eo-pc-back-crest">${label}</span>`;
}

function renderEoCardChip(card, picked = false) {
  const meta = SUIT_META[card.suit] || SUIT_META.S;
  const cls = meta.color === 'red' ? 'is-suit-red' : 'is-suit-black';
  return `<span class="eo-mini-chip ${cls} ${picked ? 'is-picked' : ''}">${RANK_LABELS[card.rank] || card.rank}${meta.symbol}</span>`;
}

const ui = {
  miniInput: '',
  pokerPick: [],
  grassRot: 0,
  grassHoverR: -1,
  grassHoverC: -1,
  lastStageSig: '',
  lastEvSig: '',
  tickHandle: null,
  lastCtx: null,
  delegated: false,
  themeSubscribed: false,
};

function drawMiniCubesCanvas(canvas, puzzle) {
  if (!canvas || !puzzle) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(280, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const c2 = canvas.getContext('2d');
  const isLight = Theme.get() === 'light';
  const fills = isLight
    ? { left: '#b5ab99', right: '#d2cabd', top: '#ffffff', stroke: 'rgba(138,102,34,0.65)', topStroke: 'rgba(138,102,34,0.85)' }
    : { left: '#141926', right: '#1f2538', top: '#353d54', stroke: 'rgba(212,175,106,0.36)', topStroke: 'rgba(242,213,145,0.75)' };

  c2.save();
  c2.scale(dpr, dpr);
  c2.clearRect(0, 0, w, h);

  const G = puzzle.gridSize;
  const yaw = Math.PI / 4;
  const pitch = Math.atan(1 / Math.sqrt(2));
  const scale = Math.min(w / (G * 2.1), h / (G * 1.9));
  const cx = w * 0.5;
  const cy = h * 0.62;
  const half = G / 2;

  const proj = (x, y, z) => {
    const rx = x * Math.cos(yaw) - y * Math.sin(yaw);
    const ry = x * Math.sin(yaw) + y * Math.cos(yaw);
    return {
      sx: cx + rx * scale,
      sy: cy + (ry * Math.sin(pitch) - z * Math.cos(pitch)) * scale,
      depth: ry * Math.cos(pitch) + z * Math.sin(pitch),
    };
  };

  const cubes = [];
  for (let x = 0; x < G; x++) {
    for (let y = 0; y < G; y++) {
      for (let z = 0; z < puzzle.heights[x][y]; z++) {
        const wx = x - half;
        const wy = y - half;
        cubes.push({ wx, wy, z, depth: proj(wx + 0.5, wy + 0.5, z + 0.5).depth });
      }
    }
  }
  cubes.sort((a, b) => a.depth - b.depth);

  for (const cb of cubes) {
    const p = (dx, dy, dz) => proj(cb.wx + dx, cb.wy + dy, cb.z + dz);
    const top = [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)];
    const right = [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)];
    const left = [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)];
    const drawFace = (pts, fill, stroke) => {
      c2.beginPath();
      c2.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < 4; i++) c2.lineTo(pts[i].sx, pts[i].sy);
      c2.closePath();
      c2.fillStyle = fill;
      c2.fill();
      c2.strokeStyle = stroke;
      c2.lineWidth = 1.2;
      c2.stroke();
    };
    drawFace(left, fills.left, fills.stroke);
    drawFace(right, fills.right, fills.stroke);
    drawFace(top, fills.top, fills.topStroke);
  }
  c2.restore();
}

mountGame({
  config: {
    id: 'either-or',
    title: { zh: '二选一', en: 'Either/Or', ko: '양자택일' },
    category: 'MAIN MATCH',
    episode: 'EP 1–2',
    minPlayers: 4,
    maxPlayers: 16,
    defaultPlayers: 8,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'mode',
        label: { zh: '赛制长度', en: 'Match Length' },
        type: 'select',
        default: 'full',
        choices: [
          { value: 'full', label: { zh: '完整主赛 (10轮二选一 + 4场小游戏)', en: 'Full Main Match (10 Choices + 4 Mini-Games)' } },
          { value: 'express', label: { zh: '精简快节奏 (6轮二选一 + 3场小游戏)', en: 'Express (6 Choices + 3 Mini-Games)' } },
        ],
      },
      {
        key: 'fastTimers',
        label: { zh: '快节奏倒计时', en: 'Fast Timers' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### Day 1 主赛 1：《二选一》(Ep 1–2)
- **10 次秘密二选一投票 + 4 场嵌入式脑力小游戏**（数方块、数矩形、记忆扑克、铺草坪）交替进行，累计总胜点！
- **冷金 (A) vs 猩红 (B) 博弈**：涵盖「公共利益 vs 个人利益」「少数派独赢」「贪婪翻倍」「劫富济贫」「孤狼奇袭」等 10 道高能囚徒困境题。
- **奖金徽章（Prize Token）**：通过公共利益考验可累计最多 **3 枚奖金徽章（+3 亿韩元）**。
- **赛后分区与联盟徽章**：
  - 上位圈进入 **生活馆（Living Quarters）**，中位圈进入 **监狱馆（Prison Quarters）**，最末 1–2 人 **直接淘汰**！
  - **主赛第 1 名**获得 **联盟徽章（Alliance Token）**，可从监狱馆名单中**拯救 1 人升入生活馆**！`,
      en: `### Day 1 Main Match 1: Either/Or (Ep 1–2)
- **10 Secret Binary Dilemmas + 4 Playable Mini-Games** (Count the Cubes, Count the Rectangles, Memory Poker, Lay the Grass) interleaved for cumulative victory points!
- **Cold-Gold (A) vs Crimson (B)**: Navigate Public Good vs Private Gain, Minority Triumph, Greedy Spike, Leader Tax, and Lone Wolf ambushes.
- **Prize Token Vault**: Pass group public-good trials to unlock up to **3 Prize Tokens (+300M KRW)**.
- **Quarters & Alliance Token Rescue**:
  - Top players advance to **Living Quarters**, middle go to **Prison Quarters**, bottom 1–2 face **Elimination**!
  - The **#1 Champion** receives the **Alliance Token** to rescue **1 Prison Quarters contestant** up into Living Quarters!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, lastEvent } = ctx;
    ui.lastCtx = ctx;

    if (!ui.themeSubscribed) {
      ui.themeSubscribed = true;
      Theme.onChange(() => {
        const c = ui.lastCtx;
        if (c?.state.phase === 'mini' && c.state.mini?.type === 'cubes') {
          drawMiniCubesCanvas(document.getElementById('eo-mini-cubes-canvas'), c.state.mini.puzzle);
        }
      });
    }

    const stageSig = `${state.stageIndex}-${state.phase}-${state.mini?.subPhase || ''}-${state.currentTurnSeatId || ''}`;
    if (stageSig !== ui.lastStageSig) {
      ui.miniInput = '';
      ui.pokerPick = [];
      ui.grassRot = 0;
      ui.grassHoverR = -1;
      ui.grassHoverC = -1;
      ui.lastStageSig = stageSig;
    }

    const evSig = lastEvent ? JSON.stringify(lastEvent) : '';
    let shouldShakeMini = false;
    if (evSig && evSig !== ui.lastEvSig) {
      ui.lastEvSig = evSig;
      if (lastEvent.type === 'CHOICE_REVEAL') {
        sfx.play('cardFlip');
        setTimeout(() => sfx.play('reveal'), 220);
      } else if (lastEvent.type === 'MINI_SOLVED' && lastEvent.seatId === mySeatId) {
        sfx.play('pieceGain');
      } else if (lastEvent.type === 'MINI_LOCKOUT' && lastEvent.seatId === mySeatId) {
        sfx.play('eliminate');
        shouldShakeMini = true;
      } else if (lastEvent.type === 'GRASS_PLACED') {
        sfx.play('tilePlace');
      } else if (lastEvent.type === 'POKER_FLIP') {
        sfx.play('cardFlip');
      }
    }

    const nameOf = (sid) => state.seats.find((s) => s.seatId === sid)?.name || sid;
    const initials = Object.fromEntries(state.seats.map((s, i) => [s.seatId, `P${i + 1}`]));
    const now = Date.now();

    let arenaHtml = '';
    let splitRatioA = 0.5;
    let splitRatioB = 0.5;

    // -----------------------------------------------------------------------
    // A. BINARY DILEMMA VOTE / REVEAL
    // -----------------------------------------------------------------------
    if ((state.phase === 'vote' || state.phase === 'reveal') && state.dilemma) {
      const d = state.dilemma;
      const myVote = mySeatId ? state.votes[mySeatId] : null;
      const isReveal = state.phase === 'reveal';
      const rev = state.lastReveal;
      const countA = isReveal ? Object.values(rev.votes).filter((v) => v === 'A').length : 0;
      const countB = isReveal ? Object.values(rev.votes).filter((v) => v === 'B').length : 0;
      const pctA = isReveal && state.seats.length ? Math.round((countA / state.seats.length) * 100) : 50;
      splitRatioA = isReveal && state.seats.length ? countA / state.seats.length : 0.5;
      splitRatioB = isReveal && state.seats.length ? countB / state.seats.length : 0.5;
      const votedTotal = state.seats.filter((s) => Boolean(state.votes[s.seatId])).length;

      arenaHtml = `
        <div class="eo-dilemma-head" data-motion-key="eo-head-choice">
          <span class="dp-badge">${d.code} · ${isReveal ? (lang === 'zh' ? '投票揭晓' : 'REVEAL') : (lang === 'zh' ? '秘密投票' : 'SECRET VOTE')}</span>
          <h2 class="eo-dilemma-title">${UI.escapeHtml(d.title[lang] || d.title.en)}</h2>
          <p class="eo-dilemma-sub">${UI.escapeHtml(d.subtitle[lang] || d.subtitle.en)}</p>
        </div>

        <div class="eo-pillars" data-motion-key="eo-pillars">
          <button type="button" class="eo-pillar eo-pillar-a ${!isReveal && mySeatId && !myVote ? 'is-clickable' : ''} ${myVote === 'A' ? 'is-chosen' : ''}" data-motion-key="eo-pillar-a" data-vote="A" ${isReveal || !mySeatId || myVote ? 'disabled' : ''}>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span class="eo-pillar-letter">A</span>
              ${myVote === 'A' ? `<span class="dp-badge">${lang === 'zh' ? '已选 A' : 'LOCKED A'}</span>` : ''}
            </div>
            <div class="eo-pillar-name">${UI.escapeHtml(d.aName[lang] || d.aName.en)}</div>
            <div class="eo-pillar-rule">${UI.escapeHtml(d.aRule[lang] || d.aRule.en)}</div>
          </button>

          <button type="button" class="eo-pillar eo-pillar-b ${!isReveal && mySeatId && !myVote ? 'is-clickable' : ''} ${myVote === 'B' ? 'is-chosen' : ''}" data-motion-key="eo-pillar-b" data-vote="B" ${isReveal || !mySeatId || myVote ? 'disabled' : ''}>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span class="eo-pillar-letter">B</span>
              ${myVote === 'B' ? `<span class="dp-badge dp-badge-crimson">${lang === 'zh' ? '已选 B' : 'LOCKED B'}</span>` : ''}
            </div>
            <div class="eo-pillar-name">${UI.escapeHtml(d.bName[lang] || d.bName.en)}</div>
            <div class="eo-pillar-rule">${UI.escapeHtml(d.bRule[lang] || d.bRule.en)}</div>
          </button>
        </div>

        ${
          isReveal && rev
            ? `
              <div class="eo-split-meter" data-motion-key="eo-split-meter">
                <div style="display:flex;justify-content:space-between;font-family:var(--dp-font-mono);font-size:13px;font-weight:700;">
                  <span style="color:var(--dp-brass-bright);">A: ${countA} (${pctA}%)</span>
                  <span style="color:var(--dp-crimson-bright);">B: ${countB} (${100 - pctA}%)</span>
                </div>
                <div class="eo-split-bar">
                  <div class="eo-split-a" id="eo-split-a" data-motion-key="eo-split-a" style="transform:scaleX(${splitRatioA.toFixed(4)});"></div>
                  <div class="eo-split-b" id="eo-split-b" data-motion-key="eo-split-b" style="transform:scaleX(${splitRatioB.toFixed(4)});"></div>
                </div>
                <div style="font-size:13.5px;font-weight:700;color:var(--dp-ink);text-align:center;margin-top:4px;">
                  ${UI.escapeHtml(rev.outcome[lang] || rev.outcome.en)}
                </div>
              </div>
            `
            : `<div class="dp-tabular" data-motion-key="eo-vote-prog" style="text-align:center;font-size:12.5px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                ${lang === 'zh' ? `投票进度：${votedTotal} / ${state.seats.length} 名选手已锁定终端` : `VOTES LOCKED: ${votedTotal} / ${state.seats.length}`}
               </div>`
        }

        <div class="eo-vote-grid" data-motion-key="eo-vote-grid">
          ${state.seats
            .map((s) => {
              const v = isReveal ? rev.votes[s.seatId] : state.votes[s.seatId];
              const delta = isReveal ? (rev.deltas[s.seatId] || 0) : 0;
              const isVoted = Boolean(v);
              return `
                <div class="eo-vote-slot" data-motion-key="eo-vs-${UI.escapeHtml(s.seatId)}">
                  <div class="eo-vote-card ${isReveal ? 'is-flipped' : ''}" data-motion-key="eo-vc-${UI.escapeHtml(s.seatId)}">
                    <div class="eo-vc-face eo-vc-front ${isVoted ? 'is-voted' : ''}">
                      <span style="font-size:11px;color:var(--dp-ink-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">
                        ${UI.escapeHtml(s.name)}
                      </span>
                      <span style="font-family:var(--dp-font-mono);font-size:18px;font-weight:800;color:${isVoted ? 'var(--dp-emerald)' : 'var(--dp-ink-faint)'};">
                        ${isVoted ? '✓' : '?'}
                      </span>
                      <span style="font-size:10px;color:var(--dp-ink-faint);">
                        ${isVoted ? (lang === 'zh' ? '已锁票' : 'LOCKED') : (lang === 'zh' ? '思考中' : 'VOTING')}
                      </span>
                    </div>
                    <div class="eo-vc-face eo-vc-back ${v === 'B' ? 'is-camp-b' : 'is-camp-a'}">
                      <span style="font-size:11px;color:var(--dp-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">
                        ${UI.escapeHtml(s.name)}
                      </span>
                      <span style="font-family:var(--dp-font-display);font-size:24px;font-weight:800;color:${v === 'B' ? 'var(--dp-crimson-bright)' : 'var(--dp-brass-bright)'};line-height:1;">
                        ${v || 'A'}
                      </span>
                      <span style="font-family:var(--dp-font-mono);font-size:11.5px;font-weight:700;color:${delta > 0 ? 'var(--dp-emerald)' : delta < 0 ? 'var(--dp-crimson-bright)' : 'var(--dp-ink-muted)'};">
                        ${delta > 0 ? `+${delta}` : delta} pt
                      </span>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        ${
          isReveal
            ? `<div style="display:flex;justify-content:center;" data-motion-key="eo-next-wrap">
                <button type="button" class="dp-btn dp-btn-primary" id="eo-next-stage" style="min-width:220px;min-height:46px;">
                  ${lang === 'zh' ? '推进至下一环节 →' : 'Proceed to Next Stage →'}
                </button>
               </div>`
            : ''
        }
      `;
    }

    // -----------------------------------------------------------------------
    // B. EMBEDDED MINI-GAME ROUNDS
    // -----------------------------------------------------------------------
    else if (state.phase === 'mini' && state.mini) {
      const m = state.mini;
      if (m.type === 'cubes' || m.type === 'rectangles') {
        const me = mySeatId ? m.players[mySeatId] : null;
        const lockRem = me && me.lockedUntil > now ? me.lockedUntil - now : 0;
        const isDone = m.subPhase === 'done';
        const title =
          m.type === 'cubes'
            ? (lang === 'zh' ? '嵌入小游戏 1 · 数方块 (Count the Cubes)' : 'Mini-Game 1 · Count the Cubes')
            : (lang === 'zh' ? '嵌入小游戏 2 · 数矩形 (Count the Rectangles)' : 'Mini-Game 2 · Count the Rectangles');

        arenaHtml = `
          <div class="eo-dilemma-head" data-motion-key="eo-head-mini-${m.type}">
            <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '主赛嵌入小游戏' : 'EMBEDDED MINI-GAME'}</span>
            <h2 class="eo-dilemma-title">${title}</h2>
            <p class="eo-dilemma-sub">
              ${m.type === 'cubes'
                ? (lang === 'zh' ? '心算 3D 重力支撑方块总数（含底层隐藏支撑块）！答错锁定 20 秒！' : 'Count ALL 3D gravity-supported cubes (including hidden supports)! Wrong guess = 20s lock!')
                : (lang === 'zh' ? `找出网格中所有格子数字之和恰好等于 ${m.puzzle.target} 的轴对齐矩形总个数！答错锁定 20 秒！` : `Count ALL axis-aligned sub-rectangles summing to ${m.puzzle.target}! Wrong guess = 20s lock!`)}
            </p>
          </div>

          <div class="eo-mini-stage" id="eo-mini-stage" data-motion-key="eo-mini-stage-${m.type}">
            ${
              m.type === 'cubes'
                ? `<canvas class="eo-mini-cubes-canvas" id="eo-mini-cubes-canvas" data-motion-key="eo-cubes-canvas"></canvas>`
                : `
                  <div style="text-align:center;">
                    <span class="dp-badge dp-tabular" style="font-size:13px;padding:5px 14px;">TARGET SUM = ${m.puzzle.target}</span>
                  </div>
                  <div class="eo-mini-rect-grid" data-motion-key="eo-rect-grid">
                    ${m.puzzle.grid.flat().map((v, i) => `<div class="eo-mini-rect-cell" data-motion-key="eo-rc-${i}">${v}</div>`).join('')}
                  </div>
                `
            }

            ${
              isDone
                ? `
                  <div style="text-align:center;padding:10px;border-radius:12px;border:1px solid var(--dp-border-strong);background:var(--dp-brass-glow);" data-motion-key="eo-mini-done">
                    <div style="font-size:12px;color:var(--dp-brass);font-weight:700;">${lang === 'zh' ? '标准精确答案' : 'EXACT ANSWER'}</div>
                    <div class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:38px;font-weight:800;color:var(--dp-brass-bright);">${m.puzzle.total}</div>
                    <div style="font-size:12.5px;color:var(--dp-ink-muted);margin:6px 0 12px;">
                      ${m.solveOrder.length
                        ? m.solveOrder.map((sid, i) => `#${i + 1} ${UI.escapeHtml(nameOf(sid))} (+${m.deltas[sid] || 0})`).join(' · ')
                        : (lang === 'zh' ? '本轮无人解出' : 'No solvers this round')}
                    </div>
                    <button type="button" class="dp-btn dp-btn-primary" id="eo-next-stage">
                      ${lang === 'zh' ? '返回二选一主赛 →' : 'Return to Either/Or →'}
                    </button>
                  </div>
                `
                : me?.solvedAt
                ? `<div style="text-align:center;color:var(--dp-emerald);font-weight:700;padding:10px;">✓ ${lang === 'zh' ? '已精确命中！等待其他选手...' : 'EXACT MATCH! Waiting for others...'}</div>`
                : mySeatId
                ? `
                  <div style="display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;" data-motion-key="eo-mini-input-row">
                    <input class="dp-input dp-input-mono dp-tabular" id="eo-mini-input" type="number" min="0" max="500" style="width:150px;text-align:center;font-size:20px;" value="${UI.escapeHtml(ui.miniInput)}" placeholder="${lang === 'zh' ? '输入总数' : 'TOTAL'}" ${lockRem > 0 ? 'disabled' : ''} />
                    <button type="button" class="dp-btn dp-btn-primary dp-tabular" id="eo-mini-submit" ${lockRem > 0 ? 'disabled' : ''}>
                      ${lockRem > 0 ? `LOCKED ${Math.ceil(lockRem / 1000)}s` : (lang === 'zh' ? '提交答案' : 'Submit')}
                    </button>
                    <button type="button" class="dp-btn dp-btn-ghost dp-btn-sm" id="eo-mini-giveup">${lang === 'zh' ? '跳过/揭晓' : 'Reveal'}</button>
                  </div>
                `
                : ''
            }
          </div>
        `;
      } else if (m.type === 'poker') {
        const isMem = m.subPhase === 'memorize';
        const isSel = m.subPhase === 'select';
        const isDone = m.subPhase === 'done';
        const myPick = mySeatId && Array.isArray(m.picks[mySeatId]) ? m.picks[mySeatId] : null;
        const activePick = myPick || ui.pokerPick;

        arenaHtml = `
          <div class="eo-dilemma-head" data-motion-key="eo-head-mini-poker">
            <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '嵌入小游戏 3 · 记忆扑克' : 'Mini-Game 3 · Memory Poker'}</span>
            <h2 class="eo-dilemma-title">
              ${isMem ? (lang === 'zh' ? '记住 16 张牌面！' : 'Memorize All 16 Cards!') : isSel ? (lang === 'zh' ? '结合 3 张公共牌盲选 2 张！' : 'Pick 2 Hidden Cards!') : (lang === 'zh' ? '记忆扑克亮牌结算！' : 'Memory Poker Showdown!')}
            </h2>
          </div>

          <div class="eo-mini-stage" data-motion-key="eo-mini-stage-poker">
            <div class="eo-mini-poker-comm">
              <span style="font-size:11px;color:var(--dp-brass);letter-spacing:0.1em;font-weight:700;">COMMUNITY:</span>
              ${m.community
                .map((card, i) => {
                  if (!card) return `<span class="eo-mini-comm-card is-hidden" data-motion-key="eo-mc-${i}">${renderEoCardBackInner('?')}</span>`;
                  const suitCls = (SUIT_META[card.suit]?.color === 'red') ? 'is-suit-red' : 'is-suit-black';
                  return `<span class="eo-mini-comm-card ${suitCls}" data-motion-key="eo-mc-${i}">${renderEoPlayingCardInner(card, '', `mc-${i}`)}</span>`;
                })
                .join('')}
            </div>

            <div class="eo-mini-poker-grid" data-motion-key="eo-poker-grid">
              ${m.grid
                .map((card, idx) => {
                  const sel = activePick.includes(idx);
                  const suitCls = card && !isSel ? (SUIT_META[card.suit]?.color === 'red' ? 'is-suit-red' : 'is-suit-black') : '';
                  const coord = EO_POKER_COORDS[idx] || `#${idx + 1}`;
                  return `<button type="button" class="eo-mini-pcard ${isSel ? 'is-hidden' : suitCls} ${sel ? 'is-sel' : ''}" data-motion-key="eo-pcard-${idx}" data-pcard="${idx}" ${isSel && mySeatId && !myPick ? '' : 'disabled'}>
                    ${isSel || !card ? renderEoCardBackInner(coord) : renderEoPlayingCardInner(card, coord, `g-${idx}`)}
                  </button>`;
                })
                .join('')}
            </div>

            ${
              isMem && mySeatId
                ? `<div style="text-align:center;"><button type="button" class="dp-btn dp-btn-primary" id="eo-poker-ready">${lang === 'zh' ? '我已记牢 · 立刻翻面 →' : 'Memorized · Flip Now →'}</button></div>`
                : isSel && mySeatId && !myPick
                ? `<div style="text-align:center;"><button type="button" class="dp-btn dp-btn-primary dp-tabular" id="eo-poker-lock" ${ui.pokerPick.length !== 2 ? 'disabled' : ''}>${lang === 'zh' ? `锁定 2 张牌 (${ui.pokerPick.length}/2)` : `Lock 2 Cards (${ui.pokerPick.length}/2)`}</button></div>`
                : isDone
                ? `
                  <div style="display:flex;flex-direction:column;gap:6px;">
                    ${(m.results || []).slice(0, 6).map((e) => `
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;padding:6px 10px;border-radius:8px;background:var(--dp-surface-row);">
                        <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                          <strong>#${e.rank}</strong> ${UI.escapeHtml(nameOf(e.seatId))} · ${UI.escapeHtml(e.eval.name[lang] || e.eval.name.en)}
                          ${(e.pickedCards || []).map((c) => renderEoCardChip(c, true)).join('')}
                        </span>
                        <strong class="dp-tabular" style="color:var(--dp-emerald);font-family:var(--dp-font-mono);">+${e.pts}pt</strong>
                      </div>
                    `).join('')}
                    <button type="button" class="dp-btn dp-btn-primary" id="eo-next-stage" style="margin-top:8px;">
                      ${lang === 'zh' ? '返回二选一主赛 →' : 'Return to Either/Or →'}
                    </button>
                  </div>
                `
                : ''
            }
          </div>
        `;
      } else if (m.type === 'grass') {
        const isMyTurn = Boolean(mySeatId && state.currentTurnSeatId === mySeatId);
        const activeTid = m.subPhase === 'place' && state.currentTurnSeatId ? m.chosenTiles[state.currentTurnSeatId] : null;
        arenaHtml = `
          <div class="eo-dilemma-head" data-motion-key="eo-head-mini-grass">
            <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '嵌入小游戏 4 · 铺草坪 (114格)' : 'Mini-Game 4 · Lay the Grass (114 Cells)'}</span>
            <h2 class="eo-dilemma-title">
              ${m.subPhase === 'draft'
                ? (lang === 'zh' ? '低分先选砖：挑选 1 块草坪骨牌' : 'Low-Score-First Draft: Pick 1 Tile')
                : m.subPhase === 'place'
                ? (lang === 'zh' ? '小砖先铺设：旋转 90° 落子（不可翻面）' : 'Smallest-First Placement: Rotate 90° Only')
                : (lang === 'zh' ? '114 格公园铺设完成！' : '114-Cell Park Complete!')}
            </h2>
            ${state.currentTurnSeatId ? `<p class="eo-dilemma-sub">${lang === 'zh' ? '当前行动：' : 'Turn: '}<strong>${UI.escapeHtml(nameOf(state.currentTurnSeatId))}</strong></p>` : ''}
          </div>

          <div class="eo-mini-stage" data-motion-key="eo-mini-stage-grass">
            <div class="eo-mini-grass-board" id="eo-grass-board" data-motion-key="eo-grass-board">
              ${Array.from({ length: GRASS_ROWS }, (_, r) =>
                Array.from({ length: GRASS_COLS }, (_, c) => {
                  const v = m.board[r][c];
                  if (v === 'OBSTACLE') return `<div class="eo-mg-cell is-obs" data-motion-key="eo-gc-${r}-${c}" data-r="${r}" data-c="${c}">❖</div>`;
                  if (v) return `<div class="eo-mg-cell" data-motion-key="eo-gc-${r}-${c}" data-r="${r}" data-c="${c}" style="background:${state.colorMap[v]};">${initials[v]}</div>`;
                  return `<div class="eo-mg-cell" data-motion-key="eo-gc-${r}-${c}" data-r="${r}" data-c="${c}"></div>`;
                }).join('')
              ).join('')}
            </div>

            ${
              m.subPhase === 'draft' && isMyTurn
                ? `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    ${GRASS_TILE_IDS.map((tid) => `<button type="button" class="dp-btn dp-btn-sm dp-tabular" data-gdraft="${tid}">#${tid} (+${tid}pt)</button>`).join('')}
                   </div>`
                : m.subPhase === 'place' && isMyTurn && activeTid
                ? `<div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;">
                    <span class="dp-tabular" style="font-size:13px;color:var(--dp-emerald);font-weight:700;">${lang === 'zh' ? `当前铺设 #${activeTid} 号砖` : `Placing Tile #${activeTid}`}</span>
                    ${m.currentCanPlace
                      ? `<button type="button" class="dp-btn dp-btn-sm" id="eo-grot">↻ ${lang === 'zh' ? '旋转 90° (R)' : 'Rotate 90° (R)'}</button>`
                      : `<button type="button" class="dp-btn dp-btn-crimson dp-btn-sm" id="eo-gforfeit">${lang === 'zh' ? '无空间 · 弃权 (0分)' : 'Blocked · 0 pts'}</button>`}
                   </div>`
                : m.subPhase === 'done'
                ? `<div style="text-align:center;">
                    <button type="button" class="dp-btn dp-btn-primary" id="eo-next-stage">
                      ${lang === 'zh' ? '进入最终第 10 题审判 →' : 'Proceed to Final Choice 10 →'}
                    </button>
                   </div>`
                : ''
            }
          </div>
        `;
      }
    }

    // -----------------------------------------------------------------------
    // C. ALLIANCE TOKEN RESCUE CEREMONY
    // -----------------------------------------------------------------------
    else if (state.phase === 'alliance_rescue' || state.phase === 'finished') {
      const isChamp = mySeatId === state.championSeatId;
      const prisoners = state.rankedIds.filter((sid) => state.zones[sid] === 'prison');

      arenaHtml = `
        <div class="eo-dilemma-head" data-motion-key="eo-head-rescue">
          <span class="dp-badge">♛ ${lang === 'zh' ? '联盟徽章拯救仪式' : 'ALLIANCE TOKEN RESCUE'}</span>
          <h2 class="eo-dilemma-title" style="color:var(--dp-brass-bright);">
            ${lang === 'zh'
              ? `主赛第 1 名：${UI.escapeHtml(nameOf(state.championSeatId))}`
              : `Main Match #1 Champion: ${UI.escapeHtml(nameOf(state.championSeatId))}`}
          </h2>
          <p class="eo-dilemma-sub">
            ${state.rescuedSeatId
              ? (lang === 'zh'
                  ? `联盟徽章已授予 ${UI.escapeHtml(nameOf(state.rescuedSeatId))}，成功从监狱馆升入生活馆！`
                  : `Alliance Token bestowed upon ${UI.escapeHtml(nameOf(state.rescuedSeatId))} — elevated to Living Quarters!`)
              : isChamp
              ? (lang === 'zh' ? '你赢得了「联盟徽章」！请从下方监狱馆名单中拯救 1 位选手升入生活馆：' : 'You won the Alliance Token! Rescue 1 Prison Quarters player into Living Quarters:')
              : (lang === 'zh' ? `等待第 1 名 ${UI.escapeHtml(nameOf(state.championSeatId))} 使用联盟徽章拯救一位监狱馆选手...` : `Waiting for ${UI.escapeHtml(nameOf(state.championSeatId))} to award the Alliance Token...`)}
          </p>
        </div>

        ${
          state.phase === 'alliance_rescue' && isChamp
            ? `
              <div class="eo-rescue-grid">
                ${prisoners
                  .map(
                    (sid) => `
                    <button type="button" class="eo-rescue-card" data-motion-key="eo-res-${UI.escapeHtml(sid)}" data-rescue="${UI.escapeHtml(sid)}">
                      <strong style="color:var(--dp-brass-bright);font-size:15px;">${UI.escapeHtml(nameOf(sid))}</strong>
                      <span class="dp-tabular" style="font-size:12px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">${state.scores[sid] || 0} pts · PRISON</span>
                      <span class="dp-badge" style="align-self:flex-start;margin-top:4px;">${lang === 'zh' ? '拯救升入生活馆 →' : 'Rescue to Living →'}</span>
                    </button>
                  `
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      `;
    }

    const html = `
      <div class="eo-shell" data-motion-key="eo-shell">
        <div class="eo-top-strip" data-motion-key="eo-top-strip">
          <div class="eo-timeline">
            ${state.schedule
              .map((it, idx) => {
                const cls = idx < state.stageIndex ? 'is-done' : idx === state.stageIndex ? 'is-current' : '';
                return `<span class="eo-pip ${it.kind === 'mini' ? 'is-mini' : ''} ${cls}" data-motion-key="eo-pip-${idx}">${it.pip}</span>`;
              })
              .join('')}
            <span class="eo-pip ${state.phase === 'alliance_rescue' ? 'is-current' : state.phase === 'finished' ? 'is-done' : ''}" data-motion-key="eo-pip-star">★</span>
          </div>

          <div class="eo-prize-vault">
            <span style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${lang === 'zh' ? '奖金徽章' : 'PRIZE TOKENS'}
            </span>
            <div style="display:flex;gap:5px;">
              ${[1, 2, 3]
                .map((n) => `<span class="eo-token-socket ${state.prizeTokens >= n ? 'is-lit' : ''}" data-motion-key="eo-tok-${n}">₩</span>`)
                .join('')}
            </div>
            <strong class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12.5px;color:var(--dp-brass-bright);">
              ${state.prizeTokens}${lang === 'zh' ? '亿' : '00M'}
            </strong>
          </div>
        </div>

        <div class="eo-main-grid" data-motion-key="eo-main-grid">
          <section class="eo-arena" data-motion-key="eo-arena">${arenaHtml}</section>

          <aside class="eo-standings" data-motion-key="eo-standings">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                ${lang === 'zh' ? '主赛总胜点与去向线' : 'MAIN MATCH STANDINGS'}
              </span>
              <span class="dp-tabular" style="font-size:11px;color:var(--dp-ink-muted);">
                ${lang === 'zh' ? `生活${state.livingCount} · 淘汰${state.elimCount}` : `Liv ${state.livingCount} · Elim ${state.elimCount}`}
              </span>
            </div>
            <div id="eo-stand-list" style="display:flex;flex-direction:column;gap:6px;">
              ${state.rankedIds
                .map((sid, idx) => {
                  const s = state.seats.find((x) => x.seatId === sid);
                  const z = state.zones[sid];
                  const zCls = z === 'living' ? 'is-living' : z === 'eliminated' ? 'is-elim' : 'is-prison';
                  const zLabel =
                    sid === state.rescuedSeatId
                      ? (lang === 'zh' ? '★ 拯救' : '★ SAVED')
                      : z === 'living'
                      ? (lang === 'zh' ? '生活馆' : 'LIVING')
                      : z === 'eliminated'
                      ? (lang === 'zh' ? '淘汰线' : 'ELIM')
                      : (lang === 'zh' ? '监狱馆' : 'PRISON');
                  return `
                    <div class="eo-zone-row ${zCls} ${sid === mySeatId ? 'is-me' : ''}" data-motion-key="eo-zr-${UI.escapeHtml(sid)}">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <strong style="color:var(--dp-brass);margin-right:5px;">#${idx + 1}</strong>
                        ${UI.escapeHtml(s?.name || sid)}
                      </span>
                      <span style="display:flex;align-items:center;gap:7px;">
                        <span class="eo-zone-tag ${zCls}">${zLabel}</span>
                        <strong class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);min-width:40px;text-align:right;">
                          ${state.scores[sid] || 0}pt
                        </strong>
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </aside>
        </div>
      </div>
    `;

    // FLIP capture on Main Match standings before patching
    const standBefore = container.querySelector('#eo-stand-list');
    const prevStandRects = standBefore ? Motion.captureFlip(standBefore) : null;

    Motion.patchDOM(container, html);

    const standAfter = container.querySelector('#eo-stand-list');
    if (standAfter && prevStandRects && prevStandRects.size > 0) {
      Motion.playFlip(standAfter, prevStandRects);
    }

    if (shouldShakeMini) {
      Motion.shake(container.querySelector('#eo-mini-stage'));
    }

    if (state.phase === 'mini' && state.mini?.type === 'cubes') {
      drawMiniCubesCanvas(container.querySelector('#eo-mini-cubes-canvas'), state.mini.puzzle);
    }

    // Bind delegated event listeners ONCE on container
    if (!ui.delegated) {
      ui.delegated = true;

      Motion.delegate(container, 'click', '[data-vote]', (e, btn) => {
        ui.lastCtx?.sfx.play('bid');
        ui.lastCtx?.dispatch({ type: 'CAST_VOTE', payload: { choice: btn.dataset.vote } });
      }, 'eo-vote');

      Motion.delegate(container, 'click', '#eo-next-stage', () => {
        ui.lastCtx?.sfx.play('click');
        ui.lastCtx?.dispatch({ type: 'NEXT_STAGE' });
      }, 'eo-next');

      Motion.delegate(container, 'click', '[data-rescue]', (e, btn) => {
        ui.lastCtx?.sfx.play('victory');
        ui.lastCtx?.dispatch({ type: 'RESCUE_PRISONER', payload: { targetSeatId: btn.dataset.rescue } });
      }, 'eo-rescue');

      // Mini-Game 1 & 2 (Cubes / Rectangles)
      Motion.delegate(container, 'input', '#eo-mini-input', (e, inp) => {
        ui.miniInput = inp.value;
      }, 'eo-minp');

      const sendMini = async () => {
        const c = ui.lastCtx;
        const inp = container.querySelector('#eo-mini-input');
        if (!c || !inp || inp.value === '') return;
        const val = Number(inp.value);
        if (Number.isNaN(val)) return;
        ui.miniInput = '';
        inp.value = '';
        c.sfx.play('bid');
        const res = await c.dispatch({ type: 'MINI_GUESS', payload: { guess: val } });
        if (!res.ok) {
          Motion.shake(container.querySelector('#eo-mini-stage'));
          if (res.reason) UI.toast(res.reason, 'error');
        }
      };

      Motion.delegate(container, 'keydown', '#eo-mini-input', (e) => {
        if (e.key === 'Enter') sendMini();
      }, 'eo-minp-k');
      Motion.delegate(container, 'click', '#eo-mini-submit', () => sendMini(), 'eo-msub');
      Motion.delegate(container, 'click', '#eo-mini-giveup', () => {
        ui.lastCtx?.dispatch({ type: 'MINI_GIVEUP' });
      }, 'eo-mgive');

      // Mini-Game 3 (Memory Poker)
      Motion.delegate(container, 'click', '#eo-poker-ready', () => {
        ui.lastCtx?.sfx.play('click');
        ui.lastCtx?.dispatch({ type: 'MINI_POKER_READY' });
      }, 'eo-prdy');

      Motion.delegate(container, 'click', '[data-pcard]', (e, btn) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'mini' || c.state.mini?.type !== 'poker' || c.state.mini.subPhase !== 'select') return;
        if (Array.isArray(c.state.mini.picks[c.mySeatId])) return;
        const idx = Number(btn.dataset.pcard);
        const pos = ui.pokerPick.indexOf(idx);
        if (pos >= 0) ui.pokerPick.splice(pos, 1);
        else if (ui.pokerPick.length < 2) ui.pokerPick.push(idx);
        else {
          ui.pokerPick.shift();
          ui.pokerPick.push(idx);
        }
        c.sfx.play('click');
        container.querySelectorAll('[data-pcard]').forEach((b) => {
          b.classList.toggle('is-sel', ui.pokerPick.includes(Number(b.dataset.pcard)));
        });
        const lk = container.querySelector('#eo-poker-lock');
        if (lk) {
          lk.disabled = ui.pokerPick.length !== 2;
          lk.textContent = c.lang === 'zh' ? `锁定 2 张牌 (${ui.pokerPick.length}/2)` : `Lock 2 Cards (${ui.pokerPick.length}/2)`;
        }
      }, 'eo-pcard');

      Motion.delegate(container, 'click', '#eo-poker-lock', () => {
        const c = ui.lastCtx;
        if (!c || ui.pokerPick.length !== 2) return;
        c.sfx.play('bid');
        const pair = [...ui.pokerPick];
        ui.pokerPick = [];
        c.dispatch({ type: 'MINI_POKER_PICK', payload: { pair } });
      }, 'eo-plock');

      // Mini-Game 4 (Lay the Grass)
      const paintGhost = () => {
        const c = ui.lastCtx;
        const gBoard = container.querySelector('#eo-grass-board');
        if (!c || !gBoard || c.state.phase !== 'mini' || c.state.mini?.type !== 'grass') return;
        gBoard.querySelectorAll('.is-ok, .is-bad').forEach((el) => el.classList.remove('is-ok', 'is-bad'));
        const m = c.state.mini;
        const isMyTurn = Boolean(c.mySeatId && c.state.currentTurnSeatId === c.mySeatId);
        const activeTid = m.subPhase === 'place' && isMyTurn ? m.chosenTiles[c.mySeatId] : null;
        if (!activeTid || ui.grassHoverR < 0 || ui.grassHoverC < 0) return;
        const ok = canPlaceGrass(m.board, activeTid, ui.grassHoverR, ui.grassHoverC, ui.grassRot);
        for (const [dr, dc] of rotateGrassCells(activeTid, ui.grassRot)) {
          const rr = ui.grassHoverR + dr;
          const cc = ui.grassHoverC + dc;
          if (rr >= 0 && rr < GRASS_ROWS && cc >= 0 && cc < GRASS_COLS) {
            gBoard.querySelector(`[data-r="${rr}"][data-c="${cc}"]`)?.classList.add(ok ? 'is-ok' : 'is-bad');
          }
        }
      };

      const doGrassRot = () => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'mini' || c.state.mini?.type !== 'grass' || c.state.mini.subPhase !== 'place') return;
        if (c.state.currentTurnSeatId !== c.mySeatId) return;
        ui.grassRot = (ui.grassRot + 1) % 4;
        c.sfx.play('click');
        paintGhost();
      };

      Motion.delegate(container, 'click', '[data-gdraft]', (e, btn) => {
        ui.lastCtx?.sfx.play('bid');
        ui.lastCtx?.dispatch({ type: 'MINI_GRASS_DRAFT', payload: { tileId: Number(btn.dataset.gdraft) } });
      }, 'eo-gdraft');

      Motion.delegate(container, 'click', '#eo-gforfeit', () => {
        ui.lastCtx?.sfx.play('eliminate');
        ui.lastCtx?.dispatch({ type: 'MINI_GRASS_FORFEIT' });
      }, 'eo-gforf');

      Motion.delegate(container, 'click', '#eo-grot', () => doGrassRot(), 'eo-grot');

      Motion.delegate(container, 'pointermove', '#eo-grass-board', (e) => {
        const c = e.target.closest?.('.eo-mg-cell');
        if (!c) return;
        ui.grassHoverR = Number(c.dataset.r);
        ui.grassHoverC = Number(c.dataset.c);
        paintGhost();
      }, 'eo-gpm');

      Motion.delegate(container, 'click', '#eo-grass-board', async (e) => {
        const ctxNow = ui.lastCtx;
        if (!ctxNow || ctxNow.state.phase !== 'mini' || ctxNow.state.mini?.type !== 'grass') return;
        const m = ctxNow.state.mini;
        if (m.subPhase !== 'place' || ctxNow.state.currentTurnSeatId !== ctxNow.mySeatId || !m.currentCanPlace) return;
        const cell = e.target.closest?.('.eo-mg-cell');
        if (!cell) return;
        const r = Number(cell.dataset.r);
        const col = Number(cell.dataset.c);
        const activeTid = m.chosenTiles[ctxNow.mySeatId];
        if (!canPlaceGrass(m.board, activeTid, r, col, ui.grassRot)) {
          ctxNow.sfx.play('error');
          Motion.shake(container.querySelector('#eo-grass-board'));
          return;
        }
        await ctxNow.dispatch({ type: 'MINI_GRASS_PLACE', payload: { r, c: col, rot: ui.grassRot } });
      }, 'eo-gclk');

      Motion.delegate(container, 'contextmenu', '#eo-grass-board', (e) => {
        e.preventDefault();
        doGrassRot();
      }, 'eo-gctx');

      if (window._eoKey) window.removeEventListener('keydown', window._eoKey);
      window._eoKey = (e) => {
        if (e.key === 'r' || e.key === 'R') doGrassRot();
      };
      window.addEventListener('keydown', window._eoKey);
    }

    // Host speed-mini-game bot scheduler & lockout text tick (never wipes DOM!)
    clearInterval(ui.tickHandle);
    if (state.phase === 'mini' && state.mini && ['cubes', 'rectangles'].includes(state.mini.type) && state.mini.subPhase === 'playing') {
      ui.tickHandle = setInterval(() => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'mini' || c.state.mini?.subPhase !== 'playing') {
          clearInterval(ui.tickHandle);
          return;
        }
        if (c.isHost) c.dispatch({ type: 'MINI_BOT_TICK' });
        const me = c.mySeatId ? c.state.mini.players[c.mySeatId] : null;
        const btn = document.getElementById('eo-mini-submit');
        const inp = document.getElementById('eo-mini-input');
        if (me && me.lockedUntil > 0 && btn) {
          const rem = me.lockedUntil - Date.now();
          if (rem > 0) btn.textContent = `LOCKED ${Math.ceil(rem / 1000)}s`;
          else {
            btn.disabled = false;
            if (inp) inp.disabled = false;
            btn.textContent = c.lang === 'zh' ? '提交答案' : 'Submit';
          }
        }
      }, 1000);
    }
  },
});
