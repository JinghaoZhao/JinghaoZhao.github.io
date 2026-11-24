/**
 * Garnet Privacy Curtain (Pass-and-Play Turn Handover Shield)
 * Dramatically shields hidden hands/tiles between local human turns.
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';

export function showPrivacyCurtain(nextSeat, onReveal) {
  removePrivacyCurtain();
  const overlay = document.createElement('div');
  overlay.className = 'tg-curtain';
  overlay.id = 'tg-privacy-curtain';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const name = nextSeat?.name || I18n.t({ zh: '下一位参赛者', en: 'Next Contestant' });
  const badgeText = I18n.t({
    zh: '加内特隐私护盾 · 移交设备',
    en: 'GARNET PRIVACY SHIELD · PASS DEVICE',
  });
  const hint = I18n.t({
    zh: '请确认对手已移开视线，将设备交予该参赛者后再点击揭晓底牌',
    en: 'Ensure your opponent looks away, hand over the device, then tap to reveal private state',
  });
  const btnText = I18n.t({ zh: '我已接过设备 · 揭晓手牌', en: 'I Have the Device · Reveal' });

  overlay.innerHTML = `
    <div class="tg-curtain-gem" aria-hidden="true">
      <svg viewBox="0 0 80 96" width="68" height="82">
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
    <button type="button" class="tg-btn tg-btn-garnet" id="tg-curtain-reveal" style="min-width:240px;min-height:48px;font-size:15px;">
      ${btnText}
    </button>
  `;

  document.body.appendChild(overlay);
  const btn = overlay.querySelector('#tg-curtain-reveal');
  btn?.focus();
  btn?.addEventListener('click', () => {
    SFX.play('garnetClink');
    removePrivacyCurtain();
    onReveal?.();
  });
}

export function removePrivacyCurtain() {
  document.getElementById('tg-privacy-curtain')?.remove();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
