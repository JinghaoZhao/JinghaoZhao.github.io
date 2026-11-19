/* Version 7 — Neo-Brutalist Kinetic Monolith & Avant-Garde Poster */
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
     2. COUNTER-SLIDING HERO BANDS + SCROLL SPY + TELEMETRY
     ======================================================================== */
  const heroSection = $("#hero");
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
        const shift = Math.round(norm * 140);
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

  /* ========================================================================
     3. KINETIC CURSOR-REACTIVE BRUTALIST BADGE
     ======================================================================== */
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
        badgeTargetX = nx * 28;
        badgeTargetY = ny * 22;
        badgeTargetRot = -8 + nx * 16;
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
     4. INTERACTIVE CLICK-TO-SLAM BARE METAL MATRIX + TELEMETRY CANVAS
     ======================================================================== */
  const bmTabs = $$("[data-bm-layer]");
  const bmPanels = {
    host: $("#bm-panel-host"),
    lifecycle: $("#bm-panel-lifecycle"),
    fabric: $("#bm-panel-fabric"),
  };
  const bmCanvas = $("#bm-canvas");
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
      const bars = ["██████████░░", "█████████░░░", "███████████░", "██████████░░"];
      const lane = bars[tick % bars.length];
      return `LAYER::HOST      [DEDICATED SILICON // DIRECT I/O // ZERO HYPERVISOR]\nBUS  ::PCIE-FAB  [${lane}] BOUNDARY LOCKED // PHYSICAL ISOLATION`;
    },
    lifecycle: (tick) => {
      const states = ["PROVISIONING", "VERIFY-IMAGE", "CONTROL-SYNC", "FLEET-ACTIVE"];
      const cur = states[tick % states.length];
      const dots = ".".repeat((tick % 4) + 1).padEnd(4, " ");
      return `LAYER::LIFECYCLE [AUTOMATED FLEET ORCHESTRATION // SAFE TRANSITIONS]\nSTATE::${cur} [${dots}] CONTROL PLANE HANDSHAKE NOMINAL`;
    },
    fabric: (tick) => {
      const wave = ["▁▃▅▇▅▃▁▃▅▇▅▃", "▃▅▇▅▃▁▃▅▇▅▃▁", "▅▇▅▃▁▃▅▇▅▃▁▃", "▇▅▃▁▃▅▇▅▃▁▃▅"];
      return `LAYER::FABRIC    [PREDICTABLE LATENCY // FAULT ISOLATION // SCALE]\nPULSE::DETERM    [${wave[tick % wave.length]}] END-TO-END FLOW COHERENT`;
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
      bmAscii.textContent = BM_ASCII_FRAMES[layer](Math.floor(bmTime * 2));
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

  function drawBmCanvas() {
    const info = resizeCanvasToDisplay(bmCanvas);
    if (!info) return;
    const { ctx, w, h } = info;

    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, w, h);

    // Architectural grid
    ctx.strokeStyle = "rgba(234, 232, 225, 0.08)";
    ctx.lineWidth = 1;
    const step = 28;
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (bmLayer === "host") {
      // Physical silicon dies + high-speed PCIe / storage I/O lanes
      const cols = Math.max(6, Math.floor((w - 40) / 52));
      const rows = 3;
      const cellW = (w - 48) / cols;
      const cellH = (h - 56) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 24 + c * cellW;
          const y = 20 + r * cellH;
          const phase = Math.sin(bmTime * 2.8 + c * 0.65 + r * 1.4);
          const hot = phase > 0.62;
          ctx.strokeStyle = hot ? "#c8ff00" : "rgba(234,232,225,0.28)";
          ctx.lineWidth = hot ? 2 : 1;
          ctx.strokeRect(x + 4, y + 4, cellW - 10, cellH - 12);
          ctx.fillStyle = hot
            ? "rgba(200, 255, 0, 0.22)"
            : "rgba(234, 232, 225, 0.04)";
          ctx.fillRect(x + 4, y + 4, cellW - 10, cellH - 12);

          // Inner bus bar
          const fillRatio = 0.25 + 0.65 * (0.5 + 0.5 * phase);
          ctx.fillStyle = hot ? "#c8ff00" : "#ff4800";
          ctx.fillRect(
            x + 9,
            y + cellH - 16,
            (cellW - 20) * fillRatio,
            4,
          );
        }
      }
      // Sweeping I/O laser bus
      const scanX = ((bmTime * 110) % (w - 32)) + 16;
      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 12);
      ctx.lineTo(scanX, h - 12);
      ctx.stroke();
    } else if (bmLayer === "lifecycle") {
      // 4-stage fleet state machine orbital nodes + automated transition beams
      const stages = ["PROVISION", "VERIFY", "ISOLATE", "ACTIVE"];
      const pad = Math.min(64, w * 0.12);
      const span = w - pad * 2;
      const cy = h * 0.52;
      const activeIdx = Math.floor(bmTime * 1.1) % stages.length;

      // Connecting bus
      ctx.strokeStyle = "rgba(234, 232, 225, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, cy);
      ctx.lineTo(w - pad, cy);
      ctx.stroke();

      // Animated pulse packet
      const pulseX = pad + ((bmTime * 0.55) % 1) * span;
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(pulseX - 10, cy - 4, 20, 8);

      stages.forEach((label, i) => {
        const nx = pad + (span / (stages.length - 1)) * i;
        const isCurrent = i === activeIdx;
        const r = isCurrent ? 22 : 15;
        ctx.fillStyle = isCurrent ? "#c8ff00" : "#0b0b0c";
        ctx.strokeStyle = isCurrent ? "#ff4800" : "#eae8e1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(nx - r, cy - r, r * 2, r * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isCurrent ? "#0b0b0c" : "#c8ff00";
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`0${i + 1}`, nx, cy + 4);

        ctx.fillStyle = isCurrent ? "#c8ff00" : "#b8b5aa";
        ctx.font = "700 10px 'JetBrains Mono', monospace";
        ctx.fillText(label, nx, cy + 44);
      });
    } else {
      // FABRIC: Deterministic ultra-low-latency packet-train envelope
      const midY = h * 0.52;
      // Tight tolerance corridor
      ctx.fillStyle = "rgba(200, 255, 0, 0.08)";
      ctx.fillRect(0, midY - 26, w, 52);
      ctx.strokeStyle = "rgba(200, 255, 0, 0.45)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, midY - 26);
      ctx.lineTo(w, midY - 26);
      ctx.moveTo(0, midY + 26);
      ctx.lineTo(w, midY + 26);
      ctx.stroke();
      ctx.setLineDash([]);

      // Primary deterministic carrier wave
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const t = x * 0.032 - bmTime * 4.2;
        const pulse = Math.sin(t) * 18 + Math.sin(t * 3) * 5;
        const y = midY + pulse;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Discrete packet ticks along fabric rail
      const spacing = 46;
      const offset = (bmTime * 95) % spacing;
      for (let x = offset; x < w; x += spacing) {
        ctx.fillStyle = "#ff4800";
        ctx.fillRect(x, midY - 40, 8, 6);
        ctx.fillStyle = "#c8ff00";
        ctx.fillRect(x, midY + 34, 14, 5);
      }
    }

    // Slam flash border feedback
    if (bmSlamFlash > 0.02) {
      ctx.strokeStyle = `rgba(255, 72, 0, ${bmSlamFlash.toFixed(2)})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
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

      const asciiTick = Math.floor(bmTime * 2);
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
    }
  }

  /* ========================================================================
     5. PROJECTS KINETIC INDEX SLATS (01–07) + LIVE GENERATIVE CANVAS STAGE
     ======================================================================== */
  const PROJECTS = {
    seed: {
      num: "01",
      name: "SEED",
      kind: "5G WAVE LATTICE",
      desc: "Diagnosing and recovering from 5G failures through the SIM.",
      link: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      linkText: "Read the SIGCOMM ’22 paper",
      actionLabel: "Inject 5G Fault ⚡",
      hud: "CLICK CANVAS TO INJECT 5G FAILURE IMPULSE",
      status: "Harmonic lattice locked · Click canvas to disturb",
    },
    secureSIM: {
      num: "02",
      name: "SecureSIM",
      kind: "CRYPTOGRAPHIC MATRIX GATE",
      desc: "Authentication and fine-grained access control for SIM and eSIM.",
      link: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      linkText: "Read the MobiCom ’21 paper",
      actionLabel: "Verify Credential ◈",
      hud: "CLICK CANVAS TO TEST ACCESS CONTROL GATE",
      status: "Rotating permission tumblers active · Click to probe",
    },
    gptcodelearner: {
      num: "03",
      name: "GPT-Code-Learner",
      kind: "BRANCHING CODE-TREE SYNTHESIZER",
      desc: "Explore a codebase through questions, context, and GPT.",
      link: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      linkText: "Explore on GitHub",
      actionLabel: "Synthesize Query ⌘",
      hud: "CLICK CANVAS TO SYNTHESIZE CODEBASE QUERY TRACE",
      status: "AST context pathways active · Click to re-query",
    },
    sonica: {
      num: "04",
      name: "Sonica",
      kind: "NB-IOT PULSE OSCILLOSCOPE",
      desc: "An open NB-IoT network for experiments with real devices.",
      link: "https://github.com/sonica-nbiot/sonica",
      linkText: "Explore on GitHub",
      actionLabel: "Trigger OTA Burst ≋",
      hud: "CLICK CANVAS TO FIRE NARROWBAND OTA BURST",
      status: "Narrowband carrier locked · Click for OTA burst",
    },
    flora: {
      num: "05",
      name: "Flora",
      kind: "ISOMETRIC MONOLITH STACK",
      desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
      link: "https://project-flora.github.io/Flora/",
      linkText: "Explore the project",
      actionLabel: "Pulse Stack ⟁",
      hud: "MOVE POINTER TO TILT · CLICK TO PULSE 4-LAYER STACK",
      status: "eSIM → RAN → Core → Edge monolith stack online",
    },
    lrp: {
      num: "06",
      name: "Mobile VR Latency",
      kind: "STANDARD VS PROACTIVE VR WAVE",
      desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
      link: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      linkText: "Read the NSDI ’21 paper",
      actionLabel: "Impulse Motion ⟐",
      hud: "CONCEPTUAL WAVE — NOT A BENCHMARK",
      status: "Proactive mode: uplink prepared ahead of arrival",
    },
    acemap: {
      num: "07",
      name: "Acemap",
      kind: "2,208-TOPIC KNOWLEDGE GRAPH",
      desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
      link: "https://acemap.sjtu.edu.cn/",
      linkText: "Explore Acemap",
      actionLabel: "Reset View ⌖",
      hud: "LOAD CSV TO INSPECT ALL 2,208 TOPICS",
      status: "Preview mode · Click Load Dataset to fetch data.csv",
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
  const acemapControls = $("#acemap-controls");
  const acemapLoadBtn = $("#acemap-load-btn");
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

  // Per-project interactive state
  const seedState = {
    faultX: 0.5,
    faultY: 0.5,
    faultEnergy: 0,
    recoveryRadius: 0,
  };
  const secureState = {
    mode: "idle", // idle | allow | deny
    timer: 0,
    toggleCount: 0,
  };
  const gptState = {
    seed: 1,
    pulseProgress: 0,
    activeBranch: 2,
  };
  const sonicaState = {
    burst: 0,
    channel: 4,
  };
  const floraState = {
    pulse: 0,
  };
  const vrState = {
    proactive: true,
    impulse: 0,
  };

  // Acemap 2,208-topic dataset state (loaded strictly on-demand!)
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
  // Acid-Chartreuse-on-Jet-Black brutalist discipline spectrum
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
    aspect: 1,
    selectedField: "all",
    hoveredIndex: -1,
    selectedIndex: -1,
    reveal: 1,
  };

  function getAcemapBounds(w, h) {
    const padX = 28;
    const padY = 26;
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
    return (
      acemapState.selectedField === "all" ||
      acemapState.points[i].field === Number(acemapState.selectedField)
    );
  }

  function refreshAcemapDropdowns() {
    if (!acemapTopicSelect || !acemapReadout) return;
    acemapState.hoveredIndex = -1;
    acemapState.selectedIndex = -1;
    let count = 0;
    acemapTopicSelect.replaceChildren(new Option("Choose a topic", ""));
    for (let i = 0; i < acemapState.points.length; i++) {
      if (isAcemapPointActive(i)) {
        count++;
        acemapTopicSelect.add(new Option(acemapState.points[i].name, String(i)));
      }
    }
    const label =
      acemapState.selectedField === "all"
        ? "All 19 disciplines"
        : ACEMAP_FIELDS[Number(acemapState.selectedField)];
    acemapReadout.textContent = `${label} · ${count.toLocaleString()} topics loaded · Hover or click canvas to inspect.`;
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
      acemapState.loaded = true;
      acemapState.reveal = 1;

      if (acemapFieldSelect && acemapFieldSelect.options.length <= 1) {
        ACEMAP_FIELDS.forEach((fieldName, idx) => {
          acemapFieldSelect.add(new Option(fieldName, String(idx)));
        });
      }
      if (acemapLoadBtn) acemapLoadBtn.hidden = true;
      if (acemapFieldWrap) acemapFieldWrap.hidden = false;
      if (acemapTopicWrap) acemapTopicWrap.hidden = false;
      if (stageHud) {
        stageHud.textContent = "HOVER OR CLICK ANY TOPIC NODE";
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

  if (acemapLoadBtn) {
    acemapLoadBtn.addEventListener("click", loadAcemapCSV);
  }
  if (acemapFieldSelect) {
    acemapFieldSelect.addEventListener("change", () => {
      acemapState.selectedField = acemapFieldSelect.value;
      refreshAcemapDropdowns();
    });
  }
  if (acemapTopicSelect) {
    acemapTopicSelect.addEventListener("change", () => {
      const val = acemapTopicSelect.value;
      acemapState.selectedIndex = val === "" ? -1 : Number(val);
      if (acemapState.selectedIndex >= 0 && acemapState.points[acemapState.selectedIndex]) {
        const pt = acemapState.points[acemapState.selectedIndex];
        acemapReadout.textContent = `LOCKED // ${pt.name} · ${ACEMAP_FIELDS[pt.field]}`;
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
      const ddx = sx - px;
      const ddy = sy - py;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

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
      stageActionBtn.textContent = meta.actionLabel;
    }
    if (stageHud) {
      stageHud.textContent =
        id === "acemap" && acemapState.loaded
          ? "HOVER OR CLICK ANY TOPIC NODE"
          : meta.hud;
    }
    if (stageStatus) {
      if (id === "lrp") {
        stageStatus.textContent = vrState.proactive
          ? "Proactive mode: uplink prepared ahead of arrival"
          : "Standard mode: reactive scheduling & DRX wake delay";
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
    if (vrModeBtn) vrModeBtn.hidden = id !== "lrp";
    if (acemapControls) acemapControls.hidden = id !== "acemap";

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
      seedState.faultX = normX ?? 0.3 + Math.random() * 0.4;
      seedState.faultY = normY ?? 0.3 + Math.random() * 0.4;
      seedState.faultEnergy = 1.0;
      seedState.recoveryRadius = 0;
      if (stageStatus) {
        stageStatus.textContent =
          "5G fault injected → SIM applet diagnosing & recovering lattice";
      }
    } else if (activeProject === "secureSIM") {
      secureState.toggleCount++;
      const allow = secureState.toggleCount % 2 === 1;
      secureState.mode = allow ? "allow" : "deny";
      secureState.timer = 1.0;
      if (stageStatus) {
        stageStatus.textContent = allow
          ? "Certificate verified · Fine-grained SIM gate ALIGNED"
          : "Unauthorized probe · Matrix gate REJECTED request";
      }
    } else if (activeProject === "gptcodelearner") {
      gptState.seed++;
      gptState.pulseProgress = 0.01;
      gptState.activeBranch = gptState.seed % 4;
      if (stageStatus) {
        const queries = [
          "Query trace: repo/src/parser → context → GPT synthesis",
          "Query trace: repo/core/scheduler → context → GPT synthesis",
          "Query trace: repo/net/protocol → context → GPT synthesis",
          "Query trace: repo/docs/spec → context → GPT synthesis",
        ];
        stageStatus.textContent = queries[gptState.activeBranch];
      }
    } else if (activeProject === "sonica") {
      sonicaState.burst = 1.0;
      sonicaState.channel = (sonicaState.channel + 3) % 9;
      if (stageStatus) {
        stageStatus.textContent = `NB-IoT OTA uplink/downlink burst on narrowband CH-0${sonicaState.channel + 1}`;
      }
    } else if (activeProject === "flora") {
      floraState.pulse = 1.0;
      if (stageStatus) {
        stageStatus.textContent =
          "Signal surge propagating: eSIM → RAN → Core → Edge";
      }
    } else if (activeProject === "lrp") {
      vrState.impulse = 1.0;
      if (stageStatus) {
        stageStatus.textContent = vrState.proactive
          ? "Head motion impulse · Proactive uplink tightly phase-locked"
          : "Head motion impulse · Standard uplink exhibits lag & stepping";
      }
    } else if (activeProject === "acemap") {
      if (!acemapState.loaded) {
        loadAcemapCSV();
      } else {
        acemapState.selectedField = "all";
        if (acemapFieldSelect) acemapFieldSelect.value = "all";
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
          ? "Proactive mode: uplink prepared ahead of arrival"
          : "Standard mode: reactive scheduling & DRX wake delay";
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

        if (activeProject === "acemap" && acemapState.loaded) {
          const idx = findNearestAcemapPoint(ev.clientX, ev.clientY, 16);
          if (idx !== acemapState.hoveredIndex) {
            acemapState.hoveredIndex = idx;
            if (idx >= 0 && acemapReadout) {
              const pt = acemapState.points[idx];
              acemapReadout.textContent = `HOVER // ${pt.name} · ${ACEMAP_FIELDS[pt.field]}`;
            }
            drawProjectCanvas();
          }
        }
      },
      { passive: true },
    );

    projectCanvas.addEventListener("pointerleave", () => {
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
            acemapReadout.textContent = `LOCKED // ${pt.name} · ${ACEMAP_FIELDS[pt.field]}`;
          }
          drawProjectCanvas();
        }
        return;
      }
      triggerStageAction(nx, ny);
    });
  }

  /* ---------- 7 BESPOKE GENERATIVE CANVAS RENDERERS ---------- */
  function drawSeedArt(ctx, w, h, t) {
    const cols = Math.max(12, Math.floor(w / 28));
    const rows = Math.max(7, Math.floor(h / 28));
    const padX = 24;
    const padY = 24;
    const dx = (w - padX * 2) / (cols - 1);
    const dy = (h - padY * 2) / (rows - 1);
    const fx = seedState.faultX * w;
    const fy = seedState.faultY * h;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * dx;
        const y = padY + r * dy;
        const dist = Math.hypot(x - fx, y - fy);
        let angle = Math.sin(c * 0.34 + t * 2.1) * 0.45 + Math.cos(r * 0.4 - t * 1.4) * 0.3;
        let color = "#c8ff00";
        let len = Math.min(dx, dy) * 0.42;

        if (seedState.faultEnergy > 0.01) {
          const waveFront = seedState.recoveryRadius * Math.hypot(w, h);
          const ringDiff = dist - waveFront;
          if (Math.abs(ringDiff) < 70) {
            const intensity = (1 - Math.abs(ringDiff) / 70) * seedState.faultEnergy;
            angle += Math.sin(c * 13.7 + r * 9.3 + t * 14) * 2.8 * intensity;
            color = intensity > 0.35 ? "#ff4800" : "#eae8e1";
            len *= 1 + intensity * 0.55;
          }
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = color === "#ff4800" ? 2.5 : 1.7;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();

        ctx.fillStyle = color === "#ff4800" ? "#ff4800" : "rgba(234,232,225,0.5)";
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
    }

    // Recovery ring overlay
    if (seedState.faultEnergy > 0.02) {
      const rr = seedState.recoveryRadius * Math.hypot(w, h);
      ctx.strokeStyle = `rgba(200, 255, 0, ${(seedState.faultEnergy * 0.9).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      seedState.faultEnergy > 0.05 ? "STATE // SIM RECOVERY SWEEP" : "STATE // 5G HARMONIC LATTICE LOCKED",
      14,
      20,
    );
  }

  function drawSecureSimArt(ctx, w, h, t) {
    const cx = w * 0.5;
    const cy = h * 0.52;
    const maxR = Math.min(w, h) * 0.39;
    const aligned = secureState.mode === "allow" && secureState.timer > 0.05;
    const denied = secureState.mode === "deny" && secureState.timer > 0.05;

    // Crosshair structural axes
    ctx.strokeStyle = "rgba(234, 232, 225, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    // 4 concentric cryptographic rotating matrix rings
    for (let ring = 0; ring < 4; ring++) {
      const r = maxR * (0.34 + ring * 0.21);
      const dir = ring % 2 === 0 ? 1 : -1;
      const baseRot = aligned ? 0 : t * (0.45 + ring * 0.18) * dir;
      const segments = 6 + ring * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(baseRot);

      for (let s = 0; s < segments; s++) {
        const a0 = (s / segments) * Math.PI * 2 + 0.08;
        const a1 = ((s + 1) / segments) * Math.PI * 2 - 0.12;
        ctx.strokeStyle =
          denied && ring === 3
            ? "#ff4800"
            : s === 0
              ? "#c8ff00"
              : "rgba(234, 232, 225, 0.55)";
        ctx.lineWidth = s === 0 ? 5 : 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Central chamfered SIM core aperture
    const core = 24;
    ctx.fillStyle = aligned ? "#c8ff00" : denied ? "#ff4800" : "#141416";
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - core, cy - core);
    ctx.lineTo(cx + core * 0.55, cy - core);
    ctx.lineTo(cx + core, cy - core * 0.55);
    ctx.lineTo(cx + core, cy + core);
    ctx.lineTo(cx - core, cy + core);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = aligned || denied ? "#0b0b0c" : "#c8ff00";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SIM", cx, cy + 4);

    // Verification beam or deflected probe
    if (aligned) {
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, cy);
      ctx.lineTo(w - 16, cy);
      ctx.stroke();
    } else if (denied) {
      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, cy);
      ctx.lineTo(cx - maxR - 8, cy);
      ctx.lineTo(cx - maxR - 36, cy - 38);
      ctx.stroke();
    }

    ctx.fillStyle = "#eae8e1";
    ctx.textAlign = "left";
    ctx.fillText(
      aligned
        ? "GATE // AUTHORIZED TOKEN ADMITTED"
        : denied
          ? "GATE // UNAUTHORIZED ACCESS REJECTED"
          : "GATE // ZERO-TRUST SIM TUMBLER MATRIX",
      14,
      20,
    );
  }

  function drawGptTreeArt(ctx, w, h, t) {
    // Orthogonal branching codebase AST synthesizer
    const rootX = 36;
    const rootY = h * 0.5;
    const levels = [0.26, 0.54, 0.82];
    const branchYs = [0.2, 0.4, 0.6, 0.8];

    // Subtle grid
    ctx.strokeStyle = "rgba(234,232,225,0.06)";
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const activeB = gptState.activeBranch;
    const pulse = (t * 0.6 + gptState.pulseProgress) % 1;

    branchYs.forEach((by, i) => {
      const y1 = h * by;
      const x1 = w * levels[0];
      const x2 = w * levels[1];
      const x3 = w * levels[2];
      const isHot = i === activeB;

      // Root to L1 orthogonal branch
      ctx.strokeStyle = isHot ? "#c8ff00" : "rgba(234,232,225,0.24)";
      ctx.lineWidth = isHot ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.lineTo(rootX + 32, rootY);
      ctx.lineTo(rootX + 32, y1);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // L1 to L2 sub-branches
      [-22, 22].forEach((off, subIdx) => {
        const subY = Math.max(24, Math.min(h - 24, y1 + off));
        const subHot = isHot && subIdx === gptState.seed % 2;
        ctx.strokeStyle = subHot ? "#ff4800" : "rgba(234,232,225,0.2)";
        ctx.lineWidth = subHot ? 2.2 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo((x1 + x2) * 0.5, y1);
        ctx.lineTo((x1 + x2) * 0.5, subY);
        ctx.lineTo(x2, subY);
        ctx.stroke();

        // L2 node
        ctx.fillStyle = subHot ? "#ff4800" : "#19191d";
        ctx.strokeStyle = subHot ? "#c8ff00" : "#eae8e1";
        ctx.lineWidth = 1.5;
        ctx.fillRect(x2 - 5, subY - 5, 10, 10);
        ctx.strokeRect(x2 - 5, subY - 5, 10, 10);

        if (subHot) {
          // Synthesize into GPT output bar on right
          ctx.strokeStyle = "#c8ff00";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x2 + 5, subY);
          ctx.lineTo(x3, subY);
          ctx.lineTo(x3, rootY);
          ctx.stroke();
        }
      });

      // L1 module box
      ctx.fillStyle = isHot ? "#c8ff00" : "#0b0b0c";
      ctx.strokeStyle = isHot ? "#c8ff00" : "#eae8e1";
      ctx.lineWidth = 1.8;
      ctx.fillRect(x1 - 7, y1 - 7, 14, 14);
      ctx.strokeRect(x1 - 7, y1 - 7, 14, 14);
    });

    // Travelling query pulse along active branch
    const px = rootX + pulse * (w * levels[2] - rootX);
    const py = h * branchYs[activeB];
    ctx.fillStyle = "#c8ff00";
    ctx.fillRect(px - 6, py - 6, 12, 12);

    // Root & synthesis monoliths
    ctx.fillStyle = "#c8ff00";
    ctx.fillRect(rootX - 10, rootY - 18, 20, 36);
    ctx.fillStyle = "#0b0b0c";
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Q", rootX, rootY + 4);

    // Synthesis answer block
    const sx = w * levels[2];
    ctx.fillStyle = "#0b0b0c";
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2;
    ctx.fillRect(sx - 6, rootY - 34, w - sx - 12, 68);
    ctx.strokeRect(sx - 6, rootY - 34, w - sx - 12, 68);
    for (let line = 0; line < 4; line++) {
      const lw = (w - sx - 32) * (0.45 + 0.45 * Math.abs(Math.sin(t * 2 + line * 1.3 + gptState.seed)));
      ctx.fillStyle = line === 0 ? "#c8ff00" : "#eae8e1";
      ctx.fillRect(sx + 4, rootY - 22 + line * 14, lw, 5);
    }

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("AST // CONTEXT RETRIEVAL & SYNTHESIS TREE", 14, 20);
  }

  function drawSonicaArt(ctx, w, h, t) {
    // Upper half: narrowband spectrum waterfall bars; lower half: sharp pulse oscilloscope
    const splitY = h * 0.48;

    // Reticle grid
    ctx.strokeStyle = "rgba(234,232,225,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(w, splitY);
    for (let x = 40; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();

    // Narrowband channels
    const chCount = 12;
    const chW = (w - 40) / chCount;
    for (let i = 0; i < chCount; i++) {
      const isBurstCh = i === sonicaState.channel || i === (sonicaState.channel + 1) % chCount;
      const baseAmp = 0.14 + 0.12 * Math.abs(Math.sin(t * 2.5 + i * 1.1));
      const amp = isBurstCh ? Math.min(0.95, baseAmp + 0.45 + sonicaState.burst * 0.4) : baseAmp;
      const bh = amp * (splitY - 38);
      const bx = 20 + i * chW + 4;
      ctx.fillStyle = isBurstCh ? (sonicaState.burst > 0.2 ? "#ff4800" : "#c8ff00") : "rgba(234,232,225,0.28)";
      ctx.fillRect(bx, splitY - bh - 6, chW - 8, bh);
    }

    // Lower pulse oscilloscope
    const oscY = splitY + (h - splitY) * 0.54;
    const ampY = (h - splitY) * 0.34;
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 16; x < w - 16; x += 3) {
      const u = (x - 16) / (w - 32);
      const carrier = Math.sin(u * 42 - t * 9);
      const gate = Math.sin(u * 6 - t * 2.4) > 0.15 ? 1 : 0.12;
      const burstBoost = sonicaState.burst > 0.05 ? 1 + sonicaState.burst * 0.55 : 1;
      const stepped = Math.round(carrier * gate * burstBoost * 4) / 4;
      const y = oscY - stepped * ampY;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Safety-orange trigger markers
    if (sonicaState.burst > 0.05) {
      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 2;
      const tx = 16 + ((1 - sonicaState.burst) * (w - 32));
      ctx.beginPath();
      ctx.moveTo(tx, splitY + 8);
      ctx.lineTo(tx, h - 12);
      ctx.stroke();
    }

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("NB-IOT // 180KHZ NARROWBAND CARRIER & PULSE SCOPE", 14, 20);
  }

  function drawFloraArt(ctx, w, h, t) {
    // 4-layer extruded brutalist isometric monolith stack (eSIM / RAN / CORE / EDGE)
    const layers = ["04 EDGE", "03 CORE", "02 RAN", "01 eSIM"];
    const cx = w * 0.5 + (stagePtrX - 0.5) * 26;
    const baseY = h * 0.74;
    const slabW = Math.min(w * 0.34, 150);
    const slabH = Math.min(h * 0.14, 42);
    const thickness = 16;
    const gap = Math.min(h * 0.155, 52);

    // Vertical telemetry pillars
    ctx.strokeStyle = "rgba(200, 255, 0, 0.25)";
    ctx.lineWidth = 1.5;
    [-slabW * 0.55, 0, slabW * 0.55].forEach((ox) => {
      ctx.beginPath();
      ctx.moveTo(cx + ox, baseY + 18);
      ctx.lineTo(cx + ox, baseY - gap * 3 - 44);
      ctx.stroke();
    });

    for (let i = 3; i >= 0; i--) {
      const idxFromBottom = 3 - i;
      const breathe = Math.sin(t * 2 + idxFromBottom * 0.7) * 4;
      const pulseHit =
        floraState.pulse > 0.02 &&
        Math.abs((1 - floraState.pulse) * 3 - idxFromBottom) < 0.7;
      const y = baseY - idxFromBottom * gap + breathe + (stagePtrY - 0.5) * (idxFromBottom * 6);

      // Top diamond face
      ctx.beginPath();
      ctx.moveTo(cx, y - slabH);
      ctx.lineTo(cx + slabW, y);
      ctx.lineTo(cx, y + slabH);
      ctx.lineTo(cx - slabW, y);
      ctx.closePath();
      ctx.fillStyle = pulseHit ? "#c8ff00" : i === 0 ? "#1c1c20" : "#121215";
      ctx.fill();
      ctx.strokeStyle = pulseHit ? "#ff4800" : "#c8ff00";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Left extruded face
      ctx.beginPath();
      ctx.moveTo(cx - slabW, y);
      ctx.lineTo(cx, y + slabH);
      ctx.lineTo(cx, y + slabH + thickness);
      ctx.lineTo(cx - slabW, y + thickness);
      ctx.closePath();
      ctx.fillStyle = pulseHit ? "#ff4800" : "#222226";
      ctx.fill();
      ctx.strokeStyle = "#eae8e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right extruded face
      ctx.beginPath();
      ctx.moveTo(cx + slabW, y);
      ctx.lineTo(cx, y + slabH);
      ctx.lineTo(cx, y + slabH + thickness);
      ctx.lineTo(cx + slabW, y + thickness);
      ctx.closePath();
      ctx.fillStyle = "#0b0b0c";
      ctx.fill();
      ctx.stroke();

      // Label callout
      ctx.fillStyle = pulseHit ? "#c8ff00" : "#eae8e1";
      ctx.font = "700 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(layers[i], cx + slabW + 14, y + 4);
    }

    ctx.fillStyle = "#eae8e1";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("FLORA // SOFTWARE-DEFINED MOBILE STACK", 14, 20);
  }

  function drawVrLatencyArt(ctx, w, h, t) {
    const midY = h * 0.52;
    const amp = h * 0.26;

    // Grid
    ctx.strokeStyle = "rgba(234,232,225,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    for (let x = 36; x < w; x += 36) {
      ctx.moveTo(x, 28);
      ctx.lineTo(x, h - 28);
    }
    ctx.stroke();

    const targetWave = (u) => {
      const base = Math.sin(u * 10 - t * 3.2) * 0.65 + Math.sin(u * 21 - t * 5.2) * 0.25;
      const kick = vrState.impulse * Math.exp(-Math.pow((u - 0.65) * 9, 2)) * 0.7;
      return base + kick;
    };

    // Target head-motion curve (concrete white dashed)
    ctx.strokeStyle = "rgba(234, 232, 225, 0.7)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let x = 16; x < w - 16; x += 3) {
      const u = (x - 16) / (w - 32);
      const y = midY - targetWave(u) * amp;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Active mode response wave
    const isPro = vrState.proactive;
    ctx.strokeStyle = isPro ? "#c8ff00" : "#ff4800";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 16; x < w - 16; x += 3) {
      const u = (x - 16) / (w - 32);
      let val;
      if (isPro) {
        // Tightly phase-locked proactive scheduling
        val = targetWave(u - 0.015);
      } else {
        // Delayed, stepped standard scheduling + DRX stall
        const quantU = Math.floor((u - 0.14) * 16) / 16;
        val = targetWave(quantU);
      }
      const y = midY - val * amp;
      if (x === 16) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Uplink scheduling slot strip at bottom
    const slotY = h - 32;
    const slots = 14;
    const sw = (w - 32) / slots;
    for (let i = 0; i < slots; i++) {
      const activeSlot = isPro ? i % 2 === 0 : i % 5 === 0;
      ctx.fillStyle = activeSlot ? (isPro ? "#c8ff00" : "#ff4800") : "rgba(234,232,225,0.14)";
      ctx.fillRect(16 + i * sw + 2, slotY, sw - 6, 10);
    }

    ctx.fillStyle = isPro ? "#c8ff00" : "#ff4800";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      isPro
        ? "PROACTIVE SCHEDULING // TIGHT PHASE LOCK (CONCEPTUAL)"
        : "STANDARD LTE UPLINK // DELAYED & STEPPED (CONCEPTUAL)",
      14,
      20,
    );
  }

  function drawAcemapArt(ctx, w, h, t) {
    if (!acemapState.loaded) {
      // Brutalist orbital preview before on-demand CSV load
      const cx = w * 0.5;
      const cy = h * 0.52;
      const rx = Math.min(w * 0.38, 190);
      const ry = Math.min(h * 0.34, 110);

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

      // Deterministic preview constellation nodes
      const nodes = 36;
      for (let i = 0; i < nodes; i++) {
        const a = (i / nodes) * Math.PI * 2 + t * 0.14;
        const rad = 0.25 + ((i * 37) % 100) / 130;
        const x = cx + Math.cos(a) * rx * rad;
        const y = cy + Math.sin(a * 1.4) * ry * rad;
        ctx.fillStyle = i % 7 === 0 ? "#ff4800" : "#c8ff00";
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }

      ctx.fillStyle = "#c8ff00";
      ctx.font = "700 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("ACEMAP // CLICK 'LOAD 2,208 TOPICS DATASET' BELOW", 14, 20);
      return;
    }

    // Full 2,208-topic Acid-Chartreuse-on-Jet-Black interactive canvas (all 19 disciplines rendered immediately)
    const { offsetX, offsetY, drawW, drawH } = getAcemapBounds(w, h);

    // Subtle structural border ticks
    ctx.strokeStyle = "rgba(234,232,225,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX - 8, offsetY - 8, drawW + 16, drawH + 16);

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
        const sz = pt.size > 7 ? 3.5 : 2.3;
        ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
      } else {
        ctx.fillStyle = "rgba(234, 232, 225, 0.1)";
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }

    // Highlight hovered or selected topic with brutalist Safety-Orange targeting reticle
    const focusIdx =
      acemapState.hoveredIndex >= 0
        ? acemapState.hoveredIndex
        : acemapState.selectedIndex;
    if (focusIdx >= 0 && acemapState.points[focusIdx]) {
      const pt = acemapState.points[focusIdx];
      const sx = offsetX + pt.nx * drawW;
      const sy = offsetY + pt.ny * drawH;

      ctx.strokeStyle = "#ff4800";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy);
      ctx.lineTo(sx + 16, sy);
      ctx.moveTo(sx, sy - 16);
      ctx.lineTo(sx, sy + 16);
      ctx.stroke();

      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 7, sy - 7, 14, 14);

      const label = `${pt.name} [${ACEMAP_FIELDS[pt.field]}]`;
      ctx.font = "700 11px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(label).width + 14;
      const lx = Math.min(w - tw - 10, Math.max(10, sx + 12));
      const ly = sy < 44 ? sy + 18 : sy - 24;
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(lx, ly - 13, tw, 18);
      ctx.fillStyle = "#0b0b0c";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 7, ly);
    }

    ctx.fillStyle = "#c8ff00";
    ctx.font = "700 11px 'JetBrains Mono', monospace";
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

      // Decay interactive triggers
      if (seedState.faultEnergy > 0) {
        seedState.recoveryRadius += dt * 0.55;
        seedState.faultEnergy = Math.max(0, seedState.faultEnergy - dt * 0.42);
      }
      if (secureState.timer > 0) {
        secureState.timer = Math.max(0, secureState.timer - dt * 0.48);
        if (secureState.timer === 0) secureState.mode = "idle";
      }
      if (sonicaState.burst > 0) {
        sonicaState.burst = Math.max(0, sonicaState.burst - dt * 0.75);
      }
      if (floraState.pulse > 0) {
        floraState.pulse = Math.max(0, floraState.pulse - dt * 0.85);
      }
      if (vrState.impulse > 0) {
        vrState.impulse = Math.max(0, vrState.impulse - dt * 0.9);
      }
      if (acemapState.loaded && acemapState.reveal < 1) {
        acemapState.reveal = Math.min(1, acemapState.reveal + dt * 1.4);
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
     6. PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
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
     7. OBSERVERS, RESIZE, VISIBILITY & REDUCED MOTION
     ======================================================================== */
  if ("IntersectionObserver" in window) {
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
    bmVisible = true;
    stageVisible = true;
  }

  window.addEventListener(
    "resize",
    () => {
      drawBmCanvas();
      drawProjectCanvas();
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    syncBmLoop();
    syncStageLoop();
  });

  function handleMotionChange() {
    motionEnabled = !reduceMotionQuery.matches;
    updateScrollEffects();
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
  drawBmCanvas();
  drawProjectCanvas();
})();
