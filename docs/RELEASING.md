# Release process

1. Update the version and changelog in a pull request.
2. Run `npm ci`, `npm run bootstrap:win`, `npm run native:build`, and `npm run verify` from a clean checkout.
3. Merge only after the required Windows verification check succeeds.
4. Create and push an annotated `vX.Y.Z` tag from the verified `main` commit.
5. The release workflow rebuilds and creates a draft GitHub Release with Windows packages, corresponding source, SBOM, licence bundle, checksums, and provenance.
6. Download the draft assets onto a Windows test machine, verify their checksums, install the setup package, and run the production smoke workflow.
7. Confirm product metadata, icon identity, import, Auto Nest defaults, full-sheet display, history, exact SVG export dimensions, and uninstall behavior.
8. Publish the draft release only after the installed-copy validation passes.

Version 0.4.0 is unsigned. Do not claim a verified Windows publisher until both the application executable and installer are Authenticode signed and the signatures have been checked after download.

Never place code-signing files or passwords in Git. Future signing credentials belong in GitHub encrypted secrets or an external signing service with the smallest possible access scope.

