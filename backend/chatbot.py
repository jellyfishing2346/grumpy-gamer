from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import JSONResponse


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
async def chatbot_endpoint(
    request: Request,
    response: Response,
    token_email: str = Depends(verify_access_token)
):
    logger.info(f"Chatbot request from user: {token_email}")
    data = await request.json()
    user_message = data.get("message", "")
    # Read chat history from request body (sent by frontend)
    chat_history = data.get("history", [])
    if not isinstance(chat_history, list):
        chat_history = []
    chat_history = chat_history[-10:]
    logger.info(f"User message: {user_message}")

    # --- LLM mode ---
    if USE_LLM and OPENAI_API_KEY:
        logger.info("Using LLM backend for response.")
        messages = []
        for entry in chat_history:
            role = "assistant" if entry["from"] == "bot" else "user"
            messages.append({"role": role, "content": entry["text"]})
        system_prompt = (
            "You are Buster, a friendly virtual assistant for the Grumpy Gamer website. "
            "Help users with questions about games, features, and the site."
        )
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
            result = resp.json()
            llm_reply = result["choices"][0]["message"]["content"].strip()
            logger.info(f"LLM response: {llm_reply}")
        except Exception as e:
            logger.error(f"LLM error: {e}")
            llm_reply = "Sorry, I couldn't reach the AI service. Please try again later."
        return JSONResponse({"response": llm_reply})

    # --- Rule-based fallback ---
    msg = user_message.lower()
    logger.info("Using rule-based backend for response.")

    # --- Tutorial logic ---
    tutorial_steps = {
        "wordle": [
            "Welcome to the Wordle tutorial! Type 'next' to continue.",
            "Step 1: The goal is to guess a hidden 5-letter word in 6 tries.",
            "Step 2: Each guess must be a valid 5-letter word. Press Enter to submit.",
            "Step 3: After each guess, the color of the tiles will change to show how close your guess was.",
            "Step 4: Green = correct letter, correct spot. Yellow = correct letter, wrong spot. Gray = not in word.",
            "Step 5: Use the feedback to narrow down your guesses. Good luck! Type 'end' to finish the tutorial."
        ]
    }

    # Detect if we are in a tutorial session
    tutorial_session = None
    for entry in reversed(chat_history):
        if entry["from"] == "bot" and "tutorial" in entry["text"].lower():
            tutorial_session = "wordle"
            break

    if (
        "tutorial" in msg
        or "how to play wordle" in msg
        or "how do i play wordle" in msg
    ) and not tutorial_session:
        response_text = tutorial_steps["wordle"][0]
        return JSONResponse({"response": response_text})

    if tutorial_session:
        last_step = 0
        for entry in reversed(chat_history):
            if entry["from"] == "bot" and entry["text"] in tutorial_steps["wordle"]:
                last_step = tutorial_steps["wordle"].index(entry["text"])
                break
        response_text = None
        if msg.strip() == "next":
            if last_step + 1 < len(tutorial_steps["wordle"]):
                response_text = tutorial_steps["wordle"][last_step + 1]
            else:
                response_text = "Tutorial complete! Type 'tutorial' to start again."
        elif msg.strip() == "back":
            if last_step - 1 >= 0:
                response_text = tutorial_steps["wordle"][last_step - 1]
            else:
                response_text = tutorial_steps["wordle"][0]
        elif msg.strip() == "end":
            response_text = "Tutorial ended. Ask for another tutorial or help if needed!"
        if response_text:
            return JSONResponse({"response": response_text})

    # --- Greetings ---
    if msg.strip().rstrip("?!. ") in [
        "hi", "hello", "hey", "howdy", "sup", "greetings"
    ] or "what's up" in msg:
        response_text = (
            "Hey there! 👋 I'm Buster, your Grumpy Gamer assistant. "
            "How can I help you today?"
        )

    # --- About Grumpy Gamer ---
    elif any(kw in msg for kw in [
        "what is grumpy gamer", "what's grumpy gamer", "about grumpy gamer",
        "about this site", "about this app", "what does this do",
        "what is this", "tell me about"
    ]):
        response_text = (
            "Grumpy Gamer is a platform where you can play classic games like Wordle, Sudoku, "
            "Chess, Connect Four, Tic-Tac-Toe, Checkers, Minesweeper, 2048, and more — "
            "and challenge our AI opponents! Track your progress, compare stats, "
            "and see if you can beat the grumpy AI. 😤🎮"
        )

    # --- Available games ---
    elif any(kw in msg for kw in [
        "what games", "which games", "list of games",
        "available games", "games available", "what can i play"
    ]):
        response_text = (
            "We currently have: 🎯 Wordle, 🧩 Sudoku, ♟️ Chess, 🔴 Connect Four, "
            "⭕ Tic-Tac-Toe, ⛀ Checkers, 💣 Minesweeper, 2️⃣0️⃣4️⃣8️⃣ 2048, 🔤 Hangman, "
            "⚫️ Othello/Reversi, and 🃏 Memory. More games coming soon!"
        )

    # --- How to play specific games ---
    elif any(kw in msg for kw in [
        "how to play sudoku", "sudoku rules", "how does sudoku work"
    ]):
        response_text = (
            "In Sudoku, fill a 9x9 grid so every row, column, and 3x3 box contains "
            "the digits 1-9 exactly once. "
            "Start with the numbers already given and use logic to fill in the rest. "
            "No guessing needed!"
        )
    elif any(kw in msg for kw in [
        "how to play chess", "chess rules", "how does chess work"
    ]):
        response_text = (
            "Chess is a two-player strategy game. Each piece moves differently — "
            "pawns move forward, rooks move in straight lines, bishops move diagonally, "
            "knights jump in an L-shape, queens move any direction, and kings move one square. "
            "The goal is to checkmate your opponent's king!"
        )
    elif any(kw in msg for kw in [
        "how to play connect four", "connect four rules", "how does connect four work"
    ]):
        response_text = (
            "In Connect Four, players take turns dropping colored discs into a 7-column, 6-row grid. "
            "The goal is to connect four of your discs in a row — "
            "horizontally, vertically, or diagonally — before your opponent does!"
        )
    elif any(kw in msg for kw in [
        "how to play tic tac toe", "tic tac toe rules", "how does tic tac toe work"
    ]):
        response_text = (
            "In Tic-Tac-Toe, two players take turns marking spaces in a 3x3 grid. "
            "The player who places three of their marks in a horizontal, vertical, "
            "or diagonal row wins!"
        )
    elif any(kw in msg for kw in [
        "how to play checkers", "checkers rules", "how does checkers work"
    ]):
        response_text = (
            "In Checkers, players move their pieces diagonally and capture opponent pieces "
            "by jumping over them. "
            "The goal is to capture all of the opponent's pieces or block them from moving. "
            "Reach the other side to get kinged!"
        )
    elif any(kw in msg for kw in [
        "how to play minesweeper", "minesweeper rules", "how does minesweeper work"
    ]):
        response_text = (
            "In Minesweeper, you uncover squares on a grid without hitting any hidden mines. "
            "Numbers tell you how many mines are adjacent to that square. "
            "Use logic to flag mines and clear the board safely!"
        )
    elif any(kw in msg for kw in [
        "how to play 2048", "2048 rules", "how does 2048 work"
    ]):
        response_text = (
            "In 2048, slide numbered tiles on a 4x4 grid. When two tiles with the same number "
            "touch, they merge into one! The goal is to create a tile with the number 2048."
        )
    elif any(kw in msg for kw in [
        "how to play hangman", "hangman rules", "how does hangman work"
    ]):
        response_text = (
            "In Hangman, guess a hidden word letter by letter. "
            "Each wrong guess adds a part to the hangman drawing. "
            "Guess the word before the drawing is complete to win!"
        )
    elif any(kw in msg for kw in [
        "how to play othello", "othello rules", "reversi rules", "how does othello work"
    ]):
        response_text = (
            "In Othello/Reversi, place discs on the board to flip your opponent's discs "
            "to your color. "
            "You can flip discs horizontally, vertically, or diagonally. "
            "The player with the most discs of their color at the end wins!"
        )
    elif any(kw in msg for kw in [
        "how to play memory", "memory rules", "how does memory work"
    ]):
        response_text = (
            "In Memory, flip cards to find matching pairs. "
            "Remember the positions of cards you've already flipped to make matches faster. "
            "Match all pairs to win!"
        )

    # --- AI & strategy ---
    elif any(kw in msg for kw in [
        "how does the ai work", "how is the ai trained",
        "what algorithm", "reinforcement learning", "how does ai learn"
    ]):
        response_text = (
            "Our AI agents use a combination of reinforcement learning (PPO, DQN) and "
            "classical algorithms like minimax with alpha-beta pruning. "
            "They learn by playing thousands of games and improving over time. 🤖"
        )
    elif any(kw in msg for kw in [
        "can i beat the ai", "is the ai hard", "how hard is the ai", "ai difficulty"
    ]):
        response_text = (
            "Our AI ranges from beginner to expert depending on the game and difficulty setting. "
            "Give it a try — you might surprise yourself! 😤"
        )
    elif any(kw in msg for kw in ["ai", "learn", "strategy"]):
        response_text = (
            "Our AI agents use reinforcement learning and classical algorithms to play games. "
            "You can watch how they learn and adapt in real game scenarios."
        )

    # --- Account & auth ---
    elif any(kw in msg for kw in [
        "how do i sign up", "how to register", "create account",
        "make an account", "sign up"
    ]):
        response_text = (
            "Click the 'Sign Up' button on the homepage and enter your email, "
            "username, and password. It's free!"
        )
    elif any(kw in msg for kw in [
        "how do i log in", "how to login", "can't log in", "login problem", "sign in"
    ]):
        response_text = (
            "Click 'Log In' on the homepage and enter your email and password. "
            "If you forgot your password, contact support."
        )
    elif any(kw in msg for kw in [
        "forgot password", "reset password", "change password", "reset my password"
    ]):
        response_text = (
            "You can change your password from the Settings page. "
            "If you're locked out, contact support@grumpygamer.com."
        )
    elif any(kw in msg for kw in ["forgot username"]):
        response_text = (
            "If you forgot your username, check your registration email "
            "or contact support for help."
        )
    elif any(kw in msg for kw in [
        "delete account", "remove account", "delete my account"
    ]):
        response_text = (
            "You can delete your account from your profile settings. "
            "Note that this is irreversible and all your data will be permanently removed."
        )
    elif any(kw in msg for kw in [
        "update profile", "change username", "change email"
    ]):
        response_text = "Go to Settings to update your username, email, or password."
    elif any(kw in msg for kw in ["logout", "log out", "sign out"]):
        response_text = (
            "Click 'Log Out' in the top navigation bar to sign out of your account."
        )

    # --- Features & pages ---
    elif any(kw in msg for kw in ["dashboard"]):
        response_text = (
            "The Dashboard lets you track your wins, losses, streaks, "
            "and overall progress across all games."
        )
    elif any(kw in msg for kw in ["compare", "comparison"]):
        response_text = (
            "The Comparison page lets you compare your stats and performance "
            "against AI or other players."
        )
    elif any(kw in msg for kw in ["human vs ai", "play against ai", "vs ai"]):
        response_text = (
            "In Human vs AI mode, you play directly against our AI opponents. "
            "Choose your game and difficulty and see if you can win!"
        )
    elif any(kw in msg for kw in ["leaderboard", "rankings", "top players"]):
        response_text = (
            "The leaderboard tracks top players based on their wins and "
            "performance across all games."
        )
    elif any(kw in msg for kw in ["streak", "progress"]):
        response_text = (
            "Track your daily and lifetime streaks, wins, and progress in the Dashboard."
        )
    elif any(kw in msg for kw in ["settings"]):
        response_text = (
            "In Settings you can update your profile, change your password, "
            "toggle dark mode, and manage your account."
        )
    elif any(kw in msg for kw in ["dark mode", "light mode", "theme"]):
        response_text = "You can toggle dark mode in the Settings page. 🌙"

    # --- Recommendations ---
    elif any(kw in msg for kw in [
        "recommend", "suggest", "bored", "what should i play",
        "pick a game", "don't know what to play", "any ideas", "what game should i"
    ]):
        response_text = (
            "Here are some suggestions! 🎮 If you love words, try Wordle. "
            "For strategy, Chess or Connect Four are great. "
            "For a quick game, Tic-Tac-Toe or Rock Paper Scissors. "
            "For a brain workout, Sudoku or 2048. What sounds fun?"
        )

    # --- Technical & support ---
    elif any(kw in msg for kw in [
        "bug", "issue", "report", "not working", "broken",
        "error", "problem", "glitch"
    ]):
        response_text = (
            "Sorry to hear something isn't working! Please report it via the Contact page "
            "or open an issue on our GitHub. "
            "We appreciate your help in making Grumpy Gamer better!"
        )
    elif any(kw in msg for kw in [
        "feature request", "suggestion", "new feature", "would be cool", "add a game"
    ]):
        response_text = (
            "We love feedback! Submit feature requests or suggestions "
            "through the Contact page or GitHub."
        )
    elif any(kw in msg for kw in ["contact", "support", "help", "reach you", "email"]):
        response_text = (
            "You can reach us through the Contact page or email support@grumpygamer.com."
        )
    elif any(kw in msg for kw in ["mobile", "phone", "tablet", "ipad", "android", "ios"]):
        response_text = (
            "Grumpy Gamer works great on desktop and mobile browsers. "
            "Play anywhere, anytime! 📱"
        )
    elif any(kw in msg for kw in [
        "open source", "github", "source code", "contribute"
    ]):
        response_text = (
            "Grumpy Gamer is open source! "
            "Explore and contribute to the codebase on our GitHub repository."
        )
    elif any(kw in msg for kw in [
        "free", "cost", "price", "premium", "paid", "subscription"
    ]):
        response_text = (
            "Grumpy Gamer is completely free to use! Some premium features may be added "
            "in the future, but the core experience will always be free. 🎉"
        )
    elif any(kw in msg for kw in ["friends", "multiplayer", "invite", "play with"]):
        response_text = (
            "You can play solo or against AI. "
            "Invite friends to join and challenge them to your favorite games!"
        )
    elif any(kw in msg for kw in [
        "language", "translation", "spanish", "french", "german"
    ]):
        response_text = (
            "Currently Grumpy Gamer is available in English. "
            "Support for more languages may be added in the future."
        )
    elif any(kw in msg for kw in ["privacy", "data", "personal information", "gdpr"]):
        response_text = (
            "Your privacy is important to us. We never share your personal data "
            "with third parties. Your password is encrypted with bcrypt."
        )
    elif any(kw in msg for kw in [
        "secure", "security", "safe", "hack", "encrypted"
    ]):
        response_text = (
            "Your password is encrypted using bcrypt, and we use JWT tokens for "
            "secure authentication. Your data is safe with us. 🔒"
        )
    elif any(kw in msg for kw in [
        "why grumpy", "why the name", "name mean", "what does grumpy mean"
    ]):
        response_text = (
            "Because we've all had those gaming moments that make us a little grumpy! "
            "Embrace the grump! 😤🎮"
        )
    elif any(kw in msg for kw in ["difficulty", "level", "easy", "hard", "medium"]):
        response_text = (
            "Most games offer multiple difficulty levels: Easy, Medium, and Hard. "
            "Choose your challenge! 💪"
        )
    elif any(kw in msg for kw in ["save", "progress saved", "auto save"]):
        response_text = (
            "Your game stats and progress are automatically saved to your account "
            "after each game."
        )
    elif any(kw in msg for kw in [
        "score", "points", "how am i doing", "stats", "statistics"
    ]):
        response_text = "Check your scores, stats, and game history on the Dashboard page!"
    elif any(kw in msg for kw in [
        "new games", "upcoming games", "coming soon", "future games", "what's next"
    ]):
        response_text = (
            "We're constantly adding new games! Coming soon: Rock Paper Scissors, "
            "Hangman, Memory, and more. Stay tuned! 🚀"
        )
    elif any(kw in msg for kw in [
        "who made", "who built", "who created", "developer", "team"
    ]):
        response_text = (
            "Grumpy Gamer was built by a passionate team of developers. "
            "Check out the About page for more info!"
        )
    elif any(kw in msg for kw in ["thank", "thanks", "ty", "thx", "appreciate"]):
        response_text = "You're welcome! Happy gaming! 😄🎮"
    elif any(kw in msg for kw in ["bye", "goodbye", "see you", "cya", "later"]):
        response_text = "Goodbye! Come back and play anytime. Good luck! 👋😤"

    # --- Fallback ---
    else:
        response_text = (
            "Hmm, I'm not sure about that! I can help with questions about games, "
            "your account, features, or how to use Grumpy Gamer. Try asking things like:\n"
            "• 'What games are available?'\n"
            "• 'How do I play Wordle?'\n"
            "• 'How does the AI work?'\n"
            "• 'How do I reset my password?'"
        )

    logger.info(f"Rule-based response: {response_text}")
    logger.info(f"Returning response to user: {token_email}")
    return JSONResponse({"response": response_text})
