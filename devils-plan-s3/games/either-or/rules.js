/**
 * Game 01: Either/Or (二选一 / 양자택일) — Day 1 Main Match 1
 * 10 Secret Binary Dilemmas + 4 Playable Embedded Mini-Games (Cubes, Rectangles, Memory Poker, Lay the Grass)
 * + Prize Token Vault (+100M KRW each) + #1 Alliance Token Rescue from Prison Quarters.
 */

export const GRASS_ROWS = 10;
export const GRASS_COLS = 12;
export const GRASS_OBSTACLES = [[2, 3], [2, 8], [4, 5], [5, 6], [7, 3], [7, 8]]; // 120 - 6 = 114 cells
export const GRASS_TILES = {
  3:  [[0,0],[1,0],[1,1]],
  4:  [[0,0],[0,1],[0,2],[1,1]],
  6:  [[0,0],[0,1],[0,2],[1,1],[1,2],[2,1]],
  7:  [[0,0],[0,1],[0,2],[1,0],[1,2],[2,1],[2,2]],
  9:  [[0,1],[0,2],[1,0],[1,1],[1,2],[1,3],[2,0],[2,2],[3,2]],
  11: [[0,0],[0,1],[0,2],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[3,1],[3,3]],
  13: [[0,1],[0,2],[0,3],[1,0],[1,1],[1,3],[1,4],[2,0],[2,2],[2,3],[3,0],[3,1],[3,2]],
};
export const GRASS_TILE_IDS = [3, 4, 6, 7, 9, 11, 13];
export const GRASS_COLORS = [
  '#10b981', '#34d399', '#059669', '#22c55e', '#14b8a6', '#84cc16',
  '#06b6d4', '#16a34a', '#2dd4bf', '#4ade80', '#0d9488', '#65a30d',
  '#38bdf8', '#a3e635', '#047857', '#15803d',
];
export const RANK_LABELS = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' };
export const SUITS = ['S', 'H', 'C', 'D'];
export const SUIT_META = {
  S: { symbol: '♠', color: 'black' },
  H: { symbol: '♥', color: 'red' },
  C: { symbol: '♣', color: 'black' },
  D: { symbol: '♦', color: 'red' },
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

// ===========================================================================
// 10 Binary Dilemmas (Show-Confirmed Core + Game-Theory Dilemmas)
// ===========================================================================
export const DILEMMAS = [
  {
    id: 1,
    code: 'C1',
    title: { zh: '第 1 题 · 公共利益 vs 个人利益', en: 'Choice 1 · Public Good vs Private Gain' },
    subtitle: { zh: '剧集核心首题：集体奖金徽章，还是趁乱独吞私利？', en: 'Show opener: Unlock a Prize Token for all, or defect for personal points?' },
    aName: { zh: '公共利益', en: 'Public Good' },
    bName: { zh: '个人利益', en: 'Private Gain' },
    aRule: { zh: '若全场过半数 (>50%) 选 A：全员解锁 +1 枚奖金徽章 (+1亿韩元)，全员本轮 0 分。', en: 'If >50% choose A: Unlock +1 Prize Token (+100M KRW) for the pool; all score 0.' },
    bRule: { zh: '若选 A 未过半（任务失败）：仅选 B 者每人获得 +4 胜点，选 A 者 0 分！', en: 'If A fails majority: ONLY B voters earn +4 pts each; A voters get 0!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      let prizeGained = 0;
      let outcome;
      if (aIds.length > n / 2) {
        prizeGained = 1;
        outcome = {
          zh: `公共任务达成 (${aIds.length}/${n} 选 A)！全员赢得 +1 枚奖金徽章 (+1亿韩元)！`,
          en: `Public Mission SUCCEEDED (${aIds.length}/${n} chose A)! +1 Prize Token (+100M KRW) unlocked!`,
        };
      } else {
        bIds.forEach((id) => (deltas[id] = 4));
        outcome = {
          zh: `公共任务失败 (仅 ${aIds.length}/${n} 选 A)！${bIds.length} 名个人利益派各夺 +4 胜点！`,
          en: `Public Mission FAILED (${aIds.length}/${n} chose A)! ${bIds.length} defectors claim +4 pts each!`,
        };
      }
      return { deltas, prizeGained, outcome };
    },
  },
  {
    id: 2,
    code: 'C2',
    title: { zh: '第 2 题 · 少数派独赢', en: 'Choice 2 · Minority Triumph' },
    subtitle: { zh: '逆向博弈：站在人少的一边独吞高分，平票则全员归零！', en: 'Contrarian game: Smaller non-empty camp takes all; exact tie pays zero!' },
    aName: { zh: '冷金阵营 A', en: 'Gold Camp A' },
    bName: { zh: '猩红阵营 B', en: 'Crimson Camp B' },
    aRule: { zh: '若 A 人数严格少于 B（且至少 1 人）：选 A 每人 +4 胜点！', en: 'If 0 < count(A) < count(B): A voters earn +4 pts each!' },
    bRule: { zh: '若 B 人数严格少于 A（且至少 1 人）：选 B 每人 +4 胜点！（平票全员 0 分）', en: 'If 0 < count(B) < count(A): B voters earn +4 pts each! (Tie = 0 all)' },
    resolve(votes, state) {
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      let outcome;
      if (aIds.length > 0 && aIds.length < bIds.length) {
        aIds.forEach((id) => (deltas[id] = 4));
        outcome = { zh: `冷金阵营 A 以少数派胜出 (${aIds.length} vs ${bIds.length})，每人 +4 分！`, en: `Minority A wins (${aIds.length} vs ${bIds.length}) — +4 pts each!` };
      } else if (bIds.length > 0 && bIds.length < aIds.length) {
        bIds.forEach((id) => (deltas[id] = 4));
        outcome = { zh: `猩红阵营 B 以少数派胜出 (${bIds.length} vs ${aIds.length})，每人 +4 分！`, en: `Minority B wins (${bIds.length} vs ${aIds.length}) — +4 pts each!` };
      } else {
        outcome = { zh: `票数持平或全员一边倒 (${aIds.length} vs ${bIds.length})，本轮无人得分！`, en: `Tie or unanimous (${aIds.length} vs ${bIds.length}) — 0 pts awarded!` };
      }
      return { deltas, prizeGained: 0, outcome };
    },
  },
  {
    id: 3,
    code: 'C3',
    title: { zh: '第 3 题 · 稳健保底 vs 贪婪翻倍', en: 'Choice 3 · Safe Floor vs Greedy Spike' },
    subtitle: { zh: '落袋为安 +2 分，还是赌全场不超过三分之一的人选 B 搏 +5？', en: 'Bank a guaranteed +2 pts, or gamble for +5 if B stays under one-third?' },
    aName: { zh: '稳健保底', en: 'Safe Floor' },
    bName: { zh: '贪婪翻倍', en: 'Greedy Spike' },
    aRule: { zh: '无论他人如何选择，选 A 稳定获得 +2 胜点。', en: 'Guaranteed +2 pts regardless of other votes.' },
    bRule: { zh: '若选 B 总人数 ≤ floor(N/3)：选 B 每人暴涨 +5 分；若超载则反扣 -1 分！', en: 'If count(B) <= floor(N/3): +5 pts each! If overcrowded: -1 pt penalty!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const cap = Math.max(1, Math.floor(n / 3));
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      aIds.forEach((id) => (deltas[id] = 2));
      const bSafe = bIds.length <= cap;
      bIds.forEach((id) => (deltas[id] = bSafe ? 5 : -1));
      return {
        deltas,
        prizeGained: 0,
        outcome: bSafe
          ? { zh: `贪婪成功！仅 ${bIds.length} 人 (≤${cap}) 选 B 喜提 +5 分，A 阵营稳拿 +2 分！`, en: `Greed paid off! ${bIds.length} (≤${cap}) on B hit +5 pts; A takes +2 pts.` }
          : { zh: `贪婪爆仓！${bIds.length} 人 (>${cap}) 挤爆 B 惨遭 -1 罚分，A 阵营稳拿 +2 分！`, en: `Greed busted! ${bIds.length} (>${cap}) crowded B for -1 pt; A safely banks +2.` },
      };
    },
  },
  {
    id: 4,
    code: 'C4',
    title: { zh: '第 4 题 · 双金库均分', en: 'Choice 4 · Split the Twin Vaults' },
    subtitle: { zh: '16 分开放金库 vs 24 分限流金库，人数决定每人分红！', en: 'Open 16-pt vault vs capped 24-pt vault — headcount decides payout!' },
    aName: { zh: '16 分开放金库', en: '16-Pt Open Vault' },
    bName: { zh: '24 分限流金库', en: '24-Pt Capped Vault' },
    aRule: { zh: '选 A 的所有人平分 16 分池（向下取整，保底至少 +1 分）。', en: 'A voters evenly split 16 pts (floor, min +1 pt).' },
    bRule: { zh: '若选 B 不超过半数：平分 24 分池；若超过半数则金库锁死 0 分！', en: 'If count(B) <= N/2: split 24 pts evenly; if >50%, vault locks for 0 pts!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      const shareA = aIds.length > 0 ? Math.max(1, Math.floor(16 / aIds.length)) : 0;
      const bOpen = bIds.length > 0 && bIds.length <= Math.floor(n / 2);
      const shareB = bOpen ? Math.max(1, Math.floor(24 / bIds.length)) : 0;
      aIds.forEach((id) => (deltas[id] = shareA));
      bIds.forEach((id) => (deltas[id] = shareB));
      return {
        deltas,
        prizeGained: 0,
        outcome: {
          zh: `A 阵营 ${aIds.length} 人每人分得 +${shareA} 分；B 阵营 ${bIds.length} 人${bOpen ? `成功开启金库每人 +${shareB} 分！` : '超员锁死，0 分！'}`,
          en: `A (${aIds.length}) split +${shareA} pts each; B (${bIds.length}) ${bOpen ? `split +${shareB} pts each!` : 'overcrowded — 0 pts!'}`,
        },
      };
    },
  },
  {
    id: 5,
    code: 'C5',
    title: { zh: '第 5 题 · 劫富济贫 vs 守成加分', en: 'Choice 5 · Tax the Leaders vs Hold Fast' },
    subtitle: { zh: '中盘政治风暴：拉下领跑集团，还是自己收割分数？', en: 'Mid-game political storm: Topple the leaders or pocket points?' },
    aName: { zh: '劫富济贫', en: 'Redistribute' },
    bName: { zh: '守成收割', en: 'Pocket +2' },
    aRule: { zh: '若选 A 超过半数：当前总分前 3 名各扣 -2 分，后 3 名各加 +2 分！', en: 'If A wins majority: Current Top 3 lose -2 pts and Bottom 3 gain +2 pts!' },
    bRule: { zh: '若选 A 未过半：所有选 B 玩家各获 +2 胜点，排名结构不变！', en: 'If A fails majority: All B voters earn +2 pts and standings hold!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      if (aIds.length > n / 2) {
        const sorted = [...state.seats].sort((x, y) => (state.scores[y.seatId] || 0) - (state.scores[x.seatId] || 0));
        const k = Math.min(3, Math.floor(n / 2));
        sorted.slice(0, k).forEach((s) => (deltas[s.seatId] -= 2));
        sorted.slice(-k).forEach((s) => (deltas[s.seatId] += 2));
        return {
          deltas,
          prizeGained: 0,
          outcome: { zh: `劫富济贫生效！前 ${k} 名各 -2 分，后 ${k} 名各 +2 分，格局剧变！`, en: `Redistribution triggered! Top ${k} lose -2 pts; Bottom ${k} gain +2 pts!` },
        };
      }
      bIds.forEach((id) => (deltas[id] = 2));
      return {
        deltas,
        prizeGained: 0,
        outcome: { zh: `劫富济贫未过半 (${aIds.length}/${n})，${bIds.length} 名守成派各拿 +2 分！`, en: `Redistribution blocked (${aIds.length}/${n}) — ${bIds.length} on B bank +2 pts!` },
      };
    },
  },
  {
    id: 6,
    code: 'C6',
    title: { zh: '第 6 题 · 二次公共考验：奖金徽章 #2', en: 'Choice 6 · Second Trial: Prize Token #2' },
    subtitle: { zh: '更高门槛的信任投票：60% 达标可反罚背叛者，失守则背叛者大赚 +5！', en: 'Higher trust bar (60%): Succeed to punish defectors (-1), or let them steal +5!' },
    aName: { zh: '守护徽章', en: 'Defend Prize' },
    bName: { zh: '伺机背叛', en: 'Betray (+5)' },
    aRule: { zh: '若 ≥60% 选 A：解锁 +1 奖金徽章 (+1亿)，选 A +1 分，选 B 背叛者扣 -1 分！', en: 'If >=60% choose A: +1 Prize Token (+100M KRW), A +1 pt, B traitors -1 pt!' },
    bRule: { zh: '若选 A 不足 60%：选 B 者每人豪夺 +5 胜点，选 A 者 0 分！', en: 'If A < 60%: Defectors on B steal +5 pts each; A gets 0!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const req = Math.ceil(n * 0.6);
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      if (aIds.length >= req) {
        aIds.forEach((id) => (deltas[id] = 1));
        bIds.forEach((id) => (deltas[id] = -1));
        return {
          deltas,
          prizeGained: 1,
          outcome: { zh: `信任胜利 (${aIds.length}/${n} ≥ ${req})！奖金徽章 +1，守护者 +1，背叛者 -1！`, en: `Trust prevailed (${aIds.length}/${n} ≥ ${req})! +1 Prize Token, A +1, B -1!` },
        };
      }
      bIds.forEach((id) => (deltas[id] = 5));
      return {
        deltas,
        prizeGained: 0,
        outcome: { zh: `信任瓦解 (仅 ${aIds.length}/${n}，需 ${req})！背叛者豪取 +5 分！`, en: `Trust shattered (${aIds.length}/${n}, needed ${req})! B traitors claim +5 pts!` },
      };
    },
  },
  {
    id: 7,
    code: 'C7',
    title: { zh: '第 7 题 · 多数碾压 vs 孤狼奇袭', en: 'Choice 7 · Majority Crush vs Lone Wolf' },
    subtitle: { zh: '仅有 1–2 位孤狼潜入 B 时可反杀全场独吞 +6 分！', en: 'If strictly 1–2 Lone Wolves sneak into B, they hijack +6 pts and zero out A!' },
    aName: { zh: '大部队联盟', en: 'Majority Pack' },
    bName: { zh: '孤狼奇袭', en: 'Lone Wolf' },
    aRule: { zh: '若选 B 为 0 人或 ≥3 人：选 A 每人稳定拿 +3 分，选 B 0 分！', en: 'If count(B) is 0 or >=3: All A voters earn +3 pts; B gets 0!' },
    bRule: { zh: '若全场恰好只有 1–2 人选 B：孤狼每人狂揽 +6 分，大部队 A 全员 0 分！', en: 'If strictly 1 or 2 pick B: Lone Wolves steal +6 pts each and A gets 0!' },
    resolve(votes, state) {
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      if (bIds.length === 1 || bIds.length === 2) {
        bIds.forEach((id) => (deltas[id] = 6));
        return {
          deltas,
          prizeGained: 0,
          outcome: { zh: `孤狼奇袭成功！仅 ${bIds.length} 人选 B 狂揽 +6 分，A 阵营颗粒无收！`, en: `Lone Wolf ambush! ${bIds.length} on B hijack +6 pts each; A gets 0!` },
        };
      }
      aIds.forEach((id) => (deltas[id] = 3));
      return {
        deltas,
        prizeGained: 0,
        outcome: { zh: `大部队镇压成功 (${bIds.length} 人选 B)！A 阵营每人 +3 分！`, en: `Pack holds (${bIds.length} on B)! A voters score +3 pts each!` },
      };
    },
  },
  {
    id: 8,
    code: 'C8',
    title: { zh: '第 8 题 · 优先权与奇偶赌局', en: 'Choice 8 · Priority Boost vs Parity Gamble' },
    subtitle: { zh: '提升平分优先权顺位，还是赌选 B 人数为奇数？', en: 'Improve your tie-breaker Priority Rank, or bet on an ODD headcount in B?' },
    aName: { zh: '稳取优先权', en: 'Priority +1' },
    bName: { zh: '奇数暴击', en: 'Odd Parity (+4)' },
    aRule: { zh: '选 A 获 +1 分，且个人优先权顺位向前跃升（平分与选砖时占优）！', en: 'A earns +1 pt and boosts your Priority Rank toward #1!' },
    bRule: { zh: '若选 B 总人数为奇数：选 B 每人 +4 分；若为偶数：每人 -1 分！', en: 'If count(B) is ODD: +4 pts each; if EVEN: -1 pt!' },
    resolve(votes, state) {
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      aIds.forEach((id) => {
        deltas[id] = 1;
        state.priorityRank[id] = Math.max(1, (state.priorityRank[id] || 1) - 1);
      });
      const isOdd = bIds.length % 2 === 1;
      bIds.forEach((id) => (deltas[id] = isOdd ? 4 : -1));
      return {
        deltas,
        prizeGained: 0,
        outcome: {
          zh: `选 B 共 ${bIds.length} 人（${isOdd ? '奇数！+4 分' : '偶数！-1 分'}）；A 阵营 +1 分并提升优先权！`,
          en: `B drew ${bIds.length} (${isOdd ? 'ODD! +4 pts' : 'EVEN! -1 pt'}); A gained +1 pt & Priority boost!`,
        },
      };
    },
  },
  {
    id: 9,
    code: 'C9',
    title: { zh: '第 9 题 · 铺草坪前哨战', en: 'Choice 9 · Lay-the-Grass Vanguard' },
    subtitle: { zh: '下一场是《铺草坪》（低分先选砖！）——现在拿分，还是控低分抢先手？', en: 'Next up is Lay the Grass (lowest score drafts first!) — bank +2 now or stay low?' },
    aName: { zh: '立即收分 (+2)', en: 'Bank +2 Now' },
    bName: { zh: '控分伏击', en: 'Stay Low + Ambush' },
    aRule: { zh: '立即获得 +2 胜点（但总分升高会导致铺草坪较晚选砖）。', en: 'Immediate +2 pts (higher score means drafting later in Lay the Grass).' },
    bRule: { zh: '若 B 是少数派，反获 +3 分；否则本轮 0 分但保持低分顺位抢先选草坪砖！', en: 'If B is strict minority: +3 pts! Otherwise 0 pts now for earlier Lay the Grass draft!' },
    resolve(votes, state) {
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      aIds.forEach((id) => (deltas[id] = 2));
      const bMinor = bIds.length > 0 && bIds.length < aIds.length;
      if (bMinor) bIds.forEach((id) => (deltas[id] = 3));
      return {
        deltas,
        prizeGained: 0,
        outcome: {
          zh: `A 阵营拿 +2 分；B 阵营 ${bMinor ? '作为少数派额外伏击 +3 分！' : '保持 0 分控位，准备在铺草坪抢先选砖！'}`,
          en: `A banked +2 pts; B ${bMinor ? 'ambushed as minority for +3 pts!' : 'held at 0 pts for earlier Lay the Grass draft order!'}`,
        },
      };
    },
  },
  {
    id: 10,
    code: 'C10',
    title: { zh: '第 10 题 · 最终审判：奖金池 vs 生死逆转', en: 'Choice 10 · Final Judgment' },
    subtitle: { zh: '最后一票定生死：过半选 A 锁下第 3 枚奖金徽章，否则 B 阵营 +6 绝杀翻盘！', en: 'Final vote: Majority A unlocks Prize Token #3, or B surges +6 pts to flip the elimination line!' },
    aName: { zh: '终局共识', en: 'Final Pact' },
    bName: { zh: '绝地翻盘', en: 'Last-Gasp Coup' },
    aRule: { zh: '若过半数 (>50%) 选 A：解锁第 3 枚奖金徽章 (+1亿)，A +3 分，B +1 分！', en: 'If >50% choose A: Unlock Prize Token #3 (+100M KRW), A +3 pts, B +1 pt!' },
    bRule: { zh: '若选 A 未过半：选 B 每人暴涨 +6 分极限逆转，选 A 每人 -1 分！', en: 'If A fails majority: B surges +6 pts each while A drops -1 pt!' },
    resolve(votes, state) {
      const n = state.seats.length;
      const aIds = state.seats.filter((s) => votes[s.seatId] === 'A').map((s) => s.seatId);
      const bIds = state.seats.filter((s) => votes[s.seatId] === 'B').map((s) => s.seatId);
      const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
      if (aIds.length > n / 2) {
        aIds.forEach((id) => (deltas[id] = 3));
        bIds.forEach((id) => (deltas[id] = 1));
        return {
          deltas,
          prizeGained: 1,
          outcome: { zh: `终局共识达成 (${aIds.length}/${n})！解锁奖金徽章 +1，A +3 / B +1！`, en: `Final Pact passed (${aIds.length}/${n})! +1 Prize Token, A +3 / B +1!` },
        };
      }
      bIds.forEach((id) => (deltas[id] = 6));
      aIds.forEach((id) => (deltas[id] = -1));
      return {
        deltas,
        prizeGained: 0,
        outcome: { zh: `绝地翻盘爆发！${bIds.length} 名 B 阵营狂飙 +6 分改写淘汰线，A 阵营 -1 分！`, en: `Last-Gasp Coup! ${bIds.length} on B surged +6 pts to rewrite the standings; A -1 pt!` },
      };
    },
  },
];

