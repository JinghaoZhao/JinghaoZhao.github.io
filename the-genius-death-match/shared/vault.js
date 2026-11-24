/**
 * The Genius: Garnet Vault — Local Progression & Death Match Survival Tracker
 * Persists Garnets, Black Garnets, Survival Streak, and per-game victories in localStorage.
 */

const VAULT_KEY = 'tgm_garnet_vault_v1';
const listeners = new Set();

function defaultVault() {
  return {
    garnets: 3, // Every Genius contestant starts with 3 Garnets
    blackGarnets: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    winsByGame: {}, // { [slug]: number }
    playsByGame: {}, // { [slug]: number }
    history: [], // [{ slug, title, outcome: 'win'|'loss'|'draw', opponent, mode, difficulty, delta, ts }]
  };
}

function loadVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return defaultVault();
    const parsed = JSON.parse(raw);
    return { ...defaultVault(), ...parsed };
  } catch (_) {
    return defaultVault();
  }
}

function saveVault(data) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(data));
  } catch (_) {}
  for (const cb of listeners) {
    try {
      cb(data);
    } catch (_) {}
  }
}

export const GarnetVault = {
  get() {
    return loadVault();
  },

  recordMatch({ slug, title, outcome, opponent = '', mode = 'solo', difficulty = 'genius' }) {
    const data = loadVault();
    data.playsByGame[slug] = (data.playsByGame[slug] || 0) + 1;

    let delta = 0;
    let earnedBlackGarnet = false;

    if (outcome === 'win') {
      data.wins += 1;
      data.streak += 1;
      if (data.streak > data.bestStreak) data.bestStreak = data.streak;
      data.winsByGame[slug] = (data.winsByGame[slug] || 0) + 1;
      delta = difficulty === 'grand_final' ? 3 : mode === 'online' ? 3 : 2;
      data.garnets += delta;
      // Award a Black Garnet every 3 consecutive Death Match survivals!
      if (data.streak > 0 && data.streak % 3 === 0) {
        data.blackGarnets += 1;
        earnedBlackGarnet = true;
      }
    } else if (outcome === 'loss') {
      data.losses += 1;
      data.streak = 0;
      delta = data.garnets > 0 ? -1 : 0;
      data.garnets = Math.max(0, data.garnets + delta);
    } else {
      data.draws += 1;
      delta = 0;
    }

    data.history.unshift({
      slug,
      title,
      outcome,
      opponent,
      mode,
      difficulty,
      delta,
      earnedBlackGarnet,
      ts: Date.now(),
    });
    if (data.history.length > 30) data.history.length = 30;

    saveVault(data);
    return { vault: data, delta, earnedBlackGarnet };
  },

  getWinsFor(slug) {
    return loadVault().winsByGame[slug] || 0;
  },

  reset() {
    const fresh = defaultVault();
    saveVault(fresh);
    return fresh;
  },

  onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
