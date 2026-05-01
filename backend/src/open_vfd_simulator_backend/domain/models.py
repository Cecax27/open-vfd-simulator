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


# ---------------------------------------------------------------------------
# Catalog: VFD control strategies
# ---------------------------------------------------------------------------


class VFDControlStrategy(str, Enum):
    """Simulation engine strategy for a VFD model.

    Each value maps to a concrete physics engine implementation:
      - ``v_hz`` → :class:`~open_vfd_simulator_backend.simulation.basic_vfd.BasicVFDSimulator`
                   (template_key ``"im_3ph_basic"``).

    Future strategies (e.g. ``foc``, ``dtc``) will be added here as new
    simulation adapters are implemented.
    """

    V_HZ = "v_hz"


# Maps VFDControlStrategy → template_key used by the simulation engine.
CONTROL_STRATEGY_TO_TEMPLATE_KEY: dict[VFDControlStrategy, str] = {
    VFDControlStrategy.V_HZ: "im_3ph_basic",
}


# ---------------------------------------------------------------------------
# Motor / Load / Runtime domain models (device simulation state)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# OPC UA models
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Catalog models — Motor
# ---------------------------------------------------------------------------


class MotorModel(BaseModel):
    """Full motor catalog entry combining IEC 60034-1 nameplate data and
    simulation parameters.

    IEC 60034-1 nameplate fields are used for identification and display.
    Simulation fields are directly applied to the physics engine when the
    motor is instantiated on a device.

    ``thumbnail_url`` is injected by the catalog service at load time and
    points to ``GET /api/catalog/motors/{id}/thumbnail`` when an image file
    is present alongside the YAML definition.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    thumbnail_url: str | None = None

    # --- IEC 60034-1 nameplate fields ---
    rated_power_kw: float = Field(gt=0, description="Rated shaft power (kW) — IEC 60034-1")
    rated_voltage_v: float = Field(gt=0, description="Rated terminal voltage (V) — IEC 60034-1")
    rated_frequency_hz: float = Field(gt=0, description="Rated supply frequency (Hz) — IEC 60034-1")
    rated_current_a: float = Field(gt=0, description="Rated full-load current (A) — IEC 60034-1")
    rated_speed_rpm: int = Field(gt=0, description="Rated synchronous speed (RPM) — IEC 60034-1")
    power_factor: float = Field(
        gt=0, le=1.0, description="Full-load power factor (cos φ) — IEC 60034-1"
    )
    ip_protection: str = Field(
        min_length=1, description="Ingress protection rating (e.g. IP55) — IEC 60034-5"
    )
    thermal_class: str = Field(
        min_length=1,
        description="Insulation thermal class (e.g. F = 155 °C, H = 180 °C) — IEC 60034-1",
    )
    mounting: str = Field(
        min_length=1,
        description="Mounting arrangement code (e.g. B3, B5, B14) — IEC 60034-7",
    )
    efficiency_class: str | None = Field(
        default=None,
        description="Energy efficiency class (e.g. IE2, IE3, IE4) — IEC 60034-30",
    )

    # --- Simulation parameters ---
    pole_pairs: int = Field(gt=0, description="Number of pole pairs")
    stator_resistance_ohm: float = Field(gt=0, description="Stator winding resistance (Ω)")
    rotor_resistance_ohm: float = Field(gt=0, description="Rotor referred resistance (Ω)")
    stator_inductance_h: float = Field(gt=0, description="Stator leakage inductance (H)")
    rotor_inductance_h: float = Field(gt=0, description="Rotor leakage inductance (H)")
    mutual_inductance_h: float = Field(gt=0, description="Mutual (magnetising) inductance (H)")
    inertia_kgm2: float = Field(gt=0, description="Rotor moment of inertia (kg·m²)")
    friction_coefficient: float = Field(
        ge=0, description="Viscous friction coefficient (N·m·s/rad)"
    )


class MotorModelSummary(BaseModel):
    """Lightweight motor catalog entry returned by the list endpoint."""

    id: str
    name: str
    manufacturer: str
    thumbnail_url: str | None = None
    rated_power_kw: float
    rated_voltage_v: float
    rated_frequency_hz: float
    rated_current_a: float
    rated_speed_rpm: int
    efficiency_class: str | None = None


# ---------------------------------------------------------------------------
# Catalog models — VFD
# ---------------------------------------------------------------------------


class VFDModel(BaseModel):
    """Full VFD catalog entry.

    ``control_strategy`` determines which simulation engine is used when a
    device is created with this VFD model and maps directly to
    ``DeviceRecord.template_key`` via ``CONTROL_STRATEGY_TO_TEMPLATE_KEY``.

    ``simulation_params`` is a flexible dictionary for strategy-specific
    parameters.  It is empty for ``v_hz`` but will carry additional values
    for future strategies such as ``foc``.

    ``thumbnail_url`` is injected by the catalog service at load time.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    thumbnail_url: str | None = None

    # --- Nameplate fields ---
    rated_input_voltage_v: float = Field(gt=0, description="Rated AC input voltage (V)")
    rated_output_voltage_v: float = Field(gt=0, description="Rated AC output voltage (V)")
    rated_output_current_a: float = Field(gt=0, description="Rated continuous output current (A)")
    max_output_frequency_hz: float = Field(gt=0, description="Maximum output frequency (Hz)")
    min_output_frequency_hz: float = Field(ge=0, description="Minimum output frequency (Hz)")
    ip_protection: str = Field(min_length=1, description="Ingress protection rating (e.g. IP20)")

    # --- Simulation / control ---
    control_strategy: VFDControlStrategy = Field(
        description="Physics engine strategy; determines template_key on device creation"
    )
    simulation_params: dict = Field(
        default_factory=dict,
        description="Strategy-specific simulation parameters (empty for v_hz)",
    )


class VFDModelSummary(BaseModel):
    """Lightweight VFD catalog entry returned by the list endpoint."""

    id: str
    name: str
    manufacturer: str
    thumbnail_url: str | None = None
    rated_output_voltage_v: float
    rated_output_current_a: float
    max_output_frequency_hz: float
    control_strategy: VFDControlStrategy


# ---------------------------------------------------------------------------
# Device record and CRUD request models
# ---------------------------------------------------------------------------


class DeviceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=1, max_length=120)
    template_key: str = Field(default="im_3ph_basic")
    motor_model_id: str | None = Field(
        default=None,
        description="ID of the motor catalog entry used to populate motor parameters.",
    )
    vfd_model_id: str | None = Field(
        default=None,
        description="ID of the VFD catalog entry used when this device was created.",
    )
    motor: MotorParameters = Field(default_factory=MotorParameters)
    load: LoadParameters = Field(default_factory=LoadParameters)
    runtime: RuntimeCommand = Field(default_factory=RuntimeCommand)
    opcua_mapping: DeviceOpcUaMapping = Field(default_factory=DeviceOpcUaMapping)
    telemetry: TelemetrySnapshot = Field(default_factory=TelemetrySnapshot)


class DeviceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    # Explicit template_key; overridden by vfd_model_id when provided.
    template_key: str = Field(default="im_3ph_basic")
    # Optional catalog references. When motor_model_id is provided and motor
    # is None, motor parameters are populated from the catalog entry.
    # When vfd_model_id is provided, template_key is derived from the VFD's
    # control_strategy (overriding any explicit template_key).
    motor_model_id: str | None = None
    vfd_model_id: str | None = None
    # Explicit motor/load/opcua_mapping — take precedence over catalog values.
    motor: MotorParameters | None = None
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
    # Optional catalog references for partial updates.
    motor_model_id: str | None = None
    vfd_model_id: str | None = None
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
