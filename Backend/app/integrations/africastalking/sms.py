"""Africa's Talking SMS integration."""
import os

from app.config import Config

_initialized = False


def _init():
    """
    Initialize the Africa's Talking SDK when credentials are available.
    
    If the SDK has already been initialized, this function returns immediately. When both Config.AT_USERNAME and Config.AT_API_KEY are set, it initializes the africastalking client and marks the module as initialized; if credentials are missing, it does nothing.
    """
    global _initialized
    if _initialized:
        return
    if Config.AT_USERNAME and Config.AT_API_KEY:
        import africastalking
        africastalking.initialize(Config.AT_USERNAME, Config.AT_API_KEY)
        _initialized = True


def send_sms(to: str, message: str) -> bool:
    """
    Send an SMS message to a single Kenyan phone number.
    
    Parameters:
        to (str): Recipient number in either "254712345678", "+254712345678", or a local format like "0712345678".
        message (str): Text content of the SMS.
    
    Returns:
        True if the message was sent successfully; False if credentials are missing or if sending failed.
    """
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