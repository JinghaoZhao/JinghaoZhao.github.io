import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, RANK_LABELS } from './rules.js';

const ui = {
  selected: [],
  lastRound: 0,
  lastPhase: '',
  barTimer: null,
  lastCtx: null,
};

function rankStr(r) {
  return r == null ? '?' : (RANK_LABELS[r] || String(r));
}

mountGame({
  config: {
    id: 'memory-poker',
    title: { zh: '记忆扑克', en: 'Memory Poker', ko: '기억 포커' },
    category: 'MAIN MATCH · MINI-GAME',
    episode: 'EP 1',
    minPlayers: 2,
    maxPlayers: 16,
    defaultPlayers: 6,
    hasHiddenInfo: true,
    optionsSchema: [
      {
        key: 'rounds',
        label: { zh: '局数', en: 'Rounds' },
        type: 'select',
        default: '3',
        choices: [
          { value: '1', label: { zh: '1 局定胜负', en: '1 Round Blitz' } },
          { value: '3', label: { zh: '3 局标准赛', en: '3 Standard Rounds' } },
        ],
      },
      {
        key: 'memorySec',
        label: { zh: '记忆时间', en: 'Memory Window' },
        type: 'select',
        default: '20',
        choices: [
          { value: '15', label: { zh: '15 秒 (高压)', en: '15s (Intense)' } },
          { value: '20', label: { zh: '20 秒 (剧集标准)', en: '20s (Show Standard)' } },
          { value: '30', label: { zh: '30 秒 (充裕)', en: '30s (Relaxed)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 游戏流程
1. **20 秒极限记忆**：牌桌中央 ` + '`4×4`' + ` 共 16 张黑曜石金箔数字牌全部正面展示 **20 秒**，牢记每个坐标的点数。
2. **翻面与公共牌揭晓**：倒计时结束，16 张牌齐齐翻面扣下，桌面正上方亮出 **3 张公共牌**。
3. **盲选 2 张**：每位选手凭记忆秘密选定 2 个不同位置（不同玩家可重复选同一张牌），与 3 张公共牌组成 5 张扑克牌型。
4. **亮牌比大小（无同花，7 级牌型）**：
   - **四条 > 葫芦 > 顺子 > 三条 > 两对 > 一对 > 高牌**
   - 顺子最小为 ` + '`A-2-3-4-5`' + `，最大为 ` + '`10-J-Q-K-A`' + `。
   - 按每局牌型排名发放胜点（前 25% +5 分、前 50% +3 分、其余 +1 分）。`,
      en: `### Round Flow
1. **20-Second Memory Flash**: All 16 obsidian-gold rank cards (` + '`4×4`' + `) face up for **20 seconds**. Memorize every slot!
2. **Flip & Community Reveal**: All 16 cards flip face-down in unison while **3 glowing Community Cards** reveal overhead.
3. **Blind 2-Card Selection**: Secretly pick **2 distinct slots** (players may pick overlapping slots) to combine with the 3 community cards.
4. **Showdown (7-Tier Rank-Only Poker — No Flushes)**:
   - **Four of a Kind > Full House > Straight > Three of a Kind > Two Pair > One Pair > High Card**
   - Scored each round: Top 25% **+5 pts**, Top 50% **+3 pts**, others **+1 pt**.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx } = ctx;
    ui.lastCtx = ctx;

    if (state.round !== ui.lastRound || state.phase !== ui.lastPhase) {
      if (state.phase === 'select' && ui.lastPhase === 'memorize') {
        sfx.play('cardFlip');
        setTimeout(() => sfx.play('reveal'), 220);
      } else if (state.phase === 'showdown' && ui.lastPhase === 'select') {
        sfx.play('cardFlip');
        setTimeout(() => sfx.play('pieceGain'), 300);
      }
      ui.selected = [];
      ui.lastRound = state.round;
      ui.lastPhase = state.phase;
    }

    const nameOf = (sid) => state.seats.find((s) => s.seatId === sid)?.name || sid;
    const myLockedPick = mySeatId && Array.isArray(state.picks[mySeatId]) ? state.picks[mySeatId] : null;
    const isMemorize = state.phase === 'memorize';
    const isSelect = state.phase === 'select';
    const isShowdown = state.phase === 'showdown' || state.phase === 'finished';
    const activePick = myLockedPick || ui.selected;

    const pickedCount = state.seats.filter((s) => Boolean(state.picks[s.seatId])).length;
    const phaseTitle = isMemorize
      ? (lang === 'zh' ? '记忆阶段 · 死记 16 张牌面！' : 'MEMORIZE · STUDY ALL 16 CARDS!')
      : isSelect
      ? (lang === 'zh' ? '盲选阶段 · 结合 3 张公共牌盲选 2 张！' : 'BLIND PICK · SELECT 2 HIDDEN SLOTS')
      : (lang === 'zh' ? '亮牌决胜 · SHOWDOWN' : 'SHOWDOWN REVEAL');

    const optPair = isShowdown && state.optimal ? state.optimal.pair : [];

    container.innerHTML = `
      <div class="mp-arena">
        <section class="mp-table ${isSelect ? 'is-darkened' : ''}">
          <div class="mp-phase-strip">
            <span class="mp-phase-pill ${isMemorize ? 'is-urgent' : ''}">
              ${lang === 'zh' ? `第 ${state.round}/${state.totalRounds} 局` : `ROUND ${state.round}/${state.totalRounds}`}
              · ${phaseTitle}
            </span>
            ${
              isMemorize && mySeatId
                ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="mp-ready-mem" ${state.readyMemorize[mySeatId] ? 'disabled' : ''}>
                    ${state.readyMemorize[mySeatId]
                      ? (lang === 'zh' ? '已记牢 · 等待翻牌' : 'READY · WAITING')
                      : (lang === 'zh' ? '我已记牢 · 立刻翻牌 →' : 'Memorized! Flip Now →')}
                   </button>`
                : isSelect
                ? `<span style="font-size:12px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                    ${pickedCount}/${state.seats.length} ${lang === 'zh' ? '已锁定' : 'LOCKED'}
                   </span>`
                : ''
            }
          </div>

          ${
            isMemorize
              ? `<div class="mp-mem-bar-wrap"><div class="mp-mem-bar-fill" id="mp-mem-bar" style="width:100%;"></div></div>`
              : ''
          }

          <div class="mp-community-zone">
            <div class="mp-community-label">
              ${lang === 'zh' ? '✦ 公共牌 · COMMUNITY CARDS (3) ✦' : '✦ COMMUNITY CARDS (3) ✦'}
            </div>
            <div class="mp-community-row">
              ${state.community
                .map((r, i) => {
                  const facedown = r == null;
                  return `
                    <div class="mp-card-slot is-community">
                      <div class="mp-card ${facedown ? 'is-facedown' : ''}">
                        <div class="mp-card-face mp-card-front is-community-face ${r >= 11 ? 'is-high-rank' : ''}">
                          <span class="mp-card-coord">C${i + 1}</span>
                          <span class="mp-card-rank">${rankStr(r)}</span>
                          <span class="mp-card-emblem">◆ ◆</span>
                        </div>
                        <div class="mp-card-face mp-card-back">
                          <span class="mp-back-num">?</span>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="mp-grid">
            ${state.grid
              .map((r, idx) => {
                const facedown = isSelect;
                const isSel = activePick.includes(idx);
                const isOpt = isShowdown && optPair.includes(idx);
                const canClick = isSelect && mySeatId && !myLockedPick;
                return `
                  <div class="mp-card-slot ${isSel ? 'is-selected' : ''} ${isOpt ? 'is-optimal' : ''}">
                    <div class="mp-card ${facedown ? 'is-facedown' : ''} ${canClick ? 'is-clickable' : ''}" data-slot="${idx}">
                      <div class="mp-card-face mp-card-front ${r >= 11 ? 'is-high-rank' : ''}">
                        <span class="mp-card-coord">${state.coords[idx]}</span>
                        <span class="mp-card-rank">${rankStr(r)}</span>
                        <span class="mp-card-emblem">#${idx + 1}</span>
                      </div>
                      <div class="mp-card-face mp-card-back">
                        <span class="mp-card-coord">${state.coords[idx]}</span>
                        <span class="mp-back-num">#${idx + 1}</span>
                      </div>
                    </div>
                    ${isSel ? `<span class="mp-pick-tag">${lang === 'zh' ? '已选' : 'PICK'}</span>` : ''}
                    ${isOpt && !isSel ? `<span class="mp-pick-tag" style="background:#38bdf8;">MAX</span>` : ''}
                  </div>
                `;
              })
              .join('')}
          </div>

          ${
            isSelect && mySeatId && !myLockedPick
              ? `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--dp-border-subtle);">
                  <span style="font-size:13px;color:var(--dp-ink-muted);">
                    ${lang === 'zh'
                      ? `已选位置 (${ui.selected.length}/2)：<strong style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || '请点击 2 张暗牌'}</strong>`
                      : `Selected (${ui.selected.length}/2): <strong style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || 'Click 2 hidden cards'}</strong>`}
                  </span>
                  <button type="button" class="dp-btn dp-btn-primary" id="mp-confirm-pick" ${ui.selected.length !== 2 ? 'disabled' : ''}>
                    ${lang === 'zh' ? '锁定 2 张暗牌 →' : 'Lock 2 Cards →'}
                  </button>
                </div>
              `
              : isSelect && myLockedPick
              ? `<div style="text-align:center;font-size:13px;color:#86efac;padding:6px;">
                  ✓ ${lang === 'zh'
                    ? `已锁定位置 ${myLockedPick.map((i) => state.coords[i]).join(' & ')}，等待其他选手提交...`
                    : `Locked ${myLockedPick.map((i) => state.coords[i]).join(' & ')} — waiting for other players...`}
                 </div>`
              : ''
          }
        </section>

        <aside class="mp-side">
          <div class="mp-panel">
            <div style="font-size:11.5px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${isShowdown
                ? (lang === 'zh' ? '本局亮牌结算' : 'ROUND SHOWDOWN')
                : (lang === 'zh' ? '参赛者积分与牌型表' : 'STANDINGS & HAND LADDER')}
            </div>

            ${
              isShowdown && state.roundResults
                ? `
                  ${
                    state.optimal
                      ? `<div style="margin-top:10px;padding:9px 11px;border-radius:10px;border:1px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.09);font-size:12px;">
                          <strong style="color:#7dd3fc;">✦ ${lang === 'zh' ? '牌桌理论最强解' : 'THEORETICAL BEST HAND'}:</strong>
                          ${UI.escapeHtml(state.optimal.eval.name[lang] || state.optimal.eval.name.en)}
                          (${state.optimal.pair.map((i) => `${state.coords[i]}[${rankStr(state.grid[i])}]`).join(' + ')})
                         </div>`
                      : ''
                  }
                  <div class="mp-showdown-list">
                    ${state.roundResults
                      .map((entry) => {
                        const isMe = entry.seatId === mySeatId;
                        return `
                          <div class="mp-showdown-row ${entry.rank === 1 ? 'is-winner' : ''} ${isMe ? 'is-me' : ''}">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                              <span style="font-size:13px;font-weight:700;">
                                <strong style="color:var(--dp-brass);margin-right:6px;">#${entry.rank}</strong>
                                ${UI.escapeHtml(nameOf(entry.seatId))}
                              </span>
                              <span style="font-family:var(--dp-font-mono);font-size:12px;color:#86efac;">
                                +${entry.pointsEarned}pt · <strong>${state.scores[entry.seatId]}pt</strong>
                              </span>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                              <div class="mp-mini-cards">
                                ${state.community.map((r) => `<span class="mp-mini-card">${rankStr(r)}</span>`).join('')}
                                ${entry.pickedRanks.map((r) => `<span class="mp-mini-card is-picked">${rankStr(r)}</span>`).join('')}
                              </div>
                              <span style="font-size:12px;font-weight:700;color:var(--dp-brass-bright);white-space:nowrap;">
                                ${UI.escapeHtml(entry.eval.name[lang] || entry.eval.name.en)}
                              </span>
                            </div>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                  ${
                    state.phase === 'showdown'
                      ? `<button type="button" class="dp-btn dp-btn-primary" id="mp-next-round" style="width:100%;margin-top:14px;min-height:46px;">
                          ${state.round >= state.totalRounds
                            ? (lang === 'zh' ? '查看最终排名 →' : 'Final Verdict →')
                            : (lang === 'zh' ? `进入第 ${state.round + 1} 局 →` : `Next Round (${state.round + 1}/${state.totalRounds}) →`)}
                         </button>`
                      : ''
                  }
                `
                : `
                  <div style="display:flex;flex-direction:column;gap:7px;margin-top:10px;">
                    ${[...state.seats]
                      .sort((a, b) => (state.scores[b.seatId] || 0) - (state.scores[a.seatId] || 0))
                      .map((s) => {
                        const locked = Boolean(state.picks[s.seatId]);
                        return `
                          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:9px;border:1px solid ${s.seatId === mySeatId ? 'var(--dp-border-strong)' : 'var(--dp-border-subtle)'};background:rgba(255,255,255,0.025);font-size:13px;">
                            <span><strong style="color:var(--dp-brass);margin-right:5px;">${UI.escapeHtml(s.avatar || '◆')}</strong>${UI.escapeHtml(s.name)}</span>
                            <span style="display:flex;align-items:center;gap:8px;">
                              ${isSelect ? `<span style="font-size:11px;color:${locked ? '#86efac' : 'var(--dp-ink-faint)'};">${locked ? '✓' : '...'}</span>` : ''}
                              <strong style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${state.scores[s.seatId] || 0}pt</strong>
                            </span>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                `
            }
          </div>

          <div class="mp-panel">
            <div style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${lang === 'zh' ? '7 级牌型大小（无同花）' : '7-TIER HAND RANKING (NO FLUSH)'}
            </div>
            <div class="mp-hand-ladder">
              <span>1. ${lang === 'zh' ? '四条 (AAAA+X)' : 'Four of a Kind'}</span>
              <span>2. ${lang === 'zh' ? '葫芦 (AAA+BB)' : 'Full House'}</span>
              <span>3. ${lang === 'zh' ? '顺子 (5连张)' : 'Straight'}</span>
              <span>4. ${lang === 'zh' ? '三条 (AAA)' : 'Three of a Kind'}</span>
              <span>5. ${lang === 'zh' ? '两对 (AA+BB)' : 'Two Pair'}</span>
              <span>6. ${lang === 'zh' ? '一对 (AA)' : 'One Pair'}</span>
              <span>7. ${lang === 'zh' ? '高牌 (最大单张)' : 'High Card'}</span>
            </div>
          </div>
        </aside>
      </div>
    `;

    container.querySelector('#mp-ready-mem')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'READY_MEMORIZE' });
    });

    container.querySelectorAll('[data-slot]').forEach((cardEl) => {
      cardEl.addEventListener('click', () => {
        if (!isSelect || !mySeatId || myLockedPick) return;
        const idx = Number(cardEl.dataset.slot);
        const pos = ui.selected.indexOf(idx);
        if (pos >= 0) {
          ui.selected.splice(pos, 1);
        } else if (ui.selected.length < 2) {
          ui.selected.push(idx);
        } else {
          ui.selected.shift();
          ui.selected.push(idx);
        }
        sfx.play('click');
        // Fast DOM highlight sync without losing flip state
        container.querySelectorAll('.mp-card-slot').forEach((slotEl) => {
          const inner = slotEl.querySelector('[data-slot]');
          if (!inner) return;
          const sIdx = Number(inner.dataset.slot);
          const sel = ui.selected.includes(sIdx);
          slotEl.classList.toggle('is-selected', sel);
          const oldTag = slotEl.querySelector('.mp-pick-tag');
          if (sel && !oldTag) {
            const tag = document.createElement('span');
            tag.className = 'mp-pick-tag';
            tag.textContent = lang === 'zh' ? '已选' : 'PICK';
            slotEl.appendChild(tag);
          } else if (!sel && oldTag) {
            oldTag.remove();
          }
        });
        const btn = container.querySelector('#mp-confirm-pick');
        if (btn) btn.disabled = ui.selected.length !== 2;
        const strong = container.querySelector('.mp-table strong');
        if (strong) {
          strong.textContent =
            ui.selected.map((i) => state.coords[i]).join(' + ') ||
            (lang === 'zh' ? '请点击 2 张暗牌' : 'Click 2 hidden cards');
        }
      });
    });

    container.querySelector('#mp-confirm-pick')?.addEventListener('click', () => {
      if (ui.selected.length !== 2) return;
      sfx.play('bid');
      const pair = [...ui.selected];
      ui.selected = [];
      dispatch({ type: 'SUBMIT_PICK', payload: { pair } });
    });

    container.querySelector('#mp-next-round')?.addEventListener('click', () => {
      sfx.play('click');
      dispatch({ type: 'NEXT_ROUND' });
    });

    // Smooth memory progress bar animation
    clearInterval(ui.barTimer);
    if (isMemorize) {
      ui.barTimer = setInterval(() => {
        const bar = document.getElementById('mp-mem-bar');
        if (!bar || !ui.lastCtx || ui.lastCtx.state.phase !== 'memorize') {
          clearInterval(ui.barTimer);
          return;
        }
        const elapsed = Date.now() - ui.lastCtx.state.phaseStartedAt;
        const pct = Math.max(0, 100 * (1 - elapsed / ui.lastCtx.state.memoryMs));
        bar.style.width = `${pct}%`;
      }, 100);
    }
  },
});
