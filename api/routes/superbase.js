const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Konfiguracja multer do przechwytywania plików
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("video"), async (req, res) => {
    const { originalname, buffer } = req.file;

    try {
        const { data, error } = await supabase.storage
            .from("videos")
            .upload(`uploads/${originalname}`, buffer, {
                contentType: "video/mp4",
            });

        if (error) throw error;

        res.status(200).json({ message: "Plik przesłany pomyślnie", url: data.path });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
