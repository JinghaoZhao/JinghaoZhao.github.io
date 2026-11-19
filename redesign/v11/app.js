(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rot3D(x, y, z, rx, ry) {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    return { x: x1, y: y2, z: z2 };
  }

  function project(p, cx, cy, fov, dist) {
    const dz = dist - p.z;
    const scale = fov / Math.max(0.4, dz);
    return {
      sx: cx + p.x * scale,
      sy: cy + p.y * scale,
      scale,
      z: p.z,
    };
  }

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

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionEnabled = !reduceMotionQuery.matches;
  const engineSyncHooks = [];

  function syncAllEngines() {
    engineSyncHooks.forEach((fn) => fn());
  }

  reduceMotionQuery.addEventListener("change", () => {
    motionEnabled = !reduceMotionQuery.matches;
    syncAllEngines();
  });

  document.addEventListener("visibilitychange", syncAllEngines);

  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(Math.max(2026, new Date().getFullYear()));
  }

  /* =========================================================
     HEADER SCROLL & NAV ACTIVE TRACKING
     ========================================================= */
  const header = $("#site-header");
  const navLinks = $$(".hud-nav a");
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  let scrollQueued = false;
  function onScrollFrame() {
    scrollQueued = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 32);
    let currentId = "";
    for (let i = 0; i < navSections.length; i++) {
      const sec = navSections[i];
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.38) {
        currentId = sec.id;
      }
    }
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${currentId}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(onScrollFrame);
      }
    },
    { passive: true },
  );
  onScrollFrame();

  /* =========================================================
     PUBLICATIONS FILTER (ALL / CONFERENCES / JOURNALS)
     ========================================================= */
  const pubFilterBtns = $$(".pub-filter-btn");
  const pubGroups = $$(".pub-group");
  const pubCountEl = $("#publication-count");

  function setPublicationFilter(kind) {
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
      (sum, g) => sum + g.querySelectorAll(".pub-card").length,
      0,
    );
    const years = visibleGroups.flatMap((g) =>
      [...g.querySelectorAll(".pub-year")].map((el) => Number(el.textContent)),
    );
    if (pubCountEl && years.length) {
      const label =
        kind === "all" ? "publications" : `${kind} publications`;
      pubCountEl.textContent = `${total} ${label} · ${Math.min(...years)}–${Math.max(...years)}`;
    }
  }

  pubFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => setPublicationFilter(btn.dataset.filter));
  });

  function syncPubAnchor() {
    if (location.hash === "#conf") setPublicationFilter("conference");
    else if (location.hash === "#journal") setPublicationFilter("journal");
  }
  window.addEventListener("hashchange", syncPubAnchor);
  syncPubAnchor();

  /* =========================================================
     ENGINE 1: HERO 3D GEODESIC PARTICLE GLOBE & PACKET ARCS
     ========================================================= */
  function initHeroGlobe() {
    const canvas = $("#hero-globe-canvas");
    const heroSection = $("#orbit");
    const telemetryEl = $("#hero-telemetry");
    if (!canvas || !heroSection) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = mulberry32(1107);
    let width = 0;
    let height = 0;
    let visible = true;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let telemetryTimer = 0;

    let yaw = 0.6;
    let pitch = 0.24;
    let velYaw = 0.00024;
    let velPitch = 0;
    let targetHoverYaw = 0;
    let targetHoverPitch = 0;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;

    // 250 Fibonacci geodesic vertices on unit sphere
    const nodeCount = 250;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * rad;
      const z = Math.sin(theta) * rad;
      const tier = rand();
      nodes.push({
        x,
        y,
        z,
        hub: tier > 0.88,
        gold: tier > 0.94,
        phase: rand() * Math.PI * 2,
      });
    }

    // Geodesic edges between nearby vertices
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 0.095) {
          edges.push([i, j]);
        }
      }
    }

    // Geodesic great-circle packet arcs
    const hubIndices = nodes
      .map((n, idx) => (n.hub ? idx : -1))
      .filter((idx) => idx >= 0);
    const arcs = [];
    const arcCount = 14;
    for (let i = 0; i < arcCount; i++) {
      const a = hubIndices[i % hubIndices.length];
      const b = hubIndices[(i * 5 + 3) % hubIndices.length];
      if (a === b) continue;
      const palette = i % 3 === 0 ? "gold" : i % 3 === 1 ? "sky" : "indigo";
      arcs.push({
        a: nodes[a],
        b: nodes[b],
        progress: rand(),
        speed: 0.16 + rand() * 0.22,
        lift: 0.24 + rand() * 0.22,
        palette,
      });
    }

    // Background deep-space stars
    const stars = [];
    for (let i = 0; i < 130; i++) {
      stars.push({
        x: rand(),
        y: rand(),
        r: 0.6 + rand() * 1.4,
        alpha: 0.18 + rand() * 0.55,
        phase: rand() * Math.PI * 2,
      });
    }

    function resize() {
      width = heroSection.clientWidth;
      height = heroSection.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Ambient starfield
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.65 + 0.35 * Math.sin(elapsed * 0.0018 + s.phase);
        ctx.fillStyle = `rgba(203, 213, 225, ${(s.alpha * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const isDesktop = width >= 960;
      const cx = isDesktop ? width * 0.67 : width * 0.52;
      const cy = isDesktop ? height * 0.5 : height * 0.34;
      const radius = clamp(Math.min(width, height) * (isDesktop ? 0.42 : 0.36), 140, 340);
      const fov = radius * 3.1;
      const dist = 3.2;

      // Soft planetary nebula halo behind globe
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.45);
      halo.addColorStop(0, "rgba(56, 189, 248, 0.17)");
      halo.addColorStop(0.45, "rgba(129, 140, 248, 0.11)");
      halo.addColorStop(0.78, "rgba(251, 191, 36, 0.04)");
      halo.addColorStop(1, "rgba(4, 6, 14, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      const rx = pitch + targetHoverPitch * 0.16;
      const ry = yaw + targetHoverYaw * 0.22;

      // Subtle outer orbital meridian rings
      ctx.save();
      ctx.lineWidth = 1;
      for (let ringIdx = 0; ringIdx < 2; ringIdx++) {
        const tilt = ringIdx === 0 ? 0.35 : -0.52;
        const rScale = ringIdx === 0 ? 1.24 : 1.38;
        ctx.beginPath();
        for (let s = 0; s <= 72; s++) {
          const ang = (s / 72) * Math.PI * 2;
          const ox = Math.cos(ang) * rScale;
          const oy = Math.sin(ang) * Math.sin(tilt) * rScale;
          const oz = Math.sin(ang) * Math.cos(tilt) * rScale;
          const rp = rot3D(ox, oy, oz, rx, ry * (ringIdx === 0 ? 1 : -0.5));
          const p = project(rp, cx, cy, fov, dist);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle =
          ringIdx === 0
            ? "rgba(56, 189, 248, 0.16)"
            : "rgba(251, 191, 36, 0.12)";
        ctx.stroke();
      }
      ctx.restore();

      // Project sphere nodes
      const projected = new Array(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        const rp = rot3D(n.x, n.y, n.z, rx, ry);
        projected[i] = project(rp, cx, cy, fov, dist);
      }

      // Draw geodesic wireframe edges
      ctx.lineWidth = 0.75;
      for (let i = 0; i < edges.length; i++) {
        const [aIdx, bIdx] = edges[i];
        const pa = projected[aIdx];
        const pb = projected[bIdx];
        const avgZ = (pa.z + pb.z) * 0.5;
        if (avgZ < -0.35) continue;
        const alpha = clamp((avgZ + 0.45) * 0.24, 0.03, 0.32);
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Draw geodesic packet arcs & luminous pulses
      const steps = 24;
      for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];
        const pts = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          let mx = lerp(arc.a.x, arc.b.x, t);
          let my = lerp(arc.a.y, arc.b.y, t);
          let mz = lerp(arc.a.z, arc.b.z, t);
          const len = Math.hypot(mx, my, mz) || 1;
          const elev = 1 + Math.sin(t * Math.PI) * arc.lift;
          mx = (mx / len) * elev;
          my = (my / len) * elev;
          mz = (mz / len) * elev;
          const rp = rot3D(mx, my, mz, rx, ry);
          pts.push(project(rp, cx, cy, fov, dist));
        }

        // Faint full arc path
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          if (s === 0) ctx.moveTo(pts[s].sx, pts[s].sy);
          else ctx.lineTo(pts[s].sx, pts[s].sy);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle =
          arc.palette === "gold"
            ? "rgba(251, 191, 36, 0.16)"
            : arc.palette === "sky"
              ? "rgba(56, 189, 248, 0.18)"
              : "rgba(129, 140, 248, 0.16)";
        ctx.stroke();

        // Luminous travelling packet comet
        const headIdx = Math.floor(arc.progress * steps);
        const tailLen = 6;
        const startIdx = Math.max(0, headIdx - tailLen);
        if (headIdx > startIdx) {
          ctx.beginPath();
          for (let s = startIdx; s <= Math.min(steps, headIdx); s++) {
            if (s === startIdx) ctx.moveTo(pts[s].sx, pts[s].sy);
            else ctx.lineTo(pts[s].sx, pts[s].sy);
          }
          ctx.lineWidth = 2.2;
          ctx.strokeStyle =
            arc.palette === "gold"
              ? "rgba(251, 191, 36, 0.9)"
              : arc.palette === "sky"
                ? "rgba(56, 189, 248, 0.9)"
                : "rgba(165, 180, 252, 0.9)";
          ctx.stroke();
        }

        const hp = pts[Math.min(steps, headIdx)];
        if (hp && hp.z > -0.6) {
          ctx.fillStyle =
            arc.palette === "gold"
              ? "#fde68a"
              : arc.palette === "sky"
                ? "#e0f2fe"
                : "#e0e7ff";
          ctx.beginPath();
          ctx.arc(hp.sx, hp.sy, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw depth-sorted vertices
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        const p = projected[i];
        const depthNorm = clamp((p.z + 1) * 0.5, 0, 1);
        const alpha = 0.14 + depthNorm * 0.82;
        const pulse = n.hub ? 0.5 + 0.5 * Math.sin(elapsed * 0.004 + n.phase) : 0;
        const rad = (n.hub ? 2.5 + pulse * 1.4 : 1.35) * (0.65 + depthNorm * 0.55);

        if (n.gold) {
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(3)})`;
        } else if (n.hub) {
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(191, 219, 254, ${(alpha * 0.78).toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;

      if (!dragging) {
        yaw += velYaw * dt;
        pitch = clamp(pitch + velPitch * dt, -0.75, 0.75);
        velYaw = lerp(velYaw, 0.00024, 0.03);
        velPitch *= 0.94;
      }

      for (let i = 0; i < arcs.length; i++) {
        arcs[i].progress = (arcs[i].progress + arcs[i].speed * (dt / 1000)) % 1;
      }

      telemetryTimer += dt;
      if (telemetryEl && telemetryTimer > 140) {
        telemetryTimer = 0;
        const degYaw = (((yaw * 180) / Math.PI) % 360 + 360) % 360;
        const degPitch = (pitch * 180) / Math.PI;
        const sign = degPitch >= 0 ? "+" : "";
        telemetryEl.textContent = `YAW ${String(Math.round(degYaw)).padStart(3, "0")}° · PITCH ${sign}${Math.round(degPitch)}°`;
      }

      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging) {
        const dx = e.clientX - dragX;
        const dy = e.clientY - dragY;
        dragX = e.clientX;
        dragY = e.clientY;
        yaw += dx * 0.0065;
        pitch = clamp(pitch + dy * 0.0055, -0.85, 0.85);
        velYaw = clamp(dx * 0.00035, -0.006, 0.006);
        velPitch = clamp(dy * 0.00025, -0.004, 0.004);
        if (!motionEnabled) draw();
      } else {
        targetHoverYaw = clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1);
        targetHoverPitch = clamp(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1, -1, 1);
      }
    });

    const endDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    heroSection.addEventListener("pointerleave", () => {
      targetHoverYaw = 0;
      targetHoverPitch = 0;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(heroSection);
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(heroSection);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    resize();
    sync();
  }

  /* =========================================================
     ENGINE 2: BARE METAL × CME — 3D EXPLODING CORE CUBE
     ========================================================= */
  function initBareMetalCube() {
    const canvas = $("#baremetal-cube-canvas");
    const section = $("#work");
    const stageLabel = $("#bm-stage-label");
    const velocityBadge = $("#bm-velocity-badge");
    const modeButtons = $$("[data-bm-mode]");
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const modes = {
      host: {
        label: "LATTICE MODE · HOST & FABRIC",
        badge: "SILICON DIRECT · ISOLATED I/O",
        gold: false,
        speed: 1.0,
      },
      fleet: {
        label: "LATTICE MODE · FLEET LIFECYCLE",
        badge: "4-PLANE ORCHESTRATION · ACTIVE",
        gold: false,
        speed: 1.35,
      },
      behavior: {
        label: "LATTICE MODE · END-TO-END BEHAVIOR",
        badge: "FAULT DOMAINS · DETERMINISTIC",
        gold: false,
        speed: 1.2,
      },
      cme: {
        label: "LATTICE MODE · GOOGLE CLOUD × CME GROUP",
        badge: "ULTRA-LOW-LATENCY · LOCKED RAIL",
        gold: true,
        speed: 2.8,
      },
    };

    let activeMode = "host";
    let width = 0;
    let height = 0;
    let visible = false;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;

    let yaw = 0.65;
    let pitch = 0.42;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;

    // 4x4x4 = 64 hardware lattice nodes
    const nodes = [];
    for (let ix = 0; ix < 4; ix++) {
      for (let iy = 0; iy < 4; iy++) {
        for (let iz = 0; iz < 4; iz++) {
          const nx = (ix - 1.5) * 0.44;
          const ny = (iy - 1.5) * 0.44;
          const nz = (iz - 1.5) * 0.44;
          nodes.push({
            ix,
            iy,
            iz,
            x: nx,
            y: ny,
            z: nz,
            tx: nx,
            ty: ny,
            tz: nz,
          });
        }
      }
    }

    // Neighbor links inside 4x4x4 grid
    const links = [];
    const idxAt = (x, y, z) => x * 16 + y * 4 + z;
    for (let ix = 0; ix < 4; ix++) {
      for (let iy = 0; iy < 4; iy++) {
        for (let iz = 0; iz < 4; iz++) {
          const a = idxAt(ix, iy, iz);
          if (ix < 3) links.push([a, idxAt(ix + 1, iy, iz), "x"]);
          if (iy < 3) links.push([a, idxAt(ix, iy + 1, iz), "y"]);
          if (iz < 3) links.push([a, idxAt(ix, iy, iz + 1), "z"]);
        }
      }
    }

    // Animated telemetry packets flying along links
    const packets = [];
    for (let i = 0; i < 22; i++) {
      packets.push({
        linkIdx: (i * 7) % links.length,
        t: (i * 0.17) % 1,
        speed: 0.45 + (i % 5) * 0.14,
      });
    }

    function applyTargets(mode) {
      activeMode = mode;
      const meta = modes[mode] || modes.host;
      if (stageLabel) stageLabel.textContent = meta.label;
      if (velocityBadge) {
        velocityBadge.textContent = meta.badge;
        velocityBadge.classList.toggle("is-gold", meta.gold);
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const bx = (n.ix - 1.5) * 0.42;
        const by = (n.iy - 1.5) * 0.42;
        const bz = (n.iz - 1.5) * 0.42;

        if (mode === "host") {
          // Tight silicon core cube
          n.tx = bx;
          n.ty = by;
          n.tz = bz;
        } else if (mode === "fleet") {
          // Exploded 4 vertical floating planes
          n.tx = bx * 1.28;
          n.ty = (n.iy - 1.5) * 0.72;
          n.tz = bz * 1.28;
        } else if (mode === "behavior") {
          // Separated 4 isolated fault-domain octants
          const sx = n.ix < 2 ? -0.26 : 0.26;
          const sz = n.iz < 2 ? -0.26 : 0.26;
          n.tx = bx + sx;
          n.ty = by * 0.92;
          n.tz = bz + sz;
        } else if (mode === "cme") {
          // Diamond ultra-low-latency aligned trading conduit
          const angle = Math.PI / 4;
          const rx = bx * Math.cos(angle) - bz * Math.sin(angle);
          const rz = bx * Math.sin(angle) + bz * Math.cos(angle);
          n.tx = rx * 1.35;
          n.ty = by * 0.56;
          n.tz = rz * 0.78;
        }
      }

      modeButtons.forEach((btn) => {
        const active = btn.dataset.bmMode === mode;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });

      if (!motionEnabled) {
        nodes.forEach((n) => {
          n.x = n.tx;
          n.y = n.ty;
          n.z = n.tz;
        });
        draw();
      }
    }

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => applyTargets(btn.dataset.bmMode));
    });

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.5;
      const scaleBase = Math.min(width, height) * 0.95;
      const fov = scaleBase * 1.15;
      const dist = 4.2;
      const isCME = activeMode === "cme";

      // Draw outer telemetry orbital rings
      ctx.save();
      const ringCount = activeMode === "fleet" ? 4 : 2;
      for (let r = 0; r < ringCount; r++) {
        const yOff =
          activeMode === "fleet" ? (r - 1.5) * 0.72 : (r === 0 ? -0.52 : 0.52);
        const rad = activeMode === "fleet" ? 1.18 : 1.32;
        ctx.beginPath();
        for (let s = 0; s <= 64; s++) {
          const a = (s / 64) * Math.PI * 2 + elapsed * 0.0003 * (r % 2 ? -1 : 1);
          const rp = rot3D(Math.cos(a) * rad, yOff, Math.sin(a) * rad, pitch, yaw);
          const p = project(rp, cx, cy, fov, dist);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = isCME
          ? "rgba(251, 191, 36, 0.24)"
          : "rgba(56, 189, 248, 0.18)";
        ctx.stroke();
      }
      ctx.restore();

      const projected = nodes.map((n) => {
        const rp = rot3D(n.x, n.y, n.z, pitch, yaw);
        return project(rp, cx, cy, fov, dist);
      });

      // Draw lattice connections
      ctx.lineWidth = 0.9;
      for (let i = 0; i < links.length; i++) {
        const [a, b, axis] = links[i];
        // Hide cross-fault-domain links in behavior mode for visual clarity
        if (activeMode === "behavior") {
          if (axis === "x" && nodes[a].ix === 1) continue;
          if (axis === "z" && nodes[a].iz === 1) continue;
        }
        // Emphasize horizontal planes in fleet mode
        const alphaBase =
          activeMode === "fleet" && axis === "y" ? 0.08 : 0.24;
        const pa = projected[a];
        const pb = projected[b];
        const depth = clamp(((pa.z + pb.z) * 0.5 + 1.4) / 2.8, 0.15, 1);
        ctx.strokeStyle = isCME
          ? `rgba(251, 191, 36, ${(alphaBase * depth * 1.25).toFixed(3)})`
          : `rgba(125, 211, 252, ${(alphaBase * depth).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Draw high-velocity telemetry packets
      for (let i = 0; i < packets.length; i++) {
        const pk = packets[i];
        const [a, b] = links[pk.linkIdx];
        const pa = projected[a];
        const pb = projected[b];
        const px = lerp(pa.sx, pb.sx, pk.t);
        const py = lerp(pa.sy, pb.sy, pk.t);
        ctx.fillStyle = isCME
          ? i % 2 === 0
            ? "#fde68a"
            : "#38bdf8"
          : i % 3 === 0
            ? "#fbbf24"
            : "#7dd3fc";
        ctx.beginPath();
        ctx.arc(px, py, isCME ? 2.8 : 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw nodes with wave illumination
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = projected[i];
        const wave =
          0.5 +
          0.5 *
            Math.sin(
              elapsed * 0.004 * modes[activeMode].speed - (n.ix + n.iy + n.iz) * 0.7,
            );
        const depth = clamp((p.z + 1.5) / 3, 0.2, 1);
        const rad = (2.1 + wave * 1.4) * depth;

        if (isCME) {
          ctx.fillStyle =
            n.iy === 1 || n.iy === 2
              ? `rgba(251, 191, 36, ${(0.55 + wave * 0.45).toFixed(3)})`
              : `rgba(56, 189, 248, ${(0.45 + wave * 0.4).toFixed(3)})`;
        } else if (activeMode === "fleet") {
          const tierColors = [
            "56, 189, 248",
            "129, 140, 248",
            "165, 180, 252",
            "251, 191, 36",
          ];
          ctx.fillStyle = `rgba(${tierColors[n.iy]}, ${(0.4 + depth * 0.55).toFixed(3)})`;
        } else {
          ctx.fillStyle =
            wave > 0.75
              ? `rgba(125, 211, 252, ${(0.6 + depth * 0.4).toFixed(3)})`
              : `rgba(129, 140, 248, ${(0.35 + depth * 0.45).toFixed(3)})`;
        }

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;

      const speedMult = modes[activeMode].speed;
      if (!dragging) {
        yaw += 0.00038 * speedMult * dt;
      }

      const morphRate = 1 - Math.pow(0.001, dt / 1000);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x = lerp(n.x, n.tx, morphRate * 0.25);
        n.y = lerp(n.y, n.ty, morphRate * 0.25);
        n.z = lerp(n.z, n.tz, morphRate * 0.25);
      }

      for (let i = 0; i < packets.length; i++) {
        const pk = packets[i];
        pk.t += pk.speed * speedMult * (dt / 1000);
        if (pk.t >= 1) {
          pk.t -= 1;
          pk.linkIdx = (pk.linkIdx + 13) % links.length;
        }
      }

      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      yaw += (e.clientX - dragX) * 0.008;
      pitch = clamp(pitch + (e.clientY - dragY) * 0.008, -1.1, 1.1);
      dragX = e.clientX;
      dragY = e.clientY;
      if (!motionEnabled) draw();
    });
    const stopDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(section);
    } else {
      visible = true;
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    applyTargets("host");
    resize();
    sync();
  }

  /* =========================================================
     ENGINE 3: UNIFIED 3D ORBITAL SCULPTURE STAGE (7 PROJECTS)
     ========================================================= */
  function initSculptureEngine() {
    const canvas = $("#sculpture-canvas");
    const section = $("#projects");
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const indexEl = $("#sculpture-index");
    const nameEl = $("#sculpture-active-name");
    const geomTagEl = $("#sculpture-geometry-tag");
    const descEl = $("#sculpture-active-desc");
    const subnoteEl = $("#sculpture-subnote");
    const linkEl = $("#sculpture-active-link");

    const seedFaultBtn = $("#seed-fault-btn");
    const vrToggleWrap = $("#vr-mode-toggle");
    const vrModeBtns = $$("[data-vr-mode]");
    const acemapLoadBtn = $("#acemap-load-btn");
    const acemapDrawer = $("#acemap-drawer");
    const acemapNearestEl = $("#acemap-nearest-readout");
    const acemapTopicWrap = $("#acemap-topic-wrap");
    const acemapTopicSelect = $("#acemap-topic-select");
    const acemapPillsEl = $("#acemap-discipline-pills");

    const stationCards = $$(".station-card");
    const stationButtons = $$("[data-select-station]");

    const stations = {
      seed: {
        num: "STATION 01 / 07",
        name: "SEED",
        geomTag: "3D GEODESIC FAULT-RECOVERY SPHERE",
        desc: "Diagnosing and recovering from 5G failures through the SIM.",
        subnote:
          "Surface shards fracture outward on a 5G failure, then snap back into coherence as golden SIM-core diagnostic rings sweep the sphere.",
        linkText: "Read the SIGCOMM ’22 paper",
        href: "../../docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf",
      },
      securesim: {
        num: "STATION 02 / 07",
        name: "SecureSIM",
        geomTag: "3D NESTED GYROSCOPIC FARADAY SHIELD",
        desc: "Authentication and fine-grained access control for SIM and eSIM.",
        subnote:
          "Three counter-rotating gimbal shields guard the SIM core: unauthorized probes deflect on impact while authenticated tokens pass cleanly.",
        linkText: "Read the MobiCom ’21 paper",
        href: "https://dl.acm.org/doi/pdf/10.1145/3447993.3483254",
      },
      gptcode: {
        num: "STATION 03 / 07",
        name: "GPT-Code-Learner",
        geomTag: "3D SEMANTIC CODE-CUBE & QUERY PATHS",
        desc: "Explore a codebase through questions, context, and GPT.",
        subnote:
          "Repository voxels form a rotating semantic cube; luminous multi-hop retrieval beams traverse context clusters to synthesize explanations.",
        linkText: "Explore on GitHub",
        href: "https://github.com/JinghaoZhao/GPT-Code-Learner",
      },
      sonica: {
        num: "STATION 04 / 07",
        name: "Sonica",
        geomTag: "3D PULSATING RF TORUS WAVE FIELD",
        desc: "An open NB-IoT network for experiments with real devices.",
        subnote:
          "Parametric torus field models over-the-air narrowband carrier waves propagating between commodity NB-IoT devices, eNodeB, and CIoT core.",
        linkText: "Explore on GitHub",
        href: "https://github.com/sonica-nbiot/sonica",
      },
      flora: {
        num: "STATION 05 / 07",
        name: "Flora",
        geomTag: "3D 4-TIER CLOUD / EDGE MONOLITH PLANES",
        desc: "A software-defined mobile network spanning eSIM, radio, core, and edge.",
        subnote:
          "Four suspended architectural strata—eSIM, LTE RAN, Core, and Edge VR—linked by rising light streams and live telemetry conduits.",
        linkText: "Explore the project",
        href: "https://project-flora.github.io/Flora/",
      },
      vr: {
        num: "STATION 06 / 07",
        name: "Mobile VR Latency",
        geomTag: "3D DUAL WIREFRAME ICOSAHEDRONS (SYNC COMPARISON)",
        desc: "Proactive LTE uplink scheduling for interactive mobile VR—less delay, more immersion.",
        subnote:
          "Toggle Standard vs. Proactive uplink scheduling to compare ghost lag against locked synchronization. Motion lag is illustrative, not a benchmark.",
        linkText: "Read the NSDI ’21 paper",
        href: "https://www.usenix.org/system/files/nsdi21-tan.pdf",
      },
      acemap: {
        num: "STATION 07 / 07",
        name: "Acemap",
        geomTag: "2,208-TOPIC 3D ACADEMIC KNOWLEDGE GALAXY",
        desc: "An academic knowledge graph mapping connections across 2,208 research topics and 19 disciplines.",
        subnote:
          "Load the live dataset (data.csv) to explore all 2,208 topics in 3D, filter by discipline, inspect constellation links, and read nearest-star metadata.",
        linkText: "Explore Acemap",
        href: "https://acemap.sjtu.edu.cn/",
      },
    };

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

    const ACEMAP_COLORS = [
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

    // Golden-ratio Icosahedron vertices & 30 edges for Mobile VR Latency
    const PHI = (1 + Math.sqrt(5)) / 2;
    const icoRaw = [
      [-1, PHI, 0],
      [1, PHI, 0],
      [-1, -PHI, 0],
      [1, -PHI, 0],
      [0, -1, PHI],
      [0, 1, PHI],
      [0, -1, -PHI],
      [0, 1, -PHI],
      [PHI, 0, -1],
      [PHI, 0, 1],
      [-PHI, 0, -1],
      [-PHI, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return { x: (x / len) * 0.95, y: (y / len) * 0.95, z: (z / len) * 0.95 };
    });

    const icoEdges = [];
    for (let i = 0; i < icoRaw.length; i++) {
      for (let j = i + 1; j < icoRaw.length; j++) {
        const d = Math.hypot(
          icoRaw[i].x - icoRaw[j].x,
          icoRaw[i].y - icoRaw[j].y,
          icoRaw[i].z - icoRaw[j].z,
        );
        if (d < 1.12) icoEdges.push([i, j]);
      }
    }

    // Unified morphing particle pool (300 particles)
    const rand = mulberry32(4242);
    const PARTICLE_COUNT = 300;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: 0,
        y: 0,
        z: 0,
        tx: 0,
        ty: 0,
        tz: 0,
        r: 56,
        g: 189,
        b: 248,
        tr: 56,
        tg: 189,
        tb: 248,
        size: 1.8 + rand() * 1.5,
        phase: rand() * Math.PI * 2,
        shardDir: {
          x: (rand() - 0.5) * 1.4,
          y: (rand() - 0.5) * 1.4,
          z: (rand() - 0.5) * 1.4,
        },
        faultZone: rand() > 0.58,
      });
    }

    // Precompute SEED geodesic sphere edges for first 140 particles
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const sphereCoords = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = goldenAngle * i;
      sphereCoords.push({
        x: Math.cos(th) * rad * 1.02,
        y: y * 1.02,
        z: Math.sin(th) * rad * 1.02,
      });
    }

    // State variables
    let activeStation = "seed";
    let vrMode = "proactive"; // "standard" | "proactive"
    let seedFaultAmount = 0;
    let seedFaultTimer = 0;
    let seedHealWave = -1.4;

    // Acemap dataset state (loaded strictly on demand)
    let acemapLoaded = false;
    let acemapLoading = false;
    let acemapStars = []; // { x, y, z, name, field, color, topicID, size, sx, sy, visible }
    let acemapSelectedField = "all";
    let acemapHovered = -1;
    let acemapSelected = -1;

    let width = 0;
    let height = 0;
    let visible = false;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0;

    let yaw = 0.5;
    let pitch = 0.25;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    let pointerCanvasX = -999;
    let pointerCanvasY = -999;

    function computeTargets(station) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (station === "seed") {
          const sc = sphereCoords[i];
          p.tx = sc.x;
          p.ty = sc.y;
          p.tz = sc.z;
          if (i % 9 === 0) {
            p.tr = 251;
            p.tg = 191;
            p.tb = 36;
          } else {
            p.tr = 56;
            p.tg = 189;
            p.tb = 248;
          }
        } else if (station === "securesim") {
          if (i < 90) {
            // Protected golden SIM core
            const sc = sphereCoords[Math.floor((i / 90) * PARTICLE_COUNT)];
            p.tx = sc.x * 0.36;
            p.ty = sc.y * 0.36;
            p.tz = sc.z * 0.36;
            p.tr = 251;
            p.tg = 191;
            p.tb = 36;
          } else {
            // 3 nested Faraday shield rings (70 particles per ring)
            const ringIdx = Math.floor((i - 90) / 70) % 3;
            const localIdx = (i - 90) % 70;
            const ang = (localIdx / 70) * Math.PI * 2;
            const rad = 0.72 + ringIdx * 0.24;
            if (ringIdx === 0) {
              p.tx = Math.cos(ang) * rad;
              p.ty = Math.sin(ang) * rad;
              p.tz = 0;
              p.tr = 56;
              p.tg = 189;
              p.tb = 248;
            } else if (ringIdx === 1) {
              p.tx = Math.cos(ang) * rad;
              p.ty = 0;
              p.tz = Math.sin(ang) * rad;
              p.tr = 129;
              p.tg = 140;
              p.tb = 248;
            } else {
              p.tx = 0;
              p.ty = Math.cos(ang) * rad;
              p.tz = Math.sin(ang) * rad;
              p.tr = 125;
              p.tg = 211;
              p.tb = 252;
            }
          }
        } else if (station === "gptcode") {
          // 6 x 6 x 8 semantic code cube (288 voxels + 12 query core nodes)
          if (i < 288) {
            const ix = i % 6;
            const iy = Math.floor(i / 6) % 6;
            const iz = Math.floor(i / 36);
            p.tx = (ix - 2.5) * 0.34;
            p.ty = (iy - 2.5) * 0.34;
            p.tz = (iz - 3.5) * 0.24;
            const isCluster = (ix + iy + iz) % 5 === 0;
            p.tr = isCluster ? 251 : 129;
            p.tg = isCluster ? 191 : 140;
            p.tb = isCluster ? 36 : 248;
          } else {
            const a = ((i - 288) / 12) * Math.PI * 2;
            p.tx = Math.cos(a) * 0.22;
            p.ty = Math.sin(a) * 0.22;
            p.tz = 0;
            p.tr = 56;
            p.tg = 189;
            p.tb = 248;
          }
        } else if (station === "sonica") {
          // Parametric 3D RF Torus wave field
          const u = ((i % 30) / 30) * Math.PI * 2;
          const v = (Math.floor(i / 30) / 10) * Math.PI * 2;
          const R = 0.88;
          const r = 0.36;
          p.tx = (R + r * Math.cos(v)) * Math.cos(u);
          p.ty = r * Math.sin(v);
          p.tz = (R + r * Math.cos(v)) * Math.sin(u);
          p.tr = 56;
          p.tg = 210;
          p.tb = 248;
        } else if (station === "flora") {
          // 4 floating horizontal cloud/edge monolith planes (75 nodes per tier)
          const tier = Math.floor(i / 75);
          const local = i % 75;
          const gx = (local % 9) - 4;
          const gz = Math.floor(local / 9) - 4;
          p.tx = gx * 0.22;
          p.ty = (tier - 1.5) * 0.56;
          p.tz = gz * 0.22;
          const tierPalette = [
            [251, 191, 36], // eSIM
            [56, 189, 248], // RAN
            [129, 140, 248], // Core
            [94, 235, 199], // Edge VR
          ];
          const c = tierPalette[tier % 4];
          p.tr = c[0];
          p.tg = c[1];
          p.tb = c[2];
        } else if (station === "vr") {
          // Spatial orbital halo framing the dual wireframe icosahedrons
          const ang = (i / PARTICLE_COUNT) * Math.PI * 2 * 3;
          const elev = ((i % 15) - 7) * 0.08;
          const rad = 1.28 + (i % 3) * 0.09;
          p.tx = Math.cos(ang) * rad;
          p.ty = elev;
          p.tz = Math.sin(ang) * rad;
          p.tr = i % 4 === 0 ? 251 : 56;
          p.tg = i % 4 === 0 ? 191 : 189;
          p.tb = i % 4 === 0 ? 36 : 248;
        } else if (station === "acemap") {
          // Logarithmic 3D spiral galaxy preview (until full 2,208 stars load)
          const arm = i % 4;
          const t = (i / PARTICLE_COUNT) * 3.8;
          const angle = t * 2.1 + (arm * Math.PI) / 2;
          const rad = 0.14 + (i / PARTICLE_COUNT) * 1.28;
          p.tx = Math.cos(angle) * rad;
          p.ty = Math.sin(t * 3 + arm) * 0.16;
          p.tz = Math.sin(angle) * rad;
          const hex = ACEMAP_COLORS[i % ACEMAP_COLORS.length];
          p.tr = parseInt(hex.slice(1, 3), 16);
          p.tg = parseInt(hex.slice(3, 5), 16);
          p.tb = parseInt(hex.slice(5, 7), 16);
        }
      }
    }

    function selectStation(stationKey) {
      if (!stations[stationKey]) return;
      activeStation = stationKey;
      const meta = stations[stationKey];

      if (indexEl) indexEl.textContent = meta.num;
      if (nameEl) nameEl.textContent = meta.name;
      if (geomTagEl) geomTagEl.textContent = meta.geomTag;
      if (descEl) descEl.textContent = meta.desc;
      if (subnoteEl) subnoteEl.textContent = meta.subnote;
      if (linkEl) {
        linkEl.href = meta.href;
        linkEl.innerHTML = `${meta.linkText} <span aria-hidden="true">↗</span>`;
      }

      if (seedFaultBtn) seedFaultBtn.hidden = stationKey !== "seed";
      if (vrToggleWrap) vrToggleWrap.hidden = stationKey !== "vr";
      if (acemapLoadBtn) acemapLoadBtn.hidden = stationKey !== "acemap" || acemapLoaded;
      if (acemapDrawer) acemapDrawer.hidden = stationKey !== "acemap";

      stationCards.forEach((card) => {
        card.classList.toggle("is-active", card.dataset.station === stationKey);
      });
      stationButtons.forEach((btn) => {
        btn.setAttribute("aria-selected", String(btn.dataset.selectStation === stationKey));
      });

      computeTargets(stationKey);

      if (stationKey === "acemap" && acemapLoaded) {
        pitch = 0.22;
      }

      if (!motionEnabled) {
        particles.forEach((p) => {
          p.x = p.tx;
          p.y = p.ty;
          p.z = p.tz;
          p.r = p.tr;
          p.g = p.tg;
          p.b = p.tb;
        });
        draw();
      }
    }

    stationButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectStation(btn.dataset.selectStation);
      });
    });

    if (seedFaultBtn) {
      seedFaultBtn.addEventListener("click", () => {
        seedFaultAmount = 1.0;
        seedHealWave = -1.3;
        seedFaultTimer = 0;
        if (!motionEnabled) draw();
      });
    }

    vrModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        vrMode = btn.dataset.vrMode;
        vrModeBtns.forEach((b) => {
          const active = b.dataset.vrMode === vrMode;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
        if (!motionEnabled) draw();
      });
    });

    // On-demand Acemap 2,208-topic CSV loader
    async function loadAcemapDataset() {
      if (acemapLoaded || acemapLoading) return;
      acemapLoading = true;
      if (acemapLoadBtn) {
        acemapLoadBtn.disabled = true;
        acemapLoadBtn.textContent = "Streaming 2,208 topics…";
      }
      if (acemapNearestEl) {
        acemapNearestEl.textContent = "Loading ../../data/data.csv…";
      }

      try {
        const res = await fetch("../../data/data.csv");
        if (!res.ok) throw new Error("Unable to load data.csv");
        const rows = parseCSV(await res.text()).slice(1);
        const parsed = rows
          .map((r) => ({
            rawX: Number(r[0]),
            rawY: Number(r[1]),
            rawSize: Number(r[2]) || 4,
            name: r[3] || "",
            color: (r[4] || "").trim().toLowerCase(),
            topicID: (r[5] || "").trim(),
            field: ACEMAP_COLORS.indexOf((r[4] || "").trim().toLowerCase()),
          }))
          .filter(
            (d) =>
              Number.isFinite(d.rawX) &&
              Number.isFinite(d.rawY) &&
              d.field >= 0,
          );

        if (!parsed.length) throw new Error("No valid rows");

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < parsed.length; i++) {
          const d = parsed[i];
          if (d.rawX < minX) minX = d.rawX;
          if (d.rawX > maxX) maxX = d.rawX;
          if (d.rawY < minY) minY = d.rawY;
          if (d.rawY > maxY) maxY = d.rawY;
        }
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const midX = (minX + maxX) * 0.5;
        const midY = (minY + maxY) * 0.5;
        const norm = Math.max(spanX, spanY) * 0.5;

        acemapStars = parsed.map((d, idx) => {
          const nx = ((d.rawX - midX) / norm) * 1.48;
          const ny = ((d.rawY - midY) / norm) * 1.06;
          // Subtle 3D galaxy depth curve from cluster radius & topic magnitude
          const rDist = Math.hypot(nx, ny);
          const nz =
            Math.sin(rDist * 2.4 + d.field * 0.6) * 0.24 +
            ((idx % 11) - 5) * 0.022;
          return {
            x: nx,
            y: ny,
            z: nz,
            name: d.name,
            field: d.field,
            color: ACEMAP_COLORS[d.field],
            topicID: d.topicID,
            size: clamp((d.rawSize - 3.8) * 0.55 + 1.5, 1.3, 4.2),
            sx: 0,
            sy: 0,
            depth: 0,
          };
        });

        acemapLoaded = true;
        acemapLoading = false;
        if (acemapLoadBtn) acemapLoadBtn.hidden = true;
        buildAcemapControls();
        updateAcemapFilter("all");
        yaw = 0.08;
        pitch = 0.14;
        draw();
      } catch (err) {
        acemapLoading = false;
        if (acemapLoadBtn) {
          acemapLoadBtn.disabled = false;
          acemapLoadBtn.textContent = "↻ Retry loading 2,208-Topic Galaxy";
        }
        if (acemapNearestEl) {
          acemapNearestEl.textContent =
            "Dataset could not load locally. Serve via HTTP or open Acemap directly.";
        }
      }
    }

    function buildAcemapControls() {
      if (!acemapPillsEl) return;
      acemapPillsEl.replaceChildren();

      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "disc-pill is-active";
      allBtn.dataset.field = "all";
      allBtn.textContent = `All 19 (${acemapStars.length.toLocaleString()})`;
      allBtn.addEventListener("click", () => updateAcemapFilter("all"));
      acemapPillsEl.appendChild(allBtn);

      ACEMAP_FIELDS.forEach((fieldName, idx) => {
        const count = acemapStars.filter((s) => s.field === idx).length;
        if (!count) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "disc-pill";
        btn.dataset.field = String(idx);
        const swatch = document.createElement("span");
        swatch.className = "disc-swatch";
        swatch.style.backgroundColor = ACEMAP_COLORS[idx];
        btn.appendChild(swatch);
        btn.appendChild(document.createTextNode(`${fieldName} (${count})`));
        btn.addEventListener("click", () => updateAcemapFilter(String(idx)));
        acemapPillsEl.appendChild(btn);
      });

      acemapPillsEl.hidden = false;
      if (acemapTopicWrap) acemapTopicWrap.hidden = false;
    }

    function updateAcemapFilter(fieldVal) {
      acemapSelectedField = fieldVal;
      acemapHovered = -1;
      acemapSelected = -1;

      $$(".disc-pill", acemapPillsEl).forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.field === fieldVal);
      });

      let count = 0;
      if (acemapTopicSelect) {
        acemapTopicSelect.replaceChildren(new Option("Choose a topic…", ""));
      }
      for (let i = 0; i < acemapStars.length; i++) {
        const active =
          fieldVal === "all" || acemapStars[i].field === Number(fieldVal);
        if (active) {
          count++;
          if (acemapTopicSelect) {
            acemapTopicSelect.add(new Option(acemapStars[i].name, String(i)));
          }
        }
      }

      const fieldLabel =
        fieldVal === "all"
          ? "All 19 disciplines"
          : ACEMAP_FIELDS[Number(fieldVal)];
      if (acemapNearestEl) {
        acemapNearestEl.textContent = `${fieldLabel} · ${count.toLocaleString()} stars active — hover or click any star to inspect constellation.`;
      }
      if (!motionEnabled) draw();
    }

    if (acemapLoadBtn) {
      acemapLoadBtn.addEventListener("click", loadAcemapDataset);
    }

    if (acemapTopicSelect) {
      acemapTopicSelect.addEventListener("change", () => {
        acemapSelected =
          acemapTopicSelect.value === "" ? -1 : Number(acemapTopicSelect.value);
        if (acemapSelected >= 0 && acemapStars[acemapSelected]) {
          const s = acemapStars[acemapSelected];
          if (acemapNearestEl) {
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
        }
        if (!motionEnabled) draw();
      });
    }

    function findNearestAcemapStar(mx, my, maxRadius) {
      let best = -1;
      let bestD2 = maxRadius * maxRadius;
      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        if (
          acemapSelectedField !== "all" &&
          s.field !== Number(acemapSelectedField)
        ) {
          continue;
        }
        const dx = s.sx - mx;
        const dy = s.sy - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = i;
        }
      }
      return best;
    }

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      // Lift sculpture slightly above the bottom floating HUD bar
      const cy = height * 0.43;
      const minDim = Math.min(width, height);
      const fov = minDim * 1.18;
      const dist = 3.85;

      // SPECIAL LIVE GALAXY MODE WHEN ACEMAP DATA IS LOADED
      if (activeStation === "acemap" && acemapLoaded) {
        drawAcemapGalaxy(cx, cy, fov, dist);
        return;
      }

      const tSec = elapsed * 0.001;

      // Station-specific wireframe & architectural overlays BEHIND/WITH particles
      if (activeStation === "securesim") {
        // 3 Counter-rotating gyroscopic Faraday shield rings
        const ringDefs = [
          { rad: 0.72, color: "rgba(56, 189, 248, 0.55)", spinX: tSec * 0.8, spinY: tSec * 0.4 },
          { rad: 0.96, color: "rgba(129, 140, 248, 0.5)", spinX: -tSec * 0.6, spinY: tSec * 0.9 },
          { rad: 1.2, color: "rgba(251, 191, 36, 0.45)", spinX: tSec * 0.45, spinY: -tSec * 0.7 },
        ];
        ringDefs.forEach((rg, idx) => {
          ctx.beginPath();
          for (let s = 0; s <= 64; s++) {
            const a = (s / 64) * Math.PI * 2;
            const lx = Math.cos(a) * rg.rad;
            const ly = Math.sin(a) * rg.rad;
            const localRot = rot3D(lx, ly, 0, rg.spinX + idx, rg.spinY);
            const rp = rot3D(localRot.x, localRot.y, localRot.z, pitch, yaw);
            const p = project(rp, cx, cy, fov, dist);
            if (s === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = rg.color;
          ctx.stroke();
        });

        // Probe vectors: unauthorized bounce vs authorized pass
        for (let k = 0; k < 4; k++) {
          const cycle = (tSec * 0.55 + k * 0.25) % 1;
          const authorized = k % 2 === 0;
          const angle = k * (Math.PI / 2) + 0.4;
          let rPos = authorized ? lerp(1.7, 0.2, cycle) : cycle < 0.5 ? lerp(1.7, 1.22, cycle * 2) : lerp(1.22, 1.85, (cycle - 0.5) * 2);
          const px3 = Math.cos(angle) * rPos;
          const pz3 = Math.sin(angle) * rPos;
          const rp = rot3D(px3, (k - 1.5) * 0.12, pz3, pitch, yaw);
          const pr = project(rp, cx, cy, fov, dist);
          ctx.fillStyle = authorized ? "#38bdf8" : "#fb7185";
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeStation === "gptcode") {
        // Wireframe bounding cube + illuminated multi-hop query path
        const corners = [
          [-0.95, -0.95, -0.95],
          [0.95, -0.95, -0.95],
          [0.95, 0.95, -0.95],
          [-0.95, 0.95, -0.95],
          [-0.95, -0.95, 0.95],
          [0.95, -0.95, 0.95],
          [0.95, 0.95, 0.95],
          [-0.95, 0.95, 0.95],
        ].map(([x, y, z]) => project(rot3D(x, y, z, pitch, yaw), cx, cy, fov, dist));
        const cubePairs = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];
        ctx.strokeStyle = "rgba(129, 140, 248, 0.25)";
        ctx.lineWidth = 1;
        cubePairs.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(corners[a].sx, corners[a].sy);
          ctx.lineTo(corners[b].sx, corners[b].sy);
          ctx.stroke();
        });

        // Illuminated semantic retrieval beam hopping across cube nodes
        const hopNodes = [12, 67, 134, 211, 290];
        ctx.beginPath();
        hopNodes.forEach((idx, k) => {
          const pt = particles[idx];
          const p = project(rot3D(pt.x, pt.y, pt.z, pitch, yaw), cx, cy, fov, dist);
          if (k === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.strokeStyle = "rgba(251, 191, 36, 0.72)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (activeStation === "flora") {
        // 4 floating translucent architectural monolith planes + rising light streams
        const tierLabels = ["eSIM", "LTE RAN", "CORE", "EDGE VR"];
        const tierYs = [-0.84, -0.28, 0.28, 0.84];
        tierYs.forEach((ty, idx) => {
          const half = 0.95;
          const quad = [
            [-half, ty, -half],
            [half, ty, -half],
            [half, ty, half],
            [-half, ty, half],
          ].map(([x, y, z]) => project(rot3D(x, y, z, pitch, yaw), cx, cy, fov, dist));

          ctx.beginPath();
          ctx.moveTo(quad[0].sx, quad[0].sy);
          ctx.lineTo(quad[1].sx, quad[1].sy);
          ctx.lineTo(quad[2].sx, quad[2].sy);
          ctx.lineTo(quad[3].sx, quad[3].sy);
          ctx.closePath();
          ctx.fillStyle =
            idx === 0
              ? "rgba(251, 191, 36, 0.06)"
              : "rgba(56, 189, 248, 0.06)";
          ctx.fill();
          ctx.strokeStyle =
            idx === 0
              ? "rgba(251, 191, 36, 0.35)"
              : "rgba(125, 211, 252, 0.32)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
          ctx.font = "600 10px ui-monospace, monospace";
          ctx.fillText(tierLabels[idx], quad[1].sx + 8, quad[1].sy + 3);
        });

        // Rising light streams piercing all 4 tiers
        for (let s = 0; s < 6; s++) {
          const ang = (s / 6) * Math.PI * 2 + 0.5;
          const sx3 = Math.cos(ang) * 0.45;
          const sz3 = Math.sin(ang) * 0.45;
          const topP = project(rot3D(sx3, -0.95, sz3, pitch, yaw), cx, cy, fov, dist);
          const botP = project(rot3D(sx3, 0.95, sz3, pitch, yaw), cx, cy, fov, dist);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(botP.sx, botP.sy);
          ctx.lineTo(topP.sx, topP.sy);
          ctx.stroke();

          const riseT = (tSec * 0.5 + s * 0.19) % 1;
          const ry3 = lerp(0.95, -0.95, riseT);
          const dotP = project(rot3D(sx3, ry3, sz3, pitch, yaw), cx, cy, fov, dist);
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(dotP.sx, dotP.sy, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeStation === "vr") {
        // Dual Wireframe Icosahedrons: Headset vs Ghost Edge Renderer
        const headYaw = yaw + Math.sin(tSec * 1.45) * 0.55;
        const headPitch = pitch + Math.cos(tSec * 1.1) * 0.25;
        const lagPhase = vrMode === "standard" ? 0.55 : 0.04;
        const ghostYaw = yaw + Math.sin(tSec * 1.45 - lagPhase) * 0.55;
        const ghostPitch = pitch + Math.cos(tSec * 1.1 - lagPhase) * 0.25;
        const ghostOffset = vrMode === "standard" ? 0.22 : 0.015;

        const headProj = icoRaw.map((v) =>
          project(rot3D(v.x, v.y, v.z, headPitch, headYaw), cx, cy, fov, dist),
        );
        const ghostProj = icoRaw.map((v) =>
          project(
            rot3D(v.x + ghostOffset, v.y - ghostOffset * 0.4, v.z, ghostPitch, ghostYaw),
            cx,
            cy,
            fov,
            dist,
          ),
        );

        // Drift connectors in Standard mode
        if (vrMode === "standard") {
          ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
          ctx.lineWidth = 1;
          for (let i = 0; i < headProj.length; i++) {
            ctx.beginPath();
            ctx.moveTo(headProj[i].sx, headProj[i].sy);
            ctx.lineTo(ghostProj[i].sx, ghostProj[i].sy);
            ctx.stroke();
          }
        }

        // Draw Ghost icosahedron
        ctx.strokeStyle =
          vrMode === "standard"
            ? "rgba(251, 113, 133, 0.72)"
            : "rgba(251, 191, 36, 0.78)";
        ctx.lineWidth = 1.6;
        icoEdges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(ghostProj[a].sx, ghostProj[a].sy);
          ctx.lineTo(ghostProj[b].sx, ghostProj[b].sy);
          ctx.stroke();
        });

        // Draw Primary Headset icosahedron
        ctx.strokeStyle = "rgba(56, 189, 248, 0.92)";
        ctx.lineWidth = 1.8;
        icoEdges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(headProj[a].sx, headProj[a].sy);
          ctx.lineTo(headProj[b].sx, headProj[b].sy);
          ctx.stroke();
        });

        // Mode indicator inside stage
        ctx.fillStyle = vrMode === "standard" ? "#fda4af" : "#7dd3fc";
        ctx.font = "600 11px ui-monospace, monospace";
        ctx.fillText(
          vrMode === "standard"
            ? "STANDARD UPLINK · PHASE DRIFT VISIBLE"
            : "PROACTIVE UPLINK · LOCKED SYNC",
          18,
          28,
        );
      }

      // SEED golden self-healing ring sweep
      if (activeStation === "seed" && seedHealWave > -1.25 && seedHealWave < 1.25) {
        const ringRad = Math.sqrt(Math.max(0.04, 1.15 - seedHealWave * seedHealWave)) * 1.12;
        ctx.beginPath();
        for (let s = 0; s <= 56; s++) {
          const a = (s / 56) * Math.PI * 2;
          const rp = rot3D(Math.cos(a) * ringRad, seedHealWave, Math.sin(a) * ringRad, pitch, yaw);
          const p = project(rp, cx, cy, fov, dist);
          if (s === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
        ctx.stroke();
      }

      // Project & render all 300 morphing 3D particles
      const projList = new Array(PARTICLE_COUNT);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        let px = p.x;
        let py = p.y;
        let pz = p.z;

        // Station-specific live harmonic motion
        if (activeStation === "seed" && seedFaultAmount > 0.01 && p.faultZone) {
          const healFactor = p.y < seedHealWave ? 0.15 : 1;
          const f = seedFaultAmount * healFactor;
          px += p.shardDir.x * f * 0.58;
          py += p.shardDir.y * f * 0.58;
          pz += p.shardDir.z * f * 0.58;
        } else if (activeStation === "sonica") {
          const wave = Math.sin(tSec * 3.4 - Math.atan2(pz, px) * 3 + p.phase * 0.3) * 0.12;
          const scaleW = 1 + wave;
          px *= scaleW;
          py += Math.cos(tSec * 2.8 + p.phase) * 0.07;
          pz *= scaleW;
        }

        const rp = rot3D(px, py, pz, pitch, yaw);
        const pr = project(rp, cx, cy, fov, dist);
        projList[i] = { pr, p };
      }

      // Draw subtle nearest-neighbor mesh lines for SEED and Sonica
      if (activeStation === "seed" || activeStation === "sonica") {
        ctx.lineWidth = 0.7;
        for (let i = 0; i < PARTICLE_COUNT - 1; i += 2) {
          const a = projList[i].pr;
          const b = projList[(i + 1) % PARTICLE_COUNT].pr;
          const d2 = (a.sx - b.sx) ** 2 + (a.sy - b.sy) ** 2;
          if (d2 < 2400 && a.z > -0.6) {
            ctx.strokeStyle =
              activeStation === "seed" && seedFaultAmount > 0.25
                ? "rgba(251, 191, 36, 0.22)"
                : "rgba(56, 189, 248, 0.18)";
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

      // Render particles back-to-front by z
      projList.sort((a, b) => a.pr.z - b.pr.z);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const { pr, p } = projList[i];
        const depth = clamp((pr.z + 1.5) / 3.0, 0.2, 1);
        let r = p.r;
        let g = p.g;
        let b = p.b;

        if (activeStation === "seed" && seedFaultAmount > 0.12 && p.faultZone && p.y >= seedHealWave) {
          r = lerp(r, 251, seedFaultAmount);
          g = lerp(g, 113, seedFaultAmount);
          b = lerp(b, 133, seedFaultAmount);
        }

        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${(0.25 + depth * 0.72).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, p.size * (0.65 + depth * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawAcemapGalaxy(cx, cy, fov, dist) {
      const fovGal = fov * 0.94;
      const distGal = dist * 1.08;

      // Project all 2,208 stars
      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        const rp = rot3D(s.x, s.y, s.z, pitch * 0.55, yaw * 0.6);
        const pr = project(rp, cx, cy, fovGal, distGal);
        s.sx = pr.sx;
        s.sy = pr.sy;
        s.depth = pr.z;
      }

      // Draw all stars
      for (let i = 0; i < acemapStars.length; i++) {
        const s = acemapStars[i];
        const active =
          acemapSelectedField === "all" ||
          s.field === Number(acemapSelectedField);
        if (!active) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.08)";
          ctx.fillRect(s.sx, s.sy, 1.5, 1.5);
          continue;
        }
        const depthAlpha = clamp((s.depth + 1.4) / 2.6, 0.35, 0.96);
        ctx.globalAlpha = depthAlpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw constellation edges around focused (hovered or selected) star
      const focusIdx = acemapHovered >= 0 ? acemapHovered : acemapSelected;
      if (focusIdx >= 0 && acemapStars[focusIdx]) {
        const focus = acemapStars[focusIdx];
        const neighbors = [];
        for (let i = 0; i < acemapStars.length; i++) {
          if (i === focusIdx) continue;
          const s = acemapStars[i];
          if (
            acemapSelectedField !== "all" &&
            s.field !== Number(acemapSelectedField)
          ) {
            continue;
          }
          const d2 = (s.sx - focus.sx) ** 2 + (s.sy - focus.sy) ** 2;
          if (d2 < 8100) {
            neighbors.push({ idx: i, d2 });
          }
        }
        neighbors.sort((a, b) => a.d2 - b.d2);
        const topNeighbors = neighbors.slice(0, 7);

        ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
        ctx.lineWidth = 1.1;
        topNeighbors.forEach(({ idx }) => {
          const nb = acemapStars[idx];
          ctx.beginPath();
          ctx.moveTo(focus.sx, focus.sy);
          ctx.lineTo(nb.sx, nb.sy);
          ctx.stroke();
        });

        // Golden reticle on focus star
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(focus.sx, focus.sy, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(focus.sx, focus.sy, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Crisp floating star label inside canvas
        const label = `${focus.name} (${ACEMAP_FIELDS[focus.field]})`;
        ctx.font = "600 12px 'DM Sans', sans-serif";
        const textW = ctx.measureText(label).width;
        const boxX = clamp(focus.sx + 14, 12, Math.max(12, width - textW - 28));
        const boxY = clamp(focus.sy - 24, 16, Math.max(16, height - 110));
        ctx.fillStyle = "rgba(4, 6, 14, 0.86)";
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(boxX, boxY, textW + 16, 26, 8);
        } else {
          ctx.rect(boxX, boxY, textW + 16, 26);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(label, boxX + 8, boxY + 17);
      }
    }

    function tick(now) {
      rafId = 0;
      if (!motionEnabled || !visible || document.hidden) {
        lastTime = 0;
        return;
      }
      const dt = lastTime ? Math.min(now - lastTime, 48) : 16;
      lastTime = now;
      elapsed += dt;

      if (!dragging) {
        const spinSpeed =
          activeStation === "acemap" && acemapLoaded ? 0.00009 : 0.00038;
        yaw += spinSpeed * dt;
      }

      // SEED periodic autonomous fracture & golden self-heal cycle
      if (activeStation === "seed") {
        seedFaultTimer += dt;
        if (seedFaultTimer > 5200) {
          seedFaultTimer = 0;
          seedFaultAmount = 1.0;
          seedHealWave = -1.3;
        }
        if (seedFaultAmount > 0) {
          seedHealWave += dt * 0.0011;
          if (seedHealWave > 0.2) {
            seedFaultAmount = Math.max(0, seedFaultAmount - dt * 0.00075);
          }
        }
      }

      // Smooth 3D particle morph interpolation
      const morphT = 1 - Math.pow(0.0008, dt / 1000);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x = lerp(p.x, p.tx, morphT * 0.22);
        p.y = lerp(p.y, p.ty, morphT * 0.22);
        p.z = lerp(p.z, p.tz, morphT * 0.22);
        p.r = lerp(p.r, p.tr, morphT * 0.18);
        p.g = lerp(p.g, p.tg, morphT * 0.18);
        p.b = lerp(p.b, p.tb, morphT * 0.18);
      }

      // Continuous nearest-star lookup while hovering Acemap galaxy
      if (activeStation === "acemap" && acemapLoaded && pointerCanvasX >= 0 && !dragging) {
        const nearest = findNearestAcemapStar(pointerCanvasX, pointerCanvasY, 22);
        if (nearest !== acemapHovered) {
          acemapHovered = nearest;
          if (nearest >= 0 && acemapNearestEl) {
            const s = acemapStars[nearest];
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
        }
      }

      draw();
      rafId = requestAnimationFrame(tick);
    }

    function sync() {
      if (motionEnabled && visible && !document.hidden) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
        draw();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragX = e.clientX;
      dragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerCanvasX = e.clientX - rect.left;
      pointerCanvasY = e.clientY - rect.top;
      if (dragging) {
        yaw += (e.clientX - dragX) * 0.008;
        pitch = clamp(pitch + (e.clientY - dragY) * 0.008, -1.05, 1.05);
        dragX = e.clientX;
        dragY = e.clientY;
        if (!motionEnabled) draw();
      } else if (activeStation === "acemap" && acemapLoaded && !motionEnabled) {
        const nearest = findNearestAcemapStar(pointerCanvasX, pointerCanvasY, 22);
        if (nearest !== acemapHovered) {
          acemapHovered = nearest;
          if (nearest >= 0 && acemapNearestEl) {
            const s = acemapStars[nearest];
            acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
          }
          draw();
        }
      }
    });

    canvas.addEventListener("click", (e) => {
      if (activeStation !== "acemap" || !acemapLoaded) return;
      const rect = canvas.getBoundingClientRect();
      const idx = findNearestAcemapStar(
        e.clientX - rect.left,
        e.clientY - rect.top,
        24,
      );
      if (idx >= 0) {
        acemapSelected = idx;
        if (acemapTopicSelect) acemapTopicSelect.value = String(idx);
        const s = acemapStars[idx];
        if (acemapNearestEl) {
          acemapNearestEl.textContent = `★ ${s.name} · ${ACEMAP_FIELDS[s.field]} · ID ${s.topicID}`;
        }
        draw();
      }
    });

    const endDrag = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", () => {
      pointerCanvasX = -999;
      pointerCanvasY = -999;
      acemapHovered = -1;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(section);
    } else {
      visible = true;
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    engineSyncHooks.push(sync);
    computeTargets("seed");
    // Seed initial particle positions immediately so first frame is crisp
    particles.forEach((p) => {
      p.x = p.tx;
      p.y = p.ty;
      p.z = p.tz;
      p.r = p.tr;
      p.g = p.tg;
      p.b = p.tb;
    });
    selectStation("seed");
    resize();
    sync();
  }

  /* =========================================================
     BOOT ALL 3D SPATIAL ENGINES SAFELY
     ========================================================= */
  try {
    initHeroGlobe();
  } catch (e) {
    /* Graceful fallback: semantic HTML remains fully accessible. */
  }
  try {
    initBareMetalCube();
  } catch (e) {
    /* Graceful fallback */
  }
  try {
    initSculptureEngine();
  } catch (e) {
    /* Graceful fallback */
  }
})();
