from __future__ import annotations

from threading import Lock

from fastapi import HTTPException, status

from open_vfd_simulator_backend.domain.models import (
    DeviceConfigurationUpdateRequest,
    DeviceCreateRequest,
    DeviceRecord,
    DeviceStatus,
    FAULT_REMOTE_UNCONFIGURED,
    MotorParameters,
    OperationMode,
    RuntimeCommandUpdateRequest,
)
from open_vfd_simulator_backend.simulation.basic_vfd import simulator


def _resolve_motor_and_template(
    payload_motor: MotorParameters | None,
    motor_model_id: str | None,
    vfd_model_id: str | None,
    current_template_key: str,
) -> tuple[MotorParameters, str, str | None, str | None]:
    """Resolve motor parameters and template_key from catalog references.

    Returns ``(motor_params, template_key, resolved_motor_model_id, resolved_vfd_model_id)``.

    Resolution rules:
    - If ``vfd_model_id`` is provided, ``template_key`` is derived from the
      VFD model's ``control_strategy`` (overrides ``current_template_key``).
    - If ``motor_model_id`` is provided and ``payload_motor`` is None, motor
      parameters are populated from the catalog entry.
    - If ``payload_motor`` is explicitly provided, it always takes precedence
      over the catalog (``motor_model_id`` is still stored as a reference).
    - Unknown model IDs raise ``HTTP 422``.
    """
    # Import here to avoid circular imports at module level.
    from open_vfd_simulator_backend.services.catalog_service import catalog_service

    resolved_motor_model_id = motor_model_id
    resolved_vfd_model_id = vfd_model_id
    template_key = current_template_key

    # Resolve VFD model → template_key.
    if vfd_model_id is not None:
        vfd_model = catalog_service.get_vfd(vfd_model_id)
        if vfd_model is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"VFD model '{vfd_model_id}' not found in catalog.",
            )
        template_key = catalog_service.vfd_to_template_key(vfd_model)

    # Resolve motor model → motor parameters (only when no explicit motor block).
    motor: MotorParameters
    if payload_motor is not None:
        motor = payload_motor
    elif motor_model_id is not None:
        motor_model = catalog_service.get_motor(motor_model_id)
        if motor_model is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Motor model '{motor_model_id}' not found in catalog.",
            )
        motor = catalog_service.motor_to_parameters(motor_model)
    else:
        motor = MotorParameters()

    return motor, template_key, resolved_motor_model_id, resolved_vfd_model_id


class DeviceRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._devices: dict[str, DeviceRecord] = {}

    def list_devices(self) -> list[DeviceRecord]:
        with self._lock:
            return list(self._devices.values())

    def create_device(self, payload: DeviceCreateRequest) -> DeviceRecord:
        motor, template_key, motor_model_id, vfd_model_id = _resolve_motor_and_template(
            payload_motor=payload.motor,
            motor_model_id=payload.motor_model_id,
            vfd_model_id=payload.vfd_model_id,
            current_template_key=payload.template_key,
        )

        device = DeviceRecord(
            name=payload.name,
            template_key=template_key,
            motor_model_id=motor_model_id,
            vfd_model_id=vfd_model_id,
            motor=motor,
            load=payload.load,
            opcua_mapping=payload.opcua_mapping,
        )
        with self._lock:
            self._devices[device.id] = device
        return device

    def get_device(self, device_id: str) -> DeviceRecord | None:
        with self._lock:
            return self._devices.get(device_id)

    def update_configuration(
        self,
        device_id: str,
        payload: DeviceConfigurationUpdateRequest,
    ) -> DeviceRecord | None:
        with self._lock:
            device = self._devices.get(device_id)
            if device is None:
                return None

        # Resolve catalog references outside the lock (may raise HTTP 422).
        motor, template_key, motor_model_id, vfd_model_id = _resolve_motor_and_template(
            payload_motor=payload.motor,
            motor_model_id=payload.motor_model_id,
            vfd_model_id=payload.vfd_model_id,
            current_template_key=device.template_key,
        )

        # Determine final motor: explicit > catalog > keep existing.
        if payload.motor is not None or payload.motor_model_id is not None:
            final_motor = motor
        else:
            final_motor = device.motor

        # Determine final motor_model_id / vfd_model_id.
        # A None payload value means "don't change"; the caller must send the
        # field explicitly to clear it (there is currently no "clear" path, so
        # None in the payload simply preserves the existing value).
        final_motor_model_id = (
            motor_model_id if payload.motor_model_id is not None else device.motor_model_id
        )
        final_vfd_model_id = (
            vfd_model_id if payload.vfd_model_id is not None else device.vfd_model_id
        )
        final_template_key = (
            template_key if payload.vfd_model_id is not None else device.template_key
        )

        with self._lock:
            # Re-fetch to guard against a concurrent delete between the two lock sections.
            device = self._devices.get(device_id)
            if device is None:
                return None

            updated_device = device.model_copy(
                update={
                    "name": payload.name if payload.name is not None else device.name,
                    "template_key": final_template_key,
                    "motor_model_id": final_motor_model_id,
                    "vfd_model_id": final_vfd_model_id,
                    "motor": final_motor,
                    "load": payload.load if payload.load is not None else device.load,
                    "opcua_mapping": (
                        payload.opcua_mapping
                        if payload.opcua_mapping is not None
                        else device.opcua_mapping
                    ),
                }
            )
            self._devices[device_id] = updated_device
            return updated_device

    def update_runtime(
        self,
        device_id: str,
        payload: RuntimeCommandUpdateRequest,
    ) -> DeviceRecord | None:
        with self._lock:
            device = self._devices.get(device_id)
            if device is None:
                return None

            next_status = payload.status if payload.status is not None else device.runtime.status
            next_telemetry = device.telemetry
            next_operation_mode = (
                payload.operation_mode
                if payload.operation_mode is not None
                else device.runtime.operation_mode
            )

            if payload.fault_reset and device.runtime.status == DeviceStatus.FAULT:
                next_status = DeviceStatus.STOPPED
                next_telemetry = device.telemetry.model_copy(update={"fault_code": 0})

            # Switching to LOCAL automatically clears fault 2001 (remote unconfigured)
            if (
                next_operation_mode == OperationMode.LOCAL
                and device.runtime.operation_mode == OperationMode.REMOTE
                and device.telemetry.fault_code == FAULT_REMOTE_UNCONFIGURED
            ):
                next_status = DeviceStatus.STOPPED
                next_telemetry = device.telemetry.model_copy(update={"fault_code": 0})

            updated_runtime = device.runtime.model_copy(
                update={
                    "speed_reference_pct": (
                        payload.speed_reference_pct
                        if payload.speed_reference_pct is not None
                        else device.runtime.speed_reference_pct
                    ),
                    "acceleration_time_s": (
                        payload.acceleration_time_s
                        if payload.acceleration_time_s is not None
                        else device.runtime.acceleration_time_s
                    ),
                    "deceleration_time_s": (
                        payload.deceleration_time_s
                        if payload.deceleration_time_s is not None
                        else device.runtime.deceleration_time_s
                    ),
                    "status": next_status,
                    "operation_mode": next_operation_mode,
                }
            )
            updated_device = device.model_copy(
                update={"runtime": updated_runtime, "telemetry": next_telemetry}
            )
            self._devices[device_id] = updated_device
            return updated_device

    def step_device(self, device_id: str, delta_time_s: float) -> DeviceRecord | None:
        with self._lock:
            device = self._devices.get(device_id)
            if device is None:
                return None

            updated_device = simulator.step(device, delta_time_s)
            self._devices[device_id] = updated_device
            return updated_device

    def step_all_devices(self, delta_time_s: float) -> None:
        with self._lock:
            for device_id, device in list(self._devices.items()):
                self._devices[device_id] = simulator.step(device, delta_time_s)

    def set_device_fault(self, device_id: str, fault_code: int) -> DeviceRecord | None:
        with self._lock:
            device = self._devices.get(device_id)
            if device is None:
                return None

            updated_device = device.model_copy(
                update={
                    "runtime": device.runtime.model_copy(update={"status": DeviceStatus.FAULT}),
                    "telemetry": device.telemetry.model_copy(update={"fault_code": fault_code}),
                }
            )
            self._devices[device_id] = updated_device
            return updated_device

    def delete_device(self, device_id: str) -> bool:
        with self._lock:
            if device_id not in self._devices:
                return False
            del self._devices[device_id]
            return True

    def clear_devices(self) -> None:
        with self._lock:
            self._devices.clear()


registry = DeviceRegistry()
