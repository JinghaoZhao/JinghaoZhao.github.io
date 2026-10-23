/* Progressive enhancement; all biography, projects, and papers live in HTML. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let motionEnabled = !reduceMotion.matches;
  let syncScene = () => {};
  let updateScroll = () => {};

  function applyMotion() {
    motionEnabled = !reduceMotion.matches;
    body.classList.toggle("motion-enabled", motionEnabled);
    body.classList.toggle("motion-paused", !motionEnabled);
    if (!motionEnabled)
      $$(".reveal.is-pending").forEach((el) =>
        el.classList.remove("is-pending"),
      );
    syncScene();
    updateScroll();
  }
  reduceMotion.addEventListener("change", applyMotion);
  applyMotion();
  $("#year").textContent = new Date().getFullYear();

  // Reveal once. Unsupported observers leave the page fully visible.
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.classList.remove("is-pending");
          revealObserver.unobserve(target);
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -24px 0px" },
    );
    $$(".reveal").forEach((el) => {
      if (motionEnabled && el.getBoundingClientRect().top > window.innerHeight)
        el.classList.add("is-pending");
      revealObserver.observe(el);
    });
    const workObserver = new IntersectionObserver(([entry]) => {
      entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
    });
    workObserver.observe($("#work"));
  }

  // One scroll write per frame. Never hijack wheel, touch, or keyboard scrolling.
  let scrollPending = false;
  const hero = $(".hero");
  const heroContent = $(".hero-content");
  const header = $("#site-header");
  const navLinks = $$(".site-header nav a");
  const navSections = navLinks.map((link) => document.querySelector(link.hash));
  updateScroll = () => {
    scrollPending = false;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    let activeId = "";
    navSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.35)
        activeId = section.id;
    });
    navLinks.forEach((link) => {
      if (link.hash === "#" + activeId)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    heroContent.style.transform =
      motionEnabled && y < hero.offsetHeight
        ? `translateY(${Math.min(y * 0.12, 80)}px)`
        : "";
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  updateScroll();

  // The legacy conference/journal anchors stay usable, including after filtering.
  const filterBar = $(".publication-filters");
  const filterButtons = $$("[data-filter]");
  const groups = $$(".publication-group");
  function filterPublications(kind) {
    groups.forEach((group) => {
      group.hidden = kind !== "all" && group.dataset.kind !== kind;
    });
    filterButtons.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === kind),
      ),
    );
    const count = groups
      .filter((group) => !group.hidden)
      .reduce(
        (total, group) => total + group.querySelectorAll(".publication").length,
        0,
      );
    const years = groups
      .filter((group) => !group.hidden)
      .flatMap((group) =>
        [...group.querySelectorAll(".publication-year")].map((year) =>
          Number(year.textContent),
        ),
      );
    $("#publication-count").textContent =
      `${count} ${kind === "all" ? "publications" : kind + " publications"} · ${Math.min(...years)}–${Math.max(...years)}`;
  }
  filterBar.hidden = false;
  filterButtons.forEach((button) =>
    button.addEventListener("click", () =>
      filterPublications(button.dataset.filter),
    ),
  );
  function restoreAnchor() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", restoreAnchor);
  restoreAnchor();

  // Original low-poly scenery, reimplemented with a bounded native Canvas scene.
  // The loop runs only while visible, at at most 30 fps; there is no tween library.
  function createHeroScene() {
    const canvas = $("#hero-canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0,
      height = 0,
      points = [],
      faces = [],
      flecks = [];
    let frame = 0,
      previous = 0,
      sceneTime = 0;
    let heroVisible = hero.getBoundingClientRect().bottom > 0;
    let pointerX = 0,
      pointerY = 0,
      targetX = 0,
      targetY = 0;
    let seed = 392;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 392;
      points = [];
      faces = [];
      flecks = [];
      const cols = width < 700 ? 8 : 16,
        rows = 8;
      const cellWidth = width / (cols - 2),
        cellHeight = (height * 0.72) / (rows - 1);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          points.push({
            x: (col - 0.5) * cellWidth + (random() - 0.5) * cellWidth * 0.78,
            y:
              height * 0.34 +
              row * cellHeight +
              (random() - 0.5) * cellHeight * 0.72,
            phase: random() * Math.PI * 2,
            depth: random(),
            px: 0,
            py: 0,
          });
        }
      }
      for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const a = row * cols + col,
            b = a + 1,
            c = a + cols,
            d = c + 1;
          const triangles =
            (row + col) % 2
              ? [
                  [a, b, c],
                  [b, d, c],
                ]
              : [
                  [a, b, d],
                  [a, d, c],
                ];
          triangles.forEach((ids) => faces.push({ ids, tone: random(), row }));
        }
      }
      const fleckCount = width < 700 ? 20 : 42;
      for (let i = 0; i < fleckCount; i++)
        flecks.push({
          x: random(),
          y: random(),
          size: 2 + random() * 6,
          phase: random() * 6.28,
          speed: 0.1 + random() * 0.5,
        });
      draw();
    }
    function draw() {
      const time = sceneTime * 0.0001;
      ctx.clearRect(0, 0, width, height);
      const background = ctx.createLinearGradient(0, 0, width * 0.15, height);
      background.addColorStop(0, "#061124");
      background.addColorStop(0.45, "#0a213d");
      background.addColorStop(1, "#224f78");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(
        width * 0.7,
        height * 0.61,
        0,
        width * 0.7,
        height * 0.61,
        width * 0.65,
      );
      glow.addColorStop(0, "rgba(58,112,163,.2)");
      glow.addColorStop(1, "rgba(15,35,62,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      points.forEach((point) => {
        const landscape =
          Math.sin((point.x / width) * 7 + 0.5) * height * 0.055;
        point.px =
          point.x +
          Math.sin(time + point.phase) * 9 +
          pointerX * (5 + point.depth * 8);
        point.py =
          point.y +
          landscape +
          Math.cos(time * 0.7 + point.phase) * 10 +
          pointerY * (3 + point.depth * 8);
      });
      faces.forEach((face) => {
        const p = face.ids.map((id) => points[id]);
        const cy = (p[0].py + p[1].py + p[2].py) / 3 / height;
        const cx = (p[0].px + p[1].px + p[2].px) / 3 / width;
        const ridge = Math.exp(-Math.pow((cy - 0.75) * 3.8, 2));
        const light = 10 + ridge * (12 + face.tone * 22) + Math.sin(cx * 8) * 3;
        ctx.beginPath();
        ctx.moveTo(p[0].px, p[0].py);
        ctx.lineTo(p[1].px, p[1].py);
        ctx.lineTo(p[2].px, p[2].py);
        ctx.closePath();
        ctx.fillStyle = `hsl(${207 + face.tone * 8},${38 + face.tone * 15}%,${light}%)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(150,202,244,${0.025 + face.tone * 0.035})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
      // Soft haze behind the typography keeps contrast independent of the mesh.
      const shade = ctx.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, "rgba(5,16,34,.2)");
      shade.addColorStop(0.32, "rgba(5,16,34,.52)");
      shade.addColorStop(0.52, "rgba(5,16,34,.58)");
      shade.addColorStop(0.77, "rgba(5,16,34,.04)");
      shade.addColorStop(1, "rgba(5,16,34,.32)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
      flecks.forEach((fleck) => {
        const x =
          ((fleck.x * width +
            Math.sin(time * fleck.speed + fleck.phase) * 35 +
            width) %
            width) +
          pointerX * 8;
        const y = ((fleck.y + time * 0.012 * fleck.speed) % 1) * height;
        const alpha = y < height * 0.55 ? 0.1 : 0.28;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(fleck.phase + time * 0.3);
        ctx.beginPath();
        ctx.moveTo(0, -fleck.size);
        ctx.lineTo(fleck.size * 0.8, fleck.size * 0.6);
        ctx.lineTo(-fleck.size * 0.7, fleck.size);
        ctx.closePath();
        ctx.fillStyle = `rgba(164,207,242,${alpha})`;
        ctx.fill();
        ctx.restore();
      });
      hero.classList.add("canvas-ready");
    }
    function tick(now) {
      frame = 0;
      if (!motionEnabled || !heroVisible || document.hidden) {
        previous = 0;
        return;
      }
      if (!previous || now - previous >= 32) {
        sceneTime += previous ? Math.min(now - previous, 65) : 0;
        previous = now;
        pointerX += (targetX - pointerX) * 0.065;
        pointerY += (targetY - pointerY) * 0.065;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    syncScene = () => {
      if (motionEnabled && heroVisible && !document.hidden) {
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
    };
    hero.addEventListener(
      "pointermove",
      (event) => {
        if (!motionEnabled || !finePointer.matches) return;
        const rect = hero.getBoundingClientRect();
        targetX = clamp(((event.clientX - rect.left) / width) * 2 - 1, -1, 1);
        targetY = clamp(((event.clientY - rect.top) / height) * 2 - 1, -1, 1);
      },
      { passive: true },
    );
    hero.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        syncScene();
      }).observe(hero);
    } else {
      window.addEventListener(
        "scroll",
        () => {
          heroVisible = hero.getBoundingClientRect().bottom > 0;
          syncScene();
        },
        { passive: true },
      );
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener("resize", resize, { passive: true });
    resize();
    syncScene();
  }
  // Canvas is decorative: unavailable GPU/canvas support must not disable content.
  try {
    createHeroScene();
  } catch {
    hero.classList.remove("canvas-ready");
  }
  document.addEventListener("visibilitychange", () => {
    body.classList.toggle("page-hidden", document.hidden);
    syncScene();
  });

  // On-demand academic map: use the original data, without a 2.6 MB Plotly bundle.
  const mapControls = $(".map-controls");
  const mapLoad = $(".map-load");
  const mapStatus = $(".map-status");
  const fieldSelect = $("#map-field");
  const topicSelect = $("#map-topic");
  mapControls.hidden = false;
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
  const colors = [
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
  // Source colors identify fields in the original CSV; display colors suit the light page.
  const displayColors = [
    "#806092",
    "#658344",
    "#75689e",
    "#ab6d59",
    "#9c793f",
    "#7c803a",
    "#3b7fa5",
    "#a47748",
    "#2c8876",
    "#866c8d",
    "#348a97",
    "#528471",
    "#7b8045",
    "#527f50",
    "#a46d86",
    "#ac7164",
    "#a56477",
    "#4c855d",
    "#9e813e",
  ];
  let topicPoints = [],
    circles = [],
    selectedField = "all";
  // CSV quoted fields can contain commas; parse rather than splitting blindly.
  function parseCSV(text) {
    const rows = [];
    let row = [],
      field = "",
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }
  function updateMap() {
    selectedField = fieldSelect.value;
    let count = 0;
    topicSelect.replaceChildren(new Option("Choose a topic", ""));
    circles.forEach((circle, i) => {
      const active =
        selectedField === "all" ||
        topicPoints[i].field === Number(selectedField);
      circle.setAttribute("opacity", active ? ".85" : ".045");
      circle.style.pointerEvents = active ? "auto" : "none";
      circle.classList.remove("is-selected");
      if (active) {
        count++;
        topicSelect.add(new Option(topicPoints[i].name, String(i)));
      }
    });
    const label =
      selectedField === "all" ? "All fields" : fields[Number(selectedField)];
    mapStatus.textContent = `${label} · ${count.toLocaleString()} topics.`;
    $("#map-title").textContent =
      `Acemap topic map: ${label}, ${count} topics. Choose a research field using the dropdown below.`;
  }
  mapLoad.addEventListener("click", async () => {
    mapLoad.disabled = true;
    mapLoad.textContent = "Loading topics…";
    mapStatus.textContent = "Loading the original Acemap dataset.";
    try {
      const response = await fetch("data/data.csv");
      if (!response.ok) throw new Error("Map data unavailable");
      const rows = parseCSV(await response.text()).slice(1);
      topicPoints = rows
        .map((r) => ({
          x: Number(r[0]),
          y: Number(r[1]),
          name: r[3],
          color: r[4],
          field: colors.indexOf(r[4]),
        }))
        .filter(
          (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0,
        );
      if (!topicPoints.length) throw new Error("No valid map points");
      const xs = topicPoints.map((p) => p.x),
        ys = topicPoints.map((p) => p.y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const scale = Math.min(550 / (maxX - minX), 310 / (maxY - minY));
      const offsetX = (600 - (maxX - minX) * scale) / 2,
        offsetY = (360 - (maxY - minY) * scale) / 2;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.id = "topic-points";
      const fragment = document.createDocumentFragment();
      topicPoints.forEach((point, i) => {
        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        circle.setAttribute(
          "cx",
          ((point.x - minX) * scale + offsetX).toFixed(2),
        );
        circle.setAttribute(
          "cy",
          ((point.y - minY) * scale + offsetY).toFixed(2),
        );
        circle.setAttribute("r", "1.9");
        circle.setAttribute("fill", displayColors[point.field]);
        circle.setAttribute("class", "map-point");
        circle.dataset.point = i;
        fragment.appendChild(circle);
      });
      group.appendChild(fragment);
      $("#map-preview").replaceWith(group);
      circles = [...group.children];
      fields.forEach((field, i) => {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = field;
        fieldSelect.appendChild(option);
      });
      function showTopic(event) {
        const index = event.target.dataset.point;
        if (index === undefined) return;
        const point = topicPoints[Number(index)];
        mapStatus.textContent = `${point.name} · ${fields[point.field]}`;
      }
      group.addEventListener("pointerover", showTopic);
      group.addEventListener("click", showTopic);
      mapLoad.hidden = true;
      $(".field-select").hidden = false;
      $(".topic-select").hidden = false;
      updateMap();
      fieldSelect.focus({ preventScroll: true });
    } catch {
      mapLoad.disabled = false;
      mapLoad.textContent = "Try loading the map again";
      mapStatus.textContent =
        "The map could not load. You can retry or visit Acemap using the project link.";
    }
  });
  fieldSelect.addEventListener("change", updateMap);
  topicSelect.addEventListener("change", () => {
    circles.forEach((circle) => circle.classList.remove("is-selected"));
    if (topicSelect.value === "") return;
    const index = Number(topicSelect.value),
      point = topicPoints[index];
    circles[index].classList.add("is-selected");
    mapStatus.textContent = `${point.name} · ${fields[point.field]}`;
  });
})();
