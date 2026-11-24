# The Genius: Death Match Arena — Shared SDK & Game Builder Contract

> **Project Root:** `/Users/madvincent/.gemini/antigravity/scratch/the-genius-death-match/`  
> **Architecture:** Zero-build native ES Modules (`<script type="module">`)  
> **Networking:** 4-Tier Hybrid Transport — PeerJS WebRTC P2P (`tgm-room-*`) + AES-GCM MQTT-WSS fallback (`the-genius-dm/v1/*`) + Same-Browser `BroadcastChannel` (`tgm-bc-*`) + Local Loopback (Solo vs AI & Pass-and-Play)

---

## 1. Per-Game File Layout (Zero-Conflict Parallel Builds)

Each Death Match game lives in its own isolated folder under `games/<slug>/`:

```text
games/<slug>/
├── index.html     # Entry page loading ../../shared/https-guard.js, ../../shared/theme.css, ./game.css, and ./game.js
├── game.css       # Game-specific board/table/card styling (uses --tg-* tokens)
├── rules.js       # Pure, deterministic state machine + state projection + 3-tier AI bot logic
└── game.js        # Interactive board renderer + mountGame() wiring
```

### Minimal `games/<slug>/index.html` Template

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Game Name · The Genius Death Match</title>
  <script src="../../shared/https-guard.js"></script>
  <link rel="stylesheet" href="../../shared/theme.css" />
  <link rel="stylesheet" href="./game.css" />
</head>
<body class="tg-body">
  <div id="game-root"></div>
  <script type="module" src="./game.js"></script>
</body>
</html>
```

---

## 2. Single Barrel Import (`../../shared/sdk.js`)

```js
import {
  mountGame,
  SFX,
  I18n,
  UI,
  GarnetVault,
  createSeededRng,
  AI_DIFFICULTIES,
} from '../../shared/sdk.js';
```

---

## 3. Pure Rules Contract (`rules.js`)

`rules.js` MUST have **zero DOM access** and use `ctx.rng()` instead of `Math.random()` for reproducible shuffles and tests. All returned states MUST be plain JSON-serializable objects.

```js
export const GameRules = {
  /**
   * Create initial canonical fullState on Host when match starts.
   * @param {Array<{ seatId: string, name: string, avatar: string, isBot: boolean, difficulty?: string }>} seats
   * @param {{ rng: () => number, difficulty: 'easy'|'genius'|'grand_final', options: Record<string, any> }} ctx
   * @returns {object} fullState
   */
  createInitialState(seats, ctx) { /* ... */ },

  /**
   * Validate whether seatId may perform action in current fullState.
   * @returns {{ ok: true } | { ok: false, reason: string }}
   */
  validateAction(fullState, seatId, action) { /* ... */ },

  /**
   * Apply validated action and return { state: nextFullState, events?: Array<object> }.
   * Never mutate fullState in place (clone or produce a new object).
   */
  applyAction(fullState, seatId, action, ctx) { /* ... */ },

  /**
   * Optional: Called automatically on Host when getPhaseTimer() expires.
   * @returns {{ state: nextFullState, events?: Array<object> } | null}
   */
  onPhaseTimeout(fullState, ctx) { /* ... */ },

  /**
   * CRITICAL FOR HIDDEN-INFO GAMES:
   * Return sanitized view visible to viewerSeatId (or null for Spectators).
   * Must hide opponent's secret cards, unrevealed bids, concealed tiles, and deck order.
   * (Special case like Indian Poker: hide viewerSeatId's OWN card while showing opponent's!)
   */
  projectState(fullState, viewerSeatId) { /* ... */ },

  /**
   * Optional: Return synchronized phase timer spec or null if untimed.
   * Changing `phaseKey` resets the countdown; keeping the same `phaseKey` preserves remaining time.
   * @returns {{ phaseKey: string, durationMs: number } | null}
   */
  getPhaseTimer(fullState) { /* ... */ },

  /**
   * Host AI Bot decision function. Called automatically when a bot can act.
   * Respect `ctx.difficulty`: 'easy' | 'genius' | 'grand_final'.
   * @returns {{ type: string, payload?: any } | null}
   */
  computeBotAction(fullState, botSeatId, ctx) { /* ... */ },

  /**
   * Return null while match is ongoing, or verdict object when finished:
   * {
   *   winnerSeatIds: string[],                 // [] for draw
   *   rankings: Array<{ seatId, label, score }>,
   *   summary: { zh: string, en: string }
   * }
   */
  getResult(fullState) { /* ... */ },
};
```

### Hotseat & VS-Bar Turn Convention
To ensure the Broadcast VS Nameplate Strip highlights the active player AND Local Pass-and-Play Privacy Curtain knows whose turn it is, expose one of these standard fields on your state:
- `state.currentTurnSeatId` (for sequential turn games), OR
- `state.pendingSeatIds` (array of seatIds that still need to submit a simultaneous secret move/bid).
- Optional HUD telemetry auto-read: `state.round` (number) and `state.phaseLabel` (`{ zh, en }` or string).

---

## 4. Mounting a Game (`game.js`)

```js
import { mountGame, SFX, I18n, UI } from '../../shared/sdk.js';
import { GameRules } from './rules.js';

