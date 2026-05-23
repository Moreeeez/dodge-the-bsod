# Dodge the BSOD

Retro Windows-style browser arcade game with a Vercel-ready leaderboard.

## Local Testing

Install the Vercel CLI dependency:

```bash
npm install
npm run dev
```

Open the local URL shown by Vercel, usually `http://localhost:3000`.

The game can also be opened as static files, but the leaderboard API requires `vercel dev` or a Vercel deployment.

## Leaderboard Storage

The API uses Vercel KV through the REST API when these environment variables are present:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Create a Vercel KV database in your Vercel project, then connect it to the project so those variables are added automatically.

For local development without KV, scores use an in-memory fallback. This is only for testing and resets when the dev server restarts.

Leaderboard scores are stored under namespaced keys:

```text
bsod:scores:chill
bsod:scores:normal
bsod:scores:nightmare
```

Each key keeps the top 10 best scores for that mode, with only one entry per normalized player name.

Older deployments that used the flat `dodge-bsod:scores` key are still read by the API. Matching legacy scores are folded into the mode-specific leaderboard display so existing scores are not lost.

## Deploy To Vercel

1. Push this folder to a Git repository.
2. Import the project in Vercel.
3. Add/connect Vercel KV for persistent leaderboard storage.
4. Deploy.

The frontend calls `/api/scores`, so it works on Vercel without hardcoded hostnames.

## API

- `GET /api/scores` or `GET /api/scores?mode=all` returns the top 10 combined scores.
- `GET /api/scores?mode=chill` returns the top 10 Chill scores.
- `GET /api/scores?mode=normal` returns the top 10 Normal scores.
- `GET /api/scores?mode=nightmare` returns the top 10 Nightmare scores.
- `POST /api/scores` accepts `{ name, score, survivalTime, mode }`.

Scores are validated for missing fields, invalid names, invalid modes, negative values, and clearly unrealistic score/time ratios. If a player submits another score for the same mode, the API updates their entry only when the new score is higher.