// ===========================================================================
// Stage Schedules (Full: 10 Choices + 4 Mini-Games | Express: 6 Choices + 2 Mini-Games)
// ===========================================================================
const FULL_SCHEDULE = [
  { kind: 'choice', dilemmaId: 1, pip: 'C1' },
  { kind: 'choice', dilemmaId: 2, pip: 'C2' },
  { kind: 'mini', miniType: 'cubes', pip: 'M1' },
  { kind: 'choice', dilemmaId: 3, pip: 'C3' },
  { kind: 'choice', dilemmaId: 4, pip: 'C4' },
  { kind: 'mini', miniType: 'rectangles', pip: 'M2' },
  { kind: 'choice', dilemmaId: 5, pip: 'C5' },
  { kind: 'choice', dilemmaId: 6, pip: 'C6' },
  { kind: 'mini', miniType: 'poker', pip: 'M3' },
  { kind: 'choice', dilemmaId: 7, pip: 'C7' },
  { kind: 'choice', dilemmaId: 8, pip: 'C8' },
  { kind: 'choice', dilemmaId: 9, pip: 'C9' },
  { kind: 'mini', miniType: 'grass', pip: 'M4' },
  { kind: 'choice', dilemmaId: 10, pip: 'C10' },
];

const EXPRESS_SCHEDULE = [
  { kind: 'choice', dilemmaId: 1, pip: 'C1' },
  { kind: 'choice', dilemmaId: 2, pip: 'C2' },
  { kind: 'mini', miniType: 'cubes', pip: 'M1' },
  { kind: 'choice', dilemmaId: 5, pip: 'C5' },
  { kind: 'choice', dilemmaId: 6, pip: 'C6' },
  { kind: 'mini', miniType: 'poker', pip: 'M3' },
  { kind: 'choice', dilemmaId: 9, pip: 'C9' },
  { kind: 'mini', miniType: 'grass', pip: 'M4' },
  { kind: 'choice', dilemmaId: 10, pip: 'C10' },
];

