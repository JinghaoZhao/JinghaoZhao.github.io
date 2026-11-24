/**
 * Laser Chess (레이저 장기 / 激光象棋) — Showstopper SVG Optical Renderer
 */

import { mountGame, SFX, UI } from '../../shared/sdk.js';
import {
  GameRules,
  PIECE_INFO,
  traceLaser,
  getLegalMovesForPiece,
  canRotatePiece,
} from './rules.js';

let selected = null; // { r, c } | null
let showPreviewBeam = false;
let lastEventSig = null;

const CELL = 68;
const PAD = 26;

/**
 * Renders crisp bespoke vector metallic/crystal optical piece centered at (cx, cy).
 * Rotation angle = piece.dir * 90° matches rules.js optical physics 100%!
 */
function renderPieceSvg(piece, cx, cy) {
  const isRed = piece.owner === 0;
  const bodyGrad = isRed ? 'url(#lc-body-red)' : 'url(#lc-body-cyan)';
  const rimCol = isRed ? '#ff5c7c' : '#38bdf8';
  const mirrorGlow = isRed ? '#fff0c2' : '#e0faff';
  const rot = piece.dir * 90;

  if (piece.type === 'laser') {
    // Default dir=0 points UP (North)
    return `
      <g transform="translate(${cx},${cy}) rotate(${rot})">
        <polygon points="0,-26 19,-10 19,21 -19,21 -19,-10" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="2" />
        <rect x="-6" y="-27" width="12" height="16" rx="3" fill="#0b0e18" stroke="${rimCol}" stroke-width="1.6" />
        <circle cx="0" cy="-21" r="4" fill="${isRed ? '#ff2e54' : '#22d3ee'}" filter="url(#lc-glow)" />
        <circle cx="0" cy="4" r="9" fill="rgba(0,0,0,0.55)" stroke="${mirrorGlow}" stroke-width="1.4" />
        <circle cx="0" cy="4" r="4.5" fill="${isRed ? '#ff2e54' : '#22d3ee'}" />
      </g>
    `;
  }

  if (piece.type === 'king') {
    return `
      <g transform="translate(${cx},${cy})">
        <polygon points="0,-24 22,-7 14,22 -14,22 -22,-7" fill="${bodyGrad}" stroke="#fff0c2" stroke-width="2.2" />
        <polygon points="-13,8 -10,-9 -3,-1 0,-13 3,-1 10,-9 13,8" fill="url(#lc-gold)" stroke="#1b1204" stroke-width="1.2" />
        <rect x="-12" y="10" width="24" height="5" rx="2" fill="#fff0c2" />
        <text x="0" y="3" text-anchor="middle" fill="#180d03" font-size="9" font-weight="900">王</text>
      </g>
    `;
  }

  if (piece.type === 'triangle') {
    // dir=0: solid SW body, reflective hypotenuse from NW (-21,-21) to SE (21,21) facing NE (N & E)!
    return `
      <g transform="translate(${cx},${cy}) rotate(${rot})">
        <polygon points="-21,-21 -21,21 21,21" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" stroke-linejoin="round" />
        <polygon points="-16,-8 -16,16 8,16" fill="rgba(0,0,0,0.35)" />
        <!-- Beveled Mirror Hypotenuse -->
        <line x1="-21" y1="-21" x2="21" y2="21" stroke="${mirrorGlow}" stroke-width="5.5" stroke-linecap="round" filter="url(#lc-glow)" />
        <line x1="-20" y1="-20" x2="20" y2="20" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      </g>
    `;
  }

  if (piece.type === 'square') {
    // dir=0: armored mirror along TOP edge (facing North)
    return `
      <g transform="translate(${cx},${cy}) rotate(${rot})">
        <rect x="-20" y="-19" width="40" height="39" rx="6" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" />
        <rect x="-11" y="-5" width="22" height="17" rx="3" fill="rgba(0,0,0,0.42)" stroke="rgba(255,255,255,0.14)" stroke-width="1" />
        <!-- Armored Mirror Front Edge -->
        <rect x="-21" y="-22" width="42" height="8" rx="3" fill="url(#lc-mirror-bar)" stroke="#ffffff" stroke-width="1.2" filter="url(#lc-glow)" />
      </g>
    `;
  }

  if (piece.type === 'splitter') {
    // Half-silvered 45° beam-splitting diamond prism: dir=0 -> '\', dir=1 -> '/'
    const angle = piece.dir % 2 === 0 ? 0 : 90;
    return `
      <g transform="translate(${cx},${cy}) rotate(${angle})">
        <polygon points="0,-24 24,0 0,24 -24,0" fill="rgba(14,22,38,0.88)" stroke="${rimCol}" stroke-width="1.8" />
        <polygon points="0,-16 16,0 0,16 -16,0" fill="url(#lc-prism)" opacity="0.72" />
        <line x1="-20" y1="-20" x2="20" y2="20" stroke="#fff0c2" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 3" filter="url(#lc-glow)" />
        <line x1="-20" y1="-20" x2="20" y2="20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="0" cy="0" r="4.5" fill="#fff0c2" />
      </g>
    `;
  }

  if (piece.type === 'scarab') {
    // Double-sided 45° Scarab mirror: dir=0 -> '\', dir=1 -> '/'
    const angle = piece.dir % 2 === 0 ? 0 : 90;
    return `
      <g transform="translate(${cx},${cy}) rotate(${angle})">
        <circle cx="0" cy="0" r="21" fill="${bodyGrad}" stroke="${rimCol}" stroke-width="1.8" />
        <line x1="-21" y1="-21" x2="21" y2="21" stroke="${mirrorGlow}" stroke-width="7" stroke-linecap="round" filter="url(#lc-glow)" />
        <line x1="-21" y1="-21" x2="21" y2="21" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="0" cy="0" r="5" fill="#090c14" stroke="#fff0c2" stroke-width="1.6" />
      </g>
    `;
  }

  return '';
}

