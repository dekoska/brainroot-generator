export function queryCreatorInfo(accessToken) {
    return fetch('/api/creator-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Błąd HTTP! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Dane creatora:", data);
        return data;
    })
    .catch(error => {
        console.error("Błąd podczas pobierania informacji o twórcy:", error);
        return null;
    });
}
