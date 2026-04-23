import { useTranslation } from "react-i18next";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
    <section className="panel view-page space-y-4">
      <h2>{t("softwareTitle")}</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("softwareTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={applySettings}>
            <label className="block space-y-1">
              <span className="text-sm text-slate-600">{t("language")}</span>
              <select
                value={language}
                onChange={(event) => changeLanguage(event.target.value as Language)}
                className="w-full rounded-md px-3 py-2 text-sm font-jetbrains-mono text-accent-primary"
              >
                <option value="en">English</option>
                <option value="es">Espanol</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-slate-600">{t("simulationStep")}</span>
              <input
                type="number"
                min={10}
                max={2000}
                step={10}
                value={simulationStepInput}
                onChange={(event) => setSimulationStepInput(Number(event.target.value))}
                className="w-full rounded-md px-3 py-2 text-sm font-jetbrains-mono text-accent-primary"
              />
            </label>

            <p className="rounded-lg bg-bg-tertiary px-3 py-3 text-sm text-text-secondary">
              {t("activeStep")}: {configuration.simulation_step_ms} ms
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={isMutating}>
                {t("saveSettings")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
