from fastapi import APIRouter, Query

from open_vfd_simulator_backend.domain.models import (
    OPCUABrowseResponse,
    OPCUAClientConfiguration,
    OPCUAConnectionStatus,
    OPCUAReadRequest,
    OPCUAReadResponse,
    SoftwareConfigurationUpdateRequest,
    OPCUAWriteRequest,
    OPCUAWriteResponse,
)
from open_vfd_simulator_backend.services.opcua_client import opcua_client_service
from open_vfd_simulator_backend.services.software_configuration import configuration_store

router = APIRouter(prefix="/api/opcua", tags=["opcua"])


@router.get("/configuration", response_model=OPCUAClientConfiguration)
def get_opcua_configuration() -> OPCUAClientConfiguration:
    configuration = configuration_store.get_configuration()
    return configuration.opcua


@router.patch("/configuration", response_model=OPCUAClientConfiguration)
def update_opcua_configuration(payload: OPCUAClientConfiguration) -> OPCUAClientConfiguration:
    updated = configuration_store.update_configuration(
        SoftwareConfigurationUpdateRequest(opcua=payload)
    )
    opcua_client_service.set_configuration(updated.opcua)
    return updated.opcua


@router.get("/status", response_model=OPCUAConnectionStatus)
def get_opcua_status() -> OPCUAConnectionStatus:
    return opcua_client_service.get_status()


@router.post("/test-connection", response_model=OPCUAConnectionStatus)
async def test_opcua_connection() -> OPCUAConnectionStatus:
    return await opcua_client_service.test_connection()


@router.get("/browse", response_model=OPCUABrowseResponse)
async def browse_opcua(node_id: str = Query(default="i=84")) -> OPCUABrowseResponse:
    return await opcua_client_service.browse(node_id)


@router.post("/read", response_model=OPCUAReadResponse)
async def read_opcua(payload: OPCUAReadRequest) -> OPCUAReadResponse:
    return await opcua_client_service.read(payload.node_ids)


@router.post("/write", response_model=OPCUAWriteResponse)
async def write_opcua(payload: OPCUAWriteRequest) -> OPCUAWriteResponse:
    return await opcua_client_service.write(payload)
