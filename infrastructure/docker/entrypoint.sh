#!/bin/bash
set -e

# TaleKeeper PocketBase Entrypoint Script
# Handles Litestream restore and replication for Cloud Run

echo "=========================================="
echo "TaleKeeper PocketBase Starting..."
echo "=========================================="

# Configuration
PB_DATA_DIR="${PB_DATA_DIR:-/pb/pb_data}"
PB_PUBLIC_DIR="${PB_PUBLIC_DIR:-/pb/pb_public}"
PB_MIGRATIONS_DIR="${PB_MIGRATIONS_DIR:-/pb/pb_migrations}"
DB_PATH="${PB_DATA_DIR}/data.db"
LITESTREAM_CONFIG="/etc/litestream.yml"

# Check if Litestream replication is configured
if [ -n "${GCS_BUCKET}" ]; then
    echo "Litestream replication enabled (bucket: ${GCS_BUCKET})"

    # Check if database exists locally
    if [ -f "${DB_PATH}" ]; then
        echo "Local database exists, skipping restore"
    else
        echo "No local database found, attempting restore from GCS..."

        # Restore from Litestream replica
        if litestream restore -config "${LITESTREAM_CONFIG}" -if-replica-exists "${DB_PATH}"; then
            echo "Database restored successfully from GCS"
        else
            echo "No existing replica found, starting fresh database"
        fi
    fi

    # Also try to restore logs database
    LOGS_DB_PATH="${PB_DATA_DIR}/logs.db"
    if [ ! -f "${LOGS_DB_PATH}" ]; then
        echo "Attempting to restore logs database..."
        litestream restore -config "${LITESTREAM_CONFIG}" -if-replica-exists "${LOGS_DB_PATH}" || true
    fi

    echo "Starting PocketBase with Litestream replication..."

    # Run PocketBase with Litestream wrapping
    exec litestream replicate -config "${LITESTREAM_CONFIG}" -exec \
        "pocketbase serve \
            --http=0.0.0.0:8090 \
            --dir=${PB_DATA_DIR} \
            --publicDir=${PB_PUBLIC_DIR} \
            --migrationsDir=${PB_MIGRATIONS_DIR} \
            --automigrate"

else
    echo "WARNING: No GCS_BUCKET configured, running without replication"
    echo "Data will be lost when container stops!"

    # Run PocketBase directly without Litestream
    exec pocketbase serve \
        --http=0.0.0.0:8090 \
        --dir="${PB_DATA_DIR}" \
        --publicDir="${PB_PUBLIC_DIR}" \
        --migrationsDir="${PB_MIGRATIONS_DIR}" \
        --automigrate
fi
