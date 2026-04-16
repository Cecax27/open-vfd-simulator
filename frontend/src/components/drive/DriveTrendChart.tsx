import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { DeviceRecord } from "../../api";
import type { TrendSample } from "./useDriveTelemetryFeed";

type DriveTrendChartProps = {
  selectedDevice: DeviceRecord | null;
  samples: TrendSample[];
  telemetryTitle: string;
  emptyLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  paused: boolean;
  onTogglePause: () => void;
};

export function DriveTrendChart({
  selectedDevice,
  samples,
  telemetryTitle,
  emptyLabel,
  pauseLabel,
  resumeLabel,
  paused,
  onTogglePause,
}: DriveTrendChartProps) {
  const statusBadgeVariant =
    selectedDevice?.runtime.status === "fault"
      ? "destructive"
      : selectedDevice?.runtime.status === "running"
        ? "default"
        : "secondary";

  const option = useMemo(() => {
    if (samples.length < 2) {
      return null;
    }

    const labels = samples.map((sample) => new Date(sample.timeMs).toLocaleTimeString());
    return {
      animation: false,
      tooltip: {
        trigger: "axis",
      },
      legend: {
        top: 0,
        textStyle: {
          color: "#334155",
        },
      },
      grid: {
        left: 52,
        right: 54,
        top: 44,
        bottom: 84,
      },
      brush: {
        toolbox: ["lineX", "rect", "clear"],
        xAxisIndex: 0,
      },
      toolbox: {
        right: 8,
        feature: {
          dataZoom: {
            yAxisIndex: "none",
          },
          brush: {
            type: ["lineX", "rect", "clear"],
          },
          restore: {},
          saveAsImage: {},
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLabel: {
          color: "#64748b",
          hideOverlap: true,
        },
        axisLine: {
          lineStyle: { color: "#cbd5e1" },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Hz",
          nameTextStyle: { color: "#0f766e" },
          axisLabel: { color: "#0f766e" },
          splitLine: { lineStyle: { color: "#e2e8f0" } },
        },
        {
          type: "value",
          name: "A",
          nameTextStyle: { color: "#0369a1" },
          axisLabel: { color: "#0369a1" },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 22,
          bottom: 24,
        },
      ],
      series: [
        {
          name: "Frequency",
          type: "line",
          smooth: true,
          showSymbol: false,
          yAxisIndex: 0,
          itemStyle: { color: "#0f766e" },
          lineStyle: { width: 3, color: "#0f766e" },
          areaStyle: {
            color: "rgba(15,118,110,0.10)",
          },
          data: samples.map((sample) => sample.outputFrequencyHz),
        },
        {
          name: "Current",
          type: "line",
          smooth: true,
          showSymbol: false,
          yAxisIndex: 1,
          itemStyle: { color: "#0369a1" },
          lineStyle: { width: 3, color: "#0369a1" },
          areaStyle: {
            color: "rgba(3,105,161,0.10)",
          },
          data: samples.map((sample) => sample.outputCurrentA),
        },
      ],
    };
  }, [samples]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{telemetryTitle}</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onTogglePause}>
              {paused ? resumeLabel : pauseLabel}
            </Button>
            {selectedDevice ? <Badge variant={statusBadgeVariant}>{selectedDevice.runtime.status}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {option ? (
          <ReactECharts option={option} notMerge lazyUpdate style={{ height: 360, width: "100%" }} />
        ) : (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
