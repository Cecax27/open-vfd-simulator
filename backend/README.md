# Backend

The backend hosts the API, device registry, simulation contracts, and protocol integrations for the Open VFD Simulator.

## Initial Scope

- FastAPI application
- Device CRUD endpoints
- In-memory device registry
- Simulation adapter contract for future motulator integration

## Run

```bash
uvicorn open_vfd_simulator_backend.main:app --app-dir src --reload
```
