# The Genius: Death Match Arena — Motion, Interaction, Theme & Microcopy Specification

> **Document Owner:** `gemini-advisor` (Lead Motion, Interaction & Copy Consultant)  
> **Scope:** Entire Platform — `shared/**`, `index.html`, `hub.css`, `hub.js`, and all 20 `games/*/{index.html,game.css,game.js}`  
> **Design Bar:** Apple-grade subtlety, tactile directness, spatial continuity, broadcast-sharp clarity, zero layout shift (CLS = 0), and locked 60fps across Dark (Obsidian Noir) & Light (Alabaster Broadcast Studio) themes.  
> **Audit Methodology:** Strictly organized **by State Change (按「状态变化」审查)** — never a static widget inventory.

---

## 0. Core Philosophy & Non-Negotiable Engineering Laws

1. **Motion Explains State, Never Decorates It**: Every animation must answer one of three questions: *Where did this come from? What just changed? Did my action register?* If an animation does not clarify a state transition, cut it.
2. **One Shared Rhythm Across All 20 Games**: Every modal, card flip, tile press, numeric counter, and error nudge uses the exact same `--tg-ease-*` curves and `--tg-dur-*` durations from `shared/theme.css` and `shared/ui/motion.js`.
3. **Never Nuke Live DOM With Full `container.innerHTML = ...` on Incremental Updates**:
   - **Codebase-Wide Root Cause Found:** All **20/20** `games/*/game.js` files currently overwrite `container.innerHTML` on every `render()` call, and `shared/ui/shell.js` + `hub.js` overwrite `overlayRoot`, `drawerRoot`, `vsStripEl`, `#season-filter-row`, `#mechanics-filter-row`, and `#arena-grid`.
   - **Consequence:** Every CSS 3D card flip (`indian-poker`, `double-sided-poker`, `same-picture-hunt`, `same-number-hunt`), every piece move (`twelve-janggi`, `tactical-yutnori`, `laser-chess`, `memory-maze`), every numeric rollup, and every active hover/focus ring is **aborted at frame 0** because the DOM node is destroyed and recreated.
   - **Mandatory Pattern (Skeleton + Patch / FLIP):** Mount the static arena skeleton once per game/phase (tracked via `container.dataset.mountedPhase`), then patch classes, `textContent`, `style.transform`, and keyed child nodes in place — or run `Motion.flipList()` around keyed reorders.
4. **GPU-Compositor-Only Budget (`transform`, `opacity`, `clip-path`)**:
   - **Zero** `transition: all` (currently in 7 files).
   - **Zero** animated `width` / `height` / `top` / `left` / `grid-template-columns` (currently in 4 games + shell sidebar).
   - **Zero** `@keyframes` animating `box-shadow` (currently in 10 files) — move glows to a `::after` pseudo-element and animate `opacity` / `transform` only.
5. **100% Interruptible & 1:1 Direct Manipulation**: Every transition/animation must be cancellable mid-flight without orphaned callbacks or stuck classes. During pointer drag or tilt, disable competing CSS `transition` on `transform` so tracking is crisp 1:1.

---

## 1. State-Transition Audit Matrix (Actual Codebase Findings)

### 1.1 出现 / 消失 (Enter / Exit)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `shared/theme.css:67` `[hidden]`, `shell.js:737,743,765,846,854,862` | HUD `#tg-hud-timer`, `#tg-hud-telemetry`, `#tg-hud-stakes`, `#tg-room-chip`, `#tg-vs-strip` toggle visibility | Hard `[hidden] { display: none !important }` causes 0-frame pop and horizontal HUD reflow jitter. | Replace raw `.hidden` toggle with `Motion.transitionPresence(el, show)` (`opacity` + subtle `scale(0.96)` / `translateY(-4px)` over `--tg-dur-fast`); reserve slot space or animate `#tg-vs-strip` via `grid-template-rows` / `clip-path` + `opacity` without layout snap. |
| `shared/ui/shell.js:113-137` (`UI.confirm`), `:569-646` (`openRenameModal`), `:1051-1488` (`renderLobbyOverlay`), `:1490-1607` (`renderResultOverlay`) | Confirm dialog, Rename modal, Lobby modal, Verdict curtain open & close | Inserted via `innerHTML`/`appendChild` with zero enter motion; closed via `.remove()` or `overlayRoot.innerHTML = ''` with zero exit dissolve. Furthermore, `renderAll()` wipes `overlayRoot.innerHTML` on every state tick even while modal is already open! | Route all modals through `Motion.transitionPresence` (backdrop: `opacity 0→1`, modal: `opacity 0→1`, `scale(0.96) translateY(8px) → none`, `--tg-dur-sheet` enter / `--tg-dur-fast` exit). In `renderLobbyOverlay()`, preserve modal root and patch inner tab body so switching tabs/difficulty doesn't replay modal entrance. |
| `shared/ui/shell.js:939-973` (`renderDrawer`) & `theme.css:1148-1166` | Rules Drawer `.tg-drawer` open & close | `if (!rulesOpen) drawerRoot.innerHTML = ''` pops the drawer in and out with zero slide or backdrop fade. | Keep backdrop + `.tg-drawer` mounted during exit; slide `.tg-drawer` from `translateX(100%)` → `translateX(0)` (`--tg-dur-sheet`, `--tg-ease-out`) and reverse on close (`--tg-dur-base`, `--tg-ease-in`); support `Escape` key and mid-open interruptible close. |
| `shared/ui/privacy-curtain.js:9-63` | Pass-and-Play Privacy Curtain `.tg-curtain` reveal & dismiss | Instant `appendChild` and instant `.remove()` with no smooth dissolve; abrupt flash between turns. | Enter: fast opacity veil (`180ms`) + inner gem/title subtle rise (`translateY(10px)→0`). Dismiss: `200ms` fade + `scale(1.02)` dissolve *before* calling `onReveal()`, ensuring hidden info never flashes prematurely. |
| `shared/ui/shell.js:446-474` (`showClashSplash`) & `theme.css:1229-1330` | Death Match VS Clash Splash enter, auto-exit, early click dismiss | Uses `setTimeout(clear, 1950)` without storing/clearing timer ID; early click hard-nukes `clashRoot.innerHTML = ''`; `tg-vs-pop` overshoots harshly (`scale(2.4) rotate(-14deg)`). | Store timer ID & cancel on early click/lobby return; refine slam to crisp broadcast precision (`translateX(±40px)` + `scale(1.35)→1`, zero cheesy skew); early click triggers smooth `160ms` exit fade. |
| `shared/ui/shell.js:76-87` (`UI.toast`) & `theme.css:1404-1442` | Toast stack enter, stack shift, exit | Exit only sets inline `opacity: 0` without upward lift; no max-stack cap (rapid clicks stack 10+ toasts). | Cap visible stack at 3 (fast-evict oldest), animate enter (`translateY(8px) scale(0.96)→0`) and exit (`translateY(-4px) scale(0.97) opacity:0`, `180ms`), and FLIP-shift remaining toasts smoothly. |
| `hub.js:537-611` (`openPreviewModal`), `:613-726` (`openVaultModal`) | Hub Dossier Preview & Garnet Vault modals | Zero enter/exit animation; lacks `Escape` key close and focus restoration to triggering button. | Use `Motion.transitionPresence` + `Escape` listener + return focus to `document.activeElement` on close. |
| `hub.js:734-743, 822-831` | `#arena-empty`, `#chronicle-empty` empty states | Instant `hidden` toggle pop. | Fade in (`--tg-dur-base`, `translateY(6px)→0`) via `Motion.transitionPresence`. |

