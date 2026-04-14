from fastapi.testclient import TestClient

from open_vfd_simulator_backend.main import app


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
