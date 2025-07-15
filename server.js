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
        uptime: process.uptime(),
        environment: {
            node_version: process.version,
            platform: process.platform,
            has_discord_token: !!process.env.DISCORD_TOKEN,
            has_twitter_keys: !!(process.env.TWITTER_API_KEY_1 && process.env.TWITTER_API_KEY_2)
        }
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

// Check if required environment variables are present
if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️  WARNING: DISCORD_TOKEN environment variable is missing!');
    console.warn('⚠️  The Discord bot will not start without a valid token.');
    console.warn('⚠️  Please set DISCORD_TOKEN in your deployment environment variables.');
}

if (!process.env.TWITTER_API_KEY_1 || !process.env.TWITTER_API_KEY_2) {
    console.warn('⚠️  WARNING: Twitter API keys are missing!');
    console.warn('⚠️  The bot may not function properly without Twitter API access.');
}

// Start the Discord bot only if token is present
let botProcess = null;
if (process.env.DISCORD_TOKEN) {
    console.log('Starting Discord bot...');
    botProcess = spawn('node', ['bot.js'], { 
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
        if (code !== 0) {
            console.error('Bot crashed. Server will continue running for health checks.');
        }
    });
} else {
    console.log('🔧 Discord bot not started - missing DISCORD_TOKEN');
    console.log('🌐 Web server will run for health checks only');
}

// Start the web server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Keep-alive server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
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
