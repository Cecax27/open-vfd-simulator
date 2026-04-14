export type DeviceStatus = "stopped" | "running" | "fault";

export type LoadType = "constant_torque" | "fan";

export interface MotorParameters {
  rated_power_w: number;
  rated_voltage_v: number;
  rated_current_a: number;
  rated_frequency_hz: number;
  rated_speed_rpm: number;
  pole_pairs: number;
  stator_resistance_ohm: number;
  rotor_resistance_ohm: number;
  stator_inductance_h: number;
  rotor_inductance_h: number;
  mutual_inductance_h: number;
  inertia_kgm2: number;
  friction_coefficient: number;
}

export interface LoadParameters {
  load_type: LoadType;
  nominal_load_torque_nm: number;
  load_inertia_kgm2: number;
}

export interface RuntimeCommand {
  speed_reference_pct: number;
  acceleration_time_s: number;
  deceleration_time_s: number;
  status: DeviceStatus;
}

export interface TelemetrySnapshot {
  fault_code: number;
  commanded_frequency_hz: number;
  output_frequency_hz: number;
  output_voltage_v: number;
  output_current_a: number;
  speed_rpm: number;
  electromagnetic_torque_nm: number;
  load_torque_nm: number;
  mechanical_power_w: number;
  estimated_temperature_c: number;
}

export interface DeviceRecord {
  id: string;
  name: string;
  template_key: string;
  motor: MotorParameters;
  load: LoadParameters;
  runtime: RuntimeCommand;
  telemetry: TelemetrySnapshot;
}

const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listDevices(): Promise<DeviceRecord[]> {
  return apiRequest<DeviceRecord[]>("/api/devices");
}

export function createDevice(name: string): Promise<DeviceRecord> {
  return apiRequest<DeviceRecord>("/api/devices", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateRuntime(
  deviceId: string,
  payload: Partial<RuntimeCommand> & { fault_reset?: boolean },
): Promise<DeviceRecord> {
  return apiRequest<DeviceRecord>(`/api/devices/${deviceId}/runtime`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function stepDevice(deviceId: string, deltaTimeS: number): Promise<DeviceRecord> {
  return apiRequest<DeviceRecord>(`/api/devices/${deviceId}/step`, {
    method: "POST",
    body: JSON.stringify({ delta_time_s: deltaTimeS }),
  });
}
