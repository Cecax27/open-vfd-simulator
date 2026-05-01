import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";
import { CreateDeviceWizard } from "../components/CreateDeviceWizard";
import clsx from "clsx";
import { ArrowRight, Plus } from "lucide-react";

export function DevicesPage() {
  const { t } = useTranslation();
  const {
    devices,
    isLoading,
    isMutating,
    refreshDevices,
    createDeviceFromWizard,
    openEditDevicePage,
    motorModels,
    vfdModels,
  } = useAppContext();

  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>{t("deviceListTitle")}</h2>
        </div>
        {isLoading ? <p className="caption">{t("loading")}</p> : null}
        <div className="device-grid">
          {devices.map((device) => (
            <article key={device.id} className="device-tile">
              <div className="flex flex-row justify-between items-start">
                <h3 className="font-space-grotesk text-text-primary text-lg font-bold">
                  {device.name}
                </h3>
                <p
                  className={clsx("uppercase text-xs px-3 py-1 rounded-full", {
                    "bg-success text-green-900":
                      device.runtime.status === "running",
                    "bg-error text-red-900": device.runtime.status === "stopped",
                  })}
                >
                  {device.runtime.status}
                </p>
              </div>
              <button onClick={() => openEditDevicePage(device)} className="text-primary flex-row flex justify-end text-sm">
                {t("configure")}
                <ArrowRight className="w-4" />
              </button>
            </article>
          ))}
          <button
            onClick={() => setWizardOpen(true)}
            disabled={isMutating}
            className="p-5 border-3 border-dashed border-bg-tertiary rounded-lg text-text-secondary flex flex-col items-center justify-center gap-2 h-[150px]"
          >
            <Plus />
            {t("addDevice")}
          </button>
        </div>
      </section>

      {wizardOpen && (
        <CreateDeviceWizard
          deviceCount={devices.length}
          motorModels={motorModels}
          vfdModels={vfdModels}
          onComplete={(draft) => {
            setWizardOpen(false);
            void createDeviceFromWizard(draft);
          }}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </>
  );
}
