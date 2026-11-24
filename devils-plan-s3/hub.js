/**
 * Collection Hub Controller ("The Devil's Plan Season 3: Dead Again")
 * - Atmospheric 30fps obsidian/ember/monolith canvas
 * - 19 playable games + bespoke inline SVG emblems + 5-space color coding
 * - Category filters (All / Main Match / Mini-Game / Prison / Exile / Hidden)
 * - Smart Quick-Join bar (5-char Room Code OR pasted full invite URL)
 * - Ep 11–14 Finale TBA teaser card
 */

import { I18n, SFX, UI, normalizeRoomCode, sanitizePlayerName } from './shared/sdk.js';

const NAME_STORAGE_KEY = 'dp3_player_name';

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

const SPACE_GLOW = {
  studio: 'rgba(212, 175, 106, 0.22)',
  mini: 'rgba(56, 189, 248, 0.2)',
  prison: 'rgba(220, 53, 69, 0.24)',
  exile: 'rgba(245, 158, 11, 0.22)',
  hidden: 'rgba(167, 139, 250, 0.24)',
};

let catalog = { games: [] };
let activeCategory = 'ALL';

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
  muteBtn: document.getElementById('hub-mute-btn'),
  ambBtn: document.getElementById('hub-amb-btn'),
  profileBtn: document.getElementById('hub-profile-btn'),
  profileName: document.getElementById('hub-profile-name'),
};

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
        <input class="dp-input" id="hub-rename-input" type="text" maxlength="20" value="${UI.escapeHtml(current)}" placeholder="${lang === 'zh' ? '输入你的代号（最多 20 字）' : 'Enter your name (max 20 chars)'}" autocomplete="nickname" />
        <p style="font-size:12px;color:var(--dp-ink-muted);margin:8px 0 16px;">
          ${
            lang === 'zh'
              ? '保存后进入任意 19 款第三季游戏时将自动使用该代号，联机时亦可随时修改。'
              : 'Automatically applied across all 19 Season 3 games and editable anytime mid-match.'
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

  const input = backdrop.querySelector('#hub-rename-input');
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
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
      UI.toast(lang === 'zh' ? '代号不能为空' : 'Name cannot be empty', 'error');
      input.focus();
      return;
    }
    SFX.play('click');
    setSavedPlayerName(next);
    syncProfileUI();
    close();
    UI.toast(
      lang === 'zh' ? `已保存参赛代号：${next}` : `Player name saved: ${next}`,
      'success'
    );
  });

  input?.focus();
  input?.select();
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

function syncAudioUI() {
  el.muteBtn.textContent = SFX.isMuted() ? '🔇' : '🔊';
  const on = SFX.isAmbienceOn() && !SFX.isMuted();
  el.ambBtn.style.color = on ? 'var(--dp-brass-bright)' : '';
  el.ambBtn.style.borderColor = on ? 'var(--dp-border-strong)' : '';
}

