# Project motion verification — October 22, 2026

- Static validation: seven original project IDs retained; seven motion studies; six original-image disclosures; twelve unchanged publication records; unique IDs, SVG title/description references, local file references, and anchor targets valid.
- JavaScript syntax and Git whitespace checks passed. No dependency or build system added. Project playback script is approximately 4 KB before compression.
- Inspected desktop (1280×900), phone (390×844), narrow phone (320×740), and tablet (768×1024) layouts. No horizontal page overflow at these sizes. Under 900 px, project studies use a single column. Inspected the six schematics and Acemap preview in browser screenshots.
- Watched data paths and stage highlights during playback. A replay begins at stage one; after a full sequence it returns to a static state with no active parts. An offscreen study stopped running while Acemap's visible preview ran.
- Native original-diagram disclosure opens and closes. Keyboard Enter opens it with JavaScript disabled. Image originals are unchanged.
- Emulated reduced motion: zero running studies, no visible replay controls, and no hidden pending content. Restored the preference afterward.
- With JavaScript disabled: all seven figures remain, diagram answer strokes are fully drawn, replay controls stay hidden, and no content waits for a reveal. Restored JavaScript afterward.
- Acemap switches from its conceptual animation to the real 2,208-topic dataset; all 20 field options and 2,209 topic options (including the placeholder) are present. The preview replay control disappears after loading.
- No browser console errors observed for the completed revision.

Limits: browser checks used Chromium and emulated sizes, not physical devices or Safari/Firefox. These are conceptual mechanisms, not measured simulation timings, benchmarks, or exhaustive protocol diagrams. Changes are staged locally for review; no deployment is part of this verification.

## Follow-up: consistent project presentation

- Removed all six original-image disclosures and their styles; original image files remain in the repository.
- Restyled Acemap with the same light background, project metadata, title scale, conceptual-figure header, three-step strip, and replay control as the six other projects. Native field/topic controls and selected-point outlines use matching light-theme colors.
- Kept the original CSV color values as field identifiers and applied a separate display palette, preserving all 2,208 topics and field assignments. Selecting Computer Science still exposes 256 topics (257 dropdown options including the placeholder).
- Confirmed the old disclosure text and elements are absent, all local assets and IDs remain valid, and the JavaScript passes syntax checks. Desktop and mobile browser checks found no horizontal overflow or console errors. The loaded map is labeled as a research topic map rather than a conceptual preview.
