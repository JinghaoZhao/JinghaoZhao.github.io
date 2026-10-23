# Personal homepage refresh

## Goal

Evolve Jinghao Zhao's existing blue, low-poly, Raleway identity into a polished, responsive personal website, with current GCE Bare Metal work and motion as the focal points.

## Design decision

Preserve the original centered name, blue polygon landscape, floating triangles, portrait, projects, and publication record. A restrained update would underserve the requested motion; a wholly new dark dashboard would lose the existing identity. Use a cinematic geometric hero followed by airy editorial content and one dark featured-work section.

## Implementation plan

1. Replace the generated one-line `index.html` with semantic, editable static HTML; keep the custom domain, original assets, paper URLs, CV, and analytics identifier.
2. Add `css/site.css`: responsive layouts, original Raleway display type, readable body text, accessible controls, focus states, and coordinated reveals.
3. Add `js/site.js`: a bounded canvas polygon scene, pointer response, scroll depth, global motion control, visibility suspension, reduced-motion support, and publication filters. Content stays available without JavaScript.
4. Add a current-work feature using public Google Cloud/CME information and the user's explicitly supplied team/participation. Keep public product capabilities distinct from personal contributions. Do not invent responsibilities, performance results, or employment dates.
5. Preserve all 7 earlier projects and 12 publications. Make the original Acemap visualization opt-in so its large legacy plotting bundle is loaded only when requested.
6. Verify desktop/mobile layouts, navigation, filtering, keyboard access, motion pause, reduced motion, no-JS fallback, asset requests, console errors, and motion behavior. Document remaining limits.
7. Deliver the working local preview and a reviewable Git branch/PR. Publishing to the live domain is separate from preparing this change.

## Sources checked 2026-10-22

- https://cloud.google.com/blog/topics/financial-services/ultra-low-latency-solution-with-u4-enables-high-velocity-trading (2026-10-07): U4 bare metal and ULL collaboration with CME.
- https://www.cmegroup.com/media-room/press-releases/2026/10/12/cme_group_announcescloudmigrationmilestones.html (2026-10-12): migration is ongoing; Aurora client testing targeted for mid-2027 and livestock migration for late 2027. Avoid stale older migration timelines.
- Existing homepage: education, portrait, links, prior projects, and full publication authorship.
- User: Google GCE Bare Metal team member working on the Google/CME low-latency trading platform. No inferred individual ownership of all U4 features.