// ===========================================================================
// Compact Embedded Mini-Game Generators & Evaluators
// ===========================================================================
function genMiniCubes(rng) {
  const G = 4;
  const heights = Array.from({ length: G }, (_, x) =>
    Array.from({ length: G }, (_, y) => {
      const base = Math.max(0, 4 - Math.floor((x + y) / 2));
      return Math.max(0, Math.min(4, base - Math.floor(rng() * 2)));
    })
  );
  heights[0][0] = 4;
  heights[1][0] = Math.max(2, heights[1][0]);
  heights[0][1] = Math.max(2, heights[0][1]);
  // Guarantee unambiguous visibility
  for (let x = 0; x < G; x++) {
    for (let y = 0; y < G; y++) {
      const h = heights[x][y];
      if (!h) continue;
      for (let k = 1; x + k < G && y + k < G; k++) {
        if (heights[x + k][y + k] >= h + k) heights[x + k][y + k] = h + k - 1;
      }
    }
  }
  const total = heights.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  return { gridSize: G, heights, total };
}

function genMiniRects(rng) {
  const N = 5;
  const target = 10;
  for (let tries = 0; tries < 60; tries++) {
    const grid = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => 1 + Math.floor(rng() * 6))
    );
    const ps = Array.from({ length: N + 1 }, () => Array(N + 1).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        ps[r + 1][c + 1] = grid[r][c] + ps[r][c + 1] + ps[r + 1][c] - ps[r][c];
      }
    }
    let count = 0;
    for (let r1 = 0; r1 < N; r1++) {
      for (let c1 = 0; c1 < N; c1++) {
        for (let r2 = r1; r2 < N; r2++) {
          for (let c2 = c1; c2 < N; c2++) {
            if (ps[r2 + 1][c2 + 1] - ps[r1][c2 + 1] - ps[r2 + 1][c1] + ps[r1][c1] === target) count += 1;
          }
        }
      }
    }
    if (count >= 7 && count <= 18) return { size: N, target, grid, total: count };
  }
  return { size: 5, target: 10, grid: Array.from({ length: 5 }, () => [2, 3, 2, 3, 5]), total: 10 };
}

