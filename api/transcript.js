
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST method" });
  }

  const key = process.env.SUPADATA_API_KEY;
  const url = req.body?.url;

  if (!key) {
    return res.status(500).json({ error: "Supadata API key missing" });
  }

  if (!url || !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const params = new URLSearchParams({
      url,
      text: "false",
      mode: "native"
    });

    let response = await fetch(
      `https://api.supadata.ai/v1/transcript?${params}`,
      { headers: { "x-api-key": key } }
    );

    let data = await response.json();

    if (response.status === 206 || !response.ok) {
      return res.status(502).json({
        error: data.message || data.error || "Transcript unavailable"
      });
    }

    if (data.jobId) {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        response = await fetch(
          `https://api.supadata.ai/v1/transcript/${encodeURIComponent(data.jobId)}`,
          { headers: { "x-api-key": key } }
        );

        data = await response.json();

        if (data.status === "completed") break;
        if (data.status === "failed") {
          throw new Error(data.error?.message || "Transcript job failed");
        }
      }
    }

    if (data.jobId || data.status === "queued" || data.status === "active") {
      return res.status(202).json({
        error: "Transcript is taking longer. Please try again."
      });
    }

    let transcript = "";

    if (Array.isArray(data.content)) {
      transcript = data.content.map(item => {
        const seconds = Math.floor(item.offset / 1000);
        const time = new Date(seconds * 1000)
          .toISOString().substring(11, 19);
        return `[${time}] ${item.text}`;
      }).join("\n");
    } else if (typeof data.content === "string") {
      transcript = data.content;
    }

    if (transcript.length < 50) {
      throw new Error("No usable captions found for this video.");
    }

    return res.status(200).json({
      success: true,
      transcript,
      language: data.lang || "unknown"
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
