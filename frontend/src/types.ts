import {
  DeviceOpcUaMapping,
  LoadType,
  MotorParameters,
  OpcUaClientConfiguration,
  OperationMode,
  SoftwareConfiguration,
} from "./api";

export type Language = "en" | "es";
export type Page = "home" | "devices" | "device-config" | "communications" | "settings";
export type EditMode = "create" | "edit";
export type MenuAction =
  | "project:new"
  | "project:open"
  | "project:save"
  | "project:save-as"
  | "view:devices"
  | "view:communications"
  | "view:settings";

export type DeviceDraft = {
  id?: string;
  name: string;
  motor_model_id?: string | null;
  vfd_model_id?: string | null;
  runtime: {
    speed_reference_pct: number;
    acceleration_time_s: number;
    deceleration_time_s: number;
    status: "stopped" | "running" | "fault";
    operation_mode: OperationMode;
  };
  motor: MotorParameters;
  load: {
    load_type: LoadType;
    nominal_load_torque_nm: number;
    load_inertia_kgm2: number;
  };
  opcua_mapping: DeviceOpcUaMapping;
};

export type SavedProjectDevice = {
  name: string;
  template_key: string;
  motor_model_id?: string | null;
  vfd_model_id?: string | null;
  motor: MotorParameters;
  load: {
    load_type: LoadType;
    nominal_load_torque_nm: number;
    load_inertia_kgm2: number;
  };
  runtime: {
    speed_reference_pct: number;
    acceleration_time_s: number;
    deceleration_time_s: number;
    status: "stopped" | "running" | "fault";
    operation_mode: OperationMode;
  };
  opcua_mapping: DeviceOpcUaMapping;
};

export type SavedProject = {
  formatVersion: 1;
  projectName: string;
  language: Language;
  softwareConfiguration: SoftwareConfiguration;
  devices: SavedProjectDevice[];
};

export type RecentProject = {
  projectName: string;
  filePath: string;
  lastOpenedAt: number;
};

export type SpeedSample = {
  timeMs: number;
  speedRpm: number;
};

export const MAX_CHART_SAMPLES = 90;
export const RECENT_PROJECTS_KEY = "open-vfd-recent-projects";

export function defaultDraft(name = "Drive 1"): DeviceDraft {
  return {
    name,
    runtime: {
      speed_reference_pct: 0,
      acceleration_time_s: 5,
      deceleration_time_s: 5,
      status: "stopped",
      operation_mode: "local",
    },
    motor: {
      rated_power_w: 500,
      rated_voltage_v: 230,
      rated_current_a: 3.5,
      rated_frequency_hz: 50,
      rated_speed_rpm: 1450,
      pole_pairs: 2,
      stator_resistance_ohm: 5.1,
      rotor_resistance_ohm: 4.8,
      stator_inductance_h: 0.18,
      rotor_inductance_h: 0.18,
      mutual_inductance_h: 0.158,
      inertia_kgm2: 0.0075,
      friction_coefficient: 0.01,
    },
    load: {
      load_type: "constant_torque",
      nominal_load_torque_nm: 2,
      load_inertia_kgm2: 0.005,
    },
    opcua_mapping: {
      speed_reference_node_id: null,
      run_stop_node_id: null,
      telemetry_node_ids: {},
    },
  };
}

function parseOpcUaConfiguration(raw: unknown): OpcUaClientConfiguration {
  if (!raw || typeof raw !== "object") {
    return {
      enabled: false,
      endpoint_url: null,
      request_timeout_s: 2,
    };
  }

  const input = raw as Partial<OpcUaClientConfiguration>;
  return {
    enabled: Boolean(input.enabled),
    endpoint_url: typeof input.endpoint_url === "string" && input.endpoint_url.trim() ? input.endpoint_url : null,
    request_timeout_s:
      typeof input.request_timeout_s === "number" && Number.isFinite(input.request_timeout_s)
        ? input.request_timeout_s
        : 2,
  };
}

export function parseSavedProject(content: string): SavedProject {
  if (!content || !content.trim()) {
    throw new Error("Project file is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Project file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Project file format is invalid.");
  }

  const project = parsed as Partial<SavedProject>;

  if (!project.softwareConfiguration || typeof project.softwareConfiguration !== "object") {
    throw new Error("Project file missing software configuration.");
  }

  if (!Array.isArray(project.devices)) {
    throw new Error("Project file missing device list.");
  }

  const simulationStepMs = (project.softwareConfiguration as Partial<SoftwareConfiguration>)
    .simulation_step_ms;
  if (typeof simulationStepMs !== "number" || !Number.isFinite(simulationStepMs)) {
    throw new Error("Project file contains invalid simulation step value.");
  }

  return {
    formatVersion: 1,
    projectName: typeof project.projectName === "string" ? project.projectName : "Untitled Project",
    language: project.language === "es" ? "es" : "en",
    softwareConfiguration: {
      simulation_step_ms: simulationStepMs,
      opcua: parseOpcUaConfiguration((project.softwareConfiguration as { opcua?: unknown }).opcua),
    } as SoftwareConfiguration,
    devices: (project.devices as SavedProjectDevice[]).map((device) => ({
      ...device,
      runtime: {
        speed_reference_pct: device.runtime?.speed_reference_pct ?? 0,
        acceleration_time_s: device.runtime?.acceleration_time_s ?? 5,
        deceleration_time_s: device.runtime?.deceleration_time_s ?? 5,
        status: device.runtime?.status ?? "stopped",
        operation_mode: device.runtime?.operation_mode ?? "local",
      },
      opcua_mapping: {
        speed_reference_node_id:
          typeof device.opcua_mapping?.speed_reference_node_id === "string"
            ? device.opcua_mapping.speed_reference_node_id
            : null,
        run_stop_node_id:
          typeof device.opcua_mapping?.run_stop_node_id === "string"
            ? device.opcua_mapping.run_stop_node_id
            : null,
        telemetry_node_ids:
          device.opcua_mapping?.telemetry_node_ids && typeof device.opcua_mapping.telemetry_node_ids === "object"
            ? Object.fromEntries(
                Object.entries(device.opcua_mapping.telemetry_node_ids).filter(
                  ([key, value]) => typeof key === "string" && typeof value === "string" && value.trim(),
                ),
              )
            : {},
      },
    })),
  };
}

export function readRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item.filePath === "string");
  } catch {
    return [];
  }
}

export function writeRecentProjects(projects: RecentProject[]) {
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects.slice(0, 10)));
}
