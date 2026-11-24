import { mountGame, SFX, UI } from '../../shared/sdk.js';
import {
  GameRules,
  GRASS_ROWS,
  GRASS_COLS,
  GRASS_TILE_IDS,
  RANK_LABELS,
  rotateGrassCells,
  canPlaceGrass,
} from './rules.js';

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
};

function drawMiniCubesCanvas(canvas, puzzle) {
  if (!canvas || !puzzle) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(280, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c2 = canvas.getContext('2d');
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
    drawFace(left, '#141926', 'rgba(212,175,106,0.34)');
    drawFace(right, '#1f2538', 'rgba(212,175,106,0.38)');
    drawFace(top, '#353d54', 'rgba(242,213,145,0.75)');
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
    if (evSig && evSig !== ui.lastEvSig) {
      ui.lastEvSig = evSig;
      if (lastEvent.type === 'CHOICE_REVEAL') {
        sfx.play('cardFlip');
        setTimeout(() => sfx.play('reveal'), 220);
      } else if (lastEvent.type === 'MINI_SOLVED' && lastEvent.seatId === mySeatId) {
        sfx.play('pieceGain');
      } else if (lastEvent.type === 'MINI_LOCKOUT' && lastEvent.seatId === mySeatId) {
        sfx.play('eliminate');
      } else if (lastEvent.type === 'GRASS_PLACED') {
        sfx.play('tilePlace');
      } else if (lastEvent.type === 'POKER_FLIP') {
        sfx.play('cardFlip');
      }
    }

    const nameOf = (sid) => state.seats.find((s) => s.seatId === sid)?.name || sid;
    const initials = Object.fromEntries(state.seats.map((s, i) => [s.seatId, `P${i + 1}`]));
    const now = Date.now();

    // Build Left Arena Body based on phase
    let arenaHtml = '';

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
      const votedTotal = state.seats.filter((s) => Boolean(state.votes[s.seatId])).length;

      arenaHtml = `
        <div class="eo-dilemma-head">
          <span class="dp-badge">${d.code} · ${isReveal ? (lang === 'zh' ? '投票揭晓' : 'REVEAL') : (lang === 'zh' ? '秘密投票' : 'SECRET VOTE')}</span>
          <h2 class="eo-dilemma-title">${UI.escapeHtml(d.title[lang] || d.title.en)}</h2>
          <p class="eo-dilemma-sub">${UI.escapeHtml(d.subtitle[lang] || d.subtitle.en)}</p>
        </div>

        <div class="eo-pillars">
          <button type="button" class="eo-pillar eo-pillar-a ${!isReveal && mySeatId && !myVote ? 'is-clickable' : ''} ${myVote === 'A' ? 'is-chosen' : ''}" data-vote="A" ${isReveal || !mySeatId || myVote ? 'disabled' : ''}>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span class="eo-pillar-letter">A</span>
              ${myVote === 'A' ? `<span class="dp-badge">${lang === 'zh' ? '已选 A' : 'LOCKED A'}</span>` : ''}
            </div>
            <div class="eo-pillar-name">${UI.escapeHtml(d.aName[lang] || d.aName.en)}</div>
            <div class="eo-pillar-rule">${UI.escapeHtml(d.aRule[lang] || d.aRule.en)}</div>
          </button>

          <button type="button" class="eo-pillar eo-pillar-b ${!isReveal && mySeatId && !myVote ? 'is-clickable' : ''} ${myVote === 'B' ? 'is-chosen' : ''}" data-vote="B" ${isReveal || !mySeatId || myVote ? 'disabled' : ''}>
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
              <div class="eo-split-meter">
                <div style="display:flex;justify-content:space-between;font-family:var(--dp-font-mono);font-size:13px;font-weight:700;">
                  <span style="color:#f5d88e;">A: ${countA} (${pctA}%)</span>
                  <span style="color:#ff7b88;">B: ${countB} (${100 - pctA}%)</span>
                </div>
                <div class="eo-split-bar">
                  <div class="eo-split-a" style="width:${pctA}%;"></div>
                  <div class="eo-split-b" style="width:${100 - pctA}%;"></div>
                </div>
                <div style="font-size:13.5px;font-weight:700;color:var(--dp-ink);text-align:center;margin-top:4px;">
                  ${UI.escapeHtml(rev.outcome[lang] || rev.outcome.en)}
                </div>
              </div>
            `
            : `<div style="text-align:center;font-size:12.5px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                ${lang === 'zh' ? `投票进度：${votedTotal} / ${state.seats.length} 名选手已锁定终端` : `VOTES LOCKED: ${votedTotal} / ${state.seats.length}`}
               </div>`
        }

        <div class="eo-vote-grid">
          ${state.seats
            .map((s) => {
              const v = isReveal ? rev.votes[s.seatId] : state.votes[s.seatId];
              const delta = isReveal ? (rev.deltas[s.seatId] || 0) : 0;
              const isVoted = Boolean(v);
              return `
                <div class="eo-vote-slot">
                  <div class="eo-vote-card ${isReveal ? 'is-flipped' : ''}">
                    <div class="eo-vc-face eo-vc-front ${isVoted ? 'is-voted' : ''}">
                      <span style="font-size:11px;color:var(--dp-ink-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">
                        ${UI.escapeHtml(s.name)}
                      </span>
                      <span style="font-family:var(--dp-font-mono);font-size:18px;font-weight:800;color:${isVoted ? '#86efac' : 'var(--dp-ink-faint)'};">
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
                      <span style="font-family:var(--dp-font-display);font-size:24px;font-weight:800;color:${v === 'B' ? '#ff7b88' : '#f5d88e'};line-height:1;">
                        ${v || 'A'}
                      </span>
                      <span style="font-family:var(--dp-font-mono);font-size:11.5px;font-weight:700;color:${delta > 0 ? '#86efac' : delta < 0 ? '#ff9ca6' : 'var(--dp-ink-muted)'};">
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
            ? `<div style="display:flex;justify-content:center;">
                <button type="button" class="dp-btn dp-btn-primary" id="eo-next-stage" style="min-width:220px;min-height:46px;">
                  ${lang === 'zh' ? '推进至下一环节 →' : 'Proceed to Next Stage →'}
                </button>
               </div>`
            : ''
        }
      `;
    }

    // -----------------------------------------------------------------------
    // B. EMBEDDED MINI-GAME ROUNDS (1: Cubes, 2: Rectangles, 3: Poker, 4: Grass)
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
          <div class="eo-dilemma-head">
            <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '主赛嵌入小游戏' : 'EMBEDDED MINI-GAME'}</span>
            <h2 class="eo-dilemma-title">${title}</h2>
            <p class="eo-dilemma-sub">
              ${m.type === 'cubes'
                ? (lang === 'zh' ? '心算 3D 重力支撑方块总数（含底层隐藏支撑块）！答错锁定 20 秒！' : 'Count ALL 3D gravity-supported cubes (including hidden supports)! Wrong guess = 20s lock!')
                : (lang === 'zh' ? `找出网格中所有格子数字之和恰好等于 ${m.puzzle.target} 的轴对齐矩形总个数！答错锁定 20 秒！` : `Count ALL axis-aligned sub-rectangles summing to ${m.puzzle.target}! Wrong guess = 20s lock!`)}
            </p>
          </div>

          <div class="eo-mini-stage">
            ${
              m.type === 'cubes'
                ? `<canvas class="eo-mini-cubes-canvas" id="eo-mini-cubes-canvas"></canvas>`
                : `
                  <div style="text-align:center;">
                    <span class="dp-badge" style="font-size:13px;padding:5px 14px;">TARGET SUM = ${m.puzzle.target}</span>
                  </div>
                  <div class="eo-mini-rect-grid">
                    ${m.puzzle.grid.flat().map((v) => `<div class="eo-mini-rect-cell">${v}</div>`).join('')}
                  </div>
                `
            }

            ${
              isDone
                ? `
                  <div style="text-align:center;padding:10px;border-radius:12px;border:1px solid var(--dp-border-strong);background:rgba(212,175,106,0.1);">
                    <div style="font-size:12px;color:var(--dp-brass);font-weight:700;">${lang === 'zh' ? '标准精确答案' : 'EXACT ANSWER'}</div>
                    <div style="font-family:var(--dp-font-mono);font-size:38px;font-weight:800;color:var(--dp-brass-bright);">${m.puzzle.total}</div>
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
                ? `<div style="text-align:center;color:#86efac;font-weight:700;padding:10px;">✓ ${lang === 'zh' ? '已精确命中！等待其他选手...' : 'EXACT MATCH! Waiting for others...'}</div>`
                : mySeatId
                ? `
                  <div style="display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;">
                    <input class="dp-input dp-input-mono" id="eo-mini-input" type="number" min="0" max="500" style="width:150px;text-align:center;font-size:20px;" value="${UI.escapeHtml(ui.miniInput)}" placeholder="${lang === 'zh' ? '输入总数' : 'TOTAL'}" ${lockRem > 0 ? 'disabled' : ''} />
                    <button type="button" class="dp-btn dp-btn-primary" id="eo-mini-submit" ${lockRem > 0 ? 'disabled' : ''}>
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
          <div class="eo-dilemma-head">
            <span class="dp-badge dp-badge-cyan">${lang === 'zh' ? '嵌入小游戏 3 · 记忆扑克' : 'Mini-Game 3 · Memory Poker'}</span>
            <h2 class="eo-dilemma-title">
              ${isMem ? (lang === 'zh' ? '记住 16 张牌面！' : 'Memorize All 16 Cards!') : isSel ? (lang === 'zh' ? '结合 3 张公共牌盲选 2 张！' : 'Pick 2 Hidden Cards!') : (lang === 'zh' ? '记忆扑克亮牌结算！' : 'Memory Poker Showdown!')}
            </h2>
          </div>

          <div class="eo-mini-stage">
            <div style="display:flex;justify-content:center;gap:10px;align-items:center;">
              <span style="font-size:11px;color:var(--dp-brass);letter-spacing:0.1em;font-weight:700;">COMMUNITY:</span>
              ${m.community
                .map((r) => `<span style="width:46px;height:60px;border-radius:8px;border:1.5px solid #f2d591;background:#1b2032;display:inline-flex;align-items:center;justify-content:center;font-family:var(--dp-font-display);font-size:22px;font-weight:800;color:#f5d88e;">${r ? RANK_LABELS[r] : '?'}</span>`)
                .join('')}
            </div>

            <div class="eo-mini-poker-grid">
              ${m.grid
                .map((r, idx) => {
                  const sel = activePick.includes(idx);
                  return `<button type="button" class="eo-mini-pcard ${isSel ? 'is-hidden' : ''} ${sel ? 'is-sel' : ''}" data-pcard="${idx}" ${isSel && mySeatId && !myPick ? '' : 'disabled'}>
                    ${isSel ? `#${idx + 1}` : (RANK_LABELS[r] || '?')}
                  </button>`;
                })
                .join('')}
            </div>

            ${
              isMem && mySeatId
                ? `<div style="text-align:center;"><button type="button" class="dp-btn dp-btn-primary" id="eo-poker-ready">${lang === 'zh' ? '我已记牢 · 立刻翻面 →' : 'Memorized · Flip Now →'}</button></div>`
                : isSel && mySeatId && !myPick
                ? `<div style="text-align:center;"><button type="button" class="dp-btn dp-btn-primary" id="eo-poker-lock" ${ui.pokerPick.length !== 2 ? 'disabled' : ''}>${lang === 'zh' ? `锁定 2 张牌 (${ui.pokerPick.length}/2)` : `Lock 2 Cards (${ui.pokerPick.length}/2)`}</button></div>`
                : isDone
                ? `
                  <div style="display:flex;flex-direction:column;gap:6px;">
                    ${(m.results || []).slice(0, 6).map((e) => `
                      <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.03);">
                        <span><strong>#${e.rank}</strong> ${UI.escapeHtml(nameOf(e.seatId))} · ${UI.escapeHtml(e.eval.name[lang] || e.eval.name.en)}</span>
                        <strong style="color:#86efac;font-family:var(--dp-font-mono);">+${e.pts}pt</strong>
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
          <div class="eo-dilemma-head">
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

          <div class="eo-mini-stage">
            <div class="eo-mini-grass-board" id="eo-grass-board">
              ${Array.from({ length: GRASS_ROWS }, (_, r) =>
                Array.from({ length: GRASS_COLS }, (_, c) => {
                  const v = m.board[r][c];
                  if (v === 'OBSTACLE') return `<div class="eo-mg-cell is-obs" data-r="${r}" data-c="${c}">❖</div>`;
                  if (v) return `<div class="eo-mg-cell" data-r="${r}" data-c="${c}" style="background:${state.colorMap[v]};">${initials[v]}</div>`;
                  return `<div class="eo-mg-cell" data-r="${r}" data-c="${c}"></div>`;
                }).join('')
              ).join('')}
            </div>

            ${
              m.subPhase === 'draft' && isMyTurn
                ? `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    ${GRASS_TILE_IDS.map((tid) => `<button type="button" class="dp-btn dp-btn-sm" data-gdraft="${tid}">#${tid} (+${tid}pt)</button>`).join('')}
                   </div>`
                : m.subPhase === 'place' && isMyTurn && activeTid
                ? `<div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:13px;color:#6ee7b7;font-weight:700;">${lang === 'zh' ? `当前铺设 #${activeTid} 号砖` : `Placing Tile #${activeTid}`}</span>
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
        <div class="eo-dilemma-head">
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
                    <button type="button" class="eo-rescue-card" data-rescue="${UI.escapeHtml(sid)}">
                      <strong style="color:var(--dp-brass-bright);font-size:15px;">${UI.escapeHtml(nameOf(sid))}</strong>
                      <span style="font-size:12px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">${state.scores[sid] || 0} pts · PRISON</span>
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

    container.innerHTML = `
      <div class="eo-shell">
        <div class="eo-top-strip">
          <div class="eo-timeline">
            ${state.schedule
              .map((it, idx) => {
                const cls = idx < state.stageIndex ? 'is-done' : idx === state.stageIndex ? 'is-current' : '';
                return `<span class="eo-pip ${it.kind === 'mini' ? 'is-mini' : ''} ${cls}">${it.pip}</span>`;
              })
              .join('')}
            <span class="eo-pip ${state.phase === 'alliance_rescue' ? 'is-current' : state.phase === 'finished' ? 'is-done' : ''}">★</span>
          </div>

          <div class="eo-prize-vault">
            <span style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${lang === 'zh' ? '奖金徽章' : 'PRIZE TOKENS'}
            </span>
            <div style="display:flex;gap:5px;">
              ${[1, 2, 3]
                .map((n) => `<span class="eo-token-socket ${state.prizeTokens >= n ? 'is-lit' : ''}">₩</span>`)
                .join('')}
            </div>
            <strong style="font-family:var(--dp-font-mono);font-size:12.5px;color:var(--dp-brass-bright);">
              ${state.prizeTokens}${lang === 'zh' ? '亿' : '00M'}
            </strong>
          </div>
        </div>

        <div class="eo-main-grid">
          <section class="eo-arena">${arenaHtml}</section>

          <aside class="eo-standings">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                ${lang === 'zh' ? '主赛总胜点与去向线' : 'MAIN MATCH STANDINGS'}
              </span>
              <span style="font-size:11px;color:var(--dp-ink-muted);">
                ${lang === 'zh' ? `生活${state.livingCount} · 淘汰${state.elimCount}` : `Liv ${state.livingCount} · Elim ${state.elimCount}`}
              </span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
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
                    <div class="eo-zone-row ${zCls} ${sid === mySeatId ? 'is-me' : ''}">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <strong style="color:var(--dp-brass);margin-right:5px;">#${idx + 1}</strong>
                        ${UI.escapeHtml(s?.name || sid)}
                      </span>
                      <span style="display:flex;align-items:center;gap:7px;">
                        <span class="eo-zone-tag ${zCls}">${zLabel}</span>
                        <strong style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);min-width:40px;text-align:right;">
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

    // Wire Choice Voting
    container.querySelectorAll('[data-vote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('bid');
        dispatch({ type: 'CAST_VOTE', payload: { choice: btn.dataset.vote } });
      });
    });

    container.querySelector('#eo-next-stage')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_STAGE' });
    });

    // Wire Alliance Rescue
    container.querySelectorAll('[data-rescue]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('victory');
        dispatch({ type: 'RESCUE_PRISONER', payload: { targetSeatId: btn.dataset.rescue } });
      });
    });

    // Wire Mini-Game 1 (Cubes) Canvas & Speed Inputs
    if (state.phase === 'mini' && state.mini) {
      const m = state.mini;
      if (m.type === 'cubes') {
        const cvs = container.querySelector('#eo-mini-cubes-canvas');
        drawMiniCubesCanvas(cvs, m.puzzle);
      }
      if (m.type === 'cubes' || m.type === 'rectangles') {
        const inp = container.querySelector('#eo-mini-input');
        inp?.addEventListener('input', () => {
          ui.miniInput = inp.value;
        });
        const sendMini = async () => {
          const val = Number(inp?.value);
          if (Number.isNaN(val) || inp?.value === '') return;
          ui.miniInput = '';
          sfx.play('bid');
          const res = await dispatch({ type: 'MINI_GUESS', payload: { guess: val } });
          if (!res.ok && res.reason) UI.toast(res.reason, 'error');
        };
        inp?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') sendMini();
        });
        container.querySelector('#eo-mini-submit')?.addEventListener('click', sendMini);
        container.querySelector('#eo-mini-giveup')?.addEventListener('click', () => dispatch({ type: 'MINI_GIVEUP' }));
      }

      if (m.type === 'poker') {
        container.querySelector('#eo-poker-ready')?.addEventListener('click', () => {
          sfx.play('click');
          dispatch({ type: 'MINI_POKER_READY' });
        });
        container.querySelectorAll('[data-pcard]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.pcard);
            const pos = ui.pokerPick.indexOf(idx);
            if (pos >= 0) ui.pokerPick.splice(pos, 1);
            else if (ui.pokerPick.length < 2) ui.pokerPick.push(idx);
            else {
              ui.pokerPick.shift();
              ui.pokerPick.push(idx);
            }
            sfx.play('click');
            container.querySelectorAll('[data-pcard]').forEach((b) => {
              b.classList.toggle('is-sel', ui.pokerPick.includes(Number(b.dataset.pcard)));
            });
            const lk = container.querySelector('#eo-poker-lock');
            if (lk) {
              lk.disabled = ui.pokerPick.length !== 2;
              lk.textContent = lang === 'zh' ? `锁定 2 张牌 (${ui.pokerPick.length}/2)` : `Lock 2 Cards (${ui.pokerPick.length}/2)`;
            }
          });
        });
        container.querySelector('#eo-poker-lock')?.addEventListener('click', () => {
          if (ui.pokerPick.length !== 2) return;
          sfx.play('bid');
          dispatch({ type: 'MINI_POKER_PICK', payload: { pair: [...ui.pokerPick] } });
        });
      }

      if (m.type === 'grass') {
        container.querySelectorAll('[data-gdraft]').forEach((btn) => {
          btn.addEventListener('click', () => {
            sfx.play('bid');
            dispatch({ type: 'MINI_GRASS_DRAFT', payload: { tileId: Number(btn.dataset.gdraft) } });
          });
        });
        container.querySelector('#eo-gforfeit')?.addEventListener('click', () => {
          sfx.play('eliminate');
          dispatch({ type: 'MINI_GRASS_FORFEIT' });
        });

        const gBoard = container.querySelector('#eo-grass-board');
        const isMyTurn = Boolean(mySeatId && state.currentTurnSeatId === mySeatId);
        const activeTid = m.subPhase === 'place' && isMyTurn ? m.chosenTiles[mySeatId] : null;

        const paintGhost = () => {
          if (!gBoard) return;
          gBoard.querySelectorAll('.is-ok, .is-bad').forEach((el) => el.classList.remove('is-ok', 'is-bad'));
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

        const doRot = () => {
          ui.grassRot = (ui.grassRot + 1) % 4;
          sfx.play('click');
          paintGhost();
        };
        container.querySelector('#eo-grot')?.addEventListener('click', doRot);

        if (gBoard && activeTid && m.currentCanPlace) {
          gBoard.addEventListener('pointermove', (e) => {
            const c = e.target.closest?.('.eo-mg-cell');
            if (!c) return;
            ui.grassHoverR = Number(c.dataset.r);
            ui.grassHoverC = Number(c.dataset.c);
            paintGhost();
          });
          gBoard.addEventListener('click', async (e) => {
            const c = e.target.closest?.('.eo-mg-cell');
            if (!c) return;
            const r = Number(c.dataset.r);
            const col = Number(c.dataset.c);
            if (!canPlaceGrass(m.board, activeTid, r, col, ui.grassRot)) {
              sfx.play('error');
              return;
            }
            await dispatch({ type: 'MINI_GRASS_PLACE', payload: { r, c: col, rot: ui.grassRot } });
          });
          gBoard.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            doRot();
          });
        }
        if (window._eoKey) window.removeEventListener('keydown', window._eoKey);
        window._eoKey = (e) => {
          if ((e.key === 'r' || e.key === 'R') && activeTid) doRot();
        };
        window.addEventListener('keydown', window._eoKey);
      }
    }

    // Host speed-mini-game bot scheduler & lockout unlock
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
