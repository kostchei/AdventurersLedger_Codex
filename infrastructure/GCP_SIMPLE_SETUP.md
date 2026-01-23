# TaleKeeper GCP Setup - Simple Edition

Zero-cost cloud hosting for 5-20 users.

## Architecture

```
Cloudflare Pages ──► talekeeper.org (static frontend)
Cloudflare Tunnel ──► api.talekeeper.org ──► GCP VM:8090 (PocketBase)
```

**Total Cost: $10/year** (domain only)

## Setup Steps

### 1. Create GCP Free Tier VM

```bash
# Create f1-micro VM (free forever in us-west1, us-central1, or us-east1)
gcloud compute instances create talekeeper-server \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --tags=http-server
```

### 2. SSH and Install PocketBase

```bash
# SSH into VM
gcloud compute ssh talekeeper-server --zone=us-central1-a

# Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.25.9/pocketbase_0.25.9_linux_amd64.zip
unzip pocketbase_0.25.9_linux_amd64.zip
chmod +x pocketbase

# Create systemd service
sudo tee /etc/systemd/system/pocketbase.service << 'EOF'
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/$USER
ExecStart=/home/$USER/pocketbase serve --http=0.0.0.0:8090
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

### 3. Install Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create talekeeper

# Configure tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: api.talekeeper.org
    service: http://localhost:8090
  - service: http_status:404
EOF

# Run as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

### 4. Cloudflare DNS

In Cloudflare dashboard for `talekeeper.org`:

| Type | Name | Target |
|------|------|--------|
| CNAME | api | `<TUNNEL_ID>.cfargotunnel.com` |

### 5. Deploy Frontend to Cloudflare Pages

```bash
# In your repo, connect to Cloudflare Pages
# Build command: cd frontend && npm run build
# Output directory: frontend/dist
# Environment variable: VITE_PB_URL=https://api.talekeeper.org
```

Or use the existing Azure Static Web Apps - it works fine.

### 6. Import PocketBase Schema

```bash
# Copy schema to VM
gcloud compute scp pocketbase/pb_schema.json talekeeper-server:~/

# Import via admin UI at https://api.talekeeper.org/_/
# Or use the API
```

## Maintenance

**Backup (monthly):**
```bash
gcloud compute ssh talekeeper-server --zone=us-central1-a --command="tar -czf pb_backup_$(date +%Y%m%d).tar.gz pb_data"
gcloud compute scp talekeeper-server:~/pb_backup_*.tar.gz ./backups/
```

**Update PocketBase:**
```bash
gcloud compute ssh talekeeper-server --zone=us-central1-a
sudo systemctl stop pocketbase
wget https://github.com/pocketbase/pocketbase/releases/latest/...
sudo systemctl start pocketbase
```

## Free Tier Limits

| Resource | Limit | Your Usage |
|----------|-------|------------|
| e2-micro VM | 1 instance, 30GB disk | ✅ Plenty |
| Egress | 1GB/month to internet | ✅ Plenty for 20 users |
| Cloudflare Pages | Unlimited static hosting | ✅ Free |
| Cloudflare Tunnel | Unlimited | ✅ Free |

## That's It

No Docker. No Terraform. No Kubernetes. No CI/CD pipelines.

Just a VM running PocketBase behind a Cloudflare Tunnel.
