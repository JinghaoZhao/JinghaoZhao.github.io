/* V4 Cyanotype CAD Workstation — Interactive Motion & Systems Telemetry */
(function () {
  "use strict";

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  var motionEnabled = !reduceMotionQuery.matches;

  var yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------------
     1. Scroll Header, Progress Hairline & Active Section Nav
     ------------------------------------------------------------------------ */
  var header = $("#site-header");
  var progressBar = $("#scroll-progress");
  var navLinks = $$(".main-nav a");
  var navSections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  var scrollTicking = false;
  function updateScrollState() {
    scrollTicking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if (header) {
      header.classList.toggle("is-scrolled", y > 28);
    }
    if (progressBar) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = docH > 0 ? Math.max(0, Math.min(1, y / docH)) : 0;
      progressBar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
    }
    var activeId = "";
    for (var i = 0; i < navSections.length; i++) {
      var sec = navSections[i];
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.38) {
        activeId = sec.id;
      }
    }
    for (var j = 0; j < navLinks.length; j++) {
      var link = navLinks[j];
      if (link.getAttribute("href") === "#" + activeId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollState);
      }
    },
    { passive: true }
  );
  updateScrollState();

  /* ------------------------------------------------------------------------
     2. CAD Draw-In Choreography (Corner Crosshairs + Hairline Border Sweep)
     ------------------------------------------------------------------------ */
  if ("IntersectionObserver" in window && motionEnabled) {
    var cadObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-pending");
          entry.target.classList.add("just-drawn");
          cadObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );

    $$(".cad-reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add("is-pending");
      }
      cadObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     3. Hero Interactive CAD Drafting Canvas
        - Cursor projects live dimension lines & coordinate readouts
        - Snaps to glowing circuit nodes & fires Manhattan-routed packets
        - Autonomous demo pulses on mobile / idle
     ------------------------------------------------------------------------ */
  var syncHeroCanvas = function () {};

  function initHeroCADCanvas() {
    var hero = $("#large-header");
    var canvas = $("#blueprint-canvas");
    var coordsHud = $("#hero-cad-coords");
    var packetStatus = $("#hero-packet-status");
    if (!hero || !canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var width = 0;
    var height = 0;
    var gridStep = 48;
    var nodes = [];
    var staticTraces = [];
    var packets = [];
    var ripples = [];
    var rafId = 0;
    var lastTime = 0;
    var heroVisible = true;
    var pointer = { active: false, x: 420, y: 180, snappedIdx: -1 };
    var lastSnapIdx = -1;
    var autoTimer = 0;
    var demoProbe = { x: 240, y: 192, tx: 480, ty: 240 };

    function pad4(n) {
      var v = Math.max(0, Math.round(n));
      return String(v).padStart(4, "0");
    }

    function createRng(seedInit) {
      var s = seedInit;
      return function () {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    function buildManhattanPath(ax, ay, bx, by, horizFirst) {
      var pts = [{ x: ax, y: ay }];
      if (horizFirst) {
        var mx = Math.round(((ax + bx) * 0.5) / gridStep) * gridStep;
        pts.push({ x: mx, y: ay });
        pts.push({ x: mx, y: by });
      } else {
        var my = Math.round(((ay + by) * 0.5) / gridStep) * gridStep;
        pts.push({ x: ax, y: my });
        pts.push({ x: bx, y: my });
      }
      pts.push({ x: bx, y: by });

      var totalLen = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        totalLen +=
          Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
      }
      return { pts: pts, totalLen: Math.max(1, totalLen) };
    }

    function spawnPacket(fromIdx, toIdx, isAmber) {
      if (!nodes[fromIdx] || !nodes[toIdx] || fromIdx === toIdx) return;
      var a = nodes[fromIdx];
      var b = nodes[toIdx];
      var route = buildManhattanPath(a.x, a.y, b.x, b.y, (fromIdx + toIdx) % 2 === 0);
      packets.push({
        route: route,
        progress: 0,
        speed: isAmber ? 0.85 : 0.62,
        tailLen: isAmber ? 64 : 52,
        isAmber: Boolean(isAmber),
        targetX: b.x,
        targetY: b.y,
      });
      if (packets.length > 26) {
        packets.shift();
      }
    }

    function buildNetwork() {
      width = hero.clientWidth || window.innerWidth;
      height = hero.clientHeight || 640;
      gridStep = width < 640 ? 40 : 48;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var rng = createRng(7411);
      var cols = Math.max(5, Math.floor(width / gridStep));
      var rows = Math.max(5, Math.floor(height / gridStep));
      var nodeCount = width < 640 ? 14 : 26;

      nodes = [];
      var used = {};
      for (var i = 0; i < nodeCount; i++) {
        var gx = 1 + Math.floor(rng() * (cols - 1));
        var gy = 1 + Math.floor(rng() * (rows - 1));
        var key = gx + "," + gy;
        if (used[key]) continue;
        used[key] = true;
        nodes.push({
          x: gx * gridStep,
          y: gy * gridStep,
          isAmber: i % 5 === 0,
          pulse: rng() * Math.PI * 2,
        });
      }

      staticTraces = [];
      for (var a = 0; a < nodes.length; a++) {
        var bestIdx = -1;
        var bestDist = Infinity;
        for (var b = a + 1; b < nodes.length; b++) {
          var d =
            Math.abs(nodes[a].x - nodes[b].x) +
            Math.abs(nodes[a].y - nodes[b].y);
          if (d < bestDist && d > gridStep * 1.5) {
            bestDist = d;
            bestIdx = b;
          }
        }
        if (bestIdx >= 0) {
          staticTraces.push({
            route: buildManhattanPath(
              nodes[a].x,
              nodes[a].y,
              nodes[bestIdx].x,
              nodes[bestIdx].y,
              a % 2 === 0
            ),
            isAmber: nodes[a].isAmber,
          });
        }
      }

      packets = [];
      ripples = [];
      for (var p = 0; p < Math.min(6, nodes.length - 1); p++) {
        spawnPacket(p, (p + 3) % nodes.length, p % 3 === 0);
      }

      drawFrame(0);
    }

    function sampleRoute(route, dist) {
      var rem = dist;
      for (var i = 0; i < route.pts.length - 1; i++) {
        var p0 = route.pts[i];
        var p1 = route.pts[i + 1];
        var seg = Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
        if (rem <= seg || i === route.pts.length - 2) {
          var t = seg > 0 ? Math.max(0, Math.min(1, rem / seg)) : 0;
          return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
        }
        rem -= seg;
      }
      return route.pts[route.pts.length - 1];
    }

    function findNearestNode(x, y, maxDist) {
      var best = -1;
      var bestD2 = maxDist * maxDist;
      for (var i = 0; i < nodes.length; i++) {
        var dx = nodes[i].x - x;
        var dy = nodes[i].y - y;
        var d2 = dx * dx + dy * dy;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    function drawFrame(dt) {
      ctx.clearRect(0, 0, width, height);

      // Ruler ticks along top & left perimeter
      ctx.strokeStyle = "rgba(112, 204, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var rx = gridStep; rx < width; rx += gridStep) {
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, rx % (gridStep * 3) === 0 ? 10 : 5);
      }
      for (var ry = gridStep; ry < height; ry += gridStep) {
        ctx.moveTo(0, ry);
        ctx.lineTo(ry % (gridStep * 3) === 0 ? 10 : 5, ry);
      }
      ctx.stroke();

      // Static Manhattan circuit traces
      for (var t = 0; t < staticTraces.length; t++) {
        var tr = staticTraces[t];
        var pts = tr.route.pts;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k].x, pts[k].y);
        }
        ctx.strokeStyle = tr.isAmber
          ? "rgba(245, 185, 99, 0.14)"
          : "rgba(112, 204, 255, 0.16)";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Autonomous demo pulses when idle or on touch devices
      if (dt > 0) {
        autoTimer += dt;
        if (autoTimer >= 1.15 && nodes.length > 2) {
          autoTimer = 0;
          var aIdx = Math.floor(Math.random() * nodes.length);
          var bIdx = (aIdx + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
          spawnPacket(aIdx, bIdx, Math.random() < 0.35);
          if (!pointer.active) {
            demoProbe.tx = nodes[bIdx].x;
            demoProbe.ty = nodes[bIdx].y;
          }
        }
        if (!pointer.active) {
          demoProbe.x += (demoProbe.tx - demoProbe.x) * Math.min(1, dt * 2.2);
          demoProbe.y += (demoProbe.ty - demoProbe.y) * Math.min(1, dt * 2.2);
          if (coordsHud) {
            coordsHud.textContent =
              "X: " + pad4(demoProbe.x) + " / Y: " + pad4(demoProbe.y);
          }
        }
      }

      // Circuit nodes
      for (var n = 0; n < nodes.length; n++) {
        var nd = nodes[n];
        nd.pulse += dt * 2.2;
        var isSnapped = pointer.active && pointer.snappedIdx === n;
        var r = isSnapped ? 4.8 : 2.8;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isSnapped
          ? "#f5b963"
          : nd.isAmber
          ? "rgba(245, 185, 99, 0.55)"
          : "rgba(112, 204, 255, 0.45)";
        ctx.fill();

        if (isSnapped) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245, 185, 99, 0.85)";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // Live Blueprint Dimension Lines (cursor or autonomous probe)
      var probeX = pointer.active ? pointer.x : demoProbe.x;
      var probeY = pointer.active ? pointer.y : demoProbe.y;
      if (pointer.active && pointer.snappedIdx >= 0 && nodes[pointer.snappedIdx]) {
        probeX = nodes[pointer.snappedIdx].x;
        probeY = nodes[pointer.snappedIdx].y;
      }

      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = pointer.active
        ? "rgba(112, 204, 255, 0.36)"
        : "rgba(112, 204, 255, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, probeY);
      ctx.lineTo(width, probeY);
      ctx.moveTo(probeX, 0);
      ctx.lineTo(probeX, height);
      ctx.stroke();
      ctx.restore();

      // Dimension tick marks + live coordinate label on canvas
      if (pointer.active) {
        ctx.fillStyle = "rgba(6, 24, 51, 0.85)";
        ctx.strokeStyle = "rgba(112, 204, 255, 0.6)";
        ctx.lineWidth = 1;
        var label = "X:" + pad4(probeX) + " Y:" + pad4(probeY);
        var lx = Math.min(width - 134, probeX + 14);
        var ly = Math.max(24, probeY - 14);
        ctx.fillRect(lx, ly - 15, 118, 20);
        ctx.strokeRect(lx, ly - 15, 118, 20);
        ctx.fillStyle = "#70ccff";
        ctx.font = "10.5px ui-monospace, Menlo, monospace";
        ctx.fillText(label, lx + 7, ly - 2);
      }

      // Manhattan-routed animated packets
      for (var i = packets.length - 1; i >= 0; i--) {
        var pk = packets[i];
        if (dt > 0) {
          pk.progress += pk.speed * dt;
        }
        if (pk.progress >= 1) {
          ripples.push({
            x: pk.targetX,
            y: pk.targetY,
            r: 4,
            alpha: 0.85,
            isAmber: pk.isAmber,
          });
          packets.splice(i, 1);
          continue;
        }

        var headDist = pk.progress * pk.route.totalLen;
        var tailDist = Math.max(0, headDist - pk.tailLen);
        var head = sampleRoute(pk.route, headDist);
        var tail = sampleRoute(pk.route, tailDist);

        var grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        if (pk.isAmber) {
          grad.addColorStop(0, "rgba(245, 185, 99, 0)");
          grad.addColorStop(1, "rgba(245, 185, 99, 0.95)");
        } else {
          grad.addColorStop(0, "rgba(112, 204, 255, 0)");
          grad.addColorStop(1, "rgba(112, 204, 255, 0.95)");
        }

        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = pk.isAmber ? "#f5b963" : "#eef6ff";
        ctx.fill();
      }

      // Arrival ripples
      for (var rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
        var rp = ripples[rIdx];
        if (dt > 0) {
          rp.r += dt * 36;
          rp.alpha -= dt * 1.4;
        }
        if (rp.alpha <= 0) {
          ripples.splice(rIdx, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.isAmber
          ? "rgba(245, 185, 99, " + rp.alpha.toFixed(2) + ")"
          : "rgba(112, 204, 255, " + rp.alpha.toFixed(2) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (packetStatus) {
        packetStatus.textContent = "BUS: " + packets.length + " PKTS";
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !heroVisible || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime || now - lastTime >= 28) {
        var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.08) : 0;
        lastTime = now;
        drawFrame(dt);
      }
      rafId = requestAnimationFrame(tick);
    }

    syncHeroCanvas = function () {
      if (motionEnabled && heroVisible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
      }
    };

    hero.addEventListener(
      "pointermove",
      function (evt) {
        if (!finePointerQuery.matches) return;
        var rect = hero.getBoundingClientRect();
        pointer.active = true;
        pointer.x = evt.clientX - rect.left;
        pointer.y = evt.clientY - rect.top;
        pointer.snappedIdx = findNearestNode(pointer.x, pointer.y, 92);
        if (coordsHud) {
          var sx =
            pointer.snappedIdx >= 0 ? nodes[pointer.snappedIdx].x : pointer.x;
          var sy =
            pointer.snappedIdx >= 0 ? nodes[pointer.snappedIdx].y : pointer.y;
          coordsHud.textContent = "X: " + pad4(sx) + " / Y: " + pad4(sy);
        }
        if (
          motionEnabled &&
          pointer.snappedIdx >= 0 &&
          pointer.snappedIdx !== lastSnapIdx
        ) {
          lastSnapIdx = pointer.snappedIdx;
          var targetIdx = (pointer.snappedIdx + 4) % nodes.length;
          spawnPacket(pointer.snappedIdx, targetIdx, true);
          spawnPacket(
            pointer.snappedIdx,
            (pointer.snappedIdx + 7) % nodes.length,
            false
          );
        }
      },
      { passive: true }
    );

    hero.addEventListener("pointerleave", function () {
      pointer.active = false;
      pointer.snappedIdx = -1;
      lastSnapIdx = -1;
    });

    hero.addEventListener("click", function (evt) {
      if (!motionEnabled || evt.target.closest("a, button")) return;
      var rect = hero.getBoundingClientRect();
      var cx = evt.clientX - rect.left;
      var cy = evt.clientY - rect.top;
      var near = findNearestNode(cx, cy, 180);
      if (near >= 0 && nodes.length > 3) {
        for (var k = 1; k <= 3; k++) {
          spawnPacket(near, (near + k * 3) % nodes.length, k === 1);
        }
      }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        syncHeroCanvas();
      }).observe(hero);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(buildNetwork).observe(hero);
    } else {
      window.addEventListener("resize", buildNetwork, { passive: true });
    }

    buildNetwork();
    syncHeroCanvas();
  }

  try {
    initHeroCADCanvas();
  } catch (e) {
    // Decorative canvas fallback
  }

  /* ------------------------------------------------------------------------
     4. Interactive Bare Metal Architecture Simulator
     ------------------------------------------------------------------------ */
  var simulator = $("#bm-simulator");
  var simButtons = $$("[data-sim-btn]");
  var simModePill = $("#sim-mode-pill");
  var simTeleRoute = $("#sim-tele-route");
  var simTeleLayers = $("#sim-tele-layers");
  var simModeNote = $("#sim-mode-note");
  var pillarCards = $$("[data-pillar]");

  var SIM_MODES = {
    normal: {
      pill: "MODE: NORMAL FABRIC",
      route: "BALANCED CLOUD FABRIC",
      layers: "SILICON + CONTROL + FABRIC",
      note: "Dedicated physical hosts operate as first-class cloud citizens across compute, control, and fabric boundaries.",
    },
    provisioning: {
      pill: "MODE: PROVISIONING",
      route: "CONTROL-PLANE ORCHESTRATION",
      layers: "FLEET LIFECYCLE + CONTROL PLANE",
      note: "Automated provisioning, orchestration, and safe control-plane transitions bring physical machines cleanly into the fleet.",
    },
    cme: {
      pill: "MODE: CME ULTRA-LOW-LATENCY",
      route: "DETERMINISTIC BARE METAL PATH",
      layers: "DEDICATED SILICON + FABRIC I/O",
      note: "Dedicated bare metal compute and deterministic networking combine physical precision with cloud flexibility for trading workloads.",
    },
  };

  function setSimulatorMode(modeKey) {
    if (!simulator || !SIM_MODES[modeKey]) return;
    var cfg = SIM_MODES[modeKey];
    simulator.setAttribute("data-sim-mode", modeKey);
    if (simModePill) simModePill.textContent = cfg.pill;
    if (simTeleRoute) simTeleRoute.textContent = cfg.route;
    if (simTeleLayers) simTeleLayers.textContent = cfg.layers;
    if (simModeNote) simModeNote.textContent = cfg.note;

    simButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-sim-btn") === modeKey;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    pillarCards.forEach(function (card) {
      card.classList.toggle(
        "is-highlighted",
        card.getAttribute("data-pillar") === modeKey
      );
    });
  }

  simButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setSimulatorMode(btn.getAttribute("data-sim-btn"));
    });
  });

  pillarCards.forEach(function (card) {
    card.addEventListener("click", function () {
      setSimulatorMode(card.getAttribute("data-pillar"));
    });
  });

  /* ------------------------------------------------------------------------
     5. Continuous-Flow CAD Schematic Workbench (All 6 Projects)
     ------------------------------------------------------------------------ */
  $$("[data-schematic]").forEach(function (stage) {
    var tabs = $$(".stage-tab", stage);
    var playBtn = $(".stage-play", stage);
    var readout = $(".stage-readout", stage);
    var defaultText = readout ? readout.textContent : "";
    var timerId = 0;

    function stopTour() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = 0;
      }
      if (playBtn) {
        playBtn.classList.remove("is-playing");
        playBtn.textContent = "▶ Tour";
      }
    }

    function setStep(stepStr) {
      stage.setAttribute("data-step", stepStr);
      tabs.forEach(function (tab) {
        var active = tab.getAttribute("data-stage") === stepStr;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      if (readout) {
        if (stepStr === "0") {
          readout.textContent = defaultText;
        } else {
          var text = stage.getAttribute("data-step" + stepStr) || defaultText;
          readout.textContent = "STAGE 0" + stepStr + ": " + text;
        }
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        stopTour();
        setStep(tab.getAttribute("data-stage"));
      });
    });

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (timerId) {
          stopTour();
          setStep("0");
          return;
        }
        playBtn.classList.add("is-playing");
        playBtn.textContent = "■ Stop";
        var seq = ["1", "2", "3", "0"];
        var idx = 0;
        var intervalMs = motionEnabled ? 1600 : 1100;

        function nextStep() {
          setStep(seq[idx]);
          idx += 1;
          if (idx < seq.length) {
            timerId = setTimeout(nextStep, intervalMs);
          } else {
            timerId = 0;
            playBtn.classList.remove("is-playing");
            playBtn.textContent = "▶ Tour";
          }
        }
        nextStep();
      });
    }
  });

  /* ------------------------------------------------------------------------
     6. Acemap — Cyanotype Sonar Radar Sweep (<canvas> 2,208 Topics)
     ------------------------------------------------------------------------ */
  var mapLoadBtn = $(".map-load");
  var mapSelectors = $(".map-selectors");
  var fieldSelect = $("#map-field");
  var topicSelect = $("#map-topic");
  var rescanBtn = $("#radar-rescan");
  var mapStatus = $("#map-status");
  var coordXy = $("#coord-xy");
  var plotBadge = $("#plot-mode-badge");
  var radarCanvas = $("#acemap-canvas");
  var syncRadarLoop = function () {};

  var fields = [
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

  var sourceColors = [
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

  var radarColors = [
    "#f4a9f0",
    "#b8e978",
    "#c9baff",
    "#ffa987",
    "#f5b963",
    "#e5dc6c",
    "#70ccff",
    "#f3be83",
    "#5ee9c5",
    "#cbb4d8",
    "#56e4f7",
    "#94d9c4",
    "#d1d98c",
    "#8ed688",
    "#ffb3c6",
    "#ffa194",
    "#ff9eb3",
    "#84f39a",
    "#ffd166",
  ];

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
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

  function initAcemapRadar() {
    if (!radarCanvas) return;
    var ctx = radarCanvas.getContext("2d");
    if (!ctx) return;

    var W = 600;
    var H = 360;
    var CX = 300;
    var CY = 180;
    var MAX_R = 260;

    var loaded = false;
    var points = [];
    var selectedField = "all";
    var hoveredIndex = -1;
    var selectedIndex = -1;
    var radarVisible = true;
    var radarRaf = 0;
    var lastTs = 0;
    var sweepAngle = 0;
    var sweepBoost = 0; // >0 during active discovery rescan

    function setupCanvasDpr() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      radarCanvas.width = Math.round(W * dpr);
      radarCanvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    setupCanvasDpr();

    function isPointActive(i) {
      return (
        selectedField === "all" || points[i].field === Number(selectedField)
      );
    }

    function angularDiff(a, b) {
      var d = (a - b) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      return d;
    }

    function drawRadar(dt) {
      if (dt > 0 && motionEnabled) {
        var rotSpeed = sweepBoost > 0 ? 2.4 : 0.72;
        sweepAngle = (sweepAngle + rotSpeed * dt) % (Math.PI * 2);
        if (sweepBoost > 0) {
          sweepBoost = Math.max(0, sweepBoost - dt);
        }
      }

      ctx.clearRect(0, 0, W, H);

      // Deep cyanotype radar background
      ctx.fillStyle = "#041328";
      ctx.fillRect(0, 0, W, H);

      // Cartesian grid hairlines
      ctx.strokeStyle = "rgba(112, 204, 255, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 60; gx < W; gx += 60) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
      }
      for (var gy = 60; gy < H; gy += 60) {
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
      }
      ctx.stroke();

      // Concentric sonar range rings
      ctx.strokeStyle = "rgba(112, 204, 255, 0.2)";
      [60, 120, 180, 240].forEach(function (rad) {
        ctx.beginPath();
        ctx.arc(CX, CY, rad, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Rotating cyanotype sonar sweep wedge
      if (motionEnabled) {
        var wedgeSpan = sweepBoost > 0 ? 0.72 : 0.45;
        var steps = 16;
        for (var s = 0; s < steps; s++) {
          var a0 = sweepAngle - (wedgeSpan * (s + 1)) / steps;
          var a1 = sweepAngle - (wedgeSpan * s) / steps;
          var alpha = ((steps - s) / steps) * (sweepBoost > 0 ? 0.2 : 0.11);
          ctx.beginPath();
          ctx.moveTo(CX, CY);
          ctx.arc(CX, CY, MAX_R + 50, a0, a1);
          ctx.closePath();
          ctx.fillStyle = "rgba(112, 204, 255, " + alpha.toFixed(3) + ")";
          ctx.fill();
        }
        // Leading sonar beam ray
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(
          CX + Math.cos(sweepAngle) * (MAX_R + 50),
          CY + Math.sin(sweepAngle) * (MAX_R + 50)
        );
        ctx.strokeStyle = "rgba(112, 204, 255, 0.78)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      if (!loaded) {
        // Standby constellation preview
        var previewNodes = [
          [120, 120],
          [300, 48],
          [465, 100],
          [480, 240],
          [315, 314],
          [130, 265],
          [300, 180],
        ];
        ctx.strokeStyle = "rgba(112, 204, 255, 0.32)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(120, 120);
        for (var p = 1; p < 6; p++) {
          ctx.lineTo(previewNodes[p][0], previewNodes[p][1]);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        previewNodes.forEach(function (pt, idx) {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], idx === 6 ? 7 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === 6 ? "#f5b963" : "#70ccff";
          ctx.fill();
        });
        return;
      }

      // Draw all 2,208 points with sonar-beam illumination!
      for (var i = 0; i < points.length; i++) {
        var pt = points[i];
        var active = isPointActive(i);
        var ping = 0;
        if (motionEnabled && active) {
          var diff = angularDiff(sweepAngle, pt.theta);
          if (diff < 0.55) {
            ping = 1 - diff / 0.55;
            if (!pt.discovered) pt.discovered = true;
          }
        } else if (active) {
          pt.discovered = true;
        }

        var isFocus = i === selectedIndex || i === hoveredIndex;
        var baseAlpha = !active
          ? 0.05
          : pt.discovered
          ? 0.78 + ping * 0.22
          : 0.16;
        var radius = isFocus
          ? 4.8
          : active
          ? 1.9 + ping * (sweepBoost > 0 ? 2.1 : 1.1)
          : 1.5;

        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = radarColors[pt.field];
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (ping > 0.65 && active && sweepBoost > 0) {
          ctx.globalAlpha = ping * 0.35;
          ctx.beginPath();
          ctx.arc(pt.cx, pt.cy, radius + 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Crosshair Lock-On Reticle for Hovered or Selected Topic
      var lockIdx = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
      if (lockIdx >= 0 && points[lockIdx]) {
        var lockPt = points[lockIdx];
        ctx.save();
        ctx.strokeStyle = "rgba(245, 185, 99, 0.72)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, lockPt.cy);
        ctx.lineTo(W, lockPt.cy);
        ctx.moveTo(lockPt.cx, 0);
        ctx.lineTo(lockPt.cx, H);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "#f5b963";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(lockPt.cx, lockPt.cy, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#eef6ff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(lockPt.cx, lockPt.cy, 4.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function tickRadar(now) {
      radarRaf = 0;
      if (!motionEnabled || !radarVisible || document.hidden) {
        lastTs = 0;
        return;
      }
      if (!lastTs || now - lastTs >= 24) {
        var dt = lastTs ? Math.min((now - lastTs) / 1000, 0.08) : 0;
        lastTs = now;
        drawRadar(dt);
      }
      radarRaf = requestAnimationFrame(tickRadar);
    }

    syncRadarLoop = function () {
      if (motionEnabled && radarVisible && !document.hidden) {
        if (!radarRaf) radarRaf = requestAnimationFrame(tickRadar);
      } else {
        if (radarRaf) cancelAnimationFrame(radarRaf);
        radarRaf = 0;
        lastTs = 0;
        drawRadar(0);
      }
    };

    function updateLockReadout(idx) {
      if (idx >= 0 && points[idx]) {
        var pt = points[idx];
        if (coordXy) {
          coordXy.textContent =
            "X: " + pt.x.toFixed(1) + " · Y: " + pt.y.toFixed(1);
        }
        if (mapStatus) {
          mapStatus.textContent = pt.name + " · " + fields[pt.field];
        }
      } else {
        if (coordXy) coordXy.textContent = "X: — · Y: —";
        if (loaded && mapStatus) {
          var label =
            selectedField === "all"
              ? "All fields"
              : fields[Number(selectedField)];
          var count = topicSelect ? topicSelect.options.length - 1 : points.length;
          mapStatus.textContent =
            label + " · " + count.toLocaleString() + " topics plotted.";
        }
      }
    }

    function updateFieldFilter() {
      selectedField = fieldSelect.value;
      hoveredIndex = -1;
      selectedIndex = -1;
      var count = 0;
      topicSelect.innerHTML = "";
      topicSelect.appendChild(new Option("Choose a topic", ""));

      for (var i = 0; i < points.length; i++) {
        if (isPointActive(i)) {
          count++;
          topicSelect.appendChild(new Option(points[i].name, String(i)));
        }
      }
      sweepBoost = motionEnabled ? 2.6 : 0;
      updateLockReadout(-1);
      if (!motionEnabled) drawRadar(0);
    }

    function findNearest(clientX, clientY, maxDist) {
      var rect = radarCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return -1;
      var vx = ((clientX - rect.left) / rect.width) * W;
      var vy = ((clientY - rect.top) / rect.height) * H;
      var best = -1;
      var bestD2 = maxDist * maxDist;
      for (var i = 0; i < points.length; i++) {
        if (!isPointActive(i)) continue;
        var dx = points[i].cx - vx;
        var dy = points[i].cy - vy;
        var d2 = dx * dx + dy * dy;
        if (d2 <= bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    if (mapLoadBtn) {
      mapLoadBtn.addEventListener("click", function () {
        mapLoadBtn.disabled = true;
        mapLoadBtn.textContent = "Acquiring 2,208 topics…";
        if (mapStatus) {
          mapStatus.textContent = "Loading original Acemap dataset (data.csv)…";
        }

        fetch("../../data/data.csv")
          .then(function (resp) {
            if (!resp.ok) throw new Error("CSV unavailable");
            return resp.text();
          })
          .then(function (csvText) {
            var rows = parseCSV(csvText).slice(1);
            points = rows
              .map(function (r) {
                return {
                  x: Number(r[0]),
                  y: Number(r[1]),
                  name: r[3],
                  color: r[4],
                  field: sourceColors.indexOf(r[4]),
                  cx: 0,
                  cy: 0,
                  theta: 0,
                  discovered: !motionEnabled,
                };
              })
              .filter(function (p) {
                return (
                  Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0
                );
              });

            if (!points.length) throw new Error("Empty dataset");

            var minX = Infinity;
            var maxX = -Infinity;
            var minY = Infinity;
            var maxY = -Infinity;
            for (var i = 0; i < points.length; i++) {
              if (points[i].x < minX) minX = points[i].x;
              if (points[i].x > maxX) maxX = points[i].x;
              if (points[i].y < minY) minY = points[i].y;
              if (points[i].y > maxY) maxY = points[i].y;
            }

            var scale = Math.min(540 / (maxX - minX), 308 / (maxY - minY));
            var offX = (W - (maxX - minX) * scale) / 2;
            var offY = (H - (maxY - minY) * scale) / 2;

            for (var j = 0; j < points.length; j++) {
              var p = points[j];
              p.cx = Number(((p.x - minX) * scale + offX).toFixed(2));
              p.cy = Number(((p.y - minY) * scale + offY).toFixed(2));
              var ang = Math.atan2(p.cy - CY, p.cx - CX);
              if (ang < 0) ang += Math.PI * 2;
              p.theta = ang;
            }

            fields.forEach(function (fieldName, idx) {
              var opt = document.createElement("option");
              opt.value = String(idx);
              opt.textContent = fieldName;
              fieldSelect.appendChild(opt);
            });

            loaded = true;
            sweepAngle = 0;
            sweepBoost = motionEnabled ? 3.4 : 0;
            mapLoadBtn.hidden = true;
            if (mapSelectors) mapSelectors.hidden = false;
            if (plotBadge) plotBadge.textContent = "SONAR ACTIVE · 2,208 PTS";
            updateFieldFilter();
            drawRadar(0);
            syncRadarLoop();
            fieldSelect.focus({ preventScroll: true });
          })
          .catch(function () {
            mapLoadBtn.disabled = false;
            mapLoadBtn.textContent = "Retry sonar load ↗";
            if (mapStatus) {
              mapStatus.textContent =
                "Dataset could not load. Retry or visit Acemap directly.";
            }
          });
      });
    }

    if (fieldSelect) {
      fieldSelect.addEventListener("change", updateFieldFilter);
    }

    if (topicSelect) {
      topicSelect.addEventListener("change", function () {
        selectedIndex =
          topicSelect.value === "" ? -1 : Number(topicSelect.value);
        updateLockReadout(selectedIndex);
        if (!motionEnabled) drawRadar(0);
      });
    }

    if (rescanBtn) {
      rescanBtn.addEventListener("click", function () {
        if (!loaded) return;
        for (var i = 0; i < points.length; i++) {
          points[i].discovered = !motionEnabled;
        }
        sweepBoost = motionEnabled ? 3.2 : 0;
        if (!motionEnabled) drawRadar(0);
      });
    }

    radarCanvas.addEventListener("pointermove", function (evt) {
      if (!loaded) return;
      var idx = findNearest(evt.clientX, evt.clientY, 16);
      if (idx === hoveredIndex) return;
      hoveredIndex = idx;
      updateLockReadout(hoveredIndex >= 0 ? hoveredIndex : selectedIndex);
      if (!motionEnabled) drawRadar(0);
    });

    radarCanvas.addEventListener("pointerleave", function () {
      if (!loaded) return;
      hoveredIndex = -1;
      updateLockReadout(selectedIndex);
      if (!motionEnabled) drawRadar(0);
    });

    radarCanvas.addEventListener("click", function (evt) {
      if (!loaded) return;
      var idx = findNearest(evt.clientX, evt.clientY, 18);
      if (idx < 0) return;
      selectedIndex = idx;
      if (topicSelect) topicSelect.value = String(idx);
      updateLockReadout(selectedIndex);
      if (!motionEnabled) drawRadar(0);
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        radarVisible = entries[0].isIntersecting;
        syncRadarLoop();
      }).observe(radarCanvas);
    }

    drawRadar(0);
    syncRadarLoop();
  }

  try {
    initAcemapRadar();
  } catch (e) {
    // Graceful canvas fallback
  }

  document.addEventListener("visibilitychange", function () {
    syncHeroCanvas();
    syncRadarLoop();
  });

  if (reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener("change", function () {
      motionEnabled = !reduceMotionQuery.matches;
      if (!motionEnabled) {
        $$(".cad-reveal.is-pending").forEach(function (el) {
          el.classList.remove("is-pending");
        });
      }
      syncHeroCanvas();
      syncRadarLoop();
    });
  }

  /* ------------------------------------------------------------------------
     7. Engineering-Index Publications Register Filter
     ------------------------------------------------------------------------ */
  var filterButtons = $$(".publication-filters [data-filter]");
  var pubGroups = $$(".publication-group");
  var pubCountEl = $("#publication-count");

  function filterPublications(kind) {
    pubGroups.forEach(function (group) {
      group.hidden = kind !== "all" && group.getAttribute("data-kind") !== kind;
    });
    filterButtons.forEach(function (btn) {
      btn.setAttribute(
        "aria-pressed",
        String(btn.getAttribute("data-filter") === kind)
      );
    });

    var visibleGroups = pubGroups.filter(function (g) {
      return !g.hidden;
    });
    var count = 0;
    var years = [];
    visibleGroups.forEach(function (g) {
      var rows = $$(".pub-row", g);
      count += rows.length;
      $$(".publication-year", g).forEach(function (yEl) {
        var num = Number(yEl.textContent);
        if (Number.isFinite(num)) years.push(num);
      });
    });

    if (pubCountEl && years.length) {
      var minYear = Math.min.apply(null, years);
      var maxYear = Math.max.apply(null, years);
      var label = kind === "all" ? "publications" : kind + " publications";
      pubCountEl.textContent =
        count + " " + label + " · " + minYear + "–" + maxYear;
    }
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterPublications(btn.getAttribute("data-filter"));
    });
  });

  function syncPubHash() {
    if (location.hash === "#conf") filterPublications("conference");
    else if (location.hash === "#journal") filterPublications("journal");
  }
  window.addEventListener("hashchange", syncPubHash);
  syncPubHash();
})();
