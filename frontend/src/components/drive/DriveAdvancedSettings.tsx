import { ChevronDown, Cpu, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { LoadType } from "../../api";
import type { OpcUaBrowseItem, MotorModelSummary, VFDModelSummary } from "../../api";
import type { DeviceDraft } from "../../types";
import { OPCUA_TELEMETRY_SPECS } from "../../lib/opcuaTelemetry";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

type DriveAdvancedSettingsProps = {
  draft: DeviceDraft;
  onDraftChange: (draft: DeviceDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  title: string;
  nameLabel: string;
  accelerationLabel: string;
  decelerationLabel: string;
  loadTypeLabel: string;
  constantTorqueLabel: string;
  fanLabel: string;
  nominalLoadTorqueLabel: string;
  loadInertiaLabel: string;
  opcuaSpeedReferenceNodeLabel: string;
  opcuaRunStopNodeLabel: string;
  opcUaVariables: OpcUaBrowseItem[];
  opcuaTelemetryMappingLabel: string;
  expectedTypeLabel: string;
  availableOpcVariablesLabel: string;
  telemetryNodePlaceholder: string;
  telemetryVariableLabel: (labelKey: string) => string;
  expectedTypeTooltip: (expectedType: string) => string;
  motorModels: MotorModelSummary[];
  vfdModels: VFDModelSummary[];
  motorModelLabel: string;
  vfdModelLabel: string;
  noModelSelectedLabel: string;
};

export function DriveAdvancedSettings({
  draft,
  onDraftChange,
  onSubmit,
  title,
  nameLabel,
  accelerationLabel,
  decelerationLabel,
  loadTypeLabel,
  constantTorqueLabel,
  fanLabel,
  nominalLoadTorqueLabel,
  loadInertiaLabel,
  opcuaSpeedReferenceNodeLabel,
  opcuaRunStopNodeLabel,
  opcUaVariables,
  opcuaTelemetryMappingLabel,
  expectedTypeLabel,
  availableOpcVariablesLabel,
  telemetryNodePlaceholder,
  telemetryVariableLabel,
  expectedTypeTooltip,
  motorModels,
  vfdModels,
  motorModelLabel,
  vfdModelLabel,
  noModelSelectedLabel,
}: DriveAdvancedSettingsProps) {
  const [open, setOpen] = useState(false);
  const commandNodeSuggestionsId = "opcua-command-node-options";
  const telemetryNodeSuggestionsId = "opcua-telemetry-node-options";

  const selectedMotor = draft.motor_model_id
    ? motorModels.find((m) => m.id === draft.motor_model_id)
    : null;
  const selectedVfd = draft.vfd_model_id
    ? vfdModels.find((v) => v.id === draft.vfd_model_id)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-180" : "rotate-0")} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent forceMount className="pt-3 data-[state=closed]:hidden">
            <form id="drive-parameter-form" className="space-y-3" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-sm text-slate-600">{nameLabel}</span>
                <input
                  value={draft.name}
                  onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                  className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                />
              </label>

              {/* Read-only model references */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-md bg-bg-tertiary px-3 py-2">
                  <Cpu className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">{motorModelLabel}</p>
                    <p className="truncate text-xs font-medium text-text-secondary">
                      {selectedMotor ? selectedMotor.name : noModelSelectedLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-bg-tertiary px-3 py-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">{vfdModelLabel}</p>
                    <p className="truncate text-xs font-medium text-text-secondary">
                      {selectedVfd ? selectedVfd.name : noModelSelectedLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{accelerationLabel}</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={draft.runtime.acceleration_time_s}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        runtime: { ...draft.runtime, acceleration_time_s: Number(event.target.value) },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{decelerationLabel}</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={draft.runtime.deceleration_time_s}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        runtime: { ...draft.runtime, deceleration_time_s: Number(event.target.value) },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm text-slate-600">{loadTypeLabel}</span>
                <select
                  value={draft.load.load_type}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      load: { ...draft.load, load_type: event.target.value as LoadType },
                    })
                  }
                  className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                >
                  <option value="constant_torque">{constantTorqueLabel}</option>
                  <option value="fan">{fanLabel}</option>
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{nominalLoadTorqueLabel}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={draft.load.nominal_load_torque_nm}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        load: { ...draft.load, nominal_load_torque_nm: Number(event.target.value) },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{loadInertiaLabel}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={draft.load.load_inertia_kgm2}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        load: { ...draft.load, load_inertia_kgm2: Number(event.target.value) },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <datalist id={commandNodeSuggestionsId}>
                  {opcUaVariables.map((item) => (
                    <option key={`cmd-${item.node_id}`} value={item.node_id}>
                      {item.display_name}
                    </option>
                  ))}
                </datalist>
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{opcuaSpeedReferenceNodeLabel}</span>
                  <input
                    value={draft.opcua_mapping.speed_reference_node_id ?? ""}
                    placeholder="ns=2;s=Drive1/SpeedRef"
                    list={commandNodeSuggestionsId}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        opcua_mapping: {
                          ...draft.opcua_mapping,
                          speed_reference_node_id: event.target.value || null,
                        },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{opcuaRunStopNodeLabel}</span>
                  <input
                    value={draft.opcua_mapping.run_stop_node_id ?? ""}
                    placeholder="ns=2;s=Drive1/RunStop"
                    list={commandNodeSuggestionsId}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        opcua_mapping: {
                          ...draft.opcua_mapping,
                          run_stop_node_id: event.target.value || null,
                        },
                      })
                    }
                    className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                  />
                </label>
              </div>

              <div className="space-y-2 rounded-lg bg-bg-tertiary p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold font-space-grotesk text-text-secondary">{opcuaTelemetryMappingLabel}</h3>
                  <span className="text-xs text-text-muted">{availableOpcVariablesLabel}: {opcUaVariables.length}</span>
                </div>
                <datalist id={telemetryNodeSuggestionsId}>
                  {opcUaVariables.map((item) => (
                    <option key={item.node_id} value={item.node_id}>
                      {item.display_name}
                    </option>
                  ))}
                </datalist>
                <div className="space-y-2">
                  {OPCUA_TELEMETRY_SPECS.map((spec) => (
                    <div
                      key={spec.key}
                      className="grid grid-cols-1 items-center gap-2 bg-bg-tertiary px-2 py-2 sm:grid-cols-[minmax(180px,1fr),130px,1fr]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{telemetryVariableLabel(spec.labelKey)}</span>
                        <span
                          className="cursor-help rounded-full border border-slate-300 px-1.5 text-xs text-slate-600"
                          title={expectedTypeTooltip(spec.expectedType)}
                        >
                          i
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {expectedTypeLabel}: {spec.expectedType}
                      </span>
                      <input
                        value={draft.opcua_mapping.telemetry_node_ids[spec.key] ?? ""}
                        list={telemetryNodeSuggestionsId}
                        placeholder={telemetryNodePlaceholder}
                        onChange={(event) => {
                          const nextNode = event.target.value.trim();
                          const nextMap = { ...draft.opcua_mapping.telemetry_node_ids };
                          if (nextNode) {
                            nextMap[spec.key] = nextNode;
                          } else {
                            delete nextMap[spec.key];
                          }

                          onDraftChange({
                            ...draft,
                            opcua_mapping: {
                              ...draft.opcua_mapping,
                              telemetry_node_ids: nextMap,
                            },
                          });
                        }}
                        className="w-full text-accent-primary rounded-md px-3 py-2 text-sm font-jetbrains-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
