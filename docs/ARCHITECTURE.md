# Architecture

Nestform keeps the proven Deepnest geometry and search behavior behind a modern Electron boundary.

## Process boundaries

- `src/main` owns windows, native dialogs, settings, local history, conversion requests, export, worker lifecycle, and filesystem validation.
- `src/preload` exposes a narrow typed IPC bridge. The renderer has no direct Node.js access.
- `src/renderer` contains the React workspace and the isolated engine page.
- `src/renderer/public/engine` contains the retained browser-side Deepnest parser, search, and geometry helpers.
- `src/main/engine-worker.cjs` and `vendor/legacy` run placement evaluation outside the UI process.
- `native` provides the Node-API wrapper around the retained Boost polygon convolution.

The BrowserWindow uses context isolation, sandboxing, disabled Node integration, and a Content Security Policy. Filesystem and native operations stay in the main process and are invoked through validated preload methods.

## Units

The engine retains its established internal scale. Import interprets physical SVG units at the boundary, workspace settings use millimetres, and export writes physical dimensions and a matching viewBox. Tests verify the supplied reference fixtures and spacing behavior; downstream CAD interpretation and machine calibration remain external responsibilities.

## Preservation tests

`tests/preservation.test.cjs` verifies hashes for active upstream sources. `tests/native.test.cjs` compares native output with fixtures captured from the original Windows 1.0.5 addon. UI upgrade tests cover Auto Nest defaults, history, appearance, unit behavior, and current source structure.

Engine changes require updated evidence explaining why parity changed. Visual or packaging work must not silently alter geometry, placement, line merging, or export behavior.

