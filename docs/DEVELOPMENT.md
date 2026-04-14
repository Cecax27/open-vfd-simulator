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

## Run Locally (Backend + Frontend)

This project currently runs as two local processes during development:

- Backend API (FastAPI) on `http://127.0.0.1:8000`
- Frontend (Vite + React) on `http://127.0.0.1:5173`

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

### 4) Start the Frontend

In terminal 2:

```bash
cd frontend
pnpm dev --host 127.0.0.1 --port 5173
```

Open:

- `http://127.0.0.1:5173`

### 5) Smoke Test the Full Flow

1. Create a device in the UI.
2. Set speed reference and ramp times.
3. Click `Run`.
4. Confirm telemetry changes automatically over time (frequency, voltage, current, speed, torque).
5. Change software configuration `Simulation Step (ms)` and click `Save`.
6. Confirm motor speed chart updates continuously.
7. Click `Stop` and verify values settle.

### 6) Run Backend Tests

```bash
cd backend
../.venv/bin/python -m pytest -q
```

## Notes

- The backend now runs simulation continuously in a background loop.
- The frontend currently uses periodic REST polling for live updates.
- WebSocket telemetry is still planned as a future improvement.