### 1.2 移动 / 空间连续性 (Move / Spatial Continuity)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `hub.js:485-518` (`#season-filter-row`, `#mechanics-filter-row`), `index.html:179-190` (`.hub-view-toggle`) | Switching Season, Mechanics, or Grid↔Chronicle segmented tabs | `renderFilters()` wipes `innerHTML` on every click, destroying focus and snapping the active pill highlight instead of sliding it. | Build pills once (update labels on `I18n.onChange`), add a persistent `.tg-seg-indicator` background capsule, and glide it smoothly via `Motion.slideIndicator(container, activeBtn)` (`transform: translate3d(x,y,0) scaleX(...)`). |
| `hub.js:917-924` (`#arena-grid-view` ↔ `#chronicle-view`) | Arena Grid ↔ 44-Ep Chronicle view toggle | Instant `hidden` swap with zero directional continuity. | Directional crossfade (`Motion.crossfade`): outgoing view fades/shifts `±10px` (`150ms`), incoming view enters (`220ms`, `--tg-ease-out`), preserving scroll anchor at `#arena-section`. |
| `hub.js:728-814` (`renderArenaGrid`) | Filtering/searching game cards | Wipes `#arena-grid.innerHTML` and recreates all `.game-card` nodes; surviving cards teleport instead of rearranging. | Key cards by `data-slug`, retain existing DOM nodes, and wrap add/remove/reorder in `Motion.flipList(gridEl, '.game-card')` (surviving cards glide smoothly; entering cards fade+scale `0.97→1`). |
| `games/quattro/game.js:465-526` | Dragging/trading cards to 6 VP pods & selecting hidden cards | Uses HTML5 `draggable` (laggy ghost image, broken on touch, fighting CSS `transition: transform 0.2s`), and clicking a card re-runs `renderGame()` wiping `container.innerHTML`. | Switch to Pointer Events direct 1:1 card drag with magnetic `.qt-vp-pod.is-drag-over` highlight and spring snap-back; on completed trade, animate card arc/crossfade into VP deposit chip without nuking other cards. |
| `games/betting-black-and-white/game.js:239-267` | Swapping two tiles in `.bbw-setup-grid` & partition drop | Clicking 2 tiles nukes `container.innerHTML`; tiles teleport between slots `#1–#10`. | Run `Motion.flipList(setupGrid, '.bbw-setup-tile')` when swapping slots so the two tiles visibly glide past each other (`220ms`, `--tg-ease-spring`). |
| `games/indian-poker/game.js`, `double-sided-poker/game.js`, `indian-holdem/game.js` | 3D card deal & showdown flip (`.tg-card-3d.is-flipped`) | Full `container.innerHTML` rebuild destroys `.tg-card-3d` on showdown, so CSS `rotateY(180deg→0deg)` **never animates**! | Preserve card DOM nodes across hand phases; toggle `.is-flipped` class in place so the 3D flip plays cleanly (`420ms`, `--tg-ease-out`) with specular sheen pass. |
| `games/twelve-janggi/game.js`, `tactical-yutnori/game.js`, `laser-chess/game.js`, `memory-maze/game.js`, `blackout-game/game.js` | Piece movement, drop, rotation, operative crossing | Every move/step/rotation wipes `container.innerHTML`; pieces teleport across squares/nodes/SVG. | Key pieces by stable ID (`data-piece-id` / `data-op-id`): use `Motion.flipList` on HTML boards (`twelve-janggi`, `memory-maze`, `blackout-game`) and smooth CSS/rAF `transform` interpolation on SVG pieces (`laser-chess` 90° rotate + 1-cell glide; `tactical-yutnori` step-by-step node hop along path). |
| `games/same-picture-hunt/game.js:120-212` | 4×4 panel flip & 20-slot conveyor belt advance/retreat | Full `innerHTML` rebuild kills `.sph-tile-slot.is-flipped` 3D flip and teleports runner + upcoming 5-card queue. | Keep 16 tiles & conveyor track mounted; toggle `.is-flipped` on tile click; glide runner marker via `transform: translateX(...)` and shift upcoming 5-card belt queue smoothly (`Motion.flipList`). |
| `games/monorail/game.js:70-246` | Placing/rotating rail tiles & expanding SVG `viewBox` | Rebuilds entire `<svg>` on every staged click or rotation; `viewBox` jumps abruptly; `<animateMotion>` ignores `prefers-reduced-motion`. | Patch staged tile `<g>` transforms in place with crisp `180ms` spring settle & 90° rotation transition; smoothly interpolate `viewBox` bounds over `240ms`; gate `<animateMotion>` on `!Motion.reduced()`. |

### 1.3 变大小 / 形变 (Resize / Scale / Reflow)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `shared/theme.css:156-168, 418-493` (`.tg-btn`, `.tg-tile`, `.tg-chip`) | Tactile press (`:active`) & hover lift | `:active` only resets `translateY(0)` — feels flat/web-generic instead of physically responsive. | Add crisp press compression (`transform: scale(0.97)` on buttons, `scale(0.955)` on tiles/chips, `80ms` `--tg-ease-snappy`) and spring release (`--tg-dur-fast`, `--tg-ease-spring`). |
| `shared/theme.css:869-904` (`.tg-workspace` / `.tg-sidebar`) | Desktop sidebar expand / collapse | Switches `grid-template-columns: 1fr 300px` → `1fr 0px` with zero motion (only `opacity` transitions), causing instant stage jump. | Keep stage centered with smooth `transform` drawer slide on `<1180px` and use `grid-template-columns` transition (`--tg-dur-sheet`, `--tg-ease-out`) paired with `contain: layout` on wide desktop — or overlay slide-out drawer with zero stage reflow! |
| `games/black-and-white-2/game.css:405`, `quattro/game.css:304`, `same-number-hunt/game.css:73`, `image-game/game.css:268` | Progress/energy/tally bar fill | All 4 animate `transition: width ...` causing main-thread layout recalculation on every slider drag or score tick. | Replace `width: X%` with `transform: scaleX(ratio); transform-origin: left center; transition: transform var(--tg-dur-base) var(--tg-ease-out);` (GPU-composited, zero reflow). |
| `shared/theme.css:1453-1554` & `hub.css:872-939` | Responsive layout at 390px / 768px / 1440px+ | On 390px mobile, `.tg-hud` wraps into 2–3 tall rows eating vertical stage area; lobby modal tabs snap height abruptly when switching `solo`/`online`/`hotseat`. | Compact mobile HUD (hide secondary season badge & shorten labels `<480px`, single-row sticky bar ≤52px); keep modal width/min-height stable across tabs to eliminate vertical jump; render modals as clean bottom-aligned sheets on `<600px`. |

### 1.4 换内容 / 换图标 / 换文案 (Content / Icon / Copy Transitions)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `hub.js:419-467`, `shell.js:547-550, 823-833` | ZH ↔ EN language switch | Hard instant swap; inconsistent button labels (`"中文 / EN"` in Hub vs `"中/EN"` in Shell). | Standardize pill to concise `中 / EN` (active half highlighted in bold ink), wrap primary region text updates in subtle `Motion.crossfade` (`140ms` opacity dip, zero layout bounce). |
| `shared/theme.css` + `index.html` + `shell.js` | Dark ↔ Light theme switch | **Not yet implemented** — project is hardcoded dark-only with hundreds of dark hex values. | Add `shared/theme.js` + `[data-theme="dark"\|"light"]` + Sun/Moon SVG morph button in Hub Nav & Shell HUD; apply temporary `html.tg-theme-transition` (`220ms` color/bg/border transition) on manual toggle only. |
| `shared/ui/shell.js:324-327, 428-444, 1070-1082` | Copy Room Code / Copy Invite Link | Icon `⧉` never changes; relies solely on bottom toast; uses blocking `window.prompt` fallback. | Morph `copy` SVG → crisp animated `checkmark` SVG (`Motion.morphIcon`) + temporary label swap (`TGM-K7M4P` → `已复制` / `Copied` for `1800ms`, fixed min-width to prevent shift) + subtle `Motion.pulseConfirm`. |
| `shared/ui/shell.js:342-343, 653-673` & `hub.js:461-466` | Mute/Unmute SFX & Studio Ambience toggle | Uses OS-inconsistent emojis (`🔊`/`🔇`) and raw Unicode (`〰`) with zero transition. | Replace with bespoke 18×18 stroke SVGs (`volume-on`/`volume-off`, `waveform-active`/`waveform-idle`) morphed via `Motion.morphIcon` + `aria-pressed`. |
| `shared/ui/shell.js:763-821` (`.tg-vs-strip`) & `:865-892` (`.tg-conn-pill`) | Turn ownership transfer & connection badge transition | Rebuilds `vsStripEl.innerHTML` on every action; `.tg-conn-pill` text snaps abruptly. | Update `.is-turn` class & active dot in place; crossfade status badge text (`SYNCING` → `LIVE · P2P`) with subtle dot scale pop. |

### 1.5 数值跳动 (Numeric Telemetry)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `hub.js:456-458, 913-915`, `shell.js:748, 851` | Garnets, streaks, hero stats, HUD countdown timer | Missing `font-variant-numeric: tabular-nums` (digits jitter horizontally as `1`↔`8` change); values snap instantly; HUD timer runs on `setInterval(..., 200)` causing 5fps stepped progress bar! | Enforce `font-variant-numeric: tabular-nums` on all numeric telemetry globally; animate Garnets/stats via `Motion.animateNumber`; drive `#tg-hud-timer-bar` with smooth `requestAnimationFrame` (or CSS linear scaleX synced to remaining ms) for 60fps fluid drain. |
| `games/black-and-white-2/game.js:443-478` | 99-point dial `#bw2-halo-num` & 5-segment energy lamps `#bw2-my-lamps` | `syncDraftUI()` **rebuilds `#bw2-my-lamps.innerHTML` on every single slider pixel drag (`input` event)**, destroying CSS lamp transitions and causing flickering! | Toggle `.is-preview-off` classes on the 5 existing `.bw2-lamp` nodes in place! Smoothly transition halo color via `opacity`/`border-color` only (remove `transition: all`). |
| `games/indian-poker`, `indian-holdem`, `double-sided-poker`, `betting-black-and-white` | Chip stacks & pot updates | Chip counts and pot totals snap silently without delta visual cue. | Use `Motion.animateNumber(el, from, to, { duration: 320 })` + floating `+N`/`-N` micro-delta pill that rises `12px` and fades out (`650ms`). |
| `games/gyul-hap/game.js`, `winning-streak/game.js`, `betting-rps/game.js` | Score deltas (`+1/+3/-1`), streak flame (`🔥`), odds telemetry bars | Score numbers snap; `betting-rps` odds bar width snaps; `winning-streak` flame has no growth/extinguish feedback. | Animate score numbers via `Motion.animateNumber`, pop floating `+1`/`+3`/`−1` delta badge, scale streak flame smoothly (`scale(1 + streak*0.04)` capped at `1.2`) and damp-fade on reset; animate `.brps-odds-bar` segments via `flex-grow` / `scaleX`. |

