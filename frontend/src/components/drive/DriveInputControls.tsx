import type { DeviceRecord, OperationMode } from "../../api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Slider } from "../ui/slider";
import type { DeviceDraft } from "../../types";

type RemoteInfoRow = {
  label: string;
  value: string;
};

type DriveInputControlsProps = {
  title: string;
  operationModeLabel: string;
  localLabel: string;
  remoteLabel: string;
  speedReferenceLabel: string;
  runLabel: string;
  stopLabel: string;
  resetFaultLabel: string;
  opcuaMappingDisabledLabel: string;
  draft: DeviceDraft;
  isRemote: boolean;
  isOpcUaConfigured: boolean;
  remoteInfoRows: RemoteInfoRow[];
  onDraftChange: (draft: DeviceDraft) => void;
  onOperationModeChange: (mode: OperationMode) => void;
  onLocalSpeedCommit: (speed: number) => void;
  onLocalStatusChange: (status: "running" | "stopped") => void;
  onResetFault: () => void;
  selectedDevice: DeviceRecord | null;
};

export function DriveInputControls({
  title,
  operationModeLabel,
  localLabel,
  remoteLabel,
  speedReferenceLabel,
  runLabel,
  stopLabel,
  resetFaultLabel,
  opcuaMappingDisabledLabel,
  draft,
  isRemote,
  isOpcUaConfigured,
  remoteInfoRows,
  onDraftChange,
  onOperationModeChange,
  onLocalSpeedCommit,
  onLocalStatusChange,
  onResetFault,
}: DriveInputControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">{operationModeLabel}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={draft.runtime.operation_mode === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => onOperationModeChange("local")}
            >
              {localLabel}
            </Button>
            <Button
              type="button"
              variant={draft.runtime.operation_mode === "remote" ? "default" : "outline"}
              size="sm"
              onClick={() => onOperationModeChange("remote")}
            >
              {remoteLabel}
            </Button>
          </div>
        </div>

        {!isRemote ? (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{speedReferenceLabel}</p>
                <Badge variant="secondary">{draft.runtime.speed_reference_pct.toFixed(0)}%</Badge>
              </div>
              <Slider
                value={[draft.runtime.speed_reference_pct]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  onDraftChange({
                    ...draft,
                    runtime: { ...draft.runtime, speed_reference_pct: value },
                  })
                }
                onValueCommit={([value]) => onLocalSpeedCommit(value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => onLocalStatusChange("running")}>{runLabel}</Button>
              <Button type="button" variant="secondary" onClick={() => onLocalStatusChange("stopped")}>{stopLabel}</Button>
              <Button type="button" variant="outline" onClick={onResetFault}>{resetFaultLabel}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            {!isOpcUaConfigured ? <p className="text-sm text-amber-800">{opcuaMappingDisabledLabel}</p> : null}
            {remoteInfoRows.map((row) => (
              <label key={row.label} className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</span>
                <input value={row.value} disabled className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
