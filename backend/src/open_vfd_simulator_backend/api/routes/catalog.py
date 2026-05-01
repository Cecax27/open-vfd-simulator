"""Catalog API routes.

Exposes the motor and VFD model catalogs over HTTP:

    GET /api/catalog/motors                  — list all motor models (summary)
    GET /api/catalog/motors/{id}             — full motor model detail
    GET /api/catalog/motors/{id}/thumbnail   — motor thumbnail image (PNG/WebP)

    GET /api/catalog/vfds                    — list all VFD models (summary)
    GET /api/catalog/vfds/{id}               — full VFD model detail
    GET /api/catalog/vfds/{id}/thumbnail     — VFD thumbnail image (PNG/WebP)
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from open_vfd_simulator_backend.domain.models import (
    MotorModel,
    MotorModelSummary,
    VFDModel,
    VFDModelSummary,
)
from open_vfd_simulator_backend.services.catalog_service import catalog_service

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

# ---------------------------------------------------------------------------
# Motors
# ---------------------------------------------------------------------------


@router.get("/motors", response_model=list[MotorModelSummary])
def list_motors() -> list[MotorModelSummary]:
    """Return a summary list of all available motor models."""
    return catalog_service.list_motors()


@router.get("/motors/{motor_id}", response_model=MotorModel)
def get_motor(motor_id: str) -> MotorModel:
    """Return the full detail of a motor model by its ID."""
    motor = catalog_service.get_motor(motor_id)
    if motor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motor model '{motor_id}' not found in catalog.",
        )
    return motor


@router.get("/motors/{motor_id}/thumbnail")
def get_motor_thumbnail(motor_id: str) -> FileResponse:
    """Serve the thumbnail image for a motor model.

    Returns 404 if the motor model does not exist or has no thumbnail.
    """
    motor = catalog_service.get_motor(motor_id)
    if motor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motor model '{motor_id}' not found in catalog.",
        )
    thumb_path = catalog_service.get_motor_thumbnail_path(motor_id)
    if thumb_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Motor model '{motor_id}' has no thumbnail.",
        )
    media_type = "image/webp" if thumb_path.suffix.lower() == ".webp" else "image/png"
    return FileResponse(str(thumb_path), media_type=media_type)


# ---------------------------------------------------------------------------
# VFDs
# ---------------------------------------------------------------------------


@router.get("/vfds", response_model=list[VFDModelSummary])
def list_vfds() -> list[VFDModelSummary]:
    """Return a summary list of all available VFD models."""
    return catalog_service.list_vfds()


@router.get("/vfds/{vfd_id}", response_model=VFDModel)
def get_vfd(vfd_id: str) -> VFDModel:
    """Return the full detail of a VFD model by its ID."""
    vfd = catalog_service.get_vfd(vfd_id)
    if vfd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VFD model '{vfd_id}' not found in catalog.",
        )
    return vfd


@router.get("/vfds/{vfd_id}/thumbnail")
def get_vfd_thumbnail(vfd_id: str) -> FileResponse:
    """Serve the thumbnail image for a VFD model.

    Returns 404 if the VFD model does not exist or has no thumbnail.
    """
    vfd = catalog_service.get_vfd(vfd_id)
    if vfd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VFD model '{vfd_id}' not found in catalog.",
        )
    thumb_path = catalog_service.get_vfd_thumbnail_path(vfd_id)
    if thumb_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VFD model '{vfd_id}' has no thumbnail.",
        )
    media_type = "image/webp" if thumb_path.suffix.lower() == ".webp" else "image/png"
    return FileResponse(str(thumb_path), media_type=media_type)
