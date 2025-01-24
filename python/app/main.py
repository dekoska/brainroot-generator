# from fastapi import FastAPI, UploadFile, File
# from fastapi.responses import JSONResponse
# import os

# app = FastAPI()

# UPLOAD_FOLDER = "uploaded_videos"
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# @app.get("/")
# def root():
#     return {"message": "Backend działa pod ścieżką /python/"}

# @app.post("/upload/")
# async def upload_video(file: UploadFile = File(...)):
#     file_location = f"{UPLOAD_FOLDER}/{file.filename}"
#     with open(file_location, "wb") as f:
#         f.write(await file.read())
#     return JSONResponse(content={"message": "Plik przesłany pomyślnie!", "filename": file.filename})

from fastapi import FastAPI
from pydantic import BaseModel
from agents import generate_and_return_video

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "API is running!"}

class UserInput(BaseModel):
    video_topic: str
    reddit_topic: str
    
# Endpoint do generowania wideo
@app.post("/generate_video")
def generate_video(user_input: UserInput):
    return generate_and_return_video(user_input)
