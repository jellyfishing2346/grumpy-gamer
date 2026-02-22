from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import JSONResponse


import json
import logging
import os
import httpx
from dotenv import load_dotenv
try:
    from .jwt_utils import verify_access_token
except ImportError:
    from jwt_utils import verify_access_token


# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
)
logger = logging.getLogger("chatbot")


USE_LLM = os.getenv("CHATBOT_USE_LLM", "false").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

chatbot_router = APIRouter()


@chatbot_router.post("/chatbot")
async def chatbot_endpoint(request: Request, response: Response, token_email: str = Depends(verify_access_token)):
    logger.info(
        f"Chatbot request from user: {token_email}"
    )
    data = await request.json()
    user_message = data.get("message", "")
    logger.info(f"User message: {user_message}")

    # --- Contextual follow-up: store chat history in a cookie ---
    chat_history = []
    cookie = request.cookies.get("chatbot_history")
    if cookie:
        try:
            chat_history = json.loads(cookie)
        except Exception:
            chat_history = []
    chat_history.append({"from": "user", "text": user_message})
    chat_history = chat_history[-10:]

    # --- LLM mode ---
    if USE_LLM and OPENAI_API_KEY:
        logger.info("Using LLM backend for response.")
        # Prepare messages for OpenAI chat format
        messages = []
        for entry in chat_history:
            role = "assistant" if entry["from"] == "bot" else "user"
            messages.append({"role": role, "content": entry["text"]})
        # Add system prompt for context
        system_prompt = "You are Buster, a friendly virtual assistant for the Grumpy Gamer website. " \
                        "Help users with questions about games, features, and the site."
        messages = [{"role": "system", "content": system_prompt}] + messages
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    json={
                        "model": OPENAI_MODEL,
                        "messages": messages,
                        "max_tokens": 256,
                        "temperature": 0.7
                    }
                )
            resp.raise_for_status()
            data = resp.json()
            llm_reply = data["choices"][0]["message"]["content"].strip()
            logger.info(f"LLM response: {llm_reply}")
        except Exception as e:
            logger.error(f"LLM error: {e}")
            llm_reply = "Sorry, I couldn't reach the AI service. Please try again later."
        chat_history.append({"from": "bot", "text": llm_reply})
        chat_history = chat_history[-10:]
        resp = JSONResponse({"response": llm_reply})
        resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history), httponly=False, max_age=3600)
        logger.info(f"Returning response to user: {token_email}")
        return resp

    # --- Rule-based fallback ---
    msg = user_message.lower()
    logger.info("Using rule-based backend for response.")

    # --- Interactive tutorial logic (Wordle example) ---
    # tutorial_key = None  # Removed unused variable
    tutorial_steps = {
        "wordle": [
            "Welcome to the Wordle tutorial! Type 'next' to continue.",
            "Step 1: The goal is to guess a hidden 5-letter word in 6 tries.",
            "Step 2: Each guess must be a valid 5-letter word. Press Enter to submit.",
            "Step 3: After each guess, the color of the tiles will change "
            "to show how close your guess was to the word."
            "Step 4: Green means the letter is in the correct spot. "
            "Yellow means the letter is in the word but in the wrong spot. "
            "Gray means the letter is not in the word.",
            "Step 5: Use the feedback to narrow down your guesses. "
            "Good luck! Type 'end' to finish the tutorial."
        ]
    }
    # Check if user is in a tutorial session
    tutorial_session = None
    for entry in reversed(chat_history):
        if entry["from"] == "bot" and "tutorial" in entry["text"].lower():
            tutorial_session = "wordle"
            break
    # Start tutorial if requested
    if ("tutorial" in msg or "how to play wordle" in msg) and not tutorial_session:
        response = tutorial_steps["wordle"][0]
        chat_history.append({"from": "bot", "text": response})
        resp = JSONResponse({"response": response})
        resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history[-10:]), httponly=False, max_age=3600)
        return resp
    # Continue tutorial if in session
    if tutorial_session:
        # Find last tutorial step sent
        last_step = 0
        for entry in reversed(chat_history):
            if entry["from"] == "bot" and entry["text"] in tutorial_steps["wordle"]:
                last_step = tutorial_steps["wordle"].index(entry["text"])
                break
        if msg.strip() == "next":
            if last_step + 1 < len(tutorial_steps["wordle"]):
                response = tutorial_steps["wordle"][last_step + 1]
            else:
                response = "Tutorial complete! Type 'tutorial' to start again."
            chat_history.append({"from": "bot", "text": response})
            resp = JSONResponse({"response": response})
            resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history[-10:]), httponly=False, max_age=3600)
            return resp
        elif msg.strip() == "back":
            if last_step - 1 >= 0:
                response = tutorial_steps["wordle"][last_step - 1]
            else:
                response = tutorial_steps["wordle"][0]
            chat_history.append({"from": "bot", "text": response})
            resp = JSONResponse({"response": response})
            resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history[-10:]), httponly=False, max_age=3600)
            return resp
        elif msg.strip() == "end":
            response = "Tutorial ended. Ask for another tutorial or help if needed!"
            chat_history.append({"from": "bot", "text": response})
            resp = JSONResponse({"response": response})
            resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history[-10:]), httponly=False, max_age=3600)
            return resp

    recommend_keywords = [
        "recommend", "suggest", "bored", "what should i play", "pick a game", "don't know what to play", "any ideas"
    ]
    # games_list removed (was unused)
    if any(kw in msg for kw in recommend_keywords):
        # Avoid recommending the last suggested game
        last_suggestion = None
        for entry in reversed(chat_history):
            if entry["from"] == "bot" and entry["text"].startswith("How about trying"):
                last_suggestion = (
                    entry["text"].split("How about trying ", 1)[-1]
                )
                last_suggestion = last_suggestion.split("?")[0]
                break
        # No reference to 'games' here; this block is for recommendations only
    elif "contact" in msg or "support" in msg:
        response = "You can reach us through the Contact page, email support@grumpygamer.com."
    elif "delete account" in msg or "remove account" in msg:
        response = (
            "You can delete your account at any time from your profile settings. "
            "Please note that this action is irreversible and "
            "all your data will be permanently removed."
        )
    elif "update profile" in msg or "change username" in msg or "change email" in msg:
        response = (
            "To update your profile, go to your account settings to change your username, email, or password."
        )
    elif "compare" in msg or "comparison" in msg:
        response = (
            "You can compare your stats and performance with AI or other players "
            "using the Comparison page."
        )
    elif "dashboard" in msg:
        response = (
            "The dashboard lets you track your wins, losses, streaks, and overall progress across all games."
        )
    elif "ai" in msg and ("learn" in msg or "strategy" in msg or "how" in msg):
        response = (
            "Our AI agents use reinforcement learning and classical algorithms to play games. "
            "You can watch how they learn and adapt in real game scenarios."
        )
    elif "difficulty" in msg or "level" in msg:
        response = "Most games offer multiple difficulty levels: Easy, Medium, and Hard. Choose your challenge!"
    elif "friends" in msg or "multiplayer" in msg:
        response = "You can play solo, with friends, or against AI opponents. Invite friends to join and compete!"
    elif "open source" in msg or "code" in msg:
        response = (
            "Grumpy Gamer is open source! "
            "You can explore and contribute to the codebase on our GitHub "
            "repository."
        )
    elif "mobile" in msg or "phone" in msg:
        response = (
            "Grumpy Gamer works great on desktop and mobile browsers. Play anywhere, anytime!"
        )
    elif "streak" in msg or "progress" in msg:
        response = (
            "Track your daily and lifetime streaks, wins, and progress in the dashboard."
        )
    elif "invite" in msg:
        response = (
            "Invite your friends to join Grumpy Gamer and challenge them to your favorite games!"
        )
    elif "bug" in msg or "issue" in msg or "report" in msg:
        response = (
            "If you find a bug or issue, please report it via the Contact page or open an issue on our GitHub. "
            "We appreciate your help in making Grumpy Gamer better!"
        )
    elif "feature request" in msg or "suggestion" in msg:
        response = (
            "We love feedback! Submit feature requests or suggestions through the Contact page or GitHub."
        )
    elif "logout" in msg or "log out" in msg:
        response = (
            "To log out, click your profile icon and select 'Log Out' from the dropdown menu."
        )
    elif "language" in msg:
        response = (
            "Currently, Grumpy Gamer is available in English. Support for more languages may be added in the future."
        )
    elif "privacy" in msg:
        response = (
            "Your privacy is important to us. We never share your personal data with third parties."
        )
    elif "forgot username" in msg:
        response = (
            "If you forgot your username, check your registration email or contact support for help."
        )
    elif "multiple platforms" in msg or "track games" in msg:
        response = (
            "Absolutely! Grumpy Gamer supports games from PC, PlayStation, Xbox, "
            "Nintendo Switch, and mobile platforms. "
            "You can track all your gaming adventures in one place."
        )
    elif "premium" in msg or "paid features" in msg:
        response = (
            "Grumpy Gamer is completely free to use. Some premium features may be added in the future, "
            "but the core experience will always be free."
        )
    elif "why grumpy" in msg:
        response = (
            "Because we've all had those gaming moments that make us a little grumpy! "
            "Whether it's a tough boss fight, lag in multiplayer, or just not finding time to play, we get it. "
            "Embrace the grump! 😤🎮"
        )
    elif "data secure" in msg or "security" in msg:
        response = (
            "Yes, we take security seriously. Your password is encrypted using industry-standard bcrypt hashing, "
            "and we use JWT tokens for secure authentication. "
            "We never share your personal data with third parties."
        )
    elif "secure" in msg or "data" in msg:
        response = (
            "Your password is encrypted using bcrypt, and we use JWT tokens for secure authentication. "
            "We never share your personal data with third parties."
        )
    elif "leaderboard" in msg:
        response = "The leaderboard tracks top players based on their wins and performance across games."
    else:
        # Example: Use previous message for context
        if len(chat_history) > 1:
            prev = chat_history[-2]["text"]
            response = (
                f"(In reply to: '{prev}') You said: {user_message}"
            )
        else:
            response = (
                f"You said: {user_message}"
            )

    # Add bot response to history
    chat_history.append({"from": "bot", "text": response})
    chat_history = chat_history[-10:]

    logger.info(f"Rule-based response: {response}")
    # Set updated chat history in cookie
    resp = JSONResponse({"response": response})
    resp.set_cookie(key="chatbot_history", value=json.dumps(chat_history), httponly=False, max_age=3600)
    logger.info(
        f"Returning response to user: {token_email}"
    )
    return resp
