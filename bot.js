// Load dependencies and environment variables
console.log("🛠 Loading dependencies and environment variables...");
require("dotenv").config();
console.log(
    "🔐 Tokens from .env:",
    process.env.DISCORD_TOKEN && process.env.TWITTER_API_KEY
        ? "Loaded successfully"
        : "Failed to load",
);

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
const twitterBearerToken = process.env.TWITTER_API_KEY;

// Log token status for debugging
if (!discordToken || !twitterBearerToken) {
    console.error(
        "❌ Missing tokens. Please ensure the .env file contains DISCORD_TOKEN and TWITTER_API_KEY.",
    );
    process.exit(1);
} else {
    console.log("🔐 Tokens loaded successfully.");
}

// Add a timeout to detect if login hangs
let loginTimeout = setTimeout(() => {
    console.error(
        "❌ Login timed out after 10 seconds. Check your token and internet connection.",
    );
    process.exit(1);
}, 10000);

// Debug: Indicate the bot is attempting to log in
console.log("🔄 Attempting to log in...");
client
    .login(discordToken)
    .then(() => {
        clearTimeout(loginTimeout);
        console.log("🔐 Bot successfully logged in!");
    })
    .catch((error) => {
        clearTimeout(loginTimeout);
        console.error(`❌ Failed to log in: ${error.message}`);
        process.exit(1);
    });

// Bot event: Ready
client.once("ready", async () => {
    console.log(`✅ Bot is online and logged in as ${client.user.tag}!`);

    const rest = new REST({ version: "10" }).setToken(discordToken);

    try {
        // Remove all old commands
        console.log("🔄 Removing all existing commands...");
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: [],
        });
        console.log("✅ All old commands removed successfully!");

        // Register the new /twtmedia command
        console.log("🔄 Registering /twtmedia command...");
        const commands = [
            new SlashCommandBuilder()
                .setName("twtmedia")
                .setDescription("Fetch and return media from a Twitter link")
                .addStringOption((option) =>
                    option
                        .setName("url")
                        .setDescription("The Twitter link")
                        .setRequired(true),
                )
                .toJSON(),
        ];
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands,
        });
        console.log("✅ /twtmedia command registered successfully!");
    } catch (error) {
        console.error("❌ Error during command registration process:", error);
    }
});

// Function to extract tweet ID from URL
function extractTweetId(url) {
    const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/,
    );
    return match ? match[1] : null;
}

// Function to fetch media from Twitter API
let isRateLimited = false;
let rateLimitResetTime = null;

async function fetchTwitterMedia(tweetId) {
    const apiUrl = `https://api.twitter.com/2/tweets/${tweetId}`;
    const params = {
        expansions: "attachments.media_keys",
        "media.fields": "media_key,type,url,preview_image_url,variants",
    };

    try {
        console.log("Requesting media from Twitter...");
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${twitterBearerToken}`,
            },
            params,
        });

        console.log("Full Twitter API response:", JSON.stringify(response.data, null, 2));

        const attachments = response.data.data.attachments;
        console.log("Tweet Attachments:", attachments);

        const media = response.data.includes?.media;
        if (!media || media.length === 0) {
            console.log("No media found in the API response.");
            return [];
        }

        const mediaLinks = [];
        for (const item of media) {
            if (item.type === "video" || item.type === "animated_gif") {
                const bestVariant = item.variants
                    .filter((v) => v.content_type === "video/mp4")
                    .reduce((prev, curr) =>
                        prev.bit_rate > curr.bit_rate ? prev : curr
                    );
                mediaLinks.push(bestVariant.url);
            } else if (item.type === "photo") {
                mediaLinks.push(item.url);
            }
        }

        console.log("Extracted media links:", mediaLinks);
        return mediaLinks;
    } catch (error) {
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers["retry-after"];
            console.error(`Rate limited. Retry after ${retryAfter} seconds.`);
            return { rateLimited: true };
        } else {
            console.error(
                "Error fetching media from Twitter API:",
                error.response?.data || error.message
            );
            return [];
        }
    }
}

// Bot event: Interaction Create
client.on("interactionCreate", async (interaction) => {
    console.log("Received interaction:", interaction.commandName);

    if (!interaction.isCommand()) {
        console.log("Interaction is not a command. Ignoring.");
        return;
    }

    if (interaction.commandName === "twtmedia") {
        console.log("Processing /twtmedia command...");

        const twitterUrl = interaction.options.getString("url");
        console.log("Twitter URL provided:", twitterUrl);

        const tweetId = extractTweetId(twitterUrl);
        if (!tweetId) {
            console.log("Invalid Twitter link provided.");
            try {
                await interaction.reply(
                    "❌ Please provide a valid Twitter link.",
                );
            } catch (error) {
                console.error("Failed to reply:", error.message);
            }
            return;
        }

        console.log(`Extracted Tweet ID: ${tweetId}`);

        // Acknowledge the interaction immediately
        try {
            await interaction.deferReply();
        } catch (error) {
            console.error("Failed to defer reply:", error.message);
            return; // Exit if defer fails to avoid further interaction errors
        }

        // Process the Twitter media fetch
        try {
            const mediaLinks = await fetchTwitterMedia(tweetId);

            if (mediaLinks?.rateLimited) {
                console.log("Bot is rate-limited by Twitter API.");
                await interaction.editReply(
                    "❌ The bot is currently rate-limited by Twitter. Please try again later.",
                );
                return;
            }

            if (mediaLinks.length > 0) {
                console.log("Media links found:", mediaLinks);
                await interaction.editReply({
                    content: "✅ Media found! Here are the links:",
                    files: mediaLinks.map((link, i) => ({
                        attachment: link,
                        name: `media_${i + 1}.${link.split(".").pop()}`,
                    })),
                });
            } else {
                console.log("No media found for the provided Tweet ID.");
                await interaction.editReply(
                    "❌ No media found in the provided Twitter link.",
                );
            }
        } catch (error) {
            console.error("Error processing the command:", error.message);
            try {
                await interaction.editReply(
                    "❌ An error occurred while processing your request. Please try again later.",
                );
            } catch (editError) {
                console.error("Failed to edit reply:", editError.message);
            }
        }
    }
});

// Error logging for unexpected issues
client.on("error", (error) => {
    console.error(`❌ Client error occurred: ${error.message}`);
});

// Event: Warn for potential issues
client.on("warn", (warning) => {
    console.warn(`⚠️ Warning: ${warning}`);
});

// Debug: Log when bot.js finishes loading
console.log("✅ bot.js loaded successfully.");