function evalMiniPoker(cards5, includeFlushes = false) {
  const norm = cards5.map((c) => (typeof c === 'number' ? { rank: c, suit: 'S' } : { rank: Number(c.rank), suit: c.suit }));
  const sorted = norm.map((c) => c.rank).sort((a, b) => b - a);
  const cnt = new Map();
  for (const r of sorted) cnt.set(r, (cnt.get(r) || 0) + 1);
  const g = [...cnt.entries()].sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]));
  const isFlush = includeFlushes && norm.every((c) => c.suit === norm[0].suit);
  let straightHigh = 0;
  if (g.length === 5) {
    if (sorted[0] - sorted[4] === 4) straightHigh = sorted[0];
    else if (sorted[0] === 14 && sorted[1] === 5 && sorted[4] === 2) straightHigh = 5;
  }
  const names = {
    8: { zh: '同花顺', en: 'Straight Flush' },
    7: { zh: '四条', en: 'Four of a Kind' },
    6: { zh: '葫芦', en: 'Full House' },
    5: { zh: '同花', en: 'Flush' },
    4: { zh: '顺子', en: 'Straight' },
    3: { zh: '三条', en: 'Three of a Kind' },
    2: { zh: '两对', en: 'Two Pair' },
    1: { zh: '一对', en: 'One Pair' },
    0: { zh: '高牌', en: 'High Card' },
  };
  let cat = 0;
  let tb = sorted;
  if (isFlush && straightHigh) { cat = 8; tb = [straightHigh]; }
  else if (g[0][1] === 4) { cat = 7; tb = [g[0][0], g[1][0]]; }
  else if (g[0][1] === 3 && g[1][1] === 2) { cat = 6; tb = [g[0][0], g[1][0]]; }
  else if (isFlush) { cat = 5; tb = sorted; }
  else if (straightHigh) { cat = 4; tb = [straightHigh]; }
  else if (g[0][1] === 3) { cat = 3; tb = [g[0][0], g[1][0], g[2][0]]; }
  else if (g[0][1] === 2 && g[1][1] === 2) { cat = 2; tb = [g[0][0], g[1][0], g[2][0]]; }
  else if (g[0][1] === 2) { cat = 1; tb = [g[0][0], g[1][0], g[2][0], g[3][0]]; }
  const name = cat === 8 && straightHigh === 14 ? { zh: '皇家同花顺', en: 'Royal Flush' } : names[cat];
  return { category: cat, tiebreak: tb, name };
}

function cmpPoker(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const d = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function rotateGrassCells(tileId, rot = 0) {
  let pts = (GRASS_TILES[tileId] || []).map(([r, c]) => [r, c]);
  const turns = ((rot % 4) + 4) % 4;
  for (let t = 0; t < turns; t++) pts = pts.map(([r, c]) => [c, -r]);
  const minR = Math.min(...pts.map(([r]) => r));
  const minC = Math.min(...pts.map(([, c]) => c));
  return pts.map(([r, c]) => [r - minR, c - minC]);
}

export function canPlaceGrass(board, tileId, r0, c0, rot) {
  for (const [dr, dc] of rotateGrassCells(tileId, rot)) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r < 0 || r >= GRASS_ROWS || c < 0 || c >= GRASS_COLS || board[r][c] !== null) return false;
  }
  return true;
}

function findValidGrass(board, tileId) {
  const res = [];
  for (let rot = 0; rot < 4; rot++) {
    const cells = rotateGrassCells(tileId, rot);
    const maxR = Math.max(...cells.map(([r]) => r));
    const maxC = Math.max(...cells.map(([, c]) => c));
    for (let r = 0; r <= GRASS_ROWS - 1 - maxR; r++) {
      for (let c = 0; c <= GRASS_COLS - 1 - maxC; c++) {
        if (cells.every(([dr, dc]) => board[r + dr][c + dc] === null)) res.push({ r, c, rot });
      }
    }
  }
  return res;
}

// ===========================================================================
// Zone Partitioning (Living Quarters / Prison Quarters / Elimination Zone)
// ===========================================================================
export function computeZones(state) {
  const ranked = [...state.seats].sort((a, b) => {
    const ds = (state.scores[b.seatId] || 0) - (state.scores[a.seatId] || 0);
    if (ds !== 0) return ds;
    return state.priorityRank[a.seatId] - state.priorityRank[b.seatId];
  });
  const n = ranked.length;
  const elimCount = n >= 8 ? 2 : 1;
  const livingCount = Math.max(1, Math.round(n * 0.375));
  const zones = {};
  ranked.forEach((s, idx) => {
    if (idx < livingCount) zones[s.seatId] = 'living';
    else if (idx >= n - elimCount) zones[s.seatId] = 'eliminated';
    else zones[s.seatId] = 'prison';
  });
  if (state.rescuedSeatId && zones[state.rescuedSeatId] === 'prison') {
    zones[state.rescuedSeatId] = 'living';
  }
  return { ranked, zones, livingCount, elimCount };
}

