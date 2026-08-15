# Use Python 3.11
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files to the container
COPY . .

# Start a dummy web server to satisfy Render's port scan, then start the bot
CMD sh -c "python -m http.server ${PORT:-10000} & python bot.py"