### 1.6 按下 / 悬停 / 拖拽 / 可打断性 (Direct Manipulation & Interruptibility)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `hub.js:194-203` + `hub.css:286-291` (`#hero-garnet-crystal`) | Hero 3D crystal mouse parallax | Inline `crystal.style.transform` conflicts with `@keyframes hub-garnet-float` on the same element AND `transition: transform 0.25s` makes tracking laggy/spongy. | Separate layers: outer `.hub-garnet-float-wrap` runs idle float; inner `#hero-garnet-crystal` runs rAF-throttled 1:1 pointer tilt with `transition: none` while pointer moves, restoring `--tg-dur-sheet` `--tg-ease-out` only on `pointerleave`. |
| `hub.js:520-535` + `hub.css:524-525` (`.game-card`) | Holographic foil card hover tilt | Calls `card.getBoundingClientRect()` on every `pointermove` (forced sync layout!) while `transition: transform 0.22s` fights every pointer frame. | Cache rect on `pointerenter` (invalidate on scroll/resize), add `.is-tilting` (`transition: border-color var(--tg-dur-fast), box-shadow var(--tg-dur-fast)` — NO transform transition during active tracking), remove `.is-tilting` on `pointerleave` for silky spring settle. |
| `games/quattro/game.js:479-525` | Card drag to Virtual Player pod | Native HTML5 drag cannot track 1:1 with cursor, fails on mobile, and snaps abruptly on drop/cancel. | Pointer-capture drag (`touch-action: none`): 1:1 `translate3d(dx, dy, 0) scale(1.04) rotate(dx*0.02deg)` with `transition: none`; on release over pod, commit trade; on cancel, spring back to origin (`220ms`, `--tg-ease-spring`). |
| Rapid-click flows (`hub.js` filters, `shell.js` drawer/modal, `gyul-hap` tiles, `monorail` rail clicks) | Mid-flight interruption | Rapid toggling of Rules Drawer, Modals, or Filter Pills risks stale timeouts/exit callbacks removing newly opened UI; repeated clicks feel sluggish if durations exceed `160ms`. | Use `Motion.transitionPresence` with per-element generation tokens (incrementing token cancels any pending exit removal immediately); keep repeated user-action cadence (`tile toggle`, `stepper +/-`, `rail rotate`, `pill switch`) at **120–160ms** (`--tg-dur-micro` / `--tg-dur-fast`). |

### 1.7 加载 / 完成 / 出错 (Loading / Completion / Error)

| File & Selector / Function | Exact State Change | Current Flaw (Observed in Code) | Apple-Grade Fix |
|---|---|---|---|
| `shared/ui/shell.js:1285-1299` (`lobbyBusy`), `:887-889` (`SYNCING...`) | Online P2P/MQTT room creation, join, reconnect | Plain text `"开启中..."` / `"..."` with no tactile progress cue; `.tg-conn-dot` uses harsh linear `tg-blink`. | Add sleek 14px SVG ring spinner inside busy buttons (`opacity` crossfade without resizing button width); soften `.tg-conn-dot` connecting pulse to calm sinusoidal opacity breathe (`1.6s`). |
| `hub.js:977-990`, `shell.js:626-631, 1419-1424` | Invalid room code, empty player name, illegal action | Only shows toast or red box; the offending input/control gives zero localized physical feedback. | Trigger `Motion.nudgeError(el)` — restrained damped horizontal spring (`0 → -6px → +5px → -3px → +1px → 0`, `280ms`) + crisp crimson border pulse (`1px`, no gaudy flash). |
| `games/indian-poker`, `indian-holdem`, `memory-maze`, `gyul-hap`, `same-number-hunt` | Fold-10 penalty, wall strike, wrong Hap/equation | Each game invents its own jarring shake (`±8px` / `±12px` linear) or harsh red strobe. | Standardize ALL error/penalty states on `Motion.nudgeError(el, { intensity: 'subtle' \| 'impact' })` (subtle: `±5px`, impact: `±8px` damped decay) + clear semantic border & concise microcopy. |
| Valid confirmations (`copy`, `lock bid`, `submit formation`, `valid Hap`) | Action confirmation | Relies purely on audio + sudden next-phase redraw. | Apply `Motion.pulseConfirm(el)` (brief `scale(1.03)→1` + emerald/gold hairline ring dissolve over `240ms`). |

### 1.8 60fps Performance & Off-Screen Waste Findings

| File & Location | Flaw | Fix |
|---|---|---|
| `hub.js:171-306` (`initBackdropCanvas`) | `requestAnimationFrame(drawFrame)` runs continuously even when tab is backgrounded (`document.hidden`), when user scrolls down into the 44-Ep Chronicle, or when Vault modal covers the viewport. | Pause rAF on `document.visibilitychange` (`document.hidden === true`) and when `IntersectionObserver` reports hero is out of view (or throttle to 0fps when a modal is open). |
| `shared/ui/shell.js:199-265` (`launchVerdictParticles`) | Runs infinite particle loop even under `prefers-reduced-motion: reduce` and when tab is hidden; doesn't scale for `devicePixelRatio` cleanly. | Respect `Motion.reduced()` (render 0 particles — static celebratory halo only), pause when `document.hidden`, auto-settle particles after 6 seconds instead of burning GPU indefinitely. |
| **10 CSS files** (`theme.css:677`, `bw2:149,274`, `dsp:163`, `gyul-hap:203,228,518`, `indian-poker:417`, `monorail:38`, `snh:430`, `sph:50`, `twelve-janggi:116`) | `@keyframes` animating `box-shadow` directly (forces full repaint every frame). | Move animated glow to a `::after` layer with static `box-shadow` and animate ONLY `opacity` (`0.35 ↔ 0.85`). |
| **7 CSS files** (`theme.css:1055,1091`, `hub.css:412,474`, `betting-rps:347`, `bw2:94,323`, `memory-maze:95`, `sph:358`) | `transition: all ...` triggers unintended transitions on layout, color, and theme switches. | Replace every `transition: all` with explicit properties (`transform`, `opacity`, `border-color`, `background-color`). |

---

## 2. Unified Motion Language Tokens (`shared/theme.css`)

Replace the single `--tg-ease` variable in `shared/theme.css` with ONE unified, Apple-inspired physics & timing scale shared across Hub, Shell, and all 20 games:

```css
:root {
  /* ---- Unified Motion Curves ---- */
  /* Primary deceleration: entering UI, drawers, glides, card settles */
  --tg-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  /* Crisp tactile spring (slight natural overshoot, never cartoonish) */
  --tg-ease-spring: cubic-bezier(0.34, 1.42, 0.64, 1);
  /* Ultra-responsive direct manipulation & repeated clicks */
  --tg-ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* Clean departure: exiting modals, toasts, curtains */
  --tg-ease-in: cubic-bezier(0.4, 0, 1, 1);
  /* Legacy alias preserved for backwards compatibility */
  --tg-ease: var(--tg-ease-out);

  /* ---- Unified Duration Cadence ---- */
  /* Press compression, icon swap, stepper click, rapid tile toggle */
  --tg-dur-micro: 120ms;
  /* Hover elevation, filter pill slide, badge morph, modal exit */
  --tg-dur-fast: 160ms;
  /* Card deal/move, FLIP grid reorder, crossfade, progress bar scaleX */
  --tg-dur-base: 240ms;
  /* Modals, Rules Drawer, Sidebar, Privacy Curtain enter */
  --tg-dur-sheet: 320ms;
  /* 3D card showdown flip, VS Clash splash, Garnet transfer reveal */
  --tg-dur-drama: 440ms;

  /* ---- Tactile Press Scales ---- */
  --tg-press-btn: 0.97;
  --tg-press-tile: 0.955;
  --tg-press-card: 0.985;
}
```

### Cadence Rules (Strict Enforcement)
- **Repeated player actions** (toggling tiles in `gyul-hap` / `blackout-game`, stepping in `memory-maze`, rotating rails in `monorail`, clicking `+/-` chips): **120–160ms** (`--tg-dur-micro` to `--tg-dur-fast`). Never slow down a fast player!
- **Exits are always faster than enters**: Enter `--tg-dur-sheet` (`320ms`, `--tg-ease-out`) → Exit `--tg-dur-fast` (`160ms`, `--tg-ease-in`).
- **Simultaneous motion cap**: On any state transition, animate at most **1 primary focal object** + **1 subtle supporting cue** (e.g., flipped card + numeric pot tick). Never bounce 6 panels at once.

---

## 3. Shared `Motion` & `Theme` SDK API Spec

`@architect` implements two zero-dependency ES modules and re-exports them from `shared/sdk.js`:
```js
export { Motion } from './ui/motion.js';
export { Theme } from './theme.js';
```

### 3.1 `shared/ui/motion.js` — Exact API Contract

