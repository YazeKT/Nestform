# Building on Windows

## Requirements

- Windows 10 or 11, x64
- Node.js 22 or newer
- npm from the selected Node.js installation
- Visual Studio 2022 Build Tools with Desktop development with C++ and a Windows SDK
- Python supported by node-gyp
- Windows `tar` or 7-Zip for extracting the verified Boost archive

## Clean setup

```powershell
git clone https://github.com/YazeKT/Nestform.git
cd Nestform
npm ci
npm run runtime:install
npm run bootstrap:win
npm run native:build
npm run verify
```

`bootstrap:win` downloads the official Boost 1.62 7z archive, checks SHA-256 `B91C2CDA8BEE73EA613130E19E72C9589E9EF0357C4C5CC5F7523DE82CCE11F7`, and extracts it to `vendor/boost_1_62_0`.

Start development with `npm run dev`. Build the unpacked application with `npm run pack`. Build the Windows installer and portable executable with `npm run release:win`.

## Verification

`npm run verify` performs TypeScript checking, native and engine-preservation tests, upgrade behavior tests, and a production build. A successful package still needs a running installed-copy smoke test before release.

Downloaded Boost files, native output, `out`, `release`, `validation`, logs, and user data are intentionally ignored by Git.
