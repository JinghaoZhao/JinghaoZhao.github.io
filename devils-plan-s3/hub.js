/**
 * Collection Hub Controller ("The Devil's Plan Season 3: Dead Again")
 * - Dual-Theme adaptive studio canvas (30fps, honors reduced-motion & document.hidden)
 * - Persistent filter bar with GPU slidingIndicator + FLIP card transitions
 * - Animated tabular game counters + initial skeleton crossfade + sharpened §4 copy
 */

import {
  I18n,
  SFX,
  UI,
  Motion,
  Theme,
  normalizeRoomCode,
  sanitizePlayerName,
} from './shared/sdk.js';

const NAME_STORAGE_KEY = 'dp3_player_name';

const SVG_ICONS = {
  soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  ambience: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0 2 2 2 0"/></svg>`,
};

function getSavedPlayerName() {
  try {
    return sanitizePlayerName(localStorage.getItem(NAME_STORAGE_KEY) || '', '');
  } catch (_) {
    return '';
  }
}

function setSavedPlayerName(name) {
  try {
    const clean = sanitizePlayerName(name, '');
    if (clean) localStorage.setItem(NAME_STORAGE_KEY, clean);
  } catch (_) {}
}

const CATEGORIES = [
  { key: 'ALL', label: { zh: '全部游戏', en: 'All' } },
  { key: 'MAIN', label: { zh: '主赛 Main', en: 'Main Match' } },
  { key: 'MINI', label: { zh: '小游戏 Mini', en: 'Mini-Game' } },
  { key: 'PRISON', label: { zh: '监狱赛 Prison', en: 'Prison Match' } },
  { key: 'EXILE', label: { zh: '流放地 Exile', en: 'Exile Match' } },
  { key: 'HIDDEN', label: { zh: '隐藏关 Hidden', en: 'Hidden Stage' } },
];

const EMBLEMS = {
  scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M6 21h12M4 7h16"/><path d="M7 7 4 14a3 3 0 0 0 6 0L7 7Z"/><path d="M17 7l-3 7a3 3 0 0 0 6 0l-3-7Z"/></svg>`,
  cubes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M12 12 4 7.5M12 12l8-4.5M12 12v9"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><rect x="9" y="9" width="6" height="6" fill="currentColor" fill-opacity="0.24"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="4" width="11" height="15" rx="2"/><path d="M9 19h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path d="M9.5 9.5 11.5 12l-2 2.5L7.5 12l2-2.5Z" fill="currentColor"/></svg>`,
  grass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 14h5v6H4zM9 9h5v11H9zM14 4h6v5h-6zM14 14h6v6h-6z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 4h12l4 5-10 11L2 9l4-5Z"/><path d="M2 9h20M12 20 8 9l4-5 4 5-4 11Z"/></svg>`,
  gavel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5 5 5-3 3-5-5 3-3Z"/><path d="m12.5 11.5-7 7"/><path d="M3 21h10"/></svg>`,
  weights: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7 8h10l2 12H5L7 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/><text x="12" y="16.5" text-anchor="middle" font-size="6.5" fill="currentColor" stroke="none" font-weight="700">13</text></svg>`,
  revolver: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="6.5" r="1.4" fill="currentColor"/><circle cx="16.8" cy="9.2" r="1.4"/><circle cx="16.8" cy="14.8" r="1.4" fill="currentColor"/><circle cx="12" cy="17.5" r="1.4"/><circle cx="7.2" cy="14.8" r="1.4"/><circle cx="7.2" cy="9.2" r="1.4"/></svg>`,
  piggy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="7.5" ry="5.5"/><path d="M9.5 10h5"/><circle cx="12" cy="5.5" r="1.8" fill="currentColor"/><path d="M8 18v2M16 18v2M19.5 12.5h1.8"/></svg>`,
  walls: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v9h9M3 12h6v9" stroke-width="2.4"/><rect x="5.5" y="5.5" width="3.5" height="3.5" fill="currentColor"/><circle cx="16.5" cy="16.5" r="2" fill="currentColor"/></svg>`,
  piece: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><polygon points="12,2 21,8.5 17.5,20 6.5,20 3,8.5"/><polygon points="12,7 16,10.5 14.5,16 9.5,16 8,10.5" fill="currentColor" fill-opacity="0.22"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
  cipher: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10h2v4h-2zM16 10l2 4"/></svg>`,
  loop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h8v6h6v8H9v-6H5V5Z"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/></svg>`,
  symmetry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3v18" stroke-dasharray="2.5 2.5"/><path d="M10 6 4 12l6 6V6ZM14 6l6 6-6 6V6Z" fill="currentColor" fill-opacity="0.16"/></svg>`,
  temple: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 9 12 3l9 6H3Z"/><path d="M5 9v10M9.5 9v10M14.5 9v10M19 9v10M3 19h18"/></svg>`,
  vault: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4.5"/><path d="M12 7.5v9M7.5 12h9"/></svg>`,
};

