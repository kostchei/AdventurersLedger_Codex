# TaleKeeper GCP Infrastructure

This directory contains all infrastructure-as-code and deployment scripts for running TaleKeeper on Google Cloud Platform with zero cost (within free tier limits).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE ($10/year)                      │
│   DNS + SSL + CDN + DDoS Protection                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────────────┐
│   Firebase Hosting      │   │   Cloud Run (PocketBase)        │
│   (Frontend - FREE)     │   │   (Backend API - FREE)          │
│   talekeeper.org        │   │   api.talekeeper.org            │
└─────────────────────────┘   └─────────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │   Cloud Storage (FREE)          │
                              │   Litestream SQLite Replication │
                              └─────────────────────────────────┘
```

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Firebase Hosting | $0 |
| Cloud Run | $0 |
| Cloud Storage | $0 |
| Artifact Registry | $0 |
| Domain (annual) | $10/year |
| **Total** | **~$0.83/month** |

## Directory Structure

```
infrastructure/
├── README.md                    # This file
├── GCP_MIGRATION.md            # Detailed migration documentation
├── .env.example                # Environment variables template
│
├── terraform/                  # Infrastructure as Code
│   ├── main.tf                 # Main Terraform configuration
│   ├── variables.tf            # Variable definitions
│   ├── outputs.tf              # Output values
│   └── terraform.tfvars.example
│
├── docker/                     # Docker configurations
│   ├── Dockerfile.pocketbase   # PocketBase + Litestream image
│   ├── entrypoint.sh           # Container entrypoint script
│   ├── litestream.yml          # SQLite replication config
│   └── .dockerignore
│
├── firebase/                   # Firebase Hosting configuration
│   ├── firebase.json           # Hosting config + headers
│   └── .firebaserc             # Project configuration
│
├── scripts/                    # Deployment scripts
│   ├── setup-gcp.sh           # Initial GCP setup
│   ├── export-pocketbase.sh   # Export local data
│   ├── deploy-cloud-run.sh    # Deploy backend
│   └── deploy-firebase.sh     # Deploy frontend
│
└── cloudbuild.yaml            # GCP Cloud Build config
```

## Quick Start

### Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. [Terraform](https://www.terraform.io/downloads) (optional)
3. [Docker](https://docs.docker.com/get-docker/)
4. [Firebase CLI](https://firebase.google.com/docs/cli)
5. [Node.js 20+](https://nodejs.org/)

### Step 1: Initial GCP Setup

```bash
# Set your project ID
export PROJECT_ID=talekeeper-prod

# Run the setup script
chmod +x infrastructure/scripts/setup-gcp.sh
./infrastructure/scripts/setup-gcp.sh
```

This creates:
- GCP project with required APIs enabled
- Service account for Cloud Run
- Artifact Registry for Docker images
- Cloud Storage bucket for data
- Secret Manager entry for encryption key

### Step 2: Export Existing Data (Optional)

If you have existing PocketBase data:

```bash
chmod +x infrastructure/scripts/export-pocketbase.sh
./infrastructure/scripts/export-pocketbase.sh
```

### Step 3: Deploy Backend

```bash
chmod +x infrastructure/scripts/deploy-cloud-run.sh
./infrastructure/scripts/deploy-cloud-run.sh
```

### Step 4: Deploy Frontend

```bash
chmod +x infrastructure/scripts/deploy-firebase.sh
./infrastructure/scripts/deploy-firebase.sh
```

### Step 5: Configure DNS

In Cloudflare:

**API Domain (api.talekeeper.org):**
```
Type: CNAME
Name: api
Target: <cloud-run-url>.run.app
Proxy: ON
```

**Frontend Domain (talekeeper.org):**
```
Type: A
Name: @
Target: 199.36.158.100
Proxy: ON
```

## Using Terraform (Alternative)

For automated infrastructure management:

```bash
cd infrastructure/terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and apply
terraform init
terraform plan
terraform apply
```

## CI/CD with GitHub Actions

### Required Secrets

Add these to your GitHub repository secrets:

1. **GCP_PROJECT_ID**: Your GCP project ID
2. **GCP_SA_KEY**: Service account JSON key

Create the service account key:
```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=talekeeper-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com

# Copy contents of key.json to GitHub Secrets as GCP_SA_KEY
```

### Workflow Triggers

The `gcp-deploy.yml` workflow:
- Runs on push to `main` branch
- Creates preview deployments for PRs
- Can be manually triggered with options

## Data Persistence

### How Litestream Works

1. PocketBase writes to local SQLite database
2. Litestream continuously replicates changes to Cloud Storage
3. On container restart, Litestream restores from Cloud Storage
4. Sub-second data loss window (RPO)

### Backup Schedule

- **Continuous**: Real-time replication to GCS
- **Snapshots**: Hourly full snapshots
- **Retention**: 30 days of history

### Manual Backup

```bash
# Download current database
gsutil cp gs://${PROJECT_ID}-pocketbase-data/litestream/data.db ./backup.db
```

### Restore from Backup

```bash
# Upload backup to restore
gsutil cp ./backup.db gs://${PROJECT_ID}-pocketbase-data/restore/data.db

# The next container startup will use this file
```

## Monitoring

### Cloud Run Metrics

View in GCP Console:
- Request count
- Latency
- Error rate
- Instance count

### Logs

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100

# Stream logs
gcloud beta run services logs tail talekeeper-api --region=us-central1
```

### Alerts (Optional)

Set up billing alerts to catch any unexpected charges:
```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="TaleKeeper Budget" \
  --budget-amount=5.00USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## Troubleshooting

### Container won't start

Check logs:
```bash
gcloud run services logs read talekeeper-api --region=us-central1 --limit=50
```

### Database not persisting

Verify GCS bucket:
```bash
gsutil ls -r gs://${PROJECT_ID}-pocketbase-data/litestream/
```

### Cold start too slow

Enable minimum instances (costs money):
```bash
gcloud run services update talekeeper-api \
  --region=us-central1 \
  --min-instances=1
```

### CORS issues

Check Cloud Run URL in frontend env:
```bash
# Should match your VITE_PB_URL
gcloud run services describe talekeeper-api \
  --region=us-central1 \
  --format='value(status.url)'
```

## Free Tier Limits

Stay within these to avoid charges:

| Resource | Free Limit | Notes |
|----------|------------|-------|
| Cloud Run requests | 2M/month | ~66K/day |
| Cloud Run compute | 360K GB-sec | ~100 hours |
| Cloud Storage | 5GB | US regions only |
| Firebase Hosting | 10GB storage | 360MB/day bandwidth |
| Artifact Registry | 500MB | Keep old images pruned |

## Migration from Azure

1. Keep Azure running during migration
2. Deploy to GCP following steps above
3. Test thoroughly on GCP URLs
4. Update DNS to point to GCP
5. Wait for DNS propagation (24-48 hours)
6. Decommission Azure resources

## Security Considerations

- All traffic encrypted with HTTPS
- PocketBase handles authentication
- Service account has minimal permissions
- Secrets stored in Secret Manager
- Cloudflare provides DDoS protection

## Support

For issues:
1. Check [GCP_MIGRATION.md](./GCP_MIGRATION.md) for detailed docs
2. Review Cloud Run logs
3. Open an issue on GitHub
