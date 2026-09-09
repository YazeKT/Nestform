# Troubleshooting

## Electron runtime is missing

Run `npm run runtime:install`, then repeat the build. A package script existing is not proof that the Electron binary has downloaded.

## Boost headers are missing

Run `npm run bootstrap:win`. If it reports a checksum failure, remove the incomplete archive and retry from the official network. Do not disable the checksum check.

## Native build fails

Confirm Visual Studio 2022 Build Tools includes Desktop development with C++, a Windows SDK, and MSVC. Confirm Python is visible to node-gyp. Then remove only `native/build` and rerun `npm run native:build`.

## Windows warns about the publisher

The 0.4.0 package is not Authenticode signed. Compare its SHA-256 value with `SHA256SUMS.txt` from the same GitHub Release. A checksum confirms file identity; it does not create a trusted Windows publisher.

## A converted format fails

SVG processing is local. DXF and CDR import and DXF export depend on the configured conversion service. A conversion-service failure does not prove that the local nesting engine failed.

## Manufacturing dimensions differ

Confirm the source SVG declares physical units or a correct viewBox, Nestform is set to millimetres, legacy export padding is disabled, and the receiving CAD application imports SVG physical units correctly. Measure a simple calibration rectangle before using production material.

