const express = require('express');
const path = require('path');

// Create Express app for keep-alive
const app = express();
const PORT = process.env.PORT || 8080;

// Health check endpoints (similar to Flask app in Python bot)
app.get('/', (req, res) => {
    res.json({
        status: 'Bot is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Twitter Media Downloader Bot',
        timestamp: new Date().toISOString()
    });
});

app.get('/ping', (req, res) => {
    res.json({
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Import and start the Discord bot
console.log('🤖 Starting Discord bot...');
require('./bot.js');
