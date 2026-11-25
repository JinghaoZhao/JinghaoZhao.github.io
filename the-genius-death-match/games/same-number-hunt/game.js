/**
 * Same Number Hunt (寻找相同数字) — Persistent 4×4 Staggered 3D Math Vault
 * Zero innerHTML nukes on the 4×4 board; GPU scaleX score bars; Motion.animateNumber/nudgeError/pulseConfirm.
 */

import { mountGame, SFX, UI, Motion } from '../../shared/sdk.js';
import { GameRules, LETTERS } from './rules.js';

let lastEvtSig = null;
let keyBound = false;
let latestCtx = null;
let refs = null;
let prevScores = {};
let tileClearTimers = new Map();

function bindKeysOnce() {
  if (keyBound) return;
  keyBound = true;
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!latestCtx || !latestCtx.state) return;
    const { state, mode, isSpectator, dispatch } = latestCtx;
    if (isSpectator || state.phase !== 'BUZZ_OPEN') return;

    if (mode === 'hotseat') {
      if (e.code === 'KeyA') {
        e.preventDefault();
        dispatch({ type: 'BUZZ', payload: { buzzerSeatId: state.seatOrder[0] } });
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        dispatch({ type: 'BUZZ', payload: { buzzerSeatId: state.seatOrder[1] } });
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      dispatch({ type: 'BUZZ' });
    }
  });
}

