"""
Stellar Service

Base Stellar SDK wrapper providing core functionality.
"""
from typing import Optional, Dict, Any
from stellar_sdk import Server, Keypair, Network, TransactionBuilder, Asset

from app.config import get_settings
from app.utils.exceptions import StellarError


class StellarService:
    """
    Core Stellar service providing base functionality.
    
    Handles:
    - Server connection
    - Account queries
    - Transaction building
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.server = Server(self.settings.stellar_horizon_url)
        self.network_passphrase = self.settings.stellar_network_passphrase
        
        # Platform keypair (if configured)
        self._platform_keypair: Optional[Keypair] = None
        if self.settings.stellar_platform_secret:
            self._platform_keypair = Keypair.from_secret(
                self.settings.stellar_platform_secret
            )
    
    @property
    def platform_keypair(self) -> Optional[Keypair]:
        """Get platform account keypair."""
        return self._platform_keypair
    
    @property
    def platform_public_key(self) -> Optional[str]:
        """Get platform account public key."""
        if self._platform_keypair:
            return self._platform_keypair.public_key
        return self.settings.stellar_platform_public or None
    
    def load_account(self, public_key: str):
        """
        Load an account from Horizon.
        
        Args:
            public_key: Stellar public key
            
        Returns:
            Account object
            
        Raises:
            StellarError: If account cannot be loaded
        """
        try:
            return self.server.load_account(public_key)
        except Exception as e:
            raise StellarError(
                message=f"Failed to load account: {str(e)}",
                operation="load_account",
                details={"public_key": public_key}
            )
    
    def get_account_data(self, public_key: str) -> Dict[str, str]:
        """
        Get account data entries from a Stellar account.
        
        Returns:
            Dictionary of data key-value pairs
        """
        try:
            account = self.server.accounts().account_id(public_key).call()
            data = {}
            
            for key, value in account.get('data', {}).items():
                # Decode base64 value
                import base64
                decoded = base64.b64decode(value).decode('utf-8')
                data[key] = decoded
            
            return data
        except Exception as e:
            raise StellarError(
                message=f"Failed to get account data: {str(e)}",
                operation="get_account_data",
                details={"public_key": public_key}
            )
    
    def account_exists(self, public_key: str) -> bool:
        """Check if an account exists on the network."""
        try:
            self.server.accounts().account_id(public_key).call()
            return True
        except Exception:
            return False
    
    def get_account_balances(self, public_key: str) -> list:
        """Get account balances."""
        try:
            account = self.server.accounts().account_id(public_key).call()
            return account.get('balances', [])
        except Exception as e:
            raise StellarError(
                message=f"Failed to get balances: {str(e)}",
                operation="get_balances",
                details={"public_key": public_key}
            )
    
    def build_transaction(
        self,
        source_account,
        base_fee: int = 100
    ) -> TransactionBuilder:
        """
        Create a TransactionBuilder with common settings.
        
        Args:
            source_account: The source account object
            base_fee: Transaction fee in stroops
            
        Returns:
            TransactionBuilder ready for operations
        """
        return TransactionBuilder(
            source_account=source_account,
            network_passphrase=self.network_passphrase,
            base_fee=base_fee
        )
    
    def submit_transaction(self, transaction) -> Dict[str, Any]:
        """
        Submit a signed transaction to the network.
        
        Args:
            transaction: Signed Transaction object
            
        Returns:
            Response from Horizon
            
        Raises:
            StellarError: If submission fails
        """
        try:
            response = self.server.submit_transaction(transaction)
            return {
                "successful": response.get("successful", False),
                "hash": response.get("hash"),
                "ledger": response.get("ledger"),
                "result_xdr": response.get("result_xdr")
            }
        except Exception as e:
            raise StellarError(
                message=f"Transaction submission failed: {str(e)}",
                operation="submit_transaction"
            )


# Singleton instance
_stellar_service: Optional[StellarService] = None


def get_stellar_service() -> StellarService:
    """Get or create the Stellar service singleton."""
    global _stellar_service
    if _stellar_service is None:
        _stellar_service = StellarService()
    return _stellar_service
