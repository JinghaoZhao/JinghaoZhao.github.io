/* JZ-78 // Cybernetic Oscilloscope & Phosphor Vector Instrumentation */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Year readout
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Motion & pointer preferences
  const reduceMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotionMQ.matches;

  const canvasControllers = [];
  function syncAllCanvases() {
    canvasControllers.forEach((ctrl) => ctrl.sync());
  }

  reduceMotionMQ.addEventListener("change", () => {
    motionEnabled = !reduceMotionMQ.matches;
    syncAllCanvases();
  });

  document.addEventListener("visibilitychange", syncAllCanvases);

  // =========================================================================
  // HEADER SCROLL-SPY & ROTARY DETENT NAVIGATION
  // =========================================================================
  const header = $("#site-header");
  const navLinks = $$(".rotary-nav a");
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function updateScrollUI() {
    scrollQueued = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 28);

    let activeId = "";
    const threshold = window.innerHeight * 0.36;
    for (let i = 0; i < navSections.length; i++) {
      if (navSections[i].getBoundingClientRect().top <= threshold) {
        activeId = navSections[i].id;
      }
    }
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#" + activeId) {
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
        requestAnimationFrame(updateScrollUI);
      }
    },
    { passive: true },
  );
  updateScrollUI();

  // =========================================================================
  // UTILITY: MANAGED HIGH-DPI CANVAS CONTROLLER (OFFSCREEN PAUSE + REDUCED MOTION)
  // =========================================================================
  function createManagedCanvas(canvas, container, onResize, onDraw) {
    if (!canvas || !container) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let rafId = 0;
    let lastTime = 0;
    let simTime = 0;
    let pausedByUser = false;

    function resize() {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(ctx, width, height, dpr);
      onDraw(ctx, width, height, simTime, 0, true);
    }

    function loop(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden || pausedByUser) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
      lastTime = now;
      simTime += dt;
      onDraw(ctx, width, height, simTime, dt, false);
      rafId = requestAnimationFrame(loop);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden && !pausedByUser) {
        if (!rafId) rafId = requestAnimationFrame(loop);
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        lastTime = 0;
        if (width > 0 && height > 0) {
          onDraw(ctx, width, height, simTime, 0, true);
        }
      }
    }

    function renderStatic() {
      if (width > 0 && height > 0) {
        onDraw(ctx, width, height, simTime, 0, true);
      }
    }

    function setPaused(p) {
      pausedByUser = Boolean(p);
      sync();
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          sync();
        },
        { threshold: 0.02 },
      ).observe(container);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(container);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    const ctrl = {
      sync,
      renderStatic,
      setPaused,
      getSize: () => ({ width, height }),
      getCtx: () => ctx,
    };
    canvasControllers.push(ctrl);
    sync();
    return ctrl;
  }

  // Helper: Draw calibrated oscilloscope graticule
  function drawGraticule(ctx, w, h, cols, rows) {
    ctx.save();
    ctx.strokeStyle = "rgba(61, 255, 154, 0.09)";
    ctx.lineWidth = 1;
    const dx = w / cols;
    const dy = h / rows;

    ctx.beginPath();
    for (let c = 1; c < cols; c++) {
      const x = Math.round(c * dx) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let r = 1; r < rows; r++) {
      const y = Math.round(r * dy) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center axes with fine calibration ticks
    const cx = Math.round(w * 0.5) + 0.5;
    const cy = Math.round(h * 0.5) + 0.5;
    ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);

    const tickStepX = dx / 5;
    for (let x = tickStepX; x < w; x += tickStepX) {
      ctx.moveTo(x, cy - 3);
      ctx.lineTo(x, cy + 3);
    }
    const tickStepY = dy / 5;
    for (let y = tickStepY; y < h; y += tickStepY) {
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx + 3, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 1. HERO: REAL-TIME PHOSPHOR LISSAJOUS & 3D VECTOR-SCOPE
  // =========================================================================
  (function initHeroScope() {
    const canvas = $("#hero-scope");
    const stage = $(".crt-stage");
    if (!canvas || !stage) return;

    const ratioEl = $("#hero-ratio");
    const phaseEl = $("#hero-phase");
    const modeEl = $("#hero-mode-readout");
    const holdBtn = $("#hero-hold-btn");
    const presetBtns = $$(".tuner-key");

    let baseFx = 3;
    let baseFy = 2;
    let targetPtrX = 0;
    let targetPtrY = 0;
    let ptrX = 0;
    let ptrY = 0;
    let held = false;
    let lastHudUpdate = 0;

    const ctrl = createManagedCanvas(
      canvas,
      stage,
      (ctx, w, h) => {
        ctx.fillStyle = "#040907";
        ctx.fillRect(0, 0, w, h);
      },
      (ctx, w, h, t, dt, isStatic) => {
        // Genuine phosphor afterglow persistence fade!
        if (isStatic) {
          ctx.fillStyle = "#040907";
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(4, 9, 7, 0.14)";
          ctx.fillRect(0, 0, w, h);
        }

        // Smooth pointer modulation or autonomous mobile harmonic sweep
        const autoX = Math.sin(t * 0.28) * 0.42;
        const autoY = Math.cos(t * 0.21) * 0.35;
        const destX = finePointerMQ.matches ? targetPtrX : autoX;
        const destY = finePointerMQ.matches ? targetPtrY : autoY;
        ptrX += (destX - ptrX) * (isStatic ? 1 : 0.08);
        ptrY += (destY - ptrY) * (isStatic ? 1 : 0.08);

        const fx = baseFx + ptrX * 0.48;
        const fy = baseFy + ptrY * 0.36;
        const fz = (baseFx + baseFy) * 0.5;
        const phase = t * 0.52 + ptrX * 1.45;
        const rotY = t * 0.24 + ptrX * 0.7;
        const rotX = 0.36 + ptrY * 0.52;

        // Place focal vector-scope slightly right on desktop, centered on mobile
        const cx = w > 920 ? w * 0.67 : w * 0.54;
        const cy = w > 920 ? h * 0.48 : h * 0.46;
        const radius = Math.min(w, h) * (w > 920 ? 0.34 : 0.36);

        // Subtle polar calibration reticle behind the knot
        ctx.save();
        ctx.strokeStyle = "rgba(61, 255, 154, 0.11)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.06, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(61, 255, 154, 0.065)";
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating calibration ticks around outer ring
        const tickCount = 36;
        ctx.strokeStyle = "rgba(61, 255, 154, 0.22)";
        ctx.beginPath();
        for (let i = 0; i < tickCount; i++) {
          const ang = (i / tickCount) * Math.PI * 2 + t * 0.04;
          const rIn = radius * (i % 3 === 0 ? 1.02 : 1.045);
          const rOut = radius * 1.08;
          ctx.moveTo(cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn);
          ctx.lineTo(cx + Math.cos(ang) * rOut, cy + Math.sin(ang) * rOut);
        }
        ctx.stroke();
        ctx.restore();

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        function project(x3, y3, z3) {
          const rx = x3 * cosY - z3 * sinY;
          const rz1 = x3 * sinY + z3 * cosY;
          const ry = y3 * cosX - rz1 * sinX;
          const rz = y3 * sinX + rz1 * cosX;
          const persp = 2.7 / (2.7 - rz * 0.55);
          return {
            x: cx + rx * radius * persp,
            y: cy + ry * radius * persp,
            z: rz,
          };
        }

        const samples = 260;

        // Secondary quadrature harmonic trace (Warm Oscilloscope Amber)
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const u = (i / samples) * Math.PI * 2;
          const x3 = Math.sin(fx * u + phase + 0.9) * 0.86;
          const y3 = Math.sin(fy * u + 0.65) * 0.72;
          const z3 = Math.cos(fz * u + phase * 0.7) * 0.65;
          const p = project(x3, y3, z3);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(255, 184, 51, 0.55)";
        ctx.lineWidth = 1.25;
        ctx.shadowColor = "rgba(255, 184, 51, 0.5)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // Primary P31 Phosphor Mint 3D Lissajous beam
        ctx.save();
        ctx.beginPath();
        let beamHead = null;
        const headIdx = Math.floor(((t * 0.45) % 1) * samples);
        for (let i = 0; i <= samples; i++) {
          const u = (i / samples) * Math.PI * 2;
          const x3 = Math.sin(fx * u + phase);
          const y3 = Math.sin(fy * u);
          const z3 = Math.sin(fz * u - phase * 0.55) * 0.75;
          const p = project(x3, y3, z3);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          if (i === headIdx) beamHead = p;
        }
        ctx.strokeStyle = "rgba(61, 255, 154, 0.88)";
        ctx.lineWidth = 1.85;
        ctx.shadowColor = "#3dff9a";
        ctx.shadowBlur = 13;
        ctx.stroke();

        // Bright white-mint phosphor electron-beam head dot
        if (beamHead) {
          ctx.fillStyle = "#eafff4";
          ctx.shadowColor = "#3dff9a";
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(beamHead.x, beamHead.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Throttled telemetry text update (~12 Hz)
        if (isStatic || t - lastHudUpdate > 0.085) {
          lastHudUpdate = t;
          if (ratioEl) ratioEl.textContent = `${fx.toFixed(2)} : ${fy.toFixed(2)}`;
          if (phaseEl) {
            const normPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            phaseEl.textContent = `${normPhase.toFixed(2)} rad`;
          }
        }
      },
    );

    if (!ctrl) return;

    stage.addEventListener(
      "pointermove",
      (ev) => {
        if (!finePointerMQ.matches) return;
        const rect = stage.getBoundingClientRect();
        targetPtrX = clamp(((ev.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
        targetPtrY = clamp(((ev.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      },
      { passive: true },
    );

    stage.addEventListener("pointerleave", () => {
      targetPtrX = 0;
      targetPtrY = 0;
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const parts = (btn.dataset.harmonic || "3,2").split(",").map(Number);
        baseFx = parts[0] || 3;
        baseFy = parts[1] || 2;
        presetBtns.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn)),
        );
        if (!motionEnabled || held) ctrl.renderStatic();
      });
    });

    if (holdBtn) {
      holdBtn.addEventListener("click", () => {
        held = !held;
        holdBtn.setAttribute("aria-pressed", String(held));
        if (modeEl) modeEl.textContent = held ? "TRACE HELD" : "LIVE PERSISTENCE";
        ctrl.setPaused(held);
      });
    }
  })();

  // =========================================================================
  // 2. SECTION 01: BARE METAL × CME MULTI-CHANNEL SYSTEM BUS MONITOR
  // =========================================================================
  (function initBusMonitor() {
    const canvas = $("#bus-scope");
    const bezel = $(".bus-scope-bezel");
    if (!canvas || !bezel) return;

    const switches = $$("[data-bus-mode]");
    const cards = $$("[data-bus-card]");
    const chAEl = $("#bus-ch-a");
    const chBEl = $("#bus-ch-b");
    const tagEl = $("#bus-scope-tag");
    const detailEl = $("#bus-scope-detail");

    const MODES = {
      host: {
        tag: "MODE: HOST / FABRIC",
        chA: "CH-A: PHYSICAL SILICON & FABRIC",
        chB: "CH-B: STORAGE & I/O BOUNDARY",
        detail: "COMPUTE / CONTROL / CONNECT — PHYSICAL HOSTS & CLOUD FABRIC",
      },
      lifecycle: {
        tag: "MODE: FLEET LIFECYCLE",
        chA: "CH-A: AUTOMATED PROVISIONING ENVELOPE",
        chB: "CH-B: SAFE CONTROL-PLANE TRANSITION",
        detail: "ORCHESTRATION STATE TRANSITIONS — FLEET LIFECYCLE",
      },
      cme: {
        tag: "MODE: GOOGLE CLOUD × CME LOW-LATENCY",
        chA: "CH-A: DETERMINISTIC BARE METAL RAIL",
        chB: "CH-B: ULTRA-LOW-LATENCY FABRIC SYNC",
        detail: "GOOGLE CLOUD × CME GROUP — DETERMINISTIC INFRASTRUCTURE",
      },
    };

    let activeMode = "host";
    let flash = 0;

    const ctrl = createManagedCanvas(
      canvas,
      bezel,
      (ctx, w, h) => {
        ctx.fillStyle = "#040907";
        ctx.fillRect(0, 0, w, h);
      },
      (ctx, w, h, t, dt, isStatic) => {
        if (isStatic) {
          ctx.fillStyle = "#040907";
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(4, 9, 7, 0.18)";
          ctx.fillRect(0, 0, w, h);
        }

        drawGraticule(ctx, w, h, 10, 6);

        const padY = 34;
        const midA = padY + (h - padY * 2) * 0.3;
        const midB = padY + (h - padY * 2) * 0.72;
        const amp = Math.min(40, (h - padY * 2) * 0.19);
        const steps = 220;

        function evalSignals(u) {
          // u in [0, 1]
          const phase = u * Math.PI * 6 - t * 2.8;
          if (activeMode === "host") {
            // Clean high-speed hardware bus clock + fabric burst
            const clk = Math.tanh(Math.sin(u * Math.PI * 12 - t * 4.0) * 3.8);
            const env = 0.55 + 0.45 * Math.sin(u * Math.PI * 2 - t * 1.1);
            const yA = clk * env * 0.78 + Math.sin(phase * 2.5) * 0.14;
            const yB =
              Math.sin(u * Math.PI * 8 - t * 3.1) * 0.58 +
              Math.sin(u * Math.PI * 24 - t * 6.0) * 0.22;
            return [yA, yB];
          }
          if (activeMode === "lifecycle") {
            // Stepped automated provisioning state machine + smooth control plane response
            const seg = ((u * 4 - t * 0.45) % 4 + 4) % 4;
            const stepVal =
              seg < 1 ? -0.7 : seg < 2 ? -0.15 : seg < 3 ? 0.55 : 0.85;
            const edge = Math.exp(-((seg % 1) * 9)) * 0.24;
            const yA = stepVal + edge * Math.sin(seg * 22);
            const yB =
              Math.tanh(Math.sin(u * Math.PI * 4 - t * 1.4) * 1.6) * 0.72;
            return [yA, yB];
          }
          // CME low-latency: razor-sharp phase-locked deterministic pulses
          const pulsePos = ((u * 6 - t * 1.6) % 1 + 1) % 1;
          const sharpPulse = Math.exp(-Math.pow((pulsePos - 0.5) * 18, 2));
          const yA =
            sharpPulse * 0.96 - 0.18 + Math.sin(u * Math.PI * 12 - t * 6) * 0.05;
          const syncPulse = Math.exp(-Math.pow((pulsePos - 0.52) * 20, 2));
          const yB = syncPulse * 0.88 - 0.22;
          return [yA, yB];
        }

        // Draw Channel A (Phosphor Mint)
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const [yA] = evalSignals(u);
          const x = u * w;
          const y = midA - yA * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#3dff9a";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#3dff9a";
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Draw Channel B (Oscilloscope Amber)
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const [, yB] = evalSignals(u);
          const x = u * w;
          const y = midB - yB * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#ffb833";
        ctx.lineWidth = 1.75;
        ctx.shadowColor = "#ffb833";
        ctx.shadowBlur = 9;
        ctx.stroke();

        // Traveling trigger cursor
        const sweepX = ((t * 0.22) % 1) * w;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(61, 255, 154, 0.26)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sweepX, 26);
        ctx.lineTo(sweepX, h - 26);
        ctx.stroke();

        // Retrace flash on mode change
        if (flash > 0.01) {
          ctx.fillStyle = `rgba(61, 255, 154, ${flash * 0.16})`;
          ctx.fillRect(0, 0, w, h);
          flash = Math.max(0, flash - dt * 3.5);
        }
        ctx.restore();
      },
    );

    function setBusMode(mode) {
      if (!MODES[mode]) return;
      activeMode = mode;
      flash = 0.85;
      const info = MODES[mode];
      if (chAEl) chAEl.textContent = info.chA;
      if (chBEl) chBEl.textContent = info.chB;
      if (tagEl) tagEl.textContent = info.tag;
      if (detailEl) detailEl.textContent = info.detail;

      switches.forEach((btn) =>
        btn.setAttribute("aria-pressed", String(btn.dataset.busMode === mode)),
      );
      cards.forEach((card) =>
        card.classList.toggle("is-active", card.dataset.busCard === mode),
      );
      if (ctrl && !motionEnabled) ctrl.renderStatic();
    }

    switches.forEach((btn) =>
      btn.addEventListener("click", () => setBusMode(btn.dataset.busMode)),
    );
    cards.forEach((card) =>
      card.addEventListener("click", () => setBusMode(card.dataset.busCard)),
    );
  })();

  // =========================================================================
  // 3. SECTION 02: 7-CHANNEL PATCH-BAY & LIVE PHOSPHOR OSCILLOSCOPE
  // =========================================================================
  (function initProjectPatchbay() {
    const canvas = $("#project-scope");
    const bezel = $(".main-scope-bezel");
    if (!canvas || !bezel) return;

    const tabs = $$(".patch-btn");
    const matrixRows = $$(".matrix-row");
    const ctrlGroups = $$(".ch-ctrl-group");
    const scopePanel = $("#project-scope-panel");

    const chBadgeEl = $("#scope-ch-badge");
    const chTitleEl = $("#scope-ch-title");
    const chVenueEl = $("#scope-ch-venue");
    const chDescEl = $("#scope-ch-desc");
    const chLinkEl = $("#scope-ch-link");
    const tlEl = $("#scope-readout-tl");
    const trEl = $("#scope-readout-tr");
    const blEl = $("#scope-readout-bl");
    const brEl = $("#scope-readout-br");

    const CHANNELS = {
      seed: {
        badge: "CH-01",
        tabId: "tab-seed",
        title: "SEED",
        venue: "ACM SIGCOMM ’22",
        desc: "Diagnosing and recovering from 5G failures through the SIM. A device reports a failure to the SEED SIM applet; SIM and core-network diagnosis inform a recovery action.",
        linkText: "Read the SIGCOMM ’22 paper",
        linkHref: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
        tl: "CH-01 // SEED · 5G SIM DIAGNOSTICS",
        tr: "ILLUSTRATIVE SIGNAL MODEL",
        bl: "DEVICE → SIM APPLET → 5G CORE CAUSE INFERENCE → RECOVERY",
        br: "PHASE-LOCK MONITOR",
      },
      securesim: {
        badge: "CH-02",
        tabId: "tab-securesim",
        title: "SecureSIM",
        venue: "ACM MobiCom ’21",
        desc: "Authentication and fine-grained access control for SIM and eSIM. A certificate is authenticated, a request is checked against permissions, and authorized access reaches the SIM service.",
        linkText: "Read the MobiCom ’21 paper",
        linkHref: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
        tl: "CH-02 // SECURESIM · POLAR HANDSHAKE",
        tr: "ILLUSTRATIVE AUTH GATE",
        bl: "CERTIFICATE VERIFY → PERMISSION MATRIX → SIM SERVICE GATE",
        br: "POLAR PHASE-RING",
      },
      gptcode: {
        badge: "CH-03",
        tabId: "tab-gptcode",
        title: "GPT-Code-Learner",
        venue: "OPEN SOURCE",
        desc: "Explore a codebase through questions, context, and GPT. Source code is searched by the context toolkit; the question and relevant repository context inform a GPT explanation.",
        linkText: "Explore on GitHub",
        linkHref: "https://github.com/JinghaoZhao/GPT-Code-Learner",
        tl: "CH-03 // GPT-CODE-LEARNER · AST VECTOR SCAN",
        tr: "CONCEPTUAL RETRIEVAL GRAPH",
        bl: "CODEBASE → CONTEXT TOOLKIT SEARCH → QUESTION + CONTEXT → GPT",
        br: "VECTOR TREE",
      },
      sonica: {
        badge: "CH-04",
        tabId: "tab-sonica",
        title: "Sonica",
        venue: "OPEN NB-IOT TESTBED",
        desc: "An open NB-IoT network for experiments with real devices. A commodity NB-IoT device communicates over the air with a software-defined eNodeB and a CIoT-enabled core, enabling OTA network research.",
        linkText: "Explore on GitHub",
        linkHref: "https://github.com/sonica-nbiot/sonica",
        tl: "CH-04 // SONICA · NB-IOT RF SPECTRUM & WATERFALL",
        tr: "ILLUSTRATIVE RF SPECTRUM",
        bl: "COTS NB-IOT DEVICE ↔ SDR eNodeB ↔ EPC + CIoT CORE",
        br: "WATERFALL ANALYZER",
      },
      flora: {
        badge: "CH-05",
        tabId: "tab-flora",
        title: "Flora",
        venue: "OPEN MOBILE NETWORK",
        desc: "A software-defined mobile network spanning eSIM, radio, core, and edge. A configurable eSIM profile connects through the software-defined LTE RAN and core to an edge VR application, with network analytics across the platform.",
        linkText: "Explore the project",
        linkHref: "https://project-flora.github.io/Flora/",
        tl: "CH-05 // FLORA · 4-CHANNEL SYNCHRONIZED STACK",
        tr: "ILLUSTRATIVE STACK TRACE",
        bl: "eSIM PROFILE → SDR LTE RAN → CORE → EDGE VR + ANALYTICS",
        br: "4-CH LOGIC SYNC",
      },
      lrp: {
        badge: "CH-06",
        tabId: "tab-lrp",
        title: "Mobile VR Latency",
        venue: "USENIX NSDI ’21",
        desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion. Application-layer inference, DRX doze reduction, and proactive scheduling prepare the uplink ahead of data arrival.",
        linkText: "Read the NSDI ’21 paper",
        linkHref: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
        tl: "CH-06 // MOBILE VR LATENCY · DUAL-BEAM JITTER",
        tr: "ILLUSTRATIVE TIMING · NOT A BENCHMARK",
        bl: "AMBER: STD LTE (DRX LAG)  |  MINT: PROACTIVE UPLINK SCHEDULING",
        br: "DUAL-BEAM COMPARE",
      },
      acemap: {
        badge: "CH-07",
        tabId: "tab-acemap",
        title: "Acemap",
        venue: "2,208 TOPICS · 19 DISCIPLINES",
        desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines. Load the original dataset on demand to sweep, filter, and lock onto any topic.",
        linkText: "Explore Acemap",
        linkHref: "https://acemap.sjtu.edu.cn/",
        tl: "CH-07 // ACEMAP · 2,208-TOPIC PHOSPHOR RADAR",
        tr: "ON-DEMAND DATASET",
        bl: "CLICK 'LOAD 2,208-TOPIC DATASET' TO ACQUIRE ../../data/data.csv",
        br: "RADAR STANDBY",
      },
    };

    let activeChannel = "seed";
    let retraceFlash = 0;

    // --- Channel-specific states ---
    // CH-01 SEED
    let seedFaultAge = 99;
    let seedNextAuto = 4.5;
    const seedFaultBtn = $("#seed-fault-btn");
    const seedStatusEl = $("#seed-status");

    // CH-02 SecureSIM
    let simAuthorized = true;
    let simPulseAge = 0;
    const simAllowBtn = $("#sim-auth-allow");
    const simDenyBtn = $("#sim-auth-deny");

    // CH-03 GPT-Code-Learner
    const gptTargets = [
      { label: "src/context_toolkit", path: [0, 1, 4, 8] },
      { label: "src/ast_indexer", path: [0, 1, 5, 9] },
      { label: "docs/architecture", path: [0, 2, 6, 10] },
      { label: "src/query_synthesizer", path: [0, 3, 7, 11] },
    ];
    let gptTargetIdx = 0;
    let gptSweepProg = 0;
    const gptQueryBtn = $("#gpt-query-btn");
    const gptStatusEl = $("#gpt-status");

    // CH-04 Sonica (offscreen waterfall canvas)
    let sonicaWide = false;
    const sonicaSpanBtn = $("#sonica-span-btn");
    const wfCanvas = document.createElement("canvas");
    const wfCtx = wfCanvas.getContext("2d");
    wfCanvas.width = 400;
    wfCanvas.height = 140;

    // CH-05 Flora
    let floraBurstAge = 0.2;
    const floraBurstBtn = $("#flora-burst-btn");

    // CH-06 Mobile VR Latency
    let lrpMode = "dual";
    const lrpModeBtns = $$("[data-lrp-mode]");

    // CH-07 Acemap (On-Demand ../../data/data.csv)
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
    // Phosphor-tuned palette for 19 disciplines on emerald-obsidian CRT
    const ACEMAP_CRT_COLORS = [
      "#5fffa8",
      "#8df26b",
      "#7be3ff",
      "#ffb833",
      "#3dff9a",
      "#d4f763",
      "#5ce1e6",
      "#ffc966",
      "#47ffd1",
      "#a6e8cf",
      "#38f2ff",
      "#79f2b3",
      "#e5d66b",
      "#6ef587",
      "#ffa552",
      "#ffca4b",
      "#94ffd6",
      "#52ff7a",
      "#ffd97d",
    ];

    let acemapLoaded = false;
    let acemapLoading = false;
    let acemapPoints = [];
    let acemapSelectedField = "all";
    let acemapHoverIdx = -1;
    let acemapSelectedIdx = -1;
    let acemapMeta = { cx: 0, cy: 0, r: 100 };

    const acemapLoadBtn = $("#acemap-load-btn");
    const acemapFieldWrap = $("#acemap-field-wrap");
    const acemapTopicWrap = $("#acemap-topic-wrap");
    const acemapFieldSelect = $("#acemap-field");
    const acemapTopicSelect = $("#acemap-topic");

    // Quoted CSV parser (handles commas inside quoted topic names)
    function parseCSV(text) {
      const rows = [];
      let row = [];
      let field = "";
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          if (quoted && text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (ch === "," && !quoted) {
          row.push(field);
          field = "";
        } else if ((ch === "\n" || ch === "\r") && !quoted) {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          row.push(field);
          if (row.some(Boolean)) rows.push(row);
          row = [];
          field = "";
        } else {
          field += ch;
        }
      }
      if (field || row.length) {
        row.push(field);
        rows.push(row);
      }
      return rows;
    }

    function isAcemapActive(p) {
      return (
        acemapSelectedField === "all" ||
        p.field === Number(acemapSelectedField)
      );
    }

    function updateAcemapReadout() {
      if (activeChannel !== "acemap") return;
      if (!acemapLoaded) {
        if (blEl) {
          blEl.textContent =
            "CLICK 'LOAD 2,208-TOPIC DATASET' TO ACQUIRE ../../data/data.csv";
        }
        if (brEl) brEl.textContent = "RADAR STANDBY";
        return;
      }
      const focusIdx = acemapHoverIdx >= 0 ? acemapHoverIdx : acemapSelectedIdx;
      if (focusIdx >= 0 && acemapPoints[focusIdx]) {
        const pt = acemapPoints[focusIdx];
        if (blEl) {
          blEl.textContent = `LOCK: ${pt.name} · ${ACEMAP_FIELDS[pt.field]} · ID ${pt.id}`;
        }
        if (brEl) {
          brEl.textContent = `X:${pt.x.toFixed(1)}  Y:${pt.y.toFixed(1)}`;
        }
        return;
      }
      const label =
        acemapSelectedField === "all"
          ? "ALL 19 DISCIPLINES"
          : ACEMAP_FIELDS[Number(acemapSelectedField)].toUpperCase();
      let count = 0;
      for (let i = 0; i < acemapPoints.length; i++) {
        if (isAcemapActive(acemapPoints[i])) count++;
      }
      if (blEl) {
        blEl.textContent = `RADAR LOCKED: ${label} · ${count.toLocaleString()} TOPICS · HOVER OR CLICK BLIP`;
      }
      if (brEl) brEl.textContent = `ACTIVE: ${count.toLocaleString()}`;
    }

    function refreshAcemapTopicsDropdown() {
      if (!acemapTopicSelect) return;
      const frag = document.createDocumentFragment();
      frag.appendChild(new Option("Lock target topic…", ""));
      for (let i = 0; i < acemapPoints.length; i++) {
        if (isAcemapActive(acemapPoints[i])) {
          frag.appendChild(new Option(acemapPoints[i].name, String(i)));
        }
      }
      acemapTopicSelect.replaceChildren(frag);
    }

    async function loadAcemapDataset() {
      if (acemapLoaded || acemapLoading) return;
      acemapLoading = true;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = true;
        acemapLoadBtn.textContent = "ACQUIRING DATASET…";
      }
      if (blEl) blEl.textContent = "FETCHING ../../data/data.csv…";

      try {
        const resp = await fetch("../../data/data.csv");
        if (!resp.ok) throw new Error("Dataset unavailable");
        const text = await resp.text();
        const rows = parseCSV(text).slice(1);

        const parsed = [];
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const x = Number(r[0]);
          const y = Number(r[1]);
          const size = Number(r[2]) || 4;
          const name = r[3] || "";
          const color = (r[4] || "").trim().toLowerCase();
          const id = r[5] || "";
          const field = ACEMAP_SOURCE_COLORS.indexOf(color);
          if (!Number.isFinite(x) || !Number.isFinite(y) || field < 0) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          parsed.push({
            x,
            y,
            size,
            name,
            field,
            id,
            nx: 0,
            ny: 0,
            ang: 0,
            px: 0,
            py: 0,
          });
        }

        if (!parsed.length) throw new Error("Empty dataset");

        const midX = (minX + maxX) * 0.5;
        const midY = (minY + maxY) * 0.5;
        const halfSpan = Math.max(maxX - minX, maxY - minY) * 0.52 || 1;

        for (let i = 0; i < parsed.length; i++) {
          const p = parsed[i];
          p.nx = (p.x - midX) / halfSpan;
          p.ny = (p.y - midY) / halfSpan;
          p.ang = (Math.atan2(p.ny, p.nx) + Math.PI * 2) % (Math.PI * 2);
        }

        acemapPoints = parsed;
        acemapLoaded = true;
        acemapLoading = false;

        if (acemapFieldSelect) {
          const frag = document.createDocumentFragment();
          frag.appendChild(new Option("All 19 disciplines", "all"));
          ACEMAP_FIELDS.forEach((f, idx) => {
            frag.appendChild(new Option(f, String(idx)));
          });
          acemapFieldSelect.replaceChildren(frag);
        }

        refreshAcemapTopicsDropdown();

        if (acemapLoadBtn) acemapLoadBtn.hidden = true;
        if (acemapFieldWrap) acemapFieldWrap.hidden = false;
        if (acemapTopicWrap) acemapTopicWrap.hidden = false;

        updateAcemapReadout();
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      } catch (_err) {
        acemapLoading = false;
        if (acemapLoadBtn) {
          acemapLoadBtn.disabled = false;
          acemapLoadBtn.textContent = "RETRY DATASET LOAD";
        }
        if (blEl) {
          blEl.textContent =
            "DATASET LOAD FAILED — RETRY OR VISIT ACEMAP VIA PROJECT LINK";
        }
      }
    }

    // --- INDIVIDUAL CHANNEL RENDERERS ---

    // CH-01: SEED (5G fault spike & self-healing phase-lock)
    function drawSeed(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) {
        seedFaultAge += dt;
        seedNextAuto -= dt;
        if (seedNextAuto <= 0 && seedFaultAge > 5.2) {
          seedFaultAge = 0;
          seedNextAuto = 11.5;
        }
      } else if (seedFaultAge > 10) {
        seedFaultAge = 1.6;
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.16)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const midY = h * 0.52;
      const baseAmp = Math.min(70, h * 0.2);

      // Determine fault severity & recovery phase
      let stateText = "STATE: PHASE-LOCKED";
      let faultPower = 0;
      let diagActive = false;
      let recoverBlend = 0;

      if (seedFaultAge < 1.3) {
        faultPower = Math.sin((seedFaultAge / 1.3) * Math.PI);
        stateText = "ALERT: 5G FAILURE TRANSIENT DETECTED";
      } else if (seedFaultAge < 2.9) {
        faultPower = 0.55 * (1 - (seedFaultAge - 1.3) / 1.6);
        diagActive = true;
        stateText = "DIAGNOSING: SIM APPLET + 5G CORE INFERENCE";
      } else if (seedFaultAge < 4.5) {
        recoverBlend = (seedFaultAge - 2.9) / 1.6;
        faultPower = 0.14 * (1 - recoverBlend);
        stateText = "RECOVERY: PHASE-LOCK RESTORING";
      }

      if (seedStatusEl && seedStatusEl.textContent !== stateText) {
        seedStatusEl.textContent = stateText;
      }

      // Reference phase-lock envelope (dashed faint mint)
      ctx.save();
      ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      const steps = 240;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = u * w;
        const y = midY - Math.sin(u * Math.PI * 8 - t * 4.2) * baseAmp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Diagnostic strobe scan window during SIM + Core diagnosis
      if (diagActive) {
        const scanX = ((seedFaultAge - 1.3) / 1.6) * w;
        const grad = ctx.createLinearGradient(scanX - 55, 0, scanX + 55, 0);
        grad.addColorStop(0, "rgba(255, 184, 51, 0)");
        grad.addColorStop(0.5, "rgba(255, 184, 51, 0.16)");
        grad.addColorStop(1, "rgba(255, 184, 51, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(scanX - 55, 28, 110, h - 56);
        ctx.strokeStyle = "rgba(255, 184, 51, 0.72)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(scanX, 28);
        ctx.lineTo(scanX, h - 28);
        ctx.stroke();
      }

      // Live 5G signal beam
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = u * w;
        let carrier = Math.sin(u * Math.PI * 8 - t * 4.2) * baseAmp;
        if (faultPower > 0.005) {
          const spikeCenter = 0.48 + Math.sin(t * 2.1) * 0.12;
          const localized = Math.exp(-Math.pow((u - spikeCenter) * 9, 2));
          const glitch =
            (Math.sin(u * 95 + t * 28) * 0.65 +
              Math.cos(u * 160 - t * 34) * 0.45) *
            baseAmp *
            1.45 *
            faultPower *
            (0.35 + localized * 1.1);
          carrier = carrier * (1 - faultPower * 0.45) + glitch;
        }
        const y = midY - carrier;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const isAlert = faultPower > 0.28;
      ctx.strokeStyle = isAlert ? "#ffb833" : "#3dff9a";
      ctx.lineWidth = 2.1;
      ctx.shadowColor = isAlert ? "#ffb833" : "#3dff9a";
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Recovery lock confirmation pulse markers
      if (seedFaultAge >= 2.9 && seedFaultAge < 4.8) {
        const alpha = Math.sin(((seedFaultAge - 2.9) / 1.9) * Math.PI);
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(61, 255, 154, ${alpha * 0.9})`;
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.fillText("✓ SIM RECOVERY ACTION APPLIED · PHASE LOCKED", 18, 56);
      } else if (faultPower > 0.28) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffb833";
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.fillText("▲ FAULT SPIKE · DISPATCHING TO SEED SIM APPLET", 18, 56);
      }
      ctx.restore();
    }

    // CH-02: SecureSIM (Polar cryptographic handshake phase-ring & gate verification)
    function drawSecureSim(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) simPulseAge = (simPulseAge + dt * 0.65) % 1;
      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.16)";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.36;
      const cy = h * 0.51;
      const maxR = Math.min(w * 0.28, h * 0.38);

      ctx.save();
      // Concentric polar phase rings
      const rings = [1.0, 0.72, 0.44];
      rings.forEach((factor, idx) => {
        ctx.strokeStyle =
          idx === 1 && !simAuthorized
            ? "rgba(255, 184, 51, 0.45)"
            : "rgba(61, 255, 154, 0.22)";
        ctx.lineWidth = idx === 1 ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * factor, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Radial spokes
      ctx.strokeStyle = "rgba(61, 255, 154, 0.1)";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.stroke();
      }

      // Rotating certificate verification vector
      const sweep = t * 1.4;
      const ringColor = simAuthorized ? "#3dff9a" : "#ffb833";
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.stroke();

      // Orbiting cryptographic key-phase nodes
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.35;
        const r = maxR * (i % 2 === 0 ? 1.0 : 0.72);
        const nx = cx + Math.cos(a) * r;
        const ny = cy + Math.sin(a) * r;
        ctx.fillStyle = i % 2 === 0 ? "#3dff9a" : "#ffb833";
        ctx.beginPath();
        ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Expanding gate verification pulse ring
      const pulseR = simAuthorized
        ? maxR * (1 - simPulseAge * 0.78)
        : maxR * (0.72 + Math.sin(simPulseAge * Math.PI) * 0.22);
      ctx.strokeStyle = simAuthorized
        ? `rgba(61, 255, 154, ${1 - simPulseAge * 0.7})`
        : `rgba(255, 184, 51, ${1 - simPulseAge * 0.5})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Right side: Permission Gate Verification Pulse Waveform
      const gx0 = w * 0.58;
      const gw = w * 0.36;
      const gyMid = h * 0.52;
      const gAmp = Math.min(48, h * 0.16);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(61, 255, 154, 0.16)";
      ctx.strokeRect(gx0, gyMid - gAmp - 18, gw, gAmp * 2 + 36);

      ctx.beginPath();
      const segs = 120;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const x = gx0 + u * gw;
        let val = 0;
        if (u > 0.12 && u < 0.34) {
          // Certificate signature burst
          val = Math.sin((u - 0.12) * 58) * 0.65;
        } else if (u > 0.44 && u < 0.62) {
          // Permission policy check gate
          val = simAuthorized ? 0.88 : -0.82;
        } else if (u > 0.72 && u < 0.92) {
          // Output to SIM service
          val = simAuthorized
            ? Math.sin((u - 0.72) * 32 - t * 6) * 0.75
            : 0.04 * Math.sin(u * 120);
        }
        const y = gyMid - val * gAmp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Labels
      ctx.shadowBlur = 0;
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = "#a8cfbc";
      ctx.fillText("CERT", gx0 + gw * 0.14, gyMid + gAmp + 13);
      ctx.fillText("POLICY", gx0 + gw * 0.44, gyMid + gAmp + 13);
      ctx.fillStyle = ringColor;
      ctx.fillText(
        simAuthorized ? "SIM ALLOWED" : "GATE DENIED",
        gx0 + gw * 0.7,
        gyMid + gAmp + 13,
      );
      ctx.restore();
    }

    // CH-03: GPT-Code-Learner (Live scanning AST vector tree & query traces)
    function drawGptCode(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) {
        gptSweepProg += dt * 0.34;
        if (gptSweepProg >= 1.35) {
          gptSweepProg = 0;
          gptTargetIdx = (gptTargetIdx + 1) % gptTargets.length;
          if (gptStatusEl) {
            gptStatusEl.textContent = `TARGET: ${gptTargets[gptTargetIdx].label}`;
          }
        }
      } else {
        gptSweepProg = 0.82;
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.18)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      // AST vector nodes (normalized coordinates)
      const nodes = [
        { x: 0.12, y: 0.5, label: "repo/" }, // 0
        { x: 0.31, y: 0.28, label: "src/" }, // 1
        { x: 0.31, y: 0.52, label: "docs/" }, // 2
        { x: 0.31, y: 0.75, label: "tests/" }, // 3
        { x: 0.54, y: 0.2, label: "context.py" }, // 4
        { x: 0.54, y: 0.37, label: "ast_scan.py" }, // 5
        { x: 0.54, y: 0.55, label: "design.md" }, // 6
        { x: 0.54, y: 0.74, label: "prompt.py" }, // 7
        { x: 0.76, y: 0.25, label: "CHUNK A" }, // 8
        { x: 0.76, y: 0.42, label: "CHUNK B" }, // 9
        { x: 0.76, y: 0.58, label: "CHUNK C" }, // 10
        { x: 0.76, y: 0.74, label: "CHUNK D" }, // 11
      ];
      const edges = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 4],
        [1, 5],
        [2, 6],
        [3, 7],
        [4, 8],
        [5, 9],
        [6, 10],
        [7, 11],
      ];
      const synthNode = { x: 0.91, y: 0.5, label: "GPT" };
      const activePath = gptTargets[gptTargetIdx].path;

      ctx.save();
      // Draw base AST vector branches
      ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
      ctx.lineWidth = 1.1;
      edges.forEach(([a, b]) => {
        const na = nodes[a];
        const nb = nodes[b];
        ctx.beginPath();
        ctx.moveTo(na.x * w, na.y * h);
        ctx.lineTo(nb.x * w, nb.y * h);
        ctx.stroke();
      });

      // Vertical retrieval scan beam
      const scanX = clamp(gptSweepProg, 0, 1) * (w * 0.88) + w * 0.06;
      ctx.strokeStyle = "rgba(61, 255, 154, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(scanX, 34);
      ctx.lineTo(scanX, h - 34);
      ctx.stroke();

      // Highlighted query retrieval path
      ctx.strokeStyle = "#3dff9a";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#3dff9a";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < activePath.length - 1; i++) {
        const na = nodes[activePath[i]];
        const nb = nodes[activePath[i + 1]];
        if (na.x * w <= scanX) {
          ctx.moveTo(na.x * w, na.y * h);
          const frac = clamp(
            (scanX - na.x * w) / Math.max(1, (nb.x - na.x) * w),
            0,
            1,
          );
          ctx.lineTo(
            na.x * w + (nb.x - na.x) * w * frac,
            na.y * h + (nb.y - na.y) * h * frac,
          );
        }
      }
      ctx.stroke();

      // Synthesis amber vector from matched context chunk to GPT focal ring
      const leaf = nodes[activePath[activePath.length - 1]];
      if (scanX > leaf.x * w) {
        const synthFrac = clamp(
          (scanX - leaf.x * w) / Math.max(1, (synthNode.x - leaf.x) * w),
          0,
          1,
        );
        ctx.strokeStyle = "#ffb833";
        ctx.shadowColor = "#ffb833";
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(leaf.x * w, leaf.y * h);
        ctx.lineTo(
          leaf.x * w + (synthNode.x - leaf.x) * w * synthFrac,
          leaf.y * h + (synthNode.y - leaf.y) * h * synthFrac,
        );
        ctx.stroke();
      }

      // Render nodes & labels
      ctx.shadowBlur = 0;
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      nodes.forEach((n, idx) => {
        const isHit = activePath.includes(idx) && n.x * w <= scanX;
        const px = n.x * w;
        const py = n.y * h;
        ctx.fillStyle = isHit ? "#3dff9a" : "rgba(61, 255, 154, 0.35)";
        ctx.beginPath();
        ctx.arc(px, py, isHit ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();

        if (w > 460 || isHit || idx < 4) {
          ctx.fillStyle = isHit ? "#e8f7ef" : "#7ba692";
          ctx.fillText(n.label, px - 14, py - 10);
        }
      });

      // GPT synthesis focal ring
      const sx = synthNode.x * w;
      const sy = synthNode.y * h;
      const synthActive = scanX > synthNode.x * w - 25;
      ctx.strokeStyle = synthActive ? "#ffb833" : "rgba(255, 184, 51, 0.35)";
      ctx.lineWidth = synthActive ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, 17 + (synthActive ? Math.sin(t * 9) * 2.5 : 0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = synthActive ? "#ffb833" : "#a8cfbc";
      ctx.fillText("GPT", sx - 10, sy + 4);
      ctx.restore();
    }

    // CH-04: Sonica (NB-IoT Narrowband RF Spectrum Analyzer + Rolling Phosphor Waterfall)
    function drawSonica(ctx, w, h, t, _dt, isStatic) {
      ctx.fillStyle = "#040907";
      ctx.fillRect(0, 0, w, h);

      const splitY = Math.round(h * 0.52);
      const topPad = 32;
      const specH = splitY - topPad - 8;

      // Upper FFT graticule
      ctx.save();
      ctx.strokeStyle = "rgba(61, 255, 154, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const x = (i / 8) * w;
        ctx.beginPath();
        ctx.moveTo(x, topPad);
        ctx.lineTo(x, splitY);
        ctx.stroke();
      }
      for (let j = 0; j <= 4; j++) {
        const y = topPad + (j / 4) * specH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Compute narrowband NB-IoT spectrum bins
      const bins = 160;
      const spec = new Float32Array(bins);
      const c1 = sonicaWide ? 0.28 : 0.34;
      const c2 = sonicaWide ? 0.66 : 0.62;
      const bw = sonicaWide ? 0.016 : 0.032;

      for (let i = 0; i < bins; i++) {
        const u = i / (bins - 1);
        const noise =
          0.09 +
          0.04 * Math.sin(i * 1.9 + t * 11) +
          0.03 * Math.cos(i * 4.3 - t * 17);
        // Uplink NB-IoT single-tone burst (COTS UE)
        const ulBurst = 0.62 + 0.34 * Math.sin(t * 3.1);
        const ul =
          ulBurst *
          Math.exp(-Math.pow((u - c1 - Math.sin(t * 0.8) * 0.012) / bw, 2));
        // Downlink eNodeB narrowband carrier
        const dlBurst = 0.72 + 0.2 * Math.cos(t * 2.3);
        const dl = dlBurst * Math.exp(-Math.pow((u - c2) / (bw * 1.25), 2));
        // Sideband sync pilot
        const pilot =
          0.32 *
          Math.exp(-Math.pow((u - (c2 + 0.09)) / (bw * 0.7), 2)) *
          (0.6 + 0.4 * Math.sin(t * 5));
        spec[i] = clamp(noise + ul + dl + pilot, 0.04, 0.98);
      }

      // Draw live spectrum trace (Phosphor Mint) + subtle fill
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const x = (i / (bins - 1)) * w;
        const y = splitY - 6 - spec[i] * (specH - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#3dff9a";
      ctx.lineWidth = 1.85;
      ctx.shadowColor = "#3dff9a";
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Peak-hold envelope (Amber)
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const x = (i / (bins - 1)) * w;
        const peak = clamp(spec[i] + 0.09, 0.1, 0.99);
        const y = splitY - 6 - peak * (specH - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 184, 51, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Carrier callout labels
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = "#3dff9a";
      ctx.fillText("COTS UE UL", c1 * w - 30, topPad + 16);
      ctx.fillStyle = "#ffb833";
      ctx.fillText("eNodeB DL", c2 * w - 26, topPad + 16);

      // Update rolling offscreen waterfall buffer
      if (wfCtx) {
        const wfW = wfCanvas.width;
        const wfH = wfCanvas.height;
        const rowsToPush = isStatic ? 36 : 1;
        for (let r = 0; r < rowsToPush; r++) {
          wfCtx.drawImage(wfCanvas, 0, 0, wfW, wfH - 2, 0, 2, wfW, wfH - 2);
          for (let i = 0; i < bins; i++) {
            const val = spec[i];
            const bx = (i / bins) * wfW;
            const bwPx = Math.ceil(wfW / bins) + 1;
            if (val > 0.62) {
              wfCtx.fillStyle = `rgba(255, 184, 51, ${clamp(val, 0.5, 1)})`;
            } else if (val > 0.22) {
              wfCtx.fillStyle = `rgba(61, 255, 154, ${clamp(val * 1.25, 0.15, 0.95)})`;
            } else {
              wfCtx.fillStyle = `rgba(10, 34, 24, ${0.4 + val * 2})`;
            }
            wfCtx.fillRect(bx, 0, bwPx, 2);
          }
        }
        ctx.drawImage(wfCanvas, 0, splitY + 4, w, h - splitY - 30);
      }

      // Divider rule
      ctx.strokeStyle = "rgba(61, 255, 154, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, splitY + 2);
      ctx.lineTo(w, splitY + 2);
      ctx.stroke();
      ctx.restore();
    }

    // CH-05: Flora (4-channel synchronized stack trace: eSIM / RAN / CORE / EDGE VR)
    function drawFlora(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) {
        floraBurstAge = (floraBurstAge + dt * 0.42) % 1;
      } else {
        floraBurstAge = 0.58;
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.18)";
      ctx.fillRect(0, 0, w, h);

      const lanes = [
        { name: "CH-A  eSIM", color: "#3dff9a", lag: 0.0, freq: 10 },
        { name: "CH-B  RAN", color: "#6bffb1", lag: 0.12, freq: 18 },
        { name: "CH-C  CORE", color: "#ffb833", lag: 0.24, freq: 14 },
        { name: "CH-D  EDGE VR", color: "#3dff9a", lag: 0.36, freq: 22 },
      ];

      const topPad = 34;
      const botPad = 34;
      const laneH = (h - topPad - botPad) / 4;
      const leftLabelW = w < 460 ? 84 : 112;
      const plotW = w - leftLabelW - 14;

      ctx.save();
      lanes.forEach((lane, idx) => {
        const yTop = topPad + idx * laneH;
        const yMid = yTop + laneH * 0.52;
        const amp = laneH * 0.31;

        // Lane divider
        ctx.strokeStyle = "rgba(61, 255, 154, 0.14)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yTop);
        ctx.lineTo(w, yTop);
        ctx.stroke();

        // Channel label
        ctx.font = '600 10px "IBM Plex Mono", monospace';
        ctx.fillStyle = lane.color;
        ctx.fillText(lane.name, 14, yMid + 4);

        // Waveform with cascading packet burst
        ctx.beginPath();
        const steps = 180;
        const burstCenter = ((floraBurstAge - lane.lag) % 1 + 1) % 1;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = leftLabelW + u * plotW;
          const dist = Math.abs(u - burstCenter);
          const env = Math.exp(-Math.pow(dist * 11, 2));
          const base = Math.sin(u * Math.PI * 6 - t * 3 + idx) * 0.14;
          const burst =
            idx === 0 || idx === 2
              ? Math.tanh(Math.sin(u * Math.PI * lane.freq - t * 9) * 3) * env
              : Math.sin(u * Math.PI * lane.freq - t * 12) * env;
          const y = yMid - (base + burst * 0.85) * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = lane.color;
        ctx.shadowBlur = 9;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Synchronized sweep line across all 4 channels
      const cursorX = leftLabelW + floraBurstAge * plotW;
      ctx.strokeStyle = "rgba(255, 184, 51, 0.55)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(cursorX, topPad);
      ctx.lineTo(cursorX, h - botPad);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // CH-06: Mobile VR Latency (Dual-beam jitter comparison: STD vs PROACTIVE)
    function drawLrp(ctx, w, h, t, _dt, isStatic) {
      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.16)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const midY = h * 0.52;
      const amp = Math.min(72, h * 0.22);
      const steps = 220;

      ctx.save();
      // Frame cadence ticks along horizontal axis (proactive pre-scheduled slots)
      if (lrpMode === "dual" || lrpMode === "proactive") {
        ctx.strokeStyle = "rgba(61, 255, 154, 0.28)";
        ctx.lineWidth = 1;
        const slotCount = 14;
        for (let s = 0; s < slotCount; s++) {
          const sx = (((s / slotCount) - (t * 0.14) % (1 / slotCount) + 1) % 1) * w;
          ctx.beginPath();
          ctx.moveTo(sx, h - 46);
          ctx.lineTo(sx, h - 34);
          ctx.stroke();
        }
      }

      // STD LTE trace (Amber — lagging, DRX doze flatspots & jitter spikes)
      if (lrpMode === "dual" || lrpMode === "std") {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = u * w;
          const lagU = u - 0.085;
          const drxSlot = ((lagU * 5 - t * 0.55) % 1 + 1) % 1;
          let val = Math.sin(lagU * Math.PI * 6 - t * 3.0) * 0.58;
          if (drxSlot < 0.28) {
            // DRX doze pause
            val *= 0.22;
          } else if (drxSlot < 0.42) {
            // Post-wake buffered jitter spike
            val += Math.sin(drxSlot * 52) * 0.55;
          }
          const y = midY - val * amp + 14;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#ffb833";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ffb833";
        ctx.shadowBlur = 11;
        ctx.stroke();
      }

      // PROACTIVE trace (Phosphor Mint — phase-locked, smooth low-jitter cadence)
      if (lrpMode === "dual" || lrpMode === "proactive") {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = u * w;
          const val = Math.sin(u * Math.PI * 6 - t * 3.0) * 0.72;
          const y = midY - val * amp - 10;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#3dff9a";
        ctx.lineWidth = 2.15;
        ctx.shadowColor = "#3dff9a";
        ctx.shadowBlur = 12;
        ctx.stroke();
      }

      // Legend callouts inside scope
      ctx.shadowBlur = 0;
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      if (lrpMode !== "std") {
        ctx.fillStyle = "#3dff9a";
        ctx.fillText("● PROACTIVE UPLINK (PHASE-LOCKED)", 16, 52);
      }
      if (lrpMode !== "proactive") {
        ctx.fillStyle = "#ffb833";
        ctx.fillText("● STD LTE (DRX DOZE & JITTER LAG)", 16, 68);
      }
      ctx.restore();
    }

    // CH-07: Acemap (On-Demand 2,208-Topic Phosphor Radar Scope)
    function drawAcemap(ctx, w, h, t, _dt, isStatic) {
      ctx.fillStyle = "#040907";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.51;
      const r = Math.min(w * 0.43, h * 0.39);
      acemapMeta = { cx, cy, r };

      const sweepAngle = isStatic ? 0.65 : (t * 0.72) % (Math.PI * 2);

      ctx.save();
      // Concentric radar range rings
      [0.33, 0.66, 1.0].forEach((frac, idx) => {
        ctx.strokeStyle =
          idx === 2 ? "rgba(61, 255, 154, 0.28)" : "rgba(61, 255, 154, 0.13)";
        ctx.lineWidth = idx === 2 ? 1.25 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.strokeStyle = "rgba(61, 255, 154, 0.14)";
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.08, cy);
      ctx.lineTo(cx + r * 1.08, cy);
      ctx.moveTo(cx, cy - r * 1.08);
      ctx.lineTo(cx, cy + r * 1.08);
      ctx.stroke();

      // Rotating phosphor persistence sweep wedge
      const wedgeSpan = 0.55;
      const steps = 16;
      for (let s = 0; s < steps; s++) {
        const a0 = sweepAngle - ((s + 1) / steps) * wedgeSpan;
        const a1 = sweepAngle - (s / steps) * wedgeSpan;
        const alpha = (1 - s / steps) * 0.12;
        ctx.fillStyle = `rgba(61, 255, 154, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, a0, a1);
        ctx.closePath();
        ctx.fill();
      }

      // Leading radar sweep arm
      ctx.strokeStyle = "rgba(61, 255, 154, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
      ctx.stroke();

      if (!acemapLoaded) {
        // Standby vector constellation preview (before on-demand CSV load)
        ctx.fillStyle = "rgba(61, 255, 154, 0.5)";
        for (let i = 0; i < 28; i++) {
          const ang = i * 2.39996;
          const rad = r * (0.18 + ((i * 37) % 78) / 100);
          const bx = cx + Math.cos(ang) * rad;
          const by = cy + Math.sin(ang) * rad;
          ctx.beginPath();
          ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillStyle = "#e8f7ef";
        ctx.fillText("ACEMAP 2,208-TOPIC RADAR STANDBY", cx, cy - 8);
        ctx.fillStyle = "#ffb833";
        ctx.fillText(
          "PRESS [ LOAD 2,208-TOPIC DATASET ] ABOVE TO ACQUIRE",
          cx,
          cy + 14,
        );
        ctx.restore();
        return;
      }

      // Render all 2,208 real topics from ../../data/data.csv
      for (let i = 0; i < acemapPoints.length; i++) {
        const p = acemapPoints[i];
        const px = cx + p.nx * r * 0.94;
        const py = cy + p.ny * r * 0.94;
        p.px = px;
        p.py = py;

        const active = isAcemapActive(p);
        if (!active) {
          ctx.fillStyle = "rgba(61, 255, 154, 0.06)";
          ctx.fillRect(px - 0.8, py - 0.8, 1.6, 1.6);
          continue;
        }

        // Phosphor persistence boost when radar arm sweeps over blip
        let delta = (sweepAngle - p.ang + Math.PI * 2) % (Math.PI * 2);
        const ping = delta < 0.75 ? 1 - delta / 0.75 : 0;

        const baseColor = ACEMAP_CRT_COLORS[p.field] || "#3dff9a";
        ctx.fillStyle = ping > 0.65 ? "#ecfff5" : baseColor;
        const dotR =
          (p.size > 7 ? 2.2 : 1.55) + ping * 1.25;
        ctx.globalAlpha = 0.42 + ping * 0.58;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Target reticle on hovered or selected topic
      const focusIdx = acemapHoverIdx >= 0 ? acemapHoverIdx : acemapSelectedIdx;
      if (focusIdx >= 0 && acemapPoints[focusIdx]) {
        const fp = acemapPoints[focusIdx];
        ctx.strokeStyle = "#ffb833";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "#ffb833";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(fp.px, fp.py, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(fp.px - 15, fp.py);
        ctx.lineTo(fp.px - 5, fp.py);
        ctx.moveTo(fp.px + 5, fp.py);
        ctx.lineTo(fp.px + 15, fp.py);
        ctx.moveTo(fp.px, fp.py - 15);
        ctx.lineTo(fp.px, fp.py - 5);
        ctx.moveTo(fp.px, fp.py + 5);
        ctx.lineTo(fp.px, fp.py + 15);
        ctx.stroke();

        // Floating crisp tag
        ctx.shadowBlur = 0;
        const label = `${fp.name} [${ACEMAP_FIELDS[fp.field]}]`;
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        const tw = ctx.measureText(label).width;
        const lx = clamp(fp.px + 14, 12, w - tw - 22);
        const ly = clamp(fp.py - 12, 42, h - 40);
        ctx.fillStyle = "rgba(4, 9, 7, 0.92)";
        ctx.fillRect(lx - 6, ly - 13, tw + 12, 19);
        ctx.strokeStyle = "rgba(255, 184, 51, 0.7)";
        ctx.lineWidth = 1;
        ctx.strokeRect(lx - 6, ly - 13, tw + 12, 19);
        ctx.fillStyle = "#e8f7ef";
        ctx.fillText(label, lx, ly);
      }
      ctx.restore();
    }

    // Master scope frame dispatcher
    const scopeCtrl = createManagedCanvas(
      canvas,
      bezel,
      (ctx, w, h) => {
        ctx.fillStyle = "#040907";
        ctx.fillRect(0, 0, w, h);
      },
      (ctx, w, h, t, dt, isStatic) => {
        if (activeChannel === "seed") drawSeed(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "securesim")
          drawSecureSim(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "gptcode")
          drawGptCode(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "sonica")
          drawSonica(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "flora")
          drawFlora(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "lrp") drawLrp(ctx, w, h, t, dt, isStatic);
        else if (activeChannel === "acemap")
          drawAcemap(ctx, w, h, t, dt, isStatic);

        // Crisp CRT horizontal retrace flash when switching channels
        if (retraceFlash > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(61, 255, 154, ${retraceFlash * 0.22})`;
          ctx.fillRect(0, 0, w, h);
          const scanY = (1 - retraceFlash) * h;
          ctx.fillStyle = `rgba(220, 255, 236, ${retraceFlash * 0.85})`;
          ctx.fillRect(0, scanY - 1.5, w, 3);
          ctx.restore();
          retraceFlash = Math.max(0, retraceFlash - dt * 3.8);
        }
      },
    );

    function selectChannel(chKey) {
      if (!CHANNELS[chKey]) return;
      activeChannel = chKey;
      retraceFlash = motionEnabled ? 0.9 : 0;

      const meta = CHANNELS[chKey];
      if (chBadgeEl) chBadgeEl.textContent = meta.badge;
      if (chTitleEl) chTitleEl.textContent = meta.title;
      if (chVenueEl) chVenueEl.textContent = meta.venue;
      if (chDescEl) chDescEl.textContent = meta.desc;
      if (chLinkEl) {
        chLinkEl.href = meta.linkHref;
        chLinkEl.innerHTML = `${meta.linkText} <span aria-hidden="true">↗</span>`;
      }
      if (tlEl) tlEl.textContent = meta.tl;
      if (trEl) trEl.textContent = meta.tr;
      if (blEl) blEl.textContent = meta.bl;
      if (brEl) brEl.textContent = meta.br;
      if (scopePanel) scopePanel.setAttribute("aria-labelledby", meta.tabId);

      tabs.forEach((btn) =>
        btn.setAttribute(
          "aria-selected",
          String(btn.dataset.channel === chKey),
        ),
      );
      matrixRows.forEach((row) =>
        row.classList.toggle("is-active", row.dataset.selectChannel === chKey),
      );
      ctrlGroups.forEach((grp) => {
        grp.hidden = grp.dataset.ctrlFor !== chKey;
      });

      if (chKey === "acemap") updateAcemapReadout();
      if (scopeCtrl) {
        const ctx = scopeCtrl.getCtx();
        const { width, height } = scopeCtrl.getSize();
        if (ctx && width && height) {
          ctx.fillStyle = "#040907";
          ctx.fillRect(0, 0, width, height);
        }
        if (!motionEnabled) scopeCtrl.renderStatic();
      }
    }

    tabs.forEach((btn, idx) => {
      btn.addEventListener("click", () => selectChannel(btn.dataset.channel));
      btn.addEventListener("keydown", (ev) => {
        let next = -1;
        if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
          next = (idx + 1) % tabs.length;
        } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
          next = (idx - 1 + tabs.length) % tabs.length;
        }
        if (next >= 0) {
          ev.preventDefault();
          tabs[next].focus();
          selectChannel(tabs[next].dataset.channel);
        }
      });
    });

    matrixRows.forEach((row) => {
      row.addEventListener("click", (ev) => {
        if (ev.target.closest("a")) return;
        selectChannel(row.dataset.selectChannel);
        if (bezel) {
          bezel.scrollIntoView({
            behavior: motionEnabled ? "smooth" : "auto",
            block: "nearest",
          });
        }
      });
    });

    // Per-channel control bindings
    if (seedFaultBtn) {
      seedFaultBtn.addEventListener("click", () => {
        seedFaultAge = 0;
        seedNextAuto = 11.5;
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    if (simAllowBtn && simDenyBtn) {
      simAllowBtn.addEventListener("click", () => {
        simAuthorized = true;
        simPulseAge = 0;
        simAllowBtn.setAttribute("aria-pressed", "true");
        simDenyBtn.setAttribute("aria-pressed", "false");
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
      simDenyBtn.addEventListener("click", () => {
        simAuthorized = false;
        simPulseAge = 0;
        simAllowBtn.setAttribute("aria-pressed", "false");
        simDenyBtn.setAttribute("aria-pressed", "true");
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    if (gptQueryBtn) {
      gptQueryBtn.addEventListener("click", () => {
        gptTargetIdx = (gptTargetIdx + 1) % gptTargets.length;
        gptSweepProg = 0;
        if (gptStatusEl) {
          gptStatusEl.textContent = `TARGET: ${gptTargets[gptTargetIdx].label}`;
        }
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    if (sonicaSpanBtn) {
      sonicaSpanBtn.addEventListener("click", () => {
        sonicaWide = !sonicaWide;
        sonicaSpanBtn.setAttribute("aria-pressed", String(sonicaWide));
        sonicaSpanBtn.textContent = sonicaWide
          ? "SPAN: WIDE SCAN"
          : "SPAN: NARROWBAND";
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    if (floraBurstBtn) {
      floraBurstBtn.addEventListener("click", () => {
        floraBurstAge = 0.02;
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    lrpModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        lrpMode = btn.dataset.lrpMode || "dual";
        lrpModeBtns.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn)),
        );
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    });

    // Acemap controls & canvas reticle interaction
    if (acemapLoadBtn) {
      acemapLoadBtn.addEventListener("click", loadAcemapDataset);
    }

    if (acemapFieldSelect) {
      acemapFieldSelect.addEventListener("change", () => {
        acemapSelectedField = acemapFieldSelect.value;
        acemapHoverIdx = -1;
        acemapSelectedIdx = -1;
        refreshAcemapTopicsDropdown();
        updateAcemapReadout();
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    if (acemapTopicSelect) {
      acemapTopicSelect.addEventListener("change", () => {
        acemapSelectedIdx =
          acemapTopicSelect.value === "" ? -1 : Number(acemapTopicSelect.value);
        acemapHoverIdx = -1;
        updateAcemapReadout();
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      });
    }

    function findNearestAcemapPoint(clientX, clientY, maxRadius) {
      if (!acemapLoaded || activeChannel !== "acemap") return -1;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      let best = -1;
      let bestD2 = maxRadius * maxRadius;
      for (let i = 0; i < acemapPoints.length; i++) {
        const p = acemapPoints[i];
        if (!isAcemapActive(p)) continue;
        const dx = p.px - x;
        const dy = p.py - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    canvas.addEventListener(
      "pointermove",
      (ev) => {
        if (activeChannel !== "acemap" || !acemapLoaded) return;
        const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 18);
        if (idx !== acemapHoverIdx) {
          acemapHoverIdx = idx;
          updateAcemapReadout();
          if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
        }
      },
      { passive: true },
    );

    canvas.addEventListener("pointerleave", () => {
      if (acemapHoverIdx >= 0) {
        acemapHoverIdx = -1;
        updateAcemapReadout();
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      }
    });

    canvas.addEventListener("click", (ev) => {
      if (activeChannel !== "acemap") return;
      if (!acemapLoaded) {
        loadAcemapDataset();
        return;
      }
      const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 22);
      if (idx >= 0) {
        acemapSelectedIdx = idx;
        if (acemapTopicSelect) acemapTopicSelect.value = String(idx);
        updateAcemapReadout();
        if (scopeCtrl && !motionEnabled) scopeCtrl.renderStatic();
      }
    });

    // Support direct anchor links like #acemap, #flora, etc.
    const anchorToChannel = {
      "#seed": "seed",
      "#secureSIM": "securesim",
      "#gptcodelearner": "gptcode",
      "#sonica": "sonica",
      "#flora": "flora",
      "#lrp": "lrp",
      "#acemap": "acemap",
    };
    if (anchorToChannel[location.hash]) {
      selectChannel(anchorToChannel[location.hash]);
    }
  })();

  // =========================================================================
  // 4. SECTION 03: TECHNICAL MEMORANDUM FILTER (ALL / CONFERENCES / JOURNALS)
  // =========================================================================
  (function initPublicationsFilter() {
    const filterBtns = $$(".tm-filter-btn");
    const groups = $$(".tm-group");
    const countEl = $("#publication-count");
    if (!filterBtns.length || !groups.length) return;

    function applyFilter(kind) {
      groups.forEach((g) => {
        g.hidden = kind !== "all" && g.dataset.kind !== kind;
      });
      filterBtns.forEach((btn) =>
        btn.setAttribute("aria-pressed", String(btn.dataset.filter === kind)),
      );

      const visibleRows = groups
        .filter((g) => !g.hidden)
        .flatMap((g) => Array.from(g.querySelectorAll(".tm-row")));
      const years = visibleRows
        .map((r) => Number(r.dataset.year))
        .filter(Number.isFinite);
      const minY = years.length ? Math.min(...years) : 2019;
      const maxY = years.length ? Math.max(...years) : 2023;

      const label =
        kind === "all"
          ? "MEMORANDA"
          : kind === "conference"
            ? "CONFERENCE MEMORANDA"
            : "JOURNAL MEMORANDA";
      if (countEl) {
        countEl.textContent = `DISPLAYING ${visibleRows.length} ${label} · ${minY}–${maxY}`;
      }
    }

    filterBtns.forEach((btn) =>
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter)),
    );

    function syncHashFilter() {
      if (location.hash === "#conf") applyFilter("conference");
      else if (location.hash === "#journal") applyFilter("journal");
    }
    window.addEventListener("hashchange", syncHashFilter);
    syncHashFilter();
  })();
})();
