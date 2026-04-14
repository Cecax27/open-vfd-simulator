# Project File Format

Open VFD Simulator project files use the `.ovfd` extension and store JSON content.

## Purpose

A project file captures enough data to restore the workspace state:

- Project metadata
- Program configuration
- Device list
- Device runtime configuration

## Current Schema (v1)

```json
{
  "formatVersion": 1,
  "projectName": "My VFD Lab",
  "language": "en",
  "softwareConfiguration": {
    "simulation_step_ms": 100
  },
  "devices": [
    {
      "name": "Drive 1",
      "template_key": "im_3ph_basic",
      "motor": {
        "rated_power_w": 500,
        "rated_voltage_v": 230,
        "rated_current_a": 3.5,
        "rated_frequency_hz": 50,
        "rated_speed_rpm": 1450,
        "pole_pairs": 2,
        "stator_resistance_ohm": 5.1,
        "rotor_resistance_ohm": 4.8,
        "stator_inductance_h": 0.18,
        "rotor_inductance_h": 0.18,
        "mutual_inductance_h": 0.158,
        "inertia_kgm2": 0.0075,
        "friction_coefficient": 0.01
      },
      "load": {
        "load_type": "constant_torque",
        "nominal_load_torque_nm": 2,
        "load_inertia_kgm2": 0.005
      },
      "runtime": {
        "speed_reference_pct": 0,
        "acceleration_time_s": 5,
        "deceleration_time_s": 5,
        "status": "stopped"
      }
    }
  ]
}
```

## Load Strategy

When opening a project:

1. Existing backend devices are cleared.
2. Software configuration is applied.
3. Devices are recreated from saved definitions.
4. Runtime configuration is applied per device.

## Notes

- Telemetry history is not persisted in v1.
- Future schema updates should increment `formatVersion`.
- Project files are written atomically (temporary file then rename) to reduce risk of partial JSON files.
