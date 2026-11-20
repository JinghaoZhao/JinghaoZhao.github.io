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
   * Motion Preference & Pauseable Canvas Registry
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
   * Helper: Offscreen-Pausing Canvas Controller & Shared Drawing Utilities
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

  function drawCornerMarks(ctx, w, h, pad = 18, alpha = 0.2) {
    ctx.strokeStyle = `rgba(246, 245, 240, ${alpha})`;
    ctx.lineWidth = 0.85;
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
  }

  function drawGlowingPulse(ctx, x, y, r, alpha = 0.9) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.6);
    g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    g.addColorStop(0.35, `rgba(246, 245, 240, ${(alpha * 0.35).toFixed(2)})`);
    g.addColorStop(1, "rgba(6, 6, 8, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBadge(ctx, text, cx, cy, filled = false, fontSize = 10) {
    ctx.font = `500 ${fontSize}px "DM Sans", sans-serif`;
    const tw = ctx.measureText(text).width;
    const bw = tw + 18;
    const bh = fontSize + 12;
    const x = cx - bw / 2;
    const y = cy - bh / 2;
    ctx.fillStyle = filled ? "#f6f5f0" : "rgba(12, 12, 16, 0.9)";
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = filled ? "#f6f5f0" : "rgba(246, 245, 240, 0.34)";
    ctx.lineWidth = 0.9;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = filled ? "#09090b" : "#f6f5f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy + 0.5);
  }

  /* -------------------------------------------------------------------------
   * HERO: Monochrome Architectural Server-Blade Light Corridors & Fabric Topography
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
          velEnergy = clamp(velEnergy + Math.hypot(nx - ptrX, ny - ptrY) * 3.8, 0, 1.4);
          ptrX = nx;
          ptrY = ny;
        },
        { passive: true }
      );
    }

    createCanvasLoop(heroCanvas, (ctx, w, h, t, dt) => {
      smoothX = lerp(smoothX, ptrX, dt ? Math.min(1, dt * 3.2) : 0.08);
      smoothY = lerp(smoothY, ptrY, dt ? Math.min(1, dt * 3.2) : 0.08);
      velEnergy = Math.max(0, velEnergy - (dt || 0.016) * 0.95);

      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, w, h);

      // Perspective vanishing point responds gracefully to pointer
      const vx = w * (0.5 + (smoothX - 0.5) * 0.14);
      const vy = h * (0.46 + (smoothY - 0.5) * 0.08);

      // Atmospheric architectural light bloom at corridor horizon
      const bloom = ctx.createRadialGradient(vx, vy, 8, vx, vy, Math.max(w, h) * 0.68);
      bloom.addColorStop(0, "rgba(246, 245, 240, 0.11)");
      bloom.addColorStop(0.38, "rgba(210, 210, 218, 0.032)");
      bloom.addColorStop(1, "rgba(9, 9, 11, 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      // 1. Perspective Floor Fabric Grid (receding engineering lanes)
      const laneCount = w < 640 ? 10 : 16;
      for (let i = -laneCount; i <= laneCount; i++) {
        const ratio = i / laneCount;
        const bx = w * 0.5 + ratio * w * 1.15;
        ctx.beginPath();
        ctx.moveTo(vx + ratio * w * 0.06, vy + h * 0.04);
        ctx.lineTo(bx, h + 10);
        ctx.strokeStyle =
          Math.abs(i) % 4 === 0
            ? "rgba(246, 245, 240, 0.13)"
            : "rgba(246, 245, 240, 0.05)";
        ctx.lineWidth = Math.abs(i) % 4 === 0 ? 0.9 : 0.6;
        ctx.stroke();
      }

      // Horizontal depth cross-rails moving subtly forward along fabric floor
      const depthLines = 11;
      const flowShift = (t * (0.28 + velEnergy * 0.2)) % 1;
      for (let d = 0; d < depthLines; d++) {
        const z = (d + flowShift) / depthLines;
        const persp = Math.pow(z, 2.2);
        const y = vy + h * 0.04 + persp * (h - vy);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = `rgba(246, 245, 240, ${(0.03 + persp * 0.11).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // 2. Flanking Architectural Server-Blade Monolith Corridors (left & right bays)
      const bayCount = w < 640 ? 5 : 7;
      for (let side of [-1, 1]) {
        for (let b = 0; b < bayCount; b++) {
          const depth = (b + 0.5) / bayCount;
          const p = Math.pow(depth, 1.55);
          const xNear = vx + side * (w * 0.14 + p * w * 0.44);
          const bladeW = (8 + p * 38) * (w < 640 ? 0.7 : 1);
          const topY = vy - (h * 0.06 + p * h * 0.42);
          const botY = vy + (h * 0.05 + p * h * 0.44);
          const bx = side < 0 ? xNear - bladeW : xNear;

          // Extruded obsidian blade face
          ctx.fillStyle = `rgba(18, 18, 22, ${(0.35 + p * 0.48).toFixed(2)})`;
          ctx.fillRect(bx, topY, bladeW, botY - topY);

          // Silver rim edge facing corridor light
          ctx.beginPath();
          const rimX = side < 0 ? bx + bladeW : bx;
          ctx.moveTo(rimX, topY);
          ctx.lineTo(rimX, botY);
          ctx.strokeStyle = `rgba(246, 245, 240, ${(0.09 + p * 0.28).toFixed(2)})`;
          ctx.lineWidth = 0.9 + p * 0.6;
          ctx.stroke();

          // Subtle physical blade slot ticks (hardware rack rhythm)
          const slots = 6;
          for (let s = 1; s < slots; s++) {
            const sy = topY + (s / slots) * (botY - topY);
            const activeSlit = Math.sin(t * 2.1 + b * 1.1 + s * 0.9) > 0.72;
            ctx.beginPath();
            ctx.moveTo(bx + bladeW * 0.18, sy);
            ctx.lineTo(bx + bladeW * 0.82, sy);
            ctx.strokeStyle = activeSlit
              ? `rgba(255, 255, 255, ${(0.28 + p * 0.4).toFixed(2)})`
              : `rgba(246, 245, 240, ${(0.04 + p * 0.09).toFixed(2)})`;
            ctx.lineWidth = activeSlit ? 1.1 : 0.6;
            ctx.stroke();
          }
        }
      }

      // 3. Flowing Silver Fabric Contour Ribbons across the corridor
      const ribbons = w < 640 ? 9 : 14;
      const samples = 64;
      const phase = t * 0.42;
      for (let r = 0; r < ribbons; r++) {
        const ratio = r / (ribbons - 1);
        const baseY = h * (0.28 + ratio * 0.44);
        const midWeight = Math.sin(ratio * Math.PI);
        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          const u = s / samples;
          const x = u * w;
          const dist = Math.hypot((u - smoothX) * 1.5, (baseY / h - smoothY) * 2.4);
          const lift = Math.exp(-dist * dist * 5) * (20 + velEnergy * 26);
          const y =
            baseY +
            Math.sin(u * 4.2 + phase + ratio * 2.8) * (18 + midWeight * 16) +
            Math.cos(u * 8.4 - phase * 0.8 + ratio * 4.2) * 8 +
            lift * Math.sin(u * 10 - phase * 2);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(246, 245, 240, ${(0.035 + midWeight * 0.12).toFixed(3)})`;
        ctx.lineWidth = r % 4 === 0 ? 1 : 0.65;
        ctx.stroke();
      }

      // 4. Deterministic Light Packets streaking along precision fabric lanes
      const packetLanes = [-6, -3, -1, 1, 3, 6];
      packetLanes.forEach((laneIdx, idx) => {
        const ratio = laneIdx / laneCount;
        const speed = 0.24 + (idx % 3) * 0.06 + velEnergy * 0.14;
        const p = (t * speed + idx * 0.19) % 1;
        const z = Math.pow(p, 1.9);
        const startX = vx + ratio * w * 0.06;
        const endX = w * 0.5 + ratio * w * 1.15;
        const px = lerp(startX, endX, z);
        const py = lerp(vy + h * 0.04, h + 10, z);
        const tailZ = Math.max(0, z - 0.09);
        const tx = lerp(startX, endX, tailZ);
        const ty = lerp(vy + h * 0.04, h + 10, tailZ);

        const grad = ctx.createLinearGradient(tx, ty, px, py);
        grad.addColorStop(0, "rgba(246, 245, 240, 0)");
        grad.addColorStop(1, `rgba(255, 255, 255, ${(0.35 + z * 0.55).toFixed(2)})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1 + z * 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 + z * 0.5).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + z * 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  /* -------------------------------------------------------------------------
   * ACT I: GCE Bare Metal Architectural Study Canvas (#monolith-canvas)
   * ---------------------------------------------------------------------- */
  const monolithCanvas = $("#monolith-canvas");
  const monolithButtons = $$("[data-monolith-mode]");
  const monolithCodeEl = $("#monolith-plate-code");
  const monolithCaptionEl = $("#monolith-caption-text");
  const monolithHintEl = $("#monolith-hint");

  const monolithMeta = [
    {
      code: "STUDY I · HOST & FABRIC",
      hint: "Move pointer to shift architectural light beam",
      caption:
        "Dedicated physical silicon connected directly to cloud fabric—zero virtualization boundary.",
    },
    {
      code: "STUDY II · FLEET LIFECYCLE",
      hint: "Click any blade to cycle its lifecycle state",
      caption:
        "Physical server blades stepping through Provision → Verify → Active → Drain → Reclaim.",
    },
    {
      code: "STUDY III · END-TO-END BEHAVIOR",
      hint: "Deterministic low-jitter packet path & timing trace",
      caption:
        "Unwavering packet timing across Host NIC → Cloud Fabric → Control Plane → Peer.",
    },
  ];

  const LIFECYCLE_STATES = ["PROVISION", "VERIFY", "ACTIVE", "DRAIN", "RECLAIM"];
  let bladeOffsets = [0, 1, 2, 2, 3, 4];
  let monolithMode = 0;
  let monolithCtrl = null;

  if (monolithCanvas) {
    let lightTargetX = 0.5;
    let lightTargetY = 0.22;
    let lightX = 0.5;
    let lightY = 0.22;
    let pointerActive = false;

    monolithCanvas.addEventListener(
      "pointermove",
      (ev) => {
        const rect = monolithCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointerActive = true;
        lightTargetX = clamp((ev.clientX - rect.left) / rect.width, 0.1, 0.9);
        lightTargetY = clamp((ev.clientY - rect.top) / rect.height, 0.08, 0.82);
      },
      { passive: true }
    );

    monolithCanvas.addEventListener("pointerleave", () => {
      pointerActive = false;
    });

    monolithCanvas.addEventListener("click", (ev) => {
      if (monolithMode !== 1) return;
      const rect = monolithCanvas.getBoundingClientRect();
      if (!rect.width) return;
      const nx = (ev.clientX - rect.left) / rect.width;
      const idx = clamp(Math.floor(((nx - 0.1) / 0.8) * bladeOffsets.length), 0, bladeOffsets.length - 1);
      bladeOffsets[idx] = (bladeOffsets[idx] + 1) % LIFECYCLE_STATES.length;
      if (monolithCtrl) monolithCtrl.renderOnce();
    });

    function drawHostFabricMode(ctx, w, h, t) {
      const s = Math.min(w / 920, h / 560);
      const cx = w * 0.5;
      const srcX = w * lightX;

      // Directional volumetric light cone from top cloud fabric aperture straight down to bare silicon
      const beam = ctx.createLinearGradient(srcX, h * 0.06, cx, h * 0.86);
      beam.addColorStop(0, "rgba(246, 245, 240, 0.2)");
      beam.addColorStop(0.5, "rgba(246, 245, 240, 0.08)");
      beam.addColorStop(1, "rgba(246, 245, 240, 0.18)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(cx - 58 * s + (srcX - cx) * 0.25, h * 0.14);
      ctx.lineTo(cx + 58 * s + (srcX - cx) * 0.25, h * 0.14);
      ctx.lineTo(cx + 120 * s, h * 0.72);
      ctx.lineTo(cx - 120 * s, h * 0.72);
      ctx.closePath();
      ctx.fill();

      // Top Architectural Plane: CLOUD NETWORK & STORAGE FABRIC
      const topY = h * 0.17;
      ctx.fillStyle = "rgba(246, 245, 240, 0.06)";
      ctx.strokeStyle = "rgba(246, 245, 240, 0.36)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 290 * s, topY);
      ctx.lineTo(cx + 290 * s, topY);
      ctx.lineTo(cx + 250 * s, topY + 34 * s);
      ctx.lineTo(cx - 250 * s, topY + 34 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.font = `500 ${Math.max(10, Math.round(11 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "#f6f5f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CLOUD NETWORK FABRIC  ·  HIGH-SPEED STORAGE I/O", cx, topY + 17 * s);

      // Middle Void: ZERO HYPERVISOR LAYER (unobstructed direct optical conduit)
      const midY = h * 0.45;
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.22)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - 260 * s, midY);
      ctx.lineTo(cx - 110 * s, midY);
      ctx.moveTo(cx + 110 * s, midY);
      ctx.lineTo(cx + 260 * s, midY);
      ctx.stroke();
      ctx.restore();

      drawBadge(ctx, "ZERO HYPERVISOR LAYER", cx, midY, false, Math.max(9, Math.round(10 * s)));

      // Direct hardware-to-fabric silver optical rails (unbroken vertical lines)
      const rails = [-52, -26, 0, 26, 52];
      rails.forEach((rxOff, idx) => {
        const rx = cx + rxOff * s;
        ctx.beginPath();
        ctx.moveTo(rx, topY + 34 * s);
        ctx.lineTo(rx, h * 0.68);
        ctx.strokeStyle =
          idx === 2 ? "rgba(255, 255, 255, 0.72)" : "rgba(246, 245, 240, 0.28)";
        ctx.lineWidth = idx === 2 ? 1.5 : 0.85;
        ctx.stroke();

        // Direct packet pulse gliding straight between silicon and fabric
        const dir = idx % 2 === 0 ? 1 : -1;
        const p = ((t * (0.62 + idx * 0.05) + idx * 0.22) % 1);
        const py = dir > 0
          ? lerp(h * 0.68, topY + 34 * s, p)
          : lerp(topY + 34 * s, h * 0.68, p);
        drawGlowingPulse(ctx, rx, py, idx === 2 ? 2.8 * s : 1.9 * s, 0.85);
      });

      // Bottom Cutaway Monolith: BARE METAL CHASSIS (PHYSICAL CPU + DEDICATED NIC)
      const baseY = h * 0.68;
      const baseW = 540 * s;
      const baseH = 92 * s;
      const bx = cx - baseW / 2;

      ctx.fillStyle = "#121216";
      ctx.fillRect(bx, baseY, baseW, baseH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.45)";
      ctx.lineWidth = 1.1;
      ctx.strokeRect(bx, baseY, baseW, baseH);

      // Left Silicon Die: PHYSICAL CPU
      const cpuX = bx + 26 * s;
      const dieY = baseY + 16 * s;
      const dieW = 215 * s;
      const dieH = 60 * s;
      ctx.fillStyle = "rgba(246, 245, 240, 0.08)";
      ctx.fillRect(cpuX, dieY, dieW, dieH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.42)";
      ctx.strokeRect(cpuX, dieY, dieW, dieH);
      // Core grid etched inside CPU die
      for (let gx = 1; gx < 4; gx++) {
        ctx.beginPath();
        ctx.moveTo(cpuX + (gx / 4) * dieW, dieY + 8 * s);
        ctx.lineTo(cpuX + (gx / 4) * dieW, dieY + dieH - 8 * s);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.14)";
        ctx.stroke();
      }
      ctx.fillStyle = "#f6f5f0";
      ctx.font = `500 ${Math.max(9.5, Math.round(10.5 * s))}px "DM Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("DEDICATED PHYSICAL CPU", cpuX + dieW / 2, dieY + dieH / 2);

      // Right Silicon Die: DEDICATED NIC / PCIe
      const nicX = bx + baseW - 26 * s - dieW;
      ctx.fillStyle = "rgba(246, 245, 240, 0.08)";
      ctx.fillRect(nicX, dieY, dieW, dieH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.42)";
      ctx.strokeRect(nicX, dieY, dieW, dieH);
      ctx.fillStyle = "#f6f5f0";
      ctx.fillText("DIRECT NIC · STORAGE I/O", nicX + dieW / 2, dieY + dieH / 2);

      // Direct bus trace joining CPU <-> NIC
      ctx.beginPath();
      ctx.moveTo(cpuX + dieW, dieY + dieH / 2);
      ctx.lineTo(nicX, dieY + dieH / 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = "rgba(246, 245, 240, 0.62)";
      ctx.font = `500 ${Math.max(9, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
      ctx.fillText("BARE METAL PHYSICAL HOST", cx, baseY + baseH + 18 * s);
    }

    function drawFleetLifecycleMode(ctx, w, h, t) {
      const s = Math.min(w / 920, h / 560);
      const padX = w * 0.08;
      const usableW = w - padX * 2;

      // Top Lifecycle State Rail
      const railY = h * 0.16;
      ctx.beginPath();
      ctx.moveTo(padX, railY);
      ctx.lineTo(w - padX, railY);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const globalPhase = motionEnabled ? Math.floor(t * 0.55) : 0;

      LIFECYCLE_STATES.forEach((label, idx) => {
        const sx = padX + (idx / (LIFECYCLE_STATES.length - 1)) * usableW;
        const active = idx === globalPhase % LIFECYCLE_STATES.length;
        ctx.beginPath();
        ctx.arc(sx, railY, active ? 4.5 * s : 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = active ? "#ffffff" : "rgba(246, 245, 240, 0.4)";
        ctx.fill();

        ctx.font = `500 ${Math.max(8.5, Math.round(10 * s))}px "DM Sans", sans-serif`;
        ctx.fillStyle = active ? "#ffffff" : "rgba(246, 245, 240, 0.55)";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, sx, railY - 10 * s);
      });

      // Server-Rack Exposure Strip (6 Physical Blades)
      const blades = bladeOffsets.length;
      const gap = 14 * s;
      const bladeW = (usableW - gap * (blades - 1)) / blades;
      const topY = h * 0.28;
      const bladeH = h * 0.54;

      for (let i = 0; i < blades; i++) {
        const bx = padX + i * (bladeW + gap);
        const stateIdx = (bladeOffsets[i] + globalPhase) % LIFECYCLE_STATES.length;
        const stateName = LIFECYCLE_STATES[stateIdx];
        const isActive = stateName === "ACTIVE";
        const isTransition = stateName === "PROVISION" || stateName === "DRAIN";

        // Blade body
        ctx.fillStyle = isActive
          ? "rgba(246, 245, 240, 0.14)"
          : isTransition
            ? "rgba(246, 245, 240, 0.065)"
            : "rgba(246, 245, 240, 0.03)";
        ctx.fillRect(bx, topY, bladeW, bladeH);

        ctx.strokeStyle = isActive
          ? "rgba(255, 255, 255, 0.72)"
          : "rgba(246, 245, 240, 0.24)";
        ctx.lineWidth = isActive ? 1.3 : 0.85;
        ctx.strokeRect(bx, topY, bladeW, bladeH);

        // Blade hardware bezel lines
        for (let r = 1; r <= 7; r++) {
          const ly = topY + (r / 8) * bladeH;
          ctx.beginPath();
          ctx.moveTo(bx + 10 * s, ly);
          ctx.lineTo(bx + bladeW - 10 * s, ly);
          ctx.strokeStyle = isActive
            ? "rgba(246, 245, 240, 0.22)"
            : "rgba(246, 245, 240, 0.08)";
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }

        // Animated exposure scanline inside transitioning blades
        if (isActive || isTransition) {
          const scanP = (t * (isActive ? 0.55 : 0.9) + i * 0.27) % 1;
          const sy = topY + scanP * bladeH;
          const sg = ctx.createLinearGradient(bx, sy - 18 * s, bx, sy + 18 * s);
          sg.addColorStop(0, "rgba(246, 245, 240, 0)");
          sg.addColorStop(0.5, isActive ? "rgba(255, 255, 255, 0.28)" : "rgba(246, 245, 240, 0.16)");
          sg.addColorStop(1, "rgba(246, 245, 240, 0)");
          ctx.fillStyle = sg;
          ctx.fillRect(bx + 1, sy - 18 * s, bladeW - 2, 36 * s);
        }

        // Blade index & live state label
        ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
        ctx.fillStyle = "rgba(246, 245, 240, 0.55)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`BLADE 0${i + 1}`, bx + bladeW / 2, topY + 12 * s);

        // State pill at bottom of blade
        drawBadge(
          ctx,
          stateName,
          bx + bladeW / 2,
          topY + bladeH - 22 * s,
          isActive,
          Math.max(8, Math.round(8.8 * s))
        );
      }

      ctx.font = `500 ${Math.max(9, Math.round(10 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.58)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("AUTOMATED FLEET ORCHESTRATION · CLICK ANY BLADE TO ADVANCE STATE", w * 0.5, topY + bladeH + 18 * s);
    }

    function drawEndToEndMode(ctx, w, h, t) {
      const s = Math.min(w / 920, h / 560);
      const padX = w * 0.09;
      const usableW = w - padX * 2;

      // Upper Register: Deterministic Packet Path (Host NIC -> Fabric -> Control Plane -> Peer)
      const nodes = ["HOST NIC", "CLOUD FABRIC", "CONTROL PLANE", "PEER HOST"];
      const pathY = h * 0.3;

      ctx.beginPath();
      ctx.moveTo(padX, pathY);
      ctx.lineTo(w - padX, pathY);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.24)";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Evenly spaced deterministic packets gliding across the full path
      const pktCount = 8;
      for (let i = 0; i < pktCount; i++) {
        const u = ((t * 0.28 + i / pktCount) % 1);
        const px = padX + u * usableW;
        drawGlowingPulse(ctx, px, pathY, 2.4 * s, 0.88);
      }

      nodes.forEach((name, idx) => {
        const nx = padX + (idx / (nodes.length - 1)) * usableW;
        ctx.fillStyle = "#0b0b0e";
        ctx.strokeStyle = "rgba(246, 245, 240, 0.62)";
        ctx.lineWidth = 1.1;
        const bw = 124 * s;
        const bh = 38 * s;
        ctx.fillRect(nx - bw / 2, pathY - bh / 2, bw, bh);
        ctx.strokeRect(nx - bw / 2, pathY - bh / 2, bw, bh);

        ctx.font = `500 ${Math.max(8.5, Math.round(9.8 * s))}px "DM Sans", sans-serif`;
        ctx.fillStyle = "#f6f5f0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, nx, pathY);
      });

      // Lower Register: Flat-Jitter Deterministic Timing Oscilloscope Trace
      const scopeX = padX;
      const scopeY = h * 0.5;
      const scopeW = usableW;
      const scopeH = h * 0.34;

      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(scopeX, scopeY, scopeW, scopeH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.22)";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(scopeX, scopeY, scopeW, scopeH);

      // Calibrated graticule
      for (let gx = 1; gx < 8; gx++) {
        const x = scopeX + (gx / 8) * scopeW;
        ctx.beginPath();
        ctx.moveTo(x, scopeY);
        ctx.lineTo(x, scopeY + scopeH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
        ctx.stroke();
      }
      for (let gy = 1; gy < 4; gy++) {
        const y = scopeY + (gy / 4) * scopeH;
        ctx.beginPath();
        ctx.moveTo(scopeX, y);
        ctx.lineTo(scopeX + scopeW, y);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.stroke();
      }

      // Faint baseline reference (noisy jitter comparison ghost)
      ctx.beginPath();
      const samples = 120;
      const baseMid = scopeY + scopeH * 0.52;
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const x = scopeX + u * scopeW;
        const jitter =
          Math.sin(u * 28 - t * 3.1) * 14 * s +
          Math.sin(u * 61 + t * 2.2) * 8 * s +
          (Math.sin(u * 13 - t * 1.4) > 0.85 ? -26 * s : 0);
        const y = baseMid + jitter - 12 * s;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(246, 245, 240, 0.16)";
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Primary crisp silver deterministic timing trace (flat, predictable precision)
      ctx.beginPath();
      const flatY = scopeY + scopeH * 0.62;
      for (let i = 0; i <= samples; i++) {
        const u = i / samples;
        const x = scopeX + u * scopeW;
        const micro = Math.sin(u * 42 - t * 5) * 1.4 * s;
        const pulse = Math.pow(Math.max(0, Math.sin(u * Math.PI * 6 - t * 3.6)), 18) * 10 * s;
        const y = flatY + micro - pulse;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.65;
      ctx.stroke();

      ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.72)";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("DETERMINISTIC PACKET TIMING TRACE (CONCEPTUAL)", scopeX + 12 * s, scopeY + 10 * s);

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(246, 245, 240, 0.45)";
      ctx.fillText("FLAT-JITTER ENVELOPE", scopeX + scopeW - 12 * s, scopeY + 10 * s);
    }

    monolithCtrl = createCanvasLoop(monolithCanvas, (ctx, w, h, t, dt) => {
      if (!pointerActive && motionEnabled) {
        lightTargetX = 0.5 + Math.sin(t * 0.45) * 0.25;
        lightTargetY = 0.22;
      }
      lightX = lerp(lightX, lightTargetX, dt ? Math.min(1, dt * 4.5) : 0.12);
      lightY = lerp(lightY, lightTargetY, dt ? Math.min(1, dt * 4.5) : 0.12);

      ctx.fillStyle = "#08080a";
      ctx.fillRect(0, 0, w, h);

      if (monolithMode === 0) {
        drawHostFabricMode(ctx, w, h, t);
      } else if (monolithMode === 1) {
        drawFleetLifecycleMode(ctx, w, h, t);
      } else {
        drawEndToEndMode(ctx, w, h, t);
      }

      drawCornerMarks(ctx, w, h, 16, 0.2);
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
        if (monolithHintEl) monolithHintEl.textContent = monolithMeta[monolithMode].hint;
        if (monolithCtrl) monolithCtrl.renderOnce();
      });
    });
  }

  /* -------------------------------------------------------------------------
   * ACT I (PART B): CME Group Ultra-Low-Latency Cinema Plate (#cme-canvas)
   * ---------------------------------------------------------------------- */
  const cmeCanvas = $("#cme-canvas");
  if (cmeCanvas) {
    createCanvasLoop(cmeCanvas, (ctx, w, h, t) => {
      const s = Math.min(w / 1080, h / 250);
      ctx.fillStyle = "#060608";
      ctx.fillRect(0, 0, w, h);

      const padX = Math.max(24, w * 0.055);
      const boxW = clamp(165 * s, 94, 190);
      const boxH = clamp(104 * s, 68, 124);
      const cy = h * 0.48;

      const leftX = padX;
      const rightX = w - padX - boxW;
      const railStart = leftX + boxW + 14 * s;
      const railEnd = rightX - 14 * s;
      const railLen = Math.max(40, railEnd - railStart);

      // Central Dedicated Bare-Metal Fabric Corridor
      ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
      ctx.fillRect(railStart, cy - 36 * s, railLen, 72 * s);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.14)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(railStart, cy - 36 * s, railLen, 72 * s);

      // Precision fabric tick grid inside corridor
      const ticks = 18;
      for (let i = 1; i < ticks; i++) {
        const tx = railStart + (i / ticks) * railLen;
        ctx.beginPath();
        ctx.moveTo(tx, cy - 36 * s);
        ctx.lineTo(tx, cy - 28 * s);
        ctx.moveTo(tx, cy + 28 * s);
        ctx.lineTo(tx, cy + 36 * s);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.14)";
        ctx.stroke();
      }

      // Upper rail (Market Order Ingress ->) & Lower rail (<- Execution Ack)
      const upperY = cy - 13 * s;
      const lowerY = cy + 13 * s;
      ctx.beginPath();
      ctx.moveTo(railStart, upperY);
      ctx.lineTo(railEnd, upperY);
      ctx.moveTo(railStart, lowerY);
      ctx.lineTo(railEnd, lowerY);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.24)";
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // Synchronized high-velocity silver light pulses
      const pulseCount = 4;
      let matchFlash = 0;
      for (let i = 0; i < pulseCount; i++) {
        const pIn = (t * 0.72 + i / pulseCount) % 1;
        const pxIn = railStart + pIn * railLen;
        const tailIn = Math.max(railStart, pxIn - 54 * s);
        const gIn = ctx.createLinearGradient(tailIn, upperY, pxIn, upperY);
        gIn.addColorStop(0, "rgba(255,255,255,0)");
        gIn.addColorStop(1, "rgba(255,255,255,0.92)");
        ctx.strokeStyle = gIn;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(tailIn, upperY);
        ctx.lineTo(pxIn, upperY);
        ctx.stroke();
        drawGlowingPulse(ctx, pxIn, upperY, 2.2 * s, 0.92);
        if (pIn > 0.92) matchFlash = Math.max(matchFlash, (pIn - 0.92) / 0.08);

        // Return acknowledgement pulse
        const pAck = (t * 0.72 + i / pulseCount + 0.08) % 1;
        const pxAck = railEnd - pAck * railLen;
        const tailAck = Math.min(railEnd, pxAck + 46 * s);
        const gAck = ctx.createLinearGradient(tailAck, lowerY, pxAck, lowerY);
        gAck.addColorStop(0, "rgba(246,245,240,0)");
        gAck.addColorStop(1, "rgba(246,245,240,0.72)");
        ctx.strokeStyle = gAck;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tailAck, lowerY);
        ctx.lineTo(pxAck, lowerY);
        ctx.stroke();
        drawGlowingPulse(ctx, pxAck, lowerY, 1.8 * s, 0.75);
      }

      // Left Architectural Node: TRADING GATEWAY
      ctx.fillStyle = "#101014";
      ctx.fillRect(leftX, cy - boxH / 2, boxW, boxH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.48)";
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX, cy - boxH / 2, boxW, boxH);

      ctx.font = `500 ${Math.max(8.5, Math.round(10 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "#f6f5f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TRADING", leftX + boxW / 2, cy - 8 * s);
      ctx.fillText("GATEWAY", leftX + boxW / 2, cy + 8 * s);

      // Right Architectural Node: MATCHING ENGINE (flashes subtly on pulse arrival)
      ctx.fillStyle = `rgba(246, 245, 240, ${(0.04 + matchFlash * 0.16).toFixed(2)})`;
      ctx.fillRect(rightX, cy - boxH / 2, boxW, boxH);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.48 + matchFlash * 0.45).toFixed(2)})`;
      ctx.lineWidth = 1 + matchFlash * 0.6;
      ctx.strokeRect(rightX, cy - boxH / 2, boxW, boxH);

      ctx.fillStyle = "#f6f5f0";
      ctx.fillText("MATCHING", rightX + boxW / 2, cy - 8 * s);
      ctx.fillText("ENGINE", rightX + boxW / 2, cy + 8 * s);

      // Subtle directional micro-labels above & below corridor
      ctx.font = `500 ${Math.max(8, Math.round(9 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.6)";
      ctx.fillText("MARKET ORDER INGRESS →", (railStart + railEnd) / 2, cy - 48 * s);
      ctx.fillText("← DETERMINISTIC EXECUTION ACK", (railStart + railEnd) / 2, cy + 50 * s);

      drawCornerMarks(ctx, w, h, 12, 0.18);
    });
  }

  /* -------------------------------------------------------------------------
   * ACT III: Curtain-Reveal Index & 7 Domain-Specific Cinema Plates
   * ---------------------------------------------------------------------- */
  const PROJECTS = {
    seed: {
      plate: "PLATE 01 / 07",
      medium: "5G UE · SIM/SEED · 5G CORE",
      title: "SEED",
      desc: "Diagnosing and recovering from 5G failures through the SIM.",
      ctaLabel: "Read the SIGCOMM ’22 paper",
      href: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      external: false,
    },
    secureSIM: {
      plate: "PLATE 02 / 07",
      medium: "eSIM DIE · CRYPTOGRAPHIC POLICY GATE",
      title: "SecureSIM",
      desc: "Authentication and fine-grained access control for SIM and eSIM.",
      ctaLabel: "Read the MobiCom ’21 paper",
      href: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      external: true,
    },
    gptcodelearner: {
      plate: "PLATE 03 / 07",
      medium: "CODEBASE AST · LLM CALL-GRAPH SPOTLIGHT",
      title: "GPT-Code-Learner",
      desc: "Explore a codebase through questions, context, and GPT.",
      ctaLabel: "Explore on GitHub",
      href: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      external: true,
    },
    sonica: {
      plate: "PLATE 04 / 07",
      medium: "NB-IoT NARROWBAND WATERFALL SPECTROGRAM",
      title: "Sonica",
      desc: "An open NB-IoT network for experiments with real devices.",
      ctaLabel: "Explore on GitHub",
      href: "https://github.com/sonica-nbiot/sonica",
      external: true,
    },
    flora: {
      plate: "PLATE 05 / 07",
      medium: "PROGRAMMABLE 4-LAYER CELLULAR STACK",
      title: "Flora",
      desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
      ctaLabel: "Explore the project",
      href: "https://project-flora.github.io/Flora/",
      external: true,
    },
    lrp: {
      plate: "PLATE 06 / 07",
      medium: "3D VR VIEWPORT · PROACTIVE UPLINK RAIL",
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
  const ctrlPanels = $$("[data-ctrl-for]");
  const openAcemapBtn = $("#open-acemap-plate");
  const projectRows = $$(".project-row");
  const projectTriggers = $$("[data-select-project]");

  // Interactive per-project states
  const seedState = {
    autoCycle: true,
    manualPhase: -1, // -1 = auto, >=0 elapsed seconds since manual trigger
    lastStatus: "",
  };

  const secureSimState = {
    mode: "valid", // "valid" | "unauthorized"
    switchTime: 0,
  };

  const GPT_NODES = [
    { id: "main", label: "entry/main.py", x: 0.16, y: 0.25 },
    { id: "router", label: "router.dispatch()", x: 0.44, y: 0.2 },
    { id: "auth", label: "auth.verify()", x: 0.44, y: 0.5 },
    { id: "context", label: "context.index()", x: 0.18, y: 0.62 },
    { id: "sim", label: "sim_core.handle()", x: 0.78, y: 0.44 },
    { id: "fabric", label: "fabric.send()", x: 0.78, y: 0.2 },
    { id: "explain", label: "explain.llm()", x: 0.52, y: 0.72 },
  ];

  const GPT_EDGES = [
    ["main", "router"],
    ["main", "auth"],
    ["main", "context"],
    ["router", "fabric"],
    ["router", "auth"],
    ["auth", "sim"],
    ["context", "explain"],
    ["auth", "explain"],
    ["sim", "explain"],
  ];

  const GPT_QUERIES = {
    auth: {
      path: ["main", "auth", "sim"],
      status: "Path I → II → III · entry/main.py → auth.verify() → sim_core.handle()",
      notes: [
        "I. Ingress request parsed",
        "II. Certificate & scope validated",
        "III. Scoped SIM handler invoked",
      ],
    },
    routing: {
      path: ["main", "router", "fabric"],
      status: "Path I → II → III · entry/main.py → router.dispatch() → fabric.send()",
      notes: [
        "I. Request enters dispatch loop",
        "II. Target route table resolved",
        "III. Payload forwarded to fabric",
      ],
    },
    entry: {
      path: ["main", "context", "explain"],
      status: "Path I → II → III · entry/main.py → context.index() → explain.llm()",
      notes: [
        "I. Repository root scanned",
        "II. AST symbols & call edges indexed",
        "III. Grounded explanation synthesized",
      ],
    },
  };

  const gptState = {
    query: "auth",
    sweep: 0,
  };

  const sonicaState = {
    band: 1, // 0 = Guard-Band, 1 = Stand-Alone, 2 = In-Band
    burstTimer: 0.8,
    waterfall: [],
    maxRows: 48,
    accum: 0,
  };

  const floraState = {
    hooks: {
      esim: false,
      ran: false,
      core: false,
      edge: true,
    },
    hitBoxes: [],
  };

  const vrState = {
    mode: "proactive", // "standard" | "proactive"
    targetYaw: 0,
    targetPitch: 0,
    displayYaw: 0,
    displayPitch: 0,
    ghostYaw: 0,
    ghostPitch: 0,
  };

  const acemapState = {
    loaded: false,
    loading: false,
    points: [],
    centroids: [],
    selectedField: "all",
    searchQuery: "",
    hoveredIndex: -1,
    selectedIndex: -1,
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
  };

  let activeProject = "seed";
  let stagePtrX = 0.5;
  let stagePtrY = 0.5;
  let stagePtrInside = false;
  let projectCtrl = null;

  /* --- 01. SEED: 5G UE + Chamfered SIM/SEED Chip + 5G Core --- */
  const seedStatusEl = $("#seed-status");

  function drawSeedPlate(ctx, w, h, t, dt) {
    const s = Math.min(w / 820, h / 600);

    // Advance SEED failure-to-recovery timeline (0..10s cycle)
    let phaseT = 0;
    if (seedState.manualPhase >= 0) {
      seedState.manualPhase += dt || 0;
      phaseT = seedState.manualPhase;
      if (phaseT > 8.2) {
        seedState.manualPhase = -1;
      }
    } else if (seedState.autoCycle && motionEnabled) {
      phaseT = (t * 1.15) % 9.2;
    } else {
      phaseT = 3.6; // crisp illustrative diagnostic frame when paused
    }

    // 0..1.8 Healthy | 1.8..3.4 Failure | 3.4..5.6 SIM+Core Diagnosis | 5.6..7.2 Recovery | 7.2.. Restored
    let stage = "healthy";
    if (phaseT >= 1.8 && phaseT < 3.4) stage = "fault";
    else if (phaseT >= 3.4 && phaseT < 5.6) stage = "diagnose";
    else if (phaseT >= 5.6 && phaseT < 7.2) stage = "recover";

    const statusCopy = {
      healthy: "5G Bearer Active · Unbroken connection between 5G UE and 5G Core.",
      fault: "5G FAILURE · Data-plane bearer fractured; UE delivers error report to SIM/SEED.",
      diagnose: "CAUSE INFERENCE · SIM applet scans failure state with out-of-band 5G Core assistance.",
      recover: "RECOVERY ACTION · SIM executes recovery trigger; 5G bearer snaps back online.",
    };
    if (seedStatusEl && seedState.lastStatus !== stage) {
      seedState.lastStatus = stage;
      seedStatusEl.textContent = statusCopy[stage];
    }

    const ueX = w * 0.17;
    const ueY = h * 0.34;
    const coreX = w * 0.83;
    const coreY = h * 0.34;
    const simX = w * 0.5;
    const simY = h * 0.72;

    // Top 5G Bearer Link (UE <-> 5G Core)
    const linkY = ueY;
    const x1 = ueX + 44 * s;
    const x2 = coreX - 58 * s;

    if (stage === "healthy" || stage === "recover") {
      const recoverP = stage === "recover" ? clamp((phaseT - 5.6) / 1.4, 0, 1) : 1;
      ctx.beginPath();
      ctx.moveTo(x1, linkY);
      ctx.lineTo(lerp(x1, x2, recoverP), linkY);
      ctx.strokeStyle = stage === "recover" ? "#ffffff" : "rgba(246, 245, 240, 0.65)";
      ctx.lineWidth = stage === "recover" ? 2.2 : 1.35;
      ctx.stroke();

      // Clean silver packets along healthy 5G link
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.55 + i * 0.25) % 1;
        if (p <= recoverP) {
          drawGlowingPulse(ctx, lerp(x1, x2, p), linkY, 2.3 * s, 0.88);
        }
      }
      drawBadge(
        ctx,
        stage === "recover" ? "5G LINK RESTORED" : "5G BEARER ACTIVE",
        w * 0.5,
        linkY - 26 * s,
        stage === "recover",
        Math.max(8.5, Math.round(9.5 * s))
      );
    } else {
      // Fractured broken bearer beam with jagged static gap
      const mid = (x1 + x2) / 2;
      const gap = 46 * s;
      ctx.beginPath();
      ctx.moveTo(x1, linkY);
      ctx.lineTo(mid - gap, linkY);
      ctx.moveTo(mid + gap, linkY);
      ctx.lineTo(x2, linkY);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.25)";
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Fracture cross-sparks
      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mid - 11 * s, linkY - 11 * s);
      ctx.lineTo(mid + 11 * s, linkY + 11 * s);
      ctx.moveTo(mid + 11 * s, linkY - 11 * s);
      ctx.lineTo(mid - 11 * s, linkY + 11 * s);
      ctx.stroke();

      drawBadge(
        ctx,
        stage === "fault" ? "5G BEARER FAULT" : "OUT-OF-BAND SIM DIAGNOSIS",
        w * 0.5,
        linkY - 28 * s,
        stage === "fault",
        Math.max(8.5, Math.round(9.5 * s))
      );
    }

    // Secondary diagnostic & recovery conduits (UE <-> SIM <-> 5G Core)
    // UE -> SIM path
    ctx.beginPath();
    ctx.moveTo(ueX, ueY + 62 * s);
    ctx.quadraticCurveTo(ueX, simY, simX - 58 * s, simY);
    ctx.strokeStyle =
      stage === "fault" || stage === "recover"
        ? "rgba(255, 255, 255, 0.72)"
        : "rgba(246, 245, 240, 0.16)";
    ctx.lineWidth = stage === "fault" || stage === "recover" ? 1.5 : 0.85;
    ctx.stroke();

    // SIM -> 5G Core path
    ctx.beginPath();
    ctx.moveTo(simX + 58 * s, simY);
    ctx.quadraticCurveTo(coreX, simY, coreX, coreY + 56 * s);
    ctx.strokeStyle =
      stage === "diagnose"
        ? "rgba(255, 255, 255, 0.78)"
        : "rgba(246, 245, 240, 0.16)";
    ctx.lineWidth = stage === "diagnose" ? 1.5 : 0.85;
    ctx.stroke();

    // Animated pulses on UE <-> SIM and SIM <-> Core curves
    const quadPt = (p0x, p0y, cpx, cpy, p1x, p1y, u) => ({
      x: (1 - u) * (1 - u) * p0x + 2 * (1 - u) * u * cpx + u * u * p1x,
      y: (1 - u) * (1 - u) * p0y + 2 * (1 - u) * u * cpy + u * u * p1y,
    });

    if (stage === "fault") {
      const u = clamp((phaseT - 1.8) / 1.4, 0, 1);
      const pt = quadPt(ueX, ueY + 62 * s, ueX, simY, simX - 58 * s, simY, u);
      drawGlowingPulse(ctx, pt.x, pt.y, 3.2 * s, 0.95);
      drawBadge(ctx, "ERROR REPORT", ueX + 78 * s, simY - 26 * s, false, Math.max(8, Math.round(9 * s)));
    } else if (stage === "diagnose") {
      const u = (t * 0.9) % 1;
      const pt1 = quadPt(simX + 58 * s, simY, coreX, simY, coreX, coreY + 56 * s, u);
      const pt2 = quadPt(coreX, coreY + 56 * s, coreX, simY, simX + 58 * s, simY, (u + 0.5) % 1);
      drawGlowingPulse(ctx, pt1.x, pt1.y, 2.8 * s, 0.92);
      drawGlowingPulse(ctx, pt2.x, pt2.y, 2.5 * s, 0.8);
      drawBadge(ctx, "CAUSE INFERENCE", coreX - 78 * s, simY - 26 * s, false, Math.max(8, Math.round(9 * s)));
    } else if (stage === "recover") {
      const u = clamp((phaseT - 5.6) / 1.2, 0, 1);
      const pt = quadPt(simX - 58 * s, simY, ueX, simY, ueX, ueY + 62 * s, u);
      drawGlowingPulse(ctx, pt.x, pt.y, 3.5 * s, 1);
      drawBadge(ctx, "RECOVERY ACTION", ueX + 82 * s, simY - 26 * s, true, Math.max(8, Math.round(9 * s)));
    }

    // 1. Engraved 5G UE / Handset Silhouette (Left)
    const phoneW = 68 * s;
    const phoneH = 114 * s;
    ctx.fillStyle = "#101014";
    ctx.strokeStyle = stage === "fault" ? "#ffffff" : "rgba(246, 245, 240, 0.56)";
    ctx.lineWidth = 1.2;
    ctx.fillRect(ueX - phoneW / 2, ueY - phoneH / 2, phoneW, phoneH);
    ctx.strokeRect(ueX - phoneW / 2, ueY - phoneH / 2, phoneW, phoneH);
    // Inner screen bezel
    ctx.strokeStyle = "rgba(246, 245, 240, 0.24)";
    ctx.strokeRect(ueX - phoneW * 0.38, ueY - phoneH * 0.36, phoneW * 0.76, phoneH * 0.7);
    // Status glyph on phone screen
    ctx.font = `500 ${Math.max(10, Math.round(13 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "#f6f5f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stage === "fault" ? "!" : "5G", ueX, ueY - 2 * s);
    ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246, 245, 240, 0.72)";
    ctx.fillText("5G UE / HANDSET", ueX, ueY - phoneH / 2 - 16 * s);

    // 2. Engraved Chamfered SIM / SEED Chip Silhouette (Center-Bottom)
    const cw = 104 * s;
    const ch = 122 * s;
    const cut = 24 * s;
    const sx0 = simX - cw / 2;
    const sy0 = simY - ch / 2;
    const simLit = stage === "diagnose" || stage === "recover";

    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx0 + cw - cut, sy0);
    ctx.lineTo(sx0 + cw, sy0 + cut);
    ctx.lineTo(sx0 + cw, sy0 + ch);
    ctx.lineTo(sx0, sy0 + ch);
    ctx.closePath();
    ctx.fillStyle = simLit ? "rgba(246, 245, 240, 0.14)" : "#111115";
    ctx.fill();
    ctx.strokeStyle = simLit ? "#ffffff" : "rgba(246, 245, 240, 0.56)";
    ctx.lineWidth = simLit ? 1.5 : 1.1;
    ctx.stroke();

    // Six recognizable metallic SIM contact pads
    const padW = cw * 0.62;
    const padH = ch * 0.46;
    const px0 = simX - padW / 2;
    const py0 = simY - padH / 2 + 6 * s;
    ctx.strokeStyle = simLit ? "rgba(255,255,255,0.75)" : "rgba(246,245,240,0.34)";
    ctx.lineWidth = 0.9;
    ctx.strokeRect(px0, py0, padW, padH);
    ctx.beginPath();
    ctx.moveTo(px0 + padW / 3, py0);
    ctx.lineTo(px0 + padW / 3, py0 + padH);
    ctx.moveTo(px0 + (2 * padW) / 3, py0);
    ctx.lineTo(px0 + (2 * padW) / 3, py0 + padH);
    ctx.moveTo(px0, py0 + padH / 2);
    ctx.lineTo(px0 + padW, py0 + padH / 2);
    ctx.stroke();

    // Rotating silver aperture diagnostic scan ring around SIM chip during diagnosis
    if (stage === "diagnose") {
      ctx.save();
      ctx.translate(simX, simY + 4 * s);
      ctx.rotate(t * 2.2);
      ctx.beginPath();
      ctx.arc(0, 0, 74 * s, 0, Math.PI * 1.35);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "#f6f5f0";
    ctx.textAlign = "center";
    ctx.fillText("SIM / SEED APPLET", simX, sy0 + ch + 18 * s);

    // 3. Engraved 5G Core Vertical Rack Silhouette (Right)
    const rkW = 104 * s;
    const rkUnitH = 26 * s;
    const rkGap = 9 * s;
    const rkStartY = coreY - (rkUnitH * 3 + rkGap * 2) / 2;
    for (let u = 0; u < 3; u++) {
      const uy = rkStartY + u * (rkUnitH + rkGap);
      ctx.fillStyle = stage === "diagnose" ? "rgba(246,245,240,0.1)" : "#101014";
      ctx.fillRect(coreX - rkW / 2, uy, rkW, rkUnitH);
      ctx.strokeStyle =
        stage === "diagnose" ? "rgba(255,255,255,0.75)" : "rgba(246,245,240,0.52)";
      ctx.lineWidth = 1;
      ctx.strokeRect(coreX - rkW / 2, uy, rkW, rkUnitH);

      // Rack indicator dot + vent line
      ctx.fillStyle = "#f6f5f0";
      ctx.beginPath();
      ctx.arc(coreX - rkW / 2 + 14 * s, uy + rkUnitH / 2, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(coreX - 4 * s, uy + rkUnitH / 2);
      ctx.lineTo(coreX + rkW / 2 - 12 * s, uy + rkUnitH / 2);
      ctx.strokeStyle = "rgba(246,245,240,0.3)";
      ctx.stroke();
    }
    ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246, 245, 240, 0.72)";
    ctx.fillText("5G CORE", coreX, rkStartY - 16 * s);
  }

  /* --- 02. SecureSIM: eSIM Contact Die + Silver Iris Cryptographic Policy Gate --- */
  function drawSecureSimPlate(ctx, w, h, t) {
    const s = Math.min(w / 820, h / 600);
    const isValid = secureSimState.mode === "valid";

    const reqX = w * 0.14;
    const gateX = w * 0.45;
    const dieX = w * 0.78;
    const cy = h * 0.5;

    // 1. Incoming App Request Node (Left)
    const reqW = 128 * s;
    const reqH = 92 * s;
    ctx.fillStyle = "#101014";
    ctx.fillRect(reqX - reqW / 2, cy - reqH / 2, reqW, reqH);
    ctx.strokeStyle = isValid ? "rgba(255,255,255,0.68)" : "rgba(246,245,240,0.34)";
    ctx.lineWidth = 1.1;
    ctx.strokeRect(reqX - reqW / 2, cy - reqH / 2, reqW, reqH);

    ctx.font = `500 ${Math.max(8.5, Math.round(9.8 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "#f6f5f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isValid ? "SIGNED APP" : "UNSIGNED APP", reqX, cy - 14 * s);
    ctx.fillStyle = "rgba(246,245,240,0.65)";
    ctx.font = `500 ${Math.max(7.8, Math.round(8.6 * s))}px "DM Sans", sans-serif`;
    ctx.fillText(isValid ? "CERT: VALID" : "NO VALID CERT", reqX, cy + 6 * s);
    ctx.fillText(isValid ? "SCOPE: TELECOM" : "EXCESS SCOPE", reqX, cy + 22 * s);

    // 2. Request Beam into Policy Gate
    const gateR = 78 * s;
    const beamStartX = reqX + reqW / 2;
    const beamGateX = gateX - gateR;

    ctx.beginPath();
    ctx.moveTo(beamStartX, cy);
    ctx.lineTo(beamGateX, cy);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.5)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const pIn = (t * 0.65) % 1;
    drawGlowingPulse(ctx, lerp(beamStartX, beamGateX, pIn), cy, 2.6 * s, 0.9);

    // 3. Rotating Silver Iris Cryptographic Policy Gate (Center)
    const aperture = isValid
      ? 0.44 + Math.sin(t * 1.4) * 0.04
      : 0.05;
    const blades = 12;

    // Vernier cryptographic ticks around gate
    ctx.save();
    ctx.translate(gateX, cy);
    ctx.rotate(isValid ? t * 0.14 : -t * 0.03);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const len = i % 4 === 0 ? 10 * s : 4 * s;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (gateR + 4 * s), Math.sin(a) * (gateR + 4 * s));
      ctx.lineTo(Math.cos(a) * (gateR + 4 * s + len), Math.sin(a) * (gateR + 4 * s + len));
      ctx.strokeStyle = i % 4 === 0 ? "rgba(246,245,240,0.48)" : "rgba(246,245,240,0.16)";
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }
    ctx.restore();

    // Inner iris core glow
    if (isValid) {
      const g = ctx.createRadialGradient(gateX, cy, 2, gateX, cy, gateR * 0.7);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.45, "rgba(246,245,240,0.18)");
      g.addColorStop(1, "rgba(6,6,8,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gateX, cy, gateR * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Iris blades
    ctx.save();
    ctx.translate(gateX, cy);
    ctx.beginPath();
    ctx.arc(0, 0, gateR, 0, Math.PI * 2);
    ctx.clip();

    const innerR = gateR * aperture;
    const twist = isValid ? t * 0.25 : 0.4;
    for (let b = 0; b < blades; b++) {
      const a0 = twist + (b / blades) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / blades + 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      ctx.lineTo(Math.cos(a0 + 1.05) * gateR * 1.2, Math.sin(a0 + 1.05) * gateR * 1.2);
      ctx.lineTo(Math.cos(a1 + 0.55) * gateR * 1.2, Math.sin(a1 + 0.55) * gateR * 1.2);
      ctx.closePath();
      const shade = isValid ? 16 + (b % 3) * 6 : 24 + (b % 2) * 8;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade + 3}, 0.92)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(246, 245, 240, 0.38)";
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(gateX, cy, gateR, 0, Math.PI * 2);
    ctx.strokeStyle = isValid ? "#ffffff" : "rgba(246,245,240,0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246,245,240,0.72)";
    ctx.textAlign = "center";
    ctx.fillText("POLICY GATE", gateX, cy + gateR + 28 * s);

    // 4. Outcome Beam: ALLOWED into ONLY scoped TELECOM partition OR DENIED deflection
    const dieW = 166 * s;
    const dieH = 250 * s;
    const dieLeft = dieX - dieW / 2;
    const dieTop = cy - dieH / 2;

    if (isValid) {
      ctx.beginPath();
      ctx.moveTo(gateX + gateR, cy);
      ctx.lineTo(dieLeft, cy);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      const pOut = (t * 0.65 + 0.5) % 1;
      drawGlowingPulse(ctx, lerp(gateX + gateR, dieLeft, pOut), cy, 2.8 * s, 0.96);
      drawBadge(ctx, "ALLOWED · SCOPED", gateX, cy - gateR - 30 * s, true, Math.max(8.5, Math.round(9.5 * s)));
    } else {
      // Deflection barrier waves bouncing off closed iris
      const impact = (t * 1.1) % 1;
      ctx.beginPath();
      ctx.arc(beamGateX, cy, 8 * s + impact * 34 * s, Math.PI * 0.65, Math.PI * 1.35);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - impact) * 0.72})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Deflected stray rays
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "rgba(246,245,240,0.45)";
      ctx.beginPath();
      ctx.moveTo(beamGateX, cy);
      ctx.lineTo(beamGateX - 58 * s, cy - 72 * s);
      ctx.moveTo(beamGateX, cy);
      ctx.lineTo(beamGateX - 58 * s, cy + 72 * s);
      ctx.stroke();
      ctx.restore();

      drawBadge(ctx, "DENIED · BARRIER", gateX, cy - gateR - 30 * s, false, Math.max(8.5, Math.round(9.5 * s)));
    }

    // 5. Engraved Chamfered eSIM Contact Die with 3 Fine-Grained Service Partitions (Right)
    const cut = 26 * s;
    ctx.beginPath();
    ctx.moveTo(dieLeft, dieTop);
    ctx.lineTo(dieLeft + dieW - cut, dieTop);
    ctx.lineTo(dieLeft + dieW, dieTop + cut);
    ctx.lineTo(dieLeft + dieW, dieTop + dieH);
    ctx.lineTo(dieLeft, dieTop + dieH);
    ctx.closePath();
    ctx.fillStyle = "#0e0e12";
    ctx.fill();
    ctx.strokeStyle = "rgba(246, 245, 240, 0.56)";
    ctx.lineWidth = 1.15;
    ctx.stroke();

    const partitions = [
      { label: "AUTH KEYS", state: "LOCKED", unlocked: false },
      { label: "TELECOM API", state: isValid ? "UNLOCKED" : "LOCKED", unlocked: isValid },
      { label: "PROVISIONING", state: "LOCKED", unlocked: false },
    ];
    const partPad = 14 * s;
    const partGap = 10 * s;
    const partH = (dieH - partPad * 2 - partGap * 2 - 16 * s) / 3;

    partitions.forEach((part, idx) => {
      const py = dieTop + partPad + 12 * s + idx * (partH + partGap);
      const px = dieLeft + partPad;
      const pw = dieW - partPad * 2;

      ctx.fillStyle = part.unlocked
        ? "rgba(246, 245, 240, 0.16)"
        : "rgba(255, 255, 255, 0.025)";
      ctx.fillRect(px, py, pw, partH);
      ctx.strokeStyle = part.unlocked
        ? "#ffffff"
        : "rgba(246, 245, 240, 0.22)";
      ctx.lineWidth = part.unlocked ? 1.3 : 0.85;
      ctx.strokeRect(px, py, pw, partH);

      ctx.font = `500 ${Math.max(8, Math.round(9.2 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = part.unlocked ? "#ffffff" : "rgba(246,245,240,0.65)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(part.label, px + pw / 2, py + partH * 0.38);

      ctx.font = `500 ${Math.max(7.5, Math.round(8.2 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = part.unlocked ? "#f6f5f0" : "rgba(246,245,240,0.4)";
      ctx.fillText(part.state, px + pw / 2, py + partH * 0.72);
    });

    ctx.font = `500 ${Math.max(8.5, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246,245,240,0.72)";
    ctx.textAlign = "center";
    ctx.fillText("eSIM / SIM PARTITIONS", dieX, dieTop + dieH + 20 * s);
  }

  /* --- 03. GPT-Code-Learner: Codebase AST / Call-Graph Spotlight --- */
  function drawGptPlate(ctx, w, h, t, dt) {
    const s = Math.min(w / 820, h / 600);
    const active = GPT_QUERIES[gptState.query] || GPT_QUERIES.auth;
    gptState.sweep = Math.min(1, gptState.sweep + (dt || 0.016) * 0.75);

    const posMap = {};
    GPT_NODES.forEach((n) => {
      posMap[n.id] = {
        ...n,
        px: n.x * w,
        py: n.y * (h * 0.84) + h * 0.04,
      };
    });

    // Cinematic vertical silver spotlight sweep across the codebase AST
    const spotX = lerp(w * 0.06, w * 0.94, gptState.sweep < 1 ? gptState.sweep : (Math.sin(t * 0.45) * 0.5 + 0.5));
    const spot = ctx.createLinearGradient(spotX - 120 * s, 0, spotX + 120 * s, 0);
    spot.addColorStop(0, "rgba(246,245,240,0)");
    spot.addColorStop(0.5, "rgba(246,245,240,0.065)");
    spot.addColorStop(1, "rgba(246,245,240,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h * 0.82);

    // Draw all call-graph edges first
    const pathPairs = [
      `${active.path[0]}->${active.path[1]}`,
      `${active.path[1]}->${active.path[2]}`,
    ];

    GPT_EDGES.forEach(([aId, bId]) => {
      const a = posMap[aId];
      const b = posMap[bId];
      const isLit =
        pathPairs.includes(`${aId}->${bId}`) || pathPairs.includes(`${bId}->${aId}`);

      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.strokeStyle = isLit
        ? "rgba(255, 255, 255, 0.78)"
        : "rgba(246, 245, 240, 0.14)";
      ctx.lineWidth = isLit ? 1.65 : 0.85;
      ctx.stroke();

      if (isLit) {
        const segIdx = pathPairs[0].includes(aId) && pathPairs[0].includes(bId) ? 0 : 1;
        const p = (t * 0.65 + segIdx * 0.5) % 1;
        const from = segIdx === 0 ? posMap[active.path[0]] : posMap[active.path[1]];
        const to = segIdx === 0 ? posMap[active.path[1]] : posMap[active.path[2]];
        drawGlowingPulse(ctx, lerp(from.px, to.px, p), lerp(from.py, to.py, p), 2.8 * s, 0.95);
      }
    });

    // Draw legible monospace module/function nodes
    const romans = ["I", "II", "III"];
    GPT_NODES.forEach((n) => {
      const p = posMap[n.id];
      const stepIdx = active.path.indexOf(n.id);
      const isLit = stepIdx >= 0;

      ctx.font = `500 ${Math.max(9.5, Math.round(11.5 * s))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const tw = ctx.measureText(n.label).width;
      const bw = tw + 26 * s;
      const bh = 36 * s;

      ctx.fillStyle = isLit ? "rgba(246, 245, 240, 0.14)" : "#0d0d11";
      ctx.fillRect(p.px - bw / 2, p.py - bh / 2, bw, bh);
      ctx.strokeStyle = isLit ? "#ffffff" : "rgba(246, 245, 240, 0.24)";
      ctx.lineWidth = isLit ? 1.35 : 0.85;
      ctx.strokeRect(p.px - bw / 2, p.py - bh / 2, bw, bh);

      ctx.fillStyle = isLit ? "#ffffff" : "rgba(246, 245, 240, 0.45)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, p.px, p.py);

      // Roman numeral step medallion (I, II, III)
      if (isLit) {
        const mx = p.px - bw / 2;
        const my = p.py - bh / 2;
        ctx.beginPath();
        ctx.arc(mx, my, 12 * s, 0, Math.PI * 2);
        ctx.fillStyle = "#f6f5f0";
        ctx.fill();
        ctx.font = `italic 600 ${Math.max(9, Math.round(11 * s))}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = "#09090b";
        ctx.fillText(romans[stepIdx], mx, my + 0.5);
      }
    });

    // Editorial Inline Flow Annotations Strip at Bottom
    const stripY = h * 0.8;
    const stripH = h * 0.16;
    const padX = 24 * s;
    ctx.fillStyle = "rgba(14, 14, 18, 0.94)";
    ctx.fillRect(padX, stripY, w - padX * 2, stripH);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.28)";
    ctx.lineWidth = 0.9;
    ctx.strokeRect(padX, stripY, w - padX * 2, stripH);

    const colW = (w - padX * 2) / 3;
    active.notes.forEach((note, idx) => {
      const cx = padX + colW * idx + colW / 2;
      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(padX + colW * idx, stripY + 10 * s);
        ctx.lineTo(padX + colW * idx, stripY + stripH - 10 * s);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.14)";
        ctx.stroke();
      }
      ctx.font = `500 ${Math.max(8.5, Math.round(10 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = "#f6f5f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(note, cx, stripY + stripH / 2);
    });
  }

  /* --- 04. Sonica: NB-IoT Narrowband Waterfall Spectrogram & Subcarrier Lanes --- */
  function drawSonicaPlate(ctx, w, h, t, dt) {
    const s = Math.min(w / 820, h / 600);
    const padX = 28 * s;
    const specW = w - padX * 2;
    const bandNames = ["GUARD-BAND", "STAND-ALONE", "IN-BAND"];
    const bandCenters = [0.22, 0.5, 0.78];
    const centerU = bandCenters[sonicaState.band];

    sonicaState.burstTimer = Math.max(0, sonicaState.burstTimer - (dt || 0.016));
    // Periodic natural IoT sensor burst
    if (motionEnabled && Math.sin(t * 1.45) > 0.96 && sonicaState.burstTimer <= 0.05) {
      sonicaState.burstTimer = 0.85;
    }

    // Push a new silver-halide spectrogram row periodically
    sonicaState.accum += dt || 0.016;
    if (sonicaState.waterfall.length === 0 || sonicaState.accum >= 0.055) {
      sonicaState.accum = 0;
      const bins = 48;
      const row = new Float32Array(bins);
      const centerBin = Math.floor(centerU * bins);
      for (let b = 0; b < bins; b++) {
        // Subtle RF noise floor
        const noise = 0.04 + (Math.sin(b * 12.7 + t * 9.3) * 0.5 + 0.5) * 0.06;
        const dist = Math.abs(b - centerBin);
        let sig = noise;
        // Narrowband sync + control + uplink subcarrier structure inside active NB-IoT block
        if (dist <= 5) {
          const isSync = b === centerBin - 4;
          const isCtrl = b === centerBin - 1 || b === centerBin;
          const isUplink = b >= centerBin + 2 && b <= centerBin + 4;
          if (isSync) sig += 0.42 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.25;
          if (isCtrl) sig += 0.28 + (Math.cos(t * 5.2 + b) * 0.5 + 0.5) * 0.22;
          if (isUplink) sig += 0.18 + sonicaState.burstTimer * 0.78;
        }
        row[b] = clamp(sig, 0, 1);
      }
      sonicaState.waterfall.unshift(row);
      if (sonicaState.waterfall.length > sonicaState.maxRows) {
        sonicaState.waterfall.pop();
      }
    }

    // Top Register: IoT Sensor Emitter + Live Decoded Symbol Header
    const topY = 44 * s;
    const sensorActive = sonicaState.burstTimer > 0.15;
    drawBadge(
      ctx,
      sensorActive ? "IOT SENSOR · TX BURST" : "IOT SENSOR · STANDBY",
      padX + 104 * s,
      topY,
      sensorActive,
      Math.max(8.5, Math.round(9.5 * s))
    );

    drawBadge(
      ctx,
      `MODE: ${bandNames[sonicaState.band]}`,
      w - padX - 96 * s,
      topY,
      false,
      Math.max(8.5, Math.round(9.5 * s))
    );

    // Live RF Signal Envelope (middle-top oscilloscope strip)
    const envY = 90 * s;
    const envH = 88 * s;
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.fillRect(padX, envY, specW, envH);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.2)";
    ctx.lineWidth = 0.9;
    ctx.strokeRect(padX, envY, specW, envH);

    // Highlight active narrowband frequency window
    const winW = specW * 0.24;
    const winX = padX + centerU * specW - winW / 2;
    ctx.fillStyle = "rgba(246, 245, 240, 0.08)";
    ctx.fillRect(winX, envY, winW, envH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.strokeRect(winX, envY, winW, envH);

    // Spectrum envelope curve
    const latest = sonicaState.waterfall[0];
    if (latest) {
      ctx.beginPath();
      for (let b = 0; b < latest.length; b++) {
        const bx = padX + ((b + 0.5) / latest.length) * specW;
        const by = envY + envH - 8 * s - latest[b] * (envH - 22 * s);
        if (b === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Subcarrier Channel Lane Labels directly over the active NB-IoT block
    const laneY = envY + envH + 22 * s;
    ctx.font = `500 ${Math.max(8, Math.round(9 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246, 245, 240, 0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SYNC", winX + winW * 0.16, laneY);
    ctx.fillText("CONTROL CH", winX + winW * 0.5, laneY);
    ctx.fillText("UPLINK", winX + winW * 0.84, laneY);

    // Main Silver-Halide Scrolling Waterfall Spectrogram
    const wfY = laneY + 18 * s;
    const wfH = h - wfY - 52 * s;
    ctx.fillStyle = "#040406";
    ctx.fillRect(padX, wfY, specW, wfH);

    const rows = sonicaState.waterfall;
    const rowH = wfH / sonicaState.maxRows;
    for (let r = 0; r < rows.length; r++) {
      const data = rows[r];
      const cellW = specW / data.length;
      const ry = wfY + r * rowH;
      for (let b = 0; b < data.length; b++) {
        const v = data[b];
        if (v < 0.09) continue;
        const lum = Math.round(clamp(v * 255, 20, 255));
        ctx.fillStyle = `rgba(${lum}, ${lum}, ${Math.min(255, lum + 4)}, ${(0.22 + v * 0.78).toFixed(2)})`;
        ctx.fillRect(padX + b * cellW, ry, Math.ceil(cellW), Math.ceil(rowH) + 0.5);
      }
    }

    // Subcarrier guide lines over waterfall
    ctx.strokeStyle = "rgba(246, 245, 240, 0.28)";
    ctx.lineWidth = 0.85;
    ctx.strokeRect(padX, wfY, specW, wfH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.strokeRect(winX, wfY, winW, wfH);

    // Bottom Decoded Symbol Ribbon
    const symY = wfY + wfH + 24 * s;
    const symbols = sensorActive
      ? "[NPSS SYNC]  ·  [NPDCCH CTRL]  ·  [NPUSCH SENSOR FRAME DECODED]"
      : "[NPSS SYNC]  ·  [NPDCCH CTRL]  ·  [LISTENING FOR UPLINK BURST]";
    ctx.font = `500 ${Math.max(8.5, Math.round(9.8 * s))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = sensorActive ? "#ffffff" : "rgba(246, 245, 240, 0.62)";
    ctx.textAlign = "center";
    ctx.fillText(symbols, w * 0.5, symY);
  }

  /* --- 05. Flora: 4-Layer Programmable Cellular Stack (eSIM -> RAN -> 5G Core -> Edge VR) --- */
  function drawFloraPlate(ctx, w, h, t) {
    const s = Math.min(w / 820, h / 600);
    const cx = w * 0.45;
    const tiltX = (stagePtrX - 0.5) * 26 * s;

    const layers = [
      {
        key: "edge",
        num: "04",
        name: "EDGE VR",
        y: h * 0.2,
        rule: floraState.hooks.edge ? "EDGE OFFLOAD: ON" : "CLOUD FALLBACK",
      },
      {
        key: "core",
        num: "03",
        name: "5G CORE",
        y: h * 0.41,
        rule: floraState.hooks.core ? "LOCAL BREAKOUT" : "STANDARD ROUTE",
      },
      {
        key: "ran",
        num: "02",
        name: "RAN",
        y: h * 0.62,
        rule: floraState.hooks.ran ? "LOW-LATENCY SLICE" : "SHARED SPECTRUM",
      },
      {
        key: "esim",
        num: "01",
        name: "eSIM",
        y: h * 0.82,
        rule: floraState.hooks.esim ? "PROFILE B (PRIVATE)" : "PROFILE A (DEFAULT)",
      },
    ];

    floraState.hitBoxes = [];

    // Vertical end-to-end traffic lanes altered visibly by programmable hooks
    const laneShift = (floraState.hooks.esim ? 36 : -36) * s;
    const coreShift = (floraState.hooks.core ? 56 : -14) * s;
    const edgeShift = (floraState.hooks.edge ? 0 : -72) * s;

    const pts = [
      { x: cx + laneShift, y: layers[3].y }, // eSIM
      { x: cx + (floraState.hooks.ran ? 28 * s : laneShift * 0.5), y: layers[2].y }, // RAN
      { x: cx + coreShift, y: layers[1].y }, // 5G Core
      { x: cx + edgeShift, y: layers[0].y }, // Edge VR
    ];

    // Radio arcs between eSIM (3) and RAN (2)
    for (let r = 1; r <= 3; r++) {
      const waveY = lerp(pts[0].y, pts[1].y, 0.5);
      const rad = (14 + r * 11 + ((t * 18) % 12)) * s;
      ctx.beginPath();
      ctx.arc(lerp(pts[0].x, pts[1].x, 0.5), waveY + 14 * s, rad, Math.PI * 1.18, Math.PI * 1.82);
      ctx.strokeStyle = floraState.hooks.ran
        ? "rgba(255, 255, 255, 0.42)"
        : "rgba(246, 245, 240, 0.2)";
      ctx.lineWidth = floraState.hooks.ran ? 1.2 : 0.8;
      ctx.stroke();
    }

    // Draw slabs bottom-to-top
    const hw = 185 * s;
    const hd = 42 * s;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const active = floraState.hooks[layer.key];
      const depth = (1.5 - i) / 1.5;
      const lx = cx + tiltX * depth * 0.55;
      const ly = layer.y;

      floraState.hitBoxes.push({
        key: layer.key,
        x0: lx - hw,
        x1: lx + hw + 170 * s,
        y0: ly - hd,
        y1: ly + hd,
      });

      ctx.beginPath();
      ctx.moveTo(lx, ly - hd);
      ctx.lineTo(lx + hw, ly);
      ctx.lineTo(lx, ly + hd);
      ctx.lineTo(lx - hw, ly);
      ctx.closePath();
      ctx.fillStyle = active
        ? "rgba(246, 245, 240, 0.14)"
        : "rgba(246, 245, 240, 0.045)";
      ctx.fill();
      ctx.strokeStyle = active ? "#ffffff" : "rgba(246, 245, 240, 0.36)";
      ctx.lineWidth = active ? 1.45 : 0.95;
      ctx.stroke();

      // Etched inner plane contour
      ctx.beginPath();
      ctx.moveTo(lx, ly - hd * 0.55);
      ctx.lineTo(lx + hw * 0.55, ly);
      ctx.lineTo(lx, ly + hd * 0.55);
      ctx.lineTo(lx - hw * 0.55, ly);
      ctx.closePath();
      ctx.strokeStyle = active
        ? "rgba(255, 255, 255, 0.32)"
        : "rgba(246, 245, 240, 0.12)";
      ctx.stroke();

      // Right architectural callout leader + label + live rule
      const labelX = lx + hw + 18 * s;
      ctx.beginPath();
      ctx.moveTo(lx + hw, ly);
      ctx.lineTo(labelX - 6 * s, ly);
      ctx.strokeStyle = active ? "rgba(255,255,255,0.65)" : "rgba(246,245,240,0.25)";
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${Math.max(9.5, Math.round(11.5 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = active ? "#ffffff" : "rgba(246, 245, 240, 0.82)";
      ctx.fillText(`${layer.num} · ${layer.name}`, labelX, ly - 8 * s);

      ctx.font = `500 ${Math.max(7.8, Math.round(8.8 * s))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = active ? "#f6f5f0" : "rgba(246, 245, 240, 0.48)";
      ctx.fillText(layer.rule, labelX, ly + 10 * s);
    }

    // End-to-end programmable packet path connecting all 4 layers
    ctx.beginPath();
    pts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Bidirectional packets flowing end-to-end across the 4-layer stack
    const segCount = pts.length - 1;
    for (let pkt = 0; pkt < 6; pkt++) {
      const up = pkt % 2 === 0;
      const raw = (t * (floraState.hooks.ran ? 0.42 : 0.28) + pkt / 6) % 1;
      const u = up ? raw : 1 - raw;
      const scaled = u * segCount;
      const seg = Math.min(segCount - 1, Math.floor(scaled));
      const local = scaled - seg;
      const px = lerp(pts[seg].x, pts[seg + 1].x, local);
      const py = lerp(pts[seg].y, pts[seg + 1].y, local);
      drawGlowingPulse(ctx, px, py, up ? 2.6 * s : 2.1 * s, up ? 0.95 : 0.72);
    }
  }

  /* --- 06. Mobile VR Latency: 3D Monochrome VR Viewport + Wireless Round-Trip Rail --- */
  function drawVrPlate(ctx, w, h, t, dt) {
    const s = Math.min(w / 820, h / 600);
    const isProactive = vrState.mode === "proactive";

    // Target head pose driven by pointer inside canvas or smooth sinusoidal turn
    if (stagePtrInside) {
      vrState.targetYaw = (stagePtrX - 0.5) * 1.45;
      vrState.targetPitch = (stagePtrY - 0.5) * 0.85;
    } else if (motionEnabled) {
      vrState.targetYaw = Math.sin(t * 1.25) * 0.72;
      vrState.targetPitch = Math.cos(t * 0.82) * 0.28;
    }

    const followRate = dt ? Math.min(1, dt * (isProactive ? 16 : 2.4)) : 0.2;
    vrState.displayYaw = lerp(vrState.displayYaw, vrState.targetYaw, followRate);
    vrState.displayPitch = lerp(vrState.displayPitch, vrState.targetPitch, followRate);

    const ghostRate = dt ? Math.min(1, dt * (isProactive ? 14 : 1.55)) : 0.12;
    vrState.ghostYaw = lerp(vrState.ghostYaw, vrState.targetYaw, ghostRate);
    vrState.ghostPitch = lerp(vrState.ghostPitch, vrState.targetPitch, ghostRate);

    // Top 56%: Monochrome 3D VR Viewport Frame
    const vpX = 28 * s;
    const vpY = 26 * s;
    const vpW = w - vpX * 2;
    const vpH = h * 0.52;
    const vcx = vpX + vpW / 2;
    const vcy = vpY + vpH / 2;

    ctx.fillStyle = "#09090d";
    ctx.fillRect(vpX, vpY, vpW, vpH);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    // Helper: project and draw 3D wireframe scene at a given (yaw, pitch)
    const cubeVerts = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    function drawWireCube(yaw, pitch, strokeColor, lineWidth, dashed) {
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const size = Math.min(vpW, vpH) * 0.26;
      const proj = cubeVerts.map(([vx, vy, vz]) => {
        const x1 = vx * cyw - vz * syw;
        const z1 = vx * syw + vz * cyw;
        const y2 = vy * cp - z1 * sp;
        const z2 = vy * sp + z1 * cp + 4.2;
        const persp = 3.1 / z2;
        return [vcx + x1 * size * persp, vcy + y2 * size * persp];
      });
      ctx.save();
      if (dashed) ctx.setLineDash([4, 4]);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      cubeEdges.forEach(([a, b]) => {
        ctx.moveTo(proj[a][0], proj[a][1]);
        ctx.lineTo(proj[b][0], proj[b][1]);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Draw target head-pose ghost/lag comparison
    if (!isProactive) {
      // Double-exposure silver ghost lagging behind live head pose
      drawWireCube(vrState.ghostYaw, vrState.ghostPitch, "rgba(246, 245, 240, 0.28)", 1.1, true);
    }
    // Live rendered viewport wireframe
    drawWireCube(vrState.displayYaw, vrState.displayPitch, "#ffffff", 1.55, false);

    // Head-pose center reticle (always tracks true head pose immediately)
    const retX = vcx + vrState.targetYaw * 64 * s;
    const retY = vcy + vrState.targetPitch * 42 * s;
    ctx.strokeStyle = "rgba(246, 245, 240, 0.72)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(retX, retY, 10 * s, 0, Math.PI * 2);
    ctx.moveTo(retX - 16 * s, retY);
    ctx.lineTo(retX - 12 * s, retY);
    ctx.moveTo(retX + 12 * s, retY);
    ctx.lineTo(retX + 16 * s, retY);
    ctx.stroke();

    // Viewport HUD corner labels
    ctx.font = `500 ${Math.max(8, Math.round(9.5 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246, 245, 240, 0.72)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("3D VR VIEWPORT · MOVE POINTER TO TURN HEAD", vpX + 12 * s, vpY + 10 * s);

    drawBadge(
      ctx,
      isProactive ? "PROACTIVE GRANT · FRAME LOCKED" : "REACTIVE QUEUE · DOUBLE-EXPOSURE LAG",
      vpX + vpW - 148 * s,
      vpY + vpH - 22 * s,
      isProactive,
      Math.max(8, Math.round(9 * s))
    );

    // Bottom 40%: Wireless Round-Trip Rail (Head Pose -> Uplink -> Edge GPU -> Downlink -> Display)
    const railTop = vpY + vpH + 24 * s;
    const stages = ["HEAD POSE", "UPLINK", "EDGE GPU", "DOWNLINK", "DISPLAY"];
    const railStart = vpX + 44 * s;
    const railEnd = vpX + vpW - 44 * s;
    const railW = railEnd - railStart;
    const railY = railTop + 34 * s;

    ctx.beginPath();
    ctx.moveTo(railStart, railY);
    ctx.lineTo(railEnd, railY);
    ctx.strokeStyle = "rgba(246, 245, 240, 0.28)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Packet motion along round-trip rail
    const speed = isProactive ? 0.56 : 0.24;
    for (let i = 0; i < 4; i++) {
      let u = (t * speed + i * 0.25) % 1;
      // In Standard LTE, packets visibly stall/queue at UPLINK (u around 0.25)
      if (!isProactive && u > 0.2 && u < 0.42) {
        u = 0.2 + (u - 0.2) * 0.28;
      }
      drawGlowingPulse(ctx, railStart + u * railW, railY, 2.5 * s, 0.92);
    }

    stages.forEach((st, idx) => {
      const sx = railStart + (idx / (stages.length - 1)) * railW;
      const highlight = idx === 1 && isProactive;
      ctx.fillStyle = highlight ? "#f6f5f0" : "#0e0e12";
      ctx.strokeStyle = highlight ? "#ffffff" : "rgba(246, 245, 240, 0.48)";
      ctx.lineWidth = 1;
      const bw = 96 * s;
      const bh = 28 * s;
      ctx.fillRect(sx - bw / 2, railY - bh / 2, bw, bh);
      ctx.strokeRect(sx - bw / 2, railY - bh / 2, bw, bh);

      ctx.font = `500 ${Math.max(7.8, Math.round(8.8 * s))}px "DM Sans", sans-serif`;
      ctx.fillStyle = highlight ? "#09090b" : "#f6f5f0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st, sx, railY);
    });

    // Uplink Scheduling Slots Strip
    const slotY = railY + 48 * s;
    const slotCount = 10;
    const slotSpan = railW * 0.56;
    const slotStart = w * 0.5 - slotSpan / 2;
    const activeSlot = Math.floor(t * (isProactive ? 6 : 2.2)) % slotCount;

    ctx.font = `500 ${Math.max(8, Math.round(9 * s))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(246, 245, 240, 0.62)";
    ctx.textAlign = "center";
    ctx.fillText(
      isProactive ? "PRE-SCHEDULED UPLINK GRANTS" : "REACTIVE UPLINK WAIT SLOTS",
      w * 0.5,
      slotY - 16 * s
    );

    for (let i = 0; i < slotCount; i++) {
      const sx = slotStart + (i / (slotCount - 1)) * slotSpan;
      const preLit = isProactive
        ? i === activeSlot || i === (activeSlot + 1) % slotCount
        : i === activeSlot;
      ctx.fillStyle = preLit ? "#f6f5f0" : "rgba(246, 245, 240, 0.14)";
      ctx.fillRect(sx - 6 * s, slotY, 12 * s, 18 * s);
    }
  }

  /* --- 07. Acemap: Archival 2,208-Topic Atlas with Cluster Labels & Neighbor Links --- */
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
    const padX = w * 0.08;
    const padY = h * 0.1;
    const spanX = Math.max(1, acemapState.maxX - acemapState.minX);
    const spanY = Math.max(1, acemapState.maxY - acemapState.minY);
    const scale = Math.min((w - padX * 2) / spanX, (h - padY * 2) / spanY);
    const offX = (w - spanX * scale) / 2;
    const offY = (h - spanY * scale) / 2;

    const sums = Array.from({ length: ACEMAP_FIELDS.length }, () => ({
      sx: 0,
      sy: 0,
      n: 0,
    }));

    for (const p of acemapState.points) {
      p.sx = (p.x - acemapState.minX) * scale + offX;
      p.sy = (p.y - acemapState.minY) * scale + offY;
      sums[p.field].sx += p.sx;
      sums[p.field].sy += p.sy;
      sums[p.field].n++;
    }

    // Compute real discipline centroids sorted by cluster size for clean collision-free labeling
    acemapState.centroids = sums
      .map((sObj, fieldIdx) => ({
        field: fieldIdx,
        name: ACEMAP_FIELDS[fieldIdx],
        count: sObj.n,
        cx: sObj.n ? sObj.sx / sObj.n : 0,
        cy: sObj.n ? sObj.sy / sObj.n : 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  function isAcemapPointActive(p) {
    const fieldMatch =
      acemapState.selectedField === "all" || p.field === Number(acemapState.selectedField);
    if (!fieldMatch) return false;
    if (!acemapState.searchQuery) return true;
    return p.name.toLowerCase().includes(acemapState.searchQuery);
  }

  function findNeighborTopics(focusIdx, maxNeighbors = 6) {
    const pts = acemapState.points;
    const fp = pts[focusIdx];
    if (!fp) return [];
    const scored = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === focusIdx) continue;
      const dx = pts[i].sx - fp.sx;
      const dy = pts[i].sy - fp.sy;
      const d2 = dx * dx + dy * dy;
      if (d2 > 125 * 125) continue;
      scored.push({ idx: i, d2 });
    }
    scored.sort((a, b) => a.d2 - b.d2);
    return scored.slice(0, maxNeighbors).map((sObj) => sObj.idx);
  }

  function drawAcemapPlate(ctx, w, h, t) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    if (!acemapState.loaded) {
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
        ctx.rotate(rot + Math.sin(t * 0.18 + idx) * 0.04);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * sx, ry * sy, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.22)";
        ctx.lineWidth = 0.85;
        ctx.stroke();
        ctx.restore();
      });

      const previewLabels = [
        ["COMPUTER SCIENCE", -0.22, -0.18],
        ["PHYSICS", 0.24, -0.15],
        ["MATHEMATICS", -0.25, 0.16],
        ["MEDICINE", 0.22, 0.18],
        ["ENGINEERING", 0.02, -0.26],
      ];
      ctx.font = `500 10px "DM Sans", sans-serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.52)";
      ctx.textAlign = "center";
      previewLabels.forEach(([txt, ox, oy]) => {
        ctx.fillText(txt, cx + ox * w, cy + oy * h);
      });

      ctx.font = `italic 300 22px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = "rgba(246, 245, 240, 0.88)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("2,208 Topics · 19 Disciplines", cx, cy);
      return;
    }

    const pts = acemapState.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const active = isAcemapPointActive(p);
      const r = active ? clamp(1.35 + (p.size - 4) * 0.22, 1.35, 3.6) : 1.0;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? ACEMAP_SILVER_TONES[p.field] : "rgba(255, 255, 255, 0.065)";
      ctx.globalAlpha = active ? 0.84 : 1;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Editorial On-Canvas Major Discipline Cluster Labels (collision-culled)
    const placedBoxes = [];
    ctx.font = `500 ${w < 500 ? 8.5 : 9.8}px "DM Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const c of acemapState.centroids) {
      if (
        acemapState.selectedField !== "all" &&
        c.field !== Number(acemapState.selectedField)
      ) {
        continue;
      }
      const label = c.name.toUpperCase();
      const tw = ctx.measureText(label).width + 12;
      const th = 16;
      const x = clamp(c.cx, 24 + tw / 2, w - 24 - tw / 2);
      const y = clamp(c.cy, 28, h - 28);
      const box = { x0: x - tw / 2, x1: x + tw / 2, y0: y - th / 2, y1: y + th / 2 };

      const collides = placedBoxes.some(
        (b) =>
          !(box.x1 + 6 < b.x0 || box.x0 - 6 > b.x1 || box.y1 + 4 < b.y0 || box.y0 - 4 > b.y1)
      );
      if (collides && acemapState.selectedField === "all") continue;
      placedBoxes.push(box);

      ctx.fillStyle = "rgba(6, 6, 8, 0.68)";
      ctx.fillRect(box.x0, box.y0, tw, th);
      ctx.fillStyle =
        acemapState.selectedField !== "all"
          ? "#ffffff"
          : "rgba(246, 245, 240, 0.72)";
      ctx.fillText(label, x, y + 0.5);
    }

    // Hover / Selected Topic: Fine Silver Neighbor Links + Archival Crosshair
    const focusIdx =
      acemapState.hoveredIndex >= 0 ? acemapState.hoveredIndex : acemapState.selectedIndex;
    if (focusIdx >= 0 && pts[focusIdx]) {
      const fp = pts[focusIdx];
      const neighbors = findNeighborTopics(focusIdx, 6);

      // Draw fine silver constellation filaments to nearest scholarly neighbors
      neighbors.forEach((nIdx) => {
        const np = pts[nIdx];
        ctx.beginPath();
        ctx.moveTo(fp.sx, fp.sy);
        ctx.lineTo(np.sx, np.sy);
        ctx.strokeStyle = "rgba(246, 245, 240, 0.45)";
        ctx.lineWidth = 0.85;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(np.sx, np.sy, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = "#f6f5f0";
        ctx.fill();
      });

      // Crosshair reticle
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 0.85;
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
      const bx = clamp(fp.sx + 14, 22, w - boxW - 22);
      const by = clamp(fp.sy - 34, 22, h - boxH - 22);

      ctx.fillStyle = "rgba(9, 9, 11, 0.92)";
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = "rgba(246, 245, 240, 0.55)";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.fillStyle = "#f6f5f0";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + 10, by + boxH / 2);
    }
  }

  /* --- Acemap Dataset Loader & Controls Wiring --- */
  const acemapLoadBtn = $("#acemap-load-btn");
  const acemapFieldWrap = $("#acemap-field-wrap");
  const acemapSearchWrap = $("#acemap-search-wrap");
  const acemapTopicWrap = $("#acemap-topic-wrap");
  const acemapFieldSelect = $("#acemap-field");
  const acemapSearchInput = $("#acemap-search");
  const acemapTopicSelect = $("#acemap-topic");
  const acemapStatus = $("#acemap-status");

  function updateAcemapFilter() {
    if (!acemapState.loaded) return;
    acemapState.selectedField = acemapFieldSelect ? acemapFieldSelect.value : "all";
    acemapState.searchQuery = acemapSearchInput
      ? acemapSearchInput.value.trim().toLowerCase()
      : "";
    acemapState.hoveredIndex = -1;
    acemapState.selectedIndex = -1;

    let count = 0;
    let firstMatch = -1;
    if (acemapTopicSelect) {
      acemapTopicSelect.replaceChildren(new Option("Choose a topic", ""));
    }
    acemapState.points.forEach((p, idx) => {
      if (isAcemapPointActive(p)) {
        count++;
        if (firstMatch < 0) firstMatch = idx;
        if (acemapTopicSelect) {
          acemapTopicSelect.add(new Option(p.name, String(idx)));
        }
      }
    });

    if (acemapState.searchQuery && count > 0 && count <= 15 && firstMatch >= 0) {
      acemapState.selectedIndex = firstMatch;
    }

    const label =
      acemapState.selectedField === "all"
        ? "All 19 disciplines"
        : ACEMAP_FIELDS[Number(acemapState.selectedField)];
    if (acemapStatus) {
      acemapStatus.textContent = `${label} · ${count.toLocaleString()} topics · Hover or click any star for neighbor links.`;
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
      if (acemapSearchWrap) acemapSearchWrap.hidden = false;
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

  /* --- Main Project Canvas Wiring --- */
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
              acemapStatus.textContent = `${p.name} · ${ACEMAP_FIELDS[p.field]} (showing 6 nearest neighbors)`;
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
      if (activeProject === "seed") {
        seedState.manualPhase = 1.85;
        if (projectCtrl) projectCtrl.renderOnce();
        return;
      }
      if (activeProject === "flora") {
        const rect = projectCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const { width, height } = projectCtrl.getSize();
        const mx = ((ev.clientX - rect.left) / rect.width) * width;
        const my = ((ev.clientY - rect.top) / rect.height) * height;
        const hit = floraState.hitBoxes.find(
          (b) => mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1
        );
        if (hit) {
          toggleFloraHook(hit.key);
        }
        return;
      }
      if (activeProject === "sonica") {
        sonicaState.burstTimer = 1.0;
        if (projectCtrl) projectCtrl.renderOnce();
        return;
      }
      if (activeProject === "acemap") {
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
      }
    });

    projectCtrl = createCanvasLoop(
      projectCanvas,
      (ctx, w, h, t, dt) => {
        if (!stagePtrInside && motionEnabled) {
          stagePtrX = 0.5 + Math.sin(t * 0.45) * 0.16;
          stagePtrY = 0.5 + Math.cos(t * 0.38) * 0.12;
        }
        ctx.fillStyle = "#060608";
        ctx.fillRect(0, 0, w, h);

        switch (activeProject) {
          case "seed":
            drawSeedPlate(ctx, w, h, t, dt);
            break;
          case "secureSIM":
            drawSecureSimPlate(ctx, w, h, t);
            break;
          case "gptcodelearner":
            drawGptPlate(ctx, w, h, t, dt);
            break;
          case "sonica":
            drawSonicaPlate(ctx, w, h, t, dt);
            break;
          case "flora":
            drawFloraPlate(ctx, w, h, t);
            break;
          case "lrp":
            drawVrPlate(ctx, w, h, t, dt);
            break;
          case "acemap":
            drawAcemapPlate(ctx, w, h, t);
            break;
          default:
            drawSeedPlate(ctx, w, h, t, dt);
        }
        drawCornerMarks(ctx, w, h, 14, 0.16);
      },
      (w, h) => {
        mapAcemapCoords(w, h);
      }
    );
  }

  /* --- Contextual Plate Control Listeners --- */
  const seedTriggerBtn = $("#seed-trigger-btn");
  const seedAutoBtn = $("#seed-auto-btn");
  if (seedTriggerBtn) {
    seedTriggerBtn.addEventListener("click", () => {
      seedState.manualPhase = 1.85;
      if (projectCtrl) projectCtrl.renderOnce();
    });
  }
  if (seedAutoBtn) {
    seedAutoBtn.addEventListener("click", () => {
      seedState.autoCycle = !seedState.autoCycle;
      seedAutoBtn.classList.toggle("is-active", seedState.autoCycle);
      seedAutoBtn.setAttribute("aria-pressed", String(seedState.autoCycle));
      if (projectCtrl) projectCtrl.renderOnce();
    });
  }

  const secureSimBtns = $$("[data-securesim-mode]");
  const secureSimStatus = $("#securesim-status");
  secureSimBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      secureSimState.mode = btn.dataset.securesimMode === "unauthorized" ? "unauthorized" : "valid";
      secureSimBtns.forEach((b) => {
        const act = b.dataset.securesimMode === secureSimState.mode;
        b.classList.toggle("is-active", act);
        b.setAttribute("aria-pressed", String(act));
      });
      if (secureSimStatus) {
        secureSimStatus.textContent =
          secureSimState.mode === "valid"
            ? "ALLOWED · Verified certificate aligns policy gate to unlock only its scoped SIM partition."
            : "DENIED · Unsigned or over-privileged app hits policy barrier and is deflected.";
      }
      if (projectCtrl) projectCtrl.renderOnce();
    });
  });

  const gptBtns = $$("[data-gpt-query]");
  const gptStatus = $("#gpt-status");
  gptBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.gptQuery;
      if (!GPT_QUERIES[q]) return;
      gptState.query = q;
      gptState.sweep = 0;
      gptBtns.forEach((b) => {
        const act = b.dataset.gptQuery === q;
        b.classList.toggle("is-active", act);
        b.setAttribute("aria-pressed", String(act));
      });
      if (gptStatus) gptStatus.textContent = GPT_QUERIES[q].status;
      if (projectCtrl) projectCtrl.renderOnce();
    });
  });

  const sonicaBandBtns = $$("[data-sonica-band]");
  const sonicaBurstBtn = $("#sonica-burst-btn");
  const sonicaStatus = $("#sonica-status");
  const sonicaBandCopy = [
    "Guard-Band NB-IoT channel · Active subcarriers shifted to lower guard band.",
    "Stand-Alone NB-IoT channel · Sync Preamble, Control Ch & Uplink Subcarriers active.",
    "In-Band NB-IoT channel · Active narrowband resource block tuned to upper carrier.",
  ];
  sonicaBandBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sonicaState.band = Number(btn.dataset.sonicaBand) || 0;
      sonicaState.burstTimer = 0.7;
      sonicaBandBtns.forEach((b) => {
        const act = Number(b.dataset.sonicaBand) === sonicaState.band;
        b.classList.toggle("is-active", act);
        b.setAttribute("aria-pressed", String(act));
      });
      if (sonicaStatus) sonicaStatus.textContent = sonicaBandCopy[sonicaState.band];
      if (projectCtrl) projectCtrl.renderOnce();
    });
  });
  if (sonicaBurstBtn) {
    sonicaBurstBtn.addEventListener("click", () => {
      sonicaState.burstTimer = 1.05;
      if (projectCtrl) projectCtrl.renderOnce();
    });
  }

  const floraHookBtns = $$("[data-flora-hook]");
  const floraStatus = $("#flora-status");
  function toggleFloraHook(key) {
    if (!(key in floraState.hooks)) return;
    floraState.hooks[key] = !floraState.hooks[key];
    floraHookBtns.forEach((b) => {
      const k = b.dataset.floraHook;
      const act = Boolean(floraState.hooks[k]);
      b.classList.toggle("is-active", act);
      b.setAttribute("aria-pressed", String(act));
    });
    const enabled = Object.entries(floraState.hooks)
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase());
    if (floraStatus) {
      floraStatus.textContent = enabled.length
        ? `Active programmable rules: ${enabled.join(" · ")} — packet routing updated across the stack.`
        : "Default baseline cellular flow across eSIM → RAN → 5G Core → Edge VR.";
    }
    if (projectCtrl) projectCtrl.renderOnce();
  }
  floraHookBtns.forEach((btn) => {
    btn.addEventListener("click", () => toggleFloraHook(btn.dataset.floraHook));
  });

  const vrBtns = $$("[data-vr-mode]");
  const vrStatus = $("#vr-status");
  vrBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      vrState.mode = btn.dataset.vrMode === "standard" ? "standard" : "proactive";
      vrBtns.forEach((b) => {
        const act = b.dataset.vrMode === vrState.mode;
        b.classList.toggle("is-active", act);
        b.setAttribute("aria-pressed", String(act));
      });
      if (vrStatus) {
        vrStatus.textContent =
          vrState.mode === "proactive"
            ? "Proactive Uplink · Pre-allocated grants eliminate uplink queueing; viewport locks onto head pose."
            : "Standard LTE · Reactive scheduling queues uplink packets, creating visible double-exposure frame lag.";
      }
      if (projectCtrl) projectCtrl.renderOnce();
    });
  });

  if (acemapLoadBtn) acemapLoadBtn.addEventListener("click", loadAcemapDataset);
  if (acemapFieldSelect) acemapFieldSelect.addEventListener("change", updateAcemapFilter);
  if (acemapSearchInput) acemapSearchInput.addEventListener("input", updateAcemapFilter);
  if (acemapTopicSelect) {
    acemapTopicSelect.addEventListener("change", () => {
      const val = acemapTopicSelect.value;
      acemapState.selectedIndex = val === "" ? -1 : Number(val);
      if (acemapState.selectedIndex >= 0 && acemapState.points[acemapState.selectedIndex]) {
        const p = acemapState.points[acemapState.selectedIndex];
        if (acemapStatus) {
          acemapStatus.textContent = `Selected: ${p.name} · ${ACEMAP_FIELDS[p.field]} (showing 6 nearest neighbors)`;
        }
      } else {
        updateAcemapFilter();
      }
      if (projectCtrl) projectCtrl.renderOnce();
    });
  }

  /* --- Curtain-Reveal Project Selector --- */
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
      ctrlPanels.forEach((panel) => {
        panel.hidden = panel.dataset.ctrlFor !== key;
      });
      if (projectCanvas) {
        projectCanvas.setAttribute(
          "aria-label",
          `${info.title}: ${info.medium.toLowerCase()} — ${info.desc}`
        );
      }
      if (key === "gptcodelearner") gptState.sweep = 0;
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
    }, 150);
  }

  projectTriggers.forEach((trigger) => {
    const key = trigger.dataset.selectProject;
    trigger.addEventListener("click", () => selectProject(key));
    trigger.addEventListener("pointerenter", () => {
      if (finePointerMQ.matches) selectProject(key);
    });
  });

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
