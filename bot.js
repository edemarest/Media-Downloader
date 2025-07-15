// Load dependencies and environment variables
console.log("Loading dependencies and environment variables...");
require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} = require("discord.js");
const axios = require("axios");

// Initialize the bot client
console.log("Initializing the bot client...");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Bot token from environment variables
const discordToken = process.env.DISCORD_TOKEN;
const twitterBearerTokens = [
    process.env.TWITTER_API_KEY_1,
    process.env.TWITTER_API_KEY_2,
].filter(Boolean); // Remove undefined tokens

// Validate required environment variables
if (!discordToken) {
    console.error("❌ ERROR: Missing DISCORD_TOKEN in environment variables.");
    console.error("💡 Please set DISCORD_TOKEN in your deployment platform:");
    console.error("   - For Render: Go to your service dashboard > Environment");
    console.error("   - Add: DISCORD_TOKEN = your_bot_token_here");
    process.exit(1);
}

// Validate Discord token format (basic check)
if (!discordToken.match(/^[A-Za-z0-9._-]+$/)) {
    console.error("❌ ERROR: DISCORD_TOKEN appears to be malformed.");
    console.error("💡 Discord tokens should contain only letters, numbers, dots, underscores, and hyphens.");
    process.exit(1);
}

if (twitterBearerTokens.length === 0) {
    console.warn("⚠️  WARNING: No valid Twitter API keys found in environment variables.");
    console.warn("⚠️  Twitter media fetching will not work without API keys.");
    console.warn("💡 Please set TWITTER_API_KEY_1 and TWITTER_API_KEY_2 in your environment variables.");
} else {
    console.log(`✅ Tokens loaded successfully. Using ${twitterBearerTokens.length} Twitter API key(s).`);
}

// Function to rotate bearer tokens
let currentTokenIndex = 0;
function getBearerToken() {
    const token = twitterBearerTokens[currentTokenIndex];
    currentTokenIndex = (currentTokenIndex + 1) % twitterBearerTokens.length;
    return token;
}

// Debug: Indicate the bot is attempting to log in
console.log("🔐 Attempting to log in to Discord...");
console.log(`🤖 Token length: ${discordToken.length} characters`);
console.log(`🔑 Token starts with: ${discordToken.substring(0, 10)}...`);

client.login(discordToken)
    .then(() => {
        console.log("✅ Bot successfully logged in to Discord!");
    })
    .catch(error => {
        console.error(`❌ ERROR: Failed to log in to Discord: ${error.message}`);
        
        if (error.message.includes('An invalid token was provided')) {
            console.error("💡 SOLUTION: Your Discord token is invalid. Please check:");
            console.error("   1. Copy the token from Discord Developer Portal");
            console.error("   2. Go to: https://discord.com/developers/applications");
            console.error("   3. Select your bot > Bot > Token");
            console.error("   4. Copy the token and update your environment variables");
            console.error("   5. Make sure there are no extra spaces or characters");
        }
        
        console.error("🔧 Environment variables status:");
        console.error(`   - DISCORD_TOKEN: ${discordToken ? 'Present' : 'Missing'} (${discordToken ? discordToken.length : 0} chars)`);
        console.error(`   - TWITTER_API_KEY_1: ${process.env.TWITTER_API_KEY_1 ? 'Present' : 'Missing'}`);
        console.error(`   - TWITTER_API_KEY_2: ${process.env.TWITTER_API_KEY_2 ? 'Present' : 'Missing'}`);
        
        process.exit(1);
    });

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('ERROR: Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SHUTDOWN: Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('SHUTDOWN: Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Function to extract tweet ID from URL
function extractTweetId(url) {
    const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/,
    );
    return match ? match[1] : null;
}

