"""
App package initializer. Exposes `app` FastAPI instance.

This file is intentionally defensive: it will try to include known
routers but won't fail startup if optional modules are missing.
"""
from fastapi import FastAPI

from .config import get_settings

settings = get_settings()

app = FastAPI(title="NannyChain", debug=settings.app_debug)


@app.get("/")
async def _health():
    return {"status": "ok"}


def _include_router(module_path: str, router_attr: str = "router"):
    try:
        module = __import__(module_path, fromlist=[router_attr])
        router = getattr(module, router_attr, None)
        if router:
            app.include_router(router)
            print(f"Included router from {module_path}")
    except Exception as exc:
        import traceback
        traceback.print_exc()
        print(f"Failed to include router {module_path}: {exc}")
        return


# Attempt to include common routers
_include_router("app.routes.payments")
