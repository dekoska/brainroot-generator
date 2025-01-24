export function setupGenerateButton() {
    document.getElementById('generate').addEventListener('click', async (e) => {
        e.preventDefault();

        let formData = new FormData();
        const videoFile = document.getElementById('video').files[0];

        if (!videoFile) {
            alert("Proszę wybrać plik wideo przed przesłaniem.");
            return;
        }

        formData.append("file", videoFile);

        try {
            const uploadResponse = await fetch('https://brainroot-generator.vercel.app/python/upload/', {
                method: 'POST',
                body: formData
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResponse.ok) {
                console.log("Przesyłanie zakończone sukcesem: " + uploadResult.filename);

                const checkResponse = await fetch(`https://brainroot-generator.vercel.app/python/check-file?filename=${uploadResult.filename}`);
                const checkResult = await checkResponse.json();

                if (checkResponse.ok && checkResult.exists) {
                    console.log("Video znajduje się w folderze: " + uploadResult.filename);
                    alert("Plik zapisany pomyślnie!");
                } else {
                    console.error("Nie znaleziono pliku na serwerze.");
                    alert("Wystąpił problem z zapisem pliku.");
                }
            } else {
                console.error('Błąd przesyłania:', uploadResult.message);
                alert("Przesyłanie nie powiodło się: " + uploadResult.message);
            }

        } catch (error) {
            console.error('Błąd przesyłania:', error);
            alert("Przesyłanie nie powiodło się.");
        }
    });
}
