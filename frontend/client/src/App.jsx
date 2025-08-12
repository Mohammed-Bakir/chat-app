import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL } from './config/api';
import './App.css'

// Initialize socket outside component to maintain single instance
const socket = io(API_BASE_URL, {
  path: '/socket.io',
  withCredentials: true,
  transports: ['websocket', 'polling'],
  autoConnect: false, // We'll connect manually after auth check
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
});

export default function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);


  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle authentication and socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Configure socket auth
    socket.auth = { token };

    const handleConnect = () => {
      setConnectionStatus('connected');
      setError(null);
    };

    const handleConnectError = (err) => {
      setConnectionStatus('disconnected');
      if (err.message === 'Unauthorized') {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Connection error. Trying to reconnect...');
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleMessage = (messageData) => {
      // Backend now sends complete message objects
      setMessages((prev) => [...prev, messageData]);

      // Play notification sound for new messages (not from current user)
      const currentUser = localStorage.getItem('username');
      if (messageData.username !== currentUser) {
        try {
          playNotificationSound();
        } catch (error) {
          console.log('Could not play notification sound:', error);
        }
      }
    };

    const handleRecentMessages = (recentMessages) => {
      // Load recent messages when connecting
      setMessages(recentMessages);
      setIsLoadingMessages(false);
      console.log(`Loaded ${recentMessages.length} recent messages`);
    };

    const handleSocketError = (errorMessage) => {
      setError(errorMessage);
      console.error('Socket error:', errorMessage);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleUserTyping = (data) => {
      setTypingUsers(prev => {
        if (!prev.find(user => user.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });

      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      }, 3000);
    };

    const handleUserStopTyping = (data) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
    };

    // Connect and set up event listeners
    socket.connect();
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('message', handleMessage);
    socket.on('recent-messages', handleRecentMessages);
    socket.on('error', handleSocketError);
    socket.on('online-users', handleOnlineUsers);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    // Cleanup function
    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('message', handleMessage);
      socket.off('recent-messages', handleRecentMessages);
      socket.off('error', handleSocketError);
      socket.off('online-users', handleOnlineUsers);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
      socket.disconnect();
    };
  }, [navigate]);

  const sendMessage = () => {
    if (!message.trim()) return;

    try {
      socket.emit('message', message);
      setMessage('');
    } catch (err) {
      setError('Failed to send message');
      console.error('Send message error:', err);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout`, {}, { withCredentials: true });
      localStorage.removeItem('token');
      navigate('/login');

      window.location.reload()
    } catch (error) {
      console.log('Logout failed:' + error);
    }
  }

  const testConnection = async () => {
    try {
      const response = await axios.get('/api/test');
      console.log('Server test response:', response.data);
      alert(`Server Status: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('Server test failed:', error);
      alert('Server test failed - check console');
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      else {
        setMessage(message + '\n');
      }
    }

    if (e.shiftKey) {
      if (e.key === 'Enter') {
        return
      }
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Handle typing indicators
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      socket.emit('typing');
    }

    // Clear typing indicator after 1 second of no typing
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stop-typing');
      }
    }, 1000);
  };

  const playNotificationSound = () => {
    // Create a simple notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1> general</h1>
        <div className="header-info">
          <div className="online-count">
            {onlineUsers.length} online
          </div>
          <div className="connection-status" data-status={connectionStatus}>
            {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            {error && <span className="error-message">{error}</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="chat-main">
        <div className="messages-section">
          <div className="messages-container">
            {isLoadingMessages ? (
              <div className="loading-messages">
                <div className="loading-spinner"></div>
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="welcome-message">
                <span>Welcome to #general! Start the conversation...</span>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.id || i} className="message">
                  <div className="message-header">
                    <span className="message-username">{msg.username}</span>
                    <span className="message-timestamp">{formatTime(new Date(msg.timestamp))}</span>
                  </div>
                  <div className="message-content">
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].username} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="message-input">
            <textarea
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Message #general"
              onKeyDown={handleKeyPress}
              disabled={connectionStatus !== 'connected'}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || connectionStatus !== 'connected'}
            >
              Send
            </button>
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Online — {onlineUsers.length}</h3>
          </div>
          <div className="online-users">
            {onlineUsers.map((user, i) => (
              <div key={i} className="online-user">
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                  <div className="user-status online"></div>
                </div>
                <span className="user-name">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}