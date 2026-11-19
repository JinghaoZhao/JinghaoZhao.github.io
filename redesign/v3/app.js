/* Architectural Monograph — Progressive Enhancement */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionEnabled = !reduceMotion.matches;

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ============================================================
     1. QUIET SCROLL CHOREOGRAPHY & REVEALS
     ============================================================ */
  const header = $("#site-header");
  const heroPlate = $("#hero-plate");
  const navLinks = $$(".primary-nav a");
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY;
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
      if (motionEnabled && y < window.innerHeight * 1.1) {
        const offset = Math.min(y * 0.045, 28);
        heroPlate.style.transform = `translateY(${offset.toFixed(1)}px)`;
      } else {
        heroPlate.style.transform = "";
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
      $$(".reveal.is-pending").forEach((el) => el.classList.remove("is-pending"));
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
     2. CURATED EXHIBITION PLATES (I–VI) & STEP WALKTHROUGHS
     ============================================================ */
  const plateOrder = [
    "seed",
    "secureSIM",
    "gptcodelearner",
    "sonica",
    "flora",
    "lrp",
  ];
  const romans = ["I", "II", "III", "IV", "V", "VI"];

  const plateTabs = $$(".plate-tab");
  const platePanels = $$(".exhibition-plate");
  const platesStage = $("#plates-stage");
  const plateTabsBar = $("#plate-tabs");
  const platePager = $("#plate-pager");
  const platePrev = $("#plate-prev");
  const plateNext = $("#plate-next");
  const plateCounter = $("#plate-counter");
  const viewToggleButtons = $$("[data-view]");

  let activePlateIndex = 0;

  function setActivePlate(index, focusTab = false) {
    const wrapped = (index + plateOrder.length) % plateOrder.length;
    activePlateIndex = wrapped;
    const id = plateOrder[wrapped];

    plateTabs.forEach((tab, i) => {
      const selected = i === wrapped;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && focusTab) tab.focus();
    });

    platePanels.forEach((panel) => {
      const active = panel.dataset.platePanel === id;
      panel.classList.toggle("is-active", active);
    });

    if (plateCounter) {
      plateCounter.textContent = `PLATE ${romans[wrapped]} OF VI`;
    }
  }

  plateTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setActivePlate(index));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActivePlate(index + 1, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActivePlate(index - 1, true);
      }
    });
  });

  if (platePrev) {
    platePrev.addEventListener("click", () => setActivePlate(activePlateIndex - 1));
  }
  if (plateNext) {
    plateNext.addEventListener("click", () => setActivePlate(activePlateIndex + 1));
  }

  function setViewMode(mode) {
    if (!platesStage) return;
    platesStage.dataset.mode = mode;
    const isPlateMode = mode === "plate";
    if (plateTabsBar) plateTabsBar.hidden = !isPlateMode;
    if (platePager) platePager.hidden = !isPlateMode;

    viewToggleButtons.forEach((btn) => {
      const active = btn.dataset.view === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  viewToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => setViewMode(btn.dataset.view));
  });

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
        if (Number(figure.dataset.step) === targetStep) {
          setStep(0);
        } else {
          setStep(targetStep);
        }
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        clearTimers();
        if (!motionEnabled) {
          setStep(0);
          return;
        }
        setStep(1);
        timerIds.push(setTimeout(() => setStep(2), 1100));
        timerIds.push(setTimeout(() => setStep(3), 2200));
        timerIds.push(setTimeout(() => setStep(0), 3400));
      });
    }

    // Start in full overview state so every diagram is crisp and legible on load
    setStep(0);
  });

  /* ============================================================
     3. ACEMAP 2,208-TOPIC CARTOGRAPHIC ATLAS (ON-DEMAND)
     ============================================================ */
  const mapLoad = $("#map-load");
  const mapStatus = $("#map-status");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  const fieldSelectWrap = $(".field-select");
  const topicSelectWrap = $(".topic-select");
  const topicMapSvg = $("#topic-map");
  const atlasViewport = $("#atlas-viewport");
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

  // Original CSV hex keys used to classify the 19 disciplines
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

  // Fine-art mineral pigment palette tuned for warm cream rag paper (#f7f3eb)
  const mineralColors = [
    "#7d567e", // Psychology (mineral plum)
    "#5f7a42", // Political Science (moss)
    "#585c8c", // Mathematics (slate indigo)
    "#a85c42", // Environmental Science (terracotta)
    "#1f5452", // Computer Science (deep forest teal)
    "#8c7432", // Medicine (ochre)
    "#2f6f8a", // Biology (cerulean slate)
    "#9c5a3c", // History (burnished bronze)
    "#257063", // Physics (verdigris)
    "#785f74", // Geology (warm basalt)
    "#2c6e78", // Engineering (deep petrol)
    "#4e7866", // Philosophy (sage)
    "#8a773c", // Art (raw sienna)
    "#4b734b", // Sociology (botanical green)
    "#995a72", // Business (muted rosewood)
    "#a66253", // Economics (burnt clay)
    "#964f60", // Chemistry (madder lake)
    "#3f7553", // Materials Science (malachite)
    "#917134", // Geography (amber earth)
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
    circle.setAttribute("r", isSelected ? "4.6" : isHovered ? "4.2" : "2.15");
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
    const top = Math.min(Math.max(12, py - ch - 10 < 12 ? py + 14 : py - ch - 10), maxY);
    callout.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
  }

  function updateMap() {
    selectedField = fieldSelect.value;
    hoveredIndex = -1;
    selectedIndex = -1;
    if (callout) callout.hidden = true;

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
      mapLoad.disabled = true;
      mapLoad.textContent = "Loading 2,208 topics…";
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

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.id = "topic-points";
        const fragment = document.createDocumentFragment();

        topicPoints.forEach((point, i) => {
          point.cx = Number(((point.x - minX) * scale + offsetX).toFixed(2));
          point.cy = Number(((point.y - minY) * scale + offsetY).toFixed(2));
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
          fragment.appendChild(circle);
        });

        group.appendChild(fragment);
        const preview = $("#map-preview");
        if (preview) preview.replaceWith(group);
        else topicMapSvg.appendChild(group);

        circles = [...group.children];

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
    });
  }

  /* ============================================================
     4. PUBLICATIONS BOOK-INDEX FILTER
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
      const plateIdx = plateOrder.indexOf(hash);
      if (plateIdx >= 0) {
        setActivePlate(plateIdx);
      }
    }
  }

  window.addEventListener("hashchange", syncFromHash);
  syncFromHash();
})();
