const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
    const { accessToken, postInfo, sourceInfo } = req.body;

    if (!accessToken || !postInfo || !sourceInfo) {
        return res.status(400).json({ error: "Brak wymaganych danych" });
    }

    try {
        const response = await axios.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            {
                post_info: postInfo,
                source_info: sourceInfo,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                },
            }
        );
        
        console.log("Pełna odpowiedź TikTok API z backendu:", response.data);

        if (!response.data || Object.keys(response.data).length === 0) {
            throw new Error("Odpowiedź API TikTok jest pusta lub nie zawiera wymaganych danych.");
        }

        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data || "Nieznany błąd" });
    }
});

module.exports = router;
