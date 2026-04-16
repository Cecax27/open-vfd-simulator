import asyncio

from fastapi.testclient import TestClient

from open_vfd_simulator_backend.main import app
from open_vfd_simulator_backend.services.device_registry import registry
from open_vfd_simulator_backend.services.simulation_runtime import simulation_runtime


client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_preflight_devices() -> None:
    response = client.options(
        "/api/devices",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"


def test_configuration_default_and_update() -> None:
    get_response = client.get("/api/configuration")
    assert get_response.status_code == 200
    assert get_response.json()["simulation_step_ms"] == 100

    patch_response = client.patch(
        "/api/configuration",
        json={"simulation_step_ms": 50},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["simulation_step_ms"] == 50


def test_create_device() -> None:
    response = client.post(
        "/api/devices",
        json={
            "name": "Drive 1",
        },
    )

    body = response.json()

    assert response.status_code == 201
    assert body["name"] == "Drive 1"
    assert body["template_key"] == "im_3ph_basic"
    assert body["runtime"]["status"] == "stopped"


def test_update_runtime_and_step_device() -> None:
    create_response = client.post(
        "/api/devices",
        json={
            "name": "Drive 2",
        },
    )
    device_id = create_response.json()["id"]

    runtime_response = client.patch(
        f"/api/devices/{device_id}/runtime",
        json={
            "status": "running",
            "speed_reference_pct": 50,
            "acceleration_time_s": 2,
            "deceleration_time_s": 2,
        },
    )
    step_response = client.post(
        f"/api/devices/{device_id}/step",
        json={"delta_time_s": 0.5},
    )

    runtime_body = runtime_response.json()
    step_body = step_response.json()

    assert runtime_response.status_code == 200
    assert runtime_body["runtime"]["status"] == "running"
    assert runtime_body["runtime"]["speed_reference_pct"] == 50
    assert step_response.status_code == 200
    assert step_body["telemetry"]["commanded_frequency_hz"] == 25.0
    assert step_body["telemetry"]["output_frequency_hz"] > 0
    assert step_body["telemetry"]["output_voltage_v"] > 0


def test_fault_reset_clears_fault_code() -> None:
    create_response = client.post(
        "/api/devices",
        json={
            "name": "Drive 3",
        },
    )
    device_id = create_response.json()["id"]

    client.patch(
        f"/api/devices/{device_id}/runtime",
        json={
            "status": "fault",
        },
    )
    reset_response = client.patch(
        f"/api/devices/{device_id}/runtime",
        json={
            "fault_reset": True,
        },
    )

    reset_body = reset_response.json()

    assert reset_response.status_code == 200
    assert reset_body["runtime"]["status"] == "stopped"
    assert reset_body["telemetry"]["fault_code"] == 0


def test_delete_device() -> None:
    create_response = client.post(
        "/api/devices",
        json={"name": "Drive To Delete"},
    )
    device_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/devices/{device_id}")
    get_response = client.get(f"/api/devices/{device_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_reset_devices() -> None:
    client.post("/api/devices", json={"name": "Drive A"})
    client.post("/api/devices", json={"name": "Drive B"})

    reset_response = client.post("/api/devices/reset")
    list_response = client.get("/api/devices")

    assert reset_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_opcua_configuration_and_status() -> None:
    patch_response = client.patch(
        "/api/opcua/configuration",
        json={
            "enabled": True,
            "endpoint_url": "opc.tcp://127.0.0.1:4840",
            "request_timeout_s": 2,
        },
    )
    get_response = client.get("/api/opcua/configuration")
    status_response = client.get("/api/opcua/status")

    assert patch_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["enabled"] is True
    assert get_response.json()["endpoint_url"] == "opc.tcp://127.0.0.1:4840"
    assert status_response.status_code == 200


def test_device_configuration_persists_opcua_mapping() -> None:
    create_response = client.post(
        "/api/devices",
        json={
            "name": "Drive OPC",
            "opcua_mapping": {
                "speed_reference_node_id": "ns=2;s=DriveOPC/Speed",
                "run_stop_node_id": "ns=2;s=DriveOPC/RunStop",
            },
        },
    )
    device_id = create_response.json()["id"]

    patch_response = client.patch(
        f"/api/devices/{device_id}",
        json={
            "opcua_mapping": {
                "speed_reference_node_id": "ns=2;s=DriveOPC/SpeedRef",
                "run_stop_node_id": "ns=2;s=DriveOPC/RunStop",
            }
        },
    )

    assert patch_response.status_code == 200
    assert patch_response.json()["opcua_mapping"]["speed_reference_node_id"] == "ns=2;s=DriveOPC/SpeedRef"
    assert patch_response.json()["opcua_mapping"]["run_stop_node_id"] == "ns=2;s=DriveOPC/RunStop"


def test_remote_mode_fault_when_opcua_not_configured() -> None:
    create_response = client.post("/api/devices", json={"name": "Drive Remote"})
    device_id = create_response.json()["id"]

    client.patch(
        f"/api/devices/{device_id}/runtime",
        json={"operation_mode": "remote"},
    )

    # OPC UA is not configured (disabled by default) — applying inputs should trigger fault 2001
    asyncio.run(simulation_runtime._apply_opcua_inputs())

    device = registry.get_device(device_id)
    assert device is not None
    assert device.runtime.status.value == "fault"
    assert device.telemetry.fault_code == 2001


def test_local_mode_auto_clears_remote_fault() -> None:
    create_response = client.post("/api/devices", json={"name": "Drive Remote Recover"})
    device_id = create_response.json()["id"]

    client.patch(f"/api/devices/{device_id}/runtime", json={"operation_mode": "remote"})
    asyncio.run(simulation_runtime._apply_opcua_inputs())

    # Confirm device is in fault 2001
    device = registry.get_device(device_id)
    assert device is not None
    assert device.telemetry.fault_code == 2001

    # Switching back to LOCAL must auto-clear fault 2001
    recover_response = client.patch(
        f"/api/devices/{device_id}/runtime",
        json={"operation_mode": "local"},
    )
    recover_body = recover_response.json()

    assert recover_response.status_code == 200
    assert recover_body["runtime"]["status"] == "stopped"
    assert recover_body["telemetry"]["fault_code"] == 0
