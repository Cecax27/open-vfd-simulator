# Open VFD Simulator

An open-source simulator for industrial variable frequency drives. The project is intended as an educational platform where users can change the basic parameters of a VFD, observe how the drive responds, and inspect how those changes affect motor behavior.

The desktop application is designed around an Electron + React UI and a Python backend. The simulation layer is being prepared to integrate motulator as the motor and drive simulation engine.

## MVP Scope

- One VFD and motor model
- Multiple device instances in the same project
- Python backend with REST + WebSocket API
- Electron desktop app with React
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

## Current Status

Initial project scaffolding is in progress. The first implementation milestone establishes:

- Backend domain model for devices and simulation state
- API endpoints for device management
- Simulation adapter contracts for motulator integration
- Electron + React application shell with project menu and page navigation
- Core architecture and development documentation

## UI Flow

- Home page: default startup screen with recent projects and quick actions.
- Devices page: initial project view to list and create devices.
- Device configuration page: opened when creating or selecting a device.
- Program settings page: software configuration (simulation step) and language.
- Motor speed chart: live trend for selected device.
- Project menu: New, Open, Save, Save As, Close Project.

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
- `docs/PROJECT_FORMAT.md` -> project save file structure
