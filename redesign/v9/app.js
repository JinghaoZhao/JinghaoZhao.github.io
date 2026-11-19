(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const lerp = (a, b, t) => a + (b - a) * t;

  const body = document.body;
  const reduceMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotionMQ.matches;

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* -------------------------------------------------------------------------
   * Motion preference & lifecycle registry for pauseable canvases
   * ---------------------------------------------------------------------- */
  const canvasControllers = [];

  function syncAllCanvases() {
    for (const ctrl of canvasControllers) {
      ctrl.sync();
    }
  }

  function applyMotionPreference() {
    motionEnabled = !reduceMotionMQ.matches;
    body.classList.toggle("motion-enabled", motionEnabled);
    body.classList.toggle("motion-reduced", !motionEnabled);
    if (!motionEnabled) {
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
    }
    syncAllCanvases();
  }

  reduceMotionMQ.addEventListener("change", applyMotionPreference);
  document.addEventListener("visibilitychange", syncAllCanvases);
  applyMotionPreference();

  /* -------------------------------------------------------------------------
   * Progressive Scroll Reveals
   * ---------------------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-pending");
          revealObs.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -28px 0px" }
    );
    $$(".reveal").forEach((el) => {
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight * 0.94) {
        el.classList.add("is-pending");
      }
      revealObs.observe(el);
    });
  }

  /* -------------------------------------------------------------------------
   * Scroll Coordination: Masthead, Parting Hero Typography & Film-Slate Rail
   * ---------------------------------------------------------------------- */
  const masthead = $("#masthead");
  const heroSection = $("#prologue");
  const heroLeft = $("#hero-part-left");
  const heroRight = $("#hero-part-right");
  const navLinks = $$(".masthead-nav a");
  const slateItems = $$(".slate-item");
  const actSections = ["work", "about", "projects", "publications"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let scrollQueued = false;

  function updateOnScroll() {
    scrollQueued = false;
    const y = window.scrollY || 0;
    if (masthead) {
      masthead.classList.toggle("is-scrolled", y > 36);
    }

    // Giant parting display typography on scroll
    if (heroSection && heroLeft && heroRight) {
      const h = heroSection.offsetHeight || window.innerHeight;
      if (motionEnabled && y < h * 1.15) {
        const progress = clamp(y / (h * 0.85), 0, 1);
        const shift = progress * Math.min(72, window.innerWidth * 0.065);
        heroLeft.style.transform = `translate3d(${-shift.toFixed(1)}px, 0, 0)`;
        heroRight.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
      } else {
        heroLeft.style.transform = "";
        heroRight.style.transform = "";
      }
    }

    // Active act for masthead nav + film-slate rail
    let activeId = "";
    const threshold = window.innerHeight * 0.36;
    for (const sec of actSections) {
      if (sec.getBoundingClientRect().top <= threshold) {
        activeId = sec.id;
      }
    }

    navLinks.forEach((link) => {
      if (link.hash === `#${activeId}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    slateItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.act === activeId);
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateOnScroll);
      }
    },
    { passive: true }
  );
  updateOnScroll();

  /* -------------------------------------------------------------------------
   * Custom Minimal Silver Ring Cursor (Fine Pointer Only)
   * ---------------------------------------------------------------------- */
  const cursorEl = $("#silver-cursor");
  if (cursorEl && finePointerMQ.matches) {
    let cx = -100;
    let cy = -100;
    let tx = -100;
    let ty = -100;
    let cursorRaf = 0;
    let visible = false;

    const interactiveSelector =
      "a, button, select, input, [role='tab'], .chapter-tab, .project-trigger";

    function tickCursor() {
      cx = lerp(cx, tx, 0.22);
      cy = lerp(cy, ty, 0.22);
      cursorEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - cx) > 0.25 || Math.abs(ty - cy) > 0.25) {
        cursorRaf = requestAnimationFrame(tickCursor);
      } else {
        cursorRaf = 0;
      }
    }

    window.addEventListener(
      "pointermove",
      (ev) => {
        if (!motionEnabled || !finePointerMQ.matches) {
          cursorEl.classList.remove("is-visible");
          return;
        }
        tx = ev.clientX;
        ty = ev.clientY;
        if (!visible) {
          cx = tx;
          cy = ty;
          visible = true;
          cursorEl.classList.add("is-visible");
        }
        if (!cursorRaf) {
          cursorRaf = requestAnimationFrame(tickCursor);
        }
        const target = ev.target;
        const isInteractive =
          target instanceof Element && Boolean(target.closest(interactiveSelector));
        cursorEl.classList.toggle("is-interactive", isInteractive);
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", () => {
      visible = false;
      cursorEl.classList.remove("is-visible");
    });
  }

  /* -------------------------------------------------------------------------
   * Helper: Offscreen-Pausing Canvas Controller
   * ---------------------------------------------------------------------- */
  function createCanvasLoop(canvas, renderFn, onResize) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let inView = true;
    let rafId = 0;
    let elapsed = 0;
    let lastTs = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 640));
      height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 400));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(width, height);
      renderFn(ctx, width, height, elapsed, 0);
    }

    function step(ts) {
      rafId = 0;
      if (!inView || document.hidden || !motionEnabled) return;
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      elapsed += dt;
      renderFn(ctx, width, height, elapsed, dt);
      rafId = requestAnimationFrame(step);
    }

    function sync() {
      if (inView && !document.hidden && motionEnabled) {
        if (!rafId) {
          lastTs = 0;
          rafId = requestAnimationFrame(step);
        }
      } else {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        renderFn(ctx, width, height, elapsed, 0);
      }
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          inView = entries[0] ? entries[0].isIntersecting : true;
          sync();
        },
        { rootMargin: "120px 0px" }
      );
      io.observe(canvas);
    }

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    const ctrl = {
      sync,
      renderOnce: () => renderFn(ctx, width, height, elapsed, 0),
      getSize: () => ({ width, height }),
    };
    canvasControllers.push(ctrl);
    sync();
    return ctrl;
  }

  /* -------------------------------------------------------------------------
   * HERO: Liquid-Silk Contour Topography Canvas
   * ---------------------------------------------------------------------- */
  const heroCanvas = $("#hero-silk-canvas");
  if (heroCanvas) {
    let ptrX = 0.5;
    let ptrY = 0.5;
    let smoothX = 0.5;
    let smoothY = 0.5;
    let velEnergy = 0;

    if (heroSection) {
      heroSection.addEventListener(
        "pointermove",
        (ev) => {
          const rect = heroSection.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const nx = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
          const ny = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
          const dx = nx - ptrX;
          const dy = ny - ptrY;
          velEnergy = clamp(velEnergy + Math.hypot(dx, dy) * 3.8, 0, 1.35);
          ptrX = nx;
          ptrY = ny;
        },
        { passive: true }
      );
    }

    createCanvasLoop(heroCanvas, (ctx, w, h, t, dt) => {
      smoothX = lerp(smoothX, ptrX, dt ? Math.min(1, dt * 3.2) : 0.06);
      smoothY = lerp(smoothY, ptrY, dt ? Math.min(1, dt * 3.2) : 0.06);
      velEnergy = Math.max(0, velEnergy - (dt || 0.016) * 0.9);

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Soft silver atmospheric sheen following pointer gently
      const sheenX = w * (0.25 + smoothX * 0.5);
      const sheenY = h * (0.2 + smoothY * 0.55);
      const sheen = ctx.createRadialGradient(
        sheenX,
        sheenY,
        0,
        sheenX,
        sheenY,
        Math.max(w, h) * 0.62
      );
      sheen.addColorStop(0, "rgba(246, 245, 240, 0.075)");
      sheen.addColorStop(0.45, "rgba(210, 210, 218, 0.025)");
      sheen.addColorStop(1, "rgba(9, 9, 11, 0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);

      // Liquid-silk contour ribbons
      const ribbonCount = w < 640 ? 18 : 28;
      const samples = w < 640 ? 52 : 84;
      const phase = t * 0.36;
      const mouseOffsetX = (smoothX - 0.5) * 1.6;
      const mouseOffsetY = (smoothY - 0.5) * 75;

      for (let r = 0; r < ribbonCount; r++) {
        const ratio = r / (ribbonCount - 1);
        const baseY = h * (0.14 + ratio * 0.78);
        const depthWave = Math.sin(ratio * Math.PI);
        const alpha = 0.045 + depthWave * 0.19;

        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          const u = s / samples;
          const x = u * (w + 40) - 20;

          // Pointer-reactive Gaussian silk lift
          const dx = u - smoothX;
          const dy = baseY / h - smoothY;
          const distSq = dx * dx * 2.2 + dy * dy * 4.5;
          const ripple =
            Math.exp(-distSq * 6.5) *
            (28 + velEnergy * 34) *
            Math.sin(u * 9 - phase * 2.2 + r * 0.25);

          const fold1 =
            Math.sin(u * 3.8 + phase + ratio * 2.6 + mouseOffsetX * 0.55) *
            (38 + depthWave * 30);
          const fold2 =
            Math.cos(u * 7.2 - phase * 0.72 + ratio * 4.8) * (16 + depthWave * 14);
          const fold3 =
            Math.sin(u * 1.9 + ratio * 6.0 - phase * 0.35) * 22;

          const y = baseY + fold1 + fold2 + fold3 + ripple + mouseOffsetY * (ratio - 0.5) * 0.55;

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle =
          r % 5 === 0
            ? `rgba(246, 245, 240, ${(alpha * 1.35).toFixed(3)})`
            : `rgba(218, 218, 224, ${alpha.toFixed(3)})`;
        ctx.lineWidth = r % 5 === 0 ? 1.15 : 0.75;
        ctx.stroke();
      }
    });
  }

  /* -------------------------------------------------------------------------
   * ACT I: Architectural Light-Sculpture & Extruded Monolith Canvas
   * ---------------------------------------------------------------------- */
  const monolithCanvas = $("#monolith-canvas");
  const monolithButtons = $$("[data-monolith-mode]");
  const monolithCodeEl = $("#monolith-plate-code");
  const monolithCaptionEl = $("#monolith-caption-text");

  const monolithMeta = [
    {
      code: "STUDY I · HOST & FABRIC",
      caption: "Dedicated silicon, high-speed networking, and storage I/O boundaries.",
    },
    {
      code: "STUDY II · FLEET LIFECYCLE",
      caption: "Automated provisioning, orchestration, and safe control-plane transitions.",
    },
    {
      code: "STUDY III · END-TO-END BEHAVIOR",
      caption: "Predictable latency, fault isolation, and operability at scale.",
    },
  ];

  let monolithMode = 0;
  let monolithCtrl = null;

  if (monolithCanvas) {
    let lightTargetX = 0.32;
    let lightTargetY = 0.22;
    let lightX = 0.32;
    let lightY = 0.22;
    let pointerActive = false;

    monolithCanvas.addEventListener(
      "pointermove",
      (ev) => {
        const rect = monolithCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointerActive = true;
        lightTargetX = clamp((ev.clientX - rect.left) / rect.width, 0.08, 0.92);
        lightTargetY = clamp((ev.clientY - rect.top) / rect.height, 0.08, 0.78);
      },
      { passive: true }
    );

    monolithCanvas.addEventListener("pointerleave", () => {
      pointerActive = false;
    });

    function drawIsoSlab(ctx, cx, cy, halfW, halfD, height, lightAngle, shimmer) {
      // Top diamond points
      const topN = [cx, cy - halfD];
      const topE = [cx + halfW, cy];
      const topS = [cx, cy + halfD];
      const topW = [cx - halfW, cy];

      // Bottom points
      const botE = [topE[0], topE[1] + height];
      const botS = [topS[0], topS[1] + height];
      const botW = [topW[0], topW[1] + height];

      // Cast floor shadow
      const sx = Math.cos(lightAngle) * (height * 1.45 + 36);
      const sy = Math.sin(lightAngle) * (height * 0.52 + 16);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(botW[0], botW[1]);
      ctx.lineTo(botS[0], botS[1]);
      ctx.lineTo(botE[0], botE[1]);
      ctx.lineTo(botE[0] + sx, botE[1] + sy);
      ctx.lineTo(botS[0] + sx, botS[1] + sy);
      ctx.lineTo(botW[0] + sx, botW[1] + sy);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fill();
      ctx.restore();

      const leftLum = Math.round(clamp(28 + (1 - Math.cos(lightAngle)) * 22 + shimmer * 16, 16, 86));
      const rightLum = Math.round(clamp(16 + (1 + Math.cos(lightAngle)) * 18 + shimmer * 12, 12, 70));
      const topLum = Math.round(clamp(46 + shimmer * 42, 34, 118));

      // Left face
      ctx.beginPath();
      ctx.moveTo(topW[0], topW[1]);
      ctx.lineTo(topS[0], topS[1]);
      ctx.lineTo(botS[0], botS[1]);
      ctx.lineTo(botW[0], botW[1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${leftLum}, ${leftLum}, ${leftLum + 3})`;
      ctx.fill();

      // Right face
      ctx.beginPath();
      ctx.moveTo(topS[0], topS[1]);
      ctx.lineTo(topE[0], topE[1]);
      ctx.lineTo(botE[0], botE[1]);
      ctx.lineTo(botS[0], botS[1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${rightLum}, ${rightLum}, ${rightLum + 2})`;
      ctx.fill();

      // Top plane with specular gradient
      const grad = ctx.createLinearGradient(
        topW[0],
        topN[1],
        topE[0],
        topS[1]
      );
      grad.addColorStop(0, `rgb(${topLum + 42}, ${topLum + 41}, ${topLum + 38})`);
      grad.addColorStop(0.55, `rgb(${topLum + 12}, ${topLum + 12}, ${topLum + 14})`);
      grad.addColorStop(1, `rgb(${Math.max(18, topLum - 18)}, ${Math.max(18, topLum - 18)}, ${Math.max(20, topLum - 15)})`);

      ctx.beginPath();
      ctx.moveTo(topN[0], topN[1]);
      ctx.lineTo(topE[0], topE[1]);
      ctx.lineTo(topS[0], topS[1]);
      ctx.lineTo(topW[0], topW[1]);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Silver-foil architectural edge hairlines
      ctx.strokeStyle = `rgba(246, 245, 240, ${(0.28 + shimmer * 0.4).toFixed(2)})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(topS[0], topS[1]);
      ctx.lineTo(botS[0], botS[1]);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.24)";
      ctx.stroke();
    }

    monolithCtrl = createCanvasLoop(monolithCanvas, (ctx, w, h, t, dt) => {
      if (!pointerActive && motionEnabled) {
        lightTargetX = 0.5 + Math.sin(t * 0.42) * 0.32;
        lightTargetY = 0.2 + Math.cos(t * 0.31) * 0.08;
      }
      lightX = lerp(lightX, lightTargetX, dt ? Math.min(1, dt * 4.5) : 0.12);
      lightY = lerp(lightY, lightTargetY, dt ? Math.min(1, dt * 4.5) : 0.12);

      // Obsidian gallery room backdrop
      ctx.fillStyle = "#08080a";
      ctx.fillRect(0, 0, w, h);

      const srcX = w * lightX;
      const srcY = h * lightY * 0.65;
      const lightAngle = Math.atan2(h * 0.55 - srcY, w * 0.5 - srcX);

      // Volumetric monochrome light beam from top aperture
      const beam = ctx.createRadialGradient(
        srcX,
        srcY,
        8,
        srcX,
        srcY,
        Math.max(w, h) * 0.95
      );
      beam.addColorStop(0, "rgba(246, 245, 240, 0.26)");
      beam.addColorStop(0.28, "rgba(220, 220, 226, 0.08)");
      beam.addColorStop(0.65, "rgba(140, 140, 150, 0.02)");
      beam.addColorStop(1, "rgba(8, 8, 10, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, w, h);

      // Directional architectural light shaft polygon
      ctx.save();
      const shaftGrad = ctx.createLinearGradient(srcX, 0, w * 0.5 + (0.5 - lightX) * w * 0.65, h);
      shaftGrad.addColorStop(0, "rgba(246, 245, 240, 0.11)");
      shaftGrad.addColorStop(0.6, "rgba(246, 245, 240, 0.03)");
      shaftGrad.addColorStop(1, "rgba(246, 245, 240, 0)");
      ctx.fillStyle = shaftGrad;
      ctx.beginPath();
      ctx.moveTo(srcX - w * 0.09, 0);
      ctx.lineTo(srcX + w * 0.09, 0);
      ctx.lineTo(w * 0.5 + (0.5 - lightX) * w * 0.6 + w * 0.34, h);
      ctx.lineTo(w * 0.5 + (0.5 - lightX) * w * 0.6 - w * 0.34, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Subtle architectural perspective floor plane lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
      ctx.lineWidth = 0.8;
      const horizonY = h * 0.62;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + i * w * 0.09, horizonY);
        ctx.lineTo(w * 0.5 + i * w * 0.22, h);
        ctx.stroke();
      }
      for (let j = 0; j < 5; j++) {
        const y = horizonY + Math.pow(j / 4, 1.5) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const cy = h * 0.53;
      const scale = Math.min(w / 860, h / 540);

      if (monolithMode === 0) {
        // MODE 0: Host & Fabric — Stratified Silicon Monolith + Fabric Light Threads
        const breathe = Math.sin(t * 1.1) * 5 * scale;
        drawIsoSlab(ctx, cx, cy + 88 * scale, 210 * scale, 84 * scale, 28 * scale, lightAngle, 0.25);
        drawIsoSlab(ctx, cx, cy + 18 * scale - breathe * 0.5, 175 * scale, 70 * scale, 26 * scale, lightAngle, 0.52);
        drawIsoSlab(ctx, cx, cy - 60 * scale - breathe, 120 * scale, 48 * scale, 34 * scale, lightAngle, 0.85);

        // Luminous fabric light-rails threading cleanly along the base
        ctx.save();
        for (let k = -2; k <= 2; k++) {
          const offset = k * 34 * scale;
          const pulse = (Math.sin(t * 1.8 - Math.abs(k) * 0.9) + 1) * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx - 290 * scale, cy + 125 * scale + offset * 0.3);
          ctx.lineTo(cx, cy + 92 * scale + offset * 0.25);
          ctx.lineTo(cx + 290 * scale, cy + 125 * scale + offset * 0.3);
          ctx.strokeStyle = `rgba(246, 245, 240, ${(0.08 + pulse * 0.24).toFixed(2)})`;
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }
        ctx.restore();
      } else if (monolithMode === 1) {
        // MODE 1: Fleet Lifecycle — Colonnade of 9 Modular Monolithic Bays
        const count = 9;
        for (let i = 0; i < count; i++) {
          const u = (i - (count - 1) / 2) / ((count - 1) / 2);
          const wave = Math.sin(t * 1.65 - i * 0.65);
          const lift = (wave * 0.5 + 0.5) * 44 * scale;
          const bx = cx + u * 265 * scale;
          const by = cy + 30 * scale + Math.abs(u) * 26 * scale - lift;
          const slabH = (76 + (wave * 0.5 + 0.5) * 54) * scale;
          const shimmer = 0.2 + (wave * 0.5 + 0.5) * 0.72;
          drawIsoSlab(ctx, bx, by, 30 * scale, 18 * scale, slabH, lightAngle, shimmer);
        }
      } else {
        // MODE 2: End-to-End Behavior — Twin Isolation Walls & Laminar Deterministic Beams
        drawIsoSlab(ctx, cx - 150 * scale, cy - 34 * scale, 82 * scale, 130 * scale, 135 * scale, lightAngle, 0.38);
        drawIsoSlab(ctx, cx + 150 * scale, cy - 34 * scale, 82 * scale, 130 * scale, 135 * scale, lightAngle, 0.38);

        // Precision laminar light corridor down the center
        for (let r = -3; r <= 3; r++) {
          const rx = cx + r * 14 * scale;
          ctx.beginPath();
          ctx.moveTo(rx, h * 0.12);
          ctx.lineTo(rx, h * 0.88);
          ctx.strokeStyle = `rgba(246, 245, 240, ${(0.07 + (1 - Math.abs(r) / 4) * 0.16).toFixed(2)})`;
          ctx.lineWidth = r === 0 ? 1.3 : 0.75;
          ctx.stroke();

          // Deterministic synchronized photon pulse
          const p = ((t * 0.52 + (r + 3) * 0.08) % 1);
          const py = h * 0.14 + p * h * 0.72;
          const glow = ctx.createRadialGradient(rx, py, 0, rx, py, 16 * scale);
          glow.addColorStop(0, "rgba(246, 245, 240, 0.88)");
          glow.addColorStop(1, "rgba(246, 245, 240, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(rx, py, 16 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Fine architectural crosshair framing marks
      const pad = 22;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pad, pad + 10);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + 10, pad);
      ctx.moveTo(w - pad - 10, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + 10);
      ctx.moveTo(pad, h - pad - 10);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad + 10, h - pad);
      ctx.moveTo(w - pad - 10, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad, h - pad - 10);
      ctx.stroke();
    });

    monolithButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = Number(btn.dataset.monolithMode);
        if (!Number.isFinite(nextMode)) return;
        monolithMode = nextMode;
        monolithButtons.forEach((b) => {
          const active = Number(b.dataset.monolithMode) === monolithMode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (monolithCodeEl) monolithCodeEl.textContent = monolithMeta[monolithMode].code;
        if (monolithCaptionEl) monolithCaptionEl.textContent = monolithMeta[monolithMode].caption;
        if (monolithCtrl) monolithCtrl.renderOnce();
      });
    });
  }

  /* -------------------------------------------------------------------------
   * ACT III: Curtain-Reveal Index & 7 Monochrome Kinetic Art Installations
   * ---------------------------------------------------------------------- */
  const PROJECTS = {
    seed: {
      plate: "PLATE 01 / 07",
      medium: "CONCENTRIC HEALING SILK RINGS",
      title: "SEED",
      desc: "Diagnosing and recovering from 5G failures through the SIM.",
      ctaLabel: "Read the SIGCOMM ’22 paper",
      href: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      external: false,
    },
    secureSIM: {
      plate: "PLATE 02 / 07",
      medium: "ROTATING SILVER IRIS SHUTTER",
      title: "SecureSIM",
      desc: "Authentication and fine-grained access control for SIM and eSIM.",
      ctaLabel: "Read the MobiCom ’21 paper",
      href: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      external: true,
    },
    gptcodelearner: {
      plate: "PLATE 03 / 07",
      medium: "CALLIGRAPHIC CODE-CONSTELLATION",
      title: "GPT-Code-Learner",
      desc: "Explore a codebase through questions, context, and GPT.",
      ctaLabel: "Explore on GitHub",
      href: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      external: true,
    },
    sonica: {
      plate: "PLATE 04 / 07",
      medium: "HARMONIC STANDING-WAVE RIBBONS",
      title: "Sonica",
      desc: "An open NB-IoT network for experiments with real devices.",
      ctaLabel: "Explore on GitHub",
      href: "https://github.com/sonica-nbiot/sonica",
      external: true,
    },
    flora: {
      plate: "PLATE 05 / 07",
      medium: "PARALLAX STACKED ARCHITECTURAL SLABS",
      title: "Flora",
      desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
      ctaLabel: "Explore the project",
      href: "https://project-flora.github.io/Flora/",
      external: true,
    },
    lrp: {
      plate: "PLATE 06 / 07",
      medium: "TWIN SYNCHRONIZED ORBITAL PENDULUMS",
      title: "Mobile VR Latency",
      desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
      ctaLabel: "Read the NSDI ’21 paper",
      href: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      external: true,
    },
    acemap: {
      plate: "PLATE 07 / 07",
      medium: "ARCHIVAL SILVER-PRINT · 2,208 TOPICS",
      title: "Acemap",
      desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
      ctaLabel: "Explore Acemap",
      href: "https://acemap.sjtu.edu.cn/",
      external: true,
    },
  };

  // Exact verified 19 disciplines & source colors from data/data.csv
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

  // 19 nuanced monochrome archival silver-gelatin luminance values
  const ACEMAP_SILVER_TONES = [
    "#f6f5f0",
    "#dcdad2",
    "#c7c5bd",
    "#ecebe4",
    "#ffffff",
    "#b8b6ae",
    "#e2e0d8",
    "#a8a69e",
    "#f0efe8",
    "#c0beb6",
    "#e8e6de",
    "#b2b0a8",
    "#d4d2ca",
    "#c9c7bf",
    "#dedcd4",
    "#aeaca4",
    "#f2f1ea",
    "#cbc9c1",
    "#bab8b0",
  ];

  const projectCanvas = $("#project-art-canvas");
  const curtainEl = $("#kinetic-curtain");
  const stagePlateNum = $("#stage-plate-num");
  const stagePlateMedium = $("#stage-plate-medium");
  const stageTitle = $("#stage-title");
  const stageDesc = $("#stage-desc");
  const stageCta = $("#stage-cta");
  const acemapControlsEl = $("#acemap-controls");
  const acemapLoadBtn = $("#acemap-load-btn");
  const acemapFieldWrap = $("#acemap-field-wrap");
  const acemapTopicWrap = $("#acemap-topic-wrap");
  const acemapFieldSelect = $("#acemap-field");
  const acemapTopicSelect = $("#acemap-topic");
  const acemapStatus = $("#acemap-status");
  const openAcemapBtn = $("#open-acemap-plate");
  const projectRows = $$(".project-row");
  const projectTriggers = $$("[data-select-project]");

  let activeProject = "seed";
  let stagePtrX = 0.5;
  let stagePtrY = 0.5;
  let stagePtrInside = false;
  let projectCtrl = null;

  // Deterministic constellation seeds for GPT-Code-Learner
  const codeNodes = (() => {
    const glyphs = ["{ }", "λ", "=>", "::", "[]", "fn", "∂", "0x", "//", "&&", "∑", "<>"];
    let s = 1337;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    return Array.from({ length: 28 }, (_, i) => ({
      bx: 0.1 + rand() * 0.8,
      by: 0.12 + rand() * 0.76,
      phase: rand() * Math.PI * 2,
      speed: 0.35 + rand() * 0.55,
      glyph: glyphs[i % glyphs.length],
      major: i < 10,
    }));
  })();

  // Acemap runtime state (on-demand loaded from ../../data/data.csv)
  const acemapState = {
    loaded: false,
    loading: false,
    points: [],
    selectedField: "all",
    hoveredIndex: -1,
    selectedIndex: -1,
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
  };

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

  function mapAcemapCoords(w, h) {
    if (!acemapState.points.length) return;
    const padX = w * 0.085;
    const padY = h * 0.1;
    const spanX = Math.max(1, acemapState.maxX - acemapState.minX);
    const spanY = Math.max(1, acemapState.maxY - acemapState.minY);
    const scale = Math.min((w - padX * 2) / spanX, (h - padY * 2) / spanY);
    const offX = (w - spanX * scale) / 2;
    const offY = (h - spanY * scale) / 2;
    for (const p of acemapState.points) {
      p.sx = (p.x - acemapState.minX) * scale + offX;
      p.sy = (p.y - acemapState.minY) * scale + offY;
    }
  }

  function isAcemapPointActive(p) {
    return acemapState.selectedField === "all" || p.field === Number(acemapState.selectedField);
  }

  function updateAcemapFilter() {
    if (!acemapState.loaded) return;
    acemapState.selectedField = acemapFieldSelect ? acemapFieldSelect.value : "all";
    acemapState.hoveredIndex = -1;
    acemapState.selectedIndex = -1;

    let count = 0;
    if (acemapTopicSelect) {
      acemapTopicSelect.replaceChildren(new Option("Choose a topic", ""));
    }
    acemapState.points.forEach((p, idx) => {
      if (isAcemapPointActive(p)) {
        count++;
        if (acemapTopicSelect) {
          acemapTopicSelect.add(new Option(p.name, String(idx)));
        }
      }
    });

    const label =
      acemapState.selectedField === "all"
        ? "All 19 disciplines"
        : ACEMAP_FIELDS[Number(acemapState.selectedField)];
    if (acemapStatus) {
      acemapStatus.textContent = `${label} · ${count.toLocaleString()} topics · Hover or click any star to inspect.`;
    }
    if (projectCtrl) projectCtrl.renderOnce();
  }

  async function loadAcemapDataset() {
    if (acemapState.loaded || acemapState.loading) return;
    acemapState.loading = true;
    if (acemapLoadBtn) {
      acemapLoadBtn.disabled = true;
      acemapLoadBtn.textContent = "Developing 2,208-topic print…";
    }
    if (acemapStatus) {
      acemapStatus.textContent = "Loading archival dataset (../../data/data.csv)…";
    }
    try {
      const response = await fetch("../../data/data.csv");
      if (!response.ok) throw new Error("Unable to fetch ../../data/data.csv");
      const text = await response.text();
      const rows = parseCSV(text).slice(1);
      const pts = [];
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const r of rows) {
        const x = Number(r[0]);
        const y = Number(r[1]);
        const size = Number(r[2]) || 4;
        const name = r[3] || "";
        const color = (r[4] || "").toLowerCase();
        const field = ACEMAP_SOURCE_COLORS.indexOf(color);
        if (!Number.isFinite(x) || !Number.isFinite(y) || field < 0) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        pts.push({ x, y, size, name, field, sx: 0, sy: 0 });
      }
      if (!pts.length) throw new Error("No valid topic coordinates");

      acemapState.points = pts;
      acemapState.minX = minX;
      acemapState.maxX = maxX;
      acemapState.minY = minY;
      acemapState.maxY = maxY;
      acemapState.loaded = true;
      acemapState.loading = false;

      if (projectCtrl) {
        const { width, height } = projectCtrl.getSize();
        mapAcemapCoords(width, height);
      }

      if (acemapFieldSelect && acemapFieldSelect.options.length <= 1) {
        ACEMAP_FIELDS.forEach((fieldName, idx) => {
          acemapFieldSelect.add(new Option(fieldName, String(idx)));
        });
      }
      if (acemapLoadBtn) acemapLoadBtn.hidden = true;
      if (acemapFieldWrap) acemapFieldWrap.hidden = false;
      if (acemapTopicWrap) acemapTopicWrap.hidden = false;
      updateAcemapFilter();
    } catch {
      acemapState.loading = false;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = false;
        acemapLoadBtn.textContent = "Retry 2,208-Topic Silver Print ↗";
      }
      if (acemapStatus) {
        acemapStatus.textContent =
          "Could not load ../../data/data.csv. You can retry or open Acemap directly.";
      }
    }
  }

  /* --- Generative Drawing Routines for Each of the 7 Installations --- */

  // 01. SEED — Concentric Healing Silk Rings
  function drawSeedArt(ctx, w, h, t) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.min(w, h) * 0.41;
    const cycle = (t * 0.42) % 1;
    // Fault flares gently around cycle 0.15-0.45, then heals smoothly
    const fracture = Math.sin(clamp((cycle - 0.1) / 0.45, 0, 1) * Math.PI);
    const faultAngle = -0.65 + (stagePtrX - 0.5) * 1.1;

    // Subtle dark pearl aura
    const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, maxR * 1.25);
    aura.addColorStop(0, "rgba(246, 245, 240, 0.08)");
    aura.addColorStop(0.55, "rgba(246, 245, 240, 0.02)");
    aura.addColorStop(1, "rgba(6, 6, 8, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    const rings = 15;
    for (let i = 1; i <= rings; i++) {
      const ratio = i / rings;
      const r = maxR * (0.14 + ratio * 0.86);
      const gap = fracture * (0.12 + ratio * 0.48) * Math.sin(ratio * Math.PI);
      const spin = t * (0.12 + (i % 3) * 0.05) * (i % 2 === 0 ? 1 : -1);

      ctx.beginPath();
      if (gap > 0.015) {
        ctx.arc(cx, cy, r, faultAngle + gap, faultAngle + Math.PI * 2 - gap);
      } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.strokeStyle = `rgba(246, 245, 240, ${(0.1 + (1 - ratio) * 0.42).toFixed(2)})`;
      ctx.lineWidth = i % 4 === 0 ? 1.25 : 0.75;
      ctx.stroke();

      // Healing silk stitch node gliding along ring
      const nodeAngle = spin + i * 0.7;
      const nx = cx + Math.cos(nodeAngle) * r;
      const ny = cy + Math.sin(nodeAngle) * r;
      ctx.fillStyle = `rgba(246, 245, 240, ${(0.25 + (1 - ratio) * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(nx, ny, i % 3 === 0 ? 2.1 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core SIM healing pulse
    const healPulse = Math.max(0, 1 - Math.abs(cycle - 0.68) * 3.2);
    if (healPulse > 0.02) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * (0.15 + (1 - healPulse) * 0.82), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(healPulse * 0.52).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 02. SecureSIM — Rotating Silver Iris Shutter
  function drawSecureSimArt(ctx, w, h, t) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.4;
    const aperture = 0.24 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 0.24 + (stagePtrY - 0.5) * 0.08;
    const blades = 12;

    // Outer vernier cryptographic scale
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.08);
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const len = i % 6 === 0 ? 12 : 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (radius + 6), Math.sin(a) * (radius + 6));
      ctx.lineTo(Math.cos(a) * (radius + 6 + len), Math.sin(a) * (radius + 6 + len));
      ctx.strokeStyle = i % 6 === 0 ? "rgba(246,245,240,0.45)" : "rgba(246,245,240,0.16)";
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }
    ctx.restore();

    // Inner luminous pearl core
    const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * 0.55);
    core.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    core.addColorStop(0.28, "rgba(246, 245, 240, 0.22)");
    core.addColorStop(1, "rgba(6, 6, 8, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Overlapping machined iris shutter blades
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();

    const innerR = radius * aperture;
    const twist = t * 0.22 + (stagePtrX - 0.5) * 0.6;
    for (let b = 0; b < blades; b++) {
      const a0 = twist + (b / blades) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / blades + 0.35;
      const px = Math.cos(a0) * innerR;
      const py = Math.sin(a0) * innerR;
      const qx = Math.cos(a0 + 1.05) * radius * 1.15;
      const qy = Math.sin(a0 + 1.05) * radius * 1.15;
      const rx = Math.cos(a1 + 0.55) * radius * 1.15;
      const ry = Math.sin(a1 + 0.55) * radius * 1.15;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
      ctx.lineTo(rx, ry);
      ctx.closePath();
      const shade = 14 + (b % 3) * 6;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade + 3}, 0.86)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 245, 240, 0.34)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.45)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // 03. GPT-Code-Learner — Floating Calligraphic Code-Constellation
  function drawCodeConstellationArt(ctx, w, h, t) {
    const px = w * stagePtrX;
    const py = h * stagePtrY;
    const positions = codeNodes.map((n) => {
      const x = n.bx * w + Math.sin(t * n.speed + n.phase) * 18;
      const y = n.by * h + Math.cos(t * n.speed * 0.82 + n.phase) * 14;
      const dist = Math.hypot(x - px, y - py);
      const focus = clamp(1 - dist / (Math.min(w, h) * 0.42), 0, 1);
      return { x, y, glyph: n.glyph, major: n.major, focus };
    });

    // Filaments between nearby nodes
    const maxLink = Math.min(w, h) * 0.28;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
        if (d > maxLink) continue;
        const boost = Math.max(positions[i].focus, positions[j].focus);
        const alpha = (1 - d / maxLink) * (0.14 + boost * 0.46);
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[j].x, positions[j].y);
        ctx.strokeStyle = `rgba(246, 245, 240, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.75 + boost * 0.65;
        ctx.stroke();
      }
    }

    // Calligraphic glyphs & context stars
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of positions) {
      const alpha = 0.32 + p.focus * 0.66;
      if (p.major) {
        ctx.font = `italic 300 ${Math.round(18 + p.focus * 8)}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = `rgba(246, 245, 240, ${alpha.toFixed(2)})`;
        ctx.fillText(p.glyph, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8 + p.focus * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(246, 245, 240, ${alpha.toFixed(2)})`;
        ctx.fill();
      }
    }
  }

  // 04. Sonica — Harmonic Standing-Wave Ribbons
  function drawSonicaArt(ctx, w, h, t) {
    const ribbons = 19;
    const samples = 96;
    const cy = h * 0.5;
    const ampBase = h * 0.27;
    const carrierShift = (stagePtrX - 0.5) * 2.4;

    for (let r = 0; r < ribbons; r++) {
      const ratio = r / (ribbons - 1);
      const spread = (ratio - 0.5) * 2;
      ctx.beginPath();
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const x = w * 0.06 + u * w * 0.88;
        const envelope = Math.sin(u * Math.PI);
        const harmonic =
          Math.sin(u * Math.PI * (3 + r * 0.14) + t * 1.45 + carrierShift) *
          Math.cos(t * 0.65 + spread * 1.8);
        const fine = Math.sin(u * Math.PI * 9 - t * 2.1 + r * 0.35) * 0.16;
        const y = cy + (harmonic + fine) * envelope * ampBase * (0.45 + (1 - Math.abs(spread)) * 0.65) + spread * h * 0.16;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const alpha = 0.09 + (1 - Math.abs(spread)) * 0.44;
      ctx.strokeStyle = `rgba(246, 245, 240, ${alpha.toFixed(2)})`;
      ctx.lineWidth = r === 9 ? 1.35 : 0.75;
      ctx.stroke();
    }

    // Center carrier datum hairline
    ctx.beginPath();
    ctx.moveTo(w * 0.06, cy);
    ctx.lineTo(w * 0.94, cy);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 05. Flora — Parallax Stacked Architectural Slabs (eSIM, Radio, Core, Edge)
  function drawFloraArt(ctx, w, h, t) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const tiltX = (stagePtrX - 0.5) * 34;
    const tiltY = (stagePtrY - 0.5) * 18;
    const layers = [
      { label: "EDGE", y: -112, size: 0.78 },
      { label: "CORE", y: -38, size: 0.92 },
      { label: "RADIO", y: 38, size: 1.0 },
      { label: "eSIM", y: 112, size: 0.84 },
    ];
    const scale = Math.min(w / 680, h / 520);

    // Vertical gossamer plumb-lines linking all four slabs
    const anchors = [
      [-86, 0],
      [86, 0],
      [0, -34],
      [0, 34],
    ];
    ctx.strokeStyle = "rgba(246, 245, 240, 0.18)";
    ctx.lineWidth = 0.75;
    anchors.forEach(([ax, ay]) => {
      ctx.beginPath();
      ctx.moveTo(cx + ax * scale + tiltX * 0.6, cy - 135 * scale + ay * scale);
      ctx.lineTo(cx + ax * scale - tiltX * 0.6, cy + 135 * scale + ay * scale);
      ctx.stroke();
    });

    // Draw slabs bottom-to-top so upper layers float over lower planes
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const depth = (1.5 - i) / 1.5;
      const lx = cx + tiltX * depth * 0.65;
      const ly = cy + layer.y * scale + Math.sin(t * 1.1 + i * 0.85) * 5 * scale + tiltY * depth * 0.35;
      const hw = 165 * layer.size * scale;
      const hd = 56 * layer.size * scale;

      ctx.beginPath();
      ctx.moveTo(lx, ly - hd);
      ctx.lineTo(lx + hw, ly);
      ctx.lineTo(lx, ly + hd);
      ctx.lineTo(lx - hw, ly);
      ctx.closePath();
      ctx.fillStyle = `rgba(246, 245, 240, ${(0.045 + (3 - i) * 0.022).toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(246, 245, 240, ${(0.3 + (3 - i) * 0.14).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subtle internal hairline contour
      ctx.beginPath();
      ctx.moveTo(lx, ly - hd * 0.62);
      ctx.lineTo(lx + hw * 0.62, ly);
      ctx.lineTo(lx, ly + hd * 0.62);
      ctx.lineTo(lx - hw * 0.62, ly);
      ctx.closePath();
      ctx.strokeStyle = "rgba(246, 245, 240, 0.12)";
      ctx.stroke();

      ctx.font = `500 ${Math.max(10, Math.round(10.5 * scale))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.56)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(layer.label, lx + hw + 14 * scale, ly);
    }
  }

  // 06. Mobile VR Latency — Twin Synchronized Orbital Pendulums
  function drawVrPendulumsArt(ctx, w, h, t) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rx = Math.min(w, h) * 0.34;
    const ry = Math.min(w, h) * 0.28;
    const phaseShift = (stagePtrX - 0.5) * 0.9;

    // Luminous Lissajous phase-locked ribbon trail
    ctx.beginPath();
    const steps = 220;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * Math.PI * 2;
      const x = cx + Math.sin(2 * u + t * 0.65) * rx;
      const y = cy + Math.sin(3 * u + t * 0.65 + phaseShift) * ry;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(246, 245, 240, 0.24)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Twin harmonic orbital pendulums
    const pivot1 = { x: cx - rx * 0.42, y: h * 0.1 };
    const pivot2 = { x: cx + rx * 0.42, y: h * 0.1 };
    const bob1 = {
      x: cx + Math.sin(2 * (t * 0.72)) * rx,
      y: cy + Math.sin(3 * (t * 0.72) + phaseShift) * ry,
    };
    const bob2 = {
      x: cx + Math.sin(2 * (t * 0.72 + 0.18)) * rx,
      y: cy + Math.sin(3 * (t * 0.72 + 0.18) + phaseShift) * ry,
    };

    // Pendulum suspension threads
    ctx.strokeStyle = "rgba(246, 245, 240, 0.25)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(pivot1.x, pivot1.y);
    ctx.lineTo(bob1.x, bob1.y);
    ctx.moveTo(pivot2.x, pivot2.y);
    ctx.lineTo(bob2.x, bob2.y);
    ctx.stroke();

    // Phase-lock tether between twin bobs
    ctx.beginPath();
    ctx.moveTo(bob1.x, bob1.y);
    ctx.lineTo(bob2.x, bob2.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    [bob1, bob2].forEach((bob, idx) => {
      const glow = ctx.createRadialGradient(bob.x, bob.y, 0, bob.x, bob.y, 26);
      glow.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      glow.addColorStop(0.3, "rgba(246, 245, 240, 0.25)");
      glow.addColorStop(1, "rgba(6, 6, 8, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bob.x, bob.y, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bob.x, bob.y, idx === 0 ? 5.2 : 4.2, 0, Math.PI * 2);
      ctx.fillStyle = "#f6f5f0";
      ctx.fill();
    });
  }

  // 07. Acemap — Archival Monochrome Silver-Print 2,208-Topic Map
  function drawAcemapArt(ctx, w, h, t) {
    // Subtle darkroom silver-gelatin meridian frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    if (!acemapState.loaded) {
      // Evocative monochrome celestial plate before on-demand CSV load
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rx = w * 0.34;
      const ry = h * 0.22;
      [
        [-0.35, 1, 0.72],
        [0.48, 0.8, 0.92],
        [1.02, 0.52, 1.04],
      ].forEach(([rot, sx, sy], idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot + Math.sin(t * 0.18 + idx) * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * sx, ry * sy, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.22)";
        ctx.lineWidth = 0.85;
        ctx.stroke();
        ctx.restore();
      });

      // Symbolic archival constellation points
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * Math.PI * 2 + t * 0.05;
        const r = (0.14 + ((i * 37) % 100) / 115) * Math.min(w, h) * 0.38;
        const x = cx + Math.cos(a * 1.3 + i) * r * 1.15;
        const y = cy + Math.sin(a * 1.1 + i * 0.7) * r * 0.76;
        ctx.beginPath();
        ctx.arc(x, y, i % 6 === 0 ? 2.8 : 1.4, 0, Math.PI * 2);
        ctx.fillStyle = i % 6 === 0 ? "rgba(246,245,240,0.8)" : "rgba(246,245,240,0.32)";
        ctx.fill();
      }

      ctx.font = `italic 300 22px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.78)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("2,208 Topics · 19 Disciplines", cx, cy);
      return;
    }

    // Render all 2,208 real topics in archival silver-print tones
    const pts = acemapState.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const active = isAcemapPointActive(p);
      const r = active ? clamp(1.35 + (p.size - 4) * 0.22, 1.35, 3.6) : 1.05;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? ACEMAP_SILVER_TONES[p.field] : "rgba(255, 255, 255, 0.07)";
      ctx.globalAlpha = active ? 0.82 : 1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Highlight hovered or selected topic with crisp silver archival reticle
    const focusIdx =
      acemapState.hoveredIndex >= 0 ? acemapState.hoveredIndex : acemapState.selectedIndex;
    if (focusIdx >= 0 && pts[focusIdx]) {
      const fp = pts[focusIdx];
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(fp.sx - 20, fp.sy);
      ctx.lineTo(fp.sx - 7, fp.sy);
      ctx.moveTo(fp.sx + 7, fp.sy);
      ctx.lineTo(fp.sx + 20, fp.sy);
      ctx.moveTo(fp.sx, fp.sy - 20);
      ctx.lineTo(fp.sx, fp.sy - 7);
      ctx.moveTo(fp.sx, fp.sy + 7);
      ctx.lineTo(fp.sx, fp.sy + 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(fp.sx, fp.sy, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(fp.sx, fp.sy, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Label plate inside canvas
      const label = `${fp.name} · ${ACEMAP_FIELDS[fp.field]}`;
      ctx.font = `500 12px "DM Sans", sans-serif`;
      const metrics = ctx.measureText(label);
      const boxW = metrics.width + 20;
      const boxH = 26;
      const bx = clamp(fp.sx + 14, 24, w - boxW - 24);
      const by = clamp(fp.sy - 34, 24, h - boxH - 24);

      ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.45)";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.fillStyle = "#f6f5f0";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + 10, by + boxH / 2);
    }
  }

  function findNearestAcemapPoint(clientX, clientY, maxDist) {
    if (!acemapState.loaded || !projectCanvas) return -1;
    const rect = projectCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const { width, height } = projectCtrl.getSize();
    const mx = ((clientX - rect.left) / rect.width) * width;
    const my = ((clientY - rect.top) / rect.height) * height;
    let best = -1;
    let bestD2 = maxDist * maxDist;
    const pts = acemapState.points;
    for (let i = 0; i < pts.length; i++) {
      if (!isAcemapPointActive(pts[i])) continue;
      const dx = pts[i].sx - mx;
      const dy = pts[i].sy - my;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  if (projectCanvas) {
    projectCanvas.addEventListener(
      "pointermove",
      (ev) => {
        const rect = projectCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        stagePtrInside = true;
        stagePtrX = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        stagePtrY = clamp((ev.clientY - rect.top) / rect.height, 0, 1);

        if (activeProject === "acemap" && acemapState.loaded) {
          const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 18);
          if (idx !== acemapState.hoveredIndex) {
            acemapState.hoveredIndex = idx;
            if (idx >= 0 && acemapStatus) {
              const p = acemapState.points[idx];
              acemapStatus.textContent = `${p.name} · ${ACEMAP_FIELDS[p.field]}`;
            }
            if (projectCtrl) projectCtrl.renderOnce();
          }
        }
      },
      { passive: true }
    );

    projectCanvas.addEventListener("pointerleave", () => {
      stagePtrInside = false;
      if (acemapState.hoveredIndex !== -1) {
        acemapState.hoveredIndex = -1;
        if (projectCtrl) projectCtrl.renderOnce();
      }
    });

    projectCanvas.addEventListener("click", (ev) => {
      if (activeProject !== "acemap") return;
      if (!acemapState.loaded) {
        loadAcemapDataset();
        return;
      }
      const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 22);
      if (idx >= 0) {
        acemapState.selectedIndex = idx;
        if (acemapTopicSelect) acemapTopicSelect.value = String(idx);
        const p = acemapState.points[idx];
        if (acemapStatus) {
          acemapStatus.textContent = `Selected: ${p.name} · ${ACEMAP_FIELDS[p.field]}`;
        }
        if (projectCtrl) projectCtrl.renderOnce();
      }
    });

    projectCtrl = createCanvasLoop(
      projectCanvas,
      (ctx, w, h, t) => {
        if (!stagePtrInside && motionEnabled) {
          stagePtrX = 0.5 + Math.sin(t * 0.45) * 0.16;
          stagePtrY = 0.5 + Math.cos(t * 0.38) * 0.12;
        }
        ctx.fillStyle = "#060608";
        ctx.fillRect(0, 0, w, h);

        switch (activeProject) {
          case "seed":
            drawSeedArt(ctx, w, h, t);
            break;
          case "secureSIM":
            drawSecureSimArt(ctx, w, h, t);
            break;
          case "gptcodelearner":
            drawCodeConstellationArt(ctx, w, h, t);
            break;
          case "sonica":
            drawSonicaArt(ctx, w, h, t);
            break;
          case "flora":
            drawFloraArt(ctx, w, h, t);
            break;
          case "lrp":
            drawVrPendulumsArt(ctx, w, h, t);
            break;
          case "acemap":
            drawAcemapArt(ctx, w, h, t);
            break;
          default:
            drawSeedArt(ctx, w, h, t);
        }
      },
      (w, h) => {
        mapAcemapCoords(w, h);
      }
    );
  }

  let switchTimer = 0;

  function selectProject(key, immediate = false) {
    const info = PROJECTS[key];
    if (!info || (key === activeProject && !immediate)) return;
    activeProject = key;

    projectRows.forEach((row) => {
      const isAct = row.dataset.project === key;
      row.classList.toggle("is-active", isAct);
      const trigger = row.querySelector("[data-select-project]");
      if (trigger) trigger.setAttribute("aria-selected", String(isAct));
    });

    const applyContent = () => {
      if (stagePlateNum) stagePlateNum.textContent = info.plate;
      if (stagePlateMedium) stagePlateMedium.textContent = info.medium;
      if (stageTitle) stageTitle.textContent = info.title;
      if (stageDesc) stageDesc.textContent = info.desc;
      if (stageCta) {
        stageCta.href = info.href;
        stageCta.innerHTML = `${info.ctaLabel} <span aria-hidden="true">↗</span>`;
        if (info.external) {
          stageCta.setAttribute("target", "_blank");
          stageCta.setAttribute("rel", "noopener noreferrer");
        } else {
          stageCta.removeAttribute("target");
          stageCta.removeAttribute("rel");
        }
      }
      if (acemapControlsEl) {
        acemapControlsEl.hidden = key !== "acemap";
      }
      if (projectCanvas) {
        projectCanvas.setAttribute(
          "aria-label",
          `${info.title}: ${info.medium.toLowerCase()} — ${info.desc}`
        );
      }
      if (projectCtrl) projectCtrl.renderOnce();
    };

    if (!motionEnabled || immediate || !curtainEl) {
      applyContent();
      return;
    }

    clearTimeout(switchTimer);
    curtainEl.classList.add("is-switching");
    switchTimer = window.setTimeout(() => {
      applyContent();
      curtainEl.classList.remove("is-switching");
    }, 155);
  }

  projectTriggers.forEach((trigger) => {
    const key = trigger.dataset.selectProject;
    trigger.addEventListener("click", () => selectProject(key));
    trigger.addEventListener("pointerenter", () => {
      if (finePointerMQ.matches) selectProject(key);
    });
  });

  if (acemapLoadBtn) {
    acemapLoadBtn.addEventListener("click", loadAcemapDataset);
  }
  if (acemapFieldSelect) {
    acemapFieldSelect.addEventListener("change", updateAcemapFilter);
  }
  if (acemapTopicSelect) {
    acemapTopicSelect.addEventListener("change", () => {
      const val = acemapTopicSelect.value;
      acemapState.selectedIndex = val === "" ? -1 : Number(val);
      if (acemapState.selectedIndex >= 0 && acemapState.points[acemapState.selectedIndex]) {
        const p = acemapState.points[acemapState.selectedIndex];
        if (acemapStatus) {
          acemapStatus.textContent = `Selected: ${p.name} · ${ACEMAP_FIELDS[p.field]}`;
        }
      } else {
        updateAcemapFilter();
      }
      if (projectCtrl) projectCtrl.renderOnce();
    });
  }
  if (openAcemapBtn) {
    openAcemapBtn.addEventListener("click", () => {
      selectProject("acemap", true);
      if (curtainEl) {
        curtainEl.scrollIntoView({ behavior: motionEnabled ? "smooth" : "auto", block: "center" });
      }
      loadAcemapDataset();
    });
  }

  /* -------------------------------------------------------------------------
   * ACT IV: Publications Filter (All / Conferences / Journals)
   * ---------------------------------------------------------------------- */
  const filterButtons = $$("[data-filter]");
  const pubGroups = $$(".pub-group");
  const pubCountEl = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    filterButtons.forEach((btn) => {
      const active = btn.dataset.filter === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    const visibleGroups = pubGroups.filter((g) => !g.hidden);
    const total = visibleGroups.reduce(
      (sum, g) => sum + g.querySelectorAll(".pub-entry").length,
      0
    );
    const years = visibleGroups.flatMap((g) =>
      $$(".pub-year", g).map((el) => Number(el.textContent))
    );
    const minY = years.length ? Math.min(...years) : 2019;
    const maxY = years.length ? Math.max(...years) : 2023;
    const label =
      kind === "all"
        ? "publications"
        : kind === "conference"
          ? "conference publications"
          : "journal publications";

    if (pubCountEl) {
      pubCountEl.textContent = `${total} ${label} · ${minY}–${maxY}`;
    }
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncHashFilter() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncHashFilter);
  syncHashFilter();
})();
