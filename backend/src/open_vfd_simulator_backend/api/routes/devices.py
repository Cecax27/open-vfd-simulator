from fastapi import APIRouter, HTTPException, status

from open_vfd_simulator_backend.domain.models import (
    DeviceConfigurationUpdateRequest,
    DeviceCreateRequest,
    DeviceRecord,
    RuntimeCommandUpdateRequest,
    SimulationStepRequest,
)
from open_vfd_simulator_backend.services.device_registry import registry

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[DeviceRecord])
def list_devices() -> list[DeviceRecord]:
    return registry.list_devices()


@router.post("", response_model=DeviceRecord, status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreateRequest) -> DeviceRecord:
    return registry.create_device(payload)


@router.get("/{device_id}", response_model=DeviceRecord)
def get_device(device_id: str) -> DeviceRecord:
    device = registry.get_device(device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.patch("/{device_id}", response_model=DeviceRecord)
def update_device_configuration(
    device_id: str,
    payload: DeviceConfigurationUpdateRequest,
) -> DeviceRecord:
    device = registry.update_configuration(device_id, payload)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.patch("/{device_id}/runtime", response_model=DeviceRecord)
def update_device_runtime(device_id: str, payload: RuntimeCommandUpdateRequest) -> DeviceRecord:
    device = registry.update_runtime(device_id, payload)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.post("/{device_id}/step", response_model=DeviceRecord)
def step_device(device_id: str, payload: SimulationStepRequest) -> DeviceRecord:
    device = registry.step_device(device_id, payload.delta_time_s)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device
