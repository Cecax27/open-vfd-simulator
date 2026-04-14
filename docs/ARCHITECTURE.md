# Architecture

## Overview

The project is structured as a desktop application with a local backend.

```
Electron + React UI
        |
 REST + WebSocket API
        |
   Python backend
   |- API layer
   |- Device registry
   |- Simulation adapters
   |- Protocol adapters
   `- Persistence
```

## MVP Decisions

- One motor and VFD model for the first release
- Multiple device instances per project
- One canonical device state shared by UI, protocols, and persistence
- motulator integrated behind an internal simulation adapter

## Initial Backend Modules

- `api/`: HTTP and WebSocket surface
- `domain/`: device, runtime, and telemetry models
- `services/`: registry and orchestration services
- `simulation/`: adapter boundary for the physics engine
