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
        process.exit(1);
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
        if (mediaLinks.length > 0) {
            console.log("Media links found:", mediaLinks);
        
            // Check if the first media link is a previewable type
            const previewableMedia = mediaLinks.filter(link =>
                link.endsWith(".mp4") || link.endsWith(".jpg") || link.endsWith(".png")
            );
        
            if (previewableMedia.length > 0) {
                await interaction.editReply({
                    content: "✅ Media found! Previewable content below:",
                    embeds: previewableMedia.map((link, i) => ({
                        title: `Media ${i + 1}`,
                        url: link,
                        description: "Click to view in browser.",
                        image: { url: link }, // For image previews
                        video: { url: link }, // Discord auto-detects video embeds if supported
                        footer: { text: "Twitter Media Preview" },
                    })),
                });
            } else {
                await interaction.editReply({
                    content: "✅ Media found! Here are the links:",
                    embeds: mediaLinks.map((link, i) => ({
                        title: `Media ${i + 1}`,
                        url: link,
                        description: "Click to view in browser.",
                        footer: { text: "Twitter Media Links" },
                    })),
                });
            }
        } else {
            console.log("No media found for the provided Tweet ID.");
            await interaction.editReply(
                "❌ No media found in the provided Twitter link."
            );
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

// Debug: Log when bot.js finishes loading
console.log("✅ bot.js loaded successfully.");