// Function to fetch media from Twitter API
async function fetchTwitterMedia(tweetId) {
    const apiUrl = `https://api.twitter.com/2/tweets/${tweetId}`;
    const params = {
        expansions: "attachments.media_keys",
        "media.fields": "media_key,type,url,preview_image_url,variants,duration_ms",
    };

    try {
        const token = getBearerToken();
        console.log(`Using bearer token: ${token}`);
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params,
        });

        console.log("Full Twitter API response:", JSON.stringify(response.data, null, 2));
        const media = response.data.includes?.media;
        
        // Extract media URLs
        const mediaLinks = [];
        if (media && media.length > 0) {
            media.forEach(item => {
                if (item.type === "photo") {
                    mediaLinks.push({
                        url: item.url,
                        type: "image",
                        filename: `image_${mediaLinks.length + 1}.jpg`
                    });
                } else if (item.type === "video" && item.variants) {
                    // Check if this is actually a GIF (no duration_ms or very short duration)
                    const isGif = !item.duration_ms || item.duration_ms < 15000; // Less than 15 seconds likely indicates GIF
                    
                    if (isGif) {
                        // For GIFs, try to find the MP4 variant but treat it as a GIF
                        const mp4Variant = item.variants
                            .filter(variant => variant.content_type === "video/mp4")
                            .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
                        
                        if (mp4Variant) {
                            mediaLinks.push({
                                url: mp4Variant.url,
                                type: "gif",
                                filename: `animation_${mediaLinks.length + 1}.gif`
                            });
                        }
                    } else {
                        // Regular video - get highest quality
                        const highestQuality = item.variants
                            .filter(variant => variant.content_type === "video/mp4")
                            .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
                        
                        if (highestQuality) {
                            mediaLinks.push({
                                url: highestQuality.url,
                                type: "video",
                                filename: `video_${mediaLinks.length + 1}.mp4`
                            });
                        }
                    }
                } else if (item.type === "animated_gif" && item.variants) {
                    // Handle animated GIFs specifically
                    const mp4Variant = item.variants
                        .filter(variant => variant.content_type === "video/mp4")
                        .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
                    
                    if (mp4Variant) {
                        mediaLinks.push({
                            url: mp4Variant.url,
                            type: "gif",
                            filename: `animation_${mediaLinks.length + 1}.gif`
                        });
                    }
                }
            });
        }
        
        console.log("Extracted media links:", mediaLinks);
        return mediaLinks;
    } catch (error) {
        if (error.response?.status === 429) {
            console.error("Rate limit reached. Switching bearer tokens.");
        } else {
            console.error("Error fetching media:", error.response?.data || error.message);
        }
        return [];
    }
}

// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('twtmedia')
        .setDescription('Download media from a Twitter/X post')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The Twitter/X post URL')
                .setRequired(true)),
];

// Bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(discordToken);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// Bot event: Interaction Create
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== "twtmedia") {
        return;
    }

    const twitterUrl = interaction.options.getString("url");
    const tweetId = extractTweetId(twitterUrl);

    if (!tweetId) {
        await interaction.reply("ERROR: Invalid Twitter link.");
        return;
    }

    try {
        await interaction.deferReply();
        const mediaLinks = await fetchTwitterMedia(tweetId);

        if (mediaLinks.length > 0) {
            const files = [];
            let contentMessage = "SUCCESS: Media found:\n";
            
            for (const media of mediaLinks) {
                files.push({
                    attachment: media.url,
                    name: media.filename
                });
                
                const mediaType = media.type === "gif" ? "🎭 GIF" : 
                                 media.type === "video" ? "🎬 Video" : "🖼️ Image";
                contentMessage += `${mediaType}: ${media.filename}\n`;
            }

            await interaction.editReply({
                content: contentMessage,
                files: files
            });
        } else {
            await interaction.editReply("ERROR: No media found in the provided Tweet.");
        }
    } catch (error) {
        console.error("Error processing interaction:", error.message);
        await interaction.editReply("ERROR: An error occurred while processing the request.");
    }
});

// Debug: Log when bot.js finishes loading
console.log("SUCCESS: bot.js loaded successfully.");
