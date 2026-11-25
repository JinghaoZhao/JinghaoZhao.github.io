/**
 * The Genius: Death Match Archive — Interactive Hub Controller
 * Features:
 *  - Theme-Aware Volumetric Spotlight & Faceted Garnet Crystal Canvas (auto-pauses offscreen/hidden/reduced-motion)
 *  - Persistent Segmented Filter Pills with Sliding Indicator (`Motion.slideIndicator`)
 *  - Keyed 60fps Foil-Tilt Game Cards with FLIP Reorder (`Motion.flipList`) & Cached Rects
 *  - Crossfade Grid <-> 44-Episode Chronicle & ZH <-> EN Switcher (`Motion.crossfade`)
 *  - Interruptible Modals (`Motion.transitionPresence`), Numeric Rollups (`Motion.animateNumber`) & Nudge Errors
 */

import { I18n, SFX, UI, Motion, Theme, GarnetVault, normalizeRoomCode } from './shared/sdk.js';

Theme.init();

const ICONS = {
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  volOn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  waveOn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h3l2-6 4 12 3-8 2 2h6"/></svg>`,
  waveOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12h4l2-3 4 6 2-3h8" opacity="0.55"/></svg>`,
};

const SEASONS = [
  { id: 'ALL', zh: '全部四季', en: 'All Seasons' },
  { id: 'S1', zh: 'S1 游戏的法则', en: 'S1 Rules of the Game' },
  { id: 'S2', zh: 'S2 规则破坏者', en: 'S2 Rule Breaker' },
  { id: 'S3', zh: 'S3 黑加内特', en: 'S3 Black Garnet' },
  { id: 'S4', zh: 'S4 总决赛', en: 'S4 Grand Final' },
];

const MECHANICS = [
  { id: 'ALL', zh: '全部类型', en: 'All Mechanics' },
  { id: 'Bluffing', zh: '心理博弈', en: 'Bluffing' },
  { id: 'Board Strategy', zh: '棋盘策略', en: 'Board Strategy' },
  { id: 'Memory & Logic', zh: '记忆推理', en: 'Memory & Logic' },
  { id: 'Auction & Math', zh: '拍卖计算', en: 'Auction & Math' },
  { id: 'Pattern & Speed', zh: '眼力速算', en: 'Pattern & Speed' },
  { id: 'Mind Games', zh: '社交博弈', en: 'Mind Games' },
];

const SEASON_META = {
  S1: { zh: '第一季 · 游戏的法则 (2013)', en: 'Season 1 · Rules of the Game (2013)', ko: '게임의 법칙', cls: 's1' },
  S2: { zh: '第二季 · 规则破坏者 (2013–2014)', en: 'Season 2 · Rule Breaker (2013–2014)', ko: '룰 브레이커', cls: 's2' },
  S3: { zh: '第三季 · 黑加内特 (2014)', en: 'Season 3 · Black Garnet (2014)', ko: '블랙 가넷', cls: 's3' },
  S4: { zh: '第四季 · 总决赛 (2015)', en: 'Season 4 · Grand Final (2015)', ko: '그랜드 파이널', cls: 's4' },
};

function renderEmblemSvg(iconKey, accent = '#ff2e54') {
  const gold = '#e4b95b';
  const cyan = '#22d3ee';
  switch (iconKey) {
    case 'poker':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="6" y="10" width="22" height="30" rx="4" transform="rotate(-10 17 25)" fill="rgba(228,185,91,0.08)" stroke="${gold}" stroke-width="1.8"/>
        <rect x="19" y="8" width="22" height="30" rx="4" transform="rotate(8 30 23)" fill="rgba(217,27,58,0.28)" stroke="${accent}" stroke-width="1.8"/>
        <polygon points="30,17 35,23 30,29 25,23" fill="${gold}"/>
      </svg>`;
    case 'laser':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <line x1="6" y1="36" x2="24" y2="18" stroke="${cyan}" stroke-width="2.6" stroke-linecap="round"/>
        <line x1="24" y1="18" x2="42" y2="30" stroke="${accent}" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="18" y="11" width="12" height="4" rx="2" transform="rotate(-35 24 18)" fill="${gold}"/>
        <circle cx="24" cy="18" r="3.5" fill="#fff"/>
      </svg>`;
    case 'janggi':
    case 'chess':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <polygon points="24,6 39,14 39,34 24,42 9,34 9,14" fill="rgba(228,185,91,0.16)" stroke="${gold}" stroke-width="2"/>
        <text x="24" y="29" text-anchor="middle" fill="${accent}" font-size="16" font-weight="800" font-family="serif">將</text>
      </svg>`;
    case 'rail':
    case 'monorail':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <path d="M10 34 C10 18, 22 14, 24 24 C26 34, 38 30, 38 14" stroke="${cyan}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="10" cy="34" r="4" fill="${gold}"/>
        <circle cx="24" cy="24" r="3.5" fill="${accent}"/>
        <circle cx="38" cy="14" r="4" fill="${gold}"/>
      </svg>`;
    case 'maze':
    case 'memory':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="5" stroke="${gold}" stroke-width="1.8"/>
        <path d="M8 19 H28 V29 H18 V40 M28 8 V14 M36 24 H40" stroke="${cyan}" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="14" cy="14" r="2.5" fill="${accent}"/>
      </svg>`;
    case 'tiles':
    case 'bw':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="8" y="10" width="14" height="28" rx="3" fill="#0d1018" stroke="${gold}" stroke-width="1.8"/>
        <rect x="26" y="10" width="14" height="28" rx="3" fill="#f3efe6" stroke="${accent}" stroke-width="1.8"/>
        <circle cx="15" cy="24" r="3" fill="${gold}"/>
        <circle cx="33" cy="24" r="3" fill="#111"/>
      </svg>`;
    case 'shapes':
    case 'gyulhap':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <circle cx="16" cy="17" r="7" stroke="${accent}" stroke-width="2.2"/>
        <polygon points="33,10 41,24 25,24" stroke="${gold}" stroke-width="2.2"/>
        <rect x="17" y="29" width="14" height="12" rx="2" stroke="${cyan}" stroke-width="2.2"/>
      </svg>`;
    case 'yut':
    case 'sticks':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="9" y="8" width="5" height="32" rx="2.5" fill="${gold}"/>
        <rect x="17" y="8" width="5" height="32" rx="2.5" fill="${accent}"/>
        <rect x="25" y="8" width="5" height="32" rx="2.5" fill="${gold}"/>
        <rect x="33" y="8" width="5" height="32" rx="2.5" fill="${cyan}"/>
      </svg>`;
    case 'auction':
    case 'scale':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <line x1="24" y1="9" x2="24" y2="39" stroke="${gold}" stroke-width="2.2"/>
        <line x1="10" y1="16" x2="38" y2="16" stroke="${gold}" stroke-width="2.2"/>
        <path d="M10 16 L6 28 H14 Z" fill="rgba(217,27,58,0.35)" stroke="${accent}" stroke-width="1.6"/>
        <path d="M38 16 L34 28 H42 Z" fill="rgba(34,211,238,0.25)" stroke="${cyan}" stroke-width="1.6"/>
        <line x1="16" y1="39" x2="32" y2="39" stroke="${gold}" stroke-width="2.4" stroke-linecap="round"/>
      </svg>`;
    case 'grid':
    case 'hunt':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="8" y="8" width="13" height="13" rx="3" stroke="${gold}" stroke-width="1.8"/>
        <rect x="27" y="8" width="13" height="13" rx="3" fill="rgba(217,27,58,0.32)" stroke="${accent}" stroke-width="1.8"/>
        <rect x="8" y="27" width="13" height="13" rx="3" fill="rgba(34,211,238,0.22)" stroke="${cyan}" stroke-width="1.8"/>
        <rect x="27" y="27" width="13" height="13" rx="3" stroke="${gold}" stroke-width="1.8"/>
      </svg>`;
    case 'rps':
    case 'hand':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <circle cx="24" cy="24" r="15" stroke="${gold}" stroke-width="1.8" stroke-dasharray="4 4"/>
        <polygon points="24,11 35,31 13,31" fill="rgba(217,27,58,0.28)" stroke="${accent}" stroke-width="2"/>
        <circle cx="24" cy="24" r="3" fill="${cyan}"/>
      </svg>`;
    case 'star':
    case 'cosmos':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <circle cx="15" cy="18" r="6" fill="rgba(228,185,91,0.3)" stroke="${gold}" stroke-width="1.8"/>
        <path d="M35 12 A7 7 0 1 0 38 24 A5.5 5.5 0 1 1 35 12 Z" fill="${cyan}"/>
        <polygon points="24,25 26.5,31 33,31.5 28,35.5 29.5,42 24,38.5 18.5,42 20,35.5 15,31.5 21.5,31" fill="${accent}"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <polygon points="24,5 40,17 34,41 24,45 14,41 8,17" fill="rgba(217,27,58,0.32)" stroke="${gold}" stroke-width="2"/>
        <polygon points="24,5 32,19 24,36 16,19" fill="rgba(255,255,255,0.22)"/>
      </svg>`;
  }
}

