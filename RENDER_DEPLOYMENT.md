# Twitter Media Downloader Bot - Render Deployment Guide

## Current vs. New Deployment Strategy

### Previous Strategy (Heroku)
- **Platform**: Heroku with Replit backup
- **Architecture**: Dual process (web + worker)
- **Issues**: 
  - Missing server.js file
  - No keep-alive mechanism
  - Bot would terminate without web server

### New Strategy (Render)
- **Platform**: Render.com
- **Architecture**: Single web service that includes bot
- **Improvements**:
  - Built-in keep-alive server
  - Health check endpoints
  - Better error handling
  - Automated deployments

## Files Added/Modified

### 1. `server.js` (NEW)
- Express server for keep-alive functionality
- Health check endpoints (`/`, `/health`, `/ping`)
- Imports and starts the Discord bot
- Similar to Flask server in Python bot example

### 2. `bot.js` (MODIFIED)
- Fixed media extraction logic
- Added slash command registration
- Improved error handling
- Added graceful shutdown handlers

### 3. `render.yaml` (NEW)
- Render deployment configuration
- Environment variable definitions
- Health check configuration

### 4. `Procfile` (MODIFIED)
- Simplified to single web process
- Now points to server.js instead of separate worker

## Deployment Steps for Render

### 1. Set up Render Account
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Connect your repository

### 2. Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `twitter-media-downloader`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for better performance)

### 3. Environment Variables
Add these in Render dashboard under "Environment":

```
DISCORD_TOKEN=MTMyODE2MzkzOTcyNDU2MjUyMw.GPNNq6.daWRXJ5PcdU6u9a_iuC5tnElLBqajiUDka63wU
TWITTER_API_KEY_1=AAAAAAAAAAAAAAAAAAAAAEF2yAEAAAAAlldMSSKYSmommTevFLKr6xWQyKc%3DvUEkOTW0t0V5VaFTgygnuHhnBX315kToEREIwy6yJyeTzzmc5y
TWITTER_API_KEY_2=AAAAAAAAAAAAAAAAAAAAAK6KyAEAAAAAOaLznd2LDnoHS9Vd1MEYhBeints%3DOGcUyhzsoRwI3ZCS45M584YPaIuX5IFAxBZxQFOVXoUJlYOgcT
NODE_ENV=production
```

### 4. Health Check Configuration
- **Health Check Path**: `/health`
- **Auto-Deploy**: Enabled

## Key Improvements Made

### 1. Error Handling (Similar to Python Bot)
```javascript
// Global error handlers
process.on('unhandledRejection', ...)
process.on('uncaughtException', ...)

// Graceful shutdown
process.on('SIGINT', ...)
process.on('SIGTERM', ...)
```

### 2. Keep-Alive Server (Like Flask in Python Bot)
```javascript
// Express server with health endpoints
app.get('/health', ...)  // Health checks
app.get('/ping', ...)    // Ping endpoint
```

### 3. Fixed Media Extraction
- Properly extracts media URLs from Twitter API response
- Handles both photos and videos
- Gets highest quality video variants

### 4. Slash Command Registration
- Automatically registers `/twtmedia` command on bot startup
- Handles registration errors gracefully

## Testing the Deployment

1. **Health Check**: Visit `https://your-app.onrender.com/health`
2. **Bot Status**: Check logs in Render dashboard
3. **Discord Commands**: Test `/twtmedia` command in Discord

## Migration Benefits

1. **Cost**: Render free tier vs Heroku paid plans
2. **Reliability**: Built-in health checks and auto-restart
3. **Simplicity**: Single service vs dual process
4. **Monitoring**: Better logging and monitoring tools
5. **Performance**: Faster cold starts compared to Heroku

## Troubleshooting

### Common Issues:
1. **Bot not responding**: Check environment variables are set correctly
2. **Health check failing**: Ensure Express server is running on correct port
3. **Slash commands not working**: Verify bot has proper Discord permissions

### Logs to Check:
- Bot login status
- Slash command registration
- Twitter API responses
- Express server startup

## Next Steps

1. Deploy to Render using above steps
2. Test thoroughly with various Twitter URLs
3. Monitor logs for any issues
4. Consider upgrading to paid plan for better performance if needed
