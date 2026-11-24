import { mountGame, SFX, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

/**
 * Procedural High-Craft Ancient Exile Temple Mural SVG Renderer (800 x 500)
 * Renders crisp multi-layered archaeological artwork parameterized by variant map `v` (each key 0 or 1).
 */
function renderMuralSvg(muralId, v, markers = [], missBurst = null, uid = 'm') {
  const mk = (id) => Boolean(v && v[id]);

  let artwork = '';
  if (muralId === 'hieroglyph') {
    artwork = renderHieroglyphMural(mk, uid);
  } else if (muralId === 'scales') {
    artwork = renderScalesMural(mk, uid);
  } else {
    artwork = renderAstrolabeMural(mk, uid);
  }

  const markerOverlay = (markers || [])
    .map(
      (m) => `
      <g class="sd-found-beacon" pointer-events="none">
        <circle cx="${m.x}" cy="${m.y}" r="28" fill="rgba(245,158,11,0.16)" stroke="#fde68a" stroke-width="2.6" stroke-dasharray="6 4"/>
        <circle cx="${m.x}" cy="${m.y}" r="22" class="sd-hit-ripple"/>
        <circle cx="${m.x + 22}" cy="${m.y - 22}" r="11" fill="#f59e0b" stroke="#1c1208" stroke-width="2"/>
        <text x="${m.x + 22}" y="${m.y - 21}" text-anchor="middle" dominant-baseline="central" fill="#140c03" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800">${m.num}</text>
      </g>
    `
    )
    .join('');

  const missOverlay = missBurst
    ? `
      <g class="sd-miss-mark" transform="translate(${missBurst.x}, ${missBurst.y})">
        <circle cx="0" cy="0" r="20" fill="rgba(220,53,69,0.22)" stroke="#ff5868" stroke-width="2.5"/>
        <line x1="-9" y1="-9" x2="9" y2="9" stroke="#ff5868" stroke-width="3" stroke-linecap="round"/>
        <line x1="9" y1="-9" x2="-9" y2="9" stroke="#ff5868" stroke-width="3" stroke-linecap="round"/>
      </g>
    `
    : '';

  return `
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Exile Temple Mural">
      <defs>
        <linearGradient id="sand-${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2b2117"/>
          <stop offset="50%" stop-color="#1e1711"/>
          <stop offset="100%" stop-color="#120e0a"/>
        </linearGradient>
        <linearGradient id="gold-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fae19c"/>
          <stop offset="50%" stop-color="#d4af6a"/>
          <stop offset="100%" stop-color="#8b6628"/>
        </linearGradient>
        <radialGradient id="torch-${uid}" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stop-color="rgba(245,158,11,0.22)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sand-${uid})"/>
      <rect width="800" height="500" fill="url(#torch-${uid})"/>
      ${artwork}
      ${markerOverlay}
      ${missOverlay}
    </svg>
  `;
}

function renderHieroglyphMural(mk, uid) {
  // Architectural temple stonework & border
  const friezeTriangles = Array.from({ length: 15 }, (_, i) => {
    const cx = 64 + i * 48;
    const inverted = i === 7 && mk('baseFrieze');
    const pts = inverted
      ? `${cx - 14},454 ${cx + 14},454 ${cx},476`
      : `${cx - 14},476 ${cx + 14},476 ${cx},454`;
    return `<polygon points="${pts}" fill="${inverted ? '#f59e0b' : 'rgba(212,175,106,0.34)'}" stroke="#d4af6a" stroke-width="1.2"/>`;
  }).join('');

  // Left pillar bands (3 vs 2)
  const leftBands = mk('leftPillarBands')
    ? `<rect x="64" y="180" width="64" height="8" fill="url(#gold-${uid})"/><rect x="64" y="268" width="64" height="8" fill="url(#gold-${uid})"/>`
    : `<rect x="64" y="180" width="64" height="8" fill="url(#gold-${uid})"/><rect x="64" y="224" width="64" height="8" fill="url(#gold-${uid})"/><rect x="64" y="268" width="64" height="8" fill="url(#gold-${uid})"/>`;

  // Right pillar rune (Diamond vs Hourglass)
  const rightRune = mk('rightPillarRune')
    ? `<polygon points="692,204 716,204 704,225 716,246 692,246 704,225" fill="none" stroke="#f5d487" stroke-width="2.6"/>`
    : `<polygon points="704,202 720,225 704,248 688,225" fill="none" stroke="#f5d487" stroke-width="2.6"/><circle cx="704" cy="225" r="4" fill="#f5d487"/>`;

  // NW constellation (4 stars vs 5 stars)
  const nwStars = `
    <circle cx="135" cy="46" r="3" fill="#fde68a"/><circle cx="164" cy="70" r="3.5" fill="#fde68a"/>
    <circle cx="194" cy="50" r="3" fill="#fde68a"/><circle cx="182" cy="82" r="2.8" fill="#fde68a"/>
    <path d="M135 46 L164 70 L194 50 L182 82" fill="none" stroke="rgba(253,230,138,0.35)" stroke-width="1"/>
    ${mk('leftStar') ? `<circle cx="155" cy="40" r="4.5" fill="#fffbeb"/><line x1="155" y1="31" x2="155" y2="49" stroke="#fde68a" stroke-width="1.2"/><line x1="146" y1="40" x2="164" y2="40" stroke="#fde68a" stroke-width="1.2"/>` : ''}
  `;

  // NE Crescent Moon (normal vs flipped)
  const moonFlip = mk('rightMoon') ? 'transform="translate(1270,0) scale(-1,1)"' : '';
  const neMoon = `
    <g ${moonFlip}>
      <path d="M642 40 A22 22 0 1 0 642 84 A16 16 0 1 1 642 40 Z" fill="url(#gold-${uid})" stroke="#fae19c" stroke-width="1.2"/>
    </g>
  `;

  // Winged Sun Disk central gem
  const sunFill = mk('sunGem') ? '#38bdf8' : '#f59e0b';
  const sunStroke = mk('sunGem') ? '#bae6fd' : '#fef08a';

  // Cartouche 1 (Ankh vs Scarab Oval)
  const c1 = mk('cartouche1')
    ? `<ellipse cx="232" cy="218" rx="14" ry="20" fill="none" stroke="#f3d692" stroke-width="2.5"/><line x1="214" y1="218" x2="250" y2="218" stroke="#f3d692" stroke-width="2"/><path d="M220 202 Q232 190 244 202" fill="none" stroke="#f3d692" stroke-width="2"/>`
    : `<circle cx="232" cy="201" r="10" fill="none" stroke="#f3d692" stroke-width="2.6"/><line x1="232" y1="211" x2="232" y2="242" stroke="#f3d692" stroke-width="2.6"/><line x1="218" y1="221" x2="246" y2="221" stroke="#f3d692" stroke-width="2.6"/>`;

  // Cartouche 2 (Eye of Horus pupil centered vs shifted crimson)
  const c2PupilX = mk('cartouche2') ? 354 : 344;
  const c2PupilColor = mk('cartouche2') ? '#ef4444' : '#f3d692';
  const c2 = `
    <path d="M318 214 Q344 192 370 214 Q344 234 318 214 Z" fill="none" stroke="#f3d692" stroke-width="2.4"/>
    <circle cx="${c2PupilX}" cy="214" r="7.5" fill="${c2PupilColor}"/>
    <path d="M344 228 L344 242 Q334 246 328 240" fill="none" stroke="#f3d692" stroke-width="2.2"/>
  `;

  // Cartouche 3 (Crown with 2 dots vs 3 dots)
  const c3Dots = mk('cartouche3')
    ? `<circle cx="440" cy="196" r="4" fill="#fde68a"/><circle cx="456" cy="192" r="4" fill="#fde68a"/><circle cx="472" cy="196" r="4" fill="#fde68a"/>`
    : `<circle cx="444" cy="195" r="4" fill="#fde68a"/><circle cx="468" cy="195" r="4" fill="#fde68a"/>`;
  const c3 = `
    ${c3Dots}
    <path d="M438 238 Q444 210 456 218 Q468 226 474 206" fill="none" stroke="#f3d692" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="436" y1="242" x2="476" y2="242" stroke="#d4af6a" stroke-width="2"/>
  `;

  // Cartouche 4 (Pyramid solid gold capstone vs hollow)
  const c4Cap = mk('cartouche4') ? 'none' : '#f59e0b';
  const c4 = `
    <polygon points="568,188 594,240 542,240" fill="none" stroke="#f3d692" stroke-width="2.4"/>
    <polygon points="568,188 578,208 558,208" fill="${c4Cap}" stroke="#fde68a" stroke-width="1.8"/>
    <line x1="550" y1="224" x2="586" y2="224" stroke="rgba(212,175,106,0.5)" stroke-width="1.5"/>
  `;

  // Left brazier (single flame vs split twin flame)
  const leftFlame = mk('leftBrazier')
    ? `<path d="M168 358 Q162 332 172 318 Q177 336 178 358 Z" fill="#f59e0b"/><path d="M188 358 Q194 332 184 318 Q179 336 178 358 Z" fill="#fde68a"/>`
    : `<path d="M165 358 Q178 310 191 358 Z" fill="#f59e0b"/><path d="M172 358 Q178 330 184 358 Z" fill="#fef08a"/>`;

  // Right brazier (amber flame vs emerald mystical flame)
  const rightFlameOuter = mk('rightBrazier') ? '#10b981' : '#f59e0b';
  const rightFlameInner = mk('rightBrazier') ? '#a7f3d0' : '#fef08a';

  // Center altar amphora (intact right handle vs missing)
  const rightHandle = mk('chalice')
    ? ''
    : `<path d="M420 356 Q444 356 440 384 Q436 398 418 398" fill="none" stroke="url(#gold-${uid})" stroke-width="4.5"/>`;

  return `
    <!-- Outer Temple Frame -->
    <rect x="24" y="20" width="752" height="464" rx="8" fill="none" stroke="#8b6628" stroke-width="2.5"/>
    <rect x="34" y="30" width="732" height="444" rx="4" fill="none" stroke="rgba(212,175,106,0.28)" stroke-width="1"/>
    <!-- Left & Right Stone Pillars -->
    <rect x="58" y="106" width="76" height="332" fill="#18120d" stroke="#8b6628" stroke-width="2"/>
    <rect x="50" y="96" width="92" height="16" rx="2" fill="#2c2116" stroke="#d4af6a" stroke-width="1.6"/>
    <rect x="666" y="106" width="76" height="332" fill="#18120d" stroke="#8b6628" stroke-width="2"/>
    <rect x="658" y="96" width="92" height="16" rx="2" fill="#2c2116" stroke="#d4af6a" stroke-width="1.6"/>
    ${leftBands}
    ${rightRune}
    ${nwStars}
    ${neMoon}
    <!-- Winged Sun Disk -->
    <g>
      <path d="M270 76 Q330 56 376 76 Q330 90 270 76 Z" fill="rgba(212,175,106,0.26)" stroke="#d4af6a" stroke-width="1.8"/>
      <path d="M530 76 Q470 56 424 76 Q470 90 530 76 Z" fill="rgba(212,175,106,0.26)" stroke="#d4af6a" stroke-width="1.8"/>
      <path d="M294 84 Q342 74 378 82" fill="none" stroke="#d4af6a" stroke-width="1.2"/>
      <path d="M506 84 Q458 74 422 82" fill="none" stroke="#d4af6a" stroke-width="1.2"/>
      <circle cx="400" cy="76" r="22" fill="#21180f" stroke="#d4af6a" stroke-width="2.4"/>
      <circle cx="400" cy="76" r="13" fill="${sunFill}" stroke="${sunStroke}" stroke-width="2"/>
    </g>
    <!-- Recessed Sanctum Wall & 4 Cartouche Tablets -->
    <rect x="166" y="136" width="468" height="156" rx="8" fill="#120d0a" stroke="rgba(212,175,106,0.38)" stroke-width="1.8"/>
    <rect x="188" y="156" width="88" height="116" rx="28" fill="#1f1710" stroke="#d4af6a" stroke-width="2"/>
    <rect x="300" y="156" width="88" height="116" rx="28" fill="#1f1710" stroke="#d4af6a" stroke-width="2"/>
    <rect x="412" y="156" width="88" height="116" rx="28" fill="#1f1710" stroke="#d4af6a" stroke-width="2"/>
    <rect x="524" y="156" width="88" height="116" rx="28" fill="#1f1710" stroke="#d4af6a" stroke-width="2"/>
    ${c1}${c2}${c3}${c4}
    <!-- Left Brazier -->
    <g>
      ${leftFlame}
      <path d="M150 358 L206 358 L194 382 L162 382 Z" fill="url(#gold-${uid})" stroke="#452b0d" stroke-width="1.5"/>
      <rect x="166" y="382" width="24" height="52" fill="#241a12" stroke="#8b6628" stroke-width="1.5"/>
      <rect x="154" y="426" width="48" height="12" fill="#2c2116" stroke="#d4af6a" stroke-width="1.2"/>
    </g>
    <!-- Right Brazier -->
    <g>
      <path d="M609 358 Q622 310 635 358 Z" fill="${rightFlameOuter}"/>
      <path d="M616 358 Q622 330 628 358 Z" fill="${rightFlameInner}"/>
      <path d="M594 358 L650 358 L638 382 L606 382 Z" fill="url(#gold-${uid})" stroke="#452b0d" stroke-width="1.5"/>
      <rect x="610" y="382" width="24" height="52" fill="#241a12" stroke="#8b6628" stroke-width="1.5"/>
      <rect x="598" y="426" width="48" height="12" fill="#2c2116" stroke="#d4af6a" stroke-width="1.2"/>
    </g>
    <!-- Center Offering Amphora -->
    <g>
      <rect x="348" y="418" width="104" height="20" rx="2" fill="#261c13" stroke="#d4af6a" stroke-width="1.6"/>
      <path d="M380 356 Q356 356 360 384 Q364 398 382 398" fill="none" stroke="url(#gold-${uid})" stroke-width="4.5"/>
      ${rightHandle}
      <path d="M384 338 L416 338 L410 352 Q428 370 416 404 L410 418 L390 418 L384 404 Q372 370 390 352 Z" fill="url(#gold-${uid})" stroke="#3b260c" stroke-width="1.8"/>
      <line x1="382" y1="378" x2="418" y2="378" stroke="#3b260c" stroke-width="2.2"/>
      <circle cx="400" cy="392" r="5" fill="#241a12" stroke="#fde68a" stroke-width="1.2"/>
    </g>
    <!-- Base Carved Frieze -->
    <rect x="44" y="446" width="712" height="36" fill="#17110c" stroke="#8b6628" stroke-width="1.6"/>
    ${friezeTriangles}
  `;
}

function renderScalesMural(mk, uid) {
  const eclipseStroke = mk('eclipseRing') ? '#ef4444' : '#f59e0b';
  const leftLanternFill = mk('leftLantern') ? '#1c1917' : '#fbbf24';
  const rightLanternY = mk('rightLantern') ? 106 : 78;
  const crown = mk('scaleCrown')
    ? `<path d="M406 138 A12 12 0 1 0 406 162 A8 8 0 1 1 406 138 Z" fill="#fde68a"/>`
    : `<polygon points="400,136 413,150 400,164 387,150" fill="url(#gold-${uid})" stroke="#fef08a" stroke-width="1.2"/>`;

  // Left pan pieces (3 vs 4)
  const extraPiece = mk('leftPanPieces')
    ? `<polygon points="274,230 284,238 280,250 268,250 264,238" fill="#fef08a" stroke="#78350f" stroke-width="1.4"/>`
    : '';

  // Right pan numeral (XIII vs VII)
  const weightText = mk('rightPanWeights') ? 'VII' : 'XIII';

  // Left obelisk tip
  const leftTipFill = mk('leftObelisk') ? '#292524' : `url(#gold-${uid})`;

  // Right obelisk mid glyph
  const rightObsGlyph = mk('rightObelisk')
    ? `<circle cx="704" cy="270" r="11" fill="none" stroke="#f5d487" stroke-width="2.4"/>`
    : `<polygon points="704,257 716,280 692,280" fill="none" stroke="#f5d487" stroke-width="2.4"/>`;

  // Candelabra flames (3 vs 2)
  const midCandleFlame = mk('candelabra')
    ? ''
    : `<path d="M192 368 Q196 346 200 368 Z" fill="#fbbf24"/>`;

  // Pedestal gem
  const pedGem = mk('pedestalGem')
    ? `<circle cx="400" cy="356" r="14" fill="#38bdf8" stroke="#bae6fd" stroke-width="2"/>`
    : `<polygon points="400,340 415,356 400,372 385,356" fill="#10b981" stroke="#a7f3d0" stroke-width="2"/>`;

  // Decree tablet red seal
  const tabletSeal = mk('decreeTablet')
    ? `<circle cx="624" cy="414" r="9" fill="#dc2626" stroke="#fca5a5" stroke-width="1.6"/>`
    : '';

  // Floor mosaic tiles
  const floorTiles = Array.from({ length: 9 }, (_, i) => {
    const cx = 120 + i * 70;
    const isCenterHollow = i === 4 && mk('mosaicCenter');
    return `
      <polygon points="${cx},446 ${cx + 22},462 ${cx},478 ${cx - 22},462"
        fill="${isCenterHollow ? 'none' : i === 4 ? '#d4af6a' : 'rgba(212,175,106,0.22)'}"
        stroke="#d4af6a" stroke-width="${isCenterHollow ? 2.6 : 1.4}"/>
      ${isCenterHollow ? `<polygon points="${cx},453 ${cx + 12},462 ${cx},471 ${cx - 12},462" fill="none" stroke="#fde68a" stroke-width="1.4"/>` : ''}
    `;
  }).join('');

  return `
    <!-- Sanctum Arch -->
    <rect x="24" y="20" width="752" height="464" rx="8" fill="none" stroke="#8b6628" stroke-width="2.5"/>
    <path d="M150 436 L150 130 Q400 18 650 130 L650 436" fill="none" stroke="rgba(212,175,106,0.34)" stroke-width="2.5"/>
    <!-- Eclipse Crest -->
    <circle cx="400" cy="68" r="24" fill="none" stroke="${eclipseStroke}" stroke-width="4" opacity="0.88"/>
    <circle cx="400" cy="68" r="18" fill="#0d0a08"/>
    <!-- Hanging Lanterns -->
    <line x1="175" y1="22" x2="175" y2="78" stroke="#a17a36" stroke-width="2.2" stroke-dasharray="5 3"/>
    <polygon points="163,78 187,78 182,106 168,106" fill="${leftLanternFill}" stroke="#d4af6a" stroke-width="2"/>
    <line x1="625" y1="22" x2="625" y2="${rightLanternY}" stroke="#a17a36" stroke-width="2.2" stroke-dasharray="5 3"/>
    <polygon points="613,${rightLanternY} 637,${rightLanternY} 632,${rightLanternY + 28} 618,${rightLanternY + 28}" fill="#fbbf24" stroke="#d4af6a" stroke-width="2"/>
    <!-- Guardian Obelisks -->
    <polygon points="96,174 118,224 124,432 68,432 74,224" fill="#1a140f" stroke="#8b6628" stroke-width="2"/>
    <polygon points="96,174 118,224 74,224" fill="${leftTipFill}" stroke="#d4af6a" stroke-width="1.6"/>
    <line x1="96" y1="242" x2="96" y2="395" stroke="rgba(212,175,106,0.32)" stroke-width="1.5"/>
    <polygon points="704,174 726,224 732,432 676,432 682,224" fill="#1a140f" stroke="#8b6628" stroke-width="2"/>
    <polygon points="704,174 726,224 682,224" fill="url(#gold-${uid})" stroke="#d4af6a" stroke-width="1.6"/>
    ${rightObsGlyph}
    <!-- Grand Brass Balance Scale -->
    <rect x="392" y="168" width="16" height="226" fill="url(#gold-${uid})" stroke="#422a0c" stroke-width="1.6"/>
    <path d="M352 430 L368 394 L432 394 L448 430 Z" fill="#241a12" stroke="#d4af6a" stroke-width="2"/>
    ${pedGem}
    <rect x="260" y="176" width="280" height="10" rx="5" fill="url(#gold-${uid})" stroke="#422a0c" stroke-width="1.5"/>
    ${crown}
    <!-- Left Scale Pan -->
    <line x1="274" y1="186" x2="236" y2="274" stroke="#d4af6a" stroke-width="1.8"/>
    <line x1="274" y1="186" x2="312" y2="274" stroke="#d4af6a" stroke-width="1.8"/>
    <path d="M230 274 Q274 298 318 274 Z" fill="url(#gold-${uid})" stroke="#422a0c" stroke-width="1.6"/>
    <polygon points="258,254 268,262 264,274 252,274 248,262" fill="#f59e0b" stroke="#451a03" stroke-width="1.4"/>
    <polygon points="274,254 284,262 280,274 268,274 264,262" fill="#fde68a" stroke="#451a03" stroke-width="1.4"/>
    <polygon points="290,254 300,262 296,274 284,274 280,262" fill="#f59e0b" stroke="#451a03" stroke-width="1.4"/>
    ${extraPiece}
    <!-- Right Scale Pan -->
    <line x1="526" y1="186" x2="488" y2="274" stroke="#d4af6a" stroke-width="1.8"/>
    <line x1="526" y1="186" x2="564" y2="274" stroke="#d4af6a" stroke-width="1.8"/>
    <path d="M482 274 Q526 298 570 274 Z" fill="url(#gold-${uid})" stroke="#422a0c" stroke-width="1.6"/>
    <rect x="498" y="238" width="56" height="36" rx="4" fill="#181b24" stroke="#d4af6a" stroke-width="2"/>
    <text x="526" y="261" text-anchor="middle" fill="#fde68a" font-family="Cinzel, serif" font-size="16" font-weight="700">${weightText}</text>
    <!-- Left Candelabra -->
    <g>
      <path d="M168 430 L224 430 M196 430 L196 382 M174 398 Q196 410 218 398 M174 398 L174 378 M218 398 L218 378" fill="none" stroke="#d4af6a" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M170 374 Q174 352 178 374 Z" fill="#fbbf24"/>
      ${midCandleFlame}
      <path d="M214 374 Q218 352 222 374 Z" fill="#fbbf24"/>
    </g>
    <!-- Right Decree Tablet -->
    <g>
      <path d="M572 430 L572 368 Q604 350 636 368 L636 430 Z" fill="#211913" stroke="#d4af6a" stroke-width="2"/>
      <line x1="584" y1="382" x2="624" y2="382" stroke="rgba(212,175,106,0.65)" stroke-width="2"/>
      <line x1="584" y1="394" x2="620" y2="394" stroke="rgba(212,175,106,0.65)" stroke-width="2"/>
      <line x1="584" y1="406" x2="612" y2="406" stroke="rgba(212,175,106,0.65)" stroke-width="2"/>
      ${tabletSeal}
    </g>
    <!-- Mosaic Floor -->
    <line x1="40" y1="436" x2="760" y2="436" stroke="#8b6628" stroke-width="2"/>
    ${floorTiles}
  `;
}

function renderAstrolabeMural(mk, uid) {
  // Top-left compass (4-point vs 8-point)
  const extraStar = mk('topCompass')
    ? `<polygon points="118,62 124,82 144,88 124,94 118,114 112,94 92,88 112,82" fill="rgba(245,158,11,0.5)" stroke="#fde68a" stroke-width="1.2" transform="rotate(45 118 88)"/>`
    : '';

  // Top-right moon phase
  const neOrb = mk('topRightCompass')
    ? `<path d="M688 68 A20 20 0 1 0 688 108 A14 14 0 1 1 688 68 Z" fill="#fde68a"/>`
    : `<circle cx="682" cy="88" r="19" fill="url(#gold-${uid})" stroke="#fef08a" stroke-width="1.5"/>`;

  const northGem = mk('topArcGem') ? '#f59e0b' : '#38bdf8';
  const westGlyph = mk('outerWestGlyph') ? '✦' : '☥';
  const eastGlyph = mk('outerEastGlyph') ? '▲' : '⬡';

  // NW Saturn ring
  const nwRing = mk('orbitPlanetNW')
    ? ''
    : `<ellipse cx="306" cy="158" rx="24" ry="7" fill="none" stroke="#fde68a" stroke-width="2" transform="rotate(-24 306 158)"/>`;

  const seColor = mk('orbitPlanetSE') ? '#10b981' : '#ef4444';
  const ptrAngle = mk('pointerHand') ? 32 : -36;

  const rayAngles = mk('centerCore') ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315];
  const coreRays = rayAngles
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 400 + Math.cos(rad) * 18;
      const y1 = 250 + Math.sin(rad) * 18;
      const x2 = 400 + Math.cos(rad) * 32;
      const y2 = 250 + Math.sin(rad) * 32;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fde68a" stroke-width="2.4" stroke-linecap="round"/>`;
    })
    .join('');

  const leftTorchColor = mk('leftSconce') ? '#38bdf8' : '#f59e0b';
  const leftTorchCore = mk('leftSconce') ? '#e0f2fe' : '#fef08a';
  const rightExtraBand = mk('rightSconce')
    ? `<rect x="686" y="344" width="28" height="6" rx="2" fill="#fde68a"/>`
    : '';
  const dialNumeral = mk('baseDial') ? 'IX' : 'XII';

  return `
    <rect x="24" y="20" width="752" height="464" rx="8" fill="none" stroke="#8b6628" stroke-width="2.5"/>
    <!-- Subtle Starfield -->
    <circle cx="230" cy="60" r="2" fill="#fde68a" opacity="0.6"/>
    <circle cx="565" cy="54" r="2.2" fill="#fde68a" opacity="0.6"/>
    <circle cx="205" cy="405" r="2" fill="#fde68a" opacity="0.5"/>
    <circle cx="600" cy="412" r="2" fill="#fde68a" opacity="0.5"/>
    <!-- Top Corner Medallions -->
    <circle cx="118" cy="88" r="34" fill="#18120d" stroke="#8b6628" stroke-width="2"/>
    ${extraStar}
    <polygon points="118,62 124,82 144,88 124,94 118,114 112,94 92,88 112,82" fill="url(#gold-${uid})"/>
    <circle cx="682" cy="88" r="34" fill="#18120d" stroke="#8b6628" stroke-width="2"/>
    ${neOrb}
    <!-- Concentric Brass Astrolabe -->
    <circle cx="400" cy="250" r="184" fill="#14100c" stroke="url(#gold-${uid})" stroke-width="6"/>
    <circle cx="400" cy="250" r="160" fill="none" stroke="rgba(212,175,106,0.45)" stroke-width="1.6" stroke-dasharray="8 6"/>
    <circle cx="400" cy="250" r="126" fill="none" stroke="#d4af6a" stroke-width="2.4"/>
    <circle cx="400" cy="250" r="76" fill="none" stroke="rgba(212,175,106,0.5)" stroke-width="1.6"/>
    <line x1="216" y1="250" x2="584" y2="250" stroke="rgba(212,175,106,0.28)" stroke-width="1.4"/>
    <line x1="400" y1="66" x2="400" y2="434" stroke="rgba(212,175,106,0.28)" stroke-width="1.4"/>
    <!-- North Meridian Gem -->
    <circle cx="400" cy="74" r="12" fill="${northGem}" stroke="#fef9c3" stroke-width="2"/>
    <!-- West & East Ring Glyphs -->
    <circle cx="224" cy="250" r="16" fill="#1d150e" stroke="#d4af6a" stroke-width="1.8"/>
    <text x="224" y="251" text-anchor="middle" dominant-baseline="central" fill="#fde68a" font-size="16" font-weight="700">${westGlyph}</text>
    <circle cx="576" cy="250" r="16" fill="#1d150e" stroke="#d4af6a" stroke-width="1.8"/>
    <text x="576" y="251" text-anchor="middle" dominant-baseline="central" fill="#fde68a" font-size="16" font-weight="700">${eastGlyph}</text>
    <!-- Orbiting Planets -->
    <circle cx="306" cy="158" r="13" fill="#d97706" stroke="#fde68a" stroke-width="1.8"/>
    ${nwRing}
    <circle cx="494" cy="342" r="13" fill="${seColor}" stroke="#fef08a" stroke-width="1.8"/>
    <!-- Pointer Arrow -->
    <g transform="rotate(${ptrAngle} 400 250)">
      <line x1="340" y1="250" x2="508" y2="250" stroke="url(#gold-${uid})" stroke-width="4.5" stroke-linecap="round"/>
      <polygon points="518,250 496,239 501,250 496,261" fill="#fde68a"/>
    </g>
    <!-- Central Sun Core -->
    ${coreRays}
    <circle cx="400" cy="250" r="16" fill="url(#gold-${uid})" stroke="#422a0c" stroke-width="2"/>
    <circle cx="400" cy="250" r="6" fill="#1a120b"/>
    <!-- Left & Right Wall Sconces -->
    <g>
      <path d="M84 300 Q100 248 116 300 Z" fill="${leftTorchColor}"/>
      <path d="M92 300 Q100 272 108 300 Z" fill="${leftTorchCore}"/>
      <path d="M78 300 L122 300 L114 322 L86 322 Z" fill="url(#gold-${uid})"/>
      <rect x="92" y="322" width="16" height="58" fill="#2a1f14" stroke="#8b6628" stroke-width="1.5"/>
      <rect x="86" y="328" width="28" height="6" rx="2" fill="#d4af6a"/>
    </g>
    <g>
      <path d="M684 300 Q700 248 716 300 Z" fill="#f59e0b"/>
      <path d="M692 300 Q700 272 708 300 Z" fill="#fef08a"/>
      <path d="M678 300 L722 300 L714 322 L686 322 Z" fill="url(#gold-${uid})"/>
      <rect x="692" y="322" width="16" height="58" fill="#2a1f14" stroke="#8b6628" stroke-width="1.5"/>
      <rect x="686" y="328" width="28" height="6" rx="2" fill="#d4af6a"/>
      ${rightExtraBand}
      <rect x="686" y="360" width="28" height="6" rx="2" fill="#d4af6a"/>
    </g>
    <!-- Bottom Sundial Pedestal -->
    <path d="M332 472 L352 426 L448 426 L468 472 Z" fill="#221912" stroke="#d4af6a" stroke-width="2"/>
    <text x="400" y="454" text-anchor="middle" fill="#fde68a" font-family="Cinzel, serif" font-size="20" font-weight="700">${dialNumeral}</text>
  `;
}

