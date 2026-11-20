/* ==========================================================================
   Spatial Edition — Tactile Spatial OS & Playable Domain Micro-App Playground
   Vanilla JS, zero dependencies, offscreen-paused canvases, reduced-motion safe.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reduceMotionQuery.matches;

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // --------------------------------------------------------------------------
  // Canvas Utilities & Offscreen Pause Manager
  // --------------------------------------------------------------------------
  const animatedLoops = [];

  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSimChip(ctx, x, y, w, h, accentColor, label) {
    const cut = Math.min(10, w * 0.2);
    ctx.fillStyle = "#162137";
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Metallic contact pad cluster
    const px = x + w * 0.16;
    const py = y + h * 0.22;
    const pw = w * 0.68;
    const ph = h * 0.42;
    drawRoundedRect(ctx, px, py, pw, ph, 3);
    ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.72)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + pw / 3, py);
    ctx.lineTo(px + pw / 3, py + ph);
    ctx.moveTo(px + (pw * 2) / 3, py);
    ctx.lineTo(px + (pw * 2) / 3, py + ph);
    ctx.moveTo(px, py + ph / 2);
    ctx.lineTo(px + pw, py + ph / 2);
    ctx.stroke();

    if (label) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(label, x + w / 2, y + h - 5);
    }
  }

  function drawDarkGrid(ctx, w, h, step = 28) {
    ctx.fillStyle = "#0e1627";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  function drawNodeBox(ctx, x, y, w, h, title, sub, borderColor, bg = "#152036") {
    drawRoundedRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#f1f5f9";
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(title, x + w / 2, y + (sub ? h * 0.44 : h * 0.57));
    if (sub) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = '500 8.5px "JetBrains Mono", monospace';
      ctx.fillText(sub, x + w / 2, y + h * 0.76);
    }
  }

  function syncCanvasSize(canvas, cssHeight) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width || canvas.width));
    const h = Math.round(cssHeight || rect.height || canvas.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(w * dpr) ||
      canvas.height !== Math.round(h * dpr)
    ) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function registerCanvasLoop(canvas, onFrame) {
    if (!canvas) return null;
    const entry = {
      canvas,
      onFrame,
      visible: true,
      rafId: 0,
      lastTime: 0,
      drawOnce() {
        onFrame(performance.now(), 0.016, true);
      },
      start() {
        if (reducedMotion || !entry.visible || entry.rafId) return;
        entry.lastTime = performance.now();
        const tick = (now) => {
          if (!entry.visible || reducedMotion) {
            entry.rafId = 0;
            return;
          }
          const dt = Math.min((now - entry.lastTime) / 1000, 0.05);
          entry.lastTime = now;
          onFrame(now, dt, false);
          entry.rafId = requestAnimationFrame(tick);
        };
        entry.rafId = requestAnimationFrame(tick);
      },
      stop() {
        if (entry.rafId) {
          cancelAnimationFrame(entry.rafId);
          entry.rafId = 0;
        }
      },
    };

    animatedLoops.push(entry);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const item of entries) {
            entry.visible = item.isIntersecting;
            if (entry.visible && !reducedMotion) entry.start();
            else entry.stop();
          }
        },
        { threshold: 0.02 }
      );
      io.observe(canvas);
    }

    entry.drawOnce();
    if (!reducedMotion) entry.start();
    return entry;
  }

  reduceMotionQuery.addEventListener("change", (ev) => {
    reducedMotion = ev.matches;
    for (const loop of animatedLoops) {
      if (reducedMotion) {
        loop.stop();
        loop.drawOnce();
      } else if (loop.visible) {
        loop.start();
      }
    }
  });

  // --------------------------------------------------------------------------
  // Spring-Sliding Segmented Controls
  // --------------------------------------------------------------------------
  function positionSegmentThumb(segmentEl) {
    if (!segmentEl) return;
    const thumb = $(".seg-thumb", segmentEl);
    const active = $(".seg-btn.is-active", segmentEl);
    if (!thumb || !active) return;
    if (getComputedStyle(thumb).display === "none") return;
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
  }

  function syncAllSegments() {
    $$(".spring-segment").forEach(positionSegmentThumb);
  }

  window.addEventListener("resize", () => {
    syncAllSegments();
    animatedLoops.forEach((loop) => loop.drawOnce());
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncAllSegments);
  }

  // --------------------------------------------------------------------------
  // Top Chrome Scroll State & Active Nav Highlight
  // --------------------------------------------------------------------------
  const osBar = $("#os-bar");
  const navLinks = $$(".os-nav a");
  const navTargets = navLinks
    .map((a) => ({ link: a, el: $(a.getAttribute("href")) }))
    .filter((item) => item.el);

  let scrollTicking = false;
  function updateNavOnScroll() {
    scrollTicking = false;
    const y = window.scrollY;
    if (osBar) osBar.classList.toggle("is-scrolled", y > 24);
    let current = navTargets[0]?.el.id || "";
    const threshold = window.innerHeight * 0.34;
    for (const item of navTargets) {
      if (item.el.getBoundingClientRect().top <= threshold) {
        current = item.el.id;
      }
    }
    for (const item of navTargets) {
      if (item.el.id === current) {
        item.link.setAttribute("aria-current", "location");
      } else {
        item.link.removeAttribute("aria-current");
      }
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateNavOnScroll);
      }
    },
    { passive: true }
  );
  updateNavOnScroll();

  function spotlightElement(el) {
    if (!el) return;
    el.classList.remove("is-spotlight");
    void el.offsetWidth;
    el.classList.add("is-spotlight");
    setTimeout(() => el.classList.remove("is-spotlight"), 1500);
  }

  // --------------------------------------------------------------------------
  // HERO WORKBENCH: 4-Mode GCE Bare Metal Rack & CME Dedicated Fabric
  // --------------------------------------------------------------------------
  const rackConsole = $("#rack-console");
  const rackScope = $("#rack-scope");
  const rackScopeTitle = $("#rack-scope-title");
  const rackReadout = $("#rack-readout");
  const rackDetail = $("#rack-detail");
  const rackLed = $("#rack-led");
  const rackModeButtons = $$("[data-rack-select]");
  const bladeButtons = $$("[data-blade]");
  const pulseBtn = $("#rack-pulse-btn");

  const lifecycleStages = ["PROVISION", "VERIFY", "ACTIVE", "DRAIN", "RECLAIM"];

  const rackModesMeta = {
    host: {
      scopeTitle: "HOST & FABRIC · 0 HYPERVISOR",
      detail:
        "Dedicated physical CPU & NIC wired directly to cloud storage and network fabric — zero hypervisor layer.",
    },
    lifecycle: {
      scopeTitle: "FLEET LIFECYCLE · AUTOMATED STATE MACHINE",
      detail:
        "Blades auto-step Provision → Verify → Active → Drain → Reclaim. Click any blade above to advance/drain it.",
    },
    e2e: {
      scopeTitle: "END-TO-END BEHAVIOR · FLAT-JITTER FABRIC",
      detail:
        "Deterministic packet flow across Host NIC → ToR Switch → Control Plane → Peer with steady timing trace.",
    },
    cme: {
      scopeTitle: "GOOGLE CLOUD × CME GROUP · DEDICATED FABRIC",
      detail:
        "Ultra-low-latency market-order and execution pulses across dedicated bare metal between gateway & matching engine.",
    },
  };

  const rackState = {
    mode: "host", // "host" | "lifecycle" | "e2e" | "cme"
    bladesOnline: [true, true, true, true],
    bladeStages: [2, 1, 0, 3], // indices into lifecycleStages
    lifecycleClock: 0,
    phase: 0,
    burst: 0,
  };

  function syncRackBladesUI() {
    const isLC = rackState.mode === "lifecycle";
    bladeButtons.forEach((btn, idx) => {
      const stage = rackState.bladeStages[idx];
      const online = isLC ? stage !== 4 : rackState.bladesOnline[idx];
      btn.classList.toggle("is-active", online);
      btn.setAttribute("aria-pressed", String(online));
      btn.dataset.stage = String(stage);
      const stateEl = $(".blade-state", btn);
      if (stateEl) {
        stateEl.textContent = isLC
          ? lifecycleStages[stage]
          : online
            ? "ACTIVE"
            : "ISOLATED";
      }
    });

    const activeCount = isLC
      ? rackState.bladeStages.filter((s) => s === 2).length
      : rackState.bladesOnline.filter(Boolean).length;

    if (rackLed) {
      rackLed.className =
        activeCount === 0 && !isLC
          ? "led led-coral"
          : rackState.mode === "cme"
            ? "led led-emerald"
            : "led led-blue";
    }
    if (rackReadout) {
      rackReadout.textContent = isLC
        ? `${activeCount}/4 IN ACTIVE WORKLOAD`
        : `${activeCount}/4 BLADES ONLINE`;
    }
  }

  function setRackMode(mode) {
    if (!rackModesMeta[mode]) return;
    rackState.mode = mode;
    rackState.burst = 1.0;
    if (rackConsole) rackConsole.dataset.rackMode = mode;
    rackModeButtons.forEach((btn) => {
      const match = btn.dataset.rackSelect === mode;
      btn.classList.toggle("is-active", match);
      btn.setAttribute("aria-pressed", String(match));
    });
    positionSegmentThumb($('[data-segment="rack"]'));
    if (rackScopeTitle) rackScopeTitle.textContent = rackModesMeta[mode].scopeTitle;
    if (rackDetail) rackDetail.textContent = rackModesMeta[mode].detail;
    syncRackBladesUI();
    if (rackLoop && reducedMotion) rackLoop.drawOnce();
  }

  rackModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setRackMode(btn.dataset.rackSelect));
  });

  // Pillar "Inspect on Rack" & CME jump buttons
  $$("[data-jump-rack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setRackMode(btn.dataset.jumpRack);
      jumpTo("#rack");
    });
  });

  function triggerRackBurst() {
    rackState.burst = 1.0;
    bladeButtons.forEach((btn, idx) => {
      btn.classList.remove("is-pulsing");
      void btn.offsetWidth;
      setTimeout(() => {
        btn.classList.add("is-pulsing");
        setTimeout(() => btn.classList.remove("is-pulsing"), 320);
      }, idx * 55);
    });
    if (rackLoop && reducedMotion) rackLoop.drawOnce();
  }

  bladeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.blade);
      rackState.burst = 0.85;
      if (rackState.mode === "lifecycle") {
        rackState.bladeStages[idx] =
          (rackState.bladeStages[idx] + 1) % lifecycleStages.length;
        if (rackDetail) {
          rackDetail.textContent = `BM-0${idx + 1} transitioned to ${lifecycleStages[rackState.bladeStages[idx]]} stage.`;
        }
      } else {
        rackState.bladesOnline[idx] = !rackState.bladesOnline[idx];
        if (rackDetail) {
          rackDetail.textContent = `BM-0${idx + 1} switched ${rackState.bladesOnline[idx] ? "ONLINE" : "to ISOLATED maintenance"}.`;
        }
      }
      syncRackBladesUI();
      if (rackLoop && reducedMotion) rackLoop.drawOnce();
    });
  });

  if (pulseBtn) pulseBtn.addEventListener("click", triggerRackBurst);
  syncRackBladesUI();

  const rackLoop = registerCanvasLoop(rackScope, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(rackScope, 182);
    if (!ctx) return;

    const compact = w < 380;
    if (!isStatic) {
      rackState.phase += dt * 1.4;
      rackState.burst = Math.max(0, rackState.burst - dt * 1.3);
      if (rackState.mode === "lifecycle") {
        rackState.lifecycleClock += dt;
        if (rackState.lifecycleClock > 2.4) {
          rackState.lifecycleClock = 0;
          const pick = Math.floor(rackState.phase) % 4;
          rackState.bladeStages[pick] =
            (rackState.bladeStages[pick] + 1) % lifecycleStages.length;
          syncRackBladesUI();
        }
      }
    }

    drawDarkGrid(ctx, w, h, 28);
    ctx.textAlign = "center";

    if (rackState.mode === "host") {
      // Dedicated Physical CPU + Direct NIC -> [0 HYPERVISOR] -> Cloud Fabric / Storage I/O
      const pad = compact ? 10 : 18;
      const boxW = compact ? 96 : 138;
      const leftX = pad;
      const rightX = w - pad - boxW;
      const topY = 26;
      const boxH = 52;

      drawNodeBox(
        ctx,
        leftX,
        topY,
        boxW,
        boxH,
        compact ? "PHYSICAL CPU" : "DEDICATED CPU",
        "Bare Metal Silicon",
        "#3b82f6"
      );
      drawNodeBox(
        ctx,
        leftX,
        topY + 68,
        boxW,
        boxH,
        "DIRECT NIC",
        "Line-Rate I/O",
        "#10b981"
      );

      drawNodeBox(
        ctx,
        rightX,
        topY,
        boxW,
        boxH,
        compact ? "CLOUD FABRIC" : "NETWORK FABRIC",
        "Direct VPC Path",
        "#3b82f6"
      );
      drawNodeBox(
        ctx,
        rightX,
        topY + 68,
        boxW,
        boxH,
        "STORAGE I/O",
        "Block & NVMe",
        "#10b981"
      );

      const x1 = leftX + boxW;
      const x2 = rightX;
      const lanes = [topY + 26, topY + 94];

      // Direct physical lanes
      lanes.forEach((ly, i) => {
        ctx.strokeStyle = i === 0 ? "rgba(59,130,246,0.45)" : "rgba(16,185,129,0.45)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, ly);
        ctx.lineTo(x2, ly);
        ctx.stroke();

        // Direct packets
        for (let k = 0; k < 3; k++) {
          const t = (rackState.phase * (0.55 + rackState.burst * 0.25) + k / 3 + i * 0.17) % 1;
          const px = x1 + (x2 - x1) * t;
          ctx.fillStyle = i === 0 ? "#60a5fa" : "#34d399";
          ctx.beginPath();
          ctx.arc(px, ly, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Center 0 HYPERVISOR badge
      const midX = w / 2;
      const midY = h / 2 - 4;
      const pillW = compact ? 102 : 126;
      drawRoundedRect(ctx, midX - pillW / 2, midY - 15, pillW, 30, 15);
      ctx.fillStyle = "#0b2e26";
      ctx.fill();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "#6ee7b7";
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillText("0 HYPERVISOR", midX, midY + 3.5);
    } else if (rackState.mode === "lifecycle") {
      // 5-Stage Automated Fleet Pipeline
      const pad = compact ? 10 : 18;
      const cols = 5;
      const gap = compact ? 5 : 8;
      const stageW = (w - pad * 2 - gap * (cols - 1)) / cols;
      const stageY = 24;
      const stageH = 42;
      const shortLabels = compact
        ? ["PROV", "VERIF", "ACTIVE", "DRAIN", "RECL"]
        : lifecycleStages;
      const stageColors = ["#3b82f6", "#38bdf8", "#10b981", "#f59e0b", "#64748b"];

      // Connector spine
      ctx.strokeStyle = "rgba(148,163,184,0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad + stageW / 2, stageY + stageH / 2);
      ctx.lineTo(w - pad - stageW / 2, stageY + stageH / 2);
      ctx.stroke();

      for (let i = 0; i < cols; i++) {
        const sx = pad + i * (stageW + gap);
        const countHere = rackState.bladeStages.filter((s) => s === i).length;
        drawRoundedRect(ctx, sx, stageY, stageW, stageH, 8);
        ctx.fillStyle = countHere > 0 ? "rgba(30, 41, 59, 0.95)" : "#131d31";
        ctx.fill();
        ctx.strokeStyle = countHere > 0 ? stageColors[i] : "rgba(148,163,184,0.22)";
        ctx.lineWidth = countHere > 0 ? 1.8 : 1;
        ctx.stroke();
        ctx.fillStyle = countHere > 0 ? "#ffffff" : "#94a3b8";
        ctx.font = `700 ${compact ? 8 : 9}px "JetBrains Mono", monospace`;
        ctx.fillText(shortLabels[i], sx + stageW / 2, stageY + 24);
      }

      // 4 blade rows below showing live state progress bar
      rackState.bladeStages.forEach((stage, bIdx) => {
        const rowY = 82 + bIdx * 23;
        const barX = pad + 44;
        const barW = w - pad * 2 - 48;
        ctx.fillStyle = "#cbd5e1";
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = "left";
        ctx.fillText(`BM-0${bIdx + 1}`, pad, rowY + 11);

        drawRoundedRect(ctx, barX, rowY + 2, barW, 12, 6);
        ctx.fillStyle = "rgba(148,163,184,0.12)";
        ctx.fill();

        const targetX = barX + ((stage + 0.5) / cols) * barW;
        drawRoundedRect(ctx, barX, rowY + 2, Math.max(14, targetX - barX), 12, 6);
        ctx.fillStyle = stageColors[stage];
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(targetX, rowY + 8, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.textAlign = "center";
    } else if (rackState.mode === "e2e") {
      // Top: Host NIC -> ToR -> Control Plane -> Peer
      const pad = compact ? 8 : 16;
      const nodes = compact
        ? ["NIC", "ToR", "CTRL", "PEER"]
        : ["HOST NIC", "ToR SWITCH", "CTRL PLANE", "CLOUD PEER"];
      const boxW = (w - pad * 2 - 30) / 4;
      const yTop = 20;
      const boxH = 44;

      // Link line
      ctx.strokeStyle = "rgba(59,130,246,0.45)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pad + boxW / 2, yTop + boxH / 2);
      ctx.lineTo(w - pad - boxW / 2, yTop + boxH / 2);
      ctx.stroke();

      // Synchronized deterministic packets
      for (let k = 0; k < 4; k++) {
        const t = (rackState.phase * 0.55 + k / 4) % 1;
        const px = pad + boxW / 2 + (w - pad * 2 - boxW) * t;
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(px, yTop + boxH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      nodes.forEach((label, i) => {
        const nx = pad + i * (boxW + 10);
        drawNodeBox(ctx, nx, yTop, boxW, boxH, label, "", i === 2 ? "#10b981" : "#3b82f6");
      });

      // Bottom: Flat-jitter deterministic timing trace
      const traceY = 128;
      ctx.strokeStyle = "rgba(148,163,184,0.22)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, traceY);
      ctx.lineTo(w - pad, traceY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = pad; x <= w - pad; x += 3) {
        const nx = (x - pad) / (w - pad * 2);
        const beat = Math.sin(nx * 26 - rackState.phase * 4.2) * 3.2;
        const pulsePos = (rackState.phase * 0.5) % 1;
        const d = Math.abs(nx - pulsePos);
        const blip = Math.exp(-(d * d) / 0.0012) * (16 + rackState.burst * 10);
        const y = traceY - blip + beat;
        if (x === pad) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "#6ee7b7";
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = "left";
      ctx.fillText("FLAT-JITTER DETERMINISTIC TRACE", pad, 166);
      ctx.textAlign = "center";
    } else {
      // CME Dedicated Fabric: Trading Gateway <-> Dedicated Bare Metal Fabric <-> Matching Engine
      const pad = compact ? 10 : 18;
      const endW = compact ? 92 : 128;
      const boxH = 88;
      const boxY = 38;
      const leftX = pad;
      const rightX = w - pad - endW;

      drawNodeBox(
        ctx,
        leftX,
        boxY,
        endW,
        boxH,
        compact ? "GATEWAY" : "TRADING GW",
        "Market Orders",
        "#3b82f6"
      );
      drawNodeBox(
        ctx,
        rightX,
        boxY,
        endW,
        boxH,
        compact ? "MATCHING" : "CME ENGINE",
        "Order Matching",
        "#10b981"
      );

      const x1 = leftX + endW;
      const x2 = rightX;
      const upperY = boxY + 28;
      const lowerY = boxY + 62;

      // Dedicated Order Lane (L -> R)
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x1, upperY);
      ctx.lineTo(x2, upperY);
      ctx.stroke();

      // Execution Ack Lane (R -> L)
      ctx.strokeStyle = "rgba(16,185,129,0.5)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x1, lowerY);
      ctx.lineTo(x2, lowerY);
      ctx.stroke();

      // Tight ultra-fast pulse trains
      const speed = 0.85 + rackState.burst * 0.45;
      for (let k = 0; k < 4; k++) {
        const tOut = (rackState.phase * speed + k / 4) % 1;
        const ox = x1 + (x2 - x1) * tOut;
        ctx.fillStyle = "#60a5fa";
        drawRoundedRect(ctx, ox - 8, upperY - 3, 16, 6, 3);
        ctx.fill();

        const tIn = (rackState.phase * speed + k / 4 + 0.12) % 1;
        const ix = x2 - (x2 - x1) * tIn;
        ctx.fillStyle = "#34d399";
        drawRoundedRect(ctx, ix - 8, lowerY - 3, 16, 6, 3);
        ctx.fill();
      }

      ctx.fillStyle = "#93c5fd";
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      ctx.fillText("ORDER FLOW →", (x1 + x2) / 2, upperY - 10);
      ctx.fillStyle = "#6ee7b7";
      ctx.fillText("← FILL / EXEC", (x1 + x2) / 2, lowerY + 18);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.fillText("DEDICATED BARE METAL FABRIC · ZERO SHARED HOPS", w / 2, 164);
    }
  });

  // --------------------------------------------------------------------------
  // MINI-APP 1: SEED — 5G UE + SIM/SEED Chip + 5G Core Failure Recovery
  // --------------------------------------------------------------------------
  const seedStage = $(".seed-stage");
  const seedCanvas = $("#seed-canvas");
  const seedLed = $("#seed-led");
  const seedStatus = $("#seed-status");
  const seedFaultBtn = $("#seed-fault-btn");
  const seedBtnLabel = $("#seed-btn-label");
  const seedSteps = $$("[data-seed-step]");

  const seedState = {
    mode: "healthy", // "healthy" | "fault" | "diagnosing" | "recovered"
    phase: 0,
    timers: [],
  };

  function clearSeedTimers() {
    seedState.timers.forEach((id) => clearTimeout(id));
    seedState.timers = [];
  }

  function setSeedSteps(states) {
    seedSteps.forEach((el, idx) => {
      el.classList.remove("is-fault", "is-active", "is-done");
      if (states[idx]) el.classList.add(states[idx]);
    });
  }

  function triggerSeedFault() {
    clearSeedTimers();
    seedState.mode = "fault";
    if (seedStage) seedStage.dataset.seedState = "fault";
    if (seedLed) seedLed.className = "led led-coral";
    if (seedStatus) seedStatus.textContent = "5G BEARER FRACTURED · SIM ALERTED";
    if (seedFaultBtn) seedFaultBtn.setAttribute("aria-pressed", "true");
    if (seedBtnLabel) seedBtnLabel.textContent = "Failure Active…";
    setSeedSteps(["is-fault", "", ""]);
    if (seedLoop && reducedMotion) seedLoop.drawOnce();

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "diagnosing";
        if (seedStage) seedStage.dataset.seedState = "diagnosing";
        if (seedLed) seedLed.className = "led led-blue";
        if (seedStatus) {
          seedStatus.textContent = "SIM/SEED + 5G CORE · INFERRING CAUSE";
        }
        if (seedBtnLabel) seedBtnLabel.textContent = "SIM Diagnosing…";
        setSeedSteps(["is-done", "is-active", ""]);
        if (seedLoop && reducedMotion) seedLoop.drawOnce();
      }, 1050)
    );

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "recovered";
        if (seedStage) seedStage.dataset.seedState = "healthy";
        if (seedLed) seedLed.className = "led led-emerald";
        if (seedStatus) {
          seedStatus.textContent = "SIM RECOVERY ACTION · 5G ONLINE";
        }
        if (seedFaultBtn) seedFaultBtn.setAttribute("aria-pressed", "false");
        if (seedBtnLabel) seedBtnLabel.textContent = "Inject 5G Failure";
        setSeedSteps(["is-done", "is-done", "is-done"]);
        if (seedLoop && reducedMotion) seedLoop.drawOnce();
      }, 2400)
    );

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "healthy";
        if (seedStatus) seedStatus.textContent = "5G BEARER HEALTHY · SIM ARMED";
      }, 4800)
    );
  }

  if (seedFaultBtn) seedFaultBtn.addEventListener("click", triggerSeedFault);
  if (seedCanvas) seedCanvas.addEventListener("click", triggerSeedFault);

  const seedLoop = registerCanvasLoop(seedCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(seedCanvas, 184);
    if (!ctx) return;
    if (!isStatic) seedState.phase += dt * 1.5;

    const compact = w < 380;
    drawDarkGrid(ctx, w, h, 26);

    const ueX = compact ? 16 : 28;
    const ueY = 26;
    const ueW = compact ? 64 : 78;
    const ueH = 90;

    const coreW = compact ? 76 : 96;
    const coreH = 82;
    const coreX = w - (compact ? 16 : 28) - coreW;
    const coreY = 28;

    const simW = compact ? 72 : 84;
    const simH = 54;
    const simX = w / 2 - simW / 2;
    const simY = h - simH - 14;

    const isFault = seedState.mode === "fault";
    const isDiag = seedState.mode === "diagnosing";
    const isRec = seedState.mode === "recovered";

    // Top 5G Bearer between UE and 5G Core
    const bY = ueY + 26;
    const bX1 = ueX + ueW + 6;
    const bX2 = coreX - 6;

    if (isFault || isDiag) {
      // Fractured broken coral 5G link
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(bX1, bY);
      ctx.lineTo((bX1 + bX2) / 2 - 14, bY);
      ctx.moveTo((bX1 + bX2) / 2 + 14, bY);
      ctx.lineTo(bX2, bY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Break symbol "✕"
      const mx = (bX1 + bX2) / 2;
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(mx - 6, bY - 6);
      ctx.lineTo(mx + 6, bY + 6);
      ctx.moveTo(mx + 6, bY - 6);
      ctx.lineTo(mx - 6, bY + 6);
      ctx.stroke();

      ctx.fillStyle = "#fda4af";
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("5G BEARER DOWN", mx, bY - 12);
    } else {
      // Healthy emerald 5G link
      ctx.strokeStyle = "rgba(16,185,129,0.5)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(bX1, bY);
      ctx.lineTo(bX2, bY);
      ctx.stroke();

      for (let k = 0; k < 3; k++) {
        const t = (seedState.phase * 0.6 + k / 3) % 1;
        const px = bX1 + (bX2 - bX1) * t;
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(px, bY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#6ee7b7";
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(
        isRec ? "5G LINK RESTORED" : "ACTIVE 5G BEARER",
        (bX1 + bX2) / 2,
        bY - 10
      );
    }

    // UE <-> SIM path
    const ueSimX1 = ueX + ueW / 2;
    const ueSimY1 = ueY + ueH;
    const ueSimX2 = simX;
    const ueSimY2 = simY + simH / 2;
    ctx.strokeStyle = isFault
      ? "#f43f5e"
      : isRec
        ? "#10b981"
        : "rgba(148,163,184,0.28)";
    ctx.lineWidth = isFault || isRec ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.moveTo(ueSimX1, ueSimY1);
    ctx.lineTo(ueSimX1, ueSimY2);
    ctx.lineTo(ueSimX2, ueSimY2);
    ctx.stroke();

    if (isFault) {
      const t = (seedState.phase * 1.1) % 1;
      const px = ueSimX1 + (ueSimX2 - ueSimX1) * t;
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(px, ueSimY2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (isRec) {
      const t = (seedState.phase * 1.1) % 1;
      const px = ueSimX2 - (ueSimX2 - ueSimX1) * t;
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.arc(px, ueSimY2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // SIM <-> 5G Core out-of-band diagnosis path
    const simCoreX1 = simX + simW;
    const simCoreY1 = simY + simH / 2;
    const simCoreX2 = coreX + coreW / 2;
    const simCoreY2 = coreY + coreH;
    ctx.strokeStyle = isDiag ? "#3b82f6" : "rgba(148,163,184,0.28)";
    ctx.lineWidth = isDiag ? 2.5 : 1.4;
    ctx.beginPath();
    ctx.moveTo(simCoreX1, simCoreY1);
    ctx.lineTo(simCoreX2, simCoreY1);
    ctx.lineTo(simCoreX2, simCoreY2);
    ctx.stroke();

    if (isDiag) {
      const t = (seedState.phase * 1.2) % 1;
      const px = simCoreX1 + (simCoreX2 - simCoreX1) * t;
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(px, simCoreY1, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("CAUSE INFERENCE", (simCoreX1 + simCoreX2) / 2, simCoreY1 - 9);
    }

    // Draw 5G Device / UE
    drawRoundedRect(ctx, ueX, ueY, ueW, ueH, 10);
    ctx.fillStyle = "#162137";
    ctx.fill();
    ctx.strokeStyle = isFault ? "#f43f5e" : "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Screen inset
    drawRoundedRect(ctx, ueX + 7, ueY + 11, ueW - 14, ueH - 34, 4);
    ctx.fillStyle = "#0b1220";
    ctx.fill();
    // Signal bars
    for (let b = 0; b < 4; b++) {
      const bh = 6 + b * 4;
      ctx.fillStyle = isFault || isDiag ? "#f43f5e" : "#10b981";
      ctx.fillRect(ueX + 16 + b * 9, ueY + 46 - bh, 5, bh);
    }
    ctx.fillStyle = "#e2e8f0";
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("5G UE", ueX + ueW / 2, ueY + ueH - 7);

    // Draw 5G Core rack blades
    drawRoundedRect(ctx, coreX, coreY, coreW, coreH, 8);
    ctx.fillStyle = "#162137";
    ctx.fill();
    ctx.strokeStyle = isDiag ? "#3b82f6" : "#64748b";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (let r = 0; r < 3; r++) {
      const ry = coreY + 10 + r * 18;
      drawRoundedRect(ctx, coreX + 8, ry, coreW - 16, 12, 3);
      ctx.fillStyle = "#0e1729";
      ctx.fill();
      ctx.fillStyle = isDiag ? "#60a5fa" : "#10b981";
      ctx.beginPath();
      ctx.arc(coreX + 15, ry + 6, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#e2e8f0";
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.fillText("5G CORE", coreX + coreW / 2, coreY + coreH - 7);

    // Draw SIM / SEED Chip
    const simAccent = isFault ? "#f43f5e" : isDiag ? "#3b82f6" : "#10b981";
    drawSimChip(ctx, simX, simY, simW, simH, simAccent, "SIM / SEED");
  });

  // --------------------------------------------------------------------------
  // MINI-APP 2: SecureSIM — eSIM Chip, Cryptographic Policy Gate & Partitions
  // --------------------------------------------------------------------------
  const simStage = $(".securesim-stage");
  const simCanvas = $("#sim-canvas");
  const simPresetBtns = $$("[data-sim-preset]");
  const simRequestBtn = $("#sim-request-btn");
  const simVerdict = $("#sim-verdict");
  const simReason = $("#sim-reason");

  const simState = {
    preset: "valid", // "valid" | "unauthorized"
    progress: 0,
    phase: 0,
  };

  function setSimPreset(preset, triggerShake = false) {
    simState.preset = preset === "unauthorized" ? "unauthorized" : "valid";
    simState.progress = 0;
    const allowed = simState.preset === "valid";
    if (simStage) {
      simStage.dataset.access = allowed ? "allowed" : "denied";
      if (!allowed && triggerShake) {
        simStage.classList.remove("is-shake");
        void simStage.offsetWidth;
        simStage.classList.add("is-shake");
      }
    }
    simPresetBtns.forEach((btn) => {
      const active = btn.dataset.simPreset === simState.preset;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    positionSegmentThumb($('[data-segment="securesim"]'));

    if (simVerdict) simVerdict.textContent = allowed ? "ALLOWED" : "DENIED";
    if (simReason) {
      simReason.textContent = allowed
        ? "Signed cert verified · routed strictly to scoped NET AUTH partition"
        : "Unsigned or over-privileged app deflected by SIM cryptographic policy gate";
    }
    if (simLoop && reducedMotion) simLoop.drawOnce();
  }

  simPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => setSimPreset(btn.dataset.simPreset, true));
  });

  if (simRequestBtn) {
    simRequestBtn.addEventListener("click", () => {
      simState.progress = 0;
      if (simState.preset === "unauthorized" && simStage) {
        simStage.classList.remove("is-shake");
        void simStage.offsetWidth;
        simStage.classList.add("is-shake");
      }
      if (simLoop && reducedMotion) simLoop.drawOnce();
    });
  }

  const simLoop = registerCanvasLoop(simCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(simCanvas, 184);
    if (!ctx) return;

    const allowed = simState.preset === "valid";
    if (!isStatic) {
      simState.phase += dt * 1.4;
      simState.progress = (simState.progress + dt * 0.58) % 1;
    } else if (reducedMotion) {
      simState.progress = allowed ? 0.78 : 0.56;
    }

    const compact = w < 380;
    drawDarkGrid(ctx, w, h, 26);

    const pad = compact ? 10 : 18;
    const appW = compact ? 76 : 94;
    const appH = 66;
    const appX = pad;
    const appY = h / 2 - appH / 2;

    const gateX = w * 0.43;
    const gateY = 22;
    const gateH = h - 44;

    const chipW = compact ? 122 : 162;
    const chipH = h - 32;
    const chipX = w - pad - chipW;
    const chipY = 16;

    // App Request source box
    drawNodeBox(
      ctx,
      appX,
      appY,
      appW,
      appH,
      "APP REQ",
      allowed ? "Signed Cert" : "Excess Scope",
      allowed ? "#3b82f6" : "#f43f5e"
    );

    // Cryptographic Policy Gate
    ctx.strokeStyle = allowed ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gateX, gateY);
    ctx.lineTo(gateX, gateY + gateH);
    ctx.stroke();

    // Policy gate header badge
    drawRoundedRect(ctx, gateX - 38, gateY - 4, 76, 20, 10);
    ctx.fillStyle = allowed ? "#0b2e26" : "#3b101b";
    ctx.fill();
    ctx.strokeStyle = allowed ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = allowed ? "#6ee7b7" : "#fda4af";
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("POLICY GATE", gateX, gateY + 9);

    // Draw eSIM Chip body with chamfered corner & 3 partitions
    const cut = 14;
    ctx.fillStyle = "#152036";
    ctx.strokeStyle = allowed ? "#3b82f6" : "#64748b";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(chipX + cut, chipY);
    ctx.lineTo(chipX + chipW, chipY);
    ctx.lineTo(chipX + chipW, chipY + chipH);
    ctx.lineTo(chipX, chipY + chipH);
    ctx.lineTo(chipX, chipY + cut);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillText("eSIM PARTITIONS", chipX + chipW / 2, chipY + 16);

    // 3 isolated partitions inside eSIM
    const parts = [
      { name: "NET AUTH", unlocked: allowed },
      { name: "CARRIER KEYS", unlocked: false },
      { name: "PAYMENT SE", unlocked: false },
    ];
    const partH = 34;
    const partGap = 8;
    parts.forEach((p, i) => {
      const py = chipY + 26 + i * (partH + partGap);
      drawRoundedRect(ctx, chipX + 10, py, chipW - 20, partH, 6);
      ctx.fillStyle = p.unlocked ? "rgba(16,185,129,0.2)" : "#0e1627";
      ctx.fill();
      ctx.strokeStyle = p.unlocked ? "#10b981" : "rgba(148,163,184,0.26)";
      ctx.lineWidth = p.unlocked ? 1.8 : 1;
      ctx.stroke();

      ctx.fillStyle = p.unlocked ? "#6ee7b7" : "#94a3b8";
      ctx.font = `700 ${compact ? 8 : 9}px "JetBrains Mono", monospace`;
      ctx.textAlign = "left";
      ctx.fillText(p.name, chipX + 18, py + 20);
      ctx.textAlign = "right";
      ctx.fillStyle = p.unlocked ? "#34d399" : "#64748b";
      ctx.fillText(p.unlocked ? "OPEN" : "LOCKED", chipX + chipW - 18, py + 20);
    });
    ctx.textAlign = "center";

    // Request packet animation
    const startX = appX + appW;
    const startY = h / 2;
    const targetY = chipY + 26 + partH / 2; // NET AUTH partition
    const endX = chipX + 10;

    if (allowed) {
      // Smooth path through policy gate into ONLY NET AUTH partition
      ctx.strokeStyle = "rgba(16,185,129,0.38)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(gateX, startY);
      ctx.lineTo(endX, targetY);
      ctx.stroke();

      const t = simState.progress;
      let px, py;
      if (t < 0.5) {
        const u = t / 0.5;
        px = startX + (gateX - startX) * u;
        py = startY;
      } else {
        const u = (t - 0.5) / 0.5;
        px = gateX + (endX - gateX) * u;
        py = startY + (targetY - startY) * u;
      }
      ctx.fillStyle = t < 0.5 ? "#60a5fa" : "#34d399";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText(t < 0.5 ? "CERT" : "OK", px, py - 10);
    } else {
      // Packet travels to gate, hits barrier, bounces/deflects downward-left!
      const t = simState.progress;
      let px, py;
      if (t < 0.5) {
        const u = t / 0.5;
        px = startX + (gateX - 8 - startX) * u;
        py = startY;
      } else {
        const u = (t - 0.5) / 0.5;
        px = gateX - 8 - u * 56;
        py = startY + u * 44;
        // Impact shockwave ring at gate
        ctx.strokeStyle = `rgba(244, 63, 94, ${Math.max(0, 1 - u * 1.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gateX, startY, 8 + u * 24, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fda4af";
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.fillText(t >= 0.5 ? "BLOCKED" : "UNAUTH", px, py - 10);
    }
  });

  // --------------------------------------------------------------------------
  // MINI-APP 3: GPT-Code-Learner — AST/Module Call-Graph + Code Trace
  // --------------------------------------------------------------------------
  const codeGraphCanvas = $("#code-graph-canvas");
  const codePane = $("#code-pane");
  const codeLinesEl = $("#code-lines");
  const codePathTag = $("#code-path-tag");
  const codeAnswerText = $("#code-answer-text");
  const promptChips = $$("[data-code-q]");

  const codeNodes = [
    { id: "entry", label: "entry.py", nx: 0.14, ny: 0.5 },
    { id: "router", label: "router.py", nx: 0.42, ny: 0.26 },
    { id: "auth", label: "auth.py", nx: 0.42, ny: 0.74 },
    { id: "context", label: "context.py", nx: 0.74, ny: 0.74 },
    { id: "fabric", label: "fabric.py", nx: 0.74, ny: 0.26 },
    { id: "sim_core", label: "sim_core.py", nx: 0.88, ny: 0.5 },
  ];

  const codeEdges = [
    ["entry", "router"],
    ["entry", "auth"],
    ["router", "fabric"],
    ["router", "sim_core"],
    ["auth", "context"],
    ["context", "sim_core"],
    ["fabric", "sim_core"],
  ];

  const codeQueries = {
    auth: {
      path: ["entry", "auth", "context"],
      tag: "PATH 1 → 2 → 3 · entry.py → auth.py → context.py",
      lines: [
        { text: "# [1] entry.py -> [2] auth.py -> [3] context.py", hl: true },
        { text: "token = parse_bearer(req.headers)", hl: true },
        { text: "claims = auth.verify(token)", hl: true },
        { text: "return context.bind(claims, req.repo)", hl: false },
      ],
      answer:
        "Starts at <code>entry.py</code>, verifies bearer credentials in <code>auth.py</code>, and binds the caller scope inside <code>context.py</code>.",
    },
    routing: {
      path: ["entry", "router", "fabric"],
      tag: "PATH 1 → 2 → 3 · entry.py → router.py → fabric.py",
      lines: [
        { text: "# [1] entry.py -> [2] router.py -> [3] fabric.py", hl: true },
        { text: "route = router.resolve(req.path)", hl: true },
        { text: "lane = fabric.select_channel(route)", hl: true },
        { text: "return lane.dispatch(req)", hl: false },
      ],
      answer:
        "Resolves incoming paths in <code>router.py</code> and hands off directly to the channel dispatcher inside <code>fabric.py</code>.",
    },
    sim: {
      path: ["router", "context", "sim_core"],
      tag: "PATH 1 → 2 → 3 · router.py → context.py → sim_core.py",
      lines: [
        { text: "# [1] router.py -> [2] context.py -> [3] sim_core.py", hl: true },
        { text: "ctx = context.search_symbols(repo, 'SIM')", hl: true },
        { text: "handler = sim_core.handle_event(ctx)", hl: true },
        { text: "return explain_trace(handler)", hl: true },
      ],
      answer:
        "Queries repository symbols via <code>context.py</code> and pinpoints the SIM event handler entry point inside <code>sim_core.py</code>.",
    },
  };

  const codeState = {
    activeKey: "auth",
    beam: 0,
    phase: 0,
  };

  function selectCodeQuery(key) {
    const spec = codeQueries[key];
    if (!spec) return;
    codeState.activeKey = key;
    codeState.beam = 0;

    promptChips.forEach((chip) => {
      const active = chip.dataset.codeQ === key;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    if (codeLinesEl) {
      const codeEl = document.createElement("code");
      spec.lines.forEach((line, idx) => {
        const span = document.createElement("span");
        span.className = line.hl ? "cl is-hl" : "cl";
        span.textContent = line.text;
        codeEl.appendChild(span);
        if (idx < spec.lines.length - 1) {
          codeEl.appendChild(document.createTextNode("\n"));
        }
      });
      codeLinesEl.replaceChildren(codeEl);
    }
    if (codePathTag) codePathTag.textContent = spec.tag;
    if (codeAnswerText) codeAnswerText.innerHTML = spec.answer;

    if (codePane && !reducedMotion) {
      codePane.classList.remove("is-scanning");
      void codePane.offsetWidth;
      codePane.classList.add("is-scanning");
    }
    if (codeLoop && reducedMotion) codeLoop.drawOnce();
  }

  promptChips.forEach((chip) => {
    chip.addEventListener("click", () => selectCodeQuery(chip.dataset.codeQ));
  });

  if (codeGraphCanvas) {
    codeGraphCanvas.addEventListener("click", () => {
      const keys = Object.keys(codeQueries);
      const next = keys[(keys.indexOf(codeState.activeKey) + 1) % keys.length];
      selectCodeQuery(next);
    });
  }

  const codeLoop = registerCanvasLoop(codeGraphCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(codeGraphCanvas, 156);
    if (!ctx) return;

    if (!isStatic) {
      codeState.phase += dt * 1.6;
      codeState.beam = Math.min(1.25, codeState.beam + dt * 1.15);
    } else if (reducedMotion) {
      codeState.beam = 1.25;
    }

    const compact = w < 380;
    drawDarkGrid(ctx, w, h, 26);

    const spec = codeQueries[codeState.activeKey];
    const path = spec.path;
    const nodeMap = {};
    codeNodes.forEach((n) => {
      nodeMap[n.id] = { ...n, x: n.nx * w, y: n.ny * h };
    });

    // Sweeping LLM Retrieval Beam
    if (codeState.beam < 1.15) {
      const bx = codeState.beam * w;
      const g = ctx.createLinearGradient(bx - 48, 0, bx + 20, 0);
      g.addColorStop(0, "rgba(0, 82, 255, 0)");
      g.addColorStop(0.75, "rgba(59, 130, 246, 0.25)");
      g.addColorStop(1, "rgba(96, 165, 250, 0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(bx - 48, 0, 68, h);
    }

    // Draw base dependency edges
    codeEdges.forEach(([aId, bId]) => {
      const a = nodeMap[aId];
      const b = nodeMap[bId];
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // Highlight active 1 -> 2 -> 3 execution edges + traveling tokens
    for (let i = 0; i < path.length - 1; i++) {
      const a = nodeMap[path[i]];
      const b = nodeMap[path[i + 1]];
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const t = (codeState.phase * 0.65 + i * 0.35) % 1;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw labeled file/function AST nodes
    const nw = compact ? 66 : 80;
    const nh = 28;
    codeNodes.forEach((n) => {
      const p = nodeMap[n.id];
      const stepIdx = path.indexOf(n.id);
      const isHit = stepIdx >= 0;

      drawRoundedRect(ctx, p.x - nw / 2, p.y - nh / 2, nw, nh, 7);
      ctx.fillStyle = isHit ? "#102854" : "#152036";
      ctx.fill();
      ctx.strokeStyle = isHit ? "#3b82f6" : "rgba(148,163,184,0.28)";
      ctx.lineWidth = isHit ? 1.9 : 1;
      ctx.stroke();

      ctx.fillStyle = isHit ? "#ffffff" : "#94a3b8";
      ctx.font = `600 ${compact ? 8 : 9.2}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillText(n.label, p.x, p.y + 3);

      // Step number badge (1, 2, 3)
      if (isHit) {
        const bx = p.x - nw / 2 + 2;
        const by = p.y - nh / 2 - 2;
        ctx.fillStyle = "#0052ff";
        ctx.beginPath();
        ctx.arc(bx, by, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillText(String(stepIdx + 1), bx, by + 3);
      }
    });
  });

  // --------------------------------------------------------------------------
  // MINI-APP 4: Sonica — NB-IoT SDR Waterfall Spectrogram & Subcarrier Lanes
  // --------------------------------------------------------------------------
  const sonicaCanvas = $("#sonica-canvas");
  const sonicaSlider = $("#sonica-slider");
  const sonicaMode = $("#sonica-mode");
  const sonicaFreq = $("#sonica-freq");
  const sonicaDecode = $("#sonica-decode");
  const sonicaBurstBtn = $("#sonica-burst-btn");

  const wfCols = 72;
  const wfRows = 24;
  const sonicaState = {
    pos: 50,
    phase: 0,
    burstTimer: 0,
    frameSeq: 1,
    waterfall: Array.from({ length: wfRows }, () => new Float32Array(wfCols)),
    wfAccum: 0,
  };

  function seedWaterfallRow(row, centerNorm, burstLevel) {
    for (let i = 0; i < wfCols; i++) {
      const u = i / (wfCols - 1);
      const dSync = u - (centerNorm - 0.08);
      const dCtrl = u - centerNorm;
      const dUp = u - (centerNorm + 0.08);
      const syncE = Math.exp(-(dSync * dSync) / 0.00055) * 0.72;
      const ctrlE = Math.exp(-(dCtrl * dCtrl) / 0.00065) * 0.85;
      const upE =
        Math.exp(-(dUp * dUp) / 0.0007) * (0.45 + burstLevel * 0.95);
      const floor = 0.08 + Math.abs(Math.sin(i * 1.7 + sonicaState.phase * 3)) * 0.09;
      row[i] = Math.min(1.4, floor + syncE + ctrlE + upE);
    }
  }

  // Pre-seed waterfall so first frame looks immediately authentic
  for (let r = 0; r < wfRows; r++) {
    seedWaterfallRow(sonicaState.waterfall[r], 0.5, r % 9 === 0 ? 0.8 : 0.1);
  }

  function updateSonicaLabels(decodedMsg) {
    const v = sonicaState.pos;
    const band = v < 36 ? "GUARD-BAND" : v > 64 ? "IN-BAND" : "STAND-ALONE";
    if (sonicaMode) sonicaMode.textContent = `${band} · SYNC LOCKED`;
    if (sonicaFreq) sonicaFreq.textContent = `CH ${v} · NB-IoT Carrier Tuner`;
    if (decodedMsg && sonicaDecode) sonicaDecode.textContent = decodedMsg;
  }

  if (sonicaSlider) {
    sonicaSlider.addEventListener("input", () => {
      sonicaState.pos = Number(sonicaSlider.value);
      updateSonicaLabels(
        `TUNED CH ${sonicaState.pos} · SHIFTED SUBCARRIER RESOURCE BLOCK`
      );
      if (sonicaLoop && reducedMotion) {
        const nextRow = new Float32Array(wfCols);
        seedWaterfallRow(nextRow, sonicaState.pos / 100, 0.3);
        sonicaState.waterfall.pop();
        sonicaState.waterfall.unshift(nextRow);
        sonicaLoop.drawOnce();
      }
    });
  }

  if (sonicaBurstBtn) {
    sonicaBurstBtn.addEventListener("click", () => {
      sonicaState.burstTimer = 1.25;
      sonicaState.frameSeq++;
      updateSonicaLabels(
        `DECODED SENSOR FRAME #${String(sonicaState.frameSeq).padStart(2, "0")} · UPLINK CRC OK`
      );
      const nextRow = new Float32Array(wfCols);
      seedWaterfallRow(nextRow, sonicaState.pos / 100, 1.0);
      sonicaState.waterfall.pop();
      sonicaState.waterfall.unshift(nextRow);
      if (sonicaLoop && reducedMotion) sonicaLoop.drawOnce();
    });
  }
  updateSonicaLabels();

  const sonicaLoop = registerCanvasLoop(sonicaCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(sonicaCanvas, 194);
    if (!ctx) return;

    const centerNorm = sonicaState.pos / 100;
    if (!isStatic) {
      sonicaState.phase += dt * 4.0;
      sonicaState.burstTimer = Math.max(0, sonicaState.burstTimer - dt);
      sonicaState.wfAccum += dt;
      if (sonicaState.wfAccum >= 0.08) {
        sonicaState.wfAccum = 0;
        const row = sonicaState.waterfall.pop();
        seedWaterfallRow(row, centerNorm, sonicaState.burstTimer > 0 ? 1.0 : 0.05);
        sonicaState.waterfall.unshift(row);
      }
    }

    drawDarkGrid(ctx, w, h, 26);

    const specBottom = 94;
    const wfTop = 104;
    const wfH = h - wfTop - 10;
    const centerX = centerNorm * w;

    // 3 discrete NB-IoT subcarrier lane highlights (Sync, Control, Uplink)
    const laneOffset = Math.max(26, w * 0.08);
    const lanes = [
      { x: centerX - laneOffset, label: "SYNC", color: "#38bdf8" },
      { x: centerX, label: "CTRL", color: "#3b82f6" },
      {
        x: centerX + laneOffset,
        label: "UPLINK",
        color: sonicaState.burstTimer > 0 ? "#10b981" : "#6ee7b7",
      },
    ];

    lanes.forEach((ln) => {
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
      ctx.fillRect(ln.x - 14, 18, 28, specBottom - 18);
      ctx.fillStyle = ln.color;
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(ln.label, ln.x, 14);
    });

    // Live RF Narrowband Spectrum Trace
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const topRow = sonicaState.waterfall[0];
    for (let i = 0; i < wfCols; i++) {
      const x = (i / (wfCols - 1)) * w;
      const energy = topRow[i];
      const ripple = Math.sin(i * 0.9 + sonicaState.phase * 2.2) * 2.5;
      const y = Math.max(22, specBottom - energy * 52 + ripple);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Scrolling Waterfall Spectrogram (bottom panel)
    const cellW = w / wfCols;
    const cellH = wfH / wfRows;
    for (let r = 0; r < wfRows; r++) {
      const row = sonicaState.waterfall[r];
      const y = wfTop + r * cellH;
      for (let c = 0; c < wfCols; c++) {
        const val = row[c];
        if (val < 0.16) continue;
        const alpha = Math.min(0.95, val * 0.72);
        if (val > 0.95) {
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
        } else if (val > 0.52) {
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.65})`;
        }
        ctx.fillRect(c * cellW, y, Math.ceil(cellW), Math.ceil(cellH));
      }
    }

    // Divider + Waterfall label
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, wfTop - 2);
    ctx.lineTo(w, wfTop - 2);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = '600 8px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText("NB-IoT WATERFALL SPECTROGRAM", 8, wfTop + 11);
  });

  // --------------------------------------------------------------------------
  // MINI-APP 5: Flora — 4-Layer Programmable Cellular Testbed
  // --------------------------------------------------------------------------
  const floraCanvas = $("#flora-canvas");
  const floraHookBtns = $$("[data-flora-hook]");

  const floraState = {
    esim: true, // true = Private Testbed, false = Carrier A
    ran: true, // true = Priority Slice, false = Shared Best-Effort
    core: true, // true = Local Breakout, false = Central Cloud Detour
    edge: true, // true = Edge GPU Offload, false = On-Device Only
    phase: 0,
  };

  const floraLabels = {
    esim: ["Carrier A", "Private Testbed"],
    ran: ["Shared RAN", "Priority Slice"],
    core: ["Central Core", "Local Breakout"],
    edge: ["On-Device", "Edge GPU Active"],
  };

  floraHookBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.floraHook;
      floraState[key] = !floraState[key];
      const on = floraState[key];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
      const sub = $("[data-hook-state]", btn);
      if (sub && floraLabels[key]) sub.textContent = floraLabels[key][on ? 1 : 0];
      if (floraLoop && reducedMotion) floraLoop.drawOnce();
    });
  });

  const floraLoop = registerCanvasLoop(floraCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(floraCanvas, 196);
    if (!ctx) return;

    if (!isStatic) floraState.phase += dt * (floraState.ran ? 1.85 : 1.0);

    const compact = w < 380;
    drawDarkGrid(ctx, w, h, 26);

    const pad = compact ? 10 : 18;
    const cols = 4;
    const gap = compact ? 14 : 26;
    const cardW = (w - pad * 2 - gap * (cols - 1)) / cols;
    const cardH = 74;
    const cardY = 58;

    const centers = [];
    for (let i = 0; i < 4; i++) {
      const x = pad + i * (cardW + gap);
      centers.push({ x, cx: x + cardW / 2, cy: cardY + cardH / 2 });
    }

    // Draw connecting links across all 4 cellular stack layers
    // 1) eSIM -> RAN (Radio wave arcs!)
    const rMidX = (centers[0].x + cardW + centers[1].x) / 2;
    const rMidY = centers[0].cy;
    const arcCount = floraState.ran ? 3 : 2;
    for (let a = 0; a < arcCount; a++) {
      const rad = 6 + a * (floraState.ran ? 5 : 7);
      ctx.strokeStyle = floraState.ran ? "#38bdf8" : "#94a3b8";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(rMidX - 4, rMidY, rad, -0.7, 0.7);
      ctx.stroke();
    }

    // 2) RAN -> 5G Core (Direct or curved central core detour!)
    const c1x = centers[1].x + cardW;
    const c2x = centers[2].x;
    ctx.strokeStyle = floraState.core ? "#3b82f6" : "#f59e0b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(c1x, rMidY);
    if (floraState.core) {
      ctx.lineTo(c2x, rMidY);
    } else {
      ctx.quadraticCurveTo((c1x + c2x) / 2, cardY - 38, c2x, rMidY);
    }
    ctx.stroke();

    // 3) 5G Core -> Edge VR
    const c3x = centers[2].x + cardW;
    const c4x = centers[3].x;
    ctx.strokeStyle = floraState.edge ? "#10b981" : "rgba(148,163,184,0.28)";
    ctx.lineWidth = floraState.edge ? 2.4 : 1.5;
    ctx.beginPath();
    ctx.moveTo(c3x, rMidY);
    ctx.lineTo(c4x, rMidY);
    ctx.stroke();

    // Central Core detour indicator above L3 when Local Breakout is OFF
    if (!floraState.core) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("CENTRAL CORE DETOUR", centers[2].cx, 24);
    } else {
      ctx.fillStyle = "#93c5fd";
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("LOCAL BREAKOUT ACTIVE", centers[2].cx, 24);
    }

    // Draw the 4 Labeled Cellular Stack Nodes
    const layerDefs = [
      {
        title: "eSIM",
        sub: floraState.esim ? "Private" : "Carrier A",
        color: floraState.esim ? "#3b82f6" : "#f59e0b",
      },
      {
        title: "RAN",
        sub: floraState.ran ? "Slice" : "Shared",
        color: floraState.ran ? "#38bdf8" : "#94a3b8",
      },
      {
        title: "5G CORE",
        sub: floraState.core ? "Local" : "Central",
        color: floraState.core ? "#3b82f6" : "#f59e0b",
      },
      {
        title: "EDGE VR",
        sub: floraState.edge ? "Offload" : "Idle",
        color: floraState.edge ? "#10b981" : "#64748b",
      },
    ];

    layerDefs.forEach((def, i) => {
      drawNodeBox(
        ctx,
        centers[i].x,
        cardY,
        cardW,
        cardH,
        def.title,
        def.sub,
        def.color
      );
    });

    // Bidirectional Live End-to-End Packets (Uplink top rail, Downlink bottom rail)
    const uY = cardY - 12;
    const dY = cardY + cardH + 18;
    const startX = centers[0].cx;
    const endX = floraState.edge ? centers[3].cx : centers[2].cx;

    // Uplink rail
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(startX, uY);
    ctx.lineTo(endX, uY);
    ctx.stroke();

    const pktCount = floraState.ran ? 4 : 2;
    for (let k = 0; k < pktCount; k++) {
      const t = (floraState.phase * 0.45 + k / pktCount) % 1;
      const px = startX + (endX - startX) * t;
      ctx.fillStyle = floraState.esim ? "#60a5fa" : "#fbbf24";
      ctx.beginPath();
      ctx.arc(px, uY, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Downlink VR return rail (bright emerald when Edge Offload is ON)
    ctx.strokeStyle = floraState.edge
      ? "rgba(16, 185, 129, 0.42)"
      : "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(startX, dY);
    ctx.lineTo(endX, dY);
    ctx.stroke();

    for (let k = 0; k < pktCount; k++) {
      const t = (floraState.phase * 0.45 + k / pktCount + 0.15) % 1;
      const px = endX - (endX - startX) * t;
      ctx.fillStyle = floraState.edge ? "#34d399" : "#94a3b8";
      ctx.beginPath();
      ctx.arc(px, dY, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#94a3b8";
    ctx.font = '600 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(
      floraState.edge
        ? "BIDIRECTIONAL E2E FLOW · EDGE VR FRAMES RETURNING"
        : "EDGE OFFLOAD OFF · CORE TERMINATED",
      w / 2,
      h - 12
    );
  });

  // --------------------------------------------------------------------------
  // MINI-APP 6: Mobile VR Latency — 6DoF Headset + Uplink Queue -> Edge GPU
  // --------------------------------------------------------------------------
  const vrStage = $(".vr-stage");
  const vrCanvas = $("#vr-canvas");
  const vrSlider = $("#vr-slider");
  const vrModeButtons = $$("[data-vr-select]");
  const vrAutoBtn = $("#vr-auto-btn");
  const vrHudStatus = $("#vr-hud-status");
  const vrStrategy = $("#vr-strategy");

  const vrState = {
    mode: "proactive", // "proactive" | "standard"
    auto: true,
    target: 50,
    ghost: 50,
    phase: 0,
  };

  function setVRMode(mode) {
    vrState.mode = mode === "standard" ? "standard" : "proactive";
    if (vrStage) vrStage.dataset.vrMode = vrState.mode;
    vrModeButtons.forEach((btn) => {
      const active = btn.dataset.vrSelect === vrState.mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    positionSegmentThumb($('[data-segment="vr"]'));
    if (vrHudStatus) {
      vrHudStatus.textContent =
        vrState.mode === "proactive"
          ? "PROACTIVE GRANT · UNQUEUED UPLINK · LOCKED"
          : "REACTIVE LTE · UPLINK QUEUE BACKLOG · GHOST LAG";
    }
    if (vrStrategy) {
      vrStrategy.textContent =
        vrState.mode === "proactive"
          ? "App inference → DRX wake → Pre-scheduled grant"
          : "DRX doze wait → Reactive grant backlog → Frame lag";
    }
    if (vrLoop && reducedMotion) vrLoop.drawOnce();
  }

  vrModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setVRMode(btn.dataset.vrSelect));
  });

  if (vrAutoBtn) {
    vrAutoBtn.addEventListener("click", () => {
      vrState.auto = !vrState.auto;
      vrAutoBtn.classList.toggle("is-active", vrState.auto);
      vrAutoBtn.setAttribute("aria-pressed", String(vrState.auto));
    });
  }

  function setManualVRTarget(val) {
    vrState.auto = false;
    if (vrAutoBtn) {
      vrAutoBtn.classList.remove("is-active");
      vrAutoBtn.setAttribute("aria-pressed", "false");
    }
    vrState.target = Math.max(14, Math.min(86, val));
    if (vrSlider) vrSlider.value = String(Math.round(vrState.target));
    if (vrLoop && reducedMotion) {
      vrState.ghost =
        vrState.mode === "proactive"
          ? vrState.target - 1.8
          : Math.max(14, vrState.target - 20);
      vrLoop.drawOnce();
    }
  }

  if (vrSlider) {
    vrSlider.addEventListener("input", () =>
      setManualVRTarget(Number(vrSlider.value))
    );
  }

  if (vrCanvas) {
    vrCanvas.addEventListener("pointermove", (ev) => {
      if (ev.buttons === 0 && ev.pointerType === "touch") return;
      const rect = vrCanvas.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setManualVRTarget(pct);
    });
  }

  const vrLoop = registerCanvasLoop(vrCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(vrCanvas, 200);
    if (!ctx) return;

    const isProactive = vrState.mode === "proactive";
    if (!isStatic) {
      vrState.phase += dt * 2.2;
      if (vrState.auto) {
        vrState.target = 50 + Math.sin(vrState.phase) * 32;
        if (vrSlider) vrSlider.value = String(Math.round(vrState.target));
      }
      const followRate = isProactive ? 19 : 2.6;
      vrState.ghost +=
        (vrState.target - vrState.ghost) * Math.min(1, dt * followRate);
    } else if (reducedMotion) {
      vrState.target = 66;
      vrState.ghost = isProactive ? 63.5 : 40;
    }

    const compact = w < 380;
    drawDarkGrid(ctx, w, h, 26);

    // --- UPPER SECTION: 6DoF VR Headset Viewport Comparator ---
    const trackY = 58;
    ctx.strokeStyle = "rgba(148,163,184,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, trackY);
    ctx.lineTo(w - 16, trackY);
    ctx.stroke();

    const targetX = (vrState.target / 100) * w;
    const ghostX = (vrState.ghost / 100) * w;
    const lagPx = Math.abs(targetX - ghostX);

    if (lagPx > 3) {
      ctx.strokeStyle = isProactive
        ? "rgba(16,185,129,0.6)"
        : "rgba(244,63,94,0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ghostX, trackY);
      ctx.lineTo(targetX, trackY);
      ctx.stroke();
    }

    // Rendered VR Display Frame (Ghost)
    const boxW = 72;
    const boxH = 40;
    drawRoundedRect(ctx, ghostX - boxW / 2, trackY - boxH / 2, boxW, boxH, 9);
    ctx.fillStyle = isProactive
      ? "rgba(16,185,129,0.16)"
      : "rgba(244,63,94,0.18)";
    ctx.fill();
    ctx.strokeStyle = isProactive ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6DoF Headset Pose Reticle (Klein Blue)
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetX, trackY, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(targetX, trackY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 8.8px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText("6DoF HEAD POSE", targetX, 20);
    ctx.fillStyle = isProactive ? "#6ee7b7" : "#fda4af";
    ctx.fillText(
      isProactive ? "VR DISPLAY (LOCKED)" : "VR DISPLAY (LAGGING)",
      ghostX,
      trackY + 34
    );

    // --- LOWER SECTION: Wireless Uplink Queue -> Edge GPU -> Downlink Loop ---
    const pipeY = 148;
    const pad = compact ? 10 : 18;
    const sW = compact ? 64 : 84;
    const sH = 38;
    const xs = [
      pad,
      pad + (w - pad * 2 - sW) * 0.34,
      pad + (w - pad * 2 - sW) * 0.67,
      w - pad - sW,
    ];

    // Pipeline wire
    ctx.strokeStyle = "rgba(148,163,184,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xs[0] + sW / 2, pipeY);
    ctx.lineTo(xs[3] + sW / 2, pipeY);
    ctx.stroke();

    // Traveling packets
    const pCount = 3;
    for (let k = 0; k < pCount; k++) {
      const t = (vrState.phase * (isProactive ? 0.65 : 0.35) + k / pCount) % 1;
      const px = xs[0] + sW / 2 + (xs[3] - xs[0]) * t;
      ctx.fillStyle = isProactive ? "#34d399" : "#60a5fa";
      ctx.beginPath();
      ctx.arc(px, pipeY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    drawNodeBox(ctx, xs[0], pipeY - sH / 2, sW, sH, "VR HMD", "Motion", "#3b82f6");

    // Wireless Uplink Scheduler / Queue node (visibly shows queued coral bars in Standard mode!)
    drawRoundedRect(ctx, xs[1], pipeY - sH / 2, sW, sH, 8);
    ctx.fillStyle = isProactive ? "#0b2e26" : "#38121d";
    ctx.fill();
    ctx.strokeStyle = isProactive ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = isProactive ? "#6ee7b7" : "#fda4af";
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.fillText(isProactive ? "PRE-GRANT" : "UL QUEUE", xs[1] + sW / 2, pipeY - 4);
    // Queue occupancy bars
    const qBars = isProactive ? 1 : 5;
    for (let q = 0; q < 5; q++) {
      ctx.fillStyle =
        q < qBars
          ? isProactive
            ? "#10b981"
            : "#f43f5e"
          : "rgba(148,163,184,0.18)";
      ctx.fillRect(xs[1] + 10 + q * ((sW - 20) / 5), pipeY + 4, 8, 9);
    }

    drawNodeBox(ctx, xs[2], pipeY - sH / 2, sW, sH, "EDGE GPU", "Render", "#38bdf8");
    drawNodeBox(
      ctx,
      xs[3],
      pipeY - sH / 2,
      sW,
      sH,
      "DISPLAY",
      "Downlink",
      isProactive ? "#10b981" : "#f43f5e"
    );
  });

  // --------------------------------------------------------------------------
  // MINI-APP 7: Acemap — 2,208 Topics + On-Canvas Cluster Labels + Neighbor Links
  // --------------------------------------------------------------------------
  const acemapFields = [
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

  const acemapSourceColors = [
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

  const acemapDisplayColors = [
    "#8b5cf6",
    "#65a30d",
    "#6366f1",
    "#c2410c",
    "#0052ff",
    "#ca8a04",
    "#0284c7",
    "#b45309",
    "#0d9488",
    "#7c3aed",
    "#0891b2",
    "#059669",
    "#84cc16",
    "#16a34a",
    "#db2777",
    "#dc2626",
    "#e11d48",
    "#15803d",
    "#d97706",
  ];

  const acemapCanvas = $("#acemap-canvas");
  const acemapOverlay = $("#acemap-overlay");
  const acemapLoadBtn = $("#acemap-load-btn");
  const acemapOverlayBtn = $("#acemap-overlay-btn");
  const acemapSearch = $("#acemap-search");
  const acemapStatus = $("#acemap-status");
  const acemapDisciplines = $("#acemap-disciplines");
  const inspDot = $("#insp-dot");
  const inspField = $("#insp-field");
  const inspTitle = $("#insp-title");
  const inspMeta = $("#insp-meta");
  const acemapMatches = $("#acemap-matches");
  const acemapMatchesLabel = $("#acemap-matches-label");
  const acemapMatchList = $("#acemap-match-list");

  const acemapState = {
    loaded: false,
    loading: false,
    points: [],
    fieldCounts: new Array(acemapFields.length).fill(0),
    centroids: [],
    activeField: "all",
    query: "",
    hovered: -1,
    selected: -1,
    neighbors: [],
    bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  };

  if (acemapDisciplines) {
    acemapFields.forEach((fieldName, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "disc-pill";
      btn.dataset.disc = String(idx);
      btn.setAttribute("aria-pressed", "false");
      const dot = document.createElement("span");
      dot.className = "disc-swatch";
      dot.style.backgroundColor = acemapDisplayColors[idx];
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(fieldName));
      acemapDisciplines.appendChild(btn);
    });
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

  function drawAcemapPreview() {
    if (!acemapCanvas || acemapState.loaded) return;
    const { ctx, w, h } = syncCanvasSize(acemapCanvas, 380);
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    let s = 42;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < 180; i++) {
      const cluster = i % acemapDisplayColors.length;
      const angle = (cluster / acemapDisplayColors.length) * Math.PI * 2;
      const cx = w * 0.5 + Math.cos(angle) * (w * 0.28) + (rand() - 0.5) * 90;
      const cy = h * 0.5 + Math.sin(angle) * (h * 0.3) + (rand() - 0.5) * 70;
      ctx.fillStyle = acemapDisplayColors[cluster];
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5 + rand() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function isTopicMatch(pt) {
    if (
      acemapState.activeField !== "all" &&
      pt.field !== Number(acemapState.activeField)
    ) {
      return false;
    }
    if (acemapState.query && !pt.lower.includes(acemapState.query)) {
      return false;
    }
    return true;
  }

  function computeNearestNeighbors(idx, k = 6) {
    if (idx < 0 || !acemapState.points[idx]) return [];
    const src = acemapState.points[idx];
    const best = [];
    for (let i = 0; i < acemapState.points.length; i++) {
      if (i === idx) continue;
      const pt = acemapState.points[i];
      if (!pt.matched) continue;
      const dx = pt.x - src.x;
      const dy = pt.y - src.y;
      const d2 = dx * dx + dy * dy;
      if (best.length < k || d2 < best[best.length - 1].d2) {
        best.push({ idx: i, d2 });
        best.sort((a, b) => a.d2 - b.d2);
        if (best.length > k) best.pop();
      }
    }
    return best.map((item) => item.idx);
  }

  function updateInspector(idx) {
    if (idx < 0 || !acemapState.points[idx]) return;
    const pt = acemapState.points[idx];
    const fieldName = acemapFields[pt.field];
    const color = acemapDisplayColors[pt.field];
    if (inspDot) inspDot.style.backgroundColor = color;
    if (inspField) inspField.textContent = fieldName;
    if (inspTitle) inspTitle.textContent = pt.name;
    if (inspMeta) {
      inspMeta.textContent = `Topic ID: ${pt.topicId} · ${acemapState.fieldCounts[pt.field]} topics in ${fieldName}`;
    }
  }

  function renderAcemap() {
    if (!acemapCanvas || !acemapState.loaded) return;
    const { ctx, w, h } = syncCanvasSize(acemapCanvas, 380);
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Subtle studio grid
    ctx.strokeStyle = "rgba(15, 23, 42, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 48; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 48; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    const { minX, maxX, minY, maxY } = acemapState.bounds;
    const pad = 24;
    const scale = Math.min(
      (w - pad * 2) / (maxX - minX),
      (h - pad * 2) / (maxY - minY)
    );
    const ox = (w - (maxX - minX) * scale) / 2;
    const oy = (h - (maxY - minY) * scale) / 2;

    let matchCount = 0;
    const topMatches = [];

    // Pass 1: project & draw dimmed non-matches
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      pt.px = (pt.x - minX) * scale + ox;
      pt.py = (pt.y - minY) * scale + oy;
      pt.matched = isTopicMatch(pt);
      if (pt.matched) {
        matchCount++;
        if (topMatches.length < 18) topMatches.push(i);
      } else {
        ctx.fillStyle = "rgba(148, 163, 184, 0.14)";
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pass 2: active nodes
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      if (!pt.matched) continue;
      ctx.fillStyle = acemapDisplayColors[pt.field];
      ctx.globalAlpha = acemapState.query ? 0.94 : 0.72;
      const r = acemapState.query
        ? Math.min(5, 2.7 + pt.size * 0.14)
        : Math.min(4, 1.85 + pt.size * 0.13);
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pass 3: Direct On-Canvas Discipline Cluster Labels (collision-avoided!)
    const placedBoxes = [];
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    const orderedCentroids = [...acemapState.centroids].sort(
      (a, b) => b.count - a.count
    );
    for (const c of orderedCentroids) {
      if (
        acemapState.activeField !== "all" &&
        c.field !== Number(acemapState.activeField)
      ) {
        continue;
      }
      if (acemapState.query) continue; // Keep search view unobstructed
      const lx = (c.x - minX) * scale + ox;
      const ly = (c.y - minY) * scale + oy;
      const label = acemapFields[c.field];
      const textW = ctx.measureText(label).width;
      const pillW = textW + 20;
      const pillH = 20;
      const bx = Math.max(8, Math.min(w - pillW - 8, lx - pillW / 2));
      const by = Math.max(8, Math.min(h - pillH - 8, ly - pillH / 2));

      const overlaps = placedBoxes.some(
        (b) =>
          bx < b.x + b.w + 6 &&
          bx + pillW + 6 > b.x &&
          by < b.y + b.h + 4 &&
          by + pillH + 4 > b.y
      );
      if (overlaps && acemapState.activeField === "all") continue;
      placedBoxes.push({ x: bx, y: by, w: pillW, h: pillH });

      drawRoundedRect(ctx, bx, by, pillW, pillH, 10);
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = acemapDisplayColors[c.field];
      ctx.beginPath();
      ctx.arc(bx + 8, by + pillH / 2, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.fillText(label, bx + 15, by + 13.5);
    }

    // Pass 4: Scholarly Topic Neighborhood Link Lines for hovered or selected topic
    const focusIdx =
      acemapState.hovered >= 0 ? acemapState.hovered : acemapState.selected;
    acemapState.neighbors =
      focusIdx >= 0 && acemapState.points[focusIdx]?.matched
        ? computeNearestNeighbors(focusIdx, 6)
        : [];

    if (focusIdx >= 0 && acemapState.neighbors.length) {
      const src = acemapState.points[focusIdx];
      acemapState.neighbors.forEach((nIdx) => {
        const nb = acemapState.points[nIdx];
        ctx.strokeStyle = "rgba(0, 82, 255, 0.52)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(src.px, src.py);
        ctx.lineTo(nb.px, nb.py);
        ctx.stroke();

        ctx.fillStyle = acemapDisplayColors[nb.field];
        ctx.beginPath();
        ctx.arc(nb.px, nb.py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Focus node halo
      ctx.fillStyle = acemapDisplayColors[src.field];
      ctx.beginPath();
      ctx.arc(src.px, src.py, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "#0052ff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(src.px, src.py, 10.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (acemapStatus) {
      const fieldLabel =
        acemapState.activeField === "all"
          ? "All 19 disciplines"
          : acemapFields[Number(acemapState.activeField)];
      const qLabel = acemapState.query ? ` · “${acemapState.query}”` : "";
      acemapStatus.textContent = `${fieldLabel}${qLabel} · ${matchCount.toLocaleString()} topics`;
    }

    // Inspector list: search matches when searching/filtering, OR nearest scholarly neighbors!
    if (acemapMatches && acemapMatchList && acemapMatchesLabel) {
      const useSearch = Boolean(acemapState.query || acemapState.activeField !== "all");
      const listIndices = useSearch ? topMatches : acemapState.neighbors;

      if (listIndices.length) {
        acemapMatches.hidden = false;
        acemapMatchesLabel.textContent = useSearch
          ? `Showing ${Math.min(listIndices.length, matchCount)} of ${matchCount.toLocaleString()} matches`
          : `Nearest scholarly neighbors (${listIndices.length})`;
        acemapMatchList.replaceChildren();
        listIndices.forEach((idx) => {
          const pt = acemapState.points[idx];
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "match-btn";
          btn.textContent = pt.name;
          const tag = document.createElement("span");
          tag.textContent = acemapFields[pt.field];
          btn.appendChild(tag);
          btn.addEventListener("click", () => {
            acemapState.selected = idx;
            updateInspector(idx);
            renderAcemap();
          });
          li.appendChild(btn);
          acemapMatchList.appendChild(li);
        });
      } else {
        acemapMatches.hidden = true;
      }
    }
  }

  async function loadAcemapDataset() {
    if (acemapState.loaded || acemapState.loading) return;
    acemapState.loading = true;
    if (acemapLoadBtn) {
      acemapLoadBtn.disabled = true;
      acemapLoadBtn.textContent = "Loading CSV…";
    }
    if (acemapOverlayBtn) {
      acemapOverlayBtn.disabled = true;
      acemapOverlayBtn.textContent = "Loading 2,208 topics…";
    }
    if (acemapStatus) acemapStatus.textContent = "Fetching ../../data/data.csv…";

    try {
      const res = await fetch("../../data/data.csv");
      if (!res.ok) throw new Error("Failed to load CSV");
      const text = await res.text();
      const rows = parseCSV(text).slice(1);
      const pts = [];
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      const sums = acemapFields.map((_, field) => ({
        field,
        sx: 0,
        sy: 0,
        count: 0,
      }));
      acemapState.fieldCounts.fill(0);

      for (const r of rows) {
        const x = Number(r[0]);
        const y = Number(r[1]);
        const size = Number(r[2]) || 4;
        const name = r[3] || "";
        const color = (r[4] || "").trim().toLowerCase();
        const topicId = r[5] || "";
        const field = acemapSourceColors.indexOf(color);
        if (!Number.isFinite(x) || !Number.isFinite(y) || field < 0 || !name) {
          continue;
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        acemapState.fieldCounts[field]++;
        sums[field].sx += x;
        sums[field].sy += y;
        sums[field].count++;
        pts.push({
          x,
          y,
          size,
          name,
          lower: name.toLowerCase(),
          field,
          topicId,
          px: 0,
          py: 0,
          matched: true,
        });
      }
      if (!pts.length) throw new Error("No valid topics found");

      acemapState.points = pts;
      acemapState.centroids = sums
        .filter((s) => s.count > 0)
        .map((s) => ({
          field: s.field,
          x: s.sx / s.count,
          y: s.sy / s.count,
          count: s.count,
        }));
      acemapState.bounds = { minX, maxX, minY, maxY };
      acemapState.loaded = true;
      acemapState.loading = false;

      if (acemapOverlay) acemapOverlay.hidden = true;
      if (acemapLoadBtn) acemapLoadBtn.hidden = true;

      const defaultIdx = pts.findIndex(
        (p) => p.field === 4 && p.name.toLowerCase().includes("security")
      );
      if (defaultIdx >= 0) {
        acemapState.selected = defaultIdx;
        updateInspector(defaultIdx);
      }

      renderAcemap();
    } catch {
      acemapState.loading = false;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = false;
        acemapLoadBtn.textContent = "Retry loading topics";
      }
      if (acemapOverlayBtn) {
        acemapOverlayBtn.disabled = false;
        acemapOverlayBtn.textContent = "Retry loading map";
      }
      if (acemapStatus) {
        acemapStatus.textContent =
          "Could not load ../../data/data.csv — try retrying or open Acemap directly.";
      }
    }
  }

  function findNearestAcemapPoint(clientX, clientY, radiusPx) {
    if (!acemapCanvas || !acemapState.loaded) return -1;
    const rect = acemapCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = -1;
    let bestSq = radiusPx * radiusPx;
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      if (!pt.matched) continue;
      const dx = pt.px - x;
      const dy = pt.py - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestSq) {
        bestSq = d2;
        best = i;
      }
    }
    return best;
  }

  if (acemapLoadBtn) acemapLoadBtn.addEventListener("click", loadAcemapDataset);
  if (acemapOverlayBtn) acemapOverlayBtn.addEventListener("click", loadAcemapDataset);

  if (acemapDisciplines) {
    acemapDisciplines.addEventListener("click", (ev) => {
      const pill = ev.target.closest(".disc-pill");
      if (!pill) return;
      acemapState.activeField = pill.dataset.disc;
      $$(".disc-pill", acemapDisciplines).forEach((p) => {
        const active = p === pill;
        p.classList.toggle("is-active", active);
        p.setAttribute("aria-pressed", String(active));
      });
      if (!acemapState.loaded) loadAcemapDataset();
      else renderAcemap();
    });
  }

  if (acemapSearch) {
    acemapSearch.addEventListener("input", () => {
      acemapState.query = acemapSearch.value.trim().toLowerCase();
      if (!acemapState.loaded && acemapState.query.length >= 2) {
        loadAcemapDataset();
      } else if (acemapState.loaded) {
        renderAcemap();
      }
    });
  }

  if (acemapCanvas) {
    acemapCanvas.addEventListener("pointermove", (ev) => {
      if (!acemapState.loaded) return;
      const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 16);
      if (idx === acemapState.hovered) return;
      acemapState.hovered = idx;
      if (idx >= 0) updateInspector(idx);
      renderAcemap();
    });

    acemapCanvas.addEventListener("pointerleave", () => {
      if (!acemapState.loaded) return;
      acemapState.hovered = -1;
      if (acemapState.selected >= 0) updateInspector(acemapState.selected);
      renderAcemap();
    });

    acemapCanvas.addEventListener("click", (ev) => {
      if (!acemapState.loaded) {
        loadAcemapDataset();
        return;
      }
      const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 20);
      if (idx >= 0) {
        acemapState.selected = idx;
        updateInspector(idx);
        renderAcemap();
      }
    });
  }

  drawAcemapPreview();
  window.addEventListener("resize", () => {
    if (acemapState.loaded) renderAcemap();
    else drawAcemapPreview();
  });

  // --------------------------------------------------------------------------
  // PUBLICATIONS: Spring-Sliding Filter + Keyword Search + Hash Support
  // --------------------------------------------------------------------------
  const pubFilterBtns = $$("[data-pub-filter]");
  const pubGroups = $$(".pub-group");
  const pubRows = $$(".pub-row");
  const pubSearch = $("#pub-search");
  const pubCountEl = $("#publication-count");
  const pubEmptyEl = $("#pub-empty");

  const pubState = {
    kind: "all",
    query: "",
  };

  function applyPublicationFilter() {
    let visibleCount = 0;
    const years = [];

    pubGroups.forEach((group) => {
      const kindMatch =
        pubState.kind === "all" || group.dataset.kind === pubState.kind;
      let groupVisible = 0;
      const rows = $$(".pub-row", group);
      rows.forEach((row) => {
        const textMatch =
          !pubState.query ||
          (row.dataset.search || row.textContent.toLowerCase()).includes(
            pubState.query
          );
        const show = kindMatch && textMatch;
        row.hidden = !show;
        if (show) {
          groupVisible++;
          visibleCount++;
          years.push(Number(row.dataset.year));
        }
      });
      group.hidden = groupVisible === 0;
    });

    if (pubEmptyEl) pubEmptyEl.hidden = visibleCount > 0;
    if (pubCountEl) {
      if (visibleCount === 0) {
        pubCountEl.textContent = "0 matching publications";
      } else {
        const minY = Math.min(...years);
        const maxY = Math.max(...years);
        const span = minY === maxY ? `${minY}` : `${minY}–${maxY}`;
        const label =
          pubState.kind === "all"
            ? "publications"
            : `${pubState.kind} publications`;
        pubCountEl.textContent = `${visibleCount} ${label} · ${span}`;
      }
    }
  }

  function setPublicationFilter(kind) {
    pubState.kind = kind;
    pubFilterBtns.forEach((btn) => {
      const active = btn.dataset.pubFilter === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    positionSegmentThumb($('[data-segment="pubs"]'));
    applyPublicationFilter();
  }

  pubFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () =>
      setPublicationFilter(btn.dataset.pubFilter)
    );
  });

  if (pubSearch) {
    pubSearch.addEventListener("input", () => {
      pubState.query = pubSearch.value.trim().toLowerCase();
      applyPublicationFilter();
    });
  }

  function syncPubHash() {
    if (location.hash === "#conf") setPublicationFilter("conference");
    else if (location.hash === "#journal") setPublicationFilter("journal");
  }
  window.addEventListener("hashchange", syncPubHash);
  syncPubHash();

  // --------------------------------------------------------------------------
  // SPOTLIGHT COMMAND PALETTE (⌘K / Ctrl+K)
  // --------------------------------------------------------------------------
  const cmdModal = $("#cmd-modal");
  const cmdInput = $("#cmd-input");
  const cmdResults = $("#cmd-results");
  const cmdOpenBtn = $("#cmd-open-btn");
  const heroCmdBtn = $("#hero-cmd-btn");
  const cmdCloseBtn = $("#cmd-close-btn");

  const cmdEntries = [
    {
      group: "Sections",
      title: "GCE Bare Metal & CME 4-Mode Rack",
      sub: "Host & Fabric · Fleet Lifecycle · End-to-End · CME Fabric",
      tag: "Hero",
      keywords: "hero rack bare metal cme oscilloscope lifecycle",
      action: () => jumpTo("#rack"),
    },
    {
      group: "Sections",
      title: "Current Focus — GCE Bare Metal × CME Group",
      sub: "Dedicated physical infrastructure & ultra-low-latency trading",
      tag: "Section",
      keywords: "work focus google cloud bare metal cme trading",
      action: () => jumpTo("#work"),
    },
    {
      group: "Sections",
      title: "Playable Domain Playground (7 Labs)",
      sub: "SEED, SecureSIM, GPT-Code-Learner, Sonica, Flora, VR, Acemap",
      tag: "Section",
      keywords: "projects playground widgets labs apps",
      action: () => jumpTo("#projects"),
    },
    {
      group: "Sections",
      title: "Published Research (12 Papers)",
      sub: "SIGCOMM, NSDI, MobiCom, CNS, TMC, TON, TOSN",
      tag: "Section",
      keywords: "publications papers research conferences journals",
      action: () => jumpTo("#publications"),
    },
    {
      group: "Sections",
      title: "About & Education Ledger",
      sub: "Google, UCLA Ph.D. (Prof. Songwu Lu), SJTU B.S.",
      tag: "Section",
      keywords: "about bio ucla sjtu songwu lu google",
      action: () => jumpTo("#Bio"),
    },
    {
      group: "Quick Actions",
      title: "Switch Rack to CME Dedicated Fabric",
      sub: "Show ultra-low-latency market-order pulses on bare metal",
      tag: "Action",
      keywords: "cme fabric rack switch trading",
      action: () => {
        jumpTo("#rack");
        setRackMode("cme");
      },
    },
    {
      group: "Quick Actions",
      title: "Switch Rack to Fleet Lifecycle",
      sub: "Animate Provision → Verify → Active → Drain → Reclaim",
      tag: "Action",
      keywords: "fleet lifecycle provision drain reclaim rack",
      action: () => {
        jumpTo("#rack");
        setRackMode("lifecycle");
      },
    },
    {
      group: "Quick Actions",
      title: "Inject 5G Failure in SEED",
      sub: "Fracture 5G bearer and watch SIM/SEED recover with 5G Core",
      tag: "Action",
      keywords: "seed fault failure inject 5g sim recovery",
      action: () => {
        jumpTo("#seed");
        triggerSeedFault();
      },
    },
    {
      group: "Quick Actions",
      title: "Load 2,208-Topic Acemap Dataset",
      sub: "Jump to Acemap and load ../../data/data.csv",
      tag: "Action",
      keywords: "acemap load csv topics map",
      action: () => {
        jumpTo("#acemap");
        loadAcemapDataset();
      },
    },
    {
      group: "Mini-Apps",
      title: "SEED — 5G UE, SIM Chip & 5G Core Recovery",
      sub: "Diagnosing and recovering from 5G failures through the SIM",
      tag: "SIGCOMM ’22",
      keywords: "seed 5g sim failure sigcomm",
      action: () => jumpTo("#seed"),
    },
    {
      group: "Mini-Apps",
      title: "SecureSIM — eSIM Policy Gate & Partitions",
      sub: "Authentication and fine-grained access control for SIM and eSIM",
      tag: "MobiCom ’21",
      keywords: "securesim sim esim auth cert security mobicom",
      action: () => jumpTo("#secureSIM"),
    },
    {
      group: "Mini-Apps",
      title: "GPT-Code-Learner — AST Call-Graph Explorer",
      sub: "Explore a codebase through questions, context, and GPT",
      tag: "GitHub",
      keywords: "gpt code learner llm codebase search ast graph github",
      action: () => jumpTo("#gptcodelearner"),
    },
    {
      group: "Mini-Apps",
      title: "Sonica — NB-IoT SDR Waterfall Tuner",
      sub: "An open NB-IoT network for experiments with real devices",
      tag: "GitHub",
      keywords: "sonica nbiot iot rf radio sdr waterfall spectrogram",
      action: () => jumpTo("#sonica"),
    },
    {
      group: "Mini-Apps",
      title: "Flora — 4-Layer Programmable Cellular Stack",
      sub: "Software-defined mobile network spanning eSIM, radio, core, and edge",
      tag: "Testbed",
      keywords: "flora esim ran core edge vr lte slice",
      action: () => jumpTo("#flora"),
    },
    {
      group: "Mini-Apps",
      title: "Mobile VR Latency — Motion-to-Photon Lab",
      sub: "Proactive LTE uplink scheduling for interactive mobile VR",
      tag: "NSDI ’21",
      keywords: "vr latency lte uplink nsdi mobile 6dof",
      action: () => jumpTo("#lrp"),
    },
    {
      group: "Mini-Apps",
      title: "Acemap — 2,208-Topic Knowledge Map",
      sub: "Academic knowledge graph across 19 labeled disciplines",
      tag: "SJTU",
      keywords: "acemap knowledge graph topics sjtu",
      action: () => jumpTo("#acemap"),
    },
  ];

  pubRows.forEach((row) => {
    const link = $("h4 a", row);
    const venue = $(".venue-pill", row);
    const year = $(".pub-year", row);
    if (!link) return;
    const title = link.textContent.replace("↗", "").trim();
    cmdEntries.push({
      group: "Publications",
      title,
      sub: `${venue ? venue.textContent.trim() : ""} · ${year ? year.textContent.trim() : ""}`,
      tag: row.dataset.kind === "journal" ? "Journal" : "Conf",
      keywords: row.dataset.search || title.toLowerCase(),
      action: () => {
        if (pubSearch) {
          pubSearch.value = "";
          pubState.query = "";
        }
        setPublicationFilter("all");
        row.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
        });
        spotlightElement(row);
      },
    });
  });

  cmdEntries.push(
    {
      group: "Links",
      title: "GitHub Profile",
      sub: "github.com/JinghaoZhao",
      tag: "External ↗",
      keywords: "github code profile",
      action: () => window.open("https://github.com/JinghaoZhao", "_blank", "noopener"),
    },
    {
      group: "Links",
      title: "Google Scholar",
      sub: "Publications & citation index",
      tag: "External ↗",
      keywords: "google scholar citations",
      action: () =>
        window.open(
          "https://scholar.google.com/citations?user=0JvRKBUAAAAJ",
          "_blank",
          "noopener"
        ),
    },
    {
      group: "Links",
      title: "LinkedIn",
      sub: "linkedin.com/in/jinghaozhao",
      tag: "External ↗",
      keywords: "linkedin connect contact",
      action: () =>
        window.open("https://www.linkedin.com/in/jinghaozhao/", "_blank", "noopener"),
    },
    {
      group: "Links",
      title: "Curriculum Vitae (CV)",
      sub: "Google Drive PDF",
      tag: "External ↗",
      keywords: "cv resume pdf",
      action: () =>
        window.open(
          "https://drive.google.com/file/d/1w_XJ42SjzV_rB1WRCMU-FlWVH3ZQ_RF9/view?usp=sharing",
          "_blank",
          "noopener"
        ),
    },
    {
      group: "Links",
      title: "All 7 Daily Editions",
      sub: "../",
      tag: "Switch",
      keywords: "editions switcher 7 day daily prism monolith scope cinema orbital spatial",
      action: () => {
        window.location.href = "../";
      },
    },
    {
      group: "Links",
      title: "SUN · Classic Edition",
      sub: "../../?edition=classic",
      tag: "Switch",
      keywords: "original classic sun edition live site",
      action: () => {
        window.location.href = "../../?edition=classic";
      },
    },
    {
      group: "Links",
      title: "Auto (Today's Edition)",
      sub: "../../",
      tag: "Switch",
      keywords: "auto today daily rotation home",
      action: () => {
        window.location.href = "../../";
      },
    }
  );

  function jumpTo(selector) {
    const el = $(selector);
    if (!el) return;
    el.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    spotlightElement(el);
  }

  let cmdFiltered = [];
  let cmdActiveIndex = 0;
  let lastFocusedEl = null;

  function renderCmdResults(query) {
    if (!cmdResults) return;
    const q = query.trim().toLowerCase();
    cmdFiltered = cmdEntries.filter((entry) => {
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.sub.toLowerCase().includes(q) ||
        entry.keywords.toLowerCase().includes(q)
      );
    });

    cmdActiveIndex = 0;
    cmdResults.replaceChildren();

    if (!cmdFiltered.length) {
      const empty = document.createElement("div");
      empty.className = "cmd-empty";
      empty.textContent = `No matches for “${query}”. Try “SEED”, “CME”, “SIGCOMM”, or “Acemap”.`;
      cmdResults.appendChild(empty);
      return;
    }

    let lastGroup = "";
    cmdFiltered.forEach((item, idx) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const gTitle = document.createElement("div");
        gTitle.className = "cmd-group-title";
        gTitle.textContent = lastGroup;
        cmdResults.appendChild(gTitle);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = idx === 0 ? "cmd-item is-active" : "cmd-item";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(idx === 0));
      btn.dataset.cmdIndex = String(idx);

      const main = document.createElement("span");
      main.className = "cmd-item-main";
      const t = document.createElement("span");
      t.className = "cmd-item-title";
      t.textContent = item.title;
      const s = document.createElement("span");
      s.className = "cmd-item-sub";
      s.textContent = item.sub;
      main.appendChild(t);
      main.appendChild(s);

      const tag = document.createElement("span");
      tag.className = "cmd-item-tag";
      tag.textContent = item.tag;

      btn.appendChild(main);
      btn.appendChild(tag);

      btn.addEventListener("mouseenter", () => setCmdActive(idx));
      btn.addEventListener("click", () => executeCmd(idx));
      cmdResults.appendChild(btn);
    });
  }

  function setCmdActive(idx) {
    if (!cmdFiltered.length || !cmdResults) return;
    cmdActiveIndex = (idx + cmdFiltered.length) % cmdFiltered.length;
    const buttons = $$(".cmd-item", cmdResults);
    buttons.forEach((b, i) => {
      const active = i === cmdActiveIndex;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
      if (active) b.scrollIntoView({ block: "nearest" });
    });
  }

  function executeCmd(idx) {
    const target = cmdFiltered[idx];
    closeCmd();
    if (target && typeof target.action === "function") {
      target.action();
    }
  }

  function openCmd() {
    if (!cmdModal || !cmdInput) return;
    lastFocusedEl = document.activeElement;
    cmdModal.hidden = false;
    cmdInput.value = "";
    renderCmdResults("");
    cmdInput.focus();
  }

  function closeCmd() {
    if (!cmdModal || cmdModal.hidden) return;
    cmdModal.hidden = true;
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus({ preventScroll: true });
    }
  }

  if (cmdOpenBtn) cmdOpenBtn.addEventListener("click", openCmd);
  if (heroCmdBtn) heroCmdBtn.addEventListener("click", openCmd);
  if (cmdCloseBtn) cmdCloseBtn.addEventListener("click", closeCmd);

  if (cmdModal) {
    cmdModal.addEventListener("click", (ev) => {
      if (ev.target === cmdModal) closeCmd();
    });
  }

  if (cmdInput) {
    cmdInput.addEventListener("input", () => renderCmdResults(cmdInput.value));
    cmdInput.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setCmdActive(cmdActiveIndex + 1);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setCmdActive(cmdActiveIndex - 1);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        if (cmdFiltered.length) executeCmd(cmdActiveIndex);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closeCmd();
      }
    });
  }

  document.addEventListener("keydown", (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      if (cmdModal && !cmdModal.hidden) closeCmd();
      else openCmd();
    } else if (ev.key === "Escape" && cmdModal && !cmdModal.hidden) {
      closeCmd();
    }
  });

  // --------------------------------------------------------------------------
  // Collapsible 7-Day Edition Switcher Popover (SAT · Spatial)
  // --------------------------------------------------------------------------
  const editionSwitcher = $("#edition-switcher");
  const editionTrigger = $("#edition-trigger");
  const editionMenu = $("#edition-menu");

  function setEditionMenuOpen(open) {
    if (!editionTrigger || !editionMenu) return;
    editionMenu.hidden = !open;
    editionTrigger.setAttribute("aria-expanded", String(open));
  }

  if (editionTrigger && editionMenu) {
    editionTrigger.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setEditionMenuOpen(editionMenu.hidden);
    });

    document.addEventListener("click", (ev) => {
      if (
        !editionMenu.hidden &&
        editionSwitcher &&
        !editionSwitcher.contains(ev.target)
      ) {
        setEditionMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !editionMenu.hidden) {
        setEditionMenuOpen(false);
        editionTrigger.focus({ preventScroll: true });
      }
    });
  }

  requestAnimationFrame(syncAllSegments);
})();
