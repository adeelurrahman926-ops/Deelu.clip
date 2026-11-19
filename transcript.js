
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

  const apiKey = process.env.SUPADATA_API_KEY;
  const url = req.body?.url;

  if (!apiKey) {
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

    const response = await fetch(
      `https://api.supadata.ai/v1/transcript?${params}`,
      {
        headers: {
          "x-api-key": apiKey,
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || data.error || "Transcript request failed"
      });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
