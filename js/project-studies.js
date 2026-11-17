/* Short, visible-only walkthroughs. Original figures and SVG descriptions remain
   accessible without scripts; timing is illustrative, never a benchmark. */
(() => {
  "use strict";
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 2400;
  const gridStudies = [
    ...document.querySelectorAll(".project-grid [data-motion-study]"),
  ];
  const studies = [...document.querySelectorAll("[data-motion-study]")].map(
    (element) => {
      const gridIndex = gridStudies.indexOf(element);
      const state = {
        element,
        step: 0,
        visible: false,
        finished: false,
        dismissed: false,
        replayed: false,
        timer: 0,
        remaining: duration,
        deadline: 0,
      };
      const dotsWrap = element.querySelector(".study-dots");
      const dots = [...element.querySelectorAll(".study-dot")];
      const replay = element.querySelector(".study-replay");
      const parts = [...element.querySelectorAll("[data-part]")];
      function paint() {
        element.dataset.step = state.finished ? "done" : String(state.step);
        element.classList.toggle("is-complete", state.finished);
        parts.forEach((part) =>
          part.classList.toggle(
            "is-active",
            !state.finished &&
              part.dataset.part.split(" ").includes(String(state.step)),
          ),
        );
        dots.forEach((dot, i) =>
          dot.classList.toggle(
            "is-current",
            !state.finished && state.step === i + 1,
          ),
        );
      }
      function pause() {
        if (state.timer) {
          clearTimeout(state.timer);
          state.timer = 0;
          state.remaining = Math.max(0, state.deadline - performance.now());
        }
        element.classList.remove("is-running");
      }
      function advance() {
        state.timer = 0;
        state.remaining = duration;
        state.step += 1;
        if (state.step > 3) {
          state.finished = true;
          state.step = 0;
        }
        paint();
        sync();
      }
      function sync() {
        const reduce = preference.matches;
        if (state.dismissed || reduce) {
          pause();
          if (dotsWrap) dotsWrap.hidden = true;
          replay.hidden = true;
          if (reduce) {
            state.step = 0;
            state.finished = false;
            paint();
          }
          return;
        }
        if (!state.visible || document.hidden || state.finished) {
          pause();
          if (dotsWrap) dotsWrap.hidden = true;
          replay.hidden = !state.finished;
          return;
        }
        if (!state.step) {
          const stagger =
            !state.replayed && gridIndex % 2 === 1 && window.innerWidth > 900
              ? 450
              : 0;
          if (stagger) {
            if (dotsWrap) dotsWrap.hidden = true;
            replay.hidden = true;
            if (!state.timer) {
              state.remaining = Math.min(state.remaining, stagger);
              state.deadline = performance.now() + state.remaining;
              state.timer = setTimeout(advance, state.remaining);
            }
            return;
          }
          state.step = 1;
          state.remaining = duration;
          paint();
        }
        if (dotsWrap) dotsWrap.hidden = false;
        replay.hidden = true;
        element.classList.add("is-running");
        if (!state.timer) {
          state.deadline = performance.now() + state.remaining;
          state.timer = setTimeout(advance, state.remaining);
        }
      }
      replay.addEventListener("click", () => {
        pause();
        state.replayed = true;
        state.finished = false;
        state.step = 0;
        state.remaining = duration;
        paint();
        // Reset CSS timelines as well as the explanatory stages.
        element.getAnimations({ subtree: true }).forEach((animation) => {
          animation.currentTime = 0;
        });
        sync();
      });
      state.sync = sync;
      // Loading the real map ends the conceptual preview; it remains interactive.
      element.querySelector(".map-load")?.addEventListener(
        "click",
        () => {
          state.dismissed = true;
          state.finished = true;
          state.step = 0;
          pause();
          paint();
          sync();
        },
        { once: true },
      );
      return state;
    },
  );
  if ("IntersectionObserver" in window) {
    const byElement = new Map(studies.map((state) => [state.element, state]));
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const state = byElement.get(entry.target);
          state.visible =
            entry.isIntersecting && entry.intersectionRatio >= 0.2;
          state.sync();
        }),
      { threshold: 0.2 },
    );
    studies.forEach((state) => observer.observe(state.element));
  }
  document.addEventListener("visibilitychange", () =>
    studies.forEach((state) => state.sync()),
  );
  preference.addEventListener("change", () =>
    studies.forEach((state) => state.sync()),
  );
})();