function mountSkeleton(container) {
  const tilesHtml = LETTERS.map(
    (letter, idx) => `
      <button type="button" class="snh-tile" data-snh-idx="${idx}" aria-label="Tile ${letter}">
        <div class="snh-tile-inner">
          <div class="snh-tile-face snh-tile-front">
            <span class="snh-tile-letter">${letter}</span>
            <span class="snh-pick-order" hidden></span>
          </div>
          <div class="snh-tile-face snh-tile-back">
            <span class="snh-tile-corner">${letter}</span>
            <span class="snh-tile-val"></span>
            <span class="snh-tile-type"></span>
          </div>
        </div>
      </button>
    `
  ).join('');

  const scoreCardHtml = (i) => `
    <div class="snh-score-card" id="snh-scard-${i}">
      <div class="snh-score-top">
        <span id="snh-sname-${i}"></span>
        <span class="snh-score-num-wrap" id="snh-sdelta-${i}">
          <span class="snh-score-num" id="snh-snum-${i}">0</span>
          <span style="font-size:12px;color:var(--tg-ink-faint);" id="snh-smax-${i}">/ 10</span>
        </span>
      </div>
      <div class="snh-score-bar">
        <div class="snh-score-fill ${i === 0 ? 'is-cyan' : 'is-garnet'}" id="snh-sfill-${i}"></div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="snh-arena">
      <div class="snh-vault-header">
        ${scoreCardHtml(0)}
        <div class="snh-target-orb" id="snh-target-orb">
          <span class="snh-target-orb-label" id="snh-target-lbl"></span>
          <span class="snh-target-orb-num" id="snh-target-num">—</span>
          <span class="snh-target-orb-tag" id="snh-target-tag" hidden>√x+√y +2!</span>
        </div>
        ${scoreCardHtml(1)}
      </div>

      <div class="snh-equation-bar" id="snh-eq-bar">
        ${[0, 1, 2]
          .map(
            (i) => `
            <div class="snh-eq-slot ${i === 1 ? 'is-op' : ''}" id="snh-eq-slot-${i}">
              <span class="snh-eq-slot-role" id="snh-eq-role-${i}"></span>
              <span id="snh-eq-val-${i}">?</span>
            </div>
          `
          )
          .join('')}
        <span class="snh-eq-equals" id="snh-eq-right">= ?</span>
        <span class="tg-badge tg-badge-emerald" id="snh-eq-pts" hidden></span>
      </div>

      <div class="snh-body">
        <div class="snh-wall-card" id="snh-wall-card">
          <div class="snh-grid" id="snh-grid">${tilesHtml}</div>
        </div>

        <div class="snh-console">
          <div class="snh-buzzer-panel" id="snh-buzzer-panel"></div>
          <div class="snh-history-panel" id="snh-history-panel" hidden>
            <div id="snh-history-heading" style="font-family:var(--tg-font-mono);font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--tg-gold-bright);margin-bottom:8px;"></div>
            <div class="snh-history-list" id="snh-history-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#snh-grid');
  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-snh-idx]');
    if (!btn || btn.disabled || !latestCtx) return;
    latestCtx.dispatch({ type: 'PICK_TILE', payload: { tileIdx: Number(btn.dataset.snhIdx) } });
  });

  const buzzerPanel = container.querySelector('#snh-buzzer-panel');
  buzzerPanel.addEventListener('click', (e) => {
    if (!latestCtx) return;
    const buzzBtn = e.target.closest('#snh-buzz-btn');
    if (buzzBtn && !buzzBtn.disabled) {
      latestCtx.dispatch({ type: 'BUZZ' });
      return;
    }
    const hsBtn = e.target.closest('[data-hs-buzz]');
    if (hsBtn && !hsBtn.disabled) {
      latestCtx.dispatch({ type: 'BUZZ', payload: { buzzerSeatId: hsBtn.dataset.hsBuzz } });
      return;
    }
    const clearBtn = e.target.closest('#snh-clear-btn');
    if (clearBtn) {
      SFX.play('click');
      latestCtx.dispatch({ type: 'CLEAR_PICKS' });
      return;
    }
    const passBtn = e.target.closest('#snh-pass-btn');
    if (passBtn) {
      SFX.play('click');
      latestCtx.dispatch({ type: 'PASS_REBOUND' });
      return;
    }
    const skipBtn = e.target.closest('#snh-skip-btn');
    if (skipBtn) {
      SFX.play('click');
      latestCtx.dispatch({ type: 'SKIP_FLASH' });
    }
  });

  container.dataset.mounted = 'snh';
  refs = {
    scards: [0, 1].map((i) => ({
      card: container.querySelector(`#snh-scard-${i}`),
      name: container.querySelector(`#snh-sname-${i}`),
      deltaWrap: container.querySelector(`#snh-sdelta-${i}`),
      num: container.querySelector(`#snh-snum-${i}`),
      max: container.querySelector(`#snh-smax-${i}`),
      fill: container.querySelector(`#snh-sfill-${i}`),
    })),
    targetOrb: container.querySelector('#snh-target-orb'),
    targetLbl: container.querySelector('#snh-target-lbl'),
    targetNum: container.querySelector('#snh-target-num'),
    targetTag: container.querySelector('#snh-target-tag'),
    eqBar: container.querySelector('#snh-eq-bar'),
    eqSlots: [0, 1, 2].map((i) => ({
      slot: container.querySelector(`#snh-eq-slot-${i}`),
      role: container.querySelector(`#snh-eq-role-${i}`),
      val: container.querySelector(`#snh-eq-val-${i}`),
    })),
    eqRight: container.querySelector('#snh-eq-right'),
    eqPts: container.querySelector('#snh-eq-pts'),
    wallCard: container.querySelector('#snh-wall-card'),
    tiles: Array.from(gridEl.querySelectorAll('.snh-tile')).map((btn, idx) => ({
      idx,
      btn,
      inner: btn.querySelector('.snh-tile-inner'),
      pickOrder: btn.querySelector('.snh-pick-order'),
      valEl: btn.querySelector('.snh-tile-val'),
      typeEl: btn.querySelector('.snh-tile-type'),
      wasRevealed: false,
    })),
    buzzerPanel,
    historyPanel: container.querySelector('#snh-history-panel'),
    historyHeading: container.querySelector('#snh-history-heading'),
    historyList: container.querySelector('#snh-history-list'),
    lastTarget: undefined,
    lastConsoleKey: '',
    lastHistLen: -1,
    lastPhase: '',
  };
  prevScores = {};
  tileClearTimers.forEach((t) => clearTimeout(t));
  tileClearTimers.clear();
}

