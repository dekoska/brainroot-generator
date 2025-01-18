const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: ["https://brainroot-generator.vercel.app"], 
    methods: ["GET", "POST"], 
    credentials: true, 
}));

const clientKey = "sbaw7f3n8zn9n1qtdp";
const clientSecret = "AdNVRPR3gpR2C7JBGX7GMm5MpkeyMjQv";
const redirectUri = "https://brainroot-generator.vercel.app/frontend/main";

app.post("/api/token", async (req, res) => {
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

            console.log("Access Token zapisany w ciasteczku:", accessToken);
            res.json({ message: "Access token retrieved successfully", accessToken });
        } else {
            console.error("Failed to retrieve access token:", response.data);
            res.status(500).send("Failed to retrieve access token");
        }
    } catch (error) {
        console.error("Error exchanging code for token:", {
            data: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers,
            message: error.message,
        });
        res.status(500).json({
            message: "Failed to exchange code for token",
            error: error.response?.data || error.message,
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});


// lsof -i :8080