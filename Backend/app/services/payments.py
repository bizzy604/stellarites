"""
Payment Service

Stellar payment operations and history queries.
"""
from typing import Optional, Dict, List, Any
from stellar_sdk import Asset, Keypair

from app.services.stellar import get_stellar_service, StellarService
from app.utils.exceptions import StellarError
from app.utils.stellar_helpers import parse_memo, stroops_to_xlm


class PaymentService:
    """
    Service for Stellar payment operations.
    
    Handles:
    - Sending payments
    - Querying payment history
    - Payment verification
    """
    
    def __init__(self, stellar_service: Optional[StellarService] = None):
        self.stellar = stellar_service or get_stellar_service()
    
    def build_payment_transaction(
        self,
        source_public_key: str,
        destination_public_key: str,
        amount: str,
        asset: Optional[Asset] = None,
        memo: Optional[str] = None
    ):
        """
        Build a payment transaction.

        If the destination account does not exist on the Stellar network yet,
        a ``create_account`` operation is used instead of ``payment`` so the
        first transfer also activates the account on-chain.
        
        Args:
            source_public_key: Sender's public key
            destination_public_key: Recipient's public key
            amount: Amount to send (string for precision)
            asset: Asset to send (default: native XLM)
            memo: Optional text memo
            
        Returns:
            Unsigned Transaction
        """
        if asset is None:
            asset = Asset.native()
        
        account = self.stellar.load_account(source_public_key)
        builder = self.stellar.build_transaction(account)

        # Check whether the destination already exists on the network.
        # If not, we must use create_account (which funds + creates in one op).
        dest_exists = self.stellar.account_exists(destination_public_key)

        if dest_exists:
            builder.append_payment_op(
                destination=destination_public_key,
                amount=amount,
                asset=asset
            )
        else:
            # create_account only works with native XLM
            builder.append_create_account_op(
                destination=destination_public_key,
                starting_balance=amount
            )
        
        if memo:
            builder.add_text_memo(memo)
        
        builder.set_timeout(30)
        return builder.build()
    
    def send_payment(
        self,
        sender_keypair: Keypair,
        destination_public_key: str,
        amount: str,
        memo: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a payment from one account to another.
        
        Args:
            sender_keypair: Sender's keypair (includes secret)
            destination_public_key: Recipient's public key
            amount: Amount to send
            memo: Optional memo (e.g., "employment_id:12345")
            
        Returns:
            Transaction result
        """
        transaction = self.build_payment_transaction(
            source_public_key=sender_keypair.public_key,
            destination_public_key=destination_public_key,
            amount=amount,
            memo=memo
        )
        
        transaction.sign(sender_keypair)
        return self.stellar.submit_transaction(transaction)
    
    def get_payment_history(
        self,
        public_key: str,
        limit: int = 50,
        cursor: Optional[str] = None,
        order: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        Get payment history for an account.
        
        Args:
            public_key: Account to query
            limit: Max number of payments to return
            cursor: Pagination cursor
            order: 'asc' or 'desc'
            
        Returns:
            List of payment records
        """
        try:
            query = (
                self.stellar.server
                .payments()
                .for_account(public_key)
                .limit(limit)
                .order(order)
            )
            
            if cursor:
                query = query.cursor(cursor)
            
            response = query.call()
            payments = []
            
            for record in response.get("_embedded", {}).get("records", []):
                if record.get("type") != "payment":
                    continue
                
                payments.append({
                    "id": record.get("id"),
                    "type": record.get("type"),
                    "from": record.get("from"),
                    "to": record.get("to"),
                    "amount": record.get("amount"),
                    "asset_type": record.get("asset_type"),
                    "asset_code": record.get("asset_code"),
                    "asset_issuer": record.get("asset_issuer"),
                    "created_at": record.get("created_at"),
                    "transaction_hash": record.get("transaction_hash"),
                    "paging_token": record.get("paging_token"),
                })
            
            return payments
            
        except Exception as e:
            raise StellarError(
                message=f"Failed to get payment history: {str(e)}",
                operation="get_payment_history",
                details={"public_key": public_key}
            )
    
    def get_incoming_payments(
        self,
        public_key: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get only incoming payments for an account."""
        all_payments = self.get_payment_history(public_key, limit)
        return [p for p in all_payments if p.get("to") == public_key]
    
    def get_outgoing_payments(
        self,
        public_key: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get only outgoing payments from an account."""
        all_payments = self.get_payment_history(public_key, limit)
        return [p for p in all_payments if p.get("from") == public_key]
    
    def get_payment_stats(self, public_key: str) -> Dict[str, Any]:
        """
        Calculate payment statistics for an account.
        
        Returns:
            Stats including total received, total sent, counts
        """
        payments = self.get_payment_history(public_key, limit=200)
        
        total_received = 0.0
        total_sent = 0.0
        received_count = 0
        sent_count = 0
        unique_senders = set()
        unique_recipients = set()
        
        for payment in payments:
            amount = float(payment.get("amount", 0))
            
            if payment.get("to") == public_key:
                total_received += amount
                received_count += 1
                unique_senders.add(payment.get("from"))
            else:
                total_sent += amount
                sent_count += 1
                unique_recipients.add(payment.get("to"))
        
        return {
            "total_received": total_received,
            "total_sent": total_sent,
            "received_count": received_count,
            "sent_count": sent_count,
            "unique_senders": len(unique_senders),
            "unique_recipients": len(unique_recipients),
        }


# Singleton instance
_payment_service: Optional[PaymentService] = None


def get_payment_service() -> PaymentService:
    """Get or create the Payment service singleton."""
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service
