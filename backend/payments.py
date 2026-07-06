"""
Stripe payment integration for Grumpy Gamer premium features.
Uses Stripe Checkout in test mode — no real charges.
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

try:
    from .jwt_utils import verify_access_token
    from .auth import get_db
except ImportError:
    from jwt_utils import verify_access_token
    from auth import get_db

payments_router = APIRouter(tags=["Payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://grumpy-gamer.vercel.app")

PRODUCTS = {
    "premium_monthly": {
        "name": "Grumpy Gamer Premium",
        "description": "Unlock all RL AI opponents, advanced analytics, and 500 bonus coins monthly",
        "price_usd": 499,  # $4.99 in cents
        "coins_bonus": 500,
        "features": [
            "All RL AI opponents unlocked",
            "Advanced training metrics",
            "500 Grumpy Coins monthly",
            "Priority support",
        ],
    },
    "coins_pack_small": {
        "name": "500 Grumpy Coins",
        "description": "500 Grumpy Coins to spend on premium features",
        "price_usd": 199,  # $1.99 in cents
        "coins_bonus": 500,
        "features": ["500 Grumpy Coins added to your balance"],
    },
    "coins_pack_large": {
        "name": "2000 Grumpy Coins",
        "description": "2000 Grumpy Coins — best value!",
        "price_usd": 599,  # $5.99 in cents
        "coins_bonus": 2000,
        "features": ["2000 Grumpy Coins added to your balance", "Best value pack"],
    },
}


@payments_router.get("/payments/products")
def get_products():
    """Return all available products for purchase."""
    return {"products": [{"id": k, **v} for k, v in PRODUCTS.items()]}


class CheckoutRequest(BaseModel):
    product_id: str


@payments_router.post("/payments/checkout")
def create_checkout_session(
    req: CheckoutRequest,
    token_email: str = Depends(verify_access_token)
):
    """Create a Stripe Checkout session for a product."""
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Payment system not configured")

    product = PRODUCTS.get(req.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product["name"],
                        "description": product["description"],
                    },
                    "unit_amount": product["price_usd"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&product={req.product_id}",
            cancel_url=f"{FRONTEND_URL}/payment/cancel",
            customer_email=token_email,
            metadata={
                "email": token_email,
                "product_id": req.product_id,
                "coins_bonus": str(product["coins_bonus"]),
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@payments_router.post("/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events to fulfill orders."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        import json
        event = json.loads(payload)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session["metadata"].get("email")
        coins = int(session["metadata"].get("coins_bonus", 0))
        product_id = session["metadata"].get("product_id")

        if email and coins:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET coins_balance = COALESCE(coins_balance, 0) + %s WHERE email = %s",
                (coins, email)
            )
            cursor.execute(
                "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
                (email, coins, f"Purchase: {product_id}")
            )
            conn.commit()
            conn.close()

    return {"status": "ok"}


@payments_router.get("/payments/status/{session_id}")
def get_payment_status(session_id: str, token_email: str = Depends(verify_access_token)):
    """Check the status of a payment session."""
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Payment system not configured")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.payment_status,
            "product_id": session.metadata.get("product_id"),
            "coins_bonus": session.metadata.get("coins_bonus"),
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
