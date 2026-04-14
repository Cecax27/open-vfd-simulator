import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import { Language } from "../types";

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    language,
    simulationStepInput,
    setSimulationStepInput,
    configuration,
    isMutating,
    applySettings,
    changeLanguage,
  } = useAppContext();

  return (
    <section className="panel view-page">
      <h2>{t("softwareTitle")}</h2>
      <form className="form-grid" onSubmit={applySettings}>
        <label>
          <span>{t("language")}</span>
          <select
            value={language}
            onChange={(event) => changeLanguage(event.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="es">Espanol</option>
          </select>
        </label>
        <label>
          <span>{t("simulationStep")}</span>
          <input
            type="number"
            min={10}
            max={2000}
            step={10}
            value={simulationStepInput}
            onChange={(event) => setSimulationStepInput(Number(event.target.value))}
          />
        </label>
        <p className="caption">
          {t("activeStep")}: {configuration.simulation_step_ms} ms
        </p>
        <div className="row-actions">
          <button type="submit" disabled={isMutating}>
            {t("saveSettings")}
          </button>
        </div>
      </form>
    </section>
  );
}
