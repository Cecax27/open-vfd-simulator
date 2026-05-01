# Catalog Format — Motor and VFD Models

Open VFD Simulator ships with built-in motor and VFD models and is designed so that anyone can contribute new ones without modifying the Python package. This document covers the full YAML schema for both model types, how thumbnails work, and how to add your own models.

---

## Table of contents

1. [Overview](#overview)
2. [Motor model YAML schema](#motor-model-yaml-schema)
3. [VFD model YAML schema](#vfd-model-yaml-schema)
4. [Control strategies](#control-strategies)
5. [Adding a built-in model (via pull request)](#adding-a-built-in-model-via-pull-request)
6. [Adding a user model without modifying the package](#adding-a-user-model-without-modifying-the-package)
7. [Thumbnail guidelines](#thumbnail-guidelines)
8. [Estimating simulation parameters from nameplate data](#estimating-simulation-parameters-from-nameplate-data)

---

## Overview

Model definitions live in YAML files under two subdirectories:

```
backend/src/open_vfd_simulator_backend/catalogs/
  motors/
    generic.yaml          ← built-in generic motors
    thumbnails/
      *.png / *.webp      ← one image per motor entry
  vfds/
    generic.yaml          ← built-in generic VFDs
    thumbnails/
      *.png / *.webp      ← one image per VFD entry
```

The catalog service loads all `*.yaml` / `*.yml` files found directly inside `motors/` and `vfds/` at startup. Each file can contain any number of entries under a top-level `motors:` or `vfds:` list.

**Relationship to IEC 60034-1**

Motor models include both the standardized IEC 60034-1 nameplate fields (the data printed on the motor's rating plate) and the additional electrical parameters needed to run the physics simulation. Not all nameplate fields affect the simulation directly — `ip_protection`, `thermal_class`, `mounting`, and `efficiency_class` are stored for display and documentation purposes only.

**Relationship to device creation**

When a user creates a device with `motor_model_id`, the catalog entry's parameters are used to pre-populate the device's `motor` block. The user can still override individual fields afterward. The `motor_model_id` is stored on the device as a non-binding reference — changing it later does not retroactively update existing parameter values.

When `vfd_model_id` is provided, `template_key` (the simulation engine selector) is automatically derived from the VFD model's `control_strategy`.

---

## Motor model YAML schema

A motor catalog file must have a top-level `motors:` key containing a list of entries. Each entry has the following fields:

```yaml
motors:
  - id: "string"           # required — unique identifier across all catalog files
    name: "string"         # required — human-readable display name
    manufacturer: "string" # required — manufacturer name (use "Generic" for reference models)
    thumbnail: "string"    # optional — relative path to the image file (e.g. thumbnails/my_motor.png)

    # ---- IEC 60034-1 nameplate fields ----------------------------------------
    rated_power_kw: float       # required — rated shaft output power in kilowatts (kW)
    rated_voltage_v: float      # required — rated terminal voltage in volts (V)
    rated_frequency_hz: float   # required — rated supply frequency in hertz (Hz)
    rated_current_a: float      # required — rated full-load current in amperes (A)
    rated_speed_rpm: int        # required — rated speed in RPM (synchronous speed at rated slip)
    power_factor: float         # required — full-load power factor (cos φ), range 0 < pf ≤ 1
    ip_protection: "string"     # required — ingress protection code per IEC 60529 (e.g. "IP55")
    thermal_class: "string"     # required — insulation class per IEC 60034-1 (e.g. "F", "H")
    mounting: "string"          # required — mounting code per IEC 60034-7 (e.g. "B3", "B5", "B14")
    efficiency_class: "string"  # optional — IE efficiency class per IEC 60034-30 (e.g. "IE2", "IE3")

    # ---- Simulation parameters -----------------------------------------------
    pole_pairs: int                  # required — number of magnetic pole pairs (e.g. 2 = 4-pole motor)
    stator_resistance_ohm: float     # required — stator winding resistance per phase (Ω)
    rotor_resistance_ohm: float      # required — rotor referred resistance per phase (Ω)
    stator_inductance_h: float       # required — stator leakage inductance per phase (H)
    rotor_inductance_h: float        # required — rotor leakage inductance per phase (H)
    mutual_inductance_h: float       # required — mutual (magnetising) inductance per phase (H)
    inertia_kgm2: float              # required — total rotor moment of inertia (kg·m²)
    friction_coefficient: float      # required — viscous friction coefficient (N·m·s/rad), ≥ 0
```

### Field reference

| Field | IEC ref | Unit | Simulation impact |
|---|---|---|---|
| `rated_power_kw` | 60034-1 §5.2 | kW | Converted to watts for internal use; informational only for the V/Hz engine |
| `rated_voltage_v` | 60034-1 §5.2 | V | Sets the V/Hz base voltage (V_rated); output voltage is capped at this value |
| `rated_frequency_hz` | 60034-1 §5.2 | Hz | V/Hz base frequency; commanded frequency is expressed as a % of this |
| `rated_current_a` | 60034-1 §5.2 | A | Overcurrent fault threshold is 2 × rated current |
| `rated_speed_rpm` | 60034-1 §5.2 | RPM | Informational; synchronous speed is derived from `pole_pairs` |
| `power_factor` | 60034-1 §5.2 | — | Display/documentation only; not used by the V/Hz engine |
| `ip_protection` | 60034-5 | — | Display/documentation only |
| `thermal_class` | 60034-1 §6.2 | — | Display/documentation only |
| `mounting` | 60034-7 | — | Display/documentation only |
| `efficiency_class` | 60034-30 | — | Display/documentation only |
| `pole_pairs` | — | — | Determines synchronous speed and torque constant |
| `stator_resistance_ohm` | — | Ω | Copper loss, magnetising current calculation |
| `rotor_resistance_ohm` | — | Ω | Rotor copper loss, slip torque calculation |
| `stator_inductance_h` | — | H | Leakage reactance, current dynamics |
| `rotor_inductance_h` | — | H | Leakage reactance, current dynamics |
| `mutual_inductance_h` | — | H | Magnetising branch; affects rated torque calculation |
| `inertia_kgm2` | — | kg·m² | Rotational inertia; affects speed ramp dynamics |
| `friction_coefficient` | — | N·m·s/rad | Viscous drag; affects no-load steady-state speed |

### Example

```yaml
motors:
  - id: "acme_im3_2.2kw_400v_50hz"
    name: "Acme IM3 2.2 kW 400 V 50 Hz"
    manufacturer: "Acme Motors"
    thumbnail: "thumbnails/acme_im3_2.2kw.png"

    rated_power_kw: 2.2
    rated_voltage_v: 400.0
    rated_frequency_hz: 50.0
    rated_current_a: 5.0
    rated_speed_rpm: 1455
    power_factor: 0.83
    ip_protection: "IP55"
    thermal_class: "F"
    mounting: "B3"
    efficiency_class: "IE3"

    pole_pairs: 2
    stator_resistance_ohm: 2.50
    rotor_resistance_ohm: 1.60
    stator_inductance_h: 0.150
    rotor_inductance_h: 0.150
    mutual_inductance_h: 0.140
    inertia_kgm2: 0.0085
    friction_coefficient: 0.012
```

---

## VFD model YAML schema

A VFD catalog file must have a top-level `vfds:` key containing a list of entries.

```yaml
vfds:
  - id: "string"           # required — unique identifier
    name: "string"         # required — human-readable display name
    manufacturer: "string" # required
    thumbnail: "string"    # optional — relative path to image (e.g. thumbnails/my_vfd.png)

    # ---- Nameplate fields --------------------------------------------------------
    rated_input_voltage_v: float      # required — rated AC input voltage (V)
    rated_output_voltage_v: float     # required — rated AC output voltage (V)
    rated_output_current_a: float     # required — rated continuous output current (A)
    max_output_frequency_hz: float    # required — maximum output frequency (Hz)
    min_output_frequency_hz: float    # required — minimum output frequency (Hz), ≥ 0
    ip_protection: "string"           # required — e.g. "IP20", "IP55"

    # ---- Control / simulation ---------------------------------------------------
    control_strategy: "string"        # required — see Control strategies section
    simulation_params: {}             # optional — strategy-specific parameters (empty for v_hz)
```

### Field reference

| Field | Unit | Notes |
|---|---|---|
| `rated_input_voltage_v` | V | Informational; not used by the current simulation |
| `rated_output_voltage_v` | V | Informational; the motor model's `rated_voltage_v` governs the V/Hz ratio |
| `rated_output_current_a` | A | Informational; overcurrent faults are governed by motor's `rated_current_a` |
| `max_output_frequency_hz` | Hz | Informational in V/Hz mode; will be enforced as an upper clamp in future strategies |
| `min_output_frequency_hz` | Hz | Informational in V/Hz mode |
| `ip_protection` | — | Display only |
| `control_strategy` | — | Maps to a simulation engine; see below |
| `simulation_params` | — | Reserved for future use; pass `{}` for `v_hz` |

### Example

```yaml
vfds:
  - id: "acme_avfd_5.5kw_400v"
    name: "Acme AVFD 5.5 kW 400 V"
    manufacturer: "Acme Drives"
    thumbnail: "thumbnails/acme_avfd_5.5kw.png"

    rated_input_voltage_v: 400.0
    rated_output_voltage_v: 400.0
    rated_output_current_a: 13.0
    max_output_frequency_hz: 400.0
    min_output_frequency_hz: 0.5
    ip_protection: "IP20"

    control_strategy: "v_hz"
    simulation_params: {}
```

---

## Control strategies

The `control_strategy` field determines which physics engine the backend uses when a device is created with this VFD model. It also sets `template_key` on the resulting `DeviceRecord`.

| Value | Description | Simulation engine | `template_key` |
|---|---|---|---|
| `v_hz` | Scalar V/Hz (volts-per-hertz) control | `BasicVFDSimulator` | `im_3ph_basic` |

Future strategies (such as `foc` for field-oriented control or `dtc` for direct torque control) will be added as new simulation adapters are implemented. Adding a new strategy requires:

1. Implementing a new simulation adapter class in `backend/src/.../simulation/`.
2. Registering the new `template_key` mapping in `CONTROL_STRATEGY_TO_TEMPLATE_KEY` in `domain/models.py`.
3. Adding the new strategy value to the `VFDControlStrategy` enum.
4. Wiring the new adapter into the device registry's step logic (currently `device_registry.py` delegates to `simulator.step()`; a dispatch table keyed on `template_key` will be introduced when a second strategy lands).

---

## Adding a built-in model (via pull request)

1. **Fork the repository** and create a feature branch.

2. **Choose the right file** — add your entry to an existing YAML file (e.g. `motors/generic.yaml`) or create a new file under `catalogs/motors/` or `catalogs/vfds/`. The service loads all `*.yaml` files in those directories automatically.

3. **Choose a unique ID** — IDs must be unique across all catalog files. Use the convention:

   ```
   {manufacturer_slug}_{series}_{power}_{voltage}_{freq}
   ```

   Examples: `weg_w22_0.75kw_220v_60hz`, `abb_m3aa_11kw_400v_50hz`

4. **Add a thumbnail** (optional but recommended) — place a PNG or WebP file in the `thumbnails/` subdirectory next to the YAML file, then reference it with the `thumbnail` field:

   ```yaml
   thumbnail: "thumbnails/weg_w22_0.75kw_220v_60hz.png"
   ```

5. **Run the tests** — all tests must pass:

   ```bash
   cd backend
   ../.venv/bin/python -m pytest -q
   ```

6. **Run the linter**:

   ```bash
   ../.venv/bin/python -m ruff check src/ tests/
   ```

7. **Open a pull request** describing the motor/VFD being added, its source of parameters (datasheet, measurement, estimation), and any caveats.

---

## Adding a user model without modifying the package

Set the `OPEN_VFD_CATALOG_DIR` environment variable to a directory on your machine before starting the backend. The catalog service will load any YAML files found in `{OPEN_VFD_CATALOG_DIR}/motors/` and `{OPEN_VFD_CATALOG_DIR}/vfds/` in addition to the built-in files.

```
$HOME/my-vfd-models/
  motors/
    my_company.yaml
    thumbnails/
      my_motor_model_a.png
  vfds/
    my_company.yaml
    thumbnails/
      my_vfd_model_x.png
```

Start the backend with the variable set:

```bash
OPEN_VFD_CATALOG_DIR="$HOME/my-vfd-models" \
  .venv/bin/python -m uvicorn open_vfd_simulator_backend.main:app \
    --app-dir backend/src --host 127.0.0.1 --port 8000
```

Or when using the Electron launcher, set `OPEN_VFD_CATALOG_DIR` in the shell environment before starting the app.

**ID collision rules** — if a user-directory entry has the same `id` as a built-in entry, the user entry **overrides** the built-in and a warning is logged. This allows patching a built-in model without touching the source code.

---

## Thumbnail guidelines

- **Preferred format:** PNG for diagrams and illustrations; WebP for photographs.
- **Recommended size:** 200 × 200 px minimum; 400 × 400 px for crisp display on high-DPI screens.
- **Background:** transparent or white. Avoid dark backgrounds — the UI may display thumbnails on either a light or dark surface.
- **File size:** keep under 100 KB per thumbnail. The catalog endpoint serves images directly over the REST API.
- **Naming:** use the motor/VFD ID as the filename base to make the relationship obvious:

  ```
  thumbnails/weg_w22_0.75kw_220v_60hz.png
  ```

---

## Estimating simulation parameters from nameplate data

When manufacturer test-report data is unavailable, the following empirical guidelines can be used as starting points. All values should be verified against actual hardware measurements when precision matters.

### Pole pairs

```
pole_pairs = round(60 * rated_frequency_hz / rated_speed_rpm)
```

A 4-pole 50 Hz motor runs at ~1450 RPM → `round(60 × 50 / 1450) = 2`.

### Stator resistance (`stator_resistance_ohm`)

For a line-to-neutral resistance measured by DC injection (divide line-to-line Ω by 2 for star connection):

```
R_s ≈ 0.01 × (V_rated² / P_rated)   [rough rule of thumb]
```

Small motors (< 1 kW) tend toward 2–10 Ω; large motors (> 10 kW) toward 0.1–1 Ω.

### Rotor resistance (`rotor_resistance_ohm`)

A reasonable starting estimate is `R_r ≈ 0.8 × R_s`. For more accuracy, use the motor's nameplate slip:

```
slip = (synchronous_speed - rated_speed_rpm) / synchronous_speed
R_r ≈ slip × (V_rated / (√3 × rated_current_a))²  /  (rated_speed_rpm / synchronous_speed)
```

### Stator and rotor inductances

Leakage inductances are typically 3–8 % of the magnetising inductance. As an initial estimate:

```
L_sigma ≈ 0.05 × L_m
L_s ≈ L_r ≈ L_m + L_sigma
```

### Magnetising inductance (`mutual_inductance_h`)

```
L_m ≈ (V_rated / (√3 × 2π × rated_frequency_hz × I_no_load))
```

`I_no_load` is roughly 30–50 % of rated current for small motors and 20–35 % for large motors.

### Moment of inertia (`inertia_kgm2`)

Motor manufacturer catalogs usually publish `GD²` (flywheel effect) in kg·m²:

```
J = GD² / 4
```

If not available, use empirical regression for squirrel-cage motors:

```
J ≈ 0.04 × (P_rated / 1000) ^ 0.75   [P in watts]
```

### Friction coefficient (`friction_coefficient`)

For a first approximation, set friction to account for 1–3 % of rated torque at rated speed:

```
T_friction ≈ 0.02 × rated_torque
friction_coefficient = T_friction / (2π × rated_speed_rpm / 60)
```

A value between 0.005 and 0.05 covers most small-to-medium industrial motors.