```js
/**
 * Shared Motion Primitives — GPU-only, interruptible, reduced-motion-safe.
 */
export const Motion = {
  /**
   * Returns true if the user prefers reduced motion (live-tracked via matchMedia).
   * @returns {boolean}
   */
  reduced(),

  /**
   * Subscribe to live prefers-reduced-motion changes.
   * @param {(isReduced: boolean) => void} cb
   * @returns {() => void} unsubscribe
   */
  onReducedChange(cb),

  /**
   * Smoothly animates a numeric readout (Garnets, chips, pot, scores, stats).
   * Automatically enforces `tabular-nums`, cancels any in-flight animation on `el`,
   * and snaps instantly when `Motion.reduced()` is true.
   * @param {HTMLElement} el
   * @param {number} from
   * @param {number} to
   * @param {{
   *   duration?: number,          // default 300ms
   *   format?: (n: number) => string, // default Math.round(n).toString()
   *   highlightClass?: string,    // optional brief class on increase/decrease
   *   deltaEl?: HTMLElement,      // optional container to spawn floating "+3"/"-1" pill
   * }} [opts]
   * @returns {() => void} cancel
   */
  animateNumber(el, from, to, opts),

  /**
   * Glides a persistent `.tg-seg-indicator` pill behind the active button inside
   * a segmented control or filter row using GPU `transform: translate3d(x,y,0)` + `width`/`scaleX`.
   * Handles resize & instant first paint (no initial fly-in from 0,0).
   * @param {HTMLElement} container - positioned parent holding the buttons
   * @param {HTMLElement} activeBtn - active button inside container
   * @param {{
   *   indicatorSelector?: string, // default '.tg-seg-indicator' (auto-created if missing)
   *   immediate?: boolean,        // true on first render or Motion.reduced()
   *   className?: string,         // extra styling class for the sliding capsule
   * }} [opts]
   */
  slideIndicator(container, activeBtn, opts),

  /**
   * Interruptible FLIP (First–Last–Invert–Play) transition for keyed lists, grids,
   * tile swaps, piece moves, and conveyor queues.
   * Usage:
   *   const play = Motion.flipList(container, '.game-card', { keyAttr: 'data-slug' });
   *   // ...mutate DOM order / add / remove nodes...
   *   play();
   * @param {HTMLElement} container
   * @param {string} itemSelector
   * @param {{
   *   keyAttr?: string,           // default 'data-flip-key' (falls back to data-slug / id)
   *   duration?: number,          // default 240ms
   *   easing?: string,            // default 'cubic-bezier(0.22, 1, 0.36, 1)'
   *   staggerMs?: number,         // default 0 (max 18ms for card grids)
   *   enterScale?: number,        // default 0.97
   * }} [opts]
   * @returns {() => void} play - call immediately after DOM mutation
   */
  flipList(container, itemSelector, opts),

  /**
   * Restrained damped spring horizontal nudge for errors, illegal moves,
   * invalid room codes, fold penalties, and wall strikes.
   * Under reduced-motion: skips displacement and plays crisp 160ms crimson border highlight only.
   * @param {HTMLElement} el
   * @param {{
   *   intensity?: 'subtle' | 'impact', // subtle: ±5px (forms/buttons), impact: ±8px (penalties/wall hit)
   *   duration?: number,               // default 280ms
   *   flashClass?: string,             // default 'is-nudge-error'
   * }} [opts]
   */
  nudgeError(el, opts),

  /**
   * Subtle tactile confirmation micro-pulse (copy success, bid lock, valid move).
   * Uses WAAPI `transform: scale(1 → 1.03 → 1)` + hairline ring fade.
   * Under reduced-motion: 140ms opacity/border pulse only.
   * @param {HTMLElement} el
   * @param {{ tone?: 'gold' | 'emerald' | 'cyan', duration?: number }} [opts]
   */
  pulseConfirm(el, opts),

  /**
   * Smoothly morphs an icon slot between two inline SVGs (Copy↔Check, Volume↔Mute,
   * Sun↔Moon, Ambience On↔Off) via synchronized cross-scale (`0.72→1`) + opacity (`140ms`).
   * Cancels any in-flight morph on rapid double-clicks.
   * @param {HTMLElement} el - icon container element
   * @param {string} nextSvgHtml - trusted static SVG markup
   * @param {{ duration?: number, revertAfterMs?: number, revertSvgHtml?: string }} [opts]
   */
  morphIcon(el, nextSvgHtml, opts),

  /**
   * Crisp opacity (+ optional subtle 4px Y) crossfade when replacing content inside a region
   * (language toggle, phase banner update, Grid ↔ Chronicle swap).
   * @param {HTMLElement} el
   * @param {() => void} mutateFn - synchronous DOM update callback
   * @param {{ duration?: number, shiftPx?: number }} [opts]
   * @returns {Promise<void>}
   */
  crossfade(el, mutateFn, opts),

  /**
   * Interruptible Enter / Exit presence controller for modals, drawers, curtains,
   * phase banners, and HUD pills. Uses a per-element WeakMap generation token so
   * reopening mid-close cleanly cancels the pending exit removal/hide!
   * @param {HTMLElement} el
   * @param {boolean} present - true = enter, false = exit
   * @param {{
   *   preset?: 'fade' | 'modal' | 'drawer-right' | 'sheet-up' | 'pill' | 'curtain',
   *   duration?: number,
   *   onAfterExit?: () => void,   // called ONLY if exit wasn't interrupted by a re-enter
   *   removeOnExit?: boolean,     // default false (toggles [hidden] + data-state)
   * }} [opts]
   * @returns {Promise<boolean>} resolves true if completed, false if interrupted
   */
  transitionPresence(el, present, opts),
};
```

#### Presence CSS Data-Attribute Contract (`shared/theme.css`)
`Motion.transitionPresence` drives `data-presence="entering" | "open" | "exiting"` and `data-preset="..."` so all animations stay GPU-composited in CSS with exact token parity:
- `modal`: backdrop `opacity 0↔1`, dialog `opacity 0↔1` + `transform: translateY(8px) scale(0.965) ↔ none`
- `drawer-right`: backdrop `opacity 0↔1`, drawer `transform: translateX(100%) ↔ translateX(0)`
- `sheet-up` (mobile `<600px` modal upgrade): `transform: translateY(24px) ↔ translateY(0)` + `opacity 0↔1`
- `pill`: `opacity 0↔1` + `transform: scale(0.94) ↔ scale(1)`
- `curtain`: `opacity 0↔1` + inner content `transform: translateY(10px) ↔ none`

### 3.2 `shared/theme.js` — Exact API Contract

```js
/**
 * Unified Dark (Obsidian Noir) & Light (Alabaster Broadcast Studio) Theme Controller
 * Persists explicit user choice in localStorage (`tgm_theme`); defaults to OS `prefers-color-scheme`.
 */
export const Theme = {
  /**
   * Initialize theme on `<html data-theme="dark|light">` and bind OS media listener.
   * Call as early as possible (and mirror a 6-line inline anti-FOUC snippet or sync init).
   * @returns {'dark' | 'light'}
   */
  init(),

  /**
   * Returns active resolved theme ('dark' | 'light').
   * @returns {'dark' | 'light'}
   */
  get(),

  /**
   * Explicitly set theme ('dark' | 'light' | 'system') and persist.
   * Briefly adds `html.tg-theme-transition` (220ms) for smooth crossfade without breaking transforms.
   * @param {'dark' | 'light' | 'system'} mode
   * @returns {'dark' | 'light'} resolved theme
   */
  set(mode),

  /**
   * Toggle between 'dark' and 'light', persist, and notify subscribers.
   * @returns {'dark' | 'light'}
   */
  toggle(),

  /**
   * Subscribe to theme changes (used by Hub canvas renderer, SVGs, and toggle button icon morph).
   * @param {(theme: 'dark' | 'light') => void} cb
   * @returns {() => void} unsubscribe
   */
  onChange(cb),
};
```

> **Anti-FOUC Note:** Place a tiny 4-line synchronous check inside `shared/https-guard.js` (already loaded synchronously in `<head>` of `index.html` and all 20 `games/*/index.html`!) that reads `localStorage.getItem('tgm_theme')` or `matchMedia('(prefers-color-scheme: light)')` and sets `document.documentElement.dataset.theme` **before first paint** — zero white-flash in Dark mode and zero black-flash in Light mode across all 21 HTML entry pages!

---

## 4. Dual-Theme Token Palette (Contrast-Checked Dark & Light)

### Design Identity
- **Dark — Obsidian Noir (`[data-theme="dark"]`, default if system dark)**: Studio velvet obsidian surfaces (`#06070b` → `#1a1f31`), molten garnet crimson (`#d91b3a` / `#ff2e54`), luminous championship gold (`#e4b95b` / `#fff0c2`), broadcast cyan (`#22d3ee`).
- **Light — Alabaster Broadcast Studio (`[data-theme="light"]`)**: Warm studio alabaster & brushed limestone (`#f7f5f0` → `#ffffff`), **never harsh `#ffffff` everywhere**; deepened Venetian garnet (`#be1233`, **6.1:1** on `#ffffff`), burnished broadcast bronze-gold (`#94630d` for text/icons = **5.1:1**, `#d49b2a` for metallic accents), deep studio teal (`#0369a1` = **5.8:1**), crisp hairline borders and soft multi-layer ambient elevation shadows.

### Complete CSS Custom Properties (`shared/theme.css`)

