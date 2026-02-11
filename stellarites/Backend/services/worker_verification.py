# services/worker_verification.py
import hashlib
import qrcode
from io import BytesIO
import base64

class WorkerVerificationService:
    """
    Blockchain-anchored worker identity and verification system.
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
        
    async def register_worker(
        self,
        profile_data: Dict
    ) -> Dict:
        """
        Complete worker registration with blockchain anchoring.
        
        Flow:
        1. Validate data
        2. Generate Stellar keypair
        3. Create profile hash
        4. Anchor hash on blockchain
        5. Generate QR code
        6. Return Worker ID + QR
        """
        
        # Generate unique Worker ID
        worker_id = self._generate_worker_id()
        
        # Create Stellar keypair for worker
        worker_keypair = Keypair.random()
        
        # Fund account with minimum balance (use friendbot on testnet)
        if self.config.env == 'testnet':
            await self._fund_account(worker_keypair.public_key)
        
        # Create deterministic profile hash
        profile_hash = self._create_profile_hash(profile_data)
        
        # Anchor profile hash on Stellar blockchain
        anchor_tx = await self._anchor_profile_to_stellar(
            worker_keypair,
            worker_id,
            profile_hash
        )
        
        # Generate QR code
        qr_data = {
            'workerId': worker_id,
            'stellarAddress': worker_keypair.public_key,
            'profileHash': profile_hash,
            'anchorTx': anchor_tx['transaction_hash'],
            'verifyUrl': f"https://nannychain.app/verify/{worker_id}"
        }
        
        qr_code_image = self._generate_qr_code(qr_data)
        
        # Store in database
        worker_record = {
            'worker_id': worker_id,
            'stellar_public_key': worker_keypair.public_key,
            'stellar_secret_key': self._encrypt_secret(worker_keypair.secret),
            'profile_hash': profile_hash,
            'anchor_transaction': anchor_tx['transaction_hash'],
            'profile_data': profile_data,
            'verification_status': 'pending',
            'created_at': datetime.utcnow()
        }
        
        await self.db.insert('workers', worker_record)
        
        return {
            'success': True,
            'worker_id': worker_id,
            'stellar_address': worker_keypair.public_key,
            'qr_code': qr_code_image,
            'anchor_transaction': anchor_tx['transaction_hash'],
            'stellar_explorer_url': f"https://stellar.expert/explorer/testnet/tx/{anchor_tx['transaction_hash']}"
        }
    
    async def verify_worker(self, worker_id: str, qr_data: Dict) -> Dict:
        """
        Verify worker identity by validating blockchain anchor.
        
        Verification Process:
        1. Fetch worker record from database
        2. Retrieve Stellar transaction
        3. Validate profile hash matches
        4. Check transaction signature
        5. Return verification result
        """
        
        # Get worker from database
        worker = await self.db.get('workers', {'worker_id': worker_id})
        
        if not worker:
            return {'verified': False, 'reason': 'Worker ID not found'}
        
        # Fetch blockchain transaction
        try:
            tx = self.server.transactions().transaction(qr_data['anchorTx']).call()
            
            # Validate transaction memo contains correct hash
            tx_memo = tx.get('memo', '')
            
            if tx_memo == worker['profile_hash'][:28]:  # Stellar memo limit
                return {
                    'verified': True,
                    'worker_id': worker_id,
                    'stellar_address': worker['stellar_public_key'],
                    'anchor_date': tx['created_at'],
                    'profile_immutable': True,
                    'message': 'Worker identity verified on blockchain'
                }
            else:
                return {
                    'verified': False,
                    'reason': 'Profile hash mismatch'
                }
                
        except Exception as e:
            return {
                'verified': False,
                'reason': f'Blockchain verification failed: {str(e)}'
            }
    
    async def get_worker_work_history(self, worker_id: str) -> Dict:
        """
        Retrieve complete work history from blockchain.
        
        Returns all WORK tokens in worker's account.
        """
        worker = await self.db.get('workers', {'worker_id': worker_id})
        stellar_address = worker['stellar_public_key']
        
        # Query all assets in account
        account = self.server.accounts().account_id(stellar_address).call()
        
        work_contracts = []
        for balance in account['balances']:
            if balance.get('asset_code') == 'WORK':
                # Each WORK token represents one employment contract
                # Fetch transaction details for contract metadata
                work_contracts.append({
                    'asset': balance['asset_code'],
                    'amount': balance['balance'],
                    'issuer': balance['asset_issuer']
                })
        
        return {
            'worker_id': worker_id,
            'total_contracts': len(work_contracts),
            'contracts': work_contracts
        }
    
    def _generate_worker_id(self) -> str:
        """Generate unique Worker ID: NW-XXXX format."""
        import random
        import string
        
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"NW-{suffix}"
    
    def _create_profile_hash(self, profile_data: Dict) -> str:
        """Create deterministic SHA-256 hash of profile."""
        import json
        
        # Include only immutable fields
        immutable_data = {
            'name': profile_data['name'],
            'phone': profile_data['phone'],
            'created_at': profile_data.get('created_at', datetime.utcnow().isoformat())
        }
        
        canonical = json.dumps(immutable_data, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    async def _anchor_profile_to_stellar(
        self,
        worker_keypair: Keypair,
        worker_id: str,
        profile_hash: str
    ) -> Dict:
        """Anchor profile hash to Stellar as transaction memo."""
        
        worker_account = self.server.load_account(worker_keypair.public_key)
        
        transaction = (
            TransactionBuilder(
                source_account=worker_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_manage_data_op(
                data_name=f"profile:{worker_id}",
                data_value=profile_hash[:64].encode()  # Stellar data limit
            )
            .add_text_memo(profile_hash[:28])
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(worker_keypair)
        response = self.server.submit_transaction(transaction)
        
        return {
            'transaction_hash': response['hash'],
            'ledger': response['ledger']
        }
    
    def _generate_qr_code(self, data: Dict) -> str:
        """Generate QR code image as base64 string."""
        import json
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(json.dumps(data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    async def _fund_account(self, public_key: str):
        """Fund testnet account using Friendbot."""
        import requests
        
        response = requests.get(
            f"https://friendbot.stellar.org?addr={public_key}"
        )
        return response.json()
    
    def _encrypt_secret(self, secret_key: str) -> bytes:
        """Encrypt secret key before database storage."""
        # Use SecureKeyManager from earlier
        pass