"""Stellar wallet creation and secret encryption for NannyChain."""
import hashlib
import base64
from cryptography.fernet import Fernet

from stellar_sdk import Keypair, Network, Server
from stellar_sdk.transaction_builder import TransactionBuilder

from app.config import Config


def _fernet():
    """Derive a Fernet key from ENCRYPTION_KEY."""
    key_bytes = hashlib.sha256(Config.ENCRYPTION_KEY.encode()).digest()
    b64 = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64)


def _get_network():
    return Network.TESTNET_NETWORK if Config.STELLAR_NETWORK == "TESTNET" else Network.PUBLIC_NETWORK


def _get_horizon_url():
    if Config.STELLAR_NETWORK == "TESTNET":
        return "https://horizon-testnet.stellar.org"
    return "https://horizon.stellar.org"


def encrypt_secret(secret: str) -> str:
    """Encrypt a Stellar secret key for storage."""
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    """Decrypt a stored Stellar secret key."""
    return _fernet().decrypt(encrypted.encode()).decode()


def create_wallet_for_user() -> tuple[str, str]:
    """
    Create a new Stellar keypair for a user.
    On testnet with STELLAR_FUNDING_SECRET set, funds the account with 1 XLM.
    Returns (public_key, encrypted_secret).
    """
    keypair = Keypair.random()
    public_key = keypair.public_key
    secret = keypair.secret

    if Config.STELLAR_NETWORK == "TESTNET" and Config.STELLAR_FUNDING_SECRET:
        try:
            server = Server(_get_horizon_url())
            source = Keypair.from_secret(Config.STELLAR_FUNDING_SECRET)
            source_account = server.load_account(source.public_key)
            tx = (
                TransactionBuilder(source_account, _get_network())
                .append_create_account_op(public_key, "1")
                .set_timeout(60)
                .build()
            )
            tx.sign(source)
            server.submit_transaction(tx)
        except Exception:
            pass  # Keypair still valid; can be funded later via Friendbot

    return public_key, encrypt_secret(secret)
