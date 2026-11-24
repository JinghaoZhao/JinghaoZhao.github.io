import { mountGame, SFX, UI } from '../../shared/sdk.js';
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

// Local player deduction state (preserved across AI bot updates!)
let currentMatchStart = 0;
let cardNotes = {}; // letter -> 0 (neutral) | 1 (starred) | 2 (eliminated)
let checkedClues = {}; // clueId -> boolean
let codeInput = ['', '', '', ''];
let activeSlot = 0;
let filterColor = 'all';
let filterShape = 'all';
let noteMode = 'mark'; // 'mark' (click cards to star/strike) | 'fill' (click cards to fill tumbler)
let lockoutInterval = null;
let lastWrongTs = 0;
let lastSolvedTs = 0;

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

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, ui, lastEvent } = ctx;
    const isZh = lang === 'zh';
    const me = state.myState;
    const ended = state.phase === 'ended';

    if (state.startedAtMs && state.startedAtMs !== currentMatchStart) {
      resetLocalNotes(state.startedAtMs);
    }

    if (lastEvent?.type === 'CODE_WRONG' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastWrongTs) {
      lastWrongTs = lastEvent.ts;
      sfx.play('error');
      ui.toast(
        isZh ? `密码 ${lastEvent.code} 错误！抢答铃锁定 ${Math.round(lastEvent.lockoutMs / 1000)} 秒` : `Wrong code ${lastEvent.code}! Buzzer locked for ${Math.round(lastEvent.lockoutMs / 1000)}s`,
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
          renderFull();
        } else if (el) {
          el.textContent = `${(rem / 1000).toFixed(1)}s`;
        }
      }, 150);
    }

    const deckByLetter = Object.fromEntries(state.deck.map((c) => [c.letter, c]));
    const totalRacers = state.racers.length;
    const canSubmit = Boolean(me && !me.finished && !ended && !isLockedOut);

    const renderFull = () => {
      const racersHtml = state.racers
        .map((r) => {
          const isMe = r.seatId === mySeatId;
          const cls = [
            'sc-racer-card',
            isMe ? 'is-me' : '',
            r.status === 'survived' ? 'is-survived' : '',
            r.status === 'eliminated' ? 'is-eliminated' : '',
          ].join(' ');
          const stat = r.finished && r.finishTimeMs != null
            ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
            : r.wrongCount > 0
            ? `${r.progress}% (${r.wrongCount}✕)`
            : `${r.progress}%`;
          return `
            <div class="${cls}">
              <div class="sc-racer-top">
                <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
                <span class="sc-racer-stat">${UI.escapeHtml(stat)}</span>
              </div>
              <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${r.progress}%"></div></div>
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
          ].join(' ');
          return `
            <div class="${cls}" data-card-letter="${c.letter}" style="border-top:3px solid ${hex};">
              ${note === 1 ? '<span class="sc-star-tag">★</span>' : ''}
              <span class="sc-card-letter">${c.letter}</span>
              <div class="sc-card-meta">
                ${renderShapeSvg(c.shape, hex, 16)}
                <span class="sc-card-num">${c.num}</span>
              </div>
            </div>
          `;
        })
        .join('');

      const cluesHtml = state.clues
        .map((cl) => {
          const checked = Boolean(checkedClues[cl.id]);
          return `
            <div class="sc-clue-item ${checked ? 'is-checked' : ''}" data-clue-id="${cl.id}">
              <span class="sc-clue-idx">${checked ? '✓' : cl.id}</span>
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
            <div class="sc-tumbler ${activeSlot === idx ? 'is-active' : ''}" data-tumbler="${idx}">
              <span class="sc-tumbler-pos">#${idx + 1}</span>
              <span class="sc-tumbler-val">${ch || '·'}</span>
              <span class="sc-tumbler-sub">
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
          <button type="button" class="sc-filter-pill ${filterColor === item.id ? 'is-active' : ''}" data-fcolor="${item.id}">
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
          <button type="button" class="sc-filter-pill ${filterShape === item.id ? 'is-active' : ''}" data-fshape="${item.id}">
            ${UI.escapeHtml(item.label)}
          </button>
        `
        )
        .join('');

      const attemptsHtml = (me?.attempts || [])
        .map(
          (a) => `
          <div class="sc-attempt-row">
            <span>${UI.escapeHtml(a.code)}</span>
            <span style="color:${a.correct ? '#4ade80' : '#ff5868'};">${a.correct ? (isZh ? '✓ 正确' : '✓ MATCH') : (isZh ? '✕ 错误' : '✕ REJECTED')}</span>
          </div>
        `
        )
        .join('');

      container.innerHTML = `
        <div class="sc-root">
          <section class="sc-temple-banner">
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
            <div class="sc-race-grid">${racersHtml}</div>
          </section>

          <section class="sc-matrix-panel">
            <div class="sc-matrix-toolbar">
              <div class="sc-filter-group">
                <button type="button" class="dp-btn dp-btn-sm ${noteMode === 'mark' ? 'dp-btn-primary' : ''}" id="sc-mode-mark">
                  ✎ ${isZh ? '点击做笔记 (★/✕)' : 'Click: Notes (★/✕)'}
                </button>
                <button type="button" class="dp-btn dp-btn-sm ${noteMode === 'fill' ? 'dp-btn-primary' : ''}" id="sc-mode-fill">
                  ⌘ ${isZh ? '点击填入密码位' : 'Click: Fill Code'}
                </button>
              </div>
              <div class="sc-filter-group">
                ${colorPills}
              </div>
              <div class="sc-filter-group">
                ${shapePills}
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-clear-notes">${isZh ? '重置标记' : 'Reset Notes'}</button>
              </div>
            </div>
            <div class="sc-card-grid">${cardsHtml}</div>
          </section>

          <div class="sc-desk-grid">
            <section class="sc-clues-panel">
              <div class="sc-panel-title">
                <span>☥ ${isZh ? `逻辑铭文线索 (${state.clues.length} 条 · 唯一解)` : `LOGIC CLUE TABLETS (${state.clues.length} · UNIQUE SOLUTION)`}</span>
                <span style="font-size:11px;color:var(--dp-ink-muted);font-family:var(--dp-font-ui);font-weight:400;">${isZh ? '点击线索可打勾记录' : 'Click a clue to check off'}</span>
              </div>
              <div class="sc-clue-list">${cluesHtml}</div>
            </section>

            <aside class="sc-lock-panel">
              <div class="sc-panel-title">
                <span>◆ ${isZh ? '4 位黄铜密码转轮' : '4-LETTER BRASS CODE LOCK'}</span>
                <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-clear-code" ${canSubmit ? '' : 'disabled'}>${isZh ? '清空' : 'Clear'}</button>
              </div>

              ${state.revealedCode ? `
                <div class="sc-reveal-code">
                  <div style="font-size:12px;">${isZh ? '正确秘密密码' : 'VERIFIED SECRET CODE'}</div>
                  <div class="sc-reveal-letters">${state.revealedCode.join(' - ')}</div>
                </div>
              ` : `
                <div class="sc-tumbler-row">${tumblersHtml}</div>
                <div style="font-size:11.5px;color:var(--dp-ink-muted);text-align:center;">
                  ${isZh ? '支持直接用键盘输入 A–Z（退格键删除），或切换上方「点击填入密码位」' : 'Type A–Z directly on keyboard (Backspace to erase), or use Fill Code mode'}
                </div>

                ${isLockedOut ? `
                  <div class="sc-lockout-box">
                    <div style="font-size:12px;font-weight:700;">${isZh ? '抢答铃冷却锁定中' : 'BUZZER COOLDOWN ACTIVE'}</div>
                    <div class="sc-lockout-timer" id="sc-lock-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
                  </div>
                ` : `
                  <button type="button" class="sc-buzzer-btn" id="sc-buzzer-submit" ${canSubmit && codeReady ? '' : 'disabled'}>
                    🔔 ${isZh ? '拍铃锁定密码' : 'LOCK IN CODE'}
                  </button>
                `}

                ${totalRacers === 1 && canSubmit ? `
                  <button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sc-give-up">${isZh ? '放弃并揭晓密码' : 'Surrender & Reveal Code'}</button>
                ` : ''}
              `}

              ${attemptsHtml ? `
                <div>
                  <div style="font-size:11.5px;color:var(--dp-ink-muted);margin-bottom:6px;">${isZh ? '提交记录' : 'ATTEMPT LOG'}</div>
                  <div class="sc-attempt-list">${attemptsHtml}</div>
                </div>
              ` : ''}
            </aside>
          </div>
        </div>
      `;

      // Wire mode & filters
      container.querySelector('#sc-mode-mark')?.addEventListener('click', () => {
        sfx.play('click');
        noteMode = 'mark';
        renderFull();
      });
      container.querySelector('#sc-mode-fill')?.addEventListener('click', () => {
        sfx.play('click');
        noteMode = 'fill';
        renderFull();
      });
      container.querySelectorAll('[data-fcolor]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('click');
          filterColor = btn.dataset.fcolor;
          renderFull();
        });
      });
      container.querySelectorAll('[data-fshape]').forEach((btn) => {
        btn.addEventListener('click', () => {
          sfx.play('click');
          filterShape = btn.dataset.fshape;
          renderFull();
        });
      });
      container.querySelector('#sc-clear-notes')?.addEventListener('click', () => {
        sfx.play('click');
        cardNotes = {};
        filterColor = 'all';
        filterShape = 'all';
        renderFull();
      });

      // Card clicks
      container.querySelectorAll('[data-card-letter]').forEach((el) => {
        const ch = el.dataset.cardLetter;
        el.addEventListener('click', () => {
          sfx.play('click');
          if (noteMode === 'fill' && canSubmit) {
            // Put letter into active slot (removing duplicate if already in another slot)
            const dupIdx = codeInput.indexOf(ch);
            if (dupIdx !== -1 && dupIdx !== activeSlot) codeInput[dupIdx] = '';
            codeInput[activeSlot] = ch;
            activeSlot = (activeSlot + 1) % 4;
          } else {
            cardNotes[ch] = ((cardNotes[ch] || 0) + 1) % 3;
          }
          renderFull();
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          sfx.play('click');
          const dupIdx = codeInput.indexOf(ch);
          if (dupIdx !== -1 && dupIdx !== activeSlot) codeInput[dupIdx] = '';
          codeInput[activeSlot] = ch;
          activeSlot = (activeSlot + 1) % 4;
          renderFull();
        });
      });

      // Clues check-off
      container.querySelectorAll('[data-clue-id]').forEach((el) => {
        const cid = Number(el.dataset.clueId);
        el.addEventListener('click', () => {
          sfx.play('click');
          checkedClues[cid] = !checkedClues[cid];
          renderFull();
        });
      });

      // Tumbler slot select
      container.querySelectorAll('[data-tumbler]').forEach((el) => {
        const idx = Number(el.dataset.tumbler);
        el.addEventListener('click', () => {
          sfx.play('click');
          activeSlot = idx;
          noteMode = 'fill';
          renderFull();
        });
      });

      container.querySelector('#sc-clear-code')?.addEventListener('click', () => {
        sfx.play('click');
        codeInput = ['', '', '', ''];
        activeSlot = 0;
        renderFull();
      });

      container.querySelector('#sc-buzzer-submit')?.addEventListener('click', () => {
        if (!canSubmit || !codeReady) return;
        sfx.play('bid');
        dispatch({ type: 'SUBMIT_CODE', payload: { code: codeInput.slice() } });
      });

      container.querySelector('#sc-give-up')?.addEventListener('click', async () => {
        const ok = await ui.confirm(
          isZh ? '确认放弃并揭晓密码？' : 'Surrender & Reveal Code?',
          isZh ? '将结束当前挑战并揭晓唯一正确答案。' : 'Ends the challenge and reveals the unique secret code.'
        );
        if (ok) dispatch({ type: 'GIVE_UP', payload: {} });
      });
    };

    renderFull();

    // Global keyboard input for rapid A-Z code entry
    if (window._scKeyHandler) {
      window.removeEventListener('keydown', window._scKeyHandler);
    }
    window._scKeyHandler = (e) => {
      if (!canSubmit) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        sfx.play('click');
        const dup = codeInput.indexOf(key);
        if (dup !== -1 && dup !== activeSlot) codeInput[dup] = '';
        codeInput[activeSlot] = key;
        activeSlot = (activeSlot + 1) % 4;
        renderFull();
      } else if (e.key === 'Backspace') {
        sfx.play('click');
        if (codeInput[activeSlot]) {
          codeInput[activeSlot] = '';
        } else {
          activeSlot = (activeSlot + 3) % 4;
          codeInput[activeSlot] = '';
        }
        renderFull();
      } else if (e.key === 'Enter') {
        const ready = codeInput.every((ch) => /^[A-Z]$/.test(ch)) && new Set(codeInput).size === 4;
        if (ready) {
          sfx.play('bid');
          dispatch({ type: 'SUBMIT_CODE', payload: { code: codeInput.slice() } });
        }
      }
    };
    window.addEventListener('keydown', window._scKeyHandler);
  },
});
