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

OPC UA supports two flows:

- **Command input (OPC UA -> simulator runtime):** when a device is in `remote` mode, the backend reads mapped nodes (`speed_reference_node_id`, `run_stop_node_id`) before each simulation step.
- **Telemetry output (simulator -> OPC UA):** when telemetry mappings exist in `opcua_mapping.telemetry_node_ids`, the backend writes mapped telemetry values on each simulation tick.

The simulation loop runs `_apply_opcua_inputs()` before each physics step:

1. For every device in `remote` mode, check whether OPC UA is ready (enabled + endpoint + at least one node mapped).
2. If not ready → set device to fault 2001 (remote unconfigured).
3. If ready → read the mapped nodes and update `runtime` via the device registry.
4. Run the physics step for all devices.
5. Publish mapped telemetry values to OPC UA nodes (best effort per node).

Devices in `local` mode are never touched by the OPC UA polling loop.

Telemetry publication is independent of `local`/`remote` mode. If OPC UA is configured and telemetry nodes are mapped, telemetry writes are attempted each tick.

### OPC UA Variable Explorer

The frontend variable explorer refreshes from root node `i=84`, recursively traverses the address space, and keeps only `NodeClass.Variable` entries.

Each listed entry includes:

- `node_id`
- `display_name`
- `node_class`
- `data_type` (when available)

This browsed catalog is held in frontend session state only and is not persisted into project files.
