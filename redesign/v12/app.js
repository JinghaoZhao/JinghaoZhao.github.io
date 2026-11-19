/* ==========================================================================
   Version 12 — Tactile Spatial OS & Playable Micro-App Playground
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
  // Canvas Visibility Manager (pauses offscreen animation loops automatically)
  // --------------------------------------------------------------------------
  const animatedLoops = [];

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
            if (entry.visible && !reducedMotion) {
              entry.start();
            } else {
              entry.stop();
            }
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

  function syncCanvasSize(canvas, cssHeight) {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width || canvas.width));
    const h = Math.round(cssHeight || rect.height || canvas.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
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
  // HERO WIDGET: Interactive Bare Metal Rack & CME Low-Latency Console
  // --------------------------------------------------------------------------
  const rackConsole = $("#rack-console");
  const rackScope = $("#rack-scope");
  const rackReadout = $("#rack-readout");
  const rackDetail = $("#rack-detail");
  const rackLed = $("#rack-led");
  const fabricButtons = $$("[data-fabric-mode]");
  const bladeButtons = $$("[data-blade]");
  const pulseBtn = $("#rack-pulse-btn");

  const rackState = {
    fabric: "cme", // "cme" | "standard"
    blades: [true, true, true, true],
    burst: 0,
    phase: 0,
  };

  const bladeNames = [
    "BM-01 Dedicated Host Silicon",
    "BM-02 Deterministic Fabric NIC",
    "BM-03 Automated Fleet Control",
    "BM-04 CME Low-Latency Node",
  ];

  function updateRackReadout(customDetail) {
    const activeCount = rackState.blades.filter(Boolean).length;
    if (rackConsole) rackConsole.dataset.fabric = rackState.fabric;
    if (rackLed) {
      rackLed.className =
        activeCount === 0
          ? "led led-coral"
          : rackState.fabric === "cme"
            ? "led led-emerald"
            : "led led-blue";
    }
    if (rackReadout) {
      const modeLabel =
        rackState.fabric === "cme" ? "CME DEDICATED FABRIC" : "STANDARD CLOUD PATH";
      rackReadout.textContent = `${modeLabel} · ${activeCount}/4 BLADES ACTIVE`;
    }
    if (customDetail && rackDetail) {
      rackDetail.textContent = customDetail;
    }
  }

  function setFabricMode(mode) {
    rackState.fabric = mode === "standard" ? "standard" : "cme";
    rackState.burst = 1.0;
    fabricButtons.forEach((btn) => {
      const isMatch = btn.dataset.fabricMode === rackState.fabric;
      btn.classList.toggle("is-active", isMatch);
      btn.setAttribute("aria-pressed", String(isMatch));
    });
    positionSegmentThumb($('[data-segment="fabric"]'));
    updateRackReadout(
      rackState.fabric === "cme"
        ? "Dedicated physical path active — phase-locked deterministic fabric."
        : "Shared virtualized cloud hops — showing multi-hop queuing variance."
    );
    if (rackLoop && reducedMotion) rackLoop.drawOnce();
  }

  fabricButtons.forEach((btn) => {
    btn.addEventListener("click", () => setFabricMode(btn.dataset.fabricMode));
  });

  function triggerRackBurst(detail) {
    rackState.burst = 1.0;
    bladeButtons.forEach((btn, idx) => {
      if (!rackState.blades[idx]) return;
      btn.classList.remove("is-pulsing");
      void btn.offsetWidth;
      setTimeout(() => {
        btn.classList.add("is-pulsing");
        setTimeout(() => btn.classList.remove("is-pulsing"), 340);
      }, idx * 55);
    });
    if (detail) updateRackReadout(detail);
    if (rackLoop && reducedMotion) rackLoop.drawOnce();
  }

  bladeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.blade);
      rackState.blades[idx] = !rackState.blades[idx];
      const online = rackState.blades[idx];
      btn.classList.toggle("is-active", online);
      btn.setAttribute("aria-pressed", String(online));
      const stateEl = $(".blade-state", btn);
      if (stateEl) stateEl.textContent = online ? "ONLINE" : "ISOLATED";
      rackState.burst = 0.85;
      updateRackReadout(
        `${bladeNames[idx]} switched ${online ? "ONLINE" : "to ISOLATED standby"}.`
      );
      if (rackLoop && reducedMotion) rackLoop.drawOnce();
    });
  });

  if (pulseBtn) {
    pulseBtn.addEventListener("click", () => {
      triggerRackBurst("Fabric packet burst dispatched across active blades.");
    });
  }

  const rackLoop = registerCanvasLoop(rackScope, (_now, dt) => {
    const { ctx, w, h } = syncCanvasSize(rackScope, 136);
    if (!ctx) return;

    const activeCount = rackState.blades.filter(Boolean).length;
    const isCME = rackState.fabric === "cme";
    rackState.phase += dt * (isCME ? 5.6 : 3.2);
    rackState.burst = Math.max(0, rackState.burst - dt * 1.4);

    // Background & precision engineering grid
    ctx.fillStyle = "#101829";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.11)";
    ctx.lineWidth = 1;
    const stepX = 32;
    const stepY = 26;
    ctx.beginPath();
    for (let x = stepX; x < w; x += stepX) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = stepY; y < h; y += stepY) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Center zero line
    ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5 + 0.5);
    ctx.lineTo(w, h * 0.5 + 0.5);
    ctx.stroke();

    if (activeCount === 0) {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();
      return;
    }

    const energy = 0.28 + (activeCount / 4) * 0.72;
    const burstGain = 1 + rackState.burst * 0.65;

    // Secondary reference wave (Klein Blue)
    ctx.strokeStyle = isCME ? "rgba(59, 130, 246, 0.75)" : "rgba(59, 130, 246, 0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const nx = x / w;
      let y;
      if (isCME) {
        const carrier = Math.sin(nx * 24 - rackState.phase) * 14 * energy * burstGain;
        const envelope = Math.sin(nx * Math.PI);
        y = h * 0.5 + carrier * (0.45 + 0.55 * envelope);
      } else {
        const jitter =
          Math.sin(nx * 14 - rackState.phase * 0.85) * 18 +
          Math.sin(nx * 41 + rackState.phase * 2.4) * 10 +
          Math.cos(nx * 67 - rackState.phase * 3.1) * 7;
        y = h * 0.5 + jitter * energy * burstGain * 0.85;
      }
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Primary lock trace (Emerald in CME mode, Soft Cyan-Blue in Standard mode)
    ctx.strokeStyle = isCME ? "#10b981" : "#60a5fa";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const nx = x / w;
      let y;
      if (isCME) {
        const pulsePos = (rackState.phase * 0.16) % 1;
        const dist = Math.min(Math.abs(nx - pulsePos), 1 - Math.abs(nx - pulsePos));
        const spike = Math.exp(-(dist * dist) / 0.0022) * (24 + rackState.burst * 16);
        const harmonic = Math.sin(nx * 24 - rackState.phase) * 5 * energy;
        y = h * 0.5 - spike * energy + harmonic;
      } else {
        const rough =
          Math.sin(nx * 19 - rackState.phase * 1.1) * 14 +
          Math.sin(nx * 53 - rackState.phase * 2.9) * 11;
        y = h * 0.5 + rough * energy * 0.9;
      }
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Blade indicator nodes along bottom edge
    const pad = 26;
    const gap = (w - pad * 2) / 3;
    rackState.blades.forEach((online, i) => {
      const cx = pad + gap * i;
      const cy = h - 14;
      ctx.fillStyle = online ? (isCME ? "#10b981" : "#60a5fa") : "#475569";
      ctx.beginPath();
      ctx.arc(cx, cy, online ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // --------------------------------------------------------------------------
  // MINI-APP 1: SEED — Playable 5G Fault Injector & SIM Applet Recovery
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
    if (seedStatus) seedStatus.textContent = "5G FAULT INJECTED · SIGNALING DROP";
    if (seedFaultBtn) seedFaultBtn.setAttribute("aria-pressed", "true");
    if (seedBtnLabel) seedBtnLabel.textContent = "Fault Active…";
    setSeedSteps(["is-fault", "", ""]);
    if (seedLoop && reducedMotion) seedLoop.drawOnce();

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "diagnosing";
        if (seedStage) seedStage.dataset.seedState = "diagnosing";
        if (seedLed) seedLed.className = "led led-blue";
        if (seedStatus) {
          seedStatus.textContent = "SEED SIM APPLET · DIAGNOSING WITH 5G CORE";
        }
        if (seedBtnLabel) seedBtnLabel.textContent = "SIM Diagnosing…";
        setSeedSteps(["is-done", "is-active", ""]);
        if (seedLoop && reducedMotion) seedLoop.drawOnce();
      }, 950)
    );

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "recovered";
        if (seedStage) seedStage.dataset.seedState = "healthy";
        if (seedLed) seedLed.className = "led led-emerald";
        if (seedStatus) {
          seedStatus.textContent = "RECOVERED BY SEED · 5G LINK RESTORED";
        }
        if (seedFaultBtn) seedFaultBtn.setAttribute("aria-pressed", "false");
        if (seedBtnLabel) seedBtnLabel.textContent = "Inject 5G Fault";
        setSeedSteps(["is-done", "is-done", "is-done"]);
        if (seedLoop && reducedMotion) seedLoop.drawOnce();
      }, 2250)
    );

    seedState.timers.push(
      setTimeout(() => {
        seedState.mode = "healthy";
        if (seedStatus) {
          seedStatus.textContent = "5G LINK NOMINAL · SIM MONITOR ARMED";
        }
      }, 4600)
    );
  }

  if (seedFaultBtn) {
    seedFaultBtn.addEventListener("click", triggerSeedFault);
  }

  const seedLoop = registerCanvasLoop(seedCanvas, (_now, dt) => {
    const { ctx, w, h } = syncCanvasSize(seedCanvas, 128);
    if (!ctx) return;

    seedState.phase += dt * (seedState.mode === "fault" ? 11 : 4.4);
    ctx.fillStyle = "#101829";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5 + 0.5);
    ctx.lineTo(w, h * 0.5 + 0.5);
    for (let x = 40; x < w; x += 40) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    ctx.stroke();

    const color =
      seedState.mode === "fault"
        ? "#f43f5e"
        : seedState.mode === "diagnosing"
          ? "#3b82f6"
          : "#10b981";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const nx = x / w;
      let y = h * 0.5;
      if (seedState.mode === "fault") {
        const drop = nx > 0.34 && nx < 0.68 ? 0.15 : 1;
        const spike =
          (Math.sin(nx * 58 + seedState.phase) * 26 +
            Math.cos(nx * 97 - seedState.phase * 1.8) * 18) *
          drop;
        y = h * 0.5 + spike;
      } else if (seedState.mode === "diagnosing") {
        const sweep = Math.sin(nx * 24 - seedState.phase * 1.4) * 16;
        const damp = Math.cos(nx * 46 + seedState.phase) * 7;
        y = h * 0.5 + sweep + damp;
      } else {
        const calm =
          Math.sin(nx * 18 - seedState.phase) * 18 * Math.sin(nx * Math.PI);
        const mod = Math.sin(nx * 36 - seedState.phase * 1.5) * 4;
        y = h * 0.5 + calm + mod;
      }
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Status corner label
    ctx.fillStyle = color;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    const tag =
      seedState.mode === "fault"
        ? "ERR: CONTROL-PLANE DROP"
        : seedState.mode === "diagnosing"
          ? "SIM APPLET: INFERRING CAUSE"
          : "5G SIGNAL: HEALTHY";
    ctx.fillText(tag, 12, 20);
  });

  // --------------------------------------------------------------------------
  // MINI-APP 2: SecureSIM — Playable Cryptographic Cert & Permission Dial
  // --------------------------------------------------------------------------
  const simStage = $(".securesim-stage");
  const simCertToggle = $("#sim-cert-toggle");
  const simPermToggle = $("#sim-perm-toggle");
  const simRequestBtn = $("#sim-request-btn");
  const simVerdict = $("#sim-verdict");
  const simReason = $("#sim-reason");
  const simDialIcon = $("#sim-dial-icon");
  const simCertSub = $("#sim-cert-sub");
  const simPermSub = $("#sim-perm-sub");

  const simState = {
    cert: true,
    perm: true,
  };

  function evaluateSecureSIM(triggerFeedback = false) {
    const allowed = simState.cert && simState.perm;
    if (simStage) {
      simStage.dataset.access = allowed ? "allowed" : "denied";
      if (triggerFeedback && !allowed) {
        simStage.classList.remove("is-shake");
        void simStage.offsetWidth;
        simStage.classList.add("is-shake");
      }
    }
    if (simVerdict) simVerdict.textContent = allowed ? "ALLOWED" : "DENIED";
    if (simDialIcon) simDialIcon.textContent = allowed ? "✓" : "✕";

    if (simReason) {
      if (allowed) {
        simReason.textContent =
          "Certificate authenticated · fine-grained scope matched → SIM service";
      } else if (!simState.cert && !simState.perm) {
        simReason.textContent =
          "Blocked: missing signed certificate and service permission";
      } else if (!simState.cert) {
        simReason.textContent =
          "Blocked at SIM: unauthenticated / unsigned certificate";
      } else {
        simReason.textContent =
          "Blocked at SIM: certificate valid, but service scope denied";
      }
    }

    if (simCertToggle) {
      simCertToggle.classList.toggle("is-on", simState.cert);
      simCertToggle.setAttribute("aria-pressed", String(simState.cert));
    }
    if (simCertSub) {
      simCertSub.textContent = simState.cert
        ? "Valid signed identity"
        : "Unsigned / revoked cert";
    }

    if (simPermToggle) {
      simPermToggle.classList.toggle("is-on", simState.perm);
      simPermToggle.setAttribute("aria-pressed", String(simState.perm));
    }
    if (simPermSub) {
      simPermSub.textContent = simState.perm
        ? "Fine-grained policy active"
        : "Access policy restricted";
    }
  }

  if (simCertToggle) {
    simCertToggle.addEventListener("click", () => {
      simState.cert = !simState.cert;
      evaluateSecureSIM(true);
    });
  }
  if (simPermToggle) {
    simPermToggle.addEventListener("click", () => {
      simState.perm = !simState.perm;
      evaluateSecureSIM(true);
    });
  }
  if (simRequestBtn) {
    simRequestBtn.addEventListener("click", () => {
      evaluateSecureSIM(true);
    });
  }

  // --------------------------------------------------------------------------
  // MINI-APP 3: GPT-Code-Learner — Playable Code Explorer with Sweep Highlight
  // --------------------------------------------------------------------------
  const codeQueries = {
    routing: {
      file: "router",
      lines: [
        { text: "def dispatch(req, tree):", hl: true },
        { text: "  match = tree.resolve(req.path)", hl: true },
        { text: "  ctx = gather_context(match.file)", hl: false },
        { text: "  return match.handler(req, ctx)", hl: true },
      ],
      answer:
        "<code>dispatch()</code> resolves the request path against the route tree, pulls matching repository context, and invokes the bound handler.",
    },
    auth: {
      file: "auth",
      lines: [
        { text: "def verify_session(headers, store):", hl: true },
        { text: "  token = parse_bearer(headers)", hl: true },
        { text: "  claims = store.validate(token)", hl: true },
        { text: "  return claims.principal", hl: false },
      ],
      answer:
        "<code>verify_session()</code> extracts the bearer token from incoming headers and checks it against the session store before returning the caller principal.",
    },
    context: {
      file: "context",
      lines: [
        { text: "def gather_context(repo, query):", hl: true },
        { text: "  hits = code_search(repo, query)", hl: true },
        { text: "  window = rank_snippets(hits)", hl: true },
        { text: "  return format_prompt(query, window)", hl: true },
      ],
      answer:
        "<code>gather_context()</code> searches the repository for symbols related to the question, ranks relevant code slices, and packs them into the GPT prompt.",
    },
  };

  const codePane = $("#code-pane");
  const codeLinesEl = $("#code-lines");
  const codeAnswerText = $("#code-answer-text");
  const promptChips = $$("[data-code-q]");
  const treeFiles = $$("[data-file]");

  function selectCodeQuery(key) {
    const spec = codeQueries[key];
    if (!spec) return;

    promptChips.forEach((chip) => {
      const active = chip.dataset.codeQ === key;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    treeFiles.forEach((fileBtn) => {
      fileBtn.classList.toggle("is-hit", fileBtn.dataset.file === spec.file);
    });

    if (codeLinesEl) {
      const codeEl = document.createElement("code");
      spec.lines.forEach((line, idx) => {
        const span = document.createElement("span");
        span.className = line.hl ? "cl is-hl" : "cl";
        span.dataset.line = String(idx + 1);
        span.textContent = line.text;
        codeEl.appendChild(span);
        if (idx < spec.lines.length - 1) codeEl.appendChild(document.createTextNode("\n"));
      });
      codeLinesEl.replaceChildren(codeEl);
    }

    if (codeAnswerText) {
      codeAnswerText.innerHTML = spec.answer;
    }

    if (codePane && !reducedMotion) {
      codePane.classList.remove("is-scanning");
      void codePane.offsetWidth;
      codePane.classList.add("is-scanning");
    }
  }

  promptChips.forEach((chip) => {
    chip.addEventListener("click", () => selectCodeQuery(chip.dataset.codeQ));
  });

  treeFiles.forEach((fileBtn) => {
    fileBtn.addEventListener("click", () => {
      const map = { router: "routing", auth: "auth", context: "context" };
      selectCodeQuery(map[fileBtn.dataset.file] || "routing");
    });
  });

  // --------------------------------------------------------------------------
  // MINI-APP 4: Sonica — Playable NB-IoT RF Frequency Tuner
  // --------------------------------------------------------------------------
  const sonicaCanvas = $("#sonica-canvas");
  const sonicaSlider = $("#sonica-slider");
  const sonicaMode = $("#sonica-mode");
  const sonicaFreq = $("#sonica-freq");

  const sonicaState = {
    pos: 50,
    phase: 0,
  };

  function updateSonicaLabels() {
    const v = sonicaState.pos;
    const band =
      v < 35 ? "GUARD-BAND" : v > 65 ? "IN-BAND" : "STAND-ALONE";
    if (sonicaMode) sonicaMode.textContent = `${band} · NARROWBAND LOCK`;
    if (sonicaFreq) sonicaFreq.textContent = `CH ${v} · NB-IoT`;
  }

  if (sonicaSlider) {
    sonicaSlider.addEventListener("input", () => {
      sonicaState.pos = Number(sonicaSlider.value);
      updateSonicaLabels();
      if (sonicaLoop && reducedMotion) sonicaLoop.drawOnce();
    });
  }
  updateSonicaLabels();

  const sonicaLoop = registerCanvasLoop(sonicaCanvas, (_now, dt) => {
    const { ctx, w, h } = syncCanvasSize(sonicaCanvas, 136);
    if (!ctx) return;

    sonicaState.phase += dt * 4.5;
    ctx.fillStyle = "#101829";
    ctx.fillRect(0, 0, w, h);

    // Spectrum grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 28; y < h; y += 28) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    for (let x = 44; x < w; x += 44) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    ctx.stroke();

    const centerNorm = sonicaState.pos / 100;
    const centerX = centerNorm * w;

    // Highlighted narrowband passband column
    const grad = ctx.createLinearGradient(centerX - 38, 0, centerX + 38, 0);
    grad.addColorStop(0, "rgba(0, 82, 255, 0)");
    grad.addColorStop(0.5, "rgba(59, 130, 246, 0.22)");
    grad.addColorStop(1, "rgba(0, 82, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(centerX - 38, 0, 76, h);

    // Subcarrier bars & narrowband RF envelope
    const baseY = h - 20;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const dist = (x - centerX) / w;
      const carrier = Math.exp(-(dist * dist) / 0.0028);
      const sideband =
        Math.exp(-((dist - 0.055) * (dist - 0.055)) / 0.0005) * 0.35 +
        Math.exp(-((dist + 0.055) * (dist + 0.055)) / 0.0005) * 0.35;
      const modulation =
        0.78 + 0.22 * Math.sin(x * 0.24 - sonicaState.phase * 1.8);
      const noise =
        Math.sin(x * 0.19 + sonicaState.phase * 2.1) * 3.5 +
        Math.cos(x * 0.43 - sonicaState.phase * 1.4) * 2.5;
      const amp = (carrier + sideband) * 78 * modulation;
      const y = Math.max(14, baseY - amp - Math.abs(noise));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary emerald subcarrier ticks inside the narrowband channel
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    for (let k = -3; k <= 3; k++) {
      const sx = centerX + k * 7;
      const pulse = 0.55 + 0.45 * Math.sin(sonicaState.phase * 2.4 + k * 0.9);
      const barH = (1 - Math.abs(k) * 0.14) * 46 * pulse;
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx, baseY - barH);
      ctx.stroke();
    }

    // Center tuner crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX, baseY);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // --------------------------------------------------------------------------
  // MINI-APP 5: Flora — Playable 4-Layer 3D Stack Switcher
  // --------------------------------------------------------------------------
  const floraTabs = $$(".flora-tab");
  const floraCards = $$("[data-layer-card]");

  function selectFloraLayer(index) {
    const idx = Number(index);
    floraTabs.forEach((tab) => {
      const active = Number(tab.dataset.layer) === idx;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    floraCards.forEach((card) => {
      const active = Number(card.dataset.layerCard) === idx;
      card.classList.toggle("is-selected", active);
    });
  }

  floraTabs.forEach((tab) => {
    tab.addEventListener("click", () => selectFloraLayer(tab.dataset.layer));
  });
  floraCards.forEach((card) => {
    card.addEventListener("click", () =>
      selectFloraLayer(card.dataset.layerCard)
    );
  });

  // --------------------------------------------------------------------------
  // MINI-APP 6: Mobile VR Latency — Playable Head-Motion Lag Comparator
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
          ? "PROACTIVE SCHEDULE · FRAME LOCKED TO MOTION"
          : "STANDARD LTE · TRAILING RENDER FRAME LAG";
    }
    if (vrStrategy) {
      vrStrategy.textContent =
        vrState.mode === "proactive"
          ? "App-layer inference · DRX wake · Proactive uplink"
          : "DRX doze wait · Reactive scheduling grant delay";
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

  if (vrSlider) {
    vrSlider.addEventListener("input", () => {
      vrState.auto = false;
      if (vrAutoBtn) {
        vrAutoBtn.classList.remove("is-active");
        vrAutoBtn.setAttribute("aria-pressed", "false");
      }
      vrState.target = Number(vrSlider.value);
      if (vrLoop && reducedMotion) {
        vrState.ghost =
          vrState.mode === "proactive"
            ? vrState.target - 2
            : Math.max(12, vrState.target - 18);
        vrLoop.drawOnce();
      }
    });
  }

  const vrLoop = registerCanvasLoop(vrCanvas, (_now, dt, isStatic) => {
    const { ctx, w, h } = syncCanvasSize(vrCanvas, 146);
    if (!ctx) return;

    const isProactive = vrState.mode === "proactive";
    if (!isStatic) {
      vrState.phase += dt * 2.25;
      if (vrState.auto) {
        vrState.target = 50 + Math.sin(vrState.phase) * 34;
        if (vrSlider) vrSlider.value = String(Math.round(vrState.target));
      }
      const followRate = isProactive ? 18 : 2.8;
      vrState.ghost +=
        (vrState.target - vrState.ghost) * Math.min(1, dt * followRate);
    } else if (reducedMotion) {
      vrState.target = 64;
      vrState.ghost = isProactive ? 61.5 : 42;
    }

    ctx.fillStyle = "#101829";
    ctx.fillRect(0, 0, w, h);

    // Horizon grid
    const trackY = h * 0.44;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, trackY);
    ctx.lineTo(w - 20, trackY);
    ctx.stroke();

    const targetX = (vrState.target / 100) * w;
    const ghostX = (vrState.ghost / 100) * w;
    const lagPx = Math.abs(targetX - ghostX);

    // Lag connector bridge
    if (lagPx > 3) {
      ctx.strokeStyle = isProactive
        ? "rgba(16, 185, 129, 0.55)"
        : "rgba(244, 63, 94, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ghostX, trackY);
      ctx.lineTo(targetX, trackY);
      ctx.stroke();
    }

    // Rendered Edge Frame (Ghost Frame)
    const boxW = 68;
    const boxH = 44;
    ctx.fillStyle = isProactive
      ? "rgba(16, 185, 129, 0.16)"
      : "rgba(244, 63, 94, 0.16)";
    ctx.strokeStyle = isProactive ? "#10b981" : "#f43f5e";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, ghostX - boxW / 2, trackY - boxH / 2, boxW, boxH, 9);
    ctx.fill();
    ctx.stroke();

    // Target Head Pose Reticle (Klein Blue)
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetX, trackY, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(targetX, trackY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = "#93c5fd";
    ctx.textAlign = "center";
    ctx.fillText("HEAD POSE", targetX, trackY - 28);
    ctx.fillStyle = isProactive ? "#6ee7b7" : "#fda4af";
    ctx.fillText(
      isProactive ? "EDGE FRAME (LOCKED)" : "EDGE FRAME (LAGGING)",
      ghostX,
      trackY + 38
    );

    // Bottom uplink scheduling slots
    const slotCount = 14;
    const slotW = 18;
    const totalW = slotCount * (slotW + 6);
    const startX = (w - totalW) / 2;
    const slotY = h - 22;
    const activeSlot = Math.floor((vrState.phase * 3) % slotCount);

    for (let i = 0; i < slotCount; i++) {
      const x = startX + i * (slotW + 6);
      const isLit = isProactive
        ? i === activeSlot || i === (activeSlot + 1) % slotCount
        : i === activeSlot && i % 3 === 0;
      ctx.fillStyle = isLit
        ? isProactive
          ? "#10b981"
          : "#f43f5e"
        : "rgba(148, 163, 184, 0.2)";
      drawRoundedRect(ctx, x, slotY, slotW, 8, 3);
      ctx.fill();
    }
    ctx.textAlign = "left";
  });

  // --------------------------------------------------------------------------
  // MINI-APP 7: Acemap — On-Demand 2,208-Topic Searchable Knowledge Explorer
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
    activeField: "all",
    query: "",
    hovered: -1,
    selected: -1,
    bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  };

  // Populate discipline pills immediately (clicking any pill triggers on-demand load if needed)
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
    const { ctx, w, h } = syncCanvasSize(acemapCanvas, 340);
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

    // Deterministic preview clusters before CSV load
    let s = 42;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < 160; i++) {
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
    const { ctx, w, h } = syncCanvasSize(acemapCanvas, 340);
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
    const pad = 22;
    const scale = Math.min(
      (w - pad * 2) / (maxX - minX),
      (h - pad * 2) / (maxY - minY)
    );
    const ox = (w - (maxX - minX) * scale) / 2;
    const oy = (h - (maxY - minY) * scale) / 2;

    let matchCount = 0;
    const topMatches = [];

    // Pass 1: dim non-matching nodes
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      pt.px = (pt.x - minX) * scale + ox;
      pt.py = (pt.y - minY) * scale + oy;
      pt.matched = isTopicMatch(pt);
      if (pt.matched) {
        matchCount++;
        if (topMatches.length < 18) topMatches.push(i);
      } else {
        ctx.fillStyle = "rgba(148, 163, 184, 0.16)";
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pass 2: active matching nodes
    for (let i = 0; i < acemapState.points.length; i++) {
      const pt = acemapState.points[i];
      if (!pt.matched) continue;
      ctx.fillStyle = acemapDisplayColors[pt.field];
      ctx.globalAlpha = acemapState.query ? 0.95 : 0.78;
      const r = acemapState.query
        ? Math.min(5.2, 2.8 + pt.size * 0.15)
        : Math.min(4.2, 1.9 + pt.size * 0.14);
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pass 3: hovered / selected ring highlight
    [acemapState.hovered, acemapState.selected].forEach((idx, rank) => {
      if (idx < 0 || !acemapState.points[idx]) return;
      const pt = acemapState.points[idx];
      const color = acemapDisplayColors[pt.field];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, rank === 1 ? 6 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "#0052ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, rank === 1 ? 10 : 8.5, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (acemapStatus) {
      const fieldLabel =
        acemapState.activeField === "all"
          ? "All 19 disciplines"
          : acemapFields[Number(acemapState.activeField)];
      const qLabel = acemapState.query ? ` · “${acemapState.query}”` : "";
      acemapStatus.textContent = `${fieldLabel}${qLabel} · ${matchCount.toLocaleString()} topics`;
    }

    // Render clickable quick matches when searching or filtering
    if (acemapMatches && acemapMatchList && acemapMatchesLabel) {
      if (acemapState.query || acemapState.activeField !== "all") {
        acemapMatches.hidden = false;
        acemapMatchesLabel.textContent = `Showing ${Math.min(
          topMatches.length,
          matchCount
        )} of ${matchCount.toLocaleString()} matches`;
        acemapMatchList.replaceChildren();
        topMatches.forEach((idx) => {
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
      acemapState.bounds = { minX, maxX, minY, maxY };
      acemapState.loaded = true;
      acemapState.loading = false;

      if (acemapOverlay) acemapOverlay.hidden = true;
      if (acemapLoadBtn) acemapLoadBtn.hidden = true;

      // Default inspect a prominent CS topic so inspector immediately feels alive
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
      if (!acemapState.loaded) {
        loadAcemapDataset();
      } else {
        renderAcemap();
      }
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
    // Sections
    {
      group: "Sections",
      title: "Bare Metal Rack & CME Fabric Console",
      sub: "Hero interactive hardware simulator",
      tag: "Hero",
      keywords: "hero rack bare metal cme oscilloscope",
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
      title: "Playable Micro-App Playground",
      sub: "7 interactive systems widgets",
      tag: "Section",
      keywords: "projects playground widgets apps",
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

    // Quick Hardware Actions
    {
      group: "Quick Actions",
      title: "Toggle Bare Metal Fabric Mode",
      sub: "Switch hero rack between Standard Cloud and CME Dedicated Fabric",
      tag: "Action",
      keywords: "toggle switch fabric cme standard rack",
      action: () => {
        jumpTo("#rack");
        setFabricMode(rackState.fabric === "cme" ? "standard" : "cme");
      },
    },
    {
      group: "Quick Actions",
      title: "Inject 5G Fault in SEED",
      sub: "Trigger live 5G drop and watch the SIM applet recover",
      tag: "Action",
      keywords: "seed fault inject 5g sim recovery",
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

    // 7 Playable Mini-Apps
    {
      group: "Mini-Apps",
      title: "SEED — 5G Fault Injector",
      sub: "Diagnosing and recovering from 5G failures through the SIM",
      tag: "SIGCOMM ’22",
      keywords: "seed 5g sim failure sigcomm",
      action: () => jumpTo("#seed"),
    },
    {
      group: "Mini-Apps",
      title: "SecureSIM — Access Control Dial",
      sub: "Authentication and fine-grained access control for SIM and eSIM",
      tag: "MobiCom ’21",
      keywords: "securesim sim esim auth cert security mobicom",
      action: () => jumpTo("#secureSIM"),
    },
    {
      group: "Mini-Apps",
      title: "GPT-Code-Learner — Code Explorer",
      sub: "Explore a codebase through questions, context, and GPT",
      tag: "GitHub",
      keywords: "gpt code learner llm codebase search github",
      action: () => jumpTo("#gptcodelearner"),
    },
    {
      group: "Mini-Apps",
      title: "Sonica — NB-IoT RF Tuner",
      sub: "An open NB-IoT network for experiments with real devices",
      tag: "GitHub",
      keywords: "sonica nbiot iot rf radio sdr",
      action: () => jumpTo("#sonica"),
    },
    {
      group: "Mini-Apps",
      title: "Flora — 4-Layer Mobile Stack",
      sub: "Software-defined mobile network spanning eSIM, radio, core, and edge",
      tag: "Testbed",
      keywords: "flora esim ran core edge vr lte",
      action: () => jumpTo("#flora"),
    },
    {
      group: "Mini-Apps",
      title: "Mobile VR Latency — Lag Comparator",
      sub: "Proactive LTE uplink scheduling for interactive mobile VR",
      tag: "NSDI ’21",
      keywords: "vr latency lte uplink nsdi mobile",
      action: () => jumpTo("#lrp"),
    },
    {
      group: "Mini-Apps",
      title: "Acemap — 2,208-Topic Knowledge Map",
      sub: "Academic knowledge graph across 19 disciplines",
      tag: "SJTU",
      keywords: "acemap knowledge graph topics sjtu",
      action: () => jumpTo("#acemap"),
    },
  ];

  // Dynamically index all 12 publications from semantic HTML
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

  // External links & version switchers
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
      title: "Redesign Gallery (All Versions)",
      sub: "../",
      tag: "Switch",
      keywords: "redesign versions gallery switcher",
      action: () => {
        window.location.href = "../";
      },
    },
    {
      group: "Links",
      title: "Original Production Site",
      sub: "../../",
      tag: "Switch",
      keywords: "original live site home",
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

  // Initial layout sync for all spring-sliding segmented switches
  requestAnimationFrame(syncAllSegments);
})();
