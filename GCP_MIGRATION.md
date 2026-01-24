# GCP PocketBase Migration (Zero-Cost)

This guide migrates the current **local PocketBase + Cloudflare Tunnel** setup to a **fully cloud-hosted backend** on GCP using the **Always Free** tier. It keeps the frontend on Azure Static Web Apps and keeps costs at **$0/month** (excluding the Cloudflare domain fee).

## Target Architecture (Zero-Cost)

```
┌─────────────────────────┐
│  Azure Static Web App   │ ← Frontend (talekeeper.org)
│    (React/Vite Build)   │
└────────────┬────────────┘
             │ HTTPS
             ↓
┌─────────────────────────┐
│  Cloudflare Tunnel      │ ← api.talekeeper.org
└────────────┬────────────┘
             │ Encrypted Tunnel
             ↓
┌─────────────────────────┐
│  GCP Compute Engine VM  │ ← Always Free e2-micro
│  PocketBase (cloud)     │
└─────────────────────────┘
```

## Free-Tier Guardrails

Stay within GCP Always Free to avoid charges:

- **Compute Engine**: 1x `e2-micro` in `us-central1`, `us-east1`, or `us-west1`
- **Disk**: 30 GB `pd-standard` boot disk
- **Network**: keep egress minimal (Cloudflare tunnel reduces public traffic)
- **Storage (optional)**: 5 GB Cloud Storage in US regions

> Tip: Add a **budget alert** set to `$0` to catch accidental costs.

## Prerequisites

- GCP account with billing enabled (required even for free tier)
- Cloudflare account with `talekeeper.org`
- Existing PocketBase data on local machine

## Phase 1: Provision the GCP VM (Always Free)

1. **Create a GCP project** (e.g., `talekeeper-prod`).
2. **Enable Compute Engine API**.
3. **Create VM**:
   - **Region**: `us-central1`
   - **Zone**: `us-central1-a` (any in-region zone)
   - **Series**: `E2`
   - **Machine type**: `e2-micro`
   - **Boot disk**: Debian 12, 30 GB `pd-standard`
   - **Networking**: default VPC, external IP allowed (ephemeral)
4. **SSH into VM**.

## Phase 2: Install PocketBase on GCP

```bash
sudo apt-get update
sudo apt-get install -y unzip

# Create app directory
sudo mkdir -p /opt/pocketbase
sudo chown $USER:$USER /opt/pocketbase
cd /opt/pocketbase

# Download PocketBase (replace version as needed)
curl -L -o pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.22.18/pocketbase_0.22.18_linux_amd64.zip
unzip pocketbase.zip
chmod +x pocketbase
```

### Create a systemd service

```bash
sudo tee /etc/systemd/system/pocketbase.service > /dev/null <<'SERVICE'
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

# Replace %i with your username
target_user="$USER"
sudo sed -i "s/%i/${target_user}/" /etc/systemd/system/pocketbase.service

sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
```

PocketBase should now listen on `127.0.0.1:8090` (tunnel-only, no public exposure).

## Phase 3: Install Cloudflare Tunnel on GCP

```bash
# Install cloudflared
curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate (opens browser link)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create talekeeper-api

# Route DNS to tunnel
cloudflared tunnel route dns talekeeper-api api.talekeeper.org
```

### Configure cloudflared

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml > /dev/null <<'CLOUDFLARE'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.talekeeper.org
    service: http://127.0.0.1:8090
  - service: http_status:404
CLOUDFLARE
```

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Phase 4: Migrate PocketBase Data

1. **Create backup on local machine** (from the existing local PocketBase):
   ```bash
   ./pocketbase backup
   ```
   This creates a `.zip` in the `pb_data/backups` directory.

2. **Copy backup to the VM**:
   ```bash
   scp pb_data/backups/<backup-file>.zip <vm-user>@<vm-external-ip>:/opt/pocketbase/
   ```

3. **Restore on VM**:
   ```bash
   cd /opt/pocketbase
   ./pocketbase restore <backup-file>.zip
   sudo systemctl restart pocketbase
   ```

4. **Verify API**:
   ```bash
   curl https://api.talekeeper.org/api/health
   ```

## Phase 5: Optional Cloud Storage Backups (Free Tier)

If you want off-VM backups without cost:

1. Create a **US-region** bucket (5 GB free tier).
2. Add a cron job to upload backups weekly.

```bash
# Example (run weekly)
./pocketbase backup
latest_backup=$(ls -t pb_data/backups | head -n 1)
gsutil cp "pb_data/backups/${latest_backup}" gs://<bucket-name>/
```

> Keep only a small number of backups to stay under the 5 GB free tier.

## Phase 6: Update OAuth Redirects (if needed)

If OAuth uses API domain, ensure these are set:

- **Authorized redirect URI**: `https://api.talekeeper.org/api/oauth2-redirect`
- **Authorized JS origin**: `https://talekeeper.org`

## Rollback Plan

1. Stop Cloudflare tunnel on GCP.
2. Restart local PocketBase and local tunnel (`start-talekeeper.bat`).
3. Update DNS route (Cloudflare) back to local tunnel if needed.

## Validation Checklist

- `https://api.talekeeper.org/api/health` responds
- Admin UI accessible: `https://api.talekeeper.org/_/`
- Frontend connects and authenticates
- Database records present after migration

## Cost Summary (Expected)

- **GCP Compute Engine (e2-micro)**: $0 (Always Free)
- **Disk (30 GB pd-standard)**: $0 (Always Free)
- **Cloudflare Tunnel**: $0
- **Domain**: ~$10/year

**Total monthly cost: $0 (excluding domain renewal).**
