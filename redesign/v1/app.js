/* V1: Swiss Editorial — Progressive Enhancement & Interactive Specimens */
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
     1. Scroll-spy Navigation
     -------------------------------------------------------------------------- */
  const navLinks = $$(".main-nav a");
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  let scrollTicking = false;
  function updateNavSpy() {
    scrollTicking = false;
    let activeId = "";
    const threshold = window.innerHeight * 0.34;
    for (let i = 0; i < navSections.length; i++) {
      if (navSections[i].getBoundingClientRect().top <= threshold) {
        activeId = navSections[i].id;
      }
    }
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
        window.requestAnimationFrame(updateNavSpy);
      }
    },
    { passive: true },
  );
  updateNavSpy();

  /* --------------------------------------------------------------------------
     2. Hero Coordinate Reticle & Kinetic Index
     -------------------------------------------------------------------------- */
  const hero = $("#hero");
  const coordsEl = $("#hero-coords");
  const crosshair = $("#reticle-crosshair");
  const reticleTag = $("#reticle-tag");

  function setReticle(x, y, label) {
    if (crosshair) {
      const clampedX = Math.max(28, Math.min(292, x));
      const clampedY = Math.max(28, Math.min(192, y));
      crosshair.setAttribute(
        "transform",
        `translate(${clampedX.toFixed(1)}, ${clampedY.toFixed(1)})`,
      );
    }
    if (reticleTag && label) {
      reticleTag.textContent = label;
    }
  }

  if (hero && coordsEl) {
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (reduceMotion.matches || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        const relX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const relY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const gx = String(Math.round(relX * 1200)).padStart(4, "0");
        const gy = String(Math.round(relY * 800)).padStart(4, "0");
        coordsEl.textContent = `GRID ${gx} × ${gy}`;
        setReticle(36 + relX * 248, 36 + relY * 148, `X${gx.slice(0, 2)}·Y${gy.slice(0, 2)}`);
      },
      { passive: true },
    );

    hero.addEventListener("pointerleave", () => {
      coordsEl.textContent = "GRID 0600 × 0400";
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
    const key = link.dataset.reticleTarget;
    const preset = indexTargets[key];
    if (!preset) return;
    link.addEventListener("pointerenter", () => setReticle(preset.x, preset.y, preset.tag));
    link.addEventListener("focus", () => setReticle(preset.x, preset.y, preset.tag));
  });

  /* --------------------------------------------------------------------------
     3. GCE Bare Metal Interactive Architectural Specimen
     -------------------------------------------------------------------------- */
  const bmSpecimen = $("#bm-specimen");
  const bmCaptionText = $("#bm-caption-text");
  const layerControls = $$("[data-layer-select]");

  const layerDescriptions = {
    all: "Full stack — Physical hosts, automated fleet control planes, and deterministic cloud fabric.",
    host: "Layer 01 — Dedicated silicon, high-speed networking, and storage I/O boundaries.",
    fleet: "Layer 02 — Automated provisioning, orchestration, and safe control-plane transitions.",
    e2e: "Layer 03 — Predictable latency, fault isolation, and operability at scale.",
  };

  function selectBareMetalLayer(layer) {
    if (!bmSpecimen) return;
    const validLayer = layerDescriptions[layer] ? layer : "all";
    bmSpecimen.dataset.activeLayer = validLayer;
    if (bmCaptionText) {
      bmCaptionText.textContent = layerDescriptions[validLayer];
    }
    layerControls.forEach((btn) => {
      const isMatch = btn.dataset.layerSelect === validLayer;
      btn.classList.toggle("is-active", isMatch);
      btn.setAttribute("aria-pressed", String(isMatch));
    });
  }

  layerControls.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectBareMetalLayer(btn.dataset.layerSelect);
    });
  });

  /* --------------------------------------------------------------------------
     4. Project Architecture Spec Drawers
     -------------------------------------------------------------------------- */
  $$(".drawer-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("aria-controls");
      const drawer = targetId ? document.getElementById(targetId) : null;
      if (!drawer) return;
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isExpanded));
      btn.textContent = isExpanded ? "Inspect flow +" : "Hide flow −";
      drawer.hidden = isExpanded;
    });
  });

  /* --------------------------------------------------------------------------
     5. Filterable Swiss-Ledger Publications
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

  function syncHashFilter() {
    if (window.location.hash === "#conf") filterPublications("conference");
    else if (window.location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncHashFilter);
  syncHashFilter();

  /* --------------------------------------------------------------------------
     6. Acemap On-Demand 2,208-Topic Interactive Scatter Map
     -------------------------------------------------------------------------- */
  const mapLoadBtn = $("#map-load-btn");
  const mapFilters = $("#map-filters");
  const mapFieldSelect = $("#map-field");
  const mapTopicSelect = $("#map-topic");
  const mapStatus = $("#map-status");
  const mapSvg = $("#topic-map");
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

  let points = [];
  let circles = [];
  let selectedField = "all";
  let hoveredIdx = -1;
  let selectedIdx = -1;

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

  function syncPointStyle(idx) {
    if (idx < 0 || !circles[idx]) return;
    const circle = circles[idx];
    const isSel = idx === selectedIdx;
    const isHov = idx === hoveredIdx;
    circle.classList.toggle("is-selected", isSel);
    circle.classList.toggle("is-hovered", isHov);
    circle.setAttribute("r", isSel ? "4.8" : isHov ? "4.2" : "2.1");
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

  function updateMapView() {
    selectedField = mapFieldSelect ? mapFieldSelect.value : "all";
    hoveredIdx = -1;
    selectedIdx = -1;
    hideTooltip();

    let count = 0;
    if (mapTopicSelect) {
      mapTopicSelect.replaceChildren(new Option("Choose a topic…", ""));
    }

    circles.forEach((circle, i) => {
      const active = isPointVisible(i);
      circle.setAttribute("opacity", active ? "0.86" : "0.05");
      circle.setAttribute("r", "2.1");
      circle.classList.remove("is-selected", "is-hovered");
      if (active) {
        count++;
        if (mapTopicSelect) {
          mapTopicSelect.add(new Option(points[i].name, String(i)));
        }
      }
    });

    const label = selectedField === "all" ? "All 19 disciplines" : FIELDS[Number(selectedField)];
    if (mapStatus) {
      mapStatus.textContent = `${label} · ${count.toLocaleString()} topics active.`;
    }
    if (mapCoordsReadout) {
      mapCoordsReadout.textContent = `${count.toLocaleString()} NODES`;
    }
  }

  function findNearestPoint(clientX, clientY, maxDist) {
    if (!mapSvg || !points.length) return -1;
    const rect = mapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const vx = ((clientX - rect.left) / rect.width) * 600;
    const vy = ((clientY - rect.top) / rect.height) * 360;
    let best = -1;
    let bestD2 = maxDist * maxDist;

    for (let i = 0; i < points.length; i++) {
      if (!isPointVisible(i)) continue;
      const dx = points[i].cx - vx;
      const dy = points[i].cy - vy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  if (mapLoadBtn && mapSvg) {
    mapLoadBtn.addEventListener("click", async () => {
      mapLoadBtn.disabled = true;
      mapLoadBtn.textContent = "Loading 2,208 topics…";
      if (mapStatus) mapStatus.textContent = "Fetching ../../data/data.csv…";

      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Failed to fetch dataset");
        const rows = parseCSV(await res.text()).slice(1);

        points = rows
          .map((r) => ({
            x: Number(r[0]),
            y: Number(r[1]),
            name: r[3],
            field: SOURCE_COLORS.indexOf(r[4]),
            cx: 0,
            cy: 0,
          }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0);

        if (!points.length) throw new Error("No valid topic coordinates found");

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < points.length; i++) {
          if (points[i].x < minX) minX = points[i].x;
          if (points[i].x > maxX) maxX = points[i].x;
          if (points[i].y < minY) minY = points[i].y;
          if (points[i].y > maxY) maxY = points[i].y;
        }

        const scale = Math.min(544 / (maxX - minX), 308 / (maxY - minY));
        const offsetX = (600 - (maxX - minX) * scale) / 2;
        const offsetY = (360 - (maxY - minY) * scale) / 2;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.id = "topic-points";
        const frag = document.createDocumentFragment();

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          p.cx = Number(((p.x - minX) * scale + offsetX).toFixed(2));
          p.cy = Number(((p.y - minY) * scale + offsetY).toFixed(2));

          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", String(p.cx));
          c.setAttribute("cy", String(p.cy));
          c.setAttribute("r", "2.1");
          c.setAttribute("fill", ARCHIVAL_COLORS[p.field]);
          c.setAttribute("class", "map-point");
          frag.appendChild(c);
        }

        group.appendChild(frag);
        const preview = $("#map-preview");
        if (preview) preview.replaceWith(group);
        else mapSvg.appendChild(group);

        circles = Array.from(group.children);

        if (mapFieldSelect) {
          FIELDS.forEach((fieldName, i) => {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = fieldName;
            mapFieldSelect.appendChild(opt);
          });
        }

        mapSvg.addEventListener("pointermove", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 16);
          if (idx !== hoveredIdx) {
            const prev = hoveredIdx;
            hoveredIdx = idx;
            syncPointStyle(prev);
            syncPointStyle(idx);
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

        mapSvg.addEventListener("pointerleave", () => {
          const prev = hoveredIdx;
          hoveredIdx = -1;
          syncPointStyle(prev);
          hideTooltip();
        });

        mapSvg.addEventListener("click", (event) => {
          const idx = findNearestPoint(event.clientX, event.clientY, 18);
          if (idx < 0) return;
          const prev = selectedIdx;
          selectedIdx = idx;
          syncPointStyle(prev);
          syncPointStyle(idx);
          if (mapTopicSelect) mapTopicSelect.value = String(idx);
          if (mapStatus) {
            mapStatus.textContent = `Pinned: ${points[idx].name} · ${FIELDS[points[idx].field]}`;
          }
        });

        mapLoadBtn.hidden = true;
        if (mapFilters) mapFilters.hidden = false;
        updateMapView();
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
    mapFieldSelect.addEventListener("change", updateMapView);
  }

  if (mapTopicSelect) {
    mapTopicSelect.addEventListener("change", () => {
      const prev = selectedIdx;
      selectedIdx = mapTopicSelect.value === "" ? -1 : Number(mapTopicSelect.value);
      syncPointStyle(prev);
      syncPointStyle(selectedIdx);
      if (selectedIdx >= 0 && points[selectedIdx]) {
        const pt = points[selectedIdx];
        if (mapStatus) mapStatus.textContent = `Selected: ${pt.name} · ${FIELDS[pt.field]}`;
      } else {
        updateMapView();
      }
    });
  }
})();
