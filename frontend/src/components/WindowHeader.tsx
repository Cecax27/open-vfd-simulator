import { useTranslation } from "react-i18next";

import { useAppContext } from "../context/AppContext";

export function WindowHeader() {
  const { t } = useTranslation();
  const { projectName, projectPath, projectDirty } = useAppContext();

  return (
    <header className="window-header">
      <div>
        <h1 className="text-primary text-2xl font-extrabold font-space-grotesk">{t("appTitle")}</h1>
      </div>
      <div className="window-project-meta">
        
      </div>
    </header>
  );
}
