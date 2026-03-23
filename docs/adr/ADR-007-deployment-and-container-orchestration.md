# ADR-007: Deployment and Container Orchestration

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI platform consists of multiple backend workloads with different runtime characteristics:

1. **API Server** — NestJS REST API handling user requests, authentication, subscription management, and content delivery. Needs persistent processes, auto-scaling, and health checks. Expected traffic: 50-200 requests/second at peak.
2. **WebSocket Server** — Persistent WebSocket connections for real-time features (typing indicators, multi-device sync, live coaching session state). Requires sticky sessions and long-lived connections.
3. **AI Proxy** — Streams Claude API responses to clients via SSE. Connections last 5-30 seconds during AI response generation. Must handle concurrent streaming connections efficiently.
4. **Content Pipeline Workers** — Batch jobs for podcast transcription (via Whisper API), Instagram content ingestion, content chunking, and embedding generation. Jobs run on-demand when new content is published, not continuously.

We evaluated:

1. **ECS Fargate** — Serverless containers managed by AWS, no EC2 instances to maintain.
2. **ECS on EC2** — Containers on self-managed EC2 instances for more control and cost optimization.
3. **AWS Lambda** — Serverless functions for event-driven workloads.
4. **Kubernetes (EKS)** — Full container orchestration platform.
5. **AWS App Runner** — Simplified container deployment (similar to Heroku).

Kubernetes (EKS) was eliminated due to operational complexity disproportionate to our team size (1-2 backend engineers) and scale. App Runner was eliminated due to limited WebSocket support and lack of fine-grained networking controls.

**Decision:**

We will use a **hybrid approach**:

- **ECS Fargate** for the API server, WebSocket server, and AI proxy (long-running processes)
- **AWS Lambda** for content pipeline batch jobs (event-driven, sporadic workloads)

### ECS Fargate Configuration

```yaml
# API + AI Proxy Service
Service: coach-keith-api
Tasks: 2 (min) to 6 (max)
CPU: 1024 (1 vCPU)
Memory: 2048 (2 GB)
Auto-scaling: Target CPU utilization 60%
Health check: GET /health (30s interval)
Load balancer: ALB with path-based routing
Deployment: Rolling update (minimum healthy 50%)

# WebSocket Service
Service: coach-keith-ws
Tasks: 2 (min) to 4 (max)
CPU: 512 (0.5 vCPU)
Memory: 1024 (1 GB)
Auto-scaling: Target connection count
Load balancer: ALB with sticky sessions (cookie-based)
Health check: WebSocket ping/pong
```

### Lambda Configuration

```yaml
# Content Pipeline Functions
transcribe-podcast:
  Runtime: Node.js 22
  Memory: 1024 MB
  Timeout: 900 seconds (15 min max)
  Trigger: S3 event (new audio file uploaded)
  Concurrency: Reserved 2

chunk-and-embed:
  Runtime: Node.js 22
  Memory: 512 MB
  Timeout: 300 seconds
  Trigger: SQS queue (transcription complete)
  Concurrency: Reserved 5

ingest-instagram:
  Runtime: Node.js 22
  Memory: 256 MB
  Timeout: 60 seconds
  Trigger: EventBridge scheduled rule (daily at 2 AM UTC)
  Concurrency: Reserved 1
```

### Networking

- **VPC**: Custom VPC with public subnets (ALB), private subnets (ECS tasks, Lambda, RDS, ElastiCache)
- **NAT Gateway**: Single NAT Gateway for outbound internet access from private subnets (Claude API, Stripe API calls)
- **Security Groups**: Least-privilege rules — ECS tasks can reach RDS (5432) and ElastiCache (6379), Lambda can reach RDS and SQS
- **ALB**: Application Load Balancer with HTTPS termination (ACM certificate for `api.coachkeith.ai`)

### CI/CD Pipeline (GitHub Actions)

1. **Build**: `docker build` with multi-stage Dockerfile (builder + runtime)
2. **Test**: Run unit and integration tests in CI
3. **Push**: Push Docker image to ECR with git SHA tag
4. **Deploy**: Update ECS service with new task definition via `aws ecs update-service`
5. **Verify**: Wait for deployment stabilization, run smoke tests against staging
6. **Promote**: Deploy to production with manual approval gate

**Consequences:**

### Pros (+)
- **Fargate eliminates server management**: No EC2 instances to patch, scale, or monitor. AWS manages the underlying compute, allowing the small team to focus on application code rather than infrastructure operations.
- **Lambda is ideal for batch workloads**: Content pipeline jobs run sporadically (a few times per week when Keith publishes new content). Lambda's pay-per-invocation model means zero cost when no content is being processed, compared to Fargate tasks that would run 24/7 waiting for work.
- **Independent scaling**: The API service, WebSocket service, and content pipeline scale independently. A spike in AI coaching requests doesn't affect WebSocket connection capacity, and vice versa.
- **Cost-effective at our scale**: Estimated Fargate cost for 2 API tasks + 2 WebSocket tasks running 24/7: ~$120/month. Lambda content pipeline: ~$5/month. Total compute: ~$125/month.
- **Rolling deployments with zero downtime**: ECS rolling updates ensure at least one healthy task is always serving traffic during deployments.

### Cons (-)
- **Fargate cold starts**: New Fargate tasks take 30-60 seconds to pull the Docker image, start the container, and pass health checks. During sudden traffic spikes, auto-scaling may not respond quickly enough. Mitigation: maintain a minimum of 2 tasks and set conservative scaling thresholds.
- **Lambda 15-minute timeout**: Long podcast episodes (60-90 minutes) may require transcription jobs that exceed Lambda's 15-minute maximum execution time. Mitigation: chunk audio files into 10-minute segments before transcription, or use Step Functions to orchestrate multi-step transcription workflows.
- **NAT Gateway cost**: A single NAT Gateway costs ~$32/month plus data transfer charges. This is a fixed cost that may seem disproportionate for a small application but is unavoidable for private subnet internet access.
- **Limited debugging**: Fargate tasks are ephemeral — you cannot SSH into them. Debugging requires CloudWatch logs, X-Ray tracing, and ECS Exec (interactive shell, but adds latency). This increases mean time to diagnose production issues.

### Tradeoffs
We are choosing **operational simplicity** (no EC2 management, no Kubernetes) over the **fine-grained control** that ECS on EC2 or EKS would provide. Fargate costs approximately 20-30% more per vCPU-hour than equivalent EC2 instances, but the operational overhead savings (no patching, no capacity planning, no instance draining) more than compensate at our team size. If compute costs become a significant portion of our budget (unlikely — Claude API will dominate), we can migrate to ECS on EC2 with Spot Instances for 50-70% cost reduction. The migration path is straightforward: update the ECS capacity provider from Fargate to EC2 Auto Scaling Group.
