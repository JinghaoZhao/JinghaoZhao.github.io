/**
 * Garnet Privacy Curtain (Pass-and-Play Turn Handover Shield)
 * Interruptible opacity veil + refined calm broadcast copy.
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { Motion } from './motion.js';

export function showPrivacyCurtain(nextSeat, onReveal) {
  removePrivacyCurtain(true);
  const overlay = document.createElement('div');
  overlay.className = 'tg-curtain';
  overlay.id = 'tg-privacy-curtain';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const name = nextSeat?.name || I18n.t({ zh: '下一位参赛者', en: 'Next Contestant' });
  const badgeText = I18n.t({ zh: '隐私护盾', en: 'PRIVACY SHIELD' });
  const hint = I18n.t({
    zh: '请将设备交予该参赛者，确认对手移开视线后继续',
    en: 'Pass the device to this player before revealing.',
  });
  const btnText = I18n.t({ zh: '揭晓我的视图', en: 'Reveal My View' });

  overlay.innerHTML = `
    <div class="tg-curtain-gem" aria-hidden="true">
      <svg viewBox="0 0 80 96" width="64" height="78">
        <defs>
          <linearGradient id="tgCurtainRuby" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff5c7c"/>
            <stop offset="48%" stop-color="#d91b3a"/>
            <stop offset="100%" stop-color="#580615"/>
          </linearGradient>
        </defs>
        <polygon points="40,4 74,30 62,88 40,94 18,88 6,30" fill="url(#tgCurtainRuby)" stroke="#e4b95b" stroke-width="2"/>
        <polygon points="40,4 58,34 40,72 22,34" fill="rgba(255,255,255,0.22)"/>
        <polygon points="40,4 74,30 58,34" fill="rgba(255,240,194,0.34)"/>
      </svg>
    </div>
    <span class="tg-badge tg-badge-garnet">${badgeText}</span>
    <div class="tg-curtain-name">${escapeHtml(name)}</div>
    <p class="tg-curtain-hint">${hint}</p>
    <button type="button" class="tg-btn tg-btn-garnet" id="tg-curtain-reveal" style="min-width:220px;min-height:48px;font-size:15px;">
      ${btnText}
    </button>
  `;

  document.body.appendChild(overlay);
  Motion.transitionPresence(overlay, true, { preset: 'curtain', duration: 200 });

  const btn = overlay.querySelector('#tg-curtain-reveal');
  btn?.focus();
  let dismissed = false;
  btn?.addEventListener('click', () => {
    if (dismissed) return;
    dismissed = true;
    SFX.play('garnetClink');
    Motion.transitionPresence(overlay, false, {
      preset: 'curtain',
      duration: 200,
      removeOnExit: true,
      onAfterExit: () => onReveal?.(),
    });
  });
}

export function removePrivacyCurtain(immediate = false) {
  const existing = document.getElementById('tg-privacy-curtain');
  if (!existing) return;
  if (immediate) {
    existing.remove();
  } else {
    Motion.transitionPresence(existing, false, { preset: 'curtain', duration: 160, removeOnExit: true });
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