| Semantic Token | Dark (`[data-theme="dark"]`) | Light (`[data-theme="light"]`) | Contrast / Usage Note |
|---|---|---|---|
| `color-scheme` | `dark` | `light` | Native scrollbars, range inputs, selects |
| `--tg-bg-void` | `#06070b` | `#f4f1ea` | Page backdrop (warm studio alabaster in light) |
| `--tg-bg-noir` | `#0c0e16` | `#ebe6dc` | Secondary recessed stage / board frame |
| `--tg-bg-velvet` | `#121522` | `#ffffff` | Primary card / modal surface |
| `--tg-bg-elevated` | `#1a1f31` | `#fcfbf8` | Elevated interactive card / hover surface |
| `--tg-bg-recessed` | `rgba(6, 8, 14, 0.88)` | `rgba(232, 226, 214, 0.65)` | Inputs, wells, tracks, empty slots |
| `--tg-glass` | `rgba(14, 16, 26, 0.78)` | `rgba(255, 255, 255, 0.82)` | Frosted panels, dock, telemetry cards |
| `--tg-glass-strong` | `rgba(8, 10, 17, 0.92)` | `rgba(250, 248, 243, 0.92)` | Sticky HUD, Hub Nav, Sidebar |
| `--tg-scrim` | `rgba(4, 5, 10, 0.82)` | `rgba(20, 22, 30, 0.48)` | Modal & drawer backdrop scrim |
| `--tg-ink` | `#f6f3ec` | `#14161f` | Primary ink (**17.2:1** dark / **16.5:1** light) |
| `--tg-ink-muted` | `#a2a8bc` | `#4c5368` | Secondary copy (**7.6:1** dark / **7.1:1** light) |
| `--tg-ink-faint` | `#666e85` | `#6b7285` | Captions, mono metadata (**4.6:1** min) |
| `--tg-border` | `rgba(228, 185, 91, 0.22)` | `rgba(148, 99, 13, 0.22)` | Standard broadcast gold hairline |
| `--tg-border-strong` | `rgba(228, 185, 91, 0.48)` | `rgba(148, 99, 13, 0.42)` | Active/focused panel rim |
| `--tg-border-garnet` | `rgba(217, 27, 58, 0.48)` | `rgba(190, 18, 51, 0.36)` | Garnet accent rim |
| `--tg-border-subtle` | `rgba(255, 255, 255, 0.08)` | `rgba(20, 22, 31, 0.09)` | Dividers, neutral outlines |
| `--tg-garnet` | `#d91b3a` | `#be1233` | Primary Garnet fill / badge (**6.1:1** white ink) |
| `--tg-garnet-bright` | `#ff2e54` | `#d91b3a` | High-energy highlight / active ring |
| `--tg-garnet-deep` | `#7a091e` | `#880b23` | Gradient base / pressed depth |
| `--tg-garnet-ink` | `#ff8ba0` | `#a30f2b` | Text/badge ink on soft garnet tint (**≥5.5:1**) |
| `--tg-garnet-soft` | `rgba(217, 27, 58, 0.16)` | `rgba(190, 18, 51, 0.10)` | Soft garnet tint background |
| `--tg-garnet-glow` | `rgba(217, 27, 58, 0.42)` | `rgba(190, 18, 51, 0.22)` | Ambient elevation glow |
| `--tg-gold` | `#e4b95b` | `#b88218` | Metallic gold accent / borders / stars |
| `--tg-gold-bright` | `#fff0c2` | `#7c5107` | High-contrast gold **text** ink (**13.8:1** dark / **6.4:1** light!) |
| `--tg-gold-soft` | `rgba(228, 185, 91, 0.15)` | `rgba(184, 130, 24, 0.12)` | Soft gold badge/pill background |
| `--tg-gold-glow` | `rgba(228, 185, 91, 0.32)` | `rgba(184, 130, 24, 0.20)` | Gold ambient glow |
| `--tg-cyan` | `#22d3ee` | `#0284c7` | Broadcast telemetry accent |
| `--tg-cyan-ink` | `#67e8f9` | `#0369a1` | Telemetry text (**≥5.8:1** both themes) |
| `--tg-cyan-soft` | `rgba(34, 211, 238, 0.12)` | `rgba(2, 132, 199, 0.10)` | Cyan badge/pill fill |
| `--tg-emerald` | `#22c55e` | `#15803d` | Win / live status dot |
| `--tg-emerald-ink` | `#86efac` | `#166534` | Win/positive text (**≥6.0:1** both themes) |
| `--tg-amber` | `#f59e0b` | `#b45309` | Warning / caution |
| `--tg-violet` | `#a78bfa` | `#6d28d9` | S3 Black Garnet tag |
| `--tg-shadow-card` | `0 20px 50px rgba(0,0,0,0.65), 0 0 0 1px var(--tg-border)` | `0 10px 30px rgba(20,22,31,0.08), 0 2px 6px rgba(20,22,31,0.05), 0 0 0 1px var(--tg-border)` | Cards & panels |
| `--tg-shadow-garnet` | `0 14px 40px rgba(217,27,58,0.3), 0 0 0 1px var(--tg-border-garnet)` | `0 10px 26px rgba(190,18,51,0.18), 0 0 0 1px var(--tg-border-garnet)` | Primary CTA / Garnet focus |
| `--tg-shadow-modal` | `0 32px 86px rgba(0,0,0,0.82)` | `0 24px 64px rgba(20,22,31,0.18), 0 4px 14px rgba(20,22,31,0.08)` | Dialogs & sheets |

### Game-Table Semantic Bridge Tokens (Use Across All 20 Games!)
To guarantee every game board, card table, and SVG looks intentional and razor-sharp in BOTH Dark and Light modes without duplicating CSS per game, define these shared bridge tokens in `shared/theme.css`:

```css
:root, [data-theme="dark"] {
  --tg-surface-table: radial-gradient(ellipse 70% 52% at 50% 45%, rgba(28, 34, 54, 0.92), rgba(8, 10, 17, 0.98));
  --tg-surface-felt: radial-gradient(ellipse 68% 50% at 50% 48%, rgba(16, 52, 46, 0.72), rgba(11, 15, 26, 0.96) 65%, #06080f 100%);
  --tg-surface-card: linear-gradient(160deg, #1b2033 0%, #0d1019 100%);
  --tg-surface-tile: linear-gradient(180deg, #21273c 0%, #111522 100%);
  --tg-surface-tile-edge: #080a10;
  --tg-board-cell-a: rgba(17, 21, 36, 0.94);
  --tg-board-cell-b: rgba(11, 14, 24, 0.97);
  --tg-board-frame: #070911;
  --tg-track-bg: rgba(255, 255, 255, 0.08);
  --tg-hover-fill: rgba(255, 255, 255, 0.07);
}

[data-theme="light"] {
  --tg-surface-table: radial-gradient(ellipse 72% 54% at 50% 45%, #ffffff 0%, #f1ece2 100%);
  --tg-surface-felt: radial-gradient(ellipse 70% 52% at 50% 48%, #e4f1ec 0%, #d3e5de 65%, #c5dbd3 100%);
  --tg-surface-card: linear-gradient(165deg, #ffffff 0%, #f4efe5 100%);
  --tg-surface-tile: linear-gradient(180deg, #ffffff 0%, #ede7dc 100%);
  --tg-surface-tile-edge: #cfc6b5;
  --tg-board-cell-a: #f8f5ef;
  --tg-board-cell-b: #eae4d8;
  --tg-board-frame: #e2dacb;
  --tg-track-bg: rgba(20, 22, 31, 0.09);
  --tg-hover-fill: rgba(20, 22, 31, 0.055);
}
```

> **Critical Rule for Light Mode Exceptions:**
> - **Game-semantic Black & White tiles** (`black-and-white`, `black-and-white-2`, `betting-black-and-white`, `gyul-hap` black/gray/white backgrounds) MUST keep their literal Black vs White distinction in Light mode — give White tiles a crisp warm ivory bevel + `#d6cbb8` border + soft shadow so White tiles stay unmistakable against Light alabaster surfaces!
> - **`blackout-game` studio floor** intentionally dims to dark obsidian during `DARK_PLAN` (Blackout) and illuminates cleanly to warm floodlit studio surface during `LIGHTS_ON` — even more dramatic in Light mode!
> - **Hub Backdrop Canvas (`hub.js`)**: Read `Theme.get()` inside `drawFrame()` — in Light mode, switch beams to subtle warm champagne gold (`rgba(184,130,24,0.09)`) + rose-garnet wash (`rgba(190,18,51,0.07)`) with crisp translucent faceted shards (`alpha * 0.65`) and remove dark `.hub-vignette` overlay.

### Comprehensive `@media (prefers-reduced-motion: reduce)` Standard

Replace the blunt `shared/theme.css:1556-1564` block (`0.01ms !important` on everything, which breaks gentle opacity fades) with this precision rule:

```css
@media (prefers-reduced-motion: reduce) {
  /* Kill all ambient loops, spins, floats, shakes, and 3D flips */
  .hub-orbital-ring,
  .hub-garnet-halo,
  .hub-garnet-crystal,
  .hub-live-dot,
  .tg-curtain-gem,
  .tg-hud-timer.is-urgent,
  .tg-conn-pill.is-warn .tg-conn-dot {
    animation: none !important;
  }

  /* Zero displacement / 3D transform motion; preserve crisp 120ms opacity/color cues */
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }

  /* Presence presets become clean 120ms opacity-only dissolves with zero transform */
  [data-presence] {
    transform: none !important;
    transition: opacity 120ms ease !important;
  }

  /* 3D cards swap faces cleanly via opacity instead of 180° Y-axis tumble */
  .tg-card-3d-inner,
  .sph-tile-inner,
  .snh-tile-inner {
    transition-duration: 0.01ms !important;
  }
}
```
And in JavaScript (`Motion.reduced() === true`):
- `Motion.flipList` skips position glides and applies instant layout + `120ms` opacity fade on newly entering items.
- `Motion.animateNumber` updates text immediately (zero counting lag).
- `Motion.nudgeError` skips horizontal shake and flashes semantic crimson border for `220ms`.
- `hub.js` canvas draws **1 static frame** (re-drawn on resize or theme switch) — zero rAF loop.
- `shell.js` verdict canvas renders **0 particles**.
- `monorail/game.js` omits SVG `<animateMotion>` and displays a static highlighted train marker on the completed loop.

---

## 5. Microcopy & Interaction Polish Guide (Hub & Shared Shell)

Apply Apple-style broadcast calm: remove tech jargon (`WebRTC P2P`, `WSS`), eliminate redundant bilingual stuffing inside Chinese strings (`"过牌 CHECK"` → `"过牌"`), keep toasts under 16 ZH chars / 45 EN chars, and make action labels decisive.

