import { ChevronDown } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { LoadType } from "../../api";
import type { DeviceDraft } from "../../types";
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
}: DriveAdvancedSettingsProps) {
  const [open, setOpen] = useState(false);

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
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>

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
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{opcuaSpeedReferenceNodeLabel}</span>
                  <input
                    value={draft.opcua_mapping.speed_reference_node_id ?? ""}
                    placeholder="ns=2;s=Drive1/SpeedRef"
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        opcua_mapping: {
                          ...draft.opcua_mapping,
                          speed_reference_node_id: event.target.value || null,
                        },
                      })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">{opcuaRunStopNodeLabel}</span>
                  <input
                    value={draft.opcua_mapping.run_stop_node_id ?? ""}
                    placeholder="ns=2;s=Drive1/RunStop"
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        opcua_mapping: {
                          ...draft.opcua_mapping,
                          run_stop_node_id: event.target.value || null,
                        },
                      })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
