# Jinghao Zhao's personal website

A build-free personal homepage at **https://zhaojinghao.com/**, hosted by GitHub Pages.

## Preview

From the repository directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765. Use an HTTP server rather than opening the HTML file directly so the optional Acemap data can load.

## Edit

- `index.html`: biography, current work, projects, complete publication records, contact links, and metadata.
- `css/site.css`: responsive layouts, typography, illustration animation, and reduced-motion styling.
- `js/site.js`: geometric canvas scene, animation lifecycle, navigation state, publication filters, and the on-demand Acemap explorer.
- `images/optimized/`: WebP derivatives of original images. The original files remain in `images/`.
- `fonts/`: locally served fonts. DM Sans is distributed under the included SIL Open Font License.
- `CNAME`: the existing custom domain.

The older Jade, Sass, Less, and JavaScript files are retained for reference. **The maintained source is now the root HTML and the two `site` files; do not regenerate it from the old Jade templates.** No npm installation or build step is required. The root `.nojekyll` file makes GitHub Pages serve the static files directly.

## Motion and accessibility

The native canvas replaces the former 600-triangle tween loop. Rendering is capped at 30 fps and 1.5× pixel density, with fewer geometry elements on small screens. The canvas suspends when the hero is offscreen or the document is hidden. SVG illustration animation suspends offscreen as well.

Motion follows the operating system's reduced-motion setting. There is no floating pause control or stored manual motion preference. Biography, links, all projects, and all publications remain readable without JavaScript. Filters are native buttons; the knowledge map includes native field and topic selectors for keyboard use. There is no custom scroll interception.

Acemap retains all 2,208 topics from the existing CSV. Data is requested only when a visitor opens the map. The homepage no longer loads jQuery, Bootstrap, TweenLite, or Plotly. The existing Google Analytics property is retained on the production domains only.

## Content provenance

The current GCE Bare Metal team membership, end-to-end architectural perspective, and participation in the Google Cloud/CME low-latency platform are user-supplied. The work section presents the broader platform perspective first, with CME as a subordinate case study. Contact links use the existing LinkedIn profile; a custom website domain does not imply an email service. Public case-study context comes from:

- [Google Cloud's U4 compute introduction, October 7, 2026](https://cloud.google.com/blog/topics/financial-services/ultra-low-latency-solution-with-u4-enables-high-velocity-trading)
- [CME Group's migration update, October 12, 2026](https://www.cmegroup.com/media-room/press-releases/2026/10/12/cme_group_announcescloudmigrationmilestones.html)

Product capabilities are not claimed as individual accomplishments. The illustration is conceptual, and no private implementation details or individual performance metrics are asserted.

See `docs/validation/2026-10-22-homepage.md` for the verification performed during the refresh.
