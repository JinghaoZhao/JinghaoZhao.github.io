import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

const uiState = {
  inputVal: '',
  lastRound: 0,
  lastPhase: '',
  lastEvSig: '',
  // Personal drag scratchpad (during playing)
  dragStart: null,
  dragEnd: null,
  markedBoxes: [], // array of "r1,c1,r2,c2"
  // Animated verification playback (during reveal)
  solIndex: 0,
  autoPlay: true,
  playTimer: null,
  tickTimer: null,
  lastCtx: null,
};

function policyBadge(policy, size, lang) {
  if (policy === 'solo' || size <= 1) return lang === 'zh' ? '单人独享 (7)' : 'SOLO (7)';
  if (policy === 'devotion') {
    const split = size === 2 ? '2/5' : '1/3/3';
    return lang === 'zh' ? `奉献方案 (${split})` : `DEVOTION (${split})`;
  }
  const split = size === 2 ? '5/2' : '5/1/1';
  return lang === 'zh' ? `独食方案 (${split})` : `MONOPOLY (${split})`;
}

function positionLaserOverlay(gridEl, laserEl, box) {
  if (!gridEl || !laserEl || !box) {
    if (laserEl) laserEl.hidden = true;
    return;
  }
  const a = gridEl.querySelector(`[data-rc="${box.r1}-${box.c1}"]`);
  const b = gridEl.querySelector(`[data-rc="${box.r2}-${box.c2}"]`);
  if (!a || !b) {
    laserEl.hidden = true;
    return;
  }
  const gr = gridEl.getBoundingClientRect();
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  const pad = 4;
  laserEl.hidden = false;
  laserEl.style.left = `${ar.left - gr.left - pad}px`;
  laserEl.style.top = `${ar.top - gr.top - pad}px`;
  laserEl.style.width = `${br.right - ar.left + pad * 2}px`;
  laserEl.style.height = `${br.bottom - ar.top + pad * 2}px`;
}

