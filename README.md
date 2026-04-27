<img width="2765" height="600" alt="OpenVFD logo" src="https://github.com/user-attachments/assets/5645fdbc-a8a0-4dd3-9479-2172c2b366b1" />

An open-source simulator for industrial variable frequency drives. The project is intended as an educational platform where users can change the basic parameters of a VFD, observe how the drive responds, and inspect how those changes affect motor behavior.

The desktop application is designed around an Electron + React UI and a Python backend. The simulation layer is being prepared to integrate **motulator** as the motor and drive simulation engine.

## Current Status

Stable version 1.0.0 is in progress. Actually, OpenVFD has this features:

- Model for vfd and motor simulation.
- Multi-device simulation
- Communication OpcUA (as client) to control devices.
- Send telemetry by OpcUA.
- Local projects files management.

## MVP Scope

- Suport for multiple VFD and motor models
- Multiple device instances in the same project
- Modbus and OPC UA exposure for the simulated state
- English documentation and bilingual UI support

## Repository Layout

```
backend/    Python backend, API, domain models, simulation adapters
frontend/   Electron + React desktop application
docs/       Architecture, development, and simulation documentation
```

## Planned Architecture

```
Electron + React UI
        |
 REST + WebSocket API
        |
   Python backend
   |- Device registry
   |- VFD control model
   |- Motor simulation adapter
   |- Modbus server
   `- OPC UA server
```

## Project Persistence

Projects are saved to local `.ovfd` files through Electron dialogs.

Saved project data includes:

- Project name
- Language
- Software configuration (simulation step)
- Device definitions and runtime configuration

## Roadmap

[Project board](https://github.com/users/Cecax27/projects/4)

## Development

See `docs/` for implementation details. For local startup instructions (backend + frontend + electron), use:

- `docs/DEVELOPMENT.md` -> "Run Locally (Backend + Frontend)"
- `docs/DEVELOPMENT.md` -> "Build for Ubuntu and Windows"
- `docs/PROJECT_FORMAT.md` -> project save file structure
