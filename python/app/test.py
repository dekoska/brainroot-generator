from gtts import gTTS
import os

def text_to_speech_tool(file_path: str = "subtitles.txt"):
    try:
        if not os.path.isfile(file_path):
            return f"File not found: {file_path}"

        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        if not text.strip():
            return "The file is empty."

        tts = gTTS(text, lang="en")
        filename = "output.mp3"
        tts.save(filename)

        print(f"[SUCCESS] Audio saved to {filename}")
        return f"Audio saved to {filename}"

    except Exception as e:
        print(f"[ERROR] Error in TTS: {str(e)}")
        return f"Error in TTS: {str(e)}"

text_to_speech_tool(file_path="subtitles.txt")

