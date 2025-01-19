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
const { fetchInstagramMedia } = require("./ig_fetcher.js"); // Import Instagram Fetcher

// Initialize the bot client
console.log("⚙️ Initializing the bot client...");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Load API tokens
const discordToken = process.env.DISCORD_TOKEN;
const twitterBearerTokens = [
    process.env.TWITTER_API_KEY_1,
    process.env.TWITTER_API_KEY_2,
];
const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

if (!discordToken || twitterBearerTokens.some(token => !token) || !instagramAccessToken) {
    console.error("❌ Missing tokens. Ensure .env contains DISCORD_TOKEN, TWITTER_API_KEY(s), and INSTAGRAM_ACCESS_TOKEN.");
    process.exit(1);
}

console.log("🔐 Tokens loaded successfully.");

// Rotate Twitter bearer tokens
let currentTokenIndex = 0;
function getBearerToken() {
    const token = twitterBearerTokens[currentTokenIndex];
    currentTokenIndex = (currentTokenIndex + 1) % twitterBearerTokens.length;
    return token;
}

// Log in to Discord
console.log("🔄 Attempting to log in...");
client.login(discordToken)
    .then(() => console.log("🔐 Bot successfully logged in!"))
    .catch(error => {
        console.error(`❌ Failed to log in: ${error.message}`);
        process.exit(1);
    });

// Function to extract Tweet ID
function extractTweetId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/);
    return match ? match[1] : null;
}

// Function to fetch Twitter media
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
            headers: { Authorization: `Bearer ${token}` },
            params,
        });

        console.log("Full Twitter API response:", JSON.stringify(response.data, null, 2));

        const media = response.data.includes?.media;
        if (media?.length > 0) {
            return media.map(m => m.url || m.preview_image_url).filter(Boolean);
        } else {
            console.log("No media found for the provided Tweet ID.");
            return [];
        }
    } catch (error) {
        console.error("Error fetching Twitter media:", error.response?.data || error.message);
        return [];
    }
}

// Handle Discord Commands
client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "twtmedia") {
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
    }

    // Instagram Media Fetching
    if (interaction.commandName === "instamedia") {
        const instagramUrl = interaction.options.getString("url");

        try {
            await interaction.deferReply();
            const mediaData = await fetchInstagramMedia(instagramUrl);

            if (mediaData.error) {
                await interaction.editReply(`❌ ${mediaData.error}`);
                return;
            }

            const embed = {
                title: "Instagram Media",
                url: mediaData.permalink,
                image: { url: mediaData.thumbnailUrl },
                footer: { text: "Instagram Media Fetched via API" },
            };

            await interaction.editReply({
                content: "✅ Instagram media found:",
                embeds: [embed],
                files: mediaData.mediaType === "VIDEO" ? [mediaData.mediaUrl] : [],
            });

        } catch (error) {
            console.error("Error processing Instagram interaction:", error.message);
            await interaction.editReply("❌ An error occurred while fetching Instagram media.");
        }
    }
});

// Register Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName("twtmedia")
        .setDescription("Fetch media from a Twitter post")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("Twitter post URL")
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName("instamedia")
        .setDescription("Fetch media from an Instagram post or reel")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("Instagram post/reel URL")
                .setRequired(true)
        ),
];

const rest = new REST({ version: "10" }).setToken(discordToken);
(async () => {
    try {
        console.log("🚀 Registering slash commands...");
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log("✅ Slash commands registered successfully.");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
})();
