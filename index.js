const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());

// 🔥 AUTO DOWNLOAD FFMPEG (FIRST RUN)
const setupFFmpeg = () => {
  if (!fs.existsSync("./ffmpeg")) {
    console.log("Downloading FFmpeg...");

    execSync(`
      curl -L https://github.com/eugeneware/ffmpeg-static/releases/latest/download/linux-x64 -o ffmpeg &&
      chmod +x ffmpeg
    `);

    execSync(`
      curl -L https://github.com/joshwnj/ffprobe-static/releases/latest/download/linux-x64 -o ffprobe &&
      chmod +x ffprobe
    `);
  }
};

setupFFmpeg();

// 👇 USE DOWNLOADED BINARIES
ffmpeg.setFfmpegPath("./ffmpeg");
ffmpeg.setFfprobePath("./ffprobe");

app.post("/analyze", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    ffmpeg.ffprobe(url, (err, metadata) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const streams = metadata.streams;

      let video = 0;
      let audio = 0;
      let subtitles = 0;
      let languages = new Set();

      streams.forEach((s) => {
        if (s.codec_type === "video") video++;
        if (s.codec_type === "audio") {
          audio++;
          if (s.tags?.language) languages.add(s.tags.language);
        }
        if (s.codec_type === "subtitle") {
          subtitles++;
          if (s.tags?.language) languages.add(s.tags.language);
        }
      });

      res.json({
        success: true,
        video,
        audio,
        subtitles,
        languages: [...languages]
      });
    });

  } catch (e) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Metadata API Running");
});

app.listen(process.env.PORT || 3000);
