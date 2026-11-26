import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, RANK_LABELS, SUIT_META } from './rules.js';

const ui = {
  selected: [],
  lastRound: 0,
  lastPhase: '',
  barTimer: null,
  lastCtx: null,
  delegated: false,
};

function suitSvg(suit, className = '', glossyId = null) {
  const paths = {
    S: 'M12 1.8C9.2 6.5 3.6 10.3 3.6 14.6c0 2.7 2 4.5 4.4 4.5 1.5 0 2.7-.8 3.3-1.8-.1 1.8-.7 3.3-2.2 4.5h5.8c-1.5-1.2-2.1-2.7-2.2-4.5.6 1 1.8 1.8 3.3 1.8 2.4 0 4.4-1.8 4.4-4.5 0-4.3-5.6-8.1-8.4-12.8z',
    H: 'M12 21.6C11.4 21.1 3 15 3 8.6 3 5.2 5.6 2.7 8.6 2.7c1.7 0 2.9.9 3.4 2.2.5-1.3 1.7-2.2 3.4-2.2 3 0 5.6 2.5 5.6 5.9 0 6.4-8.4 12.5-9 13z',
    D: 'M12 1.6L21 12 12 22.4 3 12 12 1.6z',
    C: 'M12 2.4a3.9 3.9 0 0 0-3.3 5.9 4 4 0 1 0-1.2 7.8c1.6 0 2.9-.8 3.7-2.1-.1 2.1-.8 4-2.4 5.4h6.4c-1.6-1.4-2.3-3.3-2.4-5.4.8 1.3 2.1 2.1 3.7 2.1a4 4 0 1 0-1.2-7.8 3.9 3.9 0 0 0-3.3-5.9z',
  };
  const d = paths[suit] || paths.S;
  if (!glossyId) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  const isRed = suit === 'H' || suit === 'D';
  const c1 = isRed ? '#f42c44' : '#2c3344';
  const c2 = isRed ? '#b31227' : '#090b10';
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id="${glossyId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <path d="${d}" fill="url(#${glossyId})"/>
  </svg>`;
}

const ROYAL_WATERMARK_SVG = `
  <svg class="mp-royal-watermark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 4L58 32L32 60L6 32Z" stroke="currentColor" stroke-width="1.6"/>
    <path d="M32 12L50 32L32 52L14 32Z" stroke="currentColor" stroke-width="1.1"/>
    <path d="M22 25L26 17L32 22L38 17L42 25H22Z" fill="currentColor"/>
  </svg>
`;

const CARD_BACK_FILIGREE_SVG = `
  <svg class="mp-back-svg" viewBox="0 0 120 144" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <rect x="6" y="6" width="108" height="132" rx="8" stroke="rgba(212,175,106,0.45)" stroke-width="1.2"/>
    <rect x="11" y="11" width="98" height="122" rx="5" stroke="rgba(212,175,106,0.22)" stroke-width="0.9"/>
    <path d="M60 16L104 72L60 128L16 72Z" stroke="rgba(212,175,106,0.28)" stroke-width="1.1"/>
    <path d="M60 28L93 72L60 116L27 72Z" stroke="rgba(212,175,106,0.18)" stroke-width="0.9"/>
    <path d="M16 24L32 16M104 24L88 16M16 120L32 128M104 120L88 128" stroke="rgba(242,213,145,0.45)" stroke-width="1.2"/>
    <circle cx="18" cy="18" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="102" cy="18" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="18" cy="126" r="2" fill="rgba(242,213,145,0.55)"/>
    <circle cx="102" cy="126" r="2" fill="rgba(242,213,145,0.55)"/>
  </svg>
`;

function cardText(card) {
  if (!card) return '?';
  const r = RANK_LABELS[card.rank] || String(card.rank);
  const sym = SUIT_META[card.suit]?.symbol || '';
  return `${r}${sym}`;
}

function renderCardFrontHtml(card, coordLabel, stableKey, isCommunity = false) {
  if (!card) {
    return `<div class="mp-card-face mp-card-front ${isCommunity ? 'is-community-face' : ''}" data-motion-key="${stableKey}-f"></div>`;
  }
  const meta = SUIT_META[card.suit] || SUIT_META.S;
  const suitCls = meta.color === 'red' ? 'is-suit-red' : 'is-suit-black';
  const rLabel = RANK_LABELS[card.rank] || String(card.rank);
  const isRoyalOrAce = card.rank >= 11;

  return `
    <div class="mp-card-face mp-card-front ${suitCls} ${isCommunity ? 'is-community-face' : ''}" data-motion-key="${stableKey}-f">
      <div class="mp-jumbo-index">
        <span class="mp-jumbo-rank">${rLabel}</span>
        ${suitSvg(card.suit, 'mp-jumbo-pip', null)}
      </div>
      ${isRoyalOrAce ? ROYAL_WATERMARK_SVG : ''}
      <div class="mp-hero-suit-wrap">
        ${suitSvg(card.suit, 'mp-hero-suit', `mp-sg-${stableKey}`)}
      </div>
      ${coordLabel && !isCommunity ? `<span class="mp-card-coord">${coordLabel}</span>` : ''}
    </div>
  `;
}

function renderCardBackHtml(label, stableKey) {
  return `
    <div class="mp-card-face mp-card-back" data-motion-key="${stableKey}-b">
      ${CARD_BACK_FILIGREE_SVG}
      <span class="mp-back-crest">${label}</span>
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
      ${suitSvg(card.suit, 'mp-mini-suit', null)}
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
2. **20 秒极限记忆**：牌桌中央 16 张大字号红黑扑克牌正面展示 **20 秒**，牢记每个坐标的点数与花色。
3. **翻面与公共牌揭晓**：倒计时结束，16 张牌齐齐翻面扣下，桌面正上方亮出 **3 张公共牌**。
4. **盲选 2 张**：每位选手凭记忆秘密选定 2 个不同位置（不同玩家可重复选同一张牌），与 3 张公共牌组成 5 张扑克牌型。
5. **牌型大小**：
   - **默认 S3 剧集 7 级规则**（花色用于唯一辨识 52 张牌，计分不含同花）：**四条 > 葫芦 > 顺子 > 三条 > 两对 > 一对 > 高牌**。
   - 亦可在房间选项中开启 **「启用同花 / 同花顺」** 升级为完整 9 级德州扑克。
   - 按每局排名发放胜点（前 25% +5 分、前 50% +3 分、其余 +1 分）。`,
      en: `### Round Flow
1. **Standard 52-Card Red/Black Deck (♠ ♥ ♣ ♦)**: Every round deals **16 unique grid cards (4×4) + 3 unique Community Cards** with zero duplicates.
2. **20-Second Memory Flash**: All 16 jumbo-index red/black playing cards face up for **20 seconds**. Memorize every slot!
3. **Flip & Community Reveal**: All 16 cards flip face-down in unison while **3 spotlighted Community Cards** reveal overhead.
4. **Blind 2-Card Selection**: Secretly pick **2 distinct slots** (players may pick overlapping slots) to combine with the 3 community cards.
5. **Hand Rankings**:
   - **Show Default (7-Tier S3 Rules)**: Traditional suits identify every card in the 52-card deck while S3 scoring ignores flushes (**Four of a Kind > Full House > Straight > Three of a Kind > Two Pair > One Pair > High Card**).
   - Toggle **Enable Flush & Straight Flush** in lobby options for full **9-Tier Texas Hold'em**.
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
      ? (lang === 'zh' ? '记忆阶段 · 死记 16 张扑克' : 'MEMORIZE · STUDY ALL 16 CARDS')
      : isSelect
      ? (lang === 'zh' ? '盲选阶段 · 选 2 张配公共牌' : 'BLIND PICK · SELECT 2 SLOTS')
      : (lang === 'zh' ? '亮牌决胜 · SHOWDOWN' : 'SHOWDOWN REVEAL');

    const optPair = isShowdown && state.optimal ? state.optimal.pair : [];

    const html = `
      <div class="mp-arena" data-motion-key="mp-arena">
        <section class="mp-table ${isSelect ? 'is-darkened' : ''}" data-motion-key="mp-table">
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
                ? `<span class="dp-tabular" style="font-size:12px;color:var(--dp-ink-muted);font-family:var(--dp-font-mono);">
                    ${pickedCount}/${state.seats.length} ${lang === 'zh' ? '已锁定' : 'LOCKED'}
                   </span>`
                : ''
            }
          </div>

          ${
            isMemorize
              ? `<div class="mp-mem-bar-wrap" data-motion-key="mp-mem-wrap"><div class="mp-mem-bar-fill" id="mp-mem-bar"></div></div>`
              : ''
          }

          <div class="mp-community-zone" data-motion-key="mp-comm-zone">
            <div class="mp-community-meta">
              <span class="mp-community-label">✦ ${lang === 'zh' ? '公共牌 (3)' : 'COMMUNITY (3)'}</span>
              <span class="mp-community-sub">
                ${isMemorize ? (lang === 'zh' ? '翻面后揭晓' : 'Reveals after flip') : (lang === 'zh' ? '与盲选 2 张凑 5 张' : 'Combine + 2 picks')}
              </span>
            </div>
            <div class="mp-community-row">
              ${state.community
                .map((card, i) => {
                  const facedown = card == null;
                  const cKey = `comm-${i}`;
                  return `
                    <div class="mp-card-slot is-community" data-motion-key="slot-${cKey}">
                      <div class="mp-card ${facedown ? 'is-facedown' : ''}" data-motion-key="${cKey}">
                        ${renderCardFrontHtml(card, '', cKey, true)}
                        ${renderCardBackHtml('?', cKey)}
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="mp-grid" data-motion-key="mp-grid">
            ${state.grid
              .map((card, idx) => {
                const facedown = isSelect;
                const isSel = activePick.includes(idx);
                const isOpt = isShowdown && optPair.includes(idx);
                const canClick = isSelect && mySeatId && !myLockedPick;
                const gKey = `card-${idx}`;
                return `
                  <div class="mp-card-slot ${isSel ? 'is-selected' : ''} ${isOpt ? 'is-optimal' : ''}" data-motion-key="slot-${gKey}">
                    <div class="mp-card ${facedown ? 'is-facedown' : ''} ${canClick ? 'is-clickable' : ''}" data-motion-key="${gKey}" data-slot="${idx}">
                      ${renderCardFrontHtml(card, state.coords[idx], gKey, false)}
                      ${renderCardBackHtml(state.coords[idx], gKey)}
                    </div>
                    ${isSel ? `<span class="mp-pick-tag" data-motion-key="tag-${idx}">${lang === 'zh' ? '已选' : 'PICK'}</span>` : ''}
                    ${isOpt && !isSel ? `<span class="mp-pick-tag is-opt" data-motion-key="opt-${idx}">MAX</span>` : ''}
                  </div>
                `;
              })
              .join('')}
          </div>

          ${
            isSelect && mySeatId && !myLockedPick
              ? `
                <div class="mp-action-bar" id="mp-action-bar" data-motion-key="mp-action-bar">
                  <span style="font-size:13px;color:var(--dp-ink-muted);">
                    ${lang === 'zh'
                      ? `已选位置 (${ui.selected.length}/2)：<strong id="mp-sel-readout" class="dp-tabular" style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || '请点击 2 张暗牌'}</strong>`
                      : `Selected (${ui.selected.length}/2): <strong id="mp-sel-readout" class="dp-tabular" style="color:var(--dp-brass-bright);font-family:var(--dp-font-mono);">${ui.selected.map((i) => state.coords[i]).join(' + ') || 'Click 2 hidden cards'}</strong>`}
                  </span>
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="mp-confirm-pick" ${ui.selected.length !== 2 ? 'disabled' : ''}>
                    ${lang === 'zh' ? '锁定 2 张暗牌 →' : 'Lock 2 Cards →'}
                  </button>
                </div>
              `
              : isSelect && myLockedPick
              ? `<div style="text-align:center;font-size:12.5px;color:var(--dp-emerald);padding:4px;" data-motion-key="mp-locked-note">
                  ✓ ${lang === 'zh'
                    ? `已锁定位置 ${myLockedPick.map((i) => state.coords[i]).join(' & ')}，等待其他选手提交...`
                    : `Locked ${myLockedPick.map((i) => state.coords[i]).join(' & ')} — waiting for other players...`}
                 </div>`
              : ''
          }
        </section>

        <aside class="mp-side" data-motion-key="mp-side">
          <div class="mp-panel" data-motion-key="mp-standings-panel">
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
                      ? `<div style="margin-top:9px;padding:8px 10px;border-radius:10px;border:1px solid var(--dp-cyan);background:rgba(56,189,248,0.10);font-size:12px;">
                          <strong style="color:var(--dp-cyan);">✦ ${lang === 'zh' ? '牌桌理论最强解' : 'THEORETICAL BEST'}:</strong>
                          ${UI.escapeHtml(state.optimal.eval.name[lang] || state.optimal.eval.name.en)}
                          (${state.optimal.pair.map((i) => `${state.coords[i]}[${cardText(state.grid[i])}]`).join(' + ')})
                         </div>`
                      : ''
                  }
                  <div class="mp-showdown-list" id="mp-stand-list">
                    ${state.roundResults
                      .map((entry) => {
                        const isMe = entry.seatId === mySeatId;
                        return `
                          <div class="mp-showdown-row ${entry.rank === 1 ? 'is-winner' : ''} ${isMe ? 'is-me' : ''}" data-motion-key="mp-sd-${UI.escapeHtml(entry.seatId)}">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                              <span style="font-size:13px;font-weight:700;">
                                <strong style="color:var(--dp-brass);margin-right:6px;">#${entry.rank}</strong>
                                ${UI.escapeHtml(nameOf(entry.seatId))}
                              </span>
                              <span class="dp-tabular" style="font-family:var(--dp-font-mono);font-size:12px;color:var(--dp-emerald);">
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
                      ? `<button type="button" class="dp-btn dp-btn-primary" id="mp-next-round" style="width:100%;margin-top:12px;min-height:44px;">
                          ${state.round >= state.totalRounds
                            ? (lang === 'zh' ? '查看最终排名 →' : 'Final Verdict →')
                            : (lang === 'zh' ? `进入第 ${state.round + 1} 局 →` : `Next Round (${state.round + 1}/${state.totalRounds}) →`)}
                         </button>`
                      : ''
                  }
                `
                : `
                  <div id="mp-stand-list" style="display:flex;flex-direction:column;gap:6px;margin-top:9px;">
                    ${[...state.seats]
                      .sort((a, b) => (state.scores[b.seatId] || 0) - (state.scores[a.seatId] || 0))
                      .map((s) => {
                        const locked = Boolean(state.picks[s.seatId]);
                        return `
                          <div class="mp-stand-row ${s.seatId === mySeatId ? 'is-me' : ''}" data-motion-key="mp-st-${UI.escapeHtml(s.seatId)}">
                            <span><strong style="color:var(--dp-brass);margin-right:5px;">${UI.escapeHtml(s.avatar || '◆')}</strong>${UI.escapeHtml(s.name)}</span>
                            <span style="display:flex;align-items:center;gap:8px;">
                              ${isSelect ? `<span style="font-size:11px;color:${locked ? 'var(--dp-emerald)' : 'var(--dp-ink-faint)'};">${locked ? '✓' : '...'}</span>` : ''}
                              <strong class="dp-tabular" style="font-family:var(--dp-font-mono);color:var(--dp-brass-bright);">${state.scores[s.seatId] || 0}pt</strong>
                            </span>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                `
            }
          </div>

          <div class="mp-panel" data-motion-key="mp-ladder-panel">
            <div style="font-size:11px;letter-spacing:0.1em;color:var(--dp-brass);font-weight:700;">
              ${includeFlushes
                ? (lang === 'zh' ? '9 级完整扑克牌型 (含同花)' : '9-TIER POKER RANKING (FLUSHES ON)')
                : (lang === 'zh' ? 'S3 剧集 7 级牌型 (不含同花)' : 'S3 7-TIER RANKING (NO FLUSH)')}
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

    const listBefore = container.querySelector('#mp-stand-list');
    const prevRects = listBefore ? Motion.captureFlip(listBefore) : null;

    Motion.patchDOM(container, html);

    const listAfter = container.querySelector('#mp-stand-list');
    if (listAfter && prevRects && prevRects.size > 0) {
      Motion.playFlip(listAfter, prevRects);
    }

    if (!ui.delegated) {
      ui.delegated = true;

      Motion.delegate(container, 'click', '#mp-ready-mem', () => {
        ui.lastCtx?.sfx.play('click');
        ui.lastCtx?.dispatch({ type: 'READY_MEMORIZE' });
      }, 'mp-ready');

      Motion.delegate(container, 'click', '[data-slot]', (e, cardEl) => {
        const c = ui.lastCtx;
        if (!c || c.state.phase !== 'select' || !c.mySeatId) return;
        const locked = Array.isArray(c.state.picks[c.mySeatId]);
        if (locked) return;
        const idx = Number(cardEl.dataset.slot);
        const pos = ui.selected.indexOf(idx);
        if (pos >= 0) ui.selected.splice(pos, 1);
        else if (ui.selected.length < 2) ui.selected.push(idx);
        else {
          ui.selected.shift();
          ui.selected.push(idx);
        }
        c.sfx.play('click');
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
            tag.dataset.motionKey = `tag-${sIdx}`;
            tag.textContent = c.lang === 'zh' ? '已选' : 'PICK';
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
            ui.selected.map((i) => c.state.coords[i]).join(' + ') ||
            (c.lang === 'zh' ? '请点击 2 张暗牌' : 'Click 2 hidden cards');
        }
      }, 'mp-slot');

      Motion.delegate(container, 'click', '#mp-confirm-pick', async () => {
        const c = ui.lastCtx;
        if (!c) return;
        if (ui.selected.length !== 2) {
          Motion.shake(container.querySelector('#mp-action-bar'));
          return;
        }
        c.sfx.play('bid');
        const pair = [...ui.selected];
        ui.selected = [];
        const res = await c.dispatch({ type: 'SUBMIT_PICK', payload: { pair } });
        if (!res.ok) {
          Motion.shake(container.querySelector('#mp-action-bar'));
          if (res.reason) UI.toast(res.reason, 'error');
        }
      }, 'mp-confirm');

      Motion.delegate(container, 'click', '#mp-next-round', () => {
        ui.lastCtx?.sfx.play('click');
        ui.lastCtx?.dispatch({ type: 'NEXT_ROUND' });
      }, 'mp-next');
    }

    // Pure GPU scaleX memory bar update (never triggers layout!)
    clearInterval(ui.barTimer);
    if (isMemorize) {
      const updateBar = () => {
        const bar = document.getElementById('mp-mem-bar');
        if (!bar || !ui.lastCtx || ui.lastCtx.state.phase !== 'memorize') {
          clearInterval(ui.barTimer);
          return;
        }
        const elapsed = Date.now() - ui.lastCtx.state.phaseStartedAt;
        const ratio = Math.max(0, 1 - elapsed / ui.lastCtx.state.memoryMs);
        Motion.setProgress(bar, ratio);
      };
      updateBar();
      ui.barTimer = setInterval(updateBar, 100);
    }
  },
});
