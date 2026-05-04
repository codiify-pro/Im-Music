const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { execSync } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json());

// 🔥 auto ffprobe
if (!fs.existsSync("./ffprobe")) {
  execSync(`curl -L https://github.com/joshwnj/ffprobe-static/releases/latest/download/linux-x64 -o ffprobe && chmod +x ffprobe`);
}

ffmpeg.setFfprobePath("./ffprobe");

// 🔥 STREAM FUNCTION (NO FULL DOWNLOAD)
function streamProbe(url, callback) {
  https.get(url, (res) => {
    ffmpeg.ffprobe(res, (err, metadata) => {
      callback(err, metadata);
    });
  }).on("error", (err) => {
    callback(err, null);
  });
}

app.post("/analyze", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({ success: false, error: "No URL" });
    }

    streamProbe(url, (err, metadata) => {

      if (err) {
        console.log(err.message);
        return res.json({
          success: false,
          error: "Large/protected file issue"
        });
      }

      const streams = metadata.streams;

      let video = 0, audio = 0, subtitles = 0;
      let languages = new Set();
      let videoInfo = [];
      let audioInfo = [];

      streams.forEach(s => {
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

          if (s.tags?.language) {
            languages.add(s.tags.language);
          }
        }

        if (s.codec_type === "subtitle") {
          subtitles++;
          if (s.tags?.language) {
            languages.add(s.tags.language);
          }
        }
      });

      res.json({
        success: true,
        video,
        audio,
        subtitles,
        languages: [...languages],
        videoInfo,
        audioInfo
      });

    });

  } catch (e) {
    res.json({ success: false, error: "Server crash" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ PRO Metadata API Running (4GB+ Support)");
});

app.listen(process.env.PORT || 3000);
