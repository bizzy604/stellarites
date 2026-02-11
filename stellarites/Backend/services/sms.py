# services/sms_service.py
import africastalking
from typing import Dict

class SMSVerificationService:
    """
    SMS-based verification using Africa's Talking API.
    Critical for user experience in Kenyan market.
    """
    
    def __init__(self, username: str, api_key: str):
        africastalking.initialize(username, api_key)
        self.sms = africastalking.SMS
        
    async def send_otp(self, phone_number: str, otp_code: str) -> Dict:
        """
        Send OTP for phone verification.
        
        Phone format: +254XXXXXXXXX (Kenyan format)
        """
        message = f"Your NannyChain verification code is: {otp_code}. Valid for 10 minutes."
        
        try:
            response = self.sms.send(message, [phone_number])
            return {
                'success': True,
                'message_id': response['SMSMessageData']['Recipients'][0]['messageId'],
                'status': response['SMSMessageData']['Recipients'][0]['status']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def notify_payment_escrow(
        self,
        worker_phone: str,
        employer_name: str,
        amount: str,
        release_date: str
    ):
        """Notify worker when employer creates escrow."""
        message = (
            f"New payment: {employer_name} has deposited KES {amount}. "
            f"Available on {release_date}. View in NannyChain app."
        )
        
        await self.sms.send(message, [worker_phone])
    
    async def notify_review_period(
        self,
        phone: str,
        counterparty_name: str,
        employment_end_date: str
    ):
        """Notify after 3 months for review."""
        message = (
            f"You can now review your experience with {counterparty_name}. "
            f"Your feedback helps build trust in NannyChain."
        )
        
        await self.sms.send(message, [phone])