"""Catalog service — loads motor and VFD model definitions from YAML files.

Built-in catalog files ship with the package under:

    open_vfd_simulator_backend/catalogs/motors/*.yaml
    open_vfd_simulator_backend/catalogs/vfds/*.yaml

Community / user models can be added without touching the package by placing
YAML files (following the same schema) inside a directory pointed to by the
``OPEN_VFD_CATALOG_DIR`` environment variable:

    $OPEN_VFD_CATALOG_DIR/
        motors/
            my_motors.yaml
            thumbnails/
                my_motor.png
        vfds/
            my_vfds.yaml
            thumbnails/
                my_vfd.png

User-directory entries with the same ``id`` as a built-in entry **override**
the built-in; a warning is logged for each override.

Thumbnail paths in YAML are relative to the directory that contains the YAML
file (e.g. ``thumbnails/my_motor.png``).  The service resolves them to
absolute ``Path`` objects at load time; the public API surfaces them as
``/api/catalog/motors/{id}/thumbnail`` URLs (injected into each model's
``thumbnail_url`` field) only when the file actually exists on disk.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Iterator

import yaml

from open_vfd_simulator_backend.domain.models import (
    MotorModel,
    MotorModelSummary,
    MotorParameters,
    VFDModel,
    VFDModelSummary,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_BUILTIN_CATALOGS = Path(__file__).parent.parent / "catalogs"


def _iter_yaml_files(directory: Path) -> Iterator[Path]:
    """Yield all ``*.yaml`` and ``*.yml`` files directly inside *directory*."""
    if not directory.is_dir():
        return
    for path in sorted(directory.iterdir()):
        if path.suffix in {".yaml", ".yml"} and path.is_file():
            yield path


def _resolve_thumbnail(yaml_dir: Path, relative: str | None) -> Path | None:
    """Return an absolute path to the thumbnail file, or ``None`` if absent."""
    if not relative:
        return None
    resolved = (yaml_dir / relative).resolve()
    return resolved if resolved.is_file() else None


def _thumbnail_url_for_motor(motor_id: str) -> str:
    return f"/api/catalog/motors/{motor_id}/thumbnail"


def _thumbnail_url_for_vfd(vfd_id: str) -> str:
    return f"/api/catalog/vfds/{vfd_id}/thumbnail"


# ---------------------------------------------------------------------------
# Catalog service
# ---------------------------------------------------------------------------


class CatalogService:
    """Thread-safe (read-only after load) motor and VFD model catalog."""

    def __init__(self) -> None:
        self._motors: dict[str, MotorModel] = {}
        self._vfds: dict[str, VFDModel] = {}
        # Maps id → absolute filesystem path for serving thumbnail files.
        self._motor_thumbnails: dict[str, Path] = {}
        self._vfd_thumbnails: dict[str, Path] = {}

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------

    def load(self) -> None:
        """Load all built-in catalog files and any user-specified extras.

        Called once during application startup (lifespan).  Safe to call
        again to reload (e.g. in tests) — clears existing entries first.
        """
        self._motors.clear()
        self._vfds.clear()
        self._motor_thumbnails.clear()
        self._vfd_thumbnails.clear()

        # 1. Built-in catalogs (shipped with the package).
        self._load_directory(_BUILTIN_CATALOGS, source="built-in")

        # 2. Optional user-provided catalog directory.
        user_dir_env = os.environ.get("OPEN_VFD_CATALOG_DIR", "").strip()
        if user_dir_env:
            user_dir = Path(user_dir_env)
            if user_dir.is_dir():
                self._load_directory(user_dir, source="user")
            else:
                logger.warning(
                    "OPEN_VFD_CATALOG_DIR is set to %r but the directory does not exist — "
                    "skipping user catalog.",
                    user_dir_env,
                )

        logger.info(
            "Catalog loaded: %d motor model(s), %d VFD model(s).",
            len(self._motors),
            len(self._vfds),
        )

    def _load_directory(self, base: Path, *, source: str) -> None:
        """Load all YAML files from *base/motors/* and *base/vfds/*."""
        for yaml_path in _iter_yaml_files(base / "motors"):
            self._load_motors_file(yaml_path, source=source)
        for yaml_path in _iter_yaml_files(base / "vfds"):
            self._load_vfds_file(yaml_path, source=source)

    def _load_motors_file(self, path: Path, *, source: str) -> None:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Failed to read motor catalog file %s: %s", path, exc)
            return

        entries = data.get("motors") if isinstance(data, dict) else None
        if not isinstance(entries, list):
            logger.warning("Motor catalog file %s has no 'motors' list — skipped.", path)
            return

        yaml_dir = path.parent
        for raw in entries:
            if not isinstance(raw, dict):
                continue
            try:
                thumbnail_path = _resolve_thumbnail(yaml_dir, raw.pop("thumbnail", None))
                model = MotorModel(**raw)
            except Exception as exc:
                logger.error(
                    "Invalid motor entry in %s (id=%r): %s",
                    path,
                    raw.get("id"),
                    exc,
                )
                continue

            if model.id in self._motors:
                existing_source = "built-in" if source == "user" else "earlier file"
                logger.warning(
                    "Motor model id=%r from %s (%s) overrides an entry from %s.",
                    model.id,
                    path,
                    source,
                    existing_source,
                )

            # Inject thumbnail URL only when the file actually exists.
            if thumbnail_path is not None:
                model = model.model_copy(
                    update={"thumbnail_url": _thumbnail_url_for_motor(model.id)}
                )
                self._motor_thumbnails[model.id] = thumbnail_path

            self._motors[model.id] = model

    def _load_vfds_file(self, path: Path, *, source: str) -> None:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Failed to read VFD catalog file %s: %s", path, exc)
            return

        entries = data.get("vfds") if isinstance(data, dict) else None
        if not isinstance(entries, list):
            logger.warning("VFD catalog file %s has no 'vfds' list — skipped.", path)
            return

        yaml_dir = path.parent
        for raw in entries:
            if not isinstance(raw, dict):
                continue
            try:
                thumbnail_path = _resolve_thumbnail(yaml_dir, raw.pop("thumbnail", None))
                model = VFDModel(**raw)
            except Exception as exc:
                logger.error(
                    "Invalid VFD entry in %s (id=%r): %s",
                    path,
                    raw.get("id"),
                    exc,
                )
                continue

            if model.id in self._vfds:
                existing_source = "built-in" if source == "user" else "earlier file"
                logger.warning(
                    "VFD model id=%r from %s (%s) overrides an entry from %s.",
                    model.id,
                    path,
                    source,
                    existing_source,
                )

            if thumbnail_path is not None:
                model = model.model_copy(update={"thumbnail_url": _thumbnail_url_for_vfd(model.id)})
                self._vfd_thumbnails[model.id] = thumbnail_path

            self._vfds[model.id] = model

    # ------------------------------------------------------------------
    # Motor queries
    # ------------------------------------------------------------------

    def list_motors(self) -> list[MotorModelSummary]:
        """Return a lightweight summary list of all loaded motor models."""
        return [
            MotorModelSummary(
                id=m.id,
                name=m.name,
                manufacturer=m.manufacturer,
                thumbnail_url=m.thumbnail_url,
                rated_power_kw=m.rated_power_kw,
                rated_voltage_v=m.rated_voltage_v,
                rated_frequency_hz=m.rated_frequency_hz,
                rated_current_a=m.rated_current_a,
                rated_speed_rpm=m.rated_speed_rpm,
                efficiency_class=m.efficiency_class,
            )
            for m in self._motors.values()
        ]

    def get_motor(self, motor_id: str) -> MotorModel | None:
        """Return the full motor model for *motor_id*, or ``None``."""
        return self._motors.get(motor_id)

    def get_motor_thumbnail_path(self, motor_id: str) -> Path | None:
        """Return the absolute filesystem path to the motor thumbnail, or ``None``."""
        return self._motor_thumbnails.get(motor_id)

    # ------------------------------------------------------------------
    # VFD queries
    # ------------------------------------------------------------------

    def list_vfds(self) -> list[VFDModelSummary]:
        """Return a lightweight summary list of all loaded VFD models."""
        return [
            VFDModelSummary(
                id=v.id,
                name=v.name,
                manufacturer=v.manufacturer,
                thumbnail_url=v.thumbnail_url,
                rated_output_voltage_v=v.rated_output_voltage_v,
                rated_output_current_a=v.rated_output_current_a,
                max_output_frequency_hz=v.max_output_frequency_hz,
                control_strategy=v.control_strategy,
            )
            for v in self._vfds.values()
        ]

    def get_vfd(self, vfd_id: str) -> VFDModel | None:
        """Return the full VFD model for *vfd_id*, or ``None``."""
        return self._vfds.get(vfd_id)

    def get_vfd_thumbnail_path(self, vfd_id: str) -> Path | None:
        """Return the absolute filesystem path to the VFD thumbnail, or ``None``."""
        return self._vfd_thumbnails.get(vfd_id)

    # ------------------------------------------------------------------
    # Conversion helpers
    # ------------------------------------------------------------------

    def motor_to_parameters(self, motor: MotorModel) -> MotorParameters:
        """Convert a :class:`MotorModel` catalog entry to a :class:`MotorParameters`
        instance suitable for use on a :class:`~domain.models.DeviceRecord`.
        """
        return MotorParameters(
            rated_power_w=motor.rated_power_kw * 1000.0,
            rated_voltage_v=motor.rated_voltage_v,
            rated_current_a=motor.rated_current_a,
            rated_frequency_hz=motor.rated_frequency_hz,
            rated_speed_rpm=float(motor.rated_speed_rpm),
            pole_pairs=motor.pole_pairs,
            stator_resistance_ohm=motor.stator_resistance_ohm,
            rotor_resistance_ohm=motor.rotor_resistance_ohm,
            stator_inductance_h=motor.stator_inductance_h,
            rotor_inductance_h=motor.rotor_inductance_h,
            mutual_inductance_h=motor.mutual_inductance_h,
            inertia_kgm2=motor.inertia_kgm2,
            friction_coefficient=motor.friction_coefficient,
        )

    def vfd_to_template_key(self, vfd: VFDModel) -> str:
        """Return the simulation engine ``template_key`` for a VFD model.

        Uses :data:`~domain.models.CONTROL_STRATEGY_TO_TEMPLATE_KEY`.  Falls
        back to ``"im_3ph_basic"`` for unknown strategies so new strategies
        never crash existing code until their engine is wired up.
        """
        from open_vfd_simulator_backend.domain.models import CONTROL_STRATEGY_TO_TEMPLATE_KEY

        return CONTROL_STRATEGY_TO_TEMPLATE_KEY.get(vfd.control_strategy, "im_3ph_basic")


# Module-level singleton — imported by routes and device registry.
catalog_service = CatalogService()
