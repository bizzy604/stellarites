from fastapi import FastAPI, Form, Header
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import Config

app = FastAPI(
    title="NannyChain API",
    description="Backend for NannyChain: USSD, Stellar wallet mapping, Africa's Talking.",
    version="0.1.0",
)

USSD_API_KEY = Config.USSD_API_KEY or None


@app.get("/health")
def health():
    """Health check."""
    return JSONResponse(content={"status": "ok"})


@app.post("/ussd", response_class=PlainTextResponse)
def ussd(
    sessionId: str = Form(""),
    phoneNumber: str = Form(""),
    text: str = Form(""),
    authorization: str | None = Header(None),
):
    """Africa's Talking USSD callback. Form: sessionId, phoneNumber, text."""
    if USSD_API_KEY:
        token = (authorization or "").replace("Bearer ", "").strip()
        if token != USSD_API_KEY:
            return PlainTextResponse(content="", status_code=403)

    from app.ussd.handler import handle_ussd
    response_text = handle_ussd(sessionId, phoneNumber, text)
    return PlainTextResponse(content=response_text)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=False)