| Location | Current Copy (ZH / EN) | Refined Copy (ZH / EN) | Why Better |
|---|---|---|---|
| Hub Hero Subtitle (`index.html:72`, `hub.js:429-431`) | `더 지니어스 · 《游戏的法则》S1–S4 传奇死亡对决全集。零安装在线 WebRTC 实时联机、三档天才级 AI 博弈、以及带加内特隐私护盾的本地传屏对战。` / `Complete interactive archive of Korean mind-game legend...` | **ZH:** `《游戏的法则》全四季 20 款经典死亡对决。支持实时好友联机、三档天才 AI 与本地同屏对战。`<br>**EN:** `All 20 Death Matches from The Genius S1–S4. Play live with friends, face 3-tier AI, or pass and play locally.` | Removes protocol jargon (`WebRTC`), tightens rhythm by 35%, leads with player value. |
| Hub Hero Kicker (`hub.js:426-428`) | `TVN 2013–2015 · 全四季 44 场死亡对决完全收录` / `TVN 2013–2015 · ALL 4 SEASONS · 44 BROADCAST DEATH MATCHES` | **ZH:** `TVN 2013–2015 · S1–S4 全 44 场死亡对决`<br>**EN:** `TVN 2013–2015 · S1–S4 · 44 DEATH MATCHES` | Cleaner broadcast ticker cadence, fits single line on mobile. |
| Hub & Shell Language Button (`index.html:49`, `shell.js:341`) | `中文 / EN` (Hub) vs `中/EN` (Shell) | Both: `中 / EN` (with active half styled in `--tg-ink`, inactive in `--tg-ink-faint`) | 100% consistent across Hub and all 20 games. |
| Hub Theme Toggle (New) | *(missing)* | Aria-label: `切换浅色模式` / `Switch to Light Mode` (and vice versa); crisp Sun ↔ Moon SVG morph, zero text bloat | Immediate visual affordance, fits compact HUD. |
| Hub Quick-Join Dock Title (`hub.js:438-440`) | `快速联机加入 / 极速开局` / `Live Room Quick-Join & Instant Duel` | **ZH:** `快速入局`<br>**EN:** `Quick Match` | Crisp two-word header lets the controls breathe. |
| Hub Quick-Join Error (`hub.js:987`) | `请输入有效的房间码（如 K7M4P）` / `Enter a valid 5-char room code` | **ZH:** `请输入 5 位房间码`<br>**EN:** `Enter a 5-character room code` (+ `Motion.nudgeError`) | Shorter, direct, paired with localized field nudge. |
| Hub Card Badge (`hub.js:769`) | `可畅玩` / `READY` | **ZH:** `可对战` / **EN:** `PLAYABLE` (or omit once all 20 are ready to reduce visual noise; keep `✓ 2W` win pill!) | Eliminates repetitive green badge clutter across 20 ready cards. |
| Hub Card CTA (`hub.js:791`) | `进入对决 →` / `Enter Arena →` | **ZH:** `开始对决` / **EN:** `Play` (keep `⚡ AI` secondary icon button `极速 AI` / `Quick AI`) | Cleaner primary button hierarchy, zero arrow noise. |
| Shell Ambience Toast (`shell.js:670-671`, `hub.js:945-946`) | `已开启死亡对决演播室心跳氛围音` / `Death Match studio heartbeat ON` | **ZH:** `演播室氛围音已开启` / `演播室氛围音已关闭`<br>**EN:** `Studio ambience on` / `Studio ambience off` | Half the length, calm, identical between Hub and Shell. |
| Shell Copy Room Code (`shell.js:434-440`) | Toast only: `已复制邀请链接（房间 TGM-K7M4P）` | Inline chip morph: `✓ 已复制` / `✓ Copied` (1.8s) + concise toast: `邀请链接已复制` / `Invite link copied` | Immediate at-cursor feedback where the user clicked. |
| Shell Connection Pill (`shell.js:868-892`) | `待命中` / `STANDBY`, `连接中...` / `SYNCING...`, `LIVE · P2P`, `LIVE · RELAY`, `已断开` / `OFFLINE` | **ZH:** `就绪`, `连接中`, `联机 · 直连`, `联机 · 中继`, `已断开`<br>**EN:** `Ready`, `Connecting`, `Live · P2P`, `Live · Relay`, `Offline` | Removes shouting ALL-CAPS and ellipsis jitter; clean title case. |
| Shell Return-to-Lobby Confirm (`shell.js:702-704`) | `返回对决大厅？` / `当前对局将返回模式选择或房间大厅。` | **ZH:** `离开当前对局？` / `进度不会保留，将返回房间设置。`<br>**EN:** `Leave current match?` / `Progress won't be saved. You'll return to the room lobby.` | Clear consequence, calm Apple dialog tone. |
| Shell VS Clash Heading (`shell.js:454`) | `DEATH MATCH · 死亡对决` | **ZH:** `死亡对决` (with kicker `THE GENIUS · DEATH MATCH`)<br>**EN:** `DEATH MATCH` | Eliminates awkward bilingual duplication on the same line. |
| Shell Verdict Stamp (`shell.js:1504-1508`) | `幸存者 · SURVIVOR` / `淘汰 · ELIMINATED` | **ZH:** `幸存晋级` (kicker `SURVIVOR`) / `本局淘汰` (kicker `ELIMINATED`)<br>**EN:** `SURVIVOR` / `ELIMINATED` | High-craft broadcast typography hierarchy instead of middot Mashup. |
| Privacy Curtain (`privacy-curtain.js:18-26`) | `加内特隐私护盾 · 移交设备` / `我已接过设备 · 揭晓手牌` | **ZH:** Badge `隐私护盾` · Hint `请将设备交予该参赛者，确认对手移开视线后继续` · Button `揭晓我的视图`<br>**EN:** Badge `PRIVACY SHIELD` · Hint `Pass the device to this player before revealing.` · Button `Reveal My View` | Works cleanly for both card games and board/tile games (not every game has "手牌"). |
| Online Lobby Share Banner (`shell.js:1077`) | `分享邀请链接或房间码给好友，支持 WebRTC P2P 与自动中继联机` | **ZH:** `发送房间码或链接给好友即可即时开战`<br>**EN:** `Share the room code or link to invite a rival.` | Human, confident, zero networking jargon. |
| Footer Tech Line (`index.html:228`) | `ZERO-BUILD ES MODULES · WEBRTC P2P + AES-GCM WSS RELAY` | `THE GENIUS S1–S4 · INTERACTIVE DEATH MATCH ARCHIVE` | Keeps broadcast studio illusion intact; moves engineering trivia out of user footer. |

---

## 6. Per-Builder Actionable Checklists

### 6.1 `@architect` — Shared Theme, Motion SDK, Shell & Hub

- [ ] **Create `shared/theme.js` & Anti-FOUC Hook**:
  - Implement `Theme.init/get/set/toggle/onChange` (`localStorage` key `tgm_theme`, `prefers-color-scheme` fallback).
  - Add synchronous 5-line `dataset.theme` bootstrap in `shared/https-guard.js` so all 21 pages render zero-FOUC on first paint.
- [ ] **Upgrade `shared/theme.css`**:
  - Add unified motion tokens (`--tg-ease-out`, `--tg-ease-spring`, `--tg-ease-snappy`, `--tg-ease-in`, `--tg-dur-micro`..`--tg-dur-drama`, `--tg-press-*`).
  - Implement complete `[data-theme="dark"]` & `[data-theme="light"]` token palette + Game-Table Semantic Bridge tokens (`--tg-surface-table`, `--tg-surface-felt`, `--tg-surface-card`, `--tg-surface-tile`, `--tg-board-cell-a/b`, etc.).
  - Add `[data-presence]` animation rules (`modal`, `drawer-right`, `sheet-up`, `pill`, `curtain`), `.tg-seg-indicator`, `.tg-spinner`, and `.is-nudge-error` styles.
  - Add `font-variant-numeric: tabular-nums` on `.tg-garnet`, `.tg-hud-timer`, `.tg-dial-value`, `.tg-roster-count`, `.hub-stat-num`.
  - Fix `:active` press scale on `.tg-btn`, `.tg-tile`, `.tg-chip`; eliminate `transition: all` (lines 1055, 1091) and `box-shadow` keyframe (lines 677–678 → `::after` opacity pulse).
  - Replace blunt `@media (prefers-reduced-motion: reduce)` with semantic opacity-preserving reduced-motion rules.
- [ ] **Create `shared/ui/motion.js` & Export in `shared/sdk.js`**:
  - Implement all 9 primitives (`reduced`, `onReducedChange`, `animateNumber`, `slideIndicator`, `flipList`, `nudgeError`, `pulseConfirm`, `morphIcon`, `crossfade`, `transitionPresence`).
  - Export `{ Motion }` and `{ Theme }` from `shared/sdk.js` and pass `motion: Motion, theme: Theme` in `mountGame` render `ctx`.
- [ ] **Polish `shared/ui/shell.js` & `shared/ui/privacy-curtain.js`**:
  - Add Theme toggle button (Sun↔Moon SVG morph) to HUD right cluster; replace emoji/glyph audio buttons (`🔊`/`🔇`/`〰`) with crisp SVG icons using `Motion.morphIcon`.
  - Upgrade `#tg-room-chip` & lobby copy buttons to `copy → checkmark` SVG morph + 1.8s `已复制`/`Copied` microcopy.
  - Route `UI.confirm`, `openRenameModal`, `renderDrawer`, `renderLobbyOverlay`, `renderResultOverlay`, and `privacy-curtain` through `Motion.transitionPresence` (with `Escape` support & interruptible exit).
  - Stop wiping `overlayRoot.innerHTML` when lobby modal is already open — patch inner panel only (and slide tab indicator on `.tg-mode-tabs` / `.tg-diff-grid`).
  - Stop wiping `vsStripEl.innerHTML` on every turn — patch `.is-turn` class & subtitles in place.
  - Replace `setInterval(200)` timer bar updates with smooth `requestAnimationFrame` `scaleX` drain (throttling text updates to 1s boundaries).
  - Cap toast stack at 3 with FLIP reflow and smooth exit; pause `launchVerdictParticles` on `document.hidden` & disable under `Motion.reduced()`, auto-settling after 6s.
  - Apply Section 5 refined ZH/EN microcopy across HUD, Lobby, Privacy Curtain, VS Clash, and Verdict overlay.
