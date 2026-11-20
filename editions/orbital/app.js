(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rot3D(x, y, z, rx, ry) {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    return { x: x1, y: y2, z: z2 };
  }

  function project(p, cx, cy, fov, dist) {
    const dz = dist - p.z;
    const scale = fov / Math.max(0.45, dz);
    return {
      sx: cx + p.x * scale,
      sy: cy + p.y * scale,
      scale,
      z: p.z,
    };
  }

  function safeRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function drawPillLabel(ctx, sx, sy, text, accent, width, height, opts = {}) {
    const fontSize = opts.fontSize || 10.5;
    const padX = opts.padX || 7;
    const boxH = opts.boxH || 20;
    ctx.save();
    ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bx = clamp(sx - bw * 0.5, 8, Math.max(8, width - bw - 8));
    const by = clamp(sy - boxH * 0.5, 8, Math.max(8, height - boxH - 8));
    safeRoundRect(ctx, bx, by, bw, boxH, 6);
    ctx.fillStyle = opts.bg || "rgba(4, 7, 18, 0.84)";
    ctx.fill();
    ctx.strokeStyle = accent || "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = opts.textColor || "#f1f5f9";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + padX, by + boxH * 0.52);
    ctx.restore();
    return { x: bx, y: by, w: bw, h: boxH };
  }

  function drawBox3D(
    ctx,
    cx,
    cy,
    fov,
    dist,
    rx,
    ry,
    x0,
    y0,
    z0,
    w,
    h,
    d,
    stroke,
    fill,
  ) {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const hd = d * 0.5;
    const verts = [
      [x0 - hw, y0 - hh, z0 - hd],
      [x0 + hw, y0 - hh, z0 - hd],
      [x0 + hw, y0 + hh, z0 - hd],
      [x0 - hw, y0 + hh, z0 - hd],
      [x0 - hw, y0 - hh, z0 + hd],
      [x0 + hw, y0 - hh, z0 + hd],
      [x0 + hw, y0 + hh, z0 + hd],
      [x0 - hw, y0 + hh, z0 + hd],
    ].map(([x, y, z]) => project(rot3D(x, y, z, rx, ry), cx, cy, fov, dist));

    const faces = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [1, 2, 6, 5],
      [0, 3, 7, 4],
    ];
    if (fill) {
      ctx.fillStyle = fill;
      faces.forEach((f) => {
        ctx.beginPath();
        ctx.moveTo(verts[f[0]].sx, verts[f[0]].sy);
        ctx.lineTo(verts[f[1]].sx, verts[f[1]].sy);
        ctx.lineTo(verts[f[2]].sx, verts[f[2]].sy);
        ctx.lineTo(verts[f[3]].sx, verts[f[3]].sy);
        ctx.closePath();
        ctx.fill();
      });
    }
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.15;
    edges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(verts[a].sx, verts[a].sy);
      ctx.lineTo(verts[b].sx, verts[b].sy);
      ctx.stroke();
    });
    return project(rot3D(x0, y0, z0, rx, ry), cx, cy, fov, dist);
  }

  function drawSimChip3D(
    ctx,
    cx,
    cy,
    fov,
    dist,
    rx,
    ry,
    x0,
    y0,
    z0,
    size,
    glowColor,
    fillColor,
  ) {
    const w = size * 0.84;
    const h = size;
    const cut = size * 0.22;
    const pts = [
      [x0 - w * 0.5, y0 - h * 0.5, z0],
      [x0 + w * 0.5 - cut, y0 - h * 0.5, z0],
      [x0 + w * 0.5, y0 - h * 0.5 + cut, z0],
      [x0 + w * 0.5, y0 + h * 0.5, z0],
      [x0 - w * 0.5, y0 + h * 0.5, z0],
    ].map(([x, y, z]) => project(rot3D(x, y, z, rx, ry), cx, cy, fov, dist));

    ctx.beginPath();
    pts.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    });
    ctx.closePath();
    ctx.fillStyle = fillColor || "rgba(15, 23, 42, 0.85)";
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 6 unmistakable metallic gold ISO-7816 SIM contact pads
    const pw = w * 0.28;
    const ph = h * 0.16;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const px0 = x0 + (col === 0 ? -w * 0.2 : w * 0.2);
        const py0 = y0 + (row - 1) * (h * 0.22) + h * 0.05;
        const pad = [
          [px0 - pw * 0.45, py0 - ph * 0.45, z0 + 0.02],
          [px0 + pw * 0.45, py0 - ph * 0.45, z0 + 0.02],
          [px0 + pw * 0.45, py0 + ph * 0.45, z0 + 0.02],
          [px0 - pw * 0.45, py0 + ph * 0.45, z0 + 0.02],
        ].map(([x, y, z]) => project(rot3D(x, y, z, rx, ry), cx, cy, fov, dist));

        ctx.beginPath();
        ctx.moveTo(pad[0].sx, pad[0].sy);
        ctx.lineTo(pad[1].sx, pad[1].sy);
        ctx.lineTo(pad[2].sx, pad[2].sy);
        ctx.lineTo(pad[3].sx, pad[3].sy);
        ctx.closePath();
        ctx.fillStyle = "rgba(251, 191, 36, 0.34)";
        ctx.fill();
        ctx.strokeStyle = "rgba(253, 230, 138, 0.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    return project(rot3D(x0, y0, z0, rx, ry), cx, cy, fov, dist);
  }

  function drawPacketArc3D(
    ctx,
    cx,
    cy,
    fov,
    dist,
    rx,
    ry,
    pA,
    pB,
    liftY,
    liftZ,
    color,
    progress,
    opts = {},
  ) {
    const steps = 20;
    const pts = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const arch = Math.sin(t * Math.PI);
      const x = lerp(pA.x, pB.x, t);
      const y = lerp(pA.y, pB.y, t) + arch * liftY;
      const z = lerp(pA.z, pB.z, t) + arch * liftZ;
      pts.push(project(rot3D(x, y, z, rx, ry), cx, cy, fov, dist));
    }
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      if (s === 0) ctx.moveTo(pts[s].sx, pts[s].sy);
      else ctx.lineTo(pts[s].sx, pts[s].sy);
    }
    ctx.strokeStyle = opts.trackColor || color;
    ctx.lineWidth = opts.lineWidth || 1.35;
    if (opts.dashed) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (progress >= 0) {
      const idx = Math.min(steps, Math.floor((progress % 1) * steps));
      const head = pts[idx];
      ctx.fillStyle = opts.dotColor || "#ffffff";
      ctx.beginPath();
      ctx.arc(head.sx, head.sy, opts.dotRadius || 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionEnabled = !reduceMotionQuery.matches;
  const engineSyncHooks = [];

  function syncAllEngines() {
    engineSyncHooks.forEach((fn) => fn());
  }

  reduceMotionQuery.addEventListener("change", () => {
    motionEnabled = !reduceMotionQuery.matches;
    syncAllEngines();
  });

  document.addEventListener("visibilitychange", syncAllEngines);

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* =========================================================
     HEADER SCROLL & NAV ACTIVE TRACKING
     ========================================================= */
  const header = $("#site-header");
  const navLinks = $$(".hud-nav a");
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function onScrollFrame() {
    scrollQueued = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 32);
    let currentId = "";
    for (let i = 0; i < navSections.length; i++) {
      const sec = navSections[i];
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.38) {
        currentId = sec.id;
      }
    }
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${currentId}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(onScrollFrame);
      }
    },
    { passive: true },
  );
  onScrollFrame();

  /* =========================================================
     PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
     ========================================================= */
  const pubFilterBtns = $$(".pub-filter-btn");
  const pubGroups = $$(".pub-group");
  const pubCountEl = $("#publication-count");

  function setPublicationFilter(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    pubFilterBtns.forEach((btn) => {
      const active = btn.dataset.filter === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    const visibleGroups = pubGroups.filter((g) => !g.hidden);
    const total = visibleGroups.reduce(
      (sum, g) => sum + g.querySelectorAll(".pub-card").length,
      0,
    );
    const years = visibleGroups.flatMap((g) =>
      [...g.querySelectorAll(".pub-year")].map((el) => Number(el.textContent)),
    );
    if (pubCountEl && years.length) {
      const label = kind === "all" ? "publications" : `${kind} publications`;
      pubCountEl.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  pubFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => setPublicationFilter(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") setPublicationFilter("conference");
    else if (location.hash === "#journal") setPublicationFilter("journal");
  }
  window.addEventListener("hashchange", syncPubAnchor);
  syncPubAnchor();

  /* =========================================================
     ENGINE 1: HERO 3D CLOUD BARE-METAL & GLOBAL FABRIC GLOBE
     ========================================================= */
  function initHeroGlobe() {
    const canvas = $("#hero-globe-canvas");
    const heroSection = $("#orbit");
    const telemetryEl = $("#hero-telemetry");
    if (!canvas || !heroSection) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = mulberry32(1107);
    let width = 0;
    let height = 0;
    let visible = true;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let telemetryTimer = 0;

    let yaw = 0.42;
    let pitch = 0.22;
    let velYaw = 0.00022;
    let velPitch = 0;
    let targetHoverYaw = 0;
    let targetHoverPitch = 0;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;

    // 220 geodesic compute mesh vertices
    const nodeCount = 220;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      nodes.push({
        x: Math.cos(theta) * rad,
        y,
        z: Math.sin(theta) * rad,
        hub: rand() > 0.87,
        phase: rand() * Math.PI * 2,
      });
    }

    // Geodesic wireframe edges
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (dx * dx + dy * dy + dz * dz < 0.1) edges.push([i, j]);
      }
    }

    // 4 Real Domain Architectural Anchors (3D Bare-Metal / Compute Clusters on Globe)
    const anchors = [
      {
        label: "BARE METAL",
        pos: { x: 0.46, y: -0.42, z: 0.78 },
        color: "#fbbf24",
        rgba: "rgba(251, 191, 36, 0.88)",
      },
      {
        label: "CLOUD FABRIC",
        pos: { x: -0.58, y: -0.18, z: 0.79 },
        color: "#38bdf8",
        rgba: "rgba(56, 189, 248, 0.88)",
      },
      {
        label: "CELLULAR / 5G",
        pos: { x: 0.72, y: 0.36, z: 0.58 },
        color: "#818cf8",
        rgba: "rgba(129, 140, 248, 0.9)",
      },
      {
        label: "SYSTEMS RESEARCH",
        pos: { x: -0.34, y: 0.62, z: 0.7 },
        color: "#5eebc7",
        rgba: "rgba(94, 235, 199, 0.88)",
      },
    ].map((a) => {
      const len = Math.hypot(a.pos.x, a.pos.y, a.pos.z) || 1;
      a.pos = {
        x: (a.pos.x / len) * 1.03,
        y: (a.pos.y / len) * 1.03,
        z: (a.pos.z / len) * 1.03,
      };
      return a;
    });

    // Deterministic packet arcs connecting the 4 domain anchors + global mesh hubs
    const arcs = [
      { a: anchors[0].pos, b: anchors[1].pos, progress: 0.1, speed: 0.28, lift: 0.34, palette: "gold" },
      { a: anchors[1].pos, b: anchors[2].pos, progress: 0.45, speed: 0.24, lift: 0.3, palette: "sky" },
      { a: anchors[0].pos, b: anchors[2].pos, progress: 0.75, speed: 0.3, lift: 0.32, palette: "gold" },
      { a: anchors[2].pos, b: anchors[3].pos, progress: 0.25, speed: 0.22, lift: 0.28, palette: "indigo" },
      { a: anchors[3].pos, b: anchors[1].pos, progress: 0.6, speed: 0.25, lift: 0.32, palette: "sky" },
      { a: anchors[0].pos, b: anchors[3].pos, progress: 0.9, speed: 0.26, lift: 0.36, palette: "gold" },
    ];
    for (let i = 0; i < 6; i++) {
      const nA = nodes[(i * 31 + 7) % nodeCount];
      const nB = nodes[(i * 53 + 19) % nodeCount];
      arcs.push({
        a: nA,
        b: nB,
        progress: rand(),
        speed: 0.18 + rand() * 0.16,
        lift: 0.24 + rand() * 0.18,
        palette: i % 2 === 0 ? "sky" : "indigo",
      });
    }

    const stars = [];
    for (let i = 0; i < 110; i++) {
      stars.push({
        x: rand(),
        y: rand(),
        r: 0.6 + rand() * 1.3,
        alpha: 0.16 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
      });
    }

    function resize() {
      width = heroSection.clientWidth;
      height = heroSection.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.65 + 0.35 * Math.sin(elapsed * 0.0018 + s.phase);
        ctx.fillStyle = `rgba(203, 213, 225, ${(s.alpha * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const isDesktop = width >= 960;
      const cx = isDesktop ? width * 0.69 : width * 0.52;
      const cy = isDesktop ? height * 0.48 : height * 0.32;
      const radius = clamp(
        Math.min(width, height) * (isDesktop ? 0.39 : 0.33),
        130,
        320,
      );
      const fov = radius * 3.1;
      const dist = 3.25;

      const halo = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.1,
        cx,
        cy,
        radius * 1.48,
      );
      halo.addColorStop(0, "rgba(56, 189, 248, 0.17)");
      halo.addColorStop(0.45, "rgba(129, 140, 248, 0.11)");
      halo.addColorStop(0.78, "rgba(251, 191, 36, 0.04)");
      halo.addColorStop(1, "rgba(4, 6, 14, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.48, 0, Math.PI * 2);
      ctx.fill();

      const rx = pitch + targetHoverPitch * 0.14;
      const ry = yaw + targetHoverYaw * 0.2;

      // Precision orbital fabric rails around globe
      ctx.save();
      ctx.lineWidth = 1;
      for (let r = 0; r < 2; r++) {
        const tilt = r === 0 ? 0.28 : -0.48;
        const rScale = r === 0 ? 1.24 : 1.38;
        ctx.beginPath();
        for (let s = 0; s <= 72; s++) {
          const ang = (s / 72) * Math.PI * 2;
          const rp = rot3D(
            Math.cos(ang) * rScale,
            Math.sin(ang) * Math.sin(tilt) * rScale,
            Math.sin(ang) * Math.cos(tilt) * rScale,
            rx,
            ry * (r === 0 ? 1 : -0.5),
          );
          const p = project(rp, cx, cy, fov, dist);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle =
          r === 0 ? "rgba(56, 189, 248, 0.18)" : "rgba(251, 191, 36, 0.14)";
        ctx.stroke();
      }
      ctx.restore();

      const projected = new Array(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        projected[i] = project(rot3D(n.x, n.y, n.z, rx, ry), cx, cy, fov, dist);
      }

      // Geodesic fabric mesh
      ctx.lineWidth = 0.7;
      for (let i = 0; i < edges.length; i++) {
        const [aIdx, bIdx] = edges[i];
        const pa = projected[aIdx];
        const pb = projected[bIdx];
        const avgZ = (pa.z + pb.z) * 0.5;
        if (avgZ < -0.3) continue;
        const alpha = clamp((avgZ + 0.4) * 0.22, 0.03, 0.28);
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Deterministic packet arcs with luminous comet heads
      const steps = 24;
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];
        const pts = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          let mx = lerp(arc.a.x, arc.b.x, t);
          let my = lerp(arc.a.y, arc.b.y, t);
          let mz = lerp(arc.a.z, arc.b.z, t);
          const len = Math.hypot(mx, my, mz) || 1;
          const elev = 1 + Math.sin(t * Math.PI) * arc.lift;
          mx = (mx / len) * elev;
          my = (my / len) * elev;
          mz = (mz / len) * elev;
          pts.push(project(rot3D(mx, my, mz, rx, ry), cx, cy, fov, dist));
        }

        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          if (s === 0) ctx.moveTo(pts[s].sx, pts[s].sy);
          else ctx.lineTo(pts[s].sx, pts[s].sy);
        }
        ctx.lineWidth = i < 6 ? 1.3 : 0.9;
        ctx.strokeStyle =
          arc.palette === "gold"
            ? "rgba(251, 191, 36, 0.24)"
            : arc.palette === "sky"
              ? "rgba(56, 189, 248, 0.22)"
              : "rgba(129, 140, 248, 0.2)";
        ctx.stroke();

        const headIdx = Math.floor(arc.progress * steps);
        const startIdx = Math.max(0, headIdx - 6);
        if (headIdx > startIdx) {
          ctx.beginPath();
          for (let s = startIdx; s <= Math.min(steps, headIdx); s++) {
            if (s === startIdx) ctx.moveTo(pts[s].sx, pts[s].sy);
            else ctx.lineTo(pts[s].sx, pts[s].sy);
          }
          ctx.lineWidth = 2.4;
          ctx.strokeStyle =
            arc.palette === "gold"
              ? "rgba(251, 191, 36, 0.95)"
              : arc.palette === "sky"
                ? "rgba(56, 189, 248, 0.95)"
                : "rgba(165, 180, 252, 0.95)";
          ctx.stroke();
        }
        const hp = pts[Math.min(steps, headIdx)];
        if (hp && hp.z > -0.6) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(hp.sx, hp.sy, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Mesh vertices
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        const p = projected[i];
        const depthNorm = clamp((p.z + 1) * 0.5, 0, 1);
        const alpha = 0.14 + depthNorm * 0.72;
        const rad = (n.hub ? 2.2 : 1.25) * (0.65 + depthNorm * 0.5);
        ctx.fillStyle = n.hub
          ? `rgba(56, 189, 248, ${alpha.toFixed(3)})`
          : `rgba(191, 219, 254, ${(alpha * 0.72).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4 Labeled 3D Bare-Metal / Compute Cluster Anchors
      for (let i = 0; i < anchors.length; i++) {
        const anc = anchors[i];
        const rp = rot3D(anc.pos.x, anc.pos.y, anc.pos.z, rx, ry);
        const p = project(rp, cx, cy, fov, dist);
        if (rp.z < -0.18) continue;

        // Miniature 3D stacked server-blade beacon at anchor point
        drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          anc.pos.x,
          anc.pos.y,
          anc.pos.z,
          0.11,
          0.07,
          0.11,
          anc.rgba,
          "rgba(11, 17, 32, 0.85)",
        );

        const pulse = 5 + Math.sin(elapsed * 0.005 + i) * 2.5;
        ctx.strokeStyle = anc.rgba;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Render clean floating 3D callout pills on desktop or front-most anchors
        if (isDesktop || rp.z > 0.32) {
          drawPillLabel(
            ctx,
            p.sx,
            p.sy - 20,
            anc.label,
            anc.rgba,
            width,
            height,
            { fontSize: 10, boxH: 19 },
          );
        }
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;

      if (!dragging) {
        yaw += velYaw * dt;
        pitch = clamp(pitch + velPitch * dt, -0.75, 0.75);
        velYaw = lerp(velYaw, 0.00022, 0.03);
        velPitch *= 0.94;
      }

      for (let i = 0; i < arcs.length; i++) {
        arcs[i].progress = (arcs[i].progress + arcs[i].speed * (dt / 1000)) % 1;
      }

      telemetryTimer += dt;
      if (telemetryEl && telemetryTimer > 140) {
        telemetryTimer = 0;
        const degYaw = (((yaw * 180) / Math.PI) % 360 + 360) % 360;
        const degPitch = (pitch * 180) / Math.PI;
        const sign = degPitch >= 0 ? "+" : "";
        telemetryEl.textContent = `YAW ${String(Math.round(degYaw)).padStart(3, "0")}° · PITCH ${sign}${Math.round(degPitch)}°`;
      }

      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging) {
        const dx = e.clientX - dragX;
        const dy = e.clientY - dragY;
        dragX = e.clientX;
        dragY = e.clientY;
        yaw += dx * 0.0065;
        pitch = clamp(pitch + dy * 0.0055, -0.85, 0.85);
        velYaw = clamp(dx * 0.00035, -0.006, 0.006);
        velPitch = clamp(dy * 0.00025, -0.004, 0.004);
        if (!motionEnabled) draw();
      } else {
        targetHoverYaw = clamp(
          ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
          -1,
          1,
        );
        targetHoverPitch = clamp(
          ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
          -1,
          1,
        );
      }
    });
    const endDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    heroSection.addEventListener("pointerleave", () => {
      targetHoverYaw = 0;
      targetHoverPitch = 0;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(heroSection);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(heroSection);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    resize();
    sync();
  }

  /* =========================================================
     ENGINE 2: BARE METAL × CME — 4 DOMAIN-CUSTOMIZED 3D SCENES
     ========================================================= */
  function initBareMetalCube() {
    const canvas = $("#baremetal-cube-canvas");
    const section = $("#work");
    const stageLabel = $("#bm-stage-label");
    const velocityBadge = $("#bm-velocity-badge");
    const modeButtons = $$("[data-bm-mode]");
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const modes = {
      host: {
        label: "3D HARDWARE · HOST & FABRIC (ZERO HYPERVISOR)",
        badge: "SILICON DIRECT · ZERO HYPERVISOR",
        gold: false,
      },
      fleet: {
        label: "3D BLADE RACK · FLEET LIFECYCLE AUTOMATION",
        badge: "PROVISION → VERIFY → LIVE → DRAIN → RECLAIM",
        gold: false,
      },
      behavior: {
        label: "3D PACKET PIPELINE · END-TO-END BEHAVIOR",
        badge: "DETERMINISTIC · FLAT-JITTER TRACE",
        gold: false,
      },
      cme: {
        label: "3D TRADING CONDUIT · GOOGLE CLOUD × CME GROUP",
        badge: "ULTRA-LOW-LATENCY · DEDICATED FABRIC",
        gold: true,
      },
    };

    const FLEET_STATES = [
      { name: "PROVISION", color: "#38bdf8", fill: "rgba(56, 189, 248, 0.16)" },
      { name: "VERIFY / FW", color: "#818cf8", fill: "rgba(129, 140, 248, 0.16)" },
      { name: "LIVE WORKLOAD", color: "#5eebc7", fill: "rgba(94, 235, 199, 0.16)" },
      { name: "DRAIN", color: "#fbbf24", fill: "rgba(251, 191, 36, 0.16)" },
      { name: "RECLAIM", color: "#c084fc", fill: "rgba(192, 132, 252, 0.16)" },
    ];

    let activeMode = "host";
    let width = 0;
    let height = 0;
    let visible = false;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;

    let yaw = 0.44;
    let pitch = 0.28;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;

    function setMode(mode) {
      activeMode = modes[mode] ? mode : "host";
      const meta = modes[activeMode];
      if (stageLabel) stageLabel.textContent = meta.label;
      if (velocityBadge) {
        velocityBadge.textContent = meta.badge;
        velocityBadge.classList.toggle("is-gold", meta.gold);
      }
      modeButtons.forEach((btn) => {
        const active = btn.dataset.bmMode === activeMode;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });
      if (!motionEnabled) draw();
    }

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.bmMode));
    });

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const t = elapsed * 0.001;
      const cx = width * 0.5;
      const cy = height * (activeMode === "behavior" ? 0.42 : 0.5);
      const minDim = Math.min(width, height);
      const fov = minDim * 1.15;
      const dist = 4.25;
      const rx = pitch;
      const ry = yaw + Math.sin(t * 0.35) * 0.12;

      if (activeMode === "host") {
        // 1. HOST & FABRIC: Exploded 3D Physical CPU Silicon + NIC directly wired to Cloud Fabric (ZERO HYPERVISOR)
        const baseC = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          -0.35,
          0.62,
          0,
          1.35,
          0.22,
          1.05,
          "rgba(56, 189, 248, 0.72)",
          "rgba(15, 28, 54, 0.55)",
        );
        // Physical CPU Silicon Die + gold socket pins
        drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          -0.5,
          0.38,
          0,
          0.56,
          0.14,
          0.56,
          "rgba(251, 191, 36, 0.92)",
          "rgba(251, 191, 36, 0.22)",
        );
        // Dedicated NIC hardware card
        const nicC = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          0.14,
          0.38,
          0.08,
          0.36,
          0.16,
          0.52,
          "rgba(129, 140, 248, 0.9)",
          "rgba(129, 140, 248, 0.22)",
        );
        // Cloud Storage & Network Fabric Plane above (direct bare-metal pass-through!)
        const fabC = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          0.22,
          -0.58,
          0,
          1.5,
          0.16,
          1.05,
          "rgba(56, 189, 248, 0.85)",
          "rgba(56, 189, 248, 0.14)",
        );

        // Direct vertical pass-through rails (bypassing any hypervisor layer!)
        const railXs = [-0.45, -0.1, 0.25, 0.55];
        railXs.forEach((rxPos, i) => {
          const pBot = { x: rxPos, y: 0.34, z: (i % 2 ? 0.18 : -0.18) };
          const pTop = { x: rxPos + 0.12, y: -0.5, z: (i % 2 ? 0.18 : -0.18) };
          drawPacketArc3D(
            ctx,
            cx,
            cy,
            fov,
            dist,
            rx,
            ry,
            pBot,
            pTop,
            0,
            0,
            i % 2 === 0 ? "rgba(251, 191, 36, 0.55)" : "rgba(56, 189, 248, 0.55)",
            (t * 0.7 + i * 0.24) % 1,
            { dotColor: i % 2 === 0 ? "#fde68a" : "#7dd3fc", dotRadius: 3.2 },
          );
        });

        const midBadge = project(rot3D(-0.15, -0.08, 0.25, rx, ry), cx, cy, fov, dist);
        drawPillLabel(ctx, midBadge.sx, midBadge.sy, "ZERO HYPERVISOR · DIRECT I/O", "rgba(251, 191, 36, 0.9)", width, height, { textColor: "#fde68a" });
        drawPillLabel(ctx, fabC.sx, fabC.sy - 26, "CLOUD FABRIC & STORAGE", "rgba(56, 189, 248, 0.8)", width, height);
        drawPillLabel(ctx, baseC.sx - 24, baseC.sy + 26, "DEDICATED PHYSICAL SILICON", "rgba(251, 191, 36, 0.75)", width, height);
        drawPillLabel(ctx, nicC.sx + 48, nicC.sy + 14, "HOST NIC", "rgba(129, 140, 248, 0.85)", width, height);
      } else if (activeMode === "fleet") {
        // 2. FLEET LIFECYCLE: 3D Isometric Rack of 5 Physical Server Blades stepping through lifecycle states
        const stepShift = Math.floor(t * 0.55);
        // Outer rack frame
        drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          -0.18,
          0,
          0,
          1.34,
          1.76,
          0.98,
          "rgba(148, 184, 255, 0.24)",
          null,
        );

        // Sweeping orbital control-plane ring around the rack
        const sweepY = Math.sin(t * 1.1) * 0.78;
        ctx.beginPath();
        for (let s = 0; s <= 56; s++) {
          const a = (s / 56) * Math.PI * 2;
          const p = project(
            rot3D(-0.18 + Math.cos(a) * 0.96, sweepY, Math.sin(a) * 0.96, rx, ry),
            cx,
            cy,
            fov,
            dist,
          );
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.stroke();

        for (let b = 0; b < 5; b++) {
          const stateIdx = (b + stepShift) % 5;
          const st = FLEET_STATES[stateIdx];
          const by = -0.66 + b * 0.33;
          const slideX = stateIdx === 3 ? 0.14 : 0; // Drain blade subtly slides out
          drawBox3D(
            ctx,
            cx,
            cy,
            fov,
            dist,
            rx,
            ry,
            -0.18 + slideX,
            by,
            0,
            1.18,
            0.2,
            0.84,
            st.color,
            st.fill,
          );
          // Status LED dot on front-left of blade
          const ledP = project(
            rot3D(-0.68 + slideX, by, 0.44, rx, ry),
            cx,
            cy,
            fov,
            dist,
          );
          ctx.fillStyle = st.color;
          ctx.beginPath();
          ctx.arc(ledP.sx, ledP.sy, 3.6, 0, Math.PI * 2);
          ctx.fill();

          const lblP = project(
            rot3D(0.55 + slideX, by, 0.2, rx, ry),
            cx,
            cy,
            fov,
            dist,
          );
          drawPillLabel(
            ctx,
            lblP.sx + 46,
            lblP.sy,
            `BLADE 0${b + 1} · ${st.name}`,
            st.color,
            width,
            height,
            { fontSize: 9.5, boxH: 18 },
          );
        }
      } else if (activeMode === "behavior") {
        // 3. END-TO-END BEHAVIOR: Host NIC -> ToR Fabric -> Control Plane -> Peer + Live Flat-Jitter Trace
        const stages = [
          { x: -1.12, y: 0.12, z: 0.1, label: "HOST NIC", col: "#38bdf8" },
          { x: -0.38, y: -0.22, z: -0.1, label: "TOR FABRIC", col: "#818cf8" },
          { x: 0.38, y: -0.22, z: 0.12, label: "CONTROL PLANE", col: "#fbbf24" },
          { x: 1.12, y: 0.12, z: -0.08, label: "PEER HOST", col: "#5eebc7" },
        ];
        stages.forEach((st) => {
          const p = drawBox3D(
            ctx,
            cx,
            cy,
            fov,
            dist,
            rx,
            ry,
            st.x,
            st.y,
            st.z,
            0.38,
            0.34,
            0.38,
            st.col,
            "rgba(11, 17, 32, 0.72)",
          );
          drawPillLabel(ctx, p.sx, p.sy - 30, st.label, st.col, width, height, {
            fontSize: 9.5,
            boxH: 18,
          });
        });

        // Deterministic multi-lane packet stream across all 4 stages
        for (let i = 0; i < stages.length - 1; i++) {
          for (let lane = 0; lane < 2; lane++) {
            drawPacketArc3D(
              ctx,
              cx,
              cy,
              fov,
              dist,
              rx,
              ry,
              stages[i],
              stages[i + 1],
              lane === 0 ? -0.14 : 0.08,
              0,
              lane === 0 ? "rgba(56, 189, 248, 0.6)" : "rgba(251, 191, 36, 0.55)",
              (t * 0.95 + i * 0.25 + lane * 0.5) % 1,
              { dotColor: lane === 0 ? "#7dd3fc" : "#fde68a", dotRadius: 3.1 },
            );
          }
        }

        // Live scrolling Deterministic Flat-Jitter Timing Trace at bottom
        const traceX = 20;
        const traceW = Math.max(160, width - 40);
        const traceY = height - 74;
        const traceH = 54;
        safeRoundRect(ctx, traceX, traceY, traceW, traceH, 10);
        ctx.fillStyle = "rgba(4, 7, 18, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.34)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Target flat baseline
        const midY = traceY + traceH * 0.58;
        ctx.strokeStyle = "rgba(94, 235, 199, 0.22)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(traceX + 12, midY);
        ctx.lineTo(traceX + traceW - 12, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flat-jitter deterministic arrival waveform
        ctx.beginPath();
        const samples = 80;
        for (let i = 0; i <= samples; i++) {
          const px = traceX + 12 + (i / samples) * (traceW - 24);
          const phase = (i / samples) * 10 - t * 3.5;
          const frac = ((phase % 1) + 1) % 1;
          // Sharp evenly spaced deterministic pulses with near-zero jitter variance
          const spike = frac < 0.09 ? -Math.sin((frac / 0.09) * Math.PI) * 14 : Math.sin(phase * 12) * 0.8;
          const py = midY + spike;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 9.5px ui-monospace, monospace";
        ctx.fillText("DETERMINISTIC FLAT-JITTER TIMING TRACE (CONCEPTUAL)", traceX + 12, traceY + 14);
      } else if (activeMode === "cme") {
        // 4. CME GROUP: Dedicated 3D Ultra-Low-Latency Trading Gateway <-> Matching Engine Fabric Tunnel
        const gwP = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          -1.18,
          0,
          0,
          0.48,
          0.86,
          0.56,
          "rgba(56, 189, 248, 0.92)",
          "rgba(56, 189, 248, 0.14)",
        );
        const meP = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          1.18,
          0,
          0,
          0.56,
          0.86,
          0.56,
          "rgba(251, 191, 36, 0.95)",
          "rgba(251, 191, 36, 0.16)",
        );

        // Concentric glowing golden waveguide tunnel rings between Gateway and Matching Engine
        for (let r = 0; r < 6; r++) {
          const tx = lerp(-0.78, 0.78, r / 5);
          const rad = 0.34 + Math.sin(t * 4 - r * 0.7) * 0.03;
          ctx.beginPath();
          for (let s = 0; s <= 32; s++) {
            const a = (s / 32) * Math.PI * 2;
            const p = project(
              rot3D(tx, Math.cos(a) * rad, Math.sin(a) * rad, rx, ry),
              cx,
              cy,
              fov,
              dist,
            );
            if (s === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.strokeStyle =
            r % 2 === 0
              ? "rgba(251, 191, 36, 0.45)"
              : "rgba(56, 189, 248, 0.38)";
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }

        // High-speed synchronized bidirectional order & ack pulses
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * Math.PI * 2 + t * 0.6;
          const oy = Math.cos(ang) * 0.18;
          const oz = Math.sin(ang) * 0.18;
          const forward = k % 2 === 0;
          const pA = { x: forward ? -0.94 : 0.94, y: oy, z: oz };
          const pB = { x: forward ? 0.94 : -0.94, y: oy, z: oz };
          drawPacketArc3D(
            ctx,
            cx,
            cy,
            fov,
            dist,
            rx,
            ry,
            pA,
            pB,
            0,
            0,
            forward ? "rgba(251, 191, 36, 0.75)" : "rgba(56, 189, 248, 0.75)",
            (t * 2.1 + k * 0.25) % 1,
            { dotColor: forward ? "#fde68a" : "#e0f2fe", dotRadius: 3.6 },
          );
        }

        const midP = project(rot3D(0, -0.58, 0, rx, ry), cx, cy, fov, dist);
        drawPillLabel(ctx, midP.sx, midP.sy, "DEDICATED BARE-METAL FABRIC", "rgba(251, 191, 36, 0.85)", width, height, { textColor: "#fde68a" });
        drawPillLabel(ctx, gwP.sx, gwP.sy + 58, "TRADING GATEWAY", "rgba(56, 189, 248, 0.85)", width, height);
        drawPillLabel(ctx, meP.sx, meP.sy + 58, "MATCHING ENGINE", "rgba(251, 191, 36, 0.9)", width, height, { textColor: "#fde68a" });
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;
      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      yaw += (e.clientX - dragX) * 0.008;
      pitch = clamp(pitch + (e.clientY - dragY) * 0.008, -0.85, 0.85);
      dragX = e.clientX;
      dragY = e.clientY;
      if (!motionEnabled) draw();
    });
    const stopDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(section);
    } else {
      visible = true;
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    setMode("host");
    resize();
    sync();
  }

  /* =========================================================
     ENGINE 3: UNIFIED 3D DOMAIN SIMULATION STAGE (ALL 7 PROJECTS)
     ========================================================= */
  function initSculptureEngine() {
    const canvas = $("#sculpture-canvas");
    const section = $("#projects");
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const indexEl = $("#sculpture-index");
    const nameEl = $("#sculpture-active-name");
    const geomTagEl = $("#sculpture-geometry-tag");
    const descEl = $("#sculpture-active-desc");
    const subnoteEl = $("#sculpture-subnote");
    const linkEl = $("#sculpture-active-link");

    // Per-station interactive controls
    const seedFaultBtn = $("#seed-fault-btn");
    const secureSimToggle = $("#securesim-mode-toggle");
    const secureSimBtns = $$("[data-sim-mode]");
    const gptQueryToggle = $("#gpt-query-toggle");
    const gptQueryBtns = $$("[data-gpt-query]");
    const sonicaControls = $("#sonica-controls");
    const sonicaChBtns = $$("[data-sonica-ch]");
    const sonicaBurstBtn = $("#sonica-burst-btn");
    const floraHooksToggle = $("#flora-hooks-toggle");
    const floraHookBtns = $$("[data-flora-hook]");
    const vrToggleWrap = $("#vr-mode-toggle");
    const vrModeBtns = $$("[data-vr-mode]");
    const acemapLoadBtn = $("#acemap-load-btn");
    const acemapDrawer = $("#acemap-drawer");
    const acemapNearestEl = $("#acemap-nearest-readout");
    const acemapTopicWrap = $("#acemap-topic-wrap");
    const acemapTopicSelect = $("#acemap-topic-select");
    const acemapPillsEl = $("#acemap-discipline-pills");

    const stationCards = $$(".station-card");
    const stationButtons = $$("[data-select-station]");

    const stations = {
      seed: {
        num: "STATION 01 / 07",
        name: "SEED",
        geomTag: "3D 5G UE · SIM/SEED CHIP · 5G CORE",
        desc: "Diagnosing and recovering from 5G failures through the SIM.",
        subnote:
          "Trigger a 5G failure to watch the radio link fracture crimson, the embedded SIM/SEED chip run out-of-band diagnosis with the 5G Core, and recovery snap the 5G link back online.",
        linkText: "Read the SIGCOMM ’22 paper",
        href: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      },
      securesim: {
        num: "STATION 02 / 07",
        name: "SecureSIM",
        geomTag: "3D eSIM DIE · CRYPTO CERT & POLICY BARRIER",
        desc: "Authentication and fine-grained access control for SIM and eSIM.",
        subnote:
          "Toggle Valid Cert (Scoped) vs. Unauthorized App: signed requests pass handshake into ONLY their authorized partition (ALLOWED); unsigned apps deflect off the 3D shield (DENIED).",
        linkText: "Read the MobiCom ’21 paper",
        href: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      },
      gptcode: {
        num: "STATION 03 / 07",
        name: "GPT-Code-Learner",
        geomTag: "3D CODEBASE AST / CALL-GRAPH & LLM RETRIEVAL",
        desc: "Explore a codebase through questions, context, and GPT.",
        subnote:
          "Query [auth]: 1. main.py dispatches request -> 2. auth.py validates token -> 3. sim_core.c enforces hardware policy.",
        linkText: "Explore on GitHub",
        href: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      },
      sonica: {
        num: "STATION 04 / 07",
        name: "Sonica",
        geomTag: "3D PERSPECTIVE NB-IoT NARROWBAND WATERFALL",
        desc: "An open NB-IoT network for experiments with real devices.",
        subnote:
          "Switch narrowband subcarrier channels or emit an IoT sensor burst to watch live narrowband spectral ridges decode over the air.",
        linkText: "Explore on GitHub",
        href: "https://github.com/sonica-nbiot/sonica",
      },
      flora: {
        num: "STATION 05 / 07",
        name: "Flora",
        geomTag: "3D 4-LAYER PROGRAMMABLE CELLULAR STACK",
        desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
        subnote:
          "Toggle programmable hooks on eSIM, RAN, 5G Core, or Edge VR to dynamically alter live bidirectional 3D packet paths across all four cellular layers.",
        linkText: "Explore the project",
        href: "https://project-flora.github.io/Flora/",
      },
      vr: {
        num: "STATION 06 / 07",
        name: "Mobile VR Latency",
        geomTag: "3D VR HEADSET · WIRELESS UPLINK · EDGE GPU LOOP",
        desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
        subnote:
          "Toggle Standard (Reactive) vs. Proactive (Predicted) to compare uplink radio queueing & lagging ghost frames against pre-scheduled pose lock. Illustrative motion study, not a benchmark.",
        linkText: "Read the NSDI ’21 paper",
        href: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      },
      acemap: {
        num: "STATION 07 / 07",
        name: "Acemap",
        geomTag: "2,208-TOPIC 3D ACADEMIC KNOWLEDGE GALAXY",
        desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
        subnote:
          "Load data.csv on demand to explore 2,208 real topics with 3D-projected discipline cluster labels, constellation neighbor links, and instant topic search.",
        linkText: "Explore Acemap",
        href: "https://acemap.sjtu.edu.cn/",
      },
    };

    const ACEMAP_FIELDS = [
      "Psychology",
      "Political Science",
      "Mathematics",
      "Environmental Science",
      "Computer Science",
      "Medicine",
      "Biology",
      "History",
      "Physics",
      "Geology",
      "Engineering",
      "Philosophy",
      "Art",
      "Sociology",
      "Business",
      "Economics",
      "Chemistry",
      "Materials Science",
      "Geography",
    ];

    const ACEMAP_COLORS = [
      "#ffc1fc",
      "#beeb74",
      "#e0d4ff",
      "#ffb290",
      "#ffbd71",
      "#ded75f",
      "#9cd8fc",
      "#f5bc7b",
      "#5eebc7",
      "#d1beda",
      "#52eaf9",
      "#9ed5c2",
      "#c9d188",
      "#91d289",
      "#ffbccc",
      "#ffac9e",
      "#ffaabb",
      "#8df8a0",
      "#ffce63",
    ];

    // GPT-Code-Learner 3D AST / Call-Graph nodes & queries (wide spatial separation, zero pill collision)
    const astNodes = [
      { id: "main", label: "main.py", x: -1.18, y: -0.58, z: 0.14 },
      { id: "router", label: "router.py", x: -0.18, y: -0.64, z: -0.18 },
      { id: "auth", label: "auth.py", x: -0.34, y: 0.08, z: 0.34 },
      { id: "sim_core", label: "sim_core.c", x: 0.62, y: 0.56, z: 0.22 },
      { id: "fabric", label: "fabric.go", x: 0.78, y: -0.44, z: -0.22 },
      { id: "context", label: "context_idx", x: -1.16, y: 0.46, z: -0.22 },
      { id: "llm", label: "query_llm", x: -0.32, y: 0.72, z: -0.16 },
      { id: "telemetry", label: "telemetry.py", x: 1.26, y: 0.06, z: 0.06 },
    ];
    const astEdges = [
      [0, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [4, 7],
      [3, 7],
      [5, 6],
      [6, 1],
      [6, 2],
      [5, 2],
    ];
    const gptQueries = {
      auth: {
        path: [0, 2, 3],
        summary:
          "Trace auth flow: [1] main.py receives call -> [2] auth.py verifies certificate scope -> [3] sim_core.c unlocks authorized handler.",
      },
      routing: {
        path: [0, 1, 4],
        summary:
          "Explain routing: [1] main.py parses packet intent -> [2] router.py resolves fabric target -> [3] fabric.go dispatches bare-metal path.",
      },
      sim: {
        path: [5, 2, 3],
        summary:
          "Find SIM handler: [1] context_idx ranks AST symbols -> [2] auth.py bridges applet calls -> [3] sim_core.c executes SIM recovery.",
      },
    };

    // Mobile VR Golden-ratio Icosahedron for 6DoF Headset Pose & Rendered Viewport
    const PHI = (1 + Math.sqrt(5)) / 2;
    const icoRaw = [
      [-1, PHI, 0],
      [1, PHI, 0],
      [-1, -PHI, 0],
      [1, -PHI, 0],
      [0, -1, PHI],
      [0, 1, PHI],
      [0, -1, -PHI],
      [0, 1, -PHI],
      [PHI, 0, -1],
      [PHI, 0, 1],
      [-PHI, 0, -1],
      [-PHI, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return { x: (x / len) * 0.46, y: (y / len) * 0.46, z: (z / len) * 0.46 };
    });
    const icoEdges = [];
    for (let i = 0; i < icoRaw.length; i++) {
      for (let j = i + 1; j < icoRaw.length; j++) {
        const d = Math.hypot(
          icoRaw[i].x - icoRaw[j].x,
          icoRaw[i].y - icoRaw[j].y,
          icoRaw[i].z - icoRaw[j].z,
        );
        if (d < 0.56) icoEdges.push([i, j]);
      }
    }

    // Ambient cosmic starfield particles (kept subtle behind all 7 3D scenes)
    const rand = mulberry32(4242);
    const bgStars = [];
    for (let i = 0; i < 65; i++) {
      bgStars.push({
        x: rand(),
        y: rand(),
        r: 0.6 + rand() * 1.1,
        alpha: 0.14 + rand() * 0.35,
        phase: rand() * Math.PI * 2,
      });
    }

    // Sonica 3D waterfall spectrogram history buffer (22 time rows x 24 freq bins)
    const WF_ROWS = 22;
    const WF_BINS = 24;
    const waterfall = [];
    for (let r = 0; r < WF_ROWS; r++) {
      waterfall.push(new Float32Array(WF_BINS));
    }
    let wfTickAccum = 0;

    // Station interactive states
    let activeStation = "seed";
    let seedCycleClock = 1.6; // starts right before fault so users see the story fast
    let simMode = "valid"; // "valid" | "unauth"
    let gptQuery = "auth"; // "auth" | "routing" | "sim"
    let gptBeamClock = 0;
    let sonicaChannel = 1; // 0, 1, 2
    let sonicaBurstEnergy = 0.65;
    const floraHooks = { esim: true, ran: false, core: true, edge: false };
    let vrMode = "proactive"; // "standard" | "proactive"

    // Acemap on-demand dataset state
    let acemapLoaded = false;
    let acemapLoading = false;
    let acemapStars = [];
    let acemapCentroids = [];
    let acemapSelectedField = "all";
    let acemapHovered = -1;
    let acemapSelected = -1;

    let width = 0;
    let height = 0;
    let visible = false;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;

    let yaw = 0.28;
    let pitch = 0.22;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    let pointerCanvasX = -999;
    let pointerCanvasY = -999;
    let vrPointerX = 0;
    let vrPointerY = 0;

    function pushWaterfallRow(tSec) {
      const row = waterfall.pop();
      const chBin = sonicaChannel === 0 ? 11 : sonicaChannel === 1 ? 15 : 20;
      for (let b = 0; b < WF_BINS; b++) {
        let amp = 0.04 + 0.03 * Math.sin(tSec * 2.5 + b * 0.9);
        // Lane 1: Sync Preamble (bins 2..4)
        const dSync = Math.abs(b - 3);
        if (dSync < 1.8) amp += (1 - dSync / 1.8) * (0.28 + 0.1 * Math.sin(tSec * 6));
        // Lane 2: Control Channel (bins 7..8)
        const dCtrl = Math.abs(b - 7.5);
        if (dCtrl < 1.8) amp += (1 - dCtrl / 1.8) * (0.22 + 0.08 * Math.cos(tSec * 4.5));
        // Lane 3: Tuned Active Uplink Subcarrier Block + Sensor Burst
        const dUp = Math.abs(b - chBin);
        if (dUp < 2.2) {
          amp +=
            (1 - dUp / 2.2) *
            (0.32 + sonicaBurstEnergy * 0.62 + 0.12 * Math.sin(tSec * 9));
        }
        row[b] = clamp(amp, 0.02, 1.05);
      }
      waterfall.unshift(row);
      sonicaBurstEnergy = Math.max(0.15, sonicaBurstEnergy * 0.9);
    }

    // Seed initial waterfall rows so frame 1 is rich
    for (let i = 0; i < WF_ROWS; i++) {
      pushWaterfallRow(i * 0.12);
    }

    function selectStation(stationKey) {
      if (!stations[stationKey]) return;
      activeStation = stationKey;
      const meta = stations[stationKey];

      if (indexEl) indexEl.textContent = meta.num;
      if (nameEl) nameEl.textContent = meta.name;
      if (geomTagEl) geomTagEl.textContent = meta.geomTag;
      if (descEl) descEl.textContent = meta.desc;
      if (subnoteEl) {
        subnoteEl.textContent =
          stationKey === "gptcode" ? gptQueries[gptQuery].summary : meta.subnote;
      }
      if (linkEl) {
        linkEl.href = meta.href;
        linkEl.innerHTML = `${meta.linkText} <span aria-hidden="true">↗</span>`;
      }

      if (seedFaultBtn) seedFaultBtn.hidden = stationKey !== "seed";
      if (secureSimToggle) secureSimToggle.hidden = stationKey !== "securesim";
      if (gptQueryToggle) gptQueryToggle.hidden = stationKey !== "gptcode";
      if (sonicaControls) sonicaControls.hidden = stationKey !== "sonica";
      if (floraHooksToggle) floraHooksToggle.hidden = stationKey !== "flora";
      if (vrToggleWrap) vrToggleWrap.hidden = stationKey !== "vr";
      if (acemapLoadBtn) acemapLoadBtn.hidden = stationKey !== "acemap" || acemapLoaded;
      if (acemapDrawer) acemapDrawer.hidden = stationKey !== "acemap";

      stationCards.forEach((card) => {
        card.classList.toggle("is-active", card.dataset.station === stationKey);
      });
      stationButtons.forEach((btn) => {
        btn.setAttribute(
          "aria-selected",
          String(btn.dataset.selectStation === stationKey),
        );
      });

      // Set clean default 3D camera angle per scene for immediate legibility
      if (stationKey === "sonica") {
        yaw = -0.22;
        pitch = 0.44;
      } else if (stationKey === "flora") {
        yaw = 0.36;
        pitch = 0.24;
      } else if (stationKey === "acemap" && acemapLoaded) {
        yaw = 0.06;
        pitch = 0.14;
      } else {
        yaw = 0.24;
        pitch = 0.2;
      }

      if (!motionEnabled) draw();
    }

    stationButtons.forEach((btn) => {
      btn.addEventListener("click", () => selectStation(btn.dataset.selectStation));
    });

    if (seedFaultBtn) {
      seedFaultBtn.addEventListener("click", () => {
        seedCycleClock = 2.05; // Jumps directly into 5G LINK FAULT choreography
        if (!motionEnabled) draw();
      });
    }

    secureSimBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        simMode = btn.dataset.simMode;
        secureSimBtns.forEach((b) => {
          const active = b.dataset.simMode === simMode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (!motionEnabled) draw();
      });
    });

    gptQueryBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        gptQuery = btn.dataset.gptQuery;
        gptBeamClock = 0;
        gptQueryBtns.forEach((b) => {
          const active = b.dataset.gptQuery === gptQuery;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (activeStation === "gptcode" && subnoteEl) {
          subnoteEl.textContent = gptQueries[gptQuery].summary;
        }
        if (!motionEnabled) draw();
      });
    });

    sonicaChBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sonicaChannel = Number(btn.dataset.sonicaCh);
        sonicaBurstEnergy = 0.9;
        sonicaChBtns.forEach((b) => {
          const active = Number(b.dataset.sonicaCh) === sonicaChannel;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (!motionEnabled) {
          pushWaterfallRow(elapsed * 0.001);
          draw();
        }
      });
    });

    if (sonicaBurstBtn) {
      sonicaBurstBtn.addEventListener("click", () => {
        sonicaBurstEnergy = 1.05;
        if (!motionEnabled) {
          pushWaterfallRow(elapsed * 0.001);
          draw();
        }
      });
    }

    floraHookBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.floraHook;
        floraHooks[key] = !floraHooks[key];
        btn.classList.toggle("is-active", floraHooks[key]);
        btn.setAttribute("aria-pressed", String(floraHooks[key]));
        if (!motionEnabled) draw();
      });
    });

    vrModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        vrMode = btn.dataset.vrMode;
        vrModeBtns.forEach((b) => {
          const active = b.dataset.vrMode === vrMode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (!motionEnabled) draw();
      });
    });

    // On-demand Acemap 2,208-topic CSV loader
    async function loadAcemapDataset() {
      if (acemapLoaded || acemapLoading) return;
      acemapLoading = true;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = true;
        acemapLoadBtn.textContent = "Streaming 2,208 topics…";
      }
      if (acemapNearestEl) {
        acemapNearestEl.textContent = "Loading ../../data/data.csv…";
      }

      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Unable to load data.csv");
        const rows = parseCSV(await res.text()).slice(1);
        const parsed = rows
          .map((r) => ({
            rawX: Number(r[0]),
            rawY: Number(r[1]),
            rawSize: Number(r[2]) || 4,
            name: r[3] || "",
            color: (r[4] || "").trim().toLowerCase(),
            topicID: (r[5] || "").trim(),
            field: ACEMAP_COLORS.indexOf((r[4] || "").trim().toLowerCase()),
          }))
          .filter(
            (d) =>
              Number.isFinite(d.rawX) &&
              Number.isFinite(d.rawY) &&
              d.field >= 0,
          );

        if (!parsed.length) throw new Error("No valid rows");

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < parsed.length; i++) {
          const d = parsed[i];
          if (d.rawX < minX) minX = d.rawX;
          if (d.rawX > maxX) maxX = d.rawX;
          if (d.rawY < minY) minY = d.rawY;
          if (d.rawY > maxY) maxY = d.rawY;
        }
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const midX = (minX + maxX) * 0.5;
        const midY = (minY + maxY) * 0.5;
        const norm = Math.max(spanX, spanY) * 0.5;

        const fieldSums = ACEMAP_FIELDS.map(() => ({ x: 0, y: 0, z: 0, n: 0 }));

        acemapStars = parsed.map((d, idx) => {
          const nx = ((d.rawX - midX) / norm) * 1.48;
          const ny = ((d.rawY - midY) / norm) * 1.06;
          const rDist = Math.hypot(nx, ny);
          const nz =
            Math.sin(rDist * 2.4 + d.field * 0.6) * 0.24 +
            ((idx % 11) - 5) * 0.022;
          const acc = fieldSums[d.field];
          acc.x += nx;
          acc.y += ny;
          acc.z += nz;
          acc.n += 1;
          return {
            x: nx,
            y: ny,
            z: nz,
            name: d.name,
            field: d.field,
            color: ACEMAP_COLORS[d.field],
            topicID: d.topicID,
            size: clamp((d.rawSize - 3.8) * 0.55 + 1.5, 1.3, 4.2),
            sx: 0,
            sy: 0,
            depth: 0,
          };
        });

        // Compute 3D centroids for major discipline cluster labels (sorted largest first)
        acemapCentroids = fieldSums
          .map((s, idx) =>
            s.n > 0
              ? {
                  field: idx,
                  name: ACEMAP_FIELDS[idx],
                  color: ACEMAP_COLORS[idx],
                  count: s.n,
                  x: s.x / s.n,
                  y: s.y / s.n,
                  z: s.z / s.n,
                }
              : null,
          )
          .filter(Boolean)
          .sort((a, b) => b.count - a.count);

        acemapLoaded = true;
        acemapLoading = false;
        if (acemapLoadBtn) acemapLoadBtn.hidden = true;
        buildAcemapControls();
        updateAcemapFilter("all");
        yaw = 0.06;
        pitch = 0.14;
        draw();
      } catch (err) {
        acemapLoading = false;
        if (acemapLoadBtn) {
          acemapLoadBtn.disabled = false;
          acemapLoadBtn.textContent = "↻ Retry loading 2,208-Topic Galaxy";
        }
        if (acemapNearestEl) {
          acemapNearestEl.textContent =
            "Dataset could not load locally. Serve via HTTP or open Acemap directly.";
        }
      }
    }

    function buildAcemapControls() {
      if (!acemapPillsEl) return;
      acemapPillsEl.replaceChildren();

      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "disc-pill is-active";
      allBtn.dataset.field = "all";
      allBtn.textContent = `All 19 (${acemapStars.length.toLocaleString()})`;
      allBtn.addEventListener("click", () => updateAcemapFilter("all"));
      acemapPillsEl.appendChild(allBtn);

      ACEMAP_FIELDS.forEach((fieldName, idx) => {
        const count = acemapStars.filter((s) => s.field === idx).length;
        if (!count) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "disc-pill";
        btn.dataset.field = String(idx);
        const swatch = document.createElement("span");
        swatch.className = "disc-swatch";
        swatch.style.backgroundColor = ACEMAP_COLORS[idx];
        btn.appendChild(swatch);
        btn.appendChild(document.createTextNode(`${fieldName} (${count})`));
        btn.addEventListener("click", () => updateAcemapFilter(String(idx)));
        acemapPillsEl.appendChild(btn);
      });

      acemapPillsEl.hidden = false;
      if (acemapTopicWrap) acemapTopicWrap.hidden = false;
    }

    function updateAcemapFilter(fieldVal) {
      acemapSelectedField = fieldVal;
      acemapHovered = -1;
      acemapSelected = -1;

      $$(".disc-pill", acemapPillsEl).forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.field === fieldVal);
      });

      let count = 0;
      if (acemapTopicSelect) {
        acemapTopicSelect.replaceChildren(new Option("Choose a topic…", ""));
      }
      for (let i = 0; i < acemapStars.length; i++) {
        const active =
          fieldVal === "all" || acemapStars[i].field === Number(fieldVal);
        if (active) {
          count++;
          if (acemapTopicSelect) {
            acemapTopicSelect.add(new Option(acemapStars[i].name, String(i)));
          }
        }
      }

      const fieldLabel =
        fieldVal === "all"
          ? "All 19 disciplines"
          : ACEMAP_FIELDS[Number(fieldVal)];
      if (acemapNearestEl) {
        acemapNearestEl.textContent = `${fieldLabel} · ${count.toLocaleString()} stars active — hover or click any star to inspect constellation.`;
      }
      if (!motionEnabled) draw();
    }

    if (acemapLoadBtn) {
      acemapLoadBtn.addEventListener("click", loadAcemapDataset);
    }

    if (acemapTopicSelect) {
      acemapTopicSelect.addEventListener("change", () => {
        acemapSelected =
          acemapTopicSelect.value === "" ? -1 : Number(acemapTopicSelect.value);
        if (acemapSelected >= 0 && acemapStars[acemapSelected]) {
          const s = acemapStars[acemapSelected];
          if (acemapNearestEl) {
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
        }
        if (!motionEnabled) draw();
      });
    }

    function findNearestAcemapStar(mx, my, maxRadius) {
      let best = -1;
      let bestD2 = maxRadius * maxRadius;
      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        if (
          acemapSelectedField !== "all" &&
          s.field !== Number(acemapSelectedField)
        ) {
          continue;
        }
        const dx = s.sx - mx;
        const dy = s.sy - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function drawBackgroundStars(tSec) {
      for (let i = 0; i < bgStars.length; i++) {
        const s = bgStars[i];
        const tw = 0.65 + 0.35 * Math.sin(tSec * 2 + s.phase);
        ctx.fillStyle = `rgba(191, 219, 254, ${(s.alpha * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawSeedScene(cx, cy, fov, dist, rx, ry, tSec) {
      // 4-phase choreography: 0..2 Nominal, 2..4.2 Fault, 4.2..6.8 SIM Diagnosis, 6.8..9 Recovery
      const cycle = seedCycleClock % 9.2;
      const phase =
        cycle < 2.0 ? "nominal" : cycle < 4.2 ? "fault" : cycle < 6.8 ? "diagnose" : "recover";

      const uePos = { x: -1.16, y: 0.04, z: 0.1 };
      const simPos = { x: -0.02, y: 0.56, z: 0.34 };
      const corePos = { x: 1.16, y: -0.06, z: -0.08 };

      // 1. 3D 5G UE Handset
      const ueP = drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        uePos.x,
        uePos.y,
        uePos.z,
        0.42,
        0.74,
        0.12,
        phase === "fault" ? "#fb7185" : "#38bdf8",
        "rgba(15, 28, 54, 0.72)",
      );
      // UE screen inset
      drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        uePos.x,
        uePos.y - 0.02,
        uePos.z + 0.06,
        0.32,
        0.54,
        0.02,
        phase === "fault" ? "rgba(251, 113, 133, 0.75)" : "rgba(125, 211, 252, 0.7)",
        phase === "fault" ? "rgba(251, 113, 133, 0.15)" : "rgba(56, 189, 248, 0.14)",
      );

      // 2. Enlarged Embedded SIM / SEED Chip with unmistakable gold contact pads
      const simGlow =
        phase === "diagnose" || phase === "recover"
          ? "#fbbf24"
          : "rgba(251, 191, 36, 0.72)";
      const simP = drawSimChip3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        simPos.x,
        simPos.y,
        simPos.z,
        0.56,
        simGlow,
        phase === "diagnose" ? "rgba(251, 191, 36, 0.22)" : "rgba(15, 23, 42, 0.85)",
      );

      // 3. 3D 5G Core Tower (3 stacked network function blades)
      const coreCol = phase === "diagnose" ? "#fbbf24" : "#818cf8";
      for (let k = -1; k <= 1; k++) {
        drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          corePos.x,
          corePos.y + k * 0.24,
          corePos.z,
          0.54,
          0.16,
          0.48,
          coreCol,
          "rgba(129, 140, 248, 0.16)",
        );
      }
      const coreP = project(rot3D(corePos.x, corePos.y, corePos.z, rx, ry), cx, cy, fov, dist);

      // 5G Radio Link (UE <-> 5G Core)
      if (phase === "fault" || phase === "diagnose") {
        // Fractured red broken 5G link with jagged mid-gap
        const midL = { x: -0.25, y: -0.32, z: 0.02 };
        const midR = { x: 0.25, y: -0.38, z: -0.02 };
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, uePos, midL, -0.1, 0, "rgba(251, 113, 133, 0.85)", -1, { dashed: true, lineWidth: 2 });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, midR, corePos, -0.1, 0, "rgba(251, 113, 133, 0.85)", -1, { dashed: true, lineWidth: 2 });
        const faultMid = project(rot3D(0, -0.42, 0, rx, ry), cx, cy, fov, dist);
        drawPillLabel(ctx, faultMid.sx, faultMid.sy, "✕ 5G RADIO LINK FRACTURED", "#fb7185", width, height, { textColor: "#fda4af" });
      } else {
        drawPacketArc3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          uePos,
          corePos,
          -0.46,
          0,
          phase === "recover" ? "rgba(94, 235, 199, 0.9)" : "rgba(56, 189, 248, 0.82)",
          (tSec * 1.1) % 1,
          { lineWidth: 2.1, dotColor: "#e0f2fe", dotRadius: 4 },
        );
      }

      // SIM <-> UE & SIM <-> 5G Core Out-of-Band Diagnosis & Recovery Arcs
      if (phase === "diagnose") {
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, uePos, simPos, 0.14, 0.1, "rgba(251, 191, 36, 0.85)", (tSec * 1.6) % 1, { lineWidth: 2, dotColor: "#fde68a" });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, simPos, corePos, 0.18, 0.12, "rgba(251, 191, 36, 0.92)", (tSec * 1.4 + 0.4) % 1, { lineWidth: 2.2, dotColor: "#fde68a" });
      } else if (phase === "recover") {
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, corePos, simPos, 0.18, 0.12, "rgba(94, 235, 199, 0.78)", (tSec * 1.6) % 1, { lineWidth: 2, dotColor: "#a7f3d0" });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, simPos, uePos, 0.14, 0.1, "rgba(251, 191, 36, 0.95)", (tSec * 1.8) % 1, { lineWidth: 2.4, dotColor: "#fde68a" });
      } else {
        // Faint standby diagnostic bus
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, uePos, simPos, 0.14, 0.1, "rgba(251, 191, 36, 0.22)", -1, { dashed: true });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, simPos, corePos, 0.18, 0.12, "rgba(251, 191, 36, 0.22)", -1, { dashed: true });
      }

      // Crisp 3D node labels
      drawPillLabel(ctx, ueP.sx, ueP.sy + 58, "5G UE / DEVICE", "#38bdf8", width, height);
      drawPillLabel(ctx, simP.sx, simP.sy + 44, "SIM / SEED APPLET", "#fbbf24", width, height, { textColor: "#fde68a" });
      drawPillLabel(ctx, coreP.sx, coreP.sy + 58, "5G CORE", "#818cf8", width, height);

      const statusText =
        phase === "nominal"
          ? "STATE 1/4 · 5G BEARER NOMINAL"
          : phase === "fault"
            ? "STATE 2/4 · 5G FAILURE DETECTED"
            : phase === "diagnose"
              ? "STATE 3/4 · SIM OUT-OF-BAND CAUSE INFERENCE"
              : "STATE 4/4 · SIM RECOVERY ACTION · LINK RESTORED";
      const statusCol =
        phase === "fault"
          ? "#fb7185"
          : phase === "diagnose"
            ? "#fbbf24"
            : phase === "recover"
              ? "#5eebc7"
              : "#38bdf8";
      drawPillLabel(ctx, cx, 22, statusText, statusCol, width, height, { fontSize: 10.5, boxH: 22 });
    }

    function drawSecureSimScene(cx, cy, fov, dist, rx, ry, tSec) {
      const valid = simMode === "valid";

      // 3D eSIM Chip Die at center with gold contact pads
      const chipP = drawSimChip3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        0,
        0,
        0,
        0.72,
        valid ? "#38bdf8" : "#fb7185",
        "rgba(11, 17, 32, 0.9)",
      );

      // 3 Internal Scoped SIM Partitions stacked behind/within die
      const parts = [
        { label: "CARRIER", y: -0.36, unlocked: false },
        { label: "AUTH KEY", y: 0.0, unlocked: valid },
        { label: "APP VAULT", y: 0.36, unlocked: false },
      ];
      parts.forEach((pt) => {
        const p = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          0.95,
          pt.y,
          0,
          0.56,
          0.22,
          0.32,
          pt.unlocked ? "#5eebc7" : "rgba(148, 163, 184, 0.35)",
          pt.unlocked ? "rgba(94, 235, 199, 0.22)" : "rgba(15, 23, 42, 0.55)",
        );
        drawPillLabel(
          ctx,
          p.sx + 22,
          p.sy,
          pt.unlocked ? `${pt.label} · UNLOCKED` : `${pt.label} · LOCKED`,
          pt.unlocked ? "#5eebc7" : "rgba(148, 163, 184, 0.45)",
          width,
          height,
          { fontSize: 9.5, boxH: 18 },
        );
      });

      // 3D Cryptographic Cert & Fine-Grained Policy Barrier Rings
      const ringCol = valid ? "rgba(56, 189, 248, 0.65)" : "rgba(251, 113, 133, 0.78)";
      for (let r = 0; r < 2; r++) {
        const rad = r === 0 ? 0.68 : 0.86;
        ctx.beginPath();
        for (let s = 0; s <= 56; s++) {
          const a = (s / 56) * Math.PI * 2;
          const local = rot3D(
            Math.cos(a) * rad,
            Math.sin(a) * rad,
            0,
            r === 0 ? tSec * 0.65 : -tSec * 0.45,
            r === 0 ? 0.5 : -0.7,
          );
          const p = project(rot3D(local.x, local.y, local.z, rx, ry), cx, cy, fov, dist);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = r === 0 ? ringCol : "rgba(129, 140, 248, 0.42)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Incoming App Request Source on Left
      const reqPos = { x: -1.32, y: 0, z: 0.1 };
      const reqP = drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        reqPos.x,
        reqPos.y,
        reqPos.z,
        0.42,
        0.42,
        0.34,
        valid ? "#38bdf8" : "#fb7185",
        valid ? "rgba(56, 189, 248, 0.16)" : "rgba(251, 113, 133, 0.16)",
      );
      drawPillLabel(
        ctx,
        reqP.sx,
        reqP.sy + 42,
        valid ? "SIGNED APP + CERT" : "UNSIGNED / EXCESS SCOPE",
        valid ? "#38bdf8" : "#fb7185",
        width,
        height,
      );

      // Request packet trajectory: Pass into scoped partition vs Deflect off barrier
      const cycle = (tSec * 0.72) % 1;
      if (valid) {
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, reqPos, { x: 0, y: 0, z: 0 }, -0.08, 0, "rgba(56, 189, 248, 0.75)", cycle, { lineWidth: 2, dotColor: "#e0f2fe", dotRadius: 4 });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, { x: 0, y: 0, z: 0 }, { x: 0.68, y: 0, z: 0 }, -0.05, 0, "rgba(94, 235, 199, 0.85)", (cycle + 0.5) % 1, { lineWidth: 2.2, dotColor: "#a7f3d0", dotRadius: 3.8 });
      } else {
        // Hits barrier at x = -0.72 and deflects back/upward in crimson
        const hitPos = { x: -0.72, y: 0, z: 0.08 };
        const bouncePos = { x: -1.12, y: -0.68, z: 0.3 };
        if (cycle < 0.52) {
          drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, reqPos, hitPos, 0, 0, "rgba(251, 113, 133, 0.75)", cycle / 0.52, { lineWidth: 2, dotColor: "#fda4af", dotRadius: 4.2 });
        } else {
          drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, hitPos, bouncePos, -0.1, 0, "rgba(251, 113, 133, 0.75)", (cycle - 0.52) / 0.48, { lineWidth: 2, dashed: true, dotColor: "#fb7185", dotRadius: 3.8 });
          const hp = project(rot3D(hitPos.x, hitPos.y, hitPos.z, rx, ry), cx, cy, fov, dist);
          ctx.strokeStyle = "rgba(251, 113, 133, 0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hp.sx, hp.sy, 8 + (cycle - 0.52) * 32, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      drawPillLabel(ctx, chipP.sx, chipP.sy + 68, "eSIM DIE + POLICY GATE", "#fbbf24", width, height, { textColor: "#fde68a" });
      drawPillLabel(
        ctx,
        cx,
        22,
        valid
          ? "CERT VERIFIED · ALLOWED (SCOPED TO AUTH KEY ONLY)"
          : "POLICY BARRIER TRIGGERED · DENIED (DEFLECTED)",
        valid ? "#5eebc7" : "#fb7185",
        width,
        height,
        { fontSize: 10.5, boxH: 22 },
      );
    }

    function drawGptCodeScene(cx, cy, fov, dist, rx, ry, tSec) {
      const q = gptQueries[gptQuery] || gptQueries.auth;
      const activeSet = new Set(q.path);

      // Project all 8 AST/call-graph nodes
      const proj = astNodes.map((n) =>
        project(rot3D(n.x, n.y, n.z, rx, ry), cx, cy, fov, dist),
      );

      // Base call-graph edges
      astEdges.forEach(([a, b]) => {
        ctx.strokeStyle = "rgba(129, 140, 248, 0.3)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(proj[a].sx, proj[a].sy);
        ctx.lineTo(proj[b].sx, proj[b].sy);
        ctx.stroke();
      });

      // Luminous 3D LLM retrieval beam along active 1 -> 2 -> 3 execution path
      const beamProg = (gptBeamClock * 0.55) % 1;
      for (let i = 0; i < q.path.length - 1; i++) {
        const nA = astNodes[q.path[i]];
        const nB = astNodes[q.path[i + 1]];
        drawPacketArc3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          nA,
          nB,
          -0.14,
          0.08,
          "rgba(251, 191, 36, 0.92)",
          (beamProg + i * 0.5) % 1,
          { lineWidth: 2.6, dotColor: "#fde68a", dotRadius: 4.2 },
        );
      }

      // Render non-hit nodes first, then active [1]->[2]->[3] nodes on top so labels never collide
      const drawOrder = [
        ...astNodes.map((n, idx) => ({ n, idx })).filter(({ idx }) => !activeSet.has(idx)),
        ...astNodes.map((n, idx) => ({ n, idx })).filter(({ idx }) => activeSet.has(idx)),
      ];
      drawOrder.forEach(({ n, idx }) => {
        const isHit = activeSet.has(idx);
        const stepNum = q.path.indexOf(idx) + 1;
        const p = drawBox3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          n.x,
          n.y,
          n.z,
          isHit ? 0.26 : 0.18,
          isHit ? 0.22 : 0.15,
          isHit ? 0.26 : 0.18,
          isHit ? "#fbbf24" : "rgba(56, 189, 248, 0.65)",
          isHit ? "rgba(251, 191, 36, 0.22)" : "rgba(15, 28, 54, 0.65)",
        );

        const lbl = isHit ? `[${stepNum}] ${n.label}` : n.label;
        drawPillLabel(
          ctx,
          p.sx,
          p.sy - 22,
          lbl,
          isHit ? "#fbbf24" : "rgba(56, 189, 248, 0.5)",
          width,
          height,
          {
            fontSize: isHit ? 10.5 : 9.5,
            boxH: isHit ? 21 : 18,
            textColor: isHit ? "#fde68a" : "#cbd5e1",
          },
        );
      });

      drawPillLabel(
        ctx,
        cx,
        22,
        `LLM CONTEXT RETRIEVAL · PATH [1] -> [2] -> [3]`,
        "#fbbf24",
        width,
        height,
        { fontSize: 10.5, boxH: 22 },
      );
    }

    function drawSonicaScene(cx, cy, fov, dist, rx, ry, tSec) {
      // 3D Perspective Scrolling NB-IoT Narrowband Waterfall Spectrogram
      const wfWidth = 2.4;
      const wfDepth = 1.9;
      const baseY = 0.52;

      for (let r = WF_ROWS - 1; r >= 0; r--) {
        const row = waterfall[r];
        const zPos = lerp(-wfDepth * 0.5, wfDepth * 0.5, r / (WF_ROWS - 1));
        const fade = 1 - r / (WF_ROWS + 3);
        ctx.beginPath();
        for (let b = 0; b < WF_BINS; b++) {
          const xPos = lerp(-wfWidth * 0.5, wfWidth * 0.5, b / (WF_BINS - 1));
          const yPos = baseY - row[b] * 0.92;
          const p = project(rot3D(xPos, yPos, zPos, rx, ry), cx, cy, fov, dist);
          if (b === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle =
          r === 0
            ? "rgba(251, 191, 36, 0.96)"
            : r < 5
              ? `rgba(56, 189, 248, ${(0.88 * fade).toFixed(2)})`
              : `rgba(129, 140, 248, ${(0.68 * fade).toFixed(2)})`;
        ctx.lineWidth = r === 0 ? 2.2 : 1.25;
        ctx.stroke();
      }

      // Highlight active tuned NB-IoT subcarrier lane guide lines
      const chBin = sonicaChannel === 0 ? 11 : sonicaChannel === 1 ? 15 : 20;
      const activeX = lerp(-wfWidth * 0.5, wfWidth * 0.5, chBin / (WF_BINS - 1));
      const pFront = project(rot3D(activeX, baseY + 0.06, -wfDepth * 0.5, rx, ry), cx, cy, fov, dist);
      const pBack = project(rot3D(activeX, baseY + 0.06, wfDepth * 0.5, rx, ry), cx, cy, fov, dist);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pFront.sx, pFront.sy);
      ctx.lineTo(pBack.sx, pBack.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3D IoT Sensor Emitter firing narrowband burst into the tuned subcarrier
      const sensorPos = { x: activeX, y: -0.64, z: -wfDepth * 0.48 };
      const senP = drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        sensorPos.x,
        sensorPos.y,
        sensorPos.z,
        0.24,
        0.24,
        0.22,
        "#fbbf24",
        "rgba(251, 191, 36, 0.22)",
      );
      drawPacketArc3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        sensorPos,
        { x: activeX, y: baseY - 0.35, z: -wfDepth * 0.48 },
        0,
        0,
        "rgba(251, 191, 36, 0.85)",
        (tSec * 1.6) % 1,
        { dotColor: "#fde68a", dotRadius: 3.6 },
      );

      // Labeled Discrete Narrowband Subcarrier Lanes along front edge
      const syncP = project(rot3D(lerp(-wfWidth * 0.5, wfWidth * 0.5, 3 / (WF_BINS - 1)), baseY + 0.22, -wfDepth * 0.5, rx, ry), cx, cy, fov, dist);
      const ctrlP = project(rot3D(lerp(-wfWidth * 0.5, wfWidth * 0.5, 8 / (WF_BINS - 1)), baseY + 0.22, -wfDepth * 0.5, rx, ry), cx, cy, fov, dist);
      const upP = project(rot3D(activeX, baseY + 0.22, -wfDepth * 0.5, rx, ry), cx, cy, fov, dist);

      drawPillLabel(ctx, syncP.sx, syncP.sy, "SYNC PREAMBLE", "#38bdf8", width, height, { fontSize: 9.5, boxH: 18 });
      drawPillLabel(ctx, ctrlP.sx, ctrlP.sy + 22, "CONTROL CH", "#818cf8", width, height, { fontSize: 9.5, boxH: 18 });
      drawPillLabel(ctx, upP.sx, upP.sy, `UPLINK CH-${sonicaChannel + 1}`, "#fbbf24", width, height, { fontSize: 9.5, boxH: 18, textColor: "#fde68a" });
      drawPillLabel(ctx, senP.sx, senP.sy - 24, "IoT SENSOR BURST", "#fbbf24", width, height, { fontSize: 9.5, boxH: 18 });

      drawPillLabel(
        ctx,
        cx,
        22,
        `NB-IoT SPECTRUM · TUNED CH-${sonicaChannel + 1} · OTA FRAME DECODED`,
        "#5eebc7",
        width,
        height,
        { fontSize: 10.5, boxH: 22 },
      );
    }

    function drawFloraScene(cx, cy, fov, dist, rx, ry, tSec) {
      // 4 clearly labeled 3D suspended cellular stack planes + programmable hooks
      const layers = [
        { key: "esim", label: "eSIM", rule: "PROFILE SWAP", y: 0.78, color: "#fbbf24" },
        { key: "ran", label: "RAN", rule: "DEDICATED SLICE", y: 0.26, color: "#38bdf8" },
        { key: "core", label: "5G CORE", rule: "FAST-PATH ROUTE", y: -0.26, color: "#818cf8" },
        { key: "edge", label: "EDGE VR", rule: "GPU OFFLOAD", y: -0.78, color: "#5eebc7" },
      ];

      layers.forEach((ly) => {
        const active = floraHooks[ly.key];
        const half = active ? 0.96 : 0.84;
        const quad = [
          [-half, ly.y, -half * 0.75],
          [half, ly.y, -half * 0.75],
          [half, ly.y, half * 0.75],
          [-half, ly.y, half * 0.75],
        ].map(([x, y, z]) => project(rot3D(x, y, z, rx, ry), cx, cy, fov, dist));

        ctx.beginPath();
        ctx.moveTo(quad[0].sx, quad[0].sy);
        ctx.lineTo(quad[1].sx, quad[1].sy);
        ctx.lineTo(quad[2].sx, quad[2].sy);
        ctx.lineTo(quad[3].sx, quad[3].sy);
        ctx.closePath();
        ctx.fillStyle = active ? "rgba(56, 189, 248, 0.14)" : "rgba(15, 23, 42, 0.45)";
        ctx.fill();
        ctx.strokeStyle = active ? ly.color : "rgba(148, 184, 255, 0.35)";
        ctx.lineWidth = active ? 2 : 1.1;
        ctx.stroke();

        // Layer callout on right edge
        const tag = active ? `${ly.label} · ${ly.rule}` : ly.label;
        drawPillLabel(
          ctx,
          quad[1].sx + 64,
          quad[1].sy,
          tag,
          active ? ly.color : "rgba(148, 184, 255, 0.4)",
          width,
          height,
          { fontSize: 9.5, boxH: 18 },
        );
      });

      // Animated 3D RF waves on the RAN layer
      for (let w = 0; w < 2; w++) {
        const rad = 0.25 + ((tSec * 0.55 + w * 0.5) % 0.65);
        ctx.beginPath();
        for (let s = 0; s <= 36; s++) {
          const a = (s / 36) * Math.PI * 2;
          const p = project(
            rot3D(Math.cos(a) * rad, 0.26, Math.sin(a) * rad, rx, ry),
            cx,
            cy,
            fov,
            dist,
          );
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = floraHooks.ran
          ? "rgba(56, 189, 248, 0.72)"
          : "rgba(56, 189, 248, 0.3)";
        ctx.lineWidth = floraHooks.ran ? 1.8 : 1;
        ctx.stroke();
      }

      // Bidirectional 3D packet streams dynamically shaped by active programmable hooks
      const laneOffsets = floraHooks.ran ? [-0.36, 0.0, 0.36] : [-0.22, 0.22];
      laneOffsets.forEach((lx, idx) => {
        const isUp = idx % 2 === 0;
        const speed = floraHooks.core ? 1.15 : 0.62;
        const shiftX = floraHooks.esim ? 0.14 : -0.14;
        const pStart = { x: lx + shiftX, y: isUp ? 0.78 : -0.78, z: idx === 1 ? 0.2 : -0.15 };
        const pEnd = {
          x: floraHooks.core ? lx : lx * 1.4,
          y: isUp ? -0.78 : 0.78,
          z: idx === 1 ? 0.2 : -0.15,
        };
        drawPacketArc3D(
          ctx,
          cx,
          cy,
          fov,
          dist,
          rx,
          ry,
          pStart,
          pEnd,
          0,
          floraHooks.core ? 0 : 0.35,
          isUp ? "rgba(56, 189, 248, 0.75)" : "rgba(251, 191, 36, 0.75)",
          (tSec * speed + idx * 0.33) % 1,
          { lineWidth: 1.7, dotColor: isUp ? "#7dd3fc" : "#fde68a", dotRadius: 3.6 },
        );
      });

      // Glowing Edge VR offload halo when Edge hook is enabled
      if (floraHooks.edge) {
        const edgeP = project(rot3D(0, -0.96, 0, rx, ry), cx, cy, fov, dist);
        ctx.strokeStyle = "rgba(94, 235, 199, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(edgeP.sx, edgeP.sy, 14 + Math.sin(tSec * 4) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      const activeCount = Object.values(floraHooks).filter(Boolean).length;
      drawPillLabel(
        ctx,
        cx,
        22,
        `PROGRAMMABLE STACK · ${activeCount}/4 LAYER HOOKS ACTIVE`,
        "#38bdf8",
        width,
        height,
        { fontSize: 10.5, boxH: 22 },
      );
    }

    function drawMobileVrScene(cx, cy, fov, dist, rx, ry, tSec) {
      const reactive = vrMode === "standard";

      // Head pose driven smoothly by pointer + 6DoF sweep
      const poseYaw = yaw + Math.sin(tSec * 1.5) * 0.45 + vrPointerX * 0.45;
      const posePitch = pitch + Math.cos(tSec * 1.2) * 0.22 + vrPointerY * 0.28;
      const lag = reactive ? 0.62 : 0.035;
      const ghostYaw = yaw + Math.sin(tSec * 1.5 - lag) * 0.45 + vrPointerX * 0.45 * (reactive ? 0.55 : 1);
      const ghostPitch = pitch + Math.cos(tSec * 1.2 - lag) * 0.22 + vrPointerY * 0.28 * (reactive ? 0.55 : 1);

      const headsetCenter = { x: -1.04, y: 0.04, z: 0 };
      const schedCenter = { x: 0.0, y: -0.42, z: 0.08 };
      const edgeCenter = { x: 1.06, y: 0.04, z: 0 };

      // 1. Left: 3D VR Headset 6DoF Pose Wireframe + Ghost Rendered Viewport Overlay
      const headProj = icoRaw.map((v) => {
        const rv = rot3D(v.x, v.y, v.z, posePitch, poseYaw);
        return project(
          { x: rv.x + headsetCenter.x, y: rv.y + headsetCenter.y, z: rv.z + headsetCenter.z },
          cx,
          cy,
          fov,
          dist,
        );
      });
      const ghostOffset = reactive ? 0.2 : 0.015;
      const ghostProj = icoRaw.map((v) => {
        const rv = rot3D(v.x, v.y, v.z, ghostPitch, ghostYaw);
        return project(
          {
            x: rv.x + headsetCenter.x + ghostOffset,
            y: rv.y + headsetCenter.y - ghostOffset * 0.35,
            z: rv.z + headsetCenter.z,
          },
          cx,
          cy,
          fov,
          dist,
        );
      });

      if (reactive) {
        // Lag drift tethers between true 6DoF head pose and delayed VR viewport
        ctx.strokeStyle = "rgba(251, 113, 133, 0.45)";
        ctx.lineWidth = 1;
        for (let i = 0; i < headProj.length; i += 2) {
          ctx.beginPath();
          ctx.moveTo(headProj[i].sx, headProj[i].sy);
          ctx.lineTo(ghostProj[i].sx, ghostProj[i].sy);
          ctx.stroke();
        }
      }

      // Draw Returned VR Viewport Frame (ghost crimson in Standard vs locked gold in Proactive)
      ctx.strokeStyle = reactive ? "rgba(251, 113, 133, 0.8)" : "rgba(251, 191, 36, 0.85)";
      ctx.lineWidth = 1.6;
      icoEdges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(ghostProj[a].sx, ghostProj[a].sy);
        ctx.lineTo(ghostProj[b].sx, ghostProj[b].sy);
        ctx.stroke();
      });

      // Draw Primary 6DoF VR Headset Wireframe (Electric Sky)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.96)";
      ctx.lineWidth = 1.9;
      icoEdges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(headProj[a].sx, headProj[a].sy);
        ctx.lineTo(headProj[b].sx, headProj[b].sy);
        ctx.stroke();
      });

      // 2. Center-Top: LTE Uplink Scheduler Gate
      const schedP = drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        schedCenter.x,
        schedCenter.y,
        schedCenter.z,
        0.54,
        0.24,
        0.34,
        reactive ? "#fb7185" : "#5eebc7",
        reactive ? "rgba(251, 113, 133, 0.16)" : "rgba(94, 235, 199, 0.16)",
      );

      // 3. Right: 3D Edge GPU Render Cube
      const edgeP = drawBox3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        edgeCenter.x,
        edgeCenter.y,
        edgeCenter.z,
        0.56,
        0.56,
        0.56,
        "#818cf8",
        "rgba(129, 140, 248, 0.16)",
      );

      // Wireless Uplink (Headset -> Scheduler -> Edge GPU)
      if (reactive) {
        // Packets pile up & stall in queue at LTE scheduler
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, headsetCenter, schedCenter, -0.14, 0, "rgba(251, 113, 133, 0.72)", (tSec * 0.55) % 1, { lineWidth: 1.8, dotColor: "#fda4af" });
        for (let q = 0; q < 4; q++) {
          const qp = project(rot3D(-0.34 - q * 0.08, -0.42, 0.08, rx, ry), cx, cy, fov, dist);
          ctx.fillStyle = "#fb7185";
          ctx.beginPath();
          ctx.arc(qp.sx, qp.sy, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, schedCenter, edgeCenter, -0.1, 0, "rgba(251, 191, 36, 0.55)", (tSec * 0.45) % 1, { dashed: true, dotColor: "#fde68a" });
      } else {
        // Pre-scheduled grants: fast unqueued uplink stream
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, headsetCenter, schedCenter, -0.14, 0, "rgba(56, 189, 248, 0.85)", (tSec * 1.6) % 1, { lineWidth: 2, dotColor: "#e0f2fe" });
        drawPacketArc3D(ctx, cx, cy, fov, dist, rx, ry, schedCenter, edgeCenter, -0.1, 0, "rgba(94, 235, 199, 0.9)", (tSec * 1.6 + 0.5) % 1, { lineWidth: 2.2, dotColor: "#a7f3d0" });
      }

      // Wireless Downlink (Edge GPU -> VR Display)
      drawPacketArc3D(
        ctx,
        cx,
        cy,
        fov,
        dist,
        rx,
        ry,
        edgeCenter,
        headsetCenter,
        0.52,
        0,
        reactive ? "rgba(251, 113, 133, 0.65)" : "rgba(251, 191, 36, 0.88)",
        (tSec * (reactive ? 0.55 : 1.55)) % 1,
        { lineWidth: 2, dotColor: reactive ? "#fda4af" : "#fde68a" },
      );

      const hcP = project(rot3D(headsetCenter.x, headsetCenter.y, headsetCenter.z, rx, ry), cx, cy, fov, dist);
      drawPillLabel(ctx, hcP.sx, hcP.sy + 68, "VR HEADSET (6DoF)", "#38bdf8", width, height);
      drawPillLabel(
        ctx,
        schedP.sx,
        schedP.sy - 26,
        reactive ? "LTE UPLINK · QUEUED" : "PRE-ALLOCATED GRANT",
        reactive ? "#fb7185" : "#5eebc7",
        width,
        height,
      );
      drawPillLabel(ctx, edgeP.sx, edgeP.sy + 56, "EDGE GPU RENDER", "#818cf8", width, height);
      drawPillLabel(
        ctx,
        cx,
        22,
        reactive
          ? "STANDARD (REACTIVE) · UPLINK QUEUEING & GHOST LAG"
          : "PROACTIVE (PREDICTED) · UNQUEUED UPLINK & POSE LOCKED",
        reactive ? "#fb7185" : "#5eebc7",
        width,
        height,
        { fontSize: 10.5, boxH: 22 },
      );
    }

    function drawAcemapStandby(cx, cy, fov, dist, rx, ry, tSec) {
      // Spiral standby galaxy before user clicks Load 2,208-Topic Galaxy
      for (let i = 0; i < 220; i++) {
        const arm = i % 4;
        const t = (i / 220) * 3.8;
        const angle = t * 2.1 + (arm * Math.PI) / 2 + tSec * 0.14;
        const rad = 0.14 + (i / 220) * 1.28;
        const rp = rot3D(
          Math.cos(angle) * rad,
          Math.sin(t * 3 + arm) * 0.14,
          Math.sin(angle) * rad,
          rx,
          ry,
        );
        const p = project(rp, cx, cy, fov, dist);
        ctx.fillStyle = ACEMAP_COLORS[i % ACEMAP_COLORS.length];
        ctx.globalAlpha = clamp((p.z + 1.4) / 2.6, 0.25, 0.92);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawPillLabel(
        ctx,
        cx,
        22,
        "ACEMAP GALAXY · CLICK LOAD TO STREAM 2,208 REAL TOPICS",
        "#fbbf24",
        width,
        height,
        { fontSize: 10.5, boxH: 22, textColor: "#fde68a" },
      );
    }

    function drawAcemapGalaxy(cx, cy, fov, dist) {
      const fovGal = fov * 1.06;
      const distGal = dist * 1.02;

      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        const rp = rot3D(s.x, s.y, s.z, pitch * 0.55, yaw * 0.6);
        const pr = project(rp, cx, cy, fovGal, distGal);
        s.sx = pr.sx;
        s.sy = pr.sy;
        s.depth = pr.z;
      }

      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        const active =
          acemapSelectedField === "all" ||
          s.field === Number(acemapSelectedField);
        if (!active) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
          ctx.fillRect(s.sx, s.sy, 1.5, 1.5);
          continue;
        }
        ctx.globalAlpha = clamp((s.depth + 1.4) / 2.6, 0.35, 0.96);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 3D-Projected Major Discipline Cluster Labels (with bounding-box collision rejection!)
      const placedBoxes = [];
      const maxLabels = width < 520 ? 5 : 9;
      for (let i = 0; i < acemapCentroids.length && placedBoxes.length < maxLabels; i++) {
        const c = acemapCentroids[i];
        if (
          acemapSelectedField !== "all" &&
          c.field !== Number(acemapSelectedField)
        ) {
          continue;
        }
        const rp = rot3D(c.x, c.y, c.z, pitch * 0.55, yaw * 0.6);
        const pr = project(rp, cx, cy, fovGal, distGal);
        const estW = c.name.length * 6.5 + 18;
        const estH = 22;
        const cand = { x: pr.sx - estW * 0.5, y: pr.sy - estH * 0.5, w: estW, h: estH };
        const collides = placedBoxes.some(
          (b) =>
            cand.x < b.x + b.w + 6 &&
            cand.x + cand.w + 6 > b.x &&
            cand.y < b.y + b.h + 4 &&
            cand.y + cand.h + 4 > b.y,
        );
        if (collides) continue;
        const box = drawPillLabel(
          ctx,
          pr.sx,
          pr.sy,
          c.name,
          c.color,
          width,
          height,
          { fontSize: 9.5, boxH: 18, bg: "rgba(4, 6, 14, 0.74)" },
        );
        placedBoxes.push(box);
      }

      // 3D Scholarly Neighbor Constellation Lines around hovered/selected star
      const focusIdx = acemapHovered >= 0 ? acemapHovered : acemapSelected;
      if (focusIdx >= 0 && acemapStars[focusIdx]) {
        const focus = acemapStars[focusIdx];
        const neighbors = [];
        for (let i = 0; i < acemapStars.length; i++) {
          if (i === focusIdx) continue;
          const s = acemapStars[i];
          if (
            acemapSelectedField !== "all" &&
            s.field !== Number(acemapSelectedField)
          ) {
            continue;
          }
          const d2 = (s.sx - focus.sx) ** 2 + (s.sy - focus.sy) ** 2;
          if (d2 < 8400) neighbors.push({ idx: i, d2 });
        }
        neighbors.sort((a, b) => a.d2 - b.d2);
        const topNeighbors = neighbors.slice(0, 7);

        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 1.25;
        topNeighbors.forEach(({ idx }) => {
          const nb = acemapStars[idx];
          ctx.beginPath();
          ctx.moveTo(focus.sx, focus.sy);
          ctx.lineTo(nb.sx, nb.sy);
          ctx.stroke();
        });

        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(focus.sx, focus.sy, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(focus.sx, focus.sy, 4.2, 0, Math.PI * 2);
        ctx.fill();

        drawPillLabel(
          ctx,
          focus.sx,
          focus.sy - 24,
          `${focus.name} · ${ACEMAP_FIELDS[focus.field]}`,
          "#fbbf24",
          width,
          height,
          { fontSize: 11, boxH: 23, textColor: "#fde68a" },
        );
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const tSec = elapsed * 0.001;
      drawBackgroundStars(tSec);

      const cx = width * 0.5;
      const cy = height * 0.53;
      const minDim = Math.min(width, height);
      const fov = minDim * (width > 760 ? 1.34 : 1.12);
      const dist = 4.0;
      const rx = pitch;
      const ry = yaw + Math.sin(tSec * 0.35) * 0.08;

      if (activeStation === "seed") {
        drawSeedScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "securesim") {
        drawSecureSimScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "gptcode") {
        drawGptCodeScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "sonica") {
        drawSonicaScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "flora") {
        drawFloraScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "vr") {
        drawMobileVrScene(cx, cy, fov, dist, rx, ry, tSec);
      } else if (activeStation === "acemap") {
        if (acemapLoaded) drawAcemapGalaxy(cx, cy, fov, dist);
        else drawAcemapStandby(cx, cy, fov, dist, rx, ry, tSec);
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;
      seedCycleClock += dt * 0.001;
      gptBeamClock += dt * 0.001;

      if (!dragging) {
        if (activeStation === "gptcode") {
          yaw += 0.00022 * dt;
        } else if (activeStation === "acemap" && acemapLoaded) {
          yaw += 0.00007 * dt;
        }
      }

      if (activeStation === "sonica") {
        wfTickAccum += dt;
        if (wfTickAccum > 90) {
          wfTickAccum = 0;
          pushWaterfallRow(elapsed * 0.001);
        }
      }

      if (
        activeStation === "acemap" &&
        acemapLoaded &&
        pointerCanvasX >= 0 &&
        !dragging
      ) {
        const nearest = findNearestAcemapStar(pointerCanvasX, pointerCanvasY, 22);
        if (nearest !== acemapHovered) {
          acemapHovered = nearest;
          if (nearest >= 0 && acemapNearestEl) {
            const s = acemapStars[nearest];
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
        }
      }

      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerCanvasX = e.clientX - rect.left;
      pointerCanvasY = e.clientY - rect.top;
      vrPointerX = clamp((pointerCanvasX / Math.max(1, rect.width)) * 2 - 1, -1, 1);
      vrPointerY = clamp((pointerCanvasY / Math.max(1, rect.height)) * 2 - 1, -1, 1);

      if (dragging) {
        yaw += (e.clientX - dragX) * 0.008;
        pitch = clamp(pitch + (e.clientY - dragY) * 0.008, -0.95, 0.95);
        dragX = e.clientX;
        dragY = e.clientY;
        if (!motionEnabled) draw();
      } else if (activeStation === "acemap" && acemapLoaded && !motionEnabled) {
        const nearest = findNearestAcemapStar(pointerCanvasX, pointerCanvasY, 22);
        if (nearest !== acemapHovered) {
          acemapHovered = nearest;
          if (nearest >= 0 && acemapNearestEl) {
            const s = acemapStars[nearest];
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
          draw();
        }
      }
    });

    canvas.addEventListener("click", (e) => {
      if (activeStation !== "acemap" || !acemapLoaded) return;
      const rect = canvas.getBoundingClientRect();
      const idx = findNearestAcemapStar(
        e.clientX - rect.left,
        e.clientY - rect.top,
        24,
      );
      if (idx >= 0) {
        acemapSelected = idx;
        if (acemapTopicSelect) acemapTopicSelect.value = String(idx);
        const s = acemapStars[idx];
        if (acemapNearestEl) {
          acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
        }
        draw();
      }
    });

    const endDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", () => {
      pointerCanvasX = -999;
      pointerCanvasY = -999;
      acemapHovered = -1;
      vrPointerX = 0;
      vrPointerY = 0;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(section);
    } else {
      visible = true;
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    selectStation("seed");
    resize();
    sync();
  }

  /* =========================================================
     7-DAY EDITION SWITCHER POPOVER
     ========================================================= */
  function initEditionSwitcher() {
    const toggle = $("#edition-toggle");
    const popover = $("#edition-popover");
    if (!toggle || !popover) return;

    function setOpen(open) {
      popover.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(popover.hidden);
    });

    document.addEventListener("click", (e) => {
      if (!popover.hidden && !popover.contains(e.target) && e.target !== toggle) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popover.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* =========================================================
     BOOT ALL 3D SPATIAL ENGINES SAFELY
     ========================================================= */
  try {
    initEditionSwitcher();
  } catch (e) {
    /* Graceful fallback */
  }
  try {
    initHeroGlobe();
  } catch (e) {
    /* Graceful fallback */
  }
  try {
    initBareMetalCube();
  } catch (e) {
    /* Graceful fallback */
  }
  try {
    initSculptureEngine();
  } catch (e) {
    /* Graceful fallback */
  }
})();
