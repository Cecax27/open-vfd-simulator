import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Check, Cpu, Zap, X } from "lucide-react";

import type { MotorModelSummary, VFDModelSummary } from "../api";
import { getMotorModel } from "../api";
import { defaultDraft } from "../types";
import type { DeviceDraft } from "../types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const API_BASE_URL = "http://127.0.0.1:8000";

function thumbnailSrc(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

type WizardStep = 1 | 2 | 3;

type Props = {
  deviceCount: number;
  motorModels: MotorModelSummary[];
  vfdModels: VFDModelSummary[];
  onComplete: (draft: DeviceDraft) => void;
  onClose: () => void;
};

export function CreateDeviceWizard({ deviceCount, motorModels, vfdModels, onComplete, onClose }: Props) {
  const { t } = useTranslation();

  const [step, setStep] = useState<WizardStep>(1);
  const [deviceName, setDeviceName] = useState(`Drive ${deviceCount + 1}`);
  const [selectedMotorId, setSelectedMotorId] = useState<string | null>(
    motorModels.length > 0 ? motorModels[0].id : null,
  );
  const [selectedVfdId, setSelectedVfdId] = useState<string | null>(
    vfdModels.length > 0 ? vfdModels[0].id : null,
  );
  const [isCreating, setIsCreating] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  // Focus the name input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  // Pre-select first model when lists load (in case they loaded after mount)
  useEffect(() => {
    if (!selectedMotorId && motorModels.length > 0) {
      setSelectedMotorId(motorModels[0].id);
    }
  }, [motorModels]);

  useEffect(() => {
    if (!selectedVfdId && vfdModels.length > 0) {
      setSelectedVfdId(vfdModels[0].id);
    }
  }, [vfdModels]);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const base = defaultDraft(deviceName.trim() || `Drive ${deviceCount + 1}`);
      let draft: DeviceDraft = {
        ...base,
        name: deviceName.trim() || `Drive ${deviceCount + 1}`,
        motor_model_id: selectedMotorId ?? null,
        vfd_model_id: selectedVfdId ?? null,
      };

      // If a motor model is selected, populate motor params from it
      if (selectedMotorId) {
        try {
          const motorModel = await getMotorModel(selectedMotorId);
          draft = {
            ...draft,
            motor: {
              rated_power_w: motorModel.rated_power_w,
              rated_voltage_v: motorModel.rated_voltage_v,
              rated_current_a: motorModel.rated_current_a,
              rated_frequency_hz: motorModel.rated_frequency_hz,
              rated_speed_rpm: motorModel.rated_speed_rpm,
              pole_pairs: motorModel.pole_pairs,
              stator_resistance_ohm: motorModel.stator_resistance_ohm,
              rotor_resistance_ohm: motorModel.rotor_resistance_ohm,
              stator_inductance_h: motorModel.stator_inductance_h,
              rotor_inductance_h: motorModel.rotor_inductance_h,
              mutual_inductance_h: motorModel.mutual_inductance_h,
              inertia_kgm2: motorModel.inertia_kgm2,
              friction_coefficient: motorModel.friction_coefficient,
            },
          };
        } catch {
          // Fall back to default motor params if fetch fails
        }
      }

      onComplete(draft);
    } finally {
      setIsCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  const canProceedStep1 = deviceName.trim().length > 0;
  const canCreate = canProceedStep1;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div className="relative mx-4 flex w-full max-w-xl flex-col rounded-2xl bg-bg-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bg-tertiary px-6 py-4">
          <h2 className="font-space-grotesk text-lg font-semibold text-text-primary">
            {t("createDeviceWizardTitle")}
          </h2>
          <button
            className="rounded-md p-1 text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {(
            [
              { n: 1, label: t("wizardStepName") },
              { n: 2, label: t("wizardStepMotor") },
              { n: 3, label: t("wizardStepVfd") },
            ] as const
          ).map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-2">
              {idx > 0 && <div className="h-px w-6 bg-bg-tertiary" />}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    step > n
                      ? "bg-success text-green-900"
                      : step === n
                        ? "bg-primary text-bg-primary"
                        : "bg-bg-tertiary text-text-muted",
                  )}
                >
                  {step > n ? <Check className="h-3 w-3" /> : n}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    step === n ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ maxHeight: "60vh" }}>
          {step === 1 && (
            <StepName
              value={deviceName}
              onChange={setDeviceName}
              inputRef={nameInputRef}
              label={t("name")}
            />
          )}
          {step === 2 && (
            <StepModelSelect
              icon={<Cpu className="h-4 w-4" />}
              title={t("motorModel")}
              subtitle={t("selectMotorModel")}
              models={motorModels.map((m) => ({
                id: m.id,
                name: m.name,
                manufacturer: m.manufacturer,
                thumbnail_url: m.thumbnail_url,
                lines: [
                  `${(m.rated_power_w / 1000).toFixed(2)} kW`,
                  `${m.rated_voltage_v} V`,
                  `${m.rated_speed_rpm} rpm`,
                ],
              }))}
              selectedId={selectedMotorId}
              onSelect={setSelectedMotorId}
              noModelLabel={t("noModelSelected")}
            />
          )}
          {step === 3 && (
            <StepModelSelect
              icon={<Zap className="h-4 w-4" />}
              title={t("vfdModel")}
              subtitle={t("selectVfdModel")}
              models={vfdModels.map((v) => ({
                id: v.id,
                name: v.name,
                manufacturer: v.manufacturer,
                thumbnail_url: v.thumbnail_url,
                lines: [
                  v.rated_power_kva != null ? `${v.rated_power_kva} kVA` : "—",
                  `${v.rated_voltage_v} V`,
                  v.control_strategy.toUpperCase(),
                ],
              }))}
              selectedId={selectedVfdId}
              onSelect={setSelectedVfdId}
              noModelLabel={t("noModelSelected")}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-bg-tertiary px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as WizardStep)}
          >
            {step === 1 ? (
              t("cancel") ?? "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                {t("back") ?? "Back"}
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !canProceedStep1}
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
            >
              {t("next") ?? "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canCreate || isCreating}
              onClick={() => void handleCreate()}
            >
              {isCreating ? t("loading") : t("addDevice")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepName({
  value,
  onChange,
  inputRef,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-bg-secondary px-3 py-2 text-sm text-text-primary font-jetbrains-mono focus:outline-none focus:ring-2 focus:ring-primary"
        maxLength={80}
      />
    </label>
  );
}

type ModelCard = {
  id: string;
  name: string;
  manufacturer: string | null;
  thumbnail_url: string | null;
  lines: string[];
};

function StepModelSelect({
  icon,
  title,
  subtitle,
  models,
  selectedId,
  onSelect,
  noModelLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  models: ModelCard[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  noModelLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-text-secondary">
        {icon}
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-text-muted">— {subtitle}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* No model option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition",
            selectedId === null
              ? "border-primary bg-primary/10"
              : "border-bg-tertiary bg-bg-secondary hover:border-primary/50",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-text-muted">
            —
          </div>
          <span className="text-xs text-text-secondary">{noModelLabel}</span>
          {selectedId === null && (
            <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
          )}
        </button>

        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition",
              selectedId === model.id
                ? "border-primary bg-primary/10"
                : "border-bg-tertiary bg-bg-secondary hover:border-primary/50",
            )}
          >
            {/* Thumbnail */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-tertiary">
              {model.thumbnail_url ? (
                <img
                  src={thumbnailSrc(model.thumbnail_url)}
                  alt={model.name}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-xs text-text-muted">?</span>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{model.name}</p>
              {model.manufacturer && (
                <p className="truncate text-xs text-text-muted">{model.manufacturer}</p>
              )}
              <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                {model.lines.map((line, i) => (
                  <span key={i} className="font-jetbrains-mono text-xs text-text-secondary">
                    {line}
                  </span>
                ))}
              </div>
            </div>

            {selectedId === model.id && (
              <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
