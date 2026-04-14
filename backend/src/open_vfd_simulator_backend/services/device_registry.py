from __future__ import annotations

from threading import Lock

from open_vfd_simulator_backend.domain.models import (
    DeviceConfigurationUpdateRequest,
    DeviceCreateRequest,
    DeviceRecord,
    DeviceStatus,
    RuntimeCommandUpdateRequest,
)
from open_vfd_simulator_backend.simulation.basic_vfd import simulator


class DeviceRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._devices: dict[str, DeviceRecord] = {}

    def list_devices(self) -> list[DeviceRecord]:
        with self._lock:
            return list(self._devices.values())

    def create_device(self, payload: DeviceCreateRequest) -> DeviceRecord:
        device = DeviceRecord(
            name=payload.name,
            template_key=payload.template_key,
            motor=payload.motor,
            load=payload.load,
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

            updated_device = device.model_copy(
                update={
                    "name": payload.name if payload.name is not None else device.name,
                    "motor": payload.motor if payload.motor is not None else device.motor,
                    "load": payload.load if payload.load is not None else device.load,
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
            if payload.fault_reset and device.runtime.status == DeviceStatus.FAULT:
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


registry = DeviceRegistry()
