const KEY_PREFIX = "bsod:scores:";
const MODES = {
  chill: "Chill",
  normal: "Normal",
  nightmare: "Nightmare"
};
const memoryScores = {
  chill: [],
  normal: [],
  nightmare: []
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[^\w .-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function nameKey(value) {
  return sanitizeName(value).toLocaleLowerCase("en-US");
}

function normalizeMode(value) {
  const key = String(value || "").trim().toLocaleLowerCase("en-US");
  return MODES[key] ? key : "";
}

function getRequestMode(req, fallback = "normal") {
  const url = new URL(req.url || "/", "http://localhost");
  return normalizeMode(url.searchParams.get("mode") || url.searchParams.get("difficulty")) || fallback;
}

function validateScore(body) {
  const name = sanitizeName(body.name);
  const playerKey = nameKey(name);
  const mode = normalizeMode(body.mode || body.difficulty);
  const score = Number(body.score);
  const survivalTime = Number(body.survivalTime);

  if (!name || !playerKey) return { error: "Invalid name." };
  if (!mode) return { error: "Invalid mode." };
  if (!Number.isFinite(score) || score < 0 || score > 10000000) return { error: "Invalid score." };
  if (!Number.isFinite(survivalTime) || survivalTime < 0 || survivalTime > 86400) return { error: "Invalid survival time." };

  const maxReasonableScore = survivalTime * 12000 + 20000;
  if (score > maxReasonableScore) return { error: "Score rejected as unrealistic." };

  return {
    mode,
    score: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerKey,
      name,
      score: Math.floor(score),
      survivalTime: Math.floor(survivalTime),
      mode,
      difficulty: MODES[mode],
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

function sortScores(scores) {
  return scores
    .sort((a, b) => b.score - a.score || b.survivalTime - a.survivalTime || new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

function cleanScores(scores, mode) {
  const bestByPlayer = new Map();
  for (const raw of Array.isArray(scores) ? scores : []) {
    const name = sanitizeName(raw.name);
    const playerKey = nameKey(raw.playerKey || raw.name);
    const score = Number(raw.score);
    if (!name || !playerKey || !Number.isFinite(score) || score < 0) continue;
    const entry = {
      id: raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerKey,
      name,
      score: Math.floor(score),
      survivalTime: Math.max(0, Math.floor(Number(raw.survivalTime) || 0)),
      mode,
      difficulty: MODES[mode],
      date: raw.date || new Date().toISOString()
    };
    const existing = bestByPlayer.get(playerKey);
    if (!existing || entry.score > existing.score) bestByPlayer.set(playerKey, entry);
  }
  return sortScores([...bestByPlayer.values()]);
}

async function readScores(mode) {
  const stored = await kvRequest(["GET", `${KEY_PREFIX}${mode}`]);
  if (stored === null) return memoryScores[mode];
  if (!stored) return [];
  try {
    return cleanScores(JSON.parse(stored), mode);
  } catch {
    return [];
  }
}

async function writeScores(mode, scores) {
  const sorted = cleanScores(scores, mode);
  const result = await kvRequest(["SET", `${KEY_PREFIX}${mode}`, JSON.stringify(sorted)]);
  if (result === null) {
    memoryScores[mode] = sorted;
  }
  return sorted;
}

async function upsertScore(score) {
  const scores = await readScores(score.mode);
  const existing = scores.find(entry => entry.playerKey === score.playerKey);

  if (existing && score.score <= existing.score) {
    return { status: "ignored", saved: false, entry: existing, scores };
  }

  const next = existing
    ? scores.map(entry => entry.playerKey === score.playerKey ? score : entry)
    : [...scores, score];
  const saved = await writeScores(score.mode, next);
  return {
    status: existing ? "updated" : "saved",
    saved: true,
    entry: score,
    scores: saved
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const mode = getRequestMode(req);
      const scores = await readScores(mode);
      return json(res, 200, { mode, difficulty: MODES[mode], scores });
    }

    if (req.method === "POST") {
      const validation = validateScore(req.body || {});
      if (validation.error) return json(res, 400, { error: validation.error });

      const result = await upsertScore(validation.score);
      return json(res, result.saved ? 201 : 200, {
        ok: true,
        mode: validation.mode,
        difficulty: MODES[validation.mode],
        result: result.status,
        saved: result.saved,
        entry: result.entry,
        scores: result.scores
      });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed." });
  } catch {
    return json(res, 500, { error: "Leaderboard unavailable." });
  }
}
