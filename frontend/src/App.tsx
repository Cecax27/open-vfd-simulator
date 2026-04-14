import { FormEvent, useEffect, useState } from "react";

import { DeviceRecord, createDevice, listDevices, stepDevice, updateRuntime } from "./api";

export function App() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [speedReferencePct, setSpeedReferencePct] = useState(50);
  const [accelerationTimeS, setAccelerationTimeS] = useState(5);
  const [decelerationTimeS, setDecelerationTimeS] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  useEffect(() => {
    void refreshDevices();
  }, []);

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    setSpeedReferencePct(selectedDevice.runtime.speed_reference_pct);
    setAccelerationTimeS(selectedDevice.runtime.acceleration_time_s);
    setDecelerationTimeS(selectedDevice.runtime.deceleration_time_s);
  }, [selectedDevice]);

  async function refreshDevices() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextDevices = await listDevices();
      setDevices(nextDevices);
      setSelectedDeviceId((currentId) => currentId ?? nextDevices[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateDevice() {
    setIsMutating(true);
    setErrorMessage(null);

    try {
      const device = await createDevice(`Drive ${devices.length + 1}`);
      setDevices((currentDevices) => [...currentDevices, device]);
      setSelectedDeviceId(device.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create device");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleApplyRuntime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDevice) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const updatedDevice = await updateRuntime(selectedDevice.id, {
        speed_reference_pct: speedReferencePct,
        acceleration_time_s: accelerationTimeS,
        deceleration_time_s: decelerationTimeS,
      });
      replaceDevice(updatedDevice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update runtime");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCommand(status: "running" | "stopped") {
    if (!selectedDevice) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const updatedDevice = await updateRuntime(selectedDevice.id, { status });
      replaceDevice(updatedDevice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to change device state");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleFaultReset() {
    if (!selectedDevice) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const updatedDevice = await updateRuntime(selectedDevice.id, { fault_reset: true });
      replaceDevice(updatedDevice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reset fault");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleStep() {
    if (!selectedDevice) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);

    try {
      const steppedDevice = await stepDevice(selectedDevice.id, 0.25);
      replaceDevice(steppedDevice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to step simulation");
    } finally {
      setIsMutating(false);
    }
  }

  function replaceDevice(nextDevice: DeviceRecord) {
    setDevices((currentDevices) =>
      currentDevices.map((device) => (device.id === nextDevice.id ? nextDevice : device)),
    );
  }

  const telemetry = selectedDevice
    ? [
        { label: "Status", value: selectedDevice.runtime.status },
        { label: "Fault Code", value: String(selectedDevice.telemetry.fault_code) },
        {
          label: "Cmd Freq",
          value: `${selectedDevice.telemetry.commanded_frequency_hz.toFixed(1)} Hz`,
        },
        {
          label: "Out Freq",
          value: `${selectedDevice.telemetry.output_frequency_hz.toFixed(1)} Hz`,
        },
        {
          label: "Out Voltage",
          value: `${selectedDevice.telemetry.output_voltage_v.toFixed(1)} V`,
        },
        {
          label: "Out Current",
          value: `${selectedDevice.telemetry.output_current_a.toFixed(2)} A`,
        },
        { label: "Motor Speed", value: `${selectedDevice.telemetry.speed_rpm.toFixed(0)} rpm` },
        {
          label: "Torque",
          value: `${selectedDevice.telemetry.electromagnetic_torque_nm.toFixed(2)} Nm`,
        },
        {
          label: "Load Torque",
          value: `${selectedDevice.telemetry.load_torque_nm.toFixed(2)} Nm`,
        },
        {
          label: "Power",
          value: `${selectedDevice.telemetry.mechanical_power_w.toFixed(1)} W`,
        },
      ]
    : [];

  return (
    <main className="layout">
      <section className="hero">
        <p className="eyebrow">Open VFD Simulator</p>
        <h1>Desktop simulator scaffold for VFD and motor behavior.</h1>
        <p className="summary">
          The first connected UI can create device instances, update basic VFD runtime
          parameters, and manually advance the backend simulation.
        </p>
      </section>

      <section className="toolbar panel">
        <div>
          <h2>Project Devices</h2>
          <p className="caption">One device model, many instances.</p>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => void refreshDevices()} disabled={isLoading || isMutating}>
            Refresh
          </button>
          <button onClick={() => void handleCreateDevice()} disabled={isMutating}>
            Create Device
          </button>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Device List</h2>
          {isLoading ? <p className="caption">Loading devices...</p> : null}
          {!isLoading && devices.length === 0 ? (
            <p className="caption">No devices yet. Create the first one to start testing.</p>
          ) : null}
          <div className="device-list">
            {devices.map((device) => (
              <button
                key={device.id}
                className={device.id === selectedDeviceId ? "device-card selected" : "device-card"}
                onClick={() => setSelectedDeviceId(device.id)}
              >
                <strong>{device.name}</strong>
                <span>{device.runtime.status}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Runtime Controls</h2>
          {selectedDevice ? (
            <form className="control-form" onSubmit={handleApplyRuntime}>
              <label>
                <span>Speed Reference (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={speedReferencePct}
                  onChange={(event) => setSpeedReferencePct(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Acceleration (s)</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={accelerationTimeS}
                  onChange={(event) => setAccelerationTimeS(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Deceleration (s)</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={decelerationTimeS}
                  onChange={(event) => setDecelerationTimeS(Number(event.target.value))}
                />
              </label>
              <div className="button-row">
                <button type="submit" disabled={isMutating}>
                  Apply
                </button>
                <button type="button" onClick={() => void handleCommand("running")} disabled={isMutating}>
                  Run
                </button>
                <button type="button" onClick={() => void handleCommand("stopped")} disabled={isMutating}>
                  Stop
                </button>
                <button type="button" onClick={() => void handleStep()} disabled={isMutating}>
                  Step +0.25s
                </button>
                <button type="button" onClick={() => void handleFaultReset()} disabled={isMutating}>
                  Reset Fault
                </button>
              </div>
            </form>
          ) : (
            <p className="caption">Select a device to edit its runtime state.</p>
          )}
        </article>

        <article className="panel telemetry-panel">
          <h2>Basic Telemetry</h2>
          {selectedDevice ? (
            <ul>
              {telemetry.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="caption">Telemetry appears after selecting a device.</p>
          )}
        </article>
      </section>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
    </main>
  );
}