function renderBeamSvg(beam, isPreview = false) {
  if (!beam || !beam.segments || beam.segments.length === 0) return '';
  const isRed = beam.owner === 0;
  const colOuter = isRed ? '#ff1e4d' : '#06b6d4';
  const colMid = isRed ? '#ff6b8b' : '#67e8f9';
  const opacity = isPreview ? 0.36 : 0.96;

  let lines = '';
  for (const seg of beam.segments) {
    const x1 = PAD + seg.c1 * CELL + CELL / 2;
    const y1 = PAD + seg.r1 * CELL + CELL / 2;
    const x2 = PAD + seg.c2 * CELL + CELL / 2;
    const y2 = PAD + seg.r2 * CELL + CELL / 2;

    if (isPreview) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colMid}" stroke-width="2.5" stroke-dasharray="6 5" opacity="${opacity}" />`;
    } else {
      lines += `
        <line class="lc-beam-flash" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colOuter}" stroke-width="9" stroke-linecap="round" opacity="0.42" filter="url(#lc-beam-glow)" />
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colMid}" stroke-width="4" stroke-linecap="round" opacity="${opacity}" />
        <line class="lc-beam-flow" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.95" />
      `;
    }
  }

  let sparks = '';
  if (!isPreview) {
    for (const sp of beam.sparks || []) {
      const cx = PAD + sp.c * CELL + CELL / 2;
      const cy = PAD + sp.r * CELL + CELL / 2;
      if (sp.kind === 'reflect' || sp.kind === 'split') {
        const sparkCol = sp.kind === 'split' ? '#fff0c2' : colMid;
        sparks += `
          <g class="lc-spark-ring" transform="translate(${cx},${cy})">
            <circle r="${sp.kind === 'split' ? 11 : 7}" fill="${sparkCol}" opacity="0.35" filter="url(#lc-beam-glow)" />
            <circle r="3.5" fill="#ffffff" />
          </g>
        `;
      } else if (sp.kind === 'shield') {
        sparks += `
          <circle class="lc-spark-ring" cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#fff0c2" stroke-width="2.2" opacity="0.8" />
        `;
      } else if (sp.kind === 'destroy') {
        sparks += `
          <g class="lc-shatter-burst" transform="translate(${cx},${cy})">
            <circle r="24" fill="rgba(255,46,84,0.38)" stroke="#fff0c2" stroke-width="2.5" />
            <path d="M-18,-18 L18,18 M18,-18 L-18,18 M0,-24 L0,24 M-24,0 L24,0" stroke="#fff6d9" stroke-width="2.4" stroke-linecap="round" />
          </g>
        `;
      }
    }
  }

  return `<g pointer-events="none">${lines}${sparks}</g>`;
}

