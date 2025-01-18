import operator
import time
import functools

from typing import TypedDict, Annotated, Sequence, Literal

import pyttsx3
import praw

# Hugging Face Transformers
from transformers import GPTNeoForCausalLM, GPT2Tokenizer

# LangChain / langgraph
from langchain.llms.base import LLM
from langgraph.graph import StateGraph
from langgraph.constants import END, START

# YT + DuckDuckGo
from yt_dlp import YoutubeDL
from duckduckgo_search import DDGS

# Pydantic
from pydantic import BaseModel, PrivateAttr

# LangChain Schemas
from langchain.schema import BaseMessage, HumanMessage, AIMessage


########################################
# 1. Model GPT-Neo jako customowy LLM
########################################
class GPTNeoLangChainLLM(LLM):
    """Prosty wrapper wokół GPTNeoForCausalLM, by używać go jako LLM w LangChain."""

    _hf_model: GPTNeoForCausalLM = PrivateAttr()
    _hf_tokenizer: GPT2Tokenizer = PrivateAttr()
    _max_new_tokens: int = PrivateAttr()

    def __init__(
            self,
            hf_model: GPTNeoForCausalLM,
            hf_tokenizer: GPT2Tokenizer,
            max_new_tokens: int = 100,
            **kwargs
    ):
        super().__init__(**kwargs)
        self._hf_model = hf_model
        self._hf_tokenizer = hf_tokenizer
        self._max_new_tokens = max_new_tokens

        # Ustawienie pad_token na eos_token, jeśli pad_token nie jest ustawiony
        if self._hf_tokenizer.pad_token is None:
            self._hf_tokenizer.pad_token = self._hf_tokenizer.eos_token
            self._hf_model.resize_token_embeddings(len(self._hf_tokenizer))

    def _call(self, prompt: str, stop=None) -> str:
        encoding = self._hf_tokenizer(
            prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512  # Możesz dostosować w zależności od potrzeb
        )
        input_ids = encoding["input_ids"]
        attention_mask = encoding["attention_mask"]
        output = self._hf_model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            max_new_tokens=self._max_new_tokens,
            pad_token_id=self._hf_tokenizer.pad_token_id  # Ustawienie pad_token_id na pad_token
        )
        response = self._hf_tokenizer.decode(output[0], skip_special_tokens=True)
        return response

    @property
    def _identifying_params(self) -> dict:
        """Parametry identyfikujące model (opcjonalnie, wykorzystywane przez LangChain)."""
        return {
            "model_type": "GPTNeoForCausalLM EleutherAI/gpt-neo-125M",
            "max_new_tokens": self._max_new_tokens
        }

    def _llm_type(self) -> str:
        """Zwraca nazwę typu LLM (wymagane przez bazową klasę LLM w LangChain)."""
        return "gptneo_custom"


########################################
# 2. Inicjalizacja modelu GPT-Neo
########################################
hf_model = GPTNeoForCausalLM.from_pretrained("EleutherAI/gpt-neo-125M")
hf_tokenizer = GPT2Tokenizer.from_pretrained("EleutherAI/gpt-neo-125M")
llm = GPTNeoLangChainLLM(hf_model, hf_tokenizer)

########################################
# 3. Agent do pobierania wideo z YouTube
########################################

video_prompt = """You are a video research agent. 
Your task is to search for and download the exact video provided in the user's query without making any modifications or assumptions. 
DO NOT ADD ANYTHINK FROM YOURSELF
Do not interpret or alter the query in any way. 
ONLY download the video based on the exact details provided . 
If you cannot find or download the video, clearly state the issue and finish without taking any further action. 
Always document the exact source of the video you are downloading."""


def search_videos_youtube(query: str) -> str:
    """Uses DuckDuckGo to retrieve a YouTube video for download based on a query."""
    results = DDGS().videos(query, max_results=1)
    if not results:
        return "No results found."
    return str(results)


