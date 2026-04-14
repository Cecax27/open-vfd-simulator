from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from open_vfd_simulator_backend.api.routes.devices import router as devices_router
from open_vfd_simulator_backend.api.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Open VFD Simulator API",
        version="0.1.0",
        description="Backend API for device management and simulation coordination.",
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
    app.include_router(devices_router)
    return app
