import { LoadType, MotorParameters, SoftwareConfiguration } from "./api";

export type Language = "en" | "es";
export type Page = "home" | "devices" | "device-config" | "settings";
export type EditMode = "create" | "edit";
export type MenuAction =
  | "project:new"
  | "project:open"
  | "project:save"
  | "project:save-as"
  | "view:devices"
  | "view:settings";

export type DeviceDraft = {
  id?: string;
  name: string;
  runtime: {
    speed_reference_pct: number;
    acceleration_time_s: number;
    deceleration_time_s: number;
    status: "stopped" | "running" | "fault";
  };
  motor: MotorParameters;
  load: {
    load_type: LoadType;
    nominal_load_torque_nm: number;
    load_inertia_kgm2: number;
  };
};

export type SavedProjectDevice = {
  name: string;
  template_key: string;
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
  };
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
    softwareConfiguration: { simulation_step_ms: simulationStepMs },
    devices: project.devices as SavedProjectDevice[],
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
