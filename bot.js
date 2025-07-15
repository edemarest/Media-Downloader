// Load dependencies and environment variables
console.log("🛠 Loading dependencies and environment variables...");
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
console.log("⚙️ Initializing the bot client...");
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
];

if (!discordToken || twitterBearerTokens.some(token => !token)) {
    console.error("❌ Missing tokens. Ensure .env contains DISCORD_TOKEN and TWITTER_API_KEY(s).");
    process.exit(1);
}

console.log("🔐 Tokens loaded successfully.");

// Function to rotate bearer tokens
let currentTokenIndex = 0;
function getBearerToken() {
    const token = twitterBearerTokens[currentTokenIndex];
    currentTokenIndex = (currentTokenIndex + 1) % twitterBearerTokens.length;
    return token;
}

// Debug: Indicate the bot is attempting to log in
console.log("🔄 Attempting to log in...");
client.login(discordToken)
    .then(() => console.log("🔐 Bot successfully logged in!"))
    .catch(error => {
        console.error(`❌ Failed to log in: ${error.message}`);
        console.error("❌ Check if DISCORD_TOKEN is valid and has proper permissions");
        process.exit(1);
    });

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
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

// Bot event: Interaction Create
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== "twtmedia") {
        return;
    }

    const twitterUrl = interaction.options.getString("url");
    const tweetId = extractTweetId(twitterUrl);

    if (!tweetId) {
        await interaction.reply("❌ Invalid Twitter link.");
        return;
    }

    try {
        await interaction.deferReply();
        const mediaLinks = await fetchTwitterMedia(tweetId);

        if (mediaLinks.length > 0) {
            await interaction.editReply({
                content: "✅ Media found:",
                files: mediaLinks.map((url, i) => ({
                    attachment: url,
                    name: `media_${i + 1}.${url.split('.').pop()}`,
                })),
            });
        } else {
            await interaction.editReply("❌ No media found in the provided Tweet.");
        }
    } catch (error) {
        console.error("Error processing interaction:", error.message);
        await interaction.editReply("❌ An error occurred while processing the request.");
    }
});

// Bot event: Ready
client.on("ready", async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    
    // Register slash commands
    const commands = [
        new SlashCommandBuilder()
            .setName("twtmedia")
            .setDescription("Download media from Twitter/X posts")
            .addStringOption(option =>
                option.setName("url")
                    .setDescription("Twitter/X post URL")
                    .setRequired(true)
            )
    ];

    const rest = new REST({ version: "10" }).setToken(discordToken);
    
    try {
        console.log("🔄 Registering slash commands...");
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(command => command.toJSON()) }
        );
        console.log("✅ Slash commands registered successfully!");
    } catch (error) {
        console.error("❌ Failed to register slash commands:", error);
    }
});

// Debug: Log when bot.js finishes loading
console.log("✅ bot.js loaded successfully.");
