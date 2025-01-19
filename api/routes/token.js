const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");

const clientKey = process.env.CLIENT_KEY;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

router.post("/", async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Brak kodu autoryzacyjnego" });
    }

    try {
        const response = await axios.post("https://open.tiktokapis.com/v2/oauth/token/", qs.stringify({
            client_key: clientKey,
            client_secret: clientSecret,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
        }), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 8000,
        });

        const accessToken = response.data.access_token;
        if (accessToken) {
            res.cookie("access_token", accessToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 3600 * 1000,
            });
            res.json({ message: "Access token retrieved successfully", accessToken });
        } else {
            res.status(500).send("Failed to retrieve access token");
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to exchange code for token", error: error.message });
    }
});

module.exports = router;
