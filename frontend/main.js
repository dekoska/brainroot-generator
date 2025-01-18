const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
    console.log("Kod autoryzacyjny:", code);

    fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code, state: state }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        const accessToken = data.accessToken; 
        console.log("Otrzymano token dostępowy:", accessToken);
        if (accessToken) {
            queryCreatorInfo(accessToken);
        } else {
            console.error("Brak tokenu dostępowego w odpowiedzi.");
        }
    })
    .catch(error => {
        console.error("Błąd podczas pobierania tokenu:", error);
    });
} else {
    console.error("Brak kodu autoryzacyjnego w URL.");
}

//query creator info
function queryCreatorInfo(accessToken) {
    fetch('/api/creator-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        console.log("Dane creatora:", data);
        document.body.insertAdjacentHTML('beforeend', `<pre>${JSON.stringify(data, null, 2)}</pre>`);
    })
    .catch(error => {
        console.error("Błąd podczas komunikacji z backendem:", error);
    });
}

//upload url
function initVideoUpload(accessToken, postInfo, sourceInfo) {
    fetch('/api/video/init', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, postInfo, sourceInfo }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Inicjacja przesyłania wideo zakończona sukcesem:", data);
        if (data.data && data.data.upload_url && data.data.publish_id) {
            uploadVideo(data.data.upload_url, accessToken, postInfo.title);
        } else {
            console.error("Nie udało się uzyskać `upload_url` lub `publish_id`.");
        }
    })
    .catch(error => {
        console.error("Błąd podczas inicjacji przesyłania wideo:", error);
    });
}

//
function uploadVideo(uploadUrl, accessToken, videoFile) {
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Przesyłanie wideo zakończone sukcesem.");
    })
    .catch(error => {
        console.error("Błąd podczas przesyłania wideo:", error);
    });
}

//przycisk wyslij
document.getElementById("upload-form").addEventListener("submit", (event) => {
    event.preventDefault();

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
        video_size: 123456, // bajty
        chunk_size: 10000000, // rozmiar chunku???
        total_chunk_count: 1, // fragmenty
    };

    initVideoUpload(accessToken, postInfo, sourceInfo);
});