def download_youtube_videos(url: str, download_path: str = "./") -> str:
    """Searches for a YouTube video using DuckDuckGo and returns the first exact match."""
    ydl_opts = {
        'format': 'best',
        'outtmpl': f'{download_path}%(title)s.%(ext)s',
        'noplaylist': True,
    }
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return f"Video downloaded to {download_path}"
    except Exception as e:
        return f"Error: {e}"


def process_query_video(query: str) -> str:
    """Zarządza wyszukaniem i pobraniem filmu, a następnie generuje prostą odpowiedź."""
    video_info = search_videos_youtube(query)
    if "youtube.com" not in video_info:
        return "No valid YouTube link found in search results."

    try:
        video_url = "https://www.youtube.com" + video_info.split("https://www.youtube.com")[1].split('}')[0]
    except Exception as e:
        return f"Error while parsing YouTube URL: {e}"

    download_message = download_youtube_videos(video_url)
    prompt = f"{video_prompt}\n\nQuery: {query}\n\nVideo Info: {download_message}\n\nVideo Details: {video_info}"

    return llm.invoke(prompt).strip()


########################################
# 4. Agent do wyszukiwania historii z Reddita
########################################
reddit = praw.Reddit(
    client_id='2JAg79ULsDjRoabWAzAQqA',
    client_secret='y2dTkX_eUil16GvKO5ourtqRMPVe6g',
    user_agent='the_best_agent'
)

reddit_prompt = """You are a Reddit research agent.
You always refer to Reddit sources to provide answers and do not use your own knowledge.
You ALWAYS quote used sources in corresponding places in the text. If you cannot perform a certain action, just finish."""

def search_reddit_posts(query: str):
    """Searches Reddit posts via PRAW."""
    posts = []
    for submission in reddit.subreddit('all').search(query, limit=5):
        posts.append({
            "title": submission.title,
            "url": submission.url,
            "score": submission.score,
            "author": submission.author.name if submission.author else "Unknown",
            "selftext": submission.selftext  # Pobieranie treści posta
        })
    return posts

def process_query_reddit(query: str, output_file: str = "reddit_story.txt") -> str:
    """Generuje odpowiedź opartą na pierwszym poście z Reddita i zapisuje do pliku."""
    posts = search_reddit_posts(query)
    if not posts:
        return "No posts found on Reddit."

    first_post = posts[0]
    title = first_post["title"]
    url = first_post["url"]
    content = first_post["selftext"]

    if not content:
        return f"The post at {url} has no text content."

    full_story = f"{content}"

    try:
        with open(output_file, "w", encoding="utf-8") as file:
            file.write(full_story)
        return f"Story saved to {output_file}:\n\n{full_story}"
    except Exception as e:
        return f"Error saving story to file: {e}"

########################################
# 5. Agent do generowania mowy (TTS)
########################################

def text_to_speech(text: str, filename: str = "output.mp3"):
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
    engine.setProperty('volume', 1)


    voices = engine.getProperty('voices')
    for voice in voices:
        if "en" in voice.languages or "English" in voice.name:
            engine.setProperty('voice', voice.id)
            break


    engine.save_to_file(text, filename)
    engine.runAndWait()


def process_query_speech_from_file(file_path: str = "reddit_story.txt") -> str:
    """Czyta zawartość pliku i generuje mowę na jego podstawie."""
    try:

        with open(file_path, "r", encoding="utf-8") as file:
            text = file.read()


        filename = "output.mp3"
        text_to_speech(text, filename)
        return f"Audio saved to {filename} with content from {file_path}"
    except FileNotFoundError:
        return f"File {file_path} not found."
    except Exception as e:
        return f"Error processing speech: {e}"


########################################
# 6. Supervisor / Workflow
########################################

# Stan i graf
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    tasks: Annotated[Sequence[str], operator.add]
    next: str


WORKFLOW = StateGraph(AgentState)


