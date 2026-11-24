/**
 * The Genius: Death Match Archive — Interactive Hub Controller
 * Features:
 *  - Volumetric Studio Spotlights & Faceted Garnet Crystal Particle Stage (Canvas)
 *  - 3D Mouse-Tilt Holographic Foil Game Cards + Bespoke SVG Game Emblems
 *  - Season (S1–S4) + Mechanics Filters + Instant Search + Bilingual ZH/EN Switcher
 *  - Arena Grid View & 44-Episode Death Match Chronicle Timeline
 *  - Live Room Quick-Join / Quick Duel Dock & Local Garnet Vault Modal
 */

import { I18n, SFX, UI, GarnetVault, normalizeRoomCode } from './shared/sdk.js';

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

// Bespoke SVG Emblems for every Death Match motif
function renderEmblemSvg(iconKey, accent = '#ff2e54') {
  const gold = '#e4b95b';
  const cyan = '#22d3ee';
  switch (iconKey) {
    case 'poker':
      return `<svg viewBox="0 0 48 48" width="32" height="32" fill="none">
        <rect x="6" y="10" width="22" height="30" rx="4" transform="rotate(-10 17 25)" fill="rgba(255,255,255,0.06)" stroke="${gold}" stroke-width="1.8"/>
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

// Normalize arbitrary catalog mechanic strings into our 6 core buckets
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
  if (slug.includes('auction') || slug.includes('betting') || slug.includes('number') || slug.includes('equation')) return 'auction';
  if (slug.includes('picture') || slug.includes('hunt') || slug.includes('memory')) return 'grid';
  if (slug.includes('rps')) return 'rps';
  if (slug.includes('sun') || slug.includes('moon') || slug.includes('star')) return 'star';
  return 'garnet';
}

// ============================================================================
// Volumetric Spotlight & Faceted Garnet Crystal Background Canvas
// ============================================================================
function initBackdropCanvas() {
  const canvas = document.getElementById('hub-stage-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let w = 0;
  let h = 0;
  let mx = 0.5;
  let my = 0.3;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX / Math.max(1, w);
    my = e.clientY / Math.max(1, h);
    const crystal = document.getElementById('hero-garnet-crystal');
    if (crystal && !reducedMotion) {
      const dx = (mx - 0.5) * 18;
      const dy = (my - 0.5) * -14;
      crystal.style.transform = `rotateY(${dx}deg) rotateX(${dy}deg)`;
    }
  });

  // Faceted Garnet Shards + Warm Gold Embers
  const shards = Array.from({ length: 24 }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * 900,
    r: 5 + Math.random() * 13,
    vx: (Math.random() - 0.5) * 0.25,
    vy: -(0.15 + Math.random() * 0.42),
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.008,
    alpha: 0.12 + Math.random() * 0.28,
    isGold: Math.random() > 0.62,
  }));

  const embers = Array.from({ length: 42 }, () => ({
    x: Math.random() * 1400,
    y: Math.random() * 900,
    r: 1 + Math.random() * 2.1,
    vy: -(0.22 + Math.random() * 0.55),
    vx: (Math.random() - 0.5) * 0.2,
    phase: Math.random() * Math.PI * 2,
  }));

  let t = 0;
  function drawFrame() {
    t += 0.008;
    ctx.clearRect(0, 0, w, h);

    // Sweeping Volumetric Studio Spotlights
    const beam1X = w * (0.28 + Math.sin(t * 0.7) * 0.12 + (mx - 0.5) * 0.05);
    const g1 = ctx.createRadialGradient(beam1X, -40, 20, beam1X, h * 0.35, w * 0.65);
    g1.addColorStop(0, 'rgba(217, 27, 58, 0.24)');
    g1.addColorStop(0.45, 'rgba(130, 10, 32, 0.09)');
    g1.addColorStop(1, 'rgba(5, 6, 10, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const beam2X = w * (0.76 + Math.cos(t * 0.55) * 0.11 - (mx - 0.5) * 0.04);
    const g2 = ctx.createRadialGradient(beam2X, -30, 15, beam2X, h * 0.3, w * 0.52);
    g2.addColorStop(0, 'rgba(228, 185, 91, 0.16)');
    g2.addColorStop(0.5, 'rgba(228, 185, 91, 0.04)');
    g2.addColorStop(1, 'rgba(5, 6, 10, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    const g3 = ctx.createRadialGradient(w * 0.12, h * 0.9, 10, w * 0.12, h * 0.9, w * 0.42);
    g3.addColorStop(0, 'rgba(34, 211, 238, 0.09)');
    g3.addColorStop(1, 'rgba(5, 6, 10, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    // Drifting Faceted Garnet Shards
    for (const s of shards) {
      if (!reducedMotion) {
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
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.moveTo(0, -s.r);
      ctx.lineTo(s.r * 0.72, -s.r * 0.25);
      ctx.lineTo(s.r * 0.5, s.r);
      ctx.lineTo(-s.r * 0.5, s.r);
      ctx.lineTo(-s.r * 0.72, -s.r * 0.25);
      ctx.closePath();
      ctx.fillStyle = s.isGold ? 'rgba(228, 185, 91, 0.5)' : 'rgba(235, 30, 68, 0.62)';
      ctx.fill();
      ctx.strokeStyle = s.isGold ? 'rgba(255, 240, 194, 0.5)' : 'rgba(255, 130, 152, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // Rising Gold & Crimson Embers
    for (const e of embers) {
      if (!reducedMotion) {
        e.y += e.vy;
        e.x += e.vx + Math.sin(t * 2 + e.phase) * 0.15;
        if (e.y < -10) {
          e.y = h + 10;
          e.x = Math.random() * w;
        }
      }
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 224, 150, ${0.22 + 0.2 * Math.sin(t * 3 + e.phase)})`;
      ctx.fill();
    }

    if (!reducedMotion) requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

// ============================================================================
// Hub State & Rendering
// ============================================================================
const hubState = {
  games: [],
  episodes: [],
  view: 'grid', // 'grid' | 'chronicle'
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
  seasonRow: document.getElementById('season-filter-row'),
  mechanicsRow: document.getElementById('mechanics-filter-row'),
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
};

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

function syncStaticCopy() {
  const lang = I18n.getLang();
  const isZh = lang === 'zh';

  document.getElementById('nav-brand-sub').textContent = isZh
    ? 'DEATH MATCH · 死亡对决殿堂'
    : 'DEATH MATCH ARCHIVE (S1–S4)';
  document.getElementById('hero-kicker-text').textContent = isZh
    ? 'TVN 2013–2015 · 全四季 44 场死亡对决完全收录'
    : 'TVN 2013–2015 · ALL 4 SEASONS · 44 BROADCAST DEATH MATCHES';
  document.getElementById('hero-subtitle').textContent = isZh
    ? '더 지니어스 · 《游戏的法则》S1–S4 传奇死亡对决全集。零安装在线 WebRTC 实时联机、三档天才级 AI 博弈、以及带加内特隐私护盾的本地传屏对战。'
    : 'Complete interactive archive of Korean mind-game legend The Genius (더 지니어스) S1–S4. Play online P2P multiplayer, challenge 3-tier Genius AI, or pass-and-play locally.';

  document.getElementById('stat-seasons-label').textContent = isZh ? '四季传奇 S1–S4' : 'Broadcast Seasons';
  document.getElementById('stat-episodes-label').textContent = isZh ? '场经典死亡对决' : 'Death Matches';
  document.getElementById('stat-games-label').textContent = isZh ? '款独立对决游戏' : 'Unique Games';
  document.getElementById('stat-playable-label').textContent = isZh ? '已开放畅玩' : 'Playable Now';

  document.getElementById('dock-title').textContent = isZh
    ? '快速联机加入 / 极速开局'
    : 'Live Room Quick-Join & Instant Duel';
  document.getElementById('dock-join-btn').textContent = isZh ? '加入房间' : 'Join Room';
  document.getElementById('dock-spectate-btn').textContent = isZh ? '观战' : 'Watch';
  document.getElementById('dock-quick-duel').textContent = isZh ? '⚡ 极速单人 AI' : '⚡ Quick Solo AI';
  els.dockRoomCode.placeholder = isZh ? '房间码 TGM-K7M4P' : 'Code TGM-K7M4P';

  document.getElementById('label-view-grid').textContent = isZh ? '对决殿堂' : 'Arena Grid';
  document.getElementById('label-view-chronicle').textContent = isZh ? '44战编年史' : '44-Ep Chronicle';
  els.searchInput.placeholder = isZh
    ? '搜索游戏名 / 韩文 / 期数 (如 S1E3) / 选手...'
    : 'Search game, episode (S1E3), or player...';
  document.getElementById('footer-copy').textContent = isZh
    ? 'S1 游戏的法则 · S2 规则破坏者 · S3 黑加内特 · S4 总决赛'
    : 'S1 Rules of the Game · S2 Rule Breaker · S3 Black Garnet · S4 Grand Final';

  // Vault Pill
  const vault = GarnetVault.get();
  els.navGarnetCount.textContent = String(vault.garnets);
  els.navStreakLabel.textContent = `🔥 ${vault.streak}`;

  // Audio buttons
  const btnMute = document.getElementById('btn-mute');
  const btnAmb = document.getElementById('btn-ambience');
  btnMute.textContent = SFX.isMuted() ? '🔇' : '🔊';
  const ambOn = SFX.isAmbienceOn() && !SFX.isMuted();
  btnAmb.style.color = ambOn ? 'var(--tg-garnet-bright)' : '';
  btnAmb.style.borderColor = ambOn ? 'var(--tg-border-garnet)' : '';
}

function renderDockSelect() {
  const lang = I18n.getLang();
  const sorted = [...hubState.games].sort((a, b) => Number(isGamePlayable(b)) - Number(isGamePlayable(a)));
  const prevVal = els.dockGameSelect.value;
  els.dockGameSelect.innerHTML = sorted
    .map((g) => {
      const playable = isGamePlayable(g);
      const tag = playable ? '' : lang === 'zh' ? ' [开发中]' : ' [Soon]';
      return `<option value="${UI.escapeHtml(g.slug)}" ${!playable ? 'data-soon="1"' : ''}>${UI.escapeHtml(I18n.t(g.title))}${tag}</option>`;
    })
    .join('');
  if (prevVal && sorted.some((g) => g.slug === prevVal)) {
    els.dockGameSelect.value = prevVal;
  }
}

function renderFilters() {
  const lang = I18n.getLang();
  els.seasonRow.innerHTML = SEASONS.map(
    (s) => `
      <button type="button" class="hub-pill ${hubState.season === s.id ? 'is-active' : ''}" data-season="${s.id}">
        ${UI.escapeHtml(lang === 'zh' ? s.zh : s.en)}
      </button>
    `
  ).join('');

  els.mechanicsRow.innerHTML = MECHANICS.map(
    (m) => `
      <button type="button" class="hub-pill is-mech ${hubState.mechanic === m.id ? 'is-active' : ''}" data-mech="${m.id}">
        ${UI.escapeHtml(lang === 'zh' ? m.zh : m.en)}
      </button>
    `
  ).join('');

  els.seasonRow.querySelectorAll('[data-season]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      hubState.season = btn.dataset.season;
      renderAll();
    });
  });

  els.mechanicsRow.querySelectorAll('[data-mech]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      hubState.mechanic = btn.dataset.mech;
      renderAll();
    });
  });
}

