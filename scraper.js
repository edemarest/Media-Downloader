const puppeteer = require("puppeteer");

async function scrapeTwitterMediaWithPuppeteer(twitterUrl) {
    console.log("🔄 Starting Puppeteer for media scraping...");

    // Puppeteer configuration
    const browser = await puppeteer.launch({
        headless: true, // Run in headless mode
        args: ["--no-sandbox", "--disable-setuid-sandbox"], // Necessary for some environments
    });

    const page = await browser.newPage();

    // Set cookies
    const cookies = [
        { name: "auth_token", value: "5924b870707ccd6f72c8de66e30dcef1e1e16085", domain: ".x.com" },
        { name: "ct0", value: "efea7db3d4f5e69c2a392fd97f0b74641c41be60f73de80e8c7e7e0a5e976f5d", domain: ".x.com" },
        { name: "guest_id", value: "v1%3A171365776174285259", domain: ".x.com" },
        { name: "personalization_id", value: "v1_38nObcK0JzrPV2CfGnV2pQ==", domain: ".x.com" },
        { name: "twid", value: "u%3D901149341334683648", domain: ".x.com" },
    ];
    await page.setCookie(...cookies);

    // Set user agent to mimic a real browser
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log(`🌐 Navigating to the Twitter page: ${twitterUrl}`);
    try {
        // Navigate to the page
        await page.goto(twitterUrl, { waitUntil: "networkidle2", timeout: 60000 });

        console.log("✅ Successfully loaded the page.");
        console.log("🔍 Extracting page content...");

        // Get the page content
        const htmlContent = await page.content();
        console.log("🔍 HTML Content Preview (First 500 characters):");
        console.log(htmlContent.slice(0, 500));

        // Scrape media links using page.evaluate()
        const mediaUrls = await page.evaluate(() => {
            const media = [];
            const videoTags = document.querySelectorAll('meta[property="og:video"]');
            const imageTags = document.querySelectorAll('meta[property="og:image"]');

            videoTags.forEach((tag) => {
                if (tag.content) media.push(tag.content);
            });

            imageTags.forEach((tag) => {
                if (tag.content) media.push(tag.content);
            });

            return media;
        });

        console.log("🔎 Media URLs Found:", mediaUrls);

        if (mediaUrls.length === 0) {
            console.log("❌ No media found on the provided Twitter page.");
        } else {
            console.log(`✅ Found ${mediaUrls.length} media item(s).`);
        }

        await browser.close();
        return mediaUrls;
    } catch (error) {
        console.error("❌ Error during Puppeteer scraping:", error.message);
        await browser.close();
        return [];
    }
}

// Main function
(async () => {
    const twitterUrl = process.argv[2];
    if (!twitterUrl) {
        console.error("❌ Please provide a Twitter URL as an argument.");
        process.exit(1);
    }
    console.log(`🔗 Provided Twitter URL: ${twitterUrl}`);
    const media = await scrapeTwitterMediaWithPuppeteer(twitterUrl);
    if (media.length > 0) {
        console.log("📥 Media URLs:");
        media.forEach((url, index) => {
            console.log(`${index + 1}. ${url}`);
        });
    } else {
        console.log("⚠️ No media found.");
    }
})();
