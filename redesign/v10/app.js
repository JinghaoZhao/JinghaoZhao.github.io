/* ==========================================================================
   Version 10: Japanese Zen Wabi-Sabi & Generative Ink-Wash Studio
   Interactive Sumi-e Canvas, Architectural Shoji, Seven-Leaf Byōbu & Acemap
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const body = document.body;
  const reduceMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const finePointerQuery = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );
  let motionEnabled = !reduceMotionQuery.matches;

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* ------------------------------------------------------------------------
     Motion Preference Sync & Reveal Observer
     ------------------------------------------------------------------------ */
  const motionListeners = new Set();

  function syncMotionState() {
    motionEnabled = !reduceMotionQuery.matches;
    body.classList.toggle("motion-enabled", motionEnabled);
    body.classList.toggle("motion-paused", !motionEnabled);
    if (!motionEnabled) {
      $$(".reveal.is-pending").forEach((el) =>
        el.classList.remove("is-pending")
      );
    }
    motionListeners.forEach((fn) => fn(motionEnabled));
  }

  if (reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener("change", syncMotionState);
  }
  syncMotionState();

  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-pending");
          revealObs.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );
    $$(".reveal").forEach((el) => {
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("is-pending");
      }
      revealObs.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     Header Scroll State & Active Section Highlighting
     ------------------------------------------------------------------------ */
  const header = $("#site-header");
  const navLinks = $$(".site-nav a");
  const navSections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);
  let scrollQueued = false;

  function onScrollFrame() {
    scrollQueued = false;
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 36);
    }
    let currentId = "";
    const cutoff = window.innerHeight * 0.36;
    navSections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= cutoff) {
        currentId = sec.id;
      }
    });
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
    { passive: true }
  );
  onScrollFrame();

  /* ------------------------------------------------------------------------
     1. HERO: Interactive Sumi-e Fluid Ink & Water-Ripple Canvas
     ------------------------------------------------------------------------ */
  function initHeroInkCanvas() {
    const hero = $("#hero");
    const canvas = $("#hero-ink-canvas");
    if (!hero || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let rafId = 0;
    let lastTs = 0;
    let simTime = 0;
    let visible = true;

    const inkPlumes = [];
    const ripples = [];
    const ambientClouds = [];

    let lastPtrX = null;
    let lastPtrY = null;

    function seedAmbientClouds() {
      ambientClouds.length = 0;
      const count = w < 640 ? 5 : 8;
      for (let i = 0; i < count; i++) {
        ambientClouds.push({
          x: w * (0.28 + (i / count) * 0.7),
          y: h * (0.18 + ((i * 37) % 64) / 100),
          rx: Math.min(w, h) * (0.22 + (i % 3) * 0.1),
          ry: Math.min(w, h) * (0.14 + ((i + 1) % 3) * 0.08),
          phase: i * 1.15,
          speed: 0.16 + (i % 4) * 0.05,
          indigo: i % 2 === 0,
        });
      }
    }

    function spawnPlume(x, y, vx, vy, indigo, vermilion) {
      if (inkPlumes.length > 90) inkPlumes.shift();
      inkPlumes.push({
        x,
        y,
        vx: vx * 0.14 + (Math.random() - 0.5) * 0.35,
        vy: vy * 0.14 + (Math.random() - 0.5) * 0.35,
        r: 14 + Math.random() * 20,
        grow: 0.45 + Math.random() * 0.55,
        alpha: vermilion ? 0.24 : 0.16 + Math.random() * 0.08,
        life: 0,
        maxLife: 110 + Math.random() * 75,
        indigo,
        vermilion: Boolean(vermilion),
        seed: Math.random() * Math.PI * 2,
      });
    }

    function spawnRipple(x, y, accent) {
      if (ripples.length > 26) ripples.shift();
      ripples.push({
        x,
        y,
        r: 8,
        maxR: accent ? Math.min(w, h) * 0.32 : 95 + Math.random() * 70,
        speed: accent ? 1.55 : 0.95 + Math.random() * 0.45,
        alpha: accent ? 0.36 : 0.2,
        accent: Boolean(accent),
      });
    }

    function resize() {
      const rect = hero.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedAmbientClouds();
      draw(0);
    }

    function drawStaticComposition() {
      ctx.clearRect(0, 0, w, h);
      // Warm handmade washi base gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#f5f1e8");
      bg.addColorStop(0.55, "#f2ede2");
      bg.addColorStop(1, "#eae3d3");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Layered atmospheric sumi-e ink-wash mist
      ambientClouds.forEach((c) => {
        const cx = c.x + Math.sin(simTime * c.speed + c.phase) * 38;
        const cy = c.y + Math.cos(simTime * c.speed * 0.8 + c.phase) * 24;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, c.rx);
        if (c.indigo) {
          grad.addColorStop(0, "rgba(29, 59, 92, 0.135)");
          grad.addColorStop(0.55, "rgba(29, 59, 92, 0.05)");
          grad.addColorStop(1, "rgba(29, 59, 92, 0)");
        } else {
          grad.addColorStop(0, "rgba(23, 22, 20, 0.105)");
          grad.addColorStop(0.55, "rgba(23, 22, 20, 0.035)");
          grad.addColorStop(1, "rgba(23, 22, 20, 0)");
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, c.ry / c.rx);
        ctx.translate(-cx, -cy);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, c.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Serene flowing water-ink current ribbons across the right side
      const ribbons = w < 640 ? 4 : 7;
      for (let i = 0; i < ribbons; i++) {
        const yBase = h * (0.24 + i * 0.105);
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 24) {
          const wave =
            Math.sin(x * 0.0042 + simTime * 0.45 + i * 0.9) * (16 + i * 4) +
            Math.cos(x * 0.0085 - simTime * 0.3 + i) * 7;
          const y = yBase + wave;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          i % 2 === 0
            ? `rgba(29, 59, 92, ${0.065 + i * 0.01})`
            : `rgba(23, 22, 20, ${0.055 + i * 0.008})`;
        ctx.lineWidth = 1.1 + (i % 3) * 0.45;
        ctx.stroke();
      }
    }

    function draw(dt) {
      drawStaticComposition();

      // Autonomous tranquil ink drops so mobile & idle screens stay gently alive
      if (motionEnabled && dt > 0 && Math.random() < 0.014) {
        const rx = w * (0.42 + Math.random() * 0.5);
        const ry = h * (0.2 + Math.random() * 0.58);
        spawnRipple(rx, ry, false);
        spawnPlume(rx, ry, 0, 0, Math.random() > 0.35, false);
      }

      // Draw & update fluid ink plumes
      for (let i = inkPlumes.length - 1; i >= 0; i--) {
        const p = inkPlumes[i];
        if (dt > 0) {
          p.life += dt * 60;
          const curl =
            Math.sin(p.x * 0.006 + simTime * 0.7 + p.seed) * 0.22 +
            Math.cos(p.y * 0.006 - simTime * 0.5) * 0.18;
          p.x += p.vx + Math.cos(curl) * 0.28;
          p.y += p.vy + Math.sin(curl) * 0.24;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.r += p.grow * (dt * 60);
        }
        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          inkPlumes.splice(i, 1);
          continue;
        }
        const fade = Math.sin(progress * Math.PI) * p.alpha;
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
        if (p.vermilion) {
          grad.addColorStop(0, `rgba(194, 59, 34, ${fade * 0.9})`);
          grad.addColorStop(0.5, `rgba(29, 59, 92, ${fade * 0.45})`);
          grad.addColorStop(1, "rgba(29, 59, 92, 0)");
        } else if (p.indigo) {
          grad.addColorStop(0, `rgba(29, 59, 92, ${fade})`);
          grad.addColorStop(0.6, `rgba(29, 59, 92, ${fade * 0.32})`);
          grad.addColorStop(1, "rgba(29, 59, 92, 0)");
        } else {
          grad.addColorStop(0, `rgba(23, 22, 20, ${fade})`);
          grad.addColorStop(0.6, `rgba(23, 22, 20, ${fade * 0.3})`);
          grad.addColorStop(1, "rgba(23, 22, 20, 0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw & update concentric water ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        if (dt > 0) {
          rp.r += rp.speed * (dt * 60);
        }
        const progress = rp.r / rp.maxR;
        if (progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const a = (1 - progress) * rp.alpha;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.accent
          ? `rgba(194, 59, 34, ${a * 0.85})`
          : `rgba(29, 59, 92, ${a})`;
        ctx.lineWidth = rp.accent ? 1.5 : 1.05;
        ctx.stroke();

        if (rp.r > 18) {
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r * 0.68, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(23, 22, 20, ${a * 0.45})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    function tick(ts) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTs = 0;
        return;
      }
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      simTime += dt;
      draw(dt);
      rafId = requestAnimationFrame(tick);
    }

    function syncLoop() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        draw(0);
      }
    }

    hero.addEventListener(
      "pointermove",
      (ev) => {
        if (!motionEnabled || !finePointerQuery.matches) return;
        const rect = hero.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const vx = lastPtrX === null ? 0 : x - lastPtrX;
        const vy = lastPtrY === null ? 0 : y - lastPtrY;
        const dist = Math.hypot(vx, vy);
        if (dist > 10 || lastPtrX === null) {
          spawnPlume(x, y, vx, vy, Math.random() > 0.42, false);
          if (dist > 28) spawnRipple(x, y, false);
          lastPtrX = x;
          lastPtrY = y;
        }
      },
      { passive: true }
    );

    hero.addEventListener("pointerleave", () => {
      lastPtrX = null;
      lastPtrY = null;
    });

    canvas.addEventListener("click", (ev) => {
      const rect = hero.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      spawnRipple(x, y, true);
      spawnPlume(x, y, 0, 0, true, true);
      if (!motionEnabled) draw(0);
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          syncLoop();
        },
        { threshold: 0.01 }
      ).observe(hero);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(hero);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    document.addEventListener("visibilitychange", syncLoop);
    motionListeners.add(syncLoop);

    resize();
    syncLoop();
  }

  /* ------------------------------------------------------------------------
     2. ARCHITECTURAL SHOJI / CEDAR LATTICE STUDY
     ------------------------------------------------------------------------ */
  function initShojiStudy() {
    const study = $("#shoji-study");
    if (!study) return;
    const tabs = $$('[role="tab"]', study);
    const panels = $$('[role="tabpanel"]', study);
    const stage = $(".shoji-stage", study);
    let slideTimer = 0;

    function activateStratum(index) {
      const safeIdx = ((index % tabs.length) + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === safeIdx));
      });
      panels.forEach((panel, i) => {
        panel.hidden = i !== safeIdx;
      });
      if (stage) {
        stage.dataset.activeStratum = String(safeIdx);
        if (motionEnabled) {
          stage.classList.add("is-sliding");
          clearTimeout(slideTimer);
          slideTimer = setTimeout(() => {
            stage.classList.remove("is-sliding");
          }, 340);
        }
      }
    }

    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => activateStratum(idx));
      tab.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowRight") {
          ev.preventDefault();
          const next = (idx + 1) % tabs.length;
          activateStratum(next);
          tabs[next].focus();
        } else if (ev.key === "ArrowLeft") {
          ev.preventDefault();
          const prev = (idx - 1 + tabs.length) % tabs.length;
          activateStratum(prev);
          tabs[prev].focus();
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. SEVEN-LEAF INTERACTIVE BYOBU & BESPOKE GENERATIVE ZEN CANVASES
     ------------------------------------------------------------------------ */
  const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

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

  const ACEMAP_SOURCE_COLORS = [
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

  // Refined traditional Japanese natural mineral & ai-zome pigments on washi
  const ACEMAP_WASHI_COLORS = [
    "#6b4c7a", // Fuji-murasaki
    "#4f6f3e", // Matsuba
    "#56538a", // Kikyo
    "#a8543d", // Bengara
    "#1d3b5c", // Ai-zome (Computer Science)
    "#7e7634", // Uguisu
    "#2c6787", // Hanada
    "#9a6838", // Kohaku
    "#1f7368", // Seiji
    "#73597a", // Ebizome
    "#206f82", // Asagi
    "#467464", // Rokusho
    "#7a7b3d", // Koke
    "#44724a", // Tokiwa
    "#944e6a", // Suo
    "#a35547", // Akane
    "#8e475e", // Enji
    "#3a7351", // Chigusa
    "#8d6f32", // Kitsune
  ];

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

  function createZenArtwork(kind, canvas, leafEl) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { resize() {}, draw() {} };
    }
    let w = 400;
    let h = 300;
    let t = 0;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ----- I. SEED: Karesansui Dry Stone Garden ----- */
    if (kind === "seed") {
      const faults = [];
      const stones = [
        { rx: 0.32, ry: 0.52, r: 26, rxScale: 1.32, ryScale: 0.86 },
        { rx: 0.65, ry: 0.44, r: 19, rxScale: 1.18, ryScale: 0.92 },
        { rx: 0.54, ry: 0.66, r: 12, rxScale: 1.25, ryScale: 0.85 },
      ];

      function triggerFault(nx, ny) {
        faults.push({
          x: nx !== undefined ? nx : 0.25 + Math.random() * 0.52,
          y: ny !== undefined ? ny : 0.28 + Math.random() * 0.44,
          age: 0,
          duration: 4.8,
        });
        if (faults.length > 5) faults.shift();
      }

      canvas.addEventListener("click", (ev) => {
        const rect = canvas.getBoundingClientRect();
        triggerFault(
          (ev.clientX - rect.left) / rect.width,
          (ev.clientY - rect.top) / rect.height
        );
        if (!motionEnabled) draw(0.35);
      });

      const btn = $("[data-seed-trigger]", leafEl);
      if (btn) {
        btn.addEventListener("click", () => {
          triggerFault();
          if (!motionEnabled) draw(0.35);
        });
      }

      function draw(dt) {
        t += dt;
        for (let i = faults.length - 1; i >= 0; i--) {
          faults[i].age += dt;
          if (faults[i].age >= faults[i].duration) faults.splice(i, 1);
        }

        // Warm raked gravel base
        ctx.fillStyle = "#efe9db";
        ctx.fillRect(0, 0, w, h);

        // Horizontal raked gravel lines that part smoothly around stones & vibrate during fault
        const spacing = 11;
        for (let y = 16; y < h - 16; y += spacing) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            let dy = Math.sin(x * 0.015 + y * 0.02 + t * 0.45) * 1.4;
            // Bend around garden stones
            stones.forEach((s) => {
              const sx = s.rx * w;
              const sy = s.ry * h;
              const dist = Math.hypot((x - sx) * 0.85, y - sy);
              const influence = s.r * 3.1;
              if (dist < influence) {
                const push = Math.cos((dist / influence) * (Math.PI * 0.5));
                dy += (y >= sy ? 1 : -1) * push * push * (s.r * 0.72);
              }
            });
            // Vermilion disturbance ripple + indigo healing wave
            faults.forEach((f) => {
              const fx = f.x * w;
              const fy = f.y * h;
              const dist = Math.hypot(x - fx, y - fy);
              const waveR = f.age * 95;
              const healR = Math.max(0, (f.age - 1.35) * 105);
              const band = Math.exp(-Math.pow((dist - waveR) / 26, 2));
              const healed = dist < healR ? 0.12 : 1;
              const decay = Math.max(0, 1 - f.age / f.duration);
              dy += Math.sin(dist * 0.18 - f.age * 7) * 9.5 * band * healed * decay;
            });

            if (x === 0) ctx.moveTo(x, y + dy);
            else ctx.lineTo(x, y + dy);
          }
          ctx.strokeStyle = "rgba(87, 83, 75, 0.25)";
          ctx.lineWidth = 1.05;
          ctx.stroke();
        }

        // Concentric sand rings around each stone
        stones.forEach((s) => {
          const sx = s.rx * w;
          const sy = s.ry * h;
          for (let k = 1; k <= 4; k++) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(s.rxScale, s.ryScale);
            ctx.beginPath();
            ctx.arc(0, 0, s.r + k * 9.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(29, 59, 92, ${0.22 - k * 0.035})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }

          // Slate garden stone
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(s.rxScale, s.ryScale);
          const grad = ctx.createRadialGradient(-s.r * 0.3, -s.r * 0.3, 2, 0, 0, s.r);
          grad.addColorStop(0, "#4b4a45");
          grad.addColorStop(1, "#1f1e1c");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Fault vermilion ripple & indigo recovery sweep
        faults.forEach((f) => {
          const fx = f.x * w;
          const fy = f.y * h;
          const decay = Math.max(0, 1 - f.age / f.duration);
          const waveR = f.age * 95;

          ctx.beginPath();
          ctx.arc(fx, fy, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(194, 59, 34, ${0.65 * decay})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          if (f.age > 1.05) {
            const healR = (f.age - 1.05) * 105;
            ctx.beginPath();
            ctx.arc(fx, fy, healR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(29, 59, 92, ${0.72 * decay})`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }
        });
      }

      return { resize, draw };
    }

    /* ----- II. SecureSIM: Interlocking Kumiko Wooden Lattice Lock ----- */
    if (kind === "securesim") {
      let lockedTarget = 1; // 1 = aligned/verified, 0 = rotated/guarded
      let alignment = 0.25;
      let autoCycle = 0;

      function toggleLock() {
        lockedTarget = lockedTarget > 0.5 ? 0 : 1;
        if (!motionEnabled) {
          alignment = lockedTarget;
          draw(0);
        }
      }

      canvas.addEventListener("click", toggleLock);
      const btn = $("[data-securesim-trigger]", leafEl);
      if (btn) btn.addEventListener("click", toggleLock);

      function drawKumikoRing(cx, cy, radius, spokes, angle, strokeColor) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.25;

        // Outer polygon
        ctx.beginPath();
        for (let i = 0; i <= spokes; i++) {
          const a = (i / spokes) * Math.PI * 2;
          const px = Math.cos(a) * radius;
          const py = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Asanoha star ribs
        for (let i = 0; i < spokes; i++) {
          const a = (i / spokes) * Math.PI * 2;
          const aNext = ((i + 1) / spokes) * Math.PI * 2;
          const midA = (a + aNext) * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.42);
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.moveTo(Math.cos(midA) * radius * 0.65, Math.sin(midA) * radius * 0.65);
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.lineTo(Math.cos(midA) * radius * 0.65, Math.sin(midA) * radius * 0.65);
          ctx.stroke();
        }

        // Keyway notch at 0 rad (horizontal right) and PI rad (horizontal left)
        ctx.fillStyle = "#f1ecdf";
        ctx.fillRect(radius * 0.66, -7, radius * 0.38, 14);
        ctx.fillRect(-radius * 1.04, -7, radius * 0.38, 14);

        ctx.restore();
      }

      function draw(dt) {
        t += dt;
        autoCycle += dt;
        if (dt > 0) {
          alignment += (lockedTarget - alignment) * Math.min(1, dt * 3.2);
        }

        ctx.fillStyle = "#f1ecdf";
        ctx.fillRect(0, 0, w, h);

        // Subtle cedar lattice background
        ctx.strokeStyle = "rgba(185, 173, 148, 0.22)";
        ctx.lineWidth = 1;
        for (let x = 24; x < w; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 24; y < h; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const cx = w * 0.5;
        const cy = h * 0.48;
        const baseR = Math.min(w, h) * 0.36;
        const misalign = 1 - alignment;

        const r1Angle = misalign * (0.65 + Math.sin(t * 0.55) * 0.14);
        const r2Angle = -misalign * (0.9 + Math.cos(t * 0.48) * 0.16);
        const r3Angle = misalign * (1.2 + Math.sin(t * 0.72) * 0.12);

        // Indigo light ray emerging when aligned
        if (alignment > 0.35) {
          const beamAlpha = (alignment - 0.35) / 0.65;
          const beamGrad = ctx.createLinearGradient(0, cy, w, cy);
          beamGrad.addColorStop(0, `rgba(29, 59, 92, ${0.06 * beamAlpha})`);
          beamGrad.addColorStop(0.5, `rgba(29, 59, 92, ${0.42 * beamAlpha})`);
          beamGrad.addColorStop(1, `rgba(29, 59, 92, ${0.08 * beamAlpha})`);
          ctx.fillStyle = beamGrad;
          ctx.fillRect(0, cy - 11 * beamAlpha, w, 22 * beamAlpha);

          ctx.beginPath();
          ctx.moveTo(0, cy);
          ctx.lineTo(w, cy);
          ctx.strokeStyle = `rgba(29, 59, 92, ${0.85 * beamAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        drawKumikoRing(cx, cy, baseR, 12, r1Angle, "rgba(23, 22, 20, 0.34)");
        drawKumikoRing(cx, cy, baseR * 0.72, 12, r2Angle, "rgba(29, 59, 92, 0.52)");
        drawKumikoRing(cx, cy, baseR * 0.44, 6, r3Angle, "rgba(23, 22, 20, 0.58)");

        // Center aperture seal
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fillStyle = alignment > 0.85 ? "#1d3b5c" : "#c23b22";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 17, 0, Math.PI * 2);
        ctx.strokeStyle =
          alignment > 0.85
            ? "rgba(29, 59, 92, 0.6)"
            : "rgba(194, 59, 34, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      return { resize, draw };
    }

    /* ----- III. GPT-Code-Learner: Ink-Bamboo & Syntax Constellation ----- */
    if (kind === "gpt") {
      let queryPulse = 0;
      let activeBranchIdx = 1;

      const branches = [
        { a: -1.18, len: 0.34, label: "parser/" },
        { a: -0.62, len: 0.42, label: "context/" },
        { a: -0.18, len: 0.38, label: "search/" },
        { a: 0.36, len: 0.35, label: "prompt/" },
        { a: 0.88, len: 0.31, label: "docs/" },
      ];

      function triggerQuery() {
        queryPulse = 1;
        activeBranchIdx = (activeBranchIdx + 1) % branches.length;
        if (!motionEnabled) draw(0);
      }

      canvas.addEventListener("click", triggerQuery);
      const btn = $("[data-gpt-trigger]", leafEl);
      if (btn) btn.addEventListener("click", triggerQuery);

      function draw(dt) {
        t += dt;
        if (dt > 0 && queryPulse > 0) {
          queryPulse = Math.max(0, queryPulse - dt * 0.42);
        }

        ctx.fillStyle = "#f1ecdf";
        ctx.fillRect(0, 0, w, h);

        const rootX = w * 0.24;
        const rootY = h * 0.86;
        const sway = Math.sin(t * 0.85) * 0.03;

        // Main bamboo stem rising gently
        const trunkTopX = rootX + w * 0.16;
        const trunkTopY = h * 0.44;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(rootX + 24, h * 0.65, trunkTopX, trunkTopY);
        ctx.strokeStyle = "rgba(23, 22, 20, 0.68)";
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Bamboo internode ticks
        [0.28, 0.55, 0.82].forEach((f) => {
          const nx = rootX + (trunkTopX - rootX) * f + Math.sin(f * Math.PI) * 9;
          const ny = rootY + (trunkTopY - rootY) * f;
          ctx.beginPath();
          ctx.moveTo(nx - 6, ny - 2);
          ctx.lineTo(nx + 6, ny + 2);
          ctx.strokeStyle = "rgba(23, 22, 20, 0.85)";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        });

        // Syntax branches and illuminated constellation nodes
        const scale = Math.min(w, h);
        const litEndpoints = [];
        branches.forEach((b, idx) => {
          const isLit = idx === activeBranchIdx || idx === (activeBranchIdx + 1) % branches.length;
          const glow = isLit ? 0.3 + queryPulse * 0.7 : 0.14;
          const angle = b.a + sway * (idx % 2 === 0 ? 1 : -1);
          const bx = trunkTopX + Math.cos(angle) * scale * b.len;
          const by = trunkTopY + Math.sin(angle) * scale * b.len * 0.72;

          ctx.beginPath();
          ctx.moveTo(trunkTopX, trunkTopY);
          ctx.quadraticCurveTo(
            (trunkTopX + bx) * 0.5,
            (trunkTopY + by) * 0.5 - 16,
            bx,
            by
          );
          ctx.strokeStyle = isLit
            ? `rgba(29, 59, 92, ${0.42 + glow * 0.55})`
            : "rgba(23, 22, 20, 0.28)";
          ctx.lineWidth = isLit ? 2.1 : 1.25;
          ctx.stroke();

          // Sub-twigs
          for (let s = -1; s <= 1; s += 2) {
            const subX = bx + Math.cos(angle + s * 0.45) * 44;
            const subY = by + Math.sin(angle + s * 0.45) * 32;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(subX, subY);
            ctx.strokeStyle = isLit
              ? `rgba(29, 59, 92, ${0.3 + glow * 0.45})`
              : "rgba(23, 22, 20, 0.18)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(subX, subY, isLit ? 4 : 2.6, 0, Math.PI * 2);
            ctx.fillStyle = isLit
              ? `rgba(29, 59, 92, ${0.5 + glow * 0.5})`
              : "rgba(87, 83, 75, 0.45)";
            ctx.fill();
            if (isLit) litEndpoints.push({ x: subX, y: subY });
          }

          // Node blossom
          if (isLit && queryPulse > 0.05) {
            const halo = ctx.createRadialGradient(bx, by, 2, bx, by, 28 * queryPulse + 10);
            halo.addColorStop(0, `rgba(194, 59, 34, ${0.36 * queryPulse})`);
            halo.addColorStop(1, "rgba(194, 59, 34, 0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(bx, by, 28 * queryPulse + 10, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(bx, by, isLit ? 5.5 : 3.6, 0, Math.PI * 2);
          ctx.fillStyle = isLit ? "#c23b22" : "#171614";
          ctx.fill();

          ctx.font = '500 11px "DM Sans", sans-serif';
          ctx.fillStyle = isLit ? "#1d3b5c" : "#57534b";
          ctx.fillText(b.label, bx + 10, by + 4);
        });

        // Subtle constellation threads joining lit syntax nodes
        if (litEndpoints.length > 1) {
          ctx.beginPath();
          litEndpoints.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.strokeStyle = `rgba(29, 59, 92, ${0.18 + queryPulse * 0.35})`;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      return { resize, draw };
    }

    /* ----- IV. Sonica: Water-Drop Narrowband Interference Ripples ----- */
    if (kind === "sonica") {
      const drops = [
        { rx: 0.34, ry: 0.48, age: 0.4, maxAge: 4.5 },
        { rx: 0.66, ry: 0.52, age: 1.8, maxAge: 4.5 },
      ];
      let emitClock = 0;

      function addDrop(rx, ry) {
        drops.push({
          rx: rx !== undefined ? rx : 0.22 + Math.random() * 0.56,
          ry: ry !== undefined ? ry : 0.25 + Math.random() * 0.48,
          age: 0,
          maxAge: 4.6,
        });
        if (drops.length > 10) drops.shift();
      }

      canvas.addEventListener("click", (ev) => {
        const rect = canvas.getBoundingClientRect();
        addDrop(
          (ev.clientX - rect.left) / rect.width,
          (ev.clientY - rect.top) / rect.height
        );
        if (!motionEnabled) draw(0.25);
      });

      const btn = $("[data-sonica-trigger]", leafEl);
      if (btn) {
        btn.addEventListener("click", () => {
          addDrop();
          if (!motionEnabled) draw(0.25);
        });
      }

      function draw(dt) {
        t += dt;
        emitClock += dt;
        if (dt > 0 && emitClock > 1.75) {
          emitClock = 0;
          addDrop(
            Math.random() > 0.5 ? 0.32 + Math.random() * 0.08 : 0.62 + Math.random() * 0.08,
            0.42 + Math.random() * 0.16
          );
        }

        // Deep Ai-zome indigo water surface
        const water = ctx.createLinearGradient(0, 0, 0, h);
        water.addColorStop(0, "#152b44");
        water.addColorStop(1, "#1e3e61");
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, w, h);

        // Subtle narrowband frequency carrier ruler lines
        ctx.strokeStyle = "rgba(244, 240, 231, 0.06)";
        ctx.lineWidth = 1;
        for (let y = 36; y < h; y += 36) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (dt > 0) d.age += dt;
          if (d.age >= d.maxAge) {
            drops.splice(i, 1);
            continue;
          }
          const dx = d.rx * w;
          const dy = d.ry * h;
          const fade = Math.max(0, 1 - d.age / d.maxAge);

          // Concentric narrowband wave train
          for (let ring = 0; ring < 5; ring++) {
            const r = d.age * 74 - ring * 18;
            if (r <= 1) continue;
            const ringFade = fade * (1 - ring * 0.16);
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, Math.PI * 2);
            ctx.strokeStyle =
              ring === 0
                ? `rgba(244, 240, 231, ${0.55 * ringFade})`
                : `rgba(176, 206, 232, ${0.32 * ringFade})`;
            ctx.lineWidth = ring === 0 ? 1.7 : 1.05;
            ctx.stroke();
          }

          // Emitter seed dot
          ctx.beginPath();
          ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(244, 240, 231, ${0.8 * fade})`;
          ctx.fill();
        }
      }

      return { resize, draw };
    }

    /* ----- V. Flora: Misty Multi-Layer Sumi-e Mountain & Cloud Horizons ----- */
    if (kind === "flora") {
      let ptrX = 0;
      let ptrY = 0;
      let targetX = 0;
      let targetY = 0;

      canvas.addEventListener(
        "pointermove",
        (ev) => {
          const rect = canvas.getBoundingClientRect();
          targetX = clamp(((ev.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
          targetY = clamp(((ev.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
        },
        { passive: true }
      );

      canvas.addEventListener("pointerleave", () => {
        targetX = 0;
        targetY = 0;
      });

      const layers = [
        { base: 0.38, amp: 24, freq: 0.0045, speed: 0.12, depth: 0.25, color: "rgba(29, 59, 92, 0.12)", label: "EDGE" },
        { base: 0.49, amp: 30, freq: 0.0055, speed: 0.18, depth: 0.45, color: "rgba(29, 59, 92, 0.2)", label: "CORE" },
        { base: 0.6, amp: 26, freq: 0.0068, speed: 0.24, depth: 0.7, color: "rgba(23, 22, 20, 0.22)", label: "RAN" },
        { base: 0.72, amp: 22, freq: 0.008, speed: 0.3, depth: 1.0, color: "rgba(23, 22, 20, 0.34)", label: "eSIM" },
      ];

      function draw(dt) {
        t += dt;
        if (dt > 0) {
          ptrX += (targetX - ptrX) * Math.min(1, dt * 4);
          ptrY += (targetY - ptrY) * Math.min(1, dt * 4);
        }

        // Misty pale sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#f5f1e8");
        sky.addColorStop(0.6, "#ede6d8");
        sky.addColorStop(1, "#e2dac7");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Pale sun / moon seal disc in upper mist
        ctx.beginPath();
        ctx.arc(w * 0.76 - ptrX * 8, h * 0.22 - ptrY * 5, 22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(194, 59, 34, 0.16)";
        ctx.fill();

        layers.forEach((layer, idx) => {
          const shiftX = ptrX * 26 * layer.depth + t * 14 * layer.speed;
          const shiftY = ptrY * 10 * layer.depth;

          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 12) {
            const ridge =
              Math.sin((x + shiftX) * layer.freq + idx * 1.9) * layer.amp +
              Math.cos((x + shiftX * 0.6) * layer.freq * 1.9 + idx) * (layer.amp * 0.42);
            ctx.lineTo(x, h * layer.base + ridge + shiftY);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = layer.color;
          ctx.fill();

          // Soft mist veil along each mountain valley
          const mist = ctx.createLinearGradient(0, h * layer.base, 0, h * (layer.base + 0.18));
          mist.addColorStop(0, "rgba(244, 240, 231, 0)");
          mist.addColorStop(1, "rgba(244, 240, 231, 0.42)");
          ctx.fillStyle = mist;
          ctx.fillRect(0, h * layer.base, w, h * 0.18);
        });
      }

      return { resize, draw };
    }

    /* ----- VI. Mobile VR Latency: Dual Zen Stone-Pendulum Harmonics ----- */
    if (kind === "vr") {
      let mode = "standard";
      let phaseLag = 0.92; // radians
      const trailA = [];
      const trailB = [];

      const modeBtns = $$("[data-vr-mode]", leafEl);
      modeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          mode = btn.dataset.vrMode || "standard";
          modeBtns.forEach((b) => {
            const active = b.dataset.vrMode === mode;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-pressed", String(active));
          });
          if (!motionEnabled) {
            phaseLag = mode === "proactive" ? 0.04 : 0.92;
            draw(0);
          }
        });
      });

      function draw(dt) {
        t += dt;
        const targetLag = mode === "proactive" ? 0.03 : 0.95;
        if (dt > 0) {
          phaseLag += (targetLag - phaseLag) * Math.min(1, dt * 4.2);
        }

        ctx.fillStyle = "#f1ecdf";
        ctx.fillRect(0, 0, w, h);

        const pivotX = w * 0.5;
        const pivotY = h * 0.14;
        const rodLen = Math.min(w * 0.36, h * 0.56);
        const omega = 1.85;
        const amp = 0.56;

        const thetaA = Math.sin(t * omega) * amp;
        const thetaB = Math.sin(t * omega - phaseLag) * amp;

        const ax = pivotX + Math.sin(thetaA) * rodLen;
        const ay = pivotY + Math.cos(thetaA) * rodLen;
        const bx = pivotX + Math.sin(thetaB) * (rodLen * 0.84);
        const by = pivotY + Math.cos(thetaB) * (rodLen * 0.84);

        if (dt > 0) {
          trailA.push({ x: ax, y: ay });
          trailB.push({ x: bx, y: by });
          if (trailA.length > 36) trailA.shift();
          if (trailB.length > 36) trailB.shift();
        }

        // Subtle arc guide
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, rodLen, Math.PI * 0.5 - amp, Math.PI * 0.5 + amp);
        ctx.strokeStyle = "rgba(87, 83, 75, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Phase delta arc between the two rods
        ctx.beginPath();
        ctx.arc(
          pivotX,
          pivotY,
          rodLen * 0.45,
          Math.PI * 0.5 - Math.max(thetaA, thetaB),
          Math.PI * 0.5 - Math.min(thetaA, thetaB)
        );
        ctx.strokeStyle =
          mode === "proactive"
            ? "rgba(29, 59, 92, 0.45)"
            : "rgba(194, 59, 34, 0.65)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Ink trails
        [
          { pts: trailA, color: "rgba(23, 22, 20, 0.25)" },
          { pts: trailB, color: "rgba(29, 59, 92, 0.35)" },
        ].forEach(({ pts, color }) => {
          if (pts.length < 2) return;
          ctx.beginPath();
          pts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Pendulum strings
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = "rgba(23, 22, 20, 0.55)";
        ctx.lineWidth = 1.25;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = "rgba(29, 59, 92, 0.68)";
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Resonance ring when synchronized
        if (phaseLag < 0.14) {
          ctx.beginPath();
          ctx.arc(ax, ay, 22 + Math.sin(t * 4) * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(194, 59, 34, 0.52)";
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }

        // Motion stone (Sumi)
        ctx.beginPath();
        ctx.ellipse(ax, ay, 14, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#171614";
        ctx.fill();

        // Rendered Frame stone (Ai-zome Indigo)
        ctx.beginPath();
        ctx.ellipse(bx, by, 12, 9.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#1d3b5c";
        ctx.fill();

        // Pivot pin
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#c23b22";
        ctx.fill();

        // Calm status legend top-left
        ctx.font = '600 11px "DM Sans", sans-serif';
        ctx.fillStyle = mode === "proactive" ? "#1d3b5c" : "#a9301a";
        ctx.fillText(
          mode === "proactive"
            ? "PROACTIVE SCHEDULING · PHASE LOCKED"
            : "STANDARD UPLINK · DELAYED PHASE DRIFT",
          16,
          24
        );
      }

      return { resize, draw };
    }

    /* ----- VII. Acemap: On-Demand Indigo-on-Washi Celestial Scroll ----- */
    if (kind === "acemap") {
      const loadBtn = $("#acemap-load-btn");
      const selectsWrap = $("#acemap-selects");
      const fieldSelect = $("#acemap-field-select");
      const topicSelect = $("#acemap-topic-select");
      const sealsWrap = $("#acemap-seals");
      const statusEl = $("#acemap-status");
      const tooltipEl = $("#acemap-tooltip");

      let loaded = false;
      let bloom = 0; // 0..1 organic ink-bloom reveal
      let points = [];
      let selectedField = "all";
      let hoveredIdx = -1;
      let selectedIdx = -1;

      function isPointActive(i) {
        return (
          selectedField === "all" || points[i].field === Number(selectedField)
        );
      }

      function layoutPoints() {
        if (!points.length) return;
        const padX = Math.max(20, w * 0.06);
        const padTop = 28;
        const padBottom = w < 520 ? 96 : 64;
        const availW = Math.max(10, w - padX * 2);
        const availH = Math.max(10, h - padTop - padBottom);
        const scale = Math.min(availW / points.spanX, availH / points.spanY);
        const offX = padX + (availW - points.spanX * scale) * 0.5;
        const offY = padTop + (availH - points.spanY * scale) * 0.5;
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          p.px = (p.x - points.minX) * scale + offX;
          p.py = (p.y - points.minY) * scale + offY;
        }
      }

      function syncTooltip(idx) {
        if (!tooltipEl) return;
        if (idx < 0 || !points[idx]) {
          tooltipEl.hidden = true;
          return;
        }
        const p = points[idx];
        tooltipEl.textContent = `${p.name} · ${ACEMAP_FIELDS[p.field]}`;
        tooltipEl.hidden = false;
      }

      function applyFieldFilter(fieldVal) {
        selectedField = String(fieldVal);
        hoveredIdx = -1;
        selectedIdx = -1;
        syncTooltip(-1);

        if (fieldSelect) fieldSelect.value = selectedField;
        if (sealsWrap) {
          $$(".seal-chip", sealsWrap).forEach((chip) => {
            chip.classList.toggle("is-active", chip.dataset.field === selectedField);
          });
        }

        let count = 0;
        if (topicSelect) {
          topicSelect.replaceChildren(new Option("Choose a topic", ""));
        }
        for (let i = 0; i < points.length; i++) {
          if (isPointActive(i)) {
            count++;
            if (topicSelect) {
              topicSelect.add(new Option(points[i].name, String(i)));
            }
          }
        }
        const fieldLabel =
          selectedField === "all"
            ? "All 19 disciplines"
            : ACEMAP_FIELDS[Number(selectedField)];
        if (statusEl) {
          statusEl.textContent = `${fieldLabel} · ${count.toLocaleString()} topics`;
        }
        draw(0);
      }

      function buildSeals() {
        if (!sealsWrap || !fieldSelect) return;
        sealsWrap.replaceChildren();
        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "seal-chip is-active";
        allBtn.dataset.field = "all";
        allBtn.textContent = "All (19)";
        allBtn.addEventListener("click", () => applyFieldFilter("all"));
        sealsWrap.appendChild(allBtn);

        ACEMAP_FIELDS.forEach((name, idx) => {
          const opt = document.createElement("option");
          opt.value = String(idx);
          opt.textContent = name;
          fieldSelect.appendChild(opt);

          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "seal-chip";
          chip.dataset.field = String(idx);
          const dot = document.createElement("span");
          dot.className = "seal-swatch";
          dot.style.backgroundColor = ACEMAP_WASHI_COLORS[idx];
          chip.appendChild(dot);
          chip.appendChild(document.createTextNode(name));
          chip.addEventListener("click", () => applyFieldFilter(idx));
          sealsWrap.appendChild(chip);
        });
      }

      function findNearest(clientX, clientY, maxRadius) {
        if (!loaded || !points.length) return -1;
        const rect = canvas.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        let best = -1;
        let bestD2 = maxRadius * maxRadius;
        for (let i = 0; i < points.length; i++) {
          if (!isPointActive(i)) continue;
          const dx = points[i].px - mx;
          const dy = points[i].py - my;
          const d2 = dx * dx + dy * dy;
          if (d2 <= bestD2) {
            bestD2 = d2;
            best = i;
          }
        }
        return best;
      }

      if (loadBtn) {
        loadBtn.addEventListener("click", async () => {
          loadBtn.disabled = true;
          loadBtn.textContent = "Unrolling 2,208 topics…";
          if (statusEl) statusEl.textContent = "Loading ../../data/data.csv…";
          try {
            const res = await fetch("../../data/data.csv");
            if (!res.ok) throw new Error("Dataset unavailable");
            const rows = parseCSV(await res.text()).slice(1);
            const parsed = rows
              .map((r) => ({
                x: Number(r[0]),
                y: Number(r[1]),
                size: Number(r[2]) || 4,
                name: r[3] || "",
                field: ACEMAP_SOURCE_COLORS.indexOf(r[4]),
                px: 0,
                py: 0,
              }))
              .filter(
                (p) =>
                  Number.isFinite(p.x) &&
                  Number.isFinite(p.y) &&
                  p.field >= 0 &&
                  p.name
              );
            if (!parsed.length) throw new Error("Empty dataset");

            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            parsed.forEach((p) => {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            });
            parsed.minX = minX;
            parsed.minY = minY;
            parsed.spanX = Math.max(1, maxX - minX);
            parsed.spanY = Math.max(1, maxY - minY);

            points = parsed;
            loaded = true;
            bloom = motionEnabled ? 0.04 : 1;
            layoutPoints();
            buildSeals();

            loadBtn.hidden = true;
            if (selectsWrap) selectsWrap.hidden = false;
            if (sealsWrap) sealsWrap.hidden = false;
            resize();
            layoutPoints();
            applyFieldFilter("all");
            requestAnimationFrame(() => {
              resize();
              layoutPoints();
              draw(0);
            });
          } catch {
            loadBtn.disabled = false;
            loadBtn.textContent = "Retry Celestial Scroll";
            if (statusEl) {
              statusEl.textContent =
                "Unable to load ../../data/data.csv. Visit Acemap directly below.";
            }
          }
        });
      }

      if (fieldSelect) {
        fieldSelect.addEventListener("change", () =>
          applyFieldFilter(fieldSelect.value)
        );
      }

      if (topicSelect) {
        topicSelect.addEventListener("change", () => {
          selectedIdx =
            topicSelect.value === "" ? -1 : Number(topicSelect.value);
          syncTooltip(selectedIdx);
          if (selectedIdx >= 0 && points[selectedIdx] && statusEl) {
            const p = points[selectedIdx];
            statusEl.textContent = `${p.name} · ${ACEMAP_FIELDS[p.field]}`;
          }
          draw(0);
        });
      }

      canvas.addEventListener(
        "pointermove",
        (ev) => {
          if (!loaded) return;
          const idx = findNearest(ev.clientX, ev.clientY, 16);
          if (idx === hoveredIdx) return;
          hoveredIdx = idx;
          syncTooltip(idx >= 0 ? idx : selectedIdx);
          draw(0);
        },
        { passive: true }
      );

      canvas.addEventListener("pointerleave", () => {
        if (!loaded) return;
        hoveredIdx = -1;
        syncTooltip(selectedIdx);
        draw(0);
      });

      canvas.addEventListener("click", (ev) => {
        if (!loaded) return;
        const idx = findNearest(ev.clientX, ev.clientY, 20);
        if (idx < 0) return;
        selectedIdx = idx;
        if (topicSelect) topicSelect.value = String(idx);
        syncTooltip(idx);
        if (statusEl) {
          const p = points[idx];
          statusEl.textContent = `${p.name} · ${ACEMAP_FIELDS[p.field]}`;
        }
        draw(0);
      });

      function draw(dt) {
        t += dt;
        ctx.fillStyle = "#f2ede1";
        ctx.fillRect(0, 0, w, h);

        const cx = w * 0.5;
        const cy = h * 0.45;

        // Subtle indigo celestial chart circles
        ctx.strokeStyle = "rgba(29, 59, 92, 0.12)";
        ctx.lineWidth = 1;
        [0.24, 0.42, 0.62].forEach((mult) => {
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(w, h) * mult, 0, Math.PI * 2);
          ctx.stroke();
        });

        if (!loaded) {
          // Tranquil folded celestial preview
          const previewPts = 28;
          for (let i = 0; i < previewPts; i++) {
            const a = (i / previewPts) * Math.PI * 2 + t * 0.08;
            const r = Math.min(w, h) * (0.12 + ((i * 19) % 34) / 100);
            const px = cx + Math.cos(a) * r * 1.35;
            const py = cy + Math.sin(a) * r * 0.85;
            ctx.beginPath();
            ctx.arc(px, py, 2.2 + (i % 3), 0, Math.PI * 2);
            ctx.fillStyle =
              i % 5 === 0
                ? "rgba(194, 59, 34, 0.55)"
                : "rgba(29, 59, 92, 0.42)";
            ctx.fill();
          }
          ctx.font = '500 12px "Shippori Mincho", serif';
          ctx.fillStyle = "#1d3b5c";
          ctx.textAlign = "center";
          ctx.fillText(
            "Celestial Scroll · 2,208 Academic Topics · 19 Disciplines",
            cx,
            cy
          );
          ctx.textAlign = "start";
          return;
        }

        if (dt > 0 && bloom < 1) {
          bloom = Math.min(1, bloom + dt * 1.15);
        }
        const eased = 1 - Math.pow(1 - bloom, 3);

        // Render all 2,208 topics with organic ink-bloom reveal from center
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const active = isPointActive(i);
          const x = cx + (p.px - cx) * eased;
          const y = cy + (p.py - cy) * eased;
          const r = clamp(1.35 + (p.size - 4) * 0.16, 1.3, 3.6);

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = ACEMAP_WASHI_COLORS[p.field];
          ctx.globalAlpha = active ? 0.82 * eased : 0.08 * eased;
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Highlight hovered / selected star with vermilion seal halo
        const focusIdx = hoveredIdx >= 0 ? hoveredIdx : selectedIdx;
        if (focusIdx >= 0 && points[focusIdx]) {
          const fp = points[focusIdx];
          // Delicate filaments to nearest 4 same-discipline neighbors
          let drawn = 0;
          ctx.strokeStyle = "rgba(29, 59, 92, 0.35)";
          ctx.lineWidth = 0.9;
          for (let i = 0; i < points.length && drawn < 5; i++) {
            if (i === focusIdx || points[i].field !== fp.field) continue;
            const d = Math.hypot(points[i].px - fp.px, points[i].py - fp.py);
            if (d < 42) {
              ctx.beginPath();
              ctx.moveTo(fp.px, fp.py);
              ctx.lineTo(points[i].px, points[i].py);
              ctx.stroke();
              drawn++;
            }
          }

          ctx.beginPath();
          ctx.arc(fp.px, fp.py, 9, 0, Math.PI * 2);
          ctx.strokeStyle = "#c23b22";
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(fp.px, fp.py, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = "#c23b22";
          ctx.fill();
        }
      }

      const baseResize = resize;
      return {
        resize() {
          baseResize();
          layoutPoints();
          draw(0);
        },
        draw,
      };
    }

    return { resize, draw() {} };
  }

  function initByobuGallery() {
    const screen = $("#byobu-screen");
    if (!screen) return;

    const leaves = $$(".byobu-leaf", screen);
    const prevBtn = $("#byobu-prev");
    const nextBtn = $("#byobu-next");
    const counterEl = $("#byobu-counter");

    let activeLeaf = 0;
    let screenVisible = false;
    let rafId = 0;
    let lastTs = 0;
    let resizeTimer = 0;

    const artworks = leaves.map((leaf) => {
      const canvas = $(".zen-canvas", leaf);
      const kind = canvas ? canvas.dataset.art : "";
      return createZenArtwork(kind, canvas, leaf);
    });

    function resizeActive() {
      if (artworks[activeLeaf]) {
        artworks[activeLeaf].resize();
        artworks[activeLeaf].draw(0);
      }
    }

    function openLeaf(index) {
      const nextIdx = ((index % leaves.length) + leaves.length) % leaves.length;
      activeLeaf = nextIdx;

      leaves.forEach((leaf, i) => {
        const isOpen = i === activeLeaf;
        leaf.classList.toggle("is-open", isOpen);
        const btn = $(".leaf-spine", leaf);
        if (btn) btn.setAttribute("aria-expanded", String(isOpen));
      });

      if (counterEl) {
        counterEl.textContent = `${ROMAN_NUMERALS[activeLeaf]} / VII`;
      }

      // Resize canvas smoothly during and after unfolding transition
      requestAnimationFrame(resizeActive);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeActive, 420);
      setTimeout(resizeActive, 720);
      syncByobuLoop();
    }

    leaves.forEach((leaf, idx) => {
      leaf.addEventListener("transitionend", (ev) => {
        if (idx === activeLeaf && (ev.propertyName === "flex-grow" || ev.propertyName === "flex-basis")) {
          resizeActive();
        }
      });
      const spine = $(".leaf-spine", leaf);
      if (!spine) return;
      spine.addEventListener("click", () => openLeaf(idx));
      spine.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
          ev.preventDefault();
          const next = (idx + 1) % leaves.length;
          openLeaf(next);
          $(".leaf-spine", leaves[next]).focus();
        } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
          ev.preventDefault();
          const prev = (idx - 1 + leaves.length) % leaves.length;
          openLeaf(prev);
          $(".leaf-spine", leaves[prev]).focus();
        }
      });
    });

    if (prevBtn) prevBtn.addEventListener("click", () => openLeaf(activeLeaf - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => openLeaf(activeLeaf + 1));

    function tick(ts) {
      rafId = 0;
      if (!motionEnabled || !screenVisible || document.hidden) {
        lastTs = 0;
        return;
      }
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      if (artworks[activeLeaf]) {
        artworks[activeLeaf].draw(dt);
      }
      rafId = requestAnimationFrame(tick);
    }

    function syncByobuLoop() {
      if (motionEnabled && screenVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        if (artworks[activeLeaf]) artworks[activeLeaf].draw(0);
      }
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          screenVisible = entry.isIntersecting;
          if (screenVisible) resizeActive();
          syncByobuLoop();
        },
        { threshold: 0.02 }
      ).observe(screen);
    } else {
      screenVisible = true;
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeActive).observe(screen);
    } else {
      window.addEventListener("resize", resizeActive, { passive: true });
    }

    document.addEventListener("visibilitychange", syncByobuLoop);
    motionListeners.add(syncByobuLoop);

    openLeaf(0);
  }

  /* ------------------------------------------------------------------------
     4. PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
     ------------------------------------------------------------------------ */
  function initPublicationsFilter() {
    const buttons = $$(".pub-filters [data-filter]");
    const groups = $$(".pub-group");
    const countEl = $("#publication-count");
    if (!buttons.length || !groups.length) return;

    function applyFilter(kind) {
      groups.forEach((group) => {
        group.hidden = kind !== "all" && group.dataset.kind !== kind;
      });
      buttons.forEach((btn) => {
        const active = btn.dataset.filter === kind;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });

      const visibleGroups = groups.filter((g) => !g.hidden);
      const total = visibleGroups.reduce(
        (sum, g) => sum + $$(".pub-item", g).length,
        0
      );
      const years = visibleGroups.flatMap((g) =>
        $$(".pub-year", g).map((y) => Number(y.textContent))
      );
      if (countEl && years.length) {
        const label =
          kind === "all" ? "publications" : `${kind} publications`;
        countEl.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
      }
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });

    function syncHash() {
      if (location.hash === "#conf") applyFilter("conference");
      else if (location.hash === "#journal") applyFilter("journal");
    }

    window.addEventListener("hashchange", syncHash);
    syncHash();
  }

  /* ------------------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------------------ */
  try {
    initHeroInkCanvas();
  } catch {
    // Decorative canvas failure must never impair content
  }
  initShojiStudy();
  initByobuGallery();
  initPublicationsFilter();
})();
