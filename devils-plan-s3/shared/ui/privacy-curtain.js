/**
 * Pass-and-Play Privacy Curtain
 * Shields hidden hand/role information with interruptible Motion enter/exit.
 */

import { I18n } from '../i18n.js';
import { SFX } from '../audio/sound-engine.js';
import { Motion } from './motion.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showPrivacyCurtain(nextSeat, onReveal) {
  const existing = document.getElementById('dp-privacy-curtain');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'dp-curtain';
  overlay.id = 'dp-privacy-curtain';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const name = nextSeat?.name || I18n.t({ zh: '下一位玩家', en: 'Next Player' });
  const badgeText = I18n.t({ zh: '隐私护盾 · 移交设备', en: 'PRIVACY SHIELD · PASS DEVICE' });
  const hint = I18n.t(
    { zh: '请将设备交给 {name}', en: 'Pass device to {name}' },
    { name }
  );
  const btnText = I18n.t({ zh: '继续查看', en: 'Reveal Hand' });

  overlay.innerHTML = `
    <div class="dp-curtain-inner">
      <span class="dp-badge dp-badge-crimson">${badgeText}</span>
      <div class="dp-curtain-name">${escapeHtml(name)}</div>
      <p style="color:var(--dp-ink-muted);max-width:340px;margin:0 0 24px;font-size:14.5px;">${escapeHtml(hint)}</p>
      <button type="button" class="dp-btn dp-btn-primary" id="dp-curtain-reveal" style="min-width:196px;min-height:46px;font-size:15px;">
        ${btnText}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  Motion.enter(overlay, { variant: 'curtain' });

  const btn = overlay.querySelector('#dp-curtain-reveal');
  requestAnimationFrame(() => btn?.focus());
  btn?.addEventListener('click', () => {
    SFX.play('cardFlip');
    Motion.exit(overlay, { variant: 'curtain', remove: true, timeoutMs: 200 }).then(() => {
      onReveal?.();
    });
  });
}

export function removePrivacyCurtain() {
  const existing = document.getElementById('dp-privacy-curtain');
  if (existing) {
    Motion.exit(existing, { variant: 'curtain', remove: true, timeoutMs: 180 });
  }
}
