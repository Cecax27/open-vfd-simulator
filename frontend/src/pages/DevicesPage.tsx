import { useTranslation } from "react-i18next";
import { useAppContext } from "../context/AppContext";

export function DevicesPage() {
  const { t } = useTranslation();
  const { devices, isLoading, isMutating, refreshDevices, openCreateDevicePage, openEditDevicePage } =
    useAppContext();

  return (
    <section className="panel view-page">
      <div className="panel-head">
        <h2>{t("deviceListTitle")}</h2>
        <div className="row-actions">
          <button onClick={() => void refreshDevices()} disabled={isMutating || isLoading}>
            {t("refresh")}
          </button>
          <button onClick={openCreateDevicePage} disabled={isMutating}>
            {t("addDevice")}
          </button>
        </div>
      </div>
      {isLoading ? <p className="caption">{t("loading")}</p> : null}
      {!isLoading && devices.length === 0 ? <p className="caption">{t("noDevices")}</p> : null}
      <div className="device-grid">
        {devices.map((device) => (
          <article key={device.id} className="device-tile">
            <h3>{device.name}</h3>
            <p>{device.runtime.status}</p>
            <p>{device.telemetry.speed_rpm.toFixed(1)} rpm</p>
            <button onClick={() => openEditDevicePage(device)}>{t("configure")}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
