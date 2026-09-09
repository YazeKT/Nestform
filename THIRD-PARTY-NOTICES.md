# Third-party notices

Nestform is a modernized desktop fork of Deepnest by Jack Qiao. Original authorship, licence headers, and third-party notices remain in the corresponding source files.

## Application and engine

| Component | Use in Nestform | Licence or notice |
| --- | --- | --- |
| Deepnest | SVG parsing, nesting search, placement, line merging, export behavior, and supporting utilities | Active engine header states GPLv3; original authorship retained |
| SVGNest-derived routines | Polygon nesting and geometry behavior incorporated through Deepnest | Retained upstream source notices |
| Upstream Deepnest MIT notice | Historical notice found in the upstream `main/LICENSE.txt` | Preserved as `LICENSE-MIT-upstream.txt`; it does not relabel GPL-marked files |
| Boost 1.62 | Polygon convolution and geometry support | Boost Software License 1.0, preserved as `LICENSE-Boost-1.0.txt` |
| Clipper | Polygon clipping and offset routines | Notice retained in `src/renderer/public/engine/util/clipper.js` |
| D3 polygon routines | Polygon calculations | Notice retained in the source file |
| Simplify.js | Geometry simplification | Notice retained in the source file |
| Ractive and browser compatibility utilities | Preserved Deepnest engine-page support | Individual headers retained in the source files |

The Node-API wrapper and current worker adapters are Nestform modernization work and are distributed under GPL-3.0-only with the combined application.

## Direct JavaScript dependencies

The pinned dependency graph and exact resolved versions are recorded in `package-lock.json`.

| Package | Purpose | Licence |
| --- | --- | --- |
| React and React DOM | Renderer UI | MIT |
| Electron | Desktop runtime | MIT; packaged Chromium notices are included with binary releases |
| Vite and electron-vite | Build tooling | MIT |
| TypeScript | Type checking and compilation | Apache-2.0 |
| Node-addon-api | Native Node-API wrapper | MIT |
| Lucide React | Interface icons | ISC |
| DOMPurify | Sanitizing imported SVG markup | Apache-2.0 or MPL-2.0 |
| Outfit Variable via Fontsource | Application typeface | SIL Open Font License 1.1 |
| electron-builder | Windows packaging | MIT |

Transitive package notices remain in their packages during development. Electron binary distributions include `LICENSE.electron.txt` and `LICENSES.chromium.html`. A CycloneDX software bill of materials is attached to each GitHub release.

## Nestform identity

The Nestform interface, fitted-shape N identity, application packaging, and current distribution are produced by Kirsten Trimaley, trading as Yaze Media. Brand usage is described in `BRAND-USAGE.md`. No registered trade-mark claim is made.