function renderOpticalBoardSvg(state, isMyTurn, legalMap, previewBeam) {
  const { rows, cols, board } = state;
  const W = PAD * 2 + cols * CELL;
  const H = PAD * 2 + rows * CELL;
  const colLabels = 'ABCDEFGHIJ'.slice(0, cols).split('');

  let coordsSvg = '';
  for (let c = 0; c < cols; c++) {
    const x = PAD + c * CELL + CELL / 2;
    coordsSvg += `<text x="${x}" y="16" text-anchor="middle" fill="rgba(228,185,91,0.5)" font-size="10.5" font-weight="700" font-family="var(--tg-font-mono)">${colLabels[c]}</text>`;
    coordsSvg += `<text x="${x}" y="${H - 8}" text-anchor="middle" fill="rgba(228,185,91,0.5)" font-size="10.5" font-weight="700" font-family="var(--tg-font-mono)">${colLabels[c]}</text>`;
  }
  for (let r = 0; r < rows; r++) {
    const y = PAD + r * CELL + CELL / 2 + 4;
    coordsSvg += `<text x="12" y="${y}" text-anchor="middle" fill="rgba(228,185,91,0.5)" font-size="10.5" font-weight="700" font-family="var(--tg-font-mono)">${rows - r}</text>`;
    coordsSvg += `<text x="${W - 12}" y="${y}" text-anchor="middle" fill="rgba(228,185,91,0.5)" font-size="10.5" font-weight="700" font-family="var(--tg-font-mono)">${rows - r}</text>`;
  }

  let cellsSvg = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;
      const piece = board[r][c];
      const isSel = selected && selected.r === r && selected.c === c;
      const legal = legalMap.get(`${r},${c}`);
      const isLastTo = state.lastAction && state.lastAction.toR === r && state.lastAction.toC === c;
      const isCornerP1 = r === 0 && c === 0;
      const isCornerP0 = r === rows - 1 && c === cols - 1;
      const alt = (r + c) % 2 === 0;

      let fill = alt ? 'rgba(17, 21, 36, 0.94)' : 'rgba(11, 14, 24, 0.97)';
      let stroke = 'rgba(228, 185, 91, 0.14)';
      let sw = 1;

      if (isCornerP1) {
        fill = 'rgba(14, 52, 74, 0.72)';
        stroke = 'rgba(34, 211, 238, 0.55)';
      } else if (isCornerP0) {
        fill = 'rgba(72, 12, 28, 0.72)';
        stroke = 'rgba(255, 46, 84, 0.55)';
      }

      if (isLastTo) {
        stroke = 'rgba(228, 185, 91, 0.58)';
        sw = 1.6;
      }
      if (isSel) {
        stroke = '#fff0c2';
        sw = 2.6;
      } else if (legal) {
        stroke = legal.kind === 'swap' ? '#f59e0b' : '#22d3ee';
        sw = 2.2;
      }

      cellsSvg += `
        <g class="${isMyTurn ? 'lc-cell-hit' : ''}" data-r="${r}" data-c="${c}">
          <rect class="lc-cell-rect" x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7"
            fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />
          ${
            legal
              ? legal.kind === 'swap'
                ? `<rect x="${x + 5}" y="${y + 5}" width="${CELL - 10}" height="${CELL - 10}" rx="6" fill="rgba(245,158,11,0.16)" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 3" />`
                : `<circle cx="${cx}" cy="${cy}" r="9" fill="rgba(34,211,238,0.45)" stroke="#67e8f9" stroke-width="2" />`
              : ''
          }
          ${piece ? renderPieceSvg(piece, cx, cy) : ''}
        </g>
      `;
    }
  }

  return `
    <svg class="lc-board-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Laser Chess Optical Arena">
      <defs>
        <linearGradient id="lc-body-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b1029" />
          <stop offset="55%" stop-color="#4e0817" />
          <stop offset="100%" stop-color="#220309" />
        </linearGradient>
        <linearGradient id="lc-body-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#115e79" />
          <stop offset="55%" stop-color="#0b344a" />
          <stop offset="100%" stop-color="#051724" />
        </linearGradient>
        <linearGradient id="lc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff6d9" />
          <stop offset="50%" stop-color="#e4b95b" />
          <stop offset="100%" stop-color="#a67521" />
        </linearGradient>
        <linearGradient id="lc-mirror-bar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#cbd5e1" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <linearGradient id="lc-prism" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#67e8f9" />
          <stop offset="50%" stop-color="#fff0c2" />
          <stop offset="100%" stop-color="#ff6b8b" />
        </linearGradient>
        <filter id="lc-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="lc-beam-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Subtle outer metallic frame -->
      <rect x="${PAD - 4}" y="${PAD - 4}" width="${cols * CELL + 8}" height="${rows * CELL + 8}" rx="11"
        fill="#070911" stroke="rgba(228,185,91,0.34)" stroke-width="1.5" />

      ${coordsSvg}
      ${cellsSvg}
      ${previewBeam ? renderBeamSvg(previewBeam, true) : ''}
      ${state.lastBeam ? renderBeamSvg(state.lastBeam, false) : ''}
    </svg>
  `;
}

mountGame({
  config: {
    id: 'laser-chess',
    title: { zh: '激光象棋', en: 'Laser Chess', ko: '레이저 장기' },
    seasons: ['S2'],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 3,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'arenaPreset',
        label: { zh: '战场格局', en: 'Optical Arena' },
        type: 'select',
        default: 's2_broadcast',
        options: [
          { value: 's2_broadcast', label: { zh: 'S2E5 官方 8×8（含分光镜）', en: 'S2E5 Official 8×8 (Beam Splitter)' } },
          { value: 'grand_8x10',   label: { zh: '经典 8×10 镜像殿堂（圣甲虫互换）', en: 'Grand Mirror 8×10 (Scarab Swap)' } },
        ],
      },
    ],
    rulesSummary: {
      zh: `### 激光象棋（S2E5 · 林遥焕 vs 林允善）
