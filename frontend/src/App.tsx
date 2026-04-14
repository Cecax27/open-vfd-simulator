import { FormEvent, useEffect, useState } from "react";

import {
  DeviceRecord,
  SoftwareConfiguration,
  createDevice,
  getDevice,
  getSoftwareConfiguration,
  listDevices,
  updateRuntime,
  updateSoftwareConfiguration,
} from "./api";

type SpeedSample = {
  timeMs: number;
  speedRpm: number;
};

const MAX_CHART_SAMPLES = 80;

export function App() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [speedReferencePct, setSpeedReferencePct] = useState(50);
  const [accelerationTimeS, setAccelerationTimeS] = useState(5);
  const [decelerationTimeS, setDecelerationTimeS] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speedHistory, setSpeedHistory] = useState<SpeedSample[]>([]);
  const [softwareConfiguration, setSoftwareConfiguration] = useState<SoftwareConfiguration>({
    simulation_step_ms: 100,
  });
  const [simulationStepMsInput, setSimulationStepMsInput] = useState(100);

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) ?? null;

  useEffect(() => {
    void initializeData();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSelectedDevice(selectedDeviceId);
    }, 400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    // Only initialize editable form fields when switching the selected device.
    // Do not overwrite user input on each telemetry poll.
    setSpeedReferencePct(selectedDevice.runtime.speed_reference_pct);
    setAccelerationTimeS(selectedDevice.runtime.acceleration_time_s);
    setDecelerationTimeS(selectedDevice.runtime.deceleration_time_s);
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    setSpeedHistory((current) => {
      const nextSample: SpeedSample = {
        timeMs: Date.now(),
        speedRpm: selectedDevice.telemetry.speed_rpm,
      };
      const nextHistory = [...current, nextSample];
      return nextHistory.slice(-MAX_CHART_SAMPLES);
    });
  }, [selectedDevice?.telemetry.speed_rpm, selectedDeviceId]);

  useEffect(() => {
    setSpeedHistory([]);
  }, [selectedDeviceId]);

  async function initializeData() {
    await Promise.all([refreshDevices(), refreshSoftwareConfiguration()]);
  }

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

  async function refreshSelectedDevice(deviceId: string) {
    try {
      const nextDevice = await getDevice(deviceId);
      replaceDevice(nextDevice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh telemetry");
    }
  }

  async function refreshSoftwareConfiguration() {
    try {
      const nextConfiguration = await getSoftwareConfiguration();
      setSoftwareConfiguration(nextConfiguration);
      setSimulationStepMsInput(nextConfiguration.simulation_step_ms);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load software config");
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

  async function handleSaveSoftwareConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMutating(true);
    setErrorMessage(null);

    try {
      const nextConfiguration = await updateSoftwareConfiguration({
        simulation_step_ms: simulationStepMsInput,
      });
      setSoftwareConfiguration(nextConfiguration);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update software config");
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
          The simulation now runs continuously in the backend using a configurable simulation
          step. The UI updates telemetry in near real-time.
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

      <section className="panel config-panel">
        <h2>Software Configuration</h2>
        <p className="caption">Global simulation settings for the local backend runtime.</p>
        <form className="config-form" onSubmit={handleSaveSoftwareConfiguration}>
          <label>
            <span>Simulation Step (ms)</span>
            <input
              type="number"
              min={10}
              max={2000}
              step={10}
              value={simulationStepMsInput}
              onChange={(event) => setSimulationStepMsInput(Number(event.target.value))}
            />
          </label>
          <div className="button-row">
            <button type="submit" disabled={isMutating}>
              Save
            </button>
            <button type="button" disabled={isMutating} onClick={() => void refreshSoftwareConfiguration()}>
              Reload
            </button>
            <span className="badge">Active: {softwareConfiguration.simulation_step_ms} ms</span>
          </div>
        </form>
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
            <>
              <ul>
                {telemetry.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
              <h3 className="chart-title">Motor Speed Chart (rpm)</h3>
              <MotorSpeedChart samples={speedHistory} />
            </>
          ) : (
            <p className="caption">Telemetry appears after selecting a device.</p>
          )}
        </article>
      </section>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
    </main>
  );
}

function MotorSpeedChart({ samples }: { samples: SpeedSample[] }) {
  const width = 840;
  const height = 220;
  const padding = 24;

  if (samples.length < 2) {
    return <p className="caption">Collecting speed samples...</p>;
  }

  const minSpeed = Math.min(...samples.map((sample) => sample.speedRpm));
  const maxSpeed = Math.max(...samples.map((sample) => sample.speedRpm));
  const speedRange = Math.max(maxSpeed - minSpeed, 1);

  const points = samples
    .map((sample, index) => {
      const x = padding + (index / (samples.length - 1)) * (width - padding * 2);
      const y =
        height -
        padding -
        ((sample.speedRpm - minSpeed) / speedRange) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="speed-chart" role="img" aria-label="Motor speed trend chart">
      <rect x={0} y={0} width={width} height={height} rx={14} className="speed-chart-bg" />
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        className="speed-chart-axis"
      />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="speed-chart-axis" />
      <polyline fill="none" points={points} className="speed-chart-line" />
      <text x={padding} y={padding - 6} className="speed-chart-label">
        Max {maxSpeed.toFixed(1)} rpm
      </text>
      <text x={padding} y={height - 6} className="speed-chart-label">
        Min {minSpeed.toFixed(1)} rpm
      </text>
    </svg>
  );
}
