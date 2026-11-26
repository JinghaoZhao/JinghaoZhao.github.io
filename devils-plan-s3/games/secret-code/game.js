import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, COLORS, SHAPES } from './rules.js';

const COLOR_HEX = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));

function renderShapeSvg(shape, colorHex, size = 18) {
  let inner = '';
  if (shape === 'circle') {
    inner = `<circle cx="12" cy="12" r="8" fill="${colorHex}" stroke="rgba(255,255,255,0.45)" stroke-width="1.4"/>`;
  } else if (shape === 'square') {
    inner = `<rect x="4.5" y="4.5" width="15" height="15" rx="2" fill="${colorHex}" stroke="rgba(255,255,255,0.45)" stroke-width="1.4"/>`;
  } else if (shape === 'triangle') {
    inner = `<polygon points="12,3.5 21,19.5 3,19.5" fill="${colorHex}" stroke="rgba(255,255,255,0.45)" stroke-width="1.4" stroke-linejoin="round"/>`;
  } else {
    inner = `<polygon points="12,2.5 14.9,8.7 21.7,9.5 16.6,14.1 18,20.8 12,17.4 6,20.8 7.4,14.1 2.3,9.5 9.1,8.7" fill="${colorHex}" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

// Persistent local deduction state (never wiped on AI bot updates!)
let currentMatchStart = 0;
let cardNotes = {}; // letter -> 0 | 1 (starred) | 2 (eliminated)
let checkedClues = {}; // clueId -> boolean
let codeInput = ['', '', '', ''];
let activeSlot = 0;
let filterColor = 'all';
let filterShape = 'all';
let noteMode = 'mark'; // 'mark' | 'fill'
let lockoutInterval = null;
let lastWrongTs = 0;
let lastSolvedTs = 0;
let latestCtx = null;
let latestContainer = null;

function resetLocalNotes(matchStart) {
  currentMatchStart = matchStart;
  cardNotes = {};
  checkedClues = {};
  codeInput = ['', '', '', ''];
  activeSlot = 0;
  filterColor = 'all';
  filterShape = 'all';
  noteMode = 'mark';
}

function getCanSubmit(ctx) {
  if (!ctx) return false;
  const { state } = ctx;
  const me = state.myState;
  const ended = state.phase === 'ended';
  const lockoutRemMs = me ? Math.max(0, (me.lockoutUntilMs || 0) - Date.now()) : 0;
  return Boolean(me && !me.finished && !ended && lockoutRemMs <= 0);
}

function snapshotIndicator(container, selector) {
  const el = container.querySelector(selector);
  if (!el) return { cls: 'dp-sliding-indicator', style: '' };
  return { cls: el.className, style: el.getAttribute('style') || '' };
}

function ensureDelegation(container) {
  Motion.delegate(container, 'click', '#sc-mode-mark', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    noteMode = 'mark';
    renderSecretCode(container, latestCtx);
  }, 'sc-mode-mark');

  Motion.delegate(container, 'click', '#sc-mode-fill', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    noteMode = 'fill';
    renderSecretCode(container, latestCtx);
  }, 'sc-mode-fill');

  Motion.delegate(container, 'click', '[data-fcolor]', (e, btn) => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    filterColor = btn.dataset.fcolor;
    renderSecretCode(container, latestCtx);
  }, 'sc-fcolor');

  Motion.delegate(container, 'click', '[data-fshape]', (e, btn) => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    filterShape = btn.dataset.fshape;
    renderSecretCode(container, latestCtx);
  }, 'sc-fshape');

  Motion.delegate(container, 'click', '#sc-clear-notes', () => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    cardNotes = {};
    filterColor = 'all';
    filterShape = 'all';
    renderSecretCode(container, latestCtx);
  }, 'sc-clr-notes');

  Motion.delegate(container, 'click', '[data-card-letter]', (e, el) => {
    const ctx = latestCtx;
    if (!ctx) return;
    const ch = el.dataset.cardLetter;
    ctx.sfx.play('click');
    if (noteMode === 'fill' && getCanSubmit(ctx)) {
      const dupIdx = codeInput.indexOf(ch);
      if (dupIdx !== -1 && dupIdx !== activeSlot) codeInput[dupIdx] = '';
      codeInput[activeSlot] = ch;
      activeSlot = (activeSlot + 1) % 4;
    } else {
      cardNotes[ch] = ((cardNotes[ch] || 0) + 1) % 3;
    }
    renderSecretCode(container, ctx);
  }, 'sc-card-click');

  Motion.delegate(container, 'contextmenu', '[data-card-letter]', (e, el) => {
    e.preventDefault();
    const ctx = latestCtx;
    if (!ctx || !getCanSubmit(ctx)) return;
    const ch = el.dataset.cardLetter;
    ctx.sfx.play('click');
    const dupIdx = codeInput.indexOf(ch);
    if (dupIdx !== -1 && dupIdx !== activeSlot) codeInput[dupIdx] = '';
    codeInput[activeSlot] = ch;
    activeSlot = (activeSlot + 1) % 4;
    renderSecretCode(container, ctx);
  }, 'sc-card-ctx');

  Motion.delegate(container, 'click', '[data-clue-id]', (e, el) => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    const cid = Number(el.dataset.clueId);
    checkedClues[cid] = !checkedClues[cid];
    renderSecretCode(container, latestCtx);
  }, 'sc-clue');

  Motion.delegate(container, 'click', '[data-tumbler]', (e, el) => {
    if (!latestCtx) return;
    latestCtx.sfx.play('click');
    activeSlot = Number(el.dataset.tumbler);
    noteMode = 'fill';
    renderSecretCode(container, latestCtx);
  }, 'sc-tumbler');

  Motion.delegate(container, 'click', '#sc-clear-code', () => {
    if (!latestCtx || !getCanSubmit(latestCtx)) return;
    latestCtx.sfx.play('click');
    codeInput = ['', '', '', ''];
    activeSlot = 0;
    renderSecretCode(container, latestCtx);
  }, 'sc-clr-code');

  Motion.delegate(container, 'click', '#sc-buzzer-submit', () => {
    const ctx = latestCtx;
    if (!ctx || !getCanSubmit(ctx)) return;
    const ready = codeInput.every((ch) => /^[A-Z]$/.test(ch)) && new Set(codeInput).size === 4;
    if (!ready) {
      Motion.shake(container.querySelector('#sc-tumbler-row'));
      ctx.sfx.play('error');
      return;
    }
    ctx.sfx.play('bid');
    ctx.dispatch({ type: 'SUBMIT_CODE', payload: { code: codeInput.slice() } });
  }, 'sc-submit');

  Motion.delegate(container, 'click', '#sc-give-up', async () => {
    const ctx = latestCtx;
    if (!ctx) return;
    const isZh = ctx.lang === 'zh';
    const ok = await ctx.ui.confirm(
      isZh ? '确认放弃并揭晓密码？' : 'Surrender & Reveal Code?',
      isZh ? '将结束当前挑战并揭晓唯一正确答案。' : 'Ends the challenge and reveals the unique secret code.'
    );
    if (ok) ctx.dispatch({ type: 'GIVE_UP', payload: {} });
  }, 'sc-giveup');

  if (!window._scKeyHandlerBound) {
    window._scKeyHandlerBound = true;
    window.addEventListener('keydown', (e) => {
      const ctx = latestCtx;
      if (!ctx || !latestContainer || !getCanSubmit(ctx)) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        ctx.sfx.play('click');
        const dup = codeInput.indexOf(key);
        if (dup !== -1 && dup !== activeSlot) codeInput[dup] = '';
        codeInput[activeSlot] = key;
        activeSlot = (activeSlot + 1) % 4;
        renderSecretCode(latestContainer, ctx);
      } else if (e.key === 'Backspace') {
        ctx.sfx.play('click');
        if (codeInput[activeSlot]) {
          codeInput[activeSlot] = '';
        } else {
          activeSlot = (activeSlot + 3) % 4;
          codeInput[activeSlot] = '';
        }
        renderSecretCode(latestContainer, ctx);
      } else if (e.key === 'Enter') {
        const ready = codeInput.every((ch) => /^[A-Z]$/.test(ch)) && new Set(codeInput).size === 4;
        if (ready) {
          ctx.sfx.play('bid');
          ctx.dispatch({ type: 'SUBMIT_CODE', payload: { code: codeInput.slice() } });
        } else {
          Motion.shake(latestContainer.querySelector('#sc-tumbler-row'));
          ctx.sfx.play('error');
        }
      }
    });
  }
}

function renderSecretCode(container, ctx) {
  latestCtx = ctx;
  latestContainer = container;
  ensureDelegation(container);

  const { state, mySeatId, lang, sfx, ui, lastEvent } = ctx;
  const isZh = lang === 'zh';
  const me = state.myState;
  const ended = state.phase === 'ended';

  if (state.startedAtMs && state.startedAtMs !== currentMatchStart) {
    resetLocalNotes(state.startedAtMs);
  }

  let shouldShakeTumblers = false;
  if (lastEvent?.type === 'CODE_WRONG' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastWrongTs) {
    lastWrongTs = lastEvent.ts;
    sfx.play('error');
    shouldShakeTumblers = true;
    ui.toast(
      isZh
        ? `密码 ${lastEvent.code} 错误！抢答铃锁定 ${Math.round(lastEvent.lockoutMs / 1000)} 秒`
        : `Wrong code ${lastEvent.code}! Buzzer locked for ${Math.round(lastEvent.lockoutMs / 1000)}s`,
      'error'
    );
  }
  if (lastEvent?.type === 'CODE_SOLVED' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastSolvedTs) {
    lastSolvedTs = lastEvent.ts;
    sfx.play('victory');
  }

  const now = Date.now();
  const lockoutRemMs = me ? Math.max(0, (me.lockoutUntilMs || 0) - now) : 0;
  const isLockedOut = lockoutRemMs > 0 && !ended && !me?.finished;

  clearInterval(lockoutInterval);
  if (isLockedOut) {
    lockoutInterval = setInterval(() => {
      const el = container.querySelector('#sc-lock-sec');
      const rem = Math.max(0, (me.lockoutUntilMs || 0) - Date.now());
      if (rem <= 0) {
        clearInterval(lockoutInterval);
        if (latestCtx) renderSecretCode(container, latestCtx);
      } else if (el) {
        el.textContent = `${(rem / 1000).toFixed(1)}s`;
      }
    }, 150);
  }

  const deckByLetter = Object.fromEntries(state.deck.map((c) => [c.letter, c]));
  const totalRacers = state.racers.length;
  const canSubmit = Boolean(me && !me.finished && !ended && !isLockedOut);

  // Preserve sliding indicator states across patchDOM so clip-path transitions smoothly!
  const indColor = snapshotIndicator(container, '#sc-color-track > .dp-sliding-indicator');
  const indShape = snapshotIndicator(container, '#sc-shape-track > .dp-sliding-indicator');

  const racersHtml = state.racers
    .map((r) => {
      const isMe = r.seatId === mySeatId;
      const cls = [
        'sc-racer-card',
        isMe ? 'is-me' : '',
        r.status === 'survived' ? 'is-survived' : '',
        r.status === 'eliminated' ? 'is-eliminated' : '',
      ].filter(Boolean).join(' ');
      const stat = r.finished && r.finishTimeMs != null
        ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
        : r.wrongCount > 0
        ? `${r.progress}% (${r.wrongCount}✕)`
        : `${r.progress}%`;
      const ratio = Math.max(0, Math.min(1, r.progress / 100));
      return `
        <div class="${cls}" data-motion-key="racer-${UI.escapeHtml(r.seatId)}">
          <div class="sc-racer-top">
            <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
            <span class="sc-racer-stat dp-tabular">${UI.escapeHtml(stat)}</span>
          </div>
          <div class="sc-bar-track"><div class="sc-bar-fill" data-ratio="${ratio.toFixed(4)}" style="transform-origin: left center; transform: scaleX(${ratio.toFixed(4)});"></div></div>
        </div>
      `;
    })
    .join('');

  const cardsHtml = state.deck
    .map((c) => {
      const note = cardNotes[c.letter] || 0;
      const matchesFilter =
        (filterColor === 'all' || c.color === filterColor) &&
        (filterShape === 'all' || c.shape === filterShape);
      const inCode = codeInput.includes(c.letter);
      const hex = COLOR_HEX[c.color];
      const cls = [
        'sc-glyph-card',
        note === 1 ? 'is-starred' : '',
        note === 2 ? 'is-eliminated' : '',
        !matchesFilter ? 'is-filtered-out' : '',
        inCode ? 'is-in-code' : '',
      ].filter(Boolean).join(' ');
      return `
        <div class="${cls}" data-motion-key="card-${c.letter}" data-card-letter="${c.letter}" style="border-top:3px solid ${hex};">
          ${note === 1 ? '<span class="sc-star-tag" data-motion-key="star-' + c.letter + '">★</span>' : ''}
          <span class="sc-card-letter">${c.letter}</span>
          <div class="sc-card-meta">
            ${renderShapeSvg(c.shape, hex, 16)}
            <span class="sc-card-num dp-tabular">${c.num}</span>
          </div>
        </div>
      `;
    })
    .join('');

  const cluesHtml = state.clues
    .map((cl) => {
      const checked = Boolean(checkedClues[cl.id]);
      return `
        <div class="sc-clue-item ${checked ? 'is-checked' : ''}" data-motion-key="clue-${cl.id}" data-clue-id="${cl.id}">
          <span class="sc-clue-idx dp-tabular">${checked ? '✓' : cl.id}</span>
          <span>${UI.escapeHtml(isZh ? cl.text.zh : cl.text.en)}</span>
        </div>
      `;
    })
    .join('');

  const tumblersHtml = [0, 1, 2, 3]
    .map((idx) => {
      const ch = codeInput[idx];
      const card = ch ? deckByLetter[ch] : null;
      return `
        <div class="sc-tumbler ${activeSlot === idx ? 'is-active' : ''}" data-motion-key="tumbler-${idx}" data-tumbler="${idx}">
          <span class="sc-tumbler-pos dp-tabular">#${idx + 1}</span>
          <span class="sc-tumbler-val">${ch || '·'}</span>
          <span class="sc-tumbler-sub dp-tabular">
            ${card ? `${card.num} · ${renderShapeSvg(card.shape, COLOR_HEX[card.color], 12)}` : (isZh ? '空位' : 'EMPTY')}
          </span>
        </div>
      `;
    })
    .join('');

  const codeReady = codeInput.every((ch) => /^[A-Z]$/.test(ch)) && new Set(codeInput).size === 4;

  const colorPills = [
    { id: 'all', label: isZh ? '全色' : 'All Colors' },
    ...COLORS.map((c) => ({ id: c.id, label: isZh ? c.zh : c.en, hex: c.hex })),
  ]
    .map(
      (item) => `
      <button type="button" class="sc-filter-pill ${filterColor === item.id ? 'is-active' : ''}" data-motion-key="fc-${item.id}" data-fcolor="${item.id}">
        ${item.hex ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.hex};margin-right:4px;"></span>` : ''}${UI.escapeHtml(item.label)}
      </button>
    `
    )
    .join('');

  const shapePills = [
    { id: 'all', label: isZh ? '全形' : 'All Shapes' },
    ...SHAPES.map((s) => ({ id: s.id, label: isZh ? s.zh : s.en })),
  ]
    .map(
      (item) => `
      <button type="button" class="sc-filter-pill ${filterShape === item.id ? 'is-active' : ''}" data-motion-key="fs-${item.id}" data-fshape="${item.id}">
        ${UI.escapeHtml(item.label)}
      </button>
    `
    )
    .join('');

  const attemptsHtml = (me?.attempts || [])
    .map(
      (a, idx) => `
      <div class="sc-attempt-row" data-motion-key="att-${a.ts || idx}">
        <span>${UI.escapeHtml(a.code)}</span>
        <span style="color:${a.correct ? 'var(--dp-emerald)' : 'var(--dp-crimson-bright)'};">${a.correct ? (isZh ? '✓ 正确' : '✓ MATCH') : (isZh ? '✕ 错误' : '✕ REJECTED')}</span>
      </div>
    `
    )
    .join('');

  const html = `
    <div class="sc-root" data-motion-key="sc-root">
      <section class="sc-temple-banner" data-motion-key="sc-banner">
        <div class="sc-race-header">
          <div class="sc-race-title">
            <span class="sc-torch-dot"></span>
            <span>${isZh ? '流放地解码台 · 秘密密码抢答' : 'EXILE DECRYPTION · SECRET CODE RACE'}</span>
          </div>
          <div style="font-size:12px;color:var(--dp-ink-muted);">
            ${totalRacers === 1
              ? (isZh ? '单人推理 · 唯一 4 字母密码' : 'Solo Deduction · Unique 4-Letter Code')
              : (isZh ? `前 ${totalRacers - 1} 名破译存活 · 末位淘汰` : `Top ${totalRacers - 1} Survive · Last Eliminated`)}
          </div>
        </div>
        <div class="sc-race-grid" data-motion-key="sc-race-grid">${racersHtml}</div>
      </section>

      <section class="sc-matrix-panel" data-motion-key="sc-matrix-panel">
        <div class="sc-matrix-toolbar">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button type="button" class="dp-btn dp-btn-sm ${noteMode === 'mark' ? 'dp-btn-primary' : ''}" id="sc-mode-mark">
              ✎ ${isZh ? '点击做笔记 (★/✕)' : 'Click: Notes (★/✕)'}
            </button>
            <button type="button" class="dp-btn dp-btn-sm ${noteMode === 'fill' ? 'dp-btn-primary' : ''}" id="sc-mode-fill">
              ⌘ ${isZh ? '点击填入密码位' : 'Click: Fill Code'}
            </button>
          </div>
          <div class="sc-filter-group dp-sliding-track" id="sc-color-track" data-motion-key="sc-color-track">
            <span class="${UI.escapeHtml(indColor.cls)}" data-motion-key="sc-ind-color" ${indColor.style ? `style="${UI.escapeHtml(indColor.style)}"` : ''} aria-hidden="true"></span>
            ${colorPills}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <div class="sc-filter-group dp-sliding-track" id="sc-shape-track" data-motion-key="sc-shape-track">
              <span class="${UI.escapeHtml(indShape.cls)}" data-motion-key="sc-ind-shape" ${indShape.style ? `style="${UI.escapeHtml(indShape.style)}"` : ''} aria-hidden="true"></span>
              ${shapePills}
            </div>
            <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-clear-notes">${isZh ? '重置标记' : 'Reset Notes'}</button>
          </div>
        </div>
        <div class="sc-card-grid" data-motion-key="sc-card-grid">${cardsHtml}</div>
      </section>

      <div class="sc-desk-grid" data-motion-key="sc-desk-grid">
        <section class="sc-clues-panel" data-motion-key="sc-clues-panel">
          <div class="sc-panel-title">
            <span>☥ ${isZh ? `逻辑铭文线索 (${state.clues.length} 条 · 唯一解)` : `LOGIC CLUE TABLETS (${state.clues.length} · UNIQUE SOLUTION)`}</span>
            <span style="font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-ui);font-weight:400;">${isZh ? '点击线索可打勾记录' : 'Click a clue to check off'}</span>
          </div>
          <div class="sc-clue-list" data-motion-key="sc-clue-list">${cluesHtml}</div>
        </section>

        <aside class="sc-lock-panel" id="sc-lock-panel" data-motion-key="sc-lock-panel">
          <div class="sc-panel-title">
            <span>◆ ${isZh ? '4 位黄铜密码转轮' : '4-LETTER BRASS CODE LOCK'}</span>
            <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-clear-code" ${canSubmit ? '' : 'disabled'}>${isZh ? '清空' : 'Clear'}</button>
          </div>

          ${state.revealedCode ? `
            <div class="sc-reveal-code dp-enter" data-motion-key="sc-reveal-code">
              <div style="font-size:12px;">${isZh ? '正确秘密密码' : 'VERIFIED SECRET CODE'}</div>
              <div class="sc-reveal-letters">${state.revealedCode.join(' - ')}</div>
            </div>
          ` : `
            <div class="sc-tumbler-row" id="sc-tumbler-row" data-motion-key="sc-tumbler-row">${tumblersHtml}</div>
            <div style="font-size:11.5px;color:var(--dp-ink-muted);text-align:center;">
              ${isZh ? '支持直接用键盘输入 A–Z（退格键删除），或切换上方「点击填入密码位」' : 'Type A–Z directly on keyboard (Backspace to erase), or use Fill Code mode'}
            </div>

            ${isLockedOut ? `
              <div class="sc-lockout-box" data-motion-key="sc-lockout-box">
                <div style="font-size:12px;font-weight:700;">${isZh ? '抢答铃冷却锁定中' : 'BUZZER COOLDOWN ACTIVE'}</div>
                <div class="sc-lockout-timer dp-tabular" id="sc-lock-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
              </div>
            ` : `
              <button type="button" class="sc-buzzer-btn" id="sc-buzzer-submit" data-motion-key="sc-buzzer-btn" ${canSubmit && codeReady ? '' : 'disabled'}>
                🔔 ${isZh ? '拍铃锁定密码' : 'LOCK IN CODE'}
              </button>
            `}

            ${totalRacers === 1 && canSubmit ? `
              <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-give-up">${isZh ? '放弃并揭晓密码' : 'Surrender & Reveal Code'}</button>
            ` : ''}
          `}

          ${attemptsHtml ? `
            <div data-motion-key="sc-attempts">
              <div style="font-size:11.5px;color:var(--dp-ink-muted);margin-bottom:6px;">${isZh ? '提交记录' : 'ATTEMPT LOG'}</div>
              <div class="sc-attempt-list">${attemptsHtml}</div>
            </div>
          ` : ''}
        </aside>
      </div>
    </div>
  `;

  Motion.patchDOM(container, html);

  container.querySelectorAll('.sc-bar-fill').forEach((bar) => {
    Motion.setProgress(bar, Number(bar.dataset.ratio || 0));
  });

  // Update GPU sliding indicators on both filter pill bars
  const colorTrack = container.querySelector('#sc-color-track');
  const activeColorBtn = colorTrack?.querySelector('.sc-filter-pill.is-active');
  if (colorTrack && activeColorBtn) Motion.slidingIndicator(colorTrack, activeColorBtn);

  const shapeTrack = container.querySelector('#sc-shape-track');
  const activeShapeBtn = shapeTrack?.querySelector('.sc-filter-pill.is-active');
  if (shapeTrack && activeShapeBtn) Motion.slidingIndicator(shapeTrack, activeShapeBtn);

  if (shouldShakeTumblers) {
    Motion.shake(container.querySelector('#sc-tumbler-row') || container.querySelector('#sc-lock-panel'));
  }
}

mountGame({
  config: {
    id: 'secret-code',
    title: { zh: '秘密密码', en: 'Secret Code', ko: '비밀 코드' },
    category: 'EXILE',
    episode: 'EP 7',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'fastMode',
        label: { zh: '快节奏模式（10秒误答冷却）', en: 'Fast Mode (10s Cooldown)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地赛 03 · 秘密密码
- 信息板上展示 **26 张 A–Z 古殿铭文卡**，每张卡均拥有独一无二的「**数字 (1–6) + 颜色 (4色) + 图形 (4形)**」组合。
- 结合下方全部逻辑线索进行交叉排除，**有且仅有 1 组 4 字母有序密码**同时满足所有条件！
- 点击卡片可进行个人笔记标记（**候选星标 ★ / 划掉排除 ✕**），也可用筛选按钮快速定位属性，或切换「填入密码模式」/ 直接用键盘输入 A–Z。
- 拍下猩红抢答铃锁定密码：**答对立即存活，答错触发 15 秒冷却锁定！**`,
      en: `### Exile Match 3 · Secret Code
- The board displays **26 ornate A–Z Glyph Cards**, each carrying a unique **(Number 1–6, Color, Shape)** tuple.
- Cross-reference every logical clue tablet — our solver mathematically guarantees **EXACTLY ONE unique ordered 4-letter code**!
- Click cards to toggle personal notes (**Star Candidate ★** / **Strike Out ✕**), filter by color or shape, or switch to Fill mode / type A–Z directly on your keyboard.
- Slam the Crimson Buzzer to lock in your code: **correct = instant survival; wrong = 15-second buzzer lockout!**`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),
  render: renderSecretCode,
});