- [ ] **Polish `index.html`, `hub.css`, `hub.js`**:
  - Add Theme toggle button in `.hub-nav-actions` and consistent `中 / EN` pill.
  - Add `Theme.onChange` awareness to `initBackdropCanvas()` + `document.hidden` / `IntersectionObserver` pause/resume + static single-frame fallback under `Motion.reduced()`.
  - Fix `#hero-garnet-crystal` float/parallax layer conflict (outer float wrapper, inner 1:1 rAF tilt with `transition: none` while moving).
  - Fix `.game-card` tilt: cache `getBoundingClientRect()` on `pointerenter`, disable `transform` transition via `.is-tilting` during `pointermove`, restore spring settle on `pointerleave`.
  - Keep filter pills (`#season-filter-row`, `#mechanics-filter-row`) and `.hub-view-toggle` mounted permanently; use `Motion.slideIndicator` for sliding highlight capsule.
  - Key `.game-card` elements by `data-slug` and use `Motion.flipList` on filter/search changes; use `Motion.crossfade` for Arena Grid ↔ 44-Ep Chronicle switch and ZH↔EN switch.
  - Use `Motion.animateNumber` on hero stats & Vault Garnet counters; `Motion.nudgeError` on invalid Quick-Join room code; `Motion.transitionPresence` on Preview & Vault modals.
  - Remove `transition: all` in `hub.css` (lines 412, 474) and update hardcoded dark hexes (`#05060a`, `rgba(7,9,15,...)`) to `--tg-*` tokens so Light mode shines!

---

### 6.2 `@builder-poker` — `indian-poker`, `indian-holdem`, `double-sided-poker`, `quattro`

- **Shared Poker Rules**: Eliminate full `container.innerHTML` nukes on bet/turn updates so `.tg-card-3d` flips actually play! Replace hardcoded dark table/card hexes with `--tg-surface-felt`, `--tg-surface-table`, `--tg-surface-card`, `--tg-ink`, `--tg-border`. Add `tabular-nums` + `Motion.animateNumber` on all chip stacks and pots.
- [ ] **`indian-poker`**:
  - Preserve `.ip-card-3d` DOM nodes across betting → showdown so own forehead card smoothly 3D-flips (`rotateY(180deg→0deg)`, `420ms`) at showdown!
  - Animate chip stack & pot changes with `Motion.animateNumber` + floating `+N`/`-N` delta badge; replace `@keyframes ip-pot-pulse` `box-shadow` animation (`game.css:417`) with `::after` opacity pulse.
  - Replace harsh `ip-penalty-shake` on 10-card fold penalty with `Motion.nudgeError(tableEl, { intensity: 'impact' })`.
  - Ensure slider drag updates readout 1:1 with zero re-render; add `Motion.pulseConfirm` on bet/call lock.
- [ ] **`indian-holdem`**:
  - Preserve player & 2 community `.tg-card-3d` nodes so flop/showdown flips animate crisply (`stagger 70ms`).
  - Animate pot & chip stacks with `Motion.animateNumber`; replace `ih-shake` with `Motion.nudgeError` on high-hand fold penalty.
  - Ensure Light mode legibility on community pedestal, hand-rank badge, and card faces (crisp ivory front with dark ink, garnet/gold back).
- [ ] **`double-sided-poker`**:
  - Keep both player `.dsp-card-3d` cards mounted so opponent's Back card physically 3D-flips at showdown AND local Front/Back flip toggle isn't interrupted by remote updates.
  - Replace `@keyframes dsp-double-pulse` `box-shadow` loop (`game.css:163`) with `::after` opacity pulse.
  - Slide highlight on `.dsp-side-selector` (`Front` / `Back` / `Double-Bet 2×`) without nuking DOM (`renderGame` currently wipes `innerHTML` on line 548 when picking a side!).
  - Animate bet wells (`.dsp-well-val`) and pot with `Motion.animateNumber` + `Motion.pulseConfirm`.
- [ ] **`quattro`**:
  - Replace HTML5 `draggable` with Pointer Events 1:1 card drag (`touch-action: none`, disable `transform` transition while `.is-dragging`, magnetic scale highlight on hovered `.qt-vp-pod`, spring return on cancel).
  - Stop calling `renderGame()` (`innerHTML` nuke) on card selection (line 475); toggle `.is-selected` in place (`140ms`, `--tg-ease-spring`).
  - Fix `.qt-meter-fill` (`game.css:304`): replace `transition: width` with `transform: scaleX(ratio)` (`transform-origin: left`).
  - Animate card trades & mulligans via `Motion.crossfade` / `Motion.flipList` on `.qt-cards-row` and `Motion.pulseConfirm` on valid Quattro completion.
  - Ensure all 4 crystal suits (`R`/`B`/`G`/`Y`) + Black `0` retain unmistakable saturation and contrast in Light mode.

---

### 6.3 `@builder-board` — `twelve-janggi`, `tactical-yutnori`, `monorail`, `laser-chess`

- **Shared Board Rules**: Never destroy the board grid/SVG on piece selection or move! Key pieces stably so movement has genuine spatial continuity. Replace hardcoded dark SVG fills/strokes with CSS-variable-driven classes (`fill: var(--tg-board-cell-a)`, etc.) so boards look gallery-grade in both Dark & Light themes!
- [ ] **`twelve-janggi`**:
  - Keep the 3×4 `.tj-board-grid` and prisoner docks mounted; toggle `.is-selected` / `.is-legal` / `.is-capture` classes in place (`120ms` snappy cadence, zero `innerHTML` nuke on click!).
  - Key every piece with `data-piece-id` and run `Motion.flipList(boardColumn, '.tj-piece')` on moves, captures (piece glides smoothly into prisoner dock!), and drops.
  - Add crisp `scale(1→1.12→1)` golden sheen on `子 → 侯` promotion; replace `@keyframes tj-try-pulse` `box-shadow` (`game.css:116`) with `::after` opacity pulse.
  - Apply `Motion.nudgeError` on illegal move feedback.
- [ ] **`tactical-yutnori`**:
  - Keep the 29-node SVG mounted; animate Mal stacks smoothly along traversed nodes (step-by-step `110ms` hop per node via `transform: translate(x,y)`, skipping to instant under `Motion.reduced()`).
  - Animate the 4 Yut sticks reveal with clean staggered flip (`60ms` stagger, `--tg-dur-base`); toggle throw chips & selected source in place without full `innerHTML` wipe.
  - Ensure Light mode readability of board tracks, shortcut cyan nodes, and Goal badge.
- [ ] **`monorail`**:
  - Preserve `<svg class="mr-svg">` across staged placements & rotations: newly placed staged tiles spring in (`scale(0.84)→1`, `160ms`), and clicking to rotate smoothly rotates the inner rail `<g>` by 90° (`140ms`, `--tg-ease-snappy`).
  - Smoothly lerp SVG `viewBox` expansion over `220ms` instead of jumping; pause/omit `<animateMotion>` bullet train when `Motion.reduced()` is true.
  - Replace `@keyframes mr-siren` `box-shadow` (`game.css:38`) with `::after` opacity pulse; apply `Motion.slideIndicator` on `.mr-palette` brush switcher (`Auto` / `Straight` / `Curve`).
- [ ] **`laser-chess`**:
  - Keep `<svg class="lc-board-svg">` mounted across selections, moves, and rotations: pieces glide smoothly (`180ms`) between cells and rotate smoothly (`160ms`, CSS `transform` on `<g>`) on 90° turn!
  - Animate fired laser beam via SVG `stroke-dashoffset` sweep (`260ms`, `--tg-ease-out`) before triggering vaporize burst (`lc-shatter-burst`, `240ms`), and skip sweep under `Motion.reduced()`.
  - Ensure Sightline preview toggle updates only the preview `<g>` layer (no full DOM rebuild!) and uses high-contrast cyan/crimson strokes legible on Light mode cells too.

---

### 6.4 `@builder-mind` — `black-and-white`, `black-and-white-2`, `betting-black-and-white`, `betting-rps`

- **Shared Mind-Game Rules**: Preserve Black vs White tile material clarity in Light mode (crisp dark obsidian tile vs warm beveled ivory tile with hairline border & ambient shadow). Use `Motion.animateNumber` on all point vaults, chip banks, and scores.
- [ ] **`black-and-white`**:
  - Keep the 0–8 hand rack and central duel plaques mounted; animate played tile gliding/settling onto the clash pedestal (`Motion.flipList` or `translateY(-14px)→0` spring settle, `240ms`).
  - Animate win pips (`.bw-pip`) and central score with `Motion.animateNumber` + `Motion.pulseConfirm`.
  - Ensure all 61 hardcoded hexes in `game.css` migrate to `--tg-*` tokens (except intentional black/white tile faces).
