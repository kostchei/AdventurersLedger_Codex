#!/bin/bash
# TaleKeeper Cloud Run Deployment Script
# Builds and deploys PocketBase to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-talekeeper-prod}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="talekeeper-api"
REPO_NAME="talekeeper"
IMAGE_NAME="pocketbase"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/infrastructure/docker"
MIGRATIONS_DIR="${PROJECT_ROOT}/pocketbase/pb_migrations"

# Full image path
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaleKeeper Cloud Run Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if gcloud is configured
if ! gcloud config get-value project &> /dev/null; then
    echo -e "${RED}Error: gcloud is not configured${NC}"
    echo "Run: gcloud config set project ${PROJECT_ID}"
    exit 1
fi

# Set project
gcloud config set project "${PROJECT_ID}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Configure Docker for Artifact Registry
echo -e "${YELLOW}Configuring Docker authentication...${NC}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Copy migrations to Docker context
echo -e "${YELLOW}Copying migrations to Docker context...${NC}"
mkdir -p "${DOCKER_DIR}/pb_migrations"
if [ -d "${MIGRATIONS_DIR}" ]; then
    cp -r "${MIGRATIONS_DIR}"/* "${DOCKER_DIR}/pb_migrations/" 2>/dev/null || true
fi

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
cd "${DOCKER_DIR}"

docker build \
    --platform linux/amd64 \
    -t "${IMAGE_PATH}:latest" \
    -t "${IMAGE_PATH}:$(date +%Y%m%d-%H%M%S)" \
    -f Dockerfile.pocketbase \
    .

# Push to Artifact Registry
echo -e "${YELLOW}Pushing to Artifact Registry...${NC}"
docker push "${IMAGE_PATH}:latest"

# Clean up migrations copy
rm -rf "${DOCKER_DIR}/pb_migrations"

# Get storage bucket name
BUCKET_NAME="${PROJECT_ID}-pocketbase-data"

# Check if there's existing data to restore
echo -e "${YELLOW}Checking for existing data in Cloud Storage...${NC}"
if gsutil ls "gs://${BUCKET_NAME}/litestream/" &> /dev/null; then
    echo -e "${GREEN}Found existing Litestream data - will restore on startup${NC}"
else
    echo -e "${YELLOW}No existing data found - starting fresh database${NC}"
fi

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"

gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_PATH}:latest" \
    --platform=managed \
    --region="${REGION}" \
    --allow-unauthenticated \
    --service-account="talekeeper-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com" \
    --port=8090 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=2 \
    --timeout=300s \
    --cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="GCS_BUCKET=${BUCKET_NAME},LITESTREAM_REPLICA_URL=gcs://${BUCKET_NAME}/litestream"

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(status.url)')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service URL: ${SERVICE_URL}"
echo "Admin Panel: ${SERVICE_URL}/_/"
echo ""
echo -e "${YELLOW}Health Check:${NC}"
curl -s "${SERVICE_URL}/api/health" | head -c 200 || echo "Service starting up..."
echo ""
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Visit ${SERVICE_URL}/_/ to set up admin account"
echo "2. Configure custom domain in Cloud Run console"
echo "3. Update Cloudflare DNS to point api.talekeeper.org to Cloud Run"
echo ""
echo -e "${YELLOW}Cloudflare DNS Configuration:${NC}"
echo "  Type: CNAME"
echo "  Name: api"
echo "  Target: ${SERVICE_URL#https://}"
echo "  Proxy: ON (orange cloud)"
echo ""
