from typing import Optional


def build_stellar_explorer_url(tx_hash: Optional[str]) -> str:
    if not tx_hash:
        return ""
    return f"https://stellar.expert/explorer/public/tx/{tx_hash}"


def parse_memo(memo: Optional[str]) -> Optional[str]:
    return memo


def stroops_to_xlm(stroops: int) -> float:
    return float(stroops) / 10000000.0
