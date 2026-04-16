import type { DeviceRecord } from "../api";

export type OpcUaTelemetryType = "Boolean" | "Int32" | "Float" | "String";

export type OpcUaTelemetrySpec = {
  key: string;
  labelKey: string;
  expectedType: OpcUaTelemetryType;
  unitKey?: string;
};

export const OPCUA_TELEMETRY_SPECS: OpcUaTelemetrySpec[] = [
  { key: "command_state", labelKey: "telemetryCommandState", expectedType: "String" },
  { key: "fault_state", labelKey: "telemetryFaultState", expectedType: "Boolean" },
  { key: "fault_code", labelKey: "telemetryFaultCode", expectedType: "Int32" },
  {
    key: "commanded_frequency_hz",
    labelKey: "telemetryCommandedFrequency",
    expectedType: "Float",
    unitKey: "unitHz",
  },
  {
    key: "output_frequency_hz",
    labelKey: "telemetryOutputFrequency",
    expectedType: "Float",
    unitKey: "unitHz",
  },
  {
    key: "output_voltage_v",
    labelKey: "telemetryOutputVoltage",
    expectedType: "Float",
    unitKey: "unitVolt",
  },
  {
    key: "output_current_a",
    labelKey: "telemetryOutputCurrent",
    expectedType: "Float",
    unitKey: "unitAmp",
  },
  { key: "speed_rpm", labelKey: "telemetryActualSpeed", expectedType: "Float", unitKey: "unitRpm" },
  {
    key: "electromagnetic_torque_nm",
    labelKey: "telemetryElectromagneticTorque",
    expectedType: "Float",
    unitKey: "unitNm",
  },
  { key: "load_torque_nm", labelKey: "telemetryLoadTorque", expectedType: "Float", unitKey: "unitNm" },
  {
    key: "mechanical_power_w",
    labelKey: "telemetryMechanicalPower",
    expectedType: "Float",
    unitKey: "unitWatt",
  },
  {
    key: "estimated_temperature_c",
    labelKey: "telemetryEstimatedTemperature",
    expectedType: "Float",
    unitKey: "unitCelsius",
  },
];

export function getTelemetryValueByKey(device: DeviceRecord | null, key: string): boolean | number | string {
  if (!device) {
    return "-";
  }

  if (key === "command_state") {
    return device.runtime.status;
  }
  if (key === "fault_state") {
    return device.telemetry.fault_code > 0;
  }

  const telemetry = device.telemetry as unknown as Record<string, unknown>;
  const rawValue = telemetry[key];
  if (typeof rawValue === "number") {
    return Number.isInteger(rawValue) ? rawValue : Number(rawValue.toFixed(3));
  }
  if (typeof rawValue === "string" || typeof rawValue === "boolean") {
    return rawValue;
  }
  return "-";
}