const SPACE_ACCENT_VAR = {
  studio: 'var(--dp-brass)',
  mini: 'var(--dp-cyan)',
  prison: 'var(--dp-crimson)',
  exile: 'var(--dp-amber)',
  hidden: 'var(--dp-violet)',
};

const SPACE_GLOW = {
  studio: 'rgba(212, 175, 106, 0.16)',
  mini: 'rgba(56, 189, 248, 0.15)',
  prison: 'rgba(220, 53, 69, 0.16)',
  exile: 'rgba(245, 158, 11, 0.15)',
  hidden: 'rgba(167, 139, 250, 0.16)',
};

let catalog = { games: [] };
let activeCategory = 'ALL';
let initialGridLoaded = false;
let prevShownCount = 0;

const el = {
  lead: document.getElementById('hub-lead-text'),
  pillars: document.getElementById('hub-pillars'),
  qjLabel: document.getElementById('hub-qj-label'),
  qjForm: document.getElementById('hub-quickjoin-form'),
  qjGame: document.getElementById('hub-qj-game'),
  qjCode: document.getElementById('hub-qj-code'),
  qjSubmit: document.getElementById('hub-qj-submit'),
  catTitle: document.getElementById('hub-catalog-title'),
  catCount: document.getElementById('hub-catalog-count'),
  filters: document.getElementById('hub-filters'),
  grid: document.getElementById('hub-grid'),
  footerLeft: document.getElementById('hub-footer-left'),
  footerHome: document.getElementById('hub-footer-home'),
  langBtn: document.getElementById('hub-lang-btn'),
  themeBtn: document.getElementById('hub-theme-btn'),
  muteBtn: document.getElementById('hub-mute-btn'),
  ambBtn: document.getElementById('hub-amb-btn'),
  profileBtn: document.getElementById('hub-profile-btn'),
  profileName: document.getElementById('hub-profile-name'),
};

if (el.themeBtn) {
  el.themeBtn.innerHTML = Theme.renderToggleIcon();
}

function syncProfileUI() {
  const lang = I18n.getLang();
  const saved = getSavedPlayerName();
  if (el.profileName) {
    el.profileName.textContent = saved || (lang === 'zh' ? '参赛者' : 'Player');
  }
  if (el.profileBtn) {
    el.profileBtn.title = lang === 'zh' ? '修改参赛代号' : 'Edit Player Name';
  }
}

function syncAudioAndThemeUI() {
  const lang = I18n.getLang();
  el.muteBtn.innerHTML = SFX.isMuted() ? SVG_ICONS.soundOff : SVG_ICONS.soundOn;
  el.muteBtn.title = SFX.isMuted()
    ? lang === 'zh'
      ? '取消静音'
      : 'Unmute SFX'
    : lang === 'zh'
    ? '静音'
    : 'Mute SFX';

  el.ambBtn.innerHTML = SVG_ICONS.ambience;
  const ambOn = SFX.isAmbienceOn() && !SFX.isMuted();
  el.ambBtn.style.color = ambOn ? 'var(--dp-brass-bright)' : '';
  el.ambBtn.style.borderColor = ambOn ? 'var(--dp-border-strong)' : '';
  el.ambBtn.title = ambOn
    ? lang === 'zh'
      ? '关闭氛围音'
      : 'Ambience Off'
    : lang === 'zh'
    ? '开启氛围音'
    : 'Ambience On';

  const isDark = Theme.get() === 'dark';
  const themeLabel = isDark
    ? lang === 'zh'
      ? '切换浅色模式'
      : 'Switch to Light Mode'
    : lang === 'zh'
    ? '切换深色模式'
    : 'Switch to Dark Mode';
  el.themeBtn.title = themeLabel;
  el.themeBtn.setAttribute('aria-label', themeLabel);
}

