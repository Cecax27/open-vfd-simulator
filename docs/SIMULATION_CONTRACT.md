# Simulation Contract

## Runtime Control Parameters

- Run or stop command
- Speed reference in percent
- Acceleration time in seconds
- Deceleration time in seconds
- Fault reset

The initial backend implementation applies these controls through a basic V/Hz-style simulator. Speed reference drives target frequency, acceleration and deceleration times limit the rate of change, and the resulting frequency drives output voltage, motor speed response, torque, current, and a simple temperature estimate.

## Persisted Device Parameters

- Device name
- Motor rated power, voltage, current, frequency, speed
- Pole pairs
- Stator and rotor resistance
- Stator, rotor, and mutual inductance
- Motor inertia and friction
- Load type, nominal load torque, and load inertia

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
- `POST /api/devices/{device_id}/step`: advance the simulation by a provided time delta