def supervisor_node(state):
    """Router, który wybiera kolejny krok na podstawie listy zadań."""
    if state["tasks"]:
        next_task = state["tasks"].pop(0)
    else:
        next_task = "FINISH"

    print(f"Supervisor Decision: {next_task}")  # Debugowanie
    return {"next": next_task}


def agent_node(state, agent_func, name):
    """Uruchamia podaną funkcję agent_func i dodaje wynik do messages."""
    print(f"Entering {name} node.")
    if name == "SPEECH_AGENT":
        last_ai_message = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, AIMessage) and msg.name != "VIDEO_YOUTUBE_AGENT":
                last_ai_message = msg.content
                break
        if not last_ai_message:
            return {"messages": [AIMessage(content="No text found for speech.", name=name, id=str(time.time()))]}
        input_text = last_ai_message
    else:

        input_text = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                input_text = msg.content
                break
        if not input_text:
            return {"messages": [AIMessage(content="No user input found.", name=name, id=str(time.time()))]}

    try:
        result_str = agent_func(input_text)
        print(f"Agent {name} Response:\n{result_str}\n")
        return {
            "messages": [AIMessage(content=result_str, name=name, id=str(time.time()))]
        }
    except Exception as e:
        print("Error in agent:", e)
        return {
            "messages": [AIMessage(content=f"Error: {str(e)}", name=name, id=str(time.time()))]
        }



WORKFLOW.add_node("supervisor", supervisor_node)
WORKFLOW.add_edge(START, "supervisor")


video_node = functools.partial(agent_node, agent_func=process_query_video, name="VIDEO_YOUTUBE_AGENT")
reddit_node = functools.partial(agent_node, agent_func=process_query_reddit, name="REDDIT_AGENT")
speech_node = functools.partial(agent_node, agent_func=lambda _: process_query_speech_from_file(), name="SPEECH_AGENT")


WORKFLOW.add_node("VIDEO_YOUTUBE_AGENT", video_node)
WORKFLOW.add_node("REDDIT_AGENT", reddit_node)
WORKFLOW.add_node("SPEECH_AGENT", speech_node)

def finish_node(state):
    return {
        "messages": [AIMessage(content="All tasks finished.", name="FINISH", id=str(time.time()))]
    }

WORKFLOW.add_node("FINISH", finish_node)
WORKFLOW.add_edge("FINISH", END)


agent_names = ["VIDEO_YOUTUBE_AGENT", "REDDIT_AGENT", "SPEECH_AGENT", "FINISH"]
map_dict = {k: k for k in agent_names}
WORKFLOW.add_conditional_edges("supervisor", lambda x: x["next"], map_dict)

for agent_n in ["VIDEO_YOUTUBE_AGENT", "REDDIT_AGENT", "SPEECH_AGENT"]:
    WORKFLOW.add_edge(agent_n, "supervisor")


########################################
# 7. Uruchomienie grafu
########################################

GRAPH = WORKFLOW.compile()


def run_graph(graph, user_input: str):
    """Pozwala uruchomić nasz workflow z jednym komunikatem od użytkownika."""
    try:
        result = graph.invoke(
            {
                "messages": [
                    HumanMessage(content=user_input, id=str(time.time()))
                ],
                "tasks": ["VIDEO_YOUTUBE_AGENT", "REDDIT_AGENT", "SPEECH_AGENT"],
            }
        )
        # Ostatnia wiadomość w result to prawdopodobnie to, co zwrócił FINISH
        final_msg = result["messages"][-1].content
        return final_msg
    except Exception as e:
        return f"Could not generate response, because of {e}"


if __name__ == "__main__":
    # Przykładowy test
    user_request = "video to download from youtube: MINECRAFT PARCURE GAME PLAY and only MINECRAFT PARCURE, next find and download only a story from reddit abut relationship"
    final_response = run_graph(GRAPH, user_request)
    print("\n=== FINAL RESPONSE ===")
    print(final_response)