function openHubRenameModal() {
  document.getElementById('hub-rename-modal')?.remove();
  const lang = I18n.getLang();
  const current = getSavedPlayerName() || (lang === 'zh' ? '参赛者' : 'Player');
  const backdrop = document.createElement('div');
  backdrop.className = 'dp-modal-backdrop';
  backdrop.id = 'hub-rename-modal';
  backdrop.style.zIndex = '105';
  backdrop.innerHTML = `
    <div class="dp-modal" style="width:min(420px,100%);" role="dialog" aria-modal="true">
      <div class="dp-modal-header" style="margin-bottom:12px;">
        <div>
          <span class="dp-badge">${lang === 'zh' ? '参赛身份' : 'PLAYER IDENTITY'}</span>
          <h3 class="dp-modal-title" style="font-size:19px;">${lang === 'zh' ? '设置参赛代号' : 'Set Player Name'}</h3>
        </div>
        <button type="button" class="dp-btn dp-btn-icon dp-btn-ghost" id="hub-rename-close" aria-label="Close">✕</button>
      </div>
      <form id="hub-rename-form">
        <input class="dp-input" id="hub-rename-input" type="text" maxlength="20" value="${UI.escapeHtml(current)}" placeholder="${lang === 'zh' ? '输入代号（最多 20 字）' : 'Enter name (max 20 chars)'}" autocomplete="nickname" />
        <p style="font-size:12px;color:var(--dp-ink-muted);margin:8px 0 16px;">
          ${
            lang === 'zh'
              ? '保存后自动同步至全部 19 款游戏，联机时亦可随时修改。'
              : 'Saved across all 19 games and editable anytime mid-match.'
          }
        </p>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="dp-btn dp-btn-ghost" id="hub-rename-cancel">${lang === 'zh' ? '取消' : 'Cancel'}</button>
          <button type="submit" class="dp-btn dp-btn-primary">${lang === 'zh' ? '保存代号' : 'Save Name'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  Motion.enter(backdrop, { variant: 'modal' });

  const input = backdrop.querySelector('#hub-rename-input');
  const close = () => {
    document.removeEventListener('keydown', onKey);
    Motion.exit(backdrop, { variant: 'modal', remove: true, timeoutMs: 200 });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.querySelector('#hub-rename-close')?.addEventListener('click', close);
  backdrop.querySelector('#hub-rename-cancel')?.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelector('#hub-rename-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = sanitizePlayerName(input.value, '');
    if (!next) {
      SFX.play('error');
      Motion.shake(input);
      UI.toast(lang === 'zh' ? '代号不能为空' : 'Name cannot be empty', 'error');
      input.focus();
      return;
    }
    SFX.play('click');
    setSavedPlayerName(next);
    syncProfileUI();
    close();
    UI.toast(lang === 'zh' ? `已保存代号：${next}` : `Player name saved: ${next}`, 'success');
  });

  requestAnimationFrame(() => {
    input?.focus();
    input?.select();
  });
}

function matchesCategory(game, filterKey) {
  if (filterKey === 'ALL') return true;
  const cat = String(game.category || '').toUpperCase();
  if (filterKey === 'MAIN') return cat.includes('MAIN');
  if (filterKey === 'MINI') return cat.includes('MINI');
  if (filterKey === 'PRISON') return cat.includes('PRISON') || cat.includes('DEATH');
  if (filterKey === 'EXILE') return cat.includes('EXILE') || cat.includes('REVIV');
  if (filterKey === 'HIDDEN') return cat.includes('HIDDEN') || cat.includes('FINAL');
  return true;
}

function badgeClassFor(category) {
  const c = String(category || '').toUpperCase();
  if (c.includes('PRISON') || c.includes('DEATH')) return 'dp-badge dp-badge-crimson';
  if (c.includes('EXILE')) return 'dp-badge dp-badge-amber';
  if (c.includes('MINI')) return 'dp-badge dp-badge-cyan';
  if (c.includes('HIDDEN') || c.includes('FINAL')) return 'dp-badge dp-badge-violet';
  return 'dp-badge';
}

function parseQuickJoinInput(rawVal) {
  const trimmed = String(rawVal || '').trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('?room=')) {
    try {
      const url = new URL(trimmed, window.location.href);
      const room = normalizeRoomCode(url.searchParams.get('room') || '');
      const m = url.pathname.match(/\/games\/([^/]+)\/?/);
      return { slug: m ? decodeURIComponent(m[1]) : null, code: room };
    } catch (_) {}
  }
  return { slug: null, code: normalizeRoomCode(trimmed) };
}

function renderTbaCard(lang) {
  return `
    <article class="hub-card hub-card-tba" data-motion-key="card-tba" aria-label="Episodes 11 to 14 Finale TBA">
      <div class="hub-card-top">
        <span class="dp-badge dp-badge-crimson">${lang === 'zh' ? '待播剧集 · TBA' : 'UPCOMING · TBA'}</span>
        <span class="hub-card-ep">EP 11–14 · DAY 5–7</span>
      </div>
      <div class="hub-card-head">
        <div class="hub-card-emblem" style="--card-accent:var(--dp-crimson);--card-glow:rgba(220,53,69,0.16);">
          ${EMBLEMS.piece}
        </div>
        <div>
          <h3 class="hub-card-title">${lang === 'zh' ? '第 11–14 集终极决战' : 'Ep 11–14 · Grand Finale'}</h3>
          <div class="hub-card-subtitle" style="color:var(--dp-crimson-bright);">
            ${lang === 'zh' ? 'Day 5–7 主赛 / 监狱赛 / 总决赛' : 'Day 5–7 Matches & Finale · 미공개'}
          </div>
        </div>
      </div>
      <p class="hub-card-tagline">
        ${
          lang === 'zh'
            ? '第三季最终周（第 11–14 集）上线后将按同套联机规范第一时间追加收录，绝不混入 S1/S2 旧作。'
            : 'Season 3 final batch (Episodes 11–14: Days 5–7 & Grand Finale) will be added faithfully once broadcast.'
        }
      </p>
      <div class="hub-tba-pill">⏳ ${lang === 'zh' ? '敬请期待 · 播出后更新' : 'LOCKED UNTIL BROADCAST'}</div>
    </article>
  `;
}

// Persistent Filter Bar (mounts buttons once so focus & DOM identity NEVER break!)
function ensureFiltersMounted() {
  if (el.filters.querySelector('.hub-filter-btn')) return;
  el.filters.innerHTML = CATEGORIES.map(
    (c) => `
      <button type="button" class="hub-filter-btn" data-cat="${c.key}" data-motion-key="flt-${c.key}" role="tab">
        <span class="hub-flt-label"></span>
        <span class="hub-flt-count dp-tabular" style="opacity:0.65;margin-left:3px;">0</span>
      </button>
    `
  ).join('');

  Motion.delegate(
    el.filters,
    'click',
    '.hub-filter-btn',
    (_e, btn) => {
      if (btn.dataset.cat === activeCategory) return;
      SFX.play('click');
      activeCategory = btn.dataset.cat;
      renderHub({ fromFilter: true });
    },
    'hub-filter'
  );
}

function updateFilterBar(games) {
  ensureFiltersMounted();
  let activeBtn = null;
  for (const c of CATEGORIES) {
    const btn = el.filters.querySelector(`[data-cat="${c.key}"]`);
    if (!btn) continue;
    const isActive = activeCategory === c.key;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.querySelector('.hub-flt-label').textContent = I18n.t(c.label);
    btn.querySelector('.hub-flt-count').textContent = String(
      games.filter((g) => matchesCategory(g, c.key)).length
    );
    if (isActive) activeBtn = btn;
  }
  requestAnimationFrame(() => Motion.slidingIndicator(el.filters, activeBtn));
}

function renderHub({ fromFilter = false } = {}) {
  const lang = I18n.getLang();
  el.lead.textContent = I18n.t({
    zh: '《魔鬼的计谋》第三季（Ep 1–10）全部 19 款脑力博弈。浏览器即开即玩——支持 5 位房间码实时联机、单人 AI 对战与同屏传屏。',
    en: "All 19 mind games from The Devil's Plan S3 (Ep 1–10). Play instantly in your browser — live room-code multiplayer, Solo AI, or Pass & Play.",
  });

  const pillars = [
    { zh: '19 款第三季全收录 (Ep 1–10)', en: 'All 19 Season 3 Games (Ep 1–10)' },
    { zh: 'P2P + 加密中继实时联机', en: 'P2P + Encrypted Relay Online' },
    { zh: '单人智能 AI 随时开局', en: 'Instant Solo vs AI Bots' },
    { zh: '同屏传屏隐私护盾', en: 'Pass-and-Play Privacy Shield' },
  ];
  Motion.patchDOM(
    el.pillars,
    pillars
      .map(
        (p, i) =>
          `<span class="hub-pillar" data-motion-key="pil-${i}"><span class="hub-pillar-dot"></span>${UI.escapeHtml(I18n.t(p))}</span>`
      )
      .join('')
  );

  el.qjLabel.innerHTML = `
    <span>${UI.escapeHtml(I18n.t({ zh: '快速加入好友房间 · QUICK JOIN', en: 'QUICK JOIN LIVE ROOM' }))}</span>
    <span style="font-weight:500;color:var(--dp-ink-faint);text-transform:none;letter-spacing:0;">
      ${UI.escapeHtml(I18n.t({ zh: '支持 5 位房间码或直接粘贴邀请链接', en: 'Enter 5-char code or paste full invite link' }))}
    </span>
  `;
  el.qjCode.placeholder = I18n.t({ zh: '房间码 (如 K7M4P) 或粘贴链接', en: 'CODE (K7M4P) OR INVITE URL' });
  el.qjSubmit.textContent = I18n.t({ zh: '进入房间 →', en: 'Join Room →' });

  el.catTitle.textContent = I18n.t({ zh: '第三季游戏档案', en: 'SEASON 3 GAME ARCHIVE' });
  el.footerLeft.textContent = I18n.t({
    zh: '魔鬼的计谋 第三季：死亡重启 · 粉丝向交互式脑力博弈合集',
    en: "The Devil's Plan S3: Dead Again · Interactive Mind-Game Collection",
  });
  el.footerHome.textContent = I18n.t({ zh: '← 返回 Jinghao Zhao 主页', en: '← Back to Jinghao Zhao' });

  const games = catalog.games || [];

  if (games.length) {
    const prev = el.qjGame.value;
    el.qjGame.innerHTML = games
      .map(
        (g) =>
          `<option value="${UI.escapeHtml(g.slug)}">${UI.escapeHtml(I18n.t(g.title))} · ${UI.escapeHtml(g.category || '')}</option>`
      )
      .join('');
    if (prev && games.some((g) => g.slug === prev)) el.qjGame.value = prev;
    el.qjSubmit.disabled = false;
  } else {
    el.qjGame.innerHTML = `<option value="">${UI.escapeHtml(I18n.t({ zh: '载入中...', en: 'Loading...' }))}</option>`;
    el.qjSubmit.disabled = true;
  }

  updateFilterBar(games);

  const visible = games.filter((g) => matchesCategory(g, activeCategory));
  const countPrefix =
    lang === 'zh'
      ? `共收录 ${games.length} 款可玩模块（Ep 1–10）· 当前显示 `
      : `${games.length} playable modules (Ep 1–10) · showing `;
  const countSuffix = lang === 'zh' ? ' 款' : '';

  let shownSpan = el.catCount.querySelector('#hub-shown-num');
  if (!shownSpan) {
    el.catCount.innerHTML = `<span id="hub-count-pre"></span><strong id="hub-shown-num" class="dp-tabular" style="color:var(--dp-ink);">${visible.length}</strong><span id="hub-count-suf"></span>`;
    shownSpan = el.catCount.querySelector('#hub-shown-num');
  }
  el.catCount.querySelector('#hub-count-pre').textContent = countPrefix;
  el.catCount.querySelector('#hub-count-suf').textContent = countSuffix;
  if (fromFilter && prevShownCount !== visible.length) {
    Motion.animateNumber(shownSpan, prevShownCount, visible.length, { duration: 220 });
  } else {
    shownSpan.textContent = String(visible.length);
  }
  prevShownCount = visible.length;

  if (!games.length) return;

  if (!visible.length) {
    Motion.patchDOM(
      el.grid,
      `<div class="hub-empty" data-motion-key="hub-empty">
        <div class="dp-badge" style="margin-bottom:10px;">SEASON 3 · DEAD AGAIN</div>
        <h3 style="margin:0 0 8px;font-family:var(--dp-font-display);font-size:20px;">
          ${UI.escapeHtml(I18n.t({ zh: '该分类下暂无游戏', en: 'No games in this category' }))}
        </h3>
      </div>`
    );
    return;
  }

  const shouldStagger = !initialGridLoaded;
  const prevRects = initialGridLoaded ? Motion.captureFlip(el.grid, '[data-motion-key]') : null;

  const cardsHtml = visible
    .map((g, idx) => {
      const titleMain = lang === 'zh' ? g.title?.zh || g.title?.en : g.title?.en || g.title?.zh;
      const titleAlt =
        lang === 'zh'
          ? [g.title?.en, g.title?.ko].filter(Boolean).join(' · ')
          : [g.title?.zh, g.title?.ko].filter(Boolean).join(' · ');
      const pMin = g.players?.min ?? 2;
      const pMax = g.players?.max ?? 8;
      const accent = SPACE_ACCENT_VAR[g.space] || g.accent || 'var(--dp-brass)';
      const glow = SPACE_GLOW[g.space] || SPACE_GLOW.studio;
      const emblem = EMBLEMS[g.icon] || EMBLEMS.piece;
      const href = `./games/${encodeURIComponent(g.slug)}/`;
      const staggerCls = shouldStagger ? ' is-stagger-in' : '';
      const staggerStyle = shouldStagger ? `--stagger-i:${Math.min(idx, 8)};` : '';
      return `
        <article class="hub-card${staggerCls}" data-motion-key="card-${UI.escapeHtml(g.slug)}" style="${staggerStyle}--card-accent:${accent};--card-glow:${glow};">
          <div class="hub-card-top">
            <span class="${badgeClassFor(g.category)}">${UI.escapeHtml(g.category || 'MATCH')}</span>
            <span class="hub-card-ep">${UI.escapeHtml(g.episode || 'S3')}</span>
          </div>
          <div class="hub-card-head">
            <div class="hub-card-emblem" aria-hidden="true">${emblem}</div>
            <div style="min-width:0;">
              <h3 class="hub-card-title">${UI.escapeHtml(titleMain)}</h3>
              ${titleAlt ? `<div class="hub-card-subtitle">${UI.escapeHtml(titleAlt)}</div>` : ''}
            </div>
          </div>
          <p class="hub-card-tagline">${UI.escapeHtml(I18n.t(g.tagline))}</p>
          <div class="hub-card-meta">
            <span class="hub-meta-pill dp-tabular">👥 ${pMin === pMax ? pMin : `${pMin}–${pMax}`}P</span>
            ${g.duration ? `<span class="hub-meta-pill dp-tabular">⏱ ${UI.escapeHtml(g.duration)}</span>` : ''}
            <span class="hub-meta-pill">🌐 ONLINE / AI</span>
          </div>
          <div class="hub-card-actions">
            <a class="dp-btn dp-btn-primary" href="${href}" style="flex:1;">
              <span>${UI.escapeHtml(I18n.t({ zh: '进入对局', en: 'Play' }))}</span>
              <span class="hub-card-cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </article>
      `;
    })
    .join('');

  const showTba = activeCategory === 'ALL' || activeCategory === 'MAIN';
  Motion.patchDOM(el.grid, cardsHtml + (showTba ? renderTbaCard(lang) : ''), {
    onMountNode: (node) => {
      if (initialGridLoaded) node.classList.add('dp-enter');
    },
  });

  if (prevRects && prevRects.size > 0) {
    Motion.playFlip(el.grid, prevRects, { itemSelector: '[data-motion-key]', duration: 220 });
  }
  initialGridLoaded = true;
  syncAudioAndThemeUI();
  syncProfileUI();
}

// Wire controls
el.profileBtn?.addEventListener('click', () => {
  SFX.play('click');
  openHubRenameModal();
});

el.langBtn.addEventListener('click', () => {
  SFX.play('click');
  I18n.toggle();
});

el.themeBtn?.addEventListener('click', () => {
  SFX.play('click');
  Theme.toggle();
  syncAudioAndThemeUI();
});

el.muteBtn.addEventListener('click', () => {
  SFX.toggleMute();
  syncAudioAndThemeUI();
});

el.ambBtn.addEventListener('click', () => {
  const on = SFX.toggleAmbience();
  syncAudioAndThemeUI();
  UI.toast(
    on
      ? I18n.t({ zh: '氛围音已开启', en: 'Ambience On' })
      : I18n.t({ zh: '氛围音已关闭', en: 'Ambience Off' })
  );
});

el.qjCode.removeAttribute('maxlength');
el.qjCode.addEventListener('input', () => {
  const val = el.qjCode.value;
  if (!val.includes('http') && !val.includes('?')) {
    el.qjCode.value = normalizeRoomCode(val);
  }
});

el.qjForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const parsed = parseQuickJoinInput(el.qjCode.value);
  const slug = parsed.slug || el.qjGame.value;
  const code = parsed.code;
  if (!slug) return;
  if (code.length < 4) {
    SFX.play('error');
    Motion.shake(el.qjCode);
    UI.toast(
      I18n.t({
        zh: '请输入 5 位房间码，或粘贴邀请链接',
        en: 'Enter a 5-char room code or paste an invite link',
      }),
      'error'
    );
    el.qjCode.focus();
    return;
  }
  SFX.play('click');
  window.location.href = `./games/${encodeURIComponent(slug)}/?room=${encodeURIComponent(code)}`;
});

I18n.onChange(() => renderHub());
Theme.onChange(() => syncAudioAndThemeUI());

window.addEventListener(
  'resize',
  () => {
    const activeBtn = el.filters.querySelector('.hub-filter-btn.is-active');
    if (activeBtn) Motion.slidingIndicator(el.filters, activeBtn, { instant: true });
  },
  { passive: true }
);

// Atmospheric Ember & Studio Dust Canvas (30fps, dual-theme adaptive, pauses when hidden/reduced)
function startStudioCanvas() {
  const canvas = document.getElementById('hub-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let rafId = 0;
  const particles = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  const count = width < 700 ? 24 : 48;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.26,
      vy: -(0.16 + Math.random() * 0.48),
      crimson: Math.random() < 0.34,
      alpha: 0.2 + Math.random() * 0.48,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let lastFrame = 0;

  function renderFrame(now, move) {
    ctx.clearRect(0, 0, width, height);
    const isLight = Theme.get() === 'light';
    for (const p of particles) {
      if (move) {
        p.x += p.vx + Math.sin(now * 0.0007 + p.phase) * 0.14;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
      }
      const glow =
        (isLight ? p.alpha * 0.48 : p.alpha) * (0.72 + 0.28 * Math.sin(now * 0.002 + p.phase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (isLight) {
        ctx.fillStyle = p.crimson
          ? `rgba(185, 28, 44, ${glow.toFixed(3)})`
          : `rgba(154, 110, 31, ${glow.toFixed(3)})`;
      } else {
        ctx.fillStyle = p.crimson
          ? `rgba(235, 72, 88, ${glow.toFixed(3)})`
          : `rgba(230, 194, 118, ${glow.toFixed(3)})`;
      }
      ctx.fill();
    }
  }

  function loop(now) {
    rafId = 0;
    if (document.hidden || Motion.isReduced()) {
      renderFrame(now, false);
      return;
    }
    if (now - lastFrame >= 33) {
      lastFrame = now;
      renderFrame(now, true);
    }
    rafId = requestAnimationFrame(loop);
  }

  function kick() {
    if (Motion.isReduced()) {
      renderFrame(performance.now(), false);
      return;
    }
    if (!rafId && !document.hidden) {
      rafId = requestAnimationFrame(loop);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) kick();
  });
  Theme.onChange(() => renderFrame(performance.now(), false));
  kick();
}

async function init() {
  startStudioCanvas();
  syncAudioAndThemeUI();
  syncProfileUI();
  renderHub();
  try {
    const res = await fetch('./games.json?v=' + Date.now());
    if (res.ok) {
      catalog = await res.json();
    }
  } catch (err) {
    console.warn('[Hub] Could not load games.json:', err);
  }
  renderHub();
}

init();
