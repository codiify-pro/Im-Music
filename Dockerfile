# Base image for Python
FROM python:3.10-slim

# Install FFmpeg (Required by yt-dlp for audio conversion)
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Command to run the bot
CMD ["python", "bot.py"]
