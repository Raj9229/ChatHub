from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
import uuid
import asyncio
from typing import Dict, List, Set
from datetime import datetime
from pydantic import BaseModel

app = FastAPI(title="Simple Chat Room", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
class ChatRoom:
    def __init__(self, room_id: str, name: str):
        self.room_id = room_id
        self.name = name
        self.users: Dict[str, dict] = {}
        self.connections: Dict[str, WebSocket] = {}
        self.messages: List[dict] = []
        self.created_at = datetime.now()

class User:
    def __init__(self, user_id: str, username: str):
        self.user_id = user_id
        self.username = username
        self.joined_at = datetime.now()

# Storage
rooms: Dict[str, ChatRoom] = {}
active_connections: Dict[str, WebSocket] = {}

# Pydantic models
class CreateRoomRequest(BaseModel):
    room_name: str
    username: str

class JoinRoomRequest(BaseModel):
    username: str

class MessageRequest(BaseModel):
    content: str

# Helper functions
def generate_room_id() -> str:
    return str(uuid.uuid4())[:8]

def generate_user_id() -> str:
    return str(uuid.uuid4())[:8]

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Simple Chat Room API"}

@app.post("/api/create-room")
async def create_room(request: CreateRoomRequest):
    room_id = generate_room_id()
    room = ChatRoom(room_id, request.room_name)
    rooms[room_id] = room
    
    # Add creator to room
    user_id = generate_user_id()
    user = User(user_id, request.username)
    room.users[user_id] = {
        "user_id": user_id,
        "username": request.username,
        "joined_at": datetime.now().isoformat(),
        "is_creator": True
    }
    
    invite_link = f"http://localhost:5174/room/{room_id}"
    
    return {
        "room_id": room_id,
        "room_name": request.room_name,
        "invite_link": invite_link,
        "user_id": user_id,
        "message": "Room created successfully"
    }

@app.get("/api/room/{room_id}")
async def get_room_info(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms[room_id]
    return {
        "room_id": room_id,
        "room_name": room.name,
        "user_count": len(room.users),
        "users": list(room.users.values()),
        "created_at": room.created_at.isoformat()
    }

@app.post("/api/room/{room_id}/join")
async def join_room(room_id: str, request: JoinRoomRequest):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms[room_id]
    
    # Check if username is already taken in this room
    for user in room.users.values():
        if user["username"].lower() == request.username.lower():
            raise HTTPException(status_code=400, detail="Username already taken in this room")
    
    user_id = generate_user_id()
    room.users[user_id] = {
        "user_id": user_id,
        "username": request.username,
        "joined_at": datetime.now().isoformat(),
        "is_creator": False
    }
    
    return {
        "user_id": user_id,
        "username": request.username,
        "room_id": room_id,
        "room_name": room.name,
        "message": "Joined room successfully"
    }

@app.get("/api/room/{room_id}/messages")
async def get_room_messages(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room = rooms[room_id]
    return {
        "room_id": room_id,
        "messages": room.messages[-50:]  # Return last 50 messages
    }

# WebSocket endpoint
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    await websocket.accept()
    
    if room_id not in rooms:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Room not found"
        }))
        await websocket.close()
        return
    
    room = rooms[room_id]
    
    if user_id not in room.users:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "User not found in room"
        }))
        await websocket.close()
        return
    
    # Store connection
    room.connections[user_id] = websocket
    active_connections[user_id] = websocket
    
    user = room.users[user_id]
    
    # Notify others that user joined
    join_message = {
        "type": "user_joined",
        "user_id": user_id,
        "username": user["username"],
        "timestamp": datetime.now().isoformat(),
        "users_count": len(room.users)
    }
    
    await broadcast_to_room(room_id, join_message, exclude_user=user_id)
    
    # Send current room info to the user
    await websocket.send_text(json.dumps({
        "type": "room_info",
        "room_id": room_id,
        "room_name": room.name,
        "users": list(room.users.values()),
        "recent_messages": room.messages[-10:]  # Last 10 messages
    }))
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "message":
                # Create message object
                message = {
                    "id": str(uuid.uuid4()),
                    "type": "message",
                    "content": message_data["content"],
                    "user_id": user_id,
                    "username": user["username"],
                    "timestamp": datetime.now().isoformat()
                }
                
                # Store message in room
                room.messages.append(message)
                
                # Broadcast to all users in room
                await broadcast_to_room(room_id, message)
                
            elif message_data["type"] == "typing":
                # Broadcast typing indicator
                typing_message = {
                    "type": "typing",
                    "user_id": user_id,
                    "username": user["username"],
                    "is_typing": message_data.get("is_typing", False)
                }
                await broadcast_to_room(room_id, typing_message, exclude_user=user_id)
                
            elif message_data["type"] == "ping":
                # Respond to heartbeat ping
                await websocket.send_text(json.dumps({"type": "pong"}))
                
            else:
                print(f"Unknown message type: {message_data['type']}")
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user {user_id} in room {room_id}")
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        # Clean up connection
        if user_id in room.connections:
            del room.connections[user_id]
        if user_id in active_connections:
            del active_connections[user_id]
        
        # Notify others that user left
        leave_message = {
            "type": "user_left",
            "user_id": user_id,
            "username": user["username"],
            "timestamp": datetime.now().isoformat(),
            "users_count": len(room.users) - 1
        }
        
        # Remove user from room
        if user_id in room.users:
            del room.users[user_id]
        
        await broadcast_to_room(room_id, leave_message)
        
        # Clean up empty rooms
        if len(room.users) == 0:
            del rooms[room_id]

async def broadcast_to_room(room_id: str, message: dict, exclude_user: str = None):
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    disconnected = []
    
    for user_id, websocket in room.connections.items():
        if exclude_user and user_id == exclude_user:
            continue
            
        try:
            # Check if websocket is still open
            if websocket.client_state.name != 'DISCONNECTED':
                await websocket.send_text(json.dumps(message))
            else:
                disconnected.append(user_id)
        except Exception as e:
            print(f"Error broadcasting to user {user_id}: {e}")
            disconnected.append(user_id)
    
    # Clean up disconnected websockets
    for user_id in disconnected:
        if user_id in room.connections:
            del room.connections[user_id]
        if user_id in active_connections:
            del active_connections[user_id]
        if user_id in room.users:
            del room.users[user_id]

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_rooms": len(rooms),
        "total_connections": len(active_connections),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
