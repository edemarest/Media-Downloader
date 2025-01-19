const express = require("express");
const bodyParser = require("body-parser");

console.log("🛠 Starting webhook server...");

const app = express();
app.use(bodyParser.json());

// Load environment variables
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

if (!VERIFY_TOKEN) {
    console.error("❌ ERROR: INSTAGRAM_VERIFY_TOKEN is not set. Exiting...");
    process.exit(1); // Exit if no verify token is set
}

console.log(`🔐 Using Verify Token: ${VERIFY_TOKEN}`);
console.log(`🚀 Server will attempt to start on PORT: ${PORT}`);

// Handle Instagram Webhook Verification
app.get("/webhook", (req, res) => {
    console.log("📩 Received GET request for webhook verification.");

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log(`📡 mode: ${mode}, token: ${token}, challenge: ${challenge}`);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook Verified Successfully!");
        res.status(200).send(challenge);
    } else {
        console.error("❌ Webhook Verification Failed! Invalid token.");
        res.status(403).send("Verification failed.");
    }
});

// Handle Unexpected Errors
process.on("uncaughtException", (err) => {
    console.error("🔥 Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});

// Ensure the Server Binds to PORT
try {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`✅ Webhook server running on port ${PORT}`);
    });
} catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
}
