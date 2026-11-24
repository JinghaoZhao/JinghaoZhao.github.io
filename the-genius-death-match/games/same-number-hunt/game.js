/**
 * Same Number Hunt (寻找相同数字) — High-Voltage Broadcast Math Vault UI
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules, LETTERS } from './rules.js';

let lastEvtSig = null;
let keyBound = false;
let latestCtx = null;

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
- **开局 5 秒全盘记忆**：开场全部 16 块板同时翻开 5 秒，随后扣合。
- **目标降临 & 抢答**：每轮随机掉落自然数目标，抢先按下**红色抢答器**（或按空格键 / 双人热座按 \`A\` 与 \`L\`）。
- **5 秒三连选**：抢答者在 5 秒内按严格顺序点击 3 块不同字母板：**[数字 A] → [运算符] → [数字 B]**。
- **计分与 √x+√y 暴击**：等式精确等于目标值即得 **+1 分**；若使用 \`√x+√y\`（x, y ∈ {1,4,9} 拼出 3、4、5）独得 **+2 分**！
- **反击与记忆补给**：答错会公开翻开所选 3 块板并将**不限时反击权**交给对手；超时则不翻板直接移交。每轮结束后系统依次公开 1 块板（A→P）3 秒！`,
      en: `### Objective
A 4×4 (A–P) wall hides numbers **1–12** and **4 math operators** (S4E4 Official: \`+\`, \`×\`, \`÷\`, \`√x+√y\`). First to **10 points** wins!

### Flow & Scoring
- **5-Second Opening Flash**: All 16 tiles open for 5 seconds, then close.
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

    const { state, activeSeatId, isSpectator, mode, lang, lastEvent, dispatch, log } = ctx;
    if (!state) return;

    const sig = `${state.round}-${state.stepSeq}-${state.selectedPicks.length}-${lastEvent?.type || ''}`;
    if (sig !== lastEvtSig && lastEvent) {
      lastEvtSig = sig;
      if (lastEvent.type === 'BUZZED') {
        SFX.play('clash');
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `🔔 ${nm} 抢答成功！目标：${lastEvent.target}`
            : `🔔 ${nm} hit the buzzer for Target ${lastEvent.target}!`,
          'alert'
        );
      } else if (lastEvent.type === 'TILE_SELECTED') {
        SFX.play('click');
      } else if (lastEvent.type === 'EQUATION_SOLVED') {
        SFX.play('cardFlip');
        SFX.play(lastEvent.points >= 2 ? 'combo' : 'garnetClink');
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `⚡ ${nm} 算式命中：${lastEvent.formula} (+${lastEvent.points}分)`
            : `⚡ ${nm} solved ${lastEvent.formula} (+${lastEvent.points} pt${lastEvent.points > 1 ? 's' : ''})`,
          'system'
        );
      } else if (lastEvent.type === 'EQUATION_WRONG') {
        SFX.play('cardFlip');
        SFX.play('error');
        const nm = state.players[lastEvent.seatId]?.name || '';
        log(
          lang === 'zh'
            ? `✖ ${nm} 等式失败 (${lastEvent.formula})，反击权移交对手！`
            : `✖ ${nm} missed (${lastEvent.formula}) — untimed rebound to opponent!`,
          'alert'
        );
      } else if (lastEvent.type === 'ANSWER_TIMEOUT') {
        SFX.play('eliminate');
        log(
          lang === 'zh' ? `⏱ 作答超时！不限时反击权移交对手。` : `⏱ Time up! Untimed rebound to opponent.`,
          'alert'
        );
      } else if (lastEvent.type === 'FLASH_ENDED' || lastEvent.type === 'TARGET_READY') {
        SFX.play('reveal');
      }
    }

    const p0 = state.players[state.seatOrder[0]];
    const p1 = state.players[state.seatOrder[1]];
    const isMyAnswering =
      !isSpectator &&
      state.phase === 'ANSWERING' &&
      (mode === 'hotseat' || state.activeBuzzerSeatId === activeSeatId);
    const answeringPlayer = state.activeBuzzerSeatId ? state.players[state.activeBuzzerSeatId] : null;
    const sqrtEligible = !state.classicMode && [3, 4, 5].includes(state.target);

    // Live equation slots
    const roleLabels =
      lang === 'zh' ? ['数字 A', '运算符', '数字 B'] : ['NUM A', 'OP', 'NUM B'];
    const picksToShow =
      state.phase === 'EVAL_REVEAL' && state.evalResult
        ? state.evalResult.picks
        : state.selectedPicks;

    const eqSlotsHtml = [0, 1, 2]
      .map((slotIdx) => {
        const tileIdx = picksToShow[slotIdx];
        const filled = tileIdx !== undefined;
        const tile = filled ? state.tiles[tileIdx] : null;
        const valText = filled ? (tile.revealed ? tile.display : `[${tile.letter}]`) : '?';
        return `
          <div class="snh-eq-slot ${slotIdx === 1 ? 'is-op' : ''} ${filled ? 'is-filled' : ''}">
            <span class="snh-eq-slot-role">${roleLabels[slotIdx]}</span>
            <span>${UI.escapeHtml(valText)}</span>
          </div>
        `;
      })
      .join('');

    const eqBarCls =
      state.phase === 'EVAL_REVEAL' && state.evalResult
        ? state.evalResult.matched
          ? 'snh-equation-bar is-success'
          : 'snh-equation-bar is-fail'
        : 'snh-equation-bar';

    const eqRightHtml =
      state.phase === 'EVAL_REVEAL' && state.evalResult
        ? state.evalResult.matched
          ? `<span class="snh-eq-equals">= ${state.target} ✓</span><span class="tg-badge tg-badge-emerald">+${state.evalResult.points} PT${state.evalResult.points > 1 ? 'S' : ''}</span>`
          : `<span class="snh-eq-equals" style="color:var(--tg-garnet-bright);">${UI.escapeHtml(state.evalResult.formulaText)} ✗</span>`
        : `<span class="snh-eq-equals">= ${state.target ?? '?'}</span>`;

    // 4x4 Tiles
    const tilesHtml = state.tiles
      .map((t) => {
        const pickOrder = state.selectedPicks.indexOf(t.idx);
        const isPicked = pickOrder >= 0;
        const canPick = isMyAnswering && !isPicked && state.selectedPicks.length < 3;
        const cls = ['snh-tile'];
        if (t.revealed) cls.push('is-flipped');
        if (canPick) cls.push('is-clickable');
        if (isPicked) cls.push('is-picked');
        if (t.kind === 'op') cls.push('is-op');
        if (t.value === 'sqrt') cls.push('is-sqrt');
        if (state.phase === 'HINT_REVEAL' && state.hintTileIdx === t.idx) cls.push('is-hint-glow');

        return `
          <button
            type="button"
            class="${cls.join(' ')}"
            data-snh-idx="${t.idx}"
            ${canPick ? '' : 'disabled'}
            aria-label="Tile ${t.letter}"
          >
            <div class="snh-tile-inner">
              <div class="snh-tile-face snh-tile-front">
                <span class="snh-tile-letter">${t.letter}</span>
                ${isPicked ? `<span class="snh-pick-order">#${pickOrder + 1}</span>` : ''}
              </div>
              <div class="snh-tile-face snh-tile-back">
                <span class="snh-tile-corner">${t.letter}</span>
                <span class="snh-tile-val">${UI.escapeHtml(t.display ?? '')}</span>
                <span class="snh-tile-type">${
                  t.kind === 'op' ? (t.value === 'sqrt' ? '+2 BONUS' : 'OP') : 'NUM'
                }</span>
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    // Right console action block
    let consoleActionHtml = '';
    if (state.phase === 'INITIAL_FLASH') {
      consoleActionHtml = `
        <span class="tg-badge tg-badge-gold">${lang === 'zh' ? '全盘倒计时记忆' : 'OPENING FLASH'}</span>
        <div style="font-size:14px;color:var(--tg-ink);font-weight:600;">
          ${lang === 'zh' ? '牢记 1–12 与 4 个运算符号的位置！5 秒后全部扣合。' : 'Memorize numbers 1–12 and all 4 operators before the wall closes!'}
        </div>
        ${
          !isSpectator
            ? `<button type="button" class="tg-btn tg-btn-cyan" id="snh-skip-btn">${lang === 'zh' ? '已记住 · 立即出题' : 'Ready · Drop Target'}</button>`
            : ''
        }
      `;
    } else if (state.phase === 'HINT_REVEAL') {
      const hLetter = LETTERS[state.hintTileIdx ?? 0];
      consoleActionHtml = `
        <span class="tg-badge tg-badge-gold">${lang === 'zh' ? 'S4 记忆补给' : 'MEMORY REFRESH'}</span>
        <div style="font-size:14px;color:var(--tg-ink);font-weight:600;">
          ${lang === 'zh' ? `公开面板 [${hLetter}] 3 秒供双方记忆刷新！` : `Tile [${hLetter}] revealed for 3 seconds!`}
        </div>
        ${
          !isSpectator
            ? `<button type="button" class="tg-btn tg-btn-ghost" id="snh-skip-btn">${lang === 'zh' ? '下一目标' : 'Next Target'}</button>`
            : ''
        }
      `;
    } else if (state.phase === 'EVAL_REVEAL') {
      const ev = state.evalResult;
      consoleActionHtml = `
        <span class="tg-badge ${ev?.matched ? 'tg-badge-emerald' : 'tg-badge-garnet'}">
          ${ev?.matched ? (lang === 'zh' ? '验证通过' : 'VERIFIED') : lang === 'zh' ? '等式失败' : 'MISMATCH'}
        </span>
        <div style="font-family:var(--tg-font-mono);font-size:17px;font-weight:800;color:${ev?.matched ? '#86efac' : '#ff99ab'};">
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
        consoleActionHtml = `
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
        consoleActionHtml = `
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
      consoleActionHtml = `
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
      consoleActionHtml = `
        <span class="tg-badge tg-badge-gold">FINAL BOARD REVEALED</span>
        <div style="font-size:14px;color:var(--tg-ink-muted);">${lang === 'zh' ? '全部 16 块算术面板已揭示。' : 'All 16 vault panels revealed.'}</div>
      `;
    }

    const renderScoreCard = (p) => {
      const pct = Math.min(100, Math.round((p.score / state.winScore) * 100));
      const isAct = state.activeBuzzerSeatId === p.seatId && state.phase === 'ANSWERING';
      return `
        <div class="snh-score-card ${isAct ? `is-active-${p.color}` : ''}">
          <div class="snh-score-top">
            <span style="color:${p.color === 'cyan' ? '#67e8f9' : '#ff8ba0'};">
              ${UI.escapeHtml(p.avatar || '♦')} ${UI.escapeHtml(p.name)}
            </span>
            <span class="snh-score-num">${p.score} <span style="font-size:12px;color:var(--tg-ink-faint);">/ ${state.winScore}</span></span>
          </div>
          <div class="snh-score-bar">
            <div class="snh-score-fill is-${p.color}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    };

    const historyHtml = (state.history || [])
      .slice(-6)
      .reverse()
      .map((h) => {
        const nm = state.players[h.seatId]?.name || '';
        return `
          <div class="snh-history-row">
            <span style="color:var(--tg-ink-muted);">R${h.round} · ${UI.escapeHtml(nm)}</span>
            <span style="color:var(--tg-cyan);">${UI.escapeHtml(h.formula)}</span>
            <span style="color:var(--tg-gold-bright);font-weight:800;">+${h.points}</span>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="snh-arena">
        <div class="snh-vault-header">
          ${renderScoreCard(p0)}
          <div class="snh-target-orb ${sqrtEligible ? 'is-sqrt-bonus' : ''}">
            <span class="snh-target-orb-label">${lang === 'zh' ? '目标数' : 'TARGET'}</span>
            <span class="snh-target-orb-num">${state.target ?? '—'}</span>
            ${sqrtEligible ? `<span class="snh-target-orb-tag">√x+√y +2!</span>` : ''}
          </div>
          ${renderScoreCard(p1)}
        </div>

        <div class="${eqBarCls}">
          ${eqSlotsHtml}
          ${eqRightHtml}
        </div>

        <div class="snh-body">
          <div class="snh-wall-card">
            <div class="snh-grid">${tilesHtml}</div>
          </div>

          <div class="snh-console">
            <div class="snh-buzzer-panel">${consoleActionHtml}</div>
            ${
              historyHtml
                ? `<div class="snh-history-panel">
                    <div style="font-family:var(--tg-font-mono);font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--tg-gold);margin-bottom:8px;">
                      ${lang === 'zh' ? '已破解算式记录' : 'SOLVED EQUATIONS'}
                    </div>
                    <div class="snh-history-list">${historyHtml}</div>
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;

    container.querySelector('#snh-buzz-btn')?.addEventListener('click', () => {
      dispatch({ type: 'BUZZ' });
    });

    container.querySelectorAll('[data-hs-buzz]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dispatch({ type: 'BUZZ', payload: { buzzerSeatId: btn.dataset.hsBuzz } });
      });
    });

    container.querySelectorAll('[data-snh-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dispatch({ type: 'PICK_TILE', payload: { tileIdx: Number(btn.dataset.snhIdx) } });
      });
    });

    container.querySelector('#snh-clear-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'CLEAR_PICKS' });
    });

    container.querySelector('#snh-pass-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'PASS_REBOUND' });
    });

    container.querySelector('#snh-skip-btn')?.addEventListener('click', () => {
      SFX.play('click');
      dispatch({ type: 'SKIP_FLASH' });
    });
  },
});
