/* V4 Cyanotype Systems Blueprint — Progressive Enhancement */
(function () {
  "use strict";

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionEnabled = !reduceMotionQuery.matches;

  var yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------------
     1. Scroll Header State & Active Nav Highlight
     ------------------------------------------------------------------------ */
  var header = $("#site-header");
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
    var activeId = "";
    for (var i = 0; i < navSections.length; i++) {
      var sec = navSections[i];
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.36) {
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
     2. One-Shot Section Reveal
     ------------------------------------------------------------------------ */
  if ("IntersectionObserver" in window && motionEnabled) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-pending");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );

    $$(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.95) {
        el.classList.add("is-pending");
      }
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     3. Hero Blueprint Canvas — Orthogonal Circuit Traces & Signal Pulses
     ------------------------------------------------------------------------ */
  var syncHeroCanvas = function () {};

  function initBlueprintCanvas() {
    var hero = $("#large-header");
    var canvas = $("#blueprint-canvas");
    if (!hero || !canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var width = 0;
    var height = 0;
    var traces = [];
    var pulses = [];
    var rafId = 0;
    var lastTime = 0;
    var heroVisible = true;

    function createRng(seedInit) {
      var s = seedInit;
      return function () {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    function buildCircuit() {
      width = hero.clientWidth || window.innerWidth;
      height = hero.clientHeight || 640;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var rng = createRng(4049);
      var step = width < 640 ? 40 : 48;
      var cols = Math.max(6, Math.floor(width / step));
      var rows = Math.max(6, Math.floor(height / step));
      var traceCount = width < 640 ? 12 : 22;

      traces = [];
      pulses = [];

      for (var t = 0; t < traceCount; t++) {
        var gx = Math.floor(rng() * (cols - 1)) + 1;
        var gy = Math.floor(rng() * (rows - 1)) + 1;
        var pts = [{ x: gx * step, y: gy * step }];
        var segments = 3 + Math.floor(rng() * 4);
        var horizontal = rng() > 0.5;
        var totalLen = 0;

        for (var seg = 0; seg < segments; seg++) {
          var dir = rng() > 0.5 ? 1 : -1;
          var dist = (2 + Math.floor(rng() * 5)) * step;
          var prev = pts[pts.length - 1];
          var nx = prev.x;
          var ny = prev.y;
          if (horizontal) {
            nx = Math.max(step, Math.min((cols - 1) * step, prev.x + dir * dist));
          } else {
            ny = Math.max(step, Math.min((rows - 1) * step, prev.y + dir * dist));
          }
          var segLen = Math.abs(nx - prev.x) + Math.abs(ny - prev.y);
          if (segLen > 0) {
            pts.push({ x: nx, y: ny });
            totalLen += segLen;
          }
          horizontal = !horizontal;
        }

        if (pts.length >= 2 && totalLen > step) {
          var isAmber = t % 5 === 0;
          traces.push({
            pts: pts,
            totalLen: totalLen,
            isAmber: isAmber,
          });
          pulses.push({
            traceIdx: t,
            progress: rng(),
            speed: 0.065 + rng() * 0.08,
            tailLen: 46 + rng() * 44,
            isAmber: isAmber,
          });
        }
      }

      drawFrame(0);
    }

    function samplePointOnTrace(trace, dist) {
      var remaining = dist;
      for (var i = 0; i < trace.pts.length - 1; i++) {
        var a = trace.pts[i];
        var b = trace.pts[i + 1];
        var segLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        if (remaining <= segLen || i === trace.pts.length - 2) {
          var ratio = segLen > 0 ? Math.max(0, Math.min(1, remaining / segLen)) : 0;
          return {
            x: a.x + (b.x - a.x) * ratio,
            y: a.y + (b.y - a.y) * ratio,
          };
        }
        remaining -= segLen;
      }
      return trace.pts[trace.pts.length - 1];
    }

    function drawFrame(dtSec) {
      ctx.clearRect(0, 0, width, height);

      // Draw orthogonal circuit traces & terminal pads
      for (var i = 0; i < traces.length; i++) {
        var tr = traces[i];
        ctx.beginPath();
        ctx.moveTo(tr.pts[0].x, tr.pts[0].y);
        for (var k = 1; k < tr.pts.length; k++) {
          ctx.lineTo(tr.pts[k].x, tr.pts[k].y);
        }
        ctx.strokeStyle = tr.isAmber
          ? "rgba(245, 185, 99, 0.16)"
          : "rgba(112, 204, 255, 0.18)";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Start & end junction nodes
        var start = tr.pts[0];
        var end = tr.pts[tr.pts.length - 1];
        ctx.fillStyle = tr.isAmber
          ? "rgba(245, 185, 99, 0.35)"
          : "rgba(112, 204, 255, 0.35)";
        ctx.fillRect(start.x - 2.5, start.y - 2.5, 5, 5);
        ctx.beginPath();
        ctx.arc(end.x, end.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw gliding signal pulses
      for (var p = 0; p < pulses.length; p++) {
        var pulse = pulses[p];
        var trace = traces[pulse.traceIdx];
        if (!trace) continue;
        if (dtSec > 0) {
          pulse.progress = (pulse.progress + pulse.speed * dtSec) % 1;
        }
        var headDist = pulse.progress * trace.totalLen;
        var head = samplePointOnTrace(trace, headDist);
        var tail = samplePointOnTrace(trace, Math.max(0, headDist - pulse.tailLen));

        var grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        if (pulse.isAmber) {
          grad.addColorStop(0, "rgba(245, 185, 99, 0)");
          grad.addColorStop(1, "rgba(245, 185, 99, 0.85)");
        } else {
          grad.addColorStop(0, "rgba(112, 204, 255, 0)");
          grad.addColorStop(1, "rgba(112, 204, 255, 0.88)");
        }

        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = pulse.isAmber ? "#f5b963" : "#eef6ff";
        ctx.fill();
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !heroVisible || document.hidden) {
        lastTime = 0;
        return;
      }
      if (!lastTime || now - lastTime >= 32) {
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

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        syncHeroCanvas();
      }).observe(hero);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(buildCircuit).observe(hero);
    } else {
      window.addEventListener("resize", buildCircuit, { passive: true });
    }

    buildCircuit();
    syncHeroCanvas();
  }

  try {
    initBlueprintCanvas();
  } catch (e) {
    // Decorative canvas failure must never block content
  }

  document.addEventListener("visibilitychange", function () {
    syncHeroCanvas();
  });

  if (reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener("change", function () {
      motionEnabled = !reduceMotionQuery.matches;
      if (!motionEnabled) {
        $$(".reveal.is-pending").forEach(function (el) {
          el.classList.remove("is-pending");
        });
      }
      syncHeroCanvas();
    });
  }

  /* ------------------------------------------------------------------------
     4. Interactive Schematic Inspector (All 6 Project Schematics)
     ------------------------------------------------------------------------ */
  $$("[data-schematic]").forEach(function (stage) {
    var tabs = $$(".stage-tab", stage);
    var playBtn = $(".stage-play", stage);
    var readout = $(".stage-readout", stage);
    var defaultText = readout ? readout.textContent : "";
    var timerId = 0;

    function stopWalkthrough() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = 0;
      }
      if (playBtn) {
        playBtn.classList.remove("is-playing");
        playBtn.textContent = "▶ Play";
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
        stopWalkthrough();
        setStep(tab.getAttribute("data-stage"));
      });
    });

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (timerId) {
          stopWalkthrough();
          setStep("0");
          return;
        }
        playBtn.classList.add("is-playing");
        playBtn.textContent = "■ Stop";
        var sequence = ["1", "2", "3", "0"];
        var idx = 0;
        var intervalMs = motionEnabled ? 1700 : 1200;

        function advance() {
          setStep(sequence[idx]);
          idx += 1;
          if (idx < sequence.length) {
            timerId = setTimeout(advance, intervalMs);
          } else {
            timerId = 0;
            playBtn.classList.remove("is-playing");
            playBtn.textContent = "▶ Play";
          }
        }
        advance();
      });
    }
  });

  /* ------------------------------------------------------------------------
     5. Acemap Interactive On-Demand Coordinate Plot (../../data/data.csv)
     ------------------------------------------------------------------------ */
  var mapLoadBtn = $(".map-load");
  var mapSelectors = $(".map-selectors");
  var fieldSelect = $("#map-field");
  var topicSelect = $("#map-topic");
  var mapStatus = $("#map-status");
  var coordXy = $("#coord-xy");
  var plotBadge = $("#plot-mode-badge");
  var topicMapSvg = $("#topic-map");
  var reticleGroup = $("#map-reticle");
  var reticleH = $("#reticle-h");
  var reticleV = $("#reticle-v");
  var reticleRing = $("#reticle-ring");

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

  // Luminous cyanotype-compatible discipline palette on deep Prussian #061833
  var blueprintColors = [
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

  var topicPoints = [];
  var circles = [];
  var selectedField = "all";
  var hoveredIndex = -1;
  var selectedIndex = -1;

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

  function isPointActive(i) {
    return (
      selectedField === "all" || topicPoints[i].field === Number(selectedField)
    );
  }

  function updateReticle(index) {
    if (!reticleGroup) return;
    if (index < 0 || !topicPoints[index]) {
      reticleGroup.setAttribute("hidden", "");
      if (coordXy) coordXy.textContent = "X: — · Y: —";
      return;
    }
    var pt = topicPoints[index];
    reticleGroup.removeAttribute("hidden");
    reticleH.setAttribute("y1", String(pt.cy));
    reticleH.setAttribute("y2", String(pt.cy));
    reticleV.setAttribute("x1", String(pt.cx));
    reticleV.setAttribute("x2", String(pt.cx));
    reticleRing.setAttribute("cx", String(pt.cx));
    reticleRing.setAttribute("cy", String(pt.cy));
    if (coordXy) {
      coordXy.textContent =
        "X: " + pt.x.toFixed(1) + " · Y: " + pt.y.toFixed(1);
    }
  }

  function syncCircleHighlight(index) {
    if (index < 0 || !circles[index]) return;
    var circle = circles[index];
    var isSelected = index === selectedIndex;
    var isHovered = index === hoveredIndex;
    circle.classList.toggle("is-selected", isSelected);
    circle.classList.toggle("is-hovered", isHovered);
    circle.setAttribute("r", isSelected ? "4.6" : isHovered ? "4.1" : "2.1");
  }

  function updateMapFilter() {
    selectedField = fieldSelect.value;
    hoveredIndex = -1;
    selectedIndex = -1;
    updateReticle(-1);
    var count = 0;
    topicSelect.innerHTML = "";
    topicSelect.appendChild(new Option("Choose a topic", ""));

    for (var i = 0; i < circles.length; i++) {
      var active = isPointActive(i);
      var c = circles[i];
      c.setAttribute("opacity", active ? "0.86" : "0.06");
      c.setAttribute("r", "2.1");
      c.style.pointerEvents = active ? "auto" : "none";
      c.classList.remove("is-selected", "is-hovered");
      if (active) {
        count++;
        topicSelect.appendChild(new Option(topicPoints[i].name, String(i)));
      }
    }

    var label =
      selectedField === "all" ? "All fields" : fields[Number(selectedField)];
    if (mapStatus) {
      mapStatus.textContent =
        label + " · " + count.toLocaleString() + " topics plotted.";
    }
    var mapTitle = $("#map-title");
    if (mapTitle) {
      mapTitle.textContent =
        "Acemap topic map: " +
        label +
        ", " +
        count +
        " topics. Use the field and topic selectors to inspect coordinates.";
    }
  }

  function findNearestPoint(clientX, clientY, maxDist) {
    var rect = topicMapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    var vx = ((clientX - rect.left) / rect.width) * 600;
    var vy = ((clientY - rect.top) / rect.height) * 360;
    var best = -1;
    var bestDistSq = maxDist * maxDist;
    for (var i = 0; i < topicPoints.length; i++) {
      if (!isPointActive(i)) continue;
      var dx = topicPoints[i].cx - vx;
      var dy = topicPoints[i].cy - vy;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bestDistSq) {
        bestDistSq = d2;
        best = i;
      }
    }
    return best;
  }

  if (mapLoadBtn && topicMapSvg) {
    mapLoadBtn.addEventListener("click", function () {
      mapLoadBtn.disabled = true;
      mapLoadBtn.textContent = "Loading 2,208 topics…";
      if (mapStatus) {
        mapStatus.textContent = "Fetching original Acemap dataset (data.csv)…";
      }

      fetch("../../data/data.csv")
        .then(function (response) {
          if (!response.ok) throw new Error("Dataset unavailable");
          return response.text();
        })
        .then(function (csvText) {
          var rows = parseCSV(csvText).slice(1);
          topicPoints = rows
            .map(function (r) {
              return {
                x: Number(r[0]),
                y: Number(r[1]),
                name: r[3],
                color: r[4],
                field: sourceColors.indexOf(r[4]),
                cx: 0,
                cy: 0,
              };
            })
            .filter(function (p) {
              return (
                Number.isFinite(p.x) && Number.isFinite(p.y) && p.field >= 0
              );
            });

          if (!topicPoints.length) throw new Error("No valid points");

          var minX = Infinity;
          var maxX = -Infinity;
          var minY = Infinity;
          var maxY = -Infinity;
          for (var i = 0; i < topicPoints.length; i++) {
            var pt = topicPoints[i];
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }

          var scale = Math.min(548 / (maxX - minX), 312 / (maxY - minY));
          var offsetX = (600 - (maxX - minX) * scale) / 2;
          var offsetY = (360 - (maxY - minY) * scale) / 2;

          var group = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
          );
          group.id = "topic-points";
          var frag = document.createDocumentFragment();

          for (var j = 0; j < topicPoints.length; j++) {
            var p = topicPoints[j];
            p.cx = Number(((p.x - minX) * scale + offsetX).toFixed(2));
            p.cy = Number(((p.y - minY) * scale + offsetY).toFixed(2));
            var circle = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle"
            );
            circle.setAttribute("cx", String(p.cx));
            circle.setAttribute("cy", String(p.cy));
            circle.setAttribute("r", "2.1");
            circle.setAttribute("fill", blueprintColors[p.field]);
            circle.setAttribute("class", "map-point");
            frag.appendChild(circle);
          }

          group.appendChild(frag);
          var preview = $("#map-preview");
          if (preview && preview.parentNode) {
            preview.parentNode.replaceChild(group, preview);
          }
          circles = Array.prototype.slice.call(group.children);

          fields.forEach(function (fieldName, idx) {
            var opt = document.createElement("option");
            opt.value = String(idx);
            opt.textContent = fieldName;
            fieldSelect.appendChild(opt);
          });

          topicMapSvg.addEventListener("pointermove", function (evt) {
            var idx = findNearestPoint(evt.clientX, evt.clientY, 16);
            if (idx === hoveredIndex) return;
            var prev = hoveredIndex;
            hoveredIndex = idx;
            syncCircleHighlight(prev);
            syncCircleHighlight(idx);
            if (idx >= 0) {
              var point = topicPoints[idx];
              updateReticle(idx);
              mapStatus.textContent =
                point.name + " · " + fields[point.field];
            } else if (selectedIndex >= 0) {
              var selPt = topicPoints[selectedIndex];
              updateReticle(selectedIndex);
              mapStatus.textContent =
                selPt.name + " · " + fields[selPt.field];
            } else {
              updateReticle(-1);
            }
          });

          topicMapSvg.addEventListener("pointerleave", function () {
            var prev = hoveredIndex;
            hoveredIndex = -1;
            syncCircleHighlight(prev);
            if (selectedIndex >= 0) {
              updateReticle(selectedIndex);
            } else {
              updateReticle(-1);
            }
          });

          topicMapSvg.addEventListener("click", function (evt) {
            var idx = findNearestPoint(evt.clientX, evt.clientY, 18);
            if (idx < 0) return;
            var prev = selectedIndex;
            selectedIndex = idx;
            syncCircleHighlight(prev);
            syncCircleHighlight(idx);
            topicSelect.value = String(idx);
            var point = topicPoints[idx];
            updateReticle(idx);
            mapStatus.textContent = point.name + " · " + fields[point.field];
          });

          mapLoadBtn.hidden = true;
          if (mapSelectors) mapSelectors.hidden = false;
          if (plotBadge) plotBadge.textContent = "LIVE DATASET · 2,208 PTS";
          updateMapFilter();
          fieldSelect.focus({ preventScroll: true });
        })
        .catch(function () {
          mapLoadBtn.disabled = false;
          mapLoadBtn.textContent = "Retry loading dataset ↗";
          if (mapStatus) {
            mapStatus.textContent =
              "Dataset could not load. Retry or visit Acemap via the external link.";
          }
        });
    });

    fieldSelect.addEventListener("change", updateMapFilter);

    topicSelect.addEventListener("change", function () {
      var prev = selectedIndex;
      selectedIndex =
        topicSelect.value === "" ? -1 : Number(topicSelect.value);
      syncCircleHighlight(prev);
      syncCircleHighlight(selectedIndex);
      if (selectedIndex < 0) {
        updateReticle(-1);
        var label =
          selectedField === "all"
            ? "All fields"
            : fields[Number(selectedField)];
        var count = topicSelect.options.length - 1;
        mapStatus.textContent =
          label + " · " + count.toLocaleString() + " topics plotted.";
        return;
      }
      var point = topicPoints[selectedIndex];
      updateReticle(selectedIndex);
      mapStatus.textContent = point.name + " · " + fields[point.field];
    });
  }

  /* ------------------------------------------------------------------------
     6. Engineering-Index Publications Register Filter
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
      var label =
        kind === "all" ? "publications" : kind + " publications";
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
