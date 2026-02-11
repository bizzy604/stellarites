from fastapi import FastAPI, Form, Header
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import Config
from app.api.v1.reviews import router as reviews_router # Import the new router

app = FastAPI(
    title="NannyChain API",
    description="Backend for NannyChain: USSD, Stellar wallet mapping, Africa's Talking.",
    version="0.1.0",
)

# Include API routers
app.include_router(reviews_router, prefix="/api/v1", tags=["Reviews"])

USSD_API_KEY = Config.USSD_API_KEY or None


@app.get("/health")
def health():
    """
    Provide a health-check response for the service.
    
    Returns:
        JSONResponse: A JSON response with content {"status": "ok"} indicating the service is healthy.
    """
    return JSONResponse(content={"status": "ok"})


@app.post("/ussd", response_class=PlainTextResponse)
def ussd(
    sessionId: str = Form(""),
    phoneNumber: str = Form(""),
    text: str = Form(""),
    authorization: str | None = Header(None),
):
    """
    Handle Africa's Talking USSD callback and return the USSD response as plain text.
    
    Parameters:
        sessionId (str): USSD session identifier supplied by the gateway.
        phoneNumber (str): Caller phone number as provided by the gateway.
        text (str): Text payload representing the user's current USSD input.
        authorization (str | None): Optional `Authorization` header value; when `USSD_API_KEY` is set this is validated before processing.
    
    Returns:
        PlainTextResponse: The USSD response text to send back to the gateway, or an empty body with status code 403 when authorization fails.
    """
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