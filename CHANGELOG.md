# Nestform changelog

## Unreleased

- Prepared the public `YazeKT/Nestform` repository with reproducible Windows setup, GPL and upstream attribution, brand-use guidance, contributor governance, security reporting, pinned CI, CodeQL, Dependabot, protected-release automation, SBOM generation, checksums, and source packaging.
- Made preservation tests self-contained so a fresh clone verifies retained upstream sources without the former parent checkout.
- Prevented electron-builder from attempting an implicit GitHub publish so the reviewed release workflow remains the only artifact publisher.
- Updated the packaged-app smoke test to target the current Settings control.
- Scoped CodeQL to maintained source so generated output, downloaded Boost documentation, local debugger harnesses, and unloaded retained browser utilities do not create duplicate or non-actionable alerts.

## 0.4.0 — 2026-09-08

- Prepared the first client-ready Windows installer with Nestform product naming, the Nestform executable, window and shortcut icons, and Yaze Media publisher metadata.
- Added **Auto Nest**, the new recommended start: choose scaled drawing files, enter sheet width, height and quantity, then start a fully configured search.
- Auto Nest defaults to an exact 3 mm part gap and six evenly spaced rotations, while keeping the advanced gap range available when required.
- Replaced the reading-heavy first-launch welcome screen with a six-step guided tour, directional focus, Back and Next controls, and a persistent Don't show again choice.
- Added an import choice for adding parts to the current nest or selecting files for a fresh empty nest.
- Removed start and end clocks from the workspace and retained the live countdown, progress and evaluated candidate count.
- Reduced both top bars and expanded the nesting canvas while fitting the entire selected sheet whenever the result changes.
- Strengthened the sheet boundary in the main canvas, Results cards and History previews without obscuring part linework.
- Added Ctrl +, Ctrl -, and Ctrl 0 shortcuts for zoom in, zoom out and fit to view.
- Expanded Appearance with theme, accent, grid, grid visibility, sheet outline, interface spacing, preview size, motion and a live workspace preview.
- Kept all completed History entries, added separate date and time display, and added a user-selected backup folder that writes an SVG and job record for every saved nest.
- Fixed the How to use close control and kept the detailed user guide, technical wiki, safety guidance and licensing notices in Settings.

## 0.3.0 — 2026-09-04

- Implemented the selected Workshop Dark Option 2 layout with one clear command bar and a larger, viewport-filling nesting canvas.
- Fixed the first-launch height collapse that left the lower half of the window blank.
- Combined Results and History in a wider right inspector with visible, colour-coded previews and dimensions contained in each card.
- Introduced the self-hosted Outfit variable typeface for a closer match to the Nestform wordmark.
- Added restrained workspace, progress, tab, and result-card motion with reduced-motion support.

## 0.2.1 — 2026-09-04

- Prevented nesting artwork, labels, and dimensions from escaping result preview cards.
- Restored visible, colour-coded linework in History previews without changing production SVG exports.
- Carried each part colour from the Parts rail through the main preview and saved-history display.
- Replaced unavailable web fonts with the geometric Bahnschrift family across the Windows interface.

## 0.2.0 — 2026-09-04

- Expanded the Workshop Dark workspace with a larger canvas and vertical result previews.
- Added editable project names, timed runs, progress, local history, multi-sheet/offcut stock, three themes, and accent choices.
- Added first-run guidance, an internal wiki, support reporting, safety and licence information.
- Added millimetre fidelity and high-volume validation paths.

## 0.1.0 — 2026-09-03

- Rebuilt the Deepnest desktop interface as Nestform while retaining its geometry, placement, line-merging, and export engine.
- Moved native calculations into isolated child processes and added a sandboxed Electron boundary.
- Added the Workshop Dark identity, sample workflow, exact SVG export, and a portable Windows build.

## Project start — 2026-09-02

- Ran and inspected Deepnest 1.0.5 on Windows.
- Captured the original import, nesting, result, and settings workflow.
- Explored three interface directions and selected Workshop Dark.
