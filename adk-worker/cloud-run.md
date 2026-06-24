# ADK Worker Cloud Run Deployment

This service exposes the ADK trade-intent worker as an HTTP API for the Next.js
backend. It replaces the Vercel Node runtime `python3` spawn path.

## Endpoints

- `GET /health`
- `POST /run-trade-intents`

`POST /run-trade-intents` accepts the same payload shape the backend previously
sent to `main.py --stdin`.

## Required Environment Variables

- `GOOGLE_API_KEY`: Google ADK/Gemini API key
- `ADK_WORKER_TOKEN`: shared bearer token checked by the worker

## Optional Environment Variables

- `GEMINI_MODEL`: defaults to `gemini-2.5-flash-lite`
- `ADK_WORKER_CONCURRENCY`: defaults to `5`
- `MAX_CANDIDATES_PER_RUN`: defaults to `15`

## Recommended Production Setup

Use Secret Manager for `GOOGLE_API_KEY` and `ADK_WORKER_TOKEN`, then expose the
Cloud Run HTTPS URL to the Vercel app with `ADK_WORKER_URL`.

Set these shell variables first:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="asia-northeast3"
export SERVICE_NAME="chicken-stock-adk-worker"
export ADK_WORKER_TOKEN_VALUE="YOUR_SHARED_TOKEN"
export GOOGLE_API_KEY_VALUE="YOUR_GOOGLE_API_KEY"
```

Create or update secrets:

```bash
printf "%s" "$GOOGLE_API_KEY_VALUE" | gcloud secrets create GOOGLE_API_KEY \
  --project "$PROJECT_ID" \
  --replication-policy automatic \
  --data-file=-

printf "%s" "$ADK_WORKER_TOKEN_VALUE" | gcloud secrets create ADK_WORKER_TOKEN \
  --project "$PROJECT_ID" \
  --replication-policy automatic \
  --data-file=-
```

If the secrets already exist, add new versions instead:

```bash
printf "%s" "$GOOGLE_API_KEY_VALUE" | gcloud secrets versions add GOOGLE_API_KEY \
  --project "$PROJECT_ID" \
  --data-file=-

printf "%s" "$ADK_WORKER_TOKEN_VALUE" | gcloud secrets versions add ADK_WORKER_TOKEN \
  --project "$PROJECT_ID" \
  --data-file=-
```

Deploy from the repository root:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --source adk-worker \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ADK_WORKER_TOKEN=ADK_WORKER_TOKEN:latest
```

Read the deployed URL:

```bash
export ADK_WORKER_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format 'value(status.url)')"

echo "$ADK_WORKER_URL"
```

Connect the Vercel app to Cloud Run:

```bash
vercel env add ADK_WORKER_URL production
vercel env add ADK_WORKER_TOKEN production
vercel env add ADK_WORKER_TIMEOUT_MS production
```

Use these values:

- `ADK_WORKER_URL`: value printed by `echo "$ADK_WORKER_URL"`
- `ADK_WORKER_TOKEN`: same token as `ADK_WORKER_TOKEN_VALUE`
- `ADK_WORKER_TIMEOUT_MS`: `90000`

Then redeploy the Vercel app so the new env vars are available to the backend.

## Smoke Test

Health check:

```bash
curl "$ADK_WORKER_URL/health"
```

Unauthorized check. This should return `401` when `ADK_WORKER_TOKEN` is set:

```bash
curl -i -X POST "$ADK_WORKER_URL/run-trade-intents" \
  -H "Content-Type: application/json" \
  -d '{"useMock":true,"agents":[]}'
```

Authorized mock trade-intent check:

```bash
curl -X POST "$ADK_WORKER_URL/run-trade-intents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADK_WORKER_TOKEN_VALUE" \
  -d '{
    "useMock": true,
    "agents": [
      {
        "agentType": "VALUE",
        "candidates": [
          {
            "agentUserId": 1,
            "stockId": 1,
            "symbol": "TEST",
            "name": "Test",
            "price": 100,
            "per": 10,
            "pbr": 1,
            "epsGrowthRate": null,
            "revenueGrowthRate": 10,
            "operatingProfitGrowthRate": 10,
            "ma20": 90,
            "ma60": 80,
            "rsi": 50,
            "volumeRatio": 1.2,
            "priceChangeRate20d": 5,
            "averageVolume20d": 1000,
            "ruleBasedScore": 80
          }
        ]
      }
    ]
  }'
```

Expected response shape:

```json
{
  "data": [
    {
      "agentUserId": 1,
      "agentType": "VALUE",
      "decisionSource": "ADK",
      "stockId": 1,
      "side": "BUY",
      "quantity": 10,
      "reason": "...",
      "score": 80
    }
  ],
  "errors": [],
  "ok": true,
  "tookMs": 0
}
```

## Fallback Plain Env Deploy

Run from the repository root:

```bash
gcloud run deploy chicken-stock-adk-worker \
  --source adk-worker \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,ADK_WORKER_TOKEN=YOUR_SHARED_TOKEN
```

If you use Secret Manager, prefer secret-backed env vars instead of plaintext:

```bash
gcloud run deploy chicken-stock-adk-worker \
  --source adk-worker \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ADK_WORKER_TOKEN=ADK_WORKER_TOKEN:latest
```

Cloud Run still receives public HTTPS traffic with `--allow-unauthenticated`;
the application-level `ADK_WORKER_TOKEN` blocks unauthorized callers.

## Local Docker Smoke Test

```bash
docker build -t chicken-stock-adk-worker adk-worker
docker run --rm -p 8080:8080 \
  -e ADK_WORKER_TOKEN=local-token \
  -e GOOGLE_API_KEY=unused \
  chicken-stock-adk-worker
```

Health check:

```bash
curl http://localhost:8080/health
```

Mock trade-intent check:

```bash
curl -X POST http://localhost:8080/run-trade-intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-token" \
  -d '{
    "useMock": true,
    "agents": [
      {
        "agentType": "VALUE",
        "candidates": [
          {
            "agentUserId": 1,
            "stockId": 1,
            "symbol": "TEST",
            "name": "Test",
            "price": 100,
            "per": 10,
            "pbr": 1,
            "epsGrowthRate": null,
            "revenueGrowthRate": 10,
            "operatingProfitGrowthRate": 10,
            "ma20": 90,
            "ma60": 80,
            "rsi": 50,
            "volumeRatio": 1.2,
            "priceChangeRate20d": 5,
            "averageVolume20d": 1000,
            "ruleBasedScore": 80
          }
        ]
      }
    ]
  }'
```

## Backend Integration Env

After deployment, configure the Next.js app with:

- `ADK_WORKER_URL`: Cloud Run service URL
- `ADK_WORKER_TOKEN`: same shared token
- `ADK_WORKER_TIMEOUT_MS`: optional backend request timeout, defaults to `90000`
- `ADK_WORKER_USE_MOCK`: optional, set to `true` only for smoke tests

When `ADK_WORKER_URL` is missing, the backend records ADK decisions as failed
with `ADK_WORKER_URL_MISSING` and falls back to the rule-based decision. The
Vercel build no longer installs Python dependencies because ADK execution is
handled by Cloud Run.
