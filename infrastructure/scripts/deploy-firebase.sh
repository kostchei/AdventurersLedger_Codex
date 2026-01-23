#!/bin/bash
# TaleKeeper Firebase Hosting Deployment Script
# Builds and deploys frontend to Firebase Hosting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${PROJECT_ID:-talekeeper-prod}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
FIREBASE_DIR="${PROJECT_ROOT}/infrastructure/firebase"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaleKeeper Firebase Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}Please log in to Firebase...${NC}"
    firebase login
fi

# Update .firebaserc with correct project
echo -e "${YELLOW}Configuring Firebase project...${NC}"
cat > "${FIREBASE_DIR}/.firebaserc" << EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
EOF

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd "${FRONTEND_DIR}"

# Ensure production environment
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Creating production environment file...${NC}"
    echo "VITE_PB_URL=https://api.talekeeper.org" > .env.production
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
fi

# Build
npm run build

# Copy build output to Firebase directory
echo -e "${YELLOW}Preparing Firebase deployment...${NC}"
rm -rf "${FIREBASE_DIR}/dist"
cp -r "${FRONTEND_DIR}/dist" "${FIREBASE_DIR}/"

# Deploy to Firebase
echo -e "${YELLOW}Deploying to Firebase Hosting...${NC}"
cd "${FIREBASE_DIR}"
firebase deploy --only hosting

# Get hosting URL
HOSTING_URL="https://${PROJECT_ID}.web.app"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Hosting URL: ${HOSTING_URL}"
echo ""
echo -e "${YELLOW}Custom Domain Setup:${NC}"
echo "1. In Firebase Console, go to Hosting > Add custom domain"
echo "2. Add: talekeeper.org"
echo "3. Add: www.talekeeper.org"
echo ""
echo -e "${YELLOW}Cloudflare DNS Configuration:${NC}"
echo ""
echo "For talekeeper.org:"
echo "  Type: A"
echo "  Name: @"
echo "  Target: 199.36.158.100"
echo "  Proxy: ON"
echo ""
echo "For www.talekeeper.org:"
echo "  Type: CNAME"
echo "  Name: www"
echo "  Target: talekeeper.org"
echo "  Proxy: ON"
echo ""
echo "Firebase TXT verification record:"
echo "  Type: TXT"
echo "  Name: @"
echo "  Value: (provided by Firebase during domain setup)"
echo ""
