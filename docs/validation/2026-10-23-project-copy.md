# Project copy simplification — local verification

Scope: remove repeated project metadata, walkthrough headings, stage strips, and figure captions; shorten descriptions; retain diagram labels and playback controls.

- Both runtime JavaScript files pass `node --check`; `git diff --check` passes.
- HTML inspection confirms seven motion studies, twelve publications, unique IDs, valid fragment/accessibility references, and existing local assets.
- Browser inspection confirms the removed project label/heading/step/caption elements are absent.
- The default 1280 px desktop viewport uses two project columns and has no horizontal overflow. A 390 px mobile viewport uses one column and has no horizontal overflow. Project illustrations and links were visually inspected; the temporary viewport override was reset.
- GPT-Code-Learner replay restarts stage one and activates the corresponding diagram components.
- Acemap loads all 2,208 topics. Selecting Computer Science reports 256 topics. No browser console errors were captured during these interactions.
- The four changed runtime files total 109,589 bytes, down from 118,516 bytes before this change (8,927 bytes fewer, uncompressed). No dependencies, network requests, or animation loops were added. This is a payload comparison, not a performance benchmark.

These checks cover the local preview; this change has not been deployed.
