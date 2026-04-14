import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { LoadType } from "../api";
import { useAppContext } from "../context/AppContext";
import { MotorSpeedChart } from "../components/MotorSpeedChart";
import { updateRuntime } from "../api";

export function DeviceConfigPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    editMode,
    draft,
    setDraft,
    isMutating,
    saveDeviceDraft,
    selectedDevice,
    speedHistory,
  } = useAppContext();

  const telemetryRows = useMemo(() => {
    if (!selectedDevice) {
      return [] as Array<{ label: string; value: string }>;
    }
    return [
      { label: t("telemetryStatus"), value: selectedDevice.runtime.status },
      { label: t("telemetryFault"), value: String(selectedDevice.telemetry.fault_code) },
      { label: t("telemetryCmdFreq"), value: `${selectedDevice.telemetry.commanded_frequency_hz.toFixed(1)} Hz` },
      { label: t("telemetryOutFreq"), value: `${selectedDevice.telemetry.output_frequency_hz.toFixed(1)} Hz` },
      { label: t("telemetryOutVoltage"), value: `${selectedDevice.telemetry.output_voltage_v.toFixed(1)} V` },
      { label: t("telemetryOutCurrent"), value: `${selectedDevice.telemetry.output_current_a.toFixed(2)} A` },
      { label: t("telemetryMotorSpeed"), value: `${selectedDevice.telemetry.speed_rpm.toFixed(1)} rpm` },
    ];
  }, [selectedDevice, t]);

  return (
    <section className="view-page-grid">
      <article className="panel view-page">
        <div className="panel-head">
          <h2>{editMode === "create" ? t("createDeviceTitle") : t("editDeviceTitle")}</h2>
          <button onClick={() => navigate("/devices")}>{t("backToDevices")}</button>
        </div>
        <form className="form-grid" onSubmit={saveDeviceDraft}>
          <label>
            <span>{t("name")}</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            <span>{t("speedReference")}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.runtime.speed_reference_pct}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  runtime: { ...draft.runtime, speed_reference_pct: Number(event.target.value) },
                })
              }
            />
          </label>
          <label>
            <span>{t("acceleration")}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={draft.runtime.acceleration_time_s}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  runtime: { ...draft.runtime, acceleration_time_s: Number(event.target.value) },
                })
              }
            />
          </label>
          <label>
            <span>{t("deceleration")}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={draft.runtime.deceleration_time_s}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  runtime: { ...draft.runtime, deceleration_time_s: Number(event.target.value) },
                })
              }
            />
          </label>
          <label>
            <span>{t("loadType")}</span>
            <select
              value={draft.load.load_type}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  load: { ...draft.load, load_type: event.target.value as LoadType },
                })
              }
            >
              <option value="constant_torque">{t("constantTorque")}</option>
              <option value="fan">{t("fan")}</option>
            </select>
          </label>
          <label>
            <span>{t("nominalLoadTorque")}</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={draft.load.nominal_load_torque_nm}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  load: { ...draft.load, nominal_load_torque_nm: Number(event.target.value) },
                })
              }
            />
          </label>
          <label>
            <span>{t("loadInertia")}</span>
            <input
              type="number"
              min={0}
              step={0.001}
              value={draft.load.load_inertia_kgm2}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  load: { ...draft.load, load_inertia_kgm2: Number(event.target.value) },
                })
              }
            />
          </label>
          <div className="row-actions">
            <button type="submit" disabled={isMutating}>
              {t("saveDevice")}
            </button>
            {editMode === "edit" && draft.id ? (
              <>
                <button
                  type="button"
                  onClick={() => void updateRuntime(draft.id!, { status: "running" })}
                >
                  {t("run")}
                </button>
                <button
                  type="button"
                  onClick={() => void updateRuntime(draft.id!, { status: "stopped" })}
                >
                  {t("stop")}
                </button>
                <button
                  type="button"
                  onClick={() => void updateRuntime(draft.id!, { fault_reset: true })}
                >
                  {t("resetFault")}
                </button>
              </>
            ) : null}
          </div>
        </form>
      </article>

      <article className="panel view-page">
        <h2>{t("telemetryTitle")}</h2>
        {selectedDevice ? (
          <>
            <ul className="telemetry-list">
              {telemetryRows.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
            <h3 className="chart-title">{t("chartTitle")}</h3>
            <MotorSpeedChart samples={speedHistory} emptyLabel={t("collectSamples")} />
          </>
        ) : (
          <p className="caption">{t("collectSamples")}</p>
        )}
      </article>
    </section>
  );
}
