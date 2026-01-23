# GCP Migration Architecture - Zero Cost

## Overview

This document outlines the migration of TaleKeeper from a hybrid local/Azure setup to a fully cloud-based GCP infrastructure while staying within the free tier.

## Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Azure Static   │────▶│ Cloudflare       │────▶│ Local Machine   │
│  Web Apps       │     │ Tunnel           │     │ (PocketBase)    │
│  (Frontend)     │     │ api.talekeeper   │     │ Port 8090       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Issues with Current Setup:**
- Requires local machine to be running 24/7
- Single point of failure (your PC)
- No horizontal scaling
- Manual startup/shutdown

## New GCP Architecture (Zero Cost)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE ($10/year)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ DNS (Free)  │  │ SSL (Free)  │  │ CDN/Cache (Free)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────────┐
│   Firebase Hosting        │   │   Cloud Run (PocketBase)          │
│   (Frontend - Free)       │   │   (Backend API - Free Tier)       │
│                           │   │                                   │
│   • talekeeper.org        │   │   • api.talekeeper.org            │
│   • 10GB storage          │   │   • 2M requests/month             │
│   • 360MB/day transfer    │   │   • 360K GB-seconds compute       │
│   • Global CDN            │   │   • Auto-scaling (0 to N)         │
└───────────────────────────┘   └───────────────────────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────────┐
                                │   Cloud Storage (Free Tier)       │
                                │   (PocketBase Data Persistence)   │
                                │                                   │
                                │   • 5GB storage                   │
                                │   • SQLite DB files               │
                                │   • User uploads                  │
                                └───────────────────────────────────┘
