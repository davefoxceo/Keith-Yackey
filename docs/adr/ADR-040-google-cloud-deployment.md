# ADR-040: Google Cloud Deployment Architecture

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith AI currently runs as a local development demo. Moving to production requires a hosting environment that supports containerized Node.js services, persistent storage for the Ruvector REDB vector database, managed SSL, and scale-to-zero capability to keep costs low during early launch when traffic is unpredictable. The team already has Google Cloud familiarity and an existing GCP organization.

Key constraints:
- Budget target: under $300/month at launch (< 500 active users)
- Must support scale-to-zero to avoid paying for idle compute overnight
- Ruvector REDB file needs persistent storage (not ephemeral container filesystem)
- API keys (Anthropic, Stripe, Resend) must be stored securely, not in environment files
- The web frontend is a Next.js app that can deploy to Vercel or be containerized

## Decision

Deploy to **Google Cloud Run** for the API and **Vercel** for the web frontend.

### Architecture Overview

```
[Users] --> [Vercel - Next.js Frontend]
                |
                v
        [Cloud Run - NestJS API]
                |
        +-------+-------+
        |               |
  [Cloud SQL]    [Persistent Volume]
  (PostgreSQL)   (Ruvector REDB file)
        |
  [Secret Manager]
  (API keys, credentials)
```

### Component Decisions

| Component | Service | Rationale |
|-----------|---------|-----------|
| **API Server** | Cloud Run (containerized NestJS) | Scale-to-zero, pay-per-request, managed TLS |
| **Web Frontend** | Vercel (Next.js) | Zero-config Next.js deployment, edge CDN, automatic preview deploys |
| **Structured Data** | Cloud SQL (PostgreSQL, db-f1-micro) | Managed backups, familiar SQL, smallest instance is ~$7/mo |
| **Vector Store** | Cloud Run volume mount + Cloud Storage backup | REDB file persists across container restarts; nightly backup to GCS bucket |
| **Secrets** | Secret Manager | API keys for Anthropic, Stripe, Resend; mounted as env vars in Cloud Run |
| **Domain** | app.marriedgame.com | Matches existing brand; DNS managed in Cloud DNS or Vercel |
| **SSL** | Managed by Cloud Run + Vercel | Automatic certificate provisioning and renewal |

### Container Configuration

The API Dockerfile:
- Base image: `node:20-alpine`
- Bundle the NestJS compiled output and the Ruvector REDB file
- Expose port 8080 (Cloud Run default)
- Health check endpoint at `/health`
- Memory: 512MB minimum (REDB needs memory-mapped file access)
- CPU: 1 vCPU, can burst to 2
- Concurrency: 80 requests per instance (NestJS handles concurrent async well)
- Min instances: 0 (scale to zero), Max instances: 10

### CI/CD Pipeline

```
GitHub push to main
  --> GitHub Actions workflow triggers
  --> Run tests (npm test)
  --> Build Docker image
  --> Push to Artifact Registry (us-central1-docker.pkg.dev)
  --> Deploy to Cloud Run (gcloud run deploy)
  --> Vercel auto-deploys frontend from same push
```

### Environment Strategy

| Environment | API | Frontend | Database |
|-------------|-----|----------|----------|
| **Development** | Local Docker | localhost:3000 | SQLite or local PostgreSQL |
| **Staging** | Cloud Run (staging service) | Vercel preview branch | Cloud SQL (staging instance) |
| **Production** | Cloud Run (prod service) | Vercel production | Cloud SQL (prod instance) |

### Monitoring and Alerting

- **Logging**: Cloud Logging (structured JSON logs from NestJS)
- **Metrics**: Cloud Monitoring dashboards for request latency, error rate, instance count
- **Alerts**: PagerDuty or email alerts for error rate > 5%, latency p95 > 3s, or instance count hitting max
- **Uptime checks**: Cloud Monitoring HTTPS check on `/health` every 60 seconds
- **Cost alerts**: Budget alert at $200/mo and $300/mo thresholds

## Implementation

### Phase 1: Containerize and Deploy API

1. Create `Dockerfile` and `.dockerignore` in API package
2. Set up Artifact Registry repository
3. Create Cloud Run service with Secret Manager bindings
4. Configure Cloud SQL instance and connection
5. Set up persistent volume for REDB file

### Phase 2: CI/CD and Environments

1. GitHub Actions workflow for build, test, push, deploy
2. Staging environment with separate Cloud Run service
3. Vercel project linked to GitHub repo for frontend

### Phase 3: Monitoring and Hardening

1. Structured logging format
2. Cloud Monitoring dashboard
3. Alert policies
4. Nightly REDB backup to Cloud Storage

## Consequences

### Positive

- **Scale-to-zero** keeps costs near zero during off-peak hours (nights, early mornings)
- Estimated launch cost: $100-150/month (Cloud SQL $7 + Cloud Run ~$50-100 + GCS $1 + Secret Manager $1)
- Vercel handles frontend CDN, preview deploys, and edge caching at no cost on Pro plan
- Managed SSL eliminates certificate management overhead
- Secret Manager is more secure than `.env` files in containers

### Negative

- Cloud Run cold starts add 2-5 seconds on first request after idle period
- Cloud SQL minimum cost exists even when idle ($7/month for db-f1-micro)
- Two deployment targets (Vercel + Cloud Run) means two sets of deployment configs
- Persistent volume for REDB adds complexity compared to a managed vector database

### Mitigations

- Set Cloud Run min-instances to 1 during business hours (8am-10pm) via scheduled scaling to avoid cold starts
- Consider migrating REDB to Firestore-backed Pi-Brain if persistent volume proves unreliable
- Use a single GitHub Actions workflow that deploys both API and triggers Vercel rebuild
