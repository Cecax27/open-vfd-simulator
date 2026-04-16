import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { updateRuntime } from "../api";
import { DriveAdvancedSettings } from "../components/drive/DriveAdvancedSettings";
import { DriveEventLog } from "../components/drive/DriveEventLog";
import { DriveInputControls } from "../components/drive/DriveInputControls";
import { DriveMetricsPanel } from "../components/drive/DriveMetricsPanel";
import { DriveTrendChart } from "../components/drive/DriveTrendChart";
import { useDriveTelemetryFeed } from "../components/drive/useDriveTelemetryFeed";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAppContext } from "../context/AppContext";
import { OPCUA_TELEMETRY_SPECS, getTelemetryValueByKey } from "../lib/opcuaTelemetry";

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
    configuration,
    opcUaBrowse,
  } = useAppContext();
  const [isChartPaused, setIsChartPaused] = useState(false);
  const { trendSamples, logEntries } = useDriveTelemetryFeed(selectedDevice, isChartPaused);

  const isOpcUaConfigured = Boolean(configuration.opcua.enabled && configuration.opcua.endpoint_url);
  const isRemote = draft.runtime.operation_mode === "remote";

  const remoteInfoRows = useMemo(
    () => [
      {
        label: t("opcuaSpeedReferenceNode"),
        value: selectedDevice?.opcua_mapping.speed_reference_node_id ?? "-",
      },
      {
        label: t("opcuaRunStopNode"),
        value: selectedDevice?.opcua_mapping.run_stop_node_id ?? "-",
      },
      {
        label: t("speedReference"),
        value: `${selectedDevice?.runtime.speed_reference_pct ?? 0}%`,
      },
      {
        label: t("telemetryStatus"),
        value: selectedDevice?.runtime.status ?? "-",
      },
    ],
    [selectedDevice, t],
  );

  async function sendLocalStatus(status: "running" | "stopped") {
    if (!draft.id) {
      return;
    }
    await updateRuntime(draft.id, { status });
    setDraft({
      ...draft,
      runtime: {
        ...draft.runtime,
        status,
      },
    });
  }

  async function sendLocalSpeed(speedReferencePct: number) {
    if (!draft.id) {
      return;
    }
    await updateRuntime(draft.id, { speed_reference_pct: speedReferencePct });
  }

  async function changeOperationMode(operationMode: "local" | "remote") {
    setDraft({
      ...draft,
      runtime: {
        ...draft.runtime,
        operation_mode: operationMode,
      },
    });

    if (!draft.id) {
      return;
    }
    await updateRuntime(draft.id, { operation_mode: operationMode });
  }

  return (
    <section className="flex min-w-full flex-col gap-4 px-2 pb-2">
      <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Button type="submit" form="drive-parameter-form" disabled={isMutating}>
          {t("saveDevice")}
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">Drive parameter set</h2>
        <Button type="button" variant="outline" onClick={() => navigate("/devices")}>
          {t("backToDevices")}
        </Button>
      </header>

      <div className="grid min-h-0 grid-cols-2 gap-4 xl:grid-cols-[minmax(320px,460px),1fr]">
        <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto pr-1">
          <DriveInputControls
            title={t("inputControls")}
            operationModeLabel={t("operationMode")}
            localLabel={t("localMode")}
            remoteLabel={t("remoteMode")}
            speedReferenceLabel={t("speedReference")}
            runLabel={t("run")}
            stopLabel={t("stop")}
            resetFaultLabel={t("resetFault")}
            opcuaMappingDisabledLabel={t("opcuaMappingDisabled")}
            draft={draft}
            isRemote={isRemote}
            isOpcUaConfigured={isOpcUaConfigured}
            remoteInfoRows={remoteInfoRows}
            onDraftChange={setDraft}
            onOperationModeChange={(mode) => void changeOperationMode(mode)}
            onLocalSpeedCommit={(speed) => void sendLocalSpeed(speed)}
            onLocalStatusChange={(status) => void sendLocalStatus(status)}
            onResetFault={() => {
              if (draft.id) {
                void updateRuntime(draft.id, { fault_reset: true });
              }
            }}
            selectedDevice={selectedDevice}
          />

          <DriveAdvancedSettings
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={saveDeviceDraft}
            title={t("advancedParameters")}
            nameLabel={t("name")}
            accelerationLabel={t("acceleration")}
            decelerationLabel={t("deceleration")}
            loadTypeLabel={t("loadType")}
            constantTorqueLabel={t("constantTorque")}
            fanLabel={t("fan")}
            nominalLoadTorqueLabel={t("nominalLoadTorque")}
            loadInertiaLabel={t("loadInertia")}
            opcuaSpeedReferenceNodeLabel={t("opcuaSpeedReferenceNode")}
            opcuaRunStopNodeLabel={t("opcuaRunStopNode")}
            opcUaVariables={opcUaBrowse?.items ?? []}
            opcuaTelemetryMappingLabel={t("opcuaTelemetryMapping")}
            expectedTypeLabel={t("opcuaExpectedType")}
            availableOpcVariablesLabel={t("opcuaAvailableVariables")}
            telemetryNodePlaceholder={t("opcuaTelemetryNodePlaceholder")}
            telemetryVariableLabel={(labelKey) => t(labelKey)}
            expectedTypeTooltip={(expectedType) => t("opcuaExpectedTypeTooltip", { type: expectedType })}
          />
        </div>

        <div className="space-y-4">
          <DriveTrendChart
            selectedDevice={selectedDevice}
            samples={trendSamples}
            telemetryTitle={t("telemetryTitle")}
            emptyLabel={t("collectSamples")}
            pauseLabel={t("pauseChart")}
            resumeLabel={t("resumeChart")}
            paused={isChartPaused}
            onTogglePause={() => setIsChartPaused((current) => !current)}
          />
          <DriveMetricsPanel
            selectedDevice={selectedDevice}
            voltageLabel={t("telemetryOutVoltage")}
            temperatureLabel={t("temperature")}
          />
          <DriveEventLog title={t("eventLog")} emptyLabel={t("noLogYet")} entries={logEntries} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t("telemetryAvailableData")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-2 py-2 font-medium">{t("telemetryVariable")}</th>
                      <th className="px-2 py-2 font-medium">{t("telemetryValue")}</th>
                      <th className="px-2 py-2 font-medium">{t("telemetryUnit")}</th>
                      <th className="px-2 py-2 font-medium">{t("opcuaMappedNode")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OPCUA_TELEMETRY_SPECS.map((spec) => (
                      <tr key={spec.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-2 text-slate-700">{t(spec.labelKey)}</td>
                        <td className="px-2 py-2 text-slate-900">{String(getTelemetryValueByKey(selectedDevice, spec.key))}</td>
                        <td className="px-2 py-2 text-slate-600">{spec.unitKey ? t(spec.unitKey) : "-"}</td>
                        <td className="px-2 py-2 text-slate-600">
                          {selectedDevice?.opcua_mapping.telemetry_node_ids[spec.key] ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
