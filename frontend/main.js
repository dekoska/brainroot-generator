const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
    console.log("Kod autoryzacyjny:", code);

    fetch('http://localhost:8080/api//token', { // Użyj właściwego URL, gdy wdrożysz backend
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code, state: state })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Otrzymano token dostępowy:", data);
    })
    .catch(error => console.error("Błąd:", error));
} else {
    console.error("Brak kodu autoryzacyjnego w URL.");
}
