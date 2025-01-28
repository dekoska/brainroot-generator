import { getAccessToken } from './js/auth.js';
import { queryCreatorInfo } from './js/creator-info.js';
import { setupUploadButton } from './js/content-video-upload.js';
import { generateVideo } from './js/generate-brainroot.js';

let accessToken = null;

getAccessToken().then(token => {
    if (token) {
        accessToken = token;
        console.log("Token acquired:", token);
        queryCreatorInfo(accessToken);
        setupUploadButton(accessToken);
    } else {
        console.error("Failed to fetch token.");
    }
});

document.getElementById("videoForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = document.getElementById("generate");
    button.disabled = true;
    button.textContent = "Generating...";      

    try {
        await generateVideo();
        console.log("Video generation started. Checking availability...");
        await checkVideoReady();
        downloadVideo(); 
    } catch (error) {
        console.error("Error during video generation:", error);
    } finally {
        button.disabled = false;
        button.textContent = "Generate";
    }
});

async function checkVideoReady() {
    let videoReady = false;
    const maxRetries = 30;  
    let attempts = 0;

    while (!videoReady && attempts < maxRetries) {
        try {
            const response = await fetch("http://127.0.0.1:8000/download_video");
            if (response.ok) {
                videoReady = true;
                console.log("Video is ready for download.");
                return true;
            } else {
                console.log(`Attempt ${attempts + 1}: Video not ready yet...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;
            }
        } catch (error) {
            console.error("Error checking video status:", error);
        }
    }

    throw new Error("Video was not generated within the expected time.");
}

async function downloadVideo() {
    try {
        const link = document.createElement("a");
        link.href = "http://127.0.0.1:8000/download_video";
        link.download = "generated_video.mp4";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Download initiated successfully.");
    } catch (error) {
        console.error("Error during download:", error);
    }
}

export { checkVideoReady };