function bindCardTilt(card) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    card.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((px - 0.5) * 8).toFixed(2)}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

function openPreviewModal(game) {
  const lang = I18n.getLang();
  const seasons = getGameSeasons(game);
  const playable = isGamePlayable(game);
  const mech = normalizeMechanic(game.mechanic || game.category);
  const mechObj = MECHANICS.find((m) => m.id === mech);

  els.modalRoot.innerHTML = `
    <div class="tg-modal-backdrop" id="hub-preview-backdrop">
      <div class="tg-modal" role="dialog" aria-modal="true">
        <div class="tg-modal-header">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="game-emblem">${renderEmblemSvg(guessIconKey(game), game.accent || '#ff2e54')}</div>
            <div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                ${seasons.map((s) => `<span class="season-tag ${s.toLowerCase()}">${s}</span>`).join('')}
                <span class="tg-badge tg-badge-cyan">${UI.escapeHtml(lang === 'zh' ? mechObj?.zh || mech : mech)}</span>
              </div>
              <h2 class="tg-modal-title" style="font-size:21px;">${UI.escapeHtml(I18n.t(game.title))}</h2>
              <div style="font-size:12px;color:var(--tg-ink-faint);">
                ${UI.escapeHtml(lang === 'zh' ? game.title?.en || '' : game.title?.zh || '')}
                ${game.title?.ko ? ` · ${UI.escapeHtml(game.title.ko)}` : ''}
              </div>
            </div>
          </div>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="hub-preview-close">✕</button>
        </div>

        <p style="color:var(--tg-ink-muted);margin:0 0 14px;font-size:14px;line-height:1.7;">
          ${UI.escapeHtml(I18n.t(game.tagline))}
        </p>

        ${
          game.episodes?.length
            ? `<div style="margin-bottom:14px;">
                <div style="font-size:11.5px;color:var(--tg-gold);font-weight:700;letter-spacing:0.08em;margin-bottom:6px;">
                  ${lang === 'zh' ? '节目登场期数' : 'BROADCAST APPEARANCES'}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${game.episodes.map((ep) => `<span class="tg-badge">${UI.escapeHtml(ep)}</span>`).join('')}
                </div>
              </div>`
            : ''
        }

        ${
          game.rulesBrief
            ? `<div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--tg-border-subtle);margin-bottom:18px;font-size:13px;color:var(--tg-ink-muted);line-height:1.65;">
                <strong style="color:var(--tg-gold-bright);display:block;margin-bottom:4px;">${lang === 'zh' ? '核心机制简述' : 'CORE MECHANIC OVERVIEW'}</strong>
                ${UI.escapeHtml(I18n.t(game.rulesBrief))}
              </div>`
            : ''
        }

        <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
          <button type="button" class="tg-btn tg-btn-ghost" id="hub-preview-cancel">${lang === 'zh' ? '关闭' : 'Close'}</button>
          ${
            playable
              ? `<a class="tg-btn tg-btn-garnet" href="./games/${encodeURIComponent(game.slug)}/">${lang === 'zh' ? '立即进入死亡对决 →' : 'Enter Death Match →'}</a>`
              : `<span class="tg-badge tg-badge-cyan" style="padding:8px 14px;">${lang === 'zh' ? '⚡ 竞技场施工中，敬请期待' : '⚡ Arena Under Construction'}</span>`
          }
        </div>
      </div>
    </div>
  `;

  const close = () => {
    els.modalRoot.innerHTML = '';
  };
  els.modalRoot.querySelector('#hub-preview-close')?.addEventListener('click', close);
  els.modalRoot.querySelector('#hub-preview-cancel')?.addEventListener('click', close);
  els.modalRoot.querySelector('#hub-preview-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'hub-preview-backdrop') close();
  });
}

