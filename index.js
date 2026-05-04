const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { execSync } = require("child_process");
const https = require("https");

const app = express();
app.use(express.json());

// ✅ ffprobe download (one time)
if (!fs.existsSync("./ffprobe")) {
  execSync(`curl -L https://github.com/joshwnj/ffprobe-static/releases/latest/download/linux-x64 -o ffprobe && chmod +x ffprobe`);
}

ffmpeg.setFfprobePath("./ffprobe");

// 🔥 MAIN STREAM FUNCTION (IMPORTANT)
function probeFromUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Range": "bytes=0-2000000" // only first 2MB
      }
    }, (res) => {

      ffmpeg.ffprobe(res, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });

    });

    req.on("error", reject);
  });
}

app.post("/analyze", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.json({ success: false, error: "No URL" });
    }

    const metadata = await probeFromUrl(url);

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

  } catch (e) {
    console.log("ERROR:", e.message);

    res.json({
      success: false,
      error: "Stream read failed (telegram protected / unsupported)"
    });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Advanced Metadata API Running");
});

app.listen(process.env.PORT || 3000);
