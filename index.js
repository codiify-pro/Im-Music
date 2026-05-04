const express = require("express");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
app.use(express.json());

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

      let videoInfo = [];
      let audioInfo = [];

      streams.forEach((s) => {
        if (s.codec_type === "video") {
          video++;
          videoInfo.push({
            codec: s.codec_name,
            resolution: `${s.width}x${s.height}`
          });
        }

        if (s.codec_type === "audio") {
          audio++;
          audioInfo.push({
            codec: s.codec_name,
            channels: s.channels
          });

          if (s.tags && s.tags.language) {
            languages.add(s.tags.language);
          }
        }

        if (s.codec_type === "subtitle") {
          subtitles++;

          if (s.tags && s.tags.language) {
            languages.add(s.tags.language);
          }
        }
      });

      res.json({
        success: true,
        video,
        audio,
        subtitles,
        languages: Array.from(languages),
        videoInfo,
        audioInfo
      });
    });

  } catch (e) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Metadata API Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
