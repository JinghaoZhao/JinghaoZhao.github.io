/* Architectural Monograph — Cinematic Museum Exhibition & Motion System */
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

    // Subtle magnetic pull on primary monograph CTAs
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

  function syncMotion() {
    motionEnabled = !reduceMotion.matches;
    if (!motionEnabled) {
      document.body.classList.remove("hero-arming");
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
      if (cursorEl) cursorEl.classList.remove("is-visible", "has-label");
    }
    updateScroll();
  }
  reduceMotion.addEventListener("change", syncMotion);
  syncMotion();

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
     5. INTERACTIVE 7-ROOM MUSEUM GALLERY TRACK & CALLIGRAPHY DRAW-IN
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

  function triggerCalligraphy(roomEl) {
    if (!roomEl || !motionEnabled) return;
    roomEl.classList.remove("is-drawing");
    void roomEl.offsetWidth;
    roomEl.classList.add("is-drawing");
    setTimeout(() => {
      roomEl.classList.remove("is-drawing");
    }, 1250);
  }

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
      const active = i === wrapped;
      room.classList.toggle("is-active", active);
      if (active) triggerCalligraphy(room);
    });

    if (roomCounter) {
      roomCounter.textContent = `ROOM 0${wrapped + 1} / 0${roomIds.length}`;
    }
    if (roomProgressFill) {
      roomProgressFill.style.width = `${(((wrapped + 1) / roomIds.length) * 100).toFixed(2)}%`;
    }
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

  // Smooth horizontal drag/swipe on the Gallery Track
  if (galleryViewport && galleryTrack) {
    let dragging = false;
    let startX = 0;
    let deltaX = 0;

    galleryViewport.addEventListener("pointerdown", (event) => {
      if (galleryViewport.dataset.mode !== "gallery") return;
      if (event.target.closest("button, a, select, #topic-map")) return;
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
      if (deltaX < -55) {
        setActiveRoom(activeRoom + 1);
      } else if (deltaX > 55) {
        setActiveRoom(activeRoom - 1);
      } else {
        setActiveRoom(activeRoom);
      }
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
  }

  viewToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => setViewMode(btn.dataset.view));
  });

  // Trigger initial calligraphy draw-in when Room 01 enters viewport
  if ("IntersectionObserver" in window && motionEnabled && galleryRooms[0]) {
    const firstRoomObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting }) => {
          if (!isIntersecting) return;
          triggerCalligraphy(galleryRooms[activeRoom]);
          firstRoomObserver.disconnect();
        });
      },
      { threshold: 0.2 },
    );
    firstRoomObserver.observe(galleryViewport);
  }

  // Diagram 3-step interactive walkthroughs
  $$("[data-motion-study]").forEach((figure) => {
    const stepButtons = $$("[data-step-btn]", figure);
    const replayBtn = $(".study-replay", figure);
    let timerIds = [];

    function clearTimers() {
      timerIds.forEach((id) => clearTimeout(id));
      timerIds = [];
    }

    function setStep(step) {
      figure.dataset.step = String(step);
      stepButtons.forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.stepBtn) === step);
      });
    }

    stepButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        clearTimers();
        const targetStep = Number(btn.dataset.stepBtn);
        setStep(Number(figure.dataset.step) === targetStep ? 0 : targetStep);
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        clearTimers();
        if (!motionEnabled) {
          setStep(0);
          return;
        }
        const room = figure.closest(".gallery-room");
        if (room) triggerCalligraphy(room);
        setStep(1);
        timerIds.push(setTimeout(() => setStep(2), 1100));
        timerIds.push(setTimeout(() => setStep(3), 2200));
        timerIds.push(setTimeout(() => setStep(0), 3400));
      });
    }

    setStep(0);
  });

  /* ============================================================
     6. ACEMAP INK-BLOOM CARTOGRAPHIC ATLAS (2,208 TOPICS)
     ============================================================ */
  const mapLoad = $("#map-load");
  const mapStatus = $("#map-status");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  const fieldSelectWrap = $(".field-select");
  const topicSelectWrap = $(".topic-select");
  const topicMapSvg = $("#topic-map");
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

  const mineralColors = [
    "#7d567e",
    "#5f7a42",
    "#585c8c",
    "#a85c42",
    "#1f5452",
    "#8c7432",
    "#2f6f8a",
    "#9c5a3c",
    "#257063",
    "#785f74",
    "#2c6e78",
    "#4e7866",
    "#8a773c",
    "#4b734b",
    "#995a72",
    "#a66253",
    "#964f60",
    "#3f7553",
    "#917134",
  ];

  let topicPoints = [];
  let circles = [];
  let selectedField = "all";
  let hoveredIndex = -1;
  let selectedIndex = -1;

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

  function syncCircleHighlight(index) {
    if (index < 0 || !circles[index]) return;
    const circle = circles[index];
    const isSelected = index === selectedIndex;
    const isHovered = index === hoveredIndex;
    circle.classList.toggle("is-selected", isSelected);
    circle.classList.toggle("is-hovered", isHovered);
    circle.setAttribute("r", isSelected ? "4.8" : isHovered ? "4.3" : "2.15");
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
    const px = (point.cx / 640) * svgRect.width + (svgRect.left - wrapRect.left);
    const py = (point.cy / 380) * svgRect.height + (svgRect.top - wrapRect.top);

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
    const vx = ((clientX - rect.left) / rect.width) * 640;
    const vy = ((clientY - rect.top) / rect.height) * 380;
    let best = -1;
    let bestDistSq = maxDist * maxDist;
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

        // Compute discipline centroids so each cluster blooms organically from its own heart
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
            const ox = (c.sx / c.n).toFixed(1);
            const oy = (c.sy / c.n).toFixed(1);
            g.style.transformOrigin = `${ox}px ${oy}px`;
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
        else topicMapSvg.insertBefore(rootGroup, inkRipplesLayer || null);

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
     7. PUBLICATIONS BOOK-INDEX FILTER & HASH SYNC
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
