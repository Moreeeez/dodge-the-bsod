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

## Deploy To Vercel

1. Push this folder to a Git repository.
2. Import the project in Vercel.
3. Add/connect Vercel KV for persistent leaderboard storage.
4. Deploy.

The frontend calls `/api/scores`, so it works on Vercel without hardcoded hostnames.

## API

- `GET /api/scores` returns the top 10 scores.
- `POST /api/scores` accepts `{ name, score, survivalTime, difficulty }`.

Scores are validated for missing fields, invalid names, invalid difficulties, negative values, and clearly unrealistic score/time ratios.
