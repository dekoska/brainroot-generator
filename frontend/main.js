import { getAccessToken } from './js/auth.js';
import { queryCreatorInfo } from './js/creator-info.js';
import { setupGenerateButton } from './js/generate-brainroot.js';
import { setupUploadButton } from './js/content-video-upload.js';

let accessToken = null;

getAccessToken().then(token => {
    if (token) {
        accessToken = token;
        console.log("Pobrany token:", token);
        queryCreatorInfo(accessToken);
        setupGenerateButton();
        setupUploadButton(accessToken);
    } else {
        console.error("Nie udało się pobrać tokenu.");
    }
});

