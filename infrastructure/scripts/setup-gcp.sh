#!/bin/bash
# TaleKeeper GCP Setup Script
# This script sets up the initial GCP project for TaleKeeper

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-talekeeper-prod}"
REGION="${REGION:-us-central1}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaleKeeper GCP Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth print-identity-token &> /dev/null; then
    echo -e "${YELLOW}Please log in to Google Cloud...${NC}"
    gcloud auth login
fi

# Check if project exists, create if not
echo -e "${YELLOW}Checking project ${PROJECT_ID}...${NC}"
if ! gcloud projects describe "${PROJECT_ID}" &> /dev/null; then
    echo -e "${YELLOW}Creating project ${PROJECT_ID}...${NC}"
    gcloud projects create "${PROJECT_ID}" --name="TaleKeeper"

    # Link billing account if provided
    if [ -n "${BILLING_ACCOUNT}" ]; then
        echo -e "${YELLOW}Linking billing account...${NC}"
        gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}"
    else
        echo -e "${YELLOW}WARNING: No billing account linked. Some services may not work.${NC}"
        echo "Run: gcloud billing projects link ${PROJECT_ID} --billing-account=YOUR_ACCOUNT"
    fi
else
    echo -e "${GREEN}Project ${PROJECT_ID} already exists${NC}"
fi

# Set project as default
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
APIS=(
    "run.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "secretmanager.googleapis.com"
    "storage.googleapis.com"
    "firebase.googleapis.com"
    "firebasehosting.googleapis.com"
    "iam.googleapis.com"
    "containerregistry.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "  Enabling ${api}..."
    gcloud services enable "${api}" --quiet || true
done

# Create service account for Cloud Run
SA_NAME="talekeeper-cloudrun"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${YELLOW}Creating service account ${SA_NAME}...${NC}"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" &> /dev/null; then
    gcloud iam service-accounts create "${SA_NAME}" \
        --display-name="TaleKeeper Cloud Run Service Account" \
        --description="Service account for PocketBase on Cloud Run"
else
    echo -e "${GREEN}Service account already exists${NC}"
fi

# Create Artifact Registry repository
REPO_NAME="talekeeper"
echo -e "${YELLOW}Creating Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" &> /dev/null; then
    gcloud artifacts repositories create "${REPO_NAME}" \
        --repository-format=docker \
        --location="${REGION}" \
        --description="Docker repository for TaleKeeper"
else
    echo -e "${GREEN}Artifact Registry repository already exists${NC}"
fi

# Create Cloud Storage bucket
BUCKET_NAME="${PROJECT_ID}-pocketbase-data"
echo -e "${YELLOW}Creating Cloud Storage bucket ${BUCKET_NAME}...${NC}"
if ! gsutil ls "gs://${BUCKET_NAME}" &> /dev/null; then
    gsutil mb -l "${REGION}" "gs://${BUCKET_NAME}"
    gsutil versioning set on "gs://${BUCKET_NAME}"
else
    echo -e "${GREEN}Storage bucket already exists${NC}"
fi

# Grant storage access to service account
echo -e "${YELLOW}Granting storage access to service account...${NC}"
gsutil iam ch "serviceAccount:${SA_EMAIL}:objectAdmin" "gs://${BUCKET_NAME}"

# Create encryption key secret
echo -e "${YELLOW}Creating encryption key secret...${NC}"
if ! gcloud secrets describe "pocketbase-encryption-key" &> /dev/null; then
    # Generate a random encryption key
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo -n "${ENCRYPTION_KEY}" | gcloud secrets create "pocketbase-encryption-key" \
        --data-file=- \
        --replication-policy="automatic"
    echo -e "${GREEN}Encryption key secret created${NC}"
else
    echo -e "${GREEN}Encryption key secret already exists${NC}"
fi

# Grant secret access to service account
gcloud secrets add-iam-policy-binding "pocketbase-encryption-key" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet

# Initialize Firebase
echo -e "${YELLOW}Initializing Firebase...${NC}"
if command -v firebase &> /dev/null; then
    firebase projects:addfirebase "${PROJECT_ID}" --non-interactive || true
else
    echo -e "${YELLOW}Firebase CLI not installed. Install with: npm install -g firebase-tools${NC}"
fi

# Configure Docker authentication
echo -e "${YELLOW}Configuring Docker authentication for Artifact Registry...${NC}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Print summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Account: ${SA_EMAIL}"
echo "Storage Bucket: ${BUCKET_NAME}"
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run: ./infrastructure/scripts/export-pocketbase.sh"
echo "2. Run: ./infrastructure/scripts/deploy-cloud-run.sh"
echo "3. Update DNS records in Cloudflare"
echo ""
echo -e "${GREEN}Estimated monthly cost: \$0 (within free tier)${NC}"
