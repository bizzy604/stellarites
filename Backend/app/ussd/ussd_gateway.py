# services/ussd_gateway.py
from flask import Flask, request
from typing import Dict, Optional
import redis
import httpx  # Async HTTP client
from datetime import datetime

class USSDGateway:
    """
    USSD Presentation Layer - Thin Client Architecture
    
    Responsibilities:
    ✅ Session state management (Redis)
    ✅ Menu navigation logic
    ✅ User input validation
    ✅ API request orchestration
    ✅ Response formatting for USSD protocol
    
    Does NOT:
    ❌ Direct Stellar interaction
    ❌ Business logic
    ❌ Database queries
    ❌ Payment processing
    
    All operations delegated to Backend API via HTTP.
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        api_base_url: str,
        api_key: str
    ):
        self.redis = redis_client
        self.api_base_url = api_base_url
        self.api_key = api_key
        self.http_client = httpx.AsyncClient(
            base_url=api_base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-Client-Type": "USSD"
            },
            timeout=30.0
        )
        
        # Menu structure (UI only - no business logic)
        self.menu_structure = self._initialize_menus()
    
    def _initialize_menus(self) -> Dict:
        """
        Define USSD menu structure.
        Each menu maps user input to API endpoints.
        """
        return {
            'root': {
                'text': 'Welcome to NannyChain\n1. Register\n2. My Account\n3. Payments\n4. Help',
                'routes': {
                    '1': 'register_start',
                    '2': 'account_menu',
                    '3': 'payments_menu',
                    '4': 'help_menu'
                }
            },
            'register_start': {
                'text': 'Enter your full name:',
                'next': 'register_skills',
                'handler': 'collect_registration_name'
            },
            'register_skills': {
                'text': 'Select skills:\n1. Childcare\n2. Cooking\n3. Cleaning\n4. Elderly Care\n(e.g., 1,3)',
                'next': 'register_experience',
                'handler': 'collect_registration_skills'
            },
            'register_experience': {
                'text': 'Years of experience:\n1. <1yr\n2. 1-3yrs\n3. 3-5yrs\n4. 5+yrs',
                'next': 'register_confirm',
                'handler': 'collect_registration_experience'
            },
            'register_confirm': {
                'text': 'Confirm registration?\n1. Yes\n2. No',
                'handler': 'submit_registration'
            },
            'account_menu': {
                'text': 'My Account\n1. Check Balance\n2. Work History\n3. Reputation\n4. Back',
                'routes': {
                    '1': 'check_balance',
                    '2': 'work_history',
                    '3': 'reputation',
                    '4': 'root'
                }
            },
            'payments_menu': {
                'text': 'Payments\n1. Deposit Money\n2. Withdraw\n3. View Escrow\n4. Claim Payment\n5. Back',
                'routes': {
                    '1': 'deposit_start',
                    '2': 'withdraw_start',
                    '3': 'view_escrow',
                    '4': 'claim_payment',
                    '5': 'root'
                }
            },
            'deposit_start': {
                'text': 'Enter amount (KES):',
                'next': 'deposit_confirm',
                'handler': 'collect_deposit_amount'
            },
            'deposit_confirm': {
                'text': 'Deposit {amount} KES?\n1. Yes\n2. No',
                'handler': 'submit_deposit'
            },
            'withdraw_start': {
                'text': 'Enter amount (KES):',
                'next': 'withdraw_phone',
                'handler': 'collect_withdraw_amount'
            },
            'withdraw_phone': {
                'text': 'Enter M-Pesa number:',
                'next': 'withdraw_confirm',
                'handler': 'collect_withdraw_phone'
            },
            'withdraw_confirm': {
                'text': 'Withdraw {amount} KES to {phone}?\n1. Yes\n2. No',
                'handler': 'submit_withdrawal'
            },
            'check_balance': {
                'handler': 'fetch_balance'
            },
            'work_history': {
                'handler': 'fetch_work_history'
            },
            'reputation': {
                'handler': 'fetch_reputation'
            },
            'view_escrow': {
                'handler': 'fetch_escrow_payments'
            },
            'claim_payment': {
                'text': 'Select escrow to claim:\n{escrow_list}',
                'handler': 'submit_claim_payment'
            }
        }
    
    async def handle_ussd_request(
        self,
        session_id: str,
        phone_number: str,
        text: str
    ) -> Dict[str, str]:
        """
        Main USSD request handler.
        Orchestrates menu navigation and API calls.
        """
        
        # Normalize phone
        phone_number = self._normalize_phone(phone_number)
        
        # Get/create session
        session = await self._get_session(session_id, phone_number)
        
        # Parse user input
        user_input = text.split('*')[-1] if text else ''
        
        # Get current menu state
        current_menu = session.get('current_menu', 'root')
        
        # Process menu
        response = await self._process_menu(
            session_id,
            phone_number,
            current_menu,
            user_input,
            session
        )
        
        return response
    
    async def _process_menu(
        self,
        session_id: str,
        phone_number: str,
        current_menu: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Process menu navigation or execute handler."""
        
        menu_config = self.menu_structure.get(current_menu)
        
        if not menu_config:
            return {
                'response': 'END Error: Invalid menu state.',
                'session_id': session_id
            }
        
        # Navigation logic
        if 'routes' in menu_config:
            if user_input in menu_config['routes']:
                next_menu = menu_config['routes'][user_input]
                await self._update_session(session_id, {'current_menu': next_menu})
                
                next_config = self.menu_structure[next_menu]
                return {
                    'response': f"CON {next_config['text']}",
                    'session_id': session_id
                }
            else:
                return {
                    'response': f"CON {menu_config['text']}",
                    'session_id': session_id
                }
        
        # Execute handler (API call)
        if 'handler' in menu_config:
            handler = getattr(self, menu_config['handler'], None)
            if handler:
                return await handler(session_id, phone_number, user_input, session)
        
        # Default
        return {
            'response': f"CON {menu_config['text']}",
            'session_id': session_id
        }
    
    # ========== DATA COLLECTION HANDLERS (No API calls) ==========
    
    async def collect_registration_name(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect and store name in session."""
        
        if len(user_input.strip()) < 3:
            return {
                'response': 'CON Name too short. Enter full name:',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'registration_name': user_input.strip(),
            'current_menu': 'register_skills'
        })
        
        return {
            'response': 'CON Select skills:\n1. Childcare\n2. Cooking\n3. Cleaning\n4. Elderly Care\n(e.g., 1,3)',
            'session_id': session_id
        }
    
    async def collect_registration_skills(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect and store skills."""
        
        skill_map = {
            '1': 'Childcare',
            '2': 'Cooking',
            '3': 'Cleaning',
            '4': 'Elderly Care'
        }
        
        selected = [skill_map[d] for d in user_input.replace(',', '').replace(' ', '') if d in skill_map]
        
        if not selected:
            return {
                'response': 'CON Invalid. Select skills:\n1. Childcare\n2. Cooking\n3. Cleaning\n4. Elderly Care',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'registration_skills': selected,
            'current_menu': 'register_experience'
        })
        
        return {
            'response': 'CON Years of experience:\n1. <1yr\n2. 1-3yrs\n3. 3-5yrs\n4. 5+yrs',
            'session_id': session_id
        }
    
    async def collect_registration_experience(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect experience level."""
        
        exp_map = {
            '1': '<1 year',
            '2': '1-3 years',
            '3': '3-5 years',
            '4': '5+ years'
        }
        
        if user_input not in exp_map:
            return {
                'response': 'CON Invalid. Select:\n1. <1yr\n2. 1-3yrs\n3. 3-5yrs\n4. 5+yrs',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'registration_experience': exp_map[user_input],
            'current_menu': 'register_confirm'
        })
        
        name = session.get('registration_name')
        skills = ', '.join(session.get('registration_skills', []))
        
        return {
            'response': f"CON Confirm?\nName: {name}\nSkills: {skills}\nExp: {exp_map[user_input]}\n1. Yes\n2. No",
            'session_id': session_id
        }
    
    # ========== API INTEGRATION HANDLERS ==========
    
    async def submit_registration(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Submit registration to backend API.
        
        API Call: POST /api/v1/workers/register
        """
        
        if user_input != '1':
            await self._clear_session(session_id)
            return {'response': 'END Registration cancelled.', 'session_id': session_id}
        
        # Prepare payload
        payload = {
            'name': session.get('registration_name'),
            'phone': phone_number,
            'skills': session.get('registration_skills'),
            'experience': session.get('registration_experience'),
            'registration_source': 'ussd'
        }
        
        # Call backend API
        try:
            response = await self.http_client.post(
                '/api/v1/workers/register',
                json=payload
            )
            
            if response.status_code == 201:
                result = response.json()
                await self._clear_session(session_id)
                
                return {
                    'response': f"END Success!\nWorker ID: {result['worker_id']}\nCheck SMS for details.",
                    'session_id': session_id
                }
            else:
                error = response.json().get('error', 'Registration failed')
                return {
                    'response': f"END Error: {error}",
                    'session_id': session_id
                }
        
        except Exception as e:
            return {
                'response': f"END Network error. Try again later.",
                'session_id': session_id
            }
    
    async def fetch_balance(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Fetch balance from backend API.
        
        API Call: GET /api/v1/financial/balance/by-phone/{phone}
        """
        
        try:
            response = await self.http_client.get(
                f'/api/v1/financial/balance/by-phone/{phone_number}'
            )
            
            if response.status_code == 200:
                data = response.json()
                
                balance_text = f"END Your Balance:\n"
                balance_text += f"Available: {data['kes_equivalent']} KES\n"
                
                if data.get('locked_escrow'):
                    balance_text += f"Locked: {data['locked_escrow']} KES"
                
                return {
                    'response': balance_text,
                    'session_id': session_id
                }
            else:
                return {
                    'response': 'END Could not fetch balance. Try again.',
                    'session_id': session_id
                }
        
        except Exception as e:
            return {
                'response': 'END Network error.',
                'session_id': session_id
            }
    
    async def fetch_work_history(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Fetch work history from API.
        
        API Call: GET /api/v1/workers/work-history/by-phone/{phone}
        """
        
        try:
            response = await self.http_client.get(
                f'/api/v1/workers/work-history/by-phone/{phone_number}'
            )
            
            if response.status_code == 200:
                data = response.json()
                contracts = data.get('contracts', [])
                
                if not contracts:
                    return {
                        'response': 'END No work history yet.',
                        'session_id': session_id
                    }
                
                text = f"END Work History ({len(contracts)}):\n"
                for i, contract in enumerate(contracts[:3], 1):
                    text += f"{i}. {contract['employer_name']}\n"
                    text += f"   {contract['duration_months']}mo\n"
                
                if len(contracts) > 3:
                    text += f"\n+{len(contracts) - 3} more online"
                
                return {'response': text, 'session_id': session_id}
            
            else:
                return {'response': 'END Could not fetch history.', 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    async def fetch_reputation(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Fetch reputation from API.
        
        API Call: GET /api/v1/reviews/reputation/by-phone/{phone}
        """
        
        try:
            response = await self.http_client.get(
                f'/api/v1/reviews/reputation/by-phone/{phone_number}'
            )
            
            if response.status_code == 200:
                data = response.json()
                
                text = f"END Reputation:\n"
                text += f"Score: {data['reputation_score']}/100\n"
                text += f"Reviews: {data['total_reviews']}\n"
                text += f"Rating: {data['average_rating']}/5 ⭐"
                
                return {'response': text, 'session_id': session_id}
            else:
                return {'response': 'END No reputation data.', 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    async def collect_deposit_amount(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect deposit amount."""
        
        try:
            amount = int(user_input)
            if amount < 100 or amount > 100000:
                return {
                    'response': 'CON Amount must be 100-100,000 KES. Enter amount:',
                    'session_id': session_id
                }
        except ValueError:
            return {
                'response': 'CON Invalid. Enter amount (KES):',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'deposit_amount': amount,
            'current_menu': 'deposit_confirm'
        })
        
        return {
            'response': f"CON Deposit {amount} KES via M-Pesa?\n1. Yes\n2. No",
            'session_id': session_id
        }
    
    async def submit_deposit(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Submit deposit to backend API.
        
        API Call: POST /api/v1/financial/deposit/initiate
        """
        
        if user_input != '1':
            await self._clear_session(session_id)
            return {'response': 'END Cancelled.', 'session_id': session_id}
        
        amount = session.get('deposit_amount')
        
        try:
            response = await self.http_client.post(
                '/api/v1/financial/deposit/initiate',
                json={
                    'phone_number': phone_number,
                    'amount_kes': amount
                }
            )
            
            if response.status_code == 201:
                await self._clear_session(session_id)
                return {
                    'response': f"END M-Pesa prompt sent!\nEnter PIN to deposit {amount} KES.",
                    'session_id': session_id
                }
            else:
                error = response.json().get('error', 'Deposit failed')
                return {'response': f"END Error: {error}", 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    async def collect_withdraw_amount(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect withdrawal amount."""
        
        try:
            amount = int(user_input)
            if amount < 100:
                return {
                    'response': 'CON Minimum 100 KES. Enter amount:',
                    'session_id': session_id
                }
        except ValueError:
            return {
                'response': 'CON Invalid. Enter amount:',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'withdraw_amount': amount,
            'current_menu': 'withdraw_phone'
        })
        
        return {
            'response': 'CON Enter M-Pesa number\n(e.g., 0712345678):',
            'session_id': session_id
        }
    
    async def collect_withdraw_phone(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """Collect M-Pesa number."""
        
        mpesa = self._normalize_phone(user_input)
        
        if not self._validate_kenyan_phone(mpesa):
            return {
                'response': 'CON Invalid number. Enter M-Pesa number:',
                'session_id': session_id
            }
        
        await self._update_session(session_id, {
            'withdraw_phone': mpesa,
            'current_menu': 'withdraw_confirm'
        })
        
        amount = session.get('withdraw_amount')
        
        return {
            'response': f"CON Withdraw {amount} KES to {mpesa}?\n1. Yes\n2. No",
            'session_id': session_id
        }
    
    async def submit_withdrawal(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Submit withdrawal to backend API.
        
        API Call: POST /api/v1/financial/withdraw
        """
        
        if user_input != '1':
            await self._clear_session(session_id)
            return {'response': 'END Cancelled.', 'session_id': session_id}
        
        amount = session.get('withdraw_amount')
        mpesa = session.get('withdraw_phone')
        
        try:
            response = await self.http_client.post(
                '/api/v1/financial/withdraw',
                json={
                    'phone_number': phone_number,  # Worker's phone
                    'amount_kes': amount,
                    'mpesa_destination': mpesa
                }
            )
            
            if response.status_code == 200:
                await self._clear_session(session_id)
                return {
                    'response': f"END Withdrawal initiated!\n{amount} KES to {mpesa} in 5 mins.",
                    'session_id': session_id
                }
            else:
                error = response.json().get('error', 'Withdrawal failed')
                return {'response': f"END Error: {error}", 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    async def fetch_escrow_payments(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Fetch pending escrow payments.
        
        API Call: GET /api/v1/payments/escrow/pending/by-phone/{phone}
        """
        
        try:
            response = await self.http_client.get(
                f'/api/v1/payments/escrow/pending/by-phone/{phone_number}'
            )
            
            if response.status_code == 200:
                data = response.json()
                escrows = data.get('escrows', [])
                
                if not escrows:
                    return {'response': 'END No pending payments.', 'session_id': session_id}
                
                text = f"END Pending Escrows ({len(escrows)}):\n"
                for i, escrow in enumerate(escrows[:3], 1):
                    text += f"{i}. {escrow['amount']} KES\n"
                    text += f"   Available: {escrow['release_date']}\n"
                
                return {'response': text, 'session_id': session_id}
            else:
                return {'response': 'END No escrows found.', 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    async def submit_claim_payment(
        self,
        session_id: str,
        phone_number: str,
        user_input: str,
        session: Dict
    ) -> Dict[str, str]:
        """
        Claim escrow payment.
        
        API Call: POST /api/v1/payments/escrow/claim
        """
        
        try:
            response = await self.http_client.post(
                '/api/v1/payments/escrow/claim',
                json={
                    'phone_number': phone_number
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'response': f"END Payment claimed!\n{data['amount']} KES deposited.",
                    'session_id': session_id
                }
            else:
                error = response.json().get('error', 'Claim failed')
                return {'response': f"END Error: {error}", 'session_id': session_id}
        
        except Exception:
            return {'response': 'END Network error.', 'session_id': session_id}
    
    # ========== SESSION MANAGEMENT ==========
    
    async def _get_session(self, session_id: str, phone_number: str) -> Dict:
        """Retrieve or create session."""
        import json
        
        key = f"ussd:session:{session_id}"
        data = self.redis.get(key)
        
        if data:
            return json.loads(data)
        else:
            session = {
                'phone_number': phone_number,
                'created_at': datetime.utcnow().isoformat(),
                'current_menu': 'root'
            }
            await self._update_session(session_id, session)
            return session
    
    async def _update_session(self, session_id: str, data: Dict):
        """Update session with TTL."""
        import json
        
        key = f"ussd:session:{session_id}"
        existing = await self._get_session(session_id, data.get('phone_number', ''))
        existing.update(data)
        
        self.redis.setex(key, 180, json.dumps(existing))  # 3 min TTL
    
    async def _clear_session(self, session_id: str):
        """Clear session."""
        self.redis.delete(f"ussd:session:{session_id}")
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize to +254 format."""
        phone = phone.strip().replace(' ', '').replace('-', '')
        
        if phone.startswith('0'):
            return f"+254{phone[1:]}"
        elif phone.startswith('254'):
            return f"+{phone}"
        elif phone.startswith('+254'):
            return phone
        else:
            return f"+254{phone}"
    
    def _validate_kenyan_phone(self, phone: str) -> bool:
        """Validate Kenyan phone."""
        import re
        return bool(re.match(r'^\+2547\d{8}$', phone))