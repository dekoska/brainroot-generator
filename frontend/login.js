// anti-forgery state token
let array = new Uint8Array(30); 
const csrfState = window.crypto.getRandomValues(array);

function generateRandomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

function generateState() {
    let array = new Uint8Array(30); 
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
}

function generateCodeVerifier() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < 43; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const state = generateState();
const codeVerifier = generateCodeVerifier();

const codeChallenge = CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(codeVerifier))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log("State:", state);
console.log("Code Verifier:", codeVerifier);
console.log("Code Challenge:", codeChallenge);

// Konstrukcja linku OAuth
function generateTikTokOAuthURL(clientKey, redirectURI, scope) {
    const baseURL = "https://www.tiktok.com/v2/auth/authorize/";
    const params = new URLSearchParams({
        client_key: clientKey,
        response_type: "code",
        scope: scope,
        redirect_uri: redirectURI,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });
    return `${baseURL}?${params.toString()}`;
}


const clientKey = "sbaw7f3n8zn9n1qtdp";
const redirectURI = "https://brainroot-generator.vercel.app/frontend/main";
const scope = "user.info.basic,video.upload,video.publish";

const oauthURL = generateTikTokOAuthURL(clientKey, redirectURI, scope);

document.getElementById("login-link").href = oauthURL;

console.log("TikTok OAuth URL:", oauthURL);


