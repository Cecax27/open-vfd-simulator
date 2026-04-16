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

## Device Parameter Reference

This section explains every configurable parameter of a device, including units and its effect on simulation behavior.

### Identification

| Parameter | Backend key | Meaning |
|---|---|---|
| Device name | `name` | Human-readable label used in the UI and project file. |
| Template key | `template_key` | Internal profile identifier. Current MVP uses `im_3ph_basic`. |

### Runtime Control Parameters

| Parameter | Backend key | Unit | Meaning and effect |
|---|---|---|---|
| Speed reference | `runtime.speed_reference_pct` | % (0-100) | Target speed command. It is converted to target electrical frequency using motor rated frequency. |
| Acceleration time | `runtime.acceleration_time_s` | s | Ramp-up time to reach rated frequency. Lower value = faster frequency increase. |
| Deceleration time | `runtime.deceleration_time_s` | s | Ramp-down time to return to zero frequency. Lower value = faster decrease. |
| Run/Stop status | `runtime.status` | enum | Command state (`running`, `stopped`, `fault`). In `fault`, output variables are forced to zero. |
| Operation mode | `runtime.operation_mode` | enum | `local` uses REST runtime commands, `remote` reads runtime commands from mapped OPC UA nodes. |
| Fault reset | `fault_reset` (runtime patch field) | bool | Clears active fault state when allowed by fault-recovery rules. |

### Motor Parameters

| Parameter | Backend key | Unit | Meaning and effect |
|---|---|---|---|
| Rated power | `motor.rated_power_w` | W | Nominal mechanical/electrical power base used by torque and current estimations. |
| Rated voltage | `motor.rated_voltage_v` | V | Voltage base used by V/Hz output voltage scaling. |
| Rated current | `motor.rated_current_a` | A | Current base used by current estimate and overcurrent protection threshold. |
| Rated frequency | `motor.rated_frequency_hz` | Hz | Frequency base for V/Hz control and ramp-rate calculations. |
| Rated speed | `motor.rated_speed_rpm` | rpm | Mechanical speed base used by torque-speed relationships. |
| Pole pairs | `motor.pole_pairs` | count | Motor electrical/mechanical relationship parameter (reserved for expanded models). |
| Stator resistance | `motor.stator_resistance_ohm` | ohm | Electrical model parameter (reserved for expanded models). |
| Rotor resistance | `motor.rotor_resistance_ohm` | ohm | Electrical model parameter (reserved for expanded models). |
| Stator inductance | `motor.stator_inductance_h` | H | Electrical model parameter (reserved for expanded models). |
| Rotor inductance | `motor.rotor_inductance_h` | H | Electrical model parameter (reserved for expanded models). |
| Mutual inductance | `motor.mutual_inductance_h` | H | Electrical model parameter (reserved for expanded models). |
| Motor inertia | `motor.inertia_kgm2` | kg*m^2 | Rotational inertia of motor shaft. Higher value = slower acceleration/deceleration response. |
| Friction coefficient | `motor.friction_coefficient` | N*m*s/rad | Mechanical damping term. Higher value increases drag torque and reduces steady-state speed for same torque. |

### Load Parameters

| Parameter | Backend key | Unit | Meaning and effect |
|---|---|---|---|
| Load type | `load.load_type` | enum | `constant_torque` keeps load torque fixed, `fan` scales approximately with speed squared. |
| Nominal load torque | `load.nominal_load_torque_nm` | N*m | Main opposing torque applied by load. Higher value requires more electromagnetic torque and current. |
| Load inertia | `load.load_inertia_kgm2` | kg*m^2 | Inertia contribution of driven system. Higher value slows speed transients. |

### OPC UA Command Mapping Parameters

| Parameter | Backend key | Expected OPC type | Meaning |
|---|---|---|---|
| Speed reference node | `opcua_mapping.speed_reference_node_id` | Float | OPC UA node read in `remote` mode to get speed reference in percent. |
| Run/Stop node | `opcua_mapping.run_stop_node_id` | Boolean | OPC UA node read in `remote` mode to get run/stop command. |

### OPC UA Telemetry Mapping Parameters

| Parameter | Backend key | Expected OPC type | Meaning |
|---|---|---|---|
| Telemetry map | `opcua_mapping.telemetry_node_ids` | dictionary | Key-value mapping from telemetry field key to OPC UA target node id. Only configured keys are written each tick. |

### Torque-Related Variables (important for tuning)

| Variable | Source key | Unit | Interpretation |
|---|---|---|---|
| Electromagnetic torque | `telemetry.electromagnetic_torque_nm` | N*m | Torque generated by motor model from frequency/voltage/speed error behavior. |
| Load torque | `telemetry.load_torque_nm` | N*m | Opposing torque demanded by the configured load model. |
| Nominal load torque parameter | `load.nominal_load_torque_nm` | N*m | User setting that defines baseline load torque level. |

Practical interpretation:

- If electromagnetic torque is below load torque for sustained periods, speed will drop.
- If electromagnetic torque is higher than load torque, speed rises until equilibrium.
- Increasing nominal load torque generally increases required current and thermal stress.

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
