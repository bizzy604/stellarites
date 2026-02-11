"""
Horizon Service

Direct Horizon API queries for various data.
"""
from typing import Optional, Dict, List, Any
from stellar_sdk import Server

from app.config import get_settings
from app.utils.exceptions import StellarError


class HorizonService:
    """
    Service for direct Horizon API queries.
    
    Handles:
    - Transaction queries
    - Effects queries
    - Ledger queries
    - Streaming operations
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.server = Server(self.settings.stellar_horizon_url)
    
    def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Get a transaction by its hash.
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction details
        """
        try:
            tx = self.server.transactions().transaction(tx_hash).call()
            return {
                "id": tx.get("id"),
                "hash": tx.get("hash"),
                "ledger": tx.get("ledger"),
                "created_at": tx.get("created_at"),
                "source_account": tx.get("source_account"),
                "fee_charged": tx.get("fee_charged"),
                "operation_count": tx.get("operation_count"),
                "successful": tx.get("successful"),
                "memo": tx.get("memo"),
                "memo_type": tx.get("memo_type"),
            }
        except Exception as e:
            raise StellarError(
                message=f"Failed to get transaction: {str(e)}",
                operation="get_transaction",
                tx_hash=tx_hash
            )
    
    def get_transaction_operations(
        self,
        tx_hash: str
    ) -> List[Dict[str, Any]]:
        """Get operations for a transaction."""
        try:
            response = (
                self.server
                .operations()
                .for_transaction(tx_hash)
                .call()
            )
            return response.get("_embedded", {}).get("records", [])
        except Exception as e:
            raise StellarError(
                message=f"Failed to get operations: {str(e)}",
                operation="get_operations",
                tx_hash=tx_hash
            )
    
    def get_account_transactions(
        self,
        public_key: str,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get recent transactions for an account."""
        try:
            query = (
                self.server
                .transactions()
                .for_account(public_key)
                .limit(limit)
                .order("desc")
            )
            
            if cursor:
                query = query.cursor(cursor)
            
            response = query.call()
            return response.get("_embedded", {}).get("records", [])
        except Exception as e:
            raise StellarError(
                message=f"Failed to get transactions: {str(e)}",
                operation="get_account_transactions",
                details={"public_key": public_key}
            )
    
    def get_account_effects(
        self,
        public_key: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get effects (events) for an account."""
        try:
            response = (
                self.server
                .effects()
                .for_account(public_key)
                .limit(limit)
                .order("desc")
                .call()
            )
            return response.get("_embedded", {}).get("records", [])
        except Exception as e:
            raise StellarError(
                message=f"Failed to get effects: {str(e)}",
                operation="get_effects",
                details={"public_key": public_key}
            )
    
    def get_latest_ledger(self) -> Dict[str, Any]:
        """Get the latest ledger information."""
        try:
            response = self.server.ledgers().limit(1).order("desc").call()
            ledgers = response.get("_embedded", {}).get("records", [])
            
            if ledgers:
                ledger = ledgers[0]
                return {
                    "sequence": ledger.get("sequence"),
                    "hash": ledger.get("hash"),
                    "closed_at": ledger.get("closed_at"),
                    "transaction_count": ledger.get("successful_transaction_count", 0),
                    "operation_count": ledger.get("operation_count", 0),
                }
            return {}
        except Exception as e:
            raise StellarError(
                message=f"Failed to get latest ledger: {str(e)}",
                operation="get_latest_ledger"
            )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check Horizon server health.
        
        Returns:
            Health status and latest ledger info
        """
        try:
            ledger = self.get_latest_ledger()
            return {
                "healthy": True,
                "network": self.settings.stellar_network,
                "horizon_url": self.settings.stellar_horizon_url,
                "latest_ledger": ledger.get("sequence"),
                "latest_ledger_time": ledger.get("closed_at"),
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "network": self.settings.stellar_network,
            }


# Singleton instance
_horizon_service: Optional[HorizonService] = None


def get_horizon_service() -> HorizonService:
    """Get or create the Horizon service singleton."""
    global _horizon_service
    if _horizon_service is None:
        _horizon_service = HorizonService()
    return _horizon_service
