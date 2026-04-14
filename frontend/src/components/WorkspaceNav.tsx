type WorkspaceNavProps = {
  workspaceLabel: string;
  homeLabel: string;
  devicesLabel: string;
  settingsLabel: string;
  menuHint: string;
  closeProjectLabel: string;
  page: "home" | "devices" | "device-config" | "settings";
  projectOpen: boolean;
  isMutating: boolean;
  onNavigateHome: () => void;
  onNavigateDevices: () => void;
  onNavigateSettings: () => void;
  onCloseProject: () => void;
};

export function WorkspaceNav({
  workspaceLabel,
  homeLabel,
  devicesLabel,
  settingsLabel,
  menuHint,
  closeProjectLabel,
  page,
  projectOpen,
  isMutating,
  onNavigateHome,
  onNavigateDevices,
  onNavigateSettings,
  onCloseProject,
}: WorkspaceNavProps) {
  return (
    <aside className="workspace-nav panel">
      <p className="section-title">{workspaceLabel}</p>
      <div className="workspace-nav-buttons">
        <button className={page === "home" ? "active" : ""} onClick={onNavigateHome}>{homeLabel}</button>
        <button className={page === "devices" ? "active" : ""} onClick={onNavigateDevices} disabled={!projectOpen}>{devicesLabel}</button>
        <button className={page === "settings" ? "active" : ""} onClick={onNavigateSettings}>{settingsLabel}</button>
      </div>
      <p className="caption nav-hint">{menuHint}</p>
      {projectOpen ? (
        <button onClick={onCloseProject} disabled={isMutating}>{closeProjectLabel}</button>
      ) : null}
    </aside>
  );
}