let lockoutInterval = null;
let lastMissTs = 0;
let activeMissBurst = null;
let lastHitTs = 0;
let lastPhaseSeen = null;

mountGame({
  config: {
    id: 'spot-the-difference',
    title: { zh: '找不同', en: 'Spot the Difference', ko: '달라진 그림 찾기' },
    category: 'EXILE',
    episode: 'EP 6',
    minPlayers: 1,
    maxPlayers: 4,
    defaultPlayers: 4,
    hasHiddenInfo: false,
    optionsSchema: [
      {
        key: 'mural',
        label: { zh: '神殿壁画', en: 'Temple Mural' },
        type: 'select',
        default: 'random',
        choices: [
          { value: 'random', label: { zh: '随机壁画', en: 'Random Mural' } },
          { value: 'hieroglyph', label: { zh: '神殿象形圣壁', en: 'Sacred Hieroglyph Wall' } },
          { value: 'scales', label: { zh: '魔鬼天平圣殿', en: 'Devil\'s Scales Sanctum' } },
          { value: 'astrolabe', label: { zh: '星象浑仪密室', en: 'Astrolabe Chamber' } },
        ],
      },
      {
        key: 'sideBySide',
        label: { zh: '休闲对照模式（并排显示原图）', en: 'Casual Side-by-Side Mode' },
        type: 'boolean',
        default: false,
      },
      {
        key: 'fastMode',
        label: { zh: '快节奏记忆（15秒）', en: 'Fast Memorize (15s)' },
        type: 'boolean',
        default: false,
      },
    ],
    rulesSummary: {
      zh: `### 流放地赛 02 · 找不同
- **第一阶段 · 记忆原始壁画**：在火盆倒计时内全力记住神殿原始壁画的全部符号、火焰、色彩与细节。
- **第二阶段 · 暗屏找茬竞速**：原图隐藏！在被篡改的壁画中精准点击找出全部 **5 处细微差异**。
- **误点惩罚**：点击未改动区域将触发猩红警报并**冻结操作 5 秒**！
- **流放存活**：所有选手挑战完全相同的 5 处异变；前 \`N-1\` 名存活，最末位永久淘汰。`,
      en: `### Exile Match 2 · Spot the Difference
- **Phase 1 · Memorize Original**: Study every hieroglyph, flame, jewel, and relic on the torchlit temple mural before the timer expires.
- **Phase 2 · Alteration Hunt**: The original vanishes! Click all **5 subtle alterations** on the tampered mural as fast as possible.
- **Wrong-Tap Penalty**: Tapping an unchanged area triggers a crimson alarm and **freezes your board for 5 seconds**.
- **Survival Rule**: Everyone hunts the exact same 5 alterations; top \`N-1\` survive, last place is eliminated.`,
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  render(container, ctx) {
    const { state, mySeatId, lang, dispatch, sfx, ui, lastEvent } = ctx;
    const isZh = lang === 'zh';
    const me = state.myState;
    const ended = state.phase === 'ended';

    // Sound effects on phase switch / hits / misses
    if (lastPhaseSeen && lastPhaseSeen !== state.phase) {
      if (state.phase === 'hunt') sfx.play('reveal');
    }
    lastPhaseSeen = state.phase;

    if (lastEvent?.type === 'SPOT_HIT' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastHitTs) {
      lastHitTs = lastEvent.ts;
      sfx.play('pieceGain');
      ui.toast(
        isZh ? `✓ 发现差异 #${lastEvent.num}：${lastEvent.desc.zh}` : `✓ Found #${lastEvent.num}: ${lastEvent.desc.en}`,
        'success'
      );
    }
    if (lastEvent?.type === 'SPOT_MISS' && lastEvent.seatId === mySeatId && lastEvent.ts !== lastMissTs) {
      lastMissTs = lastEvent.ts;
      activeMissBurst = { x: lastEvent.x, y: lastEvent.y };
      sfx.play('error');
      setTimeout(() => {
        activeMissBurst = null;
      }, 950);
    }

    const now = Date.now();
    const lockoutRemMs = me ? Math.max(0, (me.lockoutUntilMs || 0) - now) : 0;
    const isLocked = lockoutRemMs > 0 && state.phase === 'hunt' && !me?.finished;

    clearInterval(lockoutInterval);
    if (isLocked) {
      lockoutInterval = setInterval(() => {
        const el = container.querySelector('#sd-lock-sec');
        const rem = Math.max(0, (me.lockoutUntilMs || 0) - Date.now());
        if (rem <= 0) {
          clearInterval(lockoutInterval);
          container.querySelector('.sd-lockout-mask')?.remove();
        } else if (el) {
          el.textContent = `${(rem / 1000).toFixed(1)}s`;
        }
      }, 120);
    }

    const totalRacers = state.racers.length;
    const racersHtml = state.racers
      .map((r) => {
        const isMe = r.seatId === mySeatId;
        const cls = [
          'sd-racer-card',
          isMe ? 'is-me' : '',
          r.status === 'survived' ? 'is-survived' : '',
          r.status === 'eliminated' ? 'is-eliminated' : '',
        ].join(' ');
        const stat = r.finished && r.finishTimeMs != null
          ? `#${r.rank || '✓'} ${(r.finishTimeMs / 1000).toFixed(1)}s`
          : `${r.foundCount}/5`;
        return `
          <div class="${cls}">
            <div class="sd-racer-top">
              <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(r.avatar)} ${UI.escapeHtml(r.name)}${isMe ? (isZh ? ' (你)' : ' (You)') : ''}</span>
              <span class="sd-racer-stat">${UI.escapeHtml(stat)}</span>
            </div>
            <div class="sd-bar-track"><div class="sd-bar-fill" style="width:${r.progress}%"></div></div>
          </div>
        `;
      })
      .join('');

    const foundCount = me ? me.foundCount : 0;
    const pipsHtml = [1, 2, 3, 4, 5]
      .map((n) => `<span class="sd-pip ${n <= foundCount ? 'is-found' : ''}">${n <= foundCount ? '✓' : n}</span>`)
      .join('');

    const showSideBySide =
      (state.phase === 'hunt' && state.sideBySide) ||
      ended ||
      Boolean(me && me.finished);

    const revealMarkers = state.revealedDiffs
      ? state.revealedDiffs.map((d, idx) => ({ id: d.id, x: d.x, y: d.y, num: idx + 1, desc: d.desc }))
      : me?.foundMarkers || [];

    const muralTitle = isZh ? state.muralName.zh : state.muralName.en;

    let stageContent = '';
    if (state.phase === 'memorize') {
      stageContent = `
        <div class="sd-stage-grid">
          <div class="sd-mural-frame">
            <div class="sd-mural-caption">
              <span>☥ ${UI.escapeHtml(muralTitle)} · ${isZh ? '原始壁画（记忆中）' : 'ORIGINAL MURAL (MEMORIZE)'}</span>
              ${totalRacers === 1 ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-primary" id="sd-skip-mem">${isZh ? '记好了，立即开找 →' : 'Ready — Start Hunt →'}</button>` : ''}
            </div>
            <div class="sd-svg-box">
              ${renderMuralSvg(state.muralId, state.originalVariants, [], null, 'orig')}
              <div class="sd-memorize-vignette"></div>
            </div>
          </div>
        </div>
      `;
    } else if (showSideBySide) {
      stageContent = `
        <div class="sd-stage-grid is-side-by-side">
          <div class="sd-mural-frame">
            <div class="sd-mural-caption">
              <span>${isZh ? '原始壁画' : 'ORIGINAL MURAL'}</span>
              <span>${UI.escapeHtml(muralTitle)}</span>
            </div>
            <div class="sd-svg-box">
              ${renderMuralSvg(state.muralId, state.originalVariants, ended || me?.finished ? revealMarkers : [], null, 'orig2')}
            </div>
          </div>
          <div class="sd-mural-frame">
            <div class="sd-mural-caption">
              <span>${isZh ? '改版壁画（点击找 5 处不同）' : 'ALTERED MURAL (CLICK 5 DIFFERENCES)'}</span>
              <span>${foundCount}/5</span>
            </div>
            <div class="sd-svg-box ${!ended && !me?.finished && !isLocked ? 'is-interactive' : ''}" id="sd-hunt-canvas">
              ${renderMuralSvg(state.muralId, state.alteredVariants, revealMarkers, activeMissBurst, 'alt2')}
              ${isLocked ? `
                <div class="sd-lockout-mask">
                  <strong>${isZh ? '误点惩罚 · 视野冻结' : 'WRONG TAP · FROZEN'}</strong>
                  <div class="sd-lockout-sec" id="sd-lock-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      // Hardcore single altered mural hunt!
      stageContent = `
        <div class="sd-stage-grid">
          <div class="sd-mural-frame">
            <div class="sd-mural-caption">
              <span>🔥 ${UI.escapeHtml(muralTitle)} · ${isZh ? '改版壁画（原图已隐藏！）' : 'ALTERED MURAL (ORIGINAL HIDDEN!)'}</span>
              ${totalRacers === 1 && !me?.finished ? `<button type="button" class="dp-btn dp-btn-sm dp-btn-ghost" id="sd-give-up">${isZh ? '放弃并揭晓' : 'Reveal Diffs'}</button>` : ''}
            </div>
            <div class="sd-svg-box ${!ended && !me?.finished && !isLocked ? 'is-interactive' : ''}" id="sd-hunt-canvas">
              ${renderMuralSvg(state.muralId, state.alteredVariants, revealMarkers, activeMissBurst, 'alt')}
              ${isLocked ? `
                <div class="sd-lockout-mask">
                  <strong>${isZh ? '误点惩罚 · 视野冻结' : 'WRONG TAP · FROZEN'}</strong>
                  <div class="sd-lockout-sec" id="sd-lock-sec">${(lockoutRemMs / 1000).toFixed(1)}s</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    const diffRevealHtml = state.revealedDiffs
      ? `
        <section class="sd-temple-banner">
          <div class="sd-race-title" style="margin-bottom:8px;">✦ ${isZh ? '全部 5 处壁画篡改揭晓' : 'ALL 5 TEMPLE ALTERATIONS REVEALED'}</div>
          <div class="sd-diff-list">
            ${state.revealedDiffs
              .map(
                (d, idx) => `
                <div class="sd-diff-chip">
                  <span class="sd-diff-num">${idx + 1}</span>
                  <span>${UI.escapeHtml(isZh ? d.desc.zh : d.desc.en)}</span>
                </div>
              `
              )
              .join('')}
          </div>
        </section>
      `
      : '';

    const phaseHeadline = state.phase === 'memorize'
      ? (isZh ? '阶段一：火光记忆原始壁画' : 'PHASE 1: MEMORIZE THE ORIGINAL MURAL')
      : state.phase === 'hunt'
      ? (isZh ? '阶段二：竞速找出 5 处异变' : 'PHASE 2: HUNT ALL 5 ALTERATIONS')
      : (isZh ? '终局对照：5 处异变全部揭晓' : 'POST-ROUND SIDE-BY-SIDE REVEAL');

    const phaseSub = state.phase === 'memorize'
      ? (isZh ? '仔细记住符号、火焰颜色、星象与器皿细节，倒计时结束后原图将彻底消失！' : 'Study every glyph, flame, jewel, and relic before the original vanishes!')
      : state.phase === 'hunt'
      ? (isZh ? '点击图中被篡改的 5 处位置；误点将冻结 5 秒。' : 'Click the 5 altered locations; wrong taps freeze your board for 5s.')
      : (isZh ? '上方可左右对比原图与改版壁画。' : 'Compare original and altered murals side-by-side above.');

    container.innerHTML = `
      <div class="sd-root">
        <section class="sd-temple-banner">
          <div class="sd-race-header">
            <div class="sd-race-title">
              <span class="sd-torch-dot"></span>
              <span>${isZh ? '流放地圣殿 · 找不同竞速' : 'EXILE TEMPLE · SPOT THE DIFFERENCE'}</span>
            </div>
            <div style="font-size:12px;color:var(--dp-ink-muted);">
              ${totalRacers === 1
                ? (isZh ? '单人挑战 · 找出 5 处异变' : 'Solo Challenge · Find all 5')
                : (isZh ? `前 ${totalRacers - 1} 名存活 · 末位永久淘汰` : `Top ${totalRacers - 1} Survive · Last Eliminated`)}
            </div>
          </div>
          <div class="sd-race-grid">${racersHtml}</div>
        </section>

        <div class="sd-phase-bar ${state.phase === 'memorize' ? 'is-memorize' : state.phase === 'hunt' ? 'is-hunt' : ''}">
          <div class="sd-phase-left">
            <span class="sd-phase-headline">${UI.escapeHtml(phaseHeadline)}</span>
            <span class="sd-phase-sub">${UI.escapeHtml(phaseSub)}</span>
          </div>
          <div class="sd-pip-row">${pipsHtml}</div>
        </div>

        ${me?.finished && !ended ? `
          <div class="sd-solved-banner">
            <strong>✦ ${isZh ? `5/5 全部识破！用时 ${(me.finishTimeMs / 1000).toFixed(1)} 秒` : `All 5 Found in ${(me.finishTimeMs / 1000).toFixed(1)}s!`}</strong>
            <span>${isZh ? '你已成功存活！下方已开启原图对照，等待其余流放者完赛...' : 'You survived! Side-by-side reveal unlocked while others finish...'}</span>
          </div>
        ` : ''}

        ${stageContent}
        ${diffRevealHtml}
      </div>
    `;

    container.querySelector('#sd-skip-mem')?.addEventListener('click', () => {
      sfx.play('reveal');
      dispatch({ type: 'SKIP_MEMORIZE', payload: {} });
    });

    container.querySelector('#sd-give-up')?.addEventListener('click', async () => {
      const ok = await ui.confirm(
        isZh ? '放弃并揭晓答案？' : 'Reveal All 5 Differences?',
        isZh ? '将结束当前挑战并并排展示原图与所有 5 处异变。' : 'Ends the challenge and opens the side-by-side diff reveal.'
      );
      if (ok) dispatch({ type: 'GIVE_UP', payload: {} });
    });

    const huntEl = container.querySelector('#sd-hunt-canvas');
    if (huntEl && state.phase === 'hunt' && me && !me.finished && !ended) {
      huntEl.addEventListener('click', (e) => {
        if (Date.now() < (me.lockoutUntilMs || 0)) return;
        const rect = huntEl.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 800;
        const y = ((e.clientY - rect.top) / rect.height) * 500;
        dispatch({ type: 'TAP_SPOT', payload: { x: Math.round(x), y: Math.round(y) } });
      });
    }
  },
});
