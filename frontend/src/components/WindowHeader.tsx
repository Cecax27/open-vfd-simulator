type WindowHeaderProps = {
  subtitle: string;
  appTitle: string;
  projectLabel: string;
  projectName: string;
  projectPathDisplay: string;
  projectDirty: boolean;
};

export function WindowHeader({
  subtitle,
  appTitle,
  projectLabel,
  projectName,
  projectPathDisplay,
  projectDirty,
}: WindowHeaderProps) {
  return (
    <header className="window-header">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h1>{appTitle}</h1>
      </div>
      <div className="window-project-meta">
        <strong>{projectLabel}: {projectName}</strong>
        <span>{projectPathDisplay}{projectDirty ? " *" : ""}</span>
      </div>
    </header>
  );
}