在反射光学棋盘上指挥镜面骑士、分光棱镜与角落激光炮，**摧毁敌方「王」即刻获胜！**

### 每回合行动（二选一，随后自动发射激光）
1. **移动 1 格**：将己方任意可移动棋子向周围 8 个方向移动 1 格至空格（8×10 模式下圣甲虫可与相邻三棱镜/四棱盾互换位置）。
2. **原地旋转 90°**：将己方任意棋子（含角落激光炮）顺时针或逆时针旋转 90°。
- 行动结束后，**己方角落激光炮自动开火**！

### 光学镜面法则
- **三棱镜 (Pyramid)**：斜镜面 90° 反射激光；击中背面两条直角边即汽化销毁。
- **四棱盾 (Anubis)**：正面厚镜安全阻挡激光；击中其余三侧即销毁。
- **分光镜 (Splitter)**：不可摧毁！让激光**同时直穿并 90° 反射分裂成两道光束**！
- **王 (Pharaoh)**：无任何镜面防护，被敌我任意激光击中立即淘汰（切勿误伤己方王棋！）。`,
      en: `### Laser Chess (S2E5 · Lim Yo-hwan vs Lim Yoon-sun)
Command reflective mirrors, half-silvered beam splitters, and your corner laser cannon—**vaporize the enemy King to win!**

### Turn Structure (Pick One, Then Auto-Fire Laser)
1. **Move 1 Square** in any of the 8 directions into an empty square (in 8×10 Grand Arena, Scarabs can also swap with an adjacent Pyramid or Anubis).
2. **Rotate 90°** CW or CCW on any of your pieces (including your corner Laser Cannon between its 2 inward axes).
- Immediately after your move, **your corner Laser fires automatically!**

