"""IPFS (Pinata) integration."""
import httpx
from app.config import Config

async def pin_to_ipfs(pdf_bytes: bytes) -> str:
    """Pins PDF bytes to IPFS via Pinata. Returns CID."""
    if not Config.PINATA_API_KEY or not Config.PINATA_SECRET_KEY:
        raise ValueError("Pinata API keys are not configured.")

    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": Config.PINATA_API_KEY,
        "pinata_secret_api_key": Config.PINATA_SECRET_KEY,
    }
    files = {"file": ("certificate.pdf", pdf_bytes, "application/pdf")}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, files=files, timeout=30.0)
        response.raise_for_status()
        return response.json()["IpfsHash"]

def get_ipfs_url(cid: str) -> str:
    """Returns a gateway URL for a given IPFS CID."""
    if not Config.PINATA_GATEWAY:
        raise ValueError("Pinata gateway URL is not configured.")
    return f"{Config.PINATA_GATEWAY}{cid}"
