import { getAccessToken } from './js/auth.js';
import { queryCreatorInfo } from './js/creator-info.js';
import { initVideoUpload } from './js/content-video-upload.js';

let accessToken = null;

// Pobranie tokenu dostępu i konfiguracja aplikacji
getAccessToken().then(token => {
    if (token) {
        accessToken = token;
        console.log("Użytkownik zalogowany. Token:", accessToken);

        // Pobranie informacji o twórcy
        queryCreatorInfo(accessToken);

        // Obsługa formularza przesyłania wideo
        setupFormHandlers();
    } else {
        console.error("Nie udało się pobrać tokenu. Przekierowanie na stronę logowania.");
        window.location.href = '/frontend/login'; // Przekierowanie na stronę logowania
    }
});

// Funkcja do obsługi formularza przesyłania wideo
function setupFormHandlers() {
    const form = document.getElementById('upload-form');

    form.addEventListener('click', async (event) => {
        const action = event.target.dataset.action; // Pobiera `data-action` z przycisku
        const videoInput = document.getElementById('video');
        const file = videoInput.files[0];

        if (!file) {
            alert('Proszę wybrać plik wideo.');
            return;
        }

        if (action === 'content-creator') {
            // Obsługa Content Creator API
            console.log('Uruchamianie Content Creator API...');
            const postInfo = {
                title: "Mój filmik na TikTok",
                privacy_level: "SELF_ONLY",
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
                video_cover_timestamp_ms: 1000,
            };
            const sourceInfo = {
                source: "FILE_UPLOAD",
                video_size: file.size,
                chunk_size: file.size,
                total_chunk_count: 1,
            };

            try {
                await initVideoUpload(accessToken, postInfo, sourceInfo);
                alert("Wideo zostało przesłane przez Content Creator API!");
            } catch (error) {
                console.error('Błąd podczas przesyłania wideo przez Content Creator API:', error);
                alert("Nie udało się przesłać wideo.");
            }
        }

        if (action === 'share-kit') {
            // Obsługa Share Kit
            console.log('Uruchamianie Share Kit...');
            const videoPath = 'uploads/test.mp4'; // Ścieżka w Supabase - zastąp dynamicznie generowaną wartością
            const title = "Mój filmik na TikTok";

            try {
                const response = await fetch('/api/share-kit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoPath, title }),
                });

                if (!response.ok) {
                    const errorDetails = await response.json();
                    throw new Error(`Błąd Share Kit: ${errorDetails.message}`);
                }

                const result = await response.json();
                alert(`Wideo zostało udostępnione! Link: ${result.share_url}`);
            } catch (error) {
                console.error('Błąd podczas udostępniania wideo przez Share Kit:', error);
                alert('Nie udało się udostępnić wideo.');
            }
        }
    });
}
