# services/review_system.py
from datetime import datetime, timedelta
from stellar_sdk import Asset

class MutualReviewSystem:
    """
    Time-locked, blockchain-anchored review system.
    
    Rules:
    - Reviews can only be submitted after 3 months of employment
    - Reviews are immutable once submitted (stored on-chain)
    - Both parties can review each other
    - Reputation score calculated from on-chain reviews
    """
    
    def __init__(
        self,
        config: StellarConfig,
        asset_system: NannyChainAssetSystem,
        db_client
    ):
        self.config = config
        self.asset_system = asset_system
        self.db = db_client
        self.server = config.get_horizon_server()
        
    async def submit_review(
        self,
        reviewer_keypair: Keypair,
        reviewee_stellar_address: str,
        contract_id: str,
        rating: int,  # 1-5 stars
        review_text: str,
        review_categories: Dict  # {'punctuality': 5, 'skill': 4, 'communication': 5}
    ) -> Dict:
        """
        Submit review after validating 3-month employment period.
        
        Review stored as:
        1. Transaction memo (rating + hash)
        2. Database (full text)
        3. REVIEW token issued to reviewee
        """
        
        # Validate 3-month period
        contract = await self.db.get('employment_contracts', {'id': contract_id})
        
        if not contract:
            return {'success': False, 'error': 'Contract not found'}
        
        start_date = contract['start_date']
        three_months_later = start_date + timedelta(days=90)
        
        if datetime.utcnow() < three_months_later:
            days_remaining = (three_months_later - datetime.utcnow()).days
            return {
                'success': False,
                'error': f'Review period not reached. Wait {days_remaining} more days.'
            }
        
        # Check if review already exists
        existing_review = await self.db.get('reviews', {
            'contract_id': contract_id,
            'reviewer': reviewer_keypair.public_key
        })
        
        if existing_review:
            return {'success': False, 'error': 'You already reviewed this employment'}
        
        # Create review hash
        review_hash = self._create_review_hash(rating, review_categories)
        
        # Issue REVIEW token to reviewee
        review_token_amount = self._calculate_review_token_value(rating)
        
        reviewer_account = self.server.load_account(reviewer_keypair.public_key)
        
        transaction = (
            TransactionBuilder(
                source_account=reviewer_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_payment_op(
                destination=reviewee_stellar_address,
                asset=self.asset_system.REVIEW_TOKEN,
                amount=review_token_amount,
                source=self.asset_system.issuer.public_key  # Issued by platform
            )
            .add_text_memo(review_hash[:28])
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(reviewer_keypair)
        transaction.sign(self.asset_system.issuer)  # Co-sign for token issuance
        
        response = self.server.submit_transaction(transaction)
        
        # Store full review in database
        review_record = {
            'contract_id': contract_id,
            'reviewer': reviewer_keypair.public_key,
            'reviewee': reviewee_stellar_address,
            'rating': rating,
            'review_text': review_text,
            'categories': review_categories,
            'review_hash': review_hash,
            'blockchain_tx': response['hash'],
            'created_at': datetime.utcnow()
        }
        
        await self.db.insert('reviews', review_record)
        
        # Update reputation score
        await self._update_reputation_score(reviewee_stellar_address)
        
        return {
            'success': True,
            'review_id': review_record['id'],
            'blockchain_tx': response['hash'],
            'message': 'Review submitted and anchored on blockchain'
        }
    
    async def get_user_reputation(self, stellar_address: str) -> Dict:
        """
        Calculate comprehensive reputation from on-chain REVIEW tokens.
        """
        
        account = self.server.accounts().account_id(stellar_address).call()
        
        review_tokens = 0.0
        for balance in account['balances']:
            if balance.get('asset_code') == 'REVIEW':
                review_tokens += float(balance['balance'])
        
        # Get detailed reviews from database
        reviews = await self.db.query('reviews', {'reviewee': stellar_address})
        
        if not reviews:
            return {
                'stellar_address': stellar_address,
                'reputation_score': 0,
                'total_reviews': 0,
                'average_rating': 0,
                'message': 'No reviews yet'
            }
        
        # Calculate metrics
        total_reviews = len(reviews)
        average_rating = sum(r['rating'] for r in reviews) / total_reviews
        
        # Category breakdown
        category_scores = {}
        for review in reviews:
            for category, score in review['categories'].items():
                if category not in category_scores:
                    category_scores[category] = []
                category_scores[category].append(score)
        
        category_averages = {
            cat: sum(scores) / len(scores)
            for cat, scores in category_scores.items()
        }
        
        # Reputation score (weighted)
        reputation_score = (
            (average_rating / 5) * 0.7 +  # 70% from rating
            (review_tokens * 100) * 0.3    # 30% from token accumulation
        ) * 100
        
        return {
            'stellar_address': stellar_address,
            'reputation_score': round(reputation_score, 2),
            'total_reviews': total_reviews,
            'average_rating': round(average_rating, 2),
            'category_scores': category_averages,
            'blockchain_verified': True,
            'review_tokens_held': review_tokens
        }
    
    def _calculate_review_token_value(self, rating: int) -> str:
        """Convert star rating to token amount."""
        # 5 stars = 0.0005 tokens, 1 star = 0.0001 tokens
        token_value = rating * 0.0001
        return str(token_value)
    
    def _create_review_hash(self, rating: int, categories: Dict) -> str:
        """Create hash of review for blockchain anchor."""
        import json
        
        review_data = {
            'rating': rating,
            'categories': categories,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        canonical = json.dumps(review_data, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    async def _update_reputation_score(self, stellar_address: str):
        """Update cached reputation in database."""
        reputation = await self.get_user_reputation(stellar_address)
        
        await self.db.update('workers', 
            {'stellar_public_key': stellar_address},
            {'reputation_score': reputation['reputation_score']}
        )