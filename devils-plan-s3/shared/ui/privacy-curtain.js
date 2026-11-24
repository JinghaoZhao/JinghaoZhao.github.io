/**
 * Pass-and-Play Privacy Curtain
 * Shields hidden hand/role information when passing one device between local human players.
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';

export function showPrivacyCurtain(nextSeat, onReveal) {
  removePrivacyCurtain();
  const overlay = document.createElement('div');
  overlay.className = 'dp-curtain';
  overlay.id = 'dp-privacy-curtain';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const name = nextSeat?.name || I18n.t({ zh: '下一位玩家', en: 'Next Player' });
  const badgeText = I18n.t({ zh: '秘密信息保护 · 移交设备', en: 'HIDDEN INFO SHIELD · PASS DEVICE' });
  const hint = I18n.t({
    zh: '请将设备交给该玩家后再点击揭晓手牌',
    en: 'Hand the device to this player before revealing private state',
  });
  const btnText = I18n.t({ zh: '我已接过设备 · 揭晓', en: 'I Have the Device · Reveal' });

  overlay.innerHTML = `
    <span class="dp-badge dp-badge-crimson">${badgeText}</span>
    <div class="dp-curtain-name">${escapeHtml(name)}</div>
    <p style="color:var(--dp-ink-muted);max-width:360px;margin:0 0 24px;font-size:14px;">${hint}</p>
    <button type="button" class="dp-btn dp-btn-primary" id="dp-curtain-reveal" style="min-width:220px;min-height:48px;font-size:15px;">
      ${btnText}
    </button>
  `;

  document.body.appendChild(overlay);
  const btn = overlay.querySelector('#dp-curtain-reveal');
  btn?.focus();
  btn?.addEventListener('click', () => {
    SFX.play('cardFlip');
    removePrivacyCurtain();
    onReveal?.();
  });
}

export function removePrivacyCurtain() {
  document.getElementById('dp-privacy-curtain')?.remove();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
