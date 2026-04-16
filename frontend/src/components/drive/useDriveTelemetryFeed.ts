import { useEffect, useRef, useState } from "react";

import type { DeviceRecord } from "../../api";

export type TrendSample = {
  timeMs: number;
  outputFrequencyHz: number;
  outputCurrentA: number;
};

export function useDriveTelemetryFeed(selectedDevice: DeviceRecord | null, paused = false) {
  const [trendSamples, setTrendSamples] = useState<TrendSample[]>([]);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const bufferedSamplesRef = useRef<TrendSample[]>([]);

  function appendSamples(incoming: TrendSample[]) {
    if (incoming.length === 0) {
      return;
    }
    setTrendSamples((current) => {
      const next = [...current, ...incoming];
      return next.slice(-180);
    });
  }

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    const sample: TrendSample = {
      timeMs: Date.now(),
      outputFrequencyHz: selectedDevice.telemetry.output_frequency_hz,
      outputCurrentA: selectedDevice.telemetry.output_current_a,
    };

    if (paused) {
      bufferedSamplesRef.current.push(sample);
      return;
    }

    if (bufferedSamplesRef.current.length > 0) {
      const buffered = bufferedSamplesRef.current;
      bufferedSamplesRef.current = [];
      appendSamples([...buffered, sample]);
      return;
    }

    appendSamples([sample]);
  }, [selectedDevice?.id, selectedDevice?.telemetry.output_frequency_hz, selectedDevice?.telemetry.output_current_a, paused]);

  useEffect(() => {
    if (paused || bufferedSamplesRef.current.length === 0) {
      return;
    }

    const buffered = bufferedSamplesRef.current;
    bufferedSamplesRef.current = [];
    appendSamples(buffered);
  }, [paused]);

  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const row = `${timestamp} | mode=${selectedDevice.runtime.operation_mode} | status=${selectedDevice.runtime.status} | fault=${selectedDevice.telemetry.fault_code}`;
    setLogEntries((current) => {
      if (current[0] === row) {
        return current;
      }
      return [row, ...current].slice(0, 40);
    });
  }, [selectedDevice?.id, selectedDevice?.runtime.operation_mode, selectedDevice?.runtime.status, selectedDevice?.telemetry.fault_code]);

  useEffect(() => {
    setTrendSamples([]);
    setLogEntries([]);
    bufferedSamplesRef.current = [];
  }, [selectedDevice?.id]);

  return { trendSamples, logEntries };
}