```

## GCP Free Tier Limits (Always Free)

| Service | Free Tier Limit | Our Usage |
|---------|-----------------|-----------|
| **Cloud Run** | 2M requests/month, 360K GB-sec | Backend API |
| **Cloud Storage** | 5GB (US regions) | PocketBase data |
| **Firebase Hosting** | 10GB storage, 360MB/day | Frontend SPA |
| **Cloud Build** | 120 build-minutes/day | CI/CD |
| **Artifact Registry** | 500MB storage | Docker images |
| **Secret Manager** | 6 active versions | API keys |

## Architecture Components

### 1. Frontend (Firebase Hosting)
**Replaces:** Azure Static Web Apps

**Benefits:**
- Global CDN with edge caching
- Automatic SSL certificates
- SPA routing support
- GitHub Actions integration
- Preview channels for PRs

**Cost:** FREE (within 10GB storage, 360MB/day bandwidth)

### 2. Backend API (Cloud Run + PocketBase)
**Replaces:** Local PocketBase + Cloudflare Tunnel

**Configuration:**
- Container: Custom PocketBase image
- CPU: 1 vCPU (scales to 0 when idle)
- Memory: 512MB
- Concurrency: 80 requests/instance
- Min instances: 0 (cost optimization)
- Max instances: 2 (free tier safety)

**Cost:** FREE (within 2M requests, 360K GB-seconds)

### 3. Data Persistence (Cloud Storage + Litestream)
**Replaces:** Local SQLite files

**Strategy:**
- Use [Litestream](https://litestream.io/) for SQLite replication
- Continuous backup to Cloud Storage
- Restore on container startup
- Near-real-time durability

**Cost:** FREE (within 5GB storage)

### 4. Domain & CDN (Cloudflare)
**Cost:** $10/year for domain registration

**Services Used (Free):**
- DNS management
- SSL/TLS certificates
- DDoS protection
- Caching
- Analytics

## Migration Steps

### Phase 1: Prepare GCP Project
1. Create GCP project
2. Enable required APIs
3. Set up service accounts
4. Configure secrets

### Phase 2: Deploy PocketBase to Cloud Run
1. Build custom Docker image with Litestream
2. Export existing PocketBase data
3. Upload to Cloud Storage
4. Deploy Cloud Run service
5. Verify API functionality

### Phase 3: Deploy Frontend to Firebase
1. Configure Firebase project
2. Update environment variables
3. Deploy frontend build
4. Configure custom domain

### Phase 4: Update DNS
1. Point api.talekeeper.org to Cloud Run
2. Point talekeeper.org to Firebase Hosting
3. Remove Cloudflare Tunnel (no longer needed)

### Phase 5: Decommission Old Infrastructure
1. Stop local PocketBase
2. Remove Azure Static Web App
3. Archive local data backup

## Cost Breakdown

| Component | Monthly Cost |
|-----------|-------------|
| Firebase Hosting | $0 |
| Cloud Run | $0 |
| Cloud Storage | $0 |
| Cloud Build | $0 |
| Secret Manager | $0 |
| Cloudflare DNS/CDN | $0 |
| **Domain (annual)** | **$10/year** |
| **TOTAL** | **~$0.83/month** |

## Scaling Considerations

### Free Tier Limits
- **2M Cloud Run requests/month** = ~66K/day = ~2.7K/hour
- **360K GB-seconds** = ~100 hours of 1GB container
- **5GB Cloud Storage** = sufficient for SQLite + uploads

### When You'd Exceed Free Tier
- 100+ concurrent users constantly
- Heavy real-time sync operations
- Large file uploads (maps/images)

### Upgrade Path
If you exceed free tier:
1. Cloud Run: ~$0.00002400/request beyond free
2. Cloud Storage: ~$0.020/GB/month beyond free
3. Estimated cost at 10x traffic: ~$5-10/month

## Security Considerations

1. **Authentication**: Continue using PocketBase OAuth2 with Google
2. **HTTPS**: Enforced via Cloud Run + Cloudflare
3. **CORS**: Configured for talekeeper.org domain only
4. **Secrets**: Stored in GCP Secret Manager
5. **IAM**: Least-privilege service accounts

## Backup Strategy

1. **Continuous**: Litestream replicates SQLite to Cloud Storage
2. **Daily**: Cloud Storage object versioning
3. **Retention**: 30-day object lifecycle
4. **Recovery**: < 1 minute restore time

## Monitoring (Free)

- Cloud Run metrics (built-in)
- Firebase Analytics
- Cloudflare Analytics
- PocketBase admin dashboard

## Files Created

```
infrastructure/
├── GCP_MIGRATION.md          # This document
├── terraform/
│   ├── main.tf               # Main Terraform config
│   ├── variables.tf          # Variable definitions
│   ├── outputs.tf            # Output values
│   └── terraform.tfvars.example
├── docker/
│   ├── Dockerfile.pocketbase # PocketBase + Litestream
│   └── litestream.yml        # Litestream config
├── firebase/
│   ├── firebase.json         # Firebase config
│   └── .firebaserc           # Project aliases
├── scripts/
│   ├── export-pocketbase.sh  # Export local data
│   ├── deploy-cloud-run.sh   # Deploy backend
│   └── setup-gcp.sh          # Initial GCP setup
└── .github/
    └── workflows/
        └── gcp-deploy.yml    # CI/CD pipeline
```

## Quick Start

```bash
# 1. Set up GCP project
./infrastructure/scripts/setup-gcp.sh

# 2. Export existing PocketBase data
./infrastructure/scripts/export-pocketbase.sh

# 3. Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform apply

# 4. Deploy backend
./infrastructure/scripts/deploy-cloud-run.sh

# 5. Deploy frontend
cd frontend
npm run build
firebase deploy
```

## Environment Variables

### Cloud Run (PocketBase)
```
PB_ENCRYPTION_KEY=<from-secret-manager>
GCS_BUCKET=talekeeper-data
LITESTREAM_REPLICA_URL=gcs://talekeeper-data/pb_data
```

### Frontend (Firebase)
```
VITE_PB_URL=https://api.talekeeper.org
```

## Rollback Plan

If migration fails:
1. Re-enable local PocketBase
2. Re-activate Cloudflare Tunnel
3. Update DNS to point back to tunnel
4. Frontend continues working (same API URL)

## FAQ

**Q: What happens when Cloud Run scales to zero?**
A: First request takes 2-5 seconds (cold start). Litestream restores SQLite from Cloud Storage.

**Q: Is my data safe with this setup?**
A: Yes. Litestream provides continuous replication to Cloud Storage with sub-second RPO.

**Q: Can I still access PocketBase admin?**
A: Yes, at https://api.talekeeper.org/_/

**Q: What if I exceed free tier?**
A: You'll get billing alerts. Estimated overage: $0.01-0.10 per 1000 extra requests.