### Optical Physics
- **Triangle Mirror (Pyramid)**: 45° mirrored face reflects laser 90°; hitting either back face destroys it.
- **Square Shield (Anubis)**: Front armored mirror blocks laser; hitting the other 3 sides destroys it.
- **Beam Splitter**: Indestructible! Lets laser pass straight AND reflects a 90° fork simultaneously!
- **King (Pharaoh)**: Unshielded—hit from any side (even friendly fire!) and it is vaporized immediately.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render: function renderLaserGame(container, ctx) {
    const { state, activeSeatId, lang, lastEvent, dispatch, setTelemetry } = ctx;
    if (!state) return;

    if (lastEvent && lastEvent !== lastEventSig) {
      lastEventSig = lastEvent;
      if (lastEvent.type === 'KING_VAPORIZED') {
        SFX.play('laserZap');
        setTimeout(() => SFX.play('clash'), 160);
      } else if (lastEvent.type === 'LASER_DESTROY') {
        SFX.play('laserZap');
        setTimeout(() => SFX.play('garnetClink'), 140);
      } else if (lastEvent.type === 'LASER_FIRE') {
        SFX.play('laserZap');
      }
      selected = null;
    }

    setTelemetry({
      round: state.round,
      phase: {
        zh: `${state.rows}×${state.cols} · 第 ${state.ply} 步`,
        en: `${state.rows}×${state.cols} · Ply ${state.ply}`,
      },
    });

    const isMyTurn =
      state.phase === 'playing' &&
      !ctx.isSpectator &&
      state.currentTurnSeatId === activeSeatId;

    if (!isMyTurn) selected = null;
    if (selected) {
      const sp = state.board[selected.r]?.[selected.c];
      if (!sp || sp.owner !== state.turnOwner) selected = null;
    }

    const legalMap = new Map();
    if (isMyTurn && selected) {
      for (const m of getLegalMovesForPiece(state.board, state.rows, state.cols, selected.r, selected.c)) {
        legalMap.set(`${m.r},${m.c}`, m);
      }
    }

    const previewBeam =
      showPreviewBeam && state.phase === 'playing'
        ? traceLaser(state.board, state.rows, state.cols, state.turnOwner)
        : null;

    const selPiece = selected ? state.board[selected.r][selected.c] : null;
    const selRotatable = selPiece && canRotatePiece(selPiece);
    const activeName = state.seats[state.turnOwner]?.name || '';

    const lastHitHtml =
      state.lastBeam?.destroyed?.length > 0
        ? `<div class="lc-event-alert">💥 ${
            lang === 'zh'
              ? `上一道激光汽化摧毁了 ${state.lastBeam.destroyed.map((d) => PIECE_INFO[d.piece.type].zh).join('、')}！`
              : `Last beam vaporized: ${state.lastBeam.destroyed.map((d) => PIECE_INFO[d.piece.type].en).join(', ')}!`
          }</div>`
        : '';

    const countAlive = (o) => {
      let n = 0;
      for (const row of state.board) for (const cell of row) if (cell && cell.owner === o) n++;
      return n;
    };

    const legendTypes =
      state.arenaMode === 'grand_8x10'
        ? ['laser', 'king', 'scarab', 'triangle', 'square']
        : ['laser', 'king', 'splitter', 'triangle', 'square'];

    const icons = { laser: '⚡', king: '王', splitter: '◇', scarab: '◈', triangle: '◢', square: '▀' };

    container.innerHTML = `
      <div class="lc-arena">
        <div class="lc-table-shell">
          ${renderOpticalBoardSvg(state, isMyTurn, legalMap, previewBeam)}
        </div>

        <div class="lc-console">
          <div class="lc-card">
            <h4 class="lc-card-title">
              <span>${lang === 'zh' ? '光学火控台' : 'Optical Control'}</span>
              <span class="tg-badge ${state.turnOwner === 0 ? 'tg-badge-garnet' : 'tg-badge-cyan'}">${
                state.turnOwner === 0
                  ? lang === 'zh'
                    ? '绯红激光'
                    : 'CRIMSON'
                  : lang === 'zh'
                  ? '电光青激光'
                  : 'CYAN'
              }</span>
            </h4>

            ${lastHitHtml}

            ${
              selPiece
                ? `
                  <div class="lc-sel-box">
                    <div class="lc-sel-name">${icons[selPiece.type]} ${UI.escapeHtml(PIECE_INFO[selPiece.type][lang])}</div>
                    <p class="lc-sel-desc">${UI.escapeHtml(lang === 'zh' ? PIECE_INFO[selPiece.type].descZh : PIECE_INFO[selPiece.type].descEn)}</p>
                    ${
                      selRotatable
                        ? selPiece.type === 'laser' || selPiece.type === 'splitter' || selPiece.type === 'scarab'
                          ? `<div style="margin-top:10px;"><button type="button" class="tg-btn tg-btn-gold" style="width:100%;" id="lc-btn-rot-cw">↻ ${lang === 'zh' ? '切换角度 90° 并发射激光' : 'Toggle 90° & Fire Laser'}</button></div>`
                          : `
                            <div class="lc-rotate-row">
                              <button type="button" class="tg-btn tg-btn-cyan" id="lc-btn-rot-ccw">↺ ${lang === 'zh' ? '逆时针 90°' : '90° CCW'}</button>
                              <button type="button" class="tg-btn tg-btn-gold" id="lc-btn-rot-cw">↻ ${lang === 'zh' ? '顺时针 90°' : '90° CW'}</button>
                            </div>
                          `
                        : ''
                    }
                  </div>
                `
                : `<p style="margin:0;font-size:13px;color:var(--tg-ink-muted);">${
                    state.phase === 'ended'
                      ? lang === 'zh'
                        ? '本场激光象棋已分出胜负！'
                        : 'Laser Chess match concluded!'
                      : isMyTurn
                      ? lang === 'zh'
                        ? '点击任意己方棋子：高亮可移动格，并可原地旋转 90°（随后自动发射激光）。'
                        : 'Select any of your pieces to move 1 square OR rotate 90° (laser fires automatically!).'
                      : lang === 'zh'
                      ? `等待 ${UI.escapeHtml(activeName)} 调整镜阵…`
                      : `Waiting for ${UI.escapeHtml(activeName)}…`
                  }</p>`
            }

            <div style="margin-top:11px;display:flex;gap:8px;">
              <button type="button" class="tg-btn tg-btn-sm ${showPreviewBeam ? 'tg-btn-cyan' : 'tg-btn-ghost'}" style="width:100%;" id="lc-btn-sightline">
                ◎ ${showPreviewBeam ? (lang === 'zh' ? '隐藏当前光路预览' : 'Hide Beam Preview') : (lang === 'zh' ? '显示当前光路预览' : 'Preview Current Beam')}
              </button>
            </div>
          </div>

          <div class="lc-card">
            <h4 class="lc-card-title">${lang === 'zh' ? '阵列存活统计' : 'Array Status'}</h4>
            <div class="lc-kill-strip">
              <div class="lc-side-row is-p0">
                <span><strong>${UI.escapeHtml(state.seats[0].name)}</strong></span>
                <span style="font-family:var(--tg-font-mono);color:#ff94a8;">${countAlive(0)} ${lang === 'zh' ? '存' : 'alive'} · ${state.capturedBy[0].length} ${lang === 'zh' ? '击毁' : 'hits'}</span>
              </div>
              <div class="lc-side-row is-p1">
                <span><strong>${UI.escapeHtml(state.seats[1].name)}</strong></span>
                <span style="font-family:var(--tg-font-mono);color:#67e8f9;">${countAlive(1)} ${lang === 'zh' ? '存' : 'alive'} · ${state.capturedBy[1].length} ${lang === 'zh' ? '击毁' : 'hits'}</span>
              </div>
            </div>
          </div>

          <div class="lc-card">
            <h4 class="lc-card-title">${lang === 'zh' ? '光学棋子图鉴' : 'Optical Units'}</h4>
            <div class="lc-piece-legend">
              ${legendTypes
                .map(
                  (t) => `<div class="lc-legend-item"><span class="lc-legend-badge">${icons[t]}</span><span><strong>${UI.escapeHtml(PIECE_INFO[t][lang])}</strong></span></div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Cell clicks
    container.querySelectorAll('.lc-cell-hit').forEach((g) => {
      g.addEventListener('click', async () => {
        if (!isMyTurn) return;
        const r = Number(g.dataset.r);
        const c = Number(g.dataset.c);

        if (selected && legalMap.has(`${r},${c}`)) {
          const fromR = selected.r;
          const fromC = selected.c;
          selected = null;
          const res = await dispatch({ type: 'MOVE', payload: { fromR, fromC, toR: r, toC: c } });
          if (!res.ok) {
            SFX.play('error');
            UI.toast(res.reason || 'Illegal move', 'error');
          }
          return;
        }

        const p = state.board[r]?.[c];
        if (p && p.owner === state.turnOwner) {
          SFX.play('click');
          if (selected && selected.r === r && selected.c === c) {
            selected = null;
          } else {
            selected = { r, c };
          }
          renderLaserGame(container, ctx);
        } else if (selected) {
          selected = null;
          renderLaserGame(container, ctx);
        }
      });
    });

    // Rotate buttons
    container.querySelector('#lc-btn-rot-cw')?.addEventListener('click', async () => {
      if (!isMyTurn || !selected) return;
      const { r, c } = selected;
      selected = null;
      const res = await dispatch({ type: 'ROTATE', payload: { r, c, delta: 1 } });
      if (!res.ok) {
        SFX.play('error');
        UI.toast(res.reason || 'Cannot rotate', 'error');
      }
    });

    container.querySelector('#lc-btn-rot-ccw')?.addEventListener('click', async () => {
      if (!isMyTurn || !selected) return;
      const { r, c } = selected;
      selected = null;
      const res = await dispatch({ type: 'ROTATE', payload: { r, c, delta: -1 } });
      if (!res.ok) {
        SFX.play('error');
        UI.toast(res.reason || 'Cannot rotate', 'error');
      }
    });

    // Sightline toggle
    container.querySelector('#lc-btn-sightline')?.addEventListener('click', () => {
      SFX.play('click');
      showPreviewBeam = !showPreviewBeam;
      renderLaserGame(container, ctx);
    });
  },
});
