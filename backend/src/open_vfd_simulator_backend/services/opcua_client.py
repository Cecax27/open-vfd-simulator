from __future__ import annotations

from typing import Any

from open_vfd_simulator_backend.domain.models import (
    DeviceRecord,
    DeviceStatus,
    OPCUA_TELEMETRY_VARIABLE_TYPES,
    OPCUABrowseItem,
    OPCUABrowseResponse,
    OPCUAClientConfiguration,
    OPCUAConnectionState,
    OPCUAConnectionStatus,
    OPCUAReadResponse,
    OPCUAReadValue,
    OPCUAWriteRequest,
    OPCUAWriteResponse,
    RuntimeCommandUpdateRequest,
)


class OpcUaClientService:
    def __init__(self) -> None:
        self._configuration = OPCUAClientConfiguration()
        self._status = OPCUAConnectionStatus()

    def get_configuration(self) -> OPCUAClientConfiguration:
        return self._configuration.model_copy(deep=True)

    def set_configuration(self, configuration: OPCUAClientConfiguration) -> OPCUAClientConfiguration:
        self._configuration = configuration.model_copy(deep=True)
        self._status = OPCUAConnectionStatus(
            state=OPCUAConnectionState.DISCONNECTED,
            is_configured=bool(configuration.enabled and configuration.endpoint_url),
            endpoint_url=configuration.endpoint_url,
            last_error=None,
        )
        return self.get_configuration()

    def get_status(self) -> OPCUAConnectionStatus:
        return self._status.model_copy(deep=True)

    async def test_connection(self) -> OPCUAConnectionStatus:
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.DISCONNECTED,
                is_configured=False,
                endpoint_url=self._configuration.endpoint_url,
                last_error=None,
            )
            return self.get_status()

        self._status = OPCUAConnectionStatus(
            state=OPCUAConnectionState.CONNECTING,
            is_configured=True,
            endpoint_url=self._configuration.endpoint_url,
            last_error=None,
        )

        try:
            from asyncua import Client

            async with Client(url=self._configuration.endpoint_url, timeout=self._configuration.request_timeout_s) as client:
                client.connect()
                self._status = OPCUAConnectionStatus(
                    state=OPCUAConnectionState.CONNECTED,
                    is_configured=True,
                    endpoint_url=self._configuration.endpoint_url,
                    last_error=None,
                )
        except Exception as exc:
            print(f"OPC UA connection test failed: {exc}")
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.ERROR,
                is_configured=True,
                endpoint_url=self._configuration.endpoint_url,
                last_error=str(exc),
            )

        return self.get_status()

    async def browse(self, node_id: str) -> OPCUABrowseResponse:
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            return OPCUABrowseResponse(parent_node_id=node_id, items=[])

        items: list[OPCUABrowseItem] = []
        try:
            from asyncua import Client

            async with Client(url=self._configuration.endpoint_url, timeout=self._configuration.request_timeout_s) as client:
                root_node = client.get_node(node_id)
                queue = [root_node]
                visited: set[str] = set()

                while queue and len(items) < 1000:
                    current = queue.pop(0)
                    current_node_id = current.nodeid.to_string()
                    if current_node_id in visited:
                        continue
                    visited.add(current_node_id)

                    children = await current.get_children()
                    for child in children:
                        child_node_id = child.nodeid.to_string()
                        if child_node_id in visited:
                            continue
                        node_class = await child.read_node_class()
                        if str(node_class) == "NodeClass.Variable":
                            if "ns=" not in child_node_id.lower():
                                continue
                            display_name = await child.read_display_name()
                            data_type = None
                            try:
                                variant_type = await child.read_data_type_as_variant_type()
                                data_type = str(variant_type)
                            except Exception:
                                data_type = None

                            items.append(
                                OPCUABrowseItem(
                                    node_id=child_node_id,
                                    display_name=display_name.Text,
                                    node_class=str(node_class),
                                    data_type=data_type,
                                )
                            )
                            if len(items) >= 1000:
                                break
                        else:
                            queue.append(child)
        except Exception as exc:
            print(f"OPC UA browse failed: {exc}")
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.ERROR,
                is_configured=True,
                endpoint_url=self._configuration.endpoint_url,
                last_error=str(exc),
            )

        return OPCUABrowseResponse(parent_node_id=node_id, items=items)

    async def read(self, node_ids: list[str]) -> OPCUAReadResponse:
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            return OPCUAReadResponse(values=[])

        values: list[OPCUAReadValue] = []
        try:
            from asyncua import Client

            async with Client(url=self._configuration.endpoint_url, timeout=self._configuration.request_timeout_s) as client:
                for node_id in node_ids:
                    node = client.get_node(node_id)
                    raw_value = await node.read_value()
                    values.append(OPCUAReadValue(node_id=node_id, value=str(raw_value)))
        except Exception as exc:
            print(f"OPC UA read failed: {exc}")
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.ERROR,
                is_configured=True,
                endpoint_url=self._configuration.endpoint_url,
                last_error=str(exc),
            )

        return OPCUAReadResponse(values=values)

    def is_ready(self, device: DeviceRecord) -> bool:
        """Return True if OPC UA is enabled, has an endpoint, and the device has at least one node mapped."""
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            return False
        mapping = device.opcua_mapping
        return bool(mapping.speed_reference_node_id or mapping.run_stop_node_id)

    def can_publish_telemetry(self, device: DeviceRecord) -> bool:
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            return False
        return bool(device.opcua_mapping.telemetry_node_ids)

    async def read_device_runtime(self, device: DeviceRecord) -> RuntimeCommandUpdateRequest | None:
        """Read OPC UA nodes mapped on the device and return a RuntimeCommandUpdateRequest.

        Returns None if OPC UA is not ready for this device or if the read fails.
        """
        if not self.is_ready(device):
            return None

        mapping = device.opcua_mapping
        node_ids = [
            nid
            for nid in (mapping.speed_reference_node_id, mapping.run_stop_node_id)
            if nid is not None
        ]

        response = await self.read(node_ids)
        if not response.values:
            # Transient connection failure — keep current device state
            return None

        values_by_node = {item.node_id: item.value for item in response.values}

        speed_reference_pct: float | None = None
        if mapping.speed_reference_node_id and mapping.speed_reference_node_id in values_by_node:
            try:
                speed_reference_pct = float(values_by_node[mapping.speed_reference_node_id])
            except (ValueError, TypeError):
                pass

        status: DeviceStatus | None = None
        if mapping.run_stop_node_id and mapping.run_stop_node_id in values_by_node:
            try:
                raw = values_by_node[mapping.run_stop_node_id]
                is_running = str(raw).lower() in ("true", "1")
                status = DeviceStatus.RUNNING if is_running else DeviceStatus.STOPPED
            except (ValueError, TypeError):
                pass

        return RuntimeCommandUpdateRequest(
            speed_reference_pct=speed_reference_pct,
            status=status,
        )

    async def write(self, payload: OPCUAWriteRequest) -> OPCUAWriteResponse:
        if not self._configuration.enabled or not self._configuration.endpoint_url:
            return OPCUAWriteResponse(written=0)

        written = 0
        try:
            from asyncua import Client, ua

            async with Client(url=self._configuration.endpoint_url, timeout=self._configuration.request_timeout_s) as client:
                for item in payload.writes:
                    try:
                        node = client.get_node(item.node_id)
                        variant_type = None
                        try:
                            variant_type = await node.read_data_type_as_variant_type()
                        except Exception:
                            variant_type = None

                        if variant_type is None:
                            await node.write_value(item.value)
                        else:
                            coerced_value = self._coerce_value_for_variant_type(item.value, str(variant_type))
                            await node.write_value(ua.Variant(coerced_value, variant_type))
                        written += 1
                    except Exception as item_exc:
                        print(f"OPC UA write failed for node {item.node_id}: {item_exc}")
        except Exception as exc:
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.ERROR,
                is_configured=True,
                endpoint_url=self._configuration.endpoint_url,
                last_error=str(exc),
            )

        return OPCUAWriteResponse(written=written)

    async def publish_device_telemetry(self, device: DeviceRecord) -> None:
        if not self.can_publish_telemetry(device):
            return

        writes: list[dict[str, Any]] = []
        telemetry_values = self._telemetry_values_for_publish(device)

        for telemetry_key, node_id in device.opcua_mapping.telemetry_node_ids.items():
            if telemetry_key not in telemetry_values:
                continue
            value = telemetry_values[telemetry_key]
            expected_type = OPCUA_TELEMETRY_VARIABLE_TYPES.get(telemetry_key, "String")
            typed_value = self._coerce_value(value, expected_type)
            writes.append({"node_id": node_id, "value": typed_value})

        if not writes:
            return

        await self.write(OPCUAWriteRequest(writes=writes))

    def _telemetry_values_for_publish(self, device: DeviceRecord) -> dict[str, bool | int | float | str]:
        telemetry = device.telemetry
        return {
            "command_state": device.runtime.status.value,
            "fault_state": bool(telemetry.fault_code),
            "fault_code": int(telemetry.fault_code),
            "commanded_frequency_hz": telemetry.commanded_frequency_hz,
            "output_frequency_hz": telemetry.output_frequency_hz,
            "output_voltage_v": telemetry.output_voltage_v,
            "output_current_a": telemetry.output_current_a,
            "speed_rpm": telemetry.speed_rpm,
            "electromagnetic_torque_nm": telemetry.electromagnetic_torque_nm,
            "load_torque_nm": telemetry.load_torque_nm,
            "mechanical_power_w": telemetry.mechanical_power_w,
            "estimated_temperature_c": telemetry.estimated_temperature_c,
        }

    def _coerce_value(self, value: bool | int | float | str, expected_type: str) -> bool | int | float | str:
        if expected_type == "Boolean":
            return bool(value)
        if expected_type == "Int32":
            try:
                return int(float(value))
            except (TypeError, ValueError):
                return 0
        if expected_type == "Float":
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0
        return str(value)

    def _coerce_value_for_variant_type(self, value: bool | int | float | str, variant_type: str) -> bool | int | float | str:
        normalized = variant_type.lower()

        if normalized.endswith("boolean"):
            if isinstance(value, str):
                return value.strip().lower() in ("true", "1", "yes", "on")
            return bool(value)

        if normalized.endswith("float") or normalized.endswith("double"):
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        if "int" in normalized:
            try:
                return int(float(value))
            except (TypeError, ValueError):
                return 0

        if normalized.endswith("string"):
            return str(value)

        return value


opcua_client_service = OpcUaClientService()
