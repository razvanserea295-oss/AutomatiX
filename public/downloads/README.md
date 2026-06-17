# Desktop installers

The Windows installer produced by `npm run dist:electron:win` is published here as:

```
Automatix-Setup-<version>.exe
```

The server serves the newest matching file via:

- `GET /download` → redirects to the in-app download page (`#/download`)
- `GET /api/download/latest` → `{ available, version, file, url, size }`
- `GET /downloads/Automatix-Setup-<version>.exe` → streams the installer as an attachment

`npm run dist:electron:win` writes the installer to `dist-installer/`. Copy (or
symlink) the produced `Automatix-Setup-<version>.exe` into this folder to publish it:

```powershell
Copy-Item "dist-installer/Automatix-Setup-*.exe" "public/downloads/"
```

> Files in this folder (except this README) are git-ignored — they are large build artifacts.
