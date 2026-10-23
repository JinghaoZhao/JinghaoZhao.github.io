# Handoff

Read this file before starting a new task in this repository.

## Current direction

- Preserve the blue geometric identity and the existing page structure. Simplify repeated UI copy; let spacing, alignment, and the diagrams establish hierarchy.
- Edit the maintained root HTML, `css/site.css`, `js/site.js`, and `project-studies` files. The old Jade/Sass/Less sources are reference material, not a build input.
- Keep original media unchanged. The seven inline project studies replace the visible original-image panels; do not restore those panels or the floating motion-pause button.
- Project-copy simplification is on `codex/project-copy-simplification` and has been checked locally. It has not been published.

## Pitfalls

- Remove JavaScript references when removing UI elements. In this change, Acemap's load handler referenced the deleted `.study-kind` heading.
- Use bounded patches for JavaScript edits. A broad multiline regex matched beyond a nested callback during this task; the syntax check caught it, and the file was restored before applying the exact deletion.
- Update asset query versions with coordinated HTML/CSS/JS changes so cached files cannot leave the page in a mixed state.
- Serve the site over HTTP for Acemap's on-demand CSV request. A stopped preview server can leave an old page visible; confirm it responds before treating a browser reload as validation.

## Performance and verification

- Keep project playback finite, visible-only, and compatible with reduced motion. Load the 2,208-topic dataset only after a visitor requests it.
- Run JavaScript syntax checks and `git diff --check`, then inspect desktop/mobile layout and affected interactions. Verify the actual deployed page after any future publication.
- The latest local verification is in `docs/validation/2026-10-23-project-copy.md`.
