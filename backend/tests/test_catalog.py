"""Tests for the motor/VFD catalog system.

Covers:
  - GET /api/catalog/motors (list)
  - GET /api/catalog/motors/{id} (detail)
  - GET /api/catalog/motors/{id}/thumbnail (image)
  - GET /api/catalog/vfds (list)
  - GET /api/catalog/vfds/{id} (detail)
  - GET /api/catalog/vfds/{id}/thumbnail (image)
  - Device creation with motor_model_id and vfd_model_id
  - Device update with motor_model_id and vfd_model_id
  - Error handling for unknown model IDs
"""

import pytest
from fastapi.testclient import TestClient

from open_vfd_simulator_backend.main import app
from open_vfd_simulator_backend.services.catalog_service import catalog_service

# Load catalog before any test runs (mimics the lifespan startup).
catalog_service.load()

client = TestClient(app)

# IDs of the built-in generic models — used across multiple tests.
MOTOR_ID_SMALL = "generic_im_3ph_0.55kw_230v_50hz"
MOTOR_ID_MEDIUM = "generic_im_3ph_1.5kw_400v_50hz"
MOTOR_ID_LARGE = "generic_im_3ph_7.5kw_400v_50hz"
VFD_ID_COMPACT = "generic_vfd_vhz_2.2kw_230v"
VFD_ID_STANDARD = "generic_vfd_vhz_11kw_400v"


# ---------------------------------------------------------------------------
# Motor list
# ---------------------------------------------------------------------------


def test_catalog_list_motors_returns_all_builtin() -> None:
    response = client.get("/api/catalog/motors")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [m["id"] for m in data]
    assert MOTOR_ID_SMALL in ids
    assert MOTOR_ID_MEDIUM in ids
    assert MOTOR_ID_LARGE in ids


def test_catalog_list_motors_summary_shape() -> None:
    response = client.get("/api/catalog/motors")
    item = next(m for m in response.json() if m["id"] == MOTOR_ID_SMALL)

    assert item["name"] == "Generic IM 3Ph 0.55 kW 230 V 50 Hz"
    assert item["manufacturer"] == "Generic"
    assert item["rated_power_kw"] == pytest.approx(0.55)
    assert item["rated_voltage_v"] == pytest.approx(230.0)
    assert item["rated_frequency_hz"] == pytest.approx(50.0)
    assert item["rated_current_a"] == pytest.approx(3.5)
    assert item["rated_speed_rpm"] == 1400
    assert item["efficiency_class"] == "IE2"
    # thumbnail_url is present (built-in motor has a thumbnail)
    assert item["thumbnail_url"] == f"/api/catalog/motors/{MOTOR_ID_SMALL}/thumbnail"


# ---------------------------------------------------------------------------
# Motor detail
# ---------------------------------------------------------------------------


def test_catalog_get_motor_full_shape() -> None:
    response = client.get(f"/api/catalog/motors/{MOTOR_ID_MEDIUM}")

    assert response.status_code == 200
    data = response.json()
    # IEC 60034-1 nameplate fields
    assert data["id"] == MOTOR_ID_MEDIUM
    assert data["rated_power_kw"] == pytest.approx(1.5)
    assert data["rated_voltage_v"] == pytest.approx(400.0)
    assert data["rated_frequency_hz"] == pytest.approx(50.0)
    assert data["rated_current_a"] == pytest.approx(3.7)
    assert data["rated_speed_rpm"] == 1430
    assert data["power_factor"] == pytest.approx(0.81)
    assert data["ip_protection"] == "IP55"
    assert data["thermal_class"] == "F"
    assert data["mounting"] == "B3"
    assert data["efficiency_class"] == "IE3"
    # Simulation parameters
    assert data["pole_pairs"] == 2
    assert data["stator_resistance_ohm"] == pytest.approx(3.35)
    assert data["rotor_resistance_ohm"] == pytest.approx(1.99)
    assert data["inertia_kgm2"] == pytest.approx(0.004)


def test_catalog_get_motor_unknown_returns_404() -> None:
    response = client.get("/api/catalog/motors/does_not_exist")

    assert response.status_code == 404
    assert "does_not_exist" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Motor thumbnail
# ---------------------------------------------------------------------------


def test_catalog_motor_thumbnail_returns_image() -> None:
    response = client.get(f"/api/catalog/motors/{MOTOR_ID_SMALL}/thumbnail")

    assert response.status_code == 200
    assert response.headers["content-type"] in {"image/png", "image/webp"}
    assert len(response.content) > 0


def test_catalog_motor_thumbnail_unknown_motor_returns_404() -> None:
    response = client.get("/api/catalog/motors/no_such_motor/thumbnail")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# VFD list
