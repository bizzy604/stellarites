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
    """
    Selects the Stellar network constant according to the configured STELLAR_NETWORK.
    
    @returns The `Network.TESTNET_NETWORK` constant if `Config.STELLAR_NETWORK` is "TESTNET", otherwise `Network.PUBLIC_NETWORK`.
    """
    return Network.TESTNET_NETWORK if Config.STELLAR_NETWORK == "TESTNET" else Network.PUBLIC_NETWORK


def _get_horizon_url():
    """
    Selects the Horizon server base URL appropriate for the configured Stellar network.
    
    Returns:
        str: The Horizon base URL: "https://horizon-testnet.stellar.org" when Config.STELLAR_NETWORK is "TESTNET", otherwise "https://horizon.stellar.org".
    """
    if Config.STELLAR_NETWORK == "TESTNET":
        return "https://horizon-testnet.stellar.org"
    return "https://horizon.stellar.org"


def encrypt_secret(secret: str) -> str:
    """
    Encrypts a Stellar secret seed for persistent storage.
    
    Parameters:
        secret (str): Stellar secret seed (secret key) to encrypt.
    
    Returns:
        encrypted (str): Encrypted token as a UTF-8 string suitable for storage and later decryption.
    """
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    """
    Decrypts a stored Stellar secret key.
    
    Parameters:
        encrypted (str): Fernet token string (URL-safe base64) produced by `encrypt_secret`.
    
    Returns:
        secret (str): The original Stellar secret key.
    """
    return _fernet().decrypt(encrypted.encode()).decode()


def create_wallet_for_user() -> tuple[str, str]:
    """
    Generate a new Stellar keypair and return its public key alongside the encrypted secret.
    
    If running on TESTNET and Config.STELLAR_FUNDING_SECRET is set, the function attempts to fund the new account with 1 KSH; any errors during funding are ignored so wallet creation still succeeds.
    
    Returns:
        (public_key, encrypted_secret): `public_key` is the account's Stellar public key as a string; `encrypted_secret` is the corresponding secret key encrypted for storage.
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