import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAppContext } from "../context/AppContext";
import { WindowHeader } from "./WindowHeader";
import { WorkspaceNav } from "./WorkspaceNav";
import { StatusFooter } from "./StatusFooter";
import { Page } from "../types";

function pageFromPath(pathname: string): Page {
  if (pathname === "/settings") return "settings";
  if (pathname.startsWith("/communications")) return "communications";
  if (pathname === "/devices/config") return "device-config";
  if (pathname === "/devices") return "devices";
  return "home";
}

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    notice,
    errorMessage,
    editMode,
  } = useAppContext();

  const page = pageFromPath(location.pathname);

  const pageLabel: Record<Page, string> = {
    home: t("home"),
    devices: t("devices"),
    "device-config": editMode === "create" ? t("createDeviceTitle") : t("editDeviceTitle"),
    communications: t("communications"),
    settings: t("settings"),
  };

  return (
    <main className="desktop-shell select-none">
      <WindowHeader />
      <div className={page === "home" ? "workspace-layout workspace-layout--no-nav" : "workspace-layout"}>
        {page !== "home" ? (
          <WorkspaceNav
            page={page}
            onNavigate={(target) => {
              if (target === "home") navigate("/");
              if (target === "devices") navigate("/devices");
              if (target === "communications") navigate("/communications/opcua");
              if (target === "settings") navigate("/settings");
            }}
          />
        ) : null}
        <section className={page === "home" ? "workspace-content workspace-content--home" : "workspace-content"}>
          <Outlet />
        </section>
      </div>
      <StatusFooter/>
    </main>
  );
}
