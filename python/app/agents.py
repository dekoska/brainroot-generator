import functools
import sys

from moviepy.audio.io.AudioFileClip import AudioFileClip
from pydantic import BaseModel
import os
import time
from moviepy.editor import VideoFileClip,TextClip,CompositeVideoClip

import praw
import pyttsx3

from langchain.schema import  HumanMessage, AIMessage

from langgraph.constants import END, START

from yt_dlp import YoutubeDL
from duckduckgo_search import DDGS
from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_tools_agent, AgentExecutor

from langchain.tools import tool

from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import operator

import whisper
from whisper.utils import get_writer
import moviepy.config as mpconfig
from pysrt import SubRipFile
from textwrap import fill

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

# from langchain.chat_models import ChatOpenAI
from langchain_openai import ChatOpenAI


video_prompt = """You are a video research agent.
Your task is to search for and download the exact video provided in the user's query without making any modifications or assumptions.
DO NOT ADD ANYTHING FROM YOURSELF
Do not interpret or alter the query in any way.
ONLY download the video based on the exact details provided.
If you cannot find or download the video, clearly state the issue and finish without taking any further action.
Always document the exact source of the video you are downloading."""

@tool
def search_videos_youtube(query: Annotated[str, 'A query to search YouTube videos with']):
    """This tool uses DuckDuckGo to retrieve a YouTube video for download based on a query."""
    result = DDGS().videos(query, max_results=1)
    return str(result)

@tool
def download_youtube_videos(url: str, download_path: str = "./") -> str:
    """Searches for a YouTube video using DuckDuckGo and returns the first exact match."""
    ydl_opts = {
        'format': 'best',
        'outtmpl': os.path.join(download_path, 'downloadedvideo.%(ext)s'),
        'noplaylist': True,
    }
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return f"Video downloaded to {download_path}"
    except Exception as e:
        return f"Error: {e}"

video_tools = [search_videos_youtube, download_youtube_videos]

video_agent = create_openai_tools_agent(
    llm=llm,
    tools=video_tools,
    prompt=ChatPromptTemplate.from_messages([
        ("system", video_prompt),
        ("placeholder", "{messages}"),
        ("placeholder", "{agent_scratchpad}")
    ])
)
video_agent_executor = AgentExecutor(agent=video_agent, tools=video_tools, verbose=True)

reddit = praw.Reddit(
    client_id='2JAg79ULsDjRoabWAzAQqA',
    client_secret='y2dTkX_eUil16GvKO5ourtqRMPVe6g',
    user_agent='the_best_agent'
)

reddit_prompt = """DO NOT START UNTIL THE PREVIOUS AGENT FINISH
You are a Reddit research agent.
Your task is to search for relevant Reddit posts based on the user's query.
You ALWAYS quote sources in your responses and provide a link to the original post.
DO NOT make any assumptions or add extra information.
DO NOT summarise the post
If no relevant post is found, clearly state this and stop."""

@tool
def search_reddit_posts_tool(query: Annotated[str, "Query for searching Reddit posts"]):
    """Searches Reddit posts using PRAW, zapisuje treść posta do pliku subtitles.txt."""
    posts = []
    for submission in reddit.subreddit('all').search(query, limit=1):
        post_data = {
            "title": submission.title,
            "url": submission.url,
            "score": submission.score,
            "author": submission.author.name if submission.author else "Unknown",
            "selftext": submission.selftext
        }
        posts.append(post_data)

    if posts:
        try:
            with open("subtitles.txt", "w", encoding="utf-8") as f:
                f.write(posts[0]["selftext"] or "")
        except Exception as e:
            return f"Error writing subtitles.txt: {e}"

    return posts


reddit_tools = [search_reddit_posts_tool]

reddit_agent = create_openai_tools_agent(
    llm=llm,
    tools=reddit_tools,
    prompt=ChatPromptTemplate.from_messages([
        ("system", reddit_prompt),
        ("placeholder", "{messages}"),
        ("placeholder", "{agent_scratchpad}")
    ])
)
reddit_agent_executor = AgentExecutor(agent=reddit_agent, tools=reddit_tools, verbose=True)

tts_prompt = """DO NOT START UNTIL THE PREVIOUS AGENT FINISH.
You are a Text-to-Speech (TTS) agent.
Your task is to read the text from the text file provided by the user and save it as an audio file.
Do not provide any extra information beyond confirming that the audio was saved successfully."""


