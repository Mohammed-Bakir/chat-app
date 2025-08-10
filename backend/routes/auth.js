import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper function to generate token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

// @route    POST /api/signup
// @desc     Register new user
router.post('/api/signup', async (req, res) => {
    console.log("Signup request received:", req.body);

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            console.log("Validation failed: missing fields");
            return res.status(400).json({ message: 'All fields required' });
        }
        // Check if user already exists
        console.log("Checking for existing user...");
        const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${req.body.username}`, 'i') } }).maxTimeMS(10000);

        if (existingUser) {
            console.log("User exists:", existingUser);
            return res.status(409).json({ message: 'Username taken' });
        }

        console.log("Creating user...");
        const newUser = new User({
            username: username.trim().toLowerCase(),
            password: password // Let the pre-save hook handle hashing
        });

        console.log("Saving user to database...");
        await newUser.save();
        console.log("User saved successfully:", newUser._id);

        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '1h' }
        );

        return res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Change to true in production
            sameSite: 'lax'
        }).status(201).json({
            token,
            user: { id: newUser._id, username: newUser.username }
        })

    } catch (err) {
        console.error("SIGNUP ERROR DETAILS:");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        console.error("Full error:", err);

        if (err.name === 'MongoServerError') {
            res.status(500).json({ message: 'Database operation failed' });
        } else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});

// @route    POST /api/login
// @desc     Authenticate user
router.post('/api/login', async (req, res) => {
    console.log("Login request received:", req.body);

    try {
        // 1. Early return if missing credentials
        if (!req.body.username || !req.body.password || !req.body.username.trim()) {
            console.log("Validation failed: missing credentials");
            return res.status(400).json({ message: 'Username and password required' });
        }

        // 2. Find user (case-insensitive)
        console.log("Searching for user:", req.body.username.trim());
        const user = await User.findOne({
            username: { $regex: new RegExp(`^${req.body.username.trim()}`, 'i') }
        });

        if (!user) {
            console.log("User not found");
            return res.status(401).json({ message: 'Invalid credentials' }); // Note: return
        }

        console.log("User found:", user.username);

        // 3. Compare passwords
        const isMatch = await user.comparePassword(req.body.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' }); // Note: return
        }

        // 4. Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '1h' }
        );

        // 5. Set cookie and send response
        return res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 3600000 // 1 hour
        }).json({ // Only ONE response
            token,
            user: { id: user._id, username: user.username }
        });

    } catch (err) {
        console.error('Login error:', err);
        if (!res.headersSent) { // Critical check
            res.status(500).json({ message: 'Server error' });
        }
    }
});

// @route    POST /api/logout
// @desc     Logout user
router.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: 'development'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

export default router;