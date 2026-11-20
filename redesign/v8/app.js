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

    function checkViewportVisible() {
      const rect = container.getBoundingClientRect();
      const inView =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;
      if (inView !== visible) {
        visible = inView;
      }
      return visible;
    }

    function renderStatic() {
      checkViewportVisible();
      if (width > 0 && height > 0) {
        onDraw(ctx, width, height, simTime, 0, true);
      }
      if (motionEnabled && visible && !document.hidden && !pausedByUser && !rafId) {
        rafId = requestAnimationFrame(loop);
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
        { threshold: 0.01 },
      ).observe(container);
    }

    window.addEventListener(
      "scroll",
      () => {
        const wasVisible = visible;
        if (checkViewportVisible() !== wasVisible) {
          sync();
        }
      },
      { passive: true },
    );

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

  // Helper: Draw calibrated Tektronix CRT graticule
  function drawGraticule(ctx, w, h, cols, rows) {
    ctx.save();
    ctx.strokeStyle = "rgba(61, 255, 154, 0.085)";
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

    const cx = Math.round(w * 0.5) + 0.5;
    const cy = Math.round(h * 0.5) + 0.5;
    ctx.strokeStyle = "rgba(61, 255, 154, 0.17)";
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);

    const tickX = dx / 5;
    for (let x = tickX; x < w; x += tickX) {
      ctx.moveTo(x, cy - 2.5);
      ctx.lineTo(x, cy + 2.5);
    }
    const tickY = dy / 5;
    for (let y = tickY; y < h; y += tickY) {
      ctx.moveTo(cx - 2.5, y);
      ctx.lineTo(cx + 2.5, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Helper: Draw crisp vector chamfered chip / box with phosphor corner brackets
  function drawVectorBox(ctx, x, y, w, h, opts) {
    const color = (opts && opts.color) || "#3dff9a";
    const fill = (opts && opts.fill) || "rgba(5, 12, 9, 0.85)";
    const dash = opts && opts.dash;
    const glow = opts && opts.glow;
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = (opts && opts.lineWidth) || 1.2;
    if (dash) ctx.setLineDash(dash);
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Helper: Draw recognizable chamfered ISO-7816 SIM / eSIM chip with 6 contact pads
  function drawSimChip(ctx, x, y, w, h, color, activeGlow) {
    const cut = Math.min(w, h) * 0.22;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = "rgba(6, 15, 11, 0.94)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    if (activeGlow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = activeGlow;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 6-pad gold/amber contact pinout grid inside chip
    const px = x + w * 0.17;
    const py = y + h * 0.28;
    const pw = w * 0.66;
    const ph = h * 0.48;
    ctx.strokeStyle = "rgba(255, 184, 51, 0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath();
    // Vertical pad dividers
    ctx.moveTo(px + pw * 0.35, py);
    ctx.lineTo(px + pw * 0.35, py + ph);
    ctx.moveTo(px + pw * 0.65, py);
    ctx.lineTo(px + pw * 0.65, py + ph);
    // Horizontal pad dividers
    ctx.moveTo(px, py + ph * 0.33);
    ctx.lineTo(px + pw * 0.35, py + ph * 0.33);
    ctx.moveTo(px + pw * 0.65, py + ph * 0.33);
    ctx.lineTo(px + pw, py + ph * 0.33);
    ctx.moveTo(px, py + ph * 0.66);
    ctx.lineTo(px + pw * 0.35, py + ph * 0.66);
    ctx.moveTo(px + pw * 0.65, py + ph * 0.66);
    ctx.lineTo(px + pw, py + ph * 0.66);
    ctx.stroke();
    ctx.restore();
  }

  // Helper: Glowing phosphor packet pulse dot
  function drawPacket(ctx, x, y, color, r) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, r || 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0fff8";
    ctx.beginPath();
    ctx.arc(x, y, (r || 3.4) * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // 1. HERO: BARE-METAL CLOUD & SYSTEMS CRAFT VECTOR-SCOPE (#hero-scope)
  // =========================================================================
  (function initHeroScope() {
    const canvas = $("#hero-scope");
    const stage = $(".crt-stage");
    if (!canvas || !stage) return;

    const ratioEl = $("#hero-ratio");
    const phaseEl = $("#hero-phase");
    const modeEl = $("#hero-mode-readout");
    const holdBtn = $("#hero-hold-btn");
    const presetBtns = $$(".tuner-key[data-hero-mode]");

    const HERO_MODES = {
      baremetal: {
        busLabel: "BARE METAL · 3 RAILS",
        phaseLabel: "DIRECT NIC LOCK",
      },
      fabric: {
        busLabel: "CLOUD FABRIC · 4x3 MESH",
        phaseLabel: "ZERO-JITTER SYNC",
      },
      stack: {
        busLabel: "SILICON → EDGE STACK",
        phaseLabel: "END-TO-END LOCK",
      },
    };

    let activeHeroMode = "baremetal";
    let targetPtrX = 0;
    let targetPtrY = 0;
    let ptrX = 0;
    let ptrY = 0;
    let held = false;

    const ctrl = createManagedCanvas(
      canvas,
      stage,
      (ctx, w, h) => {
        ctx.fillStyle = "#040907";
        ctx.fillRect(0, 0, w, h);
      },
      (ctx, w, h, t, _dt, isStatic) => {
        if (isStatic) {
          ctx.fillStyle = "#040907";
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(4, 9, 7, 0.17)";
          ctx.fillRect(0, 0, w, h);
        }

        const autoX = Math.sin(t * 0.35) * 0.35;
        const autoY = Math.cos(t * 0.25) * 0.3;
        const destX = finePointerMQ.matches ? targetPtrX : autoX;
        const destY = finePointerMQ.matches ? targetPtrY : autoY;
        ptrX += (destX - ptrX) * (isStatic ? 1 : 0.08);
        ptrY += (destY - ptrY) * (isStatic ? 1 : 0.08);

        // Anchor schematic to right-center on wide desktop, subtle center-upper on mobile
        const wide = w > 920;
        const regionX = wide ? w * 0.44 : w * 0.08;
        const regionW = wide ? w * 0.51 : w * 0.84;
        const regionY = wide ? h * 0.14 : h * 0.12;
        const regionH = wide ? h * 0.68 : h * 0.72;
        const tiltX = ptrX * 14;
        const tiltY = ptrY * 10;

        ctx.save();
        ctx.translate(tiltX, tiltY);

        if (activeHeroMode === "baremetal") {
          // 3 Physical Bare-Metal Blade Rails + Direct NICs + Cloud Fabric Bus + Live Dual-Trace Clock
          const bladeCount = 3;
          const bladeH = Math.min(68, regionH * 0.16);
          const gap = 16;
          const totalBladesH = bladeCount * bladeH + (bladeCount - 1) * gap;
          const startY = regionY + Math.max(10, (regionH * 0.62 - totalBladesH) * 0.5);
          const bladeW = regionW * 0.78;
          const bladeX = regionX + regionW * 0.06;
          const fabricX = bladeX + bladeW + regionW * 0.11;

          // Vertical Cloud Fabric Spine Bus on the right
          ctx.strokeStyle = "#3dff9a";
          ctx.lineWidth = 2.4;
          ctx.shadowColor = "#3dff9a";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(fabricX, startY - 14);
          ctx.lineTo(fabricX, startY + totalBladesH + 14);
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.font = '500 10px "IBM Plex Mono", monospace';
          ctx.fillStyle = "#3dff9a";
          ctx.fillText("FABRIC", fabricX - 20, startY - 22);

          for (let i = 0; i < bladeCount; i++) {
            const by = startY + i * (bladeH + gap);
            const activeRail = Math.floor(t * 0.9) % bladeCount === i;
            drawVectorBox(ctx, bladeX, by, bladeW, bladeH, {
              color: activeRail ? "#3dff9a" : "rgba(61, 255, 154, 0.45)",
              fill: "rgba(5, 13, 10, 0.72)",
              glow: activeRail ? 10 : 0,
            });

            // CPU silicon die grid inside left of blade
            const dieS = Math.min(bladeH - 18, 36);
            const dieX = bladeX + 14;
            const dieY = by + (bladeH - dieS) * 0.5;
            ctx.strokeStyle = "rgba(61, 255, 154, 0.55)";
            ctx.lineWidth = 1;
            ctx.strokeRect(dieX, dieY, dieS, dieS);
            ctx.strokeStyle = "rgba(61, 255, 154, 0.25)";
            ctx.beginPath();
            ctx.moveTo(dieX + dieS * 0.5, dieY);
            ctx.lineTo(dieX + dieS * 0.5, dieY + dieS);
            ctx.moveTo(dieX, dieY + dieS * 0.5);
            ctx.lineTo(dieX + dieS, dieY + dieS * 0.5);
            ctx.stroke();

            // Blade designation + PCIe bus trace
            ctx.fillStyle = "#e8f7ef";
            ctx.font = '600 10px "IBM Plex Mono", monospace';
            ctx.fillText(`BM-NODE 0${i + 1}`, dieX + dieS + 14, by + bladeH * 0.42);
            ctx.fillStyle = "#7ba692";
            ctx.font = '400 9px "IBM Plex Mono", monospace';
            ctx.fillText(
              wide ? "DEDICATED SILICON · DIRECT NIC" : "BARE METAL · NIC",
              dieX + dieS + 14,
              by + bladeH * 0.72,
            );

            // NIC transceiver port at right edge of blade
            const nicX = bladeX + bladeW - 14;
            const nicY = by + bladeH * 0.5;
            ctx.strokeStyle = "#ffb833";
            ctx.strokeRect(nicX - 8, nicY - 8, 16, 16);

            // Direct link from NIC straight to Fabric Spine
            ctx.strokeStyle = "rgba(61, 255, 154, 0.5)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(nicX + 8, nicY);
            ctx.lineTo(fabricX, nicY);
            ctx.stroke();

            // Deterministic packet pulses traveling blade -> fabric
            const pProg = ((t * 0.95 + i * 0.33) % 1);
            const px = nicX + 8 + pProg * (fabricX - nicX - 8);
            drawPacket(ctx, px, nicY, i % 2 === 0 ? "#3dff9a" : "#ffb833", 3.2);

            // Vertical spine packet
            const spProg = ((t * 0.75 + i * 0.34) % 1);
            const spy = startY - 12 + spProg * (totalBladesH + 24);
            drawPacket(ctx, fabricX, spy, "#3dff9a", 2.8);
          }

          // Lower-right Dual-Trace Phase-Lock Oscilloscope Ribbon
          const waveY = startY + totalBladesH + 46;
          const waveH = Math.min(72, regionY + regionH - waveY - 10);
          if (waveH > 32) {
            ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
            ctx.strokeRect(bladeX, waveY, fabricX - bladeX, waveH);
            const steps = 120;
            // Trace 1: Hardware bus clock (mint)
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
              const u = s / steps;
              const x = bladeX + u * (fabricX - bladeX);
              const clk = Math.tanh(Math.sin(u * Math.PI * 14 - t * 4.2) * 3.5);
              const y = waveY + waveH * 0.36 - clk * waveH * 0.2;
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "#3dff9a";
            ctx.lineWidth = 1.6;
            ctx.shadowColor = "#3dff9a";
            ctx.shadowBlur = 8;
            ctx.stroke();

            // Trace 2: Fabric TX burst envelope (amber)
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
              const u = s / steps;
              const x = bladeX + u * (fabricX - bladeX);
              const pulse = Math.exp(-Math.pow((((u * 5 - t * 1.4) % 1 + 1) % 1 - 0.5) * 14, 2));
              const y = waveY + waveH * 0.78 - pulse * waveH * 0.36;
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "#ffb833";
            ctx.lineWidth = 1.5;
            ctx.shadowColor = "#ffb833";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        } else if (activeHeroMode === "fabric") {
          // 4-Column Deterministic Cloud Fabric Clos Mesh (NIC -> TOR -> SPINE -> PEER)
          const cols = ["HOST NIC", "TOR SW", "SPINE", "PEER"];
          const rows = 3;
          const pts = [];
          const padX = regionW * 0.1;
          const padY = regionH * 0.16;
          const colGap = (regionW - padX * 2) / (cols.length - 1);
          const rowGap = (regionH - padY * 2) / (rows - 1);

          for (let c = 0; c < cols.length; c++) {
            const x = regionX + padX + c * colGap;
            ctx.font = '500 9px "IBM Plex Mono", monospace';
            ctx.fillStyle = "#7ba692";
            ctx.fillText(cols[c], x - 20, regionY + padY - 24);
            for (let r = 0; r < rows; r++) {
              const y = regionY + padY + r * rowGap;
              pts.push({ c, r, x, y });
            }
          }

          // Clos fabric mesh edges
          ctx.strokeStyle = "rgba(61, 255, 154, 0.16)";
          ctx.lineWidth = 1;
          for (let c = 0; c < cols.length - 1; c++) {
            for (let r1 = 0; r1 < rows; r1++) {
              for (let r2 = 0; r2 < rows; r2++) {
                const a = pts[c * rows + r1];
                const b = pts[(c + 1) * rows + r2];
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
              }
            }
          }

          // Active deterministic routes with glowing phosphor packets
          const routes = [
            [0, 1, 0, 0],
            [1, 2, 1, 1],
            [2, 0, 2, 2],
          ];
          routes.forEach((rt, idx) => {
            const color = idx === 1 ? "#ffb833" : "#3dff9a";
            ctx.strokeStyle = idx === 1 ? "rgba(255, 184, 51, 0.55)" : "rgba(61, 255, 154, 0.55)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let c = 0; c < cols.length; c++) {
              const p = pts[c * rows + rt[c]];
              if (c === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            const prog = (t * 0.65 + idx * 0.33) % 1;
            const segF = prog * (cols.length - 1);
            const seg = Math.min(cols.length - 2, Math.floor(segF));
            const frac = segF - seg;
            const pA = pts[seg * rows + rt[seg]];
            const pB = pts[(seg + 1) * rows + rt[seg + 1]];
            drawPacket(ctx, pA.x + (pB.x - pA.x) * frac, pA.y + (pB.y - pA.y) * frac, color, 3.6);
          });

          // Draw switch nodes
          pts.forEach((p) => {
            drawVectorBox(ctx, p.x - 10, p.y - 10, 20, 20, {
              color: "rgba(61, 255, 154, 0.72)",
              fill: "#050d0a",
            });
            ctx.fillStyle = "#3dff9a";
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
          });
        } else {
          // Full-Stack Sync: 4 Architectural Planes (SILICON -> CLOUD FABRIC -> 5G CORE -> DESIGN UI)
          const layers = [
            { name: "04 // INTERACTION & CRAFT", color: "#3dff9a", freq: 6 },
            { name: "03 // 5G & MOBILE SYSTEMS", color: "#ffb833", freq: 10 },
            { name: "02 // DETERMINISTIC FABRIC", color: "#3dff9a", freq: 14 },
            { name: "01 // BARE-METAL SILICON", color: "#6bffb1", freq: 8 },
          ];
          const layerH = (regionH * 0.84) / layers.length;
          const x0 = regionX + regionW * 0.06;
          const lw = regionW * 0.88;

          layers.forEach((L, idx) => {
            const ly = regionY + 18 + idx * layerH;
            drawVectorBox(ctx, x0, ly, lw, layerH - 14, {
              color: idx === 1 ? "rgba(255, 184, 51, 0.45)" : "rgba(61, 255, 154, 0.42)",
              fill: "rgba(5, 13, 10, 0.74)",
            });
            ctx.font = '600 9px "IBM Plex Mono", monospace';
            ctx.fillStyle = L.color;
            ctx.fillText(L.name, x0 + 12, ly + 17);

            ctx.beginPath();
            const steps = 90;
            const wy = ly + (layerH - 14) * 0.64;
            for (let s = 0; s <= steps; s++) {
              const u = s / steps;
              const px = x0 + 12 + u * (lw - 24);
              const val = Math.sin(u * Math.PI * L.freq - t * (3.2 + idx * 0.5)) * (layerH * 0.16);
              if (s === 0) ctx.moveTo(px, wy - val);
              else ctx.lineTo(px, wy - val);
            }
            ctx.strokeStyle = L.color;
            ctx.lineWidth = 1.6;
            ctx.shadowColor = L.color;
            ctx.shadowBlur = 9;
            ctx.stroke();
            ctx.shadowBlur = 0;
          });
        }

        ctx.restore();
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
        const mode = btn.dataset.heroMode || "baremetal";
        if (!HERO_MODES[mode]) return;
        activeHeroMode = mode;
        presetBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        if (ratioEl) ratioEl.textContent = HERO_MODES[mode].busLabel;
        if (phaseEl) phaseEl.textContent = HERO_MODES[mode].phaseLabel;
        ctrl.renderStatic();
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
  // 2. SECTION 01: BARE METAL × CME MULTI-CHANNEL BUS MONITOR (#bus-scope + #cme-scope)
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
        tag: "MODE: HOST / FABRIC · ZERO HYPERVISOR",
        chA: "CH-A: DIRECT SILICON NIC → FABRIC",
        chB: "CH-B: STORAGE & I/O BOUNDARY",
        detail: "DEDICATED CPU + DIRECT NIC BYPASSING HYPERVISOR STRAIGHT TO CLOUD FABRIC",
      },
      lifecycle: {
        tag: "MODE: FLEET LIFECYCLE · 8-BLADE RACK MATRIX",
        chA: "CH-A: AUTOMATED PROVISION → LIVE",
        chB: "CH-B: SAFE DRAIN → RECLAIM TRANSITION",
        detail: "PHYSICAL SERVER BLADES CYCLING PROV → VERIFY → LIVE → DRAIN → RECLAIM",
      },
      e2e: {
        tag: "MODE: END-TO-END BEHAVIOR · DETERMINISTIC EYE-DIAGRAM",
        chA: "CH-A: HOST NIC → FABRIC → CTRL → PEER",
        chB: "CH-B: FLAT-JITTER TIMING ENVELOPE",
        detail: "PREDICTABLE PACKET FLOW & OPEN-EYE DETERMINISTIC TIMING MARGIN",
      },
      cme: {
        tag: "MODE: GOOGLE CLOUD × CME LOW-LATENCY FABRIC",
        chA: "CH-A: MARKET ORDER INGRESS PULSE",
        chB: "CH-B: MATCHING ENGINE EXECUTION ACK",
        detail: "TRADING GATEWAYS ↔ DEDICATED BARE-METAL FABRIC ↔ MATCHING ENGINE",
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
        ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
        ctx.fillRect(0, 0, w, h);
        drawGraticule(ctx, w, h, 10, 6);

        const compact = w < 540;
        const padX = compact ? 14 : 26;
        const topY = 34;
        const botY = h - 32;
        const innerH = botY - topY;
        const innerW = w - padX * 2;

        ctx.save();
        if (activeMode === "host") {
          // Dedicated physical CPU + NIC -> direct bypass of crossed-out hypervisor -> Cloud Storage & Network Fabric
          const hostW = innerW * 0.28;
          const fabW = innerW * 0.29;
          const hostX = padX;
          const fabX = w - padX - fabW;
          const boxY = topY + 12;
          const boxH = innerH * 0.64;

          // Physical Silicon Host
          drawVectorBox(ctx, hostX, boxY, hostW, boxH, {
            color: "#3dff9a",
            fill: "rgba(6, 17, 13, 0.9)",
            glow: 8,
          });
          ctx.font = `600 ${compact ? 9 : 11}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#3dff9a";
          ctx.fillText(compact ? "BARE METAL" : "BARE-METAL HOST", hostX + 10, boxY + 18);

          // CPU Silicon Die + Direct NIC sub-blocks inside Host
          const subW = hostW - 20;
          drawVectorBox(ctx, hostX + 10, boxY + 26, subW, boxH * 0.32, {
            color: "rgba(61, 255, 154, 0.5)",
          });
          ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#e8f7ef";
          ctx.fillText("DEDICATED CPU", hostX + 16, boxY + 26 + boxH * 0.19);

          drawVectorBox(ctx, hostX + 10, boxY + boxH * 0.62, subW, boxH * 0.28, {
            color: "#ffb833",
          });
          ctx.fillStyle = "#ffb833";
          ctx.fillText("DIRECT NIC / PCIe", hostX + 16, boxY + boxH * 0.79);

          // Crossed-out Hypervisor Bypassed ghost box in top center
          const midX = hostX + hostW + innerW * 0.06;
          const midW = fabX - hostX - hostW - innerW * 0.12;
          const hypH = Math.min(34, boxH * 0.28);
          drawVectorBox(ctx, midX, boxY + 4, midW, hypH, {
            color: "rgba(255, 184, 51, 0.45)",
            fill: "rgba(20, 14, 6, 0.45)",
            dash: [4, 4],
          });
          // Strike-through cross line
          ctx.strokeStyle = "rgba(255, 184, 51, 0.65)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(midX + 4, boxY + 4 + hypH - 4);
          ctx.lineTo(midX + midW - 4, boxY + 8);
          ctx.stroke();
          ctx.font = `500 ${compact ? 8 : 9}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#ffb833";
          ctx.textAlign = "center";
          ctx.fillText(
            compact ? "NO HYPERVISOR" : "HYPERVISOR BYPASSED",
            midX + midW * 0.5,
            boxY + hypH * 0.64,
          );
          ctx.textAlign = "left";

          // Direct Zero-Hypervisor Bus Rails (Host -> Cloud Fabric)
          const lane1Y = boxY + boxH * 0.56;
          const lane2Y = boxY + boxH * 0.78;
          ctx.strokeStyle = "#3dff9a";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#3dff9a";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(hostX + hostW, lane1Y);
          ctx.lineTo(fabX, lane1Y);
          ctx.stroke();

          ctx.strokeStyle = "#ffb833";
          ctx.shadowColor = "#ffb833";
          ctx.beginPath();
          ctx.moveTo(hostX + hostW, lane2Y);
          ctx.lineTo(fabX, lane2Y);
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.font = `500 ${compact ? 8 : 9}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#3dff9a";
          ctx.textAlign = "center";
          ctx.fillText("DIRECT FABRIC BUS", (hostX + hostW + fabX) * 0.5, lane1Y - 8);
          ctx.fillStyle = "#ffb833";
          ctx.fillText("STORAGE I/O BUS", (hostX + hostW + fabX) * 0.5, lane2Y - 8);
          ctx.textAlign = "left";

          // Live direct packets
          for (let p = 0; p < 3; p++) {
            const u = (t * 0.72 + p / 3) % 1;
            drawPacket(ctx, hostX + hostW + u * (fabX - hostX - hostW), lane1Y, "#3dff9a", 3.5);
            const u2 = (t * 0.55 + p / 3 + 0.16) % 1;
            drawPacket(ctx, fabX - u2 * (fabX - hostX - hostW), lane2Y, "#ffb833", 3.1);
          }

          // Cloud Network & Storage Fabric Block on right
          drawVectorBox(ctx, fabX, boxY, fabW, boxH, {
            color: "#3dff9a",
            fill: "rgba(6, 17, 13, 0.9)",
          });
          ctx.font = `600 ${compact ? 9 : 11}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#3dff9a";
          ctx.fillText(compact ? "CLOUD FABRIC" : "CLOUD FABRIC", fabX + 10, boxY + 18);

          drawVectorBox(ctx, fabX + 10, boxY + 26, fabW - 20, boxH * 0.32, {
            color: "rgba(61, 255, 154, 0.48)",
          });
          ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#e8f7ef";
          ctx.fillText("HIGH-SPEED NET", fabX + 16, boxY + 26 + boxH * 0.19);

          drawVectorBox(ctx, fabX + 10, boxY + boxH * 0.62, fabW - 20, boxH * 0.28, {
            color: "rgba(255, 184, 51, 0.55)",
          });
          ctx.fillStyle = "#ffb833";
          ctx.fillText("CLOUD STORAGE", fabX + 16, boxY + boxH * 0.79);

          // Bottom Direct Signal Trace
          const traceY = boxY + boxH + 26;
          const traceAmp = Math.min(18, (botY - traceY) * 0.65);
          ctx.beginPath();
          for (let i = 0; i <= 140; i++) {
            const u = i / 140;
            const x = padX + u * innerW;
            const v = Math.tanh(Math.sin(u * Math.PI * 16 - t * 5.0) * 3.5);
            const y = traceY - v * traceAmp;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "#3dff9a";
          ctx.lineWidth = 1.6;
          ctx.shadowColor = "#3dff9a";
          ctx.shadowBlur = 8;
          ctx.stroke();
        } else if (activeMode === "lifecycle") {
          // 5-Stage Lifecycle Pipeline Rail + 8 Physical Server Blades cycling states
          const states = ["PROV", "VERIFY", "LIVE", "DRAIN", "RECLAIM"];
          const stateColors = ["#7be3ff", "#ffb833", "#3dff9a", "#ffb833", "#7ba692"];
          const railY = topY + 14;
          const stW = (innerW - 24) / states.length;
          const activeStage = Math.floor(t * 0.9) % states.length;

          states.forEach((st, idx) => {
            const sx = padX + idx * (stW + 6);
            const isNow = idx === activeStage;
            drawVectorBox(ctx, sx, railY, stW, 24, {
              color: isNow ? stateColors[idx] : "rgba(61, 255, 154, 0.25)",
              fill: isNow ? "rgba(61, 255, 154, 0.14)" : "rgba(5, 12, 9, 0.85)",
              glow: isNow ? 8 : 0,
            });
            ctx.font = `600 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
            ctx.fillStyle = isNow ? stateColors[idx] : "#a8cfbc";
            ctx.textAlign = "center";
            ctx.fillText(st, sx + stW * 0.5, railY + 15);
          });
          ctx.textAlign = "left";

          // 8 Physical Server Blades (4x2 Rack Matrix)
          const gridTop = railY + 38;
          const gridH = botY - gridTop - 6;
          const cols = compact ? 2 : 4;
          const rows = compact ? 4 : 2;
          const gap = 10;
          const cellW = (innerW - (cols - 1) * gap) / cols;
          const cellH = (gridH - (rows - 1) * gap) / rows;

          for (let b = 0; b < 8; b++) {
            const col = b % cols;
            const row = Math.floor(b / cols);
            const bx = padX + col * (cellW + gap);
            const by = gridTop + row * (cellH + gap);

            const phaseVal = (t * 0.42 + b * 0.73) % states.length;
            const sIdx = Math.floor(phaseVal);
            const sFrac = phaseVal - sIdx;
            const colr = stateColors[sIdx];

            drawVectorBox(ctx, bx, by, cellW, cellH, {
              color: sIdx === 2 ? "#3dff9a" : colr,
              fill: "rgba(5, 13, 10, 0.88)",
              glow: sIdx === 2 ? 6 : 0,
            });

            ctx.font = `600 ${compact ? 8.5 : 10}px "IBM Plex Mono", monospace`;
            ctx.fillStyle = "#e8f7ef";
            ctx.fillText(`BLADE-0${b + 1}`, bx + 9, by + 16);

            ctx.fillStyle = colr;
            ctx.textAlign = "right";
            ctx.fillText(states[sIdx], bx + cellW - 9, by + 16);
            ctx.textAlign = "left";

            // Progress bar inside blade
            const barY = by + cellH - 14;
            const barW = cellW - 18;
            ctx.fillStyle = "rgba(61, 255, 154, 0.12)";
            ctx.fillRect(bx + 9, barY, barW, 5);
            ctx.fillStyle = colr;
            ctx.fillRect(bx + 9, barY, barW * (sIdx === 2 ? 1 : sFrac), 5);
          }
        } else if (activeMode === "e2e") {
          // Upper half: HOST NIC -> FABRIC -> CTRL PLANE -> PEER deterministic packet path
          const hops = ["HOST NIC", "FABRIC", "CTRL PLANE", "PEER"];
          const hopY = topY + 20;
          const hopH = 38;
          const hopW = compact ? innerW * 0.21 : innerW * 0.18;
          const spacing = (innerW - hopW * hops.length) / (hops.length - 1);
          const centers = [];

          for (let i = 0; i < hops.length; i++) {
            const hx = padX + i * (hopW + spacing);
            centers.push({ x: hx + hopW * 0.5, y: hopY + hopH * 0.5, left: hx, right: hx + hopW });
            drawVectorBox(ctx, hx, hopY, hopW, hopH, {
              color: i === 2 ? "#ffb833" : "#3dff9a",
              fill: "rgba(5, 13, 10, 0.92)",
            });
            ctx.font = `600 ${compact ? 7.5 : 9.5}px "IBM Plex Mono", monospace`;
            ctx.fillStyle = i === 2 ? "#ffb833" : "#e8f7ef";
            ctx.textAlign = "center";
            ctx.fillText(hops[i], hx + hopW * 0.5, hopY + hopH * 0.58);
          }
          ctx.textAlign = "left";

          // Connecting bus lines + deterministic equally-spaced packets
          for (let i = 0; i < centers.length - 1; i++) {
            const cA = centers[i];
            const cB = centers[i + 1];
            ctx.strokeStyle = "rgba(61, 255, 154, 0.5)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cA.right, cA.y);
            ctx.lineTo(cB.left, cB.y);
            ctx.stroke();

            const u = (t * 0.95 + i * 0.22) % 1;
            drawPacket(ctx, cA.right + u * (cB.left - cA.right), cA.y, "#3dff9a", 3.3);
          }

          // Lower half: Authentic Tektronix Open-Eye Diagram & Flat-Jitter Timing Trace
          const eyeTop = hopY + hopH + 22;
          const eyeH = botY - eyeTop - 6;
          const eyeMid = eyeTop + eyeH * 0.5;
          const eyeAmp = eyeH * 0.36;

          ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
          ctx.strokeRect(padX, eyeTop, innerW, eyeH);

          // Draw 4 overlaid clean differential eye traces (wide open deterministic eye)
          const eyeCurves = [1, -1, 0.96, -0.96];
          eyeCurves.forEach((pol, k) => {
            ctx.beginPath();
            const steps = 140;
            for (let s = 0; s <= steps; s++) {
              const u = s / steps;
              const x = padX + u * innerW;
              const phase = u * Math.PI * 4 - t * 2.2 + (k >= 2 ? 0.035 : 0);
              const val = Math.tanh(Math.sin(phase) * 2.4) * pol;
              const y = eyeMid - val * eyeAmp;
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = k < 2 ? "rgba(61, 255, 154, 0.85)" : "rgba(61, 255, 154, 0.28)";
            ctx.lineWidth = k < 2 ? 1.8 : 1;
            ctx.shadowColor = "#3dff9a";
            ctx.shadowBlur = k < 2 ? 8 : 0;
            ctx.stroke();
          });

          // Flat-jitter horizontal floor rail (Amber)
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#ffb833";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(padX + 6, eyeMid);
          ctx.lineTo(padX + innerW - 6, eyeMid);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#ffb833";
          ctx.fillText("OPEN-EYE DETERMINISTIC JITTER MARGIN", padX + 10, eyeTop + 15);
        } else {
          // BUS-D: CME LOW-LATENCY — Trading Gateways <-> Dedicated Bare-Metal Fabric <-> Matching Engine
          const gwW = innerW * 0.24;
          const engW = innerW * 0.24;
          const gwX = padX;
          const engX = w - padX - engW;
          const nodeY = topY + 14;
          const nodeH = 54;

          drawVectorBox(ctx, gwX, nodeY, gwW, nodeH, {
            color: "#3dff9a",
            fill: "rgba(5, 13, 10, 0.92)",
          });
          ctx.font = `600 ${compact ? 8 : 10}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#3dff9a";
          ctx.textAlign = "center";
          ctx.fillText(compact ? "TRADING GW" : "TRADING GATEWAY", gwX + gwW * 0.5, nodeY + 24);
          ctx.fillStyle = "#7ba692";
          ctx.font = `400 ${compact ? 7.5 : 8.5}px "IBM Plex Mono", monospace`;
          ctx.fillText("ORDER INGRESS", gwX + gwW * 0.5, nodeY + 40);

          drawVectorBox(ctx, engX, nodeY, engW, nodeH, {
            color: "#ffb833",
            fill: "rgba(12, 10, 5, 0.92)",
            glow: 8,
          });
          ctx.font = `600 ${compact ? 8 : 10}px "IBM Plex Mono", monospace`;
          ctx.fillStyle = "#ffb833";
          ctx.fillText(compact ? "MATCH ENG" : "MATCHING ENGINE", engX + engW * 0.5, nodeY + 24);
          ctx.fillStyle = "#a8cfbc";
          ctx.font = `400 ${compact ? 7.5 : 8.5}px "IBM Plex Mono", monospace`;
          ctx.fillText("CME MARKET CORE", engX + engW * 0.5, nodeY + 40);
          ctx.textAlign = "left";

          // Dedicated Bare-Metal Fabric bridge in center
          const bridgeL = gwX + gwW + 10;
          const bridgeR = engX - 10;
          const ordY = nodeY + 18;
          const ackY = nodeY + 38;

          ctx.strokeStyle = "#3dff9a";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(bridgeL, ordY);
          ctx.lineTo(bridgeR, ordY);
          ctx.stroke();

          ctx.strokeStyle = "#ffb833";
          ctx.beginPath();
          ctx.moveTo(bridgeL, ackY);
          ctx.lineTo(bridgeR, ackY);
          ctx.stroke();

          for (let p = 0; p < 3; p++) {
            const u = (t * 1.15 + p / 3) % 1;
            drawPacket(ctx, bridgeL + u * (bridgeR - bridgeL), ordY, "#3dff9a", 3.4);
            drawPacket(ctx, bridgeR - u * (bridgeR - bridgeL), ackY, "#ffb833", 3.2);
          }

          // Lower half: Phase-locked deterministic market-order pulse train
          const pulseTop = nodeY + nodeH + 22;
          const pulseH = botY - pulseTop - 6;
          const baseA = pulseTop + pulseH * 0.45;
          const baseB = pulseTop + pulseH * 0.86;
          const pAmp = pulseH * 0.34;
          const steps = 180;

          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const x = padX + u * innerW;
            const slot = ((u * 6 - t * 1.8) % 1 + 1) % 1;
            const spike = Math.exp(-Math.pow((slot - 0.5) * 20, 2));
            const y = baseA - spike * pAmp;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "#3dff9a";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#3dff9a";
          ctx.shadowBlur = 10;
          ctx.stroke();

          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const x = padX + u * innerW;
            const slot = ((u * 6 - t * 1.8) % 1 + 1) % 1;
            const spike = Math.exp(-Math.pow((slot - 0.53) * 22, 2));
            const y = baseB - spike * pAmp * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "#ffb833";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "#ffb833";
          ctx.shadowBlur = 9;
          ctx.stroke();
        }

        // Retrace flash on mode change (live frames only)
        if (!isStatic && flash > 0.01) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(61, 255, 154, ${flash * 0.16})`;
          ctx.fillRect(0, 0, w, h);
          flash = Math.max(0, flash - dt * 3.8);
        }
        ctx.restore();
      },
    );

    function setBusMode(mode) {
      if (!MODES[mode]) return;
      activeMode = mode;
      flash = motionEnabled ? 0.85 : 0;
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
      if (ctrl) ctrl.renderStatic();
    }

    switches.forEach((btn) =>
      btn.addEventListener("click", () => setBusMode(btn.dataset.busMode)),
    );
    cards.forEach((card) =>
      card.addEventListener("click", () => setBusMode(card.dataset.busCard)),
    );

    // Mini CME Group Order-Pulse Scope inside the CME module
    const cmeCanvas = $("#cme-scope");
    const cmeBezel = $(".cme-mini-bezel");
    if (cmeCanvas && cmeBezel) {
      createManagedCanvas(
        cmeCanvas,
        cmeBezel,
        (ctx, w, h) => {
          ctx.fillStyle = "#040907";
          ctx.fillRect(0, 0, w, h);
        },
        (ctx, w, h, t, _dt, isStatic) => {
          ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
          ctx.fillRect(0, 0, w, h);
          drawGraticule(ctx, w, h, 8, 4);

          const padX = 12;
          const gwX = padX;
          const engX = w - padX - 46;
          const railY = h * 0.52;

          drawVectorBox(ctx, gwX, railY - 14, 46, 28, { color: "#3dff9a" });
          drawVectorBox(ctx, engX, railY - 14, 46, 28, { color: "#ffb833" });

          ctx.font = '600 8.5px "IBM Plex Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillStyle = "#3dff9a";
          ctx.fillText("GW", gwX + 23, railY + 3);
          ctx.fillStyle = "#ffb833";
          ctx.fillText("MATCH", engX + 23, railY + 3);
          ctx.textAlign = "left";

          // Synchronized pulse trace spanning dedicated bare metal fabric
          const spanL = gwX + 46;
          const spanR = engX;
          const steps = 100;
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = i / steps;
            const x = spanL + u * (spanR - spanL);
            const slot = ((u * 4 - t * 1.9) % 1 + 1) % 1;
            const pulse = Math.exp(-Math.pow((slot - 0.5) * 18, 2));
            const y = railY + 8 - pulse * 26;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = "#ffb833";
          ctx.lineWidth = 1.7;
          ctx.shadowColor = "#ffb833";
          ctx.shadowBlur = 8;
          ctx.stroke();

          const pU = (t * 1.1) % 1;
          drawPacket(ctx, spanL + pU * (spanR - spanL), railY - 4, "#3dff9a", 3);
          drawPacket(ctx, spanR - pU * (spanR - spanL), railY + 9, "#ffb833", 2.8);
        },
      );
    }
  })();

  // =========================================================================
  // 3. SECTION 02: 7-CHANNEL PATCH-BAY & LIVE DOMAIN-TRUE PHOSPHOR OSCILLOSCOPE
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
        tl: "CH-01 // SEED · 5G UE + SIM/SEED CHIP + 5G CORE",
        tr: "INTERACTIVE FAULT RECOVERY",
        bl: "5G FAILURE → SIM APPLET OUT-OF-BAND DIAGNOSIS ↔ 5G CORE → BEARER RECOVERY",
        br: "SIM PINOUT MONITOR",
      },
      securesim: {
        badge: "CH-02",
        tabId: "tab-securesim",
        title: "SecureSIM",
        venue: "ACM MobiCom ’21",
        desc: "Authentication and fine-grained access control for SIM and eSIM. A certificate is authenticated, a request is checked against permissions, and authorized access reaches the SIM service.",
        linkText: "Read the MobiCom ’21 paper",
        linkHref: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
        tl: "CH-02 // SECURESIM · eSIM DIE + CERT & POLICY GATE",
        tr: "INTERACTIVE ACCESS CONTROL",
        bl: "VALID CERT UNLOCKS SCOPED PARTITION · UNAUTH REQ DEFLECTED AT POLICY GATE",
        br: "PARTITION ISOLATION",
      },
      gptcode: {
        badge: "CH-03",
        tabId: "tab-gptcode",
        title: "GPT-Code-Learner",
        venue: "OPEN SOURCE",
        desc: "Explore a codebase through questions, context, and GPT. Source code is searched by the context toolkit; the question and relevant repository context inform a GPT explanation.",
        linkText: "Explore on GitHub",
        linkHref: "https://github.com/JinghaoZhao/GPT-Code-Learner",
        tl: "CH-03 // GPT-CODE-LEARNER · AST CALL-GRAPH RETRIEVAL",
        tr: "INTERACTIVE QUERY TRACE",
        bl: "SELECT A QUERY ABOVE TO SWEEP REPOSITORY CALL-GRAPH (01 → 02 → 03)",
        br: "AST VECTOR ENGINE",
      },
      sonica: {
        badge: "CH-04",
        tabId: "tab-sonica",
        title: "Sonica",
        venue: "OPEN NB-IOT TESTBED",
        desc: "An open NB-IoT network for experiments with real devices. A commodity NB-IoT device communicates over the air with a software-defined eNodeB and a CIoT-enabled core, enabling OTA network research.",
        linkText: "Explore on GitHub",
        linkHref: "https://github.com/sonica-nbiot/sonica",
        tl: "CH-04 // SONICA · NB-IOT SPECTRUM & PHOSPHOR WATERFALL",
        tr: "SYNC · CONTROL · 12 UPLINK SUBCARRIERS",
        bl: "TUNE CH SLIDER OR EMIT SENSOR BURST TO DECODE LIVE NARROWBAND FRAMES",
        br: "SDR WATERFALL",
      },
      flora: {
        badge: "CH-05",
        tabId: "tab-flora",
        title: "Flora",
        venue: "OPEN MOBILE NETWORK",
        desc: "A software-defined mobile network spanning eSIM, radio, core, and edge. A configurable eSIM profile connects through the software-defined LTE RAN and core to an edge VR application, with network analytics across the platform.",
        linkText: "Explore the project",
        linkHref: "https://project-flora.github.io/Flora/",
        tl: "CH-05 // FLORA · 4-TIER PROGRAMMABLE CELLULAR STACK",
        tr: "TOGGLE LAYER HOOKS ABOVE",
        bl: "BIDIRECTIONAL PACKETS ACROSS eSIM ↔ RAN ↔ 5G CORE ↔ EDGE VR",
        br: "SDN HOOK MATRIX",
      },
      lrp: {
        badge: "CH-06",
        tabId: "tab-lrp",
        title: "Mobile VR Latency",
        venue: "USENIX NSDI ’21",
        desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion. Application-layer inference, DRX doze reduction, and proactive scheduling prepare the uplink ahead of data arrival.",
        linkText: "Read the NSDI ’21 paper",
        linkHref: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
        tl: "CH-06 // MOBILE VR LATENCY · 6DoF HEADSET & UL SCHEDULER",
        tr: "ILLUSTRATIVE TIMING · NOT A BENCHMARK",
        bl: "MOVE POINTER OVER SCOPE OR TOGGLE STANDARD (QUEUED LAG) VS PROACTIVE (LOCKED)",
        br: "MOTION-TO-PHOTON",
      },
      acemap: {
        badge: "CH-07",
        tabId: "tab-acemap",
        title: "Acemap",
        venue: "2,208 TOPICS · 19 DISCIPLINES",
        desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines. Load the original dataset on demand to sweep clusters, inspect neighbor links, and lock onto any topic.",
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

    // --- CH-01 SEED state ---
    let seedFaultAge = 99;
    let seedNextAuto = 4.2;
    const seedFaultBtn = $("#seed-fault-btn");
    const seedStatusEl = $("#seed-status");

    // --- CH-02 SecureSIM state ---
    let simAuthorized = true;
    let simPulseAge = 0;
    const simAllowBtn = $("#sim-auth-allow");
    const simDenyBtn = $("#sim-auth-deny");
    const simStatusEl = $("#sim-status");

    // --- CH-03 GPT-Code-Learner state ---
    const GPT_QUERIES = [
      {
        title: "Trace auth flow",
        path: [1, 2, 3],
        notes: [
          "01 router.dispatch() routes request",
          "02 auth.verify_token() checks cert",
          "03 sim_core.handle() serves partition",
        ],
      },
      {
        title: "Explain routing",
        path: [0, 1, 4],
        notes: [
          "01 repo/main.py boots pipeline",
          "02 router.dispatch() selects lane",
          "03 fabric.route_tx() forwards frame",
        ],
      },
      {
        title: "Find entry points",
        path: [0, 5, 6],
        notes: [
          "01 repo/main.py registers CLI",
          "02 context.index_ast() builds graph",
          "03 docs/spec.md maps module roles",
        ],
      },
    ];
    let gptQueryIdx = 0;
    let gptSweepProg = 0;
    const gptQueryBtns = $$("[data-gpt-query]");

    // --- CH-04 Sonica state ---
    let sonicaSubChannel = 5; // 1..12
    let sonicaBurstBoost = 0;
    const sonicaSlider = $("#sonica-tune-slider");
    const sonicaReadout = $("#sonica-ch-readout");
    const sonicaBurstBtn = $("#sonica-burst-btn");
    const wfCanvas = document.createElement("canvas");
    const wfCtx = wfCanvas.getContext("2d");
    wfCanvas.width = 420;
    wfCanvas.height = 140;

    // --- CH-05 Flora programmable layer hooks ---
    const floraHooks = {
      esim: true, // true = PROF-A, false = PROF-B
      ran: true, // true = DEDICATED SLICE, false = SHARED
      core: false, // true = LOCAL BREAKOUT, false = STD CORE
      edge: true, // true = EDGE OFFLOAD, false = LOCAL
    };
    const floraHookBtns = $$("[data-flora-hook]");

    // --- CH-06 Mobile VR Latency state ---
    let lrpMode = "proactive"; // "std" | "proactive" | "dual"
    let vrTargetYaw = 0;
    let vrTargetPitch = 0;
    let vrHeadYaw = 0;
    let vrHeadPitch = 0;
    let vrStdYaw = 0;
    let vrStdPitch = 0;
    let vrProYaw = 0;
    let vrProPitch = 0;
    let vrPointerInside = false;
    const lrpModeBtns = $$("[data-lrp-mode]");

    // --- CH-07 Acemap On-Demand 2,208-topic state ---
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
    const ACEMAP_SHORT = [
      "PSYCHOLOGY",
      "POL. SCI",
      "MATHEMATICS",
      "ENV. SCI",
      "COMPUTER SCI",
      "MEDICINE",
      "BIOLOGY",
      "HISTORY",
      "PHYSICS",
      "GEOLOGY",
      "ENGINEERING",
      "PHILOSOPHY",
      "ART",
      "SOCIOLOGY",
      "BUSINESS",
      "ECONOMICS",
      "CHEMISTRY",
      "MATERIALS",
      "GEOGRAPHY",
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
    let acemapCentroids = [];
    let acemapSelectedField = "all";
    let acemapHoverIdx = -1;
    let acemapSelectedIdx = -1;
    let acemapNeighborCache = { idx: -1, field: "all", neighbors: [] };

    const acemapLoadBtn = $("#acemap-load-btn");
    const acemapFieldWrap = $("#acemap-field-wrap");
    const acemapTopicWrap = $("#acemap-topic-wrap");
    const acemapFieldSelect = $("#acemap-field");
    const acemapTopicSelect = $("#acemap-topic");

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

    function getAcemapNeighbors(targetIdx) {
      if (
        acemapNeighborCache.idx === targetIdx &&
        acemapNeighborCache.field === acemapSelectedField
      ) {
        return acemapNeighborCache.neighbors;
      }
      const tp = acemapPoints[targetIdx];
      if (!tp) return [];
      const best = [];
      for (let i = 0; i < acemapPoints.length; i++) {
        if (i === targetIdx) continue;
        const p = acemapPoints[i];
        if (!isAcemapActive(p)) continue;
        const dx = p.nx - tp.nx;
        const dy = p.ny - tp.ny;
        const d2 = dx * dx + dy * dy;
        if (best.length < 6) {
          best.push({ i, d2 });
          best.sort((a, b) => a.d2 - b.d2);
        } else if (d2 < best[5].d2) {
          best[5] = { i, d2 };
          best.sort((a, b) => a.d2 - b.d2);
        }
      }
      const res = best.map((b) => b.i);
      acemapNeighborCache = {
        idx: targetIdx,
        field: acemapSelectedField,
        neighbors: res,
      };
      return res;
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
          blEl.textContent = `LOCK: ${pt.name} · ${ACEMAP_FIELDS[pt.field]} · 6 NEIGHBOR LINKS`;
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
        blEl.textContent = `RADAR LOCKED: ${label} · ${count.toLocaleString()} TOPICS · HOVER BLIP FOR NEIGHBORS`;
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

        const sums = Array.from({ length: ACEMAP_FIELDS.length }, () => ({
          x: 0,
          y: 0,
          n: 0,
        }));

        for (let i = 0; i < parsed.length; i++) {
          const p = parsed[i];
          p.nx = (p.x - midX) / halfSpan;
          p.ny = (p.y - midY) / halfSpan;
          p.ang = (Math.atan2(p.ny, p.nx) + Math.PI * 2) % (Math.PI * 2);
          sums[p.field].x += p.nx;
          sums[p.field].y += p.ny;
          sums[p.field].n += 1;
        }

        acemapCentroids = sums
          .map((s, fIdx) => ({
            field: fIdx,
            label: ACEMAP_SHORT[fIdx],
            count: s.n,
            nx: s.n ? s.x / s.n : 0,
            ny: s.n ? s.y / s.n : 0,
          }))
          .filter((c) => c.count > 0)
          .sort((a, b) => b.count - a.count);

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
        if (scopeCtrl) scopeCtrl.renderStatic();
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

    // =======================================================================
    // DOMAIN-TRUE PROTOCOL RENDERERS (CH-01 THROUGH CH-07)
    // =======================================================================

    // CH-01: SEED — 5G UE + SIM/SEED Chip Pinout + 5G Core Fault Diagnosis & Recovery
    function drawSeed(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) {
        seedFaultAge += dt;
        seedNextAuto -= dt;
        if (seedNextAuto <= 0 && seedFaultAge > 5.6) {
          seedFaultAge = 0;
          seedNextAuto = 12.0;
        }
      } else if (seedFaultAge > 10) {
        seedFaultAge = 2.0;
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const compact = w < 520;
      const padX = compact ? 14 : 28;
      const ueW = compact ? 64 : 88;
      const ueH = compact ? 104 : 124;
      const ueX = padX;
      const ueY = h * 0.23;

      const coreW = compact ? 74 : 104;
      const coreH = compact ? 104 : 124;
      const coreX = w - padX - coreW;
      const coreY = h * 0.23;

      const simW = compact ? 86 : 112;
      const simH = compact ? 76 : 92;
      const simX = w * 0.5 - simW * 0.5;
      const simY = h - simH - 46;

      // Determine choreography stage
      let stage = "locked"; // locked | fault | diag | recover
      let statusLabel = "5G BEARER: PHASE-LOCKED";
      if (seedFaultAge < 1.5) {
        stage = "fault";
        statusLabel = "ALERT: 5G BEARER FAILURE · UE REPORTS TO SIM";
      } else if (seedFaultAge < 3.4) {
        stage = "diag";
        statusLabel = "SIM/SEED ↔ 5G CORE: OUT-OF-BAND CAUSE INFERENCE";
      } else if (seedFaultAge < 5.0) {
        stage = "recover";
        statusLabel = "RECOVERY PULSE: SIM RE-LOCKING 5G BEARER";
      }
      if (seedStatusEl && seedStatusEl.textContent !== statusLabel) {
        seedStatusEl.textContent = statusLabel;
      }

      ctx.save();
      // 1. 5G UE / Device vector schematic (left)
      const ueColor = stage === "fault" ? "#ffb833" : "#3dff9a";
      drawVectorBox(ctx, ueX, ueY, ueW, ueH, {
        color: ueColor,
        fill: "rgba(5, 13, 10, 0.92)",
        glow: stage === "fault" ? 10 : 6,
      });
      // Screen & antenna mast
      ctx.strokeStyle = "rgba(61, 255, 154, 0.4)";
      ctx.strokeRect(ueX + 9, ueY + 14, ueW - 18, ueH * 0.56);
      ctx.strokeStyle = ueColor;
      ctx.beginPath();
      ctx.moveTo(ueX + ueW * 0.72, ueY);
      ctx.lineTo(ueX + ueW * 0.72, ueY - 14);
      ctx.stroke();
      ctx.font = `600 ${compact ? 9 : 10.5}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = ueColor;
      ctx.textAlign = "center";
      ctx.fillText("5G UE", ueX + ueW * 0.5, ueY + ueH - 12);
      if (stage === "fault") {
        ctx.fillStyle = "#ffb833";
        ctx.fillText("! DROP", ueX + ueW * 0.5, ueY + ueH * 0.45);
      } else {
        ctx.fillStyle = "#3dff9a";
        ctx.fillText("5G OK", ueX + ueW * 0.5, ueY + ueH * 0.45);
      }

      // 2. 5G Core stacked vector rack units (right)
      const coreColor = stage === "diag" ? "#ffb833" : "#3dff9a";
      drawVectorBox(ctx, coreX, coreY, coreW, coreH, {
        color: coreColor,
        fill: "rgba(5, 13, 10, 0.92)",
        glow: stage === "diag" ? 10 : 0,
      });
      for (let r = 0; r < 3; r++) {
        const ry = coreY + 14 + r * 24;
        ctx.strokeStyle = "rgba(61, 255, 154, 0.42)";
        ctx.strokeRect(coreX + 10, ry, coreW - 20, 16);
        ctx.fillStyle = r === 1 && stage === "diag" ? "#ffb833" : "#3dff9a";
        ctx.fillRect(coreX + 15, ry + 6, 4, 4);
      }
      ctx.font = `600 ${compact ? 9 : 10.5}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = coreColor;
      ctx.fillText("5G CORE", coreX + coreW * 0.5, coreY + coreH - 12);

      // 3. SIM / SEED Chip Pinout (center-bottom)
      const simColor = stage === "diag" || stage === "recover" ? "#ffb833" : "#3dff9a";
      drawSimChip(ctx, simX, simY, simW, simH, simColor, stage === "diag" ? 12 : 6);
      ctx.font = `600 ${compact ? 8.5 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#e8f7ef";
      ctx.fillText("SIM / SEED", simX + simW * 0.5, simY + simH - 7);
      ctx.textAlign = "left";

      // 4. Primary 5G Bearer Waveform between UE and 5G Core
      const linkL = ueX + ueW + 8;
      const linkR = coreX - 8;
      const linkY = ueY + ueH * 0.42;
      const amp = 24;
      const steps = 110;

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = linkL + u * (linkR - linkL);
        let y = linkY;
        if (stage === "fault") {
          const broken = u > 0.42 && u < 0.58;
          const noise = (Math.sin(u * 90 + t * 32) + Math.cos(u * 140 - t * 24)) * 16;
          y = linkY + (broken ? noise * 1.4 : noise * 0.55);
        } else if (stage === "diag") {
          y = linkY + Math.sin(u * 40 + t * 14) * 5;
        } else if (stage === "recover") {
          const k = (seedFaultAge - 3.4) / 1.6;
          y = linkY - Math.sin(u * Math.PI * 8 - t * 5.2) * amp * clamp(k, 0.2, 1);
        } else {
          y = linkY - Math.sin(u * Math.PI * 8 - t * 5.2) * amp;
        }
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = stage === "fault" ? "#ffb833" : stage === "diag" ? "rgba(255, 184, 51, 0.45)" : "#3dff9a";
      ctx.lineWidth = stage === "diag" ? 1.2 : 2.1;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = stage === "fault" ? "#ffb833" : "#3dff9a";
      ctx.fillText(
        stage === "fault"
          ? "✕ 5G CARRIER FRACTURED"
          : stage === "recover"
            ? "✓ RE-LOCKING 5G BEARER"
            : "5G DATA & CONTROL BEARER",
        (linkL + linkR) * 0.5,
        linkY - amp - 10,
      );

      // 5. Out-of-Band Control Bus: UE <-> SIM/SEED <-> 5G CORE
      const uePortX = ueX + ueW * 0.5;
      const uePortY = ueY + ueH;
      const corePortX = coreX + coreW * 0.5;
      const corePortY = coreY + coreH;
      const simLeftX = simX;
      const simRightX = simX + simW;
      const simMidY = simY + simH * 0.5;

      // Left leg: UE <-> SIM/SEED
      ctx.strokeStyle =
        stage === "fault" || stage === "recover"
          ? stage === "recover"
            ? "#3dff9a"
            : "#ffb833"
          : "rgba(61, 255, 154, 0.3)";
      ctx.lineWidth = stage === "fault" || stage === "recover" ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(uePortX, uePortY);
      ctx.lineTo(uePortX, simMidY);
      ctx.lineTo(simLeftX, simMidY);
      ctx.stroke();

      // Right leg: SIM/SEED <-> 5G Core
      ctx.strokeStyle = stage === "diag" ? "#ffb833" : "rgba(61, 255, 154, 0.3)";
      ctx.lineWidth = stage === "diag" ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(simRightX, simMidY);
      ctx.lineTo(corePortX, simMidY);
      ctx.lineTo(corePortX, corePortY);
      ctx.stroke();

      // Animated signals along out-of-band SIM paths
      if (stage === "fault") {
        const u = (seedFaultAge / 1.5) % 1;
        const px = u < 0.5 ? uePortX : uePortX + (u - 0.5) * 2 * (simLeftX - uePortX);
        const py = u < 0.5 ? uePortY + u * 2 * (simMidY - uePortY) : simMidY;
        drawPacket(ctx, px, py, "#ffb833", 4.2);
        ctx.fillStyle = "#ffb833";
        ctx.fillText("ERR REPORT", (uePortX + simLeftX) * 0.5, simMidY - 8);
      } else if (stage === "diag") {
        const u = ((seedFaultAge - 1.5) * 1.1) % 1;
        const px = u < 0.5 ? simRightX + u * 2 * (corePortX - simRightX) : corePortX;
        const py = u < 0.5 ? simMidY : simMidY - (u - 0.5) * 2 * (simMidY - corePortY);
        drawPacket(ctx, px, py, "#ffb833", 4.2);
        ctx.fillStyle = "#ffb833";
        ctx.fillText("CAUSE INFERENCE", (simRightX + corePortX) * 0.5, simMidY - 8);
      } else if (stage === "recover") {
        const u = ((seedFaultAge - 3.4) / 1.6) % 1;
        const px = u < 0.5 ? simLeftX - u * 2 * (simLeftX - uePortX) : uePortX;
        const py = u < 0.5 ? simMidY : simMidY - (u - 0.5) * 2 * (simMidY - uePortY);
        drawPacket(ctx, px, py, "#3dff9a", 4.4);
        ctx.fillStyle = "#3dff9a";
        ctx.fillText("RECOVERY ACTION", (uePortX + simLeftX) * 0.5, simMidY - 8);
      }

      ctx.textAlign = "left";
      ctx.restore();
    }

    // CH-02: SecureSIM — eSIM Chip Die + Cert/Policy Comparator Gate + 3 Isolated Partitions
    function drawSecureSim(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) simPulseAge = (simPulseAge + dt * 0.55) % 1;
      else simPulseAge = 0.65;

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const compact = w < 540;
      const padX = compact ? 12 : 24;
      const midY = h * 0.52;

      // Left: Incoming App Request Block
      const reqW = compact ? w * 0.25 : w * 0.22;
      const reqH = 92;
      const reqX = padX;
      const reqY = midY - reqH * 0.5;
      const reqColor = simAuthorized ? "#3dff9a" : "#ffb833";

      ctx.save();
      drawVectorBox(ctx, reqX, reqY, reqW, reqH, {
        color: reqColor,
        fill: "rgba(5, 13, 10, 0.92)",
        glow: 8,
      });
      ctx.font = `600 ${compact ? 8 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = reqColor;
      ctx.fillText(simAuthorized ? "APP REQUEST" : "UNAUTH APP", reqX + 10, reqY + 22);
      ctx.font = `400 ${compact ? 7.5 : 9}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#e8f7ef";
      ctx.fillText(simAuthorized ? "CERT: SIGNED" : "CERT: INVALID", reqX + 10, reqY + 44);
      ctx.fillStyle = "#a8cfbc";
      ctx.fillText(simAuthorized ? "PERM: SCOPED" : "PERM: OVER-PRIV", reqX + 10, reqY + 62);
      ctx.fillStyle = reqColor;
      ctx.fillText("TARGET: SLOT-2", reqX + 10, reqY + 80);

      // Center: Cryptographic Cert & Policy Comparator Gate
      const gateX = w * 0.47;
      const gateR = Math.min(w * 0.095, h * 0.16, 48);

      // Vertical Policy Barrier Wall
      ctx.strokeStyle = simAuthorized ? "rgba(61, 255, 154, 0.45)" : "#ffb833";
      ctx.lineWidth = simAuthorized ? 1.5 : 2.5;
      ctx.setLineDash(simAuthorized ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(gateX, 42);
      ctx.lineTo(gateX, h - 42);
      ctx.stroke();
      ctx.setLineDash([]);

      // Polar Comparator Dial
      ctx.fillStyle = "#040907";
      ctx.beginPath();
      ctx.arc(gateX, midY, gateR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = reqColor;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = reqColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Rotating cert phase-lock needle
      const sweep = t * 2.2;
      ctx.strokeStyle = reqColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(gateX, midY);
      ctx.lineTo(gateX + Math.cos(sweep) * (gateR - 6), midY + Math.sin(sweep) * (gateR - 6));
      ctx.stroke();

      ctx.font = `600 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = reqColor;
      ctx.fillText("CERT + POLICY", gateX, midY - gateR - 12);
      ctx.fillText(simAuthorized ? "PASS: ALLOWED" : "ALARM: DENIED", gateX, midY + gateR + 18);
      ctx.textAlign = "left";

      // Right: Chamfered eSIM / SIM Chip Die with 3 Isolated Partitions
      const dieW = compact ? w * 0.34 : w * 0.32;
      const dieH = Math.min(200, h - 98);
      const dieX = w - padX - dieW;
      const dieY = midY - dieH * 0.5;
      const cut = 18;

      ctx.beginPath();
      ctx.moveTo(dieX, dieY);
      ctx.lineTo(dieX + dieW - cut, dieY);
      ctx.lineTo(dieX + dieW, dieY + cut);
      ctx.lineTo(dieX + dieW, dieY + dieH);
      ctx.lineTo(dieX, dieY + dieH);
      ctx.closePath();
      ctx.fillStyle = "rgba(5, 13, 10, 0.94)";
      ctx.fill();
      ctx.strokeStyle = "#3dff9a";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.font = `600 ${compact ? 8.5 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#3dff9a";
      ctx.fillText("eSIM / SIM DIE", dieX + 10, dieY + 18);

      const parts = [
        { name: "CARRIER KEY", state: "ISOLATED", open: false },
        { name: "SCOPED SLOT-2", state: simAuthorized ? "ALLOWED" : "LOCKED", open: simAuthorized },
        { name: "ROOT VAULT", state: "ISOLATED", open: false },
      ];
      const partH = (dieH - 42) / 3;
      let targetSlotY = midY;

      parts.forEach((p, idx) => {
        const py = dieY + 28 + idx * (partH + 4);
        if (idx === 1) targetSlotY = py + partH * 0.5;
        drawVectorBox(ctx, dieX + 10, py, dieW - 20, partH - 4, {
          color: p.open ? "#3dff9a" : "rgba(123, 166, 146, 0.38)",
          fill: p.open ? "rgba(61, 255, 154, 0.14)" : "rgba(4, 9, 7, 0.9)",
          glow: p.open ? 10 : 0,
        });
        ctx.font = `600 ${compact ? 7.5 : 9}px "IBM Plex Mono", monospace`;
        ctx.fillStyle = p.open ? "#3dff9a" : "#7ba692";
        ctx.fillText(p.name, dieX + 16, py + partH * 0.48);
        ctx.textAlign = "right";
        ctx.fillText(p.state, dieX + dieW - 16, py + partH * 0.48);
        ctx.textAlign = "left";
      });

      // Request Packet Vector Trajectory
      const startX = reqX + reqW;
      const barrierHitX = gateX - gateR - 2;
      ctx.strokeStyle = "rgba(61, 255, 154, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(barrierHitX, midY);
      ctx.stroke();

      if (simAuthorized) {
        // Authorized path passes through comparator directly into SCOPED SLOT-2
        ctx.strokeStyle = "#3dff9a";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#3dff9a";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(gateX + gateR, midY);
        ctx.lineTo(dieX + 10, targetSlotY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const px = startX + simPulseAge * (dieX + 10 - startX);
        drawPacket(ctx, px, midY, "#3dff9a", 4.2);
      } else {
        // Unauthorized request hits policy barrier and gets deflected into amber alarm sparks
        if (simPulseAge < 0.55) {
          const u = simPulseAge / 0.55;
          drawPacket(ctx, startX + u * (barrierHitX - startX), midY, "#ffb833", 4.2);
        } else {
          const u = (simPulseAge - 0.55) / 0.45;
          const dx = barrierHitX - u * 54;
          const dy1 = midY - u * 48;
          const dy2 = midY + u * 48;
          ctx.strokeStyle = `rgba(255, 184, 51, ${1 - u})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(barrierHitX, midY);
          ctx.lineTo(dx, dy1);
          ctx.moveTo(barrierHitX, midY);
          ctx.lineTo(dx, dy2);
          ctx.stroke();
          drawPacket(ctx, dx, dy1, "#ffb833", 3.2);
        }
      }
      ctx.restore();
    }

    // CH-03: GPT-Code-Learner — Readable Repository Call-Graph + Interactive Query Retrieval (01 -> 02 -> 03)
    function drawGptCode(ctx, w, h, t, dt, isStatic) {
      if (!isStatic) {
        gptSweepProg = Math.min(1.15, gptSweepProg + dt * 0.48);
      } else {
        gptSweepProg = 1.0;
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.24)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const compact = w < 560;
      const graphW = compact ? w - 24 : w * 0.64;
      const graphX = 12;
      const topPad = 42;
      const botPad = compact ? 112 : 42;
      const graphH = h - topPad - botPad;

      const nodes = [
        { x: 0.16, y: 0.24, label: "repo/main.py" }, // 0
        { x: 0.44, y: 0.24, label: "router.dispatch()" }, // 1
        { x: 0.48, y: 0.56, label: "auth.verify_token()" }, // 2
        { x: 0.8, y: 0.72, label: "sim_core.handle()" }, // 3
        { x: 0.8, y: 0.28, label: "fabric.route_tx()" }, // 4
        { x: 0.22, y: 0.62, label: "context.index_ast()" }, // 5
        { x: 0.48, y: 0.86, label: "docs/spec.md" }, // 6
      ];
      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [1, 4],
        [0, 5],
        [5, 6],
        [5, 2],
      ];

      const q = GPT_QUERIES[gptQueryIdx];
      const path = q.path;
      const px = (n) => graphX + n.x * graphW;
      const py = (n) => topPad + n.y * graphH;

      ctx.save();
      // Base call-graph edges
      ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
      ctx.lineWidth = 1.1;
      edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(px(nodes[a]), py(nodes[a]));
        ctx.lineTo(px(nodes[b]), py(nodes[b]));
        ctx.stroke();
      });

      // Sweeping phosphor retrieval beam
      const beamX = graphX + clamp(gptSweepProg, 0, 1) * graphW;
      if (gptSweepProg < 1) {
        ctx.strokeStyle = "rgba(61, 255, 154, 0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(beamX, topPad);
        ctx.lineTo(beamX, topPad + graphH);
        ctx.stroke();
      }

      // Active query execution path (01 -> 02 -> 03)
      ctx.strokeStyle = "#3dff9a";
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#3dff9a";
      ctx.shadowBlur = 11;
      for (let i = 0; i < path.length - 1; i++) {
        const threshold = (i + 1) / path.length;
        if (gptSweepProg >= threshold * 0.55) {
          const nA = nodes[path[i]];
          const nB = nodes[path[i + 1]];
          ctx.beginPath();
          ctx.moveTo(px(nA), py(nA));
          ctx.lineTo(px(nB), py(nB));
          ctx.stroke();
          const pktU = (t * 0.8 + i * 0.35) % 1;
          drawPacket(
            ctx,
            px(nA) + (px(nB) - px(nA)) * pktU,
            py(nA) + (py(nB) - py(nA)) * pktU,
            "#ffb833",
            3.3,
          );
        }
      }
      ctx.shadowBlur = 0;

      // Render module boxes with readable labels + numbered step badges (01, 02, 03)
      ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      nodes.forEach((n, idx) => {
        const stepPos = path.indexOf(idx);
        const lit = stepPos >= 0 && gptSweepProg >= (stepPos + 0.3) / path.length;
        const cx = px(n);
        const cy = py(n);
        const tw = ctx.measureText(n.label).width;
        const bw = tw + 16;
        const bh = 24;

        drawVectorBox(ctx, cx - bw * 0.5, cy - bh * 0.5, bw, bh, {
          color: lit ? "#3dff9a" : "rgba(61, 255, 154, 0.35)",
          fill: lit ? "rgba(61, 255, 154, 0.14)" : "rgba(5, 12, 9, 0.94)",
          glow: lit ? 10 : 0,
        });
        ctx.fillStyle = lit ? "#e8f7ef" : "#7ba692";
        ctx.textAlign = "center";
        ctx.fillText(n.label, cx, cy + 3.5);

        if (lit) {
          // Numbered badge (01 / 02 / 03)
          ctx.fillStyle = "#ffb833";
          ctx.fillRect(cx - bw * 0.5 - 10, cy - bh * 0.5 - 8, 20, 14);
          ctx.fillStyle = "#040907";
          ctx.font = '700 8.5px "IBM Plex Mono", monospace';
          ctx.fillText(`0${stepPos + 1}`, cx - bw * 0.5, cy - bh * 0.5 + 2);
          ctx.font = `500 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
        }
      });
      ctx.textAlign = "left";

      // CRT Inline LLM Explanation Readout Panel
      const panelX = compact ? 14 : graphX + graphW + 14;
      const panelY = compact ? h - 104 : topPad + 10;
      const panelW = compact ? w - 28 : w - panelX - 16;
      const panelH = compact ? 66 : h - topPad - 58;

      drawVectorBox(ctx, panelX, panelY, panelW, panelH, {
        color: "#ffb833",
        fill: "rgba(8, 16, 12, 0.94)",
      });
      ctx.font = `600 ${compact ? 8.5 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#ffb833";
      ctx.fillText(`QUERY: "${q.title}"`, panelX + 10, panelY + 17);

      ctx.font = `400 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      q.notes.forEach((line, idx) => {
        const show = gptSweepProg >= (idx + 0.5) / 3;
        ctx.fillStyle = show ? "#e8f7ef" : "rgba(123, 166, 146, 0.35)";
        const ly = compact ? panelY + 32 + idx * 12 : panelY + 42 + idx * 30;
        if (ly < panelY + panelH - 4) {
          ctx.fillText(line, panelX + 10, ly);
        }
      });
      ctx.restore();
    }

    // CH-04: Sonica — Authentic NB-IoT Spectrum Analyzer (Sync/Control/12 Subcarriers) + Scrolling Waterfall
    function drawSonica(ctx, w, h, t, dt, isStatic) {
      if (!isStatic && sonicaBurstBoost > 0) {
        sonicaBurstBoost = Math.max(0, sonicaBurstBoost - dt * 1.4);
      }

      ctx.fillStyle = "#040907";
      ctx.fillRect(0, 0, w, h);

      const compact = w < 520;
      const topPad = 36;
      const splitY = Math.round(h * 0.53);
      const specH = splitY - topPad - 8;

      ctx.save();
      // Band lane dividers: SYNC PREAMBLE (0..0.18) | CONTROL CH (0.18..0.34) | 12 UPLINK SUBCARRIERS (0.34..0.96)
      const b1 = w * 0.2;
      const b2 = w * 0.36;
      const bEnd = w * 0.96;

      ctx.strokeStyle = "rgba(61, 255, 154, 0.12)";
      ctx.lineWidth = 1;
      [b1, b2, bEnd].forEach((bx) => {
        ctx.beginPath();
        ctx.moveTo(bx, topPad);
        ctx.lineTo(bx, splitY);
        ctx.stroke();
      });
      for (let j = 0; j <= 3; j++) {
        const gy = topPad + (j / 3) * specH;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Band header labels
      ctx.font = `600 ${compact ? 7.5 : 9}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#7be3ff";
      ctx.fillText(compact ? "SYNC" : "SYNC PREAMBLE", 12, topPad + 13);
      ctx.fillStyle = "#ffb833";
      ctx.fillText(compact ? "CTRL" : "CONTROL CH", b1 + 8, topPad + 13);
      ctx.fillStyle = "#3dff9a";
      ctx.fillText(
        compact
          ? `UL SUBCARRIERS [CH-${String(sonicaSubChannel).padStart(2, "0")}]`
          : `UPLINK SUBCARRIERS (12) · TUNED: SUB-${String(sonicaSubChannel).padStart(2, "0")}`,
        b2 + 8,
        topPad + 13,
      );

      // Compute NB-IoT spectrum bins
      const bins = 180;
      const spec = new Float32Array(bins);
      const tunedU = 0.36 + ((sonicaSubChannel - 0.5) / 12) * 0.6;
      const burstPulse = 0.65 + 0.35 * Math.sin(t * 4.4) + sonicaBurstBoost * 0.45;

      for (let i = 0; i < bins; i++) {
        const u = i / (bins - 1);
        const floor =
          0.07 + 0.03 * Math.sin(i * 2.1 + t * 12) + 0.025 * Math.cos(i * 5.1 - t * 18);
        // Sync preamble narrow carrier
        const syncTone = 0.55 * Math.exp(-Math.pow((u - 0.1) / 0.015, 2));
        // Control channel carrier
        const ctrlTone =
          (0.45 + 0.2 * Math.sin(t * 2.8)) * Math.exp(-Math.pow((u - 0.28) / 0.018, 2));
        // Active tuned uplink subcarrier burst from COTS IoT sensor
        const ulActive =
          clamp(burstPulse, 0.4, 1.0) *
          Math.exp(-Math.pow((u - tunedU) / 0.014, 2));
        // Adjacent secondary sensor traffic
        const peerU = 0.36 + (((sonicaSubChannel + 4) % 12 + 0.5) / 12) * 0.6;
        const ulPeer =
          (0.38 + 0.22 * Math.cos(t * 2.1)) *
          Math.exp(-Math.pow((u - peerU) / 0.013, 2));
        spec[i] = clamp(floor + syncTone + ctrlTone + ulActive + ulPeer, 0.04, 0.98);
      }

      // Draw live FFT spectrum trace
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const x = (i / (bins - 1)) * w;
        const y = splitY - 6 - spec[i] * (specH - 22);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#3dff9a";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#3dff9a";
      ctx.shadowBlur = 9;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Movable tuned subcarrier lock reticle
      const tuneX = tunedU * w;
      ctx.strokeStyle = "rgba(255, 184, 51, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tuneX, topPad + 18);
      ctx.lineTo(tuneX, h - 32);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update & draw scrolling phosphor waterfall spectrogram
      if (wfCtx) {
        const wfW = wfCanvas.width;
        const wfH = wfCanvas.height;
        const rowsToPush = isStatic ? 38 : 1;
        for (let r = 0; r < rowsToPush; r++) {
          wfCtx.drawImage(wfCanvas, 0, 0, wfW, wfH - 2, 0, 2, wfW, wfH - 2);
          for (let i = 0; i < bins; i++) {
            const val = spec[i];
            const bx = (i / bins) * wfW;
            const bwPx = Math.ceil(wfW / bins) + 1;
            if (val > 0.65) {
              wfCtx.fillStyle = `rgba(255, 184, 51, ${clamp(val, 0.55, 1)})`;
            } else if (val > 0.22) {
              wfCtx.fillStyle = `rgba(61, 255, 154, ${clamp(val * 1.25, 0.16, 0.95)})`;
            } else {
              wfCtx.fillStyle = `rgba(8, 30, 20, ${0.45 + val * 1.8})`;
            }
            wfCtx.fillRect(bx, 0, bwPx, 2);
          }
        }
        ctx.drawImage(wfCanvas, 0, splitY + 4, w, h - splitY - 32);
      }

      // Decoded IoT sensor frame callout badge
      const badgeW = compact ? 158 : 210;
      const badgeX = w - badgeW - 12;
      const badgeY = splitY + 12;
      drawVectorBox(ctx, badgeX, badgeY, badgeW, 38, {
        color: "#ffb833",
        fill: "rgba(4, 9, 7, 0.9)",
      });
      ctx.font = `600 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = "#ffb833";
      ctx.fillText(
        `DECODED: SUB-${String(sonicaSubChannel).padStart(2, "0")} · CRC OK`,
        badgeX + 8,
        badgeY + 15,
      );
      ctx.fillStyle = "#3dff9a";
      ctx.font = `400 ${compact ? 7.5 : 8.5}px "IBM Plex Mono", monospace`;
      ctx.fillText("COTS IoT BURST → SDR eNodeB", badgeX + 8, badgeY + 30);

      // Divider rule
      ctx.strokeStyle = "rgba(61, 255, 154, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, splitY + 2);
      ctx.lineTo(w, splitY + 2);
      ctx.stroke();
      ctx.restore();
    }

    // CH-05: Flora — 4-Tier Programmable Cellular Stack (eSIM -> RAN -> 5G CORE -> EDGE VR) with Live Hook Switching
    function drawFlora(ctx, w, h, t, _dt, isStatic) {
      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const compact = w < 520;
      const topPad = 36;
      const botPad = 34;
      const padX = compact ? 12 : 22;
      const tierGap = 8;
      const tierH = (h - topPad - botPad - tierGap * 3) / 4;
      const tierW = w - padX * 2;
      const labelW = compact ? 92 : 148;

      const tiers = [
        {
          id: "edge",
          title: "TIER 4 · EDGE VR",
          rule: floraHooks.edge ? "EDGE GPU OFFLOAD" : "LOCAL RENDER",
          active: floraHooks.edge,
          color: floraHooks.edge ? "#3dff9a" : "#7ba692",
        },
        {
          id: "core",
          title: "TIER 3 · 5G CORE",
          rule: floraHooks.core ? "LOCAL BREAKOUT" : "STANDARD EPC",
          active: floraHooks.core,
          color: floraHooks.core ? "#ffb833" : "#3dff9a",
        },
        {
          id: "ran",
          title: "TIER 2 · SDR RAN",
          rule: floraHooks.ran ? "DEDICATED SLICE" : "SHARED RADIO",
          active: floraHooks.ran,
          color: floraHooks.ran ? "#3dff9a" : "#ffb833",
        },
        {
          id: "esim",
          title: "TIER 1 · eSIM",
          rule: floraHooks.esim ? "PROFILE-A (5G)" : "PROFILE-B (LTE)",
          active: floraHooks.esim,
          color: floraHooks.esim ? "#3dff9a" : "#7be3ff",
        },
      ];

      ctx.save();
      const tierCenters = [];
      tiers.forEach((tr, idx) => {
        const ty = topPad + idx * (tierH + tierGap);
        tierCenters.push(ty + tierH * 0.5);

        drawVectorBox(ctx, padX, ty, tierW, tierH, {
          color: tr.active ? tr.color : "rgba(61, 255, 154, 0.28)",
          fill: "rgba(5, 13, 10, 0.88)",
        });

        // Left tier label block
        ctx.font = `600 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
        ctx.fillStyle = tr.color;
        ctx.fillText(tr.title, padX + 10, ty + tierH * 0.42);
        ctx.font = `400 ${compact ? 7.5 : 8.5}px "IBM Plex Mono", monospace`;
        ctx.fillStyle = "#e8f7ef";
        ctx.fillText(tr.rule, padX + 10, ty + tierH * 0.74);

        // Live waveform inside right signal area of each tier
        const sigX = padX + labelW;
        const sigW = tierW - labelW - 14;
        const sigMid = ty + tierH * 0.52;
        const sigAmp = tierH * 0.28;

        ctx.beginPath();
        const steps = 90;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const x = sigX + u * sigW;
          let val = 0;
          if (tr.id === "esim") {
            val = Math.tanh(Math.sin(u * Math.PI * (floraHooks.esim ? 12 : 6) - t * 4) * 3) * 0.65;
          } else if (tr.id === "ran") {
            // Dedicated slice = clean tight carrier; shared = noisier spread
            const carrier = Math.sin(u * Math.PI * 18 - t * 6.5);
            const spread = floraHooks.ran ? 0 : Math.sin(u * 45 + t * 14) * 0.4;
            val = (carrier * 0.7 + spread) * (0.65 + 0.35 * Math.sin(u * Math.PI));
          } else if (tr.id === "core") {
            val = Math.sin(u * Math.PI * (floraHooks.core ? 8 : 14) - t * 5.2) * 0.65;
          } else {
            val = floraHooks.edge
              ? Math.sin(u * Math.PI * 10 - t * 4.8) * 0.75
              : Math.sin(u * Math.PI * 4 - t * 2.2) * 0.35;
          }
          const y = sigMid - val * sigAmp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = 1.65;
        ctx.shadowColor = tr.color;
        ctx.shadowBlur = 7;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Vertical bidirectional packet rails climbing eSIM -> RAN -> CORE -> EDGE VR & returning
      const upX = padX + labelW + (tierW - labelW) * (floraHooks.esim ? 0.28 : 0.42);
      const dnX = padX + labelW + (tierW - labelW) * (floraHooks.core ? 0.66 : 0.78);

      // Uplink rail (bottom to top)
      ctx.strokeStyle = "rgba(61, 255, 154, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(upX, tierCenters[3]);
      ctx.lineTo(upX, tierCenters[0]);
      ctx.stroke();

      // Downlink rail (top to bottom) — local breakout takes an amber bypass arc!
      ctx.strokeStyle = floraHooks.core ? "#ffb833" : "rgba(255, 184, 51, 0.55)";
      ctx.lineWidth = floraHooks.core ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(dnX, tierCenters[0]);
      if (floraHooks.core) {
        ctx.quadraticCurveTo(dnX + 26, (tierCenters[0] + tierCenters[2]) * 0.5, dnX, tierCenters[2]);
        ctx.lineTo(dnX, tierCenters[3]);
      } else {
        ctx.lineTo(dnX, tierCenters[3]);
      }
      ctx.stroke();

      // Moving uplink (mint) and downlink (amber) packets
      const upProg = (t * 0.58) % 1;
      const upY = tierCenters[3] - upProg * (tierCenters[3] - tierCenters[0]);
      drawPacket(ctx, upX, upY, "#3dff9a", 4);

      const dnProg = (t * 0.58 + 0.5) % 1;
      const dnY = tierCenters[0] + dnProg * (tierCenters[3] - tierCenters[0]);
      const dnOffset =
        floraHooks.core && dnY < tierCenters[2]
          ? Math.sin(((dnY - tierCenters[0]) / (tierCenters[2] - tierCenters[0])) * Math.PI) * 14
          : 0;
      drawPacket(ctx, dnX + dnOffset, dnY, "#ffb833", 3.8);

      ctx.restore();
    }

    // CH-06: Mobile VR Latency — 6DoF VR Headset Wireframe + Wireless Uplink/Edge GPU/Downlink Loop
    function drawLrp(ctx, w, h, t, dt, isStatic) {
      // Smooth head rotation (pointer-driven inside scope or smooth autonomous 6DoF sway)
      const autoYaw = Math.sin(t * 1.35) * 0.72;
      const autoPitch = Math.cos(t * 0.95) * 0.34;
      const desYaw = vrPointerInside ? vrTargetYaw : autoYaw;
      const desPitch = vrPointerInside ? vrTargetPitch : autoPitch;

      if (isStatic) {
        vrHeadYaw = 0.55;
        vrHeadPitch = 0.18;
        vrStdYaw = -0.15;
        vrStdPitch = -0.08;
        vrProYaw = 0.52;
        vrProPitch = 0.17;
      } else {
        vrHeadYaw += (desYaw - vrHeadYaw) * Math.min(1, dt * 8);
        vrHeadPitch += (desPitch - vrHeadPitch) * Math.min(1, dt * 8);
        // Standard LTE lags noticeably due to DRX + reactive uplink scheduling
        vrStdYaw += (vrHeadYaw - vrStdYaw) * Math.min(1, dt * 1.45);
        vrStdPitch += (vrHeadPitch - vrStdPitch) * Math.min(1, dt * 1.45);
        // Proactive pre-allocated uplink tracks head pose tightly
        vrProYaw += (vrHeadYaw - vrProYaw) * Math.min(1, dt * 7.2);
        vrProPitch += (vrHeadPitch - vrProPitch) * Math.min(1, dt * 7.2);
      }

      ctx.fillStyle = isStatic ? "#040907" : "rgba(4, 9, 7, 0.22)";
      ctx.fillRect(0, 0, w, h);
      drawGraticule(ctx, w, h, 10, 6);

      const compact = w < 560;
      const hCx = compact ? w * 0.5 : w * 0.24;
      const hCy = compact ? h * 0.29 : h * 0.5;
      const hR = compact ? Math.min(w * 0.18, 56) : Math.min(w * 0.14, h * 0.26, 78);

      // Helper to project & draw a crisp 3D VR Headset Wireframe
      function drawHeadsetWireframe(cx, cy, r, yaw, pitch, color, dashed) {
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);

        // Visor box corners
        const verts = [
          [-0.9, -0.42, 0.45],
          [0.9, -0.42, 0.45],
          [0.9, 0.42, 0.45],
          [-0.9, 0.42, 0.45],
          [-0.78, -0.36, -0.35],
          [0.78, -0.36, -0.35],
          [0.78, 0.36, -0.35],
          [-0.78, 0.36, -0.35],
          // Bridge notch
          [0, 0.42, 0.45],
          [0, 0.16, 0.45],
        ];
        const proj = verts.map(([x, y, z]) => {
          const rx = x * cosY - z * sinY;
          const rz1 = x * sinY + z * cosY;
          const ry = y * cosP - rz1 * sinP;
          const rz = y * sinP + rz1 * cosP;
          const s = 2.6 / (2.6 - rz * 0.5);
          return [cx + rx * r * s, cy + ry * r * s];
        });
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
          [8, 9],
        ];
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = dashed ? 1.5 : 1.9;
        if (dashed) ctx.setLineDash([4, 4]);
        ctx.shadowColor = color;
        ctx.shadowBlur = dashed ? 6 : 10;
        ctx.beginPath();
        edges.forEach(([a, b]) => {
          ctx.moveTo(proj[a][0], proj[a][1]);
          ctx.lineTo(proj[b][0], proj[b][1]);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.save();
      // 6DoF Reticle Ring behind headset
      ctx.strokeStyle = "rgba(61, 255, 154, 0.2)";
      ctx.beginPath();
      ctx.arc(hCx, hCy, hR * 1.18, 0, Math.PI * 2);
      ctx.stroke();

      // Ghost rendered viewport lag wireframe
      if (lrpMode === "std" || lrpMode === "dual") {
        drawHeadsetWireframe(hCx, hCy, hR, vrStdYaw, vrStdPitch, "#ffb833", true);
      }
      if (lrpMode === "proactive" || lrpMode === "dual") {
        drawHeadsetWireframe(hCx, hCy, hR, vrProYaw, vrProPitch, "rgba(107, 255, 177, 0.65)", true);
      }
      // Actual head pose wireframe
      drawHeadsetWireframe(hCx, hCy, hR, vrHeadYaw, vrHeadPitch, "#3dff9a", false);

      ctx.font = `600 ${compact ? 8 : 9.5}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#3dff9a";
      ctx.fillText("6DoF HEAD POSE", hCx, hCy + hR * 1.32);
      if (lrpMode === "std" || lrpMode === "dual") {
        ctx.fillStyle = "#ffb833";
        ctx.fillText("AMBER GHOST: STD LAG", hCx, hCy + hR * 1.32 + 13);
      }
      ctx.textAlign = "left";

      // Right (or lower on mobile): Wireless Loop Pipeline + Uplink Scheduler Slot Timeline
      const pX = compact ? 14 : w * 0.44;
      const pW = compact ? w - 28 : w * 0.52;
      const pipeY = compact ? h * 0.56 : h * 0.25;

      const stages = ["POSE", "UL SCHED", "EDGE GPU", "DL", "DISPLAY"];
      const stW = (pW - 24) / stages.length;
      const stH = 34;

      stages.forEach((st, idx) => {
        const sx = pX + idx * (stW + 6);
        const isSched = idx === 1;
        const boxColor =
          isSched && lrpMode === "std" ? "#ffb833" : "#3dff9a";
        drawVectorBox(ctx, sx, pipeY, stW, stH, {
          color: boxColor,
          fill: isSched && lrpMode === "std" ? "rgba(255, 184, 51, 0.14)" : "rgba(5, 13, 10, 0.9)",
        });
        ctx.font = `600 ${compact ? 7 : 8.5}px "IBM Plex Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = boxColor;
        ctx.fillText(st, sx + stW * 0.5, pipeY + stH * 0.6);
      });
      ctx.textAlign = "left";

      // Packets traversing wireless loop
      const laneY = pipeY + stH + 16;
      ctx.strokeStyle = "rgba(61, 255, 154, 0.35)";
      ctx.beginPath();
      ctx.moveTo(pX, laneY);
      ctx.lineTo(pX + pW, laneY);
      ctx.stroke();

      if (lrpMode === "std" || lrpMode === "dual") {
        // Queued amber packets stalling at UL SCHED before bursting late
        for (let k = 0; k < 4; k++) {
          const raw = (t * 0.45 + k * 0.25) % 1;
          const stalled = raw < 0.48 ? 0.22 + (raw / 0.48) * 0.08 : 0.3 + ((raw - 0.48) / 0.52) * 0.7;
          drawPacket(ctx, pX + stalled * pW, laneY + 5, "#ffb833", 3.4);
        }
      }
      if (lrpMode === "proactive" || lrpMode === "dual") {
        // Unqueued smooth green packets flowing straight through pre-granted slots
        for (let k = 0; k < 4; k++) {
          const smooth = (t * 0.85 + k * 0.25) % 1;
          drawPacket(ctx, pX + smooth * pW, laneY - 5, "#3dff9a", 3.5);
        }
      }

      // Wireless Uplink Radio Slot Timeline below pipeline
      const tlY = laneY + 24;
      const tlH = Math.max(46, h - tlY - 40);
      drawVectorBox(ctx, pX, tlY, pW, tlH, {
        color: "rgba(61, 255, 154, 0.3)",
        fill: "rgba(4, 9, 7, 0.9)",
      });

      const slotCount = 12;
      const slotGap = pW / slotCount;
      for (let s = 0; s < slotCount; s++) {
        const sx = pX + ((s - (t * 2.2) % 1 + slotCount) % slotCount) * slotGap;
        if (lrpMode === "proactive" || lrpMode === "dual") {
          // Regular pre-granted mint uplink slots
          ctx.fillStyle = "rgba(61, 255, 154, 0.5)";
          ctx.fillRect(sx + 4, tlY + 18, Math.max(4, slotGap * 0.42), 10);
        }
        if (lrpMode === "std" || lrpMode === "dual") {
          // Irregular amber reactive slots with DRX doze gaps
          if (s % 4 === 0) {
            ctx.fillStyle = "rgba(255, 184, 51, 0.72)";
            ctx.fillRect(sx + 4, tlY + tlH - 16, Math.max(5, slotGap * 0.55), 10);
          }
        }
      }

      ctx.font = `500 ${compact ? 7.5 : 8.5}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = lrpMode === "std" ? "#ffb833" : "#3dff9a";
      ctx.fillText(
        lrpMode === "std"
          ? "STD LTE: DRX DOZE GAPS + QUEUED UPLINK GRANTS"
          : lrpMode === "proactive"
            ? "PROACTIVE: PRE-ALLOCATED UL GRANTS · ZERO-QUEUE LOCK"
            : "MINT: PROACTIVE PRE-GRANTS  |  AMBER: STD DRX GAPS",
        pX + 8,
        tlY + 12,
      );
      ctx.restore();
    }

    // CH-07: Acemap — 2,208-Topic Phosphor Radar + On-Canvas Discipline Cluster Labels + Neighbor Vector Links
    function drawAcemap(ctx, w, h, t, _dt, isStatic) {
      ctx.fillStyle = "#040907";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.51;
      const r = Math.min(w * 0.44, h * 0.4);
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

      // Rotating phosphor sweep wedge
      const wedgeSpan = 0.55;
      const steps = 14;
      for (let s = 0; s < steps; s++) {
        const a0 = sweepAngle - ((s + 1) / steps) * wedgeSpan;
        const a1 = sweepAngle - (s / steps) * wedgeSpan;
        const alpha = (1 - s / steps) * 0.11;
        ctx.fillStyle = `rgba(61, 255, 154, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(61, 255, 154, 0.72)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
      ctx.stroke();

      if (!acemapLoaded) {
        ctx.fillStyle = "rgba(61, 255, 154, 0.45)";
        for (let i = 0; i < 32; i++) {
          const ang = i * 2.39996;
          const rad = r * (0.18 + ((i * 37) % 78) / 100);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 2.2, 0, Math.PI * 2);
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
          ctx.fillStyle = "rgba(61, 255, 154, 0.055)";
          ctx.fillRect(px - 0.8, py - 0.8, 1.6, 1.6);
          continue;
        }

        const delta = (sweepAngle - p.ang + Math.PI * 2) % (Math.PI * 2);
        const ping = delta < 0.72 ? 1 - delta / 0.72 : 0;

        const baseColor = ACEMAP_CRT_COLORS[p.field] || "#3dff9a";
        ctx.fillStyle = ping > 0.65 ? "#ecfff5" : baseColor;
        const dotR = (p.size > 7 ? 2.15 : 1.5) + ping * 1.15;
        ctx.globalAlpha = 0.42 + ping * 0.58;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Crisp On-Canvas Discipline Cluster Labels (collision-deconflicted)
      const placedBoxes = [];
      ctx.font = `600 ${w < 520 ? 8 : 9}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      for (let i = 0; i < acemapCentroids.length; i++) {
        const c = acemapCentroids[i];
        if (acemapSelectedField !== "all" && c.field !== Number(acemapSelectedField)) {
          continue;
        }
        const lx = cx + c.nx * r * 0.92;
        const ly = cy + c.ny * r * 0.92;
        const tw = ctx.measureText(c.label).width + 8;
        const th = 14;
        const box = { x1: lx - tw * 0.5, y1: ly - 9, x2: lx + tw * 0.5, y2: ly + 5 };

        let collides = false;
        for (let b = 0; b < placedBoxes.length; b++) {
          const o = placedBoxes[b];
          if (!(box.x2 + 4 < o.x1 || box.x1 - 4 > o.x2 || box.y2 + 3 < o.y1 || box.y1 - 3 > o.y2)) {
            collides = true;
            break;
          }
        }
        if (collides) continue;
        placedBoxes.push(box);

        ctx.fillStyle = "rgba(4, 9, 7, 0.78)";
        ctx.fillRect(box.x1, box.y1, tw, th);
        ctx.strokeStyle = "rgba(61, 255, 154, 0.28)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(box.x1, box.y1, tw, th);
        ctx.fillStyle = ACEMAP_CRT_COLORS[c.field] || "#3dff9a";
        ctx.fillText(c.label, lx, ly + 1);
      }
      ctx.textAlign = "left";

      // Scholarly Vector Neighbor Links + Target Reticle on hovered or selected topic
      const focusIdx = acemapHoverIdx >= 0 ? acemapHoverIdx : acemapSelectedIdx;
      if (focusIdx >= 0 && acemapPoints[focusIdx]) {
        const fp = acemapPoints[focusIdx];
        const neighbors = getAcemapNeighbors(focusIdx);

        // Draw vector neighbor links in glowing amber/mint
        ctx.strokeStyle = "rgba(255, 184, 51, 0.72)";
        ctx.lineWidth = 1.2;
        neighbors.forEach((nIdx) => {
          const np = acemapPoints[nIdx];
          if (!np) return;
          ctx.beginPath();
          ctx.moveTo(fp.px, fp.py);
          ctx.lineTo(np.px, np.py);
          ctx.stroke();
          ctx.fillStyle = "#ffb833";
          ctx.beginPath();
          ctx.arc(np.px, np.py, 2.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Target reticle
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

        // Crisp focus badge
        ctx.shadowBlur = 0;
        const label = `${fp.name} [${ACEMAP_FIELDS[fp.field]}]`;
        ctx.font = '500 10.5px "IBM Plex Mono", monospace';
        const tw = ctx.measureText(label).width;
        const lx = clamp(fp.px + 14, 12, w - tw - 22);
        const ly = clamp(fp.py - 12, 42, h - 40);
        ctx.fillStyle = "rgba(4, 9, 7, 0.94)";
        ctx.fillRect(lx - 6, ly - 13, tw + 12, 19);
        ctx.strokeStyle = "rgba(255, 184, 51, 0.85)";
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

        // Crisp CRT horizontal retrace flash on channel switch (live frames only)
        if (!isStatic && retraceFlash > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(61, 255, 154, ${retraceFlash * 0.2})`;
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
      retraceFlash = motionEnabled ? 0.85 : 0;

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
        btn.setAttribute("aria-selected", String(btn.dataset.channel === chKey)),
      );
      matrixRows.forEach((row) =>
        row.classList.toggle("is-active", row.dataset.selectChannel === chKey),
      );
      ctrlGroups.forEach((grp) => {
        grp.hidden = grp.dataset.ctrlFor !== chKey;
      });

      if (chKey === "gptcode") gptSweepProg = 0.95;
      if (chKey === "acemap") updateAcemapReadout();

      if (scopeCtrl) {
        scopeCtrl.renderStatic();
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

    // CH-01 SEED fault button
    if (seedFaultBtn) {
      seedFaultBtn.addEventListener("click", () => {
        seedFaultAge = 0.45;
        seedNextAuto = 12.0;
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    }

    // CH-02 SecureSIM auth buttons
    if (simAllowBtn && simDenyBtn) {
      simAllowBtn.addEventListener("click", () => {
        simAuthorized = true;
        simPulseAge = 0.65;
        simAllowBtn.setAttribute("aria-pressed", "true");
        simDenyBtn.setAttribute("aria-pressed", "false");
        if (simStatusEl) simStatusEl.textContent = "GATE: SCOPED PARTITION ALLOWED";
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
      simDenyBtn.addEventListener("click", () => {
        simAuthorized = false;
        simPulseAge = 0.65;
        simAllowBtn.setAttribute("aria-pressed", "false");
        simDenyBtn.setAttribute("aria-pressed", "true");
        if (simStatusEl) simStatusEl.textContent = "GATE: UNAUTH REQUEST DENIED";
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    }

    // CH-03 GPT-Code-Learner query buttons
    gptQueryBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        gptQueryIdx = Number(btn.dataset.gptQuery) || 0;
        gptSweepProg = 0.62;
        gptQueryBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    });

    // CH-04 Sonica tuning dial & burst button
    if (sonicaSlider) {
      sonicaSlider.addEventListener("input", () => {
        sonicaSubChannel = clamp(Number(sonicaSlider.value) || 5, 1, 12);
        if (sonicaReadout) {
          sonicaReadout.textContent = `SUB-${String(sonicaSubChannel).padStart(2, "0")}`;
        }
        sonicaBurstBoost = 0.7;
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    }
    if (sonicaBurstBtn) {
      sonicaBurstBtn.addEventListener("click", () => {
        sonicaBurstBoost = 1.0;
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    }

    // CH-05 Flora programmable layer hook toggles
    const floraLabels = {
      esim: ["eSIM: PROF-B", "eSIM: PROF-A"],
      ran: ["RAN: SHARED", "RAN: SLICE"],
      core: ["CORE: STD", "CORE: BREAKOUT"],
      edge: ["EDGE: LOCAL", "EDGE: OFFLOAD"],
    };
    floraHookBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.floraHook;
        if (!(key in floraHooks)) return;
        floraHooks[key] = !floraHooks[key];
        btn.setAttribute("aria-pressed", String(floraHooks[key]));
        btn.textContent = floraLabels[key][floraHooks[key] ? 1 : 0];
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    });

    // CH-06 Mobile VR Latency mode buttons
    lrpModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        lrpMode = btn.dataset.lrpMode || "proactive";
        lrpModeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    });

    // CH-07 Acemap controls & canvas pointer interaction (Acemap reticle + Mobile VR head pose)
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
        if (scopeCtrl) scopeCtrl.renderStatic();
      });
    }

    if (acemapTopicSelect) {
      acemapTopicSelect.addEventListener("change", () => {
        acemapSelectedIdx =
          acemapTopicSelect.value === "" ? -1 : Number(acemapTopicSelect.value);
        acemapHoverIdx = -1;
        updateAcemapReadout();
        if (scopeCtrl) scopeCtrl.renderStatic();
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
        if (activeChannel === "lrp") {
          const rect = canvas.getBoundingClientRect();
          vrPointerInside = true;
          vrTargetYaw = clamp(((ev.clientX - rect.left) / rect.width) * 2 - 1, -1, 1) * 0.9;
          vrTargetPitch = clamp(((ev.clientY - rect.top) / rect.height) * 2 - 1, -1, 1) * 0.45;
          return;
        }
        if (activeChannel !== "acemap" || !acemapLoaded) return;
        const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 18);
        if (idx !== acemapHoverIdx) {
          acemapHoverIdx = idx;
          updateAcemapReadout();
          if (scopeCtrl) scopeCtrl.renderStatic();
        }
      },
      { passive: true },
    );

    canvas.addEventListener("pointerleave", () => {
      vrPointerInside = false;
      if (acemapHoverIdx >= 0) {
        acemapHoverIdx = -1;
        updateAcemapReadout();
        if (scopeCtrl) scopeCtrl.renderStatic();
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
        if (scopeCtrl) scopeCtrl.renderStatic();
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
