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

if (!discordToken) {
    console.error("ERROR: Missing DISCORD_TOKEN in environment variables.");
    process.exit(1);
}

if (twitterBearerTokens.length === 0) {
    console.error("ERROR: No valid Twitter API keys found in environment variables.");
    process.exit(1);
}

console.log(`Tokens loaded successfully. Using ${twitterBearerTokens.length} Twitter API key(s).`);

// Function to rotate bearer tokens
let currentTokenIndex = 0;
function getBearerToken() {
    const token = twitterBearerTokens[currentTokenIndex];
    currentTokenIndex = (currentTokenIndex + 1) % twitterBearerTokens.length;
    return token;
}

// Debug: Indicate the bot is attempting to log in
console.log("Attempting to log in...");
client.login(discordToken)
    .then(() => console.log("Bot successfully logged in!"))
    .catch(error => {
        console.error(`ERROR: Failed to log in: ${error.message}`);
        console.error("ERROR: Check if DISCORD_TOKEN is valid and has proper permissions");
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
        "media.fields": "media_key,type,url,preview_image_url,variants",
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
                    mediaLinks.push(item.url);
                } else if (item.type === "video" && item.variants) {
                    // Get highest quality video
                    const highestQuality = item.variants
                        .filter(variant => variant.content_type === "video/mp4")
                        .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];
                    if (highestQuality) {
                        mediaLinks.push(highestQuality.url);
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
            await interaction.editReply({
                content: "SUCCESS: Media found:",
                files: mediaLinks.map((url, i) => ({
                    attachment: url,
                    name: `media_${i + 1}.${url.split('.').pop()}`,
                })),
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
