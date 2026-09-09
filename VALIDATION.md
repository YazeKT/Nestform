# Nestform 0.4.0 validation record

## Automated verification

The public source tree passes TypeScript checking, 16 Node tests, and the Electron/Vite production build. The tests cover:

- Native rectangle convolution, holes, malformed input, and non-finite values
- Native-output parity with three fixtures captured from Deepnest 1.0.5 for Windows
- SHA-256 preservation of six active upstream source files using repository-relative paths
- Auto Nest's exact 3 mm default gap and six rotations
- Uncapped History and portable backup pairs
- Current Auto Nest help and changelog content

`npm audit --audit-level=high` reports no known vulnerabilities in the pinned dependency tree at publication time.

## Running-application evidence

The installed 0.4.0 application completed a production workflow with its packaged native engine. Validation confirmed the Nestform product name and icon, Yaze Media presentation, Auto Nest defaults, result generation, complete-sheet containment, Outfit typography, History, and SVG export. The normal installer created working desktop and Start Menu shortcuts and uninstalled through the Windows application path.

The 0.4.0 installed executable and installer are not Authenticode signed.

## Units and scale

A scaled 40 mm square fixture nested six copies with a requested 5 mm spacing. Independent placement inspection measured 4.9999998 mm minimum clearance. Exported SVG physical dimensions matched the stock dimensions when reopened. The small difference is floating-point residue; this evidence applies to the tested SVG path and is not a manufacturing tolerance guarantee for every drawing or CAD package.

## Capacity evidence

A synthetic high-volume run accepted 1,000 parts and grouped quantities representing 1,003 available stock pieces. It placed all 1,000 parts on two sheets and produced its first result in approximately 1.2 seconds on the test machine using eight workers, one rotation, and population three. Contour complexity, rotations, population, gaps, and available stock can change performance sharply, so this is a capacity fixture rather than a universal speed promise.

## Known qualification limits

- SVG is the fully exercised local import and export path.
- DXF and CDR import and DXF export depend on a conversion service.
- CDR and broad DXF compatibility have not been qualified against a representative production corpus.
- Curve approximation, kerf, CAD import behavior, controller settings, and machine calibration remain external to Nestform.
- Users must inspect dimensions and run a safe material test before production.

Release acceptance requires the GitHub draft artifacts to be downloaded and the installed-copy smoke workflow repeated before the release is published.

