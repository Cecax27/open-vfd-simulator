import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAppContext } from "../context/AppContext";
import { WindowHeader } from "./WindowHeader";
import { WorkspaceNav } from "./WorkspaceNav";
import { StatusFooter } from "./StatusFooter";
import { Page } from "../types";

function pageFromPath(pathname: string): Page {
  if (pathname === "/settings") return "settings";
  if (pathname === "/devices/config") return "device-config";
  if (pathname === "/devices") return "devices";
  return "home";
}

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    projectOpen,
    projectName,
    projectPath,
    projectDirty,
    isMutating,
    notice,
    errorMessage,
    editMode,
    closeProject,
  } = useAppContext();

  const page = pageFromPath(location.pathname);

  const pageLabel: Record<Page, string> = {
    home: t("home"),
    devices: t("devices"),
    "device-config": editMode === "create" ? t("createDeviceTitle") : t("editDeviceTitle"),
    settings: t("settings"),
  };

  return (
    <main className="desktop-shell">
      <WindowHeader
        subtitle={t("subtitle")}
        appTitle={t("appTitle")}
        projectLabel={t("projectName")}
        projectName={projectName}
        projectPathDisplay={projectPath ?? t("unsaved")}
        projectDirty={projectDirty}
      />
      <div className="workspace-layout">
        <WorkspaceNav
          workspaceLabel={t("workspace")}
          homeLabel={t("home")}
          devicesLabel={t("devices")}
          settingsLabel={t("settings")}
          menuHint={t("useMenuHint")}
          closeProjectLabel={t("closeProject")}
          page={page}
          projectOpen={projectOpen}
          isMutating={isMutating}
          onNavigateHome={() => navigate("/")}
          onNavigateDevices={() => navigate("/devices")}
          onNavigateSettings={() => navigate("/settings")}
          onCloseProject={() => void closeProject()}
        />
        <section className="workspace-content">
          <Outlet />
        </section>
      </div>
      <StatusFooter/>
    </main>
  );
}
