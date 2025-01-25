import { getAccessToken } from './js/auth.js';
import { queryCreatorInfo } from './js/creator-info.js';
import { setupUploadButton } from './js/content-video-upload.js';
import { generateVideo } from './js/generate-brainroot.js';

let accessToken = null;

getAccessToken().then(token => {
    if (token) {
        accessToken = token;
        console.log("Pobrany token:", token);
        queryCreatorInfo(accessToken);
        setupUploadButton(accessToken);
    } else {
        console.error("Nie udało się pobrać tokenu.");
    }
});

document.getElementById("videoForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const flag = false;
    const button = document.getElementById("generate");
    button.disabled = true;
    button.textContent = "Generating...";

    // if (!flag) {
        try {
            const response = await generateVideo();
            if (!response.ok) {
                throw new Error("Błąd podczas generowania wideo: " + response.statusText);
            }

            // alert("Video generation started. Please wait...");

            await checkVideoReady();
            await downloadVideo();
            // flag = true;
        } catch (error) {
            // alert("Wystąpił błąd podczas generowania wideo: " + error.message);
        } finally {
            button.disabled = false;
            button.textContent = "Generate";
        }
    }
);

async function checkVideoReady() {
    let videoReady = false;
    const maxRetries = 30;  // Maksymalna liczba prób (30 prób co 5 sekundy = 2,5 minuty)
    let attempts = 0;

    while (!videoReady && attempts < maxRetries) {
        const response = await fetch("http://127.0.0.1:8000/download_video");
        if (response.ok) {
            videoReady = true;
            console.log("Plik wideo jest gotowy.");
        } else {
            console.log(`Próba ${attempts + 1}: Plik wciąż nie jest gotowy...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Oczekiwanie 5 sekund
            attempts++;
        }
    }

    if (!videoReady) {
        throw new Error("Plik wideo nie został wygenerowany w oczekiwanym czasie.");
    }
}


