# Desktop installers

The desktop installers are published here, one file per platform. The server
serves the newest matching file for each platform:

| Platform | Filename pattern                      | Built by                                         |
|----------|---------------------------------------|--------------------------------------------------|
| Windows  | `Automatix-Setup-<version>.exe`       | `npm run dist:electron:win`                      |
| macOS    | `Automatix-<version>-<arch>.dmg`      | electron-builder `--mac` (run on macOS)          |
| Linux    | `Automatix-<version>-<arch>.AppImage` | electron-builder `--linux`                       |

`<arch>` is e.g. `arm64`, `x64`, or `x86_64`.

The server endpoints:

- `GET /download` → redirects to the in-app download page (`#/download`)
- `GET /api/download/latest?platform=windows|mac|linux` → `{ available, platform, version, file, url, size }`
  (omitting `platform` defaults to Windows)
- `GET /downloads/<installer-file>` → streams the installer as an attachment
  (requires a one-time `?dlt=` grant from `/api/download/authorize` or a valid session)

## Publishing a build

electron-builder writes installers to `dist-installer/`. Copy the produced file
into this folder to publish it:

```bash
# Windows
cp dist-installer/Automatix-Setup-*.exe       public/downloads/
# macOS
cp dist-installer/Automatix-*-*.dmg           public/downloads/
# Linux
cp dist-installer/Automatix-*-*.AppImage      public/downloads/
```

> Files in this folder (except this README) are git-ignored — they are large
> build artifacts.
