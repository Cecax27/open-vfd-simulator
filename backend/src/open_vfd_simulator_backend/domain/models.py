from __future__ import annotations

from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class DeviceStatus(str, Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    FAULT = "fault"


class OperationMode(str, Enum):
    LOCAL = "local"
    REMOTE = "remote"


# Fault code raised when a device is in REMOTE mode but OPC UA is not ready
# (disabled, no endpoint, or no nodes mapped on the device).
FAULT_REMOTE_UNCONFIGURED = 2001


class LoadType(str, Enum):
    CONSTANT_TORQUE = "constant_torque"
    FAN = "fan"


class OPCUAConnectionState(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


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
    operation_mode: OperationMode = OperationMode.LOCAL


class DeviceOpcUaMapping(BaseModel):
    speed_reference_node_id: str | None = Field(default=None, min_length=1)
    run_stop_node_id: str | None = Field(default=None, min_length=1)
    telemetry_node_ids: dict[str, str] = Field(default_factory=dict)

    @field_validator("telemetry_node_ids", mode="before")
    @classmethod
    def normalize_telemetry_node_ids(cls, value: object) -> dict[str, str]:
        if not isinstance(value, dict):
            return {}
        normalized: dict[str, str] = {}
        for key, node_id in value.items():
            if not isinstance(key, str) or key not in OPCUA_TELEMETRY_VARIABLE_TYPES:
                continue
            if not isinstance(node_id, str):
                continue
            trimmed = node_id.strip()
            if not trimmed:
                continue
            normalized[key] = trimmed
        return normalized


class OPCUAClientConfiguration(BaseModel):
    enabled: bool = False
    endpoint_url: str | None = Field(default=None, min_length=1)
    request_timeout_s: float = Field(default=2.0, ge=0.1, le=30.0)


class OPCUAConnectionStatus(BaseModel):
    state: OPCUAConnectionState = OPCUAConnectionState.DISCONNECTED
    is_configured: bool = False
    endpoint_url: str | None = None
    last_error: str | None = None


class OPCUABrowseItem(BaseModel):
    node_id: str
    display_name: str
    node_class: str
    data_type: str | None = None


class OPCUABrowseResponse(BaseModel):
    parent_node_id: str
    items: list[OPCUABrowseItem] = Field(default_factory=list)


class OPCUAReadValue(BaseModel):
    node_id: str
    value: str


class OPCUAReadRequest(BaseModel):
    node_ids: list[str] = Field(min_length=1)


class OPCUAReadResponse(BaseModel):
    values: list[OPCUAReadValue] = Field(default_factory=list)


class OPCUAWriteItem(BaseModel):
    node_id: str
    value: bool | int | float | str


class OPCUAWriteRequest(BaseModel):
    writes: list[OPCUAWriteItem] = Field(min_length=1)


class OPCUAWriteResponse(BaseModel):
    written: int


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


OPCUA_TELEMETRY_VARIABLE_TYPES: dict[str, str] = {
    "command_state": "String",
    "fault_state": "Boolean",
    "fault_code": "Int32",
    "commanded_frequency_hz": "Float",
    "output_frequency_hz": "Float",
    "output_voltage_v": "Float",
    "output_current_a": "Float",
    "speed_rpm": "Float",
    "electromagnetic_torque_nm": "Float",
    "load_torque_nm": "Float",
    "mechanical_power_w": "Float",
    "estimated_temperature_c": "Float",
}


class DeviceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=1, max_length=120)
    template_key: str = Field(default="im_3ph_basic")
    motor: MotorParameters = Field(default_factory=MotorParameters)
    load: LoadParameters = Field(default_factory=LoadParameters)
    runtime: RuntimeCommand = Field(default_factory=RuntimeCommand)
    opcua_mapping: DeviceOpcUaMapping = Field(default_factory=DeviceOpcUaMapping)
    telemetry: TelemetrySnapshot = Field(default_factory=TelemetrySnapshot)


class DeviceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    template_key: str = Field(default="im_3ph_basic")
    motor: MotorParameters = Field(default_factory=MotorParameters)
    load: LoadParameters = Field(default_factory=LoadParameters)
    opcua_mapping: DeviceOpcUaMapping = Field(default_factory=DeviceOpcUaMapping)


class RuntimeCommandUpdateRequest(BaseModel):
    speed_reference_pct: float | None = Field(default=None, ge=0, le=100)
    acceleration_time_s: float | None = Field(default=None, gt=0)
    deceleration_time_s: float | None = Field(default=None, gt=0)
    status: DeviceStatus | None = None
    operation_mode: OperationMode | None = None
    fault_reset: bool = False


class DeviceConfigurationUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    motor: MotorParameters | None = None
    load: LoadParameters | None = None
    opcua_mapping: DeviceOpcUaMapping | None = None


class SimulationStepRequest(BaseModel):
    delta_time_s: float = Field(default=0.1, gt=0, le=10)


class SoftwareConfiguration(BaseModel):
    simulation_step_ms: int = Field(default=100, ge=10, le=2000)
    opcua: OPCUAClientConfiguration = Field(default_factory=OPCUAClientConfiguration)


class SoftwareConfigurationUpdateRequest(BaseModel):
    simulation_step_ms: int | None = Field(default=None, ge=10, le=2000)
    opcua: OPCUAClientConfiguration | None = None
