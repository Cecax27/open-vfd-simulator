import type { DeviceRecord } from "../../api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type DriveMetricsPanelProps = {
  selectedDevice: DeviceRecord | null;
  voltageLabel: string;
  temperatureLabel: string;
};

export function DriveMetricsPanel({ selectedDevice, voltageLabel, temperatureLabel }: DriveMetricsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{voltageLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-slate-800">
            {selectedDevice ? `${selectedDevice.telemetry.output_voltage_v.toFixed(1)} V` : "0.0 V"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{temperatureLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-slate-800">
            {selectedDevice ? `${selectedDevice.telemetry.estimated_temperature_c.toFixed(1)} C` : "25.0 C"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
