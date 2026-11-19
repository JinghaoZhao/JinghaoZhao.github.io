(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotion.matches;

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  let syncHeroScene = () => {};
  let syncAcemapLoop = () => {};

  function applyMotionPreference() {
    motionEnabled = !reduceMotion.matches;
    if (!motionEnabled) {
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
      $$(".bento-card").forEach((card) => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    }
    syncHeroScene();
    syncAcemapLoop();
  }
  reduceMotion.addEventListener("change", applyMotionPreference);
  applyMotionPreference();

  // =========================
  // 1. REVEAL & SCROLL SPY
  // =========================
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
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("is-pending");
      }
      revealObs.observe(el);
    });
  }

  const header = $("#site-header");
  const hero = $("#large-header");
  const heroContent = $(".hero-content");
  const navLinks = $$(".site-nav a");
  const navSections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);

  // Exploded-view scroll choreography references
  const explodeTrack = $("#explode-track");
  const computeStage = $("#compute-stage");
  const explodeToggle = $("#explode-toggle");
  const stackReadout = $("#stack-readout");
  const stackChapters = $$(".stack-chapter");
  const hwSlabs = $$(".hw-slab");
  let manualExplodeOverride = null; // null = scroll-driven, true/false = user toggled
  let manualLayerTime = 0;

  const layerNames = {
    "1": "LAYER 01 // HOST & FABRIC",
    "2": "LAYER 02 // FLEET LIFECYCLE",
    "3": "LAYER 03 // END-TO-END BEHAVIOR",
  };

  function selectLayer(layerId, fromUser = false) {
    if (!computeStage || !layerNames[layerId]) return;
    if (fromUser) manualLayerTime = performance.now();
    computeStage.dataset.activeLayer = layerId;
    if (stackReadout) stackReadout.textContent = layerNames[layerId];
    stackChapters.forEach((btn) => {
      const active = btn.dataset.layer === layerId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    const vh = window.innerHeight || 800;

    if (header) header.classList.toggle("is-scrolled", y > 36);

    let activeId = "";
    navSections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= vh * 0.36) {
        activeId = sec.id;
      }
    });
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#" + activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (hero && heroContent) {
      heroContent.style.transform =
        motionEnabled && y < hero.offsetHeight
          ? `translateY(${Math.min(y * 0.1, 70)}px)`
          : "";
    }

    // Scroll-choreographed 3D Exploded-View Bare Metal Stack
    if (explodeTrack && computeStage && window.innerWidth > 1040) {
      const rect = explodeTrack.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (vh * 0.72 - rect.top) / (rect.height + vh * 0.2)),
      );
      if (manualExplodeOverride === null) {
        const explodedVal = motionEnabled ? 0.22 + progress * 0.88 : 0.75;
        computeStage.style.setProperty("--explode", explodedVal.toFixed(3));
      }
      // Auto-select chapter closest to viewport center if user hasn't just clicked
      if (performance.now() - manualLayerTime > 1200 && rect.top < vh * 0.75 && rect.bottom > vh * 0.2) {
        let bestLayer = null;
        let bestDist = Infinity;
        const center = vh * 0.44;
        stackChapters.forEach((ch) => {
          const r = ch.getBoundingClientRect();
          const d = Math.abs(r.top + r.height * 0.5 - center);
          if (d < bestDist) {
            bestDist = d;
            bestLayer = ch.dataset.layer;
          }
        });
        if (bestLayer) selectLayer(bestLayer, false);
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
  updateScroll();

  // =========================
  // 2. HERO 3D-PROJECTED ISOMETRIC SILICON WAFER & PACKET-BEAM CANVAS
  // =========================
  function initHeroWaferCanvas() {
    const canvas = $("#hero-canvas");
    const tiltReadout = $("#hero-tilt-readout");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let visible = true;

    let pointerActive = false;
    let targetRotX = 0.92;
    let targetRotY = -0.34;
    let rotX = 0.92;
    let rotY = -0.34;

    // Precompute wafer die cells & packet beams in 3D wafer local coords
    const dies = [];
    const beams = [];
    let seed = 419;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const gridRadius = 4;
    for (let gx = -gridRadius; gx <= gridRadius; gx++) {
      for (let gy = -gridRadius; gy <= gridRadius; gy++) {
        const dist = Math.hypot(gx, gy);
        if (dist <= 3.75 && dist >= 1.1) {
          dies.push({
            gx,
            gy,
            dist,
            phase: rand() * Math.PI * 2,
            raised: (Math.abs(gx) + Math.abs(gy)) % 2 === 0 ? 1 : 0,
          });
        }
      }
    }

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      beams.push({
        angle,
        t: rand(),
        speed: 0.24 + rand() * 0.28,
        inbound: i % 2 === 0,
      });
    }

    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function project3D(x, y, z, cx, cy, fov) {
      // Rotate around Y then X
      const cyR = Math.cos(rotY);
      const syR = Math.sin(rotY);
      const cxR = Math.cos(rotX);
      const sxR = Math.sin(rotX);

      const x1 = x * cyR + z * syR;
      const z1 = -x * syR + z * cyR;
      const y2 = y * cxR - z1 * sxR;
      const z2 = y * sxR + z1 * cxR;

      const scale = fov / (fov + z2 + 340);
      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
        z: z2,
        scale,
      };
    }

    function drawPoly(pts, fill, stroke, lineWidth = 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const t = elapsed * 0.001;
      const waferR = Math.min(width, height) * (width < 700 ? 0.4 : 0.37);
      const cx = width < 760 ? width * 0.52 : width * 0.68;
      const cy = width < 760 ? height * 0.74 : height * 0.5;
      const fov = Math.max(580, waferR * 2.9);

      // Dramatic volumetric core aura
      const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, waferR * 1.45);
      aura.addColorStop(0, "rgba(99, 216, 255, 0.2)");
      aura.addColorStop(0.42, "rgba(59, 130, 246, 0.09)");
      aura.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      // Draw circular silicon wafer substrate rings (base + bevel)
      const ringSegs = 56;
      const drawWaferRing = (radius, z, fill, stroke, lw = 1.2) => {
        const pts = [];
        for (let i = 0; i < ringSegs; i++) {
          const a = (i / ringSegs) * Math.PI * 2;
          pts.push(project3D(Math.cos(a) * radius, Math.sin(a) * radius, z, cx, cy, fov));
        }
        drawPoly(pts, fill, stroke, lw);
      };

      // Extruded bottom wafer disc
      drawWaferRing(waferR, -14, "rgba(7, 14, 28, 0.85)", "rgba(59, 130, 246, 0.28)", 1);
      // Top polished silicon wafer disc
      const specShift = Math.sin(rotY * 2.2) * waferR * 0.45;
      const waferGrad = ctx.createLinearGradient(
        cx - waferR + specShift,
        cy - waferR * 0.6,
        cx + waferR + specShift,
        cy + waferR * 0.6,
      );
      waferGrad.addColorStop(0, "rgba(13, 25, 48, 0.92)");
      waferGrad.addColorStop(0.48, "rgba(25, 56, 98, 0.88)");
      waferGrad.addColorStop(0.54, "rgba(99, 216, 255, 0.28)");
      waferGrad.addColorStop(0.62, "rgba(16, 34, 64, 0.9)");
      waferGrad.addColorStop(1, "rgba(8, 15, 30, 0.94)");
      drawWaferRing(waferR, 0, waferGrad, "rgba(120, 216, 255, 0.45)", 1.5);

      // Etched concentric precision rings
      drawWaferRing(waferR * 0.84, 1, null, "rgba(99, 216, 255, 0.16)", 1);
      drawWaferRing(waferR * 0.62, 1, null, "rgba(99, 216, 255, 0.14)", 1);
      drawWaferRing(waferR * 0.36, 2, null, "rgba(99, 216, 255, 0.24)", 1.1);

      // Draw machined micro-die grid on wafer surface
      const cell = waferR * 0.21;
      const half = cell * 0.38;
      for (let i = 0; i < dies.length; i++) {
        const d = dies[i];
        const bx = d.gx * cell;
        const by = d.gy * cell;
        const pulse = Math.sin(t * 1.4 + d.phase) * 0.5 + 0.5;
        const z = 2 + d.raised * 5 + pulse * 2.5;
        const pts = [
          project3D(bx - half, by - half, z, cx, cy, fov),
          project3D(bx + half, by - half, z, cx, cy, fov),
          project3D(bx + half, by + half, z, cx, cy, fov),
          project3D(bx - half, by + half, z, cx, cy, fov),
        ];
        const lum = 0.08 + pulse * 0.16 + d.raised * 0.08;
        drawPoly(
          pts,
          `rgba(24, 62, 112, ${(0.35 + lum).toFixed(2)})`,
          `rgba(99, 216, 255, ${(0.14 + pulse * 0.34).toFixed(2)})`,
          0.9,
        );
      }

      // Draw radial packet beams streaking between perimeter pins & central die
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        const pos = (b.t + t * b.speed) % 1;
        const rStart = b.inbound
          ? waferR * (0.98 - pos * 0.68)
          : waferR * (0.3 + pos * 0.68);
        const rTail = b.inbound
          ? Math.min(waferR * 0.98, rStart + waferR * 0.22)
          : Math.max(waferR * 0.3, rStart - waferR * 0.22);

        const pHead = project3D(
          Math.cos(b.angle) * rStart,
          Math.sin(b.angle) * rStart,
          7,
          cx,
          cy,
          fov,
        );
        const pTail = project3D(
          Math.cos(b.angle) * rTail,
          Math.sin(b.angle) * rTail,
          7,
          cx,
          cy,
          fov,
        );

        const g = ctx.createLinearGradient(pTail.x, pTail.y, pHead.x, pHead.y);
        g.addColorStop(0, "rgba(99, 216, 255, 0)");
        g.addColorStop(1, "rgba(180, 242, 255, 0.95)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pTail.x, pTail.y);
        ctx.lineTo(pHead.x, pHead.y);
        ctx.stroke();

        ctx.fillStyle = "#e8faff";
        ctx.beginPath();
        ctx.arc(pHead.x, pHead.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Raised Central Bare Metal Silicon Die (3D extruded prism)
      const dieS = waferR * 0.22;
      const dieH = 22 + Math.sin(t * 1.8) * 3;
      const basePts = [
        project3D(-dieS, -dieS, 2, cx, cy, fov),
        project3D(dieS, -dieS, 2, cx, cy, fov),
        project3D(dieS, dieS, 2, cx, cy, fov),
        project3D(-dieS, dieS, 2, cx, cy, fov),
      ];
      const topPts = [
        project3D(-dieS, -dieS, dieH, cx, cy, fov),
        project3D(dieS, -dieS, dieH, cx, cy, fov),
        project3D(dieS, dieS, dieH, cx, cy, fov),
        project3D(-dieS, dieS, dieH, cx, cy, fov),
      ];

      // Side extrusions
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        drawPoly(
          [basePts[i], basePts[next], topPts[next], topPts[i]],
          i % 2 === 0 ? "rgba(18, 48, 88, 0.9)" : "rgba(11, 29, 58, 0.92)",
          "rgba(99, 216, 255, 0.45)",
          1,
        );
      }

      // Top luminous specular silicon core
      const topGrad = ctx.createLinearGradient(
        topPts[0].x,
        topPts[0].y,
        topPts[2].x,
        topPts[2].y,
      );
      topGrad.addColorStop(0, "#b8f2ff");
      topGrad.addColorStop(0.5, "#63d8ff");
      topGrad.addColorStop(1, "#2563eb");
      drawPoly(topPts, topGrad, "#e6faff", 1.5);

      // Inner die hairline frame
      const inS = dieS * 0.65;
      const innerPts = [
        project3D(-inS, -inS, dieH + 1, cx, cy, fov),
        project3D(inS, -inS, dieH + 1, cx, cy, fov),
        project3D(inS, inS, dieH + 1, cx, cy, fov),
        project3D(-inS, inS, dieH + 1, cx, cy, fov),
      ];
      drawPoly(innerPts, null, "rgba(5, 16, 36, 0.55)", 1.2);

      // Update live gyro readout
      if (tiltReadout) {
        const pitchDeg = ((rotX - 0.92) * 57.3).toFixed(1);
        const yawDeg = ((rotY + 0.34) * 57.3).toFixed(1);
        tiltReadout.textContent = `PITCH ${Number(pitchDeg) >= 0 ? "+" : ""}${pitchDeg}° · YAW ${Number(yawDeg) >= 0 ? "+" : ""}${yawDeg}°`;
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime || now - lastTime >= 32) {
        elapsed += lastTime ? Math.min(now - lastTime, 64) : 0;
        lastTime = now;

        if (!pointerActive) {
          // Smooth autonomous orbital drift on touch/mobile or idle
          const t = elapsed * 0.00055;
          targetRotX = 0.92 + Math.sin(t * 1.1) * 0.14;
          targetRotY = -0.34 + Math.cos(t * 0.85) * 0.22;
        }
        rotX += (targetRotX - rotX) * 0.075;
        rotY += (targetRotY - rotY) * 0.075;
        draw();
      }
      rafId = requestAnimationFrame(tick);
    }

    syncHeroScene = () => {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    };

    hero.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        pointerActive = true;
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        targetRotX = 0.92 - ny * 0.26;
        targetRotY = -0.34 + nx * 0.36;
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", () => {
      pointerActive = false;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
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
    initHeroWaferCanvas();
  } catch {
    // Decorative canvas must never block content.
  }

  // =========================
  // 3. INTERACTIVE 3D EXPLODED-VIEW STACK CONTROLS
  // =========================
  stackChapters.forEach((btn) => {
    btn.addEventListener("click", () => selectLayer(btn.dataset.layer, true));
    btn.addEventListener("mouseenter", () => {
      if (finePointer.matches) selectLayer(btn.dataset.layer, true);
    });
  });

  hwSlabs.forEach((slab) => {
    const id = slab.dataset.isoLayer;
    slab.addEventListener("click", () => selectLayer(id, true));
    slab.addEventListener("mouseenter", () => {
      if (finePointer.matches) selectLayer(id, true);
    });
    slab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectLayer(id, true);
      }
    });
  });

  if (explodeToggle && computeStage) {
    explodeToggle.addEventListener("click", () => {
      const nextExploded = explodeToggle.getAttribute("aria-pressed") !== "true";
      manualExplodeOverride = nextExploded;
      explodeToggle.setAttribute("aria-pressed", String(nextExploded));
      explodeToggle.textContent = nextExploded ? "Exploded" : "Assembled";
      computeStage.style.setProperty("--explode", nextExploded ? "1" : "0.08");
    });
  }

  // Subtle interactive 3D pointer parallax on the isometric hardware viewport
  const isoViewport = $("#iso-viewport");
  const isoAssembly = $("#iso-assembly");
  if (isoViewport && isoAssembly && finePointer.matches) {
    isoViewport.addEventListener(
      "pointermove",
      (e) => {
        if (!motionEnabled) return;
        const rect = isoViewport.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        const rx = 58 - ny * 7;
        const rz = -45 + nx * 10;
        isoAssembly.style.transform = `rotateX(${rx.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) translateZ(calc(-20px * var(--explode, 0.72)))`;
      },
      { passive: true },
    );
    isoViewport.addEventListener("pointerleave", () => {
      isoAssembly.style.transform = "";
    });
  }

  // =========================
  // 4. 3D PERSPECTIVE TILT + MOVING SPECULAR GLARE ON BENTO CARDS
  // =========================
  if (finePointer.matches) {
    $$(".bento-card").forEach((card) => {
      const maxTilt = card.classList.contains("acemap-card") || card.classList.contains("cme-card") ? 2.2 : 4.5;
      card.addEventListener(
        "pointermove",
        (e) => {
          if (!motionEnabled) return;
          const rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty("--mx", `${x.toFixed(1)}px`);
          card.style.setProperty("--my", `${y.toFixed(1)}px`);
          const nx = (x / rect.width) * 2 - 1;
          const ny = (y / rect.height) * 2 - 1;
          card.style.setProperty("--rx", `${(-ny * maxTilt).toFixed(2)}deg`);
          card.style.setProperty("--ry", `${(nx * maxTilt).toFixed(2)}deg`);
        },
        { passive: true },
      );
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  // =========================
  // 5. ACEMAP WARP-SPEED STARFIELD CANVAS
  // =========================
  const acemapCanvas = $("#acemap-canvas");
  const starfieldStage = $("#starfield-stage");
  const mapLoadBtn = $("#map-load");
  const mapControls = $("#map-controls");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  const mapStatus = $("#map-status");
  const hudMode = $("#hud-mode");
  const hudReadout = $("#hud-readout");
  const tooltip = $("#starfield-tooltip");

  const FIELDS = [
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

  const SOURCE_COLORS = [
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

  let acemapLoaded = false;
  let acemapVisible = false;
  let points = [];
  let selectedField = "all";
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let mapW = 600;
  let mapH = 375;
  let warpProgress = 0;
  let warpStartTime = 0;
  let acemapRaf = 0;
  let acemapLast = 0;

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

  let bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  function projectPoints() {
    const padX = 28;
    const padTop = 36;
    const padBot = 24;
    const availW = mapW - padX * 2;
    const availH = mapH - padTop - padBot;
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanY = bounds.maxY - bounds.minY || 1;
    const scale = Math.min(availW / spanX, availH / spanY);
    const offX = padX + (availW - spanX * scale) / 2;
    const offY = padTop + (availH - spanY * scale) / 2;
    for (let i = 0; i < points.length; i++) {
      points[i].px = (points[i].x - bounds.minX) * scale + offX;
      points[i].py = (points[i].y - bounds.minY) * scale + offY;
    }
  }

  function resizeAcemapCanvas() {
    if (!acemapCanvas || !starfieldStage) return;
    const rect = starfieldStage.getBoundingClientRect();
    mapW = Math.max(300, rect.width);
    mapH = Math.max(200, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    acemapCanvas.width = Math.round(mapW * dpr);
    acemapCanvas.height = Math.round(mapH * dpr);
    const ctx = acemapCanvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (acemapLoaded && points.length) {
      projectPoints();
      renderStarfield(performance.now());
    } else {
      renderStandbyPreview(performance.now());
    }
  }

  function renderStandbyPreview(now) {
    if (!acemapCanvas) return;
    const ctx = acemapCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, mapW, mapH);

    const t = motionEnabled ? now * 0.00035 : 0;
    const cx = mapW / 2;
    const cy = mapH / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(99, 216, 255, 0.2)";
    ctx.lineWidth = 1;
    [
      [mapW * 0.33, mapH * 0.28, -0.36 + t * 0.3],
      [mapW * 0.25, mapH * 0.36, 0.52 - t * 0.25],
      [mapW * 0.16, mapH * 0.38, 0.95 + t * 0.2],
    ].forEach(([rx, ry, rot]) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.stroke();
    });

    const stars = [
      [0.24, 0.34, 4.5, "#63d8ff"],
      [0.5, 0.18, 3.5, "#beeb74"],
      [0.74, 0.3, 5, "#ffbd71"],
      [0.78, 0.64, 3.5, "#ffc1fc"],
      [0.52, 0.82, 4.5, "#5eebc7"],
      [0.25, 0.72, 3.5, "#e0d4ff"],
      [0.5, 0.5, 6.5, "#63d8ff"],
    ];

    ctx.strokeStyle = "rgba(99, 216, 255, 0.22)";
    ctx.beginPath();
    for (let i = 0; i < stars.length - 1; i++) {
      const a = stars[i];
      const b = stars[(i + 1) % (stars.length - 1)];
      ctx.moveTo(a[0] * mapW, a[1] * mapH);
      ctx.lineTo(b[0] * mapW, b[1] * mapH);
    }
    ctx.stroke();

    stars.forEach(([sx, sy, r, col], i) => {
      const x = sx * mapW;
      const y = sy * mapH;
      const pulse = 1 + Math.sin(t * 4 + i) * 0.18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.6 * pulse);
      g.addColorStop(0, col);
      g.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.6 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#eef4fc";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function isActivePoint(i) {
    return selectedField === "all" || points[i].field === Number(selectedField);
  }

  function findNearestNeighbors(idx, count) {
    const target = points[idx];
    const best = [];
    for (let i = 0; i < points.length; i++) {
      if (i === idx || !isActivePoint(i)) continue;
      const dx = points[i].px - target.px;
      const dy = points[i].py - target.py;
      const d2 = dx * dx + dy * dy;
      if (best.length < count || d2 < best[best.length - 1].d2) {
        best.push({ i, d2 });
        best.sort((a, b) => a.d2 - b.d2);
        if (best.length > count) best.pop();
      }
    }
    return best;
  }

  function renderStarfield(now) {
    if (!acemapCanvas) return;
    const ctx = acemapCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, mapW, mapH);

    const cx = mapW * 0.5;
    const cy = mapH * 0.5;
    const ease = 1 - Math.pow(1 - warpProgress, 3);
    const isWarping = warpProgress < 0.999;

    // Inactive background dust
    for (let i = 0; i < points.length; i++) {
      if (isActivePoint(i)) continue;
      const p = points[i];
      const x = cx + (p.px - cx) * ease;
      const y = cy + (p.py - cy) * ease;
      ctx.fillStyle = "rgba(143, 163, 189, 0.08)";
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }

    // Active stars (with warp-speed radial streaks during burst)
    const twinkleT = now * 0.002;
    for (let i = 0; i < points.length; i++) {
      if (!isActivePoint(i)) continue;
      const p = points[i];
      const x = cx + (p.px - cx) * ease;
      const y = cy + (p.py - cy) * ease;

      if (isWarping) {
        const tailFactor = Math.max(0, ease - (1 - warpProgress) * 0.34);
        const tx = cx + (p.px - cx) * tailFactor;
        const ty = cy + (p.py - cy) * tailFactor;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.68;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      const tw = motionEnabled ? 0.72 + Math.sin(twinkleT + p.phase) * 0.24 : 0.88;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(x, y, 1.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Live glowing edges to 6 nearest neighbors on hover / select
    const focusIdx = hoveredIdx >= 0 ? hoveredIdx : selectedIdx;
    if (!isWarping && focusIdx >= 0 && points[focusIdx]) {
      const p = points[focusIdx];
      const neighbors = findNearestNeighbors(focusIdx, 6);

      ctx.strokeStyle = "rgba(99, 216, 255, 0.55)";
      ctx.lineWidth = 1.15;
      neighbors.forEach(({ i }) => {
        const n = points[i];
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(n.px, n.py);
        ctx.stroke();

        ctx.fillStyle = "#eef4fc";
        ctx.beginPath();
        ctx.arc(n.px, n.py, 2.7, 0, Math.PI * 2);
        ctx.fill();
      });

      const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, 20);
      glow.addColorStop(0, "rgba(99, 216, 255, 0.62)");
      glow.addColorStop(1, "rgba(99, 216, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#63d8ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tickAcemap(now) {
    acemapRaf = 0;
    if (!motionEnabled || !acemapVisible || document.hidden) {
      acemapLast = 0;
      return;
    }
    if (!acemapLast || now - acemapLast >= 32) {
      acemapLast = now;
      if (acemapLoaded) {
        if (warpProgress < 1) {
          warpProgress = Math.min(1, (now - warpStartTime) / 1350);
          if (warpProgress >= 1 && hudMode) {
            hudMode.textContent = "LIVE // CONSTELLATION LOCKED";
          }
        }
        renderStarfield(now);
      } else {
        renderStandbyPreview(now);
      }
    }
    acemapRaf = requestAnimationFrame(tickAcemap);
  }

  syncAcemapLoop = () => {
    if (motionEnabled && acemapVisible && !document.hidden) {
      if (!acemapRaf) acemapRaf = requestAnimationFrame(tickAcemap);
    } else {
      if (acemapRaf) cancelAnimationFrame(acemapRaf);
      acemapRaf = 0;
      acemapLast = 0;
      if (acemapLoaded) {
        warpProgress = 1;
        renderStarfield(performance.now());
      } else {
        renderStandbyPreview(performance.now());
      }
    }
  };

  function findNearestPointerPoint(clientX, clientY, maxDist) {
    const rect = acemapCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = -1;
    let bestD2 = maxDist * maxDist;
    for (let i = 0; i < points.length; i++) {
      if (!isActivePoint(i)) continue;
      const dx = points[i].px - x;
      const dy = points[i].py - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  function syncFieldFilter() {
    selectedField = fieldSelect.value;
    hoveredIdx = -1;
    selectedIdx = -1;
    if (tooltip) tooltip.hidden = true;
    topicSelect.replaceChildren(new Option("Choose a topic", ""));

    let count = 0;
    for (let i = 0; i < points.length; i++) {
      if (isActivePoint(i)) {
        count++;
        topicSelect.add(new Option(points[i].name, String(i)));
      }
    }
    const label =
      selectedField === "all" ? "All fields" : FIELDS[Number(selectedField)];
    if (mapStatus) {
      mapStatus.textContent = `${label} · ${count.toLocaleString()} topics.`;
    }
    if (hudReadout) {
      hudReadout.textContent = `${label.toUpperCase()} · ${count.toLocaleString()} NODES`;
    }
    renderStarfield(performance.now());
  }

  if (mapLoadBtn && acemapCanvas) {
    if ("IntersectionObserver" in window && starfieldStage) {
      new IntersectionObserver(([entry]) => {
        acemapVisible = entry.isIntersecting;
        syncAcemapLoop();
      }).observe(starfieldStage);
    }
    if ("ResizeObserver" in window && starfieldStage) {
      new ResizeObserver(resizeAcemapCanvas).observe(starfieldStage);
    } else {
      window.addEventListener("resize", resizeAcemapCanvas, { passive: true });
    }
    resizeAcemapCanvas();

    mapLoadBtn.addEventListener("click", async () => {
      mapLoadBtn.disabled = true;
      mapLoadBtn.textContent = "Engaging warp…";
      if (mapStatus) mapStatus.textContent = "Fetching ../../data/data.csv…";
      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Dataset unavailable");
        const rows = parseCSV(await res.text()).slice(1);
        points = rows
          .map((r, idx) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            name: r[3],
            color: r[4],
            field: SOURCE_COLORS.indexOf(r[4]),
            phase: (idx * 1.618) % (Math.PI * 2),
            px: 0,
            py: 0,
          }))
          .filter(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
          );
        if (!points.length) throw new Error("Empty dataset");

        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        bounds = {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
        };

        acemapLoaded = true;
        warpStartTime = performance.now();
        warpProgress = motionEnabled ? 0 : 1;

        FIELDS.forEach((name, i) => {
          fieldSelect.add(new Option(name, String(i)));
        });

        mapLoadBtn.hidden = true;
        if (mapControls) mapControls.hidden = false;
        if (hudMode) {
          hudMode.textContent = motionEnabled
            ? "WARP BURST // EXPANDING"
            : "LIVE // CONSTELLATION LOCKED";
        }

        projectPoints();
        syncFieldFilter();
        syncAcemapLoop();
        fieldSelect.focus({ preventScroll: true });
      } catch {
        mapLoadBtn.disabled = false;
        mapLoadBtn.textContent = "Retry warp starfield ↗";
        if (mapStatus) {
          mapStatus.textContent =
            "Could not load data.csv locally. Use a local server or visit Acemap directly.";
        }
      }
    });

    fieldSelect.addEventListener("change", syncFieldFilter);

    topicSelect.addEventListener("change", () => {
      selectedIdx = topicSelect.value === "" ? -1 : Number(topicSelect.value);
      hoveredIdx = -1;
      if (tooltip) tooltip.hidden = true;
      if (selectedIdx >= 0 && points[selectedIdx]) {
        const p = points[selectedIdx];
        if (mapStatus) mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
        if (hudReadout) {
          hudReadout.textContent = `${p.name.toUpperCase()} // ${FIELDS[p.field].toUpperCase()}`;
        }
      } else {
        syncFieldFilter();
        return;
      }
      renderStarfield(performance.now());
    });

    acemapCanvas.addEventListener("pointermove", (e) => {
      if (!acemapLoaded || warpProgress < 0.98) return;
      const idx = findNearestPointerPoint(e.clientX, e.clientY, 18);
      if (idx === hoveredIdx) return;
      hoveredIdx = idx;
      renderStarfield(performance.now());

      if (idx >= 0 && points[idx]) {
        const p = points[idx];
        if (mapStatus) mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
        if (tooltip) {
          tooltip.textContent = `${p.name} · ${FIELDS[p.field]}`;
          tooltip.hidden = false;
          const left = Math.min(mapW - 220, Math.max(12, p.px + 12));
          const top = Math.max(36, p.py - 34);
          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      } else if (tooltip) {
        tooltip.hidden = true;
      }
    });

    acemapCanvas.addEventListener("pointerleave", () => {
      if (!acemapLoaded) return;
      hoveredIdx = -1;
      if (tooltip) tooltip.hidden = true;
      renderStarfield(performance.now());
    });

    acemapCanvas.addEventListener("click", (e) => {
      if (!acemapLoaded || warpProgress < 0.98) return;
      const idx = findNearestPointerPoint(e.clientX, e.clientY, 24);
      if (idx < 0) return;
      selectedIdx = idx;
      topicSelect.value = String(idx);
      const p = points[idx];
      if (mapStatus) mapStatus.textContent = `${p.name} · ${FIELDS[p.field]}`;
      if (hudReadout) {
        hudReadout.textContent = `${p.name.toUpperCase()} // ${FIELDS[p.field].toUpperCase()}`;
      }
      renderStarfield(performance.now());
    });
  }

  document.addEventListener("visibilitychange", () => {
    syncHeroScene();
    syncAcemapLoop();
  });

  // =========================
  // 6. PUBLICATIONS FILTER LEDGER
  // =========================
  const filterBtns = $$(".publication-filters button[data-filter]");
  const pubGroups = $$(".publication-group");
  const pubCount = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    filterBtns.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.filter === kind));
    });
    const visibleGroups = pubGroups.filter((g) => !g.hidden);
    const total = visibleGroups.reduce(
      (sum, g) => sum + g.querySelectorAll(".pub-row").length,
      0,
    );
    const years = visibleGroups.flatMap((g) =>
      $$(".pub-year", g).map((el) => Number(el.textContent)),
    );
    if (pubCount && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCount.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubAnchor);
  syncPubAnchor();
})();