@tool
def text_to_speech_tool(file_path: str = "subtitles.txt"):
    """
    Converts text to speech (TTS) using pyttsx3 and saves it as output.mp3.
    """
    try:
        # Sprawdź, czy plik istnieje
        if not os.path.isfile(file_path):
            return f"File not found: {file_path}"

        # Odczytaj tekst z pliku
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        # Ustawienia TTS
        filename = "output.mp3"
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 1.0)

        voices = engine.getProperty('voices')
        for voice in voices:
            if "en" in voice.languages or "English" in voice.name:
                engine.setProperty('voice', voice.id)
                break

        # engine.save_to_file(text, filename)
        engine.runAndWait()

        return f"Audio saved to {filename}"
    except Exception as e:
        return f"Error in TTS: {str(e)}"


tts_tools = [text_to_speech_tool]

tts_agent = create_openai_tools_agent(
    llm=llm,
    tools=tts_tools,
    prompt=ChatPromptTemplate.from_messages([
        ("system", tts_prompt),
        ("placeholder", "{messages}"),
        ("placeholder", "{agent_scratchpad}")
    ])
)
tts_agent_executor = AgentExecutor(agent=tts_agent, tools=tts_tools, verbose=True)



# mpconfig.change_settings({'IMAGEMAGICK_BINARY': "C:\Program Files\ImageMagick-7.1.1-Q16-HDRI\magick.exe"})

video_edit_prompt = """DO NOT START UNTIL THE PREVIOUS AGENT FINISH
You are a video editing agent.
Your task is to:
Overlay a new audio track on top of the original audio.
Cut the video
Do not do anything else. Output only your final statement.
"""


@tool
def edit_video(
        input_video: str = "downloadedvideo.mp4",
        audio_file: str = "output.mp3",
        output_video: str = "output_final.mp4",
):
    """
    Edits a video:
    1. Overlays a new audio track.
    2. Trims video to the length of the audio.
    3. Resizes video to 9:16 format.
    4. Saves the output video.
    """
    try:

        if not os.path.isfile(input_video):
            raise FileNotFoundError(f"Input video file not found: {input_video}")
        if not os.path.isfile(audio_file):
            raise FileNotFoundError(f"Audio file not found: {audio_file}")


        video_clip = VideoFileClip(input_video)
        new_audio_clip = AudioFileClip(audio_file)

        audio_length = new_audio_clip.duration
        video_clip = video_clip.subclip(0, audio_length)

        target_aspect = 9 / 16
        current_width, current_height = video_clip.size
        current_aspect = current_width / current_height

        if current_aspect > target_aspect:
            new_width = int(target_aspect * current_height)
            x1 = (current_width - new_width) / 2
            video_clip = video_clip.crop(x1=x1, y1=0, width=new_width, height=current_height)
        else:

            new_height = int(current_width / target_aspect)
            y1 = (current_height - new_height) / 2
            video_clip = video_clip.crop(x1=0, y1=y1, width=current_width, height=new_height)

        video_clip = video_clip.resize(newsize=(1080, 1920))

        final_clip = video_clip.set_audio(new_audio_clip)

        final_clip.write_videofile(output_video, codec="libx264", audio_codec="aac")

        return f"Video successfully saved to: {output_video}"

    except Exception as e:
        return f"ERROR in edit_video: {str(e)}"


edit_video_tools = [edit_video]

edit_video_agent = create_openai_tools_agent(
    llm=llm,
    tools=edit_video_tools,
    prompt=ChatPromptTemplate.from_messages([
        ("system", video_edit_prompt),
        ("placeholder", "{messages}"),
        ("placeholder", "{agent_scratchpad}")
    ])
)

edit_video_executor = AgentExecutor(
    agent=edit_video_agent,
    tools=edit_video_tools,
    verbose=True
)

subtitles_prompt = """DO NOT START UNTIL THE PREVIOUS AGENT FINISH
You are a subtitles agent.
Your task is to add subtitles to the video:
Do not do anything else. Output only your final statement.
"""

model = whisper.load_model('large')

def get_transcribe(audio: str, language: str = 'en'):
    return model.transcribe(audio=audio, language=language, verbose=True)

def save_file(results, format='srt'):
    output_dir = 'output'
    writer = get_writer(format, output_dir)
    writer(results, f'transcribe.{format}')

