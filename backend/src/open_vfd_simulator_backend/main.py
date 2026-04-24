import os

import uvicorn

from open_vfd_simulator_backend.api.app import create_app

app = create_app()


def run() -> None:
    host = os.getenv("OPEN_VFD_HOST", "127.0.0.1")
    port = int(os.getenv("OPEN_VFD_PORT", "8000"))
    log_level = os.getenv("OPEN_VFD_LOG_LEVEL", "info")

    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=False,
        log_level=log_level,
    )


if __name__ == "__main__":
    run()