mountGame({
  config: {
    id: 'same-number-hunt',
    title: { zh: '寻找相同数字', en: 'Same Number Hunt', ko: '같은 숫자 찾기' },
    seasons: ['S4E4', 'S3E12'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'classicMode',
        label: { zh: 'S3 经典模式 (+, −, ×, ÷)', en: 'S3 Classic Ops (+, −, ×, ÷)' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'winScore',
        label: { zh: '获胜分数', en: 'Target Score' },
        type: 'select',
        default: '10',
        choices: [
          { value: '10', label: { zh: '10 分（官方标准）', en: '10 pts (Official)' } },
          { value: '7', label: { zh: '7 分（快节奏）', en: '7 pts (Quick)' } },
        ],
      },
      {
        key: 'relaxedTimer',
        label: { zh: '宽松作答计时 (8秒)', en: 'Relaxed Answer Clock (8s)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 死亡对决目标
在 4×4 (A–P) 暗格中藏有数字 **1–12** 与 **4 个运算符号**（第 4 季官方版为 \`+\`、\`×\`、\`÷\`、\`√x+√y\`）。先达 **10 分**者获胜！

### 流程与规则
- **开局全盘记忆**：开场全部 16 块板同时翻开供双方记忆，随后扣合。
- **目标降临 & 抢答**：每轮随机掉落自然数目标，抢先按下**红色抢答器**（或按空格键 / 双人热座按 \`A\` 与 \`L\`）。
- **5 秒三连选**：抢答者在 5 秒内按严格顺序点击 3 块不同字母板：**[数字 A] → [运算符] → [数字 B]**。
- **计分与 √x+√y 暴击**：等式精确等于目标值即得 **+1 分**；若使用 \`√x+√y\`（x, y ∈ {1,4,9} 拼出 3、4、5）独得 **+2 分**！
- **反击与记忆补给**：答错会公开翻开所选 3 块板并将**不限时反击权**交给对手；超时则不翻板直接移交。每轮结束后系统依次公开 1 块板（A→P）3 秒！`,
      en: `### Objective
A 4×4 (A–P) wall hides numbers **1–12** and **4 math operators** (S4E4 Official: \`+\`, \`×\`, \`÷\`, \`√x+√y\`). First to **10 points** wins!

### Flow & Scoring
- **Opening Flash**: All 16 tiles open briefly at match start, then close.
- **Target Drop & Buzzer**: When a target number drops, slam the **BUZZER** (Spacebar, or \`A\` / \`L\` in Pass-and-Play).
- **5-Second Equation**: Click 3 distinct tiles in strict order: **[Number] → [Operator] → [Number]**.
- **Scoring & +2 Bonus**: Exact integer match earns **+1 pt**; solving 3, 4, or 5 using \`√x+√y\` (with {1, 4, 9}) awards **+2 BONUS PTS!**
- **Rebound & Progressive Refresh**: A wrong answer flips all 3 tiles publicly and passes an **untimed rebound** to your rival; timing out flips 0 tiles before rebounding. Between rounds, 1 tile (cycling A → P) flips open for 3s!`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    latestCtx = ctx;
    bindKeysOnce();

    const { state, activeSeatId, isSpectator, mode, lang, lastEvent, log } = ctx;
    if (!state) return;

    if (container.dataset.mounted !== 'snh' || !refs || !container.contains(refs.wallCard)) {
      mountSkeleton(container);
    }

    // Event cues & Motion feedback
    const sig = `${state.round}-${state.stepSeq}-${state.selectedPicks.length}-${lastEvent?.type || ''}`;
    if (sig !== lastEvtSig && lastEvent) {
      lastEvtSig = sig;
      if (lastEvent.type === 'BUZZED') {
        SFX.play('clash');
        Motion.pulseConfirm(refs.targetOrb, { tone: 'gold' });
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `🔔 ${nm} 抢答成功，目标：${lastEvent.target}`
            : `🔔 ${nm} buzzed in for Target ${lastEvent.target}`,
          'alert'
        );
      } else if (lastEvent.type === 'TILE_SELECTED') {
        SFX.play('click');
      } else if (lastEvent.type === 'EQUATION_SOLVED') {
        SFX.play('cardFlip');
        SFX.play(lastEvent.points >= 2 ? 'combo' : 'garnetClink');
        Motion.pulseConfirm(refs.eqBar, { tone: 'emerald' });
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `⚡ ${nm} 命中算式：${lastEvent.formula} (+${lastEvent.points}分)`
            : `⚡ ${nm} solved ${lastEvent.formula} (+${lastEvent.points} pt${lastEvent.points > 1 ? 's' : ''})`,
          'system'
        );
      } else if (lastEvent.type === 'EQUATION_WRONG') {
        SFX.play('cardFlip');
        SFX.play('error');
        Motion.nudgeError(refs.eqBar, { intensity: 'impact' });
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✖ ${nm} 等式失败 (${lastEvent.formula})，反击权移交对手。`
            : `✖ ${nm} missed (${lastEvent.formula}) — untimed rebound to opponent.`,
          'alert'
        );
      } else if (lastEvent.type === 'ANSWER_TIMEOUT') {
        SFX.play('eliminate');
        Motion.nudgeError(refs.wallCard, { intensity: 'impact' });
        log(
          lang === 'zh' ? '⏱ 作答超时，不限时反击权移交对手。' : '⏱ Time up — untimed rebound to opponent.',
          'alert'
        );
      } else if (lastEvent.type === 'FLASH_ENDED' || lastEvent.type === 'TARGET_READY') {
        SFX.play('reveal');
      }
    }

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];
    const pair = [p0, p1];
    const isMyAnswering =
      !isSpectator &&
      state.phase === 'ANSWERING' &&
      (mode === 'hotseat' || state.activeBuzzerSeatId === activeSeatId);
    const answeringPlayer = state.activeBuzzerSeatId ? state.players[state.activeBuzzerSeatId] : null;
    const sqrtEligible = !state.classicMode && [3, 4, 5].includes(state.target);

    // 1. Score Cards with GPU scaleX bars & Motion.animateNumber + delta pill
    pair.forEach((p, idx) => {
      const sc = refs.scards[idx];
      const isAct = state.activeBuzzerSeatId === p.seatId && state.phase === 'ANSWERING';
      sc.card.classList.toggle('is-active-cyan', isAct && p.color === 'cyan');
      sc.card.classList.toggle('is-active-garnet', isAct && p.color === 'garnet');
      sc.name.textContent = `${p.avatar || '♦'} ${p.name}`;
      sc.name.style.color = p.color === 'cyan' ? 'var(--tg-cyan-ink)' : 'var(--tg-garnet-ink)';
      sc.max.textContent = `/ ${state.winScore}`;

      const prevSc = prevScores[p.seatId];
      if (prevSc !== undefined && prevSc !== p.score) {
        Motion.animateNumber(sc.num, prevSc, p.score, {
          duration: 300,
          deltaEl: sc.deltaWrap,
        });
      } else {
        sc.num.textContent = String(p.score);
      }
      prevScores[p.seatId] = p.score;

      const ratio = Math.max(0, Math.min(1, p.score / Math.max(1, state.winScore)));
      sc.fill.style.transform = `scaleX(${ratio})`;
    });

    // 2. Lotto Target Orb with crossfade on target drop
    refs.targetLbl.textContent = lang === 'zh' ? '目标数' : 'TARGET';
    refs.targetOrb.classList.toggle('is-sqrt-bonus', sqrtEligible);
    refs.targetTag.hidden = !sqrtEligible;
    if (refs.lastTarget !== state.target) {
      refs.lastTarget = state.target;
      Motion.crossfade(
        refs.targetNum,
        () => {
          refs.targetNum.textContent = state.target != null ? String(state.target) : '—';
        },
        { duration: 180, shiftPx: 5 }
      );
    }

    // 3. Live Equation Conduit
    const roleLabels = lang === 'zh' ? ['数字 A', '运算符', '数字 B'] : ['NUM A', 'OP', 'NUM B'];
    const picksToShow =
      state.phase === 'EVAL_REVEAL' && state.evalResult
        ? state.evalResult.picks
        : state.selectedPicks;

    refs.eqBar.classList.toggle(
      'is-success',
      Boolean(state.phase === 'EVAL_REVEAL' && state.evalResult?.matched)
    );
    refs.eqBar.classList.toggle(
      'is-fail',
      Boolean(state.phase === 'EVAL_REVEAL' && state.evalResult && !state.evalResult.matched)
    );

    [0, 1, 2].forEach((slotIdx) => {
      const tileIdx = picksToShow[slotIdx];
      const filled = tileIdx !== undefined;
      const tile = filled ? state.tiles[tileIdx] : null;
      const sRef = refs.eqSlots[slotIdx];
      sRef.role.textContent = roleLabels[slotIdx];
      sRef.val.textContent = filled ? (tile.revealed ? tile.display : `[${tile.letter}]`) : '?';
      sRef.slot.classList.toggle('is-filled', filled);
    });

    if (state.phase === 'EVAL_REVEAL' && state.evalResult) {
      if (state.evalResult.matched) {
        refs.eqRight.textContent = `= ${state.target} ✓`;
        refs.eqRight.style.color = 'var(--tg-emerald-ink)';
        refs.eqPts.hidden = false;
        refs.eqPts.textContent = `+${state.evalResult.points} PT${state.evalResult.points > 1 ? 'S' : ''}`;
      } else {
        refs.eqRight.textContent = `${state.evalResult.formulaText} ✗`;
        refs.eqRight.style.color = 'var(--tg-garnet-ink)';
        refs.eqPts.hidden = true;
      }
    } else {
      refs.eqRight.textContent = `= ${state.target ?? '?'}`;
      refs.eqRight.style.color = 'var(--tg-gold-bright)';
      refs.eqPts.hidden = true;
    }

    // 4. Patch 4x4 3D Math Flip Tiles IN PLACE with Wave Stagger on Opening Flash!
    const isFlashWave =
      state.phase === 'INITIAL_FLASH' ||
      (refs.lastPhase === 'INITIAL_FLASH' && state.phase !== 'INITIAL_FLASH');
    const evalOrderMap = new Map();
    if (state.phase === 'EVAL_REVEAL' && state.evalResult?.picks) {
      state.evalResult.picks.forEach((idx, order) => evalOrderMap.set(idx, order));
    }

    state.tiles.forEach((t, idx) => {
      const slot = refs.tiles[idx];
      const pickOrder = state.selectedPicks.indexOf(t.idx);
      const isPicked = pickOrder >= 0;
      const canPick = isMyAnswering && !isPicked && state.selectedPicks.length < 3;

      slot.btn.disabled = !canPick;
      slot.btn.classList.toggle('is-clickable', canPick);
      slot.btn.classList.toggle('is-picked', isPicked);
      slot.btn.classList.toggle('is-hint-glow', state.phase === 'HINT_REVEAL' && state.hintTileIdx === t.idx);

      if (isPicked) {
        slot.pickOrder.hidden = false;
        slot.pickOrder.textContent = `#${pickOrder + 1}`;
      } else {
        slot.pickOrder.hidden = true;
      }

      // Synchronized diagonal wave stagger (25ms) during opening flash open/close, 60ms on 3-tile eval reveal
      if (Motion.reduced()) {
        slot.inner.style.transitionDelay = '0ms';
      } else if (isFlashWave) {
        const r = Math.floor(idx / 4);
        const c = idx % 4;
        slot.inner.style.transitionDelay = `${(r + c) * 25}ms`;
      } else if (evalOrderMap.has(idx)) {
        slot.inner.style.transitionDelay = `${evalOrderMap.get(idx) * 65}ms`;
      } else {
        slot.inner.style.transitionDelay = '0ms';
      }

      if (t.revealed && t.display != null) {
        if (tileClearTimers.has(idx)) {
          clearTimeout(tileClearTimers.get(idx));
          tileClearTimers.delete(idx);
        }
        slot.btn.classList.toggle('is-op', t.kind === 'op');
        slot.btn.classList.toggle('is-sqrt', t.value === 'sqrt');
        slot.valEl.textContent = t.display;
        slot.typeEl.textContent =
          t.kind === 'op' ? (t.value === 'sqrt' ? '+2 BONUS' : 'OP') : 'NUM';
        slot.btn.classList.add('is-flipped');
        slot.wasRevealed = true;
      } else {
        slot.btn.classList.remove('is-flipped');
        if (slot.wasRevealed) {
          slot.wasRevealed = false;
          const r = Math.floor(idx / 4);
          const c = idx % 4;
          const waitMs = Motion.reduced() ? 10 : 220 + (isFlashWave ? (r + c) * 25 : 0);
          const timer = setTimeout(() => {
            if (!slot.btn.classList.contains('is-flipped')) {
              slot.valEl.textContent = '';
              slot.typeEl.textContent = '';
              slot.btn.classList.remove('is-op', 'is-sqrt');
            }
            tileClearTimers.delete(idx);
          }, waitMs);
          tileClearTimers.set(idx, timer);
        }
      }
    });
    refs.lastPhase = state.phase;

    // 5. Right Console Panel (update only when phase/mode/lang/selection buttons change)
    const consoleKey = [
      state.phase,
      mode,
      lang,
      isSpectator,
      isMyAnswering,
      state.isRebound,
      state.selectedPicks.length > 0,
      state.hintTileIdx,
      state.activeBuzzerSeatId,
      state.evalResult?.matched,
      state.evalResult?.formulaText,
      p0.name,
      p1.name,
    ].join('|');

    if (consoleKey !== refs.lastConsoleKey) {
      refs.lastConsoleKey = consoleKey;
      let html = '';
      if (state.phase === 'INITIAL_FLASH') {
        html = `
          <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '全盘倒计时记忆' : 'OPENING FLASH'}</span>
          <div style="font-size:14px;color:var(--tg-ink);font-weight:600;">
            ${lang === 'zh' ? '牢记 1–12 与 4 个运算符号的位置，稍后全部扣合。' : 'Memorize numbers 1–12 and all 4 operators before the wall closes.'}
          </div>
          ${
            !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-cyan" id="snh-skip-btn">${lang === 'zh' ? '已记住 · 立即出题' : 'Ready · Drop Target'}</button>`
              : ''
          }
        `;
      } else if (state.phase === 'HINT_REVEAL') {
        const hLetter = LETTERS[state.hintTileIdx ?? 0];
        html = `
          <span class="tg-badge tg-badge-gold">${lang === 'zh' ? 'S4 记忆补给' : 'MEMORY REFRESH'}</span>
          <div style="font-size:14px;color:var(--tg-ink);font-weight:600;">
            ${lang === 'zh' ? `公开面板 [${hLetter}] 3 秒供双方记忆刷新` : `Tile [${hLetter}] revealed for 3 seconds`}
          </div>
          ${
            !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-ghost" id="snh-skip-btn">${lang === 'zh' ? '下一目标' : 'Next Target'}</button>`
              : ''
          }
        `;
      } else if (state.phase === 'EVAL_REVEAL') {
        const ev = state.evalResult;
        html = `
          <span class="tg-badge ${ev?.matched ? 'tg-badge-emerald' : 'tg-badge-garnet'}">
            ${ev?.matched ? (lang === 'zh' ? '验证通过' : 'VERIFIED') : lang === 'zh' ? '等式失败' : 'MISMATCH'}
          </span>
          <div style="font-family:var(--tg-font-mono);font-size:17px;font-weight:800;color:${ev?.matched ? 'var(--tg-emerald-ink)' : 'var(--tg-garnet-ink)'};">
            ${UI.escapeHtml(ev?.formulaText || '')}
          </div>
          ${
            !isSpectator
              ? `<button type="button" class="tg-btn tg-btn-ghost" id="snh-skip-btn">${lang === 'zh' ? '立即继续' : 'Continue'}</button>`
              : ''
          }
        `;
      } else if (state.phase === 'BUZZ_OPEN') {
        if (mode === 'hotseat') {
          html = `
            <span class="tg-badge tg-badge-cyan">${lang === 'zh' ? '双人同屏抢答' : 'HOTSEAT BUZZER RACE'}</span>
            <div class="snh-hotseat-buzzers">
              <button type="button" class="tg-btn tg-btn-cyan snh-hs-buzz-btn" data-hs-buzz="${UI.escapeHtml(p0.seatId)}">
                <span>🔔 ${UI.escapeHtml(p0.name)}</span>
                <span style="font-size:11px;opacity:0.8;">[ Key A ]</span>
              </button>
              <button type="button" class="tg-btn tg-btn-garnet snh-hs-buzz-btn" data-hs-buzz="${UI.escapeHtml(p1.seatId)}">
                <span>🔔 ${UI.escapeHtml(p1.name)}</span>
                <span style="font-size:11px;opacity:0.8;">[ Key L ]</span>
              </button>
            </div>
          `;
        } else {
          html = `
            <button type="button" class="snh-buzzer-btn" id="snh-buzz-btn" ${isSpectator ? 'disabled' : ''}>
              <span>${lang === 'zh' ? '抢答!' : 'BUZZ!'}</span>
              <span style="font-size:11px;font-family:var(--tg-font-mono);opacity:0.85;">SPACE</span>
            </button>
            <div style="font-size:12px;color:var(--tg-ink-muted);">
              ${lang === 'zh' ? '抢答后须在 5 秒内依次点选：数字 → 符号 → 数字' : 'Buzz first, then click: Number → Operator → Number in 5s'}
            </div>
          `;
        }
      } else if (state.phase === 'ANSWERING') {
        html = `
          <span class="tg-badge ${state.isRebound ? 'tg-badge-gold' : 'tg-badge-garnet'}">
            ${
              state.isRebound
                ? lang === 'zh'
                  ? '不限时反击回合'
                  : 'UNTIMED REBOUND'
                : lang === 'zh'
                ? '5秒极速作答'
                : '5s ANSWER WINDOW'
            }
          </span>
          <div style="font-size:15px;font-weight:800;color:var(--tg-ink);">
            ${UI.escapeHtml(answeringPlayer?.name || '')} ${lang === 'zh' ? '请依次点击 3 块板' : '— Select 3 tiles'}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            ${
              isMyAnswering && state.selectedPicks.length > 0
                ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="snh-clear-btn">${lang === 'zh' ? '清空重选' : 'Clear'}</button>`
                : ''
            }
            ${
              isMyAnswering && state.isRebound
                ? `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="snh-pass-btn">${lang === 'zh' ? '放弃此题' : 'Pass Target'}</button>`
                : ''
            }
          </div>
        `;
      } else {
        html = `
          <span class="tg-badge tg-badge-gold">FINAL BOARD REVEALED</span>
          <div style="font-size:14px;color:var(--tg-ink-muted);">${lang === 'zh' ? '全部 16 块算术面板已揭示。' : 'All 16 vault panels revealed.'}</div>
        `;
      }
      refs.buzzerPanel.innerHTML = html;
    }

    // 6. History Panel
    const hist = state.history || [];
    refs.historyPanel.hidden = hist.length === 0;
    refs.historyHeading.textContent = lang === 'zh' ? '已破解算式记录' : 'SOLVED EQUATIONS';
    if (hist.length !== refs.lastHistLen) {
      refs.lastHistLen = hist.length;
      refs.historyList.innerHTML = hist
        .slice(-6)
        .reverse()
        .map((h) => {
          const nm = state.players[h.seatId]?.name || '';
          return `
            <div class="snh-history-row">
              <span style="color:var(--tg-ink-muted);">R${h.round} · ${UI.escapeHtml(nm)}</span>
              <span style="color:var(--tg-cyan-ink);">${UI.escapeHtml(h.formula)}</span>
              <span style="color:var(--tg-gold-bright);font-weight:800;">+${h.points}</span>
            </div>
          `;
        })
        .join('');
    }
  },
});
