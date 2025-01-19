const axios = require("axios");

// Load Instagram API credentials from environment variables
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

async function fetchInstagramMedia(url) {
    const postIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([\w-]+)/);
    if (!postIdMatch) return { error: "Invalid Instagram URL format." };

    const postId = postIdMatch[1];

    try {
        const response = await axios.get(`https://graph.instagram.com/${postId}`, {
            params: {
                fields: "id,media_type,media_url,thumbnail_url,permalink",
                access_token: INSTAGRAM_ACCESS_TOKEN,
            },
        });

        console.log("📸 Instagram API Response:", JSON.stringify(response.data, null, 2));

        if (!response.data.media_url) {
            return { error: "No media found for this Instagram post." };
        }

        return {
            mediaType: response.data.media_type,
            mediaUrl: response.data.media_url,
            thumbnailUrl: response.data.thumbnail_url || response.data.media_url,
            permalink: response.data.permalink,
        };
    } catch (error) {
        console.error("❌ Error fetching Instagram media:", error.response?.data || error.message);
        return { error: "Failed to fetch media. Ensure the post is public and API permissions are set correctly." };
    }
}

module.exports = { fetchInstagramMedia };
