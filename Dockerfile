# Use Python 3.11 to fix deprecation warnings
FROM python:3.11-slim

# Install FFmpeg for yt-dlp, Git for the latest version, AND Node.js to solve YouTube's JS challenges
RUN apt-get update && apt-get install -y ffmpeg git nodejs

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files to the container
COPY . .

# Start a dummy web server to satisfy Render's port scan, then start the bot
CMD sh -c "python -m http.server ${PORT:-10000} & python bot.py"
