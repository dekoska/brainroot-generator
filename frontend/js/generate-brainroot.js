import { checkVideoReady } from '../main.js';

export async function generateVideo() {
    const videoTopic = document.getElementById("video_topic").value;
    const redditTopic = document.getElementById("reddit_topic").value;

    try {
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

        if (!response.ok) {
            const errorData = await response.json();
            alert('Błąd podczas generowania wideo: ' + (errorData.detail || response.statusText));
            return;
        }

        const data = await response.json();
        alert(data.message);

        console.log("Checking video availability...");
        await checkVideoReady();
        await downloadVideo();

    } catch (error) {
        console.error("Error sending request:", error);
        alert("Wystąpił błąd podczas komunikacji z serwerem.");
    }
}


// async function downloadVideo() {
//     const link = document.createElement("a");
//     link.href = "http://127.0.0.1:8000/download_video";
//     link.download = "generated_video.mp4";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// }


// Funkcja do pobrania wygenerowanego wideo
// async function downloadVideo() {
//     try {
//         const downloadResponse = await fetch('http://localhost:8000/download_video/');

//         if (!downloadResponse.ok) {
//             throw new Error('Błąd podczas pobierania pliku');
//         }

//         const blob = await downloadResponse.blob();
//         const url = window.URL.createObjectURL(blob);

//         // Tworzenie linku do pobrania
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = 'output_with_subtitles.mp4';
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);

//         console.log('Pobieranie zakończone');
//     } catch (error) {
//         console.error('Błąd pobierania:', error);
//     }
// }
