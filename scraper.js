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

    let videoUrl = null;

    console.log("🌐 Intercepting network requests for video...");
    page.on("response", async (response) => {
        const responseUrl = response.url();
        if (responseUrl.includes(".mp4")) {
            console.log(`🎥 Found video URL: ${responseUrl}`);
            videoUrl = responseUrl;
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

    if (!videoUrl) {
        console.log("⚠️ No video URL found. Extracting poster image as fallback...");
        try {
            videoUrl = await page.$eval("video[poster]", (video) => video.getAttribute("poster"));
            if (videoUrl) {
                console.log("🖼️ Poster image found:", videoUrl);
            }
        } catch (error) {
            console.error("❌ Error extracting poster image:", error.message);
        }
    }

    await browser.close();

    if (videoUrl) {
        console.log("✅ Media successfully extracted:", videoUrl);
        return videoUrl;
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

    console.log("\n📥 Media URL:");
    if (media) {
        console.log(`🎥 ${media}`);
    } else {
        console.log("⚠️ No media found.");
    }
})();
