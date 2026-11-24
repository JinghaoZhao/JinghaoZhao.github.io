/**
 * Black and White (黑与白 · 흑과 백) — Interactive Broadcast Stage
 */

import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules, getTileColor } from './rules.js';

const ALL_TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

let selectedTile = null;
let lastHandledEventTs = null;
let lastRoundKey = null;

function colorLabel(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑 · 偶数' : 'BLACK · EVEN';
  return lang === 'zh' ? '白 · 奇数' : 'WHITE · ODD';
}

function colorShort(color, lang) {
  if (color === 'black') return lang === 'zh' ? '黑' : 'BLK';
  return lang === 'zh' ? '白' : 'WHT';
}

mountGame({
  config: {
    id: 'black-and-white',
    title: { zh: '黑与白', en: 'Black and White', ko: '흑과 백' },
    seasons: ['S2', 'S4'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'timedMode',
        label: { zh: '启用 30 秒倒计时', en: '30s Turn Clock' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 对决目标
双方各持 **0–8 共 9 张数字砖**，进行 9 回合心理暗战，先获得 **5 分**（或对手数学上无法追平）者获胜！

### 黑白颜色法则
- **黑砖（偶数）**：\`0, 2, 4, 6, 8\`（共 5 张）
- **白砖（奇数）**：\`1, 3, 5, 7\`（共 4 张）

### 回合流程
- **先手出牌**：由当轮先手秘密选择 1 张未用过的砖扣在裁决台。对手**仅能看到黑白颜色**，看不到具体数字！
- **后手应战**：后手根据对手的颜色线索，选择 1 张砖扣上裁决台。
- **暗牌裁决**：系统秘密比较大小——数字较大者得 **+1 胜分**，并成为**下一回合的先手**；数字相同为平局（0 分，先手不变）。
- **绝对保密**：整场对局中，双方**永远不会看到对手打出的具体数字**，只能靠黑白颜色、剩余黑白数量与胜负结果推理对手残牌！`,
      en: `### Objective
Each player holds tiles **0 through 8** across 9 blind rounds. First to **5 Win Points** (or an insurmountable lead) survives the Death Match!

### Black & White Color Code
- **BLACK (Even)**: \`0, 2, 4, 6, 8\` (5 tiles)
- **WHITE (Odd)**: \`1, 3, 5, 7\` (4 tiles)

### Round Flow
- **First Player**: Places 1 unused tile face-down into the Judge Chamber. The rival sees **ONLY Black or White** — never the numeral!
- **Second Player**: Reads the color clue and responds with 1 unused tile face-down.
- **Blind Verdict**: Higher number wins **+1 Win Point** and becomes **First Player next round**. Equal numbers = Draw (0 pts, First Player unchanged).
- **Zero Number Reveal**: Opponent's played numbers are **NEVER revealed** during the match! Deduce their remaining tiles solely from colors and outcomes.`,
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

    // Reset selection when round/phase/turn changes
    const roundKey = `${state.round}-${state.phase}-${viewerId}`;
    if (roundKey !== lastRoundKey) {
      lastRoundKey = roundKey;
      selectedTile = null;
    }

    // Play audio cues & broadcast log on new events
    if (lastEvent && lastEvent.ts && lastEvent.ts !== lastHandledEventTs) {
      lastHandledEventTs = lastEvent.ts;
      if (lastEvent.type === 'FIRST_TILE_PLACED') {
        sfx.play('tilePlace');
        const actorName = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `第 ${lastEvent.round} 回合：${actorName} 打出了一张【${colorShort(lastEvent.color, 'zh')}砖】`
            : `R${lastEvent.round}: ${actorName} placed a [${colorShort(lastEvent.color, 'en')}] tile`,
          'system'
        );
      } else if (lastEvent.type === 'ROUND_RESOLVED') {
        sfx.play('heartbeat');
        setTimeout(() => {
          if (lastEvent.isDraw) sfx.play('reveal');
          else if (lastEvent.winnerSeatId === viewerId) sfx.play('garnetClink');
          else sfx.play('clash');
        }, 260);
        const wName = lastEvent.winnerSeatId ? state.players[lastEvent.winnerSeatId]?.name : null;
        log(
          lastEvent.isDraw
            ? lang === 'zh'
              ? `第 ${lastEvent.round} 回合暗牌裁决：数字相同 · 平局！`
              : `R${lastEvent.round} Verdict: Exact tie — Draw!`
            : lang === 'zh'
            ? `第 ${lastEvent.round} 回合暗牌裁决：${wName} 获胜（+1 分）！`
            : `R${lastEvent.round} Verdict: ${wName} wins (+1 pt)!`,
          'alert'
        );
      } else if (lastEvent.type === 'ROUND_STARTED') {
        sfx.play('click');
      }
    }

    const isMyTurn = !isSpectator && (state.phase === 'first_pick' || state.phase === 'second_pick') && state.currentTurnSeatId === viewerId;
    const isRoundResult = state.phase === 'round_result';
    const isFinished = state.phase === 'finished';

    // Determine plays on current pedestal for viewer (left) and opponent (right)
    const cr = state.currentRound || {};
    const myPlay = cr.firstPlay?.seatId === viewerId ? cr.firstPlay : cr.secondPlay?.seatId === viewerId ? cr.secondPlay : null;
    const oppPlay = cr.firstPlay?.seatId === oppId ? cr.firstPlay : cr.secondPlay?.seatId === oppId ? cr.secondPlay : null;

    const myWonRound = isRoundResult && cr.winnerSeatId === viewerId;
    const oppWonRound = isRoundResult && cr.winnerSeatId === oppId;
    const drawRound = isRoundResult && cr.isDraw;

    // Status message
    let statusText = '';
    if (isFinished) {
      statusText = lang === 'zh' ? '终局复盘：所有暗牌数字已解封' : 'Final Review: All secret numerals unsealed';
    } else if (isRoundResult) {
      if (drawRound) {
        statusText = lang === 'zh' ? '暗牌平局！数字相同，先手权不变' : 'Blind Draw! Exact equal numerals — first-player unchanged';
      } else if (myWonRound) {
        statusText = lang === 'zh' ? `你赢下第 ${state.round} 回合！获得 +1 胜分与下轮先手权` : `You won Round ${state.round}! +1 pt & First Player next round`;
      } else {
        statusText = lang === 'zh' ? `${opp.name} 赢下第 ${state.round} 回合（对方数字保持保密）` : `${opp.name} won Round ${state.round} (numeral remains secret)`;
      }
    } else if (isMyTurn) {
      if (state.phase === 'first_pick') {
        statusText = lang === 'zh'
          ? '轮到你【先手】出牌：选择 1 张砖扣入裁决台（对手仅可见黑白颜色）'
          : 'Your turn [FIRST]: Select 1 tile to place face-down (rival sees color only)';
      } else {
        statusText = lang === 'zh'
          ? `对手已打出【${colorLabel(oppPlay?.color, 'zh')}】！轮到你【后手】应战`
          : `Rival played [${colorLabel(oppPlay?.color, 'en')}]! Choose your counter tile`;
      }
    } else {
      const actor = state.players[state.currentTurnSeatId];
      statusText = lang === 'zh'
        ? `等待 ${actor?.name || ''} 秘密选牌中...`
        : `Waiting for ${actor?.name || ''} to lock a tile...`;
    }

    // Score pips (5 to win)
    const renderPips = (score, cls) =>
      Array.from({ length: state.winTarget }, (_, i) =>
        `<span class="bw-pip ${i < score ? cls : ''}"></span>`
      ).join('');

    const renderMonolith = (play, side, isWinner, isLoser, isAwaiting) => {
      if (!play) {
        return `
          <div class="bw-monolith is-empty ${isAwaiting ? 'is-awaiting' : ''}">
            <span style="font-size:24px;opacity:0.45;">${isAwaiting ? '◈' : '—'}</span>
            <span class="bw-monolith-tag">${
              isAwaiting
                ? lang === 'zh' ? '等待落砖' : 'AWAITING'
                : lang === 'zh' ? '未出牌' : 'EMPTY'
            }</span>
          </div>
        `;
      }
      const showNum = play.num !== null && play.num !== undefined;
      return `
        <div class="bw-monolith is-${play.color} ${isWinner ? 'is-winner' : ''} ${isLoser ? 'is-loser' : ''}">
          ${
            showNum
              ? `<span class="bw-monolith-num">${play.num}</span>`
              : `<span class="bw-monolith-mystery">?</span>`
          }
          <span class="bw-monolith-tag">${colorLabel(play.color, lang)}</span>
        </div>
      `;
    };

    const orbClass = isRoundResult
      ? drawRound ? 'is-draw' : myWonRound ? 'is-win' : 'is-loss'
      : '';
    const orbLabel = isRoundResult
      ? drawRound
        ? (lang === 'zh' ? '平' : 'TIE')
        : myWonRound
        ? (lang === 'zh' ? '胜' : 'WIN')
        : (lang === 'zh' ? '负' : 'LOSE')
      : 'VS';

    const myHandSet = new Set(me.hand || []);

    container.innerHTML = `
      <div class="bw-arena">
        <!-- 1. Broadcast Scoreboard & Remaining Color Telemetry -->
        <section class="bw-scoreboard">
          <div class="bw-score-side">
            <div class="bw-player-header">
              <span class="bw-player-name">${UI.escapeHtml(me.name)}${!isSpectator ? (lang === 'zh' ? ' (你)' : ' (You)') : ''}</span>
              ${state.firstSeatId === viewerId ? `<span class="bw-first-tag">${lang === 'zh' ? '先手' : '1ST'}</span>` : ''}
            </div>
            <div class="bw-pips" aria-label="Your win points">${renderPips(me.score, 'is-won-me')}</div>
            <div class="bw-rem-counts">
              <span>${lang === 'zh' ? '剩余' : 'Left'}:</span>
              <span class="bw-color-pill is-black">■ ${me.remainingCounts.black}</span>
              <span class="bw-color-pill is-white">□ ${me.remainingCounts.white}</span>
            </div>
          </div>

          <div class="bw-score-center">
            <div class="bw-big-score">
              <span class="is-gold">${me.score}</span>
              <span style="font-size:18px;opacity:0.4;">:</span>
              <span class="is-garnet">${opp.score}</span>
            </div>
            <div class="bw-round-sub">
              ${lang === 'zh' ? `第 ${state.round} / ${state.totalRounds} 回合 · 先得 ${state.winTarget} 分胜` : `ROUND ${state.round} / ${state.totalRounds} · FIRST TO ${state.winTarget}`}
            </div>
          </div>

          <div class="bw-score-side is-right">
            <div class="bw-player-header">
              ${state.firstSeatId === oppId ? `<span class="bw-first-tag">${lang === 'zh' ? '先手' : '1ST'}</span>` : ''}
              <span class="bw-player-name">${UI.escapeHtml(opp.name)}</span>
            </div>
            <div class="bw-pips" aria-label="Opponent win points">${renderPips(opp.score, 'is-won-opp')}</div>
            <div class="bw-rem-counts">
              <span>${lang === 'zh' ? '剩余' : 'Left'}:</span>
              <span class="bw-color-pill is-black">■ ${opp.remainingCounts.black}</span>
              <span class="bw-color-pill is-white">□ ${opp.remainingCounts.white}</span>
            </div>
          </div>
        </section>

        <!-- 2. Central Chiaroscuro Dealer Judge Chamber -->
        <section class="bw-chamber ${isRoundResult ? 'is-judging' : ''}">
          <div class="bw-laser-sweep"></div>
          <div class="bw-chamber-header">
            <div class="bw-chamber-status">
              <span class="tg-badge ${isMyTurn ? 'tg-badge-gold' : isRoundResult ? 'tg-badge-garnet' : 'tg-badge-cyan'}">
                ${UI.escapeHtml(I18n.t(state.phaseLabel))}
              </span>
              <span>${UI.escapeHtml(statusText)}</span>
            </div>
            <span style="font-family:var(--tg-font-mono);font-size:11px;color:var(--tg-ink-faint);">
              ${lang === 'zh' ? '盲比规则 · 数字全程保密' : 'BLIND COMPARE · NUMERALS HIDDEN'}
            </span>
          </div>

          <div class="bw-chamber-stage">
            <div class="bw-pedestal">
              <span class="bw-pedestal-label">${UI.escapeHtml(me.name)}</span>
              ${renderMonolith(
                myPlay,
                'me',
                myWonRound,
                oppWonRound,
                !myPlay && state.currentTurnSeatId === viewerId
              )}
            </div>

            <div class="bw-vs-core">
              <div class="bw-judge-orb ${orbClass}">${orbLabel}</div>
              ${
                isRoundResult
                  ? `
                    <div class="bw-verdict-banner">
                      ${
                        drawRound
                          ? (lang === 'zh' ? '平局 · 0 分' : 'DRAW · 0 PTS')
                          : myWonRound
                          ? (lang === 'zh' ? '+1 胜分！' : '+1 WIN PT!')
                          : (lang === 'zh' ? '对手 +1 胜分' : 'RIVAL +1 PT')
                      }
                    </div>
                    <div class="bw-verdict-sub">
                      ${
                        drawRound
                          ? (lang === 'zh' ? '先手权保持不变' : 'First player unchanged')
                          : myWonRound
                          ? (lang === 'zh' ? '下回合由你先手' : 'You lead next round')
                          : (lang === 'zh' ? `下回合由 ${UI.escapeHtml(opp.name)} 先手` : `${UI.escapeHtml(opp.name)} leads next`)
                      }
                    </div>
                    ${
                      !isSpectator
                        ? `<button type="button" class="tg-btn tg-btn-gold" id="bw-next-round" style="margin-top:4px;min-width:140px;">
                            ${lang === 'zh' ? '下一回合 →' : 'Next Round →'}
                          </button>`
                        : ''
                    }
                  `
                  : `
                    <div class="bw-verdict-sub">
                      ${
                        state.phase === 'first_pick'
                          ? (lang === 'zh' ? '先手盲出' : 'First Lead')
                          : state.phase === 'second_pick'
                          ? (lang === 'zh' ? '等待后手应战' : 'Awaiting Counter')
                          : (lang === 'zh' ? '对决结束' : 'Match Complete')
                      }
                    </div>
                  `
              }
            </div>

            <div class="bw-pedestal">
              <span class="bw-pedestal-label">${UI.escapeHtml(opp.name)}</span>
              ${renderMonolith(
                oppPlay,
                'opp',
                oppWonRound,
                myWonRound,
                !oppPlay && state.currentTurnSeatId === oppId
              )}
            </div>
          </div>
        </section>

        <!-- 3. Player's 0-8 Obsidian & Ivory Tile Rack -->
        ${
          !isSpectator
            ? `
              <section class="bw-rack-panel">
                <div class="bw-rack-top">
                  <span class="bw-rack-title">
                    ${lang === 'zh' ? '你的数字砖架（黑=偶 0,2,4,6,8 · 白=奇 1,3,5,7）' : 'YOUR TILE RACK (BLACK=EVEN 0,2,4,6,8 · WHITE=ODD 1,3,5,7)'}
                  </span>
                  <span style="font-family:var(--tg-font-mono);font-size:12px;color:var(--tg-ink-muted);">
                    ${lang === 'zh' ? `剩余 ${me.remainingCounts.total} / 9 张` : `${me.remainingCounts.total} / 9 LEFT`}
                  </span>
                </div>

                <div class="bw-tile-grid">
                  ${ALL_TILES.map((n) => {
                    const color = getTileColor(n);
                    const available = myHandSet.has(n);
                    const isSel = selectedTile === n && available;
                    return `
                      <button
                        type="button"
                        class="bw-tile-btn is-${color} ${!available ? 'is-used' : ''} ${isSel ? 'is-selected' : ''}"
                        data-tile="${n}"
                        ${!available || !isMyTurn ? 'disabled' : ''}
                        aria-label="Tile ${n} (${color})"
                      >
                        <span class="bw-tile-num">${n}</span>
                        <span class="bw-tile-sub">${colorShort(color, lang)}</span>
                      </button>
                    `;
                  }).join('')}
                </div>

                <div class="bw-action-bar">
                  <span class="bw-hint-text">
                    ${
                      isMyTurn
                        ? selectedTile !== null
                          ? lang === 'zh'
                            ? `已选中数字【${selectedTile}】（${colorLabel(getTileColor(selectedTile), 'zh')}），点击右侧确认扣牌`
                            : `Selected [${selectedTile}] (${colorLabel(getTileColor(selectedTile), 'en')}) — lock it into the chamber`
                          : lang === 'zh'
                          ? '点击上方任意未用数字砖，再确认出牌（双击可直接出牌）'
                          : 'Click any available tile above to select (double-click to play immediately)'
                        : isRoundResult
                        ? lang === 'zh'
                          ? '请查看上方裁决并点击「下一回合」继续'
                          : 'Inspect the verdict above and press Next Round'
                        : lang === 'zh'
                        ? '等待对手行动...'
                        : 'Waiting for opponent...'
                    }
                  </span>
                  <button
                    type="button"
                    class="tg-btn tg-btn-garnet"
                    id="bw-confirm-tile"
                    style="min-width:170px;"
                    ${!isMyTurn || selectedTile === null ? 'disabled' : ''}
                  >
                    ${lang === 'zh' ? '锁定出牌 →' : 'Lock Tile →'}
                  </button>
                </div>
              </section>
            `
            : ''
        }

        <!-- 4. 9-Round Deduction Ledger -->
        <section class="bw-history-panel">
          <div class="bw-history-head">
            <span>${lang === 'zh' ? '9 回合黑白推理记录（左=你 · 右=对手）' : '9-ROUND DEDUCTION LEDGER (L=YOU · R=RIVAL)'}</span>
            <span>${isFinished ? (lang === 'zh' ? '终局已揭晓全部数字' : 'ALL NUMERALS UNSEALED') : (lang === 'zh' ? '对手数字全程隐藏' : 'RIVAL NUMERALS HIDDEN')}</span>
          </div>
          <div class="bw-history-strip">
            ${Array.from({ length: state.totalRounds }, (_, idx) => {
              const rNum = idx + 1;
              const rec = state.history.find((h) => h.round === rNum);
              if (!rec) {
                const isCurr = rNum === state.round && !isFinished;
                return `
                  <div class="bw-hist-cell ${isCurr ? 'is-current' : ''}">
                    <span class="bw-hist-round">R${rNum}</span>
                    <span style="opacity:0.25;font-size:14px;">· ·</span>
                    <span class="bw-hist-verdict" style="opacity:0.35;">${isCurr ? 'LIVE' : '—'}</span>
                  </div>
                `;
              }
              const pMe = rec.plays[viewerId];
              const pOpp = rec.plays[oppId];
              const cls = rec.isDraw ? 'is-draw' : rec.winnerSeatId === viewerId ? 'is-win-me' : 'is-win-opp';
              const verdict = rec.isDraw
                ? (lang === 'zh' ? '平' : 'TIE')
                : rec.winnerSeatId === viewerId
                ? (lang === 'zh' ? '胜' : 'WIN')
                : (lang === 'zh' ? '负' : 'LOSS');
              const verdictColor = rec.isDraw ? '#67e8f9' : rec.winnerSeatId === viewerId ? 'var(--tg-gold-bright)' : '#ff8598';
              return `
                <div class="bw-hist-cell ${cls}">
                  <span class="bw-hist-round">R${rNum}</span>
                  <div class="bw-hist-tokens">
                    <span class="bw-mini-tile is-${pMe.color}" title="${lang === 'zh' ? '你' : 'You'}">${pMe.num !== null ? pMe.num : '?'}</span>
                    <span class="bw-mini-tile is-${pOpp.color}" title="${UI.escapeHtml(opp.name)}">${pOpp.num !== null ? pOpp.num : '?'}</span>
                  </div>
                  <span class="bw-hist-verdict" style="color:${verdictColor};">${verdict}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    // Bind tile selection & double-click instant play
    container.querySelectorAll('.bw-tile-btn[data-tile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!isMyTurn) return;
        const n = Number(btn.dataset.tile);
        if (selectedTile === n) {
          // Second click on already-selected tile plays immediately for crisp ergonomics
          sfx.play('tilePlace');
          const tileToPlay = n;
          selectedTile = null;
          dispatch({ type: 'PLAY_TILE', payload: { tile: tileToPlay } });
          return;
        }
        sfx.play('click');
        selectedTile = n;
        // Fast UI highlight update without waiting for server
        container.querySelectorAll('.bw-tile-btn').forEach((b) => {
          b.classList.toggle('is-selected', Number(b.dataset.tile) === n);
        });
        const confirmBtn = container.querySelector('#bw-confirm-tile');
        if (confirmBtn) confirmBtn.disabled = false;
        const hintEl = container.querySelector('.bw-hint-text');
        if (hintEl) {
          hintEl.textContent =
            lang === 'zh'
              ? `已选中数字【${n}】（${colorLabel(getTileColor(n), 'zh')}），再次点击或按「锁定出牌」提交`
              : `Selected [${n}] (${colorLabel(getTileColor(n), 'en')}) — click again or press Lock Tile`;
        }
      });
    });

    container.querySelector('#bw-confirm-tile')?.addEventListener('click', () => {
      if (!isMyTurn || selectedTile === null) return;
      const tileToPlay = selectedTile;
      selectedTile = null;
      dispatch({ type: 'PLAY_TILE', payload: { tile: tileToPlay } });
    });

    container.querySelector('#bw-next-round')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_ROUND' });
    });
  },
});
