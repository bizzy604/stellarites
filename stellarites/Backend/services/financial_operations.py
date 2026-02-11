# services/financial_operations.py
from stellar_sdk import Server, Keypair, TransactionBuilder, Asset
from typing import Dict, Optional
import requests

class FinancialOperationsService:
    """
    Complete financial operations for NannyChain:
    - Deposits (M-Pesa → Stellar)
    - Withdrawals (Stellar → M-Pesa)
    - Balance queries
    - Transaction history
    
    Integration with M-Pesa C2B and B2C APIs.
    """
    
    def __init__(
        self,
        stellar_config: StellarConfig,
        mpesa_config: Dict,
        db_client
    ):
        self.config = stellar_config
        self.server = stellar_config.get_horizon_server()
        self.mpesa_config = mpesa_config
        self.db = db_client
        
        # M-Pesa credentials
        self.mpesa_consumer_key = mpesa_config['consumer_key']
        self.mpesa_consumer_secret = mpesa_config['consumer_secret']
        self.mpesa_shortcode = mpesa_config['shortcode']
        self.mpesa_passkey = mpesa_config['passkey']
        
        # Platform treasury account (holds KES/XLM liquidity)
        self.treasury_keypair = Keypair.from_secret(mpesa_config['treasury_secret'])
    
    # ========== DEPOSIT OPERATIONS ==========
    
    async def initiate_mpesa_deposit(
        self,
        phone_number: str,
        amount_kes: int,
        stellar_destination: str
    ) -> Dict:
        """
        Initiate M-Pesa STK Push for deposit.
        
        Flow:
        1. Trigger STK Push to user's phone
        2. User enters M-Pesa PIN
        3. Receive callback with payment confirmation
        4. Credit Stellar account with equivalent XLM
        """
        
        # Get M-Pesa access token
        access_token = await self._get_mpesa_access_token()
        
        if not access_token:
            return {'success': False, 'error': 'M-Pesa authentication failed'}
        
        # Generate unique transaction reference
        import uuid
        transaction_ref = f"NC-DEP-{uuid.uuid4().hex[:8].upper()}"
        
        # Prepare STK Push request
        stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        
        import base64
        from datetime import datetime
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_str = f"{self.mpesa_shortcode}{self.mpesa_passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()
        
        payload = {
            "BusinessShortCode": self.mpesa_shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount_kes,
            "PartyA": phone_number,
            "PartyB": self.mpesa_shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": f"{self.mpesa_config['callback_base_url']}/mpesa/deposit/callback",
            "AccountReference": transaction_ref,
            "TransactionDesc": "NannyChain Deposit"
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(stk_url, json=payload, headers=headers)
            response_data = response.json()
            
            if response_data.get('ResponseCode') == '0':
                # Store pending deposit
                await self.db.insert('pending_deposits', {
                    'transaction_ref': transaction_ref,
                    'phone_number': phone_number,
                    'amount_kes': amount_kes,
                    'stellar_destination': stellar_destination,
                    'mpesa_checkout_id': response_data.get('CheckoutRequestID'),
                    'status': 'pending',
                    'created_at': datetime.utcnow()
                })
                
                return {
                    'success': True,
                    'transaction_ref': transaction_ref,
                    'checkout_id': response_data.get('CheckoutRequestID'),
                    'message': 'M-Pesa prompt sent to phone'
                }
            else:
                return {
                    'success': False,
                    'error': response_data.get('ResponseDescription', 'STK Push failed')
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': f"M-Pesa API error: {str(e)}"
            }
    
    async def process_mpesa_deposit_callback(self, callback_data: Dict) -> Dict:
        """
        Process M-Pesa callback and credit Stellar account.
        
        Called by M-Pesa when payment is completed.
        """
        
        result_code = callback_data['Body']['stkCallback']['ResultCode']
        checkout_id = callback_data['Body']['stkCallback']['CheckoutRequestID']
        
        # Get pending deposit
        deposit = await self.db.get('pending_deposits', {
            'mpesa_checkout_id': checkout_id
        })
        
        if not deposit:
            return {'success': False, 'error': 'Deposit record not found'}
        
        if result_code != 0:
            # Payment failed
            await self.db.update('pending_deposits',
                {'mpesa_checkout_id': checkout_id},
                {'status': 'failed'}
            )
            return {'success': False, 'error': 'Payment cancelled or failed'}
        
        # Payment successful - credit Stellar account
        amount_kes = deposit['amount_kes']
        xlm_amount = self._convert_kes_to_xlm(amount_kes)
        
        # Send XLM from treasury to user
        credit_result = await self._credit_stellar_account(
            deposit['stellar_destination'],
            xlm_amount,
            f"Deposit: {amount_kes} KES"
        )
        
        if credit_result['success']:
            await self.db.update('pending_deposits',
                {'mpesa_checkout_id': checkout_id},
                {
                    'status': 'completed',
                    'stellar_tx_hash': credit_result['transaction_hash'],
                    'xlm_amount': xlm_amount,
                    'completed_at': datetime.utcnow()
                }
            )
            
            return {
                'success': True,
                'stellar_tx': credit_result['transaction_hash'],
                'amount_xlm': xlm_amount
            }
        else:
            return {
                'success': False,
                'error': 'Stellar credit failed'
            }
    
    # ========== WITHDRAWAL OPERATIONS ==========
    
    async def process_withdrawal(
        self,
        stellar_public_key: str,
        stellar_secret_key: str,
        amount_kes: int,
        mpesa_phone: str
    ) -> Dict:
        """
        Process withdrawal from Stellar to M-Pesa.
        
        Flow:
        1. Debit XLM from user's Stellar account
        2. Send KES to M-Pesa via B2C API
        3. Record transaction
        """
        
        # Calculate XLM equivalent
        xlm_amount = self._convert_kes_to_xlm(amount_kes)
        
        # Check balance
        balance_info = await self.get_balance(stellar_public_key)
        
        if float(balance_info['xlm_balance']) < xlm_amount:
            return {
                'success': False,
                'error': f"Insufficient balance. Available: {balance_info['xlm_balance']} XLM"
            }
        
        # Transfer XLM from user to treasury
        user_keypair = Keypair.from_secret(stellar_secret_key)
        
        debit_result = await self._transfer_to_treasury(
            user_keypair,
            xlm_amount,
            f"Withdrawal: {amount_kes} KES"
        )
        
        if not debit_result['success']:
            return {
                'success': False,
                'error': 'Stellar debit failed'
            }
        
        # Send M-Pesa B2C payment
        mpesa_result = await self._send_mpesa_b2c(
            mpesa_phone,
            amount_kes,
            "NannyChain Withdrawal"
        )
        
        if mpesa_result['success']:
            # Record withdrawal
            await self.db.insert('withdrawals', {
                'stellar_address': stellar_public_key,
                'amount_kes': amount_kes,
                'amount_xlm': xlm_amount,
                'mpesa_phone': mpesa_phone,
                'stellar_tx_hash': debit_result['transaction_hash'],
                'mpesa_conversation_id': mpesa_result['conversation_id'],
                'status': 'completed',
                'created_at': datetime.utcnow()
            })
            
            return {
                'success': True,
                'transaction_hash': debit_result['transaction_hash'],
                'mpesa_conversation_id': mpesa_result['conversation_id']
            }
        else:
            # M-Pesa failed - refund user (reverse Stellar transaction)
            await self._refund_withdrawal(user_keypair.public_key, xlm_amount)
            
            return {
                'success': False,
                'error': f"M-Pesa transfer failed: {mpesa_result.get('error')}"
            }
    
    # ========== BALANCE & HISTORY ==========
    
    async def get_balance(self, stellar_public_key: str) -> Dict:
        """Get Stellar account balance with KES equivalent."""
        
        try:
            account = self.server.accounts().account_id(stellar_public_key).call()
            
            xlm_balance = '0'
            other_assets = []
            
            for balance in account['balances']:
                if balance['asset_type'] == 'native':
                    xlm_balance = balance['balance']
                else:
                    other_assets.append({
                        'asset_code': balance['asset_code'],
                        'balance': balance['balance'],
                        'issuer': balance.get('asset_issuer')
                    })
            
            # Convert to KES
            kes_equivalent = self._convert_xlm_to_kes(float(xlm_balance))
            
            # Check for locked escrow
            escrows = await self.db.query('payment_escrows', {
                'worker': stellar_public_key,
                'status': 'locked'
            })
            
            total_locked = sum(float(e['amount']) for e in escrows)
            
            return {
                'stellar_address': stellar_public_key,
                'xlm_balance': xlm_balance,
                'kes_equivalent': kes_equivalent,
                'other_assets': other_assets,
                'locked_escrow': total_locked if total_locked > 0 else None
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': f"Balance query failed: {str(e)}"
            }
    
    async def get_transaction_history(
        self,
        stellar_public_key: str,
        limit: int = 10
    ) -> Dict:
        """Get transaction history for account."""
        
        transactions = self.server.transactions() \
            .for_account(stellar_public_key) \
            .order(desc=True) \
            .limit(limit) \
            .call()
        
        history = []
        for tx in transactions['_embedded']['records']:
            history.append({
                'hash': tx['hash'],
                'created_at': tx['created_at'],
                'source_account': tx['source_account'],
                'fee_charged': tx['fee_charged'],
                'operation_count': tx['operation_count'],
                'memo': tx.get('memo', ''),
                'successful': tx['successful']
            })
        
        return {
            'stellar_address': stellar_public_key,
            'transactions': history,
            'total': len(history)
        }
    
    # ========== INTERNAL METHODS ==========
    
    async def _credit_stellar_account(
        self,
        destination: str,
        amount_xlm: float,
        memo: str
    ) -> Dict:
        """Credit XLM to user account from treasury."""
        
        treasury_account = self.server.load_account(self.treasury_keypair.public_key)
        
        transaction = (
            TransactionBuilder(
                source_account=treasury_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_payment_op(
                destination=destination,
                asset=Asset.native(),
                amount=str(amount_xlm)
            )
            .add_text_memo(memo)
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(self.treasury_keypair)
        
        try:
            response = self.server.submit_transaction(transaction)
            return {
                'success': True,
                'transaction_hash': response['hash']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _transfer_to_treasury(
        self,
        user_keypair: Keypair,
        amount_xlm: float,
        memo: str
    ) -> Dict:
        """Transfer XLM from user to treasury."""
        
        user_account = self.server.load_account(user_keypair.public_key)
        
        transaction = (
            TransactionBuilder(
                source_account=user_account,
                network_passphrase=self.config.network_passphrase,
                base_fee=100
            )
            .append_payment_op(
                destination=self.treasury_keypair.public_key,
                asset=Asset.native(),
                amount=str(amount_xlm)
            )
            .add_text_memo(memo)
            .set_timeout(30)
            .build()
        )
        
        transaction.sign(user_keypair)
        
        try:
            response = self.server.submit_transaction(transaction)
            return {
                'success': True,
                'transaction_hash': response['hash']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _send_mpesa_b2c(
        self,
        phone_number: str,
        amount: int,
        remarks: str
    ) -> Dict:
        """Send M-Pesa B2C payment."""
        
        access_token = await self._get_mpesa_access_token()
        
        if not access_token:
            return {'success': False, 'error': 'M-Pesa auth failed'}
        
        b2c_url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest"
        
        payload = {
            "InitiatorName": self.mpesa_config['initiator_name'],
            "SecurityCredential": self.mpesa_config['security_credential'],
            "CommandID": "BusinessPayment",
            "Amount": amount,
            "PartyA": self.mpesa_shortcode,
            "PartyB": phone_number,
            "Remarks": remarks,
            "QueueTimeOutURL": f"{self.mpesa_config['callback_base_url']}/mpesa/b2c/timeout",
            "ResultURL": f"{self.mpesa_config['callback_base_url']}/mpesa/b2c/result",
            "Occasion": "Withdrawal"
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(b2c_url, json=payload, headers=headers)
            response_data = response.json()
            
            if response_data.get('ResponseCode') == '0':
                return {
                    'success': True,
                    'conversation_id': response_data.get('ConversationID')
                }
            else:
                return {
                    'success': False,
                    'error': response_data.get('ResponseDescription')
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_mpesa_access_token(self) -> Optional[str]:
        """Get M-Pesa OAuth access token."""
        
        import base64
        
        auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
        credentials = f"{self.mpesa_consumer_key}:{self.mpesa_consumer_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}"
        }
        
        try:
            response = requests.get(auth_url, headers=headers)
            response_data = response.json()
            return response_data.get('access_token')
        except:
            return None
    
    def _convert_kes_to_xlm(self, kes_amount: float) -> float:
        """Convert KES to XLM using current exchange rate."""
        # Example: 1 XLM = 16 KES (fetch live rate in production)
        xlm_rate = 16.0
        return round(kes_amount / xlm_rate, 7)
    
    def _convert_xlm_to_kes(self, xlm_amount: float) -> float:
        """Convert XLM to KES."""
        xlm_rate = 16.0
        return round(xlm_amount * xlm_rate, 2)
    
    async def _refund_withdrawal(self, user_address: str, amount_xlm: float):
        """Refund failed withdrawal."""
        await self._credit_stellar_account(
            user_address,
            amount_xlm,
            "Withdrawal refund - M-Pesa failed"
        )