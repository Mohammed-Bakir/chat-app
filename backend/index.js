import express, { urlencoded } from 'express';
import dotenv from 'dotenv'
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRouter from './routes/auth.js';
import User from './models/user.js';
import Message from './models/message.js';

// Load environment variables first
dotenv.config();

const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error details:');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
    });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: 'http://localhost:5174',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    exposedHeaders: ['set-cookie']
}));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Server is working',
        mongooseConnection: mongoose.connection.readyState,
        jwtSecret: process.env.JWT_SECRET ? 'JWT_SECRET is set' : 'JWT_SECRET is missing'
    });
});

// Get message history endpoint
app.get('/api/messages', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        const formattedMessages = messages.reverse().map(msg => ({
            id: msg._id,
            text: msg.text,
            username: msg.username,
            userId: msg.userId,
            timestamp: msg.timestamp
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// Routes
app.use('/', authRouter);

const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5174',
        methods: ['GET', 'POST'],
        credentials: true
    },
    path: '/socket.io'
});

// Socket.IO authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database to get username
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.userId = decoded.id;
        socket.username = user.username;
        next();
    } catch (err) {
        next(new Error('Unauthorized'));
    }
});

// Store online users
const onlineUsers = new Map();

// Socket.IO events
io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);
    console.log('Authenticated user:', socket.username, '(ID:', socket.userId + ')');

    // Add user to online users
    onlineUsers.set(socket.userId, {
        username: socket.username,
        socketId: socket.id,
        lastSeen: new Date()
    });

    // Broadcast updated online users list
    io.emit('online-users', Array.from(onlineUsers.values()).map(user => ({
        username: user.username,
        lastSeen: user.lastSeen
    })));

    try {
        // Load recent messages (last 50) and send to the newly connected user
        const recentMessages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        // Reverse to show oldest first
        const messagesForClient = recentMessages.reverse().map(msg => ({
            id: msg._id,
            text: msg.text,
            username: msg.username,
            userId: msg.userId,
            timestamp: msg.timestamp
        }));

        // Send recent messages to the newly connected user
        socket.emit('recent-messages', messagesForClient);
        console.log(`Sent ${messagesForClient.length} recent messages to ${socket.username}`);

    } catch (error) {
        console.error('Error loading recent messages:', error);
    }

    socket.on('message', async (messageText) => {
        try {
            // Save message to database
            const newMessage = new Message({
                text: messageText,
                username: socket.username,
                userId: socket.userId,
                timestamp: new Date()
            });

            const savedMessage = await newMessage.save();
            console.log('Message saved to database:', savedMessage._id);

            const messageData = {
                id: savedMessage._id,
                text: savedMessage.text,
                username: savedMessage.username,
                userId: savedMessage.userId,
                timestamp: savedMessage.timestamp
            };

            console.log('Message from', socket.username + ':', messageText);

            // Broadcast to all connected users
            io.emit('message', messageData);

        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', 'Failed to send message');
        }
    });

    // Handle typing indicators
    socket.on('typing', () => {
        socket.broadcast.emit('user-typing', {
            username: socket.username,
            userId: socket.userId
        });
    });

    socket.on('stop-typing', () => {
        socket.broadcast.emit('user-stop-typing', {
            username: socket.username,
            userId: socket.userId
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.username, '(' + socket.id + ')');

        // Remove user from online users
        onlineUsers.delete(socket.userId);

        // Broadcast updated online users list
        io.emit('online-users', Array.from(onlineUsers.values()).map(user => ({
            username: user.username,
            lastSeen: user.lastSeen
        })));
    });
});

// Start server
server.listen(5000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:5000');
});
