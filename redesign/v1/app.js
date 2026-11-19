/* V1: Kinetic Swiss Poster & Interactive Specimen Machine */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* --------------------------------------------------------------------------
     1. Scroll Clip Reveals (Hero uses pure CSS keyframes — zero JS FOIC)
     -------------------------------------------------------------------------- */
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const clipObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("is-pending");
            entry.target.classList.add("is-visible");
            clipObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    $$(".reveal-clip").forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("is-pending");
      }
      clipObs.observe(el);
    });
  }

  /* --------------------------------------------------------------------------
     2. Pinned Edge Scroll-Progress Vernier Scale + Nav Spy + Scroll Velocity
     -------------------------------------------------------------------------- */
  const navLinks = $$(".main-nav a");
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const vernierSec = $("#vernier-sec");
  const vernierPct = $("#vernier-pct");
  const vernierFill = $("#vernier-fill");
  const vernierNeedle = $("#vernier-needle");
  const headerProgress = $("#header-progress-bar");

  let lastScrollY = window.scrollY;
  let scrollVelocity = 0;
  let scrollTicking = false;

  function updateScrollUI() {
    scrollTicking = false;
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;
    scrollVelocity = Math.max(-45, Math.min(45, scrollVelocity * 0.6 + delta * 0.45));

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const pct = Math.max(0, Math.min(100, Math.round((y / maxScroll) * 100)));
    const pctStr = `${String(pct).padStart(2, "0")}%`;

    if (vernierPct) vernierPct.textContent = pctStr;
    if (vernierFill) vernierFill.style.height = `${pct}%`;
    if (vernierNeedle) vernierNeedle.style.top = `${pct}%`;
    if (headerProgress) headerProgress.style.width = `${pct}%`;

    let activeId = "";
    let activeSecNum = "00";
    const threshold = window.innerHeight * 0.34;
    for (let i = 0; i < navSections.length; i++) {
      if (navSections[i].getBoundingClientRect().top <= threshold) {
        activeId = navSections[i].id;
        activeSecNum = navSections[i].dataset.sec || `0${i + 1}`;
      }
    }
    if (vernierSec) vernierSec.textContent = activeSecNum;

    navLinks.forEach((link) => {
      if (activeId && link.getAttribute("href") === "#" + activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(updateScrollUI);
      }
    },
    { passive: true },
  );
  updateScrollUI();

  /* --------------------------------------------------------------------------
     3. Hero Live Cursor-Tracking Swiss Grid Crosshair & Active Column Highlight
     -------------------------------------------------------------------------- */
  const hero = $("#hero");
  const rulerX = $("#hero-ruler-x");
  const rulerY = $("#hero-ruler-y");
  const coordsEl = $("#hero-coords");
  const colReadout = $("#hero-col-readout");
  const crosshair = $("#reticle-crosshair");
  const reticleTag = $("#reticle-tag");
  const gridCols = $$("#swiss-grid-overlay .swiss-grid-inner span");
  let activeColIdx = -1;

  function highlightColumn(colIdx) {
    if (colIdx === activeColIdx) return;
    if (activeColIdx >= 0 && gridCols[activeColIdx]) {
      gridCols[activeColIdx].classList.remove("is-active-col");
    }
    activeColIdx = colIdx;
    if (activeColIdx >= 0 && gridCols[activeColIdx]) {
      gridCols[activeColIdx].classList.add("is-active-col");
      if (colReadout) {
        colReadout.textContent = `COL ${String(activeColIdx + 1).padStart(2, "0")} / 12`;
      }
    } else if (colReadout) {
      colReadout.textContent = "COL 01 / 12";
    }
  }

  function setReticle(x, y, label) {
    if (crosshair) {
      const cx = Math.max(28, Math.min(292, x));
      const cy = Math.max(28, Math.min(192, y));
      crosshair.setAttribute("transform", `translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    }
    if (reticleTag && label) {
      reticleTag.textContent = label;
    }
  }

  if (hero) {
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (reduceMotion.matches || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const localY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        const relX = localX / Math.max(1, rect.width);
        const relY = localY / Math.max(1, rect.height);

        hero.classList.add("has-pointer");
        if (rulerX) rulerX.style.transform = `translateY(${localY.toFixed(1)}px)`;
        if (rulerY) rulerY.style.transform = `translateX(${localX.toFixed(1)}px)`;

        const colIdx = Math.min(11, Math.max(0, Math.floor(relX * 12)));
        highlightColumn(colIdx);

        const gx = String(Math.round(relX * 1200)).padStart(4, "0");
        const gy = String(Math.round(relY * 800)).padStart(4, "0");
        if (coordsEl) coordsEl.textContent = `GRID ${gx} × ${gy}`;
        setReticle(36 + relX * 248, 36 + relY * 148, `C${String(colIdx + 1).padStart(2, "0")}·${gx.slice(0, 2)}`);
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", () => {
      hero.classList.remove("has-pointer");
      highlightColumn(-1);
      if (coordsEl) coordsEl.textContent = "GRID 0600 × 0400";
      setReticle(160, 110, "REF 01–04");
    });
  }

  const indexTargets = {
    "01": { x: 96, y: 68, tag: "SEC 01 · WORK" },
    "02": { x: 224, y: 68, tag: "SEC 02 · BIO" },
    "03": { x: 96, y: 152, tag: "SEC 03 · PROJ" },
    "04": { x: 224, y: 152, tag: "SEC 04 · PUBS" },
  };

  $$("[data-reticle-target]").forEach((link) => {
    const preset = indexTargets[link.dataset.reticleTarget];
    if (!preset) return;
    link.addEventListener("pointerenter", () => setReticle(preset.x, preset.y, preset.tag));
    link.addEventListener("focus", () => setReticle(preset.x, preset.y, preset.tag));
  });

  /* --------------------------------------------------------------------------
     4. Scroll-Velocity-Reactive Kinetic Swiss Ticker
     -------------------------------------------------------------------------- */
  const tickerEl = $("#kinetic-ticker");
  const tickerTrack = $("#ticker-track");
  if (tickerEl && tickerTrack && !reduceMotion.matches) {
    let tickerOffset = 0;
    let tickerVisible = true;
    let tickerRaf = 0;

    function stepTicker() {
      tickerRaf = 0;
      if (!tickerVisible || document.hidden || reduceMotion.matches) return;
      const chunk = tickerTrack.firstElementChild;
      const chunkWidth = chunk ? chunk.offsetWidth : 600;
      if (chunkWidth > 0) {
        const speed = 0.7 + Math.min(8, Math.abs(scrollVelocity) * 0.28);
        const dir = scrollVelocity < -1 ? -1 : 1;
        tickerOffset = (tickerOffset + speed * dir + chunkWidth) % chunkWidth;
        tickerTrack.style.transform = `translate3d(${-tickerOffset.toFixed(2)}px, 0, 0)`;
      }
      scrollVelocity *= 0.92;
      tickerRaf = window.requestAnimationFrame(stepTicker);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        tickerVisible = entry.isIntersecting;
        if (tickerVisible && !tickerRaf) {
          tickerRaf = window.requestAnimationFrame(stepTicker);
        }
      }).observe(tickerEl);
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && tickerVisible && !tickerRaf) {
        tickerRaf = window.requestAnimationFrame(stepTicker);
      }
    });
    tickerRaf = window.requestAnimationFrame(stepTicker);
  }

  /* --------------------------------------------------------------------------
     5. GCE Bare Metal Interactive Specimen + State Stamp
     -------------------------------------------------------------------------- */
  const bmSpecimen = $("#bm-specimen");
  const bmCaptionText = $("#bm-caption-text");
  const bmStateStamp = $("#bm-state-stamp");
  const layerControls = $$("[data-layer-select]");

  const layerMeta = {
    all: {
      stamp: "ALL",
      caption:
        "Full stack — Physical hosts, automated fleet control planes, and deterministic cloud fabric.",
    },
    host: {
      stamp: "L1",
      caption:
        "Layer 01 — Dedicated silicon, high-speed networking, and storage I/O boundaries.",
    },
    fleet: {
      stamp: "L2",
      caption:
        "Layer 02 — Automated provisioning, orchestration, and safe control-plane transitions.",
    },
    e2e: {
      stamp: "L3",
      caption:
        "Layer 03 — Predictable latency, fault isolation, and operability at scale.",
    },
  };

  function selectBareMetalLayer(layer) {
    if (!bmSpecimen) return;
    const key = layerMeta[layer] ? layer : "all";
    bmSpecimen.dataset.activeLayer = key;
    if (bmCaptionText) bmCaptionText.textContent = layerMeta[key].caption;
    if (bmStateStamp) {
      bmStateStamp.textContent = layerMeta[key].stamp;
      bmStateStamp.classList.remove("is-pop");
      void bmStateStamp.offsetWidth;
      bmStateStamp.classList.add("is-pop");
    }
    layerControls.forEach((btn) => {
      const active = btn.dataset.layerSelect === key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  layerControls.forEach((btn) => {
    btn.addEventListener("click", () => selectBareMetalLayer(btn.dataset.layerSelect));
  });

  /* --------------------------------------------------------------------------
     6. Interactive Swiss Poster Index / Expandable Specimen Board (01–07)
     -------------------------------------------------------------------------- */
  const indexRows = $$(".poster-index .index-row");
  const posterPlates = $$(".poster-stage .poster-plate");

  function activateProjectPlate(projectKey) {
    let matched = false;
    indexRows.forEach((row) => {
      const isMatch = row.dataset.project === projectKey;
      if (isMatch) matched = true;
      row.classList.toggle("is-active", isMatch);
      row.setAttribute("aria-selected", String(isMatch));
    });
    if (!matched) return;
    posterPlates.forEach((plate) => {
      const isMatch = plate.dataset.plate === projectKey;
      plate.hidden = !isMatch;
      plate.classList.toggle("is-active", isMatch);
    });
  }

  indexRows.forEach((row, idx) => {
    row.addEventListener("click", () => {
      activateProjectPlate(row.dataset.project);
    });
    row.addEventListener("pointerenter", () => {
      if (finePointer.matches && window.innerWidth > 1120) {
        activateProjectPlate(row.dataset.project);
      }
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const next = indexRows[(idx + 1) % indexRows.length];
        next.focus();
        activateProjectPlate(next.dataset.project);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = indexRows[(idx - 1 + indexRows.length) % indexRows.length];
        prev.focus();
        activateProjectPlate(prev.dataset.project);
      }
    });
  });

  function syncProjectHash() {
    const hash = window.location.hash.replace("#", "");
    if (["seed", "secureSIM", "gptcodelearner", "sonica", "flora", "lrp"].includes(hash)) {
      activateProjectPlate(hash);
    }
  }
  window.addEventListener("hashchange", syncProjectHash);
  syncProjectHash();

  /* --------------------------------------------------------------------------
     7. Animated Particle-Flight Acemap (<canvas> 2,208 Topics)
     -------------------------------------------------------------------------- */
  const mapLoadBtn = $("#map-load-btn");
  const mapFilters = $("#map-filters");
  const mapFieldSelect = $("#map-field");
  const mapTopicSelect = $("#map-topic");
  const mapStatus = $("#map-status");
  const mapCanvas = $("#acemap-canvas");
  const mapStage = $("#map-stage");
  const mapTooltip = $("#map-tooltip");
  const tooltipField = $("#tooltip-field");
  const tooltipName = $("#tooltip-name");
  const mapCoordsReadout = $("#map-coords-readout");

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

  const ARCHIVAL_COLORS = [
    "#7b538a",
    "#567838",
    "#645791",
    "#b05e44",
    "#d9381e",
    "#787a2d",
    "#2e7296",
    "#9c6939",
    "#1e7e6c",
    "#7d6085",
    "#257e8a",
    "#477a66",
    "#6f7539",
    "#467545",
    "#9b5d78",
    "#a86153",
    "#9e546a",
    "#3d7a51",
    "#96752f",
  ];

  const MAP_W = 600;
  const MAP_H = 360;
  let mapCtx = mapCanvas ? mapCanvas.getContext("2d") : null;
  let points = [];
  let mapLoaded = false;
  let selectedField = "all";
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let mapRaf = 0;

  function setupCanvasDPI() {
    if (!mapCanvas || !mapCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    mapCanvas.width = MAP_W * dpr;
    mapCanvas.height = MAP_H * dpr;
    mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGridBackground(ctx) {
    ctx.fillStyle = "#faf9f5";
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.strokeStyle = "#d7d4cb";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 30; x < MAP_W; x += 30) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_H);
    }
    for (let y = 30; y < MAP_H; y += 30) {
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_W, y);
    }
    ctx.stroke();
  }

  function drawPreviewCanvas() {
    if (!mapCtx) return;
    drawGridBackground(mapCtx);
    mapCtx.save();
    mapCtx.translate(300, 180);

    mapCtx.strokeStyle = "rgba(17,19,23,0.2)";
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, 205, 110, -0.4, 0, Math.PI * 2);
    mapCtx.stroke();

    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, 150, 140, 0.58, 0, Math.PI * 2);
    mapCtx.stroke();

    mapCtx.setLineDash([4, 4]);
    mapCtx.strokeStyle = "rgba(217,56,30,0.45)";
    mapCtx.beginPath();
    mapCtx.ellipse(0, 0, 85, 155, 0.96, 0, Math.PI * 2);
    mapCtx.stroke();
    mapCtx.setLineDash([]);
    mapCtx.restore();

    const nodes = [
      [120, 120, 4.5, "#111317"],
      [300, 45, 4, "#111317"],
      [465, 100, 5, "#111317"],
      [480, 240, 3.5, "#111317"],
      [315, 318, 4.5, "#111317"],
      [130, 265, 3.5, "#111317"],
      [300, 180, 7, "#d9381e"],
    ];
    mapCtx.strokeStyle = "rgba(17,19,23,0.22)";
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.moveTo(120, 120);
    mapCtx.lineTo(300, 45);
    mapCtx.lineTo(465, 100);
    mapCtx.lineTo(480, 240);
    mapCtx.lineTo(315, 318);
    mapCtx.lineTo(130, 265);
    mapCtx.closePath();
    mapCtx.stroke();

    nodes.forEach(([x, y, r, color]) => {
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc(x, y, r, 0, Math.PI * 2);
      mapCtx.fill();
    });
  }

  setupCanvasDPI();
  drawPreviewCanvas();

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

  function isPointVisible(idx) {
    return selectedField === "all" || points[idx].field === Number(selectedField);
  }

  function renderParticleFrame() {
    mapRaf = 0;
    if (!mapCtx || !mapLoaded) return;
    drawGridBackground(mapCtx);

    let stillMoving = false;
    const instant = reduceMotion.matches;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (instant) {
        p.x = p.tx;
        p.y = p.ty;
        p.r = p.tr;
        p.a = p.ta;
      } else {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dr = p.tr - p.r;
        const da = p.ta - p.a;
        p.x += dx * p.ease;
        p.y += dy * p.ease;
        p.r += dr * 0.14;
        p.a += da * 0.14;
        if (
          Math.abs(dx) > 0.12 ||
          Math.abs(dy) > 0.12 ||
          Math.abs(dr) > 0.03 ||
          Math.abs(da) > 0.01
        ) {
          stillMoving = true;
        }
      }

      if (p.a < 0.02) continue;
      mapCtx.globalAlpha = p.a;
      mapCtx.fillStyle = ARCHIVAL_COLORS[p.field];
      mapCtx.beginPath();
      mapCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      mapCtx.fill();
    }

    mapCtx.globalAlpha = 1;

    // Draw crosshair & ring for hovered or selected topic
    const focusIdx = hoveredIdx >= 0 ? hoveredIdx : selectedIdx;
    if (focusIdx >= 0 && points[focusIdx]) {
      const fp = points[focusIdx];
      mapCtx.strokeStyle = "rgba(217, 56, 30, 0.45)";
      mapCtx.lineWidth = 1;
      mapCtx.setLineDash([3, 3]);
      mapCtx.beginPath();
      mapCtx.moveTo(fp.x, 0);
      mapCtx.lineTo(fp.x, MAP_H);
      mapCtx.moveTo(0, fp.y);
      mapCtx.lineTo(MAP_W, fp.y);
      mapCtx.stroke();
      mapCtx.setLineDash([]);

      mapCtx.fillStyle = "#d9381e";
      mapCtx.strokeStyle = "#111317";
      mapCtx.lineWidth = 1.6;
      mapCtx.beginPath();
      mapCtx.arc(fp.x, fp.y, 5.2, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.stroke();
    }

    if (stillMoving) {
      mapRaf = window.requestAnimationFrame(renderParticleFrame);
    }
  }

  function scheduleMapRender() {
    if (!mapRaf) {
      mapRaf = window.requestAnimationFrame(renderParticleFrame);
    }
  }

  function showTooltip(idx, clientX, clientY) {
    if (!mapTooltip || !mapStage || idx < 0) return;
    const pt = points[idx];
    tooltipField.textContent = FIELDS[pt.field];
    tooltipName.textContent = pt.name;
    mapTooltip.hidden = false;

    const stageRect = mapStage.getBoundingClientRect();
    let left = clientX - stageRect.left + 14;
    let top = clientY - stageRect.top - 14;
    const tipW = mapTooltip.offsetWidth || 180;
    const tipH = mapTooltip.offsetHeight || 48;

    if (left + tipW > stageRect.width - 8) left = Math.max(8, left - tipW - 28);
    if (top + tipH > stageRect.height - 8) top = stageRect.height - tipH - 8;
    if (top < 8) top = 8;

    mapTooltip.style.left = `${left}px`;
    mapTooltip.style.top = `${top}px`;
  }

  function hideTooltip() {
    if (mapTooltip) mapTooltip.hidden = true;
  }

  function updateMapFilter() {
    selectedField = mapFieldSelect ? mapFieldSelect.value : "all";
    hoveredIdx = -1;
    selectedIdx = -1;
    hideTooltip();

    let count = 0;
    if (mapTopicSelect) {
      mapTopicSelect.replaceChildren(new Option("Choose a topic…", ""));
    }

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const active = isPointVisible(i);
      if (selectedField === "all") {
        p.tx = p.bx;
        p.ty = p.by;
        p.tr = 2.1;
        p.ta = 0.85;
      } else if (active) {
        // Gentle editorial zoom-in toward center for the active discipline
        p.tx = 300 + (p.bx - 300) * 1.06;
        p.ty = 180 + (p.by - 180) * 1.06;
        p.tr = 3.1;
        p.ta = 0.94;
      } else {
        p.tx = p.bx;
        p.ty = p.by;
        p.tr = 1.4;
        p.ta = 0.06;
      }
      if (active) {
        count++;
        if (mapTopicSelect) {
          mapTopicSelect.add(new Option(p.name, String(i)));
        }
      }
    }

    const label = selectedField === "all" ? "All 19 disciplines" : FIELDS[Number(selectedField)];
    if (mapStatus) mapStatus.textContent = `${label} · ${count.toLocaleString()} topics active.`;
    if (mapCoordsReadout) mapCoordsReadout.textContent = `${count.toLocaleString()} NODES`;
    scheduleMapRender();
  }

  function findNearestPoint(clientX, clientY, maxDist) {
    if (!mapCanvas || !points.length) return -1;
    const rect = mapCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const vx = ((clientX - rect.left) / rect.width) * MAP_W;
    const vy = ((clientY - rect.top) / rect.height) * MAP_H;
    let best = -1;
    let bestD2 = maxDist * maxDist;

    for (let i = 0; i < points.length; i++) {
      if (!isPointVisible(i)) continue;
      const dx = points[i].x - vx;
      const dy = points[i].y - vy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  if (mapLoadBtn && mapCanvas) {
    mapLoadBtn.addEventListener("click", async () => {
      mapLoadBtn.disabled = true;
      mapLoadBtn.textContent = "Launching 2,208 topics…";
      if (mapStatus) mapStatus.textContent = "Fetching ../../data/data.csv…";

      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Failed to fetch dataset");
        const rows = parseCSV(await res.text()).slice(1);

        const raw = rows
          .map((r) => ({
            rx: Number(r[0]),
            ry: Number(r[1]),
            name: r[3],
            field: SOURCE_COLORS.indexOf(r[4]),
          }))
          .filter((p) => Number.isFinite(p.rx) && Number.isFinite(p.ry) && p.field >= 0);

        if (!raw.length) throw new Error("No valid topic coordinates found");

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < raw.length; i++) {
          if (raw[i].rx < minX) minX = raw[i].rx;
          if (raw[i].rx > maxX) maxX = raw[i].rx;
          if (raw[i].ry < minY) minY = raw[i].ry;
          if (raw[i].ry > maxY) maxY = raw[i].ry;
        }

        const scale = Math.min(540 / (maxX - minX), 306 / (maxY - minY));
        const offsetX = (MAP_W - (maxX - minX) * scale) / 2;
        const offsetY = (MAP_H - (maxY - minY) * scale) / 2;

        // Spawn all 2,208 particles from center for dramatic particle-flight burst!
        points = raw.map((r, i) => {
          const bx = (r.rx - minX) * scale + offsetX;
          const by = (r.ry - minY) * scale + offsetY;
          return {
            name: r.name,
            field: r.field,
            bx,
            by,
            x: MAP_W / 2,
            y: MAP_H / 2,
            tx: bx,
            ty: by,
            r: 0.4,
            tr: 2.1,
            a: 0,
            ta: 0.85,
            ease: 0.065 + ((i % 19) / 19) * 0.055,
          };
        });

        mapLoaded = true;

        if (mapFieldSelect) {
          FIELDS.forEach((fieldName, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = fieldName;
            mapFieldSelect.appendChild(opt);
          });
        }

        mapCanvas.addEventListener("pointermove", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 16);
          if (idx !== hoveredIdx) {
            hoveredIdx = idx;
            scheduleMapRender();
          }
          if (idx >= 0) {
            showTooltip(idx, event.clientX, event.clientY);
            if (mapStatus) {
              mapStatus.textContent = `${points[idx].name} · ${FIELDS[points[idx].field]}`;
            }
          } else {
            hideTooltip();
          }
        });

        mapCanvas.addEventListener("pointerleave", () => {
          if (hoveredIdx !== -1) {
            hoveredIdx = -1;
            scheduleMapRender();
          }
          hideTooltip();
        });

        mapCanvas.addEventListener("click", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 18);
          if (idx < 0) return;
          selectedIdx = idx;
          if (mapTopicSelect) mapTopicSelect.value = String(idx);
          if (mapStatus) {
            mapStatus.textContent = `Pinned: ${points[idx].name} · ${FIELDS[points[idx].field]}`;
          }
          scheduleMapRender();
        });

        mapLoadBtn.hidden = true;
        if (mapFilters) mapFilters.hidden = false;
        updateMapFilter();
      } catch (_err) {
        mapLoadBtn.disabled = false;
        mapLoadBtn.textContent = "Retry loading map ↘";
        if (mapStatus) {
          mapStatus.textContent =
            "Could not load data/data.csv. Serve over HTTP or visit Acemap directly.";
        }
      }
    });
  }

  if (mapFieldSelect) {
    mapFieldSelect.addEventListener("change", updateMapFilter);
  }

  if (mapTopicSelect) {
    mapTopicSelect.addEventListener("change", () => {
      selectedIdx = mapTopicSelect.value === "" ? -1 : Number(mapTopicSelect.value);
      if (selectedIdx >= 0 && points[selectedIdx]) {
        const pt = points[selectedIdx];
        if (mapStatus) mapStatus.textContent = `Selected: ${pt.name} · ${FIELDS[pt.field]}`;
      } else {
        updateMapFilter();
        return;
      }
      scheduleMapRender();
    });
  }

  /* --------------------------------------------------------------------------
     8. Filterable Swiss-Ledger Publications
     -------------------------------------------------------------------------- */
  const pubFilterBtns = $$("[data-filter]");
  const pubGroups = $$(".pub-group");
  const pubCountEl = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    pubFilterBtns.forEach((btn) => {
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
      Array.from(g.querySelectorAll(".pub-year")).map((el) => Number(el.textContent)),
    );
    if (pubCountEl && years.length) {
      const label = kind === "all" ? "publications" : `${kind} publications`;
      pubCountEl.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  pubFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => filterPublications(btn.dataset.filter));
  });

  function syncPubHash() {
    if (window.location.hash === "#conf") filterPublications("conference");
    else if (window.location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubHash);
  syncPubHash();
})();