function normalizeMechanic(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('bluff') || s.includes('poker') || s.includes('bet') || s.includes('心理')) return 'Bluffing';
  if (s.includes('board') || s.includes('chess') || s.includes('abstract') || s.includes('strategy') || s.includes('棋')) return 'Board Strategy';
  if (s.includes('memory') || s.includes('deduction') || s.includes('logic') || s.includes('maze') || s.includes('记忆')) return 'Memory & Logic';
  if (s.includes('auction') || s.includes('bid') || s.includes('math') || s.includes('number') || s.includes('拍卖')) return 'Auction & Math';
  if (s.includes('pattern') || s.includes('speed') || s.includes('visual') || s.includes('set') || s.includes('速算')) return 'Pattern & Speed';
  return 'Mind Games';
}

function guessIconKey(game) {
  if (game.icon) return game.icon;
  const slug = String(game.slug || '').toLowerCase();
  if (slug.includes('poker') || slug.includes('quattro')) return 'poker';
  if (slug.includes('laser')) return 'laser';
  if (slug.includes('janggi') || slug.includes('chess')) return 'janggi';
  if (slug.includes('monorail')) return 'rail';
  if (slug.includes('maze') || slug.includes('memory')) return 'maze';
  if (slug.includes('black-and-white')) return 'tiles';
  if (slug.includes('gyul') || slug.includes('hap')) return 'shapes';
  if (slug.includes('yut')) return 'yut';
  if (slug.includes('auction') || slug.includes('betting') || slug.includes('number')) return 'auction';
  if (slug.includes('picture') || slug.includes('hunt')) return 'grid';
  if (slug.includes('rps')) return 'rps';
  if (slug.includes('sun') || slug.includes('moon') || slug.includes('star')) return 'star';
  return 'garnet';
}

// ============================================================================
// Theme-Aware Volumetric Spotlight & Faceted Garnet Canvas (Offscreen/Hidden Pause)
// ============================================================================
let modalOpenCount = 0;

