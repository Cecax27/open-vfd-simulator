from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SimulationInputs:
    speed_reference_pct: float
    acceleration_time_s: float
    deceleration_time_s: float
    rated_frequency_hz: float
    rated_voltage_v: float


@dataclass(slots=True)
class SimulationOutputs:
    commanded_frequency_hz: float
    output_frequency_hz: float
    output_voltage_v: float
    output_current_a: float
    speed_rpm: float
    electromagnetic_torque_nm: float
    load_torque_nm: float
    mechanical_power_w: float


class SimulationAdapter:
    def step(self, delta_time_s: float, inputs: SimulationInputs) -> SimulationOutputs:
        raise NotImplementedError
