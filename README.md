# Twitter/X Media Downloader Discord Bot

A Discord bot that downloads media (images, videos, GIFs) from Twitter/X posts using both Twitter API and Puppeteer scraping as fallback.

## 🌟 Features

- **Download Twitter Media**: Extract images, videos, and GIFs from Twitter/X posts
- **Dual Method Approach**: Uses Twitter API primarily, falls back to web scraping when rate limited
- **Smart GIF Detection**: Properly identifies and labels animated GIFs vs regular videos
- **Rate Limit Handling**: Automatic token rotation and exponential backoff
- **User-Friendly Error Messages**: Clear explanations for different error scenarios
- **Keep-Alive Server**: Web server to prevent hosting platform sleep

## 🔧 How It Works

### Primary Method: Twitter API
1. User provides a Twitter/X URL using `/twtmedia` command
2. Bot extracts tweet ID from URL
3. Makes API request to Twitter v2 API with bearer token
4. Processes media attachments and downloads highest quality versions
5. Returns media files to Discord with proper labeling

### Fallback Method: Web Scraping
1. When API rate limits are hit, automatically switches to Puppeteer
2. Scrapes the Twitter page directly using headless Chrome
3. Intercepts network requests to capture media URLs
4. Processes and returns media files

### Rate Limiting Protection
- **Token Rotation**: Cycles through multiple Twitter API keys
- **Request Queue**: Prevents simultaneous API calls
- **Exponential Backoff**: Increases wait time between retries
- **Automatic Fallback**: Switches to scraping when all tokens exhausted

## 🚀 Setup Instructions

### Prerequisites
- Node.js 20.x
- Discord Developer Account
- Twitter Developer Account (for API keys)
- Hosting Platform Account (Render, Railway, etc.)

### Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name your bot
3. Go to "Bot" section
4. Click "Add Bot"
5. Copy the **Bot Token** (keep this secret!)
6. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent (optional)

### Step 2: Get Twitter API Keys

1. Apply for [Twitter Developer Account](https://developer.twitter.com)
2. Create a new "App" in the developer portal
3. Go to "Keys and Tokens"
4. Copy the **Bearer Token** (this is your API key)
5. **Optional**: Create multiple Twitter accounts for additional API keys

### Step 3: Invite Bot to Discord Server

1. In Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select permissions:
   - Send Messages
   - Use Slash Commands
   - Attach Files
   - Read Message History
4. Copy generated URL and visit it to invite bot

### Step 4: Set Up Local Development

```bash
# Clone or download the project
cd "Discord Bots/Media Downloader"

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your tokens
DISCORD_TOKEN=your_discord_bot_token_here
TWITTER_API_KEY_1=your_twitter_bearer_token_here
TWITTER_API_KEY_2=your_second_twitter_token_here
PORT=3000
```

### Step 5: Test Locally

```bash
# Run the bot
npm start

# Test the slash command in Discord
/twtmedia url:https://twitter.com/username/status/1234567890
```

## 🌐 Deployment to Render

### Step 1: Prepare for Deployment

1. Make sure all files are in your project directory
2. Initialize git repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

3. Push to GitHub:
```bash
git remote add origin https://github.com/yourusername/twitter-media-bot.git
git push -u origin main
```

### Step 2: Deploy to Render

1. Go to [Render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `twitter-media-downloader`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free tier

### Step 3: Set Environment Variables

In Render dashboard, go to "Environment" and add:

```
DISCORD_TOKEN=MTMyODE2MzkzOTcyNDU2MjUyMw.GPNNq6.your_token_here
TWITTER_API_KEY_1=AAAAAAAAAAAAAAAAAAAAAEF2yAEAAAAA...your_bearer_token_here
TWITTER_API_KEY_2=AAAAAAAAAAAAAAAAAAAAAK6KyAEAAAAA...your_second_token_here
NODE_ENV=production
```

### Step 4: Deploy and Test

1. Click "Deploy" in Render dashboard
2. Wait for deployment to complete
3. Check logs for any errors
4. Test bot in Discord server

## 📁 Project Structure

```
Media Downloader/
├── bot.js              # Main Discord bot logic
├── server.js           # Express server for keep-alive
├── scraper.js          # Puppeteer web scraping fallback
├── package.json        # Node.js dependencies
├── Procfile           # Deployment configuration
├── .env               # Environment variables (local)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ Yes |
| `TWITTER_API_KEY_1` | Primary Twitter Bearer Token | ✅ Yes |
| `TWITTER_API_KEY_2` | Secondary Twitter Bearer Token | ⚠️ Recommended |
| `TWITTER_API_KEY_3` | Additional Twitter Bearer Token | ❌ Optional |
| `TWITTER_API_KEY_4` | Additional Twitter Bearer Token | ❌ Optional |
| `TWITTER_API_KEY_5` | Additional Twitter Bearer Token | ❌ Optional |
| `PORT` | Server port (auto-set by hosting) | ❌ Optional |
| `NODE_ENV` | Environment mode | ❌ Optional |

## 🛠️ Troubleshooting

### Bot Not Responding
1. Check if `DISCORD_TOKEN` is correctly set
2. Verify bot has proper permissions in Discord server
3. Check Render logs for errors

### "No Media Found" Errors
1. Usually indicates Twitter API rate limiting
2. Add more `TWITTER_API_KEY_X` environment variables
3. Wait 15-30 minutes for rate limits to reset

### Deployment Failures
1. Ensure `package.json` has correct start script
2. Check all environment variables are set
3. Verify Node.js version compatibility (20.x)

### Scraper Timeouts
1. Normal for some tweets - scraping can be slow
2. Check if tweet URL is accessible publicly
3. Some tweets may be protected or deleted

## 📊 Usage Analytics

The bot handles:
- ✅ Public tweets with images
- ✅ Public tweets with videos
- ✅ Public tweets with GIFs
- ✅ Multiple media per tweet
- ❌ Private account tweets
- ❌ Deleted tweets
- ❌ Text-only tweets

## 🔄 Maintenance

### Adding More API Keys
1. Create additional Twitter Developer accounts
2. Add new bearer tokens as `TWITTER_API_KEY_X` environment variables
3. Redeploy the service

### Updating Dependencies
```bash
npm update
npm audit fix
git commit -am "Update dependencies"
git push
```

### Monitoring
- Check Render dashboard for uptime
- Monitor bot response times in Discord
- Review error logs periodically

## 📝 Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/twtmedia` | Download media from Twitter/X post | `/twtmedia url:https://twitter.com/user/status/123` |

## ⚡ Performance Tips

1. **Multiple API Keys**: Add 3-5 Twitter API keys for better rate limit handling
2. **Free Tier Limits**: Render free tier has 750 hours/month
3. **Cold Starts**: First request may be slow due to service wake-up
4. **Large Media**: Videos >8MB may fail due to Discord limits

## 🆘 Support

If you encounter issues:
1. Check this README for common solutions
2. Review Render deployment logs
3. Verify all environment variables are correctly set
4. Test locally first before deploying

## 🔒 Security Notes

- Never commit `.env` files to git
- Keep Discord and Twitter tokens secure
- Use environment variables for all sensitive data
- Regularly rotate API keys if compromised

---

Built with ❤️ using Node.js, Discord.js, and Puppeteer
