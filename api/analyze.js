
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini key missing" });
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
      error: "Invalid duration"
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
          model: "gemini-3.5-flash-lite",
          input: `Analyze this transcript and find up to 5 engaging short video clips.

Each clip should be approximately ${duration} seconds.

Return only JSON:
{
 "clips": [
  {
   "title": "Clip title",
   "start": 30,
   "end": 60,
   "score": 95,
   "reason": "Why it is interesting"
  }
 ]
}

Use timestamps only when supported by the transcript.
Scores are estimates from 1 to 100.

TRANSCRIPT:
${transcript}`
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error?.message || "Gemini request failed"
      });
    }

    const output = (data.steps || [])
      .filter(step => step.type === "model_output")
      .flatMap(step => step.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");

    if (!output) {
      throw new Error("No AI output received");
    }

    const clean = output
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(clean);

    if (!Array.isArray(result.clips)) {
      throw new Error("Invalid AI response");
    }

    return res.status(200).json({
      success: true,
      clips: result.clips
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
