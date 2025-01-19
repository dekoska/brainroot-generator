const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('shareState')) {
    const shareState = urlParams.get('shareState');
    if (shareState === 'success') {
        alert('Wideo zostało udostępnione!');
    } else {
        alert('Nie udało się udostępnić wideo.');
    }
}
