from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from open_vfd_simulator_backend.api.routes.configuration import router as configuration_router
from open_vfd_simulator_backend.api.routes.devices import router as devices_router
from open_vfd_simulator_backend.api.routes.health import router as health_router
from open_vfd_simulator_backend.services.simulation_runtime import simulation_runtime


@asynccontextmanager
async def lifespan(_: FastAPI):
    simulation_runtime.start()
    try:
        yield
    finally:
        await simulation_runtime.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Open VFD Simulator API",
        version="0.1.0",
        description="Backend API for device management and simulation coordination.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(configuration_router)
    app.include_router(devices_router)
    return app
