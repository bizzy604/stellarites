"""Africa's Talking SMS integration."""
import os

from app.config import Config

_initialized = False


def _init():
    global _initialized
    if _initialized:
        return
    if Config.AT_USERNAME and Config.AT_API_KEY:
        import africastalking
        africastalking.initialize(Config.AT_USERNAME, Config.AT_API_KEY)
        _initialized = True


def send_sms(to: str, message: str) -> bool:
    """Send SMS to a single number. 'to' can be 254712345678 or +254712345678."""
    _init()
    if not Config.AT_USERNAME or not Config.AT_API_KEY:
        return False
    to_clean = to.lstrip("+")
    if not to_clean.startswith("254"):
        to_clean = "254" + to_clean.lstrip("0")
    to_list = [f"+{to_clean}"]
    try:
        import africastalking
        africastalking.SMS.send(message, to_list)
        return True
    except Exception:
        return False
