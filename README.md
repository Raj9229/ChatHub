# ChatHub - Real-time Chat Application

A modern, real-time chat application built with React and FastAPI, featuring invite-based workspaces and professional design.

## 🚀 Features

- **Real-time Messaging**: Instant chat with WebSocket connections
- **Workspace System**: Create and join workspaces with invite links
- **Professional UI**: Modern design with dark/light theme support
- **Responsive Design**: Works perfectly on desktop and mobile
- **Connection Management**: Auto-reconnection and connection status indicators
- **User-friendly**: Simple workspace creation and joining process

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with modern features
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend
- **FastAPI** - Modern Python web framework
- **WebSockets** - Real-time bidirectional communication
- **Uvicorn** - ASGI server
- **In-memory Storage** - Simple and fast for demo purposes

## 📦 Project Structure

```
telemedicine/
├── telemedicine_frontend/     # React frontend
│   ├── src/
│   │   ├── SimpleChatApp.jsx # Main application component
│   │   ├── main.jsx         # Application entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   └── vite.config.js
└── telemedicine_backend/      # FastAPI backend
    ├── simple_main.py        # Main server file
    ├── requirements.txt      # Python dependencies
    └── README.md
```

## 🔧 Local Development

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Backend Setup
```bash
cd telemedicine_backend
pip install -r requirements.txt
python simple_main.py
```
Server will run on `http://localhost:8002`

### Frontend Setup
```bash
cd telemedicine_frontend
npm install
npm run dev
```
Development server will run on `http://localhost:5174`

## 🌐 Deployment

### Environment Variables

#### Backend (Required for production)
```env
PORT=8002
HOST=0.0.0.0
ENVIRONMENT=production
```

#### Frontend (Update API URLs for production)
```env
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
```

### Deploy to Render

1. **Backend Deployment**:
   - Create new Web Service
   - Connect GitHub repository
   - Root Directory: `telemedicine_backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python simple_main.py`

2. **Frontend Deployment**:
   - Create new Static Site
   - Connect GitHub repository
   - Root Directory: `telemedicine_frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

### Deploy to Railway

1. **Backend**:
   - Deploy from GitHub
   - Root Directory: `telemedicine_backend`
   - Railway will auto-detect Python and use `requirements.txt`

2. **Frontend**:
   - Deploy from GitHub
   - Root Directory: `telemedicine_frontend`
   - Railway will auto-detect Node.js and use `package.json`

## 🔗 Live Demo

- **Application**: [Your Frontend URL]
- **API**: [Your Backend URL]

## 🎯 Usage

1. **Create Workspace**: Enter workspace name and your display name
2. **Share Invite**: Copy the workspace invite link
3. **Join Workspace**: Others can use the invite link to join
4. **Chat**: Real-time messaging with connection status indicators

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using modern web technologies
- Inspired by professional communication tools
- Designed for simplicity and performance

---

**ChatHub** - Bringing teams together through seamless communication.

## Features

✅ **User Authentication**
- User registration and login with JWT tokens
- Secure password hashing with bcrypt

✅ **Real-time Messaging**
- WebSocket connections for instant messaging
- Live user status (online/offline)
- Room-based conversations

✅ **Chat Rooms**
- Create and join multiple chat rooms
- Persistent chat history stored in database
- Room descriptions and member counts

✅ **Modern UI/UX**
- Responsive design with TailwindCSS
- Clean, modern interface
- Auto-scroll to latest messages
- Message timestamps and user avatars

## Tech Stack

### Backend (FastAPI)
- **FastAPI** - High-performance web framework
- **WebSockets** - Real-time communication
- **SQLAlchemy** - Database ORM
- **SQLite** - Database storage
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend (React)
- **React 18** - UI framework
- **TailwindCSS** - Utility-first CSS framework
- **Vite** - Fast build tool
- **WebSocket API** - Real-time connection

## Project Structure

```
├── telemedicine_backend/          # FastAPI backend
│   ├── main.py                   # Main application
│   ├── models.py                 # Database models
│   ├── schemas.py                # Pydantic schemas
│   ├── auth.py                   # Authentication utilities
│   ├── websocket_manager.py      # WebSocket connection manager
│   ├── requirements.txt          # Python dependencies
│   ├── start.bat                 # Backend start script
│   └── chat_app.db              # SQLite database (auto-created)
│
└── telemedicine_frontend/         # React frontend
    ├── src/
    │   ├── components/           # React components
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── ChatRoom.jsx
    │   │   └── MessageList.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx   # Authentication context
    │   ├── hooks/
    │   │   └── useWebSocket.js   # WebSocket hook
    │   └── App.jsx               # Main app component
    ├── package.json
    └── start.bat                 # Frontend start script
```

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd telemedicine_backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Or use the start script:
   ```bash
   start.bat
   ```

The backend will be running at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd telemedicine_frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Or use the start script:
   ```bash
   start.bat
   ```

The frontend will be running at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/me` - Get current user info

### Rooms
- `GET /api/rooms` - Get all chat rooms
- `POST /api/rooms` - Create a new room
- `POST /api/rooms/{room_id}/join` - Join a room
- `GET /api/rooms/{room_id}/messages` - Get room message history

### Users
- `GET /api/users/online` - Get online users

### WebSocket
- `WS /ws/{room_id}?token={jwt_token}` - WebSocket connection for real-time chat

## Usage

1. **Register/Login:** Create an account or sign in with existing credentials
2. **Create/Join Rooms:** Use the sidebar to create new chat rooms or join existing ones
3. **Start Chatting:** Select a room and start sending messages in real-time
4. **View Online Users:** See who's currently online in the sidebar

## Features in Detail

### Real-time Messaging
- Messages are delivered instantly via WebSocket connections
- Message history is preserved in the database
- Auto-scroll to latest messages
- Timestamps and user identification

### User Management
- Secure JWT-based authentication
- Password hashing with bcrypt
- Online/offline status tracking
- User avatars with color coding

### Room Management
- Create rooms with names and descriptions
- Join multiple rooms
- View room member counts
- Persistent room state

## Development Notes

### Security
- JWT tokens for authentication
- CORS configured for development
- Password hashing with bcrypt
- Input validation with Pydantic

### WebSocket Management
- Connection pooling per room
- Automatic cleanup on disconnect
- Broadcast messaging to room members
- Error handling and reconnection

### Database
- SQLite for simplicity (can be upgraded to PostgreSQL)
- SQLAlchemy ORM for database operations
- Automatic table creation
- Relationship management

## Future Enhancements

- File upload and sharing
- Message editing and deletion
- Push notifications
- User profiles and settings
- Message search functionality
- Voice/video calling integration
- Mobile app development
- Email notifications
- Admin panel for room management
- Message encryption

## Troubleshooting

### Common Issues

1. **WebSocket connection fails:**
   - Ensure backend is running on port 8000
   - Check JWT token is valid
   - Verify user is a member of the room

2. **CORS errors:**
   - Backend includes CORS middleware for localhost:5173
   - Add your domain to allowed origins if needed

3. **Database errors:**
   - SQLite database is created automatically
   - Check file permissions in backend directory

### Development Tips

- Use browser developer tools to debug WebSocket connections
- Check FastAPI interactive docs at `http://localhost:8000/docs`
- Monitor backend logs for authentication and WebSocket issues
- Use React DevTools for frontend state debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
