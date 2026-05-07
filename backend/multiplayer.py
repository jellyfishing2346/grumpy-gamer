"""
Real-time multiplayer WebSocket server for TicTacToe.
Manages game rooms and syncs moves between two players.
"""
import uuid
import json
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

multiplayer_router = APIRouter()

# In-memory room storage
rooms: Dict[str, dict] = {}


def create_room_state() -> dict:
    return {
        "board": [""] * 9,
        "players": {},      # {player_id: "X" or "O"}
        "connections": {},  # {player_id: WebSocket}
        "current_turn": "X",
        "winner": None,
        "is_draw": False,
        "status": "waiting",  # waiting, playing, finished
    }


def check_winner(board: list) -> Optional[str]:
    lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6],
    ]
    for line in lines:
        a, b, c = line
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


async def broadcast(room: dict, message: dict):
    """Send a message to all players in a room."""
    for player_id, ws in room["connections"].items():
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            pass


class CreateRoomResponse(BaseModel):
    room_id: str
    player_id: str
    symbol: str


@multiplayer_router.post("/multiplayer/create")
async def create_room() -> CreateRoomResponse:
    """Create a new game room and return the room code."""
    room_id = str(uuid.uuid4())[:6].upper()
    player_id = str(uuid.uuid4())
    rooms[room_id] = create_room_state()
    rooms[room_id]["players"][player_id] = "X"
    return CreateRoomResponse(room_id=room_id, player_id=player_id, symbol="X")


class JoinRoomRequest(BaseModel):
    room_id: str


class JoinRoomResponse(BaseModel):
    room_id: str
    player_id: str
    symbol: str


@multiplayer_router.post("/multiplayer/join")
async def join_room(req: JoinRoomRequest) -> JoinRoomResponse:
    """Join an existing room by code."""
    from fastapi import HTTPException
    room_id = req.room_id.upper()
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = rooms[room_id]
    if len(room["players"]) >= 2:
        raise HTTPException(status_code=400, detail="Room is full")
    player_id = str(uuid.uuid4())
    room["players"][player_id] = "O"
    return JoinRoomResponse(room_id=room_id, player_id=player_id, symbol="O")


@multiplayer_router.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    """WebSocket endpoint for real-time game communication."""
    await websocket.accept()
    room_id = room_id.upper()

    if room_id not in rooms:
        await websocket.send_text(json.dumps({"type": "error", "message": "Room not found"}))
        await websocket.close()
        return

    room = rooms[room_id]
    if player_id not in room["players"]:
        await websocket.send_text(json.dumps({"type": "error", "message": "Player not in room"}))
        await websocket.close()
        return

    # Register connection
    room["connections"][player_id] = websocket
    symbol = room["players"][player_id]

    # Send current game state to the joining player
    await websocket.send_text(json.dumps({
        "type": "connected",
        "symbol": symbol,
        "board": room["board"],
        "current_turn": room["current_turn"],
        "player_count": len(room["connections"]),
        "status": room["status"],
    }))

    # If both players connected, start the game
    if len(room["connections"]) == 2 and room["status"] == "waiting":
        room["status"] = "playing"
        await broadcast(room, {
            "type": "game_start",
            "board": room["board"],
            "current_turn": room["current_turn"],
            "message": "Game started! X goes first.",
        })

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "move":
                cell = msg.get("cell")

                # Validate move
                if room["status"] != "playing":
                    await websocket.send_text(json.dumps({"type": "error", "message": "Game not in progress"}))
                    continue
                if room["current_turn"] != symbol:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not your turn"}))
                    continue
                if cell is None or cell < 0 or cell > 8 or room["board"][cell] != "":
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid move"}))
                    continue

                # Apply move
                room["board"][cell] = symbol
                winner = check_winner(room["board"])
                is_draw = not winner and all(c != "" for c in room["board"])

                if winner:
                    room["status"] = "finished"
                    room["winner"] = winner
                    await broadcast(room, {
                        "type": "game_over",
                        "board": room["board"],
                        "winner": winner,
                        "message": f"Player {winner} wins!",
                    })
                elif is_draw:
                    room["status"] = "finished"
                    room["is_draw"] = True
                    await broadcast(room, {
                        "type": "game_over",
                        "board": room["board"],
                        "winner": None,
                        "message": "It's a draw!",
                    })
                else:
                    room["current_turn"] = "O" if symbol == "X" else "X"
                    await broadcast(room, {
                        "type": "move",
                        "board": room["board"],
                        "current_turn": room["current_turn"],
                        "cell": cell,
                        "symbol": symbol,
                    })

            elif msg.get("type") == "rematch":
                room["board"] = [""] * 9
                room["current_turn"] = "X"
                room["winner"] = None
                room["is_draw"] = False
                room["status"] = "playing"
                await broadcast(room, {
                    "type": "rematch",
                    "board": room["board"],
                    "current_turn": room["current_turn"],
                    "message": "Rematch started! X goes first.",
                })

    except WebSocketDisconnect:
        # Remove connection
        room["connections"].pop(player_id, None)
        await broadcast(room, {
            "type": "opponent_disconnected",
            "message": "Your opponent disconnected.",
        })
        # Clean up empty rooms
        if not room["connections"]:
            rooms.pop(room_id, None)
