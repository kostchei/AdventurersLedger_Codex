#!/bin/bash
# TaleKeeper PocketBase Export Script
# Exports local PocketBase data for migration to GCP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PB_DATA_DIR="${PROJECT_ROOT}/pocketbase/pb_data"
EXPORT_DIR="${PROJECT_ROOT}/infrastructure/exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_NAME="pocketbase_export_${TIMESTAMP}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaleKeeper PocketBase Export${NC}"
echo -e "${GREEN}========================================${NC}"

# Create export directory
mkdir -p "${EXPORT_DIR}"

# Check if PocketBase data exists
if [ ! -d "${PB_DATA_DIR}" ]; then
    echo -e "${YELLOW}No existing PocketBase data found at ${PB_DATA_DIR}${NC}"
    echo "This is fine for a fresh deployment."
    exit 0
fi

# Check if database exists
if [ ! -f "${PB_DATA_DIR}/data.db" ]; then
    echo -e "${YELLOW}No database file found. Starting fresh.${NC}"
    exit 0
fi

echo -e "${YELLOW}Found PocketBase data at ${PB_DATA_DIR}${NC}"

# Create backup directory
BACKUP_DIR="${EXPORT_DIR}/${EXPORT_NAME}"
mkdir -p "${BACKUP_DIR}"

# Export database files
echo -e "${YELLOW}Exporting database files...${NC}"

# Copy main database
cp "${PB_DATA_DIR}/data.db" "${BACKUP_DIR}/"
echo "  - data.db"

# Copy logs database if exists
if [ -f "${PB_DATA_DIR}/logs.db" ]; then
    cp "${PB_DATA_DIR}/logs.db" "${BACKUP_DIR}/"
    echo "  - logs.db"
fi

# Copy storage directory if exists (user uploads)
if [ -d "${PB_DATA_DIR}/storage" ]; then
    echo -e "${YELLOW}Exporting storage files...${NC}"
    cp -r "${PB_DATA_DIR}/storage" "${BACKUP_DIR}/"
    STORAGE_COUNT=$(find "${BACKUP_DIR}/storage" -type f | wc -l)
    echo "  - ${STORAGE_COUNT} storage files"
fi

# Create manifest
cat > "${BACKUP_DIR}/manifest.json" << EOF
{
    "export_date": "$(date -Iseconds)",
    "export_name": "${EXPORT_NAME}",
    "source": "local",
    "files": [
        "data.db",
        "logs.db",
        "storage/"
    ],
    "pocketbase_version": "0.26.6"
}
EOF

# Create compressed archive
echo -e "${YELLOW}Creating compressed archive...${NC}"
cd "${EXPORT_DIR}"
tar -czf "${EXPORT_NAME}.tar.gz" "${EXPORT_NAME}"
rm -rf "${BACKUP_DIR}"

ARCHIVE_SIZE=$(du -h "${EXPORT_NAME}.tar.gz" | cut -f1)
echo -e "${GREEN}Archive created: ${EXPORT_NAME}.tar.gz (${ARCHIVE_SIZE})${NC}"

# Show upload instructions
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Export Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Export file: ${EXPORT_DIR}/${EXPORT_NAME}.tar.gz"
echo ""
echo -e "${YELLOW}To upload to GCP:${NC}"
echo ""
echo "1. Set your project ID:"
echo "   export PROJECT_ID=talekeeper-prod"
echo ""
echo "2. Upload to Cloud Storage:"
echo "   gsutil cp ${EXPORT_DIR}/${EXPORT_NAME}.tar.gz gs://\${PROJECT_ID}-pocketbase-data/backups/"
echo ""
echo "3. Or use Litestream to restore directly:"
echo "   The deploy script will handle initial data setup."
echo ""
