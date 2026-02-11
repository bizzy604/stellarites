# services/nannychain_assets.py
from stellar_sdk import Asset, Keypair
from typing import Dict, List

class NannyChainAssetSystem:
    """
    Custom token economy for NannyChain ecosystem.
    
    Asset Types:
    1. WORK-CONTRACT: Employment verification tokens
    2. SKILL-BADGE: Experience milestone tokens
    3. REVIEW-TOKEN: Reputation system tokens
    4. ESCROW-KES: Kenyan Shilling stablecoin representation
    """
    
    def __init__(self, issuer_keypair: Keypair, config: StellarConfig):
        self.issuer = issuer_keypair
        self.config = config
        
        # Define asset types
        self.WORK_CONTRACT = Asset("WORK", issuer_keypair.public_key)
        self.SKILL_CHILDCARE = Asset("SKILL-CC", issuer_keypair.public_key)
        self.SKILL_COOKING = Asset("SKILL-CK", issuer_keypair.public_key)
        self.REVIEW_TOKEN = Asset("REVIEW", issuer_keypair.public_key)
        
    async def issue_employment_contract(
        self,
        worker_public_key: str,
        employer_public_key: str,
        contract_metadata: Dict
    ) -> Dict:
        """
        Issue WORK token representing employment relationship.
        
        Metadata stored in transaction memo:
        - Contract start date
        - Agreed wage (KES)
        - Role type
        - Contract hash
        """
        # Create unique contract token amount = 0.0000001 (represents 1 contract)
        # Memo contains contract details hash
        
        contract_hash = self._generate_contract_hash(contract_metadata)
        
        # Issue to worker's account
        result = await self.asset_manager.submit_payment(
            source_keypair=self.issuer,
            destination=worker_public_key,
            amount="0.0000001",
            asset=self.WORK_CONTRACT,
            memo=contract_hash[:28]  # Stellar memo limit
        )
        
        return {
            'contract_token_tx': result['transaction_hash'],
            'contract_hash': contract_hash,
            'worker': worker_public_key,
            'employer': employer_public_key
        }
    
    async def issue_skill_badge(
        self,
        worker_public_key: str,
        skill_type: str,
        experience_months: int
    ) -> Dict:
        """
        Award skill badge based on verified work history.
        
        Badge Levels (by token amount):
        - 0.0001 = Beginner (<12 months)
        - 0.0002 = Intermediate (12-36 months)
        - 0.0003 = Advanced (36-60 months)
        - 0.0004 = Expert (60+ months)
        """
        skill_asset_map = {
            'childcare': self.SKILL_CHILDCARE,
            'cooking': self.SKILL_COOKING
        }
        
        badge_level = self._calculate_badge_level(experience_months)
        asset = skill_asset_map.get(skill_type.lower())
        
        result = await self.asset_manager.submit_payment(
            source_keypair=self.issuer,
            destination=worker_public_key,
            amount=badge_level,
            asset=asset,
            memo=f"Verified {experience_months}mo"
        )
        
        return result
    
    def _calculate_badge_level(self, months: int) -> str:
        if months < 12:
            return "0.0001"
        elif months < 36:
            return "0.0002"
        elif months < 60:
            return "0.0003"
        else:
            return "0.0004"
    
    def _generate_contract_hash(self, metadata: Dict) -> str:
        """Generate deterministic hash of contract terms."""
        import hashlib
        import json
        
        canonical = json.dumps(metadata, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()