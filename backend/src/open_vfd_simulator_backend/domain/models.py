from __future__ import annotations

from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class DeviceStatus(str, Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    FAULT = "fault"


class LoadType(str, Enum):
    CONSTANT_TORQUE = "constant_torque"
    FAN = "fan"


class MotorParameters(BaseModel):
    rated_power_w: float = Field(default=500.0, gt=0)
    rated_voltage_v: float = Field(default=230.0, gt=0)
    rated_current_a: float = Field(default=3.5, gt=0)
    rated_frequency_hz: float = Field(default=50.0, gt=0)
    rated_speed_rpm: float = Field(default=1450.0, gt=0)
    pole_pairs: int = Field(default=2, gt=0)
    stator_resistance_ohm: float = Field(default=5.1, gt=0)
    rotor_resistance_ohm: float = Field(default=4.8, gt=0)
    stator_inductance_h: float = Field(default=0.18, gt=0)
    rotor_inductance_h: float = Field(default=0.18, gt=0)
    mutual_inductance_h: float = Field(default=0.158, gt=0)
    inertia_kgm2: float = Field(default=0.0075, gt=0)
    friction_coefficient: float = Field(default=0.01, ge=0)


class LoadParameters(BaseModel):
    load_type: LoadType = LoadType.CONSTANT_TORQUE
    nominal_load_torque_nm: float = Field(default=2.0, ge=0)
    load_inertia_kgm2: float = Field(default=0.005, ge=0)


class RuntimeCommand(BaseModel):
    speed_reference_pct: float = Field(default=0.0, ge=0, le=100)
    acceleration_time_s: float = Field(default=5.0, gt=0)
    deceleration_time_s: float = Field(default=5.0, gt=0)
    status: DeviceStatus = DeviceStatus.STOPPED


class TelemetrySnapshot(BaseModel):
    fault_code: int = 0
    commanded_frequency_hz: float = 0.0
    output_frequency_hz: float = 0.0
    output_voltage_v: float = 0.0
    output_current_a: float = 0.0
    speed_rpm: float = 0.0
    electromagnetic_torque_nm: float = 0.0
    load_torque_nm: float = 0.0
    mechanical_power_w: float = 0.0
    estimated_temperature_c: float = 25.0


class DeviceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=1, max_length=120)
    template_key: str = Field(default="im_3ph_basic")
    motor: MotorParameters = Field(default_factory=MotorParameters)
    load: LoadParameters = Field(default_factory=LoadParameters)
    runtime: RuntimeCommand = Field(default_factory=RuntimeCommand)
    telemetry: TelemetrySnapshot = Field(default_factory=TelemetrySnapshot)


class DeviceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    template_key: str = Field(default="im_3ph_basic")
    motor: MotorParameters = Field(default_factory=MotorParameters)
    load: LoadParameters = Field(default_factory=LoadParameters)


class RuntimeCommandUpdateRequest(BaseModel):
    speed_reference_pct: float | None = Field(default=None, ge=0, le=100)
    acceleration_time_s: float | None = Field(default=None, gt=0)
    deceleration_time_s: float | None = Field(default=None, gt=0)
    status: DeviceStatus | None = None
    fault_reset: bool = False


class DeviceConfigurationUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    motor: MotorParameters | None = None
    load: LoadParameters | None = None


class SimulationStepRequest(BaseModel):
    delta_time_s: float = Field(default=0.1, gt=0, le=10)


class SoftwareConfiguration(BaseModel):
    simulation_step_ms: int = Field(default=100, ge=10, le=2000)


class SoftwareConfigurationUpdateRequest(BaseModel):
    simulation_step_ms: int | None = Field(default=None, ge=10, le=2000)
