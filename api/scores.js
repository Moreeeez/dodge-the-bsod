const KEY = "dodge-bsod:scores";
const memoryScores = [];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function normalizeDifficulty(value) {
  return ["Chill", "Normal", "Nightmare"].includes(value) ? value : "";
}

function validateScore(body) {
  const name = sanitizeName(body.name);
  const difficulty = normalizeDifficulty(body.difficulty);
  const score = Number(body.score);
  const survivalTime = Number(body.survivalTime);

  if (!name) return { error: "Invalid name." };
  if (!difficulty) return { error: "Invalid difficulty." };
  if (!Number.isFinite(score) || score < 0 || score > 10000000) return { error: "Invalid score." };
  if (!Number.isFinite(survivalTime) || survivalTime < 0 || survivalTime > 86400) return { error: "Invalid survival time." };

  const maxReasonableScore = survivalTime * 12000 + 20000;
  if (score > maxReasonableScore) return { error: "Score rejected as unrealistic." };

  return {
    score: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      score: Math.floor(score),
      survivalTime: Math.floor(survivalTime),
      difficulty,
      date: new Date().toISOString()
    }
  };
}

async function kvRequest(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });

  if (!response.ok) throw new Error(`KV request failed: ${response.status}`);
  const data = await response.json();
  return data?.[0]?.result;
}

async function readScores() {
  const stored = await kvRequest(["GET", KEY]);
  if (stored === null) return memoryScores;
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

async function writeScores(scores) {
  const sorted = scores
    .sort((a, b) => b.score - a.score || b.survivalTime - a.survivalTime)
    .slice(0, 10);
  const result = await kvRequest(["SET", KEY, JSON.stringify(sorted)]);
  if (result === null) {
    memoryScores.length = 0;
    memoryScores.push(...sorted);
  }
  return sorted;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const scores = await readScores();
      return json(res, 200, { scores: scores.slice(0, 10) });
    }

    if (req.method === "POST") {
      const validation = validateScore(req.body || {});
      if (validation.error) return json(res, 400, { error: validation.error });

      const scores = await readScores();
      const saved = await writeScores([...scores, validation.score]);
      return json(res, 201, { ok: true, scores: saved.slice(0, 10) });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 500, { error: "Leaderboard unavailable." });
  }
}
