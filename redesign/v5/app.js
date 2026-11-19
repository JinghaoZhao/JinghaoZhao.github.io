/* V5 — Kinetic Spatial Studio / Awwwards Interactive Kinetic Playground */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotion.matches;

  let syncHeroScene = () => {};
  let syncAcemapLoop = () => {};
  let updateScrollUI = () => {};

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function applyMotionPreference() {
    motionEnabled = !reduceMotion.matches;
    body.classList.toggle("motion-enabled", motionEnabled);
    body.classList.toggle("motion-paused", !motionEnabled);
    if (!motionEnabled) {
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
      const heroContent = $("#hero-content");
      if (heroContent) {
        heroContent.style.transform = "";
        heroContent.style.opacity = "";
      }
    }
    syncHeroScene();
    syncAcemapLoop();
    updateScrollUI();
  }
  reduceMotion.addEventListener("change", applyMotionPreference);
  applyMotionPreference();

  /* ------------------------------------------------------------------------
     1. Reveal Choreography
     ------------------------------------------------------------------------ */
  if ("IntersectionObserver" in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.remove("is-pending");
          revealObs.unobserve(target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    $$(".reveal").forEach((el) => {
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight * 0.96) {
        el.classList.add("is-pending");
      }
      revealObs.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     2. Scroll Progress, Hero Scale Dissolve, Dynamic Theme Morphing & Pill Dock
     ------------------------------------------------------------------------ */
  const progressBar = $("#scroll-progress-bar");
  const header = $("#site-header");
  const navDock = $("#nav-dock");
  const navIndicator = $("#nav-indicator");
  const navLinks = $$("#nav-dock a");
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  const heroSection = $("#large-header");
  const heroContent = $("#hero-content");
  const themeBands = $$(".theme-band");

  function positionNavIndicator(activeLink) {
    if (!navIndicator || !navDock) return;
    if (!activeLink) {
      navIndicator.classList.remove("is-visible");
      return;
    }
    const dockRect = navDock.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const x = linkRect.left - dockRect.left - 5;
    navIndicator.style.width = `${Math.round(linkRect.width)}px`;
    navIndicator.style.transform = `translateX(${Math.round(x)}px)`;
    navIndicator.classList.add("is-visible");
  }

  let scrollQueued = false;
  updateScrollUI = () => {
    scrollQueued = false;
    const y = window.scrollY;
    const vh = window.innerHeight || 1;
    const docHeight = Math.max(document.documentElement.scrollHeight - vh, 1);
    const progress = Math.min(1, Math.max(0, y / docHeight));

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    // Scroll-linked hero parallax & scale dissolve
    if (heroSection && heroContent && motionEnabled) {
      const heroH = Math.max(heroSection.offsetHeight, vh);
      const t = Math.min(1, Math.max(0, y / (heroH * 0.85)));
      if (t <= 1 && y < heroH * 1.15) {
        const scale = 1 - t * 0.085;
        const ty = t * -52;
        const opacity = 1 - t * 0.72;
        heroContent.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
        heroContent.style.opacity = opacity.toFixed(3);
      }
    } else if (heroContent && !motionEnabled) {
      heroContent.style.transform = "";
      heroContent.style.opacity = "";
    }

    // Dynamic chapter theme morphing (based on top-quarter anchor)
    let activeTheme = "alabaster";
    const probeY = 72;
    for (let i = 0; i < themeBands.length; i++) {
      const rect = themeBands[i].getBoundingClientRect();
      if (rect.top <= probeY && rect.bottom >= probeY) {
        activeTheme = themeBands[i].dataset.bandTheme || "alabaster";
        break;
      }
    }
    if (body.dataset.theme !== activeTheme) {
      body.dataset.theme = activeTheme;
    }
    if (header) {
      const isDark = activeTheme === "midnight" || activeTheme === "twilight";
      header.classList.toggle("is-dark", isDark);
      header.classList.toggle("is-stone", activeTheme === "stone");
    }

    // Active section indicator for floating pill dock
    let activeId = "";
    const threshold = vh * 0.36;
    navSections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= threshold) {
        activeId = sec.id;
      }
    });
    let activeLink = null;
    navLinks.forEach((link) => {
      const isMatch = link.getAttribute("href") === `#${activeId}`;
      if (isMatch) {
        link.setAttribute("aria-current", "location");
        activeLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    positionNavIndicator(activeLink);
  };

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
  window.addEventListener("resize", () => requestAnimationFrame(updateScrollUI), {
    passive: true,
  });
  updateScrollUI();

  /* ------------------------------------------------------------------------
     3. Magnetic CTAs, Pointer Specular Spotlights & 3D Tilt Cards
     ------------------------------------------------------------------------ */
  $$(".magnetic").forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.24;
    el.addEventListener("pointermove", (e) => {
      if (!motionEnabled || !finePointer.matches) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });

  $$(".spotlight-card").forEach((card) => {
    card.addEventListener(
      "pointermove",
      (e) => {
        if (!finePointer.matches) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(e.clientX - rect.left).toFixed(0)}px`);
        card.style.setProperty("--my", `${(e.clientY - rect.top).toFixed(0)}px`);
      },
      { passive: true },
    );
  });

  $$(".tilt-card").forEach((card) => {
    const maxDeg = Number(card.dataset.tilt) || 7;
    card.addEventListener("pointermove", (e) => {
      if (!motionEnabled || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      const rx = (-ny * maxDeg).toFixed(2);
      const ry = (nx * maxDeg).toFixed(2);
      card.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  /* ------------------------------------------------------------------------
     4. Living Fluid Chromatic Aurora & Pointer-Turbulence Hero Canvas
     ------------------------------------------------------------------------ */
  function initHeroAurora() {
    const hero = $("#large-header");
    const canvas = $("#hero-canvas");
    if (!hero || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastTime = 0;
    let sceneTime = 0;
    let isVisible = true;

    // Fluid pointer state + turbulence energy
    let mx = -999;
    let my = -999;
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    let turbEnergy = 0;
    const motes = [];

    const blobs = [
      { bx: 0.78, by: 0.26, r: 0.48, c: "rgba(29, 99, 255, 0.17)", sx: 0.42, sy: 0.31, ph: 0.3 },
      { bx: 0.18, by: 0.74, r: 0.45, c: "rgba(14, 165, 233, 0.16)", sx: 0.33, sy: 0.41, ph: 2.1 },
      { bx: 0.54, by: 0.62, r: 0.42, c: "rgba(99, 102, 241, 0.14)", sx: 0.28, sy: 0.35, ph: 4.0 },
      { bx: 0.86, by: 0.78, r: 0.36, c: "rgba(56, 189, 248, 0.13)", sx: 0.48, sy: 0.26, ph: 1.4 },
      { bx: 0.32, by: 0.22, r: 0.34, c: "rgba(129, 140, 248, 0.11)", sx: 0.36, sy: 0.44, ph: 5.2 },
    ];

    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function spawnMote(x, y, vx, vy) {
      if (motes.length > 36) motes.shift();
      motes.push({
        x,
        y,
        vx: vx * 0.16 + (Math.random() - 0.5) * 0.7,
        vy: vy * 0.16 + (Math.random() - 0.5) * 0.7,
        r: 2 + Math.random() * 4.5,
        life: 1,
        hue: 205 + Math.random() * 42,
      });
    }

    function draw() {
      const t = sceneTime * 0.00062;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fbfcfe";
      ctx.fillRect(0, 0, width, height);

      // Liquid multi-blob aurora field
      const maxDim = Math.max(width, height);
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const cx =
          width * b.bx +
          Math.sin(t * b.sx + b.ph) * width * 0.085 +
          Math.cos(t * b.sy * 0.6 + i) * width * 0.03 +
          px * (28 + i * 9);
        const cy =
          height * b.by +
          Math.cos(t * b.sy + b.ph) * height * 0.075 +
          py * (22 + i * 7);
        const rad = maxDim * b.r * (1 + Math.sin(t * 0.8 + i) * 0.08);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, b.c);
        grad.addColorStop(0.55, b.c.replace(/[\d.]+\)$/, "0.045)"));
        grad.addColorStop(1, "rgba(251, 252, 254, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Pointer turbulence aura
      if (turbEnergy > 0.02 && mx > -100) {
        const auraR = 190 + turbEnergy * 90;
        const aura = ctx.createRadialGradient(mx, my, 0, mx, my, auraR);
        aura.addColorStop(0, `rgba(29, 99, 255, ${(0.14 * turbEnergy).toFixed(3)})`);
        aura.addColorStop(0.5, `rgba(14, 165, 233, ${(0.07 * turbEnergy).toFixed(3)})`);
        aura.addColorStop(1, "rgba(251, 252, 254, 0)");
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, width, height);
      }

      // Flowing silk contour waves distorted by pointer turbulence
      const waveCount = width < 640 ? 5 : 8;
      const step = width < 640 ? 24 : 18;
      for (let w = 0; w < waveCount; w++) {
        const ratio = w / (waveCount - 1);
        const baseY = height * (0.44 + ratio * 0.44);
        const amp = (15 + ratio * 24) * (width < 640 ? 0.72 : 1);
        const freq = 0.003 + ratio * 0.0014;
        const phase = t * (1.05 + ratio * 0.35) + w * 1.1;

        ctx.beginPath();
        for (let x = -step; x <= width + step; x += step) {
          let y =
            baseY +
            Math.sin(x * freq + phase) * amp +
            Math.cos(x * freq * 0.52 - phase * 0.75) * (amp * 0.46) +
            py * (12 + ratio * 18);

          if (turbEnergy > 0.02 && mx > -100) {
            const dx = x - mx;
            const dy = y - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < 34000) {
              const factor = (1 - d2 / 34000) * turbEnergy;
              y += Math.sin(dx * 0.03 + t * 5) * 24 * factor;
            }
          }

          if (x <= 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const hue = 206 + ratio * 34;
        ctx.strokeStyle = `hsla(${hue}, 90%, 54%, ${0.075 + (1 - ratio) * 0.07})`;
        ctx.lineWidth = 1.35;
        ctx.stroke();
      }

      // Kinetic turbulence motes
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.vx *= 0.96;
        m.vy *= 0.96;
        m.life -= 0.024;
        if (m.life <= 0) {
          motes.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * m.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${m.hue}, 92%, 58%, ${(m.life * 0.42).toFixed(3)})`;
        ctx.fill();
      }

      hero.classList.add("canvas-ready");
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !isVisible || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime || now - lastTime >= 32) {
        sceneTime += lastTime ? Math.min(now - lastTime, 66) : 0;
        lastTime = now;
        px += (tx - px) * 0.07;
        py += (ty - py) * 0.07;
        turbEnergy *= 0.95;
        draw();
      }
      rafId = requestAnimationFrame(tick);
    }

    syncHeroScene = () => {
      if (motionEnabled && isVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
      }
    };

    let prevClientX = 0;
    let prevClientY = 0;
    hero.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
        tx = Math.max(-1, Math.min(1, (mx / width) * 2 - 1));
        ty = Math.max(-1, Math.min(1, (my / height) * 2 - 1));
        const vx = e.clientX - prevClientX;
        const vy = e.clientY - prevClientY;
        prevClientX = e.clientX;
        prevClientY = e.clientY;
        turbEnergy = Math.min(1, turbEnergy + 0.28);
        if (Math.hypot(vx, vy) > 4) spawnMote(mx, my, vx, vy);
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        syncHeroScene();
      }).observe(hero);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(hero);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    resize();
    syncHeroScene();
  }

  try {
    initHeroAurora();
  } catch {
    // Fallback gradient remains visible if canvas context is unavailable.
  }

  document.addEventListener("visibilitychange", () => {
    syncHeroScene();
    syncAcemapLoop();
  });

  /* ------------------------------------------------------------------------
     5. Kinetic Split-Stage Showcase (3D Morph + Continuous Live SVGs for All 7)
     ------------------------------------------------------------------------ */
  const PROJECTS = {
    seed: {
      index: "01 / 07",
      name: "SEED",
      caption:
        "A device reports a failure to the SEED SIM applet. SIM and core-network diagnosis inform a recovery action.",
      actionLabel: "Read the SIGCOMM ’22 paper",
      actionHref: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="SEED architecture: device reports failure to SIM applet, SIM and 5G core infer cause and trigger recovery">
          <g aria-hidden="true">
            <path d="M121 150H180V200H238" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M121 150H180V200H238" class="art-flow" pathLength="100"/>
              <path d="M121 150H180V200H238" class="art-stream" pathLength="100"/>
            </g>
            <path d="M294 200H360V118H426" class="art-route"/>
            <g data-part="2" class="art-part">
              <path d="M294 200H360V118H426" class="art-flow" pathLength="100"/>
              <path d="M294 200H360V118H426" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <path d="M463 92V56H88V80" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M463 92V56H88V80" class="art-flow" pathLength="100"/>
              <path d="M463 92V56H88V80" class="art-stream art-stream-slow" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <rect x="56" y="80" width="65" height="107" rx="10" class="art-device"/>
              <rect x="63" y="94" width="51" height="73" rx="3" class="art-screen"/>
              <path d="M80 87h17 M81 177h15" class="art-line"/>
              <text x="88" y="212" class="art-label" text-anchor="middle">DEVICE</text>
              <circle cx="88" cy="130" r="12" class="art-alert"/>
              <text x="88" y="135" class="art-alert-text" text-anchor="middle">!</text>
            </g>
            <g data-part="2" class="art-part">
              <g transform="translate(238 160) scale(0.8)">
                <path d="M0 0H48L70 22V90H0Z" class="art-device"/>
                <rect x="14" y="35" width="42" height="38" rx="4" class="art-chip"/>
                <path d="M28 35V73M42 35V73M14 47H56M14 60H56" class="art-line"/>
              </g>
              <text x="266" y="264" class="art-label" text-anchor="middle">SIM / SEED</text>
            </g>
            <g data-part="2 3" class="art-part">
              <rect x="426" y="92" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="436" cy="99" r="2.2" class="art-dot node-pulse"/>
              <path d="M472 99h17" class="art-line"/>
              <rect x="426" y="111" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="436" cy="118" r="2.2" class="art-dot node-pulse"/>
              <path d="M472 118h17" class="art-line"/>
              <rect x="426" y="130" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="436" cy="137" r="2.2" class="art-dot node-pulse"/>
              <path d="M472 137h17" class="art-line"/>
              <text x="463" y="170" class="art-label" text-anchor="middle">5G CORE</text>
              <text x="463" y="190" class="art-small" text-anchor="middle">Diagnostic assistance</text>
            </g>
            <g data-part="3" class="art-part">
              <path d="M132 76l5 5 10-12" class="art-check"/>
              <text x="272" y="40" class="art-kicker" text-anchor="middle">RECOVERY ACTION</text>
            </g>
            <text x="180" y="232" class="art-small" text-anchor="middle">Error report</text>
            <text x="360" y="232" class="art-small" text-anchor="middle">Cause inference</text>
          </g>
        </svg>`,
    },
    secureSIM: {
      index: "02 / 07",
      name: "SecureSIM",
      caption:
        "A certificate is authenticated, a request is checked against permissions, and authorized access reaches the SIM service.",
      actionLabel: "Read the MobiCom ’21 paper",
      actionHref: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="SecureSIM architecture: certificate authentication, permission verification, and authorized SIM service access">
          <g aria-hidden="true">
            <path d="M128 110H236" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M128 110H236" class="art-flow" pathLength="100"/>
              <path d="M128 110H236" class="art-stream" pathLength="100"/>
            </g>
            <path d="M128 218H182V190H236" class="art-route"/>
            <g data-part="2" class="art-part">
              <path d="M128 218H182V190H236" class="art-flow" pathLength="100"/>
              <path d="M128 218H182V190H236" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <path d="M334 154H438" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M334 154H438" class="art-flow" pathLength="100"/>
              <path d="M334 154H438" class="art-stream art-stream-slow" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <rect x="32" y="73" width="96" height="73" rx="8" class="art-panel"/>
              <rect x="38" y="80" width="84" height="10" rx="3" class="art-scan"/>
              <path d="M52 90h48M52 102h34M52 114h25" class="art-line"/>
              <circle cx="104" cy="128" r="6" class="art-dot node-pulse"/>
              <text x="80" y="169" class="art-kicker" text-anchor="middle">CERTIFICATE</text>
            </g>
            <g data-part="2" class="art-part">
              <rect x="32" y="198" width="96" height="40" rx="8" class="art-panel"/>
              <text x="80" y="222" class="art-label" text-anchor="middle">Request</text>
              <text x="80" y="260" class="art-kicker" text-anchor="middle">PERMISSIONS</text>
            </g>
            <g data-part="1 2 3" class="art-part">
              <g transform="translate(236 85) scale(1.4)">
                <path d="M0 0H48L70 22V90H0Z" class="art-device"/>
                <rect x="14" y="35" width="42" height="38" rx="4" class="art-chip"/>
                <path d="M28 35V73M42 35V73M14 47H56M14 60H56" class="art-line"/>
              </g>
            </g>
            <g data-part="2 3" class="art-part">
              <path d="M263 152q22 13 44 0v34q0 27-22 40-22-13-22-40Z" class="art-shield"/>
              <path d="M274 186l8 8 16-21" class="art-check"/>
            </g>
            <g data-part="3" class="art-part">
              <rect x="438" y="117" width="88" height="75" rx="8" class="art-panel"/>
              <text x="482" y="149" class="art-label" text-anchor="middle">SIM</text>
              <text x="482" y="169" class="art-small" text-anchor="middle">service</text>
              <text x="482" y="218" class="art-kicker" text-anchor="middle">ALLOWED</text>
            </g>
          </g>
        </svg>`,
    },
    gptcodelearner: {
      index: "03 / 07",
      name: "GPT-Code-Learner",
      caption:
        "Source code is searched by the context toolkit. The question and relevant repository context inform a GPT explanation.",
      actionLabel: "Explore on GitHub",
      actionHref: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="GPT-Code-Learner architecture: codebase searched by context toolkit, combined with user question for GPT explanation">
          <g aria-hidden="true">
            <path d="M162 110H212" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M162 110H212" class="art-flow" pathLength="100"/>
              <path d="M162 110H212" class="art-stream" pathLength="100"/>
            </g>
            <path d="M302 165V192H383" class="art-route"/>
            <g data-part="2" class="art-part">
              <path d="M302 165V192H383" class="art-flow" pathLength="100"/>
              <path d="M302 165V192H383" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <path d="M409 192H420V110H432" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M409 192H420V110H432" class="art-flow" pathLength="100"/>
              <path d="M409 192H420V110H432" class="art-stream" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <rect x="25" y="53" width="137" height="117" rx="8" class="art-panel"/>
              <rect x="33" y="86" width="121" height="16" rx="4" class="art-scan"/>
              <path d="M25 78H162" class="art-line"/>
              <circle cx="38" cy="66" r="2" class="art-dot"/>
              <circle cx="47" cy="66" r="2" class="art-dot"/>
              <circle cx="56" cy="66" r="2" class="art-dot"/>
              <text x="42" y="101" class="art-code" text-anchor="start">repo/</text>
              <text x="48" y="122" class="art-code" text-anchor="start">├ src/</text>
              <text x="48" y="143" class="art-code" text-anchor="start">└ docs/</text>
              <text x="93" y="197" class="art-kicker" text-anchor="middle">CODEBASE</text>
            </g>
            <g data-part="1 2" class="art-part">
              <rect x="212" y="58" width="180" height="107" rx="8" class="art-panel"/>
              <text x="302" y="86" class="art-label" text-anchor="middle">Context toolkit</text>
              <path d="M232 98H372" class="art-line"/>
              <text x="302" y="121" class="art-small" text-anchor="middle">Code search</text>
              <text x="302" y="144" class="art-small" text-anchor="middle">Repository context</text>
            </g>
            <g data-part="2" class="art-part">
              <rect x="180" y="222" width="188" height="42" rx="8" class="art-panel"/>
              <text x="274" y="248" class="art-small" text-anchor="middle">How does this work?</text>
              <path d="M274 222V192H302" class="art-route"/>
              <path d="M274 222V192H383" class="art-flow" pathLength="100"/>
              <circle cx="396" cy="192" r="13" class="art-context"/>
              <text x="396" y="198" class="art-symbol" text-anchor="middle">+</text>
            </g>
            <g data-part="3" class="art-part">
              <rect x="432" y="56" width="108" height="112" rx="8" class="art-panel"/>
              <text x="486" y="84" class="art-label" text-anchor="middle">GPT</text>
              <path d="M451 102h70" class="art-answer"/>
              <path d="M451 114h53" class="art-answer art-answer-2"/>
              <path d="M451 126h63" class="art-answer art-answer-3"/>
              <path d="M451 138h37" class="art-answer art-answer-4"/>
              <text x="486" y="197" class="art-kicker" text-anchor="middle">EXPLANATION</text>
            </g>
          </g>
        </svg>`,
    },
    sonica: {
      index: "04 / 07",
      name: "Sonica",
      caption:
        "A commodity NB-IoT device communicates over the air with a software-defined eNodeB and a CIoT-enabled core, enabling network research.",
      actionLabel: "Explore on GitHub",
      actionHref: "https://github.com/sonica-nbiot/sonica",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="Sonica architecture: commodity NB-IoT device over-the-air to eNodeB and EPC with CIoT core">
          <g aria-hidden="true">
            <path d="M117 175H271" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M117 175H271" class="art-flow" pathLength="100"/>
              <path d="M117 175H271" class="art-stream" pathLength="100"/>
            </g>
            <path d="M293 175H421" class="art-route"/>
            <g data-part="2" class="art-part">
              <path d="M293 175H421" class="art-flow" pathLength="100"/>
              <path d="M293 175H421" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <path d="M458 148V76H359" class="art-route"/>
            <path d="M282 132V96" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M458 148V76H359" class="art-flow" pathLength="100"/>
              <path d="M458 148V76H359" class="art-stream art-stream-slow" pathLength="100"/>
              <path d="M282 132V96" class="art-flow" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <rect x="54" y="146" width="63" height="77" rx="8" class="art-device"/>
              <rect x="63" y="156" width="45" height="25" rx="3" class="art-screen"/>
              <circle cx="86" cy="204" r="6" class="art-dot node-pulse"/>
              <path d="M67 146v-20M104 146v-13" class="art-line"/>
              <text x="86" y="251" class="art-kicker" text-anchor="middle">COTS DEVICE</text>
              <path d="M153 148q25 27 0 54" class="art-radio"/>
              <path d="M168 139q34 36 0 72" class="art-radio art-radio-2"/>
              <path d="M183 130q43 45 0 90" class="art-radio art-radio-3"/>
            </g>
            <g data-part="1 2" class="art-part">
              <path d="M264 201l18-65 18 65M272 171l24 16M269 187l22-16" class="art-device-line"/>
              <circle cx="282" cy="136" r="4.5" class="art-dot node-pulse"/>
              <path d="M270 122q-16 14 0 28M294 122q16 14 0 28" class="art-line"/>
              <text x="282" y="233" class="art-label" text-anchor="middle">eNodeB</text>
            </g>
            <g data-part="2" class="art-part">
              <rect x="421" y="148" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="431" cy="155" r="2.2" class="art-dot node-pulse"/>
              <path d="M467 155h17" class="art-line"/>
              <rect x="421" y="167" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="431" cy="174" r="2.2" class="art-dot node-pulse"/>
              <path d="M467 174h17" class="art-line"/>
              <rect x="421" y="186" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="431" cy="193" r="2.2" class="art-dot node-pulse"/>
              <path d="M467 193h17" class="art-line"/>
              <text x="458" y="233" class="art-label" text-anchor="middle">EPC + CIoT</text>
            </g>
            <g data-part="3" class="art-part">
              <rect x="205" y="55" width="154" height="41" rx="8" class="art-panel"/>
              <text x="282" y="80" class="art-label" text-anchor="middle">OTA research</text>
            </g>
          </g>
        </svg>`,
    },
    flora: {
      index: "05 / 07",
      name: "Flora",
      caption:
        "A configurable eSIM profile connects through the software-defined LTE RAN and core to an edge VR application, with network analytics across the platform.",
      actionLabel: "Explore the project",
      actionHref: "https://project-flora.github.io/Flora/",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="Flora architecture: configurable eSIM profile through software-defined LTE RAN and core to edge VR and network analytics">
          <g aria-hidden="true">
            <path d="M76 162V93H196" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M76 162V93H196" class="art-flow" pathLength="100"/>
              <path d="M76 162V93H196" class="art-stream" pathLength="100"/>
            </g>
            <path d="M364 93H470V166" class="art-route"/>
            <g data-part="2" class="art-part">
              <path d="M364 93H470V166" class="art-flow" pathLength="100"/>
              <path d="M364 93H470V166" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <path d="M418 225H378M182 225H105.5" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M418 225H378" class="art-flow" pathLength="100"/>
              <path d="M182 225H105.5" class="art-flow" pathLength="100"/>
              <path d="M182 225H105.5" class="art-stream" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <g transform="translate(46 162) scale(0.85)">
                <path d="M0 0H48L70 22V90H0Z" class="art-device"/>
                <rect x="14" y="35" width="42" height="38" rx="4" class="art-chip"/>
                <path d="M28 35V73M42 35V73M14 47H56M14 60H56" class="art-line"/>
              </g>
              <text x="76" y="264" class="art-kicker" text-anchor="middle">eSIM PROFILE</text>
            </g>
            <g data-part="1 2" class="art-part">
              <rect x="196" y="50" width="168" height="86" rx="8" class="art-panel"/>
              <rect x="212" y="65" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="222" cy="72" r="2.2" class="art-dot node-pulse"/>
              <path d="M258 72h17" class="art-line"/>
              <rect x="212" y="84" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="222" cy="91" r="2.2" class="art-dot node-pulse"/>
              <path d="M258 91h17" class="art-line"/>
              <rect x="212" y="103" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="222" cy="110" r="2.2" class="art-dot node-pulse"/>
              <path d="M258 110h17" class="art-line"/>
              <text x="325" y="83" class="art-small" text-anchor="middle">RAN</text>
              <text x="325" y="106" class="art-small" text-anchor="middle">CORE</text>
              <text x="280" y="156" class="art-kicker" text-anchor="middle">SOFTWARE-DEFINED LTE</text>
            </g>
            <g data-part="2" class="art-part">
              <rect x="418" y="166" width="104" height="69" rx="8" class="art-device"/>
              <path d="M418 189H522" class="art-line"/>
              <path class="art-device-line art-cube-float" d="M454 198l16 -8.0 16 8.0v16l-16 8.0 -16 -8.0Z M454 198l16 8.0 16 -8.0 M470 206.0v16"/>
              <text x="470" y="260" class="art-kicker" text-anchor="middle">EDGE VR</text>
            </g>
            <g data-part="3" class="art-part">
              <rect x="182" y="196" width="196" height="58" rx="8" class="art-panel"/>
              <text x="280" y="219" class="art-label" text-anchor="middle">Network analytics</text>
              <path d="M204 240h22l7-6 10 10 9-6h26l8-5 7 7h62" class="art-trace"/>
            </g>
          </g>
        </svg>`,
    },
    lrp: {
      index: "06 / 07",
      name: "Mobile VR Latency",
      caption:
        "Mobile VR sends motion to an edge renderer and receives rendered frames. Application-layer inference, DRX doze reduction, and proactive scheduling prepare the uplink ahead of data arrival.",
      actionLabel: "Read the NSDI ’21 paper",
      actionHref: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="Mobile VR Latency architecture: proactive uplink scheduling between mobile VR and edge renderer">
          <g aria-hidden="true">
            <path d="M133 149H401" class="art-route"/>
            <g data-part="1" class="art-part">
              <path d="M133 149H401" class="art-flow" pathLength="100"/>
              <path d="M133 149H401" class="art-stream" pathLength="100"/>
            </g>
            <path d="M418 184H133" class="art-route"/>
            <g data-part="3" class="art-part">
              <path d="M418 184H133" class="art-flow" pathLength="100"/>
              <path d="M418 184H133" class="art-stream art-stream-delay" pathLength="100"/>
            </g>
            <g data-part="1" class="art-part">
              <rect x="68" y="91" width="65" height="107" rx="10" class="art-device"/>
              <rect x="75" y="105" width="51" height="73" rx="3" class="art-screen"/>
              <path d="M92 98h17 M93 188h15" class="art-line"/>
              <text x="100" y="226" class="art-kicker" text-anchor="middle">MOBILE VR</text>
              <path d="M86 135l15-8 14 8v18l-14 8-15-8Z" class="art-line art-cube-float"/>
            </g>
            <g data-part="2" class="art-part">
              <rect x="160" y="26" width="216" height="54" rx="8" class="art-panel"/>
              <text x="268" y="49" class="art-label" text-anchor="middle">Latency reduction</text>
              <text x="268" y="69" class="art-small" text-anchor="middle">Infer · wake · schedule</text>
              <path d="M268 80v28" class="art-line"/>
              <circle cx="268" cy="108" r="2.8" class="art-dot node-pulse"/>
              <path d="M177 267H360" class="art-route"/>
              <rect x="196" y="256" width="10" height="22" rx="2" class="art-slot art-slot-1"/>
              <rect x="223" y="256" width="10" height="22" rx="2" class="art-slot art-slot-2"/>
              <rect x="250" y="256" width="10" height="22" rx="2" class="art-slot art-slot-3"/>
              <rect x="277" y="256" width="10" height="22" rx="2" class="art-slot art-slot-4"/>
              <rect x="304" y="256" width="10" height="22" rx="2" class="art-slot art-slot-5"/>
              <rect x="331" y="256" width="10" height="22" rx="2" class="art-slot art-slot-6"/>
              <text x="268" y="300" class="art-small" text-anchor="middle">Uplink scheduling</text>
            </g>
            <g data-part="1 2" class="art-part">
              <text x="268" y="136" class="art-small" text-anchor="middle">Motion →</text>
            </g>
            <g data-part="1 3" class="art-part">
              <rect x="401" y="104" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="411" cy="111" r="2.2" class="art-dot node-pulse"/>
              <path d="M447 111h17" class="art-line"/>
              <rect x="401" y="123" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="411" cy="130" r="2.2" class="art-dot node-pulse"/>
              <path d="M447 130h17" class="art-line"/>
              <rect x="401" y="142" width="74" height="15" rx="3" class="art-device"/>
              <circle cx="411" cy="149" r="2.2" class="art-dot node-pulse"/>
              <path d="M447 149h17" class="art-line"/>
            </g>
            <g data-part="3" class="art-part">
              <path class="art-device-line art-cube-float" d="M418 178l20 -10.0 20 10.0v20l-20 10.0 -20 -10.0Z M418 178l20 10.0 20 -10.0 M438 188.0v20"/>
              <text x="438" y="242" class="art-kicker" text-anchor="middle">EDGE RENDERER</text>
              <text x="268" y="206" class="art-small" text-anchor="middle">← Rendered frames</text>
            </g>
          </g>
        </svg>`,
    },
    acemap: {
      index: "07 / 07",
      name: "Acemap",
      caption:
        "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines. Explore the live spring-physics particle field below.",
      actionLabel: "Open interactive explorer",
      actionHref: "#acemap",
      svg: `
        <svg class="project-art" viewBox="0 0 560 320" role="img" aria-label="Acemap constellation preview: 2,208 research topics across 19 disciplines">
          <g aria-hidden="true">
            <ellipse cx="280" cy="160" rx="195" ry="96" transform="rotate(-18 280 160)" class="art-route orbit-ring orbit-ring-1"/>
            <ellipse cx="280" cy="160" rx="145" ry="122" transform="rotate(28 280 160)" class="art-route orbit-ring orbit-ring-2"/>
            <g data-part="1" class="art-part">
              <path d="M120 112 L280 48 L430 98" class="art-flow" pathLength="100"/>
              <path d="M120 112 L280 48 L430 98" class="art-stream" pathLength="100"/>
              <circle cx="120" cy="112" r="7" class="art-dot node-pulse"/>
              <circle cx="280" cy="48" r="6" class="art-dot node-pulse"/>
              <text x="120" y="94" class="art-kicker" text-anchor="middle">19 DISCIPLINES</text>
            </g>
            <g data-part="2" class="art-part">
              <path d="M430 98 L448 214 L296 276 L132 230 Z" class="art-flow" pathLength="100"/>
              <path d="M430 98 L448 214 L296 276 L132 230 Z" class="art-stream art-stream-delay" pathLength="100"/>
              <circle cx="430" cy="98" r="8" class="art-dot node-pulse"/>
              <circle cx="448" cy="214" r="5" class="art-dot node-pulse"/>
              <circle cx="296" cy="276" r="7" class="art-dot node-pulse"/>
              <circle cx="132" cy="230" r="5" class="art-dot node-pulse"/>
            </g>
            <g data-part="3" class="art-part">
              <path d="M120 112 L448 214 M430 98 L132 230 M280 48 L296 276" class="art-flow" pathLength="100"/>
              <circle cx="280" cy="160" r="22" fill="none" stroke="#1d63ff" stroke-opacity="0.3" class="pulse-halo"/>
              <circle cx="280" cy="160" r="14" class="art-chip"/>
              <circle cx="280" cy="160" r="5" class="art-dot"/>
              <text x="280" y="200" class="art-label" text-anchor="middle">2,208 Topics</text>
            </g>
          </g>
        </svg>`,
    },
  };

  const stageCard = $("#stage-visual");
  const stageSlot = $("#stage-svg-slot");
  const stageIndex = $("#stage-index");
  const stageName = $("#stage-name");
  const stageCaption = $("#stage-caption");
  const stageAction = $("#stage-action");
  const stageActionLabel = $("#stage-action-label");
  const stageReplay = $("#stage-replay");
  const stepButtons = $$("[data-step-btn]");
  const projectItems = $$(".project-item");

  let activeProjectKey = "seed";
  let stepTimers = [];
  let hoverTimer = 0;
  let manualLockUntil = 0;

  function clearStepTimers() {
    stepTimers.forEach((id) => clearTimeout(id));
    stepTimers = [];
  }

  function setStageStep(step) {
    if (!stageCard) return;
    stageCard.dataset.step = String(step);
    stepButtons.forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.stepBtn) === step);
    });
  }

  function runChoreography() {
    clearStepTimers();
    if (!motionEnabled) {
      setStageStep(3);
      return;
    }
    setStageStep(1);
    stepTimers.push(setTimeout(() => setStageStep(2), 820));
    stepTimers.push(setTimeout(() => setStageStep(3), 1650));
  }

  function populateMobileSlots() {
    projectItems.forEach((item) => {
      const key = item.dataset.project;
      const slot = item.querySelector(`[data-mobile-slot="${key}"]`);
      const data = PROJECTS[key];
      if (!slot || !data || slot.dataset.hydrated) return;
      slot.innerHTML = `<div class="mobile-stage-box" data-step="3">${data.svg}<p class="mobile-stage-caption">${data.caption}</p></div>`;
      slot.dataset.hydrated = "1";
    });
  }
  populateMobileSlots();

  function selectProject(key, instant = false) {
    const data = PROJECTS[key];
    if (!data || !stageSlot) return;
    activeProjectKey = key;

    projectItems.forEach((item) => {
      const isMatch = item.dataset.project === key;
      item.classList.toggle("is-active", isMatch);
      const btn = item.querySelector(".project-trigger");
      if (btn) btn.setAttribute("aria-expanded", String(isMatch));
    });

    const applyContent = () => {
      stageIndex.textContent = data.index;
      stageName.textContent = data.name;
      stageCaption.textContent = data.caption;
      stageActionLabel.textContent = data.actionLabel;
      stageAction.setAttribute("href", data.actionHref);
      stageSlot.innerHTML = data.svg;
      stageSlot.classList.remove("is-morphing");
      runChoreography();
    };

    if (instant || !motionEnabled) {
      applyContent();
    } else {
      stageSlot.classList.add("is-morphing");
      clearStepTimers();
      stepTimers.push(setTimeout(applyContent, 200));
    }
  }

  projectItems.forEach((item) => {
    const key = item.dataset.project;
    const trigger = item.querySelector(".project-trigger");
    if (trigger) {
      trigger.addEventListener("click", () => {
        clearTimeout(hoverTimer);
        manualLockUntil = Date.now() + 1800;
        selectProject(key, false);
      });
    }
    item.addEventListener("pointerenter", () => {
      if (!finePointer.matches || window.innerWidth < 960) return;
      if (activeProjectKey === key) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        manualLockUntil = Date.now() + 1400;
        selectProject(key, false);
      }, 85);
    });
    item.addEventListener("pointerleave", () => {
      clearTimeout(hoverTimer);
    });
  });

  // Scroll-driven auto-sync for desktop split-stage
  if ("IntersectionObserver" in window) {
    const stageScrollObs = new IntersectionObserver(
      (entries) => {
        if (window.innerWidth < 960 || Date.now() < manualLockUntil) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.project;
          if (key && key !== activeProjectKey) {
            selectProject(key, false);
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0.01 },
    );
    projectItems.forEach((item) => stageScrollObs.observe(item));
  }

  stepButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clearStepTimers();
      setStageStep(Number(btn.dataset.stepBtn));
    });
  });

  if (stageReplay) {
    stageReplay.addEventListener("click", () => {
      runChoreography();
    });
  }

  selectProject("seed", true);

  /* ------------------------------------------------------------------------
     6. Acemap — Spring-Physics Interactive Particle Field (../../data/data.csv)
     ------------------------------------------------------------------------ */
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

  const CSV_COLORS = [
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

  const STUDIO_COLORS = [
    "#9333ea",
    "#65a30d",
    "#6366f1",
    "#ea580c",
    "#1d63ff",
    "#ca8a04",
    "#0284c7",
    "#b45309",
    "#0d9488",
    "#7e22ce",
    "#0ea5e9",
    "#059669",
    "#84cc16",
    "#16a34a",
    "#e11d48",
    "#dc2626",
    "#db2777",
    "#10b981",
    "#d97706",
  ];

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

  const loadBtn = $("#acemap-load-btn");
  const toolbar = $("#acemap-toolbar");
  const pillsWrap = $("#acemap-pills");
  const previewSvg = $("#acemap-preview-svg");
  const mapCanvas = $("#acemap-canvas");
  const canvasWrap = $("#acemap-canvas-wrap");
  const searchInput = $("#acemap-search");
  const clearSearchBtn = $("#acemap-clear-search");
  const statusEl = $("#acemap-status");
  const selectedReadout = $("#acemap-selected-readout");
  const tooltipEl = $("#acemap-tooltip");
  const tooltipDot = $("#tooltip-dot");
  const tooltipTitle = $("#tooltip-title");
  const tooltipField = $("#tooltip-field");

  let points = [];
  let globalBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  let activeField = -1;
  let searchQuery = "";
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let canvasW = 0;
  let canvasH = 0;
  let pointerInCanvas = false;
  let pointerX = -999;
  let pointerY = -999;
  let mapRafId = 0;
  let mapVisible = true;
  let pulsePhase = 0;

  function isPointVisible(p) {
    const fieldOk = activeField === -1 || p.field === activeField;
    if (!fieldOk) return false;
    if (!searchQuery) return true;
    return p.lower.includes(searchQuery);
  }

  function computeTargets(snapImmediate = false) {
    if (!points.length || !canvasW || !canvasH) return;
    const padX = Math.max(24, canvasW * 0.055);
    const padY = Math.max(24, canvasH * 0.075);

    // If a specific discipline is active, morph & zoom that cluster to center!
    let b = globalBounds;
    if (activeField >= 0) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (let i = 0; i < points.length; i++) {
        if (points[i].field !== activeField) continue;
        if (points[i].x < minX) minX = points[i].x;
        if (points[i].x > maxX) maxX = points[i].x;
        if (points[i].y < minY) minY = points[i].y;
        if (points[i].y > maxY) maxY = points[i].y;
      }
      if (minX < Infinity) {
        b = { minX, maxX, minY, maxY };
      }
    }

    const spanX = Math.max(b.maxX - b.minX, 1);
    const spanY = Math.max(b.maxY - b.minY, 1);
    const scale = Math.min(
      (canvasW - padX * 2) / spanX,
      (canvasH - padY * 2) / spanY,
    );
    const ox = (canvasW - spanX * scale) / 2;
    const oy = (canvasH - spanY * scale) / 2;

    const gSpanX = Math.max(globalBounds.maxX - globalBounds.minX, 1);
    const gSpanY = Math.max(globalBounds.maxY - globalBounds.minY, 1);
    const gScale = Math.min(
      (canvasW - padX * 2) / gSpanX,
      (canvasH - padY * 2) / gSpanY,
    );
    const gox = (canvasW - gSpanX * gScale) / 2;
    const goy = (canvasH - gSpanY * gScale) / 2;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (activeField === -1 || p.field === activeField) {
        p.tx = (p.x - b.minX) * scale + ox;
        p.ty = (p.y - b.minY) * scale + oy;
      } else {
        // Softly push non-selected points outward slightly for depth
        const gx = (p.x - globalBounds.minX) * gScale + gox;
        const gy = (p.y - globalBounds.minY) * gScale + goy;
        p.tx = canvasW * 0.5 + (gx - canvasW * 0.5) * 1.08;
        p.ty = canvasH * 0.5 + (gy - canvasH * 0.5) * 1.08;
      }
      if (snapImmediate || !motionEnabled) {
        p.px = p.tx;
        p.py = p.ty;
        p.vx = 0;
        p.vy = 0;
      }
    }
    updateStatusCount();
  }

  function updateStatusCount() {
    if (!statusEl || !points.length) return;
    let count = 0;
    for (let i = 0; i < points.length; i++) {
      if (isPointVisible(points[i])) count++;
    }
    const fieldLabel =
      activeField === -1 ? "All 19 disciplines" : ACEMAP_FIELDS[activeField];
    statusEl.textContent = searchQuery
      ? `${count.toLocaleString()} matches for “${searchInput.value.trim()}” · ${fieldLabel}`
      : `${fieldLabel} · ${count.toLocaleString()} topics`;
  }

  function stepPhysics() {
    let energy = 0;
    const repelR = 88;
    const repelR2 = repelR * repelR;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      // Hooke's law spring pull toward target
      let ax = (p.tx - p.px) * 0.12;
      let ay = (p.ty - p.py) * 0.12;

      // Cursor spring-repulsion (except the locked/hovered nearest topic which stays crisp)
      if (pointerInCanvas && i !== hoveredIdx && i !== selectedIdx) {
        const dx = p.px - pointerX;
        const dy = p.py - pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1 && d2 < repelR2) {
          const dist = Math.sqrt(d2);
          const force = ((1 - dist / repelR) ** 2) * 5.2;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }

      p.vx = (p.vx + ax) * 0.78;
      p.vy = (p.vy + ay) * 0.78;
      p.px += p.vx;
      p.py += p.vy;
      energy += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.tx - p.px) * 0.05;
    }
    return energy;
  }

  function drawAcemapFrame() {
    if (!mapCanvas || mapCanvas.hidden) return;
    const ctx = mapCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Subtle spatial grid dots
    ctx.fillStyle = "rgba(14, 23, 38, 0.045)";
    const gap = 36;
    for (let gx = gap / 2; gx < canvasW; gx += gap) {
      for (let gy = gap / 2; gy < canvasH; gy += gap) {
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }

    const hasSearch = searchQuery.length > 0;
    pulsePhase = (pulsePhase + 0.045) % (Math.PI * 2);

    // Pass 1: ambient dimmed points
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (isPointVisible(p)) continue;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 1.9, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 163, 184, 0.14)";
      ctx.fill();
    }

    // Pass 2: active points (+ live sonar pulse rings on search matches)
    const pulseWave = (Math.sin(pulsePhase) + 1) * 0.5;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!isPointVisible(p)) continue;
      const color = STUDIO_COLORS[p.field];
      const baseR = activeField >= 0 ? 3.5 : Math.min(4.6, Math.max(2.3, p.size * 0.48));
      const radius = hasSearch ? 4.3 : baseR;

      if (hasSearch) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius + 4 + pulseWave * 7, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.42 * (1 - pulseWave * 0.7);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = hasSearch ? 0.96 : 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pass 3: luminous magnetic focus rings
    const highlights = [];
    if (selectedIdx >= 0) highlights.push({ idx: selectedIdx, locked: true });
    if (hoveredIdx >= 0 && hoveredIdx !== selectedIdx) {
      highlights.push({ idx: hoveredIdx, locked: false });
    }
    highlights.forEach(({ idx, locked }) => {
      const p = points[idx];
      if (!p) return;
      const color = STUDIO_COLORS[p.field];
      ctx.beginPath();
      ctx.arc(p.px, p.py, locked ? 15 : 12, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(p.px, p.py, locked ? 6.8 : 5.8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });
  }

  function mapLoop() {
    mapRafId = 0;
    if (!points.length || mapCanvas.hidden || !mapVisible || document.hidden) return;
    if (!motionEnabled) {
      drawAcemapFrame();
      return;
    }
    const energy = stepPhysics();
    drawAcemapFrame();
    if (hoveredIdx >= 0) updateTooltip(hoveredIdx);
    else if (selectedIdx >= 0) updateTooltip(selectedIdx);

    if (energy > 0.65 || pointerInCanvas || searchQuery.length > 0) {
      mapRafId = requestAnimationFrame(mapLoop);
    }
  }

  syncAcemapLoop = () => {
    if (!points.length || mapCanvas.hidden) return;
    if (!motionEnabled) {
      cancelAnimationFrame(mapRafId);
      mapRafId = 0;
      computeTargets(true);
      drawAcemapFrame();
      return;
    }
    if (mapVisible && !document.hidden && !mapRafId) {
      mapRafId = requestAnimationFrame(mapLoop);
    }
  };

  function resizeAcemapCanvas() {
    if (!mapCanvas || !canvasWrap || mapCanvas.hidden) return;
    const rect = canvasWrap.getBoundingClientRect();
    canvasW = rect.width;
    canvasH = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    mapCanvas.width = Math.round(canvasW * dpr);
    mapCanvas.height = Math.round(canvasH * dpr);
    const ctx = mapCanvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeTargets(true);
    drawAcemapFrame();
  }

  function findNearestTopic(clientX, clientY, maxDist = 20) {
    const rect = mapCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = -1;
    let bestSq = maxDist * maxDist;
    for (let i = 0; i < points.length; i++) {
      if (!isPointVisible(points[i])) continue;
      const dx = points[i].px - x;
      const dy = points[i].py - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestSq) {
        bestSq = d2;
        best = i;
      }
    }
    return best;
  }

  function updateTooltip(idx) {
    if (!tooltipEl) return;
    if (idx < 0 || !points[idx]) {
      tooltipEl.hidden = true;
      return;
    }
    const p = points[idx];
    tooltipDot.style.background = STUDIO_COLORS[p.field];
    tooltipTitle.textContent = p.name;
    tooltipField.textContent = `${ACEMAP_FIELDS[p.field]} · #${p.id}`;
    tooltipEl.hidden = false;

    const tipW = tooltipEl.offsetWidth || 180;
    const tipH = tooltipEl.offsetHeight || 52;
    let tx = p.px + 14;
    let ty = p.py - tipH - 12;
    if (tx + tipW > canvasW - 10) tx = p.px - tipW - 14;
    if (tx < 10) tx = 10;
    if (ty < 10) ty = p.py + 16;
    tooltipEl.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(ty)}px, 0)`;
  }

  function buildFieldPills() {
    if (!pillsWrap) return;
    const counts = new Array(ACEMAP_FIELDS.length).fill(0);
    points.forEach((p) => counts[p.field]++);

    const frag = document.createDocumentFragment();
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "field-pill is-active";
    allBtn.dataset.field = "-1";
    allBtn.innerHTML = `<span>All disciplines</span><span class="field-pill-count">${points.length.toLocaleString()}</span>`;
    frag.appendChild(allBtn);

    ACEMAP_FIELDS.forEach((name, idx) => {
      if (!counts[idx]) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "field-pill";
      btn.dataset.field = String(idx);
      btn.innerHTML = `<span class="field-pill-dot" style="background:${STUDIO_COLORS[idx]}"></span><span>${name}</span><span class="field-pill-count">${counts[idx]}</span>`;
      frag.appendChild(btn);
    });

    pillsWrap.replaceChildren(frag);
    pillsWrap.hidden = false;

    pillsWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".field-pill");
      if (!btn) return;
      activeField = Number(btn.dataset.field);
      hoveredIdx = -1;
      selectedIdx = -1;
      updateTooltip(-1);
      $$(".field-pill", pillsWrap).forEach((b) =>
        b.classList.toggle("is-active", b === btn),
      );
      computeTargets(false);
      syncAcemapLoop();
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", async () => {
      loadBtn.disabled = true;
      loadBtn.querySelector("span").textContent = "Loading dataset…";
      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Failed to load CSV");
        const rows = parseCSV(await res.text()).slice(1);
        points = rows
          .map((r) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            size: Number(r[2]) || 4,
            name: r[3] || "",
            lower: (r[3] || "").toLowerCase(),
            field: CSV_COLORS.indexOf(r[4]),
            id: r[5] || "",
            px: 0,
            py: 0,
            tx: 0,
            ty: 0,
            vx: 0,
            vy: 0,
          }))
          .filter(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
          );

        if (!points.length) throw new Error("No points parsed");

        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        for (let i = 0; i < points.length; i++) {
          if (points[i].x < minX) minX = points[i].x;
          if (points[i].x > maxX) maxX = points[i].x;
          if (points[i].y < minY) minY = points[i].y;
          if (points[i].y > maxY) maxY = points[i].y;
        }
        globalBounds = { minX, maxX, minY, maxY };

        previewSvg.hidden = true;
        mapCanvas.hidden = false;
        toolbar.hidden = false;
        loadBtn.hidden = true;

        buildFieldPills();
        resizeAcemapCanvas();

        // Spring bloom entrance from center!
        if (motionEnabled) {
          for (let i = 0; i < points.length; i++) {
            points[i].px = canvasW * 0.5 + (Math.random() - 0.5) * 40;
            points[i].py = canvasH * 0.5 + (Math.random() - 0.5) * 40;
          }
          syncAcemapLoop();
        }

        if ("IntersectionObserver" in window) {
          new IntersectionObserver(([entry]) => {
            mapVisible = entry.isIntersecting;
            syncAcemapLoop();
          }).observe(canvasWrap);
        }

        if ("ResizeObserver" in window) {
          new ResizeObserver(resizeAcemapCanvas).observe(canvasWrap);
        } else {
          window.addEventListener("resize", resizeAcemapCanvas, { passive: true });
        }

        mapCanvas.addEventListener("pointermove", (e) => {
          const rect = mapCanvas.getBoundingClientRect();
          pointerInCanvas = true;
          pointerX = e.clientX - rect.left;
          pointerY = e.clientY - rect.top;
          hoveredIdx = findNearestTopic(e.clientX, e.clientY, 20);
          updateTooltip(hoveredIdx >= 0 ? hoveredIdx : selectedIdx);
          syncAcemapLoop();
        });

        mapCanvas.addEventListener("pointerleave", () => {
          pointerInCanvas = false;
          hoveredIdx = -1;
          updateTooltip(selectedIdx);
          syncAcemapLoop();
        });

        mapCanvas.addEventListener("click", (e) => {
          const idx = findNearestTopic(e.clientX, e.clientY, 24);
          selectedIdx = idx;
          updateTooltip(idx);
          if (idx >= 0 && selectedReadout) {
            const p = points[idx];
            selectedReadout.textContent = `Selected: ${p.name} · ${ACEMAP_FIELDS[p.field]} (ID ${p.id})`;
          } else if (selectedReadout) {
            selectedReadout.textContent =
              "Hover to repel & focus particles, or click any point to lock details.";
          }
          syncAcemapLoop();
        });
      } catch {
        loadBtn.disabled = false;
        loadBtn.querySelector("span").textContent = "Retry loading 2,208 topics";
        if (selectedReadout) {
          selectedReadout.textContent =
            "Could not load ../../data/data.csv. Check local server or visit Acemap directly.";
        }
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      if (clearSearchBtn) clearSearchBtn.hidden = searchQuery.length === 0;
      hoveredIdx = -1;
      selectedIdx = -1;
      updateTooltip(-1);
      updateStatusCount();
      syncAcemapLoop();
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      clearSearchBtn.hidden = true;
      updateStatusCount();
      syncAcemapLoop();
      searchInput.focus();
    });
  }

  /* ------------------------------------------------------------------------
     7. Tactile Segmented-Pill Publications Filter
     ------------------------------------------------------------------------ */
  const pubSegmented = $("#pub-segmented");
  const pubThumb = $("#pub-thumb");
  const segButtons = $$("#pub-segmented .seg-btn");
  const pubGroups = $$(".publication-group");
  const pubCountNum = $("#pub-count-num");
  const pubCountLabel = $("#pub-count-label");

  function positionPubThumb(activeBtn) {
    if (!pubThumb || !pubSegmented || !activeBtn) return;
    const parentRect = pubSegmented.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    pubThumb.style.width = `${Math.round(btnRect.width)}px`;
    pubThumb.style.transform = `translateX(${Math.round(btnRect.left - parentRect.left - 5)}px)`;
  }

  function filterPublications(kind) {
    let activeBtn = null;
    segButtons.forEach((btn) => {
      const isMatch = btn.dataset.filter === kind;
      btn.classList.toggle("is-active", isMatch);
      btn.setAttribute("aria-pressed", String(isMatch));
      if (isMatch) activeBtn = btn;
    });
    positionPubThumb(activeBtn);

    const years = [];
    let count = 0;
    pubGroups.forEach((group) => {
      const show = kind === "all" || group.dataset.kind === kind;
      group.hidden = !show;
      if (show) {
        const items = $$(".publication", group);
        count += items.length;
        items.forEach((item) => {
          const y = Number($(".publication-year", item)?.textContent);
          if (Number.isFinite(y)) years.push(y);
        });
      }
    });

    if (pubCountNum && pubCountLabel) {
      pubCountNum.textContent = String(count);
      pubCountNum.classList.remove("is-bumping");
      void pubCountNum.offsetWidth;
      pubCountNum.classList.add("is-bumping");
      setTimeout(() => pubCountNum.classList.remove("is-bumping"), 260);
      const minY = years.length ? Math.min(...years) : 2019;
      const maxY = years.length ? Math.max(...years) : 2023;
      const suffix = kind === "all" ? "publications" : `${kind} publications`;
      pubCountLabel.textContent = `${suffix} · ${minY}–${maxY}`;
    }
  }

  segButtons.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
    else filterPublications("all");
  }

  window.addEventListener("hashchange", syncPubAnchor);
  window.addEventListener(
    "resize",
    () => {
      const active = $("#pub-segmented .seg-btn.is-active");
      positionPubThumb(active);
    },
    { passive: true },
  );
  syncPubAnchor();
})();
