const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeTweetMedia(url) {
    console.log("🔄 Starting Puppeteer...");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log("🌐 Setting User-Agent...");
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("🌐 Setting cookies...");
    await page.setCookie(
        { name: "auth_token", value: "5924b870707ccd6f72c8de66e30dcef1e1e16085", domain: ".x.com" },
        { name: "ct0", value: "efea7db3d4f5e69c2a392fd97f0b74641c41be60f73de80e8c7e7e0a5e976f5d", domain: ".x.com" },
        { name: "guest_id", value: "v1%3A171365776174285259", domain: ".x.com" },
        { name: "personalization_id", value: "v1_38nObcK0JzrPV2CfGnV2pQ==", domain: ".x.com" },
        { name: "twid", value: "u%3D901149341334683648", domain: ".x.com" }
    );

    console.log("🌐 Enabling JavaScript...");
    await page.setJavaScriptEnabled(true);

    console.log(`🌐 Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2" });

    console.log("✅ Successfully loaded the page.");

    console.log("📄 Saving HTML content for debugging...");
    const pageContent = await page.content();
    fs.writeFileSync("debug_page.html", pageContent);
    console.log("📄 Full page content saved to debug_page.html.");

    let mediaUrls = [];
    let isGif = false;

    console.log("🌐 Intercepting network requests for media...");
    page.on("response", async (response) => {
        const responseUrl = response.url();
        
        // Check for video/GIF content
        if (responseUrl.includes(".mp4") || responseUrl.includes("video_formats")) {
            console.log(`🎥 Found video/animation URL: ${responseUrl}`);
            
            // Try to determine if this is a GIF by checking the tweet content
            try {
                const tweetText = await page.$eval('[data-testid="tweetText"]', el => el.textContent.toLowerCase());
                isGif = tweetText.includes('gif') || responseUrl.includes('tweet_video');
            } catch (e) {
                // If we can't get tweet text, check URL patterns
                isGif = responseUrl.includes('tweet_video') || responseUrl.includes('amplify_video');
            }
            
            mediaUrls.push({
                url: responseUrl,
                type: isGif ? 'gif' : 'video'
            });
        }
        
        // Check for image content
        if (responseUrl.includes(".jpg") || responseUrl.includes(".png") || responseUrl.includes("media")) {
            console.log(`🖼️ Found image URL: ${responseUrl}`);
            mediaUrls.push({
                url: responseUrl,
                type: 'image'
            });
        }
    });

    console.log("🔍 Waiting for video component to load...");
    try {
        await page.waitForSelector('div[data-testid="videoComponent"]', { timeout: 10000 });
        console.log("✅ Video component found.");
    } catch (error) {
        console.error("❌ Video component not found. Continuing...");
    }

    console.log("⏳ Waiting a few seconds to capture all requests...");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Replaced page.waitForTimeout()

    if (mediaUrls.length === 0) {
        console.log("⚠️ No media URLs found. Extracting poster image as fallback...");
        try {
            const posterUrl = await page.$eval("video[poster]", (video) => video.getAttribute("poster"));
            if (posterUrl) {
                console.log("🖼️ Poster image found:", posterUrl);
                mediaUrls.push({ url: posterUrl, type: 'image' });
            }
        } catch (error) {
            console.error("❌ Error extracting poster image:", error.message);
        }
    }

    await browser.close();

    if (mediaUrls.length > 0) {
        console.log("✅ Media successfully extracted:");
        mediaUrls.forEach((media, index) => {
            const mediaType = media.type === 'gif' ? '🎭 GIF' : 
                             media.type === 'video' ? '🎬 Video' : '🖼️ Image';
            console.log(`${mediaType} ${index + 1}: ${media.url}`);
        });
        return mediaUrls;
    }

    console.log("⚠️ No media found.");
    return null;
}

// Main function
(async () => {
    const twitterUrl = process.argv[2];
    if (!twitterUrl) {
        console.error("❌ Please provide a Twitter URL as an argument.");
        process.exit(1);
    }

    console.log(`🔗 Provided Twitter URL: ${twitterUrl}`);
    const media = await scrapeTweetMedia(twitterUrl);

    console.log("\n📥 Media URLs:");
    if (media && media.length > 0) {
        media.forEach((item, index) => {
            const mediaType = item.type === 'gif' ? '🎭 GIF' : 
                             item.type === 'video' ? '🎬 Video' : '🖼️ Image';
            console.log(`${mediaType} ${index + 1}: ${item.url}`);
        });
    } else {
        console.log("⚠️ No media found.");
    }
})();
