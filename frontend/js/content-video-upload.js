export function initVideoUpload(accessToken, postInfo, sourceInfo) {
    const postData = { accessToken, postInfo, sourceInfo };
    console.log("Dane wysyłane do API:", postData);

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
            uploadVideo(data.data.upload_url);
        } else {
            throw new Error("Nie udało się uzyskać URL przesyłania.");
        }
    })
    .catch(error => {
        console.error("Błąd podczas inicjacji przesyłania wideo:", error);
    });
}

function uploadVideo(uploadUrl) {
    const fileInput = document.getElementById("video");
    const file = fileInput.files[0];

    if (!file) {
        console.error("Nie wybrano pliku wideo.");
        return;
    }

    fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
        },
        body: file,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Błąd HTTP! status: ${response.status}`);
        }
        console.log("Przesyłanie wideo zakończone sukcesem.");
    })
    .catch(error => {
        console.error("Błąd podczas przesyłania wideo:", error);
    });
}

export function setupUploadButton(accessToken) {
    document.getElementById("upload-form").addEventListener("submit", (event) => {
        event.preventDefault();

        if (!accessToken) {
            console.error("Brak tokenu dostępowego. Upewnij się, że token został poprawnie pobrany.");
            return;
        }

        const file = document.getElementById("video").files[0];
        const videoSize = file.size;

        const postInfo = {
            title: document.getElementById("title").value,
            privacy_level: document.querySelector('input[name="privacy_level"]:checked').value,
            disable_duet: document.querySelector('input[name="duet_option"]:checked').value === "true",
            disable_comment: document.querySelector('input[name="comment_option"]:checked').value === "true",
            disable_stitch: document.querySelector('input[name="stitch_option"]:checked').value === "true",
            video_cover_timestamp_ms: document.getElementById("duration").valueAsNumber,
        };
        const sourceInfo = {
            source: "FILE_UPLOAD",
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1,
        };

        console.log(postInfo);
        initVideoUpload(accessToken, postInfo, sourceInfo);
    });
}