- [ ] **`black-and-white-2`**:
  - **Critical Perf Fix (`game.js:474-477`)**: Stop nuking `#bw2-my-lamps.innerHTML` on slider `input`! Toggle `.is-preview-off` on the 5 existing `.bw2-lamp` elements in place for buttery 60fps dragging!
  - **Layout Fix (`game.css:405`)**: Change `.bw2-rem-fill` from `transition: width` to `transform: scaleX(ratio)` (`transform-origin: left`).
  - Remove `transition: all` (`game.css:94, 323`) and `box-shadow` keyframes (`game.css:149, 274` → `::after` opacity pulse); smoothly crossfade Black (`0–9`) ↔ White (`10+`) halo ring (`160ms`) as slider crosses `9↔10`.
  - Animate 5-segment lamp drops sequentially (`60ms` stagger per extinguished lamp) with crisp opacity/fill extinguish.
- [ ] **`betting-black-and-white`**:
  - In Phase 1 (`.bbw-setup-grid`), keep the 10 slot columns mounted and animate tile swaps via `Motion.flipList(grid, '.bbw-setup-tile')` (`220ms`, `--tg-ease-spring`)!
  - Update chip `+/-` counters & stack discs in place (`120ms` micro-scale pop on added/removed disc, `Motion.animateNumber` on allocation sum — zero `innerHTML` nuke!).
  - In Phase 2, add a clean **Partition Drop** reveal (`clip-path` / `translateY` lift, `360ms`) and animate Reserve Bank & borrowed chip counts with `Motion.animateNumber`.
- [ ] **`betting-rps`**:
  - Remove `transition: all` (`game.css:347`); stop calling `renderStage()` (`innerHTML` nuke) on prediction ticket click or wager `+/-` clicks (lines 556–589) — patch `.is-selected`, `#brps-w-val`, `#brps-proj-win`, and button text in place!
  - Animate chip vaults (`.brps-chip-vault`) with `Motion.animateNumber` + floating `+N`/`-N` delta pill; animate `.brps-odds-bar` segments smoothly (`scaleX` / `flex-grow` transition).
  - Refine `brps-slam` reveal to crisp `280ms` settle with `Motion.pulseConfirm` on win and `Motion.nudgeError` on lost bet.

---

### 6.5 `@builder-memory` — `memory-maze`, `same-picture-hunt`, `same-number-hunt`, `blackout-game`

- **Shared Memory Rules**: Never interrupt 3D tile flips or rapid sequential inputs with `innerHTML` nukes! Every tile flip (`same-picture-hunt`, `same-number-hunt`) must visibly turn through 3D space (or crisp 120ms opacity crossfade under `Motion.reduced()`).
- [ ] **`memory-maze`**:
  - Keep the 7×7 `.mm-grid` mounted; move player tokens via `Motion.flipList` or overlay coordinate `transform: translate3d(col*100%, row*100%, 0)` (`140ms`, `--tg-ease-snappy`) so rapid Arrow/WASD steps feel electric and responsive!
  - On `WALL_HIT`: render SVG laser barrier with crisp ignition (`opacity` + `stroke-dashoffset`), apply `Motion.nudgeError(stageCard, { intensity: 'impact' })` instead of un-damped `mm-shake`, then smoothly glide token back to Start!
  - Remove `transition: all` (`game.css:95`) and make obsidian/alabaster maze cells, trails, and cyan/garnet goals high-contrast in Light mode.
- [ ] **`same-picture-hunt`**:
  - Keep the 4×4 `.sph-wall-grid` mounted and toggle `.is-flipped`, `.is-match`, `.is-miss` classes in place so the 3D flip (`420ms`, `--tg-ease-out`) genuinely plays on every pick and close!
  - Keep the 20-slot conveyor track & 5-card upcoming queue mounted: glide runner cell via `transform` and shift upcoming cards via `Motion.flipList` (`220ms`) on advance (`+1`) or retreat (`-1`).
  - Remove `transition: all` (`game.css:358`) and `box-shadow` keyframe (`game.css:50` → `::after` opacity pulse); trigger `Motion.pulseConfirm` on Match and `Motion.nudgeError` on Miss.
- [ ] **`same-number-hunt`**:
  - Keep the 4×4 `.snh-tile` grid mounted so the 5s Opening Flash, 3s between-round Hint Reveal, and 3-tile Evaluation Reveal all play synchronized staggered 3D flips (`25ms` wave stagger on opening flash)!
  - **Layout Fix (`game.css:73`)**: Change `.snh-score-fill` from `transition: width` to `transform: scaleX(ratio)` (`transform-origin: left`).
  - Replace `@keyframes snh-buzz-pulse` `box-shadow` (`game.css:430`) with `::after` opacity pulse; add crisp tactile press (`scale(0.95)`) on buzzer button and `Motion.nudgeError` on equation mismatch/timeout.
- [ ] **`blackout-game`**:
  - Extend the existing in-place `renderSelf()` pattern (lines 521–561) to the full match lifecycle so operative tokens (`.bg-operative-token`) visibly glide across the crimson laser line (`transform: translateY(-...)`, `220ms`, `--tg-ease-spring`) instead of snapping!
  - Smoothly crossfade `.bg-studio-floor` between `is-blackout` (deep obsidian spotlight) and `is-lights-on` (illuminated studio floor) over `360ms` (`opacity` veil layer, GPU-only); animate `.bg-team-score` with `Motion.animateNumber`.
  - Apply `Motion.nudgeError` on `LIGHTS_BUSTED` / `FALSE_ALARM` and `Motion.pulseConfirm` on `LIGHTS_SAFE_CROSS`.

---

### 6.6 `@builder-speed` — `gyul-hap`, `winning-streak`, `sun-moon-star`, `image-game`

- **Shared Speed Rules**: Speed games demand **120ms** tactile cadence on rapid tile/hand picks so animations NEVER gate input! Use `Motion.animateNumber` on scores and streak metrics, and eliminate all `box-shadow` keyframes and `width` transitions.
- [ ] **`gyul-hap`**:
  - Keep the 3×3 `.gh-board-grid` mounted during a round! Clicking/pressing `1–9` toggles `.is-selected` and updates the `.gh-triad-svg` overlay in place (`120ms`, zero `innerHTML` rebuild — currently `toggleTile()` at line 133 wipes the entire DOM on every single keypress!).
  - Replace all 3 `box-shadow` keyframes (`gh-bonus-pulse`, `gh-gyul-shock`, `gh-gyul-glow` at `game.css:203,228,518`) with `::after` opacity pulses; replace `gh-shake` with `Motion.nudgeError`.
  - Animate scoreboards (`.gh-score-num`) via `Motion.animateNumber` + floating `+1` / `+3` / `−1` delta pop; keep hover-preview on `.gh-hap-chip` in-place (fix `mouseleave` line 610 which currently calls full `draw()`!).
- [ ] **`winning-streak`**:
  - In Phase 1 (9-Guest Lobby), toggle garnet tokens on `[data-guest-idx]` in place (`120ms` scale pop per gem, `Motion.animateNumber` on remaining tokens — stop calling full `draw()` on lines 471/479!).
  - Animate `🔥` current streak & `★` best streak via `Motion.animateNumber`: grow flame subtly (`scale(1.06)→1` + warm glow pulse) on win, calm fade-down + `Motion.nudgeError` on streak break (`DRAW`/`LOSS`).
  - Smoothly highlight active guest along the 9-guest runway with `Motion.slideIndicator` or sliding focus frame.
- [ ] **`sun-moon-star`**:
  - Keep the Sun/Moon/Star foil cards and vault cards mounted; animate card selection (`translateY(-6px)`, `140ms`, `--tg-ease-spring`) and showdown flip/reveal via `.is-flipped` without wiping DOM.
  - Animate chip stacks & pot via `Motion.animateNumber` + floating delta; gate `sms-spin` orbital keyframe off under `Motion.reduced()`.
  - Ensure gold/silver/crimson foil cards have crisp contrast and borders in Light mode.
- [ ] **`image-game`**:
  - **Layout Fix (`game.css:268`)**: Change `.ig-tally-fill` from `transition: width 0.55s` to `transform: scaleX(ratio)` (`transform-origin: left`) with `60ms` stagger across voting bars!
  - Animate life gems (`.ig-gem-slot`) with `Motion.pulseConfirm` on gain and crisp shrink+fade (`200ms`) on loss; use `Motion.crossfade` when transitioning between clue composition, voting gallery, and tally reveal.
  - Update prompt pills and selected art cards in place (`140ms` tactile feedback, zero `innerHTML` nuke on click) and verify Light mode art card frames & text contrast.

---

## 7. Verification Gate (For `@qa` & `@qa-2`)

Before signing off on the motion, theme & copy polish pass, verify:
1. **Theme Parity (`dark` & `light`)**: Toggle theme in Hub and inside games — zero unreadable text (≥4.5:1 body, ≥3:1 large UI), zero white-on-white or black-on-black badges/cards/SVGs, zero FOUC on reload.
2. **Reduced Motion (`prefers-reduced-motion: reduce`)**: Enable in DevTools → verify zero spins, zero floating/parallax, zero canvas rAF loop, zero shakes, zero 3D tumbles, while all opacity fades (`120ms`) and game feedback remain 100% clear.
3. **Zero Layout Thrash & CLS = 0**: Zero `transition: all`, zero `width`/`height` bar animations, zero `box-shadow` keyframes, `tabular-nums` on all timers/counters, zero horizontal HUD jump when pills appear/disappear.
4. **Interruptibility**: Rapidly click filter pills, open/close Rules Drawer mid-animation, switch Lobby tabs rapidly, and click tiles rapidly in `gyul-hap` / `twelve-janggi` / `quattro` — zero stuck overlays, zero swallowed clicks, zero console errors.
5. **Responsive Continuity**: Verify `390px` (Mobile), `768px` (Tablet), and `1440px` (Desktop) in both Dark & Light modes, ZH & EN.