function initBackdropCanvas() {
  const canvas = document.getElementById('hub-stage-canvas');
  if (!canvas) return { redraw: () => {}, updatePause: () => {} };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { redraw: () => {}, updatePause: () => {} };

  let w = 0;
  let h = 0;
  let mx = 0.5;
  let my = 0.3;
  let rafId = null;
  let heroVisible = true;
  let crystalRaf = null;
  let crystalLeaveTimer = null;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (Motion.reduced()) drawFrame(false);
  };

  // Separated 1:1 rAF-throttled Hero Crystal tilt (no conflict with outer float wrapper!)
  const crystal = document.getElementById('hero-garnet-crystal');
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX / Math.max(1, w);
    my = e.clientY / Math.max(1, h);
    if (!crystal || Motion.reduced() || !heroVisible) return;
    if (crystalRaf) return;
    crystalRaf = requestAnimationFrame(() => {
      crystalRaf = null;
      crystal.classList.add('is-tracking');
      const dx = (mx - 0.5) * 16;
      const dy = (my - 0.5) * -12;
      crystal.style.transform = `rotateY(${dx.toFixed(2)}deg) rotateX(${dy.toFixed(2)}deg)`;
      clearTimeout(crystalLeaveTimer);
      crystalLeaveTimer = setTimeout(() => {
        crystal.classList.remove('is-tracking');
      }, 140);
    });
  });

  document.addEventListener('pointerleave', () => {
    if (!crystal) return;
    crystal.classList.remove('is-tracking');
    crystal.style.transform = '';
  });

  const shards = Array.from({ length: 22 }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * 900,
    r: 5 + Math.random() * 12,
    vx: (Math.random() - 0.5) * 0.24,
    vy: -(0.14 + Math.random() * 0.38),
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.007,
    alpha: 0.12 + Math.random() * 0.24,
    isGold: Math.random() > 0.62,
  }));

  const embers = Array.from({ length: 36 }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * 900,
    r: 1 + Math.random() * 2,
    vy: -(0.2 + Math.random() * 0.5),
    vx: (Math.random() - 0.5) * 0.18,
    phase: Math.random() * Math.PI * 2,
  }));

  let t = 0;

  function drawFrame(advance = true) {
    if (advance) t += 0.008;
    const isLight = Theme.get() === 'light';
    ctx.clearRect(0, 0, w, h);

    // Sweeping Volumetric Studio Spotlights (Dark Noir vs Light Alabaster Studio)
    const beam1X = w * (0.28 + Math.sin(t * 0.7) * 0.12 + (mx - 0.5) * 0.05);
    const g1 = ctx.createRadialGradient(beam1X, -40, 20, beam1X, h * 0.35, w * 0.65);
    if (isLight) {
      g1.addColorStop(0, 'rgba(190, 18, 51, 0.08)');
      g1.addColorStop(0.45, 'rgba(190, 18, 51, 0.03)');
      g1.addColorStop(1, 'rgba(244, 241, 234, 0)');
    } else {
      g1.addColorStop(0, 'rgba(217, 27, 58, 0.22)');
      g1.addColorStop(0.45, 'rgba(130, 10, 32, 0.08)');
      g1.addColorStop(1, 'rgba(5, 6, 10, 0)');
    }
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const beam2X = w * (0.76 + Math.cos(t * 0.55) * 0.11 - (mx - 0.5) * 0.04);
    const g2 = ctx.createRadialGradient(beam2X, -30, 15, beam2X, h * 0.3, w * 0.52);
    if (isLight) {
      g2.addColorStop(0, 'rgba(184, 130, 24, 0.1)');
      g2.addColorStop(0.5, 'rgba(184, 130, 24, 0.03)');
      g2.addColorStop(1, 'rgba(244, 241, 234, 0)');
    } else {
      g2.addColorStop(0, 'rgba(228, 185, 91, 0.15)');
      g2.addColorStop(0.5, 'rgba(228, 185, 91, 0.04)');
      g2.addColorStop(1, 'rgba(5, 6, 10, 0)');
    }
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    const g3 = ctx.createRadialGradient(w * 0.12, h * 0.9, 10, w * 0.12, h * 0.9, w * 0.42);
    g3.addColorStop(0, isLight ? 'rgba(2, 132, 199, 0.06)' : 'rgba(34, 211, 238, 0.08)');
    g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    const alphaScale = isLight ? 0.55 : 1;
    for (const s of shards) {
      if (advance) {
        s.x += s.vx;
        s.y += s.vy;
        s.rot += s.vrot;
        if (s.y < -40) {
          s.y = h + 30;
          s.x = Math.random() * w;
        }
        if (s.x < -40) s.x = w + 30;
        if (s.x > w + 40) s.x = -30;
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha * alphaScale;
      ctx.beginPath();
      ctx.moveTo(0, -s.r);
      ctx.lineTo(s.r * 0.72, -s.r * 0.25);
      ctx.lineTo(s.r * 0.5, s.r);
      ctx.lineTo(-s.r * 0.5, s.r);
      ctx.lineTo(-s.r * 0.72, -s.r * 0.25);
      ctx.closePath();
      ctx.fillStyle = s.isGold
        ? isLight ? 'rgba(184, 130, 24, 0.45)' : 'rgba(228, 185, 91, 0.48)'
        : isLight ? 'rgba(190, 18, 51, 0.42)' : 'rgba(235, 30, 68, 0.58)';
      ctx.fill();
      ctx.strokeStyle = s.isGold ? 'rgba(184, 130, 24, 0.42)' : 'rgba(217, 27, 58, 0.36)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    for (const e of embers) {
      if (advance) {
        e.y += e.vy;
        e.x += e.vx + Math.sin(t * 2 + e.phase) * 0.14;
        if (e.y < -10) {
          e.y = h + 10;
          e.x = Math.random() * w;
        }
      }
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      const a = (0.2 + 0.18 * Math.sin(t * 3 + e.phase)) * alphaScale;
      ctx.fillStyle = isLight ? `rgba(184, 130, 24, ${a})` : `rgba(255, 224, 150, ${a})`;
      ctx.fill();
    }
  }

  function shouldAnimate() {
    return !Motion.reduced() && !document.hidden && heroVisible && modalOpenCount === 0;
  }

  function loop() {
    if (!shouldAnimate()) {
      rafId = null;
      return;
    }
    drawFrame(true);
    rafId = requestAnimationFrame(loop);
  }

  function updatePause() {
    if (shouldAnimate()) {
      if (rafId == null) rafId = requestAnimationFrame(loop);
    } else if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Pause when hero scrolls out of viewport
  const heroEl = document.getElementById('hub-hero');
  if (heroEl && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0]?.isIntersecting ?? true;
        updatePause();
      },
      { threshold: 0.05 }
    );
    io.observe(heroEl);
  }

  document.addEventListener('visibilitychange', updatePause);
  Motion.onReducedChange(() => {
    if (Motion.reduced()) drawFrame(false);
    updatePause();
  });
  Theme.onChange(() => drawFrame(false));

  resize();
  window.addEventListener('resize', resize);
  drawFrame(false);
  updatePause();

  return { redraw: () => drawFrame(false), updatePause };
}

// ============================================================================
// Hub State & Rendering (Zero InnerHTML Nukes on Filter Pills / Keyed Cards)
// ============================================================================
const hubState = {
  games: [],
  episodes: [],
  view: 'grid',
  season: 'ALL',
  mechanic: 'ALL',
  search: '',
};

const els = {
  navGarnetCount: document.getElementById('nav-garnet-count'),
  navStreakLabel: document.getElementById('nav-streak-label'),
  statEpisodesNum: document.getElementById('stat-episodes-num'),
  statGamesNum: document.getElementById('stat-games-num'),
  statPlayableNum: document.getElementById('stat-playable-num'),
  dockGameSelect: document.getElementById('dock-game-select'),
  dockRoomCode: document.getElementById('dock-room-code'),
  viewToggle: document.getElementById('hub-view-toggle'),
  seasonRow: document.getElementById('season-filter-row'),
  mechanicsRow: document.getElementById('mechanics-filter-row'),
  contentStage: document.getElementById('hub-content-stage'),
  arenaGridView: document.getElementById('arena-grid-view'),
  arenaGrid: document.getElementById('arena-grid'),
  arenaEmpty: document.getElementById('arena-empty'),
  chronicleView: document.getElementById('chronicle-view'),
  chronicleContainer: document.getElementById('chronicle-container'),
  chronicleEmpty: document.getElementById('chronicle-empty'),
  chipGridCount: document.getElementById('chip-grid-count'),
  chipChronicleCount: document.getElementById('chip-chronicle-count'),
  searchInput: document.getElementById('hub-search-input'),
  modalRoot: document.getElementById('hub-modal-root'),
  btnLang: document.getElementById('btn-lang-toggle'),
  btnTheme: document.getElementById('btn-theme-toggle'),
  iconTheme: document.getElementById('hub-icon-theme'),
  btnAmb: document.getElementById('btn-ambience'),
  iconAmb: document.getElementById('hub-icon-ambience'),
  btnMute: document.getElementById('btn-mute'),
  iconMute: document.getElementById('hub-icon-mute'),
};

let backdropCtrl = { redraw: () => {}, updatePause: () => {} };
const cardNodePool = new Map(); // slug -> HTMLElement
let prevGarnetCount = null;
let statsAnimatedOnce = false;
let lastThemeIcon = null;
let lastMuteIcon = null;
let lastAmbIcon = null;

function isGamePlayable(g) {
  const st = String(g.status || '').toLowerCase();
  return st === 'ready' || st === 'playable';
}

function getGameSeasons(g) {
  if (Array.isArray(g.seasons) && g.seasons.length) return g.seasons;
  if (Array.isArray(g.episodes)) {
    const set = new Set();
    g.episodes.forEach((ep) => {
      const m = String(ep).match(/^(S[1-4])/i);
      if (m) set.add(m[1].toUpperCase());
    });
    return [...set];
  }
  return [];
}

