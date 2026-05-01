# AGENTS.md — Open VFD Simulator

## What this is

Two-process desktop app: a **Python/FastAPI backend** (simulation engine + REST API) and an **Electron/React/TypeScript frontend**. They communicate over `http://127.0.0.1:8000`. OPC UA integration is optional.

Docs worth reading: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/SIMULATION_CONTRACT.md`.

---

## Layout

```
.venv/                  # Python virtualenv — lives at REPO ROOT, not inside backend/
backend/
  src/open_vfd_simulator_backend/   # importable package (src-layout)
    main.py             # FastAPI app + run() entrypoint
    api/app.py          # FastAPI factory (CORS, lifespan, routers)
    domain/models.py    # all Pydantic models
    services/           # device_registry, simulation_runtime, opcua_client_service (singletons)
    simulation/         # basic_vfd.py (current V/Hz engine) + contracts.py (adapter boundary)
  tests/
    conftest.py         # injects backend/src/ into sys.path
    test_api.py         # all current tests
frontend/
  electron/main.mjs     # Electron main process — spawns backend, registers IPC
  electron/preload.cjs  # contextBridge → window.openVfd
  src/
    App.tsx             # BrowserRouter (dev) / HashRouter (file://) — auto-detected at runtime
    api.ts              # all REST calls; API_BASE_URL hardcoded to http://127.0.0.1:8000
    context/AppContext.tsx  # single global state machine; 350ms polling for telemetry
    types.ts            # .ovfd schema (formatVersion: 1), localStorage helpers
    locales/en.json, es.json  # all UI strings (both files must stay in sync)
```

---

## Install

```bash
# Python — run from backend/, virtualenv is at repo root
cd backend && ../.venv/bin/pip install -e .[dev]

# Node — pnpm ONLY (npm/yarn break the lockfile)
cd frontend && pnpm install
```

If `pnpm install` stalls on Electron download:
```bash
cd frontend && node node_modules/electron/install.js
# or: pnpm approve-builds
```

---

## Run (development)

`pnpm dev:electron` **auto-spawns the backend** via `startBackend()` in `electron/main.mjs`. It polls `/health` every 200ms (30-second timeout). Starting the backend separately first is fine — the health-check polling makes it resilient — but starting two backend processes risks a port 8000 conflict.

```bash
# Let Electron manage everything:
cd frontend && pnpm dev:electron

# Or split terminals:
# Terminal 1 — backend
cd backend && ../.venv/bin/python -m uvicorn open_vfd_simulator_backend.main:app \
  --app-dir src --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Electron (will detect backend already running)
cd frontend && pnpm dev:electron

# Browser-only (no Electron IPC — project open/save will error)
cd frontend && pnpm dev:web   # http://127.0.0.1:5173
```

---

## Test

```bash
# All backend tests (from backend/)
../.venv/bin/python -m pytest -q

# Single test
../.venv/bin/python -m pytest tests/test_api.py::test_create_device -v

# By keyword
../.venv/bin/python -m pytest -k "fault_reset" -v
```

**Testing quirks:**
- Tests use FastAPI `TestClient` — no real server started; lifespan runs on `TestClient` init.
- `device_registry` and `simulation_runtime` are **module-level singletons shared across all tests**. Test order matters. Only `test_reset_devices` (calls `DELETE /api/devices/reset`) cleans up state.
- OPC UA tests mock `opcua_client_service.write` with `try/finally` — no real OPC UA server needed.
- Some async service methods are invoked with `asyncio.run(...)` inside sync test functions.
- **No frontend test runner exists** — there is no `pnpm test` script and no Vitest/Jest config.

---

## Lint / typecheck

```bash
# Backend (Ruff) — line-length 100, target py311
cd backend
../.venv/bin/python -m ruff check src/ tests/
../.venv/bin/python -m ruff format src/ tests/

# Frontend TypeScript — strict: true
cd frontend && pnpm exec tsc --noEmit
```

---

## Build

```bash
cd frontend
pnpm build               # tsc + vite → frontend/dist/ (no Electron packaging)
pnpm run build:electron  # full AppImage/NSIS distribution
```

---

## Critical gotchas

| Mistake | Correct behavior |
|---|---|
| Running uvicorn without `--app-dir src` | Backend package is `src`-layout — Python won't find it without the flag |
| Using `.venv` inside `backend/` | The virtualenv lives at **repo root** (`open-vfd-simulator/.venv`) |
| Using `npm` or `yarn` for frontend | Only `pnpm` — `pnpm-workspace.yaml` is present |
| Changing `vite.config.ts` `base` to `"/"` | Must stay `"./"` — Electron loads `dist/index.html` via `file://` |
| Calling `window.openVfd` without a guard | It is `undefined` in browser dev mode (no preload); existing code guards with `if (!window.openVfd)` |
| Expecting fault 2001 on `operation_mode: remote` PATCH | Fault fires on the *next simulation tick*, not immediately — test by calling `asyncio.run(simulation_runtime._apply_opcua_inputs())` |
| Assuming REST PATCH to `/runtime` persists in remote mode | OPC UA inputs overwrite values on every tick |
| Expecting WebSocket telemetry | Not implemented — UI polls REST at 350ms intervals |

---

## Key constraints

- **Only one device template:** `im_3ph_basic` — all devices must use this `template_key`.
- **API base URL is hardcoded** in `frontend/src/api.ts`. No `.env` mechanism exists.
- **CORS whitelist** in `backend/src/.../api/app.py` allows only `127.0.0.1:5173` and `localhost:5173`. Update it if moving the Vite dev server port.
- **`.ovfd` files** are JSON with `formatVersion: 1`. No auto-migration logic exists.
- **Bilingual UI (en/es):** Every UI string must have entries in both `locales/en.json` and `locales/es.json`.
- **`.obsidian/`** at repo root is a personal notes vault — not part of the application.
- **No CI exists** — all checks are manual.
