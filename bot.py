import os
import asyncio
import requests
from pyrogram import Client, filters
from pyrogram.types import Message
from googleapiclient.discovery import build
from motor.motor_asyncio import AsyncIOMotorClient

# --- Credentials & Configuration ---
API_ID = 32541562
API_HASH = "e37e4432298d5a5eb4a6e32c18804283"
BOT_TOKEN = "8695304589:AAHhqPYAteFe7AR01GUOSAToMZpyDrzXslU"
MONGO_URI = "mongodb+srv://aaryansah954:QgDQRgyD7VUa7Eho@cluster0.wjo9zfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
ADMIN_ID = 7006602588
YOUTUBE_API = "AIzaSyDyjrm-og8KaN1CmxRmd-2ipz-bkRgHylk"

# --- Database & Bot Initialization ---
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client["MusicBot"]
users_col = db["users"]

app = Client("MusicBot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN)

# --- Helper Functions ---
def search_youtube(query):
    """Searches YouTube and returns the video URL and title."""
    try:
        youtube = build('youtube', 'v3', developerKey=YOUTUBE_API)
        request = youtube.search().list(q=query, part='snippet', maxResults=1, type='video')
        response = request.execute()
        items = response.get('items', [])
        
        if not items:
            return None, None
            
        video_id = items[0]['id']['videoId']
        title = items[0]['snippet']['title']
        return f"https://www.youtube.com/watch?v={video_id}", title
    except Exception as e:
        print(f"YT Search Error: {e}")
        return None, None

def download_mp3(url, chat_id):
    """Downloads audio using the free Cobalt API to completely bypass IP Blocks."""
    output_filename = f"audio_{chat_id}.mp3"
    api_url = "https://api.cobalt.tools/api/json"
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    data = {
        "url": url,
        "isAudioOnly": True,
        "aFormat": "mp3"
    }
    
    # 1. Cobalt API से डाउनलोड लिंक लें
    resp = requests.post(api_url, json=data, headers=headers)
    resp.raise_for_status()
    res_json = resp.json()
    
    if res_json.get("status") == "error":
        raise Exception(f"Cobalt API Error: {res_json.get('text', 'Unknown Error')}")
        
    download_url = res_json.get("url")
    if not download_url:
        raise Exception("API ne download link generate nahi kiya.")
        
    # 2. उस लिंक से MP3 फाइल रेंडर सर्वर पर डाउनलोड करें
    audio_data = requests.get(download_url, stream=True)
    audio_data.raise_for_status()
    
    with open(output_filename, 'wb') as f:
        for chunk in audio_data.iter_content(chunk_size=8192):
            f.write(chunk)
            
    return output_filename

# --- Bot Command Handlers ---
@app.on_message(filters.command("start"))
async def start_cmd(client: Client, message: Message):
    user_id = message.from_user.id
    if not await users_col.find_one({"user_id": user_id}):
        await users_col.insert_one({
            "user_id": user_id, 
            "username": message.from_user.username,
            "first_name": message.from_user.first_name
        })
    
    await message.reply_text("Hello! Welcome to the Music Bot. 🎵\n\nSimply send me the name of any song, and I will fetch the high-quality MP3 for you.")

@app.on_message(filters.command("stats") & filters.user(ADMIN_ID))
async def stats_cmd(client: Client, message: Message):
    count = await users_col.count_documents({})
    await message.reply_text(f"📊 **Bot Statistics:**\nTotal Registered Users: {count}")

@app.on_message(filters.text & ~filters.command(["start", "stats"]))
async def handle_song(client: Client, message: Message):
    query = message.text.strip()
    status_msg = await message.reply_text(f"🔍 Searching YouTube for: `{query}`...")

    loop = asyncio.get_event_loop()
    video_url, video_title = await loop.run_in_executor(None, search_youtube, query)

    if not video_url:
        await status_msg.edit_text("❌ Song not found, or the API limit has been reached.")
        return

    await status_msg.edit_text(f"⏳ Found: **{video_title}**\nDownloading MP3 safely via API...")

    try:
        mp3_file = await loop.run_in_executor(None, download_mp3, video_url, message.chat.id)
        
        await status_msg.edit_text("📤 Uploading track to Telegram...")
        
        await client.send_audio(
            chat_id=message.chat.id,
            audio=mp3_file,
            title=video_title,
            caption=f"🎵 **{video_title}**\n🔗 [Source Link]({video_url})"
        )
        
        await status_msg.delete()
        if os.path.exists(mp3_file):
            os.remove(mp3_file)
            
    except Exception as e:
        error_details = str(e)[:800] 
        print(f"Process Error: {error_details}")
        await status_msg.edit_text(f"❌ **Error Occurred:**\n\n`{error_details}`")

if __name__ == "__main__":
    print("Initializing API-based bot service...")
    app.run()
