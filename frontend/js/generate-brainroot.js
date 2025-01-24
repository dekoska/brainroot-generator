export function setupGenerateButton() {
    document.getElementById('generate').addEventListener('click', async () => {
        try {
            // Wywołanie backendu do generowania wideo
            const response = await fetch('http://localhost:8000/generate_video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Błąd podczas generowania wideo');
            }

            const result = await response.json();
            console.log('Wideo wygenerowane:', result.filename);

            // Pobieranie pliku po wygenerowaniu
            downloadVideo();
        } catch (error) {
            console.error('Błąd:', error);
            alert('Wystąpił błąd podczas generowania wideo.');
        }
    });
}

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
