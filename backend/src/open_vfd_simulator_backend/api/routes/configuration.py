from fastapi import APIRouter

from open_vfd_simulator_backend.domain.models import (
    SoftwareConfiguration,
    SoftwareConfigurationUpdateRequest,
)
from open_vfd_simulator_backend.services.opcua_client import opcua_client_service
from open_vfd_simulator_backend.services.software_configuration import configuration_store

router = APIRouter(prefix="/api/configuration", tags=["configuration"])


@router.get("", response_model=SoftwareConfiguration)
def get_configuration() -> SoftwareConfiguration:
    return configuration_store.get_configuration()


@router.patch("", response_model=SoftwareConfiguration)
def update_configuration(payload: SoftwareConfigurationUpdateRequest) -> SoftwareConfiguration:
    updated = configuration_store.update_configuration(payload)
    if payload.opcua is not None:
        opcua_client_service.set_configuration(updated.opcua)
    return updated
