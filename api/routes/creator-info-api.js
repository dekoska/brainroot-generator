const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: "Brak tokenu dostępowego" });
    }

    try {
        const response = await axios.post(
            "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
            {},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                },
            }
        );
        
        console.log("Odpowiedź TikTok API:", response.data);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.response?.data || "Nieznany błąd" });
    }
});

module.exports = router;
