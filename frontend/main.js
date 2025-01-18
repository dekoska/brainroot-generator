const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
    console.log("Kod autoryzacyjny:", code);

    fetch('/api/token', {
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
    fetch('/api/creator-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        console.log("Dane creatora:", data);
        document.body.insertAdjacentHTML('beforeend', `<pre>${JSON.stringify(data, null, 2)}</pre>`);
    })
    .catch(error => {
        console.error("Błąd podczas komunikacji z backendem:", error);
    });
}
