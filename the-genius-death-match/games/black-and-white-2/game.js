/**
 * Black and White II (黑与白II · 흑과 백 II) — Interactive Reactor Bidding Stage
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, INITIAL_POINTS, getLampCount, getBidColor } from './rules.js';

let draftBid = 10;
let lastPhaseKey = null;
let lastEventTs = null;

function colorText(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑牌 (0–9)' : 'BLACK (0–9)';
  return lang === 'zh' ? '白牌 (10+)' : 'WHITE (10+)';
}

mountGame({
  config: {
    id: 'black-and-white-2',
    title: { zh: '黑与白II', en: 'Black and White II', ko: '흑과 백 II' },
    seasons: ['S3'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 35 秒倒计时', en: '35s Turn Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
双方各持 **99 点能量**，分 9 回合进行盲注拍卖！先赢得 **5 局**（或领先对手无法追平）者获胜。

### 两大核心情报线索（点数本身全程保密）
- **黑白双色牌**：投入 \`0–9\`（个位数）亮**黑牌**；投入 \`10–99\`（两位数）亮**白牌**。
- **5 格剩余能量灯（实时熄灭！）**：确认出价瞬间立即按新剩余点数更新——
  - \`80–99\` 点 = 5 盏灯
  - \`60–79\` 点 = 4 盏灯
  - \`40–59\` 点 = 3 盏灯
  - \`20–39\` 点 = 2 盏灯
  - \`1–19\` 点 = 1 盏灯
  - \`0\` 点 = 0 盏灯

### 心理与算术博弈
- 先手确认出价后，后手**立刻**能看到对手的黑白颜色与**熄灭了几盏能量灯**（例如连灭 2 盏代表至少砸了 21 点，此时可果断出 \`0\` 弃轮省点！）。
- 出价高者得 +1 分并成为下轮先手；相同点数为平局（0 分，先手不变）。已投入点数永久消耗。`,
      en: `### Objective
Budget **99 points** across 9 blind rounds! First to **5 Win Points** (or an insurmountable lead) survives.

### Two Live Public Clues (Exact Bids Stay Hidden)
- **Black / White Plaque**: \`0–9\` (single digit) flashes **BLACK**; \`10–99\` (double digit) flashes **WHITE**.
- **5-Lamp Energy Gauge (Updates Instantly!)**: The moment a player locks a bid, their lamps update to reflect remaining points:
  - \`80–99\` = 5 lamps · \`60–79\` = 4 · \`40–59\` = 3 · \`20–39\` = 2 · \`1–19\` = 1 · \`0\` = 0.

### Strategy
- When First Player locks a bid, Second Player immediately sees both the Black/White plaque AND how many lamps just went dark!
- Higher bid wins **+1 Win Point** and leads next round. Equal bids = Draw (0 pts, First Player stays). Spent points are gone forever.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, activeSeatId, isSpectator, lang, lastEvent, dispatch, sfx, log } = ctx;
    if (!state) return;

    const viewerId = isSpectator ? state.seatOrder[0] : (activeSeatId || mySeatId || state.seatOrder[0]);
    const oppId = state.seatOrder.find((id) => id !== viewerId) || state.seatOrder[1];
    const me = state.players[viewerId];
    const opp = state.players[oppId];

    const myRem = me.remaining ?? 0;
    const pKey = `${state.round}-${state.phase}-${viewerId}`;
    if (pKey !== lastPhaseKey) {
      lastPhaseKey = pKey;
      draftBid = Math.min(myRem, myRem >= 10 ? 11 : myRem);
    }
    draftBid = Math.max(0, Math.min(myRem, draftBid));

    // Events SFX & Log
    if (lastEvent && lastEvent.ts && lastEvent.ts !== lastEventTs) {
      lastEventTs = lastEvent.ts;
      if (lastEvent.type === 'FIRST_BID_LOCKED') {
        sfx.play(lastEvent.lampDrop > 0 ? 'laserZap' : 'bid');
        const actorName = state.players[lastEvent.seatId]?.name || '';
        const dropMsgZh = lastEvent.lampDrop > 0 ? `，能量灯熄灭 ${lastEvent.lampDrop} 格！` : '，能量灯未熄灭';
        const dropMsgEn = lastEvent.lampDrop > 0 ? `, −${lastEvent.lampDrop} lamp(s)!` : ', 0 lamps dropped';
        log(
          lang === 'zh'
            ? `第 ${lastEvent.round} 回合：${actorName} 锁定【${colorText(lastEvent.color, 'zh')}】${dropMsgZh}`
            : `R${lastEvent.round}: ${actorName} locked [${colorText(lastEvent.color, 'en')}]${dropMsgEn}`,
          'system'
        );
      } else if (lastEvent.type === 'ROUND_RESOLVED') {
        sfx.play('heartbeat');
        setTimeout(() => {
          if (lastEvent.isDraw) sfx.play('reveal');
          else if (lastEvent.winnerSeatId === viewerId) sfx.play('garnetClink');
          else sfx.play('clash');
        }, 250);
        const wName = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
        log(
          lastEvent.isDraw
            ? lang === 'zh'
              ? `第 ${lastEvent.round} 回合暗注裁决：点数相同 · 平局！`
              : `R${lastEvent.round}: Exact tie — Draw!`
            : lang === 'zh'
            ? `第 ${lastEvent.round} 回合暗注裁决：${wName} 胜出（+1 分）！`
            : `R${lastEvent.round}: ${wName} wins (+1 pt)!`,
          'alert'
        );
      }
    }

    const isMyTurn = !isSpectator && (state.phase === 'first_bid' || state.phase === 'second_bid') && state.currentTurnSeatId === viewerId;
    const isRoundResult = state.phase === 'round_result';
    const isFinished = state.phase === 'finished';

    const cr = state.currentRound || {};
    const myPlay = cr.firstPlay?.seatId === viewerId ? cr.firstPlay : cr.secondPlay?.seatId === viewerId ? cr.secondPlay : null;
    const oppPlay = cr.firstPlay?.seatId === oppId ? cr.firstPlay : cr.secondPlay?.seatId === oppId ? cr.secondPlay : null;

    const postRem = Math.max(0, myRem - draftBid);
    const postLamps = getLampCount(postRem);
    const previewColor = getBidColor(draftBid);
    const lampTiers = ['1+', '20+', '40+', '60+', '80+'];

    const renderLamps = (litCount, previewLitCount, justDroppedCount) =>
      lampTiers
        .map((tier, idx) => {
          const isLit = idx < litCount;
          const willDrop = previewLitCount != null && isLit && idx >= previewLitCount;
          const justDropped = !isLit && justDroppedCount > 0 && idx < litCount + justDroppedCount;
          const isDanger = litCount <= 2;
          return `<div class="bw2-lamp ${isLit ? 'is-lit' : ''} ${isDanger ? 'is-danger' : ''} ${willDrop ? 'is-preview-off' : ''} ${justDropped ? 'is-just-dropped' : ''}" data-tier="${tier}"></div>`;
        })
        .join('');

    const renderPips = (score, cls) =>
      Array.from({ length: state.winTarget }, (_, i) => `<span class="bw2-pip ${i < score ? cls : ''}"></span>`).join('');

    const renderPlaque = (play, isWin, awaiting) => {
      if (!play) {
        return `
          <div class="bw2-plaque is-empty">
            <span style="font-size:22px;opacity:0.45;">${awaiting ? '◈' : '—'}</span>
            <span class="bw2-plaque-sub">${awaiting ? (lang === 'zh' ? '等待出价' : 'BIDDING') : (lang === 'zh' ? '待出价' : 'EMPTY')}</span>
          </div>
        `;
      }
      const showVal = play.bid !== null && play.bid !== undefined;
      return `
        <div class="bw2-plaque is-${play.color} ${isWin ? 'is-winner' : ''}">
          <span class="bw2-plaque-val">${showVal ? play.bid : '?'}</span>
          <span class="bw2-plaque-sub">${colorText(play.color, lang)}</span>
          ${
            play.lampDrop > 0
              ? `<span class="bw2-drop-badge">−${play.lampDrop} ${lang === 'zh' ? '灯' : 'LAMP'}</span>`
              : `<span style="font-size:10px;opacity:0.65;font-family:var(--tg-font-mono);">${lang === 'zh' ? '灯数不变' : '0 LAMP DROP'}</span>`
          }
        </div>
      `;
    };

    const myWon = isRoundResult && cr.winnerSeatId === viewerId;
    const oppWon = isRoundResult && cr.winnerSeatId === oppId;
    const isDraw = isRoundResult && cr.isDraw;

    let statusMsg = '';
    if (isFinished) {
      statusMsg = lang === 'zh' ? '终局复盘：双方 99 点投入记录已全部解封' : 'Final Review: All 99-point bids unsealed';
    } else if (isRoundResult) {
      statusMsg = isDraw
        ? lang === 'zh' ? '平局！双方投入点数完全一致，先手权不变' : 'Exact Tie! First-bidder stays unchanged'
        : myWon
        ? lang === 'zh' ? `你赢下第 ${state.round} 回合（+1 分）！下回合由你先手` : `You won R${state.round} (+1 pt)! You bid first next`
        : lang === 'zh' ? `${opp.name} 赢下第 ${state.round} 回合（对手点数保密）` : `${opp.name} won R${state.round} (bid stays hidden)`;
    } else if (isMyTurn) {
      if (state.phase === 'first_bid') {
        statusMsg = lang === 'zh'
          ? '轮到你【先手】盲注：设定投入点数（确认瞬间对手将看到黑白牌与能量灯变化）'
          : 'Your turn [FIRST]: Lock your secret bid (Black/White & Lamp drop update live)';
      } else {
        const dropInfo = oppPlay?.lampDrop
          ? lang === 'zh' ? `且熄灭了 ${oppPlay.lampDrop} 格灯！` : `& dropped ${oppPlay.lampDrop} lamp(s)!`
          : lang === 'zh' ? '且能量灯未掉格' : '& 0 lamps dropped';
        statusMsg = lang === 'zh'
          ? `对手锁定【${colorText(oppPlay?.color, 'zh')}】${dropInfo} 轮到你后手应战`
          : `Rival locked [${colorText(oppPlay?.color, 'en')}] ${dropInfo} Your counter-bid`;
      }
    } else {
      statusMsg = lang === 'zh'
        ? `等待 ${state.players[state.currentTurnSeatId]?.name || ''} 锁定能量出价...`
        : `Waiting for ${state.players[state.currentTurnSeatId]?.name || ''} to lock bid...`;
    }

    // Smart preset buttons for the 99-point vault
    const currentFloor = (me.lamps - 1) * 20;
    const stealthMax = Math.max(0, myRem - currentFloor); // max bid without dropping a lamp!
    const presets = [
      { label: lang === 'zh' ? '0 弃轮' : '0 Dump', val: 0 },
      { label: lang === 'zh' ? '9 黑顶' : '9 Max-Blk', val: Math.min(9, myRem) },
      { label: lang === 'zh' ? '10 白底' : '10 Min-Wht', val: Math.min(10, myRem) },
      ...(stealthMax >= 11 && stealthMax < myRem
        ? [{ label: lang === 'zh' ? `${stealthMax} 控灯` : `${stealthMax} Stealth`, val: stealthMax }]
        : []),
      { label: `ALL (${myRem})`, val: myRem },
    ];

    container.innerHTML = `
      <div class="bw2-arena">
        <!-- 1. Twin 5-Lamp Reactor Gauges + Central Score -->
        <section class="bw2-top-grid">
          <div class="bw2-reactor-card ${state.currentTurnSeatId === viewerId && !isRoundResult ? 'is-active' : ''}">
            <div class="bw2-reactor-head">
              <div style="display:flex;align-items:center;gap:7px;">
                <span class="bw2-pname">${UI.escapeHtml(me.name)}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}</span>
                ${state.firstSeatId === viewerId ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : '1ST'}</span>` : ''}
              </div>
              <div class="bw2-pips">${renderPips(me.score, 'is-me')}</div>
            </div>
            <div class="bw2-lamps-wrap">
              <div class="bw2-lamps-row" id="bw2-my-lamps">
                ${renderLamps(me.lamps, isMyTurn ? postLamps : null, me.lastLampDrop)}
              </div>
              <div class="bw2-lamp-meta">
                <span>${lang === 'zh' ? `你的剩余点数` : `YOUR POOL`}: <strong style="color:var(--tg-gold-bright);">${me.remaining != null ? me.remaining : '?'} / ${INITIAL_POINTS}</strong></span>
                <span>${me.lamps} / 5 ${lang === 'zh' ? '灯' : 'LAMPS'}</span>
              </div>
            </div>
          </div>

          <div class="bw2-center-score">
            <div class="bw2-score-digits">
              <span style="color:var(--tg-gold-bright);">${me.score}</span>
              <span style="opacity:0.35;font-size:20px;">:</span>
              <span style="color:#ff6c87;">${opp.score}</span>
            </div>
            <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-muted);">
              ${lang === 'zh' ? `第 ${state.round} / ${state.totalRounds} 回合` : `ROUND ${state.round} / ${state.totalRounds}`}
            </span>
            <span class="tg-badge tg-badge-garnet">${lang === 'zh' ? '先得 5 分胜' : 'FIRST TO 5'}</span>
          </div>

          <div class="bw2-reactor-card ${state.currentTurnSeatId === oppId && !isRoundResult ? 'is-active' : ''}">
            <div class="bw2-reactor-head">
              <div style="display:flex;align-items:center;gap:7px;">
                <span class="bw2-pname">${UI.escapeHtml(opp.name)}</span>
                ${state.firstSeatId === oppId ? `<span class="tg-badge tg-badge-gold">${lang === 'zh' ? '先手' : '1ST'}</span>` : ''}
              </div>
              <div class="bw2-pips">${renderPips(opp.score, 'is-opp')}</div>
            </div>
            <div class="bw2-lamps-wrap">
              <div class="bw2-lamps-row">
                ${renderLamps(opp.lamps, null, opp.lastLampDrop)}
              </div>
              <div class="bw2-lamp-meta">
                <span>${lang === 'zh' ? '推算区间' : 'GAUGE RANGE'}: <strong style="color:#ff99ab;">${
                  opp.remaining != null
                    ? `${opp.remaining} pts`
                    : `${opp.lampBracket[0]}–${opp.lampBracket[1]} pts`
                }</strong></span>
                <span>${
                  opp.lastLampDrop > 0
                    ? `<span class="bw2-drop-badge">−${opp.lastLampDrop}</span>`
                    : `${opp.lamps} / 5 ${lang === 'zh' ? '灯' : 'LAMPS'}`
                }</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Central Blind Auction Chamber -->
        <section class="bw2-stage-chamber">
          <div class="bw2-stage-top">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px;font-weight:600;">
              <span class="tg-badge ${isMyTurn ? 'tg-badge-gold' : isRoundResult ? 'tg-badge-garnet' : 'tg-badge-cyan'}">${UI.escapeHtml(I18n.t(state.phaseLabel))}</span>
              <span>${UI.escapeHtml(statusMsg)}</span>
            </div>
            <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-faint);">
              ${lang === 'zh' ? '0–9 黑牌 · 10+ 白牌 · 每 20 点一盏灯' : '0–9 BLACK · 10+ WHITE · 20 PTS/LAMP'}
            </span>
          </div>

          <div class="bw2-clash-row">
            <div class="bw2-bid-slot">
              <span style="font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);">${UI.escapeHtml(me.name)}</span>
              ${renderPlaque(myPlay, myWon, !myPlay && state.currentTurnSeatId === viewerId)}
            </div>

            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;min-width:140px;text-align:center;">
              <div style="font-family:var(--tg-font-display);font-size:26px;font-weight:900;color:${
                isRoundResult
                  ? isDraw ? '#67e8f9' : myWon ? 'var(--tg-gold-bright)' : '#ff6c87'
                  : 'var(--tg-gold)'
              };">
                ${
                  isRoundResult
                    ? isDraw
                      ? (lang === 'zh' ? '平局' : 'DRAW')
                      : myWon
                      ? (lang === 'zh' ? '你胜 +1' : 'WIN +1')
                      : (lang === 'zh' ? '对手 +1' : 'LOSS')
                    : 'VS'
                }
              </div>
              ${
                isRoundResult && !isSpectator
                  ? `<button type="button" class="tg-btn tg-btn-gold" id="bw2-next-round" style="min-width:144px;">
                      ${lang === 'zh' ? '下一回合 →' : 'Next Round →'}
                    </button>`
                  : `<span style="font-size:11.5px;color:var(--tg-ink-muted);">${
                      state.phase === 'first_bid'
                        ? (lang === 'zh' ? '先手亮色与灯数' : 'First reveals color & lamps')
                        : state.phase === 'second_bid'
                        ? (lang === 'zh' ? '后手反制盲注' : 'Second responds blind')
                        : ''
                    }</span>`
              }
            </div>

            <div class="bw2-bid-slot">
              <span style="font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);">${UI.escapeHtml(opp.name)}</span>
              ${renderPlaque(oppPlay, oppWon, !oppPlay && state.currentTurnSeatId === oppId)}
            </div>
          </div>
        </section>

        <!-- 3. 99-Point Precision Allocation Vault -->
        ${
          !isSpectator
            ? `
              <section class="bw2-vault">
                <div class="bw2-vault-main">
                  <div class="bw2-halo-dial is-${previewColor}" id="bw2-halo">
                    <span class="bw2-halo-num" id="bw2-halo-num">${draftBid}</span>
                    <span class="bw2-halo-tier" id="bw2-halo-tier">${
                      previewColor === 'black'
                        ? (lang === 'zh' ? '黑 · 0–9' : 'BLACK')
                        : (lang === 'zh' ? '白 · 10+' : 'WHITE')
                    }</span>
                  </div>

                  <div class="bw2-controls-col">
                    <div class="bw2-slider-row">
                      <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">0</span>
                      <input type="range" class="bw2-range" id="bw2-slider" min="0" max="${myRem}" value="${draftBid}" ${!isMyTurn ? 'disabled' : ''} />
                      <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-gold-bright);">${myRem}</span>
                    </div>

                    <div class="bw2-stepper-row">
                      ${[-10, -5, -1, 1, 5, 10]
                        .map(
                          (d) =>
                            `<button type="button" class="tg-btn tg-btn-sm" data-step="${d}" ${!isMyTurn ? 'disabled' : ''}>${d > 0 ? `+${d}` : d}</button>`
                        )
                        .join('')}
                    </div>

                    <div class="bw2-preset-row">
                      ${presets
                        .map(
                          (pr) =>
                            `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-preset="${pr.val}" ${!isMyTurn ? 'disabled' : ''}>${UI.escapeHtml(pr.label)}</button>`
                        )
                        .join('')}
                    </div>
                  </div>

                  <div style="display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:170px;">
                    <button type="button" class="tg-btn tg-btn-garnet" id="bw2-lock-bid" style="min-height:48px;font-size:14.5px;" ${!isMyTurn ? 'disabled' : ''}>
                      ${lang === 'zh' ? `锁定投入 ${draftBid} 点 →` : `Lock Bid ${draftBid} →`}
                    </button>
                    <div id="bw2-post-preview" style="font-family:var(--tg-font-mono);font-size:11px;text-align:center;color:var(--tg-ink-muted);">
                      ${lang === 'zh' ? `出价后剩 ${postRem} 点 (${postLamps} 灯)` : `After: ${postRem} pts (${postLamps} lamps)`}
                    </div>
                  </div>
                </div>

                <div class="bw2-rem-bar-wrap">
                  <div class="bw2-rem-track">
                    <div class="bw2-rem-fill" id="bw2-rem-fill" style="width:${(postRem / INITIAL_POINTS) * 100}%;"></div>
                  </div>
                  <div class="bw2-rem-ticks">
                    <span>0</span><span>20 (2灯)</span><span>40 (3灯)</span><span>60 (4灯)</span><span>80 (5灯)</span><span>99</span>
                  </div>
                </div>
              </section>
            `
            : ''
        }

        <!-- 4. 9-Round Gauge & Color Ledger -->
        <section class="bw2-history">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;letter-spacing:0.08em;color:var(--tg-ink-muted);text-transform:uppercase;">
            <span>${lang === 'zh' ? '9 回合盲注与熄灯记录（左=你 · 右=对手）' : '9-ROUND AUCTION & LAMP LOG (L=YOU · R=RIVAL)'}</span>
            <span>${isFinished ? (lang === 'zh' ? '全部出价已揭晓' : 'ALL BIDS UNSEALED') : (lang === 'zh' ? '对手出价全程保密' : 'RIVAL BIDS HIDDEN')}</span>
          </div>
          <div class="bw2-history-grid">
            ${Array.from({ length: state.totalRounds }, (_, idx) => {
              const rNum = idx + 1;
              const rec = state.history.find((h) => h.round === rNum);
              if (!rec) {
                return `
                  <div class="bw2-hcell">
                    <span style="color:var(--tg-ink-faint);font-size:10px;">R${rNum}</span>
                    <span style="opacity:0.25;">—</span>
                  </div>
                `;
              }
              const pMe = rec.plays[viewerId];
              const pOpp = rec.plays[oppId];
              const cls = rec.isDraw ? 'is-draw' : rec.winnerSeatId === viewerId ? 'is-win-me' : 'is-win-opp';
              const vText = rec.isDraw
                ? (lang === 'zh' ? '平' : 'TIE')
                : rec.winnerSeatId === viewerId
                ? (lang === 'zh' ? '胜' : 'WIN')
                : (lang === 'zh' ? '负' : 'LOSS');
              return `
                <div class="bw2-hcell ${cls}">
                  <span style="color:var(--tg-ink-faint);font-size:10px;">R${rNum}</span>
                  <div style="display:flex;gap:4px;align-items:center;">
                    <span class="bw2-hmini is-${pMe.color}">${pMe.bid != null ? pMe.bid : '?'}</span>
                    <span class="bw2-hmini is-${pOpp.color}">${pOpp.bid != null ? pOpp.bid : (pOpp.lampDrop > 0 ? `−${pOpp.lampDrop}⚡` : '?')}</span>
                  </div>
                  <span style="font-size:10px;font-weight:800;color:${
                    rec.isDraw ? '#67e8f9' : rec.winnerSeatId === viewerId ? 'var(--tg-gold-bright)' : '#ff8598'
                  };">${vText}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    // Live zero-lag UI update for slider/steppers/presets
    const syncDraftUI = (nextVal) => {
      draftBid = Math.max(0, Math.min(myRem, Math.round(nextVal)));
      const col = getBidColor(draftBid);
      const after = Math.max(0, myRem - draftBid);
      const afterLamps = getLampCount(after);

      const slider = container.querySelector('#bw2-slider');
      if (slider) slider.value = String(draftBid);

      const halo = container.querySelector('#bw2-halo');
      if (halo) {
        halo.classList.toggle('is-black', col === 'black');
        halo.classList.toggle('is-white', col === 'white');
      }
      const numEl = container.querySelector('#bw2-halo-num');
      if (numEl) numEl.textContent = String(draftBid);
      const tierEl = container.querySelector('#bw2-halo-tier');
      if (tierEl) {
        tierEl.textContent = col === 'black' ? (lang === 'zh' ? '黑 · 0–9' : 'BLACK') : (lang === 'zh' ? '白 · 10+' : 'WHITE');
      }
      const lockBtn = container.querySelector('#bw2-lock-bid');
      if (lockBtn) {
        lockBtn.textContent = lang === 'zh' ? `锁定投入 ${draftBid} 点 →` : `Lock Bid ${draftBid} →`;
      }
      const prevEl = container.querySelector('#bw2-post-preview');
      if (prevEl) {
        prevEl.textContent = lang === 'zh' ? `出价后剩 ${after} 点 (${afterLamps} 灯)` : `After: ${after} pts (${afterLamps} lamps)`;
      }
      const fillEl = container.querySelector('#bw2-rem-fill');
      if (fillEl) fillEl.style.width = `${(after / INITIAL_POINTS) * 100}%`;

      const myLampsEl = container.querySelector('#bw2-my-lamps');
      if (myLampsEl) {
        myLampsEl.innerHTML = renderLamps(me.lamps, afterLamps, 0);
      }
    };

    container.querySelector('#bw2-slider')?.addEventListener('input', (e) => {
      syncDraftUI(Number(e.target.value));
    });

    container.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyTurn) return;
        sfx.play('click');
        syncDraftUI(draftBid + Number(btn.dataset.step));
      });
    });

    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyTurn) return;
        sfx.play('click');
        syncDraftUI(Number(btn.dataset.preset));
      });
    });

    container.querySelector('#bw2-lock-bid')?.addEventListener('click', () => {
      if (!isMyTurn) return;
      sfx.play('bid');
      dispatch({ type: 'SUBMIT_BID', payload: { bid: draftBid } });
    });

    container.querySelector('#bw2-next-round')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_ROUND' });
    });
  },
});