import sys
@tool
def add_subtitles_tool(
    input_video: str = "output_final.mp4",
    output_with_subtitles: str = "output_with_subtitles.mp4"
):
    """
    Adds subtitles from a transcribed MP3 file to a video and saves the result.
    """
    audio_path = 'output.mp3'

    output_dir = 'output'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Utworzono katalog: {output_dir}")

    if not os.path.isfile(audio_path):
        return f"Plik audio nie istnieje: {audio_path}"
    else: print(f"Plik audio znaleziony: {audio_path}")

    # Transcribe audio and save subtitles
    try:
        result = get_transcribe(audio=audio_path)
        if result and 'text' in result:
            print("Transkrypcja zakończona sukcesem.")
            save_file(result, 'srt')
        else:
            return "Błąd: Transkrypcja nie zwróciła żadnych wyników."
    except Exception as e:
        return f"Błąd podczas transkrypcji: {e}"
        sys.exit(1)

    subtitles_path = os.path.join(output_dir, 'transcribe.srt')

    if not os.path.isfile(subtitles_path):
        return f"Plik z napisami nie został wygenerowany: {subtitles_path}"

    try:
        video_clip = VideoFileClip(input_video)
        subtitles = SubRipFile.open(subtitles_path)
        subtitle_clips = []
        max_width = 30

        for subtitle in subtitles:

            text = fill(subtitle.text.replace('\n', ' '), width=max_width)
            start = subtitle.start.ordinal / 1000.0  # Convert to seconds
            end = subtitle.end.ordinal / 1000.0

            subtitle_clip = (
                TextClip(
                    txt=text,
                    fontsize=80,
                    color='yellow',
                    font="Arial",
                    stroke_color="black",
                    stroke_width=2
                )
                .set_start(start)
                .set_end(end)
                .set_position(("center", "center"))
            )
            subtitle_clips.append(subtitle_clip)


        final_video = CompositeVideoClip([video_clip] + subtitle_clips)
        final_video.write_videofile(output_with_subtitles, codec="libx264", audio_codec="aac")

        return f"Video with subtitles saved to {output_with_subtitles}"

    except Exception as e:
        return f"Error in add_subtitles_tool: {str(e)}"

subtitles_tools = [add_subtitles_tool]

subtitles_agent = create_openai_tools_agent(
    llm=llm,
    tools=subtitles_tools,
    prompt=ChatPromptTemplate.from_messages([
        ("system", subtitles_prompt),
        ("placeholder", "{messages}"),
        ("placeholder", "{agent_scratchpad}")
    ])
)
subtitles_agent_executor = AgentExecutor(agent=subtitles_agent, tools=subtitles_tools, verbose=True)


summarise_prompt = """Your task is to summarise all given messages in report
to inform user about all actions that were undertaken:
MESSAGES: {messages}"""

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str

WORKFLOW = StateGraph(AgentState)

supervisor_prompt = """
You are a supervisor managing a conversation between the following team members:
- VIDEO_AGENT
- REDDIT_AGENT
- TTS_AGENT
- EDIT_VIDEO_AGENT
- SUBTITLES_AGENT
For each user request, identify and respond with the next worker who should act. When all tasks are completed, reply with 'FINISH'.
For the user, reply with 'FINISH'. When the task is fully completed, also respond with 'FINISH'
to indicate that the process is complete.
"""

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", supervisor_prompt),
        MessagesPlaceholder(variable_name="messages"),
        (
            "system",
            "Given the conversation above, who should act next?"
            " Or should we FINISH? Select one of: [FINISH, VIDEO_AGENT, REDDIT_AGENT, TTS_AGENT, EDIT_VIDEO_AGENT, SUBTITLES_AGENT]"
        ),
    ]
)


class RouteResponse(BaseModel):
    next: Literal["VIDEO_AGENT", "REDDIT_AGENT", "TTS_AGENT", "EDIT_VIDEO_AGENT","SUBTITLES_AGENT",  "FINISH"]

supervisor_chain = prompt | llm.with_structured_output(RouteResponse)

def supervisor_node(state):
    print("Supervisor received state:", state)
    
    # Keep track of executed agents
    if "executed_agents" not in state:
        state["executed_agents"] = set()
    
    result = supervisor_chain.invoke(state)
    print("Supervisor decided next step:", result.next)

    if result.next == "FINISH" or result.next in state["executed_agents"]:
        print("Process completed successfully.")
        return {"next": "FINISH"}

    # Add executed agent to the tracking list
    state["executed_agents"].add(result.next)

    return result





