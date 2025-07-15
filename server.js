const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'Media Downloader Bot is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'media-downloader-bot',
        timestamp: new Date().toISOString()
    });
});

// Scraper endpoint
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Run scraper
        const scraper = spawn('node', ['scraper.js', url]);
        let output = '';
        let errorOutput = '';

        scraper.stdout.on('data', (data) => {
            output += data.toString();
        });

        scraper.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        scraper.on('close', (code) => {
            if (code === 0) {
                res.json({ success: true, output });
            } else {
                res.status(500).json({ error: errorOutput || 'Scraping failed' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the Discord bot
console.log('Starting Discord bot...');
const botProcess = spawn('node', ['bot.js'], { 
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
});

botProcess.stdout.on('data', (data) => {
    console.log(`Bot: ${data.toString().trim()}`);
});

botProcess.stderr.on('data', (data) => {
    console.error(`Bot Error: ${data.toString().trim()}`);
});

botProcess.on('error', (error) => {
    console.error('Bot process error:', error);
});

botProcess.on('close', (code) => {
    console.log(`Bot process exited with code ${code}`);
});

// Start the web server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        if (botProcess && !botProcess.killed) {
            botProcess.kill('SIGTERM');
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.close(() => {
        if (botProcess && !botProcess.killed) {
            botProcess.kill('SIGTERM');
        }
        process.exit(0);
    });
});
