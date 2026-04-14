# Development

## Repository Structure

- `backend/`: FastAPI backend and simulation integration layer
- `frontend/`: Electron + React desktop client
- `docs/`: architecture and implementation notes

## Initial Priorities

1. Validate the motulator integration behind a stable adapter.
2. Build a canonical device model and registry.
3. Add project persistence for multiple device instances.
4. Add protocol adapters for Modbus and OPC UA.
5. Connect the Electron UI to REST and WebSocket contracts.

## Planned Tooling

- Python 3.11+
- FastAPI
- React + TypeScript
- Electron

## Run Locally (Backend + Electron)

This project currently runs as two local processes during development:

- Backend API (FastAPI) on `http://127.0.0.1:8000`
- Electron desktop shell

### 1) Prerequisites

- Python virtual environment created at repository root (`.venv`)
- Node.js installed
- `pnpm` installed

### 2) Install Dependencies

From the repository root:

```bash
# Backend dependencies
cd backend
../.venv/bin/python -m pip install -e .[dev]

# Frontend dependencies
cd ../frontend
pnpm install
```

### 3) Start the Backend

In terminal 1:

```bash
cd backend
../.venv/bin/python -m uvicorn open_vfd_simulator_backend.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

Alternative from repository root:

```bash
.venv/bin/python -m uvicorn open_vfd_simulator_backend.main:app --app-dir backend/src --reload --host 127.0.0.1 --port 8000
```

If you get `ModuleNotFoundError: No module named 'open_vfd_simulator_backend'`, it means Python is not searching the `src/` directory. The `--app-dir src` flag fixes that for local development.

Quick checks:

- Health endpoint: `http://127.0.0.1:8000/health`
- API docs: `http://127.0.0.1:8000/docs`

### 4) Start Electron Desktop Shell

In terminal 2:

```bash
cd frontend
pnpm dev:electron
```

If Electron fails with `Electron failed to install correctly`, your package manager likely skipped Electron build scripts. Run:

```bash
cd frontend
node node_modules/electron/install.js
pnpm dev:electron
```

If `pnpm` reports ignored builds, you can also run `pnpm approve-builds` and allow Electron.

Use the Electron app menu for:

- Project -> New Project
- Project -> Open Project
- Project -> Save
- Project -> Save As
- View -> Devices
- View -> Program Settings

Startup flow:

- App opens on Home screen.
- Home screen shows recent projects and a button to create a new project.
- Use `Close Project` to return from an open project to Home.

Unsaved changes flow:

- On `New`, `Open`, or `Close Project`, if current project has unsaved changes, Electron shows a message box:
	- Save
	- Don't Save
	- Cancel

### 5) Smoke Test the Full Flow

1. Create a device in the UI.
2. Open the device configuration page and edit runtime values.
3. Save the device configuration.
4. Set runtime state to `Run` and confirm telemetry changes automatically.
5. Go to Program Settings and change `Simulation Step (ms)` and language.
6. Save the project to an `.ovfd` file.
7. Open the saved project and confirm devices and settings are restored.
8. Make a change, click `New` or `Close Project`, and confirm the unsaved-changes prompt appears.

### 6) Run Backend Tests

```bash
cd backend
../.venv/bin/python -m pytest -q
```

## Notes

- The backend now runs simulation continuously in a background loop.
- The frontend currently uses periodic REST polling for live updates.
- WebSocket telemetry is still planned as a future improvement.
- Project open/save is implemented through Electron IPC and local `.ovfd` files.
