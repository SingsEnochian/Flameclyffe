# Hearthgate Windows Installer

Status: build lane implemented; code signing not yet configured.

## What this lane produces

The Hearthgate desktop package is built with Electron Builder as a 64-bit NSIS installer:

```text
Hearthgate-Setup-<version>-x64.exe
```

The installer:

- lets the user choose the installation directory;
- creates a desktop shortcut;
- installs an uninstall entry named `Hearthgate`;
- keeps API keys and local records out of the packaged application;
- stores runtime configuration and data under Electron's per-user `userData` directory.

## GitHub Actions

Workflow: `.github/workflows/hearthgate-windows-installer.yml`

The workflow runs on:

- pull requests that change Hearthgate or the workflow;
- relevant pushes to `main`;
- manual dispatch;
- tags matching `hearthgate-v*`.

Every successful build uploads:

- the NSIS `.exe`;
- any generated blockmap/update metadata;
- `SHA256SUMS.txt`.

Tagged builds are attached to a GitHub Release.

## Local Windows build

From `apps/starwell-server`:

```powershell
npm ci
npm run check:packaging
npm run electron:build:win
```

Output is written to:

```text
apps/starwell-server/dist-electron/
```

For a fast unpacked application directory without the NSIS installer:

```powershell
npm run electron:pack:win
```

## Release procedure

1. Confirm the Windows workflow passes on `main`.
2. Update `apps/starwell-server/package.json` and `package-lock.json` to the intended version.
3. Create and push a matching tag, for example:

```text
hearthgate-v0.1.0
```

4. Confirm the release contains the installer and SHA-256 checksum.
5. Install on a clean Windows user profile and verify:
   - setup wizard opens on first launch;
   - Hearthgate starts its local server;
   - the archive route opens;
   - application restart preserves configuration;
   - uninstall removes application files without deleting separately exported archives.

## Signing state

The current CI output is deliberately **unsigned**. Windows may display a SmartScreen warning. Do not describe the build as signed or production-trusted.

A later signing pass should add a protected code-signing certificate through GitHub Actions secrets or a trusted external signing service. Private signing material must never be committed to the repository.

## App icon

The old package configuration referenced `electron/icon.ico`, but that file did not exist and would break packaging. The first reproducible installer therefore uses Electron's default Windows icon. A proper Hearthgate `.ico` asset can be added after its licence and final design are approved.

## iOS is a separate lane

Electron/NSIS output cannot be reused as an iOS package. Hearthgate on iPhone and iPad needs an explicit architecture choice, Xcode signing, provisioning, and physical-device testing. Track that work separately from this installer so neither platform is represented as more complete than it is.
