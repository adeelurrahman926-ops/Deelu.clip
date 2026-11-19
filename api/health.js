
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const apiReady = Boolean(process.env.GEMINI_API_KEY);

  return res.status(200).json({
    success: true,
    project: "Deelu Clips",
    backend: "Connected",
    gemini: apiReady ? "API key detected" : "API key missing"
  });
}
