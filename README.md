# Launchline

Launchline is a standalone Electron desktop app for two practical workflows:

- Python environment tooling for local developer setup
- Production-readiness audits for application repos

It is designed as a local desktop workspace for checking Python runtime health, managing project venv workflows, and scanning a codebase for production concerns such as secrets hygiene, CI/CD coverage, observability, access control, recovery posture, and related operational signals.

## Current Product Status

Launchline is already usable, but the maturity is uneven across features.

- `Python Tools` is mostly working and is one of the strongest parts of the app today.
- `Production > Secrets` is the most complete production audit surface.
- The other production tabs are implemented and run real repo scans, but they are still earlier-stage audit surfaces and should be considered less validated than Secrets.

## Working Features

### Python Tools

The Python Tools page is the main operational workspace for local Python setup.

Current working capabilities include:

- Detecting local `uv`, Python, and virtual environment status
- Reading project Python configuration from `pyproject.toml`
- Recommending environment strategy for the workspace
- Creating, rebuilding, syncing, and deleting the project virtual environment
- Inspecting available Python runtimes
- Summarizing installed dependencies and package groups
- Editing project dependency configuration from the app
- Tracking command output and run history for Python tooling actions
- Opening relevant paths and terminals directly from the UI

The Python Tools surface is not just a mockup. It is connected to real Electron/main-process actions and local filesystem checks.

### Production: Secrets

The Secrets tab is the most mature production-readiness audit in Launchline.

Current working capabilities include:

- Scanning `.env`, `.env.local`, `.env.example`, and related environment files
- Checking gitignore coverage for local secret-bearing files
- Comparing expected provider variables against current env-file contents
- Showing hygiene trends and follow-up actions
- Tracking rotation reminders in app settings
- Surfacing common configuration and hygiene issues directly in the UI

If you are evaluating Launchline as a portfolio project, this is currently the strongest example of the production-audit workflow.

### Production: Other Audit Tabs

The remaining production tabs are not simple placeholders anymore. Each one has a real UI and calls a real workspace scan in the Electron backend.

Implemented audit tabs currently include:

- `Containerization`
- `CI/CD Pipeline`
- `Monitoring`
- `Data Versioning`
- `Model Registry`
- `Disaster Recovery`
- `Audit Logging`
- `Access Control`

These tabs currently provide:

- Workspace scanning against repo files and configuration
- Readiness scores and checklist-style summaries
- Sectioned findings and refreshable audit views
- Heuristic detection of technologies, files, and operational signals relevant to each domain

These tabs are best described as:

- working
- real
- early-stage
- more heuristic than deeply validated

In other words, they are useful portfolio evidence of the product direction and engineering approach, but Secrets is still the most polished audit surface.

## Planned / Still Developing

The app still has meaningful roadmap work ahead before it feels fully productized.

Areas still in development include:

- deeper remediation guidance inside the non-Secrets production tabs
- stronger verification and calibration of production audit heuristics
- broader packaging and release polish for distribution to end users
- more polished documentation, screenshots, and demo material
- additional maintainability work to keep shrinking and modularizing the codebase

Some production tabs already function, but they still need more refinement before they should be treated as authoritative operational assessments.

## Storage

Launchline stores mutable app data under the OS app-data area instead of using the repo tree as the primary store.

Current storage model:

- Global app settings are stored separately from workspace-specific state
- Workspace history and UI state are scoped to the current repo
- Settings use a schema version plus migration logic
- Settings can be imported, exported, and reset from the app shell
- Secrets should stay in environment files or an external secret manager, not in settings JSON

## Run Locally

From the repo root:

```powershell
.\scripts\bootstrap.ps1
.\scripts\dev.ps1
```

If you need the manual fallback:

```powershell
C:\Users\ender\AppData\Local\nvm\nvm.exe use 24.14.1
$env:Path = 'C:\nvm4w\nodejs;' + $env:Path
C:\nvm4w\nodejs\npm.cmd start
```

## Runtime Notes

- Node `24.14.1` is the intended version for local development.
- Python `3.13` has been the safer choice on this machine.
- Python `3.14` previously hit an `onnxruntime` wheel incompatibility.
- The app can boot without automatically creating the venv if the setup script is missing.

## Positioning

Launchline is meant to showcase practical product and engineering judgment around:

- desktop app architecture with Electron + React
- Python environment tooling and reproducibility
- local-first operational review workflows
- production-readiness scanning across multiple reliability and security domains
- incremental cleanup of inherited architecture into a focused standalone product
