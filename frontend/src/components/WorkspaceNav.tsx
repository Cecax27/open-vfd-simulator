type WorkspaceNavProps = {
  workspaceLabel: string;
  homeLabel: string;
  devicesLabel: string;
  communicationsLabel: string;
  settingsLabel: string;
  menuHint: string;
  closeProjectLabel: string;
  page: "home" | "devices" | "device-config" | "communications" | "settings";
  projectOpen: boolean;
  isMutating: boolean;
  onNavigateHome: () => void;
  onNavigateDevices: () => void;
  onNavigateCommunications: () => void;
  onNavigateSettings: () => void;
  onCloseProject: () => void;
};

export function WorkspaceNav({
  workspaceLabel,
  homeLabel,
  devicesLabel,
  communicationsLabel,
  settingsLabel,
  menuHint,
  closeProjectLabel,
  page,
  projectOpen,
  isMutating,
  onNavigateHome,
  onNavigateDevices,
  onNavigateCommunications,
  onNavigateSettings,
  onCloseProject,
}: WorkspaceNavProps) {
  return (
    <aside className="workspace-nav panel bg-slate-100">
      <div className="flex flex-col">
        <NavButton active={page === "home"} onClick={onNavigateHome} label={homeLabel} />
        <NavButton active={page === "devices"} onClick={onNavigateDevices} label={devicesLabel} />
        <NavButton active={page === "communications"} onClick={onNavigateCommunications} label={communicationsLabel} />
        <NavButton active={page === "settings"} onClick={onNavigateSettings} label={settingsLabel} />
      </div>
      <p className="caption nav-hint">{menuHint}</p>
      {projectOpen ? (
        <button onClick={onCloseProject} disabled={isMutating}>{closeProjectLabel}</button>
      ) : null}
    </aside>
  );
}

export default function NavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button className={active ? "bg-slate-200 text-left p-3" : "text-left p-3 hover:bg-slate-200"} onClick={onClick}>{label}</button>
  )
}
