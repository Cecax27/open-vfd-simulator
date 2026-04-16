from __future__ import annotations

from typing import Any

from open_vfd_simulator_backend.domain.models import (
    DeviceRecord,
    DeviceStatus,
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
                node = client.get_node(node_id)
                children = await node.get_children()
                for child in children[:200]:
                    display_name = await child.read_display_name()
                    node_class = await child.read_node_class()
                    items.append(
                        OPCUABrowseItem(
                            node_id=child.nodeid.to_string(),
                            display_name=display_name.Text,
                            node_class=str(node_class),
                        )
                    )
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
            from asyncua import Client

            async with Client(url=self._configuration.endpoint_url, timeout=self._configuration.request_timeout_s) as client:
                for item in payload.writes:
                    node = client.get_node(item.node_id)
                    await node.write_value(item.value)
                    written += 1
        except Exception as exc:
            self._status = OPCUAConnectionStatus(
                state=OPCUAConnectionState.ERROR,
                is_configured=True,
                endpoint_url=self._configuration.endpoint_url,
                last_error=str(exc),
            )

        return OPCUAWriteResponse(written=written)


opcua_client_service = OpcUaClientService()
