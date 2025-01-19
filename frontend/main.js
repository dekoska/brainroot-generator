import { getAccessToken } from './js/auth.js';
import { queryCreatorInfo } from './js/creator-info.js';
import { setupUploadButton } from './js/content-video-upload.js';

let accessToken = null;

getAccessToken().then(token => {
    if (token) {
        accessToken = token;
        queryCreatorInfo(accessToken);
        setupUploadButton(accessToken);
    } else {
        console.error("Nie udało się pobrać tokenu.");
    }
});

