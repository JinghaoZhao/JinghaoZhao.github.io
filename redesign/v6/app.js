/* Version 6: Liquid Glass & Iridescent Prism Atelier
 * Progressive enhancement: all verified facts, projects, and publications exist in plain HTML.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

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

  /* ========================================================================
     1. PRISMATIC SPECULAR BORDER SHEEN (TRACKS CURSOR ANGLE ON GLASS CARDS)
     ======================================================================== */
  const glassCards = $$(".prism-glass");
  let activeGlassEvent = null;
  let glassRaf = 0;

  function updateGlassSheen() {
    glassRaf = 0;
    if (!activeGlassEvent || !motionEnabled || !finePointerQuery.matches) return;
    const { target, clientX, clientY } = activeGlassEvent;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 90;
    target.style.setProperty("--gx", `${((x / rect.width) * 100).toFixed(1)}%`);
    target.style.setProperty(
      "--gy",
      `${((y / rect.height) * 100).toFixed(1)}%`
    );
    target.style.setProperty("--prism-angle", `${angle.toFixed(1)}deg`);
  }

  glassCards.forEach((card) => {
    card.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled || !finePointerQuery.matches) return;
        activeGlassEvent = {
          target: card,
          clientX: e.clientX,
          clientY: e.clientY,
        };
        if (!glassRaf) glassRaf = requestAnimationFrame(updateGlassSheen);
      },
      { passive: true }
    );
  });

  /* ========================================================================
     2. HEADER SCROLL STATE & VISIONOS SPATIAL DOCK SCROLL-SPY
     ======================================================================== */
  const header = $("#atelier-header");
  const dockItems = $$(".dock-item");
  const trackedSections = dockItems
    .map((item) => ({
      id: item.dataset.section,
      item,
      el: document.getElementById(item.dataset.section),
    }))
    .filter((entry) => entry.el);

  let scrollTicking = false;
  function updateScrollChrome() {
    scrollTicking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 36);

    let currentId = "top";
    const threshold = window.innerHeight * 0.38;
    for (let i = 0; i < trackedSections.length; i++) {
      const { id, el } = trackedSections[i];
      if (id === "top") continue;
      if (el.getBoundingClientRect().top <= threshold) {
        currentId = id;
      }
    }

    dockItems.forEach((item) => {
      const isActive = item.dataset.section === currentId;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollChrome);
      }
    },
    { passive: true }
  );
  updateScrollChrome();

  /* ========================================================================
     3. HERO CANVAS: LIQUID MERCURY & PRISM CAUSTICS
     ======================================================================== */
  const heroStage = $(".hero-stage");
  const heroCanvas = $("#caustics-canvas");
  let syncHeroScene = () => {};

  function initHeroCaustics() {
    if (!heroStage || !heroCanvas) return;
    const ctx = heroCanvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let rafId = 0;
    let lastTs = 0;
    let elapsed = 0;
    let isVisible = true;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;

    const ribbons = [
      {
        hue: 194,
        sat: 96,
        light: 70,
        amp: 0.14,
        freq: 2.1,
        speed: 0.55,
        yBase: 0.42,
        phase: 0.2,
      },
      {
        hue: 224,
        sat: 90,
        light: 68,
        amp: 0.16,
        freq: 1.75,
        speed: -0.44,
        yBase: 0.52,
        phase: 1.9,
      },
      {
        hue: 268,
        sat: 86,
        light: 74,
        amp: 0.13,
        freq: 2.45,
        speed: 0.38,
        yBase: 0.58,
        phase: 3.4,
      },
      {
        hue: 314,
        sat: 82,
        light: 76,
        amp: 0.11,
        freq: 1.9,
        speed: -0.52,
        yBase: 0.47,
        phase: 4.8,
      },
      {
        hue: 170,
        sat: 88,
        light: 72,
        amp: 0.1,
        freq: 2.8,
        speed: 0.62,
        yBase: 0.65,
        phase: 2.5,
      },
    ];

    const orbs = Array.from({ length: 18 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 41 + 17) % 100) / 100,
      r: 2 + (i % 5) * 1.4,
      speed: 0.18 + (i % 4) * 0.09,
      phase: i * 1.15,
      hue: 185 + ((i * 29) % 140),
    }));

    function resize() {
      const rect = heroStage.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      heroCanvas.width = Math.round(w * dpr);
      heroCanvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(elapsed);
    }

    function draw(timeSec) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#070910";
      ctx.fillRect(0, 0, w, h);

      const driftX = finePointerQuery.matches
        ? px
        : Math.sin(timeSec * 0.35) * 0.48;
      const driftY = finePointerQuery.matches
        ? py
        : Math.cos(timeSec * 0.27) * 0.36;

      const focalX = w * (0.58 + driftX * 0.18);
      const focalY = h * (0.46 + driftY * 0.16);

      // Liquid mercury ambient caustic pools
      ctx.globalCompositeOperation = "lighter";
      const pool1 = ctx.createRadialGradient(
        focalX,
        focalY,
        0,
        focalX,
        focalY,
        Math.max(w, h) * 0.56
      );
      pool1.addColorStop(0, "rgba(130, 224, 255, 0.22)");
      pool1.addColorStop(0.38, "rgba(154, 134, 255, 0.11)");
      pool1.addColorStop(0.7, "rgba(246, 178, 228, 0.045)");
      pool1.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = pool1;
      ctx.fillRect(0, 0, w, h);

      const pool2 = ctx.createRadialGradient(
        w * (0.28 - driftX * 0.12),
        h * (0.64 - driftY * 0.1),
        0,
        w * (0.28 - driftX * 0.12),
        h * (0.64 - driftY * 0.1),
        Math.max(w, h) * 0.48
      );
      pool2.addColorStop(0, "rgba(116, 168, 255, 0.16)");
      pool2.addColorStop(0.5, "rgba(128, 245, 212, 0.06)");
      pool2.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = pool2;
      ctx.fillRect(0, 0, w, h);

      // Flowing refractive caustic ribbons with chromatic RGB dispersion
      const steps = w < 640 ? 46 : 78;
      ribbons.forEach((rb, idx) => {
        const offsets = [
          { dHue: -14, dy: -4, alpha: 0.16, lw: 2.2 },
          { dHue: 0, dy: 0, alpha: 0.32, lw: 1.5 },
          { dHue: 18, dy: 4, alpha: 0.14, lw: 2.2 },
        ];

        offsets.forEach((off) => {
          ctx.beginPath();
          for (let s = 0; s <= steps; s++) {
            const u = s / steps;
            const x = u * w;
            const wave1 =
              Math.sin(
                u * Math.PI * rb.freq + timeSec * rb.speed + rb.phase
              ) *
              h *
              rb.amp;
            const wave2 =
              Math.cos(
                u * Math.PI * (rb.freq * 1.65) -
                  timeSec * rb.speed * 0.8 +
                  idx * 1.3
              ) *
              h *
              (rb.amp * 0.42);
            const distToPointer = Math.hypot(x - focalX, h * rb.yBase - focalY);
            const lensBend =
              Math.exp(-(distToPointer * distToPointer) / (w * w * 0.11)) *
              (driftY * 54 + Math.sin(timeSec * 0.9 + idx) * 20);
            const y = h * rb.yBase + wave1 + wave2 + lensBend + off.dy;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          const grad = ctx.createLinearGradient(0, 0, w, 0);
          const hCol = (rb.hue + off.dHue + 360) % 360;
          grad.addColorStop(0, `hsla(${hCol}, ${rb.sat}%, ${rb.light}%, 0)`);
          grad.addColorStop(
            0.22,
            `hsla(${hCol}, ${rb.sat}%, ${rb.light}%, ${off.alpha})`
          );
          grad.addColorStop(
            0.55,
            `hsla(${(hCol + 24) % 360}, 95%, 88%, ${off.alpha * 1.25})`
          );
          grad.addColorStop(
            0.84,
            `hsla(${hCol}, ${rb.sat}%, ${rb.light}%, ${off.alpha * 0.8})`
          );
          grad.addColorStop(1, `hsla(${hCol}, ${rb.sat}%, ${rb.light}%, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = off.lw;
          ctx.stroke();
        });
      });

      // Subtle crystalline optical ring around focal point
      const ringRadius = Math.min(w, h) * 0.24;
      ctx.save();
      ctx.translate(focalX, focalY);
      ctx.rotate(timeSec * 0.12);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius * 1.28, ringRadius * 0.72, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180, 232, 255, 0.13)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        ringRadius * 0.92,
        ringRadius * 1.12,
        -0.55,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(212, 180, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Luminous drifting refractive motes
      orbs.forEach((orb) => {
        const ox =
          ((orb.x * w + Math.sin(timeSec * orb.speed + orb.phase) * 34 + w) %
            w) +
          driftX * 14;
        const oy =
          ((orb.y * h + Math.cos(timeSec * orb.speed * 0.8 + orb.phase) * 26 + h) %
            h) +
          driftY * 10;
        const pulse = 0.55 + 0.45 * Math.sin(timeSec * 1.4 + orb.phase);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r * 5.2);
        g.addColorStop(0, `hsla(${orb.hue}, 95%, 92%, ${0.42 * pulse})`);
        g.addColorStop(0.4, `hsla(${orb.hue}, 90%, 72%, ${0.14 * pulse})`);
        g.addColorStop(1, "rgba(7, 9, 16, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.r * 5.2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";
    }

    function loop(now) {
      rafId = 0;
      if (!motionEnabled || !isVisible || document.hidden) {
        lastTs = 0;
        return;
      }
      if (!lastTs || now - lastTs >= 28) {
        const dt = lastTs ? Math.min((now - lastTs) / 1000, 0.06) : 0;
        elapsed += dt;
        lastTs = now;
        px = lerp(px, tx, 0.06);
        py = lerp(py, ty, 0.06);
        draw(elapsed);
      }
      rafId = requestAnimationFrame(loop);
    }

    syncHeroScene = () => {
      if (motionEnabled && isVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(loop);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        draw(elapsed);
      }
    };

    heroStage.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled || !finePointerQuery.matches) return;
        const rect = heroStage.getBoundingClientRect();
        tx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        ty = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      },
      { passive: true }
    );

    heroStage.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          syncHeroScene();
        },
        { threshold: 0.02 }
      ).observe(heroStage);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(heroStage);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    syncHeroScene();
  }

  /* ========================================================================
     4. INTERACTIVE 3D REFRACTIVE GLASS STACK (BARE METAL)
     ======================================================================== */
  const stackTabs = $$("[data-plane-select]");
  const stackPlanes = $$(".crystal-plane");
  const planesViewport = $(".crystal-planes-viewport");

  function setFocusedPlane(index) {
    const idx = Number(index);
    if (planesViewport) planesViewport.dataset.activePlane = String(idx);
    stackTabs.forEach((tab) => {
      const active = Number(tab.dataset.planeSelect) === idx;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    stackPlanes.forEach((plane) => {
      const pIdx = Number(plane.dataset.plane);
      const active = pIdx === idx;
      plane.classList.toggle("is-focused", active);
      if (motionEnabled && window.innerWidth > 720) {
        const delta = pIdx - idx;
        if (active) {
          plane.style.transform =
            "perspective(1050px) rotateX(0deg) translateZ(20px) scale(1)";
        } else {
          plane.style.transform = `perspective(1050px) rotateX(${delta * 5}deg) translateZ(-14px) scale(0.975)`;
        }
      } else {
        plane.style.transform = "";
      }
    });
  }

  stackTabs.forEach((tab) => {
    tab.addEventListener("click", () => setFocusedPlane(tab.dataset.planeSelect));
  });

  stackPlanes.forEach((plane) => {
    plane.addEventListener("click", () => setFocusedPlane(plane.dataset.plane));
    plane.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFocusedPlane(plane.dataset.plane);
      }
    });
  });

  setFocusedPlane(0);

  /* ========================================================================
     5. PRISM EXHIBITION CAROUSEL: 7 LIVE GENERATIVE <CANVAS> SCULPTURES
     ======================================================================== */
  const PROJECTS = [
    {
      id: "seed",
      index: "01 / 07",
      kind: "5G SIM Recovery · ACM SIGCOMM ’22",
      title: "SEED",
      desc: "Diagnosing and recovering from 5G failures through the SIM.",
      href: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      cta: "Read the SIGCOMM ’22 paper",
      defaultStatus:
        "SEED · 5G harmonic wave healing — click the viewport or trigger a fault to watch the SIM-assisted wave restore coherence.",
    },
    {
      id: "secureSIM",
      index: "02 / 07",
      kind: "SIM / eSIM Security · ACM MobiCom ’21",
      title: "SecureSIM",
      desc: "Authentication and fine-grained access control for SIM and eSIM.",
      href: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      cta: "Read the MobiCom ’21 paper",
      defaultStatus:
        "SecureSIM · Refractive iris vault — move pointer or cycle lock state to align cryptographic facets.",
    },
    {
      id: "gptcodelearner",
      index: "03 / 07",
      kind: "Code Intelligence · Open Source",
      title: "GPT-Code-Learner",
      desc: "Explore a codebase through questions, context, and GPT.",
      href: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      cta: "Explore on GitHub",
      defaultStatus:
        "GPT-Code-Learner · Luminous semantic constellation — hover nodes or pulse a query to trace context retrieval.",
    },
    {
      id: "sonica",
      index: "04 / 07",
      kind: "Open NB-IoT Testbed · Open Source",
      title: "Sonica",
      desc: "An open NB-IoT network for experiments with real devices.",
      href: "https://github.com/sonica-nbiot/sonica",
      cta: "Explore on GitHub",
      defaultStatus:
        "Sonica · Narrowband prism spectrum — real-time NB-IoT carrier beams and over-the-air modulation ripples.",
    },
    {
      id: "flora",
      index: "05 / 07",
      kind: "Software-Defined Mobile Network",
      title: "Flora",
      desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
      href: "https://project-flora.github.io/Flora/",
      cta: "Explore the project",
      defaultStatus:
        "Flora · 4-plane floating light layers (eSIM · Radio · Core · Edge) bridged by live telemetry ribbons.",
    },
    {
      id: "lrp",
      index: "06 / 07",
      kind: "Low-Latency Mobile VR · USENIX NSDI ’21",
      title: "Mobile VR Latency",
      desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
      href: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      cta: "Read the NSDI ’21 paper",
      defaultStatus:
        "Mobile VR Latency · Proactive Synced mode — edge-rendered wireframe stays locked to head motion.",
    },
    {
      id: "acemap",
      index: "07 / 07",
      kind: "2,208 Topics · 19 Disciplines · SJTU",
      title: "Acemap",
      desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
      href: "https://acemap.sjtu.edu.cn/",
      cta: "Explore Acemap",
      defaultStatus:
        "Acemap · Preview galaxy — click 'Load 2,208 Topics (CSV)' to explore all 19 academic disciplines live.",
    },
  ];

  // Authentic 19 Acemap disciplines & original CSV hex mapping
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

  const ACEMAP_CSV_COLORS = [
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

  const prismChamber = $("#prism-chamber");
  const projCanvas = $("#project-canvas");
  const counterEl = $("#chamber-counter");
  const kindEl = $("#chamber-kind");
  const titleEl = $("#chamber-title");
  const descEl = $("#chamber-desc");
  const linkEl = $("#chamber-link");
  const linkLabelEl = $("#chamber-link-label");
  const statusEl = $("#chamber-status");
  const deckCards = $$(".deck-card");
  const deckFocusBtns = $$("[data-select-project]");
  const overlayControlGroups = $$("[data-for]");

  let syncProjectScene = () => {};

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

  function initPrismExhibition() {
    if (!prismChamber || !projCanvas) return;
    const ctx = projCanvas.getContext("2d");
    if (!ctx) return;

    let activeIdx = 0;
    let cw = 0;
    let ch = 0;
    let rafId = 0;
    let lastTs = 0;
    let t = 0;
    let isVisible = false;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let mouseInside = false;

    // Project-specific state
    const state = {
      seedFaultAge: 0.4, // 0..1 fault->heal cycle
      seedFaultPos: 0.5,
      simStage: 2, // 0: challenge, 1: verifying, 2: sealed
      simBlend: 1,
      gptPulse: 0.25,
      gptSeedNode: 0,
      sonicaBurst: 0.35,
      floraActivePlane: 0,
      vrMode: "synced", // "synced" | "lagged"
      vrTrail: [],
      acemapLoaded: false,
      acemapLoading: false,
      acemapPoints: [],
      acemapField: "all",
      acemapHover: -1,
      acemapSelected: -1,
    };

    // Deterministic pseudo-random helper for sculptures
    function seeded(i, salt) {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    // Precompute GPT constellation nodes (3D sphere)
    const gptNodes = Array.from({ length: 44 }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 44);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
        cluster: i % 4,
        hue: [192, 224, 272, 322][i % 4],
      };
    });

    // Precompute icosahedron vertices & edges for Mobile VR Latency
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVerts = [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const m = Math.hypot(x, y, z);
      return [x / m, y / m, z / m];
    });
    const icoEdges = [];
    for (let i = 0; i < rawVerts.length; i++) {
      for (let j = i + 1; j < rawVerts.length; j++) {
        const d = Math.hypot(
          rawVerts[i][0] - rawVerts[j][0],
          rawVerts[i][1] - rawVerts[j][1],
          rawVerts[i][2] - rawVerts[j][2]
        );
        if (d < 1.15) icoEdges.push([i, j]);
      }
    }

    // Preview galaxy stars for Acemap before CSV load
    const previewStars = Array.from({ length: 180 }, (_, i) => {
      const arm = i % 5;
      const r = 0.08 + seeded(i, 1) * 0.4;
      const angle = arm * ((Math.PI * 2) / 5) + r * 4.5 + (seeded(i, 2) - 0.5) * 0.85;
      return {
        rx: 0.5 + Math.cos(angle) * r * 1.25,
        ry: 0.5 + Math.sin(angle) * r * 0.86,
        size: 1.2 + seeded(i, 3) * 2.8,
        color: ACEMAP_CSV_COLORS[i % ACEMAP_CSV_COLORS.length],
        phase: seeded(i, 4) * Math.PI * 2,
      };
    });

    function layoutAcemapPoints() {
      if (!state.acemapPoints.length || !cw || !ch) return;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < state.acemapPoints.length; i++) {
        const p = state.acemapPoints[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const compactViewport = window.innerWidth <= 600;
      const padX = cw * 0.07;
      const padTop = compactViewport ? 18 : 62;
      const padBottom = compactViewport ? 18 : 64;
      const availW = Math.max(40, cw - padX * 2);
      const availH = Math.max(40, ch - padTop - padBottom);
      const scale = Math.min(availW / (maxX - minX), availH / (maxY - minY));
      const ox = (cw - (maxX - minX) * scale) * 0.5;
      const oy = padTop + (availH - (maxY - minY) * scale) * 0.5;
      for (let i = 0; i < state.acemapPoints.length; i++) {
        const p = state.acemapPoints[i];
        p.px = (p.x - minX) * scale + ox;
        p.py = (p.y - minY) * scale + oy;
      }
    }

    function resize() {
      const rect = projCanvas.getBoundingClientRect();
      cw = Math.max(1, Math.round(rect.width));
      ch = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      projCanvas.width = Math.round(cw * dpr);
      projCanvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutAcemapPoints();
      renderProject(t);
    }

    /* ----- Sculpture 1: SEED (5G Harmonic Wave Healing) ----- */
    function drawSeed(time) {
      const fault = Math.max(0, 1 - state.seedFaultAge * 0.55);
      const healWave = clamp((state.seedFaultAge - 0.15) * 0.72, 0, 1.4);
      const fx = cw * state.seedFaultPos;
      const cy = ch * 0.52;

      // Ambient glow
      const bg = ctx.createRadialGradient(fx, cy, 10, fx, cy, cw * 0.55);
      bg.addColorStop(
        0,
        fault > 0.35
          ? `rgba(255, 118, 152, ${0.22 * fault})`
          : "rgba(116, 238, 224, 0.16)"
      );
      bg.addColorStop(0.5, "rgba(124, 166, 255, 0.08)");
      bg.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);

      ctx.globalCompositeOperation = "lighter";

      // 5 harmonic 5G carrier strands
      for (let s = 0; s < 5; s++) {
        const strandY = cy + (s - 2) * (ch * 0.085);
        ctx.beginPath();
        const segs = 90;
        for (let i = 0; i <= segs; i++) {
          const u = i / segs;
          const x = u * cw;
          const dist = Math.abs(x - fx) / cw;
          const isInsideHealed = dist < healWave * 0.65;
          const fracture =
            !isInsideHealed && fault > 0.05
              ? Math.exp(-dist * 11) *
                Math.sin(u * 68 + time * 18 + s * 2) *
                38 *
                fault
              : 0;
          const healRipple =
            Math.exp(-Math.pow((dist - healWave * 0.58) * 14, 2)) *
            Math.sin(time * 9 - dist * 24) *
            14 *
            (1 - clamp(healWave - 0.8, 0, 1));
          const harmonic =
            Math.sin(u * Math.PI * (3 + s * 0.45) - time * (1.8 + s * 0.25) + s) *
            (18 + s * 3.5);
          const y = strandY + harmonic + fracture + healRipple;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const hue = 178 + s * 24;
        const grad = ctx.createLinearGradient(0, 0, cw, 0);
        grad.addColorStop(0, `hsla(${hue}, 90%, 70%, 0.08)`);
        grad.addColorStop(
          clamp(state.seedFaultPos, 0.12, 0.88),
          fault > 0.45
            ? "rgba(255, 134, 168, 0.88)"
            : `hsla(${hue}, 96%, 80%, 0.85)`
        );
        grad.addColorStop(1, `hsla(${hue + 28}, 90%, 70%, 0.08)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s === 2 ? 2.4 : 1.5;
        ctx.stroke();
      }

      // Expanding SIM healing crystal ring
      const ringR = healWave * cw * 0.52;
      if (ringR > 6 && ringR < cw * 0.72) {
        const ringAlpha = clamp(1 - healWave * 0.72, 0, 0.85);
        ctx.beginPath();
        ctx.arc(fx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(128, 245, 218, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(fx, cy, Math.max(2, ringR - 9), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(199, 166, 255, ${ringAlpha * 0.65})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // SIM prismatic core node
      const coreR = 14 + Math.sin(time * 3) * 2.5;
      const coreGrad = ctx.createRadialGradient(fx, cy, 0, fx, cy, coreR * 3.4);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(0.35, "rgba(123, 232, 255, 0.6)");
      coreGrad.addColorStop(1, "rgba(123, 232, 255, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(fx, cy, coreR * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 2: SecureSIM (Refractive Iris Vault Lock) ----- */
    function drawSecureSim(time) {
      const cx = cw * 0.5;
      const cy = ch * 0.51;
      const baseR = Math.min(cw, ch) * 0.32;
      const targetBlend = state.simStage === 2 ? 1 : state.simStage === 1 ? 0.52 : 0.08;
      state.simBlend = lerp(state.simBlend, targetBlend, 0.08);
      const pointerTilt = mouseInside ? (mouseX - 0.5) * 0.45 : Math.sin(time * 0.6) * 0.15;

      ctx.globalCompositeOperation = "lighter";

      // Radial prism caustic halo
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 1.7);
      halo.addColorStop(
        0,
        state.simStage === 2
          ? "rgba(137, 243, 210, 0.32)"
          : "rgba(199, 166, 255, 0.25)"
      );
      halo.addColorStop(0.55, "rgba(123, 232, 255, 0.08)");
      halo.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, cw, ch);

      // Concentric cryptographic rings
      for (let r = 0; r < 4; r++) {
        const radius = baseR * (0.48 + r * 0.22);
        const dir = r % 2 === 0 ? 1 : -1;
        const alignOffset = (1 - state.simBlend) * (r + 1) * 0.7;
        const rot = time * (0.28 + r * 0.1) * dir * (1 - state.simBlend * 0.65) + alignOffset + pointerTilt;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        const segs = 6 + r * 2;
        for (let s = 0; s < segs; s++) {
          const a0 = (s / segs) * Math.PI * 2;
          const a1 = a0 + (Math.PI * 2) / segs - 0.16;
          ctx.beginPath();
          ctx.arc(0, 0, radius, a0, a1);
          const hue = 186 + r * 28 + (s % 2) * 18;
          ctx.strokeStyle = `hsla(${hue}, 92%, 78%, ${0.35 + state.simBlend * 0.4})`;
          ctx.lineWidth = r === 1 ? 2.4 : 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8 Refractive Iris Aperture Blades
      const blades = 8;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 0.14 + pointerTilt);
      for (let i = 0; i < blades; i++) {
        const angle = (i / blades) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        const spread = lerp(0.52, 0.14, state.simBlend);
        ctx.beginPath();
        ctx.moveTo(baseR * spread, -6);
        ctx.lineTo(baseR * 0.96, -26);
        ctx.lineTo(baseR * 0.84, 18);
        ctx.closePath();
        const bGrad = ctx.createLinearGradient(0, -24, baseR, 20);
        bGrad.addColorStop(0, "rgba(255, 255, 255, 0.24)");
        bGrad.addColorStop(0.5, "rgba(123, 232, 255, 0.14)");
        bGrad.addColorStop(1, "rgba(199, 166, 255, 0.04)");
        ctx.fillStyle = bGrad;
        ctx.fill();
        ctx.strokeStyle = `rgba(176, 235, 255, ${0.32 + state.simBlend * 0.45})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }

      // Central Hex Crystal SIM Seal
      const sealR = baseR * 0.26;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * sealR;
        const y = Math.sin(a) * sealR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle =
        state.simStage === 2
          ? "rgba(137, 243, 210, 0.28)"
          : "rgba(199, 166, 255, 0.22)";
      ctx.fill();
      ctx.strokeStyle =
        state.simStage === 2
          ? "rgba(180, 255, 232, 0.95)"
          : "rgba(220, 200, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 3: GPT-Code-Learner (Luminous Semantic Constellation) ----- */
    function drawGptConstellation(time) {
      const cx = cw * 0.5;
      const cy = ch * 0.5;
      const radius = Math.min(cw, ch) * 0.36;
      const rotY = time * 0.32 + (mouseInside ? (mouseX - 0.5) * 1.4 : 0);
      const rotX = 0.28 + (mouseInside ? (mouseY - 0.5) * 0.9 : Math.sin(time * 0.25) * 0.18);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const projected = gptNodes.map((n, idx) => {
        const x1 = n.x * cosY - n.z * sinY;
        const z1 = n.x * sinY + n.z * cosY;
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = n.y * sinX + z1 * cosX;
        const persp = 2.6 / (2.6 - z2);
        return {
          idx,
          sx: cx + x1 * radius * persp,
          sy: cy + y2 * radius * persp,
          z: z2,
          persp,
          cluster: n.cluster,
          hue: n.hue,
        };
      });

      const seedP = projected[state.gptSeedNode % projected.length];
      const waveR = state.gptPulse * radius * 2.6;

      ctx.globalCompositeOperation = "lighter";

      // Semantic edges
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
          if (d < radius * 0.58) {
            const sameCluster = a.cluster === b.cluster;
            const distFromPulse = Math.hypot(
              (a.sx + b.sx) * 0.5 - seedP.sx,
              (a.sy + b.sy) * 0.5 - seedP.sy
            );
            const pulseBoost = Math.exp(
              -Math.pow((distFromPulse - waveR) / 48, 2)
            );
            const alpha =
              (1 - d / (radius * 0.58)) * (sameCluster ? 0.28 : 0.12) +
              pulseBoost * 0.55;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `hsla(${
              pulseBoost > 0.35 ? 190 : a.hue
            }, 92%, 78%, ${clamp(alpha, 0.03, 0.85)})`;
            ctx.lineWidth = pulseBoost > 0.35 ? 1.8 : 0.9;
            ctx.stroke();
          }
        }
      }

      // Constellation nodes sorted back-to-front
      projected
        .slice()
        .sort((a, b) => a.z - b.z)
        .forEach((p) => {
          const dSeed = Math.hypot(p.sx - seedP.sx, p.sy - seedP.sy);
          const lit = Math.exp(-Math.pow((dSeed - waveR) / 52, 2));
          const r = (2.6 + p.persp * 1.7) * (1 + lit * 0.8);
          const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 4);
          g.addColorStop(0, `hsla(${p.hue}, 96%, 94%, ${0.65 + lit * 0.35})`);
          g.addColorStop(0.4, `hsla(${p.hue}, 92%, 70%, ${0.22 + lit * 0.3})`);
          g.addColorStop(1, "rgba(7, 9, 16, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 4, 0, Math.PI * 2);
          ctx.fill();
        });

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 4: Sonica (Narrowband Prism Spectrum) ----- */
    function drawSonica(time) {
      const horizonY = ch * 0.68;
      const bars = cw < 560 ? 44 : 72;
      const margin = cw * 0.08;
      const span = cw - margin * 2;
      const burst = Math.exp(-state.sonicaBurst * 2.2);

      ctx.globalCompositeOperation = "lighter";

      // Expanding over-the-air radio rings from left-center narrowband beacon
      const bx = cw * 0.5;
      const by = ch * 0.42;
      for (let ring = 0; ring < 4; ring++) {
        const prog = (time * 0.42 + ring * 0.25) % 1;
        const rx = prog * cw * 0.46;
        const ry = prog * ch * 0.24;
        ctx.beginPath();
        ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(123, 232, 255, ${(1 - prog) * (0.28 + burst * 0.35)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Narrowband spectral horizon line
      const hGrad = ctx.createLinearGradient(margin, 0, cw - margin, 0);
      hGrad.addColorStop(0, "rgba(123, 232, 255, 0)");
      hGrad.addColorStop(0.5, "rgba(180, 234, 255, 0.55)");
      hGrad.addColorStop(1, "rgba(199, 166, 255, 0)");
      ctx.strokeStyle = hGrad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(margin, horizonY);
      ctx.lineTo(cw - margin, horizonY);
      ctx.stroke();

      // Prismatic narrowband carrier spikes + inverted glass reflection
      for (let i = 0; i < bars; i++) {
        const u = i / (bars - 1);
        const x = margin + u * span;
        // Narrowband peaks cluster sharply around 3 carrier channels
        const c1 = Math.exp(-Math.pow((u - 0.28) * 16, 2));
        const c2 = Math.exp(-Math.pow((u - 0.5) * 13, 2)) * (1 + burst * 0.9);
        const c3 = Math.exp(-Math.pow((u - 0.72) * 16, 2));
        const noise =
          0.12 +
          0.1 * Math.sin(i * 1.9 + time * 4.5) +
          0.08 * Math.cos(i * 3.1 - time * 3.2);
        const pointerBoost = mouseInside
          ? Math.exp(-Math.pow((u - mouseX) * 9, 2)) * 0.55
          : 0;
        const amp =
          (c1 * 0.62 + c2 * 0.92 + c3 * 0.58 + noise + pointerBoost) *
          (ch * 0.36);

        const hue = 175 + u * 135;
        const barGrad = ctx.createLinearGradient(x, horizonY - amp, x, horizonY);
        barGrad.addColorStop(0, `hsla(${hue}, 95%, 86%, 0.95)`);
        barGrad.addColorStop(0.55, `hsla(${hue}, 90%, 66%, 0.55)`);
        barGrad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0.08)`);

        ctx.strokeStyle = barGrad;
        ctx.lineWidth = Math.max(2, (span / bars) * 0.45);
        ctx.beginPath();
        ctx.moveTo(x, horizonY);
        ctx.lineTo(x, horizonY - amp);
        ctx.stroke();

        // Soft glass reflection underneath horizon
        const refGrad = ctx.createLinearGradient(
          x,
          horizonY,
          x,
          horizonY + amp * 0.34
        );
        refGrad.addColorStop(0, `hsla(${hue}, 90%, 72%, 0.26)`);
        refGrad.addColorStop(1, `hsla(${hue}, 90%, 72%, 0)`);
        ctx.strokeStyle = refGrad;
        ctx.beginPath();
        ctx.moveTo(x, horizonY + 2);
        ctx.lineTo(x, horizonY + amp * 0.34);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 5: Flora (4-Plane Floating Light Layers) ----- */
    function drawFlora(time) {
      const cx = cw * 0.5;
      const layers = [
        { label: "04 · EDGE", hue: 312 },
        { label: "03 · CORE", hue: 266 },
        { label: "02 · RADIO", hue: 214 },
        { label: "01 · eSIM", hue: 176 },
      ];
      const planeW = Math.min(cw * 0.54, 340);
      const planeH = Math.min(ch * 0.16, 62);
      const spacing = Math.min(ch * 0.145, 62);
      const startY = ch * 0.27;
      const tiltX = mouseInside ? (mouseX - 0.5) * 26 : Math.sin(time * 0.7) * 14;

      ctx.globalCompositeOperation = "lighter";

      // Ascending chromatic light beams bridging all 4 layers
      for (let b = 0; b < 5; b++) {
        const bx = cx + (b - 2) * (planeW * 0.17) + tiltX * 0.4;
        const beamGrad = ctx.createLinearGradient(
          bx,
          startY + spacing * 3,
          bx,
          startY
        );
        beamGrad.addColorStop(0, "rgba(137, 243, 210, 0.08)");
        beamGrad.addColorStop(0.5, "rgba(123, 232, 255, 0.35)");
        beamGrad.addColorStop(1, "rgba(246, 178, 228, 0.08)");
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx, startY + spacing * 3 + 12);
        ctx.lineTo(bx, startY - 12);
        ctx.stroke();

        // Rising light photon
        const prog = (time * 0.55 + b * 0.21) % 1;
        const py = startY + spacing * 3 - prog * spacing * 3;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(bx, py, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw 4 floating isometric glass planes bottom-to-top
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const isActive = 3 - i === state.floraActivePlane;
        const bob = Math.sin(time * 1.4 + i * 0.9) * 5;
        const y = startY + i * spacing + bob;
        const shift = tiltX * ((1.5 - i) * 0.28);

        ctx.beginPath();
        ctx.moveTo(cx + shift, y - planeH * 0.5);
        ctx.lineTo(cx + planeW * 0.5 + shift, y);
        ctx.lineTo(cx + shift, y + planeH * 0.5);
        ctx.lineTo(cx - planeW * 0.5 + shift, y);
        ctx.closePath();

        const pGrad = ctx.createLinearGradient(
          cx - planeW * 0.5,
          y,
          cx + planeW * 0.5,
          y
        );
        pGrad.addColorStop(
          0,
          `hsla(${layer.hue}, 92%, 72%, ${isActive ? 0.34 : 0.14})`
        );
        pGrad.addColorStop(
          0.5,
          `hsla(${layer.hue + 20}, 95%, 86%, ${isActive ? 0.22 : 0.08})`
        );
        pGrad.addColorStop(
          1,
          `hsla(${layer.hue}, 92%, 72%, ${isActive ? 0.3 : 0.12})`
        );
        ctx.fillStyle = pGrad;
        ctx.fill();

        ctx.strokeStyle = `hsla(${layer.hue}, 95%, 82%, ${isActive ? 0.95 : 0.44})`;
        ctx.lineWidth = isActive ? 2 : 1.1;
        ctx.stroke();

        // Crisp layer tag
        ctx.globalCompositeOperation = "source-over";
        ctx.font = '600 11px "Space Grotesk", sans-serif';
        ctx.fillStyle = isActive
          ? "#ffffff"
          : "rgba(215, 230, 250, 0.72)";
        ctx.textAlign = "left";
        ctx.fillText(layer.label, cx + planeW * 0.5 + shift + 12, y + 4);
        ctx.globalCompositeOperation = "lighter";
      }

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 6: Mobile VR Latency (Synced vs Lagged 3D Wireframe Crystal) ----- */
    function drawWireCrystal(cx, cy, radius, ax, ay, strokeColor, lw) {
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);

      const pts = rawVerts.map(([x, y, z]) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const p = 2.7 / (2.7 - z2);
        return [cx + x1 * radius * p, cy + y2 * radius * p];
      });

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < icoEdges.length; i++) {
        const [a, b] = icoEdges[i];
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
      return pts;
    }

    function drawMobileVr(time) {
      const cx = cw * 0.5;
      const cy = ch * 0.51;
      const radius = Math.min(cw, ch) * 0.27;
      const isLagged = state.vrMode === "lagged";

      const targetAy =
        time * 1.15 + (mouseInside ? (mouseX - 0.5) * 2.2 : Math.sin(time * 0.7) * 0.6);
      const targetAx =
        time * 0.72 + (mouseInside ? (mouseY - 0.5) * 1.5 : Math.cos(time * 0.5) * 0.4);

      state.vrTrail.push({ ax: targetAx, ay: targetAy });
      if (state.vrTrail.length > 26) state.vrTrail.shift();

      ctx.globalCompositeOperation = "lighter";

      // Ambient glow
      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius * 2.1);
      bg.addColorStop(
        0,
        isLagged ? "rgba(255, 132, 168, 0.22)" : "rgba(123, 232, 255, 0.24)"
      );
      bg.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);

      if (isLagged) {
        // Lagged ghost frames with chromatic aberration & uplink stutter
        const ghost1 = state.vrTrail[Math.max(0, state.vrTrail.length - 18)];
        const ghost2 = state.vrTrail[Math.max(0, state.vrTrail.length - 10)];
        const jitterX = Math.sin(time * 24) * 5;
        const jitterY = Math.cos(time * 19) * 3;
        drawWireCrystal(
          cx - 14 + jitterX,
          cy + jitterY,
          radius,
          ghost1.ax,
          ghost1.ay,
          "rgba(255, 118, 156, 0.45)",
          1.4
        );
        drawWireCrystal(
          cx + 12 - jitterX * 0.5,
          cy - jitterY * 0.5,
          radius,
          ghost2.ax,
          ghost2.ay,
          "rgba(255, 198, 120, 0.55)",
          1.5
        );
      } else {
        // Proactive Synced: near-zero phase separation shimmer
        const syncedGhost = state.vrTrail[Math.max(0, state.vrTrail.length - 2)];
        drawWireCrystal(
          cx,
          cy,
          radius * 1.03,
          syncedGhost.ax,
          syncedGhost.ay,
          "rgba(199, 166, 255, 0.42)",
          1.2
        );
      }

      // Primary head-tracked crystal wireframe
      const primaryPts = drawWireCrystal(
        cx,
        cy,
        radius,
        targetAx,
        targetAy,
        isLagged ? "rgba(180, 224, 255, 0.72)" : "rgba(145, 245, 232, 0.95)",
        1.9
      );

      // Luminous vertex nodes
      for (let i = 0; i < primaryPts.length; i++) {
        const [vx, vy] = primaryPts[i];
        ctx.fillStyle = isLagged
          ? "rgba(255, 190, 210, 0.9)"
          : "rgba(220, 252, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(vx, vy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    }

    /* ----- Sculpture 7: Acemap Chromatic Galaxy (2,208 CSV Topics) ----- */
    function drawAcemap(time) {
      ctx.globalCompositeOperation = "lighter";

      if (!state.acemapLoaded) {
        // Luminous spiral nebula preview before user loads data.csv
        const bg = ctx.createRadialGradient(
          cw * 0.5,
          ch * 0.5,
          10,
          cw * 0.5,
          ch * 0.5,
          cw * 0.46
        );
        bg.addColorStop(0, "rgba(199, 166, 255, 0.2)");
        bg.addColorStop(0.45, "rgba(123, 232, 255, 0.08)");
        bg.addColorStop(1, "rgba(7, 9, 16, 0)");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cw, ch);

        previewStars.forEach((st) => {
          const drift = Math.sin(time * 0.7 + st.phase) * 4;
          const x = st.rx * cw + drift;
          const y = st.ry * ch + Math.cos(time * 0.5 + st.phase) * 3;
          ctx.fillStyle = st.color;
          ctx.globalAlpha = 0.6 + 0.35 * Math.sin(time * 1.5 + st.phase);
          ctx.beginPath();
          ctx.arc(x, y, st.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        return;
      }

      // Render all 2,208 real topics from ../../data/data.csv
      const filterField = state.acemapField;
      const pts = state.acemapPoints;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const active = filterField === "all" || p.field === Number(filterField);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = active ? 0.78 : 0.08;
        const r = active ? clamp(1.3 + (p.size - 4) * 0.16, 1.4, 4.4) : 1.1;
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Highlight hovered or selected topic with iridescent halo + neighbor rays
      const focusIdx =
        state.acemapHover >= 0 ? state.acemapHover : state.acemapSelected;
      if (focusIdx >= 0 && pts[focusIdx]) {
        const fp = pts[focusIdx];
        // Connect 6 nearest active topics in constellation rays
        const neighbors = [];
        for (let i = 0; i < pts.length; i++) {
          if (i === focusIdx) continue;
          const p = pts[i];
          if (filterField !== "all" && p.field !== Number(filterField)) continue;
          const d2 = (p.px - fp.px) ** 2 + (p.py - fp.py) ** 2;
          if (d2 < 3600) neighbors.push({ p, d2 });
        }
        neighbors.sort((a, b) => a.d2 - b.d2);
        const topN = neighbors.slice(0, 7);
        ctx.strokeStyle = "rgba(180, 236, 255, 0.42)";
        ctx.lineWidth = 1;
        topN.forEach(({ p }) => {
          ctx.beginPath();
          ctx.moveTo(fp.px, fp.py);
          ctx.lineTo(p.px, p.py);
          ctx.stroke();
        });

        const glow = ctx.createRadialGradient(fp.px, fp.py, 0, fp.px, fp.py, 26);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.96)");
        glow.addColorStop(0.35, fp.color);
        glow.addColorStop(1, "rgba(7, 9, 16, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fp.px, fp.py, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(fp.px, fp.py, 9, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Floating crisp label pill near hovered star
        ctx.globalCompositeOperation = "source-over";
        const label = `${fp.name} · ${ACEMAP_FIELDS[fp.field]}`;
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(label).width + 20;
        const lx = clamp(fp.px - tw * 0.5, 14, cw - tw - 14);
        const ly = fp.py > 95 ? fp.py - 38 : fp.py + 18;
        ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
        ctx.strokeStyle = "rgba(160, 232, 255, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(lx, ly, tw, 26, 13);
        } else {
          ctx.rect(lx, ly, tw, 26);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f4f7ff";
        ctx.textAlign = "left";
        ctx.fillText(label, lx + 10, ly + 17);
      }

      ctx.globalCompositeOperation = "source-over";
    }

    function renderProject(time) {
      ctx.clearRect(0, 0, cw, ch);
      const id = PROJECTS[activeIdx].id;
      if (id === "seed") drawSeed(time);
      else if (id === "secureSIM") drawSecureSim(time);
      else if (id === "gptcodelearner") drawGptConstellation(time);
      else if (id === "sonica") drawSonica(time);
      else if (id === "flora") drawFlora(time);
      else if (id === "lrp") drawMobileVr(time);
      else if (id === "acemap") drawAcemap(time);
    }

    function loop(now) {
      rafId = 0;
      if (!motionEnabled || !isVisible || document.hidden) {
        lastTs = 0;
        return;
      }
      if (!lastTs || now - lastTs >= 24) {
        const dt = lastTs ? Math.min((now - lastTs) / 1000, 0.06) : 0;
        t += dt;
        lastTs = now;

        // Autonomous gentle cycle for SEED, GPT, Sonica
        state.seedFaultAge += dt * 0.42;
        if (state.seedFaultAge > 2.4) {
          state.seedFaultAge = 0;
          state.seedFaultPos = 0.25 + ((Math.sin(t) + 1) * 0.25);
        }
        state.gptPulse += dt * 0.48;
        if (state.gptPulse > 1.55) {
          state.gptPulse = 0;
          state.gptSeedNode = (state.gptSeedNode + 7) % gptNodes.length;
        }
        state.sonicaBurst += dt * 0.7;
        if (state.sonicaBurst > 3.2) state.sonicaBurst = 0;

        renderProject(t);
      }
      rafId = requestAnimationFrame(loop);
    }

    syncProjectScene = () => {
      if (motionEnabled && isVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(loop);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        renderProject(t);
      }
    };

    function selectProjectById(id, scrollIntoView = false) {
      const nextIdx = PROJECTS.findIndex((p) => p.id === id);
      if (nextIdx < 0) return;
      activeIdx = nextIdx;
      const proj = PROJECTS[activeIdx];

      if (counterEl) counterEl.textContent = proj.index;
      if (kindEl) kindEl.textContent = proj.kind;
      if (titleEl) titleEl.textContent = proj.title;
      if (descEl) descEl.textContent = proj.desc;
      if (linkEl) linkEl.href = proj.href;
      if (linkLabelEl) linkLabelEl.textContent = proj.cta;
      if (statusEl) {
        if (proj.id === "acemap" && state.acemapLoaded) {
          updateAcemapStatus();
        } else {
          statusEl.textContent = proj.defaultStatus;
        }
      }

      overlayControlGroups.forEach((group) => {
        group.hidden = group.dataset.for !== proj.id;
      });

      deckCards.forEach((card) => {
        const selected = card.dataset.project === proj.id;
        card.classList.toggle("is-selected", selected);
      });

      deckFocusBtns.forEach((btn) => {
        btn.setAttribute(
          "aria-pressed",
          String(btn.dataset.selectProject === proj.id)
        );
      });

      renderProject(t);
      if (scrollIntoView) {
        prismChamber.scrollIntoView({
          behavior: motionEnabled ? "smooth" : "auto",
          block: "nearest",
        });
      }
    }

    // Navigation & Deck Card Bindings
    $("#deck-prev")?.addEventListener("click", () => {
      const next = (activeIdx - 1 + PROJECTS.length) % PROJECTS.length;
      selectProjectById(PROJECTS[next].id);
    });
    $("#deck-next")?.addEventListener("click", () => {
      const next = (activeIdx + 1) % PROJECTS.length;
      selectProjectById(PROJECTS[next].id);
    });

    deckFocusBtns.forEach((btn) => {
      btn.addEventListener("click", () =>
        selectProjectById(btn.dataset.selectProject, true)
      );
    });

    // Contextual Interactive Controls
    $("#seed-pulse-btn")?.addEventListener("click", () => {
      state.seedFaultAge = 0;
      state.seedFaultPos = 0.25 + Math.random() * 0.5;
      if (statusEl) {
        statusEl.textContent =
          "SEED · 5G failure detected — SIM-assisted harmonic recovery wave sweeping outward.";
      }
      renderProject(t);
    });

    const simLabels = [
      "SecureSIM · Challenge phase — awaiting certificate authentication.",
      "SecureSIM · Permission verification — inspecting fine-grained SIM access rules.",
      "SecureSIM · Vault sealed — authenticated & authorized access granted.",
    ];
    $("#sim-auth-btn")?.addEventListener("click", () => {
      state.simStage = (state.simStage + 1) % 3;
      if (statusEl) statusEl.textContent = simLabels[state.simStage];
      renderProject(t);
    });

    $("#gpt-query-btn")?.addEventListener("click", () => {
      state.gptPulse = 0;
      state.gptSeedNode = (state.gptSeedNode + 5) % gptNodes.length;
      if (statusEl) {
        statusEl.textContent =
          "GPT-Code-Learner · Semantic query dispatched — illuminating relevant repository context.";
      }
      renderProject(t);
    });

    $("#sonica-burst-btn")?.addEventListener("click", () => {
      state.sonicaBurst = 0;
      if (statusEl) {
        statusEl.textContent =
          "Sonica · Over-the-air NB-IoT narrowband burst emitted across software-defined eNodeB.";
      }
      renderProject(t);
    });

    const floraNames = [
      "01 · eSIM Profile",
      "02 · Software-Defined LTE RAN",
      "03 · Mobile Core",
      "04 · Edge Application & Analytics",
    ];
    $("#flora-slice-btn")?.addEventListener("click", () => {
      state.floraActivePlane = (state.floraActivePlane + 1) % 4;
      if (statusEl) {
        statusEl.textContent = `Flora · Active plane spotlight: ${floraNames[state.floraActivePlane]}.`;
      }
      renderProject(t);
    });

    $$("[data-vr-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.vrMode;
        state.vrMode = mode;
        $$("[data-vr-mode]").forEach((b) => {
          const active = b.dataset.vrMode === mode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (statusEl) {
          statusEl.textContent =
            mode === "synced"
              ? "Mobile VR Latency · Proactive Synced — uplink prepared ahead of motion arrival."
              : "Mobile VR Latency · Lagged Uplink — reactive scheduling introduces visible frame trail.";
        }
        renderProject(t);
      });
    });

    /* ----- Acemap On-Demand CSV Loader & Galaxy Filters ----- */
    const acemapLoadBtn = $("#acemap-load-btn");
    const acemapFilters = $("#acemap-filters");
    const fieldSelect = $("#acemap-field-select");
    const topicSelect = $("#acemap-topic-select");

    function updateAcemapStatus() {
      if (!statusEl || !state.acemapLoaded) return;
      const activeCount = state.acemapPoints.filter(
        (p) =>
          state.acemapField === "all" || p.field === Number(state.acemapField)
      ).length;
      const label =
        state.acemapField === "all"
          ? "All 19 disciplines"
          : ACEMAP_FIELDS[Number(state.acemapField)];
      statusEl.textContent = `Acemap · ${label} · ${activeCount.toLocaleString()} topics — hover or click any star to inspect.`;
    }

    function populateAcemapTopics() {
      if (!topicSelect) return;
      topicSelect.replaceChildren(new Option("Jump to topic…", ""));
      state.acemapPoints.forEach((p, idx) => {
        if (
          state.acemapField === "all" ||
          p.field === Number(state.acemapField)
        ) {
          topicSelect.add(new Option(p.name, String(idx)));
        }
      });
    }

    acemapLoadBtn?.addEventListener("click", async () => {
      if (state.acemapLoading || state.acemapLoaded) return;
      state.acemapLoading = true;
      acemapLoadBtn.disabled = true;
      acemapLoadBtn.textContent = "Loading 2,208 topics…";
      if (statusEl) {
        statusEl.textContent = "Acemap · Fetching ../../data/data.csv…";
      }

      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("CSV fetch failed");
        const rows = parseCSV(await res.text()).slice(1);
        const parsed = rows
          .map((r) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            size: Number(r[2]) || 4,
            name: r[3],
            color: r[4],
            field: ACEMAP_CSV_COLORS.indexOf(r[4]),
            px: 0,
            py: 0,
          }))
          .filter(
            (p) =>
              Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0
          );

        if (!parsed.length) throw new Error("Empty dataset");
        state.acemapPoints = parsed;
        state.acemapLoaded = true;
        layoutAcemapPoints();

        if (fieldSelect) {
          fieldSelect.replaceChildren(new Option("All 19 disciplines", "all"));
          ACEMAP_FIELDS.forEach((name, idx) => {
            fieldSelect.add(new Option(name, String(idx)));
          });
        }
        populateAcemapTopics();

        acemapLoadBtn.hidden = true;
        if (acemapFilters) acemapFilters.hidden = false;
        updateAcemapStatus();
        renderProject(t);
      } catch {
        state.acemapLoading = false;
        acemapLoadBtn.disabled = false;
        acemapLoadBtn.textContent = "Retry Loading CSV";
        if (statusEl) {
          statusEl.textContent =
            "Acemap · Could not load ../../data/data.csv. You can retry or visit acemap.sjtu.edu.cn directly.";
        }
      }
    });

    fieldSelect?.addEventListener("change", () => {
      state.acemapField = fieldSelect.value;
      state.acemapHover = -1;
      state.acemapSelected = -1;
      populateAcemapTopics();
      updateAcemapStatus();
      renderProject(t);
    });

    topicSelect?.addEventListener("change", () => {
      state.acemapSelected =
        topicSelect.value === "" ? -1 : Number(topicSelect.value);
      if (state.acemapSelected >= 0) {
        const p = state.acemapPoints[state.acemapSelected];
        if (statusEl && p) {
          statusEl.textContent = `Acemap · ${p.name} · ${ACEMAP_FIELDS[p.field]}`;
        }
      } else {
        updateAcemapStatus();
      }
      renderProject(t);
    });

    // Pointer interaction on the exhibition canvas
    function findNearestAcemap(cxPos, cyPos, maxDist) {
      let best = -1;
      let bestD2 = maxDist * maxDist;
      const pts = state.acemapPoints;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (
          state.acemapField !== "all" &&
          p.field !== Number(state.acemapField)
        ) {
          continue;
        }
        const d2 = (p.px - cxPos) ** 2 + (p.py - cyPos) ** 2;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    projCanvas.addEventListener(
      "pointermove",
      (e) => {
        const rect = projCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        mouseX = clamp(lx / rect.width, 0, 1);
        mouseY = clamp(ly / rect.height, 0, 1);
        mouseInside = true;

        if (PROJECTS[activeIdx].id === "acemap" && state.acemapLoaded) {
          const idx = findNearestAcemap(lx, ly, 22);
          if (idx !== state.acemapHover) {
            state.acemapHover = idx;
            if (idx >= 0 && statusEl) {
              const p = state.acemapPoints[idx];
              statusEl.textContent = `Acemap · ${p.name} · ${ACEMAP_FIELDS[p.field]}`;
            } else {
              updateAcemapStatus();
            }
            if (!motionEnabled) renderProject(t);
          }
        }
      },
      { passive: true }
    );

    projCanvas.addEventListener("pointerleave", () => {
      mouseInside = false;
      if (state.acemapHover >= 0) {
        state.acemapHover = -1;
        updateAcemapStatus();
        if (!motionEnabled) renderProject(t);
      }
    });

    projCanvas.addEventListener("click", (e) => {
      const id = PROJECTS[activeIdx].id;
      const rect = projCanvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;

      if (id === "seed") {
        state.seedFaultAge = 0;
        state.seedFaultPos = clamp(lx / rect.width, 0.14, 0.86);
        renderProject(t);
      } else if (id === "secureSIM") {
        $("#sim-auth-btn")?.click();
      } else if (id === "gptcodelearner") {
        $("#gpt-query-btn")?.click();
      } else if (id === "sonica") {
        $("#sonica-burst-btn")?.click();
      } else if (id === "flora") {
        $("#flora-slice-btn")?.click();
      } else if (id === "acemap" && state.acemapLoaded) {
        const idx = findNearestAcemap(lx, ly, 24);
        if (idx >= 0) {
          state.acemapSelected = idx;
          if (topicSelect) topicSelect.value = String(idx);
          const p = state.acemapPoints[idx];
          if (statusEl && p) {
            statusEl.textContent = `Acemap · Pinned: ${p.name} · ${ACEMAP_FIELDS[p.field]}`;
          }
          renderProject(t);
        }
      }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          syncProjectScene();
        },
        { threshold: 0.04 }
      ).observe(prismChamber);
    } else {
      isVisible = true;
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(projCanvas);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    // Sync deep link hash if pointing at a project
    const initialHash = location.hash.replace("#", "");
    if (PROJECTS.some((p) => p.id === initialHash)) {
      selectProjectById(initialHash);
    } else {
      selectProjectById("seed");
    }

    resize();
    syncProjectScene();
  }

  /* ========================================================================
     6. PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
     ======================================================================== */
  const pubButtons = $$(".pub-filter-btn");
  const pubGroups = $$(".pub-group");
  const pubCountEl = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    pubButtons.forEach((btn) => {
      const active = btn.dataset.filter === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    const visibleGroups = pubGroups.filter((g) => !g.hidden);
    const total = visibleGroups.reduce(
      (sum, g) => sum + g.querySelectorAll(".pub-row").length,
      0
    );
    const years = visibleGroups.flatMap((g) =>
      $$(".pub-year", g).map((y) => Number(y.textContent))
    );
    if (pubCountEl && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCountEl.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  pubButtons.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubHash() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubHash);
  syncPubHash();

  /* ========================================================================
     7. REDUCED MOTION & PAGE VISIBILITY LIFECYCLE
     ======================================================================== */
  function handleMotionChange() {
    motionEnabled = !reduceMotionQuery.matches;
    syncHeroScene();
    syncProjectScene();
  }

  reduceMotionQuery.addEventListener("change", handleMotionChange);
  document.addEventListener("visibilitychange", () => {
    syncHeroScene();
    syncProjectScene();
  });

  try {
    initHeroCaustics();
  } catch {
    // Graceful fallback: CSS obsidian gradient remains crisp without canvas
  }

  try {
    initPrismExhibition();
  } catch {
    // Graceful fallback: all 7 projects remain fully accessible in the spatial deck
  }
})();
