
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST method"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key missing"
    });
  }

  const transcript = req.body?.transcript;
  const duration = Number(req.body?.duration || 30);

  if (
    typeof transcript !== "string" ||
    transcript.trim().length < 50 ||
    transcript.length > 20000
  ) {
    return res.status(400).json({
      error: "Transcript must contain 50 to 20000 characters"
    });
  }

  if (![30, 45, 60].includes(duration)) {
    return res.status(400).json({
      error: "Invalid clip duration"
    });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: `
You are an expert short-form video editor.

Analyze this timestamped transcript and find up to 5 interesting clips.

Each clip should:
- Have a strong opening hook.
- Contain an interesting or emotional moment.
- Make sense independently.
- Be suitable for YouTube Shorts and Reels.
- Have approximately ${duration} seconds duration.

Return ONLY valid JSON in this exact structure:

{
  "clips": [
    {
      "title": "Clip title",
      "start": 30,
      "end": 60,
      "score": 95,
      "reason": "Why this moment is interesting"
    }
  ]
}

Scores must be estimates from 1 to 100.
Timestamps must come from the supplied transcript.
Never invent timestamps.

TRANSCRIPT:
${transcript}
          `
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "Gemini API request failed",
        details: data.error?.message || "Unknown error"
      });
    }

    const output = data.output_text;

    if (!output) {
      throw new Error("Gemini returned no text");
    }

    const cleanOutput = output
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleanOutput);

    return res.status(200).json({
      success: true,
      clips: result.clips
    });

  } catch (error) {
    return res.status(500).json({
      error: "AI analysis failed",
      details: error.message
    });
  }
}
