# services/payment_escrow.py
from stellar_sdk import (
    TransactionBuilder, 
    Claimant, 
    ClaimPredicate,
    CreateClaimableBalance,
    Asset
)
from datetime import datetime, timedelta

class PaymentEscrowService:
    """
    Smart contract-like escrow using Stellar's Claimable Balances.
    
    Flow:
    1. Employer deposits monthly wage into claimable balance
    2. Worker can claim ONLY after 30 days OR employer releases early
    3. Employer can reclaim ONLY if worker doesn't claim in 90 days
    4. Automatic dispute resolution via time-locks
    """
    
    def __init__(self, config: StellarConfig):
        self.config = config
        self.server = config.get_horizon_server()
        
    async def create_wage_escrow(
        self,
        employer_keypair: Keypair,
        worker_public_key: str,
        wage_amount: str,
        payment_month: str
    ) -> Dict:
        """
        Create escrow for monthly wage with time-locked release.
        
        Release Conditions:
        - Worker can claim after 30 days from now
        - OR Employer can release immediately (early release signature)
        - Employer can reclaim after 90 days if unclaimed (safety mechanism)
        """
        
        employer_account = self.server.load_account(employer_keypair.public_key)
        
        # Define time-locked claim conditions
        worker_can_claim_after = int((datetime.utcnow() + timedelta(days=30)).timestamp())
        employer_can_reclaim_after = int((datetime.utcnow() + timedelta(days=90)).timestamp())
        
        # Create claimants with predicates
        worker_claimant = Claimant(
            destination=worker_public_key,
            predicate=ClaimPredicate.predicate_not(
                ClaimPredicate.predicate_before_absolute_time(worker_can_claim_after)
            )
        )
        
        employer_claimant = Claimant(
            destination=employer_keypair.public_key,
            predicate=ClaimPredicate.predicate_not(
                ClaimPredicate.predicate_before_absolute_time(employer_can_reclaim_after)
            )
        )
        
        # Build transaction
        transaction = (
            TransactionBuilder(
                source_account=employer_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_create_claimable_balance_op(
                asset=Asset.native(),  # XLM (or KES stablecoin)
                amount=wage_amount,
                claimants=[worker_claimant, employer_claimant]
            )
            .add_text_memo(f"Wage escrow: {payment_month}")
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(employer_keypair)
        response = self.server.submit_transaction(transaction)
        
        # Store escrow record in database
        escrow_record = {
            'balance_id': response['hash'],  # Use tx hash as balance identifier
            'employer': employer_keypair.public_key,
            'worker': worker_public_key,
            'amount': wage_amount,
            'payment_month': payment_month,
            'release_date': datetime.fromtimestamp(worker_can_claim_after),
            'status': 'locked',
            'created_at': datetime.utcnow()
        }
        
        await self._store_escrow_record(escrow_record)
        
        return {
            'success': True,
            'escrow_id': response['hash'],
            'amount': wage_amount,
            'release_date': datetime.fromtimestamp(worker_can_claim_after).isoformat(),
            'worker_can_claim_after': worker_can_claim_after
        }
    
    async def worker_claim_payment(
        self,
        worker_keypair: Keypair,
        escrow_id: str
    ) -> Dict:
        """
        Worker claims released payment from escrow.
        """
        worker_account = self.server.load_account(worker_keypair.public_key)
        
        # Find claimable balance
        claimable_balances = self.server.claimable_balances() \
            .for_claimant(worker_keypair.public_key) \
            .call()
        
        # Build claim transaction
        transaction = (
            TransactionBuilder(
                source_account=worker_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_claim_claimable_balance_op(
                balance_id=escrow_id
            )
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(worker_keypair)
        
        try:
            response = self.server.submit_transaction(transaction)
            
            # Update database status
            await self._update_escrow_status(escrow_id, 'claimed')
            
            return {
                'success': True,
                'transaction_hash': response['hash'],
                'message': 'Payment claimed successfully'
            }
        except Exception as e:
            if "op_not_authorized" in str(e):
                return {
                    'success': False,
                    'error': 'Payment not yet released. Wait until release date.'
                }
            raise
    
    async def employer_early_release(
        self,
        employer_keypair: Keypair,
        worker_public_key: str,
        wage_amount: str
    ) -> Dict:
        """
        Employer manually releases payment before 30-day lock.
        Direct payment bypassing escrow.
        """
        result = await self.tx_processor.submit_payment(
            source_keypair=employer_keypair,
            destination=worker_public_key,
            amount=wage_amount,
            memo="Early wage release"
        )
        
        return result
    
    async def _store_escrow_record(self, record: Dict):
        """Store escrow in PostgreSQL."""
        # Implementation with your database layer
        pass
    
    async def _update_escrow_status(self, escrow_id: str, status: str):
        """Update escrow status in database."""
        pass