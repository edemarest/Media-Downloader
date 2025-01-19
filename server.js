const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

// Handle Instagram Webhook Verification
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook Verified!");
        res.status(200).send(challenge); // MUST return challenge value
    } else {
        console.log("❌ Webhook verification failed.");
        res.status(403).send("Verification failed.");
    }
});

// Start server on the correct port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