// ===========================================================================
// Stage Initialization & Transitions
// ===========================================================================
function startStage(state, stageIdx, now, rng) {
  if (stageIdx >= state.schedule.length) {
    // Enter Alliance Token Rescue phase if there's at least 1 Prison player
    const { ranked, zones } = computeZones(state);
    const prisonIds = ranked.filter((s) => zones[s.seatId] === 'prison').map((s) => s.seatId);
    state.stageIndex = stageIdx;
    state.mini = null;
    if (prisonIds.length > 0) {
      state.phase = 'alliance_rescue';
      state.championSeatId = ranked[0].seatId;
      state.currentTurnSeatId = ranked[0].seatId;
      state.pendingSeatIds = [ranked[0].seatId];
    } else {
      state.phase = 'finished';
      state.currentTurnSeatId = null;
      state.pendingSeatIds = [];
    }
    return;
  }

  state.stageIndex = stageIdx;
  const item = state.schedule[stageIdx];
  state.currentTurnSeatId = null;

  if (item.kind === 'choice') {
    state.phase = 'vote';
    state.votes = {};
    state.lastReveal = null;
    state.mini = null;
    state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
    return;
  }

  // Embedded Mini-Game Initialization
  state.phase = 'mini';
  state.votes = {};
  state.lastReveal = null;

  if (item.miniType === 'cubes' || item.miniType === 'rectangles') {
    const puzzle = item.miniType === 'cubes' ? genMiniCubes(rng) : genMiniRects(rng);
    const limitMs = state.options.fastTimers ? 45000 : 75000;
    const players = {};
    const botSchedule = {};
    for (const s of state.seats) {
      players[s.seatId] = { solvedAt: null, solveTimeMs: null, lockedUntil: 0, wrongs: 0 };
      if (s.isBot) {
        const delay = Math.min(limitMs - 5000, Math.round((8000 + rng() * 24000) * (state.options.fastTimers ? 0.65 : 1)));
        const miss = rng() < 0.3;
        botSchedule[s.seatId] = {
          attempts: miss
            ? [{ at: now + delay, guess: puzzle.total + 2 }, { at: now + delay + 23000, guess: puzzle.total }]
            : [{ at: now + delay, guess: puzzle.total }],
          cursor: 0,
        };
      }
    }
    state.mini = {
      type: item.miniType,
      subPhase: 'playing',
      startedAt: now,
      limitMs,
      puzzle,
      players,
      solveOrder: [],
      botSchedule,
      deltas: {},
    };
    state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
  } else if (item.miniType === 'poker') {
    const deck = [];
    for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const community = deck.slice(0, 3);
    const grid = deck.slice(3, 19);
    const botMemory = {};
    for (const s of state.seats) {
      if (!s.isBot) continue;
      const mem = {};
      for (let i = 0; i < 16; i++) if (rng() < 0.78) mem[i] = { ...grid[i] };
      botMemory[s.seatId] = mem;
    }
    state.mini = {
      type: 'poker',
      subPhase: 'memorize',
      startedAt: now,
      memoryMs: state.options.fastTimers ? 10000 : 16000,
      community,
      grid,
      readyMem: {},
      picks: {},
      botMemory,
      results: null,
      deltas: {},
    };
    state.pendingSeatIds = state.seats.filter((s) => !s.isBot).map((s) => s.seatId);
  } else if (item.miniType === 'grass') {
    const board = Array.from({ length: GRASS_ROWS }, () => Array(GRASS_COLS).fill(null));
    for (const [r, c] of GRASS_OBSTACLES) board[r][c] = 'OBSTACLE';
    // Iconic show rule: LOWEST Either/Or score drafts FIRST!
    const draftOrder = [...state.seats]
      .sort((a, b) => {
        const ds = (state.scores[a.seatId] || 0) - (state.scores[b.seatId] || 0);
        return ds !== 0 ? ds : state.priorityRank[a.seatId] - state.priorityRank[b.seatId];
      })
      .map((s) => s.seatId);
    state.mini = {
      type: 'grass',
      subPhase: 'draft',
      board,
      draftOrder,
      draftCursor: 0,
      chosenTiles: {},
      placeOrder: [],
      placeCursor: 0,
      status: {},
      deltas: Object.fromEntries(state.seats.map((s) => [s.seatId, 0])),
    };
    state.currentTurnSeatId = draftOrder[0];
    state.pendingSeatIds = [draftOrder[0]];
  }
}

function resolveCurrentChoice(state) {
  const item = state.schedule[state.stageIndex];
  const dilemma = DILEMMAS.find((d) => d.id === item.dilemmaId);
  for (const s of state.seats) {
    if (!state.votes[s.seatId]) state.votes[s.seatId] = 'A';
  }
  const { deltas, prizeGained, outcome } = dilemma.resolve(state.votes, state);
  for (const s of state.seats) {
    state.scores[s.seatId] = (state.scores[s.seatId] || 0) + (deltas[s.seatId] || 0);
  }
  state.prizeTokens += prizeGained;
  state.lastReveal = {
    dilemmaId: dilemma.id,
    votes: { ...state.votes },
    deltas,
    prizeGained,
    outcome,
  };
  state.phase = 'reveal';
  state.pendingSeatIds = [];
}

function finalizeSpeedMini(state) {
  const m = state.mini;
  const n = state.seats.length;
  const deltas = Object.fromEntries(state.seats.map((s) => [s.seatId, 0]));
  m.solveOrder.forEach((sid, idx) => {
    const pct = (idx + 1) / n;
    const pts = idx === 0 || pct <= 0.25 ? 4 : pct <= 0.5 ? 3 : pct <= 0.75 ? 2 : 1;
    deltas[sid] = pts;
    state.scores[sid] = (state.scores[sid] || 0) + pts;
  });
  m.deltas = deltas;
  m.subPhase = 'done';
  state.pendingSeatIds = [];
}

function finalizePokerMini(state) {
  const m = state.mini;
  for (const s of state.seats) {
    if (!m.picks[s.seatId]) m.picks[s.seatId] = [0, 1];
  }
  const entries = state.seats.map((s) => {
    const pair = m.picks[s.seatId];
    const pickedCards = [m.grid[pair[0]], m.grid[pair[1]]];
    const ev = evalMiniPoker([...m.community, ...pickedCards]);
    return { seatId: s.seatId, pair, pickedCards, eval: ev, rank: 1, pts: 1 };
  });
  entries.sort((a, b) => cmpPoker(b.eval, a.eval));
  entries.forEach((e, i) => {
    if (i > 0 && cmpPoker(e.eval, entries[i - 1].eval) === 0) e.rank = entries[i - 1].rank;
    else e.rank = i + 1;
    const pct = e.rank / entries.length;
    e.pts = e.rank === 1 || pct <= 0.25 ? 5 : pct <= 0.55 ? 3 : 1;
    m.deltas[e.seatId] = e.pts;
    state.scores[e.seatId] = (state.scores[e.seatId] || 0) + e.pts;
  });
  m.results = entries;
  m.subPhase = 'done';
  state.pendingSeatIds = [];
}

