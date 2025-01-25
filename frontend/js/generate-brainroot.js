export async function generateVideo() {
    const videoTopic = document.getElementById("video_topic").value;
    const redditTopic = document.getElementById("reddit_topic").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/generate_video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                video_topic: videoTopic,
                reddit_topic: redditTopic
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error("Error generating video: " + errorData.detail);
        }

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error("Error sending request:", error);
        alert("An error occurred while communicating with the server.");
    }
}
