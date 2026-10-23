# Project illustration refresh

## Direction

Replace the six white-backed thumbnail figures in “Ideas, made real.” with inline SVG walkthroughs on the existing blue-gray paper. Keep the original figure assets in the repository without showing original-image disclosures on the page. Retain the seven projects, their descriptions, destinations, research records, and the rest of the site.

A unified line weight, restrained blue/teal accents, readable labels, and three-step sequences make the projects feel related while explaining distinct mechanisms. Six purpose-drawn schematics and the existing Acemap preview cover all seven entries. Narrow layouts become a single column at 900 px to preserve diagram legibility.

Alternatives considered: restoring a white section would solve the edge contrast but preserve the dense thumbnail problem; floating or zooming the old images would add motion without explaining a mechanism. The chosen approach provides an accessible visual explanation, with project and paper links for technical detail.

## Evidence and motion mapping

- **SEED:** device failure report → SIM/core diagnosis → recovery action. The original diagram and the [SIGCOMM paper](https://zhaojinghao.com/docs/SEED-A%20SIM-Based%20Solution%20to%205G%20Failures.pdf) describe inference using standardized error information and differentiated reset/redo actions.
- **SecureSIM:** certificate → permission check → allowed SIM service access. The original SIM/shield visual is preserved in the new illustration. Certificate-based authentication and fine-grained access are grounded in [the author's dissertation, Chapter 6](https://escholarship.org/content/qt9sg6x9g2/qt9sg6x9g2_noSplash_9260ac89eecf9fe9755c2bf393eb01bf.pdf) and the [MobiCom paper](https://dl.acm.org/doi/10.1145/3447993.3483254).
- **GPT-Code-Learner:** source search → question with repository context → GPT explanation. The [repository README](https://github.com/JinghaoZhao/GPT-Code-Learner/blob/main/README.md) identifies code search and repository parsing/context tools. The graphic abstracts the flow rather than simulating a real model response.
- **Sonica:** commodity device → NB-IoT eNodeB/EPC with CIoT → research. The [repository README](https://github.com/sonica-nbiot/sonica/blob/master/README.md) describes a software-defined testbed and off-the-shelf device interoperability. The archive's feature limits are not broadened into new claims.
- **Flora:** configurable eSIM → software-defined LTE RAN/core → edge VR and analytics. The [official project documentation](https://project-flora.github.io/Flora/) grounds all four components.
- **LRP / mobile VR:** motion uplink → advance preparation → rendered frames. The [NSDI paper](https://www.usenix.org/system/files/nsdi21-tan.pdf), sections 5.1–5.4, explains application-layer inference, DRX doze reduction, and proactive scheduling. No invented latency values or scale comparison is shown.
- **Acemap:** an animated conceptual network preview leads to the retained on-demand explorer and original 2,208-topic dataset. Decorative preview connections are not represented as measured citations.

## Behavior

Each walkthrough plays once for 10.8 seconds on entering view, then rests as a complete static diagram. Three 3.6-second stages highlight corresponding components and data flows. Replay is available locally within each illustration; no floating pause control returns. CSS handles motion, with small native timers used only for visible stages. Offscreen and hidden-tab playback pauses, operating-system reduced-motion preferences yield static figures, and content remains available without JavaScript.

SVG title/description elements explain the conceptual sequence to assistive technology. Original images remain unchanged in the repository. Acemap uses the same light paper, heading scale, and replay treatment as the other projects; the loaded topic colors are tuned for the light background without changing their field assignments.

## Copy simplification — October 23

The project layout now carries the hierarchy: title, a short description, the diagram, and the destination link. Remove repeated category/number labels, walkthrough headers, numbered stage strips, and captions that restate the diagram. Keep component labels, accessible SVG descriptions, and the local replay control. The three-stage motion itself is unchanged. Acemap shows loading/error feedback and selected-field counts when relevant, with no repeated introduction below its preview.