function getFilteredGames() {
  const q = hubState.search.trim().toLowerCase();
  return hubState.games.filter((g) => {
    const seasons = getGameSeasons(g);
    if (hubState.season !== 'ALL' && !seasons.includes(hubState.season)) return false;
    const mech = normalizeMechanic(g.mechanic || g.category);
    if (hubState.mechanic !== 'ALL' && mech !== hubState.mechanic) return false;
    if (q) {
      const hay = [
        g.slug,
        g.title?.zh,
        g.title?.en,
        g.title?.ko,
        g.tagline?.zh,
        g.tagline?.en,
        ...(g.episodes || []),
        mech,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function getFilteredEpisodes() {
  const q = hubState.search.trim().toLowerCase();
  const gameMap = new Map(hubState.games.map((g) => [g.slug, g]));
  return hubState.episodes.filter((ep) => {
    const seasonKey = `S${ep.season}`;
    if (hubState.season !== 'ALL' && seasonKey !== hubState.season) return false;
    const game = gameMap.get(ep.gameSlug);
    if (hubState.mechanic !== 'ALL') {
      const mech = normalizeMechanic(game?.mechanic || game?.category || '');
      if (mech !== hubState.mechanic) return false;
    }
    if (q) {
      const hay = [
        ep.id,
        seasonKey,
        ep.gameSlug,
        ep.gameTitle?.zh,
        ep.gameTitle?.en,
        game?.title?.zh,
        game?.title?.en,
        game?.title?.ko,
        ep.winner,
        ep.eliminated,
        ep.note,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function syncHeaderControls(animateIcons = false) {
  const isZh = I18n.getLang() === 'zh';
  const theme = Theme.get();
  const nextThemeIcon = theme === 'dark' ? 'sun' : 'moon';
  els.btnTheme.setAttribute(
    'aria-label',
    theme === 'dark'
      ? isZh ? '切换浅色模式' : 'Switch to Light Mode'
      : isZh ? '切换深色模式' : 'Switch to Dark Mode'
  );
  els.btnTheme.title = els.btnTheme.getAttribute('aria-label');
  if (lastThemeIcon !== nextThemeIcon) {
    lastThemeIcon = nextThemeIcon;
    if (animateIcons) Motion.morphIcon(els.iconTheme, ICONS[nextThemeIcon]);
    else els.iconTheme.innerHTML = ICONS[nextThemeIcon];
  }

  const muted = SFX.isMuted();
  const nextMuteIcon = muted ? 'volOff' : 'volOn';
  els.btnMute.setAttribute('aria-pressed', String(!muted));
  els.btnMute.title = muted ? (isZh ? '取消静音' : 'Unmute') : (isZh ? '静音' : 'Mute');
  if (lastMuteIcon !== nextMuteIcon) {
    lastMuteIcon = nextMuteIcon;
    if (animateIcons) Motion.morphIcon(els.iconMute, ICONS[nextMuteIcon]);
    else els.iconMute.innerHTML = ICONS[nextMuteIcon];
  }

  const ambOn = SFX.isAmbienceOn() && !muted;
  const nextAmbIcon = ambOn ? 'waveOn' : 'waveOff';
  els.btnAmb.setAttribute('aria-pressed', String(ambOn));
  els.btnAmb.style.color = ambOn ? 'var(--tg-garnet-bright)' : '';
  els.btnAmb.style.borderColor = ambOn ? 'var(--tg-border-garnet)' : '';
  els.btnAmb.title = isZh ? '演播室氛围音' : 'Studio ambience';
  if (lastAmbIcon !== nextAmbIcon) {
    lastAmbIcon = nextAmbIcon;
    if (animateIcons) Motion.morphIcon(els.iconAmb, ICONS[nextAmbIcon]);
    else els.iconAmb.innerHTML = ICONS[nextAmbIcon];
  }

  els.btnLang.innerHTML = isZh
    ? `<span class="is-active-lang">中</span><span class="is-inactive-lang">/</span><span class="is-inactive-lang">EN</span>`
    : `<span class="is-inactive-lang">中</span><span class="is-inactive-lang">/</span><span class="is-active-lang">EN</span>`;
}

function syncStaticCopy() {
  const isZh = I18n.getLang() === 'zh';

  document.getElementById('nav-brand-sub').textContent = isZh
    ? 'DEATH MATCH · 死亡对决殿堂'
    : 'DEATH MATCH ARCHIVE (S1–S4)';
  document.getElementById('hero-kicker-text').textContent = isZh
    ? 'TVN 2013–2015 · S1–S4 全 44 场死亡对决'
    : 'TVN 2013–2015 · S1–S4 · 44 DEATH MATCHES';
  document.getElementById('hero-subtitle').textContent = isZh
    ? '《游戏的法则》全四季 20 款经典死亡对决。支持实时好友联机、三档天才 AI 与本地同屏对战。'
    : 'All 20 Death Matches from The Genius S1–S4. Play live with friends, face 3-tier AI, or pass and play locally.';

  document.getElementById('stat-seasons-label').textContent = isZh ? '四季传奇 S1–S4' : 'Broadcast Seasons';
  document.getElementById('stat-episodes-label').textContent = isZh ? '场经典死亡对决' : 'Death Matches';
  document.getElementById('stat-games-label').textContent = isZh ? '款独立对决游戏' : 'Unique Games';
  document.getElementById('stat-playable-label').textContent = isZh ? '已开放畅玩' : 'Playable Now';

  document.getElementById('dock-title').textContent = isZh ? '快速入局' : 'Quick Match';
  document.getElementById('dock-join-btn').textContent = isZh ? '加入房间' : 'Join Room';
  document.getElementById('dock-spectate-btn').textContent = isZh ? '观战' : 'Watch';
  document.getElementById('dock-quick-duel').textContent = isZh ? '⚡ 极速 AI' : '⚡ Quick AI';
  els.dockRoomCode.placeholder = isZh ? '房间码 TGM-K7M4P' : 'Code TGM-K7M4P';

  document.getElementById('label-view-grid').textContent = isZh ? '对决殿堂' : 'Arena Grid';
  document.getElementById('label-view-chronicle').textContent = isZh ? '44战编年史' : '44-Ep Chronicle';
  els.searchInput.placeholder = isZh
    ? '搜索游戏名 / 韩文 / 期数 (如 S1E3) / 选手...'
    : 'Search game, episode (S1E3), or player...';
  document.getElementById('footer-copy').textContent = isZh
    ? 'S1 游戏的法则 · S2 规则破坏者 · S3 黑加内特 · S4 总决赛'
    : 'S1 Rules of the Game · S2 Rule Breaker · S3 Black Garnet · S4 Grand Final';

  const vault = GarnetVault.get();
  if (prevGarnetCount == null) {
    els.navGarnetCount.textContent = String(vault.garnets);
  } else if (prevGarnetCount !== vault.garnets) {
    Motion.animateNumber(els.navGarnetCount, prevGarnetCount, vault.garnets, { duration: 320 });
  }
  prevGarnetCount = vault.garnets;
  els.navStreakLabel.textContent = `🔥 ${vault.streak}`;

  syncHeaderControls(false);
}

function renderDockSelect() {
  const isZh = I18n.getLang() === 'zh';
  const sorted = [...hubState.games].sort((a, b) => Number(isGamePlayable(b)) - Number(isGamePlayable(a)));
  const prevVal = els.dockGameSelect.value;
  els.dockGameSelect.innerHTML = sorted
    .map((g) => {
      const playable = isGamePlayable(g);
      const tag = playable ? '' : isZh ? ' [开发中]' : ' [Soon]';
      return `<option value="${UI.escapeHtml(g.slug)}" ${!playable ? 'data-soon="1"' : ''}>${UI.escapeHtml(I18n.t(g.title))}${tag}</option>`;
    })
    .join('');
  if (prevVal && sorted.some((g) => g.slug === prevVal)) {
    els.dockGameSelect.value = prevVal;
  }
}

// Persistent Filter Pills (built ONCE; labels patched in-place; sliding indicator glides!)
let filtersBuilt = false;

function buildPersistentFilters() {
  if (filtersBuilt) return;
  filtersBuilt = true;

  els.seasonRow.innerHTML = SEASONS.map(
    (s) => `<button type="button" class="hub-pill" data-season="${s.id}"></button>`
  ).join('');
  els.mechanicsRow.innerHTML = MECHANICS.map(
    (m) => `<button type="button" class="hub-pill is-mech" data-mech="${m.id}"></button>`
  ).join('');

  els.seasonRow.querySelectorAll('[data-season]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (hubState.season === btn.dataset.season) return;
      SFX.play('click');
      hubState.season = btn.dataset.season;
      syncFilters(false);
      renderArenaGrid(true);
      renderChronicle();
    });
  });

  els.mechanicsRow.querySelectorAll('[data-mech]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (hubState.mechanic === btn.dataset.mech) return;
      SFX.play('click');
      hubState.mechanic = btn.dataset.mech;
      syncFilters(false);
      renderArenaGrid(true);
      renderChronicle();
    });
  });
}

function syncFilters(immediate = false) {
  buildPersistentFilters();
  const isZh = I18n.getLang() === 'zh';

  let activeSeasonBtn = null;
  els.seasonRow.querySelectorAll('[data-season]').forEach((btn) => {
    const item = SEASONS.find((s) => s.id === btn.dataset.season);
    if (item) btn.textContent = isZh ? item.zh : item.en;
    const isAct = hubState.season === btn.dataset.season;
    btn.classList.toggle('is-active', isAct);
    if (isAct) activeSeasonBtn = btn;
  });

  let activeMechBtn = null;
  els.mechanicsRow.querySelectorAll('[data-mech]').forEach((btn) => {
    const item = MECHANICS.find((m) => m.id === btn.dataset.mech);
    if (item) btn.textContent = isZh ? item.zh : item.en;
    const isAct = hubState.mechanic === btn.dataset.mech;
    btn.classList.toggle('is-active', isAct);
    if (isAct) activeMechBtn = btn;
  });

  const activeViewBtn = els.viewToggle?.querySelector(`.hub-view-btn[data-view="${hubState.view}"]`);

  requestAnimationFrame(() => {
    if (activeSeasonBtn) Motion.slideIndicator(els.seasonRow, activeSeasonBtn, { immediate, className: 'is-gold' });
    if (activeMechBtn) Motion.slideIndicator(els.mechanicsRow, activeMechBtn, { immediate, className: 'is-cyan' });
    if (activeViewBtn) Motion.slideIndicator(els.viewToggle, activeViewBtn, { immediate, className: 'is-rect' });
  });
}

// 60fps 3D Tilt with Cached Rect on pointerenter + .is-tilting (Zero Layout Thrash!)
function bindCardTilt(card) {
  if (card.dataset.tiltBound === '1') return;
  card.dataset.tiltBound = '1';
  let rect = null;
  let rafPending = false;
  let lastX = 0;
  let lastY = 0;

  card.addEventListener('pointerenter', () => {
    if (Motion.reduced()) return;
    rect = card.getBoundingClientRect();
    card.classList.add('is-tilting');
  });

  card.addEventListener('pointermove', (e) => {
    if (Motion.reduced()) return;
    if (!rect) rect = card.getBoundingClientRect();
    lastX = e.clientX;
    lastY = e.clientY;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!rect || !rect.width || !rect.height) return;
      const px = Math.max(0, Math.min(1, (lastX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (lastY - rect.top) / rect.height));
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.style.setProperty('--rx', `${((0.5 - py) * 6.5).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((px - 0.5) * 7.5).toFixed(2)}deg`);
    });
  });

  card.addEventListener('pointerleave', () => {
    rect = null;
    card.classList.remove('is-tilting');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });

  window.addEventListener('scroll', () => { rect = null; }, { passive: true });
}

function buildOrUpdateCardNode(g) {
  const isZh = I18n.getLang() === 'zh';
  const seasons = getGameSeasons(g);
  const playable = isGamePlayable(g);
  const mech = normalizeMechanic(g.mechanic || g.category);
  const mechObj = MECHANICS.find((m) => m.id === mech);
  const diff = Math.max(1, Math.min(5, Number(g.difficulty) || 3));
  const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);
  const wins = GarnetVault.getWinsFor(g.slug);
  const accent = g.accent || '#d91b3a';
  const primaryTitle = I18n.t(g.title);
  const secondaryTitle = isZh ? g.title?.en || '' : g.title?.zh || '';

  let card = cardNodePool.get(g.slug);
  if (!card) {
    card = document.createElement('article');
    card.className = 'game-card';
    card.dataset.slug = g.slug;
    card.dataset.flipKey = g.slug;
    card.style.setProperty('--card-accent', accent);
    bindCardTilt(card);
    cardNodePool.set(g.slug, card);
  }

  const stateSig = `${isZh ? 'zh' : 'en'}|${playable ? 1 : 0}|${wins}`;
  if (card.dataset.sig !== stateSig) {
    card.dataset.sig = stateSig;
    card.innerHTML = `
      <div class="game-card-top">
        <div class="game-emblem">${renderEmblemSvg(guessIconKey(g), accent)}</div>
        <div class="game-card-badges">
          ${seasons.map((s) => `<span class="season-tag ${s.toLowerCase()}">${s}</span>`).join('')}
          ${wins > 0 ? `<span class="game-won-pill">✓ ${wins}W</span>` : ''}
          ${!playable ? `<span class="tg-badge tg-badge-cyan">${isZh ? '开发中' : 'SOON'}</span>` : ''}
        </div>
      </div>

      <h3 class="game-card-title">${UI.escapeHtml(primaryTitle)}</h3>
      <div class="game-card-sub">
        <span>${UI.escapeHtml(secondaryTitle)}</span>
        ${g.title?.ko ? `<span>· ${UI.escapeHtml(g.title.ko)}</span>` : ''}
      </div>

      <p class="game-card-tagline">${UI.escapeHtml(I18n.t(g.tagline))}</p>

      <div class="game-card-meta">
        <span>${UI.escapeHtml(isZh ? mechObj?.zh || mech : mech)} · ${(g.episodes || []).length || 1}${isZh ? '场' : ' ep'}</span>
        <span class="game-stars" title="Strategic Depth ${diff}/5">${stars}</span>
      </div>

      <div class="game-card-actions">
        ${
          playable
            ? `<a class="tg-btn tg-btn-garnet tg-btn-sm" href="./games/${encodeURIComponent(g.slug)}/">
                ${isZh ? '开始对决' : 'Play'}
              </a>
              <a class="tg-btn tg-btn-ghost tg-btn-sm" style="flex:0 0 auto;" href="./games/${encodeURIComponent(g.slug)}/?quick=solo" title="${isZh ? '快速单人 AI 开局' : 'Quick Solo AI'}">
                ⚡ ${isZh ? '极速 AI' : 'Quick AI'}
              </a>`
            : `<button type="button" class="tg-btn tg-btn-ghost tg-btn-sm" data-preview="${UI.escapeHtml(g.slug)}">
                ${isZh ? '查看规则档案' : 'Preview Dossier'}
              </button>`
        }
      </div>
    `;

    card.querySelector('[data-preview]')?.addEventListener('click', () => {
      SFX.play('click');
      openPreviewModal(g);
    });
  }

  return card;
}

function openHubModal(html, onBind) {
  const prevFocus = document.activeElement;
  els.modalRoot.innerHTML = html;
  const backdrop = els.modalRoot.querySelector('.tg-modal-backdrop');
  if (!backdrop) return;
  modalOpenCount++;
  backdropCtrl.updatePause();
  Motion.transitionPresence(backdrop, true, { preset: 'modal' });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    Motion.transitionPresence(backdrop, false, {
      preset: 'modal',
      removeOnExit: true,
      onAfterExit: () => {
        modalOpenCount = Math.max(0, modalOpenCount - 1);
        backdropCtrl.updatePause();
        if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      },
    });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  onBind?.(backdrop, close);
}

function openPreviewModal(game) {
  const isZh = I18n.getLang() === 'zh';
  const seasons = getGameSeasons(game);
  const playable = isGamePlayable(game);
  const mech = normalizeMechanic(game.mechanic || game.category);
  const mechObj = MECHANICS.find((m) => m.id === mech);

  openHubModal(
    `
      <div class="tg-modal-backdrop" hidden>
        <div class="tg-modal" role="dialog" aria-modal="true">
          <div class="tg-modal-header">
            <div style="display:flex;align-items:center;gap:14px;">
              <div class="game-emblem">${renderEmblemSvg(guessIconKey(game), game.accent || '#ff2e54')}</div>
              <div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                  ${seasons.map((s) => `<span class="season-tag ${s.toLowerCase()}">${s}</span>`).join('')}
                  <span class="tg-badge tg-badge-cyan">${UI.escapeHtml(isZh ? mechObj?.zh || mech : mech)}</span>
                </div>
                <h2 class="tg-modal-title" style="font-size:21px;">${UI.escapeHtml(I18n.t(game.title))}</h2>
                <div style="font-size:12px;color:var(--tg-ink-faint);">
                  ${UI.escapeHtml(isZh ? game.title?.en || '' : game.title?.zh || '')}
                  ${game.title?.ko ? ` · ${UI.escapeHtml(game.title.ko)}` : ''}
                </div>
              </div>
            </div>
            <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" data-close aria-label="Close">✕</button>
          </div>

          <p style="color:var(--tg-ink-muted);margin:0 0 14px;font-size:14px;line-height:1.7;">
            ${UI.escapeHtml(I18n.t(game.tagline))}
          </p>

          ${
            game.episodes?.length
              ? `<div style="margin-bottom:14px;">
                  <div style="font-size:11.5px;color:var(--tg-gold);font-weight:700;letter-spacing:0.08em;margin-bottom:6px;">
                    ${isZh ? '节目登场期数' : 'BROADCAST APPEARANCES'}
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${game.episodes.map((ep) => `<span class="tg-badge">${UI.escapeHtml(ep)}</span>`).join('')}
                  </div>
                </div>`
              : ''
          }

          ${
            game.rulesBrief
              ? `<div style="padding:12px 14px;border-radius:12px;background:var(--tg-hover-fill);border:1px solid var(--tg-border-subtle);margin-bottom:18px;font-size:13px;color:var(--tg-ink-muted);line-height:1.65;">
                  <strong style="color:var(--tg-gold-bright);display:block;margin-bottom:4px;">${isZh ? '核心机制简述' : 'CORE MECHANICS'}</strong>
                  ${UI.escapeHtml(I18n.t(game.rulesBrief))}
                </div>`
              : ''
          }

          <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
            <button type="button" class="tg-btn tg-btn-ghost" data-close>${isZh ? '关闭' : 'Close'}</button>
            ${
              playable
                ? `<a class="tg-btn tg-btn-garnet" href="./games/${encodeURIComponent(game.slug)}/">${isZh ? '开始对决' : 'Play'}</a>`
                : `<span class="tg-badge tg-badge-cyan" style="padding:8px 14px;">${isZh ? '开发中' : 'Coming Soon'}</span>`
            }
          </div>
        </div>
      </div>
    `,
    (backdrop, close) => {
      backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
      backdrop.querySelector('[data-close]')?.focus();
    }
  );
}

function openVaultModal() {
  const isZh = I18n.getLang() === 'zh';
  const v = GarnetVault.get();
  const totalGames = hubState.games.length || 1;
  const conquered = Object.keys(v.winsByGame || {}).length;
  const totalMatches = v.wins + v.losses + v.draws;
  const winRate = totalMatches ? Math.round((v.wins / totalMatches) * 100) : 0;

  openHubModal(
    `
      <div class="tg-modal-backdrop" hidden>
        <div class="tg-modal" role="dialog" aria-modal="true">
          <div class="tg-modal-header">
            <div>
              <span class="tg-badge tg-badge-garnet">${isZh ? '个人加内特金库' : 'GARNET VAULT'}</span>
              <h2 class="tg-modal-title">${isZh ? '死亡对决幸存档案' : 'Death Match Survival Record'}</h2>
            </div>
            <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" data-close aria-label="Close">✕</button>
          </div>

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
            ${UI.renderGarnetBadge(v.garnets)}
            ${UI.renderGarnetBadge(v.blackGarnets, { black: true })}
            <span class="tg-badge tg-badge-gold">${isZh ? `已征服 ${conquered}/${totalGames} 款` : `Conquered ${conquered}/${totalGames}`}</span>
          </div>

          <div class="vault-stat-grid">
            <div class="vault-stat-box">
              <strong>${v.wins}</strong>
              <span>${isZh ? '幸存胜场' : 'Survivals'}</span>
            </div>
            <div class="vault-stat-box">
              <strong>${winRate}%</strong>
              <span>${isZh ? '对决胜率' : 'Win Rate'}</span>
            </div>
            <div class="vault-stat-box">
              <strong>🔥 ${v.streak}</strong>
              <span>${isZh ? '当前连胜' : 'Streak'}</span>
            </div>
            <div class="vault-stat-box">
              <strong>★ ${v.bestStreak}</strong>
              <span>${isZh ? '最高连胜' : 'Best Streak'}</span>
            </div>
          </div>

          <div style="font-size:11.5px;color:var(--tg-gold);font-weight:700;letter-spacing:0.1em;margin-bottom:8px;">
            ${isZh ? '近期死亡对决记录' : 'RECENT HISTORY'}
          </div>

          ${
            v.history.length
              ? `<div class="vault-history-list">
                  ${v.history
                    .map((h) => {
                      const label =
                        h.outcome === 'win'
                          ? isZh ? '幸存' : 'Survived'
                          : h.outcome === 'loss'
                          ? isZh ? '淘汰' : 'Eliminated'
                          : isZh ? '平局' : 'Draw';
                      const deltaStr = h.delta > 0 ? `+${h.delta}` : String(h.delta);
                      return `
                        <div class="vault-history-row is-${h.outcome}">
                          <div>
                            <strong style="color:var(--tg-ink);">${UI.escapeHtml(I18n.t(h.title || h.slug))}</strong>
                            <span style="color:var(--tg-ink-faint);margin-left:6px;">vs ${UI.escapeHtml(h.opponent || 'AI')}</span>
                          </div>
                          <div style="display:flex;align-items:center;gap:8px;font-family:var(--tg-font-mono);font-variant-numeric:tabular-nums;font-size:12px;">
                            <span style="color:${h.outcome === 'win' ? 'var(--tg-emerald-ink)' : h.outcome === 'loss' ? 'var(--tg-garnet-ink)' : 'var(--tg-ink-muted)'};">${label}</span>
                            <span style="color:var(--tg-gold-bright);">${deltaStr} ♦</span>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>`
              : `<p style="color:var(--tg-ink-faint);font-size:13px;padding:18px;text-align:center;border:1px dashed var(--tg-border-subtle);border-radius:10px;">
                  ${isZh ? '尚未参加任何死亡对决。赢得对决可获得加内特，三连胜解锁黑加内特。' : 'No Death Matches played yet. Win to earn Garnets — 3 in a row unlocks a Black Garnet.'}
                </p>`
          }

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;flex-wrap:wrap;gap:10px;">
            <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="vault-reset" style="color:var(--tg-garnet-ink);">
              ${isZh ? '重置金库' : 'Reset Vault'}
            </button>
            <button type="button" class="tg-btn tg-btn-gold" data-close>${isZh ? '关闭' : 'Close'}</button>
          </div>
        </div>
      </div>
    `,
    (backdrop, close) => {
      backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
      backdrop.querySelector('#vault-reset')?.addEventListener('click', async () => {
        const ok = await UI.confirm(
          isZh ? '重置加内特金库？' : 'Reset Garnet Vault?',
          isZh ? '加内特余额、连胜与胜场记录将恢复初始状态。' : 'Your Garnets, streaks, and match history will be reset.'
        );
        if (ok) {
          GarnetVault.reset();
          SFX.play('click');
          syncStaticCopy();
          renderArenaGrid(false);
          close();
          UI.toast(isZh ? '金库已重置' : 'Vault reset');
        }
      });
    }
  );
}

function renderArenaGrid(useFlip = true) {
  const isZh = I18n.getLang() === 'zh';
  const filtered = getFilteredGames();
  els.chipGridCount.textContent = String(filtered.length);

  if (!filtered.length) {
    els.arenaGrid.innerHTML = '';
    els.arenaEmpty.textContent = isZh
      ? '没有匹配当前筛选条件的游戏，试试切换赛季或清空搜索。'
      : 'No games match your filter. Try another season or clear search.';
    Motion.transitionPresence(els.arenaEmpty, true, { preset: 'fade' });
    return;
  }

  if (!els.arenaEmpty.hidden) {
    Motion.transitionPresence(els.arenaEmpty, false, { preset: 'fade', duration: 120 });
  }

  const playFlip = useFlip
    ? Motion.flipList(els.arenaGrid, '.game-card', { keyAttr: 'data-slug', duration: 240, staggerMs: 14 })
    : () => {};

  const wantedNodes = filtered.map(buildOrUpdateCardNode);
  const wantedSet = new Set(wantedNodes);

  // Remove cards no longer matching
  for (const child of Array.from(els.arenaGrid.children)) {
    if (!wantedSet.has(child)) child.remove();
  }

  // Reorder/append in exact filtered sequence while preserving existing DOM nodes
  wantedNodes.forEach((node, idx) => {
    const currentAtIdx = els.arenaGrid.children[idx];
    if (currentAtIdx !== node) {
      els.arenaGrid.insertBefore(node, currentAtIdx || null);
    }
  });

  playFlip();
}

function renderChronicle() {
  const isZh = I18n.getLang() === 'zh';
  const filtered = getFilteredEpisodes();
  els.chipChronicleCount.textContent = String(filtered.length);

  if (!filtered.length) {
    els.chronicleContainer.innerHTML = '';
    els.chronicleEmpty.textContent = isZh
      ? '没有匹配当前筛选条件的剧集记录。'
      : 'No Death Match episodes match your filter.';
    Motion.transitionPresence(els.chronicleEmpty, true, { preset: 'fade' });
    return;
  }

  if (!els.chronicleEmpty.hidden) {
    Motion.transitionPresence(els.chronicleEmpty, false, { preset: 'fade', duration: 120 });
  }

  const gameMap = new Map(hubState.games.map((g) => [g.slug, g]));
  const groups = new Map();
  for (const ep of filtered) {
    const sk = `S${ep.season}`;
    if (!groups.has(sk)) groups.set(sk, []);
    groups.get(sk).push(ep);
  }

  els.chronicleContainer.innerHTML = ['S1', 'S2', 'S3', 'S4']
    .filter((sk) => groups.has(sk))
    .map((sk) => {
      const meta = SEASON_META[sk];
      const rows = groups.get(sk);
      return `
        <div class="chronicle-season-block">
          <div class="chronicle-season-header ${meta.cls}">
            <h3 class="chronicle-season-title">${UI.escapeHtml(isZh ? meta.zh : meta.en)}</h3>
            <span class="tg-badge">${UI.escapeHtml(meta.ko)} · ${rows.length} ${isZh ? '场' : 'MATCHES'}</span>
          </div>
          <div class="chronicle-list">
            ${rows
              .map((ep) => {
                const game = gameMap.get(ep.gameSlug);
                const playable = game && isGamePlayable(game);
                const gameTitle = game ? I18n.t(game.title) : I18n.t(ep.gameTitle || ep.gameSlug);
                const subTitle = game
                  ? isZh
                    ? `${game.title?.en || ''}${game.title?.ko ? ' · ' + game.title.ko : ''}`
                    : `${game.title?.zh || ''}${game.title?.ko ? ' · ' + game.title.ko : ''}`
                  : '';
                return `
                  <div class="chronicle-row">
                    <span class="chronicle-ep">${UI.escapeHtml(ep.id)}</span>
                    <div>
                      <div class="chronicle-game-name">${UI.escapeHtml(gameTitle)}</div>
                      <div class="chronicle-game-sub">${UI.escapeHtml(subTitle)}</div>
                    </div>
                    <div class="chronicle-matchup">
                      <span class="chronicle-winner" title="${isZh ? '幸存者' : 'Survivor'}">♛ ${UI.escapeHtml(ep.winner || 'TBD')}</span>
                      <span class="chronicle-vs">VS</span>
                      <span class="chronicle-loser" title="${isZh ? '淘汰者' : 'Eliminated'}">✕ ${UI.escapeHtml(ep.eliminated || 'TBD')}</span>
                      ${ep.note ? `<span style="width:100%;font-size:11.5px;color:var(--tg-ink-faint);margin-top:2px;">${UI.escapeHtml(ep.note)}</span>` : ''}
                    </div>
                    <div>
                      ${
                        playable
                          ? `<a class="tg-btn tg-btn-sm tg-btn-garnet" href="./games/${encodeURIComponent(ep.gameSlug)}/">
                              ${isZh ? '开始对决' : 'Play'}
                            </a>`
                          : `<button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" data-chron-preview="${UI.escapeHtml(ep.gameSlug)}">
                              ${isZh ? '规则档案' : 'Dossier'}
                            </button>`
                      }
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  els.chronicleContainer.querySelectorAll('[data-chron-preview]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      const g = hubState.games.find((x) => x.slug === btn.dataset.chronPreview);
      if (g) openPreviewModal(g);
    });
  });
}

function renderAll({ immediateFilters = false, animateStats = false } = {}) {
  syncStaticCopy();
  syncFilters(immediateFilters);
  renderDockSelect();

  const epTotal = hubState.episodes.length || 44;
  const gameTotal = hubState.games.length;
  const playableTotal = hubState.games.filter(isGamePlayable).length;

  if (animateStats && !statsAnimatedOnce && gameTotal > 0) {
    statsAnimatedOnce = true;
    Motion.animateNumber(els.statEpisodesNum, 0, epTotal, { duration: 420 });
    Motion.animateNumber(els.statGamesNum, 0, gameTotal, { duration: 420 });
    Motion.animateNumber(els.statPlayableNum, 0, playableTotal, { duration: 460 });
  } else {
    els.statEpisodesNum.textContent = String(epTotal);
    els.statGamesNum.textContent = String(gameTotal);
    els.statPlayableNum.textContent = String(playableTotal);
  }

  document.getElementById('btn-view-grid').classList.toggle('is-active', hubState.view === 'grid');
  document.getElementById('btn-view-chronicle').classList.toggle('is-active', hubState.view === 'chronicle');
  els.arenaGridView.hidden = hubState.view !== 'grid';
  els.chronicleView.hidden = hubState.view !== 'chronicle';

  renderArenaGrid(!immediateFilters);
  renderChronicle();
}

function wireEvents() {
  els.btnLang?.addEventListener('click', () => {
    SFX.play('click');
    Motion.crossfade(els.contentStage, () => I18n.toggle(), { duration: 150, shiftPx: 3 });
  });

  els.btnTheme?.addEventListener('click', () => {
    SFX.play('click');
    Theme.toggle();
    syncHeaderControls(true);
  });

  els.btnMute?.addEventListener('click', () => {
    SFX.toggleMute();
    syncHeaderControls(true);
  });

  els.btnAmb?.addEventListener('click', () => {
    const on = SFX.toggleAmbience();
    syncHeaderControls(true);
    UI.toast(
      on
        ? I18n.t({ zh: '演播室氛围音已开启', en: 'Studio ambience on' })
        : I18n.t({ zh: '演播室氛围音已关闭', en: 'Studio ambience off' })
    );
  });

  document.getElementById('btn-open-vault')?.addEventListener('click', () => {
    SFX.play('garnetClink');
    openVaultModal();
  });

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (hubState.view === btn.dataset.view) return;
      SFX.play('click');
      const nextView = btn.dataset.view;
      hubState.view = nextView;
      document.getElementById('btn-view-grid').classList.toggle('is-active', nextView === 'grid');
      document.getElementById('btn-view-chronicle').classList.toggle('is-active', nextView === 'chronicle');
      Motion.slideIndicator(els.viewToggle, btn, { className: 'is-rect' });
      Motion.crossfade(
        els.contentStage,
        () => {
          els.arenaGridView.hidden = nextView !== 'grid';
          els.chronicleView.hidden = nextView !== 'chronicle';
        },
        { duration: 180, shiftPx: 5 }
      );
    });
  });

  els.searchInput?.addEventListener('input', () => {
    hubState.search = els.searchInput.value;
    renderArenaGrid(true);
    renderChronicle();
  });

  window.addEventListener('resize', () => syncFilters(true), { passive: true });

  // Quick-Join & Quick-Duel Dock
  const navigateToRoom = (spectate = false) => {
    const slug = els.dockGameSelect.value;
    const game = hubState.games.find((g) => g.slug === slug);
    const code = normalizeRoomCode(els.dockRoomCode.value);
    const isZh = I18n.getLang() === 'zh';

    if (!game) return;
    if (!isGamePlayable(game)) {
      SFX.play('error');
      Motion.nudgeError(els.dockGameSelect, { intensity: 'subtle' });
      UI.toast(isZh ? '该游戏暂未开放' : 'Game not yet available', 'error');
      return;
    }
    if (code.length < 4) {
      SFX.play('error');
      Motion.nudgeError(els.dockRoomCode, { intensity: 'subtle' });
      UI.toast(isZh ? '请输入 5 位房间码' : 'Enter a 5-character room code', 'error');
      els.dockRoomCode.focus();
      return;
    }
    SFX.play('garnetClink');
    const qs = new URLSearchParams({ room: code });
    if (spectate) qs.set('mode', 'spectate');
    window.location.href = `./games/${encodeURIComponent(slug)}/?${qs.toString()}`;
  };

  document.getElementById('hub-quick-join-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    navigateToRoom(false);
  });

  document.getElementById('dock-spectate-btn')?.addEventListener('click', () => navigateToRoom(true));

  document.getElementById('dock-quick-duel')?.addEventListener('click', () => {
    const playable = hubState.games.filter(isGamePlayable);
    const chosenSlug = els.dockGameSelect.value;
    const chosen = hubState.games.find((g) => g.slug === chosenSlug);
    if (chosen && isGamePlayable(chosen)) {
      SFX.play('clash');
      window.location.href = `./games/${encodeURIComponent(chosen.slug)}/?quick=solo`;
      return;
    }
    if (playable.length > 0) {
      const pick = playable[Math.floor(Math.random() * playable.length)];
      SFX.play('clash');
      window.location.href = `./games/${encodeURIComponent(pick.slug)}/?quick=solo`;
      return;
    }
    SFX.play('click');
    document.getElementById('arena-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  I18n.onChange(() => renderAll({ immediateFilters: true }));
  Theme.onChange(() => syncHeaderControls(true));
  GarnetVault.onChange(() => {
    syncStaticCopy();
    renderArenaGrid(false);
  });
}

async function bootstrap() {
  backdropCtrl = initBackdropCanvas();
  wireEvents();

  try {
    const res = await fetch('./games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    hubState.games = Array.isArray(data.games) ? data.games : [];
    hubState.episodes = Array.isArray(data.episodes) ? data.episodes : [];
  } catch (err) {
    console.error('[Hub] Failed to load games.json:', err);
    UI.toast('Failed to load games.json', 'error');
  }

  renderAll({ immediateFilters: true, animateStats: true });
}

bootstrap();
