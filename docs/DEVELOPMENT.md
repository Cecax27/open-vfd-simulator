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

This command starts Uvicorn directly against `main:app` (best for local dev with auto-reload).

Alternative (uses the backend entrypoint in `main.py`):

```bash
cd backend
OPEN_VFD_HOST=127.0.0.1 OPEN_VFD_PORT=8000 OPEN_VFD_LOG_LEVEL=info \
  ../.venv/bin/python -m open_vfd_simulator_backend.main
```

`open_vfd_simulator_backend.main:run()` reads:

- `OPEN_VFD_HOST` (default: `127.0.0.1`)
- `OPEN_VFD_PORT` (default: `8000`)
- `OPEN_VFD_LOG_LEVEL` (default: `info`)

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

## Build for Ubuntu and Windows

The project currently builds in two parts:

- Backend Python package (`sdist` + `wheel`)
- Frontend static bundle (`frontend/dist`)

The desktop app is still run by launching Electron with the local backend process. An installer pipeline (`.deb`, `.exe`, etc.) is not configured yet.

### Ubuntu 22.04+ Build

#### 1) System prerequisites

```bash
sudo apt update
sudo apt install -y build-essential python3.11 python3.11-venv python3-pip
corepack enable
corepack prepare pnpm@latest --activate
```

#### 2) Create and prepare Python environment

From repository root:

```bash
python3.11 -m venv .venv
. .venv/bin/activate
```

#### 3) Install dependencies

```bash
# Backend
cd backend
../.venv/bin/python -m pip install -U pip
../.venv/bin/python -m pip install -e .[dev]

# Frontend
cd ../frontend
pnpm install
```

#### 4) Compile backend artifacts

```bash
cd ../backend
pyinstaller src/open_vfd_simulator_backed/main.py --onefile
cd ..
cp backend/dist/main frontend/backend/main
```

Expected output:

- `backend/dist/main`
- `backend/dist/main.exe`

#### 5) Compile frontend artifacts

```bash
cd ../frontend
pnpm run build:electron
```

Expected output:

- `frontend/dist/` (Vite production bundle)

### Windows 10/11 Build (PowerShell)

#### 1) System prerequisites

- Python 3.11+
- Node.js 20+
- pnpm (via Corepack)

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

#### 2) Create and prepare Python environment

From repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If script execution is blocked:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

#### 3) Install dependencies

```powershell
# Backend
cd backend
..\.venv\Scripts\python.exe -m pip install -U pip
..\.venv\Scripts\python.exe -m pip install -e .[dev]

# Frontend
cd ..\frontend
pnpm install
```

#### 4) Compile backend artifacts

```powershell
cd ..\backend
..\.venv\Scripts\python.exe -m pip install build
..\.venv\Scripts\python.exe -m build
```

Expected output:

- `backend\dist\*.whl`
- `backend\dist\*.tar.gz`

#### 5) Compile frontend artifacts

```powershell
cd ..\frontend
pnpm build
```

Expected output:

- `frontend\dist\`

#### 6) Run using built setup

Terminal 1:

```powershell
cd backend
$env:OPEN_VFD_HOST="127.0.0.1"
$env:OPEN_VFD_PORT="8000"
$env:OPEN_VFD_LOG_LEVEL="info"
..\.venv\Scripts\python.exe -m open_vfd_simulator_backend.main
```

Terminal 2:

```powershell
cd frontend
pnpm dev:electron
```

## Distribution Builds (Standalone Executables)

To create user-friendly installers (AppImage for Linux, .exe for Windows), follow these steps:

### 1) Build Backend as Standalone Executable

```bash
cd backend
../.venv/bin/python -m pip install pyinstaller

# Create PyInstaller spec for uvicorn server
../.venv/bin/pyinstaller \
  --onefile \
  --windowed \
  --name vfd-backend \
  --hidden-import=uvicorn.logging \
  --hidden-import=fastapi \
  --collect-all=asyncua \
  --collect-all=open_vfd_simulator_backend \
  -p src \
  src/open_vfd_simulator_backend/main.py
```

Expected output:

- `backend/dist/vfd-backend` (Linux/macOS)
- `backend/dist/vfd-backend.exe` (Windows)

### 2) Build Complete Distribution

#### Linux (AppImage)

```bash
# From repository root
cd frontend
pnpm run build:backend  # Build backend wheel and PyInstaller bundle
pnpm run build:electron  # Build frontend + create AppImage
```

Expected output:

- `frontend/dist/Open VFD Simulator-0.1.0.AppImage`

#### Windows (.exe Installer)

```powershell
# From repository root
cd frontend
pnpm run build:backend  # Build backend wheel and PyInstaller bundle
pnpm run build:electron  # Build frontend + create .exe installer
```

Expected output:

- `frontend/dist/Open VFD Simulator Setup 0.1.0.exe`

### 6) Distribution Package

Copy the built executable along with:

- `backend/dist/vfd-backend` or `backend/dist/vfd-backend.exe`
- Any required system libraries (handled by PyInstaller on Linux)

Users can then:

1. Download the `.AppImage` (Linux) or `.exe` (Windows)
2. Run it directly—no terminal, no Python installation required
3. Backend starts automatically in the background
4. Frontend UI appears immediately

### Development Tips

- Keep `electron/main.mjs` backend startup logic in sync with actual backend startup requirements
- Test the built executable on target OS before distribution
- For signing and notarization (macOS), refer to [electron-builder documentation](https://www.electron.build/)
- PyInstaller may need additional `--hidden-import` flags if new dependencies are added

## Notes

- The backend now runs simulation continuously in a background loop.
- The frontend currently uses periodic REST polling for live updates.
- WebSocket telemetry is still planned as a future improvement.
- Project open/save is implemented through Electron IPC and local `.ovfd` files.
