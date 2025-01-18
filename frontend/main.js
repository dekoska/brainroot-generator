const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
    console.log("Kod autoryzacyjny:", code);

    fetch('/api', {
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
    fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        if (data.error && data.error.code === 'ok') {
            console.log("Dane creatora:", data.data);
            document.body.insertAdjacentHTML('beforeend', `<pre>${JSON.stringify(data.data, null, 2)}</pre>`);
        } else {
            console.error("Błąd podczas pobierania danych creatora:", data.error?.message || 'Nieznany błąd.');
        }
    })
    .catch(error => {
        console.error("Błąd podczas komunikacji z API TikTok:", error);
    });
}