mountGame({
  config: {
    id: 'count-the-rectangles',
    title: { zh: '数矩形', en: 'Count the Rectangles', ko: '사각형 세기' },
    category: 'MAIN MATCH · MINI-GAME',
    episode: 'EP 1',
    minPlayers: 1,
    maxPlayers: 16,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'rounds',
        label: { zh: '轮数', en: 'Rounds' },
        type: 'select',
        default: '3',
        choices: [
          { value: '1', label: { zh: '1 轮速决', en: '1 Round' } },
          { value: '3', label: { zh: '3 轮标准', en: '3 Rounds' } },
        ],
      },
      {
        key: 'gridSize',
        label: { zh: '数字矩阵规模', en: 'Matrix Size' },
        type: 'select',
        default: '5x5',
        choices: [
          { value: '5x5', label: { zh: '5 × 5 标准盘', en: '5 × 5 Standard' } },
          { value: '6x6', label: { zh: '6 × 6 进阶盘', en: '6 × 6 Expert' } },
        ],
      },
      {
        key: 'teamMode',
        label: { zh: '启用 7 分组队机制 (独食/奉献)', en: 'Enable 7pt Squad Mode (Monopoly / Devotion)' },
        type: 'boolean',
        default: true,
      },
    ],
    rulesSummary: {
      zh: `### 游戏目标
在数字矩阵中，找出**所有格内数字之和恰好等于目标数字的轴对齐矩形**（包含正方形、长方形及 1×1 单格），并提交准确总个数！

### 剧集核心组队与分赃规则（总分池 7 分）
- **单人参赛 (Solo)**：独自解出独享 **7 分**。
- **独食方案 (Monopoly)**：最多 3 人组队，队长拿 **5 分**，两名队员各拿 **1 分**（2人队为 5/2）。
- **奉献方案 (Devotion)**：最多 3 人组队，队长拿 **1 分**，两名队员各拿 **3 分**（2人队为 2/5；还原吴贤旻经典打法！）。
- **20 秒答错锁定**：提交错误数量将锁定终端 **20 秒**！
- **绝对权威验算**：每轮结束后自动通过金色激光框逐一高亮回放全部合法矩形，100% 杜绝争议！`,
      en: `### Objective
Find the **exact total number of axis-aligned sub-rectangles** (squares, rectangles, or 1×1 cells) in the luminous matrix whose numbers sum to the **Target Number**.

### Show-Accurate 7-Point Squad Contracts
- **Solo**: Win alone for **7 pts**.
- **Monopoly (5 / 1 / 1)**: Up to 3 players — Captain claims **5 pts**, teammates **1 pt** each (2p: 5/2).
- **Devotion (1 / 3 / 3)**: Up to 3 players — Captain takes **1 pt**, teammates **3 pts** each (2p: 2/5; Oh Hyun-min's iconic play!).
- **20s Lockout**: Wrong submissions lock your team terminal for **20.0 seconds**.
- **Animated Solution Proof**: Every round concludes with a glowing laser sweep verifying every single valid rectangle!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, lastEvent } = ctx;
    uiState.lastCtx = ctx;

    if (state.round !== uiState.lastRound || state.phase !== uiState.lastPhase) {
      if (state.phase === 'playing') {
        uiState.inputVal = '';
        uiState.markedBoxes = [];
        uiState.dragStart = null;
        uiState.dragEnd = null;
      }
      if (state.phase === 'reveal') {
        uiState.solIndex = 0;
        uiState.autoPlay = true;
        sfx.play('reveal');
      }
      uiState.lastRound = state.round;
      uiState.lastPhase = state.phase;
    }

    const evSig = lastEvent ? JSON.stringify(lastEvent) : '';
    if (evSig && evSig !== uiState.lastEvSig) {
      uiState.lastEvSig = evSig;
      if (lastEvent.type === 'SOLVED' && lastEvent.seatId === mySeatId) sfx.play('pieceGain');
      if (lastEvent.type === 'LOCKOUT' && lastEvent.seatId === mySeatId) sfx.play('eliminate');
    }

    clearInterval(uiState.playTimer);
    clearInterval(uiState.tickTimer);

    const nameOf = (sid) => state.seats.find((s) => s.seatId === sid)?.name || sid;

    // -----------------------------------------------------------------------
    // PHASE 1: ALLIANCE & 7-POINT SPLIT SETUP
    // -----------------------------------------------------------------------
    if (state.phase === 'setup') {
      const myTeam = mySeatId ? state.teams.find((t) => t.members.includes(mySeatId)) : null;
      const myReady = mySeatId ? Boolean(state.setupReady[mySeatId]) : false;
      const assignedIds = new Set(state.teams.flatMap((t) => t.members));
      const freeBots = state.seats.filter((s) => s.isBot && !assignedIds.has(s.seatId));

      container.innerHTML = `
        <div class="ctr-alliance-wrap">
          <div class="ctr-alliance-hero">
            <div>
              <span class="dp-badge">${lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 轮 · 赛前组队` : `ROUND ${state.round}/${state.totalRounds} · ALLIANCE SETUP`}</span>
              <h2 style="font-family:var(--dp-font-display);margin:8px 0 4px;font-size:24px;color:var(--dp-brass-bright);">
                ${lang === 'zh' ? '选择 7 分胜利契约：单打独斗，还是结盟分赃？' : 'Choose Your 7-Point Contract: Solo, Monopoly, or Devotion'}
              </h2>
              <p style="margin:0;color:var(--dp-ink-muted);font-size:13.5px;">
                ${lang === 'zh' ? '队伍上限 3 人，多人合力分工找矩形更快，但必须提前锁定 7 分分配方式！' : 'Squads of up to 3 hunt rectangles faster, but must lock their 7-point split upfront!'}
              </p>
            </div>
            ${
              mySeatId
                ? `<button type="button" class="dp-btn dp-btn-primary" id="ctr-lock-setup" style="min-height:46px;min-width:170px;" ${myReady ? 'disabled' : ''}>
                    ${myReady ? (lang === 'zh' ? '已锁定 · 等待他人' : 'LOCKED IN') : (lang === 'zh' ? '锁定契约并开题 →' : 'Lock Contract & Start →')}
                  </button>`
                : ''
            }
          </div>

          ${
            mySeatId
              ? `
                <div class="ctr-contract-grid">
                  <button type="button" class="ctr-contract-card ${myTeam?.policy === 'solo' ? 'is-selected' : ''}" data-policy="solo" style="text-align:left;">
                    <strong style="color:var(--dp-brass-bright);font-size:16px;">${lang === 'zh' ? '单人独享 · SOLO' : 'SOLO CONTRACT'}</strong>
                    <div class="ctr-split-visual"><span class="ctr-split-chip">+7 PTS</span></div>
                    <span style="font-size:12.5px;color:var(--dp-ink-muted);">
                      ${lang === 'zh' ? '独自迎战矩阵，率先答对独吞全部 7 分！' : 'Go alone and claim the entire 7-point prize pool!'}
                    </span>
                  </button>

                  <button type="button" class="ctr-contract-card ${myTeam?.policy === 'monopoly' ? 'is-selected' : ''}" data-policy="monopoly" style="text-align:left;">
                    <strong style="color:#ff8e99;font-size:16px;">${lang === 'zh' ? '独食方案 · MONOPOLY' : 'MONOPOLY SQUAD'}</strong>
                    <div class="ctr-split-visual">
                      <span class="ctr-split-chip" style="border-color:rgba(220,53,69,0.5);color:#ffb3bc;">★ 5</span>
                      <span class="ctr-split-chip">1</span>
                      <span class="ctr-split-chip">1</span>
                    </div>
                    <span style="font-size:12.5px;color:var(--dp-ink-muted);">
                      ${lang === 'zh' ? '队长独取 5 分，其余队员各 1 分（2人队 5/2）。' : 'Captain claims 5 pts; teammates earn 1 pt each (2p: 5/2).'}
                    </span>
                  </button>

                  <button type="button" class="ctr-contract-card ${myTeam?.policy === 'devotion' ? 'is-selected' : ''}" data-policy="devotion" style="text-align:left;">
                    <strong style="color:#86efac;font-size:16px;">${lang === 'zh' ? '奉献方案 · DEVOTION' : 'DEVOTION SQUAD'}</strong>
                    <div class="ctr-split-visual">
                      <span class="ctr-split-chip">★ 1</span>
                      <span class="ctr-split-chip" style="border-color:rgba(34,197,94,0.5);color:#86efac;">3</span>
                      <span class="ctr-split-chip" style="border-color:rgba(34,197,94,0.5);color:#86efac;">3</span>
                    </div>
                    <span style="font-size:12.5px;color:var(--dp-ink-muted);">
                      ${lang === 'zh' ? '队长仅拿 1 分，将 3/3 高分让给盟友（吴贤旻名场面！）。' : 'Captain takes 1 pt, gifting 3 pts each to allies!'}
                    </span>
                  </button>
                </div>
              `
              : ''
          }

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <span style="font-size:12px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${lang === 'zh' ? '当前已登记阵营' : 'REGISTERED SQUADS'}
            </span>
            ${
              myTeam && myTeam.policy !== 'solo' && myTeam.members.length < 3 && freeBots.length > 0
                ? `<button type="button" class="dp-btn dp-btn-sm" id="ctr-recruit-bot">
                    + ${lang === 'zh' ? `招募 1 位 AI 队友 (${myTeam.members.length}/3)` : `Recruit AI Partner (${myTeam.members.length}/3)`}
                   </button>`
                : ''
            }
          </div>

          <div class="ctr-squad-list">
            ${state.teams
              .map((t) => {
                const isMine = myTeam?.teamId === t.teamId;
                const canJoin = mySeatId && !isMine && t.policy !== 'solo' && t.members.length < 3;
                return `
                  <div class="ctr-squad-card ${isMine ? 'is-mine' : ''}">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <strong style="font-size:13px;color:var(--dp-brass-bright);">${UI.escapeHtml(policyBadge(t.policy, Math.max(t.members.length, t.policy === 'solo' ? 1 : 3), lang))}</strong>
                      <span style="font-family:var(--dp-font-mono);font-size:11px;color:var(--dp-ink-muted);">${t.members.length}/3</span>
                    </div>
                    <div style="font-size:13px;color:var(--dp-ink);">
                      ${t.members.map((id, i) => `${i === 0 ? '★ ' : ''}${UI.escapeHtml(nameOf(id))}`).join(' · ')}
                    </div>
                    ${
                      canJoin
                        ? `<button type="button" class="dp-btn dp-btn-sm" data-join-team="${UI.escapeHtml(t.teamId)}">${lang === 'zh' ? '加入此队' : 'Join Squad'}</button>`
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-policy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('click');
          dispatch({ type: 'SET_CONTRACT', payload: { policy: btn.dataset.policy } });
        });
      });
      container.querySelectorAll('[data-join-team]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('click');
          dispatch({ type: 'JOIN_TEAM', payload: { teamId: btn.dataset.joinTeam } });
        });
      });
      container.querySelector('#ctr-recruit-bot')?.addEventListener('click', () => {
        sfx.play('bid');
        dispatch({ type: 'RECRUIT_BOT' });
      });
      container.querySelector('#ctr-lock-setup')?.addEventListener('click', () => {
        sfx.play('reveal');
        dispatch({ type: 'LOCK_SETUP' });
      });
      return;
    }

    // -----------------------------------------------------------------------
    // PHASE 2 & 3: MATRIX HUNTING & VISUAL SOLUTION VERIFICATION
    // -----------------------------------------------------------------------
    const puzzle = state.puzzle;
    const isReveal = state.phase === 'reveal' || state.phase === 'finished';
    const myTeam = mySeatId ? state.teams.find((t) => t.members.includes(mySeatId)) : null;
    const myTs = myTeam ? state.teamStates[myTeam.teamId] : null;
    const now = Date.now();
    const lockRem = myTs && myTs.lockedUntil > now ? myTs.lockedUntil - now : 0;

    const sols = isReveal && Array.isArray(puzzle.solutions) ? puzzle.solutions : [];
    const activeSol = sols.length > 0 ? sols[uiState.solIndex % sols.length] : null;

    container.innerHTML = `
      <div class="ctr-layout">
        <section class="ctr-matrix-panel">
          <div class="ctr-matrix-header">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="dp-badge">${lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 轮` : `ROUND ${state.round}/${state.totalRounds}`}</span>
              <span style="font-size:12.5px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                ${puzzle.size}×${puzzle.size} MATRIX
              </span>
            </div>
            <div class="ctr-target-hero">
              <span style="font-size:11px;letter-spacing:0.12em;color:#fde68a;font-weight:700;">
                ${lang === 'zh' ? '目标和 TARGET' : 'TARGET SUM'}
              </span>
              <span class="ctr-target-num">${puzzle.target}</span>
            </div>
          </div>

          <div class="ctr-grid-stage">
            <div class="ctr-grid-frame" id="ctr-grid-frame">
              <div class="ctr-grid" id="ctr-grid" style="grid-template-columns:repeat(${puzzle.size},1fr);grid-template-rows:repeat(${puzzle.size},1fr);">
                ${puzzle.grid
                  .map((row, r) =>
                    row
                      .map((val, c) => {
                        const inSol = activeSol && r >= activeSol.r1 && r <= activeSol.r2 && c >= activeSol.c1 && c <= activeSol.c2;
                        return `<div class="ctr-cell ${inSol ? 'is-sol' : ''}" data-rc="${r}-${c}" data-r="${r}" data-c="${c}">${val}</div>`;
                      })
                      .join('')
                  )
                  .join('')}
                <div class="ctr-rect-laser ${isReveal ? '' : 'is-drag-box'}" id="ctr-rect-laser" hidden></div>
              </div>
            </div>

            ${
              !isReveal
                ? `
                  <div class="ctr-scratch-bar">
                    <span>
                      ${lang === 'zh'
                        ? `拖拽框选可记录草稿矩形（不验算答案）· 已标记：<strong>${uiState.markedBoxes.length}</strong> 个`
                        : `Drag across cells to pin scratchpad rectangles · Marked: <strong>${uiState.markedBoxes.length}</strong>`}
                    </span>
                    <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ctr-clear-marks">
                      ${lang === 'zh' ? '清空标记' : 'Clear'}
                    </button>
                  </div>
                `
                : `
                  <div class="ctr-verify-box">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                      <strong style="color:var(--dp-brass-bright);font-size:13.5px;">
                        ${lang === 'zh'
                          ? `权威验算：共找到 ${puzzle.totalRects} 个和为 ${puzzle.target} 的矩形`
                          : `VERIFIED PROOF: ${puzzle.totalRects} Rectangles Summing to ${puzzle.target}`}
                      </strong>
                      <div style="display:flex;gap:6px;">
                        <button type="button" class="dp-btn dp-btn-sm" id="ctr-sol-prev">◀</button>
                        <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="ctr-sol-play">${uiState.autoPlay ? '❚❚' : '▶'}</button>
                        <button type="button" class="dp-btn dp-btn-sm" id="ctr-sol-next">▶</button>
                      </div>
                    </div>
                    ${
                      activeSol
                        ? `<div class="ctr-eq-line" id="ctr-eq-line">
                            #${activeSol.id}/${sols.length} · (${activeSol.r1 + 1},${activeSol.c1 + 1})→(${activeSol.r2 + 1},${activeSol.c2 + 1}) :
                            ${activeSol.values.join(' + ')} = ${activeSol.sum} ✓
                           </div>`
                        : ''
                    }
                    <div class="ctr-sol-pills">
                      ${sols
                        .map(
                          (s, i) =>
                            `<button type="button" class="ctr-sol-pill ${i === uiState.solIndex % sols.length ? 'is-active' : ''}" data-sol-idx="${i}">#${s.id}</button>`
                        )
                        .join('')}
                    </div>
                  </div>
                `
            }
          </div>
        </section>

        <aside class="ctr-side-stack">
          <div class="ctr-terminal">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                ${myTeam ? UI.escapeHtml(policyBadge(myTeam.policy, myTeam.members.length, lang)) : (lang === 'zh' ? '观战终端' : 'SPECTATOR')}
              </span>
              <span style="font-size:11.5px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                ${myTs ? (lang === 'zh' ? `错 ${myTs.wrongAttempts}` : `Miss: ${myTs.wrongAttempts}`) : ''}
              </span>
            </div>

            ${
              isReveal
                ? `
                  <div style="text-align:center;padding:12px 4px;">
                    <div style="font-size:11.5px;letter-spacing:0.12em;color:var(--dp-brass);font-weight:700;">
                      ${lang === 'zh' ? '精确矩形总数' : 'EXACT RECTANGLE COUNT'}
                    </div>
                    <div style="font-family:var(--dp-font-mono);font-size:48px;font-weight:800;color:#fde68a;line-height:1.1;margin:4px 0 12px;">
                      ${puzzle.totalRects}
                    </div>
                    ${
                      state.phase === 'reveal'
                        ? `<button type="button" class="dp-btn dp-btn-primary" id="ctr-next-round" style="width:100%;min-height:46px;">
                            ${state.round >= state.totalRounds
                              ? (lang === 'zh' ? '查看最终排名 →' : 'Final Verdict →')
                              : (lang === 'zh' ? `进入第 ${state.round + 1} 轮 →` : `Next Round (${state.round + 1}/${state.totalRounds}) →`)}
                           </button>`
                        : ''
                    }
                  </div>
                `
                : !myTs
                ? `<p style="color:var(--dp-ink-muted);text-align:center;font-size:13px;">${lang === 'zh' ? '观战进行中...' : 'Spectating live hunt...'}</p>`
                : myTs.solvedAt
                ? `
                  <div style="text-align:center;padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,0.5);background:rgba(34,197,94,0.12);">
                    <div style="color:#86efac;font-weight:700;font-size:12px;letter-spacing:0.1em;">✓ ${lang === 'zh' ? '命中精确数量！' : 'EXACT COUNT LOCKED!'}</div>
                    <div style="font-family:var(--dp-font-mono);font-size:30px;font-weight:800;color:#fff;margin:6px 0;">
                      #${state.teamSolvedOrder.indexOf(myTeam.teamId) + 1} · ${(myTs.solveTimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                `
                : `
                  <div class="ctr-display">
                    <span style="font-size:11px;color:var(--dp-ink-faint);letter-spacing:0.08em;">RECTS</span>
                    <span class="ctr-display-num" id="ctr-display-num">${uiState.inputVal || '—'}</span>
                  </div>
                  <div class="ctr-keypad">
                    ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫']
                      .map((k) => `<button type="button" class="ctr-key" data-key="${k}" ${lockRem > 0 ? 'disabled' : ''}>${k}</button>`)
                      .join('')}
                  </div>
                  <button type="button" class="dp-btn dp-btn-primary" id="ctr-submit" style="width:100%;margin-top:10px;min-height:46px;" ${lockRem > 0 || !uiState.inputVal ? 'disabled' : ''}>
                    ${lang === 'zh' ? '提交矩形总数' : 'SUBMIT COUNT'}
                  </button>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <span style="font-size:11.5px;color:var(--dp-ink-faint);">${lang === 'zh' ? '答错将锁定 20 秒' : '20s lockout on error'}</span>
                    <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="ctr-giveup">${lang === 'zh' ? '直接揭晓' : 'Reveal'}</button>
                  </div>
                `
            }

            ${
              lockRem > 0 && !isReveal && myTs && !myTs.solvedAt
                ? `
                  <div class="ctr-lockout" id="ctr-lockout">
                    <div style="font-size:11px;letter-spacing:0.15em;color:#ff9ca6;font-weight:800;margin-bottom:8px;">⚠ ${lang === 'zh' ? '回答错误 · 20秒锁定' : 'WRONG COUNT · LOCKED'}</div>
                    <div style="font-family:var(--dp-font-mono);font-size:44px;font-weight:800;color:#fff;" id="ctr-lockout-sec">${(lockRem / 1000).toFixed(1)}s</div>
                    <div style="font-size:12px;color:#ffd0d5;margin-top:8px;">${lang === 'zh' ? `上次提交 ${myTs.lastGuess} 不正确` : `Last guess (${myTs.lastGuess}) was incorrect`}</div>
                  </div>
                `
                : ''
            }
          </div>

          <div style="border-radius:var(--dp-radius-lg);border:1px solid var(--dp-border);background:rgba(14,17,26,0.86);padding:14px 16px;">
            <div style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;margin-bottom:10px;">
              ${lang === 'zh' ? '阵营战况与总分榜' : 'SQUAD STATUS & STANDINGS'}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${state.teams
                .map((t) => {
                  const ts = state.teamStates[t.teamId];
                  const isMine = myTeam?.teamId === t.teamId;
                  const locked = ts && ts.lockedUntil > now && !ts.solvedAt;
                  const rankIdx = state.teamSolvedOrder.indexOf(t.teamId);
                  return `
                    <div style="padding:9px 11px;border-radius:10px;border:1px solid ${ts?.solvedAt ? 'rgba(34,197,94,0.48)' : isMine ? 'var(--dp-border-strong)' : 'var(--dp-border-subtle)'};background:${ts?.solvedAt ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.025)'};">
                      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
                        <strong style="color:var(--dp-brass-bright);">${UI.escapeHtml(policyBadge(t.policy, t.members.length, lang))}</strong>
                        <span style="font-family:var(--dp-font-mono);font-size:11px;color:${ts?.solvedAt ? '#86efac' : locked ? '#ff9ca6' : 'var(--dp-ink-muted)'};">
                          ${ts?.solvedAt ? `#${rankIdx + 1} · ${(ts.solveTimeMs / 1000).toFixed(1)}s` : locked ? `LOCK ${Math.ceil((ts.lockedUntil - now) / 1000)}s` : (lang === 'zh' ? '搜索中' : 'HUNTING')}
                        </span>
                      </div>
                      <div style="font-size:12.5px;color:var(--dp-ink);margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;">
                        ${t.members
                          .map((id) => {
                            const gained = ts?.payouts?.[id];
                            return `<span>${UI.escapeHtml(nameOf(id))} <strong style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${state.scores[id] || 0}pt${gained ? ` (+${gained})` : ''}</strong></span>`;
                          })
                          .join(' · ')}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    const gridEl = container.querySelector('#ctr-grid');
    const laserEl = container.querySelector('#ctr-rect-laser');

    // Reveal mode: position golden laser & bind playback
    if (isReveal && activeSol) {
      requestAnimationFrame(() => positionLaserOverlay(gridEl, laserEl, activeSol));

      const jumpTo = (idx) => {
        if (!sols.length) return;
        uiState.solIndex = ((idx % sols.length) + sols.length) % sols.length;
        const s = sols[uiState.solIndex];
        gridEl.querySelectorAll('.ctr-cell').forEach((cell) => {
          const r = Number(cell.dataset.r);
          const c = Number(cell.dataset.c);
          cell.classList.toggle('is-sol', r >= s.r1 && r <= s.r2 && c >= s.c1 && c <= s.c2);
        });
        positionLaserOverlay(gridEl, laserEl, s);
        const eq = container.querySelector('#ctr-eq-line');
        if (eq) eq.textContent = `#${s.id}/${sols.length} · (${s.r1 + 1},${s.c1 + 1})→(${s.r2 + 1},${s.c2 + 1}) : ${s.values.join(' + ')} = ${s.sum} ✓`;
        container.querySelectorAll('[data-sol-idx]').forEach((p) => {
          p.classList.toggle('is-active', Number(p.dataset.solIdx) === uiState.solIndex);
        });
      };

      container.querySelector('#ctr-sol-prev')?.addEventListener('click', () => {
        sfx.play('click');
        uiState.autoPlay = false;
        clearInterval(uiState.playTimer);
        jumpTo(uiState.solIndex - 1);
      });
      container.querySelector('#ctr-sol-next')?.addEventListener('click', () => {
        sfx.play('click');
        uiState.autoPlay = false;
        clearInterval(uiState.playTimer);
        jumpTo(uiState.solIndex + 1);
      });
      container.querySelector('#ctr-sol-play')?.addEventListener('click', (e) => {
        sfx.play('click');
        uiState.autoPlay = !uiState.autoPlay;
        e.currentTarget.textContent = uiState.autoPlay ? '❚❚' : '▶';
        clearInterval(uiState.playTimer);
        if (uiState.autoPlay) {
          uiState.playTimer = setInterval(() => jumpTo(uiState.solIndex + 1), 1350);
        }
      });
      container.querySelectorAll('[data-sol-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('click');
          uiState.autoPlay = false;
          clearInterval(uiState.playTimer);
          const pb = container.querySelector('#ctr-sol-play');
          if (pb) pb.textContent = '▶';
          jumpTo(Number(btn.dataset.solIdx));
        });
      });

      if (uiState.autoPlay && sols.length > 1) {
        uiState.playTimer = setInterval(() => jumpTo(uiState.solIndex + 1), 1350);
      }
    }

    // Playing mode: interactive drag-to-mark scratchpad
    if (!isReveal && gridEl) {
      const updateDragVisual = () => {
        if (!uiState.dragStart || !uiState.dragEnd) {
          gridEl.querySelectorAll('.ctr-cell').forEach((el) => el.classList.remove('is-drag'));
          if (laserEl) laserEl.hidden = true;
          return;
        }
        const box = {
          r1: Math.min(uiState.dragStart.r, uiState.dragEnd.r),
          c1: Math.min(uiState.dragStart.c, uiState.dragEnd.c),
          r2: Math.max(uiState.dragStart.r, uiState.dragEnd.r),
          c2: Math.max(uiState.dragStart.c, uiState.dragEnd.c),
        };
        gridEl.querySelectorAll('.ctr-cell').forEach((el) => {
          const r = Number(el.dataset.r);
          const c = Number(el.dataset.c);
          el.classList.toggle('is-drag', r >= box.r1 && r <= box.r2 && c >= box.c1 && c <= box.c2);
        });
        positionLaserOverlay(gridEl, laserEl, box);
      };

      const cellFromEvent = (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.ctr-cell');
        if (!el) return null;
        return { r: Number(el.dataset.r), c: Number(el.dataset.c) };
      };

      gridEl.addEventListener('pointerdown', (e) => {
        const cell = cellFromEvent(e);
        if (!cell) return;
        uiState.dragStart = cell;
        uiState.dragEnd = cell;
        updateDragVisual();
      });
      gridEl.addEventListener('pointermove', (e) => {
        if (!uiState.dragStart) return;
        const cell = cellFromEvent(e);
        if (cell) {
          uiState.dragEnd = cell;
          updateDragVisual();
        }
      });
      const finishDrag = () => {
        if (!uiState.dragStart || !uiState.dragEnd) return;
        const key = [
          Math.min(uiState.dragStart.r, uiState.dragEnd.r),
          Math.min(uiState.dragStart.c, uiState.dragEnd.c),
          Math.max(uiState.dragStart.r, uiState.dragEnd.r),
          Math.max(uiState.dragStart.c, uiState.dragEnd.c),
        ].join(',');
        const idx = uiState.markedBoxes.indexOf(key);
        if (idx === -1) uiState.markedBoxes.push(key);
        else uiState.markedBoxes.splice(idx, 1);
        sfx.play('click');
        uiState.dragStart = null;
        uiState.dragEnd = null;
        updateDragVisual();
        const barStrong = container.querySelector('.ctr-scratch-bar strong');
        if (barStrong) barStrong.textContent = String(uiState.markedBoxes.length);
      };
      gridEl.addEventListener('pointerup', finishDrag);
      gridEl.addEventListener('pointerleave', () => {
        if (uiState.dragStart) finishDrag();
      });

      container.querySelector('#ctr-clear-marks')?.addEventListener('click', () => {
        uiState.markedBoxes = [];
        sfx.play('click');
        const barStrong = container.querySelector('.ctr-scratch-bar strong');
        if (barStrong) barStrong.textContent = '0';
      });
    }

    // Keypad & Actions
    const syncDisplay = () => {
      const el = container.querySelector('#ctr-display-num');
      if (el) el.textContent = uiState.inputVal || '—';
      const sub = container.querySelector('#ctr-submit');
      if (sub) sub.disabled = !uiState.inputVal || (myTs && myTs.lockedUntil > Date.now());
    };

    const doSubmit = async () => {
      if (!uiState.inputVal) return;
      const g = Number(uiState.inputVal);
      uiState.inputVal = '';
      sfx.play('bid');
      const res = await dispatch({ type: 'SUBMIT_GUESS', payload: { guess: g } });
      if (!res.ok && res.reason) UI.toast(res.reason, 'error');
    };

    container.querySelectorAll('[data-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sfx.play('click');
        const k = btn.dataset.key;
        if (k === 'CLR') uiState.inputVal = '';
        else if (k === '⌫') uiState.inputVal = uiState.inputVal.slice(0, -1);
        else if (uiState.inputVal.length < 3) uiState.inputVal += k;
        syncDisplay();
      });
    });

    container.querySelector('#ctr-submit')?.addEventListener('click', doSubmit);
    container.querySelector('#ctr-giveup')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'GIVE_UP' });
    });
    container.querySelector('#ctr-next-round')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_ROUND' });
    });

    if (window._ctrKeyHandler) window.removeEventListener('keydown', window._ctrKeyHandler);
    window._ctrKeyHandler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (state.phase !== 'playing' || !myTs || myTs.solvedAt || myTs.lockedUntil > Date.now()) return;
      if (e.key >= '0' && e.key <= '9' && uiState.inputVal.length < 3) {
        uiState.inputVal += e.key;
        sfx.play('click');
        syncDisplay();
      } else if (e.key === 'Backspace') {
        uiState.inputVal = uiState.inputVal.slice(0, -1);
        syncDisplay();
      } else if (e.key === 'Enter' && uiState.inputVal) {
        doSubmit();
      }
    };
    window.addEventListener('keydown', window._ctrKeyHandler);

    let botTick = 0;
    uiState.tickTimer = setInterval(() => {
      const c = uiState.lastCtx;
      if (!c || c.state.phase !== 'playing') return;
      const nowMs = Date.now();
      const t = c.mySeatId ? c.state.teams.find((x) => x.members.includes(c.mySeatId)) : null;
      const ts = t ? c.state.teamStates[t.teamId] : null;
      const secEl = document.getElementById('ctr-lockout-sec');
      if (ts && ts.lockedUntil > 0) {
        const rem = ts.lockedUntil - nowMs;
        if (rem > 0 && secEl) secEl.textContent = (rem / 1000).toFixed(1) + 's';
        else if (rem <= 0 && document.getElementById('ctr-lockout')) {
          document.getElementById('ctr-lockout')?.remove();
          document.querySelectorAll('.ctr-key').forEach((b) => (b.disabled = false));
          const sub = document.getElementById('ctr-submit');
          if (sub) sub.disabled = !uiState.inputVal;
        }
      }
      botTick += 1;
      if (c.isHost && botTick % 4 === 0) {
        c.dispatch({ type: 'PROCESS_BOTS' });
      }
    }, 250);
  },
});
