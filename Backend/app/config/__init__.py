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
