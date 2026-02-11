from app.utils.exceptions import ValidationError


def validate_stellar_public_key(public_key: str) -> str:
    """Minimal validator for Stellar public keys.

    This implementation is permissive for now — it only checks basic length.
    Replace with proper ed25519-checking later.
    """
    if not public_key or not isinstance(public_key, str):
        raise ValidationError("Invalid public key")
    if len(public_key) < 10:
        raise ValidationError("Public key too short")
    return public_key