# ---------------------------------------------------------------------------


def test_catalog_list_vfds_returns_all_builtin() -> None:
    response = client.get("/api/catalog/vfds")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [v["id"] for v in data]
    assert VFD_ID_COMPACT in ids
    assert VFD_ID_STANDARD in ids


def test_catalog_list_vfds_summary_shape() -> None:
    response = client.get("/api/catalog/vfds")
    item = next(v for v in response.json() if v["id"] == VFD_ID_COMPACT)

    assert item["name"] == "Generic V/Hz Drive 2.2 kW 230 V"
    assert item["manufacturer"] == "Generic"
    assert item["rated_output_voltage_v"] == pytest.approx(230.0)
    assert item["rated_output_current_a"] == pytest.approx(10.5)
    assert item["max_output_frequency_hz"] == pytest.approx(400.0)
    assert item["control_strategy"] == "v_hz"
    assert item["thumbnail_url"] == f"/api/catalog/vfds/{VFD_ID_COMPACT}/thumbnail"


# ---------------------------------------------------------------------------
# VFD detail
# ---------------------------------------------------------------------------


def test_catalog_get_vfd_full_shape() -> None:
    response = client.get(f"/api/catalog/vfds/{VFD_ID_STANDARD}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == VFD_ID_STANDARD
    assert data["rated_input_voltage_v"] == pytest.approx(400.0)
    assert data["rated_output_voltage_v"] == pytest.approx(400.0)
    assert data["rated_output_current_a"] == pytest.approx(25.0)
    assert data["max_output_frequency_hz"] == pytest.approx(400.0)
    assert data["min_output_frequency_hz"] == pytest.approx(0.5)
    assert data["ip_protection"] == "IP20"
    assert data["control_strategy"] == "v_hz"
    assert data["simulation_params"] == {}


def test_catalog_get_vfd_unknown_returns_404() -> None:
    response = client.get("/api/catalog/vfds/does_not_exist")

    assert response.status_code == 404
    assert "does_not_exist" in response.json()["detail"]


# ---------------------------------------------------------------------------
# VFD thumbnail
# ---------------------------------------------------------------------------


def test_catalog_vfd_thumbnail_returns_image() -> None:
    response = client.get(f"/api/catalog/vfds/{VFD_ID_COMPACT}/thumbnail")

    assert response.status_code == 200
    assert response.headers["content-type"] in {"image/png", "image/webp"}
    assert len(response.content) > 0


def test_catalog_vfd_thumbnail_unknown_vfd_returns_404() -> None:
    response = client.get("/api/catalog/vfds/no_such_vfd/thumbnail")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Device creation with catalog references
# ---------------------------------------------------------------------------


def test_create_device_with_motor_model_id_populates_motor_params() -> None:
    """Creating a device with motor_model_id should pre-fill motor parameters
    from the catalog entry (rated_power_w = rated_power_kw * 1000)."""
    response = client.post(
        "/api/devices",
        json={"name": "Motor From Catalog", "motor_model_id": MOTOR_ID_SMALL},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["motor_model_id"] == MOTOR_ID_SMALL
    # 0.55 kW → 550 W
    assert data["motor"]["rated_power_w"] == pytest.approx(550.0)
    assert data["motor"]["rated_voltage_v"] == pytest.approx(230.0)
    assert data["motor"]["rated_current_a"] == pytest.approx(3.5)
    assert data["motor"]["rated_frequency_hz"] == pytest.approx(50.0)
    assert data["motor"]["rated_speed_rpm"] == pytest.approx(1400.0)
    assert data["motor"]["pole_pairs"] == 2
    assert data["motor"]["stator_resistance_ohm"] == pytest.approx(5.1)


def test_create_device_with_vfd_model_id_sets_template_key() -> None:
    """Creating a device with vfd_model_id should derive template_key from
    the VFD model's control_strategy (v_hz → im_3ph_basic)."""
    response = client.post(
        "/api/devices",
        json={"name": "VFD From Catalog", "vfd_model_id": VFD_ID_COMPACT},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["vfd_model_id"] == VFD_ID_COMPACT
    assert data["template_key"] == "im_3ph_basic"


def test_create_device_explicit_motor_overrides_motor_model_id() -> None:
    """When both motor_model_id and an explicit motor block are provided,
    the explicit motor block takes precedence for simulation parameters,
    but motor_model_id is still stored on the device."""
    custom_motor = {
        "rated_power_w": 9999.0,
        "rated_voltage_v": 400.0,
        "rated_current_a": 20.0,
        "rated_frequency_hz": 60.0,
        "rated_speed_rpm": 3550.0,
        "pole_pairs": 1,
        "stator_resistance_ohm": 1.0,
        "rotor_resistance_ohm": 1.0,
        "stator_inductance_h": 0.05,
        "rotor_inductance_h": 0.05,
        "mutual_inductance_h": 0.04,
        "inertia_kgm2": 0.01,
        "friction_coefficient": 0.005,
    }
    response = client.post(
        "/api/devices",
        json={
            "name": "Explicit Motor Override",
            "motor_model_id": MOTOR_ID_SMALL,
            "motor": custom_motor,
        },
    )

    assert response.status_code == 201
    data = response.json()
    # motor_model_id is stored as a reference
    assert data["motor_model_id"] == MOTOR_ID_SMALL
    # But actual motor params come from the explicit block
    assert data["motor"]["rated_power_w"] == pytest.approx(9999.0)
    assert data["motor"]["rated_voltage_v"] == pytest.approx(400.0)


def test_create_device_with_both_model_ids() -> None:
    """Using both motor_model_id and vfd_model_id together should work
    and set template_key from the VFD model."""
    response = client.post(
        "/api/devices",
        json={
            "name": "Full Catalog Device",
            "motor_model_id": MOTOR_ID_MEDIUM,
            "vfd_model_id": VFD_ID_STANDARD,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["motor_model_id"] == MOTOR_ID_MEDIUM
    assert data["vfd_model_id"] == VFD_ID_STANDARD
    assert data["template_key"] == "im_3ph_basic"
    # Motor from catalog: 1.5 kW → 1500 W
    assert data["motor"]["rated_power_w"] == pytest.approx(1500.0)
    assert data["motor"]["rated_voltage_v"] == pytest.approx(400.0)


def test_create_device_unknown_motor_model_id_returns_422() -> None:
    response = client.post(
        "/api/devices",
        json={"name": "Bad Motor ID", "motor_model_id": "nonexistent_motor_xyz"},
    )

    assert response.status_code == 422
    assert "nonexistent_motor_xyz" in response.json()["detail"]


def test_create_device_unknown_vfd_model_id_returns_422() -> None:
    response = client.post(
        "/api/devices",
        json={"name": "Bad VFD ID", "vfd_model_id": "nonexistent_vfd_xyz"},
    )

    assert response.status_code == 422
    assert "nonexistent_vfd_xyz" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Device update with catalog references
# ---------------------------------------------------------------------------


def test_update_device_motor_model_id_changes_motor_params() -> None:
    """PATCHing motor_model_id on an existing device should update its motor
    parameters from the new catalog entry."""
    create_response = client.post(
        "/api/devices",
        json={"name": "Update Motor Model", "motor_model_id": MOTOR_ID_SMALL},
    )
    device_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/devices/{device_id}",
        json={"motor_model_id": MOTOR_ID_LARGE},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["motor_model_id"] == MOTOR_ID_LARGE
    # 7.5 kW → 7500 W
    assert data["motor"]["rated_power_w"] == pytest.approx(7500.0)


def test_update_device_vfd_model_id_changes_template_key() -> None:
    """PATCHing vfd_model_id on an existing device should update template_key."""
    create_response = client.post("/api/devices", json={"name": "Update VFD Model"})
    device_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/devices/{device_id}",
        json={"vfd_model_id": VFD_ID_COMPACT},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["vfd_model_id"] == VFD_ID_COMPACT
    assert data["template_key"] == "im_3ph_basic"


def test_update_device_unknown_motor_model_id_returns_422() -> None:
    create_response = client.post("/api/devices", json={"name": "Update Unknown Motor"})
    device_id = create_response.json()["id"]

    response = client.patch(
        f"/api/devices/{device_id}",
        json={"motor_model_id": "no_such_motor"},
    )

    assert response.status_code == 422
    assert "no_such_motor" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Backward-compatibility: plain device creation without catalog IDs
# ---------------------------------------------------------------------------


def test_create_device_without_model_ids_uses_defaults() -> None:
    """Existing behavior: creating a device without any catalog IDs should
    still work with default motor parameters and template_key im_3ph_basic."""
    response = client.post("/api/devices", json={"name": "Legacy Device"})

    assert response.status_code == 201
    data = response.json()
    assert data["motor_model_id"] is None
    assert data["vfd_model_id"] is None
    assert data["template_key"] == "im_3ph_basic"
    # Default motor parameters
    assert data["motor"]["rated_power_w"] == pytest.approx(500.0)
    assert data["motor"]["rated_voltage_v"] == pytest.approx(230.0)
