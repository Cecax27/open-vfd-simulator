# Simulation Contract

## Runtime Control Parameters

- Run or stop command
- Speed reference in percent
- Acceleration time in seconds
- Deceleration time in seconds
- Fault reset
- Operation mode (`local` or `remote`)

The initial backend implementation applies these controls through a basic V/Hz-style simulator. Speed reference drives target frequency, acceleration and deceleration times limit the rate of change, and the resulting frequency drives output voltage, motor speed response, torque, current, and a simple temperature estimate.

## Operation Mode

Each device has an `operation_mode` field on its `RuntimeCommand`.

### `local` (default)

The device is controlled exclusively through the REST API (`PATCH /api/devices/{device_id}/runtime`). This is the default operating mode and behaves the same as pre-existing REST control.

### `remote`

The device is controlled by an external system via OPC UA. On every simulation tick the backend reads the mapped OPC UA nodes and updates the device runtime accordingly.

In parallel, the simulator can publish telemetry values to OPC UA when telemetry node mappings are configured.

**Requirements for remote mode to function correctly:**

1. OPC UA must be enabled and have a valid `endpoint_url` configured (see `PATCH /api/opcua/configuration`).
2. The device must have at least one node mapped in `opcua_mapping`:
   - `speed_reference_node_id`: the external OPC UA server writes a `float` representing the speed reference in percent (0–100).
   - `run_stop_node_id`: the external OPC UA server writes a `bool` (`true` = running, `false` = stopped).

## OPC UA Telemetry Publishing

Each device may include `opcua_mapping.telemetry_node_ids`, a dictionary where keys are telemetry variable identifiers and values are OPC UA `node_id` targets.

- The simulator writes mapped values on every simulation tick.
- Only mapped keys are written.
- The project file stores only the node mappings selected by the user.
- The OPC UA variable explorer cache is session-local in the frontend and is not persisted in the project file.

### Supported telemetry mapping keys and recommended OPC UA types

- `command_state` -> `String`
- `fault_state` -> `Boolean`
- `fault_code` -> `Int32`
- `commanded_frequency_hz` -> `Float`
- `output_frequency_hz` -> `Float`
- `output_voltage_v` -> `Float`
- `output_current_a` -> `Float`
- `speed_rpm` -> `Float`
- `electromagnetic_torque_nm` -> `Float`
- `load_torque_nm` -> `Float`
- `mechanical_power_w` -> `Float`
- `estimated_temperature_c` -> `Float`

Write errors on individual telemetry nodes are handled as partial failures. The simulation loop continues running and retries on subsequent ticks.

**Fault 2001 — Remote Unconfigured**

If a device is switched to `remote` mode but OPC UA is not ready (disabled, no endpoint, or no nodes mapped on the device), the device immediately transitions to `status: fault` with `fault_code: 2001` on the next simulation tick.

Recovery options:
- Send `PATCH /api/devices/{device_id}/runtime` with `fault_reset: true` after correcting the OPC UA configuration and node mapping.
- Switch the device back to `operation_mode: local` — this automatically clears fault 2001 and sets the status to `stopped`.

**Transient OPC UA failures** (server temporarily unreachable while already connected) do not trigger fault 2001. The device retains its last known runtime state until communication is restored.

**Priority:** In `remote` mode with OPC UA ready, the simulation loop overwrites the runtime on every tick with the values read from the OPC UA server. Manual REST commands are accepted by the API but will be overwritten on the next tick.

## Software Configuration Parameters

- `simulation_step_ms` (default `100`): global simulation step period used by the backend auto-run loop.

The simulation loop runs continuously in the backend. Device telemetry is updated automatically each simulation step.

## Persisted Device Parameters

- Device name
- Motor rated power, voltage, current, frequency, speed
- Pole pairs
- Stator and rotor resistance
- Stator, rotor, and mutual inductance
- Motor inertia and friction
- Load type, nominal load torque, and load inertia
- OPC UA command mapping (`speed_reference_node_id`, `run_stop_node_id`)
- OPC UA telemetry mapping (`telemetry_node_ids`)

## Minimum Telemetry

### VFD

- Command state
- Fault state or fault code
- Commanded frequency
- Output frequency
- Output voltage
- Output current

### Motor

- Actual speed
- Electromagnetic torque
- Load torque
- Mechanical power
- Estimated temperature or flux magnitude

## Current API Shape

- `POST /api/devices`: create a device instance
- `GET /api/devices`: list device instances
- `GET /api/devices/{device_id}`: fetch one device state snapshot
- `PATCH /api/devices/{device_id}`: update persisted device configuration
- `PATCH /api/devices/{device_id}/runtime`: update runtime command state
- `GET /api/configuration`: fetch software configuration
- `PATCH /api/configuration`: update software configuration (includes `simulation_step_ms`)
- `POST /api/devices/{device_id}/step`: advance the simulation by a provided time delta

`POST /api/devices/{device_id}/step` remains available as an auxiliary endpoint, but the UI no longer depends on manual stepping for normal operation.
