from __future__ import annotations

import asyncio
from contextlib import suppress

from open_vfd_simulator_backend.services.device_registry import registry
from open_vfd_simulator_backend.services.software_configuration import configuration_store


class SimulationRuntime:
    def __init__(self) -> None:
        self._stop_event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task is not None and not self._task.done():
            return

        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task is None:
            return

        self._stop_event.set()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            configuration = configuration_store.get_configuration()
            delta_time_s = configuration.simulation_step_ms / 1000.0
            registry.step_all_devices(delta_time_s)

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=delta_time_s)
            except asyncio.TimeoutError:
                continue


simulation_runtime = SimulationRuntime()