export const GameRules = {
  createInitialState(seats, ctx) {
    const opts = ctx.options || {};
    const schedule = opts.mode === 'express' ? EXPRESS_SCHEDULE : FULL_SCHEDULE;
    const shuffled = [...seats];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(ctx.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const priorityRank = {};
    shuffled.forEach((s, idx) => (priorityRank[s.seatId] = idx + 1));
    const colorMap = {};
    seats.forEach((s, idx) => (colorMap[s.seatId] = GRASS_COLORS[idx % GRASS_COLORS.length]));

    const state = {
      seats: seats.map((s) => ({ seatId: s.seatId, name: s.name, avatar: s.avatar, isBot: s.isBot })),
      options: { mode: opts.mode || 'full', fastTimers: Boolean(opts.fastTimers) },
      schedule,
      stageIndex: 0,
      phase: 'vote', // 'vote' | 'reveal' | 'mini' | 'alliance_rescue' | 'finished'
      scores: Object.fromEntries(seats.map((s) => [s.seatId, 0])),
      priorityRank,
      colorMap,
      prizeTokens: 0,
      votes: {},
      lastReveal: null,
      mini: null,
      championSeatId: null,
      rescuedSeatId: null,
      currentTurnSeatId: null,
      pendingSeatIds: [],
    };
    startStage(state, 0, Date.now(), ctx.rng);
    return state;
  },

  validateAction(fullState, seatId, action) {
    if (!action || !action.type) return { ok: false, reason: 'Invalid action' };
    if (fullState.phase === 'finished') return { ok: false, reason: 'Match ended' };

    if (action.type === 'CAST_VOTE') {
      if (fullState.phase !== 'vote') return { ok: false, reason: 'Not in voting phase' };
      if (fullState.votes[seatId]) return { ok: false, reason: 'Vote already locked' };
      if (!['A', 'B'].includes(action.payload?.choice)) return { ok: false, reason: 'Choose A or B' };
      return { ok: true };
    }

    if (action.type === 'NEXT_STAGE') {
      if (fullState.phase === 'reveal') return { ok: true };
      if (fullState.phase === 'mini' && fullState.mini?.subPhase === 'done') return { ok: true };
      return { ok: false, reason: 'Current stage is still active' };
    }

    if (action.type === 'MINI_GUESS') {
      const m = fullState.mini;
      if (fullState.phase !== 'mini' || !m || !['cubes', 'rectangles'].includes(m.type) || m.subPhase !== 'playing') {
        return { ok: false, reason: 'Not in speed mini-game' };
      }
      const p = m.players[seatId];
      if (!p || p.solvedAt) return { ok: false, reason: 'Already solved' };
      if (p.lockedUntil && Date.now() < p.lockedUntil - 150) return { ok: false, reason: 'Terminal locked (20s penalty)' };
      const g = Number(action.payload?.guess);
      if (!Number.isInteger(g) || g < 0 || g > 500) return { ok: false, reason: 'Invalid integer' };
      return { ok: true };
    }

    if (action.type === 'MINI_GIVEUP' || action.type === 'MINI_BOT_TICK') {
      if (fullState.phase !== 'mini' || !fullState.mini || fullState.mini.subPhase !== 'playing') {
        return { ok: false, reason: 'Mini-game not running' };
      }
      return { ok: true };
    }

    if (action.type === 'MINI_POKER_READY') {
      if (fullState.phase !== 'mini' || fullState.mini?.type !== 'poker' || fullState.mini.subPhase !== 'memorize') {
        return { ok: false, reason: 'Not memorizing' };
      }
      return { ok: true };
    }

    if (action.type === 'MINI_POKER_PICK') {
      const m = fullState.mini;
      if (fullState.phase !== 'mini' || m?.type !== 'poker' || m.subPhase !== 'select') return { ok: false, reason: 'Not picking' };
      if (m.picks[seatId]) return { ok: false, reason: 'Already picked' };
      const pair = action.payload?.pair;
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) return { ok: false, reason: 'Pick 2 distinct cards' };
      return { ok: true };
    }

    if (action.type === 'MINI_GRASS_DRAFT') {
      const m = fullState.mini;
      if (fullState.phase !== 'mini' || m?.type !== 'grass' || m.subPhase !== 'draft') return { ok: false, reason: 'Not drafting' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn' };
      if (!GRASS_TILES[Number(action.payload?.tileId)]) return { ok: false, reason: 'Invalid tile' };
      return { ok: true };
    }

    if (action.type === 'MINI_GRASS_PLACE') {
      const m = fullState.mini;
      if (fullState.phase !== 'mini' || m?.type !== 'grass' || m.subPhase !== 'place') return { ok: false, reason: 'Not placing' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn' };
      const tid = m.chosenTiles[seatId];
      if (!canPlaceGrass(m.board, tid, Number(action.payload?.r), Number(action.payload?.c), Number(action.payload?.rot) || 0)) {
        return { ok: false, reason: 'Invalid turf placement' };
      }
      return { ok: true };
    }

    if (action.type === 'MINI_GRASS_FORFEIT') {
      const m = fullState.mini;
      if (fullState.phase !== 'mini' || m?.type !== 'grass' || m.subPhase !== 'place') return { ok: false, reason: 'Not placing' };
      if (fullState.currentTurnSeatId !== seatId) return { ok: false, reason: 'Not your turn' };
      if (findValidGrass(m.board, m.chosenTiles[seatId]).length > 0) return { ok: false, reason: 'Valid placement exists' };
      return { ok: true };
    }

    if (action.type === 'RESCUE_PRISONER') {
      if (fullState.phase !== 'alliance_rescue') return { ok: false, reason: 'Not in rescue ceremony' };
      if (fullState.championSeatId !== seatId) return { ok: false, reason: 'Only the #1 Champion holds the Alliance Token' };
      const { zones } = computeZones(fullState);
      if (zones[action.payload?.targetSeatId] !== 'prison') return { ok: false, reason: 'Must rescue a Prison Quarters player' };
      return { ok: true };
    }

    return { ok: false, reason: `Unknown action: ${action.type}` };
  },

  applyAction(fullState, seatId, action, ctx) {
    const state = clone(fullState);
    const now = ctx.now || Date.now();
    const events = [];

    if (action.type === 'CAST_VOTE') {
      state.votes[seatId] = action.payload.choice;
      state.pendingSeatIds = state.seats.filter((s) => !s.isBot && !state.votes[s.seatId]).map((s) => s.seatId);
      events.push({ type: 'VOTE_LOCKED', seatId });
      if (state.seats.every((s) => Boolean(state.votes[s.seatId]))) {
        resolveCurrentChoice(state);
        events.push({ type: 'CHOICE_REVEAL', stage: state.stageIndex });
      }
      return { state, events };
    }

    if (action.type === 'NEXT_STAGE') {
      startStage(state, state.stageIndex + 1, now, ctx.rng);
      events.push({ type: 'STAGE_CHANGE', stageIndex: state.stageIndex, phase: state.phase });
      return { state, events };
    }

    if (action.type === 'MINI_GUESS') {
      const m = state.mini;
      const p = m.players[seatId];
      const guess = Number(action.payload.guess);
      if (guess === m.puzzle.total) {
        p.solvedAt = now;
        p.solveTimeMs = Math.max(100, now - m.startedAt);
        p.lockedUntil = 0;
        m.solveOrder.push(seatId);
        events.push({ type: 'MINI_SOLVED', seatId });
        const humans = state.seats.filter((s) => !s.isBot);
        if (humans.every((s) => m.players[s.seatId].solvedAt || m.players[s.seatId].gaveUp)) {
          finalizeSpeedMini(state);
          events.push({ type: 'MINI_DONE' });
        }
      } else {
        p.wrongs += 1;
        p.lockedUntil = now + 20000;
        events.push({ type: 'MINI_LOCKOUT', seatId });
      }
      return { state, events };
    }

    if (action.type === 'MINI_GIVEUP') {
      const m = state.mini;
      m.players[seatId].gaveUp = true;
      const humans = state.seats.filter((s) => !s.isBot);
      if (humans.every((s) => m.players[s.seatId].solvedAt || m.players[s.seatId].gaveUp)) {
        finalizeSpeedMini(state);
        events.push({ type: 'MINI_DONE' });
      }
      return { state, events };
    }

    if (action.type === 'MINI_BOT_TICK') {
      const m = state.mini;
      for (const s of state.seats) {
        if (!s.isBot) continue;
        const p = m.players[s.seatId];
        const sched = m.botSchedule[s.seatId];
        if (!p || !sched || p.solvedAt || sched.cursor >= sched.attempts.length) continue;
        const next = sched.attempts[sched.cursor];
        if (now >= next.at && (!p.lockedUntil || now >= p.lockedUntil)) {
          sched.cursor += 1;
          if (next.guess === m.puzzle.total) {
            p.solvedAt = now;
            p.solveTimeMs = Math.max(100, now - m.startedAt);
            m.solveOrder.push(s.seatId);
          } else {
            p.wrongs += 1;
            p.lockedUntil = now + 20000;
          }
        }
      }
      return { state, events };
    }

    if (action.type === 'MINI_POKER_READY') {
      const m = state.mini;
      m.readyMem[seatId] = true;
      if (state.seats.filter((s) => !s.isBot).every((s) => m.readyMem[s.seatId])) {
        m.subPhase = 'select';
        m.startedAt = now;
        events.push({ type: 'POKER_FLIP' });
      }
      return { state, events };
    }

    if (action.type === 'MINI_POKER_PICK') {
      const m = state.mini;
      m.picks[seatId] = action.payload.pair.map(Number).sort((a, b) => a - b);
      state.pendingSeatIds = state.seats.filter((s) => !s.isBot && !m.picks[s.seatId]).map((s) => s.seatId);
      if (state.seats.every((s) => Boolean(m.picks[s.seatId]))) {
        finalizePokerMini(state);
        events.push({ type: 'MINI_DONE' });
      }
      return { state, events };
    }

    if (action.type === 'MINI_GRASS_DRAFT') {
      const m = state.mini;
      m.chosenTiles[seatId] = Number(action.payload.tileId);
      m.draftCursor += 1;
      if (m.draftCursor >= m.draftOrder.length) {
        m.subPhase = 'place';
        m.placeOrder = [...state.seats]
          .sort((a, b) => {
            const dt = m.chosenTiles[a.seatId] - m.chosenTiles[b.seatId];
            return dt !== 0 ? dt : state.priorityRank[a.seatId] - state.priorityRank[b.seatId];
          })
          .map((s) => s.seatId);
        m.placeCursor = 0;
        state.currentTurnSeatId = m.placeOrder[0];
        events.push({ type: 'GRASS_PLACE_START' });
      } else {
        state.currentTurnSeatId = m.draftOrder[m.draftCursor];
      }
      return { state, events };
    }

    if (action.type === 'MINI_GRASS_PLACE' || action.type === 'MINI_GRASS_FORFEIT') {
      const m = state.mini;
      const tid = m.chosenTiles[seatId];
      if (action.type === 'MINI_GRASS_PLACE') {
        const cells = rotateGrassCells(tid, Number(action.payload.rot) || 0);
        for (const [dr, dc] of cells) m.board[Number(action.payload.r) + dr][Number(action.payload.c) + dc] = seatId;
        m.status[seatId] = 'placed';
        m.deltas[seatId] = tid;
        state.scores[seatId] = (state.scores[seatId] || 0) + tid;
        events.push({ type: 'GRASS_PLACED', seatId, tileId: tid });
      } else {
        m.status[seatId] = 'blocked';
        m.deltas[seatId] = 0;
        events.push({ type: 'GRASS_BLOCKED', seatId });
      }
      m.placeCursor += 1;
      if (m.placeCursor >= m.placeOrder.length) {
        m.subPhase = 'done';
        state.currentTurnSeatId = null;
        events.push({ type: 'MINI_DONE' });
      } else {
        state.currentTurnSeatId = m.placeOrder[m.placeCursor];
      }
      return { state, events };
    }

    if (action.type === 'RESCUE_PRISONER') {
      state.rescuedSeatId = action.payload.targetSeatId;
      state.phase = 'finished';
      state.currentTurnSeatId = null;
      events.push({ type: 'ALLIANCE_RESCUE', targetSeatId: state.rescuedSeatId });
      return { state, events };
    }

    return { state, events };
  },

  onPhaseTimeout(fullState, ctx) {
    const state = clone(fullState);
    const now = ctx.now || Date.now();
    if (state.phase === 'vote') {
      for (const s of state.seats) {
        if (!state.votes[s.seatId]) state.votes[s.seatId] = ctx.rng() < 0.5 ? 'A' : 'B';
      }
      resolveCurrentChoice(state);
      return { state, events: [{ type: 'CHOICE_REVEAL' }] };
    }
    if (state.phase === 'mini' && state.mini) {
      const m = state.mini;
      if ((m.type === 'cubes' || m.type === 'rectangles') && m.subPhase === 'playing') {
        finalizeSpeedMini(state);
        return { state, events: [{ type: 'MINI_DONE' }] };
      }
      if (m.type === 'poker' && m.subPhase === 'memorize') {
        m.subPhase = 'select';
        m.startedAt = now;
        return { state, events: [{ type: 'POKER_FLIP' }] };
      }
      if (m.type === 'poker' && m.subPhase === 'select') {
        finalizePokerMini(state);
        return { state, events: [{ type: 'MINI_DONE' }] };
      }
      if (m.type === 'grass' && state.currentTurnSeatId) {
        const sid = state.currentTurnSeatId;
        if (m.subPhase === 'draft') {
          return GameRules.applyAction(state, sid, { type: 'MINI_GRASS_DRAFT', payload: { tileId: 6 } }, ctx);
        }
        if (m.subPhase === 'place') {
          const valid = findValidGrass(m.board, m.chosenTiles[sid]);
          if (valid.length > 0) return GameRules.applyAction(state, sid, { type: 'MINI_GRASS_PLACE', payload: valid[0] }, ctx);
          return GameRules.applyAction(state, sid, { type: 'MINI_GRASS_FORFEIT' }, ctx);
        }
      }
    }
    if (state.phase === 'alliance_rescue') {
      const { ranked, zones } = computeZones(state);
      const firstPrison = ranked.find((s) => zones[s.seatId] === 'prison');
      if (firstPrison) {
        state.rescuedSeatId = firstPrison.seatId;
      }
      state.phase = 'finished';
      return { state, events: [{ type: 'ALLIANCE_RESCUE' }] };
    }
    return null;
  },

  getPhaseTimer(fullState) {
    const fast = fullState.options.fastTimers;
    if (fullState.phase === 'vote') {
      return { phaseKey: `eo-vote-${fullState.stageIndex}`, durationMs: fast ? 25000 : 45000 };
    }
    if (fullState.phase === 'mini' && fullState.mini) {
      const m = fullState.mini;
      if ((m.type === 'cubes' || m.type === 'rectangles') && m.subPhase === 'playing') {
        return { phaseKey: `eo-mini-${fullState.stageIndex}`, durationMs: m.limitMs };
      }
      if (m.type === 'poker' && m.subPhase === 'memorize') {
        return { phaseKey: `eo-poker-mem-${fullState.stageIndex}`, durationMs: m.memoryMs };
      }
      if (m.type === 'poker' && m.subPhase === 'select') {
        return { phaseKey: `eo-poker-sel-${fullState.stageIndex}`, durationMs: 35000 };
      }
      if (m.type === 'grass' && (m.subPhase === 'draft' || m.subPhase === 'place')) {
        return { phaseKey: `eo-grass-${m.subPhase}-${m.draftCursor}-${m.placeCursor}`, durationMs: 30000 };
      }
    }
    if (fullState.phase === 'alliance_rescue') {
      return { phaseKey: 'eo-alliance-rescue', durationMs: 40000 };
    }
    return null;
  },

  projectState(fullState, viewerSeatId) {
    const stageItem = fullState.schedule[fullState.stageIndex] || null;
    const dilemma = stageItem?.kind === 'choice' ? DILEMMAS.find((d) => d.id === stageItem.dilemmaId) : null;

    const votesView = {};
    for (const s of fullState.seats) {
      if (fullState.phase === 'reveal' || fullState.phase === 'finished' || s.seatId === viewerSeatId) {
        votesView[s.seatId] = fullState.votes[s.seatId] || null;
      } else {
        votesView[s.seatId] = fullState.votes[s.seatId] ? 'LOCKED' : null;
      }
    }

    let miniView = null;
    if (fullState.mini) {
      const m = fullState.mini;
      if (m.type === 'cubes' || m.type === 'rectangles') {
        const hideAns = m.subPhase === 'playing';
        miniView = {
          type: m.type,
          subPhase: m.subPhase,
          puzzle: { ...m.puzzle, total: hideAns ? null : m.puzzle.total },
          players: m.players,
          solveOrder: m.solveOrder,
          deltas: m.deltas,
        };
      } else if (m.type === 'poker') {
        const showGrid = m.subPhase !== 'select';
        const showComm = m.subPhase !== 'memorize';
        const picksView = {};
        for (const s of fullState.seats) {
          if (m.subPhase === 'done' || s.seatId === viewerSeatId) picksView[s.seatId] = m.picks[s.seatId] || null;
          else picksView[s.seatId] = m.picks[s.seatId] ? 'LOCKED' : null;
        }
        miniView = {
          type: 'poker',
          subPhase: m.subPhase,
          startedAt: m.startedAt,
          memoryMs: m.memoryMs,
          community: showComm ? m.community : [null, null, null],
          grid: showGrid ? m.grid : Array(16).fill(null),
          readyMem: m.readyMem,
          picks: picksView,
          results: m.subPhase === 'done' ? m.results : null,
          deltas: m.deltas,
        };
      } else if (m.type === 'grass') {
        const curTid = m.subPhase === 'place' && fullState.currentTurnSeatId ? m.chosenTiles[fullState.currentTurnSeatId] : null;
        miniView = {
          type: 'grass',
          subPhase: m.subPhase,
          board: m.board,
          draftOrder: m.draftOrder,
          draftCursor: m.draftCursor,
          chosenTiles: m.chosenTiles,
          placeOrder: m.placeOrder,
          placeCursor: m.placeCursor,
          status: m.status,
          deltas: m.deltas,
          currentCanPlace: curTid ? findValidGrass(m.board, curTid).length > 0 : true,
        };
      }
    }

    const { ranked, zones, livingCount, elimCount } = computeZones(fullState);

    return {
      schedule: fullState.schedule,
      stageIndex: fullState.stageIndex,
      phase: fullState.phase,
      seats: fullState.seats,
      scores: fullState.scores,
      priorityRank: fullState.priorityRank,
      colorMap: fullState.colorMap,
      prizeTokens: fullState.prizeTokens,
      dilemma: dilemma
        ? {
            id: dilemma.id,
            code: dilemma.code,
            title: dilemma.title,
            subtitle: dilemma.subtitle,
            aName: dilemma.aName,
            bName: dilemma.bName,
            aRule: dilemma.aRule,
            bRule: dilemma.bRule,
          }
        : null,
      votes: votesView,
      lastReveal: fullState.lastReveal,
      mini: miniView,
      championSeatId: fullState.championSeatId,
      rescuedSeatId: fullState.rescuedSeatId,
      currentTurnSeatId: fullState.currentTurnSeatId,
      pendingSeatIds: fullState.pendingSeatIds,
      rankedIds: ranked.map((s) => s.seatId),
      zones,
      livingCount,
      elimCount,
    };
  },

  computeBotAction(fullState, botSeatId, ctx) {
    if (fullState.phase === 'vote') {
      if (fullState.votes[botSeatId]) return null;
      const item = fullState.schedule[fullState.stageIndex];
      const { ranked, zones } = computeZones(fullState);
      const myZone = zones[botSeatId];
      // Strategic Dilemma AI based on current rank & dilemma dynamics
      let probA = 0.52;
      if (item.dilemmaId === 1 || item.dilemmaId === 6 || item.dilemmaId === 10) {
        // Leaders prefer A (public good / keep lead), trailing players risk B (private points!)
        probA = myZone === 'living' ? 0.68 : myZone === 'eliminated' ? 0.28 : 0.54;
      } else if (item.dilemmaId === 3) {
        probA = myZone === 'living' ? 0.72 : 0.45;
      } else if (item.dilemmaId === 5) {
        probA = myZone === 'living' ? 0.15 : 0.72;
      } else if (item.dilemmaId === 7) {
        probA = 0.76;
      } else if (item.dilemmaId === 9) {
        probA = myZone === 'eliminated' ? 0.35 : 0.58;
      }
      return { type: 'CAST_VOTE', payload: { choice: ctx.rng() < probA ? 'A' : 'B' } };
    }

    if (fullState.phase === 'mini' && fullState.mini) {
      const m = fullState.mini;
      if (m.type === 'poker' && m.subPhase === 'select' && !m.picks[botSeatId]) {
        const mem = m.botMemory[botSeatId] || {};
        const keys = Object.keys(mem).map(Number);
        let bestPair = [0, 1];
        let bestEv = null;
        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            const ev = evalMiniPoker([...m.community, mem[keys[i]], mem[keys[j]]]);
            if (!bestEv || cmpPoker(ev, bestEv) > 0) {
              bestEv = ev;
              bestPair = [Math.min(keys[i], keys[j]), Math.max(keys[i], keys[j])];
            }
          }
        }
        return { type: 'MINI_POKER_PICK', payload: { pair: bestPair } };
      }

      if (m.type === 'grass' && fullState.currentTurnSeatId === botSeatId) {
        if (m.subPhase === 'draft') {
          const claimed = Object.values(m.chosenTiles).reduce((a, b) => a + b, 0);
          const rem = m.draftOrder.length - m.draftCursor - 1;
          const pressure = (claimed + rem * 7.5) / 114;
          const choices = pressure > 0.85 ? [4, 6, 7, 9] : [6, 7, 9, 11, 13];
          const pick = choices[Math.floor(ctx.rng() * choices.length)];
          return { type: 'MINI_GRASS_DRAFT', payload: { tileId: pick } };
        }
        if (m.subPhase === 'place') {
          const valid = findValidGrass(m.board, m.chosenTiles[botSeatId]);
          if (!valid.length) return { type: 'MINI_GRASS_FORFEIT' };
          return { type: 'MINI_GRASS_PLACE', payload: valid[Math.floor(ctx.rng() * valid.length)] };
        }
      }
    }

    if (fullState.phase === 'alliance_rescue' && fullState.championSeatId === botSeatId) {
      const { ranked, zones } = computeZones(fullState);
      const prisoners = ranked.filter((s) => zones[s.seatId] === 'prison');
      if (prisoners.length > 0) {
        const pick = prisoners[Math.floor(ctx.rng() * prisoners.length)];
        return { type: 'RESCUE_PRISONER', payload: { targetSeatId: pick.seatId } };
      }
    }

    return null;
  },

  getResult(fullState) {
    if (fullState.phase !== 'finished') return null;
    const { ranked, zones } = computeZones(fullState);
    const topScore = fullState.scores[ranked[0].seatId] || 0;
    const winners = ranked.filter((s) => (fullState.scores[s.seatId] || 0) === topScore).map((s) => s.seatId);

    const zoneTag = (sid) => {
      if (sid === fullState.rescuedSeatId) return '★ RESCUED → LIVING';
      if (zones[sid] === 'living') return 'LIVING';
      if (zones[sid] === 'eliminated') return 'ELIMINATED';
      return 'PRISON';
    };

    return {
      winnerSeatIds: winners,
      rankings: ranked.map((s) => ({
        seatId: s.seatId,
        score: fullState.scores[s.seatId] || 0,
        label: `${fullState.scores[s.seatId] || 0} pts · ${zoneTag(s.seatId)}`,
      })),
      summary: {
        zh: `Day 1 主赛《二选一》落幕！全员共解锁 ${fullState.prizeTokens} 枚奖金徽章 (+${fullState.prizeTokens} 亿韩元)，联盟徽章已完成最终拯救！`,
        en: `Day 1 Main Match "Either/Or" complete! ${fullState.prizeTokens} Prize Token(s) (+${fullState.prizeTokens}00M KRW) unlocked, and the Alliance Token rescue is sealed!`,
      },
    };
  },
};
