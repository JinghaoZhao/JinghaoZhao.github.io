import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, RANK_LABELS, SUIT_META } from './rules.js';

const ui = {
  selected: [],
  lastRound: 0,
  lastPhase: '',
  barTimer: null,
  lastCtx: null,
};

function suitSvg(suit, className = '') {
  const paths = {
    S: '<path d="M12 2C9.5 6.4 4 10.1 4 14.3c0 2.5 1.9 4.2 4.1 4.2 1.4 0 2.6-.7 3.2-1.7-.1 1.7-.7 3.1-2.1 4.2h5.6c-1.4-1.1-2-2.5-2.1-4.2.6 1 1.8 1.7 3.2 1.7 2.2 0 4.1-1.7 4.1-4.2C20 10.1 14.5 6.4 12 2z"/>',
    H: '<path d="M12 21.2C11.5 20.8 3.5 14.9 3.5 8.8 3.5 5.6 5.9 3.2 8.7 3.2c1.6 0 2.8.8 3.3 2 .5-1.2 1.7-2 3.3-2 2.8 0 5.2 2.4 5.2 5.6 0 6.1-8 12-8.5 12.4z"/>',
    D: '<path d="M12 2L20.5 12 12 22 3.5 12 12 2z"/>',
    C: '<path d="M12 3a3.7 3.7 0 0 0-3.2 5.5 3.8 3.8 0 1 0-1.1 7.4c1.5 0 2.8-.8 3.5-2-.1 2-.7 3.8-2.2 5.1h6c-1.5-1.3-2.1-3.1-2.2-5.1.7 1.2 2 2 3.5 2a3.8 3.8 0 1 0-1.1-7.4A3.7 3.7 0 0 0 12 3z"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paths[suit] || paths.S}</svg>`;
}

const CROWN_SVG =
  '<svg class="mp-court-crown" viewBox="0 0 24 16" fill="currentColor" aria-hidden="true"><path d="M2 13L4 4l5 4 3-6 3 6 5-4 2 9H2zm1 2h18v1H3v-1z"/></svg>';

function cardText(card) {
  if (!card) return '?';
  const r = RANK_LABELS[card.rank] || String(card.rank);
  const sym = SUIT_META[card.suit]?.symbol || '';
  return `${r}${sym}`;
}

function renderCardFrontHtml(card, coordLabel, isCommunity = false) {
  if (!card) {
    return `<div class="mp-card-face mp-card-front ${isCommunity ? 'is-community-face' : ''}"></div>`;
  }
  const meta = SUIT_META[card.suit] || SUIT_META.S;
  const suitCls = meta.color === 'red' ? 'is-suit-red' : 'is-suit-black';
  const rLabel = RANK_LABELS[card.rank] || String(card.rank);

  let centerHtml = '';
  if (card.rank === 14) {
    centerHtml = `
      <div class="mp-center-art">
        <div class="mp-ace-halo">${suitSvg(card.suit, 'mp-center-pip')}</div>
      </div>
    `;
  } else if (card.rank >= 11) {
    centerHtml = `
      <div class="mp-center-art">
        <div class="mp-court-frame">
          ${CROWN_SVG}
          <span class="mp-court-letter">${rLabel}</span>
          ${suitSvg(card.suit, 'mp-court-suit')}
        </div>
      </div>
    `;
  } else {
    centerHtml = `
      <div class="mp-center-art">
        ${suitSvg(card.suit, 'mp-center-pip')}
      </div>
    `;
  }

  return `
    <div class="mp-card-face mp-card-front ${suitCls} ${isCommunity ? 'is-community-face' : ''}">
      <span class="mp-corner mp-corner-tl">
        <span class="mp-corner-rank">${rLabel}</span>
        ${suitSvg(card.suit, 'mp-corner-pip')}
      </span>
      ${coordLabel ? `<span class="mp-card-coord">${coordLabel}</span>` : ''}
      ${centerHtml}
      <span class="mp-corner mp-corner-br">
        <span class="mp-corner-rank">${rLabel}</span>
        ${suitSvg(card.suit, 'mp-corner-pip')}
      </span>
    </div>
  `;
}

function renderMiniCardHtml(card, isPicked = false) {
  const meta = SUIT_META[card.suit] || SUIT_META.S;
  const suitCls = meta.color === 'red' ? 'is-suit-red' : 'is-suit-black';
  const rLabel = RANK_LABELS[card.rank] || String(card.rank);
  return `
    <span class="mp-mini-card ${suitCls} ${isPicked ? 'is-picked' : ''}" title="${cardText(card)}">
      <span>${rLabel}</span>
      ${suitSvg(card.suit, 'mp-mini-suit')}
    </span>
  `;
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
      {
        key: 'includeFlushes',
        label: { zh: '启用同花 / 同花顺牌型 (完整 9 级德州)', en: 'Enable Flush & Straight Flush (Full 9-Tier)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 游戏流程
1. **标准 52 张传统红黑扑克（♠ ♥ ♣ ♦）**：每局从完整 52 张牌库中不重复发出 **16 张网格牌（4×4）+ 3 张公共牌**。
2. **20 秒极限记忆**：牌桌中央 16 张传统红黑扑克牌正面展示 **20 秒**，牢记每个坐标的点数与花色。
3. **翻面与公共牌揭晓**：倒计时结束，16 张牌齐齐翻面扣下，桌面正上方亮出 **3 张公共牌**。
4. **盲选 2 张**：每位选手凭记忆秘密选定 2 个不同位置（不同玩家可重复选同一张牌），与 3 张公共牌组成 5 张扑克牌型。
5. **牌型大小**：
   - **默认 S3 剧集 7 级规则**（花色用于唯一辨识 52 张牌，计分不含同花）：**四条 > 葫芦 > 顺子 > 三条 > 两对 > 一对 > 高牌**。
   - 亦可在房间选项中开启 **「启用同花 / 同花顺」** 升级为完整 9 级德州扑克（皇家同花顺 / 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌）。
   - 按每局排名发放胜点（前 25% +5 分、前 50% +3 分、其余 +1 分）。`,
      en: `### Round Flow
1. **Standard 52-Card Red/Black Deck (♠ ♥ ♣ ♦)**: Every round deals **16 unique grid cards (4×4) + 3 unique Community Cards** with zero duplicates.
2. **20-Second Memory Flash**: All 16 traditional red/black playing cards face up for **20 seconds**. Memorize every slot!
3. **Flip & Community Reveal**: All 16 cards flip face-down in unison while **3 spotlighted Community Cards** reveal overhead.
4. **Blind 2-Card Selection**: Secretly pick **2 distinct slots** (players may pick overlapping slots) to combine with the 3 community cards.
5. **Hand Rankings**:
   - **Show Default (7-Tier S3 Rules)**: Traditional suits identify every card in the 52-card deck while S3 scoring ignores flushes (**Four of a Kind > Full House > Straight > Three of a Kind > Two Pair > One Pair > High Card**).
   - Toggle **Enable Flush & Straight Flush** in lobby options for full **9-Tier Texas Hold'em** (adds Royal/Straight Flush & Flush).
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
    const includeFlushes = Boolean(state.options?.includeFlushes);

    const pickedCount = state.seats.filter((s) => Boolean(state.picks[s.seatId])).length;
    const phaseTitle = isMemorize
      ? (lang === 'zh' ? '记忆阶段 · 死记 16 张扑克！' : 'MEMORIZE · STUDY ALL 16 CARDS!')
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
                .map((card, i) => {
                  const facedown = card == null;
                  return `
                    <div class="mp-card-slot is-community">
                      <div class="mp-card ${facedown ? 'is-facedown' : ''}">
                        ${renderCardFrontHtml(card, `C${i + 1}`, true)}
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
              .map((card, idx) => {
                const facedown = isSelect;
                const isSel = activePick.includes(idx);
                const isOpt = isShowdown && optPair.includes(idx);
                const canClick = isSelect && mySeatId && !myLockedPick;
                return `
                  <div class="mp-card-slot ${isSel ? 'is-selected' : ''} ${isOpt ? 'is-optimal' : ''}">
                    <div class="mp-card ${facedown ? 'is-facedown' : ''} ${canClick ? 'is-clickable' : ''}" data-slot="${idx}">
                      ${renderCardFrontHtml(card, state.coords[idx], false)}
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
                      ? `已选位置 (${ui.selected.length}/2)：<strong id="mp-sel-readout" style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || '请点击 2 张暗牌'}</strong>`
                      : `Selected (${ui.selected.length}/2): <strong id="mp-sel-readout" style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || 'Click 2 hidden cards'}</strong>`}
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
                : (lang === 'zh' ? '参赛者积分与状态' : 'STANDINGS & STATUS')}
            </div>

            ${
              isShowdown && state.roundResults
                ? `
                  ${
                    state.optimal
                      ? `<div style="margin-top:10px;padding:9px 11px;border-radius:10px;border:1px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.09);font-size:12px;">
                          <strong style="color:#7dd3fc;">✦ ${lang === 'zh' ? '牌桌理论最强解' : 'THEORETICAL BEST HAND'}:</strong>
                          ${UI.escapeHtml(state.optimal.eval.name[lang] || state.optimal.eval.name.en)}
                          (${state.optimal.pair.map((i) => `${state.coords[i]}[${cardText(state.grid[i])}]`).join(' + ')})
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
                                ${state.community.map((c) => renderMiniCardHtml(c, false)).join('')}
                                ${entry.pickedCards.map((c) => renderMiniCardHtml(c, true)).join('')}
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
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
              <span style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
                ${includeFlushes
                  ? (lang === 'zh' ? '9 级完整扑克牌型 (含同花)' : '9-TIER POKER RANKING (FLUSHES ON)')
                  : (lang === 'zh' ? 'S3 剧集 7 级牌型 (不含同花)' : 'S3 7-TIER RANKING (NO FLUSH)')}
              </span>
            </div>
            <div class="mp-hand-ladder">
              ${
                includeFlushes
                  ? `
                    <span>1. ${lang === 'zh' ? '同花顺 (含皇家)' : 'Straight Flush'}</span>
                    <span>2. ${lang === 'zh' ? '四条 (AAAA+X)' : 'Four of a Kind'}</span>
                    <span>3. ${lang === 'zh' ? '葫芦 (AAA+BB)' : 'Full House'}</span>
                    <span>4. ${lang === 'zh' ? '同花 (5张同花色)' : 'Flush'}</span>
                    <span>5. ${lang === 'zh' ? '顺子 (5连张)' : 'Straight'}</span>
                    <span>6. ${lang === 'zh' ? '三条 (AAA)' : 'Three of a Kind'}</span>
                    <span>7. ${lang === 'zh' ? '两对 (AA+BB)' : 'Two Pair'}</span>
                    <span>8. ${lang === 'zh' ? '一对 (AA)' : 'One Pair'}</span>
                    <span>9. ${lang === 'zh' ? '高牌 (最大单张)' : 'High Card'}</span>
                  `
                  : `
                    <span>1. ${lang === 'zh' ? '四条 (AAAA+X)' : 'Four of a Kind'}</span>
                    <span>2. ${lang === 'zh' ? '葫芦 (AAA+BB)' : 'Full House'}</span>
                    <span>3. ${lang === 'zh' ? '顺子 (5连张)' : 'Straight'}</span>
                    <span>4. ${lang === 'zh' ? '三条 (AAA)' : 'Three of a Kind'}</span>
                    <span>5. ${lang === 'zh' ? '两对 (AA+BB)' : 'Two Pair'}</span>
                    <span>6. ${lang === 'zh' ? '一对 (AA)' : 'One Pair'}</span>
                    <span>7. ${lang === 'zh' ? '高牌 (最大单张)' : 'High Card'}</span>
                  `
              }
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
        const readout = container.querySelector('#mp-sel-readout');
        if (readout) {
          readout.textContent =
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
