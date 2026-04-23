import type { DeviceRecord, OperationMode } from "../../api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Slider } from "../ui/slider";
import type { DeviceDraft } from "../../types";
import clsx from "clsx";

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
          <p className="text-sm text-text-secondary">{operationModeLabel}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={
                draft.runtime.operation_mode === "local" ? "default" : "outline"
              }
              size="sm"
              onClick={() => onOperationModeChange("local")}
            >
              {localLabel}
            </Button>
            <Button
              type="button"
              variant={
                draft.runtime.operation_mode === "remote"
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => onOperationModeChange("remote")}
            >
              {remoteLabel}
            </Button>
          </div>
        </div>

        {!isRemote ? (
          <div className="space-y-4 rounded-lg bg-bg-tertiary p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  {speedReferenceLabel}
                </p>
                <Badge variant="secondary">
                  {draft.runtime.speed_reference_pct.toFixed(0)}%
                </Badge>
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
              <Button
                type="button"
                onClick={() => onLocalStatusChange("running")}
                className={clsx(
                  draft.runtime.status === "running" && "bg-success hover:bg-success/90",
                  draft.runtime.status === "stopped" && "border border-success bg-transparent text-success hover:bg-success/10",
                )}
              >
                {runLabel}
              </Button>
              <Button
                type="button"
                onClick={() => onLocalStatusChange("stopped")}
                className={clsx(
                  draft.runtime.status === "stopped" && "bg-error hover:bg-error/90",
                  draft.runtime.status === "running" && "border border-error bg-transparent text-error hover:bg-error/10",
                )}
              >
                {stopLabel}
              </Button>
              <Button type="button" variant="text" onClick={onResetFault}>
                {resetFaultLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg bg-bg-tertiary p-3">
            {!isOpcUaConfigured ? (
              <p className="text-sm text-error">
                {opcuaMappingDisabledLabel}
              </p>
            ) : null}
            {remoteInfoRows.map((row) => (
              <label key={row.label} className="block space-y-1">
                <span className="text-xs font-medium tracking-wide text-text-secondary">
                  {row.label}
                </span>
                <input
                  value={row.value}
                  disabled
                  className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                />
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