mountGame({
  config: {
    id: 'indian-poker',                     // Must match folder slug & games.json slug
    title: { zh: '印第安扑克', en: 'Indian Poker', ko: '인디언 포커' },
    seasons: ['S1', 'S2', 'S4'],            // Displayed in Broadcast HUD pill
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    stakes: 2,                              // Optional Garnet stakes badge in HUD
    hasHiddenInfo: true,                    // Enables Garnet Privacy Curtain in Pass-and-Play
    optionsSchema: [                        // Optional lobby toggles/selects
      { key: 'fastTimers', label: { zh: '极速计时', en: 'Fast Timers' }, type: 'boolean', default: false },
    ],
    rulesSummary: {
      zh: '### 对决目标\n...',
      en: '### Objective\n...',
    },
  },
  rules: GameRules,
  root: document.getElementById('game-root'),

  /**
   * @param {HTMLElement} container - #tg-stage inside the broadcast shell
   * @param {{
   *   state: object,
   *   mySeatId: string | null,
   *   activeSeatId: string | null,
   *   seats: Array<{ seatId, name, avatar, isBot, connected, ready }>,
   *   isHost: boolean,
   *   isSpectator: boolean,
   *   mode: 'online' | 'solo' | 'hotseat',
   *   roomCode: string,
   *   aiDifficulty: 'easy' | 'genius' | 'grand_final',
   *   lang: 'zh' | 'en',
   *   lastEvent: object | null,
   *   dispatch: (action: { type: string, payload?: any }) => Promise<{ ok: boolean, reason?: string }>,
   *   sfx: typeof SFX,
   *   ui: typeof UI,
   *   vault: typeof GarnetVault,
   *   log: (text: string, kind?: 'system'|'alert'|'chat') => void,
   *   setTelemetry: (t: { round?: number, phase?: string|{zh,en}, stakes?: number } | null) => void,
   * }} ctx
   */
  render(container, ctx) {
    // Render game board & interactive controls; call ctx.dispatch({ type, payload }).
  },
});
```

---

## 5. Audio Cues (`SFX.play(name)`)

| Cue Name | Sound Effect |
|---|---|
| `click` | Crisp metallic/velvet UI tap |
| `cardFlip` | Sharp playing-card snap & swoosh |
| `tilePlace` | Heavy obsidian tile thud on studio table |
| `garnetClink` | Crystalline ruby harmonic chime (alias: `pieceGain`) |
| `chipStack` | 3-chip ceramic casino stack cascade |
| `bid` | Crisp bidding gavel / chip clink |
| `laserZap` | Electric cyan laser beam zap |
| `heartbeat` | Tense double sub-bass studio heartbeat |
| `tick` / `tickUrgent` | Countdown studio tick (+ heartbeat thump when urgent) |
| `clash` | Dramatic Death Match VS slam impact |
| `reveal` | Dramatic synth/brass reveal swell |
| `combo` | Ascending harmonic reward arpeggio |
| `victory` | Championship resolution fanfare |
| `eliminate` | Deep crimson broadcast elimination gong |
| `error` | Invalid action buzz |

---

## 6. Design Tokens & Reusable CSS Classes (`shared/theme.css`)

### Core Tokens
- Surfaces: `--tg-bg-void` (`#06070b`), `--tg-bg-noir` (`#0c0e16`), `--tg-bg-velvet` (`#121522`), `--tg-bg-elevated` (`#1a1f31`), `--tg-glass`, `--tg-border`, `--tg-border-strong`, `--tg-border-garnet`
- Accents: `--tg-garnet` (`#d91b3a`), `--tg-garnet-bright` (`#ff2e54`), `--tg-gold` (`#e4b95b`), `--tg-gold-bright` (`#fff0c2`), `--tg-cyan` (`#22d3ee`), `--tg-emerald` (`#22c55e`), `--tg-amber` (`#f59e0b`)
- Fonts: `--tg-font-display`, `--tg-font-ui`, `--tg-font-mono`

### Ready-to-Use Component Classes
- **Containers**: `.tg-panel`, `.tg-grid-board`
- **Buttons**: `.tg-btn`, `.tg-btn-garnet`, `.tg-btn-gold`, `.tg-btn-cyan`, `.tg-btn-ghost`, `.tg-btn-sm`, `.tg-btn-icon`
- **Badges & Garnets**: `.tg-badge`, `.tg-badge-garnet`, `.tg-badge-gold`, `.tg-badge-cyan`, `.tg-badge-emerald`, `.tg-garnet`, `.tg-black-garnet` (or `UI.renderGarnetBadge(n)`)
- **3D Flippable Cards**: `.tg-card-3d` (`.is-flipped`) > `.tg-card-3d-inner` > `.tg-card-face.tg-card-front` + `.tg-card-face.tg-card-back`
- **Tiles & Chips**: `.tg-tile` (`.is-selected`, `.is-garnet`), `.tg-laser-tile` (`.is-lit-cyan`, `.is-lit-garnet`), `.tg-chip` (`.is-gold`)
- **Bidding Dial**: `.tg-dial` + `.tg-dial-value`

---

## 7. Local Preview & URL Parameters

Serve from `/Users/madvincent/.gemini/antigravity/scratch/the-genius-death-match/`:
```bash
python3 -m http.server 8899 --bind 127.0.0.1
```
Supported query params on any game URL (`games/<slug>/`):
- `?room=K7M4P` — Opens Online tab prefilled with room code `K7M4P`
- `&mode=spectate` — Join directly as Spectator
- `?quick=solo` — Immediately launches Solo vs Genius AI
- `&transport=auto|peerjs|mqtt|local` — Force specific multiplayer transport for testing
