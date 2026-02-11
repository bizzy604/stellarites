"""Stellar NFT (review certificate) creation and retrieval using Claimable Balances."""
import asyncio
from stellar_sdk import Keypair, Network, Server, TransactionBuilder, Asset
from stellar_sdk.exceptions import Ed25519PublicKeyInvalidError, NotFoundError
from app.config import Config
from app.integrations.stellar.wallet import decrypt_secret # Assuming decrypt_secret is available for funding

# Initialize Horizon server
def _get_horizon_server():
    if Config.STELLAR_NETWORK == "TESTNET":
        return Server(horizon_url="https://horizon-testnet.stellar.org")
    return Server(horizon_url="https://horizon.stellar.org")

def _get_network_passphrase():
    if Config.STELLAR_NETWORK == "TESTNET":
        return Network.TESTNET_NETWORK_PASSPHRASE
    return Network.PUBLIC_NETWORK_PASSPHRASE

async def mint_review_nft(
    reviewee_public_key: str,
    pdf_cid: str,
    asset_code_suffix: str, # Derived from SHA256(engagement_id + reviewer_id + timestamp)
    metadata: dict # rating, reviewer_type, role, duration, etc.
) -> dict:
    """
    Mints a new review NFT using a unique issuer and makes it claimable by the reviewee.
    Returns { asset_code, issuer_public_key, transaction_id, explorer_url }.
    """
    server = _get_horizon_server()
    network_passphrase = _get_network_passphrase()

    # 1. Generate fresh issuer keypair for this specific NFT
    issuer_keypair = Keypair.random()
    issuer_public_key = issuer_keypair.public_key
    issuer_secret = issuer_keypair.secret

    # Ensure funding account secret is available
    if not Config.STELLAR_FUNDING_SECRET:
        raise ValueError("STELLAR_FUNDING_SECRET is not configured for funding new accounts.")

    funding_keypair = Keypair.from_secret(Config.STELLAR_FUNDING_SECRET)
    funding_account = await server.load_account(funding_keypair.public_key)

    # Asset code is RVW + unique suffix (max 12 chars total)
    asset_code = f"RVW{asset_code_suffix[:9]}".upper()
    asset = Asset(asset_code, issuer_public_key)

    # Build transaction to create issuer, add data, and make asset claimable
    tx_builder = (
        TransactionBuilder(
            source_account=funding_account,
            network_passphrase=network_passphrase,
            base_fee=100
        )
        .append_create_account_op(
            destination=issuer_public_key,
            starting_balance="5" # Min balance for issuer + enough for data entries + trustline to self
        )
    )

    # Add ManageData operations to the issuer account
    # Note: Stellar only allows str values for ManageData
    for key, value in metadata.items():
        tx_builder.append_manage_data_op(
            source=issuer_public_key,
            data_name=key,
            data_value=str(value).encode('utf-8')
        )
    tx_builder.append_manage_data_op(
        source=issuer_public_key,
        data_name="pdf_cid",
        data_value=pdf_cid.encode('utf-8')
    )
    tx_builder.append_manage_data_op(
        source=issuer_public_key,
        data_name="reviewee",
        data_value=reviewee_public_key.encode('utf-8')
    )

    # Lock the issuer account by setting master weight to 0
    # This prevents any further transactions from the issuer, making the NFT supply provably 1.
    tx_builder.append_set_options_op(
        source=issuer_public_key,
        master_key_weight=0
    )

    # Create Claimable Balance for 1 unit of the NFT to the reviewee
    tx_builder.append_create_claimable_balance_op(
        asset=asset,
        amount="1",
        claimants=[
            {"destination": reviewee_public_key, "predicate": {"unconditional": True}}
        ]
    )

    # Set timeout and build
    transaction = tx_builder.set_timeout(60).build()

    # Sign with funding account and new issuer account
    transaction.sign(funding_keypair)
    transaction.sign(issuer_keypair)

    # Submit to Horizon
    response = await server.submit_transaction(transaction)

    explorer_url = f"https://stellar.expert/explorer/{'testnet' if Config.STELLAR_NETWORK == 'TESTNET' else 'public'}/tx/{response['hash']}"

    return {
        "asset_code": asset_code,
        "issuer_public_key": issuer_public_key,
        "transaction_id": response['hash'],
        "explorer_url": explorer_url,
    }


async def get_reviews_for_account(stellar_public_key: str) -> list[dict]:
    """
    Retrieves all review NFTs (Claimable Balances and owned assets) for a given Stellar public key.
    Uses asyncio.gather for high performance.
    """
    server = _get_horizon_server()
    
    # 1. Fetch Claimable Balances and Owned Assets in parallel
    tasks = [
        server.claimable_balances().for_claimant(stellar_public_key).execute(),
        server.load_account(stellar_public_key)
    ]
    
    try:
        cb_results, account_details = await asyncio.gather(*tasks, return_exceptions=True)
    except Exception:
        cb_results, account_details = [], None

    # Handle cases where account might not exist yet
    if isinstance(account_details, Exception):
        account_details = None
    if isinstance(cb_results, Exception):
        cb_results = {"_embedded": {"records": []}}

    issuer_fetch_tasks = []
    metadata_context = [] # To keep track of which asset corresponds to which fetch task

    # Identify Claimable Review NFTs
    for cb in cb_results.get("_embedded", {}).get("records", []):
        if cb["asset_type"] == "credit_alphanum12" and cb["asset_code"].startswith("RVW"):
            issuer_fetch_tasks.append(server.load_account(cb["asset_issuer"]))
            metadata_context.append({"asset_code": cb["asset_code"], "status": "claimable", "issuer": cb["asset_issuer"]})

    # Identify Owned Review NFTs
    if account_details:
        for balance in account_details.balances:
            if balance.asset_type == "credit_alphanum12" and balance.asset_code.startswith("RVW") and balance.balance == "1":
                issuer_fetch_tasks.append(server.load_account(balance.asset_issuer))
                metadata_context.append({"asset_code": balance.asset_code, "status": "owned", "issuer": balance.asset_issuer})

    # 2. Fetch all issuer account data in parallel (The bottleneck)
    if not issuer_fetch_tasks:
        return []

    issuer_accounts = await asyncio.gather(*issuer_fetch_tasks, return_exceptions=True)
    
    reviews = []
    for i, issuer_acc in enumerate(issuer_accounts):
        if isinstance(issuer_acc, Exception):
            continue
            
        review_data = _extract_review_data_from_manage_data(issuer_acc.data)
        if review_data and review_data.get("reviewee") == stellar_public_key:
            ctx = metadata_context[i]
            review_data.update({
                "asset_code": ctx["asset_code"],
                "issuer_public_key": ctx["issuer"],
                "status": ctx["status"]
            })
            reviews.append(review_data)

    return reviews


def _extract_review_data_from_manage_data(data: dict) -> dict:
    """Helper to decode and extract relevant review data from an account's manage_data."""
    extracted = {}
    for key, value in data.items():
        try:
            decoded_value = value.decode('utf-8')
            # Filter for expected review metadata keys
            if key in ["pdf_cid", "rating", "reviewer_type", "role", "duration", "reviewee"]:
                extracted[key] = decoded_value
        except Exception:
            pass # Ignore non-utf8 or irrelevant data
    return extracted
