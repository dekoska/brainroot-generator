export function initVideoUpload(accessToken, postInfo, sourceInfo) {
    return fetch('/api/video/init', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, postInfo, sourceInfo }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Błąd HTTP! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Inicjacja przesyłania wideo zakończona sukcesem:", data);

        if (data.data?.upload_url) {
            // Wywołanie uniwersalnej funkcji uploadu z nową logiką
            uploadVideo("direct", data.data.upload_url);
        } else {
            throw new Error("Nie udało się uzyskać URL przesyłania.");
        }
    })
    .catch(error => {
        console.error("Błąd podczas inicjacji przesyłania wideo:", error);
    });
}


async function uploadVideo(destination, uploadUrl = null) {
    const fileInput = document.getElementById("video");
    const file = fileInput.files[0];

    if (!file) {
        console.error("Nie wybrano pliku wideo.");
        return;
    }

    if (destination === "supabase") {
        // Przesyłanie pliku do Supabase
        const formData = new FormData();
        formData.append("video", file);

        try {
            const response = await fetch("/api/video/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Błąd HTTP! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Plik przesłany do Supabase:", result.url);
        } catch (error) {
            console.error("Błąd podczas przesyłania do Supabase:", error);
        }
    } else if (destination === "direct" && uploadUrl) {
        // Przesyłanie pliku bezpośrednio przez URL
        try {
            const response = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    'Content-Type': 'video/mp4',
                    'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
                },
                body: file,
            });

            // if (!response.ok) {
            //     throw new Error(`Błąd HTTP! status: ${response.status}`);
            // }
            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Błąd HTTP! status: ${response.status}, szczegóły: ${errorDetails}`);
            }
            

            console.log("Przesyłanie wideo zakończone sukcesem.");
        } catch (error) {
            console.error("Błąd podczas przesyłania wideo:", error);
        }
    } else {
        console.error("Nieprawidłowy cel przesyłania lub brak URL.");
    }
}


export function setupUploadButton(accessToken) {
    document.getElementById("upload-form").addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!accessToken) {
            console.error("Brak tokenu dostępowego. Upewnij się, że token został poprawnie pobrany.");
            return;
        }

        const file = document.getElementById("video").files[0];

        if (!file) {
            console.error("Nie wybrano pliku wideo.");
            return;
        }

        const videoSize = file.size;

        const postInfo = {
            title: "Mój prywatny filmik na TikTok!",
            privacy_level: "SELF_ONLY",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
        };
        const sourceInfo = {
            source: "FILE_UPLOAD",
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1,
        };

        
        try {
            const initResponse = await initVideoUpload(accessToken, postInfo, sourceInfo);
            console.log("Odpowiedź API TikTok z backendu:", initResponse);
        
            if (initResponse?.data?.upload_url) {
                await uploadVideo("direct", initResponse.data.upload_url);
            } else {
                throw new Error("Nie udało się uzyskać URL przesyłania.");
            }
        } catch (error) {
            console.error("Błąd podczas przesyłania wideo:", error);
        }
    });
}
