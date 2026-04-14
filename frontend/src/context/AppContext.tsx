import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import {
  DeviceRecord,
  SoftwareConfiguration,
  createDeviceWithConfiguration,
  getDevice,
  getSoftwareConfiguration,
  listDevices,
  resetDevices,
  updateDeviceConfiguration,
  updateRuntime,
  updateSoftwareConfiguration,
} from "../api";
import {
  DeviceDraft,
  EditMode,
  Language,
  MAX_CHART_SAMPLES,
  MenuAction,
  RecentProject,
  SavedProject,
  SpeedSample,
  defaultDraft,
  parseSavedProject,
  readRecentProjects,
  writeRecentProjects,
} from "../types";

type AppContextValue = {
  devices: DeviceRecord[];
  selectedDeviceId: string | null;
  selectedDevice: DeviceRecord | null;
  editMode: EditMode;
  draft: DeviceDraft;
  setDraft: (draft: DeviceDraft) => void;
  speedHistory: SpeedSample[];
  projectOpen: boolean;
  projectName: string;
  projectPath: string | null;
  projectDirty: boolean;
  recentProjects: RecentProject[];
  language: Language;
  configuration: SoftwareConfiguration;
  simulationStepInput: number;
  setSimulationStepInput: (value: number) => void;
  isLoading: boolean;
  isMutating: boolean;
  notice: string | null;
  errorMessage: string | null;
  startNewProject: () => Promise<void>;
  openProjectFromDialog: () => Promise<void>;
  openProjectFromPath: (filePath: string) => Promise<void>;
  closeProject: () => Promise<void>;
  handleSaveProject: (forceSaveAs: boolean) => Promise<boolean>;
  openCreateDevicePage: () => void;
  openEditDevicePage: (device: DeviceRecord) => void;
  saveDeviceDraft: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  applySettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  changeLanguage: (lang: Language) => void;
  refreshDevices: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("create");
  const [draft, setDraft] = useState<DeviceDraft>(defaultDraft());
  const [speedHistory, setSpeedHistory] = useState<SpeedSample[]>([]);

  const [projectOpen, setProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectDirty, setProjectDirty] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [language, setLanguage] = useState<Language>("en");

  const [configuration, setConfiguration] = useState<SoftwareConfiguration>({ simulation_step_ms: 100 });
  const [simulationStepInput, setSimulationStepInput] = useState(100);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;

  useEffect(() => {
    void initialize();
  }, []);

  // Poll the selected device for live telemetry only while on the config page.
  useEffect(() => {
    if (!selectedDeviceId || location.pathname !== "/devices/config") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshSelectedDevice(selectedDeviceId);
    }, 350);

    return () => window.clearInterval(timer);
  }, [selectedDeviceId, location.pathname]);

  // Append speed samples when telemetry updates.
  useEffect(() => {
    if (!selectedDevice) {
      return;
    }
    setSpeedHistory((current) => {
      const next = [
        ...current,
        { timeMs: Date.now(), speedRpm: selectedDevice.telemetry.speed_rpm },
      ];
      return next.slice(-MAX_CHART_SAMPLES);
    });
  }, [selectedDevice?.telemetry.speed_rpm, selectedDeviceId]);

  // Reset speed history when the selected device changes.
  useEffect(() => {
    setSpeedHistory([]);
  }, [selectedDeviceId]);

  // Subscribe to Electron native menu actions.
  useEffect(() => {
    if (!window.openVfd?.onMenuAction) {
      return;
    }

    const unsubscribe = window.openVfd.onMenuAction((action) => {
      void handleMenuAction(action);
    });

    return () => unsubscribe();
  }, [projectOpen, projectDirty, projectName, projectPath, location.pathname, language]);

  async function initialize() {
    setRecentProjects(readRecentProjects());
    await Promise.all([refreshDevices(), refreshConfiguration()]);
    setIsLoading(false);
  }

  async function refreshDevices() {
    try {
      const nextDevices = await listDevices();
      setDevices(nextDevices);
      setSelectedDeviceId((current) => current ?? nextDevices[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load devices");
    }
  }

  async function refreshSelectedDevice(deviceId: string) {
    try {
      const device = await getDevice(deviceId);
      setDevices((current) => current.map((item) => (item.id === device.id ? device : item)));
    } catch {
      // Device may no longer exist.
    }
  }

  async function refreshConfiguration() {
    try {
      const next = await getSoftwareConfiguration();
      setConfiguration(next);
      setSimulationStepInput(next.simulation_step_ms);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load config");
    }
  }

  async function confirmBeforeDiscard(): Promise<boolean> {
    if (!projectOpen || !projectDirty) {
      return true;
    }

    if (!window.openVfd?.confirmSaveBeforeContinue) {
      return window.confirm("You have unsaved changes. Continue without saving?");
    }

    const result = await window.openVfd.confirmSaveBeforeContinue(projectName);
    if (result === "cancel") {
      return false;
    }
    if (result === "dont-save") {
      return true;
    }

    return handleSaveProject(false);
  }

  async function handleMenuAction(action: MenuAction) {
    if (action === "project:new") {
      await startNewProject();
      return;
    }
    if (action === "project:open") {
      await openProjectFromDialog();
      return;
    }
    if (action === "project:save") {
      await handleSaveProject(false);
      return;
    }
    if (action === "project:save-as") {
      await handleSaveProject(true);
      return;
    }
    if (action === "view:devices") {
      if (projectOpen) {
        navigate("/devices");
      }
      return;
    }
    if (action === "view:settings") {
      navigate("/settings");
    }
  }

  async function applyProjectData(project: SavedProject, filePath: string | null) {
      
    await resetDevices();
    await updateSoftwareConfiguration({
      simulation_step_ms: project.softwareConfiguration.simulation_step_ms,
    });

    for (const device of project.devices) {
      const created = await createDeviceWithConfiguration({
        name: device.name,
        template_key: device.template_key,
        motor: device.motor,
        load: device.load,
      });
      await updateRuntime(created.id, device.runtime);
    }

    const nextLanguage: Language = project.language === "es" ? "es" : "en";
    setProjectName(project.projectName || "Untitled Project");
    setLanguage(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
    setProjectPath(filePath);
    setProjectDirty(false);
    setProjectOpen(true);
    navigate("/devices");
    await Promise.all([refreshDevices(), refreshConfiguration()]);
  }

  function pushRecentProject(item: RecentProject) {
    const next = [
      item,
      ...recentProjects.filter((proj) => proj.filePath !== item.filePath),
    ].slice(0, 10);
    setRecentProjects(next);
    writeRecentProjects(next);
  }

  async function startNewProject() {
    
    const proceed = await confirmBeforeDiscard();
    if (!proceed) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    try {
      const freshProject: SavedProject = {
        formatVersion: 1,
        projectName: "Untitled Project",
        language: "en",
        softwareConfiguration: { simulation_step_ms: 100 },
        devices: [],
      };
      await applyProjectData(freshProject, null);
      setNotice(t("saved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsMutating(false);
    }
  }

  async function openProjectFromDialog() {
    const proceed = await confirmBeforeDiscard();
    if (!proceed) {
      return;
    }

    if (!window.openVfd) {
      setErrorMessage(t("openElectronOnly"));
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    try {
      const filePath = await window.openVfd.openProjectDialog();
      if (!filePath) {
        return;
      }
      await openProjectFromPath(filePath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to open project");
    } finally {
      setIsMutating(false);
    }
  }

  async function openProjectFromPath(filePath: string) {
    if (!window.openVfd) {
      throw new Error(t("openElectronOnly"));
    }

    const content = await window.openVfd.readProjectFile(filePath);
    const project = parseSavedProject(content);
    await applyProjectData(project, filePath);
    pushRecentProject({ projectName: project.projectName, filePath, lastOpenedAt: Date.now() });
    setNotice(t("projectLoaded"));
  }

  async function closeProject() {
    const proceed = await confirmBeforeDiscard();
    if (!proceed) {
      return;
    }

    setIsMutating(true);
    try {
      await resetDevices();
      setDevices([]);
      setSelectedDeviceId(null);
      setProjectOpen(false);
      setProjectName("Untitled Project");
      setProjectPath(null);
      setProjectDirty(false);
      navigate("/");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSaveProject(forceSaveAs: boolean): Promise<boolean> {
    if (!window.openVfd) {
      setErrorMessage(t("openElectronOnly"));
      return false;
    }

    setIsMutating(true);
    setErrorMessage(null);
    try {
      const currentDevices = await listDevices();
      const currentConfiguration = await getSoftwareConfiguration();

      let targetPath = projectPath;
      if (forceSaveAs || !targetPath) {
        const preferredName = `${projectName.replace(/\s+/g, "-").toLowerCase() || "project"}.ovfd`;
        targetPath = await window.openVfd.saveProjectDialog(preferredName);
      }
      if (!targetPath) {
        return false;
      }

      const payload: SavedProject = {
        formatVersion: 1,
        projectName,
        language,
        softwareConfiguration: currentConfiguration,
        devices: currentDevices.map((device) => ({
          name: device.name,
          template_key: device.template_key,
          motor: device.motor,
          load: device.load,
          runtime: device.runtime,
        })),
      };

      await window.openVfd.writeProjectFile(targetPath, JSON.stringify(payload, null, 2));
      setProjectPath(targetPath);
      setProjectDirty(false);
      setProjectOpen(true);
      pushRecentProject({ projectName, filePath: targetPath, lastOpenedAt: Date.now() });
      setNotice(t("projectSaved"));
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save project");
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  function openCreateDevicePage() {
    setEditMode("create");
    setDraft(defaultDraft(`Drive ${devices.length + 1}`));
    navigate("/devices/config");
  }

  function openEditDevicePage(device: DeviceRecord) {
    setEditMode("edit");
    setDraft({
      id: device.id,
      name: device.name,
      runtime: {
        speed_reference_pct: device.runtime.speed_reference_pct,
        acceleration_time_s: device.runtime.acceleration_time_s,
        deceleration_time_s: device.runtime.deceleration_time_s,
        status: device.runtime.status,
      },
      motor: device.motor,
      load: device.load,
    });
    setSelectedDeviceId(device.id);
    navigate("/devices/config");
  }

  async function saveDeviceDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMutating(true);
    setErrorMessage(null);
    try {
      if (editMode === "create") {
        const created = await createDeviceWithConfiguration({
          name: draft.name,
          motor: draft.motor,
          load: draft.load,
        });
        await updateRuntime(created.id, draft.runtime);
        setSelectedDeviceId(created.id);
      } else if (draft.id) {
        await updateDeviceConfiguration(draft.id, {
          name: draft.name,
          motor: draft.motor,
          load: draft.load,
        });
        await updateRuntime(draft.id, draft.runtime);
      }

      await refreshDevices();
      navigate("/devices");
      setProjectDirty(true);
      setNotice(t("saved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save device");
    } finally {
      setIsMutating(false);
    }
  }

  async function applySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const nextConfiguration = await updateSoftwareConfiguration({
        simulation_step_ms: simulationStepInput,
      });
      setConfiguration(nextConfiguration);
      setProjectDirty(true);
      setNotice(t("saved"));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsMutating(false);
    }
  }

  function changeLanguage(lang: Language) {
    setLanguage(lang);
    void i18n.changeLanguage(lang);
    setProjectDirty(true);
  }

  const value: AppContextValue = {
    devices,
    selectedDeviceId,
    selectedDevice,
    editMode,
    draft,
    setDraft,
    speedHistory,
    projectOpen,
    projectName,
    projectPath,
    projectDirty,
    recentProjects,
    language,
    configuration,
    simulationStepInput,
    setSimulationStepInput,
    isLoading,
    isMutating,
    notice,
    errorMessage,
    startNewProject,
    openProjectFromDialog,
    openProjectFromPath,
    closeProject,
    handleSaveProject,
    openCreateDevicePage,
    openEditDevicePage,
    saveDeviceDraft,
    applySettings,
    changeLanguage,
    refreshDevices,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
