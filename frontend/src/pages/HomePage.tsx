import { useTranslation } from "react-i18next";
import { Upload, Heart } from "lucide-react";
import { useAppContext } from "../context/AppContext";

export function HomePage() {
  const { t } = useTranslation();
  const { recentProjects, isMutating, startNewProject, openProjectFromDialog, openProjectFromPath } =
    useAppContext();

  return (
    <section className="panel">
      <h2>{t("homeTitle")}</h2>
      <p className="caption">{t("homeSubtitle")}</p>
      <div className="flex flex-row mt-10">
        <div className="flex-5">
          <h3 className="section-title mb-4">{t("recentProjects")}</h3>
          {recentProjects.length === 0 ? 
            <p className="bg-bg-secondary border-bg-tertiary border-2 w-50 h-30 rounded text-center content-center text-text-muted text-xs">{t("noRecent")}</p> : null}
          <div className="flex flex-row flex-wrap gap-4">
          {recentProjects.map((project) => (
            <button
            key={project.filePath}
            className="bg-bg-secondary w-50 h-30 rounded text-left p-4 flex flex-col justify-between hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void openProjectFromPath(project.filePath)}
            disabled={isMutating}
            >
              <p className="text-text-primary text-sm font-semibold">{project.projectName}</p>
              {/** TODO make something like opened 1h ago **/}
              <span className="text-xs text-text-muted">{new Date(project.lastOpenedAt).toLocaleString()}</span>
            </button>
          ))}
          </div>
        </div>
        <div className="flex-1 bg-red flex flex-col gap-4">
          <button 
          className="w-50 h-30 rounded bg-accent-primary hover:bg-accent-hover" 
          onClick={() => void startNewProject()}>
            <p className=" text-text-primary">{t("newProject")}</p>
            <p className="bg-text-primary mx-4 rounded text-accent-primary mt-5 p-1">+ {t("newProjectButton")}</p>
          </button>
          <button 
          className="w-50 h-30 rounded bg-bg-tertiary hover:bg-bg-secondary" 
          onClick={() => void openProjectFromDialog()} disabled={isMutating}>
            <span className="inline-flex items-center justify-center gap-2">
              <Upload aria-hidden="true" className="h-4 w-4 text-text-muted" />
              <p className="text-text-muted">{t("openProject")}</p>
            </span>
          </button>
          <a 
          className="w-50 h-15 rounded bg-bg-secondary hover:bg-bg-tertiary items-center justify-center flex" 
          href="https://github.com/Cecax27/open-vfd-simulator"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-text-primary" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <p className="text-text-primary">{t("githubLink")}</p>
            </span>
          </a>
          <a 
          className="w-50 h-15 rounded bg-error/20 hover:bg-error/10 items-center justify-center flex" 
          href="https://github.com/Cecax27/open-vfd-simulator"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Heart className="text-error"/>
              <p className="text-text-primary">{t("donate")}</p>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
