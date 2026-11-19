/* Architectural Monograph — Cinematic Museum Exhibition & 7 Kinetic Installations */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotion.matches;

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* Palette constants matching Warm Architectural Gallery */
  const PALETTE = {
    paper: "#f7f3eb",
    cream: "#faf7f2",
    ink: "#1d1b18",
    muted: "#665f56",
    border: "#ded7cb",
    borderStrong: "#c8bfb0",
    teal: "#1f5452",
    tealBright: "#2c7572",
    bronze: "#9c5a3c",
    gold: "#c2884f",
  };

  /* ============================================================
     1. HERO CURTAIN / MASK-REVEAL & AMBIENT LIGHT SHIFT
     ============================================================ */
  if (motionEnabled) {
    document.body.classList.add("hero-arming");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("hero-arming");
      });
    });
  }

  const heroEl = $("#hero");
  const orbWarm = $("#orb-warm");
  const orbTeal = $("#orb-teal");
  if (heroEl && orbWarm && orbTeal && finePointer.matches) {
    heroEl.addEventListener(
      "pointermove",
      (event) => {
        if (!motionEnabled) return;
        const rect = heroEl.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const ny = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        orbWarm.style.transform = `translate3d(${(nx * -34).toFixed(1)}px, ${(ny * -24).toFixed(1)}px, 0)`;
        orbTeal.style.transform = `translate3d(${(nx * 28).toFixed(1)}px, ${(ny * 20).toFixed(1)}px, 0)`;
      },
      { passive: true },
    );
  }

  /* ============================================================
     2. CUSTOM EDITORIAL CURSOR LENS & MAGNETIC CTAS (FINE POINTER)
     ============================================================ */
  const cursorEl = $("#editorial-cursor");
  const cursorLabel = $("#cursor-label");

  if (cursorEl && cursorLabel && finePointer.matches) {
    let cx = -100;
    let cy = -100;
    let tx = -100;
    let ty = -100;
    let rafId = 0;

    function tickCursor() {
      rafId = 0;
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursorEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - cx) > 0.35 || Math.abs(ty - cy) > 0.35) {
        rafId = requestAnimationFrame(tickCursor);
      }
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!motionEnabled) return;
        tx = event.clientX;
        ty = event.clientY;
        if (!cursorEl.classList.contains("is-visible")) {
          cx = tx;
          cy = ty;
          cursorEl.classList.add("is-visible");
        }
        if (!rafId) rafId = requestAnimationFrame(tickCursor);
      },
      { passive: true },
    );

    document.addEventListener("pointerleave", () => {
      cursorEl.classList.remove("is-visible", "has-label");
    });

    document.addEventListener(
      "pointerover",
      (event) => {
        if (!motionEnabled) return;
        const target = event.target.closest("[data-cursor]");
        if (target) {
          const text = target.getAttribute("data-cursor") || "";
          cursorLabel.textContent = text;
          cursorEl.classList.toggle("has-label", Boolean(text));
        } else {
          cursorEl.classList.remove("has-label");
        }
      },
      { passive: true },
    );

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (event) => {
        if (!motionEnabled) return;
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.16;
        const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.16;
        el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ============================================================
     3. SCROLL CHOREOGRAPHY, READING PROGRESS & REVEALS
     ============================================================ */
  const header = $("#site-header");
  const heroPlate = $("#hero-plate");
  const heroPortraitImg = $("#hero-portrait-img");
  const progressBar = $("#reading-progress-bar");
  const navLinks = $$(".primary-nav a");
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    const docHeight = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const progress = Math.min(1, Math.max(0, y / docHeight));

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
    }

    let activeId = "";
    navSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.35) {
        activeId = section.id;
      }
    });
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#" + activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (heroPlate) {
      if (motionEnabled && y < window.innerHeight * 1.15) {
        const offset = Math.min(y * 0.055, 34);
        heroPlate.style.transform = `translateY(${offset.toFixed(1)}px)`;
        if (heroPortraitImg) {
          const scale = 1 + Math.min(y * 0.00012, 0.06);
          heroPortraitImg.style.transform = `scale(${scale.toFixed(4)})`;
        }
      } else {
        heroPlate.style.transform = "";
        if (heroPortraitImg) heroPortraitImg.style.transform = "";
      }
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );

  if ("IntersectionObserver" in window && motionEnabled) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.remove("is-pending");
          revealObserver.unobserve(target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );

    $$(".reveal").forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.96) {
        el.classList.add("is-pending");
      }
      revealObserver.observe(el);
    });
  }

  /* ============================================================
     4. INTERACTIVE GCE BARE METAL ISOMETRIC ELEVATION
     ============================================================ */
  const computePlate = $("#compute-plate");
  const computeLayerLabel = $("#compute-layer-label");
  const pillarButtons = $$("[data-stack-layer]");
  let lockedLayer = "all";

  function applyStackLayer(layer, labelText) {
    if (!computePlate) return;
    computePlate.dataset.activeLayer = layer;
    if (computeLayerLabel) {
      computeLayerLabel.textContent = labelText || "FULL STACK";
    }
    pillarButtons.forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.stackLayer === layer);
    });
  }

  pillarButtons.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      applyStackLayer(btn.dataset.stackLayer, btn.dataset.layerLabel);
    });
    btn.addEventListener("mouseleave", () => {
      const lockedBtn = pillarButtons.find((b) => b.dataset.stackLayer === lockedLayer);
      applyStackLayer(
        lockedLayer,
        lockedBtn ? lockedBtn.dataset.layerLabel : "FULL STACK",
      );
    });
    btn.addEventListener("click", () => {
      if (lockedLayer === btn.dataset.stackLayer) {
        lockedLayer = "all";
        applyStackLayer("all", "FULL STACK");
      } else {
        lockedLayer = btn.dataset.stackLayer;
        applyStackLayer(lockedLayer, btn.dataset.layerLabel);
      }
    });
  });

  /* ============================================================
     5. INTERACTIVE 7-ROOM MUSEUM GALLERY TRACK
     ============================================================ */
  const roomIds = [
    "seed",
    "secureSIM",
    "gptcodelearner",
    "sonica",
    "flora",
    "lrp",
    "acemap",
  ];
  const roomTabs = $$(".room-tab");
  const galleryRooms = $$(".gallery-room");
  const galleryViewport = $("#gallery-viewport");
  const galleryTrack = $("#gallery-track");
  const roomTabsBar = $("#room-tabs");
  const roomPager = $("#room-pager");
  const roomPrev = $("#room-prev");
  const roomNext = $("#room-next");
  const roomCounter = $("#room-counter");
  const roomProgressFill = $("#room-progress-fill");
  const viewToggleButtons = $$("[data-view]");

  let activeRoom = 0;
  let exhibitionInView = true;
  let syncInstallations = () => {};

  function setActiveRoom(index, focusTab = false) {
    const wrapped = (index + roomIds.length) % roomIds.length;
    activeRoom = wrapped;

    if (galleryTrack && galleryViewport && galleryViewport.dataset.mode === "gallery") {
      galleryTrack.style.transform = `translate3d(-${wrapped * 100}%, 0, 0)`;
    }

    roomTabs.forEach((tab, i) => {
      const selected = i === wrapped;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && focusTab) tab.focus();
    });

    galleryRooms.forEach((room, i) => {
      room.classList.toggle("is-active", i === wrapped);
    });

    if (roomCounter) {
      roomCounter.textContent = `ROOM 0${wrapped + 1} / 0${roomIds.length}`;
    }
    if (roomProgressFill) {
      roomProgressFill.style.width = `${(((wrapped + 1) / roomIds.length) * 100).toFixed(2)}%`;
    }

    syncInstallations();
  }

  roomTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setActiveRoom(index));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveRoom(index + 1, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveRoom(index - 1, true);
      }
    });
  });

  if (roomPrev) {
    roomPrev.addEventListener("click", () => setActiveRoom(activeRoom - 1));
  }
  if (roomNext) {
    roomNext.addEventListener("click", () => setActiveRoom(activeRoom + 1));
  }

  if (galleryViewport && galleryTrack) {
    let dragging = false;
    let startX = 0;
    let deltaX = 0;

    galleryViewport.addEventListener("pointerdown", (event) => {
      if (galleryViewport.dataset.mode !== "gallery") return;
      if (event.target.closest("button, a, select, canvas, #topic-map")) return;
      dragging = true;
      startX = event.clientX;
      deltaX = 0;
      galleryViewport.classList.add("is-dragging");
    });

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!dragging) return;
        deltaX = event.clientX - startX;
        const pct = (deltaX / Math.max(1, galleryViewport.clientWidth)) * 100;
        galleryTrack.style.transform = `translate3d(${(-activeRoom * 100 + pct).toFixed(2)}%, 0, 0)`;
      },
      { passive: true },
    );

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      galleryViewport.classList.remove("is-dragging");
      if (deltaX < -55) setActiveRoom(activeRoom + 1);
      else if (deltaX > 55) setActiveRoom(activeRoom - 1);
      else setActiveRoom(activeRoom);
      deltaX = 0;
    };

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  function setViewMode(mode) {
    if (!galleryViewport) return;
    galleryViewport.dataset.mode = mode;
    const isGallery = mode === "gallery";
    if (roomTabsBar) roomTabsBar.hidden = !isGallery;
    if (roomPager) roomPager.hidden = !isGallery;

    if (isGallery && galleryTrack) {
      galleryTrack.style.transform = `translate3d(-${activeRoom * 100}%, 0, 0)`;
    }

    viewToggleButtons.forEach((btn) => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    syncInstallations();
  }

  viewToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => setViewMode(btn.dataset.view));
  });

  /* ============================================================
     6. SIX BESPOKE KINETIC CANVAS INSTALLATIONS (ROOMS I–VI)
     ============================================================ */
  const W = 600;
  const H = 360;

  function setupCanvas(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawArchitecturalGrid(ctx) {
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(200, 191, 176, 0.35)";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.rect(14, 14, W - 28, H - 28);
    ctx.moveTo(W / 2, 14);
    ctx.lineTo(W / 2, 24);
    ctx.moveTo(W / 2, H - 14);
    ctx.lineTo(W / 2, H - 24);
    ctx.moveTo(14, H / 2);
    ctx.lineTo(24, H / 2);
    ctx.moveTo(W - 14, H / 2);
    ctx.lineTo(W - 24, H / 2);
    ctx.stroke();
  }

  /* --- ROOM I: SEED — Concentric 5G Fault & Self-Healing Observatory --- */
  function createSeedInstallation() {
    const canvas = $("#canvas-seed");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#seed-state");
    const btn = $("#seed-fault-btn");

    let phase = "harmonic"; // harmonic | fault | diagnose | heal
    let phaseTime = 0;
    let faultAngle = -0.65;
    let autoTimer = 3.5;

    function setPhase(next, label, isBronze = false) {
      phase = next;
      phaseTime = 0;
      if (stateEl) {
        stateEl.textContent = label;
        stateEl.classList.toggle("is-bronze", isBronze);
      }
    }

    function triggerFault() {
      faultAngle = -Math.PI * 0.75 + Math.random() * Math.PI * 1.5;
      autoTimer = 10;
      setPhase("fault", "FAULT DETECTED", true);
    }

    if (btn) btn.addEventListener("click", triggerFault);
    canvas.addEventListener("click", triggerFault);

    return {
      roomIndex: 0,
      draw(t, dt) {
        phaseTime += dt;
        if (motionEnabled) {
          if (phase === "harmonic") {
            autoTimer -= dt;
            if (autoTimer <= 0) triggerFault();
          } else if (phase === "fault" && phaseTime > 1.35) {
            setPhase("diagnose", "SIM + CORE DIAGNOSIS", true);
          } else if (phase === "diagnose" && phaseTime > 1.85) {
            setPhase("heal", "RECOVERING", false);
          } else if (phase === "heal" && phaseTime > 1.35) {
            setPhase("harmonic", "HARMONIC", false);
            autoTimer = 7.5;
          }
        }

        drawArchitecturalGrid(ctx);
        const cx = W / 2;
        const cy = H / 2;

        // Outer compass ticks
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(102, 95, 86, 0.3)";
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const r1 = i % 4 === 0 ? 142 : 146;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * 150, Math.sin(a) * 150);
          ctx.stroke();
        }

        // Fault intensity curve
        let fracture = 0;
        if (phase === "fault") fracture = Math.min(1, phaseTime * 2.4);
        else if (phase === "diagnose") fracture = 1 - phaseTime * 0.25;
        else if (phase === "heal") fracture = Math.max(0, 1 - phaseTime / 1.1);

        // 5 Concentric Harmonic Signal Rings
        const radii = [48, 72, 96, 118, 136];
        radii.forEach((baseR, idx) => {
          const isOuter = idx >= 2;
          const ringFracture = isOuter ? fracture : fracture * 0.25;
          ctx.beginPath();
          const steps = 120;
          for (let s = 0; s <= steps; s++) {
            const a = (s / steps) * Math.PI * 2;
            const angDiff = Math.atan2(Math.sin(a - faultAngle), Math.cos(a - faultAngle));
            const locality = Math.exp(-(angDiff * angDiff) / 0.28);
            const breathe = Math.sin(t * 1.4 - idx * 0.6) * 1.6;
            const jitter =
              ringFracture *
              locality *
              (Math.sin(a * 14 + t * 10) * 9.5 + Math.cos(a * 7 - t * 6) * 5.5);
            const r = baseR + breathe + jitter;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle =
            ringFracture > 0.35 && isOuter
              ? `rgba(156, 90, 60, ${0.45 + idx * 0.1})`
              : `rgba(31, 84, 82, ${0.28 + idx * 0.12})`;
          ctx.lineWidth = idx === 3 ? 1.8 : 1.15;
          ctx.stroke();
        });

        // Diagnostic radar sweep from SIM core
        if (phase === "diagnose") {
          const sweepA = faultAngle - 1.1 + phaseTime * 2.2;
          const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 144);
          grad.addColorStop(0, "rgba(194, 136, 79, 0.34)");
          grad.addColorStop(1, "rgba(194, 136, 79, 0.02)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 144, sweepA - 0.55, sweepA);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = PALETTE.bronze;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(sweepA) * 144, Math.sin(sweepA) * 144);
          ctx.stroke();
        }

        // Healing teal restoration wave
        if (phase === "heal") {
          const hr = 24 + (phaseTime / 1.35) * 130;
          ctx.strokeStyle = `rgba(31, 84, 82, ${Math.max(0, 1 - phaseTime / 1.35)})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, hr, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Orbiting 5G signal nodes
        for (let k = 0; k < 3; k++) {
          const orbitR = radii[k + 1];
          const a = t * (0.45 - k * 0.08) + k * 2.1;
          ctx.fillStyle = k === 1 && fracture > 0.3 ? PALETTE.bronze : PALETTE.teal;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Central SIM brass/cream core medallion
        ctx.fillStyle = PALETTE.cream;
        ctx.strokeStyle = fracture > 0.35 ? PALETTE.bronze : PALETTE.ink;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = PALETTE.ink;
        ctx.font = '600 9.5px "DM Sans", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SIM", 0, -4);
        ctx.fillStyle = PALETTE.bronze;
        ctx.font = '600 8px "DM Sans", sans-serif';
        ctx.fillText("SEED", 0, 8);
        ctx.restore();

        // Corner labels
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("5G SIGNAL HARMONICS", 26, 32);
        ctx.textAlign = "right";
        ctx.fillText("SIM-CORE RECOVERY", W - 26, H - 24);
      },
    };
  }

  /* --- ROOM II: SecureSIM — Rotating Astrolabe / Architectural Vault Lock --- */
  function createSecureSimInstallation() {
    const canvas = $("#canvas-securesim");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#securesim-state");
    const verifyBtn = $("#securesim-verify-btn");
    const denyBtn = $("#securesim-deny-btn");

    let mode = "verify"; // verify | deny
    let modeTime = 0;
    const rings = [
      { r: 124, angle: 0.9, target: 0, vel: 0, label: "CERT", gap: 0.28 },
      { r: 88, angle: -1.4, target: 0, vel: 0, label: "POLICY", gap: 0.32 },
      { r: 54, angle: 1.8, target: 0, vel: 0, label: "ACL", gap: 0.36 },
    ];

    function setMode(next) {
      mode = next;
      modeTime = 0;
      if (next === "verify") {
        rings[0].target = 0;
        rings[1].target = 0;
        rings[2].target = 0;
        if (stateEl) {
          stateEl.textContent = "AUTHORIZED";
          stateEl.classList.remove("is-bronze");
        }
      } else {
        rings[0].target = 0;
        rings[1].target = 1.65;
        rings[2].target = -1.2;
        if (stateEl) {
          stateEl.textContent = "ACCESS DENIED";
          stateEl.classList.add("is-bronze");
        }
      }
    }

    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => {
        rings[0].angle += 1.4;
        rings[1].angle -= 1.8;
        rings[2].angle += 1.1;
        setMode("verify");
      });
    }
    if (denyBtn) {
      denyBtn.addEventListener("click", () => setMode("deny"));
    }
    canvas.addEventListener("click", () => {
      setMode(mode === "verify" ? "deny" : "verify");
    });

    setMode("verify");

    return {
      roomIndex: 1,
      draw(t, dt) {
        modeTime += dt;
        drawArchitecturalGrid(ctx);
        const cx = W / 2 + 24;
        const cy = H / 2;

        // Spring physics for the 3 astrolabe dials
        rings.forEach((ring, idx) => {
          if (!motionEnabled) {
            ring.angle = ring.target;
            return;
          }
          const k = 28 - idx * 4;
          const damp = 6.2;
          const accel = (ring.target - ring.angle) * k - ring.vel * damp;
          ring.vel += accel * dt;
          ring.angle += ring.vel * dt;
        });

        const aligned =
          mode === "verify" &&
          Math.abs(rings[0].angle) < 0.08 &&
          Math.abs(rings[1].angle) < 0.08 &&
          Math.abs(rings[2].angle) < 0.08;

        // Engraved horizontal axis guide
        ctx.strokeStyle = "rgba(102, 95, 86, 0.25)";
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(40, cy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw 3 concentric astrolabe dial rings with precision apertures on the left (PI)
        rings.forEach((ring, idx) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ring.angle);

          // Main engraved arc with gap at PI (left side)
          const halfGap = ring.gap / 2;
          ctx.strokeStyle = idx === 1 && mode === "deny" ? PALETTE.bronze : PALETTE.ink;
          ctx.lineWidth = idx === 0 ? 2 : 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, ring.r, Math.PI + halfGap, Math.PI * 3 - halfGap);
          ctx.stroke();

          // Inner hairline groove
          ctx.strokeStyle = "rgba(156, 90, 60, 0.45)";
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.arc(0, 0, ring.r - 6, Math.PI + halfGap, Math.PI * 3 - halfGap);
          ctx.stroke();

          // Precision degree ticks
          const tickCount = 24 - idx * 4;
          ctx.strokeStyle = "rgba(102, 95, 86, 0.42)";
          for (let i = 0; i < tickCount; i++) {
            const a = (i / tickCount) * Math.PI * 2;
            const d = Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI)));
            if (d < halfGap + 0.08) continue;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (ring.r - 4), Math.sin(a) * (ring.r - 4));
            ctx.lineTo(Math.cos(a) * (ring.r + 4), Math.sin(a) * (ring.r + 4));
            ctx.stroke();
          }

          // Aperture brackets
          ctx.fillStyle = PALETTE.teal;
          [Math.PI - halfGap, Math.PI + halfGap].forEach((a) => {
            ctx.beginPath();
            ctx.arc(Math.cos(a) * ring.r, Math.sin(a) * ring.r, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
        });

        // Authorized teal beam OR Denied bronze deflection
        if (aligned) {
          const beamProgress = Math.min(1, Math.max(0.25, (modeTime - 0.35) * 1.4));
          const xStart = 58;
          const xEnd = xStart + (cx - 26 - xStart) * beamProgress;
          const grad = ctx.createLinearGradient(xStart, cy, cx, cy);
          grad.addColorStop(0, "rgba(31, 84, 82, 0.25)");
          grad.addColorStop(1, PALETTE.teal);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(xStart, cy);
          ctx.lineTo(xEnd, cy);
          ctx.stroke();

          // Gliding auth pulse
          const px = xStart + ((t * 140) % (cx - 28 - xStart));
          ctx.fillStyle = PALETTE.teal;
          ctx.beginPath();
          ctx.arc(px, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (mode === "deny") {
          const hitX = cx - rings[1].r - 2;
          const pulse = (t * 1.35) % 1;
          const px = 58 + (hitX - 58) * Math.min(1, pulse * 1.5);
          ctx.strokeStyle = PALETTE.bronze;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(58, cy);
          ctx.lineTo(px, cy);
          ctx.stroke();

          if (pulse > 0.62) {
            const r = (pulse - 0.62) * 85;
            ctx.strokeStyle = `rgba(156, 90, 60, ${Math.max(0, 1 - (pulse - 0.62) * 2.6)})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(hitX, cy, r, Math.PI * 0.65, Math.PI * 1.35);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hitX, cy);
            ctx.lineTo(hitX - r * 0.85, cy - r * 0.65);
            ctx.moveTo(hitX, cy);
            ctx.lineTo(hitX - r * 0.85, cy + r * 0.65);
            ctx.stroke();
          }
        }

        // Inner SIM Core
        ctx.fillStyle = aligned ? PALETTE.teal : PALETTE.cream;
        ctx.strokeStyle = aligned ? PALETTE.teal : PALETTE.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = aligned ? PALETTE.cream : PALETTE.ink;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SIM", cx, cy - 3);
        ctx.font = '500 7.5px "DM Sans", sans-serif';
        ctx.fillText("CORE", cx, cy + 7);

        // Request source node on the left
        ctx.fillStyle = PALETTE.cream;
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(58, cy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.ink;
        ctx.font = '600 8px "DM Sans", sans-serif';
        ctx.fillText("REQ", 58, cy + 0.5);

        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("CERT · POLICY · ACL DIALS", 26, 32);
      },
    };
  }

  /* --- ROOM III: GPT-Code-Learner — 2.5D Typographic Code-Constellation --- */
  function createGptInstallation() {
    const canvas = $("#canvas-gpt");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#gpt-state");
    const modeBtns = $$("[data-gpt-mode]");

    let activeMode = "search"; // search | explain
    let ptrX = 0;
    let ptrY = 0;
    let curX = 0;
    let curY = 0;

    const nodes = [
      { id: 0, label: "repo/", x: 108, y: 112, z: 0.4, group: "search" },
      { id: 1, label: "src/parser", x: 205, y: 78, z: 0.85, group: "search" },
      { id: 2, label: "src/index", x: 185, y: 204, z: 0.6, group: "search" },
      { id: 3, label: "docs/arch", x: 118, y: 268, z: 0.3, group: "search" },
      { id: 4, label: "context.py", x: 318, y: 152, z: 1.0, group: "both" },
      { id: 5, label: "search()", x: 298, y: 266, z: 0.7, group: "search" },
      { id: 6, label: "prompt.ts", x: 432, y: 108, z: 0.8, group: "explain" },
      { id: 7, label: "GPT", x: 486, y: 205, z: 1.0, group: "explain" },
      { id: 8, label: "explain()", x: 422, y: 282, z: 0.55, group: "explain" },
    ];

    const edges = [
      [0, 1, "search"],
      [0, 2, "search"],
      [2, 3, "search"],
      [1, 4, "search"],
      [2, 4, "search"],
      [2, 5, "search"],
      [5, 4, "search"],
      [4, 6, "explain"],
      [4, 7, "explain"],
      [6, 7, "explain"],
      [7, 8, "explain"],
      [5, 8, "explain"],
    ];

    function setGptMode(m) {
      activeMode = m;
      modeBtns.forEach((b) => {
        const on = b.dataset.gptMode === m;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (stateEl) {
        stateEl.textContent = m === "search" ? "SEARCH SUBGRAPH" : "EXPLAIN FLOW";
        stateEl.classList.toggle("is-bronze", m === "search");
      }
    }

    modeBtns.forEach((b) => {
      b.addEventListener("click", () => setGptMode(b.dataset.gptMode));
    });

    canvas.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        ptrX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        ptrY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      },
      { passive: true },
    );
    canvas.addEventListener("pointerleave", () => {
      ptrX = 0;
      ptrY = 0;
    });

    return {
      roomIndex: 2,
      draw(t, dt) {
        curX += (ptrX - curX) * Math.min(1, dt * 5);
        curY += (ptrY - curY) * Math.min(1, dt * 5);

        drawArchitecturalGrid(ctx);

        const pos = nodes.map((n, i) => {
          const driftX = motionEnabled ? Math.sin(t * 0.7 + i * 1.1) * 4 * n.z : 0;
          const driftY = motionEnabled ? Math.cos(t * 0.6 + i * 0.9) * 4 * n.z : 0;
          return {
            x: n.x + curX * 22 * n.z + driftX,
            y: n.y + curY * 14 * n.z + driftY,
            node: n,
          };
        });

        // Draw constellation edges & traveling luminous threads
        edges.forEach(([a, b, kind], idx) => {
          const p1 = pos[a];
          const p2 = pos[b];
          const isActive = kind === activeMode;
          ctx.strokeStyle = isActive
            ? activeMode === "search"
              ? "rgba(156, 90, 60, 0.55)"
              : "rgba(31, 84, 82, 0.6)"
            : "rgba(102, 95, 86, 0.18)";
          ctx.lineWidth = isActive ? 1.5 : 0.9;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          if (isActive && motionEnabled) {
            const u = (t * 0.55 + idx * 0.19) % 1;
            const px = p1.x + (p2.x - p1.x) * u;
            const py = p1.y + (p2.y - p1.y) * u;
            ctx.fillStyle = activeMode === "search" ? PALETTE.bronze : PALETTE.teal;
            ctx.beginPath();
            ctx.arc(px, py, 3.1, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Draw architectural typographic node plaques
        pos.forEach(({ x, y, node }) => {
          const lit = node.group === activeMode || node.group === "both";
          ctx.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace';
          const tw = ctx.measureText(node.label).width;
          const pw = tw + 20;
          const ph = 26;

          ctx.fillStyle = lit ? PALETTE.cream : "rgba(250, 247, 242, 0.65)";
          ctx.strokeStyle = lit
            ? activeMode === "search"
              ? PALETTE.bronze
              : PALETTE.teal
            : PALETTE.borderStrong;
          ctx.lineWidth = lit ? 1.4 : 0.9;
          ctx.beginPath();
          ctx.rect(x - pw / 2, y - ph / 2, pw, ph);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lit ? PALETTE.ink : PALETTE.muted;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(node.label, x, y + 0.5);
        });

        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("REPOSITORY CONTEXT GRAPH", 26, 32);
      },
    };
  }

  /* --- ROOM IV: Sonica — Topographic Narrowband RF Wave Sculpture --- */
  function createSonicaInstallation() {
    const canvas = $("#canvas-sonica");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#sonica-state");
    const chBtns = $$("[data-sonica-ch]");

    const channels = [
      { name: "CH · UPLINK", x: 185 },
      { name: "CH · CONTROL", x: 315 },
      { name: "CH · DOWNLINK", x: 445 },
    ];
    let targetTuneX = channels[0].x;
    let tuneX = channels[0].x;
    const packets = [];

    function firePacket(xPos) {
      packets.push({ x: xPos, radius: 6, life: 1 });
    }

    function selectChannel(idx) {
      const ch = channels[idx] || channels[0];
      targetTuneX = ch.x;
      firePacket(ch.x);
      chBtns.forEach((b) => {
        const on = Number(b.dataset.sonicaCh) === idx;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (stateEl) stateEl.textContent = ch.name;
    }

    chBtns.forEach((b) => {
      b.addEventListener("click", () => selectChannel(Number(b.dataset.sonicaCh)));
    });

    canvas.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * W;
        targetTuneX = Math.max(48, Math.min(W - 48, x));
      },
      { passive: true },
    );

    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * W;
      targetTuneX = Math.max(48, Math.min(W - 48, x));
      firePacket(targetTuneX);
    });

    return {
      roomIndex: 3,
      draw(t, dt) {
        tuneX += (targetTuneX - tuneX) * Math.min(1, dt * 8);
        drawArchitecturalGrid(ctx);

        // Vertical narrowband tuning reticle
        ctx.strokeStyle = "rgba(156, 90, 60, 0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(tuneX, 24);
        ctx.lineTo(tuneX, H - 24);
        ctx.stroke();
        ctx.setLineDash([]);

        // 9 Braun-inspired topographic narrowband RF ribbons
        const ribbonCount = 9;
        for (let r = 0; r < ribbonCount; r++) {
          const baseY = 74 + r * 28;
          ctx.beginPath();
          for (let x = 28; x <= W - 28; x += 4) {
            const dist = (x - tuneX) / 56;
            const resonance = Math.exp(-(dist * dist));
            const carrier =
              Math.sin(x * 0.032 + t * (1.8 + r * 0.14) + r * 0.7) * (5 + resonance * 18);
            const harmonic =
              Math.cos(x * 0.075 - t * 2.6 + r) * (2.2 + resonance * 8);
            const y = baseY + carrier + harmonic;
            if (x === 28) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          if (r === 4) {
            ctx.strokeStyle = PALETTE.teal;
            ctx.lineWidth = 2.1;
          } else if (r === 2 || r === 6) {
            ctx.strokeStyle = PALETTE.bronze;
            ctx.lineWidth = 1.35;
          } else {
            ctx.strokeStyle = `rgba(29, 27, 24, ${0.18 + (r % 3) * 0.1})`;
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        }

        // Traveling narrowband packet crests
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.radius += dt * 150;
          p.life -= dt * 0.85;
          if (p.life <= 0) {
            packets.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(31, 84, 82, ${p.life * 0.75})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(p.x, H / 2, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Subtle autonomous packet pulse
        if (motionEnabled && Math.floor(t * 0.5) !== Math.floor((t - dt) * 0.5)) {
          if (packets.length < 2) firePacket(tuneX);
        }

        // Reticle badge
        ctx.fillStyle = PALETTE.bronze;
        ctx.beginPath();
        ctx.arc(tuneX, 42, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("NB-IoT SPECTRUM · OTA", 26, 32);
      },
    };
  }

  /* --- ROOM V: Flora — 3D-Projected Architectural Plane Stack --- */
  function createFloraInstallation() {
    const canvas = $("#canvas-flora");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#flora-state");
    const layerBtns = $$("[data-flora-layer]");

    const layerMeta = [
      { name: "01 · eSIM", color: PALETTE.bronze },
      { name: "02 · RAN", color: PALETTE.ink },
      { name: "03 · CORE", color: PALETTE.teal },
      { name: "04 · EDGE VR", color: PALETTE.tealBright },
    ];

    let selectedLayer = -1; // -1 = all
    let ptrX = 0;
    let ptrY = 0;
    let yaw = 0.62;
    let pitch = 0.54;

    function setFloraLayer(idx) {
      selectedLayer = idx;
      layerBtns.forEach((b) => {
        const on = Number(b.dataset.floraLayer) === idx;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (stateEl) {
        stateEl.textContent = idx < 0 ? "ALL 4 PLANES" : layerMeta[idx].name;
      }
    }

    layerBtns.forEach((b) => {
      b.addEventListener("click", () => setFloraLayer(Number(b.dataset.floraLayer)));
    });

    canvas.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        ptrX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        ptrY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      },
      { passive: true },
    );
    canvas.addEventListener("pointerleave", () => {
      ptrX = 0;
      ptrY = 0;
    });

    function project3D(x, y, z, curYaw, curPitch) {
      const cy = Math.cos(curYaw);
      const sy = Math.sin(curYaw);
      const cp = Math.cos(curPitch);
      const sp = Math.sin(curPitch);

      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;

      const fov = 560;
      const scale = fov / (fov + z2 + 220);
      return {
        sx: W / 2 + x1 * scale,
        sy: H / 2 + y2 * scale,
        scale,
      };
    }

    return {
      roomIndex: 4,
      draw(t, dt) {
        const targetYaw = 0.62 + ptrX * 0.35 + (motionEnabled ? Math.sin(t * 0.45) * 0.08 : 0);
        const targetPitch = 0.52 + ptrY * 0.22;
        yaw += (targetYaw - yaw) * Math.min(1, dt * 6);
        pitch += (targetPitch - pitch) * Math.min(1, dt * 6);

        drawArchitecturalGrid(ctx);

        const planeW = 128;
        const planeD = 88;
        const baseSpacing = selectedLayer >= 0 ? 52 : 42;

        // Draw from bottom (0) to top (3)
        const anchors = [];
        for (let i = 0; i < 4; i++) {
          const isSel = selectedLayer === i;
          const dimmed = selectedLayer >= 0 && !isSel;
          const elevOffset = isSel ? -14 : 0;
          const yPos = 68 - i * baseSpacing + elevOffset;
          const corners = [
            project3D(-planeW, yPos, -planeD, yaw, pitch),
            project3D(planeW, yPos, -planeD, yaw, pitch),
            project3D(planeW, yPos, planeD, yaw, pitch),
            project3D(-planeW, yPos, planeD, yaw, pitch),
          ];
          const center = project3D(0, yPos, 0, yaw, pitch);
          anchors.push(center);

          ctx.beginPath();
          ctx.moveTo(corners[0].sx, corners[0].sy);
          for (let c = 1; c < 4; c++) ctx.lineTo(corners[c].sx, corners[c].sy);
          ctx.closePath();

          ctx.fillStyle = isSel
            ? "rgba(31, 84, 82, 0.14)"
            : dimmed
              ? "rgba(250, 247, 242, 0.45)"
              : "rgba(250, 247, 242, 0.82)";
          ctx.fill();

          ctx.strokeStyle = isSel
            ? PALETTE.teal
            : dimmed
              ? "rgba(102, 95, 86, 0.25)"
              : layerMeta[i].color;
          ctx.lineWidth = isSel ? 2 : 1.15;
          ctx.stroke();

          // Architectural cross-grid on each plane
          const m1 = project3D(0, yPos, -planeD, yaw, pitch);
          const m2 = project3D(0, yPos, planeD, yaw, pitch);
          const m3 = project3D(-planeW, yPos, 0, yaw, pitch);
          const m4 = project3D(planeW, yPos, 0, yaw, pitch);
          ctx.strokeStyle = dimmed ? "rgba(102, 95, 86, 0.1)" : "rgba(102, 95, 86, 0.22)";
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(m1.sx, m1.sy);
          ctx.lineTo(m2.sx, m2.sy);
          ctx.moveTo(m3.sx, m3.sy);
          ctx.lineTo(m4.sx, m4.sy);
          ctx.stroke();

          // Plane architectural label on right corner
          ctx.fillStyle = dimmed ? "rgba(102, 95, 86, 0.4)" : PALETTE.ink;
          ctx.font = '600 9.5px "DM Sans", sans-serif';
          ctx.textAlign = "left";
          ctx.fillText(layerMeta[i].name, corners[1].sx + 10, corners[1].sy + 3);
        }

        // Curved Bezier light filaments & gliding particles connecting the 4 layers
        for (let f = 0; f < 3; f++) {
          const p0 = anchors[0];
          const p3 = anchors[3];
          const bend = (f - 1) * 56;
          const cp1x = anchors[1].sx + bend;
          const cp1y = anchors[1].sy;
          const cp2x = anchors[2].sx - bend * 0.7;
          const cp2y = anchors[2].sy;

          ctx.strokeStyle = f === 1 ? "rgba(31, 84, 82, 0.55)" : "rgba(156, 90, 60, 0.45)";
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p3.sx, p3.sy);
          ctx.stroke();

          if (motionEnabled) {
            const u = (t * 0.36 + f * 0.33) % 1;
            const mu = 1 - u;
            const px =
              mu * mu * mu * p0.sx +
              3 * mu * mu * u * cp1x +
              3 * mu * u * u * cp2x +
              u * u * u * p3.sx;
            const py =
              mu * mu * mu * p0.sy +
              3 * mu * mu * u * cp1y +
              3 * mu * u * u * cp2y +
              u * u * u * p3.sy;
            ctx.fillStyle = f === 1 ? PALETTE.teal : PALETTE.bronze;
            ctx.beginPath();
            ctx.arc(px, py, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("END-TO-END SOFTWARE-DEFINED STACK", 26, 32);
      },
    };
  }

  /* --- ROOM VI: Mobile VR Latency — 3D Wireframe Polyhedron & Tracking-Sync --- */
  function createVrInstallation() {
    const canvas = $("#canvas-vr");
    const ctx = setupCanvas(canvas);
    if (!ctx) return null;
    const stateEl = $("#vr-state");
    const modeBtns = $$("[data-vr-mode]");

    let vrMode = "proactive"; // proactive | standard
    let ptrActive = false;
    let targetYaw = 0;
    let targetPitch = 0;
    let leadYaw = 0;
    let leadPitch = 0;
    let ghostYaw = 0;
    let ghostPitch = 0;

    // Regular Icosahedron vertices & edges
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVerts = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ];
    const verts = rawVerts.map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return [x / len, y / len, z / len];
    });
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const d = Math.hypot(
          verts[i][0] - verts[j][0],
          verts[i][1] - verts[j][1],
          verts[i][2] - verts[j][2],
        );
        if (d < 1.15) edges.push([i, j]);
      }
    }

    function setVrMode(m) {
      vrMode = m;
      modeBtns.forEach((b) => {
        const on = b.dataset.vrMode === m;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (stateEl) {
        stateEl.textContent = m === "proactive" ? "PROACTIVE SYNC" : "STANDARD LAG";
        stateEl.classList.toggle("is-bronze", m === "standard");
      }
    }

    modeBtns.forEach((b) => {
      b.addEventListener("click", () => setVrMode(b.dataset.vrMode));
    });

    canvas.addEventListener(
      "pointermove",
      (event) => {
        const rect = canvas.getBoundingClientRect();
        ptrActive = true;
        targetYaw = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2.8;
        targetPitch = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2.1;
      },
      { passive: true },
    );
    canvas.addEventListener("pointerleave", () => {
      ptrActive = false;
    });

    function projectPoly(ry, rx, offsetX, scaleR) {
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      return verts.map(([vx, vy, vz]) => {
        const x1 = vx * cy - vz * sy;
        const z1 = vx * sy + vz * cy;
        const y2 = vy * cx - z1 * sx;
        const z2 = vy * sx + z1 * cx;
        const persp = 360 / (360 + z2 * scaleR + 120);
        return {
          x: W / 2 + offsetX + x1 * scaleR * persp,
          y: H / 2 - 14 + y2 * scaleR * persp,
        };
      });
    }

    return {
      roomIndex: 5,
      draw(t, dt) {
        if (!ptrActive && motionEnabled) {
          targetYaw = Math.sin(t * 0.9) * 1.45 + t * 0.42;
          targetPitch = Math.cos(t * 0.72) * 0.75;
        }

        leadYaw += (targetYaw - leadYaw) * Math.min(1, dt * 10);
        leadPitch += (targetPitch - leadPitch) * Math.min(1, dt * 10);

        const followRate = vrMode === "proactive" ? 9.5 : 1.7;
        ghostYaw += (leadYaw - ghostYaw) * Math.min(1, dt * followRate);
        ghostPitch += (leadPitch - ghostPitch) * Math.min(1, dt * followRate);

        drawArchitecturalGrid(ctx);

        const lagShift = vrMode === "standard" ? (leadYaw - ghostYaw) * 24 : 0;
        const leadPts = projectPoly(leadYaw, leadPitch, 0, 96);
        const ghostPts = projectPoly(ghostYaw, ghostPitch, -lagShift, 96);

        // Draw bronze ghost rendered wireframe (trails behind in Standard, snaps tight in Proactive)
        ctx.strokeStyle =
          vrMode === "standard"
            ? "rgba(156, 90, 60, 0.72)"
            : "rgba(31, 84, 82, 0.42)";
        ctx.lineWidth = vrMode === "standard" ? 1.5 : 1.1;
        if (vrMode === "standard") ctx.setLineDash([4, 4]);
        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(ghostPts[a].x, ghostPts[a].y);
          ctx.lineTo(ghostPts[b].x, ghostPts[b].y);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Connecting drift vectors in Standard mode
        if (vrMode === "standard") {
          ctx.strokeStyle = "rgba(156, 90, 60, 0.28)";
          ctx.lineWidth = 0.85;
          for (let i = 0; i < verts.length; i += 2) {
            ctx.beginPath();
            ctx.moveTo(leadPts[i].x, leadPts[i].y);
            ctx.lineTo(ghostPts[i].x, ghostPts[i].y);
            ctx.stroke();
          }
        }

        // Draw live motion wireframe in crisp espresso / forest teal
        ctx.strokeStyle = vrMode === "proactive" ? PALETTE.teal : PALETTE.ink;
        ctx.lineWidth = 1.45;
        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(leadPts[a].x, leadPts[a].y);
          ctx.lineTo(leadPts[b].x, leadPts[b].y);
          ctx.stroke();
        });

        leadPts.forEach((p) => {
          ctx.fillStyle = vrMode === "proactive" ? PALETTE.teal : PALETTE.ink;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2);
          ctx.fill();
        });

        // Bottom proactive uplink scheduling rail
        const railY = H - 38;
        ctx.strokeStyle = PALETTE.borderStrong;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(110, railY);
        ctx.lineTo(W - 110, railY);
        ctx.stroke();

        const slots = 8;
        const activeSlot = Math.floor(t * (vrMode === "proactive" ? 5 : 1.6)) % slots;
        for (let s = 0; s < slots; s++) {
          const sx = 138 + s * 46;
          const isPulse = s === activeSlot;
          ctx.fillStyle = isPulse
            ? vrMode === "proactive"
              ? PALETTE.teal
              : PALETTE.bronze
            : PALETTE.cream;
          ctx.strokeStyle = isPulse ? ctx.fillStyle : PALETTE.borderStrong;
          ctx.lineWidth = 1;
          ctx.fillRect(sx - 6, railY - 8, 12, 16);
          ctx.strokeRect(sx - 6, railY - 8, 12, 16);
        }

        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 9px "DM Sans", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(
          vrMode === "proactive" ? "MOTION + RENDERED FRAME IN SYNC" : "MOTION TARGET vs. TRAILING RENDER",
          26,
          32,
        );
      },
    };
  }

  /* --- Unified Visibility-Aware Installation Loop (60fps, zero idle burn) --- */
  const installations = [
    createSeedInstallation(),
    createSecureSimInstallation(),
    createGptInstallation(),
    createSonicaInstallation(),
    createFloraInstallation(),
    createVrInstallation(),
  ].filter(Boolean);

  let loopRaf = 0;
  let lastNow = 0;
  let clock = 0;

  function drawAllStatic() {
    installations.forEach((inst) => inst.draw(clock, 0));
  }

  function tickInstallations(now) {
    loopRaf = 0;
    if (!motionEnabled || !exhibitionInView || document.hidden) {
      lastNow = 0;
      return;
    }
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    clock += dt;

    const isIndex = galleryViewport && galleryViewport.dataset.mode === "index";
    installations.forEach((inst) => {
      if (isIndex || inst.roomIndex === activeRoom) {
        inst.draw(clock, dt);
      }
    });

    if (isIndex || activeRoom < 6) {
      loopRaf = requestAnimationFrame(tickInstallations);
    }
  }

  syncInstallations = () => {
    const isIndex = galleryViewport && galleryViewport.dataset.mode === "index";
    const needsLoop =
      motionEnabled &&
      exhibitionInView &&
      !document.hidden &&
      (isIndex || activeRoom < 6);

    if (needsLoop) {
      if (!loopRaf) loopRaf = requestAnimationFrame(tickInstallations);
    } else {
      cancelAnimationFrame(loopRaf);
      loopRaf = 0;
      lastNow = 0;
      drawAllStatic();
    }
  };

  if ("IntersectionObserver" in window && galleryViewport) {
    new IntersectionObserver(
      ([entry]) => {
        exhibitionInView = entry.isIntersecting;
        syncInstallations();
      },
      { threshold: 0.05 },
    ).observe(galleryViewport);
  }

  document.addEventListener("visibilitychange", syncInstallations);
  drawAllStatic();
  syncInstallations();

  function syncMotion() {
    motionEnabled = !reduceMotion.matches;
    if (!motionEnabled) {
      document.body.classList.remove("hero-arming");
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
      if (cursorEl) cursorEl.classList.remove("is-visible", "has-label");
    }
    updateScroll();
    syncInstallations();
  }
  reduceMotion.addEventListener("change", syncMotion);
  updateScroll();

  /* ============================================================
     7. ROOM VII: ACEMAP INK-BLOOM & DISCIPLINE-ZOOM ATLAS
     ============================================================ */
  const mapLoad = $("#map-load");
  const mapStatus = $("#map-status");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  const fieldSelectWrap = $(".field-select");
  const topicSelectWrap = $(".topic-select");
  const topicMapSvg = $("#topic-map");
  const atlasCamera = $("#atlas-camera");
  const atlasViewport = $("#atlas-viewport");
  const inkRipplesLayer = $("#ink-ripples");
  const callout = $("#atlas-callout");
  const calloutSwatch = $("#callout-swatch");
  const calloutTopic = $("#callout-topic");
  const calloutField = $("#callout-field");

  const fields = [
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

  const csvColors = [
    "#ffc1fc", "#beeb74", "#e0d4ff", "#ffb290", "#ffbd71",
    "#ded75f", "#9cd8fc", "#f5bc7b", "#5eebc7", "#d1beda",
    "#52eaf9", "#9ed5c2", "#c9d188", "#91d289", "#ffbccc",
    "#ffac9e", "#ffaabb", "#8df8a0", "#ffce63",
  ];

  const mineralColors = [
    "#7d567e", "#5f7a42", "#585c8c", "#a85c42", "#1f5452",
    "#8c7432", "#2f6f8a", "#9c5a3c", "#257063", "#785f74",
    "#2c6e78", "#4e7866", "#8a773c", "#4b734b", "#995a72",
    "#a66253", "#964f60", "#3f7553", "#917134",
  ];

  let topicPoints = [];
  let circles = [];
  let selectedField = "all";
  let hoveredIndex = -1;
  let selectedIndex = -1;
  let camScale = 1;
  let camTx = 0;
  let camTy = 0;

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

  function isPointActive(i) {
    return (
      selectedField === "all" || topicPoints[i].field === Number(selectedField)
    );
  }

  function applyAtlasCamera(scale, tx, ty) {
    camScale = scale;
    camTx = tx;
    camTy = ty;
    if (atlasCamera) {
      atlasCamera.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    }
  }

  function focusDisciplineCamera(fieldVal) {
    if (fieldVal === "all") {
      applyAtlasCamera(1, 0, 0);
      return;
    }
    const fIdx = Number(fieldVal);
    const pts = topicPoints.filter((p) => p.field === fIdx);
    if (!pts.length) {
      applyAtlasCamera(1, 0, 0);
      return;
    }
    const xs = pts.map((p) => p.cx);
    const ys = pts.map((p) => p.cy);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bw = Math.max(90, maxX - minX + 60);
    const bh = Math.max(70, maxY - minY + 50);
    const zoom = Math.min(2.15, Math.max(1.15, Math.min(540 / bw, 310 / bh)));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const tx = 320 - midX * zoom;
    const ty = 190 - midY * zoom;
    applyAtlasCamera(zoom, tx, ty);
  }

  function syncCircleHighlight(index) {
    if (index < 0 || !circles[index]) return;
    const circle = circles[index];
    const isSelected = index === selectedIndex;
    const isHovered = index === hoveredIndex;
    circle.classList.toggle("is-selected", isSelected);
    circle.classList.toggle("is-hovered", isHovered);
    circle.setAttribute("r", isSelected ? "4.4" : isHovered ? "3.9" : "2.15");
  }

  function spawnInkRipples(point) {
    if (!inkRipplesLayer || !point || !motionEnabled) return;
    inkRipplesLayer.replaceChildren();
    const color = mineralColors[point.field] || "#1f5452";
    for (let ring = 0; ring < 3; ring++) {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      r.setAttribute("cx", String(point.cx));
      r.setAttribute("cy", String(point.cy));
      r.setAttribute("r", String(6 + ring * 3.5));
      r.setAttribute("stroke", color);
      r.setAttribute("class", "ink-ripple");
      r.style.setProperty("--rd", `${ring * 0.14}s`);
      inkRipplesLayer.appendChild(r);
    }
  }

  function showCallout(index) {
    if (!callout || !atlasViewport || !topicMapSvg || index < 0) {
      if (callout) callout.hidden = true;
      return;
    }
    const point = topicPoints[index];
    if (!point) return;

    const svgRect = topicMapSvg.getBoundingClientRect();
    const wrapRect = atlasViewport.getBoundingClientRect();
    const vx = point.cx * camScale + camTx;
    const vy = point.cy * camScale + camTy;
    const px = (vx / 640) * svgRect.width + (svgRect.left - wrapRect.left);
    const py = (vy / 380) * svgRect.height + (svgRect.top - wrapRect.top);

    calloutSwatch.style.backgroundColor = mineralColors[point.field];
    calloutTopic.textContent = point.name;
    calloutField.textContent = fields[point.field];
    callout.hidden = false;

    const cw = callout.offsetWidth || 180;
    const ch = callout.offsetHeight || 52;
    const maxX = Math.max(12, wrapRect.width - cw - 12);
    const maxY = Math.max(12, wrapRect.height - ch - 12);
    const left = Math.min(Math.max(12, px + 14), maxX);
    const top = Math.min(
      Math.max(12, py - ch - 10 < 12 ? py + 14 : py - ch - 10),
      maxY,
    );
    callout.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
  }

  function updateMap() {
    selectedField = fieldSelect.value;
    hoveredIndex = -1;
    selectedIndex = -1;
    if (callout) callout.hidden = true;
    if (inkRipplesLayer) inkRipplesLayer.replaceChildren();

    let count = 0;
    topicSelect.replaceChildren(new Option("Choose a topic", ""));

    circles.forEach((circle, i) => {
      const active = isPointActive(i);
      circle.setAttribute("opacity", active ? "0.86" : "0.05");
      circle.setAttribute("r", "2.15");
      circle.style.pointerEvents = active ? "auto" : "none";
      circle.classList.remove("is-selected", "is-hovered");
      if (active) {
        count++;
        topicSelect.add(new Option(topicPoints[i].name, String(i)));
      }
    });

    focusDisciplineCamera(selectedField);

    const label =
      selectedField === "all"
        ? "All 19 disciplines"
        : fields[Number(selectedField)];
    mapStatus.textContent = `${label} · ${count.toLocaleString()} topics.`;
    const mapTitle = $("#map-title");
    if (mapTitle) {
      mapTitle.textContent = `Acemap topic atlas: ${label}, ${count} topics.`;
    }
  }

  function findNearestPoint(clientX, clientY, maxDist) {
    const rect = topicMapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const rawX = ((clientX - rect.left) / rect.width) * 640;
    const rawY = ((clientY - rect.top) / rect.height) * 380;
    const vx = (rawX - camTx) / camScale;
    const vy = (rawY - camTy) / camScale;
    let best = -1;
    let bestDistSq = (maxDist / camScale) * (maxDist / camScale);
    for (let i = 0; i < topicPoints.length; i++) {
      if (!isPointActive(i)) continue;
      const dx = topicPoints[i].cx - vx;
      const dy = topicPoints[i].cy - vy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestDistSq) {
        bestDistSq = d2;
        best = i;
      }
    }
    return best;
  }

  if (mapLoad && topicMapSvg) {
    mapLoad.addEventListener("click", async () => {
      if (galleryViewport && galleryViewport.dataset.mode === "gallery" && activeRoom !== 6) {
        setActiveRoom(6);
      }

      mapLoad.disabled = true;
      mapLoad.textContent = "Blooming 2,208 topics…";
      mapStatus.textContent = "Fetching original Acemap coordinates…";

      try {
        const response = await fetch("../../data/data.csv");
        if (!response.ok) throw new Error("Dataset unavailable");
        const rows = parseCSV(await response.text()).slice(1);
        topicPoints = rows
          .map((r) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            name: r[3],
            field: csvColors.indexOf(r[4]),
            cx: 0,
            cy: 0,
          }))
          .filter(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
          );

        if (!topicPoints.length) throw new Error("No valid coordinates");

        const xs = topicPoints.map((p) => p.x);
        const ys = topicPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const padX = 44;
        const padY = 34;
        const scale = Math.min(
          (640 - padX * 2) / (maxX - minX),
          (380 - padY * 2) / (maxY - minY),
        );
        const offsetX = (640 - (maxX - minX) * scale) / 2;
        const offsetY = (380 - (maxY - minY) * scale) / 2;

        const clusterSums = fields.map(() => ({ sx: 0, sy: 0, n: 0 }));
        topicPoints.forEach((point) => {
          point.cx = Number(((point.x - minX) * scale + offsetX).toFixed(2));
          point.cy = Number(((point.y - minY) * scale + offsetY).toFixed(2));
          const c = clusterSums[point.field];
          c.sx += point.cx;
          c.sy += point.cy;
          c.n += 1;
        });

        const rootGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        rootGroup.id = "topic-points";

        const clusterGroups = fields.map((_, fIdx) => {
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("class", motionEnabled ? "discipline-cluster is-blooming" : "discipline-cluster");
          const c = clusterSums[fIdx];
          if (c.n > 0) {
            g.style.transformOrigin = `${(c.sx / c.n).toFixed(1)}px ${(c.sy / c.n).toFixed(1)}px`;
          }
          g.style.setProperty("--bloom-delay", `${(fIdx * 0.042).toFixed(3)}s`);
          rootGroup.appendChild(g);
          return g;
        });

        circles = new Array(topicPoints.length);
        topicPoints.forEach((point, i) => {
          const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
          );
          circle.setAttribute("cx", String(point.cx));
          circle.setAttribute("cy", String(point.cy));
          circle.setAttribute("r", "2.15");
          circle.setAttribute("fill", mineralColors[point.field]);
          circle.setAttribute("class", "map-point");
          circle.dataset.point = String(i);
          clusterGroups[point.field].appendChild(circle);
          circles[i] = circle;
        });

        const preview = $("#map-preview");
        if (preview) preview.replaceWith(rootGroup);
        else if (atlasCamera) atlasCamera.insertBefore(rootGroup, inkRipplesLayer || null);

        fields.forEach((field, i) => {
          const option = document.createElement("option");
          option.value = String(i);
          option.textContent = field;
          fieldSelect.appendChild(option);
        });

        topicMapSvg.addEventListener("pointermove", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 16);
          if (idx === hoveredIndex) return;
          const prev = hoveredIndex;
          hoveredIndex = idx;
          syncCircleHighlight(prev);
          syncCircleHighlight(idx);
          if (idx >= 0) {
            const point = topicPoints[idx];
            mapStatus.textContent = `${point.name} · ${fields[point.field]}`;
            showCallout(idx);
            spawnInkRipples(point);
          } else if (selectedIndex >= 0) {
            showCallout(selectedIndex);
          } else if (callout) {
            callout.hidden = true;
          }
        });

        topicMapSvg.addEventListener("pointerleave", () => {
          const prev = hoveredIndex;
          hoveredIndex = -1;
          syncCircleHighlight(prev);
          if (selectedIndex >= 0) {
            showCallout(selectedIndex);
          } else if (callout) {
            callout.hidden = true;
          }
        });

        topicMapSvg.addEventListener("click", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 18);
          if (idx < 0) return;
          const prev = selectedIndex;
          selectedIndex = idx;
          syncCircleHighlight(prev);
          syncCircleHighlight(idx);
          topicSelect.value = String(idx);
          const point = topicPoints[idx];
          mapStatus.textContent = `${point.name} · ${fields[point.field]}`;
          showCallout(idx);
          spawnInkRipples(point);
        });

        mapLoad.hidden = true;
        if (fieldSelectWrap) fieldSelectWrap.hidden = false;
        if (topicSelectWrap) topicSelectWrap.hidden = false;
        updateMap();
        fieldSelect.focus({ preventScroll: true });
      } catch {
        mapLoad.disabled = false;
        mapLoad.textContent = "Retry loading atlas";
        mapStatus.textContent =
          "Could not load the dataset. You can retry or visit Acemap directly.";
      }
    });

    fieldSelect.addEventListener("change", updateMap);
    topicSelect.addEventListener("change", () => {
      const prev = selectedIndex;
      selectedIndex =
        topicSelect.value === "" ? -1 : Number(topicSelect.value);
      syncCircleHighlight(prev);
      syncCircleHighlight(selectedIndex);
      if (selectedIndex < 0) {
        if (callout) callout.hidden = true;
        if (inkRipplesLayer) inkRipplesLayer.replaceChildren();
        const label =
          selectedField === "all"
            ? "All 19 disciplines"
            : fields[Number(selectedField)];
        const count = topicSelect.options.length - 1;
        mapStatus.textContent = `${label} · ${count.toLocaleString()} topics.`;
        return;
      }
      const point = topicPoints[selectedIndex];
      mapStatus.textContent = `${point.name} · ${fields[point.field]}`;
      showCallout(selectedIndex);
      spawnInkRipples(point);
    });
  }

  /* ============================================================
     8. PUBLICATIONS BOOK-INDEX FILTER & HASH SYNC
     ============================================================ */
  const filterButtons = $$("[data-filter]");
  const pubGroups = $$(".pub-group");
  const pubCount = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });

    filterButtons.forEach((button) => {
      const active = button.dataset.filter === kind;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const visibleGroups = pubGroups.filter((group) => !group.hidden);
    const total = visibleGroups.reduce(
      (sum, group) => sum + group.querySelectorAll(".pub-entry").length,
      0,
    );
    const years = visibleGroups.flatMap((group) =>
      [...group.querySelectorAll(".pub-year")].map((el) =>
        Number(el.textContent),
      ),
    );
    if (pubCount && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCount.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () =>
      filterPublications(button.dataset.filter),
    );
  });

  function syncFromHash() {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "conf") {
      filterPublications("conference");
    } else if (hash === "journal") {
      filterPublications("journal");
    } else {
      const roomIdx = roomIds.indexOf(hash);
      if (roomIdx >= 0) {
        setActiveRoom(roomIdx);
      }
    }
  }

  window.addEventListener("hashchange", syncFromHash);
  syncFromHash();
})();
