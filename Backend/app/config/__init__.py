# Configuration package
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """App configuration from environment."""
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/nannychain")

    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Stellar
    STELLAR_NETWORK = os.getenv("STELLAR_NETWORK", "TESTNET")
    STELLAR_FUNDING_SECRET = os.getenv("STELLAR_FUNDING_SECRET", "")

    # Encryption (for Stellar secret keys) - any string; derived to Fernet key
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "changeme")

    # Africa's Talking
    AT_USERNAME = os.getenv("AT_USERNAME", "")
    AT_API_KEY = os.getenv("AT_API_KEY", "")

    # USSD
    USSD_API_KEY = os.getenv("USSD_API_KEY", "")
    USSD_SESSION_TTL = int(os.getenv("USSD_SESSION_TTL", "180"))

    # IPFS (Pinata)
    PINATA_API_KEY = os.getenv("PINATA_API_KEY", "")
    PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY", "")
    PINATA_GATEWAY = os.getenv("PINATA_GATEWAY", "https://gateway.pinata.cloud/ipfs/")

    # Reviews
    REVIEW_UNLOCK_DAYS = int(os.getenv("REVIEW_UNLOCK_DAYS", "0"))  # Days after engagement end_date before reviews are allowed
    REVIEW_LINK_EXPIRY_DAYS = int(os.getenv("REVIEW_LINK_EXPIRY_DAYS", "7"))
    REVIEW_FRONTEND_URL = os.getenv("REVIEW_FRONTEND_URL", "https://app.nannychain.com/review")

    # JWT signing
    SECRET_KEY = os.getenv("SECRET_KEY", "changeme")

    # App debug
    app_debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")


def get_settings() -> Config:
    return Config()
