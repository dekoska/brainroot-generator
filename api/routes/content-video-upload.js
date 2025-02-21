const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/", async (req, res) => {
    console.log("Odebrane dane:", req.body);
    const { accessToken, postInfo, sourceInfo } = req.body;

    if (!accessToken || !postInfo || !sourceInfo) {
        console.error("Brak wymaganych danych", req.body);
        return res.status(400).json({ error: "Brak wymaganych danych" });
    }

    try {
        console.log("Wysyłanie danych do TikToka:", { accessToken, postInfo, sourceInfo });

        const response = await axios.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            { post_info: postInfo, source_info: sourceInfo },
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
        console.error("Błąd API TikTok:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || "Nieznany błąd" });
    }
});


module.exports = router;