function parseQuickJoinInput(rawVal) {
  const trimmed = String(rawVal || '').trim();
  // Support pasting a full invite URL: https://.../games/<slug>/?room=K7M4P
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
    <article class="hub-card hub-card-tba" aria-label="Episodes 11 to 14 Finale TBA">
      <div class="hub-card-top">
        <span class="dp-badge dp-badge-crimson">${lang === 'zh' ? '待播剧集 · TBA' : 'UPCOMING · TBA'}</span>
        <span class="hub-card-ep">EP 11–14 · DAY 5–7</span>
      </div>
      <div class="hub-card-head">
        <div class="hub-card-emblem" style="--card-accent:#dc3545;--card-glow:rgba(220,53,69,0.22);">
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
            ? '第三季最终周（第 11–14 集）将于 Netflix 2026年11月24日 17:00 KST 全球同步上线。播出后将按同套联机规范第一时间追加收录，绝不混入 S1/S2 旧作。'
            : 'Season 3 final batch (Episodes 11–14: Days 5–7 & Grand Finale) premieres on Netflix Nov 24, 2026 at 17:00 KST. New games will be added faithfully after broadcast.'
        }
      </p>
      <div class="hub-tba-pill">⏳ ${lang === 'zh' ? '敬请期待 · 播出后更新' : 'LOCKED UNTIL BROADCAST'}</div>
    </article>
  `;
}

function renderHub() {
  const lang = I18n.getLang();
  el.lead.textContent = I18n.t({
    zh: '完整复刻 Netflix《魔鬼的计谋》第三季（死亡重启 · Ep 1–10）全部 19 款脑力博弈。无需下载，5 位房间码即可与好友实时联机，或随时单人挑战 AI 对手。',
    en: "Play all 19 mind games from Netflix's The Devil's Plan Season 3: Dead Again (Ep 1–10). Zero-install online multiplayer via 5-char room codes, Solo vs smart AI, or Pass-and-Play.",
  });

  const pillars = [
    { zh: '19 款第三季全收录 (Ep 1–10)', en: 'All 19 Season 3 Games (Ep 1–10)' },
    { zh: 'P2P + 加密中继实时联机', en: 'P2P + Encrypted Relay Online' },
    { zh: '单人智能 AI 随时开局', en: 'Instant Solo vs AI Bots' },
    { zh: '同屏传屏隐私护盾', en: 'Pass-and-Play Privacy Shield' },
  ];
  el.pillars.innerHTML = pillars
    .map((p) => `<span class="hub-pillar"><span class="hub-pillar-dot"></span>${UI.escapeHtml(I18n.t(p))}</span>`)
    .join('');

  el.qjLabel.innerHTML = `
    <span>${UI.escapeHtml(I18n.t({ zh: '快速加入好友房间 · QUICK JOIN', en: 'QUICK JOIN LIVE ROOM' }))}</span>
    <span style="font-weight:500;color:var(--dp-ink-faint);text-transform:none;letter-spacing:0;">
      ${UI.escapeHtml(I18n.t({ zh: '支持输入 5 位房间码，或直接粘贴邀请链接', en: 'Enter 5-char code or paste full invite link' }))}
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

  // Populate Quick Join dropdown
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

  // Filters
  el.filters.innerHTML = CATEGORIES.map((c) => {
    const count = games.filter((g) => matchesCategory(g, c.key)).length;
    return `
      <button type="button" class="hub-filter-btn ${activeCategory === c.key ? 'is-active' : ''}" data-cat="${c.key}">
        ${UI.escapeHtml(I18n.t(c.label))} <span style="opacity:0.68;margin-left:3px;">${count}</span>
      </button>
    `;
  }).join('');

  el.filters.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      activeCategory = btn.dataset.cat;
      renderHub();
    });
  });

  const visible = games.filter((g) => matchesCategory(g, activeCategory));
  el.catCount.textContent = I18n.t(
    {
      zh: `共收录 {total} 款可玩模块（Ep 1–10）· 当前显示 {shown} 款`,
      en: `{total} playable modules (Ep 1–10) · showing {shown}`,
    },
    { total: games.length, shown: visible.length }
  );

  if (!visible.length) {
    el.grid.innerHTML = `
      <div class="hub-empty">
        <div class="dp-badge" style="margin-bottom:10px;">SEASON 3 · DEAD AGAIN</div>
        <h3 style="margin:0 0 8px;font-family:var(--dp-font-display);font-size:20px;">
          ${UI.escapeHtml(I18n.t({ zh: '该分类下暂无游戏', en: 'No games in this category' }))}
        </h3>
      </div>
    `;
    return;
  }

  const cardsHtml = visible
    .map((g) => {
      const titleMain = lang === 'zh' ? g.title?.zh || g.title?.en : g.title?.en || g.title?.zh;
      const titleAlt =
        lang === 'zh'
          ? [g.title?.en, g.title?.ko].filter(Boolean).join(' · ')
          : [g.title?.zh, g.title?.ko].filter(Boolean).join(' · ');
      const pMin = g.players?.min ?? 2;
      const pMax = g.players?.max ?? 8;
      const accent = g.accent || '#d4af6a';
      const glow = SPACE_GLOW[g.space] || SPACE_GLOW.studio;
      const emblem = EMBLEMS[g.icon] || EMBLEMS.piece;
      const href = `./games/${encodeURIComponent(g.slug)}/`;
      return `
        <article class="hub-card" style="--card-accent:${UI.escapeHtml(accent)};--card-glow:${glow};">
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
            <span class="hub-meta-pill">👥 ${pMin === pMax ? pMin : `${pMin}–${pMax}`}P</span>
            ${g.duration ? `<span class="hub-meta-pill">⏱ ${UI.escapeHtml(g.duration)}</span>` : ''}
            <span class="hub-meta-pill">🌐 ONLINE / AI</span>
          </div>
          <div class="hub-card-actions">
            <a class="dp-btn dp-btn-primary" href="${href}" style="flex:1;">
              ${UI.escapeHtml(I18n.t({ zh: '进入演播室开局 →', en: 'Enter Arena →' }))}
            </a>
          </div>
        </article>
      `;
    })
    .join('');

  // Show Ep 11–14 Finale TBA teaser when viewing ALL or HIDDEN/MAIN
  const showTba = activeCategory === 'ALL' || activeCategory === 'MAIN';
  el.grid.innerHTML = cardsHtml + (showTba ? renderTbaCard(lang) : '');
  syncAudioUI();
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

el.muteBtn.addEventListener('click', () => {
  SFX.toggleMute();
  syncAudioUI();
});

el.ambBtn.addEventListener('click', () => {
  const on = SFX.toggleAmbience();
  syncAudioUI();
  UI.toast(on ? I18n.t({ zh: '氛围音已开启', en: 'Ambience ON' }) : I18n.t({ zh: '氛围音已关闭', en: 'Ambience OFF' }));
});

// Remove maxLength restriction in JS so users can paste a full invite URL seamlessly!
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
    UI.toast(
      I18n.t({ zh: '请输入有效的 5 位房间码或粘贴完整邀请链接', en: 'Enter a valid 5-char room code or paste an invite URL' }),
      'error'
    );
    el.qjCode.focus();
    return;
  }
  SFX.play('click');
  window.location.href = `./games/${encodeURIComponent(slug)}/?room=${encodeURIComponent(code)}`;
});

I18n.onChange(() => renderHub());

// Atmospheric Ember & Studio Monolith Canvas (capped at 30fps, honors reduced motion)
function startStudioCanvas() {
  const canvas = document.getElementById('hub-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let width = 0;
  let height = 0;
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

  const count = width < 700 ? 28 : 56;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -(0.18 + Math.random() * 0.55),
      crimson: Math.random() < 0.36,
      alpha: 0.22 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let lastFrame = 0;
  function draw(now) {
    if (document.hidden) {
      requestAnimationFrame(draw);
      return;
    }
    if (now - lastFrame < 33) {
      requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      if (!reduced) {
        p.x += p.vx + Math.sin(now * 0.0007 + p.phase) * 0.16;
        p.y += p.vy;
        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
      }
      const glow = p.alpha * (0.7 + 0.3 * Math.sin(now * 0.002 + p.phase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.crimson
        ? `rgba(235, 72, 88, ${glow.toFixed(3)})`
        : `rgba(230, 194, 118, ${glow.toFixed(3)})`;
      ctx.fill();
    }

    if (!reduced) requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

async function init() {
  startStudioCanvas();
  syncAudioUI();
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
