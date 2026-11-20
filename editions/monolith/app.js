/* Monolith Edition — Neo-Brutalist Kinetic Monolith & Avant-Garde Poster
   Domain-Customized Systems & Networking Kinetic Engines */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotionQuery.matches;

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ========================================================================
     0. 7-DAY EDITION SWITCHER POPOVER
     ======================================================================== */
  const editionSwitcher = $("#edition-switcher");
  const editionTrigger = $("#edition-trigger");
  const editionMenu = $("#edition-menu");

  function setEditionMenuOpen(open) {
    if (!editionTrigger || !editionMenu) return;
    editionTrigger.setAttribute("aria-expanded", String(open));
    editionMenu.hidden = !open;
  }

  if (editionSwitcher && editionTrigger && editionMenu) {
    editionTrigger.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setEditionMenuOpen(editionMenu.hidden);
    });
    document.addEventListener("click", (ev) => {
      if (!editionMenu.hidden && !editionSwitcher.contains(ev.target)) {
        setEditionMenuOpen(false);
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !editionMenu.hidden) {
        setEditionMenuOpen(false);
        editionTrigger.focus();
      }
    });
  }

  function resizeCanvasToDisplay(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ========================================================================
     1. GLYPH-SCRAMBLE DECODE ENTRANCE
     ======================================================================== */
  const GLYPHS = "█▓▒░/#01XZ=+_-[]";
  const scrambleTargets = $$("[data-scramble]");
  let scrambleTimers = [];

  function runScrambleDecode() {
    scrambleTimers.forEach((id) => clearTimeout(id));
    scrambleTimers = [];

    if (!motionEnabled) {
      scrambleTargets.forEach((el) => {
        el.textContent = el.dataset.scramble || el.textContent;
      });
      return;
    }

    scrambleTargets.forEach((el) => {
      const finalText = el.dataset.scramble || el.textContent;
      const delay = Number(el.dataset.delay || 0);
      const startTimer = setTimeout(() => {
        let frame = 0;
        const totalFrames = Math.max(14, finalText.length * 2 + 8);
        function step() {
          const progress = frame / totalFrames;
          const locked = Math.floor(progress * finalText.length);
          let out = "";
          for (let i = 0; i < finalText.length; i++) {
            const ch = finalText[i];
            if (ch === " " || ch === "&" || i < locked) {
              out += ch;
            } else {
              out += GLYPHS[(frame * 3 + i * 7) % GLYPHS.length];
            }
          }
          el.textContent = out;
          frame++;
          if (frame <= totalFrames) {
            const t = setTimeout(step, 34);
            scrambleTimers.push(t);
          } else {
            el.textContent = finalText;
          }
        }
        step();
      }, delay);
      scrambleTimers.push(startTimer);
    });
  }

  /* ========================================================================
     2. HERO KINETIC SYSTEMS BLUEPRINT / LIVE BARE-METAL RACK BUS CANVAS
     ======================================================================== */
  const heroSection = $("#hero");
  const heroBusCanvas = $("#hero-bus-canvas");
  let heroVisible = true;
  let heroRaf = 0;
  let heroTime = 0;
  let heroPrev = 0;

  function drawHeroBus() {
    const info = resizeCanvasToDisplay(heroBusCanvas);
    if (!info) return;
    const { ctx, w, h } = info;
    ctx.clearRect(0, 0, w, h);

    // Subtle precision architectural registration ruler along top & bottom edges
    ctx.strokeStyle = "rgba(11, 11, 12, 0.14)";
    ctx.lineWidth = 1;
    const tickStep = w < 600 ? 24 : 32;
    ctx.beginPath();
    for (let x = 0; x < w; x += tickStep) {
      const major = x % (tickStep * 4) === 0;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, major ? 12 : 6);
      ctx.moveTo(x, h);
      ctx.lineTo(x, h - (major ? 12 : 6));
    }
    ctx.stroke();

    // Orthogonal bare-metal rack bus rails across the stage
    const lanes = [h * 0.18, h * 0.5, h * 0.84];
    ctx.strokeStyle = "rgba(11, 11, 12, 0.11)";
    ctx.lineWidth = 1.5;
    lanes.forEach((ly) => {
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(w, ly);
      ctx.stroke();
    });

    // Vertical bare-metal server blade outlines along left & right structural columns
    const bladeCount = w < 640 ? 4 : 7;
    const bladeSpan = w / (bladeCount + 1);
    for (let i = 1; i <= bladeCount; i++) {
      const bx = i * bladeSpan;
      ctx.strokeStyle = "rgba(11, 11, 12, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, 12);
      ctx.lineTo(bx, h - 12);
      ctx.stroke();

      // Physical blade slot rectangles along bottom rack rail
      const bw = Math.min(44, bladeSpan * 0.48);
      const activeBlade = Math.floor(heroTime * 1.4 + i) % bladeCount === 0;
      ctx.strokeStyle = activeBlade
        ? "rgba(255, 72, 0, 0.45)"
        : "rgba(11, 11, 12, 0.16)";
      ctx.strokeRect(bx - bw * 0.5, h - 28, bw, 14);
      if (activeBlade) {
        ctx.fillStyle = "rgba(255, 72, 0, 0.25)";
        ctx.fillRect(bx - bw * 0.5 + 3, h - 25, bw - 6, 8);
      }
    }

    // Deterministic fabric packets gliding cleanly along rack bus lanes
    lanes.forEach((ly, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      const speed = 78 + idx * 24;
      const spacing = w < 600 ? 150 : 210;
      const shift = (heroTime * speed) % spacing;
      for (let x = -spacing; x < w + spacing; x += spacing) {
        const px = dir > 0 ? x + shift : w - (x + shift);
        ctx.fillStyle = idx === 1 ? "rgba(255, 72, 0, 0.42)" : "rgba(11, 11, 12, 0.28)";
        ctx.fillRect(px, ly - 3, 24, 6);
        ctx.fillStyle = "rgba(11, 11, 12, 0.48)";
        ctx.fillRect(px + (dir > 0 ? 20 : 0), ly - 3, 4, 6);
      }
    });
  }

  function tickHeroBus(now) {
    heroRaf = 0;
    if (!motionEnabled || !heroVisible || document.hidden) {
      heroPrev = 0;
      return;
    }
    if (!heroPrev || now - heroPrev >= 33) {
      const dt = heroPrev ? Math.min(0.06, (now - heroPrev) / 1000) : 0.033;
      heroPrev = now;
      heroTime += dt;
      drawHeroBus();
    }
    heroRaf = requestAnimationFrame(tickHeroBus);
  }

  function syncHeroLoop() {
    if (motionEnabled && heroVisible && !document.hidden) {
      if (!heroRaf) heroRaf = requestAnimationFrame(tickHeroBus);
    } else {
      cancelAnimationFrame(heroRaf);
      heroRaf = 0;
      heroPrev = 0;
      drawHeroBus();
    }
  }

  /* ========================================================================
     3. COUNTER-SLIDING HERO BANDS + SCROLL SPY + TELEMETRY + BADGE
     ======================================================================== */
  const bandLeft = $("#hero-band-left");
  const bandRight = $("#hero-band-right");
  const scrollTelemetry = $("#scroll-telemetry");
  const navLinks = $$(".rail-nav a");
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  let scrollScheduled = false;

  function updateScrollEffects() {
    scrollScheduled = false;
    const y = window.scrollY || 0;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const pct = Math.min(100, Math.max(0, Math.round((y / maxScroll) * 100)));
    if (scrollTelemetry) {
      scrollTelemetry.textContent = `POS ${String(pct).padStart(3, "0")}%`;
    }

    if (bandLeft && bandRight && heroSection) {
      if (motionEnabled) {
        const heroH = Math.max(300, heroSection.offsetHeight);
        const norm = Math.min(1.4, Math.max(0, y / heroH));
        const shift = Math.round(norm * 130);
        bandLeft.style.setProperty("--slide-left", `${-shift}px`);
        bandRight.style.setProperty("--slide-right", `${shift}px`);
      } else {
        bandLeft.style.setProperty("--slide-left", "0px");
        bandRight.style.setProperty("--slide-right", "0px");
      }
    }

    let activeId = "";
    const threshold = window.innerHeight * 0.34;
    navSections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= threshold) {
        activeId = sec.id;
      }
    });
    navLinks.forEach((link) => {
      if (activeId && link.getAttribute("href") === `#${activeId}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollScheduled) {
        scrollScheduled = true;
        requestAnimationFrame(updateScrollEffects);
      }
    },
    { passive: true },
  );

  const heroStage = $("#hero-stage");
  const kineticBadge = $("#kinetic-badge");
  const redecodeBtn = $("#redecode-btn");

  let badgeTargetX = 0;
  let badgeTargetY = 0;
  let badgeX = 0;
  let badgeY = 0;
  let badgeRot = -8;
  let badgeTargetRot = -8;
  let badgeRaf = 0;

  function stepBadge() {
    badgeRaf = 0;
    if (!kineticBadge || !motionEnabled || document.hidden) return;
    badgeX += (badgeTargetX - badgeX) * 0.14;
    badgeY += (badgeTargetY - badgeY) * 0.14;
    badgeRot += (badgeTargetRot - badgeRot) * 0.14;
    kineticBadge.style.setProperty("--bx", `${badgeX.toFixed(2)}px`);
    kineticBadge.style.setProperty("--by", `${badgeY.toFixed(2)}px`);
    kineticBadge.style.setProperty("--brot", `${badgeRot.toFixed(2)}deg`);
    if (
      Math.abs(badgeTargetX - badgeX) > 0.15 ||
      Math.abs(badgeTargetY - badgeY) > 0.15 ||
      Math.abs(badgeTargetRot - badgeRot) > 0.15
    ) {
      badgeRaf = requestAnimationFrame(stepBadge);
    }
  }

  if (heroStage && kineticBadge) {
    heroStage.addEventListener(
      "pointermove",
      (ev) => {
        if (!motionEnabled || !finePointerQuery.matches) return;
        const rect = heroStage.getBoundingClientRect();
        const nx = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        const ny = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
        badgeTargetX = nx * 24;
        badgeTargetY = ny * 18;
        badgeTargetRot = -8 + nx * 14;
        if (!badgeRaf) badgeRaf = requestAnimationFrame(stepBadge);
      },
      { passive: true },
    );

    heroStage.addEventListener("pointerleave", () => {
      badgeTargetX = 0;
      badgeTargetY = 0;
      badgeTargetRot = -8;
      if (motionEnabled && !badgeRaf) badgeRaf = requestAnimationFrame(stepBadge);
    });

    kineticBadge.addEventListener("click", () => {
      runScrambleDecode();
      badgeTargetRot = badgeTargetRot === -8 ? 14 : -8;
      if (motionEnabled && !badgeRaf) badgeRaf = requestAnimationFrame(stepBadge);
    });
  }

  if (redecodeBtn) {
    redecodeBtn.addEventListener("click", runScrambleDecode);
  }

  /* ========================================================================
     4. BARE METAL MATRIX (HOST / LIFECYCLE / FABRIC) + CME PULSE RAIL
     ======================================================================== */
  const bmTabs = $$("[data-bm-layer]");
  const bmPanels = {
    host: $("#bm-panel-host"),
    lifecycle: $("#bm-panel-lifecycle"),
    fabric: $("#bm-panel-fabric"),
  };
  const bmCanvas = $("#bm-canvas");
  const cmeCanvas = $("#cme-canvas");
  const bmAscii = $("#bm-ascii");
  const bmSection = $("#work");

  let bmLayer = "host";
  let bmVisible = false;
  let bmRaf = 0;
  let bmTime = 0;
  let bmPrev = 0;
  let bmSlamFlash = 0;

  const BM_ASCII_FRAMES = {
    host: (tick) => {
      const lanes = ["DIRECT-NIC ══► FABRIC", "DIRECT-I/O ══► STORAGE", "BARE-CPU   ══► FABRIC"];
      return `LAYER::HOST & FABRIC [DEDICATED CPU/NIC // ✕ NO HYPERVISOR]\nPATH ::${lanes[tick % lanes.length]} // ZERO VIRTUALIZATION OVERHEAD`;
    },
    lifecycle: (tick) => {
      const states = ["PROVISION", "VERIFY", "LIVE", "DRAIN", "RECLAIM"];
      const st = states[tick % states.length];
      return `LAYER::FLEET LIFECYCLE [8-BLADE RACK ORCHESTRATION]\nCYCLE::PROVISION → VERIFY → LIVE → DRAIN → RECLAIM [NOW:${st}]`;
    },
    fabric: (tick) => {
      const ticks = ["▓▓▓░░▓▓▓░░▓▓▓", "░▓▓▓░░▓▓▓░░▓▓", "░░▓▓▓░░▓▓▓░░▓"];
      return `LAYER::END-TO-END [HOST NIC → TOR FABRIC → CTRL PLANE → PEER]\nTRACE::${ticks[tick % ticks.length]} FLAT-JITTER CORRIDOR (CONCEPTUAL)`;
    },
  };

  function setBmLayer(layer) {
    if (!bmPanels[layer]) return;
    bmLayer = layer;
    bmSlamFlash = 1.0;

    bmTabs.forEach((tab) => {
      const active = tab.dataset.bmLayer === layer;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      if (active) {
        tab.classList.add("is-slam");
        setTimeout(() => tab.classList.remove("is-slam"), 140);
      }
    });

    Object.entries(bmPanels).forEach(([key, panel]) => {
      if (panel) panel.hidden = key !== layer;
    });

    if (bmAscii) {
      bmAscii.textContent = BM_ASCII_FRAMES[layer](Math.floor(bmTime * 1.5));
    }
    drawBmCanvas();
  }

  bmTabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => setBmLayer(tab.dataset.bmLayer));
    tab.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") {
        ev.preventDefault();
        const next = bmTabs[(idx + 1) % bmTabs.length];
        next.focus();
        setBmLayer(next.dataset.bmLayer);
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        const prev = bmTabs[(idx - 1 + bmTabs.length) % bmTabs.length];
        prev.focus();
        setBmLayer(prev.dataset.bmLayer);
      } else if (ev.key === "Home") {
        ev.preventDefault();
        bmTabs[0].focus();
        setBmLayer(bmTabs[0].dataset.bmLayer);
      } else if (ev.key === "End") {
        ev.preventDefault();
        bmTabs[bmTabs.length - 1].focus();
        setBmLayer(bmTabs[bmTabs.length - 1].dataset.bmLayer);
      }
    });
  });

  function drawBmCanvas() {
    const info = resizeCanvasToDisplay(bmCanvas);
    if (!info) return;
    const { ctx, w, h } = info;
    const compact = w < 440;

    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, w, h);

    // Subtle structural grid
    ctx.strokeStyle = "rgba(234, 232, 225, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 28; x < w; x += 28) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 28; y < h; y += 28) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (bmLayer === "host") {
      // Dedicated Bare Metal CPU / NIC / Storage -> direct to Cloud Fabric, with crossed-out NO HYPERVISOR stamp
      const pad = compact ? 12 : 20;
      const leftW = compact ? w * 0.34 : w * 0.31;
      const rightW = compact ? w * 0.28 : w * 0.25;
      const rightX = w - pad - rightW;
      const blocks = [
        { label: "BARE METAL CPU", sub: "DEDICATED SILICON", y: 38 },
        { label: "DIRECT NIC", sub: "LINE-RATE FABRIC", y: 106 },
        { label: "STORAGE I/O", sub: "NVME BOUNDARY", y: 174 },
      ];

      // Right-hand Cloud Fabric monolith
      ctx.fillStyle = "#121215";
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2;
      ctx.fillRect(rightX, 38, rightW, 186);
      ctx.strokeRect(rightX, 38, rightW, 186);

      ctx.fillStyle = "#c8ff00";
      ctx.font = `700 ${compact ? 10 : 12}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("CLOUD", rightX + rightW * 0.5, 118);
      ctx.fillText("FABRIC", rightX + rightW * 0.5, 136);
      ctx.fillStyle = "#b8b5aa";
      ctx.font = "700 9px 'JetBrains Mono', monospace";
      ctx.fillText("VPC + STORAGE", rightX + rightW * 0.5, 158);

      // Direct buses + hardware blocks
      blocks.forEach((b, i) => {
        const bh = 50;
        const midY = b.y + bh * 0.5;
        // Direct rail
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad + leftW, midY);
        ctx.lineTo(rightX, midY);
        ctx.stroke();

        // Streaming packet blocks (direct hardware -> fabric)
        const busLen = Math.max(20, rightX - (pad + leftW));
        for (let p = 0; p < 2; p++) {
          const prog = (bmTime * 0.72 + i * 0.27 + p * 0.5) % 1;
          const px = pad + leftW + prog * (busLen - 16);
          ctx.fillStyle = "#c8ff00";
          ctx.fillRect(px, midY - 4, 16, 8);
        }

        // Hardware block
        ctx.fillStyle = "#141417";
        ctx.strokeStyle = "#eae8e1";
        ctx.lineWidth = 2;
        ctx.fillRect(pad, b.y, leftW, bh);
        ctx.strokeRect(pad, b.y, leftW, bh);

        ctx.fillStyle = "#eae8e1";
        ctx.font = `700 ${compact ? 9.5 : 11}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(b.label, pad + 8, b.y + 21);
        ctx.fillStyle = "#c8ff00";
        ctx.font = "700 8.5px 'JetBrains Mono', monospace";
        ctx.fillText(b.sub, pad + 8, b.y + 38);
      });

      // Center brutalist crossed-out NO HYPERVISOR stamp
      const cx = (pad + leftW + rightX) * 0.5;
      const cy = 131;
      const sw = compact ? 92 : 122;
      const sh = 38;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.12);
      ctx.fillStyle = "#0b0b0c";
      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 2.5;
      ctx.fillRect(-sw * 0.5, -sh * 0.5, sw, sh);
      ctx.strokeRect(-sw * 0.5, -sh * 0.5, sw, sh);
      // Cross-out diagonal strike
      ctx.strokeStyle = "rgba(255, 72, 0, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-sw * 0.48, sh * 0.45);
      ctx.lineTo(sw * 0.48, -sh * 0.45);
      ctx.stroke();
      ctx.fillStyle = "#ff4800";
      ctx.font = `700 ${compact ? 9 : 10.5}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("✕ NO HYPERVISOR", 0, 4);
      ctx.restore();

      ctx.fillStyle = "#eae8e1";
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("HOST // DIRECT PHYSICAL SILICON TO CLOUD FABRIC", pad, 20);
    } else if (bmLayer === "lifecycle") {
      // 8-blade physical rack cycling PROVISION -> VERIFY -> LIVE -> DRAIN -> RECLAIM
      const states = [
        { name: "PROVISION", color: "#eae8e1" },
        { name: "VERIFY", color: "#ffb84d" },
        { name: "LIVE", color: "#c8ff00" },
        { name: "DRAIN", color: "#ff4800" },
        { name: "RECLAIM", color: "#b8b5aa" },
      ];
      const pad = compact ? 10 : 18;

      // Top 5-stage lifecycle ribbon
      const stepW = (w - pad * 2) / states.length;
      const activeStage = Math.floor(bmTime * 0.85) % states.length;
      states.forEach((st, i) => {
        const sx = pad + i * stepW;
        const isCur = i === activeStage;
        ctx.fillStyle = isCur ? st.color : "#141417";
        ctx.strokeStyle = isCur ? st.color : "#36363d";
        ctx.lineWidth = 1.5;
        ctx.fillRect(sx + 2, 26, stepW - 4, 24);
        ctx.strokeRect(sx + 2, 26, stepW - 4, 24);
        ctx.fillStyle = isCur ? "#0b0b0c" : st.color;
        ctx.font = `700 ${compact ? 7.5 : 9.5}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(compact ? st.name.slice(0, 5) : st.name, sx + stepW * 0.5, 42);
      });

      // 2x4 physical bare-metal server blade matrix
      const cols = 4;
      const rows = 2;
      const gap = compact ? 8 : 12;
      const cellW = (w - pad * 2 - gap * (cols - 1)) / cols;
      const cellH = 74;
      const startY = 72;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const bx = pad + c * (cellW + gap);
          const by = startY + r * (cellH + gap);
          const stIdx = (Math.floor(bmTime * 0.65) + idx) % states.length;
          const st = states[stIdx];
          const isLive = stIdx === 2;
          const isDrain = stIdx === 3;

          ctx.fillStyle = isLive
            ? "rgba(200,255,0,0.12)"
            : isDrain
              ? "rgba(255,72,0,0.14)"
              : "#121215";
          ctx.strokeStyle = st.color;
          ctx.lineWidth = isLive || isDrain ? 2 : 1.3;
          ctx.fillRect(bx, by, cellW, cellH);
          ctx.strokeRect(bx, by, cellW, cellH);

          // Blade ID + state tag
          ctx.fillStyle = "#eae8e1";
          ctx.font = `700 ${compact ? 9 : 10}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "left";
          ctx.fillText(`BLADE-0${idx + 1}`, bx + 7, by + 18);

          ctx.fillStyle = st.color;
          ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
          ctx.fillText(st.name, bx + 7, by + 38);

          // Automated progress bar
          const subProg = (bmTime * 0.65 + idx) % 1;
          ctx.fillStyle = "#26262b";
          ctx.fillRect(bx + 7, by + 50, cellW - 14, 10);
          ctx.fillStyle = st.color;
          ctx.fillRect(bx + 7, by + 50, (cellW - 14) * subProg, 10);
        }
      }

      ctx.fillStyle = "#eae8e1";
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("LIFECYCLE // AUTOMATED PHYSICAL FLEET STATE MACHINE", pad, 16);
    } else {
      // FABRIC / END-TO-END: NIC -> TOR -> CTRL -> PEER + deterministic flat-jitter timing trace
      const pad = compact ? 10 : 18;
      const nodes = ["HOST NIC", "TOR FABRIC", "CTRL PLANE", "PEER"];
      const nodeW = compact ? (w - pad * 2 - 30) / 4 : (w - pad * 2 - 72) / 4;
      const gap = (w - pad * 2 - nodeW * 4) / 3;
      const nodeY = 38;
      const nodeH = 44;
      const midNodeY = nodeY + nodeH * 0.5;

      // Wire connecting all 4 nodes
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad + nodeW * 0.5, midNodeY);
      ctx.lineTo(w - pad - nodeW * 0.5, midNodeY);
      ctx.stroke();

      // Uniformly spaced deterministic packets along pipeline
      const span = w - pad * 2 - nodeW;
      for (let i = 0; i < 4; i++) {
        const prog = (bmTime * 0.55 + i * 0.25) % 1;
        const px = pad + nodeW * 0.5 + prog * span;
        ctx.fillStyle = "#c8ff00";
        ctx.fillRect(px - 7, midNodeY - 5, 14, 10);
      }

      nodes.forEach((label, i) => {
        const nx = pad + i * (nodeW + gap);
        ctx.fillStyle = "#0b0b0c";
        ctx.strokeStyle = i === 1 ? "#c8ff00" : "#eae8e1";
        ctx.lineWidth = 2;
        ctx.fillRect(nx, nodeY, nodeW, nodeH);
        ctx.strokeRect(nx, nodeY, nodeW, nodeH);
        ctx.fillStyle = i === 1 ? "#c8ff00" : "#eae8e1";
        ctx.font = `700 ${compact ? 8 : 10}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(compact ? label.split(" ")[0] : label, nx + nodeW * 0.5, nodeY + 26);
      });

      // Lower flat-jitter deterministic timing trace
      const scopeTop = 108;
      const scopeH = 128;
      const scopeMid = scopeTop + scopeH * 0.54;
      ctx.fillStyle = "#0c0c0e";
      ctx.strokeStyle = "#2b2b30";
      ctx.lineWidth = 1.5;
      ctx.fillRect(pad, scopeTop, w - pad * 2, scopeH);
      ctx.strokeRect(pad, scopeTop, w - pad * 2, scopeH);

      // Tight deterministic corridor
      ctx.fillStyle = "rgba(200, 255, 0, 0.08)";
      ctx.fillRect(pad + 2, scopeMid - 18, w - pad * 2 - 4, 36);
      ctx.strokeStyle = "rgba(200, 255, 0, 0.55)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(pad, scopeMid - 18);
      ctx.lineTo(w - pad, scopeMid - 18);
      ctx.moveTo(pad, scopeMid + 18);
      ctx.lineTo(w - pad, scopeMid + 18);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flat deterministic arrival trace (tiny clean harmonic ticks, zero chaotic spikes)
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = pad + 6; x <= w - pad - 6; x += 4) {
        const phase = (x - pad) * 0.065 - bmTime * 6.5;
        const flatRipple = Math.sin(phase) * 3.5 + (Math.sin(phase * 3) > 0.85 ? -7 : 0);
        const y = scopeMid + flatRipple;
        if (x === pad + 6) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "#c8ff00";
      ctx.font = "700 9.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("FLAT-JITTER DETERMINISTIC TRACE (CONCEPTUAL)", pad + 8, scopeTop + 18);

      ctx.fillStyle = "#eae8e1";
      ctx.font = "700 10px 'JetBrains Mono', monospace";
      ctx.fillText("END-TO-END // PREDICTABLE FABRIC TIMING", pad, 18);
    }

    if (bmSlamFlash > 0.02) {
      ctx.strokeStyle = `rgba(255, 72, 0, ${bmSlamFlash.toFixed(2)})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
    }
  }

  function drawCmeCanvas() {
    const info = resizeCanvasToDisplay(cmeCanvas);
    if (!info) return;
    const { ctx, w, h } = info;
    const compact = w < 540;

    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, w, h);

    const pad = compact ? 10 : 20;
    const boxW = compact ? 92 : 168;
    const boxH = 56;
    const boxY = 36;
    const leftX = pad;
    const rightX = w - pad - boxW;
    const railStart = leftX + boxW;
    const railEnd = rightX;
    const railSpan = Math.max(40, railEnd - railStart);

    // Order-book micro-depth bars along the background of the fabric lane
    const barCount = Math.max(10, Math.floor(railSpan / 18));
    const barStep = railSpan / barCount;
    for (let i = 0; i < barCount; i++) {
      const bx = railStart + i * barStep + 4;
      const bh = 8 + Math.abs(Math.sin(bmTime * 3.1 + i * 0.9)) * 22;
      ctx.fillStyle = i % 2 === 0 ? "rgba(200,255,0,0.16)" : "rgba(255,72,0,0.16)";
      ctx.fillRect(bx, h - bh - 12, Math.max(4, barStep - 8), bh);
    }

    // Two dedicated low-latency fabric rails (ORDER ->, FILL/ACK <-)
    const yOrder = boxY + 18;
    const yFill = boxY + 40;
    ctx.strokeStyle = "rgba(200,255,0,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railStart, yOrder);
    ctx.lineTo(railEnd, yOrder);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,72,0,0.55)";
    ctx.beginPath();
    ctx.moveTo(railStart, yFill);
    ctx.lineTo(railEnd, yFill);
    ctx.stroke();

    // High-velocity deterministic order pulses (left -> right) & matching acks (right -> left)
    for (let i = 0; i < 4; i++) {
      const p1 = (bmTime * 0.95 + i * 0.25) % 1;
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(railStart + p1 * (railSpan - 22), yOrder - 4, 22, 8);

      const p2 = (bmTime * 0.95 + i * 0.25 + 0.12) % 1;
      ctx.fillStyle = "#ff4800";
      ctx.fillRect(railEnd - 22 - p2 * (railSpan - 22), yFill - 4, 22, 8);
    }

    // Left block: Trading Gateway
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2;
    ctx.fillRect(leftX, boxY, boxW, boxH);
    ctx.strokeRect(leftX, boxY, boxW, boxH);
    ctx.fillStyle = "#c8ff00";
    ctx.font = `700 ${compact ? 9 : 11}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(compact ? "TRADING" : "TRADING GATEWAY", leftX + boxW * 0.5, boxY + 25);
    ctx.fillStyle = "#eae8e1";
    ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
    ctx.fillText(compact ? "GATEWAY" : "ORDER STREAM →", leftX + boxW * 0.5, boxY + 42);

    // Right block: Matching Engine
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = "#ff4800";
    ctx.lineWidth = 2;
    ctx.fillRect(rightX, boxY, boxW, boxH);
    ctx.strokeRect(rightX, boxY, boxW, boxH);
    ctx.fillStyle = "#ff4800";
    ctx.font = `700 ${compact ? 9 : 11}px 'JetBrains Mono', monospace`;
    ctx.fillText(compact ? "MATCHING" : "MATCHING ENGINE", rightX + boxW * 0.5, boxY + 25);
    ctx.fillStyle = "#eae8e1";
    ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
    ctx.fillText(compact ? "ENGINE" : "← FILL / ACK", rightX + boxW * 0.5, boxY + 42);

    // Header label
    ctx.fillStyle = "#eae8e1";
    ctx.font = `700 ${compact ? 8.5 : 10}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText("DEDICATED BARE METAL FABRIC // ORDER-BOOK PULSE RAIL", pad, 20);
    if (!compact) {
      ctx.fillStyle = "#b8b5aa";
      ctx.textAlign = "right";
      ctx.fillText("CONCEPTUAL VISUAL — NO BENCHMARK CLAIMS", w - pad, 20);
    }
  }

  let bmAsciiLastTick = -1;
  function tickBm(now) {
    bmRaf = 0;
    if (!motionEnabled || !bmVisible || document.hidden) {
      bmPrev = 0;
      return;
    }
    if (!bmPrev || now - bmPrev >= 33) {
      const dt = bmPrev ? Math.min(0.06, (now - bmPrev) / 1000) : 0.033;
      bmPrev = now;
      bmTime += dt;
      bmSlamFlash = Math.max(0, bmSlamFlash - dt * 3.5);
      drawBmCanvas();
      drawCmeCanvas();

      const asciiTick = Math.floor(bmTime * 1.5);
      if (bmAscii && asciiTick !== bmAsciiLastTick) {
        bmAsciiLastTick = asciiTick;
        bmAscii.textContent = BM_ASCII_FRAMES[bmLayer](asciiTick);
      }
    }
    bmRaf = requestAnimationFrame(tickBm);
  }

  function syncBmLoop() {
    if (motionEnabled && bmVisible && !document.hidden) {
      if (!bmRaf) bmRaf = requestAnimationFrame(tickBm);
    } else {
      cancelAnimationFrame(bmRaf);
      bmRaf = 0;
      bmPrev = 0;
      drawBmCanvas();
      drawCmeCanvas();
    }
  }

  /* ========================================================================
     5. PROJECTS KINETIC INDEX SLATS (01–07) + DOMAIN-SPECIFIC CANVAS STAGE
     ======================================================================== */
  const PROJECTS = {
    seed: {
      num: "01",
      name: "SEED",
      kind: "5G FAILURE DIAGNOSIS & SIM RECOVERY",
      desc: "Diagnosing and recovering from 5G failures through the SIM.",
      link: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      linkText: "Read the SIGCOMM ’22 paper",
      actionLabel: "Inject 5G Fault ⚡",
      showAction: true,
      hud: "CLICK CANVAS OR BUTTON TO TRIGGER 5G FAULT → SIM RECOVERY",
      status: "5G UE ↔ SIM/SEED ↔ 5G Core active · Click to inject fault",
    },
    secureSIM: {
      num: "02",
      name: "SecureSIM",
      kind: "eSIM CERT & POLICY ACCESS GATE",
      desc: "Authentication and fine-grained access control for SIM and eSIM.",
      link: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      linkText: "Read the MobiCom ’21 paper",
      actionLabel: "Probe Gate",
      showAction: false,
      hud: "CLICK VALID CERT OR UNAUTH APP TO TEST eSIM PARTITION ISOLATION",
      status: "eSIM policy gate active · Valid certs unlock only scoped partition",
    },
    gptcodelearner: {
      num: "03",
      name: "GPT-Code-Learner",
      kind: "CODEBASE AST & LLM CALL-GRAPH",
      desc: "Explore a codebase through questions, context, and GPT.",
      link: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      linkText: "Explore on GitHub",
      actionLabel: "Next Query",
      showAction: false,
      hud: "SELECT A QUERY TO SWEEP LLM SPOTLIGHT ACROSS CALL GRAPH",
      status: "Query 01: entry/main.py → sec/auth.py → sim/sim_core.py",
    },
    sonica: {
      num: "04",
      name: "Sonica",
      kind: "NB-IOT WATERFALL SPECTROGRAM & DECODER",
      desc: "An open NB-IoT network for experiments with real devices.",
      link: "https://github.com/sonica-nbiot/sonica",
      linkText: "Explore on GitHub",
      actionLabel: "Fire IoT Burst ≋",
      showAction: true,
      hud: "SLIDE CHANNEL TUNER OR CLICK CANVAS TO DECODE NB-IOT BURSTS",
      status: "Tuned to narrowband CH-04 · Decoding Sync, Control & Uplink frames",
    },
    flora: {
      num: "05",
      name: "Flora",
      kind: "4-TIER PROGRAMMABLE CELLULAR STACK",
      desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
      link: "https://project-flora.github.io/Flora/",
      linkText: "Explore the project",
      actionLabel: "Pulse Stack",
      showAction: false,
      hud: "CLICK ANY LAYER OR RULE SWITCH TO REPROGRAM PACKET ROUTING",
      status: "eSIM → RAN → 5G Core → Edge VR bidirectional stack online",
    },
    lrp: {
      num: "06",
      name: "Mobile VR Latency",
      kind: "6DOF VR + WIRELESS UPLINK SCHEDULER",
      desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
      link: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      linkText: "Read the NSDI ’21 paper",
      actionLabel: "Head Turn Impulse ⟐",
      showAction: true,
      hud: "MOVE POINTER TO ROTATE VR HEAD POSE · CONCEPTUAL SIMULATION",
      status: "Proactive: pre-allocated grants lock rendered VR frame to head pose",
    },
    acemap: {
      num: "07",
      name: "Acemap",
      kind: "2,208-TOPIC KNOWLEDGE GRAPH",
      desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
      link: "https://acemap.sjtu.edu.cn/",
      linkText: "Explore Acemap",
      actionLabel: "Reset Map ⌖",
      showAction: true,
      hud: "LOAD CSV FOR 2,208 TOPICS, CLUSTER LABELS & NEIGHBOR LINKS",
      status: "Ready · Click Load Dataset to fetch ../../data/data.csv",
    },
  };

  const projectCanvas = $("#project-canvas");
  const projectStage = $("#project-stage");
  const stageCode = $("#stage-code");
  const stageKind = $("#stage-kind");
  const stageHud = $("#stage-hud");
  const stageTitle = $("#stage-title");
  const stageDesc = $("#stage-desc");
  const stageLink = $("#stage-link");
  const stageActionBtn = $("#stage-action-btn");
  const stageStatus = $("#stage-status");
  const vrModeBtn = $("#vr-mode-btn");
  const ctrlSecureSim = $("#ctrl-securesim");
  const ctrlGpt = $("#ctrl-gpt");
  const ctrlSonica = $("#ctrl-sonica");
  const ctrlFlora = $("#ctrl-flora");
  const sonicaSlider = $("#sonica-ch-slider");
  const sonicaChLabel = $("#sonica-ch-label");
  const acemapControls = $("#acemap-controls");
  const acemapLoadBtn = $("#acemap-load-btn");
  const acemapSearchWrap = $("#acemap-search-wrap");
  const acemapSearchInput = $("#acemap-search");
  const acemapFieldWrap = $("#acemap-field-wrap");
  const acemapTopicWrap = $("#acemap-topic-wrap");
  const acemapFieldSelect = $("#acemap-field");
  const acemapTopicSelect = $("#acemap-topic");
  const acemapReadout = $("#acemap-readout");
  const slatButtons = $$("[data-select-project]");

  let activeProject = "seed";
  let stageVisible = false;
  let stageRaf = 0;
  let stageTime = 0;
  let stagePrev = 0;
  let stagePtrX = 0.5;
  let stagePtrY = 0.5;
  let stagePtrInside = false;

  /* --- Per-project domain states --- */
  // 01. SEED: 0=locked, >0 runs 7.2s choreography (0..2.2 fault, 2.2..4.8 diagnose, 4.8..6.8 recover, 6.8..7.2 lock)
  const seedState = {
    cycle: 0.4, // start mid-demo so visitors immediately see the mechanism!
    active: true,
  };

  // 02. SecureSIM
  const secureState = {
    mode: "allow", // allow | deny
    progress: 0.15,
    pulseCount: 0,
  };

  // 03. GPT-Code-Learner
  const GPT_QUERIES = [
    {
      label: "Trace Auth Flow",
      path: ["main", "auth", "sim"],
      callout: "01 entry/main.py → 02 sec/auth.py (verify_cert) → 03 sim/sim_core.py (open_channel)",
    },
    {
      label: "Explain Routing",
      path: ["main", "router", "fabric"],
      callout: "01 entry/main.py → 02 net/router.py (select_path) → 03 sys/fabric.py (dispatch)",
    },
    {
      label: "Find Entry Points",
      path: ["indexer", "main", "gpt"],
      callout: "01 ctx/indexer.py (scan_ast) → 02 entry/main.py (boot) → 03 gpt/explainer.py (summarize)",
    },
  ];
  const gptState = {
    queryIdx: 0,
    sweep: 0,
  };

  // 04. Sonica NB-IoT waterfall history
  const SONICA_ROWS = 22;
  const SONICA_COLS = 9;
  const sonicaState = {
    channel: 4, // 1..9
    burst: 0.8,
    waterfall: Array.from({ length: SONICA_ROWS }, (_, r) =>
      Array.from({ length: SONICA_COLS }, (_, c) =>
        c === 3 ? 0.85 : c === 0 ? 0.55 : ((r * 7 + c * 13) % 10) * 0.025,
      ),
    ),
    rowTimer: 0,
    seq: 1,
  };

  // 05. Flora 4-tier programmable hooks
  const FLORA_RULES = [
    { off: "eSIM: Prof-A", on: "eSIM: Prof-B", descOff: "PROFILE-A (PRIMARY)", descOn: "PROFILE-B (FAILOVER)" },
    { off: "RAN: URLLC", on: "RAN: Shared", descOff: "URLLC DEDICATED SLICE", descOn: "SHARED BANDWIDTH SLICE" },
    { off: "Core: Fast", on: "Core: Inspect", descOff: "5G CORE FAST-PATH", descOn: "CORE DEEP-INSPECT HOOK" },
    { off: "Edge: Offload", on: "Edge: Local", descOff: "EDGE VR GPU OFFLOAD", descOn: "LOCAL RENDER FALLBACK" },
  ];
  const floraState = {
    toggled: [false, false, false, false], // 0=eSIM, 1=RAN, 2=Core, 3=Edge
    flashLayer: -1,
    flashTimer: 0,
  };

  // 06. Mobile VR Latency
  const vrState = {
    proactive: true,
    targetYaw: 0,
    targetPitch: 0,
    displayYaw: 0,
    displayPitch: 0,
    impulse: 0,
  };

  // 07. Acemap 2,208-topic dataset (strictly on-demand!)
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
    "PSYCH",
    "POLI SCI",
    "MATH",
    "ENV SCI",
    "COMP SCI",
    "MEDICINE",
    "BIOLOGY",
    "HISTORY",
    "PHYSICS",
    "GEOLOGY",
    "ENG",
    "PHIL",
    "ART",
    "SOC",
    "BUSINESS",
    "ECON",
    "CHEM",
    "MAT SCI",
    "GEOG",
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
  const ACEMAP_BRUTAL_PALETTE = [
    "#c8ff00",
    "#e4ff73",
    "#a8e600",
    "#ff4800",
    "#c8ff00",
    "#d7ff4d",
    "#95ff66",
    "#ff8c42",
    "#b8ff29",
    "#eae8e1",
    "#c8ff00",
    "#d0ff6b",
    "#ff6b2b",
    "#a4ff4d",
    "#f0ff99",
    "#ffb84d",
    "#c4ff33",
    "#8aff66",
    "#e8ff80",
  ];

  const acemapState = {
    loaded: false,
    loading: false,
    points: [],
    centroids: [],
    aspect: 1,
    selectedField: "all",
    searchQuery: "",
    hoveredIndex: -1,
    selectedIndex: -1,
  };

  function getAcemapBounds(w, h) {
    const padX = 28;
    const padY = 28;
    const availW = Math.max(1, w - padX * 2);
    const availH = Math.max(1, h - padY * 2);
    const aspect = acemapState.aspect || 1;
    let drawW = availW;
    let drawH = drawW / aspect;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * aspect;
    }
    return {
      offsetX: (w - drawW) * 0.5,
      offsetY: (h - drawH) * 0.5 + 4,
      drawW,
      drawH,
    };
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

  function isAcemapPointActive(i) {
    const pt = acemapState.points[i];
    if (
      acemapState.selectedField !== "all" &&
      pt.field !== Number(acemapState.selectedField)
    ) {
      return false;
    }
    if (acemapState.searchQuery) {
      return pt.nameLower.includes(acemapState.searchQuery);
    }
    return true;
  }

  function computeAcemapCentroids(pts) {
    const sums = ACEMAP_FIELDS.map((_, idx) => ({
      field: idx,
      sx: 0,
      sy: 0,
      count: 0,
    }));
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      sums[p.field].sx += p.nx;
      sums[p.field].sy += p.ny;
      sums[p.field].count++;
    }
    return sums
      .filter((s) => s.count > 0)
      .map((s) => ({
        field: s.field,
        nx: s.sx / s.count,
        ny: s.sy / s.count,
        count: s.count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  function getNearestNeighbors(idx, k) {
    const src = acemapState.points[idx];
    if (!src) return [];
    const best = [];
    for (let i = 0; i < acemapState.points.length; i++) {
      if (i === idx) continue;
      const pt = acemapState.points[i];
      const d2 = (pt.nx - src.nx) ** 2 + (pt.ny - src.ny) ** 2;
      if (best.length < k) {
        best.push({ i, d2 });
        best.sort((a, b) => a.d2 - b.d2);
      } else if (d2 < best[k - 1].d2) {
        best[k - 1] = { i, d2 };
        best.sort((a, b) => a.d2 - b.d2);
      }
    }
    return best.map((b) => b.i);
  }

  function refreshAcemapDropdowns() {
    if (!acemapTopicSelect || !acemapReadout) return;
    acemapState.hoveredIndex = -1;
    let firstMatch = -1;
    let count = 0;
    acemapTopicSelect.replaceChildren(new Option("Choose a topic", ""));
    for (let i = 0; i < acemapState.points.length; i++) {
      if (isAcemapPointActive(i)) {
        if (firstMatch < 0) firstMatch = i;
        count++;
        acemapTopicSelect.add(new Option(acemapState.points[i].name, String(i)));
      }
    }
    if (acemapState.searchQuery && firstMatch >= 0) {
      acemapState.selectedIndex = firstMatch;
      acemapTopicSelect.value = String(firstMatch);
    } else {
      acemapState.selectedIndex = -1;
    }
    const label =
      acemapState.selectedField === "all"
        ? "All 19 disciplines"
        : ACEMAP_FIELDS[Number(acemapState.selectedField)];
    const searchSuffix = acemapState.searchQuery
      ? ` matching "${acemapState.searchQuery}"`
      : "";
    acemapReadout.textContent = `${label} · ${count.toLocaleString()} topics${searchSuffix} · Hover or click any node for neighbor links.`;
    if (stageStatus) {
      stageStatus.textContent = `${label} · ${count.toLocaleString()} topics`;
    }
    drawProjectCanvas();
  }

  async function loadAcemapCSV() {
    if (acemapState.loaded || acemapState.loading) return;
    acemapState.loading = true;
    if (acemapLoadBtn) {
      acemapLoadBtn.disabled = true;
      acemapLoadBtn.textContent = "Loading 2,208 topics…";
    }
    if (acemapReadout) {
      acemapReadout.textContent = "Fetching ../../data/data.csv…";
    }
    try {
      const res = await fetch("../../data/data.csv");
      if (!res.ok) throw new Error("CSV unavailable");
      const rows = parseCSV(await res.text()).slice(1);
      const pts = rows
        .map((r) => ({
          x: Number(r[0]),
          y: Number(r[1]),
          size: Number(r[2]) || 4,
          name: r[3] || "",
          nameLower: (r[3] || "").toLowerCase(),
          color: r[4] || "",
          field: ACEMAP_SOURCE_COLORS.indexOf(r[4]),
          nx: 0,
          ny: 0,
        }))
        .filter(
          (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
        );
      if (!pts.length) throw new Error("No valid topics found");

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].x < minX) minX = pts[i].x;
        if (pts[i].x > maxX) maxX = pts[i].x;
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      const dx = Math.max(1, maxX - minX);
      const dy = Math.max(1, maxY - minY);
      for (let i = 0; i < pts.length; i++) {
        pts[i].nx = (pts[i].x - minX) / dx;
        pts[i].ny = (pts[i].y - minY) / dy;
      }

      acemapState.points = pts;
      acemapState.aspect = dx / dy;
      acemapState.centroids = computeAcemapCentroids(pts);
      acemapState.loaded = true;

      if (acemapFieldSelect && acemapFieldSelect.options.length <= 1) {
        ACEMAP_FIELDS.forEach((fieldName, idx) => {
          acemapFieldSelect.add(new Option(fieldName, String(idx)));
        });
      }
      if (acemapLoadBtn) acemapLoadBtn.hidden = true;
      if (acemapSearchWrap) acemapSearchWrap.hidden = false;
      if (acemapFieldWrap) acemapFieldWrap.hidden = false;
      if (acemapTopicWrap) acemapTopicWrap.hidden = false;
      if (stageHud) {
        stageHud.textContent = "HOVER OR CLICK NODE FOR SCHOLARLY NEIGHBOR LINKS";
      }
      refreshAcemapDropdowns();
    } catch {
      acemapState.loading = false;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = false;
        acemapLoadBtn.textContent = "Retry loading dataset ↗";
      }
      if (acemapReadout) {
        acemapReadout.textContent =
          "Could not load ../../data/data.csv. Serve over HTTP or visit Acemap directly.";
      }
    }
  }

  if (acemapLoadBtn) acemapLoadBtn.addEventListener("click", loadAcemapCSV);
  if (acemapFieldSelect) {
    acemapFieldSelect.addEventListener("change", () => {
      acemapState.selectedField = acemapFieldSelect.value;
      refreshAcemapDropdowns();
    });
  }
  if (acemapSearchInput) {
    acemapSearchInput.addEventListener("input", () => {
      acemapState.searchQuery = acemapSearchInput.value.trim().toLowerCase();
      refreshAcemapDropdowns();
    });
  }
  if (acemapTopicSelect) {
    acemapTopicSelect.addEventListener("change", () => {
      const val = acemapTopicSelect.value;
      acemapState.selectedIndex = val === "" ? -1 : Number(val);
      if (acemapState.selectedIndex >= 0 && acemapState.points[acemapState.selectedIndex]) {
        const pt = acemapState.points[acemapState.selectedIndex];
        acemapReadout.textContent = `LOCKED // ${pt.name} · ${ACEMAP_FIELDS[pt.field]} (5 neighbor links shown)`;
      } else {
        refreshAcemapDropdowns();
      }
      drawProjectCanvas();
    });
  }

  function findNearestAcemapPoint(clientX, clientY, maxPx) {
    if (!acemapState.loaded || !projectCanvas) return -1;
    const rect = projectCanvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { offsetX, offsetY, drawW, drawH } = getAcemapBounds(
      rect.width,
      rect.height,
    );

    let best = -1;
    let bestD2 = maxPx * maxPx;
    for (let i = 0; i < acemapState.points.length; i++) {
      if (!isAcemapPointActive(i)) continue;
      const sx = offsetX + acemapState.points[i].nx * drawW;
      const sy = offsetY + acemapState.points[i].ny * drawH;
      const d2 = (sx - px) ** 2 + (sy - py) ** 2;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  /* --- Project Controls Wiring --- */
  $$("[data-securesim-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      secureState.mode = btn.dataset.securesimMode;
      secureState.progress = 0;
      if (stageStatus) {
        stageStatus.textContent =
          secureState.mode === "allow"
            ? "VALID CERT → Policy gate opened · Scoped PART-A: AUTH unlocked"
            : "UNAUTH / OVER-PRIV APP → Deflected at policy barrier · DENIED";
      }
      drawProjectCanvas();
    });
  });

  $$("[data-gpt-query]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.gptQuery);
      gptState.queryIdx = idx;
      gptState.sweep = 0;
      $$("[data-gpt-query]").forEach((b) => {
        const active = Number(b.dataset.gptQuery) === idx;
        b.classList.toggle("is-ctx-active", active);
        b.classList.toggle("stage-btn-secondary", !active);
        b.setAttribute("aria-pressed", String(active));
      });
      if (stageStatus) stageStatus.textContent = GPT_QUERIES[idx].callout;
      drawProjectCanvas();
    });
  });

  if (sonicaSlider) {
    sonicaSlider.addEventListener("input", () => {
      sonicaState.channel = Number(sonicaSlider.value);
      sonicaState.burst = 1.0;
      if (sonicaChLabel) {
        sonicaChLabel.textContent = `TUNE CH-0${sonicaState.channel}`;
      }
      if (stageStatus) {
        stageStatus.textContent = `Tuned to narrowband CH-0${sonicaState.channel} · Decoding live IoT sensor frames`;
      }
      drawProjectCanvas();
    });
  }

  function toggleFloraLayer(layerIdx) {
    floraState.toggled[layerIdx] = !floraState.toggled[layerIdx];
    floraState.flashLayer = layerIdx;
    floraState.flashTimer = 1.0;
    const rule = FLORA_RULES[layerIdx];
    const btn = document.querySelector(`[data-flora-layer="${layerIdx}"]`);
    if (btn) {
      const isOn = floraState.toggled[layerIdx];
      btn.setAttribute("aria-pressed", String(isOn));
      btn.classList.toggle("is-ctx-active", isOn);
      btn.textContent = isOn ? rule.on : rule.off;
    }
    if (stageStatus) {
      stageStatus.textContent = `Hook updated: ${floraState.toggled[layerIdx] ? rule.descOn : rule.descOff}`;
    }
    drawProjectCanvas();
  }

  $$("[data-flora-layer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleFloraLayer(Number(btn.dataset.floraLayer));
    });
  });

  function selectProject(id, shouldScrollStage) {
    const meta = PROJECTS[id];
    if (!meta) return;
    activeProject = id;

    slatButtons.forEach((btn) => {
      const isTarget = btn.dataset.selectProject === id;
      btn.setAttribute("aria-expanded", String(isTarget));
      const slat = btn.closest(".slat");
      if (slat) slat.classList.toggle("is-active", isTarget);
    });

    if (stageCode) stageCode.textContent = `STAGE // ${meta.num} — ${meta.name.toUpperCase()}`;
    if (stageKind) stageKind.textContent = meta.kind;
    if (stageTitle) stageTitle.textContent = meta.name;
    if (stageDesc) stageDesc.textContent = meta.desc;
    if (stageLink) {
      stageLink.href = meta.link;
      stageLink.innerHTML = `${meta.linkText} <span aria-hidden="true">↗</span>`;
    }
    if (stageActionBtn) {
      stageActionBtn.hidden = !meta.showAction;
      stageActionBtn.textContent = meta.actionLabel;
    }
    if (ctrlSecureSim) ctrlSecureSim.hidden = id !== "secureSIM";
    if (ctrlGpt) ctrlGpt.hidden = id !== "gptcodelearner";
    if (ctrlSonica) ctrlSonica.hidden = id !== "sonica";
    if (ctrlFlora) ctrlFlora.hidden = id !== "flora";
    if (vrModeBtn) vrModeBtn.hidden = id !== "lrp";
    if (acemapControls) acemapControls.hidden = id !== "acemap";

    if (stageHud) {
      stageHud.textContent =
        id === "acemap" && acemapState.loaded
          ? "HOVER OR CLICK NODE FOR SCHOLARLY NEIGHBOR LINKS"
          : meta.hud;
    }
    if (stageStatus) {
      if (id === "lrp") {
        stageStatus.textContent = vrState.proactive
          ? "Proactive: pre-allocated grants lock rendered VR frame to head pose"
          : "Standard: queued UL packets & trailing orange VR ghost lag";
      } else if (id === "gptcodelearner") {
        stageStatus.textContent = GPT_QUERIES[gptState.queryIdx].callout;
      } else if (id === "acemap" && acemapState.loaded) {
        const label =
          acemapState.selectedField === "all"
            ? "All 19 disciplines"
            : ACEMAP_FIELDS[Number(acemapState.selectedField)];
        stageStatus.textContent = `${label} · ${acemapState.points.length.toLocaleString()} topics`;
      } else {
        stageStatus.textContent = meta.status;
      }
    }

    drawProjectCanvas();

    if (shouldScrollStage && window.innerWidth <= 1080 && projectStage) {
      const top = projectStage.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: motionEnabled ? "smooth" : "auto",
      });
    }
  }

  slatButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectProject(btn.dataset.selectProject, true);
    });
  });

  function triggerStageAction(normX, normY) {
    if (activeProject === "seed") {
      seedState.cycle = 0;
      seedState.active = true;
      if (stageStatus) {
        stageStatus.textContent =
          "5G LINK DROP → SIM/SEED out-of-band diagnosis → recovery action";
      }
    } else if (activeProject === "secureSIM") {
      secureState.mode = secureState.mode === "allow" ? "deny" : "allow";
      secureState.progress = 0;
      if (stageStatus) {
        stageStatus.textContent =
          secureState.mode === "allow"
            ? "VALID CERT → Policy gate opened · Scoped PART-A: AUTH unlocked"
            : "UNAUTH / OVER-PRIV APP → Deflected at policy barrier · DENIED";
      }
    } else if (activeProject === "gptcodelearner") {
      const next = (gptState.queryIdx + 1) % GPT_QUERIES.length;
      const btn = document.querySelector(`[data-gpt-query="${next}"]`);
      if (btn) btn.click();
    } else if (activeProject === "sonica") {
      sonicaState.burst = 1.0;
      sonicaState.seq++;
      if (stageStatus) {
        stageStatus.textContent = `OTA burst #${sonicaState.seq} decoded on NB-IoT CH-0${sonicaState.channel} [CRC OK]`;
      }
    } else if (activeProject === "flora") {
      // Map vertical click position to tier 3 (top Edge) down to 0 (bottom eSIM)
      const ny = normY ?? 0.5;
      const tier = Math.max(0, Math.min(3, 3 - Math.floor(ny * 4)));
      toggleFloraLayer(tier);
    } else if (activeProject === "lrp") {
      vrState.impulse = 1.0;
      if (stageStatus) {
        stageStatus.textContent = vrState.proactive
          ? "Head turn impulse · Pre-allocated UL grants maintain tight VR lock"
          : "Head turn impulse · Reactive UL queue introduces visible VR ghost lag";
      }
    } else if (activeProject === "acemap") {
      if (!acemapState.loaded) {
        loadAcemapCSV();
      } else {
        acemapState.selectedField = "all";
        acemapState.searchQuery = "";
        if (acemapFieldSelect) acemapFieldSelect.value = "all";
        if (acemapSearchInput) acemapSearchInput.value = "";
        refreshAcemapDropdowns();
      }
    }
    drawProjectCanvas();
  }

  if (stageActionBtn) {
    stageActionBtn.addEventListener("click", () => triggerStageAction());
  }

  if (vrModeBtn) {
    vrModeBtn.addEventListener("click", () => {
      vrState.proactive = !vrState.proactive;
      vrModeBtn.setAttribute("aria-pressed", String(vrState.proactive));
      vrModeBtn.textContent = vrState.proactive
        ? "Mode: Proactive"
        : "Mode: Standard";
      if (stageStatus) {
        stageStatus.textContent = vrState.proactive
          ? "Proactive: pre-allocated grants lock rendered VR frame to head pose"
          : "Standard: queued UL packets & trailing orange VR ghost lag";
      }
      drawProjectCanvas();
    });
  }

  if (projectCanvas) {
    projectCanvas.addEventListener(
      "pointermove",
      (ev) => {
        const rect = projectCanvas.getBoundingClientRect();
        stagePtrX = Math.min(1, Math.max(0, (ev.clientX - rect.left) / Math.max(1, rect.width)));
        stagePtrY = Math.min(1, Math.max(0, (ev.clientY - rect.top) / Math.max(1, rect.height)));
        stagePtrInside = true;

        if (activeProject === "acemap" && acemapState.loaded) {
          const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 16);
          if (idx !== acemapState.hoveredIndex) {
            acemapState.hoveredIndex = idx;
            if (idx >= 0 && acemapReadout) {
              const pt = acemapState.points[idx];
              acemapReadout.textContent = `HOVER // ${pt.name} · ${ACEMAP_FIELDS[pt.field]} (showing 5 nearest neighbors)`;
            }
            drawProjectCanvas();
          }
        }
      },
      { passive: true },
    );

    projectCanvas.addEventListener("pointerleave", () => {
      stagePtrInside = false;
      if (activeProject === "acemap" && acemapState.hoveredIndex !== -1) {
        acemapState.hoveredIndex = -1;
        drawProjectCanvas();
      }
    });

    projectCanvas.addEventListener("click", (ev) => {
      const rect = projectCanvas.getBoundingClientRect();
      const nx = (ev.clientX - rect.left) / Math.max(1, rect.width);
      const ny = (ev.clientY - rect.top) / Math.max(1, rect.height);

      if (activeProject === "acemap" && acemapState.loaded) {
        const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 20);
        if (idx >= 0) {
          acemapState.selectedIndex = idx;
          if (acemapTopicSelect) acemapTopicSelect.value = String(idx);
          const pt = acemapState.points[idx];
          if (acemapReadout) {
            acemapReadout.textContent = `LOCKED // ${pt.name} · ${ACEMAP_FIELDS[pt.field]} (5 neighbor links shown)`;
          }
          drawProjectCanvas();
        }
        return;
      }
      triggerStageAction(nx, ny);
    });
  }

  /* ========================================================================
     6. 7 DOMAIN-SPECIFIC NEO-BRUTALIST GENERATIVE CANVAS RENDERERS
     ======================================================================== */

  // Helper: draw notched SIM/eSIM chip with ISO-7816 contact pads
  function drawNotchedSimChip(ctx, x, y, w, h, strokeColor, padFill, label) {
    const cut = Math.min(w, h) * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = "#121215";
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Contact pad grid
    const px = x + w * 0.16;
    const py = y + h * 0.34;
    const pw = w * 0.68;
    const ph = h * 0.44;
    ctx.fillStyle = padFill;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#0b0b0c";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.34, py);
    ctx.lineTo(px + pw * 0.34, py + ph);
    ctx.moveTo(px + pw * 0.66, py);
    ctx.lineTo(px + pw * 0.66, py + ph);
    ctx.moveTo(px, py + ph * 0.5);
    ctx.lineTo(px + pw, py + ph * 0.5);
    ctx.stroke();

    ctx.fillStyle = strokeColor;
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w * 0.5, y + h * 0.22);
  }

  // 01. SEED — 5G UE + Notched SIM/SEED Chip + 5G Core choreography
  function drawSeedArt(ctx, w, h, t) {
    const compact = w < 440;
    const pad = compact ? 12 : 22;

    // Determine choreography phase (0..2.2 FAULT, 2.2..4.8 DIAGNOSE, 4.8..6.8 RECOVER, 6.8..9.6 LOCKED)
    const cyc = seedState.cycle;
    const phase =
      cyc < 2.2
        ? "fault"
        : cyc < 4.8
          ? "diagnose"
          : cyc < 6.8
            ? "recover"
            : "locked";

    // Top 5G Bearer Highway coordinates
    const ueW = compact ? 74 : 96;
    const ueH = compact ? 112 : 128;
    const ueX = pad;
    const ueY = 44;

    const coreW = compact ? 84 : 112;
    const coreH = compact ? 112 : 128;
    const coreX = w - pad - coreW;
    const coreY = 44;

    const simW = compact ? 104 : 130;
    const simH = compact ? 84 : 96;
    const simX = (w - simW) * 0.5;
    const simY = h - simH - 30;

    // 5G RF Bearer Waveform between 5G UE and 5G Core
    const waveY = ueY + ueH * 0.44;
    const waveL = ueX + ueW + 8;
    const waveR = coreX - 8;

    ctx.strokeStyle = phase === "fault" ? "#ff4800" : phase === "diagnose" ? "rgba(255,72,0,0.45)" : "#c8ff00";
    ctx.lineWidth = phase === "fault" ? 2.5 : 2.2;
    ctx.beginPath();
    for (let x = waveL; x <= waveR; x += 4) {
      const u = (x - waveL) / Math.max(1, waveR - waveL);
      let y = waveY;
      if (phase === "fault") {
        // Broken jagged drop in center
        if (u > 0.36 && u < 0.64) continue;
        y = waveY + Math.sin(u * 40 + t * 24) * 14;
      } else if (phase === "diagnose") {
        y = waveY + Math.sin(u * 20) * 4;
      } else {
        y = waveY + Math.sin(u * 26 - t * 8) * 12;
      }
      if (x === waveL || (phase === "fault" && Math.abs(u - 0.64) < 0.03)) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bearer badge above waveform
    const bearerMidX = (waveL + waveR) * 0.5;
    const bearerBadge =
      phase === "fault"
        ? "✕ 5G LINK DROP"
        : phase === "diagnose"
          ? "SIM OUT-OF-BAND PROBE"
          : phase === "recover"
            ? "⚡ RECOVERY ACTION"
            : "5G BEARER LOCKED";
    const badgeColor = phase === "fault" ? "#ff4800" : "#c8ff00";
    ctx.fillStyle = badgeColor;
    const bw = Math.min(waveR - waveL, compact ? 132 : 178);
    ctx.fillRect(bearerMidX - bw * 0.5, waveY - 38, bw, 20);
    ctx.fillStyle = "#0b0b0c";
    ctx.font = `700 ${compact ? 8.5 : 10}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(bearerBadge, bearerMidX, waveY - 24);

    // Out-of-band SIM diagnostic traces: UE -> SIM/SEED -> 5G Core
    ctx.strokeStyle =
      phase === "diagnose" || phase === "recover"
        ? "#c8ff00"
        : "rgba(234,232,225,0.24)";
    ctx.lineWidth = phase === "diagnose" || phase === "recover" ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.moveTo(ueX + ueW * 0.5, ueY + ueH);
    ctx.lineTo(ueX + ueW * 0.5, simY + simH * 0.5);
    ctx.lineTo(simX, simY + simH * 0.5);
    ctx.moveTo(simX + simW, simY + simH * 0.5);
    ctx.lineTo(coreX + coreW * 0.5, simY + simH * 0.5);
    ctx.lineTo(coreX + coreW * 0.5, coreY + coreH);
    ctx.stroke();

    // Animated pulse packets along SIM channels
    if (phase === "diagnose") {
      const p = ((cyc - 2.2) / 2.6) % 1;
      const px = simX + simW + p * (coreX + coreW * 0.5 - (simX + simW));
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(px - 8, simY + simH * 0.5 - 5, 16, 10);

      // Cause inferred stamp above SIM
      ctx.fillStyle = "#ff4800";
      ctx.fillRect(simX, simY - 24, simW, 18);
      ctx.fillStyle = "#0b0b0c";
      ctx.font = "700 9.5px 'JetBrains Mono', monospace";
      ctx.fillText("CAUSE INFERRED", simX + simW * 0.5, simY - 12);
    } else if (phase === "recover") {
      const p = ((cyc - 4.8) / 2.0) % 1;
      const px = simX - p * (simX - (ueX + ueW * 0.5));
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(px - 10, simY + simH * 0.5 - 6, 20, 12);
    }

    // Left: 5G UE handset chassis
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = phase === "fault" ? "#ff4800" : "#eae8e1";
    ctx.lineWidth = 2;
    ctx.fillRect(ueX, ueY, ueW, ueH);
    ctx.strokeRect(ueX, ueY, ueW, ueH);
    // Screen inner frame
    ctx.fillStyle = "#070708";
    ctx.fillRect(ueX + 8, ueY + 18, ueW - 16, ueH - 36);
    // Signal bars inside UE
    for (let b = 0; b < 4; b++) {
      const barOn = phase === "locked" || (phase === "recover" && b < 3);
      ctx.fillStyle = phase === "fault" ? "#ff4800" : barOn ? "#c8ff00" : "#2f2f35";
      ctx.fillRect(ueX + 16 + b * 11, ueY + 62 - b * 7, 7, 10 + b * 7);
    }
    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("5G UE", ueX + ueW * 0.5, ueY + ueH - 6);

    // Right: 5G Core rack monolith
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = phase === "diagnose" ? "#c8ff00" : "#eae8e1";
    ctx.lineWidth = 2;
    ctx.fillRect(coreX, coreY, coreW, coreH);
    ctx.strokeRect(coreX, coreY, coreW, coreH);
    for (let r = 0; r < 3; r++) {
      const ry = coreY + 14 + r * 28;
      ctx.strokeStyle = "#3a3a42";
      ctx.strokeRect(coreX + 10, ry, coreW - 20, 20);
      ctx.fillStyle = phase === "diagnose" && r === 1 ? "#c8ff00" : "#ff4800";
      ctx.fillRect(coreX + 15, ry + 7, 6, 6);
      ctx.fillStyle = "#eae8e1";
      ctx.fillRect(coreX + 28, ry + 9, coreW - 46, 3);
    }
    ctx.fillStyle = "#c8ff00";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillText("5G CORE", coreX + coreW * 0.5, coreY + coreH - 8);

    // Center-bottom: Notched SIM / SEED chip
    drawNotchedSimChip(
      ctx,
      simX,
      simY,
      simW,
      simH,
      phase === "diagnose" || phase === "recover" ? "#c8ff00" : "#eae8e1",
      phase === "diagnose" || phase === "recover" ? "#c8ff00" : "#d9c24c",
      "SIM / SEED",
    );

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("SEED // SIGCOMM ’22 — SIM-BASED 5G FAILURE RECOVERY", pad, 20);
  }

  // 02. SecureSIM — eSIM Die + Cert/Policy Gate + Scoped Partition Isolation
  function drawSecureSimArt(ctx, w, h, t) {
    const compact = w < 450;
    const pad = compact ? 10 : 20;
    const isAllow = secureState.mode === "allow";
    const prog = Math.min(1, secureState.progress);

    const appW = compact ? 86 : 124;
    const appH = 44;
    const appX = pad;
    const validY = 74;
    const unauthY = h - 108;

    const gateX = compact ? w * 0.43 : w * 0.45;
    const gateY = h * 0.52;
    const gateR = compact ? 30 : 38;

    const simW = compact ? 112 : 166;
    const simH = compact ? 174 : 194;
    const simX = w - pad - simW;
    const simY = (h - simH) * 0.5 + 8;

    // Source 1: Valid App
    ctx.fillStyle = isAllow ? "rgba(200,255,0,0.14)" : "#121215";
    ctx.strokeStyle = isAllow ? "#c8ff00" : "#4a4a52";
    ctx.lineWidth = 2;
    ctx.fillRect(appX, validY, appW, appH);
    ctx.strokeRect(appX, validY, appW, appH);
    ctx.fillStyle = "#c8ff00";
    ctx.font = `700 ${compact ? 8.5 : 10}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText("VALID APP", appX + 7, validY + 18);
    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 8px 'JetBrains Mono', monospace";
    ctx.fillText("CERT + PERM", appX + 7, validY + 34);

    // Source 2: Unauth App
    ctx.fillStyle = !isAllow ? "rgba(255,72,0,0.16)" : "#121215";
    ctx.strokeStyle = !isAllow ? "#ff4800" : "#4a4a52";
    ctx.lineWidth = 2;
    ctx.fillRect(appX, unauthY, appW, appH);
    ctx.strokeRect(appX, unauthY, appW, appH);
    ctx.fillStyle = "#ff4800";
    ctx.font = `700 ${compact ? 8.5 : 10}px 'JetBrains Mono', monospace`;
    ctx.fillText("UNAUTH APP", appX + 7, unauthY + 18);
    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 8px 'JetBrains Mono', monospace";
    ctx.fillText("OVER-PRIV", appX + 7, unauthY + 34);

    // Request rails into Policy Gate
    ctx.strokeStyle = isAllow ? "#c8ff00" : "rgba(234,232,225,0.22)";
    ctx.lineWidth = isAllow ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(appX + appW, validY + appH * 0.5);
    ctx.lineTo(gateX - gateR - 10, validY + appH * 0.5);
    ctx.lineTo(gateX - gateR - 10, gateY - 8);
    ctx.lineTo(gateX - gateR, gateY - 8);
    ctx.stroke();

    ctx.strokeStyle = !isAllow ? "#ff4800" : "rgba(234,232,225,0.22)";
    ctx.lineWidth = !isAllow ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(appX + appW, unauthY + appH * 0.5);
    ctx.lineTo(gateX - gateR - 10, unauthY + appH * 0.5);
    ctx.lineTo(gateX - gateR - 10, gateY + 8);
    ctx.lineTo(gateX - gateR, gateY + 8);
    ctx.stroke();

    // Policy barrier vertical shield
    ctx.strokeStyle = isAllow ? "#c8ff00" : "#ff4800";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gateX, 46);
    ctx.lineTo(gateX, gateY - gateR - 4);
    ctx.moveTo(gateX, gateY + gateR + 4);
    ctx.lineTo(gateX, h - 34);
    ctx.stroke();

    // Rotating cryptographic CERT / POLICY GATE ring
    ctx.save();
    ctx.translate(gateX, gateY);
    ctx.rotate(isAllow && prog > 0.45 ? 0 : t * 1.4);
    ctx.strokeStyle = isAllow ? "#c8ff00" : "#ff4800";
    ctx.lineWidth = 3;
    for (let s = 0; s < 4; s++) {
      const a0 = (s * Math.PI) / 2 + 0.18;
      const a1 = ((s + 1) * Math.PI) / 2 - 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, gateR, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#0b0b0c";
    ctx.beginPath();
    ctx.arc(gateX, gateY, gateR - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isAllow ? "#c8ff00" : "#ff4800";
    ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText("POLICY", gateX, gateY - 2);
    ctx.fillText("GATE", gateX, gateY + 10);

    // Oversized notched eSIM Die on right with 3 isolated partitions
    const cut = 20;
    ctx.beginPath();
    ctx.moveTo(simX, simY);
    ctx.lineTo(simX + simW - cut, simY);
    ctx.lineTo(simX + simW, simY + cut);
    ctx.lineTo(simX + simW, simY + simH);
    ctx.lineTo(simX, simY + simH);
    ctx.closePath();
    ctx.fillStyle = "#121215";
    ctx.fill();
    ctx.strokeStyle = "#eae8e1";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Mini contact pad icon at top-left of eSIM die
    ctx.fillStyle = "#d9c24c";
    ctx.fillRect(simX + 10, simY + 10, 22, 16);
    ctx.strokeStyle = "#0b0b0c";
    ctx.lineWidth = 1;
    ctx.strokeRect(simX + 10, simY + 10, 22, 16);
    ctx.fillStyle = "#eae8e1";
    ctx.font = `700 ${compact ? 9 : 11}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText("eSIM DIE", simX + 38, simY + 23);

    const parts = [
      { name: "PART-A: AUTH", unlocked: isAllow && prog > 0.55 },
      { name: "PART-B: CARRIER", unlocked: false },
      { name: "PART-C: PAYMENT", unlocked: false },
    ];
    parts.forEach((pt, idx) => {
      const py = simY + 40 + idx * 48;
      const ph = 38;
      ctx.fillStyle = pt.unlocked ? "rgba(200,255,0,0.22)" : "#0b0b0c";
      ctx.strokeStyle = pt.unlocked ? "#c8ff00" : "#3d3d45";
      ctx.lineWidth = pt.unlocked ? 2 : 1.4;
      ctx.fillRect(simX + 10, py, simW - 20, ph);
      ctx.strokeRect(simX + 10, py, simW - 20, ph);

      ctx.fillStyle = pt.unlocked ? "#c8ff00" : "#b8b5aa";
      ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "left";
      ctx.fillText(compact ? pt.name.replace("PART-", "P-") : pt.name, simX + 16, py + 16);
      ctx.fillStyle = pt.unlocked ? "#eae8e1" : "#6c6c74";
      ctx.font = "700 8px 'JetBrains Mono', monospace";
      ctx.fillText(pt.unlocked ? "SCOPED UNLOCK" : "ISOLATED", simX + 16, py + 30);
    });

    // Animated request packet + ALLOWED / DENIED stamp
    const partAY = simY + 59;
    if (isAllow) {
      // Connect gate to PART-A only
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(gateX + gateR, gateY);
      ctx.lineTo(simX - 10, gateY);
      ctx.lineTo(simX - 10, partAY);
      ctx.lineTo(simX + 10, partAY);
      ctx.stroke();

      const px = appX + appW + prog * (simX - (appX + appW));
      const py = px < gateX ? validY + appH * 0.5 : partAY;
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(px - 7, py - 5, 14, 10);

      if (prog > 0.45) {
        ctx.fillStyle = "#c8ff00";
        ctx.fillRect(gateX - 42, 42, 84, 22);
        ctx.fillStyle = "#0b0b0c";
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("ALLOWED ✓", gateX, 57);
      }
    } else {
      // Packet slams into gate and bounces back
      const hit = Math.min(1, prog * 2);
      const bounce = prog > 0.5 ? (prog - 0.5) * 2 : 0;
      const startX = appX + appW;
      const stopX = gateX - gateR - 6;
      const px = bounce > 0 ? stopX - bounce * 42 : startX + hit * (stopX - startX);
      const py = unauthY + appH * 0.5 - bounce * 34;
      ctx.fillStyle = "#ff4800";
      ctx.fillRect(px - 7, py - 5, 14, 10);

      if (prog > 0.4) {
        ctx.fillStyle = "#ff4800";
        ctx.fillRect(gateX - 42, 42, 84, 22);
        ctx.fillStyle = "#0b0b0c";
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("DENIED ✕", gateX, 57);
      }
    }

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("SECURESIM // MOBICOM ’21 — FINE-GRAINED eSIM ACCESS", pad, 20);
  }

  // 03. GPT-Code-Learner — Readable AST / Call-Graph + Numbered LLM Retrieval Path
  function drawGptTreeArt(ctx, w, h, t) {
    const compact = w < 460;
    const pad = compact ? 10 : 18;
    const query = GPT_QUERIES[gptState.queryIdx];
    const activePath = query.path;

    const nodes = {
      indexer: { x: 0.17, y: 0.27, title: "ctx/indexer.py", fn: "scan_ast()" },
      main: { x: 0.17, y: 0.62, title: "entry/main.py", fn: "boot_app()" },
      auth: { x: 0.5, y: 0.27, title: "sec/auth.py", fn: "verify_cert()" },
      router: { x: 0.5, y: 0.62, title: "net/router.py", fn: "select_path()" },
      sim: { x: 0.83, y: 0.22, title: "sim/sim_core.py", fn: "open_ch()" },
      fabric: { x: 0.83, y: 0.5, title: "sys/fabric.py", fn: "dispatch()" },
      gpt: { x: 0.83, y: 0.77, title: "gpt/explainer.py", fn: "summarize()" },
    };

    const edges = [
      ["indexer", "main"],
      ["main", "auth"],
      ["main", "router"],
      ["main", "gpt"],
      ["auth", "sim"],
      ["router", "fabric"],
      ["router", "gpt"],
    ];

    const boxW = compact ? 92 : 132;
    const boxH = compact ? 38 : 44;

    // Draw orthogonal AST call-graph edges
    edges.forEach(([aKey, bKey]) => {
      const a = nodes[aKey];
      const b = nodes[bKey];
      const ax = a.x * w;
      const ay = a.y * h;
      const bx = b.x * w;
      const by = b.y * h;

      const ia = activePath.indexOf(aKey);
      const ib = activePath.indexOf(bKey);
      const isHot = ia >= 0 && ib === ia + 1;

      ctx.strokeStyle = isHot ? "#c8ff00" : "rgba(234,232,225,0.2)";
      ctx.lineWidth = isHot ? 3 : 1.3;
      ctx.beginPath();
      const midX = (ax + bx) * 0.5;
      ctx.moveTo(ax, ay);
      ctx.lineTo(midX, ay);
      ctx.lineTo(midX, by);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Travelling LLM spotlight packet on active call edge
      if (isHot) {
        const segP = (t * 0.9 + gptState.sweep) % 1;
        const px = ax + (bx - ax) * segP;
        const py = segP < 0.5 ? ay : by;
        ctx.fillStyle = "#ff4800";
        ctx.fillRect(px - 6, py - 6, 12, 12);
      }
    });

    // Draw readable module/function AST blocks
    Object.entries(nodes).forEach(([key, n]) => {
      const cx = n.x * w;
      const cy = n.y * h;
      const stepIdx = activePath.indexOf(key);
      const isHot = stepIdx >= 0;

      ctx.fillStyle = isHot ? "#151a07" : "#111114";
      ctx.strokeStyle = isHot ? "#c8ff00" : "#52525b";
      ctx.lineWidth = isHot ? 2.4 : 1.5;
      ctx.fillRect(cx - boxW * 0.5, cy - boxH * 0.5, boxW, boxH);
      ctx.strokeRect(cx - boxW * 0.5, cy - boxH * 0.5, boxW, boxH);

      ctx.fillStyle = isHot ? "#c8ff00" : "#eae8e1";
      ctx.font = `700 ${compact ? 8 : 10}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "left";
      const label = compact ? n.title.split("/")[1] : n.title;
      ctx.fillText(label, cx - boxW * 0.5 + 7, cy - 3);
      ctx.fillStyle = isHot ? "#eae8e1" : "#9c9a90";
      ctx.font = `700 ${compact ? 7.5 : 9}px 'JetBrains Mono', monospace`;
      ctx.fillText(n.fn, cx - boxW * 0.5 + 7, cy + 12);

      // Bold numbered call-chain badge (01 / 02 / 03)
      if (isHot) {
        ctx.fillStyle = stepIdx === 2 ? "#ff4800" : "#c8ff00";
        ctx.fillRect(cx - boxW * 0.5 - 2, cy - boxH * 0.5 - 16, 26, 16);
        ctx.fillStyle = "#0b0b0c";
        ctx.font = "700 9.5px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`0${stepIdx + 1}`, cx - boxW * 0.5 + 11, cy - boxH * 0.5 - 4);
      }
    });

    // Bottom inline call-chain callout bar
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 1.6;
    ctx.fillRect(pad, h - 34, w - pad * 2, 24);
    ctx.strokeRect(pad, h - 34, w - pad * 2, 24);
    ctx.fillStyle = "#c8ff00";
    ctx.font = `700 ${compact ? 8 : 10}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    const callText = compact
      ? `01→02→03 // ${query.label.toUpperCase()}`
      : query.callout;
    ctx.fillText(callText, pad + 8, h - 18);

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillText(`GPT-CODE-LEARNER // QUERY: ${query.label.toUpperCase()}`, pad, 18);
  }

  // 04. Sonica — NB-IoT Narrowband Waterfall Spectrogram + Subcarrier Matrix + Live Decoder
  function drawSonicaArt(ctx, w, h, t) {
    const compact = w < 460;
    const pad = compact ? 10 : 16;
    const sensorW = compact ? 66 : 96;
    const specX = pad + sensorW + 12;
    const specW = w - specX - pad;
    const specY = 44;
    const specH = Math.round(h * 0.5);
    const activeCol = sonicaState.channel - 1; // 0..8

    // Left: COTS NB-IoT Sensor burst emitter
    const sy = specY + 12;
    const sh = specH - 12;
    ctx.fillStyle = "#121215";
    ctx.strokeStyle = sonicaState.burst > 0.2 ? "#ff4800" : "#eae8e1";
    ctx.lineWidth = 2;
    ctx.fillRect(pad, sy, sensorW, sh);
    ctx.strokeRect(pad, sy, sensorW, sh);

    // Sensor antenna + RF wave arcs
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad + sensorW * 0.5, sy);
    ctx.lineTo(pad + sensorW * 0.5, sy - 12);
    ctx.stroke();
    for (let a = 1; a <= 3; a++) {
      const r = 6 + a * 6 + ((t * 18) % 8);
      ctx.strokeStyle = `rgba(200,255,0,${Math.max(0.15, 0.8 - a * 0.22)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pad + sensorW * 0.5, sy - 12, r, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
    }

    ctx.fillStyle = "#c8ff00";
    ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText("NB-IOT", pad + sensorW * 0.5, sy + 28);
    ctx.fillStyle = "#eae8e1";
    ctx.fillText("SENSOR", pad + sensorW * 0.5, sy + 42);
    ctx.fillStyle = sonicaState.burst > 0.15 ? "#ff4800" : "#b8b5aa";
    ctx.font = "700 8px 'JetBrains Mono', monospace";
    ctx.fillText(sonicaState.burst > 0.15 ? "TX BURST" : "IDLE", pad + sensorW * 0.5, sy + 64);

    // Top-right: Waterfall Spectrogram band labels
    const colW = specW / SONICA_COLS;
    ctx.fillStyle = "#b8b5aa";
    ctx.font = `700 ${compact ? 7.5 : 8.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText("SYNC", specX + 2, specY - 6);
    ctx.fillText("CTRL", specX + colW * 1.15, specY - 6);
    ctx.fillText("UPLINK SUBCARRIERS (CH-03..09)", specX + colW * 2.15, specY - 6);

    // Waterfall Spectrogram grid
    const rowH = specH / SONICA_ROWS;
    for (let r = 0; r < SONICA_ROWS; r++) {
      const rowData = sonicaState.waterfall[r];
      for (let c = 0; c < SONICA_COLS; c++) {
        const val = rowData[c];
        const x = specX + c * colW;
        const y = specY + r * rowH;
        if (val > 0.72) {
          ctx.fillStyle = c === activeCol ? "#c8ff00" : "#ff4800";
        } else if (val > 0.4) {
          ctx.fillStyle = "rgba(200, 255, 0, 0.45)";
        } else {
          ctx.fillStyle = `rgba(234, 232, 225, ${(0.04 + val * 0.25).toFixed(2)})`;
        }
        ctx.fillRect(x + 1, y + 1, colW - 2, Math.max(1, rowH - 1));
      }
    }

    // Highlight tuned channel column bracket
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(specX + activeCol * colW, specY, colW, specH);

    // Bottom: Decoded Narrowband Packet Frame Matrix
    const decY = specY + specH + 18;
    const decH = h - decY - 14;
    ctx.fillStyle = "#111114";
    ctx.strokeStyle = "#3a3a42";
    ctx.lineWidth = 1.5;
    ctx.fillRect(pad, decY, w - pad * 2, decH);
    ctx.strokeRect(pad, decY, w - pad * 2, decH);

    const fields = [
      { name: "PREAMBLE", color: "#eae8e1", ratio: 0.2 },
      { name: `CTRL CH-0${sonicaState.channel}`, color: "#ff4800", ratio: 0.24 },
      { name: `IOT PAYLOAD #${String(sonicaState.seq).padStart(2, "0")}`, color: "#c8ff00", ratio: 0.36 },
      { name: "CRC OK", color: "#c8ff00", ratio: 0.2 },
    ];
    let fx = pad + 8;
    const innerW = w - pad * 2 - 16;
    const fH = Math.min(34, decH - 28);
    const fy = decY + decH - fH - 8;
    fields.forEach((f) => {
      const fw = innerW * f.ratio - 4;
      ctx.fillStyle = f.color === "#c8ff00" ? "rgba(200,255,0,0.16)" : "#19191d";
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(fx, fy, fw, fH);
      ctx.strokeRect(fx, fy, fw, fH);
      ctx.fillStyle = f.color;
      ctx.font = `700 ${compact ? 7.5 : 9.5}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.name, fx + fw * 0.5, fy + fH * 0.62);
      fx += fw + 5;
    });

    ctx.fillStyle = "#c8ff00";
    ctx.font = "700 9.5px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`DECODED NB-IOT FRAME // 180KHZ LOCKED ON CH-0${sonicaState.channel}`, pad + 8, decY + 16);

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillText("SONICA // NB-IOT WATERFALL & SUBCARRIER DECODER", pad, 18);
  }

  // 05. Flora — 4-Tier Programmable Cellular Stack Monolith (eSIM / RAN / 5G CORE / EDGE VR)
  function drawFloraArt(ctx, w, h, t) {
    const compact = w < 480;
    const pad = compact ? 10 : 20;
    const tiers = [
      { idx: 3, tag: "04 // EDGE VR", y: 46 },
      { idx: 2, tag: "03 // 5G CORE", y: 0 },
      { idx: 1, tag: "02 // RAN", y: 0 },
      { idx: 0, tag: "01 // eSIM", y: 0 },
    ];
    const topY = 46;
    const botY = h - 18;
    const gap = 11;
    const tierH = (botY - topY - gap * 3) / 4;

    tiers.forEach((tr, pos) => {
      tr.y = topY + pos * (tierH + gap);
    });

    // Bidirectional packet lanes (UL climbs left-center, DL descends right-center; hooks shift route!)
    const ulBaseX = compact ? w * 0.72 : w * 0.68;
    const dlBaseX = compact ? w * 0.88 : w * 0.84;

    // Vertical uplink & downlink conduits
    ctx.strokeStyle = "rgba(200,255,0,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ulBaseX, botY - 8);
    ctx.lineTo(ulBaseX, topY + 8);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,72,0,0.45)";
    ctx.beginPath();
    ctx.moveTo(dlBaseX, topY + 8);
    ctx.lineTo(dlBaseX, botY - 8);
    ctx.stroke();

    // Draw 4 bold monolith tiers
    tiers.forEach((tr) => {
      const isAlt = floraState.toggled[tr.idx];
      const rule = FLORA_RULES[tr.idx];
      const flashing = floraState.flashLayer === tr.idx && floraState.flashTimer > 0.05;

      ctx.fillStyle = flashing
        ? "rgba(255,72,0,0.22)"
        : isAlt
          ? "rgba(255,72,0,0.12)"
          : "#121215";
      ctx.strokeStyle = isAlt ? "#ff4800" : "#c8ff00";
      ctx.lineWidth = 2;
      ctx.fillRect(pad, tr.y, w - pad * 2, tierH);
      ctx.strokeRect(pad, tr.y, w - pad * 2, tierH);

      // Left tier title
      ctx.fillStyle = isAlt ? "#ff4800" : "#c8ff00";
      ctx.font = `700 ${compact ? 10 : 12}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "left";
      ctx.fillText(tr.tag, pad + 10, tr.y + tierH * 0.44);

      // Active programmable rule readout
      ctx.fillStyle = "#eae8e1";
      ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
      ctx.fillText(
        isAlt ? `HOOK: ${rule.descOn}` : `HOOK: ${rule.descOff}`,
        pad + 10,
        tr.y + tierH * 0.78,
      );

      // Visual routing detour node inside tier when toggled
      if (isAlt) {
        ctx.strokeStyle = "#ff4800";
        ctx.lineWidth = 2;
        ctx.strokeRect(ulBaseX - 18, tr.y + 8, 36, tierH - 16);
      }
    });

    // Live bidirectional packet blocks climbing UL and descending DL (detouring around active hooks!)
    for (let i = 0; i < 4; i++) {
      const pUp = (t * 0.42 + i * 0.25) % 1;
      const uy = botY - 10 - pUp * (botY - topY - 20);
      const tierAtUp = Math.min(3, Math.floor(pUp * 4));
      const uxOffset = floraState.toggled[tierAtUp] ? -14 : 0;
      ctx.fillStyle = floraState.toggled[tierAtUp] ? "#ff4800" : "#c8ff00";
      ctx.fillRect(ulBaseX + uxOffset - 6, uy - 5, 12, 10);

      const pDn = (t * 0.42 + i * 0.25 + 0.12) % 1;
      const dy = topY + 10 + pDn * (botY - topY - 20);
      const tierAtDn = 3 - Math.min(3, Math.floor(pDn * 4));
      const dxOffset = floraState.toggled[tierAtDn] ? 10 : 0;
      ctx.fillStyle = "#eae8e1";
      ctx.fillRect(dlBaseX + dxOffset - 5, dy - 4, 10, 8);
    }

    // Highway headers (placed cleanly on row y=34 below title line)
    ctx.fillStyle = "#c8ff00";
    ctx.font = "700 8.5px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("UL ↑", ulBaseX, 34);
    ctx.fillStyle = "#ff4800";
    ctx.fillText("DL ↓", dlBaseX, 34);

    ctx.fillStyle = "#eae8e1";
    ctx.font = `700 ${compact ? 9.5 : 10}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(
      compact
        ? "FLORA // 4-TIER CELLULAR STACK"
        : "FLORA // PROGRAMMABLE FULL-STACK CELLULAR TESTBED",
      pad,
      18,
    );
  }

  // 06. Mobile VR Latency — 6DoF Headset Wireframe + Wireless Scheduler Pipeline
  function drawVrLatencyArt(ctx, w, h, t) {
    const compact = w < 480;
    const pad = compact ? 10 : 18;
    const isPro = vrState.proactive;

    // Layout: Left = 6DoF VR headset orientation viewport, Right = POSE -> UL -> EDGE GPU -> DL -> DISPLAY
    const leftW = compact ? w - pad * 2 : Math.round((w - pad * 3) * 0.37);
    const leftH = compact ? Math.round((h - 68) * 0.46) : h - 68;
    const leftX = pad;
    const leftY = 38;

    const rightX = compact ? pad : leftX + leftW + pad;
    const rightY = compact ? leftY + leftH + 10 : 38;
    const rightW = compact ? w - pad * 2 : w - rightX - pad;
    const rightH = compact ? h - rightY - 18 : h - 68;

    // --- Left: 6DoF VR Headset Wireframe Viewport ---
    ctx.fillStyle = "#101013";
    ctx.strokeStyle = "#35353d";
    ctx.lineWidth = 1.6;
    ctx.fillRect(leftX, leftY, leftW, leftH);
    ctx.strokeRect(leftX, leftY, leftW, leftH);

    const vcx = leftX + leftW * 0.5;
    const vcy = leftY + leftH * 0.54;
    const scale = Math.min(leftW, leftH) * 0.29;

    function drawVisorFrame(yaw, pitch, color, dashed) {
      const pts3 = [
        [-1.15, -0.58, -0.5],
        [1.15, -0.58, -0.5],
        [1.15, 0.58, -0.5],
        [-1.15, 0.58, -0.5],
        [-1.15, -0.58, 0.5],
        [1.15, -0.58, 0.5],
        [1.15, 0.58, 0.5],
        [-1.15, 0.58, 0.5],
      ];
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      const proj = pts3.map(([x, y, z]) => {
        const x1 = x * cy - z * sy;
        const z1 = x * sy + z * cy;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const persp = 3.2 / (3.2 + z2);
        return [vcx + x1 * scale * persp, vcy + y2 * scale * persp];
      });

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.4 : 2.3;
      if (dashed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      edges.forEach(([a, b]) => {
        ctx.moveTo(proj[a][0], proj[a][1]);
        ctx.lineTo(proj[b][0], proj[b][1]);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Target head pose (dashed white) vs Rendered Display Frame (Chartreuse lock or lagging Orange ghost)
    drawVisorFrame(vrState.targetYaw, vrState.targetPitch, "rgba(234,232,225,0.7)", true);
    drawVisorFrame(
      vrState.displayYaw,
      vrState.displayPitch,
      isPro ? "#c8ff00" : "#ff4800",
      false,
    );

    ctx.fillStyle = isPro ? "#c8ff00" : "#ff4800";
    ctx.font = "700 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      isPro ? "6DOF POSE // LOCKED" : "6DOF POSE // GHOST LAG",
      leftX + 8,
      leftY + 16,
    );

    // --- Right: Wireless Round-Trip Pipeline (POSE -> UL -> EDGE GPU -> DL -> DISP) ---
    ctx.fillStyle = "#101013";
    ctx.strokeStyle = "#35353d";
    ctx.lineWidth = 1.6;
    ctx.fillRect(rightX, rightY, rightW, rightH);
    ctx.strokeRect(rightX, rightY, rightW, rightH);

    const stages = ["POSE", "UL", "EDGE", "DL", "DISP"];
    const rPad = 10;
    const stGap = 8;
    const stW = (rightW - rPad * 2 - stGap * (stages.length - 1)) / stages.length;
    const stH = compact ? 34 : 44;
    const stY = rightY + (compact ? 26 : 44);
    const midY = stY + stH * 0.5;

    // Connecting pipeline rail
    ctx.strokeStyle = isPro ? "#c8ff00" : "#ff4800";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightX + rPad + stW * 0.5, midY);
    ctx.lineTo(rightX + rightW - rPad - stW * 0.5, midY);
    ctx.stroke();

    // Animated packets along pipeline (queued at UL in Standard mode, streaming unqueued in Proactive!)
    const pipeSpan = rightW - rPad * 2 - stW;
    const ulBlockX = rightX + rPad + stW + stGap;
    for (let i = 0; i < 5; i++) {
      let prog = (t * (isPro ? 0.65 : 0.34) + i * 0.2) % 1;
      let px = rightX + rPad + stW * 0.5 + prog * pipeSpan;
      let py = midY;
      if (!isPro && prog > 0.14 && prog < 0.36) {
        // Visibly queue packets at UL scheduler waiting for grant
        px = ulBlockX - 6 - (i % 3) * 7;
        py = midY - 12 + (i % 3) * 10;
      }
      ctx.fillStyle = isPro ? "#c8ff00" : "#ff4800";
      ctx.fillRect(px - 5, py - 4, 10, 8);
    }

    stages.forEach((lbl, i) => {
      const sx = rightX + rPad + i * (stW + stGap);
      const isUl = i === 1;
      ctx.fillStyle = isUl ? (isPro ? "rgba(200,255,0,0.18)" : "rgba(255,72,0,0.22)") : "#0b0b0c";
      ctx.strokeStyle = isUl ? (isPro ? "#c8ff00" : "#ff4800") : "#eae8e1";
      ctx.lineWidth = isUl ? 2 : 1.4;
      ctx.fillRect(sx, stY, stW, stH);
      ctx.strokeRect(sx, stY, stW, stH);
      ctx.fillStyle = isUl ? (isPro ? "#c8ff00" : "#ff4800") : "#eae8e1";
      ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(lbl, sx + stW * 0.5, stY + stH * 0.6);
    });

    // Uplink Grant Slot Strip at bottom of right panel
    const slotY = rightY + rightH - (compact ? 28 : 48);
    const slotCount = 12;
    const slotW = (rightW - rPad * 2) / slotCount;
    for (let i = 0; i < slotCount; i++) {
      const granted = isPro ? i % 2 === 0 : i % 5 === 0;
      ctx.fillStyle = granted ? (isPro ? "#c8ff00" : "#ff4800") : "#232328";
      ctx.fillRect(rightX + rPad + i * slotW + 2, slotY, slotW - 5, compact ? 10 : 14);
    }

    ctx.fillStyle = isPro ? "#c8ff00" : "#ff4800";
    ctx.font = `700 ${compact ? 8 : 9.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(
      isPro
        ? "PRE-ALLOCATED UPLINK GRANTS // ZERO QUEUE STALL"
        : "REACTIVE UL SCHEDULER // QUEUED + DRX WAKE LAG",
      rightX + rPad,
      slotY - 8,
    );

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillText(
      `MOBILE VR LATENCY // ${isPro ? "PROACTIVE" : "STANDARD"} (CONCEPTUAL — NOT A BENCHMARK)`,
      pad,
      18,
    );
  }

  // 07. Acemap — Immediate Full 2,208-Topic Map + On-Canvas Discipline Cluster Labels + Neighbor Links
  function drawAcemapArt(ctx, w, h, t) {
    if (!acemapState.loaded) {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const rx = Math.min(w * 0.38, 190);
      const ry = Math.min(h * 0.34, 115);

      ctx.strokeStyle = "rgba(200, 255, 0, 0.28)";
      ctx.lineWidth = 1.5;
      [-0.4, 0.45, 1.05].forEach((rot) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot + t * 0.08);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      const clusterLabels = ["COMP SCI", "PHYSICS", "MEDICINE", "ENGINEERING", "MATH"];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2 + t * 0.12;
        const rad = 0.25 + ((i * 37) % 100) / 130;
        const x = cx + Math.cos(a) * rx * rad;
        const y = cy + Math.sin(a * 1.4) * ry * rad;
        ctx.fillStyle = i % 7 === 0 ? "#ff4800" : "#c8ff00";
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
        if (i % 8 === 0) {
          const lbl = clusterLabels[(i / 8) % clusterLabels.length];
          ctx.fillStyle = "rgba(234,232,225,0.65)";
          ctx.font = "700 8.5px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.fillText(lbl, x + 6, y + 3);
        }
      }

      ctx.fillStyle = "#c8ff00";
      ctx.font = "700 10.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("ACEMAP // CLICK 'LOAD 2,208 TOPICS DATASET' BELOW", 14, 20);
      return;
    }

    const { offsetX, offsetY, drawW, drawH } = getAcemapBounds(w, h);
    const compact = w < 460;

    ctx.strokeStyle = "rgba(234,232,225,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX - 8, offsetY - 8, drawW + 16, drawH + 16);

    // Draw all 2,208 topics immediately
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      const active = isAcemapPointActive(i);
      const sx = offsetX + pt.nx * drawW;
      const sy = offsetY + pt.ny * drawH;
      if (active) {
        ctx.fillStyle =
          acemapState.selectedField === "all"
            ? ACEMAP_BRUTAL_PALETTE[pt.field % ACEMAP_BRUTAL_PALETTE.length]
            : "#c8ff00";
        const sz = pt.size > 7 ? 3.4 : 2.2;
        ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
      } else {
        ctx.fillStyle = "rgba(234, 232, 225, 0.08)";
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }

    // Bold collision-free on-canvas discipline cluster labels
    const placed = [];
    const maxLabels = acemapState.selectedField === "all" ? (compact ? 7 : 12) : 1;
    ctx.font = `700 ${compact ? 8 : 9}px 'JetBrains Mono', monospace`;
    for (let c = 0; c < acemapState.centroids.length && placed.length < maxLabels; c++) {
      const cent = acemapState.centroids[c];
      if (
        acemapState.selectedField !== "all" &&
        cent.field !== Number(acemapState.selectedField)
      ) {
        continue;
      }
      const lx = offsetX + cent.nx * drawW;
      const ly = offsetY + cent.ny * drawH;
      const text = ACEMAP_SHORT[cent.field];
      const tw = ctx.measureText(text).width + 10;
      const th = 14;
      const rx = Math.max(8, Math.min(w - tw - 8, lx - tw * 0.5));
      const ry = Math.max(24, Math.min(h - th - 10, ly - th * 0.5));

      const collides = placed.some(
        (b) => !(rx + tw + 4 < b.x || rx > b.x + b.w + 4 || ry + th + 4 < b.y || ry > b.y + b.h + 4),
      );
      if (collides) continue;
      placed.push({ x: rx, y: ry, w: tw, h: th });

      ctx.fillStyle = "rgba(11, 11, 12, 0.86)";
      ctx.strokeStyle = "rgba(200, 255, 0, 0.72)";
      ctx.lineWidth = 1;
      ctx.fillRect(rx, ry, tw, th);
      ctx.strokeRect(rx, ry, tw, th);
      ctx.fillStyle = "#eae8e1";
      ctx.textAlign = "left";
      ctx.fillText(text, rx + 5, ry + 10);
    }

    // Scholarly neighbor links + targeting reticle on hovered or selected topic
    const focusIdx =
      acemapState.hoveredIndex >= 0
        ? acemapState.hoveredIndex
        : acemapState.selectedIndex;
    if (focusIdx >= 0 && acemapState.points[focusIdx]) {
      const pt = acemapState.points[focusIdx];
      const sx = offsetX + pt.nx * drawW;
      const sy = offsetY + pt.ny * drawH;

      const neighbors = getNearestNeighbors(focusIdx, 5);
      neighbors.forEach((nIdx, ni) => {
        const nb = acemapState.points[nIdx];
        const nx = offsetX + nb.nx * drawW;
        const ny = offsetY + nb.ny * drawH;
        ctx.strokeStyle = ni < 2 ? "#ff4800" : "rgba(200, 255, 0, 0.8)";
        ctx.lineWidth = ni < 2 ? 1.6 : 1.1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        ctx.fillStyle = "#c8ff00";
        ctx.fillRect(nx - 3, ny - 3, 6, 6);
        if (ni < 2 && !compact) {
          ctx.fillStyle = "#eae8e1";
          ctx.font = "700 8.5px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.fillText(nb.name.slice(0, 22), Math.min(w - 110, nx + 6), ny + 3);
        }
      });

      // Targeting reticle
      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - 15, sy);
      ctx.lineTo(sx + 15, sy);
      ctx.moveTo(sx, sy - 15);
      ctx.lineTo(sx, sy + 15);
      ctx.stroke();
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 6, sy - 6, 12, 12);

      // Focus tooltip pill
      const label = `${pt.name} [${ACEMAP_FIELDS[pt.field]}]`;
      ctx.font = "700 10.5px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(label).width + 14;
      const lx = Math.min(w - tw - 8, Math.max(8, sx + 12));
      const ly = sy < 44 ? sy + 20 : sy - 22;
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(lx, ly - 13, tw, 18);
      ctx.fillStyle = "#0b0b0c";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 7, ly);
    }

    ctx.fillStyle = "#c8ff00";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `ACEMAP // ${acemapState.points.length.toLocaleString()} TOPICS · 19 DISCIPLINES`,
      14,
      16,
    );
  }

  function drawProjectCanvas() {
    const info = resizeCanvasToDisplay(projectCanvas);
    if (!info) return;
    const { ctx, w, h } = info;
    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, w, h);

    switch (activeProject) {
      case "seed":
        drawSeedArt(ctx, w, h, stageTime);
        break;
      case "secureSIM":
        drawSecureSimArt(ctx, w, h, stageTime);
        break;
      case "gptcodelearner":
        drawGptTreeArt(ctx, w, h, stageTime);
        break;
      case "sonica":
        drawSonicaArt(ctx, w, h, stageTime);
        break;
      case "flora":
        drawFloraArt(ctx, w, h, stageTime);
        break;
      case "lrp":
        drawVrLatencyArt(ctx, w, h, stageTime);
        break;
      case "acemap":
        drawAcemapArt(ctx, w, h, stageTime);
        break;
      default:
        drawSeedArt(ctx, w, h, stageTime);
    }
  }

  function tickStage(now) {
    stageRaf = 0;
    if (!motionEnabled || !stageVisible || document.hidden) {
      stagePrev = 0;
      return;
    }
    if (!stagePrev || now - stagePrev >= 30) {
      const dt = stagePrev ? Math.min(0.06, (now - stagePrev) / 1000) : 0.03;
      stagePrev = now;
      stageTime += dt;

      // Advance per-project domain simulations
      if (activeProject === "seed") {
        seedState.cycle = (seedState.cycle + dt) % 9.6;
      } else if (activeProject === "secureSIM") {
        secureState.progress += dt * 0.42;
        if (secureState.progress > 1.35) {
          secureState.progress = 0;
        }
      } else if (activeProject === "gptcodelearner") {
        gptState.sweep = (gptState.sweep + dt * 0.2) % 1;
      } else if (activeProject === "sonica") {
        sonicaState.burst = Math.max(0, sonicaState.burst - dt * 0.55);
        sonicaState.rowTimer += dt;
        if (sonicaState.rowTimer >= 0.14) {
          sonicaState.rowTimer = 0;
          const activeCol = sonicaState.channel - 1;
          const nextRow = Array.from({ length: SONICA_COLS }, (_, c) => {
            if (c === activeCol) return 0.78 + Math.random() * 0.22;
            if (c === 0) return Math.sin(stageTime * 4) > 0.2 ? 0.65 : 0.2;
            if (c === 1) return Math.cos(stageTime * 3) > 0.3 ? 0.55 : 0.15;
            return Math.random() * 0.22;
          });
          sonicaState.waterfall.pop();
          sonicaState.waterfall.unshift(nextRow);
        }
      } else if (activeProject === "flora") {
        floraState.flashTimer = Math.max(0, floraState.flashTimer - dt * 2.2);
      } else if (activeProject === "lrp") {
        vrState.impulse = Math.max(0, vrState.impulse - dt * 1.4);
        if (stagePtrInside && finePointerQuery.matches) {
          vrState.targetYaw = (stagePtrX - 0.5) * 1.5;
          vrState.targetPitch = (stagePtrY - 0.5) * 0.9;
        } else {
          vrState.targetYaw =
            Math.sin(stageTime * 1.65) * 0.78 + vrState.impulse * 0.55;
          vrState.targetPitch = Math.cos(stageTime * 1.1) * 0.32;
        }
        const followRate = vrState.proactive ? 0.45 : 0.055;
        vrState.displayYaw += (vrState.targetYaw - vrState.displayYaw) * followRate;
        vrState.displayPitch +=
          (vrState.targetPitch - vrState.displayPitch) * followRate;
      }

      drawProjectCanvas();
    }
    stageRaf = requestAnimationFrame(tickStage);
  }

  function syncStageLoop() {
    if (motionEnabled && stageVisible && !document.hidden) {
      if (!stageRaf) stageRaf = requestAnimationFrame(tickStage);
    } else {
      cancelAnimationFrame(stageRaf);
      stageRaf = 0;
      stagePrev = 0;
      drawProjectCanvas();
    }
  }

  /* ========================================================================
     7. PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
     ======================================================================== */
  const filterButtons = $$("[data-filter]");
  const pubGroups = $$(".pub-group");
  const pubCount = $("#publication-count");

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
      (sum, g) => sum + g.querySelectorAll(".pub-row").length,
      0,
    );
    const years = visibleGroups.flatMap((g) =>
      [...g.querySelectorAll(".pub-year")].map((el) => Number(el.textContent)),
    );
    if (pubCount && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCount.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubAnchor);

  /* ========================================================================
     8. OBSERVERS, RESIZE, VISIBILITY & REDUCED MOTION
     ======================================================================== */
  if ("IntersectionObserver" in window) {
    if (heroSection) {
      new IntersectionObserver(
        ([entry]) => {
          heroVisible = entry.isIntersecting;
          syncHeroLoop();
        },
        { threshold: 0.01 },
      ).observe(heroSection);
    }
    if (bmSection) {
      new IntersectionObserver(
        ([entry]) => {
          bmVisible = entry.isIntersecting;
          syncBmLoop();
        },
        { threshold: 0.01 },
      ).observe(bmSection);
    }
    if (projectStage) {
      new IntersectionObserver(
        ([entry]) => {
          stageVisible = entry.isIntersecting;
          syncStageLoop();
        },
        { threshold: 0.01 },
      ).observe(projectStage);
    }
  } else {
    heroVisible = true;
    bmVisible = true;
    stageVisible = true;
  }

  window.addEventListener(
    "resize",
    () => {
      drawHeroBus();
      drawBmCanvas();
      drawCmeCanvas();
      drawProjectCanvas();
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    syncHeroLoop();
    syncBmLoop();
    syncStageLoop();
  });

  function handleMotionChange() {
    motionEnabled = !reduceMotionQuery.matches;
    updateScrollEffects();
    syncHeroLoop();
    syncBmLoop();
    syncStageLoop();
  }

  if (reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener("change", handleMotionChange);
  }

  // Initial boot
  selectProject("seed", false);
  setBmLayer("host");
  syncPubAnchor();
  updateScrollEffects();
  runScrambleDecode();
  drawHeroBus();
  drawBmCanvas();
  drawCmeCanvas();
  drawProjectCanvas();
})();
