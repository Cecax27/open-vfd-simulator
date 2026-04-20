import { useTranslation } from "react-i18next";
import { ReactNode } from "react";

import { useAppContext } from "../context/AppContext";
import { Page } from "../types";

type WorkspaceNavProps = {
  page: Page;
  onNavigate: (page: "home" | "devices" | "communications" | "settings") => void;
};

export function WorkspaceNav({
  page,
  onNavigate,
}: WorkspaceNavProps) {
  const { t } = useTranslation();
  const { projectOpen, isMutating, closeProject } = useAppContext();

  const navItems = [
    {
      key: "home",
      label: t("home"),
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
        </svg>
      ),
    },
    {
      key: "devices",
      label: t("devices"),
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8" />
        </svg>
      ),
    },
    {
      key: "communications",
      label: t("communications"),
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h10M4 18h6" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="12" cy="18" r="2" />
        </svg>
      ),
    },
    {
      key: "settings",
      label: t("settings"),
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.03.03a2 2 0 1 1-2.83 2.83l-.03-.03A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.06V21a2 2 0 1 1-4 0v-.04a1.7 1.7 0 0 0-.4-1.06 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.03.03a2 2 0 1 1-2.83-2.83l.03-.03A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.06-.4H3.9a2 2 0 1 1 0-4h.04a1.7 1.7 0 0 0 1.06-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.03-.03a2 2 0 1 1 2.83-2.83l.03.03A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.06V2.9a2 2 0 1 1 4 0v.04a1.7 1.7 0 0 0 .4 1.06 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.06.4h.04a2 2 0 1 1 0 4h-.04a1.7 1.7 0 0 0-1.06.4 1.7 1.7 0 0 0-.6 1Z" />
        </svg>
      ),
    },
  ] as const;

  return (
    <aside className="workspace-nav">
      <div className="flex flex-col gap-3">
        {navItems.map((item) => (
          <NavButton key={item.key} active={page === item.key} onClick={() => onNavigate(item.key)} label={item.label} icon={item.icon} />
        ))}
      </div>
      {projectOpen ? (
        <button onClick={() => void closeProject()} disabled={isMutating}>{t("closeProject")}</button>
      ) : null}
    </aside>
  );
}

export default function NavButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <span aria-hidden="true" className="inline-flex items-center">{icon}</span> {label}
    </button>
  )
}
