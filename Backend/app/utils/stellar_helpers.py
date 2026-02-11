from typing import Optional
from app.config import Config


def build_stellar_explorer_url(tx_hash: Optional[str]) -> str:
    """Build a Stellar explorer link. Uses testnet or public based on config."""
    if not tx_hash:
        return ""
    network = "testnet" if Config.STELLAR_NETWORK.upper() == "TESTNET" else "public"
    return f"https://stellar.expert/explorer/{network}/tx/{tx_hash}"


def parse_memo(memo: Optional[str]) -> Optional[str]:
    return memo


def stroops_to_xlm(stroops: int) -> float:
    return float(stroops) / 10000000.0
