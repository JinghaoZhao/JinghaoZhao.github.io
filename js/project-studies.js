/* Short, visible-only walkthroughs. Original figures and SVG descriptions remain
   accessible without scripts; timing is illustrative, never a benchmark. */
(() => {
  "use strict";
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 3600;
  const studies = [...document.querySelectorAll("[data-motion-study]")].map(
    (element) => {
      const state = {
        element,
        step: 0,
        visible: false,
        finished: false,
        timer: 0,
        remaining: duration,
        deadline: 0,
      };
      const replay = element.querySelector(".study-replay");
      const parts = [...element.querySelectorAll("[data-part]")];
      function paint() {
        element.dataset.step = String(state.step);
        parts.forEach((part) =>
          part.classList.toggle(
            "is-active",
            part.dataset.part.split(" ").includes(String(state.step)),
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
        replay.hidden = preference.matches;
        if (
          preference.matches ||
          !state.visible ||
          document.hidden ||
          state.finished
        ) {
          pause();
          if (preference.matches) {
            state.step = 0;
            paint();
          }
          return;
        }
        if (!state.step) {
          state.step = 1;
          state.remaining = duration;
          paint();
        }
        element.classList.add("is-running");
        if (!state.timer) {
          state.deadline = performance.now() + state.remaining;
          state.timer = setTimeout(advance, state.remaining);
        }
      }
      replay.addEventListener("click", () => {
        pause();
        state.finished = false;
        state.step = 0;
        state.remaining = duration;
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
          state.finished = true;
          state.step = 0;
          paint();
          sync();
          replay.remove();
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
