import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';

// Constants - Environment-based URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8002';
const STORAGE_KEY = 'chat_user';

// Custom Hooks
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
};

const useApi = () => {
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `HTTP error! status: ${response.status}`);
    }

    return data;
  }, []);

  return { apiCall };
};

const useWebSocket = (roomId, user, onMessage, onUsersUpdate, onRoomInfo) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((ws) => {
    // Send ping every 30 seconds to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }, []);

  const connect = useCallback(() => {
    if (!user || isReconnecting) return null;

    console.log(`Attempting to connect to WebSocket... (Attempt ${reconnectAttemptsRef.current + 1})`);
    
    const ws = new WebSocket(`${WS_BASE_URL}/ws/${roomId}/${user.user_id}`);
    
    const connectionTimeout = setTimeout(() => {
      console.log('WebSocket connection timeout');
      ws.close();
    }, 10000); // 10 second timeout

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      clearTimeout(connectionTimeout);
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      setSocket(ws);
      
      // Start heartbeat
      startHeartbeat(ws);
      
      // Send join room message - wait a bit for connection to stabilize
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'join_room',
            room_id: roomId,
            username: user.username
          }));
        }
      }, 100);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'message':
            onMessage(data);
            break;
          case 'user_joined':
          case 'user_left':
          case 'users_update':
            onUsersUpdate(data);
            break;
          case 'room_info':
            onRoomInfo(data);
            break;
          case 'pong':
            // Heartbeat response - connection is alive
            console.log('Received pong from server');
            break;
          case 'error':
            console.error('Server error:', data.message);
            break;
          default:
            console.log('Unknown message type:', data.type, data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      clearTimeout(connectionTimeout);
      cleanup();
      setIsConnected(false);
      setSocket(null);
      
      // Only auto-reconnect if it wasn't a manual close and we haven't exceeded max attempts
      if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
        console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          setIsReconnecting(false);
          connect();
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(connectionTimeout);
    };

    return ws;
  }, [roomId, user, onMessage, onUsersUpdate, onRoomInfo, isReconnecting, cleanup, startHeartbeat]);

  useEffect(() => {
    if (!user) return;

    const ws = connect();
    
    return () => {
      cleanup();
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1000, 'Component unmounting'); // Normal closure
      }
    };
  }, [user, roomId]); // Remove connect from dependencies to prevent loops

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    }
    console.warn('Cannot send message: WebSocket not connected');
    return false;
  }, [socket]);

  const forceReconnect = useCallback(() => {
    cleanup();
    if (socket) {
      socket.close();
    }
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [socket, cleanup, connect]);

  return { 
    socket, 
    isConnected, 
    isReconnecting, 
    sendMessage,
    forceReconnect,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
};

// Reusable Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
  </div>
);

