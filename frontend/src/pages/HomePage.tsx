import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";

export function HomePage() {
  const { t } = useTranslation();
  const { recentProjects, isMutating, startNewProject, openProjectFromDialog, openProjectFromPath } =
    useAppContext();

  return (
    <section className="panel view-page home-panel">
      <h2>{t("homeTitle")}</h2>
      <p className="caption">{t("homeSubtitle")}</p>
      <div className="row-actions">
        <button onClick={() => void startNewProject()} disabled={isMutating}>
          {t("createNewProject")}
        </button>
        <button onClick={() => void openProjectFromDialog()} disabled={isMutating}>
          {t("openProjectFile")}
        </button>
      </div>
      <h3 className="section-title">{t("recentProjects")}</h3>
      {recentProjects.length === 0 ? <p className="caption">{t("noRecent")}</p> : null}
      <div className="recent-list">
        {recentProjects.map((project) => (
          <button
            key={project.filePath}
            className="recent-item"
            onClick={() => void openProjectFromPath(project.filePath)}
            disabled={isMutating}
          >
            <strong>{project.projectName}</strong>
            <span>{project.filePath}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
