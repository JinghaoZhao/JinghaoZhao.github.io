(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotion.matches;

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  let syncHeroScene = () => {};

  function applyMotionPreference() {
    motionEnabled = !reduceMotion.matches;
    if (!motionEnabled) {
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
    }
    syncHeroScene();
  }
  reduceMotion.addEventListener("change", applyMotionPreference);
  applyMotionPreference();

  // =========================
  // 1. REVEAL & SCROLL SPY
  // =========================
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.remove("is-pending");
          revealObs.unobserve(target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    $$(".reveal").forEach((el) => {
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("is-pending");
      }
      revealObs.observe(el);
    });
  }

  const header = $("#site-header");
  const hero = $("#large-header");
  const heroContent = $(".hero-content");
  const navLinks = $$(".site-nav a");
  const navSections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 36);

    let activeId = "";
    navSections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.36) {
        activeId = sec.id;
      }
    });
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#" + activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (hero && heroContent) {
      heroContent.style.transform =
        motionEnabled && y < hero.offsetHeight
          ? `translateY(${Math.min(y * 0.1, 70)}px)`
          : "";
    }
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  updateScroll();

  // =========================
  // 2. HERO 30FPS ISOMETRIC SILICON / FABRIC NODE FIELD
  // =========================
  function initHeroCanvas() {
    const canvas = $("#hero-canvas");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let nodes = [];
    let pulses = [];
    let cols = 10;
    let rows = 8;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let visible = true;

    let ptrX = 0.68;
    let ptrY = 0.48;
    let targetX = 0.68;
    let targetY = 0.48;

    let seed = 719;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    function buildGrid() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      seed = 719;
      cols = width < 640 ? 7 : 12;
      rows = width < 640 ? 7 : 9;
      nodes = [];
      pulses = [];

      const spacing = width < 640 ? 64 : Math.max(72, Math.min(104, width / 14));
      const originX = width * 0.56;
      const originY = height * 0.22;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const u = c - cols * 0.45;
          const v = r - rows * 0.35;
          const ix = originX + (u - v) * spacing * 0.86;
          const iy = originY + (u + v) * spacing * 0.46;
          nodes.push({
            c,
            r,
            x: ix,
            y: iy,
            phase: rand() * Math.PI * 2,
            heightBias: rand() * 8,
            isCore: (c + r) % 3 === 0,
            tile: spacing * 0.34,
          });
        }
      }

      const pulseCount = width < 640 ? 10 : 18;
      for (let i = 0; i < pulseCount; i++) {
        pulses.push({
          axis: i % 2, // 0 = along col, 1 = along row
          line: Math.floor(rand() * (i % 2 === 0 ? rows : cols)),
          t: rand(),
          speed: 0.08 + rand() * 0.14,
        });
      }
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const t = elapsed * 0.001;
      const mx = ptrX * width;
      const my = ptrY * height;
      const parX = (ptrX - 0.5) * 18;
      const parY = (ptrY - 0.5) * 12;

      // Ambient spotlight under cursor
      const spot = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(width, height) * 0.38);
      spot.addColorStop(0, "rgba(99, 216, 255, 0.13)");
      spot.addColorStop(0.45, "rgba(59, 130, 246, 0.05)");
      spot.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, width, height);

      // Compute projected positions
      const proj = new Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.hypot(dx, dy);
        const focus = Math.max(0, 1 - dist / 290);
        const wave = Math.sin(t * 1.15 + n.phase + n.c * 0.45 + n.r * 0.35) * 4.5;
        const lift = wave + focus * focus * 14 + (n.isCore ? 3 : 0);
        proj[i] = {
          x: n.x + parX * (0.4 + focus * 0.6),
          y: n.y + parY * (0.4 + focus * 0.6) - lift,
          focus,
          tile: n.tile,
          isCore: n.isCore,
        };
      }

      // Draw isometric fabric interconnect lines
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const a = proj[idx];
          if (c + 1 < cols) {
            const b = proj[idx + 1];
            const alpha = 0.07 + Math.max(a.focus, b.focus) * 0.28;
            ctx.strokeStyle = `rgba(99, 216, 255, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          if (r + 1 < rows) {
            const d = proj[idx + cols];
            const alpha = 0.07 + Math.max(a.focus, d.focus) * 0.28;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
          }
        }
      }

      // Draw traveling optical signal packets
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        const pos = (p.t + t * p.speed) % 1;
        let p0, p1;
        if (p.axis === 0) {
          const seg = pos * (cols - 1);
          const ci = Math.min(cols - 2, Math.floor(seg));
          const frac = seg - ci;
          const a = proj[p.line * cols + ci];
          const b = proj[p.line * cols + ci + 1];
          p0 = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
          const tail = Math.max(0, frac - 0.35);
          p1 = { x: a.x + (b.x - a.x) * tail, y: a.y + (b.y - a.y) * tail };
        } else {
          const seg = pos * (rows - 1);
          const ri = Math.min(rows - 2, Math.floor(seg));
          const frac = seg - ri;
          const a = proj[ri * cols + p.line];
          const b = proj[(ri + 1) * cols + p.line];
          p0 = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
          const tail = Math.max(0, frac - 0.35);
          p1 = { x: a.x + (b.x - a.x) * tail, y: a.y + (b.y - a.y) * tail };
        }
        const grad = ctx.createLinearGradient(p1.x, p1.y, p0.x, p0.y);
        grad.addColorStop(0, "rgba(99, 216, 255, 0)");
        grad.addColorStop(1, "rgba(160, 236, 255, 0.85)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p0.x, p0.y);
        ctx.stroke();

        ctx.fillStyle = "#c9f4ff";
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw machined silicon die pads
      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        if (!p.isCore && p.focus < 0.08) {
          // Minimal node pin
          ctx.fillStyle = "rgba(143, 163, 189, 0.28)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const w = p.tile * (0.72 + p.focus * 0.25);
        const h = w * 0.54;
        const thick = 5 + p.focus * 4;

        // Left & right machined side extrusions
        ctx.fillStyle = `rgba(11, 22, 42, ${(0.55 + p.focus * 0.35).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y);
        ctx.lineTo(p.x, p.y + h);
        ctx.lineTo(p.x, p.y + h + thick);
        ctx.lineTo(p.x - w, p.y + thick);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(7, 15, 30, ${(0.65 + p.focus * 0.3).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(p.x + w, p.y);
        ctx.lineTo(p.x, p.y + h);
        ctx.lineTo(p.x, p.y + h + thick);
        ctx.lineTo(p.x + w, p.y + thick);
        ctx.closePath();
        ctx.fill();

        // Top silicon die face
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - h);
        ctx.lineTo(p.x + w, p.y);
        ctx.lineTo(p.x, p.y + h);
        ctx.lineTo(p.x - w, p.y);
        ctx.closePath();
        ctx.fillStyle =
          p.focus > 0.12
            ? `rgba(24, 58, 98, ${(0.55 + p.focus * 0.38).toFixed(2)})`
            : "rgba(13, 24, 44, 0.72)";
        ctx.fill();
        ctx.strokeStyle = `rgba(99, 216, 255, ${(0.18 + p.focus * 0.62).toFixed(2)})`;
        ctx.lineWidth = p.focus > 0.2 ? 1.3 : 0.9;
        ctx.stroke();

        // Inner micro-die highlight
        if (p.focus > 0.25 || p.isCore) {
          ctx.fillStyle = `rgba(99, 216, 255, ${(0.22 + p.focus * 0.65).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8 + p.focus * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime || now - lastTime >= 32) {
        elapsed += lastTime ? Math.min(now - lastTime, 64) : 0;
        lastTime = now;
        ptrX += (targetX - ptrX) * 0.08;
        ptrY += (targetY - ptrY) * 0.08;
        draw();
      }
      rafId = requestAnimationFrame(tick);
    }

    syncHeroScene = () => {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    };

    hero.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        targetY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", () => {
      targetX = 0.68;
      targetY = 0.48;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncHeroScene();
      }).observe(hero);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(buildGrid).observe(hero);
    } else {
      window.addEventListener("resize", buildGrid, { passive: true });
    }

    buildGrid();
    syncHeroScene();
  }

  try {
    initHeroCanvas();
  } catch {
    // Decorative canvas failure must never block content.
  }

  document.addEventListener("visibilitychange", () => {
    syncHeroScene();
  });

  // =========================
  // 3. INTERACTIVE 3-LAYER STACK SHOWCASE
  // =========================
  const computeStage = $(".compute-stage");
  const stackReadout = $("#stack-readout");
  const stackPillars = $$(".stack-pillar");
  const isoLayers = $$(".iso-layer");
  const layerNames = {
    "1": "LAYER 01 // HOST & FABRIC",
    "2": "LAYER 02 // FLEET LIFECYCLE",
    "3": "LAYER 03 // END-TO-END BEHAVIOR",
  };

  function selectLayer(layerId) {
    if (!computeStage || !layerNames[layerId]) return;
    computeStage.dataset.activeLayer = layerId;
    if (stackReadout) stackReadout.textContent = layerNames[layerId];
    stackPillars.forEach((btn) => {
      const active = btn.dataset.layer === layerId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  stackPillars.forEach((btn) => {
    btn.addEventListener("click", () => selectLayer(btn.dataset.layer));
    btn.addEventListener("mouseenter", () => {
      if (finePointer.matches) selectLayer(btn.dataset.layer);
    });
  });

  isoLayers.forEach((layer) => {
    const id = layer.dataset.isoLayer;
    layer.addEventListener("click", () => selectLayer(id));
    layer.addEventListener("mouseenter", () => {
      if (finePointer.matches) selectLayer(id);
    });
    layer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectLayer(id);
      }
    });
  });

  // =========================
  // 4. BENTO SPOTLIGHT CURSOR TRACKING (--mx, --my)
  // =========================
  if (finePointer.matches) {
    $$(".bento-card").forEach((card) => {
      card.addEventListener(
        "pointermove",
        (e) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${(e.clientX - rect.left).toFixed(1)}px`);
          card.style.setProperty("--my", `${(e.clientY - rect.top).toFixed(1)}px`);
        },
        { passive: true },
      );
    });
  }

  // =========================
  // 5. ACEMAP DARK-MODE 2,208-TOPIC STARFIELD
  // =========================
  const acemapCanvas = $("#acemap-canvas");
  const starfieldStage = $("#starfield-stage");
  const mapLoadBtn = $("#map-load");
  const mapControls = $("#map-controls");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  const mapStatus = $("#map-status");
  const hudMode = $("#hud-mode");
  const hudReadout = $("#hud-readout");
  const tooltip = $("#starfield-tooltip");

  const FIELDS = [
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

  // Exact CSV source colors (luminous pastel palette reads crisply on obsidian)
  const SOURCE_COLORS = [
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

  let acemapLoaded = false;
  let points = [];
  let selectedField = "all";
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let mapW = 600;
  let mapH = 375;

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

  function resizeAcemapCanvas() {
    if (!acemapCanvas || !starfieldStage) return;
    const rect = starfieldStage.getBoundingClientRect();
    mapW = Math.max(300, rect.width);
    mapH = Math.max(200, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    acemapCanvas.width = Math.round(mapW * dpr);
    acemapCanvas.height = Math.round(mapH * dpr);
    const ctx = acemapCanvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (acemapLoaded && points.length) {
      projectPoints();
      renderStarfield();
    } else {
      renderStandbyPreview();
    }
  }

  function renderStandbyPreview() {
    if (!acemapCanvas) return;
    const ctx = acemapCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, mapW, mapH);

    const cx = mapW / 2;
    const cy = mapH / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(99, 216, 255, 0.18)";
    ctx.lineWidth = 1;
    [
      [mapW * 0.32, mapH * 0.28, -0.38],
      [mapW * 0.25, mapH * 0.36, 0.52],
      [mapW * 0.16, mapH * 0.38, 0.95],
    ].forEach(([rx, ry, rot]) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.stroke();
    });

    const stars = [
      [0.24, 0.34, 4.5, "#63d8ff"],
      [0.5, 0.18, 3.5, "#beeb74"],
      [0.74, 0.3, 5, "#ffbd71"],
      [0.78, 0.64, 3.5, "#ffc1fc"],
      [0.52, 0.82, 4.5, "#5eebc7"],
      [0.25, 0.72, 3.5, "#e0d4ff"],
      [0.5, 0.5, 6.5, "#63d8ff"],
    ];

    ctx.strokeStyle = "rgba(99, 216, 255, 0.22)";
    ctx.beginPath();
    for (let i = 0; i < stars.length - 1; i++) {
      const a = stars[i];
      const b = stars[(i + 1) % (stars.length - 1)];
      ctx.moveTo(a[0] * mapW, a[1] * mapH);
      ctx.lineTo(b[0] * mapW, b[1] * mapH);
    }
    ctx.stroke();

    stars.forEach(([sx, sy, r, col]) => {
      const x = sx * mapW;
      const y = sy * mapH;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
      g.addColorStop(0, col);
      g.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#eef4fc";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  let bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  function projectPoints() {
    const padX = 28;
    const padTop = 36;
    const padBot = 24;
    const availW = mapW - padX * 2;
    const availH = mapH - padTop - padBot;
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(availW / spanX, availH / spanY);
    const offX = padX + (availW - spanX * scale) / 2;
    const offY = padTop + (availH - spanY * scale) / 2;
    for (let i = 0; i < points.length; i++) {
      points[i].px = (points[i].x - bounds.minX) * scale + offX;
      points[i].py = (points[i].y - bounds.minY) * scale + offY;
    }
  }

  function isActivePoint(i) {
    return selectedField === "all" || points[i].field === Number(selectedField);
  }

  function findNearestNeighbors(idx, count) {
    const target = points[idx];
    const best = [];
    for (let i = 0; i < points.length; i++) {
      if (i === idx || !isActivePoint(i)) continue;
      const dx = points[i].px - target.px;
      const dy = points[i].py - target.py;
      const d2 = dx * dx + dy * dy;
      if (best.length < count || d2 < best[best.length - 1].d2) {
        best.push({ i, d2 });
        best.sort((a, b) => a.d2 - b.d2);
        if (best.length > count) best.pop();
      }
    }
    return best;
  }

  function renderStarfield() {
    if (!acemapCanvas) return;
    const ctx = acemapCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, mapW, mapH);

    // Draw inactive points first (faint deep-field dust)
    for (let i = 0; i < points.length; i++) {
      if (isActivePoint(i)) continue;
      const p = points[i];
      ctx.fillStyle = "rgba(143, 163, 189, 0.08)";
      ctx.fillRect(p.px - 0.8, p.py - 0.8, 1.6, 1.6);
    }

    // Draw active points
    for (let i = 0; i < points.length; i++) {
      if (!isActivePoint(i)) continue;
      const p = points[i];
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 1.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw nearest-neighbor constellation for hovered or selected point
    const focusIdx = hoveredIdx >= 0 ? hoveredIdx : selectedIdx;
    if (focusIdx >= 0 && points[focusIdx]) {
      const p = points[focusIdx];
      const neighbors = findNearestNeighbors(focusIdx, 5);

      ctx.strokeStyle = "rgba(99, 216, 255, 0.45)";
      ctx.lineWidth = 1;
      neighbors.forEach(({ i }) => {
        const n = points[i];
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(n.px, n.py);
        ctx.stroke();

        ctx.fillStyle = "#eef4fc";
        ctx.beginPath();
        ctx.arc(n.px, n.py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Outer reticle ring
      const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, 18);
      glow.addColorStop(0, "rgba(99, 216, 255, 0.55)");
      glow.addColorStop(1, "rgba(99, 216, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#63d8ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 7.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function findNearestPointerPoint(clientX, clientY, maxDist) {
    const rect = acemapCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = -1;
    let bestD2 = maxDist * maxDist;
    for (let i = 0; i < points.length; i++) {
      if (!isActivePoint(i)) continue;
      const dx = points[i].px - x;
      const dy = points[i].py - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  function syncFieldFilter() {
    selectedField = fieldSelect.value;
    hoveredIdx = -1;
    selectedIdx = -1;
    if (tooltip) tooltip.hidden = true;
    topicSelect.replaceChildren(new Option("Choose a topic", ""));

    let count = 0;
    for (let i = 0; i < points.length; i++) {
      if (isActivePoint(i)) {
        count++;
        topicSelect.add(new Option(points[i].name, String(i)));
      }
    }
    const label =
      selectedField === "all" ? "All fields" : FIELDS[Number(selectedField)];
    if (mapStatus) {
      mapStatus.textContent = `${label} · ${count.toLocaleString()} topics.`;
    }
    if (hudReadout) {
      hudReadout.textContent = `${label.toUpperCase()} · ${count.toLocaleString()} NODES`;
    }
    renderStarfield();
  }

  if (mapLoadBtn && acemapCanvas) {
    if ("ResizeObserver" in window && starfieldStage) {
      new ResizeObserver(resizeAcemapCanvas).observe(starfieldStage);
    } else {
      window.addEventListener("resize", resizeAcemapCanvas, { passive: true });
    }
    resizeAcemapCanvas();

    mapLoadBtn.addEventListener("click", async () => {
      mapLoadBtn.disabled = true;
      mapLoadBtn.textContent = "Loading dataset…";
      if (mapStatus) mapStatus.textContent = "Fetching ../../data/data.csv…";
      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Dataset unavailable");
        const rows = parseCSV(await res.text()).slice(1);
        points = rows
          .map((r) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            name: r[3],
            color: r[4],
            field: SOURCE_COLORS.indexOf(r[4]),
            px: 0,
            py: 0,
          }))
          .filter(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
          );
        if (!points.length) throw new Error("Empty dataset");

        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        bounds = {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
        };

        acemapLoaded = true;
        FIELDS.forEach((name, i) => {
          fieldSelect.add(new Option(name, String(i)));
        });

        mapLoadBtn.hidden = true;
        if (mapControls) mapControls.hidden = false;
        if (hudMode) hudMode.textContent = "LIVE // STARFIELD ACTIVE";

        projectPoints();
        syncFieldFilter();
        fieldSelect.focus({ preventScroll: true });
      } catch {
        mapLoadBtn.disabled = false;
        mapLoadBtn.textContent = "Retry loading starfield ↗";
        if (mapStatus) {
          mapStatus.textContent =
            "Could not load data.csv locally. Use a local server or visit Acemap directly.";
        }
      }
    });

    fieldSelect.addEventListener("change", syncFieldFilter);

    topicSelect.addEventListener("change", () => {
      selectedIdx = topicSelect.value === "" ? -1 : Number(topicSelect.value);
      hoveredIdx = -1;
      if (tooltip) tooltip.hidden = true;
      if (selectedIdx >= 0 && points[selectedIdx]) {
        const p = points[selectedIdx];
        if (mapStatus) {
          mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
        }
        if (hudReadout) {
          hudReadout.textContent = `${p.name.toUpperCase()} // ${FIELDS[p.field].toUpperCase()}`;
        }
      } else {
        syncFieldFilter();
        return;
      }
      renderStarfield();
    });

    acemapCanvas.addEventListener("pointermove", (e) => {
      if (!acemapLoaded) return;
      const idx = findNearestPointerPoint(e.clientX, e.clientY, 18);
      if (idx === hoveredIdx) return;
      hoveredIdx = idx;
      renderStarfield();

      if (idx >= 0 && points[idx]) {
        const p = points[idx];
        if (mapStatus) mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
        if (tooltip) {
          tooltip.textContent = `${p.name} · ${FIELDS[p.field]}`;
          tooltip.hidden = false;
          const left = Math.min(mapW - 220, Math.max(12, p.px + 12));
          const top = Math.max(36, p.py - 34);
          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      } else if (tooltip) {
        tooltip.hidden = true;
      }
    });

    acemapCanvas.addEventListener("pointerleave", () => {
      if (!acemapLoaded) return;
      hoveredIdx = -1;
      if (tooltip) tooltip.hidden = true;
      renderStarfield();
    });

    acemapCanvas.addEventListener("click", (e) => {
      if (!acemapLoaded) return;
      const idx = findNearestPointerPoint(e.clientX, e.clientY, 22);
      if (idx < 0) return;
      selectedIdx = idx;
      topicSelect.value = String(idx);
      const p = points[idx];
      if (mapStatus) mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
      if (hudReadout) {
        hudReadout.textContent = `${p.name.toUpperCase()} // ${FIELDS[p.field].toUpperCase()}`;
      }
      renderStarfield();
    });
  }

  // =========================
  // 6. PUBLICATIONS FILTER LEDGER
  // =========================
  const filterBtns = $$(".publication-filters button[data-filter]");
  const pubGroups = $$(".publication-group");
  const pubCount = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    filterBtns.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.filter === kind));
    });
    const visibleGroups = pubGroups.filter((g) => !g.hidden);
    const total = visibleGroups.reduce(
      (sum, g) => sum + g.querySelectorAll(".pub-row").length,
      0,
    );
    const years = visibleGroups.flatMap((g) =>
      $$(".pub-year", g).map((el) => Number(el.textContent)),
    );
    if (pubCount && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCount.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubAnchor);
  syncPubAnchor();
})();