const FormInput = ({ label, value, onChange, placeholder, onKeyPress, className = "", ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyPress={onKeyPress}
      className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 ${className}`}
      {...props}
    />
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  disabled, 
  loading, 
  variant = 'primary', 
  size = 'md',
  className = "",
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-indigo-500/25",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-500/25",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-red-500/25",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:border-slate-600"
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Loading...</span>
        </div>
      ) : children}
    </button>
  );
};

const MessageBubble = React.memo(({ message, isOwn, username, timestamp }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
      isOwn 
        ? 'bg-indigo-600 text-white rounded-br-md' 
        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md'
    }`}>
      {!isOwn && (
        <div className="text-xs font-semibold mb-1 text-indigo-600 dark:text-indigo-400">
          {username}
        </div>
      )}
      <div className="break-words leading-relaxed">{message}</div>
      <div className={`text-xs mt-2 ${isOwn ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
        {timestamp}
      </div>
    </div>
  </div>
));

// Home Page Component
const HomePage = () => {
  const [roomName, setRoomName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { apiCall } = useApi();

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!roomName.trim()) newErrors.roomName = 'Room name is required';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (username.trim().length < 2) newErrors.username = 'Username must be at least 2 characters';
    if (username.trim().length > 20) newErrors.username = 'Username must be less than 20 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [roomName, username]);

  const createRoom = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const data = await apiCall('/api/create-room', {
        method: 'POST',
        body: JSON.stringify({
          room_name: roomName.trim(),
          username: username.trim(),
        }),
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user_id: data.user_id,
        username: username.trim(),
        room_id: data.room_id
      }));
      
      navigate(`/room/${data.room_id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }, [roomName, username, validateForm, apiCall, navigate]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !loading) {
      createRoom();
    }
  }, [createRoom, loading]);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">ChatHub</h1>
            <p className="text-slate-600 dark:text-slate-400">Create a professional workspace and invite your team</p>
          </div>

          <div className="space-y-5">
            <FormInput
              label="Workspace Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter workspace name"
              onKeyPress={handleKeyPress}
              className={errors.roomName ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {errors.roomName && <p className="text-red-500 text-sm mt-1">{errors.roomName}</p>}

            <FormInput
              label="Your Display Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your display name"
              onKeyPress={handleKeyPress}
              className={errors.username ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}

            <Button
              onClick={createRoom}
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Workspace
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Have an invitation link? Simply click it to join the workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Room Join Page Component
const RoomJoinPage = () => {
  const { roomId } = useParams();
  const [username, setUsername] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingRoom, setFetchingRoom] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { apiCall } = useApi();

  const fetchRoomInfo = useCallback(async () => {
    try {
      const data = await apiCall(`/api/room/${roomId}`);
      setRoomInfo(data);
    } catch (error) {
      console.error('Error fetching room:', error);
      setError('Workspace not found!');
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setFetchingRoom(false);
    }
  }, [roomId, apiCall, navigate]);

  useEffect(() => {
    fetchRoomInfo();
  }, [fetchRoomInfo]);

  const validateUsername = useCallback((username) => {
    if (!username.trim()) return 'Please enter a display name';
    if (username.trim().length < 2) return 'Display name must be at least 2 characters';
    if (username.trim().length > 20) return 'Display name must be less than 20 characters';
    return '';
  }, []);

  const joinRoom = useCallback(async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiCall(`/api/room/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() }),
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user_id: data.user_id,
        username: username.trim(),
        room_id: roomId
      }));
      
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join workspace');
    } finally {
      setLoading(false);
    }
  }, [username, roomId, validateUsername, apiCall, navigate]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !loading) {
      joinRoom();
    }
  }, [joinRoom, loading]);

  if (fetchingRoom) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="text-center space-y-4">
              <LoadingSpinner />
              <p className="text-slate-600 dark:text-slate-400">Loading workspace...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !roomInfo) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Workspace Not Found</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Redirecting to home in 3 seconds...</p>
            <Button onClick={() => navigate('/')} variant="secondary">
              Go Home Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Join Workspace</h1>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-indigo-900 dark:text-indigo-100 text-lg">{roomInfo?.room_name}</h2>
              <div className="flex items-center justify-center space-x-2 mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>{roomInfo?.user_count} members active</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <FormInput
              label="Choose Your Display Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your display name"
              onKeyPress={handleKeyPress}
              className={error ? 'border-red-500 focus:ring-red-500' : ''}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              onClick={joinRoom}
              loading={loading}
              variant="success"
              className="w-full"
              size="lg"
            >
              Join Workspace
            </Button>

            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="w-full"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat Room Component
const ChatRoom = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [user, setUser] = useLocalStorage(STORAGE_KEY, null);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Check user authorization
  useEffect(() => {
    if (!user || user.room_id !== roomId) {
      navigate('/');
    }
  }, [user, roomId, navigate]);

  // Generate invite link
  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${roomId}`);
  }, [roomId]);

  // WebSocket handlers
  const handleMessage = useCallback((data) => {
    // Handle both direct messages and message objects from backend
    const message = {
      id: data.id || `${Date.now()}-${Math.random()}`,
      user_id: data.user_id,
      username: data.username,
      message: data.content || data.message, // Backend sends 'content', fallback to 'message'
      timestamp: data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, message]);
  }, []);

  const handleUsersUpdate = useCallback((data) => {
    if (data.users) {
      setUsers(data.users);
    }
    // Update user count if provided
    if (data.users_count !== undefined) {
      console.log(`Room has ${data.users_count} users`);
    }
  }, []);

  const handleRoomInfo = useCallback((data) => {
    setRoomName(data.room_name);
    if (data.users) {
      setUsers(data.users);
    }
    // Load recent messages if provided
    if (data.recent_messages && Array.isArray(data.recent_messages)) {
      const formattedMessages = data.recent_messages.map(msg => ({
        id: msg.id || `${Date.now()}-${Math.random()}`,
        user_id: msg.user_id,
        username: msg.username,
        message: msg.content || msg.message,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(formattedMessages);
    }
  }, []);

  const { isConnected, isReconnecting, sendMessage, forceReconnect, reconnectAttempts, maxReconnectAttempts } = useWebSocket(
    roomId, 
    user, 
    handleMessage, 
    handleUsersUpdate, 
    handleRoomInfo
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChatMessage = useCallback(() => {
    if (!newMessage.trim() || !isConnected) return;

    const success = sendMessage({
      type: 'message',
      content: newMessage.trim() // Backend expects 'content' field
    });
    
    if (success) {
      setNewMessage('');
    } else {
      console.error('Failed to send message - connection not ready');
    }
  }, [newMessage, isConnected, sendMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }, [sendChatMessage]);

  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Invitation link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Invitation link copied to clipboard!');
    }
  }, [inviteLink]);

  const leaveRoom = useCallback(() => {
    if (window.confirm('Are you sure you want to leave this workspace?')) {
      setUser(null);
      navigate('/');
    }
  }, [setUser, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col w-full h-full">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              isReconnecting ? 'bg-amber-500' : isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}></div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{roomName}</h1>
              <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{users.length} members online</span>
                </span>
                {isReconnecting && (
                  <span className="flex items-center space-x-1 text-amber-500">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    <span>Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})</span>
                  </span>
                )}
                {!isConnected && !isReconnecting && reconnectAttempts >= maxReconnectAttempts && (
                  <span className="flex items-center space-x-2 text-red-500">
                    <span>Connection failed</span>
                    <button 
                      onClick={forceReconnect}
                      className="text-indigo-600 hover:text-indigo-700 underline font-medium"
                    >
                      Retry
                    </button>
                  </span>
                )}
                {!isConnected && !isReconnecting && reconnectAttempts < maxReconnectAttempts && (
                  <span className="flex items-center space-x-1 text-red-500">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Disconnected</span>
                  </span>
                )}
                {isConnected && (
                  <span className="flex items-center space-x-1 text-emerald-500">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Connected</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Invite</span>
          </Button>
          <Button
            onClick={leaveRoom}
            variant="danger"
            size="sm"
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Leave</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 w-full">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Welcome to {roomName}</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">No messages yet. Start the conversation and make your team collaboration more effective!</p>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message.message}
            isOwn={message.user_id === user.user_id}
            username={message.username}
            timestamp={message.timestamp}
          />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-6 flex-shrink-0 w-full">
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!isConnected}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100"
            />
          </div>
          <Button
            onClick={sendChatMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="px-6 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Send</span>
          </Button>
        </div>
        
        {!isConnected && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>You're currently disconnected. Messages cannot be sent until connection is restored.</span>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md mx-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite Team Members</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Share this link to invite others to join</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Invitation Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 font-mono"
                  />
                  <Button onClick={copyInviteLink} size="sm" className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => setShowInviteModal(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const SimpleChatApp = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:roomId" element={<RoomJoinPage />} />
        <Route path="/room/:roomId" element={<ChatRoom />} />
      </Routes>
    </Router>
  );
};

export default SimpleChatApp;