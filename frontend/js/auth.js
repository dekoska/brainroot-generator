export function getAccessToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) {
        console.error("Brak kodu autoryzacyjnego w URL.");
        return null;
    }

    return fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Błąd HTTP! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Otrzymano token dostępowy:", data.accessToken);
        return data.accessToken;
    })
    .catch(error => {
        console.error("Błąd podczas pobierania tokenu:", error);
        return null;
    });
}