def agent_node(state, agent, name):

  print(f"Entering {name} node")
  start = time.time()
  try:
      result = agent.invoke(state)
  except Exception as e:
      print(e)
      print("Error!!!")
      return {
          "messages": [AIMessage(content=str(e), name=name, id=str(time.time()))]
      }
  print(f"Agent: {name} got result in {round(time.time() - start, 2)}")
  print(f"Result: {result}")
  print(f"Last message: {result['messages'][-1].content}")
  last_msg = result['messages'][-1]
  output = result.get("output", last_msg)

  return {
      "messages": [AIMessage(content=output, name=name, id=str(time.time()))]
  }

WORKFLOW.add_node("supervisor", supervisor_node)
WORKFLOW.add_edge(START, "supervisor")

video_node = functools.partial(agent_node, agent=video_agent_executor, name="VIDEO_AGENT")


def summarise_node(state):
  full_prompt = summarise_prompt.format(messages=state["messages"])
  summary = llm.invoke(full_prompt)
  print(summary)
  return {
      "messages": [AIMessage(content=summary.content, name="Summary", id=str(time.time()))]
  }


REDDIT_node = functools.partial(agent_node, agent=reddit_agent_executor, name="REDDIT_AGENT")
TTS_node = functools.partial(agent_node, agent=tts_agent_executor, name="TTS_AGENT")
EDIT_VIDEO_node = functools.partial(agent_node, agent=edit_video_executor, name="EDIT_VIDEO_AGENT")
SUBTITLES_node = functools.partial(agent_node, agent=subtitles_agent_executor, name="SUBTITLES_AGENT")


WORKFLOW.add_node("VIDEO_AGENT", video_node)
WORKFLOW.add_node("REDDIT_AGENT", REDDIT_node)
WORKFLOW.add_node("TTS_AGENT", TTS_node)
WORKFLOW.add_node("EDIT_VIDEO_AGENT", EDIT_VIDEO_node)
WORKFLOW.add_node("SUBTITLES_AGENT", SUBTITLES_node)
WORKFLOW.add_node("FINISH", summarise_node)
WORKFLOW.add_edge("FINISH", END)

agent_names = ["VIDEO_AGENT", "REDDIT_AGENT", "TTS_AGENT","EDIT_VIDEO_AGENT","SUBTITLES_AGENT", "FINISH"]
conditional_map = {k: k for k in agent_names}
WORKFLOW.add_conditional_edges("supervisor", lambda x: x["next"], conditional_map)

WORKFLOW.add_edge(START, "VIDEO_AGENT")
WORKFLOW.add_edge("VIDEO_AGENT", "supervisor")
WORKFLOW.add_edge("REDDIT_AGENT", "supervisor")
WORKFLOW.add_edge("TTS_AGENT", "supervisor")
WORKFLOW.add_edge("EDIT_VIDEO_AGENT", "supervisor")
WORKFLOW.add_edge("SUBTITLES_AGENT", "FINISH")
WORKFLOW.add_edge("FINISH", END)

GRAPH = WORKFLOW.compile()

def run_graph(graph, user_input):
    config = {"configurable": {"thread_id": "2"}}
    try:
        result = graph.invoke(
            {
                "messages": [
                    HumanMessage(
                        user_input,
                        id=str(time.time())
                    )
                ]
            }
            , config=config)
        
        if result["messages"][-1].content == "FINISH":
            print("Process finished successfully.")
            return "Process completed"
        
        return "Unexpected result"
    except Exception as e:
        return f"Could not generate response, because of {e}"



# prompt1= (
#         "find and download youtube video about minecraft parkure"
#         "next find a story on reddit about funny stories "
#         "next generate speech based on the text in the text file subtitles.txt "
#         "next overlay the audio and cut the video "
#         "finally, add subtitles to the video and then finish"
#     )
# run_graph(GRAPH, prompt1)
# app = FastAPI()


# # Model danych wejściowych
# class UserInput(BaseModel):
#     video_topic: str
#     reddit_topic: str


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


# @app.post("/generate_video")
# def generate_and_return_video(user_input: UserInput):
#     # Wygeneruj prompt
#     prompt = generate_prompt(user_input.video_topic, user_input.reddit_topic)

#     # Uruchom przepływ pracy
#     try:
#         result = run_graph(GRAPH, prompt)  # Zakładamy, że funkcja run_graph generuje wideo
#         output_file = "output_with_subtitles.mp4"

#         # Sprawdź, czy plik istnieje
#         if not os.path.exists(output_file):
#             raise HTTPException(status_code=500, detail="Plik wideo nie został wygenerowany.")

#         return FileResponse(
#             path=output_file,
#             media_type="video/mp4",
#             filename="output_with_subtitles.mp4"
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
