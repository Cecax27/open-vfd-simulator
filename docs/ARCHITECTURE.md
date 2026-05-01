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
   |- Model catalog
   `- Persistence
```

## Backend Modules

- `api/`: HTTP surface — routers for devices, catalog, OPC UA, configuration, health
- `domain/`: device, runtime, telemetry, motor model, and VFD model definitions
- `services/`: registry and orchestration services (device_registry, catalog_service, simulation_runtime, opcua_client, software_configuration)
- `simulation/`: physics engine adapter boundary (BasicVFDSimulator for V/Hz strategy)
- `catalogs/`: built-in YAML model files for motors and VFDs

## Motor and VFD Catalog

The catalog system allows multiple motor and VFD models to be defined, selected when creating a device, and extended by contributors without modifying the Python package.

### Built-in catalog

Built-in models ship as YAML files under `catalogs/motors/` and `catalogs/vfds/`. The `CatalogService` singleton loads them at application startup (lifespan).

### User catalog

Set the `OPEN_VFD_CATALOG_DIR` environment variable to a directory containing `motors/*.yaml` and/or `vfds/*.yaml` files. These are loaded at startup in addition to built-in models. User entries override built-ins with the same `id`.

### Motor models and IEC 60034-1

Each `MotorModel` entry combines IEC 60034-1 nameplate fields (rated power, voltage, frequency, current, speed, power factor, IP protection, thermal class, mounting, efficiency class) with the simulation parameters required by the physics engine (pole pairs, resistances, inductances, inertia, friction coefficient).

### VFD models and control strategies

Each `VFDModel` entry includes nameplate data and a `control_strategy` field that maps to a simulation engine via `CONTROL_STRATEGY_TO_TEMPLATE_KEY`:

| `control_strategy` | `template_key` | Engine |
|---|---|---|
| `v_hz` | `im_3ph_basic` | `BasicVFDSimulator` (scalar V/Hz) |

When a device is created with `vfd_model_id`, the device's `template_key` is set automatically. When `motor_model_id` is provided, motor parameters are pre-populated from the catalog entry.

### Thumbnails

Each catalog entry may reference an optional PNG or WebP thumbnail via a `thumbnail` path relative to the YAML file. The catalog service resolves this path at startup and injects a `thumbnail_url` field (`/api/catalog/motors/{id}/thumbnail` or `/api/catalog/vfds/{id}/thumbnail`) when the file exists on disk.

### Catalog API

```
GET /api/catalog/motors                  → list[MotorModelSummary]
GET /api/catalog/motors/{id}             → MotorModel
GET /api/catalog/motors/{id}/thumbnail   → image/png or image/webp
GET /api/catalog/vfds                    → list[VFDModelSummary]
GET /api/catalog/vfds/{id}               → VFDModel
GET /api/catalog/vfds/{id}/thumbnail     → image/png or image/webp
```

See `docs/CATALOG_FORMAT.md` for the full YAML schema and contribution guide.

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
