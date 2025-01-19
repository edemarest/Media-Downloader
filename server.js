const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

// Step 1: Handle Instagram Webhook Verification
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Instagram Webhook Verified!");
        res.status(200).send(challenge);
    } else {
        console.log("❌ Verification failed.");
        res.status(403).send("Verification failed.");
    }
});

// Step 2: Handle Incoming Instagram Webhooks
app.post("/webhook", (req, res) => {
    console.log("📩 Received Instagram Webhook:", JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
