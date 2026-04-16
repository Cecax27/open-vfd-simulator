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

## OPC UA Integration

OPC UA acts as an **external command source**, not a telemetry output. When a device is set to `remote` operation mode, the simulation loop reads the OPC UA nodes mapped on that device at every tick and applies the received values (speed reference and run/stop) to the device runtime. The external system is the authority; the simulator follows.

The simulation loop runs `_apply_opcua_inputs()` before each physics step:

1. For every device in `remote` mode, check whether OPC UA is ready (enabled + endpoint + at least one node mapped).
2. If not ready → set device to fault 2001 (remote unconfigured).
3. If ready → read the mapped nodes and update `runtime` via the device registry.
4. Run the physics step for all devices.

Devices in `local` mode are never touched by the OPC UA polling loop.
