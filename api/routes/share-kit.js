require('dotenv').config({ path: './config.env' });
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Konfiguracja Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/', async (req, res) => {
    const { videoPath, title } = req.body;

    // Pobierz token dostępu z ciasteczka
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        return res.status(401).json({ message: 'Brak tokena dostępu. Użytkownik musi się zalogować.' });
    }

    if (!videoPath || !title) {
        return res.status(400).json({ message: 'Ścieżka do wideo i tytuł są wymagane.' });
    }

    try {
        // Pobierz plik z Supabase
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('uploads')
            .download(videoPath);

        if (downloadError) {
            console.error('Błąd pobierania pliku z Supabase:', downloadError.message);
            return res.status(500).json({ message: 'Nie udało się pobrać pliku z Supabase.' });
        }

        // Przeczytaj plik jako Base64
        const videoBase64 = await fileData.arrayBuffer().then(buffer => Buffer.from(buffer).toString('base64'));

        // Wyślij wideo do TikTok API
        const response = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/', {
            post_info: {
                title: title,
                privacy_level: 'PUBLIC',
            },
            source_info: {
                source: 'FILE_UPLOAD',
            },
            video: videoBase64,
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        res.status(200).json({ share_url: response.data.share_url });
    } catch (error) {
        console.error('Błąd Share Kit:', error.response?.data || error.message);
        res.status(500).json({ message: 'Nie udało się udostępnić wideo.' });
    }
});

module.exports = router;