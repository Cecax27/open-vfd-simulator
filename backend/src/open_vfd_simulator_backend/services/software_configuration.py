from __future__ import annotations

from threading import Lock

from open_vfd_simulator_backend.domain.models import (
    SoftwareConfiguration,
    SoftwareConfigurationUpdateRequest,
)


class SoftwareConfigurationStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._configuration = SoftwareConfiguration()

    def get_configuration(self) -> SoftwareConfiguration:
        with self._lock:
            return self._configuration.model_copy(deep=True)

    def update_configuration(
        self,
        payload: SoftwareConfigurationUpdateRequest,
    ) -> SoftwareConfiguration:
        with self._lock:
            self._configuration = self._configuration.model_copy(
                update={
                    "simulation_step_ms": (
                        payload.simulation_step_ms
                        if payload.simulation_step_ms is not None
                        else self._configuration.simulation_step_ms
                    )
                }
            )
            return self._configuration.model_copy(deep=True)


configuration_store = SoftwareConfigurationStore()
