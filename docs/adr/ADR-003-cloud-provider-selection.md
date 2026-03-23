# ADR-003: Cloud Provider Selection

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI platform requires a cloud provider that can support managed databases, container orchestration, object storage, CDN delivery, background job processing, and monitoring — all while remaining cost-effective for a bootstrapped product targeting approximately 5,000 paying subscribers in Year 1 (scaling to 20,000+ by Year 3).

We evaluated three primary cloud providers:

1. **AWS (Amazon Web Services)** — Broadest service ecosystem, dominant market share, strong Anthropic partnership.
2. **Google Cloud Platform (GCP)** — Strong AI/ML services, competitive pricing, Kubernetes-native.
3. **Vercel/Railway/Render** — Platform-as-a-Service options that abstract infrastructure management.

Key considerations include: managed PostgreSQL with pgvector support, container orchestration without Kubernetes complexity, CDN for media content delivery, S3-compatible object storage for podcast audio and video assets, WebSocket support for real-time features, and team familiarity with the platform. The founding engineer has 4+ years of AWS experience.

**Decision:**

We will use **AWS** as the primary cloud provider with the following service selections:

| Workload | AWS Service | Configuration |
|----------|-------------|---------------|
| Container orchestration | **ECS Fargate** | 2-4 tasks, 1 vCPU / 2 GB RAM each |
| Primary database | **RDS PostgreSQL 16** | db.t4g.medium, Multi-AZ in production |
| Cache / sessions | **ElastiCache Redis 7** | cache.t4g.micro, single-node for V1 |
| Object storage | **S3** | Standard tier for media, Intelligent-Tiering for archives |
| CDN | **CloudFront** | Distribution for S3 media assets and API caching |
| DNS | **Route 53** | Hosted zone for coachkeith.ai domain |
| Secrets management | **Secrets Manager** | API keys, database credentials, JWT secrets |
| Background jobs | **Lambda** | Content pipeline batch processing |
| Container registry | **ECR** | Docker image storage for ECS deployments |
| Monitoring | **CloudWatch** | Logs, metrics, alarms, dashboards |
| CI/CD | **GitHub Actions** | Build, test, deploy pipelines (not AWS-native) |

Infrastructure will be provisioned using **AWS CDK v2** (TypeScript) for infrastructure-as-code, keeping the IaC language consistent with the application codebase.

Estimated monthly infrastructure cost at 5,000 subscribers: **$350-500/month** (excluding Claude API costs).

**Consequences:**

### Pros (+)
- **Broadest service ecosystem**: AWS offers managed services for every component we need, reducing operational burden. RDS handles database backups, patching, and failover. ECS Fargate eliminates EC2 instance management. ElastiCache manages Redis clustering and persistence.
- **Anthropic partnership**: AWS has a deep partnership with Anthropic (Amazon's $4B+ investment). Claude is available natively via Amazon Bedrock, providing a potential fallback or cost optimization path if direct API pricing becomes prohibitive.
- **Team familiarity**: The founding engineer has extensive AWS experience, eliminating the learning curve and reducing the risk of misconfiguration in production.
- **Mature compliance tooling**: AWS provides HIPAA-eligible services, SOC 2 compliance artifacts, and comprehensive IAM policies — important for an app handling sensitive personal coaching data.
- **Global edge network**: CloudFront's 400+ edge locations ensure low-latency media delivery (podcast clips, video content) regardless of user location.

### Cons (-)
- **Complex pricing model**: AWS billing is notoriously complex. Data transfer costs, cross-AZ traffic, NAT Gateway fees, and per-request charges on services like Secrets Manager can lead to bill surprises. We will implement AWS Budgets alerts at $400, $600, and $1,000 thresholds.
- **Vendor lock-in**: Using AWS-specific services (ECS, RDS, ElastiCache, Lambda) creates switching costs. Migrating to GCP or Azure would require significant re-architecture of deployment, IaC, and service integrations.
- **Over-engineering risk**: AWS's breadth can tempt teams into over-architecting. We will resist the urge to adopt services like Step Functions, AppSync, or Cognito unless there is a clear, justified need.

### Tradeoffs
We are choosing **ecosystem breadth and operational maturity** over the pricing simplicity of PaaS alternatives (Vercel, Railway) or GCP's potentially lower compute costs. The PaaS options were rejected because they lack managed PostgreSQL with pgvector support, have limited WebSocket support, and impose scaling ceilings that we may hit within Year 1. GCP was a viable alternative but offered no compelling advantage over AWS given team familiarity. The vendor lock-in risk is mitigated by using Prisma ORM (database-agnostic), Docker containers (portable), and standard Redis protocol (compatible with any Redis provider). A cloud migration, while non-trivial, remains feasible if AWS costs become uncompetitive at scale.
