"""
Account Service

Stellar account management operations.
"""
from typing import Optional, Dict, List, Any
from stellar_sdk import Keypair, Operation, Asset

from app.services.stellar import get_stellar_service, StellarService
from app.utils.exceptions import StellarError
# from app.utils.constants import ACCOUNT_DATA_KEYS


class AccountService:
    """
    Service for Stellar account operations.
    
    Handles:
    - Account creation (funding from platform account)
    - Storing/retrieving account data (metadata)
    - Account queries
    """
    
    def __init__(self, stellar_service: Optional[StellarService] = None):
        self.stellar = stellar_service or get_stellar_service()
    
    def get_worker_profile(self, public_key: str) -> Dict[str, Any]:
        """
        Get worker profile data from Stellar account.
        
        Retrieves account data entries and formats them
        into a worker profile dictionary.
        """
        account_data = self.stellar.get_account_data(public_key)
        
        # Parse skills from comma-separated string
        skills_str = account_data.get('skills', '')
        skills = [s.strip() for s in skills_str.split(',') if s.strip()]
        
        return {
            "public_key": public_key,
            "worker_type": account_data.get('worker_type'),
            "skills": skills,
            "experience": account_data.get('experience'),
            "ipfs_profile_hash": account_data.get('ipfs_profile'),
            "name": account_data.get('name'),
            "phone_hash": account_data.get('phone_hash'),
        }
    
    def build_store_metadata_transaction(
        self,
        source_public_key: str,
        metadata: Dict[str, str]
    ):
        """
        Build a transaction to store metadata on an account.
        
        Args:
            source_public_key: Account to store data on
            metadata: Key-value pairs to store (max 64 bytes per value)
            
        Returns:
            Unsigned Transaction
        """
        account = self.stellar.load_account(source_public_key)
        builder = self.stellar.build_transaction(account)
        
        for key, value in metadata.items():
            if len(value.encode('utf-8')) > 64:
                raise StellarError(
                    message=f"Value for '{key}' exceeds 64 bytes",
                    operation="manage_data"
                )
            
            builder.append_manage_data_op(
                data_name=key,
                data_value=value
            )
        
        builder.set_timeout(30)
        return builder.build()
    
    def fund_new_account(
        self,
        new_public_key: str,
        starting_balance: str = "5"
    ) -> Dict[str, Any]:
        """
        Fund a new account from the platform account.
        
        Args:
            new_public_key: The new account's public key
            starting_balance: XLM to send (default: 5 XLM)
            
        Returns:
            Transaction result
            
        Note: Requires platform secret key to be configured.
        """
        if not self.stellar.platform_keypair:
            raise StellarError(
                message="Platform account not configured",
                operation="fund_account"
            )
        
        platform_account = self.stellar.load_account(
            self.stellar.platform_keypair.public_key
        )
        
        transaction = (
            self.stellar.build_transaction(platform_account)
            .append_create_account_op(
                destination=new_public_key,
                starting_balance=starting_balance
            )
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(self.stellar.platform_keypair)
        return self.stellar.submit_transaction(transaction)
    
    def get_account_info(self, public_key: str) -> Dict[str, Any]:
        """
        Get comprehensive account information.
        
        Returns:
            Account info including balances, data, and sequence
        """
        try:
            account = self.stellar.server.accounts().account_id(public_key).call()
            
            return {
                "id": account.get("id"),
                "sequence": account.get("sequence"),
                "balances": account.get("balances", []),
                "data": self.stellar.get_account_data(public_key),
                "signers": account.get("signers", []),
                "thresholds": account.get("thresholds", {}),
            }
        except Exception as e:
            raise StellarError(
                message=f"Failed to get account info: {str(e)}",
                operation="get_account_info",
                details={"public_key": public_key}
            )


# Singleton instance
_account_service: Optional[AccountService] = None


def get_account_service() -> AccountService:
    """Get or create the Account service singleton."""
    global _account_service
    if _account_service is None:
        _account_service = AccountService()
    return _account_service
