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

document.getElementById("videoForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const button = document.getElementById("generate");
    button.disabled = true; 
    button.textContent = "Generating...";

    try {
        const response = await generateVideo();
        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            
            await checkVideoReady();
            await downloadVideo();
        } else {
            alert("Błąd podczas generowania wideo: " + data.detail);
        }
    } catch (error) {
        alert("Wystąpił błąd podczas generowania wideo");
    } finally {
        button.disabled = false;
        button.textContent = "Generate";
    }
});


