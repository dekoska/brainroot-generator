document.getElementById("videoForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const videoTopic = document.getElementById("video_topic").value;
    const redditTopic = document.getElementById("reddit_topic").value;

    const response = await fetch("http://127.0.0.1:8000/generate_video", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            video_topic: videoTopic,
            reddit_topic: redditTopic
        })
    });

    const data = await response.json();
    alert(data.message);

    if (!response.ok) {
        alert('Błąd podczas generowania wideo: ' + response.statusText);
        return;
    }
});

// Funkcja do pobrania wygenerowanego wideo
async function downloadVideo() {
    try {
        const downloadResponse = await fetch('http://localhost:8000/download_video/');

        if (!downloadResponse.ok) {
            throw new Error('Błąd podczas pobierania pliku');
        }

        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);

        // Tworzenie linku do pobrania
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log('Pobieranie zakończone');
    } catch (error) {
        console.error('Błąd pobierania:', error);
    }
}
