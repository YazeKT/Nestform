# Contributing to Nestform

Thank you for improving Nestform. Changes must preserve the GPL licence, upstream attribution, engine behavior, millimetre boundaries, and secure Electron process separation.

## Before starting

Use an issue for a reproducible bug or a focused proposal before beginning a large change. Security problems belong in GitHub private vulnerability reporting rather than a public issue.

Build the project using [docs/BUILDING.md](docs/BUILDING.md). Create a short branch from current `main`; do not work directly on `main`.

## Change requirements

- Keep filesystem and native operations in the main process and expose only narrow typed preload methods.
- Do not enable renderer Node integration or weaken context isolation, sandboxing, path validation, or content sanitization.
- Preserve upstream source headers and update `THIRD-PARTY-NOTICES.md` for new dependencies or copied code.
- Keep the nesting engine and its public behavior unchanged unless the pull request documents new parity evidence.
- Add meaningful tests for engine, unit, storage, or security behavior. Avoid tests that only repeat implementation details.
- Include before-and-after screenshots for visible UI changes at 1366 × 768 and the 1000 × 680 minimum window.
- Update `CHANGELOG.md` under an Unreleased section for user-visible changes.
- Never commit client drawings, local History, credentials, signing files, downloaded Boost archives, build output, or release executables.

## Commit sign-off

All commits must be signed off under the [Developer Certificate of Origin](DCO.txt). Sign with:

```powershell
git commit -s -m "Describe the change"
```

The sign-off certifies that you have the right to submit the contribution under GPL-3.0-only. It is not a copyright assignment.

## Pull requests

Run these commands before opening a pull request:

```powershell
npm ci
npm run bootstrap:win
npm run native:build
npm run verify
npm audit --audit-level=high
```

Complete the pull-request template, resolve review conversations, and keep the branch current with `main`. A maintainer may ask for an installed-copy smoke test when packaging, native code, import/export, history, or unit handling changes.

By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

