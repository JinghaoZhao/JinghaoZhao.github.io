/* Version 6: Liquid Glass & Iridescent Prism Atelier
 * Domain-customized optical glass simulations across Hero, Bare Metal x CME, and all 7 projects.
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
     SHARED CANVAS OPTICAL DRAWING PRIMITIVES (FROSTED GLASS & PRISM OPTICS)
     ======================================================================== */
  function roundBox(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, rad);
    } else {
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + w - rad, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
      ctx.lineTo(x + w, y + h - rad);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      ctx.lineTo(x + rad, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
    }
  }

  function drawGlassSlab(ctx, x, y, w, h, r, strokeCol, fillTint) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, fillTint || "rgba(255, 255, 255, 0.11)");
    grad.addColorStop(0.55, "rgba(18, 28, 52, 0.56)");
    grad.addColorStop(1, "rgba(123, 232, 255, 0.08)");
    roundBox(ctx, x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = strokeCol || "rgba(165, 226, 255, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Top specular glass highlight edge
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y + 1);
    ctx.lineTo(x + w - r, y + 1);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawPillBadge(ctx, cx, cy, text, strokeCol, fgCol, fontSize = 10.5) {
    ctx.save();
    ctx.font = `600 ${fontSize}px "Space Grotesk", "Plus Jakarta Sans", sans-serif`;
    const padX = 9;
    const tw = ctx.measureText(text).width + padX * 2;
    const th = fontSize + 10;
    const x = cx - tw * 0.5;
    const y = cy - th * 0.5;
    roundBox(ctx, x, y, tw, th, th * 0.5);
    ctx.fillStyle = "rgba(8, 12, 24, 0.86)";
    ctx.fill();
    ctx.strokeStyle = strokeCol || "rgba(155, 224, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = fgCol || "#eef6ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy + 0.5);
    ctx.restore();
  }

  // Chamfered SIM / eSIM crystal die with recognizable metallic-prism contact pads
  function drawSimChip(ctx, cx, cy, w, h, accentStroke, glowColor) {
    const x = cx - w * 0.5;
    const y = cy - h * 0.5;
    const cut = Math.min(w, h) * 0.22;

    ctx.save();
    if (glowColor) {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(w, h) * 0.9);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(w, h) * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h - 6);
    ctx.quadraticCurveTo(x + w, y + h, x + w - 6, y + h);
    ctx.lineTo(x + 6, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - 6);
    ctx.lineTo(x, y + 6);
    ctx.quadraticCurveTo(x, y, x + 6, y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.14)");
    grad.addColorStop(0.5, "rgba(22, 34, 62, 0.72)");
    grad.addColorStop(1, "rgba(199, 166, 255, 0.16)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = accentStroke || "rgba(140, 232, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ISO-7816 metallic prism contact pad grid
    const pw = w * 0.56;
    const ph = h * 0.48;
    const px = cx - pw * 0.5;
    const py = cy - ph * 0.42;
    roundBox(ctx, px, py, pw, ph, 4);
    const padGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    padGrad.addColorStop(0, "rgba(248, 224, 152, 0.34)");
    padGrad.addColorStop(0.5, "rgba(145, 238, 255, 0.25)");
    padGrad.addColorStop(1, "rgba(216, 186, 255, 0.3)");
    ctx.fillStyle = padGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 226, 166, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Contact pad trace lines
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.34, py);
    ctx.lineTo(px + pw * 0.34, py + ph);
    ctx.moveTo(px + pw * 0.66, py);
    ctx.lineTo(px + pw * 0.66, py + ph);
    ctx.moveTo(px, py + ph * 0.35);
    ctx.lineTo(px + pw * 0.34, py + ph * 0.35);
    ctx.moveTo(px, py + ph * 0.68);
    ctx.lineTo(px + pw * 0.34, py + ph * 0.68);
    ctx.moveTo(px + pw * 0.66, py + ph * 0.35);
    ctx.lineTo(px + pw, py + ph * 0.35);
    ctx.moveTo(px + pw * 0.66, py + ph * 0.68);
    ctx.lineTo(px + pw, py + ph * 0.68);
    ctx.stroke();
    ctx.restore();
  }

  function drawPulseDot(ctx, x, y, r, color) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(7, 9, 16, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
     3. HERO CANVAS: REFRACTIVE BARE-METAL OPTICAL LANES & FABRIC PRISM
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

    // 7 physical bare-metal optical blade lanes converging into the cloud fabric prism
    const bladeLanes = Array.from({ length: 7 }, (_, i) => ({
      idx: i,
      yNorm: 0.16 + i * 0.115,
      hue: 188 + i * 19,
      speed: 0.24 + (i % 3) * 0.065,
      phase: i * 0.43,
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
        : Math.sin(timeSec * 0.35) * 0.35;
      const driftY = finePointerQuery.matches
        ? py
        : Math.cos(timeSec * 0.27) * 0.28;

      // Optical convergence hub (Cloud Bare-Metal Fabric Prism)
      const hubX = w * (w < 780 ? 0.56 : 0.66) + driftX * 36;
      const hubY = h * 0.48 + driftY * 26;

      // Ambient refractive caustic glow around the fabric prism
      ctx.globalCompositeOperation = "lighter";
      const pool = ctx.createRadialGradient(
        hubX,
        hubY,
        0,
        hubX,
        hubY,
        Math.max(w, h) * 0.54
      );
      pool.addColorStop(0, "rgba(123, 232, 255, 0.22)");
      pool.addColorStop(0.36, "rgba(154, 134, 255, 0.12)");
      pool.addColorStop(0.68, "rgba(246, 178, 228, 0.045)");
      pool.addColorStop(1, "rgba(7, 9, 16, 0)");
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, w, h);

      // Architectural perspective cloud fabric grid (subtle precision craft)
      ctx.strokeStyle = "rgba(148, 198, 255, 0.055)";
      ctx.lineWidth = 1;
      const vCols = w < 640 ? 6 : 12;
      for (let c = 1; c < vCols; c++) {
        const gx = (c / vCols) * w;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (gx - hubX) * 0.16, h);
        ctx.stroke();
      }
      for (let r = 1; r < 7; r++) {
        const gy = (r / 7) * h;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Crystalline bare-metal blade rails converging into the glass fabric prism
      bladeLanes.forEach((lane) => {
        const startY = h * lane.yNorm + driftY * (lane.idx - 3) * 4;
        const endY = hubY + (lane.idx - 3) * (h * 0.042);
        const exitY = h * (0.14 + lane.idx * 0.12) - driftY * 14;

        // Subtle translucent physical server-blade bar on left/right rails
        const bladeW = w < 640 ? 54 : 112;
        const bladeH = 14;
        const bx = w < 640 ? w * 0.04 : w * 0.07;
        ctx.globalCompositeOperation = "source-over";
        roundBox(ctx, bx, startY - bladeH * 0.5, bladeW, bladeH, 4);
        ctx.fillStyle = "rgba(255, 255, 255, 0.032)";
        ctx.fill();
        ctx.strokeStyle = `hsla(${lane.hue}, 82%, 74%, 0.18)`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        ctx.globalCompositeOperation = "lighter";

        // Curved optical fiber rail: Physical Blade -> Fabric Prism -> Cloud Egress
        const drawFiber = (dy, hueShift, alpha, lw) => {
          ctx.beginPath();
          ctx.moveTo(bx + bladeW, startY + dy);
          ctx.bezierCurveTo(
            hubX * 0.55,
            startY + dy,
            hubX * 0.72,
            endY + dy,
            hubX,
            endY + dy
          );
          ctx.bezierCurveTo(
            hubX + (w - hubX) * 0.35,
            endY + dy,
            hubX + (w - hubX) * 0.62,
            exitY + dy,
            w + 20,
            exitY + dy
          );
          const g = ctx.createLinearGradient(0, 0, w, 0);
          const hCol = (lane.hue + hueShift + 360) % 360;
          g.addColorStop(0, `hsla(${hCol}, 92%, 74%, 0.04)`);
          g.addColorStop(0.55, `hsla(${hCol}, 94%, 80%, ${alpha})`);
          g.addColorStop(1, `hsla(${(hCol + 32) % 360}, 90%, 72%, 0.06)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = lw;
          ctx.stroke();
        };

        // Chromatic optical dispersion (cyan / pure / violet edge)
        drawFiber(-2, -14, 0.15, 1.8);
        drawFiber(0, 0, 0.34, 1.25);
        drawFiber(2, 18, 0.14, 1.8);

        // Deterministic spectral packet pulses traveling smoothly along each rail
        for (let p = 0; p < 2; p++) {
          const prog = (timeSec * lane.speed + lane.phase + p * 0.5) % 1;
          let pxPos;
          let pyPos;
          if (prog < 0.62) {
            const u = prog / 0.62;
            const inv = 1 - u;
            const x0 = bx + bladeW;
            const x1 = hubX * 0.55;
            const x2 = hubX * 0.72;
            const x3 = hubX;
            pxPos =
              inv ** 3 * x0 +
              3 * inv ** 2 * u * x1 +
              3 * inv * u ** 2 * x2 +
              u ** 3 * x3;
            pyPos =
              inv ** 3 * startY +
              3 * inv ** 2 * u * startY +
              3 * inv * u ** 2 * endY +
              u ** 3 * endY;
          } else {
            const u = (prog - 0.62) / 0.38;
            const inv = 1 - u;
            const x0 = hubX;
            const x1 = hubX + (w - hubX) * 0.35;
            const x2 = hubX + (w - hubX) * 0.62;
            const x3 = w + 20;
            pxPos =
              inv ** 3 * x0 +
              3 * inv ** 2 * u * x1 +
              3 * inv * u ** 2 * x2 +
              u ** 3 * x3;
            pyPos =
              inv ** 3 * endY +
              3 * inv ** 2 * u * endY +
              3 * inv * u ** 2 * exitY +
              u ** 3 * exitY;
          }
          drawPulseDot(
            ctx,
            pxPos,
            pyPos,
            2.4,
            `hsla(${lane.hue}, 96%, 78%, 0.9)`
          );
        }
      });

      // Central Refractive Glass Cloud-Fabric Prism Facet at hub
      const prR = Math.min(w, h) * 0.16;
      ctx.save();
      ctx.translate(hubX, hubY);
      ctx.rotate(driftX * 0.08 + Math.sin(timeSec * 0.35) * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, -prR * 1.15);
      ctx.lineTo(prR * 0.92, 0);
      ctx.lineTo(0, prR * 1.15);
      ctx.lineTo(-prR * 0.92, 0);
      ctx.closePath();
      const facetGrad = ctx.createLinearGradient(-prR, -prR, prR, prR);
      facetGrad.addColorStop(0, "rgba(123, 232, 255, 0.14)");
      facetGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      facetGrad.addColorStop(1, "rgba(199, 166, 255, 0.14)");
      ctx.fillStyle = facetGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(182, 236, 255, 0.32)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner refractive precision reticle ring
      ctx.beginPath();
      ctx.arc(0, 0, prR * 0.56, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(216, 198, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

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
     4. BARE METAL × CME LIVE OPTICAL VISUALIZATIONS + 3D GLASS STACK
     ======================================================================== */
  const stackTabs = $$("[data-plane-select]");
  const stackPlanes = $$(".crystal-plane");
  const planesViewport = $(".crystal-planes-viewport");
  const bmCanvas = $("#bm-optical-canvas");
  const bmReadout = $("#bm-optical-readout");
  const cmeCanvas = $("#cme-optical-canvas");

  let bmActivePlane = 0;
  let syncWorkScenes = () => {};

  const BM_READOUTS = [
    "HOST & FABRIC · Dedicated physical CPU & NIC directly on cloud fabric (zero hypervisor layer).",
    "FLEET LIFECYCLE · Physical server blades stepping through Provision → Verify → Active → Drain → Reclaim.",
    "END-TO-END BEHAVIOR · Deterministic flat-jitter optical packet flow across Host NIC → Fabric → Control Plane → Peer.",
  ];

  function setFocusedPlane(index) {
    const idx = Number(index);
    bmActivePlane = idx;
    if (planesViewport) planesViewport.dataset.activePlane = String(idx);
    if (bmReadout) bmReadout.textContent = BM_READOUTS[idx] || BM_READOUTS[0];

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
        plane.style.transform = active
          ? "perspective(1050px) rotateX(0deg) translateZ(20px) scale(1)"
          : `perspective(1050px) rotateX(${delta * 5}deg) translateZ(-14px) scale(0.975)`;
      } else {
        plane.style.transform = "";
      }
    });
  }

  stackTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setFocusedPlane(tab.dataset.planeSelect);
      syncWorkScenes();
    });
  });

  stackPlanes.forEach((plane) => {
    plane.addEventListener("click", () => {
      setFocusedPlane(plane.dataset.plane);
      syncWorkScenes();
    });
    plane.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFocusedPlane(plane.dataset.plane);
        syncWorkScenes();
      }
    });
  });

  function initWorkOpticalScenes() {
    const workSection = $("#work");
    if (!workSection || (!bmCanvas && !cmeCanvas)) return;

    const bmCtx = bmCanvas ? bmCanvas.getContext("2d") : null;
    const cmeCtx = cmeCanvas ? cmeCanvas.getContext("2d") : null;
    let bmW = 0;
    let bmH = 0;
    let cmeW = 0;
    let cmeH = 0;
    let rafId = 0;
    let lastTs = 0;
    let t = 0;
    let isVisible = false;

    function resizeCanvas(canvas, ctx) {
      if (!canvas || !ctx) return { w: 0, h: 0 };
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }

    function resizeAll() {
      const b = resizeCanvas(bmCanvas, bmCtx);
      bmW = b.w;
      bmH = b.h;
      const c = resizeCanvas(cmeCanvas, cmeCtx);
      cmeW = c.w;
      cmeH = c.h;
      drawAll(t);
    }

    /* Bare Metal Plane 0: Host & Fabric (Direct Physical CPU/NIC -> Fabric, ZERO hypervisor) */
    function drawHostFabric(ctx, w, h, time) {
      const compact = w < 440;
      const pad = compact ? 12 : 22;
      const cy = h * 0.52;

      // Left: Dedicated Physical CPU + Silicon Slab
      const leftW = compact ? w * 0.31 : w * 0.27;
      const slabH = h * 0.62;
      const leftX = pad;
      const slabY = cy - slabH * 0.5;
      drawGlassSlab(
        ctx,
        leftX,
        slabY,
        leftW,
        slabH,
        14,
        "rgba(123, 232, 255, 0.55)",
        "rgba(123, 232, 255, 0.11)"
      );

      // Silicon core grid inside CPU slab
      const coreSize = Math.min(leftW * 0.52, slabH * 0.36);
      const coreX = leftX + (leftW - coreSize) * 0.5;
      const coreY = slabY + 18;
      roundBox(ctx, coreX, coreY, coreSize, coreSize * 0.72, 6);
      ctx.fillStyle = "rgba(123, 232, 255, 0.16)";
      ctx.fill();
      ctx.strokeStyle = "rgba(162, 236, 255, 0.72)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `700 ${compact ? 9 : 10.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText(
        "PHYSICAL CPU",
        leftX + leftW * 0.5,
        coreY + coreSize * 0.72 + 16
      );
      ctx.font = `500 ${compact ? 8 : 9.5}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#9de7ff";
      ctx.fillText(
        "DIRECT SILICON",
        leftX + leftW * 0.5,
        coreY + coreSize * 0.72 + 30
      );

      // Center: High-Speed NIC Crystal Bridge (Bypassing Hypervisor)
      const midW = compact ? w * 0.22 : w * 0.2;
      const midH = h * 0.34;
      const midX = w * 0.5 - midW * 0.5;
      const midY = cy - midH * 0.5;
      drawGlassSlab(
        ctx,
        midX,
        midY,
        midW,
        midH,
        12,
        "rgba(199, 166, 255, 0.65)",
        "rgba(199, 166, 255, 0.12)"
      );
      ctx.font = `700 ${compact ? 9 : 10.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("NIC", midX + midW * 0.5, cy - 3);
      ctx.font = `500 ${compact ? 7.8 : 9}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#d9c2ff";
      ctx.fillText("BARE METAL", midX + midW * 0.5, cy + 12);

      // Zero-hypervisor badge floating cleanly above center bridge
      drawPillBadge(
        ctx,
        w * 0.5,
        Math.max(18, slabY - 4),
        "ZERO HYPERVISOR LAYER",
        "rgba(137, 243, 210, 0.6)",
        "#b6ffea",
        compact ? 8.5 : 9.5
      );

      // Right: Cloud Fabric (top) & Storage I/O (bottom)
      const rightW = compact ? w * 0.29 : w * 0.26;
      const rightX = w - pad - rightW;
      const boxH = slabH * 0.44;
      drawGlassSlab(
        ctx,
        rightX,
        slabY,
        rightW,
        boxH,
        12,
        "rgba(123, 232, 255, 0.5)",
        "rgba(123, 232, 255, 0.09)"
      );
      drawGlassSlab(
        ctx,
        rightX,
        slabY + slabH - boxH,
        rightW,
        boxH,
        12,
        "rgba(246, 178, 228, 0.5)",
        "rgba(246, 178, 228, 0.08)"
      );

      ctx.font = `700 ${compact ? 8.5 : 10}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#eef6ff";
      ctx.textAlign = "center";
      ctx.fillText("CLOUD FABRIC", rightX + rightW * 0.5, slabY + boxH * 0.54);
      ctx.fillText(
        "STORAGE I/O",
        rightX + rightW * 0.5,
        slabY + slabH - boxH * 0.46
      );

      // Direct optical packet streams: CPU -> NIC -> Cloud Fabric & Storage I/O
      ctx.globalCompositeOperation = "lighter";
      const lanes = [
        {
          x0: leftX + leftW,
          y0: cy - 10,
          x1: midX,
          y1: cy - 8,
          col: "#7be8ff",
          speed: 0.72,
        },
        {
          x0: leftX + leftW,
          y0: cy + 10,
          x1: midX,
          y1: cy + 8,
          col: "#c7a6ff",
          speed: 0.65,
        },
        {
          x0: midX + midW,
          y0: cy - 8,
          x1: rightX,
          y1: slabY + boxH * 0.5,
          col: "#7be8ff",
          speed: 0.8,
        },
        {
          x0: midX + midW,
          y0: cy + 8,
          x1: rightX,
          y1: slabY + slabH - boxH * 0.5,
          col: "#f6b2e4",
          speed: 0.7,
        },
      ];

      lanes.forEach((ln, i) => {
        ctx.beginPath();
        ctx.moveTo(ln.x0, ln.y0);
        ctx.lineTo(ln.x1, ln.y1);
        ctx.strokeStyle = ln.col;
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (let k = 0; k < 2; k++) {
          const u = (time * ln.speed + i * 0.23 + k * 0.5) % 1;
          drawPulseDot(
            ctx,
            lerp(ln.x0, ln.x1, u),
            lerp(ln.y0, ln.y1, u),
            2.4,
            ln.col
          );
        }
      });
      ctx.globalCompositeOperation = "source-over";
    }

    /* Bare Metal Plane 1: Fleet Lifecycle (8 Physical Server Blades cycling 5 Cloud States) */
    function drawFleetLifecycle(ctx, w, h, time) {
      const stages = [
        { name: "PROVISION", col: "#7be8ff", bg: "rgba(123, 232, 255, 0.16)" },
        { name: "VERIFY", col: "#c7a6ff", bg: "rgba(199, 166, 255, 0.16)" },
        { name: "ACTIVE", col: "#89f3d2", bg: "rgba(137, 243, 210, 0.18)" },
        { name: "DRAIN", col: "#ffd18c", bg: "rgba(255, 209, 140, 0.16)" },
        { name: "RECLAIM", col: "#f6b2e4", bg: "rgba(246, 178, 228, 0.16)" },
      ];
      const compact = w < 440;
      const padX = compact ? 12 : 22;
      const cols = 4;
      const rows = 2;
      const gapX = compact ? 8 : 12;
      const gapY = compact ? 8 : 12;
      const topY = 18;
      const gridH = h - 54;
      const cellW = (w - padX * 2 - gapX * (cols - 1)) / cols;
      const cellH = (gridH - gapY * (rows - 1)) / rows;

      for (let i = 0; i < 8; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = padX + c * (cellW + gapX);
        const y = topY + r * (cellH + gapY);

        // Smooth staggered lifecycle cycling across physical fleet
        const phase = (time * 0.42 + i * 0.62) % stages.length;
        const sIdx = Math.floor(phase);
        const st = stages[sIdx];
        const frac = phase - sIdx;

        drawGlassSlab(ctx, x, y, cellW, cellH, 10, st.col, st.bg);

        // Blade ID + live state label
        ctx.font = `700 ${compact ? 8.5 : 9.5}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "rgba(225, 238, 255, 0.72)";
        ctx.textAlign = "left";
        ctx.fillText(`B-0${i + 1}`, x + 8, y + 16);

        // Status LED pulse
        ctx.fillStyle = st.col;
        ctx.beginPath();
        ctx.arc(x + cellW - 10, y + 13, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `700 ${compact ? 8.2 : 9.8}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(st.name, x + cellW * 0.5, y + cellH * 0.62);

        // Subtle optical progress bar at bottom of blade
        const barW = cellW - 16;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(x + 8, y + cellH - 10, barW, 2.5);
        ctx.fillStyle = st.col;
        ctx.fillRect(x + 8, y + cellH - 10, barW * frac, 2.5);
      }

      // Lifecycle flow legend strip along bottom
      const legY = h - 18;
      ctx.font = `600 ${compact ? 7.8 : 9.2}px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#b8cce8";
      ctx.fillText(
        "PROVISION  →  VERIFY  →  ACTIVE  →  DRAIN  →  RECLAIM",
        w * 0.5,
        legY
      );
    }

    /* Bare Metal Plane 2: End-to-End Behavior (Deterministic Flat-Jitter Optical Trace) */
    function drawEndToEnd(ctx, w, h, time) {
      const compact = w < 440;
      const pad = compact ? 14 : 24;
      const nodes = [
        { label: "HOST NIC", col: "#7be8ff" },
        { label: "FABRIC", col: "#9abfff" },
        { label: "CONTROL", col: "#c7a6ff" },
        { label: "PEER", col: "#89f3d2" },
      ];
      const topY = h * 0.3;
      const boxW = compact ? (w - pad * 2 - 24) / 4 : Math.min(108, (w - pad * 2 - 48) / 4);
      const boxH = 38;
      const span = w - pad * 2 - boxW;

      // Optical relay beam
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.moveTo(pad + boxW * 0.5, topY);
      ctx.lineTo(pad + span + boxW * 0.5, topY);
      ctx.strokeStyle = "rgba(123, 232, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Uniformly spaced deterministic optical packets
      for (let p = 0; p < 5; p++) {
        const u = (time * 0.36 + p * 0.2) % 1;
        const px = pad + boxW * 0.5 + u * span;
        drawPulseDot(ctx, px, topY, 2.8, "#7be8ff");
      }
      ctx.globalCompositeOperation = "source-over";

      nodes.forEach((n, idx) => {
        const x = pad + (idx / (nodes.length - 1)) * span;
        drawGlassSlab(
          ctx,
          x,
          topY - boxH * 0.5,
          boxW,
          boxH,
          10,
          n.col,
          "rgba(12, 19, 36, 0.85)"
        );
        ctx.font = `700 ${compact ? 7.8 : 9.5}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "#f4f7ff";
        ctx.textAlign = "center";
        ctx.fillText(n.label, x + boxW * 0.5, topY + 3.5);
      });

      // Lower half: Live Flat-Jitter Arrival Trace
      const traceTop = h * 0.56;
      const traceH = h * 0.32;
      const traceW = w - pad * 2;
      drawGlassSlab(
        ctx,
        pad,
        traceTop,
        traceW,
        traceH,
        10,
        "rgba(137, 243, 210, 0.32)",
        "rgba(10, 16, 30, 0.6)"
      );

      // Calibrated phase ticks
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      const ticks = 8;
      for (let k = 1; k < ticks; k++) {
        const gx = pad + (k / ticks) * traceW;
        ctx.beginPath();
        ctx.moveTo(gx, traceTop + 4);
        ctx.lineTo(gx, traceTop + traceH - 4);
        ctx.stroke();
      }

      // Smooth deterministic flat-jitter periodic arrival waveform
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      const baseY = traceTop + traceH * 0.72;
      const segs = 120;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const x = pad + 8 + u * (traceW - 16);
        const phase = (u * 6 - time * 0.85) % 1;
        const dist = Math.abs(((phase + 1.5) % 1) - 0.5);
        const spike = Math.exp(-Math.pow(dist * 24, 2)) * (traceH * 0.52);
        const y = baseY - spike;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#89f3d2";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      ctx.font = `600 ${compact ? 7.8 : 8.8}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#a6f9df";
      ctx.textAlign = "left";
      ctx.fillText("DETERMINISTIC FLAT-JITTER PULSE TRACE", pad + 10, traceTop + 14);
    }

    /* CME Group Optical Stream: Trading Gateways <-> Dedicated Bare Metal Fabric <-> Matching Engine */
    function drawCmeStream(ctx, w, h, time) {
      const compact = w < 360;
      const pad = compact ? 10 : 16;
      const cy = h * 0.52;
      const nodeW = compact ? 82 : 104;
      const nodeH = 62;

      const leftX = pad;
      const rightX = w - pad - nodeW;

      // Dedicated bare-metal fiber rails (Order -> Matching Engine, Ack <- Gateways)
      ctx.globalCompositeOperation = "lighter";
      const railY1 = cy - 13;
      const railY2 = cy + 13;

      ctx.beginPath();
      ctx.moveTo(leftX + nodeW, railY1);
      ctx.lineTo(rightX, railY1);
      ctx.strokeStyle = "rgba(123, 232, 255, 0.48)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(leftX + nodeW, railY2);
      ctx.lineTo(rightX, railY2);
      ctx.strokeStyle = "rgba(199, 166, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Synchronized high-velocity order/ack optical pulses
      for (let i = 0; i < 4; i++) {
        const u = (time * 0.9 + i * 0.25) % 1;
        drawPulseDot(
          ctx,
          lerp(leftX + nodeW, rightX, u),
          railY1,
          2.6,
          "#7be8ff"
        );
        const v = (time * 0.9 + i * 0.25 + 0.12) % 1;
        drawPulseDot(
          ctx,
          lerp(rightX, leftX + nodeW, v),
          railY2,
          2.3,
          "#d3b3ff"
        );
      }

      // Matching engine harmonic pulse aura
      const pulseR = 18 + ((time * 26) % 30);
      ctx.beginPath();
      ctx.arc(rightX + nodeW * 0.5, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(137, 243, 210, ${clamp(1 - (pulseR - 18) / 30, 0, 0.5)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";

      // Left slab: Trading Gateways
      drawGlassSlab(
        ctx,
        leftX,
        cy - nodeH * 0.5,
        nodeW,
        nodeH,
        12,
        "rgba(123, 232, 255, 0.55)",
        "rgba(123, 232, 255, 0.1)"
      );
      ctx.font = `700 ${compact ? 8 : 9.2}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText("TRADING", leftX + nodeW * 0.5, cy - 4);
      ctx.fillText("GATEWAYS", leftX + nodeW * 0.5, cy + 10);

      // Right slab: Matching Engine
      drawGlassSlab(
        ctx,
        rightX,
        cy - nodeH * 0.5,
        nodeW,
        nodeH,
        12,
        "rgba(137, 243, 210, 0.6)",
        "rgba(137, 243, 210, 0.11)"
      );
      ctx.fillStyle = "#ffffff";
      ctx.fillText("MATCHING", rightX + nodeW * 0.5, cy - 4);
      ctx.fillText("ENGINE", rightX + nodeW * 0.5, cy + 10);

      // Center optical labels
      ctx.font = `600 ${compact ? 7.5 : 8.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#a5ebff";
      ctx.fillText("ORDER FLOW →", w * 0.5, railY1 - 9);
      ctx.fillStyle = "#d9c2ff";
      ctx.fillText("← MATCH ACK", w * 0.5, railY2 + 16);
    }

    function drawAll(time) {
      if (bmCtx && bmW && bmH) {
        bmCtx.clearRect(0, 0, bmW, bmH);
        if (bmActivePlane === 0) drawHostFabric(bmCtx, bmW, bmH, time);
        else if (bmActivePlane === 1) drawFleetLifecycle(bmCtx, bmW, bmH, time);
        else drawEndToEnd(bmCtx, bmW, bmH, time);
      }
      if (cmeCtx && cmeW && cmeH) {
        cmeCtx.clearRect(0, 0, cmeW, cmeH);
        drawCmeStream(cmeCtx, cmeW, cmeH, time);
      }
    }

    function loop(now) {
      rafId = 0;
      if (!motionEnabled || !isVisible || document.hidden) {
        lastTs = 0;
        return;
      }
      if (!lastTs || now - lastTs >= 28) {
        const dt = lastTs ? Math.min((now - lastTs) / 1000, 0.06) : 0;
        t += dt;
        lastTs = now;
        drawAll(t);
      }
      rafId = requestAnimationFrame(loop);
    }

    syncWorkScenes = () => {
      if (motionEnabled && isVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(loop);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        drawAll(t);
      }
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          syncWorkScenes();
        },
        { threshold: 0.03 }
      ).observe(workSection);
    } else {
      isVisible = true;
    }

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(resizeAll);
      if (bmCanvas) ro.observe(bmCanvas);
      if (cmeCanvas) ro.observe(cmeCanvas);
    } else {
      window.addEventListener("resize", resizeAll, { passive: true });
    }

    setFocusedPlane(0);
    resizeAll();
    syncWorkScenes();
  }

  /* ========================================================================
     5. PRISM EXHIBITION CAROUSEL: 7 DOMAIN-SPECIFIC OPTICAL SCULPTURES
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
        "SEED · 5G UE ↔ 5G Core active — trigger a 5G failure to watch SIM-based cause inference and recovery.",
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
        "SecureSIM · Valid Cert passes handshake and unlocks only its scoped eSIM partition (ALLOWED).",
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
        "GPT-Code-Learner · Query 'Trace auth flow' → 1: main.py → 2: router.py → 3: auth_guard.py.",
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
        "Sonica · Tuned to CH-2 (Control Ch) — live narrowband NB-IoT waterfall spectrogram decoding IoT bursts.",
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
        "Flora · Full-stack eSIM → RAN → 5G Core → Edge VR live — click any layer hook to reprogram packet routing.",
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
        "Mobile VR Latency · Proactive (Predicted) — pre-granted wireless slots keep rendered VR frame locked to head pose.",
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
        "Acemap · Preview constellation — click 'Load 2,208 Topics (CSV)' to explore 19 labeled academic disciplines.",
    },
  ];

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

    const state = {
      // 1. SEED: 0..6s cycle (0-1.5 fracture, 1.5-3.2 SIM diag, 3.2-4.6 recovery ray, 4.6-6.2 healthy)
      seedCycle: 0.4,
      // 2. SecureSIM
      simMode: "valid", // "valid" | "unauth"
      simProg: 0,
      // 3. GPT-Code-Learner
      gptQuery: "auth", // "auth" | "routing" | "entry"
      gptSweep: 0,
      // 4. Sonica NB-IoT
      sonicaChannel: 1, // 0, 1, 2
      sonicaBurstAge: 0.2,
      sonicaWaterfall: [],
      // 5. Flora programmable hooks [eSIM, RAN, Core, Edge]
      floraHooks: [true, false, false, true],
      floraLayerBounds: [],
      // 6. Mobile VR Latency
      vrMode: "proactive", // "proactive" | "standard"
      vrTrail: [],
      // 7. Acemap
      acemapLoaded: false,
      acemapLoading: false,
      acemapPoints: [],
      acemapCentroids: [],
      acemapField: "all",
      acemapHover: -1,
      acemapSelected: -1,
    };

    // Seed waterfall rows for Sonica
    for (let r = 0; r < 24; r++) {
      state.sonicaWaterfall.push({
        ch: r % 3 === 0 ? 1 : -1,
        strength: r % 4 === 0 ? 0.85 : 0.25,
      });
    }

    function seeded(i, salt) {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    // 3D wireframe cube/headset crystal for Mobile VR Latency
    const vrVerts = [
      [-1, -0.62, -0.68],
      [1, -0.62, -0.68],
      [1, 0.62, -0.68],
      [-1, 0.62, -0.68],
      [-1, -0.62, 0.68],
      [1, -0.62, 0.68],
      [1, 0.62, 0.68],
      [-1, 0.62, 0.68],
      // Front visor bridge
      [-0.55, 0, 0.82],
      [0.55, 0, 0.82],
    ];
    const vrEdges = [
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
      [4, 8],
      [7, 8],
      [5, 9],
      [6, 9],
      [8, 9],
    ];

    // Preview nebula stars for Acemap before CSV load
    const previewStars = Array.from({ length: 180 }, (_, i) => {
      const arm = i % 5;
      const r = 0.08 + seeded(i, 1) * 0.38;
      const angle =
        arm * ((Math.PI * 2) / 5) + r * 4.5 + (seeded(i, 2) - 0.5) * 0.85;
      return {
        rx: 0.5 + Math.cos(angle) * r * 1.2,
        ry: 0.5 + Math.sin(angle) * r * 0.82,
        size: 1.2 + seeded(i, 3) * 2.6,
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
      const padTop = compactViewport ? 20 : 62;
      const padBottom = compactViewport ? 20 : 64;
      const availW = Math.max(40, cw - padX * 2);
      const availH = Math.max(40, ch - padTop - padBottom);
      const scale = Math.min(availW / (maxX - minX), availH / (maxY - minY));
      const ox = (cw - (maxX - minX) * scale) * 0.5;
      const oy = padTop + (availH - (maxY - minY) * scale) * 0.5;

      const sums = Array.from({ length: ACEMAP_FIELDS.length }, () => ({
        sx: 0,
        sy: 0,
        n: 0,
      }));

      for (let i = 0; i < state.acemapPoints.length; i++) {
        const p = state.acemapPoints[i];
        p.px = (p.x - minX) * scale + ox;
        p.py = (p.y - minY) * scale + oy;
        const bucket = sums[p.field];
        if (bucket) {
          bucket.sx += p.px;
          bucket.sy += p.py;
          bucket.n += 1;
        }
      }

      // Compute centroids sorted by cluster size for clean collision-avoided labels
      state.acemapCentroids = sums
        .map((b, fieldIdx) => ({
          fieldIdx,
          name: ACEMAP_FIELDS[fieldIdx],
          color: ACEMAP_CSV_COLORS[fieldIdx],
          x: b.n ? b.sx / b.n : 0,
          y: b.n ? b.sy / b.n : 0,
          count: b.n,
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);
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

    /* =====================================================================
       SCULPTURE 1: SEED (5G UE + SIM/SEED Prism Chip + 5G Core Recovery)
       ===================================================================== */
    function drawSeed(time) {
      const compact = cw < 520;
      const topPad = compact ? 18 : 66;
      const botPad = compact ? 18 : 64;
      const midY = topPad + (ch - topPad - botPad) * 0.42;

      const cyc = state.seedCycle % 6.8;
      // 0..1.7: Failure, 1.7..3.6: SIM Cause Inference, 3.6..5.0: Recovery Ray, 5.0..6.8: Healthy 5G
      const stage = cyc < 1.7 ? 1 : cyc < 3.6 ? 2 : cyc < 5.0 ? 3 : 0;

      const ueW = compact ? 66 : 94;
      const ueH = compact ? 96 : 126;
      const ueX = compact ? cw * 0.14 : cw * 0.17;
      const ueY = midY;

      const coreW = compact ? 74 : 112;
      const coreH = compact ? 88 : 114;
      const coreX = compact ? cw * 0.86 : cw * 0.83;
      const coreY = midY;

      const simX = cw * 0.5;
      const simY = topPad + (ch - topPad - botPad) * 0.82;
      const simW = compact ? 66 : 86;
      const simH = compact ? 48 : 60;

      // Stage Indicator Pill at top center
      const stageTexts = [
        "5G BEARER ACTIVE · HEALTHY",
        "STAGE 1 · 5G LINK FRACTURE DETECTED",
        "STAGE 2 · SIM + 5G CORE CAUSE INFERENCE",
        "STAGE 3 · SIM RECOVERY RESTORING 5G LINK",
      ];
      const stageCols = ["#89f3d2", "#ff7b9c", "#c7a6ff", "#ffd67a"];
      drawPillBadge(
        ctx,
        cw * 0.5,
        topPad + 8,
        stageTexts[stage],
        stageCols[stage],
        stageCols[stage],
        compact ? 8.5 : 10
      );

      ctx.globalCompositeOperation = "lighter";

      // Top 5G Bearer Link between 5G UE and 5G Core
      const linkStartX = ueX + ueW * 0.5 + 4;
      const linkEndX = coreX - coreW * 0.5 - 4;
      const linkY = midY - 6;

      ctx.beginPath();
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const x = lerp(linkStartX, linkEndX, u);
        let y = linkY;
        if (stage === 1 || stage === 2) {
          // Fractured crimson-amber interference
          const amp = stage === 1 ? 18 : 9;
          y +=
            Math.sin(u * 42 + time * 18) * amp * Math.sin(u * Math.PI) +
            Math.cos(u * 23 - time * 12) * (amp * 0.45);
        } else {
          // Smooth coherent 5G carrier wave
          y += Math.sin(u * Math.PI * 4 - time * 5.2) * 8 * Math.sin(u * Math.PI);
        }
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle =
        stage === 1
          ? "rgba(255, 112, 148, 0.88)"
          : stage === 2
            ? "rgba(255, 166, 128, 0.52)"
            : stage === 3
              ? "rgba(255, 224, 134, 0.9)"
              : "rgba(123, 232, 255, 0.85)";
      ctx.lineWidth = stage === 1 ? 2.4 : 2.1;
      ctx.stroke();

      if (stage === 0 || stage === 3) {
        for (let k = 0; k < 3; k++) {
          const u = (time * 0.65 + k * 0.33) % 1;
          drawPulseDot(
            ctx,
            lerp(linkStartX, linkEndX, u),
            linkY,
            2.8,
            stage === 3 ? "#ffd67a" : "#7be8ff"
          );
        }
      }

      // UE -> SIM Diagnostic Trigger Path
      ctx.beginPath();
      ctx.moveTo(ueX + ueW * 0.25, ueY + ueH * 0.5);
      ctx.quadraticCurveTo(ueX + ueW * 0.35, simY, simX - simW * 0.5, simY);
      ctx.strokeStyle =
        stage === 1 || stage === 2
          ? "rgba(255, 138, 174, 0.72)"
          : "rgba(140, 190, 240, 0.22)";
      ctx.lineWidth = stage === 1 || stage === 2 ? 2 : 1.1;
      ctx.stroke();

      if (stage === 1 || stage === 2) {
        const u = (time * 0.9) % 1;
        const inv = 1 - u;
        const p0x = ueX + ueW * 0.25;
        const p0y = ueY + ueH * 0.5;
        const p1x = ueX + ueW * 0.35;
        const p1y = simY;
        const p2x = simX - simW * 0.5;
        const p2y = simY;
        drawPulseDot(
          ctx,
          inv * inv * p0x + 2 * inv * u * p1x + u * u * p2x,
          inv * inv * p0y + 2 * inv * u * p1y + u * u * p2y,
          2.8,
          "#ff88aa"
        );
      }

      // SIM <-> 5G Core Out-of-Band Diagnostic Scan Beam
      ctx.beginPath();
      ctx.moveTo(simX + simW * 0.5, simY);
      ctx.quadraticCurveTo(coreX - coreW * 0.35, simY, coreX - coreW * 0.2, coreY + coreH * 0.5);
      ctx.strokeStyle =
        stage === 2
          ? "rgba(199, 166, 255, 0.88)"
          : "rgba(160, 180, 235, 0.22)";
      ctx.lineWidth = stage === 2 ? 2.2 : 1.1;
      ctx.stroke();

      if (stage === 2) {
        const u = (time * 1.1) % 1;
        const inv = 1 - u;
        const p0x = simX + simW * 0.5;
        const p0y = simY;
        const p1x = coreX - coreW * 0.35;
        const p1y = simY;
        const p2x = coreX - coreW * 0.2;
        const p2y = coreY + coreH * 0.5;
        drawPulseDot(
          ctx,
          inv * inv * p0x + 2 * inv * u * p1x + u * u * p2x,
          inv * inv * p0y + 2 * inv * u * p1y + u * u * p2y,
          3.2,
          "#c7a6ff"
        );
      }

      // Stage 3: Golden-Emerald Healing Ray shooting from SIM chip directly to UE + Bearer!
      if (stage === 3) {
        const prog = clamp((cyc - 3.6) / 1.4, 0, 1);
        const healR = prog * Math.min(cw, ch) * 0.55;
        ctx.beginPath();
        ctx.arc(simX, simY, healR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 218, 128, ${(1 - prog) * 0.85})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(simX, simY - simH * 0.5);
        ctx.lineTo(ueX + ueW * 0.5, ueY + 8);
        ctx.strokeStyle = "rgba(255, 224, 134, 0.9)";
        ctx.lineWidth = 2.6;
        ctx.stroke();

        drawPulseDot(
          ctx,
          lerp(simX, ueX + ueW * 0.5, (time * 1.3) % 1),
          lerp(simY - simH * 0.5, ueY + 8, (time * 1.3) % 1),
          3.4,
          "#ffd67a"
        );
      }

      ctx.globalCompositeOperation = "source-over";

      // Draw 5G UE Handset Glass Silhouette
      drawGlassSlab(
        ctx,
        ueX - ueW * 0.5,
        ueY - ueH * 0.5,
        ueW,
        ueH,
        14,
        stage === 1 ? "#ff7b9c" : stage === 3 ? "#ffd67a" : "#7be8ff",
        "rgba(123, 232, 255, 0.08)"
      );
      // Handset inner screen bezel + signal bars
      roundBox(ctx, ueX - ueW * 0.36, ueY - ueH * 0.34, ueW * 0.72, ueH * 0.52, 6);
      ctx.fillStyle = "rgba(8, 13, 25, 0.65)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let b = 0; b < 4; b++) {
        const bh = 6 + b * 4.5;
        const bx = ueX - 15 + b * 9;
        const by = ueY + 6 - bh;
        ctx.fillStyle =
          stage === 1
            ? b === 0
              ? "#ff7b9c"
              : "rgba(255,255,255,0.12)"
            : stage === 3
              ? "#ffd67a"
              : "#7be8ff";
        ctx.fillRect(bx, by, 5, bh);
      }
      ctx.font = `700 ${compact ? 9 : 10.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText("5G UE", ueX, ueY + ueH * 0.36);

      // Draw 5G Core Glass Server Tower
      drawGlassSlab(
        ctx,
        coreX - coreW * 0.5,
        coreY - coreH * 0.5,
        coreW,
        coreH,
        14,
        stage === 2 ? "#c7a6ff" : "#8eb8ff",
        "rgba(142, 184, 255, 0.08)"
      );
      for (let r = 0; r < 3; r++) {
        const ry = coreY - coreH * 0.32 + r * 20;
        roundBox(ctx, coreX - coreW * 0.36, ry, coreW * 0.72, 13, 4);
        ctx.fillStyle = "rgba(10, 16, 30, 0.68)";
        ctx.fill();
        ctx.strokeStyle =
          stage === 2 ? "rgba(199, 166, 255, 0.55)" : "rgba(142, 184, 255, 0.32)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = stage === 2 ? "#c7a6ff" : "#7be8ff";
        ctx.beginPath();
        ctx.arc(coreX - coreW * 0.25, ry + 6.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `700 ${compact ? 9 : 10.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText("5G CORE", coreX, coreY + coreH * 0.37);

      // Draw Embedded SIM / SEED Prism Chip
      drawSimChip(
        ctx,
        simX,
        simY,
        simW,
        simH,
        stage === 3 ? "#ffd67a" : stage === 2 ? "#c7a6ff" : "#7be8ff",
        stage === 3
          ? "rgba(255, 214, 122, 0.32)"
          : stage === 2
            ? "rgba(199, 166, 255, 0.28)"
            : "rgba(123, 232, 255, 0.18)"
      );
      ctx.font = `700 ${compact ? 8.5 : 9.8}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#eef6ff";
      ctx.textAlign = "center";
      ctx.fillText("SIM / SEED", simX, simY + simH * 0.5 + 14);
    }

    /* =====================================================================
       SCULPTURE 2: SecureSIM (eSIM Crystal Die + Cert/Policy Prism Gate)
       ===================================================================== */
    function drawSecureSim(time) {
      const compact = cw < 520;
      const topPad = compact ? 18 : 66;
      const botPad = compact ? 18 : 64;
      const cy = topPad + (ch - topPad - botPad) * 0.52;
      const isValid = state.simMode === "valid";

      const reqX = compact ? cw * 0.16 : cw * 0.17;
      const gateX = cw * 0.45;
      const esimX = compact ? cw * 0.78 : cw * 0.77;
      const esimW = compact ? cw * 0.34 : Math.min(220, cw * 0.28);
      const esimH = compact ? 168 : 206;

      // Status Pill
      drawPillBadge(
        ctx,
        cw * 0.5,
        topPad + 8,
        isValid
          ? "VALID CERT · SCOPED PARTITION ALLOWED"
          : "UNAUTHORIZED APP · POLICY BARRIER DENIED",
        isValid ? "#89f3d2" : "#ff7b9c",
        isValid ? "#b6ffea" : "#ffb5c8",
        compact ? 8.4 : 10
      );

      // Left: Incoming App Request Card
      const reqW = compact ? 84 : 122;
      const reqH = compact ? 64 : 74;
      drawGlassSlab(
        ctx,
        reqX - reqW * 0.5,
        cy - reqH * 0.5,
        reqW,
        reqH,
        12,
        isValid ? "#7be8ff" : "#ff7b9c",
        isValid ? "rgba(123, 232, 255, 0.11)" : "rgba(255, 118, 152, 0.12)"
      );
      ctx.font = `700 ${compact ? 8.2 : 10}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(isValid ? "SIGNED APP" : "UNAUTH APP", reqX, cy - 8);
      ctx.font = `500 ${compact ? 7.5 : 8.8}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = isValid ? "#9ef3ff" : "#ffb4c6";
      ctx.fillText(isValid ? "VALID CERT" : "NO / BAD CERT", reqX, cy + 8);
      ctx.fillText(isValid ? "SCOPED PERM" : "OVER-PRIV REQ", reqX, cy + 21);

      // Center: Cryptographic Cert + Policy Prism Gate
      const gateH = esimH * 0.86;
      ctx.globalCompositeOperation = "lighter";

      // Rotating cryptographic handshake arcs around gate
      ctx.save();
      ctx.translate(gateX, cy);
      ctx.rotate(time * (isValid ? 0.5 : -1.2));
      ctx.beginPath();
      ctx.arc(0, 0, compact ? 26 : 36, 0, Math.PI * 1.4);
      ctx.strokeStyle = isValid
        ? "rgba(137, 243, 210, 0.55)"
        : "rgba(255, 122, 156, 0.65)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // Vertical faceted prism barrier
      ctx.beginPath();
      ctx.moveTo(gateX, cy - gateH * 0.5);
      ctx.lineTo(gateX + 12, cy);
      ctx.lineTo(gateX, cy + gateH * 0.5);
      ctx.lineTo(gateX - 12, cy);
      ctx.closePath();
      const gateGrad = ctx.createLinearGradient(
        gateX,
        cy - gateH * 0.5,
        gateX,
        cy + gateH * 0.5
      );
      gateGrad.addColorStop(
        0,
        isValid ? "rgba(123, 232, 255, 0.25)" : "rgba(255, 118, 152, 0.32)"
      );
      gateGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");
      gateGrad.addColorStop(
        1,
        isValid ? "rgba(137, 243, 210, 0.25)" : "rgba(255, 168, 120, 0.3)"
      );
      ctx.fillStyle = gateGrad;
      ctx.fill();
      ctx.strokeStyle = isValid ? "#89f3d2" : "#ff7b9c";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Request beam from App -> Gate
      const beamProg = (time * 0.72) % 1;
      ctx.beginPath();
      ctx.moveTo(reqX + reqW * 0.5, cy);
      ctx.lineTo(gateX - 10, cy);
      ctx.strokeStyle = isValid
        ? "rgba(123, 232, 255, 0.6)"
        : "rgba(255, 120, 154, 0.68)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isValid) {
        // Refract cleanly into ONLY Partition #2 (CARRIER PROFILE)
        const targetY = cy;
        ctx.beginPath();
        ctx.moveTo(gateX + 10, cy);
        ctx.lineTo(esimX - esimW * 0.5, targetY);
        ctx.strokeStyle = "rgba(137, 243, 210, 0.85)";
        ctx.lineWidth = 2.4;
        ctx.stroke();

        const px =
          beamProg < 0.5
            ? lerp(reqX + reqW * 0.5, gateX, beamProg * 2)
            : lerp(gateX, esimX - esimW * 0.5, (beamProg - 0.5) * 2);
        drawPulseDot(ctx, px, cy, 3.2, beamProg < 0.5 ? "#7be8ff" : "#89f3d2");
      } else {
        // Unauthorized request hits barrier and shatters/deflects!
        const hitProg = beamProg;
        if (hitProg < 0.55) {
          const px = lerp(reqX + reqW * 0.5, gateX - 12, hitProg / 0.55);
          drawPulseDot(ctx, px, cy, 3.2, "#ff7b9c");
        } else {
          const d = (hitProg - 0.55) / 0.45;
          // Deflected shatter shards
          const angles = [-2.4, -2.0, -1.7, 1.7, 2.0, 2.4];
          angles.forEach((ang, idx) => {
            const dist = d * (compact ? 42 : 68);
            const sx = gateX - 12 + Math.cos(ang) * dist;
            const sy = cy + Math.sin(ang) * dist;
            ctx.beginPath();
            ctx.moveTo(gateX - 12, cy);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = `rgba(255, ${120 + idx * 14}, 154, ${(1 - d) * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            drawPulseDot(ctx, sx, sy, 2 * (1 - d), "#ff8da8");
          });
        }
      }

      ctx.globalCompositeOperation = "source-over";

      ctx.font = `600 ${compact ? 7.8 : 9}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#c8dcf6";
      ctx.textAlign = "center";
      ctx.fillText("POLICY GATE", gateX, cy + gateH * 0.5 + 14);

      // Right: Chamfered eSIM Crystal Die with 3 Scoped Partitions
      const ex = esimX - esimW * 0.5;
      const ey = cy - esimH * 0.5;
      drawSimChip(
        ctx,
        esimX,
        cy,
        esimW,
        esimH,
        isValid ? "rgba(137, 243, 210, 0.72)" : "rgba(255, 134, 166, 0.55)",
        isValid ? "rgba(137, 243, 210, 0.14)" : "rgba(255, 118, 152, 0.1)"
      );

      // 3 Scoped Partitions inside eSIM
      const parts = [
        { name: "CELLULAR AUTH", unlocked: false },
        { name: "CARRIER PROFILE", unlocked: isValid },
        { name: "USER KEYS", unlocked: false },
      ];
      const pPad = compact ? 10 : 16;
      const pW = esimW - pPad * 2;
      const pH = (esimH - 52) / 3;
      parts.forEach((pt, idx) => {
        const py = ey + 28 + idx * (pH + 6);
        roundBox(ctx, ex + pPad, py, pW, pH, 7);
        ctx.fillStyle = pt.unlocked
          ? "rgba(137, 243, 210, 0.24)"
          : "rgba(9, 14, 28, 0.78)";
        ctx.fill();
        ctx.strokeStyle = pt.unlocked
          ? "#89f3d2"
          : "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = pt.unlocked ? 1.5 : 1;
        ctx.stroke();

        ctx.font = `700 ${compact ? 7.4 : 8.8}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = pt.unlocked ? "#ffffff" : "rgba(195, 210, 232, 0.65)";
        ctx.textAlign = "left";
        ctx.fillText(pt.name, ex + pPad + 8, py + pH * 0.56);

        ctx.textAlign = "right";
        ctx.fillStyle = pt.unlocked ? "#9effdf" : "#9aaec9";
        ctx.fillText(
          pt.unlocked ? "OPEN" : "SEALED",
          ex + pPad + pW - 8,
          py + pH * 0.56
        );
      });

      ctx.font = `700 ${compact ? 8 : 9.2}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#e6f2ff";
      ctx.textAlign = "center";
      ctx.fillText("eSIM / SIM DIE", esimX, ey + 17);
    }

    /* =====================================================================
       SCULPTURE 3: GPT-Code-Learner (Readable Repo Call-Graph + LLM Beam)
       ===================================================================== */
    const GPT_NODES = [
      { id: "main", label: "main.py", role: "App Entry", cx: 0.17, cy: 0.34 },
      { id: "cli", label: "cli_query.py", role: "CLI Prompt", cx: 0.17, cy: 0.64 },
      { id: "router", label: "router.py", role: "Dispatcher", cx: 0.49, cy: 0.28 },
      { id: "ast", label: "ast_indexer.py", role: "AST Parser", cx: 0.49, cy: 0.52 },
      { id: "sim", label: "sim_core.py", role: "Protocol", cx: 0.49, cy: 0.75 },
      { id: "auth", label: "auth_guard.py", role: "Token Auth", cx: 0.82, cy: 0.28 },
      { id: "fabric", label: "fabric_io.py", role: "Net I/O", cx: 0.82, cy: 0.52 },
      { id: "ctx", label: "gpt_context.py", role: "LLM Builder", cx: 0.82, cy: 0.75 },
    ];
    const GPT_EDGES = [
      ["main", "router"],
      ["main", "ast"],
      ["cli", "ast"],
      ["cli", "sim"],
      ["router", "auth"],
      ["router", "fabric"],
      ["ast", "ctx"],
      ["ast", "router"],
      ["sim", "fabric"],
      ["sim", "ctx"],
    ];
    const GPT_QUERIES = {
      auth: {
        path: ["main", "router", "auth"],
        note: "1: main.py boots request  →  2: router.py matches handler  →  3: auth_guard.py validates cert",
        color: "#7be8ff",
      },
      routing: {
        path: ["main", "router", "fabric"],
        note: "1: main.py binds socket  →  2: router.py resolves target  →  3: fabric_io.py dispatches packet",
        color: "#c7a6ff",
      },
      entry: {
        path: ["cli", "ast", "ctx"],
        note: "1: cli_query.py reads question  →  2: ast_indexer.py extracts symbols  →  3: gpt_context.py builds prompt",
        color: "#89f3d2",
      },
    };

    function drawGptCodeLearner(time) {
      const compact = cw < 520;
      const topPad = compact ? 16 : 64;
      const botPad = compact ? 38 : 92;
      const usableH = ch - topPad - botPad;
      const q = GPT_QUERIES[state.gptQuery] || GPT_QUERIES.auth;

      const nodeMap = {};
      const nw = compact ? 86 : 126;
      const nh = compact ? 38 : 44;

      GPT_NODES.forEach((n) => {
        nodeMap[n.id] = {
          ...n,
          x: cw * n.cx,
          y: topPad + usableH * n.cy,
        };
      });

      // Draw repository AST / call-graph edges
      GPT_EDGES.forEach(([aId, bId]) => {
        const a = nodeMap[aId];
        const b = nodeMap[bId];
        const aPos = q.path.indexOf(aId);
        const bPos = q.path.indexOf(bId);
        const isPathEdge = aPos >= 0 && bPos === aPos + 1;

        ctx.beginPath();
        ctx.moveTo(a.x + nw * 0.5, a.y);
        const midX = (a.x + b.x) * 0.5;
        ctx.bezierCurveTo(midX, a.y, midX, b.y, b.x - nw * 0.5, b.y);
        if (isPathEdge) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = q.color;
          ctx.lineWidth = 2.4;
          ctx.stroke();

          // Sweeping LLM retrieval pulse along edge
          const u = (time * 0.85 - aPos * 0.32 + 2) % 1;
          const inv = 1 - u;
          const x0 = a.x + nw * 0.5;
          const x3 = b.x - nw * 0.5;
          const px =
            inv ** 3 * x0 +
            3 * inv ** 2 * u * midX +
            3 * inv * u ** 2 * midX +
            u ** 3 * x3;
          const py =
            inv ** 3 * a.y +
            3 * inv ** 2 * u * a.y +
            3 * inv * u ** 2 * b.y +
            u ** 3 * b.y;
          drawPulseDot(ctx, px, py, 3, q.color);
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.strokeStyle = "rgba(165, 195, 235, 0.16)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw Glass AST / Module Nodes with numbered retrieval badges
      GPT_NODES.forEach((n) => {
        const nd = nodeMap[n.id];
        const stepIdx = q.path.indexOf(n.id);
        const isHit = stepIdx >= 0;

        drawGlassSlab(
          ctx,
          nd.x - nw * 0.5,
          nd.y - nh * 0.5,
          nw,
          nh,
          10,
          isHit ? q.color : "rgba(255, 255, 255, 0.16)",
          isHit ? "rgba(123, 232, 255, 0.16)" : "rgba(12, 18, 34, 0.66)"
        );

        ctx.font = `700 ${compact ? 8.2 : 10.2}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = isHit ? "#ffffff" : "rgba(205, 220, 244, 0.72)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, nd.x, nd.y - 2);

        ctx.font = `500 ${compact ? 7 : 8.5}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isHit ? q.color : "rgba(155, 174, 204, 0.65)";
        ctx.fillText(n.role, nd.x, nd.y + 11);

        // Numbered prism step badge (1 -> 2 -> 3)
        if (isHit) {
          const bx = nd.x - nw * 0.5 + 2;
          const by = nd.y - nh * 0.5 + 2;
          ctx.beginPath();
          ctx.arc(bx, by, 10, 0, Math.PI * 2);
          ctx.fillStyle = q.color;
          ctx.fill();
          ctx.font = '700 10px "Space Grotesk", sans-serif';
          ctx.fillStyle = "#070910";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(stepIdx + 1), bx, by + 0.5);
          ctx.textBaseline = "alphabetic";
        }
      });

      // Concise inline flow readout pill inside graph
      drawPillBadge(
        ctx,
        cw * 0.5,
        ch - botPad + (compact ? 16 : 2),
        compact
          ? `${q.path[0]} (1) → ${q.path[1]} (2) → ${q.path[2]} (3)`
          : q.note,
        q.color,
        "#eef7ff",
        compact ? 8 : 9.5
      );
    }

    /* =====================================================================
       SCULPTURE 4: Sonica (NB-IoT Narrowband Waterfall Spectrogram + Tuner)
       ===================================================================== */
    const SONICA_CHANNELS = [
      { id: "CH-1", name: "SYNC PREAMBLE", hue: 186 },
      { id: "CH-2", name: "CONTROL CH", hue: 256 },
      { id: "CH-3", name: "UPLINK SUBCARRIERS", hue: 316 },
    ];

    function drawSonica(time) {
      const compact = cw < 520;
      const topPad = compact ? 16 : 64;
      const botPad = compact ? 18 : 64;
      const availH = ch - topPad - botPad;

      const sensorW = compact ? 74 : 112;
      const sensorX = compact ? 12 : 24;
      const sensorY = topPad + availH * 0.5;

      const wfX = sensorX + sensorW + (compact ? 18 : 34);
      const wfW = cw - wfX - (compact ? 12 : 24);
      const wfY = topPad + 24;
      const wfH = availH - 42;

      const chIdx = state.sonicaChannel;
      const chInfo = SONICA_CHANNELS[chIdx];
      const burstGlow = Math.exp(-state.sonicaBurstAge * 2.1);

      // Left: COTS NB-IoT Sensor Slab + RF Burst Waves
      drawGlassSlab(
        ctx,
        sensorX,
        sensorY - 46,
        sensorW,
        92,
        12,
        `hsla(${chInfo.hue}, 92%, 76%, 0.65)`,
        "rgba(123, 232, 255, 0.08)"
      );
      ctx.font = `700 ${compact ? 8.2 : 10}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText("NB-IoT", sensorX + sensorW * 0.5, sensorY - 10);
      ctx.fillText("SENSOR", sensorX + sensorW * 0.5, sensorY + 4);
      ctx.font = `500 ${compact ? 7.2 : 8.5}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#a5e8ff";
      ctx.fillText("COTS DEVICE", sensorX + sensorW * 0.5, sensorY + 22);

      // Emitted narrowband RF arcs
      ctx.globalCompositeOperation = "lighter";
      for (let a = 0; a < 3; a++) {
        const prog = (time * 0.9 + a * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(
          sensorX + sensorW,
          sensorY,
          8 + prog * (compact ? 16 : 28),
          -0.55,
          0.55
        );
        ctx.strokeStyle = `hsla(${chInfo.hue}, 95%, 78%, ${(1 - prog) * (0.55 + burstGlow * 0.45)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";

      // Right: Prismatic Narrowband Waterfall Spectrogram Frame
      drawGlassSlab(
        ctx,
        wfX,
        wfY,
        wfW,
        wfH,
        14,
        "rgba(165, 224, 255, 0.38)",
        "rgba(8, 12, 24, 0.72)"
      );

      // 3 Discrete Narrowband Subcarrier Lane Columns
      const laneW = wfW / 3;
      const rows = state.sonicaWaterfall.length;
      const rowH = (wfH - 28) / rows;

      SONICA_CHANNELS.forEach((lane, i) => {
        const lx = wfX + i * laneW;
        const isTuned = i === chIdx;

        // Vertical lane divider
        if (i > 0) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(lx, wfY + 4);
          ctx.lineTo(lx, wfY + wfH - 4);
          ctx.stroke();
        }

        // Tuned subcarrier prism highlight window
        if (isTuned) {
          ctx.fillStyle = `hsla(${lane.hue}, 92%, 72%, 0.09)`;
          ctx.fillRect(lx + 2, wfY + 2, laneW - 4, wfH - 4);
          ctx.strokeStyle = `hsla(${lane.hue}, 96%, 78%, 0.75)`;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(lx + 2, wfY + 2, laneW - 4, wfH - 4);
        }

        // Lane header label
        ctx.font = `700 ${compact ? 7.2 : 9}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = isTuned ? "#ffffff" : "rgba(185, 206, 234, 0.65)";
        ctx.textAlign = "center";
        ctx.fillText(
          compact ? lane.id : `${lane.id} · ${lane.name}`,
          lx + laneW * 0.5,
          wfY - 8
        );

        // Scrolling narrowband waterfall blocks inside each subcarrier lane
        const subCols = compact ? 5 : 8;
        const blockW = (laneW - 14) / subCols;
        for (let r = 0; r < rows; r++) {
          const ry = wfY + 12 + r * rowH;
          const sample = state.sonicaWaterfall[r];
          const hit = sample && sample.ch === i;
          for (let sc = 0; sc < subCols; sc++) {
            const wave =
              0.5 +
              0.5 * Math.sin(sc * 1.4 + r * 0.8 + time * 4 + i * 2.1);
            const energy = hit
              ? clamp(sample.strength * (0.65 + wave * 0.45), 0.15, 1)
              : isTuned
                ? 0.08 + wave * 0.14
                : 0.03 + wave * 0.06;
            const alpha = energy * (isTuned ? 0.92 : 0.42);
            ctx.fillStyle = `hsla(${lane.hue + sc * 4}, 94%, ${56 + energy * 32}%, ${alpha})`;
            ctx.fillRect(
              lx + 7 + sc * blockW,
              ry,
              Math.max(2, blockW - 2),
              Math.max(2, rowH - 2)
            );
          }
        }
      });

      // Decoded packet status bar at bottom of waterfall
      drawPillBadge(
        ctx,
        wfX + wfW * 0.5,
        wfY + wfH + 2,
        `TUNED ${chInfo.id} (${chInfo.name}) · ${burstGlow > 0.25 ? "DECODING BURST FRAME" : "SYNC LOCKED"}`,
        `hsla(${chInfo.hue}, 95%, 78%, 0.78)`,
        "#f4f7ff",
        compact ? 7.6 : 9.2
      );
    }

    /* =====================================================================
       SCULPTURE 5: Flora (4 Stacked Frosted-Glass Cellular Layers + Hooks)
       ===================================================================== */
    const FLORA_LAYERS = [
      {
        idx: 3,
        name: "04 · EDGE VR",
        hook: "Edge Offload",
        onLabel: "EDGE GPU RENDER",
        offLabel: "LOCAL RENDER",
        hue: 312,
      },
      {
        idx: 2,
        name: "03 · 5G CORE",
        hook: "Core Route",
        onLabel: "ANALYTICS TAP ON",
        offLabel: "DIRECT PATH",
        hue: 264,
      },
      {
        idx: 1,
        name: "02 · RAN",
        hook: "RAN Slice",
        onLabel: "LOW-LATENCY SLICE",
        offLabel: "SHARED RADIO",
        hue: 204,
      },
      {
        idx: 0,
        name: "01 · eSIM",
        hook: "eSIM Profile",
        onLabel: "PROFILE A · OPEN",
        offLabel: "PROFILE B · TEST",
        hue: 170,
      },
    ];

    function drawFlora(time) {
      const compact = cw < 520;
      const topPad = compact ? 14 : 62;
      const botPad = compact ? 16 : 62;
      const availH = ch - topPad - botPad;

      const cx = cw * (state.floraHooks[2] && !compact ? 0.43 : 0.5);
      const planeW = compact ? cw * 0.84 : Math.min(430, cw * 0.56);
      const planeH = Math.min(48, (availH - 36) / 4);
      const gap = (availH - planeH * 4) / 5;

      state.floraLayerBounds = [];

      // Bidirectional packet streams traversing all 4 layers (eSIM <-> RAN <-> Core <-> Edge VR)
      const topY = topPad + gap + planeH * 0.5;
      const botY = topPad + gap * 4 + planeH * 3.5;

      ctx.globalCompositeOperation = "lighter";
      const laneOffsets = state.floraHooks[1] ? [-0.28, 0, 0.28] : [-0.18, 0.18];
      laneOffsets.forEach((off, lIdx) => {
        const lx = cx + planeW * off;
        const speed = state.floraHooks[1] ? 0.62 : 0.36;
        const col =
          lIdx === 1 && state.floraHooks[1]
            ? "#89f3d2"
            : state.floraHooks[0]
              ? "#7be8ff"
              : "#d4b4ff";

        ctx.beginPath();
        ctx.moveTo(lx, botY);
        ctx.lineTo(lx, topY);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.32;
        ctx.lineWidth = state.floraHooks[1] && lIdx === 1 ? 2.4 : 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Uplink photon (bottom -> top)
        const uUp = (time * speed + lIdx * 0.27) % 1;
        drawPulseDot(ctx, lx, lerp(botY, topY, uUp), 2.8, col);

        // Downlink VR frame photon (top -> bottom) when Edge Offload hook active
        if (state.floraHooks[3]) {
          const uDn = (time * (speed * 1.1) + lIdx * 0.31 + 0.5) % 1;
          drawPulseDot(ctx, lx + 6, lerp(topY, botY, uDn), 2.4, "#f6b2e4");
        }
      });

      // Core Route Programmable Analytics Tap Branch
      const coreLayerY = topPad + gap * 2 + planeH * 1.5;
      if (state.floraHooks[2] && !compact) {
        const tapX = cx + planeW * 0.5 + 88;
        ctx.beginPath();
        ctx.moveTo(cx + planeW * 0.5, coreLayerY);
        ctx.lineTo(tapX - 48, coreLayerY);
        ctx.strokeStyle = "rgba(199, 166, 255, 0.78)";
        ctx.lineWidth = 2;
        ctx.stroke();
        drawPulseDot(
          ctx,
          lerp(cx + planeW * 0.5, tapX - 48, (time * 0.9) % 1),
          coreLayerY,
          2.8,
          "#c7a6ff"
        );
        ctx.globalCompositeOperation = "source-over";
        drawGlassSlab(
          ctx,
          tapX - 48,
          coreLayerY - 26,
          104,
          52,
          12,
          "#c7a6ff",
          "rgba(199, 166, 255, 0.15)"
        );
        ctx.font = '700 9px "Space Grotesk", sans-serif';
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("ANALYTICS", tapX + 4, coreLayerY - 3);
        ctx.fillStyle = "#d8c2ff";
        ctx.fillText("LIVE TAP", tapX + 4, coreLayerY + 11);
      }
      ctx.globalCompositeOperation = "source-over";

      // Draw 4 Stacked Frosted-Glass Cellular Planes
      FLORA_LAYERS.forEach((layer, rowIdx) => {
        const y = topPad + gap * (rowIdx + 1) + planeH * rowIdx;
        const x = cx - planeW * 0.5;
        const isHookOn = state.floraHooks[layer.idx];

        state.floraLayerBounds.push({
          idx: layer.idx,
          x,
          y,
          w: planeW,
          h: planeH,
        });

        drawGlassSlab(
          ctx,
          x,
          y,
          planeW,
          planeH,
          12,
          `hsla(${layer.hue}, 94%, 78%, ${isHookOn ? 0.88 : 0.35})`,
          `hsla(${layer.hue}, 90%, 66%, ${isHookOn ? 0.18 : 0.06})`
        );

        // Layer title on left
        ctx.font = `700 ${compact ? 9 : 11}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(layer.name, x + 14, y + planeH * 0.58);

        // Programmable rule status pill on right
        const tagText = isHookOn ? layer.onLabel : layer.offLabel;
        ctx.font = `600 ${compact ? 7.6 : 9}px "Space Grotesk", sans-serif`;
        ctx.fillStyle = isHookOn
          ? `hsla(${layer.hue}, 96%, 84%, 1)`
          : "rgba(184, 200, 224, 0.72)";
        ctx.textAlign = "right";
        ctx.fillText(tagText, x + planeW - 14, y + planeH * 0.58);
      });
    }

    /* =====================================================================
       SCULPTURE 6: Mobile VR Latency (6DoF Headset -> Uplink -> Edge GPU -> Display)
       ===================================================================== */
    function drawVrHeadsetWire(ctx, cx, cy, scale, ax, ay, strokeCol, lw) {
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const pts = vrVerts.map(([x, y, z]) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const p = 3.2 / (3.2 - z2);
        return [cx + x1 * scale * p, cy + y2 * scale * p];
      });
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < vrEdges.length; i++) {
        const [a, b] = vrEdges[i];
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
    }

    function drawMobileVr(time) {
      const compact = cw < 560;
      const topPad = compact ? 18 : 66;
      const botPad = compact ? 18 : 64;
      const cy = topPad + (ch - topPad - botPad) * 0.52;
      const isStandard = state.vrMode === "standard";

      // Live 6DoF head pose orientation (pointer-interactive or smooth auto turn)
      const headAy = mouseInside
        ? (mouseX - 0.5) * 1.9
        : Math.sin(time * 1.35) * 0.95;
      const headAx = mouseInside
        ? (mouseY - 0.5) * 1.1
        : Math.cos(time * 0.95) * 0.42;

      state.vrTrail.push({ ax: headAx, ay: headAy });
      if (state.vrTrail.length > 26) state.vrTrail.shift();

      const laggedPose = state.vrTrail[Math.max(0, state.vrTrail.length - 20)];
      const syncedPose = state.vrTrail[Math.max(0, state.vrTrail.length - 2)];
      const renderedPose = isStandard ? laggedPose : syncedPose;

      // Mode Banner
      drawPillBadge(
        ctx,
        cw * 0.5,
        topPad + 8,
        isStandard
          ? "STANDARD (REACTIVE) · UPLINK QUEUED → DISPLAY LAG"
          : "PROACTIVE (PREDICTED) · PRE-GRANTED SLOT → POSE LOCKED",
        isStandard ? "#ff8da8" : "#89f3d2",
        isStandard ? "#ffc2d2" : "#b8ffea",
        compact ? 7.8 : 9.8
      );

      // Left: 6DoF VR Headset Input Box
      const boxW = compact ? cw * 0.27 : Math.min(168, cw * 0.22);
      const boxH = compact ? 116 : 154;
      const leftX = compact ? 10 : 28;
      const rightX = cw - (compact ? 10 : 28) - boxW;

      drawGlassSlab(
        ctx,
        leftX,
        cy - boxH * 0.5,
        boxW,
        boxH,
        14,
        "rgba(123, 232, 255, 0.52)",
        "rgba(123, 232, 255, 0.08)"
      );
      drawVrHeadsetWire(
        ctx,
        leftX + boxW * 0.5,
        cy - 8,
        compact ? 22 : 34,
        headAx,
        headAy,
        "#7be8ff",
        1.5
      );
      ctx.font = `700 ${compact ? 7.6 : 9.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = "#f4f7ff";
      ctx.textAlign = "center";
      ctx.fillText("6DoF HEAD POSE", leftX + boxW * 0.5, cy + boxH * 0.5 - 12);

      // Center: Wireless Uplink -> Edge GPU -> Downlink Scheduler Loop
      const midStart = leftX + boxW + 6;
      const midEnd = rightX - 6;
      const midX = (midStart + midEnd) * 0.5;
      const upY = cy - 28;
      const dnY = cy + 28;

      ctx.globalCompositeOperation = "lighter";

      // Uplink rail
      ctx.beginPath();
      ctx.moveTo(midStart, upY);
      ctx.lineTo(midEnd, upY);
      ctx.strokeStyle = isStandard
        ? "rgba(255, 140, 170, 0.5)"
        : "rgba(123, 232, 255, 0.65)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Downlink rail
      ctx.beginPath();
      ctx.moveTo(midEnd, dnY);
      ctx.lineTo(midStart, dnY);
      ctx.strokeStyle = "rgba(199, 166, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isStandard) {
        // Visible uplink packet queue piling up before reactive scheduling gate!
        const gateX = lerp(midStart, midEnd, 0.42);
        ctx.strokeStyle = "#ff7b9c";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(gateX, upY - 12);
        ctx.lineTo(gateX, upY + 12);
        ctx.stroke();

        // Queued uplink packets stalled behind gate
        for (let q = 0; q < 4; q++) {
          const jitter = Math.sin(time * 12 + q) * 1.8;
          drawPulseDot(ctx, gateX - 9 - q * 11 + jitter, upY, 2.6, "#ff9966");
        }
        // Occasional delayed packet escaping to Edge GPU
        const esc = (time * 0.45) % 1;
        drawPulseDot(ctx, lerp(gateX, midEnd, esc), upY, 2.4, "#ff7b9c");
      } else {
        // Proactive pre-granted slots: packets glide smoothly unqueued!
        for (let s = 0; s < 4; s++) {
          const sx = lerp(midStart + 14, midEnd - 14, s / 3);
          ctx.strokeStyle = "rgba(137, 243, 210, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx - 6, upY - 8, 12, 16);
        }
        for (let p = 0; p < 3; p++) {
          const u = (time * 0.95 + p * 0.33) % 1;
          drawPulseDot(ctx, lerp(midStart, midEnd, u), upY, 2.8, "#89f3d2");
        }
      }

      // Downlink rendered frames returning
      for (let p = 0; p < 3; p++) {
        const u = (time * (isStandard ? 0.5 : 0.95) + p * 0.33) % 1;
        drawPulseDot(ctx, lerp(midEnd, midStart, u), dnY, 2.5, "#c7a6ff");
      }

      ctx.globalCompositeOperation = "source-over";

      // Edge GPU Center Badge
      drawPillBadge(
        ctx,
        midX,
        cy,
        compact ? "EDGE GPU" : "EDGE GPU RENDERER",
        "rgba(199, 166, 255, 0.72)",
        "#f4f7ff",
        compact ? 7.6 : 9.2
      );

      ctx.font = `600 ${compact ? 7 : 8.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = isStandard ? "#ffb2c6" : "#a2f7ff";
      ctx.textAlign = "center";
      ctx.fillText(
        isStandard ? "UPLINK QUEUED →" : "PRE-GRANTED UL →",
        midX,
        upY - 12
      );
      ctx.fillStyle = "#d9c2ff";
      ctx.fillText("← RENDERED FRAMES", midX, dnY + 18);

      // Right: VR Display Viewport comparing Live Pose (ghost reticle) vs Edge-Rendered Frame
      drawGlassSlab(
        ctx,
        rightX,
        cy - boxH * 0.5,
        boxW,
        boxH,
        14,
        isStandard ? "#ff8da8" : "#89f3d2",
        isStandard
          ? "rgba(255, 118, 152, 0.09)"
          : "rgba(137, 243, 210, 0.09)"
      );
      // Target live pose reference wireframe
      drawVrHeadsetWire(
        ctx,
        rightX + boxW * 0.5,
        cy - 8,
        compact ? 22 : 34,
        headAx,
        headAy,
        "rgba(123, 232, 255, 0.36)",
        1.1
      );
      // Received edge-rendered frame
      drawVrHeadsetWire(
        ctx,
        rightX + boxW * 0.5 + (isStandard ? Math.sin(time * 9) * 3 : 0),
        cy - 8,
        compact ? 22 : 34,
        renderedPose.ax,
        renderedPose.ay,
        isStandard ? "#ff7b9c" : "#89f3d2",
        2.0
      );
      ctx.font = `700 ${compact ? 7.6 : 9.5}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = isStandard ? "#ffc0d0" : "#b8ffea";
      ctx.textAlign = "center";
      ctx.fillText(
        isStandard ? "DISPLAY (LAGGED)" : "DISPLAY (LOCKED)",
        rightX + boxW * 0.5,
        cy + boxH * 0.5 - 12
      );
    }

    /* =====================================================================
       SCULPTURE 7: Acemap (2,208-Topic Galaxy + On-Canvas Discipline Labels + Neighbor Links)
       ===================================================================== */
    function drawAcemap(time) {
      ctx.globalCompositeOperation = "lighter";

      if (!state.acemapLoaded) {
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

      const filterField = state.acemapField;
      const pts = state.acemapPoints;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const active = filterField === "all" || p.field === Number(filterField);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = active ? 0.8 : 0.08;
        const r = active ? clamp(1.3 + (p.size - 4) * 0.16, 1.4, 4.4) : 1.1;
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Direct On-Canvas Major Discipline Cluster Labels (collision-avoided!)
      const compact = cw < 520;
      const placedBoxes = [];
      const maxLabels = filterField === "all" ? (compact ? 7 : 12) : 1;
      ctx.font = `600 ${compact ? 8.5 : 10}px "Space Grotesk", sans-serif`;

      for (let i = 0; i < state.acemapCentroids.length; i++) {
        if (placedBoxes.length >= maxLabels) break;
        const c = state.acemapCentroids[i];
        if (filterField !== "all" && c.fieldIdx !== Number(filterField)) {
          continue;
        }
        const tw = ctx.measureText(c.name).width + 14;
        const th = compact ? 16 : 19;
        const lx = clamp(c.x - tw * 0.5, 8, cw - tw - 8);
        const ly = clamp(c.y - th * 0.5, compact ? 8 : 54, ch - th - (compact ? 8 : 58));

        const collides = placedBoxes.some(
          (b) =>
            lx < b.x + b.w + 4 &&
            lx + tw + 4 > b.x &&
            ly < b.y + b.h + 4 &&
            ly + th + 4 > b.y
        );
        if (collides) continue;

        placedBoxes.push({ x: lx, y: ly, w: tw, h: th });
        roundBox(ctx, lx, ly, tw, th, th * 0.5);
        ctx.fillStyle = "rgba(7, 10, 20, 0.78)";
        ctx.fill();
        ctx.strokeStyle = c.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#eef6ff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.name, lx + tw * 0.5, ly + th * 0.5 + 0.5);
      }
      ctx.textBaseline = "alphabetic";

      // Hover or Selected Topic: Scholarly Neighborhood Links + Glowing Reticle
      const focusIdx =
        state.acemapHover >= 0 ? state.acemapHover : state.acemapSelected;
      if (focusIdx >= 0 && pts[focusIdx]) {
        const fp = pts[focusIdx];
        const neighbors = [];
        for (let i = 0; i < pts.length; i++) {
          if (i === focusIdx) continue;
          const p = pts[i];
          if (filterField !== "all" && p.field !== Number(filterField)) continue;
          const d2 = (p.px - fp.px) ** 2 + (p.py - fp.py) ** 2;
          if (d2 < 4400) neighbors.push({ p, d2 });
        }
        neighbors.sort((a, b) => a.d2 - b.d2);
        const topN = neighbors.slice(0, 8);

        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(180, 236, 255, 0.52)";
        ctx.lineWidth = 1.1;
        topN.forEach(({ p }) => {
          ctx.beginPath();
          ctx.moveTo(fp.px, fp.py);
          ctx.lineTo(p.px, p.py);
          ctx.stroke();
          drawPulseDot(ctx, p.px, p.py, 1.8, p.color);
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

        ctx.globalCompositeOperation = "source-over";
        const label = `${fp.name} · ${ACEMAP_FIELDS[fp.field]}`;
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(label).width + 20;
        const lx = clamp(fp.px - tw * 0.5, 10, cw - tw - 10);
        const ly = fp.py > 85 ? fp.py - 38 : fp.py + 18;
        roundBox(ctx, lx, ly, tw, 26, 13);
        ctx.fillStyle = "rgba(8, 12, 24, 0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 232, 255, 0.72)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#f4f7ff";
        ctx.textAlign = "left";
        ctx.fillText(label, lx + 10, ly + 17);
      }
    }

    function renderProject(time) {
      ctx.clearRect(0, 0, cw, ch);
      const id = PROJECTS[activeIdx].id;
      if (id === "seed") drawSeed(time);
      else if (id === "secureSIM") drawSecureSim(time);
      else if (id === "gptcodelearner") drawGptCodeLearner(time);
      else if (id === "sonica") drawSonica(time);
      else if (id === "flora") drawFlora(time);
      else if (id === "lrp") drawMobileVr(time);
      else if (id === "acemap") drawAcemap(time);
    }

    let waterfallAccum = 0;
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

        state.seedCycle += dt;
        state.sonicaBurstAge += dt;

        // Scroll Sonica NB-IoT waterfall smoothly
        waterfallAccum += dt;
        if (waterfallAccum >= 0.14) {
          waterfallAccum = 0;
          const burstActive = state.sonicaBurstAge < 0.75;
          state.sonicaWaterfall.unshift({
            ch: burstActive
              ? state.sonicaChannel
              : Math.sin(t * 2.3) > 0.35
                ? state.sonicaChannel
                : -1,
            strength: burstActive ? 1 : 0.68,
          });
          if (state.sonicaWaterfall.length > 24) state.sonicaWaterfall.pop();
        }

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

    // Carousel & Deck Controls
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

    // 1. SEED Trigger 5G Failure
    $("#seed-pulse-btn")?.addEventListener("click", () => {
      state.seedCycle = 0.05;
      if (statusEl) {
        statusEl.textContent =
          "SEED · 5G failure triggered — SIM applet scanning cause with 5G Core and issuing recovery ray.";
      }
      renderProject(t);
    });

    // 2. SecureSIM Valid Cert vs Unauthorized App
    $$("[data-sim-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.simMode;
        state.simMode = mode;
        $$("[data-sim-mode]").forEach((b) => {
          const active = b.dataset.simMode === mode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (statusEl) {
          statusEl.textContent =
            mode === "valid"
              ? "SecureSIM · Valid Cert passes handshake and unlocks only its scoped eSIM partition (ALLOWED)."
              : "SecureSIM · Unauthorized request deflected by fine-grained policy prism barrier (DENIED).";
        }
        renderProject(t);
      });
    });

    // 3. GPT-Code-Learner Query Pills
    $$("[data-gpt-query]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const qKey = btn.dataset.gptQuery;
        state.gptQuery = qKey;
        $$("[data-gpt-query]").forEach((b) => {
          const active = b.dataset.gptQuery === qKey;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        const q = GPT_QUERIES[qKey];
        if (statusEl && q) {
          statusEl.textContent = `GPT-Code-Learner · ${q.note}.`;
        }
        renderProject(t);
      });
    });

    // 4. Sonica Channel Tuner & Burst Emitter
    const sonicaSlider = $("#sonica-channel-slider");
    const sonicaChLabel = $("#sonica-channel-label");
    sonicaSlider?.addEventListener("input", () => {
      const idx = Number(sonicaSlider.value);
      state.sonicaChannel = clamp(idx, 0, 2);
      state.sonicaBurstAge = 0;
      const ch = SONICA_CHANNELS[state.sonicaChannel];
      if (sonicaChLabel) sonicaChLabel.textContent = ch.id;
      if (statusEl) {
        statusEl.textContent = `Sonica · Tuned narrowband channel to ${ch.id} (${ch.name}) — decoding active NB-IoT subcarrier frames.`;
      }
      renderProject(t);
    });
    $("#sonica-burst-btn")?.addEventListener("click", () => {
      state.sonicaBurstAge = 0;
      const ch = SONICA_CHANNELS[state.sonicaChannel];
      if (statusEl) {
        statusEl.textContent = `Sonica · NB-IoT sensor burst transmitted on ${ch.id} (${ch.name}) — frame decoded live.`;
      }
      renderProject(t);
    });

    // 5. Flora Programmable Layer Hooks
    function toggleFloraHook(layerIdx) {
      state.floraHooks[layerIdx] = !state.floraHooks[layerIdx];
      $$("[data-flora-hook]").forEach((b) => {
        const idx = Number(b.dataset.floraHook);
        const on = state.floraHooks[idx];
        b.classList.toggle("is-hook-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      const layer = FLORA_LAYERS.find((l) => l.idx === layerIdx);
      if (statusEl && layer) {
        statusEl.textContent = `Flora · ${layer.name} hook '${layer.hook}' set to ${
          state.floraHooks[layerIdx] ? layer.onLabel : layer.offLabel
        }.`;
      }
      renderProject(t);
    }

    $$("[data-flora-hook]").forEach((btn) => {
      btn.addEventListener("click", () =>
        toggleFloraHook(Number(btn.dataset.floraHook))
      );
    });

    // 6. Mobile VR Latency Mode Toggle
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
            mode === "proactive"
              ? "Mobile VR Latency · Proactive (Predicted) — pre-granted wireless slots keep rendered VR frame locked to head pose."
              : "Mobile VR Latency · Standard (Reactive) — uplink packets queue at wireless scheduler, causing visible display lag.";
        }
        renderProject(t);
      });
    });

    // 7. Acemap On-Demand CSV Loader & Filters
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
      statusEl.textContent = `Acemap · ${label} · ${activeCount.toLocaleString()} topics — hover or click any star for neighborhood links.`;
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
        $("#seed-pulse-btn")?.click();
      } else if (id === "secureSIM") {
        const nextMode = state.simMode === "valid" ? "unauth" : "valid";
        $(`[data-sim-mode="${nextMode}"]`)?.click();
      } else if (id === "gptcodelearner") {
        const order = ["auth", "routing", "entry"];
        const nextQ = order[(order.indexOf(state.gptQuery) + 1) % order.length];
        $(`[data-gpt-query="${nextQ}"]`)?.click();
      } else if (id === "sonica") {
        $("#sonica-burst-btn")?.click();
      } else if (id === "flora") {
        // Allow clicking directly on any of the 4 stacked glass layers!
        const hit = state.floraLayerBounds.find(
          (b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h
        );
        if (hit) toggleFloraHook(hit.idx);
      } else if (id === "lrp") {
        const nextM = state.vrMode === "proactive" ? "standard" : "proactive";
        $(`[data-vr-mode="${nextM}"]`)?.click();
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
    syncWorkScenes();
    syncProjectScene();
  }

  reduceMotionQuery.addEventListener("change", handleMotionChange);
  document.addEventListener("visibilitychange", () => {
    syncHeroScene();
    syncWorkScenes();
    syncProjectScene();
  });

  try {
    initHeroCaustics();
  } catch {
    // Graceful fallback: obsidian prism CSS backdrop remains intact
  }

  try {
    initWorkOpticalScenes();
  } catch {
    // Graceful fallback: 3D glass planes and CME card remain fully legible
  }

  try {
    initPrismExhibition();
  } catch {
    // Graceful fallback: all 7 projects remain fully accessible in the spatial deck
  }
})();
