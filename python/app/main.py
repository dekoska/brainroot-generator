from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import asyncio
from agents import run_graph, generate_prompt, GRAPH
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://brainroot-generator.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)
# Model danych wejściowych
class UserInput(BaseModel):
    video_topic: str
    reddit_topic: str

VIDEO_OUTPUT_PATH = "final_output_with_subtitles.mp4"

def generate_prompt(video_topic: str, reddit_topic: str):
    """
    Generuje prompt na podstawie wyborów użytkownika.
    """
    return (
        f"find and download youtube video in good quality and without any subtitles on it about {video_topic} "
        f"next find a story on reddit about {reddit_topic} "
        "next generate speech based on the text in the text file subtitles.txt "
        "next overlay the audio and cut the video "
        "finally, add subtitles to the video and then finish"
    )
    
# Funkcja do generowania wideo w tle
async def generate_real_video(user_input: UserInput):
    prompt = generate_prompt(user_input.video_topic, user_input.reddit_topic)

    try:
        await asyncio.to_thread(run_graph, GRAPH, prompt)

        if not os.path.exists(VIDEO_OUTPUT_PATH):
            raise HTTPException(status_code=500, detail="Plik wideo nie został wygenerowany.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during video generation: {str(e)}")



@app.post("/generate_video")
async def generate_video(user_input: UserInput):
    await generate_real_video(user_input)
    
    return {"message": "Video generation started", "filename": VIDEO_OUTPUT_PATH}

@app.get("/download_video")
async def download_video():
    if os.path.exists(VIDEO_OUTPUT_PATH):
        return FileResponse(VIDEO_OUTPUT_PATH, media_type='video/mp4', filename="generated_video.mp4")
    else:
        raise HTTPException(status_code=404, detail="File not found")
    