function openVaultModal() {
  const lang = I18n.getLang();
  const isZh = lang === 'zh';
  const v = GarnetVault.get();
  const totalGames = hubState.games.length || 1;
  const conquered = Object.keys(v.winsByGame || {}).length;
  const totalMatches = v.wins + v.losses + v.draws;
  const winRate = totalMatches ? Math.round((v.wins / totalMatches) * 100) : 0;

  els.modalRoot.innerHTML = `
    <div class="tg-modal-backdrop" id="vault-backdrop">
      <div class="tg-modal" role="dialog" aria-modal="true">
        <div class="tg-modal-header">
          <div>
            <span class="tg-badge tg-badge-garnet">${isZh ? '个人加内特金库' : 'PERSONAL GARNET VAULT'}</span>
            <h2 class="tg-modal-title">${isZh ? '死亡对决幸存档案' : 'Death Match Survival Record'}</h2>
          </div>
          <button type="button" class="tg-btn tg-btn-icon tg-btn-ghost" id="vault-close">✕</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          ${UI.renderGarnetBadge(v.garnets)}
          ${UI.renderGarnetBadge(v.blackGarnets, { black: true })}
          <span class="tg-badge tg-badge-gold">${isZh ? `已征服 ${conquered}/${totalGames} 款游戏` : `Conquered ${conquered}/${totalGames}`}</span>
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
          ${isZh ? '近期死亡对决记录' : 'RECENT DEATH MATCH HISTORY'}
        </div>

        ${
          v.history.length
            ? `<div class="vault-history-list">
                ${v.history
                  .map((h) => {
                    const label =
                      h.outcome === 'win'
                        ? isZh ? '幸存' : 'SURVIVED'
                        : h.outcome === 'loss'
                        ? isZh ? '淘汰' : 'ELIMINATED'
                        : isZh ? '平局' : 'DRAW';
                    const deltaStr = h.delta > 0 ? `+${h.delta}` : String(h.delta);
                    return `
                      <div class="vault-history-row is-${h.outcome}">
                        <div>
                          <strong style="color:var(--tg-ink);">${UI.escapeHtml(I18n.t(h.title || h.slug))}</strong>
                          <span style="color:var(--tg-ink-faint);margin-left:6px;">vs ${UI.escapeHtml(h.opponent || 'AI')}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;font-family:var(--tg-font-mono);font-size:12px;">
                          <span style="color:${h.outcome === 'win' ? '#86efac' : h.outcome === 'loss' ? '#ff8ba0' : 'var(--tg-ink-muted)'};">${label}</span>
                          <span style="color:var(--tg-gold-bright);">${deltaStr} ♦</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
            : `<p style="color:var(--tg-ink-faint);font-size:13px;padding:18px;text-align:center;border:1px dashed var(--tg-border-subtle);border-radius:10px;">
                ${isZh ? '尚未参加任何死亡对决。赢得对决可获得加内特，三连胜可解锁黑加内特！' : 'No Death Matches played yet. Win to earn Garnets — 3 wins in a row unlocks a Black Garnet!'}
              </p>`
        }

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;flex-wrap:wrap;gap:10px;">
          <button type="button" class="tg-btn tg-btn-sm tg-btn-ghost" id="vault-reset" style="color:#ff8ba0;">
            ${isZh ? '重置金库数据' : 'Reset Vault'}
          </button>
          <button type="button" class="tg-btn tg-btn-gold" id="vault-done">${isZh ? '返回殿堂' : 'Close'}</button>
        </div>
      </div>
    </div>
  `;

  const close = () => {
    els.modalRoot.innerHTML = '';
  };
  els.modalRoot.querySelector('#vault-close')?.addEventListener('click', close);
  els.modalRoot.querySelector('#vault-done')?.addEventListener('click', close);
  els.modalRoot.querySelector('#vault-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'vault-backdrop') close();
  });
  els.modalRoot.querySelector('#vault-reset')?.addEventListener('click', async () => {
    const ok = await UI.confirm(
      isZh ? '确认重置加内特金库？' : 'Reset Garnet Vault?',
      isZh ? '你的加内特余额、连胜与胜场记录将恢复初始状态。' : 'Your Garnets, streaks, and match history will be reset.'
    );
    if (ok) {
      GarnetVault.reset();
      SFX.play('click');
      syncStaticCopy();
      renderArenaGrid();
      close();
      UI.toast(isZh ? '金库已重置' : 'Vault reset');
    }
  });
}

function renderArenaGrid() {
  const lang = I18n.getLang();
  const isZh = lang === 'zh';
  const filtered = getFilteredGames();
  els.chipGridCount.textContent = String(filtered.length);

  if (!filtered.length) {
    els.arenaGrid.innerHTML = '';
    els.arenaEmpty.hidden = false;
    els.arenaEmpty.textContent = isZh
      ? '没有匹配当前筛选条件的死亡对决游戏，试试切换赛季或清空搜索。'
      : 'No Death Match games match your filter. Try another season or clear search.';
    return;
  }

  els.arenaEmpty.hidden = true;
  els.arenaGrid.innerHTML = filtered
    .map((g) => {
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

      return `
        <article class="game-card" style="--card-accent:${UI.escapeHtml(accent)};" data-slug="${UI.escapeHtml(g.slug)}">
          <div class="game-card-top">
            <div class="game-emblem">${renderEmblemSvg(guessIconKey(g), accent)}</div>
            <div class="game-card-badges">
              ${seasons.map((s) => `<span class="season-tag ${s.toLowerCase()}">${s}</span>`).join('')}
              ${
                wins > 0
                  ? `<span class="game-won-pill">✓ ${wins}W</span>`
                  : ''
              }
              <span class="tg-badge ${playable ? 'tg-badge-emerald' : 'tg-badge-cyan'}">
                ${playable ? (isZh ? '可畅玩' : 'READY') : (isZh ? '开发中' : 'SOON')}
              </span>
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
                    ${isZh ? '进入对决 →' : 'Enter Arena →'}
                  </a>
                  <a class="tg-btn tg-btn-ghost tg-btn-sm" style="flex:0 0 auto;" href="./games/${encodeURIComponent(g.slug)}/?quick=solo" title="${isZh ? '快速单人 AI 开局' : 'Quick Solo AI'}">
                    ⚡ AI
                  </a>`
                : `<button type="button" class="tg-btn tg-btn-ghost tg-btn-sm" data-preview="${UI.escapeHtml(g.slug)}">
                    ${isZh ? '查看规则档案' : 'Preview Dossier'}
                  </button>`
            }
          </div>
        </article>
      `;
    })
    .join('');

  els.arenaGrid.querySelectorAll('.game-card').forEach(bindCardTilt);
  els.arenaGrid.querySelectorAll('[data-preview]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      const g = hubState.games.find((x) => x.slug === btn.dataset.preview);
      if (g) openPreviewModal(g);
    });
  });
}

function renderChronicle() {
  const lang = I18n.getLang();
  const isZh = lang === 'zh';
  const filtered = getFilteredEpisodes();
  els.chipChronicleCount.textContent = String(filtered.length);

  if (!filtered.length) {
    els.chronicleContainer.innerHTML = '';
    els.chronicleEmpty.hidden = false;
    els.chronicleEmpty.textContent = isZh
      ? '没有匹配当前筛选条件的剧集记录。'
      : 'No Death Match episodes match your filter.';
    return;
  }

  els.chronicleEmpty.hidden = true;
  const gameMap = new Map(hubState.games.map((g) => [g.slug, g]));

  // Group by season 1..4
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
            <span class="tg-badge">${UI.escapeHtml(meta.ko)} · ${rows.length} ${isZh ? '场对决' : 'MATCHES'}</span>
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
                              ${isZh ? '挑战此局 →' : 'Play →'}
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

function renderAll() {
  syncStaticCopy();
  renderFilters();
  renderDockSelect();

  const playableCount = hubState.games.filter(isGamePlayable).length;
  els.statEpisodesNum.textContent = String(hubState.episodes.length || 44);
  els.statGamesNum.textContent = String(hubState.games.length);
  els.statPlayableNum.textContent = String(playableCount);

  document.getElementById('btn-view-grid').classList.toggle('is-active', hubState.view === 'grid');
  document.getElementById('btn-view-chronicle').classList.toggle('is-active', hubState.view === 'chronicle');
  els.arenaGridView.hidden = hubState.view !== 'grid';
  els.chronicleView.hidden = hubState.view !== 'chronicle';

  renderArenaGrid();
  renderChronicle();
}

// ============================================================================
// Event Wiring & Bootstrap
// ============================================================================
function wireEvents() {
  document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
    SFX.play('click');
    I18n.toggle();
  });

  document.getElementById('btn-mute')?.addEventListener('click', () => {
    SFX.toggleMute();
    syncStaticCopy();
  });

  document.getElementById('btn-ambience')?.addEventListener('click', () => {
    const on = SFX.toggleAmbience();
    syncStaticCopy();
    UI.toast(
      on
        ? I18n.t({ zh: '已开启死亡对决演播室氛围音', en: 'Death Match studio ambience ON' })
        : I18n.t({ zh: '已关闭氛围音', en: 'Studio ambience OFF' })
    );
  });

  document.getElementById('btn-open-vault')?.addEventListener('click', () => {
    SFX.play('garnetClink');
    openVaultModal();
  });

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      hubState.view = btn.dataset.view;
      renderAll();
    });
  });

  els.searchInput?.addEventListener('input', () => {
    hubState.search = els.searchInput.value;
    renderArenaGrid();
    renderChronicle();
  });

  // Quick-Join & Quick-Duel Dock
  const navigateToRoom = (spectate = false) => {
    const slug = els.dockGameSelect.value;
    const game = hubState.games.find((g) => g.slug === slug);
    const code = normalizeRoomCode(els.dockRoomCode.value);
    const isZh = I18n.getLang() === 'zh';

    if (!game) return;
    if (!isGamePlayable(game)) {
      SFX.play('error');
      UI.toast(
        isZh ? '该对决竞技场正在构建中，请先选择已开放游戏' : 'That arena is still under construction',
        'error'
      );
      return;
    }
    if (code.length < 4) {
      SFX.play('error');
      UI.toast(isZh ? '请输入有效的房间码（如 K7M4P）' : 'Enter a valid 5-char room code', 'error');
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

  document.getElementById('dock-spectate-btn')?.addEventListener('click', () => {
    navigateToRoom(true);
  });

  document.getElementById('dock-quick-duel')?.addEventListener('click', () => {
    const isZh = I18n.getLang() === 'zh';
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
    UI.toast(
      isZh ? '所有对决游戏即将开放，先浏览 44 场经典档案吧！' : 'Arenas launching soon — explore the 44-match archive below!'
    );
    document.getElementById('arena-section')?.scrollIntoView({ behavior: 'smooth' });
  });

  I18n.onChange(() => renderAll());
  GarnetVault.onChange(() => syncStaticCopy());
}

async function bootstrap() {
  initBackdropCanvas();
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

  renderAll();
}

bootstrap();
